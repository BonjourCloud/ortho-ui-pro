import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, X } from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";

type BlogPost = Tables<"blog_posts">;

const emptyPost = {
  title: "", slug: "", excerpt: "", content: "", category: "",
  tags: [] as string[], read_time: 5, is_featured: false, published_at: new Date().toISOString(),
};

export default function AdminBlogPosts() {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [editing, setEditing] = useState<Partial<BlogPost> | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [tagsInput, setTagsInput] = useState("");
  const { toast } = useToast();

  const load = async () => {
    const { data } = await supabase.from("blog_posts").select("*").order("published_at", { ascending: false });
    if (data) setPosts(data);
  };

  useEffect(() => { load(); }, []);

  const slugify = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

  const startEdit = (post: BlogPost) => {
    setEditing({ ...post });
    setTagsInput((post.tags || []).join(", "));
    setIsNew(false);
  };

  const startNew = () => {
    setEditing({ ...emptyPost });
    setTagsInput("");
    setIsNew(true);
  };

  const handleSave = async () => {
    if (!editing?.title || !editing?.slug || !editing?.content) {
      toast({ title: "Error", description: "Title, slug, and content are required.", variant: "destructive" });
      return;
    }
    const payload = { ...editing, tags: tagsInput.split(",").map((t) => t.trim()).filter(Boolean) };
    if (isNew) {
      const { error } = await supabase.from("blog_posts").insert(payload as any);
      if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    } else {
      const { error } = await supabase.from("blog_posts").update(payload as any).eq("id", editing.id!);
      if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    }
    toast({ title: "Saved!" });
    setEditing(null);
    setIsNew(false);
    load();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this blog post?")) return;
    await supabase.from("blog_posts").delete().eq("id", id);
    toast({ title: "Deleted" });
    load();
  };

  if (editing) {
    return (
      <div className="bg-card rounded-xl border p-6 max-w-2xl">
        <div className="flex items-center justify-between mb-6">
          <h3 className="font-display text-lg font-bold text-foreground">{isNew ? "Add Blog Post" : "Edit Blog Post"}</h3>
          <button onClick={() => { setEditing(null); setIsNew(false); }} className="text-muted-foreground hover:text-foreground"><X size={20} /></button>
        </div>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Title *</label>
            <input value={editing.title || ""} onChange={(e) => setEditing({ ...editing, title: e.target.value, slug: isNew ? slugify(e.target.value) : editing.slug })}
              className="w-full rounded-lg border bg-background px-4 py-2.5 text-sm text-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none" />
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Slug *</label>
              <input value={editing.slug || ""} onChange={(e) => setEditing({ ...editing, slug: e.target.value })}
                className="w-full rounded-lg border bg-background px-4 py-2.5 text-sm text-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Category</label>
              <input value={editing.category || ""} onChange={(e) => setEditing({ ...editing, category: e.target.value })}
                className="w-full rounded-lg border bg-background px-4 py-2.5 text-sm text-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Excerpt</label>
            <textarea value={editing.excerpt || ""} onChange={(e) => setEditing({ ...editing, excerpt: e.target.value })} rows={2}
              className="w-full rounded-lg border bg-background px-4 py-2.5 text-sm text-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none resize-none" />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Content (HTML) *</label>
            <textarea value={editing.content || ""} onChange={(e) => setEditing({ ...editing, content: e.target.value })} rows={10}
              className="w-full rounded-lg border bg-background px-4 py-2.5 text-sm text-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none resize-y font-mono text-xs" />
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Tags (comma-separated)</label>
              <input value={tagsInput} onChange={(e) => setTagsInput(e.target.value)}
                className="w-full rounded-lg border bg-background px-4 py-2.5 text-sm text-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Read Time (min)</label>
              <input type="number" value={editing.read_time || 5} onChange={(e) => setEditing({ ...editing, read_time: +e.target.value })}
                className="w-full rounded-lg border bg-background px-4 py-2.5 text-sm text-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none" />
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={editing.is_featured ?? false} onChange={(e) => setEditing({ ...editing, is_featured: e.target.checked })} className="rounded" /> Featured Post
          </label>
          <button onClick={handleSave} className="w-full rounded-lg bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground hover:opacity-90 transition-all">
            {isNew ? "Create Post" : "Update Post"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-display font-semibold text-foreground">Blog Posts ({posts.length})</h3>
        <button onClick={startNew}
          className="inline-flex items-center gap-1 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90">
          <Plus size={16} /> Add Post
        </button>
      </div>
      <div className="space-y-3">
        {posts.map((post) => (
          <div key={post.id} className="bg-card rounded-xl border p-4 flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-foreground">{post.title}</span>
                {post.is_featured && <span className="text-xs bg-accent/10 text-accent rounded-full px-2 py-0.5">Featured</span>}
              </div>
              <div className="text-xs text-muted-foreground">{post.category} • {post.views_count} views • {post.read_time} min read</div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => startEdit(post)} className="p-2 text-muted-foreground hover:text-primary"><Pencil size={16} /></button>
              <button onClick={() => handleDelete(post.id)} className="p-2 text-muted-foreground hover:text-destructive"><Trash2 size={16} /></button>
            </div>
          </div>
        ))}
        {posts.length === 0 && <p className="text-sm text-muted-foreground text-center py-8">No blog posts yet.</p>}
      </div>
    </div>
  );
}
