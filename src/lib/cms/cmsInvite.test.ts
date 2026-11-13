/**
 * CMS user invitations — MOCKED environment.
 *
 * Exercises the real orchestration in supabase/functions/_shared/cmsInvite.ts (the exact module the
 * admin-users Edge Function imports) with injected fakes for Supabase Auth, the provisioning RPC,
 * the audit RPC and the email provider (Resend). Nothing here talks to Supabase or sends email.
 * Real delivery must be checked on staging (see docs/CMS_DIRECT_PUBLISHING_AND_INVITATIONS.md §7).
 */
import { describe, expect, it, vi } from "vitest";
import {
  INVITE_RESEND_COOLDOWN_SECONDS,
  buildInviteEmail,
  deriveInviteStatus,
  inviteRedirectUrl,
  isDuplicateAccountError,
  normalizeSiteUrl,
  parseExpiryHours,
  runCreateInvite,
  runResendInvite,
  type InviteContext,
  type InviteDeps,
} from "../../../supabase/functions/_shared/cmsInvite";
import { isExpiredLinkError, parseAuthLinkParams } from "@/lib/authLinkParams";

const USER_ID = "33333333-3333-4333-8333-333333333333";
const SECRET_LINK = "https://project.supabase.co/auth/v1/verify?token=SECRET-TOKEN-123&type=invite";

const ctx: InviteContext = {
  redirectTo: inviteRedirectUrl("https://orthocarehub.in"),
  loginUrl: "https://orthocarehub.in/admin/login",
  expiryHours: 24,
  clinicName: "OrthoCare Hub",
  supportEmail: "consult@orthocarehub.in",
  supportPhone: "+91-9441824999",
};

function makeDeps(overrides: Partial<InviteDeps> = {}) {
  const calls: string[] = [];
  const recorded: unknown[][] = [];
  const sent: { to: string; subject: string; html: string; text: string }[] = [];
  const deps: InviteDeps = {
    mode: "resend",
    profileExists: vi.fn(async () => false),
    generateInviteLink: vi.fn(async () => {
      calls.push("generateInviteLink");
      return { userId: USER_ID, actionLink: SECRET_LINK };
    }),
    inviteViaSupabase: vi.fn(async () => {
      calls.push("inviteViaSupabase");
      return { userId: USER_ID };
    }),
    provision: vi.fn(async () => {
      calls.push("provision");
      return {};
    }),
    deleteAuthUser: vi.fn(async () => {
      calls.push("deleteAuthUser");
      return {};
    }),
    sendEmail: vi.fn(async (m) => {
      calls.push("sendEmail");
      sent.push(m);
      return { ok: true };
    }),
    recordEvent: vi.fn(async (...args) => {
      calls.push(`record:${args[1]}`);
      recorded.push(args);
      return {};
    }),
    ...overrides,
  };
  return { deps, calls, recorded, sent };
}

const params = { email: "doctor@orthocarehub.in", displayName: "Dr. Srivanth", role: "editor" as const };

