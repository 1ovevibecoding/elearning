-- ============================================================
-- 013_FIX_RLS.SQL: Robust RLS & Atomic AI Quota RPC
-- ============================================================

-- 1. Helper function for Clerk JWT subject
create or replace function requesting_user_id()
returns text
language sql stable
as $$
  select (auth.jwt() ->> 'sub')::text;
$$;

-- 2. Clean up and create policies for all public tables
-- Drop all possible old policy names from migration 005, 011, etc.
do $$
declare
  t text;
  p text;
begin
  for t in select tablename from pg_tables where schemaname = 'public' and tablename != 'ai_usage' loop
    for p in select policyname from pg_policies where schemaname = 'public' and tablename = t loop
      execute format('drop policy if exists %I on public.%I', p, t);
    end loop;
    execute format('alter table public.%I enable row level security', t);
    execute format('create policy "own rows" on public.%I for all using (user_id = requesting_user_id() or id = requesting_user_id()) with check (user_id = requesting_user_id() or id = requesting_user_id())', t, t);
  end loop;
end
$$;

-- 3. ai_usage table: RLS enabled, NO policies (service role only), revoke all from anon, authenticated
create table if not exists public.ai_usage (
  user_id text primary key,
  request_count int default 0,
  last_request_at timestamptz default now()
);

alter table public.ai_usage enable row level security;
do $$
declare
  p text;
begin
  for p in select policyname from pg_policies where schemaname = 'public' and tablename = 'ai_usage' loop
    execute format('drop policy if exists %I on public.ai_usage', p);
  end loop;
end
$$;

revoke all on public.ai_usage from anon, authenticated;

-- Default privileges
alter default privileges in schema public revoke all on tables from anon;

-- 4. Atomic consume_ai_quota function (resets after 1 hour)
create or replace function consume_ai_quota(p_user text, p_limit int default 30)
returns boolean
language plpgsql
security definer
as $$
declare
  v_count int;
  v_last timestamptz;
  v_now timestamptz := now();
begin
  select request_count, last_request_at into v_count, v_last
  from public.ai_usage
  where user_id = p_user
  for update;

  if not found then
    insert into public.ai_usage (user_id, request_count, last_request_at)
    values (p_user, 1, v_now);
    return true;
  end if;

  if v_last < v_now - interval '1 hour' then
    update public.ai_usage
    set request_count = 1, last_request_at = v_now
    where user_id = p_user;
    return true;
  end if;

  if v_count >= p_limit then
    return false;
  end if;

  update public.ai_usage
  set request_count = request_count + 1
  where user_id = p_user;
  return true;
end;
$$;
