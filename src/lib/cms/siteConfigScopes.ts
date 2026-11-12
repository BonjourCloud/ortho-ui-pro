/**
 * The three site_config workspaces that use the database draft workflow (migration 005c):
 * Clinic Information, Doctor Profile and Branding. Each owns a fixed set of SiteConfig keys.
 *
 * The database is the real gate: `publish_site_config_draft(scope)` re-applies the same key lists,
 * types and URL rules. These helpers give early, readable feedback and power the review diff.
 */
import type { BrandingConfig, SiteConfig } from "@/contexts/SiteConfigContext";

export type SiteConfigScope = "clinic" | "doctor" | "branding";

/** Must match `clinic_config_keys()` / `doctor_config_keys()` / `branding_config_keys()` in 005c. */
export const SITE_CONFIG_SCOPE_KEYS = {
  clinic: [
    "clinicName",
    "phone",
    "whatsapp",
    "email",
    "location",
    "hours",
    "consultationFee",
    "branches",
    "whatsappFloatEnabled",
    "whatsappDefaultMessage",
    "facebook",
    "instagram",
    "timeSlots",
    "insuranceProviders",
    "googleMapsEmbedUrl",
    "googleMapsDirectionsUrl",
    "serviceCategories",
  ],
  doctor: [
    "doctorName",
    "title",
    "specialization",
    "registrationNumber",
    "shortBio",
    "fullBio",
    "philosophy",
    "heroImageUrl",
    "yearsExperience",
    "happyPatients",
    "surgeriesCompleted",
    "googleRating",
    "googleReviewCount",
    "education",
    "awards",
    "memberships",
    "languages",
    "showEducationSection",
    "showAwardsSection",
    "showFellowshipCard",
    "fellowshipBadge",
    "fellowshipTitle",
    "fellowshipSubtitle",
    "fellowshipDescription",
    "fellowshipImageUrl",
  ],
  branding: ["logoInitials", "branding"],
} as const satisfies Record<SiteConfigScope, readonly (keyof SiteConfig)[]>;

/** Must match `branding_object_keys()` in 005c. */
export const BRANDING_OBJECT_KEYS = [
  "logoUrl",
  "logoAlt",
  "faviconUrl",
  "themePreset",
  "primaryHsl",
  "accentHsl",
  "headingFont",
  "bodyFont",
  "footerTagline",
  "headerCtaLabel",
  "headerCtaLink",
  "googleMapsUrl",
  "announcementEnabled",
  "announcementText",
  "announcementLinkLabel",
  "announcementLinkUrl",
  "copyrightText",
  "youtubeUrl",
  "navItems",
  "labels",
] as const satisfies readonly (keyof BrandingConfig)[];

export const SITE_CONFIG_SCOPE_LABELS: Record<SiteConfigScope, string> = {
  clinic: "Clinic information",
  doctor: "Doctor profile",
  branding: "Branding & theme",
};

/** Public page used for "Preview draft" in each workspace. */
export const SITE_CONFIG_SCOPE_PREVIEW_URL: Record<SiteConfigScope, string> = {
  clinic: "/contact?preview=1",
  doctor: "/about?preview=1",
  branding: "/?preview=1",
};

export const SITE_CONFIG_FIELD_LABELS: Record<string, string> = {
  // clinic
  clinicName: "Clinic / hospital name",
  phone: "Primary phone number",
  whatsapp: "WhatsApp number",
  email: "Clinic email",
  location: "Address & directions summary",
  hours: "Working hours",
  consultationFee: "Consultation fee (₹)",
  branches: "Branches",
  whatsappFloatEnabled: "Floating WhatsApp button",
  whatsappDefaultMessage: "WhatsApp prefilled message",
  facebook: "Facebook page URL",
  instagram: "Instagram profile URL",
  timeSlots: "Booking time slots",
  insuranceProviders: "Accepted insurance providers",
  googleMapsEmbedUrl: "Google Maps embed URL",
  googleMapsDirectionsUrl: "Google Maps directions link",
  serviceCategories: "Service categories (/services filter)",
  // doctor
  doctorName: "Doctor name",
  title: "Professional title",
  specialization: "Specialization",
  registrationNumber: "Registration number",
  shortBio: "Short bio",
  fullBio: "Full bio",
  philosophy: "Care philosophy",
  heroImageUrl: "Doctor portrait image",
  yearsExperience: "Years of experience",
  happyPatients: "Happy patients",
  surgeriesCompleted: "Surgeries completed",
  googleRating: "Google rating",
  googleReviewCount: "Google review count",
  education: "Education",
  awards: "Awards",
  memberships: "Memberships",
  languages: "Languages spoken",
  showEducationSection: "Show education section",
  showAwardsSection: "Show awards section",
  showFellowshipCard: "Show fellowship card",
  fellowshipBadge: "Fellowship badge",
  fellowshipTitle: "Fellowship title",
  fellowshipSubtitle: "Fellowship subtitle",
  fellowshipDescription: "Fellowship description",
  fellowshipImageUrl: "Fellowship image",
  // branding
  logoInitials: "Logo initials",
  branding: "Branding settings",
  "branding.logoUrl": "Logo image",
  "branding.logoAlt": "Logo alt text",
  "branding.faviconUrl": "Favicon",
  "branding.themePreset": "Theme preset",
  "branding.primaryHsl": "Primary colour",
  "branding.accentHsl": "Accent colour",
  "branding.headingFont": "Heading font",
  "branding.bodyFont": "Body font",
  "branding.footerTagline": "Footer tagline",
  "branding.headerCtaLabel": "Header button label",
  "branding.headerCtaLink": "Header button link",
  "branding.googleMapsUrl": "Footer map link",
  "branding.announcementEnabled": "Announcement bar",
  "branding.announcementText": "Announcement text",
  "branding.announcementLinkLabel": "Announcement link label",
  "branding.announcementLinkUrl": "Announcement link",
  "branding.copyrightText": "Copyright line",
  "branding.youtubeUrl": "YouTube URL",
  "branding.navItems": "Navigation menu",
  "branding.labels": "Site-wide labels",
};

