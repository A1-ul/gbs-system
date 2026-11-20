'use strict';

const prisma = require('../../core/database/prisma.client');
const { readPersistentStore, writePersistentStore } = require('../../core/database/persistentStore');
const { AppError } = require('../../middleware/error.middleware');
const {
  resolveTenantInstitutionType,
  getInstitutionProfile,
  normalizeInstitutionType
} = require('../../utils/institutionProfiles');

const ALL_TIERS = ['NURSERY_TO_JHS', 'SENIOR_HIGH_SCHOOL', 'TECHNICAL', 'UNIVERSITY'];
const PLACEMENT_ATTACHMENT_TIERS = ['TECHNICAL', 'UNIVERSITY'];

const GRADE_SCALE = [
  { min: 80, letter: 'A', point: 4.0 },
  { min: 75, letter: 'B+', point: 3.5 },
  { min: 70, letter: 'B', point: 3.0 },
  { min: 65, letter: 'C+', point: 2.5 },
  { min: 60, letter: 'C', point: 2.0 },
  { min: 55, letter: 'D+', point: 1.5 },
  { min: 50, letter: 'D', point: 1.0 },
  { min: 0, letter: 'F', point: 0.0 }
];

const TIER_LEVEL_LADDERS = {
  NURSERY_TO_JHS: ['Nursery 1', 'Nursery 2', 'KG 1', 'KG 2', 'Primary 1', 'Primary 2', 'Primary 3', 'Primary 4', 'Primary 5', 'Primary 6', 'JHS 1', 'JHS 2', 'JHS 3'],
  SENIOR_HIGH_SCHOOL: ['SHS Form 1', 'SHS Form 2', 'SHS Form 3'],
  TECHNICAL: ['TVET Level 1', 'TVET Level 2', 'TVET Level 3'],
  UNIVERSITY: ['Level 100', 'Level 200', 'Level 300', 'Level 400']
};

function computeLetterAndPoint(rawScore) {
  const score = Math.max(0, Math.min(100, Number(rawScore) || 0));
  const match = GRADE_SCALE.find((g) => score >= g.min) || GRADE_SCALE[GRADE_SCALE.length - 1];
  return { score, letterGrade: match.letter, gradePoint: match.point };
}

function classifyHonours(cgpa, tier = 'UNIVERSITY') {
  const g = Number(cgpa) || 0;
  if (tier === 'UNIVERSITY') {
    if (g >= 3.6) return 'First Class Honours';
    if (g >= 3.0) return 'Second Class Upper';
    if (g >= 2.0) return 'Second Class Lower';
    if (g >= 1.5) return 'Third Class';
    return 'Pass';
  }
  if (g >= 3.6) return 'Distinction';
  if (g >= 3.0) return 'Merit';
  if (g >= 2.0) return 'Credit';
  return 'Pass';
}

