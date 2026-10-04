import { lazy, Suspense, useState } from "react";
import { AudioLines } from "lucide-react";
import { AgentStatus } from "../components/AgentStatus";
import { useAgentAvailability } from "../services/useAgentAvailability";
import { canStartAgent } from "../services/agentAvailability";
import type { AgentPhase } from "../services/agentProtocol";
import "./Senior.css";

const AgentConversation = lazy(() => import("./AgentConversation"));

export function Senior() {
  const [conversationOpen, setConversationOpen] = useState(false);
  const [phase, setPhase] = useState<AgentPhase>("idle");
  const health = useAgentAvailability(!["authorizing", "connecting", "connected"].includes(phase));
  const available = health.online &&
    (canStartAgent(health.status, "voice") || canStartAgent(health.status, "text"));

  if (conversationOpen) {
    return (
      <Suspense fallback={<p role="status">Preparando conversación…</p>}>
        <AgentConversation health={health} onPhaseChange={setPhase} />
      </Suspense>
    );
  }

  return (
    <section className="personal-space" aria-label="Mi espacio">
      <h1 className="sr-only">Mi espacio</h1>
      <div className="personal-space-entry">
      <AgentStatus health={health} />
      <button
        className="button primary personal-space-start"
        disabled={!available}
        onClick={() => setConversationOpen(true)}
      >
        <AudioLines size={22} aria-hidden="true" />
        Iniciar conversación con el agente
      </button>
      </div>
    </section>
  );
}
