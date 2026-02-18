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

## Data Flow

### Current State: Everything is Client-Side Mock Data

**There is NO backend.** All data lives in two places:

1. **`src/data/mockData.ts`** — Static content (services, blog posts, case studies, testimonials, analytics, time slots, insurance providers)
2. **`localStorage`** — Dynamic config (site settings, admin auth token, language preference)

### Data Sources Per Page

| Page | Data Source | What It Shows |
|---|---|---|
| **Index** | `mockData.services`, `mockData.serviceCategories`, `mockData.testimonials`, `SiteConfigContext` | Hero with dynamic doctor name/bio, stats from config, service cards, testimonials |
| **About** | `mockData.doctorProfile`, `SiteConfigContext` | Education, awards, memberships, philosophy from config |
| **Services** | `mockData.services`, `mockData.serviceCategories` | Filterable grid with cost, success rate, procedure time |
| **BookAppointment** | `mockData.services`, `mockData.insuranceProviders`, `mockData.timeSlots` | Form with service dropdown, time slot picker, insurance selector |
| **Contact** | `SiteConfigContext` | Phone, email, location, hours from config; form submits to nowhere |
| **Blog** | `mockData.blogPosts` | Featured/non-featured split, links to `/blog/:slug` |
| **BlogPost** | `mockData.blogPosts` (find by slug) | Full HTML content, tags, related posts |
| **CaseStudies** | `mockData.caseStudies` | Pain score comparisons, surgery type badges |
| **CaseStudyDetail** | `mockData.caseStudies` (find by slug) | Pain/ROM before/after, recovery milestones, testimonial |
| **SecondOpinion** | `LanguageContext` translations | Form with file picker (files stored in React state only, never uploaded) |
| **AdminDashboard** | `mockData.mockAnalytics`, `SiteConfigContext`, `LanguageContext` | Mock stats, appointments table, config editor |

---

## What Needs Backend Integration to Be Fully Functional

### 🔴 Critical — Forms Submit to Nowhere

| Feature | Current Behavior | What's Needed |
|---|---|---|
| **Book Appointment** (`/book`) | `setTimeout` → shows success UI | API endpoint to receive appointment data, send confirmation email/WhatsApp, store in DB |
| **Contact Form** (`/contact`) | `setTimeout` → shows "Message Sent" | Email sending service (SendGrid, Resend, etc.) or store in DB |
| **Second Opinion** (`/second-opinion`) | Files stored in React state, form `setSubmitted(true)` | File upload to storage (S3/Supabase Storage), store case in DB, notify doctor |

### 🔴 Critical — Hardcoded Admin Auth

| File | Issue | Fix |
|---|---|---|
| `SiteConfigContext.tsx` L57-58 | `ADMIN_EMAIL = "itsrahgiv@gmail.com"`, `ADMIN_PASSWORD = "admin123"` hardcoded | Replace with proper auth (Supabase Auth, Firebase, etc.) |
| `SiteConfigContext.tsx` L69 | Auth token is just `localStorage.getItem("adminToken") === "authenticated"` | Use JWT/session-based auth |

### 🟡 Medium — Static Content Should Be Database-Driven

| Data | File | Current | To Make Dynamic |
|---|---|---|---|
| Blog Posts | `mockData.ts` L118-208 | 4 hardcoded posts with HTML content | CMS or DB table with CRUD in admin |
| Case Studies | `mockData.ts` L210-301 | 3 hardcoded cases | DB table with admin CRUD |
| Services | `mockData.ts` L40-77 | 6 hardcoded services | DB table with admin CRUD |
| Testimonials | `mockData.ts` L79-95 | 3 hardcoded testimonials | DB table with admin CRUD |
| Doctor Profile | `mockData.ts` L1-31 | Hardcoded education/awards | DB or extend SiteConfig |
| Analytics | `mockData.ts` L303-344 | Completely fake numbers | Real analytics (Google Analytics, Plausible, or custom) |
| Time Slots | `mockData.ts` L105-116 | Static availability | Dynamic availability from booking calendar |

### 🟡 Medium — Missing Admin CRUD

The admin dashboard currently **only reads** mock data. To manage content you need:

- **Blog Management**: Create/Edit/Delete blog posts (currently just lists them)
- **Case Study Management**: Create/Edit/Delete case studies
- **Service Management**: Create/Edit/Delete services
- **Appointment Management**: View/confirm/cancel appointments (currently shows mock table)
- **Testimonial Management**: Add/edit/remove patient testimonials

### 🟢 Nice-to-Have

