import { language, t, type Language } from '../i18n';
import type { AgentAvailability } from '../services/agentAvailability';
export function AgentLanguage({ status, activeLanguage }: { status: AgentAvailability; activeLanguage?: Language }) {
  const selected = language();
  const name = (value: Language) => t(value === 'en' ? 'inglés' : 'español');
  if (activeLanguage) return <p className="agent-language" role="status">{activeLanguage === selected
    ? t('Idioma de la conversación: {{name}}', { name: name(activeLanguage) })
    : t('El nuevo idioma se usará en la próxima conversación. La actual continúa en {{name}}.', { name: name(activeLanguage) })}</p>;
  if (!['available', 'limited'].includes(status.availability)) return null;
  if (status.selectableLanguages.includes(selected)) return <p className="agent-language">{t('Idioma de la conversación: {{name}}', { name: name(selected) })}</p>;
  return <div className="agent-language agent-language-warning" role="status"><p>{status.defaultLanguage
    ? t('Este agente aún no tiene habilitado {{name}}. Configura el idioma en ElevenLabs o elige otro idioma.', { name: name(selected) })
    : t('No pudimos verificar los idiomas de este agente. Actualiza el servicio y vuelve a comprobar.')}</p>
    <a href="https://elevenlabs.io/docs/eleven-agents/customization/voice/customization/language" target="_blank" rel="noreferrer">{t('Ver instrucciones de idiomas')}</a>
  </div>;
}
