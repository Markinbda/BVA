-- =============================================
-- COACH DOCUMENT REPOSITORY
-- =============================================

CREATE TABLE IF NOT EXISTS public.coach_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL UNIQUE,
  file_size BIGINT,
  mime_type TEXT,
  description TEXT,
  share_with_players BOOLEAN NOT NULL DEFAULT false,
  share_with_all_coaches BOOLEAN NOT NULL DEFAULT false,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.coach_documents ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS coach_documents_coach_id_idx
  ON public.coach_documents (coach_id);

CREATE INDEX IF NOT EXISTS coach_documents_uploaded_at_idx
  ON public.coach_documents (uploaded_at DESC);

CREATE INDEX IF NOT EXISTS coach_documents_share_all_coaches_idx
  ON public.coach_documents (share_with_all_coaches);

CREATE INDEX IF NOT EXISTS coach_documents_share_with_players_idx
  ON public.coach_documents (share_with_players);

-- Coaches can view their own files.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'coach_documents'
      AND policyname = 'coach_documents_select_own'
  ) THEN
    CREATE POLICY "coach_documents_select_own"
      ON public.coach_documents
      FOR SELECT
      USING (auth.uid() = coach_id);
  END IF;
END $$;

-- Shared documents are visible in the coach portal shared tab.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'coach_documents'
      AND policyname = 'coach_documents_select_shared_with_coaches'
  ) THEN
    CREATE POLICY "coach_documents_select_shared_with_coaches"
      ON public.coach_documents
      FOR SELECT
      USING (
        share_with_all_coaches = true
        AND (
          public.has_permission(auth.uid(), 'manage_coaches')
          OR public.has_permission(auth.uid(), 'manage_coach_documents')
          OR public.has_role(auth.uid(), 'admin'::app_role)
        )
      );
  END IF;
END $$;

-- Player-shared files are visible to signed-in users with Player profile role.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'coach_documents'
      AND policyname = 'coach_documents_select_shared_with_players'
  ) THEN
    CREATE POLICY "coach_documents_select_shared_with_players"
      ON public.coach_documents
      FOR SELECT
      USING (
        share_with_players = true
        AND EXISTS (
          SELECT 1
          FROM public.profiles
          WHERE profiles.user_id = auth.uid()
            AND profiles.roles @> ARRAY['Player']
        )
      );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'coach_documents'
      AND policyname = 'coach_documents_insert_own'
  ) THEN
    CREATE POLICY "coach_documents_insert_own"
      ON public.coach_documents
      FOR INSERT
      WITH CHECK (auth.uid() = coach_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'coach_documents'
      AND policyname = 'coach_documents_update_own'
  ) THEN
    CREATE POLICY "coach_documents_update_own"
      ON public.coach_documents
      FOR UPDATE
      USING (auth.uid() = coach_id)
      WITH CHECK (auth.uid() = coach_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'coach_documents'
      AND policyname = 'coach_documents_delete_own'
  ) THEN
    CREATE POLICY "coach_documents_delete_own"
      ON public.coach_documents
      FOR DELETE
      USING (auth.uid() = coach_id);
  END IF;
END $$;

-- Document admins can manage all coach documents.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'coach_documents'
      AND policyname = 'coach_documents_admin_manage_all'
  ) THEN
    CREATE POLICY "coach_documents_admin_manage_all"
      ON public.coach_documents
      FOR ALL
      USING (
        public.has_permission(auth.uid(), 'manage_coach_documents')
        OR public.has_role(auth.uid(), 'admin'::app_role)
      )
      WITH CHECK (
        public.has_permission(auth.uid(), 'manage_coach_documents')
        OR public.has_role(auth.uid(), 'admin'::app_role)
      );
  END IF;
END $$;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
SELECT
  'coach-documents',
  'coach-documents',
  false,
  26214400,
  ARRAY[
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'text/plain',
    'image/jpeg',
    'image/png'
  ]::text[]
WHERE NOT EXISTS (
  SELECT 1 FROM storage.buckets WHERE id = 'coach-documents'
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'Coaches upload own documents'
  ) THEN
    CREATE POLICY "Coaches upload own documents"
      ON storage.objects FOR INSERT
      WITH CHECK (
        bucket_id = 'coach-documents'
        AND auth.uid() IS NOT NULL
        AND (
          (storage.foldername(name))[1] = auth.uid()::text
          OR public.has_permission(auth.uid(), 'manage_coach_documents')
          OR public.has_role(auth.uid(), 'admin'::app_role)
        )
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
      AND policyname = 'Users read allowed coach documents'
  ) THEN
    CREATE POLICY "Users read allowed coach documents"
      ON storage.objects FOR SELECT
      USING (
        bucket_id = 'coach-documents'
        AND auth.uid() IS NOT NULL
        AND (
          (storage.foldername(name))[1] = auth.uid()::text
          OR public.has_permission(auth.uid(), 'manage_coach_documents')
          OR public.has_role(auth.uid(), 'admin'::app_role)
          OR EXISTS (
            SELECT 1
            FROM public.coach_documents d
            WHERE d.file_path = name
              AND (
                (
                  d.share_with_all_coaches = true
                  AND (
                    public.has_permission(auth.uid(), 'manage_coaches')
                    OR public.has_permission(auth.uid(), 'manage_coach_documents')
                    OR public.has_role(auth.uid(), 'admin'::app_role)
                  )
                )
                OR (
                  d.share_with_players = true
                  AND EXISTS (
                    SELECT 1
                    FROM public.profiles p
                    WHERE p.user_id = auth.uid()
                      AND p.roles @> ARRAY['Player']
                  )
                )
              )
          )
        )
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
      AND policyname = 'Coaches delete own documents'
  ) THEN
    CREATE POLICY "Coaches delete own documents"
      ON storage.objects FOR DELETE
      USING (
        bucket_id = 'coach-documents'
        AND auth.uid() IS NOT NULL
        AND (
          (storage.foldername(name))[1] = auth.uid()::text
          OR public.has_permission(auth.uid(), 'manage_coach_documents')
          OR public.has_role(auth.uid(), 'admin'::app_role)
        )
      );
  END IF;
END $$;