-- READ-ONLY checks. Safe to run in the Supabase SQL editor of the TARGET (staging) project.
-- Send the output to the developer. Nothing here modifies data.

-- 1. Which project/DB is this? (compare with the project URL you intend to use)
SELECT current_database(), now();

-- 2. Current roles in use (counts only – no emails)
SELECT role, count(*) FROM public.user_roles GROUP BY role;

-- 3. All RLS policies on app tables and storage (to detect leftover permissive "USING (true)" policies)
SELECT schemaname, tablename, policyname, cmd, roles, qual, with_check
FROM pg_policies WHERE schemaname IN ('public','storage') ORDER BY schemaname, tablename, policyname;

-- 4. Table grants for browser roles
SELECT table_name, grantee, string_agg(privilege_type, ',') AS privileges
FROM information_schema.role_table_grants
WHERE table_schema = 'public' AND grantee IN ('anon','authenticated')
GROUP BY table_name, grantee ORDER BY table_name, grantee;

-- 5. Enum values and existing functions
SELECT enumlabel FROM pg_enum e JOIN pg_type t ON t.oid = e.enumtypid WHERE t.typname = 'app_role';
SELECT proname FROM pg_proc WHERE pronamespace = 'public'::regnamespace;

-- 6. Applied migration history (to confirm repo migrations match this DB)
SELECT version FROM supabase_migrations.schema_migrations ORDER BY version;

-- 7. Storage buckets
SELECT id, public, file_size_limit, allowed_mime_types FROM storage.buckets;

-- 8. Auth settings cannot be queried in SQL: check in Dashboard → Authentication → Providers/Settings
--    (email signups enabled? confirm email? ) and note the answers.
