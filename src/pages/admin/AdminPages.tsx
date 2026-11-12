import { useEffect, useState } from "react";
import { ArrowDown, ArrowUp, Eye, EyeOff, FileText, HelpCircle, LayoutTemplate, Plus, Sparkles, Trash2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { PageHeader } from "@/components/admin/states";
import { DraftPublishBar } from "@/components/admin/DraftPublishBar";
import RichTextEditor from "@/components/admin/RichTextEditor";
import { useToast } from "@/hooks/use-toast";
import {
  DEFAULT_HOME_CONTENT,
  DEFAULT_SITE_PAGES_CONTENT,
  SITE_PAGE_CATALOG,
  moveSectionOrder,
  toggleSectionVisibility,
  type ApprovalHistoryEntry,
  type HomePageContent,
  type HomeSectionId,
  type MediaAsset,
  type SitePageContent,
  type SitePageSlug,
  type WorkflowStatus,
} from "@/lib/cms/types";
import {
  listMediaAssets,
  loadHomePageRecord,
  loadSitePageRecord,
  transitionHomePageWorkflow,
  transitionSitePageWorkflow,
} from "@/lib/cms/repository";

const CUSTOM_LABEL_TITLES: Record<string, string> = {
  meetPrefix: "Hero Title Prefix (e.g. Meet)",
  philosophyHeading: "Philosophy Section Heading",
  educationHeading: "Education Section Heading",
  awardsHeading: "Awards Section Heading",
  membershipsHeading: "Memberships Section Heading",
  ConditionsCountSuffix: "Conditions Count Label",
  learnMoreLabel: "Card Link Text (e.g. Learn more)",
  searchPlaceholder: "Search Input Placeholder",
  bookButtonLabel: "Book Service Button Text",
  appointmentTypes: "Appointment Type Options (comma-separated)",
  confirmationHeading: "Booking Confirmation Heading",
  confirmationNote: "Booking Confirmation Subtext",
  whatsappConfirmLabel: "WhatsApp Confirmation Button Text",
  insuranceHeading: "Insurance Section Heading",
  getInTouchHeading: "Contact Info Section Heading",
  formHeading: "Form Section Heading",
  submitButtonLabel: "Form Submit Button Text",
  successHeading: "Submission Success Heading",
  successDescription: "Submission Success Message",
  openInMapsLabel: "Open in Google Maps Link Text",
  conditionOptions: "Surgery Condition Dropdown Options (comma-separated)",
   whatsappFollowupLabel: "WhatsApp Follow-up Button Text",
  featuredBadgeLabel: "Featured Post Badge Text",
  emptyStateText: "Empty State Message",
  painScoreLabel: "Pain Score Card Title",
  romLabel: "Range of Motion Card Title",
  recoveryTimelineHeading: "Recovery Timeline Heading",
  loadingText: "Loading Message",
  emiBadgeLabel: "EMI Badge Text",
  notFoundHeading: "Not-Found Heading",
  backHomeLabel: "Back-to-Home Link Text",
  comingSoonText: "Empty Section Message",
  subsectionNotFoundHeading: "Treatment Page: Not-Found Heading",
  subsectionComingSoonHeading: "Treatment Page: Coming-Soon Heading",
  subsectionBookLabel: "Treatment Page: Book Button Text",
  subsectionBookLink: "Treatment Page: Book Button Link",
  subsectionContactLabel: "Treatment Page: Contact Button Text",
  subsectionContactLink: "Treatment Page: Contact Button Link",
  featuredHeading: "Featured Section Heading",
  moreHeading: "More Articles Heading",
  relatedHeading: "Related Articles Heading",
  backLabel: "Back Link Text",
  authorTitle: "Author Title Under Doctor Name",
  painBeforeLabel: "Pain Before Label",
  painAfterLabel: "Pain After Label",
  readMoreLabel: "Card Link Text",
  ageGenderLabel: "Age / Gender Label",
  hospitalStayLabel: "Hospital Stay Label",
  followUpLabel: "Follow-Up Label",
  outcomeHeading: "Outcome Summary Heading",
  returnToWorkLabel: "Return to Work Label",
  returnToActivitiesLabel: "Return to Activities Label",
  successMessage: "Success Message",
  firstNameLabel: "First Name Label",
  lastNameLabel: "Last Name Label",
  phoneLabel: "Form text: phone (leave empty for the built-in translated text)",
  phonePlaceholder: "Phone Placeholder",
  appointmentTypeLabel: "Appointment Type Label",
  selectTypePlaceholder: "Appointment Type Placeholder",
  serviceLabel: "Service Label",
  selectServicePlaceholder: "Service Placeholder",
  dateLabel: "Preferred Date Label",
  timeLabel: "Preferred Time Label",
  selectTimePlaceholder: "Time Placeholder",
  symptomsLabel: "Symptoms Label",
  symptomsPlaceholder: "Symptoms Placeholder",
  insuranceLabel: "Insurance Label",
  insuranceNoneOption: "No-Insurance Option",
  emiCheckboxLabel: "EMI Checkbox Text",
  callDirectlyLabel: "Call-Directly Text",
  whatsappButtonLabel: "WhatsApp Button Text",
  mapTitle: "Map Title (screen readers)",
  nameLabel: "Form text: name (leave empty for the built-in translated text)",
  emailLabel: "Form text: email (leave empty for the built-in translated text)",
  subjectLabel: "Subject Label",
  messageLabel: "Message Label",
  submittingLabel: "Submitting Button Text",
  successNoteLabel: "Form text: success note (leave empty for the built-in translated text)",
  ageLabel: "Form text: age (leave empty for the built-in translated text)",
  conditionLabel: "Form text: condition (leave empty for the built-in translated text)",
  selectConditionLabel: "Form text: select condition (leave empty for the built-in translated text)",
  currentDiagnosisLabel: "Form text: current diagnosis (leave empty for the built-in translated text)",
  diagnosisPlaceholderLabel: "Form text: diagnosis placeholder (leave empty for the built-in translated text)",
  uploadReportsLabel: "Form text: upload reports (leave empty for the built-in translated text)",
  uploadHintLabel: "Form text: upload hint (leave empty for the built-in translated text)",
  chooseFilesLabel: "Form text: choose files (leave empty for the built-in translated text)",
  fileTypesLabel: "Form text: file types (leave empty for the built-in translated text)",
  additionalNotesLabel: "Form text: additional notes (leave empty for the built-in translated text)",
  submitLabel: "Form text: submit (leave empty for the built-in translated text)",
  privacyLabel: "Form text: privacy (leave empty for the built-in translated text)",
};

export default function AdminPages() {
  const { user, role, can } = useAuth();
  const { toast } = useToast();
  const canPublish = can("content.publish");
  const canApprove = can("content.approve");
  const canSubmitReview = can("content.submit_review");

  const [selectedSlug, setSelectedSlug] = useState<"home" | SitePageSlug>("home");
  const [mediaAssets, setMediaAssets] = useState<MediaAsset[]>([]);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // Homepage state
  const [content, setContent] = useState<HomePageContent>(DEFAULT_HOME_CONTENT);
  const [workflowStatus, setWorkflowStatus] = useState<WorkflowStatus>("published");
  const [reviewFeedback, setReviewFeedback] = useState<string | null>(null);
  const [reviewedByEmail, setReviewedByEmail] = useState<string | null>(null);
  const [reviewedAt, setReviewedAt] = useState<string | null>(null);
  const [history, setHistory] = useState<ApprovalHistoryEntry[]>([]);
  const [schemaReady, setSchemaReady] = useState(false);

  // Secondary public page state (`SitePageSlug`)
  const [sitePage, setSitePage] = useState<SitePageContent>(DEFAULT_SITE_PAGES_CONTENT.about);
  const [sitePageStatus, setSitePageStatus] = useState<WorkflowStatus>("published");
  const [sitePageFeedback, setSitePageFeedback] = useState<string | null>(null);
  const [sitePageReviewedBy, setSitePageReviewedBy] = useState<string | null>(null);
  const [sitePageReviewedAt, setSitePageReviewedAt] = useState<string | null>(null);
  const [sitePageHistory, setSitePageHistory] = useState<ApprovalHistoryEntry[]>([]);

  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void listMediaAssets().then((res) => setMediaAssets(res.assets));
  }, []);

  useEffect(() => {
    let active = true;
    setDirty(false);

    if (selectedSlug === "home") {
      loadHomePageRecord().then((rec) => {
        if (!active) return;
        setContent(rec.draft ?? rec.published);
        setWorkflowStatus(rec.workflowStatus);
        setReviewFeedback(rec.reviewFeedback);
        setReviewedByEmail(rec.reviewedByEmail);
        setReviewedAt(rec.reviewedAt);
        setHistory(rec.history);
        setSchemaReady(rec.schemaReady);
      });
    } else {
      loadSitePageRecord(selectedSlug).then((rec) => {
        if (!active) return;
        setSitePage(rec.draft ?? rec.published);
        setSitePageStatus(rec.workflowStatus);
        setSitePageFeedback(rec.reviewFeedback);
        setSitePageReviewedBy(rec.reviewedByEmail);
        setSitePageReviewedAt(rec.reviewedAt);
        setSitePageHistory(rec.history);
        setSchemaReady(rec.schemaReady);
      });
    }

    return () => {
      active = false;
    };
  }, [selectedSlug]);

  const updateContent = (updater: (prev: HomePageContent) => HomePageContent) => {
    setContent((prev) => updater(prev));
    setDirty(true);
  };

  const updateSitePage = (updater: (prev: SitePageContent) => SitePageContent) => {
    setSitePage((prev) => updater(prev));
    setDirty(true);
  };

  const handleMove = (id: HomeSectionId, dir: "up" | "down") => {
    updateContent((prev) => ({
      ...prev,
      sectionsOrder: moveSectionOrder(prev.sectionsOrder, id, dir),
    }));
  };

  const handleToggleVisibility = (id: HomeSectionId) => {
    updateContent((prev) => ({
      ...prev,
      sectionsOrder: toggleSectionVisibility(prev.sectionsOrder, id),
    }));
  };

  const runTransition = async (targetStatus: WorkflowStatus, feedback?: string) => {
    setBusy(true);
    setStatusMessage(null);
    try {
      if (selectedSlug === "home") {
        const res = await transitionHomePageWorkflow({
          draftContent: content,
          targetStatus,
          actorEmail: user?.email ?? "unknown",
          actorRole: role ?? "editor",
          canPublish,
          feedback,
        });

        setStatusMessage(res.message);
        if (!res.ok) {
          toast({ title: "Action blocked", description: res.message, variant: "destructive" });
          return;
        }

        const refreshed = await loadHomePageRecord();
        setWorkflowStatus(refreshed.workflowStatus);
        setReviewFeedback(refreshed.reviewFeedback);
        setReviewedByEmail(refreshed.reviewedByEmail);
        setReviewedAt(refreshed.reviewedAt);
        setHistory(refreshed.history);
        setDirty(false);
        toast({ title: "Workflow updated", description: res.message });
      } else {
        const res = await transitionSitePageWorkflow({
          slug: selectedSlug,
          draftContent: sitePage,
          targetStatus,
          actorEmail: user?.email ?? "unknown",
          actorRole: role ?? "editor",
          canPublish,
          feedback,
        });

        setStatusMessage(res.message);
        if (!res.ok) {
          toast({ title: "Action blocked", description: res.message, variant: "destructive" });
          return;
        }

        const refreshed = await loadSitePageRecord(selectedSlug);
        setSitePageStatus(refreshed.workflowStatus);
        setSitePageFeedback(refreshed.reviewFeedback);
        setSitePageReviewedBy(refreshed.reviewedByEmail);
        setSitePageReviewedAt(refreshed.reviewedAt);
        setSitePageHistory(refreshed.history);
        setDirty(false);
        toast({ title: "Workflow updated", description: res.message });
      }
    } finally {
      setBusy(false);
    }
  };

  const sortedSections = [...content.sectionsOrder].sort((a, b) => a.sortOrder - b.sortOrder);
  const currentCatalogEntry = SITE_PAGE_CATALOG.find((p) => p.slug === selectedSlug) ?? SITE_PAGE_CATALOG[0];
  const imageAssets = mediaAssets.filter((m) => m.mediaType === "image");

  return (
    <div className="space-y-6">
      <PageHeader
        title="Pages & Homepage Sections"
        description="Edit text, headings, buttons, rich content, FAQs, and media across every public page on OrthoCare Hub. Editors save drafts and submit for review; Super Admins approve and publish."
      />

      {/* Website-Wide Page Selector */}
      <section aria-label="Select website page to edit" className="rounded-xl border bg-card p-5 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <FileText size={18} className="text-primary" />
            <h2 className="font-display text-base font-semibold text-foreground">
              Select Website Page ({SITE_PAGE_CATALOG.length} Public Pages)
            </h2>
          </div>
          <span className="text-xs text-muted-foreground">
            Route: <code className="rounded bg-secondary px-1.5 py-0.5 font-mono text-foreground">{currentCatalogEntry.routePath}</code>
          </span>
        </div>
        <div className="flex flex-wrap gap-2">
          {SITE_PAGE_CATALOG.map((entry) => {
            const isActive = entry.slug === selectedSlug;
            return (
              <button
                key={entry.slug}
                type="button"
                onClick={() => setSelectedSlug(entry.slug)}
                className={`rounded-lg px-3 py-2 text-xs font-medium transition-all border ${
                  isActive
                    ? "bg-primary text-primary-foreground border-primary shadow-sm"
                    : "bg-background text-foreground hover:bg-secondary border-border"
                }`}
              >
                {entry.label}
              </button>
            );
          })}
        </div>
        <p className="text-xs text-muted-foreground">{currentCatalogEntry.description}</p>
      </section>

      {selectedSlug === "home" ? (
        <>
          <DraftPublishBar
            workflowStatus={workflowStatus}
            busy={busy}
            canSubmitReview={canSubmitReview}
            canApprove={canApprove}
            canPublish={canPublish}
            statusMessage={statusMessage}
            previewUrl="/?preview=1"
            reviewFeedback={reviewFeedback}
            reviewedByEmail={reviewedByEmail}
            reviewedAt={reviewedAt}
            history={history}
            onSaveDraft={() => void runTransition("draft")}
            onSubmitForReview={() => void runTransition("pending_approval")}
            onApprove={() => void runTransition("approved")}
            onReject={(reason) => void runTransition("rejected", reason)}
            onPublish={() => void runTransition("published")}
          />

          <div className="grid gap-6 lg:grid-cols-3">
            {/* Left column: Section Order & Visibility */}
            <section aria-label="Section order and visibility" className="rounded-xl border bg-card p-5 space-y-4 h-fit">
              <div className="flex items-center gap-2">
                <LayoutTemplate size={18} className="text-primary" />
                <h2 className="font-display text-base font-semibold text-foreground">Section Visibility & Order</h2>
              </div>
              <p className="text-xs text-muted-foreground">
                Show, hide, or reorder sections on the public homepage without touching code.
              </p>

              <ul className="space-y-2">
                {sortedSections.map((sec, idx) => (
                  <li
                    key={sec.id}
                    className={`flex items-center justify-between gap-2 rounded-lg border px-3 py-2.5 text-sm ${
                      sec.visible ? "bg-background" : "bg-muted/50 opacity-70"
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-xs font-mono text-muted-foreground w-4">{idx + 1}.</span>
                      <span className="font-medium text-foreground truncate">{sec.label}</span>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        aria-label={`Move ${sec.label} up`}
                        disabled={idx === 0}
                        onClick={() => handleMove(sec.id, "up")}
                        className="rounded p-1 text-muted-foreground hover:bg-secondary hover:text-foreground disabled:opacity-30"
                      >
                        <ArrowUp size={14} />
                      </button>
                      <button
                        type="button"
                        aria-label={`Move ${sec.label} down`}
                        disabled={idx === sortedSections.length - 1}
                        onClick={() => handleMove(sec.id, "down")}
                        className="rounded p-1 text-muted-foreground hover:bg-secondary hover:text-foreground disabled:opacity-30"
                      >
                        <ArrowDown size={14} />
                      </button>
                      <button
                        type="button"
                        aria-label={sec.visible ? `Hide ${sec.label}` : `Show ${sec.label}`}
                        onClick={() => handleToggleVisibility(sec.id)}
                        className="rounded p-1 text-muted-foreground hover:bg-secondary hover:text-foreground"
                      >
                        {sec.visible ? <Eye size={14} className="text-primary" /> : <EyeOff size={14} />}
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </section>

            {/* Right 2 columns: Section Content Editors */}
            <div className="lg:col-span-2 space-y-6">
              {/* 1. Hero Section */}
              <section aria-label="Hero banner editor" className="rounded-xl border bg-card p-5 space-y-4">
                <div className="flex items-center gap-2 border-b pb-3">
                  <Sparkles size={18} className="text-primary" />
                  <h2 className="font-display text-base font-semibold text-foreground">Hero Banner</h2>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <label htmlFor="hero-badge" className="block text-xs font-medium text-muted-foreground mb-1">Top Badge Text</label>
                    <input
                      id="hero-badge"
                      value={content.hero.badge}
                      onChange={(e) =>
                        updateContent((prev) => ({ ...prev, hero: { ...prev.hero, badge: e.target.value } }))
                      }
                      className="w-full rounded-lg border bg-background px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/20"
                    />
                  </div>
                  <div>
                    <label htmlFor="hero-heading" className="block text-xs font-medium text-muted-foreground mb-1">Main Heading</label>
                    <input
                      id="hero-heading"
                      value={content.hero.headingPrefix}
                      onChange={(e) =>
                        updateContent((prev) => ({ ...prev, hero: { ...prev.hero, headingPrefix: e.target.value } }))
                      }
                      className="w-full rounded-lg border bg-background px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/20"
                    />
                  </div>
                  <div>
                    <label htmlFor="hero-highlight" className="block text-xs font-medium text-muted-foreground mb-1">Highlighted Heading Phrase</label>
                    <input
                      id="hero-highlight"
                      value={content.hero.headingHighlight}
                      onChange={(e) =>
                        updateContent((prev) => ({ ...prev, hero: { ...prev.hero, headingHighlight: e.target.value } }))
                      }
                      className="w-full rounded-lg border bg-background px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/20"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label htmlFor="hero-p1" className="block text-xs font-medium text-muted-foreground mb-1">Primary Description</label>
                    <textarea
                      id="hero-p1"
                      rows={2}
                      value={content.hero.primaryParagraph}
                      onChange={(e) =>
                        updateContent((prev) => ({ ...prev, hero: { ...prev.hero, primaryParagraph: e.target.value } }))
                      }
                      className="w-full rounded-lg border bg-background px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/20 resize-none"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label htmlFor="hero-p2" className="block text-xs font-medium text-muted-foreground mb-1">Secondary Description</label>
                    <textarea
                      id="hero-p2"
                      rows={2}
                      value={content.hero.secondaryParagraph}
                      onChange={(e) =>
                        updateContent((prev) => ({ ...prev, hero: { ...prev.hero, secondaryParagraph: e.target.value } }))
                      }
                      className="w-full rounded-lg border bg-background px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/20 resize-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-muted-foreground mb-1">Primary Button Text</label>
                    <input
                      value={content.hero.primaryCtaLabel}
                      onChange={(e) =>
                        updateContent((prev) => ({ ...prev, hero: { ...prev.hero, primaryCtaLabel: e.target.value } }))
                      }
                      className="w-full rounded-lg border bg-background px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/20"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-muted-foreground mb-1">Primary Button Link</label>
                    <input
                      value={content.hero.primaryCtaLink}
                      onChange={(e) =>
                        updateContent((prev) => ({ ...prev, hero: { ...prev.hero, primaryCtaLink: e.target.value } }))
                      }
                      className="w-full rounded-lg border bg-background px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/20"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-muted-foreground mb-1">Secondary Button Text</label>
                    <input
                      value={content.hero.secondaryCtaLabel}
                      onChange={(e) =>
                        updateContent((prev) => ({ ...prev, hero: { ...prev.hero, secondaryCtaLabel: e.target.value } }))
                      }
                      className="w-full rounded-lg border bg-background px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/20"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-muted-foreground mb-1">Secondary Button Link</label>
                    <input
                      value={content.hero.secondaryCtaLink}
                      onChange={(e) =>
                        updateContent((prev) => ({ ...prev, hero: { ...prev.hero, secondaryCtaLink: e.target.value } }))
                      }
                      className="w-full rounded-lg border bg-background px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/20"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-medium text-muted-foreground mb-1">
                      Hero Image URL Override (optional — defaults to Doctor Profile photo)
                    </label>
                    <input
                      value={content.hero.heroImageUrl ?? ""}
                      onChange={(e) =>
                        updateContent((prev) => ({ ...prev, hero: { ...prev.hero, heroImageUrl: e.target.value } }))
                      }
                      placeholder="/images/dr-srivanth-hero.jpg"
                      className="w-full rounded-lg border bg-background px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/20"
                    />
                  </div>

                  {/* Statistics Bar Labels */}
                  <div className="sm:col-span-2 border-t pt-3">
                    <label className="block text-xs font-semibold text-foreground mb-2">
                      Statistics Strip Labels (numeric values are managed in Doctor Profile)
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      <div>
                        <label className="block text-[11px] text-muted-foreground mb-1">Experience Label</label>
                        <input
                          value={content.hero.statsLabels?.yearsExperience ?? "Years Experience"}
                          onChange={(e) =>
                            updateContent((prev) => ({
                              ...prev,
                              hero: {
                                ...prev.hero,
                                statsLabels: {
                                  yearsExperience: e.target.value,
                                  happyPatients: prev.hero.statsLabels?.happyPatients ?? "Happy Patients",
                                  surgeriesCompleted: prev.hero.statsLabels?.surgeriesCompleted ?? "Surgeries",
                                  branches: prev.hero.statsLabels?.branches ?? "Branches",
                                },
                              },
                            }))
                          }
                          className="w-full rounded border bg-background px-2.5 py-1.5 text-xs text-foreground"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] text-muted-foreground mb-1">Patients Label</label>
                        <input
                          value={content.hero.statsLabels?.happyPatients ?? "Happy Patients"}
                          onChange={(e) =>
                            updateContent((prev) => ({
                              ...prev,
                              hero: {
                                ...prev.hero,
                                statsLabels: {
                                  yearsExperience: prev.hero.statsLabels?.yearsExperience ?? "Years Experience",
                                  happyPatients: e.target.value,
                                  surgeriesCompleted: prev.hero.statsLabels?.surgeriesCompleted ?? "Surgeries",
                                  branches: prev.hero.statsLabels?.branches ?? "Branches",
                                },
                              },
                            }))
                          }
                          className="w-full rounded border bg-background px-2.5 py-1.5 text-xs text-foreground"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] text-muted-foreground mb-1">Surgeries Label</label>
                        <input
                          value={content.hero.statsLabels?.surgeriesCompleted ?? "Surgeries"}
                          onChange={(e) =>
                            updateContent((prev) => ({
                              ...prev,
                              hero: {
                                ...prev.hero,
                                statsLabels: {
                                  yearsExperience: prev.hero.statsLabels?.yearsExperience ?? "Years Experience",
                                  happyPatients: prev.hero.statsLabels?.happyPatients ?? "Happy Patients",
                                  surgeriesCompleted: e.target.value,
                                  branches: prev.hero.statsLabels?.branches ?? "Branches",
                                },
                              },
                            }))
                          }
                          className="w-full rounded border bg-background px-2.5 py-1.5 text-xs text-foreground"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] text-muted-foreground mb-1">Branches Label</label>
                        <input
                          value={content.hero.statsLabels?.branches ?? "Branches"}
                          onChange={(e) =>
                            updateContent((prev) => ({
                              ...prev,
                              hero: {
                                ...prev.hero,
                                statsLabels: {
                                  yearsExperience: prev.hero.statsLabels?.yearsExperience ?? "Years Experience",
                                  happyPatients: prev.hero.statsLabels?.happyPatients ?? "Happy Patients",
                                  surgeriesCompleted: prev.hero.statsLabels?.surgeriesCompleted ?? "Surgeries",
                                  branches: e.target.value,
                                },
                              },
                            }))
                          }
                          className="w-full rounded border bg-background px-2.5 py-1.5 text-xs text-foreground"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </section>

              {/* 2. Specialties Section */}
              <section aria-label="Specialties section editor" className="rounded-xl border bg-card p-5 space-y-4">
                <div className="flex items-center justify-between border-b pb-3">
                  <h2 className="font-display text-base font-semibold text-foreground">
                    Our Specialties ({content.specialties.items.length})
                  </h2>
                  <button
                    type="button"
                    onClick={() =>
                      updateContent((prev) => ({
                        ...prev,
                        specialties: {
                          ...prev.specialties,
                          items: [
                            ...prev.specialties.items,
                            { icon: "Bone", title: "New Specialty", description: "Description of the specialty..." },
                          ],
                        },
                      }))
                    }
                    className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                  >
                    <Plus size={14} /> Add Specialty
                  </button>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="block text-xs font-medium text-muted-foreground mb-1">Section Eyebrow</label>
                    <input
                      value={content.specialties.eyebrow}
                      onChange={(e) =>
                        updateContent((prev) => ({
                          ...prev,
                          specialties: { ...prev.specialties, eyebrow: e.target.value },
                        }))
                      }
                      className="w-full rounded-lg border bg-background px-3 py-2 text-sm text-foreground"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-muted-foreground mb-1">Section Heading</label>
                    <input
                      value={content.specialties.heading}
                      onChange={(e) =>
                        updateContent((prev) => ({
                          ...prev,
                          specialties: { ...prev.specialties, heading: e.target.value },
                        }))
                      }
                      className="w-full rounded-lg border bg-background px-3 py-2 text-sm text-foreground"
                    />
                  </div>
                </div>
                <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
                  {content.specialties.items.map((item, i) => (
                    <div key={i} className="rounded-lg border bg-secondary/20 p-3 space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <input
                          value={item.icon}
                          onChange={(e) => {
                            const items = [...content.specialties.items];
                            items[i] = { ...items[i], icon: e.target.value };
                            updateContent((prev) => ({ ...prev, specialties: { ...prev.specialties, items } }));
                          }}
                          placeholder="Icon (e.g. Bone)"
                          className="w-28 rounded-md border bg-background px-2.5 py-1.5 text-xs text-foreground"
                        />
                        <input
                          value={item.title}
                          onChange={(e) => {
                            const items = [...content.specialties.items];
                            items[i] = { ...items[i], title: e.target.value };
                            updateContent((prev) => ({ ...prev, specialties: { ...prev.specialties, items } }));
                          }}
                          className="flex-1 rounded-md border bg-background px-2.5 py-1.5 text-sm font-medium text-foreground"
                        />
                        <button
                          type="button"
                          onClick={() =>
                            updateContent((prev) => ({
                              ...prev,
                              specialties: {
                                ...prev.specialties,
                                items: prev.specialties.items.filter((_, idx) => idx !== i),
                              },
                            }))
                          }
                          className="text-muted-foreground hover:text-destructive p-1"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                      <textarea
                        rows={2}
                        value={item.description}
                        onChange={(e) => {
                          const items = [...content.specialties.items];
                          items[i] = { ...items[i], description: e.target.value };
                          updateContent((prev) => ({ ...prev, specialties: { ...prev.specialties, items } }));
                        }}
                        className="w-full rounded-md border bg-background px-2.5 py-1.5 text-xs text-foreground resize-none"
                      />
                    </div>
                  ))}
                </div>
              </section>

              {/* 3. Featured Procedures Section */}
              <section aria-label="Procedures editor" className="rounded-xl border bg-card p-5 space-y-4">
                <div className="flex items-center justify-between border-b pb-3">
                  <h2 className="font-display text-base font-semibold text-foreground">
                    Featured Procedures ({content.procedures.items.length})
                  </h2>
                  <button
                    type="button"
                    onClick={() =>
                      updateContent((prev) => ({
                        ...prev,
                        procedures: {
                          ...prev.procedures,
                          items: [
                            ...prev.procedures.items,
                            { icon: "🦵", title: "New Procedure", description: "Procedure description...", ctaLink: "/book", ctaLabel: "Book Consultation" },
                          ],
                        },
                      }))
                    }
                    className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                  >
                    <Plus size={14} /> Add Procedure
                  </button>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="block text-xs font-medium text-muted-foreground mb-1">Section Eyebrow</label>
                    <input
                      value={content.procedures.eyebrow}
                      onChange={(e) =>
                        updateContent((prev) => ({
                          ...prev,
                          procedures: { ...prev.procedures, eyebrow: e.target.value },
                        }))
                      }
                      className="w-full rounded-lg border bg-background px-3 py-2 text-sm text-foreground"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-muted-foreground mb-1">Section Heading</label>
                    <input
                      value={content.procedures.heading}
                      onChange={(e) =>
                        updateContent((prev) => ({
                          ...prev,
                          procedures: { ...prev.procedures, heading: e.target.value },
                        }))
                      }
                      className="w-full rounded-lg border bg-background px-3 py-2 text-sm text-foreground"
                    />
                  </div>
                </div>
                <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                  {content.procedures.items.map((proc, i) => (
                    <div key={i} className="rounded-lg border bg-secondary/20 p-3 space-y-2">
                      <div className="flex gap-2">
                        <input
                          value={proc.icon}
                          onChange={(e) => {
                            const items = [...content.procedures.items];
                            items[i] = { ...items[i], icon: e.target.value };
                            updateContent((prev) => ({ ...prev, procedures: { ...prev.procedures, items } }));
                          }}
                          className="w-16 rounded-md border bg-background px-2 py-1 text-center text-sm"
                        />
                        <input
                          value={proc.title}
                          onChange={(e) => {
                            const items = [...content.procedures.items];
                            items[i] = { ...items[i], title: e.target.value };
                            updateContent((prev) => ({ ...prev, procedures: { ...prev.procedures, items } }));
                          }}
                          className="flex-1 rounded-md border bg-background px-2.5 py-1 text-sm font-medium text-foreground"
                        />
                        <input
                          value={proc.ctaLink || "/book"}
                          onChange={(e) => {
                            const items = [...content.procedures.items];
                            items[i] = { ...items[i], ctaLink: e.target.value };
                            updateContent((prev) => ({ ...prev, procedures: { ...prev.procedures, items } }));
                          }}
                          placeholder="/book"
                          className="w-24 rounded-md border bg-background px-2 py-1 text-xs text-foreground"
                        />
                        <input
                          value={proc.ctaLabel || "Book Consultation"}
                          onChange={(e) => {
                            const items = [...content.procedures.items];
                            items[i] = { ...items[i], ctaLabel: e.target.value };
                            updateContent((prev) => ({ ...prev, procedures: { ...prev.procedures, items } }));
                          }}
                          placeholder="Button label"
                          className="w-28 rounded-md border bg-background px-2 py-1 text-xs text-foreground"
                        />
                        <button
                          type="button"
                          onClick={() =>
                            updateContent((prev) => ({
                              ...prev,
                              procedures: {
                                ...prev.procedures,
                                items: prev.procedures.items.filter((_, idx) => idx !== i),
                              },
                            }))
                          }
                          className="text-muted-foreground hover:text-destructive p-1"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                      <input
                        value={proc.description}
                        onChange={(e) => {
                          const items = [...content.procedures.items];
                          items[i] = { ...items[i], description: e.target.value };
                          updateContent((prev) => ({ ...prev, procedures: { ...prev.procedures, items } }));
                        }}
                        className="w-full rounded-md border bg-background px-2.5 py-1 text-xs text-foreground"
                      />
                    </div>
                  ))}
                </div>
              </section>

              {/* 3B. Why Choose Us Section */}
              <section aria-label="Why choose us editor" className="rounded-xl border bg-card p-5 space-y-4">
                <div className="flex items-center justify-between border-b pb-3">
                  <h2 className="font-display text-base font-semibold text-foreground">
                    Why Choose Us ({content.whyChoose.items.length})
                  </h2>
                  <button
                    type="button"
                    onClick={() =>
                      updateContent((prev) => ({
                        ...prev,
                        whyChoose: {
                          ...prev.whyChoose,
                          items: [
                            ...prev.whyChoose.items,
                            { icon: "Award", title: "New Reason", description: "Why patients choose our clinic..." },
                          ],
                        },
                      }))
                    }
                    className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                  >
                    <Plus size={14} /> Add Reason
                  </button>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="block text-xs font-medium text-muted-foreground mb-1">Section Eyebrow</label>
                    <input
                      value={content.whyChoose.eyebrow}
                      onChange={(e) =>
                        updateContent((prev) => ({
                          ...prev,
                          whyChoose: { ...prev.whyChoose, eyebrow: e.target.value },
                        }))
                      }
                      className="w-full rounded-lg border bg-background px-3 py-2 text-sm text-foreground"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-muted-foreground mb-1">Section Heading</label>
                    <input
                      value={content.whyChoose.heading}
                      onChange={(e) =>
                        updateContent((prev) => ({
                          ...prev,
                          whyChoose: { ...prev.whyChoose, heading: e.target.value },
                        }))
                      }
                      className="w-full rounded-lg border bg-background px-3 py-2 text-sm text-foreground"
                    />
                  </div>
                </div>
                <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
                  {content.whyChoose.items.map((item, i) => (
                    <div key={i} className="rounded-lg border bg-secondary/20 p-3 space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <input
                          value={item.icon}
                          onChange={(e) => {
                            const items = [...content.whyChoose.items];
                            items[i] = { ...items[i], icon: e.target.value };
                            updateContent((prev) => ({ ...prev, whyChoose: { ...prev.whyChoose, items } }));
                          }}
                          placeholder="Icon (e.g. Award)"
                          className="w-28 rounded-md border bg-background px-2.5 py-1.5 text-xs text-foreground"
                        />
                        <input
                          value={item.title}
                          onChange={(e) => {
                            const items = [...content.whyChoose.items];
                            items[i] = { ...items[i], title: e.target.value };
                            updateContent((prev) => ({ ...prev, whyChoose: { ...prev.whyChoose, items } }));
                          }}
                          className="flex-1 rounded-md border bg-background px-2.5 py-1.5 text-sm font-medium text-foreground"
                        />
                        <button
                          type="button"
                          onClick={() =>
                            updateContent((prev) => ({
                              ...prev,
                              whyChoose: {
                                ...prev.whyChoose,
                                items: prev.whyChoose.items.filter((_, idx) => idx !== i),
                              },
                            }))
                          }
                          className="text-muted-foreground hover:text-destructive p-1"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                      <textarea
                        rows={2}
                        value={item.description}
                        onChange={(e) => {
                          const items = [...content.whyChoose.items];
                          items[i] = { ...items[i], description: e.target.value };
                          updateContent((prev) => ({ ...prev, whyChoose: { ...prev.whyChoose, items } }));
                        }}
                        className="w-full rounded-md border bg-background px-2.5 py-1.5 text-xs text-foreground resize-none"
                      />
                    </div>
                  ))}
                </div>
              </section>

              {/* 4. Testimonials & Video Section */}
              <section aria-label="Testimonials and video editor" className="rounded-xl border bg-card p-5 space-y-4">
                <h2 className="font-display text-base font-semibold text-foreground border-b pb-3">
                  Patient Testimonials & Video
                </h2>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-xs font-medium text-muted-foreground mb-1">Testimonials Heading</label>
                    <input
                      value={content.testimonials.heading}
                      onChange={(e) =>
                        updateContent((prev) => ({
                          ...prev,
                          testimonials: { ...prev.testimonials, heading: e.target.value },
                        }))
                      }
                      className="w-full rounded-lg border bg-background px-3 py-2 text-sm text-foreground"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-muted-foreground mb-1">Video Caption</label>
                    <input
                      value={content.testimonials.videoCaption}
                      onChange={(e) =>
                        updateContent((prev) => ({
                          ...prev,
                          testimonials: { ...prev.testimonials, videoCaption: e.target.value },
                        }))
                      }
                      className="w-full rounded-lg border bg-background px-3 py-2 text-sm text-foreground"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-medium text-muted-foreground mb-1">
                      Patient Testimonial Video URL
                    </label>
                    <input
                      value={content.testimonials.videoUrl}
                      onChange={(e) =>
                        updateContent((prev) => ({
                          ...prev,
                          testimonials: { ...prev.testimonials, videoUrl: e.target.value },
                        }))
                      }
                      className="w-full rounded-lg border bg-background px-3 py-2 text-sm text-foreground"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-medium text-muted-foreground mb-1">
                      Google Reviews External Link URL
                    </label>
                    <input
                      value={content.testimonials.googleReviewsUrl}
                      onChange={(e) =>
                        updateContent((prev) => ({
                          ...prev,
                          testimonials: { ...prev.testimonials, googleReviewsUrl: e.target.value },
                        }))
                      }
                      className="w-full rounded-lg border bg-background px-3 py-2 text-sm text-foreground"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-medium text-muted-foreground mb-1">
                      Google Reviews Button Label
                    </label>
                    <input
                      value={content.testimonials.googleReviewsCtaLabel ?? "Read all reviews on Google"}
                      onChange={(e) =>
                        updateContent((prev) => ({
                          ...prev,
                          testimonials: { ...prev.testimonials, googleReviewsCtaLabel: e.target.value },
                        }))
                      }
                      placeholder="Read all reviews on Google"
                      className="w-full rounded-lg border bg-background px-3 py-2 text-sm text-foreground"
                    />
                  </div>
                </div>
              </section>

              {/* 5. Bottom CTA Section */}
              <section aria-label="Bottom CTA editor" className="rounded-xl border bg-card p-5 space-y-4">
                <h2 className="font-display text-base font-semibold text-foreground border-b pb-3">
                  Bottom Call-to-Action
                </h2>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-xs font-medium text-muted-foreground mb-1">CTA Heading</label>
                    <input
                      value={content.cta.heading}
                      onChange={(e) =>
                        updateContent((prev) => ({ ...prev, cta: { ...prev.cta, heading: e.target.value } }))
                      }
                      className="w-full rounded-lg border bg-background px-3 py-2 text-sm text-foreground"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-muted-foreground mb-1">CTA Subtext</label>
                    <input
                      value={content.cta.description}
                      onChange={(e) =>
                        updateContent((prev) => ({ ...prev, cta: { ...prev.cta, description: e.target.value } }))
                      }
                      className="w-full rounded-lg border bg-background px-3 py-2 text-sm text-foreground"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-muted-foreground mb-1">Primary Button Text</label>
                    <input
                      value={content.cta.primaryCtaLabel}
                      onChange={(e) =>
                        updateContent((prev) => ({ ...prev, cta: { ...prev.cta, primaryCtaLabel: e.target.value } }))
                      }
                      className="w-full rounded-lg border bg-background px-3 py-2 text-sm text-foreground"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-muted-foreground mb-1">WhatsApp Button Text</label>
                    <input
                      value={content.cta.whatsappCtaLabel}
                      onChange={(e) =>
                        updateContent((prev) => ({ ...prev, cta: { ...prev.cta, whatsappCtaLabel: e.target.value } }))
                      }
                      className="w-full rounded-lg border bg-background px-3 py-2 text-sm text-foreground"
                    />
                  </div>
                </div>
              </section>
            </div>
          </div>
        </>
      ) : (
        /* Dedicated Editor for Any Other Public Page (`about`, `orthopaedics`, `physiotherapy`, `rehabilitation`, `services`, `book`, `contact`, `second-opinion`, `blog`, `case-studies`) */
        <>
          <DraftPublishBar
            workflowStatus={sitePageStatus}
            busy={busy}
            canSubmitReview={canSubmitReview}
            canApprove={canApprove}
            canPublish={canPublish}
            statusMessage={statusMessage}
            previewUrl={`${sitePage.routePath}?preview=1`}
            reviewFeedback={sitePageFeedback}
            reviewedByEmail={sitePageReviewedBy}
            reviewedAt={sitePageReviewedAt}
            history={sitePageHistory}
            onSaveDraft={() => void runTransition("draft")}
            onSubmitForReview={() => void runTransition("pending_approval")}
            onApprove={() => void runTransition("approved")}
            onReject={(reason) => void runTransition("rejected", reason)}
            onPublish={() => void runTransition("published")}
          />

          <div className="space-y-6">
            {/* 1. Hero Banner & Media */}
            <section aria-label="Page hero banner editor" className="rounded-xl border bg-card p-5 space-y-4">
              <div className="flex items-center gap-2 border-b pb-3">
                <Sparkles size={18} className="text-primary" />
                <h2 className="font-display text-base font-semibold text-foreground">
                  {currentCatalogEntry.label} — Hero Banner & Media
                </h2>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="site-page-eyebrow" className="block text-xs font-medium text-muted-foreground mb-1">Hero Eyebrow Label</label>
                  <input
                    id="site-page-eyebrow"
                    value={sitePage.heroEyebrow}
                    onChange={(e) => updateSitePage((prev) => ({ ...prev, heroEyebrow: e.target.value }))}
                    className="w-full rounded-lg border bg-background px-3 py-2 text-sm text-foreground"
                  />
                </div>
                <div>
                  <label htmlFor="site-page-title" className="block text-xs font-medium text-muted-foreground mb-1">Hero Main Heading</label>
                  <input
                    id="site-page-title"
                    value={sitePage.heroTitle}
                    onChange={(e) => updateSitePage((prev) => ({ ...prev, heroTitle: e.target.value }))}
                    placeholder={selectedSlug === "about" ? "Defaults to Meet {Doctor Name}" : ""}
                    className="w-full rounded-lg border bg-background px-3 py-2 text-sm text-foreground"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label htmlFor="site-page-subtitle" className="block text-xs font-medium text-muted-foreground mb-1">Hero Subtitle / Intro Paragraph</label>
                  <textarea
                    id="site-page-subtitle"
                    rows={2}
                    value={sitePage.heroSubtitle}
                    onChange={(e) => updateSitePage((prev) => ({ ...prev, heroSubtitle: e.target.value }))}
                    className="w-full rounded-lg border bg-background px-3 py-2 text-sm text-foreground resize-none"
                  />
                </div>
                <div>
                  <label htmlFor="site-page-image" className="block text-xs font-medium text-muted-foreground mb-1">
                    Hero Banner / Feature Image URL
                  </label>
                  <input
                    id="site-page-image"
                    value={sitePage.heroImageUrl}
                    onChange={(e) => updateSitePage((prev) => ({ ...prev, heroImageUrl: e.target.value }))}
                    placeholder="Select from Media Library or paste image URL..."
                    className="w-full rounded-lg border bg-background px-3 py-2 text-sm text-foreground"
                  />
                  {imageAssets.length > 0 && (
                    <select
                      value=""
                      onChange={(e) => {
                        const found = imageAssets.find((a) => a.publicUrl === e.target.value);
                        if (found) {
                          updateSitePage((prev) => ({
                            ...prev,
                            heroImageUrl: found.publicUrl,
                            heroImageAlt: prev.heroImageAlt || found.altText || found.fileName,
                          }));
                        }
                      }}
                      className="mt-1.5 w-full rounded-md border bg-secondary/40 px-2.5 py-1.5 text-xs text-foreground"
                    >
                      <option value="">Choose image from Media Library...</option>
                      {imageAssets.map((a) => (
                        <option key={a.id} value={a.publicUrl}>
                          {a.altText || a.fileName} ({a.category})
                        </option>
                      ))}
                    </select>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">
                    Hero Image Alt Text (Accessibility & SEO)
                  </label>
                  <input
                    value={sitePage.heroImageAlt}
                    onChange={(e) => updateSitePage((prev) => ({ ...prev, heroImageAlt: e.target.value }))}
                    className="w-full rounded-lg border bg-background px-3 py-2 text-sm text-foreground"
                  />
                </div>
              </div>
            </section>

            {/* 2. Rich-Text Content Section */}
            <section aria-label="Page rich text content editor" className="rounded-xl border bg-card p-5 space-y-4">
              <h2 className="font-display text-base font-semibold text-foreground border-b pb-3">
                Rich-Text Page Body Content (Headings, Lists, Links & Inline Images)
              </h2>
              <RichTextEditor
                label="Page Body Content (HTML / Visual Formatting)"
                value={sitePage.bodyHtml}
                onChange={(next) => updateSitePage((prev) => ({ ...prev, bodyHtml: next }))}
                mediaAssets={mediaAssets}
                rows={7}
                helpText="Optional rich-text block rendered below the hero banner. Supports H2, H3, bullet lists, numbered steps, links, and images from the Media Library."
              />
            </section>

            {/* 3. Page-Specific Labels & Form Text */}
            {Object.keys(sitePage.customLabels).length > 0 && (
              <section aria-label="Page specific labels editor" className="rounded-xl border bg-card p-5 space-y-4">
                <h2 className="font-display text-base font-semibold text-foreground border-b pb-3">
                  Page Headings, Form Labels & Interactive Text
                </h2>
                <div className="grid gap-4 sm:grid-cols-2">
                  {Object.entries(sitePage.customLabels).map(([key, val]) => (
                    <div key={key} className={val.length > 60 ? "sm:col-span-2" : ""}>
                      <label className="block text-xs font-medium text-muted-foreground mb-1">
                        {CUSTOM_LABEL_TITLES[key] || key}
                      </label>
                      <input
                        value={val}
                        onChange={(e) =>
                          updateSitePage((prev) => ({
                            ...prev,
                            customLabels: { ...prev.customLabels, [key]: e.target.value },
                          }))
                        }
                        className="w-full rounded-lg border bg-background px-3 py-2 text-sm text-foreground"
                      />
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* 4. Highlight / Benefit Cards */}
            <section aria-label="Page highlight cards editor" className="rounded-xl border bg-card p-5 space-y-4">
              <div className="flex items-center justify-between border-b pb-3">
                <h2 className="font-display text-base font-semibold text-foreground">
                  Highlight / Benefit Cards ({sitePage.highlights.length})
                </h2>
                <button
                  type="button"
                  onClick={() =>
                    updateSitePage((prev) => ({
                      ...prev,
                      highlights: [
                        ...prev.highlights,
                        {
                          id: `hl-${Date.now()}`,
                          icon: "✨",
                          title: "Key Highlight",
                          description: "Brief explanation of this benefit or feature...",
                        },
                      ],
                    }))
                  }
                  className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                >
                  <Plus size={14} /> Add Highlight Card
                </button>
              </div>
              {sitePage.highlights.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  No highlight cards added for this page yet. Click "Add Highlight Card" to display feature cards.
                </p>
              ) : (
                <div className="space-y-3">
                  {sitePage.highlights.map((hl, idx) => (
                    <div key={hl.id} className="rounded-lg border bg-secondary/20 p-3 space-y-2">
                      <div className="flex items-center gap-2">
                        <input
                          value={hl.icon}
                          onChange={(e) => {
                            const next = [...sitePage.highlights];
                            next[idx] = { ...next[idx], icon: e.target.value };
                            updateSitePage((prev) => ({ ...prev, highlights: next }));
                          }}
                          placeholder="Icon"
                          className="w-20 rounded border bg-background px-2 py-1.5 text-xs text-foreground"
                        />
                        <input
                          value={hl.title}
                          onChange={(e) => {
                            const next = [...sitePage.highlights];
                            next[idx] = { ...next[idx], title: e.target.value };
                            updateSitePage((prev) => ({ ...prev, highlights: next }));
                          }}
                          placeholder="Card Title"
                          className="flex-1 rounded border bg-background px-2.5 py-1.5 text-sm font-medium text-foreground"
                        />
                        <button
                          type="button"
                          onClick={() =>
                            updateSitePage((prev) => ({
                              ...prev,
                              highlights: prev.highlights.filter((_, i) => i !== idx),
                            }))
                          }
                          className="text-muted-foreground hover:text-destructive p-1"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                      <textarea
                        rows={2}
                        value={hl.description}
                        onChange={(e) => {
                          const next = [...sitePage.highlights];
                          next[idx] = { ...next[idx], description: e.target.value };
                          updateSitePage((prev) => ({ ...prev, highlights: next }));
                        }}
                        placeholder="Card Description"
                        className="w-full rounded border bg-background px-2.5 py-1.5 text-xs text-foreground resize-none"
                      />
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* 5. Frequently Asked Questions (FAQs) */}
            <section aria-label="Page FAQs editor" className="rounded-xl border bg-card p-5 space-y-4">
              <div className="flex items-center justify-between border-b pb-3">
                <div className="flex items-center gap-2">
                  <HelpCircle size={18} className="text-primary" />
                  <h2 className="font-display text-base font-semibold text-foreground">
                    Page Frequently Asked Questions ({sitePage.faqs.length})
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    updateSitePage((prev) => ({
                      ...prev,
                      faqs: [
                        ...prev.faqs,
                        {
                          id: `faq-${Date.now()}`,
                          question: "What should I bring to my consultation?",
                          answer: "Please bring any prior X-rays, MRI scans, prescriptions, and a list of current medications.",
                        },
                      ],
                    }))
                  }
                  className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                >
                  <Plus size={14} /> Add FAQ
                </button>
              </div>
              {sitePage.faqs.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  No FAQs configured for this page. Click "Add FAQ" to display an accordion section.
                </p>
              ) : (
                <div className="space-y-3">
                  {sitePage.faqs.map((faq, idx) => (
                    <div key={faq.id} className="rounded-lg border bg-secondary/20 p-3 space-y-2">
                      <div className="flex items-center gap-2">
                        <input
                          value={faq.question}
                          onChange={(e) => {
                            const next = [...sitePage.faqs];
                            next[idx] = { ...next[idx], question: e.target.value };
                            updateSitePage((prev) => ({ ...prev, faqs: next }));
                          }}
                          placeholder="Question"
                          className="flex-1 rounded border bg-background px-2.5 py-1.5 text-sm font-medium text-foreground"
                        />
                        <button
                          type="button"
                          onClick={() =>
                            updateSitePage((prev) => ({
                              ...prev,
                              faqs: prev.faqs.filter((_, i) => i !== idx),
                            }))
                          }
                          className="text-muted-foreground hover:text-destructive p-1"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                      <textarea
                        rows={2}
                        value={faq.answer}
                        onChange={(e) => {
                          const next = [...sitePage.faqs];
                          next[idx] = { ...next[idx], answer: e.target.value };
                          updateSitePage((prev) => ({ ...prev, faqs: next }));
                        }}
                        placeholder="Answer"
                        className="w-full rounded border bg-background px-2.5 py-1.5 text-xs text-foreground resize-none"
                      />
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* 6. Bottom Call-to-Action Banner */}
            <section aria-label="Page bottom CTA editor" className="rounded-xl border bg-card p-5 space-y-4">
              <h2 className="font-display text-base font-semibold text-foreground border-b pb-3">
                Bottom Call-to-Action Banner
              </h2>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">CTA Heading</label>
                  <input
                    value={sitePage.ctaHeading}
                    onChange={(e) => updateSitePage((prev) => ({ ...prev, ctaHeading: e.target.value }))}
                    className="w-full rounded-lg border bg-background px-3 py-2 text-sm text-foreground"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">CTA Description</label>
                  <input
                    value={sitePage.ctaDescription}
                    onChange={(e) => updateSitePage((prev) => ({ ...prev, ctaDescription: e.target.value }))}
                    className="w-full rounded-lg border bg-background px-3 py-2 text-sm text-foreground"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">Primary Button Label</label>
                  <input
                    value={sitePage.ctaPrimaryLabel}
                    onChange={(e) => updateSitePage((prev) => ({ ...prev, ctaPrimaryLabel: e.target.value }))}
                    className="w-full rounded-lg border bg-background px-3 py-2 text-sm text-foreground"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">Primary Button Link</label>
                  <input
                    value={sitePage.ctaPrimaryLink}
                    onChange={(e) => updateSitePage((prev) => ({ ...prev, ctaPrimaryLink: e.target.value }))}
                    className="w-full rounded-lg border bg-background px-3 py-2 text-sm text-foreground"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">Secondary Button Label</label>
                  <input
                    value={sitePage.ctaSecondaryLabel}
                    onChange={(e) => updateSitePage((prev) => ({ ...prev, ctaSecondaryLabel: e.target.value }))}
                    className="w-full rounded-lg border bg-background px-3 py-2 text-sm text-foreground"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">Secondary Button Link</label>
                  <input
                    value={sitePage.ctaSecondaryLink}
                    onChange={(e) => updateSitePage((prev) => ({ ...prev, ctaSecondaryLink: e.target.value }))}
                    className="w-full rounded-lg border bg-background px-3 py-2 text-sm text-foreground"
                  />
                </div>
              </div>
            </section>
          </div>
        </>
      )}
    </div>
  );
}
