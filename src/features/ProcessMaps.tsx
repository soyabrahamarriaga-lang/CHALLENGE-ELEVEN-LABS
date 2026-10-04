import { useEffect, useState } from 'react';
import {
  ReactFlow, Background, Controls, MiniMap, MarkerType, Position, useNodesState,
} from '@xyflow/react';
import type { Node, ReactFlowInstance } from '@xyflow/react';
import { ArrowLeft, ArrowRight, Download, ExternalLink, GitBranch, RefreshCw, Search, ShieldCheck } from 'lucide-react';
import type { FlowResponse, ProcessFlow, ProcessSummary } from '../domain/processFlow';
import { flowClock, flowLabels } from '../domain/processFlow';
import { getProcessFlow, listProcesses } from '../services/processFlow';
import '@xyflow/react/dist/style.css';
import './ProcessMaps.css';

const dateLabel = (value: string) => {
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date.toLocaleString('es-MX', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : 'Fecha no disponible';
};
function downloadCanvas(canvas: object) {
  const url = URL.createObjectURL(new Blob([JSON.stringify(canvas, null, 2)], { type: 'application/json' }));
  const link = document.createElement('a'); link.href = url; link.download = 'proceso.canvas'; link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function FlowExplorer({ flow }: { flow: ProcessFlow }) {
  const [selectedId, setSelectedId] = useState(flow.nodes[1]?.id || 'start');
  const [instance, setInstance] = useState<ReactFlowInstance | null>(null);
  const [nodes, , onNodesChange] = useNodesState<Node>(flow.nodes.map(node => ({
    id: node.id, position: node.position, type: 'default', sourcePosition: Position.Bottom, targetPosition: Position.Top,
    className: 'process-node ' + node.kind, ariaLabel: `${flowLabels[node.kind]}: ${node.title}`,
    data: { label: <><span className="process-node-meta">{flowLabels[node.kind]} <time>{flowClock(node.at)}</time></span><strong>{node.title}</strong></> },
  })));
  const edges = flow.edges.map(edge => ({ ...edge, type: 'smoothstep', markerEnd: { type: MarkerType.ArrowClosed, color: '#668273' },
    style: { stroke: edge.kind === 'condition' ? '#86632e' : '#82998a', strokeWidth: 1.5, strokeDasharray: edge.kind === 'sequence' ? '5 4' : undefined },
    labelStyle: { fontSize: 11, fill: '#445b4d' }, labelBgStyle: { fill: '#f6f8f6' },
  }));
  const selected = flow.nodes.find(node => node.id === selectedId) || flow.nodes[0];
  const index = flow.nodes.findIndex(node => node.id === selected.id);
  const evidence = selected.evidenceIds.flatMap(id => flow.evidence.filter(e => e.id === id));
  const choose = (id: string, focus = false) => {
    setSelectedId(id);
    if (focus) void instance?.fitView({ nodes: [{id}], padding: 0.7, maxZoom: 1, duration: 0 });
  };
  return <div className="flow-explorer">
    <section className="flow-board" aria-label="Diagrama de flujo interactivo">
      <div className="flow-board-tools">
        <p>Arrastra para explorar · selecciona un paso para ver su evidencia</p>
        <button className="text-button" onClick={() => { void instance?.fitView({padding:0.15}); }}>Ver todo</button>
      </div>
      <div className="flow-canvas">
        <ReactFlow nodes={nodes.map(n => ({...n, selected: n.id === selectedId}))} edges={edges} onNodesChange={changes => {
          onNodesChange(changes);
          const selection = changes.find(change => change.type === 'select' && change.selected);
          if (selection && 'id' in selection) setSelectedId(selection.id);
        }}
          onNodeClick={(_, node) => choose(node.id)} onInit={setInstance} fitView
          fitViewOptions={{ nodes: flow.nodes.slice(0, 4).map(n => ({id:n.id})), padding: 0.18, maxZoom: 1 }}
          minZoom={0.05} maxZoom={1.7} nodesConnectable={false} deleteKeyCode={null}
          ariaLabelConfig={{ 'controls.zoomIn.ariaLabel': 'Acercar', 'controls.zoomOut.ariaLabel': 'Alejar', 'controls.fitView.ariaLabel': 'Ajustar diagrama', 'node.a11yDescription.default': 'Pulsa Enter para seleccionar. Usa las flechas para mover el nodo.' }}>
          <Background color="#cdd9cf" gap={24} size={1}/>
          <Controls showInteractive={false}/>
          <MiniMap pannable zoomable nodeColor={n => n.className?.includes('decision') ? '#dbcba8' : '#b5cbbb'} ariaLabel="Vista general del proceso"/>
        </ReactFlow>
      </div>
      <div className="flow-legend"><span className="flow-line"/>Orden observado <span className="flow-line condition"/>Condición explícita</div>
    </section>
    <aside className="flow-inspector" aria-label="Evidencia del paso">
      <div className="flow-step-navigation">
        <button className="icon-button" aria-label="Paso anterior" disabled={index === 0} onClick={() => choose(flow.nodes[index-1].id, true)}><ArrowLeft size={18}/></button>
        <label className="sr-only" htmlFor="flow-step">Seleccionar paso</label>
        <select id="flow-step" value={selected.id} onChange={e => choose(e.target.value, true)}>{flow.nodes.map((node, i) => <option key={node.id} value={node.id}>{i+1}. {node.title}</option>)}</select>
        <button className="icon-button" aria-label="Paso siguiente" disabled={index === flow.nodes.length-1} onClick={() => choose(flow.nodes[index+1].id, true)}><ArrowRight size={18}/></button>
      </div>
      <div className="flow-detail" aria-live="polite">
        <h2>{selected.title}</h2>
        <span className={'flow-kind '+selected.kind}>{flowLabels[selected.kind]} · {flowClock(selected.at)}</span>
        {selected.reason && <div className="flow-reason"><h3>Razón narrada</h3><p>{selected.reason}</p></div>}
        <h3>Evidencia de origen</h3>
        {evidence.length ? evidence.map(item => <article className="flow-evidence" key={item.id}>
          <div><strong>{item.role === 'expert' ? 'Persona' : item.role === 'agent' ? 'Agente' : item.kind === 'screen' ? 'Observación de pantalla' : 'Evento registrado'}</strong><time>{item.at === null ? 'Sin tiempo relativo' : flowClock(item.at)}</time></div>
          <p>{item.text}</p><small>{item.file}{item.kind === 'screen' ? ' · contexto cercano; OCR puede contener errores' : ''}</small>
        </article>) : <p className="flow-no-evidence">Este nodo delimita el registro. No representa una acción validada del proceso.</p>}
        {!selected.reason && !['start','end','question'].includes(selected.kind) && <p className="flow-no-evidence">El motivo de este paso todavía debe confirmarse con el experto.</p>}
      </div>
    </aside>
  </div>;
}
export default function ProcessMaps({ id, onOpen }: { id: string; onOpen: (id: string) => void }) {
  const [processes, setProcesses] = useState<ProcessSummary[]>([]);
  const [data, setData] = useState<FlowResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [failed, setFailed] = useState(0);
  const [query, setQuery] = useState('');
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    const abort = new AbortController();
    const timeout = setTimeout(() => abort.abort(), 20000);
    let live = true;
    setLoading(true); setError(''); setData(null);
    const load = async () => {
      try {
        if (id) { const result = await getProcessFlow(id, abort.signal); if (live) setData(result); }
        else { const result = await listProcesses(abort.signal); if (live) { setProcesses(result.processes); setFailed(result.failures.length); } }
      } catch (e) { if (live) setError(e instanceof Error && e.name !== 'AbortError' && e.name !== 'TypeError' ? e.message : 'El servicio de la bóveda no respondió. Comprueba que esté activo y vuelve a intentarlo.'); }
      finally { clearTimeout(timeout); if (live) setLoading(false); }
    };
    void load(); return () => { live = false; abort.abort(); clearTimeout(timeout); };
  }, [id, retry]);
  const filtered = processes.filter(p => p.title.toLocaleLowerCase().includes(query.toLocaleLowerCase()));
  return <div className="process-maps-page">
    {id && <button className="text-button flow-back" onClick={() => onOpen('')}><ArrowLeft size={16}/> Todos los procesos</button>}
    <div className="page-heading"><div><h1>{data ? data.flow.title : 'De la experiencia al proceso.'}</h1><p>{id ? 'Explora el recorrido y las palabras que lo sustentan.' : 'Los procesos de tu bóveda, con su transcripción y un diagrama para recorrerlos.'}</p></div>
      <button className="button secondary" disabled={loading} onClick={() => setRetry(v => v+1)}><RefreshCw size={16}/>Actualizar</button></div>
    {loading && <p className="flow-loading" role="status">Preparando tus mapas…</p>}
    {error && <div className="flow-error" role="alert"><h2>No pudimos abrir los mapas</h2><p>{error}</p><button className="button secondary" onClick={() => setRetry(v => v+1)}>Volver a intentar</button></div>}
    {!loading && !error && !id && <>
      <label className="flow-search"><Search size={18}/><span className="sr-only">Buscar proceso</span><input placeholder="Buscar un proceso…" value={query} onChange={e => setQuery(e.target.value)}/></label>
      {failed > 0 && <p role="status" className="flow-warning">{failed} registros no pudieron convertirse. Sus transcripciones se conservan. Revisa los archivos de la bóveda y actualiza.</p>}
      <div className="flow-list">{filtered.map(p => <button className="flow-list-row" onClick={() => onOpen(p.id)} key={p.id}>
        <span className="flow-list-icon"><GitBranch size={25}/></span><span className="flow-list-title"><strong>{p.title}</strong><small>{dateLabel(p.startedAt)} · {flowClock(p.duration)} · {p.evidenceCount} fragmentos de evidencia</small></span>
        <span className="flow-list-meta">{p.steps} momentos<span>Borrador</span></span><ArrowRight size={19}/>
      </button>)}</div>
      {!filtered.length && <div className="flow-empty"><GitBranch size={32}/><h2>{processes.length ? 'No encontramos ese proceso' : 'Tu próximo proceso empieza con una conversación'}</h2><p>{processes.length ? 'Prueba otra palabra o borra la búsqueda.' : 'Al archivarse una transcripción, su diagrama aparecerá aquí y en tu bóveda de Obsidian.'}</p>{!processes.length && <a className="button primary" href="#senior/agent">Ir a mi aprendiz de IA</a>}</div>}
    </>}
    {!loading && !error && data && <>
      <div className="flow-context"><ShieldCheck size={21}/><div><strong>Borrador para revisar juntos.</strong><p>El diagrama organiza lo que quedó registrado. Las decisiones y reglas necesitan confirmación del experto.</p></div><div className="flow-actions">
        <a className="button secondary" href={data.obsidianUri}><ExternalLink size={16}/>Abrir en Obsidian</a><button className="button secondary" onClick={() => downloadCanvas(data.canvas)}><Download size={16}/>Descargar Canvas</button>
      </div></div>
      {data.flow.canvasEdited && <p className="flow-warning">Conservamos tus cambios del Canvas en Obsidian. Esta vista muestra el borrador automático actualizado; puedes descargarlo como otro archivo.</p>}
      <FlowExplorer key={data.flow.sourceDigest} flow={data.flow}/>
      <details className="flow-limitations"><summary>Qué falta confirmar en este mapa</summary><ul>{data.flow.warnings.map(w => <li key={w}>{w}</li>)}</ul><p>Los movimientos en UserHelper sirven para explorar y se reinician al salir. El Canvas de Obsidian puede editarse y sus cambios se conservan allí.</p></details>
    </>}
  </div>;
}
