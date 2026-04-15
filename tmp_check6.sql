SELECT EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name = 'team_coaches' AND table_schema = 'public') as team_coaches_exists;
SELECT id, title, visibility, coach_id FROM coach_videos LIMIT 5;
