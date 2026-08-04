-- ============================================================
-- Fix Clerk Authentication RLS Policies (String user ID)
-- ============================================================

-- Hàm lấy ID người dùng từ Clerk JWT (dạng chuỗi 'user_2...')
create or replace function requesting_user_id()
returns text
language sql stable
as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::text;
$$;

-- 1. Fix Profiles
drop policy if exists "Users can view own profile" on public.profiles;
drop policy if exists "Users can insert own profile" on public.profiles;
drop policy if exists "Users can update own profile" on public.profiles;

create policy "Users can view own profile" on public.profiles for select using (id = requesting_user_id());
create policy "Users can insert own profile" on public.profiles for insert with check (id = requesting_user_id());
create policy "Users can update own profile" on public.profiles for update using (id = requesting_user_id());

-- 2. Fix Vocabulary
drop policy if exists "Users can CRUD own vocabulary" on public.vocabulary;
create policy "Users can CRUD own vocabulary" on public.vocabulary for all 
using (user_id = requesting_user_id()) with check (user_id = requesting_user_id());

-- 3. Fix Shadowing
drop policy if exists "Users can CRUD own shadowing sessions" on public.shadowing_sessions;
create policy "Users can CRUD own shadowing sessions" on public.shadowing_sessions for all 
using (user_id = requesting_user_id()) with check (user_id = requesting_user_id());

-- 4. Fix Writing
drop policy if exists "Users can CRUD own writing attempts" on public.writing_attempts;
create policy "Users can CRUD own writing attempts" on public.writing_attempts for all 
using (user_id = requesting_user_id()) with check (user_id = requesting_user_id());

-- 5. Fix Speaking
drop policy if exists "Users can CRUD own speaking attempts" on public.speaking_attempts;
create policy "Users can CRUD own speaking attempts" on public.speaking_attempts for all 
using (user_id = requesting_user_id()) with check (user_id = requesting_user_id());

-- 6. Fix Reading
drop policy if exists "Users can CRUD own reading tests" on public.reading_tests;
create policy "Users can CRUD own reading tests" on public.reading_tests for all 
using (user_id = requesting_user_id()) with check (user_id = requesting_user_id());

-- 7. Fix Listening
drop policy if exists "Users can CRUD own listening tests" on public.listening_tests;
create policy "Users can CRUD own listening tests" on public.listening_tests for all 
using (user_id = requesting_user_id()) with check (user_id = requesting_user_id());

-- 8. Fix Pronunciation & Examiner (từ migration 002)
drop policy if exists "Users can CRUD own pronunciation sessions" on public.pronunciation_sessions;
create policy "Users can CRUD own pronunciation sessions" on public.pronunciation_sessions for all 
using (user_id = requesting_user_id()) with check (user_id = requesting_user_id());

drop policy if exists "Users can CRUD own examiner sessions" on public.examiner_sessions;
create policy "Users can CRUD own examiner sessions" on public.examiner_sessions for all 
using (user_id = requesting_user_id()) with check (user_id = requesting_user_id());

-- 9. Fix Gamification (từ migration 003)
drop policy if exists "Users can CRUD own stats" on public.user_stats;
create policy "Users can CRUD own stats" on public.user_stats for all 
using (user_id = requesting_user_id()) with check (user_id = requesting_user_id());

drop policy if exists "Users can CRUD own activities" on public.daily_activities;
create policy "Users can CRUD own activities" on public.daily_activities for all 
using (user_id = requesting_user_id()) with check (user_id = requesting_user_id());
