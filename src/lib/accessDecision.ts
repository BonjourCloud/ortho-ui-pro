import type { Capability, CmsRole } from "@/lib/permissions";

export type AccessDecision = "loading" | "error" | "login" | "no-role" | "forbidden" | "allowed";

interface AccessInput {
  status: "loading" | "unauthenticated" | "authenticated" | "error";
  role: CmsRole | null;
  can: (capability: Capability) => boolean;
}

/**
 * Single place that decides what a route should show.
 * Order matters: never show protected UI while loading or on error.
 */
export function decideAccess(auth: AccessInput, capability?: Capability): AccessDecision {
  if (auth.status === "loading") return "loading";
  if (auth.status === "error") return "error";
  if (auth.status === "unauthenticated") return "login";
  if (!auth.role) return "no-role";
  if (capability && !auth.can(capability)) return "forbidden";
  return "allowed";
}
