import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Star,
  ArrowRight,
  Shield,
  Heart,
  Zap,
  Users,
  Award,
  Clock,
  Target,
  Stethoscope,
  Activity,
  TrendingUp,
  Bone,
  Footprints,
  Dumbbell,
  Sparkles,
  Siren,
  HeartPulse,
} from "lucide-react";
import heroImage from "@/assets/hero-doctor.jpg";
import { useSiteConfig } from "@/contexts/SiteConfigContext";
import { useTestimonials } from "@/hooks/useContent";
import { useHomePageContent } from "@/hooks/usePageContent";
import { PreviewBanner } from "@/components/PreviewBanner";
import SEO from "@/components/SEO";
import { trackClick } from "@/utils/analytics";
import type { HomeSectionId } from "@/lib/cms/types";

const iconMap: Record<string, React.ElementType> = {
  Shield,
  Zap,
  Heart,
  Users,
  Award,
  Clock,
  Target,
  Stethoscope,
  Activity,
  TrendingUp,
  Bone,
  Footprints,
  Dumbbell,
  Sparkles,
  Siren,
  HeartPulse,
};

export default function Index() {
  const { config } = useSiteConfig();
  const { testimonials } = useTestimonials();
  const { content: home, usingDraft, workflowStatus } = useHomePageContent();

  const stats = [
    { label: "Years Experience", value: `${config.yearsExperience}+` },
    { label: "Happy Patients", value: `${config.happyPatients.toLocaleString()}+` },
    { label: "Surgeries", value: `${config.surgeriesCompleted.toLocaleString()}+` },
    { label: "Branches", value: `${config.branches}` },
  ];

  const visibleSections = [...home.sectionsOrder]
    .filter((s) => s.visible)
    .sort((a, b) => a.sortOrder - b.sortOrder);

  const renderSection = (sectionId: HomeSectionId) => {
    switch (sectionId) {
      case "hero":
        return (
          <section key="hero" className="relative overflow-hidden bg-hero-gradient">
            <div className="container relative z-10 py-16 md:py-24">
              <div className="grid md:grid-cols-2 gap-10 items-center">
                <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }}>
                  <span className="inline-block bg-accent/20 text-accent rounded-full px-4 py-1.5 text-xs font-semibold mb-4 backdrop-blur-sm border border-accent/30">
                    {home.hero.badge}
                  </span>
                  <h1 className="font-display text-4xl md:text-5xl lg:text-6xl font-bold text-primary-foreground leading-tight mb-5">
                    {home.hero.headingPrefix}{" "}
                    <span className="text-gradient-gold">{home.hero.headingHighlight}</span>
                  </h1>
                  <p className="text-primary-foreground/80 text-base md:text-lg max-w-lg mb-4 font-body leading-relaxed">
                    {home.hero.primaryParagraph}
                  </p>
                  <p className="text-primary-foreground/70 text-sm max-w-lg mb-8 font-body leading-relaxed">
                    {home.hero.secondaryParagraph}
                  </p>
                  <div className="flex flex-wrap gap-3">
                    <Link
                      to={home.hero.primaryCtaLink || "/book"}
                      className="inline-flex items-center gap-2 rounded-lg bg-accent px-6 py-3 text-sm font-semibold text-accent-foreground transition-all hover:opacity-90 shadow-lg"
                    >
                      {home.hero.primaryCtaLabel} <ArrowRight size={16} />
                    </Link>
                    <Link
                      to={home.hero.secondaryCtaLink || "/contact"}
                      className="inline-flex items-center gap-2 rounded-lg border border-primary-foreground/30 px-6 py-3 text-sm font-semibold text-primary-foreground transition-all hover:bg-primary-foreground/10"
                    >
                      {home.hero.secondaryCtaLabel}
                    </Link>
                  </div>
                </motion.div>
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.7, delay: 0.2 }}
                  className="hidden md:block"
                >
                  <div className="relative bg-white rounded-2xl shadow-2xl overflow-hidden max-h-[500px] flex items-center justify-center">
                    <img
                      src={home.hero.heroImageUrl || config.heroImageUrl || heroImage}
                      alt={`${config.doctorName} - Orthopedic Surgeon`}
                      className="w-full h-full object-cover"
                      style={{ maxHeight: "500px", objectPosition: "center 10%" }}
                    />
                  </div>
                </motion.div>
              </div>
            </div>
          </section>
        );

      case "stats":
        return (
          <section key="stats" className="bg-card border-b">
            <div className="container py-10">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                {stats.map((s, i) => (
                  <motion.div
                    key={s.label}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.1 }}
                    className="text-center"
                  >
                    <div className="font-display text-3xl md:text-4xl font-bold text-primary">{s.value}</div>
                    <div className="text-sm text-muted-foreground mt-1">{s.label}</div>
                  </motion.div>
                ))}
              </div>
            </div>
          </section>
        );

      case "specialties":
        return (
          <section key="specialties" className="py-16 md:py-24">
            <div className="container">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="text-center mb-12"
              >
                <span className="text-accent text-sm font-semibold uppercase tracking-wider">
                  {home.specialties.eyebrow}
                </span>
                <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground mt-2">
                  {home.specialties.heading}
                </h2>
              </motion.div>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
                {home.specialties.items.map((specialty, i) => {
                  const IconComp = iconMap[specialty.icon] || Stethoscope;
                  return (
                    <motion.div
                      key={specialty.title}
                      initial={{ opacity: 0, y: 20 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: i * 0.05 }}
                      className="bg-card rounded-xl p-5 md:p-6 border hover:border-primary/30 hover:shadow-xl transition-all duration-300 group"
                    >
                      <div className="w-12 h-12 md:w-14 md:h-14 rounded-full bg-accent/10 flex items-center justify-center mb-4 group-hover:bg-accent/20 transition-colors">
                        <IconComp className="text-accent" size={24} />
                      </div>
                      <h3 className="font-display text-base md:text-lg font-semibold text-foreground group-hover:text-primary transition-colors mb-2">
                        {specialty.title}
                      </h3>
                      <p className="text-xs md:text-sm text-muted-foreground leading-relaxed">
                        {specialty.description}
                      </p>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          </section>
        );

      case "procedures":
        return (
          <section key="procedures" className="bg-teal-light py-16 md:py-24">
            <div className="container">
              <div className="text-center mb-12">
                <span className="text-accent text-sm font-semibold uppercase tracking-wider">
                  {home.procedures.eyebrow}
                </span>
                <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground mt-2">
                  {home.procedures.heading}
                </h2>
              </div>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {home.procedures.items.map((procedure, i) => (
                  <motion.div
                    key={procedure.title}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.1 }}
                    className="bg-card rounded-xl overflow-hidden border shadow-sm hover:shadow-lg transition-all p-6"
                  >
                    <div className="text-4xl mb-4">{procedure.icon}</div>
                    <h3 className="font-display text-xl font-semibold text-foreground mb-3">{procedure.title}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed mb-4">{procedure.description}</p>
                    <Link
                      to={procedure.ctaLink || "/book"}
                      className="inline-flex items-center gap-1 text-sm font-semibold text-primary hover:text-accent transition-colors"
                    >
                      Book Consultation <ArrowRight size={14} />
                    </Link>
                  </motion.div>
                ))}
              </div>
            </div>
          </section>
        );

      case "why_choose":
        return (
          <section key="why_choose" className="py-16 md:py-24">
            <div className="container">
              <div className="text-center mb-12">
                <span className="text-accent text-sm font-semibold uppercase tracking-wider">
                  {home.whyChoose.eyebrow}
                </span>
                <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground mt-2">
                  {home.whyChoose.heading}
                </h2>
              </div>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {home.whyChoose.items.map((item, i) => {
                  const IconComp = iconMap[item.icon] || Shield;
                  return (
                    <motion.div
                      key={item.title}
                      initial={{ opacity: 0, y: 20 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: i * 0.1 }}
                      className="bg-card rounded-xl p-6 border text-center hover:shadow-lg transition-shadow"
                    >
                      <div className="w-14 h-14 rounded-full bg-accent/10 flex items-center justify-center mx-auto mb-4">
                        <IconComp className="text-accent" size={24} />
                      </div>
                      <h3 className="font-display text-base font-semibold text-foreground mb-2">{item.title}</h3>
                      <p className="text-sm text-muted-foreground leading-relaxed">{item.description}</p>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          </section>
        );

      case "testimonials":
        return (
          <section key="testimonials" className="bg-hero-gradient py-16 md:py-24">
            <div className="container">
              <div className="text-center mb-12">
                <span className="text-accent text-sm font-semibold uppercase tracking-wider">
                  {home.testimonials.eyebrow}
                </span>
                <h2 className="font-display text-3xl md:text-4xl font-bold text-primary-foreground mt-2">
                  {home.testimonials.heading}
                </h2>
                <div className="flex items-center justify-center gap-2 mt-3">
                  <div className="flex gap-0.5">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} size={18} className="fill-accent text-accent" />
                    ))}
                  </div>
                  <span className="text-primary-foreground/80 text-sm font-medium">
                    {config.googleRating} / 5 based on {config.googleReviewCount}+ Google reviews
                  </span>
                </div>
              </div>

              {/* Video testimonial (portrait) */}
              {home.testimonials.videoUrl && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  className="max-w-[280px] sm:max-w-[320px] mx-auto mb-12"
                >
                  <div className="rounded-2xl overflow-hidden border border-primary-foreground/10 shadow-2xl bg-card/10 backdrop-blur-md">
                    <video
                      controls
                      playsInline
                      preload="metadata"
                      className="w-full h-auto max-h-[70vh] block mx-auto"
                      aria-label="Patient video testimonial"
                    >
                      <source src={home.testimonials.videoUrl} type="video/mp4" />
                      Your browser does not support the video tag.
                    </video>
                  </div>
                  <p className="text-center text-primary-foreground/70 text-sm mt-3">
                    {home.testimonials.videoCaption}
                  </p>
                </motion.div>
              )}

              <div className="grid md:grid-cols-2 gap-6 max-w-5xl mx-auto">
                {testimonials.map((t, i) => (
                  <motion.div
                    key={t.id}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.1 }}
                    className="bg-card/10 backdrop-blur-md rounded-xl p-6 border border-primary-foreground/10 shadow-lg hover:shadow-xl transition-shadow"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex gap-1">
                        {[...Array(t.rating)].map((_, j) => (
                          <Star key={j} size={16} className="fill-accent text-accent" />
                        ))}
                      </div>
                      <span className="text-xs bg-blue-500/20 text-blue-300 rounded-full px-2 py-1 font-medium">
                        ✓ Verified Google Review
                      </span>
                    </div>
                    <p className="text-sm text-primary-foreground/90 leading-relaxed mb-4">"{t.text}"</p>
                    {t.response && (
                      <div className="bg-primary-foreground/10 rounded-lg p-3 mb-4 border-l-2 border-accent">
                        <p className="text-xs font-semibold text-accent mb-1">Doctor's Response:</p>
                        <p className="text-xs text-primary-foreground/80 italic">"{t.response}"</p>
                      </div>
                    )}
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-accent/20 flex items-center justify-center text-accent text-sm font-bold">
                        {t.name
                          .split(" ")
                          .map((n) => n[0])
                          .join("")
                          .slice(0, 2)}
                      </div>
                      <div>
                        <div className="text-sm font-semibold text-primary-foreground">{t.name}</div>
                        <div className="text-xs text-primary-foreground/60">Google Review</div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
              <div className="text-center mt-10">
                <a
                  href={home.testimonials.googleReviewsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-lg bg-card/20 backdrop-blur-sm border border-primary-foreground/20 px-6 py-3 text-sm font-semibold text-primary-foreground transition-all hover:bg-card/30"
                >
                  Read all reviews on Google
                  <ArrowRight size={16} />
                </a>
              </div>
            </div>
          </section>
        );

      case "cta":
        return (
          <section key="cta" className="py-16 md:py-24">
            <div className="container">
              <div className="bg-gold-light rounded-2xl p-8 md:p-14 text-center">
                <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-4">
                  {home.cta.heading}
                </h2>
                <p className="text-muted-foreground max-w-xl mx-auto mb-8">
                  Book a consultation with {config.doctorName} today. {home.cta.description}
                </p>
                <div className="flex flex-wrap justify-center gap-3">
                  <Link
                    to={home.cta.primaryCtaLink || "/book"}
                    className="inline-flex items-center gap-2 rounded-lg bg-accent px-6 py-3 text-sm font-semibold text-accent-foreground shadow-lg hover:opacity-90"
                  >
                    {home.cta.primaryCtaLabel} <ArrowRight size={16} />
                  </Link>
                  <a
                    href={`https://wa.me/${config.whatsapp?.replace(/\D/g, "") || "919441824999"}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() =>
                      trackClick("whatsapp_click", {
                        event_label: "home_cta",
                        page_location: typeof window !== "undefined" ? window.location.pathname : "",
                      })
                    }
                    className="inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground hover:opacity-90"
                  >
                    {home.cta.whatsappCtaLabel}
                  </a>
                </div>
              </div>
            </div>
          </section>
        );

      default:
        return null;
    }
  };

  return (
    <>
      <SEO
        title="Home"
        description={`${config.doctorName} - Expert Orthopedic Surgeon in Hyderabad. ${config.specialization}. ${config.yearsExperience}+ years experience. Book your consultation today.`}
        keywords={`orthopedic doctor near me, best knee replacement surgeon near me, best fracture care near me, best hip replacement surgeon near me, best orthopedic doctor in Hyderabad, orthopedic surgeon Hyderabad, ${config.doctorName}, joint replacement, sports medicine, knee replacement, hip replacement, trauma care, bone specialist`}
        url="/"
      />
      <PreviewBanner usingDraft={usingDraft} workflowStatus={workflowStatus} editorPath="/admin/pages" />
      {visibleSections.map((s) => renderSection(s.id))}
    </>
  );
}
