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
  ADMIN: 'Headmaster / Principal: Approves newly registered staff and incoming student admissions, configures institution branding and language settings, schedules academic terms, inspects teacher lesson notes and weekly attendance registers, manages school bus routes, reviews defaulters compliance, and views all Staff and Student School Clinic profiles and sickbay treatments.',
  TEACHER: 'Teacher / Lecturer: Marks daily student attendance rolls, publishes and grades assignments, sets multi-format timed exams, monitors live AI-proctored exam cameras and saves evidence, evaluates university internships and academic attachments separately, publishes results, and checks personal health details in the clinic portal.',
  STUDENT: 'Student / Undergraduate: Follows class timetables, submits homework, writes timed AI-proctored exams, joins live cooperative study sessions, checks verified report cards and fee balances, submits either an Internship or an Academic Attachment form depending on course offering, and views only their own personal health information.',
  PARENT: 'Parent / Guardian: Tracks wards attendance and academic report cards, receives arrears notices, settles fees cleanly via Mobile Money or Bank/Card, messages class teachers or administration, submits admissions inquiries, and views only their ward personal health records.',
  ACCOUNTANT: 'Accountant / Bursar: Configures class fee schedules and hostel tiers, issues invoices, records and verifies payment gateway transactions, tracks debtor clearance holds, logs operating expenses, and reviews financial statements.',
  STAFF: 'Non-Teaching Staff: Tracks campus inventory stock and asset allocations, manages daily transport and operational duties, logs workplace requests, and checks personal health details.',
  HR: 'Human Resources (HR): Manages employee personnel profiles, employment contracts, payroll grading tiers, staff leave approvals, compliance audits, and personal health access.',
  ALUMNI: 'Alumni Member: Requests verified academic transcripts, monitors graduation honors, participates in cohort reunions and mentorship, and pledges institutional support.'
};

