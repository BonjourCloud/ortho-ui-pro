# How to Add Images to Treatment Pages

## ✅ Image Support Added!

I've updated the Total Knee Replacement page to include your infographic image.

---

## Step 1: Add Your Image File

### Option A: Add to Project (Recommended)

1. **Save your image:**
   - Location: `public/images/treatments/`
   - Filename: `total-knee-replacement-process.jpg` (or .png)

2. **Commit and deploy:**
   ```bash
   git add public/images/treatments/total-knee-replacement-process.jpg
   git commit -m "Add Total Knee Replacement process image"
   git push
   ```

### Option B: Use Supabase Storage

1. Go to Supabase Dashboard → Storage
2. Create bucket: `treatment-images` (make it public)
3. Upload your image
4. Get the public URL
5. Update the migration to use that URL instead

---

## Step 2: Run the Updated Migration

The migration now includes the image tag. Run it in Supabase SQL Editor:

1. Go to: https://supabase.com/dashboard/project/lbcnvyrzzhwcstlomlbs/sql
2. Copy content from: `supabase/migrations/20260413130000_add_total_knee_replacement_content.sql`
3. Run it
4. Refresh the page

---

## Image Placement

The image will appear:
- **After:** "What is Total Knee Replacement Surgery?" section
- **Before:** "Who is a Candidate for Total Knee Replacement?" section
- **Styling:** Full width, rounded corners, shadow, responsive

---

## Image Specifications

### Recommended:
- **Width:** 1200px (will scale down on mobile)
- **Format:** JPG or PNG
- **File size:** Under 500KB (optimize with TinyPNG.com)
- **Aspect ratio:** 16:9 or similar

### Your Current Image:
- Shows 6-step process of knee replacement
- Perfect for patient education
- Professional medical illustration

---

## Adding More Images

You can add multiple images to any treatment page. Just add more image tags in the content:

```html
<div class="my-8 rounded-xl overflow-hidden border shadow-lg">
  <img src="/images/treatments/your-image.jpg" alt="Description" class="w-full h-auto" />
</div>
```

### Image Positions:
- **Hero image:** At the top (after intro paragraph)
- **Process diagram:** After "What is..." section
- **Before/After:** In treatment section
- **Facility photos:** At the bottom

---

## Example: Adding Multiple Images

```html
<!-- Hero image -->
<div class="my-8 rounded-xl overflow-hidden border shadow-lg">
  <img src="/images/treatments/knee-replacement-hero.jpg" alt="Total Knee Replacement Surgery" class="w-full h-auto" />
</div>

<!-- Process diagram -->
<div class="my-8 rounded-xl overflow-hidden border shadow-lg">
  <img src="/images/treatments/total-knee-replacement-process.jpg" alt="6 Steps of Knee Replacement" class="w-full h-auto" />
</div>

<!-- Before/After comparison -->
<div class="grid md:grid-cols-2 gap-4 my-8">
  <div class="rounded-xl overflow-hidden border shadow-lg">
    <img src="/images/treatments/before-surgery.jpg" alt="Before Surgery" class="w-full h-auto" />
    <p class="text-center py-2 text-sm font-semibold">Before Surgery</p>
  </div>
  <div class="rounded-xl overflow-hidden border shadow-lg">
    <img src="/images/treatments/after-surgery.jpg" alt="After Surgery" class="w-full h-auto" />
    <p class="text-center py-2 text-sm font-semibold">After Surgery</p>
  </div>
</div>
```

---

## Image Optimization Tips

1. **Compress images:** Use TinyPNG.com or Squoosh.app
2. **Resize:** Don't upload 4000px images, resize to 1200px width
3. **Format:** Use JPG for photos, PNG for diagrams with text
4. **Alt text:** Always include descriptive alt text for SEO

---

## Current Status

✅ Migration updated with image tag
✅ Folder created: `public/images/treatments/`
✅ Image styling: Responsive, rounded, shadow
⏳ **Next:** Add your image file to the folder

---

## Need Help?

Let me know if you want to:
- Add more images to this page
- Add images to other treatment pages
- Use a different image hosting solution
- Adjust image sizing or positioning
