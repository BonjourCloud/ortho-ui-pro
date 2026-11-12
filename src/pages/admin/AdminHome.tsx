import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Calendar, FileText, Image as ImageIcon, MapPin, ScrollText, Stethoscope } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { AdminError, PageHeader } from "@/components/admin/states";
import { Skeleton } from "@/components/ui/skeleton";

interface Overview {
  treatmentPages: { total: number; active: number; inactive: number };
  services: number;
  blogPosts: number;
  caseStudies: number;
  reviewsPublished: number;
  appointments: number | null;
  recent: { label: string; kind: string; at: string }[];
}

type CountResult = PromiseLike<{ count: number | null; error: { message: string } | null }>;

async function countOf(query: CountResult, label: string): Promise<number> {
  const { count, error } = await query;
  if (error) throw new Error(`${label}: ${error.message}`);
  return count ?? 0;
}

const HEAD = { count: "exact", head: true } as const;

async function loadOverview(includePatientData: boolean): Promise<Overview> {
  const [total, active, services, blogPosts, caseStudies, reviewsPublished, appointments] = await Promise.all([
    countOf(supabase.from("medical_subsections").select("id", HEAD), "treatment pages"),
    countOf(supabase.from("medical_subsections").select("id", HEAD).eq("is_active", true), "active treatment pages"),
    countOf(supabase.from("services").select("id", HEAD), "services"),
    countOf(supabase.from("blog_posts").select("id", HEAD), "blog posts"),
    countOf(supabase.from("case_studies").select("id", HEAD), "case studies"),
    countOf(supabase.from("testimonials").select("id", HEAD).eq("is_published", true), "reviews"),
    includePatientData ? countOf(supabase.from("appointments").select("id", HEAD), "appointments") : Promise.resolve(null),
  ]);

  const [subs, svcs, posts, cfg] = await Promise.all([
    supabase.from("medical_subsections").select("name, updated_at").order("updated_at", { ascending: false }).limit(5),
    supabase.from("services").select("name, updated_at").order("updated_at", { ascending: false }).limit(5),
    supabase.from("blog_posts").select("title, updated_at").order("updated_at", { ascending: false }).limit(5),
    supabase.from("site_config").select("updated_at").limit(1),
  ]);
  for (const r of [subs, svcs, posts, cfg]) if (r.error) throw new Error(r.error.message);

  const recent = [
    ...(subs.data ?? []).map((r) => ({ label: r.name, kind: "Treatment page", at: r.updated_at })),
    ...(svcs.data ?? []).map((r) => ({ label: r.name, kind: "Service", at: r.updated_at })),
    ...(posts.data ?? []).map((r) => ({ label: r.title, kind: "Blog post", at: r.updated_at })),
    ...(cfg.data ?? []).map((r) => ({ label: "Clinic & site settings", kind: "Settings", at: r.updated_at })),
  ]
    .filter((r) => r.at)
    .sort((a, b) => (a.at < b.at ? 1 : -1))
    .slice(0, 8);

  return {
    treatmentPages: { total, active, inactive: total - active },
    services,
    blogPosts,
    caseStudies,
    reviewsPublished,
    appointments,
    recent,
  };
}

function Stat({ label, value, hint }: { label: string; value: number | string; hint?: string }) {
  return (
    <div className="rounded-xl border bg-card p-4">
      <div className="font-display text-2xl font-bold text-foreground">{value}</div>
      <div className="text-sm text-foreground/80">{label}</div>
      {hint && <div className="mt-0.5 text-xs text-muted-foreground">{hint}</div>}
    </div>
  );
}

