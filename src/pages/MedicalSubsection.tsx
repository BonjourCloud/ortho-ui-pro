import { useParams, Link, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { useMedicalSubsection } from "@/hooks/useMedicalSections";
import { useSiteConfig } from "@/contexts/SiteConfigContext";
import SEO from "@/components/SEO";
import DOMPurify from "dompurify";

export default function MedicalSubsection() {
  const { subsection: subsectionSlug } = useParams();
  const location = useLocation();
  // Extract section slug from pathname (e.g., "/orthopaedics/shoulder-pain" -> "orthopaedics")
  const sectionSlug = location.pathname.split('/')[1];
  const { subsection, loading } = useMedicalSubsection(sectionSlug, subsectionSlug);
  const { config } = useSiteConfig();

  if (loading) {
    return (
      <section className="py-20">
        <div className="container text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto" />
        </div>
      </section>
    );
  }

  if (!subsection) {
    return (
      <section className="py-20">
        <div className="container text-center">
          <h1 className="font-display text-3xl font-bold text-foreground mb-4">Page Not Found</h1>
          <Link to={`/${sectionSlug}`} className="text-primary font-medium">
            ← Back to {sectionSlug}
          </Link>
        </div>
      </section>
    );
  }

  return (
    <>
      <SEO
        title={subsection.name}
        description={subsection.meta_description || subsection.description || `${subsection.name} treatment at ${config.clinicName}`}
        keywords={`${subsection.name}, ${sectionSlug}, ${config.doctorName}`}
        url={`/${sectionSlug}/${subsection.slug}`}
      />

      {/* Hero */}
      <section className="bg-hero-gradient py-14 md:py-20">
        <div className="container max-w-4xl">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <Link
              to={`/${sectionSlug}`}
              className="inline-flex items-center gap-1 text-primary-foreground/70 text-sm mb-4 hover:text-primary-foreground capitalize"
            >
              <ArrowLeft size={14} /> Back to {sectionSlug}
            </Link>
            <h1 className="font-display text-3xl md:text-4xl font-bold text-primary-foreground mb-4">
              {subsection.name}
            </h1>
            {subsection.description && (
              <p className="text-primary-foreground/80 text-lg">
                {subsection.description}
              </p>
            )}
          </motion.div>
        </div>
      </section>

      {/* Content */}
      <section className="py-12 md:py-20">
        <div className="container max-w-4xl">
          {subsection.content ? (
            <div
              className="prose prose-lg max-w-none"
              dangerouslySetInnerHTML={{
                __html: DOMPurify.sanitize(subsection.content),
              }}
            />
          ) : (
            <div className="bg-card rounded-xl border p-8 text-center">
              <h2 className="font-display text-2xl font-bold text-foreground mb-4">
                Content Coming Soon
              </h2>
              <p className="text-muted-foreground mb-6">
                We're currently updating this page with detailed information about {subsection.name}.
                Please check back soon or contact us for more information.
              </p>
              <div className="flex flex-wrap justify-center gap-3">
                <Link
                  to="/book"
                  className="inline-flex items-center gap-2 rounded-lg bg-accent px-6 py-3 text-sm font-semibold text-accent-foreground shadow-lg hover:opacity-90"
                >
                  Book Appointment <ArrowRight size={16} />
                </Link>
                <Link
                  to="/contact"
                  className="inline-flex items-center gap-2 rounded-lg border border-primary px-6 py-3 text-sm font-semibold text-primary hover:bg-primary/5"
                >
                  Contact Us
                </Link>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 md:py-24 bg-teal-light">
        <div className="container">
          <div className="bg-card rounded-2xl p-8 md:p-14 text-center shadow-lg">
            <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-4">
              Ready to Get Treatment?
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto mb-8">
              Book a consultation with {config.doctorName} for expert {subsection.name} treatment.
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              <Link
                to="/book"
                className="inline-flex items-center gap-2 rounded-lg bg-accent px-6 py-3 text-sm font-semibold text-accent-foreground shadow-lg hover:opacity-90"
              >
                Book Appointment <ArrowRight size={16} />
              </Link>
              <a
                href={`https://wa.me/${config.whatsapp?.replace(/\D/g, "") || "919876543210"}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground hover:opacity-90"
              >
                WhatsApp Us
              </a>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
