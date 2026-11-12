import { useEffect, useState } from "react";
import { Plus, Trash2, MapPin, Phone, Clock, ShieldCheck } from "lucide-react";
import { PageHeader } from "@/components/admin/states";
import { DraftPublishBar } from "@/components/admin/DraftPublishBar";
import { useSiteConfig, type SiteConfig, type TimeSlotEntry } from "@/contexts/SiteConfigContext";
import { useAuth } from "@/contexts/AuthContext";
import { loadStagedSiteConfig, transitionSiteConfigWorkflow } from "@/lib/cms/repository";
import type { ApprovalHistoryEntry, WorkflowStatus } from "@/lib/cms/types";

const inputClass =
  "w-full rounded-lg border bg-background px-3.5 py-2 text-xs text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20";

export default function AdminClinic() {
  const { config, updateConfig } = useSiteConfig();
  const { user, role, can } = useAuth();

  const canSubmitReview = can("content.submit_review");
  const canApprove = can("content.approve");
  const canPublish = can("content.publish");

  const [form, setForm] = useState<SiteConfig>({ ...config });
  const [workflowStatus, setWorkflowStatus] = useState<WorkflowStatus>("published");
  const [reviewFeedback, setReviewFeedback] = useState<string | null>(null);
  const [reviewedByEmail, setReviewedByEmail] = useState<string | null>(null);
  const [reviewedAt, setReviewedAt] = useState<string | null>(null);
  const [history, setHistory] = useState<ApprovalHistoryEntry[]>([]);
  const [busy, setBusy] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  useEffect(() => {
    const staged = loadStagedSiteConfig("clinic");
    if (staged) {
      setForm({ ...config, ...staged.draft });
      setWorkflowStatus(staged.workflowStatus);
      setReviewFeedback(staged.reviewFeedback ?? null);
      setReviewedByEmail(staged.reviewedByEmail ?? null);
      setReviewedAt(staged.reviewedAt ?? null);
      setHistory(staged.history ?? []);
    } else {
      setForm({ ...config });
    }
  }, [config]);

  const runTransition = async (targetStatus: WorkflowStatus, feedback?: string) => {
    setBusy(true);
    setStatusMessage(null);
    const res = await transitionSiteConfigWorkflow({
      scope: "clinic",
      updates: {
        clinicName: form.clinicName,
        phone: form.phone,
        whatsapp: form.whatsapp,
        email: form.email,
        location: form.location,
        hours: form.hours,
        consultationFee: form.consultationFee,
        branches: form.branches,
        whatsappFloatEnabled: form.whatsappFloatEnabled,
        facebook: form.facebook,
        instagram: form.instagram,
        timeSlots: form.timeSlots,
        insuranceProviders: form.insuranceProviders,
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
    if (res.workflowStatus) {
      setWorkflowStatus(res.workflowStatus);
    }
    const refreshed = loadStagedSiteConfig("clinic");
    if (refreshed) {
      setReviewFeedback(refreshed.reviewFeedback ?? null);
      setReviewedByEmail(refreshed.reviewedByEmail ?? null);
      setReviewedAt(refreshed.reviewedAt ?? null);
      setHistory(refreshed.history ?? []);
    }
  };

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

  return (
    <div className="space-y-6">
      <PageHeader
        title="Clinic information"
        description="Manage clinic address, phone numbers, WhatsApp, consultation timings, directions, and accepted insurance."
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
        previewUrl="/contact?preview=1"
        onSaveDraft={() => void runTransition("draft")}
        onSubmitForReview={() => void runTransition("pending_approval")}
        onApprove={() => void runTransition("approved")}
        onReject={(fb) => void runTransition("rejected", fb)}
        onPublish={() => void runTransition("published")}
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

        <div className="mt-4 flex items-center gap-3">
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
      </section>
    </div>
  );
}
