import { describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { markImageComplete } from "./aiFriendStore";

function updateAdmin(result: { data: unknown; error: unknown }): SupabaseClient {
  const builder = {
    update: vi.fn(() => builder),
    eq: vi.fn(() => builder),
    neq: vi.fn(() => builder),
    select: vi.fn(() => builder),
    maybeSingle: vi.fn(() => Promise.resolve(result)),
  };
  return { from: vi.fn(() => builder) } as unknown as SupabaseClient;
}

describe("durable image state transitions", () => {
  it("does not report success when an update matched no image row", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    await expect(markImageComplete(updateAdmin({ data: null, error: null }), "session", "bucket", "path"))
      .resolves.toBe(false);
    expect(errorSpy).toHaveBeenCalled();
  });

  it("reports success only when the linked image row is returned", async () => {
    await expect(markImageComplete(updateAdmin({ data: { session_id: "session" }, error: null }), "session", "bucket", "path"))
      .resolves.toBe(true);
  });
});
