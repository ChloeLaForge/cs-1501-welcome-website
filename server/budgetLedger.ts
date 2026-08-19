import type { SupabaseClient } from "@supabase/supabase-js";
import { COURSE_AI_BUDGET_CEILING_USD } from "./budgetConfig";

export type BudgetRequestType = "chat" | "image";
export type ReservationDecision = "acquired" | "in_flight" | "finalized" | "denied" | "error";
export interface ReserveBudgetParams { requestId: string; requestType: BudgetRequestType; sessionId: string; reservedCostUsd: number }

export async function reserveBudget(admin: SupabaseClient, params: ReserveBudgetParams): Promise<ReservationDecision> {
  try {
    const { data, error } = await admin.rpc("reserve_course_ai_budget", {
      p_request_id: params.requestId, p_request_type: params.requestType, p_session_id: params.sessionId,
      p_reserved_cost_usd: params.reservedCostUsd, p_ceiling_usd: COURSE_AI_BUDGET_CEILING_USD,
    });
    if (error) { console.error("Budget reservation RPC failed -- failing closed:", error.message); return "error"; }
    const row = Array.isArray(data) ? data[0] : data;
    return ["acquired", "in_flight", "finalized", "denied"].includes(row?.decision) ? row.decision : "error";
  } catch (err) { console.error("Budget reservation RPC threw -- failing closed:", err); return "error"; }
}
export async function finalizeBudget(admin: SupabaseClient, requestId: string, actualCostUsd: number): Promise<boolean> {
  try {
    const { error } = await admin.rpc("finalize_course_ai_budget", { p_request_id: requestId, p_actual_cost_usd: actualCostUsd });
    if (error) console.error("Budget finalize failed; reservation remains conservatively committed:", error.message);
    return !error;
  } catch (err) { console.error("Budget finalize threw; reservation remains conservatively committed:", err); return false; }
}
/** Call only when it is known that no provider request began. */
export async function releaseBudget(admin: SupabaseClient, requestId: string): Promise<boolean> {
  try {
    const { error } = await admin.rpc("release_course_ai_budget", { p_request_id: requestId });
    if (error) console.error("Budget release failed; reservation remains conservatively committed:", error.message);
    return !error;
  } catch (err) { console.error("Budget release threw; reservation remains conservatively committed:", err); return false; }
}
export async function isBudgetAvailable(admin: SupabaseClient): Promise<boolean> {
  try {
    const { data, error } = await admin.rpc("get_course_ai_budget_status", { p_ceiling_usd: COURSE_AI_BUDGET_CEILING_USD });
    if (error) return false;
    const row = Array.isArray(data) ? data[0] : data;
    const remaining = Number(row?.remaining_usd);
    return Number.isFinite(remaining) && remaining > 0;
  } catch { return false; }
}
