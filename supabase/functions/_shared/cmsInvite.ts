/**
 * CMS user invitation logic shared by the `admin-users` Edge Function (Deno) and the Vitest suite.
 *
 * This file must stay dependency-free (no Deno or npm imports) so both runtimes can load it.
 * Every side effect (Supabase Auth, database RPCs, the email provider) is injected through
 * `InviteDeps`, which lets the tests prove the failure handling without a real backend.
 *
 * Security rules enforced here:
 *  - Administrators never choose a password; the user sets it from a time-limited Supabase link.
 *  - The invitation link is only ever placed in the email body. It is never returned to the
 *    browser, never logged and never passed to the audit recorder.
 *  - A database provisioning failure deletes the Auth user created for it (no orphan accounts).
 */

export type CmsInviteRole = "super_admin" | "editor";
export type EmailProviderMode = "resend" | "supabase_auth";
export type InviteStatus = "pending" | "accepted" | "expired" | "failed" | "not_invited";

/** Labels used in the email. `editor` is the CMS "Admin" (content editor) role, not the legacy `admin`. */
export const INVITE_ROLE_LABELS: Record<CmsInviteRole, string> = {
  super_admin: "Super Admin",
  editor: "Admin (content editor)",
};

export const INVITE_RESEND_COOLDOWN_SECONDS = 60;
export const DEFAULT_INVITE_EXPIRY_HOURS = 24;

export interface AuthErrorLike {
  message?: string;
  code?: string;
  status?: number;
}

export function isDuplicateAccountError(err: AuthErrorLike | null | undefined): boolean {
  if (!err) return false;
  if (err.code === "email_exists" || err.code === "user_already_exists") return true;
  return /already (been )?registered|already exists|email.*exists/i.test(err.message ?? "");
}

/** Accepts https URLs, or http only for localhost. Returns the origin without a trailing slash. */
export function normalizeSiteUrl(raw: string | null | undefined): string | null {
  if (!raw) return null;
  try {
    const url = new URL(raw.trim());
    const isLocal = url.hostname === "localhost" || url.hostname === "127.0.0.1";
    if (url.protocol !== "https:" && !(url.protocol === "http:" && isLocal)) return null;
    return url.origin;
  } catch {
    return null;
  }
}

export function inviteRedirectUrl(siteUrl: string): string {
  return `${siteUrl}/reset-password?onboarding=invite`;
}

export function loginUrl(siteUrl: string): string {
  return `${siteUrl}/admin/login`;
}

export function parseExpiryHours(raw: string | null | undefined): number {
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 && n <= 24 * 30 ? n : DEFAULT_INVITE_EXPIRY_HOURS;
}

/**
 * Invitation status shown in the Users list.
 *  - accepted: the user confirmed the email (set a password) or has signed in.
 *  - failed:   the last delivery attempt failed.
 *  - expired:  still unaccepted and the last link is older than the configured expiry.
 *  - pending:  unaccepted link that is still valid.
 *  - not_invited: account created before invitations were tracked (or by another path).
 */
export function deriveInviteStatus(input: {
  emailConfirmedAt?: string | null;
  lastSignInAt?: string | null;
  invitedAt?: string | null;
  storedStatus?: string | null;
  lastSentAt?: string | null;
  expiryHours: number;
  now?: Date;
}): InviteStatus {
  if (input.emailConfirmedAt || input.lastSignInAt) return "accepted";
  if (input.storedStatus === "failed") return "failed";
  const sent = input.lastSentAt ?? input.invitedAt ?? null;
  if (!sent) return input.storedStatus === "pending" ? "pending" : "not_invited";
  const sentAt = Date.parse(sent);
  if (Number.isNaN(sentAt)) return "pending";
  const now = (input.now ?? new Date()).getTime();
  return now - sentAt > input.expiryHours * 3600 * 1000 ? "expired" : "pending";
}

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export interface InviteEmailInput {
  recipientName: string;
  role: CmsInviteRole;
  actionLink: string;
  expiryHours: number;
  loginUrl: string;
  clinicName?: string;
  supportEmail?: string | null;
  supportPhone?: string | null;
  resend?: boolean;
}

export interface InviteEmail {
  subject: string;
  html: string;
  text: string;
}

function expiryText(hours: number): string {
  if (hours % 24 === 0) {
    const days = hours / 24;
    return days === 1 ? "24 hours" : `${days} days`;
  }
  return hours === 1 ? "1 hour" : `${hours} hours`;
}

