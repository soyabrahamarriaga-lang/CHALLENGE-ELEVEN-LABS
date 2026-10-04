import { afterEach, describe, expect, it, vi } from "vitest";
import { createServer } from "node:http";
import { createHandler, readConfig } from "./livekit.mjs";
import { readElevenLabsConfig, getConversationAccess } from "./elevenlabs.mjs";
import { createAgentAvailability } from "./agentAvailability.mjs";

const origin = "http://localhost:5175";
const env = {
  ELEVENLABS_API_KEY: "test-key",
  ELEVENLABS_AGENT_ID: "agent_expert",
  ELEVENLABS_TUTOR_AGENT_ID: "agent_tutor",
};
const agentConfig = readElevenLabsConfig(env);
const tutorConfig = readElevenLabsConfig(env, "intern");
const servers = [];
afterEach(async () => {
  await Promise.all(servers.splice(0).map((server) => new Promise((resolve) => {
    server.closeAllConnections();
    server.close(resolve);
  })));
});
async function setup(options = {}, accessConfig = {}) {
  const server = createServer(createHandler(readConfig({
    APP_ORIGIN: origin, AGENT_OPEN_ACCESS: "true", ...accessConfig,
  }), { agentConfig, tutorConfig, ...options }));
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  servers.push(server);
  const base = "http://127.0.0.1:" + server.address().port + "/api/elevenlabs";
  return {
    get: (path) => fetch(base + path),
    start: (role, body = {}, headers = {}) => fetch(base + (role === "intern" ? "/tutor" : "") + "/session", {
      method: "POST",
      headers: { Origin: origin, "Content-Type": "application/json", ...headers },
      body: JSON.stringify({ displayName: "Aprendiz", consent: true, joinCode: "", mode: "text", ...body }),
    }),
  };
}
describe("independent tutor and expert agents", () => {
  it("reads the two server-side IDs without falling back to the expert", () => {
    expect(agentConfig.agentId).toBe("agent_expert");
    expect(tutorConfig.agentId).toBe("agent_tutor");
    expect(readElevenLabsConfig({ ...env, ELEVENLABS_TUTOR_AGENT_ID: "" }, "intern").ready).toBe(false);
    expect(() => readElevenLabsConfig(env, "arbitrary-agent")).toThrow("invalid_agent_role");
  });
  it("issues voice and text access for the tutor ID and ignores client-selected agent IDs", async () => {
    const fetcher = vi.fn(async (url) => url.includes("/token?")
      ? Response.json({ token: "temporary-tutor-token" })
      : Response.json({ signed_url: "wss://api.elevenlabs.io/v1/convai/conversation?signature=test" }));
    const agentAccess = vi.fn();
    const api = await setup({
      agentAccess,
      tutorAccess: (mode) => getConversationAccess(tutorConfig, mode === "voice" ? "webrtc" : "websocket", fetcher),
    });
    for (const mode of ["text", "voice"]) {
      const response = await api.start("intern", { mode, agentId: "agent_expert", role: "senior" });
      expect(response.status).toBe(200);
      expect(response.headers.get("cache-control")).toBe("no-store");
      expect(await response.text()).not.toContain(env.ELEVENLABS_API_KEY);
    }
    expect(fetcher.mock.calls.map(([url]) => new URL(url).searchParams.get("agent_id")))
      .toEqual(["agent_tutor", "agent_tutor"]);
    expect(agentAccess).not.toHaveBeenCalled();
  });
  it("keeps the expert usable when the tutor is unconfigured", async () => {
    const agentAccess = vi.fn(async () => ({ signedUrl: "expert-access" }));
    const tutorAccess = vi.fn();
    const api = await setup({ agentAccess, tutorAccess, tutorConfig: { ready: false } });
    expect(await (await api.get("/tutor/availability")).json()).toMatchObject({ availability: "unconfigured" });
    expect((await api.start("intern")).status).toBe(503);
    expect((await api.start("senior")).status).toBe(200);
    expect(agentAccess).toHaveBeenCalledExactlyOnceWith("text");
    expect(tutorAccess).not.toHaveBeenCalled();
  });
  it("checks consent, origin, code and mode on the tutor route too", async () => {
    const tutorAccess = vi.fn();
    const api = await setup({ tutorAccess }, {
      AGENT_OPEN_ACCESS: "false", LIVEKIT_JOIN_CODE: "test-access-code-long",
    });
    expect((await api.start("intern", {}, { Origin: "https://foreign.example" })).status).toBe(403);
    expect((await api.start("intern", { consent: false })).status).toBe(400);
    expect((await api.start("intern")).status).toBe(401);
    expect((await api.start("intern", { joinCode: "test-access-code-long", mode: "other" })).status).toBe(400);
    expect(tutorAccess).not.toHaveBeenCalled();
  });
  it("keeps independent cached health reports and never requests session access during a check", async () => {
    const healthy = vi.fn(async () => ({ availability: "available", reason: null }));
    const denied = vi.fn(async () => { throw { code: "agent_access_denied" }; });
    const agentAccess = vi.fn();
    const tutorAccess = vi.fn();
    const api = await setup({ agentAccess, tutorAccess,
      agentAvailability: createAgentAvailability(agentConfig, { probe: healthy }),
      tutorAvailability: createAgentAvailability(tutorConfig, { probe: denied }),
    });
    for (let i = 0; i < 2; i++) {
      expect(await (await api.get("/availability")).json()).toMatchObject({ availability: "available" });
      expect(await (await api.get("/tutor/availability")).json()).toMatchObject({
        availability: "unavailable", reason: "agent_access_denied",
      });
    }
    expect(healthy).toHaveBeenCalledTimes(1);
    expect(denied).toHaveBeenCalledTimes(1);
    expect(agentAccess).not.toHaveBeenCalled();
    expect(tutorAccess).not.toHaveBeenCalled();
    expect((await api.get("/tutor/arbitrary-agent")).status).toBe(404);
  });
  it("shares the connection attempt limit across both profiles", async () => {
    const access = vi.fn(async () => ({ signedUrl: "temporary-test-access" }));
    const api = await setup({ agentAccess: access, tutorAccess: access });
    for (let i = 0; i < 10; i++)
      expect((await api.start(i % 2 ? "intern" : "senior")).status).toBe(200);
    expect((await api.start("intern")).status).toBe(429);
    expect(access).toHaveBeenCalledTimes(10);
  });
});
