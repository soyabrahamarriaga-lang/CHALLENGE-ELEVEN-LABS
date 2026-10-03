// This document exists only while an explicitly started conversation is active.
// Removing its iframe destroys its browsing context, including pending microphone
// requests and SDK work, without depending on startSession returning first.
import { Conversation } from "@elevenlabs/client";
import type { Conversation as Session } from "@elevenlabs/client";
import { channel } from "./agentProtocol";
import type { AgentEvent, AgentMode } from "./agentProtocol";
let session: Session | null = null;
let sessionKey = "";
let started = false;
const origin = window.location.origin;
function emit(event: AgentEvent) {
  window.parent.postMessage({ channel, sessionKey, event }, origin);
}
function fail(error: unknown) {
  const name =
    error && typeof error === "object" && "name" in error ? error.name : "";
  emit({
    type: "error",
    code:
      name === "NotAllowedError" || name === "PermissionDeniedError"
        ? "permission"
        : "connection",
  });
  void session?.endSession();
}
window.addEventListener("message", async (event) => {
  if (
    event.origin !== origin ||
    event.source !== window.parent ||
    event.data?.channel !== channel
  )
    return;
  const data = event.data;
  if (
    data.type === "start" &&
    !started &&
    typeof data.sessionKey === "string"
  ) {
    const mode: AgentMode = data.mode;
    const access = data.access;
    if (
      !["voice", "text"].includes(mode) ||
      !access ||
      (mode === "voice"
        ? typeof access.conversationToken !== "string"
        : typeof access.signedUrl !== "string")
    )
      return;
    started = true;
    sessionKey = data.sessionKey;
    try {
      session = await Conversation.startSession({
        ...(mode === "voice"
          ? {
              conversationToken: access.conversationToken,
              connectionType: "webrtc" as const,
            }
          : {
              signedUrl: access.signedUrl,
              connectionType: "websocket" as const,
            }),
        textOnly: mode === "text",
        useWakeLock: false,
        clientTools: {},
        onConversationCreated: (created) => {
          session = created;
        },
        onConnect: ({ conversationId }) =>
          emit({ type: "connected", conversationId }),
        onDisconnect: () => emit({ type: "ended" }),
        onError: () => fail(null),
        onModeChange: ({ mode: activity }) =>
          emit({ type: "speaking", speaking: activity === "speaking" }),
        onMessage: (message) =>
          emit({
            type: "message",
            message: {
              id: `${message.role}-${message.response_id || (Number.isFinite(message.event_id) ? message.event_id : crypto.randomUUID())}`,
              role: message.role,
              text: message.message.slice(0, 20000),
              at: Date.now(),
            },
          }),
        onUnhandledClientToolCall: () => {
          emit({ type: "error", code: "tool" });
          void session?.endSession();
        },
        onMCPToolApprovalRequest: () => false,
      });
    } catch (error) {
      fail(error);
    }
  } else if (
    data.sessionKey === sessionKey &&
    session &&
    data.type === "message" &&
    typeof data.text === "string" &&
    data.text.trim().length > 0 &&
    data.text.length <= 4000
  ) {
    try {
      session.sendUserMessage(data.text.trim());
    } catch (error) {
      fail(error);
    }
  } else if (
    data.sessionKey === sessionKey &&
    session &&
    data.type === "activity"
  ) {
    try {
      session.sendUserActivity();
    } catch {
      /* Connection close is reported separately. */
    }
  }
});
window.addEventListener("pagehide", () => {
  void session?.endSession();
});
