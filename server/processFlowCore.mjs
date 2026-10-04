// Pure process derivation, shared by the local server and the browser vault.
import { sha256 } from '@noble/hashes/sha2.js';
import { bytesToHex, utf8ToBytes } from '@noble/hashes/utils.js';
import { normalizeProcess, localProcess } from './processExtraction.mjs';
import { PROCESS_CATALOG } from './processCatalog.mjs';
const hash = (text) => bytesToHex(sha256(utf8ToBytes(text)));
const clean = (text) =>
  String(text || "")
    .replace(/[\u0000-\u0008\u000b-\u001f\u007f]/g, "")
    .trim();
const seconds = (value) =>
  value.split(":").reduce((total, part) => total * 60 + Number(part), 0);
export const flowClock = (at) =>
  `${String(Math.floor(at / 60)).padStart(2, "0")}:${String(Math.floor(at % 60)).padStart(2, "0")}`;

export function parseFlowEvidence(transcript, events = "") {
  const evidence = [];
  const counts = new Map();
  const sourceId = (prefix, text) => {
    const base = `${prefix}-${hash(text).slice(0, 16)}`;
    const count = (counts.get(base) || 0) + 1;
    counts.set(base, count);
    return count === 1 ? base : `${base}-${count}`;
  };
  const body = transcript.includes("## Conversación")
    ? transcript.split("## Conversación")[1].split("## Enlaces")[0]
    : "";
  const turns =
    /\*\*\[(\d{2,}:\d{2})\] (Persona|Agente):\*\* ([\s\S]*?)(?=\n\*\*\[|\n## |$)/g;
  for (const match of body.matchAll(turns)) {
    const text = clean(match[3].replace(/^> \[.*$/gm, ""));
    if (text)
      evidence.push({
        id: sourceId("turn", match[1] + match[2] + text),
        source: "transcript",
        role: match[2] === "Persona" ? "expert" : "agent",
        at: seconds(match[1]),
        text,
        file: "transcripcion.md",
      });
  }
  for (const match of events.matchAll(
    /^- `(\d{2,}:\d{2}(?::\d{2})?)` \*\*(screen|question|answer|guardrail|decision|note)\*\* — (.*)$/gm,
  )) {
    // Legacy events without a relative time have HH:MM:SS wall clocks; do not pretend they align.
    const timed = match[1].split(":").length === 2;
    evidence.push({
      id: sourceId("event", match[0]),
      source: "events",
      role: "observation",
      kind: match[2],
      at: timed ? seconds(match[1]) : null,
      text: clean(match[3].replace(/ \^[A-Za-z0-9-]+$/, "")),
      file: "eventos.md",
    });
  }
  return evidence.sort(
    (a, b) =>
      (a.at ?? Number.MAX_SAFE_INTEGER) - (b.at ?? Number.MAX_SAFE_INTEGER),
  );
}

export function buildProcessFlow({
  id,
  folder,
  transcript,
  events = "",
  extraction = null,
  captures = [],
  metadata = {},
}) {
  const evidence = parseFlowEvidence(transcript, events);
  const process =
    normalizeProcess(extraction, evidence) || localProcess(evidence);
  const sourceDigest = hash(
    JSON.stringify({ transcript, events, extraction, captures, metadata }),
  );
  const warnings = [
    "Borrador del procedimiento: confirma acciones, criterios y orden con el experto. Las citas se conservan como respaldo.",
  ];
  if (process.source === "local-draft")
    warnings.push(
      "Falta el análisis estructurado: se muestran solo acciones explícitas detectadas localmente.",
    );
  if (process.rejected)
    warnings.push(
      `${process.rejected} pasos del análisis se omitieron porque no tenían una cita verificable de la persona.`,
    );
  if (!process.steps.length)
    warnings.push(
      "No hay una tarea operativa identificada; este registro no se presenta como un procedimiento ejecutable.",
    );
  const nodes = [
    {
      id: "start",
      kind: "start",
      title: "Inicio del proceso",
      at: 0,
      evidenceIds: [],
      reason: "",
      instructions: [],
      decision: "",
      guardrails: [],
      images: [],
      position: { x: 0, y: 0 },
    },
  ];
  const edges = [];
  let previous = "start";
  const usedIds = new Map();
  process.steps.forEach((step, index) => {
    const base = `step-${hash(step.action + step.evidenceIds.join()).slice(0, 16)}`;
    const n = (usedIds.get(base) || 0) + 1;
    usedIds.set(base, n);
    const nodeId = n === 1 ? base : base + "-" + n;
    const selectedImage = metadata.stepImages?.[nodeId];
    const nearest = captures
      .filter((c) => typeof c.at === "number" && Math.abs(c.at - step.at) <= 30)
      .sort((a, b) => Math.abs(a.at - step.at) - Math.abs(b.at - step.at))[0];
    const frame =
      (selectedImage && captures.find((c) => c.id === selectedImage)) ||
      nearest;
    const images = frame
      ? [{ ...frame, association: selectedImage ? "manual" : "nearby" }]
      : [];
    const node = {
      id: nodeId,
      kind: step.decision ? "decision" : "step",
      title: step.action,
      at: step.at,
      evidenceIds: step.evidenceIds,
      reason: step.rationale,
      instructions: step.instructions,
      decision: step.decision,
      guardrails: step.guardrails,
      alternatives: step.alternatives,
      activityCode: step.activityCode || "",
      images,
      position: { x: 0, y: (index + 1) * 460 },
    };
    nodes.push(node);
    edges.push({
      id: `edge-${index}`,
      source: previous,
      target: nodeId,
      label: "Siguiente acción",
      kind: "sequence",
    });
    previous = nodeId;
  });
  if (process.steps.length) {
    nodes.push({
      id: "end",
      kind: "end",
      title: "Fin del proceso registrado",
      at: process.steps.at(-1).at,
      evidenceIds: [],
      reason: "",
      instructions: [],
      decision: "",
      guardrails: [],
      images: [],
      position: { x: 0, y: (process.steps.length + 1) * 460 },
    });
    edges.push({
      id: "edge-end",
      source: previous,
      target: "end",
      label: "Fin del registro",
      kind: "sequence",
    });
  }
  const actions = nodes.filter((n) => !["start", "end"].includes(n.kind));
  if (actions.some((n) => !n.images.length))
    warnings.push(
      "Hay pasos sin imagen guardada. No se han recreado capturas ni asociado imágenes lejanas.",
    );
  if (actions.some((n) => !n.reason))
    warnings.push(
      "Hay motivos no expresados por el experto. Aparecen como pendientes, sin inventar justificaciones.",
    );
  warnings.push(
    "Las imágenes próximas en el tiempo ayudan a revisar el paso; su asociación debe confirmarse.",
  );
  const name = clean(metadata.name || process.name).slice(0, 120);
  return {
    version: 2,
    generatorVersion: 5,
    id,
    folder,
    title: name,
    name,
    department: clean(metadata.department || process.department).slice(0, 80),
    taskType: clean(metadata.taskType || process.taskType).slice(0, 80),
    classificationStatus:
      metadata.name || metadata.department || metadata.taskType
        ? "edited"
        : "proposed",
    objective: process.objective,
    source: process.source,
    status: "draft",
    sourceDigest,
    generatedAt: new Date().toISOString(),
    warnings,
    nodes,
    edges,
    evidence,
    captures,
    catalog: PROCESS_CATALOG,
  };
}

const mdSafe = (text) => String(text).replace(/([\\`*_{}\[\]<>#|!])/g, "\\$1");
const alternativesMarkdown = (node) =>
  node.alternatives?.length
    ? "**Alternativas explicadas**\n" +
      node.alternatives
        .map((a) => "- " + mdSafe(a.condition) + ": " + mdSafe(a.action))
        .join("\n") +
      "\n\n"
    : "";
const quoteYaml = (value) => JSON.stringify(String(value || ""));
export function flowToCanvas(flow) {
  const nodes = [];
  const color = { start: "4", end: "4", decision: "3", step: "4" };
  for (const node of flow.nodes) {
    const y = node.position.y;
    const details =
      node.instructions?.map((s, i) => `${i + 1}. ${mdSafe(s)}`).join("\n") ||
      "Sin instrucciones adicionales registradas.";
    nodes.push({
      id: node.id,
      type: "text",
      x: 0,
      y,
      width: 400,
      height: 350,
      color: color[node.kind] || "4",
      text: `## ${mdSafe(node.title)}\n\n${node.activityCode ? "Actividad " + mdSafe(node.activityCode) + " · " : ""}${flowClock(node.at)}\n\n${details}${node.decision ? "\n\n**Decisión:** " + mdSafe(node.decision) : ""}`,
    });
    if (["start", "end"].includes(node.kind)) continue;
    if (node.images?.length) {
      const frame = node.images[0];
      nodes.push({
        id: `image-${node.id}`,
        type: "file",
        file: `Sesiones/${flow.folder}/${frame.file}`,
        x: 430,
        y,
        width: 480,
        height: 300,
      });
    } else
      nodes.push({
        id: `image-${node.id}`,
        type: "text",
        text: "### Imagen pendiente\n\nNo se conservó una captura asociada a esta acción.",
        x: 430,
        y,
        width: 480,
        height: 300,
      });
    nodes.push({
      id: `why-${node.id}`,
      type: "text",
      x: 940,
      y,
      width: 400,
      height: 350,
      color: "5",
      text: `## Por qué se hace así\n\n${mdSafe(node.reason || "Motivo pendiente de confirmar con el experto.")}\n\n${alternativesMarkdown(node)}${node.images?.length ? "Captura de " + flowClock(node.images[0].at) + " · asociación por revisar.\n\n" : ""}${node.guardrails?.length ? "**Límites**\n" + node.guardrails.map((r) => "- " + mdSafe(r)).join("\n") + "\n\n" : ""}${node.evidenceIds.map((id) => `[[Sesiones/${flow.folder}/evidencia-flujo#^${id}|Ver fuente]]`).join(" · ")}`,
    });
  }
  return {
    nodes,
    edges: flow.edges.map((e) => ({
      id: e.id,
      fromNode: e.source,
      toNode: e.target,
      fromSide: "bottom",
      toSide: "top",
      toEnd: "arrow",
      label: e.label,
    })),
  };
}
export function flowEvidenceMarkdown(flow) {
  return (
    `# Evidencia de ${mdSafe(flow.title)}\n\nRespaldo de acciones y motivos. La conversación no constituye el recorrido del proceso.\n\n[[Sesiones/${flow.folder}/transcripcion|Transcripción completa]]\n\n` +
    flow.evidence
      .map(
        (e) =>
          `### ${e.at === null ? "Sin tiempo relativo" : flowClock(e.at)} · ${e.role === "expert" ? "Persona" : e.role === "agent" ? "Agente" : "Observación"}\n\n${mdSafe(e.text)}\n\n^${e.id}\n`,
      )
      .join("\n")
  );
}
export function flowMarkdown(flow) {
  return (
    `---\ntipo: proceso\nnombre: ${quoteYaml(flow.title)}\ndepartamento: ${quoteYaml(flow.department)}\ntipo_tarea: ${quoteYaml(flow.taskType)}\nestado: borrador\nclasificacion: ${quoteYaml(flow.classificationStatus)}\nconversacion: ${quoteYaml(flow.id)}\n---\n\n# ${mdSafe(flow.title)}\n\n${mdSafe(flow.objective || "Procedimiento observado; pendiente de revisión.")}\n\n[[Sesiones/${flow.folder}/flujo.canvas|Abrir diagrama]] · [[Sesiones/${flow.folder}/evidencia-flujo|Evidencia]]\n\n` +
    flow.nodes
      .filter((n) => !["start", "end"].includes(n.kind))
      .map(
        (n, i) =>
          `## ${i + 1}. ${mdSafe(n.title)}\n\n${n.activityCode ? "Actividad " + mdSafe(n.activityCode) + " · " : ""}${flowClock(n.at)}\n\n${n.images?.length ? `![[Sesiones/${flow.folder}/${n.images[0].file}]]` : "**Imagen pendiente:** no se guardó una captura de este paso."}\n\n### Cómo hacerlo\n\n${n.instructions.map((s, j) => `${j + 1}. ${mdSafe(s)}`).join("\n") || "Instrucciones pendientes."}\n\n${n.decision ? "### Decisión\n\n" + mdSafe(n.decision) + "\n\n" : ""}### Por qué se hace así\n\n${mdSafe(n.reason || "Motivo pendiente de confirmar con el experto.")}\n\n${alternativesMarkdown(n)}${n.guardrails?.length ? "### Límites\n\n" + n.guardrails.map((s) => "- " + mdSafe(s)).join("\n") + "\n\n" : ""}${n.evidenceIds.map((id) => `[[Sesiones/${flow.folder}/evidencia-flujo#^${id}|Fuente]]`).join(" · ")}\n`,
      )
      .join("\n") +
    "\n## Pendiente de revisar\n\n" +
    flow.warnings.map((w) => "- " + w).join("\n") +
    "\n"
  );
}
