-- Add Total Knee Replacement under Knee Pain Services with full content

DO $$
DECLARE
  ortho_id UUID;
  knee_pain_id UUID;
  tkr_id UUID;
BEGIN
  -- Get orthopaedics section ID
  SELECT id INTO ortho_id FROM public.medical_sections WHERE slug = 'orthopaedics';
  
  -- Get Knee Pain Services subsection ID
  SELECT id INTO knee_pain_id FROM public.medical_subsections 
  WHERE section_id = ortho_id AND slug = 'knee-pain-services';
  
  -- Add Total Knee Replacement under Knee Pain Services (Level 2)
  IF knee_pain_id IS NOT NULL THEN
    INSERT INTO public.medical_subsections (
      section_id, 
      parent_id, 
      name, 
      slug, 
      description, 
      level,
      sort_order,
      content,
      meta_description
    ) VALUES (
      ortho_id, 
      knee_pain_id, 
      'Total Knee Replacement', 
      'total-knee-replacement', 
      'Advanced total knee replacement surgery for severe knee pain and arthritis', 
      2,
      1,
      '<div class="medical-content">
  <p class="text-lg mb-6">Severe knee pain and stiffness caused by osteoarthritis or other joint conditions can significantly impact your mobility and quality of life. Total knee replacement surgery can be a life-changing option for patients who have exhausted non-surgical treatments. At Dr. Srivanth''s Orthopedic Clinic, conveniently located in Ashok Nagar, we offer advanced total knee replacement surgery in Hyderabad to patients residing in Ashok Nagar, RTC Cross Roads, Vidhya Nagar, Tilak Nagar, Bagh Lingampally, Narayanguda, Himayath Nagar, Basheerbagh, Chikkadpally, Kavadiguda, Musheerabad, Ram Nagar, Warasiguda, Koranti, and Barkathpura.</p>

  <p class="mb-6">Led by Dr. Dasari Srivanth, a highly qualified and experienced orthopedic surgeon with advanced training in joint replacement surgery, our team is dedicated to providing exceptional care throughout your total knee replacement journey.</p>

  <h2 class="text-2xl font-bold mt-8 mb-4">What is Total Knee Replacement Surgery?</h2>
  <p class="mb-6">Total knee replacement surgery is a surgical procedure where the damaged knee joint is replaced with an artificial implant. This surgery can significantly improve your pain, stiffness, and function, allowing you to resume daily activities with greater ease.</p>

  <div class="my-8 rounded-xl overflow-hidden border shadow-lg">
    <img src="/images/treatments/total-knee-replacement-process.jpg" alt="Process of Total Knee Replacement Surgery - 6 Steps" class="w-full h-auto" />
  </div>

  <h2 class="text-2xl font-bold mt-8 mb-4">Who is a Candidate for Total Knee Replacement?</h2>
  <p class="mb-4">Total knee replacement may be recommended for patients with:</p>
  <ul class="list-disc pl-6 mb-6 space-y-2">
    <li>Severe osteoarthritis of the knee</li>
    <li>Significant pain and stiffness that limits daily activities</li>
    <li>Ineffectiveness of non-surgical treatments like medications, physical therapy, and injections</li>
  </ul>

  <h2 class="text-2xl font-bold mt-8 mb-4">Total Knee Replacement at Dr. Srivanth''s Orthopedic Clinic:</h2>
  <ul class="list-disc pl-6 mb-6 space-y-2">
    <li><strong>Pre-Operative Consultation:</strong> Dr. Srivanth will thoroughly evaluate your condition, discuss your concerns, and determine if total knee replacement is the right option for you.</li>
    <li><strong>Advanced Surgical Techniques:</strong> Dr. Srivanth utilizes minimally invasive surgical techniques whenever possible to promote faster recovery and less scarring.</li>
    <li><strong>Computer-Assisted Surgery:</strong> We may utilize computer-assisted surgery for improved implant positioning and alignment, leading to better long-term outcomes.</li>
    <li><strong>Pain Management:</strong> We prioritize effective pain management before, during, and after surgery to ensure your comfort throughout the recovery process.</li>
    <li><strong>Patient Education:</strong> Our team will provide comprehensive education and guidance to prepare you for surgery and recovery.</li>
    <li><strong>Rehabilitation:</strong> We work closely with our experienced rehabilitation team to develop a personalized recovery plan to help you regain strength, mobility, and function.</li>
  </ul>

  <h2 class="text-2xl font-bold mt-8 mb-4">Why Choose Dr. Srivanth''s Orthopedic Clinic for Total Knee Replacement Surgery in Hyderabad?</h2>
  <ul class="list-disc pl-6 mb-6 space-y-2">
    <li><strong>Dr. Srivanth''s Expertise:</strong> Dr. Srivanth''s extensive experience and advanced training in joint replacement surgery make him highly qualified to perform complex knee replacement procedures.</li>
    <li><strong>Minimally Invasive Techniques:</strong> We prioritize minimally invasive surgical approaches for faster recovery times and less scarring.</li>
    <li><strong>Compassionate Care:</strong> Our team is dedicated to providing personalized and compassionate care throughout your journey, addressing your individual needs and concerns.</li>
    <li><strong>Advanced Technology:</strong> We utilize advanced surgical techniques and technology to ensure optimal outcomes.</li>
    <li><strong>Comprehensive Rehabilitation:</strong> We collaborate with experienced rehabilitation specialists to develop a personalized recovery plan for a successful outcome.</li>
    <li><strong>Convenient Location:</strong> We are conveniently located in Ashok Nagar to serve patients in Hyderabad and surrounding areas.</li>
  </ul>

  <h2 class="text-2xl font-bold mt-8 mb-4">Schedule an Appointment Today!</h2>
  <p class="mb-6">Don''t let knee pain limit your life. Contact Dr. Srivanth''s Orthopedic Clinic today to schedule an appointment and discuss if total knee replacement surgery in Hyderabad is right for you. We are committed to helping you regain your mobility and improve your quality of life.</p>
</div>',
      'Expert total knee replacement surgery in Hyderabad at Dr. Srivanth''s Orthopedic Clinic, Ashok Nagar. Advanced techniques, minimally invasive surgery, comprehensive rehabilitation.'
    )
    ON CONFLICT (section_id, slug) 
    DO UPDATE SET
      name = EXCLUDED.name,
      description = EXCLUDED.description,
      content = EXCLUDED.content,
      meta_description = EXCLUDED.meta_description,
      parent_id = EXCLUDED.parent_id,
      level = EXCLUDED.level,
      sort_order = EXCLUDED.sort_order,
      updated_at = NOW()
    RETURNING id INTO tkr_id;
    
    RAISE NOTICE 'Total Knee Replacement content added/updated successfully with ID: %', tkr_id;
  ELSE
    RAISE NOTICE 'Knee Pain Services subsection not found';
  END IF;
END $$;
