import { afterEach, describe, expect, it, vi } from "vitest";
const sdk = vi.hoisted(() => ({ startSession: vi.fn() }));
vi.mock("@elevenlabs/client", () => ({ Conversation: sdk }));
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); vi.resetModules(); vi.clearAllMocks(); });
describe("conversation iframe delivery integration", () => {
  it("uses provider VAD, waits through speech during upload and cancels work when the page closes", async () => {
    vi.useFakeTimers(); vi.setSystemTime(10000);
    const handlers: Record<string, (event: any) => any> = {};
    const parent = { postMessage: vi.fn() };
    vi.stubGlobal("window", { location: { origin: "http://localhost" }, parent, addEventListener: (type: string, cb: (e: any) => any) => { handlers[type] = cb; } });
    let callbacks: any;
    let finish!: (value: { fileId: string }) => void;
    const session = { uploadFile: vi.fn(() => new Promise((resolve) => { finish = resolve; })), sendMultimodalMessage: vi.fn(), endSession: vi.fn(), getInputVolume: vi.fn(() => 1) };
    sdk.startSession.mockImplementation(async (options) => { callbacks = options; options.onConversationCreated(session); options.onConnect({ conversationId: "conv_test" }); return session; });
    await import("./agentFrame");
    const send = (data: object) => handlers.message({ origin: "http://localhost", source: parent, data: { channel: "userhelper-elevenlabs-v1", sessionKey: "session-key", ...data } });
    await send({ type: "start", mode: "voice", access: { conversationToken: "test" } });
    expect(sdk.startSession.mock.calls[0][0].connectionType).toBe("webrtc");
    callbacks.onVadScore({ vadScore: 0.1 }); await vi.advanceTimersByTimeAsync(500); callbacks.onVadScore({ vadScore: 0.1 });
    await send({ type: "screen", id: "image-one", frame: new Blob(["fake"], { type: "image/jpeg" }), label: "[PANTALLA 00:05]" });
    callbacks.onVadScore({ vadScore: 0.95 }); finish({ fileId: "uploaded" }); await vi.advanceTimersByTimeAsync(200);
    expect(session.sendMultimodalMessage).not.toHaveBeenCalled();
    callbacks.onVadScore({ vadScore: 0.1 }); await vi.advanceTimersByTimeAsync(450); callbacks.onVadScore({ vadScore: 0.1 }); await vi.advanceTimersByTimeAsync(1000);
    expect(session.sendMultimodalMessage).toHaveBeenCalledWith({ text: "[PANTALLA 00:05]", fileIds: ["uploaded"] });
    expect(session.getInputVolume).not.toHaveBeenCalled();
    expect(parent.postMessage).toHaveBeenCalledWith(expect.objectContaining({ event: { type: "screen", id: "image-one", stage: "sent" } }), "http://localhost");
    await send({ type: "screen", id: "image-two", frame: new Blob(["fake"], { type: "image/jpeg" }), label: "[PANTALLA 00:10]" });
    handlers.pagehide({}); finish({ fileId: "late" }); await vi.advanceTimersByTimeAsync(1000);
    expect(session.sendMultimodalMessage).toHaveBeenCalledTimes(1);
    expect(session.endSession).toHaveBeenCalled();
  });
});

it.each([
  ['voice', 'en'], ['text', 'en'], ['voice', 'es'], ['text', 'es'], ['voice', undefined],
])('starts %s with only the requested language override (%s)', async (mode, overrideLanguage) => {
  const handlers: Record<string, (event: any) => any> = {};
  const parent = { postMessage: vi.fn() };
  vi.stubGlobal('window', { location: { origin: 'http://localhost' }, parent, addEventListener: (type: string, cb: (e: any) => any) => { handlers[type] = cb; } });
  sdk.startSession.mockResolvedValue({ endSession: vi.fn() });
  await import('./agentFrame');
  await handlers.message({ origin: 'http://localhost', source: parent, data: {
    channel: 'userhelper-elevenlabs-v1', type: 'start', sessionKey: 'language-test', mode,
    access: { conversationToken: 'test', signedUrl: 'wss://test.invalid' }, overrideLanguage,
  } });
  expect(sdk.startSession).toHaveBeenCalledTimes(1);
  const options = sdk.startSession.mock.calls[0][0];
  expect(options.overrides).toEqual(overrideLanguage ? { agent: { language: overrideLanguage } } : undefined);
  expect(options.connectionType).toBe(mode === 'voice' ? 'webrtc' : 'websocket');
  expect(options.textOnly).toBe(mode === 'text');
  handlers.pagehide({});
});
it('rejects unknown language messages before requesting a session', async () => {
  const handlers: Record<string, (event: any) => any> = {};
  const parent = { postMessage: vi.fn() };
  vi.stubGlobal('window', { location: { origin: 'http://localhost' }, parent, addEventListener: (type: string, cb: (e: any) => any) => { handlers[type] = cb; } });
  await import('./agentFrame');
  await handlers.message({ origin: 'http://localhost', source: parent, data: {
    channel: 'userhelper-elevenlabs-v1', type: 'start', sessionKey: 'invalid', mode: 'voice', access: { conversationToken: 'test' }, overrideLanguage: 'unknown',
  } });
  expect(sdk.startSession).not.toHaveBeenCalled();
});
