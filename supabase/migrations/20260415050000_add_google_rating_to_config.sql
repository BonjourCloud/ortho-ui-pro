-- Add Google rating and review count to site config

UPDATE public.site_config
SET config = jsonb_set(
  jsonb_set(
    config,
    '{googleRating}',
    '4.9'::jsonb
  ),
  '{googleReviewCount}',
  '500'::jsonb
)
WHERE config IS NOT NULL;

-- Verify the changes
DO $$
DECLARE
  rating NUMERIC;
  review_count INTEGER;
BEGIN
  SELECT (config->>'googleRating')::numeric, (config->>'googleReviewCount')::integer
  INTO rating, review_count
  FROM public.site_config
  LIMIT 1;
  
  RAISE NOTICE '✓ Google Rating: %', rating;
  RAISE NOTICE '✓ Google Review Count: %+', review_count;
  RAISE NOTICE '';
  RAISE NOTICE 'This will display as: "% / 5 based on %+ Google reviews"', rating, review_count;
END $$;