function getStarterStreamsByTier(tenantId, tier = 'UNIVERSITY') {
  const tid = Number(tenantId) || 1;
  if (tier === 'NURSERY_TO_JHS') {
    return [
      { id: `stream_jhs_reg_${tid}`, tenantId: tid, institutionType: tier, streamCode: 'DAY_MORNING', streamName: 'Regular Morning School', scheduleSummary: 'Monday – Friday • 7:30 AM – 2:45 PM', coordinator: 'Headmaster Academic Office', feePolicyNote: 'Standard 3-Term Basic Tuition', activeStudentsCount: 0, status: 'ACTIVE' },
      { id: `stream_jhs_ext_${tid}`, tenantId: tid, institutionType: tier, streamCode: 'EXTENDED_PREP', streamName: 'After-School / BECE Prep Stream', scheduleSummary: 'Monday – Friday • 3:00 PM – 4:30 PM (BECE Coaching)', coordinator: 'JHS Examination Coordinator', feePolicyNote: 'Extra Study & Revision Support', activeStudentsCount: 0, status: 'ACTIVE' }
    ];
  }
  if (tier === 'SENIOR_HIGH_SCHOOL') {
    return [
      { id: `stream_shs_brd_${tid}`, tenantId: tid, institutionType: tier, streamCode: 'BOARDING', streamName: 'Boarding House Stream', scheduleSummary: 'Full-Time Residential • Supervised Evening Prep', coordinator: 'Senior Housemaster / Housemistress', feePolicyNote: 'Tuition + Boarding Allocation', activeStudentsCount: 0, status: 'ACTIVE' },
      { id: `stream_shs_day_${tid}`, tenantId: tid, institutionType: tier, streamCode: 'DAY_SCHOLAR', streamName: 'Day Student Stream', scheduleSummary: 'Monday – Friday • 7:15 AM – 3:30 PM', coordinator: 'SHS Academic Directorate', feePolicyNote: 'Standard SHS Day Tuition', activeStudentsCount: 0, status: 'ACTIVE' }
    ];
  }
  if (tier === 'TECHNICAL') {
    return [
      { id: `stream_tvet_day_${tid}`, tenantId: tid, institutionType: tier, streamCode: 'WORKSHOP_AM', streamName: 'Regular Workshop Stream', scheduleSummary: 'Monday – Friday • 7:30 AM – 3:30 PM (Practical Labs)', coordinator: 'Chief Workshop Instructor', feePolicyNote: 'Standard CBT / Trade Schedule', activeStudentsCount: 0, status: 'ACTIVE' },
      { id: `stream_tvet_eve_${tid}`, tenantId: tid, institutionType: tier, streamCode: 'APPRENTICE_PM', streamName: 'Evening & Weekend Apprentice Stream', scheduleSummary: 'Evenings 5:30 PM – 8:30 PM & Saturdays', coordinator: 'Industrial Liaison Office', feePolicyNote: 'Apprentice Modular Training', activeStudentsCount: 0, status: 'ACTIVE' }
    ];
  }
  return [
    { id: `stream_reg_${tid}`, tenantId: tid, institutionType: 'UNIVERSITY', streamCode: 'REGULAR', streamName: 'Regular Students', scheduleSummary: 'Monday – Friday • 7:30 AM – 4:30 PM (Full-Time Daytime)', coordinator: 'Office of Academic Affairs (Regular)', feePolicyNote: 'Standard Full-Time Semester Schedule', activeStudentsCount: 0, status: 'ACTIVE' },
    { id: `stream_eve_${tid}`, tenantId: tid, institutionType: 'UNIVERSITY', streamCode: 'EVENING', streamName: 'Evening Students', scheduleSummary: 'Monday – Friday • 5:30 PM – 9:00 PM (Working Professionals)', coordinator: 'Evening & Executive Studies Coordinator', feePolicyNote: 'Evening Semester Tuition Schedule', activeStudentsCount: 0, status: 'ACTIVE' },
    { id: `stream_snd_${tid}`, tenantId: tid, institutionType: 'UNIVERSITY', streamCode: 'SANDWICH', streamName: 'Sandwich Students', scheduleSummary: 'Intensive Vacation Blocks (June – August / December)', coordinator: 'Sandwich & Continuing Education Directorate', feePolicyNote: 'Modular Block Session Billing', activeStudentsCount: 0, status: 'ACTIVE' },
    { id: `stream_wkd_${tid}`, tenantId: tid, institutionType: 'UNIVERSITY', streamCode: 'WEEKEND', streamName: 'Weekend Students', scheduleSummary: 'Fridays 5:30 PM – 8:30 PM • Saturdays & Sundays 8:00 AM – 5:00 PM', coordinator: 'Weekend School Directorate', feePolicyNote: 'Weekend Modular Semester Billing', activeStudentsCount: 0, status: 'ACTIVE' }
  ];
}

