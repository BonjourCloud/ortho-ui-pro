import { useCallback, useEffect, useMemo, useState } from "react";
import {
  loadCollectionDraft,
  publishCollectionDraft,
  reviewCollectionDraft,
  saveCollectionDraft,
  type CmsOperationResult,
  type CollectionDraftRecord,
} from "@/lib/cms/repository";
import {
  EMPTY_CHANGESET,
  applyChangeset,
  removeChangesetItem,
  revertChangesetItem,
  summarizeChangeset,
  upsertChangesetItem,
  validateChangeset,
  type CollectionChangeset,
  type CollectionKey,
  type CollectionRow,
} from "@/lib/cms/collections";
import type { WorkflowStatus } from "@/lib/cms/types";

export type CollectionItemState = "added" | "updated" | "removed" | null;

/**
 * Shared draft → review → publish state for Services, Blog posts, Case studies and Testimonials.
 * Edits are collected in a local changeset, saved to `content_collection_drafts` (migration 005d),
 * and reach the live table only through `publish_collection_draft()` after approval.
 */
export function useCollectionDraft<T extends CollectionRow>(key: CollectionKey) {
  const [liveRows, setLiveRows] = useState<CollectionRow[]>([]);
  const [record, setRecord] = useState<CollectionDraftRecord | null>(null);
  const [changeset, setChangeset] = useState<CollectionChangeset>(EMPTY_CHANGESET);
  const [schemaReady, setSchemaReady] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const workflowStatus: WorkflowStatus = record?.workflowStatus ?? "published";
  const savedChangeset = useMemo(
    () => (record && record.workflowStatus !== "published" ? record.changeset : EMPTY_CHANGESET),
    [record],
  );

  const refresh = useCallback(
    async (resetLocal: boolean) => {
      const res = await loadCollectionDraft(key);
      setLiveRows(res.liveRows);
      setSchemaReady(res.schemaReady);
      setLoadError(res.error ?? null);
      setRecord(res.record);
      if (resetLocal) {
        setChangeset(res.record && res.record.workflowStatus !== "published" ? res.record.changeset : EMPTY_CHANGESET);
      }
      setLoading(false);
    },
    [key],
  );

  useEffect(() => {
    void refresh(true);
  }, [refresh]);

  /** Rows as they will look after publishing (removed rows are kept so they can be shown and undone). */
  const rows = useMemo(() => {
    const merged = applyChangeset(key, liveRows, { items: changeset.items, deletedIds: [] });
    return merged as T[];
  }, [key, liveRows, changeset.items]);

  const itemState = (id: string | undefined): CollectionItemState => {
    if (!id) return null;
    if (changeset.deletedIds.includes(id)) return "removed";
    const item = changeset.items.find((i) => i.id === id);
    if (!item) return null;
    return liveRows.some((r) => String(r.id) === id) ? "updated" : "added";
  };

  const unsavedChanges = JSON.stringify(changeset) !== JSON.stringify(savedChangeset);
  const summary = useMemo(() => summarizeChangeset(key, liveRows, savedChangeset), [key, liveRows, savedChangeset]);
  const localSummary = useMemo(() => summarizeChangeset(key, liveRows, changeset), [key, liveRows, changeset]);

  const editItem = (item: T) => setChangeset((cs) => upsertChangesetItem(key, cs, liveRows, item));
  const removeItem = (id: string) => setChangeset((cs) => removeChangesetItem(cs, id));
  const revertItem = (id: string) => setChangeset((cs) => revertChangesetItem(cs, id));

  const finish = async (res: CmsOperationResult, resetLocal = false) => {
    setStatusMessage(res.message);
    if (res.ok) await refresh(resetLocal);
    setBusy(false);
  };

  const save = async (targetStatus: "draft" | "pending_approval") => {
    if (targetStatus === "pending_approval") {
      const problems = validateChangeset(key, changeset, liveRows);
      if (problems.length > 0) {
        setStatusMessage(problems.join(" "));
        return;
      }
    }
    setBusy(true);
    setStatusMessage(null);
    await finish(await saveCollectionDraft({ key, changeset, targetStatus, previousStatus: workflowStatus }));
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
    await finish(await reviewCollectionDraft({ key, decision, feedback, previousStatus: workflowStatus }));
  };

  const publish = async () => {
    setBusy(true);
    setStatusMessage(null);
    await finish(await publishCollectionDraft(key, { direct: workflowStatus !== "approved" }), true);
  };

  const discardEdits = () => {
    setChangeset(savedChangeset);
    setStatusMessage("Unsaved edits discarded.");
  };

  return {
    key,
    rows,
    liveRows,
    record,
    changeset,
    schemaReady,
    loadError,
    loading,
    busy,
    statusMessage,
    workflowStatus,
    unsavedChanges,
    summary,
    localSummary,
    itemState,
    editItem,
    removeItem,
    revertItem,
    save,
    review,
    publish,
    discardEdits,
  };
}
