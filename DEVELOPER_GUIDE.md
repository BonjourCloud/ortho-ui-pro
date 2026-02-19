# Developer Guide — Dr. Ortho Clinic Website

## Quick Start (Local Development)

```bash
git clone <YOUR_GIT_URL>
cd <YOUR_PROJECT_NAME>
npm install
npm run dev
```

Tech stack: **React 18 + Vite + TypeScript + Tailwind CSS + shadcn/ui + Framer Motion**

---

## Architecture Overview

```
src/
├── App.tsx                    # Router + providers
├── main.tsx                   # Entry point
├── index.css                  # Tailwind + design tokens (HSL)
├── contexts/
│   ├── SiteConfigContext.tsx   # Global site config + Supabase Auth + admin role check
│   └── LanguageContext.tsx     # i18n state (en/hi/te)
├── data/
│   ├── mockData.ts            # Remaining mock data (categories, analytics, doctor profile)
│   └── translations.ts        # Translation strings for en/hi/te
├── components/
│   ├── Layout.tsx             # Shell: top bar, nav, footer, mobile menu
│   ├── WhatsAppFloat.tsx      # Floating WhatsApp button (toggleable)
│   ├── admin/                 # Admin CRUD components
│   │   ├── AdminServices.tsx
│   │   ├── AdminBlogPosts.tsx
│   │   ├── AdminCaseStudies.tsx
│   │   ├── AdminSecondOpinions.tsx
│   │   └── AdminTestimonials.tsx
│   └── ui/                    # shadcn/ui primitives
├── hooks/
│   └── useContent.ts          # DB query hooks (useServices, useBlogPosts, useTestimonials, etc.)
├── pages/
│   ├── Index.tsx              # Landing page (hero, stats, services, testimonials, CTA)
│   ├── About.tsx              # Doctor bio, education, awards, memberships
│   ├── Services.tsx           # Filterable service grid
│   ├── BookAppointment.tsx    # Appointment booking form
│   ├── Contact.tsx            # Contact form + map + WhatsApp link
│   ├── Blog.tsx               # Blog listing (featured + rest)
│   ├── BlogPost.tsx           # Single blog post (by slug)
│   ├── CaseStudies.tsx        # Case study listing with pain scores
│   ├── CaseStudyDetail.tsx    # Single case study (by slug)
│   ├── SecondOpinion.tsx      # Second opinion portal with file upload
│   ├── AdminLogin.tsx         # Admin login via Supabase Auth (signup toggleable)
│   ├── AdminDashboard.tsx     # Admin: overview, appointments, content, settings
│   └── NotFound.tsx           # 404
supabase/
├── config.toml                # Supabase project config (auto-managed)
└── functions/
    └── assign-admin-role/     # Edge function: bootstraps admin role for designated email
```

---

## Routes

| Route | Page | Description |
|---|---|---|
| `/` | Index | Landing page |
| `/about` | About | Doctor profile, education, awards |
| `/services` | Services | All services with category filter |
| `/book` | BookAppointment | Appointment request form |
| `/contact` | Contact | Contact form, map, phone, WhatsApp |
| `/blog` | Blog | Blog post listing |
| `/blog/:slug` | BlogPost | Individual blog post |
| `/case-studies` | CaseStudies | Case study listing |
| `/case-studies/:slug` | CaseStudyDetail | Individual case study |
| `/second-opinion` | SecondOpinion | Upload reports for second opinion |
| `/admin/login` | AdminLogin | Admin authentication (Supabase Auth) |
| `/admin` | AdminDashboard | Site management dashboard (admin-only) |

---

## Authentication & Authorization

### How It Works

1. **Supabase Auth** handles user signup/login with email + password (JWT sessions).
2. **`user_roles` table** stores role assignments (uses `app_role` enum: `admin`, `moderator`, `user`).
3. **`has_role()` function** (SECURITY DEFINER) checks roles without triggering recursive RLS.
4. **All write RLS policies** require `has_role(auth.uid(), 'admin')` — not just `authenticated`.
5. **`SiteConfigContext`** wraps the auth state: calls `supabase.auth.onAuthStateChange`, checks admin role via `has_role` RPC, exposes `isAdmin`, `user`, `isAuthLoading`.

### Admin Setup Flow

1. Admin enables "Allow New Sign Ups" toggle in Dashboard → Settings → Feature Toggles.
2. New user signs up at `/admin/login`.
3. The `assign-admin-role` edge function assigns admin role **only** to `itsrahgiv@gmail.com`.
4. Admin disables signup toggle after account creation.

