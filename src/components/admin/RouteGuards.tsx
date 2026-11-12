import { Navigate, Outlet, useLocation } from "react-router-dom";
import type { ReactNode } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { decideAccess } from "@/lib/accessDecision";
import type { Capability } from "@/lib/permissions";
import { AccessDenied, AdminError, AdminLoading } from "@/components/admin/states";

/** Layout-route guard: only signed-in users with a CMS role get through. */
export function RequireAuth() {
  const auth = useAuth();
  const location = useLocation();
  const decision = decideAccess(auth);

  switch (decision) {
    case "loading":
      return <AdminLoading label="Checking your session…" />;
    case "error":
      return (
        <AdminError
          title="We couldn't verify your account"
          message={auth.error}
          onRetry={auth.retry}
          onSignOut={() => void auth.signOut()}
        />
      );
    case "login":
      return <Navigate to="/admin/login" replace state={{ from: location.pathname, expired: auth.sessionExpired }} />;
    case "no-role":
      return <AccessDenied variant="no-role" onSignOut={() => void auth.signOut()} />;
    default:
      return <Outlet />;
  }
}

/** Element guard: renders children only if the role includes the capability. */
export function RequireCapability({ capability, children }: { capability: Capability; children: ReactNode }) {
  const auth = useAuth();
  const decision = decideAccess(auth, capability);
  if (decision === "forbidden") return <AccessDenied variant="forbidden" />;
  if (decision !== "allowed") return <AdminLoading />;
  return <>{children}</>;
}
