import { describe, expect, it } from "vitest";
import { ALL_CAPABILITIES, can, canAny, categoryOf, parseRole, type CapabilityCategory, type CmsRole } from "@/lib/permissions";

const EDITOR_FORBIDDEN_CATEGORIES: CapabilityCategory[] = ["destructive", "system", "users", "audit", "patient_data"];

describe("permissions", () => {
  it("denies everything when there is no role", () => {
    for (const c of ALL_CAPABILITIES) {
      expect(can(null, c)).toBe(false);
      expect(can(undefined, c)).toBe(false);
    }
  });

  it("super_admin has every capability", () => {
    for (const c of ALL_CAPABILITIES) expect(can("super_admin", c)).toBe(true);
  });

  it("every capability belongs to a category", () => {
    for (const c of ALL_CAPABILITIES) expect(categoryOf(c)).toBeTruthy();
  });

  describe("editor", () => {
    it("can manage approved website content and submit drafts for review", () => {
      for (const c of ["content.view", "content.edit", "content.create", "content.submit_review", "section.edit", "treatments.edit", "doctor.edit", "clinic.edit", "media.upload", "media.replace", "branding.edit", "seo.edit", "dashboard.view"] as const) {
        expect(can("editor", c), c).toBe(true);
      }
    });

    it("cannot approve content even if editorsCanPublish is true", () => {
      expect(can("editor", "content.approve")).toBe(false);
      expect(can("editor", "content.approve", { editorsCanPublish: true })).toBe(false);
    });

    it("can edit clinic address/phone/hours separately from system settings", () => {
      expect(can("editor", "clinic.edit")).toBe(true);
      expect(can("editor", "system.settings")).toBe(false);
      expect(can("editor", "security.settings")).toBe(false);
    });

    it("has no capability from destructive, system, users, audit or patient-data categories", () => {
      for (const c of ALL_CAPABILITIES) {
        if (EDITOR_FORBIDDEN_CATEGORIES.includes(categoryOf(c))) expect(can("editor", c), c).toBe(false);
      }
    });

    it("cannot delete pages, sections or media, or manage users", () => {
      expect(can("editor", "content.delete")).toBe(false);
      expect(can("editor", "section.delete")).toBe(false);
      expect(can("editor", "media.delete")).toBe(false);
      expect(can("editor", "users.manage")).toBe(false);
    });

    it("cannot publish unless editorsCanPublish is explicitly true", () => {
      expect(can("editor", "content.publish")).toBe(false);
      expect(can("editor", "content.publish", {})).toBe(false);
      expect(can("editor", "content.publish", { editorsCanPublish: false })).toBe(false);
      expect(can("editor", "content.publish", { editorsCanPublish: true })).toBe(true);
    });

    it("editorsCanPublish does not unlock anything else", () => {
      expect(can("editor", "content.delete", { editorsCanPublish: true })).toBe(false);
      expect(can("editor", "users.manage", { editorsCanPublish: true })).toBe(false);
    });
  });

  describe("legacy_admin", () => {
    it("keeps today's content and inbox abilities, including content deletes", () => {
      expect(can("legacy_admin", "content.delete")).toBe(true);
      expect(can("legacy_admin", "patientData.view")).toBe(true);
      expect(can("legacy_admin", "clinic.edit")).toBe(true);
    });
    it("cannot bypass Super Admin restrictions (users, audit, system/security settings)", () => {
      expect(can("legacy_admin", "users.manage")).toBe(false);
      expect(can("legacy_admin", "activity.view")).toBe(false);
      expect(can("legacy_admin", "system.settings")).toBe(false);
      expect(can("legacy_admin", "security.settings")).toBe(false);
    });
  });

  it("canAny works", () => {
    expect(canAny("editor", ["users.manage", "clinic.edit"])).toBe(true);
    expect(canAny("editor", ["users.manage", "activity.view"])).toBe(false);
  });

  it("parseRole only accepts known roles", () => {
    const valid: CmsRole[] = ["super_admin", "editor", "legacy_admin"];
    for (const r of valid) expect(parseRole(r)).toBe(r);
    for (const bad of ["admin", "root", "", null, undefined, 1, {}, "SUPER_ADMIN"]) expect(parseRole(bad)).toBeNull();
  });

  it("an unknown role string smuggled in at runtime gets no access", () => {
    expect(can("hacker" as unknown as CmsRole, "dashboard.view")).toBe(false);
  });
});
