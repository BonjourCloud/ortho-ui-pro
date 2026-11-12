/**
 * Doctor Profile, Branding (005c) and Collections (005d) draft workflows against the in-memory
 * stand-in in src/test/fakeCmsDb.ts. Proves the UI: never writes live tables, routes every change
 * through drafts, only publishes approved drafts, requires feedback to reject, and blocks unsafe links.
 * Database enforcement itself is covered by the 006 harness on a real staging project.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { can, type CmsRole } from "@/lib/permissions";
import { createFakeDb, createFakeSupabase, fakeUuid, type FakeDbState } from "@/test/fakeCmsDb";

const liveConfig = {
  doctorName: "Dr. Srivanth Dasari",
  clinicName: "OrthoCare Hub",
  title: "MS Ortho",
  specialization: "Joint Replacement",
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
  heroImageUrl: "",
  whatsappFloatEnabled: true,
  googleRating: 4.9,
  googleReviewCount: 500,
  languages: ["English"],
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
  branding: {},
};

let currentRole: CmsRole = "editor";
let db: FakeDbState = createFakeDb(liveConfig);
const reloadConfig = vi.fn(async () => {});

// `repository.ts` captures the client at import time, so expose a stable proxy that forwards to
// whichever fake database the current test created.
const holder = vi.hoisted(() => ({ client: null as unknown as Record<string, unknown> }));
vi.mock("@/integrations/supabase/client", () => ({
  supabase: new Proxy(
    {},
    {
      get: (_t, prop: string) => (holder.client as Record<string, unknown>)[prop],
    },
  ),
}));
holder.client = createFakeSupabase(db) as unknown as Record<string, unknown>;

vi.mock("@/contexts/SiteConfigContext", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/contexts/SiteConfigContext")>();
  // Stable object per live config (the real provider keeps `config` in state).
  let source: unknown = null;
  let cached: Record<string, unknown> = {};
  const currentConfig = () => {
    if (source !== db.liveConfig) {
      source = db.liveConfig;
      cached = { ...actual.defaultConfig, ...db.liveConfig };
    }
    return cached;
  };
  return {
    ...actual,
    useSiteConfig: () => ({
      config: currentConfig(),
      isConfigLoaded: true,
      reloadConfig,
      isAdmin: true,
      isAuthLoading: false,
      user: null,
      adminLogin: vi.fn(),
      adminLogout: vi.fn(),
    }),
  };
});

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

vi.mock("@/hooks/use-toast", () => ({ useToast: () => ({ toast: vi.fn() }) }));

import AdminDoctor from "@/pages/admin/AdminDoctor";
import AdminBranding from "@/pages/admin/AdminBranding";
import AdminServices from "@/components/admin/AdminServices";
import AdminTestimonials from "@/components/admin/AdminTestimonials";

function as(role: CmsRole) {
  currentRole = role;
  db.role = role === "super_admin" ? "super_admin" : "editor";
}

function renderIn(ui: React.ReactElement, role: CmsRole) {
  as(role);
  return render(<MemoryRouter>{ui}</MemoryRouter>);
}

const badge = () => screen.getByTestId("workflow-status-badge");

beforeEach(() => {
  db = createFakeDb(liveConfig, {
    services: [
      { id: fakeUuid(), name: "Knee Replacement", slug: "knee-replacement", sort_order: 1, category: "Joint", cost_range: "₹", patients_treated: 10 },
      { id: fakeUuid(), name: "Hip Replacement", slug: "hip-replacement", sort_order: 2, category: "Joint", cost_range: "₹", patients_treated: 5 },
    ],
    testimonials: [
      { id: fakeUuid(), name: "Ravi K", rating: 5, text: "Great care", response: null, source: "google", is_published: true, is_featured: true, sort_order: 1 },
    ],
  });
  holder.client = createFakeSupabase(db) as unknown as Record<string, unknown>;
  reloadConfig.mockClear();
});

describe("Doctor profile draft workflow (005c, scope 'doctor')", () => {
  it("DOCTOR-01: Editor submits; Super Admin approves and publishes; only doctor keys change", async () => {
    const { unmount } = renderIn(<AdminDoctor />, "editor");
    fireEvent.change(await screen.findByLabelText(/years of experience/i), { target: { value: "21" } });
    fireEvent.click(screen.getByRole("button", { name: /submit for review/i }));
    await waitFor(() => expect(badge()).toHaveTextContent("Pending Super Admin Review"));
    expect(db.siteDrafts.doctor.workflow_status).toBe("pending_approval");
    expect(db.liveConfig.yearsExperience).toBe(15);
    expect(db.liveWrites).toEqual([]);
    unmount();

    renderIn(<AdminDoctor />, "super_admin");
    await waitFor(() => expect(badge()).toHaveTextContent("Pending Super Admin Review"));
    const changes = screen.getByRole("region", { name: /changes compared with the live website/i });
    expect(within(changes).getByText("Years of experience")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /publish to live website/i })).toBeDisabled();

    fireEvent.click(screen.getByRole("button", { name: /^approve$/i }));
    await waitFor(() => expect(badge()).toHaveTextContent("Approved"));
    fireEvent.click(screen.getByRole("button", { name: /publish approved/i }));
    await waitFor(() => expect(db.liveConfig.yearsExperience).toBe(21));
    expect(db.liveConfig.phone).toBe(liveConfig.phone);
    expect(reloadConfig).toHaveBeenCalled();
    expect(db.liveWrites).toEqual([]);
  });
});

describe("Branding draft workflow (005c, scope 'branding')", () => {
  it("BRAND-02: preset + tagline go through submit → reject with feedback → resubmit → approve → publish", async () => {
    const first = renderIn(<AdminBranding />, "editor");
    fireEvent.click(await screen.findByRole("button", { name: /royal medical navy & gold/i }));
    fireEvent.change(screen.getByLabelText(/footer clinic tagline/i), { target: { value: "Excellence in Orthopaedics" } });
    fireEvent.click(screen.getByRole("button", { name: /submit for review/i }));
    await waitFor(() => expect(db.siteDrafts.branding.workflow_status).toBe("pending_approval"));
    expect((db.liveConfig.branding as Record<string, unknown>).themePreset).toBeUndefined();
    first.unmount();

    const second = renderIn(<AdminBranding />, "super_admin");
    await waitFor(() => expect(badge()).toHaveTextContent("Pending Super Admin Review"));
    const changes = screen.getByRole("region", { name: /changes compared with the live website/i });
    expect(within(changes).getByText("Theme preset")).toBeInTheDocument();
    expect(within(changes).getByText("Footer tagline")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /reject with feedback/i }));
    fireEvent.change(screen.getByLabelText(/feedback for content editor/i), { target: { value: "Use the teal theme tagline." } });
    fireEvent.click(screen.getByRole("button", { name: /confirm rejection/i }));
    await waitFor(() => expect(db.siteDrafts.branding.workflow_status).toBe("rejected"));
    second.unmount();

    const third = renderIn(<AdminBranding />, "editor");
    await waitFor(() => expect(badge()).toHaveTextContent("Changes Requested"));
    expect(screen.getByText(/use the teal theme tagline/i)).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText(/footer clinic tagline/i), { target: { value: "Excellence in Orthopaedic Care" } });
    fireEvent.click(screen.getByRole("button", { name: /submit for review/i }));
    await waitFor(() => expect(db.siteDrafts.branding.workflow_status).toBe("pending_approval"));
    third.unmount();

    renderIn(<AdminBranding />, "super_admin");
    await waitFor(() => expect(badge()).toHaveTextContent("Pending Super Admin Review"));
    fireEvent.click(screen.getByRole("button", { name: /^approve$/i }));
    await waitFor(() => expect(badge()).toHaveTextContent("Approved"));
    fireEvent.click(screen.getByRole("button", { name: /publish approved/i }));
    await waitFor(() =>
      expect(db.liveConfig.branding).toMatchObject({ themePreset: "royal-navy", footerTagline: "Excellence in Orthopaedic Care" }),
    );
    expect(db.liveWrites).toEqual([]);
  });

  it("BRAND-03: an unsafe header link is stopped before submission", async () => {
    renderIn(<AdminBranding />, "editor");
    fireEvent.change(await screen.findByLabelText(/header primary cta destination url/i), {
      target: { value: "javascript:alert(1)" },
    });
    fireEvent.click(screen.getByRole("button", { name: /submit for review/i }));
    await waitFor(() => expect(screen.getByText(/header button link must be an internal path/i)).toBeInTheDocument());
    expect(db.siteDrafts.branding.workflow_status).toBe("published");
  });

  it("BRAND-04: site-wide labels are editable as part of the branding draft", async () => {
    renderIn(<AdminBranding />, "editor");
    const labels = await screen.findByRole("region", { name: /site-wide labels/i });
    fireEvent.change(within(labels).getByLabelText(/footer: “follow us” heading/i), { target: { value: "Connect with us" } });
    fireEvent.click(screen.getByRole("button", { name: /save draft/i }));
    await waitFor(() => expect(db.siteDrafts.branding.workflow_status).toBe("draft"));
    expect((db.siteDrafts.branding.draft as { branding: { labels: Record<string, string> } }).branding.labels).toEqual({
      footerFollowHeading: "Connect with us",
    });
  });
});

describe("Collection draft workflow (005d)", () => {
  it("SERVICES-01: edits, additions and removals are a reviewed changeset; nothing writes the live table", async () => {
    const editor = renderIn(<AdminServices />, "editor");
    await screen.findByText("Knee Replacement");
    // Editors cannot propose removals (content.delete is Super Admin only)
    expect(screen.queryByRole("button", { name: /remove \(draft\)/i })).not.toBeInTheDocument();

    const kneeRow = screen.getByTestId(`collection-row-${db.tables.services[0].id}`);
    fireEvent.click(within(kneeRow).getByRole("button", { name: /edit/i }));
    const nameInput = screen.getAllByRole("textbox")[0];
    fireEvent.change(nameInput, { target: { value: "Robotic Knee Replacement" } });
    fireEvent.click(screen.getByRole("button", { name: /update service/i }));
    await screen.findByText("Robotic Knee Replacement");
    expect(screen.getByText("Edited (draft)")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /submit for review/i }));
    await waitFor(() => expect(db.collectionDrafts.services.workflow_status).toBe("pending_approval"));
    expect(db.tables.services[0].name).toBe("Knee Replacement");
    editor.unmount();

    renderIn(<AdminServices />, "super_admin");
    await waitFor(() => expect(badge()).toHaveTextContent("Pending Super Admin Review"));
    expect(screen.getByRole("button", { name: /publish to live website/i })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: /^approve$/i }));
    await waitFor(() => expect(badge()).toHaveTextContent("Approved"));
    fireEvent.click(screen.getByRole("button", { name: /publish approved/i }));
    await waitFor(() => expect(db.tables.services[0].name).toBe("Robotic Knee Replacement"));
    expect(db.collectionDrafts.services.workflow_status).toBe("published");
    expect(db.liveWrites).toEqual([]);
  });

  it("SERVICES-02: Super Admin removal is also a draft change and needs approval", async () => {
    renderIn(<AdminServices />, "super_admin");
    await screen.findByText("Hip Replacement");
    const hipRow = screen.getByTestId(`collection-row-${db.tables.services[1].id}`);
    fireEvent.click(within(hipRow).getByRole("button", { name: /remove \(draft\)/i }));
    expect(within(hipRow).getByText("Removal (draft)")).toBeInTheDocument();
    expect(db.tables.services).toHaveLength(2);

    fireEvent.click(screen.getByRole("button", { name: /submit for review/i }));
    await waitFor(() => expect(db.collectionDrafts.services.workflow_status).toBe("pending_approval"));
    fireEvent.click(screen.getByRole("button", { name: /^approve$/i }));
    await waitFor(() => expect(badge()).toHaveTextContent("Approved"));
    fireEvent.click(screen.getByRole("button", { name: /publish approved/i }));
    await waitFor(() => expect(db.tables.services).toHaveLength(1));
    expect(db.tables.services[0].name).toBe("Knee Replacement");
    expect(db.liveWrites).toEqual([]);
  });

  it("TESTIMONIALS-01: hiding a review is a draft change, not a live write", async () => {
    renderIn(<AdminTestimonials />, "super_admin");
    await screen.findByText("Ravi K");
    fireEvent.click(screen.getByRole("button", { name: /hide on website \(draft\)/i }));
    expect(screen.getByText("Edited (draft)")).toBeInTheDocument();
    expect(db.tables.testimonials[0].is_published).toBe(true);
    expect(db.liveWrites).toEqual([]);
  });
});
