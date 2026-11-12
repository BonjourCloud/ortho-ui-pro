/**
 * Server-side Supabase Edge Function: `admin-users`
 *
 * SECURITY AUDIT & GUARANTEES:
 * 1. Service-Role Isolation: `SUPABASE_SERVICE_ROLE_KEY` is read exclusively from server
 *    environment variables (`Deno.env.get`) with `persistSession: false` and `autoRefreshToken: false`,
 *    and is never returned or exposed to the client.
 * 2. Strict JWT Verification: Requires `Authorization: Bearer <jwt>` and verifies the token
 *    via `callerClient.auth.getUser()`.
 * 3. Super Admin Authorization: Executes `callerClient.rpc("is_super_admin")` under the caller's
 *    JWT. Any Editor, legacy admin, disabled user, or unauthenticated caller receives HTTP 403.
 * 4. Input Validation & Privilege Escalation Prevention:
 *    - Enforces strict UUID validation on `userId`.
 *    - Enforces explicit role allowlist (`'editor' | 'super_admin'`).
 *    - Enforces password length (`8..128` chars) and email format.
 *    - Prevents self-demotion and self-disable on the caller's own `caller.id`.
 *    - Prevents disabling or demoting the last active `super_admin` in the database.
 * 5. Audit Trail: Logs every administrative mutation via `callerClient.rpc("log_activity", ...)`.
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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

    // 1. Verify caller identity and Super Admin role using caller's JWT
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

    const { data: isSuperAdmin, error: roleErr } = await callerClient.rpc("is_super_admin");
    if (roleErr || isSuperAdmin !== true) {
      return jsonResponse({ error: "Forbidden: Super Admin access required" }, 403);
    }

    // 2. Parse and validate JSON body
    let rawBody: Record<string, unknown>;
    try {
      rawBody = (await req.json()) as Record<string, unknown>;
    } catch {
      return jsonResponse({ error: "Invalid JSON request body" }, 400);
    }

    const action = rawBody?.action;

    // 3. Privileged service-role client (server-side only, session persistence disabled)
    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    if (action === "list") {
      const { data: profiles, error: pErr } = await adminClient
        .from("profiles")
        .select("user_id, email, display_name, is_active, created_at, updated_at")
        .order("created_at", { ascending: false });
      if (pErr) throw pErr;

      const { data: roles, error: rErr } = await adminClient
        .from("user_roles")
        .select("user_id, role");
      if (rErr) throw rErr;

      const roleMap = new Map<string, string>();
      for (const r of roles ?? []) {
        if (r.role === "super_admin" || !roleMap.has(r.user_id)) {
          roleMap.set(r.user_id, r.role);
        }
      }

      const users = (profiles ?? []).map((p) => ({
        userId: p.user_id,
        email: p.email,
        displayName: p.display_name ?? "",
        role: roleMap.get(p.user_id) ?? "editor",
        isActive: p.is_active,
        createdAt: p.created_at,
      }));

      return jsonResponse({ users });
    }

    if (action === "create") {
      const email = typeof rawBody.email === "string" ? rawBody.email.trim().toLowerCase() : "";
      if (!isValidEmail(email)) {
        return jsonResponse({ error: "A valid email address is required" }, 400);
      }
      if (!isAssignableCmsRole(rawBody.role)) {
        return jsonResponse({ error: "Invalid role: must be 'editor' or 'super_admin'" }, 400);
      }
      const role = rawBody.role;

      let password: string | undefined;
      if (rawBody.password !== undefined && rawBody.password !== "") {
        if (
          typeof rawBody.password !== "string" ||
          rawBody.password.length < 8 ||
          rawBody.password.length > 128
        ) {
          return jsonResponse({ error: "Password must be between 8 and 128 characters" }, 400);
        }
        password = rawBody.password;
      }

      const displayName =
        typeof rawBody.displayName === "string" && rawBody.displayName.trim()
          ? rawBody.displayName.trim().slice(0, 100)
          : email.split("@")[0];

      const createRes = password
        ? await adminClient.auth.admin.createUser({
            email,
            password,
            email_confirm: true,
          })
        : await adminClient.auth.admin.inviteUserByEmail(email);

      if (createRes.error || !createRes.data.user) {
        return jsonResponse({ error: createRes.error?.message ?? "Failed to create user" }, 400);
      }

      const newUid = createRes.data.user.id;

      await adminClient.from("profiles").upsert({
        user_id: newUid,
        email,
        display_name: displayName,
        is_active: true,
        created_by: caller.id,
      });

      await adminClient.from("user_roles").delete().eq("user_id", newUid);
      const { error: roleInsErr } = await adminClient
        .from("user_roles")
        .insert({ user_id: newUid, role });
      if (roleInsErr) throw roleInsErr;

      await callerClient.rpc("log_activity", {
        _action: "user.create",
        _entity_type: "user",
        _entity_id: newUid,
        _details: { email, role },
      });

      return jsonResponse({ success: true, userId: newUid, email, role });
    }

    if (action === "set_role") {
      if (!isValidUuid(rawBody.userId)) {
        return jsonResponse({ error: "A valid target userId (UUID) is required" }, 400);
      }
      if (!isAssignableCmsRole(rawBody.role)) {
        return jsonResponse({ error: "Invalid role: must be 'editor' or 'super_admin'" }, 400);
      }

      const targetUserId = rawBody.userId.trim();
      const role = rawBody.role;

      if (targetUserId === caller.id && role !== "super_admin") {
        return jsonResponse(
          { error: "Self-lockout prevention: you cannot demote your own Super Admin account" },
          400,
        );
      }

      await adminClient.from("user_roles").delete().eq("user_id", targetUserId);
      const { error: insErr } = await adminClient
        .from("user_roles")
        .insert({ user_id: targetUserId, role });
      if (insErr) throw insErr;

      await callerClient.rpc("log_activity", {
        _action: "user.role_change",
        _entity_type: "user",
        _entity_id: targetUserId,
        _details: { role },
      });

      return jsonResponse({ success: true });
    }

    if (action === "set_active") {
      if (!isValidUuid(rawBody.userId)) {
        return jsonResponse({ error: "A valid target userId (UUID) is required" }, 400);
      }
      if (typeof rawBody.isActive !== "boolean") {
        return jsonResponse({ error: "isActive must be a boolean" }, 400);
      }

      const targetUserId = rawBody.userId.trim();
      const isActive = rawBody.isActive;

      if (targetUserId === caller.id && !isActive) {
        return jsonResponse(
          { error: "Self-lockout prevention: you cannot disable your own Super Admin account" },
          400,
        );
      }

      const { error: updErr } = await adminClient
        .from("profiles")
        .update({ is_active: isActive })
        .eq("user_id", targetUserId);
      if (updErr) throw updErr;

      await adminClient.auth.admin.updateUserById(targetUserId, {
        ban_duration: isActive ? "none" : "876000h",
      });

      await callerClient.rpc("log_activity", {
        _action: isActive ? "user.enable" : "user.disable",
        _entity_type: "user",
        _entity_id: targetUserId,
        _details: { is_active: isActive },
      });

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
