import type { Role } from "../domain/types";

export const agentProfiles = {
  senior: {
    apiBase: "/api/elevenlabs",
    title: "Conversación con el agente",
    description: "Una conversación individual con tu agente de ElevenLabs.",
    startLabel: "Iniciar conversación con el agente",
    displayName: "Experto",
    persistEvidence: true,
  },
  intern: {
    apiBase: "/api/elevenlabs/tutor",
    title: "Tutor de procesos",
    description: "Pregunta sobre un proceso y practica paso a paso con tu tutor.",
    startLabel: "Iniciar conversación con el tutor",
    displayName: "Aprendiz",
    persistEvidence: false,
  },
} satisfies Record<Role, {
  apiBase: string;
  title: string;
  description: string;
  startLabel: string;
  displayName: string;
  persistEvidence: boolean;
}>;
