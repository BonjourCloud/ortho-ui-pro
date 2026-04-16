-- Merge duplicate Extracorporeal Shockwave Therapy pages under Physiotherapy
-- Handles both slug variations: 'extracorporeal-shock-wave-therapy' and 'extracorporeal-shockwave-therapy'

DO $$
DECLARE
  physio_id UUID;
  eswt_with_content_id UUID;
  eswt_empty_id UUID;
  deleted_count INTEGER := 0;
BEGIN
  -- Get physiotherapy section ID
  SELECT id INTO physio_id FROM public.medical_sections WHERE slug = 'physiotherapy';
  
  IF physio_id IS NOT NULL THEN
    -- Find the ESWT page with content (longer content length) from either slug variation
    SELECT id INTO eswt_with_content_id
    FROM public.medical_subsections
    WHERE section_id = physio_id
      AND (slug = 'extracorporeal-shockwave-therapy' OR slug = 'extracorporeal-shock-wave-therapy')
      AND LENGTH(COALESCE(content, '')) > 100
    ORDER BY LENGTH(COALESCE(content, '')) DESC
    LIMIT 1;
    
    -- Delete any duplicate ESWT pages (both slug variations, except the one with content)
    DELETE FROM public.medical_subsections
    WHERE section_id = physio_id
      AND (slug = 'extracorporeal-shockwave-therapy' OR slug = 'extracorporeal-shock-wave-therapy')
      AND id != COALESCE(eswt_with_content_id, '00000000-0000-0000-0000-000000000000'::UUID);
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    -- If we found a page with content, update it to ensure it has the latest content and correct slug
    IF eswt_with_content_id IS NOT NULL THEN
      UPDATE public.medical_subsections
      SET 
        name = 'Extracorporeal Shockwave Therapy',
        slug = 'extracorporeal-shockwave-therapy',
        parent_id = NULL,
        level = 1,
        sort_order = 1,
        content = '<div class="medical-content">
  <h2 class="text-2xl font-bold mt-8 mb-4">Extracorporeal Shockwave Therapy (ESWT) at Dr. Srivanth''s Orthopedic Clinic - Find Relief from Chronic Pain</h2>
  
  <p class="text-lg mb-6">Are you experiencing chronic pain in your muscles, tendons, or joints? Extracorporeal shockwave therapy (ESWT) may be a safe and effective solution to help alleviate your pain and improve mobility. At Dr. Srivanth''s Orthopedic Clinic, conveniently located in Ashok Nagar, Hyderabad, we offer ESWT as part of our comprehensive treatment options for patients residing in Ashok Nagar, Chikkadpally, RTC Cross Roads, Vidhya Nagar, Tilak Nagar, Bagh Lingampally, Narayanguda, Himayath Nagar, Basheerbagh, Kavadiguda, Musheerabad, Ram Nagar, Warasiguda, Koranti, and Barkathpura.</p>

  <p class="mb-6">Led by Dr. Dasari Srivanth, a highly qualified orthopedic surgeon, our team utilizes ESWT to treat a variety of chronic pain conditions effectively.</p>

  <h2 class="text-2xl font-bold mt-8 mb-4">What is Extracorporeal Shockwave Therapy (ESWT)?</h2>
  <p class="mb-6">ESWT is a non-invasive treatment that uses high-energy acoustic waves to stimulate healing in soft tissues. These sound waves penetrate deep into the targeted area, promoting blood flow, reducing inflammation, and facilitating tissue regeneration.</p>

  <h2 class="text-2xl font-bold mt-8 mb-4">Conditions Treated with ESWT at Dr. Srivanth''s Orthopedic Clinic:</h2>
  <ul class="list-disc pl-6 mb-6 space-y-2">
    <li><strong>Plantar Fasciitis:</strong> Pain and inflammation on the sole of the foot near the heel.</li>
    <li><strong>Tennis Elbow:</strong> Pain on the outer side of the elbow caused by overuse of the forearm muscles.</li>
    <li><strong>Golfer''s Elbow:</strong> Pain on the inner side of the elbow caused by overuse of the forearm muscles.</li>
    <li><strong>Calcific Tendinitis:</strong> Calcium deposits in tendons that cause pain and inflammation.</li>
    <li><strong>Trigger Finger:</strong> A finger that gets stuck in a bent position due to inflammation in the tendon sheath.</li>
    <li><strong>Chronic Low Back Pain:</strong> Long-lasting pain in the lower back.</li>
    <li><strong>Achilles Tendinitis:</strong> Inflammation of the tendon that connects the calf muscle to the heel bone.</li>
    <li><strong>Patellar Tendinitis (Jumper''s Knee):</strong> Inflammation of the tendon that connects the kneecap to the shinbone.</li>
  </ul>

  <h2 class="text-2xl font-bold mt-8 mb-4">Benefits of ESWT:</h2>
  <ul class="list-disc pl-6 mb-6 space-y-2">
    <li>Non-invasive treatment with minimal discomfort.</li>
    <li>Effective in reducing chronic pain.</li>
    <li>May improve mobility and function.</li>
    <li>Often eliminates the need for surgery or medications.</li>
    <li>Offers a faster healing time compared to traditional therapies.</li>
  </ul>

  <h2 class="text-2xl font-bold mt-8 mb-4">Why Choose Dr. Srivanth''s Orthopedic Clinic for ESWT?</h2>
  <ul class="list-disc pl-6 mb-6 space-y-2">
    <li><strong>Experienced Physician:</strong> Dr. Srivanth''s expertise in orthopedics ensures accurate diagnosis and proper application of ESWT for optimal results.</li>
    <li><strong>Advanced Technology:</strong> We utilize state-of-the-art ESWT equipment to deliver precise and effective treatment.</li>
    <li><strong>Personalized Treatment Plans:</strong> We develop individualized treatment plans based on your specific condition and needs.</li>
    <li><strong>Compassionate Care:</strong> Our team is dedicated to providing you with personalized and compassionate care throughout your treatment journey.</li>
    <li><strong>Convenient Location:</strong> We are conveniently located in Ashok Nagar to serve patients in Hyderabad and surrounding areas.</li>
  </ul>

  <h2 class="text-2xl font-bold mt-8 mb-4">Schedule an Appointment Today!</h2>
  <p class="mb-6">If you''re struggling with chronic pain, explore if ESWT can be a solution for you. Contact Dr. Srivanth''s Orthopedic Clinic today to schedule an appointment and discuss your treatment options. We are committed to helping you find relief and get back to living an active life.</p>
