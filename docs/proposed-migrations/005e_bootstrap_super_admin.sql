-- ONE-TIME SUPER ADMIN BOOTSTRAP — NOT A MIGRATION. Never copy into supabase/migrations/.
-- Run ONCE in the Supabase SQL editor (role postgres) AFTER 001 → 002 → 003 → 004 → 005 → 005b →
-- 005c → 005d have each committed, and BEFORE the 006 harness.
--
-- Supersedes the bootstrap snippets in the 005b footer and in docs/CMS_DEPLOYMENT_AND_HANDOVER.md
-- (that version matched email case-sensitively, silently did nothing when the email was wrong,
-- did not check confirmation/ban/deletion, and wrote no audit row).
--
-- What it does, all in one transaction (any failed check aborts and changes nothing):
--   1. Confirms the CMS schema it depends on exists (001, 002, 005b).
--   2. Finds EXACTLY ONE auth user for the email (case-insensitive) that is email-confirmed,
--      not soft-deleted, not banned.
--   3. Refuses if a DIFFERENT user already holds super_admin (later accounts must be created with
--      the admin-users Edge Function). Re-running for the SAME user is a safe no-op.
--   4. Upserts the profile as active (keeps an existing display_name), sets exactly one role
--      (super_admin) for this user, and writes an activity_logs audit row.
--
-- Target account: the existing, confirmed staging login for project dctqrzhmgpuhnizunelm.
-- Replace the email below with a placeholder before committing this file if you prefer.

BEGIN;

DO $$
DECLARE
  v_email     text := lower(btrim('vaishnavbkumbhar@gmail.com'));
  v_matches   int;
  v_uid       uuid;
  v_auth_mail text;
  v_confirmed timestamptz;
  v_banned    timestamptz;
  v_deleted   timestamptz;
  v_already   boolean;
BEGIN
  -- 1. Schema preconditions
  IF NOT EXISTS (SELECT 1 FROM pg_enum e JOIN pg_type t ON t.oid = e.enumtypid
                  WHERE t.typname = 'app_role' AND e.enumlabel = 'super_admin') THEN
    RAISE EXCEPTION 'BOOTSTRAP: app_role has no super_admin value. Apply 001 first.';
  END IF;
  IF to_regclass('public.profiles') IS NULL OR to_regclass('public.activity_logs') IS NULL
     OR to_regprocedure('public.current_cms_role()') IS NULL THEN
    RAISE EXCEPTION 'BOOTSTRAP: profiles / activity_logs / current_cms_role() missing. Apply 002 first.';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint
                  WHERE conname = 'user_roles_cms_roles_only' AND conrelid = 'public.user_roles'::regclass) THEN
    RAISE EXCEPTION 'BOOTSTRAP: user_roles_cms_roles_only constraint missing. Apply 005b first.';
  END IF;

  -- 2. Exactly one usable auth account
  SELECT count(*) INTO v_matches FROM auth.users WHERE lower(email) = v_email;
  IF v_matches = 0 THEN
    RAISE EXCEPTION 'BOOTSTRAP: no auth user with email %. Sign up / invite the account first.', v_email;
  ELSIF v_matches > 1 THEN
    RAISE EXCEPTION 'BOOTSTRAP: % auth users match % (case-insensitive). Resolve duplicates first.', v_matches, v_email;
  END IF;

  SELECT id, email, email_confirmed_at, banned_until, deleted_at
    INTO v_uid, v_auth_mail, v_confirmed, v_banned, v_deleted
    FROM auth.users WHERE lower(email) = v_email;

  IF v_confirmed IS NULL THEN
    RAISE EXCEPTION 'BOOTSTRAP: % has not confirmed their email. Confirm it in Authentication → Users first.', v_email;
  END IF;
  IF v_deleted IS NOT NULL THEN
    RAISE EXCEPTION 'BOOTSTRAP: % is soft-deleted.', v_email;
  END IF;
  IF v_banned IS NOT NULL AND v_banned > now() THEN
    RAISE EXCEPTION 'BOOTSTRAP: % is banned until %.', v_email, v_banned;
  END IF;

  -- 3. One-time rule
  IF EXISTS (SELECT 1 FROM public.user_roles WHERE role = 'super_admin' AND user_id <> v_uid) THEN
    RAISE EXCEPTION 'BOOTSTRAP: another user already holds super_admin. Use the admin-users Edge Function instead.';
  END IF;
  v_already := EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = v_uid AND role = 'super_admin');

  -- 4. Profile (active), single role, audit row
  INSERT INTO public.profiles (user_id, email, display_name, is_active)
  VALUES (v_uid, v_auth_mail, 'Super Admin', true)
  ON CONFLICT (user_id) DO UPDATE
    SET is_active = true, email = EXCLUDED.email, updated_at = now();

  DELETE FROM public.user_roles WHERE user_id = v_uid AND role <> 'super_admin';
  INSERT INTO public.user_roles (user_id, role)
  VALUES (v_uid, 'super_admin')
  ON CONFLICT (user_id, role) DO NOTHING;

  IF NOT v_already THEN
    INSERT INTO public.activity_logs (actor_id, actor_email, action, entity_type, entity_id, details)
    VALUES (v_uid, v_auth_mail, 'user.bootstrap_super_admin', 'user', v_uid::text,
            jsonb_build_object('method', 'sql_editor', 'file', '005e_bootstrap_super_admin.sql'));
    RAISE NOTICE 'BOOTSTRAP: super_admin assigned to % (%).', v_auth_mail, v_uid;
  ELSE
    RAISE NOTICE 'BOOTSTRAP: % already holds super_admin; profile re-activated, nothing else changed.', v_auth_mail;
  END IF;
END $$;

COMMIT;

-------------------------------------------------------------------------------
-- VERIFICATION (read-only; run as a separate script AFTER the commit above).
-- Impersonates the account exactly as PostgREST would, then rolls back.
-- Expected single row:  super_admin | true | true | true | 3 | 4 | 1
-------------------------------------------------------------------------------
-- BEGIN;
-- SELECT set_config('request.jwt.claims',
--        json_build_object('sub', id, 'role', 'authenticated', 'email', email)::text, true)
--   FROM auth.users WHERE lower(email) = lower('vaishnavbkumbhar@gmail.com');
-- SET LOCAL role authenticated;
-- SELECT public.current_cms_role()                         AS cms_role,      -- 'super_admin'
--        public.is_super_admin()                           AS is_super,      -- true
--        public.can_publish_content()                      AS can_publish,   -- true
--        public.is_account_active(auth.uid())              AS active,        -- true
--        (SELECT count(*) FROM public.site_config_drafts)  AS config_drafts, -- 3
--        (SELECT count(*) FROM public.content_collection_drafts) AS collection_drafts, -- 4
--        (SELECT count(*) FROM public.user_roles WHERE user_id = auth.uid()) AS role_rows; -- 1
-- ROLLBACK;
--
-- ROLLBACK OF THE BOOTSTRAP (only if ever required):
--   DELETE FROM public.user_roles WHERE role = 'super_admin'
--     AND user_id = (SELECT id FROM auth.users WHERE lower(email) = lower('vaishnavbkumbhar@gmail.com'));
