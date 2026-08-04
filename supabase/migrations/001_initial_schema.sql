-- ============================================================
-- Bàn Học IELTS — Database Schema
-- Supabase PostgreSQL with Row-Level Security
-- ============================================================

-- ─── Profiles ────────────────────────────────────────────────
create table if not exists public.profiles (
  id text primary key,                -- Clerk user ID
  display_name text,
  target_band text default 'Band 6.0–6.5',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.profiles enable row level security;

create policy "Users can view own profile"
  on public.profiles for select
  using (id = auth.uid()::text);

create policy "Users can insert own profile"
  on public.profiles for insert
  with check (id = auth.uid()::text);

create policy "Users can update own profile"
  on public.profiles for update
  using (id = auth.uid()::text);

-- ─── Vocabulary ──────────────────────────────────────────────
create table if not exists public.vocabulary (
  id uuid primary key default gen_random_uuid(),
  user_id text not null references public.profiles(id) on delete cascade,
  word text not null,
  pos text not null default 'Danh từ',
  status text not null default 'passive',
  definition_en text default '',
  example_en text default '',
  synonyms text[] default '{}',
  srs_level int default 0,
  due_date timestamptz,
  last_feedback jsonb,
  created_at timestamptz default now()
);

alter table public.vocabulary enable row level security;

create policy "Users can CRUD own vocabulary"
  on public.vocabulary for all
  using (user_id = auth.uid()::text)
  with check (user_id = auth.uid()::text);

create index idx_vocab_user on public.vocabulary(user_id);
create index idx_vocab_due on public.vocabulary(user_id, due_date);

-- ─── Shadowing Sessions ─────────────────────────────────────
create table if not exists public.shadowing_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id text not null references public.profiles(id) on delete cascade,
  topic text not null,
  level text not null,
  script text not null,
  accuracy int default 0,
  user_transcript text default '',
  created_at timestamptz default now()
);

alter table public.shadowing_sessions enable row level security;

create policy "Users can CRUD own shadowing sessions"
  on public.shadowing_sessions for all
  using (user_id = auth.uid()::text)
  with check (user_id = auth.uid()::text);

create index idx_shadow_user on public.shadowing_sessions(user_id);

-- ─── Writing Attempts ───────────────────────────────────────
create table if not exists public.writing_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id text not null references public.profiles(id) on delete cascade,
  task_type text not null,
  prompt text not null,
  essay text not null,
  band_overall real,
  task_achievement real,
  coherence_cohesion real,
  lexical_resource real,
  grammar real,
  feedback text default '',
  top_errors text[] default '{}',
  created_at timestamptz default now()
);

alter table public.writing_attempts enable row level security;

create policy "Users can CRUD own writing attempts"
  on public.writing_attempts for all
  using (user_id = auth.uid()::text)
  with check (user_id = auth.uid()::text);

create index idx_writing_user on public.writing_attempts(user_id);

-- ─── Speaking Attempts ──────────────────────────────────────
create table if not exists public.speaking_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id text not null references public.profiles(id) on delete cascade,
  part text not null,
  question text not null,
  answer text not null,
  band_overall real,
  fluency_coherence real,
  lexical_resource real,
  grammar real,
  feedback text default '',
  created_at timestamptz default now()
);

alter table public.speaking_attempts enable row level security;

create policy "Users can CRUD own speaking attempts"
  on public.speaking_attempts for all
  using (user_id = auth.uid()::text)
  with check (user_id = auth.uid()::text);

create index idx_speaking_user on public.speaking_attempts(user_id);

-- ─── Reading Tests ──────────────────────────────────────────
create table if not exists public.reading_tests (
  id uuid primary key default gen_random_uuid(),
  user_id text not null references public.profiles(id) on delete cascade,
  passage_title text not null,
  passage_text text not null,
  questions jsonb not null default '[]',
  user_answers jsonb default '[]',
  score int default 0,
  total_questions int default 0,
  time_spent_seconds int default 0,
  created_at timestamptz default now()
);

alter table public.reading_tests enable row level security;

create policy "Users can CRUD own reading tests"
  on public.reading_tests for all
  using (user_id = auth.uid()::text)
  with check (user_id = auth.uid()::text);

create index idx_reading_user on public.reading_tests(user_id);

-- ─── Listening Tests ────────────────────────────────────────
create table if not exists public.listening_tests (
  id uuid primary key default gen_random_uuid(),
  user_id text not null references public.profiles(id) on delete cascade,
  audio_topic text not null,
  transcript text not null,
  questions jsonb not null default '[]',
  user_answers jsonb default '[]',
  score int default 0,
  total_questions int default 0,
  time_spent_seconds int default 0,
  created_at timestamptz default now()
);

alter table public.listening_tests enable row level security;

create policy "Users can CRUD own listening tests"
  on public.listening_tests for all
  using (user_id = auth.uid()::text)
  with check (user_id = auth.uid()::text);

create index idx_listening_user on public.listening_tests(user_id);
