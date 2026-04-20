-- =============================================
-- COACH DOCUMENT SETS
-- =============================================

CREATE TABLE IF NOT EXISTS public.coach_document_sets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.coach_document_set_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  set_id UUID NOT NULL REFERENCES public.coach_document_sets(id) ON DELETE CASCADE,
  document_id UUID NOT NULL REFERENCES public.coach_documents(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (set_id, document_id)
);

CREATE INDEX IF NOT EXISTS coach_document_sets_coach_id_idx
  ON public.coach_document_sets (coach_id);

CREATE INDEX IF NOT EXISTS coach_document_sets_created_at_idx
  ON public.coach_document_sets (created_at DESC);

CREATE INDEX IF NOT EXISTS coach_document_set_items_set_id_idx
  ON public.coach_document_set_items (set_id);

CREATE INDEX IF NOT EXISTS coach_document_set_items_document_id_idx
  ON public.coach_document_set_items (document_id);

ALTER TABLE public.coach_document_sets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coach_document_set_items ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'coach_document_sets'
      AND policyname = 'coach_document_sets_select_own'
  ) THEN
    CREATE POLICY "coach_document_sets_select_own"
      ON public.coach_document_sets
      FOR SELECT
      USING (auth.uid() = coach_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'coach_document_sets'
      AND policyname = 'coach_document_sets_insert_own'
  ) THEN
    CREATE POLICY "coach_document_sets_insert_own"
      ON public.coach_document_sets
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
      AND tablename = 'coach_document_sets'
      AND policyname = 'coach_document_sets_update_own'
  ) THEN
    CREATE POLICY "coach_document_sets_update_own"
      ON public.coach_document_sets
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
      AND tablename = 'coach_document_sets'
      AND policyname = 'coach_document_sets_delete_own'
  ) THEN
    CREATE POLICY "coach_document_sets_delete_own"
      ON public.coach_document_sets
      FOR DELETE
      USING (auth.uid() = coach_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'coach_document_sets'
      AND policyname = 'coach_document_sets_admin_manage_all'
  ) THEN
    CREATE POLICY "coach_document_sets_admin_manage_all"
      ON public.coach_document_sets
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

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'coach_document_set_items'
      AND policyname = 'coach_document_set_items_select_allowed'
  ) THEN
    CREATE POLICY "coach_document_set_items_select_allowed"
      ON public.coach_document_set_items
      FOR SELECT
      USING (
        EXISTS (
          SELECT 1
          FROM public.coach_document_sets s
          WHERE s.id = coach_document_set_items.set_id
            AND (
              s.coach_id = auth.uid()
              OR public.has_permission(auth.uid(), 'manage_coach_documents')
              OR public.has_role(auth.uid(), 'admin'::app_role)
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
      AND tablename = 'coach_document_set_items'
      AND policyname = 'coach_document_set_items_insert_own'
  ) THEN
    CREATE POLICY "coach_document_set_items_insert_own"
      ON public.coach_document_set_items
      FOR INSERT
      WITH CHECK (
        EXISTS (
          SELECT 1
          FROM public.coach_document_sets s
          WHERE s.id = coach_document_set_items.set_id
            AND (
              s.coach_id = auth.uid()
              OR public.has_permission(auth.uid(), 'manage_coach_documents')
              OR public.has_role(auth.uid(), 'admin'::app_role)
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
      AND tablename = 'coach_document_set_items'
      AND policyname = 'coach_document_set_items_delete_own'
  ) THEN
    CREATE POLICY "coach_document_set_items_delete_own"
      ON public.coach_document_set_items
      FOR DELETE
      USING (
        EXISTS (
          SELECT 1
          FROM public.coach_document_sets s
          WHERE s.id = coach_document_set_items.set_id
            AND (
              s.coach_id = auth.uid()
              OR public.has_permission(auth.uid(), 'manage_coach_documents')
              OR public.has_role(auth.uid(), 'admin'::app_role)
            )
        )
      );
  END IF;
END $$;