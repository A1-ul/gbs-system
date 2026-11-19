'use strict';

const fs = require('fs');
const path = require('path');
const { readPersistentStore } = require('../../core/database/persistentStore');

const MEMORY_PATH = path.resolve(__dirname, '../../../data/gbs_system_memory_snapshot.json');
let cachedMemory = { mtimeMs: 0, data: null };

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

const CORE_TOPICS = [
  {
    id: 'clinic',
    keywords: ['clinic', 'sickbay', 'medical', 'health', 'doctor', 'nurse', 'sick', 'hospital', 'treatment', 'medicine', 'blood', 'genotype', 'allergy'],
    speech: 'The GBS School Clinic allows both Students and Teachers to be treated, monitored in Sickbay, and automatically links their Admission Medical Registration Records across Headmaster, Teacher, Student, Parent, Staff, and HR portals for instant record pull.',
    action: { openTab: 'clinic' }
  },
  {
    id: 'university',
    keywords: ['university', 'internship', 'attachment', 'src', 'stream', 'evening', 'weekend', 'sandwich', 'regular', 'lecturer', 'graduate', 'alumni', 'degree', 'cgpa'],
    speech: 'GBS University Hub supports student Internship and Attachment forms with dual coursework and supervisor grading, Lecturer course exams leading to level progression and Alumni graduation, Regular, Evening, Sandwich, and Weekend streams, plus SRC leadership positions and school action plans — strictly gated to University institutions.',
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
    speech: 'The Compliance and Defaulters Monitor lists exact counts and student rosters for students who did not partake in exams, failed to submit assignments, or are not coming to school, with one-click SMS alerts from Teacher and Headmaster dashboards.',
    action: { openTab: 'defaulters' }
  },
  {
    id: 'pricing',
    keywords: ['price', 'pricing', 'cost', 'plan', 'fee rate', 'subscription', 'discount', 'bill', 'how much'],
    speech: 'GBS uses a transparent 100 percent active-student subscription model with zero fixed tenant fees: 3 Cedis per active student monthly for Nursery to JHS, 5 Cedis for Senior High and Technical institutes, and 10 Cedis for Universities, with 3, 5, 7, and 12 percent multi-month discounts.',
    action: { navigateTo: '/onboarding' }
  },
  {
    id: 'staff_approval',
    keywords: ['approve', 'approval', 'pending', 'new staff', 'register', 'rejected', 'cannot login', 'locked'],
    speech: 'Newly registered teachers, accountants, HR, and staff cannot log in until the Headmaster vets and approves them in the Pending Staff desk on the Headmaster Dashboard. Once approved, their role portal unlocks immediately.',
    action: { openTab: 'roster' }
  },
  {
    id: 'payments',
    keywords: ['pay', 'payment', 'momo', 'mobile money', 'paystack', 'hubtel', 'telecel', 'card', 'visa', 'receipt'],
    speech: 'Parents and students settle school fees securely via MTN Mobile Money, Telecel Cash, AT Money, Visa, Mastercard, or Bank Transfer through Paystack and Hubtel. Receipts sync instantly across Student, Parent, and Accountant portals, and GBS never asks for or stores MoMo PINs or card CVVs.',
    action: { openTab: 'fees' }
  },
  {
    id: 'translator',
    keywords: ['translat', 'language', 'twi', 'ga', 'french', 'ewe', 'hausa', 'meaning', 'inbox'],
    speech: 'The movable GBS Language Translator lets you translate messages accurately across Twi, Ga, Ewe, Fante, Hausa, French, Spanish, Arabic, and English with exact dictionary meaning, and delivers translated messages straight to the recipient inbox with sender details.',
    action: { trigger: 'openTranslator' }
  },
  {
    id: 'sms',
    keywords: ['sms', 'text message', 'phone message', 'dispatch', 'carrier', 'inbox'],
    speech: 'Direct Mobile SMS supports Arkesel, Hubtel, mNotify, and Twilio carrier routing alongside the built-in Direct SMS Inbox so every sent message reaches the recipient portal and contact number cleanly.',
    action: null
  },
  {
    id: 'voice_notes',
    keywords: ['voice note', 'audio', 'recording', 'microphone', 'wav'],
    speech: 'Voice Notes capture and store the exact recorded WebM, Opus, MP4, or WAV audio message per institution and play it back clearly with sender metadata across Headmaster, Teacher, and Parent portals.',
    action: null
  },
  {
    id: 'proctoring',
    keywords: ['proctor', 'exam', 'cheat', 'camera', 'test monitor', 'start exam', 'evidence', 'deduct', 'lost marks'],
    speech: 'When students click Start Exam, live webcam snapshots and movement monitoring stream to the Teacher Dashboard Camera Wall. Teachers can search students by name, select camera feeds, or broadcast to all examinees, archive snapshots as permanent reference evidence, and exact lost proctoring marks subtract automatically from final exam scores.',
    action: { openTab: 'exams' }
  },
  {
    id: 'mobile_app',
    keywords: ['install', 'mobile app', 'apk', 'pwa', 'android', 'iphone', 'ipad', 'download app'],
    speech: 'Click Mobile App and Push in the top system banner and select Install App Now to install GBS natively onto Android, iPhone, iPad, Windows, or Mac using full offline-ready PWA caching.',
    action: null
  },
  {
    id: 'transport',
    keywords: ['bus', 'transport', 'route', 'pickup', 'boarding'],
    speech: 'Administrators assign students to campus commuter bus routes from the Headmaster Command Center or Transport Portal, automatically syncing route fares and pickup stops to Student and Parent portals.',
    action: { openTab: 'busTransport' }
  },
  {
    id: 'demo_live',
    keywords: ['demo', 'sandbox', 'live mode', 'real production', 'difference between demo'],
    speech: 'Demo Sandbox Mode lets new schools walk through every live GBS portal with up to 10 trial entries per module and switch between JHS, SHS, Technical, and University tiers, while Live Production enforces strict tenant isolation and unlimited records.',
    action: null
  },
  {
    id: 'admissions',
    keywords: ['admission', 'apply', 'enroll', 'enrol', 'prospective', 'student form'],
    speech: 'Prospective students submit inquiries and documents online through Admissions; Headmasters review, schedule interviews, and approve enrollment, which automatically creates student and parent accounts plus an initial School Clinic medical registration record.',
    action: { openTab: 'admissions' }
  },
  {
    id: 'roles_overview',
    keywords: ['what is gbs', 'about gbs', 'explain gbs', 'how does gbs work', 'portals', 'dashboards', 'features', 'everything', 'help', 'guide'],
    speech: 'GBS School Management System unifies Headmaster, Teacher or Lecturer, Student, Parent, Accountant, Staff, HR, Alumni, School Clinic, Transport, Payments, Translator, AI Proctoring, and Developer Control into one linked real-time platform governed by the motto Intelligence Talks to Wisdom.',
    action: null
  },
  {
    id: 'global_locale',
    keywords: ['country', 'countries', 'language', 'languages', 'currency', 'region', 'norm', 'arabic', 'french', 'spanish', 'timezone', 'international'],
    speech: 'GBS operates worldwide across any country and preferred language. Selecting your Country and System Language in the top banner or Login portal adapts currencies, term structures, grading norms, right-to-left typography when needed, and AI voice locale immediately.',
    action: null
  },
  {
    id: 'auto_updates',
    keywords: ['update', 'upgrade', 'mobile app update', 'new version', 'automatic', 'cache', 'refresh', 'latest version'],
    speech: 'GBS Mobile App and Web PWA feature Zero-Touch Automatic Upgrading: whenever new builds go live, connected browsers and installed mobile apps detect the live release manifest, clear stale offline caches safely, notify you, and update automatically without manual reinstallation.',
    action: null
  },
  {
    id: 'attendance',
    keywords: ['attendance', 'roll call', 'present', 'late', 'check in', 'qr scan'],
    speech: 'Daily Attendance tracks Present, Absent, Late, and Excused statuses via instant teacher roll-call grids or student ID scanning, updating Defaulters alerts and Parent portals live.',
    action: { openTab: 'attendance' }
  },
  {
    id: 'hr_payroll',
    keywords: ['hr', 'human resource', 'payroll', 'salary', 'leave', 'contract', 'recruitment', 'staffing'],
    speech: 'The HR and Payroll suite manages staff employment contracts, leave requests, disciplinary logs, salary slips synced with Accountant general ledgers, and staff health referrals connected to the School Clinic.',
    action: null
  },
  {
    id: 'library_inventory',
    keywords: ['library', 'book', 'borrow', 'return', 'inventory', 'stock', 'asset', 'equipment'],
    speech: 'Campus Operations tracks library book circulation with overdue reminders plus institutional asset and inventory stock levels in Staff Operations and Headmaster audits.',
    action: null
  },
  {
    id: 'alumni',
    keywords: ['alumni', 'former student', 'graduated', 'transcript', 'gift', 'pledge', 'endowment'],
    speech: 'The Alumni Portal gives graduated cohorts access to verified transcripts, reunion announcements, peer networking directories, and direct endowment or pledge contributions audited by the Accountant Desk.',
    action: null
  },
  {
    id: 'developer_rcce',
    keywords: ['developer', 'rcce', 'control engine', 'control center', 'audit', 'tenant', 'locate', 'security', 'firewall'],
    speech: 'The Developer Control Center runs the centralized GBS-RCCE engine for real-time tenant diagnostics, GPS school campus location, security rules, system locks, backups, and release orchestration across every institution.',
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
  clinic: 'School Clinic & Admission Medical Registry',
  clinic_pull: 'Live School Clinic & Sickbay Medical Records Lookup',
  university: 'University Hub (Internships, Streams, SRC & Graduation)',
  institutions: 'Institution Tier Separation (JHS, SHS, Technical, University)',
  defaulters: 'Exam, Assignment & Attendance Defaulters Tracker',
  pricing: 'Active-Student Subscription Pricing & Discounts',
  staff_approval: 'Headmaster Pending Staff Approval Workflow',
  payments: 'Fees, Mobile Money & Card Payment Processing',
  translator: 'Universal Language Translator & Inbox Delivery',
  sms: 'Direct Mobile SMS Dispatch & Inbox',
  voice_notes: 'Real-Time Voice Notes Recording & Playback',
  proctoring: 'AI Examination Proctoring & Anti-Cheat Monitoring',
  mobile_app: 'Mobile App (PWA) Installation',
  transport: 'Campus Bus & Student Transport Syncing',
  demo_live: 'Demo Sandbox vs Real Live Production Mode',
  admissions: 'Student Admissions & Enrollment Linking',
  roles_overview: 'GBS Unified System Architecture',
  global_locale: 'Global Country Norms & Preferred Language System',
  auto_updates: 'Automatic Live Mobile & Web App Upgrading',
  attendance: 'Daily Attendance & Roll-Call Sync',
  hr_payroll: 'HR Contracts, Leave & Payroll Ledger',
  library_inventory: 'Library Circulation & Campus Inventory',
  alumni: 'Alumni Directory, Transcripts & Pledges',
  developer_rcce: 'Developer Control Center & GBS-RCCE Engine',
  privacy_shield: 'Institutional Security & Privacy Policy',
  general_memory: 'System Memory Knowledge Index'
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
    .filter((w) => w.length >= 2 && !STOP_WORDS.has(w))
    .filter((v, i, a) => a.indexOf(v) === i)
    .slice(0, 5);

  const moduleLabel = TOPIC_HUMAN_LABELS[topicId] || 'GBS Unified System';
  const focusPhrase = keyTerms.length > 0 ? `"${keyTerms.join(', ')}"` : 'general platform operation';

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
  const clinicProfiles = (store.schoolClinicProfiles || []).filter((p) => String(p.tenantId || '1') === tid);
  const clinicVisits = (store.schoolClinicVisits || []).filter((v) => String(v.tenantId || '1') === tid);
  const sickbayActive = clinicVisits.filter((v) => v.disposition === 'ADMITTED_TO_SICKBAY' && !v.dischargedAt);
  const uniInternships = (store.universityInternships || []).filter((i) => String(i.tenantId || '1') === tid);
  const uniStreams = (store.universityStreams || []).filter((s) => String(s.tenantId || '1') === tid);
  const pendingStaff = (store.registeredUsers || []).filter(
    (u) => String(u.tenantId || '1') === tid && String(u.status || '').toUpperCase().includes('PENDING')
  );

  return {
    tenantId: tid,
    clinicProfilesCount: clinicProfiles.length,
    clinicVisitsCount: clinicVisits.length,
    activeSickbayCount: sickbayActive.length,
    universityInternshipsCount: uniInternships.length,
    universityStreamsCount: uniStreams.length,
    pendingStaffApprovalsCount: pendingStaff.length
  };
}

function getSystemMemoryCatalog(req = null) {
  const memory = loadMemorySnapshot() || {};
  const liveStats = buildTenantLiveStats(req);

  return {
    systemName: memory.systemName || 'GBS SCHOOL MANAGEMENT SYSTEM',
    version: memory.version || '2.7.0-PRODUCTION',
    savedAt: memory.savedAt || new Date().toISOString(),
    motto: 'Intelligence Talks to Wisdom',
    ratesPerStudentPerMonthGHS: memory.subscriptionPricingMemory?.ratesPerStudentPerMonthGHS || {
      NURSERY_TO_JHS: 3,
      SHS: 5,
      TECHNICAL: 5,
      UNIVERSITY: 10
    },
    dashboards: (memory.dashboardsAndRoutesMemory || []).map((d) => ({
      name: d.name,
      route: d.route,
      keyBehaviors: d.keyBehaviors
    })),
    topics: CORE_TOPICS.map(({ id, speech, action }) => ({ id, speech, action })),
    diagnosticsKnownCount: Array.isArray(memory.diagnosticCauseAndFixKnowledgeBase)
      ? memory.diagnosticCauseAndFixKnowledgeBase.length
      : 0,
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

  // Privacy guard for personal developer inquiries
  if (/\b(developer|gabriel|osei)\b.*\b(who|name|phone|number|personal|contact|email|address|built|made|created)\b|\bwho\s+(is\s+the\s+developer|built|made|created|developed)\b/i.test(qLower)) {
    const formation = analyzeAndExplainQuestionFormation(query, 'privacy_shield');
    const answerText = 'Developer personal details are protected under GBS institutional security policy. Please use the official GBS portal support channels for technical help.';
    return {
      topicId: 'privacy_shield',
      questionFormation: formation,
      answerText,
      speechText: `${answerText} ${formation.explanationText}`,
      detailedAnswer: `${answerText}\n\n${formation.explanationText}`,
      liveStats
    };
  }

  // Pull specific School Clinic records if requested by name/query
  if (/(pull clinic|pull medical|clinic record|medical record|who is in sickbay|sickbay)/i.test(qLower)) {
    const visits = (store.schoolClinicVisits || []).filter((v) => String(v.tenantId || '1') === tid);
    const profiles = (store.schoolClinicProfiles || []).filter((p) => String(p.tenantId || '1') === tid);
    const activeSickbay = visits.filter((v) => v.disposition === 'ADMITTED_TO_SICKBAY' && !v.dischargedAt);
    const formation = analyzeAndExplainQuestionFormation(query, 'clinic_pull');
    const answerText = `School Clinic Memory currently holds ${profiles.length} admission medical profiles, ${visits.length} total clinic visits, and ${activeSickbay.length} patient currently admitted in Sickbay. Opening the School Clinic records view now.`;

    return {
      topicId: 'clinic_pull',
      questionFormation: formation,
      answerText,
      speechText: `${answerText} ${formation.explanationText}`,
      detailedAnswer: (activeSickbay.length > 0
        ? `Active Sickbay Patients: ${activeSickbay.map((s) => `${s.patientName} (${s.patientRole}, ${s.diagnosis})`).join('; ')}. Total visits: ${visits.length}.`
        : `Total medical registrations: ${profiles.length}. Total clinic visits recorded: ${visits.length}. Active Sickbay occupancy: 0.`) + `\n\n${formation.explanationText}`,
      action: { openTab: 'clinic' },
      pulledRecords: { profilesCount: profiles.length, visits: visits.slice(0, 10), activeSickbay },
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

  // Match against diagnostic knowledge base in gbs_system_memory_snapshot.json
  const diags = Array.isArray(memory.diagnosticCauseAndFixKnowledgeBase)
    ? memory.diagnosticCauseAndFixKnowledgeBase
    : [];
  let bestDiag = null;
  let bestDiagScore = 0;
  const words = qLower.split(/[^a-z0-9]+/).filter((w) => w.length >= 3);
  for (const d of diags) {
    const hay = `${d.issueCode} ${d.symptom} ${d.resolution}`.toLowerCase();
    let score = 0;
    for (const w of words) {
      if (hay.includes(w)) score += 1;
    }
    if (score > bestDiagScore) {
      bestDiagScore = score;
      bestDiag = d;
    }
  }

  if (bestDiag && bestDiagScore >= 2) {
    const formation = analyzeAndExplainQuestionFormation(query, 'developer_rcce');
    const summary = `Regarding ${bestDiag.symptom}: ${bestDiag.resolution}`;
    return {
      topicId: bestDiag.issueCode,
      questionFormation: formation,
      answerText: summary,
      speechText: `${summary} ${formation.explanationText}`,
      detailedAnswer: `${summary} (Status: ${bestDiag.status}).\n\n${formation.explanationText}`,
      action: null,
      liveStats
    };
  }

  // Match against live dashboard routes/behaviors in System Memory snapshot before final fallback
  const dashMatches = (memory.dashboardsAndRoutesMemory || []).find((d) => {
    const hay = `${d.name || ''} ${d.route || ''} ${(d.keyBehaviors || []).join(' ')}`.toLowerCase();
    return words.some((w) => hay.includes(w));
  });
  if (dashMatches) {
    const formation = analyzeAndExplainQuestionFormation(query, 'roles_overview');
    const summary = `In ${dashMatches.name} (${dashMatches.route}), key capabilities include: ${(dashMatches.keyBehaviors || []).slice(0, 3).join('; ')}.`;
    return {
      topicId: 'roles_overview',
      questionFormation: formation,
      answerText: summary,
      speechText: `${summary} ${formation.explanationText}`,
      detailedAnswer: `${summary}\n\n${formation.explanationText}`,
      action: dashMatches.route ? { navigateTo: dashMatches.route } : null,
      liveStats
    };
  }

  // Comprehensive System Memory fallback so assistant ALWAYS gives helpful, real system context + question formation breakdown
  const formation = analyzeAndExplainQuestionFormation(query, 'general_memory');
  const fallbackAnswer = `GBS School Management System (${memory.version || 'v2.10'}) connects Headmaster, Teacher or Lecturer, Student, Parent, Accountant, Staff, HR, Alumni, School Clinic, University Hub, Defaulters Compliance, Global Country and Language Preferences, Automatic Mobile App Updates, Direct SMS, Payments, and Developer Control. Live tenant stats show ${liveStats.clinicProfilesCount} medical profiles and ${liveStats.universityInternshipsCount} university internships.`;
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
  answerUserQuery
};
