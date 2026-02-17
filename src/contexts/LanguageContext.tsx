import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from "react";
import { translations, Language, TranslationKey } from "@/data/translations";

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: TranslationKey) => string;
  enabledLanguages: Language[];
  setEnabledLanguages: (langs: Language[]) => void;
}

const LanguageContext = createContext<LanguageContextType | null>(null);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>(() => {
    return (localStorage.getItem("lang") as Language) || "en";
  });

  const [enabledLanguages, setEnabledLangsState] = useState<Language[]>(() => {
    const saved = localStorage.getItem("enabledLanguages");
    return saved ? JSON.parse(saved) : ["en", "hi", "te"];
  });

  useEffect(() => {
    localStorage.setItem("lang", language);
  }, [language]);

  useEffect(() => {
    localStorage.setItem("enabledLanguages", JSON.stringify(enabledLanguages));
  }, [enabledLanguages]);

  const setLanguage = useCallback((lang: Language) => {
    if (enabledLanguages.includes(lang)) setLanguageState(lang);
  }, [enabledLanguages]);

  const setEnabledLanguages = useCallback((langs: Language[]) => {
    const finalLangs: Language[] = langs.includes("en") ? langs : ["en" as Language, ...langs];
    setEnabledLangsState(finalLangs);
    if (!finalLangs.includes(language)) setLanguageState("en");
  }, [language]);

  const t = useCallback((key: TranslationKey): string => {
    return translations[language]?.[key] || translations.en[key] || key;
  }, [language]);

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t, enabledLanguages, setEnabledLanguages }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLanguage must be used within LanguageProvider");
  return ctx;
}

export type { Language };
