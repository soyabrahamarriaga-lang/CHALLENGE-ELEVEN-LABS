export type FlowKind = 'start' | 'end' | 'step' | 'decision' | 'guardrail' | 'screen' | 'question';
export interface FlowEvidence {
  id: string; source: 'transcript' | 'events'; role: 'expert' | 'agent' | 'observation';
  kind?: string; at: number | null; text: string; file: string;
}
export interface ProcessNode {
  id: string; kind: FlowKind; title: string; at: number; evidenceIds: string[];
  reason: string; position: { x: number; y: number };
}
export interface ProcessFlow {
  version: 1; id: string; folder: string; title: string; summary: string; status: 'draft';
  sourceDigest: string; generatedAt: string; warnings: string[]; canvasEdited: boolean;
  nodes: ProcessNode[];
  edges: { id: string; source: string; target: string; label: string; kind: 'sequence' | 'condition' }[];
  evidence: FlowEvidence[];
}
export interface ProcessSummary {
  id: string; folder: string; title: string; startedAt: string; duration: number;
  steps: number; decisions: number; status: 'draft'; canvasEdited: boolean; evidenceCount: number;
}
export interface FlowResponse { flow: ProcessFlow; canvas: object; obsidianUri: string }
export const flowLabels: Record<FlowKind, string> = {
  start: 'Inicio', end: 'Fin del registro', step: 'Paso narrado', decision: 'Decisión por revisar',
  guardrail: 'Regla por revisar', screen: 'Pantalla', question: 'Pregunta',
};
export const flowClock = (at: number) => `${String(Math.floor(at / 60)).padStart(2, '0')}:${String(Math.floor(at % 60)).padStart(2, '0')}`;
