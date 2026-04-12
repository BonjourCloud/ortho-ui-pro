# 🔧 Troubleshooting Guide

Common issues and solutions during migration and deployment.

---

## 🚨 Database & Supabase Issues

### Issue: "Failed to fetch" or "Network error" in browser console

**Symptoms:**
- Site loads but no data appears
- Browser console shows fetch errors
- Forms don't submit

**Solutions:**
1. **Check environment variables:**
   ```bash
   # Verify .env file has correct values
   cat .env
   ```
   Make sure there are no quotes around values and no trailing spaces.

2. **Verify Supabase project is active:**
   - Go to Supabase Dashboard
   - Check if project is paused (free tier pauses after 7 days inactivity)
   - Click "Resume" if paused

3. **Check CORS settings:**
   - Supabase Dashboard → Settings → API
   - Verify your domain is not blocked

4. **Test Supabase connection:**
   ```bash
   # In browser console on your site
   console.log(import.meta.env.VITE_SUPABASE_URL)
   console.log(import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY)
   ```
   If these are undefined, environment variables aren't loading.

---

### Issue: Migrations fail with "relation already exists"

**Symptoms:**
```
ERROR: relation "services" already exists
```

**Solutions:**
1. **Check if migrations were already run:**
   ```bash
   supabase db remote list
   ```

2. **Reset and re-run (⚠️ DESTRUCTIVE - only for fresh setup):**
   ```bash
   # This will delete all data!
   supabase db reset --linked
   supabase db push
   ```

3. **Manual fix:**
   - Go to Supabase Dashboard → SQL Editor
   - Drop the conflicting table: `DROP TABLE IF EXISTS services CASCADE;`
   - Re-run the specific migration

---

### Issue: Edge function deployment fails

**Symptoms:**
```
Error: Failed to deploy function
```

**Solutions:**
1. **Verify you're linked to correct project:**
   ```bash
   supabase projects list
   supabase link --project-ref YOUR_PROJECT_REF
   ```

2. **Check function syntax:**
   ```bash
   # Test function locally first
   supabase functions serve assign-admin-role
   ```

3. **Verify Deno runtime:**
   - Edge functions use Deno, not Node.js
   - Check `supabase/functions/assign-admin-role/index.ts` for syntax errors

4. **Check logs:**
   ```bash
   supabase functions logs assign-admin-role
   ```

---

## 🔐 Authentication Issues

### Issue: Admin login shows "Invalid credentials" even with correct password

**Symptoms:**
- Can't log in to /admin/login
- Password reset doesn't help

**Solutions:**
1. **Verify email is confirmed:**
   - Supabase Dashboard → Authentication → Users
   - Check if email has green checkmark
   - If not, click "..." → "Send confirmation email"

2. **Check if user exists:**
   - Supabase Dashboard → Authentication → Users
   - Search for `itsrajivv@gmail.com`
   - If not found, sign up again

3. **Verify admin role was assigned:**
   ```sql
   -- Run in Supabase SQL Editor
   SELECT * FROM user_roles WHERE role = 'admin';
   ```
   If empty, the edge function didn't run. Check edge function logs.

4. **Manually assign admin role:**
   ```sql
   -- Get user ID first
   SELECT id, email FROM auth.users WHERE email = 'itsrajivv@gmail.com';
   
   -- Insert admin role (replace USER_ID with actual ID)
   INSERT INTO user_roles (user_id, role)
   VALUES ('USER_ID', 'admin');
   ```

---

### Issue: "Sign-ups are currently disabled" message

**Symptoms:**
- Can't create admin account
- Sign-up button doesn't appear

**Solutions:**
1. **Enable signups in database:**
   ```sql
   -- Run in Supabase SQL Editor
   UPDATE app_settings 
   SET value = 'true'::jsonb 
   WHERE key = 'signup_enabled';
   ```

2. **Verify app_settings table exists:**
   ```sql
   SELECT * FROM app_settings;
   ```
   If empty, run:
   ```sql
   INSERT INTO app_settings (key, value)
   VALUES ('signup_enabled', 'true'::jsonb);
   ```

---

### Issue: Password reset email not received

**Symptoms:**
- Click "Forgot password?" but no email arrives

**Solutions:**
1. **Check spam folder**

2. **Verify email settings in Supabase:**
   - Dashboard → Authentication → Email Templates
   - Check "Reset Password" template is enabled

3. **Check Supabase email rate limits:**
   - Free tier has email sending limits
   - Check Dashboard → Settings → Usage

