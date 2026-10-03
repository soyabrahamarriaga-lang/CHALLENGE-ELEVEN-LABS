import { timeLabel } from "../domain/callMachine";
import { exampleSessions } from "../data/sessions";
import type { KnowledgeSession } from "../domain/types";
const KEY = "userhelper.demo.sessions.v1";
// Integration seam: replace this adapter with API-backed storage later.
export interface SessionRepository {
  list(): KnowledgeSession[];
  save(session: KnowledgeSession): boolean;
}
function isSession(value: unknown): value is KnowledgeSession {
  if (!value || typeof value !== "object") return false;
  const s = value as KnowledgeSession;
  return (
    s.demo === true &&
    [
      "id",
      "title",
      "senior",
      "initials",
      "role",
      "date",
      "description",
      "category",
    ].every(
      (key) =>
        typeof (s as unknown as Record<string, unknown>)[key] === "string",
    ) &&
    Number.isFinite(new Date(s.date).getTime()) &&
    typeof s.duration === "number" &&
    Number.isFinite(s.duration) &&
    s.duration > 0 &&
    ["sage", "blue", "sand"].includes(s.color) &&
    Array.isArray(s.steps) &&
    s.steps.every(
      (step, index) =>
        step &&
        ["id", "title", "quote", "action", "purpose"].every(
          (key) =>
            typeof (step as unknown as Record<string, unknown>)[key] ===
            "string",
        ) &&
        typeof step.at === "number" &&
        Number.isFinite(step.at) &&
        step.at >= 0 &&
        step.at < s.duration &&
        (index === 0 || step.at >= s.steps[index - 1].at) &&
        (step.context === undefined || typeof step.context === "string") &&
        (step.variant === undefined || typeof step.variant === "string") &&
        ["step", "decision", "variant"].includes(step.kind),
    )
  );
}
export const demoRepository: SessionRepository = {
  list() {
    try {
      const raw: unknown = JSON.parse(localStorage.getItem(KEY) || "[]");
      const saved = Array.isArray(raw) ? raw.filter(isSession) : [];
      return [...saved, ...exampleSessions];
    } catch {
      return [...exampleSessions];
    }
  },
  save(session) {
    try {
      const current = this.list().filter(
        (item) => !exampleSessions.some((example) => example.id === item.id),
      );
      localStorage.setItem(
        KEY,
        JSON.stringify([session, ...current].slice(0, 30)),
      );
      return true;
    } catch {
      return false;
    }
  },
};
export function createDemoSession(
  title: string,
  elapsed: number,
  excluded: number[],
): KnowledgeSession {
  const source = exampleSessions[0];
  const steps = source.steps.filter(
    (_step, index) => !excluded.includes(index),
  );
  const duration = Math.max(elapsed, steps.length * 15, 1);
  return {
    ...source,
    id: "demo-" + crypto.randomUUID(),
    title: title.trim() || source.title,
    date: new Date().toISOString(),
    duration,
    description:
      "Ejemplo guardado tras una llamada simulada de " +
      timeLabel(elapsed) +
      ". El recorrido visual utiliza una muestra; no contiene una grabación ni un análisis real.",
    steps: steps.map((step, index) => ({
      ...step,
      at: Math.floor((index * duration) / Math.max(steps.length, 1)),
    })),
  };
}
