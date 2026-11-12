import { useState } from "react";
import { Palette, Image as ImageIcon, Type, Layout as LayoutIcon, Check, Megaphone, Compass, ArrowUp, ArrowDown, Eye, EyeOff, Tags } from "lucide-react";
import { PageHeader } from "@/components/admin/states";
import { DraftWorkflowPanels, DraftWorkspaceLoading } from "@/components/admin/DraftWorkflowPanels";
import { MediaPickerModal } from "@/components/admin/MediaPickerModal";
import { type BrandingConfig, DEFAULT_NAV_ITEMS, type NavItemConfig } from "@/contexts/SiteConfigContext";
import { APPROVED_THEME_PRESETS, type ThemePresetId } from "@/lib/cms/types";
import { useSiteConfigDraft } from "@/hooks/useSiteConfigDraft";
import { SITE_CONFIG_SCOPE_PREVIEW_URL } from "@/lib/cms/siteConfigScopes";
import { SITE_LABEL_DEFAULTS, SITE_LABEL_TITLES, type SiteLabelKey } from "@/lib/cms/siteLabels";

const inputClass =
  "w-full rounded-lg border bg-background px-3.5 py-2 text-xs text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20";

/**
 * Branding workspace — logo, theme, typography, header/footer, navigation, announcement bar and
 * site-wide labels. Same database draft workflow as Clinic Information (005c, scope 'branding').
 */
