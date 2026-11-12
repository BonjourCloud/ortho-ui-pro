/**
 * The frontend allow-lists must equal the SQL allow-lists in 005c / 005d, otherwise the CMS would
 * show fields the database silently drops (or the reverse). Also checks the scope validators.
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { BRANDING_OBJECT_KEYS, SITE_CONFIG_SCOPE_KEYS, isSafeCmsUrl, validateScopeDraft } from "@/lib/cms/siteConfigScopes";
import { COLLECTION_DEFINITIONS, type CollectionKey } from "@/lib/cms/collections";
import type { SiteConfig } from "@/contexts/SiteConfigContext";

const dir = resolve(__dirname, "../../../docs/proposed-migrations");
const sql005c = readFileSync(resolve(dir, "005c_clinic_draft_workflow.sql"), "utf8");
const sql005d = readFileSync(resolve(dir, "005d_collection_drafts.sql"), "utf8");

function arrayInFunction(sql: string, fn: string): string[] {
  const start = sql.indexOf(`FUNCTION public.${fn}(`);
  expect(start, `${fn} not found`).toBeGreaterThan(-1);
  const m = sql.slice(start).match(/ARRAY\[([\s\S]*?)\]/);
  return m![1].split(",").map((s) => s.trim().replace(/'/g, "")).filter(Boolean).sort();
}

function collectionColumns(key: CollectionKey): string[] {
  const m = sql005d.match(new RegExp(`WHEN '${key}' THEN ARRAY\\[([\\s\\S]*?)\\]`));
  expect(m, `${key} columns not found`).not.toBeNull();
  return m![1].split(",").map((s) => s.trim().replace(/'/g, "")).filter(Boolean).sort();
}

describe("allow-lists match the proposed SQL", () => {
  it.each([
    ["clinic", "clinic_config_keys"],
    ["doctor", "doctor_config_keys"],
    ["branding", "branding_config_keys"],
  ] as const)("%s scope keys = %s()", (scope, fn) => {
    expect([...SITE_CONFIG_SCOPE_KEYS[scope]].sort()).toEqual(arrayInFunction(sql005c, fn));
  });

  it("branding object keys = branding_object_keys()", () => {
    expect([...BRANDING_OBJECT_KEYS].sort()).toEqual(arrayInFunction(sql005c, "branding_object_keys"));
  });

  it.each(["services", "blog_posts", "case_studies", "testimonials"] as const)("%s columns = collection_columns()", (key) => {
    expect([...COLLECTION_DEFINITIONS[key].columns].sort()).toEqual(collectionColumns(key));
  });

  it("no scope can write another scope's keys", () => {
    const all = [...SITE_CONFIG_SCOPE_KEYS.clinic, ...SITE_CONFIG_SCOPE_KEYS.doctor, ...SITE_CONFIG_SCOPE_KEYS.branding];
    expect(new Set(all).size).toBe(all.length);
  });
});

describe("scope validation mirrors validate_site_config_patch()", () => {
  it("URL rule", () => {
    expect(isSafeCmsUrl("", true)).toBe(true);
    expect(isSafeCmsUrl("/about", true)).toBe(true);
    expect(isSafeCmsUrl("https://example.com/x", false)).toBe(true);
    expect(isSafeCmsUrl("/about", false)).toBe(false);
    expect(isSafeCmsUrl("//evil.example", true)).toBe(false);
    expect(isSafeCmsUrl("javascript:alert(1)", true)).toBe(false);
    expect(isSafeCmsUrl("http://example.com", false)).toBe(false);
  });

  it("doctor: rating range and image URLs", () => {
    expect(validateScopeDraft("doctor", { googleRating: 6 } as Partial<SiteConfig>)).toHaveLength(1);
    expect(validateScopeDraft("doctor", { heroImageUrl: "javascript:x" } as Partial<SiteConfig>)).toHaveLength(1);
    expect(validateScopeDraft("doctor", { heroImageUrl: "/images/a.jpg", googleRating: 4.8 } as Partial<SiteConfig>)).toEqual([]);
  });

  it("branding: colours, nav links and CTA links", () => {
    const bad = validateScopeDraft("branding", {
      branding: {
        primaryHsl: "red; background:url(x)",
        headerCtaLink: "javascript:alert(1)",
        navItems: [{ id: "home", label: "Home", to: "data:text/html,x", visible: true, sortOrder: 1 }],
      },
    } as Partial<SiteConfig>);
    expect(bad.length).toBe(3);
    const ok = validateScopeDraft("branding", {
      logoInitials: "OH",
      branding: { primaryHsl: "180 45% 22%", headerCtaLink: "/book", navItems: [{ id: "home", label: "Home", to: "/", visible: true, sortOrder: 1 }] },
    } as Partial<SiteConfig>);
    expect(ok).toEqual([]);
  });
});
