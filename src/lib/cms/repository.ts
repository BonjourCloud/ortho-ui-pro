/**
 * Clean CMS Repository / Adapter Layer for Iteration 3.
 *
 * Responsibilities:
 * 1. Enforces Rajiv's confirmed approval workflow:
 *    - `draft` -> `pending_approval` -> `approved` / `rejected` -> `published`
 *    - Editors can NEVER write to published columns; they only write to `draft_*` columns.
 *    - Super Admins can approve, reject (with required feedback), and publish.
 * 2. Detects whether Migration 004 tables/columns (`cms_pages`, `media_assets`, `approval_history`,
 *    `site_config.draft_config`, `medical_subsections.draft_*`) are present in the connected database.
 *    - When Migration 004 IS applied: persists drafts, workflow transitions, approval history, and media to Supabase.
 *    - When Migration 004 is NOT YET applied: stages drafts and workflow transitions safely in an
 *      authenticated session preview buffer (`sessionStorage` scoped to the CMS session) so the
 *      UI, approval state machine, and `?preview=1` mode work without touching live production columns!
 */

import { supabase } from "@/integrations/supabase/client";
import type { SiteConfig } from "@/contexts/SiteConfigContext";
import {
  DEFAULT_HOME_CONTENT,
  DEFAULT_ROUTE_SEO_CATALOG,
  mergeHomeContent,
  type ApprovalHistoryEntry,
  type HomePageContent,
  type MediaAsset,
  type MediaCategory,
  type RouteSeoMetadata,
  type TreatmentSectionBlock,
  type WorkflowStatus,
  compileTreatmentBlocksToHtml,
  validateMediaFile,
} from "@/lib/cms/types";

const SESSION_DRAFT_PREFIX = "orthocare_cms_staged_v1:";

function readStaged<T>(key: string): T | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(SESSION_DRAFT_PREFIX + key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function writeStaged<T>(key: string, value: T): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(SESSION_DRAFT_PREFIX + key, JSON.stringify(value));
  } catch {
    // Ignore storage quota errors in restricted environments
  }
}

export interface StagedEnvelope<T> {
  draft: T;
  workflowStatus: WorkflowStatus;
  reviewFeedback?: string | null;
  reviewedByEmail?: string | null;
  reviewedAt?: string | null;
  history: ApprovalHistoryEntry[];
}

export interface CmsOperationResult {
  ok: boolean;
  persistedToDatabase: boolean;
  message: string;
  workflowStatus?: WorkflowStatus;
}

function isMissingSchemaError(err: { code?: string; message?: string } | null | undefined): boolean {
  if (!err) return false;
  const code = err.code ?? "";
  const msg = (err.message ?? "").toLowerCase();
  return (
    code === "42P01" || // undefined_table
    code === "42703" || // undefined_column
    code === "PGRST204" || // column not found in schema cache
    code === "PGRST205" || // table not found in schema cache
    msg.includes("does not exist") ||
    msg.includes("schema cache")
  );
}

// ---------------------------------------------------------------------------
// 1. Built-in Public Static Media Catalog (Always available even before Migration 004)
// ---------------------------------------------------------------------------

