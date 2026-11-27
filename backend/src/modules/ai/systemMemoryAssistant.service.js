'use strict';

const fs = require('fs');
const path = require('path');
const { readPersistentStore } = require('../../core/database/persistentStore');

const MEMORY_PATH = path.resolve(__dirname, '../../../data/gbs_system_memory_snapshot.json');
let cachedMemory = { mtimeMs: 0, data: null };

// Strictly withhold ALL internal developer, control-center, and infrastructure engineering identities from non-developer outputs
const DEVELOPER_SENSITIVE_PATTERN = /\b(developer|dev-control|developer-control-center|dev_token|gabosei|gabriel\s*kubi|osei-appiah|0554594193|rcce|creator|who\s+built|who\s+made|who\s+created|who\s+developed|intruder\s+snapshot|system\s+owner|dev\s*mode|control\s+center)\b/i;

function isDeveloperSensitiveText(str) {
  return DEVELOPER_SENSITIVE_PATTERN.test(String(str || ''));
}

function loadMemorySnapshot() {
  try {
    const stat = fs.statSync(MEMORY_PATH);
    if (cachedMemory.data && cachedMemory.mtimeMs === stat.mtimeMs) {
      return cachedMemory.data;
    }
    const parsed = JSON.parse(fs.readFileSync(MEMORY_PATH, 'utf8'));
    cachedMemory = { mtimeMs: stat.mtimeMs, data: parsed };
    return parsed;
  } catch {
    return null;
  }
}

const ROLE_ACTIVITIES_GUIDE = {
  ADMIN: 'Headmaster / Principal Portal (/portal/admin/dashboard): Serves as the chief executive command center of the school. End-to-end responsibilities and performance duties include: verifying and approving all newly registered staff (Teachers, Secretary, Clinic Doctors/Nurses, Accountants, HR, Staff) and incoming walk-in or online student admissions; holding EXCLUSIVE authority to add school stationery items and set or edit official stationery prices across every class level; vetting and approving Teacher Ghana NaCCA 16-element lesson plans and end-of-term/semester examinations; monitoring full-term Staff Duty Clock-In, early clock-out reasons, and 2-hour auto clock-out compliance; overseeing academic calendars, promotions, defaulters compliance, bus transport routes, inbuilt campus CCTV, institutional System Language & branding, live Faculty/Parent 30fps video/voice conferences, and 4-month trial / student-based term subscriptions. For medical privacy, the Headmaster views only their own personal health status (read-only) while Doctors and Nurses operate the separate School Clinic Dashboard.',
  TEACHER: 'Teacher / Lecturer Portal (/portal/teacher/dashboard): Drives day-to-day classroom instruction and student academic performance. End-to-end responsibilities include: clocking in upon arrival for Headmaster term attendance monitoring; marking individual tick-by-tick daily student attendance registers (Present, Absent, Late, Excused) with archive wrapping; authoring 16-element Ghana NaCCA learner-centred lesson plans and schemes of work, submitting them for Headmaster vetting, responding to revision notes, and logging post-lesson reflections; creating multi-format exams and submitting end-of-term exams for Headmaster vetting; invigilating live exams over the 1.0x real-time proctoring camera wall (issuing warnings, saving evidence snapshots, deducting lost marks); scanning unlimited-question exam scripts with custom answer keys; uploading/recording Class Topic Videos for absent-day learning; tracking Defaulters compliance and tier-native placements; hosting live online classes & parent video/voice calls; viewing the read-only official Stationery Price List set by the Headmaster (no price editing); and viewing only their own personal medical health status (read-only).',
  CLINIC: 'School Clinic Dashboard (/portal/clinic/dashboard — Operated Strictly by School Doctors & Nurses ONLY): Operates as an integrated yet confidential medical portal within the school. End-to-end responsibilities and performance tracking include: clocking in at the Clinic Medical Desk; maintaining the school-wide Student & Staff Medical Profile Registry automatically synced from Admissions and Staff onboarding (Blood Group, Genotype, Allergies, Chronic Conditions, NHIS, Medical Clearance); admitting, examining, and treating students and staff with full vitals (temperature, blood pressure, pulse), clinical diagnoses, prescriptions, sickbay occupancy tracking, and formal sickbay discharges; pulling cross-portal medical dossiers during emergencies; dispatching automated emergency clinic SMS alerts to parents and guardians; managing School Clinic Pharmacy & first-aid inventory with low-stock alerts; conducting emergency voice/video consultations; and viewing the read-only Stationery Price List. All other school staff and Headmaster cannot operate the clinic or view other people\'s clinical records—they only view their own read-only medical health status.',
  SECRETARY: 'School Secretary Portal (/portal/secretary/dashboard): Runs the school\'s front-office operations and official communications. End-to-end responsibilities and performance duties include: clocking in for front-office duty; checking Campus Visitors in and out with full timestamped reference logs (parents, inspectors, vendors, guests); drafting, publishing, and archiving Official School Letters, Parent/Staff Circulars, and Meeting Minutes; scheduling and tracking Headmaster Appointments through completion; operating live 30fps Voice/Video calls, Direct Mobile SMS, and Voice Notes; viewing the official Headmaster Stationery Price List (read-only, without editing prices); and viewing only their own personal medical health status (read-only).',
  STUDENT: 'Student / Undergraduate Portal (/portal/student/dashboard): Empowers learners end-to-end across daily studies, assessments, and fee compliance. Responsibilities and performance features include: following live class timetables and academic schedules; watching Teacher Class Topic Videos and catch-up recordings; submitting homework assignments and borrowing digital syllabus textbooks; sitting AI-proctored online examinations and joining cooperative peer study video conferences; viewing verified terminal report cards, GPA/CGPA, and cumulative transcripts; participating in tier-native courses, shift streams, and separated Industrial Internships vs Academic Attachments (for TVET/University); viewing live fee bills and paying school fees directly into official School Bank or School MoMo accounts with automatic Student Payee referencing synced live to Parents and the Accountant; viewing Headmaster stationery prices; and viewing only their own personal medical health status (read-only).',
  PARENT: 'Parent / Guardian Portal (/portal/parent/dashboard): Connects guardians directly to their child\'s academic, financial, and attendance performance in real time. End-to-end features include: switching across linked wards; reviewing live daily attendance rolls, verified report cards, exam progress, and bus transit pickup stops; settling school fees cleanly via MTN MoMo, Telecel Cash, AT Money, Visa, Mastercard, or Bank Transfer into official School Bank/MoMo accounts while tracking both parent-paid and student self-paid official receipts; viewing Headmaster-priced School Stationery lists; joining live 30fps Video/Voice calls and Direct SMS chats with the Headmaster and Teachers; and viewing only their linked ward\'s medical health status (read-only, without editing).',
  ACCOUNTANT: 'Accountant / Bursar Portal (/portal/accountant/dashboard): Safeguards institutional financial integrity, fee collection, and audit readiness. End-to-end responsibilities and performance metrics include: configuring class fee structures, hostel tiers, and Official School Bank & School MoMo receiving accounts; generating student invoices and tracking debtor compliance holds; auditing live database fee payments across MoMo, Card, and Bank channels with clear separation between Student Self-Payments and Parent Payments plus full Student Payee referencing; reviewing School Stationery revenue & expense audit feeds (read-only catalog prices set by the Headmaster); tracking operating expenses, Headmaster procurement, Alumni philanthropic endowment gifts, and HR payroll disbursements; generating GAAP/IFRS financial statements and trial balances; clocking in for staff duty; and viewing only their own personal medical health status (read-only).',
  STAFF: 'Non-Teaching Staff Portal (/portal/staff/dashboard): Executes campus operations, logistics, and facility reliability. End-to-end responsibilities and performance tracking include: Staff Duty Clock-In, mandatory early clock-out reasons, and +2h auto clock-out; executing assigned operational duties and shift tasks; managing campus inventory depot supplies and equipment; tracking facility maintenance SLA tickets; escalating campus safety incidents; joining campus Voice/Video calls and Direct SMS; viewing the official Headmaster Stationery Price List (read-only, no editing); and viewing only their own personal medical health status (read-only).',
  HR: 'Human Resources (HR) Portal (/portal/hr/dashboard): Oversees workforce excellence, contracts, and staff compliance. End-to-end responsibilities and performance metrics include: maintaining the institutional Staff & Faculty Directory and employment contracts; executing Headmaster HR audit directives; reviewing and approving staff leave & absence requests; configuring payroll salary grouping tiers synced with Accountancy; auditing full-term staff duty attendance compliance; and viewing only their own personal medical health status (read-only).',
  ALUMNI: 'Alumni Member Portal (/portal/alumni/dashboard): Keeps graduated cohorts permanently linked to their alma mater. End-to-end capabilities include: reviewing cumulative Day-1-to-graduation academic records; requesting official sealed digital transcripts; verifying graduation clearance and sign-off status; exploring completion batches and global alumni directories; scheduling Zoom reunions and mentorship sessions; and contributing endowment & scholarship pledges that sync live into the Accountant\'s philanthropic ledger.'
};

