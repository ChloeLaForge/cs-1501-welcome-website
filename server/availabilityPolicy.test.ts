import { describe, expect, it } from "vitest";
import { isDevelopmentVisibilityOverride } from "./availabilityPolicy";

describe("development-only AI Friend visibility", () => {
  it("is disabled unless explicitly requested", () => {
    expect(isDevelopmentVisibilityOverride({ NODE_ENV: "development" })).toBe(false);
  });
  it("may be enabled for local frontend inspection", () => {
    expect(isDevelopmentVisibilityOverride({ NODE_ENV: "development", AI_FRIEND_DEV_VISIBLE: "true" })).toBe(true);
  });
  it("can never be enabled in production", () => {
    expect(isDevelopmentVisibilityOverride({ NODE_ENV: "production", AI_FRIEND_DEV_VISIBLE: "true" })).toBe(false);
  });
  it("requires an exact true value", () => {
    expect(isDevelopmentVisibilityOverride({ NODE_ENV: "development", AI_FRIEND_DEV_VISIBLE: "1" })).toBe(false);
  });
});
