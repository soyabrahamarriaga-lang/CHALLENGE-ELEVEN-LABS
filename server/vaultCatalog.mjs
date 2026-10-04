import { createHash } from "node:crypto";
import { unlink } from "node:fs/promises";
import { join } from "node:path";
import {
  privateDirectory,
  readLocal,
  writeLocal,
  mediaLock,
} from "./vaultMedia.mjs";
import { PROCESS_CATALOG } from "./processCatalog.mjs";
const digest = (text) => createHash("sha256").update(text).digest("hex");
export const processSlug = (value) =>
  String(value || "por-clasificar")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 70) || "por-clasificar";
export async function writeProcessCatalog(root, flow, note) {
  const department = processSlug(flow.department),
    family = processSlug(flow.taskType);
  const dir = await privateDirectory(root, "Procesos", department, family);
  const name = processSlug(flow.title) + "--" + flow.id + ".md";
  const relative = `Procesos/${department}/${family}/${name}`;
  const session = await privateDirectory(root, "Sesiones", flow.folder);
  return mediaLock(session + "-catalog", async () => {
    const pointer = await readLocal(session, "catalogo-enlace.json");
    const previous = pointer ? JSON.parse(pointer.toString()) : null;
    const existing = await readLocal(dir, name);
    // A manually edited process note is preserved just like a manually edited Canvas.
    if (
      existing &&
      (!previous ||
        previous.path !== relative ||
        digest(existing) !== previous.digest)
    )
      return { path: relative, edited: true };
    await writeLocal(dir, name, note);
    if (
      previous?.path &&
      previous.path !== relative &&
      /^Procesos\/[a-z0-9-]+\/[a-z0-9-]+\/[A-Za-z0-9_.-]+\.md$/.test(
        previous.path,
      )
    ) {
      const parts = previous.path.split("/");
      const oldDir = await privateDirectory(root, ...parts.slice(0, -1));
      const old = await readLocal(oldDir, parts.at(-1));
      if (old && digest(old) === previous.digest)
        await unlink(join(oldDir, parts.at(-1)));
    }
    await writeLocal(
      session,
      "catalogo-enlace.json",
      JSON.stringify({ path: relative, digest: digest(note) }, null, 2) + "\n",
    );
    return { path: relative, edited: false };
  });
}
export async function readProcessCatalog(root) {
  const data = await readLocal(root, "catalogo-procesos.json");
  if (!data) {
    await writeLocal(
      root,
      "catalogo-procesos.json",
      JSON.stringify(PROCESS_CATALOG, null, 2) + "\n",
    );
    return PROCESS_CATALOG;
  }
  const value = JSON.parse(data.toString());
  if (
    !Array.isArray(value.departments) ||
    !value.departments.every((d) => typeof d === "string") ||
    !Array.isArray(value.families) ||
    !value.families.every(
      (f) =>
        f &&
        typeof f.id === "string" &&
        typeof f.name === "string" &&
        Array.isArray(f.activities),
    )
  )
    throw new Error("invalid-catalog");
  return value;
}
export async function writeProcessIndex(root, processes) {
  const dir = await privateDirectory(root, "Procesos");
  const text =
    "# Procesos de UserHelper\n\nÍndice generado por UserHelper. Edita nombre, departamento y tipo de tarea desde el mapa. Las fuentes de cada ejecución se conservan en Sesiones.\n\n" +
    processes
      .filter((p) => p.catalogPath)
      .map(
        (p) =>
          `- [[${p.catalogPath.replace(/\.md$/, "")}|${p.title.replace(/[\[\]|]/g, "")}]] — ${p.department} · ${p.taskType} · ${p.steps} acciones\n`,
      )
      .join("");
  await writeLocal(dir, "Indice-generado.md", text);
}
