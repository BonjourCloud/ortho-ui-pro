import { useParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Calendar, Clock, TrendingDown, TrendingUp, CheckCircle, Quote } from "lucide-react";
import { caseStudies } from "@/data/mockData";
import { useSiteConfig } from "@/contexts/SiteConfigContext";

export default function CaseStudyDetail() {
  const { slug } = useParams();
  const { config } = useSiteConfig();
  const cs = caseStudies.find((c) => c.slug === slug);

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

  return (
    <>
      <section className="bg-hero-gradient py-14 md:py-20">
        <div className="container max-w-3xl">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <Link to="/case-studies" className="inline-flex items-center gap-1 text-primary-foreground/70 text-sm mb-4 hover:text-primary-foreground">
              <ArrowLeft size={14} /> Back to Case Studies
            </Link>
            <span className="block text-accent text-sm font-semibold mb-2">{cs.surgeryType} • {cs.patientInitials} • Age {cs.age}</span>
            <h1 className="font-display text-3xl md:text-4xl font-bold text-primary-foreground mb-3">{cs.condition}</h1>
            <p className="text-primary-foreground/70">{cs.procedureName} by {config.doctorName}</p>
          </motion.div>
        </div>
      </section>

      <section className="py-12 md:py-16">
        <div className="container max-w-3xl">
          {/* Patient Info */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
            className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10"
          >
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
              <div className="font-display font-bold text-foreground">{cs.hospitalStayDays} day{cs.hospitalStayDays > 1 ? "s" : ""}</div>
            </div>
            <div className="bg-card rounded-xl border p-4 text-center">
              <div className="text-xs text-muted-foreground mb-1">Follow-Up</div>
              <div className="font-display font-bold text-foreground text-sm">{cs.followUpPeriod}</div>
            </div>
          </motion.div>

          {/* Outcome */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <h2 className="font-display text-xl font-bold text-foreground mb-3">Outcome Summary</h2>
            <p className="text-muted-foreground leading-relaxed mb-8">{cs.outcomeSummary}</p>

            {/* Pain & ROM comparison */}
            <div className="grid sm:grid-cols-2 gap-4 mb-10">
              <div className="bg-card rounded-xl border p-5">
                <h3 className="font-display font-semibold text-foreground mb-3">Pain Score</h3>
                <div className="flex items-center justify-between">
                  <div className="text-center">
                    <div className="text-xs text-muted-foreground">Before</div>
                    <div className="font-display text-3xl font-bold text-destructive flex items-center gap-1">
                      {cs.painScorePre} <TrendingUp size={18} />
                    </div>
                  </div>
                  <div className="text-2xl text-muted-foreground">→</div>
                  <div className="text-center">
                    <div className="text-xs text-muted-foreground">After</div>
                    <div className="font-display text-3xl font-bold text-primary flex items-center gap-1">
                      {cs.painScorePost} <TrendingDown size={18} />
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-card rounded-xl border p-5">
                <h3 className="font-display font-semibold text-foreground mb-3">Range of Motion</h3>
                <div className="flex items-center justify-between">
                  <div className="text-center">
                    <div className="text-xs text-muted-foreground">Before</div>
                    <div className="font-display text-xl font-bold text-destructive">{cs.rangeOfMotionPre}</div>
                  </div>
                  <div className="text-2xl text-muted-foreground">→</div>
                  <div className="text-center">
                    <div className="text-xs text-muted-foreground">After</div>
                    <div className="font-display text-xl font-bold text-primary">{cs.rangeOfMotionPost}</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Recovery milestones */}
            <h2 className="font-display text-xl font-bold text-foreground mb-4">Recovery Timeline</h2>
            <div className="space-y-4 mb-10">
              {cs.milestones.map((m, i) => (
                <motion.div key={i} initial={{ opacity: 0, x: -20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }}
                  className="flex gap-4 items-start"
                >
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

            {/* Testimonial */}
            <div className="bg-gold-light rounded-xl p-6 mb-8">
              <Quote className="text-accent mb-3" size={24} />
              <p className="text-foreground italic leading-relaxed mb-3">"{cs.testimonial}"</p>
              <div className="text-sm font-semibold text-foreground">{cs.patientInitials}, {cs.age} • {cs.occupation}</div>
            </div>

            {/* Return info */}
            <div className="grid sm:grid-cols-2 gap-4">
              {cs.returnToWork && (
                <div className="bg-teal-light rounded-xl p-4">
                  <div className="text-xs text-muted-foreground mb-1">Return to Work</div>
                  <div className="text-sm font-semibold text-foreground">{cs.returnToWork}</div>
                </div>
              )}
              {cs.returnToSports && (
                <div className="bg-teal-light rounded-xl p-4">
                  <div className="text-xs text-muted-foreground mb-1">Return to Activities</div>
                  <div className="text-sm font-semibold text-foreground">{cs.returnToSports}</div>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      </section>
    </>
  );
}
