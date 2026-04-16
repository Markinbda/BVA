-- Mark whether a tokenized share was sent directly to a specific player.
ALTER TABLE public.video_share_tokens
  ADD COLUMN IF NOT EXISTS is_personal BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS vst_is_personal_idx
  ON public.video_share_tokens (is_personal);
