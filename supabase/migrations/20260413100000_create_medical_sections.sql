-- Create medical sections structure for Orthopaedics, Physiotherapy, Rehabilitation

-- Main sections table (parent categories)
CREATE TABLE public.medical_sections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL, -- 'orthopaedics', 'physiotherapy', 'rehabilitation'
  display_name TEXT NOT NULL, -- 'Orthopaedics', 'Physiotherapy', 'Rehabilitation'
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Sub-sections table (dropdown items under each main section)
CREATE TABLE public.medical_subsections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  section_id UUID NOT NULL REFERENCES public.medical_sections(id) ON DELETE CASCADE,
  name TEXT NOT NULL, -- e.g., 'Shoulder Pain', 'Tennis Elbow'
  slug TEXT NOT NULL,
  description TEXT,
  content TEXT, -- Full page content (HTML/Markdown)
  meta_description TEXT,
  is_active BOOLEAN DEFAULT true,
  is_featured BOOLEAN DEFAULT false,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(section_id, slug)
);

-- Enable RLS
ALTER TABLE public.medical_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.medical_subsections ENABLE ROW LEVEL SECURITY;

-- Public read policies
CREATE POLICY "Anyone can read medical sections"
  ON public.medical_sections FOR SELECT USING (true);

CREATE POLICY "Anyone can read medical subsections"
  ON public.medical_subsections FOR SELECT USING (true);

-- Admin write policies
CREATE POLICY "Admins can insert medical sections"
  ON public.medical_sections FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update medical sections"
  ON public.medical_sections FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete medical sections"
  ON public.medical_sections FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert medical subsections"
  ON public.medical_subsections FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update medical subsections"
  ON public.medical_subsections FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete medical subsections"
  ON public.medical_subsections FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Timestamp triggers
CREATE TRIGGER update_medical_sections_updated_at
  BEFORE UPDATE ON public.medical_sections
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_medical_subsections_updated_at
  BEFORE UPDATE ON public.medical_subsections
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Insert main sections
INSERT INTO public.medical_sections (name, display_name, slug, description, sort_order) VALUES
('orthopaedics', 'Orthopaedics', 'orthopaedics', 'Comprehensive orthopedic treatments for bones, joints, and muscles', 1),
('physiotherapy', 'Physiotherapy', 'physiotherapy', 'Advanced physiotherapy and rehabilitation services', 2),
('rehabilitation', 'Rehabilitation', 'rehabilitation', 'Post-operative and injury rehabilitation programs', 3);

-- Get section IDs for inserting subsections
DO $$
DECLARE
  ortho_id UUID;
  physio_id UUID;
  rehab_id UUID;
BEGIN
  SELECT id INTO ortho_id FROM public.medical_sections WHERE slug = 'orthopaedics';
  SELECT id INTO physio_id FROM public.medical_sections WHERE slug = 'physiotherapy';
  SELECT id INTO rehab_id FROM public.medical_sections WHERE slug = 'rehabilitation';

  -- Orthopaedics subsections (from screenshots)
  INSERT INTO public.medical_subsections (section_id, name, slug, description, sort_order) VALUES
  (ortho_id, 'Shoulder Pain', 'shoulder-pain', 'Treatment for shoulder pain and injuries', 1),
  (ortho_id, 'Elbow Pain', 'elbow-pain', 'Elbow pain management and treatment', 2),
  (ortho_id, 'Knee Pain Services', 'knee-pain-services', 'Comprehensive knee pain solutions', 3),
  (ortho_id, 'Hip Pain Services', 'hip-pain-services', 'Hip pain diagnosis and treatment', 4),
  (ortho_id, 'Spine Pain', 'spine-pain', 'Spine and back pain management', 5),
  (ortho_id, 'Surgeries', 'surgeries', 'Orthopedic surgical procedures', 6),
  (ortho_id, 'Plantar Fasciitis', 'plantar-fasciitis', 'Heel and foot pain treatment', 7),
  (ortho_id, 'Heel Spur', 'heel-spur', 'Heel spur diagnosis and treatment', 8),
  (ortho_id, 'Calf Related Issues', 'calf-related-issues', 'Calf muscle and tendon problems', 9),
  (ortho_id, 'Piriformis Syndrome', 'piriformis-syndrome', 'Piriformis syndrome treatment', 10),
  (ortho_id, 'I.T.B', 'itb', 'Iliotibial band syndrome', 11),
  (ortho_id, 'OA Knee', 'oa-knee', 'Osteoarthritis of the knee', 12),
  (ortho_id, 'Dequervains Tenosynovitis', 'dequervains-tenosynovitis', 'Wrist tendon inflammation', 13),
  (ortho_id, 'Carpal Tunnel Syndrome', 'carpal-tunnel-syndrome', 'Carpal tunnel treatment', 14);

  -- Physiotherapy subsections (from screenshots)
  INSERT INTO public.medical_subsections (section_id, name, slug, description, sort_order) VALUES
  (physio_id, 'Ultrasonic Therapy', 'ultrasonic-therapy', 'Therapeutic ultrasound treatment', 1),
  (physio_id, 'Extracorporeal Shock Wave Therapy', 'extracorporeal-shock-wave-therapy', 'ESWT for chronic pain', 2),
  (physio_id, 'Interferential Therapy (IFT)', 'interferential-therapy', 'IFT for pain relief', 3),
  (physio_id, 'Cervical Traction', 'cervical-traction', 'Neck pain relief therapy', 4),
  (physio_id, 'Lumbar Traction', 'lumbar-traction', 'Lower back traction therapy', 5),
  (physio_id, 'Wax Therapy', 'wax-therapy', 'Heat therapy for joints', 6),
  (physio_id, 'Kinesio Tapping', 'kinesio-tapping', 'Therapeutic taping technique', 7),
  (physio_id, 'Sports Rehabilitation', 'sports-rehabilitation', 'Sports injury recovery', 8),
  (physio_id, 'EMS Electric Muscle Stimulator', 'ems-electric-muscle-stimulator', 'Electrical muscle stimulation', 9),
  (physio_id, 'TENS', 'tens', 'Transcutaneous electrical nerve stimulation', 10),
  (physio_id, 'Blood Flow Occlusion Training', 'blood-flow-occlusion-training', 'BFR training therapy', 11),
  (physio_id, 'Dryneedling', 'dryneedling', 'Trigger point dry needling', 12),
  (physio_id, 'Myofascial Release', 'myofascial-release', 'Soft tissue therapy', 13);

  -- Rehabilitation subsections (from screenshots)
  INSERT INTO public.medical_subsections (section_id, name, slug, description, sort_order) VALUES
  (rehab_id, 'Post OP Rehabilitation', 'post-op-rehabilitation', 'Post-operative recovery programs', 1),
  (rehab_id, 'Post Fractures Rehab', 'post-fractures-rehab', 'Fracture recovery rehabilitation', 2);
END $$;

-- Add indexes for performance
CREATE INDEX idx_medical_subsections_section_id ON public.medical_subsections(section_id);
CREATE INDEX idx_medical_subsections_slug ON public.medical_subsections(slug);
CREATE INDEX idx_medical_sections_slug ON public.medical_sections(slug);

-- Comments
COMMENT ON TABLE public.medical_sections IS 'Main medical service categories (Orthopaedics, Physiotherapy, Rehabilitation)';
COMMENT ON TABLE public.medical_subsections IS 'Sub-categories under each main medical section';
