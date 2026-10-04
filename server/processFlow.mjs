import { createHash, randomUUID } from 'node:crypto';
import { readFile, writeFile, rename, lstat, realpath, unlink } from 'node:fs/promises';
import { join, sep } from 'node:path';

const hash = (text) => createHash('sha256').update(text).digest('hex');
const clean = (text) => String(text || '').replace(/[\u0000-\u0008\u000b-\u001f\u007f]/g, '').trim();
const preview = (text, length = 100) => text.length > length ? text.slice(0, length - 1) + '…' : text;
const seconds = (value) => value.split(':').reduce((total, part) => total * 60 + Number(part), 0);
export const flowClock = (at) => `${String(Math.floor(at / 60)).padStart(2, '0')}:${String(Math.floor(at % 60)).padStart(2, '0')}`;
const labels = { start: 'Inicio', end: 'Fin del registro', step: 'Paso narrado', decision: 'Decisión por revisar', guardrail: 'Regla por revisar', screen: 'Pantalla', question: 'Pregunta' };

export function parseFlowEvidence(transcript, events = '') {
  const evidence = [];
  const counts = new Map();
  const sourceId = (prefix, text) => {
    const base = `${prefix}-${hash(text).slice(0, 16)}`;
    const count = (counts.get(base) || 0) + 1;
    counts.set(base, count);
    return count === 1 ? base : `${base}-${count}`;
  };
  const body = transcript.includes('## Conversación') ? transcript.split('## Conversación')[1].split('## Enlaces')[0] : '';
  const turns = /\*\*\[(\d{2,}:\d{2})\] (Persona|Agente):\*\* ([\s\S]*?)(?=\n\*\*\[|\n## |$)/g;
  for (const match of body.matchAll(turns)) {
    const text = clean(match[3].replace(/^> \[.*$/gm, ''));
    if (text) evidence.push({ id: sourceId("turn", match[1] + match[2] + text), source: 'transcript', role: match[2] === 'Persona' ? 'expert' : 'agent', at: seconds(match[1]), text, file: 'transcripcion.md' });
  }
  for (const match of events.matchAll(/^- `(\d{2,}:\d{2}(?::\d{2})?)` \*\*(screen|question|answer|guardrail|decision|note)\*\* — (.*)$/gm)) {
    // Legacy events without a relative time have HH:MM:SS wall clocks; do not pretend they align.
    const timed = match[1].split(':').length === 2;
    evidence.push({ id: sourceId("event", match[0]), source: 'events', role: 'observation', kind: match[2], at: timed ? seconds(match[1]) : null, text: clean(match[3].replace(/ \^[A-Za-z0-9-]+$/, '')), file: 'eventos.md' });
  }
  return evidence.sort((a, b) => (a.at ?? Number.MAX_SAFE_INTEGER) - (b.at ?? Number.MAX_SAFE_INTEGER));
}

function classify(item) {
  if (item.kind === 'screen') return 'screen';
  if (item.kind === 'guardrail') return 'guardrail';
  if (item.kind === 'decision') return 'decision';
  if (item.role === 'agent' || item.kind === 'question') return 'question';
  if (/\b(no se (?:debe|puede)|nunca|obligatorio|máximo|mínimo|detener|consultar|sin .{1,70} no|hay que|debe[n]? )/i.test(item.text)) return 'guardrail';
  if (/\b(decid[ío]|elijo|elegimos|rechaz[oa]|aproba[rm]|apruebo|en cambio|si )/i.test(item.text)) return 'decision';
  return 'step';
}

// Deliberately strict: draw alternate routes only when both are spoken explicitly.
function explicitBranch(text) {
  const m = text.match(/^si\s+([^\n,;]{3,180}),\s*([^\n;]{3,240}?)[;.]+\s*(?:si no|de lo contrario|en caso contrario)[,:]?\s+([^\n]{3,240})[.!]?$/i);
  return m ? { condition: clean(m[1]), yes: clean(m[2]), no: clean(m[3]) } : null;
}

export function buildProcessFlow({ id, folder, transcript, events = '' }) {
  const evidence = parseFlowEvidence(transcript, events);
  const sourceDigest = hash(transcript + '\n---EVENTS---\n' + events);
  const summary = clean(transcript.match(/## Resumen\n+([\s\S]*?)(?=\n## |$)/)?.[1] || '');
  const expert = evidence.filter(e => e.role === 'expert');
  const warnings = ['Borrador automático: el orden del registro no demuestra causalidad ni valida el criterio del experto.'];
  if (!expert.length) warnings.push('No hay palabras del experto en esta transcripción. Este registro no permite reconstruir un proceso completo.');
  if (!evidence.some(e => e.kind === 'screen')) warnings.push('Sin observaciones de pantalla: falta vincular los pasos con evidencia visual.');
  if (evidence.some(e => e.at === null)) warnings.push('Hay eventos sin tiempo relativo; se conservan en la evidencia, fuera de la secuencia.');
  const nodes = [{ id: 'start', kind: 'start', title: 'Inicio del registro', at: 0, evidenceIds: [], reason: '', position: { x: 320, y: 0 } }];
  const edges = [];
  let tails = ['start'];
  let row = 1;
  const addEdges = (target) => { for (const source of tails) edges.push({ id: `edge-${edges.length + 1}`, source, target, label: tails.length > 1 ? 'Continuación por confirmar' : 'Después en el registro', kind: 'sequence' }); };
  // Keep each expert turn and explicit event. Questions remain attributable to the agent.
  // Dense OCR is attached as evidence to the next narrated step, not mistaken for extra actions.
  const selected = evidence.filter(e => e.at !== null && (e.role === 'expert' || (e.role === 'agent' && /[?¿]/.test(e.text)) || ['decision', 'guardrail'].includes(e.kind)));
  let screenBucket = -1;
  for (const e of evidence.filter(e => e.kind === 'screen' && e.at !== null)) {
    if (selected.some(other => other.role === 'expert' && Math.abs(other.at - e.at) <= 20)) continue;
    const bucket = Math.floor(e.at / 15);
    if (bucket !== screenBucket) { selected.push(e); screenBucket = bucket; }
  }
  selected.sort((a, b) => a.at - b.at || evidence.indexOf(a) - evidence.indexOf(b));
  if (selected.length > 180) warnings.push('La vista agrupa hasta 180 momentos. Toda la evidencia permanece disponible en sus notas de origen.');
  for (const item of selected.slice(0, 180)) {
    const nearby = evidence.filter(e => e.kind === 'screen' && e.at !== null && Math.abs(e.at - item.at) <= 20).map(e => e.id);
    const refs = [...new Set([item.id, ...nearby])];
    const branch = item.role === 'expert' ? explicitBranch(item.text) : null;
    const kind = branch ? 'decision' : classify(item);
    const node = { id: `node-${item.id}`, kind, title: preview(branch?.condition || item.text), at: item.at, evidenceIds: refs, reason: item.role === 'expert' ? clean(item.text.match(/\b(?:porque|ya que|debido a que)\s+([\s\S]+)/i)?.[1] || '') : '', position: { x: 320, y: row * 210 } };
    nodes.push(node); addEdges(node.id); tails = [node.id]; row++;
    if (branch) {
      for (const [choice, text, x] of [['yes', branch.yes, 80], ['no', branch.no, 560]]) {
        const child = { id: `${node.id}-${choice}`, kind: 'step', title: preview(text), at: item.at, evidenceIds: [item.id], reason: '', position: { x, y: row * 210 } };
        nodes.push(child);
        edges.push({ id: `edge-${edges.length + 1}`, source: node.id, target: child.id, label: choice === 'yes' ? 'Si se cumple' : 'Si no se cumple', kind: 'condition' });
      }
      tails = [`${node.id}-yes`, `${node.id}-no`]; row++;
    }
  }
  const maxAt = Math.max(0, ...evidence.map(e => e.at || 0));
  nodes.push({ id: 'end', kind: 'end', title: 'Fin del registro', at: maxAt, evidenceIds: [], reason: '', position: { x: 320, y: row * 210 } });
  addEdges('end');
  return { version: 1, generatorVersion: 1, id, folder, title: preview(summary || expert[0]?.text || 'Proceso sin descripción', 90), summary, status: 'draft', sourceDigest, generatedAt: new Date().toISOString(), warnings, nodes, edges, evidence };
}

const mdSafe = (text) => String(text).replace(/([\\`*_{}\[\]<>#|!])/g, '\\$1');
export function flowToCanvas(flow) {
  const color = { start: '4', end: '4', decision: '3', guardrail: '1', question: '6', screen: '5', step: '4' };
  return {
    nodes: flow.nodes.map(node => ({ id: node.id, type: 'text', x: node.position.x, y: node.position.y, width: 340, height: 160, color: color[node.kind], text: `## ${mdSafe(node.title)}\n\n${labels[node.kind]} · ${flowClock(node.at)}\n\n${node.evidenceIds.length ? `[[Sesiones/${flow.folder}/evidencia-flujo#^${node.evidenceIds[0]}|Ver evidencia]]` : 'Borrador · pendiente de revisión'}` })),
    edges: flow.edges.map(edge => ({ id: edge.id, fromNode: edge.source, toNode: edge.target, fromSide: 'bottom', toSide: 'top', toEnd: 'arrow', label: edge.label })),
  };
}
export function flowEvidenceMarkdown(flow) {
  return `# Evidencia del diagrama\n\nBorrador generado desde [[Sesiones/${flow.folder}/transcripcion]] y [[Sesiones/${flow.folder}/eventos]]. Las observaciones cercanas en el tiempo son contexto, no confirmación de una relación causal.\n\n` + flow.evidence.map(e => `### ${e.at === null ? 'Sin tiempo relativo' : flowClock(e.at)} · ${e.role === 'expert' ? 'Persona' : e.role === 'agent' ? 'Agente' : 'Observación'}\n\n${mdSafe(e.text)}\n\n^${e.id}\n`).join('\n');
}
export function flowMarkdown(flow) {
  return `# ${mdSafe(flow.title)}\n\n**Borrador automático, pendiente de revisión del experto.**\n\n[[Sesiones/${flow.folder}/flujo.canvas|Abrir diagrama interactivo]] · [[Sesiones/${flow.folder}/transcripcion|Transcripción]] · [[Sesiones/${flow.folder}/evidencia-flujo|Evidencia]]\n\n` + flow.warnings.map(w => `- ${w}`).join('\n') + '\n\n' + flow.nodes.filter(n => !['start', 'end'].includes(n.kind)).map(n => `## ${flowClock(n.at)} · ${mdSafe(n.title)}\n\n${labels[n.kind]}. ${n.reason ? `Razón narrada: ${mdSafe(n.reason)}` : 'Razón pendiente de confirmar.'}\n\n${n.evidenceIds.map(id => `[[Sesiones/${flow.folder}/evidencia-flujo#^${id}|${id}]]`).join(' · ')}\n`).join('\n');
}

const locks = new Map();
async function serial(key, fn) {
  const previous = locks.get(key) || Promise.resolve();
  const next = previous.catch(() => {}).then(fn);
  locks.set(key, next);
  try { return await next; } finally { if (locks.get(key) === next) locks.delete(key); }
}
async function readPrivate(dir, name) {
  const file = join(dir, name);
  const info = await lstat(file).catch(e => { if (e.code === 'ENOENT') return null; throw e; });
  if (!info) return null;
  if (!info.isFile() || info.isSymbolicLink() || info.size > 8 * 1024 * 1024) throw new Error('invalid-flow-source');
  return readFile(file, 'utf8');
}
async function atomic(dir, name, text) {
  const file = join(dir, name);
  const temp = `${file}.${randomUUID()}.tmp`;
  try { await writeFile(temp, text, { encoding: 'utf8', flag: 'wx' }); await rename(temp, file); }
  finally { await unlink(temp).catch(() => {}); }
}

// Only fixed filenames are accessed. Preserve an Obsidian canvas edited by a person.
export async function ensureProcessFlow(root, folder, id) {
  if (!/^[A-Za-z0-9_-]{1,80}$/.test(id) || !/^[A-Za-z0-9_-]{1,110}$/.test(folder) || !folder.endsWith('-' + id)) throw new Error('invalid-flow-id');
  const base = await realpath(root);
  const dir = join(base, 'Sesiones', folder);
  if (!(await realpath(dir)).startsWith(base + sep) || (await lstat(dir)).isSymbolicLink()) throw new Error('path-outside-vault');
  return serial(dir, async () => {
    const transcript = await readPrivate(dir, 'transcripcion.md');
    if (transcript === null) return null;
    const events = await readPrivate(dir, 'eventos.md') || '';
    const storedText = await readPrivate(dir, 'process-flow.json');
    let stored;
    try { stored = storedText ? JSON.parse(storedText) : null; } catch { throw new Error('invalid-flow-file'); }
    const canvasText = await readPrivate(dir, 'flujo.canvas');
    const canvasEdited = canvasText !== null && (!stored?.canvasDigest || hash(canvasText) !== stored.canvasDigest);
    if (stored?.version === 1 && stored.generatorVersion === 1 && stored.sourceDigest === hash(transcript + '\n---EVENTS---\n' + events)) {
      if (canvasText === null) await atomic(dir, 'flujo.canvas', JSON.stringify(flowToCanvas(stored), null, 2) + '\n');
      if (await readPrivate(dir, 'evidencia-flujo.md') === null) await atomic(dir, 'evidencia-flujo.md', flowEvidenceMarkdown(stored));
      if (await readPrivate(dir, 'mapa-generado.md') === null) await atomic(dir, 'mapa-generado.md', flowMarkdown(stored));
      return { ...stored, canvasEdited };
    }
    const flow = buildProcessFlow({ id, folder, transcript, events });
    const canvas = JSON.stringify(flowToCanvas(flow), null, 2) + '\n';
    flow.canvasDigest = canvasEdited ? stored?.canvasDigest || '' : hash(canvas);
    await atomic(dir, 'evidencia-flujo.md', flowEvidenceMarkdown(flow));
    await atomic(dir, 'mapa-generado.md', flowMarkdown(flow));
    if (!canvasEdited) await atomic(dir, 'flujo.canvas', canvas);
    await atomic(dir, 'process-flow.json', JSON.stringify(flow, null, 2) + '\n');
    return { ...flow, canvasEdited };
  });
}
