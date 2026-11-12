/**
 * Pure domain types, defaults, and adapters for Iteration 3:
 * - Page & Homepage Section Management (`cms_pages`)
 * - Structured Treatment Page Blocks (`medical_subsections`)
 * - Media Library Assets & Validation (`media_assets` + `cms-media` bucket)
 * - Draft & Live Preview resolution (`?preview=1`)
 *
 * Designed so the UI and public website work with existing live tables today
 * and seamlessly use the new columns/tables once migration 004 is applied.
 */

export type WorkflowStatus =
  | "draft"
  | "pending_approval"
  | "approved"
  | "rejected"
  | "published";

export type PublishStatus = WorkflowStatus;

export type WorkflowAction =
  | "save_draft"
  | "submit_for_review"
  | "approve"
  | "reject"
  | "publish";

export interface ApprovalHistoryEntry {
  id: string;
  entityType: "cms_page" | "site_config" | "medical_subsection" | "service" | "blog_post" | "cms_seo_metadata";
  entityId: string;
  fromStatus: WorkflowStatus | null;
  toStatus: WorkflowStatus;
  actorEmail: string;
  actorRole: string;
  feedback?: string | null;
  createdAt: string;
}

export interface WorkflowMetadata {
  status: WorkflowStatus;
  submittedBy?: string | null;
  submittedAt?: string | null;
  reviewedBy?: string | null;
  reviewedAt?: string | null;
  reviewFeedback?: string | null;
  publishedAt?: string | null;
}

export const WORKFLOW_STATUS_LABELS: Record<WorkflowStatus, string> = {
  draft: "Draft",
  pending_approval: "Pending Super Admin Review",
  approved: "Approved (Ready to Publish)",
  rejected: "Changes Requested",
  published: "Published (Live)",
};

export interface TransitionRuleResult {
  allowed: boolean;
  nextStatus?: WorkflowStatus;
  reason?: string;
}

/**
 * Enforces Rajiv's confirmed approval workflow:
 * - Editor (`canApprove = false`, `canPublish = false`):
 *   * `save_draft` -> `'draft'`
 *   * `submit_for_review` (from `'draft'` or `'rejected'`) -> `'pending_approval'`
 *   * Cannot `approve`, `reject`, or `publish` (unless `canPublish` is explicitly granted).
 * - Super Admin (`canApprove = true`, `canPublish = true`):
 *   * `save_draft` -> `'draft'`
 *   * `submit_for_review` -> `'pending_approval'`
 *   * `approve` (from `'pending_approval'` or `'draft'`) -> `'approved'`
 *   * `reject` (from `'pending_approval'` or `'approved'`, requires non-empty `feedback`) -> `'rejected'`
 *   * `publish` (from `'approved'`, `'pending_approval'`, `'draft'`, or `'published'` for direct publish) -> `'published'`
 */
export function evaluateWorkflowTransition(params: {
  currentStatus: WorkflowStatus;
  action: WorkflowAction;
  canSubmitReview: boolean;
  canApprove: boolean;
  canPublish: boolean;
  feedback?: string;
}): TransitionRuleResult {
  const { currentStatus, action, canSubmitReview, canApprove, canPublish, feedback } = params;

  switch (action) {
    case "save_draft":
      return { allowed: true, nextStatus: "draft" };

    case "submit_for_review":
      if (!canSubmitReview) {
        return { allowed: false, reason: "You do not have permission to submit drafts for review." };
      }
      if (currentStatus === "pending_approval") {
        return { allowed: false, reason: "This item is already waiting for Super Admin review." };
      }
      return { allowed: true, nextStatus: "pending_approval" };

    case "approve":
      if (!canApprove) {
        return { allowed: false, reason: "Only a Super Admin can approve content changes." };
      }
      if (currentStatus !== "pending_approval" && currentStatus !== "draft" && currentStatus !== "rejected") {
        return { allowed: false, reason: `Cannot approve from status "${currentStatus}".` };
      }
      return { allowed: true, nextStatus: "approved" };

    case "reject":
      if (!canApprove) {
        return { allowed: false, reason: "Only a Super Admin can reject content changes." };
      }
      if (currentStatus !== "pending_approval" && currentStatus !== "approved") {
        return { allowed: false, reason: "Only changes pending review or approved can be rejected." };
      }
      if (!feedback || !feedback.trim()) {
        return { allowed: false, reason: "Please provide feedback explaining why the changes were rejected." };
      }
      return { allowed: true, nextStatus: "rejected" };

    case "publish":
      if (!canPublish) {
        return {
          allowed: false,
          reason: "Only a Super Admin can publish to the live website. Please submit your draft for review.",
        };
      }
      return { allowed: true, nextStatus: "published" };

    default:
      return { allowed: false, reason: "Unknown workflow action." };
  }
}

