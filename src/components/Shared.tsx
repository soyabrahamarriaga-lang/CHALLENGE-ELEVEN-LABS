import { useEffect, useId, useRef } from "react";
import type { ReactNode } from "react";
import {
  ArrowUpRight,
  ArrowRight,
  Clock3,
  GitBranch,
  Layers,
  Play,
  X,
  BookOpen,
  Check,
  Circle,
  Shuffle,
  ShieldCheck,
} from "lucide-react";
import type { KnowledgeSession, StepKind } from "../domain/types";
import { timeLabel } from "../domain/callMachine";
export function Logo({ small = false }: { small?: boolean }) {
  return (
    <span className={"brand " + (small ? "brand-small" : "")}>
      <svg viewBox="0 0 36 36" aria-hidden="true">
        <path d="M9 8v11a9 9 0 0 0 18 0V8M18 8v10" />
      </svg>
      {!small && <span>UserHelper</span>}
    </span>
  );
}
export function Avatar({
  initials,
  color = "sage",
  large = false,
}: {
  initials: string;
  color?: string;
  large?: boolean;
}) {
  return (
    <span
      className={"avatar " + color + (large ? " avatar-large" : "")}
      aria-hidden="true"
    >
      {initials}
    </span>
  );
}
export const stepLabels: Record<StepKind, string> = {
  step: "Paso habitual",
  decision: "Decisión",
  variant: "Otra forma de hacerlo",
};
export function StepIcon({
  kind,
  size = 16,
}: {
  kind: StepKind;
  size?: number;
}) {
  return kind === "decision" ? (
    <GitBranch size={size} />
  ) : kind === "variant" ? (
    <Shuffle size={size} />
  ) : (
    <Circle size={size} />
  );
}
export function StepBadge({ kind }: { kind: StepKind }) {
  return (
    <span className={"step-badge " + kind}>
      <StepIcon kind={kind} size={13} />
      {stepLabels[kind]}
    </span>
  );
}
export function SessionArt({ session }: { session: KnowledgeSession }) {
  return (
    <div className={"session-art " + session.color} aria-hidden="true">
      <div className="art-window">
        <div className="art-window-top">
          <span />
          <span />
          <span />
          <b>{session.category}</b>
        </div>
        <div className="art-flow">
          <span className="art-node">
            <Layers size={17} />
          </span>
          <i />
          <span className="art-node art-decision">
            <GitBranch size={17} />
          </span>
          <i />
          <span className="art-node">
            <Check size={17} />
          </span>
        </div>
        <div className="art-lines">
          <span />
          <span />
        </div>
      </div>
      <span className="art-play">
        <Play size={16} fill="currentColor" />
      </span>
      <span className="art-duration">{timeLabel(session.duration)}</span>
    </div>
  );
}
export function SessionCard({
  session,
  onOpen,
  compact = false,
}: {
  session: KnowledgeSession;
  onOpen: () => void;
  compact?: boolean;
}) {
  return (
    <button
      className={"session-card " + (compact ? "compact" : "")}
      onClick={onOpen}
    >
      <SessionArt session={session} />
      <div className="session-card-body">
        <div className="session-card-category">
          <span>{session.category}</span>
          <span>{session.steps.length} pasos</span>
        </div>
        <h3>{session.title}</h3>
        {!compact && <p>{session.description}</p>}
        <div className="session-card-author">
          <Avatar initials={session.initials} color={session.color} />
          <span>
            <strong>{session.senior}</strong>
            <small>
              {new Date(session.date).toLocaleDateString("es-MX", {
                day: "numeric",
                month: "short",
                year: "numeric",
              })}
            </small>
          </span>
          <ArrowUpRight size={18} />
        </div>
      </div>
    </button>
  );
}
export function EmptyState({
  title,
  description,
  action,
  onAction,
  error = false,
}: {
  title: string;
  description: string;
  action?: string;
  onAction?: () => void;
  error?: boolean;
}) {
  return (
    <div className={"empty-state " + (error ? "error-state" : "")}>
      <BookOpen size={32} />
      <h2>{title}</h2>
      <p>{description}</p>
      {action && (
        <button className="button secondary" onClick={onAction}>
          {action}
          <ArrowRight size={16} />
        </button>
      )}
    </div>
  );
}
export function DemoNote({ children }: { children?: ReactNode }) {
  return (
    <div className="demo-note">
      <ShieldCheck size={15} />
      <span>
        {children ||
          "Todo lo que ves es una demostración. No hay llamadas, grabaciones ni análisis reales."}
      </span>
    </div>
  );
}
export function Modal({
  title,
  children,
  onClose,
  className = "",
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
  className?: string;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const id = useId();
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const previous = document.activeElement as HTMLElement | null;
    element.showModal();
    return () => {
      element.close();
      previous?.focus();
    };
  }, []);
  return (
    <dialog
      ref={ref}
      className={"modal " + className}
      aria-labelledby={id}
      onCancel={(event) => {
        event.preventDefault();
        closeRef.current();
      }}
      onClick={(event) => {
        if (event.target === ref.current) onClose();
      }}
    >
      <div className="modal-heading">
        <h2 id={id}>{title}</h2>
        <button
          className="icon-button"
          onClick={onClose}
          aria-label="Cerrar ventana"
        >
          <X size={20} />
        </button>
      </div>
      {children}
    </dialog>
  );
}
export function SessionMetadata({ session }: { session: KnowledgeSession }) {
  return (
    <div className="session-metadata">
      <span>
        <Clock3 size={15} />
        {timeLabel(session.duration)}
      </span>
      <span>
        <Layers size={15} />
        {session.steps.length} pasos
      </span>
      <span>
        <GitBranch size={15} />
        {session.steps.filter((s) => s.kind === "decision").length} decisión
      </span>
    </div>
  );
}
