import type { Language } from "../i18n";
import type { AgentMode, AgentPhase } from "./agentProtocol";

export type Availability = "checking" | "available" | "limited" | "unavailable" |
  "unconfigured" | "offline" | "stale";
export interface AgentAvailability {
  availability: Availability;
  reason: string | null;
  checkedAt: string | null;
  freshUntil: number;
  requiresCode: boolean;
  defaultLanguage: Language | null;
  selectableLanguages: Language[];
  modes: Record<AgentMode, { available: boolean; reason: string | null }>;
}
export const initialAvailability: AgentAvailability = {
  availability: "checking", reason: null, checkedAt: null, freshUntil: 0, requiresCode: true,
  defaultLanguage: null, selectableLanguages: [],
  modes: { voice: { available: false, reason: null }, text: { available: false, reason: null } },
};
export function parseAvailability(value: unknown, now = Date.now()): AgentAvailability {
  if (!value || typeof value !== "object") throw new Error("invalid_status");
  const data = value as Record<string, unknown>;
  if (typeof data.configured !== "boolean" || typeof data.requiresCode !== "boolean" ||
    !["available", "limited", "unavailable", "unconfigured"].includes(String(data.availability)) ||
    typeof data.validForMs !== "number" || !Number.isFinite(data.validForMs) ||
    data.validForMs < 0 || data.validForMs > 30000 ||
    !(data.reason === null || typeof data.reason === "string") ||
    !(data.checkedAt === null || (typeof data.checkedAt === "string" && Number.isFinite(Date.parse(data.checkedAt)))))
    throw new Error("invalid_status");
  const modes = data.modes as AgentAvailability["modes"] | undefined;
  for (const mode of ["voice", "text"] as const) {
    if (typeof modes?.[mode]?.available !== "boolean" ||
      !(modes[mode].reason === null || typeof modes[mode].reason === "string"))
      throw new Error("invalid_status");
  }
  if (!modes) throw new Error("invalid_status");
  const availableCount = Number(modes.voice.available) + Number(modes.text.available);
  if ((data.availability === "available" && availableCount !== 2) ||
    (data.availability === "limited" && availableCount !== 1) ||
    (["unavailable", "unconfigured"].includes(String(data.availability)) && availableCount !== 0) ||
    (!data.configured && data.availability !== "unconfigured") ||
    (availableCount > 0 && (!data.checkedAt || !data.validForMs)))
    throw new Error("invalid_status");
  const defaultLanguage = data.defaultLanguage === 'es' || data.defaultLanguage === 'en' ? data.defaultLanguage : null;
  const selectableLanguages: Language[] = Array.isArray(data.selectableLanguages)
    ? data.selectableLanguages.filter((item): item is Language => item === 'es' || item === 'en') : [];
  return {
    defaultLanguage, selectableLanguages,
    availability: data.availability as Availability, reason: data.reason as string | null,
    checkedAt: data.checkedAt as string | null, freshUntil: now + data.validForMs,
    requiresCode: data.requiresCode, modes,
  };
}
export function canStartAgent(status: AgentAvailability, mode: AgentMode, now = Date.now()) {
  return ["available", "limited"].includes(status.availability) &&
    status.freshUntil > now && status.modes[mode].available;
}
export function canStartAgentInLanguage(status: AgentAvailability, mode: AgentMode, selected: Language, now = Date.now()) {
  return canStartAgent(status, mode, now) && status.selectableLanguages.includes(selected);
}
const reasons: Record<string, string> = {
  agent_not_configured: "Falta completar la configuración del agente.",
  agent_access_denied: "ElevenLabs rechazó las credenciales o sus permisos.",
  agent_not_found: "ElevenLabs no encontró el agente configurado.",
  agent_archived: "El agente está archivado en ElevenLabs.",
  agent_text_only: "El agente está configurado para conversar solo por texto.",
  agent_busy: "ElevenLabs está limitando las solicitudes. Vuelve a comprobar.",
  agent_quota_exceeded: "ElevenLabs rechazó el acceso por un límite de uso.",
  agent_timeout: "ElevenLabs no respondió a tiempo.",
  agent_invalid_response: "La respuesta de ElevenLabs no permite verificar el acceso.",
  agent_unavailable: "No se pudo verificar el acceso a ElevenLabs.",
  backend_unreachable: "No se pudo contactar con el servicio de la aplicación.",
  invalid_status: "El servicio no devolvió una verificación válida.",
};
export function describeAgentStatus(status: AgentAvailability, phase: AgentPhase = "idle", online = true, now = Date.now()) {
  if (!online || status.availability === "offline")
    return { tone: "error", label: "Sin conexión a internet", detail: "La disponibilidad se comprobará al recuperar la conexión." };
  if (phase === "connected")
    return { tone: "success", label: "Conectado con el agente", detail: "Conversación activa, confirmada por ElevenLabs." };
  if (phase === "authorizing" || phase === "connecting")
    return { tone: "checking", label: phase === "authorizing" ? "Preparando conexión…" : "Conectando con el agente…",
      detail: "Esperando la confirmación de la conversación." };
  if (phase === "error")
    return { tone: "error", label: "Conversación desconectada", detail: "Revisa el mensaje de error antes de volver a iniciar." };
  if (status.availability === "checking")
    return { tone: "checking", label: "Comprobando disponibilidad…", detail: "Consultando el agente y el acceso a ElevenLabs." };
  if (status.availability === "stale" ||
    (["available", "limited"].includes(status.availability) && status.freshUntil <= now))
    return { tone: "neutral", label: "Disponibilidad sin confirmar", detail: "La última comprobación caducó. Vuelve a comprobar." };
  if (status.availability === "available")
    return { tone: "success", label: "Agente accesible", detail: "ElevenLabs responde. Sin conversación activa; la conexión se confirma al iniciar." };
  if (status.availability === "limited")
    return { tone: "warning", label: status.modes.voice.available ? "Agente accesible por voz" : "Agente accesible por texto",
      detail: reasons[(status.modes.voice.available ? status.modes.text.reason : status.modes.voice.reason) || "agent_unavailable"] || reasons.agent_unavailable };
  if (["backend_unreachable", "invalid_status", "agent_timeout", "agent_invalid_response", "agent_unavailable"].includes(status.reason || ""))
    return { tone: "error", label: "Disponibilidad sin confirmar",
      detail: reasons[status.reason!] };
  return { tone: "error", label: status.availability === "unconfigured" ? "Agente sin configurar" : "Agente no disponible",
    detail: reasons[status.reason || "agent_unavailable"] || reasons.agent_unavailable };
}
