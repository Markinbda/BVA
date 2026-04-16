-- SECURITY DEFINER function: returns players on teams a user is assigned to
-- This bypasses RLS so an assigned coach can see players on shared teams
CREATE OR REPLACE FUNCTION public.get_players_for_assigned_teams(p_user_id UUID)
RETURNS TABLE (
  id                  UUID,
  coach_id            UUID,
  team_id             UUID,
  first_name          TEXT,
  last_name           TEXT,
  date_of_birth       DATE,
  age                 INTEGER,
  team                TEXT,
  height              TEXT,
  weight              TEXT,
  volleyball_position TEXT,
  email               TEXT,
  notes               TEXT,
  created_at          TIMESTAMPTZ,
  updated_at          TIMESTAMPTZ
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT cp.id, cp.coach_id, cp.team_id, cp.first_name, cp.last_name,
         cp.date_of_birth, cp.age, cp.team, cp.height, cp.weight,
         cp.volleyball_position, cp.email, cp.notes, cp.created_at, cp.updated_at
  FROM coach_players cp
  JOIN team_coaches tc ON tc.team_id = cp.team_id
  WHERE tc.user_id = p_user_id
    AND cp.coach_id <> p_user_id;  -- exclude own players (already fetched directly)
$$;
