# 🚀 Launch & Deployment Guide — Dr. Ortho Clinic Website

> **Deployment target:** Self-hosted Supabase + Vercel with custom domain.
> The Lovable Cloud backend will NOT be used in production.

## Table of Contents

1. [Admin Access & First Login](#1-admin-access--first-login)
2. [What You Can Edit from Admin Dashboard](#2-what-you-can-edit-from-admin-dashboard)
3. [Mock Data vs Real Data — Full Audit](#3-mock-data-vs-real-data--full-audit)
4. [Pre-Launch Checklist](#4-pre-launch-checklist)
5. [Setting Up Your Own Supabase Project](#5-setting-up-your-own-supabase-project)
6. [Local Development Setup](#6-local-development-setup)
7. [Vercel Deployment with Custom Domain](#7-vercel-deployment-with-custom-domain)
8. [Backend / API Architecture](#8-backend--api-architecture)
9. [What Needs to Be Extended for Full Production](#9-what-needs-to-be-extended-for-full-production)

---

## 1. Admin Access & First Login

### Your Admin Email: `itsrajivv@gmail.com`

The system uses role-based access control. Only the email above is authorized for admin role assignment (hardcoded in `supabase/functions/assign-admin-role/index.ts`).

### First-Time Setup Steps

1. **Go to** `/admin/login`
2. **Enable sign-ups** (one-time): Toggle "Allow New Sign Ups" in Dashboard → Settings → Feature Toggles. (First time you'll need to insert the `app_settings` row manually — see Section 5.)
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
| **Unused mock exports** (doctorProfile, services, testimonials, blogPosts, caseStudies, etc.) | `src/data/mockData.ts` | **Not used by any page** — legacy leftovers, safe to delete |

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

- [ ] **Set up your own Supabase project** (see Section 5)
- [ ] **Sign up & get admin access** (see Section 1)
- [ ] **Update doctor info** in Admin → Settings:
  - Doctor name, credentials, specialization
  - Phone number, WhatsApp, email
  - Clinic address, hours
  - Profile photo URL (upload to any image host or Supabase Storage, paste URL)
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

## 5. Setting Up Your Own Supabase Project

Since you're using your own Supabase project instead of Lovable Cloud, you need to replicate the database schema, auth config, storage, and edge functions.

### Step 1: Create a Supabase Project

1. Go to [supabase.com/dashboard](https://supabase.com/dashboard)
2. Create a new project
3. Note your **Project URL** and **anon (public) key** from Settings → API

### Step 2: Run Database Migrations

All migrations are in `supabase/migrations/`. Run them in order against your new project.

**Option A — Supabase CLI (recommended):**

```bash
# Install Supabase CLI
npm install -g supabase

# Link to your project
supabase link --project-ref YOUR_PROJECT_REF

# Push all migrations
supabase db push
```

**Option B — Manual SQL:**

Go to Supabase Dashboard → SQL Editor and run each migration file in `supabase/migrations/` in chronological order (files are named with timestamps).

### Step 3: Required Database Objects

After migrations, verify these exist:

**Tables:**
- `app_settings` — feature toggles (signup_enabled)
- `appointments` — booking submissions
- `blog_posts` — blog content
- `case_studies` — patient case studies
- `contact_messages` — contact form submissions
- `second_opinions` — second opinion requests
- `services` — medical procedures
- `site_config` — all site settings (JSONB)
- `testimonials` — patient reviews
- `user_roles` — admin role assignments

**Enum:**
- `app_role` — values: `admin`, `moderator`, `user`

**Functions:**
- `has_role(uuid, app_role)` — SECURITY DEFINER function for RLS
- `update_updated_at_column()` — trigger function for timestamps

**RLS Policies:** All tables have RLS enabled. Public tables allow SELECT for everyone, admin-only tables require `has_role(auth.uid(), 'admin')` for write operations. See `DEVELOPER_GUIDE.md` for the full policy list.

### Step 4: Seed Initial Data

Run these SQL statements in your Supabase SQL Editor:

```sql
-- Seed app_settings (signup toggle)
INSERT INTO app_settings (key, value)
VALUES ('signup_enabled', 'true'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- Seed initial site_config (empty config — defaults come from code)
INSERT INTO site_config (config)
VALUES ('{}'::jsonb);
```

### Step 5: Create Storage Bucket

```sql
-- In SQL Editor:
INSERT INTO storage.buckets (id, name, public)
VALUES ('second-opinion-reports', 'second-opinion-reports', false);
```

Then create the storage RLS policies for file uploads (see migration files for exact policies).

### Step 6: Deploy Edge Functions

```bash
# From project root
supabase functions deploy assign-admin-role --project-ref YOUR_PROJECT_REF
```

The edge function needs these secrets set in your Supabase project:
- `SUPABASE_URL` — auto-set by Supabase
- `SUPABASE_SERVICE_ROLE_KEY` — auto-set by Supabase

### Step 7: Configure Auth

In Supabase Dashboard → Authentication → URL Configuration:
- **Site URL**: `https://yourdomain.com` (or `http://localhost:5173` for dev)
- **Redirect URLs**: Add:
  - `http://localhost:5173`
  - `http://localhost:5173/reset-password`
  - `https://yourdomain.com`
  - `https://yourdomain.com/reset-password`

In Authentication → Email Templates:
- Customize the password reset email template if desired

### Step 8: Update .env

Create `.env` in the project root with YOUR Supabase credentials:

```env
VITE_SUPABASE_PROJECT_ID="YOUR_PROJECT_REF"
VITE_SUPABASE_PUBLISHABLE_KEY="YOUR_ANON_KEY"
VITE_SUPABASE_URL="https://YOUR_PROJECT_REF.supabase.co"
```

### Step 9: Update the Supabase Client

The file `src/integrations/supabase/client.ts` reads from env vars (`VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`), so it will automatically connect to whichever Supabase project you configure in `.env`. **No code change needed** — just update the `.env` file.

### Step 10: Regenerate TypeScript Types (Optional)

If you modify the schema, regenerate types:

```bash
supabase gen types typescript --project-id YOUR_PROJECT_REF > src/integrations/supabase/types.ts
```

---

## 6. Local Development Setup

### Prerequisites

- Node.js 18+ (or Bun)
- Git
- Supabase CLI (for edge function deployment)

### Steps

```bash
# 1. Clone from GitHub
git clone <YOUR_GITHUB_REPO_URL>
cd <PROJECT_FOLDER>

# 2. Install dependencies
npm install
# or: bun install

# 3. Create .env file with YOUR Supabase credentials
cat > .env << 'EOF'
VITE_SUPABASE_PROJECT_ID="YOUR_PROJECT_REF"
VITE_SUPABASE_PUBLISHABLE_KEY="YOUR_ANON_KEY"
VITE_SUPABASE_URL="https://YOUR_PROJECT_REF.supabase.co"
EOF

# 4. Start dev server
npm run dev
# Opens at http://localhost:5173
```

### Important Notes for Local Dev

- The `.env` file is **not committed** to Git (it's in `.gitignore`). You must create it manually.
- The backend (database, auth, edge functions, storage) is hosted on **your Supabase project** — the local app connects to it remotely.
- You do NOT need to run Supabase locally unless you want to (optional: `supabase start` for local dev).
- Edge functions must be deployed to your Supabase project via `supabase functions deploy`.

### Build for Production

```bash
npm run build
# Output in dist/ folder
```

---

## 7. Vercel Deployment with Custom Domain

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
| `VITE_SUPABASE_PROJECT_ID` | Your Supabase project ref |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Your Supabase anon key |
| `VITE_SUPABASE_URL` | `https://YOUR_PROJECT_REF.supabase.co` |

### Step 3: SPA Routing Fix

The `vercel.json` file is already created in the project root:

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

### Step 5: Update Supabase Auth Redirect URLs

After deploying to your custom domain, go to Supabase Dashboard → Authentication → URL Configuration and add:
- **Site URL**: `https://yourdomain.com`
- **Redirect URLs**:
  - `https://yourdomain.com`
  - `https://yourdomain.com/reset-password`

The code already uses `window.location.origin` for redirects, so it adapts automatically.

---

## 8. Backend / API Architecture

### Overview

The app is a **client-side React SPA** that connects to your self-hosted **Supabase** backend.

```
┌──────────────────────┐       ┌────────────────────────────────┐
│   React SPA (Vite)   │──────▶│   Your Supabase Project        │
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
- `src/integrations/supabase/client.ts` — reads `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` from env

### Database Tables

| Table | Purpose | Public Read? | Admin Write? |
|-------|---------|-------------|-------------|
| `site_config` | All site settings (JSONB) | ✅ | ✅ |
| `services` | Medical procedures | ✅ | ✅ CRUD |
| `blog_posts` | Blog articles | ✅ | ✅ CRUD |
| `case_studies` | Patient case studies | ✅ | ✅ CRUD |
| `testimonials` | Patient reviews | ✅ | ✅ CRUD |
| `appointments` | Booking submissions | ❌ | ✅ Read |
| `contact_messages` | Contact form | ❌ | ✅ Read |
| `second_opinions` | 2nd opinion requests | ❌ | ✅ Read + Update |
| `app_settings` | Feature toggles | ✅ | ✅ |
| `user_roles` | Admin role assignments | Own only | ❌ |

See `DEVELOPER_GUIDE.md` for full RLS policy details.

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
3. Admin role checked via `has_role()` database function (SECURITY DEFINER)
4. All admin write operations protected by RLS policies requiring admin role

### Key Database Functions

| Function | Type | Purpose |
|----------|------|---------|
| `has_role(_user_id uuid, _role app_role)` | SECURITY DEFINER | Checks if user has a role — used in ALL admin RLS policies |
| `update_updated_at_column()` | Trigger function | Auto-updates `updated_at` on row changes |

---

## 9. What Needs to Be Extended for Full Production

### 🔴 Critical — Must Address

| Feature | Current State | What's Needed |
|---------|--------------|---------------|
| **Real Analytics** | Mock numbers in admin overview | Integrate Google Analytics, Plausible, or build custom tracking with a `page_views` table |
| **Email Notifications** | None | Edge functions to send appointment confirmations, second opinion acknowledgements, contact form auto-replies |
| **Google Maps** | Placeholder embed | Replace with real Google Maps embed URL in `Contact.tsx` |
| **Profile Photo** | Empty URL (falls back to placeholder) | Upload doctor's photo to Supabase Storage or any CDN, set URL in Admin → Settings |

### 🟡 Recommended

| Feature | What's Needed |
|---------|---------------|
| **SEO Meta Tags** | Add `react-helmet-async` for per-page `<title>` and `<meta description>` |
| **Blog/Service Images** | Add `image_url` column to `blog_posts` and `services` tables; add upload UI in admin |
| **Appointment Status Management** | Add ability for admin to update appointment status (confirmed, completed, cancelled) — needs UPDATE RLS policy on `appointments` |
| **Contact Message Read Status** | Add ability for admin to mark messages as read/unread — needs UPDATE RLS policy on `contact_messages` |
| **Sitemap.xml** | Generate a sitemap for SEO (can be static or dynamic) |

### 🟢 Nice-to-Have

| Feature | What's Needed |
|---------|---------------|
| **WhatsApp Business API** | Replace simple `wa.me` links with WhatsApp Business API for automated responses |
| **Appointment Reminders** | Scheduled edge function (or cron) to send SMS/email reminders |
| **Patient Portal** | Authenticated area for patients to view their appointments and reports |
| **Multi-doctor Support** | Expand schema for multiple doctors with separate profiles |
| **Blog Rich Text Editor** | Replace textarea with a WYSIWYG editor (TipTap, Quill) |
| **Image Upload in Admin** | Storage bucket + upload UI for doctor photo, blog images, service images |

### Edge Functions That Don't Exist Yet

| Function | Purpose | Notes |
|----------|---------|-------|
| `send-appointment-confirmation` | Email patient after booking | Use Supabase with Resend, SendGrid, or Mailgun |
| `send-contact-reply` | Auto-acknowledge contact form | Same email provider |
| `send-second-opinion-ack` | Acknowledge second opinion submission | Same email provider |
| `generate-sitemap` | Dynamic sitemap generation | Or use a static `public/sitemap.xml` |

---

## Quick Reference: File Locations

| What | Where |
|------|-------|
| Supabase client (reads from env) | `src/integrations/supabase/client.ts` |
| DB TypeScript types | `src/integrations/supabase/types.ts` |
| Site config types & defaults | `src/contexts/SiteConfigContext.tsx` |
| Mock data (mostly unused) | `src/data/mockData.ts` |
| Content source map | `docs/CONTENT_SOURCE_MAP.md` |
| Developer guide | `DEVELOPER_GUIDE.md` |
| This document | `docs/LAUNCH_GUIDE.md` |
| Translations | `src/data/translations.ts` |
| Edge functions | `supabase/functions/` |
| DB migrations | `supabase/migrations/` |
| Vercel config (SPA routing) | `vercel.json` |
| Environment variables template | `.env` (not committed) |

---

## Migrating Away from Lovable Cloud — Summary

The app currently points to a Lovable-managed Supabase instance. To switch to your own:

1. **Create your Supabase project** at supabase.com
2. **Run all migrations** from `supabase/migrations/` (use `supabase db push`)
3. **Deploy edge functions** (use `supabase functions deploy`)
4. **Create storage bucket** (`second-opinion-reports`)
5. **Seed initial data** (`app_settings`, `site_config`)
6. **Update `.env`** with your project's URL and anon key
7. **Update Vercel env vars** to match
8. **Configure auth redirect URLs** in Supabase Dashboard
9. **Sign up as admin** and verify the flow works

The frontend code needs **zero changes** — it reads Supabase credentials from env vars.