export const BUILTIN_STATIC_MEDIA: MediaAsset[] = [
  {
    id: "static-hero-doctor",
    fileName: "dr-srivanth-hero.jpg",
    storagePath: "static/images/dr-srivanth-hero.jpg",
    publicUrl: "/images/dr-srivanth-hero.jpg",
    mediaType: "image",
    mimeType: "image/jpeg",
    sizeBytes: 145000,
    altText: "Dr. Srivanth Dasari - Orthopedic Surgeon",
    caption: "Hero portrait of Dr. Srivanth Dasari",
    category: "doctor",
    createdAt: "2026-04-01T00:00:00.000Z",
  },
  {
    id: "static-fellowship-korea",
    fileName: "fellowship-korea-operating-room.jpeg",
    storagePath: "static/images/fellowship-korea-operating-room.jpeg",
    publicUrl: "/images/fellowship-korea-operating-room.jpeg",
    mediaType: "image",
    mimeType: "image/jpeg",
    sizeBytes: 210000,
    altText: "Dr. Srivanth Dasari fellowship in South Korea operating room",
    caption: "International Orthopaedic Fellowship in South Korea",
    category: "doctor",
    createdAt: "2026-04-01T00:00:00.000Z",
  },
  {
    id: "static-knee-replacement",
    fileName: "total-knee-replacement-hero.webp",
    storagePath: "static/images/treatments/total-knee-replacement-hero.webp",
    publicUrl: "/images/treatments/total-knee-replacement-hero.webp",
    mediaType: "image",
    mimeType: "image/webp",
    sizeBytes: 98000,
    altText: "Total Knee Replacement Procedure",
    caption: "Total Knee Replacement illustration",
    category: "treatments",
    createdAt: "2026-04-13T00:00:00.000Z",
  },
  {
    id: "static-hip-replacement",
    fileName: "total-hip-replacement-hero.webp",
    storagePath: "static/images/treatments/total-hip-replacement-hero.webp",
    publicUrl: "/images/treatments/total-hip-replacement-hero.webp",
    mediaType: "image",
    mimeType: "image/webp",
    sizeBytes: 102000,
    altText: "Total Hip Replacement Procedure",
    caption: "Total Hip Replacement illustration",
    category: "treatments",
    createdAt: "2026-04-15T00:00:00.000Z",
  },
  {
    id: "static-acl-surgery",
    fileName: "acl-injury-surgery-hero.webp",
    storagePath: "static/images/treatments/acl-injury-surgery-hero.webp",
    publicUrl: "/images/treatments/acl-injury-surgery-hero.webp",
    mediaType: "image",
    mimeType: "image/webp",
    sizeBytes: 92000,
    altText: "ACL Reconstruction Surgery",
    caption: "ACL Reconstruction illustration",
    category: "treatments",
    createdAt: "2026-04-15T00:00:00.000Z",
  },
  {
    id: "static-testimonial-video",
    fileName: "testimonial1.mp4",
    storagePath: "static/videos/testimonial1.mp4",
    publicUrl: "/videos/testimonial1.mp4",
    mediaType: "video",
    mimeType: "video/mp4",
    sizeBytes: 4200000,
    altText: "Patient video testimonial",
    caption: "Patient sharing recovery experience at OrthoCare Hub",
    category: "testimonials",
    createdAt: "2026-04-01T00:00:00.000Z",
  },
];

// ---------------------------------------------------------------------------
// 2. Homepage & Page Sections Adapter (`cms_pages`)
// ---------------------------------------------------------------------------

export interface LoadedPageRecord {
  published: HomePageContent;
  draft: HomePageContent | null;
  workflowStatus: WorkflowStatus;
  reviewFeedback: string | null;
  reviewedByEmail: string | null;
  reviewedAt: string | null;
  history: ApprovalHistoryEntry[];
  schemaReady: boolean;
}

export async function loadHomePageRecord(
  opts: { includeDraft?: boolean } = {},
): Promise<LoadedPageRecord> {
  const { includeDraft = true } = opts;
  const staged = includeDraft ? readStaged<StagedEnvelope<HomePageContent>>("page:home") : null;
  const selectColumns = includeDraft
    ? "*"
    : "id, slug, title, published_sections, seo_title, seo_description, seo_keywords, og_image_url, published_at, updated_at";

  try {
    // Use untyped table query since cms_pages is introduced in proposed migration 004
    const { data, error } = await (supabase as unknown as {
      from: (t: string) => {
        select: (cols: string) => {
          eq: (col: string, val: string) => {
            maybeSingle: () => Promise<{ data: Record<string, unknown> | null; error: { code?: string; message?: string } | null }>;
          };
        };
      };
    })
      .from("cms_pages")
      .select(selectColumns)
      .eq("slug", "home")
      .maybeSingle();

    if (error && isMissingSchemaError(error)) {
      return {
        published: DEFAULT_HOME_CONTENT,
        draft: staged?.draft ?? null,
        workflowStatus: staged?.workflowStatus ?? "published",
        reviewFeedback: staged?.reviewFeedback ?? null,
        reviewedByEmail: staged?.reviewedByEmail ?? null,
        reviewedAt: staged?.reviewedAt ?? null,
        history: staged?.history ?? [],
        schemaReady: false,
      };
    }

    if (!data) {
      return {
        published: DEFAULT_HOME_CONTENT,
        draft: staged?.draft ?? null,
        workflowStatus: staged?.workflowStatus ?? "published",
        reviewFeedback: staged?.reviewFeedback ?? null,
        reviewedByEmail: staged?.reviewedByEmail ?? null,
        reviewedAt: staged?.reviewedAt ?? null,
        history: staged?.history ?? [],
        schemaReady: true,
      };
    }

    const published = mergeHomeContent(data.published_sections as Partial<HomePageContent>);
    const draft =
      includeDraft && data.draft_sections
        ? mergeHomeContent(data.draft_sections as Partial<HomePageContent>)
        : staged?.draft ?? null;

    return {
      published,
      draft,
      workflowStatus: includeDraft
        ? (data.workflow_status as WorkflowStatus) || staged?.workflowStatus || "published"
        : "published",
      reviewFeedback: includeDraft ? ((data.review_feedback as string | null) ?? staged?.reviewFeedback ?? null) : null,
      reviewedByEmail: includeDraft ? (staged?.reviewedByEmail ?? null) : null,
      reviewedAt: includeDraft ? ((data.reviewed_at as string | null) ?? staged?.reviewedAt ?? null) : null,
      history: includeDraft ? (staged?.history ?? []) : [],
      schemaReady: true,
    };
  } catch {
    return {
      published: DEFAULT_HOME_CONTENT,
      draft: staged?.draft ?? null,
      workflowStatus: staged?.workflowStatus ?? "published",
      reviewFeedback: staged?.reviewFeedback ?? null,
      reviewedByEmail: staged?.reviewedByEmail ?? null,
      reviewedAt: staged?.reviewedAt ?? null,
      history: staged?.history ?? [],
      schemaReady: false,
    };
  }
}