const CORE_TOPICS = [
  {
    id: 'all_roles_explained',
    keywords: ['role', 'roles', 'user', 'users', 'activities', 'who uses', 'responsibility', 'responsibilities', 'each user', 'what does each', 'every portal', 'duties'],
    speech: `Here are the exact institutional roles and activities in GBS School Management System. ${Object.values(ROLE_ACTIVITIES_GUIDE).join(' ')}`,
    action: null
  },
  {
    id: 'role_headmaster',
    keywords: ['headmaster', 'principal', 'admin role', 'headmaster activities', 'what does headmaster', 'chancellor'],
    speech: ROLE_ACTIVITIES_GUIDE.ADMIN,
    action: null
  },
  {
    id: 'role_teacher',
    keywords: ['teacher role', 'lecturer role', 'teacher activities', 'what does teacher', 'faculty activities'],
    speech: ROLE_ACTIVITIES_GUIDE.TEACHER,
    action: null
  },
  {
    id: 'role_student',
    keywords: ['student role', 'student activities', 'what does student', 'scholar activities'],
    speech: ROLE_ACTIVITIES_GUIDE.STUDENT,
    action: null
  },
  {
    id: 'role_parent',
    keywords: ['parent role', 'guardian role', 'parent activities', 'what does parent'],
    speech: ROLE_ACTIVITIES_GUIDE.PARENT,
    action: null
  },
  {
    id: 'role_accountant',
    keywords: ['accountant role', 'bursar role', 'accountant activities', 'what does accountant', 'bursary activities'],
    speech: ROLE_ACTIVITIES_GUIDE.ACCOUNTANT,
    action: null
  },
  {
    id: 'role_staff',
    keywords: ['staff role', 'non-teaching staff', 'staff activities', 'what does staff', 'logistics role'],
    speech: ROLE_ACTIVITIES_GUIDE.STAFF,
    action: null
  },
  {
    id: 'role_hr',
    keywords: ['hr role', 'human resource role', 'hr activities', 'what does hr'],
    speech: ROLE_ACTIVITIES_GUIDE.HR,
    action: null
  },
  {
    id: 'role_alumni',
    keywords: ['alumni role', 'graduate role', 'alumni activities', 'what does alumni'],
    speech: ROLE_ACTIVITIES_GUIDE.ALUMNI,
    action: null
  },
  {
    id: 'clinic',
    keywords: ['clinic', 'sickbay', 'medical', 'health', 'doctor', 'nurse', 'sick', 'hospital', 'treatment', 'medicine', 'blood', 'genotype', 'allergy'],
    speech: 'School Clinic enforces medical confidentiality: Students, Teachers, Staff, HR, and Accountants see only their own personal health information and visit records, and Parents see only their linked ward health information — clinic operations are never exposed to regular users. On the Headmaster Dashboard, the Headmaster views all Staff and Student clinic profiles with each individual health record and manages full Sickbay treatments and pharmacy supplies.',
    action: { openTab: 'clinic' }
  },
  {
    id: 'university',
    keywords: ['university', 'internship', 'attachment', 'src', 'stream', 'evening', 'weekend', 'sandwich', 'regular', 'lecturer', 'graduate', 'alumni', 'degree', 'cgpa'],
    speech: 'University Hub strictly serves University institutions with separate Industrial Internships and Academic Field Attachments depending on each student course offering, alongside Lecturer evaluation, exams, level progression to Alumni, Regular/Evening/Sandwich/Weekend streams, and SRC governance positions.',
    action: { openTab: 'university' }
  },
  {
    id: 'institutions',
    keywords: ['jhs', 'shs', 'technical', 'tvet', 'separate', 'institution type', 'difference', 'nursery', 'polytechnic'],
    speech: 'GBS separates operations strictly across four institution types: Nursery to JHS, Senior High School, Technical and TVET, and University. Each portal adapts role titles, classes, and permitted modules automatically while blocking non-university portals from university-only features.',
    action: null
  },
  {
    id: 'defaulters',
    keywords: ['defaulter', 'absent', 'not coming', 'didn\'t partake', 'did not partake', 'missed exam', 'missing assignment', 'unsubmitted', 'compliance'],
    speech: 'The Compliance and Defaulters Monitor lists exact student counts and rosters for students who did not partake in exams, failed to submit assignments, or are absent from school, with direct alerts from Teacher and Headmaster dashboards.',
    action: { openTab: 'defaulters' }
  },
  {
    id: 'pricing',
    keywords: ['price', 'pricing', 'cost', 'plan', 'fee rate', 'subscription', 'discount', 'bill', 'how much'],
    speech: 'GBS uses an active-student subscription model with zero fixed tenant fees: 3 Cedis per active student monthly for Nursery to JHS, 5 Cedis for Senior High and Technical institutes, and 10 Cedis for Universities, with multi-month discounts.',
    action: { navigateTo: '/onboarding' }
  },
  {
    id: 'staff_approval',
    keywords: ['approve', 'approval', 'pending', 'new staff', 'register', 'rejected', 'cannot login', 'locked'],
    speech: 'Newly registered teachers, accountants, HR, and staff cannot log in until the Headmaster approves them in the Pending Staff desk on the Headmaster Dashboard.',
    action: { openTab: 'roster' }
  },
  {
    id: 'payments',
    keywords: ['pay', 'payment', 'momo', 'mobile money', 'paystack', 'hubtel', 'telecel', 'card', 'visa', 'receipt'],
    speech: 'Parents and students settle fees securely via MTN Mobile Money, Telecel Cash, AT Money, Visa, Mastercard, or Bank Transfer through Paystack and Hubtel, updating Student, Parent, and Accountant ledgers without ever storing MoMo PINs or card CVVs.',
    action: { openTab: 'fees' }
  },
  {
    id: 'translator',
    keywords: ['translat', 'language', 'twi', 'ga', 'french', 'ewe', 'hausa', 'meaning', 'inbox', 'institution language', 'switch language'],
    speech: 'When a Headmaster changes the preferred System Language, GBS translates the entire institution workspace across Headmaster, Staff, Teacher, Student, Parent, Bursar, HR, and Alumni dashboards with exact meanings for the chosen language, while the movable Language Translator supports cross-language messaging.',
    action: { trigger: 'openTranslator' }
  },
  {
    id: 'sms',
    keywords: ['sms', 'text message', 'phone message', 'dispatch', 'carrier', 'inbox'],
    speech: 'Direct Mobile SMS routes carrier messages cleanly while saving every alert and sender detail in the recipient Direct SMS Inbox.',
    action: null
  },
  {
    id: 'voice_notes',
    keywords: ['voice note', 'audio', 'recording', 'microphone', 'wav'],
    speech: 'Voice Notes capture and store recorded audio messages per institution and play them back clearly across Headmaster, Teacher, and Parent portals.',
    action: null
  },
  {
    id: 'proctoring',
    keywords: ['proctor', 'exam', 'cheat', 'camera', 'test monitor', 'start exam', 'evidence', 'deduct', 'lost marks'],
    speech: 'When students click Start Exam, live webcam snapshots and focus checks stream to the Teacher Camera Wall so teachers can monitor students by name, send notices, save reference evidence, and subtract exact lost marks.',
    action: { openTab: 'exams' }
  },
  {
    id: 'mobile_app',
    keywords: ['install', 'mobile app', 'apk', 'pwa', 'android', 'iphone', 'ipad', 'download app'],
    speech: 'Click Mobile App and Push in the top system banner or Install App on the login page to install GBS directly onto Android, iPhone, iPad, Windows, or Mac with offline-ready updates.',
    action: null
  },
  {
    id: 'transport',
    keywords: ['bus', 'transport', 'route', 'pickup', 'boarding'],
    speech: 'Administrators assign students to campus commuter bus routes from the Transport Portal, syncing pickup stops and fares to Student and Parent portals.',
    action: { openTab: 'busTransport' }
  },
  {
    id: 'demo_live',
    keywords: ['demo', 'sandbox', 'live mode', 'real production', 'difference between demo'],
    speech: 'Demo Sandbox Mode lets institutions walk through every live portal up to 10 entries per module and switch institution types freely, while Live Production enforces strict school isolation and unlimited records.',
    action: null
  },
  {
    id: 'admissions',
    keywords: ['admission', 'apply', 'enroll', 'enrol', 'prospective', 'student form'],
    speech: 'Prospective students submit inquiries and documents online through Admissions; Headmasters review, schedule interviews, and approve enrollment, creating Student and Parent accounts alongside an Admission Medical Registration record.',
    action: { openTab: 'admissions' }
  },
  {
    id: 'roles_overview',
    keywords: ['what is gbs', 'about gbs', 'explain gbs', 'how does gbs work', 'portals', 'dashboards', 'features', 'everything', 'help', 'guide'],
    speech: 'GBS School Management System (motto: Intelligence Talks to Wisdom) connects Headmaster, Teacher or Lecturer, Student, Parent, Accountant, Non-Teaching Staff, HR, and Alumni into one synchronized institution platform.',
    action: null
  },
  {
    id: 'global_locale',
    keywords: ['country', 'countries', 'language', 'languages', 'currency', 'region', 'norm', 'arabic', 'french', 'spanish', 'timezone', 'international'],
    speech: 'GBS operates worldwide across any country and preferred language. Selecting your Country and System Language adapts currency, term structures, grading norms, RTL layout, and portal language immediately.',
    action: null
  },
  {
    id: 'auto_updates',
    keywords: ['update', 'upgrade', 'mobile app update', 'new version', 'automatic', 'cache', 'refresh', 'latest version'],
    speech: 'GBS Web and installed Mobile Apps detect new builds automatically and update offline caches seamlessly without requiring manual reinstallation.',
    action: null
  },
  {
    id: 'attendance',
    keywords: ['attendance', 'roll call', 'present', 'late', 'check in', 'qr scan'],
    speech: 'Daily Attendance tracks Present, Absent, Late, and Excused statuses via instant roll-call grids, updating Defaulters alerts and Parent portals live.',
    action: { openTab: 'attendance' }
  },
  {
    id: 'hr_payroll',
    keywords: ['hr', 'human resource', 'payroll', 'salary', 'leave', 'contract', 'recruitment', 'staffing'],
    speech: 'HR manages staff employment contracts, leave approvals, disciplinary logs, and salary slips synced with Accountancy.',
    action: null
  },
  {
    id: 'library_inventory',
    keywords: ['library', 'book', 'borrow', 'return', 'inventory', 'stock', 'asset', 'equipment'],
    speech: 'Campus Operations tracks library book circulation with overdue reminders plus institutional asset and inventory stock in Staff Operations and Headmaster audits.',
    action: null
  },
  {
    id: 'alumni',
    keywords: ['alumni', 'former student', 'graduated', 'transcript', 'gift', 'pledge', 'endowment'],
    speech: 'The Alumni Portal gives graduates verified transcripts, cohort networking, and institutional endowment or pledge contributions audited by Accountancy.',
    action: null
  }
];

