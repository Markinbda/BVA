-- Allow coaches to read teams they are assigned to via team_coaches
DROP POLICY IF EXISTS "Assigned coaches can read teams" ON public.coach_teams;
CREATE POLICY "Assigned coaches can read teams"
  ON public.coach_teams FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.team_coaches tc
      WHERE tc.team_id = id
        AND tc.user_id = auth.uid()
    )
  );
