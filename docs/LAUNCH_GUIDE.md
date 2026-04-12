# 🚀 Launch & Deployment Guide — Dr. Ortho Clinic Website

## Table of Contents

1. [Admin Access & First Login](#1-admin-access--first-login)
2. [What You Can Edit from Admin Dashboard](#2-what-you-can-edit-from-admin-dashboard)
3. [Mock Data vs Real Data — Full Audit](#3-mock-data-vs-real-data--full-audit)
4. [Pre-Launch Checklist](#4-pre-launch-checklist)
5. [Local Development Setup](#5-local-development-setup)
6. [Vercel Deployment with Custom Domain](#6-vercel-deployment-with-custom-domain)
7. [Backend / API Architecture](#7-backend--api-architecture)
8. [What Needs to Be Extended for Full Production](#8-what-needs-to-be-extended-for-full-production)

---

## 1. Admin Access & First Login

### Your Admin Email: `itsrajivv@gmail.com`

The system uses role-based access control. Only the email above is authorized for admin role assignment.

### First-Time Setup Steps

1. **Go to** `/admin/login`
2. **Enable sign-ups** (one-time): You'll need sign-ups enabled first. If not already done, use the Lovable preview to access the admin dashboard and toggle "Allow New Sign Ups" under Settings.
3. **Sign up** with `itsrajivv@gmail.com` — this triggers the `assign-admin-role` edge function which grants you admin access.
4. **Confirm your email** by clicking the link sent to your inbox.
5. **Log in** at `/admin/login` — you'll be redirected to `/admin`.
6. **Disable sign-ups** in Settings → Feature Toggles to prevent unauthorized accounts.

### Password Reset

- Click "Forgot password?" on the login page → receive a reset link → set new password at `/reset-password`.

---

## 2. What You Can Edit from Admin Dashboard

Navigate to `/admin` after logging in. Here's everything you can manage:

### Settings Tab (Site Config — stored in `site_config` table)

| Setting | Field | Example |
|---------|-------|---------|
| **Doctor Name** | `doctorName` | "Dr. Rajiv Sharma" |
| **Clinic Name** | `clinicName` | "Ortho Care Clinic" |
| **Title / Credentials** | `title` | "MS Ortho, DNB" |
| **Specialization** | `specialization` | "Joint Replacement & Sports Medicine" |
| **Short Bio** | `shortBio` | Shown on homepage hero |
| **Full Bio** | `fullBio` | Shown on About page |
| **Philosophy** | `philosophy` | Quote on About page |
| **Profile Photo URL** | `heroImageUrl` | URL to doctor's photo |
| **Phone** | `phone` | "+91XXXXXXXXXX" |
| **WhatsApp** | `whatsapp` | "+91XXXXXXXXXX" |
| **Email** | `email` | "doctor@example.com" |
| **Location** | `location` | Full address string |
| **Clinic Hours** | `hours` | "Mon-Sat: 9AM-8PM" |
| **Logo Initials** | `logoInitials` | "RS" |
| **Registration Number** | `registrationNumber` | "TSMC/FMR/XXXXX" |
| **Consultation Fee** | `consultationFee` | 800 |
| **Stats** | `yearsExperience`, `happyPatients`, `surgeriesCompleted`, `branches` | Numbers shown on homepage |
| **Education** | `education[]` | Degree, institution, years — shown on About page |
| **Awards** | `awards[]` | Title, organization, year — shown on About page |
| **Memberships** | `memberships[]` | Professional memberships list |
| **Languages** | `languages[]` | Languages spoken |
| **Insurance Providers** | `insuranceProviders[]` | Dropdown on booking page |
| **Time Slots** | `timeSlots[]` | Available appointment times (with toggle) |
| **Why Choose Cards** | `whyChoose[]` | 4 cards on homepage (icon, title, description) |
| **Service Categories** | `serviceCategories[]` | Category tabs on homepage & services page (emoji, name, slug, description) |
| **WhatsApp Float Button** | `whatsappFloatEnabled` | Toggle on/off |

### Content Tabs (separate DB tables, full CRUD)

| Tab | DB Table | What You Can Do |
|-----|----------|-----------------|
| **Services** | `services` | Add/edit/delete procedures with cost, success rate, recovery time, etc. |
| **Blog Posts** | `blog_posts` | Create/edit/delete articles (title, slug, content, category, tags, featured flag) |
| **Case Studies** | `case_studies` | Add patient case studies with pain scores, milestones, outcomes |
| **Testimonials** | `testimonials` | Manage patient reviews (name, condition, rating, text) |

### Read-Only Admin Views

| Tab | What It Shows |
|-----|---------------|
| **Appointments** | All appointment bookings from the booking form (name, phone, date, time, status) |
| **2nd Opinions** | Second opinion submissions with downloadable medical reports |
| **Contact Messages** | Inquiries submitted via contact form |
| **Overview** | ⚠️ **FAKE analytics** — uses mock data (see section 3) |

### Feature Toggles

| Toggle | What It Does |
|--------|-------------|
| **Allow New Sign Ups** | Show/hide sign-up option on admin login page |
| **Language Switcher** | Enable/disable specific languages (EN, HI, TE) |

---

## 3. Mock Data vs Real Data — Full Audit

### ✅ Real Data (from Database)

These are **live** and fully functional:

| Data | Source | Admin Editable? |
|------|--------|----------------|
| All site settings (name, phone, bio, etc.) | `site_config` table (JSONB) | ✅ Yes — Settings tab |
| Services list | `services` table | ✅ Yes — Services tab |
| Blog posts | `blog_posts` table | ✅ Yes — Blog tab |
| Case studies | `case_studies` table | ✅ Yes — Case Studies tab |
| Testimonials | `testimonials` table | ✅ Yes — Testimonials tab |
| Appointments | `appointments` table | View only |
| Contact messages | `contact_messages` table | View only |
| Second opinions + files | `second_opinions` table + storage bucket | View + download |
| Insurance providers | `site_config` JSONB → `insuranceProviders` | ✅ Yes — Settings tab |
| Time slots | `site_config` JSONB → `timeSlots` | ✅ Yes — Settings tab |
| Why Choose cards | `site_config` JSONB → `whyChoose` | ✅ Yes — Settings tab |
| Service categories | `site_config` JSONB → `serviceCategories` | ✅ Yes — Settings tab |
| Signup enabled flag | `app_settings` table | ✅ Yes — Settings tab |

### ⚠️ Mock / Fake Data (NOT from database)

| Data | Location | Impact |
|------|----------|--------|
| **Analytics numbers** (visitors, pageviews, bounce rate) | `src/data/mockData.ts` → `mockAnalytics` | Admin Overview tab shows fake numbers |
| **Unused mock exports** (doctorProfile, services, testimonials, blogPosts, caseStudies, insuranceProviders, timeSlots, serviceCategories) | `src/data/mockData.ts` | **Not used by any page** — legacy leftovers, safe to delete |

### 🔴 Hard-Coded in JSX (requires code change)

| Element | File | What to Change |
|---------|------|----------------|
| Hero badge text "Orthopedic Excellence in Hyderabad" | `src/pages/Index.tsx` | Change string in JSX |
| Hero headline "Move Freely. Live Fully." | `src/pages/Index.tsx` | Change string in JSX |
| Review badge "4.9★ / 500+ Reviews" | `src/pages/Index.tsx` | Change string in JSX |
| CTA section "Ready to Move Without Pain?" | `src/pages/Index.tsx` | Change string in JSX |
| Google Maps embed URL | `src/pages/Contact.tsx` | Replace iframe `src` with your real Google Maps embed URL |
| Condition dropdown options (Second Opinion page) | `src/pages/SecondOpinion.tsx` | Edit `conditionOptions` array |
| Appointment type options (New, Follow Up, etc.) | `src/pages/BookAppointment.tsx` | Edit `<option>` elements |
| Navigation link labels | `src/data/translations.ts` | Edit translation keys |
| Page headings ("Our Services", "Contact Us", etc.) | Various page files | Edit strings in JSX |
| Favicon | `public/favicon.ico` | Replace file |

---

## 4. Pre-Launch Checklist

### Must Do Before Going Live

- [ ] **Sign up & get admin access** (see Section 1)
- [ ] **Update doctor info** in Admin → Settings:
  - Doctor name, credentials, specialization
  - Phone number, WhatsApp, email
  - Clinic address, hours
  - Profile photo URL (upload to any image host, paste URL)
  - Registration number
  - Education, awards, memberships
  - Stats (years of experience, patients, surgeries, branches)
  - Consultation fee
  - Logo initials
- [ ] **Add real services** in Admin → Services tab
- [ ] **Add real testimonials** in Admin → Testimonials tab
- [ ] **Configure time slots** in Admin → Settings
- [ ] **Configure insurance providers** in Admin → Settings
- [ ] **Update Google Maps embed** in `src/pages/Contact.tsx`
- [ ] **Replace favicon** at `public/favicon.ico`
- [ ] **Update hero text** in `src/pages/Index.tsx` (badge, headline, review badge)
- [ ] **Disable sign-ups** after creating your admin account
- [ ] **Test the booking flow** end-to-end (submit → check in Admin → Appointments)
- [ ] **Test second opinion upload** (submit form with file → check in Admin → 2nd Opinions)
- [ ] **Test contact form** (submit → check in Admin → Contact Messages)

### Optional Before Launch

- [ ] Add blog posts in Admin → Blog tab
- [ ] Add case studies in Admin → Case Studies tab
- [ ] Update "Why Choose" cards with your real differentiators
- [ ] Update service categories (emoji, names, descriptions)

---

## 5. Local Development Setup

### Prerequisites

- Node.js 18+ (or Bun)
- Git

### Steps

```bash
# 1. Clone from GitHub
git clone <YOUR_GITHUB_REPO_URL>
cd <PROJECT_FOLDER>

# 2. Install dependencies
npm install
# or: bun install

# 3. Create .env file (copy from Lovable or use these values)
cat > .env << 'EOF'
VITE_SUPABASE_PROJECT_ID="pttlppeqnhaohaavdzsv"
VITE_SUPABASE_PUBLISHABLE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB0dGxwcGVxbmhhb2hhYXZkenN2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE0MDgxODQsImV4cCI6MjA4Njk4NDE4NH0.tJ_fbOsHDuOA5ElnLidwrE87aGgdd1fiWO3m1L2G7Q8"
VITE_SUPABASE_URL="https://pttlppeqnhaohaavdzsv.supabase.co"
EOF

# 4. Start dev server
npm run dev
# Opens at http://localhost:5173
```

### Important Notes for Local Dev

- The `.env` file is **not committed** to Git (it's in `.gitignore`). You must create it manually.
- The backend (database, auth, edge functions, storage) is hosted on Lovable Cloud — your local app connects to the same cloud backend.
- You do NOT need to run Supabase locally. All API calls go to the hosted instance.
- Edge functions are deployed automatically by Lovable Cloud.

### Build for Production

```bash
npm run build
# Output in dist/ folder
```

---

## 6. Vercel Deployment with Custom Domain

### Step 1: Connect GitHub Repo to Vercel

1. Go to [vercel.com](https://vercel.com) → "Add New Project"
2. Import your GitHub repository
3. Framework preset: **Vite**
4. Build command: `npm run build`
5. Output directory: `dist`

### Step 2: Set Environment Variables in Vercel

In Vercel → Project Settings → Environment Variables, add:

| Variable | Value |
|----------|-------|
| `VITE_SUPABASE_PROJECT_ID` | `pttlppeqnhaohaavdzsv` |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB0dGxwcGVxbmhhb2hhYXZkenN2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE0MDgxODQsImV4cCI6MjA4Njk4NDE4NH0.tJ_fbOsHDuOA5ElnLidwrE87aGgdd1fiWO3m1L2G7Q8` |
| `VITE_SUPABASE_URL` | `https://pttlppeqnhaohaavdzsv.supabase.co` |

### Step 3: SPA Routing Fix

Create `vercel.json` in the project root to handle client-side routing:

```json
{
  "rewrites": [
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

Without this, refreshing on `/about` or `/admin` will show a 404.

### Step 4: Custom Domain

1. In Vercel → Project Settings → Domains
2. Add your domain (e.g., `drortho.com`)
3. Update DNS at your registrar:
   - **A record**: `@` → `76.76.21.21`
   - **CNAME**: `www` → `cname.vercel-dns.com`
4. Vercel auto-provisions SSL

### Step 5: Update Auth Redirect URLs

After deploying to your custom domain, update the password reset redirect URL. In `src/pages/AdminLogin.tsx`, the redirect is already dynamic (`window.location.origin`), so it will automatically use your custom domain.

However, you need to add your custom domain to the **allowed redirect URLs** in Lovable Cloud's auth settings. Contact Lovable support or use the auth configuration to add:
- `https://yourdomain.com/reset-password`
- `https://yourdomain.com`

---

## 7. Backend / API Architecture

### Overview

The app is a **client-side React SPA** that connects to a hosted backend (Lovable Cloud, powered by Supabase).

```
┌──────────────────────┐       ┌────────────────────────────────┐
│   React SPA (Vite)   │──────▶│   Lovable Cloud Backend        │
│   - Vercel / local   │       │   ┌─────────────────────────┐  │
│   - Static files     │       │   │  PostgreSQL Database     │  │
│                      │◀──────│   │  (tables, RLS, functions)│  │
│   Uses:              │       │   ├─────────────────────────┤  │
│   @supabase/supabase │       │   │  Auth (JWT sessions)     │  │
│   -js client         │       │   ├─────────────────────────┤  │
│                      │       │   │  Storage (file uploads)  │  │
│                      │       │   ├─────────────────────────┤  │
│                      │       │   │  Edge Functions (Deno)   │  │
│                      │       │   └─────────────────────────┘  │
└──────────────────────┘       └────────────────────────────────┘
```

### API Client

All database/auth/storage calls use the Supabase JS client at:
- `src/integrations/supabase/client.ts` (auto-generated, DO NOT edit)

### Database Tables

See `DEVELOPER_GUIDE.md` for full table list with RLS policies.

### Edge Functions

| Function | Path | Purpose |
|----------|------|---------|
| `assign-admin-role` | `supabase/functions/assign-admin-role/index.ts` | Assigns admin role to `itsrajivv@gmail.com` on signup |

### Storage Buckets

| Bucket | Purpose | Access |
|--------|---------|--------|
| `second-opinion-reports` | Patient medical reports (PDF/images) | Upload: public, Download: admin via signed URLs |

### Auth Flow

1. Email/password authentication via Supabase Auth
2. JWT tokens stored in browser (handled by Supabase client)
3. Admin role checked via `has_role()` database function
4. All admin write operations protected by RLS policies requiring admin role

---

## 8. What Needs to Be Extended for Full Production

### 🔴 Critical — Must Address

| Feature | Current State | What's Needed |
|---------|--------------|---------------|
| **Real Analytics** | Mock numbers in admin overview | Integrate Google Analytics, Plausible, or build custom tracking with a `page_views` table |
| **Email Notifications** | None | Edge functions to send appointment confirmations, second opinion acknowledgements, contact form auto-replies |
| **Google Maps** | Placeholder embed | Replace with real Google Maps embed URL in `Contact.tsx` |
| **Profile Photo** | Empty URL (falls back to placeholder) | Upload doctor's photo and set URL in Admin → Settings |

### 🟡 Recommended

| Feature | What's Needed |
|---------|---------------|
| **SEO Meta Tags** | Add `react-helmet-async` for per-page `<title>` and `<meta description>` |
| **Blog/Service Images** | Add `image_url` column to `blog_posts` and `services` tables; add upload UI in admin |
| **Appointment Status Management** | Add ability for admin to update appointment status (confirmed, completed, cancelled) |
| **Contact Message Read Status** | Add ability for admin to mark messages as read/unread |
| **Sitemap.xml** | Generate a sitemap for SEO (can be static or dynamic) |

### 🟢 Nice-to-Have

| Feature | What's Needed |
|---------|---------------|
| **WhatsApp Business API** | Replace simple `wa.me` links with WhatsApp Business API for automated responses |
| **Appointment Reminders** | Scheduled edge function to send SMS/email reminders |
| **Patient Portal** | Authenticated area for patients to view their appointments and reports |
| **Multi-doctor Support** | Expand schema for multiple doctors with separate profiles |
| **Blog Rich Text Editor** | Replace textarea with a WYSIWYG editor (TipTap, Quill) |
| **Image Upload in Admin** | Storage bucket + upload UI for doctor photo, blog images, service images |

### API Endpoints That Don't Exist Yet (need Edge Functions)

| Endpoint | Purpose |
|----------|---------|
| `send-appointment-confirmation` | Email patient after booking |
| `send-contact-reply` | Auto-acknowledge contact form submissions |
| `send-second-opinion-ack` | Acknowledge second opinion submission |
| `generate-sitemap` | Dynamic sitemap generation |

---

## Quick Reference: File Locations

| What | Where |
|------|-------|
| Site config types & defaults | `src/contexts/SiteConfigContext.tsx` |
| Mock data (mostly unused) | `src/data/mockData.ts` |
| Content source map | `docs/CONTENT_SOURCE_MAP.md` |
| Developer guide | `DEVELOPER_GUIDE.md` |
| This document | `docs/LAUNCH_GUIDE.md` |
| Translations | `src/data/translations.ts` |
| DB types (auto-generated) | `src/integrations/supabase/types.ts` |
| Supabase client (auto-generated) | `src/integrations/supabase/client.ts` |
| Edge functions | `supabase/functions/` |
| Vercel config | `vercel.json` (create before deploying) |
