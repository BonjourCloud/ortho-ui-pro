import { createContext, useContext, useState, useEffect, ReactNode } from "react";

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
}

const defaultConfig: SiteConfig = {
  doctorName: "Dr. Ortho",
  clinicName: "Ortho Clinic",
  title: "MS Ortho, DNB - Orthopedic Surgeon",
  specialization: "Joint Replacement & Sports Medicine",
  shortBio: "Experienced orthopedic surgeon specializing in minimally invasive joint replacements and sports injury management with 15+ years of practice in Hyderabad.",
  fullBio: "Dr. Ortho is a renowned orthopedic surgeon with over 15 years of experience in joint replacement surgery, sports medicine, and trauma care. He has performed over 2000 successful surgeries and helped thousands of patients return to an active lifestyle. His approach combines the latest evidence-based medicine with personalized patient care.",
  philosophy: "I believe that every patient deserves personalized care based on the latest scientific evidence. Whether we choose surgical or conservative treatment, the goal is always to help you return to the activities you love as quickly and safely as possible.",
  yearsExperience: 15,
  happyPatients: 5000,
  surgeriesCompleted: 2000,
  branches: 2,
  consultationFee: 800,
  phone: "+919876543210",
  whatsapp: "+919876543210",
  email: "consult@drortho.com",
  location: "Banjara Hills, Hyderabad, Telangana",
  hours: "Mon - Sat: 9 AM - 8 PM",
  logoInitials: "DO",
  heroImageUrl: "",
  whatsappFloatEnabled: true,
};

interface SiteConfigContextType {
  config: SiteConfig;
  updateConfig: (updates: Partial<SiteConfig>) => void;
  isAdmin: boolean;
  adminLogin: (email: string, password: string) => boolean;
  adminLogout: () => void;
}

const ADMIN_EMAIL = "itsrahgiv@gmail.com";
const ADMIN_PASSWORD = "admin123";

const SiteConfigContext = createContext<SiteConfigContextType | null>(null);

export function SiteConfigProvider({ children }: { children: ReactNode }) {
  const [config, setConfig] = useState<SiteConfig>(() => {
    const saved = localStorage.getItem("siteConfig");
    return saved ? { ...defaultConfig, ...JSON.parse(saved) } : defaultConfig;
  });

  const [isAdmin, setIsAdmin] = useState(() => {
    return localStorage.getItem("adminToken") === "authenticated";
  });

  useEffect(() => {
    localStorage.setItem("siteConfig", JSON.stringify(config));
  }, [config]);

  const updateConfig = (updates: Partial<SiteConfig>) => {
    setConfig((prev) => ({ ...prev, ...updates }));
  };

  const adminLogin = (email: string, password: string) => {
    if (email === ADMIN_EMAIL && password === ADMIN_PASSWORD) {
      localStorage.setItem("adminToken", "authenticated");
      setIsAdmin(true);
      return true;
    }
    return false;
  };

  const adminLogout = () => {
    localStorage.removeItem("adminToken");
    setIsAdmin(false);
  };

  return (
    <SiteConfigContext.Provider value={{ config, updateConfig, isAdmin, adminLogin, adminLogout }}>
      {children}
    </SiteConfigContext.Provider>
  );
}

export function useSiteConfig() {
  const ctx = useContext(SiteConfigContext);
  if (!ctx) throw new Error("useSiteConfig must be used within SiteConfigProvider");
  return ctx;
}
