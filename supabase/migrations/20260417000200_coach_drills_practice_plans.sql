-- =============================================
-- COACH DRILLS + PRACTICE PLANS
-- =============================================

-- Lookup: drill categories
CREATE TABLE IF NOT EXISTS public.coach_drill_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  status SMALLINT NOT NULL DEFAULT 1,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Lookup: drill skills
CREATE TABLE IF NOT EXISTS public.coach_drill_skills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Lookup: drill courts
CREATE TABLE IF NOT EXISTS public.coach_drill_courts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Main drills table
CREATE TABLE IF NOT EXISTS public.coach_drills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  link TEXT,
  duration_minutes INTEGER,
  description TEXT,
  equipment TEXT,
  player_groupings TEXT,
  time_intervals_reps TEXT,
  assistant_role TEXT,
  coach_role TEXT,
  age_group TEXT,
  coach_note TEXT,
  diagram_path TEXT,
  is_shared BOOLEAN NOT NULL DEFAULT false,
  status SMALLINT NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT coach_drills_duration_minutes_nonnegative CHECK (duration_minutes IS NULL OR duration_minutes >= 0)
);

-- Drill taxonomy mappings
CREATE TABLE IF NOT EXISTS public.coach_drill_to_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  drill_id UUID NOT NULL REFERENCES public.coach_drills(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES public.coach_drill_categories(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (drill_id, category_id)
);

CREATE TABLE IF NOT EXISTS public.coach_drill_to_skills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  drill_id UUID NOT NULL REFERENCES public.coach_drills(id) ON DELETE CASCADE,
  skill_id UUID NOT NULL REFERENCES public.coach_drill_skills(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (drill_id, skill_id)
);

CREATE TABLE IF NOT EXISTS public.coach_drill_to_courts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  drill_id UUID NOT NULL REFERENCES public.coach_drills(id) ON DELETE CASCADE,
  court_id UUID NOT NULL REFERENCES public.coach_drill_courts(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (drill_id, court_id)
);

-- Practice plans
CREATE TABLE IF NOT EXISTS public.coach_practice_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  team_id UUID REFERENCES public.coach_teams(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  notes TEXT,
  practice_date DATE,
  number_of_players INTEGER,
  practice_focus TEXT,
  intro TEXT,
  warm_up_notes TEXT,
  post_notes TEXT,
  is_shared BOOLEAN NOT NULL DEFAULT false,
  status SMALLINT NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT coach_practice_plans_players_nonnegative CHECK (number_of_players IS NULL OR number_of_players >= 0)
);

-- Ordered rows in a plan: either a drill row or a note row
CREATE TABLE IF NOT EXISTS public.coach_practice_plan_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  practice_plan_id UUID NOT NULL REFERENCES public.coach_practice_plans(id) ON DELETE CASCADE,
  item_type TEXT NOT NULL,
  drill_id UUID REFERENCES public.coach_drills(id) ON DELETE SET NULL,
  file_path TEXT,
  note_title TEXT,
  note_text TEXT,
  duration_minutes INTEGER,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT coach_practice_plan_items_type_check CHECK (item_type IN ('drill', 'note')),
  CONSTRAINT coach_practice_plan_items_duration_nonnegative CHECK (duration_minutes IS NULL OR duration_minutes >= 0),
  CONSTRAINT coach_practice_plan_items_type_payload_check CHECK (
    (item_type = 'drill' AND drill_id IS NOT NULL)
    OR
    (item_type = 'note' AND note_text IS NOT NULL)
  )
);

-- RLS
ALTER TABLE public.coach_drill_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coach_drill_skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coach_drill_courts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coach_drills ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coach_drill_to_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coach_drill_to_skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coach_drill_to_courts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coach_practice_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coach_practice_plan_items ENABLE ROW LEVEL SECURITY;

-- Lookup reads for all authenticated users
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'coach_drill_categories' AND policyname = 'Authenticated users can view drill categories'
  ) THEN
    CREATE POLICY "Authenticated users can view drill categories"
      ON public.coach_drill_categories FOR SELECT
      USING (auth.uid() IS NOT NULL);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'coach_drill_skills' AND policyname = 'Authenticated users can view drill skills'
  ) THEN
    CREATE POLICY "Authenticated users can view drill skills"
      ON public.coach_drill_skills FOR SELECT
      USING (auth.uid() IS NOT NULL);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'coach_drill_courts' AND policyname = 'Authenticated users can view drill courts'
  ) THEN
    CREATE POLICY "Authenticated users can view drill courts"
      ON public.coach_drill_courts FOR SELECT
      USING (auth.uid() IS NOT NULL);
  END IF;
