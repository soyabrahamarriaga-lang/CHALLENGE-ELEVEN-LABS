import { ensureProcessFlow, flowToCanvas } from "./processFlow.mjs";
import { createHmac, timingSafeEqual } from "node:crypto";
import { mkdir, readFile, readdir, rename, writeFile, appendFile, stat } from "node:fs/promises";
import { isAbsolute, resolve, sep, basename } from "node:path";

// The vault is a private Obsidian folder outside this public repository.
// This module only writes Markdown inside it; Obsidian is a viewer, not a dependency.

const ID = /^[A-Za-z0-9_-]{1,80}$/;
const NOTE_NAMES = new Set(["work-map", "debrief", "teach-back"]);
const EVENT_KINDS = new Set(["screen", "question", "answer", "guardrail", "decision", "note"]);

export function readVaultConfig(env = process.env) {
  const path = env.VAULT_PATH || "";
  return {
    path,
    origin: env.APP_ORIGIN || "http://127.0.0.1:5173",
    apiKey: (env.ELEVENLABS_API_KEY || "").trim(),
    agentId: (env.ELEVENLABS_AGENT_ID || "").trim(),
    syncMinutes: Number(env.VAULT_SYNC_MINUTES || 2),
    apiBase: env.ELEVENLABS_API_BASE || "https://api.elevenlabs.io",
    webhookSecret: env.ELEVENLABS_WEBHOOK_SECRET || "",
    ready: Boolean(path && isAbsolute(path)),
  };
}

// Variable names only, never values, so startup logs are safe to share.
export function vaultProblems(config) {
  const problems = [];
  if (!config.path) problems.push("VAULT_PATH vacío: bóveda desactivada");
  else if (!isAbsolute(config.path)) problems.push("VAULT_PATH debe ser una ruta absoluta");
  if (!config.apiKey) problems.push("ELEVENLABS_API_KEY vacío: no se pueden importar conversaciones");
  if (!config.agentId) problems.push("ELEVENLABS_AGENT_ID vacío: sincronización automática desactivada");
  if (!config.webhookSecret) problems.push("ELEVENLABS_WEBHOOK_SECRET vacío: webhook desactivado (opcional)");
  return problems;
}

function yamlValue(value) {
  if (value === null || value === undefined) return '""';
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (Array.isArray(value)) return "[" + value.map(yamlValue).join(", ") + "]";
  return JSON.stringify(String(value));
}

export function frontmatter(fields) {
  const lines = Object.entries(fields).map(([key, value]) => `${key}: ${yamlValue(value)}`);
  return `---\n${lines.join("\n")}\n---\n`;
}

export function clock(seconds) {
  const total = Math.max(0, Math.floor(Number(seconds) || 0));
  const m = String(Math.floor(total / 60)).padStart(2, "0");
  const s = String(total % 60).padStart(2, "0");
  return `${m}:${s}`;
}

// Expressive TTS tags ("[slow]", "[laughs]") are lowercase; our own markers ("[PANTALLA 00:45]") are not.
export function stripVoiceTags(text) {
  return String(text ?? "").replace(/\[[a-z][a-z \-]{0,30}\]\s*/g, "");
}

function clean(text, max = 2000) {
  return String(text ?? "")
    .replace(/[\u0000-\u0008\u000b-\u001f\u007f]/g, "")
    .slice(0, max);
}

export function sessionFolder(conversation) {
  const startedAt = conversation?.metadata?.start_time_unix_secs;
  const day = startedAt ? new Date(startedAt * 1000).toISOString().slice(0, 10) : "sin-fecha";
  return `${day}-${conversation.conversation_id}`;
}

// ElevenLabs conversation (GET /v1/convai/conversations/{id} or webhook `data`) → Markdown note.
export function transcriptToMarkdown(conversation) {
  const meta = conversation.metadata || {};
  const analysis = conversation.analysis || {};
  const head = frontmatter({
    tipo: "transcripcion",
    conversacion: conversation.conversation_id,
    agente: conversation.agent_id || "",
    estado: conversation.status || "",
    inicio: meta.start_time_unix_secs
      ? new Date(meta.start_time_unix_secs * 1000).toISOString()
      : "",
    duracion_s: meta.call_duration_secs ?? 0,
    resultado: analysis.call_successful || "",
    tags: ["userhelper", "transcripcion"],
  });
  const body = [`# Transcripción ${conversation.conversation_id}`, ""];
  if (analysis.transcript_summary)
    body.push("## Resumen", "", clean(analysis.transcript_summary, 4000), "");
  body.push("## Conversación", "");
  // ElevenLabs may list a long spoken turn after later ones; order by time, keeping ties stable.
  const turns = (conversation.transcript || [])
    .map((turn, index) => ({ turn, index }))
    .sort((a, b) => (a.turn.time_in_call_secs ?? 0) - (b.turn.time_in_call_secs ?? 0) || a.index - b.index)
    .map(({ turn }) => turn);
  for (const turn of turns) {
    const at = clock(turn.time_in_call_secs);
    const text = clean(stripVoiceTags(turn.message));
    if (/^\[PANTALLA \d{2,}:\d{2}\]$/.test(text)) body.push(`**[${at}] Captura enviada al agente** ${text}`, "");
    else if (text) body.push(`**[${at}] ${turn.role === "agent" ? "Agente" : "Persona"}:** ${text}`, "");
    // Screen text arrives as contextual updates every second; it lives in eventos.md, not here.
    for (const call of turn.tool_calls || [])
      if (call.tool_name !== "contextual_update")
        body.push(`> [${at}] herramienta \`${clean(call.tool_name, 80)}\``, "");
  }
  body.push("## Enlaces", "", "- [[eventos]] · [[work-map]]", "");
  return head + "\n" + body.join("\n");
}

