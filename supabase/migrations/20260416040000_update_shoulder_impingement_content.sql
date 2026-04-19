-- Update existing Shoulder Impingement page under Orthopaedics -> Shoulder Pain

DO $$
DECLARE
  ortho_id UUID;
  shoulder_pain_id UUID;
  page_id UUID;
BEGIN
  SELECT id INTO ortho_id FROM public.medical_sections WHERE slug = 'orthopaedics';
  SELECT id INTO shoulder_pain_id FROM public.medical_subsections WHERE section_id = ortho_id AND slug = 'shoulder-pain';

  IF ortho_id IS NOT NULL AND shoulder_pain_id IS NOT NULL THEN
    UPDATE public.medical_subsections
    SET
      content = '<div class="medical-content">
  <h2 class="text-2xl font-bold mt-8 mb-4">Shoulder Impingement &amp; Impingement Syndrome Treatment</h2>
  <p class="text-xl text-muted-foreground mb-6">Expert Care for Lasting Shoulder Relief</p>

  <h2 class="text-2xl font-bold mt-8 mb-4">What is Shoulder Impingement?</h2>
  <p class="mb-6">Shoulder impingement (also called impingement syndrome) occurs when the tendons of the rotator cuff get compressed between the bones of the shoulder — particularly under the acromion (part of the shoulder blade). This repeated compression leads to pain, inflammation, and restricted movement.</p>
  <p class="mb-6">It''s one of the most common causes of shoulder pain, especially in people who frequently lift their arms overhead.</p>

  <img src="/images/treatments/shoulder-impingement/shoulder-impingement-syndrome.jpg" alt="Shoulder Impingement Syndrome diagram showing reduced sub-acromial space, acromion, bursa, humerus and scapula anatomy" class="w-full h-auto rounded-xl border shadow-lg my-8" />

  <h2 class="text-2xl font-bold mt-8 mb-4">Common Causes of Shoulder Impingement</h2>
  <p class="mb-3">Shoulder impingement can develop due to:</p>
  <ul class="list-disc pl-6 mb-6 space-y-2">
    <li>Repetitive overhead activities (sports, painting, lifting)</li>
    <li>Poor posture (rounded shoulders)</li>
    <li>Bone spurs or structural abnormalities</li>
    <li>Rotator cuff weakness or imbalance</li>
    <li>Age-related wear and tear</li>
  </ul>

  <h2 class="text-2xl font-bold mt-8 mb-4">Symptoms of Impingement Syndrome</h2>
  <p class="mb-3">You may experience:</p>
  <ul class="list-disc pl-6 mb-6 space-y-2">
    <li>Pain while lifting your arm (especially overhead)</li>
    <li>Shoulder pain at night or while sleeping</li>
    <li>Weakness in the arm</li>
    <li>Reduced range of motion</li>
    <li>A pinching sensation during movement</li>
  </ul>
  <p class="mb-6">If untreated, it may progress to rotator cuff tears.</p>

  <h2 class="text-2xl font-bold mt-8 mb-4">Diagnosis of Shoulder Impingement</h2>
  <p class="mb-3">Doctors typically diagnose impingement syndrome through:</p>
  <ul class="list-disc pl-6 mb-6 space-y-2">
    <li>Physical examination and movement tests</li>
    <li>Imaging such as X-rays or MRI</li>
    <li>Assessment of posture and shoulder mechanics</li>
  </ul>
  <p class="mb-6">Early diagnosis helps prevent complications and speeds up recovery.</p>

  <h2 class="text-2xl font-bold mt-8 mb-4">Treatment Options for Shoulder Impingement</h2>
  <p class="mb-4">Treatment depends on severity, but most patients improve with non-surgical care.</p>

  <h3 class="text-xl font-semibold mt-6 mb-3">1. Non-Surgical Treatment (First Line)</h3>
  <ul class="list-disc pl-6 mb-6 space-y-2">
    <li>Rest and activity modification</li>
    <li>Ice packs and anti-inflammatory medications</li>
    <li>Physiotherapy to strengthen shoulder muscles</li>
    <li>Posture correction exercises</li>
  </ul>

  <h3 class="text-xl font-semibold mt-6 mb-3">2. Advanced Non-Surgical Care</h3>
  <ul class="list-disc pl-6 mb-6 space-y-2">
    <li>Corticosteroid injections for inflammation relief</li>
    <li>Targeted rehabilitation programs</li>
  </ul>

  <h3 class="text-xl font-semibold mt-6 mb-3">3. Surgical Treatment (If Needed)</h3>
  <p class="mb-3">If symptoms persist despite conservative treatment:</p>
  <ul class="list-disc pl-6 mb-6 space-y-2">
    <li>Arthroscopic subacromial decompression</li>
    <li>Removal of bone spurs</li>
    <li>Repair of damaged tendons</li>
  </ul>
  <p class="mb-6">Minimally invasive techniques allow faster recovery and less pain.</p>

  <h2 class="text-2xl font-bold mt-8 mb-4">Recovery &amp; Prevention Tips</h2>
  <ul class="list-disc pl-6 mb-6 space-y-2">
    <li>Maintain proper posture</li>
    <li>Perform regular shoulder strengthening exercises</li>
    <li>Avoid repetitive overhead strain</li>
    <li>Warm up before sports or workouts</li>
    <li>Follow your physiotherapy program consistently</li>
  </ul>

  <h2 class="text-2xl font-bold mt-8 mb-4">When to See a Doctor</h2>
  <p class="mb-3">Consult an orthopedic specialist if:</p>
  <ul class="list-disc pl-6 mb-6 space-y-2">
    <li>Pain lasts more than a few weeks</li>
    <li>You cannot lift your arm comfortably</li>
    <li>Symptoms interfere with sleep or daily activities</li>
  </ul>
  <p class="mb-6">Early treatment can prevent long-term damage and restore full function.</p>

  <h2 class="text-2xl font-bold mt-8 mb-4">Why Choose Dr. Srivanth''s Orthopedic Clinic?</h2>
  <ul class="list-disc pl-6 mb-6 space-y-2">
    <li><strong>Fellowship-Trained:</strong> Advanced training in Shoulder &amp; Elbow Surgery in South Korea.</li>
    <li><strong>Minimally Invasive:</strong> Arthroscopic techniques for faster recovery and less scarring.</li>
    <li><strong>Comprehensive Care:</strong> From diagnosis to rehabilitation, all under one roof.</li>
    <li><strong>Convenient Location:</strong> Located in Ashok Nagar, serving patients across Hyderabad including Chikkadpally, RTC Cross Roads, Narayanguda, Himayath Nagar, and surrounding areas.</li>
  </ul>

  <h2 class="text-2xl font-bold mt-8 mb-4">Schedule an Appointment Today</h2>
  <p class="mb-6">Don''t let shoulder pain limit your daily life. Contact Dr. Srivanth''s Orthopedic Clinic today to schedule a consultation and get back to living pain-free.</p>
</div>',
      updated_at = NOW()
    WHERE section_id = ortho_id
      AND parent_id = shoulder_pain_id
      AND slug = 'shoulder-impingement'
    RETURNING id INTO page_id;

    IF page_id IS NOT NULL THEN
      RAISE NOTICE '✓ Shoulder Impingement content updated successfully with ID: %', page_id;
      RAISE NOTICE 'URL: /orthopaedics/shoulder-impingement';
    ELSE
      RAISE NOTICE '✗ Shoulder Impingement page not found - check slug';
    END IF;
  ELSE
    RAISE NOTICE '✗ Orthopaedics or Shoulder Pain section not found';
  END IF;
END $$;
