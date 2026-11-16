-- PROPOSED – NOT APPLIED. Review only.
-- 005b: Security hardening found in the pre-apply audit (docs/CMS_SECURITY_AUDIT_PRE_APPLY.md).
-- Order: 001 → 002 → 003 → 004 → 005 → 005b → 005c → 005d → (bootstrap first super_admin) → 006 harness.
-- Every statement is idempotent (DROP ... IF EXISTS / CREATE OR REPLACE) and runs in one transaction.
-- RE-RUN RULE: if 002, 003, 004 or 005 is ever re-run, re-run 005b afterwards. Re-running 002
-- re-creates the editor write policies removed by F5; re-running 004/005 restores the
-- SECURITY DEFINER triggers (F1) and the legacy-admin / editor-overwrite cms-media policies (F4).
--
-- Preconditions (verified in the read-only preflight on 2026-11-12):
--   * public.user_roles has 0 rows  → retiring the legacy 'admin' role locks nobody out.
--   * second-opinion-reports bucket is private.

BEGIN;

-- Safety stop: refuse to retire legacy roles if any legacy row appeared since the preflight.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.user_roles WHERE role::text IN ('admin', 'moderator', 'user')) THEN
    RAISE EXCEPTION 'Legacy role rows exist in user_roles. Convert them to super_admin/editor before applying 005b.';
  END IF;
END $$;

-------------------------------------------------------------------------------
-- F1. Workflow triggers must not treat SQL editor / migrations / service-role as an "editor".
--     As written in 004/005 they are SECURITY DEFINER and gate on can_publish_content(), which is
--     false whenever auth.uid() IS NULL. Result: every non-JWT write (content migrations, the 006
--     seed block, edge functions using the service role) is silently rewritten (e.g. cms_pages
--     inserted unpublished) or rejected. Fix: SECURITY INVOKER + enforce only for browser roles.
-------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.enforce_workflow_site_config()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
BEGIN
  -- Trusted back-end sessions (postgres, service_role, supabase_admin) are not subject to the editor workflow.
  IF current_user NOT IN ('anon', 'authenticated') THEN
    RETURN NEW;
  END IF;

  IF NOT public.can_publish_content() THEN
    IF TG_OP = 'INSERT' THEN
      RAISE EXCEPTION 'Editors cannot insert new site_config rows.';
    END IF;
    IF NEW.id IS DISTINCT FROM OLD.id OR NEW.config IS DISTINCT FROM OLD.config THEN
      RAISE EXCEPTION 'Editors cannot directly modify published clinic, doctor, or branding settings. Save to draft_config instead.';
    END IF;
    IF NEW.workflow_status NOT IN ('draft', 'pending_approval') THEN
      RAISE EXCEPTION 'Editors can only set workflow_status to draft or pending_approval.';
    END IF;
    -- Review/submission metadata belongs to the workflow: keep the stored values.
    NEW.reviewed_by     := OLD.reviewed_by;
    NEW.reviewed_at     := OLD.reviewed_at;
    NEW.review_feedback := OLD.review_feedback;
    NEW.submitted_by    := OLD.submitted_by;
    NEW.submitted_at    := OLD.submitted_at;
  END IF;

  IF NEW.workflow_status = 'pending_approval' AND (TG_OP = 'INSERT' OR OLD.workflow_status IS DISTINCT FROM 'pending_approval') THEN
    NEW.submitted_by := auth.uid();
    NEW.submitted_at := now();
  END IF;

  IF NEW.workflow_status IN ('approved', 'rejected', 'published') AND (TG_OP = 'INSERT' OR OLD.workflow_status IS DISTINCT FROM NEW.workflow_status) THEN
    NEW.reviewed_by := auth.uid();
    NEW.reviewed_at := now();
  END IF;

  NEW.draft_updated_by := auth.uid();
  NEW.draft_updated_at := now();
  RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION public.enforce_workflow_cms_pages()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
