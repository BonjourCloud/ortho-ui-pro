# Add Images to Rotator Cuff Tears Article

## Images to Upload

You need to upload 6 images to: `public/images/treatments/rotator-cuff/`

### Image Files and Names:

1. **rotator-cuff-anatomy.jpg**
   - Description: Rotator cuff tear anatomy showing supraspinatus, subscapularis, deltoid muscles
   - Placement: After "Understanding Rotator Cuff Tears" section

2. **rotator-cuff-tear-types.jpg**
   - Description: Types of rotator cuff tears - normal, partial thickness articular, bursal side, intrasubstance
   - Placement: In new "Types of Rotator Cuff Tears" section

3. **torn-rotator-cuff.jpg**
   - Description: Torn rotator cuff showing supraspinatus and infraspinatus tear with tendon fibre direction
   - Placement: After "Symptoms" section

4. **arthroscopic-surgery.jpg**
   - Description: Minimally invasive arthroscopy showing camera, cannula, arthroscope, shaver
   - Placement: In new "Minimally Invasive Arthroscopic Surgery" section

5. **repair-procedure.jpg**
   - Description: 4-step rotator cuff repair procedure showing anchor insertion and double row repair
   - Placement: In new "Rotator Cuff Repair Procedure" section

6. **before-after-repair.jpg**
   - Description: Fully torn rotator cuff repair - before and after comparison
   - Placement: In new "Before and After Rotator Cuff Repair" section

## Steps to Add Images

### Step 1: Save the Images
Save the 6 images you shared with the exact names listed above.

### Step 2: Upload to Project
Upload all 6 images to the folder: `public/images/treatments/rotator-cuff/`

### Step 3: Run the Migration
Once images are uploaded, run the migration:
`supabase/migrations/20260415110000_update_rotator_cuff_tears_with_images.sql`

This will update the article content to include all the image references.

### Step 4: Deploy
```bash
git add .
git commit -m "Add rotator cuff tears images"
git push
```

## Image Layout

All images are displayed as single full-width images with:
- ✅ Rounded corners (`rounded-xl`)
- ✅ Border and shadow (`border shadow-lg`)
- ✅ Proper spacing (`my-8`)
- ✅ Descriptive alt text for SEO and accessibility
- ✅ Responsive sizing (`w-full h-auto`)

## New Sections Added

The updated content includes four new sections with images:
1. **Types of Rotator Cuff Tears** - Shows different tear classifications
2. **Minimally Invasive Arthroscopic Surgery** - Explains the surgical technique
3. **Rotator Cuff Repair Procedure** - Details the 4-step repair process
4. **Before and After Rotator Cuff Repair** - Shows surgical outcomes

## Result
The article will have professional medical illustrations showing:
1. Rotator cuff anatomy and muscles
2. Different types of tears
3. Torn rotator cuff visualization
4. Arthroscopic surgical technique
5. Step-by-step repair procedure
6. Before/after surgical results

This makes the content more engaging and helps patients understand the condition and treatment options better!

---

**Status:** Images ready to upload, migration ready to run  
**Date:** April 15, 2026
