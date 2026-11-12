import { useEffect, useState } from "react";
import {
  ArrowUp,
  ArrowDown,
  Eye,
  EyeOff,
  Image as ImageIcon,
  Video,
  Plus,
  Trash2,
  LayoutTemplate,
} from "lucide-react";
import { PageHeader } from "@/components/admin/states";
import { DraftPublishBar } from "@/components/admin/DraftPublishBar";
import { MediaPickerModal } from "@/components/admin/MediaPickerModal";
import { useAuth } from "@/contexts/AuthContext";
import {
  DEFAULT_HOME_CONTENT,
  moveSectionOrder,
  toggleSectionVisibility,
  type ApprovalHistoryEntry,
  type HomePageContent,
  type HomeSectionId,
  type WorkflowStatus,
} from "@/lib/cms/types";
import { loadHomePageRecord, transitionHomePageWorkflow } from "@/lib/cms/repository";

const inputClass =
  "w-full rounded-lg border bg-background px-3.5 py-2 text-xs text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20";

export default function AdminPages() {
  const { user, role, can } = useAuth();
  const canSubmitReview = can("content.submit_review");
  const canApprove = can("content.approve");
  const canPublish = can("content.publish");
  const canDeleteSectionItem = can("section.delete");

  const [form, setForm] = useState<HomePageContent>(DEFAULT_HOME_CONTENT);
  const [workflowStatus, setWorkflowStatus] = useState<WorkflowStatus>("published");
  const [reviewFeedback, setReviewFeedback] = useState<string | null>(null);
  const [reviewedByEmail, setReviewedByEmail] = useState<string | null>(null);
  const [reviewedAt, setReviewedAt] = useState<string | null>(null);
  const [history, setHistory] = useState<ApprovalHistoryEntry[]>([]);
  const [schemaReady, setSchemaReady] = useState(true);
  const [busy, setBusy] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<HomeSectionId>("hero");
  const [pickerTarget, setPickerTarget] = useState<"hero" | "video" | null>(null);

  useEffect(() => {
    void loadHomePageRecord().then((rec) => {
      setForm(rec.draft ?? rec.published);
      setWorkflowStatus(rec.workflowStatus);
      setReviewFeedback(rec.reviewFeedback);
      setReviewedByEmail(rec.reviewedByEmail);
      setReviewedAt(rec.reviewedAt);
      setHistory(rec.history);
      setSchemaReady(rec.schemaReady);
    });
  }, []);

  const runTransition = async (targetStatus: WorkflowStatus, feedback?: string) => {
    setBusy(true);
    setStatusMessage(null);
    const res = await transitionHomePageWorkflow({
      draftContent: form,
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
    const refreshed = await loadHomePageRecord();
    setReviewFeedback(refreshed.reviewFeedback);
    setReviewedByEmail(refreshed.reviewedByEmail);
    setReviewedAt(refreshed.reviewedAt);
    setHistory(refreshed.history);
  };

  const sortedSections = [...form.sectionsOrder].sort((a, b) => a.sortOrder - b.sortOrder);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Pages & homepage sections"
        description="Edit homepage headings, paragraphs, specialties, procedures, Why Choose Us cards, video testimonial, and section order."
      />

      {!schemaReady && (
        <div role="status" className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3.5 text-xs text-amber-800 dark:text-amber-300">
          <strong>Database status:</strong> Draft saving, approval workflow transitions, and authenticated <code className="font-mono">/?preview=1</code> previews work immediately in session. Permanent database persistence to <code className="font-mono">public.cms_pages</code> awaits Migration 004 approval.
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
        previewUrl="/?preview=1"
        onSaveDraft={() => void runTransition("draft")}
        onSubmitForReview={() => void runTransition("pending_approval")}
        onApprove={() => void runTransition("approved")}
        onReject={(fb) => void runTransition("rejected", fb)}
        onPublish={() => void runTransition("published")}
      />

      <div className="grid gap-6 lg:grid-cols-12">
        {/* Left column: Section Order & Visibility Manager */}
        <section
          aria-label="Homepage section order and visibility"
          className="rounded-xl border bg-card p-4 shadow-sm lg:col-span-4"
        >
          <div className="mb-3 flex items-center gap-2">
            <LayoutTemplate size={16} className="text-primary" aria-hidden="true" />
            <h2 className="font-display text-sm font-bold text-foreground">Homepage Sections Order</h2>
          </div>
          <p className="mb-3 text-xs text-muted-foreground">
            Click a section to edit its text, or use the arrows and eye icon to reorder or hide sections.
          </p>

          <ul className="space-y-2">
            {sortedSections.map((sec, idx) => {
              const isSelected = activeTab === sec.id;
              return (
                <li
                  key={sec.id}
                  className={`flex items-center justify-between gap-2 rounded-lg border p-2.5 text-xs transition-colors ${
                    isSelected ? "border-primary bg-primary/5" : "bg-background"
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => setActiveTab(sec.id)}
                    className="flex flex-1 items-center gap-2 text-left font-medium text-foreground"
                  >
                    <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-secondary text-[11px] font-bold">
                      {idx + 1}
                    </span>
                    <span className={!sec.visible ? "line-through text-muted-foreground" : ""}>
                      {sec.label}
                    </span>
                  </button>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      disabled={idx === 0}
                      onClick={() =>
                        setForm({
                          ...form,
                          sectionsOrder: moveSectionOrder(form.sectionsOrder, sec.id, "up"),
                        })
                      }
                      aria-label={`Move ${sec.label} up`}
                      className="rounded p-1 text-muted-foreground hover:bg-secondary hover:text-foreground disabled:opacity-30"
                    >
                      <ArrowUp size={13} />
                    </button>
                    <button
                      type="button"
                      disabled={idx === sortedSections.length - 1}
                      onClick={() =>
                        setForm({
                          ...form,
                          sectionsOrder: moveSectionOrder(form.sectionsOrder, sec.id, "down"),
                        })
                      }
                      aria-label={`Move ${sec.label} down`}
                      className="rounded p-1 text-muted-foreground hover:bg-secondary hover:text-foreground disabled:opacity-30"
                    >
                      <ArrowDown size={13} />
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setForm({
                          ...form,
                          sectionsOrder: toggleSectionVisibility(form.sectionsOrder, sec.id),
                        })
                      }
                      aria-label={sec.visible ? `Hide ${sec.label}` : `Show ${sec.label}`}
                      className="rounded p-1 text-muted-foreground hover:bg-secondary hover:text-foreground"
                    >
                      {sec.visible ? <Eye size={13} /> : <EyeOff size={13} />}
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>

        {/* Right column: Active Section Form */}
        <section className="rounded-xl border bg-card p-5 shadow-sm lg:col-span-8">
          {activeTab === "hero" && (
            <div className="space-y-4">
              <h2 className="font-display text-base font-bold text-foreground">Hero Banner Content</h2>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label htmlFor="hero-badge" className="mb-1 block text-xs font-medium text-foreground">
                    Top Badge Text
                  </label>
                  <input
                    id="hero-badge"
                    type="text"
                    value={form.hero.badge}
                    onChange={(e) => setForm({ ...form, hero: { ...form.hero, badge: e.target.value } })}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label htmlFor="hero-prefix" className="mb-1 block text-xs font-medium text-foreground">
                    Main Heading (First Line)
                  </label>
                  <input
                    id="hero-prefix"
                    type="text"
                    value={form.hero.headingPrefix}
                    onChange={(e) => setForm({ ...form, hero: { ...form.hero, headingPrefix: e.target.value } })}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label htmlFor="hero-highlight" className="mb-1 block text-xs font-medium text-foreground">
                    Highlighted Gold Phrase
                  </label>
                  <input
                    id="hero-highlight"
                    type="text"
                    value={form.hero.headingHighlight}
                    onChange={(e) => setForm({ ...form, hero: { ...form.hero, headingHighlight: e.target.value } })}
                    className={inputClass}
                  />
                </div>
                <div className="sm:col-span-2">
                  <label htmlFor="hero-p1" className="mb-1 block text-xs font-medium text-foreground">
                    Primary Lead Paragraph
                  </label>
                  <textarea
                    id="hero-p1"
                    rows={2}
                    value={form.hero.primaryParagraph}
                    onChange={(e) => setForm({ ...form, hero: { ...form.hero, primaryParagraph: e.target.value } })}
                    className={inputClass}
                  />
                </div>
                <div className="sm:col-span-2">
                  <label htmlFor="hero-p2" className="mb-1 block text-xs font-medium text-foreground">
                    Secondary Trust Paragraph
                  </label>
                  <textarea
                    id="hero-p2"
                    rows={2}
                    value={form.hero.secondaryParagraph}
                    onChange={(e) => setForm({ ...form, hero: { ...form.hero, secondaryParagraph: e.target.value } })}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label htmlFor="hero-cta1" className="mb-1 block text-xs font-medium text-foreground">
                    Primary Button Label
                  </label>
                  <input
                    id="hero-cta1"
                    type="text"
                    value={form.hero.primaryCtaLabel}
                    onChange={(e) => setForm({ ...form, hero: { ...form.hero, primaryCtaLabel: e.target.value } })}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label htmlFor="hero-cta2" className="mb-1 block text-xs font-medium text-foreground">
                    Secondary Button Label
                  </label>
                  <input
                    id="hero-cta2"
                    type="text"
                    value={form.hero.secondaryCtaLabel}
                    onChange={(e) => setForm({ ...form, hero: { ...form.hero, secondaryCtaLabel: e.target.value } })}
                    className={inputClass}
                  />
                </div>
                <div className="sm:col-span-2">
                  <label htmlFor="hero-image-override" className="mb-1 block text-xs font-medium text-foreground">
                    Hero Image Override (optional — defaults to Doctor Profile photo)
                  </label>
                  <div className="flex gap-2">
                    <input
                      id="hero-image-override"
                      type="text"
                      value={form.hero.heroImageUrl ?? ""}
                      onChange={(e) => setForm({ ...form, hero: { ...form.hero, heroImageUrl: e.target.value } })}
                      className={inputClass}
                    />
                    <button
                      type="button"
                      onClick={() => setPickerTarget("hero")}
                      className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border bg-secondary px-3 py-2 text-xs font-semibold text-foreground"
                    >
                      <ImageIcon size={13} /> Media Library
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === "stats" && (
            <div className="space-y-3">
              <h2 className="font-display text-base font-bold text-foreground">Clinic Statistics Strip</h2>
              <p className="text-xs text-muted-foreground">
                The numbers displayed here (Years Experience, Happy Patients, Surgeries Completed, Branches) are pulled automatically from the Doctor Profile and Clinic Information modules so they stay consistent across the entire website.
              </p>
            </div>
          )}

          {activeTab === "specialties" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="font-display text-base font-bold text-foreground">Our Specialties Section</h2>
                <button
                  type="button"
                  onClick={() =>
                    setForm({
                      ...form,
                      specialties: {
                        ...form.specialties,
                        items: [
                          ...form.specialties.items,
                          { icon: "Bone", title: "New Specialty", description: "Description…" },
                        ],
                      },
                    })
                  }
                  className="inline-flex items-center gap-1 rounded-lg border px-3 py-1.5 text-xs font-semibold text-primary hover:bg-secondary"
                >
                  <Plus size={13} /> Add specialty card
                </button>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label htmlFor="spec-eyebrow" className="mb-1 block text-xs font-medium text-foreground">
                    Section Eyebrow
                  </label>
                  <input
                    id="spec-eyebrow"
                    type="text"
                    value={form.specialties.eyebrow}
                    onChange={(e) =>
                      setForm({ ...form, specialties: { ...form.specialties, eyebrow: e.target.value } })
                    }
                    className={inputClass}
                  />
                </div>
                <div>
                  <label htmlFor="spec-heading" className="mb-1 block text-xs font-medium text-foreground">
                    Section Heading
                  </label>
                  <input
                    id="spec-heading"
                    type="text"
                    value={form.specialties.heading}
                    onChange={(e) =>
                      setForm({ ...form, specialties: { ...form.specialties, heading: e.target.value } })
                    }
                    className={inputClass}
                  />
                </div>
              </div>

              <div className="space-y-2.5">
                {form.specialties.items.map((item, idx) => (
                  <div key={idx} className="rounded-lg border bg-background p-3">
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <input
                        type="text"
                        aria-label={`Specialty ${idx + 1} title`}
                        value={item.title}
                        onChange={(e) => {
                          const next = [...form.specialties.items];
                          next[idx] = { ...item, title: e.target.value };
                          setForm({ ...form, specialties: { ...form.specialties, items: next } });
                        }}
                        className={`${inputClass} font-semibold`}
                      />
                      {canDeleteSectionItem && (
                        <button
                          type="button"
                          onClick={() =>
                            setForm({
                              ...form,
                              specialties: {
                                ...form.specialties,
                                items: form.specialties.items.filter((_, i) => i !== idx),
                              },
                            })
                          }
                          aria-label={`Delete specialty ${item.title}`}
                          className="p-1.5 text-muted-foreground hover:text-destructive"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                    <textarea
                      rows={2}
                      aria-label={`Specialty ${idx + 1} description`}
                      value={item.description}
                      onChange={(e) => {
                        const next = [...form.specialties.items];
                        next[idx] = { ...item, description: e.target.value };
                        setForm({ ...form, specialties: { ...form.specialties, items: next } });
                      }}
                      className={inputClass}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === "procedures" && (
            <div className="space-y-4">
              <h2 className="font-display text-base font-bold text-foreground">Featured Procedures Section</h2>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label htmlFor="proc-eyebrow" className="mb-1 block text-xs font-medium text-foreground">
                    Section Eyebrow
                  </label>
                  <input
                    id="proc-eyebrow"
                    type="text"
                    value={form.procedures.eyebrow}
                    onChange={(e) =>
                      setForm({ ...form, procedures: { ...form.procedures, eyebrow: e.target.value } })
                    }
                    className={inputClass}
                  />
                </div>
                <div>
                  <label htmlFor="proc-heading" className="mb-1 block text-xs font-medium text-foreground">
                    Section Heading
                  </label>
                  <input
                    id="proc-heading"
                    type="text"
                    value={form.procedures.heading}
                    onChange={(e) =>
                      setForm({ ...form, procedures: { ...form.procedures, heading: e.target.value } })
                    }
                    className={inputClass}
                  />
                </div>
              </div>
              <div className="space-y-2.5">
                {form.procedures.items.map((item, idx) => (
                  <div key={idx} className="rounded-lg border bg-background p-3">
                    <input
                      type="text"
                      aria-label={`Procedure ${idx + 1} title`}
                      value={item.title}
                      onChange={(e) => {
                        const next = [...form.procedures.items];
                        next[idx] = { ...item, title: e.target.value };
                        setForm({ ...form, procedures: { ...form.procedures, items: next } });
                      }}
                      className={`${inputClass} mb-2 font-semibold`}
                    />
                    <textarea
                      rows={2}
                      aria-label={`Procedure ${idx + 1} description`}
                      value={item.description}
                      onChange={(e) => {
                        const next = [...form.procedures.items];
                        next[idx] = { ...item, description: e.target.value };
                        setForm({ ...form, procedures: { ...form.procedures, items: next } });
                      }}
                      className={inputClass}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === "why_choose" && (
            <div className="space-y-4">
              <h2 className="font-display text-base font-bold text-foreground">Why Choose Us Section</h2>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label htmlFor="why-eyebrow" className="mb-1 block text-xs font-medium text-foreground">
                    Section Eyebrow
                  </label>
                  <input
                    id="why-eyebrow"
                    type="text"
                    value={form.whyChoose.eyebrow}
                    onChange={(e) =>
                      setForm({ ...form, whyChoose: { ...form.whyChoose, eyebrow: e.target.value } })
                    }
                    className={inputClass}
                  />
                </div>
                <div>
                  <label htmlFor="why-heading" className="mb-1 block text-xs font-medium text-foreground">
                    Section Heading
                  </label>
                  <input
                    id="why-heading"
                    type="text"
                    value={form.whyChoose.heading}
                    onChange={(e) =>
                      setForm({ ...form, whyChoose: { ...form.whyChoose, heading: e.target.value } })
                    }
                    className={inputClass}
                  />
                </div>
              </div>
              <div className="space-y-2.5">
                {form.whyChoose.items.map((item, idx) => (
                  <div key={idx} className="rounded-lg border bg-background p-3">
                    <input
                      type="text"
                      aria-label={`Why choose card ${idx + 1} title`}
                      value={item.title}
                      onChange={(e) => {
                        const next = [...form.whyChoose.items];
                        next[idx] = { ...item, title: e.target.value };
                        setForm({ ...form, whyChoose: { ...form.whyChoose, items: next } });
                      }}
                      className={`${inputClass} mb-2 font-semibold`}
                    />
                    <textarea
                      rows={2}
                      aria-label={`Why choose card ${idx + 1} description`}
                      value={item.description}
                      onChange={(e) => {
                        const next = [...form.whyChoose.items];
                        next[idx] = { ...item, description: e.target.value };
                        setForm({ ...form, whyChoose: { ...form.whyChoose, items: next } });
                      }}
                      className={inputClass}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === "testimonials" && (
            <div className="space-y-4">
              <h2 className="font-display text-base font-bold text-foreground">
                Testimonials Header & Video Testimonial
              </h2>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="test-eyebrow" className="mb-1 block text-xs font-medium text-foreground">
                    Section Eyebrow
                  </label>
                  <input
                    id="test-eyebrow"
                    type="text"
                    value={form.testimonials.eyebrow}
                    onChange={(e) =>
                      setForm({ ...form, testimonials: { ...form.testimonials, eyebrow: e.target.value } })
                    }
                    className={inputClass}
                  />
                </div>
                <div>
                  <label htmlFor="test-heading" className="mb-1 block text-xs font-medium text-foreground">
                    Section Heading
                  </label>
                  <input
                    id="test-heading"
                    type="text"
                    value={form.testimonials.heading}
                    onChange={(e) =>
                      setForm({ ...form, testimonials: { ...form.testimonials, heading: e.target.value } })
                    }
                    className={inputClass}
                  />
                </div>
                <div className="sm:col-span-2">
                  <label htmlFor="test-video-url" className="mb-1 block text-xs font-medium text-foreground">
                    Featured Patient Video URL
                  </label>
                  <div className="flex gap-2">
                    <input
                      id="test-video-url"
                      type="text"
                      value={form.testimonials.videoUrl}
                      onChange={(e) =>
                        setForm({ ...form, testimonials: { ...form.testimonials, videoUrl: e.target.value } })
                      }
                      className={inputClass}
                    />
                    <button
                      type="button"
                      onClick={() => setPickerTarget("video")}
                      className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border bg-secondary px-3 py-2 text-xs font-semibold text-foreground"
                    >
                      <Video size={13} /> Choose Video
                    </button>
                  </div>
                </div>
                <div className="sm:col-span-2">
                  <label htmlFor="test-video-caption" className="mb-1 block text-xs font-medium text-foreground">
                    Video Caption
                  </label>
                  <input
                    id="test-video-caption"
                    type="text"
                    value={form.testimonials.videoCaption}
                    onChange={(e) =>
                      setForm({ ...form, testimonials: { ...form.testimonials, videoCaption: e.target.value } })
                    }
                    className={inputClass}
                  />
                </div>
              </div>
            </div>
          )}

          {activeTab === "cta" && (
            <div className="space-y-4">
              <h2 className="font-display text-base font-bold text-foreground">Bottom Call-to-Action Banner</h2>
              <div className="space-y-3">
                <div>
                  <label htmlFor="cta-heading" className="mb-1 block text-xs font-medium text-foreground">
                    CTA Heading
                  </label>
                  <input
                    id="cta-heading"
                    type="text"
                    value={form.cta.heading}
                    onChange={(e) => setForm({ ...form, cta: { ...form.cta, heading: e.target.value } })}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label htmlFor="cta-desc" className="mb-1 block text-xs font-medium text-foreground">
                    Supporting Text
                  </label>
                  <input
                    id="cta-desc"
                    type="text"
                    value={form.cta.description}
                    onChange={(e) => setForm({ ...form, cta: { ...form.cta, description: e.target.value } })}
                    className={inputClass}
                  />
                </div>
              </div>
            </div>
          )}
        </section>
      </div>

      <MediaPickerModal
        open={pickerTarget !== null}
        onClose={() => setPickerTarget(null)}
        allowedTypes={pickerTarget === "video" ? ["video"] : ["image"]}
        defaultCategory={pickerTarget === "video" ? "testimonials" : "hero"}
        onSelect={(asset) => {
          if (pickerTarget === "hero") {
            setForm({ ...form, hero: { ...form.hero, heroImageUrl: asset.publicUrl } });
          } else if (pickerTarget === "video") {
            setForm({ ...form, testimonials: { ...form.testimonials, videoUrl: asset.publicUrl } });
          }
          setPickerTarget(null);
        }}
      />
    </div>
  );
}
