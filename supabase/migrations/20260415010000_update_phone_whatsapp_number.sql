-- Update phone and WhatsApp number to +91-9441824999

-- 1. Update site_config with correct phone and WhatsApp numbers
UPDATE public.site_config
SET config = jsonb_set(
  jsonb_set(
    config,
    '{phone}',
    '"+91-9441824999"'::jsonb
  ),
  '{whatsapp}',
  '"+91-9441824999"'::jsonb
)
WHERE config IS NOT NULL;

-- Verify the changes
DO $$
DECLARE
  current_phone TEXT;
  current_whatsapp TEXT;
BEGIN
  SELECT config->>'phone', config->>'whatsapp' 
  INTO current_phone, current_whatsapp
  FROM public.site_config
  LIMIT 1;
  
  RAISE NOTICE 'Phone number updated to: %', current_phone;
  RAISE NOTICE 'WhatsApp number updated to: %', current_whatsapp;
END $$;
