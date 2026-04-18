-- Add optional event image support to player past history entries

ALTER TABLE public.player_past_history
  ADD COLUMN IF NOT EXISTS event_image_url TEXT;
