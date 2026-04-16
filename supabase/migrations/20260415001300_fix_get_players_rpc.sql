-- Update RPC to match players by either team_id UUID OR team name text
-- This handles both records that have team_id set AND legacy records (team_id NULL, team name text)
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
  SELECT DISTINCT cp.id, cp.coach_id, cp.team_id, cp.first_name, cp.last_name,
         cp.date_of_birth, cp.age, cp.team, cp.height, cp.weight,
         cp.volleyball_position, cp.email, cp.notes, cp.created_at, cp.updated_at
  FROM coach_players cp
  JOIN team_coaches tc ON (
    tc.team_id = cp.team_id
    OR EXISTS (
      SELECT 1 FROM coach_teams ct
      WHERE ct.id = tc.team_id AND ct.name = cp.team
    )
  )
  WHERE tc.user_id = p_user_id
    AND cp.coach_id <> p_user_id;
$$;
