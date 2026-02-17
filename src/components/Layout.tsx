import { Link, useLocation } from "react-router-dom";
import { Phone, Mail, MapPin, Clock, Menu, X } from "lucide-react";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const navLinks = [
  { to: "/", label: "Home" },
  { to: "/about", label: "About" },
  { to: "/services", label: "Services" },
  { to: "/contact", label: "Contact" },
];

export default function Layout({ children }: { children: React.ReactNode }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();

  return (
    <div className="min-h-screen flex flex-col font-body">
      {/* Top bar */}
      <div className="bg-primary text-primary-foreground text-sm hidden md:block">
        <div className="container flex items-center justify-between py-2">
          <div className="flex items-center gap-6">
            <span className="flex items-center gap-1.5"><Phone size={14} /> +91 98765 43210</span>
            <span className="flex items-center gap-1.5"><Mail size={14} /> consult@drsrivanthortho.com</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Clock size={14} />
            <span>Mon - Sat: 9 AM - 8 PM</span>
          </div>
        </div>
      </div>

      {/* Main Nav */}
      <header className="sticky top-0 z-50 bg-card/95 backdrop-blur-md border-b shadow-sm">
        <div className="container flex items-center justify-between h-16 md:h-20">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center text-primary-foreground font-display font-bold text-lg">
              SO
            </div>
            <div className="leading-tight">
              <div className="font-display font-bold text-foreground text-lg">Dr. Srivanth</div>
              <div className="text-xs text-muted-foreground">Ortho Clinic</div>
            </div>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-8">
            {navLinks.map((l) => (
              <Link
                key={l.to}
                to={l.to}
                className={`text-sm font-medium transition-colors hover:text-primary ${location.pathname === l.to ? "text-primary" : "text-muted-foreground"}`}
              >
                {l.label}
              </Link>
            ))}
            <Link
              to="/book"
              className="inline-flex items-center justify-center rounded-lg bg-accent px-5 py-2.5 text-sm font-semibold text-accent-foreground transition-all hover:opacity-90 shadow-md"
            >
              Book Appointment
            </Link>
          </nav>

          {/* Mobile menu toggle */}
          <button className="md:hidden p-2" onClick={() => setMenuOpen(!menuOpen)}>
            {menuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {/* Mobile nav */}
        <AnimatePresence>
          {menuOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="md:hidden border-t bg-card overflow-hidden"
            >
              <div className="container py-4 flex flex-col gap-3">
                {navLinks.map((l) => (
                  <Link
                    key={l.to}
                    to={l.to}
                    onClick={() => setMenuOpen(false)}
                    className={`text-sm font-medium py-2 ${location.pathname === l.to ? "text-primary" : "text-muted-foreground"}`}
                  >
                    {l.label}
                  </Link>
                ))}
                <Link
                  to="/book"
                  onClick={() => setMenuOpen(false)}
                  className="inline-flex items-center justify-center rounded-lg bg-accent px-5 py-2.5 text-sm font-semibold text-accent-foreground"
                >
                  Book Appointment
                </Link>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      <main className="flex-1">{children}</main>

      {/* Footer */}
      <footer className="bg-primary text-primary-foreground">
        <div className="container py-12 md:py-16">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
            <div>
              <h3 className="font-display text-xl font-bold mb-4">Dr. Srivanth Ortho</h3>
              <p className="text-primary-foreground/70 text-sm leading-relaxed">
                Premium orthopedic care specializing in joint replacements, sports medicine, and trauma care in Hyderabad.
              </p>
            </div>
            <div>
              <h4 className="font-display text-lg font-semibold mb-4">Quick Links</h4>
              <div className="flex flex-col gap-2">
                {navLinks.map((l) => (
                  <Link key={l.to} to={l.to} className="text-sm text-primary-foreground/70 hover:text-primary-foreground transition-colors">
                    {l.label}
                  </Link>
                ))}
                <Link to="/book" className="text-sm text-primary-foreground/70 hover:text-primary-foreground transition-colors">
                  Book Appointment
                </Link>
              </div>
            </div>
            <div>
              <h4 className="font-display text-lg font-semibold mb-4">Contact</h4>
              <div className="flex flex-col gap-3 text-sm text-primary-foreground/70">
                <span className="flex items-start gap-2"><MapPin size={16} className="mt-0.5 shrink-0" /> Banjara Hills, Hyderabad, Telangana</span>
                <span className="flex items-center gap-2"><Phone size={16} className="shrink-0" /> +91 98765 43210</span>
                <span className="flex items-center gap-2"><Mail size={16} className="shrink-0" /> consult@drsrivanthortho.com</span>
              </div>
            </div>
          </div>
          <div className="border-t border-primary-foreground/20 mt-10 pt-6 text-center text-xs text-primary-foreground/50">
            © {new Date().getFullYear()} Dr. Srivanth Ortho. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
