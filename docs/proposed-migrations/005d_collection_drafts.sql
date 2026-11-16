-- PROPOSED – NOT APPLIED. Review only. Requires 001, 002, 004, 005, 005b and 005c.
-- 005d: Database-backed draft → review → publish workflow for Services, Blog posts, Case studies
--       and Testimonials (replaces the browser-only sessionStorage drafts).
--
-- MODEL: one draft row per collection holding a CHANGESET, not a copy of the whole table:
--   draft = { "items": [ {<changed or new row>}, … ], "deletedIds": [ "<uuid>", … ] }
--   * an item whose "id" is an existing row's uuid  → UPDATE of the keys present in the item
--   * an item without a valid existing id            → INSERT (the database assigns the id)
--   * deletedIds                                     → DELETE of those rows
--   Rows that are not mentioned are never touched, so a draft cannot go stale against live data.
--
-- GUARANTEES:
--   * Browser roles never write the live tables (005b F5 already removed Editor write policies;
--     §5 below also removes the Super Admin's direct-write policies on these four tables, so the
--     Super Admin follows the same approval path as everyone else).
--   * publish_collection_draft(key): active Super Admin + status 'approved'; only allow-listed
--     columns; values cast through the real column types (invalid values abort the publish).
--   * Same workflow trigger as 005c (approve only pending, reject needs feedback, edits reopen review).
--
-- Order: 001 → 002 → 003 → 004 → 005 → 005b → 005c → 005d → bootstrap → 006 harness.

BEGIN;

-------------------------------------------------------------------------------
-- 1. Column allow-lists (mirrored in src/lib/cms/collections.ts and checked by a unit test)
--    Excluded on purpose: id, created_at, updated_at, views_count, likes_count.
-------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.collection_columns(_key text)
RETURNS text[] LANGUAGE sql IMMUTABLE SET search_path = public AS $$
  SELECT CASE _key
    WHEN 'services' THEN ARRAY[
      'name', 'slug', 'category', 'body_part', 'short_description', 'cost_range', 'success_rate',
      'patients_treated', 'emi_available', 'insurance_covered', 'procedure_time', 'hospital_stay',
      'recovery_time', 'full_recovery', 'sort_order']
    WHEN 'blog_posts' THEN ARRAY[
      'title', 'slug', 'excerpt', 'content', 'category', 'tags', 'read_time', 'is_featured', 'published_at']
    WHEN 'case_studies' THEN ARRAY[
      'slug', 'patient_initials', 'age', 'gender', 'occupation', 'condition', 'procedure_name',
      'surgery_date', 'surgery_type', 'hospital_stay_days', 'follow_up_period', 'outcome_summary',
      'pain_score_pre', 'pain_score_post', 'range_of_motion_pre', 'range_of_motion_post', 'testimonial',
      'return_to_work', 'return_to_sports', 'is_featured', 'milestones', 'published_date']
    WHEN 'testimonials' THEN ARRAY[
      'name', 'initials', 'age', 'gender', 'occupation', 'condition', 'rating', 'location', 'text',
      'response', 'source', 'is_featured', 'is_published', 'sort_order']
    ELSE ARRAY[]::text[]
  END::text[]
$$;

