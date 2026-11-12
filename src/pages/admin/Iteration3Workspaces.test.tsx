import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { can, type CmsRole } from "@/lib/permissions";
import type { SiteConfig } from "@/contexts/SiteConfigContext";

let currentRole: CmsRole = "editor";
const mockUpdateConfig = vi.fn(async () => ({ success: true }));

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
  timeSlots: [{ time: "10:00 AM", available: true }],
  whyChoose: [],
  serviceCategories: [],
};

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({
    status: "authenticated",
    user: { id: "u1", email: currentRole === "super_admin" ? "admin@orthocarehub.in" : "doctor@orthocarehub.in" },
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
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: async () => ({ data: null, error: { code: "42P01", message: "relation does not exist" } }),
        }),
        order: () => Promise.resolve({ data: [], error: null }),
      }),
      upsert: async () => ({ error: { code: "42P01", message: "relation does not exist" } }),
      update: () => ({
        eq: async () => ({ error: null }),
      }),
      insert: async () => ({ error: null }),
    }),
    storage: {
      from: () => ({
        upload: async () => ({ error: { message: "Bucket not found" } }),
        getPublicUrl: (path: string) => ({ data: { publicUrl: `https://example.invalid/${path}` } }),
      }),
    },
    rpc: vi.fn(async () => ({ data: null, error: null })),
  },
}));

import AdminPages from "@/pages/admin/AdminPages";
import AdminTreatments from "@/pages/admin/AdminTreatments";
import AdminClinic from "@/pages/admin/AdminClinic";
import AdminDoctor from "@/pages/admin/AdminDoctor";
import AdminMedia from "@/pages/admin/AdminMedia";
import { PreviewBanner } from "@/components/PreviewBanner";
import { parseHtmlToTreatmentBlocks, SITE_PAGE_CATALOG } from "@/lib/cms/types";

