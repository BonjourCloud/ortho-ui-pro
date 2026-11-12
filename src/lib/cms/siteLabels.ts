/**
 * Site-wide UI labels that are not tied to one page (header/footer headings, review badges,
 * the 404 page, shared buttons). Stored in `site_config.branding.labels` and edited in the
 * Branding workspace, so they go through the same draft → approval → publish workflow.
 *
 * The defaults are exactly the text the website showed before these labels became editable,
 * so an empty `labels` object renders the site unchanged.
 */
import type { SiteConfig } from "@/contexts/SiteConfigContext";

export const SITE_LABEL_DEFAULTS = {
  footerQuickLinksHeading: "Quick Links",
  footerContactHeading: "Contact",
  footerFollowHeading: "Follow Us",
  footerRightsText: "All rights reserved.",
  footerBookLabel: "Book Appointment",
  adminLinkLabel: "Admin Dashboard",
  reviewVerifiedBadge: "✓ Verified Google Review",
  reviewDoctorResponseLabel: "Doctor's Response:",
  reviewSourceLabel: "Google Review",
  reviewSummaryTemplate: "{rating} / 5 based on {count}+ Google reviews",
  videoFallbackText: "Your browser does not support the video tag.",
  notFoundHeading: "Oops! Page not found",
  notFoundLinkLabel: "Return to Home",
  loadingText: "Loading...",
  backToHomeLabel: "← Back to Home",
} as const;

export type SiteLabelKey = keyof typeof SITE_LABEL_DEFAULTS;

export const SITE_LABEL_TITLES: Record<SiteLabelKey, string> = {
  footerQuickLinksHeading: "Footer: “Quick Links” heading",
  footerContactHeading: "Footer: “Contact” heading",
  footerFollowHeading: "Footer: “Follow Us” heading",
  footerRightsText: "Footer: rights text after the default copyright line",
  footerBookLabel: "Footer: booking link label",
  adminLinkLabel: "Header: link shown to signed-in CMS staff",
  reviewVerifiedBadge: "Home reviews: verified badge",
  reviewDoctorResponseLabel: "Home reviews: doctor response label",
  reviewSourceLabel: "Home reviews: source label under the name",
  reviewSummaryTemplate: "Home reviews: rating summary ({rating} and {count} are filled in)",
  videoFallbackText: "Video fallback text (old browsers)",
  notFoundHeading: "404 page: heading",
  notFoundLinkLabel: "404 page: link back home",
  loadingText: "Loading message",
  backToHomeLabel: "Not-found sections: link back home",
};

/** Returns the published (or previewed) label, falling back to the original website text. */
export function siteLabel(config: Pick<SiteConfig, "branding"> | null | undefined, key: SiteLabelKey): string {
  const value = config?.branding?.labels?.[key];
  return typeof value === "string" && value.trim() !== "" ? value : SITE_LABEL_DEFAULTS[key];
}

/** Fills `{placeholders}` in a label template. */
export function fillTemplate(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (match, name: string) => (name in values ? String(values[name]) : match));
}

/** Reads a page's editable label (`SitePageContent.customLabels`), falling back to the original text. */
export function pageLabel(
  page: { customLabels?: Record<string, string> } | null | undefined,
  key: string,
  fallback: string,
): string {
  const value = page?.customLabels?.[key];
  return typeof value === "string" && value.trim() !== "" ? value : fallback;
}

/** Like `siteLabel`, but falls back to a caller-supplied value (e.g. translated text) when unset. */
export function siteLabelOr(config: Pick<SiteConfig, "branding"> | null | undefined, key: SiteLabelKey, fallback: string): string {
  const value = config?.branding?.labels?.[key];
  return typeof value === "string" && value.trim() !== "" ? value : fallback;
}
