import { describe, expect, it } from "vitest";
import { canStartAgent, canStartAgentInLanguage, describeAgentStatus, initialAvailability, parseAvailability } from "./agentAvailability";
import { isAgentEvent } from "./agentProtocol";
const now = 100000;
const response = {
  configured: true, requiresCode: false, availability: "available", reason: null,
  checkedAt: new Date(now).toISOString(), validForMs: 30000,
  modes: { voice: { available: true, reason: null }, text: { available: true, reason: null } },
};
describe("truthful availability in the UI", () => {
  it("never treats a configuration-only response as a successful verification", () => {
    expect(() => parseAvailability({ configured: true, requiresCode: false })).toThrow();
    expect(describeAgentStatus(initialAvailability).label).toBe("Comprobando disponibilidad…");
    expect(canStartAgent(initialAvailability, "voice")).toBe(false);
  });
  it("distinguishes available access from a confirmed SDK conversation", () => {
    const status = parseAvailability(response, now);
    expect(describeAgentStatus(status, "idle", true, now).label).toBe("Agente accesible");
    expect(describeAgentStatus(status, "idle", true, now).detail).toContain("la conexión se confirma al iniciar");
    expect(describeAgentStatus(status, "authorizing", true, now).label).toBe("Preparando conexión…");
    expect(describeAgentStatus(status, "connecting", true, now).label).toBe("Conectando con el agente…");
    expect(describeAgentStatus(status, "connected", true, now).label).toBe("Conectado con el agente");
    expect(describeAgentStatus(status, "ended", true, now).detail).toContain("Sin conversación activa");
    expect(describeAgentStatus(status, "error", true, now).label).toBe("Conversación desconectada");
    expect(isAgentEvent({ type: "connected", conversationId: "" })).toBe(false);
  });
  it("expires success and disables starting while verification is stale or the browser is offline", () => {
    const status = parseAvailability(response, now);
    expect(canStartAgent(status, "voice", now + 29999)).toBe(true);
    expect(canStartAgent(status, "voice", now + 30000)).toBe(false);
    expect(describeAgentStatus(status, "idle", true, now + 30000).label).toBe("Disponibilidad sin confirmar");
    expect(describeAgentStatus(status, "connected", false, now).label).toBe("Sin conexión a internet");
    expect(describeAgentStatus({ ...status, availability: "offline" }, "connected", true, now).tone).toBe("error");
  });
  it("enables the configured text mode for a text-only agent", () => {
    const status = parseAvailability({ ...response, availability: "limited",
      modes: { voice: { available: false, reason: "agent_text_only" }, text: response.modes.text } }, now);
    expect(canStartAgent(status, "voice", now)).toBe(false);
    expect(canStartAgent(status, "text", now)).toBe(true);
    expect(describeAgentStatus(status, "idle", true, now).label).toBe("Agente accesible por texto");
  });
  it("does not claim that ElevenLabs is down just because the local backend cannot be reached", () => {
    expect(describeAgentStatus({ ...initialAvailability, availability: "unavailable",
      reason: "backend_unreachable" }).label).toBe("Disponibilidad sin confirmar");
  });
  it("rejects malformed, contradictory and already expired success reports", () => {
    for (const invalid of [
      { ...response, checkedAt: null }, { ...response, checkedAt: "invalid" },
      { ...response, validForMs: 0 }, { ...response, validForMs: Number.NaN },
      { ...response, validForMs: 999999 }, { ...response, configured: false },
      { ...response, availability: "unavailable" },
      { ...response, modes: { voice: { available: false }, text: { available: true } } },
    ]) expect(() => parseAvailability(invalid, now)).toThrow();
  });
});

it('blocks unconfigured languages, accepts verified presets, and preserves expiry', () => {
  const status = parseAvailability({ ...response, defaultLanguage: 'es', selectableLanguages: ['es'] }, now);
  expect(canStartAgentInLanguage(status, 'voice', 'es', now)).toBe(true);
  expect(canStartAgentInLanguage(status, 'text', 'en', now)).toBe(false);
  const bilingual = parseAvailability({ ...response, defaultLanguage: 'es', selectableLanguages: ['es', 'en', 'fr', 3] }, now);
  expect(bilingual.selectableLanguages).toEqual(['es', 'en']);
  expect(canStartAgentInLanguage(bilingual, 'text', 'en', now)).toBe(true);
  expect(canStartAgentInLanguage(bilingual, 'voice', 'en', now + 30000)).toBe(false);
  expect(canStartAgentInLanguage(parseAvailability(response, now), 'voice', 'en', now)).toBe(false);
});
