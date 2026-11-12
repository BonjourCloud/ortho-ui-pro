import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { BarChart3, Users, Calendar, Settings, LogOut, TrendingUp, Phone, MessageCircle, Eye, FileText, Globe, Stethoscope, BookOpen, ClipboardList, Quote, Plus, Trash2 } from "lucide-react";
import { Link } from "react-router-dom";
import { useLanguage, Language } from "@/contexts/LanguageContext";
import { languageLabels } from "@/data/translations";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { useAuth } from "@/contexts/AuthContext";
import AdminServices from "@/components/admin/AdminServices";
import AdminBlogPosts from "@/components/admin/AdminBlogPosts";
import AdminCaseStudies from "@/components/admin/AdminCaseStudies";
import AdminSecondOpinions from "@/components/admin/AdminSecondOpinions";
import AdminTestimonials from "@/components/admin/AdminTestimonials";

type ContentSubTab = "services" | "blog" | "case-studies" | "testimonials";

function SignupToggle() {
  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from("app_settings")
      .select("value")
      .eq("key", "signup_enabled")
      .single()
      .then(({ data }) => {
        if (data) setEnabled(data.value === true);
        setLoading(false);
      });
  }, []);

  const toggle = async () => {
    const newVal = !enabled;
    setEnabled(newVal);
    await supabase
      .from("app_settings")
      .update({ value: newVal, updated_at: new Date().toISOString() })
      .eq("key", "signup_enabled");
  };

  if (loading) return null;

  return (
    <label className="flex items-center gap-3 cursor-pointer">
      <input type="checkbox" checked={enabled} onChange={toggle}
        className="rounded border-primary text-primary focus:ring-primary/20" />
      <div>
        <span className="text-sm font-medium text-foreground">Allow New Sign Ups</span>
        <p className="text-xs text-muted-foreground">When enabled, the login page shows a sign-up option</p>
      </div>
    </label>
  );
}

export type AdminDashboardTab = "appointments" | "second-opinions" | "content" | "settings";

/**
 * Existing admin modules, now hosted inside the new admin layout (see src/admin/AdminApp.tsx).
 * Authentication/route protection is handled by the route guards; database RLS still enforces writes.
 */
