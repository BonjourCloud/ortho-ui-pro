import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { ArrowRight, Clock, Building2, CheckCircle, IndianRupee } from "lucide-react";
import { services, serviceCategories } from "@/data/mockData";
import { useState } from "react";

export default function Services() {
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  const filtered = activeCategory
    ? services.filter((s) => s.category === activeCategory)
    : services;

  return (
    <>
      <section className="bg-hero-gradient py-16 md:py-20">
        <div className="container text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <span className="text-accent text-sm font-semibold uppercase tracking-wider">What We Offer</span>
            <h1 className="font-display text-4xl md:text-5xl font-bold text-primary-foreground mt-2 mb-4">Our Services</h1>
            <p className="text-primary-foreground/70 max-w-xl mx-auto">
              Comprehensive orthopedic treatments from joint replacement to sports injury care, all under one roof.
            </p>
          </motion.div>
        </div>
      </section>

      <section className="py-12 md:py-20">
        <div className="container">
          {/* Filter tabs */}
          <div className="flex flex-wrap gap-2 mb-10 justify-center">
            <button
              onClick={() => setActiveCategory(null)}
              className={`rounded-full px-5 py-2 text-sm font-medium transition-all border ${!activeCategory ? "bg-primary text-primary-foreground border-primary" : "bg-card text-muted-foreground border-border hover:border-primary/30"}`}
            >
              All
            </button>
            {serviceCategories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.name)}
                className={`rounded-full px-5 py-2 text-sm font-medium transition-all border ${activeCategory === cat.name ? "bg-primary text-primary-foreground border-primary" : "bg-card text-muted-foreground border-border hover:border-primary/30"}`}
              >
                {cat.icon} {cat.name}
              </button>
            ))}
          </div>

          {/* Services grid */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map((svc, i) => (
              <motion.div
                key={svc.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.05 }}
                className="bg-card rounded-xl border hover:shadow-lg transition-all overflow-hidden group"
              >
                <div className="p-6">
                  <span className="text-xs font-medium text-accent bg-accent/10 rounded-full px-3 py-1">{svc.category}</span>
                  <h3 className="font-display text-xl font-semibold text-foreground mt-3 mb-2 group-hover:text-primary transition-colors">{svc.name}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed mb-4">{svc.shortDescription}</p>

                  <div className="space-y-2 text-sm mb-5">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Clock size={14} className="text-primary" /> {svc.procedureTime}
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Building2 size={14} className="text-primary" /> Hospital Stay: {svc.hospitalStay}
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <CheckCircle size={14} className="text-primary" /> Success Rate: {svc.successRate}
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <IndianRupee size={14} className="text-primary" /> {svc.costRange}
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t">
                    <div className="text-xs text-muted-foreground">
                      {svc.patientsTreated.toLocaleString()}+ patients treated
                    </div>
                    {svc.emiAvailable && (
                      <span className="text-xs font-medium text-primary bg-teal-light rounded-full px-3 py-1">EMI Available</span>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-gold-light py-14">
        <div className="container text-center">
          <h2 className="font-display text-2xl md:text-3xl font-bold text-foreground mb-4">Need Help Choosing a Treatment?</h2>
          <p className="text-muted-foreground mb-6 max-w-md mx-auto">Book a consultation and Dr. Srivanth will recommend the best option for you.</p>
          <Link
            to="/book"
            className="inline-flex items-center gap-2 rounded-lg bg-accent px-6 py-3 text-sm font-semibold text-accent-foreground shadow-lg hover:opacity-90"
          >
            Book Consultation <ArrowRight size={16} />
          </Link>
        </div>
      </section>
    </>
  );
}