const PORTAL_COMPONENTS_INDEX = {
  ADMIN: [
    'Executive Overview, KPI Telemetry & Pending Staff / Admissions Approvals',
    'Exclusive School Stationery Price Authority Desk (ONLY Headmaster Adds & Edits Official Prices)',
    'Teacher NaCCA 16-Element Lesson Plans & End-of-Term Exam Vetting Desks',
    'Full-Term Staff & Clinic Duty Attendance Monitor (+2h Auto Clock-Out)',
    'Academics, Promotions, Timetables & Defaulters Compliance Monitor',
    'Inbuilt Campus CCTV Matrix, Bus Transport Routes & Institutional Language Control',
    'Live 30fps Video/Voice Conferencing & Direct Mobile SMS',
    '4-Month Term Free Trial & Active-Student Subscription Management',
    'Personal Medical Health Status (Read-Only)'
  ],
  TEACHER: [
    'Faculty Command Overview & Staff Duty Clock-In',
    'Tick-by-Tick Individual Student Daily Attendance Register & Weekly Archives',
    'Ghana NaCCA 16-Element Learner-Centred Lesson Plan Studio & Headmaster Vetting Loop',
    'End-of-Term Exam Vetting, Multi-Format Exams & 1.0x Real-Time Live Invigilation Camera Wall',
    'Unlimited-Question AI Exam Script Scanner & Individual Grading',
    'Class Topic Video Platform (Record/Upload Lessons for Absent-Day Learning)',
    'Assignments, Curriculum Placements, Defaulters Monitor & Live Class Video Calls',
    'Official Stationery Price List (Read-Only View — No Adding/Editing Prices)',
    'Personal Medical Health Status (Read-Only View — No Editing)'
  ],
  CLINIC: [
    'Dedicated School Clinic Command (Exclusively Operated by School Doctors & Nurses)',
    'All Staff & Student Medical Profile Registry (Synced from Admissions & Onboarding)',
    'Patient Consultation Intake, Vitals Recording, Diagnosis & Sickbay Admission/Discharge',
    'Cross-Portal Emergency Medical Dossier Pull & Parent SMS Alerts',
    'School Clinic Pharmacy & First-Aid Stock Control with Low-Stock Alerts',
    'Clinic Medical Officer Duty Clock-In Desk & Emergency Voice/Video Calls',
    'Official Stationery Price List (Read-Only View)'
  ],
  SECRETARY: [
    'Secretariat Office Overview & Front-Office Staff Duty Clock-In',
    'Campus Visitor Front-Desk Check-In & Check-Out Ledger',
    'Official Letters, Parent/Staff Circulars & Meeting Minutes Archive',
    'Headmaster Appointments Scheduler & Completion Tracking',
    'Live 30fps Voice/Video Calls, Direct SMS Inbox & Voice Notes',
    'Official Stationery Price List (Read-Only View — No Adding/Editing Prices)',
    'Personal Medical Health Status (Read-Only View — No Editing)'
  ],
  STUDENT: [
    'Scholar Hub Overview, Live Timetable & Academic Schedule',
    'Class Topic Video Player, Catch-Up Recordings & Digital Syllabus Library',
    'Homework Submissions, AI-Proctored Exams & Cooperative Study Video Rooms',
    'Verified Report Cards, Cumulative Transcripts & Tier-Native Internships / Attachments',
    'Student Self-Payment of School Fees (Official School Bank & MoMo Accounts + Payee Reference)',
    'School Stationery Price Catalog & Item Requests',
    'Personal Medical Health Status (Read-Only View)'
  ],
  PARENT: [
    'Parent Overview & Linked Ward Switcher',
    'Real-Time Ward Attendance Rolls & Verified Academic Report Cards',
    'School Fee Checkout (MTN MoMo, Telecel, AT Money, Card, Bank) & Ward Self-Payment Audit Receipts',
    'School Stationery Official Price Guide & Orders',
    'Live 30fps Video/Voice Calls & Direct SMS with Headmaster & Teachers',
    'Bus Transit Tracking & Linked Ward Medical Health Status (Read-Only View)'
  ],
  ACCOUNTANT: [
    'Financial Telemetry KPI Dashboard & Live Revenue Analytics',
    'Class Fee Structures, Official School Bank/MoMo Receiving Accounts & Student Invoicing',
    'Live Database Payment Reconciliation (Student Self-Paid vs Parent-Paid + Payee References)',
    'Debtor Arrears Registry & Financial Compliance Holds',
    'School Stationery Price Catalog (Read-Only) & Synced Financial Audit Feed',
    'Operating Expenses, Alumni Philanthropic Gifts, Procurement & HR Payroll Ledger',
    'GAAP/IFRS Financial Statements & Personal Medical Health Status (Read-Only)'
  ],
  STAFF: [
    'Campus Operations Overview & Staff Duty Clock-In',
    'Operational Duties & Shift Task Tracker',
    'Campus Inventory Depot & Equipment Asset Ledger',
    'Facility Maintenance SLA Command & Safety Incident Escalation',
    'Live Voice/Video Calls, Direct SMS & Official Stationery Price List (Read-Only)',
    'Personal Medical Health Status (Read-Only View)'
  ],
  HR: [
    'HR Workforce Overview & Staff Duty Clock-In',
    'Staff & Faculty Directory, Contracts & Onboarding Compliance',
    'Headmaster HR Audit Directives & Full-Term Attendance Compliance',
    'Staff Leave & Absence Approvals + Payroll Salary Tier Grouping',
    'Personal Medical Health Status (Read-Only View)'
  ],
  ALUMNI: [
    'Alumni Overview & Completion Batch Directory',
    'Cumulative Academic Records & Official Sealed Transcript Requests',
    'Graduation Clearance & Sign-Off Verification',
    'Zoom Reunions, Mentorship & Endowment Pledges (Live Sync to Accountant)'
  ]
};