END $$;

-- Admin can manage lookups
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'coach_drill_categories' AND policyname = 'Admins can manage drill categories'
  ) THEN
    CREATE POLICY "Admins can manage drill categories"
      ON public.coach_drill_categories FOR ALL
      USING (public.has_role(auth.uid(), 'admin'::app_role));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'coach_drill_skills' AND policyname = 'Admins can manage drill skills'
  ) THEN
    CREATE POLICY "Admins can manage drill skills"
      ON public.coach_drill_skills FOR ALL
      USING (public.has_role(auth.uid(), 'admin'::app_role));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'coach_drill_courts' AND policyname = 'Admins can manage drill courts'
  ) THEN
    CREATE POLICY "Admins can manage drill courts"
      ON public.coach_drill_courts FOR ALL
      USING (public.has_role(auth.uid(), 'admin'::app_role));
  END IF;
END $$;

-- Drills
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'coach_drills' AND policyname = 'Coaches can view own or shared drills'
  ) THEN
    CREATE POLICY "Coaches can view own or shared drills"
      ON public.coach_drills FOR SELECT
      USING (auth.uid() = coach_id OR is_shared = true);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'coach_drills' AND policyname = 'Coaches can insert own drills'
  ) THEN
    CREATE POLICY "Coaches can insert own drills"
      ON public.coach_drills FOR INSERT
      WITH CHECK (auth.uid() = coach_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'coach_drills' AND policyname = 'Coaches can update own drills'
  ) THEN
    CREATE POLICY "Coaches can update own drills"
      ON public.coach_drills FOR UPDATE
      USING (auth.uid() = coach_id)
      WITH CHECK (auth.uid() = coach_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'coach_drills' AND policyname = 'Coaches can delete own drills'
  ) THEN
    CREATE POLICY "Coaches can delete own drills"
      ON public.coach_drills FOR DELETE
      USING (auth.uid() = coach_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'coach_drills' AND policyname = 'Admins can manage all drills'
  ) THEN
    CREATE POLICY "Admins can manage all drills"
      ON public.coach_drills FOR ALL
      USING (public.has_role(auth.uid(), 'admin'::app_role));
  END IF;
END $$;

-- Drill taxonomy mappings
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'coach_drill_to_categories' AND policyname = 'Coaches can read drill category mappings'
  ) THEN
    CREATE POLICY "Coaches can read drill category mappings"
      ON public.coach_drill_to_categories FOR SELECT
      USING (
        EXISTS (
          SELECT 1 FROM public.coach_drills d
          WHERE d.id = coach_drill_to_categories.drill_id
          AND (d.coach_id = auth.uid() OR d.is_shared = true)
        )
      );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'coach_drill_to_categories' AND policyname = 'Coaches can manage own drill category mappings'
  ) THEN
    CREATE POLICY "Coaches can manage own drill category mappings"
      ON public.coach_drill_to_categories FOR ALL
      USING (
        EXISTS (
          SELECT 1 FROM public.coach_drills d
          WHERE d.id = coach_drill_to_categories.drill_id
          AND d.coach_id = auth.uid()
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM public.coach_drills d
          WHERE d.id = coach_drill_to_categories.drill_id
          AND d.coach_id = auth.uid()
        )
      );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'coach_drill_to_skills' AND policyname = 'Coaches can read drill skill mappings'
  ) THEN
    CREATE POLICY "Coaches can read drill skill mappings"
      ON public.coach_drill_to_skills FOR SELECT
      USING (
        EXISTS (
          SELECT 1 FROM public.coach_drills d
          WHERE d.id = coach_drill_to_skills.drill_id
          AND (d.coach_id = auth.uid() OR d.is_shared = true)
        )
      );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'coach_drill_to_skills' AND policyname = 'Coaches can manage own drill skill mappings'
  ) THEN
    CREATE POLICY "Coaches can manage own drill skill mappings"
      ON public.coach_drill_to_skills FOR ALL
      USING (
        EXISTS (
          SELECT 1 FROM public.coach_drills d
          WHERE d.id = coach_drill_to_skills.drill_id
          AND d.coach_id = auth.uid()
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM public.coach_drills d
          WHERE d.id = coach_drill_to_skills.drill_id
          AND d.coach_id = auth.uid()
        )
      );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'coach_drill_to_courts' AND policyname = 'Coaches can read drill court mappings'
  ) THEN
    CREATE POLICY "Coaches can read drill court mappings"
      ON public.coach_drill_to_courts FOR SELECT
      USING (
        EXISTS (
          SELECT 1 FROM public.coach_drills d
          WHERE d.id = coach_drill_to_courts.drill_id
          AND (d.coach_id = auth.uid() OR d.is_shared = true)
        )
      );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'coach_drill_to_courts' AND policyname = 'Coaches can manage own drill court mappings'
  ) THEN
    CREATE POLICY "Coaches can manage own drill court mappings"
      ON public.coach_drill_to_courts FOR ALL
      USING (
        EXISTS (
          SELECT 1 FROM public.coach_drills d
          WHERE d.id = coach_drill_to_courts.drill_id
          AND d.coach_id = auth.uid()
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM public.coach_drills d
          WHERE d.id = coach_drill_to_courts.drill_id
          AND d.coach_id = auth.uid()
        )
      );
  END IF;
