SELECT user_id, display_name, roles FROM profiles WHERE display_name IS NOT NULL OR roles IS NOT NULL LIMIT 10;
SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'coach_videos' AND table_schema = 'public' ORDER BY column_name;