const CORE_TOPICS = [
  {
    id: 'role_headmaster',
    phrases: ['headmaster portal', 'admin portal', 'principal portal', 'headmaster dashboard', 'admin dashboard', 'what does headmaster', 'headmaster role', 'principal role', 'admin role', 'chancellor'],
    keywords: ['headmaster', 'principal', 'chancellor', 'rector', 'provost'],
    speech: `${ROLE_ACTIVITIES_GUIDE.ADMIN} Key portal modules include: ${PORTAL_COMPONENTS_INDEX.ADMIN.join('; ')}.`,
    action: { navigateTo: '/portal/admin/dashboard' }
  },
  {
    id: 'role_teacher',
    phrases: ['teacher portal', 'lecturer portal', 'teacher dashboard', 'lecturer dashboard', 'teacher role', 'lecturer role', 'teacher activities', 'what does teacher', 'about the teacher', 'know about teacher', 'faculty portal', 'faculty activities'],
    keywords: ['teacher', 'lecturer', 'faculty', 'instructor', 'educator'],
    speech: `${ROLE_ACTIVITIES_GUIDE.TEACHER} Key Teacher Portal components include: ${PORTAL_COMPONENTS_INDEX.TEACHER.join('; ')}.`,
    action: { navigateTo: '/portal/teacher/dashboard' }
  },
  {
    id: 'role_secretary',
    phrases: ['secretary portal', 'secretary dashboard', 'school secretary', 'front desk portal', 'secretary role', 'secretary activities', 'what does secretary', 'about the secretary'],
    keywords: ['secretary', 'front desk', 'visitor log', 'circular', 'official letter', 'appointment', 'appointments', 'minutes', 'reception'],
    speech: `${ROLE_ACTIVITIES_GUIDE.SECRETARY} Key Secretary Portal components include: ${PORTAL_COMPONENTS_INDEX.SECRETARY.join('; ')}.`,
    action: { navigateTo: '/portal/secretary/dashboard' }
  },
  {
    id: 'role_student',
    phrases: ['student portal', 'student dashboard', 'student role', 'student activities', 'what does student', 'about the student', 'undergraduate portal', 'scholar activities'],
    keywords: ['student', 'pupil', 'apprentice', 'undergraduate', 'learner'],
    speech: `${ROLE_ACTIVITIES_GUIDE.STUDENT} Key Student Portal components include: ${PORTAL_COMPONENTS_INDEX.STUDENT.join('; ')}.`,
    action: { navigateTo: '/portal/student/dashboard' }
  },
  {
    id: 'role_parent',
    phrases: ['parent portal', 'guardian portal', 'parent dashboard', 'parent role', 'guardian role', 'parent activities', 'what does parent', 'about the parent'],
    keywords: ['parent', 'guardian', 'mother', 'father', 'ward'],
    speech: `${ROLE_ACTIVITIES_GUIDE.PARENT} Key Parent Portal components include: ${PORTAL_COMPONENTS_INDEX.PARENT.join('; ')}.`,
    action: { navigateTo: '/portal/parent/dashboard' }
  },
  {
    id: 'role_accountant',
    phrases: ['accountant portal', 'bursar portal', 'finance portal', 'accountant dashboard', 'bursar dashboard', 'accountant role', 'bursar role', 'accountant activities', 'what does accountant', 'about the accountant'],
    keywords: ['accountant', 'bursar', 'treasury', 'auditing', 'bookkeeping'],
    speech: `${ROLE_ACTIVITIES_GUIDE.ACCOUNTANT} Key Accountant Portal components include: ${PORTAL_COMPONENTS_INDEX.ACCOUNTANT.join('; ')}.`,
    action: { navigateTo: '/portal/accountant/dashboard' }
  },
  {
    id: 'role_staff',
    phrases: ['staff portal', 'staff dashboard', 'non-teaching staff', 'staff role', 'staff activities', 'what does staff', 'about the staff'],
    keywords: ['non-teaching', 'storekeeper', 'logistics'],
    speech: `${ROLE_ACTIVITIES_GUIDE.STAFF} Key Staff Portal components include: ${PORTAL_COMPONENTS_INDEX.STAFF.join('; ')}.`,
    action: { navigateTo: '/portal/staff/dashboard' }
  },
  {
    id: 'role_hr',
    phrases: ['hr portal', 'hr dashboard', 'human resource portal', 'human resources dashboard', 'hr role', 'hr activities', 'what does hr'],
    keywords: ['human resource', 'hr', 'personnel', 'contracts'],
    speech: `${ROLE_ACTIVITIES_GUIDE.HR} Key HR Portal components include: ${PORTAL_COMPONENTS_INDEX.HR.join('; ')}.`,
    action: { navigateTo: '/portal/hr/dashboard' }
  },
  {
    id: 'role_alumni',
    phrases: ['alumni portal', 'alumni dashboard', 'alumni role', 'graduate role', 'alumni activities', 'what does alumni', 'about alumni'],
    keywords: ['alumni', 'former student', 'graduated'],
    speech: `${ROLE_ACTIVITIES_GUIDE.ALUMNI} Key Alumni Portal components include: ${PORTAL_COMPONENTS_INDEX.ALUMNI.join('; ')}.`,
    action: { navigateTo: '/portal/alumni/dashboard' }
  },
  {
    id: 'role_clinic',
    phrases: ['clinic portal', 'school clinic dashboard', 'doctor portal', 'nurse portal', 'clinic dashboard', 'clinic role', 'doctor role', 'nurse role', 'about the clinic', 'about school clinic'],
    keywords: ['clinic', 'doctor', 'nurse', 'sickbay', 'medical', 'health status', 'pharmacy'],
    speech: `${ROLE_ACTIVITIES_GUIDE.CLINIC} Key School Clinic Portal modules include: ${PORTAL_COMPONENTS_INDEX.CLINIC.join('; ')}.`,
    action: { navigateTo: '/portal/clinic/dashboard' }
  },
  {
    id: 'all_roles_explained',
    phrases: ['each user', 'every portal', 'all portals', 'all roles', 'who uses', 'what does each', 'end to end roles', 'portal performance', 'each dashboard'],
    keywords: ['role', 'roles', 'responsibilities', 'portals', 'dashboards', 'duties', 'performance'],
    speech: `GBS connects 10 synchronized institutional portals operating as one unified school system: ${Object.values(ROLE_ACTIVITIES_GUIDE).join(' ')}`,
    action: null
  },
  {
    id: 'school_stationery',
    phrases: ['school stationery', 'stationery store', 'stationary store', 'school items', 'who sets the price', 'stationery price', 'stationery expense'],
    keywords: ['stationery', 'stationary', 'textbook', 'textbooks', 'cardigan', 'cardigans', 'socks', 'school bag', 'school bags', 'exercise book', 'uniforms', 'bookshop', 'items sold'],
    speech: 'Official School Stationery Pricing Policy: Strictly ONLY the Headmaster has authority to add stationery items and set or edit official prices (Textbooks, Cardigans, Socks, School Bags, Exercise Books, Uniforms) across every class level. Teachers, School Secretaries, Clinic staff, HR, and all other staff only view the listed stationery prices in read-only mode without adding or editing prices. Accountants view the read-only catalog alongside the synced stationery financial audit ledger.',
    action: { openTab: 'stationery' }
  },
  {
    id: 'jolly_phonics_alphabets',
    phrases: ['jolly phonics', '42 sounds', '42 jolly phonics', 'country alphabets', 'how letters are written', 'letter sounds', 'alphabet writing'],
    keywords: ['phonics', 'jolly', 'alphabet', 'alphabets', 'letters', 'writing', 'trace', 'handwriting', 'pronunciation'],
    speech: 'Inside the Universal Language Translator, Mode 4 (42 Jolly Phonics Sounds & Writing) teaches all 42 official Jolly Phonics sounds across Groups 1 to 7 using the EXACT PHONETIC SOUND of each letter and digraph (such as ssssss for s, ah for a, tuh for t, shhhhh for sh — never English letter names), with IPA, kinesthetic actions, example words, numbered visual stroke-order diagrams, and an interactive 4-line trace pad. Mode 5 (Country & Language Alphabets) covers all 17 listed countries on GBS (Ghana Twi/Ga/Ewe/English, Nigeria Hausa/Yoruba, Kenya Kiswahili, South Africa isiZulu, UK, US, Canada, France, Germany, Spain, Brazil, UAE & Saudi Arabic Right-to-Left, India Hindi Devanagari, China Pinyin & Hanzi strokes, and Japan Hiragana) showing exact phonetic letter sounds and step-by-step country letter writing.',
    action: { trigger: 'openTranslator' }
  },
  {
    id: 'clinic',
    phrases: ['school clinic', 'medical record', 'sickbay treatment', 'health dossier', 'medical health status'],
    keywords: ['clinic', 'sickbay', 'medical', 'health', 'doctor', 'nurse', 'sick', 'hospital', 'treatment', 'medicine', 'blood', 'genotype', 'allergy'],
    speech: 'The School Clinic operates as a separate institutional dashboard (/portal/clinic/dashboard) exclusively managed by School Doctors and Nurses, who handle student and staff medical profiles, consultations, sickbay admissions, pharmacy stock, and emergency alerts. All remaining staff (including Headmaster, Teachers, Secretary, Accountant, HR, Non-Teaching Staff) and Students only view their own personal medical health status in read-only mode without editing and cannot see internal clinic operations; Parents view only their linked ward\'s health status in read-only mode.',
    action: { openTab: 'clinic' }
  },
  {
    id: 'academics_placements',
    phrases: ['industrial internship', 'academic attachment', 'topic video', 'lesson stream'],
    keywords: ['internship', 'attachment', 'src', 'prefect', 'stream', 'evening', 'weekend', 'sandwich', 'regular', 'degree', 'cgpa', 'wassce', 'bece'],
    speech: 'Each registered institution runs modern academic operations tailored natively to its tier inside its main Academics, Curriculum, and Courses portal: Nursery to JHS manages Terms 1–3, BECE readiness, Houses, and Prefects; Senior High School manages WASSCE Tracks, Houses, and Prefect Council; TVET manages Trade Practicals, Attachments, Shift Streams, and Workshop Captains; University manages separated Industrial Internships and Academic Field Attachments depending on course offerings, GPA grading, Regular/Evening/Sandwich/Weekend streams, SRC governance, and graduation to Alumni.',
    action: { openTab: 'academics' }
  },
  {
    id: 'institutions',
    phrases: ['institution type', 'institution tier', 'nursery to jhs', 'senior high school', 'technical institute'],
    keywords: ['jhs', 'shs', 'technical', 'tvet', 'separate', 'difference', 'nursery', 'polytechnic', 'university'],
    speech: 'GBS operates directly according to the registered institution type across Nursery to JHS, Senior High School, Technical TVET, and University. Headmasters, Principals, Teachers, Secretaries, Lecturers, and Students automatically see their institution-specific classes, grading scales, promotions, streams, and placements.',
    action: { openTab: 'academics' }
  },
  {
    id: 'defaulters',
    phrases: ['defaulters monitor', 'missed exam', 'did not partake'],
    keywords: ['defaulter', 'absent', 'not coming', 'didn\'t partake', 'missing assignment', 'unsubmitted', 'compliance'],
    speech: 'The Compliance and Defaulters Monitor lists exact student counts and rosters for students who did not partake in exams, failed to submit assignments, or are absent from school, with direct alerts from Teacher and Headmaster dashboards.',
    action: { openTab: 'defaulters' }
  },
  {
    id: 'pricing',
    phrases: ['free trial', 'term free trial', '4 months', '4 month trial', 'per student', 'subscription plan', 'subscription cost', 'how much'],
    keywords: ['price', 'pricing', 'cost', 'plan', 'fee rate', 'subscription', 'discount', 'bill', 'trial', 'semester', 'termly', '12 cedis', '20 cedis', '40 cedis'],
    speech: 'Every new institution starts with a 4-Month Full Term Free Trial (120 days) with zero upfront charges. Thereafter, GBS uses 100% active-student pricing billed per 4-month term or semester: Nursery to JHS is GH₵ 3/month × 4 = GH₵ 12 per student per term; Senior High School (SHS) is GH₵ 5/month × 4 = GH₵ 20 per student per term; and TVET Technical Institutes and Universities are GH₵ 10/month × 4 = GH₵ 40 per student per semester, with zero fixed tenant fees.',
    action: { navigateTo: '/onboarding' }
  },
  {
    id: 'staff_approval',
    phrases: ['pending staff', 'staff approval', 'cannot login'],
    keywords: ['approve', 'approval', 'pending', 'new staff', 'register', 'rejected', 'locked'],
    speech: 'Newly registered Teachers, Secretaries, Accountants, HR officers, and Non-Teaching Staff cannot log in until the Headmaster approves them in the Pending Staff desk on the Headmaster Dashboard.',
    action: { openTab: 'roster' }
  },
  {
    id: 'payments',
    phrases: ['mobile money', 'pay fees', 'paystack', 'hubtel', 'mtn momo'],
    keywords: ['pay', 'payment', 'momo', 'telecel', 'card', 'visa', 'receipt', 'invoice'],
    speech: 'Parents and students settle fees cleanly with any phone number via MTN Mobile Money, Telecel Cash, AT Money, Visa, Mastercard, or Bank Transfer through Paystack and Hubtel, updating Student, Parent, and Accountant ledgers immediately without storing MoMo PINs or card CVVs.',
    action: { openTab: 'fees' }
  },
  {
    id: 'translator',
    phrases: ['system language', 'switch language', 'language translator'],
    keywords: ['translat', 'language', 'twi', 'ga', 'french', 'ewe', 'hausa', 'meaning', 'arabic', 'spanish'],
    speech: 'When a Headmaster changes the preferred System Language, GBS translates the entire institution workspace across Headmaster, Teacher, Secretary, Student, Parent, Bursar, Staff, HR, and Alumni dashboards with exact meanings for the chosen language, while the movable Language Translator supports cross-language messaging.',
    action: { trigger: 'openTranslator' }
  },
  {
    id: 'sms',
    phrases: ['direct sms', 'sms inbox', 'text message'],
    keywords: ['sms', 'phone message', 'dispatch', 'carrier'],
    speech: 'Direct Mobile SMS routes carrier messages cleanly while saving every alert and sender detail in the recipient Direct SMS Inbox.',
    action: null
  },
  {
    id: 'voice_notes',
    phrases: ['voice note', 'audio recording'],
    keywords: ['recording', 'microphone', 'wav'],
    speech: 'Voice Notes capture and store recorded audio messages per institution and play them back clearly across Headmaster, Teacher, Secretary, and Parent portals.',
    action: null
  },
  {
    id: 'proctoring',
    phrases: ['ai proctoring', 'start exam', 'camera wall', 'lost marks'],
    keywords: ['proctor', 'exam', 'cheat', 'camera', 'test monitor', 'evidence', 'deduct'],
    speech: 'When students click Start Exam, live webcam snapshots and focus checks stream to the Teacher Camera Wall so teachers can monitor students by name, send targeted notices, save reference evidence, give warnings, and subtract exact lost marks from the overall exam score.',
    action: { openTab: 'exams' }
  },
  {
    id: 'mobile_app',
    phrases: ['mobile app', 'apple device', 'iphone', 'ipad', 'mac safari', 'install app', 'android app'],
    keywords: ['install', 'apk', 'pwa', 'android', 'apple', 'ios', 'iphone', 'ipad', 'mobileconfig', 'download app'],
    speech: 'GBS installs seamlessly on BOTH Apple devices (iPhone, iPad, and Mac via 1-tap Apple WebClip .mobileconfig profile OR Safari Share -> Add to Home Screen) AND Android/Windows devices via Mobile App & Push or Install App, with automatic zero-touch Service Worker updates whenever upgrades ship.',
    action: null
  },
  {
    id: 'transport',
    phrases: ['bus route', 'campus transport'],
    keywords: ['bus', 'transport', 'route', 'pickup', 'boarding'],
    speech: 'Administrators assign students to campus commuter bus routes from the Transport Portal, syncing pickup stops and fares to Student and Parent portals.',
    action: { openTab: 'busTransport' }
  },
  {
    id: 'demo_live',
    phrases: ['demo mode', 'sandbox mode', 'live mode', 'real production'],
    keywords: ['demo', 'sandbox', 'production'],
    speech: 'Demo Sandbox Mode lets institutions walk through every live portal up to 10 entries per module and switch institution types freely, while Live Production enforces strict school isolation, zero placeholder records, and unlimited institutional operations.',
    action: null
  },
  {
    id: 'admissions',
    phrases: ['student admission', 'admissions inquiry', 'apply online'],
    keywords: ['admission', 'apply', 'enroll', 'enrol', 'prospective', 'student form'],
    speech: 'Prospective students submit inquiries and documents online through Admissions; Headmasters review, schedule interviews, and approve enrollment, creating Student and Parent accounts alongside an Admission Medical Registration record.',
    action: { openTab: 'admissions' }
  },
  {
    id: 'global_locale',
    phrases: ['country currency', 'preferred language', 'international school'],
    keywords: ['country', 'countries', 'currency', 'region', 'norm', 'timezone', 'international'],
    speech: 'GBS operates worldwide across any country and preferred language. Selecting your Country and System Language adapts currency, term structures, grading norms, RTL layout, and portal language immediately.',
    action: null
  },
  {
    id: 'auto_updates',
    phrases: ['automatic update', 'mobile app update', 'latest version'],
    keywords: ['update', 'upgrade', 'new version', 'automatic', 'cache', 'refresh'],
    speech: 'GBS Web and installed Apple & Android Mobile Apps detect new builds automatically and refresh offline caches seamlessly without requiring manual reinstallation.',
    action: null
  },
  {
    id: 'hr_payroll',
    phrases: ['payroll ledger', 'salary grade', 'leave approval'],
    keywords: ['payroll', 'salary', 'leave', 'recruitment'],
    speech: 'HR manages staff employment contracts, leave approvals, disciplinary logs, and salary slips synced with Accountancy.',
    action: null
  },
  {
    id: 'staff_duty_attendance',
    phrases: ['clock in', 'clock out', 'staff attendance', 'welcome to school', 'auto clock out', 'closing time'],
    keywords: ['bypass', 'clock', 'arrival', 'report to work', 'reason for clocking out'],
    speech: 'When staff (Teachers, Secretary, Accountant, HR, Non-Teaching Staff) log in, they are greeted with Welcome to School for their registered institution to either Clock In and record exact arrival time for Headmaster full-term monitoring, or Bypass without being marked present. Clocking out before school closing time requires a mandatory reason, and the system automatically clocks out staff who forget 2 hours after closing time.',
    action: { openTab: 'staffAttendance' }
  },
  {
    id: 'live_conferencing_calls',
    phrases: ['video call', 'voice call', 'conference call', 'teachers meeting', 'headmaster parent call', 'live conference'],
    keywords: ['webrtc', 'call parent', 'parent call', 'meeting', 'camera speed', 'camera feed'],
    speech: 'GBS includes high-speed real-time 30fps WebRTC voice and video conferencing with instant SSE push signaling inside Headmaster, Teacher, Secretary, and Parent portals for Headmaster-Teachers faculty meetings, Live Online Classes, and direct Headmaster-Parent or Teacher-Parent voice and video calls.',
    action: { openTab: 'meetings' }
  },
  {
    id: 'database_architecture',
    phrases: ['millions of schools', 'tenant isolation', 'database architecture'],
    keywords: ['database', 'postgres', 'scalable', 'scale', 'linked', 'linking', 'cross-module', 'architecture'],
    speech: 'Strict GBS System Architecture Rule: Every database table is strictly partitioned and composite-indexed by tenantId for multi-million-school scale, with relational foreign keys and cross-portal linking connecting Admissions, Academics, Attendance, Proctored Exams, School Clinic, School Stationery, Secretary Front-Office, Payments, Conferencing, HR, Transport, and Alumni cleanly across every school.',
    action: null
  },
  {
    id: 'roles_overview',
    phrases: ['what is gbs', 'about gbs', 'explain gbs', 'how does gbs work'],
    keywords: ['overview', 'everything', 'help', 'guide'],
    speech: 'GBS School Management System (motto: Intelligence Talks to Wisdom) connects Headmaster, Teacher or Lecturer, School Secretary, Student, Parent, Accountant, Non-Teaching Staff, HR, and Alumni into one synchronized institution platform.',
    action: null
  }
];

