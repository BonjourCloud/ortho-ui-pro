# Merge Duplicate Rehabilitation Pages

## Issue
There are two duplicate pages under Rehabilitation:
1. "Post Op Rehabilitation" (slug: `post-op-rehabilitation`)
2. "Post-Operative Rehabilitation" (slug: `post-operative-rehabilitation`)

## Solution
Keep "Post Op Rehabilitation" and remove the duplicate "Post-Operative Rehabilitation".

## Migration
**File:** `supabase/migrations/20260415130000_merge_duplicate_rehabilitation_pages.sql`

This migration will:
1. ✅ Delete the duplicate "Post-Operative Rehabilitation" page
2. ✅ Ensure "Post Op Rehabilitation" has the correct content
3. ✅ Keep the URL: `/rehabilitation/post-op-rehabilitation`

## How to Run

1. Go to Supabase SQL Editor: https://supabase.com/dashboard/project/lbcnvyrzzhwcstlomlbs
2. Open the SQL Editor
3. Copy the contents of `supabase/migrations/20260415130000_merge_duplicate_rehabilitation_pages.sql`
4. Paste and run
5. Refresh the page to verify only one "Post Op Rehabilitation" appears

## Expected Result
- ✅ Only one page: "Post Op Rehabilitation"
- ✅ URL: https://orthocarehub.in/rehabilitation/post-op-rehabilitation
- ✅ Navigation: Rehabilitation → Post Op Rehabilitation
- ✅ No duplicate entries

---

**Status:** Migration ready to run  
**Date:** April 15, 2026
