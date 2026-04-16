-- Add Post-Fracture Rehabilitation under Rehabilitation section with full content

DO $$
DECLARE
  rehab_id UUID;
  postfracture_id UUID;
BEGIN
  -- Get rehabilitation section ID
  SELECT id INTO rehab_id FROM public.medical_sections WHERE slug = 'rehabilitation';
  
  -- Add Post-Fracture Rehabilitation under Rehabilitation (Level 1)
  IF rehab_id IS NOT NULL THEN
    INSERT INTO public.medical_subsections (
      section_id, 
      parent_id, 
      name, 
      slug, 
      content,
      level,
      sort_order
    ) VALUES (
      rehab_id, 
      NULL, 
      'Post Fracture Rehab', 
      'post-fracture-rehab',
      '<div class="medical-content">
  <h2 class="text-2xl font-bold mt-8 mb-4">Effective Post-Fracture Rehabilitation in Hyderabad - Recover Faster at Dr. Srivanth''s Orthopedic Clinic</h2>
  
  <p class="text-lg mb-6">A broken bone can be a painful and disruptive experience. However, with proper post-fracture rehabilitation, you can regain your strength, mobility, and return to your daily activities as quickly and safely as possible.</p>

  <p class="mb-6">At Dr. Srivanth''s Orthopedic Clinic, conveniently located in Ashok Nagar, Hyderabad, we offer comprehensive post-fracture rehabilitation services for patients residing in Ashok Nagar, Chikkadpally, RTC Cross Roads, Vidhya Nagar, Tilak Nagar, Bagh Lingampally, Narayanguda, Himayath Nagar, Basheerbagh, Kavadiguda, Musheerabad, Ram Nagar, Warasiguda, Koranti, and Barkathpura.</p>

  <p class="mb-6">Led by Dr. Dasari Srivanth, a highly qualified orthopedic surgeon, our team of experienced therapists works closely with you to develop a personalized rehabilitation plan tailored to your specific fracture and recovery goals.</p>

  <h2 class="text-2xl font-bold mt-8 mb-4">Our Post-Fracture Rehabilitation Program:</h2>
  
  <ul class="list-disc pl-6 mb-6 space-y-2">
    <li><strong>Initial Evaluation:</strong> A comprehensive assessment to understand the nature of your fracture, healing progress, and any limitations in movement or function.</li>
    <li><strong>Pain Management:</strong> We utilize various techniques, such as manual therapy, modalities, and medication management, to control pain and promote healing.</li>
    <li><strong>Restoring Range of Motion:</strong> Our therapists will guide you through exercises to regain full movement and flexibility in the fractured joint.</li>
    <li><strong>Strengthening Exercises:</strong> We design a program to progressively strengthen the muscles around the fracture site, improving stability and preventing future injuries.</li>
    <li><strong>Balance and Gait Training:</strong> This is particularly important for lower extremity fractures to restore your confidence and walking ability.</li>
    <li><strong>Scar Tissue Management:</strong> Techniques like manual therapy and modalities can help minimize scar tissue formation and improve flexibility.</li>
    <li><strong>Patient Education:</strong> We provide guidance on proper use of assistive devices like crutches, weight-bearing limitations, and safe daily activities to promote optimal healing.</li>
  </ul>

  <h2 class="text-2xl font-bold mt-8 mb-4">Why Choose Dr. Srivanth''s Orthopedic Clinic for Post-Fracture Rehabilitation?</h2>
  <ul class="list-disc pl-6 mb-6 space-y-2">
    <li><strong>Experienced Team:</strong> Our team consists of qualified and experienced therapists specializing in post-fracture rehabilitation.</li>
    <li><strong>Personalized Treatment Plans:</strong> We develop individualized programs based on your specific fracture, healing progress, and goals.</li>
    <li><strong>Collaboration with an Orthopedic Surgeon:</strong> Our therapists work closely with Dr. Srivanth to ensure your rehabilitation plan aligns with your overall orthopedic care.</li>
    <li><strong>Advanced Techniques and Modalities:</strong> We utilize a variety of advanced techniques and modalities to optimize your recovery process.</li>
    <li><strong>Convenient Location:</strong> We are conveniently located in Ashok Nagar to serve patients in Hyderabad and surrounding areas.</li>
  </ul>

  <h2 class="text-2xl font-bold mt-8 mb-4">Schedule an Appointment Today!</h2>
  <p class="mb-6">Don''t wait to begin your recovery journey. Contact Dr. Srivanth''s Orthopedic Clinic today to schedule an appointment and discuss your post-fracture rehabilitation needs. Our team is committed to helping you regain your strength, mobility, and get back to living a full and active life.</p>
</div>',
      1,
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
    RETURNING id INTO postfracture_id;
    
    RAISE NOTICE '✓ Post-Fracture Rehabilitation content added/updated successfully with ID: %', postfracture_id;
    RAISE NOTICE 'Location: Rehabilitation → Post Fracture Rehab';
    RAISE NOTICE 'URL: /rehabilitation/post-fracture-rehab';
  ELSE
    RAISE NOTICE '✗ Rehabilitation section not found';
  END IF;
END $$;
