import type { KnowledgeGraph, ProcessFilters, ProcessSummary } from './processFlow';
export const normalizeProcessText = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
export const emptyProcessFilters: ProcessFilters = { query: '', department: '', taskType: '' };
export function filterProcesses(processes: ProcessSummary[], graph: KnowledgeGraph, filters: ProcessFilters) {
  const labels = new Map(graph.facets.map((f) => [f.id, f.label]));
  const terms = normalizeProcessText(filters.query).trim().split(/\s+/).filter(Boolean);
  return processes.filter((p) => {
    const text = normalizeProcessText([p.title, p.department, p.taskType,
      ...graph.memberships.filter((m) => m.processId === p.id).map((m) => labels.get(m.facetId))].join(' '));
    return (!filters.department || p.department === filters.department) &&
      (!filters.taskType || p.taskType === filters.taskType) && terms.every((term) => text.includes(term));
  });
}
export function visibleKnowledgeGraph(graph: KnowledgeGraph, processes: ProcessSummary[], kind: 'all' | 'topic' | 'activity' = 'all') {
  const ids = new Set(processes.map((p) => p.id));
  const memberships = graph.memberships.filter((m) => ids.has(m.processId));
  const counts = new Map<string, number>();
  for (const m of memberships) counts.set(m.facetId, (counts.get(m.facetId) || 0) + 1);
  const facets = graph.facets.filter((f) => (kind === 'all' || f.kind === kind) && (counts.get(f.id) || 0) > 1);
  const facetsIds = new Set(facets.map((f) => f.id));
  return { facets, memberships: memberships.filter((m) => facetsIds.has(m.facetId)) };
}
