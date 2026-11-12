/**
 * In-memory stand-in for the parts of Supabase the CMS draft workflows use:
 * `site_config_drafts` (005c), `content_collection_drafts` (005d), the four live collection tables,
 * `approval_history`, and the RPCs `record_workflow_transition`, `publish_site_config_draft` and
 * `publish_collection_draft`.
 *
 * It mirrors the database rules that matter for frontend behaviour (publish only when approved,
 * Super Admin only, scope/column allow-lists) so component tests can prove the UI routes every
 * change through drafts. It is NOT a substitute for the 006 harness on a real staging database.
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
}

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
  };
}

function clone<T>(v: T): T {
  return JSON.parse(JSON.stringify(v)) as T;
}

/** Builds a `supabase`-shaped object backed by `state`. */
export function createFakeSupabase(state: FakeDbState) {
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
      if (state.role !== "super_admin") return { data: null, error: { code: "42501", message: "Only a Super Admin can publish site settings." } };
      const scope = args._scope as SiteConfigScope;
      const row = state.siteDrafts[scope];
      if (row.workflow_status !== "approved") {
        return { data: null, error: { code: "P0001", message: `Only approved changes can be published (current status: ${String(row.workflow_status)}).` } };
      }
      const patch: Row = {};
      for (const key of SITE_CONFIG_SCOPE_KEYS[scope]) {
        if (key in (row.draft as Row)) patch[key] = (row.draft as Row)[key];
      }
      state.liveConfig = { ...state.liveConfig, ...clone(patch) };
      row.workflow_status = "published";
      return { data: clone(state.liveConfig), error: null };
    }
    if (fn === "publish_collection_draft") {
      if (state.role !== "super_admin") return { data: null, error: { code: "42501", message: "Only a Super Admin can publish content." } };
      const key = args._key as CollectionKey;
      const row = state.collectionDrafts[key];
      if (row.workflow_status !== "approved") {
        return { data: null, error: { code: "P0001", message: `Only approved changes can be published (current status: ${String(row.workflow_status)}).` } };
      }
      const def = COLLECTION_DEFINITIONS[key];
      const draft = row.draft as { items: Row[]; deletedIds: string[] };
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
