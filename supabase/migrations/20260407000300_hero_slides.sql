-- Hero slider slides table
CREATE TABLE IF NOT EXISTS public.hero_slides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sort_order INTEGER NOT NULL DEFAULT 0,
  title TEXT NOT NULL DEFAULT '',
  subtitle TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  link TEXT NOT NULL DEFAULT '/',
  image_url TEXT NOT NULL DEFAULT '',
  enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.hero_slides ENABLE ROW LEVEL SECURITY;

-- Admins can manage slides
CREATE POLICY "Admins can manage hero_slides"
  ON public.hero_slides
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Everyone can read enabled slides
CREATE POLICY "Public can read enabled hero_slides"
  ON public.hero_slides
  FOR SELECT
  TO anon, authenticated
  USING (enabled = true);

-- Seed with current slides (images will be uploaded by admin later)
INSERT INTO public.hero_slides (sort_order, title, subtitle, description, link, image_url) VALUES
  (1, 'Beach, Grass & Indoor', 'Tournaments', 'Compete across all formats of volleyball in Bermuda', '/leagues', ''),
  (2, 'National Beach', 'Program', 'Representing Bermuda on the international beach circuit', '/programs/senior', ''),
  (3, 'Junior Women''s', 'Indoor', 'Developing the next generation of female volleyball talent', '/programs/junior/girls', ''),
  (4, 'Men''s National', 'Team', 'Bermuda''s elite men competing on the world stage', '/programs/senior/mens', ''),
  (5, 'Women''s National', 'Team', 'Pride, passion and power — Bermuda''s women''s volleyball', '/programs/senior/womens', ''),
  (6, 'Grass & Indoor', 'Leagues', 'Year-round competitive and recreational league play', '/leagues', '');
