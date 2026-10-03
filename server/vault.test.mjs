import { afterEach, describe, expect, it } from "vitest";
import { createServer } from "node:http";
import { createHmac } from "node:crypto";
import { mkdtemp, readFile, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  clock,
  createVaultHandler,
  readVaultConfig,
  transcriptToMarkdown,
  vaultProblems,
  verifyWebhookSignature,
} from "./vault.mjs";
import { createAppHandler } from "./main.mjs";

const cleanup = [];
afterEach(async () => {
  for (const task of cleanup.splice(0)) await task();
});

const ORIGIN = "http://127.0.0.1:5173";
const SECRET = "only-a-test-webhook-secret";
// Synthetic conversation shaped like GET /v1/convai/conversations/{id}.
const conversation = {
  conversation_id: "conv_test123",
  agent_id: "agent_test",
  status: "done",
  metadata: { start_time_unix_secs: 1759532400, call_duration_secs: 312 },
  analysis: { call_successful: "success", transcript_summary: "Clasificó una factura como capex." },
  transcript: [
    { role: "agent", message: "¿Por qué cambiaste el centro de costos?", time_in_call_secs: 192 },
    { role: "user", message: "Equipo arriba de 5,000 euros es capex.", time_in_call_secs: 195 },
    { role: "agent", message: "", time_in_call_secs: 200, tool_calls: [{ tool_name: "log_event" }] },
  ],
};

async function setup(overrides = {}, options = {}) {
  const dir = await mkdtemp(join(tmpdir(), "vault-test-"));
  cleanup.push(() => rm(dir, { recursive: true, force: true }));
  const config = readVaultConfig({
    VAULT_PATH: dir,
    APP_ORIGIN: ORIGIN,
    ELEVENLABS_API_KEY: "only-a-test-key",
    ELEVENLABS_WEBHOOK_SECRET: SECRET,
    ...overrides,
  });
  const logs = [];
  const log = { info: () => {}, warn: (m) => logs.push(m), error: (...m) => logs.push(m.join(" ")) };
  const server = createServer(createVaultHandler(config, { log, ...options }));
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  cleanup.push(
    () =>
      new Promise((resolve) => {
        server.closeAllConnections();
        server.close(resolve);
      }),
  );
  const base = `http://127.0.0.1:${server.address().port}`;
  const post = (path, body, headers = {}) =>
    fetch(base + path, {
      method: "POST",
      headers: { "Content-Type": "application/json", Origin: ORIGIN, ...headers },
      body: typeof body === "string" ? body : JSON.stringify(body),
    });
  return { dir, base, post, logs };
}

function sign(body, t = Math.floor(Date.now() / 1000)) {
  return `t=${t},v0=${createHmac("sha256", SECRET).update(`${t}.${body}`).digest("hex")}`;
}

describe("vault formatting", () => {
  it("renders an ElevenLabs conversation as an Obsidian note with frontmatter", () => {
    const md = transcriptToMarkdown(conversation);
    expect(md.startsWith('---\ntipo: "transcripcion"\nconversacion: "conv_test123"')).toBe(true);
    expect(md).toContain("duracion_s: 312");
    expect(md).toContain('inicio: "2025-10-03T23:00:00.000Z"');
    expect(md).toContain("**[03:12] Agente:** ¿Por qué cambiaste el centro de costos?");
    expect(md).toContain("**[03:15] Persona:** Equipo arriba de 5,000 euros es capex.");
    expect(md).toContain("herramienta `log_event`");
    expect(md).toContain("[[eventos]]");
  });
  it("formats clocks and reports missing configuration by name only", () => {
    expect(clock(0)).toBe("00:00");
    expect(clock(3725)).toBe("62:05");
    const problems = vaultProblems(readVaultConfig({ VAULT_PATH: "relative/path" }));
    expect(problems.join(" ")).toContain("VAULT_PATH debe ser una ruta absoluta");
    expect(problems.join(" ")).toContain("ELEVENLABS_API_KEY");
  });
  it("verifies webhook signatures and rejects stale or forged ones", () => {
    const body = '{"type":"post_call_transcription"}';
    const now = 1_800_000_000;
    expect(verifyWebhookSignature(body, sign(body, now), SECRET, now)).toBe(true);
    expect(verifyWebhookSignature(body + " ", sign(body, now), SECRET, now)).toBe(false);
    expect(verifyWebhookSignature(body, sign(body, now - 3600), SECRET, now)).toBe(false);
    expect(verifyWebhookSignature(body, "t=1,v0=abc", SECRET, now)).toBe(false);
    expect(verifyWebhookSignature(body, undefined, SECRET, now)).toBe(false);
    expect(verifyWebhookSignature(body, sign(body, now), "", now)).toBe(false);
  });
});

