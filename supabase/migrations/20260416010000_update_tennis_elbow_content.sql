-- Add Tennis Elbow page under Orthopaedics -> Elbow Pain with full content

DO $$
DECLARE
  ortho_id UUID;
  elbow_pain_id UUID;
  tennis_elbow_id UUID;
BEGIN
  -- Get orthopaedics section ID
  SELECT id INTO ortho_id FROM public.medical_sections WHERE slug = 'orthopaedics';
  
  -- Get elbow pain subsection ID
  SELECT id INTO elbow_pain_id 
  FROM public.medical_subsections 
  WHERE section_id = ortho_id AND slug = 'elbow-pain';
  
  IF ortho_id IS NOT NULL AND elbow_pain_id IS NOT NULL THEN
    -- Insert Tennis Elbow page under Elbow Pain
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
      elbow_pain_id,
      'Tennis Elbow',
      'tennis-elbow',
      '<div class="medical-content">
  <h2 class="text-2xl font-bold mt-8 mb-4">Best Tennis Elbow Treatment in Hyderabad - Find Relief at Dr. Srivanth''s Orthopedic Clinic</h2>
  
  <p class="text-lg mb-6">Tennis elbow, also known as lateral epicondylitis, is a common condition that causes pain on the outer side of the elbow. It''s typically caused by overuse of the forearm muscles involved in gripping and extending the wrist. While tennis players are susceptible, anyone who performs repetitive hand and wrist motions can develop tennis elbow.</p>

  <p class="mb-6">At Dr. Srivanth''s Orthopedic Clinic, conveniently located in Ashok Nagar, Hyderabad, we offer the best tennis elbow treatment for patients residing in Ashok Nagar, Chikkadpally, RTC Cross Roads, Vidhya Nagar, Tilak Nagar, Bagh Lingampally, Narayanguda, Himayath Nagar, Basheerbagh, Kavadiguda, Musheerabad, Ram Nagar, Warasiguda, Koranti, and Barkathpura.</p>

  <p class="mb-6">Led by Dr. Dasari Srivanth, a highly qualified orthopedic surgeon, our team is dedicated to providing accurate diagnosis and personalized treatment plans to get you back to your daily activities pain-free.</p>

  <h2 class="text-2xl font-bold mt-8 mb-4">Symptoms of Tennis Elbow:</h2>
  <ul class="list-disc pl-6 mb-6 space-y-2">
    <li>Pain and tenderness on the outer bony bump of the elbow.</li>
    <li>Pain that worsens with gripping or twisting motions.</li>
    <li>Weakness in the wrist and hand.</li>
  </ul>

  <h2 class="text-2xl font-bold mt-8 mb-4">Treatment for Tennis Elbow at Dr. Srivanth''s Orthopedic Clinic:</h2>
  
  <h3 class="text-xl font-semibold mt-6 mb-3">Non-surgical treatments:</h3>
  <p class="mb-4">These are often the first line of defense and may include:</p>
  <ul class="list-disc pl-6 mb-6 space-y-2">
    <li><strong>Rest:</strong> Taking a break from activities that aggravate the pain.</li>
    <li><strong>Ice therapy:</strong> Applying ice packs to the affected area for 15-20 minutes at a time, several times a day.</li>
    <li><strong>Bracing:</strong> Wearing a forearm counterforce brace to support the tendons and reduce inflammation.</li>
    <li><strong>Physical therapy:</strong> Exercises to strengthen the forearm muscles and improve flexibility.</li>
    <li><strong>Anti-inflammatory medications:</strong> Over-the-counter or prescription medications to reduce pain and inflammation.</li>
  </ul>

  <h3 class="text-xl font-semibold mt-6 mb-3">Cortisone injections:</h3>
  <p class="mb-6">In some cases, Dr. Srivanth may recommend a cortisone injection to reduce inflammation and pain.</p>

  <h3 class="text-xl font-semibold mt-6 mb-3">Surgery:</h3>
  <p class="mb-6">Surgery is usually a last resort for severe cases that don''t respond to non-surgical treatments.</p>

  <h2 class="text-2xl font-bold mt-8 mb-4">Why Choose Dr. Srivanth''s Orthopedic Clinic for Tennis Elbow Treatment in Hyderabad?</h2>
  <ul class="list-disc pl-6 mb-6 space-y-2">
    <li><strong>Experienced Doctor:</strong> Dr. Srivanth''s extensive experience allows him to diagnose and treat tennis elbow effectively.</li>
    <li><strong>Comprehensive Treatment Options:</strong> We offer a variety of treatment options to address your specific needs and get you back to your activities as soon as possible.</li>
    <li><strong>Advanced Diagnostics:</strong> We utilize the latest diagnostic tools to ensure an accurate diagnosis and personalized treatment plan.</li>
    <li><strong>Compassionate Care:</strong> Our team is dedicated to providing personalized and compassionate care throughout your treatment journey.</li>
    <li><strong>Convenient Location:</strong> We are conveniently located in Ashok Nagar to serve patients in Hyderabad and surrounding areas.</li>
  </ul>

  <h2 class="text-2xl font-bold mt-8 mb-4">Schedule an Appointment Today!</h2>
  <p class="mb-6">Don''t let tennis elbow sideline you from your activities. Contact Dr. Srivanth''s Orthopedic Clinic today to schedule an appointment and discuss your treatment options. We are committed to helping you get back to living a pain-free and active life.</p>
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
    RETURNING id INTO tennis_elbow_id;
    
    IF tennis_elbow_id IS NOT NULL THEN
      RAISE NOTICE '✓ Tennis Elbow content added/updated successfully with ID: %', tennis_elbow_id;
      RAISE NOTICE 'Location: Orthopaedics → Elbow Pain → Tennis Elbow';
      RAISE NOTICE 'URL: /orthopaedics/tennis-elbow';
    END IF;
  ELSE
    RAISE NOTICE '✗ Orthopaedics or Elbow Pain section not found';
  END IF;
END $$;
