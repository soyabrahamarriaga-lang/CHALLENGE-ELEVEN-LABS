// This document exists only while an explicitly started conversation is active.
// Removing its iframe destroys its browsing context, including pending microphone
// requests and SDK work, without depending on startSession returning first.
import { VoiceActivity } from "./voiceActivity";
import { ScreenDelivery } from "./screenDelivery";
import { Conversation } from "@elevenlabs/client";
import type { Conversation as Session } from "@elevenlabs/client";
import { MAX_SCREEN_FRAMES, SCREEN_LABEL, channel } from "./agentProtocol";
import type { AgentEvent, AgentMode } from "./agentProtocol";
let session: Session | null = null;
let sessionKey = "";
let started = false;
let voiceTimer: ReturnType<typeof setInterval> | undefined;
let voice = new VoiceActivity();
let voiceMode = false;
let agentSpeaking = false;
let lastSpeech = -Infinity;
let responseUntil = -Infinity;
let delivery: ScreenDelivery | null = null;
function watchVoice() {
  voiceTimer = setInterval(() => {
    const now = Date.now();
    const status = voiceMode ? voice.status(now) : "quiet";
    if (status === "speech") lastSpeech = now;
    emit({ type: "voice", status });
    delivery?.flush();
  }, 150);
}
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
      (data.overrideLanguage !== undefined && !["es", "en"].includes(data.overrideLanguage)) ||
      !access ||
      (mode === "voice"
        ? typeof access.conversationToken !== "string"
        : typeof access.signedUrl !== "string")
    )
      return;
    started = true;
    sessionKey = data.sessionKey;
    voiceMode = mode === "voice";
    voice = new VoiceActivity();
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
        ...(data.overrideLanguage ? { overrides: { agent: { language: data.overrideLanguage } } } : {}),
        textOnly: mode === "text",
        useWakeLock: false,
        clientTools: {},
        onConversationCreated: (created) => {
          session = created;
          delivery = new ScreenDelivery({
            upload: (blob) => created.uploadFile(blob),
            send: (label, fileId) => {
              if (session !== created) throw new Error("session-ended");
              created.sendMultimodalMessage({ text: label, fileIds: [fileId] });
            },
            canSend: () => !agentSpeaking && Date.now() >= responseUntil &&
              (!voiceMode || (voice.status(Date.now()) === "quiet" && Date.now() - lastSpeech >= 700)),
            emit: (update) => emit({ type: "screen", ...update }),
            limit: MAX_SCREEN_FRAMES,
          });
        },
        onConnect: ({ conversationId }) => {
          emit({ type: "connected", conversationId });
          watchVoice();
        },
        onDisconnect: () => {
          clearInterval(voiceTimer);
          delivery?.cancel();
          session = null;
          emit({ type: "ended" });
        },
        onError: () => fail(null),
        onVadScore: ({ vadScore }) => voice.score(vadScore, Date.now()),
        onModeChange: ({ mode: activity }) => {
          agentSpeaking = activity === "speaking";
          if (agentSpeaking) responseUntil = -Infinity;
          emit({ type: "speaking", speaking: agentSpeaking });
        },
        onMessage: (message) => {
          if (message.role === "user" && !SCREEN_LABEL.test(message.message)) responseUntil = Date.now() + 3500;
          emit({
            type: "message",
            message: {
              id: `${message.role}-${message.response_id || (Number.isFinite(message.event_id) ? message.event_id : crypto.randomUUID())}`,
              role: message.role,
              text: message.message.slice(0, 20000),
              at: Date.now(),
            },
          });
        },
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
      responseUntil = Date.now() + 3500;
      session.sendUserMessage(data.text.trim());
    } catch (error) {
      fail(error);
    }
  } else if (
    data.sessionKey === sessionKey &&
    session &&
    data.type === "context" &&
    typeof data.text === "string" &&
    data.text.trim().length > 0 &&
    data.text.length <= 2000
  ) {
    // Screen text every second: informs the agent without starting a turn (ADR-0013).
    try {
      session.sendContextualUpdate(data.text.trim());
    } catch {
      /* Connection close is reported separately. */
    }
  } else if (
    data.sessionKey === sessionKey &&
    session &&
    data.type === "screen" &&
    data.frame instanceof Blob &&
    data.frame.size <= 5_000_000 &&
    /^image\/(jpeg|png|webp)$/.test(data.frame.type) &&
    typeof data.label === "string" &&
    SCREEN_LABEL.test(data.label) &&
    typeof data.id === "string" && /^[a-zA-Z0-9-]{1,80}$/.test(data.id)
  ) {
    void delivery?.offer({ id: data.id, frame: data.frame, label: data.label, manual: data.manual === true });
  } else if (data.sessionKey === sessionKey && data.type === "send-screen-now" && typeof data.id === "string") {
    delivery?.sendNow(data.id);
  } else if (data.sessionKey === sessionKey && data.type === "cancel-screen") {
    delivery?.cancel();
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
  clearInterval(voiceTimer);
  delivery?.cancel();
  void session?.endSession();
});
