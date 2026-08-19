-- Build an AI Friend: anonymous session persistence.
--
-- *** LOCAL FILE ONLY. DO NOT APPLY. Pending instructor review. ***
--
-- Purpose: let the instructor later reconstruct, per anonymous session:
--   configuration -> conversation transcript -> generated image
-- with no student-identifying information anywhere in these tables.
--
-- Isolation: every object here is course/feature-specific
-- (ai_friend_* prefix). Nothing here touches, renames, or alters any table,
-- policy, or extension belonging to another application that may share this
-- Supabase project.
--
-- Access model: the browser never talks to these tables directly (no
-- VITE_-exposed anon writes, unlike course_questionnaire_responses). Only
-- the backend (server/aiServer.ts), authenticating with the service_role
-- key, reads/writes them -- service_role bypasses RLS entirely. RLS is
-- still enabled below with NO policies for anon/authenticated, as a
-- defense-in-depth default-deny in case that key is ever misconfigured.

-- Idempotent, additive-only, and shared with course_questionnaire_responses
-- (see 20260817120000_course_questionnaire_responses.sql) -- safe to declare
-- again here in case this file is ever applied to a project that doesn't
-- already have it.
create extension if not exists "pgcrypto";

-- One row per anonymous "Build an AI Friend" session. Created when the
-- student submits Part One (the configuration form), before the
-- conversation that depends on it happens -- so a session with no messages
-- or image yet is a normal, expected state, not a broken one.
do $$
begin
  if to_regclass('public.ai_friend_sessions') is not null
     or to_regclass('public.ai_friend_messages') is not null
     or to_regclass('public.ai_friend_images') is not null then
    raise exception 'AI Friend migration collision: one or more public.ai_friend_* relations already exist; refusing to adopt or alter them';
  end if;
end
$$;

create table public.ai_friend_sessions (
  -- Generated server-side (see server/sessionAuthority.ts) and supplied by
  -- the backend on insert, so the same id can be reused to
  -- correlate this session's messages and image. Never derived from or
  -- combined with any student-identifying information.
  id uuid primary key,
  -- SHA-256 of the server-issued high-entropy bearer credential. The raw
  -- credential is returned once to the anonymous browser and is never stored.
  authority_token_hash text not null unique check (authority_token_hash ~ '^[0-9a-f]{64}$'),

  -- The option label the student picked in the form (e.g. "House",
  -- "Something Else"), kept verbatim for review even though build_subject
  -- below is what was actually sent to the model.
  build_subject_label text not null,
  -- The free-text custom subject, only populated when build_subject_label
  -- is the "Something Else" option. Null otherwise.
  build_subject_custom text,
  -- The resolved subject actually used in prompts (either the preset value
  -- or the trimmed custom text).
  build_subject text not null,

  tone text not null,
  working_style text not null,
  -- Optional. Untrusted, length-capped free text (see MAX_CUSTOM_INSTRUCTION_CHARS
  -- in server/aiServer.ts). Never null vs. empty-string ambiguity: empty means absent.
  custom_instruction text not null default '',

  created_at timestamptz not null default now()
);

comment on table ai_friend_sessions is
  'Course-specific: Build an AI Friend anonymous session configuration. No student-identifying fields.';

-- Complete chronological transcript for a session, including the locally
-- generated opening line (turn_index 0, role assistant, never sent to
-- OpenAI -- see buildOpeningMessage in src/data/aiFriendOptions.ts) so the
-- instructor sees exactly what the student saw.
create table public.ai_friend_messages (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.ai_friend_sessions(id) on delete cascade,
  -- Position in the full displayed transcript, 0-based, starting at the
  -- opening line. Unique per session so a retried write (e.g. a client
  -- retry after a network blip) is a safe no-op, never a duplicate row.
  turn_index integer not null check (turn_index >= 0),
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  created_at timestamptz not null default now(),
  unique (session_id, turn_index)
);

comment on table ai_friend_messages is
  'Course-specific: Build an AI Friend conversation turns, in chronological order per session.';

create index ai_friend_messages_session_id_idx
  on public.ai_friend_messages (session_id);

-- At most one row per session: the lifecycle of that session's single
-- generated image. status moves generating -> complete|failed. A failed
-- generation does not delete the row or the session's messages -- it is
-- overwritten in place on retry (see server/aiFriendStore.ts), which is why
-- session_id is the primary key rather than a separate surrogate id.
create table public.ai_friend_images (
  session_id uuid primary key references public.ai_friend_sessions(id) on delete cascade,
  status text not null default 'generating' check (status in ('generating', 'complete', 'failed')),
  -- Monotonic provider-attempt number. Each failed attempt keeps its own
  -- fully-accounted budget reservation; retries never reuse an ambiguous
  -- request id or cause the same completed attempt to run twice.
  attempt_count integer not null default 0 check (attempt_count >= 0),
  -- Durable reference into Supabase Storage (see
  -- 20260819120200_ai_friend_storage_bucket.sql), populated once status = 'complete'.
  storage_bucket text,
  storage_path text,
  error_message text,
  requested_at timestamptz not null default now(),
  completed_at timestamptz
);

comment on table ai_friend_images is
  'Course-specific: Build an AI Friend generated-image status + durable storage reference, one row per session.';

alter table public.ai_friend_sessions enable row level security;
alter table public.ai_friend_messages enable row level security;
alter table public.ai_friend_images enable row level security;

-- Deliberately no policies for anon/authenticated on any of the three
-- tables above: with RLS enabled and no matching policy, all access is
-- denied by default for those roles. Only service_role (server-side only)
-- can read or write here.
