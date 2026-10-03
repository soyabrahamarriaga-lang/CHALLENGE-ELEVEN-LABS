import { describe, expect, it, vi } from "vitest";
import { RoomEvent, Track } from "livekit-client";
import type { Room, LocalTrack } from "livekit-client";
import { LiveCallController, mediaError, type MediaSource } from "./liveCall";
function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}
function fakeTrack(source: Track.Source) {
  const mediaStreamTrack = { enabled: true, readyState: "live" };
  return {
    source,
    mediaStreamTrack,
    stop: vi.fn(() => {
      mediaStreamTrack.readyState = "ended";
    }),
  };
}
function fakeRoom() {
  const publications = new Map<
    string,
    { track: ReturnType<typeof fakeTrack>; isMuted: boolean }
  >();
  const listeners = new Map<string, Set<() => void>>();
  const room = {
    connect: vi.fn(async () => {}),
    disconnect: vi.fn(async () => {}),
    startAudio: vi.fn(async () => {}),
    on(event: string, callback: () => void) {
      if (!listeners.has(event)) listeners.set(event, new Set());
      listeners.get(event)!.add(callback);
      return room;
    },
    off(event: string, callback: () => void) {
      listeners.get(event)?.delete(callback);
      return room;
    },
    emit(event: string) {
      [...(listeners.get(event) || [])].forEach((callback) => callback());
    },
    localParticipant: {
      trackPublications: publications,
      getTrackPublication: (source: Track.Source) => publications.get(source),
      publishTrack: vi.fn(async (track: ReturnType<typeof fakeTrack>) => {
        const publication = { track, isMuted: false };
        publications.set(track.source, publication);
        return publication;
      }),
      unpublishTrack: vi.fn(async (track: ReturnType<typeof fakeTrack>) => {
        if (publications.get(track.source)?.track === track)
          publications.delete(track.source);
      }),
    },
  };
  return room;
}
const tokenResponse = () =>
  new Response(
    JSON.stringify({
      serverUrl: "wss://test.example",
      participantToken: "test-room-token",
    }),
    { status: 200 },
  );
