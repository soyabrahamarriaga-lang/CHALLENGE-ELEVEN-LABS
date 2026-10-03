import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { Track } from "livekit-client";
import type { Participant } from "livekit-client";
import {
  CircleAlert,
  Copy,
  LoaderCircle,
  Mic,
  MicOff,
  Monitor,
  MonitorOff,
  Pause,
  PhoneOff,
  Play,
  ShieldCheck,
  Users,
  Video,
  VideoOff,
  Volume2,
} from "lucide-react";
import { LiveCallController, hasLiveTrack } from "../services/liveCall";
import { timeLabel } from "../domain/callMachine";
import "./LiveCall.css";
const labels = {
  disconnected: "Sin conexión",
  connecting: "Entrando a la sala…",
  connected: "Conectado",
  reconnecting: "Reconectando · transmisión detenida",
  error: "No conectado",
};
function MediaView({
  track,
  local = false,
}: {
  track: Track;
  local?: boolean;
}) {
  const element = useRef<HTMLMediaElement | null>(null);
  useEffect(() => {
    const target = element.current;
    if (!target) return;
    track.attach(target);
    if (local) target.muted = true;
    return () => {
      track.detach(target);
      target.srcObject = null;
    };
  }, [track, local]);
  return track.kind === Track.Kind.Video ? (
    <video
      ref={(node) => {
        element.current = node;
      }}
      autoPlay
      playsInline
      muted={local}
      aria-label={local ? "Tu video" : "Video del participante"}
    />
  ) : (
    <audio
      ref={(node) => {
        element.current = node;
      }}
      autoPlay
      aria-label="Audio de participante"
    />
  );
}
function initials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}
function ParticipantTile({
  participant,
  local,
}: {
  participant: Participant;
  local: boolean;
}) {
  const camera = participant.getTrackPublication(Track.Source.Camera);
  const visible =
    camera?.track &&
    !camera.isMuted &&
    camera.track.mediaStreamTrack.readyState === "live";
  const name = participant.name || participant.identity;
  return (
    <article className="rtc-participant">
      <div className="rtc-video">
        {visible && camera.track ? (
          <MediaView track={camera.track} local={local} />
        ) : (
          <div className="rtc-avatar">
            <span>{initials(name)}</span>
            <p>Cámara apagada</p>
          </div>
        )}
      </div>
      <div className="rtc-participant-label">
        <strong>
          {name}
          {local ? " (tú)" : ""}
        </strong>
        <span>{participant.isAgent ? "Agente" : "Participante"}</span>
        {participant.isMicrophoneEnabled ? (
          <Mic size={16} aria-label="Micrófono activo" />
        ) : (
          <MicOff size={16} aria-label="Micrófono apagado" />
        )}
      </div>
    </article>
  );
}
export default function LiveCall() {
  const [call] = useState(() => new LiveCallController());
  const state = useSyncExternalStore(call.subscribe, call.getSnapshot);
  const [setup, setSetup] = useState<
    "loading" | "ready" | "missing" | "offline"
  >("loading");
  const [roomName, setRoomName] = useState("");
  const [reload, setReload] = useState(0);
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [consent, setConsent] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [notice, setNotice] = useState("");
  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    setSetup("loading");
    fetch("/api/livekit/status", {
      signal: controller.signal,
      cache: "no-store",
    })
      .then((response) => {
        if (!response.ok) throw new Error();
        return response.json();
      })
      .then((data: unknown) => {
        if (!active) return;
        if (
          !data ||
          typeof data !== "object" ||
          !("configured" in data) ||
          typeof data.configured !== "boolean"
        )
          throw new Error();
        setSetup(data.configured ? "ready" : "missing");
        setRoomName(
          "roomName" in data && typeof data.roomName === "string"
            ? data.roomName
            : "",
        );
      })
      .catch(() => {
        if (active) setSetup("offline");
      })
      .finally(() => clearTimeout(timeout));
    return () => {
      active = false;
      clearTimeout(timeout);
      controller.abort();
    };
  }, [reload]);
  useEffect(
    () => () => {
      void call.leave();
    },
    [call],
  );
  useEffect(() => {
    if (state.connection !== "connected" || state.paused) return;
    const timer = setInterval(() => setSeconds((value) => value + 1), 1000);
    return () => clearInterval(timer);
  }, [state.connection, state.paused]);
  useEffect(() => {
    if (!["connecting", "connected", "reconnecting"].includes(state.connection))
      return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [state.connection]);
  const room = state.room;
  const participants = room
    ? [room.localParticipant, ...room.remoteParticipants.values()]
    : [];
  const screens = participants.flatMap((participant) =>
    [...participant.trackPublications.values()]
      .filter(
        (publication) =>
          publication.source === Track.Source.ScreenShare &&
          publication.track &&
          !publication.isMuted &&
          publication.track.mediaStreamTrack.readyState === "live",
      )
      .map((publication) => ({ participant, publication })),
  );
  const remoteAudio = room
    ? [...room.remoteParticipants.values()].flatMap((participant) =>
        [...participant.audioTrackPublications.values()].flatMap(
          (publication) =>
            publication.track
              ? [{ participant, publication, track: publication.track }]
              : [],
        ),
      )
    : [];
  const microphone = room ? hasLiveTrack(room, Track.Source.Microphone) : false;
  const camera = room ? hasLiveTrack(room, Track.Source.Camera) : false;
  const screen = room ? hasLiveTrack(room, Track.Source.ScreenShare) : false;
  const mediaDisabled =
    state.connection !== "connected" || state.paused || state.mediaBusy;
  const busy = ["connecting", "reconnecting"].includes(state.connection);
  const join = async (event: React.FormEvent) => {
    event.preventDefault();
    setSeconds(0);
    setNotice("");
    await call.join(name.trim(), code, consent);
    setCode("");
  };
  return (
    <div className="rtc-page">
      <div className="page-heading">
        <div>
          <h1>Comparte el momento.</h1>
          <p>Conversen, muestren una tarea y descubran juntos el porqué.</p>
        </div>
        <span className={"rtc-connection " + state.connection} role="status">
          {busy ? (
            <LoaderCircle className="spin" size={16} />
          ) : (
            <span className="status-dot" />
          )}
          {labels[state.connection]}
        </span>
      </div>
      <div className="rtc-disclosure">
        <ShieldCheck size={20} />
        <p>
          <strong>Esta es una llamada real.</strong> Tu micrófono, cámara y
          pantalla empiezan apagados. Al activarlos, los participantes de la
          sala reciben ese contenido. UserHelper no inicia grabaciones ni genera
          un mapa de esta llamada.
        </p>
      </div>
      {state.error && (
        <div className="rtc-alert" role="alert">
          <CircleAlert size={19} />
          <p>{state.error}</p>
        </div>
      )}
      {notice && (
        <p className="rtc-notice" role="status">
          {notice}
        </p>
      )}
      {!room ? (
        <div className="rtc-lobby">
          <section className="rtc-join-panel">
            <h2>Entrar con tu equipo</h2>
            <p>
              Usen el mismo proyecto y el código de acceso acordado para
              encontrarse en la sala.
            </p>
            {setup === "loading" ? (
              <p className="rtc-setup-state" role="status">
                <LoaderCircle className="spin" size={18} />
                Comprobando la sala…
              </p>
            ) : setup !== "ready" ? (
              <div className="rtc-setup-state">
                <CircleAlert size={22} />
                <div>
                  <h3>
                    {setup === "missing"
                      ? "La sala aún no está configurada"
                      : "El servicio de conexión no está disponible"}
                  </h3>
                  <p>
                    {setup === "missing"
                      ? "El equipo debe completar la configuración de LiveKit antes de realizar una llamada."
                      : "Pide al equipo que inicie el servicio de conexión y vuelve a comprobar."}
                  </p>
                  <button
                    className="text-button"
                    onClick={() => setReload((value) => value + 1)}
                  >
                    Volver a comprobar
                  </button>
                </div>
              </div>
            ) : (
              <p className="rtc-room-label">
                <Users size={17} />
                Sala: <strong>{roomName}</strong>
              </p>
            )}
            <form onSubmit={join}>
              <label htmlFor="rtc-name">
                Tu nombre
                <input
                  id="rtc-name"
                  autoComplete="name"
                  maxLength={60}
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  required
                  disabled={busy}
                  placeholder="Cómo te verá el equipo"
                />
              </label>
              <label htmlFor="rtc-code">
                Código de acceso a la sala
                <input
                  id="rtc-code"
                  type="password"
                  autoComplete="off"
                  maxLength={256}
                  value={code}
                  onChange={(event) => setCode(event.target.value)}
                  required
                  disabled={busy}
                  placeholder="Código compartido con tu equipo"
                />
              </label>
              <label className="rtc-consent">
                <input
                  type="checkbox"
                  checked={consent}
                  onChange={(event) => setConsent(event.target.checked)}
                  disabled={busy}
                />
                Entiendo que los participantes recibirán los recursos que decida
                activar.
              </label>
              <button
                className="button primary"
                disabled={
                  setup !== "ready" || busy || !name.trim() || !code || !consent
                }
              >
                <Video size={18} />
                {busy ? "Conectando…" : "Entrar a la sala"}
              </button>
              {busy && (
                <button
                  type="button"
                  className="button secondary"
                  onClick={() => {
                    void call.leave();
                    setCode("");
                  }}
                >
                  Cancelar conexión
                </button>
              )}
            </form>
          </section>
          <aside className="rtc-preparation">
            <div className="rtc-empty-stage">
              <Video size={36} />
              <span>Tu espacio para compartir</span>
            </div>
            <h2>Primero conecta. Después, comparte.</h2>
            <ol>
              <li>
                <strong>Entren a la misma sala</strong>
                <p>
                  Cada persona utiliza su propio nombre. El código permite
                  entrar; no es una clave de API.
                </p>
              </li>
              <li>
                <strong>Elige qué mostrar</strong>
                <p>
                  Activa cada dispositivo cuando lo necesites. Puedes elegir una
                  sola ventana al compartir pantalla.
                </p>
              </li>
              <li>
                <strong>Conserva el control</strong>
                <p>
                  Pausar detiene tus dispositivos. Salir o cambiar de pantalla
                  cierra tu llamada.
                </p>
              </li>
            </ol>
            <p className="rtc-agent-note">
              La integración del aprendiz de IA se conectará a esta sala en una
              etapa posterior.
            </p>
          </aside>
        </div>
      ) : (
        <>
          <div className="rtc-room-heading">
            <div>
              <h2>{room.name || roomName}</h2>
              <p>
                <Users size={16} />
                {participants.length}{" "}
                {participants.length === 1 ? "participante" : "participantes"} ·{" "}
                {participants.some((participant) => participant.isAgent)
                  ? "Agente presente en la sala"
                  : "Sin agente de IA conectado"}
              </p>
            </div>
            <span className="rtc-timer">
              {timeLabel(seconds)}
              <small>Tiempo activo de conexión</small>
            </span>
          </div>
          {state.paused && (
            <div className="rtc-paused" role="status">
              <Pause size={21} />
              <div>
                <strong>Tu transmisión está detenida.</strong>
                <p>
                  Al continuar, activa de nuevo solo los dispositivos que
                  quieras compartir. Puedes seguir escuchando a tu equipo.
                </p>
              </div>
              <button
                className="button secondary"
                disabled={state.connection !== "connected" || state.mediaBusy}
                onClick={() => {
                  void call.resume();
                }}
              >
                Continuar
              </button>
            </div>
          )}
          <div className="rtc-shared-screens">
            {screens.map(({ participant, publication }) => (
              <section
                key={participant.identity + publication.trackSid}
                className="rtc-shared-screen"
              >
                <div>
                  <Monitor size={17} />
                  <strong>
                    Pantalla de {participant.name || participant.identity}
                  </strong>
                </div>
                {publication.track && (
                  <MediaView
                    track={publication.track}
                    local={participant === room.localParticipant}
                  />
                )}
              </section>
            ))}
          </div>
          <div className="rtc-participant-grid">
            {participants.map((participant) => (
              <ParticipantTile
                key={participant.identity}
                participant={participant}
                local={participant === room.localParticipant}
              />
            ))}
            {participants.length === 1 && (
              <div className="rtc-waiting">
                <Users size={32} />
                <h3>Esperando a tu equipo</h3>
                <p>
                  Comparte el enlace de la aplicación y el código de la sala por
                  el canal acordado.
                </p>
                <button
                  className="button secondary"
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(
                        window.location.origin +
                          window.location.pathname +
                          "#intern/call",
                      );
                      setNotice(
                        "Enlace copiado. El código de acceso se comparte por separado.",
                      );
                    } catch {
                      setNotice(
                        "No pudimos copiar el enlace. Puedes copiar la dirección del navegador.",
                      );
                    }
                  }}
                >
                  <Copy size={16} />
                  Copiar enlace
                </button>
              </div>
            )}
          </div>
          <div className="rtc-controls" aria-label="Controles de videollamada">
            <button
              className="button secondary"
              aria-pressed={microphone}
              disabled={mediaDisabled}
              onClick={() => {
                void call.toggle("microphone");
              }}
            >
              {microphone ? <Mic size={19} /> : <MicOff size={19} />}
              {microphone ? "Apagar micrófono" : "Activar micrófono"}
            </button>
            <button
              className="button secondary"
              aria-pressed={camera}
              disabled={mediaDisabled}
              onClick={() => {
                void call.toggle("camera");
              }}
            >
              {camera ? <Video size={19} /> : <VideoOff size={19} />}
              {camera ? "Apagar cámara" : "Activar cámara"}
            </button>
            <button
              className="button secondary"
              aria-pressed={screen}
              disabled={
                mediaDisabled || !navigator.mediaDevices?.getDisplayMedia
              }
              onClick={() => {
                void call.toggle("screen");
              }}
            >
              {screen ? <MonitorOff size={19} /> : <Monitor size={19} />}
              {screen ? "Dejar de compartir" : "Compartir pantalla"}
            </button>
            <button
              className="button secondary"
              disabled={state.paused || state.connection !== "connected"}
              onClick={() => {
                void call.pause();
              }}
            >
              <Pause size={19} />
              Pausar transmisión
            </button>
            <button
              className="button end-button"
              onClick={() => {
                void call.leave();
                setNotice(
                  "Saliste de la sala. Tus dispositivos están apagados.",
                );
              }}
            >
              <PhoneOff size={19} />
              Salir de la llamada
            </button>
          </div>
          {!navigator.mediaDevices?.getDisplayMedia && (
            <p className="rtc-agent-note">
              Este navegador no permite compartir pantalla. Prueba desde un
              navegador de escritorio compatible.
            </p>
          )}
          {!room.canPlaybackAudio && (
            <button
              className="button secondary"
              onClick={() => {
                void call.enableAudio();
              }}
            >
              <Volume2 size={18} />
              Activar audio de la sala
            </button>
          )}
          {remoteAudio.map(({ participant, publication, track }) => (
            <MediaView
              key={participant.identity + publication.trackSid}
              track={track}
            />
          ))}
        </>
      )}
      <p className="rtc-footer-note">
        <Play size={15} />
        La biblioteca de demostración se conserva por separado. Esta llamada no
        crea una grabación ni una sesión de ejemplo.
      </p>
    </div>
  );
}
