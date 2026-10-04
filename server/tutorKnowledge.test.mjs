import { markProcessRemoved } from "./processRemoval.mjs";
import { afterEach, describe, expect, it } from "vitest";
import { mkdtemp, mkdir, readFile, rm, symlink, utimes, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { cleanProcessNote, compileKnowledge, syncTutorKnowledge } from "./tutorKnowledge.mjs";

const cleanup = [];
afterEach(async () => {
  for (const task of cleanup.splice(0)) await task();
});

const note = (name, conv, body) =>
  `---\ntipo: proceso\nnombre: "${name}"\ndepartamento: "Compras"\ntipo_tarea: "Órdenes"\nestado: borrador\nconversacion: "${conv}"\n---\n\n# ${name}\n\n${body}\n`;
const body = [
  "[[Sesiones/x/flujo.canvas|Abrir diagrama]] · [[Sesiones/x/evidencia-flujo|Evidencia]]",
  "## 1. Rechazar orden",
  "![[Sesiones/x/capturas/frame.jpg]]",
  "**Imagen pendiente:** no se guardó una captura de este paso.",
  "### Por qué se hace así",
  "Máximo 30 días; excepción con correo del [[Personas/director|director de finanzas]].",
  "[[Sesiones/x/evidencia-flujo#^turn-1|Fuente]]",
  "## Pendiente de revisar",
  "- Borrador del procedimiento.",
].join("\n");

async function vault() {
  const dir = await mkdtemp(join(tmpdir(), "tutor-kb-"));
  cleanup.push(() => rm(dir, { recursive: true, force: true }));
  await mkdir(join(dir, "Procesos", "compras", "ordenes"), { recursive: true });
  await mkdir(join(dir, "Procesos", "contabilidad", "ordenes"), { recursive: true });
  return dir;
}

describe("tutor knowledge from the vault", () => {
  it("cleans a process note down to steps, reasons and limits", () => {
    const text = cleanProcessNote(body);
    expect(text).toContain("## 1. Rechazar orden");
    expect(text).toContain("Máximo 30 días; excepción con correo del director de finanzas.");
    expect(text).not.toMatch(/!\[\[|Imagen pendiente|Fuente|Abrir diagrama|Pendiente de revisar/);
  });

  it("compiles process notes, skips placeholders and keeps the newest copy of a session", async () => {
    const dir = await vault();
    const old = join(dir, "Procesos", "contabilidad", "ordenes", "a.md");
    const fresh = join(dir, "Procesos", "compras", "ordenes", "a.md");
    await writeFile(old, note("Versión vieja", "conv_a", body));
    await writeFile(fresh, note("Rechazar órdenes por antigüedad", "conv_a", body));
    await utimes(old, new Date(1000), new Date(1000));
    await writeFile(join(dir, "Procesos", "compras", "ordenes", "b.md"), note("Registro sin proceso identificado", "conv_b", "x"));
    await writeFile(join(dir, "Procesos", "compras", "ordenes", "c.md"), note("Demo", "ejemplo_sintetico_demo", "x"));
    await writeFile(join(dir, "Procesos", "Indice-generado.md"), "# Índice");
    const knowledge = await compileKnowledge(dir);
    expect(knowledge.processes).toEqual(["Rechazar órdenes por antigüedad"]);
    expect(knowledge.text).toContain("Área: Compras · Órdenes · Estado: borrador · Sesión: conv_a");
    expect(knowledge.digest).toMatch(/^[0-9a-f]{64}$/);
  });

  let created = 0;
  function fakeElevenLabs({ existing = [], promptAfter } = {}) {
    const calls = [];
    let kb = existing;
    const fetcher = async (url, init) => {
      const path = url.replace("https://api.elevenlabs.io", "");
      calls.push(`${init.method} ${path}`);
      expect(init.headers["xi-api-key"]).toBe("only-a-test-key");
      if (init.method === "GET")
        return Response.json({
          conversation_config: {
            agent: { prompt: { prompt: calls.length > 2 && promptAfter ? promptAfter : "Eres un tutor", llm: "claude-haiku-4-5", knowledge_base: kb } },
          },
        });
      if (init.method === "POST") return Response.json({ id: `doc_${++created}`, name: "x" });
      if (init.method === "PATCH") {
        kb = JSON.parse(init.body).conversation_config.agent.prompt.knowledge_base;
        return Response.json({});
      }
      return new Response(null, { status: 204 });
    };
    return { fetcher, calls };
  }

  it("uploads, attaches, replaces the previous document and then stays unchanged", async () => {
    const dir = await vault();
    await writeFile(join(dir, "Procesos", "compras", "ordenes", "a.md"), note("Rechazar órdenes", "conv_a", body));
    const config = { apiKey: "only-a-test-key", tutorAgentId: "agent_tutor", vaultPath: dir };
    const manual = { type: "file", id: "doc_manual", name: "Manual de compras", usage_mode: "auto" };
    const first = fakeElevenLabs({ existing: [manual] });
    const result = await syncTutorKnowledge(config, { fetch: first.fetcher, now: () => new Date("2026-10-04T06:00:00Z") });
    expect(result.status).toBe("updated");
    expect(first.calls).toEqual([
      "GET /v1/convai/agents/agent_tutor",
      "POST /v1/convai/knowledge-base/text",
      "PATCH /v1/convai/agents/agent_tutor",
      "GET /v1/convai/agents/agent_tutor",
    ]);
    const state = JSON.parse(await readFile(join(dir, "Procesos", "tutor-conocimiento.json"), "utf8"));
    expect(state).toMatchObject({ agentId: "agent_tutor", docId: result.docId, actualizado: "2026-10-04T06:00:00.000Z" });

    const attached = [manual, { type: "text", id: result.docId, name: "UserHelper · Procesos del experto (bóveda Obsidian)" }];
    const same = fakeElevenLabs({ existing: attached });
    expect((await syncTutorKnowledge(config, { fetch: same.fetcher })).status).toBe("unchanged");
    expect(same.calls).toEqual(["GET /v1/convai/agents/agent_tutor"]);

    await writeFile(join(dir, "Procesos", "compras", "ordenes", "a.md"), note("Rechazar órdenes", "conv_a", body.replace("Máximo 30 días", "Máximo 45 días")));
    const changed = fakeElevenLabs({ existing: attached });
    const second = await syncTutorKnowledge(config, { fetch: changed.fetcher });
    expect(second.status).toBe("updated");
    expect(changed.calls.at(-1)).toBe(`DELETE /v1/convai/knowledge-base/${result.docId}`);
    expect(changed.calls).not.toContain("DELETE /v1/convai/knowledge-base/doc_manual");
  });

  it("does not treat an unreadable or missing vault as an empty knowledge base", async () => {
    const dir = await vault();
    const remote = fakeElevenLabs();
    const config = { apiKey: "only-a-test-key", tutorAgentId: "agent_tutor", vaultPath: dir };
    await rm(join(dir, "Procesos"), { recursive: true });
    await symlink(tmpdir(), join(dir, "Procesos"));
    await expect(syncTutorKnowledge(config, { fetch: remote.fetcher })).rejects.toThrow("invalid-private-path");
    await expect(syncTutorKnowledge({ ...config, vaultPath: join(dir, "missing") }, { fetch: remote.fetcher })).rejects.toThrow();
    expect(remote.calls).toEqual([]);
  });

  it("detaches the final removed process while preserving other knowledge and the tutor prompt", async () => {
    const dir = await vault();
    await writeFile(join(dir, "Procesos", "compras", "ordenes", "a.md"), note("Rechazar órdenes", "conv_a", body));
    const config = { apiKey: "only-a-test-key", tutorAgentId: "agent_tutor", vaultPath: dir };
    const manual = { type: "file", id: "doc_manual", name: "Manual" };
    const remote = fakeElevenLabs({ existing: [manual] });
    const before = await syncTutorKnowledge(config, { fetch: remote.fetcher });
    await markProcessRemoved(dir, "conv_a");
    expect((await compileKnowledge(dir)).processes).toEqual([]);
    expect((await syncTutorKnowledge(config, { fetch: remote.fetcher })).status).toBe("empty");
    expect(remote.calls).toContain(`DELETE /v1/convai/knowledge-base/${before.docId}`);
    expect(remote.calls).not.toContain("DELETE /v1/convai/knowledge-base/doc_manual");
    const state = JSON.parse(await readFile(join(dir, "Procesos", "tutor-conocimiento.json"), "utf8"));
    expect(state.docId).toBeNull();
    expect(state.procesos).toEqual([]);
  });

  it("refuses to continue if the tutor's prompt changed and does nothing without configuration", async () => {
    const dir = await vault();
    await writeFile(join(dir, "Procesos", "compras", "ordenes", "a.md"), note("Rechazar órdenes", "conv_a", body));
    const config = { apiKey: "only-a-test-key", tutorAgentId: "agent_tutor", vaultPath: dir };
    const broken = fakeElevenLabs({ promptAfter: "Prompt cambiado por error" });
    await expect(syncTutorKnowledge(config, { fetch: broken.fetcher })).rejects.toThrow("tutor-prompt-changed");
    expect((await syncTutorKnowledge({ ...config, tutorAgentId: "" })).status).toBe("disabled");
    const empty = await vault();
    expect((await syncTutorKnowledge({ ...config, vaultPath: empty }, { fetch: fakeElevenLabs().fetcher })).status).toBe("empty");
  });
});