describe("vault HTTP service", () => {
  it("reports status and refuses writes when VAULT_PATH is missing", async () => {
    const api = await setup({ VAULT_PATH: "" });
    expect(await (await fetch(api.base + "/api/vault/status")).json()).toEqual({
      configured: false,
      canImport: false,
    });
    expect((await api.post("/api/vault/sessions/conv_a/events", { kind: "note", text: "x" })).status).toBe(503);
  });

  it("appends screen events to the session's eventos.md", async () => {
    const api = await setup();
    const first = await api.post("/api/vault/sessions/conv_a/events", {
      kind: "screen",
      text: "Se abrió la factura 4471",
      at: 192,
      ref: "evt-1",
    });
    expect(first.status).toBe(200);
    const { file } = await first.json();
    await api.post("/api/vault/sessions/conv_a/events", { kind: "guardrail", text: "Sin activo\nno capex" });
    const text = await readFile(join(api.dir, file), "utf8");
    expect(text).toContain('tipo: "eventos"');
    expect(text).toContain("- `03:12` **screen** — Se abrió la factura 4471 ^evt-1");
    expect(text).toMatch(/\*\*guardrail\*\* — Sin activo no capex\n$/);
  });

  it("writes only allow-listed notes and blocks path traversal ids", async () => {
    const api = await setup();
    expect((await api.post("/api/vault/sessions/conv_a/notes/work-map", { markdown: "# Mapa" })).status).toBe(200);
    expect((await api.post("/api/vault/sessions/conv_a/notes/secrets", { markdown: "x" })).status).toBe(400);
    expect((await api.post("/api/vault/sessions/..%2F..%2Fetc/events", { kind: "note", text: "x" })).status).toBe(400);
    expect((await api.post("/api/vault/sessions/conv_a/events", { kind: "rm -rf", text: "x" })).status).toBe(400);
    const folders = await readdir(join(api.dir, "Sesiones"));
    expect(folders).toHaveLength(1);
    expect(folders[0]).toMatch(/^\d{4}-\d{2}-\d{2}-conv_a$/);
  });

  it("rejects foreign origins, non-JSON bodies and malformed JSON, and logs the origin", async () => {
    const api = await setup();
    const foreign = await api.post("/api/vault/sessions/conv_a/events", { kind: "note", text: "x" }, {
      Origin: "https://evil.example",
    });
    expect(foreign.status).toBe(403);
    expect(api.logs.join(" ")).toContain("https://evil.example");
    expect((await api.post("/api/vault/sessions/conv_a/events", "x", { "Content-Type": "text/plain" })).status).toBe(415);
    expect((await api.post("/api/vault/sessions/conv_a/events", "{nope")).status).toBe(400);
  });

  it("imports a finished conversation from ElevenLabs into the same session folder", async () => {
    const calls = [];
    const fakeFetch = async (url, init) => {
      calls.push({ url, key: init.headers["xi-api-key"] });
      return new Response(JSON.stringify(conversation), { status: 200 });
    };
    const api = await setup({}, { fetch: fakeFetch });
    await api.post("/api/vault/sessions/conv_test123/events", { kind: "screen", text: "Factura abierta" });
    const response = await api.post("/api/vault/conversations/conv_test123/import", {});
    expect(response.status).toBe(200);
    expect(calls[0].url).toBe("https://api.elevenlabs.io/v1/convai/conversations/conv_test123");
    expect(calls[0].key).toBe("only-a-test-key");
    const folders = await readdir(join(api.dir, "Sesiones"));
    expect(folders).toHaveLength(1);
    expect((await readdir(join(api.dir, "Sesiones", folders[0]))).sort()).toEqual(["eventos.md", "transcripcion.md"]);
    const list = await (await fetch(api.base + "/api/vault/sessions", { headers: { Origin: ORIGIN } })).json();
    expect(list.sessions[0]).toMatchObject({ conversacion: "conv_test123", duracion_s: "312", resultado: "success" });
  });

  it("maps ElevenLabs failures without leaking the key", async () => {
    const statusFetch = (status, body = {}) => async () => new Response(JSON.stringify(body), { status });
    const notFound = await setup({}, { fetch: statusFetch(404) });
    expect((await notFound.post("/api/vault/conversations/conv_x/import", {})).status).toBe(404);
    const denied = await setup({}, { fetch: statusFetch(401) });
    const deniedResponse = await denied.post("/api/vault/conversations/conv_x/import", {});
    expect(deniedResponse.status).toBe(502);
    expect(await deniedResponse.text()).not.toContain("only-a-test-key");
    const pending = await setup({}, { fetch: statusFetch(200, { ...conversation, status: "processing" }) });
    expect((await pending.post("/api/vault/conversations/conv_test123/import", {})).status).toBe(409);
    const noKey = await setup({ ELEVENLABS_API_KEY: "" });
    expect((await noKey.post("/api/vault/conversations/conv_x/import", {})).status).toBe(503);
  });

  it("stores signed post-call webhooks and rejects unsigned ones", async () => {
    const api = await setup();
    const body = JSON.stringify({ type: "post_call_transcription", event_timestamp: 1, data: conversation });
    const unsigned = await api.post("/api/elevenlabs/webhook", body, { Origin: "" });
    expect(unsigned.status).toBe(401);
    const signed = await api.post("/api/elevenlabs/webhook", body, { "elevenlabs-signature": sign(body) });
    expect(signed.status).toBe(200);
    const { file } = await signed.json();
    expect(await readFile(join(api.dir, file), "utf8")).toContain("Clasificó una factura como capex.");
    const audio = JSON.stringify({ type: "post_call_audio", data: {} });
    expect(await (await api.post("/api/elevenlabs/webhook", audio, { "elevenlabs-signature": sign(audio) })).json()).toEqual({
      ignored: "post_call_audio",
    });
  });
});

describe("combined backend", () => {
  it("routes vault and webhook paths to the vault and everything else to LiveKit", () => {
    const seen = [];
    const handler = createAppHandler({
      livekit: () => seen.push("livekit"),
      vault: () => seen.push("vault"),
    });
    for (const url of [
      "/api/vault/status",
      "/api/elevenlabs/webhook",
      "/api/elevenlabs/session",
      "/api/elevenlabs/status",
      "/api/livekit/token",
      "/other",
    ])
      handler({ url }, {});
    expect(seen).toEqual(["vault", "vault", "livekit", "livekit", "livekit", "livekit"]);
  });
});
