/**
 * Explicit local-only UI override. This never authorizes a paid operation;
 * chat/generate continue through requireAiFriendAvailable and the ledger RPC.
 */
export function isDevelopmentVisibilityOverride(env: NodeJS.ProcessEnv = process.env): boolean {
  return env.NODE_ENV !== "production" && env.AI_FRIEND_DEV_VISIBLE === "true";
}
