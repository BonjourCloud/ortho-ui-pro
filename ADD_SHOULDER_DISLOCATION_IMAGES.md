# Add Images to Shoulder Dislocation Article

## Images to Upload

Save the 3 images you shared to: `public/images/treatments/shoulder-dislocation/`

### Image Files and Names:

1. **bankart-lesion.jpg**
   - The image showing Bankart lesion (before) and result of surgical operation (after)
   - Two side-by-side diagrams of the glenoid socket

2. **latarjet-procedure.jpg**
   - The image showing the Latarjet procedure in 3 steps
   - Arthroscopy technique adapted by Professor Pascal Boileau

3. **shoulder-anatomy.jpg**
   - The image showing normal shoulder vs anterior/posterior dislocation
   - Three diagrams: ÉPAULE NORMALE, LUXATION ANTÉRIEURE, LUXATION POSTÉRIEURE

## Steps

### Step 1: Save the Images
Save the 3 images from this conversation with the exact filenames above into:
`public/images/treatments/shoulder-dislocation/`

### Step 2: Commit and Push
```bash
git add public/images/treatments/shoulder-dislocation/
git commit -m "Add shoulder dislocation images"
git push
```

### Step 3: Run the Migration
1. Go to Supabase SQL Editor: https://supabase.com/dashboard/project/lbcnvyrzzhwcstlomlbs/sql/new
2. Copy and run: `supabase/migrations/20260416030000_update_shoulder_dislocation_content.sql`
3. Look for: "✓ Shoulder Dislocation content updated successfully"

### Step 4: Verify
Visit: https://orthocarehub.in/orthopaedics/shoulder-dislocation
