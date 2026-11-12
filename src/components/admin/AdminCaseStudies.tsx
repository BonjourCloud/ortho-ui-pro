import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { X } from "lucide-react";
import { CollectionDraftList } from "@/components/admin/CollectionDraftList";
import { useCollectionDraft } from "@/hooks/useCollectionDraft";
import { newDraftItemId } from "@/lib/cms/collections";
import type { Tables } from "@/integrations/supabase/types";

type CaseStudy = Tables<"case_studies">;

const emptyCaseStudy = {
  slug: "", patient_initials: "", age: 0, gender: "M", occupation: "",
  condition: "", procedure_name: "", surgery_type: "elective",
  hospital_stay_days: 1, follow_up_period: "", outcome_summary: "",
  pain_score_pre: 5, pain_score_post: 1, range_of_motion_pre: "",
  range_of_motion_post: "", testimonial: "", return_to_work: "",
  return_to_sports: "", is_featured: false, milestones: [] as CaseStudy["milestones"],
};

export default function AdminCaseStudies() {
  const ws = useCollectionDraft<CaseStudy>("case_studies");
  const [editing, setEditing] = useState<Partial<CaseStudy> | null>(null);
  const [isNew, setIsNew] = useState(false);
  const { toast } = useToast();

  const slugify = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

  /** Records the edit in the draft changeset only — nothing live changes until approval and publishing. */
  const handleSave = () => {
    if (!editing?.condition || !editing?.slug) {
      toast({ title: "Error", description: "Condition and slug are required.", variant: "destructive" });
      return;
    }
    ws.editItem({ ...editing, id: editing.id ?? newDraftItemId() } as CaseStudy);
    setEditing(null);
    setIsNew(false);
    toast({ title: "Added to draft", description: "Save the draft and submit it for review. The live website is unchanged." });
  };

  if (editing) {
    return (
      <div className="bg-card rounded-xl border p-6 max-w-2xl">
        <div className="flex items-center justify-between mb-6">
          <h3 className="font-display text-lg font-bold text-foreground">{isNew ? "Add Case Study" : "Edit Case Study"}</h3>
          <button onClick={() => { setEditing(null); setIsNew(false); }} className="text-muted-foreground hover:text-foreground"><X size={20} /></button>
        </div>
        <div className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Condition *</label>
              <input value={editing.condition || ""} onChange={(e) => setEditing({ ...editing, condition: e.target.value, slug: isNew ? slugify(e.target.value) : editing.slug })}
                className="w-full rounded-lg border bg-background px-4 py-2.5 text-sm text-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Slug *</label>
              <input value={editing.slug || ""} onChange={(e) => setEditing({ ...editing, slug: e.target.value })}
                className="w-full rounded-lg border bg-background px-4 py-2.5 text-sm text-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none" />
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Initials</label>
              <input value={editing.patient_initials || ""} onChange={(e) => setEditing({ ...editing, patient_initials: e.target.value })} maxLength={5}
                className="w-full rounded-lg border bg-background px-4 py-2.5 text-sm text-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Age</label>
              <input type="number" value={editing.age || 0} onChange={(e) => setEditing({ ...editing, age: +e.target.value })}
                className="w-full rounded-lg border bg-background px-4 py-2.5 text-sm text-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Gender</label>
              <select value={editing.gender || "M"} onChange={(e) => setEditing({ ...editing, gender: e.target.value })}
                className="w-full rounded-lg border bg-background px-4 py-2.5 text-sm text-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none">
                <option value="M">Male</option><option value="F">Female</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Occupation</label>
              <input value={editing.occupation || ""} onChange={(e) => setEditing({ ...editing, occupation: e.target.value })}
                className="w-full rounded-lg border bg-background px-4 py-2.5 text-sm text-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none" />
            </div>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Procedure Name</label>
              <input value={editing.procedure_name || ""} onChange={(e) => setEditing({ ...editing, procedure_name: e.target.value })}
                className="w-full rounded-lg border bg-background px-4 py-2.5 text-sm text-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Surgery Type</label>
              <select value={editing.surgery_type || "elective"} onChange={(e) => setEditing({ ...editing, surgery_type: e.target.value })}
                className="w-full rounded-lg border bg-background px-4 py-2.5 text-sm text-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none">
                <option value="elective">Elective</option><option value="minimally_invasive">Minimally Invasive</option><option value="emergency">Emergency</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Outcome Summary</label>
            <textarea value={editing.outcome_summary || ""} onChange={(e) => setEditing({ ...editing, outcome_summary: e.target.value })} rows={3}
              className="w-full rounded-lg border bg-background px-4 py-2.5 text-sm text-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none resize-none" />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Pain Pre</label>
              <input type="number" min={0} max={10} value={editing.pain_score_pre || 0} onChange={(e) => setEditing({ ...editing, pain_score_pre: +e.target.value })}
                className="w-full rounded-lg border bg-background px-4 py-2.5 text-sm text-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Pain Post</label>
              <input type="number" min={0} max={10} value={editing.pain_score_post || 0} onChange={(e) => setEditing({ ...editing, pain_score_post: +e.target.value })}
                className="w-full rounded-lg border bg-background px-4 py-2.5 text-sm text-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">ROM Pre</label>
              <input value={editing.range_of_motion_pre || ""} onChange={(e) => setEditing({ ...editing, range_of_motion_pre: e.target.value })}
                className="w-full rounded-lg border bg-background px-4 py-2.5 text-sm text-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">ROM Post</label>
              <input value={editing.range_of_motion_post || ""} onChange={(e) => setEditing({ ...editing, range_of_motion_post: e.target.value })}
                className="w-full rounded-lg border bg-background px-4 py-2.5 text-sm text-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Testimonial</label>
            <textarea value={editing.testimonial || ""} onChange={(e) => setEditing({ ...editing, testimonial: e.target.value })} rows={2}
              className="w-full rounded-lg border bg-background px-4 py-2.5 text-sm text-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none resize-none" />
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Return to Work</label>
              <input value={editing.return_to_work || ""} onChange={(e) => setEditing({ ...editing, return_to_work: e.target.value })}
                className="w-full rounded-lg border bg-background px-4 py-2.5 text-sm text-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Return to Sports</label>
              <input value={editing.return_to_sports || ""} onChange={(e) => setEditing({ ...editing, return_to_sports: e.target.value })}
                className="w-full rounded-lg border bg-background px-4 py-2.5 text-sm text-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none" />
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={editing.is_featured ?? false} onChange={(e) => setEditing({ ...editing, is_featured: e.target.checked })} className="rounded" /> Featured
          </label>
          <button onClick={handleSave} className="w-full rounded-lg bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground hover:opacity-90 transition-all">
            {isNew ? "Create Case Study" : "Update Case Study"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <CollectionDraftList<CaseStudy>
      ws={ws}
      title="Case Studies"
      label="Case studies"
      addLabel="Add Case Study"
      emptyText="No case studies yet."
      previewUrl="/case-studies?preview=1"
      onAdd={() => {
        setEditing({ ...emptyCaseStudy });
        setIsNew(true);
      }}
      onEdit={(cs) => {
        setEditing({ ...cs });
        setIsNew(false);
      }}
      renderSummary={(cs) => (
        <div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-foreground">{cs.condition}</span>
            {cs.is_featured && <span className="text-xs bg-accent/10 text-accent rounded-full px-2 py-0.5">Featured</span>}
          </div>
          <div className="text-xs text-muted-foreground">
            {cs.patient_initials} • Age {cs.age} • Pain {cs.pain_score_pre}→{cs.pain_score_post}
          </div>
        </div>
      )}
    />
  );
}