4. **Use custom SMTP (recommended for production):**
   - Dashboard → Settings → Auth
   - Configure custom SMTP provider (SendGrid, Mailgun, etc.)

---

## 🌐 Vercel Deployment Issues

### Issue: Build fails on Vercel

**Symptoms:**
```
Error: Build failed
npm ERR! code ELIFECYCLE
```

**Solutions:**
1. **Test build locally first:**
   ```bash
   npm run build
   ```
   Fix any errors before deploying.

2. **Check Node.js version:**
   - Vercel uses Node 18 by default
   - Add `engines` to package.json if you need specific version:
   ```json
   "engines": {
     "node": ">=18.0.0"
   }
   ```

3. **Verify environment variables in Vercel:**
   - Project Settings → Environment Variables
   - Make sure all three VITE_SUPABASE_* variables are set
   - Check for typos in variable names

4. **Check build logs:**
   - Vercel Dashboard → Deployments → Click failed deployment
   - Read full error message

---

### Issue: Site loads but shows blank page on Vercel

**Symptoms:**
- Local dev works fine
- Production shows white screen
- No errors in browser console

**Solutions:**
1. **Check environment variables:**
   - Vercel → Project Settings → Environment Variables
   - Verify all three variables are set for **Production** environment
   - Redeploy after adding variables

2. **Check browser console:**
   - Open DevTools → Console
   - Look for errors about missing environment variables

3. **Verify build output:**
   - Check if `dist` folder was created
   - Vercel → Deployments → Build Logs
   - Look for "Build completed" message

---

### Issue: 404 errors on page refresh (e.g., /about, /admin)

**Symptoms:**
- Navigation works fine
- Refreshing page shows 404
- Direct URL access fails

**Solutions:**
1. **Verify vercel.json exists:**
   ```json
   {
     "rewrites": [
       { "source": "/(.*)", "destination": "/index.html" }
     ]
   }
   ```

2. **Check if vercel.json is committed to Git:**
   ```bash
   git ls-files | grep vercel.json
   ```

3. **Redeploy after adding vercel.json:**
   ```bash
   git add vercel.json
   git commit -m "Add SPA routing config"
   git push
   ```

---

## 🌍 Custom Domain Issues

### Issue: Domain not resolving / "This site can't be reached"

**Symptoms:**
- Domain doesn't load
- Shows DNS error

**Solutions:**
1. **Check DNS propagation:**
   - Visit https://dnschecker.org
   - Enter your domain
   - Check if A record points to 76.76.21.21

2. **Verify DNS records at registrar:**
   ```
   A record:
   - Name: @ (or leave blank)
   - Value: 76.76.21.21
   - TTL: 3600
   
   CNAME record:
   - Name: www
   - Value: cname.vercel-dns.com
   - TTL: 3600
   ```

3. **Wait for propagation:**
   - DNS changes can take 5 minutes to 48 hours
   - Average is 1-2 hours

4. **Check Vercel domain status:**
   - Vercel → Project Settings → Domains
   - Should show "Valid Configuration"
   - If not, click "Refresh" button

---

### Issue: SSL certificate error / "Not secure" warning

**Symptoms:**
- Browser shows "Your connection is not private"
- HTTPS doesn't work

**Solutions:**
1. **Wait for SSL provisioning:**
   - Vercel auto-provisions SSL certificates
   - Can take 5-30 minutes after DNS is configured

2. **Check domain status in Vercel:**
   - Should show green checkmark
   - If red X, click for details

3. **Verify DNS is correct:**
   - SSL won't provision until DNS is properly configured

---

## 📝 Form Submission Issues

### Issue: Booking form submits but doesn't appear in Admin

**Symptoms:**
- Form shows success message
- No entry in Admin → Appointments

**Solutions:**
1. **Check RLS policies:**
   ```sql
   -- Run in Supabase SQL Editor
   SELECT * FROM appointments;
   ```
   If you see data here but not in admin, it's an RLS issue.

2. **Verify admin role:**
   ```sql
   SELECT * FROM user_roles WHERE user_id = auth.uid();
   ```

3. **Check browser console for errors:**
   - Open DevTools → Console
   - Submit form again
   - Look for error messages

---

### Issue: File upload fails on Second Opinion form

**Symptoms:**
- Form submits but file not uploaded
- Error: "Failed to upload file"

**Solutions:**
1. **Verify storage bucket exists:**
   - Supabase Dashboard → Storage
   - Check for `second-opinion-reports` bucket

