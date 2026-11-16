-- STAGING SECURITY & RLS VERIFICATION HARNESS (DO NOT RUN ON PRODUCTION)
-- Purpose: Self-contained, automated PostgreSQL verification of all Iteration 2–4 RLS policies,
--          column-level draft privacy grants, trigger guards, media size limits (5 MB image / 50 MB video),
--          patient report privacy, and Rajiv's 5-state approval workflow once Migrations 001–005
--          005b, 005c AND 005d are applied to the staging database (TEST 1.3b/1.3c and TEST 8 depend on
--          005b; TESTS 9–10 on 005c; TEST 11 on 005d).
--          This is NOT a migration: never place it in supabase/migrations/. It temporarily inserts
--          synthetic rows into auth.users and storage.objects; run it on staging only.
--          It uses its own synthetic users, so it does not depend on (or touch) the real Super Admin
--          created by 005e_bootstrap_super_admin.sql. Run it as `postgres` (Supabase SQL editor).
--          Lines starting with "INFO" are expected on projects whose storage.protect_delete trigger
--          blocks direct SQL deletes, or where direct anon inserts into storage.objects cannot be
--          exercised from SQL; the affected checks are then covered statically by TEST 1.3d / 1.3e.
--
-- KEY PROPERTIES:
--   1. Requires ZERO production data and ZERO manual UUID editing.
--   2. Seeds temporary synthetic test users and synthetic test rows inside `BEGIN; ... ROLLBACK;`.
--   3. Executes automated PL/pgSQL assertions (`RAISE EXCEPTION` on any failure, `RAISE NOTICE 'PASS: ...'` on success).
--   4. Rolls back unconditionally at the end (`ROLLBACK;`) so the staging database remains completely clean.

BEGIN;

-------------------------------------------------------------------------------
-- 0. Seed Temporary Synthetic Users & Test Fixtures (Rolled Back at End)
-------------------------------------------------------------------------------
DO $$
DECLARE
  v_super_uid    uuid := '00000000-0000-4000-8000-000000000001';
  v_editor_uid   uuid := '00000000-0000-4000-8000-000000000002';
  v_disabled_uid uuid := '00000000-0000-4000-8000-000000000003';
  v_norole_uid   uuid := '00000000-0000-4000-8000-000000000004';
  v_sec_id       uuid := '00000000-0000-4000-8000-000000000010';
  v_sub_id       uuid := '00000000-0000-4000-8000-000000000011';
BEGIN
  -- Synthetic auth.users
  INSERT INTO auth.users (id, email, raw_app_meta_data, raw_user_meta_data, aud, role, created_at, updated_at)
  VALUES
    (v_super_uid,    'staging_super@orthocarehub.test',    '{"provider":"email"}'::jsonb, '{}'::jsonb, 'authenticated', 'authenticated', now(), now()),
    (v_editor_uid,   'staging_editor@orthocarehub.test',   '{"provider":"email"}'::jsonb, '{}'::jsonb, 'authenticated', 'authenticated', now(), now()),
    (v_disabled_uid, 'staging_disabled@orthocarehub.test', '{"provider":"email"}'::jsonb, '{}'::jsonb, 'authenticated', 'authenticated', now(), now()),
    (v_norole_uid,   'staging_norole@orthocarehub.test',   '{"provider":"email"}'::jsonb, '{}'::jsonb, 'authenticated', 'authenticated', now(), now())
  ON CONFLICT (id) DO NOTHING;

  -- Profiles
  INSERT INTO public.profiles (user_id, email, display_name, is_active)
  VALUES
    (v_super_uid,    'staging_super@orthocarehub.test',    'Staging Super Admin', true),
    (v_editor_uid,   'staging_editor@orthocarehub.test',   'Staging Doctor Editor', true),
    (v_disabled_uid, 'staging_disabled@orthocarehub.test', 'Disabled Super Admin', false),
    (v_norole_uid,   'staging_norole@orthocarehub.test',   'No Role User', true)
  ON CONFLICT (user_id) DO UPDATE SET is_active = EXCLUDED.is_active;

  -- Roles
  INSERT INTO public.user_roles (user_id, role)
  VALUES
    (v_super_uid,    'super_admin'),
    (v_editor_uid,   'editor'),
    (v_disabled_uid, 'super_admin')
  ON CONFLICT (user_id, role) DO NOTHING;

  -- Ensure a synthetic site_config row exists if staging DB is empty
  IF NOT EXISTS (SELECT 1 FROM public.site_config) THEN
    INSERT INTO public.site_config (config, workflow_status)
    VALUES ('{"clinicName":"OrthoCare Hub","phone":"+919441824999"}'::jsonb, 'published');
  END IF;

  -- Synthetic published cms_pages row + unpublished draft-only cms_pages row
  INSERT INTO public.cms_pages (slug, title, workflow_status, published_sections, draft_sections, published_at)
  VALUES
    ('__test_home__', 'Test Home', 'published', '[{"id":"hero"}]'::jsonb, '[{"id":"hero_draft"}]'::jsonb, now()),
    ('__test_unpub__', 'Test Unpublished Draft', 'draft', '[]'::jsonb, '[{"id":"secret_draft"}]'::jsonb, NULL)
  ON CONFLICT (slug) DO NOTHING;

  -- Synthetic medical_section and medical_subsection
  INSERT INTO public.medical_sections (id, name, slug, display_name, sort_order, is_active)
  VALUES (v_sec_id, 'test-sec', '__test_sec__', 'Test Section', 999, true)
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.medical_subsections (id, section_id, name, slug, description, content, sort_order, is_active, level, workflow_status)
  VALUES (v_sub_id, v_sec_id, 'Test Treatment', '__test_sub__', 'Live desc', '<p>Live HTML</p>', 1, true, 1, 'published')
  ON CONFLICT (id) DO NOTHING;

  -- Synthetic cms_seo_metadata row
  INSERT INTO public.cms_seo_metadata (route_path, page_label, workflow_status, seo_title, draft_seo_title, published_at)
  VALUES ('/__test_route__', 'Test Route', 'published', 'Live SEO Title', 'Secret Draft SEO Title', now())
  ON CONFLICT (route_path) DO NOTHING;

  -- Synthetic service, appointment, second_opinion, and private patient report object
  INSERT INTO public.services (name, slug, short_description, category)
  VALUES ('Test Service', '__test_service__', 'Desc', 'Ortho')
  ON CONFLICT (slug) DO NOTHING;

  INSERT INTO public.appointments (first_name, last_name, phone, appointment_type, preferred_date, preferred_time, symptoms)
  VALUES ('Synthetic', 'Patient', '+910000000000', 'in-clinic', CURRENT_DATE, '10:00 AM', 'Test knee pain');

  -- Object paths use the exact shapes the app writes:
  --   SecondOpinion.tsx  -> `${Date.now()}-${Math.random().toString(36).slice(2, 8)}/${file.name}` (13 digits, <= 6 base36 chars)
  --   repository.ts      -> `${category}/${Date.now()}-${safeName}` (cms-media)
  INSERT INTO public.second_opinions (name, age, phone, condition, current_diagnosis, file_names)
  VALUES ('Synthetic Patient', 45, '+910000000000', 'Knee Pain', 'OA', ARRAY['1713139200000-a1b2c3/mri.pdf']);

  -- The deprecated storage.objects.owner column is not set (newer storage versions use owner_id).
  BEGIN
    INSERT INTO storage.objects (bucket_id, name, metadata)
    VALUES
      ('second-opinion-reports', '1713139200000-a1b2c3/mri.pdf', '{"mimetype":"application/pdf","size":1024}'::jsonb),
      ('cms-media', 'general/1713139200000-__test_banner__.jpg', '{"mimetype":"image/jpeg","size":10240}'::jsonb);
  EXCEPTION WHEN OTHERS THEN
    RAISE EXCEPTION 'SEED: could not insert synthetic storage.objects rows as role %: % (SQLSTATE %)',
      current_user, SQLERRM, SQLSTATE;
  END;
END $$;

-------------------------------------------------------------------------------
-- TEST 1: Static Schema, Roles, Storage Policy Replacement & Table Grants Audit
-------------------------------------------------------------------------------
DO $$
DECLARE
  v_count int;
