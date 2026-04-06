-- event_categories table
CREATE TABLE IF NOT EXISTS public.event_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  color text NOT NULL DEFAULT '#3b82f6',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.event_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read event_categories" ON public.event_categories FOR SELECT USING (true);
CREATE POLICY "Admins can insert event_categories" ON public.event_categories FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can update event_categories" ON public.event_categories FOR UPDATE USING (public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can delete event_categories" ON public.event_categories FOR DELETE USING (public.has_role(auth.uid(), 'admin'::app_role));

-- event_locations table
CREATE TABLE IF NOT EXISTS public.event_locations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  address text,
  city text,
  province text,
  postal_code text,
  country text DEFAULT 'Bermuda',
  latitude numeric,
  longitude numeric,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.event_locations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read event_locations" ON public.event_locations FOR SELECT USING (true);
CREATE POLICY "Admins can insert event_locations" ON public.event_locations FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can update event_locations" ON public.event_locations FOR UPDATE USING (public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can delete event_locations" ON public.event_locations FOR DELETE USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Extend events table
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS start_time text;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS end_time text;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS category_id uuid REFERENCES public.event_categories(id) ON DELETE SET NULL;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS location_id uuid REFERENCES public.event_locations(id) ON DELETE SET NULL;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS notes text;

-- Seed some default categories
INSERT INTO public.event_categories (name, color) VALUES
  ('League', '#3b82f6'),
  ('Tournament', '#f97316'),
  ('Camp', '#22c55e'),
  ('National Team', '#a855f7'),
  ('Social', '#ec4899'),
  ('Other', '#6b7280')
ON CONFLICT DO NOTHING;

-- Seed some default locations
INSERT INTO public.event_locations (name, address, city, country) VALUES
  ('Horseshoe Bay Beach', 'Horseshoe Bay', 'Southampton', 'Bermuda'),
  ('Elbow Beach', 'Elbow Beach', 'Paget', 'Bermuda'),
  ('CedarBridge Academy Gymnasium', 'North Shore Road', 'Devonshire', 'Bermuda'),
  ('Warwick Academy Gymnasium', 'Middle Road', 'Warwick', 'Bermuda'),
  ('TBD', '', '', 'Bermuda')
ON CONFLICT DO NOTHING;