/** Builds the onboarding email. Contains no password, only the one-time setup link. */
export function buildInviteEmail(input: InviteEmailInput): InviteEmail {
  const clinic = input.clinicName?.trim() || "OrthoCare Hub";
  const role = INVITE_ROLE_LABELS[input.role];
  const expiry = expiryText(input.expiryHours);
  const name = input.recipientName.trim() || "there";
  const supportLines = [
    input.supportEmail ? `Email: ${input.supportEmail}` : null,
    input.supportPhone ? `Phone: ${input.supportPhone}` : null,
  ].filter((l): l is string => Boolean(l));

  const subject = input.resend
    ? `Reminder: set up your ${clinic} CMS account`
    : `You're invited to the ${clinic} CMS`;

  const text = [
    `Hello ${name},`,
    "",
    `You have been invited to the ${clinic} content management system.`,
    `Assigned role: ${role}`,
    "",
    "Set your password using this secure link:",
    input.actionLink,
    "",
    `This link expires in ${expiry} and can be used once. If it has expired, ask your Super Admin to resend the invitation.`,
    "",
    `After setting your password, sign in at: ${input.loginUrl}`,
    ...(supportLines.length ? ["", "Need help? Contact the clinic:", ...supportLines] : []),
    "",
    "If you were not expecting this invitation, you can ignore this email.",
    "",
    `— ${clinic}`,
  ].join("\n");

  const e = escapeHtml;
  const supportHtml = supportLines.length
    ? `<p style="margin:16px 0 0;font-size:13px;color:#555">Need help? Contact the clinic:<br>${supportLines.map(e).join("<br>")}</p>`
    : "";

  const html = `<!doctype html>
<html><body style="margin:0;padding:24px;background:#f5f7fa;font-family:Arial,Helvetica,sans-serif;color:#1f2933">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:12px;padding:28px">
<tr><td>
<h1 style="margin:0 0 12px;font-size:20px">${e(clinic)} CMS invitation</h1>
<p style="margin:0 0 12px;font-size:14px">Hello ${e(name)},</p>
<p style="margin:0 0 12px;font-size:14px">You have been invited to the ${e(clinic)} content management system.</p>
<p style="margin:0 0 16px;font-size:14px"><strong>Assigned role:</strong> ${e(role)}</p>
<p style="margin:0 0 20px"><a href="${e(input.actionLink)}" style="display:inline-block;background:#0f766e;color:#ffffff;text-decoration:none;padding:12px 20px;border-radius:8px;font-size:14px;font-weight:bold">Set your password</a></p>
<p style="margin:0 0 12px;font-size:13px;color:#555">This secure link expires in ${e(expiry)} and can be used once. If it has expired, ask your Super Admin to resend the invitation.</p>
<p style="margin:0 0 12px;font-size:13px;color:#555">After setting your password, sign in at <a href="${e(input.loginUrl)}">${e(input.loginUrl)}</a>.</p>
${supportHtml}
<p style="margin:20px 0 0;font-size:12px;color:#888">If you were not expecting this invitation, you can ignore this email.</p>
</td></tr></table>
</body></html>`;

  return { subject, html, text };
}

// ---------------------------------------------------------------------------
// Orchestration
// ---------------------------------------------------------------------------

export interface InviteMetadata {
  display_name: string;
  /** Display-only (email template). Authorisation always uses public.user_roles, never metadata. */
  cms_role_label: string;
}

export type LinkResult = { userId: string; actionLink: string } | { error: AuthErrorLike };
export type InviteResult = { userId: string } | { error: AuthErrorLike };

export interface InviteDeps {
  mode: EmailProviderMode;
  /** True when a CMS profile already uses this email. */
  profileExists(email: string): Promise<boolean>;
  /** Resend mode: create (or refresh, for an unaccepted user) the invite and return its link. */
  generateInviteLink(email: string, redirectTo: string, metadata: InviteMetadata): Promise<LinkResult>;
  /** Supabase-auth mode: Supabase creates the user and sends its own invite email. */
  inviteViaSupabase(email: string, redirectTo: string, metadata: InviteMetadata): Promise<InviteResult>;
  provision(userId: string): Promise<{ error?: string }>;
  deleteAuthUser(userId: string): Promise<{ error?: string }>;
  sendEmail(message: { to: string } & InviteEmail): Promise<{ ok: boolean; errorCode?: string }>;
  recordEvent(
    userId: string,
    event: "sent" | "resent" | "failed",
    provider: EmailProviderMode,
    errorCode?: string,
  ): Promise<{ error?: string }>;
}

