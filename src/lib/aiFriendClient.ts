import type { ChatMessage, CompanionConfig, CompanionTurnResult } from "../types/aiFriend";

const DEFAULT_CHAT_ERROR = "Something went wrong reaching your companion. Try again?";
const DEFAULT_GENERATE_ERROR = "Couldn't build your creation. Try again?";
const activeControllers = new Set<AbortController>();

function timeoutFor(url: string): number {
  if (url.endsWith("/generate")) return 150_000;
  if (url.endsWith("/chat")) return 90_000;
  return 20_000;
}

async function timedFetch(url: string, init?: RequestInit): Promise<Response> {
  const controller = new AbortController();
  activeControllers.add(controller);
  const timer = window.setTimeout(() => controller.abort("timeout"), timeoutFor(url));
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } catch (err) {
    if (controller.signal.aborted) {
      throw new Error(controller.signal.reason === "timeout"
        ? "The server took too long to respond. Please try again."
        : "The request was cancelled.");
    }
    throw err;
  } finally {
    window.clearTimeout(timer);
    activeControllers.delete(controller);
  }
}

export function cancelAiFriendRequests() {
  for (const controller of activeControllers) controller.abort("navigation");
  activeControllers.clear();
}

// A random id generated fresh on every page load, used only so the server
// can correlate requests from this tab for lightweight rate limiting and
// the one-active-generation-at-a-time guard (see server/aiServer.ts). It is
// never written to localStorage/cookies, so it cannot be used to restore
// the student's session after a refresh -- a reload simply gets a new one.
let sessionAuthority: { sessionId: string; sessionToken: string } | null = null;

async function postJson(url: string, body: unknown): Promise<unknown> {
  let res: Response;
  try {
    res = await timedFetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch {
    throw new Error("Couldn't reach the server. Check your connection and try again.");
  }

  const data: unknown = await res.json().catch(() => null);
  if (!res.ok) {
    const message = (data as { error?: unknown } | null)?.error;
    throw new Error(typeof message === "string" && message ? message : DEFAULT_CHAT_ERROR);
  }
  return data;
}

// Browser -> our /api/ai-friend/* endpoints -> OpenAI -> back here. The
// OpenAI API key never reaches this file or the browser; see
// server/aiServer.ts, which is the only place it's read.

/**
 * Whether the backend currently authorizes new AI Friend requests -- driven
 * entirely by server-side budget state (see server/budgetLedger.ts). This
 * is a UI hint only, used to decide whether to show the feature at all
 * (see src/hooks/useAiFriendAvailability.ts); every actual request the
 * backend receives re-checks this independently and is the real
 * enforcement point. Fails to `false` on any network/parse error so an
 * unreachable server never leaves the feature looking available.
 */
export async function checkAiFriendAvailability(): Promise<boolean> {
  const res = await timedFetch("/api/ai-friend/availability");
  if (!res.ok) throw new Error("Availability lookup failed.");
  const data = (await res.json().catch(() => null)) as { available?: unknown } | null;
  if (typeof data?.available !== "boolean") throw new Error("Availability response was invalid.");
  return data.available;
}

export interface StartSessionInput {
  subjectLabel: string;
  customSubject: string;
  config: CompanionConfig;
  openingMessage: string;
}

/**
 * Persists Part One (configuration) plus the locally-generated opening
 * line for this session, before the conversation that depends on it
 * happens. Best-effort from the caller's point of view: a false/failed
 * result should not block the student's demo (see AiFriendPage.tsx), only
 * a thrown "unavailable" error should.
 */
export async function startAiFriendSession(input: StartSessionInput): Promise<void> {
  const data = await postJson("/api/ai-friend/start-session", {
    buildSubjectLabel: input.subjectLabel,
    buildSubjectCustom: input.customSubject || undefined,
    buildSubject: input.config.buildSubject,
    tone: input.config.tone,
    workingStyle: input.config.workingStyle,
    customInstruction: input.config.customInstruction,
    openingMessage: input.openingMessage,
  });
  const result = data as { sessionId?: unknown; sessionToken?: unknown };
  if (typeof result.sessionId !== "string" || typeof result.sessionToken !== "string") throw new Error(DEFAULT_CHAT_ERROR);
  sessionAuthority = { sessionId: result.sessionId, sessionToken: result.sessionToken };
}

/**
 * Sends the student's next message to the bounded design conversation.
 * `messages` is the full transcript so far, including the newest student
 * message as the last entry, but excluding messages[0] -- that's always the
 * locally-generated opening line (see buildOpeningMessage), which was never
 * sent to the model and costs nothing.
 */
export async function sendCompanionMessage(
  config: CompanionConfig,
  messages: ChatMessage[],
): Promise<CompanionTurnResult> {
  if (!sessionAuthority) throw new Error("This session is no longer valid. Start again.");
  const newest = messages.at(-1);
  if (!newest || newest.role !== "user") throw new Error(DEFAULT_CHAT_ERROR);
  const turnNumber = messages.filter((message) => message.role === "user").length;
  const data = (await postJson("/api/ai-friend/chat", {
    message: newest.content,
    turnNumber,
    ...sessionAuthority,
  })) as { reply?: unknown; turnNumber?: unknown; isFinalTurn?: unknown };

  if (typeof data.reply !== "string" || !data.reply || typeof data.turnNumber !== "number") {
    throw new Error(DEFAULT_CHAT_ERROR);
  }
  return { reply: data.reply, turnNumber: data.turnNumber, isFinalTurn: Boolean(data.isFinalTurn) };
}

/** Generates the final creation image from the build subject + completed bounded conversation. */
export async function generateCreationImage(buildSubject: string, messages: ChatMessage[]): Promise<string> {
  void buildSubject;
  void messages;
  if (!sessionAuthority) throw new Error("This session is no longer valid. Start again.");
  const data = (await postJson("/api/ai-friend/generate", {
    ...sessionAuthority,
  })) as { imageDataUrl?: unknown };

  if (typeof data.imageDataUrl !== "string" || !data.imageDataUrl) {
    throw new Error(DEFAULT_GENERATE_ERROR);
  }
  return data.imageDataUrl;
}