export default function AdminBranding() {
  const ws = useSiteConfigDraft("branding");
  const { form, setForm, config } = ws;
  const [pickerOpen, setPickerOpen] = useState(false);

  /** Values shown in the form when a setting has never been saved (the site's current defaults). */
  const displayDefaults: BrandingConfig = {
    logoUrl: "",
    logoAlt: `${config.clinicName} logo`,
    themePreset: "clinical-teal",
    primaryHsl: APPROVED_THEME_PRESETS["clinical-teal"].primaryHsl,
    accentHsl: APPROVED_THEME_PRESETS["clinical-teal"].accentHsl,
    headingFont: "Playfair Display",
    bodyFont: "DM Sans",
    footerTagline: "",
    headerCtaLabel: "Book Appointment",
    headerCtaLink: "/book",
    announcementEnabled: false,
    announcementText: "",
    announcementLinkLabel: "",
    announcementLinkUrl: "",
    copyrightText: "",
    youtubeUrl: "",
    navItems: DEFAULT_NAV_ITEMS,
  };

  const branding: BrandingConfig = { ...displayDefaults, ...(form.branding ?? {}) };
  const logoInitials = form.logoInitials || "OH";

  /**
   * Stores only settings that were already saved or that now differ from the display default,
   * so the review diff lists real changes instead of every default value.
   */
  const setBranding = (next: BrandingConfig) => {
    const saved = (form.branding ?? {}) as Record<string, unknown>;
    const stored: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(next)) {
      const fallback = (displayDefaults as Record<string, unknown>)[key];
      if (key in saved || JSON.stringify(value) !== JSON.stringify(fallback)) stored[key] = value;
    }
    setForm({ ...form, branding: stored as BrandingConfig });
  };
  const setLogoInitials = (value: string) => setForm({ ...form, logoInitials: value });

  const labels = (branding.labels ?? {}) as Record<string, string>;
  const setLabel = (key: SiteLabelKey, value: string) => {
    const nextLabels = { ...labels, [key]: value };
    if (!value.trim()) delete nextLabels[key];
    setBranding({ ...branding, labels: nextLabels });
  };

  const selectPreset = (presetId: ThemePresetId) => {
    const preset = APPROVED_THEME_PRESETS[presetId];
    setBranding({
      ...branding,
      themePreset: presetId,
      primaryHsl: preset.primaryHsl,
      accentHsl: preset.accentHsl,
    });
  };

  const currentNavItems = [...(branding.navItems ?? DEFAULT_NAV_ITEMS)].sort((a, b) => a.sortOrder - b.sortOrder);

  const moveNavItem = (id: string, direction: "up" | "down") => {
    const list = [...currentNavItems];
    const idx = list.findIndex((item) => item.id === id);
    if (idx === -1) return;
    const targetIdx = direction === "up" ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= list.length) return;
    const temp = list[idx];
    list[idx] = list[targetIdx];
    list[targetIdx] = temp;
    const reindexed = list.map((item, i) => ({ ...item, sortOrder: i + 1 }));
    setBranding({ ...branding, navItems: reindexed });
  };

  const toggleNavVisibility = (id: string) => {
    const list = (branding.navItems ?? DEFAULT_NAV_ITEMS).map((item) =>
      item.id === id ? { ...item, visible: !item.visible } : item,
    );
    setBranding({ ...branding, navItems: list });
  };

  const updateNavItem = (id: string, updates: Partial<NavItemConfig>) => {
    const list = (branding.navItems ?? DEFAULT_NAV_ITEMS).map((item) =>
      item.id === id ? { ...item, ...updates } : item,
    );
    setBranding({ ...branding, navItems: list });
  };

  const header = (
    <PageHeader
      title="Branding & theme"
      description="Customize clinic logo, approved colour palettes, typography pairs, and header/footer branding."
    />
  );

  if (!ws.configLoaded || ws.loading) {
    return (
      <div className="space-y-6">
        {header}
        <DraftWorkspaceLoading label="Branding" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {header}

      <DraftWorkflowPanels
        label="Branding"
        migration="005c"
        schemaReady={ws.schemaReady}
        loadError={ws.loadError}
        workflowStatus={ws.workflowStatus}
        busy={ws.busy}
        statusMessage={ws.statusMessage}
        reviewFeedback={ws.record?.reviewFeedback ?? null}
        reviewedByEmail={ws.record?.reviewedByEmail ?? null}
        reviewedAt={ws.record?.reviewedAt ?? null}
        history={ws.record?.history ?? []}
        previewUrl={SITE_CONFIG_SCOPE_PREVIEW_URL.branding}
        unsavedChanges={ws.unsavedChanges}
        changes={ws.pendingChanges}
        onSave={(s) => void ws.save(s)}
        onReview={(d, fb) => void ws.review(d, fb)}
        onPublish={() => void ws.publish()}
        onDiscard={ws.discardEdits}
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

      {/* Global Announcement Banner */}
      <section className="rounded-xl border bg-card p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b pb-3">
          <div className="flex items-center gap-2">
            <Megaphone size={18} className="text-primary" aria-hidden="true" />
            <div>
              <h2 className="font-display text-base font-bold text-foreground">Global Announcement Banner</h2>
              <p className="text-xs text-muted-foreground">
                Highlight special clinics, temporary timings, holiday notices, or health camps at the very top of all pages.
              </p>
            </div>
          </div>
          <label className="flex items-center gap-2 text-xs font-semibold text-foreground cursor-pointer">
            <input
              type="checkbox"
              checked={branding.announcementEnabled ?? false}
              onChange={(e) => setBranding({ ...branding, announcementEnabled: e.target.checked })}
              className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
            />
            <span>Enable Banner</span>
          </label>
        </div>

        {branding.announcementEnabled && (
          <div className="grid gap-4 sm:grid-cols-3 pt-1">
            <div className="sm:col-span-3">
              <label htmlFor="announcement-text" className="mb-1 block text-xs font-medium text-foreground">
                Announcement Message Text
              </label>
              <input
                id="announcement-text"
                type="text"
                value={branding.announcementText ?? ""}
                onChange={(e) => setBranding({ ...branding, announcementText: e.target.value })}
                placeholder="e.g. Free Knee Arthritis Screening Camp this Saturday, 10 AM – 2 PM."
                className={inputClass}
              />
            </div>
            <div>
              <label htmlFor="announcement-link-label" className="mb-1 block text-xs font-medium text-foreground">
                Button / Link Label
              </label>
              <input
                id="announcement-link-label"
                type="text"
                value={branding.announcementLinkLabel ?? ""}
                onChange={(e) => setBranding({ ...branding, announcementLinkLabel: e.target.value })}
                placeholder="Register Now"
                className={inputClass}
              />
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="announcement-link-url" className="mb-1 block text-xs font-medium text-foreground">
                Destination Link URL
              </label>
              <input
                id="announcement-link-url"
                type="text"
                value={branding.announcementLinkUrl ?? ""}
                onChange={(e) => setBranding({ ...branding, announcementLinkUrl: e.target.value })}
                placeholder="/book or https://..."
                className={inputClass}
              />
            </div>
          </div>
        )}
      </section>

      {/* Navigation Menu & Header CTA */}
      <section className="rounded-xl border bg-card p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b pb-3">
          <div className="flex items-center gap-2">
            <Compass size={18} className="text-primary" aria-hidden="true" />
            <div>
              <h2 className="font-display text-base font-bold text-foreground">Header Navigation & CTA Button</h2>
              <p className="text-xs text-muted-foreground">
                Customize menu link labels, order, show/hide visibility, and header CTA button destination.
              </p>
            </div>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="brand-header-cta-label" className="mb-1 block text-xs font-medium text-foreground">
              Header Primary CTA Button Label
            </label>
            <input
              id="brand-header-cta-label"
              type="text"
              value={branding.headerCtaLabel ?? "Book Appointment"}
              onChange={(e) => setBranding({ ...branding, headerCtaLabel: e.target.value })}
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="brand-header-cta-link" className="mb-1 block text-xs font-medium text-foreground">
              Header Primary CTA Destination URL
            </label>
            <input
              id="brand-header-cta-link"
              type="text"
              value={branding.headerCtaLink ?? "/book"}
              onChange={(e) => setBranding({ ...branding, headerCtaLink: e.target.value })}
              placeholder="/book"
              className={inputClass}
            />
          </div>
        </div>

        <div className="border-t pt-3 space-y-2">
          <label className="block text-xs font-semibold text-foreground mb-1">
            Navigation Menu Items ({currentNavItems.length})
          </label>
          <div className="space-y-2">
            {currentNavItems.map((item, idx) => (
              <div
                key={item.id}
                className={`flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3 ${
                  item.visible ? "bg-card" : "bg-muted/40 opacity-70"
                }`}
              >
                <div className="flex flex-1 items-center gap-3 min-w-[240px]">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-secondary text-xs font-mono font-semibold text-muted-foreground">
                    {item.sortOrder}
                  </span>
                  <input
                    type="text"
                    value={item.label}
                    onChange={(e) => updateNavItem(item.id, { label: e.target.value })}
                    className="w-36 rounded-md border bg-background px-2.5 py-1.5 text-xs font-medium text-foreground"
                    placeholder="Menu label"
                  />
                  <input
                    type="text"
                    value={item.to}
                    onChange={(e) => updateNavItem(item.id, { to: e.target.value })}
                    className="flex-1 rounded-md border bg-background px-2.5 py-1.5 text-xs text-foreground font-mono"
                    placeholder="/path"
                  />
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => toggleNavVisibility(item.id)}
                    title={item.visible ? "Hide from navigation" : "Show in navigation"}
                    className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs font-medium border ${
                      item.visible
                        ? "bg-secondary text-foreground hover:bg-secondary/80"
                        : "bg-muted text-muted-foreground hover:bg-muted/80"
                    }`}
                  >
                    {item.visible ? <Eye size={12} /> : <EyeOff size={12} />}
                    <span>{item.visible ? "Visible" : "Hidden"}</span>
                  </button>

                  <button
                    type="button"
                    disabled={idx === 0}
                    onClick={() => moveNavItem(item.id, "up")}
                    title="Move item up"
                    className="rounded-md border p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground disabled:opacity-30"
                  >
                    <ArrowUp size={13} />
                  </button>
                  <button
                    type="button"
                    disabled={idx === currentNavItems.length - 1}
                    onClick={() => moveNavItem(item.id, "down")}
                    title="Move item down"
                    className="rounded-md border p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground disabled:opacity-30"
                  >
                    <ArrowDown size={13} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer Copyright & Social Channels */}
      <section className="rounded-xl border bg-card p-5 shadow-sm space-y-4">
        <h2 className="font-display text-base font-bold text-foreground border-b pb-3">
          Footer Copyright & Social Media Links
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label htmlFor="brand-copyright-text" className="mb-1 block text-xs font-medium text-foreground">
              Footer Copyright Notice (optional — defaults to &quot;© 2026 {config.doctorName} {config.clinicName}. All rights reserved.&quot;)
            </label>
            <input
              id="brand-copyright-text"
              type="text"
              value={branding.copyrightText ?? ""}
              onChange={(e) => setBranding({ ...branding, copyrightText: e.target.value })}
              placeholder={`© 2026 ${config.doctorName} ${config.clinicName}. All rights reserved.`}
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="brand-youtube-url" className="mb-1 block text-xs font-medium text-foreground">
              YouTube Channel URL (optional)
            </label>
            <input
              id="brand-youtube-url"
              type="text"
              value={branding.youtubeUrl ?? ""}
              onChange={(e) => setBranding({ ...branding, youtubeUrl: e.target.value })}
              placeholder="https://youtube.com/@..."
              className={inputClass}
            />
          </div>
        </div>
      </section>

      <section aria-label="Site-wide labels" className="rounded-xl border bg-card p-5 shadow-sm space-y-4">
        <div className="flex items-center gap-2 border-b pb-3">
          <Tags size={18} className="text-primary" aria-hidden="true" />
          <h2 className="font-display text-base font-bold text-foreground">Site-wide Labels</h2>
        </div>
        <p className="text-xs text-muted-foreground">
          Text used across many pages (footer headings, review badges, 404 page). Leave a field empty to keep the
          current wording shown in grey.
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          {(Object.keys(SITE_LABEL_DEFAULTS) as SiteLabelKey[]).map((key) => (
            <div key={key}>
              <label htmlFor={`brand-label-${key}`} className="mb-1 block text-xs font-medium text-foreground">
                {SITE_LABEL_TITLES[key]}
              </label>
              <input
                id={`brand-label-${key}`}
                type="text"
                value={labels[key] ?? ""}
                placeholder={SITE_LABEL_DEFAULTS[key]}
                onChange={(e) => setLabel(key, e.target.value)}
                className={inputClass}
              />
            </div>
          ))}
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
