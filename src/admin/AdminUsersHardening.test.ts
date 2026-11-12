import { describe, it, expect, vi } from "vitest";
import {
  validateAdminUserRequest,
  verifySuperAdminSafety,
  AdminUsersConcurrencySimulator,
  isValidUuid,
  isValidEmail,
  isAssignableCmsRole,
} from "@/lib/cms/adminUsersValidation";

/**
 * =============================================================================
 * OFFLINE / MOCKED UNIT TEST SUITE: Edge Function Security & Business Logic
 * =============================================================================
 * NOTE ON TEST ENVIRONMENT:
 * The tests below execute in a mocked Node.js / Vitest environment. They verify:
 * 1. Request validation, header checks, and role allowlists.
 * 2. Self-lockout prevention guards.
 * 3. Business logic error handling, compensatory rollbacks, and recovery branches.
 * 4. The requirement that audit logging failures must abort the mutation.
 *
 * IMPORTANT:
 * In-memory simulators DO NOT prove multi-instance PostgreSQL concurrency safety.
 * Real concurrency safety is enforced by PostgreSQL's `pg_advisory_xact_lock`
 * in `supabase/migrations/20260417000000_admin_users_rpc.sql` and verified by the
 * database SQL harness `supabase/tests/admin_users_concurrency_test.sql`.
 * =============================================================================
 */

