-- ============================================================
-- Migration 003 — Gamification, SM-2 SRS, User Stats
-- ============================================================

-- ─── Thêm cột SM-2 vào vocabulary ──────────────────────────
alter table public.vocabulary
  add column if not exists ease_factor real default 2.5,
  add column if not exists interval_days int default 1,
  add column if not exists repetitions int default 0;

-- ─── User Stats (Streak, Target Band) ──────────────────────
create table if not exists public.user_stats (
  user_id text primary key references public.profiles(id) on delete cascade,
  current_streak int default 0,
  longest_streak int default 0,
  last_study_date date,
  target_band real default 7.0,
  exam_date date,
  daily_words_goal int default 10,
  updated_at timestamptz default now()
);

alter table public.user_stats enable row level security;
create policy "Users can CRUD own stats" on public.user_stats for all
  using (user_id = auth.uid()::text) with check (user_id = auth.uid()::text);

-- ─── Daily Activity Log ─────────────────────────────────────
create table if not exists public.daily_activities (
  id uuid primary key default gen_random_uuid(),
  user_id text not null references public.profiles(id) on delete cascade,
  activity_date date not null,
  words_studied int default 0,
  shadowing_done boolean default false,
  reading_done boolean default false,
  listening_done boolean default false,
  writing_done boolean default false,
  speaking_done boolean default false,
  total_xp int default 0,
  created_at timestamptz default now(),
  unique(user_id, activity_date)
);

alter table public.daily_activities enable row level security;
create policy "Users can CRUD own activities" on public.daily_activities for all
  using (user_id = auth.uid()::text) with check (user_id = auth.uid()::text);

create index idx_activities_user_date on public.daily_activities(user_id, activity_date desc);
