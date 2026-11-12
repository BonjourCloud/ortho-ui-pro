/**
 * Pure validation and security rules for the `admin-users` Edge Function.
 * Extracted into a shared module so both the Deno Edge Function and Vitest
 * unit tests verify the exact same security boundaries.
 */

export type AssignableCmsRole = "super_admin" | "editor";

export type AdminUserActionPayload =
  | { action: "list" }
  | {
      action: "create";
      email: string;
      password?: string;
      displayName?: string;
      role: AssignableCmsRole;
    }
  | {
      action: "set_role";
      userId: string;
      role: AssignableCmsRole;
    }
  | {
      action: "set_active";
      userId: string;
      isActive: boolean;
    };

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidUuid(value: unknown): value is string {
  return typeof value === "string" && UUID_REGEX.test(value.trim());
}

export function isValidEmail(value: unknown): value is string {
  return typeof value === "string" && value.length <= 254 && EMAIL_REGEX.test(value.trim());
}

export function isAssignableCmsRole(value: unknown): value is AssignableCmsRole {
  return value === "super_admin" || value === "editor";
}

export interface ValidationOutcome {
  ok: boolean;
  status: number;
  error?: string;
  sanitized?: AdminUserActionPayload;
}

/**
 * Validates and sanitizes the incoming request payload and caller authorization context.
 * Enforces:
 * 1. Valid Bearer JWT presence (`callerUid` must be non-empty)
 * 2. Active Super Admin authorization (`isSuperAdmin === true`)
 * 3. Strict input validation on `action`, `email`, `password`, `displayName`, `userId`, and `role`
 * 4. Self-lockout & privilege-escalation prevention (cannot demote or disable own Super Admin account)
 */
export function validateAdminUserRequest(params: {
  hasAuthHeader: boolean;
  callerUid: string | null;
  isSuperAdmin: boolean;
  rawBody: unknown;
}): ValidationOutcome {
  const { hasAuthHeader, callerUid, isSuperAdmin, rawBody } = params;

  if (!hasAuthHeader) {
    return { ok: false, status: 401, error: "Missing Authorization Bearer token" };
  }
  if (!callerUid) {
    return { ok: false, status: 401, error: "Invalid or expired session" };
  }
  if (!isSuperAdmin) {
    return { ok: false, status: 403, error: "Forbidden: Super Admin access required" };
  }
  if (!rawBody || typeof rawBody !== "object") {
    return { ok: false, status: 400, error: "Invalid JSON request body" };
  }

  const body = rawBody as Record<string, unknown>;
  const action = body.action;

  if (action === "list") {
    return { ok: true, status: 200, sanitized: { action: "list" } };
  }

  if (action === "create") {
    const rawEmail = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    if (!isValidEmail(rawEmail)) {
      return { ok: false, status: 400, error: "A valid email address is required" };
    }
    if (!isAssignableCmsRole(body.role)) {
      return {
        ok: false,
        status: 400,
        error: "Invalid role: must be explicitly 'editor' or 'super_admin'",
      };
    }
    if (body.password !== undefined && body.password !== "") {
      if (typeof body.password !== "string" || body.password.length < 8 || body.password.length > 128) {
        return {
          ok: false,
          status: 400,
          error: "Password must be between 8 and 128 characters",
        };
      }
    }
    const rawDisplay = typeof body.displayName === "string" ? body.displayName.trim().slice(0, 100) : "";

    return {
      ok: true,
      status: 200,
      sanitized: {
        action: "create",
        email: rawEmail,
        password: typeof body.password === "string" && body.password.length > 0 ? body.password : undefined,
        displayName: rawDisplay || rawEmail.split("@")[0],
        role: body.role,
      },
    };
  }

  if (action === "set_role") {
    if (!isValidUuid(body.userId)) {
      return { ok: false, status: 400, error: "A valid target userId (UUID) is required" };
    }
    if (!isAssignableCmsRole(body.role)) {
      return {
        ok: false,
        status: 400,
        error: "Invalid role: must be explicitly 'editor' or 'super_admin'",
      };
    }
    if (body.userId.trim() === callerUid && body.role !== "super_admin") {
      return {
        ok: false,
        status: 400,
        error: "Self-lockout prevention: you cannot demote your own Super Admin account",
      };
    }
    return {
      ok: true,
      status: 200,
      sanitized: {
        action: "set_role",
        userId: body.userId.trim(),
        role: body.role,
      },
    };
  }

  if (action === "set_active") {
    if (!isValidUuid(body.userId)) {
      return { ok: false, status: 400, error: "A valid target userId (UUID) is required" };
    }
    if (typeof body.isActive !== "boolean") {
      return { ok: false, status: 400, error: "isActive must be a boolean" };
    }
    if (body.userId.trim() === callerUid && !body.isActive) {
      return {
        ok: false,
        status: 400,
        error: "Self-lockout prevention: you cannot disable your own Super Admin account",
      };
    }
    return {
      ok: true,
      status: 200,
      sanitized: {
        action: "set_active",
        userId: body.userId.trim(),
        isActive: body.isActive,
      },
    };
  }

  return { ok: false, status: 400, error: "Unsupported action" };
}
