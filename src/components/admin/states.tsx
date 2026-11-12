import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { AlertTriangle, Construction, Loader2, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";

export function AdminLoading({ label = "Loading…" }: { label?: string }) {
  return (
    <div role="status" aria-live="polite" className="flex min-h-[40vh] flex-col items-center justify-center gap-3 text-muted-foreground">
      <Loader2 className="h-7 w-7 animate-spin text-primary" aria-hidden="true" />
      <span className="text-sm">{label}</span>
    </div>
  );
}

export function AdminError({ message, onRetry, title = "Something went wrong" }: { message?: string | null; onRetry?: () => void; title?: string }) {
  return (
    <div role="alert" className="mx-auto flex min-h-[40vh] max-w-md flex-col items-center justify-center gap-3 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
        <AlertTriangle className="h-6 w-6 text-destructive" aria-hidden="true" />
      </div>
      <h2 className="font-display text-xl font-semibold text-foreground">{title}</h2>
      {message && <p className="text-sm text-muted-foreground">{message}</p>}
      {onRetry && (
        <Button variant="outline" onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  );
}

export function AccessDenied({ variant, onSignOut }: { variant: "no-role" | "forbidden"; onSignOut?: () => void }) {
  const noRole = variant === "no-role";
  return (
    <div role="alert" className="mx-auto flex min-h-[50vh] max-w-md flex-col items-center justify-center gap-3 px-4 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
        <ShieldAlert className="h-6 w-6 text-destructive" aria-hidden="true" />
      </div>
      <h2 className="font-display text-xl font-semibold text-foreground">{noRole ? "No CMS access" : "You don't have access to this page"}</h2>
      <p className="text-sm text-muted-foreground">
        {noRole
          ? "Your account is signed in but has not been given a CMS role, or it has been disabled. Please contact the site administrator."
          : "Your role does not include this area. If you think this is a mistake, please contact a Super Admin."}
      </p>
      <div className="flex gap-2">
        {!noRole && (
          <Button asChild variant="outline">
            <Link to="/admin">Back to dashboard</Link>
          </Button>
        )}
        {noRole && onSignOut && <Button onClick={onSignOut}>Sign out</Button>}
      </div>
    </div>
  );
}

export function PageHeader({ title, description, actions }: { title: string; description?: string; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <h1 className="font-display text-2xl font-bold text-foreground md:text-3xl">{title}</h1>
        {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
      </div>
      {actions}
    </div>
  );
}

/** Honest placeholder for modules that are planned but not built yet. */
export function ComingSoon({ title, description, availableIn, dependsOn }: { title: string; description: string; availableIn: string; dependsOn?: string }) {
  return (
    <div>
      <PageHeader title={title} description={description} />
      <div className="rounded-xl border border-dashed bg-card p-8 text-center">
        <Construction className="mx-auto mb-3 h-8 w-8 text-accent" aria-hidden="true" />
        <p className="font-medium text-foreground">Not available yet</p>
        <p className="mt-1 text-sm text-muted-foreground">This module is planned for {availableIn}.</p>
        {dependsOn && <p className="mt-2 text-xs text-muted-foreground">Waiting for: {dependsOn}</p>}
      </div>
    </div>
  );
}
