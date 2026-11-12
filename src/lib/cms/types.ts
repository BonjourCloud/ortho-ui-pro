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
  entityType: "cms_page" | "site_config" | "medical_subsection" | "service" | "blog_post" | "cms_seo_metadata" | "collection";
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
  ctaLabel?: string;
}

export interface WhyChooseCardItem {
  icon: string;
  title: string;
  description: string;
}

export interface HomeStatsLabels {
  yearsExperience: string;
  happyPatients: string;
  surgeriesCompleted: string;
  branches: string;
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
  statsLabels?: HomeStatsLabels;
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
  googleReviewsCtaLabel?: string;
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
    statsLabels: {
      yearsExperience: "Years Experience",
      happyPatients: "Happy Patients",
      surgeriesCompleted: "Surgeries",
      branches: "Branches",
    },
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
    googleReviewsCtaLabel: "Read all reviews on Google",
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

function unescapeHtml(html: string): string {
  return html
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&");
}

function stripTags(html: string): string {
  return unescapeHtml(
    html
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<[^>]+>/g, ""),
  ).trim();
}

function inferBlockType(heading: string, explicitType?: string): TreatmentBlockType {
  const validTypes: TreatmentBlockType[] = [
    "overview",
    "symptoms",
    "causes",
    "diagnosis",
    "treatments",
    "recovery",
    "faq",
    "image",
  ];
  if (explicitType && (validTypes as string[]).includes(explicitType)) {
    return explicitType as TreatmentBlockType;
  }
  const h = heading.toLowerCase();
  if (h.includes("symptom") || h.includes("sign")) return "symptoms";
  if (h.includes("cause") || h.includes("risk")) return "causes";
  if (h.includes("diagnos") || h.includes("evaluat") || h.includes("test")) return "diagnosis";
  if (h.includes("recover") || h.includes("rehab") || h.includes("aftercare") || h.includes("post-op")) return "recovery";
  if (h.includes("faq") || h.includes("question")) return "faq";
  if (h.includes("treat") || h.includes("surg") || h.includes("procedur") || h.includes("therap")) return "treatments";
  return "overview";
}

/**
 * Parses existing HTML (`medical_subsections.content`) into structured `TreatmentSectionBlock[]`
 * so doctors can edit any seeded or existing treatment page with structured blocks OR rich HTML
 * without losing its existing headings, paragraphs, bullet lists, or medical illustrations.
 */
