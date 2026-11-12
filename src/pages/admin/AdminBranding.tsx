import { useEffect, useState } from "react";
import { Palette, Image as ImageIcon, Type, Layout as LayoutIcon, Check } from "lucide-react";
import { PageHeader } from "@/components/admin/states";
import { DraftPublishBar } from "@/components/admin/DraftPublishBar";
import { MediaPickerModal } from "@/components/admin/MediaPickerModal";
import { useSiteConfig, type BrandingConfig } from "@/contexts/SiteConfigContext";
import { useAuth } from "@/contexts/AuthContext";
import {
  APPROVED_THEME_PRESETS,
  type ApprovalHistoryEntry,
  type ThemePresetId,
  type WorkflowStatus,
} from "@/lib/cms/types";
import { loadStagedSiteConfig, transitionSiteConfigWorkflow } from "@/lib/cms/repository";

const inputClass =
  "w-full rounded-lg border bg-background px-3.5 py-2 text-xs text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20";

export default function AdminBranding() {
  const { config, updateConfig } = useSiteConfig();
  const { user, role, can } = useAuth();

  const canSubmitReview = can("content.submit_review");
  const canApprove = can("content.approve");
  const canPublish = can("content.publish");

  const [logoInitials, setLogoInitials] = useState(config.logoInitials || "OH");
  const [branding, setBranding] = useState<BrandingConfig>({
    logoUrl: config.branding?.logoUrl ?? "",
    logoAlt: config.branding?.logoAlt ?? `${config.clinicName} logo`,
    themePreset: config.branding?.themePreset ?? "clinical-teal",
    primaryHsl: config.branding?.primaryHsl ?? APPROVED_THEME_PRESETS["clinical-teal"].primaryHsl,
    accentHsl: config.branding?.accentHsl ?? APPROVED_THEME_PRESETS["clinical-teal"].accentHsl,
    headingFont: config.branding?.headingFont ?? "Playfair Display",
    bodyFont: config.branding?.bodyFont ?? "DM Sans",
    footerTagline: config.branding?.footerTagline ?? "",
    headerCtaLabel: config.branding?.headerCtaLabel ?? "Book Appointment",
  });

  const [workflowStatus, setWorkflowStatus] = useState<WorkflowStatus>("published");
  const [reviewFeedback, setReviewFeedback] = useState<string | null>(null);
  const [reviewedByEmail, setReviewedByEmail] = useState<string | null>(null);
  const [reviewedAt, setReviewedAt] = useState<string | null>(null);
  const [history, setHistory] = useState<ApprovalHistoryEntry[]>([]);
  const [busy, setBusy] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);

  useEffect(() => {
    const staged = loadStagedSiteConfig("branding");
    if (staged) {
      if (staged.draft.logoInitials) setLogoInitials(staged.draft.logoInitials);
      if (staged.draft.branding) {
        setBranding((prev) => ({ ...prev, ...staged.draft.branding }));
      }
      setWorkflowStatus(staged.workflowStatus);
      setReviewFeedback(staged.reviewFeedback ?? null);
      setReviewedByEmail(staged.reviewedByEmail ?? null);
      setReviewedAt(staged.reviewedAt ?? null);
      setHistory(staged.history ?? []);
    }
  }, []);

  const selectPreset = (presetId: ThemePresetId) => {
    const preset = APPROVED_THEME_PRESETS[presetId];
    setBranding({
      ...branding,
      themePreset: presetId,
      primaryHsl: preset.primaryHsl,
      accentHsl: preset.accentHsl,
    });
  };

  const runTransition = async (targetStatus: WorkflowStatus, feedback?: string) => {
    setBusy(true);
    setStatusMessage(null);
    const res = await transitionSiteConfigWorkflow({
      scope: "branding",
      updates: {
        logoInitials,
        branding,
      },
      targetStatus,
      actorEmail: user?.email ?? "cms-user@orthocarehub.in",
      actorRole: role ?? "editor",
      canPublish,
      updateLiveConfig: updateConfig,
      feedback,
    });
    setBusy(false);
    setStatusMessage(res.message);
    if (res.workflowStatus) setWorkflowStatus(res.workflowStatus);

    const refreshed = loadStagedSiteConfig("branding");
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
        title="Branding & theme"
        description="Customize clinic logo, approved colour palettes, typography pairs, and header/footer branding."
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
        previewUrl="/?preview=1"
        onSaveDraft={() => void runTransition("draft")}
        onSubmitForReview={() => void runTransition("pending_approval")}
        onApprove={() => void runTransition("approved")}
        onReject={(fb) => void runTransition("rejected", fb)}
        onPublish={() => void runTransition("published")}
      />

      {/* Logo Management */}
      <section className="rounded-xl border bg-card p-5 shadow-sm">
        <div className="mb-4 flex items-center gap-2">
          <ImageIcon size={18} className="text-primary" aria-hidden="true" />
          <h2 className="font-display text-base font-bold text-foreground">Logo & Monogram</h2>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label htmlFor="brand-initials" className="mb-1 block text-xs font-medium text-foreground">
              Fallback Monogram Initials
            </label>
            <input
              id="brand-initials"
              type="text"
              maxLength={3}
              value={logoInitials}
              onChange={(e) => setLogoInitials(e.target.value.toUpperCase())}
              className={inputClass}
            />
          </div>

          <div className="sm:col-span-2">
            <label htmlFor="brand-logo-url" className="mb-1 block text-xs font-medium text-foreground">
              Logo Image URL (optional — replaces monogram badge in header)
            </label>
            <div className="flex gap-2">
              <input
                id="brand-logo-url"
                type="text"
                value={branding.logoUrl ?? ""}
                onChange={(e) => setBranding({ ...branding, logoUrl: e.target.value })}
                placeholder="/images/logo.png"
                className={inputClass}
              />
              <button
                type="button"
                onClick={() => setPickerOpen(true)}
                className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border bg-secondary px-3 py-2 text-xs font-semibold text-foreground"
              >
                <ImageIcon size={13} /> Choose Logo
              </button>
            </div>
          </div>

          <div className="sm:col-span-3">
            <label htmlFor="brand-logo-alt" className="mb-1 block text-xs font-medium text-foreground">
              Logo Accessibility Alt Text
            </label>
            <input
              id="brand-logo-alt"
              type="text"
              value={branding.logoAlt ?? ""}
              onChange={(e) => setBranding({ ...branding, logoAlt: e.target.value })}
              className={inputClass}
            />
          </div>
        </div>
      </section>

      {/* Approved Theme Colour Presets */}
      <section className="rounded-xl border bg-card p-5 shadow-sm">
        <div className="mb-4 flex items-center gap-2">
          <Palette size={18} className="text-primary" aria-hidden="true" />
          <h2 className="font-display text-base font-bold text-foreground">Approved Medical Theme Palettes</h2>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          {(Object.keys(APPROVED_THEME_PRESETS) as ThemePresetId[]).map((key) => {
            const preset = APPROVED_THEME_PRESETS[key];
            const active = branding.themePreset === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => selectPreset(key)}
                className={`relative flex flex-col justify-between rounded-xl border p-4 text-left transition-all ${
                  active ? "border-primary ring-2 ring-primary/30" : "hover:border-primary/40"
                }`}
              >
                <div>
                  <div className="mb-3 flex items-center gap-2">
                    <span
                      className="h-6 w-6 rounded-full border"
                      style={{ backgroundColor: `hsl(${preset.primaryHsl})` }}
                    />
                    <span
                      className="h-6 w-6 rounded-full border"
                      style={{ backgroundColor: `hsl(${preset.accentHsl})` }}
                    />
                  </div>
                  <h3 className="font-display text-sm font-bold text-foreground">{preset.label}</h3>
                  <p className="mt-1 text-xs text-muted-foreground">{preset.description}</p>
                </div>
                {active && (
                  <span className="absolute right-3 top-3 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground">
                    <Check size={12} />
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </section>

      {/* Typography & Header/Footer Settings */}
      <section className="rounded-xl border bg-card p-5 shadow-sm">
        <div className="mb-4 flex items-center gap-2">
          <Type size={18} className="text-primary" aria-hidden="true" />
          <h2 className="font-display text-base font-bold text-foreground">Typography & Header / Footer Copy</h2>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="brand-heading-font" className="mb-1 block text-xs font-medium text-foreground">
              Heading Font Family
            </label>
            <select
              id="brand-heading-font"
              value={branding.headingFont}
              onChange={(e) =>
                setBranding({
                  ...branding,
                  headingFont: e.target.value as BrandingConfig["headingFont"],
                })
              }
              className={inputClass}
            >
              <option value="Playfair Display">Playfair Display (Editorial Serif)</option>
              <option value="Merriweather">Merriweather (Classic Serif)</option>
              <option value="Lora">Lora (Warm Serif)</option>
            </select>
          </div>

          <div>
            <label htmlFor="brand-body-font" className="mb-1 block text-xs font-medium text-foreground">
              Body Font Family
            </label>
            <select
              id="brand-body-font"
              value={branding.bodyFont}
              onChange={(e) =>
                setBranding({
                  ...branding,
                  bodyFont: e.target.value as BrandingConfig["bodyFont"],
                })
              }
              className={inputClass}
            >
              <option value="DM Sans">DM Sans (Clean Geometric Sans)</option>
              <option value="Inter">Inter (Clinical UI Sans)</option>
              <option value="Plus Jakarta Sans">Plus Jakarta Sans (Modern Sans)</option>
            </select>
          </div>

          <div className="sm:col-span-2">
            <label htmlFor="brand-footer-tagline" className="mb-1 flex items-center gap-1.5 text-xs font-medium text-foreground">
              <LayoutIcon size={13} /> Footer Clinic Tagline
            </label>
            <textarea
              id="brand-footer-tagline"
              rows={2}
              value={branding.footerTagline ?? ""}
              onChange={(e) => setBranding({ ...branding, footerTagline: e.target.value })}
              placeholder="Dedicated to restoring mobility and pain-free living…"
              className={inputClass}
            />
          </div>
        </div>
      </section>

      <MediaPickerModal
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        allowedTypes={["image"]}
        defaultCategory="clinic"
        title="Select Clinic Logo Image"
        onSelect={(asset) => {
          setBranding({
            ...branding,
            logoUrl: asset.publicUrl,
            logoAlt: asset.altText || branding.logoAlt,
          });
        }}
      />
    </div>
  );
}
