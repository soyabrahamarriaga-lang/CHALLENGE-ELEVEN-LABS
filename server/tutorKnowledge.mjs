import { createHash } from "node:crypto";
import { mkdir, readFile, readdir, rename, stat, writeFile } from "node:fs/promises";
import { join, relative, resolve } from "node:path";

// Obsidian vault → knowledge base of the ElevenLabs tutor agent (ADR-0016).
// The vault stays the source of truth; ElevenLabs gets one compiled text document that is
// replaced whenever the process notes change. Only the tutor's knowledge_base is modified.

const API = "https://api.elevenlabs.io";
const DOC_NAME = "UserHelper · Procesos del experto (bóveda Obsidian)";
const STATE = ["Procesos", "tutor-conocimiento.json"];
const MAX_CHARS = 250_000;

function frontmatter(text) {
  const block = text.match(/^---\n([\s\S]*?)\n---\n?/);
  const fields = {};
  for (const line of block ? block[1].split("\n") : []) {
    const index = line.indexOf(":");
    if (index > 0) fields[line.slice(0, index).trim()] = line.slice(index + 1).trim().replace(/^"|"$/g, "");
  }
  return { fields, body: block ? text.slice(block[0].length) : text };
}

// Keeps what a learner needs (steps, decisions, reasons, limits); drops images, source links
// and the editor's review checklist.
export function cleanProcessNote(body) {
  const pending = body.indexOf("\n## Pendiente de revisar");
  const lines = (pending >= 0 ? body.slice(0, pending) : body).split("\n");
  const kept = [];
  for (const line of lines) {
    const trimmed = line.trim();
    if (/^!\[\[.*\]\]$/.test(trimmed)) continue;
    if (/^\*\*Imagen pendiente:\*\*/.test(trimmed)) continue;
    // Lines made only of wiki links ("Fuente", "Abrir diagrama · Evidencia").
    if (trimmed && !trimmed.replace(/\[\[[^\]]*\]\]/g, "").replace(/[·\s]/g, "")) continue;
    kept.push(line.replace(/\[\[([^\]|]*\|)?([^\]]*)\]\]/g, "$2"));
  }
  return kept.join("\n").replace(/\n{3,}/g, "\n\n").trim();
}

async function walk(dir) {
  const out = [];
  for (const entry of await readdir(dir, { withFileTypes: true }).catch(() => [])) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...(await walk(path)));
    else if (entry.isFile() && entry.name.endsWith(".md")) out.push(path);
  }
  return out;
}

export async function compileKnowledge(root) {
  const base = resolve(root);
  const byConversation = new Map();
  for (const file of await walk(join(base, "Procesos"))) {
    const { fields, body } = frontmatter(await readFile(file, "utf8"));
    if (fields.tipo !== "proceso" || !fields.nombre) continue;
    if (/^registro sin proceso/i.test(fields.nombre) || /ejemplo_sintetico/.test(fields.conversacion || "")) continue;
    const key = fields.conversacion || relative(base, file);
    const { mtimeMs } = await stat(file);
    const previous = byConversation.get(key);
    // The same session can be filed under two departments while it is reclassified; keep the newest.
    if (!previous || mtimeMs > previous.mtimeMs) byConversation.set(key, { fields, body, mtimeMs });
  }
  const processes = [...byConversation.values()].sort((a, b) => a.fields.nombre.localeCompare(b.fields.nombre, "es"));
  const sections = processes.map(({ fields, body }) => {
    const where = [fields.departamento, fields.tipo_tarea].filter(Boolean).join(" · ");
    return `${cleanProcessNote(body)}\n\n_Área: ${where || "sin clasificar"} · Estado: ${fields.estado || "borrador"} · Sesión: ${fields.conversacion || "-"}_`;
  });
  let text =
    "# Conocimiento del experto: procesos documentados en UserHelper\n\n" +
    "Fuente: bóveda Obsidian del equipo. Cada proceso se aprendió observando al experto y preguntándole por sus razones. " +
    "Las reglas, límites y excepciones son las palabras del experto; lo marcado como pendiente aún no está confirmado y no debe enseñarse como regla.\n\n" +
    sections.join("\n\n---\n\n");
  if (text.length > MAX_CHARS) text = text.slice(0, MAX_CHARS) + "\n\n[Contenido recortado por tamaño]";
  return {
    text,
    processes: processes.map((p) => p.fields.nombre),
    digest: createHash("sha256").update(text).digest("hex"),
  };
}

