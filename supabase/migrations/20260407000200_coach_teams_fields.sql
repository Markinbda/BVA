-- Add year, gender, and age_group fields to coach_teams
ALTER TABLE public.coach_teams
  ADD COLUMN IF NOT EXISTS season_year INTEGER,
  ADD COLUMN IF NOT EXISTS gender TEXT,
  ADD COLUMN IF NOT EXISTS age_group TEXT;
