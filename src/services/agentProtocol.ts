export type AgentMode = "voice" | "text";
export type AgentPhase =
  | "idle"
  | "authorizing"
  | "connecting"
  | "connected"
  | "ended"
  | "error";
export type AgentAccess = { conversationToken: string } | { signedUrl: string };
export interface AgentMessage {
  id: string;
  role: "user" | "agent";
  text: string;
  at: number;
}
export interface AgentState {
  phase: AgentPhase;
  mode: AgentMode;
  speaking: boolean;
  messages: AgentMessage[];
  error: string;
  conversationId: string;
}
export const initialAgentState: AgentState = {
  phase: "idle",
  mode: "voice",
  speaking: false,
  messages: [],
  error: "",
  conversationId: "",
};
export type AgentEvent =
  | { type: "connected"; conversationId: string }
  | { type: "message"; message: AgentMessage }
  | { type: "speaking"; speaking: boolean }
  | { type: "ended" }
  | { type: "screen"; ok: boolean }
  | { type: "error"; code: "permission" | "connection" | "tool" };
// Screen snapshots the agent accepts per conversation (agent file_input limit, ADR-0012).
export const MAX_SCREEN_FRAMES = 10;
export const SCREEN_LABEL = /^\[PANTALLA \d{2,}:\d{2}\]$/;
export const channel = "userhelper-elevenlabs-v1";
export function isAgentEvent(value: unknown): value is AgentEvent {
  if (!value || typeof value !== "object" || !("type" in value)) return false;
  switch (value.type) {
    case "connected":
      return (
        "conversationId" in value && typeof value.conversationId === "string"
      );
    case "speaking":
      return "speaking" in value && typeof value.speaking === "boolean";
    case "ended":
      return true;
    case "screen":
      return "ok" in value && typeof value.ok === "boolean";
    case "error":
      return (
        "code" in value &&
        ["permission", "connection", "tool"].includes(String(value.code))
      );
    case "message": {
      if (
        !("message" in value) ||
        !value.message ||
        typeof value.message !== "object"
      )
        return false;
      const m = value.message;
      return (
        "id" in m &&
        typeof m.id === "string" &&
        "role" in m &&
        ["user", "agent"].includes(String(m.role)) &&
        "text" in m &&
        typeof m.text === "string" &&
        m.text.length <= 20000 &&
        "at" in m &&
        typeof m.at === "number" &&
        Number.isFinite(m.at)
      );
    }
    default:
      return false;
  }
}
export function applyAgentEvent(
  state: AgentState,
  event: AgentEvent,
): AgentState {
  if (!["connecting", "connected"].includes(state.phase)) return state;
  if (event.type === "connected")
    return {
      ...state,
      phase: "connected",
      conversationId: event.conversationId,
      error: "",
    };
  if (event.type === "speaking") return { ...state, speaking: event.speaking };
  if (event.type === "screen") return state;
  if (event.type === "ended")
    return { ...state, phase: "ended", speaking: false };
  if (event.type === "error")
    return {
      ...state,
      phase: "error",
      speaking: false,
      error:
        event.code === "permission"
          ? "No se autorizó el micrófono. Revisa el permiso o inicia una conversación por texto."
          : event.code === "tool"
            ? "El agente intentó usar una herramienta que esta aplicación todavía no admite. La conversación se detuvo."
            : "No pudimos mantener la conversación. Revisa tu conexión y vuelve a intentarlo.",
    };
  let existing = state.messages.findIndex(
    (message) => message.id === event.message.id,
  );
  if (
    existing < 0 &&
    event.message.role === "user" &&
    !event.message.id.startsWith("typed-")
  )
    existing = state.messages.findIndex(
      (message) =>
        message.id.startsWith("typed-") && message.text === event.message.text,
    );
  const messages =
    existing < 0
      ? [...state.messages, event.message].slice(-200)
      : state.messages.map((message, index) =>
          index === existing ? event.message : message,
        );
  return { ...state, messages };
}
