import { lazy, Suspense, useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { AudioLines } from "lucide-react";
import type { Role } from "../domain/types";
import { AgentStatus } from "../components/AgentStatus";
import { useAgentAvailability } from "../services/useAgentAvailability";
import { canStartAgent } from "../services/agentAvailability";
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
    (canStartAgent(health.status, "voice") || canStartAgent(health.status, "text"));

  if (conversationOpen) {
    return (
      <Suspense fallback={<p role="status">Preparando conversación…</p>}>
        <AgentConversation role={role} health={health} onPhaseChange={setPhase} />
        {!active && role === "intern" && (
          <button className="text-button tutor-back" onClick={() => setConversationOpen(false)}>
            Volver a Mi aprendizaje
          </button>
        )}
      </Suspense>
    );
  }
  return (
    <>
      <section className={role === "intern" ? "tutor-entry" : "personal-space"}
        aria-label={role === "intern" ? "Tutor de procesos" : "Mi espacio"}>
        {role === "intern" ? (
          <div className="page-heading">
            <div><h1 tabIndex={-1} ref={heading}>Aprende con tu tutor.</h1><p>{profile.description}</p></div>
          </div>
        ) : <h1 className="sr-only">Mi espacio</h1>}
        <div className="personal-space-entry">
          <AgentStatus health={health} />
          <button className="button primary personal-space-start" disabled={!available}
            onClick={() => setConversationOpen(true)}>
            <AudioLines size={22} aria-hidden="true" />
            {profile.startLabel}
          </button>
        </div>
      </section>
      {children}
    </>
  );
}
