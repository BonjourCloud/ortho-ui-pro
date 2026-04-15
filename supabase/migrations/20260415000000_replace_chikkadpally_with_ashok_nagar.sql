-- Replace all instances of Chikkadpally with Ashok Nagar

-- 1. Update site_config location
UPDATE public.site_config
SET config = jsonb_set(
  config,
  '{location}',
  '"Ashok Nagar, Hyderabad, Telangana"'::jsonb
)
WHERE config->>'location' LIKE '%Chikkadpally%' OR config->>'location' LIKE '%Chikkadapally%';

-- 2. Update medical_subsections content (only columns that exist)
UPDATE public.medical_subsections
SET 
  content = REPLACE(REPLACE(content, 'Chikkadpally', 'Ashok Nagar'), 'Chikkadapally', 'Ashok Nagar'),
  updated_at = NOW()
WHERE 
  content LIKE '%Chikkadpally%' OR content LIKE '%Chikkadapally%';

-- 3. Update any testimonials or other content
UPDATE public.testimonials
SET 
  text = REPLACE(REPLACE(text, 'Chikkadpally', 'Ashok Nagar'), 'Chikkadapally', 'Ashok Nagar'),
  response = CASE 
    WHEN response IS NOT NULL THEN REPLACE(REPLACE(response, 'Chikkadpally', 'Ashok Nagar'), 'Chikkadapally', 'Ashok Nagar')
    ELSE response
  END,
  updated_at = NOW()
WHERE 
  text LIKE '%Chikkadpally%' OR text LIKE '%Chikkadapally%'
  OR (response IS NOT NULL AND (response LIKE '%Chikkadpally%' OR response LIKE '%Chikkadapally%'));

-- 4. Update services if they exist (only if table exists)
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'services') THEN
    UPDATE public.services
    SET 
      short_description = REPLACE(REPLACE(short_description, 'Chikkadpally', 'Ashok Nagar'), 'Chikkadapally', 'Ashok Nagar'),
      updated_at = NOW()
    WHERE 
      short_description LIKE '%Chikkadpally%' OR short_description LIKE '%Chikkadapally%';
  END IF;
END $$;

-- Verify the changes
DO $$
BEGIN
  RAISE NOTICE 'Location update complete: Chikkadpally → Ashok Nagar';
  RAISE NOTICE 'Updated tables: site_config, medical_subsections, testimonials, services';
END $$;