describe("Iteration 3 CMS Workspaces & Rajiv Approval Workflow", () => {
  beforeEach(() => {
    window.sessionStorage.clear();
    mockUpdateConfig.mockClear();
    currentRole = "editor";
  });

  describe("PAGE-001 & PAGE-002: AdminPages (Homepage sections & approval pipeline)", () => {
    it("allows Editor to edit Hero text, reorder/hide sections, save draft, and submit for Super Admin review without publishing", async () => {
      currentRole = "editor";
      render(
        <MemoryRouter>
          <AdminPages />
        </MemoryRouter>,
      );

      const badgeInput = await screen.findByLabelText(/top badge text/i);
      fireEvent.change(badgeInput, { target: { value: "Premier Ortho Center Hyderabad" } });

      // Hide Featured Procedures section
      const hideProcBtn = screen.getByRole("button", { name: /hide featured procedures/i });
      fireEvent.click(hideProcBtn);
      expect(screen.getByRole("button", { name: /show featured procedures/i })).toBeInTheDocument();

      // Editor saves draft
      fireEvent.click(screen.getByRole("button", { name: /save draft/i }));
      await waitFor(() => {
        expect(screen.getByTestId("workflow-status-badge")).toHaveTextContent("Draft");
      });

      // Editor submits for review
      fireEvent.click(screen.getByRole("button", { name: /submit for review/i }));
      await waitFor(() => {
        expect(screen.getByTestId("workflow-status-badge")).toHaveTextContent("Pending Super Admin Review");
      });

      // Editor cannot publish directly
      expect(screen.queryByRole("button", { name: /publish to live website/i })).not.toBeInTheDocument();
    });

    it("allows Super Admin to review a pending page submission, reject with feedback, or approve & publish", async () => {
      // First submit as Editor
      currentRole = "editor";
      const { unmount } = render(
        <MemoryRouter>
          <AdminPages />
        </MemoryRouter>,
      );
      await screen.findByLabelText(/top badge text/i);
      fireEvent.click(screen.getByRole("button", { name: /submit for review/i }));
      await waitFor(() => {
        expect(screen.getByTestId("workflow-status-badge")).toHaveTextContent("Pending Super Admin Review");
      });
      unmount();

      // Now open as Super Admin
      currentRole = "super_admin";
      render(
        <MemoryRouter>
          <AdminPages />
        </MemoryRouter>,
      );

      await waitFor(() => {
        expect(screen.getByTestId("workflow-status-badge")).toHaveTextContent("Pending Super Admin Review");
      });

      // Super Admin approves
      fireEvent.click(screen.getByRole("button", { name: /^approve$/i }));
      await waitFor(() => {
        expect(screen.getByTestId("workflow-status-badge")).toHaveTextContent("Approved (Ready to Publish)");
      });

      // Super Admin publishes
      fireEvent.click(screen.getByRole("button", { name: /publish approved/i }));
      await waitFor(() => {
        expect(screen.getByTestId("workflow-status-badge")).toHaveTextContent("Published (Live)");
      });
    });
  });

  describe("PAGE-003: AdminTreatments (Structured treatment page editing without SQL)", () => {
    it("allows editing clinical sections, toggling sanitized HTML preview, and submitting for review", async () => {
      currentRole = "editor";
      render(
        <MemoryRouter>
          <AdminTreatments />
        </MemoryRouter>,
      );

      const titleInput = await screen.findByLabelText(/treatment title/i);
      expect(titleInput).toHaveValue("Frozen Shoulder");

      // Add a new clinical section
      fireEvent.click(screen.getByRole("button", { name: /add clinical section/i }));
      const headings = screen.getAllByLabelText(/section \d+ heading/i);
      expect(headings.length).toBe(2);

      fireEvent.change(headings[1], { target: { value: "Key Symptoms of Frozen Shoulder" } });

      // Toggle live sanitized HTML preview
      fireEvent.click(screen.getByRole("button", { name: /toggle inline preview/i }));
      expect(screen.getByText("Sanitized HTML Preview")).toBeInTheDocument();
      expect(screen.getByText("Key Symptoms of Frozen Shoulder")).toBeInTheDocument();

      // Submit for review
      fireEvent.click(screen.getByRole("button", { name: /submit for review/i }));
      await waitFor(() => {
        expect(screen.getByTestId("workflow-status-badge")).toHaveTextContent("Pending Super Admin Review");
      });
    });
  });

  describe("CLINIC-001 & CLINIC-002: AdminClinic & AdminDoctor (Approval workflow & live config protection)", () => {
    it("CLINIC-001: without migration 005c the clinic workspace is read-only and never touches live site_config", async () => {
      // The shared supabase mock answers every table with 42P01 (relation does not exist).
      currentRole = "editor";
      const { unmount } = render(
        <MemoryRouter>
          <AdminClinic />
        </MemoryRouter>,
      );

      const alert = await screen.findByRole("alert");
      expect(alert).toHaveTextContent(/migration 005c has not been applied/i);

      const phoneInput = screen.getByLabelText(/primary phone number/i);
      fireEvent.change(phoneInput, { target: { value: "+91-9000011111" } });
      expect(screen.getByRole("button", { name: /submit for review/i })).toBeDisabled();
      expect(screen.getByRole("button", { name: /save draft/i })).toBeDisabled();
      expect(mockUpdateConfig).not.toHaveBeenCalled();
      unmount();

      // Super Admin cannot publish either: publishing only accepts an approved database draft.
      currentRole = "super_admin";
      render(
        <MemoryRouter>
          <AdminClinic />
        </MemoryRouter>,
      );
      await screen.findByRole("alert");
      expect(screen.getByRole("button", { name: /publish to live website/i })).toBeDisabled();
      expect(mockUpdateConfig).not.toHaveBeenCalled();
    });

    it("CLINIC-002: Editor updates doctor qualifications and selects portrait from MediaPickerModal", async () => {
      currentRole = "editor";
      render(
        <MemoryRouter>
          <AdminDoctor />
        </MemoryRouter>,
      );

      fireEvent.click(await screen.findByRole("button", { name: /add qualification/i }));
      expect(screen.getByLabelText(/degree 1/i)).toHaveValue("MS (Orthopaedics)");

      // Open MediaPickerModal and pick an image
      fireEvent.click(screen.getByRole("button", { name: /choose from media library/i }));
      const dialog = await screen.findByRole("dialog", { name: /select doctor portrait image/i });
      expect(dialog).toBeInTheDocument();

      fireEvent.click(screen.getByText(/dr-srivanth-hero\.jpg/i));
      fireEvent.click(screen.getByRole("button", { name: /use selected media/i }));

      await waitFor(() => {
        expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
      });

      // Without migration 005c nothing can be saved, and the live config is never written.
      expect(screen.getByRole("alert")).toHaveTextContent(/migration 005c has not been applied/i);
      expect(screen.getByRole("button", { name: /save draft/i })).toBeDisabled();
      expect(mockUpdateConfig).not.toHaveBeenCalled();
      // The full doctor workflow is covered in DraftWorkflowsDoctorBrandingCollections.test.tsx (DOCTOR-01).
    });
  });

  describe("MEDIA-001, MEDIA-002, MEDIA-003: AdminMedia (Upload validation & role-gated delete)", () => {
    it("MEDIA-001 & MEDIA-003: Editor can upload valid image, sees 'No delete' lock, and cannot delete media", async () => {
      currentRole = "editor";
      render(
        <MemoryRouter>
          <AdminMedia />
        </MemoryRouter>,
      );

      await screen.findByText("dr-srivanth-hero.jpg");

      // Editor sees "No delete" lock instead of Delete buttons
      expect(screen.queryByRole("button", { name: /^delete$/i })).not.toBeInTheDocument();
      expect(screen.getAllByText(/no delete/i).length).toBeGreaterThan(0);

      // Upload a valid PNG image
      const altInput = screen.getByLabelText(/alt text/i);
      fireEvent.change(altInput, { target: { value: "New clinic reception photo" } });

      const fileInput = screen.getByTestId("media-file-input");
      const validFile = new File(["fake-image-bytes"], "reception.png", { type: "image/png" });
      fireEvent.change(fileInput, { target: { files: [validFile] } });

      await waitFor(() => {
        expect(screen.getByText("reception.png")).toBeInTheDocument();
      });
    });

    it("MEDIA-002: Rejects unsupported file types with clear error alert", async () => {
      currentRole = "editor";
      render(
        <MemoryRouter>
          <AdminMedia />
        </MemoryRouter>,
      );

      const fileInput = screen.getByTestId("media-file-input");
      const badFile = new File(["bad"], "malware.exe", { type: "application/x-msdownload" });
      fireEvent.change(fileInput, { target: { files: [badFile] } });

      const alert = await screen.findByRole("alert");
      expect(alert).toHaveTextContent(/unsupported file type/i);
    });
  });

  describe("PreviewBanner (Authenticated preview visibility)", () => {
    it("renders nothing when usingDraft is false, and renders notice when usingDraft is true", () => {
      const { rerender } = render(
        <MemoryRouter>
          <PreviewBanner usingDraft={false} />
        </MemoryRouter>,
      );
      expect(screen.queryByRole("region", { name: /draft preview notice/i })).not.toBeInTheDocument();

      rerender(
        <MemoryRouter>
          <PreviewBanner usingDraft={true} workflowStatus="pending_approval" editorPath="/admin/pages" />
        </MemoryRouter>,
      );
      const region = screen.getByRole("region", { name: /draft preview notice/i });
      expect(region).toHaveTextContent(/cms draft preview/i);
      expect(region).toHaveTextContent(/pending super admin review/i);
    });
  });

  describe("Website-Wide CMS Coverage (All 11 Public Pages, HTML-to-Blocks Parser & Media Edit/Replace)", () => {
    it("renders selector for all 11 public pages and allows Editor -> Super Admin approval on secondary pages (e.g. /second-opinion)", async () => {
      currentRole = "editor";
      const { unmount } = render(
        <MemoryRouter>
          <AdminPages />
        </MemoryRouter>,
      );

      await screen.findByLabelText(/top badge text/i);
      expect(SITE_PAGE_CATALOG.length).toBe(11);

      // Switch to Second Opinion (/second-opinion)
      fireEvent.click(screen.getByRole("button", { name: /second opinion \(\/second-opinion\)/i }));

      const headingInput = await screen.findByLabelText(/hero main heading/i);
      expect(headingInput).toHaveValue("Been Advised Surgery? Get a Second Opinion");

      fireEvent.change(headingInput, { target: { value: "Specialist Second Opinion in Hyderabad" } });
      fireEvent.click(screen.getByRole("button", { name: /submit for review/i }));

      await waitFor(() => {
        expect(screen.getByTestId("workflow-status-badge")).toHaveTextContent("Pending Super Admin Review");
      });
      unmount();

      // Super Admin approves and publishes /second-opinion
      currentRole = "super_admin";
      render(
        <MemoryRouter>
          <AdminPages />
        </MemoryRouter>,
      );
      await screen.findByLabelText(/top badge text/i);
      fireEvent.click(screen.getByRole("button", { name: /second opinion \(\/second-opinion\)/i }));

      await waitFor(() => {
        expect(screen.getByTestId("workflow-status-badge")).toHaveTextContent("Pending Super Admin Review");
      });
      fireEvent.click(screen.getByRole("button", { name: /^approve$/i }));
      await waitFor(() => {
        expect(screen.getByTestId("workflow-status-badge")).toHaveTextContent("Approved (Ready to Publish)");
      });
      fireEvent.click(screen.getByRole("button", { name: /publish approved/i }));
      await waitFor(() => {
        expect(screen.getByTestId("workflow-status-badge")).toHaveTextContent("Published (Live)");
      });
    });

    it("parseHtmlToTreatmentBlocks preserves seeded headings, paragraphs, bullet lists, and inline <figure><img> illustrations", () => {
      const sampleSeededHtml = `
        <figure class="my-6"><img src="/images/treatments/rotator-cuff-tear.png" alt="Rotator cuff anatomy" /><figcaption>Rotator cuff tear overview</figcaption></figure>
        <h2>What is a Rotator Cuff Tear?</h2>
        <p>A rotator cuff tear is a common cause of pain and disability among adults.</p>
        <ul><li>Deep dull ache in the shoulder</li><li>Difficulty sleeping on the affected side</li></ul>
      `;
      const blocks = parseHtmlToTreatmentBlocks(sampleSeededHtml, "Rotator Cuff Tear");
      expect(blocks.length).toBeGreaterThanOrEqual(2);
      expect(blocks[0].imageUrl).toBe("/images/treatments/rotator-cuff-tear.png");
      expect(blocks[0].imageAlt).toBe("Rotator cuff anatomy");
      expect(blocks[1].heading).toBe("What is a Rotator Cuff Tear?");
      expect(blocks[1].body).toContain("common cause of pain");
      expect(blocks[1].bulletItems).toEqual([
        "Deep dull ache in the shoulder",
        "Difficulty sleeping on the affected side",
      ]);
    });

    it("allows editing media asset alt text, caption, and category in AdminMedia", async () => {
      currentRole = "editor";
      render(
        <MemoryRouter>
          <AdminMedia />
        </MemoryRouter>,
      );

      await screen.findByText("dr-srivanth-hero.jpg");
      const editButtons = screen.getAllByRole("button", { name: /^edit$/i });
      fireEvent.click(editButtons[0]);

      const dialog = await screen.findByRole("region", { name: /edit or replace selected media/i });
      expect(dialog).toBeInTheDocument();

      const saveBtn = screen.getByRole("button", { name: /save details/i });
      fireEvent.click(saveBtn);

      await waitFor(() => {
        expect(screen.getByText(/updated alt text, caption, and category/i)).toBeInTheDocument();
      });
    });
  });
});
