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
  DEFAULT_SITE_PAGES_CONTENT,
  mergeHomeContent,
  mergeSitePageContent,
  type ApprovalHistoryEntry,
  type HomePageContent,
  type MediaAsset,
  type MediaCategory,
  type RouteSeoMetadata,
  type SitePageContent,
  type SitePageSlug,
  type TreatmentSectionBlock,
  type WorkflowStatus,
  compileTreatmentBlocksToHtml,
  MEDIA_ALLOWED_DESCRIPTION,
  validateMediaFile,
} from "@/lib/cms/types";
import {
  SITE_CONFIG_SCOPE_LABELS,
  pickScopeConfig,
  validateScopeDraft,
  type SiteConfigScope,
} from "@/lib/cms/siteConfigScopes";
import {
  COLLECTION_DEFINITIONS,
  applyChangeset,
  normalizeChangeset,
  validateChangeset,
  type CollectionChangeset,
  type CollectionKey,
  type CollectionRow,
} from "@/lib/cms/collections";
export type { CollectionKey } from "@/lib/cms/collections";

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
  {
    id: "static-rotator-cuff",
    fileName: "rotator-cuff-tear.png",
    storagePath: "static/images/rotator-cuff-tear.png",
    publicUrl: "/images/rotator-cuff-tear.png",
    mediaType: "image",
    mimeType: "image/png",
    sizeBytes: 112000,
    altText: "Rotator Cuff Tear Anatomy & Repair",
    caption: "Rotator cuff tear medical illustration",
    category: "treatments",
    createdAt: "2026-04-02T00:00:00.000Z",
  },
  {
    id: "static-frozen-shoulder",
    fileName: "frozen-shoulder.png",
    storagePath: "static/images/frozen-shoulder.png",
    publicUrl: "/images/frozen-shoulder.png",
    mediaType: "image",
    mimeType: "image/png",
    sizeBytes: 98000,
    altText: "Frozen Shoulder (Adhesive Capsulitis)",
    caption: "Frozen shoulder joint capsule illustration",
    category: "treatments",
    createdAt: "2026-04-02T00:00:00.000Z",
  },
  {
    id: "static-shoulder-dislocation",
    fileName: "shoulder-dislocation.png",
    storagePath: "static/images/shoulder-dislocation.png",
    publicUrl: "/images/shoulder-dislocation.png",
    mediaType: "image",
    mimeType: "image/png",
    sizeBytes: 105000,
    altText: "Shoulder Dislocation & Instability",
    caption: "Shoulder dislocation medical illustration",
    category: "treatments",
    createdAt: "2026-04-02T00:00:00.000Z",
  },
  {
    id: "static-tennis-elbow",
    fileName: "tennis-elbow.png",
    storagePath: "static/images/tennis-elbow.png",
    publicUrl: "/images/tennis-elbow.png",
    mediaType: "image",
    mimeType: "image/png",
    sizeBytes: 89000,
    altText: "Tennis Elbow (Lateral Epicondylitis)",
    caption: "Tennis elbow tendon inflammation diagram",
    category: "treatments",
    createdAt: "2026-04-02T00:00:00.000Z",
  },
  {
    id: "static-eswt-therapy",
    fileName: "eswt-therapy.png",
    storagePath: "static/images/eswt-therapy.png",
    publicUrl: "/images/eswt-therapy.png",
    mediaType: "image",
    mimeType: "image/png",
    sizeBytes: 94000,
    altText: "Extracorporeal Shock Wave Therapy (ESWT)",
    caption: "Shockwave therapy physiotherapy illustration",
    category: "treatments",
    createdAt: "2026-04-02T00:00:00.000Z",
  },
  {
    id: "static-post-op-rehab",
    fileName: "post-op-knee-rehab.png",
    storagePath: "static/images/post-op-knee-rehab.png",
    publicUrl: "/images/post-op-knee-rehab.png",
    mediaType: "image",
    mimeType: "image/png",
    sizeBytes: 118000,
    altText: "Post-Operative Knee Rehabilitation",
    caption: "Guided post-operative knee rehabilitation session",
    category: "treatments",
    createdAt: "2026-04-02T00:00:00.000Z",
  },
  // Real static treatment illustrations present on disk in public/images/treatments/
  {
    id: "static-knee-process",
    fileName: "total-knee-replacement-process.jpg",
    storagePath: "static/images/treatments/total-knee-replacement-process.jpg",
    publicUrl: "/images/treatments/total-knee-replacement-process.jpg",
    mediaType: "image",
    mimeType: "image/jpeg",
    sizeBytes: 95000,
    altText: "Process of Total Knee Replacement Surgery",
    caption: "6-step surgical workflow for total knee replacement",
    category: "treatments",
    createdAt: "2026-04-13T00:00:00.000Z",
  },
  {
    id: "static-acl-anatomy",
    fileName: "acl-tear-anatomy.jpg",
    storagePath: "static/images/treatments/acl/acl-tear-anatomy.jpg",
    publicUrl: "/images/treatments/acl/acl-tear-anatomy.jpg",
    mediaType: "image",
    mimeType: "image/jpeg",
    sizeBytes: 88000,
    altText: "ACL Tear Anatomy - Anterior Cruciate Ligament in Knee Joint",
    caption: "Knee anatomy showing anterior cruciate ligament tear",
    category: "treatments",
    createdAt: "2026-04-15T00:00:00.000Z",
  },
  {
    id: "static-acl-diagram",
    fileName: "acl-injury-diagram.jpg",
    storagePath: "static/images/treatments/acl/acl-injury-diagram.jpg",
    publicUrl: "/images/treatments/acl/acl-injury-diagram.jpg",
    mediaType: "image",
    mimeType: "image/jpeg",
    sizeBytes: 91000,
    altText: "ACL Injury Diagram - Detailed View of Ligament Location",
    caption: "Detailed anatomical view of ACL location and injury",
    category: "treatments",
    createdAt: "2026-04-15T00:00:00.000Z",
  },
  {
    id: "static-acl-mechanism",
    fileName: "acl-injury-mechanism.jpg",
    storagePath: "static/images/treatments/acl/acl-injury-mechanism.jpg",
    publicUrl: "/images/treatments/acl/acl-injury-mechanism.jpg",
    mediaType: "image",
    mimeType: "image/jpeg",
    sizeBytes: 94000,
    altText: "Mechanism of ACL Injury - Femoral Adduction & Dynamic Valgus",
    caption: "Biomechanics of sports knee injury causing ACL tear",
    category: "treatments",
    createdAt: "2026-04-15T00:00:00.000Z",
  },
  {
    id: "static-acl-comparison",
    fileName: "acl-torn-vs-reconstructed.jpg",
    storagePath: "static/images/treatments/acl/acl-torn-vs-reconstructed.jpg",
    publicUrl: "/images/treatments/acl/acl-torn-vs-reconstructed.jpg",
    mediaType: "image",
    mimeType: "image/jpeg",
    sizeBytes: 89000,
    altText: "Torn ACL vs Reconstructed ACL - Before & After",
    caption: "Comparison showing torn ligament and reconstructed graft",
    category: "treatments",
    createdAt: "2026-04-15T00:00:00.000Z",
  },
  {
    id: "static-acl-arthroscopy",
    fileName: "acl-arthroscopic-surgery.jpg",
    storagePath: "static/images/treatments/acl/acl-arthroscopic-surgery.jpg",
    publicUrl: "/images/treatments/acl/acl-arthroscopic-surgery.jpg",
    mediaType: "image",
    mimeType: "image/jpeg",
    sizeBytes: 92000,
    altText: "Arthroscopic ACL Surgery - Camera and Surgical Instruments",
    caption: "Minimally invasive arthroscopic ACL reconstruction setup",
    category: "treatments",
    createdAt: "2026-04-15T00:00:00.000Z",
  },
  {
    id: "static-acl-steps",
    fileName: "acl-reconstruction-steps.jpg",
    storagePath: "static/images/treatments/acl/acl-reconstruction-steps.jpg",
    publicUrl: "/images/treatments/acl/acl-reconstruction-steps.jpg",
    mediaType: "image",
    mimeType: "image/jpeg",
    sizeBytes: 96000,
    altText: "ACL Reconstruction Surgery Steps - 6-Step Procedure",
    caption: "Step-by-step graft harvesting, tunneling, and fixation",
    category: "treatments",
    createdAt: "2026-04-15T00:00:00.000Z",
  },
  {
    id: "static-hip-anatomy",
    fileName: "hip-joint-anatomy.jpg",
    storagePath: "static/images/treatments/hip/hip-joint-anatomy.jpg",
    publicUrl: "/images/treatments/hip/hip-joint-anatomy.jpg",
    mediaType: "image",
    mimeType: "image/jpeg",
    sizeBytes: 87000,
    altText: "Hip Joint Anatomy - Acetabulum, Femoral Head, and Joint Capsule",
    caption: "Healthy ball-and-socket hip joint anatomy",
    category: "treatments",
    createdAt: "2026-04-15T00:00:00.000Z",
  },
  {
    id: "static-hip-osteoarthritis",
    fileName: "hip-osteoarthritis.jpg",
    storagePath: "static/images/treatments/hip/hip-osteoarthritis.jpg",
    publicUrl: "/images/treatments/hip/hip-osteoarthritis.jpg",
    mediaType: "image",
    mimeType: "image/jpeg",
    sizeBytes: 89000,
    altText: "Healthy Hip vs Hip with Osteoarthritis",
    caption: "Progression of hip cartilage loss and bone spur formation",
    category: "treatments",
    createdAt: "2026-04-15T00:00:00.000Z",
  },
  {
    id: "static-hip-damage",
    fileName: "hip-arthritis-damage.jpg",
    storagePath: "static/images/treatments/hip/hip-arthritis-damage.jpg",
    publicUrl: "/images/treatments/hip/hip-arthritis-damage.jpg",
    mediaType: "image",
    mimeType: "image/jpeg",
    sizeBytes: 91000,
    altText: "Hip Arthritis Damage - Destroyed Cartilage & Joint Space",
    caption: "Severe hip arthritis requiring total hip replacement",
    category: "treatments",
    createdAt: "2026-04-15T00:00:00.000Z",
  },
  {
    id: "static-hip-before-after",
    fileName: "hip-replacement-before-after.jpg",
    storagePath: "static/images/treatments/hip/hip-replacement-before-after.jpg",
    publicUrl: "/images/treatments/hip/hip-replacement-before-after.jpg",
    mediaType: "image",
    mimeType: "image/jpeg",
    sizeBytes: 94000,
    altText: "Hip Replacement Before & After X-rays",
    caption: "Post-operative X-ray demonstrating correct implant alignment",
    category: "treatments",
    createdAt: "2026-04-15T00:00:00.000Z",
  },
  {
    id: "static-hip-components",
    fileName: "hip-replacement-components.jpg",
    storagePath: "static/images/treatments/hip/hip-replacement-components.jpg",
    publicUrl: "/images/treatments/hip/hip-replacement-components.jpg",
    mediaType: "image",
    mimeType: "image/jpeg",
    sizeBytes: 93000,
    altText: "Hip Replacement Implant Components",
    caption: "Acetabular cup, polyethylene liner, ceramic head, and femoral stem",
    category: "treatments",
    createdAt: "2026-04-15T00:00:00.000Z",
  },
  {
    id: "static-hip-procedure",
    fileName: "hip-replacement-procedure.jpg",
    storagePath: "static/images/treatments/hip/hip-replacement-procedure.jpg",
    publicUrl: "/images/treatments/hip/hip-replacement-procedure.jpg",
    mediaType: "image",
    mimeType: "image/jpeg",
    sizeBytes: 95000,
    altText: "Hip Replacement Procedure Overview",
    caption: "Minimally invasive hip replacement surgical technique",
    category: "treatments",
    createdAt: "2026-04-15T00:00:00.000Z",
  },
  {
    id: "static-rc-anatomy",
    fileName: "rotator-cuff-anatomy.jpg",
    storagePath: "static/images/treatments/rotator-cuff/rotator-cuff-anatomy.jpg",
    publicUrl: "/images/treatments/rotator-cuff/rotator-cuff-anatomy.jpg",
    mediaType: "image",
    mimeType: "image/jpeg",
    sizeBytes: 88000,
    altText: "Rotator Cuff Tear Anatomy - Supraspinatus and Subscapularis",
    caption: "Detailed shoulder rotator cuff tendon and muscle anatomy",
    category: "treatments",
    createdAt: "2026-04-15T00:00:00.000Z",
  },
  {
    id: "static-rc-types",
    fileName: "rotator-cuff-tear-types.jpg",
    storagePath: "static/images/treatments/rotator-cuff/rotator-cuff-tear-types.jpg",
    publicUrl: "/images/treatments/rotator-cuff/rotator-cuff-tear-types.jpg",
    mediaType: "image",
    mimeType: "image/jpeg",
    sizeBytes: 89000,
    altText: "Types of Rotator Cuff Tears - Partial vs Full Thickness",
    caption: "Articular, bursal, and intrasubstance rotator cuff tear classifications",
    category: "treatments",
    createdAt: "2026-04-15T00:00:00.000Z",
  },
  {
    id: "static-rc-torn",
    fileName: "torn-rotator-cuff.jpg",
    storagePath: "static/images/treatments/rotator-cuff/torn-rotator-cuff.jpg",
    publicUrl: "/images/treatments/rotator-cuff/torn-rotator-cuff.jpg",
    mediaType: "image",
    mimeType: "image/jpeg",
    sizeBytes: 90000,
    altText: "Torn Rotator Cuff Tendon Fibre Orientation",
    caption: "Supraspinatus and infraspinatus tear visualization",
    category: "treatments",
    createdAt: "2026-04-15T00:00:00.000Z",
  },
  {
    id: "static-rc-arthroscopy",
    fileName: "arthroscopic-surgery.jpg",
    storagePath: "static/images/treatments/rotator-cuff/arthroscopic-surgery.jpg",
    publicUrl: "/images/treatments/rotator-cuff/arthroscopic-surgery.jpg",
    mediaType: "image",
    mimeType: "image/jpeg",
    sizeBytes: 92000,
    altText: "Minimally Invasive Shoulder Arthroscopy",
    caption: "Arthroscope camera and surgical instruments inside shoulder joint",
    category: "treatments",
    createdAt: "2026-04-15T00:00:00.000Z",
  },
  {
    id: "static-rc-repair",
    fileName: "repair-procedure.jpg",
    storagePath: "static/images/treatments/rotator-cuff/repair-procedure.jpg",
    publicUrl: "/images/treatments/rotator-cuff/repair-procedure.jpg",
    mediaType: "image",
    mimeType: "image/jpeg",
    sizeBytes: 94000,
    altText: "Rotator Cuff Repair Procedure - Anchor Insertion",
    caption: "Double-row suture anchor repair technique",
    category: "treatments",
    createdAt: "2026-04-15T00:00:00.000Z",
  },
  {
    id: "static-rc-before-after",
    fileName: "before-after-repair.jpg",
    storagePath: "static/images/treatments/rotator-cuff/before-after-repair.jpg",
    publicUrl: "/images/treatments/rotator-cuff/before-after-repair.jpg",
    mediaType: "image",
    mimeType: "image/jpeg",
    sizeBytes: 93000,
    altText: "Fully Torn Rotator Cuff Repair - Before & After",
    caption: "Restoration of tendon-to-bone footprint following arthroscopic repair",
    category: "treatments",
    createdAt: "2026-04-15T00:00:00.000Z",
  },
  {
    id: "static-bankart-lesion",
    fileName: "bankart-lesion.jpg",
    storagePath: "static/images/treatments/shoulder-dislocation/bankart-lesion.jpg",
    publicUrl: "/images/treatments/shoulder-dislocation/bankart-lesion.jpg",
    mediaType: "image",
    mimeType: "image/jpeg",
    sizeBytes: 86000,
    altText: "Bankart Lesion - Anterior Glenoid Labrum Tear",
    caption: "Surgical repair of anterior shoulder labral detachment",
    category: "treatments",
    createdAt: "2026-04-16T00:00:00.000Z",
  },
  {
    id: "static-latarjet",
    fileName: "latarjet-procedure.jpg",
    storagePath: "static/images/treatments/shoulder-dislocation/latarjet-procedure.jpg",
    publicUrl: "/images/treatments/shoulder-dislocation/latarjet-procedure.jpg",
    mediaType: "image",
    mimeType: "image/jpeg",
    sizeBytes: 89000,
    altText: "Latarjet Procedure - Bone Block Transfer for Shoulder Instability",
    caption: "Coracoid bone transfer technique for recurrent shoulder dislocation",
    category: "treatments",
    createdAt: "2026-04-16T00:00:00.000Z",
  },
  {
    id: "static-shoulder-anatomy-disloc",
    fileName: "shoulder-anatomy.jpg",
    storagePath: "static/images/treatments/shoulder-dislocation/shoulder-anatomy.jpg",
    publicUrl: "/images/treatments/shoulder-dislocation/shoulder-anatomy.jpg",
    mediaType: "image",
    mimeType: "image/jpeg",
    sizeBytes: 87000,
    altText: "Shoulder Anatomy - Normal vs Dislocated Joint",
    caption: "Normal glenohumeral alignment versus anterior/posterior dislocation",
    category: "treatments",
    createdAt: "2026-04-16T00:00:00.000Z",
  },
  {
    id: "static-shoulder-impingement",
    fileName: "shoulder-impingement-syndrome.jpg",
    storagePath: "static/images/treatments/shoulder-impingement/shoulder-impingement-syndrome.jpg",
    publicUrl: "/images/treatments/shoulder-impingement/shoulder-impingement-syndrome.jpg",
    mediaType: "image",
    mimeType: "image/jpeg",
    sizeBytes: 90000,
    altText: "Shoulder Impingement Syndrome - Reduced Sub-acromial Space",
    caption: "Subacromial bursa and rotator cuff impingement against the acromion",
    category: "treatments",
    createdAt: "2026-04-16T00:00:00.000Z",
  },
  {
    id: "static-slap-lesion",
    fileName: "slap-tear-anatomy.jpg",
    storagePath: "static/images/treatments/slap-lesion/slap-tear-anatomy.jpg",
    publicUrl: "/images/treatments/slap-lesion/slap-tear-anatomy.jpg",
    mediaType: "image",
    mimeType: "image/jpeg",
    sizeBytes: 88000,
    altText: "SLAP Tear Diagram - Superior Labrum Anterior to Posterior Tear",
    caption: "Biceps anchor and superior labrum detachment in the shoulder joint",
    category: "treatments",
    createdAt: "2026-04-16T00:00:00.000Z",
  },
  {
    id: "static-golfers-anatomy",
    fileName: "golfers-elbow-anatomy.jpg",
    storagePath: "static/images/treatments/golfers-elbow/golfers-elbow-anatomy.jpg",
    publicUrl: "/images/treatments/golfers-elbow/golfers-elbow-anatomy.jpg",
    mediaType: "image",
    mimeType: "image/jpeg",
    sizeBytes: 86000,
    altText: "Medial Epicondylitis (Golfer's Elbow) Anatomy",
    caption: "Medial epicondyle tendon origin and inflammation site",
    category: "treatments",
    createdAt: "2026-04-16T00:00:00.000Z",
  },
  {
    id: "static-golfers-exercises",
    fileName: "golfers-elbow-exercises.jpg",
    storagePath: "static/images/treatments/golfers-elbow/golfers-elbow-exercises.jpg",
    publicUrl: "/images/treatments/golfers-elbow/golfers-elbow-exercises.jpg",
    mediaType: "image",
    mimeType: "image/jpeg",
    sizeBytes: 91000,
    altText: "Golfer's Elbow Rehabilitation Exercises",
    caption: "Wrist flexion, forearm pronation, and eccentric strengthening drills",
    category: "treatments",
    createdAt: "2026-04-16T00:00:00.000Z",
  },
  {
    id: "static-golfers-medial",
    fileName: "medial-epicondylitis-anatomy.jpg",
    storagePath: "static/images/treatments/golfers-elbow/medial-epicondylitis-anatomy.jpg",
    publicUrl: "/images/treatments/golfers-elbow/medial-epicondylitis-anatomy.jpg",
    mediaType: "image",
    mimeType: "image/jpeg",
    sizeBytes: 89000,
    altText: "Medial Epicondyle and Tendon Pain Anatomy",
    caption: "Forearm flexor tendons and nerve pathway at the inner elbow",
    category: "treatments",
    createdAt: "2026-04-16T00:00:00.000Z",
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

export interface LoadedSitePageRecord {
  published: SitePageContent;
  draft: SitePageContent | null;
  workflowStatus: WorkflowStatus;
  reviewFeedback: string | null;
  reviewedByEmail: string | null;
  reviewedAt: string | null;
  history: ApprovalHistoryEntry[];
  schemaReady: boolean;
}

export async function loadSitePageRecord(
  slug: SitePageSlug,
  opts: { includeDraft?: boolean } = {},
): Promise<LoadedSitePageRecord> {
  const { includeDraft = true } = opts;
  const fallback = DEFAULT_SITE_PAGES_CONTENT[slug];
  const staged = includeDraft ? readStaged<StagedEnvelope<SitePageContent>>(`page:${slug}`) : null;
  const selectColumns = includeDraft
    ? "*"
    : "id, slug, title, published_sections, seo_title, seo_description, seo_keywords, og_image_url, published_at, updated_at";

  try {
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
      .eq("slug", slug)
      .maybeSingle();

    if (error && isMissingSchemaError(error)) {
      return {
        published: fallback,
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
        published: fallback,
        draft: staged?.draft ?? null,
        workflowStatus: staged?.workflowStatus ?? "published",
        reviewFeedback: staged?.reviewFeedback ?? null,
        reviewedByEmail: staged?.reviewedByEmail ?? null,
        reviewedAt: staged?.reviewedAt ?? null,
        history: staged?.history ?? [],
        schemaReady: true,
      };
    }

    const published = mergeSitePageContent(slug, data.published_sections as Partial<SitePageContent>);
    const draft =
      includeDraft && data.draft_sections
        ? mergeSitePageContent(slug, data.draft_sections as Partial<SitePageContent>)
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
      published: fallback,
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

export async function transitionSitePageWorkflow(params: {
  slug: SitePageSlug;
  draftContent: SitePageContent;
  targetStatus: WorkflowStatus;
  actorEmail: string;
  actorRole: string;
  canPublish: boolean;
  feedback?: string;
}): Promise<CmsOperationResult> {
  const { slug, draftContent, targetStatus, actorEmail, actorRole, canPublish, feedback } = params;
  const existing = readStaged<StagedEnvelope<SitePageContent>>(`page:${slug}`);
  const prevStatus: WorkflowStatus = existing?.workflowStatus ?? "published";

  if ((targetStatus === "approved" || targetStatus === "published") && !canPublish) {
    return {
      ok: false,
      persistedToDatabase: false,
      message: "Only a Super Admin can approve or publish page changes to the live website.",
      workflowStatus: prevStatus,
    };
  }

  const newEntry: ApprovalHistoryEntry = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    entityType: "cms_page",
    entityId: slug,
    fromStatus: prevStatus,
    toStatus: targetStatus,
    actorEmail,
    actorRole,
    feedback: feedback ?? null,
    createdAt: new Date().toISOString(),
  };

  const nextEnvelope: StagedEnvelope<SitePageContent> = {
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

  writeStaged(`page:${slug}`, nextEnvelope);

  try {
    const payload: Record<string, unknown> = {
      slug,
      title: draftContent.pageTitle || slug,
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
          message: `Saved "${targetStatus}" state for /${slug} in session preview (waiting for Migration 004).`,
        };
      }
      return {
        ok: false,
        persistedToDatabase: false,
        workflowStatus: prevStatus,
        message: error.message ?? "Database update failed.",
      };
    }

    await (supabase.rpc as unknown as (fn: string, args: Record<string, unknown>) => Promise<unknown>)(
      "record_workflow_transition",
      {
        _entity_type: "cms_page",
        _entity_id: slug,
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
          ? `${draftContent.pageTitle} published to the live website.`
          : targetStatus === "pending_approval"
            ? `Submitted ${draftContent.pageTitle} for Super Admin review.`
            : targetStatus === "approved"
              ? `Approved ${draftContent.pageTitle} and ready to publish.`
              : targetStatus === "rejected"
                ? `Rejected ${draftContent.pageTitle} with feedback.`
                : `Draft saved for ${draftContent.pageTitle}.`,
    };
  } catch {
    return {
      ok: true,
      persistedToDatabase: false,
      workflowStatus: targetStatus,
      message: `Saved "${targetStatus}" state for /${slug} in session preview.`,
    };
  }
}

// ---------------------------------------------------------------------------
// 3. SiteConfig (Clinic Information & Doctor Profile) Approval Workflow Adapter
// ---------------------------------------------------------------------------

// (The former sessionStorage-only site_config workflow was removed: it let a Super Admin write
//  site_config.config directly. Use loadSiteConfigDraft / saveSiteConfigDraft / publishSiteConfigDraft.)

// ---------------------------------------------------------------------------
// 3b. Clinic Information — database-backed draft workflow (migration 005c)
//
//     Drafts live in `public.site_config_drafts` (scope = 'clinic') so every CMS user sees the
//     same draft and status. Editors save/submit; the Super Admin approves or rejects; publishing
//     goes through `publish_site_config_draft('clinic')`, which only accepts an approved draft.
//     Nothing in this section writes `site_config.config` directly.
// ---------------------------------------------------------------------------

type DbError = { code?: string; message?: string } | null;
type DbRow = Record<string, unknown>;

interface UntypedQuery extends PromiseLike<{ data: DbRow[] | DbRow | null; error: DbError }> {
  select(columns?: string): UntypedQuery;
  update(values: DbRow): UntypedQuery;
  insert(values: DbRow): UntypedQuery;
  delete(): UntypedQuery;
  eq(column: string, value: string): UntypedQuery;
  order(column: string, opts: { ascending: boolean }): UntypedQuery;
  limit(count: number): UntypedQuery;
  maybeSingle(): PromiseLike<{ data: DbRow | null; error: DbError }>;
  single(): PromiseLike<{ data: DbRow | null; error: DbError }>;
}

interface UntypedClient {
  from(table: string): UntypedQuery;
  rpc(fn: string, args?: DbRow): PromiseLike<{ data: unknown; error: DbError }>;
}

/** Tables/functions added by the proposed migrations are not in the generated Database types. */
const db = supabase as unknown as UntypedClient;

function isMissingFunctionError(err: DbError): boolean {
  if (!err) return false;
  return err.code === "PGRST202" || err.code === "42883" || isMissingSchemaError(err);
}


export interface SiteConfigDraftRecord {
  scope: SiteConfigScope;
  draft: Partial<SiteConfig>;
  workflowStatus: WorkflowStatus;
  reviewFeedback: string | null;
  reviewedAt: string | null;
  reviewedByEmail: string | null;
  submittedAt: string | null;
  publishedAt: string | null;
  history: ApprovalHistoryEntry[];
}
/** @deprecated use SiteConfigDraftRecord */
export type ClinicDraftRecord = SiteConfigDraftRecord;

export interface SiteConfigDraftLoadResult {
  record: SiteConfigDraftRecord | null;
  schemaReady: boolean;
  error?: string;
}
/** @deprecated use SiteConfigDraftLoadResult */
export type ClinicDraftLoadResult = SiteConfigDraftLoadResult;

async function loadApprovalHistory(entityType: ApprovalHistoryEntry["entityType"], entityId: string) {
  try {
    const { data, error } = await db
      .from("approval_history")
      .select("id, from_status, to_status, actor_email, actor_role, feedback, created_at")
      .eq("entity_type", entityType)
      .eq("entity_id", entityId)
      .order("created_at", { ascending: false })
      .limit(25);
    if (error || !Array.isArray(data)) return [];
    return data.map(
      (row): ApprovalHistoryEntry => ({
        id: String(row.id),
        entityType,
        entityId,
        fromStatus: (row.from_status as WorkflowStatus | null) ?? null,
        toStatus: row.to_status as WorkflowStatus,
        actorEmail: String(row.actor_email ?? "unknown"),
        actorRole: String(row.actor_role ?? ""),
        feedback: (row.feedback as string | null) ?? null,
        createdAt: String(row.created_at),
      }),
    );
  } catch {
    return [];
  }
}

async function recordTransition(
  entityType: ApprovalHistoryEntry["entityType"],
  entityId: string,
  fromStatus: WorkflowStatus,
  toStatus: WorkflowStatus,
  feedback: string | null,
): Promise<void> {
  try {
    await db.rpc("record_workflow_transition", {
      _entity_type: entityType,
      _entity_id: entityId,
      _from_status: fromStatus,
      _to_status: toStatus,
      _feedback: feedback,
    });
  } catch {
    // History is informational; the status change itself already succeeded.
  }
}

function schemaMissingMessage(label: string, migration: string) {
  return `${label} drafts need CMS migration ${migration}. Nothing was saved and the live website is unchanged.`;
}

/** Loads the shared draft of one site_config workspace. CMS users only (RLS returns nothing to anyone else). */
export async function loadSiteConfigDraft(scope: SiteConfigScope): Promise<SiteConfigDraftLoadResult> {
  try {
    const { data, error } = await db
      .from("site_config_drafts")
      .select("draft, workflow_status, review_feedback, reviewed_at, submitted_at, published_at")
      .eq("scope", scope)
      .maybeSingle();

    if (error) {
      if (isMissingSchemaError(error)) return { record: null, schemaReady: false };
      return { record: null, schemaReady: true, error: error.message ?? "Could not load the draft." };
    }
    if (!data) {
      return {
        record: null,
        schemaReady: true,
        error: "This draft is not visible to your account. Ask a Super Admin to check your role.",
      };
    }

    const history = await loadApprovalHistory("site_config", scope);
    const lastReview = history.find((h) => h.toStatus === "approved" || h.toStatus === "rejected");
    const rawDraft = data.draft;

    return {
      schemaReady: true,
      record: {
        scope,
        draft: pickScopeConfig(
          scope,
          rawDraft && typeof rawDraft === "object" && !Array.isArray(rawDraft) ? (rawDraft as Partial<SiteConfig>) : {},
        ),
        workflowStatus: (data.workflow_status as WorkflowStatus) ?? "published",
        reviewFeedback: (data.review_feedback as string | null) ?? null,
        reviewedAt: (data.reviewed_at as string | null) ?? null,
        reviewedByEmail: lastReview?.actorEmail ?? null,
        submittedAt: (data.submitted_at as string | null) ?? null,
        publishedAt: (data.published_at as string | null) ?? null,
        history,
      },
    };
  } catch {
    return { record: null, schemaReady: false };
  }
}

async function updateDraftRow(
  table: "site_config_drafts" | "content_collection_drafts",
  keyColumn: "scope" | "collection_key",
  key: string,
  values: DbRow,
): Promise<{ ok: boolean; missing: boolean; message?: string }> {
  const { data, error } = await db.from(table).update(values).eq(keyColumn, key).select("workflow_status");
  if (error) {
    return { ok: false, missing: isMissingSchemaError(error), message: error.message };
  }
  if (!Array.isArray(data) || data.length === 0) {
    return { ok: false, missing: false, message: "Your account is not allowed to change this draft." };
  }
  return { ok: true, missing: false };
}

const SAVE_MESSAGES = {
  pending_approval:
    "Submitted for Super Admin review. The live website is unchanged until the change is approved and published.",
  draft: "Draft saved. The live website is unchanged.",
} as const;

/** Editor or Super Admin: save a scope draft (`draft`) or submit it for review (`pending_approval`). */
export async function saveSiteConfigDraft(params: {
  scope: SiteConfigScope;
  updates: Partial<SiteConfig>;
  targetStatus: "draft" | "pending_approval";
  previousStatus: WorkflowStatus;
}): Promise<CmsOperationResult> {
  const { scope, updates, targetStatus, previousStatus } = params;
  const draft = pickScopeConfig(scope, updates);
  const label = SITE_CONFIG_SCOPE_LABELS[scope];

  if (targetStatus === "pending_approval") {
    const problems = validateScopeDraft(scope, draft);
    if (problems.length > 0) {
      return { ok: false, persistedToDatabase: false, workflowStatus: previousStatus, message: problems.join(" ") };
    }
  }

  try {
    const res = await updateDraftRow("site_config_drafts", "scope", scope, { draft, workflow_status: targetStatus });
    if (!res.ok) {
      return {
        ok: false,
        persistedToDatabase: false,
        workflowStatus: previousStatus,
        message: res.missing ? schemaMissingMessage(label, "005c") : res.message ?? "Could not save the draft.",
      };
    }
  } catch {
    return { ok: false, persistedToDatabase: false, workflowStatus: previousStatus, message: schemaMissingMessage(label, "005c") };
  }

  await recordTransition("site_config", scope, previousStatus, targetStatus, null);
  return { ok: true, persistedToDatabase: true, workflowStatus: targetStatus, message: SAVE_MESSAGES[targetStatus] };
}

/** Super Admin: approve a submitted scope draft, or reject it with feedback. */
export async function reviewSiteConfigDraft(params: {
  scope: SiteConfigScope;
  decision: "approved" | "rejected";
  feedback?: string;
  previousStatus: WorkflowStatus;
}): Promise<CmsOperationResult> {
  const { scope, decision, previousStatus } = params;
  const feedback = params.feedback?.trim() ?? "";
  const label = SITE_CONFIG_SCOPE_LABELS[scope];
  if (decision === "rejected" && !feedback) {
    return { ok: false, persistedToDatabase: false, workflowStatus: previousStatus, message: "Rejection feedback is required." };
  }

  try {
    const res = await updateDraftRow("site_config_drafts", "scope", scope, {
      workflow_status: decision,
      review_feedback: decision === "rejected" ? feedback : null,
    });
    if (!res.ok) {
      return {
        ok: false,
        persistedToDatabase: false,
        workflowStatus: previousStatus,
        message: res.missing ? schemaMissingMessage(label, "005c") : res.message ?? "Could not record the review.",
      };
    }
  } catch {
    return { ok: false, persistedToDatabase: false, workflowStatus: previousStatus, message: schemaMissingMessage(label, "005c") };
  }

  await recordTransition("site_config", scope, previousStatus, decision, decision === "rejected" ? feedback : null);
  return {
    ok: true,
    persistedToDatabase: true,
    workflowStatus: decision,
    message:
      decision === "approved"
        ? "Approved. Click “Publish approved” to make it live."
        : "Rejected. The Editor will see your feedback.",
  };
}

/** Super Admin: publish an approved scope draft. The database rejects anything not approved. */
export async function publishSiteConfigDraft(
  scope: SiteConfigScope,
  options: { direct?: boolean } = {},
): Promise<CmsOperationResult> {
  const label = SITE_CONFIG_SCOPE_LABELS[scope];
  try {
    const { error } = await db.rpc("publish_site_config_draft", { _scope: scope });
    if (error) {
      return {
        ok: false,
        persistedToDatabase: false,
        message: isMissingFunctionError(error) ? schemaMissingMessage(label, "005c") : error.message ?? "Publishing failed.",
      };
    }
  } catch {
    return { ok: false, persistedToDatabase: false, message: schemaMissingMessage(label, "005c") };
  }
  return {
    ok: true,
    persistedToDatabase: true,
    workflowStatus: "published",
    message: options.direct
      ? `${label} published directly to the live website. The change is recorded in the activity log.`
      : `${label} published to the live website.`,
  };
}

// Clinic wrappers (kept for existing callers and tests)
export const loadClinicDraft = () => loadSiteConfigDraft("clinic");
export const saveClinicDraft = (p: { updates: Partial<SiteConfig>; targetStatus: "draft" | "pending_approval"; previousStatus: WorkflowStatus }) =>
  saveSiteConfigDraft({ scope: "clinic", ...p });
export const reviewClinicDraft = (p: { decision: "approved" | "rejected"; feedback?: string; previousStatus: WorkflowStatus }) =>
  reviewSiteConfigDraft({ scope: "clinic", ...p });
export const publishClinicDraft = () => publishSiteConfigDraft("clinic");

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
  const overrides = readStaged<Record<string, Partial<MediaAsset>>>("media:overrides") ?? {};

  const applyOverrides = (list: MediaAsset[]) =>
    list.map((item) => (overrides[item.id] ? { ...item, ...overrides[item.id] } : item));

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
      return { assets: applyOverrides([...stagedUploads, ...BUILTIN_STATIC_MEDIA]), schemaReady: false };
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

    return { assets: applyOverrides([...dbAssets, ...stagedUploads, ...BUILTIN_STATIC_MEDIA]), schemaReady: true };
  } catch {
    return { assets: applyOverrides([...stagedUploads, ...BUILTIN_STATIC_MEDIA]), schemaReady: false };
  }
}

