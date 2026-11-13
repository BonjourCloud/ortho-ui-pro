/**
 * Direct publishing — static review of migration 007 plus the frontend decision helpers.
 *
 * STATIC / MOCKED ONLY: these tests read the proposed SQL as text and check the TypeScript helpers.
 * They do not execute SQL. Execution on Postgres is covered by
 * docs/proposed-migrations/007b_staging_direct_publish_and_invite_tests.sql (staging project).
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  DIRECT_PUBLISH_TARGETS,
  canDirectPublish,
  collectionTarget,
  directPublishBlockedReason,
} from "@/lib/cms/directPublish";
import { can } from "@/lib/permissions";

const dir = resolve(__dirname, "../../../docs/proposed-migrations");
const sql = readFileSync(resolve(dir, "007_direct_publishing_and_invitations.sql"), "utf8");
const harness = readFileSync(resolve(dir, "007b_staging_direct_publish_and_invite_tests.sql"), "utf8");

/** Body of one `CREATE OR REPLACE FUNCTION public.<name>(` … `END $$;` / `$$;` block. */
function fnBody(name: string): string {
  const start = sql.indexOf(`CREATE OR REPLACE FUNCTION public.${name}(`);
  expect(start, `${name} not found`).toBeGreaterThan(-1);
  const open = sql.indexOf("$$", start);
  const close = sql.indexOf("$$", open + 2);
  return sql.slice(start, close + 2);
}

/** SQL with `--` comments removed, so assertions only see executable statements. */
const code = sql
  .split("\n")
  .map((l) => l.replace(/--.*$/, ""))
  .join("\n");

describe("007 static review: defaults and existing accounts", () => {
  it("TEST 1/2: the flag is NOT NULL DEFAULT false and nothing in 007 turns it on", () => {
    expect(code).toMatch(/direct_publish_enabled\s+boolean NOT NULL DEFAULT false/);
    expect(code).not.toMatch(/SET\s+direct_publish_enabled\s*=\s*true/i);
    expect(code).not.toMatch(/direct_publish_enabled\s*=\s*true\s*(,|WHERE|;)/i);
    // and the migration asserts it before committing
    expect(code).toMatch(/IF EXISTS \(SELECT 1 FROM public\.profiles WHERE direct_publish_enabled\) THEN\s+RAISE EXCEPTION/);
  });

  it("drafts open at migration time cannot be published directly (unknown contributors)", () => {
    expect(code).toMatch(/SET contributors = ARRAY\['00000000-0000-0000-0000-000000000000'::uuid\]\s+WHERE workflow_status <> 'published'/);
  });

  it("is wrapped in a single transaction", () => {
    expect(code.match(/^BEGIN;/gm)).toHaveLength(1);
    expect(code.match(/^COMMIT;/gm)).toHaveLength(1);
  });
});

describe("007 static review: only Super Admins change the permission", () => {
  it("TEST 8/9: browser roles cannot write the flag (column revoke + guard trigger)", () => {
    expect(code).toMatch(/REVOKE UPDATE \(direct_publish_enabled,[\s\S]*?\)\s+ON public\.profiles FROM anon, authenticated;/);
    const guard = fnBody("guard_profile_privileged_columns");
    expect(guard).toMatch(/current_user NOT IN \('anon', 'authenticated'\)/);
    expect(guard).toMatch(/NEW\.direct_publish_enabled\s+IS DISTINCT FROM OLD\.direct_publish_enabled/);
    expect(guard).toMatch(/ERRCODE = '42501'/);
    expect(code).toMatch(/CREATE TRIGGER trg_guard_profile_privileged_columns\s+BEFORE UPDATE ON public\.profiles/);
  });

  it("TEST 3/4/9: admin_set_direct_publish is service-role only, takes the users mutex and checks the caller", () => {
    const body = fnBody("admin_set_direct_publish");
    expect(body).toMatch(/pg_advisory_xact_lock\(hashtext\('cms_admin_users_mutex'\)\)/);
    expect(body).toMatch(/public\.has_role\(_caller_id, 'super_admin'\) AND public\.is_account_active\(_caller_id\)/);
    expect(body).toMatch(/v_role IS DISTINCT FROM 'editor'/);
    expect(body).toMatch(/'user\.direct_publish_enabled' ELSE 'user\.direct_publish_disabled'/);
    expect(code).toMatch(
      /REVOKE ALL ON FUNCTION public\.admin_set_direct_publish\(uuid, boolean, uuid\) FROM PUBLIC, anon, authenticated;\s*GRANT EXECUTE ON FUNCTION public\.admin_set_direct_publish\(uuid, boolean, uuid\) TO service_role;/,
    );
  });

  it("a role change resets the flag", () => {
    expect(fnBody("reset_direct_publish_on_role_change")).toMatch(/SET direct_publish_enabled = false/);
    expect(code).toMatch(/AFTER INSERT ON public\.user_roles/);
  });
});

