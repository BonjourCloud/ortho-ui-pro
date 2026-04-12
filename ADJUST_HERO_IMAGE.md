# 🖼️ Adjust Hero Image Position

## ✅ What I Fixed

I've added `object-position: center 30%` to the hero image, which will move the image up slightly so the face is more centered.

## 🔄 See the Changes

### Step 1: Deploy
```bash
git add .
git commit -m "Adjust hero image position to center face"
git push
```

### Step 2: Wait for Deployment
- Vercel will auto-deploy in 2-3 minutes

### Step 3: Check the Result
- Visit: https://orthocarehub.in
- The doctor's face should now be more centered
- Top of head should be visible

---

## 🎨 Fine-Tune the Position

If the face still isn't perfectly centered, you can adjust the percentage:

### Current Setting:
```css
object-position: center 30%
```

### Adjust the Vertical Position:

**To show more of the top (face higher):**
```css
object-position: center 20%  /* Shows more top */
object-position: center 25%  /* Slightly more top */
```

**To show more of the bottom (face lower):**
```css
object-position: center 35%  /* Shows more bottom */
object-position: center 40%  /* Even more bottom */
```

**Perfect center:**
```css
object-position: center 50%  /* Exact center */
```

### How to Adjust:

1. **Edit:** `src/pages/Index.tsx`
2. **Find:** Line with `style={{ objectPosition: 'center 30%' }}`
3. **Change:** The `30%` to a different value
4. **Test:** Deploy and check
5. **Repeat:** Until perfect

---

## 🎯 Understanding Object Position

The `object-position` property has two values:
- **First value (horizontal):** `center` = horizontally centered
- **Second value (vertical):** `30%` = 30% from the top

**Examples:**
- `center 0%` = Top of image visible
- `center 25%` = Upper portion visible
- `center 30%` = Face area visible (current)
- `center 50%` = Exact center
- `center 75%` = Lower portion visible
- `center 100%` = Bottom of image visible

---

## 🖼️ Alternative: Use a Better Cropped Image

Instead of adjusting position, you can:

### Option 1: Crop the Image Properly

1. **Open image in editor** (Photoshop, Canva, etc.)
2. **Crop to 4:3 ratio** (e.g., 1200 x 900 px)
3. **Center the face** in the crop
4. **Save and upload** to your site
5. **Update URL** in Admin → Settings → Doctor Photo URL

### Option 2: Use a Portrait Orientation

If the current image is too wide:
1. **Take/use a portrait photo** (vertical orientation)
2. **Crop to 4:3** with face centered
3. **Upload and update** URL

---

## 🧪 Test Different Positions

Try these values to see which looks best:

```css
/* More top visible (good if face is cut off) */
object-position: center 20%

/* Balanced (current) */
object-position: center 30%

/* More centered */
object-position: center 40%

/* Exact center */
object-position: center 50%
```

---

## 📝 Quick Edit Guide

### File: `src/pages/Index.tsx`

**Find this line (around line 49):**
```tsx
<img src={config.heroImageUrl || heroImage} 
     alt={`${config.doctorName} - Orthopedic Surgeon`} 
     className="rounded-2xl shadow-2xl w-full object-cover object-center aspect-[4/3]" 
     style={{ objectPosition: 'center 30%' }} />
```

**Change the percentage:**
```tsx
style={{ objectPosition: 'center 25%' }}  // Try different values
```

### File: `src/pages/About.tsx`

**Same change needed here too** (around line 24)

---

## 🎨 Best Practices

### For Best Results:

1. **Use properly cropped image:**
   - Crop to 4:3 ratio (1200 x 900 px)
   - Center the face in the crop
   - Leave some space above head

2. **Optimal framing:**
   - Face should be in upper-middle area
   - Include shoulders and upper body
   - Leave 10-15% space above head

3. **Professional photo tips:**
   - Good lighting
   - Clean background
   - Professional attire
   - Friendly expression
   - High resolution (at least 1200px wide)

---

## ✅ Current Status

**Setting:** `object-position: center 30%`

**Effect:**
- Image is positioned 30% from the top
- Face should be more visible
- Top of head should show

**If not perfect:**
- Try `center 25%` for more top
- Try `center 35%` for more bottom
- Or crop the image properly

---

## 🚀 Deploy and Test

1. **Commit changes:**
   ```bash
   git add .
   git commit -m "Adjust hero image position"
   git push
   ```

2. **Wait for deployment** (2-3 minutes)

3. **Check result** at https://orthocarehub.in

4. **Adjust if needed** and redeploy

---

**The image position is now adjusted - deploy to see the result!** 🖼️
