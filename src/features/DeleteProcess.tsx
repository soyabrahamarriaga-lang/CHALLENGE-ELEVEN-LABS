import { useEffect, useRef, useState } from 'react';
import { Trash2 } from 'lucide-react';
import { deleteProcess, type ProcessDeletion } from '../services/processFlow';
import './DeleteProcess.css';

export type OnProcessDeleted = (id: string, result: ProcessDeletion) => void;
export default function DeleteProcess({ id, title, compact = false, onDeleted }: {
  id: string; title: string; compact?: boolean; onDeleted: OnProcessDeleted;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    if (open) dialog.current?.showModal();
    else dialog.current?.close();
  }, [open]);
  const confirm = async () => {
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      const result = await deleteProcess(id);
      setOpen(false);
      onDeleted(id, result);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No pudimos eliminar el proceso. Inténtalo de nuevo.');
    } finally { setBusy(false); }
  };
  return <>
    <button className={compact ? 'icon-button collection-delete' : 'text-button process-delete'}
      aria-label={'Eliminar proceso: ' + title} title="Eliminar proceso"
      onClick={() => { setError(''); setOpen(true); }}>
      <Trash2 size={17}/>{!compact && 'Eliminar proceso'}
    </button>
    <dialog ref={dialog} className="delete-process-dialog" aria-labelledby={'delete-title-' + id}
      aria-describedby={'delete-description-' + id} onCancel={(event) => { if (busy) event.preventDefault(); else setOpen(false); }}
      onClose={() => setOpen(false)}>
      <span className="delete-process-symbol"><Trash2 size={23}/></span>
      <h2 id={'delete-title-' + id}>¿Eliminar este proceso?</h2>
      <p className="delete-process-name">{title}</p>
      <div id={'delete-description-' + id}>
        <p>Se quitará de Biblioteca, Guardadas y Mapas para todos los perfiles de esta plataforma.</p>
        <p>Actualizaremos el material del tutor para nuevas conversaciones. Los archivos originales se conservan en la bóveda y en ElevenLabs.</p>
      </div>
      {error && <p className="delete-process-error" role="alert">{error}</p>}
      {busy && <p role="status">Eliminando y actualizando el tutor…</p>}
      <div className="delete-process-actions">
        <button autoFocus className="button secondary" disabled={busy} onClick={() => setOpen(false)}>Cancelar</button>
        <button className="button delete-confirm" disabled={busy} onClick={() => void confirm()}>{busy ? 'Eliminando…' : 'Eliminar proceso'}</button>
      </div>
    </dialog>
  </>;
}

export function DeletionNotice({ result, onUpdated, onClose }: {
  result: ProcessDeletion; onUpdated: OnProcessDeleted; onClose: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const pending = result.tutor === 'pending' || result.indexes === 'pending';
  const retry = async () => {
    setBusy(true); setError('');
    try { onUpdated(result.id, await deleteProcess(result.id)); }
    catch { setError('No pudimos completar la actualización. El proceso sigue eliminado de la plataforma.'); }
    finally { setBusy(false); }
  };
  return <div className="process-deletion-notice" role="status">
    <p><strong>Proceso eliminado de la plataforma.</strong> {result.tutor === 'updated' && 'El material del tutor está actualizado para nuevas conversaciones.'}
      {result.tutor === 'disabled' && 'El tutor no está configurado en este servidor; su material remoto no se ha actualizado.'}
      {result.tutor === 'pending' && 'El tutor aún no pudo actualizarse y puede conservar este material. Reintenta la actualización.'}
      {result.indexes === 'pending' && ' Los índices de la bóveda están pendientes de actualizar.'}</p>
    {error && <p role="alert">{error}</p>}
    {pending && <button className="text-button" disabled={busy} onClick={() => void retry()}>{busy ? 'Actualizando…' : 'Reintentar actualización'}</button>}
    <button className="text-button" disabled={busy} onClick={onClose}>Cerrar aviso</button>
  </div>;
}
