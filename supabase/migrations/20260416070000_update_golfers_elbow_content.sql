-- Insert new Golfer's Elbow page under Orthopaedics -> Elbow Pain

DO $$
DECLARE
  ortho_id UUID;
  elbow_pain_id UUID;
  page_id UUID;
BEGIN
  SELECT id INTO ortho_id FROM public.medical_sections WHERE slug = 'orthopaedics';
  SELECT id INTO elbow_pain_id FROM public.medical_subsections WHERE section_id = ortho_id AND slug = 'elbow-pain';

  IF ortho_id IS NOT NULL AND elbow_pain_id IS NOT NULL THEN
    INSERT INTO public.medical_subsections (
      section_id, parent_id, name, slug, content, level, sort_order
    ) VALUES (
      ortho_id,
      elbow_pain_id,
      'Golfer''s Elbow',
      'golfers-elbow',
      '<div class="medical-content">
  <h2 class="text-2xl font-bold mt-8 mb-4">Golfer''s Elbow Treatment in Hyderabad - Find Relief at Dr. Srivanth''s Orthopedic Clinic</h2>

  <p class="text-lg mb-6">Golfer''s elbow, also known as medial epicondylitis, is a common condition that causes pain on the inner side of the elbow. It''s often caused by overuse of the forearm muscles involved in gripping and wrist bending. While golfers are susceptible to this condition, it can affect anyone who performs repetitive motions with their hand and wrist.</p>

  <p class="mb-6">At Dr. Srivanth''s Orthopedic Clinic, conveniently located in Ashok Nagar, Hyderabad, we offer effective treatment for golfer''s elbow for patients residing in Ashok Nagar, Chikkadpally, RTC Cross Roads, Vidhya Nagar, Tilak Nagar, Bagh Lingampally, Narayanguda, Himayath Nagar, Basheerbagh, Kavadiguda, Musheerabad, Ram Nagar, Warasiguda, Koranti, and Barkathpura.</p>

  <p class="mb-6">Led by Dr. Dasari Srivanth, a highly qualified orthopedic surgeon, our team is dedicated to providing accurate diagnosis and personalized treatment plans to get you back to your daily activities pain-free.</p>

  <img src="/images/treatments/golfers-elbow/golfers-elbow-anatomy.jpg" alt="Medial Epicondylitis (Golfer''s Elbow) anatomy showing lateral epicondyle, medial epicondyle and humerus" class="w-full h-auto rounded-xl border shadow-lg my-8" />

  <h2 class="text-2xl font-bold mt-8 mb-4">Symptoms of Golfer''s Elbow:</h2>
  <ul class="list-disc pl-6 mb-6 space-y-2">
    <li>Pain on the inner side of the elbow, especially when gripping or bending the wrist.</li>
    <li>Tenderness to touch near the bony bump on the inner side of your elbow.</li>
    <li>Weakness in the grip.</li>
  </ul>

  <h2 class="text-2xl font-bold mt-8 mb-4">Treatment for Golfer''s Elbow at Dr. Srivanth''s Orthopedic Clinic:</h2>
  <p class="mb-4">Our treatment approach focuses on reducing inflammation, pain relief, and restoring strength and function in the affected muscles. We offer a variety of treatment options, including:</p>
  <ul class="list-disc pl-6 mb-6 space-y-2">
    <li><strong>Rest:</strong> Avoiding activities that aggravate the pain is crucial for healing.</li>
    <li><strong>Ice therapy:</strong> Applying ice packs to the affected area for 15-20 minutes at a time, several times a day, can help reduce inflammation.</li>
    <li><strong>Bracing:</strong> Wearing a counterforce brace can help support the muscles and tendons and reduce strain.</li>
    <li><strong>Physical therapy:</strong> Our experienced physiotherapists will design a personalized exercise program to improve flexibility, strengthen the forearm muscles, and improve grip strength.</li>
    <li><strong>Anti-inflammatory medications:</strong> Over-the-counter pain relievers like ibuprofen or naproxen can help manage pain and inflammation.</li>
    <li><strong>Corticosteroid injections:</strong> In some cases, Dr. Srivanth may recommend a corticosteroid injection to reduce inflammation and pain.</li>
    <li><strong>Surgery:</strong> In rare cases, surgery may be necessary to repair a torn tendon.</li>
  </ul>

  <img src="/images/treatments/golfers-elbow/golfers-elbow-exercises.jpg" alt="Medial Epicondylitis rehabilitation exercises including wrist flexion, extension, forearm pronation, grip strengthening" class="w-full h-auto rounded-xl border shadow-lg my-8" />

  <img src="/images/treatments/golfers-elbow/medial-epicondylitis-anatomy.jpg" alt="Medial Epicondylitis anatomy showing triceps, biceps, humerus, capitellum, extensor muscles and tendon pain location" class="w-full h-auto rounded-xl border shadow-lg my-8" />

  <h2 class="text-2xl font-bold mt-8 mb-4">Why Choose Dr. Srivanth''s Orthopedic Clinic for Golfer''s Elbow Treatment?</h2>
  <ul class="list-disc pl-6 mb-6 space-y-2">
    <li><strong>Experienced Surgeon:</strong> Dr. Srivanth''s expertise allows him to diagnose and treat golfer''s elbow effectively, even complex cases.</li>
    <li><strong>Non-surgical and Surgical Treatment Options:</strong> We offer a comprehensive range of treatment options to address your specific needs and preferences.</li>
    <li><strong>Advanced Diagnostics:</strong> We utilize the latest diagnostic tools to ensure an accurate diagnosis and personalized treatment plan.</li>
    <li><strong>Compassionate Care:</strong> Our team is dedicated to providing personalized and compassionate care throughout your treatment journey.</li>
    <li><strong>Convenient Location:</strong> We are conveniently located in Ashok Nagar to serve patients in Hyderabad and surrounding areas.</li>
  </ul>

  <h2 class="text-2xl font-bold mt-8 mb-4">Schedule an Appointment Today!</h2>
  <p class="mb-6">Don''t let golfer''s elbow pain limit your activities. Contact Dr. Srivanth''s Orthopedic Clinic today to schedule an appointment and discuss your treatment options. We are committed to helping you get back to living a pain-free and active life.</p>
</div>',
      2,
      2
    )
    ON CONFLICT (section_id, slug)
    DO UPDATE SET
      name = EXCLUDED.name,
      content = EXCLUDED.content,
      parent_id = EXCLUDED.parent_id,
      level = EXCLUDED.level,
      updated_at = NOW()
    RETURNING id INTO page_id;

    IF page_id IS NOT NULL THEN
      RAISE NOTICE '✓ Golfers Elbow content added successfully';
      RAISE NOTICE 'URL: /orthopaedics/golfers-elbow';
    ELSE
      RAISE NOTICE '✗ Failed to insert Golfers Elbow page';
    END IF;
  ELSE
    RAISE NOTICE '✗ Orthopaedics or Elbow Pain section not found';
  END IF;
END $$;
