-- ============================================================
-- 009: Add IPA phonetic transcription column to vocabulary
-- ============================================================

ALTER TABLE public.vocabulary
  ADD COLUMN IF NOT EXISTS ipa text DEFAULT '';
