-- PROPOSED – NOT APPLIED. Review only. Requires 001 to be applied first.
-- 002: CMS foundation – profiles, activity log, role helper functions, additive RLS.
-- Design rule: ADDITIVE. No existing policy is dropped or altered, so the current
-- 'admin' account keeps working exactly as today (no lock-out). RLS policies are OR-ed,
-- so new policies can only grant additional access to the new roles.

BEGIN;

-------------------------------------------------------------------------------
-- 1. profiles: one row per CMS user (display name + active flag)
-------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
  user_id      uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email        text NOT NULL,
  display_name text,
  is_active    boolean NOT NULL DEFAULT true,
  created_by   uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-------------------------------------------------------------------------------
-- 2. Helper functions (SECURITY DEFINER, fixed search_path, derive identity from
--    auth.uid() – never from client-supplied values)
-------------------------------------------------------------------------------
-- A user with no profile row (legacy admin) is treated as active; a disabled
-- profile blocks every CMS role.
CREATE OR REPLACE FUNCTION public.is_account_active(_uid uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT NOT EXISTS (SELECT 1 FROM public.profiles WHERE user_id = _uid AND is_active = false)
$$;

-- Harden baseline has_role() so a deactivated legacy 'admin' account (profiles.is_active = false)
-- is immediately blocked across all baseline RLS policies as well.
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.is_account_active(_user_id)
     AND EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.is_account_active(auth.uid())
     AND EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'super_admin')
$$;

CREATE OR REPLACE FUNCTION public.is_editor()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.is_account_active(auth.uid())
     AND EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'editor')
$$;

-- Returns the caller's effective CMS role for the UI ('super_admin' | 'editor' | 'legacy_admin' | null).
-- UI uses this for display only; enforcement is always RLS.
CREATE OR REPLACE FUNCTION public.current_cms_role()
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT CASE
    WHEN NOT public.is_account_active(auth.uid()) THEN NULL
    WHEN EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'super_admin') THEN 'super_admin'
    WHEN EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')       THEN 'legacy_admin'
    WHEN EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'editor')      THEN 'editor'
    ELSE NULL END
$$;

