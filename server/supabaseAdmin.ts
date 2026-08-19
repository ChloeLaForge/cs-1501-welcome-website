import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Service-role Supabase client -- SERVER-SIDE ONLY. Never import this
// module from src/ (browser code); it holds a credential that must never
// reach the client bundle. Deliberately reads plain (non-VITE_-prefixed)
// env vars so Vite can never inline them into a bundle: SUPABASE_URL and
// SUPABASE_SERVICE_ROLE_KEY, read only by this Node process.
//
// Not to be confused with VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY (see
// src/lib/supabaseClient.ts), which are a *different*, browser-safe anon
// credential used only for the Tell Me About You form and grant nothing
// beyond that table's anonymous-insert RLS policy.
let cached: SupabaseClient | null | undefined;

/** Returns null if SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY aren't set -- callers must treat that as "persistence and budget enforcement unavailable" and fail closed. */
export function getSupabaseAdmin(): SupabaseClient | null {
  if (cached !== undefined) return cached;
  const url = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  cached = url && serviceRoleKey ? createClient(url, serviceRoleKey, { auth: { persistSession: false } }) : null;
  return cached;
}
