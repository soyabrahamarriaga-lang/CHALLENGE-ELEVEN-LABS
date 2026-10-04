import { describe, expect, it } from "vitest";
import { MAX_FRAMES, clock, screenMessage } from "./agent_vision.mjs";

describe("agent vision protocol", () => {
  it("builds the multimodal message the agent prompt expects", () => {
    expect(screenMessage("file_abc", 45)).toEqual({
      type: "multimodal_message",
      text: { type: "user_message", text: "[PANTALLA 00:45]" },
      file: { type: "file_input", file_id: "file_abc" },
      files: [{ type: "file_input", file_id: "file_abc" }],
    });
    expect(clock(3725)).toBe("62:05");
    expect(MAX_FRAMES).toBe(10);
  });
  it("refuses a message without an uploaded file", () => {
    expect(() => screenMessage("", 1)).toThrow("file_id requerido");
  });
});