/** True only when the storage bucket itself does not exist yet (migration 004 not applied). */
function isMissingBucketError(err: { message?: string; statusCode?: string | number } | null | undefined): boolean {
  if (!err) return false;
  return /bucket not found/i.test(err.message ?? "");
}

/** Turns Supabase Storage errors into messages an Editor can act on. */
function describeStorageError(err: { message?: string } | null | undefined): string {
  const msg = err?.message ?? "";
  if (/mime type/i.test(msg)) return `This file type is not accepted by the media library. Allowed: ${MEDIA_ALLOWED_DESCRIPTION}.`;
  if (/maximum allowed size|exceeded|too large|payload/i.test(msg)) return "The file is larger than the media library allows.";
  if (/row-level security|not authorized|unauthorized|permission/i.test(msg)) return "Your account is not allowed to upload media.";
  if (/already exists|duplicate/i.test(msg)) return "A file with this name was just uploaded. Please try again.";
  return msg || "Upload failed.";
}

function stageLocalUpload(file: File, storagePath: string, safeName: string, mediaType: MediaAsset["mediaType"], altText: string, caption: string, category: MediaCategory): MediaAsset {
  const previewUrl = typeof URL !== "undefined" && URL.createObjectURL ? URL.createObjectURL(file) : `/uploads/${safeName}`;
  const stagedAsset: MediaAsset = {
    id: `staged-${Date.now()}`,
    fileName: file.name,
    storagePath,
    publicUrl: previewUrl,
    mediaType,
    mimeType: file.type,
    sizeBytes: file.size,
    altText: altText.trim() || file.name,
    caption: caption.trim(),
    category,
    createdAt: new Date().toISOString(),
  };
  const existing = readStaged<MediaAsset[]>("media:uploads") ?? [];
  writeStaged("media:uploads", [stagedAsset, ...existing]);
  return stagedAsset;
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

  let uploadError: { message?: string } | null = null;
  try {
    const res = await supabase.storage.from("cms-media").upload(storagePath, file, {
      cacheControl: "3600",
      contentType: file.type,
      upsert: false,
    });
    uploadError = res.error;
  } catch (err) {
    uploadError = { message: err instanceof Error ? err.message : "Bucket not found" };
  }

  if (uploadError) {
    // Only a missing bucket (migration 004 not applied) falls back to a session-only preview.
    // Any other storage error is a real failure and must be shown, never hidden.
    if (isMissingBucketError(uploadError)) {
      return {
        ok: true,
        asset: stageLocalUpload(file, storagePath, safeName, check.mediaType, altText, caption, category),
        persistedToDatabase: false,
      };
    }
    return { ok: false, error: describeStorageError(uploadError), persistedToDatabase: false };
  }

  const { data: pub } = supabase.storage.from("cms-media").getPublicUrl(storagePath);
  const publicUrl = pub.publicUrl;

  const row = {
    file_name: file.name,
    storage_path: storagePath,
    public_url: publicUrl,
    media_type: check.mediaType,
    mime_type: file.type,
    size_bytes: file.size,
    alt_text: altText.trim() || file.name,
    caption: caption.trim(),
    category,
  };

  const { data: inserted, error: insertError } = await db
    .from("media_assets")
    .insert(row)
    .select("id, created_at")
    .single();

  if (insertError || !inserted) {
    return {
      ok: false,
      persistedToDatabase: false,
      error: `The file was uploaded but could not be added to the media library (${insertError?.message ?? "no row returned"}). Ask a Super Admin to remove "${storagePath}" from storage before retrying.`,
    };
  }

  return {
    ok: true,
    persistedToDatabase: true,
    asset: {
      id: String(inserted.id),
      fileName: row.file_name,
      storagePath,
      publicUrl,
      mediaType: check.mediaType,
      mimeType: row.mime_type,
      sizeBytes: row.size_bytes,
      altText: row.alt_text,
      caption: row.caption,
      category,
      createdAt: String(inserted.created_at ?? new Date().toISOString()),
    },
  };
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
  if (asset.id.startsWith("staged-")) {
    const existing = readStaged<MediaAsset[]>("media:uploads") ?? [];
    writeStaged(
      "media:uploads",
      existing.filter((a) => a.id !== asset.id),
    );
    return { ok: true };
  }

  // Database asset: remove the library row first (RLS: Super Admin only), then the stored file.
  const { data: deleted, error: rowError } = await db.from("media_assets").delete().eq("id", asset.id).select("id");
  if (rowError) {
    return { ok: false, error: rowError.message ?? "Could not delete the media record." };
  }
  if (!Array.isArray(deleted) || deleted.length === 0) {
    return { ok: false, error: "Your account is not allowed to delete this media file." };
  }
  const { error: storageError } = await supabase.storage.from("cms-media").remove([asset.storagePath]);
  if (storageError) {
    return {
      ok: false,
      error: `The library entry was removed but the stored file could not be deleted (${storageError.message}).`,
    };
  }
  return { ok: true };
}

