-- youtube_playlists: synced from the BVA YouTube channel
-- Used to populate playlist-based category tags in the Coach/Admin video portals

CREATE TABLE IF NOT EXISTS youtube_playlists (
  id                  uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  youtube_playlist_id text        UNIQUE NOT NULL,
  title               text        NOT NULL,
  video_count         integer     DEFAULT 0,
  synced_at           timestamptz DEFAULT now(),
  created_at          timestamptz DEFAULT now()
);

ALTER TABLE youtube_playlists ENABLE ROW LEVEL SECURITY;

-- Any authenticated user can read playlists (for category dropdown)
CREATE POLICY "Authenticated users can read youtube_playlists"
  ON youtube_playlists FOR SELECT
  TO authenticated
  USING (true);

-- Service role only for writes (done via edge function with service key)
CREATE POLICY "Service role can manage youtube_playlists"
  ON youtube_playlists FOR ALL
  TO service_role
  USING (true);
