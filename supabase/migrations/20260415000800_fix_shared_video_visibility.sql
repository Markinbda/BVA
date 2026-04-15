-- Fix: allow any authenticated user to see videos shared with all_coaches
-- Previously this required manage_coaches permission, which regular coaches
-- don't have, making all YouTube-synced (all_coaches) videos invisible to them.

DROP POLICY IF EXISTS "coach_videos_select_shared" ON public.coach_videos;

CREATE POLICY "coach_videos_select_shared"
  ON public.coach_videos
  FOR SELECT
  USING (
    visibility = 'all_coaches'
    AND auth.uid() IS NOT NULL
  );
