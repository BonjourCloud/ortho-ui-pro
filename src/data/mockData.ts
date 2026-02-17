export const doctorProfile = {
  name: "Dr. Srivanth",
  title: "MS Ortho, DNB - Orthopedic Surgeon",
  specialization: "Joint Replacement & Sports Medicine",
  shortBio: "Experienced orthopedic surgeon specializing in minimally invasive joint replacements and sports injury management with 15+ years of practice in Hyderabad.",
  fullBio: "Dr. Srivanth is a renowned orthopedic surgeon with over 15 years of experience in joint replacement surgery, sports medicine, and trauma care. He has performed over 2000 successful surgeries and helped thousands of patients return to an active lifestyle. His approach combines the latest evidence-based medicine with personalized patient care.",
  philosophy: "I believe that every patient deserves personalized care based on the latest scientific evidence. Whether we choose surgical or conservative treatment, the goal is always to help you return to the activities you love as quickly and safely as possible.",
  yearsExperience: 15,
  happyPatients: 5000,
  surgeriesCompleted: 2000,
  branches: 2,
  languages: ["English", "Hindi", "Telugu"],
  registrationNumber: "TSMC/FMR/12345",
  consultationFee: 800,
  emergencyContact: "+919876543210",
  whatsappNumber: "+919876543210",
  email: "consult@drsrivanthortho.com",
  education: [
    { degree: "MBBS", institution: "Osmania Medical College, Hyderabad", yearStart: 2000, yearEnd: 2004 },
    { degree: "MS Orthopaedics", institution: "Nizam's Institute of Medical Sciences", yearStart: 2005, yearEnd: 2008 },
    { degree: "Fellowship - Joint Replacement", institution: "Singapore General Hospital", yearStart: 2010, yearEnd: 2011 },
  ],
  awards: [
    { title: "Best Orthopedic Surgeon", organization: "Hyderabad Medical Association", year: 2023 },
    { title: "Young Achiever Award", organization: "Indian Orthopaedic Association", year: 2018 },
  ],
  memberships: [
    "Indian Orthopaedic Association",
    "Telangana Orthopaedic Surgeons Society",
  ],
};

export const serviceCategories = [
  { id: "cat-1", name: "Joint Replacement", icon: "🦵", slug: "joint-replacement", description: "Advanced joint replacement surgeries for hip, knee, and shoulder using minimally invasive techniques." },
  { id: "cat-2", name: "Sports Medicine", icon: "⚽", slug: "sports-medicine", description: "Specialized treatment for sports-related injuries including ACL reconstruction and rotator cuff surgery." },
  { id: "cat-3", name: "Spine Surgery", icon: "🦴", slug: "spine-surgery", description: "Comprehensive care for spinal conditions including disc herniation, spinal stenosis, and fractures." },
  { id: "cat-4", name: "Trauma & Fracture Care", icon: "🚑", slug: "trauma-care", description: "Emergency and scheduled treatment for all types of bone fractures and trauma injuries." },
];

