#!/usr/bin/env node
// Prueba real: abre una conversación de TEXTO con el agente configurado, le muestra capturas
// como [PANTALLA mm:ss] y escribe lo que responde. Consume créditos de ElevenLabs.
// Uso: npm run check:vision -- captura1.png captura2.png [...]
// Sin argumentos genera dos capturas ficticias con scripts/make_demo_screens.py (requiere Pillow).
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, join } from "node:path";
import { MAX_FRAMES, screenMessage } from "./agent_vision.mjs";

const API = "https://api.elevenlabs.io";
const key = (process.env.ELEVENLABS_API_KEY || "").trim();
const agent = (process.env.ELEVENLABS_AGENT_ID || "").trim();
if (!key || !agent) {
  console.error("Faltan ELEVENLABS_API_KEY o ELEVENLABS_AGENT_ID en .env");
  process.exit(2);
}
let frames = process.argv.slice(2);
if (!frames.length) {
  const dir = mkdtempSync(join(tmpdir(), "vision-check-"));
  execFileSync("python3", [new URL("./make_demo_screens.py", import.meta.url).pathname, dir], { stdio: "inherit" });
  frames = [join(dir, "pantalla_1.png"), join(dir, "pantalla_2.png")];
}
frames = frames.slice(0, MAX_FRAMES);

const headers = { "xi-api-key": key };
const llm = (await (await fetch(`${API}/v1/convai/agents/${agent}`, { headers })).json())?.conversation_config?.agent?.prompt?.llm;
console.log(`Agente con LLM: ${llm}`);
const signed = await (await fetch(`${API}/v1/convai/conversation/get-signed-url?agent_id=${agent}`, { headers })).json();
if (!signed.signed_url) {
  console.error("No se obtuvo URL firmada; revisa la clave y el agente.");
  process.exit(1);
}

const ws = new WebSocket(signed.signed_url);
let conversationId = "";
let waiting = null;
const reply = (ms) =>
  new Promise((resolve) => {
    waiting = resolve;
    setTimeout(() => resolve("(sin respuesta)"), ms);
  });
ws.onmessage = (event) => {
  const m = JSON.parse(event.data);
  if (m.type === "ping") ws.send(JSON.stringify({ type: "pong", event_id: m.ping_event.event_id }));
  if (m.type === "conversation_initiation_metadata")
    conversationId = m.conversation_initiation_metadata_event.conversation_id;
  if (m.type === "agent_response") {
    const text = m.agent_response_event.agent_response;
    if (waiting) waiting(text), (waiting = null);
  }
};
await new Promise((resolve, reject) => ((ws.onopen = resolve), (ws.onerror = reject)));
ws.send(JSON.stringify({ type: "conversation_initiation_client_data", conversation_config_override: { conversation: { text_only: true } } }));
await new Promise((r) => setTimeout(r, 3000));
console.log(`Conversación: ${conversationId}`);

const say = async (text) => {
  console.log(`\nYO: ${text}`);
  ws.send(JSON.stringify({ type: "user_message", text }));
  console.log(`AGENTE: ${await reply(30000)}`);
};
await say("Hola, soy la experta. Voy a trabajar compartiendo pantalla. Es una prueba con datos ficticios.");

let failures = 0;
for (const [index, path] of frames.entries()) {
  const body = new FormData();
  body.append("file", new Blob([readFileSync(path)], { type: "image/png" }), basename(path));
  const upload = await fetch(`${API}/v1/convai/conversations/${conversationId}/files`, { method: "POST", body });
  const { file_id } = await upload.json().catch(() => ({}));
  if (!upload.ok || !file_id) {
    console.log(`\nSubida de ${basename(path)} falló (${upload.status})`);
    failures++;
    continue;
  }
  const message = screenMessage(file_id, 20 + index * 25);
  console.log(`\nYO: ${message.text.text}  ← ${basename(path)}`);
  ws.send(JSON.stringify(message));
  const answer = await reply(30000);
  if (answer === "(sin respuesta)") failures++;
  console.log(`AGENTE: ${answer}`);
}
ws.close();
console.log(`\n${failures ? "Con fallos" : "OK"}: ${frames.length} capturas, conversación ${conversationId}`);
setTimeout(() => process.exit(failures ? 1 : 0), 500);