export async function transitionHomePageWorkflow(params: {
  draftContent: HomePageContent;
  targetStatus: WorkflowStatus;
  actorEmail: string;
  actorRole: string;
  canPublish: boolean;
  feedback?: string;
}): Promise<CmsOperationResult> {
  const { draftContent, targetStatus, actorEmail, actorRole, canPublish, feedback } = params;
  const existing = readStaged<StagedEnvelope<HomePageContent>>("page:home");
  const prevStatus: WorkflowStatus = existing?.workflowStatus ?? "published";

  if ((targetStatus === "approved" || targetStatus === "published") && !canPublish) {
    return {
      ok: false,
      persistedToDatabase: false,
      message: "Only a Super Admin can approve or publish changes to the live website.",
      workflowStatus: prevStatus,
    };
  }

  const newEntry: ApprovalHistoryEntry = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    entityType: "cms_page",
    entityId: "home",
    fromStatus: prevStatus,
    toStatus: targetStatus,
    actorEmail,
    actorRole,
    feedback: feedback ?? null,
    createdAt: new Date().toISOString(),
  };

  const nextEnvelope: StagedEnvelope<HomePageContent> = {
    draft: draftContent,
    workflowStatus: targetStatus,
    reviewFeedback: targetStatus === "rejected" ? (feedback ?? null) : existing?.reviewFeedback ?? null,
    reviewedByEmail:
      targetStatus === "approved" || targetStatus === "rejected" || targetStatus === "published"
        ? actorEmail
        : existing?.reviewedByEmail ?? null,
    reviewedAt:
      targetStatus === "approved" || targetStatus === "rejected" || targetStatus === "published"
        ? new Date().toISOString()
        : existing?.reviewedAt ?? null,
    history: [newEntry, ...(existing?.history ?? [])],
  };

  writeStaged("page:home", nextEnvelope);

  // Attempt DB persistence if migration 004 is applied
  try {
    const payload: Record<string, unknown> = {
      slug: "home",
      title: "Homepage",
      workflow_status: targetStatus,
      draft_sections: draftContent,
      review_feedback: targetStatus === "rejected" ? (feedback ?? null) : null,
    };
    if (targetStatus === "published" && canPublish) {
      payload.published_sections = draftContent;
      payload.published_at = new Date().toISOString();
    }

    const { error } = await (supabase as unknown as {
      from: (t: string) => {
        upsert: (row: Record<string, unknown>, opts: { onConflict: string }) => Promise<{ error: { code?: string; message?: string } | null }>;
      };
    })
      .from("cms_pages")
      .upsert(payload, { onConflict: "slug" });

    if (error) {
      if (isMissingSchemaError(error)) {
        return {
          ok: true,
          persistedToDatabase: false,
          workflowStatus: targetStatus,
          message: `Saved "${targetStatus}" state in session preview (waiting for Migration 004 to persist to cms_pages).`,
        };
      }
      return {
        ok: false,
        persistedToDatabase: false,
        workflowStatus: prevStatus,
        message: error.message ?? "Database update failed.",
      };
    }

    // Record workflow transition in approval_history + activity_logs
    await (supabase.rpc as unknown as (fn: string, args: Record<string, unknown>) => Promise<unknown>)(
      "record_workflow_transition",
      {
        _entity_type: "cms_page",
        _entity_id: "home",
        _from_status: prevStatus,
        _to_status: targetStatus,
        _feedback: feedback ?? null,
      },
    ).catch(() => {});

    return {
      ok: true,
      persistedToDatabase: true,
      workflowStatus: targetStatus,
      message:
        targetStatus === "published"
          ? "Homepage published to the live website."
          : targetStatus === "pending_approval"
            ? "Draft submitted for Super Admin review."
            : targetStatus === "approved"
              ? "Draft approved and ready to publish."
              : targetStatus === "rejected"
                ? "Changes rejected with feedback sent to the Editor."
                : "Draft saved.",
    };
  } catch {
    return {
      ok: true,
      persistedToDatabase: false,
      workflowStatus: targetStatus,
      message: `Saved "${targetStatus}" state in session preview (waiting for Migration 004).`,
    };
  }
}