function getStarterGovernanceByTier(tenantId, tier = 'UNIVERSITY') {
  const tid = Number(tenantId) || 1;
  if (tier === 'NURSERY_TO_JHS') {
    return [
      { id: `pref_boy_${tid}`, tenantId: tid, institutionType: tier, positionTitle: 'School Head Prefect (Boys)', holderName: 'Elected JHS 3 Senior Boy', studentId: 'PREF-01', level: 'JHS 3', stream: 'Regular Morning School', duties: 'Leads morning assembly, coordinates class captains, and models discipline.', strategicPlan: 'Maintain punctual assembly attendance and clean classrooms.', howToHelpSchool: 'Encourage reading clubs and peer tutoring across Basic 1–JHS 3.', termYear: '2026/2027', status: 'ACTIVE' },
      { id: `pref_girl_${tid}`, tenantId: tid, institutionType: tier, positionTitle: 'School Head Prefect (Girls)', holderName: 'Elected JHS 3 Senior Girl', studentId: 'PREF-02', level: 'JHS 3', stream: 'Regular Morning School', duties: 'Oversees pupil welfare, library order, and girls mentorship.', strategicPlan: 'Support sanitation standards and science quiz readiness.', howToHelpSchool: 'Assist teachers in helping new pupils settle smoothly.', termYear: '2026/2027', status: 'ACTIVE' }
    ];
  }
  if (tier === 'SENIOR_HIGH_SCHOOL') {
    return [
      { id: `shs_sp_${tid}`, tenantId: tid, institutionType: tier, positionTitle: 'SHS Senior Prefect & SRC Rep', holderName: 'Elected SHS 3 Senior Prefect', studentId: 'SHS-PREF-01', level: 'SHS Form 3', stream: 'Boarding House Stream', duties: 'Represents SHS Houses before the Headmaster and coordinates student prep order.', strategicPlan: 'Lead WASSCE study peer groups and inter-house academics.', howToHelpSchool: 'Strengthen study hall focus and dorm welfare.', termYear: '2026/2027', status: 'ACTIVE' },
      { id: `shs_din_${tid}`, tenantId: tid, institutionType: tier, positionTitle: 'Academic & Library Prefect', holderName: 'Elected SHS 3 Scholar Rep', studentId: 'SHS-PREF-02', level: 'SHS Form 3', stream: 'Day Student Stream', duties: 'Coordinates science lab readiness and textbook borrowing returns.', strategicPlan: 'Organize Science & Business mock competitions.', howToHelpSchool: 'Keep library resources available to Day and Boarding students.', termYear: '2026/2027', status: 'ACTIVE' }
    ];
  }
  if (tier === 'TECHNICAL') {
    return [
      { id: `tvet_cap_${tid}`, tenantId: tid, institutionType: tier, positionTitle: 'Chief Workshop Captain & Trainee President', holderName: 'Elected TVET Level 3 Captain', studentId: 'TVET-REP-01', level: 'TVET Level 3', stream: 'Regular Workshop Stream', duties: 'Coordinates PPE safety checks, workshop tool accountability, and trainee representation.', strategicPlan: 'Guarantee 100% safety gear compliance and industrial attachment readiness.', howToHelpSchool: 'Partner with instructors to mentor incoming Level 1 apprentices.', termYear: '2026/2027', status: 'ACTIVE' }
    ];
  }
  return [
    { id: `src_pres_${tid}`, tenantId: tid, institutionType: 'UNIVERSITY', positionTitle: 'SRC President (Student Representative Council)', holderName: 'Appointed / Elected Student Representative', studentId: 'SRC-EXEC-01', level: 'Level 400', stream: 'Regular Students', duties: 'Chairs the SRC Executive Council, represents all student streams in University Senate, and oversees student welfare initiatives.', strategicPlan: 'Expand digital learning labs, host quarterly career fairs, and strengthen campus shuttle schedules.', howToHelpSchool: 'Partner with University Management to maintain exam readiness, hostel security, and peer mentorship across Level 100-400.', termYear: '2026/2027', status: 'ACTIVE' },
    { id: `src_sec_${tid}`, tenantId: tid, institutionType: 'UNIVERSITY', positionTitle: 'SRC General Secretary', holderName: 'Elected Secretary General', studentId: 'SRC-EXEC-02', level: 'Level 300', stream: 'Evening Students', duties: 'Maintains SRC Assembly minutes, official circulars to Regular/Evening/Sandwich/Weekend streams, and student club registry.', strategicPlan: 'Digitize all SRC student petitions and streamline placement clearance communications.', howToHelpSchool: 'Bridge communication gaps between faculty lecturers, Evening/Weekend students, and the Registrar office.', termYear: '2026/2027', status: 'ACTIVE' },
    { id: `src_wcom_${tid}`, tenantId: tid, institutionType: 'UNIVERSITY', positionTitle: "SRC Women's Commissioner & Academic Welfare Rep", holderName: 'Elected Student Commissioner', studentId: 'SRC-EXEC-03', level: 'Level 300', stream: 'Weekend Students', duties: 'Champions female student empowerment, campus safety advocacy, and student academic/counseling support.', strategicPlan: 'Run STEM & Leadership mentorship seminars and emergency support grants for needy students.', howToHelpSchool: 'Promote harassment-free learning environments, high retention rates, and community outreach projects.', termYear: '2026/2027', status: 'ACTIVE' }
  ];
}

async function resolveScopedTier(req, allowedTiers = ['UNIVERSITY']) {
  const resolved = await resolveTenantInstitutionType({
    tenantId: req.tenantId || req.user?.tenantId,
    tenantCode: req.user?.tenantCode || req.user?.tenant?.code,
    user: req.user,
    req
  });
  const isAllTierRoute = req.institutionTierMode === 'ALL_TIERS';
  const permitted = isAllTierRoute ? allowedTiers : ['UNIVERSITY'];
  if (!permitted.includes(resolved)) {
    const needed = permitted.map((t) => getInstitutionProfile(t).shortLabel).join(' / ');
    throw new AppError(
      `Access Denied: This feature belongs strictly to ${needed} institutions. Active institution type is '${getInstitutionProfile(resolved).label}'.`,
      403
    );
  }
  return resolved;
}

function resolveTenantKey(req) {
  return String(req.tenantId || req.user?.tenantId || '1');
}

function matchesTierScope(item, tier) {
  if (!item.institutionType) return tier === 'UNIVERSITY';
  return String(item.institutionType).toUpperCase() === tier;
}

