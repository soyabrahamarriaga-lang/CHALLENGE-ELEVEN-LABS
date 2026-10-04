const API = "https://api.elevenlabs.io";

export class ElevenLabsError extends Error {
  constructor(code, status = 502) {
    super(code);
    this.code = code;
    this.status = status;
  }
}

export function readElevenLabsConfig(env = process.env) {
  const apiKey = (env.ELEVENLABS_API_KEY || "").trim();
  const agentId = (env.ELEVENLABS_AGENT_ID || "").trim();
  return {
    apiKey,
    agentId,
    ready: Boolean(
      apiKey && !/\s/.test(apiKey) && /^[a-zA-Z0-9_-]{1,100}$/.test(agentId),
    ),
  };
}

async function request(config, path, fetcher) {
  if (!config.ready) throw new ElevenLabsError("agent_not_configured", 503);
  let response;
  try {
    response = await fetcher(API + path, {
      method: "GET",
      headers: { "xi-api-key": config.apiKey, Accept: "application/json" },
      redirect: "error",
      cache: "no-store",
      signal: AbortSignal.timeout(10000),
    });
  } catch (error) {
    throw new ElevenLabsError(error?.name === "TimeoutError" ? "agent_timeout" : "agent_unavailable");
  }
  if (!response.ok) {
    const code =
      response.status === 401 || response.status === 403
        ? "agent_access_denied"
        : response.status === 402
          ? "agent_quota_exceeded"
        : response.status === 404
          ? "agent_not_found"
          : response.status === 429
            ? "agent_busy"
            : "agent_unavailable";
    throw new ElevenLabsError(code, response.status === 429 ? 429 : 502);
  }
  try {
    return await response.json();
  } catch {
    throw new ElevenLabsError("agent_invalid_response");
  }
}

// Server-side inspection. Do not return raw prompts, tools or account data to clients.
export async function getAgentConfiguration(
  config,
  fetcher = (input, init) => fetch(input, init),
) {
  return request(
    config,
    "/v1/convai/agents/" + encodeURIComponent(config.agentId),
    fetcher,
  );
}

// Temporary credentials only. The project API key never crosses into the browser.
export async function getConversationAccess(
  config,
  transport,
  fetcher = (input, init) => fetch(input, init),
) {
  if (!["webrtc", "websocket"].includes(transport))
    throw new ElevenLabsError("invalid_transport", 400);
  const route = transport === "webrtc" ? "token" : "get-signed-url";
  const body = await request(
    config,
    "/v1/convai/conversation/" +
      route +
      "?agent_id=" +
      encodeURIComponent(config.agentId),
    fetcher,
  );
  if (
    transport === "webrtc" &&
    typeof body?.token === "string" &&
    body.token.length > 0
  )
    return { conversationToken: body.token };
  if (transport === "websocket" && typeof body?.signed_url === "string") {
    try {
      const url = new URL(body.signed_url);
      if (
        url.protocol === "wss:" &&
        !url.username &&
        !url.password &&
        [
          "api.elevenlabs.io",
          "api.us.elevenlabs.io",
          "api.eu.elevenlabs.io",
          "api.in.elevenlabs.io",
        ].includes(url.hostname) &&
        url.pathname === "/v1/convai/conversation"
      )
        return { signedUrl: body.signed_url };
    } catch {
      /* Never pass an unexpected destination to the client. */
    }
  }
  throw new ElevenLabsError("agent_invalid_response");
}
