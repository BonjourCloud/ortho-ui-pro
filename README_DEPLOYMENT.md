# 🚀 Deployment Guide — Ortho UI Pro

**From Lovable.dev to Production with Your Own Supabase + Vercel + Custom Domain**

---

## 📚 Documentation Overview

This project includes comprehensive deployment documentation:

| Document | Purpose | When to Use |
|----------|---------|-------------|
| **QUICK_START.md** | Express 30-minute migration guide | Start here for fastest deployment |
| **MIGRATION_CHECKLIST.md** | Detailed step-by-step checklist | For thorough, careful migration |
| **TROUBLESHOOTING.md** | Common issues and solutions | When something goes wrong |
| **docs/LAUNCH_GUIDE.md** | Complete launch guide from Lovable | Reference for all features |
| **DEVELOPER_GUIDE.md** | Technical architecture details | For developers extending the app |
| **docs/CONTENT_SOURCE_MAP.md** | Data source reference | Understanding what's mock vs real |

---

## 🎯 Quick Navigation

### I want to...

**Deploy as fast as possible**
→ Follow **QUICK_START.md** (30 minutes)

**Understand every step in detail**
→ Follow **MIGRATION_CHECKLIST.md** (1-2 hours)

**Fix an error or issue**
→ Check **TROUBLESHOOTING.md**

**Understand the architecture**
→ Read **DEVELOPER_GUIDE.md**

**Know what content I can edit**
→ See **docs/LAUNCH_GUIDE.md** Section 2 & 3

---

## 🔑 What You Need

