import type { FlowResponse, ProcessCollection } from "../domain/processFlow";
import { cloudDemo } from './deployment';
import { requireBrowserVault } from './browserVaultConnection';
export async function readProcessData<T>(
  path: string,
  signal?: AbortSignal,
): Promise<T> {
  const response = await fetch("/api/vault/" + path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: "{}",
    cache: "no-store",
    signal,
  });
  if (!response.ok)
    throw new Error(
      response.status === 503
        ? "La bóveda no está configurada en esta computadora. Configúrala para ver tus procesos."
        : response.status === 404 || response.status === 410
          ? "Este proceso ya no está disponible o aún no tiene una transcripción."
          : response.status === 403
            ? "Abre UserHelper desde la dirección autorizada del equipo."
            : "No pudimos leer los procesos. Comprueba que el servicio de la bóveda esté activo y vuelve a intentarlo.",
    );
  return response.json();
}
export async function listProcesses(signal?: AbortSignal): Promise<ProcessCollection> {
  if (cloudDemo) return requireBrowserVault().list();
  const data = await readProcessData<ProcessCollection>("processes", signal);
  if (!Array.isArray(data.processes) || !Array.isArray(data.graph?.facets) || !Array.isArray(data.graph?.memberships))
    throw new Error("El servicio de la bóveda necesita actualizarse. Reinicia el backend y vuelve a intentar.");
  return data;
}
export const getProcessFlow = (id: string, signal?: AbortSignal) =>
  cloudDemo ? requireBrowserVault().flow(id) : readProcessData<FlowResponse>(
    "sessions/" + encodeURIComponent(id) + "/flow",
    signal,
  );
export async function saveProcessMetadata(
  id: string,
  metadata: import("../domain/processFlow").ProcessMetadata,
): Promise<FlowResponse> {
  if (cloudDemo) return requireBrowserVault().metadata(id, metadata);
  const response = await fetch(
    `/api/vault/sessions/${encodeURIComponent(id)}/metadata`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(metadata),
      cache: "no-store",
      signal: AbortSignal.timeout(15000),
    },
  );
  if (!response.ok)
    throw new Error(
      "No pudimos guardar el nombre y la clasificación. Revisa los campos e inténtalo otra vez.",
    );
  return response.json();
}
export async function getProcessImage(
  id: string,
  imageId: string,
  signal: AbortSignal,
): Promise<Blob> {
  if (cloudDemo) return requireBrowserVault().image(id, imageId);
  const response = await fetch(
    `/api/vault/sessions/${encodeURIComponent(id)}/captures/${encodeURIComponent(imageId)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{}",
      cache: "no-store",
      signal,
    },
  );
  if (!response.ok) throw new Error("Imagen no disponible");
  return response.blob();
}

export interface ProcessDeletion {
  id: string;
  deleted: true;
  tutor: 'updated' | 'pending' | 'disabled';
  indexes: 'updated' | 'pending';
  local?: boolean;
}
export async function deleteProcess(id: string): Promise<ProcessDeletion> {
  if (cloudDemo) return requireBrowserVault().remove(id);
  const response = await fetch(`/api/vault/processes/${encodeURIComponent(id)}/delete`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ confirm: true }), cache: 'no-store', signal: AbortSignal.timeout(150000),
  });
  if (!response.ok) throw new Error(response.status === 403
    ? 'Abre UserHelper desde la dirección autorizada del equipo.'
    : 'No pudimos confirmar la eliminación. Puedes reintentar sin afectar otros procesos.');
  return response.json();
}
