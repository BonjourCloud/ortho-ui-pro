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
│   ├── SiteConfigContext.tsx   # Global site config (localStorage)
│   └── LanguageContext.tsx     # i18n state (en/hi/te)
├── data/
│   ├── mockData.ts            # ALL content data (services, blog, case studies, analytics)
│   └── translations.ts        # Translation strings for en/hi/te
├── components/
│   ├── Layout.tsx             # Shell: top bar, nav, footer, mobile menu
│   ├── WhatsAppFloat.tsx      # Floating WhatsApp button (toggleable)
│   └── ui/                    # shadcn/ui primitives
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
│   ├── AdminLogin.tsx         # Admin login (hardcoded creds)
│   ├── AdminDashboard.tsx     # Admin: overview, appointments, content, settings
│   └── NotFound.tsx           # 404
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
| `/admin/login` | AdminLogin | Admin authentication |
| `/admin` | AdminDashboard | Site management dashboard |

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
| **Index (Landing)** | `/` | `useServices()` → DB, `mockData.serviceCategories` + `mockData.testimonials` + `SiteConfigContext` | 🟡 Partial | Services from DB ✅; categories, testimonials, stats still mock/localStorage |
| **About** | `/about` | `mockData.doctorProfile` + `SiteConfigContext` | ❌ Mock | Education, awards, memberships all hardcoded in mockData |
| **Services** | `/services` | `useServices()` → DB, `mockData.serviceCategories` | 🟡 Partial | Service list from DB ✅; category definitions still mock |
| **Book Appointment** | `/book` | `mockData.services/insuranceProviders/timeSlots`, submits → `appointments` table | 🟡 Partial | **Form submits to DB ✅**; service dropdown, insurance list, time slots still mock |
| **Contact** | `/contact` | `SiteConfigContext`, submits → `contact_messages` table | 🟡 Partial | **Form submits to DB ✅**; contact info from localStorage config |
| **Blog Listing** | `/blog` | `useBlogPosts()` → DB | ✅ Backend | Reads from `blog_posts` table |
| **Blog Post** | `/blog/:slug` | `useBlogPost()` → DB | ✅ Backend | Single post from DB by slug |
| **Case Studies** | `/case-studies` | `useCaseStudies()` → DB | ✅ Backend | Reads from `case_studies` table |
| **Case Study Detail** | `/case-studies/:slug` | `useCaseStudy()` → DB | ✅ Backend | Single case study from DB by slug |
| **Second Opinion** | `/second-opinion` | Form → `second_opinions` table + file upload → `second-opinion-reports` storage bucket | ✅ Backend | Full flow: form + file upload to storage + DB insert |
| **Admin Login** | `/admin/login` | `SiteConfigContext` hardcoded creds | ❌ Mock | Hardcoded email/password, localStorage token |
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
| **Contact Messages** | Reads from `contact_messages` table | ✅ Backend | View messages (read-only) |
| **Settings** | `SiteConfigContext` → localStorage | ❌ Mock | Doctor name, phone, hours etc. saved to localStorage only |
| **Languages** | `LanguageContext` → localStorage | ❌ Mock | i18n toggle saved locally |

---

### Database Tables (Lovable Cloud)

| Table | Used By | RLS Policies | Status |
|-------|---------|--------------|--------|
| `appointments` | BookAppointment form, Admin tab | INSERT (public), SELECT (auth) | ✅ Active |
| `contact_messages` | Contact form, Admin tab | INSERT (public), SELECT (auth) | ✅ Active |
| `second_opinions` | SecondOpinion form, Admin tab | INSERT (public), SELECT (auth), UPDATE (auth) | ✅ Active |
| `blog_posts` | Blog pages, Admin CRUD | SELECT (public), INSERT/UPDATE/DELETE (auth) | ✅ Active |
| `case_studies` | CaseStudies pages, Admin CRUD | SELECT (public), INSERT/UPDATE/DELETE (auth) | ✅ Active |
| `services` | Services page, Index page, Admin CRUD | SELECT (public), INSERT/UPDATE/DELETE (auth) | ✅ Active |

### Storage Buckets

| Bucket | Purpose | Access |
|--------|---------|--------|
| `second-opinion-reports` | Medical report PDFs/images | INSERT (public), SELECT (auth via signed URLs) |

---

### What Still Uses Mock Data (`src/data/mockData.ts`)

| Export | Used By | Priority to Migrate |
|--------|---------|-------------------|
| `serviceCategories` | Index, Services (filter tabs) | 🟡 Medium — could become a DB table or derived from services |
| `testimonials` | Index page | 🔴 High — needs `testimonials` table |
| `doctorProfile` | About page | 🟡 Medium — could extend SiteConfig or create DB table |
| `insuranceProviders` | BookAppointment dropdown | 🟢 Low — rarely changes |
| `timeSlots` | BookAppointment time picker | 🟡 Medium — should be dynamic for real scheduling |
| `mockAnalytics` | Admin Overview tab | 🔴 High — completely fake numbers |

---

### What Needs To Be Built Next

#### 🔴 Critical

| Feature | Current State | What's Needed |
|---------|--------------|---------------|
| **Admin Auth** | Hardcoded `itsrahgiv@gmail.com` / `admin123` in `SiteConfigContext` | Proper auth (Supabase Auth) with JWT sessions |
| **Testimonials table** | 3 hardcoded in mockData | DB table + admin CRUD + display on Index page |
| **Real Analytics** | Fake numbers in mockData | Google Analytics, Plausible, or custom tracking |

#### 🟡 Medium

| Feature | Current State | What's Needed |
|---------|--------------|---------------|
| **Dynamic time slots** | Static array in mockData | Availability calendar or configurable schedule |
| **Doctor profile in DB** | Hardcoded in mockData | DB table or extend SiteConfig to persist server-side |
| **Site settings in DB** | localStorage only | DB table so settings persist across devices |
| **Service categories table** | Hardcoded array | Derive from services or separate table |
| **Email notifications** | None | Edge function for appointment confirmations, second opinion acknowledgements |

#### 🟢 Nice-to-Have

| Feature | Notes |
|---------|-------|
| **SEO meta tags** | Per-page `<title>` and `<meta>` (add react-helmet-async) |
| **Google Maps embed** | Contact page has placeholder — need real embed URL |
| **Real WhatsApp number** | Default is `+919876543210` |
| **Image uploads for blog/services** | No image column or upload flow yet |
