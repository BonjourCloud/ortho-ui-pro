import { useParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, TrendingDown, TrendingUp, CheckCircle, Quote } from "lucide-react";
import { useCaseStudy } from "@/hooks/useContent";
import { useSiteConfig } from "@/contexts/SiteConfigContext";
import SEO from "@/components/SEO";

interface Milestone {
  day: number;
  title: string;
  description: string;
}

export default function CaseStudyDetail() {
  const { slug } = useParams();
  const { config } = useSiteConfig();
  const { study: cs, loading } = useCaseStudy(slug);

  if (loading) {
    return <section className="py-20"><div className="container text-center text-muted-foreground">Loading...</div></section>;
  }

  if (!cs) {
    return (
      <section className="py-20">
        <div className="container text-center">
          <h1 className="font-display text-3xl font-bold text-foreground mb-4">Case Study Not Found</h1>
          <Link to="/case-studies" className="text-primary font-medium">← Back to Case Studies</Link>
        </div>
      </section>
    );
  }

  const milestones = (cs.milestones as unknown as Milestone[] | null) || [];

  return (
    <>
      <SEO
        title={cs.title}
        description={`${cs.condition} case study: ${cs.patient_age} year old ${cs.patient_gender}. Treatment: ${cs.treatment}. ${cs.summary}`}
        keywords={`${cs.condition}, ${cs.treatment}, case study, patient outcome, orthopedic surgery`}
        url={`/case-studies/${cs.slug}`}
        type="article"
      />
      <section className="bg-hero-gradient py-14 md:py-20">
        <div className="container max-w-3xl">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <Link to="/case-studies" className="inline-flex items-center gap-1 text-primary-foreground/70 text-sm mb-4 hover:text-primary-foreground">
              <ArrowLeft size={14} /> Back to Case Studies
            </Link>
            <span className="block text-accent text-sm font-semibold mb-2">{cs.surgery_type} • {cs.patient_initials} • Age {cs.age}</span>
            <h1 className="font-display text-3xl md:text-4xl font-bold text-primary-foreground mb-3">{cs.condition}</h1>
            <p className="text-primary-foreground/70">{cs.procedure_name} by {config.doctorName}</p>
          </motion.div>
        </div>
      </section>

      <section className="py-12 md:py-16">
        <div className="container max-w-3xl">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
            className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
            <div className="bg-card rounded-xl border p-4 text-center">
              <div className="text-xs text-muted-foreground mb-1">Age / Gender</div>
              <div className="font-display font-bold text-foreground">{cs.age} / {cs.gender}</div>
            </div>
            <div className="bg-card rounded-xl border p-4 text-center">
              <div className="text-xs text-muted-foreground mb-1">Occupation</div>
              <div className="font-display font-bold text-foreground text-sm">{cs.occupation}</div>
            </div>
            <div className="bg-card rounded-xl border p-4 text-center">
              <div className="text-xs text-muted-foreground mb-1">Hospital Stay</div>
              <div className="font-display font-bold text-foreground">{cs.hospital_stay_days} day{(cs.hospital_stay_days || 1) > 1 ? "s" : ""}</div>
            </div>
            <div className="bg-card rounded-xl border p-4 text-center">
              <div className="text-xs text-muted-foreground mb-1">Follow-Up</div>
              <div className="font-display font-bold text-foreground text-sm">{cs.follow_up_period}</div>
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <h2 className="font-display text-xl font-bold text-foreground mb-3">Outcome Summary</h2>
            <p className="text-muted-foreground leading-relaxed mb-8">{cs.outcome_summary}</p>

            <div className="grid sm:grid-cols-2 gap-4 mb-10">
              <div className="bg-card rounded-xl border p-5">
                <h3 className="font-display font-semibold text-foreground mb-3">Pain Score</h3>
                <div className="flex items-center justify-between">
                  <div className="text-center">
                    <div className="text-xs text-muted-foreground">Before</div>
                    <div className="font-display text-3xl font-bold text-destructive flex items-center gap-1">{cs.pain_score_pre} <TrendingUp size={18} /></div>
                  </div>
                  <div className="text-2xl text-muted-foreground">→</div>
                  <div className="text-center">
                    <div className="text-xs text-muted-foreground">After</div>
                    <div className="font-display text-3xl font-bold text-primary flex items-center gap-1">{cs.pain_score_post} <TrendingDown size={18} /></div>
                  </div>
                </div>
              </div>
              <div className="bg-card rounded-xl border p-5">
                <h3 className="font-display font-semibold text-foreground mb-3">Range of Motion</h3>
                <div className="flex items-center justify-between">
                  <div className="text-center">
                    <div className="text-xs text-muted-foreground">Before</div>
                    <div className="font-display text-xl font-bold text-destructive">{cs.range_of_motion_pre}</div>
                  </div>
                  <div className="text-2xl text-muted-foreground">→</div>
                  <div className="text-center">
                    <div className="text-xs text-muted-foreground">After</div>
                    <div className="font-display text-xl font-bold text-primary">{cs.range_of_motion_post}</div>
                  </div>
                </div>
              </div>
            </div>

            {milestones.length > 0 && (
              <>
                <h2 className="font-display text-xl font-bold text-foreground mb-4">Recovery Timeline</h2>
                <div className="space-y-4 mb-10">
                  {milestones.map((m, i) => (
                    <motion.div key={i} initial={{ opacity: 0, x: -20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }}
                      className="flex gap-4 items-start">
                      <div className="w-14 h-14 rounded-full bg-accent/10 flex flex-col items-center justify-center shrink-0">
                        <div className="font-display text-sm font-bold text-accent">Day</div>
                        <div className="font-display text-xs font-bold text-accent">{m.day}</div>
                      </div>
                      <div className="bg-card rounded-xl border p-4 flex-1">
                        <h4 className="font-display font-semibold text-foreground text-sm flex items-center gap-2">
                          <CheckCircle size={14} className="text-primary" /> {m.title}
                        </h4>
                        <p className="text-xs text-muted-foreground mt-1">{m.description}</p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </>
            )}

            {cs.testimonial && (
              <div className="bg-gold-light rounded-xl p-6 mb-8">
                <Quote className="text-accent mb-3" size={24} />
                <p className="text-foreground italic leading-relaxed mb-3">"{cs.testimonial}"</p>
                <div className="text-sm font-semibold text-foreground">{cs.patient_initials}, {cs.age} • {cs.occupation}</div>
              </div>
            )}

            <div className="grid sm:grid-cols-2 gap-4">
              {cs.return_to_work && (
                <div className="bg-teal-light rounded-xl p-4">
                  <div className="text-xs text-muted-foreground mb-1">Return to Work</div>
                  <div className="text-sm font-semibold text-foreground">{cs.return_to_work}</div>
                </div>
              )}
              {cs.return_to_sports && (
                <div className="bg-teal-light rounded-xl p-4">
                  <div className="text-xs text-muted-foreground mb-1">Return to Activities</div>
                  <div className="text-sm font-semibold text-foreground">{cs.return_to_sports}</div>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      </section>
    </>
  );
}
