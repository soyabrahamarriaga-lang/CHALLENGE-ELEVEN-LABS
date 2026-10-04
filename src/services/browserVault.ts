import type { FlowResponse, ProcessCatalog, ProcessCollection, ProcessFlow, ProcessImage, ProcessMetadata } from '../domain/processFlow';
import { sha256 } from '@noble/hashes/sha2.js';
import { bytesToHex } from '@noble/hashes/utils.js';
import type { AgentMessage } from './agentProtocol';
import { buildProcessFlow, flowToCanvas, flowMarkdown, flowEvidenceMarkdown, flowClock } from '../../server/processFlowCore.mjs';
import { PROCESS_CATALOG } from '../../server/processCatalog.mjs';
import { buildKnowledgeGraph } from '../../server/processKnowledge.mjs';

export interface VaultDirectory extends FileSystemDirectoryHandle {
  queryPermission(options: { mode: 'readwrite' }): Promise<PermissionState>;
}
const ID = /^[A-Za-z0-9_-]{1,80}$/;
const SESSION = /^\d{4}-\d{2}-\d{2}-([A-Za-z0-9_-]{1,80})$/;
const missing = (e: unknown) => e instanceof DOMException && e.name === 'NotFoundError';
const safePart = (part: string) => part !== '.' && part !== '..' && /^[^/\\\u0000-\u001f]{1,180}$/.test(part);
const unavailable = () => new Error('Conecta de nuevo tu bóveda y autoriza el acceso a la carpeta.');
const invalid = () => new Error('Este archivo no tiene un formato de proceso compatible con UserHelper.');
const text = (v: unknown): v is string => typeof v === 'string';
const strings = (v: unknown): v is string[] => Array.isArray(v) && v.every(text);
const object = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object';
const finite = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v) && v >= 0;
const validImage = (v: unknown) => object(v) && text(v.id) && text(v.file) && text(v.mime) && finite(v.at);

// Only UserHelper's process format is read. Arbitrary notes are never uploaded or executed.
export function validFlow(value: unknown): value is ProcessFlow {
  if (!object(value) || value.version !== 2 || !text(value.id) || !ID.test(value.id) ||
    !['title', 'name', 'department', 'taskType', 'source', 'sourceDigest', 'generatedAt'].every(k => text(value[k])) ||
    !strings(value.warnings) || !Array.isArray(value.nodes) || value.nodes.length > 200 ||
    !Array.isArray(value.edges) || !Array.isArray(value.evidence) || !Array.isArray(value.captures)) return false;
  return value.nodes.every(n => object(n) && text(n.id) && text(n.title) &&
    ['start', 'end', 'step', 'decision'].includes(String(n.kind)) && finite(n.at) &&
    strings(n.evidenceIds) && strings(n.instructions) && strings(n.guardrails) &&
    text(n.reason) && text(n.decision) && Array.isArray(n.images) && n.images.every(validImage) &&
    (n.alternatives === undefined || (Array.isArray(n.alternatives) && n.alternatives.every(a => object(a) && text(a.condition) && text(a.action)))) &&
    object(n.position) && Number.isFinite(n.position.x) && Number.isFinite(n.position.y)) &&
    value.edges.every(e => object(e) && text(e.id) && text(e.source) && text(e.target) && text(e.label)) &&
    value.evidence.every(e => object(e) && text(e.id) && text(e.text) && text(e.file) && (e.at === null || finite(e.at))) &&
    value.captures.every(validImage);
}

