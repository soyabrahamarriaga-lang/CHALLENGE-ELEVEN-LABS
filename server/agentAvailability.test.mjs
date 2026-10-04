import { describe, expect, it, vi } from "vitest";
import { createServer } from "node:http";
import { createAgentAvailability, probeAgentAvailability } from "./agentAvailability.mjs";
import { readElevenLabsConfig, ElevenLabsError } from "./elevenlabs.mjs";
import { createHandler, readConfig } from "./livekit.mjs";
const config = readElevenLabsConfig({ ELEVENLABS_API_KEY: "private-test-key", ELEVENLABS_AGENT_ID: "agent_test" });
const available = { availability: "available", reason: null, defaultLanguage: "es", selectableLanguages: ["es"],
  modes: { voice: { available: true, reason: null }, text: { available: true, reason: null } } };
function upstream({ agent = 200, archived = false, wrongAgent = false, textOnly = false } = {}) {
  return vi.fn(async (url) => {
    if (url.includes("/agents/")) return Response.json({
      agent_id: wrongAgent ? "wrong-agent" : config.agentId,
      conversation_config: { agent: { language: "es" }, conversation: { text_only: textOnly } }, platform_settings: { archived },
      privatePrompt: "do-not-expose-this",
    }, { status: agent });
    throw new Error("Availability must not request conversation credentials");
  });
}
describe("real agent availability preflight", () => {
  it("checks the real agent using only the read-only endpoint, without reserving capacity or exposing private data", async () => {
    const fetcher = upstream();
    const result = await probeAgentAvailability(config, fetcher);
    expect(result).toEqual(available);
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(fetcher.mock.calls[0][0]).toBe("https://api.elevenlabs.io/v1/convai/agents/agent_test");
    expect(fetcher.mock.calls.every(([, init]) => init.method === "GET")).toBe(true);
    expect(JSON.stringify(result)).not.toMatch(/private|token|prompt|signature/i);
  });
  it("disables voice for a real text-only agent", async () => {
    const result = await probeAgentAvailability(config, upstream({ textOnly: true }));
    expect(result.availability).toBe("limited");
    expect(result.modes.voice).toEqual({ available: false, reason: "agent_text_only" });
    expect(result.modes.text.available).toBe(true);
  });
  it.each([[401, "agent_access_denied"], [403, "agent_access_denied"], [404, "agent_not_found"],
    [402, "agent_quota_exceeded"], [429, "agent_busy"], [503, "agent_unavailable"]])(
    "rejects upstream status %s instead of trusting local configuration", async (status, reason) => {
      const check = createAgentAvailability(config, {
        probe: () => probeAgentAvailability(config, upstream({ agent: status })),
      });
      expect(await check()).toMatchObject({ configured: true, availability: "unavailable", reason,
        modes: { voice: { available: false }, text: { available: false } } });
    });
  it("rejects archived agents, mismatched agent IDs and invalid upstream payloads", async () => {
    await expect(probeAgentAvailability(config, upstream({ archived: true }))).rejects.toMatchObject({ code: "agent_archived" });
    await expect(probeAgentAvailability(config, upstream({ wrongAgent: true }))).rejects.toMatchObject({ code: "agent_invalid_response" });
    await expect(probeAgentAvailability(config, async () => Response.json({}))).rejects.toMatchObject({ code: "agent_invalid_response" });
  });
  it("handles timeouts and malformed responses without reflecting provider bodies", async () => {
    const check = createAgentAvailability(config, { probe: () => probeAgentAvailability(config, async () => {
      throw new DOMException("private-provider-details", "TimeoutError");
    }) });
    const result = await check();
    expect(result.reason).toBe("agent_timeout");
    expect(JSON.stringify(result)).not.toContain("private-provider-details");
  });
  it("does not contact ElevenLabs when local access is not configured", async () => {
    const probe = vi.fn();
    const result = await createAgentAvailability(config, { configured: false, probe })();
    expect(result).toMatchObject({ availability: "unconfigured", checkedAt: null, validForMs: 0 });
    expect(probe).not.toHaveBeenCalled();
  });
  it("shares concurrent checks, expires the cache, and replaces a success with failure and recovery", async () => {
    let now = 100000;
    let resolve;
    const probe = vi.fn(() => new Promise((done) => { resolve = done; }));
    const check = createAgentAvailability(config, { probe, now: () => now });
    const a = check();
    const b = check();
    expect(probe).toHaveBeenCalledTimes(1);
    resolve(available);
    expect(await a).toEqual(await b);
    now += 14000;
    expect((await check()).validForMs).toBe(16000);
    expect(probe).toHaveBeenCalledTimes(1);
    now += 1000;
    probe.mockRejectedValueOnce(new ElevenLabsError("agent_access_denied"));
    expect((await check()).availability).toBe("unavailable");
    now += 15000;
    probe.mockResolvedValueOnce(available);
    expect((await check()).availability).toBe("available");
    expect(probe).toHaveBeenCalledTimes(3);
  });
  it("serves a safe no-store report and refuses foreign-origin checks", async () => {
    const agentAvailability = vi.fn(createAgentAvailability(config, { probe: async () => available }));
    const server = createServer(createHandler(readConfig({ APP_ORIGIN: "http://localhost:5175" }), {
      agentConfig: config, agentAvailability,
    }));
    await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
    const url = "http://127.0.0.1:" + server.address().port + "/api/elevenlabs/availability";
    try {
      expect((await fetch(url, { headers: { Origin: "https://foreign.test" } })).status).toBe(403);
      expect((await fetch(url, { method: "POST" })).status).toBe(405);
      expect(agentAvailability).not.toHaveBeenCalled();
      const result = await fetch(url);
      expect(result.headers.get("cache-control")).toBe("no-store");
      expect(await result.json()).toMatchObject({ configured: true, availability: "available" });
      expect(agentAvailability).toHaveBeenCalledTimes(1);
    } finally {
      server.closeAllConnections();
      await new Promise((resolve) => server.close(resolve));
    }
  });
});

const languageAgent = (primary, presets, override) => async () => Response.json({
  agent_id: config.agentId,
  conversation_config: { agent: { language: primary }, language_presets: presets },
  platform_settings: { overrides: { conversation_config_override: { agent: { language: override } } } },
});
it.each([
  ['es', {}, false, ['es']],
  ['es', { en: {} }, false, ['es']],
  ['es', {}, true, ['es']],
  ['es', { en: {}, fr: {} }, true, ['es', 'en']],
  ['en', { es: {} }, true, ['es', 'en']],
  [undefined, {}, undefined, []],
])('reports configured session languages without inventing support (%s)', async (primary, presets, override, expected) => {
  const result = await probeAgentAvailability(config, languageAgent(primary, presets, override));
  expect(result.selectableLanguages).toEqual(expected);
  expect(result.defaultLanguage).toBe(primary || null);
});