export function eventLine(event, receivedAt = new Date()) {
  const at =
    typeof event.at === "number" ? clock(event.at) : receivedAt.toISOString().slice(11, 19);
  const ref = event.ref ? ` ^${clean(event.ref, 40).replace(/[^A-Za-z0-9-]/g, "")}` : "";
  return `- \`${at}\` **${event.kind}** — ${clean(event.text, 1000).replace(/\n/g, " ")}${ref}\n`;
}

// Header format `t=<unix secs>,v0=<hex HMAC-SHA256 of "t.body">`, 30 min tolerance.
export function verifyWebhookSignature(rawBody, header, secret, nowSecs = Math.floor(Date.now() / 1000)) {
  if (!secret || typeof header !== "string") return false;
  const parts = Object.fromEntries(
    header.split(",").map((part) => {
      const index = part.indexOf("=");
      return [part.slice(0, index).trim(), part.slice(index + 1).trim()];
    }),
  );
  const timestamp = Number(parts.t);
  if (!Number.isFinite(timestamp) || Math.abs(nowSecs - timestamp) > 30 * 60 || !parts.v0)
    return false;
  const expected = createHmac("sha256", secret).update(`${parts.t}.${rawBody}`).digest("hex");
  const given = Buffer.from(parts.v0, "utf8");
  const wanted = Buffer.from(expected, "utf8");
  return given.length === wanted.length && timingSafeEqual(given, wanted);
}

export async function fetchConversation(config, conversationId, fetchImpl = fetch) {
  const response = await fetchImpl(
    `${config.apiBase}/v1/convai/conversations/${encodeURIComponent(conversationId)}`,
    { headers: { "xi-api-key": config.apiKey }, signal: AbortSignal.timeout(15000) },
  );
  if (!response.ok)
    throw Object.assign(new Error("elevenlabs-" + response.status), { status: response.status });
  return response.json();
}

// Copies every finished conversation of the configured agent that the vault does not have yet.
export async function syncAgentConversations(config, vault, { fetch: fetchImpl = fetch, maxPages = 5 } = {}) {
  if (!config.apiKey || !ID.test(config.agentId || "")) throw new Error("agent-not-configured");
  const result = { imported: [], skipped: 0, pending: 0 };
  let cursor = "";
  for (let page = 0; page < maxPages; page++) {
    const query = new URLSearchParams({ agent_id: config.agentId, page_size: "100" });
    if (cursor) query.set("cursor", cursor);
    const response = await fetchImpl(`${config.apiBase}/v1/convai/conversations?${query}`, {
      headers: { "xi-api-key": config.apiKey },
      signal: AbortSignal.timeout(15000),
    });
    if (!response.ok)
      throw Object.assign(new Error("elevenlabs-" + response.status), { status: response.status });
    const body = await response.json();
    for (const item of body.conversations || []) {
      if (!ID.test(item.conversation_id || "")) continue;
      if (!["done", "failed"].includes(item.status)) result.pending++;
      else if (await vault.hasTranscript(item.conversation_id)) result.skipped++;
      else {
        const saved = await vault.saveConversation(await fetchConversation(config, item.conversation_id, fetchImpl));
        result.imported.push(saved.file);
      }
    }
    if (!body.has_more || !body.next_cursor) break;
    cursor = body.next_cursor;
  }
  return result;
}

