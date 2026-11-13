import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { UserPlus, Shield, RefreshCw, ShieldAlert, CheckCircle2, Ban, Mail, Zap, History } from "lucide-react";
import { PageHeader, AccessDenied } from "@/components/admin/states";
import { Switch } from "@/components/ui/switch";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useAuth } from "@/contexts/AuthContext";
import { invokeAdminUsers, type CmsInviteStatus, type CmsManagedUser } from "@/lib/cms/repository";
import { DIRECT_PUBLISH_TARGETS, DIRECT_PUBLISH_TARGET_LABELS } from "@/lib/cms/directPublish";

const inputClass =
  "w-full rounded-lg border bg-background px-3.5 py-2 text-xs text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20";

const INVITE_BADGE: Record<CmsInviteStatus, { label: string; className: string } | null> = {
  pending: { label: "Pending", className: "bg-blue-500/15 text-blue-700 dark:text-blue-300" },
  accepted: { label: "Accepted", className: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300" },
  expired: { label: "Expired", className: "bg-amber-500/15 text-amber-700 dark:text-amber-300" },
  failed: { label: "Failed", className: "bg-destructive/15 text-destructive" },
  not_invited: null,
};

const ROLE_OPTION_LABELS = {
  editor: "Admin (content editor: drafts & submit for review)",
  super_admin: "Super Admin (full control, approves & publishes)",
} as const;

const DIRECT_PUBLISH_SCOPE_TEXT = DIRECT_PUBLISH_TARGETS.map((t) => DIRECT_PUBLISH_TARGET_LABELS[t]).join(", ");

function formatDate(value: string | null | undefined): string | null {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d.toLocaleString();
}

interface ListResponse {
  users: CmsManagedUser[];
  features?: { directPublishing?: boolean; invitations?: boolean };
}

interface CreateResponse {
  success?: boolean;
  emailSent?: boolean;
  warning?: string;
}

/**
 * Super Admin User Management UI (`/admin/users`).
 *
 * SECURITY GUARANTEES:
 * 1. Guarded by `can("users.manage")` (Super Admin only). Editors and legacy admins are blocked.
 * 2. Never performs client-side writes to `public.user_roles` or `public.profiles`.
 * 3. All operations go through the server-side `admin-users` Edge Function (`invokeAdminUsers`),
 *    which verifies the caller's JWT via `public.is_super_admin()` before using the server-only service role key.
 * 4. Onboarding is invitation-only: no administrator ever chooses or sees another user's password.
 * 5. "Allow Direct Publishing" is stored in `profiles.direct_publish_enabled` and changed only by the
 *    service-role RPC `admin_set_direct_publish()`; the publish functions re-check it at publish time.
 */
export default function AdminUsers() {
  const { user: currentUser, can } = useAuth();
  const canManageUsers = can("users.manage");

  const [users, setUsers] = useState<CmsManagedUser[]>([]);
  const [features, setFeatures] = useState<{ directPublishing: boolean; invitations: boolean }>({
    directPublishing: false,
    invitations: false,
  });
  const [edgeReady, setEdgeReady] = useState(true);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);

  const [newEmail, setNewEmail] = useState("");
  const [newDisplayName, setNewDisplayName] = useState("");
  const [newRole, setNewRole] = useState<"editor" | "super_admin">("editor");

  const [pendingToggle, setPendingToggle] = useState<{ user: CmsManagedUser; enable: boolean } | null>(null);

  const loadUsers = async () => {
    setLoading(true);
    const res = await invokeAdminUsers<ListResponse>({ action: "list" });
    setEdgeReady(res.edgeFunctionReady);
    if (!res.ok) {
      setError(res.error ?? "Unable to load users.");
      setUsers([]);
    } else {
      setUsers(res.data?.users ?? []);
      setFeatures({
        directPublishing: res.data?.features?.directPublishing === true,
        invitations: res.data?.features?.invitations === true,
      });
    }
    setLoading(false);
  };

  useEffect(() => {
    if (!canManageUsers) return;
    void loadUsers();
  }, [canManageUsers]);

  if (!canManageUsers) {
    return <AccessDenied variant="forbidden" />;
  }

  const resetMessages = () => {
    setError(null);
    setNotice(null);
    setWarning(null);
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    resetMessages();

    const emailToInvite = newEmail.trim().toLowerCase();
    const existing = users.find((u) => u.email.toLowerCase() === emailToInvite);
    if (existing) {
      setError(
        existing.inviteStatus === "pending" || existing.inviteStatus === "expired" || existing.inviteStatus === "failed"
          ? `${emailToInvite} has already been invited. Use “Resend invitation” in the list below.`
          : `An account with email "${emailToInvite}" already exists.`,
      );
      return;
    }

    setBusy(true);
    const res = await invokeAdminUsers<CreateResponse>({
      action: "create",
      email: emailToInvite,
      displayName: newDisplayName.trim(),
      role: newRole,
    });
    setBusy(false);
    setEdgeReady(res.edgeFunctionReady);

    if (!res.ok) {
      setError(res.error ?? "Failed to invite the user.");
      return;
    }

    const roleLabel = newRole === "super_admin" ? "Super Admin" : "Admin";
    if (res.data?.emailSent === false) {
      setWarning(res.data.warning ?? `The ${roleLabel} account for ${emailToInvite} was created, but the invitation email could not be sent.`);
    } else {
      setNotice(
        `Invitation sent to ${emailToInvite} (${roleLabel}). They appear as Pending until they set their password.`,
      );
      if (res.data?.warning) setWarning(res.data.warning);
    }
    setNewEmail("");
    setNewDisplayName("");
    setNewRole("editor");
    await loadUsers();
  };

  const handleResend = async (target: CmsManagedUser) => {
    resetMessages();
    setBusy(true);
    const res = await invokeAdminUsers<CreateResponse>({ action: "resend_invite", userId: target.userId });
    setBusy(false);
    if (!res.ok) {
      setError(res.error ?? "Failed to resend the invitation.");
    } else {
      setNotice(`A new invitation was sent to ${target.email}. Earlier links no longer work.`);
      if (res.data?.warning) setWarning(res.data.warning);
    }
    await loadUsers();
  };

  const handleRoleChange = async (target: CmsManagedUser, nextRole: "editor" | "super_admin") => {
    resetMessages();
    if (target.userId === currentUser?.id && nextRole !== "super_admin") {
      setError("You cannot demote your own Super Admin account.");
      return;
    }

    setBusy(true);
    const res = await invokeAdminUsers({
      action: "set_role",
      userId: target.userId,
      role: nextRole,
    });
    setBusy(false);

    if (!res.ok) {
      setError(res.error ?? "Failed to change role.");
      return;
    }

    setNotice(
      `Updated role for ${target.email} to ${nextRole === "super_admin" ? "Super Admin" : "Admin"}.` +
        (target.directPublishEnabled ? " Direct publishing was switched off by the role change." : ""),
    );
    await loadUsers();
  };

  const handleToggleActive = async (target: CmsManagedUser) => {
    resetMessages();
    if (target.userId === currentUser?.id && target.isActive) {
      setError("You cannot disable your own Super Admin account.");
      return;
    }

    setBusy(true);
    const res = await invokeAdminUsers({
      action: "set_active",
      userId: target.userId,
      isActive: !target.isActive,
    });
    setBusy(false);

    if (!res.ok) {
      setError(res.error ?? "Failed to update account status.");
      return;
    }

    setNotice(`${target.isActive ? "Disabled" : "Re-enabled"} account for ${target.email}.`);
    await loadUsers();
  };

  const confirmDirectPublishChange = async () => {
    if (!pendingToggle) return;
    const { user: target, enable } = pendingToggle;
    setPendingToggle(null);
    resetMessages();
    setBusy(true);
    const res = await invokeAdminUsers({ action: "set_direct_publish", userId: target.userId, enabled: enable });
    setBusy(false);
    if (!res.ok) {
      setError(res.error ?? "Failed to change the publishing permission.");
      return;
    }
    setNotice(
      enable
        ? `${target.displayName || target.email} can now publish their own permitted content directly.`
        : `${target.displayName || target.email} now needs Super Admin review before publishing.`,
    );
    await loadUsers();
  };

  const toggleTargetName = pendingToggle ? pendingToggle.user.displayName || pendingToggle.user.email : "";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <PageHeader
          title="Users & role management"
          description="Invite Admin (content editor) or Super Admin accounts by email, change roles, control direct publishing, and disable or re-enable access through the secure server-side Edge Function."
        />
        <button
          type="button"
          onClick={() => {
            resetMessages();
            void loadUsers();
          }}
          disabled={loading || busy}
          className="inline-flex items-center gap-1.5 rounded-lg border bg-card px-3.5 py-2 text-xs font-semibold text-foreground hover:bg-secondary disabled:opacity-50"
        >
          <RefreshCw size={13} className={loading ? "animate-spin" : ""} aria-hidden="true" />
          Refresh users
        </button>
      </div>

      {!edgeReady && (
        <div
          role="status"
          className="flex items-start gap-2.5 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-xs text-amber-800 dark:text-amber-300"
        >
          <ShieldAlert size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
          <div>
            <p className="font-semibold">Awaiting Staging Deployment (`admin-users` Edge Function & Migration 002)</p>
            <p className="mt-0.5">
              For security, role assignment is strictly forbidden from browser code (`REVOKE INSERT, UPDATE, DELETE ON public.user_roles`). All account provisioning and role changes execute exclusively through <code className="font-mono">supabase/functions/admin-users/index.ts</code> once deployed to staging.
            </p>
          </div>
        </div>
      )}

      {edgeReady && !loading && users.length > 0 && !features.directPublishing && (
        <div
          role="status"
          className="flex items-start gap-2.5 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-xs text-amber-800 dark:text-amber-300"
        >
          <ShieldAlert size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
          <p>
            Invitation status and “Allow Direct Publishing” need CMS migration 007 and the updated <code className="font-mono">admin-users</code> function.
            Until then every account keeps the review-required workflow.
          </p>
        </div>
      )}

      {error && (
        <div role="alert" className="rounded-xl bg-destructive/10 p-3.5 text-xs font-medium text-destructive">
          {error}
        </div>
      )}

      {warning && (
        <div role="alert" className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3.5 text-xs font-medium text-amber-800 dark:text-amber-300">
          {warning}
        </div>
      )}

      {notice && (
        <div role="status" className="rounded-xl bg-primary/10 p-3.5 text-xs font-medium text-primary">
          {notice}
        </div>
      )}

      {/* Invite New CMS User */}
      <section className="rounded-xl border bg-card p-5 shadow-sm">
        <div className="mb-1 flex items-center gap-2">
          <UserPlus size={18} className="text-primary" aria-hidden="true" />
          <h2 className="font-display text-base font-bold text-foreground">Invite a CMS user</h2>
        </div>
        <p className="mb-4 text-xs text-muted-foreground">
          We email a secure, time-limited link so the person sets their own password. Nobody else ever sees it.
          New accounts always start with Super Admin review required.
        </p>

        <form onSubmit={handleInvite} className="grid gap-4 sm:grid-cols-3">
          <div>
            <label htmlFor="new-user-email" className="mb-1 block text-xs font-medium text-foreground">
              Email Address *
            </label>
            <input
              id="new-user-email"
              type="email"
              required
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              placeholder="doctor@orthocarehub.in"
              className={inputClass}
            />
          </div>

          <div>
            <label htmlFor="new-user-name" className="mb-1 block text-xs font-medium text-foreground">
              Display Name
            </label>
            <input
              id="new-user-name"
              type="text"
              value={newDisplayName}
              onChange={(e) => setNewDisplayName(e.target.value)}
              placeholder="Dr. Srivanth / Clinic Staff"
              className={inputClass}
            />
          </div>

          <div>
            <label htmlFor="new-user-role" className="mb-1 block text-xs font-medium text-foreground">
              Assigned Role
            </label>
            <select
              id="new-user-role"
              value={newRole}
              onChange={(e) => setNewRole(e.target.value as "editor" | "super_admin")}
              className={inputClass}
            >
              <option value="editor">{ROLE_OPTION_LABELS.editor}</option>
              <option value="super_admin">{ROLE_OPTION_LABELS.super_admin}</option>
            </select>
          </div>

          {newRole === "super_admin" && (
            <p className="sm:col-span-3 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-800 dark:text-amber-300">
              Super Admins can approve and publish everything, manage users and read patient inboxes. Invite only people who need full control.
            </p>
          )}

          <div className="sm:col-span-3 flex justify-end">
            <button
              type="submit"
              disabled={busy}
              className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50"
            >
              <Mail size={14} aria-hidden="true" />
              Send invitation
            </button>
          </div>
        </form>
      </section>

      {/* Direct publishing explainer */}
      <section aria-label="About direct publishing" className="rounded-xl border bg-card p-4 text-xs shadow-sm">
        <div className="flex items-start gap-2.5">
          <Zap size={16} className="mt-0.5 shrink-0 text-primary" aria-hidden="true" />
          <div className="space-y-1">
            <p className="font-semibold text-foreground">Allow Direct Publishing</p>
            <p className="text-muted-foreground">
              When enabled, this doctor can publish their own permitted content without waiting for Super Admin approval.
              Applies to: {DIRECT_PUBLISH_SCOPE_TEXT}. Clinic information, Branding, Pages, SEO and Treatment pages, removals,
              and drafts that include someone else's changes still need review. It never grants user management, settings,
              the activity log or patient records.
            </p>
            <Link to="/admin/activity" className="inline-flex items-center gap-1 font-medium text-primary hover:underline">
              <History size={12} aria-hidden="true" /> View change history (User Management)
            </Link>
          </div>
        </div>
      </section>

      {/* Existing CMS Users Table */}
      <div className="overflow-x-auto rounded-xl border bg-card shadow-sm">
        <table className="w-full text-left text-xs">
          <thead className="border-b bg-secondary/40 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="px-4 py-3">User</th>
              <th className="px-4 py-3">Role</th>
              <th className="px-4 py-3">Invitation</th>
              <th className="px-4 py-3">Publishing</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {users.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                  <Shield size={20} className="mx-auto mb-2 opacity-50" aria-hidden="true" />
                  {edgeReady
                    ? "No CMS user profiles found."
                    : "Waiting for 'admin-users' Edge Function & Migration 002 deployment to list live CMS accounts."}
                </td>
              </tr>
            ) : (
              users.map((u) => {
                const isSelf = u.userId === currentUser?.id;
                const invite = u.inviteStatus ? INVITE_BADGE[u.inviteStatus] : null;
                const canResend =
                  features.invitations &&
                  u.isActive &&
                  (u.inviteStatus === "pending" || u.inviteStatus === "expired" || u.inviteStatus === "failed");
                const directOn = u.directPublishEnabled === true;
                const changedAt = formatDate(u.directPublishUpdatedAt);
                return (
                  <tr key={u.userId} className="align-top hover:bg-secondary/20">
                    <td className="px-4 py-3">
                      <div className="font-semibold text-foreground">
                        {u.displayName || u.email}
                        {isSelf && (
                          <span className="ml-2 rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-semibold text-primary">
                            You
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-muted-foreground">{u.email}</div>
                    </td>

                    <td className="px-4 py-3">
                      <select
                        aria-label={`Role for ${u.email}`}
                        disabled={busy || isSelf}
                        value={u.role}
                        onChange={(e) =>
                          void handleRoleChange(u, e.target.value as "editor" | "super_admin")
                        }
                        className="rounded-lg border bg-background px-2.5 py-1 text-xs text-foreground disabled:opacity-50"
                      >
                        <option value="editor">Admin</option>
                        <option value="super_admin">Super Admin</option>
                      </select>
                    </td>

                    <td className="px-4 py-3">
                      {invite ? (
                        <span
                          data-testid={`invite-status-${u.userId}`}
                          className={`inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${invite.className}`}
                        >
                          {invite.label}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                      {u.inviteStatus !== "accepted" && formatDate(u.inviteLastSentAt) && (
                        <div className="mt-1 text-[11px] text-muted-foreground">Sent {formatDate(u.inviteLastSentAt)}</div>
                      )}
                    </td>

                    <td className="px-4 py-3">
                      {u.role === "super_admin" ? (
                        <span className="text-[11px] text-muted-foreground">Approves &amp; publishes (Super Admin)</span>
                      ) : (
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <Switch
                              checked={directOn}
                              disabled={busy || !features.directPublishing || !u.isActive}
                              onCheckedChange={(next) => setPendingToggle({ user: u, enable: next })}
                              aria-label={`Allow direct publishing for ${u.email}`}
                            />
                            <span
                              data-testid={`publishing-mode-${u.userId}`}
                              className={`text-[11px] font-semibold ${directOn ? "text-emerald-700 dark:text-emerald-300" : "text-muted-foreground"}`}
                            >
                              {directOn ? "Publishes directly" : "Review required"}
                            </span>
                          </div>
                          {changedAt && (
                            <div className="text-[11px] text-muted-foreground">
                              Changed {changedAt}
                              {u.directPublishUpdatedByEmail ? ` by ${u.directPublishUpdatedByEmail}` : ""}
                            </div>
                          )}
                        </div>
                      )}
                    </td>

                    <td className="px-4 py-3">
                      {u.isActive ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700 dark:text-emerald-300">
                          <CheckCircle2 size={11} /> Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-destructive/15 px-2.5 py-0.5 text-[11px] font-semibold text-destructive">
                          <Ban size={11} /> Disabled
                        </span>
                      )}
                    </td>

                    <td className="px-4 py-3 text-right">
                      <div className="flex flex-wrap justify-end gap-2">
                        {canResend && (
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => void handleResend(u)}
                            className="inline-flex items-center gap-1 rounded-lg border px-3 py-1 text-xs font-medium text-foreground hover:bg-secondary disabled:opacity-40"
                          >
                            <Mail size={12} aria-hidden="true" /> Resend invitation
                          </button>
                        )}
                        <button
                          type="button"
                          disabled={busy || isSelf}
                          onClick={() => void handleToggleActive(u)}
                          className="rounded-lg border px-3 py-1 text-xs font-medium text-foreground hover:bg-secondary disabled:opacity-40"
                        >
                          {u.isActive ? "Disable account" : "Re-enable account"}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <AlertDialog open={pendingToggle !== null} onOpenChange={(open) => !open && setPendingToggle(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {pendingToggle?.enable
                ? `Allow direct publishing for ${toggleTargetName}?`
                : `Require review for ${toggleTargetName}?`}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {pendingToggle?.enable
                ? `They will be able to publish their own saved drafts of ${DIRECT_PUBLISH_SCOPE_TEXT} to the live website without your approval. Clinic information, Branding, Pages, SEO, Treatment pages, removals and drafts that include other people's changes still need review. Every direct publish is recorded in the activity log.`
                : "From their next publish, their changes must be submitted for your review again. Content that is already live stays published."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => void confirmDirectPublishChange()}>
              {pendingToggle?.enable ? "Allow direct publishing" : "Require review"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
