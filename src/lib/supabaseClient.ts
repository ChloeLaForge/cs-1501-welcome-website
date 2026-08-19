import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const SUPABASE_TIMEOUT_MS = 20_000;

async function fetchWithTimeout(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), SUPABASE_TIMEOUT_MS);
  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } finally {
    window.clearTimeout(timer);
  }
}

// The anon key is safe to ship to the browser: RLS on
// course_questionnaire_responses only grants anonymous INSERT (see
// supabase/migrations). No service_role key is ever referenced here.
export const supabase: SupabaseClient | null = url && anonKey
  ? createClient(url, anonKey, { global: { fetch: fetchWithTimeout } })
  : null;

export interface QuestionnaireResponseInsert {
  first_name: string;
  last_initial: string;
  coding_comfort: string;
  ai_coding_experience: string;
  build_interest: string | null;
  learning_interest: string | null;
  additional_context: string | null;
}

export async function submitQuestionnaireResponse(payload: QuestionnaireResponseInsert) {
  if (!supabase) {
    throw new Error(
      "Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.",
    );
  }
  const { error } = await supabase.from("course_questionnaire_responses").insert(payload);
  if (error) throw error;
}