export interface InviteContext {
  redirectTo: string;
  loginUrl: string;
  expiryHours: number;
  clinicName?: string;
  supportEmail?: string | null;
  supportPhone?: string | null;
}

export interface InviteOutcome {
  status: number;
  body: Record<string, unknown>;
}

function metadataFor(displayName: string, role: CmsInviteRole): InviteMetadata {
  return { display_name: displayName, cms_role_label: INVITE_ROLE_LABELS[role] };
}

async function deliver(
  deps: InviteDeps,
  args: { userId: string; email: string; displayName: string; role: CmsInviteRole; actionLink: string; resend: boolean },
  ctx: InviteContext,
): Promise<{ ok: boolean; errorCode?: string }> {
  const message = buildInviteEmail({
    recipientName: args.displayName,
    role: args.role,
    actionLink: args.actionLink,
    expiryHours: ctx.expiryHours,
    loginUrl: ctx.loginUrl,
    clinicName: ctx.clinicName,
    supportEmail: ctx.supportEmail,
    supportPhone: ctx.supportPhone,
    resend: args.resend,
  });
  try {
    const res = await deps.sendEmail({ to: args.email, ...message });
    return res.ok ? { ok: true } : { ok: false, errorCode: res.errorCode ?? "email_provider_error" };
  } catch {
    return { ok: false, errorCode: "email_provider_unreachable" };
  }
}

async function record(
  deps: InviteDeps,
  userId: string,
  event: "sent" | "resent" | "failed",
  errorCode?: string,
): Promise<string | null> {
  try {
    const res = await deps.recordEvent(userId, event, deps.mode, errorCode);
    return res.error ? "The invitation was processed but its audit entry could not be written." : null;
  } catch {
    return "The invitation was processed but its audit entry could not be written.";
  }
}

const DUPLICATE_MESSAGE =
  "An account with this email address already exists. If the person was invited earlier, use “Resend invitation” instead.";

/** Creates a CMS account by invitation. */
export async function runCreateInvite(
  params: { email: string; displayName: string; role: CmsInviteRole },
  ctx: InviteContext,
  deps: InviteDeps,
): Promise<InviteOutcome> {
  const { email, displayName, role } = params;

  if (await deps.profileExists(email)) {
    return { status: 409, body: { error: DUPLICATE_MESSAGE, code: "duplicate_account" } };
  }

  const metadata = metadataFor(displayName, role);
  let userId: string;
  let actionLink: string | null = null;

  if (deps.mode === "resend") {
    const res = await deps.generateInviteLink(email, ctx.redirectTo, metadata);
    if ("error" in res) {
      if (isDuplicateAccountError(res.error)) {
        return { status: 409, body: { error: DUPLICATE_MESSAGE, code: "duplicate_account" } };
      }
      return {
        status: 400,
        body: { error: `Could not create the sign-in account: ${res.error.message ?? "unknown error"}`, code: "auth_create_failed" },
      };
    }
    userId = res.userId;
    actionLink = res.actionLink;
  } else {
    const res = await deps.inviteViaSupabase(email, ctx.redirectTo, metadata);
    if ("error" in res) {
      if (isDuplicateAccountError(res.error)) {
        return { status: 409, body: { error: DUPLICATE_MESSAGE, code: "duplicate_account" } };
      }
      return {
        status: 400,
        body: { error: `Could not create or email the invitation: ${res.error.message ?? "unknown error"}`, code: "auth_invite_failed" },
      };
    }
    userId = res.userId;
  }

  // Profile + role + audit (one database transaction). On failure, remove the Auth user.
  const prov = await deps.provision(userId);
  if (prov.error) {
    const del = await deps.deleteAuthUser(userId);
    if (del.error) {
      return {
        status: 500,
        body: {
          error: `${prov.error}. The sign-in account could not be removed automatically (${del.error}); delete user ${userId} in Supabase Auth before retrying.`,
          code: "provision_failed_cleanup_failed",
        },
      };
    }
    return {
      status: 500,
      body: { error: `${prov.error}. No account was created; it is safe to try again.`, code: "provision_failed" },
    };
  }

  if (deps.mode === "supabase_auth") {
    const warning = await record(deps, userId, "sent");
    return {
      status: 200,
      body: { success: true, userId, email, role, emailSent: true, provider: deps.mode, inviteStatus: "pending", ...(warning ? { warning } : {}) },
    };
  }

  const delivery = await deliver(deps, { userId, email, displayName, role, actionLink: actionLink!, resend: false }, ctx);
  if (!delivery.ok) {
    await record(deps, userId, "failed", delivery.errorCode);
    return {
      status: 200,
      body: {
        success: true,
        userId,
        email,
        role,
        emailSent: false,
        provider: deps.mode,
        inviteStatus: "failed",
        warning:
          "The account was created but the invitation email could not be sent. Check the email provider settings, then use “Resend invitation”.",
      },
    };
  }

  const warning = await record(deps, userId, "sent");
  return {
    status: 200,
    body: { success: true, userId, email, role, emailSent: true, provider: deps.mode, inviteStatus: "pending", ...(warning ? { warning } : {}) },
  };
}

