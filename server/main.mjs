import { createServer } from "node:http";
import { createHandler, readConfig } from "./livekit.mjs";
import {
  createVault,
  createVaultHandler,
  readVaultConfig,
  syncAgentConversations,
  vaultProblems,
} from "./vault.mjs";

// One local backend: LiveKit tokens plus the private Obsidian vault.
export function createAppHandler(handlers = {}) {
  const livekit = handlers.livekit || createHandler(readConfig());
  const vault = handlers.vault || createVaultHandler(readVaultConfig());
  return (req, res) => {
    const path = (req.url || "").split("?")[0];
    // /api/elevenlabs/status and /session belong to the agent access in livekit.mjs.
    if (path.startsWith("/api/vault/") || path === "/api/elevenlabs/webhook") return vault(req, res);
    return livekit(req, res);
  };
}

const port = Number(process.env.LIVEKIT_TOKEN_PORT || 3001);
const host = process.env.LIVEKIT_TOKEN_HOST || "127.0.0.1";
if (process.argv[1]?.endsWith("main.mjs")) {
  const vaultConfig = readVaultConfig();
  for (const problem of vaultProblems(vaultConfig)) console.warn(`[vault] ${problem}`);
  const livekitConfig = readConfig();
  if (!livekitConfig.ready) console.warn("[livekit] configuración incompleta: revisa LIVEKIT_* en .env");
  if (livekitConfig.openAgent) {
    console.warn("[agente] AGENT_OPEN_ACCESS=true: el agente se inicia sin código de equipo.");
    if (!["127.0.0.1", "localhost", "::1"].includes(host))
      console.warn(`[agente] ¡Cuidado! El backend escucha en ${host}: cualquiera en esa red podría gastar créditos de ElevenLabs.`);
  }
  const server = createServer(createAppHandler());
  server.requestTimeout = 20000;
  server.headersTimeout = 10000;
  server.listen(port, host, () => {
    console.log(`UserHelper backend listening on ${host}:${port}`);
    if (vaultConfig.ready) console.log(`[vault] escribiendo en ${vaultConfig.path}`);
  });
  startAgentSync(vaultConfig);
}

// Polls ElevenLabs so every finished conversation of the agent lands in the vault,
// including ones started outside this app. No public URL needed (unlike the webhook).
export function startAgentSync(config, { log = console, sync = syncAgentConversations } = {}) {
  if (!config.ready || !config.apiKey || !config.agentId || !(config.syncMinutes > 0)) return null;
  const vault = createVault(config);
  let running = false;
  const run = async () => {
    if (running) return;
    running = true;
    try {
      const result = await sync(config, vault);
      for (const file of result.imported) log.info(`[vault] transcripción guardada: ${file}`);
    } catch (error) {
      log.error("[vault] sincronización con ElevenLabs falló:", error?.message || error);
    } finally {
      running = false;
    }
  };
  const first = run();
  const timer = setInterval(run, config.syncMinutes * 60_000);
  timer.unref?.();
  log.info(`[vault] sincronizando conversaciones del agente cada ${config.syncMinutes} min`);
  return { run, first, stop: () => clearInterval(timer) };
}
