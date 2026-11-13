import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { can, type CmsRole } from "@/lib/permissions";
import {
  isAssignableCmsRole,
  isValidEmail,
  isValidUuid,
  validateAdminUserRequest,
} from "@/lib/cms/adminUsersValidation";
import AdminApp from "@/admin/AdminApp";

let mockRole: CmsRole = "super_admin";

vi.mock("@/contexts/AuthContext", () => ({
  AuthProvider: ({ children }: { children: React.ReactNode }) => children,
  useAuth: () => ({
    status: "authenticated",
    user: { id: "11111111-1111-4111-8111-111111111111", email: "super@orthocarehub.in" },
    role: mockRole,
    roleSource: "rpc",
    editorsCanPublish: false,
    sessionExpired: false,
    error: null,
    signIn: vi.fn(),
    signOut: vi.fn(),
    retry: vi.fn(),
    can: (cap: Parameters<typeof can>[1]) => can(mockRole, cap, { editorsCanPublish: false }),
  }),
}));

const mockSiteConfig = {};

vi.mock("@/contexts/SiteConfigContext", () => ({
  useSiteConfig: () => ({
    config: mockSiteConfig,
    loading: false,
    updateConfig: vi.fn(),
    refreshConfig: vi.fn(),
  }),
}));

vi.mock("@/integrations/supabase/client", () => {
  const emptyResult = { data: [], count: 0, error: null };
  const makeBuilder = () => {
    const promise = Promise.resolve(emptyResult);
    return {
      select: () => makeBuilder(),
      eq: () => makeBuilder(),
      order: () => makeBuilder(),
      limit: () => makeBuilder(),
      maybeSingle: () => Promise.resolve({ data: null, error: null }),
      then: promise.then.bind(promise),
      catch: promise.catch.bind(promise),
      finally: promise.finally.bind(promise),
    };
  };
  return {
    supabase: {
      from: () => makeBuilder(),
      rpc: async () => ({ data: null, error: null }),
      auth: { signOut: vi.fn(), updateUser: vi.fn() },
      functions: { invoke: vi.fn(async () => ({ data: { users: [] }, error: null })) },
    },
  };
});

