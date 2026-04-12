# 🎯 Quick Reference Card

## Your Project Info

**Supabase Project ID:** `lbcnvyrzzhwcstlomlbs`
**Supabase URL:** `https://lbcnvyrzzhwcstlomlbs.supabase.co`
**Admin Email:** `itsrajivv@gmail.com`

---

## 📍 Important URLs

| What | URL |
|------|-----|
| **Supabase Dashboard** | https://supabase.com/dashboard/project/lbcnvyrzzhwcstlomlbs |
| **Storage Buckets** | https://supabase.com/dashboard/project/lbcnvyrzzhwcstlomlbs/storage/buckets |
| **Auth Config** | https://supabase.com/dashboard/project/lbcnvyrzzhwcstlomlbs/auth/url-configuration |
| **SQL Editor** | https://supabase.com/dashboard/project/lbcnvyrzzhwcstlomlbs/sql/new |
| **Table Editor** | https://supabase.com/dashboard/project/lbcnvyrzzhwcstlomlbs/editor |
| **Edge Functions** | https://supabase.com/dashboard/project/lbcnvyrzzhwcstlomlbs/functions |
| **Local Dev** | http://localhost:5173 |
| **Admin Login** | http://localhost:5173/admin/login |

---

## ⚡ Quick Commands

```bash
# Start dev server
npm run dev

# Build for production
npm run build

# Check Supabase connection
npx supabase db query "SELECT 1;" --linked

# View edge function logs
npx supabase functions logs assign-admin-role --linked

# Check tables
npx supabase db query "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';" --linked
```

---

## 🔑 Environment Variables

Your `.env` file contains:
```env
VITE_SUPABASE_PROJECT_ID="lbcnvyrzzhwcstlomlbs"
VITE_SUPABASE_PUBLISHABLE_KEY="sb_publishable_a35Y87i6hrmo8nCssgPnrg_5Z0Nx2bo"
VITE_SUPABASE_URL="https://lbcnvyrzzhwcstlomlbs.supabase.co"
```

**For Vercel:** Use the same values in Project Settings → Environment Variables

---

## ✅ What's Done

- [x] Supabase project created
- [x] Database migrations pushed (8 migrations)
- [x] Edge function deployed
- [x] Initial data seeded
- [x] 10 tables created
- [x] npm dependencies installed

---

## 🚧 What's Next

1. **Create storage bucket** (2 min)
   - Go to Storage → Create bucket
   - Name: `second-opinion-reports`
   - Public: No

2. **Configure auth URLs** (2 min)
   - Go to Auth → URL Configuration
   - Site URL: `http://localhost:5173`
   - Add redirect URLs

3. **Test locally** (1 min)
   - Run: `npm run dev`
   - Open: http://localhost:5173

4. **Create admin account** (5 min)
   - Go to: http://localhost:5173/admin/login
   - Sign up with: `itsrajivv@gmail.com`
   - Confirm email
   - Log in

5. **Disable signups** (1 min)
   - Admin Dashboard → Settings → Feature Toggles
   - Toggle "Allow New Sign Ups" OFF

6. **Update site info** (5 min)
   - Admin Dashboard → Settings
   - Update doctor/clinic details

---

## 🚀 After Local Works

1. Push to GitHub
2. Deploy to Vercel
3. Add environment variables in Vercel
4. Configure custom domain
5. Update Supabase auth URLs for production

---

## 📚 Documentation Files

| File | Purpose |
|------|---------|
| **CURRENT_STATUS.md** | What's done, what's next |
| **NEXT_STEPS.md** | Detailed next steps |
| **QUICK_START.md** | 30-min deployment guide |
| **MIGRATION_CHECKLIST.md** | Complete checklist |
| **TROUBLESHOOTING.md** | Fix common issues |

---

## 🆘 Common Issues

**"Failed to fetch"**
→ Check .env file, verify Supabase project active

**Can't sign up**
→ Refresh page, check if signups enabled

**Admin role not assigned**
→ Use exact email: `itsrajivv@gmail.com`

**Storage upload fails**
→ Create storage bucket first

---

## 📞 Support Resources

- **Supabase Docs:** https://supabase.com/docs
- **Vercel Docs:** https://vercel.com/docs
- **Your Troubleshooting Guide:** TROUBLESHOOTING.md

---

**Current Phase:** Local Setup (15 min remaining)
**Next Phase:** Vercel Deployment (20-30 min)
**Total Time to Live:** ~45 minutes

**You're doing great! Keep going! 🚀**
