import { createServer } from "node:http";
import { createHash, timingSafeEqual, randomUUID } from "node:crypto";
import { pathToFileURL } from "node:url";
import { AccessToken, TrackSource } from "livekit-server-sdk";
import { createAgentAvailability } from "./agentAvailability.mjs";
import {
  ElevenLabsError,
  getConversationAccess,
  readElevenLabsConfig,
} from "./elevenlabs.mjs";

export function readConfig(env = process.env) {
  const url = env.LIVEKIT_URL || "";
  let validUrl = false;
  try {
    const parsed = new URL(url);
    validUrl =
      !parsed.username &&
      !parsed.password &&
      !parsed.search &&
      !parsed.hash &&
      (parsed.protocol === "wss:" ||
        (parsed.protocol === "ws:" &&
          ["localhost", "127.0.0.1", "[::1]"].includes(parsed.hostname)));
  } catch {
    /* A missing URL is reported as configuration unavailable. */
  }
  const config = {
    url,
    apiKey: env.LIVEKIT_API_KEY || "",
    apiSecret: env.LIVEKIT_API_SECRET || "",
    joinCode: env.LIVEKIT_JOIN_CODE || "",
    // Local demo only: start the agent without the team code (ADR-0014).
    openAgent: env.AGENT_OPEN_ACCESS === "true",
    room: env.LIVEKIT_ROOM || "userhelper-team",
    origin: env.APP_ORIGIN || "http://127.0.0.1:5173",
  };
  return {
    ...config,
    ready: Boolean(
      validUrl &&
      config.apiKey &&
      config.apiSecret &&
      config.joinCode.length >= 16 &&
      /^[a-zA-Z0-9_-]{1,64}$/.test(config.room),
    ),
  };
}
function sameSecret(given, expected) {
  const digest = (value) => createHash("sha256").update(value).digest();
  return timingSafeEqual(digest(given), digest(expected));
}
function send(res, status, body) {
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff",
  });
  res.end(JSON.stringify(body));
}
async function readBody(req) {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > 4096) throw new Error("body-too-large");
    chunks.push(chunk);
  }
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

