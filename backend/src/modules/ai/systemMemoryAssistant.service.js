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
  ADMIN: 'Headmaster / Principal Portal (/portal/admin/dashboard): Approves newly registered staff (Teachers, Secretary, Accountants, HR) and incoming student admissions; configures institution branding and System Language; sets and edits official School Stationery item prices (Textbooks, Cardigans, Socks, School Bags); monitors full-term Staff Duty Clock-In and auto-clock-out compliance; inspects teacher lesson notes, timetables, defaulters compliance, and bus routes; manages School Clinic profiles and sickbay treatments; hosts Live Faculty and Parent Video/Voice Conferences; and renews institutional term subscriptions.',
  TEACHER: 'Teacher / Lecturer Portal (/portal/teacher/dashboard): Clocks in upon reporting to campus; marks daily student class attendance registers; creates and grades homework and assignments; authors multi-format timed exams and monitors the live AI-Proctoring Camera Wall to issue warnings, save video/camera evidence, and subtract lost marks; uploads pre-recorded lessons inside the Class Topic Video Platform; manages class lesson notes, TVET/University placements, Defaulters compliance, School Stationery price catalog & order requests, Live Class Video/Voice Conferences and Parent Calls, Direct SMS Inbox, and personal Clinic health records.',
  SECRETARY: 'School Secretary Portal (/portal/secretary/dashboard): Clocks in for front-office duty; logs daily Campus Visitors (check-in and check-out); drafts and dispatches Official Letters, Circulars, Certificates, and Meeting Minutes; coordinates Headmaster Appointments; records School Stationery item sales at Headmaster-locked prices and logs store/restock expenses that sync directly into the Accountant Expenses Ledger; handles Direct SMS and Live Voice/Video calls; and views personal Clinic health information.',
  STUDENT: 'Student / Undergraduate Portal (/portal/student/dashboard): Follows live class timetables, watches Teacher Topic Videos in offline/adaptive playback, submits assignments and cooperative conference tasks, sits AI-proctored online exams, views verified report cards and academic transcripts, submits Internship or Academic Attachment forms (for TVET/University), checks Fee Balance & pays via Mobile Money/Card, browses Headmaster-approved School Stationery items (Textbooks, Cardigans, Socks, Bags) and submits order requests, joins Live Class Video Conferences, and checks personal Clinic health dossier.',
  PARENT: 'Parent / Guardian Portal (/portal/parent/dashboard): Monitors child attendance rolls, verified report cards, exam schedules, and campus transport stops; settles tuition and fee balances seamlessly via MTN MoMo, Telecel Cash, AT Money, Visa, Mastercard, or Bank Transfer; browses official Headmaster-priced School Stationery packages (Textbooks, Cardigans, Socks, Bags) for wards; joins Parent-Teacher Conferences and direct Video/Voice calls with the Headmaster or Teachers; views Direct SMS notices; and inspects only their own child medical Clinic profile.',
  ACCOUNTANT: 'Accountant / Bursar Portal (/portal/accountant/dashboard): Configures class fee schedules and fee accounts, generates and reconciles Student Invoices, audits Paystack/Hubtel/MoMo/Bank fee receipts, tracks debtor compliance holds, runs School Stationery Revenue & Expense Audits automatically synced from Stationery Store restock/operating expenses (STATIONERY_SUPPLIES), records institutional expenses and payroll disbursements, views Financial Telemetry & Trial Balance / Income Statements, and monitors own Clinic health record.',
  STAFF: 'Non-Teaching Staff Portal (/portal/staff/dashboard): Performs Staff Duty Clock-In / Early Clock-Out with reason / +2h Auto-Clock-Out; manages campus inventory stock, asset allocations, transport logistics, and operational maintenance requests; logs School Stationery store sales and supply expenses synced to Accountancy; and accesses personal Clinic records and Video/Voice calls.',
  HR: 'Human Resources (HR) Portal (/portal/hr/dashboard): Manages institutional personnel profiles, staff recruitment, contracts, payroll salary grades, staff leave requests, disciplinary logs, full Staff Duty Attendance audits with the Headmaster, and personal Clinic health dossiers.',
  ALUMNI: 'Alumni Member Portal (/portal/alumni/dashboard): Requests verified digital academic transcripts, checks graduation honours, participates in alumni cohorts, mentorship, events, and endowment pledges audited by Accountancy.'
};

