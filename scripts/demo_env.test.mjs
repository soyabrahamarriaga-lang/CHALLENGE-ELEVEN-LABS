import { describe, expect, it } from "vitest";
import { demoDefaults, missing, nodeIsSupported, readEnv, setEnv } from "./demo_env.mjs";

const example = "# comentario\nELEVENLABS_API_KEY=\nELEVENLABS_AGENT_ID=agent_x\nAGENT_OPEN_ACCESS=false\n";

describe("demo .env helpers", () => {
  it("reads values and reports missing required keys", () => {
    const values = readEnv(example);
    expect(values.get("ELEVENLABS_AGENT_ID")).toBe("agent_x");
    expect(missing(values)).toEqual(["ELEVENLABS_API_KEY"]);
  });
  it("replaces existing lines in place and appends new ones, keeping comments", () => {
    let text = setEnv(example, "ELEVENLABS_API_KEY", "sk_test");
    text = setEnv(text, "VAULT_SYNC_MINUTES", "0");
    expect(text).toBe(
      "# comentario\nELEVENLABS_API_KEY=sk_test\nELEVENLABS_AGENT_ID=agent_x\nAGENT_OPEN_ACCESS=false\nVAULT_SYNC_MINUTES=0\n",
    );
    expect(setEnv("A=1", "B", "2")).toBe("A=1\nB=2\n");
  });
  it("turns on local demo defaults only where needed", () => {
    expect(demoDefaults(readEnv(example))).toEqual({
      AGENT_OPEN_ACCESS: "true",
      APP_ORIGIN: "http://127.0.0.1:5173",
      LIVEKIT_TOKEN_HOST: "127.0.0.1",
    });
    expect(demoDefaults(readEnv("AGENT_OPEN_ACCESS=true\nAPP_ORIGIN=http://x\nLIVEKIT_TOKEN_HOST=127.0.0.1"))).toEqual({});
  });
  it("checks the Node version required by Vite", () => {
    expect(nodeIsSupported("22.12.0")).toBe(true);
    expect(nodeIsSupported("26.6.0")).toBe(true);
    expect(nodeIsSupported("22.11.9")).toBe(false);
    expect(nodeIsSupported("20.19.0")).toBe(false);
  });
});