async function readState(root) {
  try {
    return JSON.parse(await readFile(join(resolve(root), ...STATE), "utf8"));
  } catch {
    return null;
  }
}

async function writeState(root, state) {
  const file = join(resolve(root), ...STATE);
  await mkdir(resolve(file, ".."), { recursive: true });
  const tmp = `${file}.${process.pid}.tmp`;
  await writeFile(tmp, JSON.stringify(state, null, 2) + "\n", "utf8");
  await rename(tmp, file);
}

async function call(fetchImpl, apiKey, method, path, body) {
  const response = await fetchImpl(API + path, {
    method,
    headers: { "xi-api-key": apiKey, ...(body ? { "Content-Type": "application/json" } : {}) },
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(20000),
  });
  if (!response.ok) throw Object.assign(new Error(`elevenlabs-${method}-${response.status}`), { status: response.status });
  return response.status === 204 ? null : response.json().catch(() => null);
}

// Uploads the compiled knowledge when it changed and attaches it to the tutor, replacing the
// previous UserHelper document. Verifies the tutor's prompt is untouched after the update.
export async function syncTutorKnowledge(
  { apiKey, tutorAgentId, vaultPath },
  { fetch: fetchImpl = fetch, now = () => new Date() } = {},
) {
  if (!apiKey || !/^[A-Za-z0-9_-]{1,100}$/.test(tutorAgentId || "") || !vaultPath) return { status: "disabled" };
  const knowledge = await compileKnowledge(vaultPath);
  if (!knowledge.processes.length) return { status: "empty" };
  const state = await readState(vaultPath);
  const agentPath = `/v1/convai/agents/${encodeURIComponent(tutorAgentId)}`;
  const agent = await call(fetchImpl, apiKey, "GET", agentPath);
  const prompt = agent?.conversation_config?.agent?.prompt;
  if (!prompt) throw new Error("tutor-invalid-response");
  const attached = (prompt.knowledge_base || []).some((doc) => doc.id === state?.docId);
  if (state?.agentId === tutorAgentId && state.digest === knowledge.digest && attached)
    return { status: "unchanged", docId: state.docId, processes: knowledge.processes };

  const created = await call(fetchImpl, apiKey, "POST", "/v1/convai/knowledge-base/text", {
    text: knowledge.text,
    name: DOC_NAME,
  });
  if (!created?.id) throw new Error("tutor-kb-create-failed");
  const others = (prompt.knowledge_base || []).filter((doc) => doc.id !== state?.docId && doc.name !== DOC_NAME);
  await call(fetchImpl, apiKey, "PATCH", agentPath, {
    conversation_config: {
      agent: {
        prompt: {
          knowledge_base: [...others, { type: "text", id: created.id, name: DOC_NAME, usage_mode: "auto" }],
        },
      },
    },
  });
  const after = (await call(fetchImpl, apiKey, "GET", agentPath))?.conversation_config?.agent?.prompt;
  if (!after?.knowledge_base?.some((doc) => doc.id === created.id))
    throw new Error("tutor-kb-not-attached");
  if ((after.prompt || "") !== (prompt.prompt || "") || after.llm !== prompt.llm)
    throw new Error("tutor-prompt-changed");
  // Old documents are deleted only after the new one is attached; a failure here is harmless.
  const stale = (prompt.knowledge_base || []).filter((doc) => doc.name === DOC_NAME || doc.id === state?.docId);
  for (const doc of stale)
    if (doc.id !== created.id)
      await call(fetchImpl, apiKey, "DELETE", `/v1/convai/knowledge-base/${encodeURIComponent(doc.id)}`).catch(() => {});
  await writeState(vaultPath, {
    agentId: tutorAgentId,
    docId: created.id,
    digest: knowledge.digest,
    actualizado: now().toISOString(),
    procesos: knowledge.processes,
  });
  return { status: "updated", docId: created.id, processes: knowledge.processes };
}