export class BrowserVault {
  readonly connectionId = crypto.randomUUID();
  private queue: Promise<unknown> = Promise.resolve();
  private folders = new Map<string, string>();
  constructor(readonly root: VaultDirectory, private active: () => boolean) {}
  async check() {
    if (!this.active()) throw unavailable();
    const permission = await this.root.queryPermission({ mode: 'readwrite' });
    if (!this.active() || permission !== 'granted') throw unavailable();
  }
  async directory(parts: string[], create = false): Promise<FileSystemDirectoryHandle> {
    await this.check();
    if (!parts.every(safePart)) throw invalid();
    let dir: FileSystemDirectoryHandle = this.root;
    for (const part of parts) dir = await dir.getDirectoryHandle(part, { create });
    await this.check();
    return dir;
  }
  async read(parts: string[], limit = 4 * 1024 * 1024): Promise<File | null> {
    if (!parts.length || !parts.every(safePart)) throw invalid();
    try {
      const dir = await this.directory(parts.slice(0, -1));
      const file = await (await dir.getFileHandle(parts.at(-1)!)).getFile();
      await this.check();
      if (file.size > limit) throw new Error('El archivo es demasiado grande para abrirlo en el navegador.');
      return file;
    } catch (e) { if (missing(e)) return null; throw e; }
  }
  async readJson(parts: string[]): Promise<unknown> {
    const file = await this.read(parts);
    return file ? JSON.parse(await file.text()) : null;
  }
  async write(parts: string[], data: string | Blob) {
    if (!parts.length || !parts.every(safePart)) throw invalid();
    if ((typeof data === 'string' ? new Blob([data]).size : data.size) > 4 * 1024 * 1024)
      throw new Error('La sesión supera el límite de guardado local.');
    const dir = await this.directory(parts.slice(0, -1), true);
    await this.check();
    const writer = await (await dir.getFileHandle(parts.at(-1)!, { create: true })).createWritable();
    try { await writer.write(data); await this.check(); await writer.close(); }
    catch (e) { await writer.abort().catch(() => {}); throw e; }
  }
  serial<T>(work: () => Promise<T>): Promise<T> {
    const next = this.queue.catch(() => {}).then(async () => { await this.check(); return work(); });
    this.queue = next;
    return next;
  }
  async scan() {
    this.folders.clear();
    let dir: FileSystemDirectoryHandle;
    try { dir = await this.directory(['Sesiones']); } catch (e) { if (missing(e)) return; throw e; }
    let count = 0;
    for await (const entry of dir.values()) {
      if (++count > 2000) throw new Error('Esta bóveda tiene demasiadas sesiones para abrirla en el navegador.');
      const match = entry.name.match(SESSION);
      if (entry.kind !== 'directory' || !match) continue;
      if (this.folders.has(match[1])) throw new Error('Hay sesiones duplicadas en la bóveda. Revisa sus identificadores.');
      this.folders.set(match[1], entry.name);
    }
  }
  async folder(id: string) {
    if (!ID.test(id)) throw invalid();
    if (!this.folders.has(id)) await this.scan();
    const folder = this.folders.get(id);
    if (!folder || await this.read(['Retirados', id + '.json'])) throw new Error('Este proceso ya no está disponible o aún no tiene una transcripción.');
    return folder;
  }
  async catalog(): Promise<ProcessCatalog> {
    const value = await this.readJson(['catalogo-procesos.json']);
    if (value === null) return PROCESS_CATALOG;
    if (!object(value) || !finite(value.version) || !text(value.defaultDepartment) || !strings(value.departments) || !Array.isArray(value.families) ||
      !value.families.every(f => object(f) && text(f.id) && text(f.name) && Array.isArray(f.activities) && f.activities.every(a => strings(a) && a.length === 2))) throw invalid();
    return value as unknown as ProcessCatalog;
  }
  async flow(id: string, catalog?: ProcessCatalog): Promise<FlowResponse> {
    const folder = await this.folder(id);
    const data = await this.readJson(['Sesiones', folder, 'process-flow.json']);
    if (!validFlow(data) || data.id !== id) throw invalid();
    const metadata = await this.readJson(['Sesiones', folder, 'process-metadata.json']);
    const overrides = object(metadata) && text(metadata.name) && text(metadata.department) && text(metadata.taskType)
      ? { name: metadata.name, title: metadata.name, department: metadata.department, taskType: metadata.taskType, classificationStatus: 'edited' as const } : {};
    const flow = { ...data, ...overrides, folder, catalog: catalog || await this.catalog(), canvasEdited: !!data.canvasEdited, catalogEdited: !!data.catalogEdited, catalogPath: data.catalogPath || '' };
    const canvas = await this.readJson(['Sesiones', folder, 'flujo.canvas']);
    return { flow, canvas: object(canvas) ? canvas : flowToCanvas(flow), obsidianUri: `obsidian://open?vault=${encodeURIComponent(this.root.name)}&file=${encodeURIComponent('Sesiones/' + folder + '/flujo.canvas')}` };
  }
  async list(): Promise<ProcessCollection> {
    await this.scan();
    const catalog = await this.catalog();
    const flows: ProcessFlow[] = [], failures: ProcessCollection['failures'] = [];
    for (const id of this.folders.keys()) {
      if (await this.read(['Retirados', id + '.json'])) continue;
      const folder = this.folders.get(id)!;
      // A live transcript is not yet a completed process.
      if (!await this.read(['Sesiones', folder, 'process-flow.json'])) continue;
      try { flows.push((await this.flow(id, catalog)).flow); }
      catch (e) { failures.push({ id, error: e instanceof Error ? e.message : 'invalid_process' }); }
    }
    return {
      processes: flows.map(f => ({ id: f.id, folder: f.folder, title: f.title, department: f.department, taskType: f.taskType, catalogPath: f.catalogPath, source: f.source, imageCount: f.captures.length, startedAt: f.folder.slice(0, 10), duration: Math.max(0, ...f.evidence.map(e => e.at || 0)), steps: f.nodes.filter(n => n.kind === 'step' || n.kind === 'decision').length, decisions: f.nodes.filter(n => n.kind === 'decision').length, status: 'draft' as const, canvasEdited: f.canvasEdited, evidenceCount: f.evidence.length })).sort((a, b) => b.startedAt.localeCompare(a.startedAt)),
      failures, catalog, graph: buildKnowledgeGraph(flows, catalog),
    };
  }
  async metadata(id: string, value: ProcessMetadata) {
    if (![value.name, value.department, value.taskType].every(v => text(v) && v.trim() && v.length <= 120)) throw invalid();
    return this.serial(async () => {
      const folder = await this.folder(id);
      const previous = await this.readJson(['Sesiones', folder, 'process-metadata.json']);
      await this.write(['Sesiones', folder, 'process-metadata.json'], JSON.stringify({ ...(object(previous) ? previous : {}), ...value }, null, 2));
      return this.flow(id);
    });
  }
  async image(id: string, imageId: string): Promise<Blob> {
    const { flow } = await this.flow(id);
    const image = flow.captures.find(c => c.id === imageId);
    if (!image || !/^capturas\/[A-Za-z0-9_-]+\.(jpg|jpeg|png|webp)$/.test(image.file)) throw invalid();
    const file = await this.read(['Sesiones', flow.folder, ...image.file.split('/')], 3 * 1024 * 1024);
    if (!file) throw new Error('Imagen no disponible');
    return file;
  }
  async remove(id: string) {
    if (!ID.test(id)) throw invalid();
    return this.serial(async () => {
      if (!await this.read(['Retirados', id + '.json'])) {
        await this.folder(id);
        await this.write(['Retirados', id + '.json'], JSON.stringify({ id, removedAt: new Date().toISOString(), source: 'browser' }));
      }
      return { id, deleted: true as const, tutor: 'disabled' as const, indexes: 'updated' as const, local: true };
    });
  }
  record(id: string, startedAt: number) {
    if (!ID.test(id) || !finite(startedAt)) throw invalid();
    return new BrowserRecording(this, id, startedAt);
  }
}

