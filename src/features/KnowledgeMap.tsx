import { t, dateLocale, language, catalogLabel } from "../i18n";
import { useMemo, useState } from 'react';
import { ReactFlow, Background, Controls, MiniMap, Position } from '@xyflow/react';
import type { Node, Edge } from '@xyflow/react';
import { ArrowUpRight, BookOpen, Network } from 'lucide-react';
import type { KnowledgeMembership } from '../domain/processFlow';
import { emptyProcessFilters, filterProcesses, visibleKnowledgeGraph } from '../domain/processCollection';
import { CollectionHeader, CollectionFilters, CollectionEmpty } from './ProcessCollection';
import type { CollectionProps } from './ProcessCollection';
import '@xyflow/react/dist/style.css';
import './ProcessCollection.css';

function Proofs({ membership }: { membership: KnowledgeMembership }) {
  return <ul className="knowledge-proofs">{membership.proofs.map((proof) => <li key={proof.stepId}><strong>{proof.stepTitle}</strong><span>{t("Coincidencia en:")}{" "}{t(proof.field).toLocaleLowerCase(dateLocale())}</span>{proof.excerpt !== proof.stepTitle && <p>{proof.excerpt}</p>}</li>)}</ul>;
}
export default function KnowledgeMap({ collection, filters, onFilters, onOpen, onLibrary }: CollectionProps & { onLibrary: () => void }) {
  const [kind, setKind] = useState<'all' | 'topic' | 'activity'>('all');
  const [selected, setSelected] = useState('');
  const data = collection.data;
  const selectedLanguage = language();
  const processes = useMemo(() => data ? filterProcesses(data.processes, data.graph, filters, catalogLabel) : [], [data, filters, selectedLanguage]);
  const graph = useMemo(() => data ? visibleKnowledgeGraph(data.graph, processes, kind) : { facets: [], memberships: [] }, [data, processes, kind]);
  const selectedId = [...processes.map((p) => p.id), ...graph.facets.map((f) => f.id), ...graph.memberships.map((m) => m.id)].includes(selected) ? selected : graph.facets.find((f) => f.kind === 'topic')?.id || graph.facets[0]?.id || processes[0]?.id || '';
  const facet = graph.facets.find((f) => f.id === selectedId);
  const process = processes.find((p) => p.id === selectedId);
  const relation = graph.memberships.find((m) => m.id === selectedId);
  const related = graph.memberships.filter((m) => m.processId === selectedId || m.facetId === selectedId || m.id === selectedId);
  const relatedProcessIds = new Set(related.map((m) => m.processId));
  const relatedFacetIds = new Set(related.map((m) => m.facetId));
  const height = Math.max(processes.length * 150, graph.facets.length * 100, 400);
  const sorted = [...processes].sort((a, b) => (a.department + a.taskType + a.title).localeCompare(b.department + b.taskType + b.title, dateLocale()));
  const nodes: Node[] = [
    ...sorted.map((p, i) => ({ id: p.id, type: 'input', position: { x: 0, y: i * 150 }, sourcePosition: Position.Right,
      selected: p.id === selectedId, className: 'knowledge-process-node' + (relatedProcessIds.has(p.id) ? ' related' : ''),
      ariaLabel: t('Proceso: ') + p.title,
      data: { label: <><small>{t(p.taskType)}</small><strong>{p.title}</strong><span>{t("{{count}} acción", { count: p.steps })}</span></> },
    })),
    ...graph.facets.map((f, i) => ({ id: f.id, type: 'output', position: { x: 540, y: (i + .5) * height / graph.facets.length - 35 }, targetPosition: Position.Left,
      selected: f.id === selectedId, className: 'knowledge-topic-node' + (relatedFacetIds.has(f.id) ? ' related' : ''),
      ariaLabel: (f.kind === 'topic' ? t('Tema: ') : t('Actividad: ')) + catalogLabel(f.label),
      data: { label: <><small>{f.kind === 'topic' ? t("Tema compartido") : t("Actividad compartida")}</small><strong>{catalogLabel(f.label)}</strong></> },
    })),
  ];
  const edges: Edge[] = graph.memberships.map((m) => ({ id: m.id, source: m.processId, target: m.facetId,
    selected: m.id === selectedId, type: 'default', interactionWidth: 24,
    ariaLabel: t("{{from}} comparte {{topic}}", { from: processes.find((p) => p.id === m.processId)?.title, topic: catalogLabel(graph.facets.find((f) => f.id === m.facetId)?.label || '') }),
    style: { stroke: related.some((r) => r.id === m.id) ? '#3d654b' : '#bcc7b6', strokeWidth: related.some((r) => r.id === m.id) ? 2.4 : 1.2 },
  }));
  const layoutKey = nodes.map((n) => n.id).join('|');
  return <div className="process-collection-page">
    <CollectionHeader collection={collection} title={t("Lo que conecta tus procesos.")} description={t("La misma biblioteca, vista a través de los temas y actividades que comparten sus acciones.")}/>
    {data && <>
      <CollectionFilters processes={data.processes} filters={filters} onFilters={onFilters}/>
      <div className="collection-summary"><span>{processes.length}{" "}{t("de")}{" "}{data.processes.length}{" "}{t("procesos ·")}{" "}{graph.facets.length}{" "}{t("coincidencias compartidas")}</span><button className="text-button" onClick={onLibrary}><BookOpen size={16}/>{t("Ver biblioteca ordenada")}</button></div>
      {!processes.length ? <CollectionEmpty hasProcesses={!!data.processes.length} onClear={() => onFilters(emptyProcessFilters)}/> : <>
        <div className="knowledge-toolbar"><p><span className="knowledge-key process-key"/>{t("Proceso")}{" "}<span className="knowledge-key topic-key"/>{t("Tema o actividad")}</p>
          <label>{t("Conectar por")}{" "}<select value={kind} onChange={(e) => setKind(e.target.value as typeof kind)}><option value="all">{t("Temas y actividades")}</option><option value="topic">{t("Temas")}</option><option value="activity">{t("Actividades")}</option></select></label>
        </div>
        {!graph.facets.length && <p className="knowledge-no-links" role="status">{t("Estos procesos todavía no comparten temas o actividades detectadas. Se muestran sin conexiones; prueba ampliar los filtros.")}</p>}
        <div className="knowledge-layout">
          <div className="knowledge-canvas" aria-label={t("Grafo de relaciones entre procesos")}>
            <ReactFlow key={layoutKey} nodes={nodes} edges={edges} fitView fitViewOptions={{ padding: .16 }} minZoom={.12} maxZoom={1.8}
              nodesDraggable={false} nodesConnectable={false} edgesReconnectable={false} onNodeClick={(_, node) => setSelected(node.id)} onEdgeClick={(_, edge) => setSelected(edge.id)}
              onNodesChange={(changes) => { const selected = changes.find((c) => c.type === "select" && c.selected); if (selected?.type === "select") setSelected(selected.id); }}
              onEdgesChange={(changes) => { const selected = changes.find((c) => c.type === "select" && c.selected); if (selected?.type === "select") setSelected(selected.id); }}
              ariaLabelConfig={{ 'controls.zoomIn.ariaLabel': t('Acercar mapa'), 'controls.zoomOut.ariaLabel': t('Alejar mapa'), 'controls.fitView.ariaLabel': t('Encuadrar mapa') }}>
              <Background color="#d2dacd" gap={24}/><Controls showInteractive={false}/><MiniMap pannable zoomable nodeColor={(n) => n.type === 'input' ? '#d8e0d1' : '#72906c'}/>
            </ReactFlow>
          </div>
          <aside className="knowledge-inspector" aria-label={t("Detalle de la relación")}>
            <label className="knowledge-picker">{t("Explorar sin mover el mapa")}<select value={relation ? relation.facetId : selectedId} onChange={(e) => setSelected(e.target.value)}>
              {!!graph.facets.length && <optgroup label={t("Temas y actividades")}>{graph.facets.map((f) => <option key={f.id} value={f.id}>{catalogLabel(f.label)}</option>)}</optgroup>}
              <optgroup label={t("Procesos")}>{processes.map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}</optgroup>
            </select></label>
            <h2>{process?.title || catalogLabel(facet?.label || '') || catalogLabel(graph.facets.find((f) => f.id === relation?.facetId)?.label || '')}</h2>
            <div className="knowledge-inspector-heading"><Network size={18}/><span>{process ? t("Proceso") : relation ? t("Conexión documentada") : facet?.kind === 'activity' ? t("Actividad compartida") : t("Tema compartido")}</span></div>
            {process && <><p>{t(process.department)} · {t(process.taskType)}</p><button className="button primary" onClick={() => onOpen(process.id)}>{t("Abrir procedimiento")}<ArrowUpRight size={16}/></button></>}
            <p className="knowledge-explanation">{process ? (related.length ? t("Estas acciones explican sus conexiones con otros procesos.") : t("No hay coincidencias compartidas en la selección actual. El procedimiento sigue disponible.")) : t("Estos procesos comparten una mención o actividad. Abre cada procedimiento para comparar sus decisiones y motivos.")}</p>
            {related.map((m) => <section className="knowledge-related" key={m.id}><h3>{process ? catalogLabel(graph.facets.find((f) => f.id === m.facetId)?.label || '') : processes.find((p) => p.id === m.processId)?.title}</h3><Proofs membership={m}/>
              <button className="text-button" onClick={() => onOpen(m.processId)}>{t("Ver acciones e imágenes")}<ArrowUpRight size={15}/></button>
            </section>)}
          </aside>
        </div>
        <p className="knowledge-footnote">{t("Las conexiones muestran coincidencias en acciones documentadas, no una secuencia ni reglas equivalentes. Los procesos sin coincidencias también aparecen. El paso a paso está dentro de cada procedimiento.")}</p>
      </>}
    </>}
  </div>;
}
