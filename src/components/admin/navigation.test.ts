import { describe, expect, it } from "vitest";
import { ADMIN_NAV, getVisibleNav, groupNav } from "@/components/admin/navigation";

const labels = (role: Parameters<typeof getVisibleNav>[0]) => getVisibleNav(role).map((i) => i.label);

describe("admin navigation", () => {
  it("shows nothing without a role", () => {
    expect(getVisibleNav(null)).toEqual([]);
  });
  it("editor sees content modules but not users, activity log or patient inboxes", () => {
    const l = labels("editor");
    expect(l).toContain("Dashboard");
    expect(l).toContain("Clinic & site settings");
    expect(l).toContain("Media library");
    expect(l).toContain("Branding & theme");
    expect(l).not.toContain("Users");
    expect(l).not.toContain("Activity log");
    expect(l).not.toContain("Appointments");
    expect(l).not.toContain("Second opinions");
  });
  it("super admin sees everything", () => {
    expect(getVisibleNav("super_admin")).toHaveLength(ADMIN_NAV.length);
  });
  it("legacy admin does not see modules that need unapplied database tables", () => {
    const l = labels("legacy_admin");
    expect(l).toContain("Appointments");
    expect(l).not.toContain("Users");
    expect(l).not.toContain("Activity log");
  });
  it("routes are unique and live under /admin", () => {
    const paths = ADMIN_NAV.map((i) => i.to);
    expect(new Set(paths).size).toBe(paths.length);
    for (const p of paths) expect(p.startsWith("/admin")).toBe(true);
  });
  it("groups drop empty groups", () => {
    const groups = groupNav(getVisibleNav("editor")).map((g) => g.group);
    expect(groups).not.toContain("Administration");
    expect(groups).not.toContain("Inbox");
  });
});