export function parseHtmlToTreatmentBlocks(
  rawHtml: string | null | undefined,
  fallbackTitle: string,
): TreatmentSectionBlock[] {
  const html = (rawHtml || "").trim();
  if (!html) {
    return [
      {
        id: "overview-1",
        type: "overview",
        heading: `About ${fallbackTitle}`,
        body: "",
        bulletItems: [],
      },
    ];
  }

  // Split by <section ...> if present, otherwise split before each <h2> or <h3>
  const sectionMatches = html.match(/<section[^>]*>[\s\S]*?<\/section>/gi);
  const chunks =
    sectionMatches && sectionMatches.length > 0
      ? sectionMatches
      : html
          .split(/(?=<h[23]\b)/i)
          .map((c) => c.trim())
          .filter(Boolean);

  const blocks: TreatmentSectionBlock[] = [];

  chunks.forEach((chunk, index) => {
    const typeAttrMatch = chunk.match(/data-cms-block=["']([^"']+)["']/i);
    const headingMatch = chunk.match(/<h[123][^>]*>([\s\S]*?)<\/h[123]>/i);
    const heading = headingMatch ? stripTags(headingMatch[1]) : index === 0 ? `About ${fallbackTitle}` : `Section ${index + 1}`;

    const imgMatches = [...chunk.matchAll(/<img[^>]+src=["']([^"']+)["'][^>]*>/gi)];
    const extractedImages = imgMatches
      .map((m) => {
        const tag = m[0];
        const src = m[1]?.trim() || "";
        const altM = tag.match(/alt=["']([^"']*)["']/i);
        const alt = altM ? unescapeHtml(altM[1]) : "";
        return { src, alt };
      })
      .filter((img) => Boolean(img.src));

    const firstImg = extractedImages[0];
    const imageUrl = firstImg?.src || "";
    const imageAlt = firstImg?.alt || "";

    const paragraphMatches = [...chunk.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/gi)];
    const body = paragraphMatches
      .map((m) => stripTags(m[1]))
      .filter(Boolean)
      .join("\n\n");

    const liMatches = [...chunk.matchAll(/<li[^>]*>([\s\S]*?)<\/li>/gi)];
    const bulletItems = liMatches.map((m) => stripTags(m[1])).filter(Boolean);

    const blockType =
      typeAttrMatch?.[1] === "image" || (!body && bulletItems.length === 0 && imageUrl)
        ? "image"
        : inferBlockType(heading, typeAttrMatch?.[1]);

    blocks.push({
      id: `block-${index + 1}`,
      type: blockType,
      heading,
      body,
      bulletItems,
      imageUrl: imageUrl || undefined,
      imageAlt: imageAlt || undefined,
    });

    // If an image block contained multiple images in the same section, preserve all remaining images
    if (blockType === "image" && extractedImages.length > 1) {
      for (let m = 1; m < extractedImages.length; m++) {
        blocks.push({
          id: `block-${index + 1}-img-${m + 1}`,
          type: "image",
          heading: extractedImages[m].alt || `${heading} Illustration ${m + 1}`,
          body: "",
          bulletItems: [],
          imageUrl: extractedImages[m].src,
          imageAlt: extractedImages[m].alt || heading,
        });
      }
    }

    // If a non-image section contains inline illustrations, extract each one as a distinct image block
    if (blockType !== "image" && extractedImages.length > 0) {
      extractedImages.forEach((img, m) => {
        blocks.push({
          id: `block-${index + 1}-img-${m + 1}`,
          type: "image",
          heading: img.alt || `${heading} Illustration ${m + 1}`,
          body: "",
          bulletItems: [],
          imageUrl: img.src,
          imageAlt: img.alt || heading,
        });
      });
    }
  });

  return blocks.length > 0
    ? blocks
    : [
        {
          id: "overview-1",
          type: "overview",
          heading: `About ${fallbackTitle}`,
          body: stripTags(html),
          bulletItems: [],
        },
      ];
}

// ---------------------------------------------------------------------------
// 2B. All Public Website Pages Content Model (`cms_pages` by slug)
// ---------------------------------------------------------------------------

export type SitePageSlug =
  | "about"
  | "orthopaedics"
  | "physiotherapy"
  | "rehabilitation"
  | "services"
  | "book"
  | "contact"
  | "second-opinion"
  | "blog"
  | "case-studies";

export interface SitePageHighlightItem {
  id: string;
  icon: string;
  title: string;
  description: string;
}

export interface SitePageFaqItem {
  id: string;
  question: string;
  answer: string;
}

export interface SitePageContent {
  slug: SitePageSlug;
  pageTitle: string;
  routePath: string;
  heroEyebrow: string;
  heroTitle: string;
  heroSubtitle: string;
  heroImageUrl: string;
  heroImageAlt: string;
  bodyHtml: string;
  ctaHeading: string;
  ctaDescription: string;
  ctaPrimaryLabel: string;
  ctaPrimaryLink: string;
  ctaSecondaryLabel: string;
  ctaSecondaryLink: string;
  highlights: SitePageHighlightItem[];
  faqs: SitePageFaqItem[];
  customLabels: Record<string, string>;
}