const STOP_WORDS = new Set([
  'the', 'is', 'are', 'was', 'were', 'am', 'be', 'been', 'being', 'a', 'an', 'and', 'or', 'but',
  'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'from', 'as', 'into', 'this', 'that', 'these',
  'those', 'it', 'its', 'me', 'my', 'we', 'our', 'you', 'your', 'they', 'their', 'do', 'does', 'did',
  'can', 'could', 'would', 'should', 'will', 'please', 'tell', 'explain', 'about', 'what', 'how',
  'when', 'where', 'why', 'who', 'which', 'gbs', 'system', 'school', 'want', 'know', 'more', 'detail',
  'details', 'portal', 'dashboard', 'page'
]);

const TOPIC_HUMAN_LABELS = {
  all_roles_explained: 'Institutional Roles & Portal Activities',
  role_headmaster: 'Headmaster / Principal Portal Components & Role',
  role_teacher: 'Teacher / Lecturer Portal Components & Role',
  role_secretary: 'School Secretary Portal Components & Front-Desk Role',
  role_student: 'Student Portal Components & Role',
  role_parent: 'Parent / Guardian Portal Components & Role',
  role_accountant: 'Accountant / Bursar Portal Components & Audit Role',
  role_staff: 'Non-Teaching Staff Portal Components & Role',
  role_hr: 'HR Management Portal Components & Role',
  role_clinic: 'School Clinic Dashboard (Doctors & Nurses Only)',
  role_alumni: 'Alumni Portal Components & Role',
  jolly_phonics_alphabets: '42 Jolly Phonics Sounds & Country/Language Alphabets Writing Studio',
  school_stationery: 'Headmaster-Only Stationery Pricing & Read-Only Staff Price List',
  clinic: 'Personal Health & School Clinic Dossier',
  clinic_pull: 'Personal Health & Medical Record Lookup',
  academics_placements: 'Tier-Tailored Academics, Placements (Internships vs Attachments), Streams & Student Leadership',
  institutions: 'Institution Tier Operations (Nursery-JHS, SHS, Technical, University)',
  defaulters: 'Exam, Assignment & Attendance Defaulters Tracker',
  pricing: '4-Month Term Free Trial & Active-Student Term/Semester Pricing',
  staff_approval: 'Headmaster Pending Staff Approval Workflow',
  payments: 'Fees, Mobile Money & Card Payment Processing',
  translator: 'System Language & Floating Translator',
  sms: 'Direct Mobile SMS Dispatch & Inbox',
  voice_notes: 'Real-Time Voice Notes Recording & Playback',
  proctoring: 'AI Examination Proctoring & Anti-Cheat Monitoring',
  mobile_app: 'Apple iOS/Mac & Android Mobile App Installation',
  transport: 'Campus Bus & Student Transport Syncing',
  demo_live: 'Demo Sandbox vs Real Live Production Mode',
  admissions: 'Student Admissions & Enrollment Linking',
  roles_overview: 'GBS Unified System Overview',
  global_locale: 'Global Country Norms & Preferred Language System',
  auto_updates: 'Automatic Apple, Android & Web App Upgrading',
  hr_payroll: 'HR Contracts, Leave & Payroll Ledger',
  staff_duty_attendance: 'Staff Duty Clock-In, Bypass, Mandatory Early Reason & 2h Auto Clock-Out',
  live_conferencing_calls: 'High-Speed 30fps In-System WebRTC Voice & Video Calls',
  database_architecture: 'Multi-Million-School Partitioned Database & Cross-Module Linking Mandate',
  privacy_shield: 'Institutional Confidentiality Policy',
  general_memory: 'System Portal Guide'
};