export async function updateMediaAssetMetadata(params: {
  assetId: string;
  altText: string;
  caption: string;
  category: MediaCategory;
}): Promise<{ ok: boolean; error?: string; persistedToDatabase: boolean }> {
  const { assetId, altText, caption, category } = params;

  // Built-in and session-only assets have no database row: keep their edits in this session.
  if (assetId.startsWith("static-") || assetId.startsWith("staged-")) {
    const overrides = readStaged<Record<string, Partial<MediaAsset>>>("media:overrides") ?? {};
    overrides[assetId] = {
      ...(overrides[assetId] ?? {}),
      altText: altText.trim(),
      caption: caption.trim(),
      category,
    };
    writeStaged("media:overrides", overrides);
    return { ok: true, persistedToDatabase: false };
  }

  // Database asset: only these three columns are writable from the browser (005b F4b).
  try {
    const { data, error } = await db
      .from("media_assets")
      .update({
        alt_text: altText.trim(),
        caption: caption.trim(),
        category,
      })
      .eq("id", assetId)
      .select("id");

    if (error) {
      return { ok: false, error: error.message ?? "Could not save media details.", persistedToDatabase: false };
    }
    if (!Array.isArray(data) || data.length === 0) {
      return { ok: false, error: "Your account is not allowed to edit this media file.", persistedToDatabase: false };
    }
    return { ok: true, persistedToDatabase: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Could not save media details.", persistedToDatabase: false };
  }
}

/**
 * "Replace" uploads the new file as a NEW library asset that keeps the old asset's alt text,
 * caption and category. Existing asset rows are never repointed (the database blocks changing
 * public_url/storage_path), so pages that already use the old file keep showing it until someone
 * selects the new file in that page and the change goes through approval. This is what stops a
 * replacement from bypassing the review workflow.
 */
export async function replaceMediaAssetFile(params: {
  asset: MediaAsset;
  file: File;
}): Promise<{ ok: boolean; asset?: MediaAsset; replacedAssetId?: string; error?: string; persistedToDatabase: boolean }> {
  const { asset, file } = params;
  const check = validateMediaFile(file);
  if (!check.valid || !check.mediaType) {
    return { ok: false, error: check.error, persistedToDatabase: false };
  }

  const uploaded = await uploadMediaAsset({
    file,
    altText: asset.altText || file.name,
    caption: asset.caption,
    category: asset.category,
  });

  if (!uploaded.ok || !uploaded.asset) {
    return uploaded;
  }

  return {
    ok: true,
    asset: uploaded.asset,
    replacedAssetId: asset.id,
    persistedToDatabase: uploaded.persistedToDatabase,
  };
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

export type CmsInviteStatus = "pending" | "accepted" | "expired" | "failed" | "not_invited";

export interface CmsManagedUser {
  userId: string;
  email: string;
  displayName: string;
  role: "super_admin" | "editor";
  isActive: boolean;
  createdAt: string;
  /** Migration 007 + updated admin-users function; absent on older deployments. */
  inviteStatus?: CmsInviteStatus;
  inviteLastSentAt?: string | null;
  directPublishEnabled?: boolean;
  directPublishUpdatedAt?: string | null;
  directPublishUpdatedByEmail?: string | null;
}

export async function invokeAdminUsers<T = Record<string, unknown>>(
  payload: Record<string, unknown>,
): Promise<{ ok: boolean; data?: T; edgeFunctionReady: boolean; error?: string }> {
  try {
    const { data, error } = await supabase.functions.invoke("admin-users", {
      body: payload,
    });

    if (error) {
      let detailedMsg = "";
      if (typeof error === "object" && error !== null && "context" in error) {
        const ctx = (error as { context?: unknown }).context;
        if (ctx && typeof ctx === "object" && "json" in ctx && typeof (ctx as Response).json === "function") {
          try {
            const body = await (ctx as Response).clone().json();
            if (body && typeof body === "object" && "error" in body && body.error) {
              detailedMsg = String(body.error);
            }
          } catch {
            // fallback if stream already consumed or non-JSON
          }
        }
      }

      const msg = detailedMsg || String(error.message ?? error);
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

// ---------------------------------------------------------------------------
// 9. Generic Collection Approval Workflow Adapter (Services, Blogs, Cases, Testimonials)
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// 9. Collections (services, blog posts, case studies, testimonials) — database-backed changesets
//    (migration 005d). Replaces the earlier sessionStorage-only collection drafts.
//    Nothing here writes the live tables; only publish_collection_draft() does, after approval.
// ---------------------------------------------------------------------------

export interface CollectionDraftRecord {
  key: CollectionKey;
  changeset: CollectionChangeset;
  workflowStatus: WorkflowStatus;
  reviewFeedback: string | null;
  reviewedAt: string | null;
  reviewedByEmail: string | null;
  submittedAt: string | null;
  publishedAt: string | null;
  history: ApprovalHistoryEntry[];
}

export interface CollectionDraftLoadResult {
  liveRows: CollectionRow[];
  record: CollectionDraftRecord | null;
  schemaReady: boolean;
  error?: string;
}

/** Loads the live rows (as the CMS sees them) plus the shared changeset for one collection. */
export async function loadCollectionDraft(key: CollectionKey): Promise<CollectionDraftLoadResult> {
  const def = COLLECTION_DEFINITIONS[key];
  let liveRows: CollectionRow[] = [];
  try {
    const { data } = await db.from(key).select("*").order(def.orderBy.column, { ascending: def.orderBy.ascending });
    if (Array.isArray(data)) liveRows = data as CollectionRow[];
  } catch {
    liveRows = [];
  }

  try {
    const { data, error } = await db
      .from("content_collection_drafts")
      .select("draft, workflow_status, review_feedback, reviewed_at, submitted_at, published_at")
      .eq("collection_key", key)
      .maybeSingle();
    if (error) {
      if (isMissingSchemaError(error)) return { liveRows, record: null, schemaReady: false };
      return { liveRows, record: null, schemaReady: true, error: error.message ?? "Could not load the draft." };
    }
    if (!data) {
      return {
        liveRows,
        record: null,
        schemaReady: true,
        error: "This draft is not visible to your account. Ask a Super Admin to check your role.",
      };
    }
    const history = await loadApprovalHistory("collection", key);
    const lastReview = history.find((h) => h.toStatus === "approved" || h.toStatus === "rejected");
    return {
      liveRows,
      schemaReady: true,
      record: {
        key,
        changeset: normalizeChangeset(key, data.draft),
        workflowStatus: (data.workflow_status as WorkflowStatus) ?? "published",
        reviewFeedback: (data.review_feedback as string | null) ?? null,
        reviewedAt: (data.reviewed_at as string | null) ?? null,
        reviewedByEmail: lastReview?.actorEmail ?? null,
        submittedAt: (data.submitted_at as string | null) ?? null,
        publishedAt: (data.published_at as string | null) ?? null,
        history,
      },
    };
  } catch {
    return { liveRows, record: null, schemaReady: false };
  }
}

/** Editor or Super Admin: save the changeset (`draft`) or submit it for review (`pending_approval`). */
export async function saveCollectionDraft(params: {
  key: CollectionKey;
  changeset: CollectionChangeset;
  targetStatus: "draft" | "pending_approval";
  previousStatus: WorkflowStatus;
}): Promise<CmsOperationResult> {
  const { key, targetStatus, previousStatus } = params;
  const def = COLLECTION_DEFINITIONS[key];
  const changeset = normalizeChangeset(key, params.changeset);

  if (targetStatus === "pending_approval") {
    if (changeset.items.length === 0 && changeset.deletedIds.length === 0) {
      return { ok: false, persistedToDatabase: false, workflowStatus: previousStatus, message: "There are no changes to submit." };
    }
    const problems = validateChangeset(key, changeset);
    if (problems.length > 0) {
      return { ok: false, persistedToDatabase: false, workflowStatus: previousStatus, message: problems.join(" ") };
    }
  }

  try {
    const res = await updateDraftRow("content_collection_drafts", "collection_key", key, {
      draft: changeset as unknown as DbRow,
      workflow_status: targetStatus,
    });
    if (!res.ok) {
      return {
        ok: false,
        persistedToDatabase: false,
        workflowStatus: previousStatus,
        message: res.missing ? schemaMissingMessage(def.label, "005d") : res.message ?? "Could not save the draft.",
      };
    }
  } catch {
    return { ok: false, persistedToDatabase: false, workflowStatus: previousStatus, message: schemaMissingMessage(def.label, "005d") };
  }

  await recordTransition("collection", key, previousStatus, targetStatus, null);
  return { ok: true, persistedToDatabase: true, workflowStatus: targetStatus, message: SAVE_MESSAGES[targetStatus] };
}

/** Super Admin: approve or reject the submitted changeset. */
export async function reviewCollectionDraft(params: {
  key: CollectionKey;
  decision: "approved" | "rejected";
  feedback?: string;
  previousStatus: WorkflowStatus;
}): Promise<CmsOperationResult> {
  const { key, decision, previousStatus } = params;
  const def = COLLECTION_DEFINITIONS[key];
  const feedback = params.feedback?.trim() ?? "";
  if (decision === "rejected" && !feedback) {
    return { ok: false, persistedToDatabase: false, workflowStatus: previousStatus, message: "Rejection feedback is required." };
  }
  try {
    const res = await updateDraftRow("content_collection_drafts", "collection_key", key, {
      workflow_status: decision,
      review_feedback: decision === "rejected" ? feedback : null,
    });
    if (!res.ok) {
      return {
        ok: false,
        persistedToDatabase: false,
        workflowStatus: previousStatus,
        message: res.missing ? schemaMissingMessage(def.label, "005d") : res.message ?? "Could not record the review.",
      };
    }
  } catch {
    return { ok: false, persistedToDatabase: false, workflowStatus: previousStatus, message: schemaMissingMessage(def.label, "005d") };
  }
  await recordTransition("collection", key, previousStatus, decision, decision === "rejected" ? feedback : null);
  return {
    ok: true,
    persistedToDatabase: true,
    workflowStatus: decision,
    message:
      decision === "approved"
        ? "Approved. Click “Publish approved” to make it live."
        : "Rejected. The Editor will see your feedback.",
  };
}

/** Super Admin: apply the approved changeset to the live table (database-side, all-or-nothing). */
export async function publishCollectionDraft(
  key: CollectionKey,
  options: { direct?: boolean } = {},
): Promise<CmsOperationResult> {
  const def = COLLECTION_DEFINITIONS[key];
  try {
    const { data, error } = await db.rpc("publish_collection_draft", { _key: key });
    if (error) {
      return {
        ok: false,
        persistedToDatabase: false,
        message: isMissingFunctionError(error) ? schemaMissingMessage(def.label, "005d") : error.message ?? "Publishing failed.",
      };
    }
    const counts = (data ?? {}) as { inserted?: number; updated?: number; deleted?: number };
    return {
      ok: true,
      persistedToDatabase: true,
      workflowStatus: "published",
      message: `${def.label} published${options.direct ? " directly" : ""}: ${counts.inserted ?? 0} added, ${counts.updated ?? 0} updated, ${counts.deleted ?? 0} removed.`,
    };
  } catch {
    return { ok: false, persistedToDatabase: false, message: schemaMissingMessage(def.label, "005d") };
  }
}

/**
 * Public-site preview: the live rows with the shared changeset applied — only for signed-in CMS
 * users (RLS returns no draft row to anyone else, so visitors always get the live rows).
 */
export async function loadCollectionPreviewRows(key: CollectionKey, liveRows: CollectionRow[]): Promise<CollectionRow[] | null> {
  try {
    const { data, error } = await db
      .from("content_collection_drafts")
      .select("draft, workflow_status")
      .eq("collection_key", key)
      .maybeSingle();
    if (error || !data || data.workflow_status === "published") return null;
    return applyChangeset(key, liveRows, normalizeChangeset(key, data.draft));
  } catch {
    return null;
  }
}
