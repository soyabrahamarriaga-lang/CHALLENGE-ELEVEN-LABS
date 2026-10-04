import { Globe2 } from 'lucide-react';
import { changeLanguage, language, t, useTranslation, type Language } from '../i18n';
export function LanguageSelect() {
  useTranslation();
  return <label className="language-select">
    <Globe2 size={16} aria-hidden="true"/>
    <span className="sr-only">{t('Idioma')}</span>
    <select aria-label={t('Idioma')} value={language()} onChange={(event) => void changeLanguage(event.target.value as Language)}>
      <option value="es" lang="es">Español</option><option value="en" lang="en">English</option>
    </select>
  </label>;
}
