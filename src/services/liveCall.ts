import {
  Room,
  RoomEvent,
  Track,
  createLocalAudioTrack,
  createLocalVideoTrack,
  createLocalScreenTracks,
} from "livekit-client";
import type { LocalTrack } from "livekit-client";
export type LiveConnection =
  | "disconnected"
  | "connecting"
  | "connected"
  | "reconnecting"
  | "error";
export type MediaSource = "microphone" | "camera" | "screen";
export interface LiveCallState {
  connection: LiveConnection;
  room: Room | null;
  paused: boolean;
  mediaBusy: boolean;
  error: string;
  revision: number;
}
class AccessError extends Error {}
const initialState: LiveCallState = {
  connection: "disconnected",
  room: null,
  paused: false,
  mediaBusy: false,
  error: "",
  revision: 0,
};
const tokenErrors: Record<number, string> = {
  400: "Revisa tu nombre y acepta compartir únicamente lo que actives.",
  401: "El código de acceso no es correcto. Confírmalo con tu equipo.",
  403: "Esta dirección no tiene acceso a la sala. Abre el enlace autorizado por tu equipo.",
  429: "Hubo demasiados intentos. Espera un minuto y vuelve a entrar.",
  503: "La sala todavía no está configurada. Pide al equipo que complete la conexión de LiveKit.",
};
export function mediaError(error: unknown): string {
  const name =
    error && typeof error === "object" && "name" in error ? error.name : "";
  if (name === "NotAllowedError" || name === "PermissionDeniedError")
    return "No se compartió el dispositivo. Revisa el permiso del navegador o vuelve a elegir qué compartir.";
  if (name === "NotFoundError" || name === "DevicesNotFoundError")
    return "No encontramos ese dispositivo. Conéctalo y vuelve a intentarlo.";
  if (name === "NotReadableError")
    return "Otra aplicación puede estar usando el dispositivo. Libéralo y vuelve a intentarlo.";
  return "No pudimos activar ese recurso. Revisa el dispositivo y la conexión e inténtalo de nuevo.";
}
export function hasLiveTrack(room: Room, source: Track.Source): boolean {
  const publication = room.localParticipant.getTrackPublication(source);
  return Boolean(
    publication?.track &&
    !publication.isMuted &&
    publication.track.mediaStreamTrack.readyState === "live",
  );
}

async function captureSource(source: MediaSource): Promise<LocalTrack[]> {
  if (source === "microphone")
    return [
      await createLocalAudioTrack({
        echoCancellation: true,
        noiseSuppression: true,
      }),
    ];
  if (source === "camera") return [await createLocalVideoTrack()];
  return createLocalScreenTracks({ audio: false });
}
function stopTracks(tracks: LocalTrack[]) {
  tracks.forEach((track) => {
    track.mediaStreamTrack.enabled = false;
    track.stop();
  });
}

