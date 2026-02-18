import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Pencil, Trash2, X, Save } from "lucide-react";

interface Testimonial {
  id: string;
  patient_name: string;
  initials: string;
  age: number | null;
  gender: string | null;
  occupation: string | null;
  condition: string;
  rating: number;
  location: string | null;
  text: string;
  is_featured: boolean | null;
  sort_order: number | null;
}

const emptyForm = {
  patient_name: "", initials: "", age: "", gender: "", occupation: "",
  condition: "", rating: "5", location: "", text: "", is_featured: true,
};

export default function AdminTestimonials() {
  const [items, setItems] = useState<Testimonial[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);

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
      patient_name: item.patient_name,
      initials: item.initials,
      age: item.age?.toString() || "",
      gender: item.gender || "",
      occupation: item.occupation || "",
      condition: item.condition,
      rating: item.rating.toString(),
      location: item.location || "",
      text: item.text,
      is_featured: item.is_featured ?? true,
    });
  };

  const handleSave = async () => {
    const payload = {
      patient_name: form.patient_name,
      initials: form.initials,
      age: form.age ? parseInt(form.age) : null,
      gender: form.gender || null,
      occupation: form.occupation || null,
      condition: form.condition,
      rating: parseInt(form.rating) || 5,
      location: form.location || null,
      text: form.text,
      is_featured: form.is_featured,
    };

    if (editing === "new") {
      await supabase.from("testimonials").insert(payload);
    } else {
      await supabase.from("testimonials").update(payload).eq("id", editing!);
    }
    setEditing(null);
    fetchItems();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this testimonial?")) return;
    await supabase.from("testimonials").delete().eq("id", id);
    fetchItems();
  };

  if (loading) return <div className="text-center py-12 text-muted-foreground">Loading…</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-display font-semibold text-foreground">{items.length} Testimonials</h3>
        <button onClick={startCreate} className="inline-flex items-center gap-1.5 text-sm font-medium bg-primary text-primary-foreground rounded-lg px-4 py-2 hover:opacity-90 transition-opacity">
          <Plus size={14} /> Add
        </button>
      </div>

      {editing && (
        <div className="bg-card rounded-xl border p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-medium text-foreground">{editing === "new" ? "New Testimonial" : "Edit Testimonial"}</h4>
            <button onClick={() => setEditing(null)} className="text-muted-foreground hover:text-foreground"><X size={16} /></button>
          </div>
          <div className="grid sm:grid-cols-3 gap-3">
            <input placeholder="Patient Name *" value={form.patient_name} onChange={(e) => setForm({ ...form, patient_name: e.target.value })}
              className="rounded-lg border bg-background px-3 py-2 text-sm focus:ring-2 focus:ring-primary/20 outline-none" />
            <input placeholder="Initials (e.g. R.K.)" value={form.initials} onChange={(e) => setForm({ ...form, initials: e.target.value })}
              className="rounded-lg border bg-background px-3 py-2 text-sm focus:ring-2 focus:ring-primary/20 outline-none" />
            <input placeholder="Age" type="number" value={form.age} onChange={(e) => setForm({ ...form, age: e.target.value })}
              className="rounded-lg border bg-background px-3 py-2 text-sm focus:ring-2 focus:ring-primary/20 outline-none" />
          </div>
          <div className="grid sm:grid-cols-3 gap-3">
            <select value={form.gender} onChange={(e) => setForm({ ...form, gender: e.target.value })}
              className="rounded-lg border bg-background px-3 py-2 text-sm focus:ring-2 focus:ring-primary/20 outline-none">
              <option value="">Gender</option><option value="M">Male</option><option value="F">Female</option>
            </select>
            <input placeholder="Occupation" value={form.occupation} onChange={(e) => setForm({ ...form, occupation: e.target.value })}
              className="rounded-lg border bg-background px-3 py-2 text-sm focus:ring-2 focus:ring-primary/20 outline-none" />
            <input placeholder="Location" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })}
              className="rounded-lg border bg-background px-3 py-2 text-sm focus:ring-2 focus:ring-primary/20 outline-none" />
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <input placeholder="Condition *" value={form.condition} onChange={(e) => setForm({ ...form, condition: e.target.value })}
              className="rounded-lg border bg-background px-3 py-2 text-sm focus:ring-2 focus:ring-primary/20 outline-none" />
            <select value={form.rating} onChange={(e) => setForm({ ...form, rating: e.target.value })}
              className="rounded-lg border bg-background px-3 py-2 text-sm focus:ring-2 focus:ring-primary/20 outline-none">
              {[5,4,3,2,1].map(r => <option key={r} value={r}>{r} Stars</option>)}
            </select>
          </div>
          <textarea placeholder="Testimonial text *" value={form.text} onChange={(e) => setForm({ ...form, text: e.target.value })} rows={3}
            className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:ring-2 focus:ring-primary/20 outline-none resize-none" />
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 text-sm text-muted-foreground">
              <input type="checkbox" checked={form.is_featured as boolean} onChange={(e) => setForm({ ...form, is_featured: e.target.checked })} className="rounded" />
              Featured
            </label>
            <button onClick={handleSave} disabled={!form.patient_name || !form.initials || !form.condition || !form.text}
              className="inline-flex items-center gap-1.5 text-sm font-medium bg-primary text-primary-foreground rounded-lg px-4 py-2 hover:opacity-90 disabled:opacity-50 transition-opacity">
              <Save size={14} /> Save
            </button>
          </div>
        </div>
      )}

      <div className="bg-card rounded-xl border divide-y">
        {items.map((item) => (
          <div key={item.id} className="p-4 flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-medium text-foreground">{item.patient_name}</span>
                <span className="text-xs text-muted-foreground">{item.age && `${item.age}y`} {item.gender} • {item.location}</span>
                {item.is_featured && <span className="text-xs bg-accent/10 text-accent rounded-full px-2 py-0.5">Featured</span>}
              </div>
              <div className="text-xs text-muted-foreground mb-1">{item.condition} • {"★".repeat(item.rating)}</div>
              <p className="text-sm text-muted-foreground italic truncate">"{item.text}"</p>
            </div>
            <div className="flex gap-1 shrink-0">
              <button onClick={() => startEdit(item)} className="p-1.5 text-muted-foreground hover:text-foreground"><Pencil size={14} /></button>
              <button onClick={() => handleDelete(item.id)} className="p-1.5 text-muted-foreground hover:text-destructive"><Trash2 size={14} /></button>
            </div>
          </div>
        ))}
        {items.length === 0 && <div className="p-8 text-center text-muted-foreground">No testimonials yet.</div>}
      </div>
    </div>
  );
}
