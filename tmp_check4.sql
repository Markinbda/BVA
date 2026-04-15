SELECT policyname, cmd, qual FROM pg_policies WHERE tablename = 'coach_videos' AND policyname = 'coach_videos_select_shared';