### Key Files

| File | Role |
|------|------|
| `src/contexts/SiteConfigContext.tsx` | Auth state, `adminLogin()`, `adminLogout()`, `isAdmin` check via `has_role` RPC |
| `src/pages/AdminLogin.tsx` | Login/signup form, reads `signup_enabled` from `app_settings` table |
| `src/pages/AdminDashboard.tsx` | Protected page, redirects to `/admin/login` if not admin, includes `SignupToggle` component |
| `supabase/functions/assign-admin-role/index.ts` | Edge function: assigns admin role to designated email only |

### Signup Toggle

The signup toggle is stored in the `app_settings` table (`key: 'signup_enabled'`). When disabled:
- The login page hides the "Sign Up" link
- Only existing users can log in

---

## Feature & Integration Matrix

### Legend

| Icon | Meaning |
|------|---------|
| ✅ | Fully integrated with backend (Lovable Cloud / Supabase) |
| 🟡 | Partially integrated — some mock data remains |
| ❌ | Mock data only / not implemented |

---

### Page-by-Page Status

| Page | Route | Data Source | Backend Status | Notes |
|------|-------|------------|----------------|-------|
| **Index (Landing)** | `/` | `useServices()` → DB, `useTestimonials()` → DB, `mockData.serviceCategories` + `SiteConfigContext` | 🟡 Partial | Services ✅, Testimonials ✅; categories, stats still mock/localStorage |
| **About** | `/about` | `mockData.doctorProfile` + `SiteConfigContext` | ❌ Mock | Education, awards, memberships all hardcoded in mockData |
| **Services** | `/services` | `useServices()` → DB, `mockData.serviceCategories` | 🟡 Partial | Service list from DB ✅; category definitions still mock |
| **Book Appointment** | `/book` | `mockData.services/insuranceProviders/timeSlots`, submits → `appointments` table | 🟡 Partial | **Form submits to DB ✅**; service dropdown, insurance list, time slots still mock |
| **Contact** | `/contact` | `SiteConfigContext`, submits → `contact_messages` table | 🟡 Partial | **Form submits to DB ✅**; contact info from localStorage config |
| **Blog Listing** | `/blog` | `useBlogPosts()` → DB | ✅ Backend | Reads from `blog_posts` table |
| **Blog Post** | `/blog/:slug` | `useBlogPost()` → DB | ✅ Backend | Single post from DB by slug |
| **Case Studies** | `/case-studies` | `useCaseStudies()` → DB | ✅ Backend | Reads from `case_studies` table |
| **Case Study Detail** | `/case-studies/:slug` | `useCaseStudy()` → DB | ✅ Backend | Single case study from DB by slug |
| **Second Opinion** | `/second-opinion` | Form → `second_opinions` table + file upload → `second-opinion-reports` storage bucket | ✅ Backend | Full flow: form + file upload to storage + DB insert |
| **Admin Login** | `/admin/login` | Supabase Auth + `app_settings` table | ✅ Backend | Real auth with JWT sessions, signup toggle from DB |
| **Admin Dashboard** | `/admin` | Mixed | 🟡 Partial | See admin breakdown below |

---

### Admin Dashboard Tab Breakdown

| Tab | Data Source | Backend Status | Notes |
|-----|------------|----------------|-------|
| **Overview** | `mockAnalytics` from mockData | ❌ Mock | All analytics numbers are fake |
| **Appointments** | `supabase.from("appointments")` | ✅ Backend | Reads real appointments from DB |
| **2nd Opinions** | `AdminSecondOpinions` component → DB + Storage signed URLs | ✅ Backend | View submissions, download files, update status |
| **Blog Posts** | `AdminBlogPosts` component → DB | ✅ Backend | Full CRUD on `blog_posts` table |
| **Case Studies** | `AdminCaseStudies` component → DB | ✅ Backend | Full CRUD on `case_studies` table |
| **Services** | `AdminServices` component → DB | ✅ Backend | Full CRUD on `services` table |
| **Testimonials** | `AdminTestimonials` component → DB | ✅ Backend | Full CRUD on `testimonials` table |
| **Contact Messages** | Reads from `contact_messages` table | ✅ Backend | View messages (read-only) |
| **Settings** | `SiteConfigContext` → localStorage + `app_settings` → DB | 🟡 Partial | Doctor name, phone, hours saved to localStorage; signup toggle saved to DB |
| **Languages** | `LanguageContext` → localStorage | ❌ Mock | i18n toggle saved locally |

