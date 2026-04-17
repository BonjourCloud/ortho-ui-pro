-- Update About page content with Dr. Srivanth's comprehensive information

DO $$
BEGIN
  -- Update doctor profile information
  UPDATE public.site_config
  SET
    title = 'Consultant Orthopaedic Surgeon - MS Orthopaedics | Fellowship-Trained in Arthroscopy, Arthroplasty & Sports Medicine',
    full_bio = 'Dr. Srivanth is a highly skilled and internationally trained orthopaedic surgeon specializing in joint replacement, sports injuries, and trauma care. With a strong academic background and global exposure in Germany and South Korea, he combines advanced surgical expertise with compassionate patient care. He is known for precise diagnosis, evidence-based treatment, and delivering excellent functional outcomes with a patient-first approach.',
    philosophy = 'Patient-first approach with evidence-based treatment and precise diagnosis to deliver excellent functional outcomes.',
    specialization = 'Joint Replacement, Sports Injuries, Arthroscopy, Arthroplasty & Trauma Care',
    
    -- Education & Training (3 entries)
    education = jsonb_build_array(
      jsonb_build_object(
        'degree', 'MS Orthopaedics',
        'institution', 'University Topper',
        'yearStart', 2015,
        'yearEnd', 2018
      ),
      jsonb_build_object(
        'degree', 'Fellowship in Hip & Knee Arthroplasty & Sports Medicine',
        'institution', 'Munich, Germany',
        'yearStart', 2019,
        'yearEnd', 2020
      ),
      jsonb_build_object(
        'degree', 'Fellowship in Shoulder & Elbow Surgery',
        'institution', 'South Korea',
        'yearStart', 2020,
        'yearEnd', 2021
      )
    ),
    
    -- Awards & Recognition (3 entries)
    awards = jsonb_build_array(
      jsonb_build_object(
        'title', 'MS Orthopaedics - University Topper',
        'organization', 'University',
        'year', 2018
      ),
      jsonb_build_object(
        'title', 'Multiple National & International Publications',
        'organization', 'Medical Journals',
        'year', 2023
      ),
      jsonb_build_object(
        'title', 'Regular Speaker & Presenter',
        'organization', 'Orthopaedic Conferences',
        'year', 2024
      )
    ),
    
    -- Professional Memberships (7 entries)
    memberships = jsonb_build_array(
      'Indian Orthopaedic Association (IOA)',
      'Indian Arthroscopy Society (IAS)',
      'AO Trauma',
      'ISAKOS',
      'SICOT',
      'ISKSAA',
      'Indian Medical Association (IMA)'
    ),
    
    updated_at = NOW()
  WHERE id = 1;
  
  RAISE NOTICE '✓ About page content updated successfully';
  RAISE NOTICE 'Updated: Title, Full Bio, Philosophy, Specialization';
  RAISE NOTICE 'Education: 3 entries (MS Ortho, Germany Fellowship, South Korea Fellowship)';
  RAISE NOTICE 'Awards: 3 entries (University Topper, Publications, Speaker)';
  RAISE NOTICE 'Memberships: 7 professional organizations';
  RAISE NOTICE 'URL: https://orthocarehub.in/about';
END $$;
