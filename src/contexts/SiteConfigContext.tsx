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
  languages: string[];
  registrationNumber: string;
  education: any[];
  awards: any[];
  memberships: string[];
  insuranceProviders: string[];
  timeSlots: any[];
  whyChoose: any[];
  serviceCategories: any[];
}

const defaultConfig: SiteConfig = {
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
  phone: "+919876543210",
  whatsapp: "+919876543210",
  email: "consult@drortho.com",
  location: "Hyderabad",
  hours: "Mon - Sat: 9 AM - 8 PM",
  logoInitials: "DO",
  heroImageUrl: "",
  whatsappFloatEnabled: true,
  languages: ["English", "Hindi", "Telugu"],
  registrationNumber: "TSMC/FMR/12345",
  education: [],
  awards: [],
  memberships: [],
  insuranceProviders: [],
  timeSlots: [],
  whyChoose: [],
  serviceCategories: [],
};

interface SiteConfigContextType {
  config: SiteConfig;
  updateConfig: (updates: Partial<SiteConfig>) => Promise<any>;
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

  // Load config
  useEffect(() => {
    const loadConfig = async () => {
      const { data } = await supabase
        .from("site_config")
        .select("id, config")
        .limit(1)
        .single();

      if (data) {
        setConfigRowId(data.id);
        setConfig({ ...defaultConfig, ...(data.config as any) });
      }
    };

    loadConfig();
  }, []);

  // ✅ FIXED AUTH FLOW (single source of truth)
  useEffect(() => {
    let isMounted = true;

    const handleUser = async (currentUser: User | null) => {
      if (!isMounted) return;

      setUser(currentUser);

      if (currentUser) {
        const { data } = await supabase.rpc("has_role" as any, {
          _user_id: currentUser.id,
          _role: "admin",
        });

        if (isMounted) {
          setIsAdmin(data === true);
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

  const updateConfig = async (updates: Partial<SiteConfig>) => {
    // Preserve existing arrays if not explicitly provided in updates
    const arrayFields = ['education', 'awards', 'memberships', 'insuranceProviders', 'timeSlots', 'whyChoose', 'serviceCategories'];
    const preservedArrays: any = {};
    
    arrayFields.forEach(field => {
      // If the update doesn't include this field, or it's an empty array, preserve the existing value
      if (!updates[field as keyof SiteConfig] || (Array.isArray(updates[field as keyof SiteConfig]) && (updates[field as keyof SiteConfig] as any[]).length === 0)) {
        if (config[field as keyof SiteConfig] && Array.isArray(config[field as keyof SiteConfig]) && (config[field as keyof SiteConfig] as any[]).length > 0) {
          preservedArrays[field] = config[field as keyof SiteConfig];
        }
      }
    });

    const newConfig = { ...config, ...updates, ...preservedArrays };

    // optimistic update
    setConfig(newConfig);

    if (!configRowId) {
      throw new Error("No config row ID");
    }

    const { error } = await supabase
      .from("site_config")
      .update({
        config: newConfig as any,
        updated_at: new Date().toISOString(),
      })
      .eq("id", configRowId);

    if (error) {
      console.error(error);
      throw error;
    }

    return { success: true };
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
    <SiteConfigContext.Provider
      value={{ config, updateConfig, isAdmin, isAuthLoading, user, adminLogin, adminLogout }}
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