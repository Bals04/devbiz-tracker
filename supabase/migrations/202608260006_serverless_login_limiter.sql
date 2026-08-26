-- Shared login rate limiting.
--
-- The original limiter kept attempt counts in a JavaScript Map. That works for
-- one long-lived process, but on Vercel every serverless instance has its own
-- memory: counters reset on cold start and N concurrent instances each grant a
-- full allowance. Against a numeric access code that is not real protection, so
-- the state moves into Postgres where every instance shares it.

create table if not exists public.login_attempts (
  ip text primary key,
  attempt_count integer not null default 0 check (attempt_count >= 0),
  window_started_at timestamptz not null default now()
);

-- Only the service-role key (which bypasses RLS) may read or write this table.
-- RLS on with no policies means anon and authenticated get nothing.
alter table public.login_attempts enable row level security;

create index if not exists login_attempts_window_idx
  on public.login_attempts(window_started_at);

-- Counts one attempt and reports whether it is allowed.
--
-- The insert-on-conflict is a single statement, so concurrent requests cannot
-- both read the same stale count and slip past the cap. Returning the count
-- after the update is what makes the check atomic.
create or replace function public.register_login_attempt(
  p_ip text,
  p_window_seconds integer,
  p_max_attempts integer
)
returns table (allowed boolean, attempts integer)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_count integer;
begin
  insert into public.login_attempts as la (ip, attempt_count, window_started_at)
  values (p_ip, 1, now())
  on conflict (ip) do update
    set attempt_count = case
          when now() - la.window_started_at > make_interval(secs => p_window_seconds) then 1
          else la.attempt_count + 1
        end,
        window_started_at = case
          when now() - la.window_started_at > make_interval(secs => p_window_seconds) then now()
          else la.window_started_at
        end
  returning la.attempt_count into v_count;

  return query select v_count <= p_max_attempts, v_count;
end;
$$;

revoke all on function public.register_login_attempt(text, integer, integer)
  from public, anon, authenticated;

-- Housekeeping: rows outside the window carry no meaning. Safe to run anytime.
create or replace function public.prune_login_attempts(p_older_than_seconds integer default 86400)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_deleted integer;
begin
  delete from public.login_attempts
  where window_started_at < now() - make_interval(secs => p_older_than_seconds);
  get diagnostics v_deleted = row_count;
  return v_deleted;
end;
$$;

revoke all on function public.prune_login_attempts(integer) from public, anon, authenticated;