function renderAdminAt(path = "/admin/pages") {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/admin/*" element={<AdminApp />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("Iteration 5: RESPONSIVE-001 & Edge Function Security Validation", () => {
  beforeEach(() => {
    mockRole = "super_admin";
  });

  describe("RESPONSIVE-001: Desktop, Tablet, and Mobile Admin Layout & Navigation", () => {
    it("renders fixed desktop sidebar and mobile Sheet drawer trigger button for tablet/mobile viewports", () => {
      renderAdminAt("/admin/pages");

      // Desktop navigation landmark is present
      const desktopNav = screen.getByRole("navigation", { name: "Admin" });
      expect(desktopNav).toBeInTheDocument();

      // Mobile/Tablet drawer trigger button is present with accessible label
      const mobileTrigger = screen.getByRole("button", { name: /open navigation menu/i });
      expect(mobileTrigger).toBeInTheDocument();

      // Opening mobile drawer renders a second navigation list inside the Sheet dialog
      fireEvent.click(mobileTrigger);
      expect(screen.getByRole("dialog")).toBeInTheDocument();
      const allNavs = screen.getAllByRole("navigation", { name: "Admin", hidden: true });
      expect(allNavs.length).toBe(2);
    });

    it("renders responsive skip-to-content accessibility link and main workspace landmark", () => {
      renderAdminAt("/admin/clinic");
      const skipLink = screen.getByRole("link", { name: /skip to content/i });
      expect(skipLink).toHaveAttribute("href", "#admin-main");
      expect(screen.getByRole("main")).toHaveAttribute("id", "admin-main");
    });
  });

  describe("SEC-001 & ROLE-004..005: admin-users Edge Function Security & Input Validation", () => {
    const CALLER_UID = "11111111-1111-4111-8111-111111111111";
    const OTHER_UID = "22222222-2222-4222-8222-222222222222";

    it("rejects requests with missing Authorization header (HTTP 401)", () => {
      const res = validateAdminUserRequest({
        hasAuthHeader: false,
        callerUid: null,
        isSuperAdmin: false,
        rawBody: { action: "list" },
      });
      expect(res).toEqual({
        ok: false,
        status: 401,
        error: "Missing Authorization Bearer token",
      });
    });

    it("rejects requests with invalid or expired JWT (HTTP 401)", () => {
      const res = validateAdminUserRequest({
        hasAuthHeader: true,
        callerUid: null,
        isSuperAdmin: false,
        rawBody: { action: "list" },
      });
      expect(res).toEqual({
        ok: false,
        status: 401,
        error: "Invalid or expired session",
      });
    });

    it("rejects Editor or non-Super-Admin callers with HTTP 403 Forbidden (blocks privilege escalation)", () => {
      const res = validateAdminUserRequest({
        hasAuthHeader: true,
        callerUid: OTHER_UID,
        isSuperAdmin: false,
        rawBody: { action: "set_role", userId: OTHER_UID, role: "super_admin" },
      });
      expect(res).toEqual({
        ok: false,
        status: 403,
        error: "Forbidden: Super Admin access required",
      });
    });

    it("validates email, rejects admin-set passwords, and enforces a strict role allowlist on 'create'", () => {
      expect(
        validateAdminUserRequest({
          hasAuthHeader: true,
          callerUid: CALLER_UID,
          isSuperAdmin: true,
          rawBody: { action: "create", email: "not-an-email", role: "editor" },
        }).status,
      ).toBe(400);

      // Rejects unknown/injected role strings such as 'admin' or 'owner'
      expect(
        validateAdminUserRequest({
          hasAuthHeader: true,
          callerUid: CALLER_UID,
          isSuperAdmin: true,
          rawBody: { action: "create", email: "doc@orthocarehub.in", role: "root" },
        }).status,
      ).toBe(400);

      // Rejects any administrator-chosen password (invitation-only onboarding)
      expect(
        validateAdminUserRequest({
          hasAuthHeader: true,
          callerUid: CALLER_UID,
          isSuperAdmin: true,
          rawBody: { action: "create", email: "doc@orthocarehub.in", password: "StrongPassword123!", role: "editor" },
        }).status,
      ).toBe(400);
      expect(
        validateAdminUserRequest({
          hasAuthHeader: true,
          callerUid: CALLER_UID,
          isSuperAdmin: true,
          rawBody: { action: "create", email: "doc@orthocarehub.in", password: "short", role: "editor" },
        }).status,
      ).toBe(400);

      // Accepts valid Editor creation and normalizes email
      const valid = validateAdminUserRequest({
        hasAuthHeader: true,
        callerUid: CALLER_UID,
        isSuperAdmin: true,
        rawBody: {
          action: "create",
          email: "  Test_Doctor@OrthoCareHub.in ",
          displayName: "Dr. Test",
          role: "editor",
        },
      });
      expect(valid).toEqual({
        ok: true,
        status: 200,
        sanitized: {
          action: "create",
          email: "test_doctor@orthocarehub.in",
          displayName: "Dr. Test",
          role: "editor",
        },
      });
    });

    it("prevents Super Admin from demoting or disabling their own account (self-lockout guard)", () => {
      const selfDemote = validateAdminUserRequest({
        hasAuthHeader: true,
        callerUid: CALLER_UID,
        isSuperAdmin: true,
        rawBody: { action: "set_role", userId: CALLER_UID, role: "editor" },
      });
      expect(selfDemote.ok).toBe(false);
      expect(selfDemote.status).toBe(400);
      expect(selfDemote.error).toMatch(/self-lockout prevention/i);

      const selfDisable = validateAdminUserRequest({
        hasAuthHeader: true,
        callerUid: CALLER_UID,
        isSuperAdmin: true,
        rawBody: { action: "set_active", userId: CALLER_UID, isActive: false },
      });
      expect(selfDisable.ok).toBe(false);
      expect(selfDisable.status).toBe(400);
      expect(selfDisable.error).toMatch(/self-lockout prevention/i);

      // Changing another user's role or active status succeeds
      const otherRole = validateAdminUserRequest({
        hasAuthHeader: true,
        callerUid: CALLER_UID,
        isSuperAdmin: true,
        rawBody: { action: "set_role", userId: OTHER_UID, role: "editor" },
      });
      expect(otherRole.ok).toBe(true);
    });

    it("helper validators check UUIDs, emails, and assignable roles accurately", () => {
      expect(isValidUuid(CALLER_UID)).toBe(true);
      expect(isValidUuid("not-a-uuid")).toBe(false);
      expect(isValidEmail("doctor@orthocarehub.in")).toBe(true);
      expect(isValidEmail("bad@")).toBe(false);
      expect(isAssignableCmsRole("editor")).toBe(true);
      expect(isAssignableCmsRole("super_admin")).toBe(true);
      expect(isAssignableCmsRole("admin")).toBe(false);
    });
  });
});
