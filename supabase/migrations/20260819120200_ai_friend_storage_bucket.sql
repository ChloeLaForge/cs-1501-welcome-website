-- Build an AI Friend: durable image storage bucket.
--
-- *** LOCAL FILE ONLY. DO NOT APPLY. Pending instructor review. ***
--
-- OpenAI's image response is returned to the backend as base64 image bytes
-- (response_format is not requested as a URL at all -- see
-- server/aiServer.ts's use of images.generate, which reads result.data[0].b64_json),
-- so there is no OpenAI-hosted URL of any kind, temporary or otherwise, to
-- assume is durable. The backend uploads those same bytes here immediately
-- after a successful generation, and records the resulting bucket/path on
-- the session's ai_friend_images row (see 20260819120000_ai_friend_sessions.sql).
--
-- The bucket is private (public = false): only the backend, via
-- service_role (which bypasses storage RLS entirely, same as table RLS),
-- ever reads or writes it. The browser never talks to Supabase Storage
-- directly for this feature -- the generated image is shown to the student
-- from the base64 data URL already in the /api/ai-friend/generate response,
-- so no public bucket, signed URL, or storage-facing browser credential is
-- needed at all.
do $$
begin
  if exists (
    select 1 from storage.buckets
    where id = 'ai-friend-creations' or name = 'ai-friend-creations'
  ) then
    raise exception 'AI Friend storage collision: bucket ai-friend-creations already exists; refusing to reuse or modify an ambiguous bucket';
  end if;
end
$$;

insert into storage.buckets (id, name, public)
values ('ai-friend-creations', 'ai-friend-creations', false);

-- No storage.objects RLS policies are added: this bucket is private with no
-- policies, so anon/authenticated have zero access by default, and
-- service_role bypasses RLS. This does not touch any other bucket or
-- policy that may already exist in the target project.
