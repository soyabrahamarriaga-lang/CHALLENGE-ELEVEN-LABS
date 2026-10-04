import { afterEach, describe, expect, it } from "vitest";
import { createServer } from "node:http";
import { createHmac } from "node:crypto";
import { mkdtemp, readFile, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  clock,
  createVault,
  createVaultHandler,
  syncAgentConversations,
  readVaultConfig,
  stripVoiceTags,
  transcriptToMarkdown,
  vaultProblems,
  verifyWebhookSignature,
} from "./vault.mjs";
import { createAppHandler, startAgentSync } from "./main.mjs";

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
  analysis: {
    call_successful: "success",
    transcript_summary: "Clasificó una factura como capex.",
  },
  transcript: [
    {
      role: "agent",
      message: "¿Por qué cambiaste el centro de costos?",
      time_in_call_secs: 192,
    },
    {
      role: "user",
      message: "Equipo arriba de 5,000 euros es capex.",
      time_in_call_secs: 195,
    },
    {
      role: "agent",
      message: "",
      time_in_call_secs: 200,
      tool_calls: [{ tool_name: "log_event" }],
    },
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
  const log = {
    info: () => {},
    warn: (m) => logs.push(m),
    error: (...m) => logs.push(m.join(" ")),
  };
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
      headers: {
        "Content-Type": "application/json",
        Origin: ORIGIN,
        ...headers,
      },
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
    expect(
      md.startsWith('---\ntipo: "transcripcion"\nconversacion: "conv_test123"'),
    ).toBe(true);
    expect(md).toContain("duracion_s: 312");
    expect(md).toContain('inicio: "2025-10-03T23:00:00.000Z"');
    expect(md).toContain(
      "**[03:12] Agente:** ¿Por qué cambiaste el centro de costos?",
    );
    expect(md).toContain(
      "**[03:15] Persona:** Equipo arriba de 5,000 euros es capex.",
    );
    expect(md).toContain("herramienta `log_event`");
    expect(md).toContain("[[eventos]]");
  });
  it("orders turns by time, labels snapshots and hides contextual updates", () => {
    const md = transcriptToMarkdown({
      ...conversation,
      transcript: [
        { role: "user", message: "[PANTALLA 00:27]", time_in_call_secs: 29 },
        {
          role: "agent",
          message: "",
          time_in_call_secs: 29,
          tool_calls: [{ tool_name: "contextual_update" }],
        },
        {
          role: "user",
          message: "Tiene 42 días y el máximo es 30.",
          time_in_call_secs: 24,
        },
        {
          role: "agent",
          message: "",
          time_in_call_secs: 30,
          tool_calls: [{ tool_name: "buscar_politica" }],
        },
      ],
    });
    const body = md.slice(md.indexOf("## Conversación"));
    expect(body.indexOf("[00:24] Persona")).toBeLessThan(
      body.indexOf("[00:29] Captura enviada al agente** [PANTALLA 00:27]"),
    );
    expect(body).not.toContain("contextual_update");
    expect(body).toContain("herramienta `buscar_politica`");
  });
  it("drops expressive voice tags but keeps screen markers", () => {
    expect(stripVoiceTags("[slow] Entiendo. [laughs] Claro")).toBe(
      "Entiendo. Claro",
    );
    expect(stripVoiceTags("[PANTALLA 00:45]")).toBe("[PANTALLA 00:45]");
    const md = transcriptToMarkdown({
      ...conversation,
      transcript: [
        { role: "agent", message: "[slow] ¿Por qué?", time_in_call_secs: 1 },
      ],
    });
    expect(md).toContain("**[00:01] Agente:** ¿Por qué?");
  });
  it("formats clocks and reports missing configuration by name only", () => {
    expect(clock(0)).toBe("00:00");
    expect(clock(3725)).toBe("62:05");
    const problems = vaultProblems(
      readVaultConfig({ VAULT_PATH: "relative/path" }),
    );
    expect(problems.join(" ")).toContain(
      "VAULT_PATH debe ser una ruta absoluta",
    );
    expect(problems.join(" ")).toContain("ELEVENLABS_API_KEY");
  });
  it("verifies webhook signatures and rejects stale or forged ones", () => {
    const body = '{"type":"post_call_transcription"}';
    const now = 1_800_000_000;
    expect(verifyWebhookSignature(body, sign(body, now), SECRET, now)).toBe(
      true,
    );
    expect(
      verifyWebhookSignature(body + " ", sign(body, now), SECRET, now),
    ).toBe(false);
    expect(
      verifyWebhookSignature(body, sign(body, now - 3600), SECRET, now),
    ).toBe(false);
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
    expect(
      (
        await api.post("/api/vault/sessions/conv_a/events", {
          kind: "note",
          text: "x",
        })
      ).status,
    ).toBe(503);
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
    await api.post("/api/vault/sessions/conv_a/events", {
      kind: "guardrail",
      text: "Sin activo\nno capex",
    });
    const text = await readFile(join(api.dir, file), "utf8");
    expect(text).toContain('tipo: "eventos"');
    expect(text).toContain(
      "- `03:12` **screen** — Se abrió la factura 4471 ^evt-1",
    );
    expect(text).toMatch(/\*\*guardrail\*\* — Sin activo no capex\n$/);
  });

  it("writes only allow-listed notes and blocks path traversal ids", async () => {
    const api = await setup();
    expect(
      (
        await api.post("/api/vault/sessions/conv_a/notes/work-map", {
          markdown: "# Mapa",
        })
      ).status,
    ).toBe(200);
    expect(
      (
        await api.post("/api/vault/sessions/conv_a/notes/secrets", {
          markdown: "x",
        })
      ).status,
    ).toBe(400);
    expect(
      (
        await api.post("/api/vault/sessions/..%2F..%2Fetc/events", {
          kind: "note",
          text: "x",
        })
      ).status,
    ).toBe(400);
    expect(
      (
        await api.post("/api/vault/sessions/conv_a/events", {
          kind: "rm -rf",
          text: "x",
        })
      ).status,
    ).toBe(400);
    const folders = await readdir(join(api.dir, "Sesiones"));
    expect(folders).toHaveLength(1);
    expect(folders[0]).toMatch(/^\d{4}-\d{2}-\d{2}-conv_a$/);
  });

  it("rejects foreign origins, non-JSON bodies and malformed JSON, and logs the origin", async () => {
    const api = await setup();
    const foreign = await api.post(
      "/api/vault/sessions/conv_a/events",
      { kind: "note", text: "x" },
      {
        Origin: "https://evil.example",
      },
    );
    expect(foreign.status).toBe(403);
    expect(api.logs.join(" ")).toContain("https://evil.example");
    expect(
      (
        await api.post("/api/vault/sessions/conv_a/events", "x", {
          "Content-Type": "text/plain",
        })
      ).status,
    ).toBe(415);
    expect(
      (await api.post("/api/vault/sessions/conv_a/events", "{nope")).status,
    ).toBe(400);
  });

  it("imports a finished conversation from ElevenLabs into the same session folder", async () => {
    const calls = [];
    const fakeFetch = async (url, init) => {
      calls.push({ url, key: init.headers["xi-api-key"] });
      return new Response(JSON.stringify(conversation), { status: 200 });
    };
    const api = await setup({}, { fetch: fakeFetch });
    await api.post("/api/vault/sessions/conv_test123/events", {
      kind: "screen",
      text: "Factura abierta",
    });
    const response = await api.post(
      "/api/vault/conversations/conv_test123/import",
      {},
    );
    expect(response.status).toBe(200);
    expect(calls[0].url).toBe(
      "https://api.elevenlabs.io/v1/convai/conversations/conv_test123",
    );
    expect(calls[0].key).toBe("only-a-test-key");
    const folders = await readdir(join(api.dir, "Sesiones"));
    expect(folders).toHaveLength(1);
    expect(
      (await readdir(join(api.dir, "Sesiones", folders[0]))).sort(),
    ).toEqual([
      "catalogo-enlace.json",
      "eventos.md",
      "evidencia-flujo.md",
      "flujo.canvas",
      "mapa-generado.md",
      "process-flow.json",
      "transcripcion.md",
    ]);
    const processes = await (await api.post("/api/vault/processes", {})).json();
    expect(processes.processes[0]).toMatchObject({
      id: "conv_test123",
      status: "draft",
    });
    const mapped = await api.post("/api/vault/sessions/conv_test123/flow", {});
    expect(mapped.headers.get("cache-control")).toBe("no-store");
    const detail = await mapped.json();
    expect(detail.flow.evidence.some((e) => e.role === "expert")).toBe(true);
    expect(detail.obsidianUri).toContain("obsidian://open?");
    expect(detail.flow.nodes.map((n) => n.kind)).toEqual(["start"]); // No executed action in this fixture.
    expect(
      (
        await api.post(
          "/api/vault/processes",
          {},
          { Origin: "https://evil.example" },
        )
      ).status,
    ).toBe(403);
    expect(
      (await api.post("/api/vault/sessions/conv_missing/flow", {})).status,
    ).toBe(404);
    const list = await (
      await fetch(api.base + "/api/vault/sessions", {
        headers: { Origin: ORIGIN },
      })
    ).json();
    expect(list.sessions[0]).toMatchObject({
      conversacion: "conv_test123",
      duracion_s: "312",
      resultado: "success",
    });
  });

  it("keeps images private and validates capture data and editable classification", async () => {
    const api = await setup();
    const pixels = Buffer.from([255, 216, 255, ...Array(20).fill(0)]).toString(
      "base64",
    );
    const uploaded = await api.post(
      "/api/vault/sessions/conv_images/captures",
      { data: pixels, at: 12 },
    );
    expect(uploaded.status).toBe(200);
    const capture = await uploaded.json();
    const path = "/api/vault/sessions/conv_images/captures/" + capture.id;
    const image = await api.post(path, {});
    expect(image.status).toBe(200);
    expect(image.headers.get("content-type")).toBe("image/jpeg");
    expect(image.headers.get("cache-control")).toBe("no-store");
    expect(Buffer.from(await image.arrayBuffer()).toString("base64")).toBe(
      pixels,
    );
    expect(
      (await api.post(path, {}, { Origin: "https://foreign.example" })).status,
    ).toBe(403);
    expect((await fetch(api.base + path)).status).not.toBe(200);
    expect(
      (
        await api.post("/api/vault/sessions/conv_images/captures", {
          data: Buffer.from("<svg></svg>").toString("base64"),
          at: 1,
        })
      ).status,
    ).toBe(400);
    expect(
      (await api.post("/api/vault/sessions/conv_images/metadata", null)).status,
    ).toBe(400);
    await createVault(
      readVaultConfig({ VAULT_PATH: api.dir }),
    ).saveConversation({ ...conversation, conversation_id: "conv_images" });
    const edit = await api.post("/api/vault/sessions/conv_images/metadata", {
      name: "Validar factura",
      department: "Contabilidad",
      taskType: "Recepción y validación de CFDI",
    });
    expect(edit.status).toBe(200);
    expect((await edit.json()).flow.title).toBe("Validar factura");
  });

  it("maps ElevenLabs failures without leaking the key", async () => {
    const statusFetch =
      (status, body = {}) =>
      async () =>
        new Response(JSON.stringify(body), { status });
    const notFound = await setup({}, { fetch: statusFetch(404) });
    expect(
      (await notFound.post("/api/vault/conversations/conv_x/import", {}))
        .status,
    ).toBe(404);
    const denied = await setup({}, { fetch: statusFetch(401) });
    const deniedResponse = await denied.post(
      "/api/vault/conversations/conv_x/import",
      {},
    );
    expect(deniedResponse.status).toBe(502);
    expect(await deniedResponse.text()).not.toContain("only-a-test-key");
    const pending = await setup(
      {},
      { fetch: statusFetch(200, { ...conversation, status: "processing" }) },
    );
    expect(
      (await pending.post("/api/vault/conversations/conv_test123/import", {}))
        .status,
    ).toBe(409);
    const noKey = await setup({ ELEVENLABS_API_KEY: "" });
    expect(
      (await noKey.post("/api/vault/conversations/conv_x/import", {})).status,
    ).toBe(503);
  });

  it("stores signed post-call webhooks and rejects unsigned ones", async () => {
    const api = await setup();
    const body = JSON.stringify({
      type: "post_call_transcription",
      event_timestamp: 1,
      data: conversation,
    });
    const unsigned = await api.post("/api/elevenlabs/webhook", body, {
      Origin: "",
    });
    expect(unsigned.status).toBe(401);
    const signed = await api.post("/api/elevenlabs/webhook", body, {
      "elevenlabs-signature": sign(body),
    });
    expect(signed.status).toBe(200);
    const { file } = await signed.json();
    expect(await readFile(join(api.dir, file), "utf8")).toContain(
      "Clasificó una factura como capex.",
    );
    const audio = JSON.stringify({ type: "post_call_audio", data: {} });
    expect(
      await (
        await api.post("/api/elevenlabs/webhook", audio, {
          "elevenlabs-signature": sign(audio),
        })
      ).json(),
    ).toEqual({
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
    expect(seen).toEqual([
      "vault",
      "vault",
      "livekit",
      "livekit",
      "livekit",
      "livekit",
    ]);
  });
});

