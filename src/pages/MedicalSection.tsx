import { useParams, Link, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { useMedicalSection } from "@/hooks/useMedicalSections";
import { useSiteConfig } from "@/contexts/SiteConfigContext";
import SEO from "@/components/SEO";

export default function MedicalSection() {
  const location = useLocation();
  // Extract section slug from pathname (e.g., "/orthopaedics" -> "orthopaedics")
  const sectionSlug = location.pathname.split('/')[1];
  const { section, loading } = useMedicalSection(sectionSlug);
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

  if (!section) {
    return (
      <section className="py-20">
        <div className="container text-center">
          <h1 className="font-display text-3xl font-bold text-foreground mb-4">Section Not Found</h1>
          <Link to="/" className="text-primary font-medium">← Back to Home</Link>
        </div>
      </section>
    );
  }

  return (
    <>
      <SEO
        title={section.display_name}
        description={section.description || `${section.display_name} services at ${config.clinicName}`}
        keywords={`${section.display_name}, ${config.doctorName}, ${config.clinicName}`}
        url={`/${section.slug}`}
      />

      {/* Hero */}
      <section className="bg-hero-gradient py-16 md:py-20">
        <div className="container text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <span className="text-accent text-sm font-semibold uppercase tracking-wider">Our Services</span>
            <h1 className="font-display text-4xl md:text-5xl font-bold text-primary-foreground mt-2 mb-4">
              {section.display_name}
            </h1>
            {section.description && (
              <p className="text-primary-foreground/70 max-w-2xl mx-auto">
                {section.description}
              </p>
            )}
          </motion.div>
        </div>
      </section>

      {/* Subsections Grid */}
      <section className="py-16 md:py-24">
        <div className="container">
          <div className="space-y-12">
            {section.subsections.map((sub, i) => (
              <div key={sub.id}>
                {sub.children && sub.children.length > 0 ? (
                  // Category with nested treatments
                  <div>
                    <h2 className="font-display text-2xl font-bold text-foreground mb-6 flex items-center gap-2">
                      <span className="w-1 h-8 bg-primary rounded-full"></span>
                      {sub.name}
                    </h2>
                    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                      {sub.children.map((child, j) => (
                        <motion.div
                          key={child.id}
                          initial={{ opacity: 0, y: 20 }}
                          whileInView={{ opacity: 1, y: 0 }}
                          viewport={{ once: true }}
                          transition={{ delay: j * 0.1 }}
                        >
                          <Link
                            to={`/${section.slug}/${child.slug}`}
                            className="block bg-card rounded-xl p-6 border hover:border-primary/30 hover:shadow-lg transition-all group h-full"
                          >
                            <h3 className="font-display text-lg font-semibold text-foreground group-hover:text-primary transition-colors mb-2">
                              {child.name}
                            </h3>
                            {child.description && (
                              <p className="text-sm text-muted-foreground leading-relaxed mb-4">
                                {child.description}
                              </p>
                            )}
                            <div className="inline-flex items-center gap-1 text-sm font-semibold text-primary group-hover:text-accent transition-colors">
                              Learn More <ArrowRight size={14} />
                            </div>
                          </Link>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                ) : (
                  // Standalone subsection (no children)
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.1 }}
                  >
                    <Link
                      to={`/${section.slug}/${sub.slug}`}
                      className="block bg-card rounded-xl p-6 border hover:border-primary/30 hover:shadow-lg transition-all group"
                    >
                      <h3 className="font-display text-xl font-semibold text-foreground group-hover:text-primary transition-colors mb-2">
                        {sub.name}
                      </h3>
                      {sub.description && (
                        <p className="text-sm text-muted-foreground leading-relaxed mb-4">
                          {sub.description}
                        </p>
                      )}
                      <div className="inline-flex items-center gap-1 text-sm font-semibold text-primary group-hover:text-accent transition-colors">
                        Learn More <ArrowRight size={14} />
                      </div>
                    </Link>
                  </motion.div>
                )}
              </div>
            ))}
          </div>

          {section.subsections.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              <p>Content coming soon. Please check back later.</p>
            </div>
          )}
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 md:py-24 bg-teal-light">
        <div className="container">
          <div className="bg-card rounded-2xl p-8 md:p-14 text-center shadow-lg">
            <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-4">
              Need {section.display_name} Treatment?
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto mb-8">
              Book a consultation with {config.doctorName} today. Expert care, personalized treatment plans.
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
                className="inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground hover:opacity-90"
              >
                Contact Us
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
