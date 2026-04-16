# Add Images to ACL Injury Surgery Article

## Images to Upload

You need to upload 6 images to: `public/images/treatments/acl/`

### Image Files and Names:

1. **acl-tear-anatomy.jpg**
   - Description: ACL tear anatomy showing anterior cruciate ligament tear in knee joint
   - Placement: After introduction paragraph

2. **acl-injury-diagram.jpg**
   - Description: Detailed view of ACL location and tear with patella, femur, tibia labeled
   - Placement: In "Understanding ACL Injury" section (left side)

3. **acl-injury-mechanism.jpg**
   - Description: Mechanism of ACL injury showing femoral adduction, dynamic valgus, knee movements
   - Placement: In "Understanding ACL Injury" section (right side)

4. **acl-torn-vs-reconstructed.jpg**
   - Description: Torn ACL vs reconstructed ACL - before and after comparison
   - Placement: After "Diagnosis and Treatment" section

5. **acl-arthroscopic-surgery.jpg**
   - Description: Arthroscopic ACL surgery showing camera and surgical instruments
   - Placement: In "Arthroscopic ACL Reconstruction Procedure" section

6. **acl-reconstruction-steps.jpg**
   - Description: 6-step ACL reconstruction procedure showing torn ACL removal, graft placement, fixation
   - Placement: In "ACL Reconstruction Steps" section

## Steps to Add Images

### Step 1: Save the Images
Save the 6 images you shared with the exact names listed above.

### Step 2: Upload to Project
Upload all 6 images to the folder: `public/images/treatments/acl/`

### Step 3: Run the Migration
Once images are uploaded, run the migration:
`supabase/migrations/20260415090000_update_acl_injury_surgery_with_images.sql`

This will update the article content to include all the image references.

### Step 4: Deploy
```bash
git add .
git commit -m "Add ACL injury surgery images"
git push
```

## Image Layout

- **Single full-width images:** ACL tear anatomy, Torn vs Reconstructed, Arthroscopic surgery, Reconstruction steps
- **Two-column grid:** ACL injury diagram and mechanism (side by side)

All images have:
- ✅ Rounded corners (`rounded-xl`)
- ✅ Border and shadow (`border shadow-lg`)
- ✅ Proper spacing (`my-8`)
- ✅ Descriptive alt text for SEO and accessibility
- ✅ Responsive sizing (`w-full h-auto`)

## New Sections Added

The updated content includes two new sections with images:
1. **Understanding ACL Injury** - Explains what ACL is and how injuries occur
2. **Arthroscopic ACL Reconstruction Procedure** - Details the minimally invasive technique
3. **ACL Reconstruction Steps** - Shows the 6-step surgical process

## Result
The article will have professional medical illustrations showing:
1. ACL tear anatomy
2. Detailed ACL injury diagram
3. Injury mechanism
4. Before/After comparison
5. Arthroscopic surgical technique
6. Complete reconstruction procedure steps

This makes the content more engaging and helps patients understand the injury and surgical procedure better!

---

**Status:** Images ready to upload, migration ready to run  
**Date:** April 15, 2026