export const SITE_PAGE_CATALOG: { slug: "home" | SitePageSlug; label: string; routePath: string; description: string }[] = [
  {
    slug: "home",
    label: "Home Page (/)",
    routePath: "/",
    description: "Hero banner, clinic statistics labels, specialties, featured procedures, why choose us, testimonial video & bottom CTA.",
  },
  {
    slug: "about",
    label: "About Doctor Page (/about)",
    routePath: "/about",
    description: "Hero headings, section titles, supplemental rich-text biography, FAQs, and bottom CTA on the About page.",
  },
  {
    slug: "orthopaedics",
    label: "Orthopaedics Landing (/orthopaedics)",
    routePath: "/orthopaedics",
    description: "Department hero banner, introduction, highlight cards, FAQs, and bottom CTA for Orthopaedics.",
  },
  {
    slug: "physiotherapy",
    label: "Physiotherapy Landing (/physiotherapy)",
    routePath: "/physiotherapy",
    description: "Department hero banner, introduction, highlight cards, FAQs, and bottom CTA for Physiotherapy.",
  },
  {
    slug: "rehabilitation",
    label: "Rehabilitation Landing (/rehabilitation)",
    routePath: "/rehabilitation",
    description: "Department hero banner, introduction, highlight cards, FAQs, and bottom CTA for Rehabilitation.",
  },
  {
    slug: "services",
    label: "Services Directory (/services)",
    routePath: "/services",
    description: "Hero banner, search & filter labels, introduction text, FAQs, and bottom consultation CTA.",
  },
  {
    slug: "book",
    label: "Book Appointment (/book)",
    routePath: "/book",
    description: "Hero banner, booking wizard step titles, appointment type options, insurance heading, and confirmation message.",
  },
  {
    slug: "contact",
    label: "Contact & Directions (/contact)",
    routePath: "/contact",
    description: "Hero banner, contact section headings, inquiry form labels, confirmation message, and map button text.",
  },
  {
    slug: "second-opinion",
    label: "Second Opinion (/second-opinion)",
    routePath: "/second-opinion",
    description: "Hero banner, 3 benefit highlight cards, surgery condition dropdown options, upload labels, and confirmation screen.",
  },
  {
    slug: "blog",
    label: "Health Blog (/blog & /blog/:slug)",
    routePath: "/blog",
    description: "Blog listing hero banner, search placeholder, empty state text, and article bottom CTA banner.",
  },
  {
    slug: "case-studies",
    label: "Patient Case Studies (/case-studies & /case-studies/:slug)",
    routePath: "/case-studies",
    description: "Case studies hero banner, outcome labels, and case study detail bottom CTA banner.",
  },
];

