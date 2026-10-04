import { buildProcessFlow, flowToCanvas, flowEvidenceMarkdown, flowMarkdown } from './processFlowCore.mjs';
export { buildProcessFlow, parseFlowEvidence, flowClock, flowToCanvas, flowEvidenceMarkdown, flowMarkdown } from './processFlowCore.mjs';
import { writeProcessCatalog } from "./vaultCatalog.mjs";
import { createHash, randomUUID } from "node:crypto";
import {
  readFile,
  writeFile,
  rename,
  lstat,
  realpath,
  unlink,
} from "node:fs/promises";
import { join, sep } from "node:path";

const hash = (text) => createHash("sha256").update(text).digest("hex");
const locks = new Map();
async function serial(key, fn) {
  const previous = locks.get(key) || Promise.resolve();
  const next = previous.catch(() => {}).then(fn);
  locks.set(key, next);
  try {
    return await next;
  } finally {
    if (locks.get(key) === next) locks.delete(key);
  }
}
async function readPrivate(dir, name) {
  const file = join(dir, name);
  const info = await lstat(file).catch((e) => {
    if (e.code === "ENOENT") return null;
    throw e;
  });
  if (!info) return null;
  if (!info.isFile() || info.isSymbolicLink() || info.size > 8 * 1024 * 1024)
    throw new Error("invalid-flow-source");
  return readFile(file, "utf8");
}
async function atomic(dir, name, text) {
  const file = join(dir, name);
  const temp = `${file}.${randomUUID()}.tmp`;
  try {
    await writeFile(temp, text, { encoding: "utf8", flag: "wx" });
    await rename(temp, file);
  } finally {
    await unlink(temp).catch(() => {});
  }
}

// Only fixed filenames are accessed. Preserve an Obsidian canvas edited by a person.
export async function ensureProcessFlow(root, folder, id) {
  if (
    !/^[A-Za-z0-9_-]{1,80}$/.test(id) ||
    !/^[A-Za-z0-9_-]{1,110}$/.test(folder) ||
    !folder.endsWith("-" + id)
  )
    throw new Error("invalid-flow-id");
  const base = await realpath(root);
  const dir = join(base, "Sesiones", folder);
  if (
    !(await realpath(dir)).startsWith(base + sep) ||
    (await lstat(dir)).isSymbolicLink()
  )
    throw new Error("path-outside-vault");
  return serial(dir, async () => {
    const transcript = await readPrivate(dir, "transcripcion.md");
    if (transcript === null) return null;
    const events = (await readPrivate(dir, "eventos.md")) || "";
    const storedText = await readPrivate(dir, "process-flow.json");
    let stored;
    try {
      stored = storedText ? JSON.parse(storedText) : null;
    } catch {
      throw new Error("invalid-flow-file");
    }
    const extractionText = await readPrivate(dir, "extraccion-proceso.json");
    const capturesText = await readPrivate(dir, "capturas.json");
    const metadataText = await readPrivate(dir, "proceso-metadata.json");
    const extraction = extractionText ? JSON.parse(extractionText) : null;
    const captures = capturesText ? JSON.parse(capturesText) : [];
    const metadata = metadataText ? JSON.parse(metadataText) : {};
    const canvasText = await readPrivate(dir, "flujo.canvas");
    const canvasEdited =
      canvasText !== null &&
      (!stored?.canvasDigest || hash(canvasText) !== stored.canvasDigest);
    if (
      stored?.version === 2 &&
      stored.generatorVersion === 5 &&
      stored.sourceDigest ===
        hash(
          JSON.stringify({
            transcript,
            events,
            extraction,
            captures,
            metadata,
          }),
        )
    ) {
      if (canvasText === null)
        await atomic(
          dir,
          "flujo.canvas",
          JSON.stringify(flowToCanvas(stored), null, 2) + "\n",
        );
      if ((await readPrivate(dir, "evidencia-flujo.md")) === null)
        await atomic(dir, "evidencia-flujo.md", flowEvidenceMarkdown(stored));
      if ((await readPrivate(dir, "mapa-generado.md")) === null)
        await atomic(dir, "mapa-generado.md", flowMarkdown(stored));
      const catalog = await writeProcessCatalog(
        base,
        stored,
        flowMarkdown(stored),
      );
      return {
        ...stored,
        canvasEdited,
        catalogPath: catalog.path,
        catalogEdited: catalog.edited,
      };
    }
    const flow = buildProcessFlow({
      id,
      folder,
      transcript,
      events,
      extraction,
      captures,
      metadata,
    });
    const canvas = JSON.stringify(flowToCanvas(flow), null, 2) + "\n";
    flow.canvasDigest = canvasEdited
      ? stored?.canvasDigest || ""
      : hash(canvas);
    await atomic(dir, "evidencia-flujo.md", flowEvidenceMarkdown(flow));
    await atomic(dir, "mapa-generado.md", flowMarkdown(flow));
    if (!canvasEdited) await atomic(dir, "flujo.canvas", canvas);
    await atomic(
      dir,
      "process-flow.json",
      JSON.stringify(flow, null, 2) + "\n",
    );
    const catalog = await writeProcessCatalog(base, flow, flowMarkdown(flow));
    return {
      ...flow,
      canvasEdited,
      catalogPath: catalog.path,
      catalogEdited: catalog.edited,
    };
  });
}
