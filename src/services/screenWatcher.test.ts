import { afterEach, describe, expect, it, vi } from "vitest";
const engine = vi.hoisted(() => ({ createWorker: vi.fn() }));
vi.mock("tesseract.js", () => engine);
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); vi.clearAllMocks(); });
function setup() {
  const track = { stop: vi.fn(), addEventListener: vi.fn() };
  const stream = { getTracks: () => [track], getVideoTracks: () => [track] } as unknown as MediaStream;
  const context = { drawImage: vi.fn(), getImageData: () => ({ data: new Uint8ClampedArray(160 * 80 * 4).fill(255) }) };
  vi.stubGlobal("document", { createElement: (tag: string) => tag === "video" ? { muted: false, playsInline: false, srcObject: null, readyState: 4, videoWidth: 160, videoHeight: 80, play: async () => {} } : { width: 0, height: 0, getContext: () => context, toBlob: (callback: (b: Blob) => void) => callback(new Blob(["fake"], { type: "image/jpeg" })) } });
  return { stream, track, handlers: { onStatus: vi.fn(), onEvent: vi.fn(), onPause: vi.fn(), onChange: vi.fn() } };
}
describe("screen capture lifecycle", () => {
  it("sends the initial static screen at its first pause without requiring a click", async () => {
    vi.useFakeTimers(); const s = setup(); const worker = { recognize: vi.fn().mockResolvedValue({ data: { blocks: [] } }), terminate: vi.fn() }; engine.createWorker.mockResolvedValue(worker);
    const { startScreenWatch } = await import("./screenWatcher");
    const watcher = await startScreenWatch(s.stream, s.handlers, { now: () => Date.now() / 1000 });
    await vi.advanceTimersByTimeAsync(2500);
    expect(s.handlers.onPause).toHaveBeenCalledTimes(1);
    expect(await watcher.captureNow()).toBeInstanceOf(Blob);
    watcher.stop(); expect(await watcher.captureNow()).toBeNull();
    await vi.advanceTimersByTimeAsync(3000); expect(s.handlers.onPause).toHaveBeenCalledTimes(1);
  });
  it("can stop while OCR downloads and never starts a late capture", async () => {
    const s = setup(); const abort = new AbortController();
    let ready!: (w: any) => void;
    engine.createWorker.mockImplementation(() => new Promise((resolve) => { ready = resolve; }));
    const { startScreenWatch } = await import("./screenWatcher");
    const pending = startScreenWatch(s.stream, s.handlers, { signal: abort.signal });
    await vi.waitFor(() => expect(engine.createWorker).toHaveBeenCalled());
    abort.abort(); const worker = { terminate: vi.fn(), recognize: vi.fn() }; ready(worker); await pending;
    expect(s.track.stop).toHaveBeenCalled(); expect(worker.terminate).toHaveBeenCalled();
    expect(worker.recognize).not.toHaveBeenCalled(); expect(s.handlers.onPause).not.toHaveBeenCalled();
    expect(s.handlers.onStatus).not.toHaveBeenCalledWith("watching");
  });
});
