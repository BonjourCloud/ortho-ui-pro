-- Update ACL Injury Surgery content with images

UPDATE public.medical_subsections
SET content = '<div class="medical-content">
  <h2 class="text-2xl font-bold mt-8 mb-4">ACL Injury Surgery in Hyderabad: Regain Knee Stability at Dr. Srivanth''s Orthopedic Clinic</h2>
  
  <p class="text-lg mb-6">An ACL injury is a tear of the anterior cruciate ligament (ACL), a major ligament that stabilizes the knee joint. This injury is common among athletes and individuals who participate in sports activities that involve pivoting or sudden changes in direction. If you''re experiencing pain, instability, or swelling in your knee after a potential ACL injury, it''s crucial to seek proper diagnosis and treatment.</p>

  <div class="my-8 rounded-xl overflow-hidden border shadow-lg">
    <img src="/images/treatments/acl/acl-tear-anatomy.jpg" alt="ACL Tear Anatomy - Showing Anterior Cruciate Ligament Tear in Knee Joint" class="w-full h-auto" />
  </div>

  <p class="mb-6">At Dr. Srivanth''s Orthopedic Clinic, conveniently located in Ashok Nagar, Hyderabad, we offer advanced ACL injury surgery to patients residing in Ashok Nagar, Chikkadpally, RTC Cross Roads, Vidhya Nagar, Tilak Nagar, Bagh Lingampally, Narayanguda, Himayath Nagar, Basheerbagh, Kavadiguda, Musheerabad, Ram Nagar, Warasiguda, Koranti, and Barkathpura.</p>

  <p class="mb-6">Led by Dr. Dasari Srivanth, a highly qualified orthopedic surgeon with extensive experience in knee surgery, our team is dedicated to providing comprehensive ACL injury care, from diagnosis to successful surgical intervention and rehabilitation.</p>

  <h2 class="text-2xl font-bold mt-8 mb-4">Understanding ACL Injury</h2>
  <p class="mb-6">The ACL is one of the key ligaments that help stabilize your knee joint. It connects your thighbone (femur) to your shinbone (tibia). An ACL injury most commonly occurs during sports that involve sudden stops, jumps, or changes in direction.</p>

  <div class="my-8 grid md:grid-cols-2 gap-4">
    <div class="rounded-xl overflow-hidden border shadow-lg">
      <img src="/images/treatments/acl/acl-injury-diagram.jpg" alt="ACL Injury Diagram - Detailed View of Anterior Cruciate Ligament Location and Tear" class="w-full h-auto" />
    </div>
    <div class="rounded-xl overflow-hidden border shadow-lg">
      <img src="/images/treatments/acl/acl-injury-mechanism.jpg" alt="Mechanism of ACL Injury - Showing Femoral Adduction, Dynamic Valgus, and Knee Movements" class="w-full h-auto" />
    </div>
  </div>

  <h2 class="text-2xl font-bold mt-8 mb-4">ACL Injury Diagnosis and Treatment:</h2>
  <p class="mb-4">At Dr. Srivanth''s Orthopedic Clinic, we utilize a combination of physical examination, diagnostic tests like X-rays and MRI scans, to accurately diagnose an ACL tear. Depending on the severity of the tear and your individual needs, treatment options may include:</p>

  <ul class="list-disc pl-6 mb-6 space-y-2">
    <li><strong>Non-surgical Rehabilitation:</strong> For mild ACL tears, a structured rehabilitation program focusing on strengthening the muscles around the knee joint and improving stability may be sufficient for regaining function.</li>
    <li><strong>ACL Reconstruction Surgery:</strong> In cases of complete or severe ACL tears, Dr. Srivanth may recommend ACL reconstruction surgery. This minimally invasive arthroscopic procedure involves replacing the torn ACL with a graft, typically tissue from another part of your knee.</li>
  </ul>

  <div class="my-8 rounded-xl overflow-hidden border shadow-lg">
    <img src="/images/treatments/acl/acl-torn-vs-reconstructed.jpg" alt="Torn ACL vs Reconstructed ACL - Before and After Comparison" class="w-full h-auto" />
  </div>

  <h2 class="text-2xl font-bold mt-8 mb-4">Arthroscopic ACL Reconstruction Procedure</h2>
  <p class="mb-6">ACL reconstruction is performed using minimally invasive arthroscopic techniques. Small incisions are made, and a tiny camera (arthroscope) is inserted to visualize the knee joint. The torn ACL is removed and replaced with a graft, which is secured with screws or other fixation devices.</p>

  <div class="my-8 rounded-xl overflow-hidden border shadow-lg">
    <img src="/images/treatments/acl/acl-arthroscopic-surgery.jpg" alt="Arthroscopic ACL Surgery - Showing Arthroscopic Camera and Surgical Instruments" class="w-full h-auto" />
  </div>

  <h2 class="text-2xl font-bold mt-8 mb-4">ACL Reconstruction Steps</h2>
  <p class="mb-6">The surgical procedure involves several key steps: removing the torn ACL, preparing bone tunnels in the femur and tibia, placing the graft through the tunnels, and securing it with interference screws. The graft will gradually heal and integrate with your bone over time.</p>

  <div class="my-8 rounded-xl overflow-hidden border shadow-lg">
    <img src="/images/treatments/acl/acl-reconstruction-steps.jpg" alt="ACL Reconstruction Surgery Steps - 6-Step Procedure Showing Torn ACL Removal, Graft Placement, and Fixation" class="w-full h-auto" />
  </div>

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
  updated_at = NOW()
WHERE slug = 'acl-injury-surgery';

-- Verify the update
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.medical_subsections WHERE slug = 'acl-injury-surgery' AND content LIKE '%acl-tear-anatomy.jpg%') THEN
    RAISE NOTICE '✓ ACL Injury Surgery content updated with images';
    RAISE NOTICE 'Images added: 6 medical illustrations';
  ELSE
    RAISE NOTICE '✗ Update failed or page not found';
  END IF;
END $$;
