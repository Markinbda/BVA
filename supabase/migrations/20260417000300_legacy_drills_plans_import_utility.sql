-- Utility migration to support importing legacy AMH drill/practice data
-- into the new coach_* schema.

CREATE TABLE IF NOT EXISTS public.legacy_user_to_auth_map (
  legacy_user_id INTEGER PRIMARY KEY,
  coach_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.coach_drill_categories ADD COLUMN IF NOT EXISTS legacy_category_id INTEGER;
ALTER TABLE public.coach_drill_skills ADD COLUMN IF NOT EXISTS legacy_skill_id INTEGER;
ALTER TABLE public.coach_drill_courts ADD COLUMN IF NOT EXISTS legacy_court_id INTEGER;
ALTER TABLE public.coach_drills ADD COLUMN IF NOT EXISTS legacy_drill_id INTEGER;
ALTER TABLE public.coach_practice_plans ADD COLUMN IF NOT EXISTS legacy_plan_id INTEGER;
ALTER TABLE public.coach_practice_plan_items ADD COLUMN IF NOT EXISTS legacy_item_id INTEGER;

CREATE UNIQUE INDEX IF NOT EXISTS coach_drill_categories_legacy_idx
  ON public.coach_drill_categories (legacy_category_id)
  WHERE legacy_category_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS coach_drill_skills_legacy_idx
  ON public.coach_drill_skills (legacy_skill_id)
  WHERE legacy_skill_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS coach_drill_courts_legacy_idx
  ON public.coach_drill_courts (legacy_court_id)
  WHERE legacy_court_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS coach_drills_legacy_idx
  ON public.coach_drills (legacy_drill_id)
  WHERE legacy_drill_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS coach_practice_plans_legacy_idx
  ON public.coach_practice_plans (legacy_plan_id)
  WHERE legacy_plan_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS coach_practice_plan_items_legacy_idx
  ON public.coach_practice_plan_items (legacy_item_id)
  WHERE legacy_item_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.import_legacy_drills_and_practice_plans(
  p_fallback_coach_id UUID DEFAULT NULL,
  p_limit INTEGER DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_fallback UUID := p_fallback_coach_id;
  v_categories_imported INTEGER := 0;
  v_skills_imported INTEGER := 0;
  v_courts_imported INTEGER := 0;
  v_drills_imported INTEGER := 0;
  v_plans_imported INTEGER := 0;
  v_items_imported INTEGER := 0;
BEGIN
  IF to_regclass('public.drills') IS NULL
     OR to_regclass('public.practice_plans') IS NULL
     OR to_regclass('public.practice_plans_drills') IS NULL
  THEN
    RAISE EXCEPTION 'Legacy tables (drills/practice_plans/practice_plans_drills) were not found in schema public.';
  END IF;

  IF v_fallback IS NULL THEN
    SELECT p.user_id
      INTO v_fallback
      FROM public.profiles p
     WHERE p.user_id IS NOT NULL
     ORDER BY p.created_at NULLS LAST
     LIMIT 1;
  END IF;

  -- Taxonomy lookups
  WITH upserted AS (
    INSERT INTO public.coach_drill_categories (name, status, legacy_category_id)
    SELECT c.name, COALESCE(c.status, 1), c.id
      FROM public.categories c
    ON CONFLICT (name) DO UPDATE
      SET legacy_category_id = COALESCE(public.coach_drill_categories.legacy_category_id, EXCLUDED.legacy_category_id),
          status = EXCLUDED.status
    RETURNING 1
  )
  SELECT COUNT(*) INTO v_categories_imported FROM upserted;

  WITH upserted AS (
    INSERT INTO public.coach_drill_skills (name, legacy_skill_id)
    SELECT s.name, s.id
      FROM public.skills s
    ON CONFLICT (name) DO UPDATE
      SET legacy_skill_id = COALESCE(public.coach_drill_skills.legacy_skill_id, EXCLUDED.legacy_skill_id)
    RETURNING 1
  )
  SELECT COUNT(*) INTO v_skills_imported FROM upserted;

  WITH upserted AS (
    INSERT INTO public.coach_drill_courts (name, legacy_court_id)
    SELECT c.name, c.id
      FROM public.courts c
    ON CONFLICT (name) DO UPDATE
      SET legacy_court_id = COALESCE(public.coach_drill_courts.legacy_court_id, EXCLUDED.legacy_court_id)
    RETURNING 1
  )
  SELECT COUNT(*) INTO v_courts_imported FROM upserted;

  -- Drills
  WITH legacy_drills AS (
    SELECT d.*,
           COALESCE(m.coach_id, v_fallback) AS mapped_coach_id
      FROM public.drills d
      LEFT JOIN public.legacy_user_to_auth_map m
        ON m.legacy_user_id = d.user_id
     WHERE p_limit IS NULL OR d.id <= p_limit
  ),
  inserted AS (
    INSERT INTO public.coach_drills (
      coach_id,
      name,
      link,
      duration_minutes,
      description,
      equipment,
      player_groupings,
      time_intervals_reps,
      assistant_role,
      coach_role,
      age_group,
      coach_note,
      diagram_path,
      status,
      legacy_drill_id,
      created_at,
      updated_at
    )
    SELECT
      ld.mapped_coach_id,
      ld.name,
      NULLIF(ld.link, ''),
      ld.duration,
      NULLIF(ld.description, ''),
      NULLIF(ld.equipment, ''),
      NULLIF(ld.player_groupings, ''),
      NULLIF(ld.time_intervals_reps, ''),
      NULLIF(ld.assistant_role, ''),
      NULLIF(ld.coach_role, ''),
      NULLIF(ld.age_group, ''),
      NULLIF(ld.coach_note, ''),
      NULLIF(ld.diagram, ''),
      COALESCE(ld.status, 1),
      ld.id,
      COALESCE(ld.created, now()),
      COALESCE(ld.modified, ld.created, now())
    FROM legacy_drills ld
    WHERE ld.mapped_coach_id IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM public.coach_drills cd WHERE cd.legacy_drill_id = ld.id
      )
    RETURNING 1
  )
  SELECT COUNT(*) INTO v_drills_imported FROM inserted;

  INSERT INTO public.coach_drill_to_categories (drill_id, category_id)
  SELECT cd.id, cdc.id
    FROM public.drills_categories dc
    JOIN public.coach_drills cd ON cd.legacy_drill_id = dc.drill_id
    JOIN public.coach_drill_categories cdc ON cdc.legacy_category_id = dc.category_id
  ON CONFLICT (drill_id, category_id) DO NOTHING;

  INSERT INTO public.coach_drill_to_skills (drill_id, skill_id)
  SELECT cd.id, cds.id
    FROM public.drills_skills ds
    JOIN public.coach_drills cd ON cd.legacy_drill_id = ds.drill_id
    JOIN public.coach_drill_skills cds ON cds.legacy_skill_id = ds.skill_id
  ON CONFLICT (drill_id, skill_id) DO NOTHING;

  INSERT INTO public.coach_drill_to_courts (drill_id, court_id)
  SELECT cd.id, cdc.id
    FROM public.drills_courts dc
    JOIN public.coach_drills cd ON cd.legacy_drill_id = dc.drill_id
    JOIN public.coach_drill_courts cdc ON cdc.legacy_court_id = dc.court_id
  ON CONFLICT (drill_id, court_id) DO NOTHING;

  -- Practice plans
  WITH legacy_plans AS (
    SELECT p.*,
           t.name AS legacy_team_name,
           COALESCE(m.coach_id, v_fallback) AS mapped_coach_id
      FROM public.practice_plans p
      LEFT JOIN public.legacy_user_to_auth_map m
        ON m.legacy_user_id = p.user_id
      LEFT JOIN public.teams t
        ON t.id = p.team_id
     WHERE p_limit IS NULL OR p.id <= p_limit
  ),
  inserted AS (
    INSERT INTO public.coach_practice_plans (
      coach_id,
      team_id,
      name,
      notes,
      practice_date,
      number_of_players,
      practice_focus,
      intro,
      warm_up_notes,
      post_notes,
      is_shared,
      status,
      legacy_plan_id,
      created_at,
      updated_at
    )
    SELECT
      lp.mapped_coach_id,
      ct.id,
      lp.name,
      NULLIF(lp.notes, ''),
      lp.practice_date,
      lp.number_of_players,
      NULLIF(lp.practice_focus, ''),
      NULLIF(lp.intro, ''),
      NULLIF(lp.warm_up_notes, ''),
      NULLIF(lp.post_notes, ''),
      CASE WHEN COALESCE(lp.is_shared, 0) = 1 THEN true ELSE false END,
      COALESCE(lp.status, 1),
      lp.id,
      COALESCE(lp.created, now()),
      COALESCE(lp.modified, lp.created, now())
    FROM legacy_plans lp
    LEFT JOIN public.coach_teams ct
      ON ct.coach_id = lp.mapped_coach_id
     AND lp.legacy_team_name IS NOT NULL
     AND lower(ct.name) = lower(lp.legacy_team_name)
    WHERE lp.mapped_coach_id IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM public.coach_practice_plans cpp WHERE cpp.legacy_plan_id = lp.id
      )
    RETURNING 1
  )
  SELECT COUNT(*) INTO v_plans_imported FROM inserted;

  -- Practice plan items
  WITH inserted AS (
    INSERT INTO public.coach_practice_plan_items (
      practice_plan_id,
      item_type,
      drill_id,
      file_path,
      note_title,
      note_text,
      duration_minutes,
      sort_order,
      legacy_item_id,
      created_at,
      updated_at
    )
    SELECT
      cpp.id,
      CASE WHEN lower(COALESCE(ppd.type, 'drill')) = 'note' THEN 'note' ELSE 'drill' END,
      CASE WHEN lower(COALESCE(ppd.type, 'drill')) = 'drill' THEN cd.id ELSE NULL END,
      NULLIF(ppd.file, ''),
      NULLIF(ppd.note_title, ''),
      CASE
        WHEN lower(COALESCE(ppd.type, 'drill')) = 'note' THEN COALESCE(NULLIF(ppd.notes, ''), '(Imported note)')
        ELSE NULLIF(ppd.notes, '')
      END,
      ppd.duration,
      COALESCE(ppd.sort_order, 0),
      ppd.id,
      COALESCE(ppd.created, now()),
      COALESCE(ppd.modified, ppd.created, now())
    FROM public.practice_plans_drills ppd
    JOIN public.coach_practice_plans cpp
      ON cpp.legacy_plan_id = ppd.practice_plan_id
    LEFT JOIN public.coach_drills cd
      ON cd.legacy_drill_id = ppd.drill_id
     AND cd.coach_id = cpp.coach_id
    WHERE NOT EXISTS (
      SELECT 1 FROM public.coach_practice_plan_items cppi WHERE cppi.legacy_item_id = ppd.id
    )
      AND (
        lower(COALESCE(ppd.type, 'drill')) = 'note'
        OR cd.id IS NOT NULL
      )
    RETURNING 1
  )
  SELECT COUNT(*) INTO v_items_imported FROM inserted;

  RETURN jsonb_build_object(
    'fallback_coach_id', v_fallback,
    'categories_upserted', v_categories_imported,
    'skills_upserted', v_skills_imported,
    'courts_upserted', v_courts_imported,
    'drills_imported', v_drills_imported,
    'practice_plans_imported', v_plans_imported,
    'practice_plan_items_imported', v_items_imported
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.import_legacy_drills_and_practice_plans(UUID, INTEGER) TO authenticated;
