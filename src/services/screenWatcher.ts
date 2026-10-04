// Watches a shared screen every second, OCRs only the area that changed and reports text
// changes. Frames never leave the browser; only the text (and pause snapshots) are sent on.
import {
  PauseDetector,
  changedBox,
  grayGrid,
  grow,
  meaningful,
  overlaps,
  summarize,
} from "./screenDiff";
import type { Box, OcrLine } from "./screenDiff";
import type { Worker } from "tesseract.js";

export type ScreenEvent = { at: number; text: string };
export type WatchStatus = "loading" | "watching" | "ended" | "error";
type Handlers = {
  onEvent: (event: ScreenEvent) => void;
  onPause: (frame: Blob, at: number) => void;
  onStatus: (status: WatchStatus) => void;
};
type Options = { intervalMs?: number; maxWidth?: number; now?: () => number };

const union = (a: Box, b: Box): Box => {
  const x = Math.min(a.x, b.x);
  const y = Math.min(a.y, b.y);
  return { x, y, w: Math.max(a.x + a.w, b.x + b.w) - x, h: Math.max(a.y + a.h, b.y + b.h) - y };
};

export async function startScreenWatch(stream: MediaStream, handlers: Handlers, options: Options = {}) {
  const { intervalMs = 1000, maxWidth = 1600 } = options;
  const started = performance.now();
  const now = options.now || (() => (performance.now() - started) / 1000);
  let stopped = false;
  let worker: Worker | null = null;
  let timer: ReturnType<typeof setInterval> | undefined;
  const video = document.createElement("video");
  video.muted = true;
  video.playsInline = true;
  video.srcObject = stream;
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d", { willReadFrequently: true });
  const snapshot = document.createElement("canvas");
  const snapshotContext = snapshot.getContext("2d");
  if (!context || !snapshotContext) throw new Error("canvas-unavailable");

  const stop = () => {
    if (stopped) return;
    stopped = true;
    clearInterval(timer);
    for (const track of stream.getTracks()) track.stop();
    video.srcObject = null;
    void worker?.terminate();
    handlers.onStatus("ended");
  };
  for (const track of stream.getVideoTracks()) track.addEventListener("ended", stop);

  handlers.onStatus("loading");
  await video.play();
  // Loaded on demand: the OCR engine and Spanish/English data download once and stay cached.
  const { createWorker } = await import("tesseract.js");
  const ready = await createWorker(["spa", "eng"]);
  if (stopped) {
    void ready.terminate();
    return { stop };
  }
  worker = ready;

  let previous: ReturnType<typeof grayGrid> | null = null;
  let pending: Box | null = null;
  let lines: OcrLine[] = [];
  let busy = false;
  let first = true;
  const pause = new PauseDetector(3);

  async function read(region: Box): Promise<OcrLine[]> {
    const { data } = await worker!.recognize(
      snapshot,
      { rectangle: { left: region.x, top: region.y, width: region.w, height: region.h } },
      { blocks: true },
    );
    const found: OcrLine[] = [];
    for (const block of data.blocks || [])
      for (const paragraph of block.paragraphs)
        for (const line of paragraph.lines)
          found.push({
            text: line.text,
            box: { x: line.bbox.x0, y: line.bbox.y0, w: line.bbox.x1 - line.bbox.x0, h: line.bbox.y1 - line.bbox.y0 },
          });
    return found;
  }

  async function tick() {
    if (stopped || video.readyState < 2 || !video.videoWidth) return;
    const scale = Math.min(1, maxWidth / video.videoWidth);
    const width = Math.round(video.videoWidth * scale);
    const height = Math.round(video.videoHeight * scale);
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = snapshot.width = width;
      canvas.height = snapshot.height = height;
      previous = null;
      lines = [];
      first = true;
    }
    context!.drawImage(video, 0, 0, width, height);
    const grid = grayGrid(context!.getImageData(0, 0, width, height).data, width, height);
    const at = now();
    const box = previous
      ? changedBox(previous.gray, grid.gray, grid.gridWidth, grid.gridHeight)
      : { x: 0, y: 0, w: grid.gridWidth, h: grid.gridHeight };
    previous = grid;
    if (pause.feed(Boolean(box) && !first, at))
      canvas.toBlob((blob) => blob && !stopped && handlers.onPause(blob, at), "image/jpeg", 0.8);
    if (box) pending = pending ? union(pending, box) : box;
    // While OCR runs, changes accumulate in `pending` and are read on the next free tick.
    if (!pending || busy) return;

    const area = grow(pending, 2, grid.gridWidth, grid.gridHeight);
    pending = null;
    const left = Math.floor(area.x * grid.scale);
    const top = Math.floor(area.y * grid.scale);
    const region = {
      x: left,
      y: top,
      w: Math.min(width, Math.ceil((area.x + area.w) * grid.scale)) - left,
      h: Math.min(height, Math.ceil((area.y + area.h) * grid.scale)) - top,
    };
    busy = true;
    snapshotContext!.drawImage(canvas, 0, 0);
    try {
      const after = await read(region);
      if (stopped) return;
      const before = lines.filter((line) => overlaps(line.box, region));
      lines = [...lines.filter((line) => !overlaps(line.box, region)), ...after];
      const text = first
        ? after
            .map((line) => line.text.replace(/\s+/g, " ").trim())
            .filter(meaningful)
            .slice(0, 25)
            .join(" | ")
            .slice(0, 900)
        : summarize(before, after);
      if (text) handlers.onEvent({ at, text: first ? `pantalla inicial: ${text}` : text });
      first = false;
    } catch {
      if (!stopped) handlers.onStatus("error");
    } finally {
      busy = false;
    }
  }

  timer = setInterval(() => void tick(), intervalMs);
  handlers.onStatus("watching");
  void tick();
  return { stop };
}
