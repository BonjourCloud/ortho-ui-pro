-- PROPOSED – NOT APPLIED. Review only.
-- 007: Per-user direct publishing (Super Admin controlled) + invitation tracking for CMS users.
--
-- Requires: 001 → 005d (incl. 005b/005c/005d) and supabase/migrations/20260417000000_admin_users_rpc.sql.
-- Order:    … → 005d → bootstrap (005e) → 007 → 007b harness (staging only).
-- Re-run rule: 007 redefines publish_site_config_draft (005c) and publish_collection_draft (005d).
--              If 005c or 005d is ever re-run, re-run 007 after it, or those functions lose the
--              direct-publishing branch (they stay safe: Super Admin + approved only).
--
-- WHAT THIS DOES
--   1. profiles.direct_publish_enabled (NOT NULL DEFAULT false) + who/when it was last changed.
--      Every existing and every new account starts with review required. Nothing is switched on here.
--   2. profiles invitation tracking columns (status, last sent, attempts, last short error code).
--   3. Browser roles can never write any of those columns (column grants + guard trigger).
--   4. Any role (re)assignment resets direct publishing to OFF.
--   5. Draft tables record who changed the open draft (`contributors`). A direct publish is refused
--      if anybody other than the caller changed it ("cannot publish another person's content").
--   6. publish_site_config_draft / publish_collection_draft accept, in addition to the unchanged
--      Super Admin + approved path, an Editor whose direct-publishing flag is ON *at call time*,
--      for allow-listed content only, for drafts only they changed, and never removals.
--   7. Service-role-only RPCs used by the admin-users Edge Function: set the flag, record invite events.
--   8. All of the above write activity_logs / approval_history. No tokens, links or passwords are logged.
--
-- WHAT THIS DOES NOT DO
--   * No new role. The doctor signs in with an `editor` account, exactly as today.
--   * Clinic information and Branding (site-wide settings) always need Super Admin review.
--   * Pages, SEO and Treatment pages are out of scope: their publish paths are not yet gated by an
--     approved-draft database function (see CMS_MODULE_COMPLETION_REPORT §2.7/§2.8), so there is no
--     safe server-side gate to extend. Editors still cannot publish them.

BEGIN;

-------------------------------------------------------------------------------
-- 1. profiles: direct publishing permission + invitation tracking
-------------------------------------------------------------------------------
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS direct_publish_enabled    boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS direct_publish_updated_at timestamptz,
  ADD COLUMN IF NOT EXISTS direct_publish_updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS invite_status             text,
  ADD COLUMN IF NOT EXISTS invite_last_sent_at       timestamptz,
  ADD COLUMN IF NOT EXISTS invite_send_count         integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS invite_last_error         text;

ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_invite_status_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_invite_status_check
  CHECK (invite_status IS NULL OR invite_status IN ('pending', 'accepted', 'failed'));
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_invite_last_error_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_invite_last_error_check
  CHECK (invite_last_error IS NULL OR char_length(invite_last_error) <= 300);

-- Defence in depth: browser roles keep only UPDATE (display_name) from 002.
REVOKE UPDATE (direct_publish_enabled, direct_publish_updated_at, direct_publish_updated_by,
               invite_status, invite_last_sent_at, invite_send_count, invite_last_error)
  ON public.profiles FROM anon, authenticated;

