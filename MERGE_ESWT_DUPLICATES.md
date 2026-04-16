# Merge Duplicate ESWT Pages

## Issue
Two Extracorporeal Shockwave Therapy pages exist under Physiotherapy:
- One empty page (created initially)
- One with full content (just added)

## Solution
Created merge migration to:
1. Find the ESWT page with content (longer content length)
2. Delete any duplicate empty pages
3. Update the remaining page with the latest content
4. Keep only one ESWT page under Physiotherapy

## Migration File
`supabase/migrations/20260415170000_merge_duplicate_eswt_pages.sql`

## Steps to Fix

### Step 1: Commit and Push
```bash
git add supabase/migrations/20260415170000_merge_duplicate_eswt_pages.sql MERGE_ESWT_DUPLICATES.md
git commit -m "Merge duplicate ESWT pages under Physiotherapy"
git push
```

### Step 2: Run the Merge Migration
1. Go to Supabase SQL Editor: https://supabase.com/dashboard/project/lbcnvyrzzhwcstlomlbs/sql/new
2. Copy the contents of `supabase/migrations/20260415170000_merge_duplicate_eswt_pages.sql`
3. Paste and run the SQL
4. Look for success messages:
   - "✓ Merged duplicate ESWT pages. Deleted X duplicate(s)"
   - "✓ Updated ESWT page with ID: [uuid]"

### Step 3: Verify
Visit: https://orthocarehub.in/physiotherapy/extracorporeal-shockwave-therapy

Should see only ONE page with full content.

## What the Migration Does

1. **Finds the page with content:** Identifies the ESWT page with the longest content (the one with actual article text)
2. **Deletes duplicates:** Removes any other ESWT pages with the same slug
3. **Updates the keeper:** Ensures the remaining page has the latest full content
4. **Fallback:** If no page exists, creates a new one with content

## Result
- ✅ Only one ESWT page under Physiotherapy
- ✅ Full content with all sections
- ✅ Proper location (Ashok Nagar primary, Chikkadpally in areas served)
- ✅ Clean navigation without duplicates

---

**Status:** Merge migration ready to run  
**Date:** April 16, 2026