describe("007 static review: publish-time enforcement", () => {
  const authorize = fnBody("authorize_cms_publish");

  it("TEST 10/11: both publish functions authorise inside the database at call time", () => {
    for (const fn of ["publish_site_config_draft", "publish_collection_draft"]) {
      const body = fnBody(fn);
      expect(body, fn).toMatch(/public\.authorize_cms_publish\(/);
      expect(body, fn).toMatch(/FOR UPDATE;/);
      expect(body, fn).toMatch(/contributors = '\{\}'::uuid\[\]/);
      expect(body, fn).toMatch(/SECURITY DEFINER SET search_path = public/);
    }
    expect(fnBody("can_direct_publish")).toMatch(/p\.direct_publish_enabled = true/);
    expect(authorize).toMatch(/public\.can_direct_publish\(_target\)/);
  });

  it("Super Admin path still requires an approved draft", () => {
    expect(authorize).toMatch(/IF public\.is_super_admin\(\) THEN\s+IF _status <> 'approved' THEN/);
  });

  it("TEST 7: own content only — every contributor must be the caller", () => {
    expect(authorize).toMatch(/_contributors IS DISTINCT FROM ARRAY\[auth\.uid\(\)\]/);
    expect(fnBody("track_cms_draft_contributors")).toMatch(/NEW\.contributors := OLD\.contributors \|\| auth\.uid\(\)/);
  });

  it("removals always need review", () => {
    expect(authorize).toMatch(/IF _has_removals THEN/);
    expect(fnBody("publish_collection_draft")).toMatch(/jsonb_array_length\(COALESCE\(v_row\.draft -> 'deletedIds'/);
  });

  it("only active Editors qualify; disabled accounts and Super Admins never use the direct path", () => {
    const fn = fnBody("can_direct_publish");
    expect(fn).toMatch(/public\.is_editor\(\)/);
    expect(fn).toMatch(/NOT public\.is_super_admin\(\)/);
    expect(fn).toMatch(/p\.is_active = true/);
  });

  it("internal helpers cannot be called by browsers", () => {
    expect(code).toMatch(/REVOKE ALL ON FUNCTION public\.authorize_cms_publish\(text, text, uuid\[\], boolean\) FROM PUBLIC, anon, authenticated;/);
    expect(code).toMatch(/REVOKE ALL ON FUNCTION public\.record_direct_publish\(text, text, text, jsonb\) FROM PUBLIC, anon, authenticated;/);
  });

  it("TEST 17: direct publishes are recorded in approval_history and activity_logs", () => {
    const rec = fnBody("record_direct_publish");
    expect(rec).toMatch(/INSERT INTO public\.approval_history/);
    expect(rec).toMatch(/'workflow\.published_direct'/);
  });

  it("the SQL allow-list equals DIRECT_PUBLISH_TARGETS (no clinic, no branding)", () => {
    const m = fnBody("direct_publish_targets").match(/ARRAY\[([\s\S]*?)\]/);
    const sqlTargets = m![1].split(",").map((s) => s.trim().replace(/'/g, "")).filter(Boolean).sort();
    expect(sqlTargets).toEqual([...DIRECT_PUBLISH_TARGETS].sort());
    expect(sqlTargets).not.toContain("site_config:clinic");
    expect(sqlTargets).not.toContain("site_config:branding");
  });

  it("the staging harness covers every acceptance case", () => {
    for (const id of ["DP-01", "DP-02", "DP-03", "DP-04", "DP-05", "DP-06", "DP-07", "DP-08", "DP-09", "DP-10", "DP-11", "INV-01"]) {
      expect(harness, id).toContain(`PASS [${id}]`);
    }
    expect(harness.trimEnd().endsWith("ROLLBACK;")).toBe(true);
  });
});

describe("frontend decision helpers (UX only)", () => {
  it("TEST 1/5: Editors default to review; only an Editor with the flag ON and an allow-listed target qualifies", () => {
    expect(canDirectPublish("editor", false, "site_config:doctor")).toBe(false);
    expect(canDirectPublish("editor", true, "site_config:doctor")).toBe(true);
    expect(canDirectPublish("editor", true, collectionTarget("blog_posts"))).toBe(true);
    expect(canDirectPublish("editor", true, "site_config:clinic")).toBe(false);
    expect(canDirectPublish("editor", true, "site_config:branding")).toBe(false);
    expect(canDirectPublish("editor", true, "cms_page:home")).toBe(false);
    expect(canDirectPublish("legacy_admin", true, "site_config:doctor")).toBe(false);
    expect(canDirectPublish("super_admin", true, "site_config:doctor")).toBe(false);
    expect(canDirectPublish(null, true, "site_config:doctor")).toBe(false);
  });

  it("direct publishing never widens the role's other capabilities", () => {
    for (const cap of ["users.manage", "activity.view", "patientData.view", "system.settings", "content.approve", "content.delete"] as const) {
      expect(can("editor", cap)).toBe(false);
    }
  });

  it("blocked reasons: unsaved edits, nothing saved, removals", () => {
    expect(directPublishBlockedReason({ workflowStatus: "draft", unsavedChanges: true })).toMatch(/save your draft/i);
    expect(directPublishBlockedReason({ workflowStatus: "published", unsavedChanges: false })).toMatch(/no saved draft/i);
    expect(directPublishBlockedReason({ workflowStatus: "approved", unsavedChanges: false })).toMatch(/no saved draft/i);
    expect(directPublishBlockedReason({ workflowStatus: "draft", unsavedChanges: false, hasRemovals: true })).toMatch(/removing items/i);
    expect(directPublishBlockedReason({ workflowStatus: "draft", unsavedChanges: false })).toBeNull();
    expect(directPublishBlockedReason({ workflowStatus: "pending_approval", unsavedChanges: false })).toBeNull();
  });
});
