/**
 * Users screen: email invitations and "Allow Direct Publishing" — MOCKED environment.
 * The admin-users Edge Function is replaced by a vi.fn() on `supabase.functions.invoke`; these tests
 * prove what the screen sends and shows. Server-side enforcement is covered by the validation tests
 * below (same rules as the function) and by the 007b staging harness.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { can, type CmsRole } from "@/lib/permissions";
import { validateAdminUserRequest } from "@/lib/cms/adminUsersValidation";

let currentRole: CmsRole = "super_admin";
const mockInvoke = vi.fn();

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({
    status: "authenticated",
    user: { id: "11111111-1111-4111-8111-111111111111", email: "super@orthocarehub.in" },
    role: currentRole,
    roleSource: "rpc",
    editorsCanPublish: false,
    directPublishEnabled: false,
    sessionExpired: false,
    error: null,
    signIn: vi.fn(),
    signOut: vi.fn(),
    retry: vi.fn(),
    can: (cap: Parameters<typeof can>[1]) => can(currentRole, cap),
    canDirectPublish: () => false,
    refreshDirectPublish: vi.fn(),
  }),
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: { functions: { invoke: (...args: unknown[]) => mockInvoke(...args) } },
}));

import AdminUsers from "@/pages/admin/AdminUsers";

const SUPER = "11111111-1111-4111-8111-111111111111";
const DOCTOR = "22222222-2222-4222-8222-222222222222";
const PENDING = "33333333-3333-4333-8333-333333333333";
const EXPIRED = "44444444-4444-4444-8444-444444444444";
const FAILED = "55555555-5555-4555-8555-555555555555";

function listResponse(opts: { directOn?: boolean; features?: boolean } = {}) {
  const features = opts.features ?? true;
  return {
    data: {
      features: { directPublishing: features, invitations: features },
      users: [
        { userId: SUPER, email: "super@orthocarehub.in", displayName: "Rajiv", role: "super_admin", isActive: true, createdAt: "2026-04-01T00:00:00Z", inviteStatus: "accepted" },
        {
          userId: DOCTOR,
          email: "doctor@orthocarehub.in",
          displayName: "Dr. Srivanth",
          role: "editor",
          isActive: true,
          createdAt: "2026-04-02T00:00:00Z",
          inviteStatus: "accepted",
          directPublishEnabled: opts.directOn ?? false,
          directPublishUpdatedAt: opts.directOn ? "2026-11-12T10:00:00Z" : null,
          directPublishUpdatedByEmail: opts.directOn ? "super@orthocarehub.in" : null,
        },
        { userId: PENDING, email: "pending@orthocarehub.in", displayName: "Pending Person", role: "editor", isActive: true, createdAt: "2026-11-13T00:00:00Z", inviteStatus: "pending", inviteLastSentAt: "2026-11-13T08:00:00Z" },
        { userId: EXPIRED, email: "expired@orthocarehub.in", displayName: "Expired Person", role: "editor", isActive: true, createdAt: "2026-11-01T00:00:00Z", inviteStatus: "expired", inviteLastSentAt: "2026-11-01T08:00:00Z" },
        { userId: FAILED, email: "failed@orthocarehub.in", displayName: "Failed Person", role: "super_admin", isActive: true, createdAt: "2026-11-12T00:00:00Z", inviteStatus: "failed" },
      ],
    },
    error: null,
  };
}

function setup(list = listResponse(), handlers: Record<string, unknown> = {}) {
  mockInvoke.mockImplementation(async (_fn: string, opts: { body: { action: string } }) => {
    if (opts.body.action === "list") return list;
    if (opts.body.action in handlers) return handlers[opts.body.action];
    return { data: { success: true }, error: null };
  });
  render(
    <MemoryRouter>
      <AdminUsers />
    </MemoryRouter>,
  );
}

const callsFor = (action: string) =>
  mockInvoke.mock.calls.filter(([, opts]) => (opts as { body: { action: string } }).body.action === action);

beforeEach(() => {
  mockInvoke.mockReset();
  currentRole = "super_admin";
});

describe("Invitations", () => {
  it("TEST 12: the invite form has no password field and sends email + role only", async () => {
    setup();
    await screen.findByText("doctor@orthocarehub.in");
    expect(document.querySelector('input[type="password"]')).toBeNull();

    fireEvent.change(screen.getByLabelText(/email address/i), { target: { value: " New.Editor@OrthoCareHub.in " } });
    fireEvent.change(screen.getByLabelText(/display name/i), { target: { value: "Reception" } });
    fireEvent.click(screen.getByRole("button", { name: /^send invitation$/i }));

    await waitFor(() => expect(callsFor("create")).toHaveLength(1));
    const body = (callsFor("create")[0][1] as { body: Record<string, unknown> }).body;
    expect(body).toEqual({ action: "create", email: "new.editor@orthocarehub.in", displayName: "Reception", role: "editor" });
    expect(await screen.findByText(/invitation sent to new\.editor@orthocarehub\.in/i)).toBeInTheDocument();
  });

  it("TEST 16: an email delivery failure is shown as a warning with the resend path", async () => {
    setup(listResponse(), {
      create: { data: { success: true, emailSent: false, warning: "The account was created but the invitation email could not be sent. Check the email provider settings, then use “Resend invitation”." }, error: null },
    });
    await screen.findByText("doctor@orthocarehub.in");
    fireEvent.change(screen.getByLabelText(/email address/i), { target: { value: "x@orthocarehub.in" } });
    fireEvent.click(screen.getByRole("button", { name: /^send invitation$/i }));
    expect(await screen.findByText(/could not be sent/i)).toBeInTheDocument();
  });

  it("TEST 15: inviting an already-invited email points to Resend instead of calling the server", async () => {
    setup();
    await screen.findByText("pending@orthocarehub.in");
    fireEvent.change(screen.getByLabelText(/email address/i), { target: { value: "pending@orthocarehub.in" } });
    fireEvent.click(screen.getByRole("button", { name: /^send invitation$/i }));
    expect(await screen.findByText(/already been invited/i)).toBeInTheDocument();
    expect(callsFor("create")).toHaveLength(0);
  });

  it("TEST 14: shows Pending / Accepted / Expired / Failed and offers Resend only where it applies", async () => {
    setup();
    await screen.findByText("pending@orthocarehub.in");
    expect(screen.getByTestId(`invite-status-${PENDING}`)).toHaveTextContent("Pending");
    expect(screen.getByTestId(`invite-status-${DOCTOR}`)).toHaveTextContent("Accepted");
    expect(screen.getByTestId(`invite-status-${EXPIRED}`)).toHaveTextContent("Expired");
    expect(screen.getByTestId(`invite-status-${FAILED}`)).toHaveTextContent("Failed");
    expect(screen.getAllByRole("button", { name: /resend invitation/i })).toHaveLength(3);

    const expiredRow = screen.getByText("expired@orthocarehub.in").closest("tr")!;
    fireEvent.click(within(expiredRow).getByRole("button", { name: /resend invitation/i }));
    await waitFor(() => expect(callsFor("resend_invite")).toHaveLength(1));
    expect((callsFor("resend_invite")[0][1] as { body: unknown }).body).toEqual({ action: "resend_invite", userId: EXPIRED });
    expect(await screen.findByText(/earlier links no longer work/i)).toBeInTheDocument();
  });
});

describe("Allow Direct Publishing", () => {
  it("TEST 3: enabling needs confirmation, then calls set_direct_publish for that doctor", async () => {
    setup();
    await screen.findByText("doctor@orthocarehub.in");
    expect(screen.getByTestId(`publishing-mode-${DOCTOR}`)).toHaveTextContent("Review required");

    fireEvent.click(screen.getByRole("switch", { name: /allow direct publishing for doctor@orthocarehub\.in/i }));
    const dialog = await screen.findByRole("alertdialog");
    expect(within(dialog).getByText(/allow direct publishing for dr\. srivanth/i)).toBeInTheDocument();
    expect(callsFor("set_direct_publish")).toHaveLength(0);

    fireEvent.click(within(dialog).getByRole("button", { name: /allow direct publishing/i }));
    await waitFor(() => expect(callsFor("set_direct_publish")).toHaveLength(1));
    expect((callsFor("set_direct_publish")[0][1] as { body: unknown }).body).toEqual({ action: "set_direct_publish", userId: DOCTOR, enabled: true });
  });

  it("cancelling the confirmation changes nothing", async () => {
    setup();
    await screen.findByText("doctor@orthocarehub.in");
    fireEvent.click(screen.getByRole("switch", { name: /allow direct publishing for doctor@orthocarehub\.in/i }));
    fireEvent.click(within(await screen.findByRole("alertdialog")).getByRole("button", { name: /cancel/i }));
    await waitFor(() => expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument());
    expect(callsFor("set_direct_publish")).toHaveLength(0);
  });

  it("TEST 4: disabling shows who changed it last and asks to confirm 'Require review'", async () => {
    setup(listResponse({ directOn: true }));
    await screen.findByText("doctor@orthocarehub.in");
    expect(screen.getByTestId(`publishing-mode-${DOCTOR}`)).toHaveTextContent("Publishes directly");
    expect(screen.getByText(/by super@orthocarehub\.in/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("switch", { name: /allow direct publishing for doctor@orthocarehub\.in/i }));
    fireEvent.click(within(await screen.findByRole("alertdialog")).getByRole("button", { name: /require review/i }));
    await waitFor(() => expect(callsFor("set_direct_publish")).toHaveLength(1));
    expect((callsFor("set_direct_publish")[0][1] as { body: { enabled: boolean } }).body.enabled).toBe(false);
  });

  it("Super Admin rows have no toggle; the toggle is disabled until migration 007 is deployed", async () => {
    setup(listResponse({ features: false }));
    await screen.findByText("doctor@orthocarehub.in");
    expect(screen.queryByRole("switch", { name: /super@orthocarehub\.in/i })).not.toBeInTheDocument();
    expect(screen.getByRole("switch", { name: /allow direct publishing for doctor@orthocarehub\.in/i })).toBeDisabled();
    expect(screen.getByText(/need cms migration 007/i)).toBeInTheDocument();
  });

  it("TEST 8/9: Editors (doctors or content editors) cannot open the screen", () => {
    currentRole = "editor";
    render(
      <MemoryRouter>
        <AdminUsers />
      </MemoryRouter>,
    );
    expect(screen.getByRole("heading", { name: /don't have access/i })).toBeInTheDocument();
    expect(mockInvoke).not.toHaveBeenCalled();
  });
});

describe("Server-side request validation (same rules as the admin-users function)", () => {
  const caller = SUPER;

  it("TEST 8/9: an Editor calling set_direct_publish / resend_invite / create is refused (403)", () => {
    for (const rawBody of [
      { action: "set_direct_publish", userId: DOCTOR, enabled: true },
      { action: "resend_invite", userId: DOCTOR },
      { action: "create", email: "x@y.in", role: "super_admin" },
    ]) {
      expect(validateAdminUserRequest({ hasAuthHeader: true, callerUid: DOCTOR, isSuperAdmin: false, rawBody }).status).toBe(403);
    }
  });

  it("validates set_direct_publish and resend_invite payloads", () => {
    const v = (rawBody: unknown) => validateAdminUserRequest({ hasAuthHeader: true, callerUid: caller, isSuperAdmin: true, rawBody });
    expect(v({ action: "set_direct_publish", userId: DOCTOR, enabled: "yes" }).status).toBe(400);
    expect(v({ action: "set_direct_publish", userId: "not-a-uuid", enabled: true }).status).toBe(400);
    expect(v({ action: "set_direct_publish", userId: caller, enabled: true }).status).toBe(400);
    expect(v({ action: "set_direct_publish", userId: DOCTOR, enabled: true })).toEqual({
      ok: true,
      status: 200,
      sanitized: { action: "set_direct_publish", userId: DOCTOR, enabled: true },
    });
    expect(v({ action: "resend_invite", userId: "x" }).status).toBe(400);
    expect(v({ action: "resend_invite", userId: PENDING }).ok).toBe(true);
    expect(v({ action: "create", email: "a@b.in", role: "admin" }).status).toBe(400);
    expect(v({ action: "create", email: "a@b.in", role: "editor", password: "Secret123!" }).status).toBe(400);
  });
});