2. **Check storage policies:**
   ```sql
   -- Run in Supabase SQL Editor
   SELECT * FROM storage.policies WHERE bucket_id = 'second-opinion-reports';
   ```

3. **Test file size:**
   - Free tier has 1GB storage limit
   - Individual file limit is 50MB by default

4. **Check file type:**
   - Verify allowed file types in form validation
   - Common types: PDF, JPG, PNG

---

## 🎨 Content & Display Issues

### Issue: Profile photo doesn't show / Shows placeholder

**Symptoms:**
- Doctor photo not displaying
- Shows generic placeholder

**Solutions:**
1. **Verify image URL is set:**
   - Admin Dashboard → Settings
   - Check "Profile Photo URL" field
   - Must be full URL (https://...)

2. **Test image URL:**
   - Copy URL and paste in browser
   - Should load the image
   - If 404, URL is wrong

3. **Upload to Supabase Storage:**
   ```bash
   # Or use Dashboard → Storage → Upload
   ```
   Then use the public URL in settings.

---

### Issue: Google Maps not showing on Contact page

**Symptoms:**
- Contact page shows empty space where map should be
- Or shows placeholder

**Solutions:**
1. **Update embed URL in code:**
   - Edit `src/pages/Contact.tsx`
   - Find `<iframe>` tag
   - Replace `src` with your Google Maps embed URL

2. **Get embed URL:**
   - Go to Google Maps
   - Search for your clinic
   - Click "Share" → "Embed a map"
   - Copy the iframe src URL

3. **Redeploy after code change:**
   ```bash
   git add src/pages/Contact.tsx
   git commit -m "Update Google Maps embed"
   git push
   ```

---

### Issue: Mock data showing instead of real data

**Symptoms:**
- Admin Overview shows fake analytics
- Services/testimonials not updating

**Solutions:**
1. **Check which data is mock:**
   - See `docs/CONTENT_SOURCE_MAP.md`
   - Only Analytics in Admin Overview is mock

2. **For real analytics:**
   - Integrate Google Analytics
   - Or build custom tracking with page_views table

3. **Verify data source:**
   - Check if component uses `useContent()` hook
   - Or if it imports from `mockData.ts`

---

## 🔍 Debugging Tips

### Enable Verbose Logging

**In browser console:**
```javascript
// Enable Supabase debug logs
localStorage.setItem('supabase.auth.debug', 'true')
```

**Check Supabase logs:**
```bash
supabase functions logs assign-admin-role
```

### Test Database Connection

**In browser console on your site:**
```javascript
// Test query
const { data, error } = await supabase.from('site_config').select('*')
console.log('Data:', data)
console.log('Error:', error)
```

### Verify Environment Variables

**In browser console:**
```javascript
console.log('Supabase URL:', import.meta.env.VITE_SUPABASE_URL)
console.log('Has Key:', !!import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY)
```

### Check RLS Policies

**In Supabase SQL Editor:**
```sql
-- See all policies for a table
SELECT * FROM pg_policies WHERE tablename = 'appointments';

-- Test if you have admin role
SELECT has_role(auth.uid(), 'admin');
```

---

## 📞 Still Stuck?

### Check Documentation
- Supabase Docs: https://supabase.com/docs
- Vercel Docs: https://vercel.com/docs
- React Router: https://reactrouter.com

### Check Logs
- Vercel: Dashboard → Deployments → Build Logs
- Supabase: Dashboard → Logs
- Browser: DevTools → Console

### Common Log Locations
- Build errors: Vercel deployment logs
- Runtime errors: Browser console
- Auth errors: Supabase Dashboard → Logs → Auth
- Database errors: Supabase Dashboard → Logs → Database

### Reset and Start Fresh (Last Resort)
```bash
# ⚠️ DESTRUCTIVE - Only if nothing else works

# 1. Delete Supabase project and create new one
# 2. Clear local .env and update with new credentials
# 3. Re-run all migrations
supabase db push

# 4. Redeploy to Vercel with new env vars
```

---

## ✅ Prevention Checklist

Before deploying, always:
- [ ] Test build locally: `npm run build`
- [ ] Verify .env has correct values
- [ ] Check all migrations ran: `supabase db remote list`
- [ ] Test admin login locally
- [ ] Test all forms locally
- [ ] Verify environment variables in Vercel
- [ ] Check vercel.json exists and is committed
- [ ] Test on staging domain before custom domain
