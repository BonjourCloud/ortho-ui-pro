/**
 * Collection changesets for Services, Blog posts, Case studies and Testimonials (migration 005d).
 *
 * A draft is a CHANGESET: `items` are changed or new rows, `deletedIds` are rows to remove.
 * Rows not mentioned stay exactly as they are live. `publish_collection_draft()` applies the
 * changeset after approval, using the same column allow-lists as below (checked by a unit test).
 */

export type CollectionKey = "services" | "blog_posts" | "case_studies" | "testimonials";
export type CollectionRow = Record<string, unknown> & { id?: string };

export interface CollectionChangeset {
  items: CollectionRow[];
  deletedIds: string[];
}

export interface CollectionDefinition {
  key: CollectionKey;
  label: string;
  /** Allow-listed columns; must equal `collection_columns()` in 005d. */
  columns: readonly string[];
  required: readonly string[];
  titleField: string;
  orderBy: { column: string; ascending: boolean };
  /** Columns whose values must be unique (slug). */
  unique: readonly string[];
}

export const COLLECTION_DEFINITIONS: Record<CollectionKey, CollectionDefinition> = {
  services: {
    key: "services",
    label: "Services",
    columns: [
      "name", "slug", "category", "body_part", "short_description", "cost_range", "success_rate",
      "patients_treated", "emi_available", "insurance_covered", "procedure_time", "hospital_stay",
      "recovery_time", "full_recovery", "sort_order",
    ],
    required: ["name", "slug"],
    titleField: "name",
    orderBy: { column: "sort_order", ascending: true },
    unique: ["slug"],
  },
  blog_posts: {
    key: "blog_posts",
    label: "Blog posts",
    columns: ["title", "slug", "excerpt", "content", "category", "tags", "read_time", "is_featured", "published_at"],
    required: ["title", "slug", "content"],
    titleField: "title",
    orderBy: { column: "published_at", ascending: false },
    unique: ["slug"],
  },
  case_studies: {
    key: "case_studies",
    label: "Case studies",
    columns: [
      "slug", "patient_initials", "age", "gender", "occupation", "condition", "procedure_name",
      "surgery_date", "surgery_type", "hospital_stay_days", "follow_up_period", "outcome_summary",
      "pain_score_pre", "pain_score_post", "range_of_motion_pre", "range_of_motion_post", "testimonial",
      "return_to_work", "return_to_sports", "is_featured", "milestones", "published_date",
    ],
    required: ["slug", "condition"],
    titleField: "condition",
    orderBy: { column: "created_at", ascending: false },
    unique: ["slug"],
  },
  testimonials: {
    key: "testimonials",
    label: "Testimonials",
    columns: [
      "name", "initials", "age", "gender", "occupation", "condition", "rating", "location", "text",
      "response", "source", "is_featured", "is_published", "sort_order",
    ],
    required: ["name", "text"],
    titleField: "name",
    orderBy: { column: "sort_order", ascending: true },
    unique: [],
  },
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isPersistedId(id: unknown): id is string {
  return typeof id === "string" && UUID_RE.test(id);
}

/** Client-side id for a row that does not exist yet (the database assigns the real id on publish). */
export function newDraftItemId(): string {
  return `new-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

/** Keeps only allow-listed columns (+ id) of each item; tolerates malformed input. */
export function normalizeChangeset(key: CollectionKey, raw: unknown): CollectionChangeset {
  const def = COLLECTION_DEFINITIONS[key];
  const source = (raw && typeof raw === "object" ? raw : {}) as { items?: unknown; deletedIds?: unknown };
  const items = Array.isArray(source.items) ? source.items : [];
  const deleted = Array.isArray(source.deletedIds) ? source.deletedIds : [];
  return {
    items: items
      .filter((i): i is Record<string, unknown> => !!i && typeof i === "object" && !Array.isArray(i))
      .map((item) => {
        const out: CollectionRow = {};
        if (typeof item.id === "string") out.id = item.id;
        for (const col of def.columns) if (col in item) out[col] = item[col];
        return out;
      }),
    deletedIds: deleted.filter(isPersistedId),
  };
}

export const EMPTY_CHANGESET: CollectionChangeset = { items: [], deletedIds: [] };

/** Live rows with the changeset applied (what the public site will show after publishing). */
export function applyChangeset(key: CollectionKey, liveRows: CollectionRow[], changeset: CollectionChangeset): CollectionRow[] {
  const def = COLLECTION_DEFINITIONS[key];
  const deleted = new Set(changeset.deletedIds);
  const changes = new Map(changeset.items.filter((i) => i.id).map((i) => [i.id as string, i]));
  const result = liveRows
    .filter((row) => !deleted.has(String(row.id)))
    .map((row) => (changes.has(String(row.id)) ? { ...row, ...changes.get(String(row.id)) } : row));
  const liveIds = new Set(liveRows.map((r) => String(r.id)));
  const added = changeset.items.filter((i) => !i.id || !liveIds.has(String(i.id)));
  const merged = [...result, ...added];
  const { column, ascending } = def.orderBy;
  if (column === "created_at") return merged;
  return [...merged].sort((a, b) => {
    const av = a[column] as string | number | null | undefined;
    const bv = b[column] as string | number | null | undefined;
    if (av == null && bv == null) return 0;
    if (av == null) return 1;
    if (bv == null) return -1;
    const cmp = av < bv ? -1 : av > bv ? 1 : 0;
    return ascending ? cmp : -cmp;
  });
}

/** Records an edit (or a new row) in the changeset, keeping only fields that differ from live. */
export function upsertChangesetItem(
  key: CollectionKey,
  changeset: CollectionChangeset,
  liveRows: CollectionRow[],
  item: CollectionRow,
): CollectionChangeset {
  const def = COLLECTION_DEFINITIONS[key];
  const id = item.id ?? newDraftItemId();
  const live = liveRows.find((r) => String(r.id) === id);
  const entry: CollectionRow = { id };
  for (const col of def.columns) {
    if (!(col in item)) continue;
    if (live && JSON.stringify(live[col] ?? null) === JSON.stringify(item[col] ?? null)) continue;
    entry[col] = item[col];
  }
  const others = changeset.items.filter((i) => i.id !== id);
  const hasChanges = Object.keys(entry).length > 1;
  return {
    items: hasChanges || !live ? [...others, entry] : others,
    deletedIds: changeset.deletedIds.filter((d) => d !== id),
  };
}

/** Marks a live row for removal (or drops an unpublished new row from the draft). */
export function removeChangesetItem(changeset: CollectionChangeset, id: string): CollectionChangeset {
  const items = changeset.items.filter((i) => i.id !== id);
  if (!isPersistedId(id)) return { items, deletedIds: changeset.deletedIds };
  return { items, deletedIds: Array.from(new Set([...changeset.deletedIds, id])) };
}

/** Removes every pending change for one row (undo). */
export function revertChangesetItem(changeset: CollectionChangeset, id: string): CollectionChangeset {
  return { items: changeset.items.filter((i) => i.id !== id), deletedIds: changeset.deletedIds.filter((d) => d !== id) };
}

export interface ChangesetSummaryLine {
  id: string;
  kind: "added" | "updated" | "removed";
  title: string;
  fields: string[];
}

export function summarizeChangeset(key: CollectionKey, liveRows: CollectionRow[], changeset: CollectionChangeset): ChangesetSummaryLine[] {
  const def = COLLECTION_DEFINITIONS[key];
  const byId = new Map(liveRows.map((r) => [String(r.id), r]));
  const lines: ChangesetSummaryLine[] = [];
  for (const item of changeset.items) {
    const live = item.id ? byId.get(String(item.id)) : undefined;
    const fields = Object.keys(item).filter((k) => k !== "id");
    const title = String(item[def.titleField] ?? live?.[def.titleField] ?? "(untitled)");
    lines.push({ id: String(item.id), kind: live ? "updated" : "added", title, fields });
  }
  for (const id of changeset.deletedIds) {
    const live = byId.get(id);
    lines.push({ id, kind: "removed", title: String(live?.[def.titleField] ?? id), fields: [] });
  }
  return lines;
}

/** Mirrors the constraints the database will apply on publish (required fields, unique slugs, ranges). */
export function validateChangeset(key: CollectionKey, changeset: CollectionChangeset, liveRows: CollectionRow[] = []): string[] {
  const def = COLLECTION_DEFINITIONS[key];
  const errors: string[] = [];
  const liveIds = new Set(liveRows.map((r) => String(r.id)));
  for (const item of changeset.items) {
    const isNew = !item.id || (!isPersistedId(item.id) && !liveIds.has(String(item.id)));
    const title = String(item[def.titleField] ?? "(untitled)");
    for (const col of def.required) {
      const present = col in item;
      const value = item[col];
      if ((isNew && !present) || (present && (value === null || String(value).trim() === ""))) {
        errors.push(`"${title}": ${col.replace(/_/g, " ")} is required.`);
      }
    }
    if ("slug" in item && typeof item.slug === "string" && !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(item.slug)) {
      errors.push(`"${title}": slug may contain only lowercase letters, numbers and dashes.`);
    }
    if (key === "testimonials" && "rating" in item) {
      const r = Number(item.rating);
      if (!Number.isInteger(r) || r < 1 || r > 5) errors.push(`"${title}": rating must be 1–5.`);
    }
    if (key === "case_studies") {
      for (const col of ["pain_score_pre", "pain_score_post"]) {
        if (col in item && item[col] !== null && item[col] !== "") {
          const v = Number(item[col]);
          if (!Number.isFinite(v) || v < 0 || v > 10) errors.push(`"${title}": ${col.replace(/_/g, " ")} must be 0–10.`);
        }
      }
    }
  }
  for (const col of def.unique) {
    const seen = new Map<string, number>();
    for (const item of changeset.items) {
      const v = item[col];
      if (typeof v === "string" && v) seen.set(v, (seen.get(v) ?? 0) + 1);
    }
    for (const [v, n] of seen) if (n > 1) errors.push(`Two changed items use the same ${col} "${v}".`);
  }
  return Array.from(new Set(errors));
}
