/**
 * Reads what a Supabase Auth email link put in the URL when it redirected to /reset-password.
 *
 * - Password recovery:   #...&type=recovery
 * - CMS invitation:      ?onboarding=invite  (set by the admin-users function) and #...&type=invite
 * - Expired / used link: ?error=...&error_code=otp_expired  or the same in the hash
 *
 * Only flags are returned. Tokens are never read, stored or logged here (supabase-js consumes them).
 */
export interface AuthLinkParams {
  kind: "recovery" | "invite" | null;
  errorCode: string | null;
  errorDescription: string | null;
}

export function parseAuthLinkParams(search: string, hash: string): AuthLinkParams {
  const query = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search);
  const fragment = new URLSearchParams(hash.startsWith("#") ? hash.slice(1) : hash);
  const type = fragment.get("type") ?? query.get("type");

  let kind: AuthLinkParams["kind"] = null;
  if (type === "recovery") kind = "recovery";
  else if (type === "invite" || type === "signup" || query.get("onboarding") === "invite") kind = "invite";

  const errorCode = fragment.get("error_code") ?? query.get("error_code") ?? fragment.get("error") ?? query.get("error");
  const errorDescription = fragment.get("error_description") ?? query.get("error_description");
  return { kind, errorCode, errorDescription };
}

export function isExpiredLinkError(code: string | null): boolean {
  return code === "otp_expired" || code === "access_denied" || code === "flow_state_expired";
}