BEGIN
  IF current_user NOT IN ('anon', 'authenticated') THEN
    RETURN NEW;
  END IF;

  IF NOT public.can_publish_content() THEN
    IF TG_OP = 'INSERT' THEN
      IF NEW.workflow_status NOT IN ('draft', 'pending_approval') THEN
        NEW.workflow_status := 'draft';
      END IF;
      NEW.published_sections := '[]'::jsonb;
      NEW.seo_title := NULL;
      NEW.seo_description := NULL;
      NEW.seo_keywords := NULL;
      NEW.og_image_url := NULL;
      NEW.published_at := NULL;
      NEW.published_by := NULL;
      NEW.reviewed_by := NULL;
      NEW.reviewed_at := NULL;
      NEW.review_feedback := NULL;
    ELSIF TG_OP = 'UPDATE' THEN
      -- The CMS client re-sends `title` on every draft upsert; it is a live column, so keep it.
      NEW.title := OLD.title;
      IF NEW.id IS DISTINCT FROM OLD.id
         OR NEW.slug IS DISTINCT FROM OLD.slug
         OR NEW.published_sections IS DISTINCT FROM OLD.published_sections
         OR NEW.seo_title IS DISTINCT FROM OLD.seo_title
         OR NEW.seo_description IS DISTINCT FROM OLD.seo_description
         OR NEW.seo_keywords IS DISTINCT FROM OLD.seo_keywords
         OR NEW.og_image_url IS DISTINCT FROM OLD.og_image_url
         OR NEW.published_at IS DISTINCT FROM OLD.published_at
         OR NEW.published_by IS DISTINCT FROM OLD.published_by
      THEN
        RAISE EXCEPTION 'Editors cannot directly modify published page content or SEO. Save to draft columns instead.';
      END IF;
      IF NEW.workflow_status NOT IN ('draft', 'pending_approval') THEN
        RAISE EXCEPTION 'Editors can only set workflow_status to draft or pending_approval.';
      END IF;
      -- Review/submission metadata belongs to the workflow. Keep the stored values instead of
      -- raising: the CMS client sends review_feedback = NULL on every draft save/resubmission.
      NEW.reviewed_by     := OLD.reviewed_by;
      NEW.reviewed_at     := OLD.reviewed_at;
      NEW.review_feedback := OLD.review_feedback;
      NEW.submitted_by    := OLD.submitted_by;
      NEW.submitted_at    := OLD.submitted_at;
    END IF;
  END IF;

  IF NEW.workflow_status = 'pending_approval' AND (TG_OP = 'INSERT' OR OLD.workflow_status IS DISTINCT FROM 'pending_approval') THEN
    NEW.submitted_by := auth.uid();
    NEW.submitted_at := now();
  END IF;

  IF NEW.workflow_status IN ('approved', 'rejected', 'published') AND (TG_OP = 'INSERT' OR OLD.workflow_status IS DISTINCT FROM NEW.workflow_status) THEN
    NEW.reviewed_by := auth.uid();
    NEW.reviewed_at := now();
  END IF;

  NEW.updated_by := auth.uid();
  RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION public.enforce_workflow_subsections()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
BEGIN
  IF current_user NOT IN ('anon', 'authenticated') THEN
    RETURN NEW;
  END IF;

  IF NOT public.can_publish_content() THEN
    IF TG_OP = 'INSERT' THEN
      IF NEW.workflow_status NOT IN ('draft', 'pending_approval') THEN
        NEW.workflow_status := 'draft';
      END IF;
      NEW.is_active := false;
      NEW.published_at := NULL;
      NEW.reviewed_by := NULL;
      NEW.reviewed_at := NULL;
      NEW.review_feedback := NULL;
    ELSIF TG_OP = 'UPDATE' THEN
      IF NEW.id IS DISTINCT FROM OLD.id
         OR NEW.section_id IS DISTINCT FROM OLD.section_id
         OR NEW.parent_id IS DISTINCT FROM OLD.parent_id
         OR NEW.slug IS DISTINCT FROM OLD.slug
         OR NEW.level IS DISTINCT FROM OLD.level
         OR NEW.sort_order IS DISTINCT FROM OLD.sort_order
         OR NEW.is_featured IS DISTINCT FROM OLD.is_featured
         OR NEW.content IS DISTINCT FROM OLD.content
         OR NEW.structured_blocks IS DISTINCT FROM OLD.structured_blocks
         OR NEW.name IS DISTINCT FROM OLD.name
         OR NEW.description IS DISTINCT FROM OLD.description
         OR NEW.meta_description IS DISTINCT FROM OLD.meta_description
         OR NEW.hero_image_url IS DISTINCT FROM OLD.hero_image_url
         OR NEW.is_active IS DISTINCT FROM OLD.is_active
         OR NEW.published_at IS DISTINCT FROM OLD.published_at
      THEN
        RAISE EXCEPTION 'Editors cannot directly modify published treatment content. Save to draft columns instead.';
      END IF;
      IF NEW.workflow_status NOT IN ('draft', 'pending_approval') THEN
        RAISE EXCEPTION 'Editors can only set workflow_status to draft or pending_approval.';
      END IF;
      -- Review/submission metadata belongs to the workflow. Keep the stored values instead of
      -- raising: the CMS client sends review_feedback = NULL on every draft save/resubmission.
      NEW.reviewed_by     := OLD.reviewed_by;
      NEW.reviewed_at     := OLD.reviewed_at;
      NEW.review_feedback := OLD.review_feedback;
      NEW.submitted_by    := OLD.submitted_by;
      NEW.submitted_at    := OLD.submitted_at;
    END IF;
  END IF;

  IF NEW.workflow_status = 'pending_approval' AND (TG_OP = 'INSERT' OR OLD.workflow_status IS DISTINCT FROM 'pending_approval') THEN
    NEW.submitted_by := auth.uid();
    NEW.submitted_at := now();
  END IF;

  IF NEW.workflow_status IN ('approved', 'rejected', 'published') AND (TG_OP = 'INSERT' OR OLD.workflow_status IS DISTINCT FROM NEW.workflow_status) THEN
    NEW.reviewed_by := auth.uid();
    NEW.reviewed_at := now();
  END IF;

  NEW.updated_by := auth.uid();
  RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION public.enforce_workflow_seo_metadata()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
