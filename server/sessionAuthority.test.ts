import { describe, expect, it } from "vitest";
import { hashSessionToken, issueSessionAuthority, parseSessionAuthority } from "./sessionAuthority";

describe("anonymous session authority", () => {
  it("issues independent high-entropy credentials and stores a one-way hash", () => {
    const a = issueSessionAuthority();
    const b = issueSessionAuthority();
    expect(a.sessionId).not.toBe(b.sessionId);
    expect(a.sessionToken).not.toBe(b.sessionToken);
    expect(hashSessionToken(a.sessionToken)).toMatch(/^[0-9a-f]{64}$/);
    expect(hashSessionToken(a.sessionToken)).not.toContain(a.sessionToken);
  });
  it("rejects an arbitrary UUID without its credential", () => {
    const authority = issueSessionAuthority();
    expect(parseSessionAuthority(authority.sessionId, undefined)).toBeNull();
  });
  it("a different session credential cannot authenticate the target session hash", () => {
    const a = issueSessionAuthority();
    const b = issueSessionAuthority();
    expect(hashSessionToken(a.sessionToken)).not.toBe(hashSessionToken(b.sessionToken));
  });
});