export default function AdminHome() {
  const { can, user } = useAuth();
  const includePatientData = can("patientData.view");
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["admin-overview", includePatientData],
    queryFn: () => loadOverview(includePatientData),
  });

  const quickActions = [
    { to: "/admin/pages", label: "Edit all website pages", icon: FileText, cap: "content.view" as const },
    { to: "/admin/treatments", label: "Edit treatment & subsection pages", icon: Stethoscope, cap: "treatments.edit" as const },
    { to: "/admin/media", label: "Media library (images & video)", icon: ImageIcon, cap: "media.view" as const },
    { to: "/admin/clinic", label: "Update clinic details & maps", icon: MapPin, cap: "clinic.edit" as const },
    { to: "/admin/content", label: "Edit services, blog & reviews", icon: Stethoscope, cap: "content.view" as const },
    { to: "/admin/appointments", label: "View appointments", icon: Calendar, cap: "patientData.view" as const },
    { to: "/admin/activity", label: "Activity log", icon: ScrollText, cap: "activity.view" as const },
  ].filter((a) => can(a.cap));

  return (
    <div>
      <PageHeader title="Dashboard" description={`Welcome back${user?.email ? `, ${user.email}` : ""}. Figures below are read live from the database.`} />

      {error ? (
        <AdminError title="Couldn't load the overview" message={(error as Error).message} onRetry={() => void refetch()} />
      ) : (
        <>
          <section aria-label="Website overview" className="mb-8">
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              {isLoading || !data ? (
                Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)
              ) : (
                <>
                  <Stat label="Treatment pages" value={data.treatmentPages.total} hint="All pages in /orthopaedics, /physiotherapy, /rehabilitation" />
                  <Stat label="Active (visible)" value={data.treatmentPages.active} hint="Draft state arrives in Iteration 3" />
                  <Stat label="Inactive (hidden)" value={data.treatmentPages.inactive} />
                  <Stat label="Published reviews" value={data.reviewsPublished} />
                  <Stat label="Services" value={data.services} />
                  <Stat label="Blog posts" value={data.blogPosts} />
                  <Stat label="Case studies" value={data.caseStudies} />
                  {data.appointments !== null && <Stat label="Appointment requests" value={data.appointments} />}
                </>
              )}
            </div>
          </section>

          <div className="grid gap-6 lg:grid-cols-3">
            <section aria-label="Recent content updates" className="rounded-xl border bg-card lg:col-span-2">
              <h2 className="border-b p-4 font-display text-lg font-semibold">Recent content updates</h2>
              {isLoading || !data ? (
                <div className="space-y-2 p-4">
                  <Skeleton className="h-8" />
                  <Skeleton className="h-8" />
                  <Skeleton className="h-8" />
                </div>
              ) : data.recent.length === 0 ? (
                <p className="p-6 text-center text-sm text-muted-foreground">No content has been edited yet.</p>
              ) : (
                <ul className="divide-y">
                  {data.recent.map((r, i) => (
                    <li key={i} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
                      <span className="truncate font-medium text-foreground">{r.label}</span>
                      <span className="shrink-0 text-xs text-muted-foreground">
                        {r.kind} · {new Date(r.at).toLocaleString()}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
              <p className="border-t px-4 py-2 text-xs text-muted-foreground">Who made each change is not recorded yet (waiting for the activity log tables).</p>
            </section>

            <div className="space-y-6">
              <section aria-label="Quick actions" className="rounded-xl border bg-card p-4">
                <h2 className="mb-3 font-display text-lg font-semibold">Quick actions</h2>
                <ul className="space-y-1">
                  {quickActions.map((a) => (
                    <li key={a.to}>
                      <Link to={a.to} className="flex items-center gap-2.5 rounded-lg px-2 py-2 text-sm hover:bg-secondary">
                        <a.icon className="h-4 w-4 text-primary" aria-hidden="true" /> {a.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>

              <section aria-label="Administrative activity" className="rounded-xl border bg-card p-4">
                <h2 className="mb-2 font-display text-lg font-semibold">Recent administrative activity</h2>
                <p className="text-sm text-muted-foreground">Not available yet. This needs the activity log table, which is part of the database migration awaiting approval.</p>
              </section>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
