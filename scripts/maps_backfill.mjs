import { createVault, readVaultConfig } from '../server/vault.mjs';
const config = readVaultConfig();
if (!config.ready) { console.error('Configura VAULT_PATH con la ruta absoluta de la bóveda privada.'); process.exitCode = 1; }
else {
  const result = await createVault(config).ensureProcessMaps();
  console.log(JSON.stringify({ processes: result.processes.length, failures: result.failures.length, preservedCanvases: result.processes.filter(p => p.canvasEdited).length }));
  if (result.failures.length) process.exitCode = 1;
}