/* ==================== 1A & 1B. INTERNSHIPS & SEPARATE ATTACHMENTS ==================== */

function getPlacementStoreKey(kind) {
  return kind === 'ATTACHMENT' ? 'universityAttachments' : 'universityInternships';
}

async function listPlacementsByKind(req, kind = 'INTERNSHIP') {
  const allowed = kind === 'ATTACHMENT' ? PLACEMENT_ATTACHMENT_TIERS : ['UNIVERSITY'];
  await resolveScopedTier(req, allowed);
  const tid = resolveTenantKey(req);
  const store = readPersistentStore();
  const key = getPlacementStoreKey(kind);
  const list = (store[key] || []).filter((item) => String(item.tenantId || '1') === tid);
  const role = String(req.user?.role || '').toUpperCase();
  if (role === 'STUDENT') {
    const uEmail = String(req.user?.email || '').trim().toLowerCase();
    const uId = String(req.user?.id || '');
    return list.filter(
      (item) =>
        (uEmail && String(item.studentEmail || '').toLowerCase() === uEmail) ||
        (uId && String(item.userId || '') === uId) ||
        String(req.headers['x-system-mode'] || '').toUpperCase() === 'DEMO_SANDBOX'
    );
  }
  return list;
}

async function submitPlacementByKind(req, kind = 'INTERNSHIP') {
  const allowed = kind === 'ATTACHMENT' ? PLACEMENT_ATTACHMENT_TIERS : ['UNIVERSITY'];
  const tier = await resolveScopedTier(req, allowed);
  const body = req.body || {};
  const isAttachment = kind === 'ATTACHMENT';
  const label = isAttachment ? 'Attachment' : 'Internship';
  const companyName = String(body.companyName || body.hostInstitution || body.hostOrganization || '').trim();
  const companyAddress = String(body.companyAddress || body.hostAddress || '').trim();
  const supervisorName = String(body.supervisorName || body.fieldSupervisor || '').trim();
  const startDate = String(body.startDate || '').trim();
  const endDate = String(body.endDate || '').trim();

  if (!companyName || !supervisorName || !startDate || !endDate) {
    throw new AppError(
      `Host ${isAttachment ? 'Institution / Site' : 'Organization'}, ${isAttachment ? 'Field Supervisor' : 'Industry Supervisor'} Name, Start Date, and End Date are required for ${label}.`,
      400
    );
  }

  const tid = resolveTenantKey(req);
  const studentFullName =
    String(body.studentName || '').trim() ||
    `${req.user?.firstName || ''} ${req.user?.lastName || ''}`.trim() ||
    'Student';

  const record = {
    id: `${isAttachment ? 'ATT' : 'INT'}-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`,
    placementType: kind,
    tenantId: tid,
    institutionType: tier,
    userId: req.user?.id || null,
    studentId: body.studentId || req.user?.username || `STU-${req.user?.id || '01'}`,
    studentName: studentFullName,
    studentEmail: (body.studentEmail || req.user?.email || '').toLowerCase(),
    programme: body.programme || (tier === 'TECHNICAL' ? 'TVET Trade Programme' : 'B.Sc. / Undergraduate Degree'),
    courseCode: String(body.courseCode || '').trim(),
    level: body.level || (tier === 'TECHNICAL' ? 'TVET Level 2' : 'Level 300'),
    stream: body.stream || (tier === 'TECHNICAL' ? 'Regular Workshop Stream' : 'Regular Students'),
    companyName,
    hostInstitution: companyName,
    companyAddress: companyAddress || 'Registered Host Organization',
    hostAddress: companyAddress || 'Registered Host Organization',
    industrySector: body.industrySector || (isAttachment ? 'Field Practicum / Trade Workshop / Technical Unit' : 'Corporate / Engineering / Enterprise'),
    supervisorName,
    supervisorPhone: body.supervisorPhone || '',
    supervisorEmail: body.supervisorEmail || '',
    academicSupervisor: String(body.academicSupervisor || '').trim(),
    logbookHours: Number(body.logbookHours || 0) || 0,
    startDate,
    endDate,
    objectives: String(body.objectives || '').trim() || `Complete structured ${label.toLowerCase()} requirements.`,
    attachmentReportSummary: String(body.attachmentReportSummary || body.reportSummary || '').trim(),
    status: 'SUBMITTED',
    academicScore: null,
    supervisorScore: null,
    reportScore: null,
    finalScore: null,
    letterGrade: null,
    gradePoint: null,
    lecturerRemarks: null,
    gradedBy: null,
    gradedAt: null,
    createdAt: new Date().toISOString()
  };

  const storeKey = getPlacementStoreKey(kind);
  writePersistentStore((curr) => ({
    ...curr,
    [storeKey]: [record, ...(curr[storeKey] || [])].slice(0, 500)
  }));

  return record;
}

