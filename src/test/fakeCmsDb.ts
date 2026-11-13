/**
 * In-memory stand-in for the parts of Supabase the CMS draft workflows use:
 * `site_config_drafts` (005c), `content_collection_drafts` (005d), the four live collection tables,
 * `approval_history`, and the RPCs `record_workflow_transition`, `publish_site_config_draft` and
 * `publish_collection_draft`.
 *
 * It mirrors the database rules that matter for frontend behaviour (publish only when approved,
 * Super Admin only, scope/column allow-lists) so component tests can prove the UI routes every
 * change through drafts. It also mirrors migration 007's direct-publishing rule (per-user flag read
 * at publish time, allow-listed targets, own-draft-only contributors, no removals).
 * It is NOT a substitute for the 006 / 007b harnesses on a real staging database.
 */
import { SITE_CONFIG_SCOPE_KEYS, pickScopeConfig, type SiteConfigScope } from "@/lib/cms/siteConfigScopes";
import { COLLECTION_DEFINITIONS, isPersistedId, type CollectionKey } from "@/lib/cms/collections";

type Row = Record<string, unknown>;

export interface FakeDbState {
  liveConfig: Row;
  siteDrafts: Record<SiteConfigScope, Row>;
  collectionDrafts: Record<CollectionKey, Row>;
  tables: Record<CollectionKey, Row[]>;
  history: Row[];
  /** Any attempted browser write to a live table (must stay 0). */
  liveWrites: string[];
  role: "editor" | "super_admin";
  /** Current actor (auth.uid()). */
  userId: string;
  /** profiles.direct_publish_enabled per user id (007). Read at publish time. */
  directPublish: Record<string, boolean>;
}

/** Mirrors public.direct_publish_targets() in 007. */
export const FAKE_DIRECT_PUBLISH_TARGETS = [
  "site_config:doctor",
  "collection:services",
  "collection:blog_posts",
  "collection:case_studies",
  "collection:testimonials",
];

let uuidCounter = 0;
export function fakeUuid(): string {
  uuidCounter += 1;
  return `00000000-0000-4000-8000-${String(uuidCounter).padStart(12, "0")}`;
}

export function createFakeDb(liveConfig: Row, tables: Partial<Record<CollectionKey, Row[]>> = {}): FakeDbState {
  const draftRow = (draft: Row): Row => ({
    draft,
    workflow_status: "published",
    review_feedback: null,
    reviewed_at: null,
    submitted_at: null,
    published_at: null,
    contributors: [] as string[],
  });
  return {
    liveConfig: { ...liveConfig },
    siteDrafts: {
      clinic: draftRow(pickScopeConfig("clinic", liveConfig) as Row),
      doctor: draftRow(pickScopeConfig("doctor", liveConfig) as Row),
      branding: draftRow(pickScopeConfig("branding", liveConfig) as Row),
    },
    collectionDrafts: {
      services: draftRow({ items: [], deletedIds: [] }),
      blog_posts: draftRow({ items: [], deletedIds: [] }),
      case_studies: draftRow({ items: [], deletedIds: [] }),
      testimonials: draftRow({ items: [], deletedIds: [] }),
    },
    tables: {
      services: tables.services ?? [],
      blog_posts: tables.blog_posts ?? [],
      case_studies: tables.case_studies ?? [],
      testimonials: tables.testimonials ?? [],
    },
    history: [],
    liveWrites: [],
    role: "editor",
    userId: "u-editor",
    directPublish: {},
  };
}

function clone<T>(v: T): T {
  return JSON.parse(JSON.stringify(v)) as T;
}

