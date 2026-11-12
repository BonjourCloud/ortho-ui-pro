import { useEffect, useState } from "react";
import { useParams, Link, useLocation, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { useMedicalSubsection } from "@/hooks/useMedicalSections";
import { useSiteConfig } from "@/contexts/SiteConfigContext";
import { supabase } from "@/integrations/supabase/client";
import { resolveCmsRole } from "@/lib/resolveCmsRole";
import { isDraftPreviewParam, resolvePreviewData, type WorkflowStatus } from "@/lib/cms/types";
import { loadStagedTreatment } from "@/lib/cms/repository";
import { PreviewBanner } from "@/components/PreviewBanner";
import SEO from "@/components/SEO";
import DOMPurify from "dompurify";

export default function MedicalSubsection() {
  const { subsection: subsectionSlug } = useParams();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const isPreviewParam = isDraftPreviewParam(searchParams.get("preview"));

  // Extract section slug from pathname (e.g., "/orthopaedics/shoulder-pain" -> "orthopaedics")
  const sectionSlug = location.pathname.split("/")[1];
  const { subsection, loading } = useMedicalSubsection(sectionSlug, subsectionSlug);
  const { config } = useSiteConfig();

  const [isAuthenticatedCmsUser, setIsAuthenticatedCmsUser] = useState(false);

  useEffect(() => {
    if (!isPreviewParam) {
      setIsAuthenticatedCmsUser(false);
      return;
    }
    let active = true;
    supabase.auth
      .getSession()
      .then(async ({ data }) => {
        const uid = data?.session?.user?.id;
        if (!uid) return false;
        const r = await resolveCmsRole(supabase, uid);
        return r.role !== null;
      })
      .then((ok) => {
        if (active) setIsAuthenticatedCmsUser(ok);
      })
      .catch(() => {
        if (active) setIsAuthenticatedCmsUser(false);
      });
    return () => {
      active = false;
    };
  }, [isPreviewParam]);

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

  const staged = subsectionSlug ? loadStagedTreatment(subsectionSlug) : null;
  const resolved = resolvePreviewData({
    published: {
      name: subsection.name,
      description: subsection.description,
      metaDescription: subsection.meta_description,
      content: subsection.content,
    },
    draft: staged
      ? {
          name: staged.draft.name,
          description: staged.draft.description,
          metaDescription: staged.draft.metaDescription,
          content: staged.draft.compiledHtml,
        }
      : null,
    isPreviewMode: isPreviewParam,
    isAuthenticatedCmsUser,
  });

  const display = resolved.data;
  const workflowStatus: WorkflowStatus = staged?.workflowStatus ?? "published";

  return (
    <>
      <SEO
        title={display.name}
        description={
          display.metaDescription ||
          display.description ||
          `${display.name} treatment at ${config.clinicName}`
        }
        keywords={`${display.name}, ${sectionSlug}, ${config.doctorName}`}
        url={`/${sectionSlug}/${subsection.slug}`}
      />

      <PreviewBanner
        usingDraft={resolved.usingDraft}
        workflowStatus={workflowStatus}
        editorPath="/admin/treatments"
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
              {display.name}
            </h1>
            {display.description && (
              <p className="text-primary-foreground/80 text-lg">{display.description}</p>
            )}
          </motion.div>
        </div>
      </section>

      {/* Content */}
      <section className="py-12 md:py-20">
        <div className="container max-w-4xl">
          {display.content ? (
            <div
              className="prose prose-lg max-w-none"
              dangerouslySetInnerHTML={{
                __html: DOMPurify.sanitize(display.content),
              }}
            />
          ) : (
            <div className="bg-card rounded-xl border p-8 text-center">
              <h2 className="font-display text-2xl font-bold text-foreground mb-4">
                Content Coming Soon
              </h2>
              <p className="text-muted-foreground mb-6">
                We're currently updating this page with detailed information about {display.name}.
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
              Book a consultation with {config.doctorName} for expert {display.name} treatment.
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              <Link
                to="/book"
                className="inline-flex items-center gap-2 rounded-lg bg-accent px-6 py-3 text-sm font-semibold text-accent-foreground shadow-lg hover:opacity-90"
              >
                Book Appointment <ArrowRight size={16} />
              </Link>
              <a
                href={`https://wa.me/${config.whatsapp?.replace(/\D/g, "") || "919441824999"}`}
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
