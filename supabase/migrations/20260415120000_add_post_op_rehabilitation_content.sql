-- Add Post-Operative Rehabilitation under Rehabilitation section with full content

DO $$
DECLARE
  rehab_id UUID;
  postop_id UUID;
BEGIN
  -- Get rehabilitation section ID
  SELECT id INTO rehab_id FROM public.medical_sections WHERE slug = 'rehabilitation';
  
  -- Add Post-Operative Rehabilitation under Rehabilitation (Level 1)
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
      'Post-Operative Rehabilitation', 
      'post-operative-rehabilitation',
      '<div class="medical-content">
  <h2 class="text-2xl font-bold mt-8 mb-4">Effective Post-Operative Rehabilitation in Hyderabad - Recover Faster at Dr. Srivanth''s Orthopedic Clinic</h2>
  
  <p class="text-lg mb-6">Following orthopedic surgery, successful rehabilitation is crucial to regain strength, mobility, and return to your daily activities. At Dr. Srivanth''s Orthopedic Clinic, conveniently located in Ashok Nagar, Hyderabad, we offer a comprehensive and personalized post-operative rehabilitation program to patients residing in Ashok Nagar, Chikkadpally, RTC Cross Roads, Vidhya Nagar, Tilak Nagar, Bagh Lingampally, Narayanguda, Himayath Nagar, Basheerbagh, Kavadiguda, Musheerabad, Ram Nagar, Warasiguda, Koranti, and Barkathpura.</p>

  <p class="mb-6">Led by Dr. Dasari Srivanth, a highly qualified orthopedic surgeon, our team of experienced therapists works closely with you to develop a customized post-operative rehabilitation plan tailored to your specific surgery and recovery goals.</p>

  <h2 class="text-2xl font-bold mt-8 mb-4">Our Post-Operative Rehabilitation Program:</h2>
  
  <ul class="list-disc pl-6 mb-6 space-y-2">
    <li><strong>Individualized Treatment Plans:</strong> We understand that every surgery and patient is unique. Our therapists will assess your needs, limitations, and goals to create a personalized rehabilitation program that optimizes your recovery.</li>
    <li><strong>Early Intervention:</strong> We believe in starting rehabilitation as soon as possible after surgery, following your doctor''s instructions, to promote healing, minimize pain, and prevent complications like stiffness and scar tissue formation.</li>
    <li><strong>Pain Management:</strong> Our therapists utilize various techniques, including manual therapy, modalities (electrical stimulation, ultrasound), and therapeutic exercises, to manage pain and improve your comfort level.</li>
    <li><strong>Restoring Strength and Flexibility:</strong> Our program incorporates exercises designed to gradually increase your strength, range of motion, and flexibility in the affected area. This helps you regain control and function in your joint or limb.</li>
    <li><strong>Balance and Gait Training (if needed):</strong> For surgeries that may impact balance or walking ability, our therapists will incorporate specific exercises to improve these aspects and reduce the risk of falls.</li>
    <li><strong>Patient Education:</strong> We educate you on proper posture, exercises you can perform at home, and precautions to take to ensure a smooth and successful recovery.</li>
  </ul>

  <h2 class="text-2xl font-bold mt-8 mb-4">Why Choose Dr. Srivanth''s Orthopedic Clinic for Post-Operative Rehabilitation?</h2>
  <ul class="list-disc pl-6 mb-6 space-y-2">
    <li><strong>Collaboration with Dr. Srivanth:</strong> Our therapists work closely with Dr. Srivanth, ensuring your rehabilitation program aligns perfectly with your surgical procedure and recovery plan.</li>
    <li><strong>Experienced Therapists:</strong> Our team consists of qualified and experienced rehabilitation therapists dedicated to your recovery and well-being.</li>
    <li><strong>Advanced Techniques and Modalities:</strong> We utilize a variety of advanced techniques and modalities to optimize your rehabilitation journey.</li>
    <li><strong>Convenient Location:</strong> We are conveniently located in Ashok Nagar to serve patients in Hyderabad and surrounding areas.</li>
  </ul>

  <h2 class="text-2xl font-bold mt-8 mb-4">Schedule an Appointment Today!</h2>
  <p class="mb-6">Don''t delay your post-operative rehabilitation. Contact Dr. Srivanth''s Orthopedic Clinic today to schedule an appointment and discuss your personalized program. Our team is committed to helping you achieve a successful recovery and return to your life with improved strength, mobility, and function.</p>
</div>',
      1,
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
    RETURNING id INTO postop_id;
    
    RAISE NOTICE '✓ Post-Operative Rehabilitation content added/updated successfully with ID: %', postop_id;
    RAISE NOTICE 'Location: Rehabilitation → Post-Operative Rehabilitation';
    RAISE NOTICE 'URL: /rehabilitation/post-operative-rehabilitation';
  ELSE
    RAISE NOTICE '✗ Rehabilitation section not found';
  END IF;
END $$;
