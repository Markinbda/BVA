-- Add sort_order to league_teams for manual ordering within a rung
ALTER TABLE public.league_teams ADD COLUMN IF NOT EXISTS sort_order INTEGER NOT NULL DEFAULT 0;

-- Create league_team_players table for roster management
CREATE TABLE IF NOT EXISTS public.league_team_players (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  team_id UUID NOT NULL REFERENCES public.league_teams(id) ON DELETE CASCADE,
  player_name TEXT NOT NULL,
  jersey_number TEXT,
  position TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.league_team_players ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read league_team_players"
  ON public.league_team_players FOR SELECT USING (true);

CREATE POLICY "Admins can insert league_team_players"
  ON public.league_team_players FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update league_team_players"
  ON public.league_team_players FOR UPDATE
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete league_team_players"
  ON public.league_team_players FOR DELETE
  USING (has_role(auth.uid(), 'admin'::app_role));