| Feature | Notes |
|---|---|
| **SEO meta tags** | Currently missing per-page `<title>` and `<meta>` tags (add react-helmet-async) |
| **Google Maps embed** | Contact page has a placeholder iframe with generic coordinates — update `src` with real embed URL |
| **Real WhatsApp number** | Default is `+919876543210` — update in admin settings or SiteConfigContext defaults |
| **Image uploads** | Hero image URL in config, but no upload mechanism — need file storage |
| **Email notifications** | Appointment confirmations, second opinion acknowledgements |

---

## Contexts (Global State)

### SiteConfigContext (`src/contexts/SiteConfigContext.tsx`)

Manages all site-wide configuration. Persisted to `localStorage`.

```typescript
interface SiteConfig {
  doctorName: string;         // "Dr. Ortho"
  clinicName: string;         // "Ortho Clinic"
  title: string;              // "MS Ortho, DNB..."
  specialization: string;
  shortBio: string;           // Used in hero
  fullBio: string;            // Used in About page
  philosophy: string;         // Used in About page
  yearsExperience: number;    // Stats on homepage
  happyPatients: number;
  surgeriesCompleted: number;
  branches: number;
  consultationFee: number;
  phone: string;
  whatsapp: string;
  email: string;
  location: string;
  hours: string;
  logoInitials: string;       // 2-3 char shown in nav logo
  heroImageUrl: string;       // Override default hero image
  whatsappFloatEnabled: boolean; // Toggle floating WhatsApp button
}
```

**Also provides:**
- `adminLogin(email, password)` → returns boolean
- `adminLogout()`
- `isAdmin` → boolean

### LanguageContext (`src/contexts/LanguageContext.tsx`)

Manages i18n. Supports `"en" | "hi" | "te"`.

- `language` — current language
- `setLanguage(lang)` — switch language
- `t(key)` — get translated string
- `enabledLanguages` — which languages are available (configurable in admin)
- `setEnabledLanguages(langs[])` — admin can enable/disable languages

**Translations** are in `src/data/translations.ts`. Currently only nav, footer, and second opinion page are translated. Other pages use hardcoded English.

---

## Design System

### Colors (defined in `src/index.css` as HSL CSS variables)

All components use semantic tokens: `bg-primary`, `text-foreground`, `bg-accent`, etc.

Key custom colors beyond shadcn defaults:
- `--accent` — Gold/CTA color used for buttons
- Custom utility classes: `bg-hero-gradient`, `text-gradient-gold`, `bg-teal-light`, `bg-gold-light`

### Fonts

- Display font: `font-display` (Playfair Display)
- Body font: `font-body` (Inter)

Both loaded via Google Fonts in `index.html`.

---

## Step-by-Step: Making This Fully Functional

### Option A: Add Supabase/Lovable Cloud Backend

1. **Enable Lovable Cloud** (or connect external Supabase)
2. **Create tables**: `appointments`, `contact_messages`, `second_opinions`, `blog_posts`, `case_studies`, `services`, `testimonials`
3. **Set up Supabase Auth** for admin login
4. **Create edge functions** for email notifications
5. **Set up Storage bucket** for second opinion file uploads
6. **Replace mockData imports** with `useQuery()` hooks fetching from Supabase
7. **Add CRUD mutations** in admin dashboard

### Option B: Use External APIs

1. **Forms**: Send to Google Sheets, Airtable, or a custom REST API
2. **Auth**: Firebase Auth, Auth0, or Clerk
3. **CMS**: Contentful, Sanity, or Strapi for blog/case studies
4. **File uploads**: Cloudinary, AWS S3
5. **Email**: SendGrid, Resend, Mailgun

### Database Schema Suggestion