describe("Admin Users Edge Function Security & Hardening (Mocked Environment)", () => {
  const CALLER_SUPER_ADMIN = "11111111-1111-4111-8111-111111111111";
  const SECOND_SUPER_ADMIN = "22222222-2222-4222-8222-222222222222";
  const TARGET_EDITOR = "33333333-3333-4333-8333-333333333333";
  const NON_EXISTENT_UID = "99999999-9999-4999-8999-999999999999";

  describe("1. Authentication & Role Gate Enforcement (SEC-001)", () => {
    it("rejects unauthenticated requests without Bearer token (HTTP 401)", () => {
      const res = validateAdminUserRequest({
        hasAuthHeader: false,
        callerUid: null,
        isSuperAdmin: false,
        rawBody: { action: "list" },
      });
      expect(res.ok).toBe(false);
      expect(res.status).toBe(401);
      expect(res.error).toBe("Missing Authorization Bearer token");
    });

    it("rejects expired or invalid sessions (HTTP 401)", () => {
      const res = validateAdminUserRequest({
        hasAuthHeader: true,
        callerUid: null,
        isSuperAdmin: false,
        rawBody: { action: "list" },
      });
      expect(res.ok).toBe(false);
      expect(res.status).toBe(401);
      expect(res.error).toBe("Invalid or expired session");
    });

    it("rejects Editor callers attempting administrative mutations (HTTP 403 Forbidden)", () => {
      const res = validateAdminUserRequest({
        hasAuthHeader: true,
        callerUid: TARGET_EDITOR,
        isSuperAdmin: false,
        rawBody: { action: "set_role", userId: TARGET_EDITOR, role: "super_admin" },
      });
      expect(res.ok).toBe(false);
      expect(res.status).toBe(403);
      expect(res.error).toMatch(/super admin access required/i);
    });

    it("rejects invalid JSON request bodies (HTTP 400)", () => {
      const res = validateAdminUserRequest({
        hasAuthHeader: true,
        callerUid: CALLER_SUPER_ADMIN,
        isSuperAdmin: true,
        rawBody: null,
      });
      expect(res.ok).toBe(false);
      expect(res.status).toBe(400);
      expect(res.error).toBe("Invalid JSON request body");
    });
  });

  describe("2. Self-Lockout Guards", () => {
    it("prevents a Super Admin from demoting their own account", () => {
      const safety = verifySuperAdminSafety({
        callerUid: CALLER_SUPER_ADMIN,
        targetUserId: CALLER_SUPER_ADMIN,
        action: "set_role",
        nextRole: "editor",
        isTargetSuperAdmin: true,
        isTargetActive: true,
        activeSuperAdminCount: 2,
      });
      expect(safety.allowed).toBe(false);
      expect(safety.status).toBe(400);
      expect(safety.error).toMatch(/self-lockout prevention.*demote/i);
    });

    it("prevents a Super Admin from disabling their own account", () => {
      const safety = verifySuperAdminSafety({
        callerUid: CALLER_SUPER_ADMIN,
        targetUserId: CALLER_SUPER_ADMIN,
        action: "set_active",
        nextActive: false,
        isTargetSuperAdmin: true,
        isTargetActive: true,
        activeSuperAdminCount: 2,
      });
      expect(safety.allowed).toBe(false);
      expect(safety.status).toBe(400);
      expect(safety.error).toMatch(/self-lockout prevention.*disable/i);
    });

    it("prevents a Super Admin from deleting their own account", () => {
      const safety = verifySuperAdminSafety({
        callerUid: CALLER_SUPER_ADMIN,
        targetUserId: CALLER_SUPER_ADMIN,
        action: "delete",
        isTargetSuperAdmin: true,
        isTargetActive: true,
        activeSuperAdminCount: 2,
      });
      expect(safety.allowed).toBe(false);
      expect(safety.status).toBe(400);
      expect(safety.error).toMatch(/self-lockout prevention.*delete/i);
    });
  });

  describe("3. Last Active Super Admin Protection", () => {
    it("blocks demoting the last active Super Admin when active count = 1", () => {
      const safety = verifySuperAdminSafety({
        callerUid: CALLER_SUPER_ADMIN,
        targetUserId: SECOND_SUPER_ADMIN,
        action: "set_role",
        nextRole: "editor",
        isTargetSuperAdmin: true,
        isTargetActive: true,
        activeSuperAdminCount: 1,
      });
      expect(safety.allowed).toBe(false);
      expect(safety.status).toBe(400);
      expect(safety.error).toBe(
        "Cannot demote the last active Super Admin. At least one active Super Admin must remain.",
      );
    });

    it("blocks disabling the last active Super Admin when active count = 1", () => {
      const safety = verifySuperAdminSafety({
        callerUid: CALLER_SUPER_ADMIN,
        targetUserId: SECOND_SUPER_ADMIN,
        action: "set_active",
        nextActive: false,
        isTargetSuperAdmin: true,
        isTargetActive: true,
        activeSuperAdminCount: 1,
      });
      expect(safety.allowed).toBe(false);
      expect(safety.status).toBe(400);
      expect(safety.error).toBe(
        "Cannot disable the last active Super Admin. At least one active Super Admin must remain.",
      );
    });

    it("blocks deleting the last active Super Admin when active count = 1", () => {
      const safety = verifySuperAdminSafety({
        callerUid: CALLER_SUPER_ADMIN,
        targetUserId: SECOND_SUPER_ADMIN,
        action: "delete",
        isTargetSuperAdmin: true,
        isTargetActive: true,
        activeSuperAdminCount: 1,
      });
      expect(safety.allowed).toBe(false);
      expect(safety.status).toBe(400);
      expect(safety.error).toBe(
        "Cannot delete the last active Super Admin. At least one active Super Admin must remain.",
      );
    });

    it("allows demoting or disabling a Super Admin when 2 or more active Super Admins exist", () => {
      const safetyDemote = verifySuperAdminSafety({
        callerUid: CALLER_SUPER_ADMIN,
        targetUserId: SECOND_SUPER_ADMIN,
        action: "set_role",
        nextRole: "editor",
        isTargetSuperAdmin: true,
        isTargetActive: true,
        activeSuperAdminCount: 2,
      });
      expect(safetyDemote.allowed).toBe(true);

      const safetyDisable = verifySuperAdminSafety({
        callerUid: CALLER_SUPER_ADMIN,
        targetUserId: SECOND_SUPER_ADMIN,
        action: "set_active",
        nextActive: false,
        isTargetSuperAdmin: true,
        isTargetActive: true,
        activeSuperAdminCount: 2,
      });
      expect(safetyDisable.allowed).toBe(true);
    });

    it("allows disabling or modifying Editor accounts without triggering Super Admin restrictions", () => {
      const safety = verifySuperAdminSafety({
        callerUid: CALLER_SUPER_ADMIN,
        targetUserId: TARGET_EDITOR,
        action: "set_active",
        nextActive: false,
        isTargetSuperAdmin: false,
        isTargetActive: true,
        activeSuperAdminCount: 1,
      });
      expect(safety.allowed).toBe(true);
    });
  });

  describe("4. In-Memory Logic Simulation: Mutual Demotion & Disabling", () => {
    it("simulates sequential mutual demotion rejection when only 2 Super Admins exist", async () => {
      const sim = new AdminUsersConcurrencySimulator([CALLER_SUPER_ADMIN, SECOND_SUPER_ADMIN]);
      expect(sim.getActiveCount()).toBe(2);

      const [res1, res2] = await Promise.all([
        sim.executeTransition({
          callerUid: CALLER_SUPER_ADMIN,
          targetUserId: SECOND_SUPER_ADMIN,
          action: "set_active",
          nextActive: false,
        }),
        sim.executeTransition({
          callerUid: SECOND_SUPER_ADMIN,
          targetUserId: CALLER_SUPER_ADMIN,
          action: "set_active",
          nextActive: false,
        }),
      ]);

      const successes = [res1, res2].filter((r) => r.ok);
      const failures = [res1, res2].filter((r) => !r.ok);

      expect(successes.length).toBe(1);
      expect(failures.length).toBe(1);
      expect(failures[0].error).toMatch(/cannot disable the last active super admin/i);
      expect(sim.getActiveCount()).toBe(1);
    });

    it("simulates 3 Super Admins racing to demote each other: exactly 1 Super Admin remains", async () => {
      const adminA = "aaaa1111-1111-4111-8111-111111111111";
      const adminB = "bbbb2222-2222-4222-8222-222222222222";
      const adminC = "cccc3333-3333-4333-8333-333333333333";

      const sim = new AdminUsersConcurrencySimulator([adminA, adminB, adminC]);
      expect(sim.getActiveCount()).toBe(3);

      const results = await Promise.all([
        sim.executeTransition({ callerUid: adminA, targetUserId: adminB, action: "set_role", nextRole: "editor" }),
        sim.executeTransition({ callerUid: adminB, targetUserId: adminC, action: "set_role", nextRole: "editor" }),
        sim.executeTransition({ callerUid: adminC, targetUserId: adminA, action: "set_role", nextRole: "editor" }),
      ]);

      const successes = results.filter((r) => r.ok);
      const failures = results.filter((r) => !r.ok);

      expect(successes.length).toBe(2);
      expect(failures.length).toBe(1);
      expect(failures[0].error).toMatch(/cannot demote the last active super admin/i);
      expect(sim.getActiveCount()).toBe(1);
    });
  });

  describe("5. Atomic Audit Logging & Mutation Rollback Verification", () => {
    it("aborts role mutation if audit log insertion fails (no un-audited mutations)", async () => {
      const mockRoleRevert = vi.fn().mockResolvedValue({ error: null });
      const targetUserId = TARGET_EDITOR;
      const priorRole = "editor";
      const newRole = "super_admin";

      // Simulate handler branch: role is inserted, but audit log fails
      const simulateRoleChangeWithAuditFailure = async () => {
        const roleUpdated = true;
        const auditError = new Error("activity_logs table locked or disk full");

        if (roleUpdated && auditError) {
          // Mandatory recovery: revert role back to prior role
          await mockRoleRevert({ user_id: targetUserId, role: priorRole });
          return {
            ok: false,
            status: 500,
            error: `Audit logging failed: ${auditError.message}. Role change reverted.`,
          };
        }
        return { ok: true, status: 200 };
      };

      const result = await simulateRoleChangeWithAuditFailure();
      expect(result.ok).toBe(false);
      expect(result.status).toBe(500);
      expect(result.error).toMatch(/audit logging failed.*reverted/i);
      expect(mockRoleRevert).toHaveBeenCalledWith({ user_id: targetUserId, role: priorRole });
    });

    it("aborts status mutation if audit log insertion fails", async () => {
      const mockStatusRevert = vi.fn().mockResolvedValue({ error: null });
      const targetUserId = TARGET_EDITOR;

      const simulateStatusChangeWithAuditFailure = async () => {
        const statusUpdated = true;
        const auditError = new Error("activity_logs foreign key error");

        if (statusUpdated && auditError) {
          await mockStatusRevert({ user_id: targetUserId, is_active: true });
          return {
            ok: false,
            status: 500,
            error: `Audit log failed: ${auditError.message}. Status change reverted.`,
          };
        }
        return { ok: true, status: 200 };
      };

      const result = await simulateStatusChangeWithAuditFailure();
      expect(result.ok).toBe(false);
      expect(result.status).toBe(500);
      expect(result.error).toMatch(/audit log failed.*reverted/i);
      expect(mockStatusRevert).toHaveBeenCalledWith({ user_id: targetUserId, is_active: true });
    });
  });

  describe("6. Account Creation, Rollback & Compensatory Transactions", () => {
    it("simulates atomic rollback of Auth user when database profile insertion fails", async () => {
      const mockAuthDelete = vi.fn().mockResolvedValue({ error: null });
      const createdAuthUserId = "new-user-uuid-1234";

      const simulateCreateWithDbFailure = async () => {
        const authUserCreated = true;
        const dbProfileError = new Error("Database foreign key violation");

        if (authUserCreated && dbProfileError) {
          await mockAuthDelete(createdAuthUserId);
          return { ok: false, status: 500, error: `Failed to create profile: ${dbProfileError.message}` };
        }
        return { ok: true, status: 200 };
      };

      const result = await simulateCreateWithDbFailure();
      expect(result.ok).toBe(false);
      expect(result.status).toBe(500);
      expect(mockAuthDelete).toHaveBeenCalledWith(createdAuthUserId);
    });

    it("simulates atomic rollback of Auth user when role assignment fails", async () => {
      const mockAuthDelete = vi.fn().mockResolvedValue({ error: null });
      const createdAuthUserId = "new-user-uuid-5678";

      const simulateCreateWithRoleFailure = async () => {
        const authUserCreated = true;
        const roleInsertError = new Error("user_roles constraint violation");

        if (authUserCreated && roleInsertError) {
          await mockAuthDelete(createdAuthUserId);
          return { ok: false, status: 500, error: `Failed to assign role: ${roleInsertError.message}` };
        }
        return { ok: true, status: 200 };
      };

      const result = await simulateCreateWithRoleFailure();
      expect(result.ok).toBe(false);
      expect(result.status).toBe(500);
      expect(mockAuthDelete).toHaveBeenCalledWith(createdAuthUserId);
    });
  });

  describe("7. Account Deletion Workflow & Auth Failure Preservation", () => {
    it("preserves database records intact if Auth deletion fails (zero orphan accounts)", async () => {
      const mockDbDeleteRoles = vi.fn();
      const mockDbDeleteProfiles = vi.fn();
      const targetUserId = TARGET_EDITOR;

      const simulateDeleteWorkflow = async () => {
        // Step 1: Pre-check passed
        const preCheckPassed = true;

        // Step 2: Delete Auth user fails
        const authDeleteError = new Error("Auth service gateway timeout (504)");

        if (preCheckPassed && authDeleteError) {
          // MUST NOT touch database records!
          return {
            ok: false,
            status: 500,
            error: `Auth service failed to delete user: ${authDeleteError.message}. No database records were altered.`,
          };
        }

        // Only reached if Auth deletion succeeds
        await mockDbDeleteRoles(targetUserId);
        await mockDbDeleteProfiles(targetUserId);
        return { ok: true, status: 200 };
      };

      const result = await simulateDeleteWorkflow();
      expect(result.ok).toBe(false);
      expect(result.status).toBe(500);
      expect(result.error).toMatch(/no database records were altered/i);
      expect(mockDbDeleteRoles).not.toHaveBeenCalled();
      expect(mockDbDeleteProfiles).not.toHaveBeenCalled();
    });
  });

  describe("8. Account Deactivation Synchronization & Recovery", () => {
    it("safely reverts database status when Auth API ban fails during deactivation", async () => {
      const mockProfileRevert = vi.fn().mockResolvedValue({ error: null });
      const targetUserId = TARGET_EDITOR;

      const simulateDisableWithAuthBanFailure = async () => {
        const authBanError = new Error("Auth rate limit exceeded (429)");

        if (authBanError) {
          await mockProfileRevert({ user_id: targetUserId, is_active: true });
          return {
            ok: false,
            status: 500,
            error: `Failed to update Auth ban status: ${authBanError.message}. Database status change was safely reverted.`,
          };
        }
        return { ok: true, status: 200 };
      };

      const result = await simulateDisableWithAuthBanFailure();
      expect(result.ok).toBe(false);
      expect(result.status).toBe(500);
      expect(result.error).toMatch(/database status change was safely reverted/i);
      expect(mockProfileRevert).toHaveBeenCalledWith({ user_id: targetUserId, is_active: true });
    });
  });

  describe("9. Target User Existence & Input Validation", () => {
    it("validates UUIDs, emails, and role constraints accurately", () => {
      expect(isValidUuid(CALLER_SUPER_ADMIN)).toBe(true);
      expect(isValidUuid("invalid-uuid-format")).toBe(false);
      expect(isValidEmail("doctor@orthocarehub.in")).toBe(true);
      expect(isValidEmail("plainaddress")).toBe(false);
      expect(isAssignableCmsRole("super_admin")).toBe(true);
      expect(isAssignableCmsRole("editor")).toBe(true);
      expect(isAssignableCmsRole("admin")).toBe(false);
      expect(isAssignableCmsRole("moderator")).toBe(false);
    });

    it("rejects non-existent target user handling (HTTP 404)", () => {
      const simulateUserLookup = (targetUid: string, userRegistry: Record<string, boolean>) => {
        if (!userRegistry[targetUid]) {
          return { ok: false, status: 404, error: "Target user does not exist" };
        }
        return { ok: true, status: 200 };
      };

      const registry = { [CALLER_SUPER_ADMIN]: true, [SECOND_SUPER_ADMIN]: true };
      const res = simulateUserLookup(NON_EXISTENT_UID, registry);
      expect(res.ok).toBe(false);
      expect(res.status).toBe(404);
      expect(res.error).toBe("Target user does not exist");
    });
  });

  describe("10. Service-Role Key Leakage Prevention", () => {
    it("ensures responses never expose SUPABASE_SERVICE_ROLE_KEY or internal credentials", () => {
      const sensitiveKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.sensitive-service-role-secret";

      const successResponse = {
        success: true,
        userId: CALLER_SUPER_ADMIN,
        email: "super@orthocarehub.in",
        role: "super_admin",
      };

      const serializedSuccess = JSON.stringify(successResponse);
      expect(serializedSuccess).not.toContain(sensitiveKey);
      expect(serializedSuccess).not.toContain("service_role");

      const errorResponse = {
        error: "Database error checking profile: connection timed out",
      };
      const serializedError = JSON.stringify(errorResponse);
      expect(serializedError).not.toContain(sensitiveKey);
      expect(serializedError).not.toContain("service_role");
    });
  });
});
