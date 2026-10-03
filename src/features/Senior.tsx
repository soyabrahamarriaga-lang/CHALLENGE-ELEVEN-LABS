import { useState } from "react";
import type { Dispatch } from "react";
import {
  AudioLines,
  Phone,
  PhoneOff,
  Pause,
  Play,
  CircleCheck,
  CircleAlert,
  WifiOff,
  LoaderCircle,
  Monitor,
  Mic,
  ArrowRight,
  Check,
  EyeOff,
  MessageCircle,
  ShieldCheck,
  X,
  ArrowUpRight,
} from "lucide-react";
import type { CallState, CallEvent, KnowledgeSession } from "../domain/types";
import { timeLabel } from "../domain/callMachine";
import { questions } from "../data/sessions";
import { Avatar, DemoNote, Modal, SessionCard } from "../components/Shared";
const connectionLabels = {
  disconnected: "Desconectado",
  connecting: "Conectando…",
  connected: "Conectado",
  error: "Error de conexión",
};
export function ConnectionBadge({ state }: { state: CallState }) {
  const Icon =
    state.connection === "connected"
      ? CircleCheck
      : state.connection === "connecting"
        ? LoaderCircle
        : state.connection === "error"
          ? CircleAlert
          : WifiOff;
  return (
    <span className={"connection-badge " + state.connection} role="status">
      <Icon
        size={14}
        className={state.connection === "connecting" ? "spin" : ""}
      />
      {connectionLabels[state.connection]}
    </span>
  );
}
export function Senior({
  state,
  dispatch,
  sessions,
  openSession,
  openLibrary,
  onSave,
  openLiveCall,
  openAgent,
}: {
  state: CallState;
  dispatch: Dispatch<CallEvent>;
  sessions: KnowledgeSession[];
  openSession: (id: string) => void;
  openLibrary: () => void;
  onSave: (title: string) => void;
  openLiveCall: () => void;
  openAgent: () => void;
}) {
  const [consentOpen, setConsentOpen] = useState(false);
  const [consent, setConsent] = useState(false);
  const [finishOpen, setFinishOpen] = useState(false);
  const [title, setTitle] = useState("Resolver una incidencia de acceso");
  const [hiddenQuestion, setHiddenQuestion] = useState(-1);
  const active = state.session === "active";
  const inSession = active || state.session === "paused";
  const ended = state.session === "ended";
  const question = questions[state.questionIndex];
  const connect = () => dispatch({ type: "CONNECT" });
  return (
    <>
      <div className="page-heading">
        <div>
          <h1>Tu experiencia abre camino.</h1>
          <p>
            Comparte cómo lo haces. Y todo lo que has aprendido en el camino.
          </p>
        </div>
        <span className="date-label">Tu espacio de senior</span>
      </div>
      <div className="real-call-entry agent-entry">
        <p>
          <strong>Tu experiencia, en conversación.</strong>Conversa
          individualmente con tu agente de ElevenLabs.
        </p>
        <button className="button primary" onClick={openAgent}>
          <AudioLines size={18} />
          Hablar con mi agente
        </button>
      </div>
      <div className="real-call-entry">
        <p>
          <strong>¿Listo para compartir con tu equipo?</strong>Usa voz, cámara o
          pantalla en una sala real.
        </p>
        <button className="button primary" onClick={openLiveCall}>
          <Phone size={17} />
          Abrir videollamada
        </button>
      </div>
      <div className="senior-layout">
        <section
          className={"call-card " + (inSession ? "is-session" : "")}
          aria-label="Llamada de demostración"
        >
          <header className="call-card-header">
            <div className="agent-label">
              <span className="agent-symbol">
                <AudioLines size={20} />
              </span>
              <div>
                <strong>Tu aprendiz de IA</strong>
                <small>Aprende contigo, a tu ritmo</small>
              </div>
            </div>
            <ConnectionBadge state={state} />
          </header>
          {state.connection === "error" && (
            <div className="inline-alert" role="alert">
              <CircleAlert size={18} />
              <span>
                La conexión de ejemplo se interrumpió.
                {inSession ? " Tu sesión está en pausa." : ""}
              </span>
              <button onClick={connect}>Reintentar</button>
            </div>
          )}
          {!inSession && !ended ? (
            <div className="call-welcome">
              <div className="voice-mark" aria-hidden="true">
                <span />
                <span />
                <span />
                <span />
                <span />
                <span />
                <span />
                <span />
                <span />
              </div>
              <h2>
                Haz lo tuyo.
                <br />
                <span>El conocimiento se queda.</span>
              </h2>
              <p>
                Trabaja como siempre mientras tu aprendiz descubre las
                decisiones que hacen única tu experiencia.
              </p>
              <button
                className="button primary start-button"
                onClick={() => {
                  setConsent(false);
                  setConsentOpen(true);
                }}
              >
                <Phone size={18} />
                Iniciar demo
                <ArrowUpRight size={17} />
              </button>
              <div className="idle-note">
                <span className="status-dot" />
                Sin sesión activa · No se está registrando nada
              </div>
            </div>
          ) : ended ? (
            <div className="call-ended">
              <span className="success-medallion">
                <Check size={28} />
              </span>
              <h2>La sesión de ejemplo terminó.</h2>
              <p>
                Revisa el título y guarda el recorrido para explorarlo desde el
                perfil intern.
              </p>
              <label className="field-label" htmlFor="session-title">
                Título de la sesión
              </label>
              <input
                id="session-title"
                maxLength={100}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
              <span className="field-hint">
                Se guardará un proceso de ejemplo, sin audio ni análisis real.
              </span>
              <div className="end-actions">
                <button
                  className="button primary"
                  onClick={() => onSave(title)}
                >
                  Guardar y ver sesión
                  <ArrowRight size={16} />
                </button>
                <button
                  className="text-button"
                  onClick={() => dispatch({ type: "RESET" })}
                >
                  Descartar demo
                </button>
              </div>
            </div>
          ) : (
            <div className="call-live">
              <div className="live-session-heading">
                <span
                  className={"session-state " + (active ? "active" : "paused")}
                >
                  <span className="status-dot" />
                  {active ? "Sesión de ejemplo activa" : "Sesión en pausa"}
                </span>
                <span
                  className="session-timer"
                  aria-label={"Duración: " + timeLabel(state.elapsed)}
                >
                  {timeLabel(state.elapsed)}
                </span>
              </div>
              <div className="live-stage">
                <div className="shared-screen-preview">
                  <div className="preview-toolbar">
                    <span />
                    <span />
                    <span />
                    <b>Mesa de ayuda · ejemplo</b>
                  </div>
                  <div className="preview-content">
                    <span className="mock-ticket-id">Ticket #4821</span>
                    <h3>No puedo acceder a mi espacio</h3>
                    <div className="mock-ticket-author">
                      <Avatar initials="LC" color="blue" />
                      <span>
                        Lucía Campos<small>Cliente de ejemplo</small>
                      </span>
                    </div>
                    <p>
                      Hola, desde esta mañana no puedo entrar. Ayer pude
                      trabajar con normalidad.
                    </p>
                    <div className="mock-ticket-footer">
                      <span>
                        <Check size={12} />
                        Identidad verificada
                      </span>
                      <span>Sin alertas</span>
                    </div>
                  </div>
                </div>
                {!active && (
                  <div className="paused-overlay">
                    <Pause size={26} />
                    <strong>Tu espacio, tu pausa.</strong>
                    <span>El tiempo y las preguntas están detenidos.</span>
                  </div>
                )}
              </div>
              <div className="sharing-strip">
                <span>
                  <Monitor size={14} />
                  Pantalla de ejemplo
                </span>
                <span>
                  <Mic size={14} />
                  Voz simulada
                </span>
                <span>Sin acceso a tus dispositivos</span>
              </div>
              <div className="call-controls">
                <button
                  className="button secondary"
                  disabled={!active && state.connection !== "connected"}
                  onClick={() =>
                    dispatch({ type: active ? "PAUSE" : "RESUME" })
                  }
                >
                  {active ? <Pause size={17} /> : <Play size={17} />}
                  {active ? "Pausar" : "Reanudar"}
                </button>
                <button
                  className="button end-button"
                  onClick={() => setFinishOpen(true)}
                >
                  <PhoneOff size={17} />
                  Finalizar
                </button>
              </div>
              {state.pauseReason === "connection" && (
                <p className="connection-help">
                  Reconecta al agente y pulsa Reanudar para continuar.
                </p>
              )}
            </div>
          )}
          <footer className="call-card-footer">
            <ShieldCheck size={15} />
            <span>Tu experiencia es tuya. Tú decides cuándo compartirla.</span>
            <span className="small-demo">DEMO</span>
          </footer>
        </section>
        <aside className="companion-rail">
          {inSession ? (
            <>
              <div className="rail-heading">
                <MessageCircle size={18} />
                <h2>Un momento de curiosidad</h2>
              </div>
              <p className="rail-intro">
                Tu aprendiz pregunta para entender, nunca para evaluarte.
              </p>
              {hiddenQuestion === state.questionIndex ? (
                <div className="question-rest">
                  <AudioLines size={24} />
                  <p>Sigue a tu ritmo.</p>
                  <span>La pregunta quedó para después.</span>
                  <button
                    className="text-button"
                    onClick={() => setHiddenQuestion(-1)}
                  >
                    Volver a mostrar
                  </button>
                </div>
              ) : (
                <div className="question-card">
                  <span className="question-from">
                    <AudioLines size={16} />
                    Tu aprendiz · ejemplo
                  </span>
                  <blockquote>“{question.text}”</blockquote>
                  <p>{question.note}</p>
                  <button
                    className="text-button"
                    onClick={() => setHiddenQuestion(state.questionIndex)}
                  >
                    Ahora no
                    <ArrowRight size={15} />
                  </button>
                </div>
              )}
              <button
                className="button secondary next-question"
                disabled={!active}
                onClick={() => {
                  dispatch({ type: "NEXT_QUESTION" });
                  setHiddenQuestion(-1);
                }}
              >
                Ver otra pregunta de ejemplo
              </button>
              <div className="session-notes">
                <h3>Lo que queda en el ejemplo</h3>
                <p>
                  Fragmentos ficticios para explorar el control del registro.
                </p>
                {[
                  "Contexto del ticket",
                  "Criterio para revisar el historial",
                  "Cuándo consultar a seguridad",
                ].map((note, index) => (
                  <div
                    className={
                      "session-note " +
                      (state.excluded.includes(index) ? "excluded" : "")
                    }
                    key={note}
                  >
                    <span>
                      {state.excluded.includes(index) ? (
                        <EyeOff size={14} />
                      ) : (
                        <Check size={14} />
                      )}
                      {state.excluded.includes(index)
                        ? "Fragmento excluido"
                        : note}
                    </span>
                    {!state.excluded.includes(index) && (
                      <button
                        className="icon-button"
                        aria-label={"Excluir " + note}
                        onClick={() => dispatch({ type: "EXCLUDE", index })}
                      >
                        <X size={14} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </>
          ) : (
            <>
              <h2>El valor está en el porqué.</h2>
              <p className="rail-intro">
                No hace falta preparar un guion. Solo hacer lo que ya sabes
                hacer.
              </p>
              <ol className="preparation-list">
                <li>
                  <span>1</span>
                  <div>
                    <h3>Elige una tarea cotidiana</h3>
                    <p>
                      Una que conozcas bien, con decisiones que puedas
                      compartir.
                    </p>
                  </div>
                </li>
                <li>
                  <span>2</span>
                  <div>
                    <h3>Trabaja a tu manera</h3>
                    <p>
                      Tu aprendiz acompaña y pregunta en los momentos oportunos.
                    </p>
                  </div>
                </li>
                <li>
                  <span>3</span>
                  <div>
                    <h3>Deja tu experiencia en buenas manos</h3>
                    <p>
                      El proceso y sus razones se convierten en una guía para
                      alguien más.
                    </p>
                  </div>
                </li>
              </ol>
              <div className="human-note">
                <span className="mini-avatars">
                  <Avatar initials="MT" />
                  <Avatar initials="DR" color="blue" />
                  <Avatar initials="AR" color="sand" />
                </span>
                <p>
                  Distintas personas.
                  <br />
                  <strong>Distintas formas de hacerlo bien.</strong>
                </p>
              </div>
            </>
          )}
        </aside>
      </div>
      <section className="recent-section">
        <div className="section-heading">
          <div>
            <h2>Experiencias que ya tienen relevo</h2>
            <p>Sesiones de ejemplo para descubrir cómo funciona.</p>
          </div>
          <button className="text-button" onClick={openLibrary}>
            Ver biblioteca
            <ArrowRight size={16} />
          </button>
        </div>
        <div className="session-grid">
          {sessions.slice(0, 3).map((session) => (
            <SessionCard
              key={session.id}
              session={session}
              compact
              onOpen={() => openSession(session.id)}
            />
          ))}
        </div>
      </section>
      <DemoNote />
      {consentOpen && (
        <Modal title="Antes de empezar" onClose={() => setConsentOpen(false)}>
          <div className="modal-description">
            Vas a explorar una llamada de demostración. No encenderemos tu
            micrófono ni capturaremos tu pantalla.
          </div>
          <div className="consent-resources">
            <div>
              <Monitor size={22} />
              <span>
                <strong>Pantalla de ejemplo</strong>
                <small>Una incidencia ficticia de soporte.</small>
              </span>
              <span className="resource-label">Simulada</span>
            </div>
            <div>
              <Mic size={22} />
              <span>
                <strong>Conversación de ejemplo</strong>
                <small>Preguntas escritas; no se graba audio.</small>
              </span>
              <span className="resource-label">Simulada</span>
            </div>
          </div>
          <div className="consent-connection">
            <span>Conexión del aprendiz</span>
            <ConnectionBadge state={state} />
            {state.connection !== "connected" && (
              <button
                className="button secondary"
                disabled={state.connection === "connecting"}
                onClick={connect}
              >
                {state.connection === "connecting" ? (
                  <LoaderCircle className="spin" size={16} />
                ) : (
                  <AudioLines size={16} />
                )}
                {state.connection === "connecting"
                  ? "Conectando…"
                  : "Conectar demo"}
              </button>
            )}
          </div>
          <label className="consent-check">
            <input
              type="checkbox"
              checked={consent}
              onChange={(e) => setConsent(e.target.checked)}
            />
            <span>
              Quiero iniciar esta demostración con datos de ejemplo. Puedo
              pausarla o detenerla en cualquier momento.
            </span>
          </label>
          <div className="modal-actions">
            <button
              className="button secondary"
              onClick={() => setConsentOpen(false)}
            >
              Volver
            </button>
            <button
              className="button primary"
              disabled={!consent || state.connection !== "connected"}
              onClick={() => {
                dispatch({ type: "START", consent });
                setConsentOpen(false);
              }}
            >
              <Phone size={17} />
              Iniciar demo
            </button>
          </div>
        </Modal>
      )}
      {finishOpen && (
        <Modal
          title="¿Terminamos por ahora?"
          onClose={() => setFinishOpen(false)}
        >
          <p className="modal-description">
            La sesión se detendrá. Después podrás revisar el título y guardar el
            proceso de ejemplo en tu biblioteca.
          </p>
          <div className="finish-duration">
            <ClockIllustration />
            <span>
              Tiempo de esta demo<strong>{timeLabel(state.elapsed)}</strong>
            </span>
          </div>
          <div className="modal-actions">
            <button
              className="button secondary"
              onClick={() => setFinishOpen(false)}
            >
              Seguir en la sesión
            </button>
            <button
              className="button end-button"
              onClick={() => {
                dispatch({ type: "FINISH" });
                setFinishOpen(false);
              }}
            >
              <PhoneOff size={17} />
              Finalizar demo
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}
function ClockIllustration() {
  return <CircleCheck size={30} />;
}