BEGIN
  -- 1.1 Verify app_role enum includes 'super_admin' and 'editor'
  SELECT count(*) INTO v_count
  FROM pg_enum e JOIN pg_type t ON t.oid = e.enumtypid
  WHERE t.typname = 'app_role' AND e.enumlabel IN ('super_admin', 'editor');
  IF v_count < 2 THEN
    RAISE EXCEPTION 'FAIL [TEST 1.1]: app_role enum is missing super_admin or editor';
  END IF;

  -- 1.2 Verify ZERO DELETE policies exist for is_editor()
  SELECT count(*) INTO v_count
  FROM pg_policies
  WHERE cmd = 'DELETE'
    AND (qual ILIKE '%is_editor%' OR with_check ILIKE '%is_editor%');
  IF v_count <> 0 THEN
    RAISE EXCEPTION 'FAIL [TEST 1.2]: Found % DELETE policies referencing is_editor()', v_count;
  END IF;

  -- 1.3a Verify old permissive second-opinion-reports policies are dropped (F3)
  SELECT count(*) INTO v_count
  FROM pg_policies
  WHERE schemaname = 'storage' AND tablename = 'objects'
    AND policyname IN (
      'Authenticated users can view second opinion reports',
      'Admins can view second opinion reports',
      'Anyone can upload second opinion reports'
    );
  IF v_count <> 0 THEN
    RAISE EXCEPTION 'FAIL [TEST 1.3a]: Legacy permissive second-opinion-reports policies still exist!';
  END IF;

  -- 1.3b Verify 005b replacement policies exist (F3, F4)
  SELECT count(*) INTO v_count
  FROM pg_policies
  WHERE schemaname = 'storage' AND tablename = 'objects'
    AND policyname IN (
      'Super admins view second opinion reports',
      'Public uploads second opinion reports',
      'CMS users can upload cms-media',
      'Super admins can update cms-media',
      'Super admins can delete cms-media',
      'Anyone can view cms-media'
    );
  IF v_count <> 6 THEN
    RAISE EXCEPTION 'FAIL [TEST 1.3b]: Expected the 6 storage policies created by 004/005b, found %', v_count;
  END IF;

  -- 1.3b2 Policies replaced by 005b must be gone (004's editor/legacy-admin update policy)
  SELECT count(*) INTO v_count
  FROM pg_policies
  WHERE schemaname = 'storage' AND tablename = 'objects'
    AND policyname = 'CMS users can update cms-media';
  IF v_count <> 0 THEN
    RAISE EXCEPTION 'FAIL [TEST 1.3b2]: 004 policy "CMS users can update cms-media" was not replaced by 005b';
  END IF;

  -- 1.3b3 The ONLY read policy on patient reports is the Super Admin one, for authenticated only
  SELECT count(*) INTO v_count
  FROM pg_policies
  WHERE schemaname = 'storage' AND tablename = 'objects'
    AND cmd IN ('SELECT', 'ALL')
    AND (COALESCE(qual, '') ILIKE '%second-opinion-reports%' OR COALESCE(qual, '') NOT ILIKE '%bucket_id%')
    AND NOT (policyname = 'Super admins view second opinion reports'
             AND roles = '{authenticated}'::name[]
             AND qual ILIKE '%is_super_admin()%');
  IF v_count <> 0 THEN
    RAISE EXCEPTION 'FAIL [TEST 1.3b3]: % extra storage read policies can reach second-opinion-reports', v_count;
  END IF;

  -- 1.3d Static: anonymous report uploads are restricted to the SecondOpinion.tsx path shape, and
  --      no other INSERT policy reaches the patient-report bucket (backs up TEST 8B.4).
  SELECT count(*) INTO v_count
  FROM pg_policies
  WHERE schemaname = 'storage' AND tablename = 'objects'
    AND policyname = 'Public uploads second opinion reports'
    AND cmd = 'INSERT'
    AND roles = '{anon,authenticated}'::name[]
    AND with_check LIKE '%second-opinion-reports%'
    AND with_check LIKE '%^[0-9]{13}-[a-z0-9]{1,8}/[^/]{1,200}$%';
  IF v_count <> 1 THEN
    RAISE EXCEPTION 'FAIL [TEST 1.3d]: path-restricted report upload policy is missing or changed';
  END IF;
  SELECT count(*) INTO v_count
  FROM pg_policies
  WHERE schemaname = 'storage' AND tablename = 'objects'
    AND cmd IN ('INSERT', 'ALL')
    AND (COALESCE(with_check, qual, '') ILIKE '%second-opinion-reports%'
         OR COALESCE(with_check, qual, '') NOT ILIKE '%bucket_id%')
    AND policyname <> 'Public uploads second opinion reports';
  IF v_count <> 0 THEN
    RAISE EXCEPTION 'FAIL [TEST 1.3d]: % other INSERT policies can reach second-opinion-reports', v_count;
  END IF;

  -- 1.3e Static: every DELETE-capable storage policy that can reach cms-media or
  --      second-opinion-reports (or has no bucket filter) requires is_super_admin() and never
  --      mentions is_editor(). Needed because storage.protect_delete can make the live DELETE
  --      tests (4.3c / 6B.5) inconclusive.
  SELECT count(*) INTO v_count
  FROM pg_policies
  WHERE schemaname = 'storage' AND tablename = 'objects'
    AND cmd IN ('DELETE', 'ALL')
    AND (COALESCE(qual, '') ILIKE '%cms-media%'
         OR COALESCE(qual, '') ILIKE '%second-opinion-reports%'
         OR COALESCE(qual, '') NOT ILIKE '%bucket_id%')
    AND (COALESCE(qual, '') NOT ILIKE '%is_super_admin()%' OR COALESCE(qual, '') ILIKE '%is_editor%');
  IF v_count <> 0 THEN
    RAISE EXCEPTION 'FAIL [TEST 1.3e]: % storage DELETE policies are not Super-Admin-only', v_count;
  END IF;

  -- 1.3c No legacy has_role(...,'admin') policy may remain anywhere (005b F2)
  SELECT count(*) INTO v_count
  FROM pg_policies
  WHERE schemaname IN ('public', 'storage')
    AND (qual ILIKE '%''admin''%' OR with_check ILIKE '%''admin''%');
  IF v_count <> 0 THEN
    RAISE EXCEPTION 'FAIL [TEST 1.3c]: % legacy admin policies still exist', v_count;
  END IF;

  -- 1.4 Verify user_roles, activity_logs, approval_history, content_versions have no write grants for anon/authenticated
  SELECT count(*) INTO v_count
  FROM information_schema.role_table_grants
  WHERE table_schema = 'public'
    AND table_name IN ('user_roles', 'activity_logs', 'approval_history', 'content_versions')
    AND grantee IN ('anon', 'authenticated')
    AND privilege_type IN ('INSERT', 'UPDATE', 'DELETE');
  IF v_count <> 0 THEN
    RAISE EXCEPTION 'FAIL [TEST 1.4]: Found % unexpected write grants on protected audit/role tables', v_count;
  END IF;

  -- 1.5 Verify anon has NO SELECT column grant on draft_* columns
  SELECT count(*) INTO v_count
  FROM information_schema.column_privileges
  WHERE table_schema = 'public'
    AND grantee = 'anon'
    AND privilege_type = 'SELECT'
    AND column_name IN ('draft_config', 'draft_sections', 'draft_content', 'draft_seo_title', 'review_feedback');
  IF v_count <> 0 THEN
    RAISE EXCEPTION 'FAIL [TEST 1.5]: anon still has SELECT privilege on % draft/review columns', v_count;
  END IF;

  RAISE NOTICE 'PASS [TEST 1]: Schema, enum values, storage policy replacement, and column/table grants verified.';
END $$;

-------------------------------------------------------------------------------
-- TEST 2 (PUB-001): Anonymous / Public Visitor Isolation from Drafts
-------------------------------------------------------------------------------
RESET role;
SET LOCAL role = 'anon';
SET LOCAL request.jwt.claims = '{"role":"anon"}';
SET LOCAL "request.jwt.claim.role" = 'anon';
SET LOCAL "request.jwt.claim.sub" = '';

DO $$
DECLARE
  v_count int;
  v_blocked boolean := false;
BEGIN
  -- 2.1 Anon can read published columns on published rows
  SELECT count(*) INTO v_count FROM public.cms_pages WHERE slug = '__test_home__';
  IF v_count <> 1 THEN
    RAISE EXCEPTION 'FAIL [TEST 2.1]: anon could not read published cms_pages row';
  END IF;

  -- 2.2 Anon CANNOT see unpublished draft-only page rows (published_at IS NULL)
  SELECT count(*) INTO v_count FROM public.cms_pages WHERE slug = '__test_unpub__';
  IF v_count <> 0 THEN
    RAISE EXCEPTION 'FAIL [TEST 2.2]: anon was able to see unpublished draft-only cms_pages row';
  END IF;

  -- 2.3 Anon attempting to SELECT draft_sections on cms_pages MUST fail with insufficient_privilege (42501)
  BEGIN
    EXECUTE 'SELECT draft_sections FROM public.cms_pages WHERE slug = ''__test_home__''';
  EXCEPTION WHEN insufficient_privilege THEN
    v_blocked := true;
  END;
  IF NOT v_blocked THEN
    RAISE EXCEPTION 'FAIL [TEST 2.3]: anon was able to SELECT draft_sections from cms_pages!';
  END IF;

  -- 2.4 Anon attempting to SELECT draft_config on site_config MUST fail with insufficient_privilege (42501)
  v_blocked := false;
  BEGIN
    EXECUTE 'SELECT draft_config FROM public.site_config LIMIT 1';
  EXCEPTION WHEN insufficient_privilege THEN
    v_blocked := true;
  END;
  IF NOT v_blocked THEN
    RAISE EXCEPTION 'FAIL [TEST 2.4]: anon was able to SELECT draft_config from site_config!';
  END IF;

  RAISE NOTICE 'PASS [TEST 2 / PUB-001]: Anonymous visitors can read published content and are blocked from all draft columns/rows.';
END $$;

-------------------------------------------------------------------------------
-- TEST 3 (AUTH-003): Authenticated User With No CMS Role
-------------------------------------------------------------------------------
RESET role;
SET LOCAL role = 'authenticated';
SET LOCAL request.jwt.claims = '{"sub":"00000000-0000-4000-8000-000000000004","role":"authenticated","email":"staging_norole@orthocarehub.test"}';
SET LOCAL "request.jwt.claim.sub" = '00000000-0000-4000-8000-000000000004';
SET LOCAL "request.jwt.claim.role" = 'authenticated';

DO $$
DECLARE
  v_role text;
  v_count int;
BEGIN
  v_role := public.current_cms_role();
  IF v_role IS NOT NULL THEN
    RAISE EXCEPTION 'FAIL [TEST 3.1]: Expected NULL role for unprivileged user, got %', v_role;
  END IF;

  SELECT count(*) INTO v_count FROM public.cms_pages;
  IF v_count <> 0 THEN
    RAISE EXCEPTION 'FAIL [TEST 3.2]: Unprivileged authenticated user could read % rows from cms_pages', v_count;
  END IF;

  SELECT count(*) INTO v_count FROM public.appointments;
  IF v_count <> 0 THEN
    RAISE EXCEPTION 'FAIL [TEST 3.3]: Unprivileged authenticated user could read appointments';
  END IF;

  SELECT count(*) INTO v_count FROM storage.objects WHERE bucket_id = 'second-opinion-reports';
  IF v_count <> 0 THEN
    RAISE EXCEPTION 'FAIL [TEST 3.4]: Unprivileged authenticated user could read second-opinion-reports';
  END IF;

  RAISE NOTICE 'PASS [TEST 3 / AUTH-003]: Authenticated user with no CMS role has zero access to drafts or clinical data.';
END $$;

-------------------------------------------------------------------------------
-- TEST 4 (ROLE-002..004, MEDIA-001..003, SEC-001): Content Editor Boundaries
-------------------------------------------------------------------------------
RESET role;
SET LOCAL role = 'authenticated';
SET LOCAL request.jwt.claims = '{"sub":"00000000-0000-4000-8000-000000000002","role":"authenticated","email":"staging_editor@orthocarehub.test"}';
SET LOCAL "request.jwt.claim.sub" = '00000000-0000-4000-8000-000000000002';
SET LOCAL "request.jwt.claim.role" = 'authenticated';

DO $$
DECLARE
  v_role text;
  v_can_pub boolean;
  v_count int;
  v_blocked boolean := false;
BEGIN
  v_role := public.current_cms_role();
  v_can_pub := public.can_publish_content();
  IF v_role <> 'editor' OR v_can_pub <> false THEN
    RAISE EXCEPTION 'FAIL [TEST 4.1]: Expected editor / can_publish=false, got % / %', v_role, v_can_pub;
  END IF;

  -- 4.2 Zero access to patient appointments, second opinions, private reports, or activity_logs
  SELECT count(*) INTO v_count FROM public.appointments;
  IF v_count <> 0 THEN RAISE EXCEPTION 'FAIL [TEST 4.2a]: Editor read appointments'; END IF;

  SELECT count(*) INTO v_count FROM public.second_opinions;
  IF v_count <> 0 THEN RAISE EXCEPTION 'FAIL [TEST 4.2b]: Editor read second_opinions'; END IF;

  SELECT count(*) INTO v_count FROM storage.objects WHERE bucket_id = 'second-opinion-reports';
  IF v_count <> 0 THEN RAISE EXCEPTION 'FAIL [TEST 4.2c]: Editor read second-opinion-reports storage objects'; END IF;

  SELECT count(*) INTO v_count FROM public.activity_logs;
  IF v_count <> 0 THEN RAISE EXCEPTION 'FAIL [TEST 4.2d]: Editor read activity_logs'; END IF;

  -- 4.3 Editor cannot DELETE content rows or cms-media storage objects
  -- 005d revokes browser DELETE on services, so this is a privilege error (or 0 rows before 005d).
  BEGIN
    DELETE FROM public.services WHERE slug = '__test_service__';
    GET DIAGNOSTICS v_count = ROW_COUNT;
  EXCEPTION WHEN insufficient_privilege THEN
    v_count := 0;
  END;
  IF v_count <> 0 THEN RAISE EXCEPTION 'FAIL [TEST 4.3a]: Editor deleted a service row!'; END IF;

  DELETE FROM public.cms_pages WHERE slug = '__test_home__';
  GET DIAGNOSTICS v_count = ROW_COUNT;
  IF v_count <> 0 THEN RAISE EXCEPTION 'FAIL [TEST 4.3b]: Editor deleted a cms_pages row!'; END IF;

  -- 4.3c Storage DELETE is decided by RLS, not by the storage deletion-protection trigger.
  --      Newer Supabase storage versions add storage.protect_delete(), which rejects every direct
  --      SQL DELETE on storage.objects (for every role) unless storage.allow_delete_query = 'true'.
  --      Catching "any exception" would therefore pass even if an editor DELETE policy existed.
  --      So: (1) opt in to direct deletes for this transaction only (SET LOCAL semantics, rolled
  --      back), (2) treat 0 deleted rows as RLS blocking, (3) if the protect trigger still fires,
  --      rely on the static DELETE-policy check in TEST 1.3e, (4) any other error FAILS.
  --      The DELETE runs in a subtransaction that is always undone, so later tests keep the row.
  PERFORM set_config('storage.allow_delete_query', 'true', true);
  v_count := 0;
  v_blocked := false;  -- reused as "protect trigger fired"
  BEGIN
    DELETE FROM storage.objects WHERE bucket_id = 'cms-media' AND name = 'general/1713139200000-__test_banner__.jpg';
    GET DIAGNOSTICS v_count = ROW_COUNT;
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = '__harness_undo__';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM = '__harness_undo__' THEN
      NULL;  -- delete attempt undone; v_count holds the number of rows RLS allowed
    ELSIF SQLERRM ILIKE '%direct deletion%' OR SQLERRM ILIKE '%storage api%' THEN
      v_blocked := true;
    ELSE
      RAISE EXCEPTION 'FAIL [TEST 4.3c]: unexpected error on editor storage delete: % (SQLSTATE %)', SQLERRM, SQLSTATE;
    END IF;
  END;
  PERFORM set_config('storage.allow_delete_query', 'false', true);
  IF v_count <> 0 THEN RAISE EXCEPTION 'FAIL [TEST 4.3c]: RLS let the Editor delete % cms-media storage object(s)!', v_count; END IF;

  IF v_blocked THEN
    RAISE NOTICE 'INFO [TEST 4.3c]: storage.protect_delete blocks direct SQL deletes on this project; storage DELETE policies already verified statically in TEST 1.3e.';
  END IF;

  -- 4.4 Editor cannot update app_settings or escalate privileges in user_roles
  UPDATE public.app_settings SET value = 'true'::jsonb WHERE key = 'editors_can_publish';
  GET DIAGNOSTICS v_count = ROW_COUNT;
  IF v_count <> 0 THEN RAISE EXCEPTION 'FAIL [TEST 4.4a]: Editor updated app_settings!'; END IF;

  BEGIN
    INSERT INTO public.user_roles (user_id, role) VALUES ('00000000-0000-4000-8000-000000000002', 'super_admin');
  EXCEPTION WHEN insufficient_privilege THEN
    v_blocked := true;
  END;
  IF NOT v_blocked THEN
    RAISE EXCEPTION 'FAIL [TEST 4.4b]: Editor inserted into user_roles!';
  END IF;

  -- 4.5 Reconciled Media Limits (5 MB image / 50 MB video) enforced by chk_media_assets_size_limit
  v_blocked := false;
  BEGIN
    INSERT INTO public.media_assets (file_name, storage_path, public_url, media_type, mime_type, size_bytes, alt_text)
    VALUES ('oversized.jpg', 'general/__oversized__.jpg', '/oversized.jpg', 'image', 'image/jpeg', 6000000, '6 MB image > 5 MB limit');
  EXCEPTION WHEN check_violation THEN
    v_blocked := true;
  END;
  IF NOT v_blocked THEN
    RAISE EXCEPTION 'FAIL [TEST 4.5]: media_assets allowed an image > 5 MB!';
  END IF;

  RAISE NOTICE 'PASS [TEST 4 / ROLE-002..004 & MEDIA]: Editor permissions, delete blocks, privacy isolation, and 5 MB/50 MB limits verified.';
END $$;

-------------------------------------------------------------------------------
-- TEST 5 (PAGE-002 & PUB-001): Trigger Guards Blocking Direct Live Edits by Editor
-------------------------------------------------------------------------------
DO $$
DECLARE
  v_blocked boolean;
BEGIN
  -- 5.1 Editor attempting to directly modify site_config.config
  v_blocked := false;
  BEGIN
    UPDATE public.site_config SET config = jsonb_set(config, '{phone}', '"+910000000000"');
  EXCEPTION WHEN raise_exception OR insufficient_privilege THEN
    v_blocked := true;  -- trigger (004/005b) or, after 005c, no browser UPDATE grant at all
  END;
  IF NOT v_blocked THEN
    RAISE EXCEPTION 'FAIL [TEST 5.1]: Trigger did not block Editor from modifying live site_config.config!';
  END IF;

  -- 5.2 Editor attempting to directly modify cms_pages.published_sections
  v_blocked := false;
  BEGIN
    UPDATE public.cms_pages SET published_sections = '[{"id":"hacked"}]'::jsonb WHERE slug = '__test_home__';
  EXCEPTION WHEN raise_exception THEN
    v_blocked := true;
  END;
  IF NOT v_blocked THEN
    RAISE EXCEPTION 'FAIL [TEST 5.2]: Trigger did not block Editor from modifying live cms_pages.published_sections!';
  END IF;

  -- 5.3 Editor attempting to directly modify medical_subsections.content
  v_blocked := false;
  BEGIN
    UPDATE public.medical_subsections SET content = '<p>Hacked live HTML</p>' WHERE slug = '__test_sub__';
  EXCEPTION WHEN raise_exception THEN
    v_blocked := true;
  END;
  IF NOT v_blocked THEN
    RAISE EXCEPTION 'FAIL [TEST 5.3]: Trigger did not block Editor from modifying live medical_subsections.content!';
  END IF;

  -- 5.4 Editor attempting to directly modify cms_seo_metadata.seo_title
  v_blocked := false;
  BEGIN
    UPDATE public.cms_seo_metadata SET seo_title = 'Hacked Live SEO' WHERE route_path = '/__test_route__';
  EXCEPTION WHEN raise_exception THEN
    v_blocked := true;
  END;
  IF NOT v_blocked THEN
    RAISE EXCEPTION 'FAIL [TEST 5.4]: Trigger did not block Editor from modifying live cms_seo_metadata.seo_title!';
  END IF;

  -- 5.5 Editor attempting to set workflow_status = 'published'
  v_blocked := false;
  BEGIN
    UPDATE public.cms_pages SET workflow_status = 'published' WHERE slug = '__test_home__';
  EXCEPTION WHEN raise_exception THEN
    v_blocked := true;
  END;
  IF NOT v_blocked THEN
    RAISE EXCEPTION 'FAIL [TEST 5.5]: Trigger did not block Editor from setting workflow_status = published!';
  END IF;

  -- 5.6 Editor attempting to forge approval/publish in approval_history via record_workflow_transition
  v_blocked := false;
  BEGIN
    PERFORM public.record_workflow_transition('cms_page', '__test_home__', 'pending_approval', 'approved', 'Self-approved');
  EXCEPTION WHEN raise_exception THEN
    v_blocked := true;
  END;
  IF NOT v_blocked THEN
    RAISE EXCEPTION 'FAIL [TEST 5.6]: record_workflow_transition allowed Editor to record approved transition!';
  END IF;

  RAISE NOTICE 'PASS [TEST 5 / Trigger Guards]: All 4 workflow triggers and transition RPC blocked direct live mutation/approval by Editor.';
END $$;

-------------------------------------------------------------------------------
-- TEST 6 (PAGE-002 & AUDIT-001): Rajiv's 5-State Approval Workflow End-to-End
-------------------------------------------------------------------------------
-- Step 6A: Editor saves draft and submits for review
DO $$
DECLARE
  v_sub_by uuid;
BEGIN
  UPDATE public.cms_pages
  SET draft_sections = '[{"id":"hero","heading":"Updated by Doctor"}]'::jsonb,
      workflow_status = 'pending_approval'
  WHERE slug = '__test_home__';

  SELECT submitted_by INTO v_sub_by FROM public.cms_pages WHERE slug = '__test_home__';
  IF v_sub_by <> '00000000-0000-4000-8000-000000000002'::uuid THEN
    RAISE EXCEPTION 'FAIL [TEST 6A]: Trigger did not record submitted_by for Editor submission';
  END IF;

  PERFORM public.record_workflow_transition('cms_page', '__test_home__', 'draft', 'pending_approval', NULL);
END $$;

-- Step 6B: Switch to Super Admin -> test mandatory rejection feedback, then approve & publish
RESET role;
SET LOCAL role = 'authenticated';
SET LOCAL request.jwt.claims = '{"sub":"00000000-0000-4000-8000-000000000001","role":"authenticated","email":"staging_super@orthocarehub.test"}';
SET LOCAL "request.jwt.claim.sub" = '00000000-0000-4000-8000-000000000001';
SET LOCAL "request.jwt.claim.role" = 'authenticated';

DO $$
DECLARE
  v_blocked boolean := false;
  v_hist_count int;
  v_log_count int;
  v_report_count int;
BEGIN
  -- Rejecting without feedback must raise exception
  BEGIN
    PERFORM public.record_workflow_transition('cms_page', '__test_home__', 'pending_approval', 'rejected', '   ');
  EXCEPTION WHEN raise_exception THEN
    v_blocked := true;
  END;
  IF NOT v_blocked THEN
    RAISE EXCEPTION 'FAIL [TEST 6B.1]: record_workflow_transition allowed rejection without feedback!';
  END IF;

  -- Reject with valid feedback
  UPDATE public.cms_pages
  SET workflow_status = 'rejected',
      review_feedback = 'Please double-check the Ashok Nagar phone number.'
  WHERE slug = '__test_home__';
  PERFORM public.record_workflow_transition('cms_page', '__test_home__', 'pending_approval', 'rejected', 'Please double-check the Ashok Nagar phone number.');

  -- Approve and Publish
  UPDATE public.cms_pages
  SET workflow_status = 'published',
      published_sections = draft_sections,
      published_at = now()
  WHERE slug = '__test_home__';
  PERFORM public.record_workflow_transition('cms_page', '__test_home__', 'rejected', 'published', 'Verified and published');

  SELECT count(*) INTO v_hist_count FROM public.approval_history WHERE entity_id = '__test_home__';
  IF v_hist_count < 3 THEN
    RAISE EXCEPTION 'FAIL [TEST 6B.2]: Expected >= 3 approval_history rows, found %', v_hist_count;
  END IF;

  SELECT count(*) INTO v_log_count FROM public.activity_logs WHERE entity_id = '__test_home__';
  IF v_log_count < 3 THEN
    RAISE EXCEPTION 'FAIL [TEST 6B.3]: Expected >= 3 activity_logs rows, found %', v_log_count;
  END IF;

  -- Super Admin CAN view private second-opinion patient reports (legitimate clinical workflow)
  SELECT count(*) INTO v_report_count
  FROM storage.objects
  WHERE bucket_id = 'second-opinion-reports' AND name = '1713139200000-a1b2c3/mri.pdf';
  IF v_report_count <> 1 THEN
    RAISE EXCEPTION 'FAIL [TEST 6B.4]: Active Super Admin could not view second-opinion-reports!';
  END IF;

  -- 6B.5 Positive control for TEST 4.3c: RLS lets an active Super Admin delete a cms-media object
  --      (Storage API remove() path). Undone immediately; skipped if storage.protect_delete blocks
  --      direct SQL deletes on this project.
  PERFORM set_config('storage.allow_delete_query', 'true', true);
  v_report_count := 0;
  BEGIN
    DELETE FROM storage.objects WHERE bucket_id = 'cms-media' AND name = 'general/1713139200000-__test_banner__.jpg';
    GET DIAGNOSTICS v_report_count = ROW_COUNT;
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = '__harness_undo__';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM = '__harness_undo__' THEN
      IF v_report_count <> 1 THEN
        RAISE EXCEPTION 'FAIL [TEST 6B.5]: Active Super Admin could not delete a cms-media object (deleted %)', v_report_count;
      END IF;
    ELSIF SQLERRM ILIKE '%direct deletion%' OR SQLERRM ILIKE '%storage api%' THEN
      RAISE NOTICE 'INFO [TEST 6B.5]: storage.protect_delete blocks direct SQL deletes; Super Admin delete covered by the static check in TEST 1.3e.';
    ELSE
      RAISE EXCEPTION 'FAIL [TEST 6B.5]: unexpected error on Super Admin storage delete: % (SQLSTATE %)', SQLERRM, SQLSTATE;
    END IF;
  END;
  PERFORM set_config('storage.allow_delete_query', 'false', true);

  RAISE NOTICE 'PASS [TEST 6 / Approval Workflow & Clinical Access]: 5-state workflow, history, activity_logs, and Super Admin report access verified.';
END $$;

-------------------------------------------------------------------------------
-- TEST 7 (AUTH-004): Deactivated Super Admin Account Immediate Lockout
-------------------------------------------------------------------------------
RESET role;
SET LOCAL role = 'authenticated';
SET LOCAL request.jwt.claims = '{"sub":"00000000-0000-4000-8000-000000000003","role":"authenticated","email":"staging_disabled@orthocarehub.test"}';
SET LOCAL "request.jwt.claim.sub" = '00000000-0000-4000-8000-000000000003';
SET LOCAL "request.jwt.claim.role" = 'authenticated';

DO $$
DECLARE
  v_count int;
BEGIN
  IF public.is_account_active(auth.uid()) <> false THEN
    RAISE EXCEPTION 'FAIL [TEST 7.1]: is_account_active returned true for deactivated account';
  END IF;
  IF public.is_super_admin() <> false OR public.current_cms_role() IS NOT NULL THEN
    RAISE EXCEPTION 'FAIL [TEST 7.2]: Deactivated Super Admin retained role privileges';
  END IF;

  SELECT count(*) INTO v_count FROM public.appointments;
  IF v_count <> 0 THEN
    RAISE EXCEPTION 'FAIL [TEST 7.3]: Deactivated Super Admin could read appointments';
  END IF;

  SELECT count(*) INTO v_count FROM storage.objects WHERE bucket_id = 'second-opinion-reports';
  IF v_count <> 0 THEN
    RAISE EXCEPTION 'FAIL [TEST 7.4]: Deactivated Super Admin could read second-opinion-reports';
  END IF;

  RAISE NOTICE 'PASS [TEST 7 / AUTH-004]: Deactivated account is immediately locked out of all RLS policies and storage buckets.';
END $$;

-------------------------------------------------------------------------------
-- TEST 8 (005b F1–F7): Hardening regressions
-------------------------------------------------------------------------------
-- 8A. Editor
RESET role;
SET LOCAL role = 'authenticated';
SET LOCAL request.jwt.claims = '{"sub":"00000000-0000-4000-8000-000000000002","role":"authenticated","email":"staging_editor@orthocarehub.test"}';
SET LOCAL "request.jwt.claim.sub" = '00000000-0000-4000-8000-000000000002';
SET LOCAL "request.jwt.claim.role" = 'authenticated';

DO $$
DECLARE
  v_count    int;
  v_blocked  boolean;
  v_title    text;
  v_feedback text;
  v_status   text;
BEGIN
  -- 8A.1 (F5) No editor writes on tables without a draft workflow
  BEGIN
    UPDATE public.services SET name = 'Editor edit' WHERE slug = '__test_service__';
    GET DIAGNOSTICS v_count = ROW_COUNT;
  EXCEPTION WHEN insufficient_privilege THEN
    v_count := 0;  -- expected after 005d (no browser UPDATE grant)
  END;
  IF v_count <> 0 THEN RAISE EXCEPTION 'FAIL [TEST 8A.1a]: Editor updated a live services row'; END IF;

  v_blocked := false;
  BEGIN
    INSERT INTO public.blog_posts (title, slug, content) VALUES ('Editor post', '__test_editor_post__', 'x');
  EXCEPTION WHEN insufficient_privilege THEN
    v_blocked := true;
  END;
  IF NOT v_blocked THEN RAISE EXCEPTION 'FAIL [TEST 8A.1b]: Editor inserted a live blog post'; END IF;

  -- 8A.2 (F4/F4b) Editor cannot repoint an asset row or overwrite a cms-media object
  v_blocked := false;
  BEGIN
    UPDATE public.media_assets SET public_url = 'https://example.invalid/x.jpg';
  EXCEPTION WHEN insufficient_privilege THEN
    v_blocked := true;
  END;
  IF NOT v_blocked THEN RAISE EXCEPTION 'FAIL [TEST 8A.2a]: Editor could update media_assets.public_url'; END IF;

  UPDATE storage.objects SET metadata = '{"mimetype":"image/jpeg","size":1}'::jsonb
   WHERE bucket_id = 'cms-media' AND name = 'general/1713139200000-__test_banner__.jpg';
  GET DIAGNOSTICS v_count = ROW_COUNT;
  IF v_count <> 0 THEN RAISE EXCEPTION 'FAIL [TEST 8A.2b]: Editor overwrote a cms-media object'; END IF;

  -- 8A.3 (F1) Resubmission after review: the client re-sends title and review_feedback = NULL.
  --      Must succeed, keep the live title and keep the reviewer's feedback.
  UPDATE public.cms_pages
     SET draft_sections  = '[{"id":"hero","heading":"Resubmitted"}]'::jsonb,
         workflow_status = 'pending_approval',
         title           = 'Editor renamed title',
         review_feedback = NULL
   WHERE slug = '__test_home__';
  SELECT title, review_feedback, workflow_status INTO v_title, v_feedback, v_status
    FROM public.cms_pages WHERE slug = '__test_home__';
  IF v_title IS DISTINCT FROM 'Test Home' OR v_status IS DISTINCT FROM 'pending_approval' OR v_feedback IS NULL THEN
    RAISE EXCEPTION 'FAIL [TEST 8A.3]: Resubmission mishandled (title=%, status=%, feedback=%)', v_title, v_status, v_feedback;
  END IF;

  RAISE NOTICE 'PASS [TEST 8A]: Editor F1/F4/F5 boundaries hold.';
END $$;

-- 8B. Anonymous visitor
RESET role;
SET LOCAL role = 'anon';
SET LOCAL request.jwt.claims = '{"role":"anon"}';
SET LOCAL "request.jwt.claim.role" = 'anon';
SET LOCAL "request.jwt.claim.sub" = '';

DO $$
DECLARE
  v_count   int;
  v_blocked boolean;
BEGIN
  -- 8B.1 (F7b) Public forms still insert with exactly the columns the pages send
  INSERT INTO public.appointments (first_name, last_name, phone, email, appointment_type, service,
                                   preferred_date, preferred_time, symptoms, insurance_provider, emi_interest)
  VALUES ('Anon', 'Visitor', '+910000000001', NULL, 'in-clinic', NULL, CURRENT_DATE, '11:00 AM', 'Test', NULL, false);

  INSERT INTO public.contact_messages (name, email, phone, subject, message)
  VALUES ('Anon', 'anon@example.test', NULL, 'Test', 'Test message');

  INSERT INTO public.second_opinions (name, age, phone, email, condition, current_diagnosis, additional_notes, file_names)
  VALUES ('Anon', 40, '+910000000001', NULL, 'Knee', 'OA', NULL, ARRAY['1700000000000-k3x9qz/report.pdf']);

  -- 8B.2 (F7b) Public cannot choose workflow columns
  v_blocked := false;
  BEGIN
    INSERT INTO public.appointments (first_name, last_name, phone, appointment_type, preferred_date, preferred_time, symptoms, status)
    VALUES ('Anon', 'Visitor', '+910000000001', 'in-clinic', CURRENT_DATE, '11:00 AM', 'Test', 'confirmed');
  EXCEPTION WHEN insufficient_privilege THEN
    v_blocked := true;
  END;
  IF NOT v_blocked THEN RAISE EXCEPTION 'FAIL [TEST 8B.2]: anon could set appointments.status'; END IF;

  -- 8B.3 (F7b) Public holds no SELECT on patient inboxes
  v_blocked := false;
  BEGIN
    PERFORM 1 FROM public.appointments LIMIT 1;
  EXCEPTION WHEN insufficient_privilege THEN
    v_blocked := true;
  END;
  IF NOT v_blocked THEN RAISE EXCEPTION 'FAIL [TEST 8B.3]: anon still holds SELECT on appointments'; END IF;

  -- 8B.4 (F3) Report uploads: the real SecondOpinion.tsx path shape is accepted and any other
  --      shape is rejected BY RLS. Only an RLS violation counts as "blocked"; catching every error
  --      would pass on unrelated storage trigger/permission errors. If a storage trigger errors
  --      before RLS is reached, the policy definition is checked statically instead.
  -- 8B.4a positive control (undone immediately)
  v_blocked := false;  -- reused as "inconclusive"
  BEGIN
    INSERT INTO storage.objects (bucket_id, name) VALUES ('second-opinion-reports', '1700000000000-k3x9qz/report.pdf');
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = '__harness_undo__';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM = '__harness_undo__' THEN
      NULL;
    ELSIF SQLERRM ILIKE '%row-level security%' THEN
      RAISE EXCEPTION 'FAIL [TEST 8B.4a]: RLS rejected an upload with the real SecondOpinion.tsx path shape';
    ELSE
      v_blocked := true;
      RAISE NOTICE 'INFO [TEST 8B.4]: direct anon insert into storage.objects not testable here (% / SQLSTATE %); upload policy already verified statically in TEST 1.3d.', SQLERRM, SQLSTATE;
    END IF;
  END;

  -- 8B.4b negative: wrong shapes must be rejected by RLS
  IF NOT v_blocked THEN
    DECLARE
      v_bad text;
      v_rejected boolean;
    BEGIN
      FOREACH v_bad IN ARRAY ARRAY['not-a-timestamp/report.pdf', 'report.pdf', '1700000000000-k3x9qz/nested/report.pdf',
                                   '../1700000000000-k3x9qz/report.pdf'] LOOP
        v_rejected := false;
        BEGIN
          INSERT INTO storage.objects (bucket_id, name) VALUES ('second-opinion-reports', v_bad);
          RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = '__harness_undo__';
        EXCEPTION WHEN OTHERS THEN
          IF SQLERRM = '__harness_undo__' THEN
            v_rejected := false;
          ELSIF SQLERRM ILIKE '%row-level security%' THEN
            v_rejected := true;
          ELSE
            RAISE EXCEPTION 'FAIL [TEST 8B.4b]: unexpected error for path %: % (SQLSTATE %)', v_bad, SQLERRM, SQLSTATE;
          END IF;
        END;
        IF NOT v_rejected THEN RAISE EXCEPTION 'FAIL [TEST 8B.4b]: anon uploaded outside the allowed path shape (%)', v_bad; END IF;
      END LOOP;
    END;
  END IF;

  -- 8B.5 (F6) Public still reads active treatment pages and the published config
  SELECT count(*) INTO v_count FROM public.medical_subsections WHERE slug = '__test_sub__';
  IF v_count <> 1 THEN RAISE EXCEPTION 'FAIL [TEST 8B.5a]: anon cannot read an active treatment page'; END IF;

  SELECT count(*) INTO v_count FROM public.site_config;
  IF v_count < 1 THEN RAISE EXCEPTION 'FAIL [TEST 8B.5b]: anon cannot read site_config'; END IF;

  RAISE NOTICE 'PASS [TEST 8B]: Public forms, path restriction, inbox privacy and public reads verified.';
END $$;

-- 8C. Authenticated account with no CMS role
RESET role;
SET LOCAL role = 'authenticated';
SET LOCAL request.jwt.claims = '{"sub":"00000000-0000-4000-8000-000000000004","role":"authenticated","email":"staging_norole@orthocarehub.test"}';
SET LOCAL "request.jwt.claim.sub" = '00000000-0000-4000-8000-000000000004';
SET LOCAL "request.jwt.claim.role" = 'authenticated';

DO $$
DECLARE
  v_count int;
BEGIN
  -- 8C.1 (F6) No draft-bearing rows for non-CMS accounts
  SELECT count(*) INTO v_count FROM public.site_config;
  IF v_count <> 0 THEN RAISE EXCEPTION 'FAIL [TEST 8C.1]: non-CMS account can read site_config (drafts)'; END IF;

  SELECT count(*) INTO v_count FROM public.medical_subsections;
  IF v_count <> 0 THEN RAISE EXCEPTION 'FAIL [TEST 8C.2]: non-CMS account can read medical_subsections (drafts)'; END IF;

  RAISE NOTICE 'PASS [TEST 8C]: Non-CMS accounts cannot read draft-bearing tables.';
END $$;

-- 8D. Trusted session: legacy roles are rejected even outside RLS (F2)
RESET role;

DO $$
DECLARE
  v_blocked boolean := false;
BEGIN
  BEGIN
    INSERT INTO public.user_roles (user_id, role) VALUES ('00000000-0000-4000-8000-000000000004', 'admin');
  EXCEPTION WHEN check_violation THEN
    v_blocked := true;
  END;
  IF NOT v_blocked THEN RAISE EXCEPTION 'FAIL [TEST 8D.1]: legacy admin role could be stored in user_roles'; END IF;

  RAISE NOTICE 'PASS [TEST 8 / 005b]: All hardening regressions verified.';
END $$;

-------------------------------------------------------------------------------
-- TEST 9 (005c): Clinic Information draft → review → publish
-------------------------------------------------------------------------------
-- 9A. Editor submits a draft that also tries to smuggle a non-clinic key and an unsafe link
RESET role;
SET LOCAL role = 'authenticated';
SET LOCAL request.jwt.claims = '{"sub":"00000000-0000-4000-8000-000000000002","role":"authenticated","email":"staging_editor@orthocarehub.test"}';
SET LOCAL "request.jwt.claim.sub" = '00000000-0000-4000-8000-000000000002';
SET LOCAL "request.jwt.claim.role" = 'authenticated';

DO $$
DECLARE
  v_blocked boolean;
  v_sub_by  uuid;
  v_count   int;
BEGIN
  UPDATE public.site_config_drafts
     SET draft = draft || '{"phone":"+910000000009","doctorName":"Smuggled","facebook":"javascript:alert(1)"}'::jsonb,
         workflow_status = 'pending_approval'
   WHERE scope = 'clinic';
  GET DIAGNOSTICS v_count = ROW_COUNT;
  IF v_count <> 1 THEN RAISE EXCEPTION 'FAIL [TEST 9A.1]: Editor could not submit the clinic draft'; END IF;

  SELECT submitted_by INTO v_sub_by FROM public.site_config_drafts WHERE scope = 'clinic';
  IF v_sub_by IS DISTINCT FROM '00000000-0000-4000-8000-000000000002'::uuid THEN
    RAISE EXCEPTION 'FAIL [TEST 9A.2]: submitted_by not recorded for the Editor';
  END IF;

  v_blocked := false;
  BEGIN
    UPDATE public.site_config_drafts SET workflow_status = 'approved' WHERE scope = 'clinic';
  EXCEPTION WHEN raise_exception THEN v_blocked := true;
  END;
  IF NOT v_blocked THEN RAISE EXCEPTION 'FAIL [TEST 9A.3]: Editor approved their own clinic draft'; END IF;

  v_blocked := false;
  BEGIN
    UPDATE public.site_config_drafts SET reviewed_by = auth.uid() WHERE scope = 'clinic';
  EXCEPTION WHEN insufficient_privilege THEN v_blocked := true;
  END;
  IF NOT v_blocked THEN RAISE EXCEPTION 'FAIL [TEST 9A.4]: Editor could write reviewed_by'; END IF;

  v_blocked := false;
  BEGIN
    PERFORM public.publish_site_config_draft('clinic');
  EXCEPTION WHEN insufficient_privilege THEN v_blocked := true;
  END;
  IF NOT v_blocked THEN RAISE EXCEPTION 'FAIL [TEST 9A.5]: Editor could call publish_site_config_draft'; END IF;

  v_blocked := false;
  BEGIN
    DELETE FROM public.site_config_drafts WHERE scope = 'clinic';
  EXCEPTION WHEN insufficient_privilege THEN v_blocked := true;
  END;
  IF NOT v_blocked THEN RAISE EXCEPTION 'FAIL [TEST 9A.6]: Editor could delete the clinic draft row'; END IF;

  RAISE NOTICE 'PASS [TEST 9A]: Editor can submit but not approve, publish, forge review data or delete.';
END $$;

-- 9B. Super Admin: publish refused until approved; unsafe link refused at publish; reject → resubmit → publish
RESET role;
SET LOCAL role = 'authenticated';
SET LOCAL request.jwt.claims = '{"sub":"00000000-0000-4000-8000-000000000001","role":"authenticated","email":"staging_super@orthocarehub.test"}';
SET LOCAL "request.jwt.claim.sub" = '00000000-0000-4000-8000-000000000001';
SET LOCAL "request.jwt.claim.role" = 'authenticated';

DO $$
DECLARE
  v_blocked boolean;
BEGIN
  v_blocked := false;
  BEGIN
    PERFORM public.publish_site_config_draft('clinic');
  EXCEPTION WHEN raise_exception THEN v_blocked := true;
  END;
  IF NOT v_blocked THEN RAISE EXCEPTION 'FAIL [TEST 9B.1]: a pending (unapproved) draft was published'; END IF;

  v_blocked := false;
  BEGIN
    UPDATE public.site_config_drafts SET workflow_status = 'rejected', review_feedback = '  ' WHERE scope = 'clinic';
  EXCEPTION WHEN raise_exception THEN v_blocked := true;
  END;
  IF NOT v_blocked THEN RAISE EXCEPTION 'FAIL [TEST 9B.2]: rejection without feedback was accepted'; END IF;

  UPDATE public.site_config_drafts SET workflow_status = 'approved', review_feedback = NULL WHERE scope = 'clinic';

  v_blocked := false;
  BEGIN
    UPDATE public.site_config_drafts SET draft = draft || '{"hours":"changed after approval"}'::jsonb WHERE scope = 'clinic';
  EXCEPTION WHEN raise_exception THEN v_blocked := true;
  END;
  IF NOT v_blocked THEN RAISE EXCEPTION 'FAIL [TEST 9B.3]: an approved draft was edited in place'; END IF;

  v_blocked := false;
  BEGIN
    PERFORM public.publish_site_config_draft('clinic');
  EXCEPTION WHEN raise_exception THEN v_blocked := true;
  END;
  IF NOT v_blocked THEN RAISE EXCEPTION 'FAIL [TEST 9B.4]: a javascript: link was published'; END IF;

  UPDATE public.site_config_drafts
     SET workflow_status = 'rejected', review_feedback = 'Facebook link must be https.'
   WHERE scope = 'clinic';

  RAISE NOTICE 'PASS [TEST 9B]: approval gate, feedback rule, approved-draft lock and link validation hold.';
END $$;

-- 9C. Editor fixes and resubmits; feedback stays visible
RESET role;
SET LOCAL role = 'authenticated';
SET LOCAL request.jwt.claims = '{"sub":"00000000-0000-4000-8000-000000000002","role":"authenticated","email":"staging_editor@orthocarehub.test"}';
SET LOCAL "request.jwt.claim.sub" = '00000000-0000-4000-8000-000000000002';
SET LOCAL "request.jwt.claim.role" = 'authenticated';

DO $$
DECLARE
  v_feedback text;
BEGIN
  UPDATE public.site_config_drafts
     SET draft = draft || '{"facebook":""}'::jsonb,
         workflow_status = 'pending_approval',
         review_feedback = NULL
   WHERE scope = 'clinic';
  SELECT review_feedback INTO v_feedback FROM public.site_config_drafts WHERE scope = 'clinic';
  IF v_feedback IS DISTINCT FROM 'Facebook link must be https.' THEN
    RAISE EXCEPTION 'FAIL [TEST 9C]: Editor resubmission wiped the reviewer feedback (got %)', v_feedback;
  END IF;
  RAISE NOTICE 'PASS [TEST 9C]: Editor resubmitted; reviewer feedback preserved.';
END $$;

-- 9D. Super Admin approves and publishes: only clinic keys reach the live config
RESET role;
SET LOCAL role = 'authenticated';
SET LOCAL request.jwt.claims = '{"sub":"00000000-0000-4000-8000-000000000001","role":"authenticated","email":"staging_super@orthocarehub.test"}';
SET LOCAL "request.jwt.claim.sub" = '00000000-0000-4000-8000-000000000001';
SET LOCAL "request.jwt.claim.role" = 'authenticated';

DO $$
DECLARE
  v_doctor_before text;
  v_config jsonb;
  v_status text;
  v_versions int;
BEGIN
  SELECT config ->> 'doctorName' INTO v_doctor_before FROM public.site_config;
  UPDATE public.site_config_drafts SET workflow_status = 'approved', review_feedback = NULL WHERE scope = 'clinic';
  PERFORM public.publish_site_config_draft('clinic');

  SELECT config INTO v_config FROM public.site_config;
  IF v_config ->> 'phone' IS DISTINCT FROM '+910000000009' THEN
    RAISE EXCEPTION 'FAIL [TEST 9D.1]: published phone not live (got %)', v_config ->> 'phone';
  END IF;
  IF v_config ->> 'doctorName' IS DISTINCT FROM v_doctor_before THEN
    RAISE EXCEPTION 'FAIL [TEST 9D.2]: a non-clinic key (doctorName) leaked into the live config';
  END IF;

  SELECT workflow_status INTO v_status FROM public.site_config_drafts WHERE scope = 'clinic';
  IF v_status <> 'published' THEN RAISE EXCEPTION 'FAIL [TEST 9D.3]: draft not marked published'; END IF;

  SELECT count(*) INTO v_versions FROM public.content_versions WHERE entity_type = 'site_config' AND entity_id = 'clinic';
  IF v_versions < 1 THEN RAISE EXCEPTION 'FAIL [TEST 9D.4]: no content_versions snapshot recorded'; END IF;

  RAISE NOTICE 'PASS [TEST 9D]: approved clinic draft published; only clinic keys changed; version recorded.';
END $$;

-- 9E. Drafts are private
RESET role;
SET LOCAL role = 'anon';
SET LOCAL request.jwt.claims = '{"role":"anon"}';
SET LOCAL "request.jwt.claim.role" = 'anon';
SET LOCAL "request.jwt.claim.sub" = '';

DO $$
DECLARE
  v_blocked boolean := false;
BEGIN
  BEGIN
    PERFORM 1 FROM public.site_config_drafts LIMIT 1;
  EXCEPTION WHEN insufficient_privilege THEN v_blocked := true;
  END;
  IF NOT v_blocked THEN RAISE EXCEPTION 'FAIL [TEST 9E.1]: anon can read clinic drafts'; END IF;

  v_blocked := false;
  BEGIN
    PERFORM public.publish_site_config_draft('clinic');
  EXCEPTION WHEN insufficient_privilege THEN v_blocked := true;
  END;
  IF NOT v_blocked THEN RAISE EXCEPTION 'FAIL [TEST 9E.2]: anon can execute publish_site_config_draft'; END IF;
END $$;

RESET role;
SET LOCAL role = 'authenticated';
SET LOCAL request.jwt.claims = '{"sub":"00000000-0000-4000-8000-000000000004","role":"authenticated","email":"staging_norole@orthocarehub.test"}';
SET LOCAL "request.jwt.claim.sub" = '00000000-0000-4000-8000-000000000004';
SET LOCAL "request.jwt.claim.role" = 'authenticated';

DO $$
DECLARE
  v_count int;
BEGIN
  SELECT count(*) INTO v_count FROM public.site_config_drafts;
  IF v_count <> 0 THEN RAISE EXCEPTION 'FAIL [TEST 9E.3]: non-CMS account can read clinic drafts'; END IF;
  RAISE NOTICE 'PASS [TEST 9 / 005c]: Clinic draft workflow verified end to end.';
END $$;

RESET role;

-------------------------------------------------------------------------------
-- TEST 10 (005c): Doctor profile and Branding scopes
-------------------------------------------------------------------------------
-- 10A. Editor submits drafts containing one unsafe value each
RESET role;
SET LOCAL role = 'authenticated';
SET LOCAL request.jwt.claims = '{"sub":"00000000-0000-4000-8000-000000000002","role":"authenticated","email":"staging_editor@orthocarehub.test"}';
SET LOCAL "request.jwt.claim.sub" = '00000000-0000-4000-8000-000000000002';
SET LOCAL "request.jwt.claim.role" = 'authenticated';

DO $$
BEGIN
  UPDATE public.site_config_drafts
     SET draft = draft || '{"yearsExperience": 21, "heroImageUrl": "javascript:alert(1)", "phone": "+910000000000"}'::jsonb,
         workflow_status = 'pending_approval'
   WHERE scope = 'doctor';
  UPDATE public.site_config_drafts
     SET draft = jsonb_build_object('logoInitials', 'OC', 'branding', jsonb_build_object(
                   'footerTagline', 'Harness tagline',
                   'navItems', jsonb_build_array(jsonb_build_object(
                     'id', 'home', 'label', 'Home', 'to', 'javascript:alert(1)', 'visible', true, 'sortOrder', 1)))),
         workflow_status = 'pending_approval'
   WHERE scope = 'branding';
  RAISE NOTICE 'PASS [TEST 10A]: Editor submitted doctor and branding drafts.';
END $$;

-- 10B. Super Admin: both publishes are refused for the unsafe values, then rejected with feedback
RESET role;
SET LOCAL role = 'authenticated';
SET LOCAL request.jwt.claims = '{"sub":"00000000-0000-4000-8000-000000000001","role":"authenticated","email":"staging_super@orthocarehub.test"}';
SET LOCAL "request.jwt.claim.sub" = '00000000-0000-4000-8000-000000000001';
SET LOCAL "request.jwt.claim.role" = 'authenticated';

DO $$
DECLARE
  v_blocked boolean;
  s text;
BEGIN
  FOREACH s IN ARRAY ARRAY['doctor', 'branding'] LOOP
    UPDATE public.site_config_drafts SET workflow_status = 'approved', review_feedback = NULL WHERE scope = s;
    v_blocked := false;
    BEGIN
      PERFORM public.publish_site_config_draft(s);
    EXCEPTION WHEN raise_exception THEN v_blocked := true;
    END;
    IF NOT v_blocked THEN RAISE EXCEPTION 'FAIL [TEST 10B]: unsafe % draft was published', s; END IF;
    UPDATE public.site_config_drafts SET workflow_status = 'rejected', review_feedback = 'Unsafe link.' WHERE scope = s;
  END LOOP;
  RAISE NOTICE 'PASS [TEST 10B]: unsafe doctor image URL and branding nav link refused at publish.';
END $$;

-- 10C. Editor fixes both drafts and resubmits
RESET role;
SET LOCAL role = 'authenticated';
SET LOCAL request.jwt.claims = '{"sub":"00000000-0000-4000-8000-000000000002","role":"authenticated","email":"staging_editor@orthocarehub.test"}';
SET LOCAL "request.jwt.claim.sub" = '00000000-0000-4000-8000-000000000002';
SET LOCAL "request.jwt.claim.role" = 'authenticated';

DO $$
BEGIN
  UPDATE public.site_config_drafts
     SET draft = draft || '{"heroImageUrl": "/images/dr-srivanth-hero.jpg"}'::jsonb, workflow_status = 'pending_approval'
   WHERE scope = 'doctor';
  UPDATE public.site_config_drafts
     SET draft = jsonb_set(draft, '{branding,navItems,0,to}', '"/"'), workflow_status = 'pending_approval'
   WHERE scope = 'branding';
END $$;

-- 10E. Super Admin cannot write site_config directly (005c §7)
RESET role;
SET LOCAL role = 'authenticated';
SET LOCAL request.jwt.claims = '{"sub":"00000000-0000-4000-8000-000000000001","role":"authenticated","email":"staging_super@orthocarehub.test"}';
SET LOCAL "request.jwt.claim.sub" = '00000000-0000-4000-8000-000000000001';
SET LOCAL "request.jwt.claim.role" = 'authenticated';

DO $$
DECLARE v_blocked boolean := false;
BEGIN
  BEGIN
    UPDATE public.site_config SET config = config || '{"clinicName":"Direct write"}'::jsonb;
  EXCEPTION WHEN insufficient_privilege THEN v_blocked := true;
  END;
  IF NOT v_blocked THEN RAISE EXCEPTION 'FAIL [TEST 10E]: Super Admin bypassed the draft workflow on site_config'; END IF;
  RAISE NOTICE 'PASS [TEST 10E]: site_config is only writable through publish_site_config_draft().';
END $$;

-- 10D. Super Admin approves and publishes; only each scope's keys change
RESET role;
SET LOCAL role = 'authenticated';
SET LOCAL request.jwt.claims = '{"sub":"00000000-0000-4000-8000-000000000001","role":"authenticated","email":"staging_super@orthocarehub.test"}';
SET LOCAL "request.jwt.claim.sub" = '00000000-0000-4000-8000-000000000001';
SET LOCAL "request.jwt.claim.role" = 'authenticated';

DO $$
DECLARE
  v_phone_before text;
  v_config jsonb;
BEGIN
  SELECT config ->> 'phone' INTO v_phone_before FROM public.site_config;
  UPDATE public.site_config_drafts SET workflow_status = 'approved', review_feedback = NULL WHERE scope IN ('doctor', 'branding');
  PERFORM public.publish_site_config_draft('doctor');
  PERFORM public.publish_site_config_draft('branding');
  SELECT config INTO v_config FROM public.site_config;
  IF (v_config ->> 'yearsExperience')::int <> 21 THEN RAISE EXCEPTION 'FAIL [TEST 10D.1]: doctor change not live'; END IF;
  IF v_config ->> 'phone' IS DISTINCT FROM v_phone_before THEN
    RAISE EXCEPTION 'FAIL [TEST 10D.2]: a clinic key leaked through the doctor scope';
  END IF;
  IF v_config #>> '{branding,footerTagline}' IS DISTINCT FROM 'Harness tagline'
     OR v_config #>> '{branding,navItems,0,to}' IS DISTINCT FROM '/' THEN
    RAISE EXCEPTION 'FAIL [TEST 10D.3]: branding change not live';
  END IF;
  RAISE NOTICE 'PASS [TEST 10]: doctor and branding drafts published through approval only.';
END $$;

-------------------------------------------------------------------------------
-- TEST 11 (005d): Collections (services as the representative table)
-------------------------------------------------------------------------------
-- 11A. Editor proposes an edit and a new item; cannot publish or write the live table
RESET role;
SET LOCAL role = 'authenticated';
SET LOCAL request.jwt.claims = '{"sub":"00000000-0000-4000-8000-000000000002","role":"authenticated","email":"staging_editor@orthocarehub.test"}';
SET LOCAL "request.jwt.claim.sub" = '00000000-0000-4000-8000-000000000002';
SET LOCAL "request.jwt.claim.role" = 'authenticated';

DO $$
DECLARE
  v_id uuid;
  v_blocked boolean := false;
BEGIN
  SELECT id INTO v_id FROM public.services WHERE slug = '__test_service__';
  UPDATE public.content_collection_drafts
     SET draft = jsonb_build_object(
           'items', jsonb_build_array(
             jsonb_build_object('id', v_id, 'name', 'Edited through approval'),
             jsonb_build_object('id', 'new-1', 'name', 'Harness New Service', 'slug', '__test_new_service__')),
           'deletedIds', '[]'::jsonb),
         workflow_status = 'pending_approval'
   WHERE collection_key = 'services';

  BEGIN
    PERFORM public.publish_collection_draft('services');
  EXCEPTION WHEN insufficient_privilege THEN v_blocked := true;
  END;
  IF NOT v_blocked THEN RAISE EXCEPTION 'FAIL [TEST 11A.1]: Editor could publish a collection'; END IF;

  v_blocked := false;
  BEGIN
    INSERT INTO public.services (name, slug) VALUES ('Direct', '__test_direct__');
  EXCEPTION WHEN insufficient_privilege THEN v_blocked := true;
  END;
  IF NOT v_blocked THEN RAISE EXCEPTION 'FAIL [TEST 11A.2]: Editor wrote the live services table'; END IF;
  RAISE NOTICE 'PASS [TEST 11A]: Editor changes stay in the draft.';
END $$;

-- 11B. Super Admin cannot bypass approval; approves and publishes
RESET role;
SET LOCAL role = 'authenticated';
SET LOCAL request.jwt.claims = '{"sub":"00000000-0000-4000-8000-000000000001","role":"authenticated","email":"staging_super@orthocarehub.test"}';
SET LOCAL "request.jwt.claim.sub" = '00000000-0000-4000-8000-000000000001';
SET LOCAL "request.jwt.claim.role" = 'authenticated';

DO $$
DECLARE
  v_blocked boolean := false;
  v_name text;
  v_new int;
  v_items int;
BEGIN
  BEGIN
    UPDATE public.services SET name = 'Super Admin direct edit' WHERE slug = '__test_service__';
  EXCEPTION WHEN insufficient_privilege THEN v_blocked := true;
  END;
  IF NOT v_blocked THEN RAISE EXCEPTION 'FAIL [TEST 11B.1]: Super Admin bypassed approval on services'; END IF;

  v_blocked := false;
  BEGIN
    PERFORM public.publish_collection_draft('services');
  EXCEPTION WHEN raise_exception THEN v_blocked := true;
  END;
  IF NOT v_blocked THEN RAISE EXCEPTION 'FAIL [TEST 11B.2]: a pending collection draft was published'; END IF;

  UPDATE public.content_collection_drafts SET workflow_status = 'approved', review_feedback = NULL WHERE collection_key = 'services';
  PERFORM public.publish_collection_draft('services');

  SELECT name INTO v_name FROM public.services WHERE slug = '__test_service__';
  SELECT count(*) INTO v_new FROM public.services WHERE slug = '__test_new_service__';
  SELECT jsonb_array_length(draft -> 'items') INTO v_items FROM public.content_collection_drafts WHERE collection_key = 'services';
  IF v_name <> 'Edited through approval' OR v_new <> 1 OR v_items <> 0 THEN
    RAISE EXCEPTION 'FAIL [TEST 11B.3]: publish result wrong (name=%, new=%, remaining items=%)', v_name, v_new, v_items;
  END IF;
  RAISE NOTICE 'PASS [TEST 11B]: approved changeset applied (1 update, 1 insert) and cleared.';
END $$;

-- 11C. Deletion is also a reviewed change
RESET role;
SET LOCAL role = 'authenticated';
SET LOCAL request.jwt.claims = '{"sub":"00000000-0000-4000-8000-000000000002","role":"authenticated","email":"staging_editor@orthocarehub.test"}';
SET LOCAL "request.jwt.claim.sub" = '00000000-0000-4000-8000-000000000002';
SET LOCAL "request.jwt.claim.role" = 'authenticated';

DO $$
DECLARE v_id uuid;
BEGIN
  SELECT id INTO v_id FROM public.services WHERE slug = '__test_new_service__';
  UPDATE public.content_collection_drafts
     SET draft = jsonb_build_object('items', '[]'::jsonb, 'deletedIds', jsonb_build_array(v_id)),
         workflow_status = 'pending_approval'
   WHERE collection_key = 'services';
END $$;

RESET role;
SET LOCAL role = 'authenticated';
SET LOCAL request.jwt.claims = '{"sub":"00000000-0000-4000-8000-000000000001","role":"authenticated","email":"staging_super@orthocarehub.test"}';
SET LOCAL "request.jwt.claim.sub" = '00000000-0000-4000-8000-000000000001';
SET LOCAL "request.jwt.claim.role" = 'authenticated';

DO $$
DECLARE v_left int;
BEGIN
  UPDATE public.content_collection_drafts SET workflow_status = 'approved' WHERE collection_key = 'services';
  PERFORM public.publish_collection_draft('services');
  SELECT count(*) INTO v_left FROM public.services WHERE slug = '__test_new_service__';
  IF v_left <> 0 THEN RAISE EXCEPTION 'FAIL [TEST 11C]: approved deletion not applied'; END IF;
  RAISE NOTICE 'PASS [TEST 11 / 005d]: collection edits, inserts and deletions only go live through approval.';
END $$;

RESET role;

-- Unconditional rollback so zero synthetic rows or users persist in the staging database
ROLLBACK;
