import { describe, it, expect } from "vitest";
import {
  applyAgentEvent,
  initialAgentState,
  isAgentEvent,
} from "./agentProtocol";
import type { AgentState } from "./agentProtocol";
const connected: AgentState = { ...initialAgentState, phase: "connected" };
describe("agent conversation events", () => {
  it("ignores late messages and connection callbacks after stop or failure", () => {
    for (const phase of ["idle", "ended", "error"] as const) {
      const state = { ...initialAgentState, phase };
      expect(
        applyAgentEvent(state, { type: "connected", conversationId: "late" }),
      ).toBe(state);
      expect(
        applyAgentEvent(state, {
          type: "message",
          message: { id: "late", role: "agent", text: "late", at: 1 },
        }),
      ).toBe(state);
    }
  });
  it("preserves a failure when the SDK subsequently disconnects", () => {
    const failed = applyAgentEvent(connected, {
      type: "error",
      code: "permission",
    });
    expect(applyAgentEvent(failed, { type: "ended" })).toBe(failed);
    expect(failed.error).toContain("micrófono");
  });
  it("updates corrected replies and replaces an echoed typed message instead of duplicating it", () => {
    let state = applyAgentEvent(connected, {
      type: "message",
      message: { id: "agent-1", role: "agent", text: "initial", at: 1 },
    });
    state = applyAgentEvent(state, {
      type: "message",
      message: { id: "agent-1", role: "agent", text: "corrected", at: 2 },
    });
    state = applyAgentEvent(state, {
      type: "message",
      message: { id: "typed-1", role: "user", text: "test", at: 3 },
    });
    state = applyAgentEvent(state, {
      type: "message",
      message: { id: "user-2", role: "user", text: "test", at: 4 },
    });
    expect(state.messages.map((m) => m.text)).toEqual(["corrected", "test"]);
    expect(state.messages[1].id).toBe("user-2");
  });
  it("validates delivery IDs and statuses and does not mistake missing speech data for quiet", () => {
    expect(isAgentEvent({ type: "screen", id: "one", stage: "sent" })).toBe(true);
    expect(isAgentEvent({ type: "screen", ok: true })).toBe(false);
    expect(isAgentEvent({ type: "screen", id: "one", stage: "invented" })).toBe(false);
    expect(isAgentEvent({ type: "voice", status: "unknown" })).toBe(true);
    expect(isAgentEvent({ type: "voice", active: false })).toBe(false);
  });
  it("bounds visible message memory and rejects malformed events", () => {
    let state = connected;
    for (let i = 0; i < 205; i++)
      state = applyAgentEvent(state, {
        type: "message",
        message: { id: String(i), role: "agent", text: "test", at: i },
      });
    expect(state.messages.length).toBe(200);
    expect(state.messages[0].id).toBe("5");
    for (const event of [
      null,
      {},
      { type: "message", message: { role: "system", text: "injection" } },
      {
        type: "message",
        message: { id: "1", role: "agent", text: "test", at: NaN },
      },
      { type: "error", code: "raw secret" },
    ])
      expect(isAgentEvent(event)).toBe(false);
  });
});
