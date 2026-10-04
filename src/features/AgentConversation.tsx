import { useEffect, useRef, useState } from "react";
import {
  AudioLines,
  CircleAlert,
  MessageCircle,
  Mic,
  MonitorOff,
  MonitorUp,
  PhoneOff,
  Send,
  ShieldCheck,
} from "lucide-react";
import {
  MAX_SCREEN_FRAMES,
  applyAgentEvent,
  channel,
  initialAgentState,
  isAgentEvent,
} from "../services/agentProtocol";
import type {
  AgentAccess,
  AgentPhase,
  AgentMode,
  AgentState,
} from "../services/agentProtocol";
import {
  archiveConversation,
  logVaultEvent,
  archiveScreenCapture,
} from "../services/vault";
import { clock } from "../services/screenDiff";
import { startScreenWatch } from "../services/screenWatcher";
import { TurnGate } from "../services/turnGate";
import type { ScreenEvent, WatchStatus } from "../services/screenWatcher";
import type { ArchiveResult } from "../services/vault";
import { AgentStatus } from "../components/AgentStatus";
import { canStartAgent } from "../services/agentAvailability";
import type { AgentAvailabilityControl } from "../services/useAgentAvailability";
import { agentProfiles } from "../services/agentProfiles";
import type { Role } from "../domain/types";
import "./AgentConversation.css";
type FrameSession = { key: string; mode: AgentMode; access: AgentAccess };
const accessErrors: Record<number, string> = {
  401: "El código de acceso no es correcto. Revisa el código e inténtalo de nuevo.",
  403: "Abre la aplicación desde su dirección autorizada.",
  429: "Hay demasiados intentos o el agente está ocupado. Espera un minuto y vuelve a intentarlo.",
  503: "El agente aún no está configurado. Revisa la configuración de ElevenLabs.",
  502: "ElevenLabs no pudo autorizar la conversación. Revisa la clave, el agente y su disponibilidad.",
};
export default function AgentConversation({ health, onPhaseChange, role = "senior" }: {
  health: AgentAvailabilityControl;
  onPhaseChange: (phase: AgentPhase) => void;
  role?: Role;
}) {
  const profile = agentProfiles[role];
  const persistEvidence = profile.persistEvidence;
  const headingRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => { headingRef.current?.focus(); }, []);
  const [state, setState] = useState<AgentState>(initialAgentState);
  const [code, setCode] = useState("");
  const requiresCode = health.status.requiresCode;
  const [consent, setConsent] = useState(false);
  const [draft, setDraft] = useState("");
  const [frame, setFrame] = useState<FrameSession | null>(null);
  const frameElement = useRef<HTMLIFrameElement>(null);
  const frameSession = useRef<FrameSession | null>(null);
  const generation = useRef(0);
  const request = useRef<AbortController | null>(null);
  const pendingCaptures = useRef(new Set<Promise<boolean>>());
  const [captureWarning, setCaptureWarning] = useState(false);
  const [archive, setArchive] = useState<ArchiveResult | "saving" | null>(null);
  const [screen, setScreen] = useState<{
    status: WatchStatus | "idle" | "denied";
    events: ScreenEvent[];
    frames: number;
  }>({ status: "idle", events: [], frames: 0 });
  const watch = useRef<{ stop: () => void } | null>(null);
  const framesSent = useRef(0);
  const gate = useRef(new TurnGate<Blob>());
  const connectedAt = useRef(0);
  const busy = state.phase === "authorizing" || state.phase === "connecting";
  const active = busy || state.phase === "connected";
  useEffect(() => { onPhaseChange(state.phase); }, [state.phase, onPhaseChange]);
  useEffect(() => {
    if (health.online || !active) return;
    generation.current++;
    request.current?.abort();
    request.current = null;
    frameSession.current = null;
    setFrame(null);
    setState((previous) => ({
      ...previous, phase: "error", speaking: false,
      error: "Se perdió la conexión a internet. Vuelve a iniciar cuando se recupere.",
    }));
  }, [health.online, active]);
  // Copy the finished conversation into the private Obsidian vault, when enabled.
  useEffect(() => {
    if (!persistEvidence || state.phase !== "ended" || !state.conversationId) return;
    const abort = new AbortController();
    setArchive("saving");
    Promise.allSettled([...pendingCaptures.current])
      .then(() =>
        archiveConversation(state.conversationId, { signal: abort.signal }),
      )
      .then((result) => {
        if (!abort.signal.aborted) setArchive(result);
      });
    return () => abort.abort();
  }, [state.phase, state.conversationId, persistEvidence]);
  useEffect(() => {
    if (state.phase === "authorizing") setArchive(null);
  }, [state.phase]);
  // Screen watching lives only while the conversation is connected.
  useEffect(() => {
    if (state.phase === "connected") connectedAt.current = Date.now();
    else {
      watch.current?.stop();
      watch.current = null;
    }
    if (state.phase === "authorizing") {
      framesSent.current = 0;
      setCaptureWarning(false);
      setScreen({ status: "idle", events: [], frames: 0 });
    }
  }, [state.phase]);
  useEffect(() => () => watch.current?.stop(), []);
  // Sends the held snapshot once the expert has been quiet ~1.5 s and the agent is not talking.
  useEffect(() => {
    if (state.phase !== "connected" || screen.status !== "watching") return;
    gate.current = new TurnGate<Blob>();
    const conversationId = state.conversationId;
    const timer = setInterval(() => {
      const ready = gate.current.poll(Date.now());
      if (!ready || framesSent.current >= MAX_SCREEN_FRAMES) return;
      framesSent.current++;
      const label = `[PANTALLA ${clock(ready.at)}]`;
      post({ type: "screen", frame: ready.item, label });
      if (persistEvidence) void logVaultEvent(conversationId, {
        kind: "note",
        text: `captura enviada al agente ${label}`,
        at: ready.at,
      });
      setScreen((previous) => ({ ...previous, frames: framesSent.current }));
    }, 300);
    return () => clearInterval(timer);
  }, [state.phase, state.conversationId, screen.status, persistEvidence]);
  useEffect(() => {
    const receive = (event: MessageEvent) => {
      const current = frameSession.current;
      if (
        !current ||
        event.origin !== window.location.origin ||
        event.source !== frameElement.current?.contentWindow ||
        event.data?.channel !== channel ||
        event.data.sessionKey !== current.key ||
        !isAgentEvent(event.data.event)
      )
        return;
      const update = event.data.event;
      if (update.type === "voice")
        gate.current.noteVoice(update.active, Date.now());
      if (update.type === "speaking")
        gate.current.noteAgentSpeaking(update.speaking);
      if (update.type === "message" && update.message.role === "user")
        gate.current.noteVoice(false, Date.now());
      setState((previous) => applyAgentEvent(previous, update));
      if (update.type === "ended" || update.type === "error") {
        frameSession.current = null;
        setFrame(null);
      }
    };
    window.addEventListener("message", receive);
    return () => {
      window.removeEventListener("message", receive);
      generation.current++;
      request.current?.abort();
      frameSession.current = null;
    };
  }, []);
  useEffect(() => {
    if (!active) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [active]);
  useEffect(() => {
    if (state.phase !== "connecting") return;
    const timeout = setTimeout(() => {
      generation.current++;
      frameSession.current = null;
      setFrame(null);
      setState((previous) => ({
        ...previous,
        phase: "error",
        error:
          "La conexión tardó demasiado. Si quedó abierto un permiso del navegador, ciérralo antes de volver a intentarlo.",
      }));
    }, 45000);
    return () => clearTimeout(timeout);
  }, [state.phase]);
  const stop = () => {
    generation.current++;
    request.current?.abort();
    request.current = null;
    frameSession.current = null;
    setFrame(null);
    setState((previous) => ({
      ...previous,
      phase: "ended",
      speaking: false,
      error: "",
    }));
  };
  const start = async (mode: AgentMode) => {
    if (active || (requiresCode && !code) || !consent || !health.online || !canStartAgent(health.status, mode))
      return;
    const attempt = ++generation.current;
    const abort = new AbortController();
    request.current = abort;
    const timeout = setTimeout(() => abort.abort(), 12000);
    setState({ ...initialAgentState, phase: "authorizing", mode });
    setDraft("");
    try {
      const response = await fetch(profile.apiBase + "/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        signal: abort.signal,
        body: JSON.stringify({
          displayName: profile.displayName,
          joinCode: code,
          consent,
          mode,
        }),
      });
      if (!response.ok)
        throw new Error(
          accessErrors[response.status] ||
            "No pudimos preparar la conversación. Revisa el servicio e inténtalo de nuevo.",
        );
      const data: unknown = await response.json();
      if (
        !data ||
        typeof data !== "object" ||
        (mode === "voice"
          ? !("conversationToken" in data) ||
            typeof data.conversationToken !== "string"
          : !("signedUrl" in data) || typeof data.signedUrl !== "string")
      )
        throw new Error("El servicio no devolvió un acceso válido.");
      if (generation.current !== attempt) return;
      const next: FrameSession = {
        key: crypto.randomUUID(),
        mode,
        access: data as AgentAccess,
      };
      frameSession.current = next;
      setFrame(next);
      setState((previous) => ({ ...previous, phase: "connecting" }));
    } catch (error) {
      if (generation.current === attempt)
        setState((previous) => ({
          ...previous,
          phase: "error",
          error:
            error instanceof Error &&
            error.name !== "AbortError" &&
            error.name !== "TypeError" &&
            error.name !== "SyntaxError"
              ? error.message
              : "El servicio de conexión no respondió. Comprueba que esté activo e inténtalo de nuevo.",
        }));
    } finally {
      clearTimeout(timeout);
      if (generation.current === attempt) {
        setCode("");
        request.current = null;
      }
    }
  };
  const post = (data: object) => {
    if (frameSession.current)
      frameElement.current?.contentWindow?.postMessage(
        { channel, sessionKey: frameSession.current.key, ...data },
        window.location.origin,
      );
  };
  const shareScreen = async () => {
    if (watch.current || state.phase !== "connected") return;
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getDisplayMedia({
        video: { frameRate: 5 },
        audio: false,
      });
    } catch {
      setScreen((previous) => ({ ...previous, status: "denied" }));
      return;
    }
    const conversationId = state.conversationId;
    const elapsed = () => (Date.now() - connectedAt.current) / 1000;
    try {
      watch.current = await startScreenWatch(
        stream,
        {
          onStatus: (status) => {
            if (status === "ended") watch.current = null;
            setScreen((previous) => ({ ...previous, status }));
          },
          // Every second with changes: context for the agent (no turn) + line in eventos.md.
          onEvent: (event) => {
            post({
              type: "context",
              text: `[OCR ${clock(event.at)}] ${event.text}`,
            });
            if (persistEvidence) void logVaultEvent(conversationId, {
              kind: "screen",
              text: event.text,
              at: event.at,
            });
            setScreen((previous) => ({
              ...previous,
              events: [...previous.events, event].slice(-8),
            }));
          },
          // Store evidence independently of the agent's 10-image conversation limit.
          onCapture: (capture, at) => {
            const saving = archiveScreenCapture(conversationId, capture, at);
            pendingCaptures.current.add(saving);
            void saving
              .then((ok) => {
                if (!ok) setCaptureWarning(true);
              })
              .finally(() => pendingCaptures.current.delete(saving));
          },
          // At a pause: one snapshot, held until the expert is quiet (see the gate effect).
          onPause: (frame, at) => {
            if (framesSent.current < MAX_SCREEN_FRAMES)
              gate.current.offer(frame, at, Date.now());
          },
        },
        { now: elapsed },
      );
    } catch {
      for (const track of stream.getTracks()) track.stop();
      setScreen((previous) => ({ ...previous, status: "error" }));
    }
  };
  const stopScreen = () => {
    watch.current?.stop();
    watch.current = null;
  };
  const send = (event: React.FormEvent) => {
    event.preventDefault();
    const text = draft.trim();
    if (!text || state.phase !== "connected") return;
    post({ type: "message", text });
    setState((previous) =>
      applyAgentEvent(previous, {
        type: "message",
        message: {
          id: "typed-" + crypto.randomUUID(),
          role: "user",
          text,
          at: Date.now(),
        },
      }),
    );
    setDraft("");
  };
  return (
    <div className="agent-page">
      <div className="page-heading">
        <div>
          <h1 tabIndex={-1} ref={headingRef}>{profile.title}</h1>
          <p>{profile.description}</p>
        </div>
      </div>
      <AgentStatus health={health} phase={state.phase} />
      <div className="rtc-disclosure">
        <ShieldCheck size={21} />
        <p>
          <strong>Tú decides cuándo empezar.</strong> Tu voz y tus mensajes se
          envían a ElevenLabs, que puede conservar audio y transcripciones según
          la configuración del agente.
          {persistEvidence && " Si la bóveda privada está activada, al terminar se guarda una copia de la transcripción en ella."}
        </p>
      </div>
      {archive && (archive === "saving" || archive.status !== "disabled") && (
        <p className="agent-archive" role="status">
          {archive === "saving"
            ? "Guardando la transcripción en la bóveda…"
            : archive.status === "saved"
              ? `Transcripción guardada en la bóveda: ${archive.file}`
              : `No se pudo guardar en la bóveda (${archive.reason}).`}
          {archive !== "saving" && archive.status === "saved" && (
            <>
              {" "}
              {archive.flowStatus === "failed" &&
                "El diagrama está pendiente; puedes reintentar desde Mapas de procesos. "}
              <a
                href={
                  "#senior/processes/" +
                  encodeURIComponent(state.conversationId)
                }
              >
                Ver diagrama del proceso
              </a>
            </>
          )}
        </p>
      )}
      {captureWarning && (
        <p role="status" className="agent-capture-warning">
          No se pudieron guardar algunas imágenes en la bóveda. Los pasos
          correspondientes se marcarán sin imagen.
        </p>
      )}
      {state.error && (
        <div className="rtc-alert" role="alert">
          <CircleAlert size={20} />
          <p>{state.error}</p>
        </div>
      )}
      <div className="agent-layout">
        <section className="agent-controls-panel">
          <div
            className={"agent-symbol " + (state.speaking ? "is-speaking" : "")}
            aria-hidden="true"
          >
            <AudioLines size={42} />
          </div>
          <h2>
            {state.phase === "connected"
              ? state.speaking
                ? state.mode === "voice"
                  ? "Tu agente está hablando"
                  : "Tu agente está respondiendo"
                : state.mode === "voice"
                  ? "Te está escuchando"
                  : "Conversemos por texto"
              : role === "intern" ? "¿Qué te gustaría aprender?" : "La experiencia empieza contigo"}
          </h2>
          <p>
            {state.phase === "connected"
              ? state.mode === "voice"
                ? "El micrófono está activo. Al terminar, se cierra la conversación y se libera el dispositivo."
                : "El micrófono está apagado. Escribe para conversar con el mismo agente."
              : role === "intern"
                ? "Cuéntale qué necesitas aprender y pregúntale por el siguiente paso."
                : "Explica una tarea, sus decisiones y sus motivos. Al compartir pantalla se guardan capturas de los cambios en la bóveda privada para ilustrar cada paso."}
          </p>
          {!active && (
            <>
              {requiresCode && (
                <label className="agent-code" htmlFor="agent-code">
                  Código de acceso
                  <input
                    id="agent-code"
                    type="password"
                    autoComplete="off"
                    maxLength={256}
                    placeholder="Introduce tu código de acceso"
                    value={code}
                    onChange={(event) => setCode(event.target.value)}
                  />
                </label>
              )}
              <label className="rtc-consent">
                <input
                  type="checkbox"
                  checked={consent}
                  onChange={(event) => setConsent(event.target.checked)}
                />
                Acepto enviar mi voz o mensajes a ElevenLabs para esta
                conversación.
              </label>
              <button
                className="button primary"
                disabled={
                  !health.online || !canStartAgent(health.status, "voice") || (requiresCode && !code) || !consent
                }
                onClick={() => {
                  void start("voice");
                }}
              >
                <Mic size={18} />
                Iniciar con micrófono
              </button>
              <button
                className="button secondary"
                disabled={
                  !health.online || !canStartAgent(health.status, "text") || (requiresCode && !code) || !consent
                }
                onClick={() => {
                  void start("text");
                }}
              >
                <MessageCircle size={18} />
                Iniciar por texto
              </button>
            </>
          )}
          {state.phase === "connected" &&
            (screen.status === "watching" || screen.status === "loading" ? (
              <button className="button secondary" onClick={stopScreen}>
                <MonitorOff size={18} />
                Dejar de compartir pantalla
              </button>
            ) : (
              <button
                className="button secondary"
                onClick={() => void shareScreen()}
                disabled={!navigator.mediaDevices?.getDisplayMedia}
              >
                <MonitorUp size={18} />
                Compartir pantalla
              </button>
            ))}
          {screen.status !== "idle" && (
            <p className="agent-screen-status" role="status">
              {screen.status === "loading"
                ? "Preparando la lectura de pantalla… la primera vez descarga el OCR."
                : screen.status === "watching"
                  ? `Leyendo tu pantalla cada segundo · capturas al agente ${screen.frames}/${MAX_SCREEN_FRAMES}`
                  : screen.status === "denied"
                    ? "No se compartió la pantalla."
                    : screen.status === "error"
                      ? "No se pudo leer la pantalla. Deja de compartir y vuelve a intentarlo."
                      : "Pantalla dejó de compartirse."}
            </p>
          )}
          {active && (
            <button className="button end-button" onClick={stop}>
              <PhoneOff size={18} />
              {busy ? "Cancelar conexión" : "Terminar conversación"}
            </button>
          )}
          <p className="agent-scope">
            Si compartes pantalla, tu navegador la lee cada segundo: el agente recibe el
            texto que cambia y una captura en cada pausa (máx.{" "}
            {MAX_SCREEN_FRAMES}). Además, se conservan capturas de los cambios
            en tu bóveda privada para ilustrar el procedimiento. Usa datos
            ficticios.
          </p>
        </section>
        <section
          className="agent-transcript"
          aria-labelledby="agent-transcript-title"
        >
          {screen.events.length > 0 && (
            <div className="agent-screen-log" aria-live="polite">
              <h3>Lo que pasa en tu pantalla</h3>
              <ol>
                {screen.events.map((event) => (
                  <li key={`${event.at}-${event.text.slice(0, 20)}`}>
                    <time>{clock(event.at)}</time> {event.text}
                  </li>
                ))}
              </ol>
            </div>
          )}
          <div className="agent-transcript-heading">
            <h2 id="agent-transcript-title">La conversación</h2>
            <span>Mensajes recientes · temporales</span>
          </div>
          <div
            className="agent-messages"
            role="log"
            aria-live="polite"
            aria-relevant="additions text"
          >
            {state.messages.length ? (
              state.messages.map((message) => (
                <article
                  key={message.id}
                  className={"agent-message " + message.role}
                >
                  <div>
                    <strong>
                      {message.role === "agent" ? "Tu agente" : "Tú"}
                    </strong>
                    <time dateTime={new Date(message.at).toISOString()}>
                      {new Date(message.at).toLocaleTimeString("es-MX", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </time>
                  </div>
                  <p>{message.text}</p>
                </article>
              ))
            ) : (
              <div className="agent-empty">
                <MessageCircle size={32} />
                <h3>Aquí aparecerán sus palabras.</h3>
                <p>
                  Inicia una conversación para ver los mensajes reales del
                  agente y, si el agente los emite, la transcripción de tu voz.
                </p>
              </div>
            )}
          </div>
          <form className="agent-compose" onSubmit={send}>
            <label className="sr-only" htmlFor="agent-message">
              Mensaje para el agente
            </label>
            <textarea
              id="agent-message"
              maxLength={4000}
              rows={2}
              disabled={state.phase !== "connected"}
              placeholder="También puedes escribirle…"
              value={draft}
              onChange={(event) => {
                setDraft(event.target.value);
                post({ type: "activity" });
              }}
            />
            <button
              className="button primary"
              type="submit"
              disabled={state.phase !== "connected" || !draft.trim()}
            >
              <Send size={17} />
              Enviar
            </button>
          </form>
          <p className="agent-transcript-note">
            La transcripción puede contener errores. Confirma el criterio antes
            de usarlo como conocimiento validado.
          </p>
        </section>
      </div>
      {frame && (
        <iframe
          key={frame.key}
          className="agent-runtime"
          ref={frameElement}
          title="Conexión individual con ElevenLabs"
          aria-hidden="true"
          tabIndex={-1}
          src={import.meta.env.BASE_URL + "agent-session.html"}
          allow="microphone; autoplay"
          onLoad={() =>
            post({ type: "start", mode: frame.mode, access: frame.access })
          }
        />
      )}
    </div>
  );
}
