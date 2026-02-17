import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { ArrowRight, TrendingUp, TrendingDown } from "lucide-react";
import { caseStudies } from "@/data/mockData";
import { useSiteConfig } from "@/contexts/SiteConfigContext";

export default function CaseStudies() {
  const { config } = useSiteConfig();

  return (
    <>
      <section className="bg-hero-gradient py-14 md:py-20">
        <div className="container text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <span className="text-accent text-sm font-semibold uppercase tracking-wider">Real Results</span>
            <h1 className="font-display text-4xl md:text-5xl font-bold text-primary-foreground mt-2 mb-3">Patient Case Studies</h1>
            <p className="text-primary-foreground/70 max-w-lg mx-auto">Documented outcomes from {config.doctorName}'s practice</p>
          </motion.div>
        </div>
      </section>

      <section className="py-12 md:py-20">
        <div className="container">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {caseStudies.map((cs, i) => (
              <motion.div key={cs.id} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }}>
                <Link to={`/case-studies/${cs.slug}`} className="block bg-card rounded-xl border hover:shadow-lg transition-all overflow-hidden group h-full">
                  <div className="p-6">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-xs font-medium text-accent bg-accent/10 rounded-full px-3 py-1">{cs.surgeryType}</span>
                      <span className="text-xs text-muted-foreground">{cs.patientInitials} • Age {cs.age}</span>
                    </div>
                    <h3 className="font-display text-lg font-semibold text-foreground group-hover:text-primary transition-colors mb-1">{cs.condition}</h3>
                    <p className="text-sm text-muted-foreground mb-2">{cs.procedureName}</p>
                    <p className="text-sm text-muted-foreground leading-relaxed mb-4 line-clamp-2">{cs.outcomeSummary}</p>

                    {/* Pain score comparison */}
                    <div className="grid grid-cols-2 gap-3 p-3 bg-secondary/50 rounded-lg mb-4">
                      <div className="text-center">
                        <div className="text-xs text-muted-foreground mb-1">Pain Before</div>
                        <div className="font-display text-xl font-bold text-destructive flex items-center justify-center gap-1">
                          {cs.painScorePre}/10 <TrendingUp size={14} />
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="text-xs text-muted-foreground mb-1">Pain After</div>
                        <div className="font-display text-xl font-bold text-primary flex items-center justify-center gap-1">
                          {cs.painScorePost}/10 <TrendingDown size={14} />
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>{cs.occupation}</span>
                      <span className="flex items-center gap-1 text-primary font-medium group-hover:text-accent">
                        Read Full Story <ArrowRight size={12} />
                      </span>
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
