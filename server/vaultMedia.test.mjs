import { describe, it, expect, afterEach } from "vitest";
import { mkdtemp, rm, symlink, mkdir, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  saveCapture,
  getCapture,
  recoverConversationImages,
  MAX_IMAGE_BYTES,
} from "./vaultMedia.mjs";
const cleanup = [];
afterEach(async () => {
  for (const root of cleanup.splice(0))
    await rm(root, { recursive: true, force: true });
});
async function temp() {
  const dir = await mkdtemp(join(tmpdir(), "process-media-"));
  cleanup.push(dir);
  return dir;
}
const jpeg = Buffer.from([255, 216, 255, ...Array(20).fill(0)]);
describe("private process images", () => {
  it("deduplicates parallel uploads and retains time/source without signed URLs", async () => {
    const root = await temp();
    const pair = await Promise.all([
      saveCapture(root, "example", { data: jpeg, at: 5 }),
      saveCapture(root, "example", { data: jpeg, at: 5 }),
    ]);
    expect(pair[0].id).toBe(pair[1].id);
    expect(
      JSON.parse(await readFile(join(root, "Sesiones/example/capturas.json"))),
    ).toHaveLength(1);
    const read = await getCapture(root, "example", pair[0].id);
    expect(read.data).toEqual(jpeg);
    await expect(
      saveCapture(root, "../outside", { data: jpeg, at: 5 }),
    ).rejects.toThrow();
    await expect(
      saveCapture(root, "example", {
        data: Buffer.alloc(MAX_IMAGE_BYTES + 1),
        at: 5,
      }),
    ).rejects.toThrow("invalid-capture");
    await expect(
      saveCapture(root, "example", { data: jpeg, at: -1 }),
    ).rejects.toThrow("invalid-capture");
  });
  it("refuses symlinked capture directories", async () => {
    const root = await temp(),
      outside = await temp();
    await mkdir(join(root, "Sesiones/example"), { recursive: true });
    await symlink(outside, join(root, "Sesiones/example/capturas"));
    await expect(
      saveCapture(root, "example", { data: jpeg, at: 1 }),
    ).rejects.toThrow("invalid-private-path");
  });
  it("recovers provider images without forwarding credentials; blocks other hosts and oversized streams", async () => {
    const root = await temp();
    const files = [
      "https://storage.googleapis.com/example?private-signature",
      "https://evil.example/image.jpg",
      "http://127.0.0.1/image.jpg",
    ];
    const calls = [];
    const result = await recoverConversationImages(
      root,
      "example",
      {
        transcript: [
          {
            message: "[PANTALLA 00:12]",
            time_in_call_secs: 20,
            file_inputs: files.map((file_url) => ({
              mime_type: "image/jpeg",
              file_url,
            })),
          },
        ],
      },
      async (url, init) => {
        calls.push({ url, init });
        return new Response(jpeg);
      },
    );
    expect(result).toEqual({ recovered: 1, failed: 2 });
    expect(calls).toHaveLength(1);
    expect(calls[0].init.headers).toBeUndefined();
    expect(calls[0].init.redirect).toBe("error");
    const manifest = await readFile(
      join(root, "Sesiones/example/capturas.json"),
      "utf8",
    );
    expect(manifest).not.toContain("signature");
    expect(JSON.parse(manifest)[0].at).toBe(12);
    const tooBig = await recoverConversationImages(
      root,
      "example",
      {
        transcript: [
          { file_inputs: [{ mime_type: "image/jpeg", file_url: files[0] }] },
        ],
      },
      async () => new Response(Buffer.alloc(MAX_IMAGE_BYTES + 1)),
    );
    expect(tooBig).toEqual({ recovered: 0, failed: 1 });
  });
});
