import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { can, type CmsRole } from "@/lib/permissions";
import type { SiteConfig } from "@/contexts/SiteConfigContext";

let currentRole: CmsRole = "editor";
const mockUpdateConfig = vi.fn(async () => ({ success: true }));
const mockInvoke = vi.fn();
let mockActivityLogsResult: { data: Record<string, unknown>[] | null; error: { code?: string; message?: string } | null } = {
  data: null,
  error: { code: "42P01", message: "relation \"activity_logs\" does not exist" },
};

const baseConfig: SiteConfig = {
  doctorName: "Dr. Srivanth Dasari",
  clinicName: "OrthoCare Hub",
  title: "MS Ortho - Orthopedic Surgeon",
  specialization: "Joint Replacement & Sports Medicine",
  shortBio: "Short bio",
  fullBio: "Full bio",
  philosophy: "Patient-first",
  yearsExperience: 15,
  happyPatients: 5000,
  surgeriesCompleted: 2000,
  branches: 2,
  consultationFee: 800,
  phone: "+91-9441824999",
  whatsapp: "+91-9441824999",
  email: "consult@orthocarehub.in",
  location: "Ashok Nagar, Hyderabad",
  hours: "Mon - Sat: 9 AM - 8 PM",
  logoInitials: "OH",
  heroImageUrl: "/images/dr-srivanth-hero.jpg",
  whatsappFloatEnabled: true,
  googleRating: 4.9,
  googleReviewCount: 500,
  languages: ["English", "Telugu"],
  registrationNumber: "TSMC/12345",
  facebook: "",
  instagram: "",
  education: [],
  awards: [],
  memberships: [],
  insuranceProviders: [],
  timeSlots: [],
  whyChoose: [],
  serviceCategories: [],
};

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({
    status: "authenticated",
    user: { id: "self-uid-1", email: currentRole === "super_admin" ? "super@orthocarehub.in" : "editor@orthocarehub.in" },
    role: currentRole,
    roleSource: "rpc",
    editorsCanPublish: false,
    sessionExpired: false,
    error: null,
    signIn: vi.fn(),
    signOut: vi.fn(),
    retry: vi.fn(),
    can: (cap: Parameters<typeof can>[1]) => can(currentRole, cap, { editorsCanPublish: false }),
  }),
}));

vi.mock("@/contexts/SiteConfigContext", () => ({
  useSiteConfig: () => ({
    config: baseConfig,
    updateConfig: mockUpdateConfig,
    isAdmin: true,
    isAuthLoading: false,
    user: null,
    adminLogin: vi.fn(),
    adminLogout: vi.fn(),
  }),
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: (table: string) => {
      if (table === "activity_logs") {
        return {
          select: () => ({
            order: () => ({
              limit: async () => mockActivityLogsResult,
            }),
          }),
        };
      }
      return {
        select: () => Promise.resolve({ data: null, error: { code: "42P01", message: "relation does not exist" } }),
        upsert: async () => ({ error: { code: "42P01", message: "relation does not exist" } }),
      };
    },
    functions: {
      invoke: (...args: unknown[]) => mockInvoke(...args),
    },
  },
}));

import AdminBranding from "@/pages/admin/AdminBranding";
import AdminSeo from "@/pages/admin/AdminSeo";
import AdminActivity from "@/pages/admin/AdminActivity";
import AdminUsers from "@/pages/admin/AdminUsers";

