import type { FlowResponse, ProcessSummary } from '../domain/processFlow';
export async function readProcessData<T>(path: string, signal?: AbortSignal): Promise<T> {
  const response = await fetch('/api/vault/' + path, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}', cache: 'no-store', signal,
  });
  if (!response.ok) throw new Error(response.status === 503
    ? 'La bóveda no está configurada en esta computadora. Configúrala para ver tus procesos.'
    : response.status === 404 ? 'Este proceso aún no tiene una transcripción disponible.'
    : response.status === 403 ? 'Abre UserHelper desde la dirección autorizada del equipo.'
    : 'No pudimos leer los mapas. Comprueba que el servicio de la bóveda esté activo y vuelve a intentarlo.');
  return response.json();
}
export const listProcesses = (signal?: AbortSignal) => readProcessData<{ processes: ProcessSummary[]; failures: {id: string; error: string}[] }>('processes', signal);
export const getProcessFlow = (id: string, signal?: AbortSignal) => readProcessData<FlowResponse>('sessions/' + encodeURIComponent(id) + '/flow', signal);
