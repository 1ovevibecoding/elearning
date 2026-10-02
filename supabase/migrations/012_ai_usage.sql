-- ============================================================
-- 012_AI_USAGE.SQL: TẠO BẢNG AI_USAGE ĐỂ RATE LIMIT
-- ============================================================

CREATE TABLE IF NOT EXISTS public.ai_usage (
  user_id TEXT PRIMARY KEY,
  request_count INTEGER DEFAULT 0,
  last_request_at TIMESTAMPTZ DEFAULT now()
);

-- Reset count every hour or handle via logic
-- For simplicity, just use this table to track.
-- A better way is: `request_count` increases,
-- and a background worker resets it,
-- but here we just check if (count > 30 AND last_request_at > now() - interval '1 hour')
