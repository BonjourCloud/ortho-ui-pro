export const doctorProfile = {
  name: "Dr. Ortho",
  title: "MS Ortho, DNB - Orthopedic Surgeon",
  specialization: "Joint Replacement & Sports Medicine",
  shortBio: "Experienced orthopedic surgeon specializing in minimally invasive joint replacements and sports injury management with 15+ years of practice in Hyderabad.",
  fullBio: "Dr. Ortho is a renowned orthopedic surgeon with over 15 years of experience in joint replacement surgery, sports medicine, and trauma care. He has performed over 2000 successful surgeries and helped thousands of patients return to an active lifestyle. His approach combines the latest evidence-based medicine with personalized patient care.",
  philosophy: "I believe that every patient deserves personalized care based on the latest scientific evidence. Whether we choose surgical or conservative treatment, the goal is always to help you return to the activities you love as quickly and safely as possible.",
  yearsExperience: 15,
  happyPatients: 5000,
  surgeriesCompleted: 2000,
  branches: 2,
  languages: ["English", "Hindi", "Telugu"],
  registrationNumber: "TSMC/FMR/12345",
  consultationFee: 800,
  emergencyContact: "+91-9441824999",
  whatsappNumber: "+91-9441824999",
  email: "consult@drortho.com",
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
    text: "I was suffering from severe knee pain for years. The doctor performed my knee replacement and I was walking without pain in 3 weeks. I could attend my daughter's wedding and dance. Truly a life-changing experience.",
  },
  {
    id: "test-2", patientName: "Lakshmi Devi", initials: "L.D.", age: 65, gender: "F", occupation: "Homemaker",
    condition: "Hip Replacement", rating: 5, location: "Jubilee Hills",
    text: "I couldn't sit on the floor for puja for 2 years. After my hip replacement, I can sit cross-legged again. My family is so happy to see me pain-free.",
  },
  {
    id: "test-3", patientName: "Suresh Reddy", initials: "S.R.", age: 28, gender: "M", occupation: "Cricket Coach",
    condition: "ACL Reconstruction", rating: 5, location: "Secunderabad",
    text: "Tore my ACL playing cricket. Thought my coaching career was over. The surgery was done and I was back on the field in 8 months. Forever grateful.",
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

export const blogPosts = [
  {
    id: "bp-1",
    title: "10 Signs You Might Need Knee Replacement Surgery",
    slug: "signs-knee-replacement",
    excerpt: "Wondering if it's time for knee replacement? Here are 10 signs that indicate you might benefit from surgery.",
    content: `<p>Knee replacement surgery is one of the most successful procedures in modern medicine. But how do you know when it's time? Here are 10 signs that indicate you might benefit from knee replacement surgery.</p>
    <h3>1. Pain that wakes you at night</h3><p>If knee pain regularly interrupts your sleep, it's a sign that your joint damage is significant. Night pain suggests the cartilage has worn down enough that bone is rubbing on bone even at rest.</p>
    <h3>2. Difficulty walking or climbing stairs</h3><p>When everyday activities become painful, your quality of life is being significantly impacted.</p>
    <h3>3. Knee stiffness that limits movement</h3><p>If you can't fully bend or straighten your knee, arthritis may have progressed significantly.</p>
    <h3>4. Swelling that doesn't improve</h3><p>Persistent swelling despite rest, ice, and medication suggests chronic joint inflammation.</p>
    <h3>5. Conservative treatments no longer work</h3><p>When medications, injections, and physiotherapy stop providing relief, surgery may be the next step.</p>
    <h3>6. Knee deformity (bowing)</h3><p>Visible bowing of the legs indicates severe cartilage loss on one side of the knee.</p>
    <h3>7. Can't sit on the floor for prayers</h3><p>In Indian culture, sitting cross-legged for puja or namaz is important. Inability to do so significantly impacts daily life.</p>
    <h3>8. Dependency on walking aids</h3><p>If you need a cane or walker to move around, your knee function is severely compromised.</p>
    <h3>9. Unable to do household chores</h3><p>When cooking, cleaning, or climbing stairs at home becomes impossible, it's time to consider surgery.</p>
    <h3>10. Depression due to immobility</h3><p>Being confined to home and unable to attend family functions or religious gatherings can cause emotional distress.</p>`,
    category: "Knee Health",
    tags: ["Knee Replacement", "Arthritis"],
    readTime: 6,
    viewsCount: 2450,
    likesCount: 187,
    publishedAt: "2024-02-15",
    isFeatured: true,
  },
  {
    id: "bp-2",
    title: "ACL Recovery Time: What Every Cricketer Must Know",
    slug: "acl-recovery-cricketers",
    excerpt: "A detailed guide for cricketers on ACL recovery timeline, return to play, and rehabilitation.",
    content: `<p>ACL injuries are among the most feared injuries in cricket. Whether you're a batsman, bowler, or fielder, understanding the recovery timeline is crucial for getting back on the field safely.</p>
    <h3>Timeline Overview</h3>
    <p><strong>Week 1-2:</strong> Rest, ice, elevation. Crutches for mobility.</p>
    <p><strong>Week 3-6:</strong> Begin physiotherapy. Focus on regaining range of motion.</p>
    <p><strong>Month 2-3:</strong> Strengthening exercises. Light walking without support.</p>
    <p><strong>Month 4-6:</strong> Sport-specific training begins. Running on flat surfaces.</p>
    <p><strong>Month 7-9:</strong> Cricket drills — batting, fielding. No full bowling yet.</p>
    <p><strong>Month 9-12:</strong> Full return to cricket with medical clearance.</p>
    <h3>Key Tips</h3>
    <ul><li>Don't rush the recovery — re-injury risk is highest in the first year</li>
    <li>Invest in proper physiotherapy — it's as important as the surgery itself</li>
    <li>Wear a knee brace when returning to sport initially</li>
    <li>Focus on hamstring and quadriceps strengthening</li></ul>`,
    category: "Sports Injuries",
    tags: ["ACL", "Cricket Injuries", "Recovery Tips"],
    readTime: 8,
    viewsCount: 1876,
    likesCount: 143,
    publishedAt: "2024-01-20",
    isFeatured: true,
  },
  {
    id: "bp-3",
    title: "Understanding Hip Pain: When to See an Orthopedic Surgeon",
    slug: "understanding-hip-pain",
    excerpt: "Hip pain can range from mild discomfort to debilitating. Learn when it's time to consult a specialist.",
    content: `<p>Hip pain is a common complaint, especially among older adults and active individuals. Understanding the causes and knowing when to seek specialist care can make a significant difference in outcomes.</p>
    <h3>Common Causes</h3>
    <ul><li>Osteoarthritis — the most common cause in people over 50</li>
    <li>Avascular necrosis — loss of blood supply to the femoral head</li>
    <li>Labral tears — common in athletes</li>
    <li>Hip fractures — especially in elderly patients with osteoporosis</li></ul>
    <h3>When to See a Doctor</h3>
    <p>Seek immediate consultation if you experience: sudden severe pain, inability to bear weight, visible deformity, or pain after a fall.</p>`,
    category: "Treatment Options",
    tags: ["Hip Pain", "Arthritis"],
    readTime: 5,
    viewsCount: 1234,
    likesCount: 98,
    publishedAt: "2024-03-10",
    isFeatured: false,
  },
  {
    id: "bp-4",
    title: "Life After Knee Replacement: A Patient's Journey",
    slug: "life-after-knee-replacement",
    excerpt: "Real stories from patients who underwent knee replacement and how their lives changed.",
    content: `<p>Knee replacement surgery can be life-changing. Here are real experiences from patients who took the step and never looked back.</p>
    <h3>Rajesh's Story</h3>
    <p>At 58, Rajesh was a school teacher who couldn't stand for more than 10 minutes. Six months after his knee replacement, he was back teaching, standing all day, and even played cricket with his students.</p>
    <h3>Lakshmi's Story</h3>
    <p>Lakshmi, a 65-year-old homemaker, couldn't sit on the floor for her daily puja. Three months after surgery, she was sitting cross-legged and attending temple regularly.</p>`,
    category: "Patient Stories",
    tags: ["Knee Replacement", "Recovery Tips"],
    readTime: 4,
    viewsCount: 1567,
    likesCount: 201,
    publishedAt: "2024-02-28",
    isFeatured: true,
  },
];

export const caseStudies = [
  {
    id: "cs-1",
    slug: "cricket-coach-acl-reconstruction",
    patientInitials: "S.R.",
    age: 28,
    gender: "M",
    occupation: "Cricket Coach",
    condition: "ACL Tear - Right Knee",
    procedureName: "Arthroscopic ACL Reconstruction",
    surgeryDate: "2023-06-15",
    surgeryType: "minimally_invasive" as const,
    hospitalStayDays: 1,
    followUpPeriod: "6 months",
    outcomeSummary: "Patient has regained full range of motion (0-135°). Returned to coaching at 8 weeks. Started cricket drills at 6 months. Currently pain-free.",
    painScorePre: 7,
    painScorePost: 1,
    rangeOfMotionPre: "0-90°",
    rangeOfMotionPost: "0-135°",
    testimonial: "I thought my coaching career was over when my knee gave way. Not only was my knee fixed but I got my confidence back. Today I can demonstrate every cricket shot to my students.",
    returnToWork: "Returned to coaching at 8 weeks",
    returnToSports: "Cricket drills at 6 months",
    isFeatured: true,
    publishedDate: "2023-12-10",
    milestones: [
      { day: 1, title: "Discharged from hospital", description: "Walked with crutches, pain managed" },
      { day: 14, title: "Sutures removed", description: "Started physiotherapy" },
      { day: 42, title: "Walked without support", description: "Returned to light coaching duties" },
      { day: 180, title: "Returned to cricket drills", description: "Full confidence in knee" },
    ],
  },
  {
    id: "cs-2",
    slug: "elderly-lady-knee-replacement",
    patientInitials: "L.D.",
    age: 68,
    gender: "F",
    occupation: "Homemaker",
    condition: "Severe Knee Arthritis - Both Knees",
    procedureName: "Total Knee Replacement (Right)",
    surgeryDate: "2023-08-20",
    surgeryType: "elective" as const,
    hospitalStayDays: 3,
    followUpPeriod: "6 months",
    outcomeSummary: "Patient now walks without pain, can sit on floor for prayers, and attends temple regularly. Range of motion 0-115°.",
    painScorePre: 8,
    painScorePost: 2,
    rangeOfMotionPre: "0-80°",
    rangeOfMotionPost: "0-115°",
    testimonial: "I couldn't sit on the floor for puja for 2 years. After the surgery, I can sit cross-legged again. My family is so happy.",
    returnToWork: "Resumed all household work at 8 weeks",
    returnToSports: "Sitting on floor for prayers at 12 weeks",
    isFeatured: true,
    publishedDate: "2024-01-15",
    milestones: [
      { day: 3, title: "Discharged, walking with walker", description: "Pain well-controlled" },
      { day: 21, title: "Walking with cane", description: "Physiotherapy progressing well" },
      { day: 60, title: "Walking without support at home", description: "Household work resumed" },
      { day: 90, title: "Sat on floor for Diwali puja", description: "Emotional milestone for family" },
    ],
  },
  {
    id: "cs-3",
    slug: "teacher-bilateral-knee-replacement",
    patientInitials: "R.K.",
    age: 58,
    gender: "M",
    occupation: "School Teacher",
    condition: "Bilateral Knee Osteoarthritis",
    procedureName: "Total Knee Replacement (Staged Bilateral)",
    surgeryDate: "2023-04-10",
    surgeryType: "elective" as const,
    hospitalStayDays: 4,
    followUpPeriod: "12 months",
    outcomeSummary: "Both knees replaced successfully. Patient now stands and teaches full day without pain. Plays cricket with students on weekends.",
    painScorePre: 9,
    painScorePost: 1,
    rangeOfMotionPre: "0-70°",
    rangeOfMotionPost: "0-130°",
    testimonial: "I was suffering from severe knee pain for years. After both knee replacements, I was walking without pain. I could attend my daughter's wedding and dance!",
    returnToWork: "Returned to teaching at 10 weeks",
    returnToSports: "Cricket with students at 6 months",
    isFeatured: true,
    publishedDate: "2024-02-01",
    milestones: [
      { day: 4, title: "Discharged after first knee", description: "Started walker-assisted walking" },
      { day: 30, title: "Walking with cane", description: "Physiotherapy 3x/week" },
      { day: 70, title: "Returned to teaching", description: "Standing full periods" },
      { day: 180, title: "Second knee replacement done", description: "Faster recovery this time" },
    ],
  },
];

export const mockAnalytics = {
  totalVisitors: 1847,
  uniqueVisitors: 1292,
  totalPageviews: 5234,
  bounceRate: 38.5,
  totalConversions: 124,
  conversionRate: 3.2,
  whatsappInquiries: 87,
  phoneCalls: 156,
  secondOpinionRequests: 23,
  emiInquiries: 45,
  topPages: [
    { path: "/", views: 1245, uniqueVisitors: 876 },
    { path: "/services/total-knee-replacement", views: 876, uniqueVisitors: 654 },
    { path: "/services/acl-reconstruction", views: 743, uniqueVisitors: 521 },
    { path: "/about", views: 612, uniqueVisitors: 489 },
    { path: "/case-studies", views: 534, uniqueVisitors: 401 },
  ],
  trafficSources: [
    { source: "Google", visitors: 645, conversions: 42 },
    { source: "Direct", visitors: 312, conversions: 28 },
    { source: "WhatsApp", visitors: 187, conversions: 31 },
    { source: "Practo", visitors: 98, conversions: 15 },
    { source: "Justdial", visitors: 50, conversions: 8 },
  ],
  dailyStats: [
    { date: "2024-03-01", visitors: 52, pageviews: 156, appointments: 3 },
    { date: "2024-03-02", visitors: 61, pageviews: 183, appointments: 5 },
    { date: "2024-03-03", visitors: 45, pageviews: 135, appointments: 2 },
    { date: "2024-03-04", visitors: 78, pageviews: 234, appointments: 7 },
    { date: "2024-03-05", visitors: 65, pageviews: 195, appointments: 4 },
    { date: "2024-03-06", visitors: 89, pageviews: 267, appointments: 6 },
    { date: "2024-03-07", visitors: 72, pageviews: 216, appointments: 5 },
  ],
  recentAppointments: [
    { id: "APT-1", name: "Ramesh P.", phone: "+91 98765 XXXXX", type: "New Patient", service: "Knee Consultation", date: "2024-03-08", time: "10:00 AM", status: "confirmed" },
    { id: "APT-2", name: "Sunita K.", phone: "+91 87654 XXXXX", type: "Follow Up", service: "Post-Op Check", date: "2024-03-08", time: "11:00 AM", status: "confirmed" },
    { id: "APT-3", name: "Vikram S.", phone: "+91 76543 XXXXX", type: "New Patient", service: "ACL Assessment", date: "2024-03-09", time: "04:00 PM", status: "pending" },
    { id: "APT-4", name: "Priya M.", phone: "+91 65432 XXXXX", type: "Consultation", service: "Hip Pain", date: "2024-03-09", time: "05:00 PM", status: "pending" },
    { id: "APT-5", name: "Anil R.", phone: "+91 54321 XXXXX", type: "Emergency", service: "Fracture", date: "2024-03-10", time: "07:00 AM", status: "confirmed" },
  ],
};
