import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { resolveCmsRole } from "@/lib/resolveCmsRole";
import {
  DEFAULT_HOME_CONTENT,
  isDraftPreviewParam,
  resolvePreviewData,
  type HomePageContent,
  type WorkflowStatus,
} from "@/lib/cms/types";
import { loadHomePageRecord } from "@/lib/cms/repository";

export interface UseHomePageContentResult {
  content: HomePageContent;
  usingDraft: boolean;
  workflowStatus: WorkflowStatus;
  loading: boolean;
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

      let isAuthenticatedCmsUser = false;
      if (isPreviewParam) {
        try {
          const { data: sessionData } = await supabase.auth.getSession();
          const uid = sessionData?.session?.user?.id;
          if (uid) {
            const roleRes = await resolveCmsRole(supabase, uid);
            isAuthenticatedCmsUser = roleRes.role !== null;
          }
        } catch {
          isAuthenticatedCmsUser = false;
        }
      }

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
