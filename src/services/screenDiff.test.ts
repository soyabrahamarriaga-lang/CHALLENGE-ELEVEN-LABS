import { describe as suite, expect, it } from "vitest";
import {
  PauseDetector,
  changedBox,
  clock,
  describe,
  diffLines,
  grayGrid,
  grow,
  meaningful,
  overlaps,
  substantial,
  summarize,
  within,
} from "./screenDiff";

const line = (text: string, y: number, x = 360) => ({ text, box: { x, y, w: 540, h: 36 } });

suite("screen change detection", () => {
  it("downsamples an RGBA frame to a grayscale grid", () => {
    const rgba = new Uint8ClampedArray(320 * 200 * 4).fill(255);
    const grid = grayGrid(rgba, 320, 200, 160);
    expect(grid.gridWidth).toBe(160);
    expect(grid.gridHeight).toBe(100);
    expect(grid.scale).toBe(2);
    expect(grid.gray.every((value) => value === 255)).toBe(true);
  });

  it("finds the changed area and ignores identical frames and tiny noise", () => {
    const w = 40, h = 20;
    const before = new Uint8Array(w * h).fill(200);
    expect(changedBox(before, before.slice(), w, h)).toBeNull();
    const caret = before.slice();
    caret[5 * w + 5] = 0; // one pixel: mean over a 4x4 cell stays under the threshold
    expect(changedBox(before, caret, w, h)).toBeNull();
    const after = before.slice();
    for (let y = 8; y < 12; y++) for (let x = 20; x < 32; x++) after[y * w + x] = 20;
    expect(changedBox(before, after, w, h)).toEqual({ x: 20, y: 8, w: 12, h: 4 });
    expect(changedBox(before, new Uint8Array(10), w, h)).toEqual({ x: 0, y: 0, w, h });
  });

  it("grows boxes within bounds and tests overlap", () => {
    expect(grow({ x: 2, y: 2, w: 4, h: 4 }, 5, 10, 10)).toEqual({ x: 0, y: 0, w: 10, h: 10 });
    expect(overlaps({ x: 0, y: 0, w: 5, h: 5 }, { x: 4, y: 4, w: 5, h: 5 })).toBe(true);
    expect(overlaps({ x: 0, y: 0, w: 5, h: 5 }, { x: 5, y: 0, w: 5, h: 5 })).toBe(false);
    const band = { x: 0, y: 100, w: 1280, h: 100 };
    expect(within({ x: 40, y: 130, w: 500, h: 30 }, band)).toBe(true);
    expect(within({ x: 40, y: 99, w: 500, h: 30 }, band)).toBe(false); // cut by the top edge
    expect(within({ x: 40, y: 180, w: 500, h: 30 }, band)).toBe(false); // cut by the bottom edge
  });
});

suite("screen transcription text", () => {
  it("reports a field whose value changed on the same row", () => {
    const diff = diffLines(
      [line("Centro de costos 4711 (opex)", 440), line("Importe EUR 7,200.00", 300)],
      [line("Centro de costos 0400 (capex)", 442), line("Importe EUR 7,200.00", 300)],
    );
    expect(diff).toEqual({
      changed: [["Centro de costos 4711 (opex)", "Centro de costos 0400 (capex)"]],
      added: [],
      removed: [],
    });
    expect(describe(diff)).toBe("cambió «Centro de costos 4711 (opex)» → «Centro de costos 0400 (capex)»");
  });

  it("reports new and vanished lines and drops OCR noise", () => {
    const diff = diffLines(
      [line("Factura 4470", 90), line("|", 200)],
      [line("Factura 4471", 90), line("Guardado  correctamente", 700), line("~", 760)],
    );
    expect(diff.changed).toEqual([["Factura 4470", "Factura 4471"]]);
    expect(diff.added).toEqual(["Guardado correctamente"]);
    expect(diff.removed).toEqual([]);
    expect(meaningful("|")).toBe(false);
    expect(meaningful("—— ·")).toBe(false);
    expect(meaningful("OK")).toBe(true);
    expect(describe({ changed: [], added: ["x".repeat(50)], removed: [] }, 20)).toHaveLength(20);
  });

  it("detects a pause once the screen stays still after a change, only once per change", () => {
    const pause = new PauseDetector(3);
    expect(pause.feed(false, 1)).toBe(false); // nothing changed yet
    expect(pause.feed(true, 2)).toBe(false);
    expect(pause.feed(false, 3)).toBe(false);
    expect(pause.feed(false, 4)).toBe(false);
    expect(pause.feed(false, 5)).toBe(true);
    expect(pause.feed(false, 9)).toBe(false);
    expect(clock(185)).toBe("03:05");
  });
});

suite("scroll and whole-view changes", () => {
  it("summarizes many changed lines as new content instead of pairing them", () => {
    const before = Array.from({ length: 10 }, (_, i) => line(`Mensaje anterior número ${i}`, 100 + i * 40));
    const after = [
      ...before.slice(5).map((l, i) => ({ ...l, box: { ...l.box, y: 100 + i * 40 } })),
      ...Array.from({ length: 5 }, (_, i) => line(`Orden de compra OC-${100 + i}`, 300 + i * 40)),
    ];
    const text = summarize(before, after);
    expect(text.startsWith("vista nueva o desplazamiento: Orden de compra OC-100 | Orden de compra OC-101")).toBe(true);
    expect(text).not.toContain("Mensaje anterior");
    expect(text).not.toContain("cambió");
  });
  it("keeps the precise field change when only a few lines change", () => {
    expect(summarize([line("Centro de costos 4711", 440)], [line("Centro de costos 0400", 440)])).toBe(
      "cambió «Centro de costos 4711» → «Centro de costos 0400»",
    );
    const same = Array.from({ length: 10 }, (_, i) => line(`Fila ${i} igual`, i * 40));
    expect(summarize(same, same)).toBe("");
  });
});

suite("fragment filter", () => {
  it("drops cut words and half-typed values but keeps real changes", () => {
    expect(substantial("nes")).toBe(false);
    expect(substantial("Rechaz;")).toBe(true);
    expect(substantial("OC-0007")).toBe(true);
    const diff = diffLines(
      [line("Comentario (obligatorio si rechaza)", 400), line("Aprobaciones abiertas", 100)],
      [line("Se rechaza por antigüedad", 401), line("ow", 100), line("kh", 700)],
    );
    expect(diff.changed).toEqual([
      ["Comentario (obligatorio si rechaza)", "Se rechaza por antigüedad"],
      ["Aprobaciones abiertas", "ow"],
    ]);
    expect(diff.added).toEqual([]);
  });
});

