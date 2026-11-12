import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { ArrowRight, TrendingUp, TrendingDown } from "lucide-react";
import { useCaseStudies } from "@/hooks/useContent";
import { usePreviewSiteConfig, useSitePageContent } from "@/hooks/usePageContent";
import {
  CmsDraftPreviewBanner,
  PageFaqSection,
  PageHighlightsGrid,
  PageRichBodySection,
} from "@/components/PageCmsSupplement";
import SEO from "@/components/SEO";
import { pageLabel } from "@/lib/cms/siteLabels";

export default function CaseStudies() {
  const { config } = usePreviewSiteConfig();
  const { content: page, usingDraft, workflowStatus } = useSitePageContent("case-studies");
  const { studies, loading } = useCaseStudies();

  return (
    <>
      <SEO
        title={page.heroTitle || "Case Studies"}
        description={
          page.heroSubtitle ||
          `Real patient success stories and treatment outcomes from ${config.doctorName}. See documented results of orthopedic procedures and treatments.`
        }
        keywords="orthopedic case studies, patient success stories, treatment outcomes, surgery results, patient testimonials"
        url="/case-studies"
      />
      <CmsDraftPreviewBanner usingDraft={usingDraft} workflowStatus={workflowStatus} pageLabel="Case Studies" />

      <section className="bg-hero-gradient py-14 md:py-20">
        <div className="container text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <span className="text-accent text-sm font-semibold uppercase tracking-wider">
              {page.heroEyebrow || "Real Results"}
            </span>
            <h1 className="font-display text-4xl md:text-5xl font-bold text-primary-foreground mt-2 mb-3">
              {page.heroTitle || "Patient Case Studies"}
            </h1>
            <p className="text-primary-foreground/70 max-w-lg mx-auto">
              {page.heroSubtitle || `Documented outcomes from ${config.doctorName}'s practice`}
            </p>
            {page.heroImageUrl && (
              <div className="mt-8 max-w-2xl mx-auto">
                <img
                  src={page.heroImageUrl}
                  alt={page.heroImageAlt || page.heroTitle}
                  className="rounded-2xl shadow-xl w-full max-h-72 object-cover mx-auto"
                />
              </div>
            )}
          </motion.div>
        </div>
      </section>

      <PageRichBodySection bodyHtml={page.bodyHtml} />

      {page.highlights.length > 0 && (
        <div className="container pt-8">
          <PageHighlightsGrid highlights={page.highlights} />
        </div>
      )}

      <section className="py-12 md:py-20">
        <div className="container">
          {loading ? (
            <div className="text-center py-12 text-muted-foreground">{pageLabel(page, "loadingText", "Loading case studies...")}</div>
          ) : studies.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              {page.customLabels.emptyStateText || "No case studies yet."}
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {studies.map((cs, i) => (
                <motion.div
                  key={cs.id}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                >
                  <Link
                    to={`/case-studies/${cs.slug}`}
                    className="block bg-card rounded-xl border hover:shadow-lg transition-all overflow-hidden group h-full"
                  >
                    <div className="p-6">
                      <div className="flex items-center gap-2 mb-3">
                        <span className="text-xs font-medium text-accent bg-accent/10 rounded-full px-3 py-1">
                          {cs.surgery_type}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {cs.patient_initials} • Age {cs.age}
                        </span>
                      </div>
                      <h3 className="font-display text-lg font-semibold text-foreground group-hover:text-primary transition-colors mb-1">
                        {cs.condition}
                      </h3>
                      <p className="text-sm text-muted-foreground mb-2">{cs.procedure_name}</p>
                      <p className="text-sm text-muted-foreground leading-relaxed mb-4 line-clamp-2">
                        {cs.outcome_summary}
                      </p>
                      <div className="grid grid-cols-2 gap-3 p-3 bg-secondary/50 rounded-lg mb-4">
                        <div className="text-center">
                          <div className="text-xs text-muted-foreground mb-1">{pageLabel(page, "painBeforeLabel", "Pain Before")}</div>
                          <div className="font-display text-xl font-bold text-destructive flex items-center justify-center gap-1">
                            {cs.pain_score_pre}/10 <TrendingUp size={14} />
                          </div>
                        </div>
                        <div className="text-center">
                          <div className="text-xs text-muted-foreground mb-1">{pageLabel(page, "painAfterLabel", "Pain After")}</div>
                          <div className="font-display text-xl font-bold text-primary flex items-center justify-center gap-1">
                            {cs.pain_score_post}/10 <TrendingDown size={14} />
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>{cs.occupation}</span>
                        <span className="flex items-center gap-1 text-primary font-medium group-hover:text-accent">
                          {pageLabel(page, "readMoreLabel", "Read Full Story")} <ArrowRight size={12} />
                        </span>
                      </div>
                    </div>
                  </Link>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </section>

      <PageFaqSection faqs={page.faqs} />

      {page.ctaHeading && (
        <section className="bg-gold-light py-14">
          <div className="container text-center">
            <h2 className="font-display text-2xl md:text-3xl font-bold text-foreground mb-3">
              {page.ctaHeading}
            </h2>
            {page.ctaDescription && (
              <p className="text-muted-foreground mb-6 max-w-md mx-auto">{page.ctaDescription}</p>
            )}
            <Link
              to={page.ctaPrimaryLink || "/book"}
              className="inline-flex items-center gap-2 rounded-lg bg-accent px-6 py-3 text-sm font-semibold text-accent-foreground shadow-lg hover:opacity-90"
            >
              {page.ctaPrimaryLabel || "Book Consultation"} <ArrowRight size={16} />
            </Link>
          </div>
        </section>
      )}
    </>
  );
}
