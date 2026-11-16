-- PROPOSED – NOT APPLIED. HIGH-PRIORITY PRIVACY FIX (finding S4). Requires 002.
-- Today ANY authenticated user can read every patient report in the private bucket
-- because migration 20260218135536 created "Authenticated users can view second opinion reports"
-- with USING (bucket_id = 'second-opinion-reports' AND auth.role() = 'authenticated').
-- In PostgreSQL RLS, permissive policies are OR-ed together. Therefore, the old permissive
-- policy MUST be explicitly dropped (not merely supplemented) before creating the restricted policy.

BEGIN;
DROP POLICY IF EXISTS "Authenticated users can view second opinion reports" ON storage.objects;
DROP POLICY IF EXISTS "Admins can view second opinion reports" ON storage.objects;

DROP POLICY IF EXISTS "Super admins view second opinion reports" ON storage.objects;
-- Super Admin only (legacy 'admin' is retired in 005b; user_roles had 0 rows at preflight).
-- is_super_admin() already returns false for a deactivated profile.
CREATE POLICY "Super admins view second opinion reports" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'second-opinion-reports' AND public.is_super_admin());
COMMIT;

-- POST-APPLY VERIFICATION QUERY (SELECT policy only; INSERT policies keep their check in with_check):
--   SELECT policyname, cmd, qual FROM pg_policies
--   WHERE schemaname = 'storage' AND tablename = 'objects' AND qual ILIKE '%second-opinion-reports%';
--   -> expect exactly 1 row: "Super admins view second opinion reports" (SELECT)
--
-- ROLLBACK (only if ever required — restores original permissive policy; NOT recommended):
--   BEGIN;
--   DROP POLICY IF EXISTS "Super admins view second opinion reports" ON storage.objects;
--   CREATE POLICY "Authenticated users can view second opinion reports" ON storage.objects FOR SELECT
--     USING (bucket_id = 'second-opinion-reports' AND auth.role() = 'authenticated');
--   COMMIT;
