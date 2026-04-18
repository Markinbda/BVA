-- Normalized player email lookup for consistent auth/profile/player portal matching

CREATE OR REPLACE FUNCTION public.get_players_by_email_normalized(p_email TEXT)
RETURNS TABLE (
  id UUID,
  first_name TEXT,
  last_name TEXT,
  team TEXT,
  team_id UUID,
  volleyball_position TEXT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    cp.id,
    cp.first_name,
    cp.last_name,
    cp.team,
    cp.team_id,
    cp.volleyball_position
  FROM public.coach_players cp
  WHERE cp.email IS NOT NULL
    AND lower(btrim(cp.email)) = lower(btrim(p_email));
$$;

GRANT EXECUTE ON FUNCTION public.get_players_by_email_normalized(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_players_by_email_normalized(TEXT) TO service_role;
