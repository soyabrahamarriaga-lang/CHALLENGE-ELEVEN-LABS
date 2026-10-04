import { useSyncExternalStore } from 'react';
import { BrowserVault, type VaultDirectory } from './browserVault';

type PickerWindow = Window & { showDirectoryPicker?: (options: { mode: 'readwrite'; id: string }) => Promise<VaultDirectory> };
let current: BrowserVault | null = null;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach(listener => listener());
export const supportsBrowserVault = () => typeof window !== 'undefined' && !!(window as PickerWindow).showDirectoryPicker && window.isSecureContext;
export const browserVault = () => current;
export function requireBrowserVault() {
  if (!current) throw new Error('Conecta de nuevo tu bóveda y autoriza el acceso a la carpeta.');
  return current;
}
export async function connectBrowserVault() {
  if (!supportsBrowserVault()) throw new Error('Para conectar una carpeta local, abre este sitio en Chrome o Edge de escritorio.');
  // Called directly by a click: the browser owns folder selection and its permission prompt.
  const root = await (window as PickerWindow).showDirectoryPicker!({ mode: 'readwrite', id: 'userhelper-vault' });
  if (await root.queryPermission({ mode: 'readwrite' }) !== 'granted')
    throw new Error('Autoriza la lectura y escritura para conectar esta carpeta.');
  const next = new BrowserVault(root, () => current === next);
  current = next;
  emit();
}
export function disconnectBrowserVault() { current = null; emit(); }
const subscribe = (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; };
export function useBrowserVault() { return useSyncExternalStore(subscribe, browserVault, () => null); }
