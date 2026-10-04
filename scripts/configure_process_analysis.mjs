import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import {
  getAgentConfiguration,
  readElevenLabsConfig,
} from "../server/elevenlabs.mjs";
import {
  PROCESS_FIELD,
  PROCESS_EXTRACTION_PROMPT,
} from "../server/processExtraction.mjs";
const config = readElevenLabsConfig();
const current = await getAgentConfiguration(config);
const fields = {
  ...current.platform_settings?.data_collection,
  [PROCESS_FIELD]: { type: "string", description: PROCESS_EXTRACTION_PROMPT },
};
if (!process.argv.includes("--apply")) {
  console.log(
    "Prepared structured action extraction. Run with --apply to configure the existing agent.",
  );
  process.exit(0);
}
if (!process.env.VAULT_PATH?.startsWith("/"))
  throw new Error("Configure an absolute VAULT_PATH for the private backup.");
const backup = resolve(process.env.VAULT_PATH, ".userhelper-backups");
await mkdir(backup, { recursive: true });
await writeFile(
  resolve(backup, `agent-analysis-${Date.now()}.json`),
  JSON.stringify(
    {
      data_collection: current.platform_settings?.data_collection || {},
      data_collection_scopes:
        current.platform_settings?.data_collection_scopes || {},
    },
    null,
    2,
  ),
  { mode: 0o600 },
);
const response = await fetch(
  "https://api.elevenlabs.io/v1/convai/agents/" +
    encodeURIComponent(config.agentId),
  {
    method: "PATCH",
    headers: {
      "xi-api-key": config.apiKey,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      platform_settings: {
        data_collection: fields,
        data_collection_scopes: {
          ...current.platform_settings?.data_collection_scopes,
          [PROCESS_FIELD]: "conversation",
        },
      },
      version_description:
        "UserHelper: extract actions, instructions, decisions and expert reasons",
    }),
    redirect: "error",
    signal: AbortSignal.timeout(20000),
  },
);
if (!response.ok) throw new Error("agent-configuration-" + response.status);
const after = await getAgentConfiguration(config);
if (
  after.platform_settings?.data_collection?.[PROCESS_FIELD]?.description !==
  PROCESS_EXTRACTION_PROMPT
)
  throw new Error("analysis-verification-failed");
if (
  JSON.stringify(after.conversation_config) !==
  JSON.stringify(current.conversation_config)
)
  throw new Error(
    "Unexpected concurrent change to conversation configuration; inspect privately.",
  );
console.log(
  "Structured process extraction configured. Conversation settings unchanged. Private backup saved.",
);
