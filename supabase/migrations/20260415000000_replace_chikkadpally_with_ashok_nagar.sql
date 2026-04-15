-- Replace all instances of Chikkadpally with Ashok Nagar

-- 1. Update site_config location
UPDATE public.site_config
SET config = jsonb_set(
  config,
  '{location}',
  '"Ashok Nagar, Hyderabad, Telangana"'::jsonb
)
WHERE config->>'location' LIKE '%Chikkadpally%' OR config->>'location' LIKE '%Chikkadapally%';

-- 2. Update medical_subsections content (Total Knee Replacement)
UPDATE public.medical_subsections
SET 
  content = REPLACE(REPLACE(content, 'Chikkadpally', 'Ashok Nagar'), 'Chikkadapally', 'Ashok Nagar'),
  meta_description = REPLACE(REPLACE(meta_description, 'Chikkadpally', 'Ashok Nagar'), 'Chikkadapally', 'Ashok Nagar'),
  description = REPLACE(REPLACE(description, 'Chikkadpally', 'Ashok Nagar'), 'Chikkadapally', 'Ashok Nagar'),
  updated_at = NOW()
WHERE 
  content LIKE '%Chikkadpally%' OR content LIKE '%Chikkadapally%'
  OR meta_description LIKE '%Chikkadpally%' OR meta_description LIKE '%Chikkadapally%'
  OR description LIKE '%Chikkadpally%' OR description LIKE '%Chikkadapally%';

-- 3. Update any testimonials or other content
UPDATE public.testimonials
SET 
  text = REPLACE(REPLACE(text, 'Chikkadpally', 'Ashok Nagar'), 'Chikkadapally', 'Ashok Nagar'),
  response = REPLACE(REPLACE(response, 'Chikkadpally', 'Ashok Nagar'), 'Chikkadapally', 'Ashok Nagar'),
  updated_at = NOW()
WHERE 
  text LIKE '%Chikkadpally%' OR text LIKE '%Chikkadapally%'
  OR response LIKE '%Chikkadpally%' OR response LIKE '%Chikkadapally%';

-- 4. Update services if they exist
UPDATE public.services
SET 
  description = REPLACE(REPLACE(description, 'Chikkadpally', 'Ashok Nagar'), 'Chikkadapally', 'Ashok Nagar'),
  short_description = REPLACE(REPLACE(short_description, 'Chikkadpally', 'Ashok Nagar'), 'Chikkadapally', 'Ashok Nagar'),
  updated_at = NOW()
WHERE 
  description LIKE '%Chikkadpally%' OR description LIKE '%Chikkadapally%'
  OR short_description LIKE '%Chikkadpally%' OR short_description LIKE '%Chikkadapally%';

-- Verify the changes
DO $$
BEGIN
  RAISE NOTICE 'Location update complete: Chikkadpally → Ashok Nagar';
  RAISE NOTICE 'Updated tables: site_config, medical_subsections, testimonials, services';
END $$;