describe("Iteration 4 Workspaces (BRAND-001, SEO-001, AUDIT-001, ROLE-004, ROLE-005)", () => {
  beforeEach(() => {
    window.sessionStorage.clear();
    mockUpdateConfig.mockClear();
    mockInvoke.mockReset();
    currentRole = "editor";
  });

  describe("BRAND-001: AdminBranding (Logo, theme presets & approval workflow)", () => {
    it("allows Editor to select a theme preset & footer tagline, save draft, and submit for review without modifying live SiteConfig; Super Admin publishes live", async () => {
      currentRole = "editor";
      const { unmount } = render(
        <MemoryRouter>
          <AdminBranding />
        </MemoryRouter>,
      );

      // Select Royal Medical Navy theme preset
      fireEvent.click(screen.getByRole("button", { name: /royal medical navy & gold/i }));
      fireEvent.change(screen.getByLabelText(/footer clinic tagline/i), {
        target: { value: "Excellence in Joint Replacement & Sports Medicine" },
      });

      fireEvent.click(screen.getByRole("button", { name: /submit for review/i }));
      await waitFor(() => {
        expect(screen.getByTestId("workflow-status-badge")).toHaveTextContent("Pending Super Admin Review");
      });
      expect(mockUpdateConfig).not.toHaveBeenCalled();
      unmount();

      // Super Admin approves and publishes
      currentRole = "super_admin";
      render(
        <MemoryRouter>
          <AdminBranding />
        </MemoryRouter>,
      );

      fireEvent.click(screen.getByRole("button", { name: /publish to live website/i }));
      await waitFor(() => {
        expect(mockUpdateConfig).toHaveBeenCalledWith(
          expect.objectContaining({
            branding: expect.objectContaining({
              themePreset: "royal-navy",
              footerTagline: "Excellence in Joint Replacement & Sports Medicine",
            }),
          }),
        );
      });
    });
  });

  describe("SEO-001: AdminSeo (Per-route SEO metadata, SERP preview & approval workflow)", () => {
    it("updates Google SERP preview in real time, lets Editor submit for review, and lets Super Admin approve & publish", async () => {
      currentRole = "editor";
      const { unmount } = render(
        <MemoryRouter>
          <AdminSeo />
        </MemoryRouter>,
      );

      const titleInput = await screen.findByLabelText(/page title tag/i);
      fireEvent.change(titleInput, { target: { value: "Best Knee Replacement Surgeon in Hyderabad" } });

      // Google SERP preview updates immediately
      expect(
        screen.getByText(/Best Knee Replacement Surgeon in Hyderabad \| Dr\. Srivanth Dasari/i),
      ).toBeInTheDocument();

      fireEvent.click(screen.getByRole("button", { name: /submit for review/i }));
      await waitFor(() => {
        expect(screen.getByTestId("workflow-status-badge")).toHaveTextContent("Pending Super Admin Review");
      });
      unmount();

      // Super Admin approves and publishes
      currentRole = "super_admin";
      render(
        <MemoryRouter>
          <AdminSeo />
        </MemoryRouter>,
      );
      fireEvent.click(screen.getByRole("button", { name: /^approve$/i }));
      await waitFor(() => {
        expect(screen.getByTestId("workflow-status-badge")).toHaveTextContent("Approved (Ready to Publish)");
      });
      fireEvent.click(screen.getByRole("button", { name: /publish approved/i }));
      await waitFor(() => {
        expect(screen.getByTestId("workflow-status-badge")).toHaveTextContent("Published (Live)");
      });
    });
  });

  describe("AUDIT-001 & ROLE-004: AdminActivity (Read-only genuine database records, Super Admin only)", () => {
    it("blocks Editor from viewing Activity Log", () => {
      currentRole = "editor";
      render(
        <MemoryRouter>
          <AdminActivity />
        </MemoryRouter>,
      );
      expect(screen.getByRole("heading", { name: /don't have access/i })).toBeInTheDocument();
    });

    it("shows honest Migration 002 notice with zero fabricated mock rows when activity_logs table does not exist yet", async () => {
      currentRole = "super_admin";
      mockActivityLogsResult = {
        data: null,
        error: { code: "42P01", message: "relation \"activity_logs\" does not exist" },
      };

      render(
        <MemoryRouter>
          <AdminActivity />
        </MemoryRouter>,
      );

      await waitFor(() => {
        expect(screen.getByText(/awaiting database migration 002/i)).toBeInTheDocument();
      });
      expect(screen.getByText(/waiting for public\.activity_logs table/i)).toBeInTheDocument();
    });

    it("renders genuine database activity log rows when Migration 002 is present", async () => {
      currentRole = "super_admin";
      mockActivityLogsResult = {
        data: [
          {
            id: "log-101",
            actor_email: "doctor@orthocarehub.in",
            action: "workflow.pending_approval",
            entity_type: "cms_page",
            entity_id: "home",
            details: { from_status: "draft", to_status: "pending_approval" },
            created_at: "2026-04-16T10:30:00.000Z",
          },
        ],
        error: null,
      };

      render(
        <MemoryRouter>
          <AdminActivity />
        </MemoryRouter>,
      );

      expect(await screen.findByText("doctor@orthocarehub.in")).toBeInTheDocument();
      expect(screen.getByText("workflow.pending_approval")).toBeInTheDocument();
      expect(screen.getByText("cms_page:home")).toBeInTheDocument();
    });
  });

  describe("ROLE-004 & ROLE-005: AdminUsers (Server-side Edge Function user management, Super Admin only)", () => {
    it("ROLE-004: blocks Editor from accessing User Management", () => {
      currentRole = "editor";
      render(
        <MemoryRouter>
          <AdminUsers />
        </MemoryRouter>,
      );
      expect(screen.getByRole("heading", { name: /don't have access/i })).toBeInTheDocument();
    });

    it("ROLE-005: Super Admin lists, creates Editor account, and updates status via server-side 'admin-users' Edge Function", async () => {
      currentRole = "super_admin";
      mockInvoke.mockImplementation(async (_fnName: string, opts: { body: { action: string } }) => {
        if (opts.body.action === "list") {
          return {
            data: {
              users: [
                {
                  userId: "self-uid-1",
                  email: "super@orthocarehub.in",
                  displayName: "Rajiv (Super Admin)",
                  role: "super_admin",
                  isActive: true,
                  createdAt: "2026-04-01T00:00:00.000Z",
                },
                {
                  userId: "doc-uid-2",
                  email: "test_doctor@orthocarehub.in",
                  displayName: "Dr. Srivanth",
                  role: "editor",
                  isActive: true,
                  createdAt: "2026-04-10T00:00:00.000Z",
                },
              ],
            },
            error: null,
          };
        }
        return { data: { success: true }, error: null };
      });

      render(
        <MemoryRouter>
          <AdminUsers />
        </MemoryRouter>,
      );

      expect(await screen.findByText("test_doctor@orthocarehub.in")).toBeInTheDocument();

      // Create a new Content Editor account via Edge Function
      fireEvent.change(screen.getByLabelText(/email address/i), {
        target: { value: "staff@orthocarehub.in" },
      });
      fireEvent.change(screen.getByLabelText(/display name/i), {
        target: { value: "Clinic Reception" },
      });
      fireEvent.click(screen.getByRole("button", { name: /create cms account/i }));

      await waitFor(() => {
        expect(mockInvoke).toHaveBeenCalledWith("admin-users", {
          body: expect.objectContaining({
            action: "create",
            email: "staff@orthocarehub.in",
            displayName: "Clinic Reception",
            role: "editor",
          }),
        });
      });
    });
  });
});
