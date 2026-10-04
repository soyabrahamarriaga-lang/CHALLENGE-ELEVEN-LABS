import { afterEach, describe, expect, it, vi } from 'vitest';
import { browserVault, connectBrowserVault, disconnectBrowserVault, supportsBrowserVault } from './browserVaultConnection';

afterEach(() => { disconnectBrowserVault(); vi.unstubAllGlobals(); });
const root = (name: string, permission = 'granted') => ({ name, queryPermission: vi.fn(async () => permission) });
function picker(...values: unknown[]) {
  const choose = vi.fn(); for (const value of values) choose.mockResolvedValueOnce(value);
  vi.stubGlobal('window', { isSecureContext: true, showDirectoryPicker: choose });
  return choose;
}
describe('folder authorization stays in this tab', () => {
  it('selects on explicit invocation and invalidates the old target when changing folders', async () => {
    const first = root('First'), second = root('Second'), choose = picker(first, second);
    expect(browserVault()).toBeNull(); expect(choose).not.toHaveBeenCalled();
    await connectBrowserVault(); const previous = browserVault()!;
    expect(previous.root.name).toBe('First'); await previous.check();
    await connectBrowserVault(); expect(browserVault()!.root.name).toBe('Second');
    await expect(previous.check()).rejects.toThrow('Conecta');
    disconnectBrowserVault(); expect(browserVault()).toBeNull();
  });
  it('keeps the existing connection on cancellation or a rejected grant', async () => {
    const choose = picker(root('Original'), root('Denied', 'denied'));
    await connectBrowserVault(); const previous = browserVault();
    await expect(connectBrowserVault()).rejects.toThrow('Autoriza');
    expect(browserVault()).toBe(previous);
    choose.mockRejectedValueOnce(new DOMException('cancelled', 'AbortError'));
    await expect(connectBrowserVault()).rejects.toThrow('cancelled');
    expect(browserVault()).toBe(previous);
  });
  it('rejects insecure or unsupported browsers without requesting access', async () => {
    const choose = picker(root('Unused'));
    vi.stubGlobal('window', { isSecureContext: false, showDirectoryPicker: choose });
    expect(supportsBrowserVault()).toBe(false);
    await expect(connectBrowserVault()).rejects.toThrow('Chrome o Edge');
    expect(choose).not.toHaveBeenCalled();
    vi.stubGlobal('window', { isSecureContext: true });
    expect(supportsBrowserVault()).toBe(false);
  });
  it('rechecks the connection after an asynchronous permission lookup', async () => {
    const selected = root('Temporary'); picker(selected); await connectBrowserVault();
    const previous = browserVault()!;
    selected.queryPermission.mockImplementationOnce(async () => { disconnectBrowserVault(); return 'granted'; });
    await expect(previous.check()).rejects.toThrow('Conecta');
  });
});
