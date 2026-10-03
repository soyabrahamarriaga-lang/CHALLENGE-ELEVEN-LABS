import { describe, expect, it } from "vitest";
import { archiveConversation, logVaultEvent } from "./vault";

const reply = (status: number, body: unknown = {}) =>
  new Response(JSON.stringify(body), { status });

function sequence(...responses: Array<Response | Error>) {
  const calls: string[] = [];
  const fetcher = (async (url: string) => {
    calls.push(url);
    const next = responses.shift();
    if (next instanceof Error) throw next;
    return next ?? reply(500);
  }) as unknown as typeof fetch;
  return { fetcher, calls };
}

const noWait = async () => {};

describe("vault client", () => {
  it("retries while ElevenLabs is still processing and reports the saved note", async () => {
    const { fetcher, calls } = sequence(
      reply(409, { error: "not_ready" }),
      reply(409, { error: "not_ready" }),
      reply(200, { file: "Sesiones/2026-10-03-conv_1/transcripcion.md" }),
    );
    const result = await archiveConversation("conv_1", { fetcher, wait: noWait });
    expect(result).toEqual({ status: "saved", file: "Sesiones/2026-10-03-conv_1/transcripcion.md" });
    expect(calls).toEqual(Array(3).fill("/api/vault/conversations/conv_1/import"));
  });

  it("stays quiet when the vault is not configured or the backend is absent", async () => {
    expect(await archiveConversation("conv_1", { fetcher: sequence(reply(503)).fetcher, wait: noWait })).toEqual({
      status: "disabled",
    });
    expect(await archiveConversation("conv_1", { fetcher: sequence(reply(404)).fetcher, wait: noWait })).toEqual({
      status: "disabled",
    });
  });

  it("reports failures, gives up after the retry budget and rejects bad ids without calling", async () => {
    expect(
      await archiveConversation("conv_1", { fetcher: sequence(reply(502, { error: "elevenlabs_auth" })).fetcher }),
    ).toEqual({ status: "failed", reason: "elevenlabs_auth" });
    expect(await archiveConversation("conv_1", { fetcher: sequence(new TypeError("offline")).fetcher })).toEqual({
      status: "failed",
      reason: "network",
    });
    const pending = sequence(reply(409), reply(409));
    expect(await archiveConversation("conv_1", { fetcher: pending.fetcher, wait: noWait, attempts: 2 })).toEqual({
      status: "failed",
      reason: "still_processing",
    });
    const bad = sequence();
    expect(await archiveConversation("../etc", { fetcher: bad.fetcher })).toEqual({
      status: "failed",
      reason: "invalid_id",
    });
    expect(bad.calls).toEqual([]);
  });

  it("logs events and tolerates an unavailable vault", async () => {
    const ok = sequence(reply(200));
    expect(await logVaultEvent("conv_1", { kind: "screen", text: "Factura 4471" }, ok.fetcher)).toBe(true);
    expect(ok.calls).toEqual(["/api/vault/sessions/conv_1/events"]);
    expect(await logVaultEvent("conv_1", { kind: "note", text: "x" }, sequence(new Error("down")).fetcher)).toBe(false);
  });
});
