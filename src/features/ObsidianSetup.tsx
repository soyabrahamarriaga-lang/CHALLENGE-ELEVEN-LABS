import { ArrowRight, Download, FolderOpen } from 'lucide-react';
import { t, useTranslation } from '../i18n';
import { useState } from 'react';
import { connectBrowserVault, disconnectBrowserVault, supportsBrowserVault, useBrowserVault } from '../services/browserVaultConnection';
import './ObsidianSetup.css';

// Official universal installers linked by https://obsidian.md/download (2026-10-04).
const release = 'https://github.com/obsidianmd/obsidian-releases/releases/download/v1.13.7';

export function LocalVaultControl() {
  const vault = useBrowserVault();
  const [busy, setBusy] = useState(false), [error, setError] = useState('');
  useTranslation();
  const connect = async () => {
    setBusy(true); setError('');
    try { await connectBrowserVault(); }
    catch (e) { if (!(e instanceof DOMException && e.name === 'AbortError')) setError(e instanceof Error ? e.message : 'No pudimos conectar la carpeta. Inténtalo otra vez.'); }
    finally { setBusy(false); }
  };
  return <section className="vault-connection" aria-label={t('Bóveda de esta computadora')}>
    <div>
      <strong>{vault ? t('Bóveda conectada: {{name}}', { name: vault.root.name }) : t('Conecta tu bóveda local')}</strong>
      <p>{vault ? t('Los archivos se leen y guardan en esta carpeta, solo en esta pestaña. No se suben a Vercel ni actualizan el conocimiento del tutor.') : t('Elige una carpeta para ver tus procesos y guardar las nuevas conversaciones de Senior en esta computadora. Puedes seguir conversando sin conectarla.')}</p>
      <p>{t('Al recargar o cerrar la pestaña tendrás que seleccionar la carpeta otra vez.')}</p>
      {!supportsBrowserVault() && <p>{t('Para conectar una carpeta local, abre este sitio en Chrome o Edge de escritorio.')}</p>}
      {error && <p role="alert">{t(error)}</p>}
    </div>
    <div className="vault-connection-actions">
      <button className="button primary" disabled={busy || !supportsBrowserVault()} onClick={() => void connect()}>{busy ? t('Seleccionando carpeta…') : vault ? t('Cambiar carpeta') : t('Conectar carpeta')}</button>
      {vault && <button className="button secondary" onClick={disconnectBrowserVault}>{t('Desconectar carpeta')}</button>}
    </div>
  </section>;
}

export function ObsidianSetup({ onExamples }: { onExamples: () => void }) {
  useTranslation();
  return (
    <section className="obsidian-setup" aria-labelledby="obsidian-title">
      <FolderOpen size={28} aria-hidden="true" />
      <h1 id="obsidian-title">{t('Instala Obsidian en tu computadora')}</h1>
      <p>{t('Descarga el instalador oficial para abrir y organizar tu bóveda local.')}</p>
      <div className="obsidian-installers">
        <article>
          <h2>{t('Mac')}</h2>
          <p>{t('Abre el archivo .dmg, arrastra Obsidian a Aplicaciones y ábrelo desde ahí.')}</p>
          <a className="button primary" href={`${release}/Obsidian-1.13.7.dmg`}>
            <Download size={17} aria-hidden="true" />{t('Descargar para Mac')}
          </a>
        </article>
        <article>
          <h2>{t('Windows')}</h2>
          <p>{t('Abre el archivo .exe y sigue los pasos del instalador. Después, abre Obsidian.')}</p>
          <a className="button primary" href={`${release}/Obsidian-1.13.7.exe`}>
            <Download size={17} aria-hidden="true" />{t('Descargar para Windows')}
          </a>
        </article>
      </div>
      <div className="obsidian-links">
        <a className="button secondary" href="obsidian://open">{t('Ya lo instalé: abrir Obsidian')}</a>
        <a href="https://obsidian.md/download" target="_blank" rel="noopener noreferrer">{t('Otros sistemas y versiones')}</a>
      </div>
      <p className="obsidian-scope">{t('Después de instalar Obsidian, usa Conectar carpeta para elegir la misma bóveda en esta web. Solo se leen procesos con el formato de UserHelper; tus otras notas se conservan.')}</p>
      <button className="button secondary" onClick={onExamples}>{t('Explorar ejemplos')}<ArrowRight size={16} aria-hidden="true" /></button>
    </section>
  );
}
