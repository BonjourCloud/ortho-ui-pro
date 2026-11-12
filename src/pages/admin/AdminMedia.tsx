import { useEffect, useState } from "react";
import { Upload, Trash2, Copy, Check, Image as ImageIcon, Video, Lock, Pencil, RefreshCw, X } from "lucide-react";
import { PageHeader } from "@/components/admin/states";
import { useAuth } from "@/contexts/AuthContext";
import {
  deleteMediaAsset,
  listMediaAssets,
  replaceMediaAssetFile,
  updateMediaAssetMetadata,
  uploadMediaAsset,
} from "@/lib/cms/repository";
import type { MediaAsset, MediaCategory, MediaType } from "@/lib/cms/types";
import { MEDIA_ACCEPT_ATTR, MEDIA_ALLOWED_DESCRIPTION } from "@/lib/cms/types";

const CATEGORIES: { value: MediaCategory | "all"; label: string }[] = [
  { value: "all", label: "All categories" },
  { value: "hero", label: "Hero & Banners" },
  { value: "doctor", label: "Doctor Photos" },
  { value: "treatments", label: "Treatments" },
  { value: "clinic", label: "Clinic Photos" },
  { value: "testimonials", label: "Testimonials & Videos" },
  { value: "general", label: "General" },
];

export default function AdminMedia() {
  const { can } = useAuth();
  const canUpload = can("media.upload");
  const canDelete = can("media.delete");

  const [assets, setAssets] = useState<MediaAsset[]>([]);
  const [schemaReady, setSchemaReady] = useState(true);
  const [filterType, setFilterType] = useState<MediaType | "all">("all");
  const [filterCategory, setFilterCategory] = useState<MediaCategory | "all">("all");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<MediaAsset | null>(null);

  const [uploadCategory, setUploadCategory] = useState<MediaCategory>("general");
  const [altText, setAltText] = useState("");
  const [caption, setCaption] = useState("");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const [editAlt, setEditAlt] = useState("");
  const [editCaption, setEditCaption] = useState("");
  const [editCategory, setEditCategory] = useState<MediaCategory>("general");
  const [savingMeta, setSavingMeta] = useState(false);

  const openEditAsset = (asset: MediaAsset) => {
    setSelected(asset);
    setEditAlt(asset.altText);
    setEditCaption(asset.caption);
    setEditCategory(asset.category);
  };

  const handleSaveMetadata = async () => {
    if (!selected) return;
    setSavingMeta(true);
    setError(null);
    setNotice(null);
    const res = await updateMediaAssetMetadata({
      assetId: selected.id,
      altText: editAlt,
      caption: editCaption,
      category: editCategory,
    });
    setSavingMeta(false);
    if (!res.ok) {
      setError(res.error ?? "Failed to update media metadata.");
      return;
    }
    const updated: MediaAsset = {
      ...selected,
      altText: editAlt.trim(),
      caption: editCaption.trim(),
      category: editCategory,
    };
    setAssets((prev) => prev.map((a) => (a.id === selected.id ? updated : a)));
    setSelected(updated);
    setNotice(`Updated alt text, caption, and category for "${selected.fileName}".`);
  };

  const handleReplaceFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selected) return;
    setError(null);
    setNotice(null);
    setSavingMeta(true);
    const res = await replaceMediaAssetFile({ asset: selected, file });
    setSavingMeta(false);
    e.target.value = "";
    if (!res.ok || !res.asset) {
      setError(res.error ?? "Failed to replace media file.");
      return;
    }
    // The replacement is a NEW asset; the original stays in the library and on any page using it.
    const previous = selected;
    const replacement = res.asset;
    setAssets((prev) => [replacement, ...prev]);
    openEditAsset(replacement);
    setNotice(
      `Uploaded "${replacement.fileName}" as a new version of "${previous.fileName}". Pages using the old file keep showing it until the new file is selected there and that change is approved.` +
        (res.persistedToDatabase ? "" : " (Session preview only: the storage bucket is not available yet.)"),
    );
  };

  useEffect(() => {
    void listMediaAssets().then(({ assets: list, schemaReady: ready }) => {
      setAssets(list);
      setSchemaReady(ready);
    });
  }, []);

  const filtered = assets.filter((a) => {
    if (filterType !== "all" && a.mediaType !== filterType) return false;
    if (filterCategory !== "all" && a.category !== filterCategory) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return (
        a.fileName.toLowerCase().includes(q) ||
        a.altText.toLowerCase().includes(q) ||
        a.caption.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    setNotice(null);
    setUploading(true);
    const res = await uploadMediaAsset({
      file,
      altText,
      caption,
      category: uploadCategory,
    });
    setUploading(false);
    e.target.value = "";

    if (!res.ok || !res.asset) {
      setError(res.error ?? "Upload failed.");
      return;
    }

    setAssets((prev) => [res.asset!, ...prev]);
    setSelected(res.asset);
    setAltText("");
    setCaption("");
    setNotice(
      res.persistedToDatabase
        ? `Uploaded "${res.asset.fileName}" to Media Library.`
        : `Uploaded "${res.asset.fileName}" in session preview (waiting for Migration 004 storage bucket).`,
    );
  };

  const handleDelete = async (asset: MediaAsset) => {
    setError(null);
    setNotice(null);
    const res = await deleteMediaAsset({ asset, canDelete });
    if (!res.ok) {
      setError(res.error ?? "Could not delete media.");
      return;
    }
    setAssets((prev) => prev.filter((a) => a.id !== asset.id));
    if (selected?.id === asset.id) setSelected(null);
    setNotice(`Deleted "${asset.fileName}".`);
  };

  const handleCopyUrl = (asset: MediaAsset) => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      void navigator.clipboard.writeText(asset.publicUrl);
    }
    setCopiedId(asset.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Media library"
        description={`Upload and manage website images and videos (${MEDIA_ALLOWED_DESCRIPTION}).`}
      />

      {!schemaReady && (
        <div role="status" className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3.5 text-xs text-amber-800 dark:text-amber-300">
          <strong>Database status:</strong> Existing static website images and videos are available below. Live cloud uploads to <code className="font-mono">cms-media</code> and <code className="font-mono">public.media_assets</code> are staged in session until Migration 004 is applied on staging.
        </div>
      )}

      {error && (
        <div role="alert" className="rounded-xl bg-destructive/10 p-3.5 text-xs font-medium text-destructive">
          {error}
        </div>
      )}

      {notice && (
        <div role="status" className="rounded-xl bg-primary/10 p-3.5 text-xs font-medium text-primary">
          {notice}
        </div>
      )}

      {/* Upload Card */}
      {canUpload && (
        <section aria-label="Upload new media" className="rounded-xl border bg-card p-5 shadow-sm">
          <h2 className="font-display text-base font-bold text-foreground">Upload image or video</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Always provide clear alt text so patients using screen readers and search engines understand the media.
          </p>

          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <div>
              <label htmlFor="media-alt-input" className="mb-1 block text-xs font-medium text-foreground">
                Alt text (accessibility & SEO)
              </label>
              <input
                id="media-alt-input"
                type="text"
                value={altText}
                onChange={(e) => setAltText(e.target.value)}
                placeholder="e.g. Dr. Srivanth examining a knee X-ray"
                className="w-full rounded-lg border bg-background px-3 py-2 text-xs text-foreground outline-none focus:border-primary"
              />
            </div>

            <div>
              <label htmlFor="media-caption-input" className="mb-1 block text-xs font-medium text-foreground">
                Caption (optional)
              </label>
              <input
                id="media-caption-input"
                type="text"
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                placeholder="Short caption shown below image/video"
                className="w-full rounded-lg border bg-background px-3 py-2 text-xs text-foreground outline-none focus:border-primary"
              />
            </div>

            <div>
              <label htmlFor="media-category-select" className="mb-1 block text-xs font-medium text-foreground">
                Category
              </label>
              <select
                id="media-category-select"
                value={uploadCategory}
                onChange={(e) => setUploadCategory(e.target.value as MediaCategory)}
                className="w-full rounded-lg border bg-background px-3 py-2 text-xs text-foreground"
              >
                {CATEGORIES.filter((c) => c.value !== "all").map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="mt-4">
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-xs font-semibold text-primary-foreground transition-opacity hover:opacity-90">
              <Upload size={14} aria-hidden="true" />
              {uploading ? "Uploading…" : "Choose file to upload"}
              <input
                data-testid="media-file-input"
                type="file"
                accept={MEDIA_ACCEPT_ATTR}
                onChange={handleUpload}
                className="sr-only"
              />
            </label>
          </div>
        </section>
      )}

      {/* Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-card p-4">
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="search"
            placeholder="Search by filename, alt text, or caption…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-64 rounded-lg border bg-background px-3 py-1.5 text-xs text-foreground outline-none focus:border-primary"
          />
          <select
            aria-label="Filter by media type"
            value={filterType}
            onChange={(e) => setFilterType(e.target.value as MediaType | "all")}
            className="rounded-lg border bg-background px-3 py-1.5 text-xs text-foreground"
          >
            <option value="all">All types</option>
            <option value="image">Images</option>
            <option value="video">Videos</option>
          </select>
          <select
            aria-label="Filter by category"
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value as MediaCategory | "all")}
            className="rounded-lg border bg-background px-3 py-1.5 text-xs text-foreground"
          >
            {CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        </div>

        <span className="text-xs text-muted-foreground">
          Showing {filtered.length} of {assets.length} items
        </span>
      </div>

      {/* Selected Media Edit / Replacement Panel */}
      {selected && (
        <section
          aria-label="Edit or replace selected media"
          className="rounded-xl border-2 border-primary/30 bg-card p-5 shadow-sm space-y-4"
        >
          <div className="flex items-center justify-between border-b pb-3">
            <div>
              <h2 className="font-display text-base font-bold text-foreground">
                Edit & Replace Media — {selected.fileName}
              </h2>
              <p className="text-xs text-muted-foreground">
                Update alt text, caption, category organization, or replace the file. Replacement creates a new versioned storage path so other pages using the previous URL remain completely unaffected.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setSelected(null)}
              className="rounded-lg p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground"
            >
              <X size={16} />
            </button>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div className="flex flex-col items-center justify-center rounded-xl border bg-secondary/30 p-3">
              {selected.mediaType === "image" ? (
                <img
                  src={selected.publicUrl}
                  alt={selected.altText || selected.fileName}
                  className="max-h-44 rounded-lg object-contain"
                />
              ) : (
                <video src={selected.publicUrl} controls className="max-h-44 rounded-lg" />
              )}
              <code className="mt-2 max-w-full truncate text-[10px] text-muted-foreground">
                {selected.publicUrl}
              </code>
            </div>

            <div className="md:col-span-2 space-y-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-medium text-foreground">Alt Text</label>
                  <input
                    type="text"
                    value={editAlt}
                    onChange={(e) => setEditAlt(e.target.value)}
                    className="w-full rounded-lg border bg-background px-3 py-2 text-xs text-foreground"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-foreground">Category Organization</label>
                  <select
                    value={editCategory}
                    onChange={(e) => setEditCategory(e.target.value as MediaCategory)}
                    className="w-full rounded-lg border bg-background px-3 py-2 text-xs text-foreground"
                  >
                    {CATEGORIES.filter((c) => c.value !== "all").map((c) => (
                      <option key={c.value} value={c.value}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <label className="mb-1 block text-xs font-medium text-foreground">Caption</label>
                  <input
                    type="text"
                    value={editCaption}
                    onChange={(e) => setEditCaption(e.target.value)}
                    className="w-full rounded-lg border bg-background px-3 py-2 text-xs text-foreground"
                  />
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 pt-1">
                <button
                  type="button"
                  disabled={savingMeta}
                  onClick={() => void handleSaveMetadata()}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50"
                >
                  <Check size={14} /> Save Details
                </button>
                {canUpload && (
                  <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border bg-secondary px-3.5 py-2 text-xs font-semibold text-foreground hover:bg-secondary/80">
                    <RefreshCw size={13} /> Replace File
                    <input
                      type="file"
                      accept={MEDIA_ACCEPT_ATTR}
                      onChange={handleReplaceFile}
                      className="sr-only"
                    />
                  </label>
                )}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Media Grid */}
      <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
        {filtered.map((asset) => (
          <div
            key={asset.id}
            className="flex flex-col overflow-hidden rounded-xl border bg-card shadow-sm transition-shadow hover:shadow-md"
          >
            <div className="relative flex h-40 items-center justify-center bg-secondary/40">
              {asset.mediaType === "image" ? (
                <img
                  src={asset.publicUrl}
                  alt={asset.altText || asset.fileName}
                  className="h-full w-full object-cover"
                />
              ) : (
                <video
                  src={asset.publicUrl}
                  controls
                  preload="metadata"
                  className="max-h-full max-w-full"
                  aria-label={asset.altText || asset.fileName}
                />
              )}
              <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-full bg-black/65 px-2.5 py-0.5 text-[10px] font-medium uppercase text-white">
                {asset.mediaType === "image" ? <ImageIcon size={10} /> : <Video size={10} />}
                {asset.mediaType}
              </span>
            </div>

            <div className="flex flex-1 flex-col justify-between p-3.5">
              <div>
                <p className="truncate text-xs font-semibold text-foreground" title={asset.fileName}>
                  {asset.fileName}
                </p>
                <p className="mt-1 line-clamp-2 text-[11px] text-muted-foreground">
                  <strong className="text-foreground/80">Alt:</strong> {asset.altText || "None"}
                </p>
                {asset.caption && (
                  <p className="mt-0.5 line-clamp-1 text-[11px] text-muted-foreground">
                    <strong className="text-foreground/80">Caption:</strong> {asset.caption}
                  </p>
                )}
              </div>

              <div className="mt-3 flex items-center justify-between border-t pt-2.5">
                <div className="flex items-center gap-2.5">
                  <button
                    type="button"
                    onClick={() => handleCopyUrl(asset)}
                    className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                  >
                    {copiedId === asset.id ? <Check size={12} /> : <Copy size={12} />}
                    {copiedId === asset.id ? "Copied" : "Copy URL"}
                  </button>
                  <button
                    type="button"
                    onClick={() => openEditAsset(asset)}
                    className="inline-flex items-center gap-1 text-xs font-medium text-foreground/80 hover:text-primary"
                  >
                    <Pencil size={11} /> Edit
                  </button>
                </div>

                {canDelete ? (
                  <button
                    type="button"
                    disabled={asset.id.startsWith("static-")}
                    onClick={() => void handleDelete(asset)}
                    title={
                      asset.id.startsWith("static-")
                        ? "Built-in static asset"
                        : "Delete media asset (Super Admin)"
                    }
                    className="inline-flex items-center gap-1 text-xs font-medium text-destructive hover:underline disabled:opacity-40"
                  >
                    <Trash2 size={12} />
                    Delete
                  </button>
                ) : (
                  <span
                    title="Editors cannot delete media files"
                    className="inline-flex items-center gap-1 text-[11px] text-muted-foreground"
                  >
                    <Lock size={11} />
                    No delete
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
