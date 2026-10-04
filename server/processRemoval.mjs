import { readdir } from "node:fs/promises";
import { resolve } from "node:path";
import { mediaLock, privateDirectory, readLocal, writeLocal } from "./vaultMedia.mjs";

const ID = /^[A-Za-z0-9_-]{1,80}$/;

// Shared by HTTP, polling and tutor updates in the local backend. Originals stay
// in the vault; the durable marker also survives a restart or provider reimport.
export const withProcessLock = (root, work) => mediaLock(resolve(root) + "-processes", work);
export async function isProcessRemoved(root, id) {
  if (!ID.test(id || "")) return false;
  const dir = await privateDirectory(root, "Retirados");
  return Boolean(await readLocal(dir, id + ".json"));
}
export async function removedProcessIds(root) {
  const dir = await privateDirectory(root, "Retirados");
  return (await readdir(dir)).filter((name) => name.endsWith(".json") && ID.test(name.slice(0, -5))).map((name) => name.slice(0, -5));
}
export async function markProcessRemoved(root, id) {
  if (!ID.test(id || "")) throw new Error("invalid-id");
  const dir = await privateDirectory(root, "Retirados");
  if (!await isProcessRemoved(root, id))
    await writeLocal(dir, id + ".json", JSON.stringify({ id, removedAt: new Date().toISOString() }) + "\n");
}
