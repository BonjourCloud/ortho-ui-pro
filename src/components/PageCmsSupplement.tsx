import { Eye, HelpCircle } from "lucide-react";
import type { SitePageFaqItem, SitePageHighlightItem, WorkflowStatus } from "@/lib/cms/types";

export function CmsDraftPreviewBanner({
  usingDraft,
  workflowStatus,
  pageLabel,
}: {
  usingDraft: boolean;
  workflowStatus: WorkflowStatus;
  pageLabel?: string;
}) {
  if (!usingDraft) return null;
  return (
    <div
      role="status"
      aria-label="Draft preview active"
      className="bg-amber-600 text-white px-4 py-2 text-xs font-medium text-center flex items-center justify-center gap-2"
    >
      <Eye size={14} className="shrink-0" />
      <span>
        CMS Draft Preview Mode{pageLabel ? ` (${pageLabel})` : ""} — Viewing staged{" "}
        <strong>{workflowStatus.replace("_", " ")}</strong> changes. Public visitors still see the published version.
      </span>
    </div>
  );
}

export function PageRichBodySection({ bodyHtml }: { bodyHtml?: string }) {
  if (!bodyHtml || !bodyHtml.trim()) return null;
  return (
    <section className="py-10 bg-background">
      <div className="container max-w-4xl">
        <div
          className="prose prose-lg max-w-none
            prose-headings:font-display prose-headings:text-foreground prose-headings:font-bold
            prose-h2:text-2xl prose-h2:mt-6 prose-h2:mb-3
            prose-h3:text-xl prose-h3:mt-4 prose-h3:mb-2
            prose-p:text-muted-foreground prose-p:leading-relaxed
            prose-li:text-muted-foreground
            prose-strong:text-foreground
            prose-a:text-primary hover:prose-a:underline
            prose-img:rounded-xl prose-img:my-4"
          dangerouslySetInnerHTML={{ __html: bodyHtml }}
        />
      </div>
    </section>
  );
}

export function PageFaqSection({
  faqs,
  heading = "Frequently Asked Questions",
}: {
  faqs?: SitePageFaqItem[];
  heading?: string;
}) {
  const validFaqs = (faqs ?? []).filter((f) => f.question?.trim() && f.answer?.trim());
  if (validFaqs.length === 0) return null;

  return (
    <section className="py-12 bg-secondary/30">
      <div className="container max-w-3xl">
        <div className="flex items-center justify-center gap-2 mb-6">
          <HelpCircle size={20} className="text-primary" />
          <h2 className="font-display text-2xl font-bold text-foreground text-center">{heading}</h2>
        </div>
        <div className="space-y-3">
          {validFaqs.map((faq) => (
            <details
              key={faq.id}
              className="group rounded-xl border bg-card p-4 transition-all open:shadow-sm"
            >
              <summary className="cursor-pointer font-display text-base font-semibold text-foreground list-none flex items-center justify-between gap-3">
                <span>{faq.question}</span>
                <span className="text-primary text-xs font-medium group-open:rotate-180 transition-transform">
                  ▼
                </span>
              </summary>
              <p className="mt-3 text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
                {faq.answer}
              </p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

export function PageHighlightsGrid({ highlights }: { highlights?: SitePageHighlightItem[] }) {
  const valid = (highlights ?? []).filter((h) => h.title?.trim());
  if (valid.length === 0) return null;
  return (
    <div className="grid sm:grid-cols-3 gap-4 my-6">
      {valid.map((item) => (
        <div key={item.id} className="bg-card rounded-xl border p-5 text-center shadow-card">
          {item.icon && <div className="text-xl mb-2 text-primary font-semibold">{item.icon}</div>}
          <h3 className="font-display font-semibold text-foreground text-sm mb-1">{item.title}</h3>
          <p className="text-xs text-muted-foreground leading-relaxed">{item.description}</p>
        </div>
      ))}
    </div>
  );
}