async function gradePlacementByKind(req, placementId, kind = 'INTERNSHIP') {
  const allowed = kind === 'ATTACHMENT' ? PLACEMENT_ATTACHMENT_TIERS : ['UNIVERSITY'];
  await resolveScopedTier(req, allowed);
  const body = req.body || {};
  const tid = resolveTenantKey(req);
  const isAttachment = kind === 'ATTACHMENT';
  const label = isAttachment ? 'Attachment' : 'Internship';
  const supervisorScore = body.supervisorScore != null ? Number(body.supervisorScore) : 80;
  const reportScore = body.reportScore != null ? Number(body.reportScore) : 80;
  const courseGradeScore = body.courseGradeScore != null ? Number(body.courseGradeScore) : null;

  const weighted =
    courseGradeScore != null
      ? Math.round((supervisorScore * 0.4 + reportScore * 0.4 + courseGradeScore * 0.2) * 10) / 10
      : Math.round((supervisorScore * 0.5 + reportScore * 0.5) * 10) / 10;

  const { letterGrade, gradePoint } = computeLetterAndPoint(weighted);
  const graderName = `${req.user?.firstName || ''} ${req.user?.lastName || ''}`.trim() || req.user?.role || 'Instructor';
  const storeKey = getPlacementStoreKey(kind);

  let updatedRecord = null;
  writePersistentStore((curr) => {
    const next = (curr[storeKey] || []).map((item) => {
      if (String(item.id) === String(placementId) && String(item.tenantId || '1') === tid) {
        updatedRecord = {
          ...item,
          supervisorScore,
          reportScore,
          academicScore: courseGradeScore,
          finalScore: weighted,
          letterGrade,
          gradePoint,
          lecturerRemarks: String(body.lecturerRemarks || '').trim() || `${label} evaluated and graded (${letterGrade}).`,
          attachmentReportSummary: body.attachmentReportSummary || item.attachmentReportSummary,
          status: body.status || 'GRADED',
          gradedBy: graderName,
          gradedAt: new Date().toISOString()
        };
        return updatedRecord;
      }
      return item;
    });
    return { ...curr, [storeKey]: next };
  });

  if (!updatedRecord) {
    throw new AppError(`${label} placement record not found for your institution.`, 404);
  }
  return updatedRecord;
}

const listInternships = (req) => listPlacementsByKind(req, 'INTERNSHIP');
const submitInternship = (req) => submitPlacementByKind(req, 'INTERNSHIP');
const gradeInternship = (req, internshipId) => gradePlacementByKind(req, internshipId, 'INTERNSHIP');

const listAttachments = (req) => listPlacementsByKind(req, 'ATTACHMENT');
const submitAttachment = (req) => submitPlacementByKind(req, 'ATTACHMENT');
const gradeAttachment = (req, attachmentId) => gradePlacementByKind(req, attachmentId, 'ATTACHMENT');

/* ==================== 2. INSTITUTION STREAMS & HOUSES ==================== */

async function listStreams(req) {
  const tier = await resolveScopedTier(req, ALL_TIERS);
  const tid = resolveTenantKey(req);
  const store = readPersistentStore();
  let streams = (store.universityStreams || []).filter((s) => String(s.tenantId || '1') === tid && matchesTierScope(s, tier));
  if (streams.length === 0) {
    streams = getStarterStreamsByTier(tid, tier);
    writePersistentStore((curr) => ({
      ...curr,
      universityStreams: [...streams, ...(curr.universityStreams || [])]
    }));
  }
  return streams;
}

async function createStream(req) {
  const tier = await resolveScopedTier(req, ALL_TIERS);
  const body = req.body || {};
  const streamName = String(body.streamName || '').trim();
  if (!streamName) throw new AppError('Stream or house name is required.', 400);
  const tid = resolveTenantKey(req);

  const record = {
    id: `stream_${Date.now()}`,
    tenantId: tid,
    institutionType: tier,
    streamCode: String(body.streamCode || streamName.split(' ')[0]).toUpperCase().replace(/[^A-Z0-9_]/g, '').slice(0, 16),
    streamName,
    scheduleSummary: String(body.scheduleSummary || `${getInstitutionProfile(tier).shortLabel} Academic Schedule`).trim(),
    coordinator: String(body.coordinator || 'Academic Coordinator').trim(),
    feePolicyNote: String(body.feePolicyNote || 'Standard Institutional Schedule').trim(),
    activeStudentsCount: Math.max(0, parseInt(body.activeStudentsCount || 0, 10)),
    status: 'ACTIVE',
    createdAt: new Date().toISOString()
  };

  writePersistentStore((curr) => ({
    ...curr,
    universityStreams: [record, ...(curr.universityStreams || [])]
  }));
  return record;
}

