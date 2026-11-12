import { useEffect, useState } from "react";
import { Search, Image as ImageIcon, Globe } from "lucide-react";
import { PageHeader } from "@/components/admin/states";
import { DraftPublishBar } from "@/components/admin/DraftPublishBar";
import { MediaPickerModal } from "@/components/admin/MediaPickerModal";
import { useAuth } from "@/contexts/AuthContext";
import {
  DEFAULT_ROUTE_SEO_CATALOG,
  type ApprovalHistoryEntry,
  type RouteSeoMetadata,
  type WorkflowStatus,
} from "@/lib/cms/types";
import { loadRouteSeoCatalog, loadStagedSeo, transitionSeoWorkflow } from "@/lib/cms/repository";

const inputClass =
  "w-full rounded-lg border bg-background px-3.5 py-2 text-xs text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20";

export default function AdminSeo() {
  const { user, role, can } = useAuth();
  const canSubmitReview = can("content.submit_review");
  const canApprove = can("content.approve");
  const canPublish = can("content.publish");

  const [routes, setRoutes] = useState<RouteSeoMetadata[]>(DEFAULT_ROUTE_SEO_CATALOG);
  const [selectedPath, setSelectedPath] = useState<string>(DEFAULT_ROUTE_SEO_CATALOG[0].routePath);
  const [schemaReady, setSchemaReady] = useState(true);

  const [form, setForm] = useState<RouteSeoMetadata>(DEFAULT_ROUTE_SEO_CATALOG[0]);
  const [workflowStatus, setWorkflowStatus] = useState<WorkflowStatus>("published");
  const [reviewFeedback, setReviewFeedback] = useState<string | null>(null);
  const [reviewedByEmail, setReviewedByEmail] = useState<string | null>(null);
  const [reviewedAt, setReviewedAt] = useState<string | null>(null);
  const [history, setHistory] = useState<ApprovalHistoryEntry[]>([]);
  const [busy, setBusy] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [customPathInput, setCustomPathInput] = useState("");

  const handleAddCustomRoute = () => {
    const raw = customPathInput.trim();
    if (!raw) return;
    const normalized = raw.startsWith("/") ? raw : `/${raw}`;
    if (routes.some((r) => r.routePath === normalized)) {
      setSelectedPath(normalized);
      setCustomPathInput("");
      return;
    }
    const newRoute: RouteSeoMetadata = {
      routePath: normalized,
      pageLabel: normalized,
      seoTitle: normalized.split("/").filter(Boolean).pop()?.replace(/-/g, " ") || "Custom Page",
      seoDescription: "",
      seoKeywords: "",
      ogImageUrl: "https://orthocarehub.in/og-image.svg",
      canonicalUrl: `https://orthocarehub.in${normalized}`,
      noindex: false,
    };
    setRoutes((prev) => [...prev, newRoute]);
    setSelectedPath(normalized);
    setCustomPathInput("");
  };

  useEffect(() => {
    void loadRouteSeoCatalog().then(({ routes: list, schemaReady: ready }) => {
      setRoutes(list);
      setSchemaReady(ready);
    });
  }, []);

  const currentRoute = routes.find((r) => r.routePath === selectedPath) ?? routes[0];

  useEffect(() => {
    if (!currentRoute) return;
    const staged = loadStagedSeo(currentRoute.routePath);
    if (staged) {
      setForm(staged.draft);
      setWorkflowStatus(staged.workflowStatus);
      setReviewFeedback(staged.reviewFeedback ?? null);
      setReviewedByEmail(staged.reviewedByEmail ?? null);
      setReviewedAt(staged.reviewedAt ?? null);
      setHistory(staged.history ?? []);
    } else {
      setForm({ ...currentRoute });
      setWorkflowStatus("published");
      setReviewFeedback(null);
      setReviewedByEmail(null);
      setReviewedAt(null);
      setHistory([]);
    }
    setStatusMessage(null);
  }, [currentRoute]);

  const runTransition = async (targetStatus: WorkflowStatus, feedback?: string) => {
    setBusy(true);
    setStatusMessage(null);
    const res = await transitionSeoWorkflow({
      seo: form,
      targetStatus,
      actorEmail: user?.email ?? "cms-user@orthocarehub.in",
      actorRole: role ?? "editor",
      canPublish,
      feedback,
    });
    setBusy(false);
    setStatusMessage(res.message);
    if (res.workflowStatus) setWorkflowStatus(res.workflowStatus);

    const refreshed = loadStagedSeo(form.routePath);
    if (refreshed) {
      setReviewFeedback(refreshed.reviewFeedback ?? null);
      setReviewedByEmail(refreshed.reviewedByEmail ?? null);
      setReviewedAt(refreshed.reviewedAt ?? null);
      setHistory(refreshed.history ?? []);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="SEO metadata"
        description="Manage search engine titles, meta descriptions, keywords, OpenGraph social sharing images, and canonical URLs."
      />

      {!schemaReady && (
        <div role="status" className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3.5 text-xs text-amber-800 dark:text-amber-300">
          <strong>Database status:</strong> SEO drafts, review workflows, and SERP previews work immediately in session. Permanent database persistence to <code className="font-mono">public.cms_seo_metadata</code> awaits Migration 005 approval.
        </div>
      )}

      <DraftPublishBar
        workflowStatus={workflowStatus}
        busy={busy}
        canSubmitReview={canSubmitReview}
        canApprove={canApprove}
        canPublish={canPublish}
        reviewFeedback={reviewFeedback}
        reviewedByEmail={reviewedByEmail}
        reviewedAt={reviewedAt}
        history={history}
        statusMessage={statusMessage}
        previewUrl={`${form.routePath}?preview=1`}
        onSaveDraft={() => void runTransition("draft")}
        onSubmitForReview={() => void runTransition("pending_approval")}
        onApprove={() => void runTransition("approved")}
        onReject={(fb) => void runTransition("rejected", fb)}
        onPublish={() => void runTransition("published")}
      />

      <div className="grid gap-6 lg:grid-cols-12">
        {/* Left: Route Selector */}
        <aside className="rounded-xl border bg-card p-4 shadow-sm lg:col-span-4">
          <div className="mb-3 flex items-center gap-2">
            <Globe size={16} className="text-primary" aria-hidden="true" />
            <h2 className="font-display text-sm font-bold text-foreground">Website Pages ({routes.length})</h2>
          </div>

          <div className="mb-3 flex gap-1.5">
            <input
              type="text"
              value={customPathInput}
              onChange={(e) => setCustomPathInput(e.target.value)}
              placeholder="/orthopaedics/frozen-shoulder"
              className="flex-1 rounded-lg border bg-background px-2.5 py-1.5 text-xs text-foreground outline-none focus:border-primary"
            />
            <button
              type="button"
              onClick={handleAddCustomRoute}
              className="rounded-lg bg-secondary px-2.5 py-1.5 text-xs font-semibold text-foreground hover:bg-secondary/80"
            >
              + Route
            </button>
          </div>

          <ul className="space-y-1.5">
            {routes.map((r) => {
              const active = r.routePath === selectedPath;
              const staged = loadStagedSeo(r.routePath);
              return (
                <li key={r.routePath}>
                  <button
                    type="button"
                    onClick={() => setSelectedPath(r.routePath)}
                    className={`flex w-full items-center justify-between rounded-lg border px-3 py-2 text-left text-xs transition-colors ${
                      active ? "border-primary bg-primary/10 font-semibold text-primary" : "hover:bg-secondary/60"
                    }`}
                  >
                    <div>
                      <div className="text-foreground">{r.pageLabel}</div>
                      <div className="font-mono text-[10px] text-muted-foreground">{r.routePath}</div>
                    </div>
                    {staged && staged.workflowStatus !== "published" && (
                      <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-[10px] font-medium text-amber-700 dark:text-amber-300">
                        {staged.workflowStatus}
                      </span>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        </aside>

        {/* Right: SEO Editor + Google SERP Preview */}
        <div className="space-y-5 lg:col-span-8">
          {/* Google SERP Preview Card */}
          <section aria-label="Google search result preview" className="rounded-xl border bg-card p-5 shadow-sm">
            <div className="mb-2 flex items-center gap-2 text-xs font-semibold text-muted-foreground">
              <Search size={14} className="text-primary" />
              Google Search Snippet Preview
            </div>
            <div className="rounded-lg border bg-background p-4">
              <div className="truncate text-xs text-emerald-700 dark:text-emerald-400">
                {form.canonicalUrl || `https://orthocarehub.in${form.routePath}`}
              </div>
              <div className="mt-1 truncate text-base font-semibold text-blue-700 dark:text-blue-400">
                {form.seoTitle} | Dr. Srivanth Dasari - OrthoCare Hub
              </div>
              <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                {form.seoDescription}
              </p>
            </div>
          </section>

          <section className="rounded-xl border bg-card p-5 shadow-sm">
            <h2 className="mb-4 font-display text-base font-bold text-foreground">
              SEO Tags for {form.pageLabel} ({form.routePath})
            </h2>

            <div className="space-y-4">
              <div>
                <label htmlFor="seo-title-input" className="mb-1 flex justify-between text-xs font-medium text-foreground">
                  <span>Page Title Tag</span>
                  <span className="text-muted-foreground">{form.seoTitle.length} / 60 chars recommended</span>
                </label>
                <input
                  id="seo-title-input"
                  type="text"
                  value={form.seoTitle}
                  onChange={(e) => setForm({ ...form, seoTitle: e.target.value })}
                  className={inputClass}
                />
              </div>

              <div>
                <label htmlFor="seo-desc-input" className="mb-1 flex justify-between text-xs font-medium text-foreground">
                  <span>Meta Description</span>
                  <span className="text-muted-foreground">{form.seoDescription.length} / 160 chars recommended</span>
                </label>
                <textarea
                  id="seo-desc-input"
                  rows={3}
                  value={form.seoDescription}
                  onChange={(e) => setForm({ ...form, seoDescription: e.target.value })}
                  className={inputClass}
                />
              </div>

              <div>
                <label htmlFor="seo-keywords-input" className="mb-1 block text-xs font-medium text-foreground">
                  Target Keywords (comma-separated)
                </label>
                <textarea
                  id="seo-keywords-input"
                  rows={2}
                  value={form.seoKeywords}
                  onChange={(e) => setForm({ ...form, seoKeywords: e.target.value })}
                  className={inputClass}
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="seo-canonical-input" className="mb-1 block text-xs font-medium text-foreground">
                    Canonical URL
                  </label>
                  <input
                    id="seo-canonical-input"
                    type="url"
                    value={form.canonicalUrl}
                    onChange={(e) => setForm({ ...form, canonicalUrl: e.target.value })}
                    className={inputClass}
                  />
                </div>

                <div>
                  <label htmlFor="seo-og-input" className="mb-1 block text-xs font-medium text-foreground">
                    OpenGraph / Social Share Image
                  </label>
                  <div className="flex gap-2">
                    <input
                      id="seo-og-input"
                      type="text"
                      value={form.ogImageUrl}
                      onChange={(e) => setForm({ ...form, ogImageUrl: e.target.value })}
                      className={inputClass}
                    />
                    <button
                      type="button"
                      onClick={() => setPickerOpen(true)}
                      className="inline-flex shrink-0 items-center gap-1 rounded-lg border bg-secondary px-2.5 py-1.5 text-xs font-medium"
                    >
                      <ImageIcon size={12} /> Media
                    </button>
                  </div>
                </div>
              </div>

              <div className="pt-1">
                <label className="flex cursor-pointer items-center gap-2 text-xs font-medium text-foreground">
                  <input
                    type="checkbox"
                    checked={form.noindex}
                    onChange={(e) => setForm({ ...form, noindex: e.target.checked })}
                  />
                  Request search engines not to index this page (<code className="font-mono">noindex</code>)
                </label>
              </div>
            </div>
          </section>
        </div>
      </div>

      <MediaPickerModal
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        allowedTypes={["image"]}
        defaultCategory="hero"
        title="Select OpenGraph Social Image"
        onSelect={(asset) => setForm({ ...form, ogImageUrl: asset.publicUrl })}
      />
    </div>
  );
}
