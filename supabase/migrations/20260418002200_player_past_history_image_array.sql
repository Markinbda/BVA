-- Allow up to 4 event images per player past history entry, with backfill from legacy single image column

ALTER TABLE public.player_past_history
  ADD COLUMN IF NOT EXISTS event_image_urls TEXT[];

-- Backfill legacy single-image values into the new array field where needed
UPDATE public.player_past_history
SET event_image_urls = CASE
  WHEN event_image_urls IS NULL OR cardinality(event_image_urls) = 0
    THEN CASE WHEN event_image_url IS NOT NULL THEN ARRAY[event_image_url]::TEXT[] ELSE '{}'::TEXT[] END
  ELSE event_image_urls
END;

UPDATE public.player_past_history
SET event_image_urls = '{}'::TEXT[]
WHERE event_image_urls IS NULL;

ALTER TABLE public.player_past_history
  ALTER COLUMN event_image_urls SET DEFAULT '{}'::TEXT[];

ALTER TABLE public.player_past_history
  ALTER COLUMN event_image_urls SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'player_past_history_event_image_urls_max4_chk'
  ) THEN
    ALTER TABLE public.player_past_history
      ADD CONSTRAINT player_past_history_event_image_urls_max4_chk
      CHECK (cardinality(event_image_urls) <= 4);
  END IF;
END $$;
