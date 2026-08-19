export interface CompanionConfig {
  /** e.g. "house", "water park" -- the primary subject passed to both the chat and the image generator. */
  buildSubject: string;
  tone: string;
  workingStyle: string;
  /** Optional, untrusted, length-capped. Influences companion behavior only -- never design output. */
  customInstruction: string;
}

export type ChatRole = "user" | "assistant";

export interface ChatMessage {
  id: string;
  role: ChatRole;
  content: string;
}

export interface CompanionTurnResult {
  reply: string;
  /** Server-authoritative count of student messages answered so far, 1-5. */
  turnNumber: number;
  /** True once the server has responded to the 5th (final) student message. */
  isFinalTurn: boolean;
}

export type CreationState = "empty" | "ready" | "generating" | "complete" | "error";
