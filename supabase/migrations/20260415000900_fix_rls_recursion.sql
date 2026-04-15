-- Fix infinite recursion:
-- coach_videos RLS → queries video_notes → video_notes RLS → queries coach_videos → loop
--
-- Solution: replace the video_notes team-coach policy with a SECURITY DEFINER
-- function that queries coach_videos bypassing RLS, breaking the cycle.

CREATE OR REPLACE FUNCTION public.is_team_coach_for_video(_video_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM coach_videos cv
    JOIN team_coaches tc ON tc.team_id::text = ANY(cv.team_ids)
    WHERE cv.id = _video_id
      AND tc.user_id = auth.uid()
  )
$$;

-- Drop and recreate the video_notes team-coach policy using the helper
DROP POLICY IF EXISTS "Team coaches can read notes on team videos" ON public.video_notes;

CREATE POLICY "Team coaches can read notes on team videos"
  ON public.video_notes FOR SELECT
  USING (public.is_team_coach_for_video(video_notes.video_id));
