import { Eye, Lock, ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import { WORKFLOW_STATUS_LABELS, type WorkflowStatus } from "@/lib/cms/types";

export interface PreviewBannerProps {
  /** Whether the page is currently rendering draft content instead of live content */
  usingDraft: boolean;
  /** Current workflow status of the draft */
  workflowStatus?: WorkflowStatus;
  /** Link back to the corresponding CMS editor (e.g. "/admin/pages") */
  editorPath?: string;
}

/**
 * Sticky banner shown at the top of public pages ONLY when an authenticated CMS user
 * views a page with `?preview=1` and a draft is active.
 * Public visitors never see this banner or draft data.
 */
export function PreviewBanner({
  usingDraft,
  workflowStatus = "draft",
  editorPath = "/admin/pages",
}: PreviewBannerProps) {
  if (!usingDraft) return null;

  return (
    <div
      role="region"
      aria-label="Draft preview notice"
      className="sticky top-0 z-50 border-b border-amber-500/40 bg-amber-950/95 px-4 py-2.5 text-xs text-amber-100 backdrop-blur"
    >
      <div className="container flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Eye size={15} className="text-amber-400" aria-hidden="true" />
          <span className="font-semibold">CMS Draft Preview</span>
          <span className="rounded-full bg-amber-500/20 px-2.5 py-0.5 text-[11px] font-medium text-amber-300">
            {WORKFLOW_STATUS_LABELS[workflowStatus]}
          </span>
          <span className="hidden text-amber-200/80 sm:inline">
            <Lock size={11} className="mr-1 inline" aria-hidden="true" />
            Visible only to signed-in CMS staff — public visitors still see the live published page.
          </span>
        </div>

        <Link
          to={editorPath}
          className="inline-flex items-center gap-1 rounded-md bg-amber-400 px-3 py-1 font-semibold text-amber-950 transition-opacity hover:opacity-90"
        >
          <ArrowLeft size={13} aria-hidden="true" />
          Back to editor
        </Link>
      </div>
    </div>
  );
}
