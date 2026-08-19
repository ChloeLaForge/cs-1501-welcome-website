-- Build an AI Friend: server-side atomic $40 spending-cap accounting.
--
-- *** LOCAL FILE ONLY. DO NOT APPLY. Pending instructor review. ***
--
-- Purpose: give the backend (server/aiServer.ts, via server/budgetLedger.ts)
-- an authoritative, concurrency-safe place to reserve estimated cost BEFORE
-- an OpenAI request and reconcile it against actual cost AFTER, so two
-- simultaneous requests can never both push total spend past the ceiling.
-- The $40.00 ceiling value itself lives in application code
-- (server/budgetConfig.ts), not in this schema -- these functions accept it
-- as a parameter so the single source of truth stays in one named constant.
--
-- Isolation: course/feature-specific naming (course_ai_budget_* prefix).
-- No unrelated table, policy, or extension is touched.

do $$
begin
  if to_regclass('public.course_ai_budget_ledger') is not null then
    raise exception 'AI Friend migration collision: public.course_ai_budget_ledger already exists; refusing to adopt or alter it';
  end if;
  if to_regprocedure('public.reserve_course_ai_budget(text,text,uuid,numeric,numeric)') is not null
     or to_regprocedure('public.finalize_course_ai_budget(text,numeric)') is not null
     or to_regprocedure('public.release_course_ai_budget(text)') is not null
     or to_regprocedure('public.get_course_ai_budget_status(numeric)') is not null then
    raise exception 'AI Friend migration collision: one or more course budget functions already exist; refusing to replace them';
  end if;
end
$$;

create table public.course_ai_budget_ledger (
  id uuid primary key default gen_random_uuid(),
  -- Idempotency key so a client retry (or an OpenAI-side retry) can never
  -- reserve budget twice for the same unit of work. Convention (enforced by
    -- server/aiServer.ts, not by the database):
    -- "<session_id>:chat:<turn>:<attempt_uuid>" or
    -- "<session_id>:image:<attempt_number>".
  request_id text not null unique,
  request_type text not null check (request_type in ('chat', 'image')),
  -- Not a foreign key to ai_friend_sessions on purpose: budget accounting
  -- must keep working (and stay auditable) even if session persistence
  -- ever fails independently -- the two concerns are deliberately decoupled.
  session_id uuid,
  reserved_cost_usd numeric(10, 4) not null check (reserved_cost_usd >= 0),
  -- Filled in once the request resolves (see finalize_course_ai_budget).
  -- Until then, reserved_cost_usd is what counts against the ceiling.
  actual_cost_usd numeric(10, 4) check (actual_cost_usd >= 0),
  -- reserved: counted against the ceiling, request in flight.
  -- finalized: request succeeded; actual_cost_usd now counts instead.
  -- released: request failed or was denied; no longer counted at all.
  status text not null default 'reserved' check (status in ('reserved', 'finalized', 'released')),
  created_at timestamptz not null default now(),
  finalized_at timestamptz
);

comment on table course_ai_budget_ledger is
  'Course-specific: atomic reservation/reconciliation ledger backing the $40 Build an AI Friend OpenAI spending ceiling.';

create index course_ai_budget_ledger_status_idx
  on public.course_ai_budget_ledger (status);

-- Serializes all budget decisions on one advisory lock. This is a small
-- public course demo (single-digit requests/minute at most), so a single
-- global lock is simple, correct, and never a real bottleneck -- the
-- alternative (row-level locking over an aggregate) is harder to reason
-- about for the same benefit here.
--
-- Reserves p_reserved_cost_usd against the ceiling for one unit of work, or
-- refuses if doing so could push committed spend (already-reserved +
-- already-finalized) over p_ceiling_usd. Replays of the same request_id are
-- idempotent: a request_id already 'reserved' or 'finalized' returns
-- allowed = true without reserving twice; one previously 'released' (a
-- prior attempt that failed) is re-evaluated against current budget and,
-- if it now fits, re-reserved.
create function public.reserve_course_ai_budget(
  p_request_id text,
  p_request_type text,
  p_session_id uuid,
  p_reserved_cost_usd numeric,
  p_ceiling_usd numeric
) returns table(decision text, committed_usd numeric)
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  v_existing public.course_ai_budget_ledger%rowtype;
  v_exists boolean := false;
  v_committed numeric;
