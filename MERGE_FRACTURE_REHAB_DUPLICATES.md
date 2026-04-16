# Merge Duplicate Fracture Rehab Pages

## Issue
There are two duplicate pages under Rehabilitation:
1. "Post Fractures Rehab" (slug: `post-fractures-rehab`)
2. "Post Fracture Rehab" (slug: `post-fracture-rehab`)

## Solution
Keep "Post Fractures Rehab" and remove the duplicate "Post Fracture Rehab".

## Migration
**File:** `supabase/migrations/20260415150000_merge_duplicate_fracture_rehab_pages.sql`

This migration will:
1. ✅ Delete the duplicate "Post Fracture Rehab" page
2. ✅ Ensure "Post Fractures Rehab" has the correct content
3. ✅ Keep the URL: `/rehabilitation/post-fractures-rehab`

## How to Run

1. Go to Supabase SQL Editor: https://supabase.com/dashboard/project/lbcnvyrzzhwcstlomlbs
2. Open the SQL Editor
3. Copy the contents of `supabase/migrations/20260415150000_merge_duplicate_fracture_rehab_pages.sql`
4. Paste and run
5. Refresh the page to verify only one "Post Fractures Rehab" appears

## Expected Result
- ✅ Only one page: "Post Fractures Rehab"
- ✅ URL: https://orthocarehub.in/rehabilitation/post-fractures-rehab
- ✅ Navigation: Rehabilitation → Post Fractures Rehab
- ✅ No duplicate entries

---

**Status:** Migration ready to run  
**Date:** April 15, 2026
