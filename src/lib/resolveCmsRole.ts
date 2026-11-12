import { parseRole, type CmsRole } from "@/lib/permissions";

interface RpcError {
  code?: string;
  message: string;
}

/** Minimal client surface so the logic can be tested without Supabase. */
export interface RoleClient {
  rpc(fn: string, args?: Record<string, unknown>): PromiseLike<{ data: unknown; error: RpcError | null }>;
}

export interface ResolvedRole {
  role: CmsRole | null;
  /**
   * `rpc`    – answer came from current_cms_role() (proposed migration 002 applied).
   * `legacy` – function does not exist yet, so the existing has_role(uid,'admin') check was used.
   */
  source: "rpc" | "legacy";
}

/** PostgREST / Postgres signals that the RPC function is not deployed. */
export function isMissingFunctionError(error: RpcError): boolean {
  return (
    error.code === "PGRST202" ||
    error.code === "42883" ||
    /could not find the function|function .* does not exist/i.test(error.message)
  );
}

/**
 * Asks the database who the signed-in user is. The browser never decides the role.
 * Throws on unexpected errors (callers show an error state with retry) instead of
 * silently granting or denying access.
 */
export async function resolveCmsRole(client: RoleClient, userId: string): Promise<ResolvedRole> {
  const primary = await client.rpc("current_cms_role");
  if (!primary.error) {
    return { role: parseRole(primary.data), source: "rpc" };
  }
  if (!isMissingFunctionError(primary.error)) {
    throw new Error(primary.error.message);
  }

  // Migration 002 not applied: fall back to the role check that exists today.
  const legacy = await client.rpc("has_role", { _user_id: userId, _role: "admin" });
  if (legacy.error) throw new Error(legacy.error.message);
  return { role: legacy.data === true ? "legacy_admin" : null, source: "legacy" };
}