// ---------------------------------------------------------------------------
// 3. SiteConfig (Clinic Information & Doctor Profile) Approval Workflow Adapter
// ---------------------------------------------------------------------------

export function loadStagedSiteConfig(
  scope: "clinic" | "doctor" | "branding",
): StagedEnvelope<Partial<SiteConfig>> | null {
  return readStaged<StagedEnvelope<Partial<SiteConfig>>>(`site_config:${scope}`);
}

export async function transitionSiteConfigWorkflow(params: {
  scope: "clinic" | "doctor" | "branding";
  updates: Partial<SiteConfig>;
  targetStatus: WorkflowStatus;
  actorEmail: string;
  actorRole: string;
  canPublish: boolean;
  updateLiveConfig: (updates: Partial<SiteConfig>) => Promise<unknown>;
  feedback?: string;
}): Promise<CmsOperationResult> {
  const { scope, updates, targetStatus, actorEmail, actorRole, canPublish, updateLiveConfig, feedback } = params;
  const existing = loadStagedSiteConfig(scope);
  const prevStatus: WorkflowStatus = existing?.workflowStatus ?? "published";

  if ((targetStatus === "approved" || targetStatus === "published") && !canPublish) {
    return {
      ok: false,
      persistedToDatabase: false,
      workflowStatus: prevStatus,
      message: "Editors cannot directly modify published clinic, doctor, or branding settings. Save a draft and submit for review.",
    };
  }

  const newEntry: ApprovalHistoryEntry = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    entityType: "site_config",
    entityId: scope,
    fromStatus: prevStatus,
    toStatus: targetStatus,
    actorEmail,
    actorRole,
    feedback: feedback ?? null,
    createdAt: new Date().toISOString(),
  };

  const nextEnvelope: StagedEnvelope<Partial<SiteConfig>> = {
    draft: updates,
    workflowStatus: targetStatus,
    reviewFeedback: targetStatus === "rejected" ? (feedback ?? null) : existing?.reviewFeedback ?? null,
    reviewedByEmail:
      targetStatus === "approved" || targetStatus === "rejected" || targetStatus === "published"
        ? actorEmail
        : existing?.reviewedByEmail ?? null,
    reviewedAt:
      targetStatus === "approved" || targetStatus === "rejected" || targetStatus === "published"
        ? new Date().toISOString()
        : existing?.reviewedAt ?? null,
    history: [newEntry, ...(existing?.history ?? [])],
  };

  writeStaged(`site_config:${scope}`, nextEnvelope);

  // Only when Super Admin publishes do we write to the live `site_config.config` column!
  if (targetStatus === "published" && canPublish) {
    try {
      await updateLiveConfig(updates);
      const label =
        scope === "clinic"
          ? "Clinic information"
          : scope === "doctor"
            ? "Doctor profile"
            : "Branding & theme settings";
      return {
        ok: true,
        persistedToDatabase: true,
        workflowStatus: "published",
        message: `${label} published to the live website.`,
      };
    } catch (err) {
      return {
        ok: false,
        persistedToDatabase: false,
        workflowStatus: prevStatus,
        message: err instanceof Error ? err.message : "Failed to publish settings.",
      };
    }
  }

  return {
    ok: true,
    persistedToDatabase: false,
    workflowStatus: targetStatus,
    message:
      targetStatus === "pending_approval"
        ? "Draft submitted for Super Admin review. Live website remains unchanged until approved & published."
        : targetStatus === "approved"
          ? "Changes approved. Click 'Publish approved' to push live."
          : targetStatus === "rejected"
            ? "Changes rejected with feedback."
            : "Draft saved safely without modifying the live website.",
  };
}

// ---------------------------------------------------------------------------
// 4. Treatment Page (`medical_subsections`) Approval Workflow Adapter
// ---------------------------------------------------------------------------

export interface StagedTreatmentPayload {
  subsectionId: string;
  name: string;
  description: string;
  metaDescription: string;
  heroImageUrl: string;
  blocks: TreatmentSectionBlock[];
  compiledHtml: string;
}

export function loadStagedTreatment(slug: string): StagedEnvelope<StagedTreatmentPayload> | null {
  return readStaged<StagedEnvelope<StagedTreatmentPayload>>(`treatment:${slug}`);
}

