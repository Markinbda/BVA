-- Past team/event history captured by coaches for player profiles

CREATE TABLE IF NOT EXISTS public.player_past_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id UUID NOT NULL REFERENCES public.coach_players(id) ON DELETE CASCADE,
  coach_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  team_name TEXT NOT NULL,
  team_members JSONB NOT NULL DEFAULT '[]'::jsonb,
  event_name TEXT NOT NULL,
  event_date DATE,
  event_location TEXT,
  placement INTEGER,
  result_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.player_past_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Coaches can manage own player history" ON public.player_past_history;
CREATE POLICY "Coaches can manage own player history"
  ON public.player_past_history FOR ALL
  USING (auth.uid() = coach_id)
  WITH CHECK (auth.uid() = coach_id);

DROP POLICY IF EXISTS "Admins can manage all player history" ON public.player_past_history;
CREATE POLICY "Admins can manage all player history"
  ON public.player_past_history FOR ALL
  USING (public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Players can read own player history" ON public.player_past_history;
CREATE POLICY "Players can read own player history"
  ON public.player_past_history FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.coach_players cp
      WHERE cp.id = player_id
        AND cp.email IS NOT NULL
        AND lower(cp.email) = lower((auth.jwt() ->> 'email'))
    )
  );

CREATE INDEX IF NOT EXISTS player_past_history_player_id_idx ON public.player_past_history (player_id);
CREATE INDEX IF NOT EXISTS player_past_history_coach_id_idx ON public.player_past_history (coach_id);
CREATE INDEX IF NOT EXISTS player_past_history_event_date_idx ON public.player_past_history (event_date DESC);

DROP TRIGGER IF EXISTS player_past_history_updated_at ON public.player_past_history;
CREATE TRIGGER player_past_history_updated_at
  BEFORE UPDATE ON public.player_past_history
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
