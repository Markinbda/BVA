-- Enable visibility of shared practice plans and add per-coach favorite drills.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'coach_practice_plans'
      AND policyname = 'Coaches can view own practice plans'
  ) THEN
    DROP POLICY "Coaches can view own practice plans" ON public.coach_practice_plans;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'coach_practice_plans'
      AND policyname = 'Coaches can view own or shared practice plans'
  ) THEN
    CREATE POLICY "Coaches can view own or shared practice plans"
      ON public.coach_practice_plans FOR SELECT
      USING (auth.uid() = coach_id OR (auth.uid() IS NOT NULL AND is_shared = true));
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'coach_practice_plan_items'
      AND policyname = 'Coaches can read own practice plan items'
  ) THEN
    DROP POLICY "Coaches can read own practice plan items" ON public.coach_practice_plan_items;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'coach_practice_plan_items'
      AND policyname = 'Coaches can read own or shared practice plan items'
  ) THEN
    CREATE POLICY "Coaches can read own or shared practice plan items"
      ON public.coach_practice_plan_items FOR SELECT
      USING (
        EXISTS (
          SELECT 1
          FROM public.coach_practice_plans p
          WHERE p.id = coach_practice_plan_items.practice_plan_id
            AND (
              p.coach_id = auth.uid()
              OR (auth.uid() IS NOT NULL AND p.is_shared = true)
            )
        )
      );
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.coach_favorite_drills (
  coach_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  drill_id UUID NOT NULL REFERENCES public.coach_drills(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (coach_id, drill_id)
);

ALTER TABLE public.coach_favorite_drills ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'coach_favorite_drills'
      AND policyname = 'Coaches can read own favorite drills'
  ) THEN
    CREATE POLICY "Coaches can read own favorite drills"
      ON public.coach_favorite_drills FOR SELECT
      USING (coach_id = auth.uid());
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'coach_favorite_drills'
      AND policyname = 'Coaches can insert own favorite drills'
  ) THEN
    CREATE POLICY "Coaches can insert own favorite drills"
      ON public.coach_favorite_drills FOR INSERT
      WITH CHECK (coach_id = auth.uid());
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'coach_favorite_drills'
      AND policyname = 'Coaches can delete own favorite drills'
  ) THEN
    CREATE POLICY "Coaches can delete own favorite drills"
      ON public.coach_favorite_drills FOR DELETE
      USING (coach_id = auth.uid());
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'coach_favorite_drills'
      AND policyname = 'Admins can manage all favorite drills'
  ) THEN
    CREATE POLICY "Admins can manage all favorite drills"
      ON public.coach_favorite_drills FOR ALL
      USING (public.has_role(auth.uid(), 'admin'::app_role));
  END IF;
END $$;

GRANT SELECT, INSERT, DELETE ON TABLE public.coach_favorite_drills TO authenticated;

CREATE INDEX IF NOT EXISTS coach_favorite_drills_coach_idx ON public.coach_favorite_drills (coach_id);
CREATE INDEX IF NOT EXISTS coach_favorite_drills_drill_idx ON public.coach_favorite_drills (drill_id);
