-- Add ACL Injury Surgery under Knee Pain Services with full content

DO $$
DECLARE
  ortho_id UUID;
  knee_pain_id UUID;
  acl_id UUID;
BEGIN
  -- Get orthopaedics section ID
  SELECT id INTO ortho_id FROM public.medical_sections WHERE slug = 'orthopaedics';
  
  -- Get Knee Pain Services subsection ID
  SELECT id INTO knee_pain_id FROM public.medical_subsections 
  WHERE section_id = ortho_id AND slug = 'knee-pain-services';
  
  -- Add ACL Injury Surgery under Knee Pain Services (Level 2)
  IF knee_pain_id IS NOT NULL THEN
    INSERT INTO public.medical_subsections (
      section_id, 
      parent_id, 
      name, 
      slug, 
      content,
      level,
      sort_order
    ) VALUES (
      ortho_id, 
      knee_pain_id, 
      'ACL Injury Surgery', 
      'acl-injury-surgery',
      '<div class="medical-content">
  <h2 class="text-2xl font-bold mt-8 mb-4">ACL Injury Surgery in Hyderabad: Regain Knee Stability at Dr. Srivanth''s Orthopedic Clinic</h2>
  
  <p class="text-lg mb-6">An ACL injury is a tear of the anterior cruciate ligament (ACL), a major ligament that stabilizes the knee joint. This injury is common among athletes and individuals who participate in sports activities that involve pivoting or sudden changes in direction. If you''re experiencing pain, instability, or swelling in your knee after a potential ACL injury, it''s crucial to seek proper diagnosis and treatment.</p>

  <p class="mb-6">At Dr. Srivanth''s Orthopedic Clinic, conveniently located in Ashok Nagar, Hyderabad, we offer advanced ACL injury surgery to patients residing in Ashok Nagar, Chikkadpally, RTC Cross Roads, Vidhya Nagar, Tilak Nagar, Bagh Lingampally, Narayanguda, Himayath Nagar, Basheerbagh, Kavadiguda, Musheerabad, Ram Nagar, Warasiguda, Koranti, and Barkathpura.</p>

  <p class="mb-6">Led by Dr. Dasari Srivanth, a highly qualified orthopedic surgeon with extensive experience in knee surgery, our team is dedicated to providing comprehensive ACL injury care, from diagnosis to successful surgical intervention and rehabilitation.</p>

  <h2 class="text-2xl font-bold mt-8 mb-4">ACL Injury Diagnosis and Treatment:</h2>
  <p class="mb-4">At Dr. Srivanth''s Orthopedic Clinic, we utilize a combination of physical examination, diagnostic tests like X-rays and MRI scans, to accurately diagnose an ACL tear. Depending on the severity of the tear and your individual needs, treatment options may include:</p>

  <ul class="list-disc pl-6 mb-6 space-y-2">
    <li><strong>Non-surgical Rehabilitation:</strong> For mild ACL tears, a structured rehabilitation program focusing on strengthening the muscles around the knee joint and improving stability may be sufficient for regaining function.</li>
    <li><strong>ACL Reconstruction Surgery:</strong> In cases of complete or severe ACL tears, Dr. Srivanth may recommend ACL reconstruction surgery. This minimally invasive arthroscopic procedure involves replacing the torn ACL with a graft, typically tissue from another part of your knee.</li>
  </ul>

  <h2 class="text-2xl font-bold mt-8 mb-4">Why Choose Dr. Srivanth''s Orthopedic Clinic for ACL Injury Surgery?</h2>
  <ul class="list-disc pl-6 mb-6 space-y-2">
    <li><strong>Dr. Srivanth''s Expertise:</strong> Dr. Srivanth''s advanced training and experience in knee surgery allow him to perform ACL reconstruction surgery with precision and a focus on minimizing invasiveness.</li>
    <li><strong>Advanced Techniques:</strong> We utilize the latest arthroscopic techniques for ACL reconstruction, resulting in faster recovery times and less scarring.</li>
    <li><strong>Comprehensive Care:</strong> We offer a comprehensive approach to ACL injury care, including pre-operative education, surgical intervention, and personalized rehabilitation programs to ensure optimal recovery.</li>
    <li><strong>Pain Management:</strong> We prioritize effective pain management strategies throughout the treatment process to ensure your comfort.</li>
    <li><strong>Patient Education:</strong> Our team is committed to educating you about your ACL injury, treatment options, and the entire recovery process.</li>
    <li><strong>Convenient Location:</strong> We are conveniently located in Ashok Nagar to serve patients in Hyderabad and surrounding areas.</li>
  </ul>

  <h2 class="text-2xl font-bold mt-8 mb-4">Schedule an Appointment Today!</h2>
  <p class="mb-6">Don''t let an ACL injury sideline you from your activities. Contact Dr. Srivanth''s Orthopedic Clinic today to schedule an appointment and discuss your treatment options. We are committed to helping you regain knee stability and get back to enjoying an active life.</p>
</div>',
      2,
      2
    )
    ON CONFLICT (section_id, slug) 
    DO UPDATE SET
      name = EXCLUDED.name,
      content = EXCLUDED.content,
      parent_id = EXCLUDED.parent_id,
      level = EXCLUDED.level,
      sort_order = EXCLUDED.sort_order,
      updated_at = NOW()
    RETURNING id INTO acl_id;
    
    RAISE NOTICE '✓ ACL Injury Surgery content added/updated successfully with ID: %', acl_id;
    RAISE NOTICE 'Location: Orthopaedics → Knee Pain Services → ACL Injury Surgery';
    RAISE NOTICE 'URL: /orthopaedics/acl-injury-surgery';
  ELSE
    RAISE NOTICE '✗ Knee Pain Services subsection not found';
  END IF;
END $$;
