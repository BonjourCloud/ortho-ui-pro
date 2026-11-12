import { useState } from "react";
import { X, Save, Eye, EyeOff, Star } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { CollectionDraftList } from "@/components/admin/CollectionDraftList";
import { useCollectionDraft } from "@/hooks/useCollectionDraft";
import { newDraftItemId } from "@/lib/cms/collections";
import { SITE_LABEL_DEFAULTS } from "@/lib/cms/siteLabels";

interface Testimonial {
  [key: string]: unknown;
  id: string;
  name: string;
  rating: number;
  text: string;
  response: string | null;
  source: string | null;
  is_published: boolean | null;
  is_featured: boolean | null;
  sort_order: number | null;
  created_at?: string | null;
}

const emptyForm = {
  name: "",
  rating: "5",
  text: "",
  response: "",
  source: "google",
  is_published: true,
  is_featured: true,
};

/**
 * Patient testimonials. Adding, editing, hiding/showing and removing are all draft changes in the
 * `testimonials` changeset (migration 005d); the live list changes only after approval and publishing.
 */
export default function AdminTestimonials() {
  const ws = useCollectionDraft<Testimonial>("testimonials");
  const [editing, setEditing] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const { toast } = useToast();

  const startCreate = () => {
    setEditing("new");
    setForm(emptyForm);
  };

  const startEdit = (item: Testimonial) => {
    setEditing(item.id);
    setForm({
      name: item.name,
      rating: String(item.rating ?? 5),
      text: item.text,
      response: item.response || "",
      source: item.source || "google",
      is_published: item.is_published ?? true,
      is_featured: item.is_featured ?? true,
    });
  };

  const handleSave = () => {
    if (!form.name || !form.text) {
      toast({ title: "Error", description: "Name and review text are required", variant: "destructive" });
      return;
    }
    const existing = editing && editing !== "new" ? ws.rows.find((r) => r.id === editing) : undefined;
    ws.editItem({
      ...(existing ?? {}),
      id: existing?.id ?? newDraftItemId(),
      name: form.name,
      rating: parseInt(form.rating, 10) || 5,
      text: form.text,
      response: form.response || null,
      source: form.source,
      is_published: form.is_published,
      is_featured: form.is_featured,
      sort_order: existing?.sort_order ?? ws.rows.length + 1,
    } as Testimonial);
    setEditing(null);
    toast({ title: "Added to draft", description: "Save the draft and submit it for review. The live website is unchanged." });
  };

  const toggleVisibility = (item: Testimonial) => {
    ws.editItem({ ...item, is_published: !item.is_published });
  };

  return (
    <div className="space-y-4">
      {editing && (
        <div className="bg-card rounded-xl border p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-medium text-foreground">{editing === "new" ? "New Review" : "Edit Review"}</h4>
            <button onClick={() => setEditing(null)} aria-label="Close" className="text-muted-foreground hover:text-foreground">
              <X size={16} />
            </button>
          </div>

          <div className="grid sm:grid-cols-2 gap-3">
            <input
              placeholder="Reviewer Name *"
              aria-label="Reviewer name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="rounded-lg border bg-background px-3 py-2 text-sm focus:ring-2 focus:ring-primary/20 outline-none"
            />
            <select
              value={form.rating}
              aria-label="Rating"
              onChange={(e) => setForm({ ...form, rating: e.target.value })}
              className="rounded-lg border bg-background px-3 py-2 text-sm focus:ring-2 focus:ring-primary/20 outline-none"
            >
              {[5, 4, 3, 2, 1].map((r) => (
                <option key={r} value={r}>
                  {"★".repeat(r)} ({r} Stars)
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1.5">Review Text *</label>
            <textarea
              placeholder="Patient's review..."
              aria-label="Review text"
              value={form.text}
              onChange={(e) => setForm({ ...form, text: e.target.value })}
              rows={3}
              className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:ring-2 focus:ring-primary/20 outline-none resize-none"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1.5">Doctor's Response (Optional)</label>
            <textarea
              placeholder="Your response to the review..."
              value={form.response}
              onChange={(e) => setForm({ ...form, response: e.target.value })}
              rows={2}
              className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:ring-2 focus:ring-primary/20 outline-none resize-none"
            />
          </div>

          <div className="grid sm:grid-cols-3 gap-3">
            <label className="flex items-center gap-2 text-sm text-foreground cursor-pointer">
              <input
                type="checkbox"
                checked={form.is_published as boolean}
                onChange={(e) => setForm({ ...form, is_published: e.target.checked })}
                className="rounded"
              />
              Published
            </label>
            <label className="flex items-center gap-2 text-sm text-foreground cursor-pointer">
              <input
                type="checkbox"
                checked={form.is_featured as boolean}
                onChange={(e) => setForm({ ...form, is_featured: e.target.checked })}
                className="rounded"
              />
              Featured
            </label>
            <select
              value={form.source}
              aria-label="Source"
              onChange={(e) => setForm({ ...form, source: e.target.value })}
              className="rounded-lg border bg-background px-3 py-2 text-sm focus:ring-2 focus:ring-primary/20 outline-none"
            >
              <option value="google">Google</option>
              <option value="manual">Manual</option>
            </select>
          </div>

          <div className="flex items-center justify-end gap-2">
            <button
              onClick={() => setEditing(null)}
              className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground rounded-lg px-4 py-2 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={!form.name || !form.text}
              className="inline-flex items-center gap-1.5 text-sm font-medium bg-primary text-primary-foreground rounded-lg px-4 py-2 hover:opacity-90 disabled:opacity-50 transition-opacity"
            >
              <Save size={14} /> Save to draft
            </button>
          </div>
        </div>
      )}

      <CollectionDraftList<Testimonial>
        ws={ws}
        title="Google Reviews"
        label="Testimonials"
        addLabel="Add Review"
        emptyText="No reviews yet. Add your first Google review!"
        previewUrl="/?preview=1"
        onAdd={startCreate}
        onEdit={startEdit}
        renderActions={(item) => (
          <button
            type="button"
            onClick={() => toggleVisibility(item)}
            className="p-1.5 text-muted-foreground hover:text-foreground"
            title={item.is_published ? "Hide on website (draft)" : "Show on website (draft)"}
            aria-label={item.is_published ? "Hide on website (draft)" : "Show on website (draft)"}
          >
            {item.is_published ? <Eye size={14} /> : <EyeOff size={14} />}
          </button>
        )}
        renderSummary={(item) => (
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <span className="font-medium text-foreground">{item.name}</span>
              <div className="flex gap-0.5">
                {[...Array(Number(item.rating) || 0)].map((_, i) => (
                  <Star key={i} size={12} className="fill-accent text-accent" />
                ))}
              </div>
              {item.source === "google" && (
                <span className="text-xs bg-blue-500/10 text-blue-600 rounded-full px-2 py-0.5">Google</span>
              )}
              {item.is_featured && <span className="text-xs bg-accent/10 text-accent rounded-full px-2 py-0.5">Featured</span>}
              {!item.is_published && (
                <span className="text-xs bg-muted text-muted-foreground rounded-full px-2 py-0.5">Unpublished</span>
              )}
            </div>
            <p className="text-sm text-foreground mb-2">"{item.text}"</p>
            {item.response && (
              <div className="bg-primary/5 rounded-lg p-2 mt-2">
                <p className="text-xs font-medium text-primary mb-1">{SITE_LABEL_DEFAULTS.reviewDoctorResponseLabel}</p>
                <p className="text-xs text-muted-foreground italic">"{item.response}"</p>
              </div>
            )}
          </div>
        )}
      />
    </div>
  );
}