function analyzeAndExplainQuestionFormation(rawQuery = '', topicId = 'general_memory') {
  const clean = String(rawQuery || '').trim();
  const qLower = clean.toLowerCase();

  let questionStyle = 'Direct System Question';
  let openingCue = 'general inquiry';
  if (/^(how)\b/i.test(qLower) || qLower.includes('how does') || qLower.includes('how do') || qLower.includes('how can')) {
    questionStyle = 'Process & Workflow ("How") Question';
    openingCue = 'step-by-step operational process';
  } else if (/^(what)\b/i.test(qLower) || qLower.includes('what is') || qLower.includes('what are')) {
    questionStyle = 'Definition & Scope ("What") Question';
    openingCue = 'module scope and exact system behavior';
  } else if (/^(why)\b/i.test(qLower) || qLower.includes('why is') || qLower.includes('why can')) {
    questionStyle = 'Cause & Business-Rule ("Why") Question';
    openingCue = 'underlying validation or business rule';
  } else if (/^(where|which|who|when)\b/i.test(qLower)) {
    questionStyle = 'Navigation & Entity ("Where / Who / When") Question';
    openingCue = 'exact portal location, owner role, or timing';
  } else if (/^(can|could|is|are|does|do|will|should)\b/i.test(qLower)) {
    questionStyle = 'Capability & Verification ("Can / Does / Is") Question';
    openingCue = 'clear confirmation and permitted conditions';
  } else if (/^(i want to know|i want|tell me|show me|open|pull|check|go to|take me|run|switch|change|explain|describe)\b/i.test(qLower)) {
    questionStyle = 'Guided Information & Portal Request';
    openingCue = 'complete portal component breakdown and role guidance';
  }

  const keyTerms = clean
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((w) => w.length >= 2 && !STOP_WORDS.has(w) && !isDeveloperSensitiveText(w))
    .filter((v, i, a) => a.indexOf(v) === i)
    .slice(0, 5);

  const moduleLabel = TOPIC_HUMAN_LABELS[topicId] || 'GBS Unified System';
  const focusPhrase = keyTerms.length > 0 ? `"${keyTerms.join(', ')}"` : 'general portal operation';

  const article = /^[aeiou]/i.test(questionStyle) ? 'an' : 'a';
  const explanationText =
    `How your question was formed: You phrased ${article} ${questionStyle} focused on ${focusPhrase}, asking for ${openingCue} within ${moduleLabel}.`;

  return {
    questionStyle,
    openingCue,
    keyTerms,
    targetModule: moduleLabel,
    explanationText
  };
}