/** Returns only the keys this scope owns (unknown keys, and unknown branding keys, are dropped). */
export function pickScopeConfig(scope: SiteConfigScope, source: Partial<SiteConfig> | null | undefined): Partial<SiteConfig> {
  const out: Record<string, unknown> = {};
  if (!source) return out as Partial<SiteConfig>;
  for (const key of SITE_CONFIG_SCOPE_KEYS[scope]) {
    if (key in source && source[key] !== undefined) {
      out[key] = source[key];
    }
  }
  if (scope === "branding" && out.branding && typeof out.branding === "object") {
    const b = out.branding as Record<string, unknown>;
    const cleaned: Record<string, unknown> = {};
    for (const key of BRANDING_OBJECT_KEYS) {
      if (key in b && b[key] !== undefined) cleaned[key] = b[key];
    }
    out.branding = cleaned;
  }
  return out as Partial<SiteConfig>;
}

/** Overlays a scope draft on the live config, using only that scope's keys. */
export function applyScopeDraft(scope: SiteConfigScope, live: SiteConfig, draft: Partial<SiteConfig> | null | undefined): SiteConfig {
  return { ...live, ...pickScopeConfig(scope, draft) };
}

function formatValue(value: unknown): string {
  if (value === undefined || value === null || value === "") return "—";
  if (typeof value === "boolean") return value ? "On" : "Off";
  if (Array.isArray(value)) {
    if (value.length === 0) return "(none)";
    return value
      .map((item) => {
        if (item && typeof item === "object") {
          const o = item as Record<string, unknown>;
          if ("time" in o) return `${String(o.time)}${o.available === false ? " (inactive)" : ""}`;
          if ("label" in o && "to" in o) return `${String(o.label)} → ${String(o.to)}${o.visible === false ? " (hidden)" : ""}`;
          if ("slug" in o && "name" in o) return `${String(o.icon ?? "")} ${String(o.name)}`.trim();
          if ("degree" in o) return `${String(o.degree)}, ${String(o.institution ?? "")}`;
          if ("title" in o) return `${String(o.title)}${o.year ? ` (${String(o.year)})` : ""}`;
          return JSON.stringify(o);
        }
        return String(item);
      })
      .join("; ");
  }
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

export interface ScopeFieldChange {
  key: string;
  label: string;
  live: string;
  draft: string;
}

/** Field-by-field differences between the live config and a scope draft. Branding is expanded per setting. */
export function diffScopeConfig(
  scope: SiteConfigScope,
  live: SiteConfig,
  draft: Partial<SiteConfig> | null | undefined,
): ScopeFieldChange[] {
  if (!draft) return [];
  const picked = pickScopeConfig(scope, draft) as Record<string, unknown>;
  const liveRecord = live as unknown as Record<string, unknown>;
  const changes: ScopeFieldChange[] = [];
  const push = (key: string, before: unknown, after: unknown) => {
    if (JSON.stringify(before ?? null) !== JSON.stringify(after ?? null)) {
      changes.push({ key, label: SITE_CONFIG_FIELD_LABELS[key] ?? key, live: formatValue(before), draft: formatValue(after) });
    }
  };
  for (const key of SITE_CONFIG_SCOPE_KEYS[scope]) {
    if (!(key in picked)) continue;
    if (key === "branding") {
      const before = (liveRecord.branding ?? {}) as Record<string, unknown>;
      const after = (picked.branding ?? {}) as Record<string, unknown>;
      for (const bkey of BRANDING_OBJECT_KEYS) {
        if (bkey in after || bkey in before) push(`branding.${bkey}`, before[bkey], after[bkey]);
      }
      continue;
    }
    push(key, liveRecord[key], picked[key]);
  }
  return changes;
}

const MAPS_EMBED_PATTERN = /^https:\/\/(www\.)?google\.[a-z.]+\/maps\/embed/i;
const HSL_PATTERN = /^\d{1,3}(\.\d+)? \d{1,3}(\.\d+)?% \d{1,3}(\.\d+)?%$/;

/** Mirrors `cms_is_safe_url()` in 005c. */
export function isSafeCmsUrl(value: string | undefined | null, allowRelative: boolean): boolean {
  if (!value) return true;
  if (/^https:\/\/[^\s"'<>]+$/.test(value)) return true;
  if (allowRelative && (value === "/" || /^\/[^/\\\s][^\s"'<>]*$/.test(value))) return true;
  return false;
}

/**
 * Mirrors `validate_site_config_patch()` in 005c so problems surface when the Editor submits,
 * not when the Super Admin publishes. Returns human-readable errors (empty = valid).
 */
export function validateScopeDraft(scope: SiteConfigScope, input: Partial<SiteConfig>): string[] {
  const draft = pickScopeConfig(scope, input) as Record<string, unknown>;
  const errors: string[] = [];
  const label = (k: string) => SITE_CONFIG_FIELD_LABELS[k] ?? k;
  const text = (k: string) => (typeof draft[k] === "string" ? (draft[k] as string).trim() : "");

  const numbers = ["consultationFee", "branches", "yearsExperience", "happyPatients", "surgeriesCompleted", "googleRating", "googleReviewCount"];
  for (const k of numbers) {
    if (!(k in draft)) continue;
    const v = draft[k];
    if (typeof v !== "number" || !Number.isFinite(v) || v < 0) errors.push(`${label(k)} must be a number of 0 or more.`);
    else if (k === "googleRating" && v > 5) errors.push("Google rating must be between 0 and 5.");
  }

  if (scope === "clinic") {
    if ("clinicName" in draft && !text("clinicName")) errors.push("Clinic / hospital name cannot be empty.");
    if ("phone" in draft && !text("phone")) errors.push("Primary phone number cannot be empty.");
    if (text("email") && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text("email"))) errors.push("Clinic email is not a valid email address.");
    if (text("googleMapsEmbedUrl") && !MAPS_EMBED_PATTERN.test(text("googleMapsEmbedUrl"))) {
      errors.push("Google Maps embed URL must be a https://www.google.com/maps/embed?… link.");
    }
    for (const k of ["googleMapsDirectionsUrl", "facebook", "instagram"]) {
      if (!isSafeCmsUrl(text(k), false)) errors.push(`${label(k)} must start with https://`);
    }
    const slots = draft.timeSlots as { time: string }[] | undefined;
    if (slots?.some((s) => !String(s.time ?? "").trim())) errors.push("Every booking time slot needs a time.");
    const insurers = draft.insuranceProviders as string[] | undefined;
    if (insurers?.some((n) => !String(n).trim())) errors.push("Remove empty insurance provider rows.");
  }

  if (scope === "doctor") {
    if ("doctorName" in draft && !text("doctorName")) errors.push("Doctor name cannot be empty.");
    for (const k of ["heroImageUrl", "fellowshipImageUrl"]) {
      if (!isSafeCmsUrl(text(k), true)) errors.push(`${label(k)} must be an https:// URL or a /path on this site.`);
    }
  }

  if (scope === "branding") {
    if (text("logoInitials").length > 4) errors.push("Logo initials can be at most 4 characters.");
    const b = (draft.branding ?? {}) as Record<string, unknown>;
    const btext = (k: string) => (typeof b[k] === "string" ? (b[k] as string).trim() : "");
    for (const k of ["logoUrl", "faviconUrl"]) {
      if (!isSafeCmsUrl(btext(k), true)) errors.push(`${label(`branding.${k}`)} must be an https:// URL or a /path on this site.`);
    }
    for (const k of ["googleMapsUrl", "youtubeUrl"]) {
      if (!isSafeCmsUrl(btext(k), false)) errors.push(`${label(`branding.${k}`)} must start with https://`);
    }
    for (const k of ["headerCtaLink", "announcementLinkUrl"]) {
      if (!isSafeCmsUrl(btext(k), true)) errors.push(`${label(`branding.${k}`)} must be an internal path (/…) or an https:// URL.`);
    }
    for (const k of ["primaryHsl", "accentHsl"]) {
      if (btext(k) && !HSL_PATTERN.test(btext(k))) errors.push(`${label(`branding.${k}`)} must look like "180 45% 22%".`);
    }
    const nav = b.navItems as { label?: string; to?: string }[] | undefined;
    for (const item of nav ?? []) {
      if (!String(item.label ?? "").trim()) errors.push("Every navigation item needs a label.");
      if (!item.to || !isSafeCmsUrl(item.to, true)) {
        errors.push(`Navigation link "${item.label ?? ""}" must be an internal path (/…) or an https:// URL.`);
      }
    }
  }

  return Array.from(new Set(errors));
}
