-- Ensure players can read their own past history even when email values contain extra spaces

DROP POLICY IF EXISTS "Players can read own player history" ON public.player_past_history;

CREATE POLICY "Players can read own player history"
  ON public.player_past_history FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.coach_players cp
      WHERE cp.id = player_id
        AND cp.email IS NOT NULL
        AND lower(btrim(cp.email)) = lower(btrim((auth.jwt() ->> 'email')))
    )
  );
