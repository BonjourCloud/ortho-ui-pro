/**
 * Per-user direct publishing (migration 007) — MOCKED environment.
 *
 * These tests run the real CMS screens, hooks and repository against the in-memory stand-in in
 * src/test/fakeCmsDb.ts, which mirrors 007's database rule (flag read at publish time, allow-listed
 * targets, own-draft-only contributors, no removals). They prove the UI and the client never route
 * around that rule. They are NOT database tests: the real enforcement is verified by
 * docs/proposed-migrations/007b_staging_direct_publish_and_invite_tests.sql on a staging project.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { can, type CmsRole } from "@/lib/permissions";
import { canDirectPublish } from "@/lib/cms/directPublish";
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

const DOCTOR = "u-doctor";
const OTHER_EDITOR = "u-editor-2";
const SUPER = "u-super";

let currentRole: CmsRole = "editor";
/** What the browser believes (AuthContext). The database flag lives in db.directPublish. */
let uiDirectPublish = false;
let db: FakeDbState = createFakeDb(liveConfig);
const reloadConfig = vi.fn(async () => {});

const holder = vi.hoisted(() => ({ client: null as unknown as Record<string, unknown> }));
vi.mock("@/integrations/supabase/client", () => ({
  supabase: new Proxy({}, { get: (_t, prop: string) => (holder.client as Record<string, unknown>)[prop] }),
}));
holder.client = createFakeSupabase(db) as unknown as Record<string, unknown>;

vi.mock("@/contexts/SiteConfigContext", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/contexts/SiteConfigContext")>();
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
    user: { id: db.userId, email: "doctor@orthocarehub.in" },
    role: currentRole,
    roleSource: "rpc",
    editorsCanPublish: false,
    directPublishEnabled: uiDirectPublish,
    sessionExpired: false,
    error: null,
    signIn: vi.fn(),
    signOut: vi.fn(),
    retry: vi.fn(),
    can: (cap: Parameters<typeof can>[1]) => can(currentRole, cap, { editorsCanPublish: false }),
    canDirectPublish: (target: string) => canDirectPublish(currentRole, uiDirectPublish, target),
    refreshDirectPublish: vi.fn(async () => {}),
  }),
}));

vi.mock("@/hooks/use-toast", () => ({ useToast: () => ({ toast: vi.fn() }) }));

import AdminDoctor from "@/pages/admin/AdminDoctor";
import AdminBranding from "@/pages/admin/AdminBranding";
import AdminServices from "@/components/admin/AdminServices";
import { publishCollectionDraft, publishSiteConfigDraft } from "@/lib/cms/repository";

function as(role: CmsRole, userId: string) {
  currentRole = role;
  db.role = role === "super_admin" ? "super_admin" : "editor";
  db.userId = userId;
}

function renderIn(ui: React.ReactElement, role: CmsRole, userId: string) {
  as(role, userId);
  return render(<MemoryRouter>{ui}</MemoryRouter>);
}

/** Super Admin flips the flag (in production: admin-users → admin_set_direct_publish()). */
function setDbFlag(userId: string, enabled: boolean) {
  db.directPublish[userId] = enabled;
}

const badge = () => screen.getByTestId("workflow-status-badge");

beforeEach(() => {
  db = createFakeDb(liveConfig, {
    services: [
      { id: fakeUuid(), name: "Knee Replacement", slug: "knee-replacement", sort_order: 1, category: "Joint", cost_range: "₹", patients_treated: 10 },
    ],
  });
  holder.client = createFakeSupabase(db) as unknown as Record<string, unknown>;
  uiDirectPublish = false;
  reloadConfig.mockClear();
});

describe("Direct publishing OFF (default) — review required", () => {
  it("DP-UI-01: a doctor without the permission sees no publish action, and a manual RPC call is refused", async () => {
    renderIn(<AdminDoctor />, "editor", DOCTOR);
    fireEvent.change(await screen.findByLabelText(/years of experience/i), { target: { value: "25" } });
    fireEvent.click(screen.getByRole("button", { name: /save draft/i }));
    await waitFor(() => expect(db.siteDrafts.doctor.workflow_status).toBe("draft"));

    expect(screen.queryByRole("button", { name: /publish now/i })).not.toBeInTheDocument();
    expect(screen.getByText(/super admin approves & publishes/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /submit for review/i })).toBeInTheDocument();

    // Bypass attempt: call the publish RPC directly, as a crafted request would.
    const res = await publishSiteConfigDraft("doctor", { direct: true });
    expect(res.ok).toBe(false);
    expect(res.message).toMatch(/submit this change for super admin review/i);
    expect(db.liveConfig.yearsExperience).toBe(15);

    // Hiding the button is not what protects the site: even a UI that wrongly believes the flag
    // is ON is refused by the database while the stored flag is OFF.
    uiDirectPublish = true;
    const forced = await publishCollectionDraft("services", { direct: true });
    expect(forced.ok).toBe(false);
    expect(db.liveWrites).toEqual([]);
  });
});

