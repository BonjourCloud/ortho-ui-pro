import { Link, useLocation } from "react-router-dom";
import WhatsAppFloat from "./WhatsAppFloat";
import { Phone, Mail, MapPin, Clock, Menu, X, Shield, Globe, Facebook, Instagram, Youtube, ChevronDown } from "lucide-react";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useSiteConfig } from "@/contexts/SiteConfigContext";
import { usePreviewSiteConfig } from "@/hooks/usePageContent";
import { APPROVED_THEME_PRESETS } from "@/lib/cms/types";
import { useLanguage } from "@/contexts/LanguageContext";
import { languageLabels, Language } from "@/data/translations";
import { useMedicalSections } from "@/hooks/useMedicalSections";
import { siteLabel, siteLabelOr } from "@/lib/cms/siteLabels";

export default function Layout({ children }: { children: React.ReactNode }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [langOpen, setLangOpen] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const [dropdownTimeout, setDropdownTimeout] = useState<NodeJS.Timeout | null>(null);
  const location = useLocation();
  const { isAdmin } = useSiteConfig();
  const { config } = usePreviewSiteConfig();
  const { language, setLanguage, t, enabledLanguages } = useLanguage();
  const { sections } = useMedicalSections();

  // Apply approved theme preset / CSS variables from SiteConfig.branding
  useEffect(() => {
    if (typeof document === "undefined") return;
    const root = document.documentElement;
    const presetKey = config.branding?.themePreset ?? "clinical-teal";
    const preset = APPROVED_THEME_PRESETS[presetKey] ?? APPROVED_THEME_PRESETS["clinical-teal"];
    root.style.setProperty("--primary", config.branding?.primaryHsl || preset.primaryHsl);
    root.style.setProperty("--accent", config.branding?.accentHsl || preset.accentHsl);
    root.style.setProperty("--hero-gradient", preset.heroGradient);
    if (config.branding?.headingFont) {
      root.style.setProperty("--font-display", `"${config.branding.headingFont}", Georgia, serif`);
    }
    if (config.branding?.bodyFont) {
      root.style.setProperty("--font-body", `"${config.branding.bodyFont}", system-ui, sans-serif`);
    }
  }, [config.branding]);

  const handleDropdownEnter = (key: string) => {
    if (dropdownTimeout) {
      clearTimeout(dropdownTimeout);
      setDropdownTimeout(null);
    }
    setActiveDropdown(key);
  };

  const handleDropdownLeave = () => {
    const timeout = setTimeout(() => {
      setActiveDropdown(null);
    }, 200); // 200ms delay before closing
    setDropdownTimeout(timeout);
  };

  const isAdminRoute = location.pathname.startsWith("/admin");
  if (isAdminRoute) return <>{children}</>;

  const customNav = config.branding?.navItems;
  const navLinks = Array.isArray(customNav) && customNav.length > 0
    ? [...customNav]
        .filter((item) => item.visible !== false)
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map((item) => ({
          to: item.to,
          label: item.label,
          hasDropdown: item.hasDropdown ?? (item.to === "/orthopaedics" || item.to === "/physiotherapy" || item.to === "/rehabilitation"),
          dropdownKey: item.dropdownKey || (item.to.replace(/^\//, "") as "orthopaedics" | "physiotherapy" | "rehabilitation" | undefined),
        }))
    : [
        { to: "/", label: t("nav.home") },
        { to: "/about", label: t("nav.about") },
        { 
          to: "/orthopaedics", 
          label: "Orthopaedics",
          hasDropdown: true,
          dropdownKey: "orthopaedics"
        },
        { 
          to: "/physiotherapy", 
          label: "Physiotherapy",
          hasDropdown: true,
          dropdownKey: "physiotherapy"
        },
        { 
          to: "/rehabilitation", 
          label: "Rehabilitation",
          hasDropdown: true,
          dropdownKey: "rehabilitation"
        },
        { to: "/contact", label: t("nav.contact") },
      ];

  const headerCtaLink = config.branding?.headerCtaLink || "/book";

  const formatPhone = (phone: string) => {
    const digits = phone.replace(/\D/g, "");
    if (digits.length === 12) return `+${digits.slice(0, 2)} ${digits.slice(2, 7)} ${digits.slice(7)}`;
    return phone;
  };

  return (
    <div className="min-h-screen flex flex-col font-body">
      {/* Global Announcement Banner */}
      {config.branding?.announcementEnabled && config.branding?.announcementText && (
        <aside
          aria-label="Announcement"
          className="bg-accent text-accent-foreground py-2 px-4 text-xs sm:text-sm font-medium text-center flex items-center justify-center gap-2"
        >
          <span>{config.branding.announcementText}</span>
          {config.branding.announcementLinkUrl && (
            <Link
              to={config.branding.announcementLinkUrl}
              className="underline font-semibold hover:opacity-80 transition-opacity ml-1"
            >
              {config.branding.announcementLinkLabel || "Learn more"} →
            </Link>
          )}
        </aside>
      )}

      {/* Top bar */}
      <div className="bg-primary text-primary-foreground text-sm hidden md:block">
        <div className="container flex items-center justify-between py-2">
          <div className="flex items-center gap-6">
            <span className="flex items-center gap-1.5"><Phone size={14} /> {formatPhone(config.phone)}</span>
            <span className="flex items-center gap-1.5"><Mail size={14} /> {config.email}</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5"><Clock size={14} /> {config.hours}</span>
            {/* Language switcher - Hidden for now */}
            {/* {enabledLanguages.length > 1 && (
              <div className="relative">
                <button onClick={() => setLangOpen(!langOpen)} className="flex items-center gap-1 text-primary-foreground/80 hover:text-primary-foreground transition-colors">
                  <Globe size={14} /> {languageLabels[language]}
                </button>
                {langOpen && (
                  <div className="absolute right-0 top-full mt-1 bg-card rounded-lg shadow-lg border py-1 min-w-[120px] z-50">
                    {enabledLanguages.map((lang) => (
                      <button
                        key={lang}
                        onClick={() => { setLanguage(lang); setLangOpen(false); }}
                        className={`block w-full text-left px-4 py-1.5 text-sm transition-colors ${language === lang ? "text-primary font-semibold bg-primary/5" : "text-foreground hover:bg-secondary"}`}
                      >
                        {languageLabels[lang]}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )} */}
            {isAdmin && (
              <Link to="/admin" className="flex items-center gap-1 text-accent hover:text-accent/80 transition-colors">
                <Shield size={12} /> Admin
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Main Nav */}
      <header className="sticky top-0 z-50 bg-card/95 backdrop-blur-md border-b shadow-sm">
        <div className="container flex items-center justify-between h-16 md:h-20">
          <Link to="/" className="flex items-center gap-2">
            {config.branding?.logoUrl ? (
              <img
                src={config.branding.logoUrl}
                alt={config.branding.logoAlt || `${config.clinicName} logo`}
                className="h-10 w-10 rounded-lg object-contain"
              />
            ) : (
              <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center text-primary-foreground font-display font-bold text-lg">
                {config.logoInitials}
              </div>
            )}
            <div className="leading-tight">
              <div className="font-display font-bold text-foreground text-lg">{config.doctorName}</div>
              <div className="text-xs text-muted-foreground">{config.clinicName}</div>
            </div>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden lg:flex items-center gap-5">
            {navLinks.map((l) => (
              l.hasDropdown ? (
                <div 
                  key={l.to}
                  className="relative"
                  onMouseEnter={() => handleDropdownEnter(l.dropdownKey!)}
                  onMouseLeave={handleDropdownLeave}
                >
                  <Link
                    to={l.to}
                    className={`text-sm font-medium transition-colors hover:text-primary flex items-center gap-1 ${
                      location.pathname === l.to || location.pathname.startsWith(l.to + "/")
                        ? "text-primary"
                        : "text-muted-foreground"
                    }`}
                  >
                    {l.label}
                    <ChevronDown size={14} />
                  </Link>
                  {activeDropdown === l.dropdownKey && (
                    <div 
                      className="absolute top-full left-0 mt-1 bg-card rounded-lg shadow-xl border py-2 min-w-[260px] z-50 max-h-[500px] overflow-y-auto"
                      onMouseEnter={() => handleDropdownEnter(l.dropdownKey!)}
                      onMouseLeave={handleDropdownLeave}
                    >
                      {sections
                        .find((s) => s.slug === l.dropdownKey)
                        ?.subsections.map((sub) => (
                          <div key={sub.id}>
                            {sub.children && sub.children.length > 0 ? (
                              // Has children - show as expandable group
                              <div className="px-4 py-2 border-b border-border/50 last:border-0">
                                <Link
                                  to={`/${l.dropdownKey}/${sub.slug}`}
                                  className="font-semibold text-foreground hover:text-primary text-sm block mb-2"
                                  onClick={() => setActiveDropdown(null)}
                                >
                                  {sub.name}
                                </Link>
                                <div className="pl-3 space-y-1">
                                  {sub.children.map((child) => (
                                    <Link
                                      key={child.id}
                                      to={`/${l.dropdownKey}/${child.slug}`}
                                      className="block text-xs text-muted-foreground hover:text-primary py-1.5 transition-colors"
                                      onClick={() => setActiveDropdown(null)}
                                    >
                                      • {child.name}
                                    </Link>
                                  ))}
                                </div>
                              </div>
                            ) : (
                              // No children - regular link
                              <Link
                                to={`/${l.dropdownKey}/${sub.slug}`}
                                className="block px-4 py-2 text-sm text-foreground hover:bg-secondary transition-colors"
                                onClick={() => setActiveDropdown(null)}
                              >
                                {sub.name}
                              </Link>
                            )}
                          </div>
                        ))}
                    </div>
                  )}
                </div>
              ) : (
                <Link
                  key={l.to}
                  to={l.to}
                  className={`text-sm font-medium transition-colors hover:text-primary ${
                    location.pathname === l.to || (l.to !== "/" && location.pathname.startsWith(l.to))
                      ? "text-primary"
                      : "text-muted-foreground"
                  }`}
                >
                  {l.label}
                </Link>
              )
            ))}
            <Link
              to={headerCtaLink}
              className="inline-flex items-center justify-center rounded-lg bg-accent px-5 py-2.5 text-sm font-semibold text-accent-foreground transition-all hover:opacity-90 shadow-md"
            >
              {config.branding?.headerCtaLabel || t("nav.bookAppointment")}
            </Link>
          </nav>

          {/* Mobile menu toggle */}
          <div className="flex items-center gap-2 lg:hidden">
            {/* Language switcher - Hidden for now */}
            {/* {enabledLanguages.length > 1 && (
              <div className="relative">
                <button onClick={() => setLangOpen(!langOpen)} className="p-2 text-muted-foreground">
                  <Globe size={20} />
                </button>
                {langOpen && (
                  <div className="absolute right-0 top-full mt-1 bg-card rounded-lg shadow-lg border py-1 min-w-[120px] z-50">
                    {enabledLanguages.map((lang) => (
                      <button
                        key={lang}
                        onClick={() => { setLanguage(lang); setLangOpen(false); }}
                        className={`block w-full text-left px-4 py-1.5 text-sm ${language === lang ? "text-primary font-semibold" : "text-foreground"}`}
                      >
                        {languageLabels[lang]}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )} */}
            <button className="p-2" onClick={() => setMenuOpen(!menuOpen)}>
              {menuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>

        {/* Mobile nav */}
        <AnimatePresence>
          {menuOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="lg:hidden border-t bg-card overflow-hidden"
            >
              <div className="container py-4 flex flex-col gap-3">
                {navLinks.map((l) => (
                  l.hasDropdown ? (
                    <div key={l.to} className="space-y-2">
                      <Link
                        to={l.to}
                        onClick={() => setMenuOpen(false)}
                        className={`text-sm font-medium py-2 flex items-center gap-1 ${
                          location.pathname === l.to ? "text-primary" : "text-muted-foreground"
                        }`}
                      >
                        {l.label}
                        <ChevronDown size={14} />
                      </Link>
                      <div className="pl-4 space-y-2">
                        {sections
                          .find((s) => s.slug === l.dropdownKey)
                          ?.subsections.map((sub) => (
                            <div key={sub.id}>
                              {sub.children && sub.children.length > 0 ? (
                                <div className="space-y-1">
                                  <Link
                                    to={`/${l.dropdownKey}/${sub.slug}`}
                                    onClick={() => setMenuOpen(false)}
                                    className="block text-xs font-medium py-1 text-foreground"
                                  >
                                    {sub.name}
                                  </Link>
                                  <div className="pl-3 space-y-1">
                                    {sub.children.map((child) => (
                                      <Link
                                        key={child.id}
                                        to={`/${l.dropdownKey}/${child.slug}`}
                                        onClick={() => setMenuOpen(false)}
                                        className="block text-xs py-1 text-muted-foreground hover:text-foreground"
                                      >
                                        {child.name}
                                      </Link>
                                    ))}
                                  </div>
                                </div>
                              ) : (
                                <Link
                                  to={`/${l.dropdownKey}/${sub.slug}`}
                                  onClick={() => setMenuOpen(false)}
                                  className="block text-xs py-1.5 text-muted-foreground hover:text-foreground"
                                >
                                  {sub.name}
                                </Link>
                              )}
                            </div>
                          ))}
                      </div>
                    </div>
                  ) : (
                    <Link
                      key={l.to}
                      to={l.to}
                      onClick={() => setMenuOpen(false)}
                      className={`text-sm font-medium py-2 ${
                        location.pathname === l.to ? "text-primary" : "text-muted-foreground"
                      }`}
                    >
                      {l.label}
                    </Link>
                  )
                ))}
                <Link
                  to={headerCtaLink}
                  onClick={() => setMenuOpen(false)}
                  className="inline-flex items-center justify-center rounded-lg bg-accent px-5 py-2.5 text-sm font-semibold text-accent-foreground"
                >
                  {config.branding?.headerCtaLabel || t("nav.bookAppointment")}
                </Link>
                {isAdmin && (
                  <Link to="/admin" onClick={() => setMenuOpen(false)} className="text-sm font-medium py-2 text-accent flex items-center gap-1">
                    <Shield size={14} /> {siteLabel(config, "adminLinkLabel")}
                  </Link>
                )}
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
              <h3 className="font-display text-xl font-bold mb-4">{config.doctorName} {config.clinicName}</h3>
              <p className="text-primary-foreground/70 text-sm leading-relaxed">
                {config.branding?.footerTagline || t("footer.tagline")}
              </p>
            </div>
            <div>
              <h4 className="font-display text-lg font-semibold mb-4">{siteLabelOr(config, "footerQuickLinksHeading", t("footer.quickLinks"))}</h4>
              <div className="flex flex-col gap-2">
                {navLinks.map((l) => (
                  <Link key={l.to} to={l.to} className="text-sm text-primary-foreground/70 hover:text-primary-foreground transition-colors">
                    {l.label}
                  </Link>
                ))}
                <Link to="/book" className="text-sm text-primary-foreground/70 hover:text-primary-foreground transition-colors">
                  {siteLabelOr(config, "footerBookLabel", t("nav.bookAppointment"))}
                </Link>
              </div>
            </div>
            <div>
              <h4 className="font-display text-lg font-semibold mb-4">{siteLabelOr(config, "footerContactHeading", t("footer.contact"))}</h4>
              <div className="flex flex-col gap-3 text-sm text-primary-foreground/70">
                <a
                  href={config.branding?.googleMapsUrl || config.googleMapsDirectionsUrl || "https://maps.app.goo.gl/KQzg4FnBZ2bbBxwh8"}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-start gap-2 hover:text-primary-foreground transition-colors"
                >
                  <MapPin size={16} className="mt-0.5 shrink-0" />
                  <span>{config.location}</span>
                </a>
                <div className="flex items-center gap-2">
                  <Phone size={16} className="shrink-0" />
                  <span>{formatPhone(config.phone)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Mail size={16} className="shrink-0" />
                  <span>{config.email}</span>
                </div>
              </div>
              {(config.facebook || config.instagram || config.branding?.youtubeUrl) && (
                <div className="mt-4">
                  <h5 className="text-sm font-semibold mb-3">{siteLabel(config, "footerFollowHeading")}</h5>
                  <div className="flex gap-3">
                    {config.facebook && (
                      <a href={config.facebook} target="_blank" rel="noopener noreferrer" 
                         className="w-10 h-10 rounded-full bg-primary-foreground/10 hover:bg-primary-foreground/20 flex items-center justify-center transition-colors"
                         aria-label="Facebook">
                        <Facebook size={18} />
                      </a>
                    )}
                    {config.instagram && (
                      <a href={config.instagram} target="_blank" rel="noopener noreferrer"
                         className="w-10 h-10 rounded-full bg-primary-foreground/10 hover:bg-primary-foreground/20 flex items-center justify-center transition-colors"
                         aria-label="Instagram">
                        <Instagram size={18} />
                      </a>
                    )}
                    {config.branding?.youtubeUrl && (
                      <a href={config.branding.youtubeUrl} target="_blank" rel="noopener noreferrer"
                         className="w-10 h-10 rounded-full bg-primary-foreground/10 hover:bg-primary-foreground/20 flex items-center justify-center transition-colors"
                         aria-label="YouTube">
                        <Youtube size={18} />
                      </a>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
          <div className="border-t border-primary-foreground/20 mt-10 pt-6 text-center text-xs text-primary-foreground/50">
            {config.branding?.copyrightText || `© 2026 ${config.doctorName} ${config.clinicName}. ${siteLabelOr(config, "footerRightsText", t("footer.rights"))}`}
          </div>
        </div>
      </footer>

      <WhatsAppFloat />
    </div>
  );
}
