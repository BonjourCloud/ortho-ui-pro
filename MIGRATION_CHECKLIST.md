# 🚀 Migration Checklist — Lovable to Your Own Supabase + Vercel

**Goal:** Switch from Lovable's Supabase to your own project and deploy to Vercel with custom domain.

---

## ✅ Phase 1: Create Your Supabase Project (15 minutes)

### 1.1 Create New Supabase Project
- [ ] Go to https://supabase.com/dashboard
- [ ] Click "New Project"
- [ ] Choose organization (or create one)
- [ ] Project name: `ortho-ui-pro` (or your choice)
- [ ] Database password: **Save this securely!**
- [ ] Region: Choose closest to your users (e.g., Mumbai for India)
- [ ] Click "Create new project"
- [ ] Wait 2-3 minutes for provisioning

### 1.2 Get Your Credentials
- [ ] Go to Project Settings → API
- [ ] Copy **Project URL** (looks like: `https://xxxxx.supabase.co`)
- [ ] Copy **Project Reference ID** (the `xxxxx` part)
- [ ] Copy **anon/public key** (starts with `eyJhbGc...`)
- [ ] Keep these handy for next steps

---

## ✅ Phase 2: Install Supabase CLI (5 minutes)

### 2.1 Install CLI
```bash
# Using npm
npm install -g supabase

# Verify installation
supabase --version
```

### 2.2 Login to Supabase
```bash
supabase login
```
This will open a browser window to authenticate.

### 2.3 Link Your Project
```bash
# From your project root directory
supabase link --project-ref YOUR_PROJECT_REF
```
Replace `YOUR_PROJECT_REF` with the reference ID from step 1.2.

---

## ✅ Phase 3: Migrate Database Schema (10 minutes)

### 3.1 Push All Migrations
```bash
# This runs all migration files in supabase/migrations/
supabase db push
```

**Expected output:** You should see 8 migrations applied successfully.

### 3.2 Verify Tables Created
- [ ] Go to Supabase Dashboard → Table Editor
- [ ] Verify these tables exist:
  - `app_settings`
  - `appointments`
  - `blog_posts`
  - `case_studies`
  - `contact_messages`
  - `second_opinions`
  - `services`
  - `site_config`
  - `testimonials`
  - `user_roles`

### 3.3 Seed Initial Data
Go to Supabase Dashboard → SQL Editor and run:

```sql
-- Seed app_settings (signup toggle)
INSERT INTO app_settings (key, value)
VALUES ('signup_enabled', 'true'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- Seed initial site_config (empty config — defaults come from code)
INSERT INTO site_config (config)
VALUES ('{}'::jsonb);
```

---

## ✅ Phase 4: Set Up Storage (5 minutes)

### 4.1 Create Storage Bucket
Go to Supabase Dashboard → Storage → Create bucket:
- [ ] Bucket name: `second-opinion-reports`
- [ ] Public bucket: **No** (keep private)
- [ ] Click "Create bucket"

### 4.2 Set Storage Policies
Go to SQL Editor and run:

```sql
-- Allow authenticated users to upload files
CREATE POLICY "Allow authenticated uploads"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'second-opinion-reports');

-- Allow admin to read all files
CREATE POLICY "Allow admin to read files"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'second-opinion-reports' 
  AND EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() 
    AND role = 'admin'
  )
);
```

---

## ✅ Phase 5: Deploy Edge Functions (5 minutes)

### 5.1 Deploy Admin Role Assignment Function
```bash
supabase functions deploy assign-admin-role --project-ref YOUR_PROJECT_REF
```

### 5.2 Verify Deployment
- [ ] Go to Supabase Dashboard → Edge Functions
- [ ] Verify `assign-admin-role` is listed and deployed

---

## ✅ Phase 6: Configure Authentication (5 minutes)

### 6.1 Set Auth URLs
Go to Supabase Dashboard → Authentication → URL Configuration:

**Site URL:**
```
http://localhost:5173
```
(We'll update this after Vercel deployment)

**Redirect URLs:** Add these (one per line):
```
http://localhost:5173
http://localhost:5173/reset-password
http://localhost:5173/admin
```

### 6.2 Enable Email Auth
- [ ] Go to Authentication → Providers
- [ ] Verify "Email" is enabled
- [ ] Disable any other providers you don't need

### 6.3 Configure Email Templates (Optional)
- [ ] Go to Authentication → Email Templates
- [ ] Customize "Confirm signup" and "Reset password" templates if desired

---

## ✅ Phase 7: Update Local Environment (2 minutes)

### 7.1 Update .env File
Replace the contents of your `.env` file with YOUR new Supabase credentials:

```env
VITE_SUPABASE_PROJECT_ID="YOUR_PROJECT_REF"
VITE_SUPABASE_PUBLISHABLE_KEY="YOUR_ANON_KEY"
VITE_SUPABASE_URL="https://YOUR_PROJECT_REF.supabase.co"
```

### 7.2 Test Local Connection
```bash
# Start dev server
npm run dev
```

- [ ] Open http://localhost:5173
- [ ] Verify the site loads (it will be empty since no data yet)
- [ ] Check browser console for any Supabase connection errors

---

## ✅ Phase 8: Create Admin Account (5 minutes)

### 8.1 Enable Signups Temporarily
- [ ] Go to http://localhost:5173/admin/login
- [ ] You'll see "Sign-ups are currently disabled"
- [ ] Go to Supabase Dashboard → SQL Editor
- [ ] Run:
```sql
UPDATE app_settings 
SET value = 'true'::jsonb 
WHERE key = 'signup_enabled';
```

### 8.2 Sign Up as Admin
- [ ] Refresh http://localhost:5173/admin/login
- [ ] Click "Don't have an account? Sign up"
- [ ] Email: `itsrajivv@gmail.com` (MUST be this exact email)
- [ ] Password: Choose a strong password
- [ ] Click "Sign Up"

### 8.3 Confirm Email
- [ ] Check your email inbox for confirmation link
- [ ] Click the confirmation link
- [ ] You'll be redirected to the site

### 8.4 Verify Admin Access
- [ ] Go to http://localhost:5173/admin/login
- [ ] Log in with your credentials
- [ ] You should see the Admin Dashboard
- [ ] Go to Settings tab to verify you can edit site config

### 8.5 Disable Signups
- [ ] In Admin Dashboard → Settings → Feature Toggles
- [ ] Toggle "Allow New Sign Ups" to OFF
- [ ] This prevents unauthorized accounts

---

## ✅ Phase 9: Populate Site Content (30-60 minutes)

### 9.1 Update Site Settings
In Admin Dashboard → Settings, update:
- [ ] Doctor name, credentials, specialization
- [ ] Phone, WhatsApp, email
- [ ] Clinic address and hours
- [ ] Profile photo URL (upload to Supabase Storage first, or use external URL)
- [ ] Registration number
- [ ] Consultation fee
- [ ] Stats (years of experience, patients, surgeries, branches)
- [ ] Education (degrees, institutions, years)
- [ ] Awards and memberships
- [ ] Languages spoken
- [ ] Insurance providers list
- [ ] Time slots for appointments
- [ ] "Why Choose" cards (4 cards on homepage)
- [ ] Service categories

### 9.2 Add Services
- [ ] Go to Admin → Services tab
- [ ] Add your medical procedures with details

### 9.3 Add Testimonials
- [ ] Go to Admin → Testimonials tab
- [ ] Add patient reviews

### 9.4 Optional: Add Blog Posts & Case Studies
- [ ] Admin → Blog tab
- [ ] Admin → Case Studies tab

---

## ✅ Phase 10: Update Hard-Coded Content (15 minutes)

These require code changes:

### 10.1 Update Hero Section
Edit `src/pages/Index.tsx`:
- [ ] Line ~50: Update badge text "Orthopedic Excellence in Hyderabad"
- [ ] Line ~55: Update headline "Move Freely. Live Fully."
- [ ] Line ~60: Update review badge "4.9★ / 500+ Reviews"

### 10.2 Update Google Maps
Edit `src/pages/Contact.tsx`:
- [ ] Find the `<iframe>` tag (around line 80)
- [ ] Replace `src` with your Google Maps embed URL
- [ ] Get embed URL: Google Maps → Your location → Share → Embed a map

### 10.3 Replace Favicon
- [ ] Create or download your clinic logo as favicon.ico
- [ ] Replace `public/favicon.ico`

### 10.4 Test Changes Locally
```bash
npm run dev
```
- [ ] Verify all changes look correct
- [ ] Test booking form
- [ ] Test contact form
- [ ] Test second opinion form

---

## ✅ Phase 11: Deploy to Vercel (10 minutes)

### 11.1 Push to GitHub
```bash
# Initialize git if not already done
git init
git add .
git commit -m "Initial commit - ready for deployment"

# Create GitHub repo and push
# (Follow GitHub's instructions for creating a new repo)
git remote add origin YOUR_GITHUB_REPO_URL
git branch -M main
git push -u origin main
```

### 11.2 Connect to Vercel
- [ ] Go to https://vercel.com
- [ ] Click "Add New Project"
- [ ] Import your GitHub repository
- [ ] Framework Preset: **Vite** (should auto-detect)
- [ ] Root Directory: `./` (leave as default)
- [ ] Build Command: `npm run build`
- [ ] Output Directory: `dist`

### 11.3 Set Environment Variables in Vercel
In Vercel → Project Settings → Environment Variables, add:

| Variable | Value |
|----------|-------|
| `VITE_SUPABASE_PROJECT_ID` | Your project ref |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Your anon key |
| `VITE_SUPABASE_URL` | `https://YOUR_PROJECT_REF.supabase.co` |

**Important:** Add these for all environments (Production, Preview, Development)

### 11.4 Deploy
- [ ] Click "Deploy"
- [ ] Wait 2-3 minutes for build
- [ ] Verify deployment succeeds
- [ ] Click the deployment URL to test

---

## ✅ Phase 12: Configure Custom Domain (10 minutes)

### 12.1 Add Domain in Vercel
- [ ] Go to Vercel → Project Settings → Domains
- [ ] Click "Add"
- [ ] Enter your domain (e.g., `drortho.com`)
- [ ] Click "Add"

### 12.2 Update DNS Records
Go to your domain registrar (GoDaddy, Namecheap, etc.) and add:

**For root domain (drortho.com):**
- Type: `A`
- Name: `@`
- Value: `76.76.21.21`
- TTL: 3600 (or default)

**For www subdomain:**
- Type: `CNAME`
- Name: `www`
- Value: `cname.vercel-dns.com`
- TTL: 3600 (or default)

### 12.3 Wait for DNS Propagation
- [ ] DNS changes can take 5 minutes to 48 hours
- [ ] Vercel will show "Valid Configuration" when ready
- [ ] SSL certificate is auto-provisioned by Vercel

### 12.4 Update Supabase Auth URLs
Once your domain is live, go to Supabase Dashboard → Authentication → URL Configuration:

**Site URL:**
```
https://yourdomain.com
```

**Redirect URLs:** Add these:
```
https://yourdomain.com
https://yourdomain.com/reset-password
https://yourdomain.com/admin
https://www.yourdomain.com
https://www.yourdomain.com/reset-password
https://www.yourdomain.com/admin
```

---

## ✅ Phase 13: Final Testing (15 minutes)

### 13.1 Test on Production Domain
- [ ] Visit https://yourdomain.com
- [ ] Verify homepage loads correctly
- [ ] Check all navigation links work
- [ ] Test responsive design (mobile, tablet)

### 13.2 Test Forms
- [ ] Book an appointment → Check Admin → Appointments
- [ ] Submit contact form → Check Admin → Contact Messages
- [ ] Submit second opinion with file → Check Admin → 2nd Opinions

### 13.3 Test Admin Login
- [ ] Go to https://yourdomain.com/admin/login
- [ ] Log in with your admin credentials
- [ ] Verify all admin features work
- [ ] Try editing site settings and verify changes appear on frontend

### 13.4 Test Password Reset
- [ ] Log out
- [ ] Click "Forgot password?"
- [ ] Enter your email
- [ ] Check email for reset link
- [ ] Click link and set new password
- [ ] Verify you can log in with new password

---

## 🎉 Launch Complete!

Your site is now live on your custom domain with your own Supabase backend!

---

## 📋 Post-Launch Tasks

### Immediate (Week 1)
- [ ] Set up Google Analytics or Plausible for real analytics
- [ ] Configure email notifications for appointments (see Section 9 of LAUNCH_GUIDE.md)
- [ ] Add real blog posts and case studies
- [ ] Test all forms from different devices
- [ ] Share site with colleagues for feedback

### Soon (Month 1)
- [ ] Add SEO meta tags with react-helmet-async
- [ ] Create sitemap.xml for SEO
- [ ] Set up appointment status management
- [ ] Add image upload for blog posts and services
- [ ] Configure WhatsApp Business API (optional)

### Future Enhancements
- [ ] Patient portal for viewing appointments
- [ ] Appointment reminder system (SMS/email)
- [ ] Multi-doctor support
- [ ] Rich text editor for blog posts
- [ ] Advanced analytics dashboard

---

## 🆘 Troubleshooting

### "Failed to fetch" errors
- Check environment variables in Vercel match your Supabase credentials
- Verify Supabase project is not paused (free tier pauses after 7 days inactivity)

### Admin login not working
- Verify you signed up with `itsrajivv@gmail.com` exactly
- Check Supabase Dashboard → Authentication → Users to see if user exists
- Check user_roles table to verify admin role was assigned

### Forms not submitting
- Check browser console for errors
- Verify RLS policies are set correctly in Supabase
- Test with Supabase Dashboard → Table Editor to insert manually

### Domain not resolving
- DNS changes can take up to 48 hours
- Use https://dnschecker.org to check propagation
- Verify DNS records are correct in your registrar

---

## 📞 Need Help?

- Supabase Docs: https://supabase.com/docs
- Vercel Docs: https://vercel.com/docs
- React Router: https://reactrouter.com
- Shadcn UI: https://ui.shadcn.com