export class BrowserRecording {
  readonly folder: string;
  private messages = new Map<string, AgentMessage>();
  private events: string[] = [];
  private captures: ProcessImage[] = [];
  private initialized = false;
  constructor(private vault: BrowserVault, readonly id: string, private startedAt: number) {
    this.folder = new Date(startedAt).toISOString().slice(0, 10) + '-' + id;
  }
  private async init() {
    if (this.initialized) return;
    // Never overwrite a pre-existing record when reconnecting to the same provider session.
    if (await this.vault.read(['Sesiones', this.folder, 'transcripcion.md']))
      throw new Error('La bóveda ya contiene esta sesión. No sobrescribimos la transcripción existente.');
    this.initialized = true;
  }
  upsert(messages: AgentMessage[]) {
    for (const message of messages) {
      if (!message.id.startsWith('typed-') && message.role === 'user') {
        const pending = [...this.messages.values()].find(m => m.id.startsWith('typed-') && m.text === message.text);
        if (pending) this.messages.delete(pending.id);
      }
      this.messages.set(message.id, message);
    }
  }
  event(kind: string, text: string, at = 0) {
    if (!finite(at) || this.events.length >= 5000) return;
    this.events.push(`- \`${flowClock(at)}\` **${kind}** — ${text.replace(/\s+/g, ' ').slice(0, 8000)}`);
  }
  async capture(blob: Blob, at: number): Promise<boolean> {
    if (!finite(at) || at > 86400 || blob.size > 3 * 1024 * 1024 || !['image/jpeg', 'image/png', 'image/webp'].includes(blob.type)) return false;
    return this.vault.serial(async () => {
      await this.init();
      const digest = bytesToHex(sha256(new Uint8Array(await blob.arrayBuffer()))).slice(0, 24);
      const id = `frame-${Math.round(at * 1000)}-${digest}`, ext = blob.type === 'image/jpeg' ? 'jpg' : blob.type.split('/')[1];
      if (this.captures.some(c => c.id === id)) return true;
      if (this.captures.length >= 200) return false;
      const file = `capturas/${id}.${ext}`;
      await this.vault.write(['Sesiones', this.folder, ...file.split('/')], blob);
      this.captures.push({ id, at, file, mime: blob.type, source: 'browser-screen' });
      await this.vault.write(['Sesiones', this.folder, 'capturas.json'], JSON.stringify(this.captures));
      return true;
    });
  }
  async save(finished = false) {
    return this.vault.serial(async () => {
      await this.init();
      const transcript = `---\ntipo: sesion\nconversacion: ${JSON.stringify(this.id)}\ninicio: ${JSON.stringify(new Date(this.startedAt).toISOString())}\nfuente: navegador\nestado: ${finished ? 'finalizada' : 'en-curso'}\n---\n\n# Conversación\n\nCopia recibida en este navegador. Puede estar incompleta si se cerró la pestaña o se perdió la conexión.\n\n## Conversación\n\n` +
        [...this.messages.values()].sort((a, b) => a.at - b.at).map(m => `**[${flowClock(Math.max(0, (m.at - this.startedAt) / 1000))}] ${m.role === 'user' ? 'Persona' : 'Agente'}:** ${m.text.replace(/\s+/g, ' ')}`).join('\n\n') + '\n';
      await this.vault.write(['Sesiones', this.folder, 'transcripcion.md'], transcript);
      const events = this.events.join('\n') + '\n';
      await this.vault.write(['Sesiones', this.folder, 'eventos.md'], events);
      if (finished) {
        const flow = buildProcessFlow({ id: this.id, folder: this.folder, transcript, events, captures: this.captures });
        await this.vault.write(['Sesiones', this.folder, 'flujo.canvas'], JSON.stringify(flowToCanvas(flow), null, 2));
        await this.vault.write(['Sesiones', this.folder, 'evidencia-flujo.md'], flowEvidenceMarkdown(flow));
        await this.vault.write(['Sesiones', this.folder, 'mapa-generado.md'], flowMarkdown(flow));
        // Publish the manifest last so an incomplete save is not listed as a process.
        await this.vault.write(['Sesiones', this.folder, 'process-flow.json'], JSON.stringify(flow, null, 2));
      }
      return { status: 'saved' as const, file: `Sesiones/${this.folder}/transcripcion.md`, ...(finished ? { flowStatus: 'ready' as const } : {}) };
    });
  }
}
