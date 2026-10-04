import { useEffect, useState, useRef } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  MarkerType,
  Position,
  useNodesState,
} from "@xyflow/react";
import type { Node, ReactFlowInstance } from "@xyflow/react";
import {
  ArrowLeft,
  ArrowRight,
  Download,
  ExternalLink,
  GitBranch,
  RefreshCw,
  Search,
  ImageOff,
  Pencil,
  Check,
  ListOrdered,
  Expand,
  X,
} from "lucide-react";
import type {
  FlowResponse,
  ProcessFlow,
  ProcessSummary,
  ProcessNode,
  ProcessImage,
  ProcessMetadata,
} from "../domain/processFlow";
import { flowClock, flowLabels } from "../domain/processFlow";
import {
  getProcessFlow,
  listProcesses,
  saveProcessMetadata,
  getProcessImage,
} from "../services/processFlow";
import "@xyflow/react/dist/style.css";
import "./ProcessMaps.css";
const dateLabel = (value: string) => {
  const d = new Date(value);
  return Number.isFinite(d.getTime())
    ? d.toLocaleString("es-MX", {
        day: "numeric",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "Fecha no disponible";
};
function downloadCanvas(canvas: object) {
  const url = URL.createObjectURL(
    new Blob([JSON.stringify(canvas, null, 2)], { type: "application/json" }),
  );
  const link = document.createElement("a");
  link.href = url;
  link.download = "proceso.canvas";
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function ScreenImage({
  processId,
  frame,
  compact = false,
}: {
  processId: string;
  frame?: ProcessImage;
  compact?: boolean;
}) {
  const [url, setUrl] = useState("");
  const [error, setError] = useState(false);
  const [retry, setRetry] = useState(0);
  const viewer = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const abort = new AbortController();
    let objectUrl = "";
    let active = true;
    setUrl("");
    setError(false);
    if (frame)
      void getProcessImage(processId, frame.id, abort.signal)
        .then((blob) => {
          if (active) {
            objectUrl = URL.createObjectURL(blob);
            setUrl(objectUrl);
          }
        })
        .catch(() => {
          if (active) setError(true);
        });
    return () => {
      active = false;
      abort.abort();
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [processId, frame?.id, retry]);
  if (!frame)
    return (
      <div className={"step-image-empty " + (compact ? "compact" : "")}>
        <ImageOff size={24} />
        <strong>Imagen pendiente</strong>
        {!compact && <p>No se conservó una captura asociada a esta acción.</p>}
      </div>
    );
  if (error)
    return (
      <div
        className={"step-image-empty " + (compact ? "compact" : "")}
        role="status"
      >
        <ImageOff size={24} />
        <strong>No pudimos cargar la imagen</strong>
        {!compact && (
          <p>La captura está registrada. Vuelve a intentar cargarla.</p>
        )}
        <button
          className="text-button nodrag"
          onClick={() => setRetry((v) => v + 1)}
        >
          Reintentar imagen
        </button>
      </div>
    );
  return (
    <figure className={"step-image " + (compact ? "compact" : "")}>
      {url ? (
        <img
          src={url}
          alt={
            "Pantalla capturada a las " +
            flowClock(frame.at) +
            (frame.association === "manual"
              ? ""
              : " ; asociación con la acción pendiente de confirmar")
          }
        />
      ) : (
        <p className="step-image-loading" role="status">
          Cargando imagen…
        </p>
      )}
      {!compact && (
        <>
          <figcaption>
            <span>
              Captura · {flowClock(frame.at)}
              {frame.association === "nearby" ? " · momento cercano" : ""}
            </span>
            <button
              className="text-button"
              disabled={!url}
              onClick={() => viewer.current?.showModal()}
            >
              <Expand size={14} />
              Ampliar imagen
            </button>
          </figcaption>
          <dialog
            ref={viewer}
            className="screen-viewer"
            aria-label={"Captura original de " + flowClock(frame.at)}
            onClick={(e) => {
              if (e.target === e.currentTarget) viewer.current?.close();
            }}
          >
            <div className="screen-viewer-heading">
              <div>
                <strong>Captura · {flowClock(frame.at)}</strong>
                <p>Imagen a tamaño original. Desliza para recorrerla.</p>
              </div>
              <button
                autoFocus
                className="icon-button"
                aria-label="Cerrar imagen"
                onClick={() => viewer.current?.close()}
              >
                <X size={22} />
              </button>
            </div>
            <div
              className="screen-viewer-media"
              tabIndex={0}
              role="region"
              aria-label="Imagen original desplazable"
            >
              {url && (
                <img
                  src={url}
                  alt={"Captura original a las " + flowClock(frame.at)}
                />
              )}
            </div>
          </dialog>
        </>
      )}
    </figure>
  );
}
function Evidence({ flow, node }: { flow: ProcessFlow; node: ProcessNode }) {
  const items = node.evidenceIds.flatMap((id) =>
    flow.evidence.filter((e) => e.id === id),
  );
  return (
    <details className="step-sources">
      <summary>Consultar evidencia de este paso</summary>
      {items.map((e) => (
        <article key={e.id}>
          <strong>
            {e.role === "expert"
              ? "Experto"
              : e.role === "agent"
                ? "Agente"
                : "Observación"}{" "}
            · {e.at === null ? "Sin tiempo" : flowClock(e.at)}
          </strong>
          <p>{e.text}</p>
        </article>
      ))}
    </details>
  );
}
function StepDetails({ flow, node }: { flow: ProcessFlow; node: ProcessNode }) {
  return (
    <div className="step-explanation">
      <h3>Cómo hacerlo</h3>
      {node.instructions.length ? (
        <ol>
          {node.instructions.map((s, i) => (
            <li key={i}>{s}</li>
          ))}
        </ol>
      ) : (
        <p>Instrucciones pendientes de completar con el experto.</p>
      )}
      {node.decision && (
        <>
          <h3>Decisión</h3>
          <p>{node.decision}</p>
        </>
      )}
      <div className="step-reason">
        <h3>Por qué se hace así</h3>
        <p>
          {node.reason ||
            "El experto todavía no explicó el motivo. Pendiente de confirmar."}
        </p>
      </div>
      {!!node.alternatives?.length && (
        <>
          <h3>Alternativas explicadas</h3>
          <ul>
            {node.alternatives.map((a, i) => (
              <li key={i}>
                <strong>{a.condition}:</strong> {a.action}
              </li>
            ))}
          </ul>
        </>
      )}
      {!!node.guardrails.length && (
        <>
          <h3>Cuándo detenerse o consultar</h3>
          <ul>
            {node.guardrails.map((g, i) => (
              <li key={i}>{g}</li>
            ))}
          </ul>
        </>
      )}
      <Evidence flow={flow} node={node} />
    </div>
  );
}
function VisualGuide({ flow }: { flow: ProcessFlow }) {
  const steps = flow.nodes.filter(
    (n) => n.kind === "step" || n.kind === "decision",
  );
  return (
    <div className="process-guide">
      {steps.map((node, i) => (
        <section className="process-step" key={node.id}>
          <header>
            <span className="step-number" aria-label={"Paso " + (i + 1)}>
              {i + 1}
            </span>
            <div>
              <h2>{node.title}</h2>
              <p>
                {node.activityCode
                  ? "Actividad " + node.activityCode + " · "
                  : ""}
                {flowLabels[node.kind]} · {flowClock(node.at)}
              </p>
            </div>
          </header>
          <div className="step-work">
            <ScreenImage processId={flow.id} frame={node.images[0]} />
            <StepDetails flow={flow} node={node} />
          </div>
        </section>
      ))}
    </div>
  );
}
function FlowExplorer({ flow }: { flow: ProcessFlow }) {
  const [selectedId, setSelectedId] = useState(flow.nodes[1]?.id || "start");
  const [instance, setInstance] = useState<ReactFlowInstance | null>(null);
  const [nodes, , onNodesChange] = useNodesState<Node>(
    flow.nodes.map((node) => ({
      id: node.id,
      position: node.position,
      type: "default",
      sourcePosition: Position.Bottom,
      targetPosition: Position.Top,
      className: "process-node " + node.kind,
      ariaLabel: flowLabels[node.kind] + ": " + node.title,
      data: {
        label: (
          <>
            <strong>{node.title}</strong>
            <span className="process-node-meta">
              {flowLabels[node.kind]} · {flowClock(node.at)}
            </span>
            {["step", "decision"].includes(node.kind) && (
              <>
                <ScreenImage
                  processId={flow.id}
                  frame={node.images[0]}
                  compact
                />
                <p className="node-reason">
                  {node.reason || "Motivo pendiente de confirmar"}
                </p>
              </>
            )}
          </>
        ),
      },
    })),
  );
  const selected = flow.nodes.find((n) => n.id === selectedId) || flow.nodes[0];
  const index = flow.nodes.indexOf(selected);
  const choose = (id: string, focus = false) => {
    setSelectedId(id);
    if (focus)
      void instance?.fitView({
        nodes: [{ id }],
        padding: 0.25,
        maxZoom: 1,
        duration: 0,
      });
  };
  const edges = flow.edges.map((e) => ({
    ...e,
    type: "smoothstep",
    markerEnd: { type: MarkerType.ArrowClosed, color: "#668273" },
    style: { stroke: "#82998a", strokeWidth: 1.5 },
    labelStyle: { fontSize: 12, fill: "#445b4d" },
  }));
  return (
    <div className="flow-explorer">
      <section className="flow-board" aria-label="Diagrama de acciones">
        <div className="flow-board-tools">
          <p>Selecciona una acción para consultar cómo y por qué se realiza.</p>
          <button
            className="text-button"
            onClick={() => void instance?.fitView({ padding: 0.15 })}
          >
            Ver todo
          </button>
        </div>
        <div className="flow-canvas">
          <ReactFlow
            nodes={nodes.map((n) => ({ ...n, selected: n.id === selectedId }))}
            edges={edges}
            onNodesChange={(changes) => {
              onNodesChange(changes);
              const c = changes.find((x) => x.type === "select" && x.selected);
              if (c && "id" in c) setSelectedId(c.id);
            }}
            onNodeClick={(_, node) => choose(node.id)}
            onInit={setInstance}
            fitView
            fitViewOptions={{
              nodes: flow.nodes.slice(0, 2).map((n) => ({ id: n.id })),
              padding: 0.15,
              maxZoom: 0.9,
            }}
            minZoom={0.05}
            maxZoom={1.7}
            nodesConnectable={false}
            deleteKeyCode={null}
            ariaLabelConfig={{
              "controls.zoomIn.ariaLabel": "Acercar",
              "controls.zoomOut.ariaLabel": "Alejar",
              "controls.fitView.ariaLabel": "Ajustar diagrama",
              "node.a11yDescription.default":
                "Pulsa Enter para seleccionar. Usa las flechas para mover el nodo.",
            }}
          >
            <Background color="#cdd9cf" gap={24} size={1} />
            <Controls showInteractive={false} />
            <MiniMap pannable zoomable ariaLabel="Vista general del proceso" />
          </ReactFlow>
        </div>
      </section>
      <aside className="flow-inspector" aria-label="Detalle de la acción">
        <div className="flow-step-navigation">
          <button
            className="icon-button"
            aria-label="Paso anterior"
            disabled={index === 0}
            onClick={() => choose(flow.nodes[index - 1].id, true)}
          >
            <ArrowLeft size={18} />
          </button>
          <label className="sr-only" htmlFor="flow-step">
            Seleccionar acción
          </label>
          <select
            id="flow-step"
            value={selectedId}
            onChange={(e) => choose(e.target.value, true)}
          >
            {flow.nodes.map((n, i) => (
              <option key={n.id} value={n.id}>
                {i + 1}. {n.title}
              </option>
            ))}
          </select>
          <button
            className="icon-button"
            aria-label="Paso siguiente"
            disabled={index === flow.nodes.length - 1}
            onClick={() => choose(flow.nodes[index + 1].id, true)}
          >
            <ArrowRight size={18} />
          </button>
        </div>
        <div className="flow-detail" aria-live="polite">
          <h2>{selected.title}</h2>
          {["start", "end"].includes(selected.kind) ? (
            <p>Límite del procedimiento registrado.</p>
          ) : (
            <StepDetails flow={flow} node={selected} />
          )}
        </div>
      </aside>
    </div>
  );
}
function MetadataEditor({
  flow,
  onSaved,
  onClose,
}: {
  flow: ProcessFlow;
  onSaved: (value: FlowResponse) => void;
  onClose: () => void;
}) {
  const [value, setValue] = useState<ProcessMetadata>({
    name: flow.title,
    department: flow.department,
    taskType: flow.taskType,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      onSaved(await saveProcessMetadata(flow.id, value));
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No pudimos guardar");
    } finally {
      setSaving(false);
    }
  };
  return (
    <form className="process-metadata" onSubmit={(e) => void save(e)}>
      <h2>Nombre y clasificación</h2>
      <p>
        El nombre describe la tarea. Las categorías se pueden escribir o elegir
        del catálogo.
      </p>
      <label>
        Nombre del proceso
        <input
          required
          maxLength={120}
          value={value.name}
          onChange={(e) => setValue((v) => ({ ...v, name: e.target.value }))}
        />
      </label>
      <div className="metadata-fields">
        <label>
          Departamento
          <input
            required
            list="process-departments"
            maxLength={80}
            value={value.department}
            onChange={(e) =>
              setValue((v) => ({ ...v, department: e.target.value }))
            }
          />
        </label>
        <label>
          Tipo de tarea
          <input
            required
            list="process-types"
            maxLength={80}
            value={value.taskType}
            onChange={(e) =>
              setValue((v) => ({ ...v, taskType: e.target.value }))
            }
          />
        </label>
      </div>
      <datalist id="process-departments">
        {flow.catalog.departments.map((d) => (
          <option key={d} value={d} />
        ))}
      </datalist>
      <datalist id="process-types">
        {flow.catalog.families.map((f) => (
          <option key={f.id} value={f.name} />
        ))}
      </datalist>
      {error && <p role="alert">{error}</p>}
      <div className="flow-actions">
        <button className="button primary" disabled={saving} type="submit">
          <Check size={16} />
          {saving ? "Guardando…" : "Guardar clasificación"}
        </button>
        <button
          className="button secondary"
          type="button"
          onClick={onClose}
          disabled={saving}
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}
export default function ProcessMaps({
  id,
  onOpen,
}: {
  id: string;
  onOpen: (id: string) => void;
}) {
  const [processes, setProcesses] = useState<ProcessSummary[]>([]);
  const [data, setData] = useState<FlowResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [failed, setFailed] = useState(0);
  const [query, setQuery] = useState("");
  const [family, setFamily] = useState("");
  const [retry, setRetry] = useState(0);
  const [view, setView] = useState<"guide" | "diagram">("guide");
  const [editing, setEditing] = useState(false);
  useEffect(() => {
    const abort = new AbortController();
    const timeout = setTimeout(() => abort.abort(), 20000);
    let live = true;
    setLoading(true);
    setError("");
    setData(null);
    setEditing(false);
    const load = async () => {
      try {
        if (id) {
          const r = await getProcessFlow(id, abort.signal);
          if (live) setData(r);
        } else {
          const r = await listProcesses(abort.signal);
          if (live) {
            setProcesses(r.processes);
            setFailed(r.failures.length);
          }
        }
      } catch (e) {
        if (live)
          setError(
            e instanceof Error && !["AbortError", "TypeError"].includes(e.name)
              ? e.message
              : "El servicio de la bóveda no respondió. Comprueba que esté activo y vuelve a intentarlo.",
          );
      } finally {
        clearTimeout(timeout);
        if (live) setLoading(false);
      }
    };
    void load();
    return () => {
      live = false;
      abort.abort();
      clearTimeout(timeout);
    };
  }, [id, retry]);
  const filtered = processes.filter(
    (p) =>
      (p.title + " " + p.department + " " + p.taskType)
        .toLowerCase()
        .includes(query.toLowerCase()) &&
      (!family || p.taskType === family),
  );
  const count =
    data?.flow.nodes.filter((n) => n.kind === "step" || n.kind === "decision")
      .length || 0;
  return (
    <div className="process-maps-page">
      {id && (
        <button className="text-button flow-back" onClick={() => onOpen("")}>
          <ArrowLeft size={16} />
          Todos los procesos
        </button>
      )}
      <div className="page-heading">
        <div>
          <h1>{data ? data.flow.title : "Los procesos, paso a paso."}</h1>
          <p>
            {data
              ? data.flow.objective ||
                "Acciones, decisiones y los motivos del experto."
              : "Encuentra una tarea y consulta cómo ejecutarla, con sus imágenes y criterios."}
          </p>
        </div>
        <button
          className="button secondary"
          disabled={loading}
          onClick={() => setRetry((v) => v + 1)}
        >
          <RefreshCw size={16} />
          Actualizar
        </button>
      </div>
      {loading && (
        <p className="flow-loading" role="status">
          Preparando tus procesos…
        </p>
      )}
      {error && (
        <div className="flow-error" role="alert">
          <h2>No pudimos abrir los procesos</h2>
          <p>{error}</p>
          <button
            className="button secondary"
            onClick={() => setRetry((v) => v + 1)}
          >
            Volver a intentar
          </button>
        </div>
      )}
      {!loading && !error && !id && (
        <>
          <div className="process-filters">
            <label className="flow-search">
              <Search size={18} />
              <span className="sr-only">Buscar proceso</span>
              <input
                placeholder="Buscar por proceso, departamento o tarea…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </label>
            <label>
              Tipo de tarea
              <select
                value={family}
                onChange={(e) => setFamily(e.target.value)}
              >
                <option value="">Todos los tipos</option>
                {[...new Set(processes.map((p) => p.taskType))]
                  .sort()
                  .map((t) => (
                    <option key={t}>{t}</option>
                  ))}
              </select>
            </label>
          </div>
          {failed > 0 && (
            <p role="status" className="flow-warning">
              {failed} registros necesitan revisión. Sus fuentes se conservan.
            </p>
          )}
          <div className="flow-list">
            {filtered.map((p) => (
              <button
                className="flow-list-row"
                onClick={() => onOpen(p.id)}
                key={p.id}
              >
                <span className="flow-list-icon">
                  <GitBranch size={24} />
                </span>
                <span className="flow-list-title">
                  <strong>{p.title}</strong>
                  <small>
                    {p.department} · {p.taskType}
                  </small>
                  <small>{dateLabel(p.startedAt)}</small>
                </span>
                <span className="flow-list-meta">
                  {p.steps} acciones · {p.imageCount} con imagen
                  <span>
                    {p.steps ? "Por revisar" : "Sin tarea identificada"}
                  </span>
                </span>
                <ArrowRight size={19} />
              </button>
            ))}
          </div>
          {!filtered.length && (
            <div className="flow-empty">
              <h2>
                {processes.length
                  ? "No encontramos ese proceso"
                  : "Aún no hay procesos guardados"}
              </h2>
              <p>
                {processes.length
                  ? "Prueba otra palabra o cambia el filtro."
                  : "Comparte una tarea con tu aprendiz para conservar sus acciones y motivos."}
              </p>
            </div>
          )}
        </>
      )}
      {!loading && !error && data && (
        <>
          <div className="process-classification">
            <span>{data.flow.department}</span>
            <span>{data.flow.taskType}</span>
            <button
              className="text-button"
              onClick={() => setEditing((v) => !v)}
            >
              <Pencil size={15} />
              Editar nombre y categoría
            </button>
          </div>
          {editing && (
            <MetadataEditor
              key={data.flow.sourceDigest}
              flow={data.flow}
              onSaved={setData}
              onClose={() => setEditing(false)}
            />
          )}
          <div className="flow-context">
            <p>
              <strong>Procedimiento por revisar.</strong> Confirma las acciones
              y sus motivos con el experto.
            </p>
            <div className="flow-actions">
              <a className="button secondary" href={data.obsidianUri}>
                <ExternalLink size={16} />
                Abrir en Obsidian
              </a>
              <button
                className="button secondary"
                onClick={() => downloadCanvas(data.canvas)}
              >
                <Download size={16} />
                Descargar Canvas
              </button>
            </div>
          </div>
          {(data.flow.canvasEdited || data.flow.catalogEdited) && (
            <p className="flow-warning">
              Conservamos las ediciones manuales de Obsidian. Esta vista muestra
              la extracción actualizada.
            </p>
          )}
          {count > 0 ? (
            <>
              <div
                className="process-view-switch"
                aria-label="Vista del proceso"
              >
                <button
                  aria-pressed={view === "guide"}
                  onClick={() => setView("guide")}
                >
                  <ListOrdered size={17} />
                  Guía visual
                </button>
                <button
                  aria-pressed={view === "diagram"}
                  onClick={() => setView("diagram")}
                >
                  <GitBranch size={17} />
                  Diagrama
                </button>
                <span>{count} acciones</span>
              </div>
              {view === "guide" ? (
                <VisualGuide flow={data.flow} />
              ) : (
                <FlowExplorer key={data.flow.sourceDigest} flow={data.flow} />
              )}
            </>
          ) : (
            <div className="flow-empty">
              <h2>Este registro no describe una tarea ejecutada</h2>
              <p>
                La transcripción se conserva como evidencia. No convertimos
                saludos ni preguntas del agente en acciones.
              </p>
            </div>
          )}
          <details className="flow-limitations">
            <summary>Qué falta confirmar</summary>
            <ul>
              {data.flow.warnings.map((w) => (
                <li key={w}>{w}</li>
              ))}
            </ul>
            <p>
              Los cambios de posición en UserHelper son temporales. Las
              ediciones hechas directamente en Obsidian se conservan allí.
            </p>
          </details>
        </>
      )}
    </div>
  );
}
