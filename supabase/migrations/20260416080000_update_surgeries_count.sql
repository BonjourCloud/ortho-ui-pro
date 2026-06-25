-- Update surgeries count to 10000+

UPDATE public.site_config
SET config = jsonb_set(
  config,
  '{surgeriesCompleted}',
  '10000'::jsonb
)
WHERE config IS NOT NULL;
