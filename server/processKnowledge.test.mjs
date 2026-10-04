import { describe, it, expect } from 'vitest';
import { buildKnowledgeGraph, knowledgeToCanvas } from './processKnowledge.mjs';
const step = (id, text, extra = {}) => ({ id, title: text, kind: 'step', evidenceIds: ['expert-1'], ...extra });
const flow = (id, nodes, extra = {}) => ({ id, nodes, ...extra });
describe('documented process relationships', () => {
  it('connects repeated themes across processes with inspectable step evidence', () => {
    const graph = buildKnowledgeGraph([flow('one', [step('a', 'Revisar el presupuesto'), step('b', 'Reservar presupuesto')]), flow('two', [step('c', 'Revisar gasto', { reason: 'El presupuesto disponible no alcanza.' })])]);
    const links = graph.memberships.filter((m) => m.facetId === 'topic:presupuesto');
    expect(links).toHaveLength(2);
    expect(links[0].proofs).toHaveLength(2);
    expect(links[1].proofs[0]).toMatchObject({ stepId: 'c', field: 'Motivo', excerpt: 'El presupuesto disponible no alcanza.', evidenceIds: ['expert-1'] });
  });
  it('does not use conversation, title, department or boundary text as action evidence', () => {
    const graph = buildKnowledgeGraph([flow('one', [{ kind: 'start', title: 'Revisar facturas', id: 'start' }], { title: 'Presupuesto', department: 'Contabilidad', evidence: [{ role: 'agent', text: 'Revisa el proveedor y su factura.' }] })]);
    expect(graph.memberships).toEqual([]);
  });
  it('normalizes accents and case without connecting partial words', () => {
    const graph = buildKnowledgeGraph([flow('one', [step('a', 'Revisar OPINIÓN DE CUMPLIMIENTO 32-D y la recepción'), step('b', 'Preparar un REPORTE')])]);
    expect(graph.facets.map((f) => f.id)).toContain('topic:cumplimiento');
    expect(graph.facets.map((f) => f.id)).toContain('topic:recepcion');
    expect(graph.facets.map((f) => f.id)).not.toContain('topic:pagos');
  });
  it('recognizes only catalog activity codes and deduplicates fields within a step', () => {
    const graph = buildKnowledgeGraph([flow('one', [step('a', 'Revisar presupuesto', { instructions: ['Abrir presupuesto'], activityCode: '2.3' }), step('b', 'Otra tarea', { activityCode: '99' })])]);
    expect(graph.memberships.find((m) => m.facetId === 'topic:presupuesto').proofs).toHaveLength(1);
    expect(graph.facets.some((f) => f.id === 'activity:2.3')).toBe(true);
    expect(graph.facets.some((f) => f.id === 'activity:99')).toBe(false);
  });
  it('keeps all library identities in Canvas, including disconnected records, and has no causal arrows', () => {
    const flows = [flow('one', [step('a', 'Revisar presupuesto')]), flow('two', [step('b', 'Reservar presupuesto')]), flow('empty', [])];
    const summaries = flows.map((f) => ({ id: f.id, catalogPath: `Procesos/${f.id}.md` }));
    const canvas = knowledgeToCanvas(summaries, buildKnowledgeGraph(flows));
    expect(canvas.nodes.filter((n) => n.type === 'file').map((n) => n.id)).toEqual(['one', 'two', 'empty']);
    expect(canvas.edges).toHaveLength(2);
    expect(canvas.edges.every((e) => e.toEnd === 'none')).toBe(true);
    expect(canvas.edges.every((e) => canvas.nodes.some((n) => n.id === e.fromNode) && canvas.nodes.some((n) => n.id === e.toNode))).toBe(true);
  });
});
