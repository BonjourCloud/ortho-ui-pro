import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { ArrowRight, Clock, Building2, CheckCircle, IndianRupee } from "lucide-react";
import { usePreviewSiteConfig, useSitePageContent } from "@/hooks/usePageContent";
import { useServices } from "@/hooks/useContent";
import { useState } from "react";
import {
  CmsDraftPreviewBanner,
  PageFaqSection,
  PageHighlightsGrid,
  PageRichBodySection,
} from "@/components/PageCmsSupplement";
import SEO from "@/components/SEO";
import { pageLabel } from "@/lib/cms/siteLabels";

export default function Services() {
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const { services, loading } = useServices();
  const { config } = usePreviewSiteConfig();
  const { content: page, usingDraft, workflowStatus } = useSitePageContent("services");

  const filtered = activeCategory
    ? services.filter((s) => s.category === activeCategory)
    : services;

  return (
    <>
      <SEO
        title={page.heroTitle || "Services"}
        description={
          page.heroSubtitle ||
          `Comprehensive orthopedic services including joint replacement, sports medicine, arthroscopy, trauma care, and more. Expert treatment by ${config.doctorName}.`
        }
        keywords="orthopedic services, joint replacement, knee replacement, hip replacement, sports medicine, arthroscopy, trauma care, spine surgery"
        url="/services"
      />
      <CmsDraftPreviewBanner usingDraft={usingDraft} workflowStatus={workflowStatus} pageLabel="Services" />

      <section className="bg-hero-gradient py-16 md:py-20">
        <div className="container text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <span className="text-accent text-sm font-semibold uppercase tracking-wider">
              {page.heroEyebrow || "What We Offer"}
            </span>
            <h1 className="font-display text-4xl md:text-5xl font-bold text-primary-foreground mt-2 mb-4">
              {page.heroTitle || "Our Services"}
            </h1>
            <p className="text-primary-foreground/70 max-w-xl mx-auto">
              {page.heroSubtitle ||
                "Comprehensive orthopedic treatments from joint replacement to sports injury care, all under one roof."}
            </p>
            {page.heroImageUrl && (
              <div className="mt-8 max-w-3xl mx-auto">
                <img
                  src={page.heroImageUrl}
                  alt={page.heroImageAlt || page.heroTitle}
                  className="rounded-2xl shadow-xl w-full max-h-80 object-cover mx-auto"
                />
              </div>
            )}
          </motion.div>
        </div>
      </section>

      <PageRichBodySection bodyHtml={page.bodyHtml} />

      {page.highlights.length > 0 && (
        <div className="container pt-10">
          <PageHighlightsGrid highlights={page.highlights} />
        </div>
      )}

      <section className="py-12 md:py-20">
        <div className="container">
          <div className="flex flex-wrap gap-2 mb-10 justify-center">
            <button
              onClick={() => setActiveCategory(null)}
              className={`rounded-full px-5 py-2 text-sm font-medium transition-all border ${
                !activeCategory
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-card text-muted-foreground border-border hover:border-primary/30"
              }`}
            >
              All
            </button>
            {config.serviceCategories.map((cat) => (
              <button
                key={cat.slug}
                onClick={() => setActiveCategory(cat.name)}
                className={`rounded-full px-5 py-2 text-sm font-medium transition-all border ${
                  activeCategory === cat.name
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-card text-muted-foreground border-border hover:border-primary/30"
                }`}
              >
                {cat.icon} {cat.name}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="text-center py-12 text-muted-foreground">{pageLabel(page, "loadingText", "Loading services...")}</div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filtered.map((svc, i) => (
                <motion.div
                  key={svc.id}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.05 }}
                  className="bg-card rounded-xl border hover:shadow-lg transition-all overflow-hidden group"
                >
                  <div className="p-6">
                    <span className="text-xs font-medium text-accent bg-accent/10 rounded-full px-3 py-1">
                      {svc.category}
                    </span>
                    <h3 className="font-display text-xl font-semibold text-foreground mt-3 mb-2 group-hover:text-primary transition-colors">
                      {svc.name}
                    </h3>
                    <p className="text-sm text-muted-foreground leading-relaxed mb-4">
                      {svc.short_description}
                    </p>
                    <div className="space-y-2 text-sm mb-5">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Clock size={14} className="text-primary" /> {svc.procedure_time}
                      </div>
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Building2 size={14} className="text-primary" /> Hospital Stay: {svc.hospital_stay}
                      </div>
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <CheckCircle size={14} className="text-primary" /> Success Rate: {svc.success_rate}
                      </div>
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <IndianRupee size={14} className="text-primary" /> {svc.cost_range}
                      </div>
                    </div>
                    <div className="flex items-center justify-between pt-4 border-t">
                      <div className="text-xs text-muted-foreground">
                        {(svc.patients_treated || 0).toLocaleString()}+ patients treated
                      </div>
                      {svc.emi_available && (
                        <span className="text-xs font-medium text-primary bg-teal-light rounded-full px-3 py-1">
                          {pageLabel(page, "emiBadgeLabel", "EMI Available")}
                        </span>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </section>

      <PageFaqSection faqs={page.faqs} />

      <section className="bg-gold-light py-14">
        <div className="container text-center">
          <h2 className="font-display text-2xl md:text-3xl font-bold text-foreground mb-4">
            {page.ctaHeading || "Need Help Choosing a Treatment?"}
          </h2>
          <p className="text-muted-foreground mb-6 max-w-md mx-auto">
            {page.ctaDescription || "Book a consultation and we'll recommend the best option for you."}
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <Link
              to={page.ctaPrimaryLink || "/book"}
              className="inline-flex items-center gap-2 rounded-lg bg-accent px-6 py-3 text-sm font-semibold text-accent-foreground shadow-lg hover:opacity-90"
            >
              {page.ctaPrimaryLabel || "Book Consultation"} <ArrowRight size={16} />
            </Link>
            {page.ctaSecondaryLabel && (
              <Link
                to={page.ctaSecondaryLink || "/second-opinion"}
                className="inline-flex items-center gap-2 rounded-lg border bg-card px-6 py-3 text-sm font-semibold text-foreground hover:bg-secondary"
              >
                {page.ctaSecondaryLabel}
              </Link>
            )}
          </div>
        </div>
      </section>
    </>
  );
}
