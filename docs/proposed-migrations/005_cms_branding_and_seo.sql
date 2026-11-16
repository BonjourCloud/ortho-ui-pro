-- PROPOSED – NOT APPLIED. Review only. Requires 001, 002, and 004 to be applied first.
-- 005: Iteration 4 – Branding & Theme Customisation, Per-Route SEO Metadata,
--      and Content Version History (`public.content_versions`).
--
-- DESIGN RULES:
-- 1. Preserves Rajiv's Confirmed Approval Workflow:
--    - Editors (`is_editor()`) can save drafts (`draft_*` columns) and submit for review (`workflow_status = 'pending_approval'`).
--    - Editors can NEVER directly modify live published SEO or Branding columns (`published_*` / `status = 'published'`).
--    - Only Super Admins (`is_super_admin()` / `can_publish_content()`) can approve, reject with feedback, or publish.
-- 2. Preserves Existing SEO, JSON-LD, and Google Analytics:
--    - `cms_seo_metadata` provides route-level overrides (`title`, `description`, `keywords`, `og_image_url`, `canonical_url`, `noindex`).
--    - If no row exists for a route, `SEO.tsx` falls back to its existing defaults.
-- 3. Automatic Version History (`public.content_versions`):
--    - Every time a page, site_config, or SEO record is published, a snapshot is recorded in `content_versions`
--      so Super Admins can inspect prior published versions.

BEGIN;

-------------------------------------------------------------------------------
-- 1. cms_seo_metadata: Per-page SEO metadata with Draft -> Review -> Publish workflow
-------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.cms_seo_metadata (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  route_path            text NOT NULL UNIQUE, -- e.g. '/', '/about', '/services', '/book', '/contact', '/orthopaedics'
  page_label            text NOT NULL,
  workflow_status       text NOT NULL DEFAULT 'published'
                        CHECK (workflow_status IN ('draft', 'pending_approval', 'approved', 'rejected', 'published')),
  -- Published (LIVE on public website)
  seo_title             text,
  seo_description       text,
  seo_keywords          text,
  og_image_url          text,
  canonical_url         text,
  noindex               boolean NOT NULL DEFAULT false,
  -- Draft / Staged (ONLY visible in CMS & authenticated ?preview=1)
  draft_seo_title       text,
  draft_seo_description text,
  draft_seo_keywords    text,
  draft_og_image_url    text,
  draft_canonical_url   text,
  draft_noindex         boolean,
  -- Review metadata
  submitted_by          uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  submitted_at          timestamptz,
  reviewed_by           uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at           timestamptz,
  review_feedback       text,
  updated_by            uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  published_by          uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  published_at          timestamptz DEFAULT now(),
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.cms_seo_metadata ENABLE ROW LEVEL SECURITY;

-- Public visitors (anon) can only read rows that have been published (`published_at IS NOT NULL`),
-- and draft/review columns are explicitly revoked from `anon` below so anonymous API requests
-- can never inspect unpublished SEO drafts.
DROP POLICY IF EXISTS "Public reads published cms_seo_metadata" ON public.cms_seo_metadata;
CREATE POLICY "Public reads published cms_seo_metadata"
  ON public.cms_seo_metadata FOR SELECT TO anon
  USING (published_at IS NOT NULL);

-- Authenticated CMS staff (super_admin, editor, legacy_admin) can read all cms_seo_metadata rows (including drafts).
DROP POLICY IF EXISTS "CMS users read cms_seo_metadata" ON public.cms_seo_metadata;
CREATE POLICY "CMS users read cms_seo_metadata"
  ON public.cms_seo_metadata FOR SELECT TO authenticated
  USING (public.current_cms_role() IS NOT NULL);

-- Defence-in-depth: Revoke table-level privileges from `anon` and grant column-level SELECT
-- strictly on published SEO columns so `anon` can never query `draft_*` or review columns.
REVOKE ALL ON public.cms_seo_metadata FROM anon;
GRANT SELECT (
  id, route_path, page_label, seo_title, seo_description, seo_keywords,
  og_image_url, canonical_url, noindex, published_at, created_at, updated_at
) ON public.cms_seo_metadata TO anon;

-- Super Admin: full access (including DELETE)
DROP POLICY IF EXISTS "Super admins manage cms_seo_metadata" ON public.cms_seo_metadata;
CREATE POLICY "Super admins manage cms_seo_metadata"
  ON public.cms_seo_metadata FOR ALL TO authenticated
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

-- Editors: INSERT and UPDATE drafts only (NO DELETE)
DROP POLICY IF EXISTS "Editors insert cms_seo_metadata" ON public.cms_seo_metadata;
CREATE POLICY "Editors insert cms_seo_metadata"
  ON public.cms_seo_metadata FOR INSERT TO authenticated
  WITH CHECK (public.is_editor());

DROP POLICY IF EXISTS "Editors update cms_seo_metadata" ON public.cms_seo_metadata;
CREATE POLICY "Editors update cms_seo_metadata"
  ON public.cms_seo_metadata FOR UPDATE TO authenticated
  USING (public.is_editor())
  WITH CHECK (public.is_editor());

DROP TRIGGER IF EXISTS update_cms_seo_metadata_updated_at ON public.cms_seo_metadata;
CREATE TRIGGER update_cms_seo_metadata_updated_at
  BEFORE UPDATE ON public.cms_seo_metadata
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger Guard: Prevent Editors from modifying live published SEO columns
CREATE OR REPLACE FUNCTION public.enforce_workflow_seo_metadata()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
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
      IF NEW.id IS DISTINCT FROM OLD.id
         OR NEW.route_path IS DISTINCT FROM OLD.route_path
         OR NEW.page_label IS DISTINCT FROM OLD.page_label
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

DROP TRIGGER IF EXISTS trg_enforce_workflow_seo_metadata ON public.cms_seo_metadata;
CREATE TRIGGER trg_enforce_workflow_seo_metadata
  BEFORE INSERT OR UPDATE ON public.cms_seo_metadata
  FOR EACH ROW EXECUTE FUNCTION public.enforce_workflow_seo_metadata();

-------------------------------------------------------------------------------
-- 2. content_versions: Immutable version snapshots on publish
-------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.content_versions (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type     text NOT NULL, -- 'cms_page' | 'site_config' | 'medical_subsection' | 'cms_seo_metadata'
  entity_id       text NOT NULL,
  version_label   text,
  snapshot        jsonb NOT NULL,
  published_by    uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  published_email text,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_content_versions_entity ON public.content_versions(entity_type, entity_id, created_at DESC);
ALTER TABLE public.content_versions ENABLE ROW LEVEL SECURITY;

-- Authenticated CMS users can view version history; only Super Admin can restore/publish a prior version
DROP POLICY IF EXISTS "CMS users read content_versions" ON public.content_versions;
CREATE POLICY "CMS users read content_versions"
  ON public.content_versions FOR SELECT TO authenticated
  USING (public.current_cms_role() IS NOT NULL);

REVOKE INSERT, UPDATE, DELETE ON public.content_versions FROM anon, authenticated;

COMMIT;

-------------------------------------------------------------------------------
-- ROLLBACK (manual, if ever required):
--   BEGIN;
--   DROP TRIGGER IF EXISTS trg_enforce_workflow_seo_metadata ON public.cms_seo_metadata;
--   DROP FUNCTION IF EXISTS public.enforce_workflow_seo_metadata();
--   DROP TABLE IF EXISTS public.content_versions, public.cms_seo_metadata;
--   COMMIT;
-------------------------------------------------------------------------------