export async function transitionTreatmentWorkflow(params: {
  slug: string;
  payload: StagedTreatmentPayload;
  targetStatus: WorkflowStatus;
  actorEmail: string;
  actorRole: string;
  canPublish: boolean;
  feedback?: string;
}): Promise<CmsOperationResult> {
  const { slug, payload, targetStatus, actorEmail, actorRole, canPublish, feedback } = params;
  const existing = loadStagedTreatment(slug);
  const prevStatus: WorkflowStatus = existing?.workflowStatus ?? "published";

  if ((targetStatus === "approved" || targetStatus === "published") && !canPublish) {
    return {
      ok: false,
      persistedToDatabase: false,
      workflowStatus: prevStatus,
      message: "Editors cannot directly publish treatment pages. Submit the draft for Super Admin review.",
    };
  }

  const compiledHtml = payload.blocks.length > 0
    ? compileTreatmentBlocksToHtml(payload.blocks)
    : payload.compiledHtml;

  const fullPayload: StagedTreatmentPayload = { ...payload, compiledHtml };

  const newEntry: ApprovalHistoryEntry = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    entityType: "medical_subsection",
    entityId: slug,
    fromStatus: prevStatus,
    toStatus: targetStatus,
    actorEmail,
    actorRole,
    feedback: feedback ?? null,
    createdAt: new Date().toISOString(),
  };

  const nextEnvelope: StagedEnvelope<StagedTreatmentPayload> = {
    draft: fullPayload,
    workflowStatus: targetStatus,
    reviewFeedback: targetStatus === "rejected" ? (feedback ?? null) : existing?.reviewFeedback ?? null,
    reviewedByEmail:
      targetStatus === "approved" || targetStatus === "rejected" || targetStatus === "published"
        ? actorEmail
        : existing?.reviewedByEmail ?? null,
    reviewedAt:
      targetStatus === "approved" || targetStatus === "rejected" || targetStatus === "published"
        ? new Date().toISOString()
        : existing?.reviewedAt ?? null,
    history: [newEntry, ...(existing?.history ?? [])],
  };

  writeStaged(`treatment:${slug}`, nextEnvelope);

  // If Super Admin publishes, update live `medical_subsections` columns
  if (targetStatus === "published" && canPublish && payload.subsectionId) {
    const { error } = await supabase
      .from("medical_subsections")
      .update({
        name: fullPayload.name,
        description: fullPayload.description,
        meta_description: fullPayload.metaDescription,
        content: fullPayload.compiledHtml,
        updated_at: new Date().toISOString(),
      })
      .eq("id", payload.subsectionId);

    if (error) {
      return {
        ok: false,
        persistedToDatabase: false,
        workflowStatus: prevStatus,
        message: error.message,
      };
    }

    return {
      ok: true,
      persistedToDatabase: true,
      workflowStatus: "published",
      message: `Published "${fullPayload.name}" to the live website.`,
    };
  }

  return {
    ok: true,
    persistedToDatabase: false,
    workflowStatus: targetStatus,
    message:
      targetStatus === "pending_approval"
        ? `Submitted "${fullPayload.name}" for Super Admin review.`
        : targetStatus === "approved"
          ? `Approved "${fullPayload.name}". Ready to publish.`
          : targetStatus === "rejected"
            ? `Rejected "${fullPayload.name}" with feedback.`
            : `Saved draft for "${fullPayload.name}".`,
  };
}

// ---------------------------------------------------------------------------
// 5. Media Library Adapter (`media_assets` + `cms-media` Storage Bucket)
// ---------------------------------------------------------------------------

export async function listMediaAssets(): Promise<{ assets: MediaAsset[]; schemaReady: boolean }> {
  const stagedUploads = readStaged<MediaAsset[]>("media:uploads") ?? [];
  try {
    const { data, error } = await (supabase as unknown as {
      from: (t: string) => {
        select: (cols: string) => {
          order: (col: string, opts: { ascending: boolean }) => Promise<{
            data: Record<string, unknown>[] | null;
            error: { code?: string; message?: string } | null;
          }>;
        };
      };
    })
      .from("media_assets")
      .select("*")
      .order("created_at", { ascending: false });

    if (error && isMissingSchemaError(error)) {
      return { assets: [...stagedUploads, ...BUILTIN_STATIC_MEDIA], schemaReady: false };
    }

    const dbAssets: MediaAsset[] = (data ?? []).map((row) => ({
      id: String(row.id),
      fileName: String(row.file_name),
      storagePath: String(row.storage_path),
      publicUrl: String(row.public_url),
      mediaType: (row.media_type as "image" | "video") || "image",
      mimeType: String(row.mime_type || "image/jpeg"),
      sizeBytes: Number(row.size_bytes || 0),
      altText: String(row.alt_text || ""),
      caption: String(row.caption || ""),
      category: (row.category as MediaCategory) || "general",
      createdAt: String(row.created_at || new Date().toISOString()),
    }));

    return { assets: [...dbAssets, ...stagedUploads, ...BUILTIN_STATIC_MEDIA], schemaReady: true };
  } catch {
    return { assets: [...stagedUploads, ...BUILTIN_STATIC_MEDIA], schemaReady: false };
  }
}

