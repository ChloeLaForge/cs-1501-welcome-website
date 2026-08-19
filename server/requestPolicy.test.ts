import { describe, expect, it } from "vitest";
import { resolveClientIp } from "./requestPolicy";

describe("proxy-aware client IP resolution", () => {
  it("ignores spoofable forwarding headers by default", () => {
    expect(resolveClientIp("127.0.0.1", "203.0.113.9", 0)).toBe("127.0.0.1");
  });
  it("uses the address immediately before one explicitly trusted proxy", () => {
    expect(resolveClientIp("10.0.0.2", "203.0.113.9", 1)).toBe("203.0.113.9");
  });
  it("supports a documented two-proxy chain", () => {
    expect(resolveClientIp("10.0.0.2", "203.0.113.9, 10.0.0.1", 2)).toBe("203.0.113.9");
  });
  it("fails back to the socket when the chain is shorter than configured", () => {
    expect(resolveClientIp("10.0.0.3", "203.0.113.9", 2)).toBe("10.0.0.3");
  });
});