export function createVault(config) {
  const root = resolve(config.path);
  const inside = (...parts) => {
    const target = resolve(root, ...parts);
    if (target !== root && !target.startsWith(root + sep)) throw new Error("path-outside-vault");
    return target;
  };
  async function writeAtomic(file, content) {
    await mkdir(resolve(file, ".."), { recursive: true });
    const tmp = `${file}.${process.pid}.${Date.now()}.tmp`;
    await writeFile(tmp, content, "utf8");
    await rename(tmp, file);
  }
  async function findFolder(conversationId) {
    const sessions = inside("Sesiones");
    await mkdir(sessions, { recursive: true });
    return (await readdir(sessions)).find((name) => name.endsWith(`-${conversationId}`)) || null;
  }
  async function ensureFolder(conversationId) {
    if (!ID.test(conversationId)) throw new Error("invalid-id");
    const existing = await findFolder(conversationId);
    if (existing) return existing;
    const folder = `${new Date().toISOString().slice(0, 10)}-${conversationId}`;
    await mkdir(inside("Sesiones", folder), { recursive: true });
    return folder;
  }
  return {
    root,
    async hasTranscript(conversationId) {
      const folder = await findFolder(conversationId);
      if (!folder) return false;
      return stat(inside("Sesiones", folder, "transcripcion.md")).then(() => true, () => false);
    },
    async saveConversation(conversation) {
      if (!conversation || !ID.test(conversation.conversation_id || "")) throw new Error("invalid-id");
      const folder =
        (await findFolder(conversation.conversation_id)) || sessionFolder(conversation);
      await writeAtomic(inside("Sesiones", folder, "transcripcion.md"), transcriptToMarkdown(conversation));
      let flowStatus = "ready";
      try { await ensureProcessFlow(root, folder, conversation.conversation_id); }
      catch { flowStatus = "failed"; } // Preserve the successful transcript even if a derived map fails.
      return { folder, file: `Sesiones/${folder}/transcripcion.md`, flowStatus };
    },
    async appendEvent(conversationId, event) {
      const folder = await ensureFolder(conversationId);
      const file = inside("Sesiones", folder, "eventos.md");
      const exists = await stat(file).then(() => true, () => false);
      if (!exists)
        await writeAtomic(
          file,
          frontmatter({ tipo: "eventos", conversacion: conversationId, tags: ["userhelper", "eventos"] }) +
            `\n# Eventos ${conversationId}\n\n`,
        );
      await appendFile(file, eventLine(event), "utf8");
      return { folder, file: `Sesiones/${folder}/eventos.md` };
    },
    async writeNote(conversationId, name, markdown) {
      if (!NOTE_NAMES.has(name)) throw new Error("invalid-note");
      const folder = await ensureFolder(conversationId);
      await writeAtomic(inside("Sesiones", folder, `${name}.md`), String(markdown));
      return { folder, file: `Sesiones/${folder}/${name}.md` };
    },
    async getProcessFlow(conversationId) {
      if (!ID.test(conversationId)) throw new Error("invalid-id");
      const folder = await findFolder(conversationId);
      if (!folder) return null;
      return ensureProcessFlow(root, folder, conversationId);
    },
    async ensureProcessMaps() {
      const sessions = await this.listSessions();
      const processes = [];
      const failures = [];
      for (const session of sessions) {
        const id = session.conversacion;
        if (!ID.test(id || "") || !session.files.includes("transcripcion.md")) continue;
        try {
          const flow = await ensureProcessFlow(root, session.folder, id);
          if (flow) processes.push({ id, folder: session.folder, title: flow.title, startedAt: session.inicio, duration: Number(session.duracion_s) || 0, steps: flow.nodes.length - 2, decisions: flow.nodes.filter(n => n.kind === "decision").length, status: flow.status, canvasEdited: flow.canvasEdited, evidenceCount: flow.evidence.length });
        } catch { failures.push({ id, error: "flow_unavailable" }); }
      }
      return { processes, failures };
    },
    async listSessions() {
      const sessions = inside("Sesiones");
      await mkdir(sessions, { recursive: true });
      const result = [];
      for (const folder of (await readdir(sessions)).sort().reverse()) {
        if (folder.startsWith(".")) continue;
        const files = await readdir(inside("Sesiones", folder)).catch(() => []);
        const summary = {};
        if (files.includes("transcripcion.md")) {
          const text = await readFile(inside("Sesiones", folder, "transcripcion.md"), "utf8");
          const block = text.match(/^---\n([\s\S]*?)\n---/);
          for (const line of block ? block[1].split("\n") : []) {
            const index = line.indexOf(": ");
            if (index > 0 && line.slice(0, index) !== "tags")
              summary[line.slice(0, index)] = line.slice(index + 2).replace(/^"|"$/g, "");
          }
        }
        result.push({ folder, files: files.filter((f) => f.endsWith(".md")), ...summary });
      }
      return result;
    },
  };
}

function send(res, status, body) {
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff",
  });
  res.end(JSON.stringify(body));
}

async function readRaw(req, limit) {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > limit) throw new Error("body-too-large");
    chunks.push(chunk);
  }
  return Buffer.concat(chunks).toString("utf8");
}