const PORTAL_COMPONENTS_INDEX = {
  ADMIN: [
    'Executive Overview & Pending Staff Approvals',
    'Staff Duty Attendance Monitor (Clock-In, Bypass, Early Reason & Auto-Clock-Out)',
    'Admissions Desk & Enrollment Sync',
    'School Stationery Price Authority Desk (Set/Edit Textbook, Cardigan, Socks & Bag Prices)',
    'Live Video Conferences & Parent/Developer Direct Calls',
    'Academics, Timetables & Defaulters Compliance Monitor',
    'School Clinic All-Campus Medical & Sickbay Registry',
    'Subscription Billing (4-Month Term Free Trial & Per-Student Term Renewals)'
  ],
  TEACHER: [
    'Teacher Command Overview & Staff Clock-In Widget',
    'Daily Student Attendance Roll Call',
    'Class Topic Video Platform (Upload & Stream Lesson Topics)',
    'Assignments, Lesson Notes & Homework Grading',
    'AI-Proctored Exams & Live Camera Wall (Warnings, Snapshot Evidence & Exact Mark Deduction)',
    'Live Online Class & Parent Video/Voice Conferencing (30fps SSE WebRTC)',
    'Tier Academics, Placements (TVET/University) & Defaulters Tracker',
    'School Stationery Catalog (Headmaster Prices) & Order Desk',
    'Direct SMS Inbox & Personal Clinic Health Dossier'
  ],
  SECRETARY: [
    'Front-Office Executive Overview & Staff Clock-In Widget',
    'Campus Visitor Log (Check-In / Check-Out Tracking)',
    'Official Letters, Parent/Staff Circulars & Meeting Minutes',
    'Headmaster Appointments & Front-Desk Scheduling',
    'School Stationery Desk (Record Sales at Locked Prices & Sync Store Expenses to Accountant)',
    'Direct SMS Messenger, Inbox & Voice Notes',
    'Live Video / Voice Calls & Faculty Meetings',
    'Personal Clinic Health Dossier'
  ],
  STUDENT: [
    'Student Command Hub & Live Timetable',
    'Class Topic Video Player & Saved Lesson Notes',
    'Homework Submissions & Report Cards',
    'Online AI-Proctored Exam Runner & Live Cooperative Study Rooms',
    'University Internships / Academic Attachments & TVET Practicals',
    'School Stationery Store (Browse Approved Prices & Request Textbooks/Uniforms/Bags)',
    'Student Fees, Receipts & Bus Transport',
    'Personal Clinic Health Information (Self-Only)'
  ],
  PARENT: [
    'Parent Overview & Linked Ward Switcher',
    'Ward Attendance & Academic Progress Report Cards',
    'Fee Statements & Direct Any-Phone MoMo / Card Checkout',
    'School Stationery & Textbook Price Guide & Ward Orders',
    'Live Video / Voice Call with Headmaster & Teachers',
    'Direct SMS & Voice Notes Inbox',
    'Campus Bus Route & Linked Ward Medical Clinic Profile'
  ],
  ACCOUNTANT: [
    'Finance Telemetry & KPI Dashboard',
    'Fee Structures & Student Invoice Generator',
    'Multi-Gateway Payments & Reconciliation Ledger (MoMo / Card / Bank)',
    'School Stationery Expenses & Revenue Audit Panel (Auto-Synced STATIONERY_SUPPLIES Ledger)',
    'Operating Expenses Ledger & Vendor Tracking',
    'HR Payroll Disbursements & Loan Tracking',
    'Statements, Audit Trail & Debtor Compliance'
  ],
  STAFF: [
    'Staff Operations Overview & Duty Clock-In Widget',
    'Campus Inventory, Stock & Asset Ledger',
    'School Stationery Desk (Sales & Restock Expenses -> Accountant Sync)',
    'Transport Dispatch & Campus Facility Requests',
    'Leave Applications & Personal Clinic Health Dossier'
  ],
  HR: [
    'HR Executive Workforce Overview',
    'Staff Directory, Contracts & Onboarding Compliance',
    'Staff Attendance Compliance & Leave Management',
    'Payroll Grading & Staff Loan Review'
  ],
  ALUMNI: [
    'Alumni Overview & Graduation Cohort Directory',
    'Verified Official Transcript Requests',
    'Mentorship Events & Endowment Pledges'
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
    id: 'all_roles_explained',
    phrases: ['each user', 'every portal', 'all portals', 'all roles', 'who uses', 'what does each'],
    keywords: ['role', 'roles', 'responsibilities', 'portals', 'dashboards', 'duties'],
    speech: `GBS connects 9 synchronized institutional portals: ${Object.values(ROLE_ACTIVITIES_GUIDE).join(' ')}`,
    action: null
  },
  {
    id: 'school_stationery',
    phrases: ['school stationery', 'stationery store', 'stationary store', 'school items', 'who sets the price', 'stationery price', 'stationery expense'],
    keywords: ['stationery', 'stationary', 'textbook', 'textbooks', 'cardigan', 'cardigans', 'socks', 'school bag', 'school bags', 'exercise book', 'uniforms', 'bookshop', 'items sold'],
    speech: 'School Stationery Store records and displays all school-sold items (Textbooks, Cardigans, School Socks, School Bags, Exercise Books, Uniforms) across every dashboard (Headmaster, Secretary, Accountant, Teacher, Staff, Parent, and Student). Strictly ONLY the Headmaster has authority to set or edit official item prices. Secretaries, Staff, and Accountants record sales at the Headmaster-locked prices and log store restock/operating expenses, which automatically post into the Accountant Expenses Ledger under STATIONERY_SUPPLIES for immediate accounting and auditing.',
    action: { openTab: 'stationery' }
  },
  {
    id: 'clinic',
    phrases: ['school clinic', 'medical record', 'sickbay treatment', 'health dossier'],
    keywords: ['clinic', 'sickbay', 'medical', 'health', 'doctor', 'nurse', 'sick', 'hospital', 'treatment', 'medicine', 'blood', 'genotype', 'allergy'],
    speech: 'School Clinic enforces medical confidentiality: Students, Teachers, Secretary, Staff, HR, and Accountants see only their own personal health information and visit records, and Parents see only their linked ward health information — clinic operations are never exposed to regular users. On the Headmaster Dashboard, the Headmaster views all Staff and Student clinic profiles with each individual health record and manages full Sickbay treatments and pharmacy supplies.',
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
  role_alumni: 'Alumni Portal Components & Role',
  school_stationery: 'School Stationery Store, Headmaster Pricing & Accountant Expense Sync',
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
  const callerEmail = String(req?.user?.email || '').trim().toLowerCase();

  const allProfiles = (store.schoolClinicProfiles || []).filter((p) => String(p.tenantId || '1') === tid);
  const allVisits = (store.schoolClinicVisits || []).filter((v) => String(v.tenantId || '1') === tid);
  const scopedProfiles = isHeadmaster
    ? allProfiles
    : allProfiles.filter((p) => callerEmail && String(p.email || '').toLowerCase() === callerEmail);
  const scopedVisits = isHeadmaster
    ? allVisits
    : allVisits.filter((v) => callerEmail && String(v.patientEmail || '').toLowerCase() === callerEmail);
  const sickbayActive = scopedVisits.filter((v) => v.disposition === 'ADMITTED_TO_SICKBAY' && !v.dischargedAt);

  const uniInternships = (store.universityInternships || []).filter((i) => String(i.tenantId || '1') === tid);
  const uniAttachments = (store.universityAttachments || []).filter((a) => String(a.tenantId || '1') === tid);
  const uniStreams = (store.universityStreams || []).filter((s) => String(s.tenantId || '1') === tid);
  const pendingStaff = (store.registeredUsers || []).filter(
    (u) => String(u.tenantId || '1') === tid && String(u.status || '').toUpperCase().includes('PENDING')
  );
  const stationeryItemsCount = ((store.prismaModels?.StationeryItem || []).filter((i) => String(i.tenantId || '1') === tid && i.isActive !== false)).length;

  return {
    tenantId: tid,
    clinicProfilesCount: scopedProfiles.length,
    clinicVisitsCount: scopedVisits.length,
    activeSickbayCount: sickbayActive.length,
    universityInternshipsCount: uniInternships.length,
    universityAttachmentsCount: uniAttachments.length,
    universityStreamsCount: uniStreams.length,
    stationeryItemsCount,
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

  // Pull specific School Clinic records strictly following role privacy rules
  if (/(pull clinic|pull medical|clinic record|medical record|who is in sickbay|\bsickbay\b)/i.test(qLower)) {
    const allVisits = (store.schoolClinicVisits || []).filter((v) => String(v.tenantId || '1') === tid);
    const allProfiles = (store.schoolClinicProfiles || []).filter((p) => String(p.tenantId || '1') === tid);
    const formation = analyzeAndExplainQuestionFormation(query, 'clinic_pull');

    if (isHeadmaster) {
      const activeSickbay = allVisits.filter((v) => v.disposition === 'ADMITTED_TO_SICKBAY' && !v.dischargedAt);
      const answerText = `Headmaster School Clinic Registry holds ${allProfiles.length} Staff and Student profiles, ${allVisits.length} total clinic consultations, and ${activeSickbay.length} active Sickbay patient. Opening the School Clinic records view now.`;
      return {
        topicId: 'clinic_pull',
        questionFormation: formation,
        answerText,
        speechText: `${answerText} ${formation.explanationText}`,
        detailedAnswer: `${answerText}\n\n${formation.explanationText}`,
        action: { openTab: 'clinic' },
        pulledRecords: { profilesCount: allProfiles.length, visits: allVisits.slice(0, 10), activeSickbay },
        liveStats
      };
    }

    const ownProfiles = allProfiles.filter((p) => callerEmail && String(p.email || '').toLowerCase() === callerEmail);
    const ownVisits = allVisits.filter((v) => callerEmail && (String(v.patientEmail || '').toLowerCase() === callerEmail || (callerRole === 'PARENT' && String(v.guardianEmail || '').toLowerCase() === callerEmail)));
    const answerText = `Opening your personal health dossier. You have ${ownProfiles.length} personal health registration profile and ${ownVisits.length} personal clinic consultation record visible to your account only.`;
    return {
      topicId: 'clinic_pull',
      questionFormation: formation,
      answerText,
      speechText: `${answerText} ${formation.explanationText}`,
      detailedAnswer: `${answerText}\n\n${formation.explanationText}`,
      action: { openTab: 'clinic' },
      pulledRecords: { profilesCount: ownProfiles.length, visits: ownVisits.slice(0, 10), ownHealthOnly: true },
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
