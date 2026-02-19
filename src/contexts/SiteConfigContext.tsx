import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User } from "@supabase/supabase-js";

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
  isAuthLoading: boolean;
  user: User | null;
  adminLogin: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  adminLogout: () => Promise<void>;
}

const SiteConfigContext = createContext<SiteConfigContextType | null>(null);

export function SiteConfigProvider({ children }: { children: ReactNode }) {
  const [config, setConfig] = useState<SiteConfig>(() => {
    const saved = localStorage.getItem("siteConfig");
    return saved ? { ...defaultConfig, ...JSON.parse(saved) } : defaultConfig;
  });

  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isAuthLoading, setIsAuthLoading] = useState(true);

  useEffect(() => {
    // Set up auth listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      const currentUser = session?.user ?? null;
      setUser(currentUser);

      if (currentUser) {
        // Check admin role via has_role function
        const { data } = await supabase.rpc("has_role" as any, {
          _user_id: currentUser.id,
          _role: "admin",
        });
        setIsAdmin(data === true);
      } else {
        setIsAdmin(false);
      }
      setIsAuthLoading(false);
    });

    // Then check existing session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      const currentUser = session?.user ?? null;
      setUser(currentUser);

      if (currentUser) {
        const { data } = await supabase.rpc("has_role" as any, {
          _user_id: currentUser.id,
          _role: "admin",
        });
        setIsAdmin(data === true);
      }
      setIsAuthLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    localStorage.setItem("siteConfig", JSON.stringify(config));
  }, [config]);

  const updateConfig = (updates: Partial<SiteConfig>) => {
    setConfig((prev) => ({ ...prev, ...updates }));
  };

  const adminLogin = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      return { success: false, error: error.message };
    }
    // Role check will happen via onAuthStateChange
    return { success: true };
  };

  const adminLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setIsAdmin(false);
  };

  return (
    <SiteConfigContext.Provider value={{ config, updateConfig, isAdmin, isAuthLoading, user, adminLogin, adminLogout }}>
      {children}
    </SiteConfigContext.Provider>
  );
}

export function useSiteConfig() {
  const ctx = useContext(SiteConfigContext);
  if (!ctx) throw new Error("useSiteConfig must be used within SiteConfigProvider");
  return ctx;
}
