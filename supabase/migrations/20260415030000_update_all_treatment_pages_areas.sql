-- Update all treatment pages to show correct clinic location (Ashok Nagar) and areas served

-- 1. Update Bicipital Tendinitis page
UPDATE public.medical_subsections 
SET 
  content = '<div class="medical-content">
  <p class="text-lg mb-6">Bicipital tendinitis is a common condition that causes pain and inflammation in the tendons that connect the biceps muscle to the shoulder joint. If you''re experiencing bicipital tendinitis pain in Hyderabad, look no further than Dr. Srivanth''s Orthopedic Clinic, conveniently located in Ashok Nagar. We offer comprehensive treatment for bicipital tendinitis, helping patients residing in Ashok Nagar, Chikkadpally, RTC Cross Roads, Vidhya Nagar, Tilak Nagar, Bagh Lingampally, Narayanguda, Himayath Nagar, Basheerbagh, Kavadiguda, Musheerabad, Ram Nagar, Warasiguda, Koranti, and Barkathpura regain their shoulder function and live pain-free.</p>

  <p class="mb-6">Led by Dr. Dasari Srivanth, a highly qualified orthopedic surgeon with extensive experience in shoulder conditions, our team is dedicated to providing accurate diagnosis and effective treatment plans for bicipital tendinitis.</p>

  <h2 class="text-2xl font-bold mt-8 mb-4">Symptoms of Bicipital Tendinitis:</h2>
  <ul class="list-disc pl-6 mb-6 space-y-2">
    <li>Pain in the front of the shoulder, especially near the shoulder joint</li>
    <li>Tenderness to touch</li>
    <li>Weakness in the biceps muscle</li>
    <li>Difficulty lifting or bending the arm</li>
    <li>Popping or clicking sensation in the shoulder</li>
  </ul>

  <h2 class="text-2xl font-bold mt-8 mb-4">Treatment for Bicipital Tendinitis at Dr. Srivanth''s Orthopedic Clinic:</h2>
  <p class="mb-4">Our treatment approach for bicipital tendinitis focuses on reducing inflammation, promoting healing, and restoring shoulder function. We offer a variety of treatment options tailored to your specific needs, which may include:</p>
  
  <ul class="list-disc pl-6 mb-6 space-y-2">
    <li><strong>Rest and Activity Modification:</strong> Avoiding activities that aggravate the pain allows the tendons to heal.</li>
    <li><strong>Ice Therapy:</strong> Applying ice packs to the affected area can help reduce inflammation and pain.</li>
    <li><strong>Anti-inflammatory medications:</strong> Over-the-counter or prescription medications can help manage pain and inflammation.</li>
    <li><strong>Physical Therapy:</strong> Exercises designed to strengthen the muscles around the shoulder and improve flexibility can help prevent future injury and improve range of motion.</li>
    <li><strong>Corticosteroid injections:</strong> Injections can be used to reduce inflammation and pain in severe cases.</li>
    <li><strong>Surgery:</strong> In rare cases, surgery may be necessary to repair a torn biceps tendon.</li>
  </ul>

  <h2 class="text-2xl font-bold mt-8 mb-4">Why Choose Dr. Srivanth''s Orthopedic Clinic for Bicipital Tendinitis Treatment?</h2>
  <ul class="list-disc pl-6 mb-6 space-y-2">
    <li><strong>Experienced Shoulder Specialist:</strong> Dr. Srivanth''s expertise in shoulder conditions allows him to diagnose and treat bicipital tendinitis effectively.</li>
    <li><strong>Comprehensive Treatment Options:</strong> We offer a variety of non-surgical and surgical treatment options based on your individual needs.</li>
    <li><strong>Advanced Diagnostics:</strong> We utilize the latest diagnostic tools to ensure an accurate diagnosis and personalized treatment plan.</li>
    <li><strong>Minimally Invasive Techniques:</strong> Whenever possible, Dr. Srivanth prioritizes minimally invasive arthroscopic surgery for faster recovery and less scarring.</li>
    <li><strong>Compassionate Care:</strong> Our team is dedicated to providing personalized and compassionate care throughout your treatment journey.</li>
    <li><strong>Convenient Location:</strong> We are conveniently located in Ashok Nagar to serve patients in Hyderabad and surrounding areas.</li>
  </ul>

  <h2 class="text-2xl font-bold mt-8 mb-4">Schedule an Appointment Today!</h2>
  <p class="mb-6">Don''t let bicipital tendinitis pain limit your activities. Contact Dr. Srivanth''s Orthopedic Clinic today to schedule an appointment and discuss your treatment options. We are committed to helping you get back to living a pain-free and active life.</p>
</div>',
  updated_at = NOW()
WHERE slug = 'bicipital-tendinitis';

-- 2. Update Total Knee Replacement page
UPDATE public.medical_subsections 
SET 
  content = '<div class="medical-content">
  <p class="text-lg mb-6">Severe knee pain and stiffness caused by osteoarthritis or other joint conditions can significantly impact your mobility and quality of life. Total knee replacement surgery can be a life-changing option for patients who have exhausted non-surgical treatments. At Dr. Srivanth''s Orthopedic Clinic, conveniently located in Ashok Nagar, we offer advanced total knee replacement surgery in Hyderabad to patients residing in Ashok Nagar, Chikkadpally, RTC Cross Roads, Vidhya Nagar, Tilak Nagar, Bagh Lingampally, Narayanguda, Himayath Nagar, Basheerbagh, Kavadiguda, Musheerabad, Ram Nagar, Warasiguda, Koranti, and Barkathpura.</p>

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
  updated_at = NOW()
WHERE slug = 'total-knee-replacement';

-- Verify the updates
DO $$
DECLARE
  bicipital_updated BOOLEAN;
  tkr_updated BOOLEAN;
BEGIN
  SELECT EXISTS(SELECT 1 FROM public.medical_subsections WHERE slug = 'bicipital-tendinitis' AND content LIKE '%Ashok Nagar, Chikkadpally%') INTO bicipital_updated;
  SELECT EXISTS(SELECT 1 FROM public.medical_subsections WHERE slug = 'total-knee-replacement' AND content LIKE '%Ashok Nagar, Chikkadpally%') INTO tkr_updated;
  
  IF bicipital_updated THEN
    RAISE NOTICE '✓ Bicipital Tendinitis page updated successfully';
  ELSE
    RAISE NOTICE '✗ Bicipital Tendinitis page update failed or page not found';
  END IF;
  
  IF tkr_updated THEN
    RAISE NOTICE '✓ Total Knee Replacement page updated successfully';
  ELSE
    RAISE NOTICE '✗ Total Knee Replacement page update failed or page not found';
  END IF;
  
  RAISE NOTICE '';
  RAISE NOTICE 'Format: Clinic located in Ashok Nagar, serving patients from Ashok Nagar, Chikkadpally, and surrounding areas';
END $$;
