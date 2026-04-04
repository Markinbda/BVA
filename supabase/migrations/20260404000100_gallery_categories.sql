CREATE TABLE IF NOT EXISTS public.gallery_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.gallery_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read gallery_categories" ON public.gallery_categories
  FOR SELECT USING (true);
CREATE POLICY "Admins can manage gallery_categories" ON public.gallery_categories
  FOR ALL USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Seed from existing distinct categories in gallery_photos
INSERT INTO public.gallery_categories (name, sort_order)
SELECT DISTINCT category, ROW_NUMBER() OVER (ORDER BY category) - 1
FROM public.gallery_photos
ON CONFLICT (name) DO NOTHING;

-- Ensure a General category always exists
INSERT INTO public.gallery_categories (name, sort_order) VALUES ('General', 0)
ON CONFLICT (name) DO NOTHING;