export const DEFAULT_SITE_PAGES_CONTENT: Record<SitePageSlug, SitePageContent> = {
  about: {
    slug: "about",
    pageTitle: "About Doctor Page",
    routePath: "/about",
    heroEyebrow: "About",
    heroTitle: "", // Uses "Meet {config.doctorName}" when empty so doctorName stays dynamic unless overridden
    heroSubtitle: "", // Uses config.title when empty
    heroImageUrl: "", // Uses config.heroImageUrl or default portrait when empty
    heroImageAlt: "",
    bodyHtml: "",
    ctaHeading: "Ready for a Personal Consultation?",
    ctaDescription: "Book an appointment to discuss your symptoms, imaging, and personalized recovery plan.",
    ctaPrimaryLabel: "Book Appointment",
    ctaPrimaryLink: "/book",
    ctaSecondaryLabel: "Get Second Opinion",
    ctaSecondaryLink: "/second-opinion",
    highlights: [],
    faqs: [],
    customLabels: {
      meetPrefix: "Meet",
      philosophyHeading: "My Philosophy",
      educationHeading: "Education & Training",
      awardsHeading: "Awards & Recognition",
      membershipsHeading: "Professional Memberships",
    },
  },
  orthopaedics: {
    slug: "orthopaedics",
    pageTitle: "Orthopaedics Department Page",
    routePath: "/orthopaedics",
    heroEyebrow: "Our Services",
    heroTitle: "Orthopaedics",
    heroSubtitle: "Comprehensive orthopedic care for bone, joint, ligament, tendon, and musculoskeletal conditions.",
    heroImageUrl: "",
    heroImageAlt: "Orthopaedics Department at OrthoCare Hub",
    bodyHtml: "",
    ctaHeading: "Need Help Choosing a Treatment?",
    ctaDescription: "Book a consultation and our team will guide you to the right treatment plan.",
    ctaPrimaryLabel: "Book Consultation",
    ctaPrimaryLink: "/book",
    ctaSecondaryLabel: "WhatsApp Us",
    ctaSecondaryLink: "/contact",
    highlights: [],
    faqs: [],
    customLabels: {
      ConditionsCountSuffix: "conditions & treatments",
      learnMoreLabel: "Learn more",
      notFoundHeading: "Section Not Found",
      backHomeLabel: "← Back to Home",
      comingSoonText: "Content coming soon. Please check back later.",
      subsectionNotFoundHeading: "Page Not Found",
      subsectionComingSoonHeading: "Content Coming Soon",
      subsectionBookLabel: "Book Appointment",
      subsectionBookLink: "/book",
      subsectionContactLabel: "Contact Us",
      subsectionContactLink: "/contact",
    },
  },
  physiotherapy: {
    slug: "physiotherapy",
    pageTitle: "Physiotherapy Department Page",
    routePath: "/physiotherapy",
    heroEyebrow: "Our Services",
    heroTitle: "Physiotherapy",
    heroSubtitle: "Evidence-based physiotherapy modalities, shockwave therapy, and targeted pain relief programs.",
    heroImageUrl: "",
    heroImageAlt: "Physiotherapy Department at OrthoCare Hub",
    bodyHtml: "",
    ctaHeading: "Need Help Choosing a Treatment?",
    ctaDescription: "Book a consultation and our team will guide you to the right treatment plan.",
    ctaPrimaryLabel: "Book Consultation",
    ctaPrimaryLink: "/book",
    ctaSecondaryLabel: "WhatsApp Us",
    ctaSecondaryLink: "/contact",
    highlights: [],
    faqs: [],
    customLabels: {
      ConditionsCountSuffix: "conditions & treatments",
      learnMoreLabel: "Learn more",
      notFoundHeading: "Section Not Found",
      backHomeLabel: "← Back to Home",
      comingSoonText: "Content coming soon. Please check back later.",
      subsectionNotFoundHeading: "Page Not Found",
      subsectionComingSoonHeading: "Content Coming Soon",
      subsectionBookLabel: "Book Appointment",
      subsectionBookLink: "/book",
      subsectionContactLabel: "Contact Us",
      subsectionContactLink: "/contact",
    },
  },
  rehabilitation: {
    slug: "rehabilitation",
    pageTitle: "Rehabilitation Department Page",
    routePath: "/rehabilitation",
    heroEyebrow: "Our Services",
    heroTitle: "Rehabilitation",
    heroSubtitle: "Structured post-operative, post-fracture, and sports injury rehabilitation programs.",
    heroImageUrl: "",
    heroImageAlt: "Rehabilitation Department at OrthoCare Hub",
    bodyHtml: "",
    ctaHeading: "Need Help Choosing a Treatment?",
    ctaDescription: "Book a consultation and our team will guide you to the right treatment plan.",
    ctaPrimaryLabel: "Book Consultation",
    ctaPrimaryLink: "/book",
    ctaSecondaryLabel: "WhatsApp Us",
    ctaSecondaryLink: "/contact",
    highlights: [],
    faqs: [],
    customLabels: {
      ConditionsCountSuffix: "conditions & treatments",
      learnMoreLabel: "Learn more",
      notFoundHeading: "Section Not Found",
      backHomeLabel: "← Back to Home",
      comingSoonText: "Content coming soon. Please check back later.",
      subsectionNotFoundHeading: "Page Not Found",
      subsectionComingSoonHeading: "Content Coming Soon",
      subsectionBookLabel: "Book Appointment",
      subsectionBookLink: "/book",
      subsectionContactLabel: "Contact Us",
      subsectionContactLink: "/contact",
    },
  },
  services: {
    slug: "services",
    pageTitle: "Services & Procedures Directory",
    routePath: "/services",
    heroEyebrow: "Our Expertise",
    heroTitle: "Services & Procedures",
    heroSubtitle: "Comprehensive orthopedic care — from conservative management to advanced surgical solutions.",
    heroImageUrl: "",
    heroImageAlt: "Orthopedic Services & Procedures",
    bodyHtml: "",
    ctaHeading: "Need Help Choosing a Treatment?",
    ctaDescription: "Book a consultation and we will create a personalized treatment plan for your condition.",
    ctaPrimaryLabel: "Book Appointment",
    ctaPrimaryLink: "/book",
    ctaSecondaryLabel: "Get Second Opinion",
    ctaSecondaryLink: "/second-opinion",
    highlights: [],
    faqs: [],
    customLabels: {
      searchPlaceholder: "Search services...",
      bookButtonLabel: "Book This Service",
      loadingText: "Loading services...",
      emiBadgeLabel: "EMI Available",
    },
  },
  book: {
    slug: "book",
    pageTitle: "Book Appointment Page",
    routePath: "/book",
    heroEyebrow: "Appointments",
    heroTitle: "Book Appointment",
    heroSubtitle: "Schedule your visit. We'll confirm via WhatsApp.",
    heroImageUrl: "",
    heroImageAlt: "Book an Appointment at OrthoCare Hub",
    bodyHtml: "",
    ctaHeading: "Need Immediate Assistance?",
    ctaDescription: "Call our reception desk directly or message us on WhatsApp for urgent slots.",
    ctaPrimaryLabel: "Contact Clinic",
    ctaPrimaryLink: "/contact",
    ctaSecondaryLabel: "Second Opinion",
    ctaSecondaryLink: "/second-opinion",
    highlights: [],
    faqs: [],
    customLabels: {
      appointmentTypes: "In-Person Consultation, Video Consultation, Follow-up Visit",
      confirmationHeading: "Appointment Requested!",
      confirmationNote: "We will confirm within 2 hours via WhatsApp.",
      whatsappConfirmLabel: "Confirm via WhatsApp",
      insuranceHeading: "Accepted Insurance Providers",
      successMessage: "Your appointment has been submitted successfully.",
      firstNameLabel: "First Name *",
      lastNameLabel: "Last Name *",
      phoneLabel: "Phone *",
      phonePlaceholder: "+91",
      appointmentTypeLabel: "Appointment Type *",
      selectTypePlaceholder: "Select type",
      serviceLabel: "Service",
      selectServicePlaceholder: "Select service",
      dateLabel: "Preferred Date *",
      timeLabel: "Preferred Time *",
      selectTimePlaceholder: "Select time",
      symptomsLabel: "Describe Your Symptoms *",
      symptomsPlaceholder: "Brief description of your condition...",
      insuranceLabel: "Insurance Provider",
      insuranceNoneOption: "None / Self-pay",
      emiCheckboxLabel: "I'm interested in EMI payment options",
      callDirectlyLabel: "Or call directly:",
    },
  },
  contact: {
    slug: "contact",
    pageTitle: "Contact & Directions Page",
    routePath: "/contact",
    heroEyebrow: "Reach Out",
    heroTitle: "Contact Us",
    heroSubtitle: "Have questions? Get in touch with our team.",
    heroImageUrl: "",
    heroImageAlt: "Contact OrthoCare Hub",
    bodyHtml: "",
    ctaHeading: "Ready to Schedule Your Visit?",
    ctaDescription: "Book an in-clinic or video consultation with our specialist today.",
    ctaPrimaryLabel: "Book Appointment",
    ctaPrimaryLink: "/book",
    ctaSecondaryLabel: "Get Second Opinion",
    ctaSecondaryLink: "/second-opinion",
    highlights: [],
    faqs: [],
    customLabels: {
      getInTouchHeading: "Get In Touch",
      formHeading: "Send a Message",
      submitButtonLabel: "Send Message",
      successHeading: "Message Sent!",
      successDescription: "We'll get back to you within 24 hours.",
      openInMapsLabel: "Open in Maps",
      whatsappButtonLabel: "Chat on WhatsApp",
      mapTitle: "Clinic Location",
      nameLabel: "Full Name *",
      emailLabel: "Email *",
      phoneLabel: "Phone",
      phonePlaceholder: "+91",
      subjectLabel: "Subject *",
      messageLabel: "Message *",
    },
  },
  "second-opinion": {
    slug: "second-opinion",
    pageTitle: "Second Opinion Page",
    routePath: "/second-opinion",
    heroEyebrow: "Second Opinion",
    heroTitle: "Been Advised Surgery? Get a Second Opinion",
    heroSubtitle: "Upload your X-rays, MRI reports, and prescriptions for an honest, expert assessment before making a major decision.",
    heroImageUrl: "",
    heroImageAlt: "Orthopedic Second Opinion Service",
    bodyHtml: "",
    ctaHeading: "Prefer an In-Person Evaluation?",
    ctaDescription: "Bring your films and medical records directly to our clinic for a comprehensive physical examination.",
    ctaPrimaryLabel: "Book In-Person Visit",
    ctaPrimaryLink: "/book",
    ctaSecondaryLabel: "Contact Clinic",
    ctaSecondaryLink: "/contact",
    highlights: [
      {
        id: "so-1",
        icon: "Shield",
        title: "Expert Review",
        description: "Thorough evaluation of your imaging and medical history by a fellowship-trained specialist.",
      },
      {
        id: "so-2",
        icon: "Clock",
        title: "Quick Turnaround",
        description: "Receive a clear treatment recommendation within 24–48 hours of submitting your reports.",
      },
      {
        id: "so-3",
        icon: "CheckCircle",
        title: "100% Confidential",
        description: "Your medical reports are stored in a private encrypted clinical bucket visible only to your doctor.",
      },
    ],
    faqs: [],
    customLabels: {
      formHeading: "Submit Your Case Details",
      conditionOptions:
        "Knee Replacement (TKR), Hip Replacement (THR), ACL / Ligament Reconstruction, Shoulder Surgery (Rotator Cuff / Dislocation), Spine / Disc Surgery, Fracture Fixation, Arthroscopy, Other Recommended Surgery",
      confirmationHeading: "Second Opinion Request Submitted!",
      confirmationDescription:
        "We have received your details and reports. Our specialist team will review your case and contact you within 24–48 hours.",
      whatsappFollowupLabel: "Message on WhatsApp",
      successNoteLabel: "",
      nameLabel: "",
      ageLabel: "",
      phoneLabel: "",
      emailLabel: "",
      conditionLabel: "",
      selectConditionLabel: "",
      currentDiagnosisLabel: "",
      diagnosisPlaceholderLabel: "",
      uploadReportsLabel: "",
      uploadHintLabel: "",
      chooseFilesLabel: "",
      fileTypesLabel: "",
      additionalNotesLabel: "",
      submitLabel: "",
      privacyLabel: "",
      submittingLabel: "Submitting...",
    },
  },
  blog: {
    slug: "blog",
    pageTitle: "Health Blog Page",
    routePath: "/blog",
    heroEyebrow: "Patient Education",
    heroTitle: "Health Blog & Articles",
    heroSubtitle: "Evidence-based orthopedic guides, recovery tips, and joint health insights from our specialist team.",
    heroImageUrl: "",
    heroImageAlt: "OrthoCare Hub Health Blog",
    bodyHtml: "",
    ctaHeading: "Have Questions About Your Condition?",
    ctaDescription: "Book a consultation for personalized advice and treatment planning.",
    ctaPrimaryLabel: "Book Appointment",
    ctaPrimaryLink: "/book",
    ctaSecondaryLabel: "Get Second Opinion",
    ctaSecondaryLink: "/second-opinion",
    highlights: [],
    faqs: [],
    customLabels: {
      searchPlaceholder: "Search articles...",
      featuredBadgeLabel: "Featured",
      emptyStateText: "No articles found.",
      loadingText: "Loading posts...",
      featuredHeading: "Featured Articles",
      moreHeading: "More Articles",
      relatedHeading: "Related Articles",
      backLabel: "Back to Blog",
      notFoundHeading: "Post Not Found",
      authorTitle: "Orthopedic Surgeon",
    },
  },
  "case-studies": {
    slug: "case-studies",
    pageTitle: "Patient Case Studies Page",
    routePath: "/case-studies",
    heroEyebrow: "Proven Outcomes",
    heroTitle: "Patient Case Studies & Recovery Stories",
    heroSubtitle: "Explore real clinical outcomes, pain score improvements, and recovery timelines across complex orthopedic procedures.",
    heroImageUrl: "",
    heroImageAlt: "OrthoCare Hub Patient Case Studies",
    bodyHtml: "",
    ctaHeading: "Have a Similar Condition?",
    ctaDescription: "Book a consultation to discuss your treatment options and expected recovery timeline.",
    ctaPrimaryLabel: "Book Consultation",
    ctaPrimaryLink: "/book",
    ctaSecondaryLabel: "Get Second Opinion",
    ctaSecondaryLink: "/second-opinion",
    highlights: [],
    faqs: [],
    customLabels: {
      painScoreLabel: "Pain Score",
      romLabel: "Range of Motion",
      recoveryTimelineHeading: "Recovery Timeline",
      emptyStateText: "No case studies found for this filter.",
      loadingText: "Loading case studies...",
      painBeforeLabel: "Pain Before",
      painAfterLabel: "Pain After",
      readMoreLabel: "Read Full Story",
      notFoundHeading: "Case Study Not Found",
      backLabel: "Back to Case Studies",
      ageGenderLabel: "Age / Gender",
      hospitalStayLabel: "Hospital Stay",
      followUpLabel: "Follow-Up",
      outcomeHeading: "Outcome Summary",
      returnToWorkLabel: "Return to Work",
      returnToActivitiesLabel: "Return to Activities",
    },
  },
};

