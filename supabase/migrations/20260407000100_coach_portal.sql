-- =============================================
-- COACH PORTAL TABLES
-- =============================================

-- Coach Teams (e.g. U14 Girls, U16 Boys, Varsity)
CREATE TABLE public.coach_teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.coach_teams ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Coaches can manage own teams"
  ON public.coach_teams FOR ALL
  USING (auth.uid() = coach_id)
  WITH CHECK (auth.uid() = coach_id);

CREATE POLICY "Admins can manage all teams"
  ON public.coach_teams FOR ALL
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Coach Players
CREATE TABLE public.coach_players (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  team_id UUID REFERENCES public.coach_teams(id) ON DELETE SET NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  date_of_birth DATE,
  age INTEGER,
  team TEXT NOT NULL DEFAULT '',
  height TEXT,
  weight TEXT,
  volleyball_position TEXT,
  email TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.coach_players ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Coaches can manage own players"
  ON public.coach_players FOR ALL
  USING (auth.uid() = coach_id)
  WITH CHECK (auth.uid() = coach_id);

CREATE POLICY "Admins can manage all players"
  ON public.coach_players FOR ALL
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Auto-update updated_at on coach_players
CREATE TRIGGER coach_players_updated_at
  BEFORE UPDATE ON public.coach_players
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Email History
CREATE TABLE public.coach_email_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  recipients TEXT[] NOT NULL DEFAULT '{}',
  team_names TEXT[] DEFAULT '{}',
  attachments JSONB NOT NULL DEFAULT '[]',
  status TEXT NOT NULL DEFAULT 'sent',
  error_message TEXT,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.coach_email_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Coaches can view own email history"
  ON public.coach_email_history FOR SELECT
  USING (auth.uid() = coach_id);

CREATE POLICY "Coaches can insert own email history"
  ON public.coach_email_history FOR INSERT
  WITH CHECK (auth.uid() = coach_id);

CREATE POLICY "Admins can view all email history"
  ON public.coach_email_history FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Indexes
CREATE INDEX coach_players_coach_id_idx ON public.coach_players (coach_id);
CREATE INDEX coach_players_team_id_idx ON public.coach_players (team_id);
CREATE INDEX coach_teams_coach_id_idx ON public.coach_teams (coach_id);
CREATE INDEX coach_email_history_coach_id_idx ON public.coach_email_history (coach_id);
CREATE INDEX coach_email_history_sent_at_idx ON public.coach_email_history (sent_at DESC);
