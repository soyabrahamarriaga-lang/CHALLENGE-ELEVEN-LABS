// Pure helpers for the 1-second screen transcription (ADR-0013). No DOM, so they are unit-tested.

export type Box = { x: number; y: number; w: number; h: number };
export type OcrLine = { text: string; box: Box };

// Downsampled grayscale grid of an RGBA frame; cheap enough to run every second.
export function grayGrid(rgba: Uint8ClampedArray, width: number, height: number, gridWidth = 160) {
  const scale = width / gridWidth;
  const gridHeight = Math.max(1, Math.round(height / scale));
  const gray = new Uint8Array(gridWidth * gridHeight);
  for (let gy = 0; gy < gridHeight; gy++)
    for (let gx = 0; gx < gridWidth; gx++) {
      const x = Math.min(width - 1, Math.floor((gx + 0.5) * scale));
      const y = Math.min(height - 1, Math.floor((gy + 0.5) * scale));
      const i = (y * width + x) * 4;
      gray[gy * gridWidth + gx] = (rgba[i] * 299 + rgba[i + 1] * 587 + rgba[i + 2] * 114) / 1000;
    }
  return { gray, gridWidth, gridHeight, scale };
}

// Bounding box (in grid units) of the cells whose mean difference exceeds the threshold.
// Cells of `cell` grid pixels ignore a blinking caret or anti-aliasing noise.
export function changedBox(
  previous: Uint8Array,
  current: Uint8Array,
  gridWidth: number,
  gridHeight: number,
  cell = 4,
  threshold = 16,
): Box | null {
  if (previous.length !== current.length) return { x: 0, y: 0, w: gridWidth, h: gridHeight };
  let x0 = Infinity, y0 = Infinity, x1 = -1, y1 = -1;
  for (let cy = 0; cy < gridHeight; cy += cell)
    for (let cx = 0; cx < gridWidth; cx += cell) {
      let sum = 0, count = 0;
      for (let y = cy; y < Math.min(cy + cell, gridHeight); y++)
        for (let x = cx; x < Math.min(cx + cell, gridWidth); x++) {
          sum += Math.abs(previous[y * gridWidth + x] - current[y * gridWidth + x]);
          count++;
        }
      if (sum / count > threshold) {
        x0 = Math.min(x0, cx);
        y0 = Math.min(y0, cy);
        x1 = Math.max(x1, Math.min(cx + cell, gridWidth));
        y1 = Math.max(y1, Math.min(cy + cell, gridHeight));
      }
    }
  return x1 < 0 ? null : { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
}

export function grow(box: Box, by: number, maxW: number, maxH: number): Box {
  const x = Math.max(0, box.x - by);
  const y = Math.max(0, box.y - by);
  return { x, y, w: Math.min(maxW, box.x + box.w + by) - x, h: Math.min(maxH, box.y + box.h + by) - y };
}

export function overlaps(a: Box, b: Box) {
  return a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
}

const clean = (text: string) => text.replace(/\s+/g, " ").trim();
// OCR noise: lines that are mostly symbols or a single character.
export const meaningful = (text: string) => {
  const value = clean(text);
  return value.length >= 2 && (value.match(/[\p{L}\p{N}]/gu) || []).length >= Math.min(3, value.length * 0.5);
};

export type LineDiff = { changed: Array<[string, string]>; added: string[]; removed: string[] };

// Pairs a removed and an added line when they sit on the same row (same field, new value).
export function diffLines(before: OcrLine[], after: OcrLine[]): LineDiff {
  const keep = (lines: OcrLine[]) =>
    lines.filter((line) => meaningful(line.text)).map((line) => ({ ...line, text: clean(line.text) }));
  const old = keep(before);
  const now = keep(after);
  const oldTexts = new Set(old.map((line) => line.text));
  const nowTexts = new Set(now.map((line) => line.text));
  const removed = old.filter((line) => !nowTexts.has(line.text));
  const added = now.filter((line) => !oldTexts.has(line.text));
  const changed: Array<[string, string]> = [];
  for (const line of [...added]) {
    const middle = line.box.y + line.box.h / 2;
    const index = removed.findIndex(
      (r) => Math.abs(r.box.y + r.box.h / 2 - middle) <= Math.max(r.box.h, line.box.h) * 0.6,
    );
    if (index >= 0) {
      changed.push([removed[index].text, line.text]);
      removed.splice(index, 1);
      added.splice(added.indexOf(line), 1);
    }
  }
  return { changed, added: added.map((line) => line.text), removed: removed.map((line) => line.text) };
}

// Short Spanish description sent to the agent as context and stored in eventos.md.
export function describe(diff: LineDiff, max = 600): string {
  const parts = [
    ...diff.changed.map(([from, to]) => `cambió «${from}» → «${to}»`),
    ...diff.added.map((text) => `aparece «${text}»`),
    ...diff.removed.map((text) => `desaparece «${text}»`),
  ];
  const text = parts.join("; ");
  return text.length > max ? text.slice(0, max - 1) + "…" : text;
}

// Scrolling or opening another view changes many lines at once; pairing them row by row
// produces nonsense, so report the new content instead.
export function summarize(before: OcrLine[], after: OcrLine[], massChange = 6, max = 600): string {
  const diff = diffLines(before, after);
  const total = diff.changed.length + diff.added.length + diff.removed.length;
  if (total <= massChange) return describe(diff, max);
  const seen = new Set(before.map((line) => clean(line.text)));
  const fresh = after.map((line) => clean(line.text)).filter((text) => meaningful(text) && !seen.has(text));
  if (!fresh.length) return "";
  const text = "vista nueva o desplazamiento: " + fresh.slice(0, 8).join(" | ");
  return text.length > max ? text.slice(0, max - 1) + "…" : text;
}

// A pause = the screen changed and then stayed still for `stillSeconds`.
export class PauseDetector {
  private dirty = false;
  private stillSince = 0;
  private stillSeconds: number;
  constructor(stillSeconds = 3) {
    this.stillSeconds = stillSeconds;
  }
  feed(changed: boolean, nowSeconds: number): boolean {
    if (changed) {
      this.dirty = true;
      this.stillSince = nowSeconds;
      return false;
    }
    if (this.dirty && nowSeconds - this.stillSince >= this.stillSeconds) {
      this.dirty = false;
      return true;
    }
    return false;
  }
}

export function clock(seconds: number) {
  const total = Math.max(0, Math.floor(seconds));
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}
