import { createHash, randomUUID } from "node:crypto";
import {
  mkdir,
  lstat,
  readFile,
  writeFile,
  rename,
  realpath,
  unlink,
} from "node:fs/promises";
import { join, sep } from "node:path";
export const MAX_IMAGE_BYTES = 3 * 1024 * 1024;
const locks = new Map();
export async function mediaLock(dir, fn) {
  const before = locks.get(dir) || Promise.resolve();
  const next = before.catch(() => {}).then(fn);
  locks.set(dir, next);
  try {
    return await next;
  } finally {
    if (locks.get(dir) === next) locks.delete(dir);
  }
}
export async function privateDirectory(root, ...parts) {
  const base = await realpath(root);
  let path = base;
  for (const part of parts) {
    if (!/^[A-Za-z0-9_-]{1,140}$/.test(part))
      throw new Error("invalid-private-path");
    path = join(path, part);
    await mkdir(path, { recursive: true });
    if (
      (await lstat(path)).isSymbolicLink() ||
      !(await realpath(path)).startsWith(base + sep)
    )
      throw new Error("invalid-private-path");
  }
  return path;
}
export async function readLocal(dir, name, max = 8 * 1024 * 1024) {
  if (!/^[A-Za-z0-9_.-]{1,180}$/.test(name))
    throw new Error("invalid-private-file");
  const path = join(dir, name);
  const st = await lstat(path).catch((e) => {
    if (e.code === "ENOENT") return null;
    throw e;
  });
  if (!st) return null;
  if (!st.isFile() || st.isSymbolicLink() || st.size > max)
    throw new Error("invalid-private-file");
  return readFile(path);
}
export async function writeLocal(dir, name, data) {
  if (!/^[A-Za-z0-9_.-]{1,180}$/.test(name) || name === "." || name === "..")
    throw new Error("invalid-private-file");
  const temp = join(dir, `.${randomUUID()}.tmp`);
  try {
    await writeFile(temp, data, { flag: "wx", mode: 0o600 });
    await rename(temp, join(dir, name));
  } finally {
    await unlink(temp).catch(() => {});
  }
}
export function imageType(bytes) {
  if (
    bytes.length >= 3 &&
    bytes[0] === 0xff &&
    bytes[1] === 0xd8 &&
    bytes[2] === 0xff
  )
    return { mime: "image/jpeg", ext: "jpg" };
  if (
    bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
  )
    return { mime: "image/png", ext: "png" };
  if (
    bytes.toString("ascii", 0, 4) === "RIFF" &&
    bytes.toString("ascii", 8, 12) === "WEBP"
  )
    return { mime: "image/webp", ext: "webp" };
  throw new Error("unsupported-image");
}
export async function saveCapture(
  root,
  folder,
  { data, at, source = "capture" },
) {
  if (
    !Number.isFinite(at) ||
    at < 0 ||
    at > 86400 ||
    !Buffer.isBuffer(data) ||
    data.length > MAX_IMAGE_BYTES ||
    data.length < 12
  )
    throw new Error("invalid-capture");
  const dir = await privateDirectory(root, "Sesiones", folder);
  const captures = await privateDirectory(root, "Sesiones", folder, "capturas");
  const type = imageType(data);
  const digest = createHash("sha256").update(data).digest("hex").slice(0, 24);
  const id = `frame-${Math.round(at * 1000)}-${digest}`;
  return mediaLock(dir, async () => {
    const content = await readLocal(dir, "capturas.json");
    const manifest = content ? JSON.parse(content.toString()) : [];
    const existing = manifest.find((x) => x.id === id);
    if (existing) return existing;
    if (manifest.length >= 300) throw new Error("capture-limit");
    const entry = {
      id,
      at: Math.round(at * 1000) / 1000,
      file: `capturas/${id}.${type.ext}`,
      mime: type.mime,
      source,
    };
    await writeLocal(captures, `${id}.${type.ext}`, data);
    manifest.push(entry);
    manifest.sort((a, b) => a.at - b.at);
    await writeLocal(
      dir,
      "capturas.json",
      JSON.stringify(manifest, null, 2) + "\n",
    );
    return entry;
  });
}
export async function getCapture(root, folder, id) {
  if (!/^frame-[0-9]+-[a-f0-9]{24}$/.test(id))
    throw new Error("invalid-capture-id");
  const dir = await privateDirectory(root, "Sesiones", folder);
  const content = await readLocal(dir, "capturas.json");
  const entry = content
    ? JSON.parse(content.toString()).find((x) => x.id === id)
    : null;
  if (!entry) return null;
  if (!new RegExp(`^capturas/${id}\\.(jpg|png|webp)$`).test(entry.file))
    throw new Error("invalid-private-path");
  const captures = await privateDirectory(root, "Sesiones", folder, "capturas");
  const data = await readLocal(
    captures,
    entry.file.split("/")[1],
    MAX_IMAGE_BYTES,
  );
  if (!data) return null;
  return { ...entry, data, mime: imageType(data).mime };
}
export async function recoverConversationImages(
  root,
  folder,
  conversation,
  fetcher = fetch,
) {
  let recovered = 0,
    failed = 0;
  for (const turn of conversation.transcript || []) {
    const files = turn.file_inputs?.length
      ? turn.file_inputs
      : turn.file_input
        ? [turn.file_input]
        : [];
    for (const file of files) {
      if (!file.mime_type?.startsWith("image/")) continue;
      try {
        const url = new URL(file.file_url);
        if (
          url.protocol !== "https:" ||
          url.username ||
          url.password ||
          url.hostname !== "storage.googleapis.com"
        )
          throw new Error("untrusted-image-host");
        const response = await fetcher(url, {
          redirect: "error",
          signal: AbortSignal.timeout(15000),
        });
        if (!response.ok) throw new Error("image-unavailable");
        if (Number(response.headers.get("content-length")) > MAX_IMAGE_BYTES)
          throw new Error("image-too-large");
        const chunks = [];
        let size = 0;
        for await (const chunk of response.body) {
          size += chunk.length;
          if (size > MAX_IMAGE_BYTES) throw new Error("image-too-large");
          chunks.push(chunk);
        }
        // Explicit screen labels use capture time; message time may be later due to turn gating.
        const label = String(turn.message || "").match(
          /\[PANTALLA (\d+):(\d{2})\]/,
        );
        const at = label
          ? Number(label[1]) * 60 + Number(label[2])
          : turn.time_in_call_secs || 0;
        await saveCapture(root, folder, {
          data: Buffer.concat(chunks),
          at,
          source: "elevenlabs",
        });
        recovered++;
      } catch {
        failed++;
      }
    }
  }
  return { recovered, failed };
}
