# ⚡ Quick Start Guide — Migration in 30 Minutes

This is the express version. For detailed instructions, see `MIGRATION_CHECKLIST.md`.

---

## 🎯 Prerequisites

- [ ] Supabase account created at https://supabase.com
- [ ] Vercel account created at https://vercel.com
- [ ] GitHub account with a repository for this project
- [ ] Custom domain purchased and accessible

---

## 📝 Step-by-Step (30 minutes)

### 1. Create Supabase Project (3 min)
```
1. Go to https://supabase.com/dashboard
2. Click "New Project"
3. Name: ortho-ui-pro
4. Save the database password!
5. Wait for provisioning
6. Go to Settings → API
7. Copy: Project URL, Project Ref, anon key
```

### 2. Install & Link Supabase CLI (2 min)
```bash
npm install -g supabase
supabase login
supabase link --project-ref YOUR_PROJECT_REF
```

### 3. Migrate Database (3 min)
```bash
# Push all migrations
supabase db push

# Seed initial data (run in Supabase SQL Editor)
INSERT INTO app_settings (key, value)
VALUES ('signup_enabled', 'true'::jsonb)
ON CONFLICT (key) DO NOTHING;

INSERT INTO site_config (config)
VALUES ('{}'::jsonb);
```

### 4. Create Storage Bucket (2 min)
```
1. Supabase Dashboard → Storage → Create bucket
2. Name: second-opinion-reports
3. Public: No
4. Create
```

### 5. Deploy Edge Function (2 min)
```bash
supabase functions deploy assign-admin-role --project-ref YOUR_PROJECT_REF
```

### 6. Configure Auth (2 min)
```
Supabase Dashboard → Authentication → URL Configuration

Site URL: http://localhost:5173

Redirect URLs:
- http://localhost:5173
- http://localhost:5173/reset-password
- http://localhost:5173/admin
```

### 7. Update Local .env (1 min)
```bash
# Edit .env file with your credentials
VITE_SUPABASE_PROJECT_ID="YOUR_PROJECT_REF"
VITE_SUPABASE_PUBLISHABLE_KEY="YOUR_ANON_KEY"
VITE_SUPABASE_URL="https://YOUR_PROJECT_REF.supabase.co"
```

### 8. Test Locally (2 min)
```bash
npm install
npm run dev
# Open http://localhost:5173
```

### 9. Create Admin Account (3 min)
```
1. Go to http://localhost:5173/admin/login
2. Click "Sign up"
3. Email: itsrajivv@gmail.com (MUST be this exact email!)
4. Password: (choose strong password)
5. Confirm email from inbox
6. Log in at /admin/login
7. Disable signups in Settings → Feature Toggles
```

### 10. Push to GitHub (2 min)
```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin YOUR_GITHUB_REPO_URL
git branch -M main
git push -u origin main
```

### 11. Deploy to Vercel (3 min)
```
1. Go to https://vercel.com
2. Click "Add New Project"
3. Import your GitHub repo
4. Framework: Vite (auto-detected)
5. Add Environment Variables:
   - VITE_SUPABASE_PROJECT_ID
   - VITE_SUPABASE_PUBLISHABLE_KEY
   - VITE_SUPABASE_URL
6. Click "Deploy"
7. Wait 2-3 minutes
```

### 12. Configure Custom Domain (5 min)
```
Vercel → Project Settings → Domains
1. Add your domain (e.g., drortho.com)

Go to your domain registrar (GoDaddy, Namecheap, etc.):
2. Add A record: @ → 76.76.21.21
3. Add CNAME: www → cname.vercel-dns.com
4. Wait 5-30 minutes for DNS propagation

Supabase Dashboard → Authentication → URL Configuration:
5. Update Site URL: https://yourdomain.com
6. Add Redirect URLs:
   - https://yourdomain.com
   - https://yourdomain.com/reset-password
   - https://yourdomain.com/admin
```

---

## ✅ Verification Checklist

- [ ] Site loads at https://yourdomain.com
- [ ] Admin login works at https://yourdomain.com/admin/login
- [ ] Can edit site settings in Admin Dashboard
- [ ] Booking form submits successfully
- [ ] Contact form submits successfully
- [ ] Second opinion form with file upload works

---

## 🎨 Content Updates (Do After Deployment)

### In Admin Dashboard (https://yourdomain.com/admin)
- [ ] Settings → Update doctor info, phone, email, address
- [ ] Settings → Upload profile photo
- [ ] Settings → Configure time slots
- [ ] Settings → Add insurance providers
- [ ] Services → Add your medical procedures
- [ ] Testimonials → Add patient reviews

### In Code (Requires Redeployment)
- [ ] `src/pages/Index.tsx` → Update hero text
- [ ] `src/pages/Contact.tsx` → Update Google Maps embed
- [ ] `public/favicon.ico` → Replace with your logo

---

## 🆘 Common Issues

**"Failed to fetch" errors**
→ Check environment variables in Vercel match Supabase credentials

**Admin login not working**
→ Verify you signed up with `itsrajivv@gmail.com` exactly
→ Check Supabase Dashboard → Authentication → Users

**Domain not resolving**
→ DNS can take up to 48 hours
→ Check https://dnschecker.org

**Build fails on Vercel**
→ Check environment variables are set for Production
→ Verify build works locally: `npm run build`

---

## 📚 Full Documentation

- **Detailed Migration:** `MIGRATION_CHECKLIST.md`
- **Launch Guide:** `docs/LAUNCH_GUIDE.md`
- **Developer Guide:** `DEVELOPER_GUIDE.md`
- **Content Map:** `docs/CONTENT_SOURCE_MAP.md`

---

## 🎉 You're Live!

Once deployed, share your site:
- Homepage: https://yourdomain.com
- Admin: https://yourdomain.com/admin/login
- Booking: https://yourdomain.com/book-appointment

**Next:** Populate content in Admin Dashboard and start accepting appointments!
