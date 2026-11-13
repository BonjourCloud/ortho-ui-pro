import type { ReactNode } from "react";
import { Pencil, Plus, Trash2, Undo2 } from "lucide-react";
import { DraftWorkflowPanels } from "@/components/admin/DraftWorkflowPanels";
import { useAuth } from "@/contexts/AuthContext";
import type { useCollectionDraft } from "@/hooks/useCollectionDraft";
import type { CollectionRow } from "@/lib/cms/collections";
import { collectionTarget } from "@/lib/cms/directPublish";

type Workspace<T extends CollectionRow> = ReturnType<typeof useCollectionDraft<T>>;

const STATE_BADGE: Record<"added" | "updated" | "removed", { label: string; className: string }> = {
  added: { label: "New (draft)", className: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300" },
  updated: { label: "Edited (draft)", className: "bg-amber-500/15 text-amber-700 dark:text-amber-300" },
  removed: { label: "Removal (draft)", className: "bg-destructive/15 text-destructive" },
};

export interface CollectionDraftListProps<T extends CollectionRow> {
  ws: Workspace<T>;
  title: string;
  label: string;
  addLabel: string;
  emptyText: string;
  previewUrl: string;
  onAdd: () => void;
  onEdit: (row: T) => void;
  renderSummary: (row: T) => ReactNode;
  /** Extra per-row controls (e.g. publish/unpublish toggle) rendered before edit/remove. */
  renderActions?: (row: T) => ReactNode;
}

/**
 * Workflow panels + list for a collection draft. Every edit, addition and removal is a draft
 * change until a Super Admin approves and publishes the changeset.
 */
export function CollectionDraftList<T extends CollectionRow>({
  ws,
  title,
  label,
  addLabel,
  emptyText,
  previewUrl,
  onAdd,
  onEdit,
  renderSummary,
  renderActions,
}: CollectionDraftListProps<T>) {
  const { can } = useAuth();
  const canRemove = can("content.delete");
  const disabled = !ws.schemaReady || Boolean(ws.loadError);

  const changesTable =
    ws.summary.length === 0 ? (
      <p className="text-xs text-muted-foreground">No saved changes.</p>
    ) : (
      <ul className="space-y-1.5 text-xs">
        {ws.summary.map((line) => (
          <li key={`${line.kind}-${line.id}`} className="flex flex-wrap items-center gap-2">
            <span className={`rounded-full px-2 py-0.5 font-semibold ${STATE_BADGE[line.kind].className}`}>
              {line.kind === "added" ? "Add" : line.kind === "updated" ? "Edit" : "Remove"}
            </span>
            <span className="font-medium text-foreground">{line.title}</span>
            {line.fields.length > 0 && (
              <span className="text-muted-foreground">({line.fields.map((f) => f.replace(/_/g, " ")).join(", ")})</span>
            )}
          </li>
        ))}
      </ul>
    );

  return (
    <div className="space-y-4">
      <DraftWorkflowPanels
        label={label}
        migration="005d"
        schemaReady={ws.schemaReady}
        loadError={ws.loadError}
        workflowStatus={ws.workflowStatus}
        busy={ws.busy}
        statusMessage={ws.statusMessage}
        reviewFeedback={ws.record?.reviewFeedback ?? null}
        reviewedByEmail={ws.record?.reviewedByEmail ?? null}
        reviewedAt={ws.record?.reviewedAt ?? null}
        history={ws.record?.history ?? []}
        previewUrl={previewUrl}
        unsavedChanges={ws.unsavedChanges}
        changes={[]}
        changesTable={changesTable}
        directPublishTarget={collectionTarget(ws.key)}
        hasRemovals={(ws.record?.changeset.deletedIds.length ?? 0) > 0}
        onSave={(s) => void ws.save(s)}
        onReview={(d, fb) => void ws.review(d, fb)}
        onPublish={() => void ws.publish()}
        onDiscard={ws.discardEdits}
      />

      <div className="mb-4 flex items-center justify-between">
        <h3 className="font-display font-semibold text-foreground">
          {title} ({ws.rows.length})
        </h3>
        <button
          type="button"
          disabled={disabled}
          onClick={onAdd}
          className="inline-flex items-center gap-1 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
        >
          <Plus size={16} /> {addLabel}
        </button>
      </div>

      {ws.loading ? (
        <p role="status" className="py-8 text-center text-sm text-muted-foreground">
          Loading…
        </p>
      ) : (
        <div className="space-y-3">
          {ws.rows.map((row) => {
            const id = String(row.id);
            const state = ws.itemState(id);
            return (
              <div
                key={id}
                data-testid={`collection-row-${id}`}
                className={`flex items-center justify-between rounded-xl border bg-card p-4 ${state === "removed" ? "opacity-60" : ""}`}
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    {renderSummary(row)}
                    {state && (
                      <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${STATE_BADGE[state].className}`}>
                        {STATE_BADGE[state].label}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {state !== "removed" && renderActions?.(row)}
                  {state && (
                    <button
                      type="button"
                      onClick={() => ws.revertItem(id)}
                      aria-label="Undo draft change"
                      title="Undo draft change"
                      className="p-2 text-muted-foreground hover:text-foreground"
                    >
                      <Undo2 size={16} />
                    </button>
                  )}
                  {state !== "removed" && (
                    <button
                      type="button"
                      disabled={disabled}
                      onClick={() => onEdit(row)}
                      aria-label="Edit"
                      className="p-2 text-muted-foreground hover:text-primary disabled:opacity-50"
                    >
                      <Pencil size={16} />
                    </button>
                  )}
                  {canRemove && state !== "removed" && (
                    <button
                      type="button"
                      disabled={disabled}
                      onClick={() => ws.removeItem(id)}
                      aria-label="Remove (draft)"
                      title="Mark for removal — takes effect only after approval and publishing"
                      className="p-2 text-muted-foreground hover:text-destructive disabled:opacity-50"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
          {ws.rows.length === 0 && <p className="py-8 text-center text-sm text-muted-foreground">{emptyText}</p>}
        </div>
      )}
    </div>
  );
}
