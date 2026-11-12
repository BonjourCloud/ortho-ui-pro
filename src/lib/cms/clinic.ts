/**
 * Clinic Information helpers — thin wrappers over the generic site_config scope helpers
 * (`siteConfigScopes.ts`), kept so existing imports keep working.
 */
import type { SiteConfig } from "@/contexts/SiteConfigContext";
import {
  SITE_CONFIG_FIELD_LABELS,
  SITE_CONFIG_SCOPE_KEYS,
  applyScopeDraft,
  diffScopeConfig,
  pickScopeConfig,
  validateScopeDraft,
  type ScopeFieldChange,
} from "@/lib/cms/siteConfigScopes";

/** Must match `public.clinic_config_keys()` in docs/proposed-migrations/005c_clinic_draft_workflow.sql. */
export const CLINIC_CONFIG_KEYS = SITE_CONFIG_SCOPE_KEYS.clinic;

export type ClinicConfigKey = (typeof CLINIC_CONFIG_KEYS)[number];
export type ClinicConfig = Pick<SiteConfig, ClinicConfigKey>;
export type ClinicFieldChange = ScopeFieldChange;

export const CLINIC_FIELD_LABELS = Object.fromEntries(
  CLINIC_CONFIG_KEYS.map((k) => [k, SITE_CONFIG_FIELD_LABELS[k] ?? k]),
) as Record<ClinicConfigKey, string>;

export const pickClinicConfig = (source: Partial<SiteConfig> | null | undefined) =>
  pickScopeConfig("clinic", source) as Partial<ClinicConfig>;
export const applyClinicDraft = (live: SiteConfig, draft: Partial<SiteConfig> | null | undefined) =>
  applyScopeDraft("clinic", live, draft);
export const diffClinicConfig = (live: SiteConfig, draft: Partial<SiteConfig> | null | undefined) =>
  diffScopeConfig("clinic", live, draft);
export const validateClinicDraft = (draft: Partial<SiteConfig>) => validateScopeDraft("clinic", draft);
