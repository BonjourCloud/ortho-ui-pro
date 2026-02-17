import { useState } from "react";
import { motion } from "framer-motion";
import { FileText, Upload, CheckCircle, Shield, Clock, MessageCircle } from "lucide-react";
import { useSiteConfig } from "@/contexts/SiteConfigContext";
import { useLanguage } from "@/contexts/LanguageContext";

const conditionOptions = [
  "Joint Replacement Recommendation",
  "Spine Surgery Recommendation",
  "ACL / Ligament Injury",
  "Fracture Treatment Plan",
  "Arthritis Management",
  "Sports Injury",
  "Other",
];

export default function SecondOpinion() {
  const { config } = useSiteConfig();
  const { t } = useLanguage();
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState({
    name: "",
    age: "",
    phone: "",
    email: "",
    condition: "",
    currentDiagnosis: "",
    additionalNotes: "",
    files: [] as File[],
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files).slice(0, 5);
      setForm((prev) => ({ ...prev, files: [...prev.files, ...newFiles].slice(0, 5) }));
    }
  };

  const removeFile = (index: number) => {
    setForm((prev) => ({ ...prev, files: prev.files.filter((_, i) => i !== index) }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <section className="py-16 md:py-24">
        <div className="container max-w-lg text-center">
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}>
            <CheckCircle className="mx-auto text-primary mb-6" size={64} />
            <h1 className="font-display text-3xl font-bold text-foreground mb-4">{t("secondOpinion.successTitle")}</h1>
            <p className="text-muted-foreground mb-2">{t("secondOpinion.successMsg")}</p>
            <p className="text-sm text-muted-foreground mb-8">{t("secondOpinion.successNote")}</p>
            <a
              href={`https://wa.me/${config.whatsapp?.replace(/\D/g, "") || config.phone.replace(/\D/g, "")}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground hover:opacity-90"
            >
              <MessageCircle size={16} /> {t("secondOpinion.whatsapp")}
            </a>
          </motion.div>
        </div>
      </section>
    );
  }

  return (
    <>
      {/* Hero */}
      <section className="bg-hero-gradient py-14 md:py-20">
        <div className="container max-w-3xl text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <Shield className="mx-auto text-accent mb-4" size={40} />
            <h1 className="font-display text-3xl md:text-4xl font-bold text-primary-foreground mb-4">
              {t("secondOpinion.title")}
            </h1>
            <p className="text-primary-foreground/80 leading-relaxed max-w-xl mx-auto">
              {t("secondOpinion.subtitle")}
            </p>
          </motion.div>
        </div>
      </section>

      {/* Benefits */}
      <section className="py-10 border-b">
        <div className="container">
          <div className="grid sm:grid-cols-3 gap-6">
            {[
              { icon: FileText, title: t("secondOpinion.benefit1Title"), desc: t("secondOpinion.benefit1Desc") },
              { icon: Clock, title: t("secondOpinion.benefit2Title"), desc: t("secondOpinion.benefit2Desc") },
              { icon: Shield, title: t("secondOpinion.benefit3Title"), desc: t("secondOpinion.benefit3Desc") },
            ].map((item, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 15 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }}
                className="text-center">
                <div className="w-12 h-12 rounded-full bg-accent/10 flex items-center justify-center mx-auto mb-3">
                  <item.icon className="text-accent" size={22} />
                </div>
                <h3 className="font-display font-semibold text-foreground mb-1">{item.title}</h3>
                <p className="text-sm text-muted-foreground">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Form */}
      <section className="py-14 md:py-20">
        <div className="container max-w-2xl">
          <motion.form onSubmit={handleSubmit} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            className="bg-card rounded-xl border p-6 md:p-8 space-y-5">
            <h2 className="font-display text-xl font-bold text-foreground mb-2">{t("secondOpinion.formTitle")}</h2>

            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">{t("secondOpinion.name")} *</label>
                <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full rounded-lg border bg-background px-4 py-2.5 text-sm text-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">{t("secondOpinion.age")} *</label>
                <input required type="number" min={1} max={120} value={form.age} onChange={(e) => setForm({ ...form, age: e.target.value })}
                  className="w-full rounded-lg border bg-background px-4 py-2.5 text-sm text-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none" />
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">{t("secondOpinion.phone")} *</label>
                <input required type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  className="w-full rounded-lg border bg-background px-4 py-2.5 text-sm text-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">{t("secondOpinion.email")}</label>
                <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="w-full rounded-lg border bg-background px-4 py-2.5 text-sm text-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">{t("secondOpinion.condition")} *</label>
              <select required value={form.condition} onChange={(e) => setForm({ ...form, condition: e.target.value })}
                className="w-full rounded-lg border bg-background px-4 py-2.5 text-sm text-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none">
                <option value="">{t("secondOpinion.selectCondition")}</option>
                {conditionOptions.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">{t("secondOpinion.currentDiagnosis")} *</label>
              <textarea required rows={3} value={form.currentDiagnosis} onChange={(e) => setForm({ ...form, currentDiagnosis: e.target.value })}
                placeholder={t("secondOpinion.diagnosisPlaceholder")}
                className="w-full rounded-lg border bg-background px-4 py-2.5 text-sm text-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none resize-none" />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">{t("secondOpinion.uploadReports")}</label>
              <div className="border-2 border-dashed rounded-xl p-6 text-center hover:border-primary/40 transition-colors">
                <Upload className="mx-auto text-muted-foreground mb-2" size={28} />
                <p className="text-sm text-muted-foreground mb-2">{t("secondOpinion.uploadHint")}</p>
                <label className="inline-flex items-center gap-2 rounded-lg bg-secondary px-4 py-2 text-sm font-medium text-foreground cursor-pointer hover:bg-secondary/80 transition-colors">
                  <Upload size={14} /> {t("secondOpinion.chooseFiles")}
                  <input type="file" multiple accept=".pdf,.jpg,.jpeg,.png,.dicom" onChange={handleFileChange} className="hidden" />
                </label>
                <p className="text-xs text-muted-foreground mt-2">{t("secondOpinion.fileTypes")}</p>
              </div>
              {form.files.length > 0 && (
                <div className="mt-3 space-y-2">
                  {form.files.map((file, i) => (
                    <div key={i} className="flex items-center justify-between bg-secondary/50 rounded-lg px-3 py-2 text-sm">
                      <span className="truncate max-w-[250px] text-foreground">{file.name}</span>
                      <button type="button" onClick={() => removeFile(i)} className="text-muted-foreground hover:text-destructive text-xs ml-2">✕</button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">{t("secondOpinion.additionalNotes")}</label>
              <textarea rows={2} value={form.additionalNotes} onChange={(e) => setForm({ ...form, additionalNotes: e.target.value })}
                className="w-full rounded-lg border bg-background px-4 py-2.5 text-sm text-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none resize-none" />
            </div>

            <button type="submit"
              className="w-full rounded-lg bg-accent px-6 py-3 text-sm font-semibold text-accent-foreground hover:opacity-90 transition-all shadow-md">
              {t("secondOpinion.submit")}
            </button>

            <p className="text-xs text-muted-foreground text-center">{t("secondOpinion.privacy")}</p>
          </motion.form>
        </div>
      </section>
    </>
  );
}
