import { describe, it, expect, afterEach } from "vitest";
import {
  mkdtemp,
  mkdir,
  readFile,
  writeFile,
  rm,
  symlink,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  buildProcessFlow,
  ensureProcessFlow,
  flowToCanvas,
  flowMarkdown,
  parseFlowEvidence,
} from "./processFlow.mjs";
import { createVault, readVaultConfig } from "./vault.mjs";

const transcript = `---
conversacion: "conv_synthetic"
inicio: "2026-10-04T02:30:00Z"
---
# Prueba sintética

## Resumen

Revisar una solicitud de compra de ejemplo.

## Conversación

**[00:02] Persona:** Primero abro la solicitud y reviso la fecha.

**[00:05] Agente:** ¿Qué haces si excede el plazo?

**[00:08] Persona:** Si supera 30 días, rechazo la solicitud; si no, continúo la revisión.

**[00:12] Persona:** No se puede guardar sin el motivo porque necesitamos dejar evidencia.

## Enlaces

- [[eventos]]
`;
const events =
  "- `00:07` **screen** — Estado: borrador; antigüedad: 42 días ^event-demo\n";
const input = {
  id: "conv_synthetic",
  folder: "2026-10-04-conv_synthetic",
  transcript,
  events,
};
const cleanup = [];
afterEach(async () => {
  for (const root of cleanup.splice(0))
    await rm(root, { recursive: true, force: true });
});
async function setup() {
  const root = await mkdtemp(join(tmpdir(), "flow-test-"));
  cleanup.push(root);
  const folder = input.folder;
  const dir = join(root, "Sesiones", folder);
  await mkdir(dir, { recursive: true });
  await writeFile(join(dir, "transcripcion.md"), transcript);
  await writeFile(join(dir, "eventos.md"), events);
  return { root, dir, folder };
}
describe("evidence-based process diagrams", () => {
  it("groups the procedure into actions and attaches a later explanation instead of agent turns", () => {
    const extraction = {
      version: 2,
      name: "Revisar solicitud de compra",
      department: "Compras", // A model-inferred role does not override the confirmed department.
      taskType: "Compras y órdenes de compra",
      steps: [
        {
          action: "Revisar la solicitud",
          instructions: ["Abrir la solicitud y revisar su fecha."],
          quote: "Primero abro la solicitud y reviso la fecha.",
          at: 2,
        },
        {
          action: "Resolver y documentar la solicitud",
          activityCode: "2.8",
          instructions: [
            "Comparar la antigüedad con 30 días.",
            "Documentar el motivo.",
          ],
          decision: "Rechazar si supera 30 días.",
          quote:
            "Si supera 30 días, rechazo la solicitud; si no, continúo la revisión.",
          at: 8,
          rationale: "Dejar evidencia del motivo.",
          rationaleQuote:
            "No se puede guardar sin el motivo porque necesitamos dejar evidencia.",
          alternatives: [
            { condition: "Supera 30 días", action: "Rechazar" },
            { condition: "Si no", action: "Continuar" },
          ],
        },
        {
          action: "Comprar sin autorización",
          quote: "Texto inventado sin evidencia",
          at: 9,
        },
        {
          action: "Preguntar por el criterio",
          quote: "¿Qué haces si excede el plazo?",
          at: 5,
        },
      ],
    };
    const flow = buildProcessFlow({ ...input, extraction });
    expect(flow.version).toBe(2);
    expect(flow.department).toBe("Contabilidad");
    expect(flow.status).toBe("draft");
    expect(flow.nodes.map((n) => n.kind)).toEqual([
      "start",
      "step",
      "decision",
      "end",
    ]);
    expect(flow.nodes[2]).toMatchObject({
      reason: "Dejar evidencia del motivo.",
      activityCode: "2.8",
    });
    expect(flow.nodes[2].evidenceIds).toHaveLength(2);
    expect(flow.nodes[2].alternatives).toHaveLength(2);
    expect(flowMarkdown(flow)).toContain("Supera 30 días: Rechazar");
    expect(
      flowToCanvas(flow).nodes.find((n) => n.id === "why-" + flow.nodes[2].id)
        .text,
    ).toContain("Si no: Continuar");
    expect(flow.nodes[1].reason).toBe("");
    expect(flow.warnings.join(" ")).toContain(
      "2 pasos del análisis se omitieron",
    );
    expect(flow.evidence).toHaveLength(5);
    const incomplete = buildProcessFlow({
      ...input,
      extraction: {
        ...extraction,
        steps: [
          {
            ...extraction.steps[0],
            rationale: "Porque lo dice el agente",
            rationaleQuote: "¿Qué haces si excede el plazo?",
            alternatives: extraction.steps[1].alternatives,
            activityCode: "inventado",
          },
        ],
      },
    });
    expect(incomplete.nodes[1].reason).toBe("");
    expect(incomplete.nodes[1].alternatives).toEqual([]);
    expect(incomplete.nodes[1].activityCode).toBe("");
  });
  it("pairs only nearby original captures and exports image/action/reason beside one another", () => {
    const image = { id: "frame-7000-a", at: 7, file: "capturas/example.jpg" };
    const flow = buildProcessFlow({
      ...input,
      captures: [image, { id: "far", at: 900, file: "capturas/far.jpg" }],
    });
    expect(flow.nodes[1].images).toEqual([{ ...image, association: "nearby" }]);
    const canvas = flowToCanvas(flow);
    const card = canvas.nodes.find((n) => n.id === flow.nodes[1].id);
    const screen = canvas.nodes.find((n) => n.type === "file");
    const why = canvas.nodes.find((n) => n.id === "why-" + card.id);
    expect(screen.file).toBe(
      "Sesiones/" + input.folder + "/capturas/example.jpg",
    );
    expect(screen.y).toBe(card.y);
    expect(why.y).toBe(card.y);
    expect(why.x).toBeGreaterThan(screen.x);
    expect(flowMarkdown(flow)).toContain(
      "![[Sesiones/" + input.folder + "/capturas/example.jpg]]",
    );
    expect(
      buildProcessFlow({ ...input, captures: [{ id: "far", at: 900 }] })
        .nodes[1].images,
    ).toEqual([]);
  });
  it("does not fabricate a process from agent-only or empty transcripts and keeps wall clocks unaligned", () => {
    const flow = buildProcessFlow({
      ...input,
      transcript: "## Conversación\n\n**[00:01] Agente:** Mm-hm.\n",
      events: "- `18:03:20` **screen** — Reloj sin alineación\n",
    });
    expect(flow.nodes.map((n) => n.kind)).toEqual(["start"]);
    expect(flow.warnings.join(" ")).toContain(
      "No hay una tarea operativa identificada",
    );
    expect(flow.evidence.find((e) => e.source === "events").at).toBeNull();
  });
  it("keeps stable evidence anchors after an unrelated earlier turn is inserted", () => {
    const before = parseFlowEvidence(transcript, events);
    const after = parseFlowEvidence(
      transcript.replace(
        "## Conversación",
        "## Conversación\n\n**[00:00] Persona:** Texto previo.",
      ),
      events,
    );
    for (const e of before)
      expect(after.find((a) => a.text === e.text).id).toBe(e.id);
  });
  it("exports JSON Canvas with valid endpoints and links scoped to the correct session", () => {
    const flow = buildProcessFlow(input);
    const canvas = flowToCanvas(flow);
    const ids = new Set(canvas.nodes.map((n) => n.id));
    for (const edge of canvas.edges) {
      expect(ids.has(edge.fromNode)).toBe(true);
      expect(ids.has(edge.toNode)).toBe(true);
      expect(edge.toEnd).toBe("arrow");
    }
    expect(
      canvas.nodes.find((n) => n.text?.includes("Ver fuente")).text,
    ).toContain("[[Sesiones/2026-10-04-conv_synthetic/evidencia-flujo#^");
    expect(
      canvas.nodes.every(
        (n) => Number.isInteger(n.x) && n.width > 0 && n.height > 0,
      ),
    ).toBe(true);
  });
  it("escapes Markdown from source text in exported notes and nodes", () => {
    const flow = buildProcessFlow({
      ...input,
      transcript:
        "## Conversación\n\n**[00:01] Persona:** Abro [haz clic](https://example.com) <img src=x>\n",
      events: "",
    });
    expect(flowToCanvas(flow).nodes[1].text).toContain("\\[haz clic\\]");
    expect(flow.nodes[1].title).toContain("<img src=x>"); // Rendered as text by React, never injected as HTML.
  });
});
describe("private derived files", () => {
  it("backfills existing sessions, is idempotent and leaves original notes untouched", async () => {
    const { root, dir, folder } = await setup();
    await writeFile(join(dir, "work-map.md"), "# Notas manuales");
    const first = await ensureProcessFlow(root, folder, input.id);
    const again = await ensureProcessFlow(root, folder, input.id);
    expect(again.generatedAt).toBe(first.generatedAt);
    await rm(join(dir, "evidencia-flujo.md"));
    await rm(join(dir, "mapa-generado.md"));
    await ensureProcessFlow(root, folder, input.id);
    expect(await readFile(join(dir, "evidencia-flujo.md"), "utf8")).toContain(
      "Evidencia de",
    );
    expect(await readFile(join(dir, "mapa-generado.md"), "utf8")).toContain(
      "Abrir diagrama",
    );
    expect(await readFile(join(dir, "transcripcion.md"), "utf8")).toBe(
      transcript,
    );
    expect(await readFile(join(dir, "work-map.md"), "utf8")).toBe(
      "# Notas manuales",
    );
    expect(
      JSON.parse(await readFile(join(dir, "flujo.canvas"), "utf8")).nodes
        .length,
    ).toBeGreaterThan(first.nodes.length);
    const vault = createVault(readVaultConfig({ VAULT_PATH: root }));
    const collection = await vault.ensureProcessMaps();
    expect(collection.processes).toHaveLength(1);
    expect(collection.graph.memberships.every((m) => collection.processes.some((p) => p.id === m.processId))).toBe(true);
    const networkPath = join(root, "Procesos", "Mapa-de-conocimiento-generado.canvas");
    expect(JSON.parse(await readFile(networkPath, "utf8")).nodes.filter((n) => n.type === "file").map((n) => n.id)).toEqual(collection.processes.map((p) => p.id));
    await writeFile(networkPath, "MANUAL GRAPH");
    await vault.saveProcessMetadata(input.id, {name: "Revisar solicitud renombrada", department: "Contabilidad", taskType: "Compras"});
    const renamed = await vault.ensureProcessMaps();
    expect(renamed.processes[0].title).toBe("Revisar solicitud renombrada");
    expect(await readFile(networkPath, "utf8")).toBe("MANUAL GRAPH");
    expect(JSON.parse(await readFile(join(root, "Procesos", "Mapa-de-conocimiento-actualizado.canvas"), "utf8")).nodes.find((n) => n.id === input.id).file).toContain("revisar-solicitud-renombrada");
    await expect(vault.getProcessFlow("missing")).resolves.toBeNull();
  });
  it("regenerates from new evidence while preserving an edited Obsidian canvas", async () => {
    const { root, dir, folder } = await setup();
    const before = await ensureProcessFlow(root, folder, input.id);
    await writeFile(join(dir, "flujo.canvas"), "CUSTOM CANVAS");
    await writeFile(
      join(dir, "eventos.md"),
      events + "- `00:30` **decision** — Enviar a revisión\n",
    );
    const after = await ensureProcessFlow(root, folder, input.id);
    expect(after.sourceDigest).not.toBe(before.sourceDigest);
    expect(after.canvasEdited).toBe(true);
    expect(await readFile(join(dir, "flujo.canvas"), "utf8")).toBe(
      "CUSTOM CANVAS",
    );
    expect(after.evidence.some((e) => e.text === "Enviar a revisión")).toBe(
      true,
    );
  });
  it("serializes concurrent regeneration and refuses traversal and symbolic source files", async () => {
    const { root, dir, folder } = await setup();
    const results = await Promise.all([
      ensureProcessFlow(root, folder, input.id),
      ensureProcessFlow(root, folder, input.id),
    ]);
    expect(results[0].sourceDigest).toBe(results[1].sourceDigest);
    await expect(
      ensureProcessFlow(root, "../elsewhere", input.id),
    ).rejects.toThrow("invalid-flow-id");
    await rm(join(dir, "eventos.md"));
    await symlink(join(dir, "transcripcion.md"), join(dir, "eventos.md"));
    await expect(ensureProcessFlow(root, folder, input.id)).rejects.toThrow(
      "invalid-flow-source",
    );
  });
  it("names and classifies notes, moves generated notes on edits and preserves manual work", async () => {
    const { root, dir, folder } = await setup();
    const vault = createVault(readVaultConfig({ VAULT_PATH: root }));
    const original = await ensureProcessFlow(root, folder, input.id);
    expect(original.catalogPath).toMatch(/^Procesos\/contabilidad\//);
    const updated = await vault.saveProcessMetadata(input.id, {
      name: "Resolver orden de compra",
      department: "Contabilidad",
      taskType: "Compras y órdenes de compra",
    });
    expect(updated.catalogPath).toContain(
      "/resolver-orden-de-compra--conv_synthetic.md",
    );
    await expect(
      readFile(join(root, original.catalogPath), "utf8"),
    ).rejects.toMatchObject({ code: "ENOENT" });
    const note = await readFile(join(root, updated.catalogPath), "utf8");
    expect(note).toContain('nombre: "Resolver orden de compra"');
    expect(note).toContain('departamento: "Contabilidad"');
    await writeFile(
      join(root, updated.catalogPath),
      note + "\nMi anotación manual",
    );
    await writeFile(
      join(dir, "eventos.md"),
      events + "- `00:35` **note** — Nuevo dato\n",
    );
    const again = await vault.getProcessFlow(input.id);
    expect(again.catalogEdited).toBe(true);
    expect(await readFile(join(root, updated.catalogPath), "utf8")).toContain(
      "Mi anotación manual",
    );
    await expect(
      vault.saveProcessMetadata(input.id, {
        name: "",
        department: "Contabilidad",
        taskType: "Compras",
      }),
    ).rejects.toThrow("invalid-metadata");
  });
  it("upgrades a generated v1 canvas while retaining source notes", async () => {
    const { root, dir, folder } = await setup();
    const { createHash } = await import("node:crypto");
    const old = '{"nodes":[],"edges":[]}';
    await writeFile(join(dir, "flujo.canvas"), old);
    await writeFile(
      join(dir, "process-flow.json"),
      JSON.stringify({
        version: 1,
        canvasDigest: createHash("sha256").update(old).digest("hex"),
      }),
    );
    expect((await ensureProcessFlow(root, folder, input.id)).version).toBe(2);
    expect(await readFile(join(dir, "flujo.canvas"), "utf8")).toContain(
      "Por qué se hace así",
    );
    expect(await readFile(join(dir, "transcripcion.md"), "utf8")).toBe(
      transcript,
    );
  });
  it("creates the diagram automatically on conversation import", async () => {
    const { root } = await setup();
    const vault = createVault(readVaultConfig({ VAULT_PATH: root }));
    const result = await vault.saveConversation({
      conversation_id: "conv_new",
      status: "done",
      metadata: { start_time_unix_secs: 1801535400 },
      transcript: [
        {
          role: "user",
          message: "Reviso la fecha antes de aprobar.",
          time_in_call_secs: 1,
        },
      ],
    });
    expect(result.flowStatus).toBe("ready");
    expect(
      (await vault.getProcessFlow("conv_new")).nodes.some((n) =>
        n.title.includes("Revisar la fecha"),
      ),
    ).toBe(true);
  });
});
