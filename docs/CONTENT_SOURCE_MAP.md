# Content Source Map

Every field, image, and section across the site, classified by data source.

**Legend:**
- 🟢 **DB** — Stored in database, editable via Admin Dashboard
- 🟡 **Mock** — Hard-coded in `src/data/mockData.ts`
- 🔴 **Hard-coded** — Inline in component JSX (requires code change to update)
- ⚙️ **Config (DB)** — Stored in `site_config` table JSONB, editable via Admin > Settings

---

## Global (Layout — Header, Footer, Top Bar)

| Element | Source | Location |
|---------|--------|----------|
| Doctor name | ⚙️ Config (DB) | `config.doctorName` |
| Clinic name | ⚙️ Config (DB) | `config.clinicName` |
| Logo initials | ⚙️ Config (DB) | `config.logoInitials` |
| Phone number | ⚙️ Config (DB) | `config.phone` |
| Email | ⚙️ Config (DB) | `config.email` |
| Location (address) | ⚙️ Config (DB) | `config.location` |
| Clinic hours | ⚙️ Config (DB) | `config.hours` |
| Nav link labels | 🔴 Hard-coded | `translations.ts` (i18n keys) |
| Footer tagline | 🔴 Hard-coded | `translations.ts` |
| WhatsApp float button | ⚙️ Config (DB) | `config.whatsappFloatEnabled`, `config.whatsapp` |
| Language switcher options | 🔴 Hard-coded | `translations.ts` + `LanguageContext` |

---

## Home Page (`/`)

| Element | Source | Location |
|---------|--------|----------|
| Hero badge text | 🔴 Hard-coded | `"Orthopedic Excellence in Hyderabad"` in `Index.tsx` |
| Hero headline | 🔴 Hard-coded | `"Move Freely. Live Fully."` in `Index.tsx` |
| Hero description | ⚙️ Config (DB) | `config.shortBio` |
| Hero image | ⚙️ Config (DB) | `config.heroImageUrl` (falls back to `hero-doctor.jpg` asset) |
| Hero review badge ("4.9★ / 500+ Reviews") | 🔴 Hard-coded | Inline in `Index.tsx` |
| Stats (Years, Patients, Surgeries, Branches) | ⚙️ Config (DB) | `config.yearsExperience`, `config.happyPatients`, `config.surgeriesCompleted`, `config.branches` |
| Service category cards (4 cards) | 🟡 Mock | `serviceCategories` from `mockData.ts` |
| Featured procedures (top 3) | 🟢 DB | `useServices()` → `services` table |
| "Why Choose" section (4 items) | 🔴 Hard-coded | `whyChoose` array in `Index.tsx` |
| Testimonials | 🟢 DB | `useTestimonials()` → `testimonials` table |
| CTA section text | 🔴 Hard-coded | `"Ready to Move Without Pain?"` in `Index.tsx` |
| CTA doctor name | ⚙️ Config (DB) | `config.doctorName` |
| CTA WhatsApp link | ⚙️ Config (DB) | `config.whatsapp` |

---

## About Page (`/about`)

| Element | Source | Location |
|---------|--------|----------|
| Doctor name | ⚙️ Config (DB) | `config.doctorName` |
| Title / credentials | ⚙️ Config (DB) | `config.title` |
| Full bio | ⚙️ Config (DB) | `config.fullBio` |
| Photo | ⚙️ Config (DB) | `config.heroImageUrl` (falls back to `hero-doctor.jpg`) |
| Philosophy quote | ⚙️ Config (DB) | `config.philosophy` |
| Education entries | ⚙️ Config (DB) | `config.education[]` (degree, institution, years) |
| Awards | ⚙️ Config (DB) | `config.awards[]` (title, organization, year) |
| Professional memberships | ⚙️ Config (DB) | `config.memberships[]` |
| Section headings ("Education & Training", etc.) | 🔴 Hard-coded | Inline in `About.tsx` |

---

## Services Page (`/services`)

| Element | Source | Location |
|---------|--------|----------|
| Page heading & subtitle | 🔴 Hard-coded | `"Our Services"`, `"Comprehensive orthopedic treatments..."` in `Services.tsx` |
| Category filter tabs | 🟡 Mock | `serviceCategories` from `mockData.ts` |
| Service cards (name, description, stats) | 🟢 DB | `useServices()` → `services` table |

---

## Book Appointment Page (`/book`)

| Element | Source | Location |
|---------|--------|----------|
| Page heading | 🔴 Hard-coded | `"Book Appointment"` in `BookAppointment.tsx` |
| Appointment type options | 🔴 Hard-coded | `<option>` elements in `BookAppointment.tsx` (New, Follow Up, Post-Op, Emergency, Consultation) |
| Service dropdown | 🟢 DB | `useServices()` → `services` table |
| Time slot options | ⚙️ Config (DB) | `config.timeSlots` in `site_config` JSONB |
| Insurance provider dropdown | ⚙️ Config (DB) | `config.insuranceProviders` in `site_config` JSONB |
| Success message WhatsApp link | ⚙️ Config (DB) | `config.whatsapp` |
| Success message phone number | ⚙️ Config (DB) | `config.phone` |
| Form submission | 🟢 DB | Inserts to `appointments` table |

