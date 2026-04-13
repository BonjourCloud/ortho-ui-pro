import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Pencil, Trash2, X, Save, Eye, EyeOff, Star } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Testimonial {
  id: string;
  name: string;
  rating: number;
  text: string;
  response: string | null;
  source: string | null;
  is_published: boolean | null;
  is_featured: boolean | null;
  sort_order: number | null;
  created_at: string | null;
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

export default function AdminTestimonials() {
  const [items, setItems] = useState<Testimonial[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const { toast } = useToast();

  const fetchItems = async () => {
    setLoading(true);
    const { data } = await supabase.from("testimonials").select("*").order("sort_order");
    if (data) setItems(data);
    setLoading(false);
  };

  useEffect(() => { fetchItems(); }, []);

  const startCreate = () => {
    setEditing("new");
    setForm(emptyForm);
  };

  const startEdit = (item: Testimonial) => {
    setEditing(item.id);
    setForm({
      name: item.name,
      rating: item.rating.toString(),
      text: item.text,
      response: item.response || "",
      source: item.source || "google",
      is_published: item.is_published ?? true,
      is_featured: item.is_featured ?? true,
    });
  };

  const handleSave = async () => {
    if (!form.name || !form.text) {
      toast({ title: "Error", description: "Name and review text are required", variant: "destructive" });
      return;
    }

    setSaving(true);
    const payload = {
      name: form.name,
      rating: parseInt(form.rating) || 5,
      text: form.text,
      response: form.response || null,
      source: form.source,
      is_published: form.is_published,
      is_featured: form.is_featured,
    };

    try {
      if (editing === "new") {
        const { error } = await supabase.from("testimonials").insert(payload);
        if (error) throw error;
        toast({ title: "Success", description: "Review added successfully" });
      } else {
        const { error } = await supabase.from("testimonials").update(payload).eq("id", editing!);
        if (error) throw error;
        toast({ title: "Success", description: "Review updated successfully" });
      }
      setEditing(null);
      fetchItems();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this review? This action cannot be undone.")) return;
    try {
      const { error } = await supabase.from("testimonials").delete().eq("id", id);
      if (error) throw error;
      toast({ title: "Success", description: "Review deleted successfully" });
      fetchItems();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const togglePublish = async (id: string, currentStatus: boolean | null) => {
    try {
      const { error } = await supabase.from("testimonials").update({ is_published: !currentStatus }).eq("id", id);
      if (error) throw error;
      toast({ title: "Success", description: `Review ${!currentStatus ? 'published' : 'unpublished'}` });
      fetchItems();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  if (loading) return <div className="text-center py-12 text-muted-foreground">Loading…</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-display font-semibold text-foreground">{items.length} Google Reviews</h3>
          <p className="text-xs text-muted-foreground mt-0.5">Manage patient testimonials and doctor responses</p>
        </div>
        <button onClick={startCreate} className="inline-flex items-center gap-1.5 text-sm font-medium bg-primary text-primary-foreground rounded-lg px-4 py-2 hover:opacity-90 transition-opacity">
          <Plus size={14} /> Add Review
        </button>
      </div>

      {editing && (
        <div className="bg-card rounded-xl border p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-medium text-foreground">{editing === "new" ? "New Review" : "Edit Review"}</h4>
            <button onClick={() => setEditing(null)} className="text-muted-foreground hover:text-foreground"><X size={16} /></button>
          </div>
          
          <div className="grid sm:grid-cols-2 gap-3">
            <input 
              placeholder="Reviewer Name *" 
              value={form.name} 
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="rounded-lg border bg-background px-3 py-2 text-sm focus:ring-2 focus:ring-primary/20 outline-none" 
            />
            <select 
              value={form.rating} 
              onChange={(e) => setForm({ ...form, rating: e.target.value })}
              className="rounded-lg border bg-background px-3 py-2 text-sm focus:ring-2 focus:ring-primary/20 outline-none">
              {[5,4,3,2,1].map(r => <option key={r} value={r}>{"★".repeat(r)} ({r} Stars)</option>)}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1.5">Review Text *</label>
            <textarea 
              placeholder="Patient's review..." 
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
              onChange={(e) => setForm({ ...form, source: e.target.value })}
              className="rounded-lg border bg-background px-3 py-2 text-sm focus:ring-2 focus:ring-primary/20 outline-none">
              <option value="google">Google</option>
              <option value="manual">Manual</option>
            </select>
          </div>

          <div className="flex items-center justify-end gap-2">
            <button 
              onClick={() => setEditing(null)}
              className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground rounded-lg px-4 py-2 transition-colors">
              Cancel
            </button>
            <button 
              onClick={handleSave} 
              disabled={!form.name || !form.text || saving}
              className="inline-flex items-center gap-1.5 text-sm font-medium bg-primary text-primary-foreground rounded-lg px-4 py-2 hover:opacity-90 disabled:opacity-50 transition-opacity">
              <Save size={14} /> {saving ? "Saving..." : "Save Review"}
            </button>
          </div>
        </div>
      )}

      <div className="bg-card rounded-xl border divide-y">
        {items.map((item) => (
          <div key={item.id} className="p-4">
            <div className="flex items-start justify-between gap-4 mb-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium text-foreground">{item.name}</span>
                  <div className="flex gap-0.5">
                    {[...Array(item.rating)].map((_, i) => (
                      <Star key={i} size={12} className="fill-accent text-accent" />
                    ))}
                  </div>
                  {item.source === 'google' && (
                    <span className="text-xs bg-blue-500/10 text-blue-600 rounded-full px-2 py-0.5">Google</span>
                  )}
                  {item.is_featured && (
                    <span className="text-xs bg-accent/10 text-accent rounded-full px-2 py-0.5">Featured</span>
                  )}
                  {!item.is_published && (
                    <span className="text-xs bg-muted text-muted-foreground rounded-full px-2 py-0.5">Unpublished</span>
                  )}
                </div>
                <p className="text-sm text-foreground mb-2">"{item.text}"</p>
                {item.response && (
                  <div className="bg-primary/5 rounded-lg p-2 mt-2">
                    <p className="text-xs font-medium text-primary mb-1">Doctor's Response:</p>
                    <p className="text-xs text-muted-foreground italic">"{item.response}"</p>
                  </div>
                )}
              </div>
              <div className="flex gap-1 shrink-0">
                <button 
                  onClick={() => togglePublish(item.id, item.is_published)}
                  className="p-1.5 text-muted-foreground hover:text-foreground"
                  title={item.is_published ? "Unpublish" : "Publish"}>
                  {item.is_published ? <Eye size={14} /> : <EyeOff size={14} />}
                </button>
                <button 
                  onClick={() => startEdit(item)} 
                  className="p-1.5 text-muted-foreground hover:text-foreground">
                  <Pencil size={14} />
                </button>
                <button 
                  onClick={() => handleDelete(item.id)} 
                  className="p-1.5 text-muted-foreground hover:text-destructive">
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          </div>
        ))}
        {items.length === 0 && (
          <div className="p-8 text-center text-muted-foreground">No reviews yet. Add your first Google review!</div>
        )}
      </div>
    </div>
  );
}
