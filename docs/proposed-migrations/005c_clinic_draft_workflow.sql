-- PROPOSED – NOT APPLIED. Review only. Requires 001, 002, 004, 005 and 005b to be applied first.
-- 005c: Database-backed draft → review → publish workflow for the three site_config workspaces:
--       Clinic Information ('clinic'), Doctor Profile ('doctor') and Branding ('branding').
--       (File name kept from the first version, which covered clinic only.)
--
-- WHY A SEPARATE TABLE: site_config has one row shared by the three workspaces. A single row-level
-- draft/status (004's site_config.draft_config) cannot hold an independent review per workspace,
-- so each workspace has its own row in public.site_config_drafts.
--
-- GUARANTEES (enforced here, not in the browser):
--   * Browser roles never write site_config.config. The ONLY browser path to the live config is
--     public.publish_site_config_draft(scope): active Super Admin + draft status 'approved', and it
--     merges ONLY that scope's allow-listed keys after type / URL / format checks.
--   * Editors may only save drafts and submit them (status draft | pending_approval).
--   * Approve only from pending_approval; reject only from pending_approval/approved, with feedback.
--   * Any change to draft content re-opens the review (status must be draft | pending_approval).
--   * Super Admins follow the same path (save → submit → approve → publish); there is no shortcut.
--   * Drafts are readable by CMS users only (never anon, never non-CMS accounts).
--
-- Order: 001 → 002 → 003 → 004 → 005 → 005b → 005c → 005d → bootstrap → 006 harness.

BEGIN;

-------------------------------------------------------------------------------
-- 1. Allow-lists (single source of truth; mirrored in src/lib/cms/siteConfigScopes.ts and
--    checked by src/lib/cms/mediaAndClinic.test.ts)
-------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.clinic_config_keys()
RETURNS text[] LANGUAGE sql IMMUTABLE SET search_path = public AS $$
  SELECT ARRAY[
    'clinicName', 'phone', 'whatsapp', 'email', 'location', 'hours', 'consultationFee', 'branches',
    'whatsappFloatEnabled', 'whatsappDefaultMessage', 'facebook', 'instagram', 'timeSlots',
    'insuranceProviders', 'googleMapsEmbedUrl', 'googleMapsDirectionsUrl', 'serviceCategories'
  ]::text[]
$$;

CREATE OR REPLACE FUNCTION public.doctor_config_keys()
RETURNS text[] LANGUAGE sql IMMUTABLE SET search_path = public AS $$
  SELECT ARRAY[
    'doctorName', 'title', 'specialization', 'registrationNumber', 'shortBio', 'fullBio', 'philosophy',
    'heroImageUrl', 'yearsExperience', 'happyPatients', 'surgeriesCompleted', 'googleRating',
    'googleReviewCount', 'education', 'awards', 'memberships', 'languages', 'showEducationSection',
    'showAwardsSection', 'showFellowshipCard', 'fellowshipBadge', 'fellowshipTitle',
    'fellowshipSubtitle', 'fellowshipDescription', 'fellowshipImageUrl'
  ]::text[]
$$;

CREATE OR REPLACE FUNCTION public.branding_config_keys()
RETURNS text[] LANGUAGE sql IMMUTABLE SET search_path = public AS $$
  SELECT ARRAY['logoInitials', 'branding']::text[]
$$;

-- Keys allowed INSIDE config.branding
CREATE OR REPLACE FUNCTION public.branding_object_keys()
RETURNS text[] LANGUAGE sql IMMUTABLE SET search_path = public AS $$
  SELECT ARRAY[
    'logoUrl', 'logoAlt', 'faviconUrl', 'themePreset', 'primaryHsl', 'accentHsl', 'headingFont',
    'bodyFont', 'footerTagline', 'headerCtaLabel', 'headerCtaLink', 'googleMapsUrl',
    'announcementEnabled', 'announcementText', 'announcementLinkLabel', 'announcementLinkUrl',
    'copyrightText', 'youtubeUrl', 'navItems', 'labels'
  ]::text[]
$$;

CREATE OR REPLACE FUNCTION public.site_config_scope_keys(_scope text)
RETURNS text[] LANGUAGE sql IMMUTABLE SET search_path = public AS $$
  SELECT CASE _scope
    WHEN 'clinic'   THEN public.clinic_config_keys()
    WHEN 'doctor'   THEN public.doctor_config_keys()
    WHEN 'branding' THEN public.branding_config_keys()
    ELSE ARRAY[]::text[]
  END
$$;

-- '' | https://… | internal path "/…" (when allowed). Never javascript:, data:, //host or http://.
CREATE OR REPLACE FUNCTION public.cms_is_safe_url(_value text, _allow_relative boolean)
RETURNS boolean LANGUAGE sql IMMUTABLE SET search_path = public AS $$
  SELECT _value IS NULL
      OR _value = ''
      OR _value ~ '^https://[^\s"''<>]+$'
      OR (_allow_relative AND (_value = '/' OR _value ~ '^/[^/\\\s][^\s"''<>]*$'))
$$;

-------------------------------------------------------------------------------
-- 2. Draft table (one row per scope; rows are seeded, never inserted/deleted by browsers)
-------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.site_config_drafts (
  scope           text PRIMARY KEY,
  draft           jsonb NOT NULL DEFAULT '{}'::jsonb
                  CHECK (jsonb_typeof(draft) = 'object' AND octet_length(draft::text) <= 262144),
  workflow_status text NOT NULL DEFAULT 'published'
                  CHECK (workflow_status IN ('draft', 'pending_approval', 'approved', 'rejected', 'published')),
  review_feedback text CHECK (review_feedback IS NULL OR char_length(review_feedback) <= 2000),
  submitted_by    uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  submitted_at    timestamptz,
  reviewed_by     uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at     timestamptz,
  published_by    uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  published_at    timestamptz,
  updated_by      uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.site_config_drafts DROP CONSTRAINT IF EXISTS site_config_drafts_scope_check;
ALTER TABLE public.site_config_drafts ADD CONSTRAINT site_config_drafts_scope_check
  CHECK (scope IN ('clinic', 'doctor', 'branding'));

ALTER TABLE public.site_config_drafts ENABLE ROW LEVEL SECURITY;

-- Seed each scope from the CURRENT live config (read-only use of site_config; nothing live changes).
INSERT INTO public.site_config_drafts (scope, draft, workflow_status)
SELECT s.scope,
       COALESCE((SELECT jsonb_object_agg(e.key, e.value)
                   FROM jsonb_each(sc.config) AS e
                  WHERE e.key = ANY (public.site_config_scope_keys(s.scope))), '{}'::jsonb),
       'published'
  FROM (VALUES ('clinic'), ('doctor'), ('branding')) AS s(scope)
 CROSS JOIN (SELECT config FROM public.site_config ORDER BY updated_at DESC NULLS LAST LIMIT 1) AS sc
ON CONFLICT (scope) DO NOTHING;

-- If site_config were empty, still create the rows so the CMS has something to update.
INSERT INTO public.site_config_drafts (scope, draft, workflow_status)
VALUES ('clinic', '{}'::jsonb, 'published'), ('doctor', '{}'::jsonb, 'published'), ('branding', '{}'::jsonb, 'published')
ON CONFLICT (scope) DO NOTHING;

-------------------------------------------------------------------------------
-- 3. Privileges: no anon access; authenticated may read and update three columns only.
-------------------------------------------------------------------------------
REVOKE ALL ON public.site_config_drafts FROM anon, authenticated;
GRANT SELECT ON public.site_config_drafts TO authenticated;
GRANT UPDATE (draft, workflow_status, review_feedback) ON public.site_config_drafts TO authenticated;

DROP POLICY IF EXISTS "CMS users read site_config_drafts" ON public.site_config_drafts;
CREATE POLICY "CMS users read site_config_drafts" ON public.site_config_drafts
  FOR SELECT TO authenticated
  USING (public.is_super_admin() OR public.is_editor());

DROP POLICY IF EXISTS "CMS users update site_config_drafts" ON public.site_config_drafts;
CREATE POLICY "CMS users update site_config_drafts" ON public.site_config_drafts
  FOR UPDATE TO authenticated
  USING (public.is_super_admin() OR public.is_editor())
  WITH CHECK (public.is_super_admin() OR public.is_editor());
-- No INSERT / DELETE policies: rows are seeded above.

-------------------------------------------------------------------------------
-- 4. Workflow guard trigger, shared by every CMS draft table.
--    TG_ARGV[0] = the key column name ('scope' here, 'collection_key' in 005d).
--    Browser roles only; trusted sessions bypass (same rule as 005b F1).
-------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.enforce_cms_draft_workflow()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
BEGIN
  IF current_user NOT IN ('anon', 'authenticated') THEN
    RETURN NEW;
  END IF;

  IF TG_OP <> 'UPDATE' THEN
    RAISE EXCEPTION 'Draft rows can only be updated from the CMS.';
  END IF;

  IF (to_jsonb(NEW) ->> TG_ARGV[0]) IS DISTINCT FROM (to_jsonb(OLD) ->> TG_ARGV[0]) THEN
    RAISE EXCEPTION 'The draft key cannot be changed.';
  END IF;

  -- Server-owned columns (column grants already block them; keep stored values regardless).
  NEW.submitted_by := OLD.submitted_by;
  NEW.submitted_at := OLD.submitted_at;
  NEW.reviewed_by  := OLD.reviewed_by;
  NEW.reviewed_at  := OLD.reviewed_at;
  NEW.published_by := OLD.published_by;
  NEW.published_at := OLD.published_at;
  NEW.created_at   := OLD.created_at;

  -- Publishing happens only inside the publish functions.
  IF NEW.workflow_status = 'published' AND OLD.workflow_status IS DISTINCT FROM 'published' THEN
    RAISE EXCEPTION 'Publishing must use the publish function.';
  END IF;

  -- Changing the content always re-opens the review (nobody can edit an approved draft in place).
  IF NEW.draft IS DISTINCT FROM OLD.draft AND NEW.workflow_status NOT IN ('draft', 'pending_approval') THEN
    RAISE EXCEPTION 'Saving changes returns the draft to draft or pending_approval.';
  END IF;

  IF public.is_super_admin() THEN
    IF NEW.workflow_status = 'approved' AND OLD.workflow_status IS DISTINCT FROM 'approved'
       AND OLD.workflow_status <> 'pending_approval' THEN
      RAISE EXCEPTION 'Only a submitted (pending) draft can be approved.';
    END IF;
    IF NEW.workflow_status = 'rejected' AND OLD.workflow_status IS DISTINCT FROM 'rejected' THEN
      IF OLD.workflow_status NOT IN ('pending_approval', 'approved') THEN
        RAISE EXCEPTION 'Only a submitted or approved draft can be rejected.';
      END IF;
      IF btrim(COALESCE(NEW.review_feedback, '')) = '' THEN
        RAISE EXCEPTION 'Rejection feedback is required.';
      END IF;
    END IF;
  ELSE
    -- Editor
    IF NEW.workflow_status NOT IN ('draft', 'pending_approval') THEN
      RAISE EXCEPTION 'Editors can only save drafts or submit them for review.';
    END IF;
    NEW.review_feedback := OLD.review_feedback;  -- keep the reviewer's feedback visible
  END IF;

  IF NEW.workflow_status = 'pending_approval' AND OLD.workflow_status IS DISTINCT FROM 'pending_approval' THEN
    NEW.submitted_by := auth.uid();
    NEW.submitted_at := now();
  END IF;

  IF NEW.workflow_status IN ('approved', 'rejected') AND OLD.workflow_status IS DISTINCT FROM NEW.workflow_status THEN
    NEW.reviewed_by := auth.uid();
    NEW.reviewed_at := now();
  END IF;

  NEW.updated_by := auth.uid();
  NEW.updated_at := now();
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_enforce_site_config_draft_workflow ON public.site_config_drafts;
CREATE TRIGGER trg_enforce_site_config_draft_workflow
  BEFORE INSERT OR UPDATE ON public.site_config_drafts
  FOR EACH ROW EXECUTE FUNCTION public.enforce_cms_draft_workflow('scope');

-------------------------------------------------------------------------------
-- 5. Validation of a scope patch before it can reach the live config.
-------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.validate_site_config_patch(_scope text, _patch jsonb)
RETURNS void LANGUAGE plpgsql IMMUTABLE SET search_path = public AS $$
DECLARE
  v_key  text;
  v_val  jsonb;
  v_bkey text;
  v_bval jsonb;
  v_item jsonb;
BEGIN
  FOR v_key, v_val IN SELECT key, value FROM jsonb_each(_patch) LOOP
    -- numbers
    IF v_key IN ('consultationFee', 'branches', 'yearsExperience', 'happyPatients', 'surgeriesCompleted',
                 'googleReviewCount', 'googleRating') THEN
      IF jsonb_typeof(v_val) <> 'number' OR (v_val #>> '{}')::numeric < 0 THEN
        RAISE EXCEPTION '% must be a non-negative number.', v_key;
      END IF;
      IF v_key = 'googleRating' AND (v_val #>> '{}')::numeric > 5 THEN
        RAISE EXCEPTION 'googleRating must be between 0 and 5.';
      END IF;
    -- booleans
    ELSIF v_key IN ('whatsappFloatEnabled', 'showEducationSection', 'showAwardsSection', 'showFellowshipCard') THEN
      IF jsonb_typeof(v_val) <> 'boolean' THEN
        RAISE EXCEPTION '% must be true or false.', v_key;
      END IF;
    -- lists of strings
    ELSIF v_key IN ('insuranceProviders', 'memberships', 'languages') THEN
      IF jsonb_typeof(v_val) <> 'array'
         OR EXISTS (SELECT 1 FROM jsonb_array_elements(v_val) x WHERE jsonb_typeof(x) <> 'string') THEN
        RAISE EXCEPTION '% must be a list of text values.', v_key;
      END IF;
    ELSIF v_key = 'timeSlots' THEN
      IF jsonb_typeof(v_val) <> 'array'
         OR EXISTS (SELECT 1 FROM jsonb_array_elements(v_val) x
                     WHERE jsonb_typeof(x) <> 'object'
                        OR jsonb_typeof(x -> 'time') IS DISTINCT FROM 'string'
                        OR jsonb_typeof(x -> 'available') IS DISTINCT FROM 'boolean') THEN
        RAISE EXCEPTION 'timeSlots must be a list of {time, available}.';
      END IF;
    ELSIF v_key = 'serviceCategories' THEN
      IF jsonb_typeof(v_val) <> 'array'
         OR EXISTS (SELECT 1 FROM jsonb_array_elements(v_val) x
                     WHERE jsonb_typeof(x) <> 'object'
                        OR jsonb_typeof(x -> 'name') IS DISTINCT FROM 'string'
                        OR jsonb_typeof(x -> 'slug') IS DISTINCT FROM 'string') THEN
        RAISE EXCEPTION 'serviceCategories must be a list of {name, slug, icon, description}.';
      END IF;
    ELSIF v_key IN ('education', 'awards') THEN
      IF jsonb_typeof(v_val) <> 'array'
         OR EXISTS (SELECT 1 FROM jsonb_array_elements(v_val) x WHERE jsonb_typeof(x) <> 'object') THEN
        RAISE EXCEPTION '% must be a list of entries.', v_key;
      END IF;
    ELSIF v_key = 'branding' THEN
      IF jsonb_typeof(v_val) <> 'object' THEN
        RAISE EXCEPTION 'branding must be an object.';
      END IF;
      FOR v_bkey, v_bval IN SELECT key, value FROM jsonb_each(v_val) LOOP
        IF NOT (v_bkey = ANY (public.branding_object_keys())) THEN
          RAISE EXCEPTION 'Unknown branding setting: %', v_bkey;
        END IF;
        IF v_bkey = 'announcementEnabled' THEN
          IF jsonb_typeof(v_bval) <> 'boolean' THEN RAISE EXCEPTION 'announcementEnabled must be true or false.'; END IF;
        ELSIF v_bkey = 'navItems' THEN
          IF jsonb_typeof(v_bval) <> 'array' THEN RAISE EXCEPTION 'navItems must be a list.'; END IF;
          FOR v_item IN SELECT x FROM jsonb_array_elements(v_bval) x LOOP
            IF jsonb_typeof(v_item) <> 'object'
               OR jsonb_typeof(v_item -> 'id') IS DISTINCT FROM 'string'
               OR jsonb_typeof(v_item -> 'label') IS DISTINCT FROM 'string'
               OR jsonb_typeof(v_item -> 'to') IS DISTINCT FROM 'string'
               OR jsonb_typeof(v_item -> 'visible') IS DISTINCT FROM 'boolean'
               OR jsonb_typeof(v_item -> 'sortOrder') IS DISTINCT FROM 'number' THEN
              RAISE EXCEPTION 'Each navigation item needs id, label, to, visible and sortOrder.';
            END IF;
            IF NOT public.cms_is_safe_url(v_item ->> 'to', true) OR (v_item ->> 'to') = '' THEN
              RAISE EXCEPTION 'Navigation link "%" must be an internal path (/…) or an https:// URL.', v_item ->> 'label';
            END IF;
          END LOOP;
        ELSIF v_bkey = 'labels' THEN
          IF jsonb_typeof(v_bval) <> 'object'
             OR EXISTS (SELECT 1 FROM jsonb_each(v_bval) l WHERE jsonb_typeof(l.value) <> 'string') THEN
            RAISE EXCEPTION 'branding.labels must map names to text.';
          END IF;
        ELSE
          IF jsonb_typeof(v_bval) NOT IN ('string', 'null') THEN
            RAISE EXCEPTION 'branding.% must be text.', v_bkey;
          END IF;
          IF v_bkey IN ('logoUrl', 'faviconUrl', 'googleMapsUrl', 'youtubeUrl')
             AND NOT public.cms_is_safe_url(v_bval #>> '{}', v_bkey IN ('logoUrl', 'faviconUrl')) THEN
            RAISE EXCEPTION 'branding.% must be an https:// URL%.', v_bkey,
              CASE WHEN v_bkey IN ('logoUrl', 'faviconUrl') THEN ' or a /path on this site' ELSE '' END;
          END IF;
          IF v_bkey IN ('headerCtaLink', 'announcementLinkUrl')
             AND NOT public.cms_is_safe_url(v_bval #>> '{}', true) THEN
            RAISE EXCEPTION 'branding.% must be an internal path (/…) or an https:// URL.', v_bkey;
          END IF;
          IF v_bkey IN ('primaryHsl', 'accentHsl') AND COALESCE(v_bval #>> '{}', '') <> ''
             AND (v_bval #>> '{}') !~ '^\d{1,3}(\.\d+)? \d{1,3}(\.\d+)?% \d{1,3}(\.\d+)?%$' THEN
            RAISE EXCEPTION 'branding.% must look like "180 45%% 22%%".', v_bkey;
          END IF;
          IF v_bkey = 'themePreset' AND COALESCE(v_bval #>> '{}', '') NOT IN ('', 'clinical-teal', 'royal-navy', 'emerald-care') THEN
            RAISE EXCEPTION 'Unknown theme preset.';
          END IF;
          IF v_bkey = 'headingFont' AND COALESCE(v_bval #>> '{}', '') NOT IN ('', 'Playfair Display', 'Merriweather', 'Lora') THEN
            RAISE EXCEPTION 'Unknown heading font.';
          END IF;
          IF v_bkey = 'bodyFont' AND COALESCE(v_bval #>> '{}', '') NOT IN ('', 'DM Sans', 'Inter', 'Plus Jakarta Sans') THEN
            RAISE EXCEPTION 'Unknown body font.';
          END IF;
        END IF;
      END LOOP;
    -- everything else is text
    ELSE
      IF jsonb_typeof(v_val) <> 'string' THEN
        RAISE EXCEPTION '% must be text.', v_key;
      END IF;
      IF v_key = 'logoInitials' AND char_length(v_val #>> '{}') > 4 THEN
        RAISE EXCEPTION 'logoInitials can be at most 4 characters.';
      END IF;
      IF v_key = 'googleMapsEmbedUrl' AND (v_val #>> '{}') <> ''
         AND (v_val #>> '{}') !~ '^https://(www\.)?google\.[a-z.]+/maps/embed' THEN
        RAISE EXCEPTION 'googleMapsEmbedUrl must be a https://www.google.com/maps/embed URL.';
      END IF;
      IF v_key IN ('googleMapsDirectionsUrl', 'facebook', 'instagram')
         AND NOT public.cms_is_safe_url(v_val #>> '{}', false) THEN
        RAISE EXCEPTION '% must start with https://.', v_key;
      END IF;
      IF v_key IN ('heroImageUrl', 'fellowshipImageUrl')
         AND NOT public.cms_is_safe_url(v_val #>> '{}', true) THEN
        RAISE EXCEPTION '% must be an https:// URL or a /path on this site.', v_key;
      END IF;
    END IF;
  END LOOP;
END $$;

-------------------------------------------------------------------------------
-- 6. Publish: the only browser path to live site_config values.
--    SECURITY DEFINER so it can write site_config.config; it checks the caller itself.
--    Writes made here run as the function owner, so the 005b F1 and §4 triggers treat them as
--    trusted — this function is therefore the gate and must keep all checks below.
-------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.publish_site_config_draft(_scope text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_row       public.site_config_drafts%ROWTYPE;
  v_patch     jsonb;
  v_config_id uuid;
  v_new       jsonb;
  v_count     int;
BEGIN
  IF NOT public.is_super_admin() THEN
    RAISE EXCEPTION 'Only a Super Admin can publish site settings.' USING ERRCODE = '42501';
  END IF;
  IF _scope IS NULL OR _scope NOT IN ('clinic', 'doctor', 'branding') THEN
    RAISE EXCEPTION 'Unsupported scope: %', _scope;
  END IF;

  SELECT * INTO v_row FROM public.site_config_drafts WHERE scope = _scope FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'No draft exists for %.', _scope;
  END IF;
  IF v_row.workflow_status <> 'approved' THEN
    RAISE EXCEPTION 'Only approved changes can be published (current status: %).', v_row.workflow_status;
  END IF;

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
         published_by = auth.uid(),
         published_at = now(),
         updated_by = auth.uid(),
         updated_at = now()
   WHERE scope = _scope;

  INSERT INTO public.content_versions (entity_type, entity_id, version_label, snapshot, published_by, published_email)
  VALUES ('site_config', _scope, _scope || ' publish', v_new, auth.uid(),
          (SELECT email FROM auth.users WHERE id = auth.uid()));

  -- approval_history + activity_logs
  PERFORM public.record_workflow_transition('site_config', _scope, 'approved', 'published', NULL, v_patch);

  RETURN v_new;
END $$;

REVOKE ALL ON FUNCTION public.publish_site_config_draft(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.publish_site_config_draft(text) TO authenticated;
REVOKE ALL ON FUNCTION public.enforce_cms_draft_workflow() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.validate_site_config_patch(text, jsonb) FROM PUBLIC, anon;

-------------------------------------------------------------------------------
-- 7. The publish function is now the ONLY browser path into site_config, Super Admin included.
--    (002 gave Super Admins FOR ALL and Editors UPDATE on site_config; 005b F6 added the read policies.)
--    004's row-level draft columns on site_config stay in place but are no longer used by the CMS.
-------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Super admins manage site_config" ON public.site_config;
DROP POLICY IF EXISTS "Editors update site_config" ON public.site_config;
REVOKE INSERT, UPDATE, DELETE ON public.site_config FROM anon, authenticated;

-- Remove the first version's clinic-only trigger function if an earlier draft of 005c was applied.
DROP FUNCTION IF EXISTS public.enforce_site_config_draft_workflow();

COMMIT;

-------------------------------------------------------------------------------
-- POST-APPLY CHECKS (read-only):
--   SELECT scope, workflow_status, (SELECT count(*) FROM jsonb_object_keys(draft)) AS keys
--     FROM public.site_config_drafts ORDER BY scope;
--     -> three rows (branding, clinic, doctor), status 'published'
--   SELECT grantee, privilege_type FROM information_schema.role_table_grants
--    WHERE table_name = 'site_config_drafts' AND grantee IN ('anon','authenticated');
--     -> authenticated SELECT only (UPDATE is column-level: see information_schema.column_privileges)
--
-- ROLLBACK (manual; 005d must be rolled back first because it reuses enforce_cms_draft_workflow):
--   BEGIN;
--   DROP FUNCTION IF EXISTS public.publish_site_config_draft(text);
--   DROP TABLE IF EXISTS public.site_config_drafts;          -- drops its trigger and policies
--   DROP FUNCTION IF EXISTS public.enforce_cms_draft_workflow();
--   DROP FUNCTION IF EXISTS public.validate_site_config_patch(text, jsonb);
--   DROP FUNCTION IF EXISTS public.site_config_scope_keys(text), public.clinic_config_keys(),
--     public.doctor_config_keys(), public.branding_config_keys(), public.branding_object_keys(),
--     public.cms_is_safe_url(text, boolean);
--   COMMIT;
--   (site_config.config is never modified by this file, so no content restore is needed.)
-------------------------------------------------------------------------------
