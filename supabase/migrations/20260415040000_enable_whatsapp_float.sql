-- Enable WhatsApp floating button

UPDATE public.site_config
SET config = jsonb_set(
  config,
  '{whatsappFloatEnabled}',
  'true'::jsonb
)
WHERE config IS NOT NULL;

-- Verify the change
DO $$
DECLARE
  is_enabled BOOLEAN;
BEGIN
  SELECT (config->>'whatsappFloatEnabled')::boolean 
  INTO is_enabled
  FROM public.site_config
  LIMIT 1;
  
  IF is_enabled THEN
    RAISE NOTICE '✓ WhatsApp float button is now ENABLED';
  ELSE
    RAISE NOTICE '✗ WhatsApp float button is still DISABLED';
  END IF;
  
  RAISE NOTICE '';
  RAISE NOTICE 'The green WhatsApp button will appear at the bottom-right corner of all pages';
END $$;
