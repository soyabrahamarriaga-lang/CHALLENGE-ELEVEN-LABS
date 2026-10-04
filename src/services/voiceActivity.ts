// Provider speech probability, not microphone loudness. Missing/stale signals are
// unknown, never proof of silence. Text conversations do not need this detector.
export type VoiceStatus = "speech" | "quiet" | "unknown";
export class VoiceActivity {
  private at = -Infinity;
  private active = false;
  private quietSince: number | null = null;
  score(score: number, now: number) {
    if (!Number.isFinite(score) || score < 0 || score > 1) return;
    this.at = now;
    if (score >= 0.6) { this.active = true; this.quietSince = null; }
    else if (score <= 0.35) {
      this.quietSince ??= now;
      if (now - this.quietSince >= 400) this.active = false;
    } else this.quietSince = null;
  }
  status(now: number): VoiceStatus {
    if (now - this.at > 2500) return "unknown";
    // Require observed quiet, including at connection startup.
    if (!this.active && (this.quietSince === null || now - this.quietSince < 400)) return "unknown";
    return this.active ? "speech" : "quiet";
  }
}
