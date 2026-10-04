import { useEffect, useState } from 'react';
import type { ProcessCollection } from '../domain/processFlow';
import { listProcesses } from './processFlow';

// One owner in App. Changing view never creates a second source or cache.
export function useProcessCollection(enabled: boolean) {
  const [data, setData] = useState<ProcessCollection | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    if (!enabled) return;
    const abort = new AbortController();
    const timeout = setTimeout(() => abort.abort(), 20000);
    let live = true;
    setLoading(true);
    setError('');
    void listProcesses(abort.signal).then((next) => {
      if (live) setData(next);
    }).catch((e: unknown) => {
      if (live) setError(e instanceof Error && !['AbortError', 'TypeError'].includes(e.name)
        ? e.message : 'La bóveda no respondió. Comprueba que el servicio esté activo y vuelve a intentarlo.');
    }).finally(() => {
      clearTimeout(timeout);
      if (live) setLoading(false);
    });
    return () => { live = false; abort.abort(); clearTimeout(timeout); };
  }, [enabled, revision]);
  return { data, loading, error, refresh: () => setRevision((n) => n + 1) };
}
export type ProcessCollectionState = ReturnType<typeof useProcessCollection>;
