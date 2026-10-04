#!/usr/bin/env node
// Un solo comando para correr UserHelper en esta computadora:
//   npm run demo
// Instala dependencias si faltan, prepara .env, pide las claves de ElevenLabs la primera vez
// (no se suben a GitHub), levanta backend + app y abre el agente en el navegador. Ctrl+C detiene todo.
import { spawn, spawnSync } from "node:child_process";
import { copyFileSync, existsSync, readFileSync, writeFileSync } from "node:fs";
import { createInterface } from "node:readline";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { demoDefaults, missing, nodeIsSupported, readEnv, setEnv } from "./demo_env.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const envPath = join(root, ".env");
const windows = process.platform === "win32";
const say = (text) => console.log(`\x1b[32m▸\x1b[0m ${text}`);
const fail = (text) => {
  console.error(`\x1b[31m✖\x1b[0m ${text}`);
  process.exit(1);
};

if (!nodeIsSupported()) fail(`Necesitas Node 22.12 o más nuevo (tienes ${process.versions.node}). Instálalo: brew install node`);

if (!existsSync(join(root, "node_modules"))) {
  say("Instalando dependencias (solo la primera vez)…");
  const install = spawnSync("npm", ["install", "--no-audit", "--no-fund"], { cwd: root, stdio: "inherit", shell: windows });
  if (install.status !== 0) fail("npm install falló.");
}

if (!existsSync(envPath)) {
  copyFileSync(join(root, ".env.example"), envPath);
  say("Creé .env a partir de .env.example (no se sube a GitHub).");
}
let text = readFileSync(envPath, "utf8");
for (const [key, value] of Object.entries(demoDefaults(readEnv(text)))) {
  text = setEnv(text, key, value);
  say(`.env: ${key}=${value}`);
}

async function ask(question, hidden) {
  const rl = createInterface({ input: process.stdin, output: process.stdout, terminal: true });
  if (hidden) rl._writeToOutput = (chunk) => rl.output.write(chunk.includes(question) ? chunk : "");
  const answer = await new Promise((resolve) => rl.question(question, resolve));
  rl.close();
  if (hidden) process.stdout.write("\n");
  return answer.trim();
}

const absent = missing(readEnv(text));
if (absent.length) {
  if (!process.stdin.isTTY)
    fail(`Faltan ${absent.join(" y ")} en .env. Pídelas al equipo por privado y agrégalas a ${envPath}`);
  say("Faltan las claves de ElevenLabs. Pídelas al equipo por privado; se guardan solo en tu .env.");
  for (const key of absent) {
    const value = await ask(`${key}: `, key.endsWith("KEY"));
    if (!value || /\s/.test(value)) fail(`${key} vacío o con espacios.`);
    text = setEnv(text, key, value);
  }
}
writeFileSync(envPath, text);

const children = [];
const run = (label, args) => {
  const child = spawn("npm", ["run", ...args], { cwd: root, stdio: "inherit", shell: windows });
  child.on("exit", (code) => {
    if (!stopping) {
      console.error(`\n${label} se detuvo (código ${code}). Revisa el mensaje de arriba.`);
      stop();
    }
  });
  children.push(child);
};
let stopping = false;
function stop() {
  if (stopping) return;
  stopping = true;
  for (const child of children) child.kill("SIGINT");
  setTimeout(() => process.exit(0), 500);
}
process.on("SIGINT", stop);
process.on("SIGTERM", stop);

say("Levantando backend (puerto 3001) y app (puerto 5173)…");
run("El backend", ["dev:token"]);
run("La app", ["dev"]);

const url = "http://127.0.0.1:5173/#senior/agent";
for (let i = 0; i < 60 && !stopping; i++) {
  await new Promise((r) => setTimeout(r, 1000));
  const ok = await fetch("http://127.0.0.1:5173/").then((r) => r.ok, () => false);
  const api = await fetch("http://127.0.0.1:3001/api/elevenlabs/status").then((r) => r.json(), () => null);
  if (ok && api) {
    say(api.configured ? "Agente configurado." : "El backend no ve las claves del agente: revisa .env.");
    say(`Abriendo ${url}  (Ctrl+C para detener)`);
    const opener = windows ? ["cmd", ["/c", "start", "", url]] : [process.platform === "darwin" ? "open" : "xdg-open", [url]];
    spawn(opener[0], opener[1], { stdio: "ignore", detached: true }).unref();
    break;
  }
}
