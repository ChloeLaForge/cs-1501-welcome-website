import type { SupabaseClient } from "@supabase/supabase-js";

export interface StartSessionInput {
  sessionId: string; authorityTokenHash: string; buildSubjectLabel: string;
  buildSubjectCustom: string | null; buildSubject: string; tone: string;
  workingStyle: string; customInstruction: string; openingMessage: string;
}
export interface StoredMessage { turn_index: number; role: "user" | "assistant"; content: string }
export interface AuthorizedSession {
  id: string; build_subject: string; tone: string; working_style: string;
  custom_instruction: string; messages: StoredMessage[];
}

export async function persistSessionStart(admin: SupabaseClient, input: StartSessionInput): Promise<boolean> {
  const { error } = await admin.from("ai_friend_sessions").insert({
    id: input.sessionId, authority_token_hash: input.authorityTokenHash,
    build_subject_label: input.buildSubjectLabel, build_subject_custom: input.buildSubjectCustom,
    build_subject: input.buildSubject, tone: input.tone, working_style: input.workingStyle,
    custom_instruction: input.customInstruction,
  });
  if (error) { console.error("Failed to persist AI Friend session start:", error.message); return false; }
  if (await persistMessage(admin, input.sessionId, 0, "assistant", input.openingMessage)) return true;
  await admin.from("ai_friend_sessions").delete().eq("id", input.sessionId);
  return false;
}

export async function loadAuthorizedSession(admin: SupabaseClient, sessionId: string, authorityTokenHash: string): Promise<AuthorizedSession | null> {
  const { data: session, error } = await admin.from("ai_friend_sessions")
    .select("id,build_subject,tone,working_style,custom_instruction")
    .eq("id", sessionId).eq("authority_token_hash", authorityTokenHash).maybeSingle();
  if (error || !session) return null;
  const { data: messages, error: messageError } = await admin.from("ai_friend_messages")
    .select("turn_index,role,content").eq("session_id", sessionId).order("turn_index", { ascending: true });
  if (messageError || !messages) return null;
  return { ...session, messages } as AuthorizedSession;
}

export async function persistMessage(admin: SupabaseClient, sessionId: string, turnIndex: number, role: "user" | "assistant", content: string): Promise<boolean> {
  const { error } = await admin.from("ai_friend_messages").insert({ session_id: sessionId, turn_index: turnIndex, role, content });
  if (error) console.error("Failed to persist AI Friend message turn:", error.message);
  return !error;
}

export type ImageState = { status: "generating" | "complete" | "failed"; storage_bucket: string | null; storage_path: string | null; attempt_count: number; error_message: string | null };
export async function getImageState(admin: SupabaseClient, sessionId: string): Promise<ImageState | null> {
  const { data, error } = await admin.from("ai_friend_images").select("status,storage_bucket,storage_path,attempt_count,error_message").eq("session_id", sessionId).maybeSingle();
  return error ? null : data as ImageState | null;
}
export async function markImageGenerating(admin: SupabaseClient, sessionId: string, attemptCount: number): Promise<boolean> {
  const existing = await getImageState(admin, sessionId);
  if (existing?.status === "complete") return false;
  const payload = { session_id: sessionId, status: "generating", attempt_count: attemptCount, error_message: null, requested_at: new Date().toISOString() };
  const query = existing
    ? admin.from("ai_friend_images").update(payload).eq("session_id", sessionId).neq("status", "complete").eq("attempt_count", attemptCount - 1)
    : admin.from("ai_friend_images").insert(payload);
  const { data, error } = await query.select("session_id").maybeSingle();
  if (error || !data) console.error("Failed to mark AI Friend image generating:", error?.message ?? "row not updated");
  return !error && Boolean(data);
}
export async function markImageComplete(admin: SupabaseClient, sessionId: string, storageBucket: string, storagePath: string): Promise<boolean> {
  const { data, error } = await admin.from("ai_friend_images").update({ status: "complete", storage_bucket: storageBucket,
    storage_path: storagePath, error_message: null, completed_at: new Date().toISOString() })
    .eq("session_id", sessionId).neq("status", "complete").select("session_id").maybeSingle();
  if (error || !data) console.error("Failed to mark AI Friend image complete:", error?.message ?? "row not updated");
  return !error && Boolean(data);
}
export async function markImageFailed(admin: SupabaseClient, sessionId: string, message: string): Promise<boolean> {
  const { data, error } = await admin.from("ai_friend_images").update({ status: "failed", error_message: message.slice(0, 500) })
    .eq("session_id", sessionId).neq("status", "complete").select("session_id").maybeSingle();
  if (error || !data) console.error("Failed to mark AI Friend image failed:", error?.message ?? "row not updated");
  return !error && Boolean(data);
}

const IMAGE_BUCKET = "ai-friend-creations";
export async function uploadImageToStorage(admin: SupabaseClient, sessionId: string, attemptCount: number, base64Png: string): Promise<{ bucket: string; path: string } | null> {
  const path = `${sessionId}/creation-${attemptCount}.png`;
  const { error } = await admin.storage.from(IMAGE_BUCKET).upload(path, Buffer.from(base64Png, "base64"), { contentType: "image/png", upsert: false });
  if (error) { console.error("Failed to upload AI Friend image to storage:", error.message); return null; }
  return { bucket: IMAGE_BUCKET, path };
}

export async function downloadStoredImage(admin: SupabaseClient, state: ImageState): Promise<string | null> {
  if (state.status !== "complete" || !state.storage_bucket || !state.storage_path) return null;
  const { data, error } = await admin.storage.from(state.storage_bucket).download(state.storage_path);
  if (error || !data) {
    console.error("Failed to recover completed AI Friend image:", error?.message ?? "missing data");
    return null;
  }
  return Buffer.from(await data.arrayBuffer()).toString("base64");
}

export async function recoverUploadedAttempt(admin: SupabaseClient, sessionId: string, attemptCount: number): Promise<{ base64: string; bucket: string; path: string } | null> {
  if (attemptCount < 1) return null;
  const path = `${sessionId}/creation-${attemptCount}.png`;
  const { data, error } = await admin.storage.from(IMAGE_BUCKET).download(path);
  if (error || !data) return null;
  return { base64: Buffer.from(await data.arrayBuffer()).toString("base64"), bucket: IMAGE_BUCKET, path };
}
