// Holds a pause snapshot until it is a good moment to interrupt (ADR-0015):
// the expert has been quiet for `quietMs` and the agent is not speaking.
// A snapshot is a user turn; sent while the expert talks, the agent stays silent and it is wasted.

export class TurnGate<T> {
  private pending: { item: T; at: number; since: number } | null = null;
  private voiceActive = false;
  private lastVoice = -Infinity;
  private agentSpeaking = false;
  private quietMs: number;
  private maxWaitMs: number;
  constructor(quietMs = 1500, maxWaitMs = 20000) {
    this.quietMs = quietMs;
    this.maxWaitMs = maxWaitMs;
  }
  noteVoice(active: boolean, now: number) {
    if (active || this.voiceActive) this.lastVoice = now;
    this.voiceActive = active;
  }
  noteAgentSpeaking(speaking: boolean) {
    this.agentSpeaking = speaking;
  }
  // A newer pause replaces an older one: the latest screen is the one worth asking about.
  offer(item: T, at: number, now: number) {
    this.pending = { item, at, since: now };
  }
  poll(now: number): { item: T; at: number } | null {
    if (!this.pending) return null;
    if (now - this.pending.since > this.maxWaitMs) {
      this.pending = null;
      return null;
    }
    if (this.voiceActive || this.agentSpeaking || now - this.lastVoice < this.quietMs) return null;
    const { item, at } = this.pending;
    this.pending = null;
    return { item, at };
  }
  get waiting() {
    return this.pending !== null;
  }
}