export const services = [
  {
    id: "svc-1", name: "Total Knee Replacement", slug: "total-knee-replacement", category: "Joint Replacement",
    bodyPart: "knee", shortDescription: "Advanced knee replacement surgery using computer navigation for precise alignment and faster recovery.",
    costRange: "₹2,00,000 - ₹3,50,000", successRate: "98%", patientsTreated: 1200, emiAvailable: true, insuranceCovered: true,
    procedureTime: "90-120 minutes", hospitalStay: "3-4 days", recoveryTime: "6-8 weeks", fullRecovery: "3-6 months",
  },
  {
    id: "svc-2", name: "ACL Reconstruction", slug: "acl-reconstruction", category: "Sports Medicine",
    bodyPart: "knee", shortDescription: "Arthroscopic ACL reconstruction using minimally invasive techniques for faster recovery.",
    costRange: "₹1,20,000 - ₹1,80,000", successRate: "95%", patientsTreated: 850, emiAvailable: true, insuranceCovered: true,
    procedureTime: "60-90 minutes", hospitalStay: "Day care", recoveryTime: "6 weeks", fullRecovery: "9-12 months",
  },
  {
    id: "svc-3", name: "Hip Replacement", slug: "hip-replacement", category: "Joint Replacement",
    bodyPart: "hip", shortDescription: "Total and partial hip replacement using anterior approach for minimal tissue damage.",
    costRange: "₹2,50,000 - ₹4,00,000", successRate: "97%", patientsTreated: 600, emiAvailable: true, insuranceCovered: true,
    procedureTime: "90-120 minutes", hospitalStay: "3-5 days", recoveryTime: "6-8 weeks", fullRecovery: "3-6 months",
  },
  {
    id: "svc-4", name: "Shoulder Arthroscopy", slug: "shoulder-arthroscopy", category: "Sports Medicine",
    bodyPart: "shoulder", shortDescription: "Minimally invasive shoulder surgery for rotator cuff tears, frozen shoulder, and impingement.",
    costRange: "₹1,00,000 - ₹1,50,000", successRate: "94%", patientsTreated: 400, emiAvailable: true, insuranceCovered: true,
    procedureTime: "60-90 minutes", hospitalStay: "Day care", recoveryTime: "4-6 weeks", fullRecovery: "4-6 months",
  },
  {
    id: "svc-5", name: "Spinal Disc Surgery", slug: "spinal-disc-surgery", category: "Spine Surgery",
    bodyPart: "spine", shortDescription: "Minimally invasive discectomy and spinal decompression for herniated discs.",
    costRange: "₹1,50,000 - ₹2,50,000", successRate: "92%", patientsTreated: 350, emiAvailable: true, insuranceCovered: true,
    procedureTime: "60-90 minutes", hospitalStay: "1-2 days", recoveryTime: "4-6 weeks", fullRecovery: "3 months",
  },
  {
    id: "svc-6", name: "Fracture Fixation", slug: "fracture-fixation", category: "Trauma & Fracture Care",
    bodyPart: "other", shortDescription: "Emergency and scheduled surgical treatment for complex fractures using modern fixation techniques.",
    costRange: "₹50,000 - ₹2,00,000", successRate: "96%", patientsTreated: 1500, emiAvailable: true, insuranceCovered: true,
    procedureTime: "30-120 minutes", hospitalStay: "1-5 days", recoveryTime: "6-12 weeks", fullRecovery: "3-6 months",
  },
];

export const testimonials = [
  {
    id: "test-1", patientName: "Rajesh Kumar", initials: "R.K.", age: 58, gender: "M", occupation: "Teacher",
    condition: "Total Knee Replacement", rating: 5, location: "Banjara Hills",
    text: "I was suffering from severe knee pain for years. Dr. Srivanth performed my knee replacement and I was walking without pain in 3 weeks. I could attend my daughter's wedding and dance. Truly a life-changing experience.",
  },
  {
    id: "test-2", patientName: "Lakshmi Devi", initials: "L.D.", age: 65, gender: "F", occupation: "Homemaker",
    condition: "Hip Replacement", rating: 5, location: "Jubilee Hills",
    text: "I couldn't sit on the floor for puja for 2 years. After Dr. Srivanth's hip replacement, I can sit cross-legged again. My family is so happy to see me pain-free.",
  },
  {
    id: "test-3", patientName: "Suresh Reddy", initials: "S.R.", age: 28, gender: "M", occupation: "Cricket Coach",
    condition: "ACL Reconstruction", rating: 5, location: "Secunderabad",
    text: "Tore my ACL playing cricket. Thought my coaching career was over. Dr. Srivanth did my surgery and I was back on the field in 8 months. Forever grateful.",
  },
];

export const insuranceProviders = [
  "Star Health Insurance",
  "ICICI Lombard",
  "New India Assurance",
  "Bajaj Allianz",
  "HDFC Ergo",
];

export const timeSlots = [
  { time: "07:00 AM", available: true },
  { time: "08:00 AM", available: true },
  { time: "09:00 AM", available: true },
  { time: "10:00 AM", available: false },
  { time: "11:00 AM", available: false },
  { time: "04:00 PM", available: true },
  { time: "05:00 PM", available: true },
  { time: "06:00 PM", available: true },
  { time: "07:00 PM", available: true },
  { time: "08:00 PM", available: true },
];