END $$;

-- Practice plans
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'coach_practice_plans' AND policyname = 'Coaches can view own practice plans'
  ) THEN
    CREATE POLICY "Coaches can view own practice plans"
      ON public.coach_practice_plans FOR SELECT
      USING (auth.uid() = coach_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'coach_practice_plans' AND policyname = 'Coaches can insert own practice plans'
  ) THEN
    CREATE POLICY "Coaches can insert own practice plans"
      ON public.coach_practice_plans FOR INSERT
      WITH CHECK (auth.uid() = coach_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'coach_practice_plans' AND policyname = 'Coaches can update own practice plans'
  ) THEN
    CREATE POLICY "Coaches can update own practice plans"
      ON public.coach_practice_plans FOR UPDATE
      USING (auth.uid() = coach_id)
      WITH CHECK (auth.uid() = coach_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'coach_practice_plans' AND policyname = 'Coaches can delete own practice plans'
  ) THEN
    CREATE POLICY "Coaches can delete own practice plans"
      ON public.coach_practice_plans FOR DELETE
      USING (auth.uid() = coach_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'coach_practice_plans' AND policyname = 'Admins can manage all practice plans'
  ) THEN
    CREATE POLICY "Admins can manage all practice plans"
      ON public.coach_practice_plans FOR ALL
      USING (public.has_role(auth.uid(), 'admin'::app_role));
  END IF;
END $$;

-- Practice plan items
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'coach_practice_plan_items' AND policyname = 'Coaches can read own practice plan items'
  ) THEN
    CREATE POLICY "Coaches can read own practice plan items"
      ON public.coach_practice_plan_items FOR SELECT
      USING (
        EXISTS (
          SELECT 1 FROM public.coach_practice_plans p
          WHERE p.id = coach_practice_plan_items.practice_plan_id
          AND p.coach_id = auth.uid()
        )
      );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'coach_practice_plan_items' AND policyname = 'Coaches can manage own practice plan items'
  ) THEN
    CREATE POLICY "Coaches can manage own practice plan items"
      ON public.coach_practice_plan_items FOR ALL
      USING (
        EXISTS (
          SELECT 1 FROM public.coach_practice_plans p
          WHERE p.id = coach_practice_plan_items.practice_plan_id
          AND p.coach_id = auth.uid()
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM public.coach_practice_plans p
          WHERE p.id = coach_practice_plan_items.practice_plan_id
          AND p.coach_id = auth.uid()
        )
      );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'coach_practice_plan_items' AND policyname = 'Admins can manage all practice plan items'
  ) THEN
    CREATE POLICY "Admins can manage all practice plan items"
      ON public.coach_practice_plan_items FOR ALL
      USING (public.has_role(auth.uid(), 'admin'::app_role));
  END IF;
END $$;

