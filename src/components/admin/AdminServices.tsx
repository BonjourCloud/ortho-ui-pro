import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, X } from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";

type Service = Tables<"services">;

const emptyService = {
  name: "", slug: "", category: "", body_part: "", short_description: "",
  cost_range: "", success_rate: "", patients_treated: 0, emi_available: true,
  insurance_covered: true, procedure_time: "", hospital_stay: "", recovery_time: "",
  full_recovery: "", sort_order: 0,
};

export default function AdminServices() {
  const [services, setServices] = useState<Service[]>([]);
  const [editing, setEditing] = useState<Partial<Service> | null>(null);
  const [isNew, setIsNew] = useState(false);
  const { toast } = useToast();

  const load = async () => {
    const { data } = await supabase.from("services").select("*").order("sort_order");
    if (data) setServices(data);
  };

  useEffect(() => { load(); }, []);

  const slugify = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

  const handleSave = async () => {
    if (!editing?.name || !editing?.slug) {
      toast({ title: "Error", description: "Name and slug are required.", variant: "destructive" });
      return;
    }
    if (isNew) {
      const { error } = await supabase.from("services").insert(editing as any);
      if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    } else {
      const { error } = await supabase.from("services").update(editing as any).eq("id", editing.id!);
      if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    }
    toast({ title: "Saved!" });
    setEditing(null);
    setIsNew(false);
    load();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this service?")) return;
    await supabase.from("services").delete().eq("id", id);
    toast({ title: "Deleted" });
    load();
  };

  if (editing) {
    return (
      <div className="bg-card rounded-xl border p-6 max-w-2xl">
        <div className="flex items-center justify-between mb-6">
          <h3 className="font-display text-lg font-bold text-foreground">{isNew ? "Add Service" : "Edit Service"}</h3>
          <button onClick={() => { setEditing(null); setIsNew(false); }} className="text-muted-foreground hover:text-foreground"><X size={20} /></button>
        </div>
        <div className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Name *</label>
              <input value={editing.name || ""} onChange={(e) => setEditing({ ...editing, name: e.target.value, slug: slugify(e.target.value) })}
                className="w-full rounded-lg border bg-background px-4 py-2.5 text-sm text-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Slug *</label>
              <input value={editing.slug || ""} onChange={(e) => setEditing({ ...editing, slug: e.target.value })}
                className="w-full rounded-lg border bg-background px-4 py-2.5 text-sm text-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none" />
            </div>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Category</label>
              <input value={editing.category || ""} onChange={(e) => setEditing({ ...editing, category: e.target.value })}
                className="w-full rounded-lg border bg-background px-4 py-2.5 text-sm text-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Body Part</label>
              <input value={editing.body_part || ""} onChange={(e) => setEditing({ ...editing, body_part: e.target.value })}
                className="w-full rounded-lg border bg-background px-4 py-2.5 text-sm text-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Short Description</label>
            <textarea value={editing.short_description || ""} onChange={(e) => setEditing({ ...editing, short_description: e.target.value })} rows={2}
              className="w-full rounded-lg border bg-background px-4 py-2.5 text-sm text-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none resize-none" />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Cost Range</label>
              <input value={editing.cost_range || ""} onChange={(e) => setEditing({ ...editing, cost_range: e.target.value })}
                className="w-full rounded-lg border bg-background px-4 py-2.5 text-sm text-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Success Rate</label>
              <input value={editing.success_rate || ""} onChange={(e) => setEditing({ ...editing, success_rate: e.target.value })}
                className="w-full rounded-lg border bg-background px-4 py-2.5 text-sm text-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Procedure Time</label>
              <input value={editing.procedure_time || ""} onChange={(e) => setEditing({ ...editing, procedure_time: e.target.value })}
                className="w-full rounded-lg border bg-background px-4 py-2.5 text-sm text-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Hospital Stay</label>
              <input value={editing.hospital_stay || ""} onChange={(e) => setEditing({ ...editing, hospital_stay: e.target.value })}
                className="w-full rounded-lg border bg-background px-4 py-2.5 text-sm text-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Patients Treated</label>
              <input type="number" value={editing.patients_treated || 0} onChange={(e) => setEditing({ ...editing, patients_treated: +e.target.value })}
                className="w-full rounded-lg border bg-background px-4 py-2.5 text-sm text-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Sort Order</label>
              <input type="number" value={editing.sort_order || 0} onChange={(e) => setEditing({ ...editing, sort_order: +e.target.value })}
                className="w-full rounded-lg border bg-background px-4 py-2.5 text-sm text-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none" />
            </div>
          </div>
          <div className="flex gap-3">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={editing.emi_available ?? true} onChange={(e) => setEditing({ ...editing, emi_available: e.target.checked })} className="rounded" /> EMI Available
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={editing.insurance_covered ?? true} onChange={(e) => setEditing({ ...editing, insurance_covered: e.target.checked })} className="rounded" /> Insurance Covered
            </label>
          </div>
          <button onClick={handleSave} className="w-full rounded-lg bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground hover:opacity-90 transition-all">
            {isNew ? "Create Service" : "Update Service"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-display font-semibold text-foreground">Services ({services.length})</h3>
        <button onClick={() => { setEditing({ ...emptyService }); setIsNew(true); }}
          className="inline-flex items-center gap-1 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90">
          <Plus size={16} /> Add Service
        </button>
      </div>
      <div className="space-y-3">
        {services.map((svc) => (
          <div key={svc.id} className="bg-card rounded-xl border p-4 flex items-center justify-between">
            <div>
              <div className="text-sm font-semibold text-foreground">{svc.name}</div>
              <div className="text-xs text-muted-foreground">{svc.category} • {svc.cost_range} • {svc.patients_treated} patients</div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setEditing({ ...svc })} className="p-2 text-muted-foreground hover:text-primary"><Pencil size={16} /></button>
              <button onClick={() => handleDelete(svc.id)} className="p-2 text-muted-foreground hover:text-destructive"><Trash2 size={16} /></button>
            </div>
          </div>
        ))}
        {services.length === 0 && <p className="text-sm text-muted-foreground text-center py-8">No services yet. Add your first service.</p>}
      </div>
    </div>
  );
}
