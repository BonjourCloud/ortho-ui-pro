import { useEffect, useState } from "react";
import { Plus, Trash2, Stethoscope, Image as ImageIcon, Eye } from "lucide-react";
import DOMPurify from "dompurify";
import { PageHeader } from "@/components/admin/states";
import { DraftPublishBar } from "@/components/admin/DraftPublishBar";
import { MediaPickerModal } from "@/components/admin/MediaPickerModal";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import {
  compileTreatmentBlocksToHtml,
  type ApprovalHistoryEntry,
  type TreatmentBlockType,
  type TreatmentSectionBlock,
  type WorkflowStatus,
} from "@/lib/cms/types";
import {
  loadStagedTreatment,
  transitionTreatmentWorkflow,
  type StagedTreatmentPayload,
} from "@/lib/cms/repository";

interface SubsectionSummary {
  id: string;
  sectionSlug: string;
  sectionDisplayName: string;
  name: string;
  slug: string;
  description: string;
  metaDescription: string;
  content: string;
}

const FALLBACK_TREATMENTS: SubsectionSummary[] = [
  {
    id: "sub-frozen-shoulder",
    sectionSlug: "orthopaedics",
    sectionDisplayName: "Orthopaedics",
    name: "Frozen Shoulder",
    slug: "frozen-shoulder",
    description: "Comprehensive care and adhesive capsulitis treatment for frozen shoulder.",
    metaDescription: "Frozen Shoulder treatment in Hyderabad by Dr. Srivanth Dasari.",
    content: "<h2>Overview</h2><p>Frozen shoulder causes pain and stiffness in the shoulder joint.</p>",
  },
  {
    id: "sub-total-knee-replacement",
    sectionSlug: "orthopaedics",
    sectionDisplayName: "Orthopaedics",
    name: "Total Knee Replacement",
    slug: "total-knee-replacement",
    description: "Advanced minimally invasive knee replacement surgery.",
    metaDescription: "Total Knee Replacement surgery in Hyderabad.",
    content: "<h2>Overview</h2><p>Total knee replacement restores pain-free mobility.</p>",
  },
  {
    id: "sub-eswt",
    sectionSlug: "physiotherapy",
    sectionDisplayName: "Physiotherapy",
    name: "Extracorporeal Shock Wave Therapy",
    slug: "extracorporeal-shock-wave-therapy",
    description: "Non-invasive shockwave therapy for chronic tendon pain.",
    metaDescription: "ESWT shockwave therapy in Hyderabad.",
    content: "<h2>Overview</h2><p>Shockwave therapy accelerates tendon healing without surgery.</p>",
  },
];

const BLOCK_TYPE_LABELS: { value: TreatmentBlockType; label: string }[] = [
  { value: "overview", label: "Overview / Introduction" },
  { value: "symptoms", label: "Symptoms" },
  { value: "causes", label: "Causes & Risk Factors" },
  { value: "diagnosis", label: "Diagnosis & Evaluation" },
  { value: "treatments", label: "Treatment Options" },
  { value: "recovery", label: "Recovery & Rehabilitation" },
  { value: "faq", label: "Frequently Asked Questions" },
  { value: "image", label: "Illustration / Clinical Image" },
];

const inputClass =
  "w-full rounded-lg border bg-background px-3.5 py-2 text-xs text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20";

