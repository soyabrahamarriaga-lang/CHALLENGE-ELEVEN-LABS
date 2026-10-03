import { describe, expect, it } from "vitest";
import { callReducer, initialCall } from "./callMachine";
import type { CallEvent, CallState } from "./types";
const run = (events: CallEvent[], state: CallState = initialCall) =>
  events.reduce(callReducer, state);
const connected = run([{ type: "CONNECT" }, { type: "CONNECTED" }]);
const active = callReducer(connected, { type: "START", consent: true });
describe("consent and connection boundaries", () => {
  it("connecting and reconnecting never start a session", () => {
    const result = run([
      { type: "CONNECT" },
      { type: "CONNECTED" },
      { type: "TICK" },
      { type: "NEXT_QUESTION" },
    ]);
    expect(result.session).toBe("idle");
    expect(result.elapsed).toBe(0);
    expect(result.consent).toBe(false);
  });
  it("requires both consent and a connected agent to start", () => {
    expect(
      callReducer(initialCall, { type: "START", consent: true }).session,
    ).toBe("idle");
    expect(
      callReducer(connected, { type: "START", consent: false }).session,
    ).toBe("idle");
    expect(active.session).toBe("active");
  });
  it("pausing freezes time and questions until explicitly resumed", () => {
    let result = run([{ type: "TICK" }, { type: "PAUSE" }], active);
    result = run(
      [{ type: "TICK" }, { type: "NEXT_QUESTION" }, { type: "TICK" }],
      result,
    );
    expect(result.elapsed).toBe(1);
    expect(result.questionIndex).toBe(0);
    result = run([{ type: "RESUME" }, { type: "TICK" }], result);
    expect(result.elapsed).toBe(2);
  });
  it("a connection error pauses capture, and reconnecting alone does not resume it", () => {
    let result = run(
      [
        { type: "TICK" },
        { type: "ERROR" },
        { type: "RESUME" },
        { type: "TICK" },
      ],
      active,
    );
    expect(result.session).toBe("paused");
    expect(result.elapsed).toBe(1);
    result = run(
      [{ type: "CONNECT" }, { type: "CONNECTED" }, { type: "TICK" }],
      result,
    );
    expect(result.session).toBe("paused");
    expect(result.pauseReason).toBe("connection");
    expect(result.elapsed).toBe(1);
    expect(callReducer(result, { type: "RESUME" }).session).toBe("active");
  });
  it("ending is final even when stale clock and question events arrive", () => {
    const result = run(
      [
        { type: "TICK" },
        { type: "FINISH" },
        { type: "TICK" },
        { type: "RESUME" },
        { type: "NEXT_QUESTION" },
      ],
      active,
    );
    expect(result.session).toBe("ended");
    expect(result.elapsed).toBe(1);
    expect(result.questionIndex).toBe(0);
  });
  it("reset clears session content while retaining independent connection state", () => {
    const result = run(
      [{ type: "EXCLUDE", index: 1 }, { type: "FINISH" }, { type: "RESET" }],
      active,
    );
    expect(result).toEqual({ ...initialCall, connection: "connected" });
  });
});
