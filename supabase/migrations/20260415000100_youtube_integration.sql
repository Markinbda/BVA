-- =============================================
-- YOUTUBE INTEGRATION
-- Adds video_provider to coach_videos and
-- YouTube live stream fields to live_streams
-- =============================================

-- Allow storing YouTube video IDs alongside Cloudflare UIDs
ALTER TABLE public.coach_videos
  ADD COLUMN IF NOT EXISTS video_provider TEXT NOT NULL DEFAULT 'cloudflare'
    CHECK (video_provider IN ('cloudflare', 'youtube'));

-- Allow cloudflare-specific columns to be NULL for YouTube live streams
ALTER TABLE public.live_streams
  ALTER COLUMN cloudflare_live_input_id DROP NOT NULL;

ALTER TABLE public.live_streams
  ALTER COLUMN cloudflare_playback_url DROP NOT NULL;

-- Add YouTube live stream tracking columns
ALTER TABLE public.live_streams
  ADD COLUMN IF NOT EXISTS stream_provider TEXT NOT NULL DEFAULT 'cloudflare'
    CHECK (stream_provider IN ('cloudflare', 'youtube'));

ALTER TABLE public.live_streams
  ADD COLUMN IF NOT EXISTS youtube_broadcast_id TEXT;

ALTER TABLE public.live_streams
  ADD COLUMN IF NOT EXISTS youtube_stream_id TEXT;
