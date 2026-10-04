import { ElevenLabsError, getAgentConfiguration } from "./elevenlabs.mjs";

export const AVAILABILITY_CACHE_MS = 15000;
export const AVAILABILITY_VALID_MS = 30000;
const publicReasons = new Set([
  "agent_access_denied", "agent_not_found", "agent_busy", "agent_unavailable",
  "agent_invalid_response", "agent_timeout", "agent_quota_exceeded",
]);
const failure = (error) => publicReasons.has(error?.code) ? error.code : "agent_unavailable";

// Read-only reachability: never mint session credentials here. In particular,
// WebRTC token creation can reserve provider capacity even without an SDK client.
// Admission/quota and the actual connection are confirmed only on explicit start.
export async function probeAgentAvailability(config, fetcher = fetch) {
  const agent = await getAgentConfiguration(config, fetcher);
  if (agent?.agent_id !== config.agentId || !agent.conversation_config ||
    typeof agent.conversation_config !== "object" || Array.isArray(agent.conversation_config))
    throw new ElevenLabsError("agent_invalid_response");
  if (agent.platform_settings?.archived === true)
    throw new ElevenLabsError("agent_archived");
  const textOnly = agent.conversation_config.conversation?.text_only === true;
  return {
    availability: textOnly ? "limited" : "available",
    reason: null,
    defaultLanguage: ['es', 'en'].includes(agent.conversation_config.agent?.language)
      ? agent.conversation_config.agent.language : null,
    selectableLanguages: ['es', 'en'].filter((language) =>
      language === agent.conversation_config.agent?.language ||
      (agent.platform_settings?.overrides?.conversation_config_override?.agent?.language === true &&
        Object.hasOwn(agent.conversation_config.language_presets || {}, language))),
    modes: {
      voice: { available: !textOnly, reason: textOnly ? "agent_text_only" : null },
      text: { available: true, reason: null },
    },
  };
}

export function createAgentAvailability(config, {
  configured = config.ready,
  requiresCode = true,
  probe = () => probeAgentAvailability(config),
  now = Date.now,
} = {}) {
  let cached;
  let inFlight;
  const format = (entry) => ({
    configured, requiresCode, ...entry.result,
    checkedAt: entry.checkedAt,
    validForMs: Math.max(0, AVAILABILITY_VALID_MS - (now() - entry.completedAt)),
  });
  return async () => {
    if (!configured) {
      return {
        configured: false, requiresCode, availability: "unconfigured",
        reason: "agent_not_configured", checkedAt: null, validForMs: 0,
        modes: { voice: { available: false, reason: "agent_not_configured" },
          text: { available: false, reason: "agent_not_configured" } },
      };
    }
    if (cached && now() - cached.completedAt < AVAILABILITY_CACHE_MS) return format(cached);
    if (!inFlight) {
      inFlight = (async () => {
        let result;
        try {
          result = await probe();
        } catch (error) {
          const reason = error?.code === "agent_archived" ? "agent_archived" : failure(error);
          result = { availability: "unavailable", reason,
            modes: { voice: { available: false, reason }, text: { available: false, reason } } };
        }
        const completedAt = now();
        cached = { result, completedAt, checkedAt: new Date(completedAt).toISOString() };
        return cached;
      })().finally(() => { inFlight = undefined; });
    }
    return format(await inFlight);
  };
}
