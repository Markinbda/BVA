-- Allow anyone (including anon) to read currently active streams on the homepage
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'live_streams'
      AND policyname = 'Public can view active streams'
  ) THEN
    EXECUTE 'CREATE POLICY "Public can view active streams" ON public.live_streams FOR SELECT USING (is_live = true)';
  END IF;
END$$;
