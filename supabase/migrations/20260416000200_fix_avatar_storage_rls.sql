-- Fix avatar upload RLS for non-admin users when using upsert.
-- The previous UPDATE policy lacked WITH CHECK validation for the new row,
-- which can cause "new row violates row-level security policy".

DROP POLICY IF EXISTS "Users can upload own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own avatar" ON storage.objects;

-- Users can only insert their own avatar file under avatars/{auth.uid()}.*
CREATE POLICY "Users can upload own avatar"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'bva-images'
    AND name LIKE 'avatars/' || auth.uid()::text || '.%'
  );

-- Users can only update their own avatar file under avatars/{auth.uid()}.*
CREATE POLICY "Users can update own avatar"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'bva-images'
    AND name LIKE 'avatars/' || auth.uid()::text || '.%'
  )
  WITH CHECK (
    bucket_id = 'bva-images'
    AND name LIKE 'avatars/' || auth.uid()::text || '.%'
  );

-- Users can only delete their own avatar file under avatars/{auth.uid()}.*
CREATE POLICY "Users can delete own avatar"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'bva-images'
    AND name LIKE 'avatars/' || auth.uid()::text || '.%'
  );
