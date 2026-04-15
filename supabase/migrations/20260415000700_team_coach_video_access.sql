-- Allow team coaches to read videos assigned to their teams
-- A coach assigned via team_coaches can read any coach_video whose team_ids overlap
-- with teams they are assigned to.

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'coach_videos'
      AND policyname = 'Team coaches can read team videos'
  ) THEN
    CREATE POLICY "Team coaches can read team videos"
      ON public.coach_videos FOR SELECT
      USING (
        EXISTS (
          SELECT 1
          FROM public.team_coaches tc
          WHERE tc.user_id = auth.uid()
            AND tc.team_id::text = ANY(coach_videos.team_ids)
        )
      );
  END IF;
END $$;

-- Also allow team coaches to read video_notes on those videos
-- (needed for CoachVideoReview — RLS on video_notes currently only allows the note owner)
-- We add a policy: if you can select the video, you can read the notes on it.
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'video_notes'
      AND policyname = 'Team coaches can read notes on team videos'
  ) THEN
    CREATE POLICY "Team coaches can read notes on team videos"
      ON public.video_notes FOR SELECT
      USING (
        EXISTS (
          SELECT 1
          FROM public.coach_videos cv
          JOIN public.team_coaches tc ON tc.team_id::text = ANY(cv.team_ids)
          WHERE cv.id = video_notes.video_id
            AND tc.user_id = auth.uid()
        )
      );
  END IF;
END $$;