describe("TEST 12/13: invitation creates profile + role and emails a secure link", () => {
  it("Resend mode: Auth invite → provision (profile + role + audit) → branded email → 'sent' event", async () => {
    const { deps, calls, sent, recorded } = makeDeps();
    const out = await runCreateInvite(params, ctx, deps);
    expect(out.status).toBe(200);
    expect(out.body).toMatchObject({ success: true, userId: USER_ID, role: "editor", emailSent: true, inviteStatus: "pending", provider: "resend" });
    expect(calls).toEqual(["generateInviteLink", "provision", "sendEmail", "record:sent"]);
    expect(deps.generateInviteLink).toHaveBeenCalledWith(
      "doctor@orthocarehub.in",
      "https://orthocarehub.in/reset-password?onboarding=invite",
      { display_name: "Dr. Srivanth", cms_role_label: "Admin (content editor)" },
    );
    expect(sent).toHaveLength(1);
    expect(sent[0].to).toBe("doctor@orthocarehub.in");
    expect(sent[0].html).toContain(SECRET_LINK.replace(/&/g, "&amp;"));
    // the link is never returned to the browser or written to the audit trail
    expect(JSON.stringify(out.body)).not.toContain("SECRET-TOKEN");
    expect(JSON.stringify(recorded)).not.toContain("SECRET-TOKEN");
  });

  it("Supabase-auth mode: Supabase sends the invite email; no link ever reaches our code", async () => {
    const { deps, calls } = makeDeps({ mode: "supabase_auth" });
    const out = await runCreateInvite({ ...params, role: "super_admin" }, ctx, deps);
    expect(out.status).toBe(200);
    expect(out.body).toMatchObject({ emailSent: true, role: "super_admin", provider: "supabase_auth" });
    expect(calls).toEqual(["inviteViaSupabase", "provision", "record:sent"]);
    expect(deps.sendEmail).not.toHaveBeenCalled();
  });

  it("the email names the clinic and role, links the login page, states the expiry, and contains no password", () => {
    const email = buildInviteEmail({
      recipientName: "Dr. <script>alert(1)</script>",
      role: "editor",
      actionLink: SECRET_LINK,
      expiryHours: 24,
      loginUrl: ctx.loginUrl,
      supportEmail: ctx.supportEmail,
      supportPhone: ctx.supportPhone,
    });
    for (const part of [email.html, email.text]) {
      expect(part).toContain("OrthoCare Hub");
      expect(part).toContain("Admin (content editor)");
      expect(part).toContain("24 hours");
      expect(part).toContain("https://orthocarehub.in/admin/login");
      expect(part).toContain("consult@orthocarehub.in");
      expect(part).not.toMatch(/password:\s*\S/i);
    }
    expect(email.text).toContain(SECRET_LINK);
    expect(email.html).not.toContain("<script>");
    expect(email.html).toContain("&lt;script&gt;");
    expect(email.subject).toMatch(/invited to the OrthoCare Hub CMS/);
  });
});

describe("TEST 15: duplicates", () => {
  it("an existing CMS profile is refused before anything is created", async () => {
    const { deps, calls } = makeDeps({ profileExists: vi.fn(async () => true) });
    const out = await runCreateInvite(params, ctx, deps);
    expect(out.status).toBe(409);
    expect(out.body.code).toBe("duplicate_account");
    expect(calls).toEqual([]);
  });

  it("an existing (confirmed) Auth account is refused and nothing is provisioned", async () => {
    const { deps, calls } = makeDeps({
      generateInviteLink: vi.fn(async () => ({ error: { message: "A user with this email address has already been registered", status: 422 } })),
    });
    const out = await runCreateInvite(params, ctx, deps);
    expect(out.status).toBe(409);
    expect(calls).toEqual([]);
    expect(deps.provision).not.toHaveBeenCalled();
    expect(deps.deleteAuthUser).not.toHaveBeenCalled();
  });

  it("recognises GoTrue duplicate errors by code or message", () => {
    expect(isDuplicateAccountError({ code: "email_exists" })).toBe(true);
    expect(isDuplicateAccountError({ message: "User already registered" })).toBe(true);
    expect(isDuplicateAccountError({ message: "rate limit exceeded" })).toBe(false);
    expect(isDuplicateAccountError(null)).toBe(false);
  });
});

