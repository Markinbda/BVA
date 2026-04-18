-- Add event format selection for player past history entries

ALTER TABLE public.player_past_history
  ADD COLUMN IF NOT EXISTS event_format TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'player_past_history_event_format_chk'
  ) THEN
    ALTER TABLE public.player_past_history
      ADD CONSTRAINT player_past_history_event_format_chk
      CHECK (event_format IS NULL OR event_format IN ('Indoor', 'Beach'));
  END IF;
END $$;
