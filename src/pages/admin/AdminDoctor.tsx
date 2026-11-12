import { useEffect, useState } from "react";
import { UserCheck, Award, GraduationCap, Image as ImageIcon, Plus, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/admin/states";
import { DraftPublishBar } from "@/components/admin/DraftPublishBar";
import { MediaPickerModal } from "@/components/admin/MediaPickerModal";
import {
  useSiteConfig,
  type AwardEntry,
  type EducationEntry,
  type SiteConfig,
} from "@/contexts/SiteConfigContext";
import { useAuth } from "@/contexts/AuthContext";
import { loadStagedSiteConfig, transitionSiteConfigWorkflow } from "@/lib/cms/repository";
import type { ApprovalHistoryEntry, WorkflowStatus } from "@/lib/cms/types";

const inputClass =
  "w-full rounded-lg border bg-background px-3.5 py-2 text-xs text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20";

export default function AdminDoctor() {
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
  const [mediaPickerOpen, setMediaPickerOpen] = useState(false);

  useEffect(() => {
    const staged = loadStagedSiteConfig("doctor");
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
      scope: "doctor",
      updates: {
        doctorName: form.doctorName,
        title: form.title,
        specialization: form.specialization,
        registrationNumber: form.registrationNumber,
        shortBio: form.shortBio,
        fullBio: form.fullBio,
        philosophy: form.philosophy,
        heroImageUrl: form.heroImageUrl,
        yearsExperience: form.yearsExperience,
        happyPatients: form.happyPatients,
        surgeriesCompleted: form.surgeriesCompleted,
        education: form.education,
        awards: form.awards,
        memberships: form.memberships,
        languages: form.languages,
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
    const refreshed = loadStagedSiteConfig("doctor");
    if (refreshed) {
      setReviewFeedback(refreshed.reviewFeedback ?? null);
      setReviewedByEmail(refreshed.reviewedByEmail ?? null);
      setReviewedAt(refreshed.reviewedAt ?? null);
      setHistory(refreshed.history ?? []);
    }
  };

  const addEducation = () => {
    const next: EducationEntry[] = [
      ...(form.education ?? []),
      { degree: "MS (Orthopaedics)", institution: "", yearStart: 2015 },
    ];
    setForm({ ...form, education: next });
  };

  const addAward = () => {
    const next: AwardEntry[] = [
      ...(form.awards ?? []),
      { title: "", organization: "", year: new Date().getFullYear() },
    ];
    setForm({ ...form, awards: next });
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Doctor profile"
        description="Manage doctor name, qualifications, biography, profile photo, experience statistics, and fellowships."
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
        previewUrl="/about?preview=1"
        onSaveDraft={() => void runTransition("draft")}
        onSubmitForReview={() => void runTransition("pending_approval")}
        onApprove={() => void runTransition("approved")}
        onReject={(fb) => void runTransition("rejected", fb)}
        onPublish={() => void runTransition("published")}
      />

      {/* Core Identity & Photo */}
      <section className="rounded-xl border bg-card p-5 shadow-sm">
        <div className="mb-4 flex items-center gap-2">
          <UserCheck size={18} className="text-primary" aria-hidden="true" />
          <h2 className="font-display text-base font-bold text-foreground">Doctor Identity & Profile Photo</h2>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="doctor-name" className="mb-1 block text-xs font-medium text-foreground">
              Doctor Full Name
            </label>
            <input
              id="doctor-name"
              type="text"
              value={form.doctorName}
              onChange={(e) => setForm({ ...form, doctorName: e.target.value })}
              className={inputClass}
            />
          </div>

          <div>
            <label htmlFor="doctor-title" className="mb-1 block text-xs font-medium text-foreground">
              Qualifications & Title
            </label>
            <input
              id="doctor-title"
              type="text"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              className={inputClass}
            />
          </div>

          <div>
            <label htmlFor="doctor-spec" className="mb-1 block text-xs font-medium text-foreground">
              Primary Specialization
            </label>
            <input
              id="doctor-spec"
              type="text"
              value={form.specialization}
              onChange={(e) => setForm({ ...form, specialization: e.target.value })}
              className={inputClass}
            />
          </div>

          <div>
            <label htmlFor="doctor-reg" className="mb-1 block text-xs font-medium text-foreground">
              Medical Council Registration Number
            </label>
            <input
              id="doctor-reg"
              type="text"
              value={form.registrationNumber}
              onChange={(e) => setForm({ ...form, registrationNumber: e.target.value })}
              className={inputClass}
            />
          </div>

          <div className="sm:col-span-2">
            <label htmlFor="doctor-photo-url" className="mb-1 block text-xs font-medium text-foreground">
              Doctor Portrait / Hero Photo
            </label>
            <div className="flex flex-wrap items-center gap-2">
              <input
                id="doctor-photo-url"
                type="text"
                value={form.heroImageUrl}
                onChange={(e) => setForm({ ...form, heroImageUrl: e.target.value })}
                placeholder="/images/dr-srivanth-hero.jpg"
                className={`${inputClass} flex-1`}
              />
              <button
                type="button"
                onClick={() => setMediaPickerOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-lg border bg-secondary px-3.5 py-2 text-xs font-semibold text-foreground hover:bg-secondary/80"
              >
                <ImageIcon size={14} /> Choose from Media Library
              </button>
            </div>
          </div>

          <div className="sm:col-span-2">
            <label htmlFor="doctor-short-bio" className="mb-1 block text-xs font-medium text-foreground">
              Short Summary Bio
            </label>
            <textarea
              id="doctor-short-bio"
              rows={2}
              value={form.shortBio}
              onChange={(e) => setForm({ ...form, shortBio: e.target.value })}
              className={inputClass}
            />
          </div>

          <div className="sm:col-span-2">
            <label htmlFor="doctor-full-bio" className="mb-1 block text-xs font-medium text-foreground">
              Full Biography
            </label>
            <textarea
              id="doctor-full-bio"
              rows={4}
              value={form.fullBio}
              onChange={(e) => setForm({ ...form, fullBio: e.target.value })}
              className={inputClass}
            />
          </div>
        </div>
      </section>

      {/* Experience Statistics */}
      <section className="rounded-xl border bg-card p-5 shadow-sm">
        <h2 className="mb-3 font-display text-base font-bold text-foreground">Experience & Patient Milestones</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label htmlFor="doc-years" className="mb-1 block text-xs font-medium text-foreground">
              Years of Experience
            </label>
            <input
              id="doc-years"
              type="number"
              value={form.yearsExperience}
              onChange={(e) => setForm({ ...form, yearsExperience: Number(e.target.value) || 0 })}
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="doc-patients" className="mb-1 block text-xs font-medium text-foreground">
              Happy Patients Treated
            </label>
            <input
              id="doc-patients"
              type="number"
              value={form.happyPatients}
              onChange={(e) => setForm({ ...form, happyPatients: Number(e.target.value) || 0 })}
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="doc-surgeries" className="mb-1 block text-xs font-medium text-foreground">
              Surgeries Completed
            </label>
            <input
              id="doc-surgeries"
              type="number"
              value={form.surgeriesCompleted}
              onChange={(e) => setForm({ ...form, surgeriesCompleted: Number(e.target.value) || 0 })}
              className={inputClass}
            />
          </div>
        </div>
      </section>

      {/* Qualifications & Education */}
      <section className="rounded-xl border bg-card p-5 shadow-sm">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <GraduationCap size={18} className="text-primary" aria-hidden="true" />
            <h2 className="font-display text-base font-bold text-foreground">Degrees & Fellowships</h2>
          </div>
          <button
            type="button"
            onClick={addEducation}
            className="inline-flex items-center gap-1 rounded-lg border px-3 py-1.5 text-xs font-semibold text-primary hover:bg-secondary"
          >
            <Plus size={13} /> Add qualification
          </button>
        </div>

        <div className="space-y-2.5">
          {(form.education ?? []).map((edu, idx) => (
            <div key={idx} className="grid gap-2 rounded-lg border bg-background p-3 sm:grid-cols-4">
              <input
                type="text"
                aria-label={`Degree ${idx + 1}`}
                placeholder="Degree (e.g. MS Ortho)"
                value={edu.degree}
                onChange={(e) => {
                  const next = [...form.education];
                  next[idx] = { ...edu, degree: e.target.value };
                  setForm({ ...form, education: next });
                }}
                className={inputClass}
              />
              <input
                type="text"
                aria-label={`Institution ${idx + 1}`}
                placeholder="Institution / University"
                value={edu.institution}
                onChange={(e) => {
                  const next = [...form.education];
                  next[idx] = { ...edu, institution: e.target.value };
                  setForm({ ...form, education: next });
                }}
                className={`${inputClass} sm:col-span-2`}
              />
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  aria-label={`Year ${idx + 1}`}
                  placeholder="Year"
                  value={edu.yearStart}
                  onChange={(e) => {
                    const next = [...form.education];
                    next[idx] = { ...edu, yearStart: Number(e.target.value) || 2020 };
                    setForm({ ...form, education: next });
                  }}
                  className={inputClass}
                />
                <button
                  type="button"
                  onClick={() =>
                    setForm({
                      ...form,
                      education: form.education.filter((_, i) => i !== idx),
                    })
                  }
                  aria-label={`Remove qualification ${idx + 1}`}
                  className="p-1.5 text-muted-foreground hover:text-destructive"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Awards */}
      <section className="rounded-xl border bg-card p-5 shadow-sm">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Award size={18} className="text-primary" aria-hidden="true" />
            <h2 className="font-display text-base font-bold text-foreground">Awards & Recognitions</h2>
          </div>
          <button
            type="button"
            onClick={addAward}
            className="inline-flex items-center gap-1 rounded-lg border px-3 py-1.5 text-xs font-semibold text-primary hover:bg-secondary"
          >
            <Plus size={13} /> Add award
          </button>
        </div>

        <div className="space-y-2.5">
          {(form.awards ?? []).map((aw, idx) => (
            <div key={idx} className="grid gap-2 rounded-lg border bg-background p-3 sm:grid-cols-4">
              <input
                type="text"
                aria-label={`Award title ${idx + 1}`}
                placeholder="Award title"
                value={aw.title}
                onChange={(e) => {
                  const next = [...form.awards];
                  next[idx] = { ...aw, title: e.target.value };
                  setForm({ ...form, awards: next });
                }}
                className={inputClass}
              />
              <input
                type="text"
                aria-label={`Award organization ${idx + 1}`}
                placeholder="Organization"
                value={aw.organization}
                onChange={(e) => {
                  const next = [...form.awards];
                  next[idx] = { ...aw, organization: e.target.value };
                  setForm({ ...form, awards: next });
                }}
                className={`${inputClass} sm:col-span-2`}
              />
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  aria-label={`Award year ${idx + 1}`}
                  placeholder="Year"
                  value={aw.year}
                  onChange={(e) => {
                    const next = [...form.awards];
                    next[idx] = { ...aw, year: Number(e.target.value) || 2024 };
                    setForm({ ...form, awards: next });
                  }}
                  className={inputClass}
                />
                <button
                  type="button"
                  onClick={() =>
                    setForm({
                      ...form,
                      awards: form.awards.filter((_, i) => i !== idx),
                    })
                  }
                  aria-label={`Remove award ${idx + 1}`}
                  className="p-1.5 text-muted-foreground hover:text-destructive"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      <MediaPickerModal
        open={mediaPickerOpen}
        onClose={() => setMediaPickerOpen(false)}
        allowedTypes={["image"]}
        defaultCategory="doctor"
        title="Select Doctor Portrait Image"
        onSelect={(asset) => setForm({ ...form, heroImageUrl: asset.publicUrl })}
      />
    </div>
  );
}
