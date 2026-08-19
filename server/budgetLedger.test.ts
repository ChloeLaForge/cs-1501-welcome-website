import { afterEach, describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { finalizeBudget, isBudgetAvailable, releaseBudget, reserveBudget } from "./budgetLedger";

// budgetLedger.ts is a thin, fail-closed wrapper around the RPC functions
// defined in supabase/migrations/20260819120100_ai_friend_budget_ledger.sql.
// These tests mock the Supabase RPC boundary and verify the wrapper's
// decision logic (allow/deny, fail-closed-on-error, best-effort
// reconciliation) -- they cannot and do not prove the migration's Postgres
// advisory-lock atomicity, which requires a live database (see the
// concurrency-simulation test below for what *is* covered locally, and the
// implementation report's "Things NOT verified" section for what isn't).

function mockAdmin(rpcImpl: (fn: string, args: Record<string, unknown>) => { data: unknown; error: unknown }) {
  return { rpc: vi.fn((fn: string, args: Record<string, unknown>) => Promise.resolve(rpcImpl(fn, args))) } as unknown as SupabaseClient;
}

afterEach(() => vi.restoreAllMocks());

describe("reserveBudget", () => {
  it("fails closed when the RPC promise rejects", async () => {
    const admin = { rpc: vi.fn(() => Promise.reject(new Error("offline"))) } as unknown as SupabaseClient;
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    await expect(reserveBudget(admin, { requestId: "x", requestType: "chat", sessionId: "s", reservedCostUsd: 1 })).resolves.toBe("error");
  });
  it.each(["in_flight", "finalized", "denied"] as const)("preserves the database %s replay decision", async (decision) => {
    const admin = mockAdmin(() => ({ data: [{ decision, committed_usd: 1 }], error: null }));
    expect(await reserveBudget(admin, { requestId: "replay", requestType: "chat", sessionId: "s", reservedCostUsd: 1 })).toBe(decision);
  });
  it("allows a request comfortably below the ceiling", async () => {
    const admin = mockAdmin(() => ({ data: [{ decision: "acquired", committed_usd: 5 }], error: null }));
    const allowed = await reserveBudget(admin, { requestId: "s1:chat:1", requestType: "chat", sessionId: "s1", reservedCostUsd: 0.01 });
    expect(allowed).toBe("acquired");
  });

  it("allows a request near the limit when it still fits", async () => {
    const admin = mockAdmin(() => ({ data: [{ decision: "acquired", committed_usd: 39.98 }], error: null }));
    const allowed = await reserveBudget(admin, { requestId: "s2:chat:1", requestType: "chat", sessionId: "s2", reservedCostUsd: 0.01 });
    expect(allowed).toBe("acquired");
  });

  it("denies a request when remaining budget is insufficient (does not call OpenAI)", async () => {
    const admin = mockAdmin(() => ({ data: [{ decision: "denied", committed_usd: 39.995 }], error: null }));
    const allowed = await reserveBudget(admin, { requestId: "s3:chat:1", requestType: "chat", sessionId: "s3", reservedCostUsd: 0.01 });
    expect(allowed).toBe("denied");
  });

  it("denies a request exactly at the ceiling", async () => {
    const admin = mockAdmin(() => ({ data: [{ decision: "denied", committed_usd: 40 }], error: null }));
    const allowed = await reserveBudget(admin, { requestId: "s4:chat:1", requestType: "chat", sessionId: "s4", reservedCostUsd: 0.01 });
    expect(allowed).toBe("denied");
  });

  it("fails closed when the RPC errors -- never treats an unknown budget state as available", async () => {
    const admin = mockAdmin(() => ({ data: null, error: { message: "connection reset" } }));
    const allowed = await reserveBudget(admin, { requestId: "s5:chat:1", requestType: "chat", sessionId: "s5", reservedCostUsd: 0.01 });
    expect(allowed).toBe("error");
  });
});

describe("finalizeBudget / releaseBudget", () => {
  it("reports successful finalize and release so callers can await truthful persistence", async () => {
    const admin = mockAdmin(() => ({ data: null, error: null }));
    await expect(finalizeBudget(admin, "finalize", 0.02)).resolves.toBe(true);
    await expect(releaseBudget(admin, "release")).resolves.toBe(true);
  });
  it("finalize does not throw on RPC error (best-effort reconciliation after a successful, already-paid-for OpenAI call)", async () => {
    const admin = mockAdmin(() => ({ data: null, error: { message: "boom" } }));
    await expect(finalizeBudget(admin, "s6:chat:1", 0.02)).resolves.toBe(false);
  });

  it("release does not throw on RPC error (best-effort release for a request never sent to OpenAI)", async () => {
    const admin = mockAdmin(() => ({ data: null, error: { message: "boom" } }));
    await expect(releaseBudget(admin, "s7:chat:1")).resolves.toBe(false);
  });
});

describe("isBudgetAvailable", () => {
  it("true when remaining budget is positive", async () => {
    const admin = mockAdmin(() => ({ data: [{ committed_usd: 10, remaining_usd: 30, ceiling_usd: 40 }], error: null }));
    expect(await isBudgetAvailable(admin)).toBe(true);
  });

  it("false when remaining budget is exactly zero", async () => {
    const admin = mockAdmin(() => ({ data: [{ committed_usd: 40, remaining_usd: 0, ceiling_usd: 40 }], error: null }));
    expect(await isBudgetAvailable(admin)).toBe(false);
  });

  it("fails closed on RPC error", async () => {
    const admin = mockAdmin(() => ({ data: null, error: { message: "boom" } }));
    expect(await isBudgetAvailable(admin)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Concurrency-safety ALGORITHM simulation.
//
// This does not exercise Postgres. It re-implements, in JS, the exact
// decision rule the migration's reserve_course_ai_budget() function uses
// (committed = sum of reserved+finalized; deny if committed + requested >
// ceiling) and serializes it behind a single mutex, mirroring the
// migration's pg_advisory_xact_lock. It proves the ALGORITHM cannot let two
// simultaneous reservations jointly exceed the ceiling; it does not prove
// the SQL migration itself is correct or that Postgres's advisory lock
// behaves as documented -- only applying the migration and testing against
// a real database can prove that (see report section M).
// ---------------------------------------------------------------------------

describe("reservation algorithm under simulated concurrency", () => {
  it("two simultaneous requests for more than the remaining budget cannot both be reserved", async () => {
    const ceiling = 40;
    let committed = 39.99;
    let lockChain: Promise<void> = Promise.resolve();

    async function reserve(cost: number): Promise<boolean> {
      let release!: () => void;
      const mine = new Promise<void>((resolve) => (release = resolve));
      const previous = lockChain;
      lockChain = lockChain.then(() => mine);
      await previous;
      try {
        await new Promise((r) => setTimeout(r, 0)); // simulate a real async DB round trip
        if (committed + cost > ceiling) return false;
        committed += cost;
        return true;
      } finally {
        release();
      }
    }

    const [a, b] = await Promise.all([reserve(0.01), reserve(0.01)]);
    const successes = [a, b].filter(Boolean).length;

    expect(successes).toBe(1);
    expect(committed).toBeLessThanOrEqual(ceiling);
  });
});
