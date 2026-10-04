import { describe, expect, it } from "vitest";
import { entryDestination, parseDemoEntry } from "./demoEntry";

describe("demo entry (not authentication)", () => {
  it("restores a trimmed name and supported role", () => {
    expect(parseDemoEntry('{"name":" Ana Pérez ","role":"intern"}')).toEqual({ name: "Ana Pérez", role: "intern" });
  });
  it.each([null, "not-json", "[]", '"name"', '{"name":"","role":"senior"}', '{"name":"   ","role":"senior"}', '{"name":42,"role":"senior"}', '{"name":"Ana","role":"admin"}', JSON.stringify({name: "a".repeat(61),role:"senior"})])("rejects damaged or unsupported preferences: %s", raw => {
    expect(parseDemoEntry(raw)).toBeNull();
  });
  it("retains a same-profile deep link and its identifier", () => {
    expect(entryDestination("#/intern/library/process-123", "intern")).toBe("#intern/library/process-123");
  });
  it.each(["", "#login", "#entry-form", "#senior/library/123", "https://example.org", "#intern-other/home"])("starts at the chosen profile for %s", hash => {
    expect(entryDestination(hash, "intern")).toBe("#intern/home");
  });
});
