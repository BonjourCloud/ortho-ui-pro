# Run Total Knee Replacement Content Migration

## Quick Steps to Update the Content

### Option 1: Using Supabase Dashboard (Easiest)

1. **Go to Supabase SQL Editor**
   - Visit: https://supabase.com/dashboard/project/lbcnvyrzzhwcstlomlbs/sql
   - Login with your account

2. **Copy the SQL**
   - Open the file: `supabase/migrations/20260413130000_add_total_knee_replacement_content.sql`
   - Copy all the content

3. **Run the Migration**
   - Paste the SQL into the SQL Editor
   - Click "Run" button
   - You should see: "Total Knee Replacement content added/updated successfully"

4. **Verify**
   - Go to: https://orthocarehub.in/orthopaedics/knee-pain-services
   - Click on "Total Knee Replacement"
   - You should see the new content

---

### Option 2: Using Supabase CLI (If you have it installed)

```bash
# Make sure you're in the project directory
cd /c/Code/ortho-ui-pro

# Run the migration
supabase db push
```

---

## What This Migration Does

✅ Creates/Updates "Total Knee Replacement" page under:
- **Orthopaedics** → **Knee Pain Services** → **Total Knee Replacement**

✅ Adds complete content including:
- What is Total Knee Replacement Surgery
- Who is a Candidate
- Treatment Process
- Why Choose Dr. Srivanth's Clinic
- Call to Action

✅ SEO optimized with:
- Meta title
- Meta description
- Proper heading structure
- Local keywords (Chikkadpally, Hyderabad areas)

---

## After Running the Migration

The page will be immediately available at:
**https://orthocarehub.in/orthopaedics/total-knee-replacement**

And accessible via navigation:
**Orthopaedics** → **Knee Pain Services** → **Total Knee Replacement**

---

## Troubleshooting

**If you see "Knee Pain Services subsection not found":**
1. First run the earlier migration: `20260413100000_create_medical_sections.sql`
2. Then run this migration again

**If content doesn't appear:**
1. Clear browser cache (Ctrl + Shift + R)
2. Check Supabase logs for errors
3. Verify the migration ran successfully

---

## Need Help?

Let me know if you encounter any issues running the migration!
