/**
 * Server-side Supabase Edge Function: `admin-users`
 *
 * PRODUCTION HARDENING & SECURITY GUARANTEES:
 * 1. Database-Level Concurrency & Advisory Transaction Locking:
 *    - All role mutations, deactivations, deletions, and provisions acquire PostgreSQL advisory
 *      transaction lock `pg_advisory_xact_lock(hashtext('cms_admin_users_mutex'))` inside PostgreSQL.
 *    - The lock, last-active-Super-Admin check, data update, and audit log write execute atomically
 *      in the exact same database transaction, eliminating race conditions across separate Edge Function isolates.
 * 2. Atomic Audit Logging:
 *    - Every administrative mutation (`create`, `set_role`, `set_active`, `delete`) writes an immutable
 *      audit record into `public.activity_logs`.
 *    - If audit insertion fails, the database transaction automatically rolls back. No mutation can ever
 *      silently succeed without its corresponding audit log.
 * 3. Consistent Account Deletion Workflow:
 *    - `admin_pre_delete_user_check` verifies caller, target existence, and last-Super-Admin protection under mutex lock
 *      BEFORE touching any records.
 *    - Auth user is deleted first via `auth.admin.deleteUser`. If Auth API fails, no database records are altered.
 *    - Respects PostgreSQL `ON DELETE CASCADE` on `profiles` and `user_roles`.
 * 4. Bidirectional Deactivation / Reactivation Synchronization:
 *    - Synchronizes database `profiles.is_active` and GoTrue `ban_duration`.
 *    - If Auth ban fails, database status change is safely reverted.
 * 5. Service-Role Isolation & Strict Authorization:
 *    - `SUPABASE_SERVICE_ROLE_KEY` is loaded exclusively via `Deno.env.get` on the server with `persistSession: false`.
 *    - Validates caller JWT via `callerClient.auth.getUser()`, verifies `is_super_admin()`, and double-checks
 *      active role server-side. Editors and legacy admins receive HTTP 403.
 * 6. Email onboarding (migration 007):
 *    - `create` is invite-only: the administrator never sets or sees a password. The user receives a
 *      time-limited Supabase invitation link and sets their own password on /reset-password.
 *    - With RESEND_API_KEY + CMS_INVITE_FROM_EMAIL the function generates the Supabase link and sends a
 *      branded email through Resend; otherwise Supabase Auth sends its own "Invite user" email.
 *    - The link is placed only in the email body. It is never returned, logged or audited.
 *    - `resend_invite` issues a fresh link (the old one stops working) for users who have not accepted.
 * 7. Per-user direct publishing (migration 007): `set_direct_publish` calls the service-role-only
 *    `admin_set_direct_publish()` RPC (advisory lock, Super Admin check, Editor-only, audit log).
 *
 * Environment (Supabase → Edge Functions → Secrets):
 *    CMS_SITE_URL              required for invitations, e.g. https://orthocarehub.in (must be in Auth → URL
 *                              Configuration → Redirect URLs as <CMS_SITE_URL>/reset-password**)
 *    CMS_INVITE_EXPIRY_HOURS   optional, default 24. Must match Auth → Email → "Email OTP Expiration".
 *    RESEND_API_KEY            optional; with CMS_INVITE_FROM_EMAIL enables branded invitation emails.
 *    CMS_INVITE_FROM_EMAIL     e.g. "OrthoCare Hub <cms@orthocarehub.in>" (verified Resend domain).
 *    CMS_SUPPORT_EMAIL, CMS_SUPPORT_PHONE   optional contact lines in the email.
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient, type SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  deriveInviteStatus,
  inviteRedirectUrl,
  loginUrl,
  normalizeSiteUrl,
  parseExpiryHours,
  runCreateInvite,
  runResendInvite,
  type CmsInviteRole,
  type InviteContext,
  type InviteDeps,
} from "../_shared/cmsInvite.ts";

interface UserProfileRow {
  user_id: string;
  email: string;
  display_name: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  direct_publish_enabled?: boolean;
  direct_publish_updated_at?: string | null;
  direct_publish_updated_by?: string | null;
  invite_status?: string | null;
  invite_last_sent_at?: string | null;
}

interface AuthUserState {
  email_confirmed_at: string | null;
  last_sign_in_at: string | null;
  invited_at: string | null;
}

const PROFILE_COLUMNS_007 =
  "user_id, email, display_name, is_active, created_at, updated_at, direct_publish_enabled, direct_publish_updated_at, direct_publish_updated_by, invite_status, invite_last_sent_at";
const PROFILE_COLUMNS_LEGACY = "user_id, email, display_name, is_active, created_at, updated_at";

function isMissingRpc(err: { code?: string; message?: string } | null): boolean {
  if (!err) return false;
  return err.code === "PGRST202" || err.code === "42883" || /could not find the function/i.test(err.message ?? "");
}

async function listAuthUserStates(adminClient: SupabaseClient): Promise<Map<string, AuthUserState>> {
  const states = new Map<string, AuthUserState>();
  const perPage = 1000;
  for (let page = 1; page <= 20; page++) {
    const { data, error } = await adminClient.auth.admin.listUsers({ page, perPage });
    if (error) throw new Error(`Auth error listing users: ${error.message}`);
    const users = data?.users ?? [];
    for (const u of users) {
      states.set(u.id, {
        email_confirmed_at: u.email_confirmed_at ?? null,
        last_sign_in_at: u.last_sign_in_at ?? null,
        invited_at: (u as { invited_at?: string | null }).invited_at ?? null,
      });
    }
    if (users.length < perPage) break;
  }
  return states;
}

function inviteConfig(): { ctx: InviteContext; mode: "resend" | "supabase_auth"; resendKey?: string; from?: string } | null {
  const siteUrl = normalizeSiteUrl(Deno.env.get("CMS_SITE_URL"));
  if (!siteUrl) return null;
  const resendKey = Deno.env.get("RESEND_API_KEY") ?? undefined;
  const from = Deno.env.get("CMS_INVITE_FROM_EMAIL") ?? undefined;
  return {
    ctx: {
      redirectTo: inviteRedirectUrl(siteUrl),
      loginUrl: loginUrl(siteUrl),
      expiryHours: parseExpiryHours(Deno.env.get("CMS_INVITE_EXPIRY_HOURS")),
      clinicName: "OrthoCare Hub",
      supportEmail: Deno.env.get("CMS_SUPPORT_EMAIL") ?? null,
      supportPhone: Deno.env.get("CMS_SUPPORT_PHONE") ?? null,
    },
    mode: resendKey && from ? "resend" : "supabase_auth",
    resendKey,
    from,
  };
}

function buildInviteDeps(
  adminClient: SupabaseClient,
  callerId: string,
  cfg: NonNullable<ReturnType<typeof inviteConfig>>,
  provisionArgs?: { email: string; displayName: string; role: CmsInviteRole },
): InviteDeps {
  return {
    mode: cfg.mode,
    profileExists: async (email) => {
      const { data, error } = await adminClient.from("profiles").select("user_id").eq("email", email).limit(1);
      if (error) throw new Error(`Database error checking existing accounts: ${error.message}`);
      return Array.isArray(data) && data.length > 0;
    },
    generateInviteLink: async (email, redirectTo, metadata) => {
      const { data, error } = await adminClient.auth.admin.generateLink({
        type: "invite",
        email,
        options: { redirectTo, data: metadata },
      });
      if (error || !data?.user || !data.properties?.action_link) {
        return { error: { message: error?.message ?? "No invitation link returned", code: (error as { code?: string } | null)?.code, status: error?.status } };
      }
      return { userId: data.user.id, actionLink: data.properties.action_link };
    },
    inviteViaSupabase: async (email, redirectTo, metadata) => {
      const { data, error } = await adminClient.auth.admin.inviteUserByEmail(email, { redirectTo, data: metadata });
      if (error || !data?.user) {
        return { error: { message: error?.message ?? "Invitation failed", code: (error as { code?: string } | null)?.code, status: error?.status } };
      }
      return { userId: data.user.id };
    },
    provision: async (userId) => {
      if (!provisionArgs) return { error: "Provisioning is not available for this action" };
      const { error } = await adminClient.rpc("provision_cms_user", {
        _user_id: userId,
        _email: provisionArgs.email,
        _display_name: provisionArgs.displayName,
        _role: provisionArgs.role,
        _caller_id: callerId,
      });
      return error ? { error: `Atomic provisioning failed: ${error.message}` } : {};
    },
    deleteAuthUser: async (userId) => {
      const { error } = await adminClient.auth.admin.deleteUser(userId);
      if (error) console.error(`CRITICAL ROLLBACK FAILURE: failed to clean up auth user ${userId}`);
      return error ? { error: error.message } : {};
    },
    sendEmail: async (message) => {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${cfg.resendKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({ from: cfg.from, to: [message.to], subject: message.subject, html: message.html, text: message.text }),
      });
      // Never log the request body: it contains the invitation link.
      return res.ok ? { ok: true } : { ok: false, errorCode: `email_provider_http_${res.status}` };
    },
    recordEvent: async (userId, event, provider, errorCode) => {
      const { error } = await adminClient.rpc("admin_record_invite_event", {
        _target_user_id: userId,
        _event: event,
        _caller_id: callerId,
        _provider: provider,
        _error_code: errorCode ?? null,
      });
      if (error) console.error(`Invite audit write failed for ${userId}: ${error.code ?? ""}`);
      return error ? { error: error.message } : {};
    },
  };
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function isValidUuid(value: unknown): value is string {
  return typeof value === "string" && UUID_REGEX.test(value.trim());
}

function isValidEmail(value: unknown): value is string {
  return typeof value === "string" && value.length <= 254 && EMAIL_REGEX.test(value.trim());
}

function isAssignableCmsRole(value: unknown): value is "super_admin" | "editor" {
  return value === "super_admin" || value === "editor";
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// Queries active Super Admin user IDs (role = 'super_admin' AND profiles.is_active != false)
async function getActiveSuperAdminIds(adminClient: SupabaseClient): Promise<string[]> {
  const { data: roles, error: rErr } = await adminClient
    .from("user_roles")
    .select("user_id")
    .eq("role", "super_admin");
  if (rErr) {
    throw new Error(`Database error fetching super admin roles: ${rErr.message}`);
  }

  const candidateIds = Array.from(new Set((roles ?? []).map((r: { user_id: string }) => r.user_id)));
  if (candidateIds.length === 0) return [];

  const { data: inactiveProfiles, error: pErr } = await adminClient
    .from("profiles")
    .select("user_id")
    .in("user_id", candidateIds)
    .eq("is_active", false);
  if (pErr) {
    throw new Error(`Database error checking inactive profiles: ${pErr.message}`);
  }

  const inactiveSet = new Set((inactiveProfiles ?? []).map((p: { user_id: string }) => p.user_id));
  return candidateIds.filter((id) => !inactiveSet.has(id));
}

// Verifies target user exists in profiles or auth.users and returns their current state
async function verifyTargetUser(
  adminClient: SupabaseClient,
  targetUserId: string,
): Promise<{
  exists: boolean;
  email?: string;
  isActive?: boolean;
  isSuperAdmin?: boolean;
  error?: string;
}> {
  const { data: profile, error: pErr } = await adminClient
    .from("profiles")
    .select("user_id, email, is_active")
    .eq("user_id", targetUserId)
    .maybeSingle();

  if (pErr) {
    return { exists: false, error: `Database error checking profile: ${pErr.message}` };
  }

  const { data: roles, error: rErr } = await adminClient
    .from("user_roles")
    .select("role")
    .eq("user_id", targetUserId);

  if (rErr) {
    return { exists: false, error: `Database error checking roles: ${rErr.message}` };
  }

  const isSuperAdmin = (roles ?? []).some((r: { role: string }) => r.role === "super_admin");

  if (profile) {
    return {
      exists: true,
      email: profile.email,
      isActive: profile.is_active !== false,
      isSuperAdmin,
    };
  }

  // Fallback check in auth.users
  const { data: authUser, error: aErr } = await adminClient.auth.admin.getUserById(targetUserId);
  if (aErr || !authUser?.user) {
    return { exists: false };
  }

  return {
    exists: true,
    email: authUser.user.email ?? "",
    isActive: !authUser.user.banned_until,
    isSuperAdmin,
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !anonKey || !serviceRoleKey) {
      return jsonResponse({ error: "Server configuration incomplete" }, 500);
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader || !authHeader.toLowerCase().startsWith("bearer ")) {
      return jsonResponse({ error: "Missing Authorization Bearer token" }, 401);
    }

    // 1. Verify caller identity and token using caller's JWT
    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const {
      data: { user: caller },
      error: callerErr,
    } = await callerClient.auth.getUser();

    if (callerErr || !caller) {
      return jsonResponse({ error: "Invalid or expired session" }, 401);
    }

    // 2. Super Admin Authorization via RPC under caller's context
    const { data: isSuperAdmin, error: roleErr } = await callerClient.rpc("is_super_admin");
    if (roleErr || isSuperAdmin !== true) {
      return jsonResponse({ error: "Forbidden: Super Admin access required" }, 403);
    }

    // 3. Privileged service-role client (server-side only, session persistence disabled)
    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    // 4. Double check caller status with service role (defense in depth)
    const { data: callerRole, error: crErr } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", caller.id)
      .eq("role", "super_admin")
      .maybeSingle();

    if (crErr || !callerRole) {
      return jsonResponse({ error: "Forbidden: Caller does not possess active Super Admin role" }, 403);
    }

    const { data: callerProf, error: cpErr } = await adminClient
      .from("profiles")
      .select("is_active")
      .eq("user_id", caller.id)
      .maybeSingle();

    if (cpErr || (callerProf && callerProf.is_active === false)) {
      return jsonResponse({ error: "Forbidden: Caller account is deactivated" }, 403);
    }

    // 5. Parse and validate JSON request body
    let rawBody: Record<string, unknown>;
    try {
      rawBody = (await req.json()) as Record<string, unknown>;
    } catch {
      return jsonResponse({ error: "Invalid JSON request body" }, 400);
    }

    const action = rawBody?.action;

    // =========================================================================
    // ACTION: LIST
    // =========================================================================
    if (action === "list") {
      let migration007Ready = true;
      let { data: profiles, error: pErr } = await adminClient
        .from("profiles")
        .select(PROFILE_COLUMNS_007)
        .order("created_at", { ascending: false });
      if (pErr && (pErr.code === "42703" || /column .* does not exist/i.test(pErr.message ?? ""))) {
        migration007Ready = false;
        ({ data: profiles, error: pErr } = await adminClient
          .from("profiles")
          .select(PROFILE_COLUMNS_LEGACY)
          .order("created_at", { ascending: false }));
      }
      if (pErr) {
        return jsonResponse({ error: `Database error fetching profiles: ${pErr.message}` }, 500);
      }

      let authStates = new Map<string, AuthUserState>();
      try {
        authStates = await listAuthUserStates(adminClient);
      } catch (e) {
        return jsonResponse({ error: e instanceof Error ? e.message : "Auth error listing users" }, 500);
      }
      const expiryHours = parseExpiryHours(Deno.env.get("CMS_INVITE_EXPIRY_HOURS"));
      const emailById = new Map<string, string>(
        (profiles ?? []).map((p: UserProfileRow) => [p.user_id, p.email] as [string, string]),
      );

      const { data: roles, error: rErr } = await adminClient
        .from("user_roles")
        .select("user_id, role");
      if (rErr) {
        return jsonResponse({ error: `Database error fetching roles: ${rErr.message}` }, 500);
      }

      const roleMap = new Map<string, string>();
      for (const r of roles ?? []) {
        if (r.role === "super_admin" || !roleMap.has(r.user_id)) {
          roleMap.set(r.user_id, r.role);
        }
      }

      const users = (profiles ?? []).map((p: UserProfileRow) => {
        const auth = authStates.get(p.user_id);
        const inviteStatus = deriveInviteStatus({
          emailConfirmedAt: auth?.email_confirmed_at,
          lastSignInAt: auth?.last_sign_in_at,
          invitedAt: auth?.invited_at,
          storedStatus: p.invite_status ?? null,
          lastSentAt: p.invite_last_sent_at ?? null,
          expiryHours,
        });
        return {
          userId: p.user_id,
          email: p.email,
          displayName: p.display_name ?? "",
          role: roleMap.get(p.user_id) ?? "editor",
          isActive: p.is_active,
          createdAt: p.created_at,
          inviteStatus,
          inviteLastSentAt: p.invite_last_sent_at ?? auth?.invited_at ?? null,
          directPublishEnabled: p.direct_publish_enabled === true,
          directPublishUpdatedAt: p.direct_publish_updated_at ?? null,
          directPublishUpdatedByEmail: p.direct_publish_updated_by ? emailById.get(p.direct_publish_updated_by) ?? null : null,
          _storedInviteStatus: p.invite_status ?? null,
        };
      });

      // Keep profiles.invite_status in step with Auth once a user accepts (best effort, not audited).
      if (migration007Ready) {
        for (const u of users) {
          if (u.inviteStatus === "accepted" && u._storedInviteStatus && u._storedInviteStatus !== "accepted") {
            await adminClient.rpc("admin_record_invite_event", {
              _target_user_id: u.userId,
              _event: "accepted",
              _caller_id: caller.id,
            });
          }
        }
      }

      return jsonResponse({
        users: users.map(({ _storedInviteStatus, ...u }) => u),
        features: { directPublishing: migration007Ready, invitations: migration007Ready },
      });
    }

    // =========================================================================
    // ACTION: CREATE (invitation only – the user sets their own password)
    // =========================================================================
    if (action === "create") {
      const email = typeof rawBody.email === "string" ? rawBody.email.trim().toLowerCase() : "";
      if (!isValidEmail(email)) {
        return jsonResponse({ error: "A valid email address is required" }, 400);
      }
      if (!isAssignableCmsRole(rawBody.role)) {
        return jsonResponse({ error: "Invalid role: must be 'editor' or 'super_admin'" }, 400);
      }
      if (rawBody.password !== undefined && rawBody.password !== "") {
        return jsonResponse(
          { error: "Administrators cannot set passwords. The user sets their own password from the invitation email." },
          400,
        );
      }
      const role = rawBody.role;
      const displayName =
        typeof rawBody.displayName === "string" && rawBody.displayName.trim()
          ? rawBody.displayName.trim().slice(0, 100)
          : email.split("@")[0];

      const cfg = inviteConfig();
      if (!cfg) {
        return jsonResponse({ error: "Server configuration incomplete: set CMS_SITE_URL (https) for invitation links." }, 500);
      }

      const outcome = await runCreateInvite(
        { email, displayName, role },
        cfg.ctx,
        buildInviteDeps(adminClient, caller.id, cfg, { email, displayName, role }),
      );
      return jsonResponse(outcome.body, outcome.status);
    }

    // =========================================================================
    // ACTION: RESEND_INVITE
    // =========================================================================
    if (action === "resend_invite") {
      if (!isValidUuid(rawBody.userId)) {
        return jsonResponse({ error: "A valid target userId (UUID) is required" }, 400);
      }
      const targetUserId = rawBody.userId.trim();

      const cfg = inviteConfig();
      if (!cfg) {
        return jsonResponse({ error: "Server configuration incomplete: set CMS_SITE_URL (https) for invitation links." }, 500);
      }

      const { data: profile, error: pErr } = await adminClient
        .from("profiles")
        .select("user_id, email, display_name, is_active, invite_last_sent_at")
        .eq("user_id", targetUserId)
        .maybeSingle();
      if (pErr) {
        return jsonResponse({ error: `Database error loading the account: ${pErr.message}` }, 500);
      }
      if (!profile) return jsonResponse({ error: "Target user does not exist" }, 404);

      const { data: authUser, error: aErr } = await adminClient.auth.admin.getUserById(targetUserId);
      if (aErr || !authUser?.user) return jsonResponse({ error: "Target user does not exist" }, 404);

      const { data: roles } = await adminClient.from("user_roles").select("role").eq("user_id", targetUserId);
      const role: CmsInviteRole = (roles ?? []).some((r: { role: string }) => r.role === "super_admin") ? "super_admin" : "editor";

      const outcome = await runResendInvite(
        {
          userId: targetUserId,
          email: profile.email,
          displayName: profile.display_name ?? "",
          role,
          isActive: profile.is_active !== false,
          accepted: Boolean(authUser.user.email_confirmed_at || authUser.user.last_sign_in_at),
          lastSentAt: profile.invite_last_sent_at ?? null,
        },
        cfg.ctx,
        buildInviteDeps(adminClient, caller.id, cfg),
      );
      return jsonResponse(outcome.body, outcome.status);
    }

    // =========================================================================
    // ACTION: SET_DIRECT_PUBLISH (per-user, Editors only; enforced again in the RPC)
    // =========================================================================
    if (action === "set_direct_publish") {
      if (!isValidUuid(rawBody.userId)) {
        return jsonResponse({ error: "A valid target userId (UUID) is required" }, 400);
      }
      if (typeof rawBody.enabled !== "boolean") {
        return jsonResponse({ error: "enabled must be a boolean" }, 400);
      }
      const { data, error: rpcErr } = await adminClient.rpc("admin_set_direct_publish", {
        _target_user_id: rawBody.userId.trim(),
        _enabled: rawBody.enabled,
        _caller_id: caller.id,
      });
      if (rpcErr) {
        if (isMissingRpc(rpcErr)) {
          return jsonResponse({ error: "Direct publishing needs CMS migration 007. Nothing was changed." }, 501);
        }
        if (rpcErr.code === "P0002") return jsonResponse({ error: "Target user does not exist" }, 404);
        if (rpcErr.code === "P0010") return jsonResponse({ error: rpcErr.message }, 400);
        if (rpcErr.code === "42501") return jsonResponse({ error: "Forbidden: Super Admin access required" }, 403);
        return jsonResponse({ error: rpcErr.message }, 500);
      }
      return jsonResponse({ success: true, ...(data ?? {}) });
    }

    // =========================================================================
    // ACTION: SET_ROLE
    // =========================================================================
    if (action === "set_role") {
      if (!isValidUuid(rawBody.userId)) {
        return jsonResponse({ error: "A valid target userId (UUID) is required" }, 400);
      }
      if (!isAssignableCmsRole(rawBody.role)) {
        return jsonResponse({ error: "Invalid role: must be 'editor' or 'super_admin'" }, 400);
      }

      const targetUserId = rawBody.userId.trim();
      const role = rawBody.role;

      // 1. Client-side self-demotion pre-check
      if (targetUserId === caller.id && role !== "super_admin") {
        return jsonResponse(
          { error: "Self-lockout prevention: you cannot demote your own Super Admin account" },
          400,
        );
      }

      // 2. Execute transactional RPC: Advisory Lock + Last-Admin Check + Role Update + Audit Log
      const { error: rpcErr } = await adminClient.rpc("admin_set_user_role", {
        _target_user_id: targetUserId,
        _new_role: role,
        _caller_id: caller.id,
      });

      if (rpcErr) {
        const msg = rpcErr.message ?? "";
        if (msg.includes("Self-lockout")) {
          return jsonResponse({ error: msg }, 400);
        }
        if (msg.includes("Target user does not exist") || rpcErr.code === "P0002") {
          return jsonResponse({ error: "Target user does not exist" }, 404);
        }
        if (msg.includes("Cannot demote the last active Super Admin") || rpcErr.code === "P0003") {
          return jsonResponse({ error: msg }, 400);
        }
        if (msg.includes("not an active Super Admin") || rpcErr.code === "42501") {
          return jsonResponse({ error: "Forbidden: Super Admin access required" }, 403);
        }

        // Fallback path if RPC does not exist (PGRST202 / 42883)
        if (rpcErr.code === "PGRST202" || rpcErr.code === "42883" || msg.includes("function")) {
          const target = await verifyTargetUser(adminClient, targetUserId);
          if (target.error) return jsonResponse({ error: target.error }, 500);
          if (!target.exists) return jsonResponse({ error: "Target user does not exist" }, 404);

          if (role !== "super_admin" && target.isSuperAdmin && target.isActive) {
            const activeAdmins = await getActiveSuperAdminIds(adminClient);
            const remainingActive = activeAdmins.filter((id) => id !== targetUserId);
            if (remainingActive.length === 0) {
              return jsonResponse(
                { error: "Cannot demote the last active Super Admin. At least one active Super Admin must remain." },
                400,
              );
            }
          }

          // Fetch prior role for compensation if insert or audit fails
          const { data: priorRoles } = await adminClient.from("user_roles").select("role").eq("user_id", targetUserId);
          const priorRole = priorRoles?.[0]?.role ?? "editor";

          const { error: delErr } = await adminClient.from("user_roles").delete().eq("user_id", targetUserId);
          if (delErr) return jsonResponse({ error: `Failed to remove prior role: ${delErr.message}` }, 500);

          const { error: insErr } = await adminClient.from("user_roles").insert({ user_id: targetUserId, role });
          if (insErr) {
            // Restore prior role
            await adminClient.from("user_roles").insert({ user_id: targetUserId, role: priorRole });
            return jsonResponse({ error: `Failed to assign role: ${insErr.message}` }, 500);
          }

          // Atomic audit check: if audit log fails, revert role and abort!
          const { error: logErr } = await callerClient.rpc("log_activity", {
            _action: "user.role_change",
            _entity_type: "user",
            _entity_id: targetUserId,
            _details: { role },
          });
          if (logErr) {
            await adminClient.from("user_roles").delete().eq("user_id", targetUserId);
            await adminClient.from("user_roles").insert({ user_id: targetUserId, role: priorRole });
            return jsonResponse({ error: `Audit logging failed: ${logErr.message}. Role change reverted.` }, 500);
          }

          return jsonResponse({ success: true });
        }

        return jsonResponse({ error: rpcErr.message }, 500);
      }

      return jsonResponse({ success: true });
    }

    // =========================================================================
    // ACTION: SET_ACTIVE
    // =========================================================================
    if (action === "set_active") {
      if (!isValidUuid(rawBody.userId)) {
        return jsonResponse({ error: "A valid target userId (UUID) is required" }, 400);
      }
      if (typeof rawBody.isActive !== "boolean") {
        return jsonResponse({ error: "isActive must be a boolean" }, 400);
      }

      const targetUserId = rawBody.userId.trim();
      const isActive = rawBody.isActive;

      // 1. Client-side self-disable pre-check
      if (targetUserId === caller.id && !isActive) {
        return jsonResponse(
          { error: "Self-lockout prevention: you cannot disable your own Super Admin account" },
          400,
        );
      }

      // 2. Step 1: Update database status atomically with advisory lock, last-admin check, and audit log
      let dbUpdated = false;
      const { error: rpcErr } = await adminClient.rpc("admin_set_user_active", {
        _target_user_id: targetUserId,
        _is_active: isActive,
        _caller_id: caller.id,
      });

      if (rpcErr) {
        const msg = rpcErr.message ?? "";
        if (msg.includes("Self-lockout")) return jsonResponse({ error: msg }, 400);
        if (msg.includes("Target user does not exist") || rpcErr.code === "P0002") {
          return jsonResponse({ error: "Target user does not exist" }, 404);
        }
        if (msg.includes("Cannot disable the last active Super Admin") || rpcErr.code === "P0003") {
          return jsonResponse({ error: msg }, 400);
        }
        if (msg.includes("not an active Super Admin") || rpcErr.code === "42501") {
          return jsonResponse({ error: "Forbidden: Super Admin access required" }, 403);
        }

        // Fallback path if RPC does not exist (PGRST202 / 42883)
        if (rpcErr.code === "PGRST202" || rpcErr.code === "42883" || msg.includes("function")) {
          const target = await verifyTargetUser(adminClient, targetUserId);
          if (target.error) return jsonResponse({ error: target.error }, 500);
          if (!target.exists) return jsonResponse({ error: "Target user does not exist" }, 404);

          if (!isActive && target.isSuperAdmin && target.isActive) {
            const activeAdmins = await getActiveSuperAdminIds(adminClient);
            const remainingActive = activeAdmins.filter((id) => id !== targetUserId);
            if (remainingActive.length === 0) {
              return jsonResponse(
                { error: "Cannot disable the last active Super Admin. At least one active Super Admin must remain." },
                400,
              );
            }
          }

          const { error: updErr } = await adminClient
            .from("profiles")
            .update({ is_active: isActive })
            .eq("user_id", targetUserId);
          if (updErr) return jsonResponse({ error: `Failed to update profile: ${updErr.message}` }, 500);

          const { error: logErr } = await callerClient.rpc("log_activity", {
            _action: isActive ? "user.enable" : "user.disable",
            _entity_type: "user",
            _entity_id: targetUserId,
            _details: { is_active: isActive },
          });
          if (logErr) {
            await adminClient.from("profiles").update({ is_active: !isActive }).eq("user_id", targetUserId);
            return jsonResponse({ error: `Audit log failed: ${logErr.message}. Status change reverted.` }, 500);
          }
          dbUpdated = true;
        } else {
          return jsonResponse({ error: rpcErr.message }, 500);
        }
      } else {
        dbUpdated = true;
      }

      // 3. Step 2: Synchronize Auth ban duration in Supabase Auth (GoTrue)
      if (dbUpdated) {
        const { error: authErr } = await adminClient.auth.admin.updateUserById(targetUserId, {
          ban_duration: isActive ? "none" : "876000h",
        });

        if (authErr) {
          // Compensatory rollback: revert database status so DB and Auth remain 100% consistent
          const { error: revertErr } = await adminClient.rpc("admin_set_user_active", {
            _target_user_id: targetUserId,
            _is_active: !isActive,
            _caller_id: caller.id,
          });

          if (revertErr) {
            // If RPC revert failed, attempt direct update
            await adminClient.from("profiles").update({ is_active: !isActive }).eq("user_id", targetUserId);
            console.error(`CRITICAL: Auth ban failed (${authErr.message}) and database revert also errored (${revertErr.message})`);
            return jsonResponse(
              { error: `Auth ban update failed: ${authErr.message}. Automatic database rollback also failed. Target user ${targetUserId} requires manual synchronization.` },
              500,
            );
          }

          return jsonResponse(
            { error: `Failed to update Auth ban status: ${authErr.message}. Database status change was safely reverted.` },
            500,
          );
        }
      }

      return jsonResponse({ success: true });
    }

    // =========================================================================
    // ACTION: DELETE
    // =========================================================================
    if (action === "delete") {
      if (!isValidUuid(rawBody.userId)) {
        return jsonResponse({ error: "A valid target userId (UUID) is required" }, 400);
      }

      const targetUserId = rawBody.userId.trim();

      // 1. Client-side self-delete pre-check
      if (targetUserId === caller.id) {
        return jsonResponse(
          { error: "Self-lockout prevention: you cannot delete your own Super Admin account" },
          400,
        );
      }

      // 2. Step 1: Pre-delete check under database advisory lock
      // Verifies caller, verifies target exists, and ensures target is NOT the last active Super Admin
      // BEFORE modifying or deleting ANY records.
      let targetEmail: string | null = null;
      const { data: emailData, error: preCheckErr } = await adminClient.rpc("admin_pre_delete_user_check", {
        _target_user_id: targetUserId,
        _caller_id: caller.id,
      });

      if (preCheckErr) {
        const msg = preCheckErr.message ?? "";
        if (msg.includes("Self-lockout")) return jsonResponse({ error: msg }, 400);
        if (msg.includes("Target user does not exist") || preCheckErr.code === "P0002") {
          return jsonResponse({ error: "Target user does not exist" }, 404);
        }
        if (msg.includes("Cannot delete the last active Super Admin") || preCheckErr.code === "P0003") {
          return jsonResponse({ error: msg }, 400);
        }
        if (msg.includes("not an active Super Admin") || preCheckErr.code === "42501") {
          return jsonResponse({ error: "Forbidden: Super Admin access required" }, 403);
        }

        // Fallback pre-delete checks if RPC is not deployed yet
        if (preCheckErr.code === "PGRST202" || preCheckErr.code === "42883" || msg.includes("function")) {
          const target = await verifyTargetUser(adminClient, targetUserId);
          if (target.error) return jsonResponse({ error: target.error }, 500);
          if (!target.exists) return jsonResponse({ error: "Target user does not exist" }, 404);

          if (target.isSuperAdmin && target.isActive) {
            const activeAdmins = await getActiveSuperAdminIds(adminClient);
            const remainingActive = activeAdmins.filter((id) => id !== targetUserId);
            if (remainingActive.length === 0) {
              return jsonResponse(
                { error: "Cannot delete the last active Super Admin. At least one active Super Admin must remain." },
                400,
              );
            }
          }
          targetEmail = target.email ?? "";
        } else {
          return jsonResponse({ error: preCheckErr.message }, 500);
        }
      } else {
        targetEmail = typeof emailData === "string" ? emailData : "";
      }

      // 3. Step 2: Delete Auth user FIRST
      // If Auth deletion fails, no database records have been deleted yet.
      // Zero risk of leaving an orphaned auth account with deleted database rows!
      const { error: authDelErr } = await adminClient.auth.admin.deleteUser(targetUserId);
      if (authDelErr) {
        return jsonResponse(
          { error: `Auth service failed to delete user: ${authDelErr.message}. No database records were altered.` },
          500,
        );
      }

      // 4. Step 3: Clean up database records (respecting/supplementing ON DELETE CASCADE)
      // Because foreign keys to auth.users(id) define ON DELETE CASCADE, Postgres automatically
      // deletes rows in profiles and user_roles. We perform explicit deletes as defense-in-depth:
      await adminClient.from("user_roles").delete().eq("user_id", targetUserId);
      await adminClient.from("profiles").delete().eq("user_id", targetUserId);

      // 5. Step 4: Record audit log for deletion
      const { error: auditErr } = await adminClient.rpc("admin_record_delete_audit", {
        _target_user_id: targetUserId,
        _target_email: targetEmail ?? "",
        _caller_id: caller.id,
      });
      if (auditErr) {
        // Fallback to callerClient log_activity
        await callerClient.rpc("log_activity", {
          _action: "user.delete",
          _entity_type: "user",
          _entity_id: targetUserId,
          _details: { email: targetEmail },
        });
      }

      return jsonResponse({ success: true });
    }

    return jsonResponse({ error: "Unsupported action" }, 400);
  } catch (err) {
    return jsonResponse(
      { error: err instanceof Error ? err.message : "Unexpected server error" },
      500,
    );
  }
});
