# Add Images to Total Hip Replacement Article

## Images to Upload

You need to upload 6 images to: `public/images/treatments/hip/`

### Image Files and Names:

1. **hip-joint-anatomy.jpg**
   - Description: Hip joint anatomy showing acetabulum, femoral head, joint capsule
   - Placement: After introduction paragraph

2. **hip-osteoarthritis.jpg**
   - Description: Healthy hip vs hip with osteoarthritis, worn cartilage, bone spurs
   - Placement: After "What is Total Hip Replacement Surgery?" section (left side)

3. **hip-arthritis-damage.jpg**
   - Description: Hip arthritis damage showing destroyed cartilage and narrowed joint space
   - Placement: After "What is Total Hip Replacement Surgery?" section (right side)

4. **hip-replacement-before-after.jpg**
   - Description: X-ray before and after showing successful implant placement
   - Placement: After "Who is a Candidate?" section

5. **hip-replacement-components.jpg**
   - Description: Hip replacement implant components (acetabular component, plastic liner, femoral head, stem)
   - Placement: In new "Understanding Hip Replacement Components" section

6. **hip-replacement-procedure.jpg**
   - Description: Before and after procedure showing damaged joint replaced with implant
   - Placement: In new "The Hip Replacement Procedure" section

## Steps to Add Images

### Step 1: Save the Images
Save the 6 images you shared with the exact names listed above.

### Step 2: Upload to Project
Upload all 6 images to the folder: `public/images/treatments/hip/`

You can do this by:
- Copying the images directly into the folder in your project
- Or using your file manager to place them there

### Step 3: Run the Migration
Once images are uploaded, run the migration:
`supabase/migrations/20260415070000_update_total_hip_replacement_with_images.sql`

This will update the article content to include all the image references.

### Step 4: Deploy
```bash
git add .
git commit -m "Add hip replacement images"
git push
```

## Image Layout

- **Single full-width images:** Hip anatomy, Before/After X-ray
- **Two-column grid:** Osteoarthritis comparison images (side by side)
- **Single full-width images:** Components diagram, Procedure illustration

All images have:
- ✅ Rounded corners (`rounded-xl`)
- ✅ Border and shadow (`border shadow-lg`)
- ✅ Proper spacing (`my-8`)
- ✅ Descriptive alt text for SEO and accessibility
- ✅ Responsive sizing (`w-full h-auto`)

## Result
The article will have professional medical illustrations showing:
1. Hip joint anatomy
2. Arthritis damage comparison
3. Before/After X-rays
4. Implant components
5. Surgical procedure visualization

This makes the content more engaging and helps patients understand the procedure better!

---

**Status:** Images ready to upload, migration ready to run  
**Date:** April 15, 2026
