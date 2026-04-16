-- Video share tokens: one token per player per notification send
-- Public access only via service-role edge function; no direct table RLS needed.

CREATE TABLE IF NOT EXISTS public.video_share_tokens (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  token           UUID        NOT NULL UNIQUE DEFAULT gen_random_uuid(),
  video_id        UUID        NOT NULL REFERENCES public.coach_videos(id) ON DELETE CASCADE,
  coach_player_id UUID        REFERENCES public.coach_players(id) ON DELETE SET NULL,
  player_name     TEXT,
  expires_at      TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '90 days'),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS: admins can do everything; players can read tokens tied to their email
ALTER TABLE public.video_share_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage share tokens"
  ON public.video_share_tokens FOR ALL
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Logged-in players can read their own share tokens (to build their video library)
CREATE POLICY "Players can read own share tokens"
  ON public.video_share_tokens FOR SELECT
  USING (
    coach_player_id IN (
      SELECT id FROM public.coach_players WHERE email = auth.email()
    )
  );

CREATE INDEX IF NOT EXISTS vst_token_idx    ON public.video_share_tokens (token);
CREATE INDEX IF NOT EXISTS vst_video_idx    ON public.video_share_tokens (video_id);
CREATE INDEX IF NOT EXISTS vst_expires_idx  ON public.video_share_tokens (expires_at);