```sql
-- Appointments
CREATE TABLE appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  appointment_type TEXT NOT NULL, -- new, follow_up, post_op, emergency, consultation
  service_id TEXT,
  preferred_date DATE NOT NULL,
  preferred_time TEXT NOT NULL,
  symptoms TEXT NOT NULL,
  insurance_provider TEXT,
  emi_interest BOOLEAN DEFAULT FALSE,
  status TEXT DEFAULT 'pending', -- pending, confirmed, cancelled, completed
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Contact Messages
CREATE TABLE contact_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  subject TEXT NOT NULL,
  message TEXT NOT NULL,
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Second Opinions
CREATE TABLE second_opinions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  age INTEGER NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  condition TEXT NOT NULL,
  current_diagnosis TEXT NOT NULL,
  additional_notes TEXT,
  status TEXT DEFAULT 'pending', -- pending, reviewed, responded
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Second Opinion Files (linked to second_opinions)
CREATE TABLE second_opinion_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  second_opinion_id UUID REFERENCES second_opinions(id),
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL, -- Supabase Storage path
  file_type TEXT,
  uploaded_at TIMESTAMPTZ DEFAULT NOW()
);

-- Blog Posts (replace mockData)
CREATE TABLE blog_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  excerpt TEXT,
  content TEXT NOT NULL, -- HTML
  category TEXT,
  tags TEXT[], -- array
  read_time INTEGER,
  views_count INTEGER DEFAULT 0,
  likes_count INTEGER DEFAULT 0,
  is_featured BOOLEAN DEFAULT FALSE,
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Case Studies (replace mockData)
CREATE TABLE case_studies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  patient_initials TEXT,
  age INTEGER,
  gender TEXT,
  occupation TEXT,
  condition TEXT NOT NULL,
  procedure_name TEXT,
  surgery_date DATE,
  surgery_type TEXT,
  hospital_stay_days INTEGER,
  follow_up_period TEXT,
  outcome_summary TEXT,
  pain_score_pre INTEGER,
  pain_score_post INTEGER,
  range_of_motion_pre TEXT,
  range_of_motion_post TEXT,
  testimonial TEXT,
  return_to_work TEXT,
  return_to_sports TEXT,
  is_featured BOOLEAN DEFAULT FALSE,
  milestones JSONB, -- [{day, title, description}]
  published_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Services (replace mockData)
CREATE TABLE services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  category TEXT,
  body_part TEXT,
  short_description TEXT,
  cost_range TEXT,
  success_rate TEXT,
  patients_treated INTEGER DEFAULT 0,
  emi_available BOOLEAN DEFAULT TRUE,
  insurance_covered BOOLEAN DEFAULT TRUE,
  procedure_time TEXT,
  hospital_stay TEXT,
  recovery_time TEXT,
  full_recovery TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## Key Files Reference

| File | Purpose | Lines |
|---|---|---|
| `src/App.tsx` | All routes + provider wrappers | 57 |
| `src/contexts/SiteConfigContext.tsx` | Site config + admin auth | 105 |
| `src/contexts/LanguageContext.tsx` | i18n provider | 59 |
| `src/data/mockData.ts` | ALL content data | ~344 |
| `src/data/translations.ts` | i18n strings (en/hi/te) | 150 |
| `src/components/Layout.tsx` | Global shell (nav + footer) | 218 |
| `src/components/WhatsAppFloat.tsx` | Floating WhatsApp CTA | 20 |
| `src/pages/AdminDashboard.tsx` | Admin panel (4 tabs) | 418 |
| `src/pages/Index.tsx` | Landing page | 200 |
| `src/index.css` | Design tokens + Tailwind config | - |
| `tailwind.config.ts` | Extended theme (fonts, colors) | - |

---

## Environment Variables

Currently **none required**. The app is 100% client-side. When adding a backend, you'll need:

- `VITE_SUPABASE_URL` — Supabase project URL
- `VITE_SUPABASE_ANON_KEY` — Supabase anonymous key

---

## Summary: What Works vs What's Mock

| Feature | Status | Notes |
|---|---|---|
| ✅ All page navigation | Works | React Router |
| ✅ Responsive design | Works | Mobile + desktop |
| ✅ Language switching | Works | en/hi/te for nav, footer, second opinion |
| ✅ Admin config editing | Works | Saves to localStorage |
| ✅ WhatsApp toggle | Works | Admin can enable/disable |
| ✅ Service category filter | Works | Client-side filter |
| ✅ Blog post reading | Works | Static HTML content |
| ✅ Case study details | Works | Pain scores, milestones |
| ⚠️ Appointment booking | Mock | Form shows success but doesn't persist |
| ⚠️ Contact form | Mock | Shows "sent" but goes nowhere |
| ⚠️ Second opinion upload | Mock | Files in React state only, never uploaded |
| ⚠️ Admin auth | Mock | Hardcoded credentials, localStorage token |
| ⚠️ Analytics dashboard | Mock | Fake numbers from mockData |
| ❌ Blog CRUD | Missing | Admin can't create/edit posts |
| ❌ Case study CRUD | Missing | Admin can't create/edit cases |
| ❌ Service CRUD | Missing | Admin can't create/edit services |
| ❌ Email notifications | Missing | No email service connected |
| ❌ File storage | Missing | No cloud storage for uploads |
| ❌ Real analytics | Missing | No tracking integration |
