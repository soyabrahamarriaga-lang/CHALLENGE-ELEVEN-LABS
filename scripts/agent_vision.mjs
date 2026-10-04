// Protocol for showing the expert's screen to the ElevenLabs agent (ADR-0012).
// The agent LLM must accept images; each frame is a user turn, so frames are sent only at pauses.

export const MAX_FRAMES = 10; // agent file_input.max_files_per_conversation

export function clock(seconds) {
  const total = Math.max(0, Math.floor(Number(seconds) || 0));
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

// The agent prompt reacts to "[PANTALLA mm:ss]": one short question about a decision; silence for mere navigation.
export function screenMessage(fileId, seconds) {
  if (typeof fileId !== "string" || !fileId) throw new Error("file_id requerido");
  const file = { type: "file_input", file_id: fileId };
  return {
    type: "multimodal_message",
    text: { type: "user_message", text: `[PANTALLA ${clock(seconds)}]` },
    file,
    files: [file],
  };
}
