-- Update existing Shoulder Dislocation page under Orthopaedics -> Shoulder Pain with full content

DO $$
DECLARE
  ortho_id UUID;
  shoulder_pain_id UUID;
  shoulder_dislocation_id UUID;
BEGIN
  -- Get orthopaedics section ID
  SELECT id INTO ortho_id FROM public.medical_sections WHERE slug = 'orthopaedics';
  
  -- Get shoulder pain subsection ID
  SELECT id INTO shoulder_pain_id 
  FROM public.medical_subsections 
  WHERE section_id = ortho_id AND slug = 'shoulder-pain';
  
  IF ortho_id IS NOT NULL AND shoulder_pain_id IS NOT NULL THEN
    -- Update existing Shoulder Dislocation page
    UPDATE public.medical_subsections
    SET 
      content = '<div class="medical-content">
  <h2 class="text-2xl font-bold mt-8 mb-4">Shoulder Dislocation Treatment at Dr. Srivanth''s Orthopedic Clinic</h2>
  
  <p class="text-lg mb-6">Shoulder dislocation is a common injury that requires expert care. At Dr. Srivanth''s Orthopedic Clinic, conveniently located in Ashok Nagar, Hyderabad, we offer advanced arthroscopic treatment for shoulder instability and recurrent dislocations.</p>

  <h2 class="text-2xl font-bold mt-8 mb-4">Definition</h2>
  <p class="mb-4">The joint cavity of the scapula (glenoid) has an almost flat shape. It articulates with the head of the humerus, which is shaped like a third of a sphere. This joint is much less tightly fitted than the hip joint.</p>
  
  <p class="mb-4">This is why the shoulder is the most mobile joint in the body, but also the most unstable.</p>
  
  <p class="mb-6">The glenoid labrum on the rim of the glenoid and the fibrous pouch surrounding the joint (the capsule) hold the head of the humerus in its socket. Each time the head of the humerus is completely (dislocated) or partially (subluxated) dislocated, it damages the structures responsible for holding it in place (labral detachment, capsule distension, bone lesions). This is why the shoulder becomes increasingly unstable and dislocates more and more frequently.</p>

  <h2 class="text-2xl font-bold mt-8 mb-4">Examinations Requested</h2>
  <ul class="list-disc pl-6 mb-6 space-y-2">
    <li>X-rays less than 3 months old</li>
    <li>3D Scanner (CT scan)</li>
  </ul>

  <h2 class="text-2xl font-bold mt-8 mb-4">The Intervention</h2>
  <p class="mb-4">Has your doctor suggested surgery aimed at stabilizing your shoulder?</p>
  
  <p class="mb-4">The operation is performed without opening the joint, by visualizing the inside of the shoulder using a small cable (fiber optic) connected to a camera (arthroscopy). The anesthesiologist will put you completely to sleep (general anesthesia).</p>
  
  <p class="mb-4">To prevent further dislocations, the surgeon can:</p>
  <ul class="list-disc pl-6 mb-6 space-y-2">
    <li>Tighten the capsule and fix it in the correct position (this gesture is called <strong>Bankart</strong>).</li>
    <li>And/or repair and reinforce the glenoid rim, possibly adding a piece of bone (<strong>Latarjet procedure</strong>). This operation, performed arthroscopically, involves moving a muscle (and its bony attachment) in front of the humeral head to prevent it from dislocating again (hammock effect).</li>
  </ul>

  <img src="/images/treatments/shoulder-dislocation/bankart-lesion.jpg" alt="Bankart lesion and result of the surgical operation" class="w-full h-auto rounded-xl border shadow-lg my-8" />

  <img src="/images/treatments/shoulder-dislocation/latarjet-procedure.jpg" alt="Latarjet procedure - arthroscopy technique adapted by Professor Pascal Boileau" class="w-full h-auto rounded-xl border shadow-lg my-8" />

  <img src="/images/treatments/shoulder-dislocation/shoulder-anatomy.jpg" alt="Shoulder anatomy showing normal position and anterior/posterior dislocation" class="w-full h-auto rounded-xl border shadow-lg my-8" />

  <h2 class="text-2xl font-bold mt-8 mb-4">After the Procedure</h2>
  <p class="mb-4">The hospital stay typically lasts between one and two days. In some cases, this procedure can be performed on an outpatient basis, allowing you to return home the same evening.</p>
  
  <p class="mb-4">Pain typically disappears within the first few weeks. The shoulder remains immobilized for four weeks in a neutral rotation splint. However, self-rehabilitation exercises (pendulum exercises) are started early.</p>
  
  <p class="mb-6">Physical therapy with a physiotherapist begins after four weeks. This therapy helps you regain shoulder flexibility. You will be able to move your shoulder normally after two to three months, and full recovery is expected within three to six months.</p>

  <h2 class="text-2xl font-bold mt-8 mb-4">Rehabilitation</h2>
  <p class="mb-6">Rehabilitation strengthens the muscles that prevent the joint from dislocating. Be careful during physical activities (sports, work), even long after surgery. Despite the repairs, accidental dislocation remains possible.</p>

  <h2 class="text-2xl font-bold mt-8 mb-4">Why Choose Dr. Srivanth for Shoulder Dislocation Treatment?</h2>
  <ul class="list-disc pl-6 mb-6 space-y-2">
    <li><strong>Fellowship-Trained:</strong> Dr. Srivanth completed advanced fellowship training in Shoulder & Elbow Surgery in South Korea.</li>
    <li><strong>Arthroscopic Expertise:</strong> Minimally invasive techniques for faster recovery and less scarring.</li>
    <li><strong>Advanced Procedures:</strong> Expertise in both Bankart and Latarjet procedures.</li>
    <li><strong>Comprehensive Care:</strong> From diagnosis to rehabilitation, complete treatment under one roof.</li>
    <li><strong>Convenient Location:</strong> Located in Ashok Nagar, serving patients from across Hyderabad.</li>
  </ul>

  <h2 class="text-2xl font-bold mt-8 mb-4">Schedule an Appointment</h2>
  <p class="mb-6">If you''re experiencing shoulder instability or recurrent dislocations, contact Dr. Srivanth''s Orthopedic Clinic today. We are committed to helping you regain a stable, pain-free shoulder.</p>
</div>',
      updated_at = NOW()
    WHERE section_id = ortho_id
      AND parent_id = shoulder_pain_id
      AND slug = 'shoulder-dislocation'
    RETURNING id INTO shoulder_dislocation_id;
    
    IF shoulder_dislocation_id IS NOT NULL THEN
      RAISE NOTICE '✓ Shoulder Dislocation content updated successfully with ID: %', shoulder_dislocation_id;
      RAISE NOTICE 'Location: Orthopaedics → Shoulder Pain → Shoulder Dislocation';
      RAISE NOTICE 'URL: /orthopaedics/shoulder-dislocation';
      RAISE NOTICE '';
      RAISE NOTICE 'NEXT STEP: Upload 3 images to public/images/treatments/shoulder-dislocation/';
      RAISE NOTICE '  1. bankart-lesion.jpg';
      RAISE NOTICE '  2. latarjet-procedure.jpg';
      RAISE NOTICE '  3. shoulder-anatomy.jpg';
    ELSE
      RAISE NOTICE '✗ Shoulder Dislocation page not found';
    END IF;
  ELSE
    RAISE NOTICE '✗ Orthopaedics or Shoulder Pain section not found';
  END IF;
END $$;
