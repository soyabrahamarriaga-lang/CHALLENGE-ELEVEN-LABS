import { afterEach, describe, expect, it } from "vitest";
import { mkdtemp, readFile, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createTutorStore, syncTutorConversations, tutorTranscriptToMarkdown } from "./tutorSessions.mjs";
import { startAgentSync } from "./main.mjs";
import { readVaultConfig } from "./vault.mjs";

const cleanup = [];
afterEach(async () => {
  for (const task of cleanup.splice(0)) await task();
});

// Synthetic lesson shaped like GET /v1/convai/conversations/{id}.
const lesson = {
  conversation_id: "conv_tutor1",
  agent_id: "agent_tutor",
  status: "done",
  metadata: { start_time_unix_secs: 1791093600, call_duration_secs: 40 },
  analysis: { call_successful: "success", transcript_summary: "El aprendiz preguntó por una OC de 35 días." },
  transcript: [
    { role: "user", message: "Tengo una OC de 35 días, ¿la apruebo?", time_in_call_secs: 2 },
    { role: "agent", message: "[curious] No la apruebes aún; el máximo es 30 días.", time_in_call_secs: 6 },
  ],
};

async function vaultDir() {
  const dir = await mkdtemp(join(tmpdir(), "tutor-sessions-"));
  cleanup.push(() => rm(dir, { recursive: true, force: true }));
  return dir;
}

describe("tutor conversations in the vault", () => {
  it("labels the lesson as a tutoring session with learner and tutor turns", () => {
    const md = tutorTranscriptToMarkdown(lesson);
    expect(md).toContain('tipo: "tutoria"');
    expect(md).toContain('tags: ["userhelper", "tutoria"]');
    expect(md).toContain("# Tutoría conv_tutor1");
    expect(md).toContain("**[00:02] Aprendiz:** Tengo una OC de 35 días");
    expect(md).toContain("**[00:06] Tutor:** No la apruebes aún; el máximo es 30 días.");
    expect(md).not.toContain("[[work-map]]");
  });

  it("stores lessons under Tutorias/, never Sesiones/, and skips saved ones", async () => {
    const dir = await vaultDir();
    const config = readVaultConfig({ VAULT_PATH: dir, ELEVENLABS_API_KEY: "only-a-test-key", ELEVENLABS_AGENT_ID: "agent_expert" });
    const urls = [];
    const fetcher = async (url) => {
      urls.push(url);
      if (url.includes("/conversations?"))
        return Response.json({ conversations: [{ conversation_id: "conv_tutor1", status: "done" }], has_more: false });
      return Response.json(lesson);
    };
    const first = await syncTutorConversations(config, "agent_tutor", { fetch: fetcher });
    expect(first.imported).toEqual(["Tutorias/2026-10-04-conv_tutor1/transcripcion.md"]);
    expect(urls[0]).toContain("agent_id=agent_tutor");
    expect(await readdir(dir)).toEqual(["Tutorias"]);
    expect(await readFile(join(dir, first.imported[0]), "utf8")).toContain('tipo: "tutoria"');
    const again = await syncTutorConversations(config, "agent_tutor", { fetch: fetcher });
    expect(again).toEqual({ imported: [], skipped: 1, pending: 0 });
    await expect(createTutorStore(dir).saveConversation({ ...lesson, conversation_id: "../x" })).rejects.toThrow("invalid-id");
  });

  it("runs in the backend sync loop and logs failures without stopping the expert sync", async () => {
    const dir = await vaultDir();
    const config = readVaultConfig({ VAULT_PATH: dir, ELEVENLABS_API_KEY: "k", ELEVENLABS_AGENT_ID: "agent_expert" });
    const messages = [];
    const log = { info: (m) => messages.push(m), error: (...m) => messages.push(m.join(" ")) };
    const job = startAgentSync(config, {
      log,
      sync: async () => ({ imported: ["Sesiones/a/transcripcion.md"], skipped: 0, pending: 0 }),
      tutorAgentId: "agent_tutor",
      syncTutor: async () => ({ status: "unchanged" }),
      syncTutorSessions: async () => {
        throw new Error("elevenlabs-500");
      },
    });
    await job.first;
    job.stop();
    expect(messages.join("\n")).toContain("transcripción guardada: Sesiones/a/transcripcion.md");
    expect(messages.join("\n")).toContain("[tutor] no se pudieron guardar sus conversaciones: elevenlabs-500");
  });
});
