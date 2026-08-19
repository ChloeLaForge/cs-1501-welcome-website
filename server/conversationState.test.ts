import { describe, expect, it } from "vitest";
import { classifyRequestedTurn, deriveNextTurn, type ConversationMessage } from "./conversationState";

const opening: ConversationMessage = { turn_index: 0, role: "assistant", content: "hello" };
function completedTurns(count: number): ConversationMessage[] {
  const messages = [opening];
  for (let turn = 1; turn <= count; turn++) {
    messages.push({ turn_index: messages.length, role: "user", content: `u${turn}` });
    messages.push({ turn_index: messages.length, role: "assistant", content: `a${turn}` });
  }
  return messages;
}

describe("server-authoritative conversation state", () => {
  it("derives the paid turn and index only from stored messages", () => {
    expect(deriveNextTurn(completedTurns(2), 5)).toEqual({ ok: true, turnNumber: 3, turnIndex: 5 });
  });
  it("rejects a sixth turn", () => expect(deriveNextTurn(completedTurns(5), 5)).toEqual({ ok: false, reason: "complete" }));
  it("rejects a simultaneous/replayed turn while the stored user turn is pending", () => {
    const messages = completedTurns(1);
    messages.push({ turn_index: 3, role: "user", content: "pending" });
    expect(deriveNextTurn(messages, 5)).toEqual({ ok: false, reason: "in_flight" });
  });
  it("rejects transcript gaps instead of deriving a request id from them", () => {
    expect(deriveNextTurn([opening, { turn_index: 3, role: "assistant", content: "gap" }], 5)).toEqual({ ok: false, reason: "invalid" });
  });
});

describe("idempotent requested-turn classification", () => {
  it("replays a saved assistant reply after a lost HTTP response", () => {
    expect(classifyRequestedTurn(completedTurns(1), 1, "u1")).toEqual({ kind: "replay", reply: "a1" });
  });
  it("recognizes the same still-pending user message without advancing", () => {
    const messages = completedTurns(0);
    messages.push({ turn_index: 1, role: "user", content: "same" });
    expect(classifyRequestedTurn(messages, 1, "same")).toEqual({ kind: "pending" });
  });
  it("allows exactly the next expected turn and rejects stale or changed replays", () => {
    expect(classifyRequestedTurn(completedTurns(1), 2, "u2")).toEqual({ kind: "new" });
    expect(classifyRequestedTurn(completedTurns(1), 1, "changed")).toEqual({ kind: "conflict" });
  });
});
