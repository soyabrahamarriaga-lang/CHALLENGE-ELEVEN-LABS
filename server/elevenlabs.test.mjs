import { describe, it, expect, vi } from "vitest";
import { getConversationAccess, readElevenLabsConfig } from "./elevenlabs.mjs";
const config = readElevenLabsConfig({
  ELEVENLABS_API_KEY: "test-eleven-key",
  ELEVENLABS_AGENT_ID: "agent_test",
});
describe("ElevenLabs backend access", () => {
  it("fixes the target agent on the server and keeps the API key in the request header", async () => {
    const fetcher = vi.fn(async () =>
      Response.json({ token: "temporary-conversation-token" }),
    );
    const result = await getConversationAccess(config, "webrtc", fetcher);
    expect(result).toEqual({
      conversationToken: "temporary-conversation-token",
    });
    expect(fetcher).toHaveBeenCalledWith(
      "https://api.elevenlabs.io/v1/convai/conversation/token?agent_id=agent_test",
      expect.objectContaining({
        headers: {
          "xi-api-key": "test-eleven-key",
          Accept: "application/json",
        },
        redirect: "error",
      }),
    );
    expect(JSON.stringify(result)).not.toContain(config.apiKey);
  });
  it("fails closed without a valid key and agent ID", async () => {
    const fetcher = vi.fn();
    await expect(
      getConversationAccess(readElevenLabsConfig({}), "webrtc", fetcher),
    ).rejects.toMatchObject({ code: "agent_not_configured" });
    expect(
      readElevenLabsConfig({
        ELEVENLABS_API_KEY: "key",
        ELEVENLABS_AGENT_ID: "../other?agent",
      }).ready,
    ).toBe(false);
    expect(fetcher).not.toHaveBeenCalled();
  });
  it("does not reflect upstream bodies, errors or credentials", async () => {
    await expect(
      getConversationAccess(
        config,
        "webrtc",
        async () => new Response(config.apiKey, { status: 403 }),
      ),
    ).rejects.toMatchObject({
      code: "agent_access_denied",
      message: "agent_access_denied",
    });
    await expect(
      getConversationAccess(config, "webrtc", async () => {
        throw new Error(config.apiKey);
      }),
    ).rejects.toMatchObject({ message: "agent_unavailable" });
  });
  it("accepts only signed conversation URLs at known ElevenLabs endpoints", async () => {
    const signedUrl =
      "wss://api.elevenlabs.io/v1/convai/conversation?agent_id=agent_test&conversation_signature=test-only";
    expect(
      await getConversationAccess(config, "websocket", async () =>
        Response.json({ signed_url: signedUrl }),
      ),
    ).toEqual({ signedUrl });
    for (const value of [
      "wss://untrusted.example/conversation",
      "https://api.elevenlabs.io/v1/convai/conversation",
      "wss://api.elevenlabs.io/wrong",
    ]) {
      await expect(
        getConversationAccess(config, "websocket", async () =>
          Response.json({ signed_url: value }),
        ),
      ).rejects.toMatchObject({ code: "agent_invalid_response" });
    }
  });
});
