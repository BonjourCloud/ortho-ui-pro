import { useRef, useState } from "react";
import {
  Bold,
  Code,
  Eye,
  Heading2,
  Heading3,
  Image as ImageIcon,
  Italic,
  Link as LinkIcon,
  List,
  ListOrdered,
  Quote,
} from "lucide-react";
import type { MediaAsset } from "@/lib/cms/types";

interface RichTextEditorProps {
  label?: string;
  value: string;
  onChange: (nextHtml: string) => void;
  placeholder?: string;
  rows?: number;
  mediaAssets?: MediaAsset[];
  helpText?: string;
}

export default function RichTextEditor({
  label,
  value,
  onChange,
  placeholder = "Write or format content here...",
  rows = 8,
  mediaAssets = [],
  helpText,
}: RichTextEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const [previewMode, setPreviewMode] = useState(false);
  const [showMediaPicker, setShowMediaPicker] = useState(false);

  const insertSnippet = (before: string, after = "", defaultText = "") => {
    const el = textareaRef.current;
    if (!el) {
      onChange(`${value}${before}${defaultText}${after}`);
      return;
    }
    const start = el.selectionStart ?? value.length;
    const end = el.selectionEnd ?? value.length;
    const selected = value.slice(start, end) || defaultText;
    const next = `${value.slice(0, start)}${before}${selected}${after}${value.slice(end)}`;
    onChange(next);
    setTimeout(() => {
      el.focus();
      const cursor = start + before.length + selected.length + after.length;
      el.setSelectionRange(cursor, cursor);
    }, 0);
  };

  const handleInsertLink = () => {
    const url = typeof window !== "undefined" ? window.prompt("Enter link URL (e.g. /book or https://...):", "/book") : "/book";
    if (!url) return;
    insertSnippet(`<a href="${url}">`, "</a>", "Learn more");
  };

  const handleInsertImageUrl = (url: string, alt: string) => {
    const safeAlt = (alt || "Medical illustration").replace(/"/g, "&quot;");
    insertSnippet(
      `\n<figure class="my-6"><img src="${url}" alt="${safeAlt}" class="rounded-xl w-full object-cover" /></figure>\n`,
      "",
      "",
    );
    setShowMediaPicker(false);
  };

  const imageAssets = mediaAssets.filter((m) => m.mediaType === "image");

  return (
    <div className="space-y-2">
      {label && (
        <div className="flex items-center justify-between gap-2">
          <label className="block text-xs font-medium text-muted-foreground">{label}</label>
          <button
            type="button"
            onClick={() => setPreviewMode((p) => !p)}
            className="inline-flex items-center gap-1 rounded-md border bg-background px-2.5 py-1 text-xs font-medium text-foreground hover:bg-secondary"
          >
            {previewMode ? <Code size={12} /> : <Eye size={12} />}
            {previewMode ? "Edit Content" : "Visual Preview"}
          </button>
        </div>
      )}

      {/* Formatting Toolbar */}
      {!previewMode && (
        <div className="flex flex-wrap items-center gap-1 rounded-t-lg border bg-secondary/40 px-2 py-1.5">
          <button
            type="button"
            title="Heading 2"
            onClick={() => insertSnippet("<h2>", "</h2>\n", "Section Heading")}
            className="inline-flex items-center gap-1 rounded px-2 py-1 text-xs font-medium text-foreground hover:bg-background"
          >
            <Heading2 size={14} /> H2
          </button>
          <button
            type="button"
            title="Heading 3"
            onClick={() => insertSnippet("<h3>", "</h3>\n", "Subheading")}
            className="inline-flex items-center gap-1 rounded px-2 py-1 text-xs font-medium text-foreground hover:bg-background"
          >
            <Heading3 size={14} /> H3
          </button>
          <button
            type="button"
            title="Bold"
            onClick={() => insertSnippet("<strong>", "</strong>", "bold text")}
            className="inline-flex items-center gap-1 rounded px-2 py-1 text-xs font-medium text-foreground hover:bg-background"
          >
            <Bold size={14} />
          </button>
          <button
            type="button"
            title="Italic"
            onClick={() => insertSnippet("<em>", "</em>", "italic text")}
            className="inline-flex items-center gap-1 rounded px-2 py-1 text-xs font-medium text-foreground hover:bg-background"
          >
            <Italic size={14} />
          </button>
          <button
            type="button"
            title="Paragraph"
            onClick={() => insertSnippet("<p>", "</p>\n", "Paragraph text...")}
            className="inline-flex items-center gap-1 rounded px-2 py-1 text-xs font-medium text-foreground hover:bg-background"
          >
            ¶ Paragraph
          </button>
          <button
            type="button"
            title="Bullet List"
            onClick={() =>
              insertSnippet(
                "<ul>\n  <li>",
                "</li>\n  <li>Second point</li>\n</ul>\n",
                "First point",
              )
            }
            className="inline-flex items-center gap-1 rounded px-2 py-1 text-xs font-medium text-foreground hover:bg-background"
          >
            <List size={14} /> List
          </button>
          <button
            type="button"
            title="Numbered List"
            onClick={() =>
              insertSnippet(
                "<ol>\n  <li>",
                "</li>\n  <li>Step 2</li>\n</ol>\n",
                "Step 1",
              )
            }
            className="inline-flex items-center gap-1 rounded px-2 py-1 text-xs font-medium text-foreground hover:bg-background"
          >
            <ListOrdered size={14} /> Steps
          </button>
          <button
            type="button"
            title="Insert Link"
            onClick={handleInsertLink}
            className="inline-flex items-center gap-1 rounded px-2 py-1 text-xs font-medium text-foreground hover:bg-background"
          >
            <LinkIcon size={14} /> Link
          </button>
          <button
            type="button"
            title="Clinical Callout / Note"
            onClick={() =>
              insertSnippet(
                "<blockquote>",
                "</blockquote>\n",
                "Important clinical note for patients...",
              )
            }
            className="inline-flex items-center gap-1 rounded px-2 py-1 text-xs font-medium text-foreground hover:bg-background"
          >
            <Quote size={14} /> Note
          </button>
          <button
            type="button"
            title="Insert Image from Media Library"
            onClick={() => setShowMediaPicker((s) => !s)}
            className="inline-flex items-center gap-1 rounded bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary hover:bg-primary/20"
          >
            <ImageIcon size={14} /> Insert Image
          </button>
        </div>
      )}

      {/* Optional Media Library Picker Drawer */}
      {showMediaPicker && !previewMode && (
        <div className="rounded-lg border bg-secondary/20 p-3 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-foreground">
              Select an image from the Media Library to insert
            </span>
            <button
              type="button"
              onClick={() => setShowMediaPicker(false)}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              Close
            </button>
          </div>
          {imageAssets.length === 0 ? (
            <p className="text-xs text-muted-foreground">
              No images found. Upload images in the Media Library first.
            </p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 max-h-48 overflow-y-auto">
              {imageAssets.map((img) => (
                <button
                  key={img.id}
                  type="button"
                  onClick={() => handleInsertImageUrl(img.publicUrl, img.altText || img.fileName)}
                  className="group rounded-lg border bg-card p-1.5 text-left hover:border-primary transition-colors"
                >
                  <img
                    src={img.publicUrl}
                    alt={img.altText || img.fileName}
                    className="h-16 w-full rounded object-cover mb-1 bg-secondary"
                  />
                  <div className="truncate text-[11px] font-medium text-foreground">
                    {img.altText || img.fileName}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {previewMode ? (
        <div className="rounded-lg border bg-background p-5 min-h-[160px]">
          {value.trim() ? (
            <div
              className="prose prose-sm max-w-none
                prose-headings:font-display prose-headings:text-foreground prose-headings:font-bold
                prose-p:text-muted-foreground prose-li:text-muted-foreground
                prose-a:text-primary prose-img:rounded-xl"
              dangerouslySetInnerHTML={{ __html: value }}
            />
          ) : (
            <p className="text-xs text-muted-foreground italic">Nothing to preview yet.</p>
          )}
        </div>
      ) : (
        <textarea
          ref={textareaRef}
          rows={rows}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full rounded-b-lg border bg-background px-3 py-2.5 text-sm font-mono text-xs leading-relaxed text-foreground outline-none focus:ring-2 focus:ring-primary/20"
        />
      )}

      {helpText && <p className="text-[11px] text-muted-foreground">{helpText}</p>}
    </div>
  );
}
