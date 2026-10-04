import { afterEach, describe, expect, it, vi } from 'vitest';
import { createServer } from 'node:http';
import { mkdtemp, readFile, rm, symlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createVault, createVaultHandler, readVaultConfig, syncAgentConversations } from './vault.mjs';
import { compileKnowledge } from './tutorKnowledge.mjs';

const cleanup = [];
afterEach(async () => { for (const task of cleanup.splice(0).reverse()) await task(); });
const ORIGIN = 'http://127.0.0.1:5173';
const conversation = (id) => ({ conversation_id: id, status: 'done', agent_id: 'agent_test',
  metadata: { start_time_unix_secs: 1759532400 },
  transcript: [{ role: 'user', message: 'Abro la factura y reviso el folio.', time_in_call_secs: 5 }] });
async function setup(options = {}) {
  const root = await mkdtemp(join(tmpdir(), 'process-removal-'));
  cleanup.push(() => rm(root, { recursive: true, force: true }));
  const config = readVaultConfig({ VAULT_PATH: root, APP_ORIGIN: ORIGIN, ELEVENLABS_API_KEY: 'test-key', ELEVENLABS_AGENT_ID: 'agent_test', ELEVENLABS_TUTOR_AGENT_ID: 'agent_tutor' });
  const vault = createVault(config);
  const server = createServer(createVaultHandler(config, { log: { info() {}, warn() {}, error() {} }, syncTutor: async () => ({ status: 'updated' }), ...options }));
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  cleanup.push(() => new Promise((resolve) => { server.closeAllConnections(); server.close(resolve); }));
  const post = (path, body = {}, headers = {}) => fetch(`http://127.0.0.1:${server.address().port}/api/vault/${path}`, {
    method: 'POST', headers: { Origin: ORIGIN, 'Content-Type': 'application/json', ...headers }, body: typeof body === 'string' ? body : JSON.stringify(body),
  });
  return { root, vault, config, post };
}
describe('process removal from the platform', () => {
  it('removes collection, graph and generated indexes, preserving original evidence and other IDs', async () => {
    const { root, vault, config } = await setup();
    const saved = await vault.saveConversation(conversation('one'));
    await vault.saveConversation(conversation('conv_one'));
    await vault.saveProcessMetadata('one', { name: 'Proceso retirado', department: 'Compras', taskType: 'Facturas' });
    await vault.saveProcessMetadata('conv_one', { name: 'Proceso vigente', department: 'Compras', taskType: 'Facturas' });
    const source = join(root, saved.file);
    const original = await readFile(source, 'utf8');
    expect((await compileKnowledge(root)).processes).toContain('Proceso retirado');
    expect(await vault.removeProcess('one')).toMatchObject({ deleted: true, indexes: 'updated' });
    const restarted = createVault(config);
    const collection = await restarted.ensureProcessMaps();
    expect(collection.processes.map((p) => p.id)).toEqual(['conv_one']);
    expect(collection.graph.memberships.some((m) => m.processId === 'one')).toBe(false);
    expect(await restarted.getProcessFlow('one')).toBeNull();
    expect(await restarted.getCapture('one', 'frame-any')).toBeNull();
    expect(await readFile(source, 'utf8')).toBe(original);
    expect(await readFile(join(root, 'Procesos', 'Indice-generado.md'), 'utf8')).not.toContain('Proceso retirado');
    expect(await readFile(join(root, 'Procesos', 'Relaciones-generadas.md'), 'utf8')).not.toContain('Proceso retirado');
    expect((await compileKnowledge(root)).processes).toEqual(['Proceso vigente']);
    expect((await restarted.removeProcess('one')).deleted).toBe(true);
  });
  it('prevents polling, late webhooks and writes from resurrecting a removed process', async () => {
    const { vault, config, post } = await setup();
    await vault.saveConversation(conversation('conv_one'));
    await vault.removeProcess('conv_one');
    const fetcher = vi.fn(async () => Response.json({ conversations: [{ conversation_id: 'conv_one', status: 'done' }] }));
    expect(await syncAgentConversations(config, vault, { fetch: fetcher })).toEqual({ imported: [], skipped: 1, pending: 0 });
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(await vault.saveConversation(conversation('conv_one'))).toEqual({ ignored: 'deleted', id: 'conv_one' });
    for (const [path, body] of [
      ['conversations/conv_one/import', {}], ['sessions/conv_one/events', { kind: 'note', text: 'late' }],
      ['sessions/conv_one/notes/work-map', { markdown: 'late' }],
      ['sessions/conv_one/metadata', { name: 'late', department: 'x', taskType: 'x' }],
    ]) expect((await post(path, body)).status).toBe(410);
    expect((await post('sessions/conv_one/flow')).status).toBe(404);
    expect((await vault.listSessions())).toEqual([]);
  });
  it('requires the exact origin, confirmation, JSON and a valid existing ID', async () => {
    const { post, vault } = await setup();
    await vault.saveConversation(conversation('conv_one'));
    const path = 'processes/conv_one/delete';
    expect((await post(path, { confirm: true }, { Origin: 'https://foreign.test' })).status).toBe(403);
    expect((await post(path, { confirm: true }, { 'Sec-Fetch-Site': 'cross-site' })).status).toBe(403);
    expect((await post(path, { confirm: true }, { 'Content-Type': 'text/plain' })).status).toBe(415);
    expect((await post(path, '{')).status).toBe(400);
    expect((await post(path)).status).toBe(400);
    expect((await post('processes/bad%2Fid/delete', { confirm: true })).status).toBe(400);
    expect((await post('processes/missing/delete', { confirm: true })).status).toBe(404);
    expect((await vault.ensureProcessMaps()).processes).toHaveLength(1);
  });
  it('acknowledges local deletion and allows retry when the tutor service is unavailable', async () => {
    const syncTutor = vi.fn().mockRejectedValueOnce(new Error('offline')).mockResolvedValue({ status: 'updated' });
    const { post, vault, root } = await setup({ syncTutor });
    await vault.saveConversation(conversation('conv_one'));
    const first = await post('processes/conv_one/delete', { confirm: true });
    expect(first.status).toBe(200);
    expect(await first.json()).toMatchObject({ deleted: true, tutor: 'pending' });
    expect((await vault.ensureProcessMaps()).processes).toEqual([]);
    const retry = await post('processes/conv_one/delete', { confirm: true });
    expect(await retry.json()).toMatchObject({ deleted: true, tutor: 'updated' });
    expect(syncTutor).toHaveBeenLastCalledWith({ apiKey: 'test-key', tutorAgentId: 'agent_tutor', vaultPath: root });
  });
  it('serializes in-flight maps/imports and deletion across vault instances', async () => {
    const { vault, config, root } = await setup();
    await vault.saveConversation(conversation('conv_one'));
    const other = createVault(config);
    await Promise.all([vault.ensureProcessMaps(), other.removeProcess('conv_one'), vault.saveConversation(conversation('conv_one')), other.ensureProcessMaps()]);
    expect((await vault.ensureProcessMaps()).processes).toEqual([]);
    expect(await readFile(join(root, 'Procesos', 'Indice-generado.md'), 'utf8')).not.toContain('conv_one');
  });
  it('keeps removal durable if rebuilding a derived index fails', async () => {
    const { vault, root } = await setup();
    await vault.saveConversation(conversation('conv_one'));
    await rm(join(root, 'Procesos'), { recursive: true });
    await symlink(tmpdir(), join(root, 'Procesos'));
    expect(await vault.removeProcess('conv_one')).toMatchObject({ deleted: true, indexes: 'pending' });
    expect(await vault.getProcessFlow('conv_one')).toBeNull();
  });
  it('refuses a symlinked removal directory without changing a process', async () => {
    const { vault, root } = await setup();
    await vault.saveConversation(conversation('conv_one'));
    await rm(join(root, 'Retirados'), { recursive: true });
    await symlink(tmpdir(), join(root, 'Retirados'));
    await expect(vault.removeProcess('conv_one')).rejects.toThrow('invalid-private-path');
  });
});
