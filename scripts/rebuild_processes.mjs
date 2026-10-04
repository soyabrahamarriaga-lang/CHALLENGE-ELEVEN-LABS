// Explicit maintenance: rerun existing provider analysis and recover the original images.
import {
  createVault,
  readVaultConfig,
  fetchConversation,
} from "../server/vault.mjs";
const config = readVaultConfig();
if (!config.ready || !config.apiKey)
  throw new Error("Configure the vault and ElevenLabs credentials.");
const vault = createVault(config);
const sessions = await vault.listSessions();
let mapped = 0,
  failed = 0,
  images = 0;
for (const session of sessions) {
  const id = session.conversacion;
  if (!/^conv_[A-Za-z0-9_-]+$/.test(id || "")) continue;
  try {
    let conversation;
    if (process.argv.includes("--reanalyze")) {
      const response = await fetch(
        `${config.apiBase}/v1/convai/conversations/${encodeURIComponent(id)}/analysis/run`,
        {
          method: "POST",
          headers: { "xi-api-key": config.apiKey },
          redirect: "error",
          signal: AbortSignal.timeout(60000),
        },
      );
      if (!response.ok) throw new Error("analysis-" + response.status);
      conversation = await response.json();
    } else conversation = await fetchConversation(config, id);
    if (
      !conversation.analysis?.data_collection_results?.userhelper_process_v2
    ) {
      // Analysis can finish asynchronously. Poll only this finite maintenance run.
      for (let attempt = 0; attempt < 6; attempt++) {
        await new Promise((r) => setTimeout(r, 3000));
        conversation = await fetchConversation(config, id);
        if (
          conversation.analysis?.data_collection_results?.userhelper_process_v2
        )
          break;
      }
    }
    const saved = await vault.saveConversation(conversation, {
      recoverImages: true,
    });
    images += saved.imageRecovery?.recovered || 0;
    if (saved.flowStatus === "ready") mapped++;
    else failed++;
    console.log(
      JSON.stringify({ processed: mapped + failed, mapped, failed, images }),
    );
  } catch (error) {
    failed++;
    console.error(
      "One process could not be rebuilt: " +
        error.message.replace(/conv_[A-Za-z0-9_-]+/g, "[private]"),
    );
  }
}
const summary = await vault.ensureProcessMaps();
console.log(
  JSON.stringify({
    mapped,
    failed,
    recoveredImages: images,
    processes: summary.processes.length,
    flowFailures: summary.failures.length,
  }),
);
