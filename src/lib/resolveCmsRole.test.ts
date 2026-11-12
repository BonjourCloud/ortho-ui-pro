import { describe, expect, it, vi } from "vitest";
import { isMissingFunctionError, resolveCmsRole, type RoleClient } from "@/lib/resolveCmsRole";

type Reply = { data: unknown; error: { code?: string; message: string } | null };

function client(replies: Record<string, Reply>): RoleClient & { rpc: ReturnType<typeof vi.fn> } {
  return { rpc: vi.fn(async (fn: string) => replies[fn] ?? { data: null, error: { message: `unexpected ${fn}` } }) };
}

const MISSING = { code: "PGRST202", message: "Could not find the function public.current_cms_role without parameters in the schema cache" };

describe("resolveCmsRole", () => {
  it.each(["super_admin", "editor", "legacy_admin"])("returns %s from current_cms_role()", async (r) => {
    const c = client({ current_cms_role: { data: r, error: null } });
    await expect(resolveCmsRole(c, "u1")).resolves.toEqual({ role: r, source: "rpc" });
    expect(c.rpc).toHaveBeenCalledTimes(1);
  });

  it("null from the database means no CMS access and does NOT fall back to the legacy check", async () => {
    const c = client({ current_cms_role: { data: null, error: null }, has_role: { data: true, error: null } });
    await expect(resolveCmsRole(c, "u1")).resolves.toEqual({ role: null, source: "rpc" });
    expect(c.rpc).not.toHaveBeenCalledWith("has_role", expect.anything());
  });

  it("ignores an unknown role string from the server", async () => {
    const c = client({ current_cms_role: { data: "owner", error: null } });
    await expect(resolveCmsRole(c, "u1")).resolves.toEqual({ role: null, source: "rpc" });
  });

  it("falls back to has_role('admin') only when the function is not deployed", async () => {
    const yes = client({ current_cms_role: { data: null, error: MISSING }, has_role: { data: true, error: null } });
    await expect(resolveCmsRole(yes, "u1")).resolves.toEqual({ role: "legacy_admin", source: "legacy" });
    expect(yes.rpc).toHaveBeenCalledWith("has_role", { _user_id: "u1", _role: "admin" });

    const no = client({ current_cms_role: { data: null, error: MISSING }, has_role: { data: false, error: null } });
    await expect(resolveCmsRole(no, "u1")).resolves.toEqual({ role: null, source: "legacy" });
  });

  it("only treats has_role === true as admin (truthy strings do not count)", async () => {
    const c = client({ current_cms_role: { data: null, error: MISSING }, has_role: { data: "true", error: null } });
    await expect(resolveCmsRole(c, "u1")).resolves.toMatchObject({ role: null });
  });

  it("throws on unexpected errors instead of granting or denying silently", async () => {
    const c = client({ current_cms_role: { data: null, error: { code: "500", message: "boom" } } });
    await expect(resolveCmsRole(c, "u1")).rejects.toThrow("boom");
  });

  it("throws if the legacy fallback itself fails", async () => {
    const c = client({ current_cms_role: { data: null, error: MISSING }, has_role: { data: null, error: { message: "denied" } } });
    await expect(resolveCmsRole(c, "u1")).rejects.toThrow("denied");
  });
});

describe("isMissingFunctionError", () => {
  it("recognises missing-function signals only", () => {
    expect(isMissingFunctionError({ code: "PGRST202", message: "x" })).toBe(true);
    expect(isMissingFunctionError({ code: "42883", message: "x" })).toBe(true);
    expect(isMissingFunctionError({ message: "Could not find the function foo" })).toBe(true);
    expect(isMissingFunctionError({ code: "42501", message: "permission denied for function" })).toBe(false);
    expect(isMissingFunctionError({ message: "network error" })).toBe(false);
  });
});
