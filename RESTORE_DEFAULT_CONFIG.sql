-- Restore default configuration with all arrays populated
-- Run this in Supabase SQL Editor to restore lost data

UPDATE site_config
SET config = jsonb_set(
  jsonb_set(
    jsonb_set(
      jsonb_set(
        jsonb_set(
          jsonb_set(
            jsonb_set(
              config,
              '{education}',
              '[
                {"degree": "MBBS", "institution": "Osmania Medical College, Hyderabad", "yearStart": 2000, "yearEnd": 2004},
                {"degree": "MS Orthopaedics", "institution": "Nizam''s Institute of Medical Sciences", "yearStart": 2005, "yearEnd": 2008},
                {"degree": "Fellowship - Joint Replacement", "institution": "Singapore General Hospital", "yearStart": 2010, "yearEnd": 2011}
              ]'::jsonb
            ),
            '{awards}',
            '[
              {"title": "Best Orthopedic Surgeon", "organization": "Hyderabad Medical Association", "year": 2023},
              {"title": "Young Achiever Award", "organization": "Indian Orthopaedic Association", "year": 2018}
            ]'::jsonb
          ),
          '{memberships}',
          '["Indian Orthopaedic Association", "Telangana Orthopaedic Surgeons Society"]'::jsonb
        ),
        '{insuranceProviders}',
        '["Star Health Insurance", "ICICI Lombard", "New India Assurance", "Bajaj Allianz", "HDFC Ergo"]'::jsonb
      ),
      '{timeSlots}',
      '[
        {"time": "07:00 AM", "available": true},
        {"time": "08:00 AM", "available": true},
        {"time": "09:00 AM", "available": true},
        {"time": "10:00 AM", "available": false},
        {"time": "11:00 AM", "available": false},
        {"time": "04:00 PM", "available": true},
        {"time": "05:00 PM", "available": true},
        {"time": "06:00 PM", "available": true},
        {"time": "07:00 PM", "available": true},
        {"time": "08:00 PM", "available": true}
      ]'::jsonb
    ),
    '{whyChoose}',
    '[
      {"icon": "Shield", "title": "15+ Years of Expertise", "desc": "Board-certified with fellowship training from Singapore General Hospital."},
      {"icon": "Zap", "title": "Minimally Invasive", "desc": "Smaller incisions, less pain, faster recovery with latest techniques."},
      {"icon": "Heart", "title": "Patient-Centric Care", "desc": "Every patient is treated like family with personalized treatment plans."},
      {"icon": "Users", "title": "Insurance & EMI", "desc": "Cashless insurance accepted. Affordable EMI options available."}
    ]'::jsonb
  ),
  '{serviceCategories}',
  '[
    {"name": "Joint Replacement", "icon": "🦵", "slug": "joint-replacement", "description": "Advanced joint replacement surgeries for hip, knee, and shoulder using minimally invasive techniques."},
    {"name": "Sports Medicine", "icon": "⚽", "slug": "sports-medicine", "description": "Specialized treatment for sports-related injuries including ACL reconstruction and rotator cuff surgery."},
    {"name": "Spine Surgery", "icon": "🦴", "slug": "spine-surgery", "description": "Comprehensive care for spinal conditions including disc herniation, spinal stenosis, and fractures."},
    {"name": "Trauma & Fracture Care", "icon": "🚑", "slug": "trauma-care", "description": "Emergency and scheduled treatment for all types of bone fractures and trauma injuries."}
  ]'::jsonb
)
WHERE id = 'd394024d-550e-42a8-b7a7-6eb3b176851f';

-- Verify the update
SELECT 
  config->>'doctorName' as doctor_name,
  config->>'email' as email,
  jsonb_array_length(config->'education') as education_count,
  jsonb_array_length(config->'awards') as awards_count,
  jsonb_array_length(config->'insuranceProviders') as insurance_count
FROM site_config
WHERE id = 'd394024d-550e-42a8-b7a7-6eb3b176851f';
