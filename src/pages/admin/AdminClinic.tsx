import { Plus, Trash2, MapPin, Phone, Clock, ShieldCheck } from "lucide-react";
import { PageHeader } from "@/components/admin/states";
import { DraftWorkflowPanels, DraftWorkspaceLoading } from "@/components/admin/DraftWorkflowPanels";
import type { TimeSlotEntry } from "@/contexts/SiteConfigContext";
import { useSiteConfigDraft } from "@/hooks/useSiteConfigDraft";
import { SITE_CONFIG_SCOPE_PREVIEW_URL } from "@/lib/cms/siteConfigScopes";

const inputClass =
  "w-full rounded-lg border bg-background px-3.5 py-2 text-xs text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20";

/**
 * Clinic Information workspace.
 *
 * Editors save drafts and submit them; the Super Admin compares the submitted version with the
 * live website, approves or rejects it, and publishes approved changes. Drafts are stored in
 * `site_config_drafts` (migration 005c) and never touch the live `site_config.config` until the
 * database-side `publish_site_config_draft()` accepts an approved draft.
 */
export default function AdminClinic() {
  const ws = useSiteConfigDraft("clinic");
  const { form, setForm } = ws;

  const addTimeSlot = () => {
    const next: TimeSlotEntry[] = [...(form.timeSlots ?? []), { time: "10:00 AM", available: true }];
    setForm({ ...form, timeSlots: next });
  };

  const removeTimeSlot = (idx: number) => {
    setForm({
      ...form,
      timeSlots: (form.timeSlots ?? []).filter((_, i) => i !== idx),
    });
  };

  const header = (
    <PageHeader
      title="Clinic information"
      description="Manage clinic address, phone numbers, WhatsApp, consultation timings, directions, and accepted insurance."
    />
  );

  if (!ws.configLoaded || ws.loading) {
    return (
      <div className="space-y-6">
        {header}
        <DraftWorkspaceLoading label="Clinic information" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {header}

      <DraftWorkflowPanels
        label="Clinic"
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
        previewUrl={SITE_CONFIG_SCOPE_PREVIEW_URL.clinic}
        unsavedChanges={ws.unsavedChanges}
        changes={ws.pendingChanges}
        onSave={(s) => void ws.save(s)}
        onReview={(d, fb) => void ws.review(d, fb)}
        onPublish={() => void ws.publish()}
        onDiscard={ws.discardEdits}
      />

      {/* Contact & Address */}
      <section className="rounded-xl border bg-card p-5 shadow-sm">
        <div className="mb-4 flex items-center gap-2">
          <MapPin size={18} className="text-primary" aria-hidden="true" />
          <h2 className="font-display text-base font-bold text-foreground">Address & Contact Details</h2>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="clinic-name" className="mb-1 block text-xs font-medium text-foreground">
              Clinic / Hospital Name
            </label>
            <input
              id="clinic-name"
              type="text"
              value={form.clinicName}
              onChange={(e) => setForm({ ...form, clinicName: e.target.value })}
              className={inputClass}
            />
          </div>

          <div>
            <label htmlFor="clinic-email" className="mb-1 block text-xs font-medium text-foreground">
              Clinic Email
            </label>
            <input
              id="clinic-email"
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className={inputClass}
            />
          </div>

          <div>
            <label htmlFor="clinic-phone" className="mb-1 block text-xs font-medium text-foreground">
              Primary Phone Number
            </label>
            <input
              id="clinic-phone"
              type="text"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              className={inputClass}
            />
          </div>

          <div>
            <label htmlFor="clinic-whatsapp" className="mb-1 block text-xs font-medium text-foreground">
              WhatsApp Number
            </label>
            <input
              id="clinic-whatsapp"
              type="text"
              value={form.whatsapp}
              onChange={(e) => setForm({ ...form, whatsapp: e.target.value })}
              className={inputClass}
            />
          </div>

          <div className="sm:col-span-2">
            <label htmlFor="clinic-location" className="mb-1 block text-xs font-medium text-foreground">
              Clinic Address & Directions Summary
            </label>
            <textarea
              id="clinic-location"
              rows={2}
              value={form.location}
              onChange={(e) => setForm({ ...form, location: e.target.value })}
              className={inputClass}
            />
          </div>

          <div>
            <label htmlFor="clinic-maps-link" className="mb-1 block text-xs font-medium text-foreground">
              Google Maps Directions Link URL ("Open in Maps")
            </label>
            <input
              id="clinic-maps-link"
              type="url"
              value={form.googleMapsDirectionsUrl ?? ""}
              onChange={(e) => setForm({ ...form, googleMapsDirectionsUrl: e.target.value })}
              placeholder="https://maps.app.goo.gl/..."
              className={inputClass}
            />
          </div>

          <div>
            <label htmlFor="clinic-maps-embed" className="mb-1 block text-xs font-medium text-foreground">
              Google Maps Iframe Embed URL (/contact page map)
            </label>
            <input
              id="clinic-maps-embed"
              type="url"
              value={form.googleMapsEmbedUrl ?? ""}
              onChange={(e) => setForm({ ...form, googleMapsEmbedUrl: e.target.value })}
              placeholder="https://www.google.com/maps/embed?pb=..."
              className={inputClass}
            />
          </div>
        </div>
      </section>

      {/* Timings & Appointment Slots */}
      <section className="rounded-xl border bg-card p-5 shadow-sm">
        <div className="mb-4 flex items-center gap-2">
          <Clock size={18} className="text-primary" aria-hidden="true" />
          <h2 className="font-display text-base font-bold text-foreground">Clinic Timings & Consultation Slots</h2>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <div className="sm:col-span-2">
            <label htmlFor="clinic-hours" className="mb-1 block text-xs font-medium text-foreground">
              Working Hours Display Text
            </label>
            <input
              id="clinic-hours"
              type="text"
              value={form.hours}
              onChange={(e) => setForm({ ...form, hours: e.target.value })}
              placeholder="e.g. Mon - Sat: 9 AM - 8 PM"
              className={inputClass}
            />
          </div>

          <div>
            <label htmlFor="clinic-fee" className="mb-1 block text-xs font-medium text-foreground">
              Consultation Fee (₹)
            </label>
            <input
              id="clinic-fee"
              type="number"
              value={form.consultationFee}
              onChange={(e) => setForm({ ...form, consultationFee: Number(e.target.value) || 0 })}
              className={inputClass}
            />
          </div>
        </div>

        <div className="mt-4">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs font-semibold text-foreground">Booking Time Slots</span>
            <button
              type="button"
              onClick={addTimeSlot}
              className="inline-flex items-center gap-1 rounded-lg border px-2.5 py-1 text-xs font-medium text-primary hover:bg-secondary"
            >
              <Plus size={12} /> Add slot
            </button>
          </div>
          <div className="grid gap-2 sm:grid-cols-3">
            {(form.timeSlots ?? []).map((slot, idx) => (
              <div key={idx} className="flex items-center gap-2 rounded-lg border bg-background p-2">
                <input
                  type="text"
                  aria-label={`Time slot ${idx + 1}`}
                  value={slot.time}
                  onChange={(e) => {
                    const next = [...form.timeSlots];
                    next[idx] = { ...slot, time: e.target.value };
                    setForm({ ...form, timeSlots: next });
                  }}
                  className="w-full bg-transparent text-xs text-foreground outline-none"
                />
                <label className="flex items-center gap-1 text-[11px] text-muted-foreground">
                  <input
                    type="checkbox"
                    checked={slot.available}
                    onChange={(e) => {
                      const next = [...form.timeSlots];
                      next[idx] = { ...slot, available: e.target.checked };
                      setForm({ ...form, timeSlots: next });
                    }}
                  />
                  Active
                </label>
                <button
                  type="button"
                  onClick={() => removeTimeSlot(idx)}
                  aria-label={`Remove slot ${slot.time}`}
                  className="text-muted-foreground hover:text-destructive"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Insurance & WhatsApp Float */}
      <section className="rounded-xl border bg-card p-5 shadow-sm">
        <div className="mb-4 flex items-center gap-2">
          <ShieldCheck size={18} className="text-primary" aria-hidden="true" />
          <h2 className="font-display text-base font-bold text-foreground">Patient Convenience & Social Links</h2>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="clinic-facebook" className="mb-1 block text-xs font-medium text-foreground">
              Facebook Page URL
            </label>
            <input
              id="clinic-facebook"
              type="url"
              value={form.facebook ?? ""}
              onChange={(e) => setForm({ ...form, facebook: e.target.value })}
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="clinic-instagram" className="mb-1 block text-xs font-medium text-foreground">
              Instagram Profile URL
            </label>
            <input
              id="clinic-instagram"
              type="url"
              value={form.instagram ?? ""}
              onChange={(e) => setForm({ ...form, instagram: e.target.value })}
              className={inputClass}
            />
          </div>
        </div>

        <div className="mt-4 space-y-3">
          <div className="flex items-center gap-3">
            <Phone size={15} className="text-primary" aria-hidden="true" />
            <label className="flex cursor-pointer items-center gap-2 text-xs font-medium text-foreground">
              <input
                type="checkbox"
                checked={form.whatsappFloatEnabled}
                onChange={(e) => setForm({ ...form, whatsappFloatEnabled: e.target.checked })}
              />
              Show floating WhatsApp quick-chat button on the public website
            </label>
          </div>
          <div>
            <label htmlFor="clinic-wa-msg" className="mb-1 block text-xs font-medium text-foreground">
              Default Floating WhatsApp Prefilled Message
            </label>
            <input
              id="clinic-wa-msg"
              type="text"
              value={form.whatsappDefaultMessage ?? "Hi Doctor, I'd like to book a consultation."}
              onChange={(e) => setForm({ ...form, whatsappDefaultMessage: e.target.value })}
              className={inputClass}
            />
          </div>
        </div>

        <div className="mt-5 border-t pt-4">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs font-semibold text-foreground">
              Accepted Insurance Providers (Displayed on /book)
            </span>
            <button
              type="button"
              onClick={() =>
                setForm({
                  ...form,
                  insuranceProviders: [...(form.insuranceProviders ?? []), "Star Health Insurance"],
                })
              }
              className="inline-flex items-center gap-1 rounded-lg border px-2.5 py-1 text-xs font-medium text-primary hover:bg-secondary"
            >
              <Plus size={12} /> Add insurance provider
            </button>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            {(form.insuranceProviders ?? []).map((prov, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <input
                  type="text"
                  aria-label={`Insurance provider ${idx + 1}`}
                  value={prov}
                  onChange={(e) => {
                    const next = [...(form.insuranceProviders ?? [])];
                    next[idx] = e.target.value;
                    setForm({ ...form, insuranceProviders: next });
                  }}
                  className={inputClass}
                />
                <button
                  type="button"
                  onClick={() =>
                    setForm({
                      ...form,
                      insuranceProviders: (form.insuranceProviders ?? []).filter((_, i) => i !== idx),
                    })
                  }
                  aria-label={`Remove insurance provider ${idx + 1}`}
                  className="text-muted-foreground hover:text-destructive"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Service categories (used by the /services page filter) */}
      <section aria-label="Service categories" className="rounded-xl border bg-card p-5 shadow-sm">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-display text-base font-bold text-foreground">Service Categories (/services filter)</h2>
          <button
            type="button"
            onClick={() =>
              setForm({
                ...form,
                serviceCategories: [...(form.serviceCategories ?? []), { name: "", slug: "", icon: "", description: "" }],
              })
            }
            className="inline-flex items-center gap-1 rounded-lg border px-2.5 py-1 text-xs font-medium text-primary hover:bg-secondary"
          >
            <Plus size={12} /> Add category
          </button>
        </div>
        <div className="space-y-2">
          {(form.serviceCategories ?? []).map((cat, idx) => {
            const update = (patch: Partial<typeof cat>) => {
              const next = [...(form.serviceCategories ?? [])];
              next[idx] = { ...cat, ...patch };
              setForm({ ...form, serviceCategories: next });
            };
            return (
              <div key={idx} className="grid gap-2 rounded-lg border bg-background p-2 sm:grid-cols-[4rem_1fr_1fr_2fr_auto]">
                <input
                  aria-label={`Category ${idx + 1} icon`}
                  value={cat.icon}
                  placeholder="Icon"
                  onChange={(e) => update({ icon: e.target.value })}
                  className={inputClass}
                />
                <input
                  aria-label={`Category ${idx + 1} name`}
                  value={cat.name}
                  placeholder="Name"
                  onChange={(e) =>
                    update({
                      name: e.target.value,
                      slug: e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, ""),
                    })
                  }
                  className={inputClass}
                />
                <input
                  aria-label={`Category ${idx + 1} slug`}
                  value={cat.slug}
                  placeholder="slug"
                  onChange={(e) => update({ slug: e.target.value })}
                  className={inputClass}
                />
                <input
                  aria-label={`Category ${idx + 1} description`}
                  value={cat.description}
                  placeholder="Description"
                  onChange={(e) => update({ description: e.target.value })}
                  className={inputClass}
                />
                <button
                  type="button"
                  aria-label={`Remove category ${idx + 1}`}
                  onClick={() =>
                    setForm({ ...form, serviceCategories: (form.serviceCategories ?? []).filter((_, i) => i !== idx) })
                  }
                  className="text-muted-foreground hover:text-destructive"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            );
          })}
          {(form.serviceCategories ?? []).length === 0 && (
            <p className="text-xs text-muted-foreground">No categories: the /services page shows all services without a filter.</p>
          )}
        </div>
      </section>
    </div>
  );
}
