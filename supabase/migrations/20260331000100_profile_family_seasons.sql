-- Extend profiles table with full member data
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS avatar_url TEXT,
  ADD COLUMN IF NOT EXISTS phone TEXT,
  ADD COLUMN IF NOT EXISTS date_of_birth DATE,
  ADD COLUMN IF NOT EXISTS address TEXT,
  ADD COLUMN IF NOT EXISTS roles TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS volleyball_formats TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS team_formats TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS medical_notes TEXT,
  ADD COLUMN IF NOT EXISTS emergency_contact_name TEXT,
  ADD COLUMN IF NOT EXISTS emergency_contact_phone TEXT,
  ADD COLUMN IF NOT EXISTS experience_level TEXT,
  ADD COLUMN IF NOT EXISTS photo_consent BOOLEAN DEFAULT false;

-- Allow users to insert their own profile (needed for upsert on signup)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename='profiles' AND policyname='Users can insert own profile'
  ) THEN
    CREATE POLICY "Users can insert own profile" ON public.profiles
      FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

-- Allow users to upload their own avatar to storage
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename='objects' AND policyname='Users can upload own avatar'
  ) THEN
    CREATE POLICY "Users can upload own avatar" ON storage.objects
      FOR INSERT WITH CHECK (
        bucket_id = 'bva-images' AND
        name LIKE 'avatars/%'
      );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename='objects' AND policyname='Users can update own avatar'
  ) THEN
    CREATE POLICY "Users can update own avatar" ON storage.objects
      FOR UPDATE USING (
        bucket_id = 'bva-images' AND
        name LIKE 'avatars/%'
      );
  END IF;
END $$;

-- Family members table
CREATE TABLE IF NOT EXISTS public.family_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  full_name TEXT NOT NULL,
  date_of_birth DATE,
  role TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.family_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own family members" ON public.family_members;
CREATE POLICY "Users can view own family members" ON public.family_members
  FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can insert own family members" ON public.family_members;
CREATE POLICY "Users can insert own family members" ON public.family_members
  FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can update own family members" ON public.family_members;
CREATE POLICY "Users can update own family members" ON public.family_members
  FOR UPDATE USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can delete own family members" ON public.family_members;
CREATE POLICY "Users can delete own family members" ON public.family_members
  FOR DELETE USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Admins can manage all family members" ON public.family_members;
CREATE POLICY "Admins can manage all family members" ON public.family_members
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Season participation table (admin-managed, user-readable)
CREATE TABLE IF NOT EXISTS public.season_participation (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  family_member_id UUID REFERENCES public.family_members(id) ON DELETE SET NULL,
  season_name TEXT NOT NULL,
  year INTEGER NOT NULL,
  format TEXT NOT NULL,
  team_name TEXT,
  team_logo_url TEXT,
  division TEXT,
  placement INTEGER,
  roster JSONB DEFAULT '[]',
  match_results JSONB DEFAULT '[]',
  coach_notes TEXT,
  awards TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.season_participation ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own season history" ON public.season_participation;
CREATE POLICY "Users can view own season history" ON public.season_participation
  FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Admins can manage all season participation" ON public.season_participation;
CREATE POLICY "Admins can manage all season participation" ON public.season_participation
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));