</div>',
        updated_at = NOW()
      WHERE id = eswt_with_content_id;
      
      RAISE NOTICE '✓ Merged duplicate ESWT pages. Deleted % duplicate(s)', deleted_count;
      RAISE NOTICE '✓ Updated ESWT page with ID: %', eswt_with_content_id;
      RAISE NOTICE 'Location: Physiotherapy → Extracorporeal Shockwave Therapy';
      RAISE NOTICE 'URL: /physiotherapy/extracorporeal-shockwave-therapy';
    ELSE
      -- No existing page found, create a new one with content
      INSERT INTO public.medical_subsections (
        section_id, 
        parent_id, 
        name, 
        slug, 
        content,
        level,
        sort_order
      ) VALUES (
        physio_id, 
        NULL, 
        'Extracorporeal Shockwave Therapy', 
        'extracorporeal-shockwave-therapy',
        '<div class="medical-content">
  <h2 class="text-2xl font-bold mt-8 mb-4">Extracorporeal Shockwave Therapy (ESWT) at Dr. Srivanth''s Orthopedic Clinic - Find Relief from Chronic Pain</h2>
  
  <p class="text-lg mb-6">Are you experiencing chronic pain in your muscles, tendons, or joints? Extracorporeal shockwave therapy (ESWT) may be a safe and effective solution to help alleviate your pain and improve mobility. At Dr. Srivanth''s Orthopedic Clinic, conveniently located in Ashok Nagar, Hyderabad, we offer ESWT as part of our comprehensive treatment options for patients residing in Ashok Nagar, Chikkadpally, RTC Cross Roads, Vidhya Nagar, Tilak Nagar, Bagh Lingampally, Narayanguda, Himayath Nagar, Basheerbagh, Kavadiguda, Musheerabad, Ram Nagar, Warasiguda, Koranti, and Barkathpura.</p>

  <p class="mb-6">Led by Dr. Dasari Srivanth, a highly qualified orthopedic surgeon, our team utilizes ESWT to treat a variety of chronic pain conditions effectively.</p>

  <h2 class="text-2xl font-bold mt-8 mb-4">What is Extracorporeal Shockwave Therapy (ESWT)?</h2>
  <p class="mb-6">ESWT is a non-invasive treatment that uses high-energy acoustic waves to stimulate healing in soft tissues. These sound waves penetrate deep into the targeted area, promoting blood flow, reducing inflammation, and facilitating tissue regeneration.</p>

  <h2 class="text-2xl font-bold mt-8 mb-4">Conditions Treated with ESWT at Dr. Srivanth''s Orthopedic Clinic:</h2>
  <ul class="list-disc pl-6 mb-6 space-y-2">
    <li><strong>Plantar Fasciitis:</strong> Pain and inflammation on the sole of the foot near the heel.</li>
    <li><strong>Tennis Elbow:</strong> Pain on the outer side of the elbow caused by overuse of the forearm muscles.</li>
    <li><strong>Golfer''s Elbow:</strong> Pain on the inner side of the elbow caused by overuse of the forearm muscles.</li>
    <li><strong>Calcific Tendinitis:</strong> Calcium deposits in tendons that cause pain and inflammation.</li>
    <li><strong>Trigger Finger:</strong> A finger that gets stuck in a bent position due to inflammation in the tendon sheath.</li>
    <li><strong>Chronic Low Back Pain:</strong> Long-lasting pain in the lower back.</li>
    <li><strong>Achilles Tendinitis:</strong> Inflammation of the tendon that connects the calf muscle to the heel bone.</li>
    <li><strong>Patellar Tendinitis (Jumper''s Knee):</strong> Inflammation of the tendon that connects the kneecap to the shinbone.</li>
  </ul>

  <h2 class="text-2xl font-bold mt-8 mb-4">Benefits of ESWT:</h2>
  <ul class="list-disc pl-6 mb-6 space-y-2">
    <li>Non-invasive treatment with minimal discomfort.</li>
    <li>Effective in reducing chronic pain.</li>
    <li>May improve mobility and function.</li>
    <li>Often eliminates the need for surgery or medications.</li>
    <li>Offers a faster healing time compared to traditional therapies.</li>
  </ul>

  <h2 class="text-2xl font-bold mt-8 mb-4">Why Choose Dr. Srivanth''s Orthopedic Clinic for ESWT?</h2>
  <ul class="list-disc pl-6 mb-6 space-y-2">
    <li><strong>Experienced Physician:</strong> Dr. Srivanth''s expertise in orthopedics ensures accurate diagnosis and proper application of ESWT for optimal results.</li>
    <li><strong>Advanced Technology:</strong> We utilize state-of-the-art ESWT equipment to deliver precise and effective treatment.</li>
    <li><strong>Personalized Treatment Plans:</strong> We develop individualized treatment plans based on your specific condition and needs.</li>
    <li><strong>Compassionate Care:</strong> Our team is dedicated to providing you with personalized and compassionate care throughout your treatment journey.</li>
    <li><strong>Convenient Location:</strong> We are conveniently located in Ashok Nagar to serve patients in Hyderabad and surrounding areas.</li>
  </ul>

  <h2 class="text-2xl font-bold mt-8 mb-4">Schedule an Appointment Today!</h2>
  <p class="mb-6">If you''re struggling with chronic pain, explore if ESWT can be a solution for you. Contact Dr. Srivanth''s Orthopedic Clinic today to schedule an appointment and discuss your treatment options. We are committed to helping you find relief and get back to living an active life.</p>
</div>',
        1,
        1
      )
      RETURNING id INTO eswt_with_content_id;
      
      RAISE NOTICE '✓ Created new ESWT page with ID: %', eswt_with_content_id;
      RAISE NOTICE 'Location: Physiotherapy → Extracorporeal Shockwave Therapy';
      RAISE NOTICE 'URL: /physiotherapy/extracorporeal-shockwave-therapy';
    END IF;
  ELSE
    RAISE NOTICE '✗ Physiotherapy section not found';
  END IF;
END $$;
