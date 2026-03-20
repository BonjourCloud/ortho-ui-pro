import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
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
  languages: string[];
  registrationNumber: string;
  education: EducationEntry[];
  awards: AwardEntry[];
  memberships: string[];
  insuranceProviders: string[];
  timeSlots: TimeSlotEntry[];
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
  languages: ["English", "Hindi", "Telugu"],
  registrationNumber: "TSMC/FMR/12345",
  education: [
    { degree: "MBBS", institution: "Osmania Medical College, Hyderabad", yearStart: 2000, yearEnd: 2004 },
    { degree: "MS Orthopaedics", institution: "Nizam's Institute of Medical Sciences", yearStart: 2005, yearEnd: 2008 },
    { degree: "Fellowship - Joint Replacement", institution: "Singapore General Hospital", yearStart: 2010, yearEnd: 2011 },
  ],
  awards: [
    { title: "Best Orthopedic Surgeon", organization: "Hyderabad Medical Association", year: 2023 },
    { title: "Young Achiever Award", organization: "Indian Orthopaedic Association", year: 2018 },
  ],
  memberships: [
    "Indian Orthopaedic Association",
    "Telangana Orthopaedic Surgeons Society",
  ],
  insuranceProviders: [
    "Star Health Insurance",
    "ICICI Lombard",
    "New India Assurance",
    "Bajaj Allianz",
    "HDFC Ergo",
  ],
  timeSlots: [
    { time: "07:00 AM", available: true },
    { time: "08:00 AM", available: true },
    { time: "09:00 AM", available: true },
    { time: "10:00 AM", available: false },
    { time: "11:00 AM", available: false },
    { time: "04:00 PM", available: true },
    { time: "05:00 PM", available: true },
    { time: "06:00 PM", available: true },
    { time: "07:00 PM", available: true },
    { time: "08:00 PM", available: true },
  ],
};

interface SiteConfigContextType {
  config: SiteConfig;
  updateConfig: (updates: Partial<SiteConfig>) => Promise<void>;
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
  const [configRowId, setConfigRowId] = useState<string | null>(null);

  // Load config from DB on mount
  useEffect(() => {
    supabase
      .from("site_config")
      .select("id, config")
      .limit(1)
      .single()
      .then(({ data }) => {
        if (data) {
          setConfigRowId(data.id);
          setConfig({ ...defaultConfig, ...(data.config as any) });
        }
      });
  }, []);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      const currentUser = session?.user ?? null;
      setUser(currentUser);

      if (currentUser) {
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

  const updateConfig = async (updates: Partial<SiteConfig>) => {
    const newConfig = { ...config, ...updates };
    setConfig(newConfig);

    // Persist to DB
    if (configRowId) {
      await supabase
        .from("site_config")
        .update({ config: newConfig as any, updated_at: new Date().toISOString() })
        .eq("id", configRowId);
    }
  };

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
