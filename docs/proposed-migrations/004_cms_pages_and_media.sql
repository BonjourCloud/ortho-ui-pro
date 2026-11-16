-- PROPOSED – NOT APPLIED. Review only. Requires 001 and 002 to be applied first.
-- 004: Iteration 3 – Pages Management, Homepage Sections, Treatment Drafts, Media Library,
--      and Rajiv's Confirmed Approval Workflow (Draft -> Pending Approval -> Approved/Rejected -> Published).
--
-- DESIGN RULES:
-- 1. Non-breaking & Additive:
--    - Public website queries (`site_config.config`, `medical_subsections.content`, `cms_pages.published_sections`)
--      ONLY read published columns. Drafts (`draft_*`) are never read by public components unless `?preview=1`
--      is active AND the user is an authenticated CMS user (`current_cms_role() IS NOT NULL`).
-- 2. Strict Role & Workflow Separation:
--    - Explicit statuses: `'draft'`, `'pending_approval'`, `'approved'`, `'rejected'`, `'published'`.
--    - Editors (`is_editor()`):
--      * Can save drafts (`draft_*` columns, `workflow_status = 'draft'`) and submit for review (`workflow_status = 'pending_approval'`).
--      * Can NEVER directly modify live published fields (`site_config.config`, `cms_pages.published_sections`,
--        `cms_pages.seo_*`, `medical_subsections.name/description/content/meta_description/structured_blocks/hero_image_url`).
--      * Can NEVER set `workflow_status` to `'approved'` or `'published'`.
--      * Can NEVER DELETE rows from any table or storage bucket.
--    - Super Admins (`is_super_admin()`):
--      * Can review pending changes, approve (`'approved'`), reject with feedback (`'rejected'`), publish approved changes (`'published'`),
--        or publish directly (`'published'`).
-- 3. Approval History & Activity Logging:
--    - Every submission, approval, rejection (with feedback), and publication is recorded in `public.approval_history`
--      AND appended to `public.activity_logs`.

BEGIN;

