# Update Location: Chikkadpally → Ashok Nagar

## ✅ What I've Updated

1. **Email function** - Changed location in appointment confirmation emails
2. **Migration files** - Updated Bicipital Tendinitis and Total Knee Replacement content
3. **Created migration** - SQL script to update database

---

## 🚀 Run This Migration in Supabase

### Step 1: Go to Supabase SQL Editor
https://supabase.com/dashboard/project/lbcnvyrzzhwcstlomlbs/sql

### Step 2: Copy and Run This SQL

```sql
-- Replace all instances of Chikkadpally with Ashok Nagar

-- 1. Update site_config location
UPDATE public.site_config
SET config = jsonb_set(
  config,
  '{location}',
  '"Ashok Nagar, Hyderabad, Telangana"'::jsonb
)
WHERE config->>'location' LIKE '%Chikkadpally%' OR config->>'location' LIKE '%Chikkadapally%';

-- 2. Update medical_subsections content
UPDATE public.medical_subsections
SET 
  content = REPLACE(REPLACE(content, 'Chikkadpally', 'Ashok Nagar'), 'Chikkadapally', 'Ashok Nagar'),
  meta_description = REPLACE(REPLACE(meta_description, 'Chikkadpally', 'Ashok Nagar'), 'Chikkadapally', 'Ashok Nagar'),
  description = REPLACE(REPLACE(description, 'Chikkadpally', 'Ashok Nagar'), 'Chikkadapally', 'Ashok Nagar'),
  updated_at = NOW()
WHERE 
  content LIKE '%Chikkadpally%' OR content LIKE '%Chikkadapally%'
  OR meta_description LIKE '%Chikkadpally%' OR meta_description LIKE '%Chikkadapally%'
  OR description LIKE '%Chikkadpally%' OR description LIKE '%Chikkadapally%';

-- 3. Update testimonials
UPDATE public.testimonials
SET 
  text = REPLACE(REPLACE(text, 'Chikkadpally', 'Ashok Nagar'), 'Chikkadapally', 'Ashok Nagar'),
  response = REPLACE(REPLACE(response, 'Chikkadpally', 'Ashok Nagar'), 'Chikkadapally', 'Ashok Nagar'),
  updated_at = NOW()
WHERE 
  text LIKE '%Chikkadpally%' OR text LIKE '%Chikkadapally%'
  OR response LIKE '%Chikkadpally%' OR response LIKE '%Chikkadapally%';

-- 4. Update services
UPDATE public.services
SET 
  description = REPLACE(REPLACE(description, 'Chikkadpally', 'Ashok Nagar'), 'Chikkadapally', 'Ashok Nagar'),
  short_description = REPLACE(REPLACE(short_description, 'Chikkadpally', 'Ashok Nagar'), 'Chikkadapally', 'Ashok Nagar'),
  updated_at = NOW()
WHERE 
  description LIKE '%Chikkadpally%' OR description LIKE '%Chikkadapally%'
  OR short_description LIKE '%Chikkadpally%' OR short_description LIKE '%Chikkadapally%';
```

### Step 3: Verify Changes

After running the migration, check:
1. **Homepage footer** - Should show "Ashok Nagar, Hyderabad"
2. **Contact page** - Should show "Ashok Nagar"
3. **Treatment pages** - Should mention "Ashok Nagar"
4. **Email notifications** - Will show "Ashok Nagar"

---

## 📍 What Changed

### Before:
- Location: Chikkadpally, Hyderabad
- Serving: Chikkadpally, RTC Cross Roads, Vidhya Nagar...

### After:
- Location: Ashok Nagar, Hyderabad
- Serving: Ashok Nagar, RTC Cross Roads, Vidhya Nagar, Chikkadpally...

**Note:** Chikkadpally is still mentioned in the list of areas served, just not as the primary location.

---

## ✅ Files Updated

1. `supabase/functions/send-appointment-email/index.ts` - Email template
2. `supabase/migrations/20260413120000_add_bicipital_tendinitis_content.sql` - Treatment page
3. `supabase/migrations/20260413130000_add_total_knee_replacement_content.sql` - Treatment page
4. `supabase/migrations/20260415000000_replace_chikkadpally_with_ashok_nagar.sql` - Database update

---

## 🔍 Verify After Migration

1. **Clear browser cache** (Ctrl + Shift + Delete)
2. **Visit homepage** - Check footer location
3. **Visit Contact page** - Check address
4. **Visit treatment pages** - Check location mentions
5. **Book test appointment** - Check email shows Ashok Nagar

---

## ⏱️ Time to Complete

- Run migration: 30 seconds
- Verify changes: 2 minutes
- Total: 3 minutes

---

**Next Step:** Run the SQL migration in Supabase SQL Editor now!
