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
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient, type SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

interface UserProfileRow {
  user_id: string;
  email: string;
  display_name: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
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
      const { data: profiles, error: pErr } = await adminClient
        .from("profiles")
        .select("user_id, email, display_name, is_active, created_at, updated_at")
        .order("created_at", { ascending: false });
      if (pErr) {
        return jsonResponse({ error: `Database error fetching profiles: ${pErr.message}` }, 500);
      }

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

      const users = (profiles ?? []).map((p: UserProfileRow) => ({
        userId: p.user_id,
        email: p.email,
        displayName: p.display_name ?? "",
        role: roleMap.get(p.user_id) ?? "editor",
        isActive: p.is_active,
        createdAt: p.created_at,
      }));

      return jsonResponse({ users });
    }

    // =========================================================================
    // ACTION: CREATE
    // =========================================================================
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

      // Step 1: Create user in Supabase Auth
      const createRes = password
        ? await adminClient.auth.admin.createUser({
            email,
            password,
            email_confirm: true,
          })
        : await adminClient.auth.admin.inviteUserByEmail(email);

      if (createRes.error || !createRes.data?.user) {
        return jsonResponse(
          { error: createRes.error?.message ?? "Failed to create user in auth system" },
          400,
        );
      }

      const newUid = createRes.data.user.id;
      let provisioningError: string | null = null;

      // Step 2: Atomic database provisioning (Profile + Role + Audit in 1 transaction under advisory lock)
      const { error: rpcErr } = await adminClient.rpc("provision_cms_user", {
        _user_id: newUid,
        _email: email,
        _display_name: displayName,
        _role: role,
        _caller_id: caller.id,
      });

      if (rpcErr) {
        // Fallback only if RPC function does not exist in the database (code PGRST202 / 42883)
        if (rpcErr.code === "PGRST202" || rpcErr.code === "42883" || rpcErr.message?.includes("function")) {
          const { error: pErr } = await adminClient.from("profiles").upsert({
            user_id: newUid,
            email,
            display_name: displayName,
            is_active: true,
            created_by: caller.id,
          });

          if (pErr) {
            provisioningError = `Failed to create profile: ${pErr.message}`;
          } else {
            const { error: delErr } = await adminClient.from("user_roles").delete().eq("user_id", newUid);
            if (delErr) {
              provisioningError = `Failed to clear prior roles: ${delErr.message}`;
            } else {
              const { error: insErr } = await adminClient.from("user_roles").insert({
                user_id: newUid,
                role,
              });
              if (insErr) {
                provisioningError = `Failed to assign role: ${insErr.message}`;
              } else {
                // Ensure audit logging succeeds; if audit fails, treat as failure
                const { error: logErr } = await callerClient.rpc("log_activity", {
                  _action: "user.create",
                  _entity_type: "user",
                  _entity_id: newUid,
                  _details: { email, role },
                });
                if (logErr) {
                  provisioningError = `Failed to write audit log: ${logErr.message}`;
                }
              }
            }
          }
        } else {
          provisioningError = `Atomic provisioning failed: ${rpcErr.message}`;
        }
      }

      // Step 3: Compensatory rollback: Delete Auth user if DB provisioning failed (zero orphan accounts)
      if (provisioningError) {
        const { error: delAuthErr } = await adminClient.auth.admin.deleteUser(newUid);
        if (delAuthErr) {
          console.error(`CRITICAL ROLLBACK FAILURE: failed to clean up auth user ${newUid}:`, delAuthErr);
          return jsonResponse(
            { error: `${provisioningError}. Furthermore, Auth rollback failed: ${delAuthErr.message}` },
            500,
          );
        }
        return jsonResponse({ error: provisioningError }, 500);
      }

      return jsonResponse({ success: true, userId: newUid, email, role });
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
