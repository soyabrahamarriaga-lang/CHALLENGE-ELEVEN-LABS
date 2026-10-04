import { t, dateLocale } from "../i18n";
import { CircleCheck, CircleAlert, LoaderCircle, RefreshCw, WifiOff } from "lucide-react";
import type { AgentPhase } from "../services/agentProtocol";
import { describeAgentStatus } from "../services/agentAvailability";
import type { AgentAvailabilityControl } from "../services/useAgentAvailability";
import "./AgentStatus.css";

export function AgentStatus({ health, phase = "idle" }: {
  health: AgentAvailabilityControl;
  phase?: AgentPhase;
}) {
  const view = describeAgentStatus(health.status, phase, health.online);
  const active = ["authorizing", "connecting", "connected"].includes(phase);
  const Icon = view.tone === "checking" ? LoaderCircle
    : view.tone === "success" ? CircleCheck
      : !health.online ? WifiOff : CircleAlert;
  return (
    <div className="agent-health">
      <div className={"agent-health-label " + view.tone} role="status" aria-live="polite">
        <Icon size={18} className={view.tone === "checking" ? "spin" : ""} aria-hidden="true" />
        <strong>{t(view.label)}</strong>
      </div>
      <p>{t(view.detail)}</p>
      {!active && (
        <div className="agent-health-check">
          {health.status.checkedAt && <span>{t("Comprobado a las")}{" "}
            <time dateTime={health.status.checkedAt}>
              {new Date(health.status.checkedAt).toLocaleTimeString(dateLocale(), {
                hour: "2-digit", minute: "2-digit", second: "2-digit",
              })}
            </time>
          </span>}
          <button className="text-button" disabled={health.refreshing || !health.online}
            onClick={() => void health.refresh()}>
            <RefreshCw size={14} className={health.refreshing ? "spin" : ""} aria-hidden="true" />
            {health.refreshing ? t("Comprobando…") : t("Volver a comprobar")}
          </button>
        </div>
      )}
    </div>
  );
}
