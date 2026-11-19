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
    keywords: ['proctor', 'exam', 'cheat', 'camera', 'test monitor', 'start exam'],
    speech: 'When a student clicks Start Exam, GBS AI Proctoring activates live camera focus monitoring, tab-switch blocking, and anti-copy protection continuously until the exam is submitted.',
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
  }
];

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
    return {
      topicId: 'privacy_shield',
      speechText: 'Developer personal details are protected under GBS institutional security policy. Please use the official GBS portal support channels for technical help.',
      detailedAnswer: 'Protected by GBS Security Policy.',
      liveStats
    };
  }

  // Pull specific School Clinic records if requested by name/query
  if (/(pull clinic|pull medical|clinic record|medical record|who is in sickbay|sickbay)/i.test(qLower)) {
    const visits = (store.schoolClinicVisits || []).filter((v) => String(v.tenantId || '1') === tid);
    const profiles = (store.schoolClinicProfiles || []).filter((p) => String(p.tenantId || '1') === tid);
    const activeSickbay = visits.filter((v) => v.disposition === 'ADMITTED_TO_SICKBAY' && !v.dischargedAt);

    return {
      topicId: 'clinic_pull',
      speechText: `School Clinic Memory currently holds ${profiles.length} admission medical profiles, ${visits.length} total clinic visits, and ${activeSickbay.length} patient currently admitted in Sickbay. Opening the School Clinic records view now.`,
      detailedAnswer: activeSickbay.length > 0
        ? `Active Sickbay Patients: ${activeSickbay.map((s) => `${s.patientName} (${s.patientRole}, ${s.diagnosis})`).join('; ')}. Total visits: ${visits.length}.`
        : `Total medical registrations: ${profiles.length}. Total clinic visits recorded: ${visits.length}. Active Sickbay occupancy: 0.`,
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
    return {
      topicId: bestTopic.id,
      speechText: bestTopic.speech,
      detailedAnswer: bestTopic.speech,
      action: bestTopic.action,
      systemVersion: memory.version || '2.7.0-PRODUCTION',
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
    const summary = `Regarding ${bestDiag.symptom}: ${bestDiag.resolution}`;
    return {
      topicId: bestDiag.issueCode,
      speechText: summary,
      detailedAnswer: `${summary} (Status: ${bestDiag.status}).`,
      action: null,
      liveStats
    };
  }

  // Comprehensive System Memory fallback so assistant ALWAYS gives helpful, real system context
  const fallbackSpeech = `GBS School Management System version ${memory.version || '2.7.0'} links Headmaster, Teacher or Lecturer, Student, Parent, Accountant, Staff, HR, Alumni, and Developer portals, plus School Clinic medical registrations, Institution Separation across JHS, SHS, Technical and University tiers, Defaulters tracking, Mobile Money payments, SMS, and the Language Translator. Ask me about any of these modules or say open a portal.`;
  return {
    topicId: 'general_memory',
    speechText: fallbackSpeech,
    detailedAnswer: fallbackSpeech,
    action: null,
    liveStats
  };
}

module.exports = {
  loadMemorySnapshot,
  getSystemMemoryCatalog,
  answerUserQuery
};
