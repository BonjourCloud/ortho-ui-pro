import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Star, ArrowRight, Shield, Heart, Zap, Users } from "lucide-react";
import heroImage from "@/assets/hero-doctor.jpg";
import { useSiteConfig } from "@/contexts/SiteConfigContext";
import { useServices, useTestimonials } from "@/hooks/useContent";
import SEO from "@/components/SEO";

const iconMap: Record<string, React.ElementType> = { Shield, Zap, Heart, Users };

export default function Index() {
  const { config } = useSiteConfig();
  const { services } = useServices();
  const { testimonials } = useTestimonials();

  const stats = [
    { label: "Years Experience", value: `${config.yearsExperience}+` },
    { label: "Happy Patients", value: `${config.happyPatients.toLocaleString()}+` },
    { label: "Surgeries", value: `${config.surgeriesCompleted.toLocaleString()}+` },
    { label: "Branches", value: `${config.branches}` },
  ];

  return (
    <>
      <SEO
        title="Home"
        description={`${config.doctorName} - Expert Orthopedic Surgeon in Hyderabad. ${config.specialization}. ${config.yearsExperience}+ years experience. Book your consultation today.`}
        keywords={`orthopedic surgeon hyderabad, ${config.doctorName}, joint replacement, sports medicine, knee replacement, hip replacement, orthopedic doctor`}
        url="/"
      />
      {/* Hero */}
      <section className="relative overflow-hidden bg-hero-gradient">
        <div className="container relative z-10 py-16 md:py-24">
          <div className="grid md:grid-cols-2 gap-10 items-center">
            <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }}>
              <span className="inline-block bg-accent/20 text-accent rounded-full px-4 py-1.5 text-xs font-semibold mb-4 backdrop-blur-sm border border-accent/30">
                Orthopedic Excellence in Hyderabad
              </span>
              <h1 className="font-display text-4xl md:text-5xl lg:text-6xl font-bold text-primary-foreground leading-tight mb-5">
                Move Freely.<br /><span className="text-gradient-gold">Live Fully.</span>
              </h1>
              <p className="text-primary-foreground/80 text-base md:text-lg max-w-lg mb-8 font-body leading-relaxed">
                {config.shortBio}
              </p>
              <div className="flex flex-wrap gap-3">
                <Link to="/book" className="inline-flex items-center gap-2 rounded-lg bg-accent px-6 py-3 text-sm font-semibold text-accent-foreground transition-all hover:opacity-90 shadow-lg">
                  Book Appointment <ArrowRight size={16} />
                </Link>
                <Link to="/services" className="inline-flex items-center gap-2 rounded-lg border border-primary-foreground/30 px-6 py-3 text-sm font-semibold text-primary-foreground transition-all hover:bg-primary-foreground/10">
                  Our Services
                </Link>
              </div>
            </motion.div>
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.7, delay: 0.2 }} className="hidden md:block">
              <div className="relative">
                <img src={config.heroImageUrl || heroImage} alt={`${config.doctorName} - Orthopedic Surgeon`} className="rounded-2xl shadow-2xl w-full object-cover object-center aspect-[4/3]" style={{ objectPosition: 'center 30%' }} />
                <div className="absolute -bottom-4 -left-4 bg-card rounded-xl p-4 shadow-xl">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-accent/10 flex items-center justify-center"><Star className="text-accent" size={24} /></div>
                    <div>
                      <div className="font-display font-bold text-foreground text-lg">4.9★</div>
                      <div className="text-xs text-muted-foreground">500+ Reviews</div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="bg-card border-b">
        <div className="container py-10">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {stats.map((s, i) => (
              <motion.div key={s.label} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }} className="text-center">
                <div className="font-display text-3xl md:text-4xl font-bold text-primary">{s.value}</div>
                <div className="text-sm text-muted-foreground mt-1">{s.label}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Services */}
      <section className="py-16 md:py-24">
        <div className="container">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-12">
            <span className="text-accent text-sm font-semibold uppercase tracking-wider">Our Specialties</span>
            <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground mt-2">Comprehensive Orthopedic Care</h2>
          </motion.div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {config.serviceCategories.map((cat, i) => (
              <motion.div key={cat.slug} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }}>
                <Link to="/services" className="block bg-card rounded-xl p-6 border hover:border-primary/30 hover:shadow-lg transition-all group h-full">
                  <div className="text-4xl mb-4">{cat.icon}</div>
                  <h3 className="font-display text-lg font-semibold text-foreground group-hover:text-primary transition-colors mb-2">{cat.name}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{cat.description}</p>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Services from DB */}
      <section className="bg-teal-light py-16 md:py-24">
        <div className="container">
          <div className="text-center mb-12">
            <span className="text-accent text-sm font-semibold uppercase tracking-wider">Popular Treatments</span>
            <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground mt-2">Featured Procedures</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {services.slice(0, 3).map((svc, i) => (
              <motion.div key={svc.id} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }} className="bg-card rounded-xl overflow-hidden border shadow-sm hover:shadow-lg transition-all">
                <div className="p-6">
                  <span className="text-xs font-medium text-accent bg-accent/10 rounded-full px-3 py-1">{svc.category}</span>
                  <h3 className="font-display text-xl font-semibold text-foreground mt-3 mb-2">{svc.name}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed mb-4">{svc.short_description}</p>
                  <div className="grid grid-cols-2 gap-3 text-xs text-muted-foreground mb-4">
                    <div><span className="font-semibold text-foreground">Time:</span> {svc.procedure_time}</div>
                    <div><span className="font-semibold text-foreground">Stay:</span> {svc.hospital_stay}</div>
                    <div><span className="font-semibold text-foreground">Success:</span> {svc.success_rate}</div>
                    <div><span className="font-semibold text-foreground">Cost:</span> {svc.cost_range}</div>
                  </div>
                  <Link to="/services" className="inline-flex items-center gap-1 text-sm font-semibold text-primary hover:text-accent transition-colors">
                    Learn More <ArrowRight size={14} />
                  </Link>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Why Choose */}
      <section className="py-16 md:py-24">
        <div className="container">
          <div className="text-center mb-12">
            <span className="text-accent text-sm font-semibold uppercase tracking-wider">Why Us</span>
            <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground mt-2">Why Choose {config.doctorName}?</h2>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {config.whyChoose.map((item, i) => {
              const IconComp = iconMap[item.icon] || Shield;
              return (
                <motion.div key={item.title} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }} className="bg-card rounded-xl p-6 border text-center">
                  <div className="w-14 h-14 rounded-full bg-accent/10 flex items-center justify-center mx-auto mb-4"><IconComp className="text-accent" size={24} /></div>
                  <h3 className="font-display text-base font-semibold text-foreground mb-2">{item.title}</h3>
                  <p className="text-sm text-muted-foreground">{item.desc}</p>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="bg-hero-gradient py-16 md:py-24">
        <div className="container">
          <div className="text-center mb-12">
            <span className="text-accent text-sm font-semibold uppercase tracking-wider">Testimonials</span>
            <h2 className="font-display text-3xl md:text-4xl font-bold text-primary-foreground mt-2">Patient Stories</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {testimonials.map((t, i) => (
              <motion.div key={t.id} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }} className="bg-card/10 backdrop-blur-md rounded-xl p-6 border border-primary-foreground/10">
                <div className="flex gap-1 mb-3">
                  {[...Array(t.rating)].map((_, j) => (<Star key={j} size={16} className="fill-accent text-accent" />))}
                </div>
                <p className="text-sm text-primary-foreground/90 leading-relaxed mb-4 italic">"{t.text}"</p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-accent/20 flex items-center justify-center text-accent text-sm font-bold">{t.initials}</div>
                  <div>
                    <div className="text-sm font-semibold text-primary-foreground">{t.patient_name}</div>
                    <div className="text-xs text-primary-foreground/60">{t.condition} • {t.location}</div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 md:py-24">
        <div className="container">
          <div className="bg-gold-light rounded-2xl p-8 md:p-14 text-center">
            <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-4">Ready to Move Without Pain?</h2>
            <p className="text-muted-foreground max-w-xl mx-auto mb-8">
              Book a consultation with {config.doctorName} today. Insurance accepted, EMI options available.
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              <Link to="/book" className="inline-flex items-center gap-2 rounded-lg bg-accent px-6 py-3 text-sm font-semibold text-accent-foreground shadow-lg hover:opacity-90">
                Book Appointment <ArrowRight size={16} />
              </Link>
              <a href={`https://wa.me/${config.whatsapp?.replace(/\D/g, "") || "919876543210"}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground hover:opacity-90">
                WhatsApp Us
              </a>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