BEGIN
  IF current_user NOT IN ('anon', 'authenticated') THEN
    RETURN NEW;
  END IF;

  IF NOT public.can_publish_content() THEN
    IF TG_OP = 'INSERT' THEN
      IF NEW.workflow_status NOT IN ('draft', 'pending_approval') THEN
        NEW.workflow_status := 'draft';
      END IF;
      NEW.seo_title := NULL;
      NEW.seo_description := NULL;
      NEW.seo_keywords := NULL;
      NEW.og_image_url := NULL;
      NEW.canonical_url := NULL;
      NEW.noindex := false;
      NEW.published_at := NULL;
      NEW.published_by := NULL;
      NEW.reviewed_by := NULL;
      NEW.reviewed_at := NULL;
      NEW.review_feedback := NULL;
    ELSIF TG_OP = 'UPDATE' THEN
      -- The CMS client re-sends `page_label` on every draft upsert; keep the stored label.
      NEW.page_label := OLD.page_label;
      IF NEW.id IS DISTINCT FROM OLD.id
         OR NEW.route_path IS DISTINCT FROM OLD.route_path
         OR NEW.seo_title IS DISTINCT FROM OLD.seo_title
         OR NEW.seo_description IS DISTINCT FROM OLD.seo_description
         OR NEW.seo_keywords IS DISTINCT FROM OLD.seo_keywords
         OR NEW.og_image_url IS DISTINCT FROM OLD.og_image_url
         OR NEW.canonical_url IS DISTINCT FROM OLD.canonical_url
         OR NEW.noindex IS DISTINCT FROM OLD.noindex
         OR NEW.published_at IS DISTINCT FROM OLD.published_at
         OR NEW.published_by IS DISTINCT FROM OLD.published_by
      THEN
        RAISE EXCEPTION 'Editors cannot directly modify live published SEO metadata. Save to draft_* columns and submit for review.';
      END IF;
      IF NEW.workflow_status NOT IN ('draft', 'pending_approval') THEN
        RAISE EXCEPTION 'Editors can only set workflow_status to draft or pending_approval.';
      END IF;
      -- Review/submission metadata belongs to the workflow. Keep the stored values instead of
      -- raising: the CMS client sends review_feedback = NULL on every draft save/resubmission.
      NEW.reviewed_by     := OLD.reviewed_by;
      NEW.reviewed_at     := OLD.reviewed_at;
      NEW.review_feedback := OLD.review_feedback;
      NEW.submitted_by    := OLD.submitted_by;
      NEW.submitted_at    := OLD.submitted_at;
    END IF;
  END IF;

  IF NEW.workflow_status = 'pending_approval' AND (TG_OP = 'INSERT' OR OLD.workflow_status IS DISTINCT FROM 'pending_approval') THEN
    NEW.submitted_by := auth.uid();
    NEW.submitted_at := now();
  END IF;

  IF NEW.workflow_status IN ('approved', 'rejected', 'published') AND (TG_OP = 'INSERT' OR OLD.workflow_status IS DISTINCT FROM NEW.workflow_status) THEN
    NEW.reviewed_by := auth.uid();
    NEW.reviewed_at := now();
  END IF;

  NEW.updated_by := auth.uid();
  RETURN NEW;
