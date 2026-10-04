import { exampleSessions } from '../data/sessions';
import type { KnowledgeSession } from '../domain/types';
import { t } from './index';
const builtins = new Set(exampleSessions.map((session) => session.id));
// Only our bundled, explicitly fictional examples are translated. IDs, category
// filter values and all user-created sessions remain unchanged.
export function localizeExample(session: KnowledgeSession): KnowledgeSession {
  if (!builtins.has(session.id)) return session;
  return { ...session, title: t(session.title), description: t(session.description), role: t(session.role),
    steps: session.steps.map((step) => ({ ...step, title: t(step.title), action: t(step.action),
      purpose: t(step.purpose), quote: t(step.quote),
      ...(step.context ? { context: t(step.context) } : {}), ...(step.variant ? { variant: t(step.variant) } : {}),
    })),
  };
}
