-- Team coaches junction table
-- Allows up to 4 coaches (system users) per team
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.team_coaches (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id    UUID        NOT NULL REFERENCES public.coach_teams(id) ON DELETE CASCADE,
  user_id    UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  sort_order INTEGER     NOT NULL DEFAULT 0,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (team_id, user_id)
);

ALTER TABLE public.team_coaches ENABLE ROW LEVEL SECURITY;

-- Admins can manage all team_coaches
CREATE POLICY "Admins can manage team_coaches"
  ON public.team_coaches FOR ALL
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Coaches can read their own assignments
CREATE POLICY "Coaches can read own assignments"
  ON public.team_coaches FOR SELECT
  USING (auth.uid() = user_id);

-- Enforce max 4 coaches per team via check function
CREATE OR REPLACE FUNCTION public.check_team_coaches_limit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF (SELECT COUNT(*) FROM public.team_coaches WHERE team_id = NEW.team_id) >= 4 THEN
    RAISE EXCEPTION 'A team cannot have more than 4 coaches.';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER enforce_team_coaches_limit
  BEFORE INSERT ON public.team_coaches
  FOR EACH ROW EXECUTE FUNCTION public.check_team_coaches_limit();

CREATE INDEX team_coaches_team_id_idx ON public.team_coaches (team_id);
CREATE INDEX team_coaches_user_id_idx ON public.team_coaches (user_id);