-- Triggers for updated_at columns
DROP TRIGGER IF EXISTS coach_drill_categories_updated_at ON public.coach_drill_categories;
CREATE TRIGGER coach_drill_categories_updated_at
  BEFORE UPDATE ON public.coach_drill_categories
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS coach_drill_skills_updated_at ON public.coach_drill_skills;
CREATE TRIGGER coach_drill_skills_updated_at
  BEFORE UPDATE ON public.coach_drill_skills
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS coach_drill_courts_updated_at ON public.coach_drill_courts;
CREATE TRIGGER coach_drill_courts_updated_at
  BEFORE UPDATE ON public.coach_drill_courts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS coach_drills_updated_at ON public.coach_drills;
CREATE TRIGGER coach_drills_updated_at
  BEFORE UPDATE ON public.coach_drills
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS coach_practice_plans_updated_at ON public.coach_practice_plans;
CREATE TRIGGER coach_practice_plans_updated_at
  BEFORE UPDATE ON public.coach_practice_plans
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS coach_practice_plan_items_updated_at ON public.coach_practice_plan_items;
CREATE TRIGGER coach_practice_plan_items_updated_at
  BEFORE UPDATE ON public.coach_practice_plan_items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Indexes
CREATE INDEX IF NOT EXISTS coach_drills_coach_id_idx ON public.coach_drills (coach_id);
CREATE INDEX IF NOT EXISTS coach_drills_name_idx ON public.coach_drills (name);
CREATE INDEX IF NOT EXISTS coach_drills_age_group_idx ON public.coach_drills (age_group);
CREATE INDEX IF NOT EXISTS coach_drills_shared_idx ON public.coach_drills (is_shared);

CREATE INDEX IF NOT EXISTS coach_drill_to_categories_drill_idx ON public.coach_drill_to_categories (drill_id);
CREATE INDEX IF NOT EXISTS coach_drill_to_categories_category_idx ON public.coach_drill_to_categories (category_id);
CREATE INDEX IF NOT EXISTS coach_drill_to_skills_drill_idx ON public.coach_drill_to_skills (drill_id);
CREATE INDEX IF NOT EXISTS coach_drill_to_skills_skill_idx ON public.coach_drill_to_skills (skill_id);
CREATE INDEX IF NOT EXISTS coach_drill_to_courts_drill_idx ON public.coach_drill_to_courts (drill_id);
CREATE INDEX IF NOT EXISTS coach_drill_to_courts_court_idx ON public.coach_drill_to_courts (court_id);

CREATE INDEX IF NOT EXISTS coach_practice_plans_coach_id_idx ON public.coach_practice_plans (coach_id);
CREATE INDEX IF NOT EXISTS coach_practice_plans_team_id_idx ON public.coach_practice_plans (team_id);
CREATE INDEX IF NOT EXISTS coach_practice_plans_practice_date_idx ON public.coach_practice_plans (practice_date DESC);

CREATE INDEX IF NOT EXISTS coach_practice_plan_items_plan_id_idx ON public.coach_practice_plan_items (practice_plan_id);
CREATE INDEX IF NOT EXISTS coach_practice_plan_items_sort_order_idx ON public.coach_practice_plan_items (practice_plan_id, sort_order);

-- Seed lookups
INSERT INTO public.coach_drill_categories (name, sort_order)
VALUES
  ('Individual Drill', 1),
  ('Team Drill', 2),
  ('Technique', 3),
  ('Theory', 4),
  ('Warm Up Drill', 5),
  ('Game Play', 6),
  ('Partner drill', 7),
  ('Conditioning', 8),
  ('3 Person Group Drill', 9),
  ('4 Person Group Drill', 10)
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.coach_drill_skills (name, sort_order)
VALUES
  ('Attacking', 1),
  ('Ball Control', 2),
  ('Blocking', 3),
  ('Communication', 4),
  ('Defense', 5),
  ('Game', 6),
  ('Offense', 7),
  ('Passing', 8),
  ('Serve Receive', 9),
  ('Serving', 10),
  ('Setting', 11),
  ('Transition', 12)
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.coach_drill_courts (name, sort_order)
VALUES
  ('Indoor', 1),
  ('Outdoor', 2)
ON CONFLICT (name) DO NOTHING;
