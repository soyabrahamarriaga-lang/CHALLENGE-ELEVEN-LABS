import { t, dateLocale } from "../i18n";
import { useEffect, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Bookmark,
  Check,
  ChevronDown,
  CircleCheck,
  FileText,
  GitBranch,
  Layers,
  Maximize2,
  MessageCircle,
  Pause,
  Play,
  Quote,
  ShieldCheck,
  SkipBack,
  X,
} from "lucide-react";
import type { KnowledgeSession } from "../domain/types";
import { timeLabel } from "../domain/callMachine";
import {
  Avatar,
  DemoNote,
  Modal,
  SessionMetadata,
  StepBadge,
  StepIcon,
} from "../components/Shared";
export function SessionDetail({
  session,
  onBack,
  saved,
  onToggleSaved,
}: {
  session: KnowledgeSession;
  onBack: () => void;
  saved: boolean;
  onToggleSaved: () => void;
}) {
  const [position, setPosition] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [tab, setTab] = useState<"flow" | "conversation">("flow");
  const [expanded, setExpanded] = useState(false);
  const [reviewed, setReviewed] = useState(false);
  const [variantOpen, setVariantOpen] = useState(true);
  const [speed, setSpeed] = useState(1);
  const duration = Math.max(session.duration, 1);
  const index = Math.max(
    0,
    session.steps.reduce(
      (found, item, i) => (item.at <= position ? i : found),
      0,
    ),
  );
  const step = session.steps[index];
  useEffect(() => {
    if (!playing) return;
    const timer = setInterval(
      () => setPosition((current) => Math.min(current + speed, duration)),
      1000,
    );
    return () => clearInterval(timer);
  }, [playing, speed, duration]);
  useEffect(() => {
    if (position >= duration) setPlaying(false);
  }, [position, duration]);
  const jump = (time: number) => setPosition(time);
  const togglePlayback = () => {
    if (position >= duration) setPosition(0);
    setPlaying(!playing);
  };
  const video = (
    <div className={"example-player " + session.color}>
      <div className="player-topline">
        <span>
          <span className="status-dot" />{t("Grabación de ejemplo")}</span>
        <span>{t("SIN AUDIO REAL")}</span>
      </div>
      <div className="player-workspace">
        <div className="workspace-sidebar">
          <span className="workspace-mini-logo">
            <Layers size={17} />
          </span>
          <i />
          <i />
          <i />
          <i />
        </div>
        <div className="workspace-body">
          <div className="workspace-breadcrumb">
            {t(session.category)}
            <span>/</span>{t("Proceso de ejemplo")}</div>
          <h3>{step?.title || t("Proceso de ejemplo")}</h3>
          <div className="workspace-record">
            <FileText size={23} />
            <div>
              <b>
                {session.id === "accesos"
                  ? t("Solicitud #4821")
                  : t("Documento de trabajo")}
              </b>
              <small>{t("Contenido ficticio para explorar la sesión")}</small>
            </div>
            <span className="record-status">{t("En revisión")}</span>
          </div>
          <div className="workspace-text">
            <span />
            <span />
            <span />
          </div>
          <div className="workspace-checks">
            <span>
              <CircleCheck size={15} />{t("Contexto revisado")}</span>
            <span>
              <CircleCheck size={15} />{t("Criterio documentado")}</span>
          </div>
          <div className="workspace-current">
            <StepIcon kind={step?.kind || "step"} />
            <span>
              {step?.action ||
                t("No hay fragmentos conservados en esta demostración.")}
            </span>
          </div>
        </div>
      </div>
      <div className="player-caption">
        <Avatar initials={session.initials} color={session.color} />
        <span>
          <strong>{session.senior}</strong>
          <small>
            {playing
              ? t("Recorrido visual en reproducción")
              : t("Recorrido visual pausado")}
          </small>
        </span>
        <span className="caption-time">{timeLabel(position)}</span>
      </div>
    </div>
  );
  return (
    <>
      <button className="back-link" onClick={onBack}>
        <ArrowLeft size={16} />{t("Volver a la biblioteca")}</button>
      <div className="detail-heading">
        <div>
          <h1>{session.title}</h1>
          <p>{session.description}</p>
        </div>
        <button
          className={
            "button secondary bookmark-button " + (saved ? "is-saved" : "")
          }
          onClick={onToggleSaved}
          aria-pressed={saved}
        >
          <Bookmark size={17} fill={saved ? "currentColor" : "none"} />
          {saved ? "Guardada" : t("Guardar en mi biblioteca")}
        </button>
      </div>
      <div className="detail-byline">
        <Avatar initials={session.initials} color={session.color} />
        <span>
          <strong>{session.senior}</strong>
          <small>{session.role}</small>
        </span>
        <span className="byline-date">
          {new Date(session.date).toLocaleDateString(dateLocale(), {
            day: "numeric",
            month: "long",
            year: "numeric",
          })}
        </span>
        <SessionMetadata session={session} />
      </div>
      <div className="detail-layout">
        <div className="detail-main">
          <section
            className="player-section"
            aria-label={t("Reproducción visual simulada")}
          >
            {video}
            <div className="player-controls">
              <button
                className="player-play"
                onClick={togglePlayback}
                aria-label={
                  playing
                    ? t("Pausar reproducción de ejemplo")
                    : t("Reproducir ejemplo")
                }
              >
                {playing ? (
                  <Pause size={17} fill="currentColor" />
                ) : (
                  <Play size={17} fill="currentColor" />
                )}
              </button>
              <button
                className="icon-button"
                onClick={() => {
                  setPosition(0);
                  setPlaying(false);
                }}
                aria-label={t("Volver al inicio")}
              >
                <SkipBack size={17} />
              </button>
              <span className="player-time">
                {timeLabel(position)}
                <span> / {timeLabel(duration)}</span>
              </span>
              <label className="scrubber">
                <span className="sr-only">{t("Posición de la reproducción")}</span>
                <input
                  type="range"
                  min="0"
                  max={duration}
                  value={position}
                  onChange={(e) => jump(Number(e.target.value))}
                  style={
                    {
                      "--progress": (position / duration) * 100 + "%",
                    } as React.CSSProperties
                  }
                />
              </label>
              <select
                className="playback-speed"
                aria-label={t("Velocidad de reproducción")}
                value={speed}
                onChange={(e) => setSpeed(Number(e.target.value))}
              >
                <option value="1">1×</option>
                <option value="1.5">1.5×</option>
                <option value="2">2×</option>
              </select>
              <button
                className="icon-button"
                onClick={() => setExpanded(true)}
                aria-label={t("Ampliar reproducción de ejemplo")}
              >
                <Maximize2 size={16} />
              </button>
            </div>
          </section>
          {step ? (
            <section className="step-insight" aria-live="polite">
              <h2>{step.title}</h2>
              <div className="insight-heading">
                <StepBadge kind={step.kind} />
                <span>{t("Paso")}{" "}{index + 1}{" "}{t("de")}{" "}{session.steps.length}
                </span>
              </div>
              <div className="insight-sections">
                <div>
                  <h3>{t("Qué hizo")}</h3>
                  <p>{step.action}</p>
                </div>
                <div>
                  <h3>{t("Para qué")}</h3>
                  <p>{step.purpose}</p>
                </div>
              </div>
              <div className="expert-quote">
                <Quote size={24} />
                <div>
                  <blockquote>“{step.quote}”</blockquote>
                  <span>
                    {session.senior} <span>{t("· explicación de ejemplo")}</span>
                  </span>
                </div>
              </div>
              {step.context && (
                <p className="context-note">
                  <ShieldCheck size={16} />
                  <span>
                    <strong>{t("En este contexto:")}</strong> {step.context}
                  </span>
                </p>
              )}
              {step.variant && (
                <div className="variant-section">
                  <button
                    aria-expanded={variantOpen}
                    onClick={() => setVariantOpen(!variantOpen)}
                  >
                    <GitBranch size={17} />
                    <strong>{t("Un camino diferente cuando cambia el contexto")}</strong>
                    <ChevronDown
                      className={variantOpen ? "rotated" : ""}
                      size={18}
                    />
                  </button>
                  {variantOpen && <p>{step.variant}</p>}
                </div>
              )}
              <div className="step-navigation">
                <button
                  className="text-button"
                  disabled={index === 0}
                  onClick={() => jump(session.steps[index - 1].at)}
                >
                  <ArrowLeft size={15} />{t("Paso anterior")}</button>
                {index < session.steps.length - 1 ? (
                  <button
                    className="text-button"
                    onClick={() => jump(session.steps[index + 1].at)}
                  >{t("Siguiente paso")}<ArrowRight size={15} />
                  </button>
                ) : (
                  <button
                    className="text-button"
                    onClick={() => setReviewed(true)}
                  >
                    <Check size={16} />
                    {reviewed
                      ? t("Recorrido revisado")
                      : t("Marcar recorrido como revisado")}
                  </button>
                )}
              </div>
            </section>
          ) : (
            <div className="no-fragments">
              <h2>{t("No quedan fragmentos en esta demo.")}</h2>
              <p>{t("Los fragmentos excluidos no se incorporan al recorrido guardado.")}</p>
            </div>
          )}
          {reviewed && (
            <div className="reviewed-note" role="status">
              <CircleCheck size={20} />
              <span>{t("Terminaste de explorar este recorrido. El siguiente paso es practicar: revisar una sesión no demuestra todavía dominio de la tarea.")}</span>
              <button
                className="icon-button"
                onClick={() => setReviewed(false)}
                aria-label={t("Cerrar aviso")}
              >
                <X size={15} />
              </button>
            </div>
          )}
        </div>
        <aside className="process-panel">
          <div
            className="process-tabs"
            role="tablist"
            aria-label={t("Explorar contenido de sesión")}
          >
            <button
              role="tab"
              tabIndex={tab === "flow" ? 0 : -1}
              onKeyDown={(event) => {
                if (["ArrowRight", "ArrowLeft", "End"].includes(event.key)) {
                  event.preventDefault();
                  setTab("conversation");
                  document.getElementById("conversation-tab")?.focus();
                }
              }}
              id="flow-tab"
              aria-selected={tab === "flow"}
              aria-controls="flow-content"
              onClick={() => setTab("flow")}
            >
              <GitBranch size={16} />{t("Flujo de trabajo")}</button>
            <button
              role="tab"
              tabIndex={tab === "conversation" ? 0 : -1}
              onKeyDown={(event) => {
                if (["ArrowRight", "ArrowLeft", "Home"].includes(event.key)) {
                  event.preventDefault();
                  setTab("flow");
                  document.getElementById("flow-tab")?.focus();
                }
              }}
              id="conversation-tab"
              aria-selected={tab === "conversation"}
              aria-controls="conversation-content"
              onClick={() => setTab("conversation")}
            >
              <MessageCircle size={16} />{t("Conversación")}</button>
          </div>
          {tab === "flow" ? (
            <div role="tabpanel" id="flow-content" aria-labelledby="flow-tab">
              <div className="process-panel-heading">
                <h2>{t("El proceso, con sus porqués.")}</h2>
                <p>{t("Selecciona un momento para explorarlo.")}</p>
              </div>
              <ol className="process-timeline">
                {session.steps.map((item, i) => (
                  <li
                    className={item.kind + (i === index ? " current" : "")}
                    key={item.id}
                  >
                    <button
                      onClick={() => jump(item.at)}
                      aria-current={i === index ? "step" : undefined}
                    >
                      <span className="timeline-node">
                        {item.kind === "step" ? (
                          i + 1
                        ) : (
                          <StepIcon kind={item.kind} size={15} />
                        )}
                      </span>
                      <span className="timeline-item-content">
                        <span className="timeline-kind">
                          {item.kind === "step"
                            ? t("Paso habitual")
                            : item.kind === "decision"
                              ? t("Punto de decisión")
                              : t("Variante del proceso")}
                        </span>
                        <strong>{item.title}</strong>
                        <span className="timeline-time">
                          {timeLabel(item.at)}
                          <Play size={11} />
                        </span>
                      </span>
                    </button>
                  </li>
                ))}
              </ol>
              <div className="timeline-legend">
                <span>
                  <span className="legend-dot" />{t("Paso")}</span>
                <span>
                  <GitBranch size={12} />{t("Decisión")}</span>
                <span>
                  <span className="legend-dash" />{t("Variante")}</span>
              </div>
            </div>
          ) : (
            <div
              role="tabpanel"
              id="conversation-content"
              aria-labelledby="conversation-tab"
              className="transcript"
            >
              <h2>{t("En palabras del senior")}</h2>
              <p>{t("Fragmentos escritos de ejemplo, sin audio real.")}</p>
              {session.steps.map((item) => (
                <button
                  className={item.id === step?.id ? "selected" : ""}
                  onClick={() => jump(item.at)}
                  key={item.id}
                >
                  <span>
                    {timeLabel(item.at)}
                    <Play size={12} />
                  </span>
                  <blockquote>“{item.quote}”</blockquote>
                  <small>{session.senior}</small>
                </button>
              ))}
            </div>
          )}
          <div className="context-reminder">
            <Quote size={19} />
            <p>{t("Una forma de hacerlo, con su contexto. Otras personas pueden seguir otro camino.")}</p>
          </div>
        </aside>
      </div>
      <DemoNote>{t("Las escenas, explicaciones y personas de esta sesión son ejemplos. No proceden de una grabación real.")}</DemoNote>
      {expanded && (
        <Modal
          title={t("Recorrido visual de ejemplo")}
          className="wide-modal"
          onClose={() => setExpanded(false)}
        >
          {video}
          <p className="modal-description">
            {step?.action || t("Sin fragmentos conservados.")}
          </p>
          <button
            className="button secondary"
            onClick={() => setExpanded(false)}
          >{t("Volver al proceso")}</button>
        </Modal>
      )}
    </>
  );
}
