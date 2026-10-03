import type { CallState, CallEvent } from "./types";
export const initialCall: CallState = {
  connection: "disconnected",
  session: "idle",
  elapsed: 0,
  consent: false,
  questionIndex: 0,
  excluded: [],
  pauseReason: null,
};
export function callReducer(state: CallState, event: CallEvent): CallState {
  switch (event.type) {
    case "CONNECT":
      return state.connection === "connected" ||
        state.connection === "connecting"
        ? state
        : { ...state, connection: "connecting" };
    case "CONNECTED":
      return { ...state, connection: "connected" };
    case "DISCONNECT":
    case "ERROR":
      return {
        ...state,
        connection: event.type === "ERROR" ? "error" : "disconnected",
        session: state.session === "active" ? "paused" : state.session,
        pauseReason:
          state.session === "active" ? "connection" : state.pauseReason,
      };
    case "START":
      return state.connection === "connected" &&
        event.consent &&
        state.session === "idle"
        ? {
            ...state,
            session: "active",
            consent: true,
            elapsed: 0,
            pauseReason: null,
          }
        : state;
    case "PAUSE":
      return state.session === "active"
        ? { ...state, session: "paused", pauseReason: "user" }
        : state;
    case "RESUME":
      return state.session === "paused" && state.connection === "connected"
        ? { ...state, session: "active", pauseReason: null }
        : state;
    case "TICK":
      return state.session === "active" && state.connection === "connected"
        ? { ...state, elapsed: state.elapsed + 1 }
        : state;
    case "FINISH":
      return state.session === "active" || state.session === "paused"
        ? { ...state, session: "ended" }
        : state;
    case "RESET":
      return { ...initialCall, connection: state.connection };
    case "NEXT_QUESTION":
      return state.session === "active"
        ? { ...state, questionIndex: (state.questionIndex + 1) % 3 }
        : state;
    case "EXCLUDE":
      return state.excluded.includes(event.index)
        ? state
        : { ...state, excluded: [...state.excluded, event.index] };
    default:
      return state;
  }
}
export function timeLabel(seconds: number) {
  const value = Math.max(0, Math.floor(seconds));
  return (
    String(Math.floor(value / 60)).padStart(2, "0") +
    ":" +
    String(value % 60).padStart(2, "0")
  );
}