// ---------------------------------------------------------------------------
// 1. Homepage & Page Sections Model
// ---------------------------------------------------------------------------

export type HomeSectionId =
  | "hero"
  | "stats"
  | "specialties"
  | "procedures"
  | "why_choose"
  | "testimonials"
  | "cta";

export interface SpecialtyCardItem {
  icon: string;
  title: string;
  description: string;
}

export interface ProcedureCardItem {
  icon: string;
  title: string;
  description: string;
  ctaLink?: string;
}

export interface WhyChooseCardItem {
  icon: string;
  title: string;
  description: string;
}

export interface HomeHeroSectionData {
  badge: string;
  headingPrefix: string;
  headingHighlight: string;
  primaryParagraph: string;
  secondaryParagraph: string;
  primaryCtaLabel: string;
  primaryCtaLink: string;
  secondaryCtaLabel: string;
  secondaryCtaLink: string;
  heroImageUrl?: string;
}

export interface HomeSpecialtiesSectionData {
  eyebrow: string;
  heading: string;
  items: SpecialtyCardItem[];
}

export interface HomeProceduresSectionData {
  eyebrow: string;
  heading: string;
  items: ProcedureCardItem[];
}

export interface HomeWhyChooseSectionData {
  eyebrow: string;
  heading: string;
  items: WhyChooseCardItem[];
}

export interface HomeTestimonialsSectionData {
  eyebrow: string;
  heading: string;
  videoUrl: string;
  videoCaption: string;
  googleReviewsUrl: string;
}

export interface HomeCtaSectionData {
  heading: string;
  description: string;
  primaryCtaLabel: string;
  primaryCtaLink: string;
  whatsappCtaLabel: string;
}

export interface PageSectionConfig {
  id: HomeSectionId;
  label: string;
  visible: boolean;
  sortOrder: number;
}

export interface HomePageContent {
  sectionsOrder: PageSectionConfig[];
  hero: HomeHeroSectionData;
  specialties: HomeSpecialtiesSectionData;
  procedures: HomeProceduresSectionData;
  whyChoose: HomeWhyChooseSectionData;
  testimonials: HomeTestimonialsSectionData;
  cta: HomeCtaSectionData;
}