---

### Database Tables (Lovable Cloud)

| Table | Used By | RLS Policies | Status |
|-------|---------|--------------|--------|
| `appointments` | BookAppointment form, Admin tab | INSERT (public), SELECT (admin) | ✅ Active |
| `contact_messages` | Contact form, Admin tab | INSERT (public), SELECT (admin) | ✅ Active |
| `second_opinions` | SecondOpinion form, Admin tab | INSERT (public), SELECT (admin), UPDATE (admin) | ✅ Active |
| `blog_posts` | Blog pages, Admin CRUD | SELECT (public), INSERT/UPDATE/DELETE (admin) | ✅ Active |
| `case_studies` | CaseStudies pages, Admin CRUD | SELECT (public), INSERT/UPDATE/DELETE (admin) | ✅ Active |
| `services` | Services page, Index page, Admin CRUD | SELECT (public), INSERT/UPDATE/DELETE (admin) | ✅ Active |
| `testimonials` | Index page, Admin CRUD | SELECT (public), INSERT/UPDATE/DELETE (admin) | ✅ Active |
| `user_roles` | Auth system | SELECT (own roles only) | ✅ Active |
| `app_settings` | Admin signup toggle, login page | SELECT (public), INSERT/UPDATE (admin) | ✅ Active |

### Database Functions

| Function | Type | Purpose |
|----------|------|---------|
| `has_role(uuid, app_role)` | SECURITY DEFINER | Check if a user has a specific role (used in all admin RLS policies) |
| `update_updated_at_column()` | Trigger function | Auto-update `updated_at` timestamps |

### Database Enums

| Enum | Values | Used By |
|------|--------|---------|
| `app_role` | `admin`, `moderator`, `user` | `user_roles` table |

### Storage Buckets

| Bucket | Purpose | Access |
|--------|---------|--------|
| `second-opinion-reports` | Medical report PDFs/images | INSERT (public), SELECT (auth via signed URLs) |

### Edge Functions

| Function | Purpose | Auth |
|----------|---------|------|
| `assign-admin-role` | Assigns admin role to designated email (`itsrahgiv@gmail.com`) | No JWT required (hardcoded email check) |

---

### What Still Uses Mock Data (`src/data/mockData.ts`)

| Export | Used By | Priority to Migrate |
|--------|---------|-------------------|
| `serviceCategories` | Index, Services (filter tabs) | 🟡 Medium — could become a DB table or derived from services |
| `doctorProfile` | About page | 🟡 Medium — could extend SiteConfig or create DB table |
| `insuranceProviders` | BookAppointment dropdown | 🟢 Low — rarely changes |
| `timeSlots` | BookAppointment time picker | 🟡 Medium — should be dynamic for real scheduling |
| `mockAnalytics` | Admin Overview tab | 🔴 High — completely fake numbers |

---

### What Needs To Be Built Next

#### 🔴 Critical

| Feature | Current State | What's Needed |
|---------|--------------|---------------|
| **Real Analytics** | Fake numbers in mockData | Google Analytics, Plausible, or custom tracking |

#### 🟡 Medium

| Feature | Current State | What's Needed |
|---------|--------------|---------------|
| **Dynamic time slots** | Static array in mockData | Availability calendar or configurable schedule |
| **Doctor profile in DB** | Hardcoded in mockData | DB table or extend SiteConfig to persist server-side |
| **Site settings in DB** | localStorage only (except signup toggle) | DB table so settings persist across devices |
| **Service categories table** | Hardcoded array | Derive from services or separate table |
| **Email notifications** | None | Edge function for appointment confirmations, second opinion acknowledgements |
| **Password reset flow** | Not implemented | `/reset-password` page + `resetPasswordForEmail()` |

#### 🟢 Nice-to-Have

| Feature | Notes |
|---------|-------|
| **SEO meta tags** | Per-page `<title>` and `<meta>` (add react-helmet-async) |
| **Google Maps embed** | Contact page has placeholder — need real embed URL |
| **Real WhatsApp number** | Default is `+919876543210` |
| **Image uploads for blog/services** | No image column or upload flow yet |
| **Additional admin roles** | `moderator` role exists in enum but no UI or policies use it yet |
