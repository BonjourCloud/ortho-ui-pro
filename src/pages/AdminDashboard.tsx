import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { BarChart3, Users, Calendar, Settings, LogOut, TrendingUp, Phone, MessageCircle, Eye, FileText, Globe, Stethoscope, BookOpen, ClipboardList, Quote } from "lucide-react";
import { useSiteConfig, SiteConfig } from "@/contexts/SiteConfigContext";
import { useNavigate } from "react-router-dom";
import { mockAnalytics } from "@/data/mockData";
import { useLanguage, Language } from "@/contexts/LanguageContext";
import { languageLabels } from "@/data/translations";
import { supabase } from "@/integrations/supabase/client";
import AdminServices from "@/components/admin/AdminServices";
import AdminBlogPosts from "@/components/admin/AdminBlogPosts";
import AdminCaseStudies from "@/components/admin/AdminCaseStudies";
import AdminSecondOpinions from "@/components/admin/AdminSecondOpinions";
import AdminTestimonials from "@/components/admin/AdminTestimonials";

type Tab = "overview" | "appointments" | "second-opinions" | "content" | "settings";
type ContentSubTab = "services" | "blog" | "case-studies" | "testimonials";

export default function AdminDashboard() {
  const { config, updateConfig, isAdmin, adminLogout } = useSiteConfig();
  const { enabledLanguages, setEnabledLanguages } = useLanguage();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const [contentSubTab, setContentSubTab] = useState<ContentSubTab>("services");
  const [configForm, setConfigForm] = useState<SiteConfig>({ ...config });
  const [langSettings, setLangSettings] = useState<Language[]>([...enabledLanguages]);
  const [saved, setSaved] = useState(false);
  const [appointments, setAppointments] = useState<any[]>([]);

  useEffect(() => {
    if (isAdmin && activeTab === "appointments") {
      supabase.from("appointments").select("*").order("created_at", { ascending: false }).limit(20)
        .then(({ data }) => { if (data) setAppointments(data); });
    }
  }, [isAdmin, activeTab]);

  if (!isAdmin) {
    navigate("/admin/login");
    return null;
  }

  const handleLogout = () => { adminLogout(); navigate("/"); };

  const handleSaveConfig = () => {
    updateConfig(configForm);
    setEnabledLanguages(langSettings);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const tabs: { id: Tab; label: string; icon: React.ElementType }[] = [
    { id: "overview", label: "Overview", icon: BarChart3 },
    { id: "appointments", label: "Appointments", icon: Calendar },
    { id: "second-opinions", label: "2nd Opinions", icon: Stethoscope },
    { id: "content", label: "Content", icon: FileText },
    { id: "settings", label: "Site Settings", icon: Settings },
  ];

  const a = mockAnalytics;

  return (
    <section className="py-8 md:py-12">
      <div className="container">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="font-display text-2xl md:text-3xl font-bold text-foreground">Admin Dashboard</h1>
            <p className="text-sm text-muted-foreground">Welcome back, Admin</p>
          </div>
          <button onClick={handleLogout} className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-destructive transition-colors">
            <LogOut size={16} /> Logout
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-8 overflow-x-auto pb-2">
          {tabs.map((tab) => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
                activeTab === tab.id ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-secondary"
              }`}>
              <tab.icon size={16} /> {tab.label}
            </button>
          ))}
        </div>

        {/* Overview Tab */}
        {activeTab === "overview" && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              {[
                { label: "Total Visitors", value: a.totalVisitors.toLocaleString(), icon: Users, change: "+12%" },
                { label: "Page Views", value: a.totalPageviews.toLocaleString(), icon: Eye, change: "+8%" },
                { label: "Conversions", value: a.totalConversions.toString(), icon: TrendingUp, change: "+15%" },
                { label: "Phone Calls", value: a.phoneCalls.toString(), icon: Phone, change: "+5%" },
              ].map((stat, i) => (
                <div key={i} className="bg-card rounded-xl border p-5">
                  <div className="flex items-center justify-between mb-2">
                    <stat.icon size={18} className="text-muted-foreground" />
                    <span className="text-xs font-medium text-primary">{stat.change}</span>
                  </div>
                  <div className="font-display text-2xl font-bold text-foreground">{stat.value}</div>
                  <div className="text-xs text-muted-foreground mt-1">{stat.label}</div>
                </div>
              ))}
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              <div className="bg-card rounded-xl border p-4 text-center">
                <div className="text-xs text-muted-foreground mb-1">WhatsApp</div>
                <div className="font-display text-xl font-bold text-foreground flex items-center justify-center gap-1">
                  <MessageCircle size={16} className="text-primary" /> {a.whatsappInquiries}
                </div>
              </div>
              <div className="bg-card rounded-xl border p-4 text-center">
                <div className="text-xs text-muted-foreground mb-1">Bounce Rate</div>
                <div className="font-display text-xl font-bold text-foreground">{a.bounceRate}%</div>
              </div>
              <div className="bg-card rounded-xl border p-4 text-center">
                <div className="text-xs text-muted-foreground mb-1">2nd Opinions</div>
                <div className="font-display text-xl font-bold text-foreground">{a.secondOpinionRequests}</div>
              </div>
              <div className="bg-card rounded-xl border p-4 text-center">
                <div className="text-xs text-muted-foreground mb-1">EMI Inquiries</div>
                <div className="font-display text-xl font-bold text-foreground">{a.emiInquiries}</div>
              </div>
            </div>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-card rounded-xl border p-5">
                <h3 className="font-display font-semibold text-foreground mb-4">Top Pages</h3>
                <div className="space-y-3">
                  {a.topPages.map((page, i) => (
                    <div key={i} className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground truncate max-w-[200px]">{page.path}</span>
                      <span className="font-medium text-foreground">{page.views}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="bg-card rounded-xl border p-5">
                <h3 className="font-display font-semibold text-foreground mb-4">Traffic Sources</h3>
                <div className="space-y-3">
                  {a.trafficSources.map((src, i) => (
                    <div key={i} className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">{src.source}</span>
                      <div className="flex items-center gap-4">
                        <span className="text-foreground">{src.visitors} visits</span>
                        <span className="text-primary font-medium">{src.conversions} conv.</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        )}

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

        {/* Settings Tab */}
        {activeTab === "settings" && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <div className="bg-card rounded-xl border p-6 max-w-2xl">
              <h3 className="font-display text-xl font-bold text-foreground mb-6">Site Configuration</h3>
              <p className="text-sm text-muted-foreground mb-6">
                Customize the doctor's name and clinic details. Changes apply immediately across the entire site.
              </p>

              {saved && (
                <div className="bg-primary/10 text-primary text-sm rounded-lg p-3 mb-4">✓ Settings saved successfully!</div>
              )}

              <div className="space-y-5">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1.5">Doctor Name</label>
                    <input value={configForm.doctorName} onChange={(e) => setConfigForm({ ...configForm, doctorName: e.target.value })}
                      className="w-full rounded-lg border bg-background px-4 py-2.5 text-sm text-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1.5">Clinic Name</label>
                    <input value={configForm.clinicName} onChange={(e) => setConfigForm({ ...configForm, clinicName: e.target.value })}
                      className="w-full rounded-lg border bg-background px-4 py-2.5 text-sm text-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none" />
                  </div>
                </div>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1.5">Title / Credentials</label>
                    <input value={configForm.title} onChange={(e) => setConfigForm({ ...configForm, title: e.target.value })}
                      className="w-full rounded-lg border bg-background px-4 py-2.5 text-sm text-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1.5">Logo Initials</label>
                    <input value={configForm.logoInitials} onChange={(e) => setConfigForm({ ...configForm, logoInitials: e.target.value })} maxLength={3}
                      className="w-full rounded-lg border bg-background px-4 py-2.5 text-sm text-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">Specialization</label>
                  <input value={configForm.specialization} onChange={(e) => setConfigForm({ ...configForm, specialization: e.target.value })}
                    className="w-full rounded-lg border bg-background px-4 py-2.5 text-sm text-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">Short Bio</label>
                  <textarea value={configForm.shortBio} onChange={(e) => setConfigForm({ ...configForm, shortBio: e.target.value })} rows={3}
                    className="w-full rounded-lg border bg-background px-4 py-2.5 text-sm text-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none resize-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">Philosophy</label>
                  <textarea value={configForm.philosophy} onChange={(e) => setConfigForm({ ...configForm, philosophy: e.target.value })} rows={3}
                    className="w-full rounded-lg border bg-background px-4 py-2.5 text-sm text-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none resize-none" />
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1.5">Years Exp.</label>
                    <input type="number" value={configForm.yearsExperience} onChange={(e) => setConfigForm({ ...configForm, yearsExperience: +e.target.value })}
                      className="w-full rounded-lg border bg-background px-4 py-2.5 text-sm text-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1.5">Patients</label>
                    <input type="number" value={configForm.happyPatients} onChange={(e) => setConfigForm({ ...configForm, happyPatients: +e.target.value })}
                      className="w-full rounded-lg border bg-background px-4 py-2.5 text-sm text-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1.5">Surgeries</label>
                    <input type="number" value={configForm.surgeriesCompleted} onChange={(e) => setConfigForm({ ...configForm, surgeriesCompleted: +e.target.value })}
                      className="w-full rounded-lg border bg-background px-4 py-2.5 text-sm text-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1.5">Branches</label>
                    <input type="number" value={configForm.branches} onChange={(e) => setConfigForm({ ...configForm, branches: +e.target.value })}
                      className="w-full rounded-lg border bg-background px-4 py-2.5 text-sm text-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none" />
                  </div>
                </div>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1.5">Phone</label>
                    <input value={configForm.phone} onChange={(e) => setConfigForm({ ...configForm, phone: e.target.value })}
                      className="w-full rounded-lg border bg-background px-4 py-2.5 text-sm text-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1.5">Email</label>
                    <input value={configForm.email} onChange={(e) => setConfigForm({ ...configForm, email: e.target.value })}
                      className="w-full rounded-lg border bg-background px-4 py-2.5 text-sm text-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none" />
                  </div>
                </div>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1.5">Location</label>
                    <input value={configForm.location} onChange={(e) => setConfigForm({ ...configForm, location: e.target.value })}
                      className="w-full rounded-lg border bg-background px-4 py-2.5 text-sm text-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1.5">Hours</label>
                    <input value={configForm.hours} onChange={(e) => setConfigForm({ ...configForm, hours: e.target.value })}
                      className="w-full rounded-lg border bg-background px-4 py-2.5 text-sm text-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">Doctor Photo URL</label>
                  <input value={configForm.heroImageUrl} onChange={(e) => setConfigForm({ ...configForm, heroImageUrl: e.target.value })} placeholder="https://example.com/doctor-photo.jpg"
                    className="w-full rounded-lg border bg-background px-4 py-2.5 text-sm text-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none" />
                  <p className="text-xs text-muted-foreground mt-1">Leave empty to use the default image.</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">Consultation Fee (₹)</label>
                  <input type="number" value={configForm.consultationFee} onChange={(e) => setConfigForm({ ...configForm, consultationFee: +e.target.value })}
                    className="w-full rounded-lg border bg-background px-4 py-2.5 text-sm text-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none" />
                </div>

                {/* Language Settings */}
                <div className="border-t pt-5">
                  <div className="flex items-center gap-2 mb-3">
                    <Globe size={18} className="text-primary" />
                    <label className="text-sm font-medium text-foreground">Enabled Languages</label>
                  </div>
                  <p className="text-xs text-muted-foreground mb-3">Toggle languages visitors can switch between. English is always enabled.</p>
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
                </div>

                {/* Feature Toggles */}
                <div className="border-t pt-5">
                  <div className="flex items-center gap-2 mb-3">
                    <MessageCircle size={18} className="text-primary" />
                    <label className="text-sm font-medium text-foreground">Feature Toggles</label>
                  </div>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input type="checkbox" checked={configForm.whatsappFloatEnabled}
                      onChange={(e) => setConfigForm({ ...configForm, whatsappFloatEnabled: e.target.checked })}
                      className="rounded border-primary text-primary focus:ring-primary/20" />
                    <div>
                      <span className="text-sm font-medium text-foreground">Floating WhatsApp Button</span>
                      <p className="text-xs text-muted-foreground">Show a WhatsApp chat button on all pages</p>
                    </div>
                  </label>
                </div>

                <button onClick={handleSaveConfig}
                  className="w-full rounded-lg bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground hover:opacity-90 transition-all">
                  Save Configuration
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </section>
  );
}
