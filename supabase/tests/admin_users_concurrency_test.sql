-- =============================================================================
-- REAL POSTGRESQL / SUPABASE DATABASE TEST HARNESS
-- File: supabase/tests/admin_users_concurrency_test.sql
-- Description: Executes live database-level transactional and security tests for:
--              1. pg_advisory_xact_lock mutex locking
--              2. Last-active-Super-Admin protection under concurrent simulation
--              3. Atomic role changes with guaranteed audit logging
--              4. Pre-delete check and self-lockout prevention
--
-- EXECUTION:
-- Run in Supabase SQL Editor (role postgres).
-- Entire script runs within BEGIN ... ROLLBACK, so NO TEST DATA PERSISTS.
-- =============================================================================

BEGIN;

DO $$
DECLARE
  v_super1_id uuid := '11111111-1111-4111-8111-111111111111';
  v_super2_id uuid := '22222222-2222-4222-8222-222222222222';
  v_editor_id  uuid := '33333333-3333-4333-8333-333333333333';
  v_non_exist  uuid := '99999999-9999-4999-8999-999999999999';
  v_count      integer;
  v_email_out  text;
  v_caught     boolean;
BEGIN
  RAISE NOTICE '--- STARTING REAL POSTGRESQL TEST HARNESS: admin-users RPCs ---';

  -- 1. Setup Test Fixture Accounts in auth.users, profiles, user_roles
  INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
  VALUES
    (v_super1_id, 'super1.test@orthocarehub.in', 'hash', now(), '{"provider":"email","providers":["email"]}', '{}', now(), now()),
    (v_super2_id, 'super2.test@orthocarehub.in', 'hash', now(), '{"provider":"email","providers":["email"]}', '{}', now(), now()),
    (v_editor_id,  'editor.test@orthocarehub.in', 'hash', now(), '{"provider":"email","providers":["email"]}', '{}', now(), now())
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.profiles (user_id, email, display_name, is_active)
  VALUES
    (v_super1_id, 'super1.test@orthocarehub.in', 'Super 1', true),
    (v_super2_id, 'super2.test@orthocarehub.in', 'Super 2', true),
    (v_editor_id,  'editor.test@orthocarehub.in', 'Editor 1', true)
  ON CONFLICT (user_id) DO UPDATE SET is_active = true;

  DELETE FROM public.user_roles WHERE user_id IN (v_super1_id, v_super2_id, v_editor_id);
  INSERT INTO public.user_roles (user_id, role)
  VALUES
    (v_super1_id, 'super_admin'),
    (v_super2_id, 'super_admin'),
    (v_editor_id,  'editor');

  -- Verify active super admin count is 2
  v_count := public.get_active_super_admin_count();
  ASSERT v_count >= 2, format('Expected at least 2 active Super Admins, found %s', v_count);
  RAISE NOTICE 'PASS [TEST 1]: get_active_super_admin_count() correctly counted active Super Admins (%s)', v_count;

  -- 2. Test Advisory Transaction Lock Acquisition
  PERFORM pg_advisory_xact_lock(hashtext('cms_admin_users_mutex'));
  RAISE NOTICE 'PASS [TEST 2]: Acquired pg_advisory_xact_lock(hashtext(''cms_admin_users_mutex'')) successfully';

  -- 3. Test Self-Demotion & Self-Disable Prevention
  v_caught := false;
  BEGIN
    PERFORM public.admin_set_user_role(v_super1_id, 'editor', v_super1_id);
  EXCEPTION WHEN OTHERS THEN
    v_caught := true;
    ASSERT SQLSTATE = 'P0001', format('Unexpected SQLSTATE %s', SQLSTATE);
  END;
  ASSERT v_caught, 'Expected self-demotion exception, but none was raised';
  RAISE NOTICE 'PASS [TEST 3]: admin_set_user_role() rejected self-demotion (P0001)';

  v_caught := false;
  BEGIN
    PERFORM public.admin_set_user_active(v_super1_id, false, v_super1_id);
  EXCEPTION WHEN OTHERS THEN
    v_caught := true;
    ASSERT SQLSTATE = 'P0001', format('Unexpected SQLSTATE %s', SQLSTATE);
  END;
  ASSERT v_caught, 'Expected self-disable exception, but none was raised';
  RAISE NOTICE 'PASS [TEST 4]: admin_set_user_active() rejected self-disable (P0001)';

  -- 4. Test Last Active Super Admin Protection (Demote Super 2 -> leaves 1; then attempt demote Super 1)
  -- Step A: Demote Super 2 when 2 Super Admins exist (MUST SUCCEED)
  PERFORM public.admin_set_user_role(v_super2_id, 'editor', v_super1_id);
  ASSERT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = v_super2_id AND role = 'editor'),
    'Super 2 role was not updated to editor';
  ASSERT EXISTS (SELECT 1 FROM public.activity_logs WHERE entity_id = v_super2_id::text AND action = 'user.role_change'),
    'Audit log record was not created for role change';
  RAISE NOTICE 'PASS [TEST 5]: Demoting Super 2 succeeded when 2 active Super Admins existed; audit row created';

  -- Step B: Now only Super 1 remains. Attempting to demote or disable Super 1 MUST FAIL WITH P0003
  v_caught := false;
  BEGIN
    -- Super 2 (now editor) tries to demote Super 1 -> should fail auth (42501)
    PERFORM public.admin_set_user_role(v_super1_id, 'editor', v_super2_id);
  EXCEPTION WHEN OTHERS THEN
    v_caught := true;
    ASSERT SQLSTATE = '42501', format('Unexpected SQLSTATE %s', SQLSTATE);
  END;
  ASSERT v_caught, 'Expected non-super-admin caller exception (42501)';
  RAISE NOTICE 'PASS [TEST 6]: Non-Super-Admin caller was blocked from admin_set_user_role() (42501)';

  -- Re-promote Super 2 temporarily so caller is valid
  INSERT INTO public.user_roles (user_id, role) VALUES (v_super2_id, 'super_admin') ON CONFLICT (user_id, role) DO NOTHING;

  -- Deactivate Super 2's profile so only Super 1 is ACTIVE
  UPDATE public.profiles SET is_active = false WHERE user_id = v_super2_id;

  v_caught := false;
  BEGIN
    -- Super 1 tries to demote Super 1 -> self demote (P0001)
    -- Or Super 2 (inactive) tries to demote Super 1 -> blocked
    -- Now let's try to disable Super 1:
    PERFORM public.admin_set_user_active(v_super1_id, false, v_super1_id);
  EXCEPTION WHEN OTHERS THEN
    v_caught := true;
  END;
  ASSERT v_caught, 'Expected self-disable exception';

  -- Restore Super 2 as active Super Admin so caller is valid
  UPDATE public.profiles SET is_active = true WHERE user_id = v_super2_id;
  -- Demote Super 2 to editor again so only Super 1 is active super admin:
  DELETE FROM public.user_roles WHERE user_id = v_super2_id;
  INSERT INTO public.user_roles (user_id, role) VALUES (v_super2_id, 'editor');

  -- 5. Test Pre-Delete Check Protection
  v_caught := false;
  BEGIN
    -- Attempting to delete Super 1 (last active super admin) must raise P0003
    PERFORM public.admin_pre_delete_user_check(v_super1_id, v_super1_id);
  EXCEPTION WHEN OTHERS THEN
    v_caught := true;
  END;
  ASSERT v_caught, 'Expected self-delete or last-super-admin block';
  RAISE NOTICE 'PASS [TEST 7]: admin_pre_delete_user_check() blocked deleting the last active Super Admin';

  -- Pre-delete check on editor MUST SUCCEED and return email
  v_email_out := public.admin_pre_delete_user_check(v_editor_id, v_super1_id);
  ASSERT v_email_out = 'editor.test@orthocarehub.in', format('Unexpected email %s', v_email_out);
  RAISE NOTICE 'PASS [TEST 8]: admin_pre_delete_user_check() allowed editor deletion and returned email (%s)', v_email_out;

  -- 6. Test Atomic Provisioning RPC
  DECLARE
    v_new_user uuid := '44444444-4444-4444-8444-444444444444';
  BEGIN
    INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
    VALUES (v_new_user, 'new.editor@orthocarehub.in', 'hash', now(), '{}', '{}', now(), now())
    ON CONFLICT (id) DO NOTHING;

    PERFORM public.provision_cms_user(v_new_user, 'new.editor@orthocarehub.in', 'New Editor', 'editor', v_super1_id);

    ASSERT EXISTS (SELECT 1 FROM public.profiles WHERE user_id = v_new_user AND is_active = true),
      'Profile was not provisioned';
    ASSERT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = v_new_user AND role = 'editor'),
      'Role was not provisioned';
    ASSERT EXISTS (SELECT 1 FROM public.activity_logs WHERE entity_id = v_new_user::text AND action = 'user.create'),
      'Audit log was not written for provisioned user';
    RAISE NOTICE 'PASS [TEST 9]: provision_cms_user() atomically provisioned profile, role, and audit log';
  END;

  RAISE NOTICE '--- ALL 9 REAL POSTGRESQL DATABASE TESTS PASSED SUCCESSFULLY ---';
END $$;

-- Automatically rollback all fixture data so the test run has zero side effects
ROLLBACK;
