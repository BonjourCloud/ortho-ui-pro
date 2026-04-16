-- Update Total Hip Replacement content with images

UPDATE public.medical_subsections
SET content = '<div class="medical-content">
  <h2 class="text-2xl font-bold mt-8 mb-4">Total Hip Replacement Surgery in Hyderabad - Restore Mobility and Improve Quality of Life at Dr. Srivanth''s Orthopedic Clinic</h2>
  
  <p class="text-lg mb-6">Severe hip pain and stiffness caused by arthritis or other conditions can significantly impact your mobility and quality of life. Total hip replacement surgery can be a life-changing procedure for patients seeking relief from chronic hip pain and regaining their independence. At Dr. Srivanth''s Orthopedic Clinic, conveniently located in Ashok Nagar, Hyderabad, Dr. Dasari Srivanth, a highly qualified and experienced orthopedic surgeon with advanced training in joint replacement surgery, offers total hip replacement surgery in Hyderabad to patients residing in Ashok Nagar, Chikkadpally, RTC Cross Roads, Vidhya Nagar, Tilak Nagar, Bagh Lingampally, Narayanguda, Himayath Nagar, Basheerbagh, Kavadiguda, Musheerabad, Ram Nagar, Warasiguda, Koranti, and Barkathpura.</p>

  <div class="my-8 rounded-xl overflow-hidden border shadow-lg">
    <img src="/images/treatments/hip/hip-joint-anatomy.jpg" alt="Hip Joint Anatomy - Acetabulum, Femoral Head, and Joint Capsule" class="w-full h-auto" />
  </div>

  <h2 class="text-2xl font-bold mt-8 mb-4">What is Total Hip Replacement Surgery?</h2>
  <p class="mb-6">Total hip replacement surgery is a surgical procedure where the damaged ball and socket joint of the hip is replaced with artificial implants. This procedure can be highly effective in relieving pain, improving mobility, and allowing patients to resume daily activities with greater ease.</p>

  <div class="my-8 grid md:grid-cols-2 gap-4">
    <div class="rounded-xl overflow-hidden border shadow-lg">
      <img src="/images/treatments/hip/hip-osteoarthritis.jpg" alt="Healthy Hip vs Hip with Osteoarthritis - Worn Cartilage and Bone Spurs" class="w-full h-auto" />
    </div>
    <div class="rounded-xl overflow-hidden border shadow-lg">
      <img src="/images/treatments/hip/hip-arthritis-damage.jpg" alt="Hip Arthritis Damage - Destroyed Cartilage and Narrowed Joint Space" class="w-full h-auto" />
    </div>
  </div>

  <h2 class="text-2xl font-bold mt-8 mb-4">Who is a Candidate for Total Hip Replacement?</h2>
  <p class="mb-4">Total hip replacement may be recommended for patients with:</p>
  <ul class="list-disc pl-6 mb-6 space-y-2">
    <li>Severe hip pain and stiffness caused by osteoarthritis, rheumatoid arthritis, or other conditions.</li>
    <li>Pain that interferes with daily activities, such as walking, climbing stairs, or getting dressed.</li>
    <li>Limited range of motion in the hip joint.</li>
    <li>Ineffectiveness of non-surgical treatment options like medications, physical therapy, and injections.</li>
  </ul>

  <div class="my-8 rounded-xl overflow-hidden border shadow-lg">
    <img src="/images/treatments/hip/hip-replacement-before-after.jpg" alt="Hip Replacement Before and After X-rays - Showing Successful Implant Placement" class="w-full h-auto" />
  </div>

  <h2 class="text-2xl font-bold mt-8 mb-4">Understanding Hip Replacement Components</h2>
  <p class="mb-6">Modern hip replacement implants consist of several components designed to replicate the natural hip joint movement. The femoral head and stem are inserted into the thighbone, while the acetabular component (socket) is placed in the pelvis, with a plastic liner providing smooth articulation.</p>

  <div class="my-8 rounded-xl overflow-hidden border shadow-lg">
    <img src="/images/treatments/hip/hip-replacement-components.jpg" alt="Hip Replacement Implant Components - Acetabular Component, Plastic Liner, Femoral Head and Stem" class="w-full h-auto" />
  </div>

  <h2 class="text-2xl font-bold mt-8 mb-4">The Hip Replacement Procedure</h2>
  <p class="mb-6">During the surgery, the damaged hip joint is carefully removed and replaced with the artificial components. The procedure typically takes 1-2 hours and is performed under general or spinal anesthesia.</p>

  <div class="my-8 rounded-xl overflow-hidden border shadow-lg">
    <img src="/images/treatments/hip/hip-replacement-procedure.jpg" alt="Hip Replacement Procedure - Before and After Showing Damaged Joint Replaced with Implant" class="w-full h-auto" />
  </div>

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
  updated_at = NOW()
WHERE slug = 'total-hip-replacement';

-- Verify the update
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.medical_subsections WHERE slug = 'total-hip-replacement' AND content LIKE '%hip-joint-anatomy.jpg%') THEN
    RAISE NOTICE '✓ Total Hip Replacement content updated with images';
    RAISE NOTICE 'Images added: 6 medical illustrations';
  ELSE
    RAISE NOTICE '✗ Update failed or page not found';
  END IF;
END $$;
