-- ============================================================
-- Fix: Create all tables that are missing from the live DB
-- Run this once in the Supabase SQL editor
-- ============================================================

-- 1. user_permissions (was created without public. prefix, missing RLS)
CREATE TABLE IF NOT EXISTS public.user_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  permission text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, permission)
);

ALTER TABLE public.user_permissions ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='user_permissions' AND policyname='Users can read own permissions') THEN
    CREATE POLICY "Users can read own permissions" ON public.user_permissions FOR SELECT USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='user_permissions' AND policyname='Admins can read all permissions') THEN
    CREATE POLICY "Admins can read all permissions" ON public.user_permissions FOR SELECT USING (public.has_role(auth.uid(), 'admin'::app_role));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='user_permissions' AND policyname='Admins can insert permissions') THEN
    CREATE POLICY "Admins can insert permissions" ON public.user_permissions FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='user_permissions' AND policyname='Admins can delete permissions') THEN
    CREATE POLICY "Admins can delete permissions" ON public.user_permissions FOR DELETE USING (public.has_role(auth.uid(), 'admin'::app_role));
  END IF;
END $$;

-- 2. admin_audit_logs (was created without public. prefix, details should be jsonb)
CREATE TABLE IF NOT EXISTS public.admin_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.profiles(user_id),
  action text NOT NULL,
  target_path text,
  details jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS admin_audit_logs_created_at_idx ON public.admin_audit_logs (created_at);

ALTER TABLE public.admin_audit_logs ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='admin_audit_logs' AND policyname='Admins can read audit logs') THEN
    CREATE POLICY "Admins can read audit logs" ON public.admin_audit_logs FOR SELECT USING (public.has_role(auth.uid(), 'admin'::app_role));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='admin_audit_logs' AND policyname='Admins can insert audit logs') THEN
    CREATE POLICY "Admins can insert audit logs" ON public.admin_audit_logs FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));
  END IF;
END $$;

-- 3. content_edit_versions (was created without public. prefix, no RLS)
CREATE TABLE IF NOT EXISTS public.content_edit_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  page_path text NOT NULL,
  editor_id uuid NOT NULL REFERENCES public.profiles(user_id),
  status text NOT NULL,
  changes jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS content_edit_versions_page_path_idx ON public.content_edit_versions (page_path);
CREATE INDEX IF NOT EXISTS content_edit_versions_created_at_idx ON public.content_edit_versions (created_at);

ALTER TABLE public.content_edit_versions ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='content_edit_versions' AND policyname='Admins can read content versions') THEN
    CREATE POLICY "Admins can read content versions" ON public.content_edit_versions FOR SELECT USING (public.has_role(auth.uid(), 'admin'::app_role));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='content_edit_versions' AND policyname='Admins can insert content versions') THEN
    CREATE POLICY "Admins can insert content versions" ON public.content_edit_versions FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));
  END IF;
END $$;

-- 4. Extend profiles with member fields (safe to run multiple times)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS avatar_url text,
  ADD COLUMN IF NOT EXISTS phone text,
  ADD COLUMN IF NOT EXISTS date_of_birth date,
  ADD COLUMN IF NOT EXISTS address text,
  ADD COLUMN IF NOT EXISTS roles text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS volleyball_formats text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS team_formats text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS medical_notes text,
  ADD COLUMN IF NOT EXISTS emergency_contact_name text,
  ADD COLUMN IF NOT EXISTS emergency_contact_phone text,
  ADD COLUMN IF NOT EXISTS experience_level text,
  ADD COLUMN IF NOT EXISTS photo_consent boolean DEFAULT false;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='profiles' AND policyname='Users can insert own profile') THEN
    CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

-- 5. family_members
CREATE TABLE IF NOT EXISTS public.family_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  full_name text NOT NULL,
  date_of_birth date,
  role text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.family_members ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='family_members' AND policyname='Users can view own family members') THEN
    CREATE POLICY "Users can view own family members" ON public.family_members FOR SELECT USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='family_members' AND policyname='Users can insert own family members') THEN
    CREATE POLICY "Users can insert own family members" ON public.family_members FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='family_members' AND policyname='Users can update own family members') THEN
    CREATE POLICY "Users can update own family members" ON public.family_members FOR UPDATE USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='family_members' AND policyname='Users can delete own family members') THEN
    CREATE POLICY "Users can delete own family members" ON public.family_members FOR DELETE USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='family_members' AND policyname='Admins can manage all family members') THEN
    CREATE POLICY "Admins can manage all family members" ON public.family_members FOR ALL USING (public.has_role(auth.uid(), 'admin'::app_role));
  END IF;
END $$;

-- 6. season_participation
CREATE TABLE IF NOT EXISTS public.season_participation (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  family_member_id uuid REFERENCES public.family_members(id) ON DELETE SET NULL,
  season_name text NOT NULL,
  year integer NOT NULL,
  format text NOT NULL,
  team_name text,
  team_logo_url text,
  division text,
  placement integer,
  roster jsonb DEFAULT '[]',
  match_results jsonb DEFAULT '[]',
  coach_notes text,
  awards text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.season_participation ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='season_participation' AND policyname='Users can view own season history') THEN
    CREATE POLICY "Users can view own season history" ON public.season_participation FOR SELECT USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='season_participation' AND policyname='Admins can manage all season participation') THEN
    CREATE POLICY "Admins can manage all season participation" ON public.season_participation FOR ALL USING (public.has_role(auth.uid(), 'admin'::app_role));
  END IF;
END $$;

-- 7. follow_requests
CREATE TABLE IF NOT EXISTS public.follow_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  recipient_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (requester_id, recipient_id)
);

ALTER TABLE public.follow_requests ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='follow_requests' AND policyname='Users can view own follow requests') THEN
    CREATE POLICY "Users can view own follow requests" ON public.follow_requests FOR SELECT USING (auth.uid() = requester_id OR auth.uid() = recipient_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='follow_requests' AND policyname='Users can send follow requests') THEN
    CREATE POLICY "Users can send follow requests" ON public.follow_requests FOR INSERT WITH CHECK (auth.uid() = requester_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='follow_requests' AND policyname='Recipients can update follow requests') THEN
    CREATE POLICY "Recipients can update follow requests" ON public.follow_requests FOR UPDATE USING (auth.uid() = recipient_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='follow_requests' AND policyname='Users can delete own follow requests') THEN
    CREATE POLICY "Users can delete own follow requests" ON public.follow_requests FOR DELETE USING (auth.uid() = requester_id OR auth.uid() = recipient_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='follow_requests' AND policyname='Admins can manage all follow requests') THEN
    CREATE POLICY "Admins can manage all follow requests" ON public.follow_requests FOR ALL USING (public.has_role(auth.uid(), 'admin'::app_role));
  END IF;
END $$;
