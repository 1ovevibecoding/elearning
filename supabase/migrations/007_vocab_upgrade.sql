-- ============================================================
-- 007: Vocabulary Upgrade — Word Family, Study Day, Active/Passive AI
-- ============================================================

-- Add word_family column: stores array of { word, pos, pos_vi, meaning_en, meaning_vi, is_translated }
ALTER TABLE public.vocabulary
  ADD COLUMN IF NOT EXISTS word_family jsonb DEFAULT '[]';

-- Add study_date: the calendar date the word was first added (for Day-grouping)
ALTER TABLE public.vocabulary
  ADD COLUMN IF NOT EXISTS study_date date DEFAULT CURRENT_DATE;

-- Add vocab_type_reason: AI explanation of why this word is active or passive
ALTER TABLE public.vocabulary
  ADD COLUMN IF NOT EXISTS vocab_type_reason text DEFAULT '';

-- Backfill study_date from created_at for existing rows
UPDATE public.vocabulary
  SET study_date = created_at::date
  WHERE study_date IS NULL;
