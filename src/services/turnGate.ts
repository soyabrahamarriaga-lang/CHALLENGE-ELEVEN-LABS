import type { VoiceStatus } from "./voiceActivity";
export type GateStatus = "idle" | "voice-unavailable" | "speech" | "agent" | "settling" | "ready";
// Only the latest unchanged screen is retained. New visual activity invalidates it;
// a long explanation does not silently discard it. No upload until a safe turn.
export class TurnGate<T> {
  private pending: { item: T; at: number } | null = null;
  private voice: VoiceStatus;
  private voiceAt = -Infinity;
  private lastVoice = -Infinity;
  private agentSpeaking = false;
  private responseUntil = -Infinity;
  constructor(private quietMs = 700, private requireVoice = false) {
    this.voice = requireVoice ? "unknown" : "quiet";
  }
  noteVoice(status: VoiceStatus, now: number) {
    if (status === "speech" || this.voice === "speech") this.lastVoice = now;
    this.voice = status;
    this.voiceAt = now;
  }
  noteAgentSpeaking(speaking: boolean) {
    this.agentSpeaking = speaking;
    if (speaking) this.responseUntil = -Infinity;
  }
  // Give a verbal answer priority over an automatically generated picture turn.
  noteUserTurn(now: number) { this.responseUntil = now + 3500; }
  offer(item: T, at: number) { this.pending = { item, at }; }
  clear() { this.pending = null; }
  status(now: number): GateStatus {
    if (!this.pending) return "idle";
    if (this.requireVoice && (this.voice === "unknown" || now - this.voiceAt > 2500)) return "voice-unavailable";
    if (this.voice === "speech") return "speech";
    if (this.agentSpeaking || now < this.responseUntil) return "agent";
    if (now - this.lastVoice < this.quietMs) return "settling";
    return "ready";
  }
  poll(now: number): { item: T; at: number } | null {
    if (this.status(now) !== "ready") return null;
    const ready = this.pending;
    this.pending = null;
    return ready;
  }
  get waiting() { return this.pending !== null; }
}
