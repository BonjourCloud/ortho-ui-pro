-- STAGING HARNESS FOR 007 (DO NOT RUN ON PRODUCTION). Not a migration.
-- Run as `postgres` in the Supabase SQL editor of a STAGING project after 001 → 005d, the
-- admin_users_rpc migration and 007 are applied. Everything runs inside BEGIN … ROLLBACK, with its
-- own synthetic users, so nothing persists. Any failure raises 'FAIL [...]'; success prints 'PASS [...]'.
--
-- Covers:
--   DP-01 every account defaults to review-required (existing and new)
--   DP-02 browsers cannot change the flag (own row, other rows, RPC) – doctor or Editor
--   DP-03 Editor with the flag OFF cannot publish (RPC bypass attempt)
--   DP-04 Super Admin enables the flag (service-role RPC) → audit row
--   DP-05 Editor with the flag ON publishes their own doctor-profile draft → live + history + audit
--   DP-06 draft containing another user's change cannot be published directly
--   DP-07 not-allow-listed scope (clinic) is refused even with the flag ON
--   DP-08 collections: own inserts/edits publish; removals are refused
--   DP-09 turning the flag OFF blocks the very next publish (checked at publish time)
--   DP-10 role change resets the flag; flag cannot be enabled for a Super Admin; Editor caller refused
--   DP-11 internal helpers are not executable by browsers
--   INV-01 invite events update the profile, are audited, contain no secrets, are service-role only

BEGIN;

DO $$
BEGIN
  INSERT INTO auth.users (id, email, raw_app_meta_data, raw_user_meta_data, aud, role, created_at, updated_at)
  VALUES
    ('00000000-0000-4000-8000-0000000000a1', 'h7_super@orthocarehub.test',  '{"provider":"email"}', '{}', 'authenticated', 'authenticated', now(), now()),
    ('00000000-0000-4000-8000-0000000000a2', 'h7_doctor@orthocarehub.test', '{"provider":"email"}', '{}', 'authenticated', 'authenticated', now(), now()),
    ('00000000-0000-4000-8000-0000000000a3', 'h7_editor2@orthocarehub.test','{"provider":"email"}', '{}', 'authenticated', 'authenticated', now(), now())
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.profiles (user_id, email, display_name, is_active) VALUES
    ('00000000-0000-4000-8000-0000000000a1', 'h7_super@orthocarehub.test',  'H7 Super', true),
    ('00000000-0000-4000-8000-0000000000a2', 'h7_doctor@orthocarehub.test', 'H7 Doctor', true),
    ('00000000-0000-4000-8000-0000000000a3', 'h7_editor2@orthocarehub.test','H7 Editor 2', true)
  ON CONFLICT (user_id) DO NOTHING;

  INSERT INTO public.user_roles (user_id, role) VALUES
    ('00000000-0000-4000-8000-0000000000a1', 'super_admin'),
    ('00000000-0000-4000-8000-0000000000a2', 'editor'),
    ('00000000-0000-4000-8000-0000000000a3', 'editor')
  ON CONFLICT (user_id, role) DO NOTHING;

  -- Start from a clean, published draft state.
  UPDATE public.site_config_drafts SET workflow_status = 'published', contributors = '{}' WHERE scope IN ('doctor', 'clinic');
  UPDATE public.content_collection_drafts
     SET workflow_status = 'published', contributors = '{}', draft = '{"items": [], "deletedIds": []}'
   WHERE collection_key = 'services';
END $$;

-- DP-01 -----------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.profiles WHERE direct_publish_enabled) THEN
    RAISE EXCEPTION 'FAIL [DP-01]: an account has direct publishing enabled by default';
  END IF;
  IF (SELECT column_default FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'direct_publish_enabled') <> 'false' THEN
    RAISE EXCEPTION 'FAIL [DP-01]: direct_publish_enabled default is not false';
  END IF;
  RAISE NOTICE 'PASS [DP-01]: all accounts (existing and new) require review by default.';
END $$;

-- DP-02 / DP-03 as the doctor (Editor, flag OFF) -------------------------------
SET LOCAL role = 'authenticated';
SET LOCAL request.jwt.claims = '{"sub":"00000000-0000-4000-8000-0000000000a2","role":"authenticated"}';
SET LOCAL "request.jwt.claim.sub" = '00000000-0000-4000-8000-0000000000a2';