function buildTenantLiveStats(req) {
  const tid = String(parseInt(req?.tenantId || req?.user?.tenantId || '1', 10) || 1);
  const store = readPersistentStore();
  const role = String(req?.user?.role || '').toUpperCase();
  const isHeadmaster = ['ADMIN', 'SUPER_ADMIN', 'HEADMASTER', 'PRINCIPAL'].includes(role);
  const isClinicOperator = ['CLINIC_DOCTOR', 'CLINIC_NURSE', 'DOCTOR', 'NURSE', 'CLINIC'].includes(role);
  const callerEmail = String(req?.user?.email || '').trim().toLowerCase();

  const safeArray = (val) => (Array.isArray(val) ? val : []);
  const allProfiles = safeArray(store.schoolClinicProfiles).filter((p) => String(p?.tenantId || '1') === tid);
  const allVisits = safeArray(store.schoolClinicVisits).filter((v) => String(v?.tenantId || '1') === tid);
  const scopedProfiles = isClinicOperator
    ? allProfiles
    : allProfiles.filter((p) => callerEmail && String(p?.email || '').toLowerCase() === callerEmail);
  const scopedVisits = isClinicOperator
    ? allVisits
    : allVisits.filter((v) => callerEmail && String(v?.patientEmail || '').toLowerCase() === callerEmail);
  const sickbayActive = isClinicOperator
    ? scopedVisits.filter((v) => v?.disposition === 'ADMITTED_TO_SICKBAY' && !v?.dischargedAt)
    : [];

  const uniInternships = safeArray(store.universityInternships).filter((i) => String(i?.tenantId || '1') === tid);
  const uniAttachments = safeArray(store.universityAttachments).filter((a) => String(a?.tenantId || '1') === tid);
  const uniStreams = safeArray(store.universityStreams).filter((s) => String(s?.tenantId || '1') === tid);
  const pendingStaff = safeArray(store.registeredUsers).filter(
    (u) => String(u?.tenantId || '1') === tid && String(u?.status || '').toUpperCase().includes('PENDING')
  );
  const stationeryItemsCount = safeArray(store.prismaModels?.StationeryItem).filter((i) => String(i?.tenantId || '1') === tid && i?.isActive !== false).length;
  const secretaryRecordsCount = safeArray(store.prismaModels?.SecretaryRecord).filter((r) => String(r?.tenantId || '1') === tid).length;
  const rawLessonPlans = store.teacherLessonPlans;
  const lessonPlansList = Array.isArray(rawLessonPlans)
    ? rawLessonPlans.filter((p) => String(p?.tenantId || '1') === tid)
    : (rawLessonPlans && typeof rawLessonPlans === 'object' && Array.isArray(rawLessonPlans[tid])
      ? rawLessonPlans[tid]
      : []);
  const lessonPlansCount = lessonPlansList.length;

  return {
    tenantId: tid,
    clinicProfilesCount: scopedProfiles.length,
    clinicVisitsCount: scopedVisits.length,
    activeSickbayCount: sickbayActive.length,
    universityInternshipsCount: uniInternships.length,
    universityAttachmentsCount: uniAttachments.length,
    universityStreamsCount: uniStreams.length,
    stationeryItemsCount,
    secretaryRecordsCount,
    lessonPlansCount,
    pendingStaffApprovalsCount: isHeadmaster ? pendingStaff.length : 0
  };
}

