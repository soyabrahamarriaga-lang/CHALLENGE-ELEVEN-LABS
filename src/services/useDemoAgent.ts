import { useEffect, useReducer, useRef } from "react";
import { callReducer, initialCall } from "../domain/callMachine";
// Demo adapter: deliberately has no media, network, or ElevenLabs calls.
export function useDemoAgent() {
  const [state, dispatch] = useReducer(callReducer, initialCall);
  const connectionTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (state.connection !== "connecting") return;
    connectionTimer.current = setTimeout(
      () => dispatch({ type: "CONNECTED" }),
      1400,
    );
    return () => {
      if (connectionTimer.current) clearTimeout(connectionTimer.current);
    };
  }, [state.connection]);
  useEffect(() => {
    if (state.session !== "active" || state.connection !== "connected") return;
    const timer = setInterval(() => dispatch({ type: "TICK" }), 1000);
    return () => clearInterval(timer);
  }, [state.session, state.connection]);
  useEffect(() => {
    if (state.session !== "active" || state.connection !== "connected") return;
    const timer = setInterval(() => dispatch({ type: "NEXT_QUESTION" }), 22000);
    return () => clearInterval(timer);
  }, [state.session, state.connection]);
  return { state, dispatch };
}