/** Exact production content currently hardcoded in src/pages/Index.tsx */
export const DEFAULT_HOME_CONTENT: HomePageContent = {
  sectionsOrder: [
    { id: "hero", label: "Hero Banner", visible: true, sortOrder: 1 },
    { id: "stats", label: "Clinic Statistics", visible: true, sortOrder: 2 },
    { id: "specialties", label: "Our Specialties", visible: true, sortOrder: 3 },
    { id: "procedures", label: "Featured Procedures", visible: true, sortOrder: 4 },
    { id: "why_choose", label: "Why Choose Us", visible: true, sortOrder: 5 },
    { id: "testimonials", label: "Patient Testimonials & Video", visible: true, sortOrder: 6 },
    { id: "cta", label: "Bottom Call-to-Action", visible: true, sortOrder: 7 },
  ],
  hero: {
    badge: "Orthopedic Excellence in Hyderabad",
    headingPrefix: "Advanced Orthopedic Care for",
    headingHighlight: "Pain-Free Living",
    primaryParagraph:
      "Expert diagnosis, minimally invasive treatments, and personalized care for joint pain, sports injuries, and spine conditions.",
    secondaryParagraph:
      "Trusted by patients across Hyderabad for knee replacement, ACL reconstruction, and sports medicine.",
    primaryCtaLabel: "Book Appointment",
    primaryCtaLink: "/book",
    secondaryCtaLabel: "Get Second Opinion",
    secondaryCtaLink: "/contact",
    heroImageUrl: "",
  },
  specialties: {
    eyebrow: "Our Specialties",
    heading: "Comprehensive Orthopedic Care",
    items: [
      {
        icon: "Bone",
        title: "Knee Pain & Arthritis",
        description:
          "Expert management of knee pain, osteoarthritis, and ligament injuries with both surgical and non-surgical solutions.",
      },
      {
        icon: "Activity",
        title: "Sports Injuries",
        description:
          "Treatment for ACL tears, meniscus injuries, and sports-related conditions to help patients return to activity safely.",
      },
      {
        icon: "Dumbbell",
        title: "Shoulder Conditions",
        description:
          "Care for rotator cuff injuries, frozen shoulder, dislocations, and chronic shoulder pain.",
      },
      {
        icon: "Sparkles",
        title: "Back & Spine Disorders",
        description:
          "Diagnosis and treatment of slip disc, sciatica, and chronic back pain with personalized care plans.",
      },
      {
        icon: "Footprints",
        title: "Joint Replacement",
        description:
          "Advanced knee and joint replacement surgeries designed for long-term relief and improved mobility.",
      },
      {
        icon: "Siren",
        title: "Fractures & Trauma Care",
        description:
          "Comprehensive treatment for fractures, accidents, and complex bone injuries.",
      },
      {
        icon: "HeartPulse",
        title: "Physiotherapy & Rehabilitation",
        description:
          "Structured rehabilitation programs to restore strength, mobility, and function after injury or surgery.",
      },
      {
        icon: "Target",
        title: "Chronic Pain Management",
        description:
          "Holistic approach to managing long-standing joint and musculoskeletal pain effectively.",
      },
    ],
  },
  procedures: {
    eyebrow: "Popular Treatments",
    heading: "Featured Procedures",
    items: [
      {
        icon: "🦵",
        title: "Total Knee Replacement",
        description:
          "Advanced joint replacement surgery for severe knee arthritis, restoring mobility and eliminating pain with proven techniques.",
        ctaLink: "/book",
      },
      {
        icon: "⚽",
        title: "ACL Reconstruction",
        description:
          "Minimally invasive arthroscopic surgery to repair torn ACL ligaments, helping athletes return to peak performance.",
        ctaLink: "/book",
      },
      {
        icon: "🔬",
        title: "Arthroscopy (Keyhole Surgery)",
        description:
          "State-of-the-art minimally invasive procedures for joint problems with faster recovery and minimal scarring.",
        ctaLink: "/book",
      },
      {
        icon: "💪",
        title: "Shoulder Pain Treatment",
        description:
          "Comprehensive care for rotator cuff injuries, frozen shoulder, and other shoulder conditions using advanced techniques.",
        ctaLink: "/book",
      },
      {
        icon: "🦴",
        title: "Spine & Back Pain Care",
        description:
          "Expert diagnosis and treatment for herniated discs, sciatica, and chronic back pain with non-surgical and surgical options.",
        ctaLink: "/book",
      },
      {
        icon: "🏃",
        title: "Sports Injury Management",
        description:
          "Specialized treatment for sports-related injuries including ligament tears, fractures, and overuse injuries.",
        ctaLink: "/book",
      },
    ],
  },
  whyChoose: {
    eyebrow: "Why Us",
    heading: "Why Choose Dr. Srivanth Dasari?",
    items: [
      {
        icon: "Award",
        title: "Expert Care",
        description:
          "Highly qualified orthopedic surgeon with extensive experience in complex joint and spine procedures.",
      },
      {
        icon: "Clock",
        title: "Faster Recovery",
        description:
          "Minimally invasive techniques and advanced surgical methods ensure quicker healing and return to normal life.",
      },
      {
        icon: "Target",
        title: "Accurate Diagnosis",
        description:
          "State-of-the-art diagnostic equipment and thorough evaluation for precise treatment planning.",
      },
      {
        icon: "Heart",
        title: "Personalized Treatment",
        description:
          "Customized care plans tailored to your specific condition, lifestyle, and recovery goals.",
      },
      {
        icon: "Stethoscope",
        title: "Comprehensive Services",
        description:
          "Complete orthopedic care from diagnosis to surgery to rehabilitation under one roof.",
      },
      {
        icon: "TrendingUp",
        title: "Proven Results",
        description:
          "High success rates and thousands of satisfied patients with restored mobility and pain-free living.",
      },
    ],
  },
  testimonials: {
    eyebrow: "Testimonials",
    heading: "Trusted by Patients Across Hyderabad",
    videoUrl: "/videos/testimonial1.mp4",
    videoCaption: "Hear from one of our patients",
    googleReviewsUrl:
      "https://www.google.com/search?sca_esv=d690ffcb785891a9&rlz=1C1CHBF_enIN1200IN1200&sxsrf=ANbL-n5bLYuWTqgTdnXqXVm5swn_UzIYWg:1776066514357&si=AL3DRZEsmMGCryMMFSHJ3StBhOdZ2-6yYkXd_doETEE1OR-qOYNrsMxMPmGX9vtn8fier-d1Po5lvx8z6EqgmGszRX2582iYKwohcjweNlaDkXEt6g7jZ2ainFVfIaf8fzIiOuNfHjuZxZZ3jeJ4qe3MJiUNFdv5X7zJk23BcW6x12yl0KuiLRg%3D&q=Dr.+Srivanth%27s+Orthopedic+%26+Speciality+Hospital+Reviews&sa=X&ved=2ahUKEwi_7r2tq-qTAxViRmwGHfq5OfEQ0bkNegQINxAH&biw=1521&bih=721&dpr=1.26",
  },
  cta: {
    heading: "Ready to Move Without Pain?",
    description: "Insurance accepted, EMI options available.",
    primaryCtaLabel: "Book Appointment",
    primaryCtaLink: "/book",
    whatsappCtaLabel: "WhatsApp Us",
  },
};

