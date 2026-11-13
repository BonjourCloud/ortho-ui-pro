import { useCallback, useEffect, useMemo, useState } from "react";
import { useSiteConfig, type SiteConfig } from "@/contexts/SiteConfigContext";
import {
  loadSiteConfigDraft,
  publishSiteConfigDraft,
  reviewSiteConfigDraft,
  saveSiteConfigDraft,
  type CmsOperationResult,
  type SiteConfigDraftRecord,
} from "@/lib/cms/repository";
import { applyScopeDraft, diffScopeConfig, pickScopeConfig, type SiteConfigScope } from "@/lib/cms/siteConfigScopes";
import type { WorkflowStatus } from "@/lib/cms/types";

/**
 * Shared draft → review → publish state for the Clinic, Doctor and Branding workspaces.
 * Every action goes through `site_config_drafts`; live `site_config.config` is only changed by
 * the database-side `publish_site_config_draft()` after approval (Super Admins included).
 */
export function useSiteConfigDraft(scope: SiteConfigScope) {
  const { config, isConfigLoaded, reloadConfig } = useSiteConfig();
  const configLoaded = isConfigLoaded !== false;

  const [record, setRecord] = useState<SiteConfigDraftRecord | null>(null);
  const [schemaReady, setSchemaReady] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<SiteConfig>({ ...config });
  const [busy, setBusy] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const workflowStatus: WorkflowStatus = record?.workflowStatus ?? "published";

  /** What is currently saved: the open draft (if any) on top of the live config. */
  const savedVersion = useMemo<SiteConfig>(
    () => (record && record.workflowStatus !== "published" ? applyScopeDraft(scope, config, record.draft) : { ...config }),
    [config, record, scope],
  );

  const refresh = useCallback(
    async (resetForm: boolean) => {
      const res = await loadSiteConfigDraft(scope);
      setSchemaReady(res.schemaReady);
      setLoadError(res.error ?? null);
      setRecord(res.record);
      if (resetForm) {
        setForm(
          res.record && res.record.workflowStatus !== "published"
            ? applyScopeDraft(scope, config, res.record.draft)
            : { ...config },
        );
      }
      setLoading(false);
    },
    [config, scope],
  );

  // Wait for the live config before filling the form, so defaults are never saved as a draft.
  useEffect(() => {
    if (!configLoaded) return;
    void refresh(true);
  }, [configLoaded, refresh]);

  const unsavedChanges =
    JSON.stringify(pickScopeConfig(scope, form)) !== JSON.stringify(pickScopeConfig(scope, savedVersion));

  const pendingChanges = useMemo(
    () => (record && record.workflowStatus !== "published" ? diffScopeConfig(scope, config, record.draft) : []),
    [config, record, scope],
  );

  const finish = async (res: CmsOperationResult, resetForm = false) => {
    setStatusMessage(res.message);
    if (res.ok) await refresh(resetForm);
    setBusy(false);
  };

  const save = async (targetStatus: "draft" | "pending_approval") => {
    setBusy(true);
    setStatusMessage(null);
    await finish(await saveSiteConfigDraft({ scope, updates: form, targetStatus, previousStatus: workflowStatus }));
  };

  const review = async (decision: "approved" | "rejected", feedback?: string) => {
    if (unsavedChanges) {
      setStatusMessage(
        "You have unsaved edits. Save them (which re-opens the review) or discard them before approving or rejecting the submitted version.",
      );
      return;
    }
    setBusy(true);
    setStatusMessage(null);
    await finish(await reviewSiteConfigDraft({ scope, decision, feedback, previousStatus: workflowStatus }));
  };

  const publish = async () => {
    setBusy(true);
    setStatusMessage(null);
    const res = await publishSiteConfigDraft(scope, { direct: workflowStatus !== "approved" });
    if (res.ok) await reloadConfig?.();
    await finish(res, true);
  };

  const discardEdits = () => {
    setForm({ ...savedVersion });
    setStatusMessage("Unsaved edits discarded.");
  };

  return {
    config,
    configLoaded,
    loading,
    record,
    schemaReady,
    loadError,
    form,
    setForm,
    busy,
    statusMessage,
    workflowStatus,
    unsavedChanges,
    pendingChanges,
    save,
    review,
    publish,
    discardEdits,
  };
}