export async function uploadMediaAsset(params: {
  file: File;
  altText: string;
  caption: string;
  category: MediaCategory;
}): Promise<{ ok: boolean; asset?: MediaAsset; error?: string; persistedToDatabase: boolean }> {
  const { file, altText, caption, category } = params;
  const check = validateMediaFile(file);
  if (!check.valid || !check.mediaType) {
    return { ok: false, error: check.error, persistedToDatabase: false };
  }

  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "-");
  const storagePath = `${category}/${Date.now()}-${safeName}`;

  try {
    const { error: uploadError } = await supabase.storage.from("cms-media").upload(storagePath, file, {
      cacheControl: "3600",
      upsert: false,
    });

    if (uploadError) {
      // Bucket not yet created (Migration 004 pending) -> stage object URL in session for UI testing
      const previewUrl = typeof URL !== "undefined" && URL.createObjectURL ? URL.createObjectURL(file) : `/uploads/${safeName}`;
      const stagedAsset: MediaAsset = {
        id: `staged-${Date.now()}`,
        fileName: file.name,
        storagePath,
        publicUrl: previewUrl,
        mediaType: check.mediaType,
        mimeType: file.type,
        sizeBytes: file.size,
        altText: altText.trim() || file.name,
        caption: caption.trim(),
        category,
        createdAt: new Date().toISOString(),
      };
      const existing = readStaged<MediaAsset[]>("media:uploads") ?? [];
      writeStaged("media:uploads", [stagedAsset, ...existing]);
      return { ok: true, asset: stagedAsset, persistedToDatabase: false };
    }

    const { data: pub } = supabase.storage.from("cms-media").getPublicUrl(storagePath);
    const publicUrl = pub.publicUrl;

    const newAsset: MediaAsset = {
      id: `db-${Date.now()}`,
      fileName: file.name,
      storagePath,
      publicUrl,
      mediaType: check.mediaType,
      mimeType: file.type,
      sizeBytes: file.size,
      altText: altText.trim() || file.name,
      caption: caption.trim(),
      category,
      createdAt: new Date().toISOString(),
    };

    await (supabase as unknown as {
      from: (t: string) => {
        insert: (row: Record<string, unknown>) => Promise<unknown>;
      };
    })
      .from("media_assets")
      .insert({
        file_name: newAsset.fileName,
        storage_path: newAsset.storagePath,
        public_url: newAsset.publicUrl,
        media_type: newAsset.mediaType,
        mime_type: newAsset.mimeType,
        size_bytes: newAsset.sizeBytes,
        alt_text: newAsset.altText,
        caption: newAsset.caption,
        category: newAsset.category,
      });

    return { ok: true, asset: newAsset, persistedToDatabase: true };
  } catch {
    const previewUrl = typeof URL !== "undefined" && URL.createObjectURL ? URL.createObjectURL(file) : `/uploads/${safeName}`;
    const stagedAsset: MediaAsset = {
      id: `staged-${Date.now()}`,
      fileName: file.name,
      storagePath,
      publicUrl: previewUrl,
      mediaType: check.mediaType,
      mimeType: file.type,
      sizeBytes: file.size,
      altText: altText.trim() || file.name,
      caption: caption.trim(),
      category,
      createdAt: new Date().toISOString(),
    };
    const existing = readStaged<MediaAsset[]>("media:uploads") ?? [];
    writeStaged("media:uploads", [stagedAsset, ...existing]);
    return { ok: true, asset: stagedAsset, persistedToDatabase: false };
  }
}

export async function deleteMediaAsset(params: {
  asset: MediaAsset;
  canDelete: boolean;
}): Promise<{ ok: boolean; error?: string }> {
  const { asset, canDelete } = params;
  if (!canDelete) {
    return { ok: false, error: "Only a Super Admin is permitted to delete media files." };
  }
  if (asset.id.startsWith("static-")) {
    return { ok: false, error: "Built-in theme assets cannot be deleted." };
  }
  const existing = readStaged<MediaAsset[]>("media:uploads") ?? [];
  writeStaged(
    "media:uploads",
    existing.filter((a) => a.id !== asset.id),
  );
  return { ok: true };
}

// ---------------------------------------------------------------------------
// 6. Iteration 4: Per-Route SEO Metadata Adapter (`cms_seo_metadata`)
// ---------------------------------------------------------------------------

export function loadStagedSeo(routePath: string): StagedEnvelope<RouteSeoMetadata> | null {
  return readStaged<StagedEnvelope<RouteSeoMetadata>>(`seo:${routePath}`);
}

