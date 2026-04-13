-- =============================================
-- LIVE STREAMS TABLE
-- =============================================

CREATE TABLE public.live_streams (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id                 UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title                    TEXT NOT NULL,
  cloudflare_live_input_id TEXT NOT NULL,
  cloudflare_playback_url  TEXT NOT NULL,
  rtmps_url                TEXT,
  rtmps_stream_key         TEXT,
  srt_url                  TEXT,
  srt_stream_id            TEXT,
  is_live                  BOOLEAN NOT NULL DEFAULT true,
  ended_at                 TIMESTAMPTZ,
  recorded_video_uid       TEXT,
  created_at               TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.live_streams ENABLE ROW LEVEL SECURITY;

-- Coaches can read/manage their own streams
CREATE POLICY "Coaches can manage own live streams"
  ON public.live_streams FOR ALL
  USING (auth.uid() = coach_id)
  WITH CHECK (auth.uid() = coach_id);

-- Admins can manage all streams
CREATE POLICY "Admins can manage all live streams"
  ON public.live_streams FOR ALL
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Public can read is_live streams (for homepage viewer)
CREATE POLICY "Public can view live streams"
  ON public.live_streams FOR SELECT
  USING (is_live = true);

-- Indexes
CREATE INDEX live_streams_coach_id_idx ON public.live_streams (coach_id);
CREATE INDEX live_streams_is_live_idx  ON public.live_streams (is_live) WHERE is_live = true;