export default function AdminTreatments() {
  const { user, role, can } = useAuth();
  const canSubmitReview = can("content.submit_review");
  const canApprove = can("content.approve");
  const canPublish = can("content.publish");
  const canDeleteBlock = can("section.delete");

  const [items, setItems] = useState<SubsectionSummary[]>(FALLBACK_TREATMENTS);
  const [selectedSlug, setSelectedSlug] = useState<string>(FALLBACK_TREATMENTS[0].slug);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [metaDescription, setMetaDescription] = useState("");
  const [heroImageUrl, setHeroImageUrl] = useState("");
  const [blocks, setBlocks] = useState<TreatmentSectionBlock[]>([]);
  const [rawHtml, setRawHtml] = useState("");

  const [workflowStatus, setWorkflowStatus] = useState<WorkflowStatus>("published");
  const [reviewFeedback, setReviewFeedback] = useState<string | null>(null);
  const [reviewedByEmail, setReviewedByEmail] = useState<string | null>(null);
  const [reviewedAt, setReviewedAt] = useState<string | null>(null);
  const [history, setHistory] = useState<ApprovalHistoryEntry[]>([]);
  const [busy, setBusy] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [showLivePreview, setShowLivePreview] = useState(false);
  const [pickerBlockIdx, setPickerBlockIdx] = useState<number | "hero" | null>(null);

  useEffect(() => {
    async function loadFromDb() {
      try {
        const { data: secs } = await supabase
          .from("medical_sections")
          .select("id, slug, display_name")
          .order("sort_order");
        const { data: subs } = await supabase
          .from("medical_subsections")
          .select("id, section_id, name, slug, description, meta_description, content")
          .order("sort_order");

        if (secs && subs && subs.length > 0) {
          const secMap = new Map(secs.map((s) => [s.id, s]));
          const mapped: SubsectionSummary[] = subs.map((sub) => {
            const sec = secMap.get(sub.section_id);
            return {
              id: sub.id,
              sectionSlug: sec?.slug ?? "orthopaedics",
              sectionDisplayName: sec?.display_name ?? "Orthopaedics",
              name: sub.name,
              slug: sub.slug,
              description: sub.description ?? "",
              metaDescription: sub.meta_description ?? "",
              content: sub.content ?? "",
            };
          });
          setItems(mapped);
          setSelectedSlug(mapped[0].slug);
        }
      } catch {
        // Keep FALLBACK_TREATMENTS when offline / unconfigured
      }
    }
    void loadFromDb();
  }, []);

  const currentItem = items.find((i) => i.slug === selectedSlug) ?? items[0];

  useEffect(() => {
    if (!currentItem) return;
    const staged = loadStagedTreatment(currentItem.slug);
    if (staged) {
      setName(staged.draft.name);
      setDescription(staged.draft.description);
      setMetaDescription(staged.draft.metaDescription);
      setHeroImageUrl(staged.draft.heroImageUrl);
      setBlocks(staged.draft.blocks);
      setRawHtml(staged.draft.compiledHtml);
      setWorkflowStatus(staged.workflowStatus);
      setReviewFeedback(staged.reviewFeedback ?? null);
      setReviewedByEmail(staged.reviewedByEmail ?? null);
      setReviewedAt(staged.reviewedAt ?? null);
      setHistory(staged.history ?? []);
    } else {
      setName(currentItem.name);
      setDescription(currentItem.description);
      setMetaDescription(currentItem.metaDescription);
      setHeroImageUrl("");
      setBlocks([
        {
          id: `blk-${currentItem.slug}-1`,
          type: "overview",
          heading: `About ${currentItem.name}`,
          body: currentItem.description,
          bulletItems: [],
        },
      ]);
      setRawHtml(currentItem.content);
      setWorkflowStatus("published");
      setReviewFeedback(null);
      setReviewedByEmail(null);
      setReviewedAt(null);
      setHistory([]);
    }
    setStatusMessage(null);
  }, [currentItem]);

  const compiledPreviewHtml = blocks.length > 0 ? compileTreatmentBlocksToHtml(blocks) : rawHtml;

  const runTransition = async (targetStatus: WorkflowStatus, feedback?: string) => {
    if (!currentItem) return;
    setBusy(true);
    setStatusMessage(null);

    const payload: StagedTreatmentPayload = {
      subsectionId: currentItem.id,
      name,
      description,
      metaDescription,
      heroImageUrl,
      blocks,
      compiledHtml: compiledPreviewHtml,
    };

    const res = await transitionTreatmentWorkflow({
      slug: currentItem.slug,
      payload,
      targetStatus,
      actorEmail: user?.email ?? "cms-user@orthocarehub.in",
      actorRole: role ?? "editor",
      canPublish,
      feedback,
    });

    setBusy(false);
    setStatusMessage(res.message);
    if (res.workflowStatus) {
      setWorkflowStatus(res.workflowStatus);
    }
    const refreshed = loadStagedTreatment(currentItem.slug);
    if (refreshed) {
      setReviewFeedback(refreshed.reviewFeedback ?? null);
      setReviewedByEmail(refreshed.reviewedByEmail ?? null);
      setReviewedAt(refreshed.reviewedAt ?? null);
      setHistory(refreshed.history ?? []);
    }
  };

  const addBlock = (type: TreatmentBlockType = "symptoms") => {
    const label = BLOCK_TYPE_LABELS.find((b) => b.value === type)?.label ?? "Section";
    setBlocks([
      ...blocks,
      {
        id: `blk-${Date.now()}`,
        type,
        heading: label,
        body: "",
        bulletItems: [],
      },
    ]);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Treatments & procedures"
        description="Edit treatment pages using structured clinical sections without writing SQL or raw HTML."
      />

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
        previewUrl={`/${currentItem?.sectionSlug ?? "orthopaedics"}/${currentItem?.slug ?? ""}?preview=1`}
        onSaveDraft={() => void runTransition("draft")}
        onSubmitForReview={() => void runTransition("pending_approval")}
        onApprove={() => void runTransition("approved")}
        onReject={(fb) => void runTransition("rejected", fb)}
        onPublish={() => void runTransition("published")}
      />

      <div className="grid gap-6 lg:grid-cols-12">
        {/* Left: Treatment selector */}
        <aside className="rounded-xl border bg-card p-4 shadow-sm lg:col-span-4">
          <div className="mb-3 flex items-center gap-2">
            <Stethoscope size={16} className="text-primary" aria-hidden="true" />
            <h2 className="font-display text-sm font-bold text-foreground">Select Treatment Page</h2>
          </div>

          <ul className="max-h-[65vh] space-y-1.5 overflow-y-auto">
            {items.map((item) => {
              const active = item.slug === selectedSlug;
              const staged = loadStagedTreatment(item.slug);
              return (
                <li key={item.slug}>
                  <button
                    type="button"
                    onClick={() => setSelectedSlug(item.slug)}
                    className={`flex w-full items-center justify-between rounded-lg border px-3 py-2 text-left text-xs transition-colors ${
                      active ? "border-primary bg-primary/10 font-semibold text-primary" : "hover:bg-secondary/60"
                    }`}
                  >
                    <div>
                      <div className="text-foreground">{item.name}</div>
                      <div className="text-[10px] text-muted-foreground">{item.sectionDisplayName}</div>
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

        {/* Right: Structured Treatment Editor */}
        <div className="space-y-5 lg:col-span-8">
          <section className="rounded-xl border bg-card p-5 shadow-sm">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <h2 className="font-display text-base font-bold text-foreground">
                Page Header & Summary — {name}
              </h2>
              <button
                type="button"
                onClick={() => setShowLivePreview((v) => !v)}
                className="inline-flex items-center gap-1.5 rounded-lg border bg-secondary px-3 py-1.5 text-xs font-semibold text-foreground"
              >
                <Eye size={13} />
                {showLivePreview ? "Back to block editor" : "Toggle inline preview"}
              </button>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="treat-name" className="mb-1 block text-xs font-medium text-foreground">
                  Treatment Title
                </label>
                <input
                  id="treat-name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className={inputClass}
                />
              </div>

              <div>
                <label htmlFor="treat-hero-img" className="mb-1 block text-xs font-medium text-foreground">
                  Hero / Featured Illustration
                </label>
                <div className="flex gap-2">
                  <input
                    id="treat-hero-img"
                    type="text"
                    value={heroImageUrl}
                    onChange={(e) => setHeroImageUrl(e.target.value)}
                    placeholder="/images/treatments/..."
                    className={inputClass}
                  />
                  <button
                    type="button"
                    onClick={() => setPickerBlockIdx("hero")}
                    className="inline-flex shrink-0 items-center gap-1 rounded-lg border bg-secondary px-2.5 py-1.5 text-xs font-medium"
                  >
                    <ImageIcon size={13} /> Pick
                  </button>
                </div>
              </div>

              <div className="sm:col-span-2">
                <label htmlFor="treat-desc" className="mb-1 block text-xs font-medium text-foreground">
                  Lead Subtitle / Short Description
                </label>
                <textarea
                  id="treat-desc"
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className={inputClass}
                />
              </div>

              <div className="sm:col-span-2">
                <label htmlFor="treat-meta" className="mb-1 block text-xs font-medium text-foreground">
                  SEO Meta Description
                </label>
                <input
                  id="treat-meta"
                  type="text"
                  value={metaDescription}
                  onChange={(e) => setMetaDescription(e.target.value)}
                  className={inputClass}
                />
              </div>
            </div>
          </section>

          {showLivePreview ? (
            <section
              aria-label="Rendered treatment preview"
              className="rounded-xl border bg-card p-6 shadow-sm"
            >
              <span className="mb-2 inline-block rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                Sanitized HTML Preview
              </span>
              <h3 className="font-display text-2xl font-bold text-foreground">{name}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{description}</p>
              <hr className="my-4" />
              <div
                className="prose prose-sm max-w-none text-foreground"
                dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(compiledPreviewHtml) }}
              />
            </section>
          ) : (
            <section className="rounded-xl border bg-card p-5 shadow-sm">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h2 className="font-display text-base font-bold text-foreground">
                    Structured Clinical Sections
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    Add or edit sections below. They are automatically formatted into clean medical page HTML.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => addBlock("symptoms")}
                  className="inline-flex items-center gap-1 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground"
                >
                  <Plus size={13} /> Add clinical section
                </button>
              </div>

              <div className="space-y-4">
                {blocks.map((block, idx) => (
                  <div key={block.id} className="space-y-3 rounded-xl border bg-background p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <select
                        aria-label={`Section ${idx + 1} type`}
                        value={block.type}
                        onChange={(e) => {
                          const next = [...blocks];
                          next[idx] = { ...block, type: e.target.value as TreatmentBlockType };
                          setBlocks(next);
                        }}
                        className="rounded-lg border bg-card px-2.5 py-1.5 text-xs font-medium text-foreground"
                      >
                        {BLOCK_TYPE_LABELS.map((b) => (
                          <option key={b.value} value={b.value}>
                            {b.label}
                          </option>
                        ))}
                      </select>

                      {canDeleteBlock && blocks.length > 1 && (
                        <button
                          type="button"
                          onClick={() => setBlocks(blocks.filter((_, i) => i !== idx))}
                          aria-label={`Remove section ${block.heading}`}
                          className="inline-flex items-center gap-1 text-xs text-destructive hover:underline"
                        >
                          <Trash2 size={13} /> Remove section
                        </button>
                      )}
                    </div>

                    <div>
                      <label className="mb-1 block text-xs font-medium text-foreground">
                        Section Heading
                      </label>
                      <input
                        type="text"
                        aria-label={`Section ${idx + 1} heading`}
                        value={block.heading}
                        onChange={(e) => {
                          const next = [...blocks];
                          next[idx] = { ...block, heading: e.target.value };
                          setBlocks(next);
                        }}
                        className={inputClass}
                      />
                    </div>

                    {block.type === "image" && (
                      <div className="grid gap-3 sm:grid-cols-2">
                        <div>
                          <label className="mb-1 block text-xs font-medium text-foreground">Image URL</label>
                          <div className="flex gap-2">
                            <input
                              type="text"
                              value={block.imageUrl ?? ""}
                              onChange={(e) => {
                                const next = [...blocks];
                                next[idx] = { ...block, imageUrl: e.target.value };
                                setBlocks(next);
                              }}
                              className={inputClass}
                            />
                            <button
                              type="button"
                              onClick={() => setPickerBlockIdx(idx)}
                              className="inline-flex shrink-0 items-center gap-1 rounded-lg border bg-secondary px-2.5 py-1.5 text-xs font-medium"
                            >
                              <ImageIcon size={12} /> Media
                            </button>
                          </div>
                        </div>
                        <div>
                          <label className="mb-1 block text-xs font-medium text-foreground">Image Alt Text</label>
                          <input
                            type="text"
                            value={block.imageAlt ?? ""}
                            onChange={(e) => {
                              const next = [...blocks];
                              next[idx] = { ...block, imageAlt: e.target.value };
                              setBlocks(next);
                            }}
                            className={inputClass}
                          />
                        </div>
                      </div>
                    )}

                    <div>
                      <label className="mb-1 block text-xs font-medium text-foreground">
                        Paragraph Content
                      </label>
                      <textarea
                        rows={3}
                        aria-label={`Section ${idx + 1} body`}
                        value={block.body}
                        onChange={(e) => {
                          const next = [...blocks];
                          next[idx] = { ...block, body: e.target.value };
                          setBlocks(next);
                        }}
                        className={inputClass}
                      />
                    </div>

                    <div>
                      <label className="mb-1 block text-xs font-medium text-foreground">
                        Key Bullet Points (one per line, optional)
                      </label>
                      <textarea
                        rows={2}
                        aria-label={`Section ${idx + 1} bullet points`}
                        value={block.bulletItems.join("\n")}
                        onChange={(e) => {
                          const next = [...blocks];
                          next[idx] = { ...block, bulletItems: e.target.value.split("\n") };
                          setBlocks(next);
                        }}
                        className={inputClass}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      </div>

      <MediaPickerModal
        open={pickerBlockIdx !== null}
        onClose={() => setPickerBlockIdx(null)}
        allowedTypes={["image"]}
        defaultCategory="treatments"
        onSelect={(asset) => {
          if (pickerBlockIdx === "hero") {
            setHeroImageUrl(asset.publicUrl);
          } else if (typeof pickerBlockIdx === "number") {
            const next = [...blocks];
            next[pickerBlockIdx] = {
              ...next[pickerBlockIdx],
              imageUrl: asset.publicUrl,
              imageAlt: asset.altText || next[pickerBlockIdx].heading,
            };
            setBlocks(next);
          }
          setPickerBlockIdx(null);
        }}
      />
    </div>
  );
}
