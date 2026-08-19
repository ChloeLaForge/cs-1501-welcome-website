-- Tell Me About You questionnaire, per 03-form-welcome-website.md.
--
-- No auth on this site: every website visitor connects as the Supabase
-- `anon` role. RLS is scoped so that role can only INSERT a response --
-- never read, update, or delete existing ones.

create extension if not exists "pgcrypto";

do $$
begin
  if to_regclass('public.course_questionnaire_responses') is not null then
    raise exception 'Course questionnaire migration collision: public.course_questionnaire_responses already exists; refusing to adopt or alter it';
  end if;
end
$$;

create table public.course_questionnaire_responses (
  id uuid primary key default gen_random_uuid(),
  first_name text not null check (char_length(first_name) between 1 and 80),
  last_initial text not null check (char_length(last_initial) = 1),
  coding_comfort text not null check (char_length(coding_comfort) between 1 and 120),
  ai_coding_experience text not null check (char_length(ai_coding_experience) between 1 and 160),
  build_interest text check (build_interest is null or char_length(build_interest) <= 2000),
  learning_interest text check (learning_interest is null or char_length(learning_interest) <= 2000),
  additional_context text check (additional_context is null or char_length(additional_context) <= 3000),
  created_at timestamptz not null default now()
);

alter table course_questionnaire_responses enable row level security;

create policy "anon can submit a response"
  on course_questionnaire_responses
  for insert
  to anon
  with check (true);

-- Deliberately no select/update/delete policies for anon or authenticated:
-- with RLS enabled and no matching policy, those actions are denied by
-- default. Only the service_role (server-side only, never in this repo's
-- frontend) can read submitted responses.