// Transport only: no simulated questions, recording, agent dispatch or generated Work Map.
export class LiveCallController {
  private state: LiveCallState = initialState;
  private subscribers = new Set<() => void>();
  private current: Room | null = null;
  private epoch = 0;
  private request: AbortController | null = null;
  private unbind: (() => void) | null = null;
  private stopping: Promise<unknown> = Promise.resolve();
  private pendingTracks = new Map<Room, Set<LocalTrack>>();
  constructor(
    private makeRoom = () =>
      new Room({
        adaptiveStream: true,
        dynacast: true,
        stopLocalTrackOnUnpublish: true,
      }),
    private fetcher: typeof fetch = (input, init) => fetch(input, init),
    private capture: (
      source: MediaSource,
    ) => Promise<LocalTrack[]> = captureSource,
  ) {}
  getSnapshot = () => this.state;
  subscribe = (listener: () => void) => {
    this.subscribers.add(listener);
    return () => {
      this.subscribers.delete(listener);
    };
  };
  private update(patch: Partial<LiveCallState>) {
    this.state = { ...this.state, ...patch, revision: this.state.revision + 1 };
    this.subscribers.forEach((listener) => listener());
  }
  private stopPublished(room: Room) {
    const tracks = [
      ...new Set([
        ...[...room.localParticipant.trackPublications.values()].flatMap(
          (publication) => (publication.track ? [publication.track] : []),
        ),
        ...(this.pendingTracks.get(room) || []),
      ]),
    ];
    // Stop physical capture even while publication or signaling is pending.
    stopTracks(tracks);
    return Promise.allSettled(
      tracks.map((track) => room.localParticipant.unpublishTrack(track, true)),
    );
  }
  private bind(room: Room) {
    const refresh = () => {
      if (this.current === room) this.update({});
    };
    const interrupted = () => {
      if (this.current !== room) return;
      this.epoch += 1;
      this.stopping = this.stopPublished(room);
      this.update({
        connection: "reconnecting",
        paused: true,
        mediaBusy: false,
        error:
          "La conexión se interrumpió. Detuvimos tus dispositivos; no se reactivarán automáticamente.",
      });
    };
    const recovered = () => {
      if (this.current === room)
        this.update({ connection: "connected", paused: true, error: "" });
    };
    const disconnected = () => {
      if (this.current !== room) return;
      this.stopPublished(room);
      this.unbind?.();
      this.unbind = null;
      this.current = null;
      this.epoch += 1;
      this.update({
        room: null,
        connection: "error",
        paused: false,
        mediaBusy: false,
        error:
          "La llamada terminó por una desconexión. Puedes volver a entrar; tus dispositivos están apagados.",
      });
    };
    const events = [
      RoomEvent.ParticipantConnected,
      RoomEvent.ParticipantDisconnected,
      RoomEvent.TrackSubscribed,
      RoomEvent.TrackUnsubscribed,
      RoomEvent.TrackPublished,
      RoomEvent.TrackUnpublished,
      RoomEvent.TrackMuted,
      RoomEvent.TrackUnmuted,
      RoomEvent.LocalTrackPublished,
      RoomEvent.LocalTrackUnpublished,
      RoomEvent.ParticipantNameChanged,
      RoomEvent.AudioPlaybackStatusChanged,
    ];
    events.forEach((event) => room.on(event, refresh));
    room
      .on(RoomEvent.Reconnecting, interrupted)
      .on(RoomEvent.SignalReconnecting, interrupted)
      .on(RoomEvent.Reconnected, recovered)
      .on(RoomEvent.Disconnected, disconnected);
    this.unbind = () => {
      events.forEach((event) => room.off(event, refresh));
      room
        .off(RoomEvent.Reconnecting, interrupted)
        .off(RoomEvent.SignalReconnecting, interrupted)
        .off(RoomEvent.Reconnected, recovered)
        .off(RoomEvent.Disconnected, disconnected);
    };
  }
  async join(displayName: string, joinCode: string, consent: boolean) {
    if (this.current || this.state.connection === "connecting") return;
    if (!consent || !displayName.trim()) {
      this.update({ error: tokenErrors[400] });
      return;
    }
    const epoch = ++this.epoch;
    const request = new AbortController();
    this.request = request;
    const timeout = setTimeout(() => request.abort(), 12000);
    this.update({ connection: "connecting", error: "", paused: false });
    let room: Room | null = null;
    try {
      const response = await this.fetcher("/api/livekit/token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        signal: request.signal,
        body: JSON.stringify({ displayName, joinCode, consent }),
      });
      if (!response.ok)
        throw new AccessError(
          tokenErrors[response.status] ||
            "No pudimos obtener acceso a la sala. Revisa que el servicio de conexión esté disponible.",
        );
      const data: unknown = await response.json();
      if (
        !data ||
        typeof data !== "object" ||
        !("serverUrl" in data) ||
        !("participantToken" in data) ||
        typeof data.serverUrl !== "string" ||
        typeof data.participantToken !== "string" ||
        !data.participantToken
      )
        throw new AccessError(
          "El servicio de conexión no devolvió un acceso válido.",
        );
      if (epoch !== this.epoch) return;
      room = this.makeRoom();
      this.current = room;
      this.bind(room);
      // Joining subscribes to peers but captures nothing. Each device needs its own click.
      await room.connect(data.serverUrl, data.participantToken, {
        autoSubscribe: true,
        maxRetries: 1,
        websocketTimeout: 10000,
        peerConnectionTimeout: 10000,
      });
      if (epoch !== this.epoch || this.current !== room) {
        await room.disconnect(true);
        return;
      }
      this.update({ connection: "connected", room, error: "" });
    } catch (error) {
      if (epoch !== this.epoch) {
        if (room) await room.disconnect(true).catch(() => {});
        return;
      }
      this.unbind?.();
      this.unbind = null;
      this.current = null;
      if (room) {
        this.stopPublished(room);
        await room.disconnect(true).catch(() => {});
      }
      this.update({
        connection: "error",
        room: null,
        error: room
          ? "No pudimos conectar con la sala. Revisa tu red y vuelve a entrar."
          : error instanceof AccessError
            ? error.message
            : "La conexión tardó demasiado. Revisa que el servicio esté disponible y vuelve a intentarlo.",
      });
    } finally {
      clearTimeout(timeout);
      if (this.request === request) this.request = null;
    }
  }
  async toggle(source: MediaSource) {
    const room = this.current;
    if (
      !room ||
      this.state.connection !== "connected" ||
      this.state.paused ||
      this.state.mediaBusy
    )
      return;
    const epoch = this.epoch;
    const trackSource =
      source === "microphone"
        ? Track.Source.Microphone
        : source === "camera"
          ? Track.Source.Camera
          : Track.Source.ScreenShare;
    const enabled = !hasLiveTrack(room, trackSource);
    this.update({ mediaBusy: true, error: "" });
    let captured: LocalTrack[] = [];
    try {
      if (!enabled) {
        const track =
          room.localParticipant.getTrackPublication(trackSource)?.track;
        if (track) {
          track.mediaStreamTrack.enabled = false;
          track.stop();
          await room.localParticipant.unpublishTrack(track, true);
        }
        return;
      }
      // Acquire first, then recheck consent before publishing anything to peers.
      captured = await this.capture(source);
      if (epoch !== this.epoch || this.current !== room) {
        stopTracks(captured);
        return;
      }
      const pending = this.pendingTracks.get(room) || new Set<LocalTrack>();
      this.pendingTracks.set(room, pending);
      captured.forEach((track) => pending.add(track));
      for (const track of captured) {
        await room.localParticipant.publishTrack(track, {
          source: trackSource,
        });
        if (epoch !== this.epoch || this.current !== room) {
          stopTracks(captured);
          await Promise.allSettled(
            captured.map((item) =>
              room.localParticipant.unpublishTrack(item, true),
            ),
          );
          return;
        }
      }
      this.update({});
    } catch (error) {
      stopTracks(captured);
      await Promise.allSettled(
        captured.map((track) =>
          room.localParticipant.unpublishTrack(track, true),
        ),
      );
      if (epoch === this.epoch && this.current === room)
        this.update({ error: mediaError(error) });
    } finally {
      const pending = this.pendingTracks.get(room);
      captured.forEach((track) => pending?.delete(track));
      if (pending?.size === 0) this.pendingTracks.delete(room);
      if (epoch === this.epoch && this.current === room)
        this.update({ mediaBusy: false });
    }
  }
  async pause() {
    const room = this.current;
    if (!room) return;
    const epoch = ++this.epoch;
    this.stopping = this.stopPublished(room);
    this.update({ paused: true, mediaBusy: true, error: "" });
    await this.stopping;
    if (epoch === this.epoch && this.current === room)
      this.update({ mediaBusy: false });
  }
  async resume() {
    const room = this.current;
    const epoch = this.epoch;
    await this.stopping;
    if (
      this.current === room &&
      epoch === this.epoch &&
      this.state.connection === "connected"
    )
      this.update({ paused: false, error: "" });
  }
  async leave() {
    ++this.epoch;
    this.request?.abort();
    this.request = null;
    const room = this.current;
    this.current = null;
    this.unbind?.();
    this.unbind = null;
    if (room) this.stopping = this.stopPublished(room);
    this.update({ ...initialState });
    if (room) await room.disconnect(true).catch(() => {});
  }
  async enableAudio() {
    const room = this.current;
    try {
      await room?.startAudio();
    } catch {
      if (this.current === room)
        this.update({
          error:
            "No pudimos reproducir el audio. Revisa el permiso de reproducción del navegador.",
        });
    }
  }
}
