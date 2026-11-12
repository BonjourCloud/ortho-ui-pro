import {
  Calendar,
  FileText,
  Image as ImageIcon,
  LayoutDashboard,
  MapPin,
  Palette,
  ScrollText,
  Search,
  Stethoscope,
  Users,
  type LucideIcon,
  Inbox,
  BookOpen,
  UserCog,
} from "lucide-react";
import { can, type Capability, type CmsRole, type PermissionOptions } from "@/lib/permissions";

export type NavStatus = "live" | "iteration3" | "iteration4" | "database";

export interface AdminNavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  capability: Capability;
  group: "Overview" | "Website content" | "Appearance & SEO" | "Inbox" | "Administration";
  /** live = working today. Others are placeholders and shown with a "Soon" tag. */
  status: NavStatus;
  end?: boolean;
}

export const ADMIN_NAV: AdminNavItem[] = [
  { to: "/admin", label: "Dashboard", icon: LayoutDashboard, capability: "dashboard.view", group: "Overview", status: "live", end: true },

  { to: "/admin/pages", label: "Pages", icon: FileText, capability: "content.view", group: "Website content", status: "live" },
  { to: "/admin/treatments", label: "Treatments", icon: Stethoscope, capability: "treatments.edit", group: "Website content", status: "live" },
  { to: "/admin/content", label: "Services, blog & reviews", icon: BookOpen, capability: "content.view", group: "Website content", status: "live" },
  { to: "/admin/clinic", label: "Clinic & site settings", icon: MapPin, capability: "clinic.edit", group: "Website content", status: "live" },
  { to: "/admin/doctor", label: "Doctor profile", icon: UserCog, capability: "doctor.edit", group: "Website content", status: "live" },
  { to: "/admin/media", label: "Media library", icon: ImageIcon, capability: "media.view", group: "Website content", status: "live" },

  { to: "/admin/branding", label: "Branding & theme", icon: Palette, capability: "branding.edit", group: "Appearance & SEO", status: "live" },
  { to: "/admin/seo", label: "SEO", icon: Search, capability: "seo.edit", group: "Appearance & SEO", status: "live" },

  { to: "/admin/appointments", label: "Appointments", icon: Calendar, capability: "patientData.view", group: "Inbox", status: "live" },
  { to: "/admin/second-opinions", label: "Second opinions", icon: Inbox, capability: "patientData.view", group: "Inbox", status: "live" },

  { to: "/admin/users", label: "Users", icon: Users, capability: "users.manage", group: "Administration", status: "live" },
  { to: "/admin/activity", label: "Activity log", icon: ScrollText, capability: "activity.view", group: "Administration", status: "live" },
];

export const NAV_GROUP_ORDER: AdminNavItem["group"][] = ["Overview", "Website content", "Appearance & SEO", "Inbox", "Administration"];

export function getVisibleNav(role: CmsRole | null, options?: PermissionOptions): AdminNavItem[] {
  return ADMIN_NAV.filter((item) => can(role, item.capability, options));
}

export function groupNav(items: AdminNavItem[]): { group: AdminNavItem["group"]; items: AdminNavItem[] }[] {
  return NAV_GROUP_ORDER.map((group) => ({ group, items: items.filter((i) => i.group === group) })).filter((g) => g.items.length > 0);
}