describe("TEST 16: failures never leave inconsistent accounts", () => {
  it("profile/role provisioning failure deletes the Auth user", async () => {
    const { deps, calls } = makeDeps({ provision: vi.fn(async () => ({ error: "Atomic provisioning failed: boom" })) });
    const out = await runCreateInvite(params, ctx, deps);
    expect(out.status).toBe(500);
    expect(out.body.code).toBe("provision_failed");
    expect(calls).toEqual(["generateInviteLink", "deleteAuthUser"]);
    expect(deps.sendEmail).not.toHaveBeenCalled();
  });

  it("if the clean-up also fails, the response says exactly which Auth user to remove", async () => {
    const { deps } = makeDeps({
      provision: vi.fn(async () => ({ error: "Atomic provisioning failed: boom" })),
      deleteAuthUser: vi.fn(async () => ({ error: "network" })),
    });
    const out = await runCreateInvite(params, ctx, deps);
    expect(out.status).toBe(500);
    expect(out.body.code).toBe("provision_failed_cleanup_failed");
    expect(String(out.body.error)).toContain(USER_ID);
  });

  it("Auth account creation failure stops before any database write", async () => {
    const { deps } = makeDeps({ generateInviteLink: vi.fn(async () => ({ error: { message: "Database error saving new user" } })) });
    const out = await runCreateInvite(params, ctx, deps);
    expect(out.status).toBe(400);
    expect(out.body.code).toBe("auth_create_failed");
    expect(deps.provision).not.toHaveBeenCalled();
  });

  it("email delivery failure keeps a complete account, marks the invite Failed, and allows resend", async () => {
    const { deps, recorded } = makeDeps({ sendEmail: vi.fn(async () => ({ ok: false, errorCode: "email_provider_http_500" })) });
    const out = await runCreateInvite(params, ctx, deps);
    expect(out.status).toBe(200);
    expect(out.body).toMatchObject({ success: true, emailSent: false, inviteStatus: "failed" });
    expect(String(out.body.warning)).toMatch(/resend invitation/i);
    expect(deps.deleteAuthUser).not.toHaveBeenCalled();
    expect(recorded).toEqual([[USER_ID, "failed", "resend", "email_provider_http_500"]]);
  });

  it("a thrown provider error is treated as a delivery failure", async () => {
    const { deps } = makeDeps({ sendEmail: vi.fn(async () => { throw new Error("ECONNRESET"); }) });
    const out = await runCreateInvite(params, ctx, deps);
    expect(out.body).toMatchObject({ emailSent: false, inviteStatus: "failed" });
  });

  it("an audit write failure is surfaced as a warning, never silently ignored", async () => {
    const { deps } = makeDeps({ recordEvent: vi.fn(async () => ({ error: "rpc down" })) });
    const out = await runCreateInvite(params, ctx, deps);
    expect(out.status).toBe(200);
    expect(String(out.body.warning)).toMatch(/audit entry could not be written/i);
  });
});