/* ==================== 3. STUDENT GOVERNANCE (PREFECTS / SRC POSITIONS) ==================== */

async function listGovernanceRoles(req) {
  const tier = await resolveScopedTier(req, ALL_TIERS);
  const tid = resolveTenantKey(req);
  const store = readPersistentStore();
  let roles = (store.universityGovernanceRoles || []).filter((g) => String(g.tenantId || '1') === tid && matchesTierScope(g, tier));
  if (roles.length === 0) {
    roles = getStarterGovernanceByTier(tid, tier);
    writePersistentStore((curr) => ({
      ...curr,
      universityGovernanceRoles: [...roles, ...(curr.universityGovernanceRoles || [])]
    }));
  }
  return roles;
}

async function createGovernanceRole(req) {
  const tier = await resolveScopedTier(req, ALL_TIERS);
  const body = req.body || {};
  const positionTitle = String(body.positionTitle || '').trim();
  const holderName = String(body.holderName || '').trim();
  const duties = String(body.duties || '').trim();
  const howToHelpSchool = String(body.howToHelpSchool || body.strategicPlan || '').trim();

  if (!positionTitle || !holderName || !duties) {
    throw new AppError('Position Title, Student Holder Name, and Duties are required.', 400);
  }

  const tid = resolveTenantKey(req);
  const defaultLevel = (TIER_LEVEL_LADDERS[tier] || ['Level 300']).slice(-1)[0];
  const record = {
    id: `gov_${Date.now()}`,
    tenantId: tid,
    institutionType: tier,
    positionTitle,
    holderName,
    studentId: String(body.studentId || `REP-${Math.floor(100 + Math.random() * 900)}`).trim(),
    level: String(body.level || defaultLevel).trim(),
    stream: String(body.stream || 'Regular Students').trim(),
    duties,
    strategicPlan: String(body.strategicPlan || howToHelpSchool).trim(),
    howToHelpSchool,
    termYear: String(body.termYear || '2026/2027').trim(),
    status: 'ACTIVE',
    createdAt: new Date().toISOString()
  };

  writePersistentStore((curr) => ({
    ...curr,
    universityGovernanceRoles: [record, ...(curr.universityGovernanceRoles || [])].slice(0, 200)
  }));
  return record;
}

async function deleteGovernanceRole(req, id) {
  await resolveScopedTier(req, ALL_TIERS);
  const tid = resolveTenantKey(req);
  let removed = false;
  writePersistentStore((curr) => {
    const next = (curr.universityGovernanceRoles || []).filter((item) => {
      const match = String(item.id) === String(id) && String(item.tenantId || '1') === tid;
      if (match) removed = true;
      return !match;
    });
    return { ...curr, universityGovernanceRoles: next };
  });
  if (!removed) throw new AppError('Student governance record not found.', 404);
  return { deleted: true, id };
}

/* ==================== 4. TIER-ADAPTIVE EXAMS, RESULTS PASS -> LEVEL PROGRESSION -> GRADUATION ==================== */

async function listUniversityExams(req) {
  const tier = await resolveScopedTier(req, ALL_TIERS);
  const tid = resolveTenantKey(req);
  const store = readPersistentStore();
  return (store.universityExams || []).filter((e) => String(e.tenantId || '1') === tid && matchesTierScope(e, tier));
}

async function createUniversityExam(req) {
  const tier = await resolveScopedTier(req, ALL_TIERS);
  const body = req.body || {};
  const courseCode = String(body.courseCode || '').trim().toUpperCase();
  const courseTitle = String(body.courseTitle || '').trim();
  if (!courseCode || !courseTitle) {
    throw new AppError('Subject / Course Code and Title are required for exam setup.', 400);
  }
  const tid = resolveTenantKey(req);
  const lecturerName = `${req.user?.firstName || ''} ${req.user?.lastName || ''}`.trim() || getInstitutionProfile(tier).facultyRoleTitle;
  const defaultTarget = (TIER_LEVEL_LADDERS[tier] || ['Level 100'])[0];
  const exam = {
    id: `EXM-${Date.now()}`,
    tenantId: tid,
    institutionType: tier,
    courseCode,
    courseTitle,
    creditHours: Math.max(1, parseInt(body.creditHours || 3, 10)),
    targetLevel: String(body.targetLevel || defaultTarget),
    semester: String(body.semester || (tier === 'NURSERY_TO_JHS' ? 'Term 1' : 'Semester 1')),
    stream: String(body.stream || 'All Streams'),
    passMark: Math.max(40, Math.min(80, Number(body.passMark || 50))),
    examDate: body.examDate || new Date().toISOString().slice(0, 10),
    instructions: String(body.instructions || 'Answer all mandatory sections cleanly.').trim(),
    questions: Array.isArray(body.questions) ? body.questions : [],
    setByLecturer: lecturerName,
    status: 'PUBLISHED',
    createdAt: new Date().toISOString()
  };

  writePersistentStore((curr) => ({
    ...curr,
    universityExams: [exam, ...(curr.universityExams || [])].slice(0, 300)
  }));
  return exam;
}

