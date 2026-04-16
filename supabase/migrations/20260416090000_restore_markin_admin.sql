-- Break-glass recovery: restore admin access for the site owner account.
-- Safe to run multiple times.
DO $$
DECLARE
  v_user_id UUID;
  v_display_name TEXT;
BEGIN
  SELECT id, COALESCE(raw_user_meta_data->>'display_name', email)
  INTO v_user_id, v_display_name
  FROM auth.users
  WHERE LOWER(email) = LOWER('markinbda@outlook.com')
  LIMIT 1;

  IF v_user_id IS NULL THEN
    RAISE NOTICE 'Admin recovery skipped: user markinbda@outlook.com not found in auth.users';
    RETURN;
  END IF;

  INSERT INTO public.profiles (user_id, display_name)
  VALUES (v_user_id, v_display_name)
  ON CONFLICT (user_id) DO NOTHING;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (v_user_id, 'admin'::public.app_role)
  ON CONFLICT (user_id, role) DO NOTHING;

  INSERT INTO public.user_permissions (user_id, permission)
  VALUES (v_user_id, 'admin_access')
  ON CONFLICT (user_id, permission) DO NOTHING;
END;
$$;