const STOP_WORDS = new Set([
  'the', 'is', 'are', 'was', 'were', 'am', 'be', 'been', 'being', 'a', 'an', 'and', 'or', 'but',
  'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'from', 'as', 'into', 'this', 'that', 'these',
  'those', 'it', 'its', 'me', 'my', 'we', 'our', 'you', 'your', 'they', 'their', 'do', 'does', 'did',
  'can', 'could', 'would', 'should', 'will', 'please', 'tell', 'explain', 'about', 'what', 'how',
  'when', 'where', 'why', 'who', 'which', 'gbs', 'system', 'school'
]);

const TOPIC_HUMAN_LABELS = {
  all_roles_explained: 'Institutional Roles & Portal Activities',
  role_headmaster: 'Headmaster / Principal Activities',
  role_teacher: 'Teacher / Lecturer Activities',
  role_student: 'Student Activities',
  role_parent: 'Parent / Guardian Activities',
  role_accountant: 'Accountant / Bursar Activities',
  role_staff: 'Non-Teaching Staff Activities',
  role_hr: 'HR Management Activities',
  role_alumni: 'Alumni Activities',
  clinic: 'Personal Health & School Clinic Dossier',
  clinic_pull: 'Personal Health & Medical Record Lookup',
  university: 'University Hub (Separate Internships & Attachments, Streams, SRC & Graduation)',
  institutions: 'Institution Tier Separation (JHS, SHS, Technical, University)',
  defaulters: 'Exam, Assignment & Attendance Defaulters Tracker',
  pricing: 'Active-Student Subscription Pricing & Discounts',
  staff_approval: 'Headmaster Pending Staff Approval Workflow',
  payments: 'Fees, Mobile Money & Card Payment Processing',
  translator: 'System Language & Floating Translator',
  sms: 'Direct Mobile SMS Dispatch & Inbox',
  voice_notes: 'Real-Time Voice Notes Recording & Playback',
  proctoring: 'AI Examination Proctoring & Anti-Cheat Monitoring',
  mobile_app: 'Mobile App (PWA) Installation',
  transport: 'Campus Bus & Student Transport Syncing',
  demo_live: 'Demo Sandbox vs Real Live Production Mode',
  admissions: 'Student Admissions & Enrollment Linking',
  roles_overview: 'GBS Unified System Overview',
  global_locale: 'Global Country Norms & Preferred Language System',
  auto_updates: 'Automatic Mobile & Web App Upgrading',
  attendance: 'Daily Attendance & Roll-Call Sync',
  hr_payroll: 'HR Contracts, Leave & Payroll Ledger',
  library_inventory: 'Library Circulation & Campus Inventory',
  alumni: 'Alumni Directory, Transcripts & Pledges',
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
  } else if (/^(open|show|pull|check|go to|take me|run|switch|change|explain|tell)\b/i.test(qLower)) {
    questionStyle = 'Action Command & Record Request';
    openingCue = 'immediate system execution and confirmation';
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

  return {
    tenantId: tid,
    clinicProfilesCount: scopedProfiles.length,
    clinicVisitsCount: scopedVisits.length,
    activeSickbayCount: sickbayActive.length,
    universityInternshipsCount: uniInternships.length,
    universityAttachmentsCount: uniAttachments.length,
    universityStreamsCount: uniStreams.length,
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
    version: memory.version || '2.10.0-PRODUCTION-BLUEPRINT',
    savedAt: memory.savedAt || new Date().toISOString(),
    motto: 'Intelligence Talks to Wisdom',
    ratesPerStudentPerMonthGHS: memory.subscriptionPricingMemory?.ratesPerStudentPerMonthGHS || {
      NURSERY_TO_JHS: 3,
      SHS: 5,
      TECHNICAL: 5,
      UNIVERSITY: 10
    },
    roleActivities: ROLE_ACTIVITIES_GUIDE,
    dashboards: safeDashboards,
    topics: CORE_TOPICS.map(({ id, speech, action }) => ({ id, speech, action })),
    liveStats
  };
}

