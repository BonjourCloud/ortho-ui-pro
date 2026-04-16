-- Add Rotator Cuff Tears under Shoulder Pain with full content

DO $$
DECLARE
  ortho_id UUID;
  shoulder_pain_id UUID;
  rotator_id UUID;
BEGIN
  -- Get orthopaedics section ID
  SELECT id INTO ortho_id FROM public.medical_sections WHERE slug = 'orthopaedics';
  
  -- Get Shoulder Pain subsection ID
  SELECT id INTO shoulder_pain_id FROM public.medical_subsections 
  WHERE section_id = ortho_id AND slug = 'shoulder-pain';
  
  -- Add Rotator Cuff Tears under Shoulder Pain (Level 2)
  IF shoulder_pain_id IS NOT NULL THEN
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
      shoulder_pain_id, 
      'Rotator Cuff Tears', 
      'rotator-cuff-tears',
      '<div class="medical-content">
  <h2 class="text-2xl font-bold mt-8 mb-4">Rotator Cuff Tears Treatment in Hyderabad - Find Relief at Dr. Srivanth''s Orthopedic Clinic</h2>
  
  <p class="text-lg mb-6">Rotator cuff tears are a common shoulder injury that can cause significant pain and limit your ability to perform daily activities. At Dr. Srivanth''s Orthopedic Clinic, conveniently located in Ashok Nagar, Hyderabad, we offer comprehensive rotator cuff tear treatment for patients residing in Ashok Nagar, Chikkadpally, RTC Cross Roads, Vidhya Nagar, Tilak Nagar, Bagh Lingampally, Narayanguda, Himayath Nagar, Basheerbagh, Kavadiguda, Musheerabad, Ram Nagar, Warasiguda, Koranti, and Barkathpura.</p>

  <p class="mb-6">Led by Dr. Dasari Srivanth, a highly qualified orthopedic surgeon with advanced training in shoulder surgery, our team is dedicated to providing accurate diagnosis and effective treatment plans for rotator cuff tears.</p>

  <h2 class="text-2xl font-bold mt-8 mb-4">Understanding Rotator Cuff Tears:</h2>
  <p class="mb-6">The rotator cuff is a group of muscles and tendons that stabilize the shoulder joint. A tear in one or more of these tendons can cause pain, weakness, and limited range of motion in the shoulder.</p>

  <h2 class="text-2xl font-bold mt-8 mb-4">Symptoms of Rotator Cuff Tears:</h2>
  <ul class="list-disc pl-6 mb-6 space-y-2">
    <li>Pain in the shoulder, especially at night or when reaching overhead.</li>
    <li>Weakness in the shoulder.</li>
    <li>Difficulty lifting objects.</li>
    <li>Clicking or grinding sensation in the shoulder.</li>
    <li>Difficulty sleeping on the affected side.</li>
  </ul>

  <h2 class="text-2xl font-bold mt-8 mb-4">Treatment for Rotator Cuff Tears:</h2>
  <p class="mb-4">The treatment for rotator cuff tears depends on the severity of the tear and your individual needs. Dr. Srivanth will discuss all treatment options with you, including:</p>

  <ul class="list-disc pl-6 mb-6 space-y-2">
    <li><strong>Non-Surgical Treatment:</strong> This may include rest, ice, physical therapy, anti-inflammatory medications, and cortisone injections. Physical therapy plays a crucial role in strengthening the rotator cuff muscles and improving shoulder stability.</li>
    <li><strong>Arthroscopic Surgery:</strong> In some cases, arthroscopic surgery may be necessary to repair the torn tendon. Arthroscopy is a minimally invasive surgical technique that allows Dr. Srivanth to access the shoulder joint through small incisions and repair the tear with specialized instruments.</li>
  </ul>

  <h2 class="text-2xl font-bold mt-8 mb-4">Why Choose Dr. Srivanth''s Orthopedic Clinic for Rotator Cuff Tear Treatment?</h2>
  <ul class="list-disc pl-6 mb-6 space-y-2">
    <li><strong>Dr. Srivanth''s Expertise:</strong> Dr. Srivanth''s advanced training and experience in shoulder surgery make him highly skilled in diagnosing and treating rotator cuff tears.</li>
    <li><strong>Comprehensive Treatment Options:</strong> We offer a variety of treatment options to address your specific needs, from non-surgical therapies to advanced surgical techniques.</li>
    <li><strong>Advanced Technology:</strong> We utilize the latest diagnostic tools and technology, such as MRI scans, to ensure an accurate diagnosis.</li>
    <li><strong>Minimally Invasive Techniques:</strong> Whenever possible, Dr. Srivanth prioritizes minimally invasive arthroscopic surgery for faster recovery times and less scarring.</li>
    <li><strong>Compassionate Care:</strong> Our team is dedicated to providing personalized and compassionate care, understanding your unique needs and concerns throughout your treatment journey.</li>
    <li><strong>Convenient Location:</strong> We are conveniently located in Ashok Nagar to serve patients in Hyderabad and surrounding areas.</li>
  </ul>

  <h2 class="text-2xl font-bold mt-8 mb-4">Schedule an Appointment Today!</h2>
  <p class="mb-6">Don''t let a rotator cuff tear limit your activities. Contact Dr. Srivanth''s Orthopedic Clinic today to schedule an appointment and discuss your treatment options. We are committed to helping you get back to living a pain-free and active life.</p>
</div>',
      2,
      3
    )
    ON CONFLICT (section_id, slug) 
    DO UPDATE SET
      name = EXCLUDED.name,
      content = EXCLUDED.content,
      parent_id = EXCLUDED.parent_id,
      level = EXCLUDED.level,
      sort_order = EXCLUDED.sort_order,
      updated_at = NOW()
    RETURNING id INTO rotator_id;
    
    RAISE NOTICE '✓ Rotator Cuff Tears content added/updated successfully with ID: %', rotator_id;
    RAISE NOTICE 'Location: Orthopaedics → Shoulder Pain → Rotator Cuff Tears';
    RAISE NOTICE 'URL: /orthopaedics/rotator-cuff-tears';
  ELSE
    RAISE NOTICE '✗ Shoulder Pain subsection not found';
  END IF;
END $$;