END $$;

-------------------------------------------------------------------------------
-- F2. Retire the legacy 'admin' role (0 rows today, but still mintable by the unauthenticated
--     assign-admin-role edge function, and it grants DELETE on content, patient-inbox reads,
--     patient-report reads (003) and cms-media writes outside the super_admin model).
-------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Admins can view appointments"        ON public.appointments;
DROP POLICY IF EXISTS "Admins can view contact messages"    ON public.contact_messages;
DROP POLICY IF EXISTS "Admins can view second opinions"     ON public.second_opinions;
DROP POLICY IF EXISTS "Admins can update second opinions"   ON public.second_opinions;
DROP POLICY IF EXISTS "Admins can insert blog posts"        ON public.blog_posts;
DROP POLICY IF EXISTS "Admins can update blog posts"        ON public.blog_posts;
DROP POLICY IF EXISTS "Admins can delete blog posts"        ON public.blog_posts;
DROP POLICY IF EXISTS "Admins can insert case studies"      ON public.case_studies;
DROP POLICY IF EXISTS "Admins can update case studies"      ON public.case_studies;
DROP POLICY IF EXISTS "Admins can delete case studies"      ON public.case_studies;
DROP POLICY IF EXISTS "Admins can insert services"          ON public.services;
DROP POLICY IF EXISTS "Admins can update services"          ON public.services;
DROP POLICY IF EXISTS "Admins can delete services"          ON public.services;
DROP POLICY IF EXISTS "Admins can insert testimonials"      ON public.testimonials;
DROP POLICY IF EXISTS "Admins can update testimonials"      ON public.testimonials;
DROP POLICY IF EXISTS "Admins can delete testimonials"      ON public.testimonials;
DROP POLICY IF EXISTS "Admins can update site config"       ON public.site_config;
DROP POLICY IF EXISTS "Admins can insert site config"       ON public.site_config;
DROP POLICY IF EXISTS "Admins can insert medical sections"  ON public.medical_sections;
DROP POLICY IF EXISTS "Admins can update medical sections"  ON public.medical_sections;
DROP POLICY IF EXISTS "Admins can delete medical sections"  ON public.medical_sections;
DROP POLICY IF EXISTS "Admins can insert medical subsections" ON public.medical_subsections;
DROP POLICY IF EXISTS "Admins can update medical subsections" ON public.medical_subsections;
DROP POLICY IF EXISTS "Admins can delete medical subsections" ON public.medical_subsections;

-- Only CMS roles may ever be stored from now on (also blocks the assign-admin-role function,
-- which runs as service_role and is not subject to RLS but IS subject to CHECK constraints).
ALTER TABLE public.user_roles DROP CONSTRAINT IF EXISTS user_roles_cms_roles_only;
ALTER TABLE public.user_roles ADD CONSTRAINT user_roles_cms_roles_only
  CHECK (role IN ('super_admin'::public.app_role, 'editor'::public.app_role));

-------------------------------------------------------------------------------
-- F3. Patient reports (replaces 003's SELECT policy: super_admin only, no legacy admin)
--     and constrain anonymous uploads to the path shape SecondOpinion.tsx actually produces:
--     `${Date.now()}-${random base36}/${file.name}`.
-------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Admins can view second opinion reports" ON storage.objects;
DROP POLICY IF EXISTS "Super admins view second opinion reports" ON storage.objects;
CREATE POLICY "Super admins view second opinion reports" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'second-opinion-reports' AND public.is_super_admin());

DROP POLICY IF EXISTS "Anyone can upload second opinion reports" ON storage.objects;
DROP POLICY IF EXISTS "Public uploads second opinion reports" ON storage.objects;
CREATE POLICY "Public uploads second opinion reports" ON storage.objects
  FOR INSERT TO anon, authenticated
  WITH CHECK (
    bucket_id = 'second-opinion-reports'
    AND name ~ '^[0-9]{13}-[a-z0-9]{1,8}/[^/]{1,200}$'
  );

-------------------------------------------------------------------------------
-- F4. cms-media: no legacy admin; editors may add files but not overwrite live ones.
-------------------------------------------------------------------------------
DROP POLICY IF EXISTS "CMS users can upload cms-media" ON storage.objects;
CREATE POLICY "CMS users can upload cms-media" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'cms-media' AND (public.is_super_admin() OR public.is_editor()));

