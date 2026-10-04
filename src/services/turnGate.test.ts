import { describe, expect, it } from "vitest";
import { TurnGate } from "./turnGate";
describe("safe picture turns", () => {
  it("can send text-session pictures without microphone data", () => {
    const gate = new TurnGate<string>();
    gate.offer("frame", 27);
    expect(gate.poll(1000)).toEqual({ item: "frame", at: 27 });
    expect(gate.poll(1300)).toBeNull();
  });
  it("waits for a known speech ending plus a quiet gap", () => {
    const gate = new TurnGate<string>(700, true);
    gate.offer("frame", 27);
    expect(gate.status(0)).toBe("voice-unavailable");
    gate.noteVoice("speech", 0);
    expect(gate.poll(1000)).toBeNull();
    gate.noteVoice("quiet", 2000);
    expect(gate.poll(2600)).toBeNull();
    expect(gate.poll(2700)).toEqual({ item: "frame", at: 27 });
  });
  it("retains the latest unchanged screen during a 45-second explanation", () => {
    const gate = new TurnGate<string>(700, true);
    gate.noteVoice("speech", 0);
    gate.offer("old", 5);
    gate.clear();
    gate.offer("latest", 29);
    gate.noteVoice("speech", 44000);
    expect(gate.poll(44000)).toBeNull();
    gate.noteVoice("quiet", 45000);
    expect(gate.poll(45700)).toEqual({ item: "latest", at: 29 });
  });
  it("invalidates a moving screen and waits for the agent response", () => {
    const gate = new TurnGate<string>();
    gate.offer("old", 5); gate.clear();
    expect(gate.poll(9000)).toBeNull();
    gate.offer("new", 10); gate.noteUserTurn(10000);
    expect(gate.poll(10500)).toBeNull();
    gate.noteAgentSpeaking(true);
    expect(gate.poll(15000)).toBeNull();
    gate.noteAgentSpeaking(false);
    expect(gate.poll(15100)?.item).toBe("new");
  });
  it("never interprets a stopped VAD stream as silence", () => {
    const gate = new TurnGate<string>(700, true);
    gate.noteVoice("quiet", 1000); gate.offer("image", 2);
    expect(gate.status(4000)).toBe("voice-unavailable");
    expect(gate.poll(4000)).toBeNull();
    gate.noteVoice("unknown", 4100);
    expect(gate.poll(4200)).toBeNull();
    gate.noteVoice("quiet", 4500);
    expect(gate.poll(4500)?.item).toBe("image");
  });
});