-------------------------------------------------------------------------------
-- 1. Workflow Status Check & Approval History Table
-------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.approval_history (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type     text NOT NULL, -- 'cms_page' | 'site_config' | 'medical_subsection' | 'service' | 'blog_post'
  entity_id       text NOT NULL, -- slug or UUID
  from_status     text,
  to_status       text NOT NULL CHECK (to_status IN ('draft', 'pending_approval', 'approved', 'rejected', 'published')),
  actor_id        uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  actor_email     text,
  actor_role      text,
  feedback        text,          -- Required when to_status = 'rejected'; optional note otherwise
  snapshot        jsonb DEFAULT '{}'::jsonb,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_approval_history_entity ON public.approval_history(entity_type, entity_id, created_at DESC);
ALTER TABLE public.approval_history ENABLE ROW LEVEL SECURITY;

-- All authenticated CMS users (Super Admin & Editor) can read approval history & rejection feedback
DROP POLICY IF EXISTS "CMS users read approval_history" ON public.approval_history;
CREATE POLICY "CMS users read approval_history"
  ON public.approval_history FOR SELECT TO authenticated
  USING (public.current_cms_role() IS NOT NULL);

-- Append-only via SECURITY DEFINER helper function below
REVOKE INSERT, UPDATE, DELETE ON public.approval_history FROM anon, authenticated;

CREATE OR REPLACE FUNCTION public.record_workflow_transition(
  _entity_type text,
  _entity_id   text,
  _from_status text,
  _to_status   text,
  _feedback    text DEFAULT NULL,
  _snapshot    jsonb DEFAULT '{}'::jsonb
)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_role text := public.current_cms_role();
  v_email text;
BEGIN
  IF auth.uid() IS NULL OR v_role IS NULL THEN
    RAISE EXCEPTION 'Not authorised to record workflow transition';
  END IF;

  IF _to_status NOT IN ('draft', 'pending_approval', 'approved', 'rejected', 'published') THEN
    RAISE EXCEPTION 'Invalid workflow target status: %', _to_status;
  END IF;

  IF _to_status IN ('approved', 'rejected', 'published') AND NOT public.can_publish_content() THEN
    RAISE EXCEPTION 'Only a Super Admin can approve, reject, or publish content';
  END IF;

  IF _to_status = 'rejected' AND ( _feedback IS NULL OR btrim(_feedback) = '' ) THEN
    RAISE EXCEPTION 'Rejection feedback is required when rejecting content';
  END IF;

  SELECT email INTO v_email FROM auth.users WHERE id = auth.uid();

  INSERT INTO public.approval_history (
    entity_type, entity_id, from_status, to_status, actor_id, actor_email, actor_role, feedback, snapshot
  ) VALUES (
    left(_entity_type, 100),
    left(_entity_id, 200),
    _from_status,
    _to_status,
    auth.uid(),
    v_email,
    v_role,
    _feedback,
    COALESCE(_snapshot, '{}'::jsonb)
  );

  -- Also write to activity_logs
  PERFORM public.log_activity(
    'workflow.' || _to_status,
    _entity_type,
    _entity_id,
    jsonb_build_object('from_status', _from_status, 'to_status', _to_status, 'feedback', _feedback)
  );
END $$;

REVOKE ALL ON FUNCTION public.record_workflow_transition(text, text, text, text, text, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.record_workflow_transition(text, text, text, text, text, jsonb) TO authenticated;

-------------------------------------------------------------------------------
-- 2. cms_pages: Structured page & section management (Homepage, About, Contact, etc.)
-------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.cms_pages (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug               text NOT NULL UNIQUE, -- 'home', 'about', 'contact', 'book'
  title              text NOT NULL,
  workflow_status    text NOT NULL DEFAULT 'published'
                     CHECK (workflow_status IN ('draft', 'pending_approval', 'approved', 'rejected', 'published')),
  -- Published (LIVE on public website)
  published_sections jsonb NOT NULL DEFAULT '[]'::jsonb,
  seo_title          text,
  seo_description    text,
  seo_keywords       text,
  og_image_url       text,
  -- Draft / Staged (ONLY visible in CMS & authenticated ?preview=1)
  draft_sections     jsonb,
  draft_seo_title    text,
  draft_seo_description text,
  draft_seo_keywords text,
  draft_og_image_url text,
  -- Workflow & review metadata
  submitted_by       uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  submitted_at       timestamptz,
  reviewed_by        uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at        timestamptz,
  review_feedback    text,
  updated_by         uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  published_by       uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  published_at       timestamptz DEFAULT now(),
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.cms_pages ENABLE ROW LEVEL SECURITY;

-- Public visitors (anon) can only read rows that have been published (`published_at IS NOT NULL`),
-- and draft/review columns are explicitly revoked from `anon` below so anonymous API requests
-- can never inspect unpublished drafts even via direct PostgREST queries.
DROP POLICY IF EXISTS "Public reads published cms_pages" ON public.cms_pages;
CREATE POLICY "Public reads published cms_pages"
  ON public.cms_pages FOR SELECT TO anon
  USING (published_at IS NOT NULL);

-- Authenticated CMS staff (super_admin, editor, legacy_admin) can read all cms_pages rows (including drafts).
-- Authenticated users WITHOUT a CMS role receive 0 rows.
DROP POLICY IF EXISTS "CMS users read cms_pages" ON public.cms_pages;
CREATE POLICY "CMS users read cms_pages"
  ON public.cms_pages FOR SELECT TO authenticated
  USING (public.current_cms_role() IS NOT NULL);

DROP POLICY IF EXISTS "Super admins manage cms_pages" ON public.cms_pages;
CREATE POLICY "Super admins manage cms_pages"
  ON public.cms_pages FOR ALL TO authenticated
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

DROP POLICY IF EXISTS "Editors insert cms_pages" ON public.cms_pages;
CREATE POLICY "Editors insert cms_pages"
  ON public.cms_pages FOR INSERT TO authenticated
  WITH CHECK (public.is_editor());

DROP POLICY IF EXISTS "Editors update cms_pages" ON public.cms_pages;
CREATE POLICY "Editors update cms_pages"
  ON public.cms_pages FOR UPDATE TO authenticated
  USING (public.is_editor())
  WITH CHECK (public.is_editor());

DROP TRIGGER IF EXISTS update_cms_pages_updated_at ON public.cms_pages;
CREATE TRIGGER update_cms_pages_updated_at
  BEFORE UPDATE ON public.cms_pages
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-------------------------------------------------------------------------------
-- 3. Draft & Approval Columns on site_config (Clinic Info, Doctor Profile, Branding)
--    and medical_subsections (Treatment Pages)
-------------------------------------------------------------------------------
ALTER TABLE public.site_config
  ADD COLUMN IF NOT EXISTS draft_config jsonb,
  ADD COLUMN IF NOT EXISTS workflow_status text NOT NULL DEFAULT 'published'
    CHECK (workflow_status IN ('draft', 'pending_approval', 'approved', 'rejected', 'published')),
  ADD COLUMN IF NOT EXISTS submitted_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS submitted_at timestamptz,
  ADD COLUMN IF NOT EXISTS reviewed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS reviewed_at timestamptz,
  ADD COLUMN IF NOT EXISTS review_feedback text,
  ADD COLUMN IF NOT EXISTS draft_updated_at timestamptz,
  ADD COLUMN IF NOT EXISTS draft_updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.medical_subsections
  ADD COLUMN IF NOT EXISTS workflow_status text NOT NULL DEFAULT 'published'
    CHECK (workflow_status IN ('draft', 'pending_approval', 'approved', 'rejected', 'published')),
  ADD COLUMN IF NOT EXISTS draft_name text,
  ADD COLUMN IF NOT EXISTS draft_description text,
  ADD COLUMN IF NOT EXISTS draft_content text,
  ADD COLUMN IF NOT EXISTS draft_meta_description text,
  ADD COLUMN IF NOT EXISTS structured_blocks jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS draft_structured_blocks jsonb,
  ADD COLUMN IF NOT EXISTS hero_image_url text,
  ADD COLUMN IF NOT EXISTS draft_hero_image_url text,
  ADD COLUMN IF NOT EXISTS submitted_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS submitted_at timestamptz,
  ADD COLUMN IF NOT EXISTS reviewed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS reviewed_at timestamptz,
  ADD COLUMN IF NOT EXISTS review_feedback text,
  ADD COLUMN IF NOT EXISTS published_at timestamptz DEFAULT now(),
  ADD COLUMN IF NOT EXISTS updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL;

-- Defence-in-depth: In PostgreSQL, revoking column-level SELECT has no effect if the role still
-- holds table-level SELECT from Supabase default privileges. Therefore we first REVOKE ALL at
-- the table level from `anon` and then GRANT SELECT strictly on the published columns.
REVOKE ALL ON public.cms_pages FROM anon;
GRANT SELECT (
  id, slug, title, published_sections, seo_title, seo_description,
  seo_keywords, og_image_url, published_at, created_at, updated_at
) ON public.cms_pages TO anon;

REVOKE ALL ON public.site_config FROM anon;
GRANT SELECT (
  id, config, updated_at
) ON public.site_config TO anon;

REVOKE ALL ON public.medical_subsections FROM anon;
GRANT SELECT (
  id, section_id, parent_id, name, slug, description, content, meta_description,
  sort_order, is_active, is_featured, level, structured_blocks, hero_image_url,
  published_at, created_at, updated_at
) ON public.medical_subsections TO anon;

-------------------------------------------------------------------------------
-- 4. Database Trigger Guards: Enforce Approval Workflow & Protect Published Columns
-------------------------------------------------------------------------------

-- 4A. Trigger on public.site_config:
-- Editors can ONLY modify `draft_config` and set `workflow_status` to `'draft'` or `'pending_approval'`.
-- Editors can NEVER modify live `site_config.config` (clinic info, doctor profile, branding) or set status to `approved`/`published`.
CREATE OR REPLACE FUNCTION public.enforce_workflow_site_config()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
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
    IF NEW.reviewed_by IS DISTINCT FROM OLD.reviewed_by
       OR NEW.reviewed_at IS DISTINCT FROM OLD.reviewed_at
       OR NEW.review_feedback IS DISTINCT FROM OLD.review_feedback
    THEN
      RAISE EXCEPTION 'Only a Super Admin can record review decisions.';
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

  NEW.draft_updated_by := auth.uid();
  NEW.draft_updated_at := now();
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_enforce_workflow_site_config ON public.site_config;
CREATE TRIGGER trg_enforce_workflow_site_config
  BEFORE INSERT OR UPDATE ON public.site_config
  FOR EACH ROW EXECUTE FUNCTION public.enforce_workflow_site_config();

-- 4B. Trigger on public.cms_pages:
-- Editors can ONLY modify `draft_*` columns and set `workflow_status` to `'draft'` or `'pending_approval'`.
CREATE OR REPLACE FUNCTION public.enforce_workflow_cms_pages()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
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
      IF NEW.id IS DISTINCT FROM OLD.id
         OR NEW.slug IS DISTINCT FROM OLD.slug
         OR NEW.title IS DISTINCT FROM OLD.title
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
      IF NEW.reviewed_by IS DISTINCT FROM OLD.reviewed_by
         OR NEW.reviewed_at IS DISTINCT FROM OLD.reviewed_at
         OR NEW.review_feedback IS DISTINCT FROM OLD.review_feedback
      THEN
        RAISE EXCEPTION 'Only a Super Admin can record review decisions.';
      END IF;
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

DROP TRIGGER IF EXISTS trg_enforce_workflow_cms_pages ON public.cms_pages;
CREATE TRIGGER trg_enforce_workflow_cms_pages
  BEFORE INSERT OR UPDATE ON public.cms_pages
  FOR EACH ROW EXECUTE FUNCTION public.enforce_workflow_cms_pages();

-- 4C. Trigger on public.medical_subsections:
-- Editors can ONLY modify `draft_*` columns and set `workflow_status` to `'draft'` or `'pending_approval'`.
CREATE OR REPLACE FUNCTION public.enforce_workflow_subsections()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.can_publish_content() THEN
    IF TG_OP = 'INSERT' THEN
      IF NEW.workflow_status NOT IN ('draft', 'pending_approval') THEN
        NEW.workflow_status := 'draft';
      END IF;
      NEW.is_active := false; -- Not visible on public nav until Super Admin approves & publishes
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
      IF NEW.reviewed_by IS DISTINCT FROM OLD.reviewed_by
         OR NEW.reviewed_at IS DISTINCT FROM OLD.reviewed_at
         OR NEW.review_feedback IS DISTINCT FROM OLD.review_feedback
      THEN
        RAISE EXCEPTION 'Only a Super Admin can record review decisions.';
      END IF;
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

DROP TRIGGER IF EXISTS trg_enforce_workflow_subsections ON public.medical_subsections;
CREATE TRIGGER trg_enforce_workflow_subsections
  BEFORE INSERT OR UPDATE ON public.medical_subsections
  FOR EACH ROW EXECUTE FUNCTION public.enforce_workflow_subsections();

-------------------------------------------------------------------------------
-- 5. Media Library: public.media_assets table + storage bucket `cms-media`
-------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.media_assets (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  file_name     text NOT NULL,
  storage_path  text NOT NULL UNIQUE,
  public_url    text NOT NULL,
  media_type    text NOT NULL CHECK (media_type IN ('image', 'video')),
  mime_type     text NOT NULL,
  size_bytes    bigint NOT NULL DEFAULT 0,
  alt_text      text NOT NULL DEFAULT '',
  caption       text DEFAULT '',
  category      text NOT NULL DEFAULT 'general',
  uploaded_by   uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  -- Reconciled media limits: Images <= 5 MB (5,242,880 bytes); Videos <= 50 MB (52,428,800 bytes)
  CONSTRAINT chk_media_assets_size_limit CHECK (
    (media_type = 'image' AND size_bytes >= 0 AND size_bytes <= 5242880)
    OR (media_type = 'video' AND size_bytes >= 0 AND size_bytes <= 52428800)
  ),
  CONSTRAINT chk_media_assets_mime_type CHECK (
    (media_type = 'image' AND mime_type IN ('image/jpeg', 'image/png', 'image/webp', 'image/svg+xml'))
    OR (media_type = 'video' AND mime_type IN ('video/mp4', 'video/webm'))
  )
);

CREATE INDEX IF NOT EXISTS idx_media_assets_category ON public.media_assets(category);
CREATE INDEX IF NOT EXISTS idx_media_assets_media_type ON public.media_assets(media_type);
ALTER TABLE public.media_assets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read media_assets" ON public.media_assets;
CREATE POLICY "Anyone can read media_assets"
  ON public.media_assets FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Super admins manage media_assets" ON public.media_assets;
CREATE POLICY "Super admins manage media_assets"
  ON public.media_assets FOR ALL TO authenticated
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

DROP POLICY IF EXISTS "Editors insert media_assets" ON public.media_assets;
CREATE POLICY "Editors insert media_assets"
  ON public.media_assets FOR INSERT TO authenticated
  WITH CHECK (public.is_editor());

DROP POLICY IF EXISTS "Editors update media_assets" ON public.media_assets;
CREATE POLICY "Editors update media_assets"
  ON public.media_assets FOR UPDATE TO authenticated
  USING (public.is_editor())
  WITH CHECK (public.is_editor());

DROP TRIGGER IF EXISTS update_media_assets_updated_at ON public.media_assets;
CREATE TRIGGER update_media_assets_updated_at
  BEFORE UPDATE ON public.media_assets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Bucket-level ceiling is 50 MB (52,428,800 bytes) because a single bucket holds both
-- 5 MB images and 50 MB videos; per-type limits (5 MB image / 50 MB video) are enforced
-- by `validateMediaFile()` in the frontend and `chk_media_assets_size_limit` above.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'cms-media',
  'cms-media',
  true,
  52428800,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml', 'video/mp4', 'video/webm']
)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Anyone can view cms-media" ON storage.objects;
CREATE POLICY "Anyone can view cms-media"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'cms-media');

DROP POLICY IF EXISTS "CMS users can upload cms-media" ON storage.objects;
CREATE POLICY "CMS users can upload cms-media"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'cms-media'
    AND public.is_account_active(auth.uid())
    AND (public.is_super_admin() OR public.is_editor() OR public.has_role(auth.uid(), 'admin'))
  );

