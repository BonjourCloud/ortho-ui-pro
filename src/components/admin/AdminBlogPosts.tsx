import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { X } from "lucide-react";
import RichTextEditor from "@/components/admin/RichTextEditor";
import { CollectionDraftList } from "@/components/admin/CollectionDraftList";
import { useCollectionDraft } from "@/hooks/useCollectionDraft";
import { newDraftItemId } from "@/lib/cms/collections";
import { listMediaAssets } from "@/lib/cms/repository";
import type { MediaAsset } from "@/lib/cms/types";
import type { Tables } from "@/integrations/supabase/types";

type BlogPost = Tables<"blog_posts">;

const emptyPost = {
  title: "", slug: "", excerpt: "", content: "", category: "",
  tags: [] as string[], read_time: 5, is_featured: false, published_at: new Date().toISOString(),
};

export default function AdminBlogPosts() {
  const ws = useCollectionDraft<BlogPost>("blog_posts");
  const [editing, setEditing] = useState<Partial<BlogPost> | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [tagsInput, setTagsInput] = useState("");
  const [mediaAssets, setMediaAssets] = useState<MediaAsset[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    void listMediaAssets().then((res) => setMediaAssets(res.assets));
  }, []);

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

  /** Records the edit in the draft changeset only — nothing live changes until approval and publishing. */
  const handleSave = () => {
    if (!editing?.title || !editing?.slug || !editing?.content) {
      toast({ title: "Error", description: "Title, slug, and content are required.", variant: "destructive" });
      return;
    }
    const payload = { ...editing, tags: tagsInput.split(",").map((t) => t.trim()).filter(Boolean) };
    ws.editItem({ ...payload, id: payload.id ?? newDraftItemId() } as BlogPost);
    setEditing(null);
    setIsNew(false);
    toast({ title: "Added to draft", description: "Save the draft and submit it for review. The live website is unchanged." });
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
            <RichTextEditor
              label="Article Content (Rich Text / HTML) *"
              value={editing.content || ""}
              onChange={(next) => setEditing({ ...editing, content: next })}
              mediaAssets={mediaAssets}
              rows={10}
              helpText="Use the formatting toolbar to add headings, bullet lists, links, and images from the Media Library."
            />
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
    <CollectionDraftList<BlogPost>
      ws={ws}
      title="Blog Posts"
      label="Blog posts"
      addLabel="Add Post"
      emptyText="No blog posts yet."
      previewUrl="/blog?preview=1"
      onAdd={startNew}
      onEdit={startEdit}
      renderSummary={(post) => (
        <div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-foreground">{post.title}</span>
            {post.is_featured && <span className="text-xs bg-accent/10 text-accent rounded-full px-2 py-0.5">Featured</span>}
          </div>
          <div className="text-xs text-muted-foreground">
            {post.category} • {post.views_count ?? 0} views • {post.read_time} min read
          </div>
        </div>
      )}
    />
  );
}
