# Enable WhatsApp Floating Button

## Issue
The WhatsApp floating button is not visible on the website, even though the code exists.

## Cause
The button is controlled by the `whatsappFloatEnabled` flag in the database config, which is currently set to `false` or not set.

## Solution
Run the migration to enable the WhatsApp float button.

**Migration:** `supabase/migrations/20260415040000_enable_whatsapp_float.sql`

## How to Enable

1. Go to Supabase SQL Editor: https://supabase.com/dashboard/project/lbcnvyrzzhwcstlomlbs
2. Open the SQL Editor
3. Copy the contents of `supabase/migrations/20260415040000_enable_whatsapp_float.sql`
4. Paste and run
5. Refresh your website: https://orthocarehub.in

## Expected Result
✅ A green WhatsApp button will appear at the bottom-right corner of all pages  
✅ Clicking it opens WhatsApp with the message: "Hi Doctor, I'd like to book a consultation."  
✅ It links to: +91-9441824999  

## Button Features
- **Position:** Fixed at bottom-right (6 units from bottom and right)
- **Color:** WhatsApp green (#25D366)
- **Size:** 56px × 56px (w-14 h-14)
- **Animation:** Scales up 10% on hover
- **Icon:** WhatsApp message circle icon
- **Z-index:** 50 (appears above most content)

## To Disable Later (if needed)
If you want to hide the button in the future, run:
```sql
UPDATE public.site_config
SET config = jsonb_set(
  config,
  '{whatsappFloatEnabled}',
  'false'::jsonb
);
```

---

**Status:** Migration ready to run  
**Date:** April 15, 2026