function setup(fetcher = vi.fn<typeof fetch>(async () => tokenResponse())) {
  const room = fakeRoom();
  const factory = vi.fn(() => room as unknown as Room);
  const capture = vi.fn(
    async (source: MediaSource) =>
      [
        fakeTrack(
          source === "microphone"
            ? Track.Source.Microphone
            : source === "camera"
              ? Track.Source.Camera
              : Track.Source.ScreenShare,
        ),
      ] as unknown as LocalTrack[],
  );
  const call = new LiveCallController(factory, fetcher, capture);
  return { room, factory, call, fetcher, capture };
}
describe("real call lifecycle", () => {
  it("calls browser fetch without binding it to the controller", async () => {
    const room = fakeRoom();
    vi.stubGlobal("fetch", function (this: unknown) {
      if (this !== undefined && this !== globalThis)
        throw new TypeError("Illegal invocation");
      return Promise.resolve(tokenResponse());
    });
    const call = new LiveCallController(() => room as unknown as Room);
    try {
      await call.join("A", "code", true);
      expect(call.getSnapshot().connection).toBe("connected");
    } finally {
      await call.leave();
      vi.unstubAllGlobals();
    }
  });
  it("requires consent and connects without activating any device", async () => {
    const { room, call, fetcher, capture } = setup();
    await call.join("Abraham", "test-code", false);
    expect(fetcher).not.toHaveBeenCalled();
    await call.join("Abraham", "test-code", true);
    expect(call.getSnapshot().connection).toBe("connected");
    expect(room.connect).toHaveBeenCalledWith(
      "wss://test.example",
      "test-room-token",
      expect.any(Object),
    );
    expect(capture).not.toHaveBeenCalled();
    expect(room.localParticipant.publishTrack).not.toHaveBeenCalled();
    await call.leave();
  });
  it("stops physical capture immediately on pause and resume does not reactivate devices", async () => {
    const { call, room, capture } = setup();
    await call.join("A", "code", true);
    await call.toggle("microphone");
    await call.toggle("camera");
    const tracks = [...room.localParticipant.trackPublications.values()].map(
      (publication) => publication.track,
    );
    const pausing = call.pause();
    tracks.forEach((track) => {
      expect(track.mediaStreamTrack.enabled).toBe(false);
      expect(track.stop).toHaveBeenCalled();
    });
    await pausing;
    await call.resume();
    expect(call.getSnapshot().paused).toBe(false);
    expect(capture).toHaveBeenCalledTimes(2);
    await call.leave();
  });
  it("releases a resource when switched off", async () => {
    const { call, room, capture } = setup();
    await call.join("A", "code", true);
    await call.toggle("screen");
    expect(capture).toHaveBeenCalledWith("screen");
    const track = room.localParticipant.trackPublications.get(
      Track.Source.ScreenShare,
    )!.track;
    await call.toggle("screen");
    expect(track.stop).toHaveBeenCalled();
    expect(room.localParticipant.trackPublications.size).toBe(0);
    await call.leave();
  });
  it("keeps capture paused after reconnection and allows the user to decide again", async () => {
    const { call, room, capture } = setup();
    await call.join("A", "code", true);
    await call.toggle("microphone");
    const track = room.localParticipant.trackPublications.get(
      Track.Source.Microphone,
    )!.track;
    room.emit(RoomEvent.SignalReconnecting);
    expect(track.stop).toHaveBeenCalled();
    expect(call.getSnapshot()).toMatchObject({
      connection: "reconnecting",
      paused: true,
    });
    room.emit(RoomEvent.Reconnected);
    expect(call.getSnapshot()).toMatchObject({
      connection: "connected",
      paused: true,
    });
    await call.toggle("microphone");
    expect(capture).toHaveBeenCalledTimes(1);
    await call.leave();
  });
  it("does not join if token resolution arrives after cancellation", async () => {
    const response = deferred<Response>();
    const { call, factory } = setup(vi.fn(() => response.promise));
    const joining = call.join("A", "code", true);
    await call.leave();
    response.resolve(tokenResponse());
    await joining;
    expect(factory).not.toHaveBeenCalled();
    expect(call.getSnapshot().connection).toBe("disconnected");
  });
  it.each(["leave", "pause"] as const)(
    "stops a permission grant that resolves after %s",
    async (action) => {
      const { call, room, capture } = setup();
      await call.join("A", "code", true);
      const granted = deferred<LocalTrack[]>();
      capture.mockImplementationOnce(() => granted.promise);
      const enabling = call.toggle("camera");
      await call[action]();
      const track = fakeTrack(Track.Source.Camera);
      granted.resolve([track as unknown as LocalTrack]);
      await enabling;
      expect(track.stop).toHaveBeenCalled();
      expect(room.localParticipant.publishTrack).not.toHaveBeenCalled();
      if (action === "leave") expect(call.getSnapshot().room).toBeNull();
      else expect(call.getSnapshot().paused).toBe(true);
      await call.leave();
    },
  );
  it("stops capture while publication is pending, then removes a late publication", async () => {
    const { call, room, capture } = setup();
    await call.join("A", "code", true);
    const track = fakeTrack(Track.Source.Camera);
    capture.mockResolvedValueOnce([track as unknown as LocalTrack]);
    const published = deferred<{ track: typeof track; isMuted: boolean }>();
    room.localParticipant.publishTrack.mockImplementationOnce(
      () => published.promise,
    );
    const enabling = call.toggle("camera");
    await vi.waitFor(() =>
      expect(room.localParticipant.publishTrack).toHaveBeenCalled(),
    );
    const pausing = call.pause();
    expect(track.mediaStreamTrack.enabled).toBe(false);
    expect(track.stop).toHaveBeenCalled();
    published.resolve({ track, isMuted: false });
    await Promise.all([pausing, enabling]);
    expect(room.localParticipant.unpublishTrack).toHaveBeenCalledWith(
      track,
      true,
    );
    expect(call.getSnapshot().paused).toBe(true);
    await call.leave();
  });
  it("releases a captured device when publication fails", async () => {
    const { call, room, capture } = setup();
    await call.join("A", "code", true);
    const track = fakeTrack(Track.Source.Microphone);
    capture.mockResolvedValueOnce([track as unknown as LocalTrack]);
    room.localParticipant.publishTrack.mockRejectedValueOnce(
      new Error("network"),
    );
    await call.toggle("microphone");
    expect(track.stop).toHaveBeenCalled();
    expect(call.getSnapshot().mediaBusy).toBe(false);
    expect(call.getSnapshot().error).not.toBe("");
    await call.leave();
  });
  it("disconnects a late room connection and ignores its subsequent events", async () => {
    const { call, room } = setup();
    const connected = deferred<void>();
    room.connect.mockImplementationOnce(() => connected.promise);
    const joining = call.join("A", "code", true);
    await vi.waitFor(() => expect(room.connect).toHaveBeenCalled());
    await call.leave();
    connected.resolve();
    await joining;
    room.emit(RoomEvent.Reconnected);
    expect(call.getSnapshot().connection).toBe("disconnected");
    expect(room.disconnect).toHaveBeenCalled();
  });
  it("handles denied devices and access errors without presenting a fake connected room", async () => {
    const denied = setup(vi.fn(async () => new Response("", { status: 401 })));
    await denied.call.join("A", "wrong", true);
    expect(denied.factory).not.toHaveBeenCalled();
    expect(denied.call.getSnapshot()).toMatchObject({
      connection: "error",
      room: null,
    });
    const { call, capture } = setup();
    await call.join("A", "code", true);
    capture.mockRejectedValueOnce({
      name: "NotAllowedError",
    });
    await call.toggle("microphone");
    expect(call.getSnapshot().error).toContain("permiso");
    expect(call.getSnapshot().mediaBusy).toBe(false);
    expect(mediaError({ name: "NotFoundError" })).toContain("No encontramos");
    await call.leave();
  });
});
