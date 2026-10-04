import { mkdir, readdir, rename, stat, writeFile } from "node:fs/promises";
import { resolve, sep } from "node:path";
import { sessionFolder, syncAgentConversations, transcriptToMarkdown } from "./vault.mjs";

// Tutor conversations go to Tutorias/, never to Sesiones/ (ADR-0017): everything in Sesiones/
// becomes a process note, and process notes feed the tutor's knowledge base (ADR-0016).
// Storing lessons there would make the tutor learn from its own answers.

export const TUTOR_DIR = "Tutorias";
const ID = /^[A-Za-z0-9_-]{1,80}$/;

export function tutorTranscriptToMarkdown(conversation) {
  return transcriptToMarkdown(conversation)
    .replace('tipo: "transcripcion"', 'tipo: "tutoria"')
    .replace('tags: ["userhelper", "transcripcion"]', 'tags: ["userhelper", "tutoria"]')
    .replace(`# Transcripción ${conversation.conversation_id}`, `# Tutoría ${conversation.conversation_id}`)
    .replace(/^(\*\*\[\d{2,}:\d{2}\]) Persona:\*\*/gm, "$1 Aprendiz:**")
    .replace(/^(\*\*\[\d{2,}:\d{2}\]) Agente:\*\*/gm, "$1 Tutor:**")
    .replace("## Enlaces\n\n- [[eventos]] · [[work-map]]\n", "## Enlaces\n\n- Conocimiento usado por el tutor: [[Procesos/Indice-generado]]\n");
}

// Minimal store with the two methods syncAgentConversations needs, rooted at Tutorias/.
export function createTutorStore(vaultPath) {
  const root = resolve(vaultPath, TUTOR_DIR);
  const inside = (...parts) => {
    const target = resolve(root, ...parts);
    if (target !== root && !target.startsWith(root + sep)) throw new Error("path-outside-vault");
    return target;
  };
  async function findFolder(conversationId) {
    await mkdir(root, { recursive: true });
    return (await readdir(root)).find((name) => name.endsWith(`-${conversationId}`)) || null;
  }
  return {
    async hasTranscript(conversationId) {
      if (!ID.test(conversationId)) return false;
      const folder = await findFolder(conversationId);
      return Boolean(folder) && stat(inside(folder, "transcripcion.md")).then(() => true, () => false);
    },
    async saveConversation(conversation) {
      if (!conversation || !ID.test(conversation.conversation_id || "")) throw new Error("invalid-id");
      const folder = (await findFolder(conversation.conversation_id)) || sessionFolder(conversation);
      const file = inside(folder, "transcripcion.md");
      await mkdir(inside(folder), { recursive: true });
      const tmp = `${file}.${process.pid}.${Date.now()}.tmp`;
      await writeFile(tmp, tutorTranscriptToMarkdown(conversation), "utf8");
      await rename(tmp, file);
      return { folder, file: `${TUTOR_DIR}/${folder}/transcripcion.md` };
    },
  };
}

export function syncTutorConversations(config, tutorAgentId, options) {
  return syncAgentConversations({ ...config, agentId: tutorAgentId }, createTutorStore(config.path), options);
}
