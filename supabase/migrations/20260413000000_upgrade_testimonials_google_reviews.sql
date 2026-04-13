-- Upgrade testimonials table for Google Reviews
-- Add new columns for Google review integration
ALTER TABLE public.testimonials
  ADD COLUMN IF NOT EXISTS response TEXT,
  ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'google',
  ADD COLUMN IF NOT EXISTS is_published BOOLEAN DEFAULT true;

-- Rename patient_name to name for simplicity
ALTER TABLE public.testimonials RENAME COLUMN patient_name TO name;

-- Make some fields optional since Google reviews don't have all data
ALTER TABLE public.testimonials ALTER COLUMN initials DROP NOT NULL;
ALTER TABLE public.testimonials ALTER COLUMN condition DROP NOT NULL;

-- Update existing records to have source and is_published
UPDATE public.testimonials SET source = 'google', is_published = true WHERE source IS NULL;

-- Clear existing mock data
DELETE FROM public.testimonials;

-- Insert real Google reviews
INSERT INTO public.testimonials (name, rating, text, response, source, is_published, is_featured, sort_order) VALUES
('Rajiv V', 5, 'I had chronic tennis elbow for 8 years and tried treatments across North America and India. After just 3 sessions of shockwave therapy, I experienced complete recovery and can now play tennis pain-free.', NULL, 'google', true, true, 1),
('Usha Devi', 5, 'I underwent knee replacement treatment here. The doctor explained everything clearly, the care was excellent, and recovery was smooth.', 'Thank you for your kind words. We are delighted to hear about your smooth recovery and improved mobility.', 'google', true, true, 2),
('Shailaja Arutla', 5, 'I consulted for a knee problem. The doctor explained everything clearly and suggested surgery only after trying other treatments. After surgery, my pain reduced significantly.', 'We truly appreciate your trust and are glad to see your recovery progress.', 'google', true, true, 3),
('Omjee Chouhan', 5, 'I had severe shoulder pain affecting daily activities. After treatment, I experienced significant relief and now the pain is almost gone.', 'We are glad to hear your recovery has been successful.', 'google', true, true, 4),
('Minhaj Uddin', 5, 'I visited for low back pain. The doctor explained the issue clearly and suggested proper treatment.', NULL, 'google', true, true, 5),
('Koteswararao Lukalapu', 5, 'After a serious leg fracture and infection, I followed treatment and fully recovered. Now I can walk normally again.', NULL, 'google', true, true, 6);

-- Add comment
COMMENT ON COLUMN public.testimonials.response IS 'Doctor response to the review';
COMMENT ON COLUMN public.testimonials.source IS 'Source of review: google, manual, etc.';
COMMENT ON COLUMN public.testimonials.is_published IS 'Whether the review is published on the website';
