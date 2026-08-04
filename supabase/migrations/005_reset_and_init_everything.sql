-- ============================================================
-- FULL DATABASE RESET & INIT SCRIPT
-- ============================================================

-- 1. Xóa các bảng cũ nếu có để làm sạch hoàn toàn
drop table if exists public.daily_activities cascade;
drop table if exists public.user_stats cascade;
drop table if exists public.examiner_sessions cascade;
drop table if exists public.pronunciation_sessions cascade;
drop table if exists public.listening_tests cascade;
drop table if exists public.reading_tests cascade;
drop table if exists public.speaking_attempts cascade;
drop table if exists public.writing_attempts cascade;
drop table if exists public.shadowing_sessions cascade;
drop table if exists public.vocabulary cascade;
drop table if exists public.profiles cascade;

-- 2. Tạo hàm hỗ trợ Clerk Authentication (Trích xuất ID string thay vì UUID)
create or replace function requesting_user_id()
returns text
language sql stable
as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::text;
$$;

-- 3. Tạo bảng Profiles
create table public.profiles (
  id text primary key,                -- Clerk user ID
  display_name text,
  target_band text default 'Band 6.0–6.5',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
alter table public.profiles enable row level security;
create policy "Users can view own profile" on public.profiles for select using (id = requesting_user_id());
create policy "Users can insert own profile" on public.profiles for insert with check (id = requesting_user_id());
create policy "Users can update own profile" on public.profiles for update using (id = requesting_user_id());

-- 4. Tạo bảng Vocabulary
create table public.vocabulary (
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
  ease_factor real default 2.5,
  interval_days int default 1,
  repetitions int default 0,
  created_at timestamptz default now()
);
alter table public.vocabulary enable row level security;
create policy "Users can CRUD own vocabulary" on public.vocabulary for all using (user_id = requesting_user_id()) with check (user_id = requesting_user_id());

-- 5. Tạo bảng Shadowing
create table public.shadowing_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id text not null references public.profiles(id) on delete cascade,
  topic text not null,
  level text not null,
  transcript text not null,
  translation text not null,
  duration int default 60,
  created_at timestamptz default now()
);
alter table public.shadowing_sessions enable row level security;
create policy "Users can CRUD own shadowing sessions" on public.shadowing_sessions for all using (user_id = requesting_user_id()) with check (user_id = requesting_user_id());

-- 6. Tạo bảng Writing
create table public.writing_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id text not null references public.profiles(id) on delete cascade,
  task_type text not null,
  prompt text not null,
  essay_text text not null,
  score real,
  feedback jsonb,
  created_at timestamptz default now()
);
alter table public.writing_attempts enable row level security;
create policy "Users can CRUD own writing attempts" on public.writing_attempts for all using (user_id = requesting_user_id()) with check (user_id = requesting_user_id());

-- 7. Tạo bảng Speaking
create table public.speaking_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id text not null references public.profiles(id) on delete cascade,
  part text not null,
  prompt text not null,
  transcript text not null,
  audio_url text,
  score real,
  feedback jsonb,
  created_at timestamptz default now()
);
alter table public.speaking_attempts enable row level security;
create policy "Users can CRUD own speaking attempts" on public.speaking_attempts for all using (user_id = requesting_user_id()) with check (user_id = requesting_user_id());

-- 8. Tạo bảng Reading
create table public.reading_tests (
  id uuid primary key default gen_random_uuid(),
  user_id text not null references public.profiles(id) on delete cascade,
  passage_title text not null,
  passage_text text not null,
  questions jsonb not null,
  user_answers jsonb not null,
  score int not null,
  total_questions int not null,
  time_spent_seconds int default 0,
  created_at timestamptz default now()
);
alter table public.reading_tests enable row level security;
create policy "Users can CRUD own reading tests" on public.reading_tests for all using (user_id = requesting_user_id()) with check (user_id = requesting_user_id());

-- 9. Tạo bảng Listening
create table public.listening_tests (
  id uuid primary key default gen_random_uuid(),
  user_id text not null references public.profiles(id) on delete cascade,
  audio_topic text not null,
  transcript text not null,
  questions jsonb not null,
  user_answers jsonb not null,
  score int not null,
  total_questions int not null,
  created_at timestamptz default now()
);
alter table public.listening_tests enable row level security;
create policy "Users can CRUD own listening tests" on public.listening_tests for all using (user_id = requesting_user_id()) with check (user_id = requesting_user_id());

-- 10. Bảng Pronunciation Sessions
create table public.pronunciation_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id text not null references public.profiles(id) on delete cascade,
  session_type text not null default 'shadowing',
  expected_text text not null,
  actual_transcript text not null,
  word_analysis jsonb default '[]',
  overall_score int default 0,
  ai_feedback text default '',
  audio_duration_ms int default 0,
  created_at timestamptz default now()
);
alter table public.pronunciation_sessions enable row level security;
create policy "Users can CRUD own pronunciation sessions" on public.pronunciation_sessions for all using (user_id = requesting_user_id()) with check (user_id = requesting_user_id());

-- 11. Bảng Examiner Sessions
create table public.examiner_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id text not null references public.profiles(id) on delete cascade,
  part text not null,
  conversation jsonb default '[]',
  final_band real,
  final_feedback text default '',
  created_at timestamptz default now()
);
alter table public.examiner_sessions enable row level security;
create policy "Users can CRUD own examiner sessions" on public.examiner_sessions for all using (user_id = requesting_user_id()) with check (user_id = requesting_user_id());

-- 12. Bảng User Stats
create table public.user_stats (
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
create policy "Users can CRUD own stats" on public.user_stats for all using (user_id = requesting_user_id()) with check (user_id = requesting_user_id());

-- 13. Bảng Daily Activities
create table public.daily_activities (
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
create policy "Users can CRUD own activities" on public.daily_activities for all using (user_id = requesting_user_id()) with check (user_id = requesting_user_id());
