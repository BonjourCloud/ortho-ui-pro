/**
 * Frontend permission model for the CMS.
 *
 * IMPORTANT: this is a UX layer only (hide/disable controls, pick routes).
 * It is NOT a security boundary. Real enforcement must live in database RLS
 * and server functions (see docs/proposed-migrations/002_cms_foundation.sql,
 * which is NOT yet applied). Never treat a client-side `can()` as authorisation.
 */

export type CmsRole = "super_admin" | "editor" | "legacy_admin";

/** Permission categories – kept separate so each can be granted independently. */
export type CapabilityCategory =
  | "dashboard"
  | "content" // pages, sections, treatments, services, doctor profile (create/edit)
  | "clinic" // address, phone, hours, directions, social links
  | "media" // upload / replace
  | "branding" // permitted branding settings
  | "seo"
  | "publishing"
  | "destructive" // anything that deletes
  | "system" // system + security settings
  | "users" // account management
  | "audit" // activity logs
  | "patient_data"; // appointments, messages, second opinions

export const CAPABILITIES = {
  "dashboard.view": "dashboard",

  "content.view": "content",
  "content.create": "content",
  "content.edit": "content",
  "content.submit_review": "content",
  "section.edit": "content",
  "treatments.edit": "content",
  "doctor.edit": "content",

  "clinic.edit": "clinic",

  "media.view": "media",
  "media.upload": "media",
  "media.replace": "media",

  "branding.edit": "branding",
  "seo.edit": "seo",

  "content.approve": "publishing",
  "content.publish": "publishing",

  "content.delete": "destructive",
  "section.delete": "destructive",
  "media.delete": "destructive",

  "system.settings": "system",
  "security.settings": "system",

  "users.manage": "users",

  "activity.view": "audit",

  "patientData.view": "patient_data",
  "patientData.manage": "patient_data",
} as const satisfies Record<string, CapabilityCategory>;

export type Capability = keyof typeof CAPABILITIES;

export const ALL_CAPABILITIES = Object.keys(CAPABILITIES) as Capability[];

export function categoryOf(capability: Capability): CapabilityCategory {
  return CAPABILITIES[capability];
}

const EDITOR_CATEGORIES: ReadonlySet<CapabilityCategory> = new Set([
  "dashboard",
  "content",
  "clinic",
  "media",
  "branding",
  "seo",
]);

/** Editor ("Admin"): content, clinic, media, branding and SEO work. Deletes, system/security settings, users, audit logs, patient data, approval and publishing are excluded. */
const EDITOR_CAPABILITIES: ReadonlySet<Capability> = new Set(
  ALL_CAPABILITIES.filter((c) => EDITOR_CATEGORIES.has(categoryOf(c))),
);

/**
 * Legacy `admin` role (pre-CMS). It is retired in the database (005b drops every legacy policy and
 * `user_roles_cms_roles_only` forbids storing it), so it must never unlock anything in the UI and is
 * NEVER treated as a Super Admin. `decideAccess` shows it the "No CMS access" screen.
 */

export interface PermissionOptions {
  /**
   * @deprecated Ignored. Editors (shown as "Admin") can never publish or approve: the publish
   * functions and workflow triggers require an active Super Admin regardless of app_settings.
   */
  editorsCanPublish?: boolean;
}

/** Capabilities an editor must never hold, whatever their category. */
const EDITOR_FORBIDDEN: ReadonlySet<Capability> = new Set<Capability>(["content.publish", "content.approve"]);

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function can(role: CmsRole | null | undefined, capability: Capability, _options: PermissionOptions = {}): boolean {
  if (!role) return false;
  switch (role) {
    case "super_admin":
      return true;
    case "editor":
      if (EDITOR_FORBIDDEN.has(capability)) return false;
      return EDITOR_CAPABILITIES.has(capability);
    case "legacy_admin":
    default:
      return false;
  }
}

export function canAny(role: CmsRole | null | undefined, capabilities: Capability[], options?: PermissionOptions): boolean {
  return capabilities.some((c) => can(role, c, options));
}

export function parseRole(value: unknown): CmsRole | null {
  return value === "super_admin" || value === "editor" || value === "legacy_admin" ? value : null;
}

export const ROLE_LABELS: Record<CmsRole, string> = {
  super_admin: "Super Admin",
  // Business name for the routine CMS administrator; the database role stays `editor`.
  editor: "Admin",
  legacy_admin: "Legacy admin (no CMS access)",
};