/** Sends a new invitation link to a user who has not accepted yet. The previous link stops working. */
export async function runResendInvite(
  params: {
    userId: string;
    email: string;
    displayName: string;
    role: CmsInviteRole;
    isActive: boolean;
    accepted: boolean;
    lastSentAt?: string | null;
    now?: Date;
  },
  ctx: InviteContext,
  deps: InviteDeps,
): Promise<InviteOutcome> {
  if (!params.isActive) {
    return { status: 400, body: { error: "Re-enable this account before resending the invitation.", code: "account_disabled" } };
  }
  if (params.accepted) {
    return {
      status: 409,
      body: {
        error: "This user has already accepted the invitation. They can use “Forgot password?” on the sign-in page.",
        code: "already_accepted",
      },
    };
  }
  if (params.lastSentAt) {
    const elapsed = ((params.now ?? new Date()).getTime() - Date.parse(params.lastSentAt)) / 1000;
    if (elapsed >= 0 && elapsed < INVITE_RESEND_COOLDOWN_SECONDS) {
      return {
        status: 429,
        body: { error: "An invitation was sent less than a minute ago. Please wait before resending.", code: "resend_cooldown" },
      };
    }
  }

  const metadata = metadataFor(params.displayName, params.role);

  if (deps.mode === "supabase_auth") {
    const res = await deps.inviteViaSupabase(params.email, ctx.redirectTo, metadata);
    if ("error" in res) {
      await record(deps, params.userId, "failed", isDuplicateAccountError(res.error) ? "already_accepted" : "auth_invite_failed");
      if (isDuplicateAccountError(res.error)) {
        return { status: 409, body: { error: "This user has already accepted the invitation.", code: "already_accepted" } };
      }
      return { status: 502, body: { error: `The invitation could not be resent: ${res.error.message ?? "unknown error"}`, code: "resend_failed" } };
    }
    const warning = await record(deps, params.userId, "resent");
    return { status: 200, body: { success: true, emailSent: true, provider: deps.mode, inviteStatus: "pending", ...(warning ? { warning } : {}) } };
  }

  const link = await deps.generateInviteLink(params.email, ctx.redirectTo, metadata);
  if ("error" in link) {
    if (isDuplicateAccountError(link.error)) {
      return { status: 409, body: { error: "This user has already accepted the invitation.", code: "already_accepted" } };
    }
    await record(deps, params.userId, "failed", "auth_link_failed");
    return { status: 502, body: { error: `A new invitation link could not be created: ${link.error.message ?? "unknown error"}`, code: "resend_failed" } };
  }
  if (link.userId !== params.userId) {
    // Defensive: never email a link for a different account.
    return { status: 409, body: { error: "The email address now belongs to a different account.", code: "account_mismatch" } };
  }

  const delivery = await deliver(
    deps,
    { userId: params.userId, email: params.email, displayName: params.displayName, role: params.role, actionLink: link.actionLink, resend: true },
    ctx,
  );
  if (!delivery.ok) {
    await record(deps, params.userId, "failed", delivery.errorCode);
    return {
      status: 502,
      body: { error: "The invitation email could not be sent. Check the email provider settings and try again.", code: "email_failed", inviteStatus: "failed" },
    };
  }
  const warning = await record(deps, params.userId, "resent");
  return { status: 200, body: { success: true, emailSent: true, provider: deps.mode, inviteStatus: "pending", ...(warning ? { warning } : {}) } };
}