/** Pure helper to reorder sections up or down without mutating the input array */
export function moveSectionOrder(
  sections: PageSectionConfig[],
  id: HomeSectionId,
  direction: "up" | "down",
): PageSectionConfig[] {
  const sorted = [...sections].sort((a, b) => a.sortOrder - b.sortOrder);
  const idx = sorted.findIndex((s) => s.id === id);
  if (idx === -1) return sorted;
  const swapIdx = direction === "up" ? idx - 1 : idx + 1;
  if (swapIdx < 0 || swapIdx >= sorted.length) return sorted;

  const swapped = [...sorted];
  const temp = swapped[idx];
  swapped[idx] = swapped[swapIdx];
  swapped[swapIdx] = temp;

  return swapped.map((s, i) => ({ ...s, sortOrder: i + 1 }));
}

export function toggleSectionVisibility(
  sections: PageSectionConfig[],
  id: HomeSectionId,
): PageSectionConfig[] {
  return sections.map((s) => (s.id === id ? { ...s, visible: !s.visible } : s));
}

export function mergeHomeContent(raw: Partial<HomePageContent> | null | undefined): HomePageContent {
  if (!raw || typeof raw !== "object") return DEFAULT_HOME_CONTENT;
  return {
    sectionsOrder: Array.isArray(raw.sectionsOrder) && raw.sectionsOrder.length > 0
      ? raw.sectionsOrder
      : DEFAULT_HOME_CONTENT.sectionsOrder,
    hero: { ...DEFAULT_HOME_CONTENT.hero, ...(raw.hero ?? {}) },
    specialties: {
      ...DEFAULT_HOME_CONTENT.specialties,
      ...(raw.specialties ?? {}),
      items: Array.isArray(raw.specialties?.items) && raw.specialties.items.length > 0
        ? raw.specialties.items
        : DEFAULT_HOME_CONTENT.specialties.items,
    },
    procedures: {
      ...DEFAULT_HOME_CONTENT.procedures,
      ...(raw.procedures ?? {}),
      items: Array.isArray(raw.procedures?.items) && raw.procedures.items.length > 0
        ? raw.procedures.items
        : DEFAULT_HOME_CONTENT.procedures.items,
    },
    whyChoose: {
      ...DEFAULT_HOME_CONTENT.whyChoose,
      ...(raw.whyChoose ?? {}),
      items: Array.isArray(raw.whyChoose?.items) && raw.whyChoose.items.length > 0
        ? raw.whyChoose.items
        : DEFAULT_HOME_CONTENT.whyChoose.items,
    },
    testimonials: { ...DEFAULT_HOME_CONTENT.testimonials, ...(raw.testimonials ?? {}) },
    cta: { ...DEFAULT_HOME_CONTENT.cta, ...(raw.cta ?? {}) },
  };
}