function answerUserQuery(req, rawQuery = '') {
  const query = String(rawQuery || '').trim();
  const qLower = query.toLowerCase();
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
    const answerText = 'Internal platform administration and architecture details are confidential and not disclosed by the GBS Assistant. I can gladly explain any institutional role (Headmaster, Teacher, Student, Parent, Accountant, Staff, HR, or Alumni) and all portal activities.';
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
  if (/(pull clinic|pull medical|clinic record|medical record|who is in sickbay|sickbay)/i.test(qLower)) {
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

  // Match core knowledge base topics using scored keyword matches
  let bestTopic = null;
  let bestScore = 0;
  for (const t of CORE_TOPICS) {
    let score = 0;
    for (const kw of t.keywords) {
      if (qLower.includes(kw)) score += kw.includes(' ') ? 3 : 2;
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
      systemVersion: memory.version || '2.10.0-PRODUCTION-BLUEPRINT',
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
  const fallbackAnswer = `GBS School Management System connects Headmaster, Teacher or Lecturer, Student, Parent, Accountant, Non-Teaching Staff, HR, and Alumni dashboards into one linked institutional system covering Admissions, Attendance, Multi-Format Proctored Exams, School Clinic Health Records, Separate University Internships and Attachments, Payments, Transport, and Multi-Language Support. Live workspace counters show ${liveStats.universityInternshipsCount} internships and ${liveStats.universityAttachmentsCount} academic attachments.`;
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
  ROLE_ACTIVITIES_GUIDE
};
