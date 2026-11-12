import { useEffect, useState } from "react";
import { ScrollText, RefreshCw, ShieldAlert } from "lucide-react";
import { PageHeader, AccessDenied } from "@/components/admin/states";
import { useAuth } from "@/contexts/AuthContext";
import { fetchActivityLogs, type ActivityLogRow } from "@/lib/cms/repository";

export default function AdminActivity() {
  const { can } = useAuth();
  const canViewAudit = can("activity.view");

  const [logs, setLogs] = useState<ActivityLogRow[]>([]);
  const [schemaReady, setSchemaReady] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterAction, setFilterAction] = useState("all");
  const [search, setSearch] = useState("");

  const load = async () => {
    setLoading(true);
    setError(null);
    const res = await fetchActivityLogs(100);
    setLogs(res.logs);
    setSchemaReady(res.schemaReady);
    if (res.error) setError(res.error);
    setLoading(false);
  };

  useEffect(() => {
    if (!canViewAudit) return;
    void load();
  }, [canViewAudit]);

  if (!canViewAudit) {
    return <AccessDenied variant="forbidden" />;
  }

  const filtered = logs.filter((row) => {
    if (filterAction !== "all" && !row.action.startsWith(filterAction)) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return (
        row.actorEmail.toLowerCase().includes(q) ||
        row.action.toLowerCase().includes(q) ||
        row.entityType.toLowerCase().includes(q) ||
        row.entityId.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <PageHeader
          title="Activity log"
          description="Read-only audit trail of logins, content edits, workflow reviews, media uploads, and user role changes."
        />
        <button
          type="button"
          onClick={() => void load()}
          disabled={loading}
          className="inline-flex items-center gap-1.5 rounded-lg border bg-card px-3.5 py-2 text-xs font-semibold text-foreground hover:bg-secondary disabled:opacity-50"
        >
          <RefreshCw size={13} className={loading ? "animate-spin" : ""} aria-hidden="true" />
          Refresh logs
        </button>
      </div>

      {!schemaReady && (
        <div
          role="status"
          className="flex items-start gap-2.5 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-xs text-amber-800 dark:text-amber-300"
        >
          <ShieldAlert size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
          <div>
            <p className="font-semibold">Awaiting Database Migration 002 (`public.activity_logs`)</p>
            <p className="mt-0.5">
              This viewer queries genuine records from <code className="font-mono">public.activity_logs</code> and never displays fabricated mock rows. Once Migration 002 is applied on the staging database, all <code className="font-mono">log_activity()</code> and <code className="font-mono">record_workflow_transition()</code> events will appear here automatically.
            </p>
          </div>
        </div>
      )}

      {error && (
        <div role="alert" className="rounded-xl bg-destructive/10 p-3.5 text-xs font-medium text-destructive">
          {error}
        </div>
      )}

      {/* Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-card p-4">
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="search"
            placeholder="Filter by user email, action, or entity…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-64 rounded-lg border bg-background px-3 py-1.5 text-xs text-foreground outline-none focus:border-primary"
          />
          <select
            aria-label="Filter by action prefix"
            value={filterAction}
            onChange={(e) => setFilterAction(e.target.value)}
            className="rounded-lg border bg-background px-3 py-1.5 text-xs text-foreground"
          >
            <option value="all">All action categories</option>
            <option value="workflow.">Workflow & Publishing</option>
            <option value="user.">User Management</option>
            <option value="page.">Page Edits</option>
            <option value="media.">Media Library</option>
          </select>
        </div>

        <span className="text-xs text-muted-foreground">
          {filtered.length} {filtered.length === 1 ? "record" : "records"}
        </span>
      </div>

      {/* Read-Only Table */}
      <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
        <table className="w-full text-left text-xs">
          <thead className="border-b bg-secondary/40 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="px-4 py-3">Timestamp</th>
              <th className="px-4 py-3">Actor Email</th>
              <th className="px-4 py-3">Action</th>
              <th className="px-4 py-3">Entity</th>
              <th className="px-4 py-3">Details</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                  <ScrollText size={20} className="mx-auto mb-2 opacity-50" aria-hidden="true" />
                  {schemaReady
                    ? "No matching activity log records found in public.activity_logs."
                    : "Waiting for public.activity_logs table (Migration 002) to display live database audit records."}
                </td>
              </tr>
            ) : (
              filtered.map((row) => (
                <tr key={row.id} className="hover:bg-secondary/20">
                  <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">
                    {row.createdAt ? new Date(row.createdAt).toLocaleString() : "—"}
                  </td>
                  <td className="px-4 py-3 font-medium text-foreground">{row.actorEmail}</td>
                  <td className="px-4 py-3">
                    <span className="rounded-full bg-primary/10 px-2.5 py-0.5 font-mono text-[11px] font-semibold text-primary">
                      {row.action}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {row.entityType ? `${row.entityType}:${row.entityId}` : "—"}
                  </td>
                  <td className="max-w-xs truncate px-4 py-3 font-mono text-[11px] text-muted-foreground">
                    {JSON.stringify(row.details)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
