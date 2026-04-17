-- Allow coaches to see videos shared with all coaches
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Security-definer helper to check user_permissions
--    (avoids RLS recursion when used inside another table's policy)
CREATE OR REPLACE FUNCTION public.has_permission(_user_id UUID, _permission TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_permissions
    WHERE user_id = _user_id AND permission = _permission
  )
$$;

-- 2. Allow any user with manage_coaches permission to read all_coaches videos
DROP POLICY IF EXISTS "coach_videos_select_shared" ON public.coach_videos;
CREATE POLICY "coach_videos_select_shared"
  ON public.coach_videos
  FOR SELECT
  USING (
    visibility = 'all_coaches'
    AND public.has_permission(auth.uid(), 'manage_coaches')
  );
