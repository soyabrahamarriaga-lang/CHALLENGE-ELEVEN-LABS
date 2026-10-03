export type Role = "senior" | "intern";
export type ConnectionStatus =
  | "disconnected"
  | "connecting"
  | "connected"
  | "error";
export type SessionStatus = "idle" | "active" | "paused" | "ended";
export type StepKind = "step" | "decision" | "variant";
export type LibraryStatus = "ready" | "loading" | "error" | "empty";
export interface ProcessStep {
  id: string;
  title: string;
  kind: StepKind;
  at: number;
  action: string;
  purpose: string;
  quote: string;
  context?: string;
  variant?: string;
}
export interface KnowledgeSession {
  id: string;
  title: string;
  senior: string;
  initials: string;
  role: string;
  date: string;
  description: string;
  category: string;
  color: "sage" | "blue" | "sand";
  duration: number;
  steps: ProcessStep[];
  demo: true;
}
export interface CallState {
  connection: ConnectionStatus;
  session: SessionStatus;
  elapsed: number;
  consent: boolean;
  questionIndex: number;
  excluded: number[];
  pauseReason: "user" | "connection" | null;
}
export type CallEvent =
  | { type: "CONNECT" }
  | { type: "CONNECTED" }
  | { type: "DISCONNECT" }
  | { type: "ERROR" }
  | { type: "START"; consent: boolean }
  | { type: "PAUSE" }
  | { type: "RESUME" }
  | { type: "TICK" }
  | { type: "FINISH" }
  | { type: "RESET" }
  | { type: "NEXT_QUESTION" }
  | { type: "EXCLUDE"; index: number };