-------------------------------------------------------------------------------
-- 2. Draft table (one seeded row per collection)
-------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.content_collection_drafts (
  collection_key  text PRIMARY KEY
                  CHECK (collection_key IN ('services', 'blog_posts', 'case_studies', 'testimonials')),
  draft           jsonb NOT NULL DEFAULT '{"items": [], "deletedIds": []}'::jsonb
                  CHECK (jsonb_typeof(draft) = 'object'
                         AND jsonb_typeof(draft -> 'items') = 'array'
                         AND jsonb_typeof(draft -> 'deletedIds') = 'array'
                         AND octet_length(draft::text) <= 2097152),
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

ALTER TABLE public.content_collection_drafts ENABLE ROW LEVEL SECURITY;

INSERT INTO public.content_collection_drafts (collection_key)
VALUES ('services'), ('blog_posts'), ('case_studies'), ('testimonials')
ON CONFLICT (collection_key) DO NOTHING;

REVOKE ALL ON public.content_collection_drafts FROM anon, authenticated;
GRANT SELECT ON public.content_collection_drafts TO authenticated;
GRANT UPDATE (draft, workflow_status, review_feedback) ON public.content_collection_drafts TO authenticated;

DROP POLICY IF EXISTS "CMS users read content_collection_drafts" ON public.content_collection_drafts;
CREATE POLICY "CMS users read content_collection_drafts" ON public.content_collection_drafts
  FOR SELECT TO authenticated
  USING (public.is_super_admin() OR public.is_editor());

DROP POLICY IF EXISTS "CMS users update content_collection_drafts" ON public.content_collection_drafts;
CREATE POLICY "CMS users update content_collection_drafts" ON public.content_collection_drafts
  FOR UPDATE TO authenticated
  USING (public.is_super_admin() OR public.is_editor())
  WITH CHECK (public.is_super_admin() OR public.is_editor());

DROP TRIGGER IF EXISTS trg_enforce_collection_draft_workflow ON public.content_collection_drafts;
CREATE TRIGGER trg_enforce_collection_draft_workflow
  BEFORE INSERT OR UPDATE ON public.content_collection_drafts
  FOR EACH ROW EXECUTE FUNCTION public.enforce_cms_draft_workflow('collection_key');

-------------------------------------------------------------------------------
-- 3. Publish an approved changeset
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
  v_uuid_re  constant text := '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$';
BEGIN
  IF NOT public.is_super_admin() THEN
    RAISE EXCEPTION 'Only a Super Admin can publish content.' USING ERRCODE = '42501';
  END IF;
  IF array_length(v_cols, 1) IS NULL THEN
    RAISE EXCEPTION 'Unsupported collection: %', _key;
  END IF;

  SELECT * INTO v_row FROM public.content_collection_drafts WHERE collection_key = _key FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'No draft exists for %.', _key;
  END IF;
  IF v_row.workflow_status <> 'approved' THEN
    RAISE EXCEPTION 'Only approved changes can be published (current status: %).', v_row.workflow_status;
  END IF;

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

  -- Deletions (only explicit, approved ids)
  FOR v_id_text IN SELECT x FROM jsonb_array_elements_text(v_row.draft -> 'deletedIds') x LOOP
    IF v_id_text ~ v_uuid_re THEN
      EXECUTE format('DELETE FROM public.%I WHERE id = $1', _key) USING v_id_text::uuid;
      GET DIAGNOSTICS v_n = ROW_COUNT;
      v_deleted := v_deleted + v_n;
    END IF;
  END LOOP;

  INSERT INTO public.content_versions (entity_type, entity_id, version_label, snapshot, published_by, published_email)
  VALUES ('collection', _key, _key || ' publish', v_row.draft, auth.uid(),
          (SELECT email FROM auth.users WHERE id = auth.uid()));

  -- The changeset is now live: clear it.
  UPDATE public.content_collection_drafts
     SET workflow_status = 'published',
         draft = '{"items": [], "deletedIds": []}'::jsonb,
         published_by = auth.uid(),
         published_at = now(),
         updated_by = auth.uid(),
         updated_at = now()
   WHERE collection_key = _key;

  PERFORM public.record_workflow_transition('collection', _key, 'approved', 'published', NULL,
    jsonb_build_object('inserted', v_inserted, 'updated', v_updated, 'deleted', v_deleted));

  RETURN jsonb_build_object('inserted', v_inserted, 'updated', v_updated, 'deleted', v_deleted);
END $$;

REVOKE ALL ON FUNCTION public.publish_collection_draft(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.publish_collection_draft(text) TO authenticated;

-------------------------------------------------------------------------------
-- 4. approval_history must accept the new entity types (004 left entity_type free text;
--    record_workflow_transition only length-limits it). Nothing to change — documented here.
-------------------------------------------------------------------------------

-------------------------------------------------------------------------------
-- 5. No direct browser writes to the four live tables, Super Admin included.
--    002 created "Super admins manage <table>" FOR ALL; replace it with a read-only policy so the
--    CMS can still list every row (the public SELECT policies stay unchanged).
-------------------------------------------------------------------------------
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['services', 'blog_posts', 'case_studies', 'testimonials'] LOOP
    EXECUTE format('DROP POLICY IF EXISTS "Super admins manage %1$s" ON public.%1$I', t);
    EXECUTE format('DROP POLICY IF EXISTS "CMS users read %1$s" ON public.%1$I', t);
    EXECUTE format('CREATE POLICY "CMS users read %1$s" ON public.%1$I FOR SELECT TO authenticated
                    USING (public.is_super_admin() OR public.is_editor())', t);
    EXECUTE format('REVOKE INSERT, UPDATE, DELETE ON public.%I FROM anon, authenticated', t);
  END LOOP;
END $$;

COMMIT;

-------------------------------------------------------------------------------
-- POST-APPLY CHECKS (read-only):
--   SELECT collection_key, workflow_status, jsonb_array_length(draft->'items') FROM public.content_collection_drafts;
--     -> 4 rows, 'published', 0
--   SELECT tablename, policyname, cmd FROM pg_policies
--    WHERE tablename IN ('services','blog_posts','case_studies','testimonials') ORDER BY 1, 2;
--     -> per table: "Anyone can read …" (SELECT) and "CMS users read …" (SELECT) only
--
-- ROLLBACK (manual):
--   BEGIN;
--   DROP FUNCTION IF EXISTS public.publish_collection_draft(text);
--   DROP TABLE IF EXISTS public.content_collection_drafts;
--   DROP FUNCTION IF EXISTS public.collection_columns(text);
--   -- restore Super Admin write access if required:
--   -- GRANT INSERT, UPDATE, DELETE ON public.services, public.blog_posts, public.case_studies,
--   --   public.testimonials TO authenticated;  and re-run 002 §5 for "Super admins manage …"
--   COMMIT;
-------------------------------------------------------------------------------