begin
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('course_ai_friend_budget', 0));

  select * into v_existing from public.course_ai_budget_ledger where request_id = p_request_id;
  v_exists := found;

  if v_exists and v_existing.status in ('reserved', 'finalized') then
    select coalesce(sum(
      case
        when status = 'finalized' then actual_cost_usd
        when status = 'reserved' then reserved_cost_usd
        else 0
      end
    ), 0) into v_committed from public.course_ai_budget_ledger;
    return query select case when v_existing.status = 'finalized' then 'finalized' else 'in_flight' end, v_committed;
    return;
  end if;

  select coalesce(sum(
    case
      when status = 'finalized' then actual_cost_usd
      when status = 'reserved' then reserved_cost_usd
      else 0
    end
  ), 0) into v_committed from public.course_ai_budget_ledger
  where request_id <> p_request_id;

  if v_committed + p_reserved_cost_usd > p_ceiling_usd then
    return query select 'denied'::text, v_committed;
    return;
  end if;

  if v_exists then
    -- Re-reserving a previously released request_id.
    update public.course_ai_budget_ledger
      set status = 'reserved',
          reserved_cost_usd = p_reserved_cost_usd,
          actual_cost_usd = null,
          finalized_at = null,
          created_at = now()
      where request_id = p_request_id;
  else
    insert into public.course_ai_budget_ledger (request_id, request_type, session_id, reserved_cost_usd, status)
      values (p_request_id, p_request_type, p_session_id, p_reserved_cost_usd, 'reserved');
  end if;

  return query select 'acquired'::text, v_committed + p_reserved_cost_usd;
end;
$$;

-- Reconciles a reservation against the real cost of the request that just
-- succeeded. No-op (does not raise) if request_id is unknown or not
-- currently 'reserved', so a duplicate/late finalize call is always safe.
create function public.finalize_course_ai_budget(
  p_request_id text,
  p_actual_cost_usd numeric
) returns void
language plpgsql
security definer
set search_path = pg_catalog
as $$
begin
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('course_ai_friend_budget', 0));

  update public.course_ai_budget_ledger
    set status = 'finalized',
        actual_cost_usd = p_actual_cost_usd,
        finalized_at = now()
    where request_id = p_request_id
      and status = 'reserved';
end;
$$;

-- Releases a reservation for a request that failed or was never sent to
-- OpenAI, so that reserved amount stops counting against the ceiling.
-- Also a safe no-op if request_id is unknown or not currently 'reserved'.
create function public.release_course_ai_budget(
  p_request_id text
) returns void
language plpgsql
security definer
set search_path = pg_catalog
as $$
begin
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('course_ai_friend_budget', 0));

  update public.course_ai_budget_ledger
    set status = 'released'
    where request_id = p_request_id
      and status = 'reserved';
end;
$$;

-- Read-only status check backing GET /api/ai-friend/availability. Returns
-- committed spend and remaining headroom under p_ceiling_usd; the backend
-- reduces this to a plain available: true/false boolean before it ever
-- reaches the browser (see server/budgetLedger.ts) -- the frontend never
-- sees these numbers.
create function public.get_course_ai_budget_status(
  p_ceiling_usd numeric
) returns table(committed_usd numeric, remaining_usd numeric, ceiling_usd numeric)
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  v_committed numeric;
begin
  select coalesce(sum(
    case
      when status = 'finalized' then actual_cost_usd
      when status = 'reserved' then reserved_cost_usd
      else 0
    end
  ), 0) into v_committed from public.course_ai_budget_ledger;

  return query select v_committed, greatest(p_ceiling_usd - v_committed, 0), p_ceiling_usd;
end;
$$;

-- By default PostgreSQL grants EXECUTE on newly created functions to
-- PUBLIC, and Supabase's anon/authenticated roles inherit from PUBLIC --
-- meaning without the revokes below, these functions would otherwise be
-- callable directly from the browser as RPC endpoints. That must never
-- happen: only the trusted backend (via service_role, which bypasses these
-- grants) may touch course-demo spend accounting.
revoke execute on function public.reserve_course_ai_budget(text, text, uuid, numeric, numeric) from public, anon, authenticated;
revoke execute on function public.finalize_course_ai_budget(text, numeric) from public, anon, authenticated;
revoke execute on function public.release_course_ai_budget(text) from public, anon, authenticated;
revoke execute on function public.get_course_ai_budget_status(numeric) from public, anon, authenticated;

-- Explicit, not relied-on-by-default: confirm service_role can still call
-- these after the revokes above (Supabase projects normally grant
-- service_role broad access already; this is a defensive belt-and-suspenders
-- statement, safe to keep even if redundant with existing project grants).
grant execute on function public.reserve_course_ai_budget(text, text, uuid, numeric, numeric) to service_role;
grant execute on function public.finalize_course_ai_budget(text, numeric) to service_role;
grant execute on function public.release_course_ai_budget(text) to service_role;
grant execute on function public.get_course_ai_budget_status(numeric) to service_role;

alter table public.course_ai_budget_ledger enable row level security;
-- No policies: with RLS enabled and none defined, anon/authenticated have
-- zero direct table access. All access goes through the SECURITY DEFINER
-- functions above (service_role only) or through service_role directly.
