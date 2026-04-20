-- =============================================
-- COACH DOCUMENT PLAYER SHARES
-- =============================================

CREATE TABLE IF NOT EXISTS public.coach_document_player_shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES public.coach_players(id) ON DELETE CASCADE,
  document_id UUID REFERENCES public.coach_documents(id) ON DELETE CASCADE,
  set_id UUID REFERENCES public.coach_document_sets(id) ON DELETE CASCADE,
  message TEXT,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT coach_document_player_shares_target_check CHECK (
    document_id IS NOT NULL OR set_id IS NOT NULL
  )
);

CREATE INDEX IF NOT EXISTS coach_document_player_shares_coach_id_idx
  ON public.coach_document_player_shares (coach_id);

CREATE INDEX IF NOT EXISTS coach_document_player_shares_player_id_idx
  ON public.coach_document_player_shares (player_id);

CREATE INDEX IF NOT EXISTS coach_document_player_shares_document_id_idx
  ON public.coach_document_player_shares (document_id);

CREATE INDEX IF NOT EXISTS coach_document_player_shares_set_id_idx
  ON public.coach_document_player_shares (set_id);

CREATE INDEX IF NOT EXISTS coach_document_player_shares_sent_at_idx
  ON public.coach_document_player_shares (sent_at DESC);

ALTER TABLE public.coach_document_player_shares ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'coach_document_player_shares'
      AND policyname = 'coach_document_player_shares_select_own'
  ) THEN
    CREATE POLICY "coach_document_player_shares_select_own"
      ON public.coach_document_player_shares
      FOR SELECT
      USING (
        coach_id = auth.uid()
        OR public.has_permission(auth.uid(), 'manage_coach_documents')
        OR public.has_role(auth.uid(), 'admin'::app_role)
      );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'coach_document_player_shares'
      AND policyname = 'coach_document_player_shares_select_player'
  ) THEN
    CREATE POLICY "coach_document_player_shares_select_player"
      ON public.coach_document_player_shares
      FOR SELECT
      USING (
        EXISTS (
          SELECT 1
          FROM public.coach_players cp
          WHERE cp.id = coach_document_player_shares.player_id
            AND lower(coalesce(cp.email, '')) = lower(coalesce(auth.jwt() ->> 'email', ''))
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
      AND tablename = 'coach_document_player_shares'
      AND policyname = 'coach_document_player_shares_insert_own'
  ) THEN
    CREATE POLICY "coach_document_player_shares_insert_own"
      ON public.coach_document_player_shares
      FOR INSERT
      WITH CHECK (
        (
          coach_id = auth.uid()
          OR public.has_permission(auth.uid(), 'manage_coach_documents')
          OR public.has_role(auth.uid(), 'admin'::app_role)
        )
        AND (
          document_id IS NULL
          OR EXISTS (
            SELECT 1
            FROM public.coach_documents d
            WHERE d.id = coach_document_player_shares.document_id
              AND (
                d.coach_id = auth.uid()
                OR public.has_permission(auth.uid(), 'manage_coach_documents')
                OR public.has_role(auth.uid(), 'admin'::app_role)
              )
          )
        )
        AND (
          set_id IS NULL
          OR EXISTS (
            SELECT 1
            FROM public.coach_document_sets s
            WHERE s.id = coach_document_player_shares.set_id
              AND (
                s.coach_id = auth.uid()
                OR public.has_permission(auth.uid(), 'manage_coach_documents')
                OR public.has_role(auth.uid(), 'admin'::app_role)
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
    WHERE schemaname = 'public'
      AND tablename = 'coach_document_player_shares'
      AND policyname = 'coach_document_player_shares_delete_own'
  ) THEN
    CREATE POLICY "coach_document_player_shares_delete_own"
      ON public.coach_document_player_shares
      FOR DELETE
      USING (
        coach_id = auth.uid()
        OR public.has_permission(auth.uid(), 'manage_coach_documents')
        OR public.has_role(auth.uid(), 'admin'::app_role)
      );
  END IF;
END $$;

-- Allow targeted players to read specific document rows.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'coach_documents'
      AND policyname = 'coach_documents_select_targeted_player_shares'
  ) THEN
    CREATE POLICY "coach_documents_select_targeted_player_shares"
      ON public.coach_documents
      FOR SELECT
      USING (
        EXISTS (
          SELECT 1
          FROM public.coach_document_player_shares s
          JOIN public.coach_players cp ON cp.id = s.player_id
          LEFT JOIN public.coach_document_set_items si ON si.set_id = s.set_id
          WHERE lower(coalesce(cp.email, '')) = lower(coalesce(auth.jwt() ->> 'email', ''))
            AND (
              s.document_id = coach_documents.id
              OR si.document_id = coach_documents.id
            )
        )
      );
  END IF;
END $$;

-- Allow targeted players to read shared sets.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'coach_document_sets'
      AND policyname = 'coach_document_sets_select_targeted_player_shares'
  ) THEN
    CREATE POLICY "coach_document_sets_select_targeted_player_shares"
      ON public.coach_document_sets
      FOR SELECT
      USING (
        EXISTS (
          SELECT 1
          FROM public.coach_document_player_shares s
          JOIN public.coach_players cp ON cp.id = s.player_id
          WHERE s.set_id = coach_document_sets.id
            AND lower(coalesce(cp.email, '')) = lower(coalesce(auth.jwt() ->> 'email', ''))
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
      AND tablename = 'coach_document_set_items'
      AND policyname = 'coach_document_set_items_select_targeted_player_shares'
  ) THEN
    CREATE POLICY "coach_document_set_items_select_targeted_player_shares"
      ON public.coach_document_set_items
      FOR SELECT
      USING (
        EXISTS (
          SELECT 1
          FROM public.coach_document_player_shares s
          JOIN public.coach_players cp ON cp.id = s.player_id
          WHERE s.set_id = coach_document_set_items.set_id
            AND lower(coalesce(cp.email, '')) = lower(coalesce(auth.jwt() ->> 'email', ''))
        )
      );
  END IF;
END $$;

-- Allow targeted players to fetch files from storage by matching document rows.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'Players read targeted shared coach documents'
  ) THEN
    CREATE POLICY "Players read targeted shared coach documents"
      ON storage.objects
      FOR SELECT
      USING (
        bucket_id = 'coach-documents'
        AND auth.uid() IS NOT NULL
        AND EXISTS (
          SELECT 1
          FROM public.coach_documents d
          WHERE d.file_path = name
            AND EXISTS (
              SELECT 1
              FROM public.coach_document_player_shares s
              JOIN public.coach_players cp ON cp.id = s.player_id
              LEFT JOIN public.coach_document_set_items si ON si.set_id = s.set_id
              WHERE lower(coalesce(cp.email, '')) = lower(coalesce(auth.jwt() ->> 'email', ''))
                AND (
                  s.document_id = d.id
                  OR si.document_id = d.id
                )
            )
        )
      );
  END IF;
END $$;