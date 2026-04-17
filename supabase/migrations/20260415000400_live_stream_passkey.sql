-- =============================================
-- LIVE STREAM PASSKEY
-- Each stream gets an auto-generated 6-char
-- passkey that viewers must enter to watch.
-- =============================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Add passkey column (DEFAULT fills existing rows too in PostgreSQL)
ALTER TABLE public.live_streams
  ADD COLUMN IF NOT EXISTS passkey TEXT NOT NULL
    DEFAULT UPPER(SUBSTRING(MD5(RANDOM()::TEXT || CLOCK_TIMESTAMP()::TEXT), 1, 6));

-- Regenerate any rows that ended up with an empty/null passkey
UPDATE public.live_streams
  SET passkey = UPPER(SUBSTRING(MD5(RANDOM()::TEXT || CLOCK_TIMESTAMP()::TEXT), 1, 6))
  WHERE passkey IS NULL OR passkey = '';
