// Client for the private Obsidian vault served by server/vault.mjs.
// The vault is optional: a machine without VAULT_PATH answers 503 and the UI stays quiet.

export type ArchiveResult =
  | { status: "saved"; file: string; flowStatus?: "ready" | "failed" }
  | { status: "disabled" }
  | { status: "failed"; reason: string };

export type VaultEventKind = "screen" | "question" | "answer" | "guardrail" | "decision" | "note";

type Options = {
  fetcher?: typeof fetch;
  wait?: (ms: number) => Promise<void>;
  attempts?: number;
  delayMs?: number;
  signal?: AbortSignal;
};

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));
const ID = /^[A-Za-z0-9_-]{1,80}$/;

// ElevenLabs keeps a finished conversation in "processing" for a few seconds; retry on 409.
export async function archiveConversation(
  conversationId: string,
  { fetcher = fetch, wait = sleep, attempts = 15, delayMs = 4000, signal }: Options = {},
): Promise<ArchiveResult> {
  if (!ID.test(conversationId)) return { status: "failed", reason: "invalid_id" };
  for (let attempt = 1; attempt <= attempts; attempt++) {
    if (signal?.aborted) return { status: "failed", reason: "aborted" };
    let response: Response;
    try {
      response = await fetcher(`/api/vault/conversations/${conversationId}/import`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{}",
        cache: "no-store",
        signal,
      });
    } catch {
      return { status: "failed", reason: "network" };
    }
    if (response.ok) {
      const body = await response.json().catch(() => ({}));
      return { status: "saved", file: typeof body?.file === "string" ? body.file : "", ...(body.flowStatus === "ready" || body.flowStatus === "failed" ? { flowStatus: body.flowStatus } : {}) };
    }
    // Vite answers 404/502 when the backend is not running; 503 = vault or key not configured.
    if (response.status === 503 || response.status === 404) return { status: "disabled" };
    if (response.status !== 409) {
      const body = await response.json().catch(() => ({}));
      return { status: "failed", reason: String(body?.error || response.status) };
    }
    if (attempt < attempts) await wait(delayMs);
  }
  return { status: "failed", reason: "still_processing" };
}

export async function logVaultEvent(
  conversationId: string,
  event: { kind: VaultEventKind; text: string; at?: number; ref?: string },
  fetcher: typeof fetch = fetch,
): Promise<boolean> {
  if (!ID.test(conversationId)) return false;
  try {
    const response = await fetcher(`/api/vault/sessions/${conversationId}/events`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(event),
      cache: "no-store",
    });
    return response.ok;
  } catch {
    return false;
  }
}
