# 🔧 Fix: Lost Configuration Data

## What Happened

When you saved the settings, the form overwrote some fields with empty values because:
1. The form wasn't syncing with the latest config from the database
2. Some array fields (education, awards, etc.) were empty in the form

## ✅ What I Fixed

1. **Added config sync** - Form now updates when config changes
2. **This prevents future data loss**

## 🔄 Restore Your Data

### Option 1: Restore Default Arrays (Recommended)

Run this in Supabase SQL Editor to restore the default arrays:

1. Go to: https://supabase.com/dashboard/project/lbcnvyrzzhwcstlomlbs/sql/new
2. Copy and paste the contents of `RESTORE_DEFAULT_CONFIG.sql`
3. Click "Run"

This will restore:
- ✅ Education entries (MBBS, MS Ortho, Fellowship)
- ✅ Awards (Best Surgeon, Young Achiever)
- ✅ Memberships (IOA, TOSS)
- ✅ Insurance Providers (5 providers)
- ✅ Time Slots (10 time slots)
- ✅ Why Choose cards (4 cards)
- ✅ Service Categories (4 categories)

**Your custom data (doctor name, location, etc.) will NOT be affected**

### Option 2: Manual Update via Admin

After restoring defaults, update your personal info:

1. Restart dev server:
   ```bash
   npm run dev
   ```

2. Hard refresh browser (Ctrl + Shift + R)

3. Go to Admin → Settings

4. Update these fields:
   - Doctor Name
   - Clinic Name
   - Email
   - Phone
   - WhatsApp
   - Location (your full address)
   - Any other personal details

5. **Click Save**

---

## 🎯 Current Data Status

### ✅ Data That's Still There:
- Location (your full address)
- Doctor Name: Dr. Ortho
- Clinic Name: Ortho Clinic
- Phone: +919876543210
- Email: consult@drortho.com
- Basic settings

### ❌ Data That Was Lost (empty arrays):
- Education entries
- Awards
- Memberships
- Insurance Providers
- Time Slots
- Why Choose cards
- Service Categories

---

## 🚀 Steps to Fix Everything

### Step 1: Restore Default Arrays
```bash
# Run the SQL script in Supabase Dashboard
# File: RESTORE_DEFAULT_CONFIG.sql
```

### Step 2: Restart Dev Server
```bash
# Press Ctrl + C
npm run dev
```

### Step 3: Hard Refresh Browser
- Press **Ctrl + Shift + R**

### Step 4: Update Your Personal Info
1. Go to Admin → Settings
2. Update:
   - Doctor Name: Your actual name
   - Clinic Name: Your clinic name
   - Email: Your email
   - Phone: Your phone
   - WhatsApp: Your WhatsApp
   - Location: Keep the full address you entered
3. **Click Save**

### Step 5: Verify Everything
1. Refresh homepage
2. Check footer shows your info
3. Check About page shows education/awards
4. Check booking page shows time slots

---

## 🛡️ Prevent Future Data Loss

### Rule 1: Always Use Latest Code
- Make sure dev server is running with latest code
- Hard refresh after code changes (Ctrl + Shift + R)

### Rule 2: Check Form Before Saving
- Before clicking Save, verify all fields have values
- If you see empty fields, refresh the page first

### Rule 3: Save Often
- Don't make too many changes at once
- Save after updating each section

### Rule 4: Verify After Save
- After saving, refresh the page
- Check that your changes are still there
- If something's missing, don't save again - restore first

---

## 🔍 Verify Data in Database

Check what's currently saved:

```bash
npx supabase db query "SELECT config->>'doctorName' as doctor, config->>'email' as email, jsonb_array_length(config->'education') as edu_count FROM site_config;" --linked
```

**Expected after restore:**
- doctor: Your name
- email: Your email
- edu_count: 3

---

## 📋 Quick Recovery Checklist

- [ ] Run RESTORE_DEFAULT_CONFIG.sql in Supabase
- [ ] Restart dev server
- [ ] Hard refresh browser (Ctrl + Shift + R)
- [ ] Go to Admin → Settings
- [ ] Update personal info (name, email, phone)
- [ ] Click Save
- [ ] Refresh homepage
- [ ] Verify footer shows correct info
- [ ] Verify About page shows education/awards
- [ ] Verify booking page shows time slots

---

## 🆘 If Data Is Still Missing

### Check Database Directly

```bash
# See full config
npx supabase db query "SELECT config FROM site_config;" --linked
```

### Manual Restore via SQL

If the script doesn't work, you can manually update each field:

```sql
-- Update doctor name
UPDATE site_config 
SET config = jsonb_set(config, '{doctorName}', '"Dr. Your Name"')
WHERE id = 'd394024d-550e-42a8-b7a7-6eb3b176851f';

-- Update email
UPDATE site_config 
SET config = jsonb_set(config, '{email}', '"your@email.com"')
WHERE id = 'd394024d-550e-42a8-b7a7-6eb3b176851f';
```

---

## ✅ After Fix

The form will now:
- ✅ Sync with database automatically
- ✅ Keep all existing data when saving
- ✅ Only update fields you change
- ✅ Not overwrite arrays with empty values

**Run the restore script and restart to fix the issue!** 🔧
