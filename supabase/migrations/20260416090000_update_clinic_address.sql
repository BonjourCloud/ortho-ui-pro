-- Update clinic name and street number in address
-- "Orthopaedic Hospital" -> "Orthopaedic & Speciality Hospital"
-- "Street No-1" -> "Street No-3"

UPDATE public.site_config
SET config = jsonb_set(
  jsonb_set(
    config,
    '{location}',
    to_jsonb(replace(replace(config->>'location', 'Orthopaedic Hospital', 'Orthopaedic & Speciality Hospital'), 'Street No-1', 'Street No-3'))
  ),
  '{clinicName}',
  '"Dr. Srivanth''s Orthopaedic & Speciality Hospital"'::jsonb
)
WHERE config IS NOT NULL;

-- Also update if location still says "Clinic" instead of "Hospital"
UPDATE public.site_config
SET config = jsonb_set(
  config,
  '{location}',
  to_jsonb(replace(replace(config->>'location', 'Orthopaedic Clinic', 'Orthopaedic & Speciality Hospital'), 'Street No-1', 'Street No-3'))
)
WHERE config IS NOT NULL AND config->>'location' LIKE '%Orthopaedic Clinic%';
