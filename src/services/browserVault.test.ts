import { afterEach, describe, expect, it, vi } from 'vitest';
import { mkdtemp, mkdir, readFile, readdir, stat, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { basename, join } from 'node:path';
import { BrowserVault, type VaultDirectory } from './browserVault';
import { buildProcessFlow } from '../../server/processFlowCore.mjs';
import type { AgentMessage } from './agentProtocol';

// Real disk I/O behind the browser handle contract; only the permission grant is simulated.
const roots: string[] = [];
afterEach(async () => { vi.unstubAllGlobals(); for (const root of roots.splice(0)) await rm(root, { recursive: true, force: true }); });
function notFound(e: unknown): never {
  if ((e as NodeJS.ErrnoException).code === 'ENOENT') throw new DOMException('missing', 'NotFoundError');
  throw e;
}
async function fixture() {
  vi.stubGlobal('fetch', vi.fn(() => { throw new Error('Local vault must never send files to the network'); }));
  const root = await mkdtemp(join(tmpdir(), 'userhelper-browser-vault-')); roots.push(root);
  const access = { active: true, permission: 'granted' as PermissionState };
  const file = (path: string) => ({
    kind: 'file', name: basename(path),
    getFile: async () => new File([await readFile(path).catch(notFound)], basename(path)),
    createWritable: async () => {
      let output: string | Blob = '';
      return { write: async (data: string | Blob) => { output = data; }, close: async () => { await writeFile(path, typeof output === 'string' ? output : new Uint8Array(await output.arrayBuffer())); }, abort: async () => {} };
    },
  });
  const directory = (path: string): VaultDirectory => ({
    kind: 'directory', name: basename(path), queryPermission: async () => access.permission,
    getDirectoryHandle: async (name: string, options?: { create?: boolean }) => {
      const next = join(path, name);
      if (options?.create) await mkdir(next, { recursive: true });
      await stat(next).catch(notFound); return directory(next);
    },
    getFileHandle: async (name: string, options?: { create?: boolean }) => {
      const next = join(path, name);
      if (options?.create) await writeFile(next, '', { flag: 'wx' }).catch(e => { if (e.code !== 'EEXIST') throw e; });
      await stat(next).catch(notFound); return file(next);
    },
    values: async function* () { for (const entry of await readdir(path, { withFileTypes: true })) yield entry.isDirectory() ? directory(join(path, entry.name)) : file(join(path, entry.name)); },
  } as unknown as VaultDirectory);
  const vault = new BrowserVault(directory(root), () => access.active);
  return { root, vault, access };
}
const started = Date.parse('2026-10-04T12:00:00Z');
const message = (id: string, text = 'Abro la factura y reviso el importe.'): AgentMessage => ({ id, role: 'user', text, at: started + 1000 });

describe('browser-connected local vault', () => {
  it('writes a real transcript and process files, then reads them into the same library', async () => {
    const { root, vault } = await fixture();
    await writeFile(join(root, 'Nota personal.md'), 'Do not read or modify this note');
    const recording = vault.record('conv_local', started);
    recording.upsert([message('u1')]); recording.event('screen', 'Factura abierta', 1);
    await recording.save();
    expect((await vault.list()).processes).toEqual([]);
    await recording.save(true);
    const collection = await vault.list();
    expect(collection.processes.map(p => p.id)).toEqual(['conv_local']);
    expect(collection.failures).toEqual([]);
    const { flow, obsidianUri } = await vault.flow('conv_local');
    expect(flow.evidence.some(e => e.text === message('u1').text && e.role === 'expert')).toBe(true);
    expect(obsidianUri).toContain('obsidian://open?vault=');
    expect(await readFile(join(root, 'Nota personal.md'), 'utf8')).toBe('Do not read or modify this note');
    expect(await readFile(join(root, 'Sesiones', recording.folder, 'flujo.canvas'), 'utf8')).toContain('nodes');
  });
  it('keeps earlier turns beyond the 200-message UI window and merges typed confirmations', async () => {
    const { root, vault } = await fixture(); const recording = vault.record('conv_long', started);
    const messages = Array.from({ length: 260 }, (_, i) => ({ ...message('m'+i, 'Turn '+i), at: started + i*1000 }));
    recording.upsert([message('typed-pending', 'Confirmed text')]);
    recording.upsert([message('confirmed', 'Confirmed text')]);
    for (let i=0; i<messages.length; i++) recording.upsert(messages.slice(Math.max(0, i-199), i+1));
    await recording.save(true);
    const saved = await readFile(join(root, 'Sesiones', recording.folder, 'transcripcion.md'), 'utf8');
    expect(saved.match(/\*\*\[/g)).toHaveLength(261);
    expect(saved.match(/Confirmed text/g)).toHaveLength(1);
    expect(saved).toContain('Turn 0'); expect(saved).toContain('Turn 259');
  });
  it('reads existing server-format flows, preserves manual Canvas and metadata fields, and retires without deleting originals', async () => {
    const { root, vault } = await fixture();
    const folder = '2026-10-04-conv_existing', path = join(root, 'Sesiones', folder);
    await mkdir(path, { recursive: true });
    const transcript = '# Demo\n\n## Conversación\n\n**[00:01] Persona:** Abro la factura y reviso el importe.\n';
    await writeFile(join(path, 'transcripcion.md'), transcript);
    await writeFile(join(path, 'process-flow.json'), JSON.stringify(buildProcessFlow({ id: 'conv_existing', folder, transcript })));
    await writeFile(join(path, 'flujo.canvas'), '{"manual":true}');
    await writeFile(join(path, 'process-metadata.json'), '{"stepImages":{"s1":"capture1"}}');
    expect((await vault.list()).processes).toHaveLength(1);
    const result = await vault.metadata('conv_existing', { name: 'Proceso editado', department: 'Soporte', taskType: 'Revisión' });
    expect(result.flow.title).toBe('Proceso editado'); expect(result.canvas).toEqual({ manual: true });
    expect(JSON.parse(await readFile(join(path, 'process-metadata.json'), 'utf8')).stepImages).toEqual({ s1: 'capture1' });
    await vault.remove('conv_existing'); await vault.remove('conv_existing');
    expect((await vault.list()).processes).toEqual([]);
    expect(await readFile(join(path, 'transcripcion.md'), 'utf8')).toBe(transcript);
    expect(await readFile(join(path, 'flujo.canvas'), 'utf8')).toBe('{"manual":true}');
    expect(JSON.parse(await readFile(join(root, 'Retirados', 'conv_existing.json'), 'utf8')).id).toBe('conv_existing');
  });
  it('preserves an existing transcript when another recording has the same ID', async () => {
    const { root, vault } = await fixture(); const first = vault.record('conv_repeat', started);
    first.upsert([message('original')]); await first.save(true);
    const path = join(root, 'Sesiones', first.folder, 'transcripcion.md'), before = await readFile(path, 'utf8');
    const second = vault.record('conv_repeat', started); second.upsert([message('replacement', 'Overwrite attempt')]);
    await expect(second.save(true)).rejects.toThrow('No sobrescribimos');
    expect(await readFile(path, 'utf8')).toBe(before);
  });
  it('stores shared captures, rejects oversized images and rejects paths outside the selected session', async () => {
    const { vault } = await fixture(); const recording = vault.record('conv_images', started);
    const picture = new Blob([new Uint8Array([137,80,78,71])], { type: 'image/png' });
    expect(await recording.capture(picture, 1)).toBe(true);
    expect(await recording.capture(new Blob([new Uint8Array(3*1024*1024+1)], { type: 'image/png' }), 2)).toBe(false);
    recording.upsert([message('u1')]); await recording.save(true);
    const { flow } = await vault.flow('conv_images');
    expect(new Uint8Array(await (await vault.image('conv_images', flow.captures[0].id)).arrayBuffer())).toEqual(new Uint8Array(await picture.arrayBuffer()));
    flow.captures[0].file = '../../Nota personal.md';
    await vault.write(['Sesiones', recording.folder, 'process-flow.json'], JSON.stringify(flow));
    await expect(vault.image('conv_images', flow.captures[0].id)).rejects.toThrow('formato');
    await expect(vault.write(['..', 'escape.md'], 'bad')).rejects.toThrow('formato');
    await expect(vault.remove('../../outside')).rejects.toThrow('formato');
  });
  it('stops reads and queued writes on disconnect or permission loss', async () => {
    const { vault, root, access } = await fixture();
    await vault.write(['keep.md'], 'unchanged');
    access.permission = 'denied';
    await expect(vault.write(['keep.md'], 'changed')).rejects.toThrow('Conecta');
    await expect(vault.list()).rejects.toThrow('Conecta');
    access.permission = 'granted';
    let release!: () => void;
    const gate = new Promise<void>(resolve => { release = resolve; });
    const held = vault.serial(() => gate); await Promise.resolve();
    const pending = vault.serial(() => vault.write(['keep.md'], 'changed'));
    access.active = false; release();
    await held.catch(() => {});
    await expect(pending).rejects.toThrow('Conecta');
    expect(await readFile(join(root, 'keep.md'), 'utf8')).toBe('unchanged');
  });
  it('honors the local catalogue and reports malformed processes without hiding healthy ones', async () => {
    const { vault } = await fixture();
    const catalogue = { version: 1, defaultDepartment: 'Soporte', departments: ['Soporte'], families: [{ id: 'soporte', name: 'Soporte técnico', activities: [['S1', 'Revisar acceso']] }] };
    await vault.write(['catalogo-procesos.json'], JSON.stringify(catalogue));
    const recording = vault.record('conv_healthy', started); recording.upsert([message('u1')]); await recording.save(true);
    await vault.write(['Sesiones', '2026-10-04-conv_broken', 'process-flow.json'], '{"version":2,"nodes":null}');
    const result = await vault.list();
    expect(result.catalog).toEqual(catalogue);
    expect(result.processes.map(p => p.id)).toEqual(['conv_healthy']);
    expect(result.failures.map(f => f.id)).toEqual(['conv_broken']);
    expect((await vault.flow('conv_healthy')).flow.catalog).toEqual(catalogue);
    expect(fetch).not.toHaveBeenCalled();
  });
});
