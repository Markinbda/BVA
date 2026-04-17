-- Allow coach/admin upload analytics events to be written to system audit logs.
-- This is idempotent and keeps admin read access unchanged.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'admin_audit_logs'
      AND policyname = 'System users can insert video upload audit logs'
  ) THEN
    CREATE POLICY "System users can insert video upload audit logs"
      ON public.admin_audit_logs
      FOR INSERT
      WITH CHECK (
        auth.uid() = user_id
        AND (
          public.has_role(auth.uid(), 'admin'::public.app_role)
          OR EXISTS (
            SELECT 1
            FROM public.user_permissions up
            WHERE up.user_id = auth.uid()
              AND up.permission IN ('manage_coaches', 'admin_access', 'super_admin')
          )
        )
      );
  END IF;
END $$;
