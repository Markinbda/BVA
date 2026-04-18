-- Normalize email matching for all player-facing video/note access policies

-- video_notes: Players can read own notes
DROP POLICY IF EXISTS "Players can read own notes" ON public.video_notes;
CREATE POLICY "Players can read own notes"
  ON public.video_notes FOR SELECT
  USING (
    is_all_players = true
    OR player_id IN (
      SELECT cp.id
      FROM public.coach_players cp
      WHERE cp.email IS NOT NULL
        AND lower(btrim(cp.email)) = lower(btrim(auth.email()))
    )
  );

-- coach_videos: Players can read videos with assigned notes
DROP POLICY IF EXISTS "Players can read videos with assigned notes" ON public.coach_videos;
CREATE POLICY "Players can read videos with assigned notes"
  ON public.coach_videos FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.video_notes vn
      LEFT JOIN public.coach_players cp ON cp.id = vn.player_id
      WHERE vn.video_id = coach_videos.id
        AND (
          vn.is_all_players = true
          OR (
            cp.email IS NOT NULL
            AND lower(btrim(cp.email)) = lower(btrim(auth.email()))
          )
        )
    )
  );

-- storage.objects: Players read assigned voice notes
DROP POLICY IF EXISTS "Players read assigned voice notes" ON storage.objects;
CREATE POLICY "Players read assigned voice notes"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'video-voice-notes'
    AND EXISTS (
      SELECT 1
      FROM public.video_notes vn
      LEFT JOIN public.coach_players cp ON cp.id = vn.player_id
      WHERE vn.voice_url = objects.name
        AND (
          vn.is_all_players = true
          OR (
            cp.email IS NOT NULL
            AND lower(btrim(cp.email)) = lower(btrim(auth.email()))
          )
        )
    )
  );

-- video_share_tokens: Players can read own share tokens
DROP POLICY IF EXISTS "Players can read own share tokens" ON public.video_share_tokens;
CREATE POLICY "Players can read own share tokens"
  ON public.video_share_tokens FOR SELECT
  USING (
    coach_player_id IN (
      SELECT cp.id
      FROM public.coach_players cp
      WHERE cp.email IS NOT NULL
        AND lower(btrim(cp.email)) = lower(btrim(auth.email()))
    )
  );