describe("TEST 14: resend and expiry", () => {
  const base = {
    userId: USER_ID,
    email: "doctor@orthocarehub.in",
    displayName: "Dr. Srivanth",
    role: "editor" as const,
    isActive: true,
    accepted: false,
    lastSentAt: "2026-11-10T10:00:00.000Z",
    now: new Date("2026-11-13T10:00:00.000Z"),
  };

  it("an expired invitation can be resent: new link, reminder email, 'resent' event", async () => {
    const { deps, calls, sent } = makeDeps();
    const out = await runResendInvite(base, ctx, deps);
    expect(out.status).toBe(200);
    expect(calls).toEqual(["generateInviteLink", "sendEmail", "record:resent"]);
    expect(sent[0].subject).toMatch(/reminder/i);
    expect(deps.provision).not.toHaveBeenCalled();
  });

  it("accepted, disabled and too-recent invitations are not resent", async () => {
    const { deps } = makeDeps();
    expect((await runResendInvite({ ...base, accepted: true }, ctx, deps)).status).toBe(409);
    expect((await runResendInvite({ ...base, isActive: false }, ctx, deps)).status).toBe(400);
    const recent = new Date(base.now.getTime() - (INVITE_RESEND_COOLDOWN_SECONDS - 5) * 1000).toISOString();
    expect((await runResendInvite({ ...base, lastSentAt: recent }, ctx, deps)).status).toBe(429);
    expect(deps.generateInviteLink).not.toHaveBeenCalled();
  });

  it("never emails a link generated for a different account", async () => {
    const { deps } = makeDeps({
      generateInviteLink: vi.fn(async () => ({ userId: "44444444-4444-4444-8444-444444444444", actionLink: SECRET_LINK })),
    });
    const out = await runResendInvite(base, ctx, deps);
    expect(out.status).toBe(409);
    expect(deps.sendEmail).not.toHaveBeenCalled();
  });

  it("resend delivery failure is reported and recorded as Failed", async () => {
    const { deps, recorded } = makeDeps({ sendEmail: vi.fn(async () => ({ ok: false, errorCode: "email_provider_http_429" })) });
    const out = await runResendInvite(base, ctx, deps);
    expect(out.status).toBe(502);
    expect(recorded[0]).toEqual([USER_ID, "failed", "resend", "email_provider_http_429"]);
  });

  it("status derivation: pending, expired, accepted, failed, not invited", () => {
    const now = new Date("2026-11-13T10:00:00.000Z");
    expect(deriveInviteStatus({ lastSentAt: "2026-11-13T09:00:00.000Z", expiryHours: 24, now })).toBe("pending");
    expect(deriveInviteStatus({ lastSentAt: "2026-11-11T09:00:00.000Z", expiryHours: 24, now })).toBe("expired");
    expect(deriveInviteStatus({ invitedAt: "2026-11-11T09:00:00.000Z", expiryHours: 24, now })).toBe("expired");
    expect(deriveInviteStatus({ lastSentAt: "2026-11-11T09:00:00.000Z", emailConfirmedAt: "2026-11-11T10:00:00.000Z", expiryHours: 24, now })).toBe("accepted");
    expect(deriveInviteStatus({ lastSignInAt: "2026-11-01T00:00:00.000Z", storedStatus: "failed", expiryHours: 24, now })).toBe("accepted");
    expect(deriveInviteStatus({ storedStatus: "failed", lastSentAt: "2026-11-13T09:00:00.000Z", expiryHours: 24, now })).toBe("failed");
    expect(deriveInviteStatus({ expiryHours: 24, now })).toBe("not_invited");
  });

  it("the set-password page recognises invitation, recovery and expired links (flags only)", () => {
    expect(parseAuthLinkParams("?onboarding=invite", "").kind).toBe("invite");
    expect(parseAuthLinkParams("", "#access_token=x&type=invite").kind).toBe("invite");
    expect(parseAuthLinkParams("", "#access_token=x&type=recovery").kind).toBe("recovery");
    const expired = parseAuthLinkParams("?onboarding=invite", "#error=access_denied&error_code=otp_expired&error_description=Email+link+is+invalid+or+has+expired");
    expect(expired.errorCode).toBe("otp_expired");
    expect(isExpiredLinkError(expired.errorCode)).toBe(true);
    expect(JSON.stringify(parseAuthLinkParams("", "#access_token=SECRET&type=invite"))).not.toContain("SECRET");
  });
});

describe("configuration guards", () => {
  it("CMS_SITE_URL must be https (http only for localhost)", () => {
    expect(normalizeSiteUrl("https://orthocarehub.in/")).toBe("https://orthocarehub.in");
    expect(normalizeSiteUrl("http://localhost:8080")).toBe("http://localhost:8080");
    expect(normalizeSiteUrl("http://orthocarehub.in")).toBeNull();
    expect(normalizeSiteUrl("javascript:alert(1)")).toBeNull();
    expect(normalizeSiteUrl(undefined)).toBeNull();
  });

  it("expiry hours fall back to 24 when missing or invalid", () => {
    expect(parseExpiryHours(undefined)).toBe(24);
    expect(parseExpiryHours("abc")).toBe(24);
    expect(parseExpiryHours("-1")).toBe(24);
    expect(parseExpiryHours("48")).toBe(48);
  });
});
