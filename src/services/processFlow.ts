import type { FlowResponse, ProcessSummary } from "../domain/processFlow";
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
        : response.status === 404
          ? "Este proceso aún no tiene una transcripción disponible."
          : response.status === 403
            ? "Abre UserHelper desde la dirección autorizada del equipo."
            : "No pudimos leer los mapas. Comprueba que el servicio de la bóveda esté activo y vuelve a intentarlo.",
    );
  return response.json();
}
export const listProcesses = (signal?: AbortSignal) =>
  readProcessData<{
    processes: ProcessSummary[];
    failures: { id: string; error: string }[];
  }>("processes", signal);
export const getProcessFlow = (id: string, signal?: AbortSignal) =>
  readProcessData<FlowResponse>(
    "sessions/" + encodeURIComponent(id) + "/flow",
    signal,
  );
export async function saveProcessMetadata(
  id: string,
  metadata: import("../domain/processFlow").ProcessMetadata,
): Promise<FlowResponse> {
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
