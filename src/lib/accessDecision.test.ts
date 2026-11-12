import { describe, expect, it } from "vitest";
import { decideAccess } from "@/lib/accessDecision";
import { can, type CmsRole } from "@/lib/permissions";

const auth = (status: "loading" | "unauthenticated" | "authenticated" | "error", role: CmsRole | null) => ({
  status,
  role,
  can: (c: Parameters<typeof can>[1]) => can(role, c),
});

describe("decideAccess", () => {
  it("never allows while loading or errored, even with a role", () => {
    expect(decideAccess(auth("loading", "super_admin"), "users.manage")).toBe("loading");
    expect(decideAccess(auth("error", "super_admin"))).toBe("error");
  });
  it("sends unauthenticated users to login", () => {
    expect(decideAccess(auth("unauthenticated", null))).toBe("login");
    expect(decideAccess(auth("unauthenticated", "super_admin"), "users.manage")).toBe("login");
  });
  it("signed in without a role = no-role", () => {
    expect(decideAccess(auth("authenticated", null))).toBe("no-role");
  });
  it("forbids missing capability, allows present one", () => {
    expect(decideAccess(auth("authenticated", "editor"), "users.manage")).toBe("forbidden");
    expect(decideAccess(auth("authenticated", "editor"), "clinic.edit")).toBe("allowed");
    expect(decideAccess(auth("authenticated", "super_admin"), "users.manage")).toBe("allowed");
    expect(decideAccess(auth("authenticated", "editor"))).toBe("allowed");
  });
});
