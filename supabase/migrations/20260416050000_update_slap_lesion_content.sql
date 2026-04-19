-- Update existing SLAP Lesion page under Orthopaedics -> Shoulder Pain

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
  <h2 class="text-2xl font-bold mt-8 mb-4">What is a SLAP Lesion?</h2>
  <p class="mb-4">A SLAP lesion (Superior Labrum Anterior to Posterior tear) is an injury to the top (superior) part of the labrum — the cartilage rim surrounding the shoulder socket. This area is where the biceps tendon attaches, making it especially vulnerable to injury.</p>
  <p class="mb-6">The tear occurs from front (anterior) to back (posterior), leading to pain, instability, and reduced shoulder function.</p>

  <img src="/images/treatments/slap-lesion/slap-tear-anatomy.jpg" alt="SLAP Tear diagram showing Superior Labrum Anterior and Posterior Tear - anterior view with normal labrum and labrum tears comparison" class="w-full h-auto rounded-xl border shadow-lg my-8" />

  <img src="/images/treatments/slap-lesion/slap-tear-anatomy.jpg" alt="SLAP Tear diagram showing Superior Labrum Anterior and Posterior Tear - anterior view with normal labrum and labrum tears comparison" class="w-full h-auto rounded-xl border shadow-lg my-8" />

  <h2 class="text-2xl font-bold mt-8 mb-4">Common Causes of SLAP Tears</h2>
  <p class="mb-3">SLAP lesions can develop due to:</p>
  <ul class="list-disc pl-6 mb-6 space-y-2">
    <li>Repetitive overhead activities (cricket, tennis, gym workouts)</li>
    <li>Sudden trauma (fall on an outstretched arm)</li>
    <li>Lifting heavy weights incorrectly</li>
    <li>Shoulder dislocation or instability</li>
    <li>Age-related degeneration</li>
  </ul>
  <p class="mb-6">Athletes and active individuals are at higher risk.</p>

  <h2 class="text-2xl font-bold mt-8 mb-4">Symptoms of a SLAP Lesion</h2>
  <p class="mb-3">Typical symptoms include:</p>
  <ul class="list-disc pl-6 mb-6 space-y-2">
    <li>Deep shoulder pain (hard to localize)</li>
    <li>Clicking, popping, or catching sensation</li>
    <li>Weakness during lifting or overhead motion</li>
    <li>Reduced range of motion</li>
    <li>Pain during sports or gym activities</li>
  </ul>

  <h2 class="text-2xl font-bold mt-8 mb-4">Diagnosis of SLAP Tear</h2>
  <p class="mb-3">Doctors diagnose SLAP lesions through:</p>
  <ul class="list-disc pl-6 mb-6 space-y-2">
    <li>Detailed physical examination</li>
    <li>Special shoulder tests</li>
    <li>MRI or MR arthrogram (best for labral tears)</li>
  </ul>
  <p class="mb-6">Accurate diagnosis is important, as symptoms often mimic other shoulder problems.</p>

  <h2 class="text-2xl font-bold mt-8 mb-4">Treatment Options for SLAP Lesions</h2>

  <h3 class="text-xl font-semibold mt-6 mb-3">1. Non-Surgical Treatment (First Approach)</h3>
  <p class="mb-3">Many SLAP tears can be treated without surgery:</p>
  <ul class="list-disc pl-6 mb-4 space-y-2">
    <li>Rest and activity modification</li>
    <li>Anti-inflammatory medications</li>
    <li>Physiotherapy focusing on:
      <ul class="list-disc pl-6 mt-2 space-y-1">
        <li>Rotator cuff strengthening</li>
        <li>Scapular stabilization</li>
        <li>Gradual return to activity</li>
      </ul>
    </li>
  </ul>

  <h3 class="text-xl font-semibold mt-6 mb-3">2. Advanced Non-Surgical Care</h3>
  <ul class="list-disc pl-6 mb-6 space-y-2">
    <li>Corticosteroid injections (for pain relief)</li>
    <li>Structured rehabilitation programs</li>
  </ul>

  <h3 class="text-xl font-semibold mt-6 mb-3">3. Surgical Treatment (If Needed)</h3>
  <p class="mb-3">If symptoms persist or in active individuals:</p>
  <ul class="list-disc pl-6 mb-6 space-y-2">
    <li><strong>Arthroscopic SLAP repair</strong> (reattaching the labrum)</li>
    <li><strong>Biceps tenodesis</strong> (relocating tendon attachment)</li>
    <li><strong>Debridement</strong> (removal of damaged tissue)</li>
  </ul>
  <p class="mb-6">Minimally invasive surgery ensures quicker recovery and less tissue damage.</p>

  <h2 class="text-2xl font-bold mt-8 mb-4">Recovery After SLAP Treatment</h2>
  <p class="mb-3">Recovery depends on treatment type:</p>
  <ul class="list-disc pl-6 mb-4 space-y-2">
    <li><strong>Non-surgical:</strong> 4–8 weeks</li>
    <li><strong>Post-surgery:</strong> 3–6 months rehabilitation</li>
  </ul>
  <p class="mb-3">Key recovery steps:</p>
  <ul class="list-disc pl-6 mb-6 space-y-2">
    <li>Follow physiotherapy strictly</li>
    <li>Avoid early strain on the shoulder</li>
    <li>Gradually rebuild strength and mobility</li>
  </ul>

  <h2 class="text-2xl font-bold mt-8 mb-4">Prevention Tips</h2>
  <ul class="list-disc pl-6 mb-6 space-y-2">
    <li>Warm up before sports or workouts</li>
    <li>Use proper lifting techniques</li>
    <li>Strengthen shoulder and back muscles</li>
    <li>Avoid repetitive strain without rest</li>
    <li>Maintain good posture</li>
  </ul>

  <h2 class="text-2xl font-bold mt-8 mb-4">When to See a Doctor</h2>
  <p class="mb-3">Seek medical advice if:</p>
  <ul class="list-disc pl-6 mb-6 space-y-2">
    <li>Shoulder pain persists for weeks</li>
    <li>You notice clicking or instability</li>
    <li>Pain affects sports or daily activities</li>
    <li>Weakness is worsening</li>
  </ul>
  <p class="mb-6">Early treatment helps prevent long-term complications.</p>

  <h2 class="text-2xl font-bold mt-8 mb-4">Why Choose Dr. Srivanth''s Orthopedic Clinic?</h2>
  <ul class="list-disc pl-6 mb-6 space-y-2">
    <li><strong>Fellowship-Trained:</strong> Advanced training in Shoulder &amp; Elbow Surgery in South Korea.</li>
    <li><strong>Arthroscopic Expertise:</strong> Minimally invasive SLAP repair and biceps tenodesis techniques.</li>
    <li><strong>Athlete-Focused Care:</strong> Specialized rehabilitation programs for sports professionals and active individuals.</li>
    <li><strong>Convenient Location:</strong> Located in Ashok Nagar, serving patients across Hyderabad including Chikkadpally, RTC Cross Roads, Narayanguda, and surrounding areas.</li>
  </ul>

  <h2 class="text-2xl font-bold mt-8 mb-4">Schedule an Appointment Today</h2>
  <p class="mb-6">Don''t let a SLAP tear keep you from the activities you love. Contact Dr. Srivanth''s Orthopedic Clinic today to get an accurate diagnosis and the right treatment plan for your recovery.</p>
</div>',
      updated_at = NOW()
    WHERE section_id = ortho_id
      AND parent_id = shoulder_pain_id
      AND slug = 'slap-lesion'
    RETURNING id INTO page_id;

    IF page_id IS NOT NULL THEN
      RAISE NOTICE '✓ SLAP Lesion content updated successfully with ID: %', page_id;
      RAISE NOTICE 'URL: /orthopaedics/slap-lesion';
    ELSE
      RAISE NOTICE '✗ SLAP Lesion page not found - check slug';
    END IF;
  ELSE
    RAISE NOTICE '✗ Orthopaedics or Shoulder Pain section not found';
  END IF;
END $$;