function getSystemMemoryCatalog(req = null) {
  const memory = loadMemorySnapshot() || {};
  const liveStats = buildTenantLiveStats(req);

  const safeDashboards = (memory.dashboardsAndRoutesMemory || [])
    .filter((d) => !isDeveloperSensitiveText(`${d.name} ${d.route} ${(d.keyBehaviors || []).join(' ')}`))
    .map((d) => ({
      name: d.name,
      route: d.route,
      keyBehaviors: d.keyBehaviors
    }));

  return {
    systemName: memory.systemName || 'GBS SCHOOL MANAGEMENT SYSTEM',
    version: memory.version || '2.13.0-PRODUCTION-BLUEPRINT',
    savedAt: memory.savedAt || new Date().toISOString(),
    motto: 'Intelligence Talks to Wisdom',
    ratesPerStudentPerMonthGHS: {
      NURSERY_TO_JHS: 3,
      SHS: 5,
      TECHNICAL: 10,
      UNIVERSITY: 10
    },
    freeTrialMonths: 4,
    roleActivities: ROLE_ACTIVITIES_GUIDE,
    portalComponents: PORTAL_COMPONENTS_INDEX,
    databaseScalingPolicy: {
      scaleTarget: 'MULTI_MILLION_SCHOOLS',
      partitionKey: 'tenantId',
      strictRelationalLinking: true,
      storageEngine: 'PostgreSQL + Prisma Composite Indexes + Persistent Hybrid Mirror'
    },
    dashboards: safeDashboards,
    topics: CORE_TOPICS.map(({ id, speech, action }) => ({ id, speech, action })),
    liveStats
  };
}