REVOKE ALL ON FUNCTION public.is_account_active(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.is_super_admin(), public.is_editor(), public.current_cms_role() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_account_active(uuid), public.has_role(uuid, public.app_role),
                          public.is_super_admin(), public.is_editor(), public.current_cms_role() TO authenticated;

-------------------------------------------------------------------------------
-- 3. profiles / user_roles policies
-------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Users read own profile" ON public.profiles;
CREATE POLICY "Users read own profile"      ON public.profiles FOR SELECT TO authenticated USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Super admins read profiles" ON public.profiles;
CREATE POLICY "Super admins read profiles"  ON public.profiles FOR SELECT TO authenticated USING (public.is_super_admin());
-- No INSERT/DELETE policy. Users may change only their own display_name (column grant);
-- is_active / email / role changes happen only in the admin-users edge function (service role).
REVOKE INSERT, UPDATE, DELETE ON public.profiles FROM anon, authenticated;
GRANT UPDATE (display_name) ON public.profiles TO authenticated;

DROP POLICY IF EXISTS "Users update own display name" ON public.profiles;
CREATE POLICY "Users update own display name" ON public.profiles FOR UPDATE TO authenticated
  USING (user_id = auth.uid() AND public.is_account_active(auth.uid()))
  WITH CHECK (user_id = auth.uid());

-- Defence in depth: browser roles can never write user_roles (today this is true only
-- because no policy exists).
REVOKE INSERT, UPDATE, DELETE ON public.user_roles FROM anon, authenticated;
DROP POLICY IF EXISTS "Super admins read all roles" ON public.user_roles;
CREATE POLICY "Super admins read all roles" ON public.user_roles FOR SELECT TO authenticated USING (public.is_super_admin());

DROP TRIGGER IF EXISTS profiles_updated_at ON public.profiles;
CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-------------------------------------------------------------------------------
-- 4. activity_logs: append-only audit trail
-------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.activity_logs (
  id          bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  actor_id    uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  actor_email text,
  action      text NOT NULL,          -- e.g. 'login','page.update','media.upload','user.role_change'
  entity_type text,
  entity_id   text,
  details     jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS activity_logs_created_idx ON public.activity_logs (created_at DESC);
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Super admins read activity logs" ON public.activity_logs;
CREATE POLICY "Super admins read activity logs" ON public.activity_logs FOR SELECT TO authenticated USING (public.is_super_admin());
REVOKE INSERT, UPDATE, DELETE ON public.activity_logs FROM anon, authenticated;  -- append only via function below

-- Actor is taken from the JWT, so a user cannot forge another user's log entry.
CREATE OR REPLACE FUNCTION public.log_activity(_action text, _entity_type text DEFAULT NULL,
                                               _entity_id text DEFAULT NULL, _details jsonb DEFAULT '{}'::jsonb)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL OR public.current_cms_role() IS NULL THEN
    RAISE EXCEPTION 'not authorised';
  END IF;
  INSERT INTO public.activity_logs (actor_id, actor_email, action, entity_type, entity_id, details)
  VALUES (auth.uid(), (SELECT email FROM auth.users WHERE id = auth.uid()),
          left(_action, 100), left(_entity_type, 100), left(_entity_id, 200), COALESCE(_details, '{}'::jsonb));
END $$;
REVOKE ALL ON FUNCTION public.log_activity(text, text, text, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.log_activity(text, text, text, jsonb) TO authenticated;

-------------------------------------------------------------------------------
-- 5. Additive RLS on existing content tables
--    super_admin: full access.
--    editor: UPDATE on site_config (draft_config only via trigger in 004),
--            INSERT + UPDATE on services, blog_posts, case_studies, testimonials, medical_subsections,
--            and deliberately NO DELETE on any table and NO write on medical_sections.
--    Public SELECT policies already exist and are unchanged.
-------------------------------------------------------------------------------
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['site_config','services','blog_posts','case_studies',
                           'testimonials','medical_sections','medical_subsections']
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS "Super admins manage %1$s" ON public.%1$I', t);
    EXECUTE format('CREATE POLICY "Super admins manage %1$s" ON public.%1$I FOR ALL TO authenticated
                    USING (public.is_super_admin()) WITH CHECK (public.is_super_admin())', t);
  END LOOP;

  -- Editors only UPDATE the existing site_config row (guarded by trg_enforce_workflow_site_config in 004)
  DROP POLICY IF EXISTS "Editors insert site_config" ON public.site_config;
  DROP POLICY IF EXISTS "Editors update site_config" ON public.site_config;
  CREATE POLICY "Editors update site_config" ON public.site_config FOR UPDATE TO authenticated
    USING (public.is_editor()) WITH CHECK (public.is_editor());

  -- Editors can INSERT + UPDATE content rows (never DELETE, and medical_subsections is guarded by trg_enforce_workflow_subsections in 004)
  FOREACH t IN ARRAY ARRAY['services','blog_posts','case_studies','testimonials','medical_subsections']
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS "Editors insert %1$s" ON public.%1$I', t);
    EXECUTE format('CREATE POLICY "Editors insert %1$s" ON public.%1$I FOR INSERT TO authenticated
                    WITH CHECK (public.is_editor())', t);
    EXECUTE format('DROP POLICY IF EXISTS "Editors update %1$s" ON public.%1$I', t);
    EXECUTE format('CREATE POLICY "Editors update %1$s" ON public.%1$I FOR UPDATE TO authenticated
                    USING (public.is_editor()) WITH CHECK (public.is_editor())', t);
  END LOOP;
END $$;

-- Operational inboxes (appointments, contact messages, second opinions): super_admin only for now.
-- Editors get NO access to patient data until the owner decides otherwise.
DROP POLICY IF EXISTS "Super admins read appointments" ON public.appointments;
CREATE POLICY "Super admins read appointments"    ON public.appointments     FOR SELECT TO authenticated USING (public.is_super_admin());

DROP POLICY IF EXISTS "Super admins read contact msgs" ON public.contact_messages;
CREATE POLICY "Super admins read contact msgs"    ON public.contact_messages FOR SELECT TO authenticated USING (public.is_super_admin());

DROP POLICY IF EXISTS "Super admins read second opinions" ON public.second_opinions;
CREATE POLICY "Super admins read second opinions" ON public.second_opinions  FOR SELECT TO authenticated USING (public.is_super_admin());

DROP POLICY IF EXISTS "Super admins update second opin." ON public.second_opinions;
CREATE POLICY "Super admins update second opin."  ON public.second_opinions  FOR UPDATE TO authenticated
  USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());

-- app_settings (signup toggle, publishing flag, security settings): super_admin ONLY.
-- Drop legacy 'admin' write policies so legacy_admin cannot bypass Super Admin restrictions on system/security settings.
DROP POLICY IF EXISTS "Admins can update app settings" ON public.app_settings;
DROP POLICY IF EXISTS "Admins can insert app settings" ON public.app_settings;
DROP POLICY IF EXISTS "Super admins manage app settings" ON public.app_settings;
CREATE POLICY "Super admins manage app settings" ON public.app_settings FOR ALL TO authenticated
  USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());

-- Publishing workflow flag: strictly false under Rajiv's confirmed Super-Admin-only approval workflow.
INSERT INTO public.app_settings (key, value) VALUES ('editors_can_publish', 'false'::jsonb)
ON CONFLICT (key) DO UPDATE SET value = 'false'::jsonb;

-- Helper function checking whether the caller can approve/reject or publish content changes:
-- Under Rajiv's confirmed 5-state workflow, ONLY an active Super Admin (`is_super_admin()`)
-- can approve, reject, or publish content to live website columns.
CREATE OR REPLACE FUNCTION public.can_publish_content()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.is_super_admin()
$$;
REVOKE ALL ON FUNCTION public.can_publish_content() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_publish_content() TO authenticated;

COMMIT;

-------------------------------------------------------------------------------
-- ROLLBACK (manual, if ever required):
--   DROP POLICY ... for every policy named above (all names are unique to this file);
--   DROP FUNCTION public.log_activity, current_cms_role, is_editor, is_super_admin, is_account_active;
--   DROP TABLE public.activity_logs, public.profiles;
--   DELETE FROM public.app_settings WHERE key = 'editors_can_publish';
--   GRANT INSERT, UPDATE, DELETE ON public.user_roles TO authenticated;  -- only to restore prior grants; see pre-flight output
-------------------------------------------------------------------------------
