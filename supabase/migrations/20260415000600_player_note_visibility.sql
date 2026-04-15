-- Add is_all_players flag to video_notes
ALTER TABLE public.video_notes
  ADD COLUMN IF NOT EXISTS is_all_players BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS video_notes_all_players_idx ON public.video_notes (is_all_players) WHERE is_all_players = true;

-- RLS: Players can read notes assigned to them or broadcast to all
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'video_notes'
      AND policyname = 'Players can read own notes'
  ) THEN
    CREATE POLICY "Players can read own notes"
      ON public.video_notes FOR SELECT
      USING (
        is_all_players = true
        OR player_id IN (
          SELECT cp.id FROM public.coach_players cp WHERE cp.email = auth.email()
        )
      );
  END IF;
END $$;

-- RLS: Players can read coach_videos that have notes assigned to them
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'coach_videos'
      AND policyname = 'Players can read videos with assigned notes'
  ) THEN
    CREATE POLICY "Players can read videos with assigned notes"
      ON public.coach_videos FOR SELECT
      USING (
        EXISTS (
          SELECT 1 FROM public.video_notes vn
          LEFT JOIN public.coach_players cp ON cp.id = vn.player_id
          WHERE vn.video_id = coach_videos.id
            AND (vn.is_all_players = true OR cp.email = auth.email())
        )
      );
  END IF;
END $$;

-- RLS: Players can create signed URLs for voice notes assigned to them
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
      AND policyname = 'Players read assigned voice notes'
  ) THEN
    CREATE POLICY "Players read assigned voice notes"
      ON storage.objects FOR SELECT
      USING (
        bucket_id = 'video-voice-notes'
        AND EXISTS (
          SELECT 1 FROM public.video_notes vn
          LEFT JOIN public.coach_players cp ON cp.id = vn.player_id
          WHERE vn.voice_url = objects.name
            AND (vn.is_all_players = true OR cp.email = auth.email())
        )
      );
  END IF;
END $$;