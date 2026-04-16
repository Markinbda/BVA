-- SECURITY DEFINER function bypasses RLS to return teams a user is assigned to
CREATE OR REPLACE FUNCTION public.get_assigned_teams_for_user(p_user_id UUID)
RETURNS TABLE (
  id          UUID,
  name        TEXT,
  description TEXT,
  season_year INT,
  gender      TEXT,
  age_group   TEXT,
  coach_id    UUID
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT ct.id, ct.name, ct.description, ct.season_year, ct.gender, ct.age_group, ct.coach_id
  FROM coach_teams ct
  JOIN team_coaches tc ON tc.team_id = ct.id
  WHERE tc.user_id = p_user_id;
$$;
