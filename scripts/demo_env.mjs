// Small .env helpers for `npm run demo` (no dependencies; values never printed).

export function readEnv(text) {
  const values = new Map();
  for (const line of String(text).split(/\r?\n/)) {
    const match = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (match) values.set(match[1], match[2].trim());
  }
  return values;
}

// Replaces the first `KEY=` line or appends one; keeps comments and order.
export function setEnv(text, key, value) {
  const lines = String(text).split("\n");
  const index = lines.findIndex((line) => line.startsWith(`${key}=`));
  if (index >= 0) lines[index] = `${key}=${value}`;
  else {
    if (lines.length && lines[lines.length - 1] !== "") lines.push("");
    lines.splice(lines.length - 1, 0, `${key}=${value}`);
  }
  return lines.join("\n");
}

export const REQUIRED = ["ELEVENLABS_API_KEY", "ELEVENLABS_AGENT_ID"];

export function missing(values, keys = REQUIRED) {
  return keys.filter((key) => !values.get(key));
}

// Local demo defaults (ADR-0014): agent without team code; only fill what is unset.
export function demoDefaults(values) {
  const changes = {};
  if (values.get("AGENT_OPEN_ACCESS") !== "true") changes.AGENT_OPEN_ACCESS = "true";
  if (!values.get("APP_ORIGIN")) changes.APP_ORIGIN = "http://127.0.0.1:5173";
  if (!values.get("LIVEKIT_TOKEN_HOST")) changes.LIVEKIT_TOKEN_HOST = "127.0.0.1";
  return changes;
}

export function nodeIsSupported(version = process.versions.node) {
  const [major, minor] = version.split(".").map(Number);
  return major > 22 || (major === 22 && minor >= 12);
}