// Shared room passphrase is a hackathon access gate, not individual user authentication.
// The signing key and secret never cross this process boundary.
export function createHandler(config = readConfig(), options = {}) {
  const profile = (agentConfig, access, availability) => ({
    config: agentConfig,
    availability: availability || createAgentAvailability(agentConfig, {
      configured: Boolean(agentConfig.ready && (config.openAgent || config.joinCode.length >= 16)),
      requiresCode: !config.openAgent,
    }),
    access: access || ((mode) => getConversationAccess(
      agentConfig, mode === "voice" ? "webrtc" : "websocket",
    )),
  });
  // Two fixed server-side targets with independent health caches. Never accept
  // an arbitrary agent ID from the browser or fall back from tutor to expert.
  const expert = profile(options.agentConfig || readElevenLabsConfig(),
    options.agentAccess, options.agentAvailability);
  const tutor = profile(options.tutorConfig || readElevenLabsConfig(process.env, "intern"),
    options.tutorAccess, options.tutorAvailability);
  const attempts = new Map();
  const now = options.now || Date.now;
  const mint =
    options.mint ||
    (async (name) => {
      const token = new AccessToken(config.apiKey, config.apiSecret, {
        identity: "participant-" + randomUUID(),
        name,
        ttl: "5m",
      });
      token.addGrant({
        roomJoin: true,
        room: config.room,
        canSubscribe: true,
        canPublish: true,
        canPublishData: false,
        canPublishSources: [
          TrackSource.MICROPHONE,
          TrackSource.CAMERA,
          TrackSource.SCREEN_SHARE,
        ],
      });
      return token.toJwt();
    });
  return async (req, res) => {
    try {
      const path = (req.url || "").split("?")[0];
      const isTutor = path.startsWith("/api/elevenlabs/tutor/");
      const agent = isTutor ? tutor : expert;
      const agentPath = isTutor ? path.replace("/api/elevenlabs/tutor/", "/api/elevenlabs/") : path;
      if (agentPath === "/api/elevenlabs/availability") {
        if (req.method !== "GET") return send(res, 405, { error: "method_not_allowed" });
        if (req.headers["sec-fetch-site"] === "cross-site" ||
          (req.headers.origin && req.headers.origin !== config.origin))
          return send(res, 403, { error: "origin_not_allowed" });
        return send(res, 200, await agent.availability());
      }
      if (req.method === "GET" && agentPath === "/api/elevenlabs/status")
        return send(res, 200, {
          configured: Boolean(
            agent.config.ready &&
            (config.openAgent || config.joinCode.length >= 16),
          ),
          requiresCode: !config.openAgent,
        });
      if (req.method === "GET" && path === "/api/livekit/status") {
        send(res, 200, {
          configured: config.ready,
          roomName: config.ready ? config.room : null,
        });
        return;
      }
      const isAgent = agentPath === "/api/elevenlabs/session";
      if (path !== "/api/livekit/token" && !isAgent)
        return send(res, 404, { error: "not_found" });
      if (req.method !== "POST")
        return send(res, 405, { error: "method_not_allowed" });
      if (
        req.headers.origin !== config.origin ||
        req.headers["sec-fetch-site"] === "cross-site"
      )
        return send(res, 403, { error: "origin_not_allowed" });
      if (!req.headers["content-type"]?.startsWith("application/json"))
        return send(res, 415, { error: "json_required" });
      if (
        !(isAgent
          ? agent.config.ready &&
            (config.openAgent || config.joinCode.length >= 16)
          : config.ready)
      )
        return send(res, 503, { error: "not_configured" });
      const time = now();
      for (const [key, item] of attempts)
        if (time - item.start >= 60000) attempts.delete(key);
      // Do not trust a client-supplied forwarding header for this limiter.
      const ip = req.socket.remoteAddress || "unknown";
      if (!attempts.has(ip) && attempts.size >= 1000)
        return send(res, 429, { error: "rate_limited" });
      const attempt = attempts.get(ip) || { start: time, count: 0 };
      attempt.count += 1;
      attempts.set(ip, attempt);
      if (attempt.count > 10) return send(res, 429, { error: "rate_limited" });
      let body;
      try {
        body = await readBody(req);
      } catch {
        return send(res, 400, { error: "invalid_request" });
      }
      if (
        !body ||
        typeof body !== "object" ||
        typeof body.displayName !== "string" ||
        typeof body.joinCode !== "string" ||
        body.joinCode.length > 256 ||
        body.consent !== true
      )
        return send(res, 400, { error: "invalid_request" });
      const displayName = body.displayName.trim();
      if (
        !displayName ||
        displayName.length > 60 ||
        /[\u0000-\u001f\u007f]/.test(displayName)
      )
        return send(res, 400, { error: "invalid_name" });
      if (
        !(isAgent && config.openAgent) &&
        !sameSecret(body.joinCode, config.joinCode)
      )
        return send(res, 401, { error: "invalid_code" });
      if (isAgent) {
        if (!["voice", "text"].includes(body.mode))
          return send(res, 400, { error: "invalid_mode" });
        return send(res, 200, await agent.access(body.mode));
      }
      const participantToken = await mint(displayName);
      send(res, 200, {
        serverUrl: config.url,
        participantToken,
        roomName: config.room,
        participantName: displayName,
      });
    } catch (error) {
      if (error instanceof ElevenLabsError)
        return send(res, error.status, { error: error.code });
      send(res, 500, { error: "token_unavailable" });
    }
  };
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  const port = Number(process.env.LIVEKIT_TOKEN_PORT || 3001);
  const host = process.env.LIVEKIT_TOKEN_HOST || "127.0.0.1";
  const server = createServer(createHandler());
  server.requestTimeout = 10000;
  server.headersTimeout = 10000;
  server.listen(port, host, () =>
    console.log(`UserHelper token service listening on ${host}:${port}`),
  );
}
