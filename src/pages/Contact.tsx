import { motion } from "framer-motion";
import { MapPin, Phone, Mail, Clock, MessageCircle } from "lucide-react";
import { useState } from "react";
import { usePreviewSiteConfig, useSitePageContent } from "@/hooks/usePageContent";
import {
  CmsDraftPreviewBanner,
  PageFaqSection,
  PageHighlightsGrid,
  PageRichBodySection,
} from "@/components/PageCmsSupplement";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import SEO from "@/components/SEO";
import { trackContactFormSubmission } from "@/lib/analytics";
import { trackClick } from "@/utils/analytics";
import { pageLabel } from "@/lib/cms/siteLabels";

const DEFAULT_MAPS_EMBED =
  "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3807.123163789908!2d78.4890164!3d17.405876!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3bcb994a0c5f14bd%3A0x8293995c456b8bb0!2sDr.%20Srivanth's%20Orthopedic%20%26%20Speciality%20Hospital!5e0!3m2!1sen!2sin!4v1776072256363!5m2!1sen!2sin";
const DEFAULT_MAPS_LINK = "https://maps.app.goo.gl/LsTEZt9UvBoZVYUF6";

export default function Contact() {
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", phone: "", subject: "", message: "" });
  const { config, usingDraft: configDraft, workflowStatus: configStatus } = usePreviewSiteConfig("clinic");
  const { content: page, usingDraft: pageDraft, workflowStatus: pageStatus } = useSitePageContent("contact");
  const { toast } = useToast();

  const usingDraft = configDraft || pageDraft;
  const workflowStatus = pageDraft ? pageStatus : configStatus;

  const mapsLinkUrl =
    config.googleMapsDirectionsUrl || config.branding?.googleMapsUrl || DEFAULT_MAPS_LINK;
  const mapsEmbedUrl = config.googleMapsEmbedUrl || DEFAULT_MAPS_EMBED;

  const contactInfo = [
    { icon: MapPin, label: "Location", value: config.location, href: mapsLinkUrl },
    { icon: Phone, label: "Phone", value: config.phone, href: `tel:${config.phone}` },
    { icon: Mail, label: "Email", value: config.email, href: `mailto:${config.email}` },
    { icon: Clock, label: "Hours", value: config.hours },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { error } = await supabase.from("contact_messages").insert({
      name: form.name,
      email: form.email,
      phone: form.phone || null,
      subject: form.subject,
      message: form.message,
    });

    setLoading(false);

    if (error) {
      toast({ title: "Error", description: "Failed to send message. Please try again.", variant: "destructive" });
      return;
    }

    trackContactFormSubmission();
    setSent(true);
  };

  return (
    <>
      <SEO
        title={page.heroTitle || "Contact Us"}
        description={
          page.heroSubtitle ||
          `Get in touch with ${config.doctorName} at ${config.clinicName}. Book an appointment, ask questions, or visit our clinic. ${config.location}. Phone: ${config.phone}`
        }
        keywords="contact orthopedic surgeon, book appointment, clinic location, orthopedic consultation, medical inquiry"
        url="/contact"
      />
      <CmsDraftPreviewBanner usingDraft={usingDraft} workflowStatus={workflowStatus} pageLabel="Contact Us" />

      <section className="bg-hero-gradient py-14 md:py-20">
        <div className="container text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            {page.heroEyebrow && (
              <span className="text-accent text-sm font-semibold uppercase tracking-wider block mb-2">
                {page.heroEyebrow}
              </span>
            )}
            <h1 className="font-display text-4xl md:text-5xl font-bold text-primary-foreground mb-3">
              {page.heroTitle || "Contact Us"}
            </h1>
            <p className="text-primary-foreground/70">
              {page.heroSubtitle || `Get in touch with ${config.doctorName}'s clinic`}
            </p>
            {page.heroImageUrl && (
              <div className="mt-8 max-w-2xl mx-auto">
                <img
                  src={page.heroImageUrl}
                  alt={page.heroImageAlt || page.heroTitle}
                  className="rounded-2xl shadow-xl w-full max-h-72 object-cover mx-auto"
                />
              </div>
            )}
          </motion.div>
        </div>
      </section>

      <PageRichBodySection bodyHtml={page.bodyHtml} />

      {page.highlights.length > 0 && (
        <div className="container pt-8">
          <PageHighlightsGrid highlights={page.highlights} />
        </div>
      )}

      <section className="py-12 md:py-20">
        <div className="container">
          <div className="grid md:grid-cols-2 gap-12">
            {/* Contact Info */}
            <div>
              <h2 className="font-display text-2xl font-bold text-foreground mb-6">
                {page.customLabels.getInTouchHeading || "Get In Touch"}
              </h2>
              <div className="space-y-5 mb-8">
                {contactInfo.map((item, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.1 }}
                    className="flex items-start gap-4"
                  >
                    <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center shrink-0">
                      <item.icon className="text-accent" size={18} />
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-foreground">{item.label}</div>
                      {item.href ? (
                        <a
                          href={item.href}
                          onClick={() => {
                            if (item.href?.startsWith("tel:")) {
                              trackClick("phone_click", {
                                event_label: "contact_page",
                                page_location:
                                  typeof window !== "undefined" ? window.location.pathname : "",
                              });
                            }
                          }}
                          className="text-sm text-muted-foreground hover:text-primary transition-colors"
                        >
                          {item.value}
                        </a>
                      ) : (
                        <div className="text-sm text-muted-foreground">{item.value}</div>
                      )}
                    </div>
                  </motion.div>
                ))}
              </div>

              <a
                href={`https://wa.me/${config.whatsapp?.replace(/\D/g, "") || config.phone.replace(/\D/g, "")}`}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() =>
                  trackClick("whatsapp_click", {
                    event_label: "contact_page",
                    page_location:
                      typeof window !== "undefined" ? window.location.pathname : "",
                  })
                }
                className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90"
              >
                <MessageCircle size={16} /> {pageLabel(page, "whatsappButtonLabel", "Chat on WhatsApp")}
              </a>

              <div className="mt-8 space-y-3">
                <div className="rounded-xl overflow-hidden border">
                  <iframe
                    title={pageLabel(page, "mapTitle", "Clinic Location")}
                    src={mapsEmbedUrl}
                    width="100%"
                    height="250"
                    style={{ border: 0 }}
                    allowFullScreen
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                  />
                </div>
                <a
                  href={mapsLinkUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:text-accent transition-colors"
                >
                  <MapPin size={16} />
                  {page.customLabels.openInMapsLabel || "Open in Maps"}
                </a>
              </div>
            </div>

            {/* Contact Form */}
            <div>
              <h2 className="font-display text-2xl font-bold text-foreground mb-6">
                {page.customLabels.formHeading || "Send a Message"}
              </h2>
              {sent ? (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-teal-light rounded-xl p-8 text-center">
                  <h3 className="font-display text-xl font-bold text-foreground mb-2">
                    {page.customLabels.successHeading || "Message Sent!"}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {page.customLabels.successDescription || "We'll get back to you within 24 hours."}
                  </p>
                </motion.div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-5">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1.5">{pageLabel(page, "nameLabel", "Full Name *")}</label>
                    <input
                      required
                      type="text"
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      className="w-full rounded-lg border bg-card px-4 py-2.5 text-sm text-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                    />
                  </div>
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1.5">{pageLabel(page, "emailLabel", "Email *")}</label>
                      <input
                        required
                        type="email"
                        value={form.email}
                        onChange={(e) => setForm({ ...form, email: e.target.value })}
                        className="w-full rounded-lg border bg-card px-4 py-2.5 text-sm text-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1.5">{pageLabel(page, "phoneLabel", "Phone")}</label>
                      <input
                        type="tel"
                        value={form.phone}
                        onChange={(e) => setForm({ ...form, phone: e.target.value })}
                        className="w-full rounded-lg border bg-card px-4 py-2.5 text-sm text-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                        placeholder={pageLabel(page, "phonePlaceholder", "+91")}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1.5">{pageLabel(page, "subjectLabel", "Subject *")}</label>
                    <input
                      required
                      type="text"
                      value={form.subject}
                      onChange={(e) => setForm({ ...form, subject: e.target.value })}
                      className="w-full rounded-lg border bg-card px-4 py-2.5 text-sm text-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1.5">{pageLabel(page, "messageLabel", "Message *")}</label>
                    <textarea
                      required
                      rows={5}
                      value={form.message}
                      onChange={(e) => setForm({ ...form, message: e.target.value })}
                      className="w-full rounded-lg border bg-card px-4 py-2.5 text-sm text-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none resize-none"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full rounded-lg bg-accent px-6 py-3 text-sm font-semibold text-accent-foreground shadow-lg hover:opacity-90 disabled:opacity-60 transition-all"
                  >
                    {loading ? "Sending..." : page.customLabels.submitButtonLabel || "Send Message"}
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      </section>

      <PageFaqSection faqs={page.faqs} />
    </>
  );
}
