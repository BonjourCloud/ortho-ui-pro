
-- Blog posts table
CREATE TABLE public.blog_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  excerpt TEXT,
  content TEXT NOT NULL,
  category TEXT,
  tags TEXT[] DEFAULT '{}',
  read_time INTEGER DEFAULT 5,
  views_count INTEGER DEFAULT 0,
  likes_count INTEGER DEFAULT 0,
  is_featured BOOLEAN DEFAULT FALSE,
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.blog_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read blog posts"
  ON public.blog_posts FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert blog posts"
  ON public.blog_posts FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update blog posts"
  ON public.blog_posts FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can delete blog posts"
  ON public.blog_posts FOR DELETE
  TO authenticated
  USING (true);

-- Case studies table
CREATE TABLE public.case_studies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  patient_initials TEXT,
  age INTEGER,
  gender TEXT,
  occupation TEXT,
  condition TEXT NOT NULL,
  procedure_name TEXT,
  surgery_date DATE,
  surgery_type TEXT,
  hospital_stay_days INTEGER,
  follow_up_period TEXT,
  outcome_summary TEXT,
  pain_score_pre INTEGER,
  pain_score_post INTEGER,
  range_of_motion_pre TEXT,
  range_of_motion_post TEXT,
  testimonial TEXT,
  return_to_work TEXT,
  return_to_sports TEXT,
  is_featured BOOLEAN DEFAULT FALSE,
  milestones JSONB DEFAULT '[]',
  published_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.case_studies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read case studies"
  ON public.case_studies FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert case studies"
  ON public.case_studies FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update case studies"
  ON public.case_studies FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can delete case studies"
  ON public.case_studies FOR DELETE
  TO authenticated
  USING (true);

-- Services table
CREATE TABLE public.services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  category TEXT,
  body_part TEXT,
  short_description TEXT,
  cost_range TEXT,
  success_rate TEXT,
  patients_treated INTEGER DEFAULT 0,
  emi_available BOOLEAN DEFAULT TRUE,
  insurance_covered BOOLEAN DEFAULT TRUE,
  procedure_time TEXT,
  hospital_stay TEXT,
  recovery_time TEXT,
  full_recovery TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read services"
  ON public.services FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert services"
  ON public.services FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update services"
  ON public.services FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can delete services"
  ON public.services FOR DELETE
  TO authenticated
  USING (true);

-- Update timestamp trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_blog_posts_updated_at
  BEFORE UPDATE ON public.blog_posts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_case_studies_updated_at
  BEFORE UPDATE ON public.case_studies
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_services_updated_at
  BEFORE UPDATE ON public.services
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
