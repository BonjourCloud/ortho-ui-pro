import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { ROLE_LABELS } from "@/lib/permissions";
import { PageHeader } from "@/components/admin/states";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function AdminAccount() {
  const { user, role, roleSource, signOut } = useAuth();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [message, setMessage] = useState<{ type: "ok" | "error"; text: string } | null>(null);
  const [saving, setSaving] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    if (password.length < 8) return setMessage({ type: "error", text: "Password must be at least 8 characters." });
    if (password !== confirm) return setMessage({ type: "error", text: "Passwords do not match." });
    setSaving(true);
    const { error } = await supabase.auth.updateUser({ password });
    setSaving(false);
    if (error) return setMessage({ type: "error", text: error.message });
    setPassword("");
    setConfirm("");
    setMessage({ type: "ok", text: "Password updated." });
  };

  return (
    <div className="max-w-xl">
      <PageHeader title="My account" description="Your sign-in details and password." />

      <section className="mb-6 rounded-xl border bg-card p-5">
        <dl className="space-y-3 text-sm">
          <div>
            <dt className="text-muted-foreground">Email</dt>
            <dd className="font-medium">{user?.email}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Role</dt>
            <dd className="font-medium">{role ? ROLE_LABELS[role] : "No CMS role"}</dd>
          </div>
        </dl>
        {roleSource === "legacy" && (
          <p className="mt-3 rounded-lg bg-accent/10 p-3 text-xs text-foreground/80">
            Your role was read with the original admin check, because the new role system has not been installed in the database yet.
          </p>
        )}
      </section>

      <form onSubmit={submit} className="mb-6 space-y-4 rounded-xl border bg-card p-5" aria-label="Change password">
        <h2 className="font-display text-lg font-semibold">Change password</h2>
        {message && (
          <div role={message.type === "error" ? "alert" : "status"} className={`rounded-lg p-3 text-sm ${message.type === "error" ? "bg-destructive/10 text-destructive" : "bg-primary/10 text-primary"}`}>
            {message.text}
          </div>
        )}
        <div className="space-y-1.5">
          <Label htmlFor="new-password">New password</Label>
          <Input id="new-password" type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="confirm-password">Confirm new password</Label>
          <Input id="confirm-password" type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
        </div>
        <Button type="submit" disabled={saving}>
          {saving ? "Saving…" : "Update password"}
        </Button>
      </form>

      <Button variant="outline" onClick={() => void signOut()}>
        Sign out
      </Button>
    </div>
  );
}