async function listCourseResults(req) {
  const tier = await resolveScopedTier(req, ALL_TIERS);
  const tid = resolveTenantKey(req);
  const store = readPersistentStore();
  const list = (store.universityCourseResults || []).filter((r) => String(r.tenantId || '1') === tid && matchesTierScope(r, tier));
  const role = String(req.user?.role || '').toUpperCase();
  const results =
    role === 'STUDENT' && String(req.headers['x-system-mode'] || '').toUpperCase() !== 'DEMO_SANDBOX'
      ? list.filter((r) => String(r.studentEmail || '').toLowerCase() === String(req.user?.email || '').toLowerCase())
      : list;

  let totalPoints = 0;
  let totalCredits = 0;
  results.forEach((r) => {
    const c = Number(r.creditHours || 3);
    totalCredits += c;
    totalPoints += (Number(r.gradePoint) || 0) * c;
  });
  const cgpa = totalCredits > 0 ? Math.round((totalPoints / totalCredits) * 100) / 100 : 0;
  const graduations = (store.universityGraduations || []).filter((g) => String(g.tenantId || '1') === tid && matchesTierScope(g, tier));

  return { results, cgpa, totalCredits, graduations };
}

async function recordCourseResult(req) {
  const tier = await resolveScopedTier(req, ALL_TIERS);
  const body = req.body || {};
  const studentName = String(body.studentName || '').trim();
  const studentEmail = String(body.studentEmail || '').trim().toLowerCase();
  const courseCode = String(body.courseCode || '').trim().toUpperCase();
  const courseTitle = String(body.courseTitle || '').trim();
  const passMark = Number(body.passMark || 50);

  if (!studentName || !courseCode) {
    throw new AppError('Student Name and Subject / Course Code are required to publish exam results.', 400);
  }

  const { score, letterGrade, gradePoint } = computeLetterAndPoint(body.score);
  const passed = score >= passMark;
  const tid = resolveTenantKey(req);
  const lecturerName = `${req.user?.firstName || ''} ${req.user?.lastName || ''}`.trim() || getInstitutionProfile(tier).facultyRoleTitle;
  const defaultLevel = (TIER_LEVEL_LADDERS[tier] || ['Level 100'])[0];

  const resultRecord = {
    id: `RES-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`,
    tenantId: tid,
    institutionType: tier,
    examId: body.examId || null,
    studentId: body.studentId || studentEmail || `STU-${Date.now().toString().slice(-4)}`,
    studentName,
    studentEmail: studentEmail || null,
    level: String(body.level || defaultLevel),
    stream: String(body.stream || 'Regular'),
    courseCode,
    courseTitle: courseTitle || courseCode,
    creditHours: Math.max(1, parseInt(body.creditHours || 3, 10)),
    score,
    passMark,
    letterGrade,
    gradePoint,
    passed,
    status: passed ? 'PASSED' : 'RESIT_REQUIRED',
    remarks: String(body.remarks || (passed ? 'Passed — Eligible for Level Progression' : 'Score below pass mark — Resit required')).trim(),
    gradedBy: lecturerName,
    createdAt: new Date().toISOString()
  };

  writePersistentStore((curr) => ({
    ...curr,
    universityCourseResults: [resultRecord, ...(curr.universityCourseResults || [])].slice(0, 1000)
  }));
  return resultRecord;
}