DO $$
DECLARE v_blocked boolean;
BEGIN
  v_blocked := false;
  BEGIN
    UPDATE public.profiles SET direct_publish_enabled = true WHERE user_id = auth.uid();
  EXCEPTION WHEN insufficient_privilege THEN v_blocked := true;
  END;
  IF NOT v_blocked THEN RAISE EXCEPTION 'FAIL [DP-02]: doctor changed their own publishing permission'; END IF;

  v_blocked := false;
  BEGIN
    PERFORM public.admin_set_direct_publish(auth.uid(), true, '00000000-0000-4000-8000-0000000000a1');
  EXCEPTION WHEN insufficient_privilege THEN v_blocked := true;
  END;
  IF NOT v_blocked THEN RAISE EXCEPTION 'FAIL [DP-02]: browser executed admin_set_direct_publish'; END IF;
  RAISE NOTICE 'PASS [DP-02]: browser sessions cannot change publishing permissions.';

  UPDATE public.site_config_drafts SET draft = draft || '{"yearsExperience": 31}', workflow_status = 'draft'
   WHERE scope = 'doctor';
  v_blocked := false;
  BEGIN
    PERFORM public.publish_site_config_draft('doctor');
  EXCEPTION WHEN insufficient_privilege THEN v_blocked := true;
  END;
  IF NOT v_blocked THEN RAISE EXCEPTION 'FAIL [DP-03]: Editor with direct publishing OFF published'; END IF;
  RAISE NOTICE 'PASS [DP-03]: direct RPC publish refused while the flag is OFF.';
END $$;

-- DP-04 Super Admin enables (service role, as the Edge Function does) ------------
RESET role;
SET LOCAL role = 'service_role';
DO $$
DECLARE v_res jsonb;
BEGIN
  v_res := public.admin_set_direct_publish('00000000-0000-4000-8000-0000000000a2', true, '00000000-0000-4000-8000-0000000000a1');
  IF NOT (v_res ->> 'enabled')::boolean THEN RAISE EXCEPTION 'FAIL [DP-04]: flag not enabled'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.activity_logs
                  WHERE action = 'user.direct_publish_enabled' AND entity_id = '00000000-0000-4000-8000-0000000000a2') THEN
    RAISE EXCEPTION 'FAIL [DP-04]: enabling was not audited';
  END IF;
  IF (SELECT direct_publish_updated_by FROM public.profiles WHERE user_id = '00000000-0000-4000-8000-0000000000a2')
       IS DISTINCT FROM '00000000-0000-4000-8000-0000000000a1'::uuid THEN
    RAISE EXCEPTION 'FAIL [DP-04]: changed-by not recorded';
  END IF;
  RAISE NOTICE 'PASS [DP-04]: Super Admin enabled direct publishing; change audited.';
END $$;

-- DP-05 doctor publishes their own draft directly --------------------------------
RESET role;
SET LOCAL role = 'authenticated';
SET LOCAL request.jwt.claims = '{"sub":"00000000-0000-4000-8000-0000000000a2","role":"authenticated"}';
SET LOCAL "request.jwt.claim.sub" = '00000000-0000-4000-8000-0000000000a2';
DO $$
DECLARE v_new jsonb;
BEGIN
  -- the DP-03 draft was saved by this doctor only
  v_new := public.publish_site_config_draft('doctor');
  IF (v_new ->> 'yearsExperience')::int <> 31 THEN RAISE EXCEPTION 'FAIL [DP-05]: change not live'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.approval_history
                  WHERE entity_type = 'site_config' AND entity_id = 'doctor' AND to_status = 'published'
                    AND actor_id = auth.uid() AND (snapshot ->> 'direct_publish')::boolean) THEN
    RAISE EXCEPTION 'FAIL [DP-05]: direct publish missing from approval_history';
  END IF;
  IF (SELECT cardinality(contributors) FROM public.site_config_drafts WHERE scope = 'doctor') <> 0 THEN
    RAISE EXCEPTION 'FAIL [DP-05]: contributors not reset after publish';
  END IF;
  RAISE NOTICE 'PASS [DP-05]: doctor with the flag ON published their own draft; history recorded.';
END $$;
RESET role;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.activity_logs WHERE action = 'workflow.published_direct' AND entity_id = 'doctor'
                    AND actor_id = '00000000-0000-4000-8000-0000000000a2') THEN
    RAISE EXCEPTION 'FAIL [DP-05]: direct publish not in activity_logs';
  END IF;
END $$;

-- DP-06 another Editor's change in the same draft ------------------------------
SET LOCAL role = 'authenticated';
SET LOCAL request.jwt.claims = '{"sub":"00000000-0000-4000-8000-0000000000a3","role":"authenticated"}';
SET LOCAL "request.jwt.claim.sub" = '00000000-0000-4000-8000-0000000000a3';
UPDATE public.site_config_drafts SET draft = draft || '{"philosophy": "Edited by editor 2"}', workflow_status = 'draft' WHERE scope = 'doctor';

