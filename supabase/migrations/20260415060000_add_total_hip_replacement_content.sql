-- Add Total Hip Replacement under Hip Pain Services with full content

DO $$
DECLARE
  ortho_id UUID;
  hip_pain_id UUID;
  thr_id UUID;
BEGIN
  -- Get orthopaedics section ID
  SELECT id INTO ortho_id FROM public.medical_sections WHERE slug = 'orthopaedics';
  
  -- Get or create Hip Pain Services subsection (Level 1)
  SELECT id INTO hip_pain_id FROM public.medical_subsections 
  WHERE section_id = ortho_id AND slug = 'hip-pain-services';
  
  IF hip_pain_id IS NULL THEN
    INSERT INTO public.medical_subsections (
      section_id,
      parent_id,
      name,
      slug,
      description,
      level,
      sort_order
    ) VALUES (
      ortho_id,
      NULL,
      'Hip Pain Services',
      'hip-pain-services',
      'Comprehensive hip pain treatment and joint replacement services',
      1,
      2
    ) RETURNING id INTO hip_pain_id;
    
    RAISE NOTICE 'Created Hip Pain Services subsection with ID: %', hip_pain_id;
  END IF;
  
  -- Add Total Hip Replacement under Hip Pain Services (Level 2)
  IF hip_pain_id IS NOT NULL THEN
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
      hip_pain_id, 
      'Total Hip Replacement', 
      'total-hip-replacement',
      '<div class="medical-content">
  <h2 class="text-2xl font-bold mt-8 mb-4">Total Hip Replacement Surgery in Hyderabad - Restore Mobility and Improve Quality of Life at Dr. Srivanth''s Orthopedic Clinic</h2>
  
  <p class="text-lg mb-6">Severe hip pain and stiffness caused by arthritis or other conditions can significantly impact your mobility and quality of life. Total hip replacement surgery can be a life-changing procedure for patients seeking relief from chronic hip pain and regaining their independence. At Dr. Srivanth''s Orthopedic Clinic, conveniently located in Ashok Nagar, Hyderabad, Dr. Dasari Srivanth, a highly qualified and experienced orthopedic surgeon with advanced training in joint replacement surgery, offers total hip replacement surgery in Hyderabad to patients residing in Ashok Nagar, Chikkadpally, RTC Cross Roads, Vidhya Nagar, Tilak Nagar, Bagh Lingampally, Narayanguda, Himayath Nagar, Basheerbagh, Kavadiguda, Musheerabad, Ram Nagar, Warasiguda, Koranti, and Barkathpura.</p>

  <h2 class="text-2xl font-bold mt-8 mb-4">What is Total Hip Replacement Surgery?</h2>
  <p class="mb-6">Total hip replacement surgery is a surgical procedure where the damaged ball and socket joint of the hip is replaced with artificial implants. This procedure can be highly effective in relieving pain, improving mobility, and allowing patients to resume daily activities with greater ease.</p>

  <h2 class="text-2xl font-bold mt-8 mb-4">Who is a Candidate for Total Hip Replacement?</h2>
  <p class="mb-4">Total hip replacement may be recommended for patients with:</p>
  <ul class="list-disc pl-6 mb-6 space-y-2">
    <li>Severe hip pain and stiffness caused by osteoarthritis, rheumatoid arthritis, or other conditions.</li>
    <li>Pain that interferes with daily activities, such as walking, climbing stairs, or getting dressed.</li>
    <li>Limited range of motion in the hip joint.</li>
    <li>Ineffectiveness of non-surgical treatment options like medications, physical therapy, and injections.</li>
  </ul>

  <h2 class="text-2xl font-bold mt-8 mb-4">Why Choose Dr. Srivanth''s Orthopedic Clinic for Total Hip Replacement Surgery in Hyderabad?</h2>
  <ul class="list-disc pl-6 mb-6 space-y-2">
    <li><strong>Dr. Srivanth''s Expertise:</strong> Dr. Srivanth''s extensive experience and advanced training in joint replacement surgery make him highly skilled in performing total hip replacement procedures.</li>
    <li><strong>Minimally Invasive Techniques:</strong> Whenever possible, Dr. Srivanth prioritizes minimally invasive surgical techniques for faster recovery times, less pain, and smaller incisions.</li>
    <li><strong>Advanced Technology:</strong> We utilize advanced surgical techniques and technologies to ensure accurate implant placement and optimal outcomes.</li>
    <li><strong>Personalized Care:</strong> Our team is dedicated to providing compassionate and personalized care throughout your entire surgical journey, from pre-operative consultation to post-operative rehabilitation.</li>
    <li><strong>Pain Management:</strong> We prioritize effective pain management strategies to ensure your comfort throughout the recovery process.</li>
    <li><strong>Patient Education:</strong> We believe in empowering our patients with knowledge. We provide comprehensive education about total hip replacement surgery, including the procedure, recovery process, and rehabilitation exercises.</li>
    <li><strong>Convenient Location:</strong> We are conveniently located in Ashok Nagar to serve patients in Hyderabad and surrounding areas.</li>
  </ul>

  <h2 class="text-2xl font-bold mt-8 mb-4">Schedule an Appointment Today!</h2>
  <p class="mb-6">If you''re experiencing chronic hip pain and considering total hip replacement surgery in Hyderabad, contact Dr. Srivanth''s Orthopedic Clinic today to schedule an appointment and discuss your options. Dr. Srivanth will work closely with you to determine if total hip replacement is the right treatment choice for you and guide you through the entire process.</p>
</div>',
      2,
      1
    )
    ON CONFLICT (section_id, slug) 
    DO UPDATE SET
      name = EXCLUDED.name,
      content = EXCLUDED.content,
      parent_id = EXCLUDED.parent_id,
      level = EXCLUDED.level,
      sort_order = EXCLUDED.sort_order,
      updated_at = NOW()
    RETURNING id INTO thr_id;
    
    RAISE NOTICE '✓ Total Hip Replacement content added/updated successfully with ID: %', thr_id;
    RAISE NOTICE 'Location: Orthopaedics → Hip Pain Services → Total Hip Replacement';
    RAISE NOTICE 'URL: /orthopaedics/total-hip-replacement';
  ELSE
    RAISE NOTICE '✗ Hip Pain Services subsection not found';
  END IF;
END $$;
