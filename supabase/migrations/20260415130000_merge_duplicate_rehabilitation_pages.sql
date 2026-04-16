-- Merge duplicate rehabilitation pages - keep "Post Op Rehabilitation" and remove "Post-Operative Rehabilitation"

DO $$
DECLARE
  rehab_id UUID;
  postop_id UUID;
  postoperative_id UUID;
BEGIN
  -- Get rehabilitation section ID
  SELECT id INTO rehab_id FROM public.medical_sections WHERE slug = 'rehabilitation';
  
  IF rehab_id IS NOT NULL THEN
    -- Get the IDs of both pages
    SELECT id INTO postop_id FROM public.medical_subsections 
    WHERE section_id = rehab_id AND slug = 'post-op-rehabilitation';
    
    SELECT id INTO postoperative_id FROM public.medical_subsections 
    WHERE section_id = rehab_id AND slug = 'post-operative-rehabilitation';
    
    -- If both exist, delete the "Post-Operative Rehabilitation" one
    IF postoperative_id IS NOT NULL THEN
      DELETE FROM public.medical_subsections WHERE id = postoperative_id;
      RAISE NOTICE '✓ Deleted duplicate "Post-Operative Rehabilitation" page';
    END IF;
    
    -- Ensure "Post Op Rehabilitation" has the correct content
    IF postop_id IS NOT NULL THEN
      UPDATE public.medical_subsections
      SET 
        name = 'Post Op Rehabilitation',
        content = '<div class="medical-content">
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
        updated_at = NOW()
      WHERE id = postop_id;
      
      RAISE NOTICE '✓ Updated "Post Op Rehabilitation" page with correct content';
      RAISE NOTICE 'URL: /rehabilitation/post-op-rehabilitation';
    ELSE
      RAISE NOTICE '✗ "Post Op Rehabilitation" page not found';
    END IF;
    
  ELSE
    RAISE NOTICE '✗ Rehabilitation section not found';
  END IF;
END $$;