SET LOCAL request.jwt.claims = '{"sub":"00000000-0000-4000-8000-0000000000a2","role":"authenticated"}';
SET LOCAL "request.jwt.claim.sub" = '00000000-0000-4000-8000-0000000000a2';
DO $$
DECLARE v_blocked boolean := false;
BEGIN
  UPDATE public.site_config_drafts SET draft = draft || '{"yearsExperience": 32}' WHERE scope = 'doctor';
  BEGIN
    PERFORM public.publish_site_config_draft('doctor');
  EXCEPTION WHEN insufficient_privilege THEN v_blocked := true;
  END;
  IF NOT v_blocked THEN RAISE EXCEPTION 'FAIL [DP-06]: doctor published a draft containing another user''s change'; END IF;
  RAISE NOTICE 'PASS [DP-06]: drafts with other contributors need Super Admin review.';
END $$;

-- DP-07 clinic scope is never directly publishable ------------------------------
DO $$
DECLARE v_blocked boolean := false;
BEGIN
  UPDATE public.site_config_drafts SET draft = draft || '{"hours": "H7 hours"}', workflow_status = 'draft' WHERE scope = 'clinic';
  BEGIN
    PERFORM public.publish_site_config_draft('clinic');
  EXCEPTION WHEN insufficient_privilege THEN v_blocked := true;
  END;
  IF NOT v_blocked THEN RAISE EXCEPTION 'FAIL [DP-07]: clinic settings published directly'; END IF;
  RAISE NOTICE 'PASS [DP-07]: clinic settings still require review.';
END $$;

-- DP-08 collections ----------------------------------------------------------------
DO $$
DECLARE v_blocked boolean := false; v_res jsonb; v_any uuid;
BEGIN
  UPDATE public.content_collection_drafts
     SET draft = jsonb_build_object('items', jsonb_build_array(
                   jsonb_build_object('id', 'new-h7', 'name', 'H7 Direct Service', 'slug', '__h7_direct_service__')),
                 'deletedIds', '[]'::jsonb),
         workflow_status = 'draft'
   WHERE collection_key = 'services';
  v_res := public.publish_collection_draft('services');
  IF (v_res ->> 'inserted')::int <> 1 THEN RAISE EXCEPTION 'FAIL [DP-08]: own insert not published'; END IF;

  SELECT id INTO v_any FROM public.services WHERE slug = '__h7_direct_service__';
  UPDATE public.content_collection_drafts
     SET draft = jsonb_build_object('items', '[]'::jsonb, 'deletedIds', jsonb_build_array(v_any)),
         workflow_status = 'draft'
   WHERE collection_key = 'services';
  BEGIN
    PERFORM public.publish_collection_draft('services');
  EXCEPTION WHEN insufficient_privilege THEN v_blocked := true;
  END;
  IF NOT v_blocked THEN RAISE EXCEPTION 'FAIL [DP-08]: removal published directly'; END IF;
  RAISE NOTICE 'PASS [DP-08]: own collection inserts publish directly; removals need review.';
END $$;

-- DP-09 disable → next publish blocked ---------------------------------------------
RESET role;
SET LOCAL role = 'service_role';
SELECT public.admin_set_direct_publish('00000000-0000-4000-8000-0000000000a2', false, '00000000-0000-4000-8000-0000000000a1');
RESET role;
SET LOCAL role = 'authenticated';
SET LOCAL request.jwt.claims = '{"sub":"00000000-0000-4000-8000-0000000000a2","role":"authenticated"}';
SET LOCAL "request.jwt.claim.sub" = '00000000-0000-4000-8000-0000000000a2';
DO $$
DECLARE v_blocked boolean := false;
BEGIN
  UPDATE public.content_collection_drafts
     SET draft = jsonb_build_object('items', jsonb_build_array(
                   jsonb_build_object('id', 'new-h7b', 'name', 'H7 After Disable', 'slug', '__h7_after_disable__')),
                 'deletedIds', '[]'::jsonb),
         workflow_status = 'draft'
   WHERE collection_key = 'services';
  BEGIN
    PERFORM public.publish_collection_draft('services');
  EXCEPTION WHEN insufficient_privilege THEN v_blocked := true;
  END;
  IF NOT v_blocked THEN RAISE EXCEPTION 'FAIL [DP-09]: publish succeeded after the flag was turned OFF'; END IF;
  RAISE NOTICE 'PASS [DP-09]: turning the flag OFF takes effect on the next publish.';
END $$;

