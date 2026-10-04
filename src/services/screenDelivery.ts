export type DeliveryStage = "uploading" | "waiting" | "sent" | "failed" | "cancelled" | "limit";
export type ScreenRequest = { id: string; frame: Blob; label: string; manual?: boolean };
export type DeliveryUpdate = { id: string; stage: DeliveryStage };
// Upload confirmation and message dispatch are separate from local capture/storage.
// Re-check speech after upload; cancelled/stopped requests may never speak later.
export class ScreenDelivery {
  private current: (ScreenRequest & { fileId?: string }) | null = null;
  private attempts = 0;
  constructor(private options: {
    upload: (frame: Blob) => Promise<{ fileId: string }>;
    send: (label: string, fileId: string) => void;
    canSend: () => boolean;
    emit: (event: DeliveryUpdate) => void;
    limit: number;
  }) {}
  async offer(request: ScreenRequest) {
    this.cancel();
    if (this.attempts >= this.options.limit) {
      this.options.emit({ id: request.id, stage: "limit" }); return;
    }
    // Failed/ambiguous uploads count conservatively: never exceed provider quota.
    this.attempts++;
    const current: ScreenRequest & { fileId?: string } = { ...request };
    this.current = current;
    this.options.emit({ id: current.id, stage: "uploading" });
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      const { fileId } = await Promise.race([
        this.options.upload(current.frame),
        new Promise<never>((_, reject) => { timer = setTimeout(() => reject(new Error("upload-timeout")), 12000); }),
      ]);
      if (this.current !== current) return;
      if (!fileId) throw new Error("missing-file-id");
      current.fileId = fileId;
      this.options.emit({ id: current.id, stage: "waiting" });
      this.flush();
    } catch {
      if (this.current !== current) return;
      this.current = null;
      this.options.emit({ id: current.id, stage: "failed" });
    } finally { clearTimeout(timer); }
  }
  flush() {
    const current = this.current;
    if (!current?.fileId || (!current.manual && !this.options.canSend())) return;
    this.current = null;
    try {
      this.options.send(current.label, current.fileId);
      this.options.emit({ id: current.id, stage: "sent" });
    } catch { this.options.emit({ id: current.id, stage: "failed" }); }
  }
  sendNow(id: string) {
    if (this.current?.id !== id) return;
    this.current.manual = true;
    this.flush();
  }
  cancel() {
    const current = this.current;
    this.current = null;
    if (current) this.options.emit({ id: current.id, stage: "cancelled" });
  }
}