export function mergeSitePageContent(
  slug: SitePageSlug,
  raw: Partial<SitePageContent> | null | undefined,
): SitePageContent {
  const base = DEFAULT_SITE_PAGES_CONTENT[slug];
  if (!raw || typeof raw !== "object") return base;
  return {
    ...base,
    ...raw,
    slug,
    routePath: base.routePath,
    highlights:
      Array.isArray(raw.highlights)
        ? raw.highlights
        : base.highlights,
    faqs:
      Array.isArray(raw.faqs)
        ? raw.faqs
        : base.faqs,
    customLabels: {
      ...base.customLabels,
      ...(raw.customLabels ?? {}),
    },
  };
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

/**
 * Must match the `cms-media` bucket's allowed_mime_types and the `chk_media_assets_mime_type`
 * constraint (migration 004 as corrected by 005b). SVG is deliberately NOT allowed: an SVG served
 * from a public bucket can carry script (stored XSS on the storage origin).
 */
export const ALLOWED_IMAGE_MIMES = ["image/jpeg", "image/png", "image/webp"] as const;
export const ALLOWED_VIDEO_MIMES = ["video/mp4", "video/webm"] as const;

/** File extensions accepted for each MIME type (the browser-reported type alone can be spoofed). */
export const MEDIA_EXTENSIONS_BY_MIME: Record<string, readonly string[]> = {
  "image/jpeg": ["jpg", "jpeg"],
  "image/png": ["png"],
  "image/webp": ["webp"],
  "video/mp4": ["mp4"],
  "video/webm": ["webm"],
};

/** Value for `<input type="file" accept>` everywhere media is chosen. */
export const MEDIA_ACCEPT_ATTR = [...ALLOWED_IMAGE_MIMES, ...ALLOWED_VIDEO_MIMES].join(",");

/** Human-readable summary shown in the CMS. */
export const MEDIA_ALLOWED_DESCRIPTION = "JPG, PNG or WebP images up to 5 MB, and MP4 or WebM videos up to 50 MB";

export const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // 5 MB  (= chk_media_assets_size_limit, image)
export const MAX_VIDEO_BYTES = 50 * 1024 * 1024; // 50 MB (= bucket file_size_limit and video limit)

export interface MediaValidationResult {
  valid: boolean;
  mediaType?: MediaType;
  error?: string;
}

export function validateMediaFile(file: { name: string; type: string; size: number }): MediaValidationResult {
  if (!file.size || file.size <= 0) {
    return { valid: false, error: "The selected file is empty." };
  }

  const unsupported: MediaValidationResult = {
    valid: false,
    error: `Unsupported file type "${file.type || file.name}". Allowed: ${MEDIA_ALLOWED_DESCRIPTION}.`,
  };

  const extension = file.name.includes(".") ? file.name.split(".").pop()!.toLowerCase() : "";
  const allowedExtensions = MEDIA_EXTENSIONS_BY_MIME[file.type];
  if (!allowedExtensions) {
    return unsupported;
  }
  if (!allowedExtensions.includes(extension)) {
    return {
      valid: false,
      error: `The file name "${file.name}" does not match its type (${file.type}). Rename it with a .${allowedExtensions[0]} extension or export it again.`,
    };
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

  return unsupported;
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
  {
    routePath: "/services",
    pageLabel: "Services & Procedures Directory",
    seoTitle: "Orthopedic Services & Procedures",
    seoDescription: "Explore orthopedic surgeries, arthroscopy, joint replacement, and non-surgical treatments at OrthoCare Hub.",
    seoKeywords: "orthopedic services Hyderabad, knee surgery cost, arthroscopy procedure",
    ogImageUrl: "https://orthocarehub.in/og-image.svg",
    canonicalUrl: "https://orthocarehub.in/services",
    noindex: false,
  },
  {
    routePath: "/second-opinion",
    pageLabel: "Second Opinion",
    seoTitle: "Get an Orthopedic Second Opinion",
    seoDescription: "Advised knee, hip, or shoulder surgery? Upload your MRI/X-ray reports for an expert orthopedic second opinion.",
    seoKeywords: "orthopedic second opinion Hyderabad, knee surgery second opinion, MRI review",
    ogImageUrl: "https://orthocarehub.in/og-image.svg",
    canonicalUrl: "https://orthocarehub.in/second-opinion",
    noindex: false,
  },
  {
    routePath: "/blog",
    pageLabel: "Health Blog",
    seoTitle: "Orthopedic Health Blog & Recovery Guides",
    seoDescription: "Read articles and patient guides on joint health, sports injury prevention, and surgical recovery.",
    seoKeywords: "orthopedic blog, knee replacement recovery tips, ACL rehab guide",
    ogImageUrl: "https://orthocarehub.in/og-image.svg",
    canonicalUrl: "https://orthocarehub.in/blog",
    noindex: false,
  },
  {
    routePath: "/case-studies",
    pageLabel: "Patient Case Studies",
    seoTitle: "Patient Case Studies & Surgical Outcomes",
    seoDescription: "Real orthopedic case studies, pre/post pain scores, and recovery timelines from OrthoCare Hub.",
    seoKeywords: "orthopedic case studies, knee replacement outcomes, sports injury recovery stories",
    ogImageUrl: "https://orthocarehub.in/og-image.svg",
    canonicalUrl: "https://orthocarehub.in/case-studies",
    noindex: false,
  },
];
