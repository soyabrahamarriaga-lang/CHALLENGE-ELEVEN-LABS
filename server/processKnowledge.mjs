import { PROCESS_CATALOG } from './processCatalog.mjs';

const normalize = (value) => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
// Explicit lexical associations over documented actions. These are navigation aids,
// never conclusions that two processes use the same rule or should run in sequence.
const topics = [
  ['presupuesto', 'Presupuesto', /\b(presupuest\w*|comprometido|ejercido)\b/],
  ['inventario', 'Inventario', /\b(inventario|stock|existencias)\b/],
  ['orden-compra', 'Órdenes de compra', /\b(oc|orden(?:es)? de compra|solicitud(?:es)? de compra|requisicion\w*)\b/],
  ['proveedores', 'Proveedores', /\b(proveedor\w*)\b/],
  ['cotizaciones', 'Cotizaciones', /\b(cotiz\w*|rfq)\b/],
  ['autorizacion', 'Autorización', /\b(aproba\w*|aprobar|autoriz\w*)\b/],
  ['recepcion', 'Recepción y entrega', /\b(recepcion|recibir|entrega\w*)\b/],
  ['cumplimiento', 'Opinión de cumplimiento · 32-D', /\b(32[ -]?d|opinion de cumplimiento)\b/],
  ['efos', 'Listas fiscales · 69-B', /\b(69[ -]?b|efos)\b/],
  ['repse', 'REPSE', /\brepse\b/],
  ['cfdi', 'Facturas y CFDI', /\b(cfdi|factura\w*|xml)\b/],
  ['retenciones', 'Retenciones', /\b(retencion\w*|retenido|retener|isr)\b/],
  ['pagos', 'Pagos', /\b(pago\w*|pagar|ppd|pue|rep|clabe)\b/],
  ['materialidad', 'Materialidad', /\b(materialidad|expediente\w*|evidencia\w*)\b/],
  ['negociacion', 'Negociación', /\b(negoci\w*|contraoferta\w*)\b/],
  ['precios', 'Precios y costos', /\b(precio\w*|costo\w*|descuento\w*|ahorro\w*)\b/],
  ['vigencia', 'Vigencia y plazos', /\b(vigen\w*|vencim\w*|vencid\w*|plazo\w*|caduc\w*)\b/],
  ['rechazo', 'Rechazos y cancelaciones', /\b(rechaz\w*|cancel\w*|devolver|devolucion\w*)\b/],
];
const fields = (step) => [
  ['Acción', step.title],
  ...(step.instructions || []).map((value) => ['Instrucción', value]),
  ['Decisión', step.decision], ['Motivo', step.reason],
  ...(step.guardrails || []).map((value) => ['Condición', value]),
].filter(([, value]) => typeof value === 'string' && value.trim());

export function buildKnowledgeGraph(flows, catalog = PROCESS_CATALOG) {
  const facets = new Map(), memberships = [];
  const activities = new Map(catalog.families.flatMap((family) => family.activities));
  for (const flow of flows) {
    const matches = new Map();
    const add = (id, label, kind, step, field, excerpt) => {
      facets.set(id, { id, label, kind });
      if (!matches.has(id)) matches.set(id, []);
      const proofs = matches.get(id);
      // One best matching field per step and topic is enough to explain the link.
      if (!proofs.some((p) => p.stepId === step.id)) proofs.push({
        stepId: step.id, stepTitle: step.title, field, excerpt,
        evidenceIds: step.evidenceIds || [],
      });
    };
    for (const step of flow.nodes) {
      if (!['step', 'decision'].includes(step.kind)) continue;
      for (const [field, value] of fields(step)) {
        const text = normalize(value);
        for (const [id, label, pattern] of topics) {
          if (pattern.test(text)) add('topic:' + id, label, 'topic', step, field, value);
        }
      }
      if (activities.has(step.activityCode)) add(
        'activity:' + step.activityCode,
        step.activityCode + ' · ' + activities.get(step.activityCode),
        'activity', step, 'Actividad clasificada', step.title,
      );
    }
    for (const [facetId, proofs] of matches) memberships.push({
      id: flow.id + '::' + facetId, processId: flow.id, facetId, proofs,
    });
  }
  return { version: 1, facets: [...facets.values()].sort((a, b) => a.label.localeCompare(b.label, 'es')), memberships };
}

// Same process identities as the library. Hubs avoid a quadratic tangle of pairwise links.
export function knowledgeToCanvas(processes, graph) {
  const shared = graph.facets.filter((f) => graph.memberships.filter((m) => m.facetId === f.id).length > 1);
  const ids = new Set(shared.map((f) => f.id));
  const height = Math.max(processes.length * 180, shared.length * 140);
  return {
    nodes: [
      ...processes.map((p, i) => ({ id: p.id, type: 'file', file: p.catalogPath,
        x: 0, y: i * 180, width: 360, height: 140 })),
      ...shared.map((f, i) => ({ id: f.id, type: 'text', text: `${f.kind === 'topic' ? 'Tema' : 'Actividad'} compartido\n\n${f.label}`,
        x: 620, y: (i + .5) * height / shared.length - 60, width: 300, height: 110, color: '4' })),
    ],
    edges: graph.memberships.filter((m) => ids.has(m.facetId)).map((m) => ({
      id: m.id, fromNode: m.processId, fromSide: 'right', toNode: m.facetId, toSide: 'left',
      fromEnd: 'none', toEnd: 'none',
    })),
  };
}
