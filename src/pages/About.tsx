import { motion } from "framer-motion";
import { Award, BookOpen, GraduationCap, Stethoscope } from "lucide-react";
import heroImage from "@/assets/hero-doctor.jpg";
import { useSiteConfig } from "@/contexts/SiteConfigContext";

export default function About() {
  const { config } = useSiteConfig();

  return (
    <>
      {/* Hero */}
      <section className="bg-hero-gradient py-16 md:py-24">
        <div className="container">
          <div className="grid md:grid-cols-2 gap-10 items-center">
            <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
              <span className="text-accent text-sm font-semibold uppercase tracking-wider">About</span>
              <h1 className="font-display text-4xl md:text-5xl font-bold text-primary-foreground mt-2 mb-5">
                Meet {config.doctorName}
              </h1>
              <p className="text-primary-foreground/80 leading-relaxed mb-4">{config.title}</p>
              <p className="text-primary-foreground/70 leading-relaxed">{config.fullBio}</p>
            </motion.div>
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.6, delay: 0.2 }}>
              <img src={config.heroImageUrl || heroImage} alt={config.doctorName} className="rounded-2xl shadow-2xl w-full object-cover aspect-[4/3]" />
            </motion.div>
          </div>
        </div>
      </section>

      {/* Philosophy */}
      <section className="py-16 md:py-24">
        <div className="container max-w-3xl text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
            <Stethoscope className="mx-auto text-accent mb-4" size={36} />
            <h2 className="font-display text-2xl md:text-3xl font-bold text-foreground mb-4">My Philosophy</h2>
            <blockquote className="text-lg text-muted-foreground italic leading-relaxed border-l-4 border-accent pl-6 text-left">
              "{config.philosophy}"
            </blockquote>
          </motion.div>
        </div>
      </section>

      {/* Education */}
      <section className="bg-teal-light py-16 md:py-24">
        <div className="container max-w-3xl">
          <div className="text-center mb-10">
            <GraduationCap className="mx-auto text-accent mb-3" size={32} />
            <h2 className="font-display text-2xl md:text-3xl font-bold text-foreground">Education & Training</h2>
          </div>
          <div className="space-y-4">
            {config.education.map((edu, i) => (
              <motion.div key={i} initial={{ opacity: 0, x: -20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }}
                className="bg-card rounded-xl p-5 border flex items-start gap-4">
                <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center shrink-0"><BookOpen className="text-accent" size={18} /></div>
                <div>
                  <h3 className="font-display font-semibold text-foreground">{edu.degree}</h3>
                  <p className="text-sm text-muted-foreground">{edu.institution}</p>
                  <p className="text-xs text-muted-foreground mt-1">{edu.yearStart} - {edu.yearEnd || "Present"}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Awards */}
      <section className="py-16 md:py-24">
        <div className="container max-w-3xl">
          <div className="text-center mb-10">
            <Award className="mx-auto text-accent mb-3" size={32} />
            <h2 className="font-display text-2xl md:text-3xl font-bold text-foreground">Awards & Recognition</h2>
          </div>
          <div className="space-y-4">
            {config.awards.map((award, i) => (
              <motion.div key={i} initial={{ opacity: 0, x: -20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }}
                className="bg-card rounded-xl p-5 border flex items-start gap-4">
                <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center shrink-0"><Award className="text-accent" size={18} /></div>
                <div>
                  <h3 className="font-display font-semibold text-foreground">{award.title}</h3>
                  <p className="text-sm text-muted-foreground">{award.organization} • {award.year}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Memberships */}
      <section className="bg-gold-light py-16">
        <div className="container max-w-3xl text-center">
          <h2 className="font-display text-2xl md:text-3xl font-bold text-foreground mb-6">Professional Memberships</h2>
          <div className="flex flex-wrap justify-center gap-3">
            {config.memberships.map((m, i) => (
              <span key={i} className="bg-card rounded-full px-5 py-2 text-sm font-medium text-foreground border shadow-sm">{m}</span>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
