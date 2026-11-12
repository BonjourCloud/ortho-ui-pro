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

/** Editor: everything in editor categories, minus nothing – deletes/system/users/audit/patient data/publishing are excluded. */
const EDITOR_CAPABILITIES: ReadonlySet<Capability> = new Set(
  ALL_CAPABILITIES.filter((c) => EDITOR_CATEGORIES.has(categoryOf(c))),
);

/**
 * Legacy `admin` (existing role before Super Admin assignment is confirmed).
 * Keeps existing content/clinic/patient-inbox access so current workflows do not break,
 * but CANNOT bypass Super-Admin-only restrictions (system/security settings, user management, audit logs).
 */
const LEGACY_ADMIN_EXCLUDED: ReadonlySet<Capability> = new Set<Capability>([
  "users.manage",
  "activity.view",
  "system.settings",
  "security.settings",
]);

export interface PermissionOptions {
  /**
   * Mirrors app_settings.editors_can_publish (defaults to false).
   * Per Rajiv's confirmed workflow, Editors save drafts and submit for review (`content.submit_review`),
   * while Super Admin approves (`content.approve`) and publishes (`content.publish`).
   */
  editorsCanPublish?: boolean;
}

export function can(role: CmsRole | null | undefined, capability: Capability, options: PermissionOptions = {}): boolean {
  if (!role) return false;
  switch (role) {
    case "super_admin":
      return true;
    case "legacy_admin":
      return !LEGACY_ADMIN_EXCLUDED.has(capability);
    case "editor":
      if (capability === "content.publish") return options.editorsCanPublish === true;
      if (capability === "content.approve") return false;
      return EDITOR_CAPABILITIES.has(capability);
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
  editor: "Content Editor",
  legacy_admin: "Administrator (legacy role)",
};
