SELECT COUNT(*) as total, visibility FROM coach_videos GROUP BY visibility;
SELECT policyname, cmd FROM pg_policies WHERE tablename = 'coach_videos' ORDER BY policyname;
