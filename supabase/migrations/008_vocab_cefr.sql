-- ============================================================
-- 008: Add CEFR level column to vocabulary table
-- ============================================================

ALTER TABLE public.vocabulary
  ADD COLUMN IF NOT EXISTS cefr_level text DEFAULT 'B2';