DROP POLICY IF EXISTS "CMS users can update cms-media" ON storage.objects;
DROP POLICY IF EXISTS "Super admins can update cms-media" ON storage.objects;
CREATE POLICY "Super admins can update cms-media" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'cms-media' AND public.is_super_admin())
  WITH CHECK (bucket_id = 'cms-media' AND public.is_super_admin());

-- The CMS client does not send uploaded_by; record the uploader server-side.
ALTER TABLE public.media_assets ALTER COLUMN uploaded_by SET DEFAULT auth.uid();

-- F4b. media_assets rows: browser roles may INSERT only the columns the upload flow sends (so
--      uploaded_by cannot be forged) and UPDATE only descriptive metadata (so an editor cannot
--      repoint public_url / storage_path of an existing asset). Matches repository.ts exactly:
--      insert {file_name, storage_path, public_url, media_type, mime_type, size_bytes, alt_text,
--      caption, category}; update {alt_text, caption, category}. Super admin DELETE is unchanged.
REVOKE INSERT, UPDATE ON public.media_assets FROM authenticated;
GRANT INSERT (file_name, storage_path, public_url, media_type, mime_type, size_bytes,
              alt_text, caption, category)
  ON public.media_assets TO authenticated;
GRANT UPDATE (alt_text, caption, category) ON public.media_assets TO authenticated;

-- SVG in a public bucket is a stored-XSS vector on the storage origin. Remove it.
UPDATE storage.buckets
   SET allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'video/webm']
 WHERE id = 'cms-media';
ALTER TABLE public.media_assets DROP CONSTRAINT IF EXISTS chk_media_assets_mime_type;
ALTER TABLE public.media_assets ADD CONSTRAINT chk_media_assets_mime_type CHECK (
  (media_type = 'image' AND mime_type IN ('image/jpeg', 'image/png', 'image/webp'))
  OR (media_type = 'video' AND mime_type IN ('video/mp4', 'video/webm'))
);

-------------------------------------------------------------------------------
-- F5. Editors must not write live content on tables that have no draft/approval workflow.
--     services, blog_posts, case_studies, testimonials are rendered straight from their live
--     columns (testimonials.is_published, blog_posts.published_at), so 002's editor INSERT/UPDATE
--     policies let an editor publish without Super Admin approval.
-------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Editors insert services"     ON public.services;
DROP POLICY IF EXISTS "Editors update services"     ON public.services;
DROP POLICY IF EXISTS "Editors insert blog_posts"   ON public.blog_posts;
DROP POLICY IF EXISTS "Editors update blog_posts"   ON public.blog_posts;
DROP POLICY IF EXISTS "Editors insert case_studies" ON public.case_studies;
DROP POLICY IF EXISTS "Editors update case_studies" ON public.case_studies;
DROP POLICY IF EXISTS "Editors insert testimonials" ON public.testimonials;
DROP POLICY IF EXISTS "Editors update testimonials" ON public.testimonials;

-------------------------------------------------------------------------------
-- F6. Drafts readable by any authenticated (non-CMS) account.
--     "Anyone can read ..." USING (true) also applies to `authenticated`, which still holds
--     table-level SELECT, so any signed-up account could read site_config.draft_config and
--     medical_subsections.draft_* / inactive rows. Public (anon) behaviour is unchanged
--     except that inactive subsections (which every public query already filters out) are hidden.
-------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Anyone can read site config" ON public.site_config;
DROP POLICY IF EXISTS "Public reads site_config" ON public.site_config;
DROP POLICY IF EXISTS "CMS users read site_config" ON public.site_config;
CREATE POLICY "Public reads site_config" ON public.site_config
  FOR SELECT TO anon USING (true);
CREATE POLICY "CMS users read site_config" ON public.site_config
  FOR SELECT TO authenticated USING ((SELECT public.current_cms_role()) IS NOT NULL);

DROP POLICY IF EXISTS "Anyone can read medical subsections" ON public.medical_subsections;
DROP POLICY IF EXISTS "Public reads active medical_subsections" ON public.medical_subsections;
DROP POLICY IF EXISTS "CMS users read medical_subsections" ON public.medical_subsections;
CREATE POLICY "Public reads active medical_subsections" ON public.medical_subsections
  FOR SELECT TO anon USING (is_active = true);
CREATE POLICY "CMS users read medical_subsections" ON public.medical_subsections
  FOR SELECT TO authenticated USING ((SELECT public.current_cms_role()) IS NOT NULL);

