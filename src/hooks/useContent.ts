import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { loadCollectionPreviewRows } from "@/lib/cms/repository";
import { isDraftPreviewParam } from "@/lib/cms/types";
import type { CollectionKey, CollectionRow } from "@/lib/cms/collections";
import { verifyAuthenticatedCmsViewer } from "@/hooks/usePageContent";
import type { Tables } from "@/integrations/supabase/types";

type Service = Tables<"services">;
type BlogPost = Tables<"blog_posts">;
type CaseStudy = Tables<"case_studies">;
type Testimonial = Tables<"testimonials">;

function isPreviewRequested(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return isDraftPreviewParam(new URLSearchParams(window.location.search).get("preview"));
  } catch {
    return false;
  }
}

/**
 * Draft preview of a collection: only when `?preview=1` is present AND the viewer is a signed-in
 * CMS user. Returns null otherwise, so public visitors always get the live rows. The changeset
 * comes from `content_collection_drafts` (migration 005d), which RLS hides from everyone else.
 */
async function loadPreviewRows<T>(key: CollectionKey, orderColumn: string, ascending: boolean): Promise<T[] | null> {
  if (!isPreviewRequested()) return null;
  if (!(await verifyAuthenticatedCmsViewer())) return null;
  const { data } = await supabase.from(key).select("*").order(orderColumn, { ascending });
  const preview = await loadCollectionPreviewRows(key, (data ?? []) as CollectionRow[]);
  return preview as T[] | null;
}

export function useServices() {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let active = true;
    void (async () => {
      const preview = await loadPreviewRows<Service>("services", "sort_order", true);
      if (!active) return;
      if (preview) {
        setServices(preview);
      } else {
        const { data } = await supabase.from("services").select("*").order("sort_order");
        if (active && data) setServices(data);
      }
      if (active) setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, []);
  return { services, loading };
}

export function useBlogPosts() {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let active = true;
    void (async () => {
      const preview = await loadPreviewRows<BlogPost>("blog_posts", "published_at", false);
      if (!active) return;
      if (preview) {
        setPosts(preview);
      } else {
        const { data } = await supabase.from("blog_posts").select("*").order("published_at", { ascending: false });
        if (active && data) setPosts(data);
      }
      if (active) setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, []);
  return { posts, loading };
}

export function useBlogPost(slug: string | undefined) {
  const [post, setPost] = useState<BlogPost | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    if (!slug) {
      setLoading(false);
      return;
    }
    let active = true;
    void (async () => {
      const preview = await loadPreviewRows<BlogPost>("blog_posts", "published_at", false);
      if (!active) return;
      if (preview) {
        setPost(preview.find((p) => p.slug === slug) ?? null);
      } else {
        const { data } = await supabase.from("blog_posts").select("*").eq("slug", slug).maybeSingle();
        if (active) setPost(data);
      }
      if (active) setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [slug]);
  return { post, loading };
}

export function useCaseStudies() {
  const [studies, setStudies] = useState<CaseStudy[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let active = true;
    void (async () => {
      const preview = await loadPreviewRows<CaseStudy>("case_studies", "created_at", false);
      if (!active) return;
      if (preview) {
        setStudies(preview);
      } else {
        const { data } = await supabase.from("case_studies").select("*").order("created_at", { ascending: false });
        if (active && data) setStudies(data);
      }
      if (active) setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, []);
  return { studies, loading };
}

export function useCaseStudy(slug: string | undefined) {
  const [study, setStudy] = useState<CaseStudy | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    if (!slug) {
      setLoading(false);
      return;
    }
    let active = true;
    void (async () => {
      const preview = await loadPreviewRows<CaseStudy>("case_studies", "created_at", false);
      if (!active) return;
      if (preview) {
        setStudy(preview.find((c) => c.slug === slug) ?? null);
      } else {
        const { data } = await supabase.from("case_studies").select("*").eq("slug", slug).maybeSingle();
        if (active) setStudy(data);
      }
      if (active) setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [slug]);
  return { study, loading };
}

export function useTestimonials() {
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let active = true;
    void (async () => {
      const preview = await loadPreviewRows<Testimonial>("testimonials", "sort_order", true);
      if (!active) return;
      if (preview) {
        setTestimonials(preview.filter((t) => t.is_published && t.is_featured));
      } else {
        const { data } = await supabase
          .from("testimonials")
          .select("*")
          .eq("is_published", true)
          .eq("is_featured", true)
          .order("sort_order");
        if (active && data) setTestimonials(data);
      }
      if (active) setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, []);
  return { testimonials, loading };
}
