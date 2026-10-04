import { useEffect, useRef, useState } from "react";
import {
  AudioLines,
  CircleAlert,
  LoaderCircle,
  MessageCircle,
  Mic,
  PhoneOff,
  Send,
  ShieldCheck,
} from "lucide-react";
import {
  applyAgentEvent,
  channel,
  initialAgentState,
  isAgentEvent,
} from "../services/agentProtocol";
import type {
  AgentAccess,
  AgentMode,
  AgentState,
} from "../services/agentProtocol";
import { archiveConversation } from "../services/vault";
import type { ArchiveResult } from "../services/vault";
import "./AgentConversation.css";
const labels = {
  idle: "Listo para comenzar",
  authorizing: "Preparando acceso…",
  connecting: "Conectando con tu agente…",
  connected: "Conectado",
  ended: "Conversación terminada",
  error: "Sin conexión",
};
type FrameSession = { key: string; mode: AgentMode; access: AgentAccess };
const accessErrors: Record<number, string> = {
  401: "El código de acceso no es correcto. Usa el código de tu equipo.",
  403: "Abre la aplicación desde la dirección autorizada por tu equipo.",
  429: "Hay demasiados intentos o el agente está ocupado. Espera un minuto y vuelve a intentarlo.",
  503: "Falta configurar ElevenLabs. Pide al equipo que complete la clave y el ID del agente.",
  502: "ElevenLabs no pudo autorizar la conversación. Revisa la clave, el agente y su disponibilidad.",
};
export default function AgentConversation() {
  const [state, setState] = useState<AgentState>(initialAgentState);
  const [setup, setSetup] = useState<
    "loading" | "ready" | "missing" | "offline"
  >("loading");
  const [retry, setRetry] = useState(0);
  const [code, setCode] = useState("");
  const [consent, setConsent] = useState(false);
  const [draft, setDraft] = useState("");
  const [frame, setFrame] = useState<FrameSession | null>(null);
  const frameElement = useRef<HTMLIFrameElement>(null);
  const frameSession = useRef<FrameSession | null>(null);
  const generation = useRef(0);
  const request = useRef<AbortController | null>(null);
  const [archive, setArchive] = useState<ArchiveResult | "saving" | null>(null);
  const busy = state.phase === "authorizing" || state.phase === "connecting";
  const active = busy || state.phase === "connected";
  // Copy the finished conversation into the private Obsidian vault, when the team enabled it.
  useEffect(() => {
    if (state.phase !== "ended" || !state.conversationId) return;
    const abort = new AbortController();
    setArchive("saving");
    archiveConversation(state.conversationId, { signal: abort.signal }).then((result) => {
      if (!abort.signal.aborted) setArchive(result);
    });
    return () => abort.abort();
  }, [state.phase, state.conversationId]);
  useEffect(() => {
    if (state.phase === "authorizing") setArchive(null);
  }, [state.phase]);
  useEffect(() => {
    const abort = new AbortController();
    let live = true;
    const timeout = setTimeout(() => abort.abort(), 8000);
    setSetup("loading");
    fetch("/api/elevenlabs/status", { signal: abort.signal, cache: "no-store" })
      .then((response) => {
        if (!response.ok) throw new Error();
        return response.json();
      })
      .then((data) => {
        if (live)
          setSetup(
            typeof data?.configured === "boolean"
              ? data.configured
                ? "ready"
                : "missing"
              : "offline",
          );
      })
      .catch(() => {
        if (live) setSetup("offline");
      })
      .finally(() => clearTimeout(timeout));
    return () => {
      live = false;
      abort.abort();
      clearTimeout(timeout);
    };
  }, [retry]);
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
    if (active || !code || !consent || setup !== "ready") return;
    const attempt = ++generation.current;
    const abort = new AbortController();
    request.current = abort;
    const timeout = setTimeout(() => abort.abort(), 12000);
    setState({ ...initialAgentState, phase: "authorizing", mode });
    setDraft("");
    try {
      const response = await fetch("/api/elevenlabs/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        signal: abort.signal,
        body: JSON.stringify({
          displayName: "Experto",
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
          <h1>Cuéntale cómo lo haces.</h1>
          <p>Una conversación individual con tu agente de ElevenLabs.</p>
        </div>
        <span
          className={
            "rtc-connection " +
            (state.phase === "connected" ? "connected" : "disconnected")
          }
          role="status"
        >
          {busy ? (
            <LoaderCircle size={16} className="spin" />
          ) : (
            <AudioLines size={17} />
          )}
          {labels[state.phase]}
        </span>
      </div>
      <div className="rtc-disclosure">
        <ShieldCheck size={21} />
        <p>
          <strong>Tú decides cuándo empezar.</strong> Tu voz y tus mensajes se
          envían a ElevenLabs, que puede conservar audio y transcripciones según
          la configuración del agente. Si tu equipo activó la bóveda privada,
          al terminar se guarda una copia de la transcripción en ella.
        </p>
      </div>
      {archive && (archive === "saving" || archive.status !== "disabled") && (
        <p className="agent-archive" role="status">
          {archive === "saving"
            ? "Guardando la transcripción en la bóveda…"
            : archive.status === "saved"
              ? `Transcripción guardada en la bóveda: ${archive.file}`
              : `No se pudo guardar en la bóveda (${archive.reason}).`}
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
          <span className="agent-eyebrow">APRENDIZ · ELEVENLABS</span>
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
              : "La experiencia empieza contigo"}
          </h2>
          <p>
            {state.phase === "connected"
              ? state.mode === "voice"
                ? "El micrófono está activo. Al terminar, se cierra la conversación y se libera el dispositivo."
                : "El micrófono está apagado. Escribe para conversar con el mismo agente."
              : "Explica una tarea, sus decisiones y lo que has aprendido al realizarla."}
          </p>
          {!active && (
            <>
              {setup !== "ready" && (
                <div className="agent-setup" role="status">
                  {setup === "loading"
                    ? "Comprobando configuración…"
                    : setup === "missing"
                      ? "El agente aún no está configurado."
                      : "El servicio de conexión no está disponible."}
                  {setup !== "loading" && (
                    <button
                      className="text-button"
                      onClick={() => setRetry((value) => value + 1)}
                    >
                      Volver a comprobar
                    </button>
                  )}
                </div>
              )}
              <label className="agent-code" htmlFor="agent-code">
                Código de acceso del equipo
                <input
                  id="agent-code"
                  type="password"
                  autoComplete="off"
                  maxLength={256}
                  placeholder="El mismo código de acceso del equipo"
                  value={code}
                  onChange={(event) => setCode(event.target.value)}
                />
              </label>
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
                disabled={setup !== "ready" || !code || !consent}
                onClick={() => {
                  void start("voice");
                }}
              >
                <Mic size={18} />
                Iniciar con micrófono
              </button>
              <button
                className="button secondary"
                disabled={setup !== "ready" || !code || !consent}
                onClick={() => {
                  void start("text");
                }}
              >
                <MessageCircle size={18} />
                Iniciar por texto
              </button>
            </>
          )}
          {active && (
            <button className="button end-button" onClick={stop}>
              <PhoneOff size={18} />
              {busy ? "Cancelar conexión" : "Terminar conversación"}
            </button>
          )}
          <p className="agent-scope">
            Esta conversación no se escucha en la sala del equipo. El agente
            recibe voz o texto; la pantalla y el Work Map todavía no están
            conectados.
          </p>
        </section>
        <section
          className="agent-transcript"
          aria-labelledby="agent-transcript-title"
        >
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
