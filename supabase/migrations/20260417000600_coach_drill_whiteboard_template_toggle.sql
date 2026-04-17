-- Persist per-drill preference for showing the default whiteboard template
ALTER TABLE public.coach_drills
ADD COLUMN IF NOT EXISTS show_whiteboard_template BOOLEAN NOT NULL DEFAULT true;