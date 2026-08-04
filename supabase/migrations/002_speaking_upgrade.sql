-- ============================================================
-- Migration 002 — Pronunciation & AI Examiner Sessions
-- ============================================================

-- ─── Pronunciation Sessions (Shadowing + Phoneme Feedback) ──
create table if not exists public.pronunciation_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id text not null references public.profiles(id) on delete cascade,
  session_type text not null default 'shadowing', -- 'shadowing' | 'examiner'
  expected_text text not null,
  actual_transcript text not null,
  word_analysis jsonb default '[]',  -- [{word, expected, status, reason}]
  overall_score int default 0,       -- 0-100
  ai_feedback text default '',
  audio_duration_ms int default 0,
  created_at timestamptz default now()
);

alter table public.pronunciation_sessions enable row level security;

create policy "Users can CRUD own pronunciation sessions"
  on public.pronunciation_sessions for all
  using (user_id = auth.uid()::text)
  with check (user_id = auth.uid()::text);

create index idx_pronun_user on public.pronunciation_sessions(user_id);
create index idx_pronun_type on public.pronunciation_sessions(user_id, session_type);

-- ─── AI Examiner Conversations ───────────────────────────────
create table if not exists public.examiner_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id text not null references public.profiles(id) on delete cascade,
  part text not null,                -- 'Part 1' | 'Part 2' | 'Part 3'
  conversation jsonb default '[]',  -- [{role:'examiner'|'candidate', text, feedback?}]
  final_band real,
  final_feedback text default '',
  created_at timestamptz default now()
);

alter table public.examiner_sessions enable row level security;

create policy "Users can CRUD own examiner sessions"
  on public.examiner_sessions for all
  using (user_id = auth.uid()::text)
  with check (user_id = auth.uid()::text);

create index idx_examiner_user on public.examiner_sessions(user_id);
