
-- League seasons table
CREATE TABLE public.league_seasons (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  num_weeks INTEGER NOT NULL DEFAULT 12,
  num_rungs INTEGER NOT NULL DEFAULT 2,
  teams_per_rung INTEGER NOT NULL DEFAULT 5,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.league_seasons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read league_seasons" ON public.league_seasons FOR SELECT USING (true);
CREATE POLICY "Admins can insert league_seasons" ON public.league_seasons FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can update league_seasons" ON public.league_seasons FOR UPDATE USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can delete league_seasons" ON public.league_seasons FOR DELETE USING (has_role(auth.uid(), 'admin'::app_role));

-- League teams table
CREATE TABLE public.league_teams (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  season_id UUID NOT NULL REFERENCES public.league_seasons(id) ON DELETE CASCADE,
  team_name TEXT NOT NULL,
  current_rung INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.league_teams ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read league_teams" ON public.league_teams FOR SELECT USING (true);
CREATE POLICY "Admins can insert league_teams" ON public.league_teams FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can update league_teams" ON public.league_teams FOR UPDATE USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can delete league_teams" ON public.league_teams FOR DELETE USING (has_role(auth.uid(), 'admin'::app_role));

-- League matches table
CREATE TABLE public.league_matches (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  season_id UUID NOT NULL REFERENCES public.league_seasons(id) ON DELETE CASCADE,
  week_number INTEGER NOT NULL,
  rung INTEGER NOT NULL,
  team_a_id UUID NOT NULL REFERENCES public.league_teams(id) ON DELETE CASCADE,
  team_b_id UUID NOT NULL REFERENCES public.league_teams(id) ON DELETE CASCADE,
  score_a INTEGER,
  score_b INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.league_matches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read league_matches" ON public.league_matches FOR SELECT USING (true);
CREATE POLICY "Admins can insert league_matches" ON public.league_matches FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can update league_matches" ON public.league_matches FOR UPDATE USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can delete league_matches" ON public.league_matches FOR DELETE USING (has_role(auth.uid(), 'admin'::app_role));

-- League weekly standings table
CREATE TABLE public.league_weekly_standings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  season_id UUID NOT NULL REFERENCES public.league_seasons(id) ON DELETE CASCADE,
  week_number INTEGER NOT NULL,
  team_id UUID NOT NULL REFERENCES public.league_teams(id) ON DELETE CASCADE,
  rung INTEGER NOT NULL,
  position INTEGER NOT NULL,
  points_awarded INTEGER NOT NULL,
  wins INTEGER NOT NULL DEFAULT 0,
  losses INTEGER NOT NULL DEFAULT 0,
  point_diff INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.league_weekly_standings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read league_weekly_standings" ON public.league_weekly_standings FOR SELECT USING (true);
CREATE POLICY "Admins can insert league_weekly_standings" ON public.league_weekly_standings FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can update league_weekly_standings" ON public.league_weekly_standings FOR UPDATE USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can delete league_weekly_standings" ON public.league_weekly_standings FOR DELETE USING (has_role(auth.uid(), 'admin'::app_role));
