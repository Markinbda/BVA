CREATE TABLE IF NOT EXISTS public.video_notes (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id          UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  video_id          UUID        NOT NULL REFERENCES public.coach_videos(id) ON DELETE CASCADE,
  player_id         UUID        REFERENCES public.coach_players(id) ON DELETE SET NULL,
  timestamp_seconds REAL        NOT NULL DEFAULT 0,
  note_type         TEXT        NOT NULL DEFAULT 'text' CHECK (note_type IN ('text', 'voice')),
  note_text         TEXT,
  voice_url         TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.video_notes ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='video_notes' AND policyname='Coaches can manage own video notes') THEN
    CREATE POLICY "Coaches can manage own video notes" ON public.video_notes FOR ALL USING (auth.uid() = coach_id) WITH CHECK (auth.uid() = coach_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='video_notes' AND policyname='Admins can manage all video notes') THEN
    CREATE POLICY "Admins can manage all video notes" ON public.video_notes FOR ALL USING (public.has_role(auth.uid(), 'admin'::app_role));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS video_notes_video_id_idx  ON public.video_notes (video_id);
CREATE INDEX IF NOT EXISTS video_notes_player_id_idx ON public.video_notes (player_id);
CREATE INDEX IF NOT EXISTS video_notes_coach_id_idx  ON public.video_notes (coach_id);
CREATE INDEX IF NOT EXISTS video_notes_ts_idx        ON public.video_notes (video_id, timestamp_seconds);

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('video-voice-notes','video-voice-notes',false,52428800,ARRAY['audio/webm','audio/ogg','audio/mp4','audio/mpeg','audio/wav']::text[])
ON CONFLICT (id) DO NOTHING;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='storage' AND tablename='objects' AND policyname='Coaches upload own voice notes') THEN
    CREATE POLICY "Coaches upload own voice notes" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'video-voice-notes' AND auth.uid() IS NOT NULL AND (storage.foldername(name))[1] = auth.uid()::text);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='storage' AND tablename='objects' AND policyname='Coaches read own voice notes') THEN
    CREATE POLICY "Coaches read own voice notes" ON storage.objects FOR SELECT USING (bucket_id = 'video-voice-notes' AND (storage.foldername(name))[1] = auth.uid()::text);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='storage' AND tablename='objects' AND policyname='Coaches delete own voice notes') THEN
    CREATE POLICY "Coaches delete own voice notes" ON storage.objects FOR DELETE USING (bucket_id = 'video-voice-notes' AND (storage.foldername(name))[1] = auth.uid()::text);
  END IF;
END $$;