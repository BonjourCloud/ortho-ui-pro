import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { resolveCmsRole } from "@/lib/resolveCmsRole";
import { useSiteConfig, type SiteConfig } from "@/contexts/SiteConfigContext";
import {
  DEFAULT_HOME_CONTENT,
  DEFAULT_SITE_PAGES_CONTENT,
  isDraftPreviewParam,
  resolvePreviewData,
  type HomePageContent,
  type SitePageContent,
  type SitePageSlug,
  type WorkflowStatus,
} from "@/lib/cms/types";
import {
  loadHomePageRecord,
  loadSiteConfigDraft,
  loadSitePageRecord,
} from "@/lib/cms/repository";
import { applyScopeDraft, type SiteConfigScope } from "@/lib/cms/siteConfigScopes";

export interface UseHomePageContentResult {
  content: HomePageContent;
  usingDraft: boolean;
  workflowStatus: WorkflowStatus;
  loading: boolean;
}

export interface UseSitePageContentResult {
  content: SitePageContent;
  usingDraft: boolean;
  workflowStatus: WorkflowStatus;
  loading: boolean;
}

export interface UsePreviewSiteConfigResult {
  config: SiteConfig;
  usingDraft: boolean;
  workflowStatus: WorkflowStatus;
}

export async function verifyAuthenticatedCmsViewer(): Promise<boolean> {
  try {
    const { data: sessionData } = await supabase.auth.getSession();
    const uid = sessionData?.session?.user?.id;
    if (!uid) return false;
    const roleRes = await resolveCmsRole(supabase, uid);
    return roleRes.role !== null;
  } catch {
    return false;
  }
}

/**
 * Loads Homepage content for the public `Index.tsx` page.
 * - By default, returns `published` content (falling back to `DEFAULT_HOME_CONTENT` so the live website never breaks).
 * - If `?preview=1` (or `?preview=draft`) is present in the URL, verifies that the viewer has an active
 *   authenticated CMS role (`super_admin`, `editor`, or `legacy_admin`) before querying or returning `draft` content.
 * - Unauthenticated public visitors and unauthorized accounts can NEVER see draft content even if they append `?preview=1`.
 */
export function useHomePageContent(): UseHomePageContentResult {
  const [searchParams] = useSearchParams();
  const isPreviewParam = isDraftPreviewParam(searchParams.get("preview"));

  const [content, setContent] = useState<HomePageContent>(DEFAULT_HOME_CONTENT);
  const [usingDraft, setUsingDraft] = useState(false);
  const [workflowStatus, setWorkflowStatus] = useState<WorkflowStatus>("published");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    async function load() {
      setLoading(true);
      const isAuthenticatedCmsUser = isPreviewParam ? await verifyAuthenticatedCmsViewer() : false;

      const record = await loadHomePageRecord({
        includeDraft: isPreviewParam && isAuthenticatedCmsUser,
      });

      if (!active) return;

      const resolved = resolvePreviewData({
        published: record.published,
        draft: record.draft,
        isPreviewMode: isPreviewParam,
        isAuthenticatedCmsUser,
      });

      setContent(resolved.data);
      setUsingDraft(resolved.usingDraft);
      setWorkflowStatus(record.workflowStatus);
      setLoading(false);
    }

    void load();
    return () => {
      active = false;
    };
  }, [isPreviewParam]);

  return { content, usingDraft, workflowStatus, loading };
}

/**
 * Loads CMS content for any public website page (`about`, `orthopaedics`, `physiotherapy`, `rehabilitation`,
 * `services`, `book`, `contact`, `second-opinion`, `blog`, `case-studies`).
 * - Returns published content by default (falling back to `DEFAULT_SITE_PAGES_CONTENT[slug]`).
 * - Resolves `draft` content ONLY when `?preview=1` is present AND the viewer is an authenticated CMS user.
 */
