import { describe, it, expect } from 'vitest';
import { emptyProcessFilters, filterProcesses, visibleKnowledgeGraph, withoutProcess } from './processCollection';
import type { ProcessSummary, KnowledgeGraph } from './processFlow';
const processes = [
  { id: 'one', title: 'Autorizar orden', department: 'Contabilidad', taskType: 'Compras', steps: 2 },
  { id: 'two', title: 'Validar cumplimiento', department: 'Contabilidad', taskType: 'Proveedores', steps: 1 },
  { id: 'empty', title: 'Sin tarea', department: 'Contabilidad', taskType: 'Por clasificar', steps: 0 },
] as ProcessSummary[];
const graph: KnowledgeGraph = { version: 1, facets: [{ id: 'topic:32d', kind: 'topic', label: 'Opinión de cumplimiento' }], memberships: ['one', 'two'].map((id) => ({ id: id + ':32d', processId: id, facetId: 'topic:32d', proofs: [] })) };
describe('one collection for library and graph', () => {
  it('searches common topics with accent-insensitive terms in both views', () => {
    const filtered = filterProcesses(processes, graph, { ...emptyProcessFilters, query: 'opinion cumplimiento' });
    expect(filtered.map((p) => p.id)).toEqual(['one', 'two']);
    expect(visibleKnowledgeGraph(graph, filtered).memberships.map((m) => m.processId)).toEqual(['one', 'two']);
  });
  it('never removes disconnected records from the collection', () => {
    expect(filterProcesses(processes, graph, emptyProcessFilters)).toHaveLength(3);
  });
  it('recomputes shared relationships within the same filtered set', () => {
    const filtered = filterProcesses(processes, graph, { ...emptyProcessFilters, taskType: 'Compras' });
    expect(filtered.map((p) => p.id)).toEqual(['one']);
    expect(visibleKnowledgeGraph(graph, filtered)).toEqual({ facets: [], memberships: [] });
    expect(visibleKnowledgeGraph(graph, processes, 'activity').memberships).toEqual([]);
  });
});

it('removes a process and its relationships from the shared cache without changing the source', () => {
  const data = { processes, graph, catalog: { version: 1, defaultDepartment: "", departments: [], families: [] }, failures: [{ id: 'one', error: 'failed' }] };
  const next = withoutProcess(data, 'one');
  expect(next.processes.map((p) => p.id)).toEqual(['two', 'empty']);
  expect(next.failures).toEqual([]);
  expect(next.graph.memberships.every((m) => m.processId !== 'one')).toBe(true);
  expect(visibleKnowledgeGraph(next.graph, next.processes).facets).toEqual([]);
  expect(data.processes).toHaveLength(3);
  expect(data.graph.memberships).toHaveLength(2);
});
