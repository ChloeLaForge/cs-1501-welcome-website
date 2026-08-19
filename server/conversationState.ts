export interface ConversationMessage { turn_index: number; role: "user" | "assistant"; content: string }
export type NextTurn = { ok: true; turnNumber: number; turnIndex: number } | { ok: false; reason: "complete" | "in_flight" | "invalid" };
export type RequestedTurnState =
  | { kind: "new" }
  | { kind: "pending" }
  | { kind: "replay"; reply: string }
  | { kind: "conflict" };

export function classifyRequestedTurn(messages: ConversationMessage[], requestedTurn: number, content: string): RequestedTurnState {
  const userTurns = messages.filter((message) => message.role === "user").length;
  if (userTurns === requestedTurn && messages.at(-1)?.role === "assistant"
      && messages.at(-2)?.role === "user" && messages.at(-2)?.content === content) {
    return { kind: "replay", reply: messages.at(-1)!.content };
  }
  if (userTurns === requestedTurn && messages.at(-1)?.role === "user" && messages.at(-1)?.content === content) {
    return { kind: "pending" };
  }
  return userTurns + 1 === requestedTurn ? { kind: "new" } : { kind: "conflict" };
}

export function deriveNextTurn(messages: ConversationMessage[], maximumTurns: number): NextTurn {
  if (!messages.length || messages[0].turn_index !== 0 || messages[0].role !== "assistant") return { ok: false, reason: "invalid" };
  if (messages.some((message, index) => message.turn_index !== index)) return { ok: false, reason: "invalid" };
  const userTurns = messages.filter((message) => message.role === "user").length;
  if (userTurns >= maximumTurns) return { ok: false, reason: "complete" };
  if (messages.at(-1)?.role !== "assistant") return { ok: false, reason: "in_flight" };
  return { ok: true, turnNumber: userTurns + 1, turnIndex: messages.length };
}
