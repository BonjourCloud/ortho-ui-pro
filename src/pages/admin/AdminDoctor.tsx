import { useState } from "react";
import { UserCheck, Award, GraduationCap, Image as ImageIcon, Plus, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/admin/states";
import { DraftWorkflowPanels, DraftWorkspaceLoading } from "@/components/admin/DraftWorkflowPanels";
import { MediaPickerModal } from "@/components/admin/MediaPickerModal";
import type { AwardEntry, EducationEntry } from "@/contexts/SiteConfigContext";
import { useSiteConfigDraft } from "@/hooks/useSiteConfigDraft";
import { SITE_CONFIG_SCOPE_PREVIEW_URL } from "@/lib/cms/siteConfigScopes";

const inputClass =
  "w-full rounded-lg border bg-background px-3.5 py-2 text-xs text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20";

/**
 * Doctor Profile workspace — same database draft workflow as Clinic Information (005c, scope 'doctor').
 * Live values change only when a Super Admin publishes an approved draft.
 */
export default function AdminDoctor() {
  const ws = useSiteConfigDraft("doctor");
  const { form, setForm } = ws;
  const [mediaPickerOpen, setMediaPickerOpen] = useState(false);

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

  const header = (
    <PageHeader
      title="Doctor profile"
      description="Manage doctor name, qualifications, biography, profile photo, experience statistics, and fellowships."
    />
  );

  if (!ws.configLoaded || ws.loading) {
    return (
      <div className="space-y-6">
        {header}
        <DraftWorkspaceLoading label="Doctor profile" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {header}

      <DraftWorkflowPanels
        label="Doctor profile"
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
        previewUrl={SITE_CONFIG_SCOPE_PREVIEW_URL.doctor}
        unsavedChanges={ws.unsavedChanges}
        changes={ws.pendingChanges}
        onSave={(s) => void ws.save(s)}
        onReview={(d, fb) => void ws.review(d, fb)}
        onPublish={() => void ws.publish()}
        onDiscard={ws.discardEdits}
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

          <div className="sm:col-span-2">
            <label htmlFor="doctor-philosophy" className="mb-1 block text-xs font-medium text-foreground">
              Doctor's Care Philosophy Quote (Displayed on /about)
            </label>
            <textarea
              id="doctor-philosophy"
              rows={2}
              value={form.philosophy}
              onChange={(e) => setForm({ ...form, philosophy: e.target.value })}
              className={inputClass}
            />
          </div>
        </div>
      </section>

      {/* International Fellowship Spotlight Card */}
      <section className="rounded-xl border bg-card p-5 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-display text-base font-bold text-foreground">
            International Fellowship Spotlight Card (/about)
          </h2>
          <label className="flex items-center gap-2 text-xs font-medium text-foreground cursor-pointer">
            <input
              type="checkbox"
              checked={form.showFellowshipCard ?? true}
              onChange={(e) => setForm({ ...form, showFellowshipCard: e.target.checked })}
              className="rounded border-border"
            />
            Show Fellowship Card on /about
          </label>
        </div>

        <div className="grid gap-4 sm:grid-cols-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-foreground">Flag / Badge Icon</label>
            <input
              type="text"
              value={form.fellowshipBadge ?? "🇰🇷"}
              onChange={(e) => setForm({ ...form, fellowshipBadge: e.target.value })}
              className={inputClass}
            />
          </div>
          <div className="sm:col-span-3">
            <label className="mb-1 block text-xs font-medium text-foreground">Fellowship Heading</label>
            <input
              type="text"
              value={form.fellowshipTitle ?? "International Fellowship — South Korea"}
              onChange={(e) => setForm({ ...form, fellowshipTitle: e.target.value })}
              className={inputClass}
            />
          </div>
          <div className="sm:col-span-2">
            <label className="mb-1 block text-xs font-medium text-foreground">Fellowship Subtitle (optional)</label>
            <input
              type="text"
              value={form.fellowshipSubtitle ?? ""}
              onChange={(e) => setForm({ ...form, fellowshipSubtitle: e.target.value })}
              className={inputClass}
            />
          </div>
          <div className="sm:col-span-2">
            <label className="mb-1 block text-xs font-medium text-foreground">
              Fellowship Photo / Operating Room Image URL
            </label>
            <input
              type="text"
              value={form.fellowshipImageUrl ?? ""}
              onChange={(e) => setForm({ ...form, fellowshipImageUrl: e.target.value })}
              placeholder="/images/fellowship-korea-operating-room.jpeg"
              className={inputClass}
            />
          </div>
          <div className="sm:col-span-4">
            <label className="mb-1 block text-xs font-medium text-foreground">Fellowship Description</label>
            <textarea
              rows={3}
              value={form.fellowshipDescription ?? ""}
              onChange={(e) => setForm({ ...form, fellowshipDescription: e.target.value })}
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
          <div>
            <label htmlFor="doc-google-rating" className="mb-1 block text-xs font-medium text-foreground">
              Google Rating (0–5)
            </label>
            <input
              id="doc-google-rating"
              type="number"
              step="0.1"
              min={0}
              max={5}
              value={form.googleRating}
              onChange={(e) => setForm({ ...form, googleRating: Number(e.target.value) || 0 })}
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="doc-google-reviews" className="mb-1 block text-xs font-medium text-foreground">
              Google Review Count
            </label>
            <input
              id="doc-google-reviews"
              type="number"
              min={0}
              value={form.googleReviewCount}
              onChange={(e) => setForm({ ...form, googleReviewCount: Number(e.target.value) || 0 })}
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="doc-languages" className="mb-1 block text-xs font-medium text-foreground">
              Languages Spoken (comma separated)
            </label>
            <input
              id="doc-languages"
              type="text"
              key={(form.languages ?? []).join("|")}
              defaultValue={(form.languages ?? []).join(", ")}
              onBlur={(e) =>
                setForm({
                  ...form,
                  languages: e.target.value
                    .split(",")
                    .map((l) => l.trim())
                    .filter(Boolean),
                })
              }
              className={inputClass}
            />
          </div>
        </div>
      </section>

      {/* Qualifications & Education */}
      <section className="rounded-xl border bg-card p-5 shadow-sm">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-3">
            <GraduationCap size={18} className="text-primary" aria-hidden="true" />
            <h2 className="font-display text-base font-bold text-foreground">Degrees & Fellowships</h2>
            <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer">
              <input
                type="checkbox"
                checked={form.showEducationSection ?? false}
                onChange={(e) => setForm({ ...form, showEducationSection: e.target.checked })}
                className="rounded border-border"
              />
              Display section on /about
            </label>
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
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-3">
            <Award size={18} className="text-primary" aria-hidden="true" />
            <h2 className="font-display text-base font-bold text-foreground">Awards & Recognitions</h2>
            <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer">
              <input
                type="checkbox"
                checked={form.showAwardsSection ?? false}
                onChange={(e) => setForm({ ...form, showAwardsSection: e.target.checked })}
                className="rounded border-border"
              />
              Display section on /about
            </label>
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

      {/* Professional Memberships */}
      <section className="rounded-xl border bg-card p-5 shadow-sm">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-display text-base font-bold text-foreground">
            Professional Memberships ({(form.memberships ?? []).length})
          </h2>
          <button
            type="button"
            onClick={() => setForm({ ...form, memberships: [...(form.memberships ?? []), "Indian Orthopaedic Association"] })}
            className="inline-flex items-center gap-1 rounded-lg border px-3 py-1.5 text-xs font-semibold text-primary hover:bg-secondary"
          >
            <Plus size={13} /> Add membership
          </button>
        </div>
        <div className="space-y-2">
          {(form.memberships ?? []).map((m, idx) => (
            <div key={idx} className="flex items-center gap-2">
              <input
                type="text"
                aria-label={`Membership ${idx + 1}`}
                value={m}
                onChange={(e) => {
                  const next = [...(form.memberships ?? [])];
                  next[idx] = e.target.value;
                  setForm({ ...form, memberships: next });
                }}
                className={inputClass}
              />
              <button
                type="button"
                onClick={() =>
                  setForm({
                    ...form,
                    memberships: (form.memberships ?? []).filter((_, i) => i !== idx),
                  })
                }
                aria-label={`Remove membership ${idx + 1}`}
                className="p-1.5 text-muted-foreground hover:text-destructive"
              >
                <Trash2 size={14} />
              </button>
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
