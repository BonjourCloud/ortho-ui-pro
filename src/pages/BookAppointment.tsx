import { motion } from "framer-motion";
import { Calendar, Clock, Phone, CheckCircle } from "lucide-react";
import { useState } from "react";
import { services, insuranceProviders, timeSlots } from "@/data/mockData";

export default function BookAppointment() {
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedTime, setSelectedTime] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setSubmitted(true);
    }, 600);
  };

  if (submitted) {
    return (
      <section className="py-20 md:py-32">
        <div className="container max-w-lg text-center">
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}>
            <div className="w-20 h-20 rounded-full bg-accent/10 flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="text-accent" size={40} />
            </div>
            <h1 className="font-display text-3xl font-bold text-foreground mb-3">Appointment Requested!</h1>
            <p className="text-muted-foreground mb-2">
              Confirmation Number: <span className="font-semibold text-foreground">CONF-{Math.floor(100000 + Math.random() * 900000)}</span>
            </p>
            <p className="text-muted-foreground mb-6">We will confirm within 2 hours via WhatsApp.</p>
            <a
              href="https://wa.me/919876543210"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground"
            >
              <Phone size={16} /> Chat on WhatsApp
            </a>
          </motion.div>
        </div>
      </section>
    );
  }

  return (
    <>
      <section className="bg-hero-gradient py-14 md:py-20">
        <div className="container text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <h1 className="font-display text-4xl md:text-5xl font-bold text-primary-foreground mb-3">Book Appointment</h1>
            <p className="text-primary-foreground/70">Schedule your visit with Dr. Srivanth. We'll confirm via WhatsApp.</p>
          </motion.div>
        </div>
      </section>

      <section className="py-12 md:py-20">
        <div className="container max-w-2xl">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">First Name *</label>
                <input required type="text" className="w-full rounded-lg border bg-card px-4 py-2.5 text-sm text-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Last Name *</label>
                <input required type="text" className="w-full rounded-lg border bg-card px-4 py-2.5 text-sm text-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none" />
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Phone *</label>
                <input required type="tel" className="w-full rounded-lg border bg-card px-4 py-2.5 text-sm text-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none" placeholder="+91" />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Email</label>
                <input type="email" className="w-full rounded-lg border bg-card px-4 py-2.5 text-sm text-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none" />
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Appointment Type *</label>
                <select required className="w-full rounded-lg border bg-card px-4 py-2.5 text-sm text-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none">
                  <option value="">Select type</option>
                  <option value="new">New Patient</option>
                  <option value="follow_up">Follow Up</option>
                  <option value="post_op">Post-Op Check</option>
                  <option value="emergency">Emergency</option>
                  <option value="consultation">Consultation</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Service</label>
                <select className="w-full rounded-lg border bg-card px-4 py-2.5 text-sm text-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none">
                  <option value="">Select service</option>
                  {services.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Date & Time */}
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">
                  <Calendar size={14} className="inline mr-1" /> Preferred Date *
                </label>
                <input required type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className="w-full rounded-lg border bg-card px-4 py-2.5 text-sm text-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">
                  <Clock size={14} className="inline mr-1" /> Preferred Time *
                </label>
                <select required value={selectedTime} onChange={(e) => setSelectedTime(e.target.value)} className="w-full rounded-lg border bg-card px-4 py-2.5 text-sm text-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none">
                  <option value="">Select time</option>
                  {timeSlots.map((slot) => (
                    <option key={slot.time} value={slot.time} disabled={!slot.available}>
                      {slot.time} {!slot.available ? "(Unavailable)" : ""}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Describe Your Symptoms *</label>
              <textarea required rows={3} className="w-full rounded-lg border bg-card px-4 py-2.5 text-sm text-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none resize-none" placeholder="Brief description of your condition..." />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Insurance Provider</label>
              <select className="w-full rounded-lg border bg-card px-4 py-2.5 text-sm text-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none">
                <option value="">None / Self-pay</option>
                {insuranceProviders.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <input type="checkbox" id="emi" className="rounded border-border" />
              <label htmlFor="emi" className="text-sm text-muted-foreground">I'm interested in EMI payment options</label>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-accent px-6 py-3 text-sm font-semibold text-accent-foreground shadow-lg hover:opacity-90 disabled:opacity-60 transition-all"
            >
              {loading ? "Submitting..." : "Request Appointment"}
            </button>

            <p className="text-xs text-center text-muted-foreground">
              Or call directly: <a href="tel:+919876543210" className="font-semibold text-primary">+91 98765 43210</a>
            </p>
          </form>
        </div>
      </section>
    </>
  );
}