export default function AdminDashboard({ tab }: { tab: AdminDashboardTab }) {
  const { enabledLanguages, setEnabledLanguages } = useLanguage();
  const { can } = useAuth();
  const activeTab = tab;
  const [contentSubTab, setContentSubTab] = useState<ContentSubTab>("services");
  const [langSettings, setLangSettings] = useState<Language[]>([...enabledLanguages]);
  const [saved, setSaved] = useState(false);
  const [appointments, setAppointments] = useState<Tables<"appointments">[]>([]);

  useEffect(() => {
    if (activeTab === "appointments") {
      supabase.from("appointments").select("*").order("created_at", { ascending: false }).limit(20)
        .then(({ data }) => { if (data) setAppointments(data); });
    }
  }, [activeTab]);

  /** Languages are a per-browser preference (localStorage); they never touch site content. */
  const handleSaveLanguages = () => {
    setEnabledLanguages(langSettings);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div>

        {/* Appointments Tab - Now from DB */}
        {activeTab === "appointments" && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <div className="bg-card rounded-xl border overflow-hidden">
              <div className="p-5 border-b">
                <h3 className="font-display font-semibold text-foreground">Recent Appointments</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-secondary/50">
                    <tr>
                      <th className="px-4 py-3 text-left font-medium text-muted-foreground">Patient</th>
                      <th className="px-4 py-3 text-left font-medium text-muted-foreground">Type</th>
                      <th className="px-4 py-3 text-left font-medium text-muted-foreground">Service</th>
                      <th className="px-4 py-3 text-left font-medium text-muted-foreground">Date & Time</th>
                      <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {appointments.map((apt) => (
                      <tr key={apt.id} className="border-t">
                        <td className="px-4 py-3">
                          <div className="text-foreground">{apt.first_name} {apt.last_name}</div>
                          <div className="text-xs text-muted-foreground">{apt.phone}</div>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">{apt.appointment_type}</td>
                        <td className="px-4 py-3 text-muted-foreground">{apt.service || "—"}</td>
                        <td className="px-4 py-3 text-muted-foreground">{apt.preferred_date} • {apt.preferred_time}</td>
                        <td className="px-4 py-3">
                          <span className={`text-xs font-medium rounded-full px-3 py-1 ${
                            apt.status === "confirmed" ? "bg-primary/10 text-primary" : "bg-accent/10 text-accent"
                          }`}>
                            {apt.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                    {appointments.length === 0 && (
                      <tr><td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">No appointments yet.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </motion.div>
        )}

        {/* Second Opinions Tab */}
        {activeTab === "second-opinions" && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <AdminSecondOpinions />
          </motion.div>
        )}

        {/* Content Tab - With CRUD sub-tabs */}
        {activeTab === "content" && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <div className="flex gap-2 mb-6">
              {([
                { id: "services" as ContentSubTab, label: "Services", icon: Stethoscope },
                { id: "blog" as ContentSubTab, label: "Blog Posts", icon: BookOpen },
                { id: "case-studies" as ContentSubTab, label: "Case Studies", icon: ClipboardList },
                { id: "testimonials" as ContentSubTab, label: "Testimonials", icon: Quote },
              ]).map((sub) => (
                <button key={sub.id} onClick={() => setContentSubTab(sub.id)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                    contentSubTab === sub.id ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:bg-secondary"
                  }`}>
                  <sub.icon size={14} /> {sub.label}
                </button>
              ))}
            </div>
            {contentSubTab === "services" && <AdminServices />}
            {contentSubTab === "blog" && <AdminBlogPosts />}
            {contentSubTab === "case-studies" && <AdminCaseStudies />}
            {contentSubTab === "testimonials" && <AdminTestimonials />}
          </motion.div>
        )}

        {/* Settings Tab — system settings only. Site content (clinic, doctor, branding) is edited in
            its own workspace and always goes through draft → review → publish; this tab used to write
            the live site_config directly and has been removed for that reason. */}
        {activeTab === "settings" && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <div className="bg-card rounded-xl border p-6 max-w-2xl space-y-6">
              <div>
                <h3 className="font-display text-xl font-bold text-foreground mb-2">System Settings</h3>
                <p className="text-sm text-muted-foreground">
                  Website content is edited in the workspaces below. Every change is saved as a draft, reviewed and
                  approved by a Super Admin, then published.
                </p>
              </div>

              <ul className="grid gap-2 sm:grid-cols-3" aria-label="Content workspaces">
                {[
                  { to: "/admin/clinic", label: "Clinic information" },
                  { to: "/admin/doctor", label: "Doctor profile" },
                  { to: "/admin/branding", label: "Branding & theme" },
                ].map((link) => (
                  <li key={link.to}>
                    <Link
                      to={link.to}
                      className="block rounded-lg border bg-secondary/30 px-3 py-2 text-sm font-medium text-foreground hover:bg-secondary"
                    >
                      {link.label} →
                    </Link>
                  </li>
                ))}
              </ul>

              {can("security.settings") && (
                <div className="border-t pt-5">
                  <SignupToggle />
                </div>
              )}

              <div className="border-t pt-5">
                <div className="flex items-center gap-2 mb-3">
                  <Globe size={18} className="text-primary" />
                  <span className="text-sm font-medium text-foreground">Enabled Languages (this browser)</span>
                </div>
                <p className="text-xs text-muted-foreground mb-3">
                  Toggle languages for the language switcher. This preference is stored in this browser only.
                </p>
                <div className="flex flex-wrap gap-3">
                  {(["en", "hi", "te"] as Language[]).map((lang) => (
                    <label key={lang} className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={langSettings.includes(lang)} disabled={lang === "en"}
                        onChange={(e) => {
                          if (e.target.checked) setLangSettings([...langSettings, lang]);
                          else setLangSettings(langSettings.filter((l) => l !== lang));
                        }} className="rounded border-primary text-primary focus:ring-primary/20" />
                      <span className="text-sm text-foreground">{languageLabels[lang]}</span>
                    </label>
                  ))}
                </div>
                {saved && <p className="mt-3 text-xs text-primary">✓ Language preference saved for this browser.</p>}
                <button
                  type="button"
                  onClick={handleSaveLanguages}
                  className="mt-3 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90"
                >
                  Save languages
                </button>
              </div>
            </div>
          </motion.div>
        )}
    </div>
  );
}