export function createVaultHandler(config = readVaultConfig(), options = {}) {
  const vault = config.ready ? createVault(config) : null;
  const fetchImpl = options.fetch || fetch;
  const log = options.log || console;
  const sameOrigin = (req) =>
    req.headers.origin === config.origin && req.headers["sec-fetch-site"] !== "cross-site";

  return async (req, res) => {
    const path = (req.url || "").split("?")[0];
    try {
      if (req.method === "GET" && path === "/api/vault/status")
        return send(res, 200, { configured: Boolean(vault), canImport: Boolean(vault && config.apiKey) });

      // Server-to-server: ElevenLabs post-call webhook, authenticated by HMAC instead of Origin.
      if (path === "/api/elevenlabs/webhook") {
        if (req.method !== "POST") return send(res, 405, { error: "method_not_allowed" });
        if (!vault || !config.webhookSecret) return send(res, 503, { error: "not_configured" });
        const raw = await readRaw(req, 5 * 1024 * 1024).catch(() => null);
        if (raw === null) return send(res, 413, { error: "too_large" });
        if (!verifyWebhookSignature(raw, req.headers["elevenlabs-signature"], config.webhookSecret)) {
          log.warn("[vault] webhook con firma inválida rechazado");
          return send(res, 401, { error: "invalid_signature" });
        }
        const payload = JSON.parse(raw);
        if (payload.type !== "post_call_transcription") return send(res, 200, { ignored: payload.type });
        const saved = await vault.saveConversation(payload.data);
        log.info(`[vault] transcripción guardada: ${saved.file}`);
        return send(res, 200, saved);
      }

      if (!path.startsWith("/api/vault/")) return send(res, 404, { error: "not_found" });
      if (!vault) return send(res, 503, { error: "not_configured" });
      if (!sameOrigin(req)) {
        log.warn(`[vault] origen rechazado: ${req.headers.origin || "(sin Origin)"}; esperado ${config.origin}`);
        return send(res, 403, { error: "origin_not_allowed" });
      }

      if (req.method === "GET" && path === "/api/vault/sessions")
        return send(res, 200, { sessions: await vault.listSessions() });

      if (req.method !== "POST") return send(res, 405, { error: "method_not_allowed" });
      if (!req.headers["content-type"]?.startsWith("application/json"))
        return send(res, 415, { error: "json_required" });

      // POST reads preserve the existing exact-Origin guard (same-origin GETs omit Origin).
      if (path === "/api/vault/processes") {
        try { JSON.parse(await readRaw(req, 1024)); } catch { return send(res, 400, { error: "invalid_request" }); }
        return send(res, 200, await vault.ensureProcessMaps());
      }
      const parts = path.split("/").filter(Boolean); // api, vault, collection, id, action, name
      const [, , collection, id, action, name] = parts;
      if (!ID.test(id || "")) return send(res, 400, { error: "invalid_id" });

      if (collection === "conversations" && action === "import" && parts.length === 5) {
        if (!config.apiKey) return send(res, 503, { error: "api_key_missing" });
        const conversation = await fetchConversation(config, id, fetchImpl);
        if (conversation.status && !["done", "failed"].includes(conversation.status))
          return send(res, 409, { error: "not_ready", status: conversation.status });
        return send(res, 200, await vault.saveConversation(conversation));
      }

      if (collection !== "sessions") return send(res, 404, { error: "not_found" });
      let body;
      try {
        body = JSON.parse(await readRaw(req, 512 * 1024));
      } catch {
        return send(res, 400, { error: "invalid_request" });
      }

      if (action === "flow" && parts.length === 5) {
        const flow = await vault.getProcessFlow(id);
        if (!flow) return send(res, 404, { error: "flow_not_found" });
        return send(res, 200, { flow, canvas: flowToCanvas(flow), obsidianUri: "obsidian://open?" + new URLSearchParams({ vault: basename(vault.root), file: `Sesiones/${flow.folder}/flujo.canvas` }) });
      }
      if (action === "events" && parts.length === 5) {
        if (!body || !EVENT_KINDS.has(body.kind) || typeof body.text !== "string" || !body.text.trim())
          return send(res, 400, { error: "invalid_event" });
        return send(res, 200, await vault.appendEvent(id, body));
      }
      if (action === "notes" && parts.length === 6) {
        if (!NOTE_NAMES.has(name)) return send(res, 400, { error: "invalid_note" });
        if (typeof body?.markdown !== "string") return send(res, 400, { error: "invalid_request" });
        return send(res, 200, await vault.writeNote(id, name, body.markdown));
      }
      return send(res, 404, { error: "not_found" });
    } catch (error) {
      log.error("[vault] error:", error?.message || error);
      if (error?.status === 404) return send(res, 404, { error: "conversation_not_found" });
      if (error?.status === 401 || error?.status === 403)
        return send(res, 502, { error: "elevenlabs_auth" });
      return send(res, 500, { error: "vault_unavailable" });
    }
  };
}
