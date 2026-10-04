import { describe, it, expect, afterEach } from 'vitest';
import { mkdtemp, mkdir, readFile, writeFile, rm, symlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { buildProcessFlow, ensureProcessFlow, flowToCanvas, parseFlowEvidence } from './processFlow.mjs';
import { createVault, readVaultConfig } from './vault.mjs';

const transcript = `---
conversacion: "conv_synthetic"
inicio: "2026-10-04T02:30:00Z"
---
# Prueba sintética

## Resumen

Revisar una solicitud de compra de ejemplo.

## Conversación

**[00:02] Persona:** Primero abro la solicitud y reviso la fecha.

**[00:05] Agente:** ¿Qué haces si excede el plazo?

**[00:08] Persona:** Si supera 30 días, rechazo la solicitud; si no, continúo la revisión.

**[00:12] Persona:** No se puede guardar sin el motivo porque necesitamos dejar evidencia.

## Enlaces

- [[eventos]]
`;
const events = '- `00:07` **screen** — Estado: borrador; antigüedad: 42 días ^event-demo\n';
const input = { id: 'conv_synthetic', folder: '2026-10-04-conv_synthetic', transcript, events };
const cleanup = [];
afterEach(async () => { for (const root of cleanup.splice(0)) await rm(root, {recursive:true, force:true}); });
async function setup() {
  const root = await mkdtemp(join(tmpdir(), 'flow-test-')); cleanup.push(root);
  const folder = input.folder; const dir = join(root,'Sesiones',folder); await mkdir(dir,{recursive:true});
  await writeFile(join(dir,'transcripcion.md'),transcript); await writeFile(join(dir,'eventos.md'),events);
  return {root,dir,folder};
}
describe('evidence-based process diagrams', () => {
  it('keeps exact attributed evidence and branches only on an explicitly stated alternative', () => {
    const flow = buildProcessFlow(input);
    expect(flow.status).toBe('draft');
    expect(flow.evidence).toHaveLength(5);
    expect(flow.nodes.filter(n=>n.kind==='decision')).toHaveLength(1);
    expect(flow.edges.filter(e=>e.kind==='condition').map(e=>e.label)).toEqual(['Si se cumple','Si no se cumple']);
    expect(flow.nodes.find(n=>n.kind==='guardrail').reason).toBe('necesitamos dejar evidencia.');
    const refs = new Set(flow.evidence.map(e=>e.id));
    for(const node of flow.nodes) for(const id of node.evidenceIds) expect(refs.has(id)).toBe(true);
    const incomplete = buildProcessFlow({...input,transcript:transcript.replace('; si no, continúo la revisión.','.')});
    expect(incomplete.edges.filter(e=>e.kind==='condition')).toHaveLength(0);
    expect(flow.evidence.find(e=>e.role==='agent').text).toBe('¿Qué haces si excede el plazo?');
  });
  it('does not fabricate a process from agent-only or empty transcripts and keeps wall clocks unaligned', () => {
    const flow = buildProcessFlow({...input, transcript:'## Conversación\n\n**[00:01] Agente:** Mm-hm.\n',events:'- `18:03:20` **screen** — Reloj sin alineación\n'});
    expect(flow.nodes.map(n=>n.kind)).toEqual(['start','end']);
    expect(flow.warnings.join(' ')).toContain('No hay palabras del experto');
    expect(flow.evidence.find(e=>e.source==='events').at).toBeNull();
  });
  it('keeps stable evidence anchors after an unrelated earlier turn is inserted', () => {
    const before=parseFlowEvidence(transcript,events);
    const after=parseFlowEvidence(transcript.replace('## Conversación','## Conversación\n\n**[00:00] Persona:** Texto previo.'),events);
    for(const e of before) expect(after.find(a=>a.text===e.text).id).toBe(e.id);
  });
  it('exports JSON Canvas with valid endpoints and links scoped to the correct session', () => {
    const flow=buildProcessFlow(input);const canvas=flowToCanvas(flow);const ids=new Set(canvas.nodes.map(n=>n.id));
    for(const edge of canvas.edges){expect(ids.has(edge.fromNode)).toBe(true);expect(ids.has(edge.toNode)).toBe(true);expect(edge.toEnd).toBe('arrow');}
    expect(canvas.nodes.find(n=>n.text.includes('Ver evidencia')).text).toContain('[[Sesiones/2026-10-04-conv_synthetic/evidencia-flujo#^');
    expect(canvas.nodes.every(n=>Number.isInteger(n.x)&&n.width>0&&n.height>0)).toBe(true);
  });
  it('escapes Markdown from source text in exported notes and nodes', () => {
    const flow=buildProcessFlow({...input,transcript:'## Conversación\n\n**[00:01] Persona:** [haz clic](https://example.com) <img src=x>\n',events:''});
    expect(flowToCanvas(flow).nodes[1].text).toContain('\\[haz clic\\]');
    expect(flow.nodes[1].title).toContain('<img src=x>'); // Rendered as text by React, never injected as HTML.
  });
});
describe('private derived files', () => {
  it('backfills existing sessions, is idempotent and leaves original notes untouched', async () => {
    const {root,dir,folder}=await setup();await writeFile(join(dir,'work-map.md'),'# Notas manuales');
    const first=await ensureProcessFlow(root,folder,input.id);
    const again=await ensureProcessFlow(root,folder,input.id);
    expect(again.generatedAt).toBe(first.generatedAt);
    await rm(join(dir,'evidencia-flujo.md'));
    await rm(join(dir,'mapa-generado.md'));
    await ensureProcessFlow(root,folder,input.id);
    expect(await readFile(join(dir,'evidencia-flujo.md'),'utf8')).toContain('Evidencia del diagrama');
    expect(await readFile(join(dir,'mapa-generado.md'),'utf8')).toContain('Abrir diagrama interactivo');
    expect(await readFile(join(dir,'transcripcion.md'),'utf8')).toBe(transcript);
    expect(await readFile(join(dir,'work-map.md'),'utf8')).toBe('# Notas manuales');
    expect(JSON.parse(await readFile(join(dir,'flujo.canvas'),'utf8')).nodes.length).toBe(first.nodes.length);
    const vault=createVault(readVaultConfig({VAULT_PATH:root}));
    expect((await vault.ensureProcessMaps()).processes).toHaveLength(1);
    await expect(vault.getProcessFlow('missing')).resolves.toBeNull();
  });
  it('regenerates from new evidence while preserving an edited Obsidian canvas', async () => {
    const {root,dir,folder}=await setup();const before=await ensureProcessFlow(root,folder,input.id);
    await writeFile(join(dir,'flujo.canvas'),'CUSTOM CANVAS');
    await writeFile(join(dir,'eventos.md'),events+'- `00:30` **decision** — Enviar a revisión\n');
    const after=await ensureProcessFlow(root,folder,input.id);
    expect(after.sourceDigest).not.toBe(before.sourceDigest);expect(after.canvasEdited).toBe(true);
    expect(await readFile(join(dir,'flujo.canvas'),'utf8')).toBe('CUSTOM CANVAS');
    expect(after.evidence.some(e=>e.text==='Enviar a revisión')).toBe(true);
  });
  it('serializes concurrent regeneration and refuses traversal and symbolic source files', async () => {
    const {root,dir,folder}=await setup();
    const results=await Promise.all([ensureProcessFlow(root,folder,input.id),ensureProcessFlow(root,folder,input.id)]);
    expect(results[0].sourceDigest).toBe(results[1].sourceDigest);
    await expect(ensureProcessFlow(root,'../elsewhere',input.id)).rejects.toThrow('invalid-flow-id');
    await rm(join(dir,'eventos.md'));await symlink(join(dir,'transcripcion.md'),join(dir,'eventos.md'));
    await expect(ensureProcessFlow(root,folder,input.id)).rejects.toThrow('invalid-flow-source');
  });
  it('creates the diagram automatically on conversation import', async () => {
    const {root}=await setup();const vault=createVault(readVaultConfig({VAULT_PATH:root}));
    const result=await vault.saveConversation({conversation_id:'conv_new',status:'done',metadata:{start_time_unix_secs:1801535400},transcript:[{role:'user',message:'Reviso la fecha antes de aprobar.',time_in_call_secs:1}]});
    expect(result.flowStatus).toBe('ready');
    expect((await vault.getProcessFlow('conv_new')).nodes.some(n=>n.title.includes('Reviso la fecha'))).toBe(true);
  });
});