export function useSitePageContent(slug: SitePageSlug): UseSitePageContentResult {
  const [searchParams] = useSearchParams();
  const isPreviewParam = isDraftPreviewParam(searchParams.get("preview"));

  const [content, setContent] = useState<SitePageContent>(DEFAULT_SITE_PAGES_CONTENT[slug]);
  const [usingDraft, setUsingDraft] = useState(false);
  const [workflowStatus, setWorkflowStatus] = useState<WorkflowStatus>("published");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setContent(DEFAULT_SITE_PAGES_CONTENT[slug]);

    async function load() {
      setLoading(true);
      const isAuthenticatedCmsUser = isPreviewParam ? await verifyAuthenticatedCmsViewer() : false;

      const record = await loadSitePageRecord(slug, {
        includeDraft: isPreviewParam && isAuthenticatedCmsUser,
      });

      if (!active) return;

      const resolved = resolvePreviewData({
        published: record.published,
        draft: record.draft,
        isPreviewMode: isPreviewParam,
        isAuthenticatedCmsUser,
      });

      setContent(resolved.data);
      setUsingDraft(resolved.usingDraft);
      setWorkflowStatus(record.workflowStatus);
      setLoading(false);
    }

    void load();
    return () => {
      active = false;
    };
  }, [slug, isPreviewParam]);

  return { content, usingDraft, workflowStatus, loading };
}

/**
 * Resolves `SiteConfig` (Doctor Profile, Clinic Info, Branding) with `?preview=1` draft support
 * for authenticated CMS users. Public visitors always receive the live published `config`.
 */
export function usePreviewSiteConfig(
  scope?: SiteConfigScope,
): UsePreviewSiteConfigResult {
  const { config: publishedConfig } = useSiteConfig();
  const [searchParams] = useSearchParams();
  const isPreviewParam = isDraftPreviewParam(searchParams.get("preview"));

  const [isAuthorizedPreview, setIsAuthorizedPreview] = useState(false);
  const [drafts, setDrafts] = useState<Partial<Record<SiteConfigScope, { draft: Partial<SiteConfig>; status: WorkflowStatus }>>>({});
  const scopeKey = scope ?? "all";

  useEffect(() => {
    let active = true;
    if (!isPreviewParam) {
      setIsAuthorizedPreview(false);
      setDrafts({});
      return;
    }
    void verifyAuthenticatedCmsViewer().then(async (ok) => {
      if (!active) return;
      setIsAuthorizedPreview(ok);
      if (!ok) return;
      // Drafts are shared in the database (migration 005c); RLS limits them to CMS users.
      const scopes: SiteConfigScope[] = scopeKey === "all" ? ["clinic", "doctor", "branding"] : [scopeKey as SiteConfigScope];
      const results = await Promise.all(scopes.map((s) => loadSiteConfigDraft(s)));
      if (!active) return;
      const next: Partial<Record<SiteConfigScope, { draft: Partial<SiteConfig>; status: WorkflowStatus }>> = {};
      results.forEach(({ record }, i) => {
        if (record && record.workflowStatus !== "published") {
          next[scopes[i]] = { draft: record.draft, status: record.workflowStatus };
        }
      });
      setDrafts(next);
    });
    return () => {
      active = false;
    };
  }, [isPreviewParam, scopeKey]);

  if (!isPreviewParam || !isAuthorizedPreview) {
    return { config: publishedConfig, usingDraft: false, workflowStatus: "published" };
  }

  let merged: SiteConfig = { ...publishedConfig };
  let anyDraft = false;
  let status: WorkflowStatus = "published";
  for (const s of ["clinic", "doctor", "branding"] as SiteConfigScope[]) {
    const entry = drafts[s];
    if (!entry) continue;
    merged = applyScopeDraft(s, merged, entry.draft);
    anyDraft = true;
    status = entry.status;
  }

  return { config: merged, usingDraft: anyDraft, workflowStatus: status };
}
