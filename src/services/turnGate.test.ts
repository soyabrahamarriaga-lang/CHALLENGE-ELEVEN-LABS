import { describe, expect, it } from "vitest";
import { TurnGate } from "./turnGate";

describe("turn gate for pause snapshots", () => {
  it("sends at once when nobody is speaking", () => {
    const gate = new TurnGate<string>();
    gate.offer("frame", 27, 1000);
    expect(gate.poll(1000)).toEqual({ item: "frame", at: 27 });
    expect(gate.poll(1300)).toBeNull();
  });
  it("waits while the expert talks and 1.5 s after they stop", () => {
    const gate = new TurnGate<string>();
    gate.noteVoice(true, 0);
    gate.offer("frame", 27, 100);
    expect(gate.poll(1000)).toBeNull();
    gate.noteVoice(false, 2000);
    expect(gate.poll(3000)).toBeNull();
    expect(gate.poll(3500)).toEqual({ item: "frame", at: 27 });
  });
  it("waits while the agent speaks and keeps only the latest pause", () => {
    const gate = new TurnGate<string>();
    gate.noteAgentSpeaking(true);
    gate.offer("old", 10, 0);
    gate.offer("new", 20, 500);
    expect(gate.poll(1000)).toBeNull();
    gate.noteAgentSpeaking(false);
    expect(gate.poll(1100)).toEqual({ item: "new", at: 20 });
  });
  it("drops a snapshot that waited too long", () => {
    const gate = new TurnGate<string>(1500, 20000);
    gate.noteVoice(true, 0);
    gate.offer("frame", 5, 0);
    expect(gate.waiting).toBe(true);
    gate.noteVoice(false, 25000);
    expect(gate.poll(30000)).toBeNull();
    expect(gate.waiting).toBe(false);
  });
});
