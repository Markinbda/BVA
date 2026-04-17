-- Add stored drill video path and storage bucket policies for coach drill recordings.

ALTER TABLE public.coach_drills
  ADD COLUMN IF NOT EXISTS drill_video_path TEXT;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
SELECT
  'coach-drill-videos',
  'coach-drill-videos',
  false,
  157286400,
  ARRAY['video/webm', 'video/mp4', 'video/quicktime']::text[]
WHERE NOT EXISTS (
  SELECT 1 FROM storage.buckets WHERE id = 'coach-drill-videos'
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'Coaches upload own drill videos'
  ) THEN
    CREATE POLICY "Coaches upload own drill videos"
      ON storage.objects FOR INSERT
      WITH CHECK (
        bucket_id = 'coach-drill-videos'
        AND auth.uid() IS NOT NULL
        AND (storage.foldername(name))[1] = auth.uid()::text
      );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'Authenticated users read drill videos'
  ) THEN
    CREATE POLICY "Authenticated users read drill videos"
      ON storage.objects FOR SELECT
      USING (
        bucket_id = 'coach-drill-videos'
        AND auth.uid() IS NOT NULL
      );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'Coaches delete own drill videos'
  ) THEN
    CREATE POLICY "Coaches delete own drill videos"
      ON storage.objects FOR DELETE
      USING (
        bucket_id = 'coach-drill-videos'
        AND auth.uid() IS NOT NULL
        AND (storage.foldername(name))[1] = auth.uid()::text
      );
  END IF;
END $$;