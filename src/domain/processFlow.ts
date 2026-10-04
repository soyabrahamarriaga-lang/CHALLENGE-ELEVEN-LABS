export type FlowKind = "start" | "end" | "step" | "decision";
export interface FlowEvidence {
  id: string;
  source: "transcript" | "events";
  role: "expert" | "agent" | "observation";
  kind?: string;
  at: number | null;
  text: string;
  file: string;
}
export interface ProcessImage {
  id: string;
  at: number;
  file: string;
  mime: string;
  source: string;
  association?: "manual" | "nearby";
}
export interface ProcessNode {
  id: string;
  kind: FlowKind;
  title: string;
  at: number;
  evidenceIds: string[];
  reason: string;
  position: { x: number; y: number };
  instructions: string[];
  decision: string;
  guardrails: string[];
  alternatives?: { condition: string; action: string }[];
  activityCode?: string;
  images: ProcessImage[];
}
export interface ProcessCatalog {
  version: number;
  defaultDepartment: string;
  departments: string[];
  families: { id: string; name: string; activities: [string, string][] }[];
}
export interface ProcessFlow {
  version: 2;
  id: string;
  folder: string;
  title: string;
  name: string;
  department: string;
  taskType: string;
  objective: string;
  classificationStatus: "edited" | "proposed";
  source: string;
  status: "draft";
  sourceDigest: string;
  generatedAt: string;
  warnings: string[];
  canvasEdited: boolean;
  catalogPath: string;
  catalogEdited: boolean;
  catalog: ProcessCatalog;
  nodes: ProcessNode[];
  edges: {
    id: string;
    source: string;
    target: string;
    label: string;
    kind: "sequence" | "condition";
  }[];
  evidence: FlowEvidence[];
  captures: ProcessImage[];
}
export interface ProcessSummary {
  id: string;
  folder: string;
  title: string;
  department: string;
  taskType: string;
  catalogPath: string;
  source: string;
  imageCount: number;
  startedAt: string;
  duration: number;
  steps: number;
  decisions: number;
  status: "draft";
  canvasEdited: boolean;
  evidenceCount: number;
}
export interface FlowResponse {
  flow: ProcessFlow;
  canvas: object;
  obsidianUri: string;
}
export interface ProcessMetadata {
  name: string;
  department: string;
  taskType: string;
}
export const flowLabels: Record<FlowKind, string> = {
  start: "Inicio",
  end: "Fin",
  step: "Acción",
  decision: "Decisión",
};
export const flowClock = (at: number) =>
  `${String(Math.floor(at / 60)).padStart(2, "0")}:${String(Math.floor(at % 60)).padStart(2, "0")}`;

export interface KnowledgeFacet {
  id: string;
  label: string;
  kind: 'topic' | 'activity';
}
export interface KnowledgeMembership {
  id: string;
  processId: string;
  facetId: string;
  proofs: { stepId: string; stepTitle: string; field: string; excerpt: string; evidenceIds: string[] }[];
}
export interface KnowledgeGraph {
  version: 1;
  facets: KnowledgeFacet[];
  memberships: KnowledgeMembership[];
}
export interface ProcessCollection {
  processes: ProcessSummary[];
  failures: { id: string; error: string }[];
  catalog: ProcessCatalog;
  graph: KnowledgeGraph;
}
export interface ProcessFilters {
  query: string;
  department: string;
  taskType: string;
}