-- DP-10 role change resets the flag; Super Admin target refused; Editor caller refused --
RESET role;
SET LOCAL role = 'service_role';
DO $$
DECLARE v_blocked boolean;
BEGIN
  PERFORM public.admin_set_direct_publish('00000000-0000-4000-8000-0000000000a3', true, '00000000-0000-4000-8000-0000000000a1');
  PERFORM public.admin_set_user_role('00000000-0000-4000-8000-0000000000a3', 'super_admin', '00000000-0000-4000-8000-0000000000a1');
  PERFORM public.admin_set_user_role('00000000-0000-4000-8000-0000000000a3', 'editor', '00000000-0000-4000-8000-0000000000a1');
  IF (SELECT direct_publish_enabled FROM public.profiles WHERE user_id = '00000000-0000-4000-8000-0000000000a3') THEN
    RAISE EXCEPTION 'FAIL [DP-10]: flag survived a role change';
  END IF;

  v_blocked := false;
  BEGIN
    PERFORM public.admin_set_direct_publish('00000000-0000-4000-8000-0000000000a1', true, '00000000-0000-4000-8000-0000000000a1');
  EXCEPTION WHEN SQLSTATE 'P0010' THEN v_blocked := true;
  END;
  IF NOT v_blocked THEN RAISE EXCEPTION 'FAIL [DP-10]: flag enabled for a Super Admin account'; END IF;

  v_blocked := false;
  BEGIN
    PERFORM public.admin_set_direct_publish('00000000-0000-4000-8000-0000000000a3', true, '00000000-0000-4000-8000-0000000000a2');
  EXCEPTION WHEN insufficient_privilege THEN v_blocked := true;
  END;
  IF NOT v_blocked THEN RAISE EXCEPTION 'FAIL [DP-10]: an Editor changed another account''s publishing permission'; END IF;
  RAISE NOTICE 'PASS [DP-10]: role change resets the flag; only Super Admins can set it, only for Editors.';
END $$;

-- DP-11 / INV-01 privileges ---------------------------------------------------------
RESET role;
DO $$
DECLARE f text;
BEGIN
  FOREACH f IN ARRAY ARRAY[
    'public.admin_set_direct_publish(uuid, boolean, uuid)',
    'public.admin_record_invite_event(uuid, text, uuid, text, text)',
    'public.authorize_cms_publish(text, text, uuid[], boolean)',
    'public.record_direct_publish(text, text, text, jsonb)',
    'public.reset_direct_publish_on_role_change()'] LOOP
    IF has_function_privilege('authenticated', f, 'EXECUTE') OR has_function_privilege('anon', f, 'EXECUTE') THEN
      RAISE EXCEPTION 'FAIL [DP-11]: browser roles can execute %', f;
    END IF;
  END LOOP;
  IF has_column_privilege('authenticated', 'public.profiles', 'direct_publish_enabled', 'UPDATE') THEN
    RAISE EXCEPTION 'FAIL [DP-11]: authenticated has UPDATE on profiles.direct_publish_enabled';
  END IF;
  RAISE NOTICE 'PASS [DP-11]: privileged helpers and columns are server-only.';
END $$;

SET LOCAL role = 'service_role';
DO $$
DECLARE v_details jsonb;
BEGIN
  PERFORM public.admin_record_invite_event('00000000-0000-4000-8000-0000000000a3', 'sent', '00000000-0000-4000-8000-0000000000a1', 'resend', NULL);
  PERFORM public.admin_record_invite_event('00000000-0000-4000-8000-0000000000a3', 'failed', '00000000-0000-4000-8000-0000000000a1', 'resend', 'email_provider_error');
  IF (SELECT invite_status FROM public.profiles WHERE user_id = '00000000-0000-4000-8000-0000000000a3') <> 'failed' THEN
    RAISE EXCEPTION 'FAIL [INV-01]: failed invite not recorded on the profile';
  END IF;
  SELECT details INTO v_details FROM public.activity_logs
   WHERE action = 'user.invite_failed' AND entity_id = '00000000-0000-4000-8000-0000000000a3'
   ORDER BY id DESC LIMIT 1;
  IF v_details IS NULL THEN RAISE EXCEPTION 'FAIL [INV-01]: invite failure not audited'; END IF;
  IF v_details::text ~* '(token|password|access_token|action_link|https?://)' THEN
    RAISE EXCEPTION 'FAIL [INV-01]: audit details contain a secret or link: %', v_details;
  END IF;
  RAISE NOTICE 'PASS [INV-01]: invite events are recorded and audited without secrets.';
END $$;

RESET role;
ROLLBACK;
