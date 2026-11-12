import { Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import AdminLogin from "@/pages/AdminLogin";
import AdminLayout from "@/components/admin/AdminLayout";
import { RequireAuth, RequireCapability } from "@/components/admin/RouteGuards";
import { PageHeader } from "@/components/admin/states";
import AdminHome from "@/pages/admin/AdminHome";
import AdminAccount from "@/pages/admin/AdminAccount";
import AdminPages from "@/pages/admin/AdminPages";
import AdminTreatments from "@/pages/admin/AdminTreatments";
import AdminDoctor from "@/pages/admin/AdminDoctor";
import AdminClinic from "@/pages/admin/AdminClinic";
import AdminMedia from "@/pages/admin/AdminMedia";
import AdminBranding from "@/pages/admin/AdminBranding";
import AdminSeo from "@/pages/admin/AdminSeo";
import AdminUsers from "@/pages/admin/AdminUsers";
import AdminActivity from "@/pages/admin/AdminActivity";
import AdminDashboard from "@/pages/AdminDashboard";
import type { Capability } from "@/lib/permissions";
import type { ReactNode } from "react";

function Guarded({ capability, children }: { capability: Capability; children: ReactNode }) {
  return <RequireCapability capability={capability}>{children}</RequireCapability>;
}

function AdminNotFound() {
  return (
    <div>
      <PageHeader title="Page not found" description="That admin page does not exist." />
    </div>
  );
}

/**
 * All /admin/* routes. Mounted lazily from App.tsx so the public site bundle does not carry admin code.
 * Route access is decided here for UX; the database (RLS & triggers) is the real enforcement.
 */
export default function AdminApp() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="login" element={<AdminLogin />} />

        <Route element={<RequireAuth />}>
          <Route element={<AdminLayout />}>
            <Route index element={<Guarded capability="dashboard.view"><AdminHome /></Guarded>} />
            <Route path="account" element={<AdminAccount />} />

            {/* Iteration 3 Content & Media Workspaces */}
            <Route path="pages" element={<Guarded capability="content.view"><AdminPages /></Guarded>} />
            <Route path="treatments" element={<Guarded capability="treatments.edit"><AdminTreatments /></Guarded>} />
            <Route path="doctor" element={<Guarded capability="doctor.edit"><AdminDoctor /></Guarded>} />
            <Route path="clinic" element={<Guarded capability="clinic.edit"><AdminClinic /></Guarded>} />
            <Route path="media" element={<Guarded capability="media.view"><AdminMedia /></Guarded>} />

            {/* Existing working modules */}
            <Route path="content" element={<Guarded capability="content.view"><AdminDashboard tab="content" /></Guarded>} />
            <Route path="settings" element={<Guarded capability="system.settings"><AdminDashboard tab="settings" /></Guarded>} />
            <Route path="appointments" element={<Guarded capability="patientData.view"><AdminDashboard tab="appointments" /></Guarded>} />
            <Route path="second-opinions" element={<Guarded capability="patientData.view"><AdminDashboard tab="second-opinions" /></Guarded>} />

            {/* Iteration 4 Branding, SEO, Users & Activity Log Workspaces */}
            <Route path="branding" element={<Guarded capability="branding.edit"><AdminBranding /></Guarded>} />
            <Route path="seo" element={<Guarded capability="seo.edit"><AdminSeo /></Guarded>} />
            <Route path="users" element={<Guarded capability="users.manage"><AdminUsers /></Guarded>} />
            <Route path="activity" element={<Guarded capability="activity.view"><AdminActivity /></Guarded>} />

            <Route path="*" element={<AdminNotFound />} />
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/admin" replace />} />
      </Routes>
    </AuthProvider>
  );
}