describe("agent conversation sync", () => {
  async function vaultIn() {
    const dir = await mkdtemp(join(tmpdir(), "vault-sync-"));
    cleanup.push(() => rm(dir, { recursive: true, force: true }));
    const config = readVaultConfig({
      VAULT_PATH: dir,
      ELEVENLABS_API_KEY: "only-a-test-key",
      ELEVENLABS_AGENT_ID: "agent_test",
    });
    return { dir, config, vault: createVault(config) };
  }
  function fakeElevenLabs(pages) {
    const urls = [];
    const fetcher = async (url, init) => {
      urls.push(url);
      expect(init.headers["xi-api-key"]).toBe("only-a-test-key");
      if (url.includes("/conversations?"))
        return new Response(JSON.stringify(pages.shift()), { status: 200 });
      const id = url.split("/").pop();
      return new Response(
        JSON.stringify({ ...conversation, conversation_id: id }),
        { status: 200 },
      );
    };
    return { fetcher, urls };
  }

  it("imports finished conversations across pages, skips saved ones and counts pending", async () => {
    const { dir, config, vault } = await vaultIn();
    await vault.saveConversation({
      ...conversation,
      conversation_id: "conv_old",
    });
    const { fetcher, urls } = fakeElevenLabs([
      {
        conversations: [
          { conversation_id: "conv_old", status: "done" },
          { conversation_id: "conv_new", status: "done" },
          { conversation_id: "conv_live", status: "in-progress" },
        ],
        has_more: true,
        next_cursor: "c2",
      },
      {
        conversations: [
          { conversation_id: "conv_fail", status: "failed" },
          { conversation_id: "../x", status: "done" },
        ],
        has_more: false,
      },
    ]);
    const result = await syncAgentConversations(config, vault, {
      fetch: fetcher,
    });
    expect(result.skipped).toBe(1);
    expect(result.pending).toBe(1);
    expect(result.imported).toHaveLength(2);
    expect(urls[0]).toContain("agent_id=agent_test");
    expect(urls.some((u) => u.includes("cursor=c2"))).toBe(true);
    expect(urls.some((u) => u.includes("conv_old") && !u.includes("?"))).toBe(
      false,
    );
    const folders = (await readdir(join(dir, "Sesiones"))).sort();
    expect(folders.map((f) => f.replace(/^.*?-conv_/, "conv_"))).toEqual([
      "conv_fail",
      "conv_new",
      "conv_old",
    ]);
    const again = await syncAgentConversations(config, vault, {
      fetch: fakeElevenLabs([
        {
          conversations: [{ conversation_id: "conv_new", status: "done" }],
          has_more: false,
        },
      ]).fetcher,
    });
    expect(again).toEqual({ imported: [], skipped: 1, pending: 0 });
  });

  it("refuses to sync without an agent and surfaces ElevenLabs errors", async () => {
    const { vault } = await vaultIn();
    await expect(
      syncAgentConversations(
        readVaultConfig({ VAULT_PATH: "/tmp", ELEVENLABS_API_KEY: "k" }),
        vault,
      ),
    ).rejects.toThrow("agent-not-configured");
    const { config } = await vaultIn();
    const denied = async () => new Response("{}", { status: 401 });
    await expect(
      syncAgentConversations(config, vault, { fetch: denied }),
    ).rejects.toMatchObject({ status: 401 });
  });

  it("starts the periodic sync only when vault, key and agent are configured, and logs failures", async () => {
    const off = startAgentSync(readVaultConfig({ VAULT_PATH: "/tmp" }), {
      log: { info() {}, error() {} },
    });
    expect(off).toBeNull();
    const { config } = await vaultIn();
    const messages = [];
    const log = {
      info: (m) => messages.push(m),
      error: (...m) => messages.push(m.join(" ")),
    };
    let calls = 0;
    const sync = async () => {
      calls++;
      if (calls === 2) throw new Error("elevenlabs-500");
      return {
        imported: ["Sesiones/x/transcripcion.md"],
        skipped: 0,
        pending: 0,
      };
    };
    const job = startAgentSync(config, { log, sync });
    await job.first;
    await job.run();
    job.stop();
    expect(calls).toBe(2);
    expect(messages.join("\n")).toContain(
      "transcripción guardada: Sesiones/x/transcripcion.md",
    );
    expect(messages.join("\n")).toContain(
      "sincronización con ElevenLabs falló: elevenlabs-500",
    );
  });
});
