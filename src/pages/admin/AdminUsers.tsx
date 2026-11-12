import { useEffect, useState } from "react";
import { UserPlus, Shield, RefreshCw, ShieldAlert, CheckCircle2, Ban } from "lucide-react";
import { PageHeader, AccessDenied } from "@/components/admin/states";
import { useAuth } from "@/contexts/AuthContext";
import { invokeAdminUsers, type CmsManagedUser } from "@/lib/cms/repository";

const inputClass =
  "w-full rounded-lg border bg-background px-3.5 py-2 text-xs text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20";

/**
 * Super Admin User Management UI (`/admin/users`).
 *
 * SECURITY GUARANTEES:
 * 1. Guarded by `can("users.manage")` (Super Admin only). Editors and legacy admins are blocked.
 * 2. Never performs client-side writes to `public.user_roles` or `public.profiles`.
 * 3. All operations go through the server-side `admin-users` Edge Function (`invokeAdminUsers`),
 *    which verifies the caller's JWT via `public.is_super_admin()` before using the server-only service role key.
 * 4. Never fabricates mock user rows — clearly reports if the `admin-users` Edge Function or Migration 002
 *    is awaiting deployment on staging.
 */
export default function AdminUsers() {
  const { user: currentUser, can } = useAuth();
  const canManageUsers = can("users.manage");

  const [users, setUsers] = useState<CmsManagedUser[]>([]);
  const [edgeReady, setEdgeReady] = useState(true);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const [newEmail, setNewEmail] = useState("");
  const [newDisplayName, setNewDisplayName] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newRole, setNewRole] = useState<"editor" | "super_admin">("editor");

  const loadUsers = async () => {
    setLoading(true);
    setError(null);
    const res = await invokeAdminUsers<{ users: CmsManagedUser[] }>({ action: "list" });
    setEdgeReady(res.edgeFunctionReady);
    if (!res.ok) {
      setError(res.error ?? "Unable to load users.");
      setUsers([]);
    } else {
      setUsers(res.data?.users ?? []);
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

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setNotice(null);

    const emailToCreate = newEmail.trim().toLowerCase();
    if (users.some((u) => u.email.toLowerCase() === emailToCreate)) {
      setError(`An account with email "${emailToCreate}" already exists. Please enter a different email address.`);
      return;
    }

    setBusy(true);

    const res = await invokeAdminUsers({
      action: "create",
      email: emailToCreate,
      displayName: newDisplayName.trim(),
      password: newPassword || undefined,
      role: newRole,
    });
    setBusy(false);
    setEdgeReady(res.edgeFunctionReady);

    if (!res.ok) {
      setError(res.error ?? "Failed to create account.");
      return;
    }

    setNotice(`Created ${newRole === "super_admin" ? "Super Admin" : "Admin"} account for ${emailToCreate}.`);
    setNewEmail("");
    setNewDisplayName("");
    setNewPassword("");
    setNewRole("editor");
    await loadUsers();
  };

  const handleRoleChange = async (target: CmsManagedUser, nextRole: "editor" | "super_admin") => {
    setError(null);
    setNotice(null);
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

    setNotice(`Updated role for ${target.email} to ${nextRole}.`);
    await loadUsers();
  };

  const handleToggleActive = async (target: CmsManagedUser) => {
    setError(null);
    setNotice(null);
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

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <PageHeader
          title="Users & role management"
          description="Create Admin (editor) or Super Admin accounts, change roles, and disable or re-enable access via the secure server-side Edge Function."
        />
        <button
          type="button"
          onClick={() => void loadUsers()}
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

      {error && (
        <div role="alert" className="rounded-xl bg-destructive/10 p-3.5 text-xs font-medium text-destructive">
          {error}
        </div>
      )}

      {notice && (
        <div role="status" className="rounded-xl bg-primary/10 p-3.5 text-xs font-medium text-primary">
          {notice}
        </div>
      )}

      {/* Provision New CMS Account Form */}
      <section className="rounded-xl border bg-card p-5 shadow-sm">
        <div className="mb-4 flex items-center gap-2">
          <UserPlus size={18} className="text-primary" aria-hidden="true" />
          <h2 className="font-display text-base font-bold text-foreground">Create or Invite CMS Account</h2>
        </div>

        <form onSubmit={handleCreateUser} className="grid gap-4 sm:grid-cols-4">
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
            <label htmlFor="new-user-pass" className="mb-1 block text-xs font-medium text-foreground">
              Initial Password (optional — blank sends invite)
            </label>
            <input
              id="new-user-pass"
              type="password"
              minLength={8}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Min 8 characters"
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
              <option value="editor">Admin (drafts & submit for review)</option>
              <option value="super_admin">Super Admin (Full Control & Publish)</option>
            </select>
          </div>

          <div className="sm:col-span-4 flex justify-end">
            <button
              type="submit"
              disabled={busy}
              className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50"
            >
              <UserPlus size={14} aria-hidden="true" />
              Create CMS account
            </button>
          </div>
        </form>
      </section>

      {/* Existing CMS Users Table */}
      <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
        <table className="w-full text-left text-xs">
          <thead className="border-b bg-secondary/40 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="px-4 py-3">User</th>
              <th className="px-4 py-3">Role</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {users.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">
                  <Shield size={20} className="mx-auto mb-2 opacity-50" aria-hidden="true" />
                  {edgeReady
                    ? "No CMS user profiles found."
                    : "Waiting for 'admin-users' Edge Function & Migration 002 deployment to list live CMS accounts."}
                </td>
              </tr>
            ) : (
              users.map((u) => {
                const isSelf = u.userId === currentUser?.id;
                return (
                  <tr key={u.userId} className="hover:bg-secondary/20">
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
                      <button
                        type="button"
                        disabled={busy || isSelf}
                        onClick={() => void handleToggleActive(u)}
                        className="rounded-lg border px-3 py-1 text-xs font-medium text-foreground hover:bg-secondary disabled:opacity-40"
                      >
                        {u.isActive ? "Disable account" : "Re-enable account"}
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
