import { useState } from "react";
import {
  Save,
  Send,
  Eye,
  Lock,
  CheckCircle2,
  Clock,
  AlertTriangle,
  ThumbsUp,
  ThumbsDown,
  History,
  MessageSquareWarning,
  Zap,
} from "lucide-react";
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
import {
  WORKFLOW_STATUS_LABELS,
  type ApprovalHistoryEntry,
  type WorkflowStatus,
} from "@/lib/cms/types";

export interface DraftPublishBarProps {
  /** Current workflow status (`draft` | `pending_approval` | `approved` | `rejected` | `published`) */
  workflowStatus?: WorkflowStatus;
  /** Backwards-compatible flag: if `workflowStatus` is omitted, `hasDraft=true` maps to `'draft'`, `false` to `'published'` */
  hasDraft?: boolean;
  /** Whether a save, review, or publish operation is currently in progress */
  busy?: boolean;
  /** Whether the current user can submit drafts for review (`content.submit_review`) */
  canSubmitReview?: boolean;
  /** Whether the current user can approve/reject (`content.approve` — Super Admin only) */
  canApprove?: boolean;
  /** Whether the current user can publish (`content.publish` — Super Admin only unless enabled) */
  canPublish: boolean;
  /** Rejection feedback left by Super Admin (shown when status is `'rejected'`) */
  reviewFeedback?: string | null;
  /** Reviewer email & timestamp if available */
  reviewedByEmail?: string | null;
  reviewedAt?: string | null;
  /** Optional approval history entries */
  history?: ApprovalHistoryEntry[];
  /** Optional status message shown after an action */
  statusMessage?: string | null;
  /** Public path to open in preview mode (e.g. "/?preview=1" or "/orthopaedics/frozen-shoulder?preview=1") */
  previewUrl?: string;
  /**
   * When true, "Publish" is only enabled once the change is `approved` (the database enforces the
   * same rule). Used by workspaces whose publish path rejects anything that was not approved.
   */
  publishRequiresApproval?: boolean;
  /** Disables every action (e.g. the workspace's database tables are not available yet). */
  actionsDisabled?: boolean;
  /**
   * The signed-in Editor has direct publishing for this content (migration 007). Shows a
   * "Publish now" button with a confirmation step instead of the "Super Admin approves" lock.
   * The database re-checks the permission when `onPublish` runs.
   */
  directPublish?: boolean;
  /** When set, "Publish now" is disabled and this explains why (e.g. unsaved edits). */
  directPublishBlockedReason?: string | null;
  onSaveDraft: () => void;
  onSubmitForReview?: () => void;
  onApprove?: () => void;
  onReject?: (feedback: string) => void;
  onPublish: () => void;
}

const STATUS_BADGE_STYLES: Record<WorkflowStatus, string> = {
  draft: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
  pending_approval: "bg-blue-500/15 text-blue-700 dark:text-blue-300",
  approved: "bg-teal-500/15 text-teal-700 dark:text-teal-300",
  rejected: "bg-destructive/15 text-destructive",
  published: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
};

/**
 * Reusable workflow action bar implementing Rajiv's confirmed approval pipeline:
 * 1. Editor saves draft (`draft`) -> clicks "Submit for review" (`pending_approval`).
 * 2. Super Admin previews (`?preview=1`) -> approves (`approved`), rejects with feedback (`rejected`),
 *    or publishes (`published`).
 * 3. Editors cannot publish, unless a Super Admin enabled direct publishing for their account
 *    (`directPublish`, migration 007) — the database re-checks that permission on every publish.
 */