export async function loadRouteSeoCatalog(): Promise<{
  routes: RouteSeoMetadata[];
  schemaReady: boolean;
}> {
  try {
    const { data, error } = await (supabase as unknown as {
      from: (t: string) => {
        select: (cols: string) => Promise<{
          data: Record<string, unknown>[] | null;
          error: { code?: string; message?: string } | null;
        }>;
      };
    })
      .from("cms_seo_metadata")
      .select(
        "id, route_path, page_label, seo_title, seo_description, seo_keywords, og_image_url, canonical_url, noindex, published_at, updated_at",
      );

    if (error && isMissingSchemaError(error)) {
      return { routes: DEFAULT_ROUTE_SEO_CATALOG, schemaReady: false };
    }

    if (!data || data.length === 0) {
      return { routes: DEFAULT_ROUTE_SEO_CATALOG, schemaReady: true };
    }

    const dbMap = new Map(data.map((r) => [String(r.route_path), r]));
    const merged = DEFAULT_ROUTE_SEO_CATALOG.map((def) => {
      const row = dbMap.get(def.routePath);
      if (!row) return def;
      return {
        routePath: def.routePath,
        pageLabel: String(row.page_label || def.pageLabel),
        seoTitle: String(row.seo_title || def.seoTitle),
        seoDescription: String(row.seo_description || def.seoDescription),
        seoKeywords: String(row.seo_keywords || def.seoKeywords),
        ogImageUrl: String(row.og_image_url || def.ogImageUrl),
        canonicalUrl: String(row.canonical_url || def.canonicalUrl),
        noindex: Boolean(row.noindex ?? def.noindex),
      };
    });

    return { routes: merged, schemaReady: true };
  } catch {
    return { routes: DEFAULT_ROUTE_SEO_CATALOG, schemaReady: false };
  }
}

export async function transitionSeoWorkflow(params: {
  seo: RouteSeoMetadata;
  targetStatus: WorkflowStatus;
  actorEmail: string;
  actorRole: string;
  canPublish: boolean;
  feedback?: string;
}): Promise<CmsOperationResult> {
  const { seo, targetStatus, actorEmail, actorRole, canPublish, feedback } = params;
  const existing = loadStagedSeo(seo.routePath);
  const prevStatus: WorkflowStatus = existing?.workflowStatus ?? "published";

  if ((targetStatus === "approved" || targetStatus === "published") && !canPublish) {
    return {
      ok: false,
      persistedToDatabase: false,
      workflowStatus: prevStatus,
      message: "Editors cannot directly publish SEO metadata. Submit the draft for Super Admin review.",
    };
  }

  const newEntry: ApprovalHistoryEntry = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    entityType: "cms_seo_metadata",
    entityId: seo.routePath,
    fromStatus: prevStatus,
    toStatus: targetStatus,
    actorEmail,
    actorRole,
    feedback: feedback ?? null,
    createdAt: new Date().toISOString(),
  };

  const nextEnvelope: StagedEnvelope<RouteSeoMetadata> = {
    draft: seo,
    workflowStatus: targetStatus,
    reviewFeedback: targetStatus === "rejected" ? (feedback ?? null) : existing?.reviewFeedback ?? null,
    reviewedByEmail:
      targetStatus === "approved" || targetStatus === "rejected" || targetStatus === "published"
        ? actorEmail
        : existing?.reviewedByEmail ?? null,
    reviewedAt:
      targetStatus === "approved" || targetStatus === "rejected" || targetStatus === "published"
        ? new Date().toISOString()
        : existing?.reviewedAt ?? null,
    history: [newEntry, ...(existing?.history ?? [])],
  };

  writeStaged(`seo:${seo.routePath}`, nextEnvelope);

  try {
    const payload: Record<string, unknown> = {
      route_path: seo.routePath,
      page_label: seo.pageLabel,
      workflow_status: targetStatus,
      draft_seo_title: seo.seoTitle,
      draft_seo_description: seo.seoDescription,
      draft_seo_keywords: seo.seoKeywords,
      draft_og_image_url: seo.ogImageUrl,
      draft_canonical_url: seo.canonicalUrl,
      draft_noindex: seo.noindex,
      review_feedback: targetStatus === "rejected" ? (feedback ?? null) : null,
    };

    if (targetStatus === "published" && canPublish) {
      payload.seo_title = seo.seoTitle;
      payload.seo_description = seo.seoDescription;
      payload.seo_keywords = seo.seoKeywords;
      payload.og_image_url = seo.ogImageUrl;
      payload.canonical_url = seo.canonicalUrl;
      payload.noindex = seo.noindex;
      payload.published_at = new Date().toISOString();
    }

    const { error } = await (supabase as unknown as {
      from: (t: string) => {
        upsert: (row: Record<string, unknown>, opts: { onConflict: string }) => Promise<{
          error: { code?: string; message?: string } | null;
        }>;
      };
    })
      .from("cms_seo_metadata")
      .upsert(payload, { onConflict: "route_path" });

    if (error && isMissingSchemaError(error)) {
      return {
        ok: true,
        persistedToDatabase: false,
        workflowStatus: targetStatus,
        message: `Saved SEO "${targetStatus}" state in session preview (waiting for Migration 005 to persist to cms_seo_metadata).`,
      };
    }

    if (error) {
      return {
        ok: false,
        persistedToDatabase: false,
        workflowStatus: prevStatus,
        message: error.message ?? "Failed to update SEO metadata.",
      };
    }

    return {
      ok: true,
      persistedToDatabase: true,
      workflowStatus: targetStatus,
      message:
        targetStatus === "published"
          ? `Published SEO metadata for "${seo.pageLabel}".`
          : targetStatus === "pending_approval"
            ? `Submitted SEO metadata for "${seo.pageLabel}" for Super Admin review.`
            : targetStatus === "approved"
              ? `Approved SEO metadata for "${seo.pageLabel}".`
              : targetStatus === "rejected"
                ? `Rejected SEO metadata for "${seo.pageLabel}" with feedback.`
                : `Saved SEO draft for "${seo.pageLabel}".`,
    };
  } catch {
    return {
      ok: true,
      persistedToDatabase: false,
      workflowStatus: targetStatus,
      message: `Saved SEO "${targetStatus}" state in session preview (waiting for Migration 005).`,
    };
  }
}

