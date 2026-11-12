import { createContext, useCallback, useContext, useState, useEffect, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { resolveCmsRole, type RoleClient } from "@/lib/resolveCmsRole";
import type { User } from "@supabase/supabase-js";

export interface EducationEntry {
  degree: string;
  institution: string;
  yearStart: number;
  yearEnd?: number;
}

export interface AwardEntry {
  title: string;
  organization: string;
  year: number;
}

export interface TimeSlotEntry {
  time: string;
  available: boolean;
}

export interface WhyChooseEntry {
  icon: string;
  title: string;
  desc: string;
}

export interface ServiceCategoryEntry {
  name: string;
  icon: string;
  slug: string;
  description: string;
}

export interface NavItemConfig {
  id: string;
  label: string;
  to: string;
  visible: boolean;
  sortOrder: number;
  hasDropdown?: boolean;
  dropdownKey?: "orthopaedics" | "physiotherapy" | "rehabilitation";
}

export const DEFAULT_NAV_ITEMS: NavItemConfig[] = [
  { id: "home", label: "Home", to: "/", visible: true, sortOrder: 1 },
  { id: "about", label: "About", to: "/about", visible: true, sortOrder: 2 },
  { id: "orthopaedics", label: "Orthopaedics", to: "/orthopaedics", visible: true, sortOrder: 3, hasDropdown: true, dropdownKey: "orthopaedics" },
  { id: "physiotherapy", label: "Physiotherapy", to: "/physiotherapy", visible: true, sortOrder: 4, hasDropdown: true, dropdownKey: "physiotherapy" },
  { id: "rehabilitation", label: "Rehabilitation", to: "/rehabilitation", visible: true, sortOrder: 5, hasDropdown: true, dropdownKey: "rehabilitation" },
  { id: "contact", label: "Contact", to: "/contact", visible: true, sortOrder: 6 },
];

export interface BrandingConfig {
  logoUrl?: string;
  logoAlt?: string;
  faviconUrl?: string;
  themePreset?: "clinical-teal" | "royal-navy" | "emerald-care";
  primaryHsl?: string; // e.g. "180 45% 22%"
  accentHsl?: string;  // e.g. "38 85% 52%"
  headingFont?: "Playfair Display" | "Merriweather" | "Lora";
  bodyFont?: "DM Sans" | "Inter" | "Plus Jakarta Sans";
  footerTagline?: string;
  headerCtaLabel?: string;
  headerCtaLink?: string;
  googleMapsUrl?: string;
  announcementEnabled?: boolean;
  announcementText?: string;
  announcementLinkLabel?: string;
  announcementLinkUrl?: string;
  copyrightText?: string;
  youtubeUrl?: string;
  navItems?: NavItemConfig[];
  /** Site-wide UI labels (footer headings, 404 page, review badges…); see SITE_LABEL_DEFAULTS. */
  labels?: Record<string, string>;
}

export interface SiteConfig {
  doctorName: string;
  clinicName: string;
  title: string;
  specialization: string;
  shortBio: string;
  fullBio: string;
  philosophy: string;
  yearsExperience: number;
  happyPatients: number;
  surgeriesCompleted: number;
  branches: number;
  consultationFee: number;
  phone: string;
  whatsapp: string;
  email: string;
  location: string;
  hours: string;
  logoInitials: string;
  heroImageUrl: string;
  whatsappFloatEnabled: boolean;
  whatsappDefaultMessage?: string;
  googleRating: number;
  googleReviewCount: number;
  languages: string[];
  registrationNumber: string;
  facebook?: string;
  instagram?: string;
  education: EducationEntry[];
  awards: AwardEntry[];
  memberships: string[];
  insuranceProviders: string[];
  timeSlots: TimeSlotEntry[];
  whyChoose: WhyChooseEntry[];
  serviceCategories: ServiceCategoryEntry[];
  branding?: BrandingConfig;
  showEducationSection?: boolean;
  showAwardsSection?: boolean;
  showFellowshipCard?: boolean;
  fellowshipBadge?: string;
  fellowshipTitle?: string;
  fellowshipSubtitle?: string;
  fellowshipDescription?: string;
  fellowshipImageUrl?: string;
  googleMapsEmbedUrl?: string;
  googleMapsDirectionsUrl?: string;
}

export const defaultConfig: SiteConfig = {
  doctorName: "Dr. Ortho",
  clinicName: "Ortho Clinic",
  title: "MS Ortho, DNB - Orthopedic Surgeon",
  specialization: "Joint Replacement & Sports Medicine",
  shortBio: "Experienced orthopedic surgeon...",
  fullBio: "Detailed bio...",
  philosophy: "Patient-first approach...",
  yearsExperience: 15,
  happyPatients: 5000,
  surgeriesCompleted: 2000,
  branches: 2,
  consultationFee: 800,
  phone: "+91-9441824999",
  whatsapp: "+91-9441824999",
  email: "consult@drortho.com",
  location: "Hyderabad",
  hours: "Mon - Sat: 9 AM - 8 PM",
  logoInitials: "DO",
  heroImageUrl: "",
  whatsappFloatEnabled: true,
  whatsappDefaultMessage: "Hi Doctor, I'd like to book a consultation.",
  googleRating: 4.9,
  googleReviewCount: 500,
  languages: ["English", "Hindi", "Telugu"],
  registrationNumber: "TSMC/FMR/12345",
  facebook: "",
  instagram: "",
  education: [],
  awards: [],
  memberships: [],
  insuranceProviders: [],
  timeSlots: [],
  whyChoose: [],
  serviceCategories: [],
  showEducationSection: false,
  showAwardsSection: false,
  showFellowshipCard: true,
  fellowshipBadge: "🇰🇷",
  fellowshipTitle: "International Fellowship — South Korea",
  fellowshipSubtitle: "Advanced Joint Replacement & Sports Medicine",
  fellowshipDescription:
    "Trained in advanced arthroscopy & minimally invasive joint replacement at leading orthopedic centres in Seoul, South Korea under Professor Dr. Young Rae Moon — one of Asia's foremost authorities in shoulder and sports surgery. Brought back cutting-edge surgical techniques that significantly reduce recovery times.",
  fellowshipImageUrl: "",
  googleMapsEmbedUrl:
    "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3807.2!2d78.55!3d17.36!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3bcb99dac93e348d%3A0xc9039baf28225326!2sDr%20Prashanth%20Pinnamaneni!5e0!3m2!1sen!2sin!4v1700000000000",
  googleMapsDirectionsUrl: "https://maps.app.goo.gl/LsTEZt9UvBoZVYUF6",
};

interface SiteConfigContextType {
  config: SiteConfig;
  /** False until the live config has been read from the database (forms must not save defaults). */
  isConfigLoaded?: boolean;
  /** Re-reads the live config (e.g. after a Super Admin publishes an approved draft). */
  reloadConfig?: () => Promise<void>;
  /** True when the signed-in user has any CMS role (used to show the admin link on the public site). */
  isAdmin: boolean;
  isAuthLoading: boolean;
  user: User | null;
  adminLogin: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  adminLogout: () => Promise<void>;
}

const SiteConfigContext = createContext<SiteConfigContextType | null>(null);

export function SiteConfigProvider({ children }: { children: ReactNode }) {
  const [config, setConfig] = useState<SiteConfig>(defaultConfig);
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [isConfigLoaded, setIsConfigLoaded] = useState(false);

  const reloadConfig = useCallback(async () => {
    try {
      const { data } = await supabase
        .from("site_config")
        .select("id, config")
        .limit(1)
        .single();

      if (data) {
        setConfig({ ...defaultConfig, ...(data.config as Partial<SiteConfig>) });
      }
    } finally {
      setIsConfigLoaded(true);
    }
  }, []);

  // Load config
  useEffect(() => {
    void reloadConfig();
  }, [reloadConfig]);

  // ✅ FIXED AUTH FLOW (single source of truth)
  useEffect(() => {
    let isMounted = true;

    const handleUser = async (currentUser: User | null) => {
      if (!isMounted) return;

      setUser(currentUser);

      if (currentUser) {
        // Any CMS role (super_admin / editor). Display only: RLS enforces every write.
        let hasCmsRole = false;
        try {
          const resolved = await resolveCmsRole(supabase as unknown as RoleClient, currentUser.id);
          hasCmsRole = resolved.role !== null;
        } catch {
          hasCmsRole = false;
        }

        if (isMounted) {
          setIsAdmin(hasCmsRole);
        }
      } else {
        if (isMounted) {
          setIsAdmin(false);
        }
      }

      if (isMounted) {
        setIsAuthLoading(false);
      }
    };

    // Initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      handleUser(session?.user ?? null);
    });

    // Listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        handleUser(session?.user ?? null);
      }
    );

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const adminLogin = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  };

  const adminLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setIsAdmin(false);
  };

  return (
    <SiteConfigContext.Provider
      value={{ config, isConfigLoaded, reloadConfig, isAdmin, isAuthLoading, user, adminLogin, adminLogout }}
    >
      {children}
    </SiteConfigContext.Provider>
  );
}

export function useSiteConfig() {
  const ctx = useContext(SiteConfigContext);
  if (!ctx) throw new Error("useSiteConfig must be used within SiteConfigProvider");
  return ctx;
}