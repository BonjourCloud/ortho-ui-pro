import { useEffect, useState } from "react";
import { Image as ImageIcon, Video, Upload, X, Check } from "lucide-react";
import { listMediaAssets, uploadMediaAsset } from "@/lib/cms/repository";
import { MEDIA_ACCEPT_ATTR, type MediaAsset, type MediaCategory, type MediaType } from "@/lib/cms/types";

export interface MediaPickerModalProps {
  open: boolean;
  onClose: () => void;
  onSelect: (asset: MediaAsset) => void;
  allowedTypes?: MediaType[];
  defaultCategory?: MediaCategory;
  title?: string;
}

export function MediaPickerModal({
  open,
  onClose,
  onSelect,
  allowedTypes = ["image", "video"],
  defaultCategory = "general",
  title = "Choose from Media Library",
}: MediaPickerModalProps) {
  const [assets, setAssets] = useState<MediaAsset[]>([]);
  const [filterType, setFilterType] = useState<MediaType | "all">(
    allowedTypes.length === 1 ? allowedTypes[0] : "all",
  );
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [altInput, setAltInput] = useState("");

  useEffect(() => {
    if (!open) return;
    void listMediaAssets().then(({ assets: list }) => setAssets(list));
  }, [open]);

  if (!open) return null;

  const filtered = assets.filter((a) => {
    if (!allowedTypes.includes(a.mediaType)) return false;
    if (filterType !== "all" && a.mediaType !== filterType) return false;
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

  const selectedAsset = filtered.find((a) => a.id === selectedId) ?? null;

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadError(null);
    setUploading(true);
    const res = await uploadMediaAsset({
      file,
      altText: altInput || file.name,
      caption: "",
      category: defaultCategory,
    });
    setUploading(false);
    if (!res.ok || !res.asset) {
      setUploadError(res.error ?? "Upload failed.");
      return;
    }
    setAssets((prev) => [res.asset!, ...prev]);
    setSelectedId(res.asset.id);
    setAltInput("");
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
    >
      <div className="flex max-h-[85vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border bg-card shadow-2xl">
        <div className="flex items-center justify-between border-b px-5 py-4">
          <h2 className="font-display text-lg font-bold text-foreground">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close media picker"
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-b bg-secondary/20 px-5 py-3">
          <div className="flex items-center gap-2">
            <input
              type="search"
              placeholder="Search images or videos…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className=" rounded-lg border bg-card px-3 py-1.5 text-xs text-foreground outline-none focus:border-primary"
            />
            {allowedTypes.length > 1 && (
              <select
                aria-label="Filter media type"
                value={filterType}
                onChange={(e) => setFilterType(e.target.value as MediaType | "all")}
                className="rounded-lg border bg-card px-2.5 py-1.5 text-xs text-foreground"
              >
                <option value="all">All types</option>
                <option value="image">Images</option>
                <option value="video">Videos</option>
              </select>
            )}
          </div>

          <div className="flex items-center gap-2">
            <input
              type="text"
              placeholder="Alt text for upload…"
              value={altInput}
              onChange={(e) => setAltInput(e.target.value)}
              className="w-40 rounded-lg border bg-card px-2.5 py-1.5 text-xs text-foreground"
            />
            <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:opacity-90">
              <Upload size={13} aria-hidden="true" />
              {uploading ? "Uploading…" : "Upload new"}
              <input
                type="file"
                accept={MEDIA_ACCEPT_ATTR}
                onChange={handleFileChange}
                className="sr-only"
              />
            </label>
          </div>
        </div>

        {uploadError && (
          <div role="alert" className="bg-destructive/10 px-5 py-2 text-xs text-destructive">
            {uploadError}
          </div>
        )}

        <div className="grid flex-1 grid-cols-2 gap-3 overflow-y-auto p-5 sm:grid-cols-3">
          {filtered.map((asset) => {
            const isSelected = asset.id === selectedId;
            return (
              <button
                key={asset.id}
                type="button"
                onClick={() => setSelectedId(asset.id)}
                className={`group relative flex flex-col overflow-hidden rounded-xl border text-left transition-all ${
                  isSelected ? "border-primary ring-2 ring-primary/30" : "hover:border-primary/40"
                }`}
              >
                <div className="flex h-28 w-full items-center justify-center bg-secondary/40">
                  {asset.mediaType === "image" ? (
                    <img
                      src={asset.publicUrl}
                      alt={asset.altText || asset.fileName}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex flex-col items-center gap-1 text-muted-foreground">
                      <Video size={26} />
                      <span className="text-[11px]">Video</span>
                    </div>
                  )}
                </div>
                <div className="p-2.5">
                  <div className="flex items-center gap-1 text-xs font-semibold text-foreground">
                    {asset.mediaType === "image" ? <ImageIcon size={12} /> : <Video size={12} />}
                    <span className="truncate">{asset.fileName}</span>
                  </div>
                  <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
                    {asset.altText || "No alt text"}
                  </p>
                </div>
                {isSelected && (
                  <span className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground">
                    <Check size={13} />
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <div className="flex items-center justify-between border-t px-5 py-3">
          <span className="text-xs text-muted-foreground">
            {selectedAsset ? `Selected: ${selectedAsset.fileName}` : "Click an item to select"}
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border px-3.5 py-1.5 text-xs font-medium text-muted-foreground hover:bg-secondary"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={!selectedAsset}
              onClick={() => {
                if (selectedAsset) {
                  onSelect(selectedAsset);
                  onClose();
                }
              }}
              className="rounded-lg bg-primary px-4 py-1.5 text-xs font-semibold text-primary-foreground disabled:opacity-50"
            >
              Use selected media
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
