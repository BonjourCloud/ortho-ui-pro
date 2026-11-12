import { AlertTriangle, GitCompare, RotateCcw } from "lucide-react";
import { DraftPublishBar } from "@/components/admin/DraftPublishBar";
import { useAuth } from "@/contexts/AuthContext";
import type { ApprovalHistoryEntry, WorkflowStatus } from "@/lib/cms/types";

export interface DraftChangeRow {
  key: string;
  label: string;
  live: string;
  draft: string;
}

export interface DraftWorkflowPanelsProps {
  /** Shown in the "not available" banner, e.g. "Doctor profile". */
  label: string;
  /** Migration that creates the draft table, e.g. "005c". */
  migration: string;
  schemaReady: boolean;
  loadError: string | null;
  workflowStatus: WorkflowStatus;
  busy: boolean;
  statusMessage: string | null;
  reviewFeedback: string | null;
  reviewedByEmail: string | null;
  reviewedAt: string | null;
  history: ApprovalHistoryEntry[];
  previewUrl?: string;
  unsavedChanges: boolean;
  changes: DraftChangeRow[];
  /** Override the comparison table (collections render their own summary). */
  changesTable?: React.ReactNode;
  onSave: (status: "draft" | "pending_approval") => void;
  onReview: (decision: "approved" | "rejected", feedback?: string) => void;
  onPublish: () => void;
  onDiscard: () => void;
}

/**
 * Banners, action bar, unsaved-edits bar and the "compared with the live website" table used by
 * every database-backed draft workspace. Publish only unlocks for an approved draft (the database
 * enforces the same rule).
 */
export function DraftWorkflowPanels(props: DraftWorkflowPanelsProps) {
  const { can } = useAuth();
  const {
    label,
    migration,
    schemaReady,
    loadError,
    workflowStatus,
    unsavedChanges,
    changes,
    changesTable,
  } = props;

  return (
    <>
      {!schemaReady && (
        <div
          role="alert"
          className="flex items-start gap-2.5 rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-xs text-amber-800 dark:text-amber-200"
        >
          <AlertTriangle size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
          <p>
            {label} drafts are not available yet: CMS migration {migration} has not been applied to this database.
            Nothing on this page can be saved, and the live website is unchanged.
          </p>
        </div>
      )}

      {schemaReady && loadError && (
        <div role="alert" className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive">
          {loadError}
        </div>
      )}

      <DraftPublishBar
        workflowStatus={workflowStatus}
        busy={props.busy}
        actionsDisabled={!schemaReady || Boolean(loadError)}
        publishRequiresApproval
        canSubmitReview={can("content.submit_review")}
        canApprove={can("content.approve")}
        canPublish={can("content.publish")}
        reviewFeedback={props.reviewFeedback}
        reviewedByEmail={props.reviewedByEmail}
        reviewedAt={props.reviewedAt}
        history={props.history}
        statusMessage={props.statusMessage}
        previewUrl={props.previewUrl}
        onSaveDraft={() => props.onSave("draft")}
        onSubmitForReview={() => props.onSave("pending_approval")}
        onApprove={() => props.onReview("approved")}
        onReject={(fb) => props.onReview("rejected", fb)}
        onPublish={props.onPublish}
      />

      {unsavedChanges && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-primary/30 bg-primary/5 px-3 py-2 text-xs text-foreground">
          <span>You have unsaved edits. They are not visible to anyone else until you save the draft.</span>
          <button
            type="button"
            onClick={props.onDiscard}
            className="inline-flex items-center gap-1 rounded-lg border px-2.5 py-1 text-xs font-medium text-muted-foreground hover:bg-secondary"
          >
            <RotateCcw size={12} aria-hidden="true" /> Discard edits
          </button>
        </div>
      )}

      {workflowStatus !== "published" && schemaReady && !loadError && (
        <section aria-label="Changes compared with the live website" className="rounded-xl border bg-card p-5 shadow-sm">
          <div className="mb-3 flex items-center gap-2">
            <GitCompare size={18} className="text-primary" aria-hidden="true" />
            <h2 className="font-display text-base font-bold text-foreground">
              {workflowStatus === "pending_approval"
                ? "Changes waiting for review"
                : workflowStatus === "approved"
                  ? "Approved changes (not live yet)"
                  : "Saved draft compared with the live website"}
            </h2>
          </div>
          {changesTable ??
            (changes.length === 0 ? (
              <p className="text-xs text-muted-foreground">The saved draft matches the live website.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b text-muted-foreground">
                      <th className="py-2 pr-3 font-medium">Field</th>
                      <th className="py-2 pr-3 font-medium">Live website</th>
                      <th className="py-2 font-medium">Draft</th>
                    </tr>
                  </thead>
                  <tbody>
                    {changes.map((change) => (
                      <tr key={change.key} className="border-b last:border-b-0 align-top">
                        <td className="py-2 pr-3 font-medium text-foreground">{change.label}</td>
                        <td className="py-2 pr-3 text-muted-foreground line-through decoration-destructive/50">{change.live}</td>
                        <td className="py-2 text-foreground">{change.draft}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}
        </section>
      )}
    </>
  );
}

/** Loading state shared by the draft workspaces. */
export function DraftWorkspaceLoading({ label }: { label: string }) {
  return (
    <p role="status" className="text-xs text-muted-foreground">
      Loading {label.toLowerCase()}…
    </p>
  );
}