function answerUserQuery(req, rawQuery = '') {
  const query = String(rawQuery || '').trim();
  const qLower = query.toLowerCase();
  const qTokens = qLower.split(/[^a-z0-9]+/).filter(Boolean);
  const memory = loadMemorySnapshot() || {};
  const liveStats = buildTenantLiveStats(req);
  const store = readPersistentStore();
  const tid = liveStats.tenantId;
  const callerRole = String(req?.user?.role || '').toUpperCase();
  const isHeadmaster = ['ADMIN', 'SUPER_ADMIN', 'HEADMASTER', 'PRINCIPAL'].includes(callerRole);
  const callerEmail = String(req?.user?.email || '').trim().toLowerCase();

  // Strict Non-Disclosure Shield: NEVER disclose anything about the system developer or internal developer controls
  if (isDeveloperSensitiveText(qLower)) {
    const formation = analyzeAndExplainQuestionFormation(query, 'privacy_shield');
    const answerText = 'Internal platform administration and architecture details are confidential and not disclosed by the GBS Assistant. I can gladly explain any institutional role (Headmaster, Teacher, Secretary, Student, Parent, Accountant, Staff, HR, or Alumni) and all portal activities.';
    return {
      topicId: 'privacy_shield',
      action: null,
      questionFormation: formation,
      answerText,
      speechText: `${answerText} ${formation.explanationText}`,
      detailedAnswer: `${answerText}\n\n${formation.explanationText}`,
      liveStats
    };
  }

  // Pull specific School Clinic records strictly following Clinic Doctor/Nurse vs Read-Only Health Privacy rules
  if (/(pull clinic|pull medical|clinic record|medical record|who is in sickbay|\bsickbay\b)/i.test(qLower)) {
    const allVisits = (store.schoolClinicVisits || []).filter((v) => String(v.tenantId || '1') === tid);
    const allProfiles = (store.schoolClinicProfiles || []).filter((p) => String(p.tenantId || '1') === tid);
    const isClinicOperator = ['CLINIC_DOCTOR', 'CLINIC_NURSE', 'DOCTOR', 'NURSE', 'CLINIC'].includes(callerRole);
    const formation = analyzeAndExplainQuestionFormation(query, 'clinic_pull');

    if (isClinicOperator) {
      const activeSickbay = allVisits.filter((v) => v.disposition === 'ADMITTED_TO_SICKBAY' && !v.dischargedAt);
      const answerText = `School Clinic Medical Registry holds ${allProfiles.length} Staff and Student profiles, ${allVisits.length} total clinic consultations, and ${activeSickbay.length} active Sickbay patient. Opening the School Clinic Dashboard now.`;
      return {
        topicId: 'clinic_pull',
        questionFormation: formation,
        answerText,
        speechText: `${answerText} ${formation.explanationText}`,
        detailedAnswer: `${answerText}\n\n${formation.explanationText}`,
        action: { navigateTo: '/portal/clinic/dashboard' },
        pulledRecords: { profilesCount: allProfiles.length, visits: allVisits.slice(0, 10), activeSickbay },
        liveStats
      };
    }

    const ownProfiles = allProfiles.filter((p) => callerEmail && String(p.email || '').toLowerCase() === callerEmail);
    const ownVisits = allVisits.filter((v) => callerEmail && (String(v.patientEmail || '').toLowerCase() === callerEmail || (callerRole === 'PARENT' && String(v.guardianEmail || '').toLowerCase() === callerEmail)));
    const answerText = `Medical privacy enforced: Only School Doctors and Nurses operate the separate School Clinic Dashboard. Opening your personal read-only medical health status: you have ${ownProfiles.length} baseline health profile and ${ownVisits.length} personal checkup record visible only to you.`;
    return {
      topicId: 'clinic_pull',
      questionFormation: formation,
      answerText,
      speechText: `${answerText} ${formation.explanationText}`,
      detailedAnswer: `${answerText}\n\n${formation.explanationText}`,
      action: { openTab: 'clinic' },
      pulledRecords: { profilesCount: ownProfiles.length, visits: ownVisits.slice(0, 10), ownHealthOnly: true, readOnly: true },
      liveStats
    };
  }

  // Score every topic cleanly using phrase weighting + word-boundary token scoring + portal intent boost
  const wantsPortalBreakdown = /\b(portal|dashboard|role|activities|duties|tabs|features|work|about)\b/i.test(qLower);
  let bestTopic = null;
  let bestScore = 0;

  for (const t of CORE_TOPICS) {
    let score = 0;
    for (const ph of (t.phrases || [])) {
      if (qLower.includes(ph)) {
        score += 10;
      }
    }
    for (const kw of (t.keywords || [])) {
      if (kw.includes(' ')) {
        if (qLower.includes(kw)) score += 6;
      } else if (qTokens.includes(kw) || qLower.includes(kw)) {
        score += qTokens.includes(kw) ? 4 : 2;
      }
    }
    if (wantsPortalBreakdown && t.id.startsWith('role_') && score > 0) {
      score += 4;
    }
    if (score > bestScore) {
      bestScore = score;
      bestTopic = t;
    }
  }

  if (bestTopic && bestScore > 0) {
    const formation = analyzeAndExplainQuestionFormation(query, bestTopic.id);
    const answerText = bestTopic.speech;
    return {
      topicId: bestTopic.id,
      questionFormation: formation,
      answerText,
      speechText: `${answerText} ${formation.explanationText}`,
      detailedAnswer: `${answerText}\n\n${formation.explanationText}`,
      action: bestTopic.action,
      systemVersion: memory.version || '2.13.0-PRODUCTION-BLUEPRINT',
      liveStats
    };
  }

  // Match only non-developer institutional dashboards from System Memory snapshot
  const words = qLower.split(/[^a-z0-9]+/).filter((w) => w.length >= 3);
  const safeDashMatches = (memory.dashboardsAndRoutesMemory || [])
    .filter((d) => !isDeveloperSensitiveText(`${d.name} ${d.route} ${(d.keyBehaviors || []).join(' ')}`))
    .find((d) => {
      const hay = `${d.name || ''} ${d.route || ''} ${(d.keyBehaviors || []).join(' ')}`.toLowerCase();
      return words.some((w) => hay.includes(w));
    });

  if (safeDashMatches) {
    const formation = analyzeAndExplainQuestionFormation(query, 'roles_overview');
    const summary = `In ${safeDashMatches.name} (${safeDashMatches.route}), key capabilities include: ${(safeDashMatches.keyBehaviors || []).slice(0, 3).join('; ')}.`;
    return {
      topicId: 'roles_overview',
      questionFormation: formation,
      answerText: summary,
      speechText: `${summary} ${formation.explanationText}`,
      detailedAnswer: `${summary}\n\n${formation.explanationText}`,
      action: safeDashMatches.route ? { navigateTo: safeDashMatches.route } : null,
      liveStats
    };
  }

  // Safe Institutional Role & Activity fallback (zero developer details ever leaked)
  const formation = analyzeAndExplainQuestionFormation(query, 'general_memory');
  const fallbackAnswer = `GBS School Management System connects Headmaster, Teacher or Lecturer, School Secretary, Student, Parent, Accountant, Non-Teaching Staff, HR, and Alumni dashboards into one linked institutional system covering Admissions, Staff Clock-In, Student Attendance, Multi-Format Proctored Exams, School Stationery & Accountant Audit, School Clinic Health Records, Separate University Internships and Attachments, Payments, Live 30fps Video Calls, and Multi-Language Support. Live workspace counters show ${liveStats.universityInternshipsCount} internships, ${liveStats.universityAttachmentsCount} academic attachments, and ${liveStats.stationeryItemsCount} cataloged stationery items.`;
  return {
    topicId: 'general_memory',
    questionFormation: formation,
    answerText: fallbackAnswer,
    speechText: `${fallbackAnswer} ${formation.explanationText}`,
    detailedAnswer: `${fallbackAnswer}\n\n${formation.explanationText}`,
    action: null,
    liveStats
  };
}

module.exports = {
  loadMemorySnapshot,
  getSystemMemoryCatalog,
  answerUserQuery,
  ROLE_ACTIVITIES_GUIDE,
  PORTAL_COMPONENTS_INDEX
};
