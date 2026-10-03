import { createServer } from "node:http";
import { createHandler, readConfig } from "./livekit.mjs";
import { createVaultHandler, readVaultConfig, vaultProblems } from "./vault.mjs";

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
  if (!readConfig().ready) console.warn("[livekit] configuración incompleta: revisa LIVEKIT_* en .env");
  const server = createServer(createAppHandler());
  server.requestTimeout = 20000;
  server.headersTimeout = 10000;
  server.listen(port, host, () => {
    console.log(`UserHelper backend listening on ${host}:${port}`);
    if (vaultConfig.ready) console.log(`[vault] escribiendo en ${vaultConfig.path}`);
  });
}
