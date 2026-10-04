import type { ProcessFlow, ProcessImage, ProcessMetadata, FlowEvidence } from '../src/domain/processFlow';
export function buildProcessFlow(input: {id: string; folder: string; transcript: string; events?: string; extraction?: unknown; captures?: ProcessImage[]; metadata?: Partial<ProcessMetadata>}): ProcessFlow;
export function parseFlowEvidence(transcript: string, events?: string): FlowEvidence[];
export function flowClock(at: number): string;
export function flowToCanvas(flow: ProcessFlow): object;
export function flowMarkdown(flow: ProcessFlow): string;
export function flowEvidenceMarkdown(flow: ProcessFlow): string;
