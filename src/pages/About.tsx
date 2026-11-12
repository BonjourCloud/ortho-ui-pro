import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, Award, BookOpen, GraduationCap, Stethoscope } from "lucide-react";
import heroImage from "@/assets/hero-doctor.jpg";
import { usePreviewSiteConfig, useSitePageContent } from "@/hooks/usePageContent";
import { CmsDraftPreviewBanner, PageFaqSection, PageHighlightsGrid, PageRichBodySection } from "@/components/PageCmsSupplement";
import SEO from "@/components/SEO";

export default function About() {
  const { config, usingDraft: configDraft, workflowStatus: configStatus } = usePreviewSiteConfig("doctor");
  const { content: page, usingDraft: pageDraft, workflowStatus: pageStatus } = useSitePageContent("about");

  const usingDraft = configDraft || pageDraft;
  const workflowStatus = pageDraft ? pageStatus : configStatus;

  const meetPrefix = page.customLabels.meetPrefix ?? "Meet";
  const heroHeading = page.heroTitle?.trim() || `${meetPrefix} ${config.doctorName}`;
  const heroSubtitle = page.heroSubtitle?.trim() || config.title;
  const portraitUrl = page.heroImageUrl?.trim() || config.heroImageUrl || heroImage;
  const portraitAlt = page.heroImageAlt?.trim() || config.doctorName;

  const philosophyHeading = page.customLabels.philosophyHeading || "My Philosophy";
  const educationHeading = page.customLabels.educationHeading || "Education & Training";
  const awardsHeading = page.customLabels.awardsHeading || "Awards & Recognition";
  const membershipsHeading = page.customLabels.membershipsHeading || "Professional Memberships";

  const showEducation = Boolean(config.showEducationSection && config.education?.length > 0);
  const showAwards = Boolean(config.showAwardsSection && config.awards?.length > 0);
  const showFellowship = config.showFellowshipCard ?? true;

  const fellowshipBadge = config.fellowshipBadge || "🇰🇷";
  const fellowshipTitle = config.fellowshipTitle || "International Fellowship — South Korea";
  const fellowshipDescription =
    config.fellowshipDescription ||
    "Advanced training in Shoulder & Elbow Surgery under Dr. Young Rae Moon, President of the Korean Shoulder and Elbow Society. One of the very few orthopaedic surgeons in Hyderabad with international fellowship training.";

  return (
    <>
      <SEO
        title="About"
        description={`Learn about ${config.doctorName}, ${config.title}. ${config.yearsExperience}+ years of experience in ${config.specialization}. Dedicated to providing exceptional orthopedic care.`}
        keywords={`about ${config.doctorName}, orthopedic surgeon profile, doctor credentials, medical education, orthopedic specialist`}
        url="/about"
      />
      <CmsDraftPreviewBanner usingDraft={usingDraft} workflowStatus={workflowStatus} pageLabel="About Doctor" />

      {/* Hero */}
      <section className="bg-hero-gradient py-16 md:py-24">
        <div className="container">
          <div className="grid md:grid-cols-2 gap-10 items-center">
            <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
              <span className="text-accent text-sm font-semibold uppercase tracking-wider">
                {page.heroEyebrow || "About"}
              </span>
              <h1 className="font-display text-4xl md:text-5xl font-bold text-primary-foreground mt-2 mb-5">
                {heroHeading}
              </h1>
              <p className="text-primary-foreground/80 leading-relaxed mb-4">{heroSubtitle}</p>
              <p className="text-primary-foreground/70 leading-relaxed">{config.fullBio}</p>
            </motion.div>
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.6, delay: 0.2 }}>
              <img
                src={portraitUrl}
                alt={portraitAlt}
                className="rounded-2xl shadow-2xl w-full object-cover object-center aspect-[4/3]"
                style={{ objectPosition: "center 30%" }}
              />
            </motion.div>
          </div>
        </div>
      </section>

      {/* Philosophy */}
      {config.philosophy && (
        <section className="py-16 md:py-24">
          <div className="container max-w-3xl text-center">
            <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
              <Stethoscope className="mx-auto text-accent mb-4" size={36} />
              <h2 className="font-display text-2xl md:text-3xl font-bold text-foreground mb-4">{philosophyHeading}</h2>
              <blockquote className="text-lg text-muted-foreground italic leading-relaxed border-l-4 border-accent pl-6 text-left">
                "{config.philosophy}"
              </blockquote>
            </motion.div>
          </div>
        </section>
      )}

      {/* Optional Rich Text Body from Page Editor */}
      <PageRichBodySection bodyHtml={page.bodyHtml} />

      {/* Optional Highlight Cards */}
      {page.highlights.length > 0 && (
        <div className="container max-w-4xl">
          <PageHighlightsGrid highlights={page.highlights} />
        </div>
      )}

      {/* Education (Shown when enabled in Doctor Profile) */}
      {showEducation && (
        <section className="bg-teal-light py-16 md:py-24">
          <div className="container max-w-3xl">
            <div className="text-center mb-10">
              <GraduationCap className="mx-auto text-accent mb-3" size={32} />
              <h2 className="font-display text-2xl md:text-3xl font-bold text-foreground">{educationHeading}</h2>
            </div>
            <div className="space-y-4">
              {config.education.map((edu, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                  className="bg-card rounded-xl p-5 border flex items-start gap-4"
                >
                  <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center shrink-0">
                    <BookOpen className="text-accent" size={18} />
                  </div>
                  <div>
                    <h3 className="font-display font-semibold text-foreground">{edu.degree}</h3>
                    <p className="text-sm text-muted-foreground">{edu.institution}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {edu.yearStart} - {edu.yearEnd || "Present"}
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Awards (Shown when enabled in Doctor Profile) */}
      {showAwards && (
        <section className="py-16 md:py-24">
          <div className="container max-w-3xl">
            <div className="text-center mb-10">
              <Award className="mx-auto text-accent mb-3" size={32} />
              <h2 className="font-display text-2xl md:text-3xl font-bold text-foreground">{awardsHeading}</h2>
            </div>
            <div className="space-y-4">
              {config.awards.map((award, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                  className="bg-card rounded-xl p-5 border flex items-start gap-4"
                >
                  <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center shrink-0">
                    <Award className="text-accent" size={18} />
                  </div>
                  <div>
                    <h3 className="font-display font-semibold text-foreground">{award.title}</h3>
                    <p className="text-sm text-muted-foreground">
                      {award.organization} • {award.year}
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* International Fellowship Spotlight Card */}
      {showFellowship && (
        <section className="py-12 md:py-16">
          <div className="container max-w-3xl">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="rounded-2xl border-2 border-accent/40 bg-card shadow-lg p-6 md:p-8 flex flex-col gap-5"
            >
              <div className="flex items-start gap-5">
                <div className="text-4xl md:text-5xl shrink-0" aria-hidden="true">
                  {fellowshipBadge}
                </div>
                <div>
                  <h3 className="font-display text-xl md:text-2xl font-bold text-foreground mb-2">
                    {fellowshipTitle}
                  </h3>
                  {config.fellowshipSubtitle && (
                    <p className="text-xs font-semibold uppercase tracking-wide text-accent mb-2">
                      {config.fellowshipSubtitle}
                    </p>
                  )}
                  <p className="text-muted-foreground leading-relaxed">{fellowshipDescription}</p>
                </div>
              </div>
              {config.fellowshipImageUrl && (
                <img
                  src={config.fellowshipImageUrl}
                  alt={fellowshipTitle}
                  className="rounded-xl w-full max-h-80 object-cover border"
                />
              )}
            </motion.div>
          </div>
        </section>
      )}

      {/* Memberships */}
      {config.memberships.length > 0 && (
        <section className="bg-gold-light py-16">
          <div className="container max-w-3xl text-center">
            <h2 className="font-display text-2xl md:text-3xl font-bold text-foreground mb-6">
              {membershipsHeading}
            </h2>
            <div className="flex flex-wrap justify-center gap-3">
              {config.memberships.map((m, i) => (
                <span
                  key={i}
                  className="bg-card rounded-full px-5 py-2 text-sm font-medium text-foreground border shadow-sm"
                >
                  {m}
                </span>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Optional FAQs */}
      <PageFaqSection faqs={page.faqs} />

      {/* Bottom CTA */}
      {page.ctaHeading && (
        <section className="py-12 md:py-16 bg-secondary/40">
          <div className="container max-w-3xl text-center">
            <h2 className="font-display text-2xl md:text-3xl font-bold text-foreground mb-3">
              {page.ctaHeading}
            </h2>
            {page.ctaDescription && (
              <p className="text-muted-foreground mb-6">{page.ctaDescription}</p>
            )}
            <div className="flex flex-wrap justify-center gap-3">
              {page.ctaPrimaryLabel && (
                <Link
                  to={page.ctaPrimaryLink || "/book"}
                  className="inline-flex items-center gap-2 rounded-lg bg-accent px-6 py-3 text-sm font-semibold text-accent-foreground hover:opacity-90 transition-all shadow-md"
                >
                  {page.ctaPrimaryLabel} <ArrowRight size={16} />
                </Link>
              )}
              {page.ctaSecondaryLabel && (
                <Link
                  to={page.ctaSecondaryLink || "/second-opinion"}
                  className="inline-flex items-center gap-2 rounded-lg border bg-card px-6 py-3 text-sm font-semibold text-foreground hover:bg-secondary transition-all"
                >
                  {page.ctaSecondaryLabel}
                </Link>
              )}
            </div>
          </div>
        </section>
      )}
    </>
  );
}
