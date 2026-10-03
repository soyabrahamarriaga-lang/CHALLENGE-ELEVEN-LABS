import { afterEach, describe, expect, it, vi } from "vitest";
import { createServer } from "node:http";
import { TokenVerifier } from "livekit-server-sdk";
import { readConfig, createHandler } from "./livekit.mjs";
const servers = [];
afterEach(async () => {
  await Promise.all(
    servers.splice(0).map(
      (server) =>
        new Promise((resolve) => {
          server.closeAllConnections();
          server.close(resolve);
        }),
    ),
  );
});
const env = {
  LIVEKIT_URL: "wss://project.example.test",
  LIVEKIT_API_KEY: "test-key",
  LIVEKIT_API_SECRET: "only-a-test-secret-not-a-real-credential",
  LIVEKIT_JOIN_CODE: "only-a-test-room-code",
  LIVEKIT_ROOM: "team",
  APP_ORIGIN: "http://127.0.0.1:5173",
};
async function setup(overrides = {}, options = {}) {
  const server = createServer(
    createHandler(readConfig({ ...env, ...overrides }), options),
  );
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  servers.push(server);
  const base = `http://127.0.0.1:${server.address().port}`;
  return {
    status: () => fetch(base + "/api/livekit/status"),
    join: (body = {}, headers = {}) =>
      fetch(base + "/api/livekit/token", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Origin: env.APP_ORIGIN,
          ...headers,
        },
        body: JSON.stringify({
          displayName: "Abraham",
          consent: true,
          joinCode: env.LIVEKIT_JOIN_CODE,
          ...body,
        }),
      }),
  };
}
describe("LiveKit token service", () => {
  it("issues short-lived room-scoped tokens with server-generated identities", async () => {
    const api = await setup();
    const response = await api.join({
      room: "attacker-room",
      identity: "admin",
    });
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    const result = await response.json();
    const claims = await new TokenVerifier(
      env.LIVEKIT_API_KEY,
      env.LIVEKIT_API_SECRET,
    ).verify(result.participantToken);
    expect(claims.video).toMatchObject({
      room: "team",
      roomJoin: true,
      canPublishData: false,
      canSubscribe: true,
    });
    expect(claims.video.canPublishSources).toEqual([
      "microphone",
      "camera",
      "screen_share",
    ]);
    expect(claims.sub).toMatch(/^participant-/);
    expect(claims.exp - claims.nbf).toBeLessThanOrEqual(300);
    expect(result).not.toHaveProperty("apiSecret");
    expect((await (await api.join()).json()).participantToken).not.toBe(
      result.participantToken,
    );
  });
  it("requires consent, a valid name, room code and same origin", async () => {
    const mint = vi.fn();
    const api = await setup({}, { mint });
    expect((await api.join({ consent: false })).status).toBe(400);
    expect((await api.join({ displayName: "" })).status).toBe(400);
    expect((await api.join({ joinCode: "incorrect" })).status).toBe(401);
    expect(
      (await api.join({}, { Origin: "https://untrusted.example" })).status,
    ).toBe(403);
    expect(
      (await api.join({}, { "Sec-Fetch-Site": "cross-site" })).status,
    ).toBe(403);
    expect(mint).not.toHaveBeenCalled();
  });
  it("fails closed without configuration and never discloses credentials", async () => {
    const api = await setup({ LIVEKIT_API_SECRET: "" });
    expect(await (await api.status()).json()).toEqual({
      configured: false,
      roomName: null,
    });
    expect((await api.join()).status).toBe(503);
    expect(
      readConfig({ ...env, LIVEKIT_URL: "ws://remote.example" }).ready,
    ).toBe(false);
    expect(readConfig({ ...env, LIVEKIT_JOIN_CODE: "short" }).ready).toBe(
      false,
    );
  });
  it("limits token attempts and recovers after the window", async () => {
    let time = 1000;
    const api = await setup({}, { now: () => time });
    for (let index = 0; index < 10; index++)
      expect((await api.join({ joinCode: "bad" })).status).toBe(401);
    expect((await api.join()).status).toBe(429);
    time += 60001;
    expect((await api.join()).status).toBe(200);
  });
  it("does not expose signing errors", async () => {
    const api = await setup(
      {},
      {
        mint: () => {
          throw new Error(env.LIVEKIT_API_SECRET);
        },
      },
    );
    const result = await api.join();
    expect(result.status).toBe(500);
    expect(await result.text()).not.toContain(env.LIVEKIT_API_SECRET);
  });
});