-------------------------------------------------------------------------------
-- F7. Table grants: least privilege that matches the policies.
-------------------------------------------------------------------------------
-- 7a. Privileges RLS cannot police. TRUNCATE in particular bypasses RLS entirely.
REVOKE TRUNCATE, REFERENCES, TRIGGER ON ALL TABLES IN SCHEMA public FROM anon, authenticated;

-- 7b. Patient inbox tables: public may only INSERT the form columns (cannot set status/id/created_at).
--     anon gets no SELECT (no anon SELECT policy exists; this also hides them from anon's OpenAPI schema).
REVOKE ALL ON public.appointments, public.contact_messages, public.second_opinions FROM anon, authenticated;

GRANT INSERT (first_name, last_name, phone, email, appointment_type, service, preferred_date,
              preferred_time, symptoms, insurance_provider, emi_interest)
  ON public.appointments TO anon, authenticated;
GRANT SELECT ON public.appointments TO authenticated;

GRANT INSERT (name, email, phone, subject, message)
  ON public.contact_messages TO anon, authenticated;
GRANT SELECT ON public.contact_messages TO authenticated;

GRANT INSERT (name, age, phone, email, condition, current_diagnosis, additional_notes, file_names)
  ON public.second_opinions TO anon, authenticated;
GRANT SELECT ON public.second_opinions TO authenticated;
GRANT UPDATE (status) ON public.second_opinions TO authenticated;

-- 7c. Roles, profiles and audit tables: never visible to anon, read-only for authenticated
--     (profiles keeps 002's column grant UPDATE (display_name)).
REVOKE ALL ON public.user_roles, public.profiles, public.activity_logs,
              public.approval_history, public.content_versions FROM anon;
REVOKE INSERT, UPDATE, DELETE ON public.user_roles, public.activity_logs,
              public.approval_history, public.content_versions FROM authenticated;
REVOKE INSERT, DELETE ON public.profiles FROM authenticated;
GRANT SELECT ON public.user_roles, public.profiles, public.activity_logs,
              public.approval_history, public.content_versions TO authenticated;

-- 7d. Public content tables: anon is read-only. (Column-level SELECT grants from 004/005 on
--     site_config, medical_subsections, cms_pages, cms_seo_metadata are not touched by this REVOKE.)
REVOKE INSERT, UPDATE, DELETE ON
  public.blog_posts, public.case_studies, public.services, public.testimonials,
  public.medical_sections, public.medical_subsections, public.site_config, public.app_settings,
  public.cms_pages, public.cms_seo_metadata, public.media_assets
FROM anon;

-- 7e. The single site_config row must never be deleted from the browser.
REVOKE DELETE ON public.site_config FROM authenticated;

COMMIT;

-------------------------------------------------------------------------------
-- BOOTSTRAP: moved to docs/proposed-migrations/005e_bootstrap_super_admin.sql (run it once,
-- after 005c and 005d have committed and before the 006 harness). That file also contains the
-- read-only bootstrap verification query.
--
-- POST-APPLY CHECKS (read-only):
--   SELECT tablename, policyname, cmd, roles FROM pg_policies
--    WHERE schemaname IN ('public','storage') AND (qual ILIKE '%''admin''%' OR with_check ILIKE '%''admin''%');
--     -> expect 0 rows (no legacy admin policy left)
--   SELECT table_name, grantee, privilege_type FROM information_schema.role_table_grants
--    WHERE table_schema = 'public' AND grantee IN ('anon','authenticated')
--      AND privilege_type IN ('TRUNCATE','REFERENCES','TRIGGER');
--     -> expect 0 rows
--   SELECT table_name, grantee, string_agg(privilege_type, ',' ORDER BY privilege_type)
--     FROM information_schema.role_table_grants
--    WHERE table_schema = 'public' AND grantee IN ('anon','authenticated')
--    GROUP BY 1, 2 ORDER BY 1, 2;
--     -> compare with the privilege matrix in docs/CMS_SECURITY_AUDIT_PRE_APPLY.md
--   (column grants: information_schema.column_privileges for the same grantees)
--
-- ROLLBACK (manual): re-run the CREATE POLICY statements of baseline migration
-- 20260219053650 for the dropped "Admins can ..." policies; GRANT ALL ON <table> TO anon,
-- authenticated restores Supabase default grants; ALTER TABLE public.user_roles DROP CONSTRAINT
-- user_roles_cms_roles_only; re-run 003/004/005 for the storage policies and trigger functions.
-------------------------------------------------------------------------------
