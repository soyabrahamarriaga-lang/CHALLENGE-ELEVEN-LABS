#!/usr/bin/env node
// Sube ahora mismo el conocimiento de la bóveda (Procesos/) a la base de conocimiento del tutor.
// El backend lo hace solo cada VAULT_SYNC_MINUTES; esto sirve para forzarlo. Uso: npm run tutor:knowledge
import { syncTutorKnowledge } from "../server/tutorKnowledge.mjs";

const result = await syncTutorKnowledge({
  apiKey: (process.env.ELEVENLABS_API_KEY || "").trim(),
  tutorAgentId: (process.env.ELEVENLABS_TUTOR_AGENT_ID || "").trim(),
  vaultPath: process.env.VAULT_PATH || "",
}).catch((error) => ({ status: "error", error: error?.message || String(error) }));
const messages = {
  disabled: "Faltan ELEVENLABS_API_KEY, ELEVENLABS_TUTOR_AGENT_ID o VAULT_PATH en .env.",
  empty: "La bóveda no tiene procesos confirmados en Procesos/ todavía.",
  unchanged: "El tutor ya tiene la versión más reciente de la bóveda.",
  updated: "Conocimiento del tutor actualizado.",
};
console.log(messages[result.status] || `Error: ${result.error}`);
if (result.processes) console.log("Procesos:\n- " + result.processes.join("\n- "));
process.exit(result.status === "error" ? 1 : 0);
