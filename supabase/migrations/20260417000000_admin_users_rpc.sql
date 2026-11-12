-- Migration: 20260417000000_admin_users_rpc.sql
-- Description: Server-side atomic RPCs for admin-users Edge Function with PostgreSQL advisory transaction
--              locking, last-active-Super-Admin concurrency protection, and atomic audit logging.
-- Execution: Restricted exclusively to service_role (never accessible to anon or authenticated browser clients).

BEGIN;

-- 1. Helper function: Get count of currently active Super Admins
CREATE OR REPLACE FUNCTION public.get_active_super_admin_count()
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT count(DISTINCT r.user_id)::integer
  FROM public.user_roles r
  JOIN public.profiles p ON p.user_id = r.user_id
  WHERE r.role = 'super_admin'
    AND p.is_active = true;
$$;

REVOKE ALL ON FUNCTION public.get_active_super_admin_count() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_active_super_admin_count() TO service_role;

-- 2. Atomic Provisioning: Profile + Role + Audit in a single transaction
CREATE OR REPLACE FUNCTION public.provision_cms_user(
  _user_id uuid,
  _email text,
  _display_name text,
  _role public.app_role,
  _caller_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_email text;
BEGIN
  -- Acquire transaction-scoped advisory lock for CMS user admin mutations
  PERFORM pg_advisory_xact_lock(hashtext('cms_admin_users_mutex'));

  -- Verify caller is an active Super Admin
  IF NOT (public.has_role(_caller_id, 'super_admin') AND public.is_account_active(_caller_id)) THEN
    RAISE EXCEPTION 'Caller is not an active Super Admin' USING ERRCODE = '42501';
  END IF;

  -- Upsert profile record
  INSERT INTO public.profiles (user_id, email, display_name, is_active, created_by, updated_at)
  VALUES (_user_id, lower(btrim(_email)), _display_name, true, _caller_id, now())
  ON CONFLICT (user_id) DO UPDATE
    SET email = EXCLUDED.email,
        display_name = EXCLUDED.display_name,
        is_active = true,
        updated_at = now();

  -- Set role atomically
  DELETE FROM public.user_roles WHERE user_id = _user_id;
  INSERT INTO public.user_roles (user_id, role)
  VALUES (_user_id, _role);

  -- Record audit log in the same transaction
  SELECT email INTO v_caller_email FROM auth.users WHERE id = _caller_id;
  INSERT INTO public.activity_logs (actor_id, actor_email, action, entity_type, entity_id, details)
  VALUES (
    _caller_id,
    v_caller_email,
    'user.create',
    'user',
    _user_id::text,
    jsonb_build_object('email', lower(btrim(_email)), 'role', _role::text)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.provision_cms_user(uuid, text, text, public.app_role, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.provision_cms_user(uuid, text, text, public.app_role, uuid) TO service_role;

-- 3. Atomic Role Change with Mutex Lock, Last-Super-Admin Check, and Audit Logging
CREATE OR REPLACE FUNCTION public.admin_set_user_role(
  _target_user_id uuid,
  _new_role public.app_role,
  _caller_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_email text;
  v_target_is_super_admin boolean;
  v_target_is_active boolean;
  v_active_super_admins integer;
BEGIN
  -- 1. Acquire transaction-scoped advisory lock
  -- Any concurrent request across any server instance will block here until this transaction commits or aborts
  PERFORM pg_advisory_xact_lock(hashtext('cms_admin_users_mutex'));

  -- 2. Verify caller is active Super Admin
  IF NOT (public.has_role(_caller_id, 'super_admin') AND public.is_account_active(_caller_id)) THEN
    RAISE EXCEPTION 'Caller is not an active Super Admin' USING ERRCODE = '42501';
  END IF;

  -- 3. Self-demotion guard
  IF _target_user_id = _caller_id AND _new_role != 'super_admin' THEN
    RAISE EXCEPTION 'Self-lockout prevention: cannot demote your own Super Admin account' USING ERRCODE = 'P0001';
  END IF;

  -- 4. Verify target user exists
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = _target_user_id) AND
     NOT EXISTS (SELECT 1 FROM public.profiles WHERE user_id = _target_user_id) THEN
    RAISE EXCEPTION 'Target user does not exist' USING ERRCODE = 'P0002';
  END IF;

  -- 5. Last active Super Admin protection
  IF _new_role != 'super_admin' THEN
    SELECT EXISTS (
      SELECT 1 FROM public.user_roles WHERE user_id = _target_user_id AND role = 'super_admin'
    ) INTO v_target_is_super_admin;

    SELECT coalesce(is_active, true) INTO v_target_is_active
    FROM public.profiles WHERE user_id = _target_user_id;

    IF v_target_is_super_admin AND v_target_is_active THEN
      v_active_super_admins := public.get_active_super_admin_count();
      IF v_active_super_admins <= 1 THEN
        RAISE EXCEPTION 'Cannot demote the last active Super Admin. At least one active Super Admin must remain.' USING ERRCODE = 'P0003';
      END IF;
    END IF;
  END IF;

  -- 6. Atomic role update
  DELETE FROM public.user_roles WHERE user_id = _target_user_id;
  INSERT INTO public.user_roles (user_id, role)
  VALUES (_target_user_id, _new_role);

  -- 7. Audit log in same transaction
  SELECT email INTO v_caller_email FROM auth.users WHERE id = _caller_id;
  INSERT INTO public.activity_logs (actor_id, actor_email, action, entity_type, entity_id, details)
  VALUES (
    _caller_id,
    v_caller_email,
    'user.role_change',
    'user',
    _target_user_id::text,
    jsonb_build_object('role', _new_role::text)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.admin_set_user_role(uuid, public.app_role, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_set_user_role(uuid, public.app_role, uuid) TO service_role;

-- 4. Atomic Status Change (Active/Disable) with Mutex Lock, Last-Super-Admin Check, and Audit Logging
CREATE OR REPLACE FUNCTION public.admin_set_user_active(
  _target_user_id uuid,
  _is_active boolean,
  _caller_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_email text;
  v_target_is_super_admin boolean;
  v_target_is_active boolean;
  v_active_super_admins integer;
BEGIN
  -- 1. Acquire transaction-scoped advisory lock
  PERFORM pg_advisory_xact_lock(hashtext('cms_admin_users_mutex'));

  -- 2. Verify caller is active Super Admin
  IF NOT (public.has_role(_caller_id, 'super_admin') AND public.is_account_active(_caller_id)) THEN
    RAISE EXCEPTION 'Caller is not an active Super Admin' USING ERRCODE = '42501';
  END IF;

  -- 3. Self-disable guard
  IF _target_user_id = _caller_id AND _is_active = false THEN
    RAISE EXCEPTION 'Self-lockout prevention: cannot disable your own Super Admin account' USING ERRCODE = 'P0001';
  END IF;

  -- 4. Verify target user exists
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = _target_user_id) AND
     NOT EXISTS (SELECT 1 FROM public.profiles WHERE user_id = _target_user_id) THEN
    RAISE EXCEPTION 'Target user does not exist' USING ERRCODE = 'P0002';
  END IF;

  -- 5. Last active Super Admin protection
  IF _is_active = false THEN
    SELECT EXISTS (
      SELECT 1 FROM public.user_roles WHERE user_id = _target_user_id AND role = 'super_admin'
    ) INTO v_target_is_super_admin;

    SELECT coalesce(is_active, true) INTO v_target_is_active
    FROM public.profiles WHERE user_id = _target_user_id;

    IF v_target_is_super_admin AND v_target_is_active THEN
      v_active_super_admins := public.get_active_super_admin_count();
      IF v_active_super_admins <= 1 THEN
        RAISE EXCEPTION 'Cannot disable the last active Super Admin. At least one active Super Admin must remain.' USING ERRCODE = 'P0003';
      END IF;
    END IF;
  END IF;

  -- 6. Update profile status
  UPDATE public.profiles
  SET is_active = _is_active,
      updated_at = now()
  WHERE user_id = _target_user_id;

  -- 7. Audit log in same transaction
  SELECT email INTO v_caller_email FROM auth.users WHERE id = _caller_id;
  INSERT INTO public.activity_logs (actor_id, actor_email, action, entity_type, entity_id, details)
  VALUES (
    _caller_id,
    v_caller_email,
    CASE WHEN _is_active THEN 'user.enable' ELSE 'user.disable' END,
    'user',
    _target_user_id::text,
    jsonb_build_object('is_active', _is_active)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.admin_set_user_active(uuid, boolean, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_set_user_active(uuid, boolean, uuid) TO service_role;

-- 5. Pre-Delete Check with Mutex Lock: Guarantees user can be safely deleted before calling Auth API
CREATE OR REPLACE FUNCTION public.admin_pre_delete_user_check(
  _target_user_id uuid,
  _caller_id uuid
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_target_email text;
  v_target_is_super_admin boolean;
  v_target_is_active boolean;
  v_active_super_admins integer;
BEGIN
  -- 1. Acquire transaction-scoped advisory lock
  PERFORM pg_advisory_xact_lock(hashtext('cms_admin_users_mutex'));

  -- 2. Verify caller is active Super Admin
  IF NOT (public.has_role(_caller_id, 'super_admin') AND public.is_account_active(_caller_id)) THEN
    RAISE EXCEPTION 'Caller is not an active Super Admin' USING ERRCODE = '42501';
  END IF;

  -- 3. Self-delete guard
  IF _target_user_id = _caller_id THEN
    RAISE EXCEPTION 'Self-lockout prevention: cannot delete your own Super Admin account' USING ERRCODE = 'P0001';
  END IF;

  -- 4. Verify target user exists and get email
  SELECT email INTO v_target_email FROM auth.users WHERE id = _target_user_id;
  IF v_target_email IS NULL THEN
    SELECT email INTO v_target_email FROM public.profiles WHERE user_id = _target_user_id;
  END IF;

  IF v_target_email IS NULL THEN
    RAISE EXCEPTION 'Target user does not exist' USING ERRCODE = 'P0002';
  END IF;

  -- 5. Last active Super Admin protection
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _target_user_id AND role = 'super_admin'
  ) INTO v_target_is_super_admin;

  SELECT coalesce(is_active, true) INTO v_target_is_active
  FROM public.profiles WHERE user_id = _target_user_id;

  IF v_target_is_super_admin AND v_target_is_active THEN
    v_active_super_admins := public.get_active_super_admin_count();
    IF v_active_super_admins <= 1 THEN
      RAISE EXCEPTION 'Cannot delete the last active Super Admin. At least one active Super Admin must remain.' USING ERRCODE = 'P0003';
    END IF;
  END IF;

  RETURN v_target_email;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_pre_delete_user_check(uuid, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_pre_delete_user_check(uuid, uuid) TO service_role;

-- 6. Record Deletion Audit Event after confirmed Auth deletion
CREATE OR REPLACE FUNCTION public.admin_record_delete_audit(
  _target_user_id uuid,
  _target_email text,
  _caller_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_email text;
BEGIN
  SELECT email INTO v_caller_email FROM auth.users WHERE id = _caller_id;
  INSERT INTO public.activity_logs (actor_id, actor_email, action, entity_type, entity_id, details)
  VALUES (
    _caller_id,
    v_caller_email,
    'user.delete',
    'user',
    _target_user_id::text,
    jsonb_build_object('email', _target_email)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.admin_record_delete_audit(uuid, text, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_record_delete_audit(uuid, text, uuid) TO service_role;

COMMIT;
