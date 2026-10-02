-- ============================================================
-- 011_ENABLE_RLS.SQL: BẬT LẠI RLS VÀ REVOKE QUYỀN ANON
-- ============================================================

-- 1. Revoke tất cả quyền của role anon trên các bảng
revoke all on all tables in schema public from anon;

-- 2. Bật lại RLS cho TẤT CẢ các bảng
alter table public.profiles enable row level security;
alter table public.vocabulary enable row level security;
alter table public.shadowing_sessions enable row level security;
alter table public.writing_attempts enable row level security;
alter table public.speaking_attempts enable row level security;
alter table public.reading_tests enable row level security;
alter table public.listening_tests enable row level security;
alter table public.pronunciation_sessions enable row level security;
alter table public.examiner_sessions enable row level security;
alter table public.user_stats enable row level security;
alter table public.daily_activities enable row level security;
alter table public.diagnostic_tests enable row level security;

-- 3. Tạo lại chính sách (Policies) - User chỉ được truy cập dữ liệu của mình
create policy "Users can CRUD own profiles" on public.profiles for all using (id = requesting_user_id());
create policy "Users can CRUD own vocabulary" on public.vocabulary for all using (user_id = requesting_user_id());
create policy "Users can CRUD own shadowing sessions" on public.shadowing_sessions for all using (user_id = requesting_user_id());
create policy "Users can CRUD own writing attempts" on public.writing_attempts for all using (user_id = requesting_user_id());
create policy "Users can CRUD own speaking attempts" on public.speaking_attempts for all using (user_id = requesting_user_id());
create policy "Users can CRUD own reading tests" on public.reading_tests for all using (user_id = requesting_user_id());
create policy "Users can CRUD own listening tests" on public.listening_tests for all using (user_id = requesting_user_id());
create policy "Users can CRUD own pronunciation sessions" on public.pronunciation_sessions for all using (user_id = requesting_user_id());
create policy "Users can CRUD own examiner sessions" on public.examiner_sessions for all using (user_id = requesting_user_id());
create policy "Users can CRUD own user stats" on public.user_stats for all using (user_id = requesting_user_id());
create policy "Users can CRUD own daily activities" on public.daily_activities for all using (user_id = requesting_user_id());
create policy "Users can CRUD own diagnostic tests" on public.diagnostic_tests for all using (user_id = requesting_user_id());