async function advanceOrGraduateStudent(req) {
  const tier = await resolveScopedTier(req, ALL_TIERS);
  const body = req.body || {};
  const studentEmail = String(body.studentEmail || '').trim().toLowerCase();
  const studentName = String(body.studentName || '').trim() || studentEmail;
  const levelSteps = TIER_LEVEL_LADDERS[tier] || TIER_LEVEL_LADDERS.UNIVERSITY;
  const finalLevel = levelSteps[levelSteps.length - 1];
  const currentLevel = String(body.currentLevel || finalLevel);
  const action = String(body.action || (currentLevel.toUpperCase() === finalLevel.toUpperCase() ? 'GRADUATE' : 'ADVANCE')).toUpperCase();
  const tid = resolveTenantKey(req);

  const currentIdx = levelSteps.findIndex((l) => currentLevel.toUpperCase().includes(l.toUpperCase()));
  const nextLevel =
    action === 'GRADUATE'
      ? 'GRADUATED_ALUMNI'
      : currentIdx >= 0 && currentIdx < levelSteps.length - 1
        ? levelSteps[currentIdx + 1]
        : 'GRADUATED_ALUMNI';

  const store = readPersistentStore();
  const studentResults = (store.universityCourseResults || []).filter(
    (r) =>
      String(r.tenantId || '1') === tid &&
      matchesTierScope(r, tier) &&
      ((studentEmail && String(r.studentEmail || '').toLowerCase() === studentEmail) ||
        (studentName && String(r.studentName || '').toLowerCase() === studentName.toLowerCase()))
  );

  const failedCourses = studentResults.filter((r) => !r.passed);
  if (failedCourses.length > 0 && !body.overrideProgression) {
    throw new AppError(
      `Cannot advance/graduate ${studentName}: ${failedCourses.length} assessment(s) require pass/resit clearance (${failedCourses.map((f) => f.courseCode).join(', ')}).`,
      400
    );
  }

  let totalPts = 0;
  let totalCred = 0;
  studentResults.forEach((r) => {
    const c = Number(r.creditHours || 3);
    totalCred += c;
    totalPts += (Number(r.gradePoint) || 0) * c;
  });
  const cgpa = body.cgpa != null ? Number(body.cgpa) : totalCred > 0 ? Math.round((totalPts / totalCred) * 100) / 100 : 3.5;

  const lecturerName = `${req.user?.firstName || ''} ${req.user?.lastName || ''}`.trim() || getInstitutionProfile(tier).leadershipRoleTitle;

  if (nextLevel === 'GRADUATED_ALUMNI') {
    const gradRecord = {
      id: `GRAD-${Date.now()}`,
      certificateNumber: `GBS-${tier.slice(0, 4)}-${new Date().getFullYear()}-${Math.floor(10000 + Math.random() * 89999)}`,
      tenantId: tid,
      institutionType: tier,
      studentId: body.studentId || studentEmail || `STU-${Date.now()}`,
      studentName,
      studentEmail: studentEmail || null,
      programme: body.programme || getInstitutionProfile(tier).label,
      stream: body.stream || 'Regular',
      cgpa,
      honoursClass: classifyHonours(cgpa, tier),
      clearedBy: lecturerName,
      status: 'GRADUATED_ALUMNI',
      graduatedAt: new Date().toISOString()
    };

    if (studentEmail) {
      try {
        const dbStudent = await prisma.user.findFirst({ where: { email: studentEmail, isDeleted: false } });
        if (dbStudent) {
          await prisma.user.update({
            where: { id: dbStudent.id },
            data: { role: 'ALUMNI', isActive: true }
          });
        }
      } catch { }
    }

    writePersistentStore((curr) => {
      const updateRole = (arr) =>
        (arr || []).map((u) =>
          u && studentEmail && String(u.email || '').toLowerCase() === studentEmail
            ? { ...u, role: 'ALUMNI', graduatedAt: gradRecord.graduatedAt, level: 'GRADUATED', status: 'ACTIVE' }
            : u
        );
      return {
        ...curr,
        registeredUsers: updateRole(curr.registeredUsers),
        users: updateRole(curr.users),
        universityGraduations: [gradRecord, ...(curr.universityGraduations || [])].slice(0, 500)
      };
    });

    return {
      outcome: 'GRADUATED_TO_ALUMNI',
      message: `${studentName} has passed all requirements (${gradRecord.honoursClass}, Score Index ${cgpa.toFixed(2)}) and has graduated to Alumni status.`,
      graduation: gradRecord
    };
  }

  return {
    outcome: 'LEVEL_ADVANCED',
    studentName,
    studentEmail,
    previousLevel: currentLevel,
    newLevel: nextLevel,
    cgpa,
    approvedBy: lecturerName,
    message: `${studentName} passed evaluations and advanced from ${currentLevel} to ${nextLevel}.`
  };
}

module.exports = {
  getInstitutionProfileSummary: async (req) => {
    const type = await resolveTenantInstitutionType({
      tenantId: req.tenantId || req.user?.tenantId,
      tenantCode: req.user?.tenantCode || req.user?.tenant?.code,
      user: req.user,
      req
    });
    return {
      institutionType: normalizeInstitutionType(type),
      profile: getInstitutionProfile(type)
    };
  },
  listInternships,
  submitInternship,
  gradeInternship,
  listAttachments,
  submitAttachment,
  gradeAttachment,
  listStreams,
  createStream,
  listGovernanceRoles,
  createGovernanceRole,
  deleteGovernanceRole,
  listUniversityExams,
  createUniversityExam,
  listCourseResults,
  recordCourseResult,
  advanceOrGraduateStudent
};
