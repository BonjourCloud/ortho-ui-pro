import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

type MedicalSection = Tables<"medical_sections">;
type MedicalSubsection = Tables<"medical_subsections">;

export interface SubsectionWithChildren extends MedicalSubsection {
  children: MedicalSubsection[];
}

export interface SectionWithSubsections extends MedicalSection {
  subsections: SubsectionWithChildren[];
}

export function useMedicalSections() {
  const [sections, setSections] = useState<SectionWithSubsections[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSections = async () => {
      setLoading(true);
      
      // Fetch all sections
      const { data: sectionsData } = await supabase
        .from("medical_sections")
        .select("*")
        .eq("is_active", true)
        .order("sort_order");

      if (!sectionsData) {
        setLoading(false);
        return;
      }

      // Fetch all subsections (both level 1 and level 2)
      const { data: subsectionsData } = await supabase
        .from("medical_subsections")
        .select("*")
        .eq("is_active", true)
        .order("sort_order");

      // Build hierarchy: sections -> level 1 subsections -> level 2 subsections
      const sectionsWithSubs: SectionWithSubsections[] = sectionsData.map((section) => {
        // Get level 1 subsections (categories like "Shoulder Pain")
        const level1Subs = subsectionsData?.filter(
          (sub) => sub.section_id === section.id && sub.level === 1 && !sub.parent_id
        ) || [];

        // For each level 1, get its children (level 2)
        const subsectionsWithChildren: SubsectionWithChildren[] = level1Subs.map((level1) => ({
          ...level1,
          children: subsectionsData?.filter(
            (sub) => sub.parent_id === level1.id && sub.level === 2
          ) || [],
        }));

        return {
          ...section,
          subsections: subsectionsWithChildren,
        };
      });

      setSections(sectionsWithSubs);
      setLoading(false);
    };

    fetchSections();
  }, []);

  return { sections, loading };
}

export function useMedicalSection(slug: string | undefined) {
  const [section, setSection] = useState<SectionWithSubsections | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!slug) {
      setLoading(false);
      return;
    }

    const fetchSection = async () => {
      setLoading(true);

      const { data: sectionData } = await supabase
        .from("medical_sections")
        .select("*")
        .eq("slug", slug)
        .eq("is_active", true)
        .maybeSingle();

      if (!sectionData) {
        setLoading(false);
        return;
      }

      const { data: subsectionsData } = await supabase
        .from("medical_subsections")
        .select("*")
        .eq("section_id", sectionData.id)
        .eq("is_active", true)
        .order("sort_order");

      // Get level 1 subsections
      const level1Subs = subsectionsData?.filter((sub) => sub.level === 1 && !sub.parent_id) || [];

      // Build hierarchy with children
      const subsectionsWithChildren: SubsectionWithChildren[] = level1Subs.map((level1) => ({
        ...level1,
        children: subsectionsData?.filter((sub) => sub.parent_id === level1.id && sub.level === 2) || [],
      }));

      setSection({
        ...sectionData,
        subsections: subsectionsWithChildren,
      });
      setLoading(false);
    };

    fetchSection();
  }, [slug]);

  return { section, loading };
}

export function useMedicalSubsection(sectionSlug: string | undefined, subsectionSlug: string | undefined) {
  const [subsection, setSubsection] = useState<MedicalSubsection | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!sectionSlug || !subsectionSlug) {
      setLoading(false);
      return;
    }

    const fetchSubsection = async () => {
      setLoading(true);

      // First get the section
      const { data: sectionData } = await supabase
        .from("medical_sections")
        .select("id")
        .eq("slug", sectionSlug)
        .maybeSingle();

      if (!sectionData) {
        setLoading(false);
        return;
      }

      // Then get the subsection (could be level 1 or level 2)
      const { data: subsectionData } = await supabase
        .from("medical_subsections")
        .select("*")
        .eq("section_id", sectionData.id)
        .eq("slug", subsectionSlug)
        .eq("is_active", true)
        .maybeSingle();

      setSubsection(subsectionData);
      setLoading(false);
    };

    fetchSubsection();
  }, [sectionSlug, subsectionSlug]);

  return { subsection, loading };
}
