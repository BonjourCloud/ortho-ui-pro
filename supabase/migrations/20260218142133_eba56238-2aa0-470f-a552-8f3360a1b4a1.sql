-- Create testimonials table
CREATE TABLE public.testimonials (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_name TEXT NOT NULL,
  initials TEXT NOT NULL,
  age INTEGER,
  gender TEXT,
  occupation TEXT,
  condition TEXT NOT NULL,
  rating INTEGER NOT NULL DEFAULT 5,
  location TEXT,
  text TEXT NOT NULL,
  is_featured BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.testimonials ENABLE ROW LEVEL SECURITY;

-- Public read
CREATE POLICY "Anyone can read testimonials"
ON public.testimonials FOR SELECT USING (true);

-- Auth write
CREATE POLICY "Authenticated users can insert testimonials"
ON public.testimonials FOR INSERT WITH CHECK (true);

CREATE POLICY "Authenticated users can update testimonials"
ON public.testimonials FOR UPDATE USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can delete testimonials"
ON public.testimonials FOR DELETE USING (true);

-- Timestamp trigger
CREATE TRIGGER update_testimonials_updated_at
BEFORE UPDATE ON public.testimonials
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed existing mock data
INSERT INTO public.testimonials (patient_name, initials, age, gender, occupation, condition, rating, location, text, is_featured, sort_order) VALUES
('Rajesh Kumar', 'R.K.', 58, 'M', 'Teacher', 'Total Knee Replacement', 5, 'Banjara Hills', 'I was suffering from severe knee pain for years. The doctor performed my knee replacement and I was walking without pain in 3 weeks. I could attend my daughter''s wedding and dance. Truly a life-changing experience.', true, 1),
('Lakshmi Devi', 'L.D.', 65, 'F', 'Homemaker', 'Hip Replacement', 5, 'Jubilee Hills', 'I couldn''t sit on the floor for puja for 2 years. After my hip replacement, I can sit cross-legged again. My family is so happy to see me pain-free.', true, 2),
('Suresh Reddy', 'S.R.', 28, 'M', 'Cricket Coach', 'ACL Reconstruction', 5, 'Secunderabad', 'Tore my ACL playing cricket. Thought my coaching career was over. The surgery was done and I was back on the field in 8 months. Forever grateful.', true, 3);