---

## Contact Page (`/contact`)

| Element | Source | Location |
|---------|--------|----------|
| Page heading | 🔴 Hard-coded | `"Contact Us"` in `Contact.tsx` |
| Location, Phone, Email, Hours | ⚙️ Config (DB) | `config.location`, `config.phone`, `config.email`, `config.hours` |
| WhatsApp link | ⚙️ Config (DB) | `config.whatsapp` |
| Google Maps embed URL | 🔴 Hard-coded | Placeholder coordinates in `Contact.tsx` iframe |
| Form submission | 🟢 DB | Inserts to `contact_messages` table |

---

## Blog Pages (`/blog`, `/blog/:slug`)

| Element | Source | Location |
|---------|--------|----------|
| Page heading | 🔴 Hard-coded | `"Blog"` / `"Health Blog"` |
| Blog post list | 🟢 DB | `useBlogPosts()` → `blog_posts` table |
| Individual blog post content | 🟢 DB | `useBlogPost(slug)` → `blog_posts` table |

---

## Case Studies (`/case-studies`, `/case-studies/:slug`)

| Element | Source | Location |
|---------|--------|----------|
| Page heading | 🔴 Hard-coded | Section headings in component |
| Case study list | 🟢 DB | `useCaseStudies()` → `case_studies` table |
| Individual case study | 🟢 DB | `useCaseStudy(slug)` → `case_studies` table |

---

## Second Opinion Page (`/second-opinion`)

| Element | Source | Location |
|---------|--------|----------|
| Page heading & description | 🔴 Hard-coded | Inline in `SecondOpinion.tsx` |
| Condition dropdown options | 🔴 Hard-coded | `conditionOptions` array in `SecondOpinion.tsx` |
| Doctor name references | ⚙️ Config (DB) | `config.doctorName` |
| WhatsApp / Phone links | ⚙️ Config (DB) | `config.whatsapp`, `config.phone` |
| Form submission | 🟢 DB | Inserts to `second_opinions` table |
| File uploads | 🟢 DB | `second-opinion-reports` storage bucket |

---

## Admin Dashboard (`/admin`)

| Element | Source | Location |
|---------|--------|----------|
| Overview analytics | 🟡 Mock | `mockAnalytics` from `mockData.ts` |
| Appointments list | 🟢 DB | `appointments` table |
| Blog Posts CRUD | 🟢 DB | `blog_posts` table |
| Case Studies CRUD | 🟢 DB | `case_studies` table |
| Services CRUD | 🟢 DB | `services` table |
| Testimonials CRUD | 🟢 DB | `testimonials` table |
| Second Opinions list | 🟢 DB | `second_opinions` table + storage signed URLs |
| Contact Messages | 🟢 DB | `contact_messages` table |
| Site Settings (all fields) | ⚙️ Config (DB) | `site_config` table JSONB |
| Signup toggle | 🟢 DB | `app_settings` table (`signup_enabled` key) |

---

## Images

| Image | Source | Location |
|-------|--------|----------|
| Hero / About doctor photo | ⚙️ Config (DB) with asset fallback | `config.heroImageUrl` → falls back to `src/assets/hero-doctor.jpg` |
| Service category icons | 🟡 Mock | Emoji strings in `serviceCategories` from `mockData.ts` |
| Favicon | 🔴 Hard-coded | `public/favicon.ico` |
| Placeholder image | 🔴 Hard-coded | `public/placeholder.svg` |
| Blog/service images | ❌ Not implemented | No image column or upload in blog_posts/services tables |

---

## Summary: What to Change Where

| To change… | Go to… |
|------------|--------|
| Doctor name, phone, email, hours, bio, education, awards | Admin Dashboard → Settings |
| Stats (years, patients, surgeries, branches) | Admin Dashboard → Settings |
| Hero image | Admin Dashboard → Settings (`heroImageUrl`) |
| WhatsApp number | Admin Dashboard → Settings |
| Services list | Admin Dashboard → Services tab |
| Blog posts | Admin Dashboard → Blog Posts tab |
| Testimonials | Admin Dashboard → Testimonials tab |
| Case studies | Admin Dashboard → Case Studies tab |
| "Why Choose" cards | Edit `whyChoose` in `src/pages/Index.tsx` |
| Service category cards | Edit `serviceCategories` in `src/data/mockData.ts` |
| Appointment type options | Edit `<option>` in `src/pages/BookAppointment.tsx` |
| Time slots | Edit `timeSlots` in `src/data/mockData.ts` |
| Insurance providers | Edit `insuranceProviders` in `src/data/mockData.ts` |
| Condition dropdown (2nd opinion) | Edit `conditionOptions` in `src/pages/SecondOpinion.tsx` |
| Google Maps embed | Edit iframe `src` in `src/pages/Contact.tsx` |
| Review badge ("4.9★ / 500+ Reviews") | Edit inline in `src/pages/Index.tsx` |
| Hard-coded phone in BookAppointment | Edit `BookAppointment.tsx` lines 68 & 201 |
| Translations / nav labels | Edit `src/data/translations.ts` |
