-- Coach video library (Cloudflare Stream)
CREATE TABLE IF NOT EXISTS coach_videos (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id        UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title           TEXT        NOT NULL,
  description     TEXT,
  video_uid       TEXT        NOT NULL,   -- Cloudflare Stream video UID
  team_ids        TEXT[]      NOT NULL DEFAULT '{}',
  categories      TEXT[]      NOT NULL DEFAULT '{}',  -- e.g. ["Match Footage","Practice"]
  visibility      TEXT        NOT NULL DEFAULT 'team'
                              CHECK (visibility IN ('private', 'team', 'all_coaches', 'public')),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE coach_videos ENABLE ROW LEVEL SECURITY;

-- Coaches can only read/write their own videos
CREATE POLICY "coach_videos_select" ON coach_videos
  FOR SELECT USING (auth.uid() = coach_id);

CREATE POLICY "coach_videos_insert" ON coach_videos
  FOR INSERT WITH CHECK (auth.uid() = coach_id);

CREATE POLICY "coach_videos_update" ON coach_videos
  FOR UPDATE USING (auth.uid() = coach_id);

CREATE POLICY "coach_videos_delete" ON coach_videos
  FOR DELETE USING (auth.uid() = coach_id);

-- Admins can see, create, update and delete ALL videos
CREATE POLICY "admin_videos_select" ON coach_videos
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
        AND (profiles.roles @> ARRAY['admin'] OR profiles.roles @> ARRAY['super_admin'])
    )
  );

CREATE POLICY "admin_videos_insert" ON coach_videos
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
        AND (profiles.roles @> ARRAY['admin'] OR profiles.roles @> ARRAY['super_admin'])
    )
  );

CREATE POLICY "admin_videos_update" ON coach_videos
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
        AND (profiles.roles @> ARRAY['admin'] OR profiles.roles @> ARRAY['super_admin'])
    )
  );

CREATE POLICY "admin_videos_delete" ON coach_videos
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
        AND (profiles.roles @> ARRAY['admin'] OR profiles.roles @> ARRAY['super_admin'])
    )
  );
