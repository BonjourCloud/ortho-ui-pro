/**
 * Per-user direct publishing (migration 007).
 *
 * UX layer only. The database decides: `publish_site_config_draft()` and `publish_collection_draft()`
 * call `authorize_cms_publish()`, which re-checks the caller's `profiles.direct_publish_enabled`
 * flag, role, account status, the allow-list below, the draft's contributors and removals at the
 * moment of publishing. Hiding or showing the button here never grants anything.
 */
import type { CmsRole } from "@/lib/permissions";
import type { CollectionKey } from "@/lib/cms/collections";
import type { WorkflowStatus } from "@/lib/cms/types";

export type DirectPublishTarget =
  | "site_config:doctor"
  | "collection:services"
  | "collection:blog_posts"
  | "collection:case_studies"
  | "collection:testimonials";

/**
 * Mirrors `public.direct_publish_targets()` in 007 (checked by directPublish.test.ts).
 * Clinic information and Branding are site-wide settings and always need Super Admin review.
 */
export const DIRECT_PUBLISH_TARGETS: readonly DirectPublishTarget[] = [
  "site_config:doctor",
  "collection:services",
  "collection:blog_posts",
  "collection:case_studies",
  "collection:testimonials",
];

export const DIRECT_PUBLISH_TARGET_LABELS: Record<DirectPublishTarget, string> = {
  "site_config:doctor": "Doctor profile",
  "collection:services": "Services",
  "collection:blog_posts": "Blog posts",
  "collection:case_studies": "Case studies",
  "collection:testimonials": "Testimonials",
};

export function collectionTarget(key: CollectionKey): DirectPublishTarget {
  return `collection:${key}` as DirectPublishTarget;
}

export function isDirectPublishTarget(value: string): value is DirectPublishTarget {
  return (DIRECT_PUBLISH_TARGETS as readonly string[]).includes(value);
}

/** Same decision as `can_direct_publish()`: active Editor, flag ON, allow-listed target. */
export function canDirectPublish(
  role: CmsRole | null | undefined,
  directPublishEnabled: boolean,
  target: string | null | undefined,
): boolean {
  return role === "editor" && directPublishEnabled === true && !!target && isDirectPublishTarget(target);
}

/**
 * Why the "Publish now" button is disabled for a direct publisher, or null when it can be used.
 * The database applies the same rules (plus the contributor check, which only it can see).
 */
export function directPublishBlockedReason(params: {
  workflowStatus: WorkflowStatus;
  unsavedChanges: boolean;
  hasRemovals?: boolean;
}): string | null {
  if (params.unsavedChanges) return "Save your draft first, then preview it before publishing.";
  if (params.workflowStatus !== "draft" && params.workflowStatus !== "pending_approval") {
    return "There is no saved draft to publish.";
  }
  if (params.hasRemovals) return "Removing items always needs Super Admin review. Submit this change for review.";
  return null;
}
