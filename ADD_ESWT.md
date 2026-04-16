# Add Extracorporeal Shockwave Therapy (ESWT) Content

## Overview
Added comprehensive content for Extracorporeal Shockwave Therapy under the Physiotherapy section.

## Content Details

**Location:** Physiotherapy → Extracorporeal Shockwave Therapy  
**URL:** `/physiotherapy/extracorporeal-shockwave-therapy`  
**Clinic Location:** Ashok Nagar (primary), serving Chikkadpally and surrounding areas

## Content Sections

### 1. Introduction
- Overview of ESWT as a non-invasive treatment for chronic pain
- Clinic location and areas served
- Dr. Dasari Srivanth's expertise

### 2. What is ESWT?
- Explanation of high-energy acoustic wave therapy
- How it stimulates healing in soft tissues
- Mechanism: promotes blood flow, reduces inflammation, facilitates tissue regeneration

### 3. Conditions Treated (8 conditions)
- Plantar Fasciitis
- Tennis Elbow
- Golfer's Elbow
- Calcific Tendinitis
- Trigger Finger
- Chronic Low Back Pain
- Achilles Tendinitis
- Patellar Tendinitis (Jumper's Knee)

### 4. Benefits of ESWT (5 benefits)
- Non-invasive with minimal discomfort
- Effective in reducing chronic pain
- Improves mobility and function
- Eliminates need for surgery or medications
- Faster healing time vs traditional therapies

### 5. Why Choose Dr. Srivanth's Clinic (5 reasons)
- Experienced physician
- Advanced technology
- Personalized treatment plans
- Compassionate care
- Convenient location in Ashok Nagar

### 6. Call to Action
- Schedule appointment
- Contact information

## Migration File
`supabase/migrations/20260415160000_add_eswt_content.sql`

## Steps to Deploy

### Step 1: Commit the Migration
```bash
git add supabase/migrations/20260415160000_add_eswt_content.sql
git commit -m "Add ESWT content under Physiotherapy section"
git push
```

### Step 2: Run the Migration
1. Go to Supabase SQL Editor: https://supabase.com/dashboard/project/lbcnvyrzzhwcstlomlbs/sql/new
2. Copy the contents of `supabase/migrations/20260415160000_add_eswt_content.sql`
3. Paste and run the SQL
4. Verify success message: "✓ Extracorporeal Shockwave Therapy content added/updated successfully"

### Step 3: Verify on Website
Visit: https://orthocarehub.in/physiotherapy/extracorporeal-shockwave-therapy

## Content Format
- ✅ Proper HTML structure with Tailwind CSS classes
- ✅ H2 headings for sections (`text-2xl font-bold mt-8 mb-4`)
- ✅ Bullet points with proper spacing (`list-disc pl-6 mb-6 space-y-2`)
- ✅ Bold text for emphasis (`<strong>`)
- ✅ Consistent paragraph spacing (`mb-6`)
- ✅ Location: Ashok Nagar (primary), Chikkadpally in areas served

## Notes
- No images required for this article (text-only content)
- Content follows same format as other treatment pages
- All location references updated to Ashok Nagar as primary location
- Chikkadpally listed in areas served

---

**Status:** Migration created, ready to commit and run  
**Date:** April 16, 2026
