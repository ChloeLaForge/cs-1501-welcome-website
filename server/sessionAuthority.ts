import { createHash, randomBytes, randomUUID } from "node:crypto";

export interface SessionAuthority { sessionId: string; sessionToken: string }
export function issueSessionAuthority(): SessionAuthority {
  return { sessionId: randomUUID(), sessionToken: randomBytes(32).toString("base64url") };
}
export function hashSessionToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}
export function parseSessionAuthority(sessionId: unknown, sessionToken: unknown): SessionAuthority | null {
  if (typeof sessionId !== "string" || typeof sessionToken !== "string") return null;
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(sessionId)) return null;
  if (!/^[A-Za-z0-9_-]{40,200}$/.test(sessionToken)) return null;
  return { sessionId, sessionToken };
}
