# WhatsApp Number Fix - Complete

## Problem
WhatsApp button was going to wrong number (+919876543210) instead of the correct number (+91-9441824999).

## Solution Applied

### 1. Database Migration Created
**File:** `supabase/migrations/20260415010000_update_phone_whatsapp_number.sql`

This migration updates the `site_config` table with the correct phone and WhatsApp numbers.

### 2. Code Files Updated
- ✅ `src/contexts/SiteConfigContext.tsx` - Updated default config
- ✅ `src/data/mockData.ts` - Updated mock data
- ✅ `src/pages/Index.tsx` - Updated fallback number
- ✅ `src/pages/MedicalSubsection.tsx` - Updated fallback number
- ✅ `supabase/functions/send-appointment-email/index.ts` - Updated email template

## Next Steps

### Run the Migration
1. Go to your Supabase Dashboard: https://supabase.com/dashboard/project/lbcnvyrzzhwcstlomlbs
2. Click on **SQL Editor** in the left sidebar
3. Click **New Query**
4. Copy the entire contents of `supabase/migrations/20260415010000_update_phone_whatsapp_number.sql`
5. Paste into the SQL Editor
6. Click **Run** or press `Ctrl+Enter`
7. You should see success messages showing the updated phone numbers

### Deploy the Code Changes
```bash
git add .
git commit -m "Fix WhatsApp number to +91-9441824999"
git push
```

Vercel will automatically deploy the changes.

### Verify the Fix
1. Visit https://orthocarehub.in
2. Click the WhatsApp float button (bottom right)
3. Verify it opens WhatsApp with the correct number: +91-9441824999
4. Check the "Chat on WhatsApp" buttons on treatment pages
5. Test the phone number in the footer and contact page

## Technical Details

### How WhatsApp Float Works
The `WhatsAppFloat` component pulls the number from:
1. `config.whatsapp` (from database)
2. Falls back to `config.phone` (from database)
3. Falls back to hardcoded `919441824999` (now updated)

### Database Structure
```json
{
  "phone": "+91-9441824999",
  "whatsapp": "+91-9441824999"
}
```

## Files Changed
- `supabase/migrations/20260415010000_update_phone_whatsapp_number.sql` (NEW)
- `src/contexts/SiteConfigContext.tsx`
- `src/data/mockData.ts`
- `src/pages/Index.tsx`
- `src/pages/MedicalSubsection.tsx`
- `supabase/functions/send-appointment-email/index.ts`
- `FIX_WHATSAPP_NUMBER.md` (this file)

---

**Status:** ✅ Code updated, migration ready to run
**Date:** April 15, 2026
