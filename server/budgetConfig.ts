// SINGLE SOURCE OF TRUTH for the Build an AI Friend hard OpenAI spending
// ceiling. Nothing else in this codebase hard-codes 40 -- change only this
// constant (or the COURSE_AI_BUDGET_CEILING_USD env var) to raise, lower,
// or re-enable the cap later. See server/budgetLedger.ts for how it's
// enforced and supabase/migrations/20260819120100_ai_friend_budget_ledger.sql
// for the atomic accounting it's checked against.
export const COURSE_AI_BUDGET_CEILING_USD = Number(process.env.COURSE_AI_BUDGET_CEILING_USD ?? 40);