// ---------------------------------------------------------------------------
// 7. Iteration 4: Read-Only Activity Log Adapter (`public.activity_logs`)
//    NEVER fabricates mock rows — reports schema status honestly.
// ---------------------------------------------------------------------------

export interface ActivityLogRow {
  id: string;
  actorEmail: string;
  action: string;
  entityType: string;
  entityId: string;
  details: Record<string, unknown>;
  createdAt: string;
}

export async function fetchActivityLogs(limit = 50): Promise<{
  logs: ActivityLogRow[];
  schemaReady: boolean;
  error?: string;
}> {
  try {
    const { data, error } = await (supabase as unknown as {
      from: (t: string) => {
        select: (cols: string) => {
          order: (col: string, opts: { ascending: boolean }) => {
            limit: (n: number) => Promise<{
              data: Record<string, unknown>[] | null;
              error: { code?: string; message?: string } | null;
            }>;
          };
        };
      };
    })
      .from("activity_logs")
      .select("id, actor_email, action, entity_type, entity_id, details, created_at")
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) {
      if (isMissingSchemaError(error)) {
        return { logs: [], schemaReady: false };
      }
      return { logs: [], schemaReady: true, error: error.message ?? "Could not load activity logs." };
    }

    const logs: ActivityLogRow[] = (data ?? []).map((r) => ({
      id: String(r.id),
      actorEmail: String(r.actor_email ?? "system"),
      action: String(r.action ?? ""),
      entityType: String(r.entity_type ?? ""),
      entityId: String(r.entity_id ?? ""),
      details: (r.details as Record<string, unknown>) ?? {},
      createdAt: String(r.created_at ?? ""),
    }));

    return { logs, schemaReady: true };
  } catch (err) {
    return {
      logs: [],
      schemaReady: false,
      error: err instanceof Error ? err.message : undefined,
    };
  }
}

// ---------------------------------------------------------------------------
// 8. Iteration 4: Super Admin User Management Adapter (`admin-users` Edge Function)
//    NEVER assigns roles client-side; all writes go through `supabase.functions.invoke('admin-users')`.
// ---------------------------------------------------------------------------

export interface CmsManagedUser {
  userId: string;
  email: string;
  displayName: string;
  role: "super_admin" | "editor";
  isActive: boolean;
  createdAt: string;
}

export async function invokeAdminUsers<T = Record<string, unknown>>(
  payload: Record<string, unknown>,
): Promise<{ ok: boolean; data?: T; edgeFunctionReady: boolean; error?: string }> {
  try {
    const { data, error } = await supabase.functions.invoke("admin-users", {
      body: payload,
    });

    if (error) {
      const msg = String(error.message ?? error);
      const notDeployed =
        msg.toLowerCase().includes("failed to send a request") ||
        msg.toLowerCase().includes("function not found") ||
        msg.toLowerCase().includes("404") ||
        msg.toLowerCase().includes("fetch");

      return {
        ok: false,
        edgeFunctionReady: !notDeployed,
        error: notDeployed
          ? "The server-side 'admin-users' Edge Function and Migration 002 are not deployed to staging yet."
          : msg,
      };
    }

    if (data && typeof data === "object" && "error" in data && (data as { error?: string }).error) {
      return {
        ok: false,
        edgeFunctionReady: true,
        error: String((data as { error: string }).error),
      };
    }

    return { ok: true, data: data as T, edgeFunctionReady: true };
  } catch (err) {
    return {
      ok: false,
      edgeFunctionReady: false,
      error:
        err instanceof Error
          ? err.message
          : "The server-side 'admin-users' Edge Function is awaiting staging deployment.",
    };
  }
}
