import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createDemoSession, demoRepository } from "./sessionRepository";
import { exampleSessions } from "../data/sessions";
const values = new Map<string, string>();
beforeEach(() => {
  values.clear();
  vi.stubGlobal("localStorage", {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
  });
});
afterEach(() => vi.unstubAllGlobals());
describe("demo session persistence", () => {
  it("removes excluded fragments from the saved process, not just the visible UI", () => {
    const session = createDemoSession("Mi ejemplo", 90, [0, 2]);
    expect(session.steps).toHaveLength(3);
    expect(
      session.steps.some(
        (step) => step.id === "contexto" || step.id === "decidir",
      ),
    ).toBe(false);
    expect(exampleSessions[0].steps).toHaveLength(5);
    demoRepository.save(session);
    expect(demoRepository.list()[0].steps).toEqual(session.steps);
  });
  it("preserves the demo label and useful timestamps even for a very short call", () => {
    const session = createDemoSession("", 1, []);
    expect(session.demo).toBe(true);
    expect(session.title).toBe(exampleSessions[0].title);
    expect(session.description).toContain("00:01");
    expect(session.description).toContain("no contiene una grabación");
    expect(new Set(session.steps.map((step) => step.at)).size).toBe(
      session.steps.length,
    );
  });
  it("recovers from corrupt storage and rejects partial records", () => {
    values.set("userhelper.demo.sessions.v1", "{broken");
    expect(demoRepository.list()).toEqual(exampleSessions);
    values.set(
      "userhelper.demo.sessions.v1",
      JSON.stringify([{ id: "broken", demo: true, steps: [] }]),
    );
    expect(demoRepository.list()).toEqual(exampleSessions);
  });
  it("reports unavailable storage so the UI can disclose temporary-only saving", () => {
    vi.stubGlobal("localStorage", {
      getItem() {
        throw new Error("disabled");
      },
      setItem() {
        throw new Error("quota");
      },
    });
    expect(demoRepository.list()).toEqual(exampleSessions);
    expect(demoRepository.save(createDemoSession("Prueba", 30, []))).toBe(
      false,
    );
  });
  it("rejects malformed context and out-of-range or unordered playback timestamps", () => {
    const sample = createDemoSession("Invalid sample", 90, []);
    for (const steps of [
      [{ ...sample.steps[0], context: { invalid: true } }],
      [{ ...sample.steps[0], at: 91 }],
      [{ ...sample.steps[0], at: 20 }, { ...sample.steps[1], at: 10 }],
    ]) {
      values.set("userhelper.demo.sessions.v1", JSON.stringify([{ ...sample, steps }]));
      expect(demoRepository.list()).toEqual(exampleSessions);
    }
  });
});
