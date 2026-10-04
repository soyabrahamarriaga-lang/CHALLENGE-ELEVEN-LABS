import { describe, expect, it } from "vitest";
import { VoiceActivity } from "./voiceActivity";
describe("provider speech detection", () => {
  it("requires a real quiet signal; missing or stale data is never silence", () => {
    const voice = new VoiceActivity();
    expect(voice.status(0)).toBe("unknown");
    voice.score(0.1, 0);
    expect(voice.status(300)).toBe("unknown");
    voice.score(0.1, 500);
    expect(voice.status(500)).toBe("quiet");
    expect(voice.status(3100)).toBe("unknown");
  });
  it("holds a short gap in speech but releases after observed quiet", () => {
    const voice = new VoiceActivity();
    voice.score(0.9, 0);
    expect(voice.status(0)).toBe("speech");
    voice.score(0.1, 100);
    voice.score(0.1, 300);
    expect(voice.status(300)).toBe("speech");
    voice.score(0.9, 350);
    voice.score(0.1, 400);
    voice.score(0.1, 850);
    expect(voice.status(850)).toBe("quiet");
  });
  it("rejects malformed scores and does not infer quiet from uncertain scores", () => {
    const voice = new VoiceActivity();
    for (const score of [NaN, Infinity, -1, 2]) voice.score(score, 0);
    expect(voice.status(100)).toBe("unknown");
    voice.score(0.5, 200);
    expect(voice.status(1000)).toBe("unknown");
  });
});
