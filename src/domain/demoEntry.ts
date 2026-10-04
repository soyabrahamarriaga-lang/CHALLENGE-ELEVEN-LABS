import type { Role } from "./types";

// A UI preference, never an authentication credential or API authorization.
export type DemoEntry = { name: string; role: Role };
export const demoEntryKey = "userhelper.demo.entry.v1";

export function parseDemoEntry(raw: string | null): DemoEntry | null {
  try {
    const value: unknown = JSON.parse(raw || "null");
    if (!value || typeof value !== "object" || !("name" in value) || !("role" in value)) return null;
    if (typeof value.name !== "string" || !value.name.trim() || value.name.trim().length > 60) return null;
    if (value.role !== "senior" && value.role !== "intern") return null;
    return { name: value.name.trim(), role: value.role };
  } catch { return null; }
}

export function entryDestination(hash: string, role: Role): string {
  // Retain a same-profile deep link; never redirect outside the application.
  const path = hash.replace(/^#\/?/, "");
  return path.startsWith(`${role}/`) ? `#${path}` : `#${role}/home`;
}
