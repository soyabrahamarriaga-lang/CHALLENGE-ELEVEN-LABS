import { AgentLanguage } from "../components/AgentLanguage";
import { t, language } from "../i18n";
import { lazy, Suspense, useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { VoiceField } from "../components/VoiceField";
import { AudioLines } from "lucide-react";
import type { Role } from "../domain/types";
import { AgentStatus } from "../components/AgentStatus";
import { useAgentAvailability } from "../services/useAgentAvailability";
import { canStartAgentInLanguage } from "../services/agentAvailability";
import { agentProfiles } from "../services/agentProfiles";
import type { AgentPhase } from "../services/agentProtocol";
import "./Senior.css";

const AgentConversation = lazy(() => import("./AgentConversation"));

export function AgentSpace({ role, children }: { role: Role; children?: ReactNode }) {
  // Changing profile destroys the previous conversation and health state.
  return <ProfileSpace key={role} role={role}>{children}</ProfileSpace>;
}

function ProfileSpace({ role, children }: { role: Role; children?: ReactNode }) {
  const [conversationOpen, setConversationOpen] = useState(false);
  const [phase, setPhase] = useState<AgentPhase>("idle");
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    if (!conversationOpen && role === "intern") heading.current?.focus();
  }, [conversationOpen, role]);
  const active = ["authorizing", "connecting", "connected"].includes(phase);
  const health = useAgentAvailability(!active, role);
  const profile = agentProfiles[role];
  const available = health.online &&
    (canStartAgentInLanguage(health.status, "voice", language()) || canStartAgentInLanguage(health.status, "text", language()));

  if (conversationOpen) {
    return (
      <Suspense fallback={<p role="status">{t("Preparando conversación…")}</p>}>
        <AgentConversation role={role} health={health} onPhaseChange={setPhase} />
        {!active && role === "intern" && (
          <button className="text-button tutor-back" onClick={() => setConversationOpen(false)}>{t("Volver a Mi aprendizaje")}</button>
        )}
      </Suspense>
    );
  }
  return (
    <>
      <section className={role === "intern" ? "tutor-entry" : "personal-space"}
        aria-label={role === "intern" ? t("Tutor de procesos") : t("Mi espacio")}>
        {role === "intern" ? (
          <div className="page-heading">
            <div><h1 tabIndex={-1} ref={heading}>{t("Aprende con tu tutor.")}</h1><p>{t(profile.description)}</p></div>
          </div>
        ) : <><VoiceField compact /><h1 className="space-title">{t("Mi espacio")}<span>{t("de conocimiento.")}</span></h1></>}
        <div className="personal-space-entry">
          <AgentStatus health={health} />
          <AgentLanguage status={health.status} />
          <button className="button primary personal-space-start" disabled={!available}
            onClick={() => setConversationOpen(true)}>
            <AudioLines size={22} aria-hidden="true" />
            {t(profile.startLabel)}
          </button>
        </div>
      </section>
      {children}
    </>
  );
}