-- Guard trigger: even if a future grant is added by mistake, a browser session cannot change
-- these columns (own row or anyone else's).
CREATE OR REPLACE FUNCTION public.guard_profile_privileged_columns()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
BEGIN
  IF current_user NOT IN ('anon', 'authenticated') THEN
    RETURN NEW;
  END IF;
  IF NEW.direct_publish_enabled    IS DISTINCT FROM OLD.direct_publish_enabled
  OR NEW.direct_publish_updated_at IS DISTINCT FROM OLD.direct_publish_updated_at
  OR NEW.direct_publish_updated_by IS DISTINCT FROM OLD.direct_publish_updated_by
  OR NEW.invite_status             IS DISTINCT FROM OLD.invite_status
  OR NEW.invite_last_sent_at       IS DISTINCT FROM OLD.invite_last_sent_at
  OR NEW.invite_send_count         IS DISTINCT FROM OLD.invite_send_count
  OR NEW.invite_last_error         IS DISTINCT FROM OLD.invite_last_error
  OR NEW.is_active                 IS DISTINCT FROM OLD.is_active
  OR NEW.email                     IS DISTINCT FROM OLD.email THEN
    RAISE EXCEPTION 'Only a Super Admin can change account permissions.' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.guard_profile_privileged_columns() FROM PUBLIC, anon;

DROP TRIGGER IF EXISTS trg_guard_profile_privileged_columns ON public.profiles;
CREATE TRIGGER trg_guard_profile_privileged_columns
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.guard_profile_privileged_columns();

-------------------------------------------------------------------------------
-- 2. Any role (re)assignment resets direct publishing to OFF.
--    provision_cms_user / admin_set_user_role delete + insert the user_roles row, so this fires on
--    every role change. A promoted-then-demoted account never silently keeps direct publishing.
-------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.reset_direct_publish_on_role_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.profiles
     SET direct_publish_enabled = false,
         direct_publish_updated_at = now(),
         direct_publish_updated_by = NULL,
         updated_at = now()
   WHERE user_id = NEW.user_id
     AND direct_publish_enabled;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.reset_direct_publish_on_role_change() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_reset_direct_publish_on_role_change ON public.user_roles;
CREATE TRIGGER trg_reset_direct_publish_on_role_change
  AFTER INSERT ON public.user_roles
  FOR EACH ROW EXECUTE FUNCTION public.reset_direct_publish_on_role_change();

-------------------------------------------------------------------------------
-- 3. Which content a direct publisher may publish (mirrored in src/lib/cms/directPublish.ts and
--    checked by directPublish.test.ts). Format: '<kind>:<key>'.
--    Excluded on purpose: site_config:clinic and site_config:branding (site-wide settings).
-------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.direct_publish_targets()
RETURNS text[] LANGUAGE sql IMMUTABLE SET search_path = public AS $$
  SELECT ARRAY[
    'site_config:doctor',
    'collection:services',
    'collection:blog_posts',
    'collection:case_studies',
    'collection:testimonials'
  ]::text[]
$$;

-- True only for an active Editor whose flag is ON right now, for an allow-listed target.
-- Evaluated inside the publish functions at publish time (not when the draft was saved).
CREATE OR REPLACE FUNCTION public.can_direct_publish(_target text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT auth.uid() IS NOT NULL
     AND public.is_editor()
     AND NOT public.is_super_admin()
     AND _target = ANY (public.direct_publish_targets())
     AND EXISTS (
       SELECT 1 FROM public.profiles p
        WHERE p.user_id = auth.uid()
          AND p.is_active = true
          AND p.direct_publish_enabled = true)
$$;

REVOKE ALL ON FUNCTION public.direct_publish_targets(), public.can_direct_publish(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.direct_publish_targets(), public.can_direct_publish(text) TO authenticated;

-------------------------------------------------------------------------------
-- 4. Contributors of the open draft (server-maintained; browsers cannot write it).
-------------------------------------------------------------------------------
ALTER TABLE public.site_config_drafts        ADD COLUMN IF NOT EXISTS contributors uuid[] NOT NULL DEFAULT '{}'::uuid[];
ALTER TABLE public.content_collection_drafts ADD COLUMN IF NOT EXISTS contributors uuid[] NOT NULL DEFAULT '{}'::uuid[];

-- Drafts already open when 007 is applied: we do not know every author, so mark them with the nil
-- UUID. That blocks direct publishing of those drafts until a Super Admin publishes them through review.
UPDATE public.site_config_drafts
   SET contributors = ARRAY['00000000-0000-0000-0000-000000000000'::uuid]
 WHERE workflow_status <> 'published' AND cardinality(contributors) = 0;
UPDATE public.content_collection_drafts
   SET contributors = ARRAY['00000000-0000-0000-0000-000000000000'::uuid]
 WHERE workflow_status <> 'published' AND cardinality(contributors) = 0;

CREATE OR REPLACE FUNCTION public.track_cms_draft_contributors()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
BEGIN
  IF current_user NOT IN ('anon', 'authenticated') THEN
    RETURN NEW;  -- publish functions (function owner) reset the list themselves
  END IF;
  NEW.contributors := OLD.contributors;
  IF NEW.draft IS DISTINCT FROM OLD.draft AND auth.uid() IS NOT NULL
     AND NOT (auth.uid() = ANY (OLD.contributors)) THEN
    NEW.contributors := OLD.contributors || auth.uid();
  END IF;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.track_cms_draft_contributors() FROM PUBLIC, anon;

DROP TRIGGER IF EXISTS trg_track_site_config_draft_contributors ON public.site_config_drafts;
CREATE TRIGGER trg_track_site_config_draft_contributors
  BEFORE UPDATE ON public.site_config_drafts
  FOR EACH ROW EXECUTE FUNCTION public.track_cms_draft_contributors();

DROP TRIGGER IF EXISTS trg_track_collection_draft_contributors ON public.content_collection_drafts;
CREATE TRIGGER trg_track_collection_draft_contributors
  BEFORE UPDATE ON public.content_collection_drafts
  FOR EACH ROW EXECUTE FUNCTION public.track_cms_draft_contributors();

-- Column grants from 005c/005d stay: authenticated may UPDATE (draft, workflow_status, review_feedback) only.

-------------------------------------------------------------------------------
-- 5. Shared authorisation for both publish functions.
--    Returns true for a direct publish, false for a Super Admin publish, raises otherwise.
--    Not callable by browsers (only from the SECURITY DEFINER publish functions).
-------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.authorize_cms_publish(
  _target text, _status text, _contributors uuid[], _has_removals boolean
)
RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF public.is_super_admin() THEN
    IF _status <> 'approved' THEN
      RAISE EXCEPTION 'Only approved changes can be published (current status: %).', _status;
    END IF;
    RETURN false;
  END IF;

  IF NOT public.can_direct_publish(_target) THEN
    RAISE EXCEPTION 'Your account must submit this change for Super Admin review.' USING ERRCODE = '42501';
  END IF;
  IF _status NOT IN ('draft', 'pending_approval') THEN
    RAISE EXCEPTION 'Save your changes as a draft before publishing (current status: %).', _status;
  END IF;
  IF _contributors IS DISTINCT FROM ARRAY[auth.uid()] THEN
    RAISE EXCEPTION 'This draft includes changes made by another CMS user. Submit it for Super Admin review instead.'
      USING ERRCODE = '42501';
  END IF;
  IF _has_removals THEN
    RAISE EXCEPTION 'Removing items always needs Super Admin review.' USING ERRCODE = '42501';
  END IF;
  RETURN true;
END $$;
REVOKE ALL ON FUNCTION public.authorize_cms_publish(text, text, uuid[], boolean) FROM PUBLIC, anon, authenticated;

-- History + audit for a direct publish (record_workflow_transition only accepts Super Admins for
-- 'published', and must stay that way because browsers can call it).
CREATE OR REPLACE FUNCTION public.record_direct_publish(
  _entity_type text, _entity_id text, _from_status text, _snapshot jsonb
)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_email text;
BEGIN
  SELECT email INTO v_email FROM auth.users WHERE id = auth.uid();
  INSERT INTO public.approval_history (entity_type, entity_id, from_status, to_status, actor_id, actor_email,
                                       actor_role, feedback, snapshot)
  VALUES (left(_entity_type, 100), left(_entity_id, 200), _from_status, 'published', auth.uid(), v_email,
          'editor', NULL, jsonb_build_object('direct_publish', true, 'changes', COALESCE(_snapshot, '{}'::jsonb)));
  INSERT INTO public.activity_logs (actor_id, actor_email, action, entity_type, entity_id, details)
  VALUES (auth.uid(), v_email, 'workflow.published_direct', left(_entity_type, 100), left(_entity_id, 200),
          jsonb_build_object('from_status', _from_status, 'to_status', 'published', 'direct_publish', true));
END $$;
REVOKE ALL ON FUNCTION public.record_direct_publish(text, text, text, jsonb) FROM PUBLIC, anon, authenticated;

-------------------------------------------------------------------------------
-- 6. publish_site_config_draft (replaces 005c §6; body unchanged except the authorisation block,
--    contributors reset and the direct-publish history branch).
-------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.publish_site_config_draft(_scope text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_row       public.site_config_drafts%ROWTYPE;
  v_patch     jsonb;
  v_config_id uuid;
  v_new       jsonb;
  v_count     int;
  v_direct    boolean;
BEGIN
  IF NOT (public.is_super_admin() OR public.is_editor()) THEN
    RAISE EXCEPTION 'Only a Super Admin can publish site settings.' USING ERRCODE = '42501';
  END IF;
  IF _scope IS NULL OR _scope NOT IN ('clinic', 'doctor', 'branding') THEN
    RAISE EXCEPTION 'Unsupported scope: %', _scope;
  END IF;

  SELECT * INTO v_row FROM public.site_config_drafts WHERE scope = _scope FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'No draft exists for %.', _scope;
  END IF;

  v_direct := public.authorize_cms_publish('site_config:' || _scope, v_row.workflow_status, v_row.contributors, false);

  SELECT count(*) INTO v_count FROM public.site_config;
  IF v_count <> 1 THEN
    RAISE EXCEPTION 'Expected exactly one site_config row, found %.', v_count;
  END IF;

  -- Allow-listed keys of this scope only.
  SELECT COALESCE(jsonb_object_agg(e.key, e.value), '{}'::jsonb) INTO v_patch
    FROM jsonb_each(v_row.draft) AS e
   WHERE e.key = ANY (public.site_config_scope_keys(_scope));

  PERFORM public.validate_site_config_patch(_scope, v_patch);

  SELECT id INTO v_config_id FROM public.site_config FOR UPDATE;
  UPDATE public.site_config
     SET config = config || v_patch,
         updated_at = now()
   WHERE id = v_config_id
  RETURNING config INTO v_new;

  UPDATE public.site_config_drafts
     SET workflow_status = 'published',
         contributors = '{}'::uuid[],
         published_by = auth.uid(),
         published_at = now(),
         updated_by = auth.uid(),
         updated_at = now()
   WHERE scope = _scope;

  INSERT INTO public.content_versions (entity_type, entity_id, version_label, snapshot, published_by, published_email)
  VALUES ('site_config', _scope, _scope || CASE WHEN v_direct THEN ' direct publish' ELSE ' publish' END, v_new, auth.uid(),
          (SELECT email FROM auth.users WHERE id = auth.uid()));

  IF v_direct THEN
    PERFORM public.record_direct_publish('site_config', _scope, v_row.workflow_status, v_patch);
  ELSE
    PERFORM public.record_workflow_transition('site_config', _scope, 'approved', 'published', NULL, v_patch);
  END IF;

  RETURN v_new;
END $$;

REVOKE ALL ON FUNCTION public.publish_site_config_draft(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.publish_site_config_draft(text) TO authenticated;

-------------------------------------------------------------------------------
-- 7. publish_collection_draft (replaces 005d §3; same rule).
-------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.publish_collection_draft(_key text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_row      public.content_collection_drafts%ROWTYPE;
  v_cols     text[] := public.collection_columns(_key);
  v_item     jsonb;
  v_patch    jsonb;
  v_keys     text[];
  v_id_text  text;
  v_exists   boolean;
  v_set      text;
  v_list     text;
  v_rlist    text;
  v_inserted int := 0;
  v_updated  int := 0;
  v_deleted  int := 0;
  v_n        int;
  v_direct   boolean;
  v_uuid_re  constant text := '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$';
BEGIN
  IF NOT (public.is_super_admin() OR public.is_editor()) THEN
    RAISE EXCEPTION 'Only a Super Admin can publish content.' USING ERRCODE = '42501';
  END IF;
  IF array_length(v_cols, 1) IS NULL THEN
    RAISE EXCEPTION 'Unsupported collection: %', _key;
  END IF;

  SELECT * INTO v_row FROM public.content_collection_drafts WHERE collection_key = _key FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'No draft exists for %.', _key;
  END IF;

  v_direct := public.authorize_cms_publish('collection:' || _key, v_row.workflow_status, v_row.contributors,
                                           jsonb_array_length(COALESCE(v_row.draft -> 'deletedIds', '[]'::jsonb)) > 0);

  -- Updates and inserts
  FOR v_item IN SELECT x FROM jsonb_array_elements(v_row.draft -> 'items') x LOOP
    IF jsonb_typeof(v_item) <> 'object' THEN
      RAISE EXCEPTION 'Every changed item must be an object.';
    END IF;

    SELECT COALESCE(jsonb_object_agg(e.key, e.value), '{}'::jsonb), COALESCE(array_agg(e.key ORDER BY e.key), ARRAY[]::text[])
      INTO v_patch, v_keys
      FROM jsonb_each(v_item) AS e
     WHERE e.key = ANY (v_cols);

    IF array_length(v_keys, 1) IS NULL THEN
      CONTINUE;
    END IF;

    v_id_text := v_item ->> 'id';
    v_exists := false;
    IF v_id_text ~ v_uuid_re THEN
      EXECUTE format('SELECT EXISTS (SELECT 1 FROM public.%I WHERE id = $1)', _key)
        INTO v_exists USING v_id_text::uuid;
    END IF;

    IF v_exists THEN
      SELECT string_agg(format('%I = r.%I', k, k), ', ') INTO v_set FROM unnest(v_keys) AS k;
      EXECUTE format(
        'UPDATE public.%I AS t SET %s FROM jsonb_populate_record(NULL::public.%I, $1) AS r WHERE t.id = $2',
        _key, v_set, _key)
        USING v_patch, v_id_text::uuid;
      v_updated := v_updated + 1;
    ELSE
      SELECT string_agg(format('%I', k), ', '), string_agg(format('r.%I', k), ', ')
        INTO v_list, v_rlist FROM unnest(v_keys) AS k;
      EXECUTE format(
        'INSERT INTO public.%I (%s) SELECT %s FROM jsonb_populate_record(NULL::public.%I, $1) AS r',
        _key, v_list, v_rlist, _key)
        USING v_patch;
      v_inserted := v_inserted + 1;
    END IF;
  END LOOP;

  -- Deletions (only explicit, approved ids; a direct publish never reaches here with removals)
  FOR v_id_text IN SELECT x FROM jsonb_array_elements_text(v_row.draft -> 'deletedIds') x LOOP
    IF v_id_text ~ v_uuid_re THEN
      EXECUTE format('DELETE FROM public.%I WHERE id = $1', _key) USING v_id_text::uuid;
      GET DIAGNOSTICS v_n = ROW_COUNT;
      v_deleted := v_deleted + v_n;
    END IF;
  END LOOP;

  INSERT INTO public.content_versions (entity_type, entity_id, version_label, snapshot, published_by, published_email)
  VALUES ('collection', _key, _key || CASE WHEN v_direct THEN ' direct publish' ELSE ' publish' END, v_row.draft, auth.uid(),
          (SELECT email FROM auth.users WHERE id = auth.uid()));

  -- The changeset is now live: clear it.
  UPDATE public.content_collection_drafts
     SET workflow_status = 'published',
         draft = '{"items": [], "deletedIds": []}'::jsonb,
         contributors = '{}'::uuid[],
         published_by = auth.uid(),
         published_at = now(),
         updated_by = auth.uid(),
         updated_at = now()
   WHERE collection_key = _key;

  IF v_direct THEN
    PERFORM public.record_direct_publish('collection', _key, v_row.workflow_status,
      jsonb_build_object('inserted', v_inserted, 'updated', v_updated, 'deleted', v_deleted));
  ELSE
    PERFORM public.record_workflow_transition('collection', _key, 'approved', 'published', NULL,
      jsonb_build_object('inserted', v_inserted, 'updated', v_updated, 'deleted', v_deleted));
  END IF;

  RETURN jsonb_build_object('inserted', v_inserted, 'updated', v_updated, 'deleted', v_deleted);
END $$;

REVOKE ALL ON FUNCTION public.publish_collection_draft(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.publish_collection_draft(text) TO authenticated;

-------------------------------------------------------------------------------
-- 8. Service-role RPC: set direct publishing for one Editor (admin-users Edge Function only).
-------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_set_direct_publish(
  _target_user_id uuid,
  _enabled boolean,
  _caller_id uuid
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_caller_email text;
  v_profile      public.profiles%ROWTYPE;
  v_role         text;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext('cms_admin_users_mutex'));

  IF NOT (public.has_role(_caller_id, 'super_admin') AND public.is_account_active(_caller_id)) THEN
    RAISE EXCEPTION 'Caller is not an active Super Admin' USING ERRCODE = '42501';
  END IF;
  IF _enabled IS NULL THEN
    RAISE EXCEPTION 'enabled must be true or false' USING ERRCODE = '22023';
  END IF;

  SELECT * INTO v_profile FROM public.profiles WHERE user_id = _target_user_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Target user does not exist' USING ERRCODE = 'P0002';
  END IF;

  SELECT CASE WHEN bool_or(role = 'super_admin') THEN 'super_admin'
              WHEN bool_or(role = 'editor') THEN 'editor' ELSE NULL END
    INTO v_role FROM public.user_roles WHERE user_id = _target_user_id;

  IF _enabled AND v_role IS DISTINCT FROM 'editor' THEN
    RAISE EXCEPTION 'Direct publishing can only be enabled for Admin (editor) accounts.' USING ERRCODE = 'P0010';
  END IF;
  IF _enabled AND NOT v_profile.is_active THEN
    RAISE EXCEPTION 'Re-enable the account before allowing direct publishing.' USING ERRCODE = 'P0010';
  END IF;

  IF v_profile.direct_publish_enabled = _enabled THEN
    RETURN jsonb_build_object('changed', false, 'enabled', _enabled,
                              'updatedAt', v_profile.direct_publish_updated_at);
  END IF;

  UPDATE public.profiles
     SET direct_publish_enabled = _enabled,
         direct_publish_updated_at = now(),
         direct_publish_updated_by = _caller_id,
         updated_at = now()
   WHERE user_id = _target_user_id;

  SELECT email INTO v_caller_email FROM auth.users WHERE id = _caller_id;
  INSERT INTO public.activity_logs (actor_id, actor_email, action, entity_type, entity_id, details)
  VALUES (_caller_id, v_caller_email,
          CASE WHEN _enabled THEN 'user.direct_publish_enabled' ELSE 'user.direct_publish_disabled' END,
          'user', _target_user_id::text,
          jsonb_build_object('email', v_profile.email, 'previous', v_profile.direct_publish_enabled, 'enabled', _enabled));

  RETURN jsonb_build_object('changed', true, 'enabled', _enabled, 'updatedAt', now());
END $$;

REVOKE ALL ON FUNCTION public.admin_set_direct_publish(uuid, boolean, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_set_direct_publish(uuid, boolean, uuid) TO service_role;

-------------------------------------------------------------------------------
-- 9. Service-role RPC: record an invitation event (sent / resent / failed / accepted).
--    _error_code is a short machine code (e.g. 'email_provider_error'); never a link or token.
-------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_record_invite_event(
  _target_user_id uuid,
  _event text,
  _caller_id uuid,
  _provider text DEFAULT NULL,
  _error_code text DEFAULT NULL
)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_caller_email text;
  v_email        text;
  v_count        integer;
BEGIN
  IF _event NOT IN ('sent', 'resent', 'failed', 'accepted') THEN
    RAISE EXCEPTION 'Unsupported invite event: %', _event USING ERRCODE = '22023';
  END IF;
  IF _event <> 'accepted'
     AND NOT (public.has_role(_caller_id, 'super_admin') AND public.is_account_active(_caller_id)) THEN
    RAISE EXCEPTION 'Caller is not an active Super Admin' USING ERRCODE = '42501';
  END IF;

  UPDATE public.profiles
     SET invite_status       = CASE _event WHEN 'failed' THEN 'failed' WHEN 'accepted' THEN 'accepted' ELSE 'pending' END,
         invite_last_sent_at = CASE WHEN _event IN ('sent', 'resent') THEN now() ELSE invite_last_sent_at END,
         invite_send_count   = invite_send_count + CASE WHEN _event IN ('sent', 'resent', 'failed') THEN 1 ELSE 0 END,
         invite_last_error   = CASE WHEN _event = 'failed' THEN left(COALESCE(_error_code, 'unknown_error'), 300) ELSE NULL END,
         updated_at          = now()
   WHERE user_id = _target_user_id
  RETURNING email, invite_send_count INTO v_email, v_count;

  IF v_email IS NULL THEN
    RAISE EXCEPTION 'Target user does not exist' USING ERRCODE = 'P0002';
  END IF;

  IF _event = 'accepted' THEN
    RETURN;  -- derived from Auth state while listing users; not an administrator action
  END IF;

  SELECT email INTO v_caller_email FROM auth.users WHERE id = _caller_id;
  INSERT INTO public.activity_logs (actor_id, actor_email, action, entity_type, entity_id, details)
  VALUES (_caller_id, v_caller_email, 'user.invite_' || _event, 'user', _target_user_id::text,
          jsonb_strip_nulls(jsonb_build_object('email', v_email, 'attempt', v_count,
                                               'provider', left(_provider, 40), 'error_code', left(_error_code, 100))));
END $$;

REVOKE ALL ON FUNCTION public.admin_record_invite_event(uuid, text, uuid, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_record_invite_event(uuid, text, uuid, text, text) TO service_role;

-------------------------------------------------------------------------------
-- 10. Safety assertion: nobody has direct publishing after this migration.
-------------------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.profiles WHERE direct_publish_enabled) THEN
    RAISE EXCEPTION '007: direct_publish_enabled must be false for every existing account after migration.';
  END IF;
END $$;

COMMIT;

-------------------------------------------------------------------------------
-- POST-APPLY CHECKS (read-only):
--   SELECT count(*) FILTER (WHERE direct_publish_enabled) AS enabled, count(*) AS total FROM public.profiles;
--     -> enabled = 0
--   SELECT has_function_privilege('authenticated', 'public.admin_set_direct_publish(uuid, boolean, uuid)', 'EXECUTE');
--     -> false
--   SELECT column_name, privilege_type FROM information_schema.column_privileges
--    WHERE table_name = 'profiles' AND grantee = 'authenticated' AND privilege_type = 'UPDATE';
--     -> display_name only
--
-- ROLLBACK (manual):
--   BEGIN;
--   -- restore the 005c / 005d publish functions by re-running §6 of 005c and §3 of 005d
--   DROP FUNCTION IF EXISTS public.admin_record_invite_event(uuid, text, uuid, text, text);
--   DROP FUNCTION IF EXISTS public.admin_set_direct_publish(uuid, boolean, uuid);
--   DROP FUNCTION IF EXISTS public.record_direct_publish(text, text, text, jsonb);
--   DROP FUNCTION IF EXISTS public.authorize_cms_publish(text, text, uuid[], boolean);  -- after re-running 005c/005d
--   DROP TRIGGER IF EXISTS trg_track_site_config_draft_contributors ON public.site_config_drafts;
--   DROP TRIGGER IF EXISTS trg_track_collection_draft_contributors ON public.content_collection_drafts;
--   DROP FUNCTION IF EXISTS public.track_cms_draft_contributors();
--   ALTER TABLE public.site_config_drafts DROP COLUMN IF EXISTS contributors;
--   ALTER TABLE public.content_collection_drafts DROP COLUMN IF EXISTS contributors;
--   DROP FUNCTION IF EXISTS public.can_direct_publish(text), public.direct_publish_targets();
--   DROP TRIGGER IF EXISTS trg_reset_direct_publish_on_role_change ON public.user_roles;
--   DROP FUNCTION IF EXISTS public.reset_direct_publish_on_role_change();
--   DROP TRIGGER IF EXISTS trg_guard_profile_privileged_columns ON public.profiles;
--   DROP FUNCTION IF EXISTS public.guard_profile_privileged_columns();
--   ALTER TABLE public.profiles DROP COLUMN IF EXISTS direct_publish_enabled, DROP COLUMN IF EXISTS direct_publish_updated_at,
--     DROP COLUMN IF EXISTS direct_publish_updated_by, DROP COLUMN IF EXISTS invite_status,
--     DROP COLUMN IF EXISTS invite_last_sent_at, DROP COLUMN IF EXISTS invite_send_count, DROP COLUMN IF EXISTS invite_last_error;
--   COMMIT;
-------------------------------------------------------------------------------