### Accounts (All Free Tier OK)
- [ ] Supabase account (https://supabase.com)
- [ ] Vercel account (https://vercel.com)
- [ ] GitHub account (https://github.com)

### Purchased
- [ ] Custom domain (from GoDaddy, Namecheap, etc.)

### Installed Locally
- [ ] Node.js 18+ (https://nodejs.org)
- [ ] Git (https://git-scm.com)
- [ ] Supabase CLI: `npm install -g supabase`

---

## 📋 Migration Overview

### Current State
- ✅ UI fully built via Lovable.dev
- ✅ Connected to Lovable's Supabase instance
- ✅ All features working in development
- ❌ Not using your own Supabase project
- ❌ Not deployed to production
- ❌ No custom domain

### Target State
- ✅ Your own Supabase project
- ✅ Deployed to Vercel
- ✅ Custom domain configured
- ✅ SSL certificate active
- ✅ Admin account created
- ✅ Ready to accept real appointments

---

## 🚀 Deployment Process (High Level)

```
┌─────────────────────────────────────────────────────────────┐
│ Phase 1: Supabase Setup (15 min)                            │
│ • Create project                                             │
│ • Run migrations                                             │
│ • Deploy edge functions                                      │
│ • Configure auth                                             │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ Phase 2: Local Testing (10 min)                             │
│ • Update .env with your credentials                          │
│ • Test locally                                               │
│ • Create admin account                                       │
│ • Verify all features work                                   │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ Phase 3: Vercel Deployment (10 min)                         │
│ • Push to GitHub                                             │
│ • Connect to Vercel                                          │
│ • Set environment variables                                  │
│ • Deploy                                                     │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ Phase 4: Custom Domain (10 min)                             │
│ • Add domain in Vercel                                       │
│ • Update DNS records                                         │
│ • Wait for SSL provisioning                                  │
│ • Update Supabase auth URLs                                  │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ Phase 5: Content Population (30-60 min)                     │
│ • Update site settings in Admin                              │
│ • Add services, testimonials                                 │
│ • Update hard-coded content in code                          │
│ • Test all forms                                             │
└─────────────────────────────────────────────────────────────┘
                            ↓
                    🎉 LIVE IN PRODUCTION!
```

---

## ⚡ Express Deployment (30 min)

If you want to get live ASAP, follow these commands:

```bash
# 1. Create Supabase project at supabase.com (3 min)
# Save: Project URL, Project Ref, anon key

# 2. Install & link CLI (2 min)
npm install -g supabase
supabase login
supabase link --project-ref YOUR_PROJECT_REF

# 3. Migrate database (3 min)
supabase db push

# 4. Deploy edge function (2 min)
supabase functions deploy assign-admin-role --project-ref YOUR_PROJECT_REF

# 5. Update .env (1 min)
# Edit .env file with your Supabase credentials

# 6. Test locally (2 min)
npm install
npm run dev

# 7. Create admin account (3 min)
# Go to http://localhost:5173/admin/login
# Sign up with: itsrajivv@gmail.com

# 8. Push to GitHub (2 min)
git init
git add .
git commit -m "Initial commit"
git remote add origin YOUR_GITHUB_REPO_URL
git push -u origin main

# 9. Deploy to Vercel (3 min)
# Go to vercel.com → Import GitHub repo
# Add environment variables
# Deploy

# 10. Configure domain (5 min)
# Vercel → Add domain
# Update DNS: A record @ → 76.76.21.21
# Update DNS: CNAME www → cname.vercel-dns.com

# 11. Update Supabase auth URLs (2 min)
# Supabase Dashboard → Auth → URL Configuration
# Add: https://yourdomain.com

# 12. Test production (2 min)
# Visit https://yourdomain.com
# Test admin login, forms
```

**Done!** Your site is live. Now populate content in Admin Dashboard.

---

## 🔍 Pre-Deployment Check

Run this before deploying to catch issues:

**Windows (PowerShell):**
```powershell
.\pre-deploy-check.ps1
```

**Mac/Linux:**
```bash
chmod +x pre-deploy-check.sh
./pre-deploy-check.sh
```

This checks:
- ✅ .env file configured
- ✅ Dependencies installed
- ✅ Build succeeds
- ✅ Vercel config exists
- ✅ Supabase CLI installed
- ✅ Migrations present
- ✅ Edge functions present

---

## 📊 What Gets Migrated

### ✅ Automatically Migrated
- Database schema (all tables)
- RLS policies
- Database functions
- Edge functions
- Storage buckets

### ⚠️ NOT Migrated (Must Configure)
- Site content (doctor info, services, etc.)
- Admin account
- Auth redirect URLs
- Custom domain DNS
- Environment variables

### 🎨 Requires Code Changes
- Google Maps embed URL
- Hero section text
- Favicon
- Any hard-coded content

---

## 🔐 Security Checklist

Before going live:
- [ ] Admin account created with strong password
- [ ] Sign-ups disabled after admin account created
- [ ] Environment variables set in Vercel (not in code)
- [ ] .env file NOT committed to Git (check .gitignore)
- [ ] Supabase RLS policies enabled on all tables
- [ ] Storage bucket is private (not public)
- [ ] SSL certificate active on custom domain

---

## 📈 Post-Launch Tasks

### Immediate (Week 1)
- [ ] Test all forms from different devices
- [ ] Verify email notifications work
- [ ] Add real content (services, testimonials, blog)
- [ ] Set up Google Analytics
- [ ] Submit sitemap to Google Search Console

### Soon (Month 1)
- [ ] Configure custom SMTP for emails
- [ ] Add SEO meta tags
- [ ] Set up appointment reminders
- [ ] Create backup strategy
- [ ] Monitor Supabase usage

### Future Enhancements
- [ ] Patient portal
- [ ] Online payment integration
- [ ] Multi-language support
- [ ] Advanced analytics
- [ ] WhatsApp Business API

---

## 🆘 Getting Help

### Documentation
1. Check **TROUBLESHOOTING.md** for common issues
2. Read **docs/LAUNCH_GUIDE.md** for feature details
3. See **DEVELOPER_GUIDE.md** for technical details

### External Resources
- Supabase Docs: https://supabase.com/docs
- Vercel Docs: https://vercel.com/docs
- React Router: https://reactrouter.com
- Shadcn UI: https://ui.shadcn.com

### Debugging
- Browser console (F12) for frontend errors
- Vercel deployment logs for build errors
- Supabase Dashboard → Logs for backend errors
- `supabase functions logs` for edge function errors

---

## ✅ Success Criteria

Your deployment is successful when:
- [ ] Site loads at https://yourdomain.com
- [ ] Admin login works
- [ ] Can edit site settings in Admin Dashboard
- [ ] Booking form submits and appears in Admin
- [ ] Contact form submits and appears in Admin
- [ ] Second opinion form with file upload works
- [ ] All pages load without errors
- [ ] Mobile responsive design works
- [ ] SSL certificate is active (green padlock)

---

## 🎉 Ready to Deploy?

1. **Quick deployment:** Start with **QUICK_START.md**
2. **Detailed deployment:** Follow **MIGRATION_CHECKLIST.md**
3. **Run pre-deployment check:** `.\pre-deploy-check.ps1`
4. **Deploy!**
5. **Populate content in Admin Dashboard**
6. **Go live!**

---

## 📞 Admin Credentials

**Admin Email:** `itsrajivv@gmail.com`

This email is hardcoded in the edge function for admin role assignment. Only this email will get admin access on signup.

**Important:** After creating your admin account, disable sign-ups in Admin Dashboard → Settings → Feature Toggles to prevent unauthorized accounts.

---

## 🔄 Keeping Updated

### Update Dependencies
```bash
npm update
npm audit fix
```

### Update Supabase Types
```bash
supabase gen types typescript --project-id YOUR_PROJECT_REF > src/integrations/supabase/types.ts
```

### Redeploy
```bash
git add .
git commit -m "Update dependencies"
git push
# Vercel auto-deploys on push
```

---

**Good luck with your deployment! 🚀**

For questions or issues, refer to the documentation files listed at the top of this guide.