DROP POLICY IF EXISTS "CMS users can update cms-media" ON storage.objects;
CREATE POLICY "CMS users can update cms-media"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'cms-media'
    AND public.is_account_active(auth.uid())
    AND (public.is_super_admin() OR public.is_editor() OR public.has_role(auth.uid(), 'admin'))
  );

DROP POLICY IF EXISTS "Super admins can delete cms-media" ON storage.objects;
CREATE POLICY "Super admins can delete cms-media"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'cms-media'
    AND public.is_super_admin()
  );

COMMIT;

-------------------------------------------------------------------------------
-- ROLLBACK (manual, if ever required):
--   BEGIN;
--   DROP POLICY IF EXISTS "Anyone can view cms-media" ON storage.objects;
--   DROP POLICY IF EXISTS "CMS users can upload cms-media" ON storage.objects;
--   DROP POLICY IF EXISTS "CMS users can update cms-media" ON storage.objects;
--   DROP POLICY IF EXISTS "Super admins can delete cms-media" ON storage.objects;
--   DROP TRIGGER IF EXISTS trg_enforce_workflow_site_config ON public.site_config;
--   DROP TRIGGER IF EXISTS trg_enforce_workflow_cms_pages ON public.cms_pages;
--   DROP TRIGGER IF EXISTS trg_enforce_workflow_subsections ON public.medical_subsections;
--   DROP FUNCTION IF EXISTS public.enforce_workflow_site_config(), public.enforce_workflow_cms_pages(),
--                           public.enforce_workflow_subsections(), public.record_workflow_transition(text,text,text,text,text,jsonb);
--   DROP TABLE IF EXISTS public.media_assets, public.cms_pages, public.approval_history;
--   ALTER TABLE public.site_config
--     DROP COLUMN IF EXISTS draft_config, DROP COLUMN IF EXISTS workflow_status,
--     DROP COLUMN IF EXISTS submitted_by, DROP COLUMN IF EXISTS submitted_at,
--     DROP COLUMN IF EXISTS reviewed_by, DROP COLUMN IF EXISTS reviewed_at,
--     DROP COLUMN IF EXISTS review_feedback, DROP COLUMN IF EXISTS draft_updated_at,
--     DROP COLUMN IF EXISTS draft_updated_by;
--   ALTER TABLE public.medical_subsections
--     DROP COLUMN IF EXISTS workflow_status, DROP COLUMN IF EXISTS draft_name,
--     DROP COLUMN IF EXISTS draft_description, DROP COLUMN IF EXISTS draft_content,
--     DROP COLUMN IF EXISTS draft_meta_description, DROP COLUMN IF EXISTS structured_blocks,
--     DROP COLUMN IF EXISTS draft_structured_blocks, DROP COLUMN IF EXISTS hero_image_url,
--     DROP COLUMN IF EXISTS draft_hero_image_url, DROP COLUMN IF EXISTS submitted_by,
--     DROP COLUMN IF EXISTS submitted_at, DROP COLUMN IF EXISTS reviewed_by,
--     DROP COLUMN IF EXISTS reviewed_at, DROP COLUMN IF EXISTS review_feedback,
--     DROP COLUMN IF EXISTS published_at, DROP COLUMN IF EXISTS updated_by;
--   COMMIT;
-------------------------------------------------------------------------------
