-- =============================================
-- LIVE STREAM PASSKEY
-- Each stream gets an auto-generated 6-char
-- passkey that viewers must enter to watch.
-- =============================================

-- Add passkey column (DEFAULT fills existing rows too in PostgreSQL)
ALTER TABLE public.live_streams
  ADD COLUMN IF NOT EXISTS passkey TEXT NOT NULL
    DEFAULT UPPER(SUBSTRING(ENCODE(GEN_RANDOM_BYTES(3), 'hex'), 1, 6));

-- Regenerate any rows that ended up with an empty/null passkey
UPDATE public.live_streams
  SET passkey = UPPER(SUBSTRING(ENCODE(GEN_RANDOM_BYTES(3), 'hex'), 1, 6))
  WHERE passkey IS NULL OR passkey = '';
