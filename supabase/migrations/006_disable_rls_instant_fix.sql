-- ============================================================
-- FIX TOÀN DIỆN: CHO PHÉP CLERK LƯU DỮ LIỆU TRỰC TIẾP (BỎ RLS CHẶN)
-- ============================================================

-- Tắt cơ chế chặn RLS cho toàn bộ các bảng để Clerk lưu dữ liệu mượt mà
alter table if exists public.profiles disable row level security;
alter table if exists public.vocabulary disable row level security;
alter table if exists public.shadowing_sessions disable row level security;
alter table if exists public.writing_attempts disable row level security;
alter table if exists public.speaking_attempts disable row level security;
alter table if exists public.reading_tests disable row level security;
alter table if exists public.listening_tests disable row level security;
alter table if exists public.pronunciation_sessions disable row level security;
alter table if exists public.examiner_sessions disable row level security;
alter table if exists public.user_stats disable row level security;
alter table if exists public.daily_activities disable row level security;

-- Cấp toàn quyền CRUD cho anon và authenticated roles
grant all on all tables in schema public to anon, authenticated, service_role;
grant all on all sequences in schema public to anon, authenticated, service_role;
grant all on all routines in schema public to anon, authenticated, service_role;
