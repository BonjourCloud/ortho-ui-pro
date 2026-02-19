
-- Site config table to replace localStorage
CREATE TABLE public.site_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.site_config ENABLE ROW LEVEL SECURITY;

-- Anyone can read site config (needed for public pages)
CREATE POLICY "Anyone can read site config"
  ON public.site_config FOR SELECT
  USING (true);

-- Only admins can update
CREATE POLICY "Admins can update site config"
  ON public.site_config FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert site config"
  ON public.site_config FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Seed with default config
INSERT INTO public.site_config (config) VALUES ('{
  "doctorName": "Dr. Ortho",
  "clinicName": "Ortho Clinic",
  "title": "MS Ortho, DNB - Orthopedic Surgeon",
  "specialization": "Joint Replacement & Sports Medicine",
  "shortBio": "Experienced orthopedic surgeon specializing in minimally invasive joint replacements and sports injury management with 15+ years of practice in Hyderabad.",
  "fullBio": "Dr. Ortho is a renowned orthopedic surgeon with over 15 years of experience in joint replacement surgery, sports medicine, and trauma care. He has performed over 2000 successful surgeries and helped thousands of patients return to an active lifestyle. His approach combines the latest evidence-based medicine with personalized patient care.",
  "philosophy": "I believe that every patient deserves personalized care based on the latest scientific evidence. Whether we choose surgical or conservative treatment, the goal is always to help you return to the activities you love as quickly and safely as possible.",
  "yearsExperience": 15,
  "happyPatients": 5000,
  "surgeriesCompleted": 2000,
  "branches": 2,
  "consultationFee": 800,
  "phone": "+919876543210",
  "whatsapp": "+919876543210",
  "email": "consult@drortho.com",
  "location": "Banjara Hills, Hyderabad, Telangana",
  "hours": "Mon - Sat: 9 AM - 8 PM",
  "logoInitials": "DO",
  "heroImageUrl": "",
  "whatsappFloatEnabled": true
}'::jsonb);