describe("Direct publishing ON", () => {
  it("DP-UI-02: save draft → preview → confirm → live, recorded as a direct publish", async () => {
    setDbFlag(DOCTOR, true);
    uiDirectPublish = true;
    renderIn(<AdminDoctor />, "editor", DOCTOR);

    fireEvent.change(await screen.findByLabelText(/years of experience/i), { target: { value: "22" } });
    expect(screen.getByTestId("direct-publish-badge")).toBeInTheDocument();
    // Unsaved edits cannot be published.
    expect(screen.getByRole("button", { name: /publish now/i })).toBeDisabled();

    fireEvent.click(screen.getByRole("button", { name: /save draft/i }));
    await waitFor(() => expect(badge()).toHaveTextContent("Draft"));
    expect(screen.getByRole("link", { name: /preview draft/i })).toHaveAttribute("href", expect.stringContaining("preview=1"));
    expect(db.liveConfig.yearsExperience).toBe(15);

    fireEvent.click(screen.getByRole("button", { name: /publish now/i }));
    const dialog = await screen.findByRole("alertdialog");
    expect(within(dialog).getByText(/without super admin review/i)).toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole("button", { name: /publish now/i }));

    await waitFor(() => expect(db.liveConfig.yearsExperience).toBe(22));
    expect(db.siteDrafts.doctor.workflow_status).toBe("published");
    expect(db.history.some((h) => h.to_status === "published" && h.direct_publish === true && h.entity_id === "doctor")).toBe(true);
    expect(db.liveConfig.phone).toBe(liveConfig.phone);
    expect(db.liveWrites).toEqual([]);
  });

  it("DP-UI-03: cancelling the confirmation publishes nothing", async () => {
    setDbFlag(DOCTOR, true);
    uiDirectPublish = true;
    renderIn(<AdminDoctor />, "editor", DOCTOR);
    fireEvent.change(await screen.findByLabelText(/years of experience/i), { target: { value: "23" } });
    fireEvent.click(screen.getByRole("button", { name: /save draft/i }));
    await waitFor(() => expect(db.siteDrafts.doctor.workflow_status).toBe("draft"));
    fireEvent.click(screen.getByRole("button", { name: /publish now/i }));
    const dialog = await screen.findByRole("alertdialog");
    fireEvent.click(within(dialog).getByRole("button", { name: /cancel/i }));
    await waitFor(() => expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument());
    expect(db.liveConfig.yearsExperience).toBe(15);
  });

  it("DP-UI-04: switching the permission OFF blocks the very next publish, even on an open page", async () => {
    setDbFlag(DOCTOR, true);
    uiDirectPublish = true;
    renderIn(<AdminDoctor />, "editor", DOCTOR);
    fireEvent.change(await screen.findByLabelText(/years of experience/i), { target: { value: "24" } });
    fireEvent.click(screen.getByRole("button", { name: /save draft/i }));
    await waitFor(() => expect(db.siteDrafts.doctor.workflow_status).toBe("draft"));

    // Super Admin turns it off while the doctor's page is still open (UI still shows the button).
    setDbFlag(DOCTOR, false);
    fireEvent.click(screen.getByRole("button", { name: /publish now/i }));
    fireEvent.click(within(await screen.findByRole("alertdialog")).getByRole("button", { name: /publish now/i }));

    await waitFor(() => expect(screen.getByText(/submit this change for super admin review/i)).toBeInTheDocument());
    expect(db.liveConfig.yearsExperience).toBe(15);
    expect(db.siteDrafts.doctor.workflow_status).toBe("draft");
  });

  it("DP-UI-05: a draft that contains another user's changes cannot be published directly", async () => {
    setDbFlag(DOCTOR, true);
    // Another Admin edits the shared doctor-profile draft first.
    const other = renderIn(<AdminDoctor />, "editor", OTHER_EDITOR);
    fireEvent.change(await screen.findByLabelText(/years of experience/i), { target: { value: "30" } });
    fireEvent.click(screen.getByRole("button", { name: /save draft/i }));
    await waitFor(() => expect(db.siteDrafts.doctor.workflow_status).toBe("draft"));
    other.unmount();

    uiDirectPublish = true;
    renderIn(<AdminDoctor />, "editor", DOCTOR);
    fireEvent.change(await screen.findByLabelText(/years of experience/i), { target: { value: "31" } });
    fireEvent.click(screen.getByRole("button", { name: /save draft/i }));
    await waitFor(() => expect(db.siteDrafts.doctor.contributors).toEqual([OTHER_EDITOR, DOCTOR]));
    fireEvent.click(screen.getByRole("button", { name: /publish now/i }));
    fireEvent.click(within(await screen.findByRole("alertdialog")).getByRole("button", { name: /publish now/i }));

    await waitFor(() => expect(screen.getByText(/changes made by another cms user/i)).toBeInTheDocument());
    expect(db.liveConfig.yearsExperience).toBe(15);
  });

  it("DP-UI-06: collections — own edits publish directly; removals never do", async () => {
    setDbFlag(DOCTOR, true);
    uiDirectPublish = true;
    renderIn(<AdminServices />, "editor", DOCTOR);
    await screen.findByText("Knee Replacement");
    const row = screen.getByTestId(`collection-row-${db.tables.services[0].id}`);
    fireEvent.click(within(row).getByRole("button", { name: /edit/i }));
    fireEvent.change(screen.getAllByRole("textbox")[0], { target: { value: "Robotic Knee Replacement" } });
    fireEvent.click(screen.getByRole("button", { name: /update service/i }));
    await screen.findByText("Robotic Knee Replacement");
    fireEvent.click(screen.getByRole("button", { name: /save draft/i }));
    await waitFor(() => expect(db.collectionDrafts.services.workflow_status).toBe("draft"));

    fireEvent.click(screen.getByRole("button", { name: /publish now/i }));
    fireEvent.click(within(await screen.findByRole("alertdialog")).getByRole("button", { name: /publish now/i }));
    await waitFor(() => expect(db.tables.services[0].name).toBe("Robotic Knee Replacement"));
    expect(db.liveWrites).toEqual([]);

    // A removal in the changeset (e.g. crafted request) is refused for direct publishing.
    db.collectionDrafts.services.draft = { items: [], deletedIds: [String(db.tables.services[0].id)] };
    db.collectionDrafts.services.workflow_status = "draft";
    db.collectionDrafts.services.contributors = [DOCTOR];
    const res = await publishCollectionDraft("services", { direct: true });
    expect(res.ok).toBe(false);
    expect(res.message).toMatch(/removing items always needs super admin review/i);
    expect(db.tables.services).toHaveLength(1);
  });

  it("DP-UI-07: site-wide Branding is never directly publishable, even with the permission ON", async () => {
    setDbFlag(DOCTOR, true);
    uiDirectPublish = true;
    renderIn(<AdminBranding />, "editor", DOCTOR);
    fireEvent.change(await screen.findByLabelText(/footer clinic tagline/i), { target: { value: "Tagline" } });
    fireEvent.click(screen.getByRole("button", { name: /save draft/i }));
    await waitFor(() => expect(db.siteDrafts.branding.workflow_status).toBe("draft"));
    expect(screen.queryByRole("button", { name: /publish now/i })).not.toBeInTheDocument();

    const res = await publishSiteConfigDraft("branding", { direct: true });
    expect(res.ok).toBe(false);
    expect((db.liveConfig.branding as Record<string, unknown>).footerTagline).toBeUndefined();
  });
});

describe("Super Admin workflow is unchanged", () => {
  it("DP-UI-08: a Super Admin still needs an approved draft and never sees “Publish now”", async () => {
    renderIn(<AdminDoctor />, "super_admin", SUPER);
    fireEvent.change(await screen.findByLabelText(/years of experience/i), { target: { value: "26" } });
    fireEvent.click(screen.getByRole("button", { name: /save draft/i }));
    await waitFor(() => expect(db.siteDrafts.doctor.workflow_status).toBe("draft"));
    expect(screen.queryByRole("button", { name: /publish now/i })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /publish to live website/i })).toBeDisabled();
    const res = await publishSiteConfigDraft("doctor");
    expect(res.ok).toBe(false);
    expect(db.liveConfig.yearsExperience).toBe(15);
  });
});