/** Builds a `supabase`-shaped object backed by `state`. */
export function createFakeSupabase(state: FakeDbState) {
  // track_cms_draft_contributors() (007)
  const trackContributor = (row: Row, update: Row) => {
    const contributors = (row.contributors as string[] | undefined) ?? [];
    if ("draft" in update && JSON.stringify(update.draft) !== JSON.stringify(row.draft) && !contributors.includes(state.userId)) {
      row.contributors = [...contributors, state.userId];
    }
  };

  // authorize_cms_publish() (007): returns "direct", "approved" or an error.
  const authorizePublish = (
    target: string,
    row: Row,
    hasRemovals: boolean,
  ): { mode: "direct" | "approved" } | { error: { code: string; message: string } } => {
    const status = String(row.workflow_status);
    if (state.role === "super_admin") {
      if (status !== "approved") {
        return { error: { code: "P0001", message: `Only approved changes can be published (current status: ${status}).` } };
      }
      return { mode: "approved" };
    }
    const allowed = state.directPublish[state.userId] === true && FAKE_DIRECT_PUBLISH_TARGETS.includes(target);
    if (!allowed) {
      return { error: { code: "42501", message: "Your account must submit this change for Super Admin review." } };
    }
    if (status !== "draft" && status !== "pending_approval") {
      return { error: { code: "P0001", message: `Save your changes as a draft before publishing (current status: ${status}).` } };
    }
    const contributors = (row.contributors as string[] | undefined) ?? [];
    if (contributors.length !== 1 || contributors[0] !== state.userId) {
      return {
        error: {
          code: "42501",
          message: "This draft includes changes made by another CMS user. Submit it for Super Admin review instead.",
        },
      };
    }
    if (hasRemovals) return { error: { code: "42501", message: "Removing items always needs Super Admin review." } };
    return { mode: "direct" };
  };

  const recordDirect = (entityType: string, entityId: string, from: unknown) => {
    state.history.push({
      id: String(state.history.length + 1),
      entity_type: entityType,
      entity_id: entityId,
      from_status: from,
      to_status: "published",
      actor_email: "doctor@orthocarehub.in",
      actor_role: "editor",
      feedback: null,
      direct_publish: true,
      created_at: new Date().toISOString(),
    });
  };

  const builder = (table: string) => {
    const filters: Record<string, string> = {};
    let update: Row | null = null;
    let mode: "select" | "update" | "insert" | "delete" = "select";

    const result = (): { data: unknown; error: { code?: string; message: string } | null } => {
      if (table === "site_config_drafts") {
        const scope = filters.scope as SiteConfigScope;
        const row = state.siteDrafts[scope];
        if (!row) return { data: null, error: null };
        if (mode === "update" && update) {
          trackContributor(row, update);
          Object.assign(row, clone(update));
          return { data: [{ workflow_status: row.workflow_status }], error: null };
        }
        return { data: clone(row), error: null };
      }
      if (table === "content_collection_drafts") {
        const key = filters.collection_key as CollectionKey;
        const row = state.collectionDrafts[key];
        if (!row) return { data: null, error: null };
        if (mode === "update" && update) {
          trackContributor(row, update);
          Object.assign(row, clone(update));
          return { data: [{ workflow_status: row.workflow_status }], error: null };
        }
        return { data: clone(row), error: null };
      }
      if (table === "approval_history") {
        const rows = state.history.filter(
          (h) => h.entity_type === filters.entity_type && h.entity_id === filters.entity_id,
        );
        return { data: clone([...rows].reverse()), error: null };
      }
      if (table in state.tables) {
        if (mode !== "select") {
          state.liveWrites.push(`${mode}:${table}`);
          return { data: null, error: { code: "42501", message: `permission denied for table ${table}` } };
        }
        return { data: clone(state.tables[table as CollectionKey]), error: null };
      }
      if (table === "site_config") {
        if (mode !== "select") {
          state.liveWrites.push(`${mode}:site_config`);
          return { data: null, error: { code: "42501", message: "permission denied for table site_config" } };
        }
        return { data: { id: "cfg", config: clone(state.liveConfig) }, error: null };
      }
      return { data: null, error: { code: "42P01", message: "relation does not exist" } };
    };

    const chain = {
      select: () => chain,
      eq: (col: string, val: string) => {
        filters[col] = val;
        return chain;
      },
      order: () => chain,
      limit: () => chain,
      update: (values: Row) => {
        mode = "update";
        update = values;
        return chain;
      },
      insert: () => {
        mode = "insert";
        return chain;
      },
      upsert: () => {
        mode = "insert";
        return chain;
      },
      delete: () => {
        mode = "delete";
        return chain;
      },
      maybeSingle: async () => result(),
      single: async () => result(),
      then: (resolve: (v: unknown) => unknown, reject?: (e: unknown) => unknown) =>
        Promise.resolve(result()).then(resolve, reject),
    };
    return chain;
  };

  const rpc = async (fn: string, args: Row = {}) => {
    if (fn === "record_workflow_transition") {
      state.history.push({
        id: String(state.history.length + 1),
        entity_type: args._entity_type,
        entity_id: args._entity_id,
        from_status: args._from_status,
        to_status: args._to_status,
        actor_email: state.role === "super_admin" ? "admin@orthocarehub.in" : "doctor@orthocarehub.in",
        actor_role: state.role,
        feedback: args._feedback ?? null,
        created_at: new Date().toISOString(),
      });
      return { data: null, error: null };
    }
    if (fn === "publish_site_config_draft") {
      const scope = args._scope as SiteConfigScope;
      const row = state.siteDrafts[scope];
      const auth = authorizePublish(`site_config:${scope}`, row, false);
      if ("error" in auth) return { data: null, error: auth.error };
      const fromStatus = row.workflow_status;
      const patch: Row = {};
      for (const key of SITE_CONFIG_SCOPE_KEYS[scope]) {
        if (key in (row.draft as Row)) patch[key] = (row.draft as Row)[key];
      }
      state.liveConfig = { ...state.liveConfig, ...clone(patch) };
      row.workflow_status = "published";
      row.contributors = [];
      if (auth.mode === "direct") recordDirect("site_config", scope, fromStatus);
      return { data: clone(state.liveConfig), error: null };
    }
    if (fn === "publish_collection_draft") {
      const key = args._key as CollectionKey;
      const row = state.collectionDrafts[key];
      const draft = row.draft as { items: Row[]; deletedIds: string[] };
      const auth = authorizePublish(`collection:${key}`, row, draft.deletedIds.length > 0);
      if ("error" in auth) return { data: null, error: auth.error };
      const fromStatus = row.workflow_status;
      const def = COLLECTION_DEFINITIONS[key];
      let inserted = 0;
      let updated = 0;
      let deleted = 0;
      for (const item of draft.items) {
        const patch: Row = {};
        for (const col of def.columns) if (col in item) patch[col] = item[col];
        const existing = isPersistedId(item.id) ? state.tables[key].find((r) => r.id === item.id) : undefined;
        if (existing) {
          Object.assign(existing, clone(patch));
          updated += 1;
        } else {
          state.tables[key].push({ id: fakeUuid(), ...clone(patch) });
          inserted += 1;
        }
      }
      for (const id of draft.deletedIds) {
        const before = state.tables[key].length;
        state.tables[key] = state.tables[key].filter((r) => r.id !== id);
        deleted += before - state.tables[key].length;
      }
      row.draft = { items: [], deletedIds: [] };
      row.workflow_status = "published";
      row.contributors = [];
      if (auth.mode === "direct") recordDirect("collection", key, fromStatus);
      return { data: { inserted, updated, deleted }, error: null };
    }
    return { data: null, error: null };
  };

  return {
    from: (table: string) => builder(table),
    rpc,
    auth: { getSession: async () => ({ data: { session: null } }) },
    storage: { from: () => ({}) },
  };
}
