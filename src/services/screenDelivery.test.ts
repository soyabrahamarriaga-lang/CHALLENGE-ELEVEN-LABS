import { afterEach, describe, expect, it, vi } from "vitest";
import { ScreenDelivery } from "./screenDelivery";
const frame = new Blob(["fixture"], { type: "image/jpeg" });
const request = { id: "one", frame, label: "[PANTALLA 00:05]" };
function setup(upload = vi.fn().mockResolvedValue({ fileId: "file-one" })) {
  const send = vi.fn(), emit = vi.fn(), canSend = vi.fn(() => true);
  return { send, emit, canSend, upload, delivery: new ScreenDelivery({ upload, send, emit, canSend, limit: 2 }) };
}
afterEach(() => vi.useRealTimers());
describe("image upload and turn dispatch", () => {
  it("reports sent only after successful upload and dispatch", async () => {
    const s = setup(); await s.delivery.offer(request);
    expect(s.send).toHaveBeenCalledWith(request.label, "file-one");
    expect(s.emit.mock.calls.map(([e]) => e.stage)).toEqual(["uploading", "waiting", "sent"]);
    s.delivery.flush(); expect(s.send).toHaveBeenCalledTimes(1);
  });
  it("does not speak if the user starts talking while upload is pending", async () => {
    let finish!: (value: { fileId: string }) => void;
    const s = setup(vi.fn(() => new Promise((resolve) => { finish = resolve; })));
    const done = s.delivery.offer(request);
    s.canSend.mockReturnValue(false); finish({ fileId: "file-one" }); await done;
    expect(s.send).not.toHaveBeenCalled();
    s.canSend.mockReturnValue(true); s.delivery.flush();
    expect(s.upload).toHaveBeenCalledTimes(1);
    expect(s.send).toHaveBeenCalledTimes(1);
  });
  it("cancels an upload after screen changes or sharing stops, even if upload finishes later", async () => {
    let finish!: (value: { fileId: string }) => void;
    const s = setup(vi.fn(() => new Promise((resolve) => { finish = resolve; })));
    const done = s.delivery.offer(request); s.delivery.cancel();
    finish({ fileId: "late" }); await done; s.delivery.flush();
    expect(s.send).not.toHaveBeenCalled();
    expect(s.emit).not.toHaveBeenCalledWith(expect.objectContaining({ stage: "sent" }));
  });
  it("shows failure instead of counting a broken upload and bounds retry attempts", async () => {
    const s = setup(vi.fn().mockRejectedValue(new Error("upload failed")));
    await s.delivery.offer(request); await s.delivery.offer({ ...request, id: "two" });
    await s.delivery.offer({ ...request, id: "three" });
    expect(s.send).not.toHaveBeenCalled(); expect(s.upload).toHaveBeenCalledTimes(2);
    expect(s.emit).toHaveBeenLastCalledWith({ id: "three", stage: "limit" });
  });
  it("allows an explicit user picture request when speech detection is unavailable", async () => {
    const s = setup(); s.canSend.mockReturnValue(false);
    await s.delivery.offer({ ...request, manual: true }); expect(s.send).toHaveBeenCalledTimes(1);
  });
  it("can manually release an already-uploaded picture without using another upload", async () => {
    const s = setup(); s.canSend.mockReturnValue(false);
    await s.delivery.offer(request);
    s.delivery.sendNow("wrong"); expect(s.send).not.toHaveBeenCalled();
    s.delivery.sendNow("one");
    expect(s.send).toHaveBeenCalledTimes(1); expect(s.upload).toHaveBeenCalledTimes(1);
  });
  it("times out a hanging upload and ignores a late resolution", async () => {
    vi.useFakeTimers();
    let finish!: (value: { fileId: string }) => void;
    const s = setup(vi.fn(() => new Promise((resolve) => { finish = resolve; })));
    const done = s.delivery.offer(request); await vi.advanceTimersByTimeAsync(12000); await done;
    expect(s.emit).toHaveBeenLastCalledWith({ id: "one", stage: "failed" });
    finish({ fileId: "late" }); await Promise.resolve(); s.delivery.flush();
    expect(s.send).not.toHaveBeenCalled();
  });
});
