import i18next from 'i18next';
import { initReactI18next } from 'react-i18next';
import es from './es.json';
import en from './en.json';
export type Language = 'es' | 'en';
export const LANGUAGE_KEY = 'userhelper.language.v1';
export const isLanguage = (value: unknown): value is Language => value === 'es' || value === 'en';
export function storedLanguage(): Language {
  try { const value = localStorage.getItem(LANGUAGE_KEY); return isLanguage(value) ? value : 'es'; }
  catch { return 'es'; }
}
export const i18n = i18next.createInstance();
void i18n.use(initReactI18next).init({
  resources: { es: { translation: es }, en: { translation: en } },
  lng: storedLanguage(), fallbackLng: 'es', supportedLngs: ['es', 'en'],
  initAsync: false, keySeparator: false, nsSeparator: false,
  interpolation: { escapeValue: false }, react: { useSuspense: false },
});
export const language = (): Language => i18n.resolvedLanguage === 'en' ? 'en' : 'es';
export const dateLocale = () => language() === 'en' ? 'en-US' : 'es-MX';
// Spanish source messages are stable catalog keys. Whitespace belongs to the
// surrounding layout, not the key; unknown user-authored content is unchanged.
export function t(message: string, values?: Record<string, unknown>): string {
  const key = message.replace(/\s+/g, ' ').trim();
  if (!i18n.exists(key, values)) return message;
  return (message.match(/^\s+/)?.[0] || '') + i18n.t(key, values) + (message.match(/\s+$/)?.[0] || '');
}
function updateDocument() {
  if (typeof document === 'undefined') return;
  document.documentElement.lang = language();
  document.title = t('UserHelper — La experiencia se comparte');
}
i18n.on('languageChanged', updateDocument);
updateDocument();
export async function changeLanguage(next: Language) {
  if (!isLanguage(next)) return;
  try { localStorage.setItem(LANGUAGE_KEY, next); } catch { /* Still works for this visit. */ }
  await i18n.changeLanguage(next);
}
if (typeof window !== 'undefined') window.addEventListener('storage', (event) => {
  if (event.key === LANGUAGE_KEY && isLanguage(event.newValue)) void i18n.changeLanguage(event.newValue);
});
export { useTranslation } from 'react-i18next';

// Facet labels come from the fixed catalog; identifiers remain canonical.
export function catalogLabel(value: string): string {
  const activity = value.match(/^(\d+(?:\.\d+|[A-Z])?) · (.+)$/);
  return activity ? activity[1] + ' · ' + t(activity[2]) : t(value);
}