// ---------------------------------------------------------------------------
// 2. Treatment Page Structured Blocks & HTML Compiler
// ---------------------------------------------------------------------------

export type TreatmentBlockType =
  | "overview"
  | "symptoms"
  | "causes"
  | "diagnosis"
  | "treatments"
  | "recovery"
  | "faq"
  | "image";

export interface TreatmentSectionBlock {
  id: string;
  type: TreatmentBlockType;
  heading: string;
  body: string;         // Plain text paragraphs (double-newline separated)
  bulletItems: string[]; // Optional bullet list items
  imageUrl?: string;
  imageAlt?: string;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * Compiles structured, doctor-friendly blocks into clean semantic HTML for
 * `medical_subsections.content` so the public `MedicalSubsection.tsx` page
 * renders identically without requiring doctors to write raw HTML or SQL.
 */
export function compileTreatmentBlocksToHtml(blocks: TreatmentSectionBlock[]): string {
  return blocks
    .map((block) => {
      const parts: string[] = [];
      if (block.heading.trim()) {
        parts.push(`<h2>${escapeHtml(block.heading.trim())}</h2>`);
      }
      if (block.type === "image" && block.imageUrl?.trim()) {
        const alt = escapeHtml(block.imageAlt?.trim() || block.heading.trim() || "Treatment illustration");
        parts.push(
          `<figure class="my-6"><img src="${escapeHtml(block.imageUrl.trim())}" alt="${alt}" class="rounded-xl w-full object-cover" /></figure>`,
        );
      }
      const paragraphs = block.body
        .split(/\n{2,}/)
        .map((p) => p.trim())
        .filter(Boolean);
      for (const p of paragraphs) {
        parts.push(`<p>${escapeHtml(p).replace(/\n/g, "<br />")}</p>`);
      }
      const bullets = block.bulletItems.map((b) => b.trim()).filter(Boolean);
      if (bullets.length > 0) {
        const lis = bullets.map((b) => `<li>${escapeHtml(b)}</li>`).join("");
        parts.push(`<ul>${lis}</ul>`);
      }
      return `<section data-cms-block="${escapeHtml(block.type)}">${parts.join("\n")}</section>`;
    })
    .filter(Boolean)
    .join("\n\n");
}

// ---------------------------------------------------------------------------
// 3. Media Library Validation & Types
// ---------------------------------------------------------------------------

export type MediaType = "image" | "video";
export type MediaCategory = "hero" | "doctor" | "treatments" | "clinic" | "testimonials" | "general";

export interface MediaAsset {
  id: string;
  fileName: string;
  storagePath: string;
  publicUrl: string;
  mediaType: MediaType;
  mimeType: string;
  sizeBytes: number;
  altText: string;
  caption: string;
  category: MediaCategory;
  createdAt: string;
}

export const ALLOWED_IMAGE_MIMES = ["image/jpeg", "image/png", "image/webp", "image/svg+xml"] as const;
export const ALLOWED_VIDEO_MIMES = ["video/mp4", "video/webm"] as const;

export const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // 5 MB
export const MAX_VIDEO_BYTES = 50 * 1024 * 1024; // 50 MB

export interface MediaValidationResult {
  valid: boolean;
  mediaType?: MediaType;
  error?: string;
}

export function validateMediaFile(file: { name: string; type: string; size: number }): MediaValidationResult {
  if (!file.size || file.size <= 0) {
    return { valid: false, error: "The selected file is empty." };
  }

  if ((ALLOWED_IMAGE_MIMES as readonly string[]).includes(file.type)) {
    if (file.size > MAX_IMAGE_BYTES) {
      return {
        valid: false,
        error: `Image size (${(file.size / (1024 * 1024)).toFixed(1)} MB) exceeds the 5 MB limit.`,
      };
    }
    return { valid: true, mediaType: "image" };
  }

  if ((ALLOWED_VIDEO_MIMES as readonly string[]).includes(file.type)) {
    if (file.size > MAX_VIDEO_BYTES) {
      return {
        valid: false,
        error: `Video size (${(file.size / (1024 * 1024)).toFixed(1)} MB) exceeds the 50 MB limit.`,
      };
    }
    return { valid: true, mediaType: "video" };
  }

  return {
    valid: false,
    error: `Unsupported file type "${file.type || file.name}". Allowed: JPG, PNG, WebP, SVG (up to 5 MB) or MP4, WebM (up to 50 MB).`,
  };
}

// ---------------------------------------------------------------------------
// 4. Draft vs Published Resolution Helper
// ---------------------------------------------------------------------------

/**
 * Returns true when the URL `preview` query parameter requests CMS draft preview mode.
 * Canonical query parameter: `?preview=1` (also accepts `?preview=draft` or `?preview=true`).
 * Note: Requesting preview mode in the URL NEVER grants access by itself — callers must also
 * verify `isAuthenticatedCmsUser` via `resolvePreviewData()`.
 */
export function isDraftPreviewParam(previewParam: string | null | undefined): boolean {
  if (!previewParam) return false;
  const normalized = previewParam.trim().toLowerCase();
  return normalized === "1" || normalized === "draft" || normalized === "true";
}

/**
 * Resolves whether to return the draft or published version of a content payload.
 * Draft data is returned ONLY when `isPreviewMode` is true AND `isAuthenticatedCmsUser` is true
 * AND a non-null `draft` exists. Public visitors ALWAYS receive `published`.
 */
export function resolvePreviewData<T>(params: {
  published: T;
  draft: T | null | undefined;
  isPreviewMode: boolean;
  isAuthenticatedCmsUser: boolean;
}): { data: T; usingDraft: boolean } {
  const { published, draft, isPreviewMode, isAuthenticatedCmsUser } = params;
  if (isPreviewMode && isAuthenticatedCmsUser && draft !== null && draft !== undefined) {
    return { data: draft, usingDraft: true };
  }
  return { data: published, usingDraft: false };
}

// ---------------------------------------------------------------------------
// 5. Iteration 4: Branding Presets & Per-Route SEO Metadata Model
// ---------------------------------------------------------------------------

export type ThemePresetId = "clinical-teal" | "royal-navy" | "emerald-care";

export interface ThemePresetDefinition {
  id: ThemePresetId;
  label: string;
  description: string;
  primaryHsl: string;
  accentHsl: string;
  heroGradient: string;
}

export const APPROVED_THEME_PRESETS: Record<ThemePresetId, ThemePresetDefinition> = {
  "clinical-teal": {
    id: "clinical-teal",
    label: "Clinical Teal & Gold (Default)",
    description: "Original OrthoCare Hub deep teal palette with warm gold highlights.",
    primaryHsl: "180 45% 22%",
    accentHsl: "38 85% 52%",
    heroGradient: "linear-gradient(135deg, hsl(180 45% 22%) 0%, hsl(195 40% 28%) 100%)",
  },
  "royal-navy": {
    id: "royal-navy",
    label: "Royal Medical Navy & Gold",
    description: "Authoritative hospital navy palette paired with warm gold accents.",
    primaryHsl: "215 55% 23%",
    accentHsl: "38 85% 52%",
    heroGradient: "linear-gradient(135deg, hsl(215 55% 23%) 0%, hsl(225 48% 30%) 100%)",
  },
  "emerald-care": {
    id: "emerald-care",
    label: "Surgical Emerald & Amber",
    description: "Calming surgical green palette with warm amber calls-to-action.",
    primaryHsl: "162 48% 22%",
    accentHsl: "35 88% 50%",
    heroGradient: "linear-gradient(135deg, hsl(162 48% 22%) 0%, hsl(174 42% 28%) 100%)",
  },
};

export interface RouteSeoMetadata {
  routePath: string;
  pageLabel: string;
  seoTitle: string;
  seoDescription: string;
  seoKeywords: string;
  ogImageUrl: string;
  canonicalUrl: string;
  noindex: boolean;
}

export const DEFAULT_ROUTE_SEO_CATALOG: RouteSeoMetadata[] = [
  {
    routePath: "/",
    pageLabel: "Home Page",
    seoTitle: "Home",
    seoDescription:
      "Dr. Srivanth Dasari - Expert Orthopedic Surgeon in Hyderabad. Joint Replacement & Sports Medicine. Book your consultation today.",
    seoKeywords:
      "orthopedic doctor near me, best knee replacement surgeon near me, orthopedic surgeon Hyderabad, joint replacement, sports medicine",
    ogImageUrl: "https://orthocarehub.in/og-image.svg",
    canonicalUrl: "https://orthocarehub.in/",
    noindex: false,
  },
  {
    routePath: "/about",
    pageLabel: "About Doctor",
    seoTitle: "About Dr. Srivanth Dasari",
    seoDescription:
      "Learn about Dr. Srivanth Dasari's qualifications, South Korea orthopaedic fellowship, and patient-first surgical philosophy.",
    seoKeywords: "Dr. Srivanth Dasari qualifications, orthopedic fellowship South Korea, best bone specialist Hyderabad",
    ogImageUrl: "https://orthocarehub.in/og-image.svg",
    canonicalUrl: "https://orthocarehub.in/about",
    noindex: false,
  },
  {
    routePath: "/orthopaedics",
    pageLabel: "Orthopaedics Overview",
    seoTitle: "Orthopaedics Treatments",
    seoDescription:
      "Comprehensive orthopedic treatments for knee, hip, shoulder, elbow, spine, and sports injuries in Hyderabad.",
    seoKeywords: "orthopaedics Hyderabad, shoulder pain, knee replacement, hip replacement, fracture care",
    ogImageUrl: "https://orthocarehub.in/og-image.svg",
    canonicalUrl: "https://orthocarehub.in/orthopaedics",
    noindex: false,
  },
  {
    routePath: "/physiotherapy",
    pageLabel: "Physiotherapy Overview",
    seoTitle: "Physiotherapy & Shockwave Therapy",
    seoDescription: "Advanced physiotherapy, ESWT shockwave therapy, laser therapy, and pain relief modalities.",
    seoKeywords: "physiotherapy Hyderabad, ESWT shockwave therapy, ultrasonic therapy, dry needling",
    ogImageUrl: "https://orthocarehub.in/og-image.svg",
    canonicalUrl: "https://orthocarehub.in/physiotherapy",
    noindex: false,
  },
  {
    routePath: "/rehabilitation",
    pageLabel: "Rehabilitation Overview",
    seoTitle: "Post-Operative & Fracture Rehabilitation",
    seoDescription: "Structured post-surgical and post-fracture rehabilitation programs to restore full mobility.",
    seoKeywords: "post op rehabilitation Hyderabad, fracture rehab, sports injury rehab",
    ogImageUrl: "https://orthocarehub.in/og-image.svg",
    canonicalUrl: "https://orthocarehub.in/rehabilitation",
    noindex: false,
  },
  {
    routePath: "/book",
    pageLabel: "Book Appointment",
    seoTitle: "Book an Orthopaedic Consultation",
    seoDescription: "Schedule an in-clinic or video consultation with Dr. Srivanth Dasari at OrthoCare Hub, Hyderabad.",
    seoKeywords: "book orthopedic appointment Hyderabad, orthopedic consultation Ashok Nagar",
    ogImageUrl: "https://orthocarehub.in/og-image.svg",
    canonicalUrl: "https://orthocarehub.in/book",
    noindex: false,
  },
  {
    routePath: "/contact",
    pageLabel: "Contact & Directions",
    seoTitle: "Contact Us & Clinic Location",
    seoDescription: "Visit OrthoCare Hub in Ashok Nagar, Hyderabad. Call or WhatsApp +91-9441824999 for directions and timings.",
    seoKeywords: "OrthoCare Hub address, Ashok Nagar orthopedic hospital contact, Dr. Srivanth phone number",
    ogImageUrl: "https://orthocarehub.in/og-image.svg",
    canonicalUrl: "https://orthocarehub.in/contact",
    noindex: false,
  },
];
