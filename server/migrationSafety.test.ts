import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const budgetSql = readFileSync("supabase/migrations/20260819120100_ai_friend_budget_ledger.sql", "utf8");
const sessionSql = readFileSync("supabase/migrations/20260819120000_ai_friend_sessions.sql", "utf8");
const storageSql = readFileSync("supabase/migrations/20260819120200_ai_friend_storage_bucket.sql", "utf8");
const questionnaireSql = readFileSync("supabase/migrations/20260817120000_course_questionnaire_responses.sql", "utf8");
const serverSource = readFileSync("server/aiServer.ts", "utf8");
const storeSource = readFileSync("server/aiFriendStore.ts", "utf8");

describe("unapplied migration safety structure", () => {
  it("captures row existence before aggregate queries and never reuses ambient FOUND", () => {
    expect(budgetSql).toContain("v_exists := found");
    expect(budgetSql).toContain("if v_exists then");
    expect(budgetSql).not.toMatch(/if found then/);
  });
  it("gates every OpenAI call behind an acquired reservation decision", () => {
    expect(serverSource.match(/decision !== "acquired"/g)).toHaveLength(2);
    expect(serverSource.match(/new OpenAI/g)).toHaveLength(2);
  });
  it("awaits critical writes and never releases after an uncertain provider error", () => {
    expect(serverSource).not.toMatch(/void (persistMessage|finalizeBudget|releaseBudget|markImage)/);
    expect(serverSource).toContain("Provider billing is uncertain");
  });
  it("makes completed image storage immutable and requires durable metadata before success", () => {
    expect(storeSource).toContain("upsert: false");
    expect(serverSource).toContain('existingImage?.status === "complete"');
    expect(serverSource).toContain("downloadStoredImage");
    expect(serverSource.indexOf("await markImageComplete")).toBeLessThan(serverSource.lastIndexOf("imageDataUrl"));
  });
  it("locks privileged resolution to pg_catalog and schema-qualifies ledger access", () => {
    expect(budgetSql.match(/set search_path = pg_catalog/g)).toHaveLength(4);
    expect(budgetSql).toContain("public.course_ai_budget_ledger");
  });
  it("revokes browser execution and grants only service_role", () => {
    expect(budgetSql.match(/from public, anon, authenticated/g)).toHaveLength(4);
    expect(budgetSql.match(/to service_role/g)).toHaveLength(4);
  });
  it("fails on table/function/bucket collisions", () => {
    expect(questionnaireSql).toContain("questionnaire migration collision");
    expect(questionnaireSql).not.toContain("create table if not exists course_questionnaire_responses");
    expect(sessionSql).toContain("migration collision");
    expect(budgetSql).toContain("migration collision");
    expect(storageSql).toContain("storage collision");
    expect(storageSql).not.toContain("on conflict");
  });
  it("supports separately-accounted image retries without overwriting prior objects", () => {
    expect(sessionSql).toContain("attempt_count integer not null default 0");
    expect(storeSource).toContain("creation-${attemptCount}.png");
    expect(serverSource).toContain("maxRetries: 0");
    expect(serverSource).toContain("A prior image may already have been created");
  });
});
