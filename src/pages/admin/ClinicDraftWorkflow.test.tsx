/**
 * Clinic Information draft workflow (migration 005c) — frontend behaviour against an in-memory
 * stand-in for `site_config_drafts`, `approval_history` and `publish_site_config_draft()`.
 *
 * What this proves: the UI never writes live `site_config`, routes every action through the draft
 * row, only offers Publish for an approved draft, and requires feedback to reject.
 * What it does NOT prove: the database rules themselves (RLS, column grants, the workflow trigger
 * and the publish function). Those are covered by the 006 harness on a real staging database.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { can, type CmsRole } from "@/lib/permissions";
import type { SiteConfig } from "@/contexts/SiteConfigContext";
import { pickClinicConfig } from "@/lib/cms/clinic";

let currentRole: CmsRole = "editor";

const liveConfig: SiteConfig = {
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
  insuranceProviders: ["Star Health"],
  timeSlots: [{ time: "10:00 AM", available: true }],
  whyChoose: [],
  serviceCategories: [],
};

// ---------------------------------------------------------------------------
// In-memory database stand-in
// ---------------------------------------------------------------------------
interface DraftRow {
  scope: string;
  draft: Record<string, unknown>;
  workflow_status: string;
  review_feedback: string | null;
  reviewed_at: string | null;
  submitted_at: string | null;
  published_at: string | null;
}

const db = {
  live: { ...liveConfig } as SiteConfig,
  row: null as unknown as DraftRow,
  history: [] as Record<string, unknown>[],
  liveWrites: 0,
  publishCalls: 0,
};

function resetDb() {
  db.live = { ...liveConfig };
  db.row = {
    scope: "clinic",
    draft: pickClinicConfig(liveConfig) as Record<string, unknown>,
    workflow_status: "published",
    review_feedback: null,
    reviewed_at: null,
    submitted_at: null,
    published_at: null,
  };
  db.history = [];
  db.liveWrites = 0;
  db.publishCalls = 0;
}

const actorEmail = () => (currentRole === "super_admin" ? "admin@orthocarehub.in" : "doctor@orthocarehub.in");

function builder(table: string) {
  let pendingUpdate: Record<string, unknown> | null = null;
  const result = () => {
    if (table === "site_config_drafts") {
      if (pendingUpdate) {
        Object.assign(db.row, pendingUpdate);
        return { data: [{ workflow_status: db.row.workflow_status }], error: null };
      }
      return { data: { ...db.row, draft: { ...db.row.draft } }, error: null };
    }
    if (table === "approval_history") {
      return { data: [...db.history].reverse(), error: null };
    }
    if (table === "site_config") {
      db.liveWrites += 1; // any direct live write is a test failure
      return { data: null, error: null };
    }
    return { data: null, error: { code: "42P01", message: "relation does not exist" } };
  };
  const chain = {
    select: () => chain,
    eq: () => chain,
    order: () => chain,
    limit: () => chain,
    update: (values: Record<string, unknown>) => {
      pendingUpdate = values;
      return chain;
    },
    insert: () => chain,
    delete: () => chain,
    upsert: () => chain,
    maybeSingle: async () => result(),
    single: async () => result(),
    then: (resolve: (v: unknown) => unknown, reject?: (e: unknown) => unknown) =>
      Promise.resolve(result()).then(resolve, reject),
  };
  return chain;
}

const rpc = vi.fn(async (fn: string, args?: Record<string, unknown>) => {
  if (fn === "record_workflow_transition") {
    db.history.push({
      id: String(db.history.length + 1),
      from_status: args?._from_status,
      to_status: args?._to_status,
      actor_email: actorEmail(),
      actor_role: currentRole,
      feedback: args?._feedback ?? null,
      created_at: new Date().toISOString(),
    });
    return { data: null, error: null };
  }
  if (fn === "publish_site_config_draft") {
    db.publishCalls += 1;
    if (currentRole !== "super_admin") return { data: null, error: { code: "42501", message: "Only a Super Admin can publish clinic information." } };
    if (db.row.workflow_status !== "approved") {
      return { data: null, error: { code: "P0001", message: `Only approved changes can be published (current status: ${db.row.workflow_status}).` } };
    }
    db.live = { ...db.live, ...(pickClinicConfig(db.row.draft as Partial<SiteConfig>) as Partial<SiteConfig>) };
    db.row.workflow_status = "published";
    return { data: db.live, error: null };
  }
  return { data: null, error: null };
});

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: (table: string) => builder(table),
    rpc: (fn: string, args?: Record<string, unknown>) => rpc(fn, args),
    auth: { getSession: async () => ({ data: { session: null } }) },
    storage: { from: () => ({}) },
  },
}));

const mockUpdateConfig = vi.fn(async () => ({ success: true }));
const mockReloadConfig = vi.fn(async () => {});

vi.mock("@/contexts/SiteConfigContext", () => ({
  useSiteConfig: () => ({
    config: db.live,
    updateConfig: mockUpdateConfig,
    isConfigLoaded: true,
    reloadConfig: mockReloadConfig,
    isAdmin: true,
    isAuthLoading: false,
    user: null,
    adminLogin: vi.fn(),
    adminLogout: vi.fn(),
  }),
}));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({
    status: "authenticated",
    user: { id: "u1", email: actorEmail() },
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

import AdminClinic from "@/pages/admin/AdminClinic";

function renderClinic(role: CmsRole) {
  currentRole = role;
  return render(
    <MemoryRouter>
      <AdminClinic />
    </MemoryRouter>,
  );
}

const badge = () => screen.getByTestId("workflow-status-badge");

describe("Clinic Information draft workflow (005c)", () => {
  beforeEach(() => {
    resetDb();
    rpc.mockClear();
    mockUpdateConfig.mockClear();
    mockReloadConfig.mockClear();
  });

  it("CLINIC-DRAFT-01: Editor saves and submits a draft; the live config is never written", async () => {
    renderClinic("editor");
    fireEvent.change(await screen.findByLabelText(/primary phone number/i), { target: { value: "+91-9000011111" } });
    expect(screen.getByText(/you have unsaved edits/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /save draft/i }));
    await waitFor(() => expect(badge()).toHaveTextContent("Draft"));
    expect(db.row.draft.phone).toBe("+91-9000011111");

    fireEvent.click(screen.getByRole("button", { name: /submit for review/i }));
    await waitFor(() => expect(badge()).toHaveTextContent("Pending Super Admin Review"));
    expect(db.row.workflow_status).toBe("pending_approval");

    // Comparison shows the pending change; Editors get no approve/publish controls.
    const changes = screen.getByRole("region", { name: /changes compared with the live website/i });
    expect(within(changes).getByText("Primary phone number")).toBeInTheDocument();
    expect(within(changes).getByText("+91-9000011111")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^approve$/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /publish/i })).not.toBeInTheDocument();

    expect(db.live.phone).toBe(liveConfig.phone);
    expect(db.liveWrites).toBe(0);
    expect(mockUpdateConfig).not.toHaveBeenCalled();
    expect(db.history.map((h) => h.to_status)).toEqual(["draft", "pending_approval"]);
  });

  it("CLINIC-DRAFT-02: Super Admin reviews, approves, then publishes; Publish stays locked until approval", async () => {
    db.row.draft = { ...db.row.draft, phone: "+91-9000011111" };
    db.row.workflow_status = "pending_approval";

    renderClinic("super_admin");
    await waitFor(() => expect(badge()).toHaveTextContent("Pending Super Admin Review"));
    const changes = screen.getByRole("region", { name: /changes compared with the live website/i });
    expect(within(changes).getByText(liveConfig.phone)).toBeInTheDocument();

    const publish = screen.getByRole("button", { name: /publish to live website/i });
    expect(publish).toBeDisabled();

    fireEvent.click(screen.getByRole("button", { name: /^approve$/i }));
    await waitFor(() => expect(badge()).toHaveTextContent("Approved"));
    expect(db.live.phone).toBe(liveConfig.phone); // approval alone changes nothing live

    const publishApproved = screen.getByRole("button", { name: /publish approved/i });
    expect(publishApproved).toBeEnabled();
    fireEvent.click(publishApproved);

    await waitFor(() => expect(db.live.phone).toBe("+91-9000011111"));
    expect(rpc).toHaveBeenCalledWith("publish_site_config_draft", { _scope: "clinic" });
    expect(mockReloadConfig).toHaveBeenCalled();
    expect(mockUpdateConfig).not.toHaveBeenCalled(); // never the old direct-write path
    await waitFor(() => expect(badge()).toHaveTextContent("Published"));
  });

  it("CLINIC-DRAFT-03: Rejection needs feedback; the Editor sees it and resubmits", async () => {
    db.row.draft = { ...db.row.draft, hours: "Mon - Sun: 24 hours" };
    db.row.workflow_status = "pending_approval";

    const { unmount } = renderClinic("super_admin");
    await waitFor(() => expect(badge()).toHaveTextContent("Pending Super Admin Review"));
    fireEvent.click(screen.getByRole("button", { name: /reject with feedback/i }));
    fireEvent.click(screen.getByRole("button", { name: /confirm rejection/i }));
    expect(screen.getByText(/please enter feedback/i)).toBeInTheDocument();
    expect(db.row.workflow_status).toBe("pending_approval");

    fireEvent.change(screen.getByLabelText(/feedback for the admin/i), {
      target: { value: "Sunday hours are wrong." },
    });
    fireEvent.click(screen.getByRole("button", { name: /confirm rejection/i }));
    await waitFor(() => expect(db.row.workflow_status).toBe("rejected"));
    expect(db.row.review_feedback).toBe("Sunday hours are wrong.");
    unmount();

    renderClinic("editor");
    await waitFor(() => expect(badge()).toHaveTextContent("Changes Requested"));
    expect(screen.getByRole("alert")).toHaveTextContent(/sunday hours are wrong/i);
    // The form shows the rejected draft so the Editor can correct it.
    const hours = screen.getByLabelText(/working hours display text/i);
    expect(hours).toHaveValue("Mon - Sun: 24 hours");
    fireEvent.change(hours, { target: { value: "Mon - Sat: 9 AM - 8 PM, Sun: 10 AM - 1 PM" } });
    fireEvent.click(screen.getByRole("button", { name: /submit for review/i }));
    await waitFor(() => expect(db.row.workflow_status).toBe("pending_approval"));
    expect(db.row.draft.hours).toBe("Mon - Sat: 9 AM - 8 PM, Sun: 10 AM - 1 PM");
    expect(db.live.hours).toBe(liveConfig.hours);
  });

  it("CLINIC-DRAFT-04: invalid links are stopped before submission", async () => {
    renderClinic("editor");
    fireEvent.change(await screen.findByLabelText(/facebook page url/i), {
      target: { value: "javascript:alert(1)" },
    });
    fireEvent.click(screen.getByRole("button", { name: /submit for review/i }));
    await waitFor(() => expect(screen.getByText(/must start with https:\/\//i)).toBeInTheDocument());
    expect(db.row.workflow_status).toBe("published");
    expect(db.row.draft.facebook).toBe("");
  });

  it("CLINIC-DRAFT-05: Super Admin cannot approve while holding unsaved edits", async () => {
    db.row.draft = { ...db.row.draft, phone: "+91-9000011111" };
    db.row.workflow_status = "pending_approval";

    renderClinic("super_admin");
    await waitFor(() => expect(badge()).toHaveTextContent("Pending Super Admin Review"));
    fireEvent.change(screen.getByLabelText(/clinic email/i), { target: { value: "other@example.com" } });
    fireEvent.click(screen.getByRole("button", { name: /^approve$/i }));
    await waitFor(() => expect(screen.getByText(/you have unsaved edits\. save them/i)).toBeInTheDocument());
    expect(db.row.workflow_status).toBe("pending_approval");

    fireEvent.click(screen.getByRole("button", { name: /discard edits/i }));
    expect(screen.getByLabelText(/clinic email/i)).toHaveValue(liveConfig.email);
  });
});
