-- Update existing Frozen Shoulder page under Orthopaedics -> Shoulder Pain with full content

DO $$
DECLARE
  ortho_id UUID;
  shoulder_pain_id UUID;
  frozen_shoulder_id UUID;
BEGIN
  -- Get orthopaedics section ID
  SELECT id INTO ortho_id FROM public.medical_sections WHERE slug = 'orthopaedics';
  
  -- Get shoulder pain subsection ID
  SELECT id INTO shoulder_pain_id 
  FROM public.medical_subsections 
  WHERE section_id = ortho_id AND slug = 'shoulder-pain';
  
  IF ortho_id IS NOT NULL AND shoulder_pain_id IS NOT NULL THEN
    -- Update existing Frozen Shoulder page
    UPDATE public.medical_subsections
    SET 
      content = '<div class="medical-content">
  <h2 class="text-2xl font-bold mt-8 mb-4">Frozen Shoulder Treatment in Hyderabad - Find Relief at Dr. Srivanth''s Orthopedic Clinic</h2>
  
  <p class="text-lg mb-6">Frozen shoulder, also known as adhesive capsulitis, is a condition that causes stiffness and pain in the shoulder joint, significantly limiting your mobility. At Dr. Srivanth''s Orthopedic Clinic, conveniently located in Ashok Nagar, Hyderabad, we offer effective frozen shoulder treatment for patients residing in Ashok Nagar, Chikkadpally, RTC Cross Roads, Vidhya Nagar, Tilak Nagar, Bagh Lingampally, Narayanguda, Himayath Nagar, Basheerbagh, Kavadiguda, Musheerabad, Ram Nagar, Warasiguda, Koranti, and Barkathpura.</p>

  <p class="mb-6">Led by Dr. Dasari Srivanth, a highly qualified orthopedic surgeon with advanced training in shoulder surgery, our team is dedicated to providing accurate diagnosis and personalized treatment plans for frozen shoulder.</p>

  <h2 class="text-2xl font-bold mt-8 mb-4">Understanding Frozen Shoulder:</h2>
  <p class="mb-6">Frozen shoulder can develop gradually over time, often following an injury or surgery to the shoulder. It can also occur without a known cause, particularly in people with diabetes. The condition is characterized by inflammation and thickening of the shoulder capsule, the connective tissue that surrounds the joint. This restricts movement and causes pain.</p>

  <h2 class="text-2xl font-bold mt-8 mb-4">Symptoms of Frozen Shoulder:</h2>
  <ul class="list-disc pl-6 mb-6 space-y-2">
    <li>Pain in the shoulder, often worse at night.</li>
    <li>Stiffness in the shoulder joint, limiting your ability to move your arm.</li>
    <li>Difficulty with everyday activities like reaching behind your back or dressing.</li>
  </ul>

  <h2 class="text-2xl font-bold mt-8 mb-4">Treatment Options for Frozen Shoulder:</h2>
  <ul class="list-disc pl-6 mb-6 space-y-2">
    <li><strong>Non-Surgical Treatment:</strong> This is usually the first line of treatment and may include pain medication, physical therapy to improve mobility and flexibility, and cortisone injections to reduce inflammation.</li>
    <li><strong>Hydrodistension:</strong> A procedure where sterile fluid is injected into the shoulder joint to stretch the capsule and improve movement.</li>
    <li><strong>Arthroscopic Surgery:</strong> In severe cases, arthroscopic surgery may be necessary to remove scar tissue and adhesions in the shoulder capsule.</li>
  </ul>

  <h2 class="text-2xl font-bold mt-8 mb-4">Why Choose Dr. Srivanth''s Orthopedic Clinic for Frozen Shoulder Treatment in Hyderabad?</h2>
  <ul class="list-disc pl-6 mb-6 space-y-2">
    <li><strong>Dr. Srivanth''s Expertise:</strong> Dr. Srivanth''s experience and advanced training in shoulder surgery allow him to diagnose and treat frozen shoulder effectively, using the latest techniques.</li>
    <li><strong>Comprehensive Treatment Options:</strong> We offer a variety of treatment options tailored to your specific needs and condition, aiming to achieve the best possible outcome without surgery whenever possible.</li>
    <li><strong>Pain Management:</strong> We prioritize pain management to improve your comfort and quality of life during your treatment journey.</li>
    <li><strong>Physical Therapy:</strong> Our experienced physical therapists will guide you through exercises to regain mobility and prevent future stiffness.</li>
    <li><strong>Minimally Invasive Techniques:</strong> Whenever possible, Dr. Srivanth prioritizes minimally invasive techniques like arthroscopic surgery for faster recovery and less scarring.</li>
    <li><strong>Compassionate Care:</strong> Our team is dedicated to providing personalized and compassionate care, understanding your unique needs and concerns throughout your treatment journey.</li>
    <li><strong>Convenient Location:</strong> We are conveniently located in Ashok Nagar to serve patients in Hyderabad and surrounding areas.</li>
  </ul>

  <h2 class="text-2xl font-bold mt-8 mb-4">Schedule an Appointment Today!</h2>
  <p class="mb-6">Don''t let frozen shoulder limit your mobility and daily activities. Contact Dr. Srivanth''s Orthopedic Clinic today to schedule an appointment and discuss your treatment options. We are committed to helping you regain a pain-free and functional shoulder.</p>
</div>',
      updated_at = NOW()
    WHERE section_id = ortho_id
      AND parent_id = shoulder_pain_id
      AND slug = 'frozen-shoulder'
    RETURNING id INTO frozen_shoulder_id;
    
    IF frozen_shoulder_id IS NOT NULL THEN
      RAISE NOTICE '✓ Frozen Shoulder content updated successfully with ID: %', frozen_shoulder_id;
      RAISE NOTICE 'Location: Orthopaedics → Shoulder Pain → Frozen Shoulder';
      RAISE NOTICE 'URL: /orthopaedics/frozen-shoulder';
    ELSE
      RAISE NOTICE '✗ Frozen Shoulder page not found';
    END IF;
  ELSE
    RAISE NOTICE '✗ Orthopaedics or Shoulder Pain section not found';
  END IF;
END $$;
