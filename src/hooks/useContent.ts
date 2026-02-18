import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

type Service = Tables<"services">;
type BlogPost = Tables<"blog_posts">;
type CaseStudy = Tables<"case_studies">;

export function useServices() {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    supabase.from("services").select("*").order("sort_order").then(({ data }) => {
      if (data) setServices(data);
      setLoading(false);
    });
  }, []);
  return { services, loading };
}

export function useBlogPosts() {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    supabase.from("blog_posts").select("*").order("published_at", { ascending: false }).then(({ data }) => {
      if (data) setPosts(data);
      setLoading(false);
    });
  }, []);
  return { posts, loading };
}

export function useBlogPost(slug: string | undefined) {
  const [post, setPost] = useState<BlogPost | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    if (!slug) { setLoading(false); return; }
    supabase.from("blog_posts").select("*").eq("slug", slug).maybeSingle().then(({ data }) => {
      setPost(data);
      setLoading(false);
    });
  }, [slug]);
  return { post, loading };
}

export function useCaseStudies() {
  const [studies, setStudies] = useState<CaseStudy[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    supabase.from("case_studies").select("*").order("created_at", { ascending: false }).then(({ data }) => {
      if (data) setStudies(data);
      setLoading(false);
    });
  }, []);
  return { studies, loading };
}

export function useCaseStudy(slug: string | undefined) {
  const [study, setStudy] = useState<CaseStudy | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    if (!slug) { setLoading(false); return; }
    supabase.from("case_studies").select("*").eq("slug", slug).maybeSingle().then(({ data }) => {
      setStudy(data);
      setLoading(false);
    });
  }, [slug]);
  return { study, loading };
}