export function DraftPublishBar({
  workflowStatus,
  hasDraft = false,
  busy = false,
  canSubmitReview = true,
  canApprove = false,
  canPublish,
  reviewFeedback,
  reviewedByEmail,
  reviewedAt,
  history = [],
  statusMessage,
  previewUrl,
  publishRequiresApproval = false,
  actionsDisabled = false,
  directPublish = false,
  directPublishBlockedReason = null,
  onSaveDraft,
  onSubmitForReview,
  onApprove,
  onReject,
  onPublish,
}: DraftPublishBarProps) {
  const effectiveStatus: WorkflowStatus =
    workflowStatus ?? (hasDraft ? "draft" : "published");
  const disabled = busy || actionsDisabled;
  const publishBlockedByReview = publishRequiresApproval && effectiveStatus !== "approved";

  const [showRejectBox, setShowRejectBox] = useState(false);
  const [rejectFeedback, setRejectFeedback] = useState("");
  const [rejectError, setRejectError] = useState("");
  const [showHistory, setShowHistory] = useState(false);
  const [confirmDirectPublish, setConfirmDirectPublish] = useState(false);

  const handleConfirmReject = () => {
    if (!rejectFeedback.trim()) {
      setRejectError("Please enter feedback explaining what needs to be changed.");
      return;
    }
    setRejectError("");
    onReject?.(rejectFeedback.trim());
    setShowRejectBox(false);
    setRejectFeedback("");
  };

  return (
    <div className="space-y-3 rounded-xl border bg-card p-4 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2.5 text-sm">
          <span
            data-testid="workflow-status-badge"
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${STATUS_BADGE_STYLES[effectiveStatus]}`}
          >
            {effectiveStatus === "published" ? (
              <CheckCircle2 size={13} aria-hidden="true" />
            ) : effectiveStatus === "rejected" ? (
              <AlertTriangle size={13} aria-hidden="true" />
            ) : (
              <Clock size={13} aria-hidden="true" />
            )}
            {WORKFLOW_STATUS_LABELS[effectiveStatus]}
          </span>

          {statusMessage && (
            <span role="status" className="text-xs font-medium text-primary">
              {statusMessage}
            </span>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {history.length > 0 && (
            <button
              type="button"
              onClick={() => setShowHistory((v) => !v)}
              className="inline-flex items-center gap-1.5 rounded-lg border bg-background px-3 py-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            >
              <History size={14} aria-hidden="true" />
              History ({history.length})
            </button>
          )}

          {previewUrl && (
            <a
              href={previewUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-lg border bg-background px-3.5 py-2 text-xs font-medium text-foreground transition-colors hover:bg-secondary"
            >
              <Eye size={14} aria-hidden="true" />
              Preview draft
            </a>
          )}

          <button
            type="button"
            disabled={disabled}
            onClick={onSaveDraft}
            className="inline-flex items-center gap-1.5 rounded-lg border border-primary/40 bg-primary/10 px-4 py-2 text-xs font-semibold text-primary transition-colors hover:bg-primary/20 disabled:opacity-50"
          >
            <Save size={14} aria-hidden="true" />
            Save draft
          </button>

          {canSubmitReview && onSubmitForReview && effectiveStatus !== "pending_approval" && (
            <button
              type="button"
              disabled={disabled}
              onClick={onSubmitForReview}
              className="inline-flex items-center gap-1.5 rounded-lg border border-blue-600/40 bg-blue-600/10 px-4 py-2 text-xs font-semibold text-blue-700 transition-colors hover:bg-blue-600/20 disabled:opacity-50 dark:text-blue-300"
            >
              <Send size={14} aria-hidden="true" />
              Submit for review
            </button>
          )}

          {canApprove && onApprove && effectiveStatus === "pending_approval" && (
            <button
              type="button"
              disabled={disabled}
              onClick={onApprove}
              className="inline-flex items-center gap-1.5 rounded-lg bg-teal-600 px-3.5 py-2 text-xs font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              <ThumbsUp size={14} aria-hidden="true" />
              Approve
            </button>
          )}

          {canApprove && onReject && (effectiveStatus === "pending_approval" || effectiveStatus === "approved") && (
            <button
              type="button"
              disabled={disabled}
              onClick={() => setShowRejectBox((v) => !v)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-destructive/40 bg-destructive/10 px-3.5 py-2 text-xs font-semibold text-destructive transition-colors hover:bg-destructive/20 disabled:opacity-50"
            >
              <ThumbsDown size={14} aria-hidden="true" />
              Reject with feedback
            </button>
          )}

          {canPublish ? (
            <button
              type="button"
              disabled={disabled || publishBlockedByReview}
              onClick={onPublish}
              title={publishBlockedByReview ? "Approve the submitted changes before publishing." : undefined}
              className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              <Send size={14} aria-hidden="true" />
              {effectiveStatus === "approved" ? "Publish approved" : "Publish to live website"}
            </button>
          ) : directPublish ? (
            <>
              <span
                data-testid="direct-publish-badge"
                className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2.5 py-1 text-[11px] font-semibold text-emerald-700 dark:text-emerald-300"
                title="A Super Admin allowed your account to publish this content without review."
              >
                <Zap size={12} aria-hidden="true" />
                Direct publishing enabled
              </span>
              <button
                type="button"
                disabled={disabled || Boolean(directPublishBlockedReason)}
                onClick={() => setConfirmDirectPublish(true)}
                title={directPublishBlockedReason ?? undefined}
                className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
              >
                <Send size={14} aria-hidden="true" />
                Publish now
              </button>
            </>
          ) : (
            <span
              title="Only a Super Admin can approve and publish changes to the live website."
              className="inline-flex items-center gap-1.5 rounded-lg border bg-muted px-3.5 py-2 text-xs font-medium text-muted-foreground"
            >
              <Lock size={13} aria-hidden="true" />
              Super Admin approves & publishes
            </span>
          )}
        </div>
      </div>

      {directPublish && directPublishBlockedReason && !disabled && (
        <p className="text-[11px] text-muted-foreground">{directPublishBlockedReason}</p>
      )}

      <AlertDialog open={confirmDirectPublish} onOpenChange={setConfirmDirectPublish}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Publish to the live website now?</AlertDialogTitle>
            <AlertDialogDescription>
              Your saved draft will go live immediately, without Super Admin review. Preview it first if you have
              not already. The change is recorded in the activity log.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setConfirmDirectPublish(false);
                onPublish();
              }}
            >
              Publish now
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Rejection feedback banner */}
      {effectiveStatus === "rejected" && reviewFeedback && (
        <div
          role="alert"
          className="flex items-start gap-2.5 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive"
        >
          <MessageSquareWarning size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
          <div>
            <p className="font-semibold">
              Changes requested by {reviewedByEmail || "Super Admin"}
              {reviewedAt ? ` on ${new Date(reviewedAt).toLocaleString()}` : ""}:
            </p>
            <p className="mt-1 text-foreground">{reviewFeedback}</p>
          </div>
        </div>
      )}

      {/* Super Admin Reject Input Box */}
      {showRejectBox && canApprove && (
        <div className="space-y-2 rounded-lg border bg-secondary/40 p-3">
          <label htmlFor="reject-feedback-input" className="block text-xs font-semibold text-foreground">
            Feedback for the Admin (required)
          </label>
          <textarea
            id="reject-feedback-input"
            rows={2}
            value={rejectFeedback}
            onChange={(e) => setRejectFeedback(e.target.value)}
            placeholder="Explain what needs to be corrected before this can be published…"
            className="w-full rounded-lg border bg-card px-3 py-2 text-xs text-foreground outline-none focus:border-primary"
          />
          {rejectError && <p className="text-xs text-destructive">{rejectError}</p>}
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => {
                setShowRejectBox(false);
                setRejectError("");
              }}
              className="rounded-lg border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-secondary"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirmReject}
              className="rounded-lg bg-destructive px-3 py-1.5 text-xs font-semibold text-destructive-foreground hover:opacity-90"
            >
              Confirm rejection
            </button>
          </div>
        </div>
      )}

      {/* Collapsible Approval History */}
      {showHistory && history.length > 0 && (
        <div className="rounded-lg border bg-secondary/20 p-3">
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Approval & Publishing History
          </h3>
          <ul className="space-y-2 text-xs">
            {history.map((item) => (
              <li key={item.id} className="flex flex-col gap-0.5 border-b pb-2 last:border-b-0 last:pb-0">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-medium text-foreground">
                    {WORKFLOW_STATUS_LABELS[item.toStatus]} — by {item.actorEmail} ({item.actorRole})
                  </span>
                  <span className="text-muted-foreground">
                    {new Date(item.createdAt).toLocaleString()}
                  </span>
                </div>
                {item.feedback && (
                  <p className="italic text-muted-foreground">Feedback: "{item.feedback}"</p>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
