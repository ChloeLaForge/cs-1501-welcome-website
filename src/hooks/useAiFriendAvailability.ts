import { useEffect, useState } from "react";
import { checkAiFriendAvailability } from "../lib/aiFriendClient";

/**
 * Drives whether "Build Your AI Friend" is shown anywhere in the UI
 * (homepage sticky note, sidebar nav item, the route itself). Starts
 * `undefined` ("not yet known") rather than `true`, so the feature never
 * flashes visible for a moment before a `false` result arrives -- callers
 * that need to distinguish "still loading" from "confirmed unavailable"
 * can check for `undefined` explicitly; callers that just need a
 * boolean for rendering can treat `undefined` and `false` the same way
 * (don't show it yet).
 *
 * This is a UI hint only. The backend independently re-checks availability
 * on every billable request (see server/aiServer.ts's requireAiFriendAvailable),
 * so a stale `true` here can never itself authorize spend.
 */
export type AiFriendAvailability = "loading" | "available" | "unavailable" | "error";

export function useAiFriendAvailability(): AiFriendAvailability {
  const [available, setAvailable] = useState<AiFriendAvailability>("loading");

  useEffect(() => {
    let cancelled = false;
    void checkAiFriendAvailability()
      .then((result) => { if (!cancelled) setAvailable(result ? "available" : "unavailable"); })
      .catch(() => { if (!cancelled) setAvailable("error"); });
    return () => {
      cancelled = true;
    };
  }, []);

  return available;
}
