-- 010_diagnostic_tests.sql
-- Table to store Reading & Listening Diagnostic / Placement Test results

CREATE TABLE IF NOT EXISTS public.diagnostic_tests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  reading_score INTEGER NOT NULL DEFAULT 0,
  reading_total INTEGER NOT NULL DEFAULT 10,
  listening_score INTEGER NOT NULL DEFAULT 0,
  listening_total INTEGER NOT NULL DEFAULT 8,
  estimated_band NUMERIC(3,1) NOT NULL,
  reading_band NUMERIC(3,1) NOT NULL,
  listening_band NUMERIC(3,1) NOT NULL,
  cefr_level TEXT NOT NULL,
  strengths TEXT[] DEFAULT '{}',
  weaknesses TEXT[] DEFAULT '{}',
  study_roadmap JSONB DEFAULT '[]'::jsonb,
  raw_answers JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Index for fast user query
CREATE INDEX IF NOT EXISTS idx_diagnostic_tests_user ON public.diagnostic_tests (user_id, created_at DESC);

-- Disable RLS or allow all for simplicity in development
ALTER TABLE public.diagnostic_tests DISABLE ROW LEVEL SECURITY;
