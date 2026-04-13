-- Add support for nested subsections (3-level hierarchy)
-- Level 1: Section (Orthopaedics)
-- Level 2: Category (Shoulder Pain)
-- Level 3: Treatment (Bicipital Tendinitis)

-- Add parent_id to medical_subsections to support nesting
ALTER TABLE public.medical_subsections
  ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES public.medical_subsections(id) ON DELETE CASCADE;

-- Add level indicator
ALTER TABLE public.medical_subsections
  ADD COLUMN IF NOT EXISTS level INTEGER DEFAULT 1;

-- Add index for parent lookups
CREATE INDEX IF NOT EXISTS idx_medical_subsections_parent_id ON public.medical_subsections(parent_id);

-- Update existing subsections to be level 1 (categories)
UPDATE public.medical_subsections SET level = 1 WHERE level IS NULL OR level = 1;

-- Comments
COMMENT ON COLUMN public.medical_subsections.parent_id IS 'Parent subsection ID for nested structure (NULL for top-level)';
COMMENT ON COLUMN public.medical_subsections.level IS 'Nesting level: 1 = category (Shoulder Pain), 2 = treatment (Bicipital Tendinitis)';

-- Example: Add nested subsections under Shoulder Pain
DO $$
DECLARE
  ortho_id UUID;
  shoulder_pain_id UUID;
BEGIN
  -- Get orthopaedics section ID
  SELECT id INTO ortho_id FROM public.medical_sections WHERE slug = 'orthopaedics';
  
  -- Get Shoulder Pain subsection ID
  SELECT id INTO shoulder_pain_id FROM public.medical_subsections 
  WHERE section_id = ortho_id AND slug = 'shoulder-pain';
  
  -- Add nested subsections under Shoulder Pain (Level 2)
  IF shoulder_pain_id IS NOT NULL THEN
    INSERT INTO public.medical_subsections (
      section_id, 
      parent_id, 
      name, 
      slug, 
      description, 
      level,
      sort_order
    ) VALUES
    (ortho_id, shoulder_pain_id, 'Bicipital Tendinitis', 'bicipital-tendinitis', 'Inflammation of the biceps tendon', 2, 1),
    (ortho_id, shoulder_pain_id, 'Frozen Shoulder', 'frozen-shoulder', 'Adhesive capsulitis treatment', 2, 2),
    (ortho_id, shoulder_pain_id, 'Rotator Cuff Tears', 'rotator-cuff-tears', 'Rotator cuff injury treatment', 2, 3),
    (ortho_id, shoulder_pain_id, 'Shoulder Dislocation', 'shoulder-dislocation', 'Shoulder instability treatment', 2, 4),
    (ortho_id, shoulder_pain_id, 'Shoulder Impingement', 'shoulder-impingement', 'Impingement syndrome treatment', 2, 5),
    (ortho_id, shoulder_pain_id, 'SLAP Lesion', 'slap-lesion', 'Superior labrum tear treatment', 2, 6)
    ON CONFLICT DO NOTHING;
  END IF;
END $$;
