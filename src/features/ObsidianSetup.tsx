import { ArrowRight, Download, FolderOpen } from 'lucide-react';
import { t, useTranslation } from '../i18n';
import './ObsidianSetup.css';

// Official universal installers linked by https://obsidian.md/download (2026-10-04).
const release = 'https://github.com/obsidianmd/obsidian-releases/releases/download/v1.13.7';

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
      <p className="obsidian-scope">{t('La instalación se completa en tu computadora. No conecta automáticamente tu bóveda con esta web; el guardado de procesos aquí sigue desactivado.')}</p>
      <button className="button secondary" onClick={onExamples}>{t('Explorar ejemplos')}<ArrowRight size={16} aria-hidden="true" /></button>
    </section>
  );
}
