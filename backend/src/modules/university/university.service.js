'use strict';

const prisma = require('../../core/database/prisma.client');
const { readPersistentStore, writePersistentStore } = require('../../core/database/persistentStore');
const { AppError } = require('../../middleware/error.middleware');
const {
  resolveTenantInstitutionType,
  getInstitutionProfile,
  normalizeInstitutionType
} = require('../../utils/institutionProfiles');

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

function computeLetterAndPoint(rawScore) {
  const score = Math.max(0, Math.min(100, Number(rawScore) || 0));
  const match = GRADE_SCALE.find((g) => score >= g.min) || GRADE_SCALE[GRADE_SCALE.length - 1];
  return { score, letterGrade: match.letter, gradePoint: match.point };
}

function classifyHonours(cgpa) {
  const g = Number(cgpa) || 0;
  if (g >= 3.6) return 'First Class Honours';
  if (g >= 3.0) return 'Second Class Honours (Upper Division)';
  if (g >= 2.0) return 'Second Class Honours (Lower Division)';
  if (g >= 1.5) return 'Third Class Honours';
  return 'Pass';
}

function getDefaultUniversityStreams(tenantId) {
  const tid = Number(tenantId) || 1;
  return [
    {
      id: `stream_reg_${tid}`,
      tenantId: tid,
      streamCode: 'REGULAR',
      streamName: 'Regular Students',
      scheduleSummary: 'Monday – Friday • 7:30 AM – 4:30 PM (Full-Time Daytime)',
      coordinator: 'Office of Academic Affairs (Regular)',
      feePolicyNote: 'Standard Full-Time Semester Schedule',
      activeStudentsCount: 0,
      status: 'ACTIVE'
    },
    {
      id: `stream_eve_${tid}`,
      tenantId: tid,
      streamCode: 'EVENING',
      streamName: 'Evening Students',
      scheduleSummary: 'Monday – Friday • 5:30 PM – 9:00 PM (Working Professionals)',
      coordinator: 'Evening & Executive Studies Coordinator',
      feePolicyNote: 'Evening Semester Tuition Schedule',
      activeStudentsCount: 0,
      status: 'ACTIVE'
    },
    {
      id: `stream_snd_${tid}`,
      tenantId: tid,
      streamCode: 'SANDWICH',
      streamName: 'Sandwich Students',
      scheduleSummary: 'Intensive Vacation Blocks (June – August / December)',
      coordinator: 'Sandwich & Continuing Education Directorate',
      feePolicyNote: 'Modular Block Session Billing',
      activeStudentsCount: 0,
      status: 'ACTIVE'
    },
    {
      id: `stream_wkd_${tid}`,
      tenantId: tid,
      streamCode: 'WEEKEND',
      streamName: 'Weekend Students',
      scheduleSummary: 'Fridays 5:30 PM – 8:30 PM • Saturdays & Sundays 8:00 AM – 5:00 PM',
      coordinator: 'Weekend School Directorate',
      feePolicyNote: 'Weekend Modular Semester Billing',
      activeStudentsCount: 0,
      status: 'ACTIVE'
    }
  ];
}

function getStarterGovernanceRoles(tenantId) {
  const tid = Number(tenantId) || 1;
  return [
    {
      id: `src_pres_${tid}`,
      tenantId: tid,
      positionTitle: 'SRC President (Student Representative Council)',
      holderName: 'Appointed / Elected Student Representative',
      studentId: 'SRC-EXEC-01',
      level: 'Level 400',
      stream: 'Regular Students',
      duties: 'Chairs the SRC Executive Council, represents all student streams in University Senate, and oversees student welfare initiatives.',
      strategicPlan: 'Expand digital learning labs, host quarterly career fairs, and strengthen campus shuttle schedules.',
      howToHelpSchool: 'Partner with University Management to maintain exam readiness, hostel security, and peer mentorship across Level 100-400.',
      termYear: '2026/2027',
      status: 'ACTIVE'
    },
    {
      id: `src_sec_${tid}`,
      tenantId: tid,
      positionTitle: 'SRC General Secretary',
      holderName: 'Elected Secretary General',
      studentId: 'SRC-EXEC-02',
      level: 'Level 300',
      stream: 'Evening Students',
      duties: 'Maintains SRC Assembly minutes, official circulars to Regular/Evening/Sandwich/Weekend streams, and student club registry.',
      strategicPlan: 'Digitize all SRC student petitions and streamline internship placement clearance communications.',
      howToHelpSchool: 'Bridge communication gaps between faculty lecturers, Evening/Weekend students, and the Registrar office.',
      termYear: '2026/2027',
      status: 'ACTIVE'
    },
    {
      id: `src_wcom_${tid}`,
      tenantId: tid,
      positionTitle: "SRC Women's Commissioner & Academic Welfare Rep",
      holderName: 'Elected Student Commissioner',
      studentId: 'SRC-EXEC-03',
      level: 'Level 300',
      stream: 'Weekend Students',
      duties: 'Champions female student empowerment, campus safety advocacy, and student academic/counseling support.',
      strategicPlan: 'Run STEM & Leadership mentorship seminars and emergency support grants for needy students.',
      howToHelpSchool: 'Promote harassment-free learning environments, high retention rates, and community outreach projects.',
      termYear: '2026/2027',
      status: 'ACTIVE'
    }
  ];
}

async function ensureUniversityTenant(req) {
  const resolved = await resolveTenantInstitutionType({
    tenantId: req.tenantId || req.user?.tenantId,
    tenantCode: req.user?.tenantCode || req.user?.tenant?.code,
    user: req.user,
    req
  });
  if (resolved !== 'UNIVERSITY') {
    throw new AppError(
      `Access Denied: This feature belongs strictly to University Institutions. Active institution type is '${getInstitutionProfile(resolved).label}'.`,
      403
    );
  }
  return resolved;
}

function resolveTenantKey(req) {
  return String(req.tenantId || req.user?.tenantId || '1');
}

/* ==================== 1A & 1B. UNIVERSITY INTERNSHIPS & SEPARATE ATTACHMENTS ==================== */

function getPlacementStoreKey(kind) {
  return kind === 'ATTACHMENT' ? 'universityAttachments' : 'universityInternships';
}

async function listPlacementsByKind(req, kind = 'INTERNSHIP') {
  await ensureUniversityTenant(req);
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
  await ensureUniversityTenant(req);
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
    'University Student';

  const record = {
    id: `${isAttachment ? 'ATT' : 'INT'}-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`,
    placementType: kind,
    tenantId: tid,
    institutionType: 'UNIVERSITY',
    userId: req.user?.id || null,
    studentId: body.studentId || req.user?.username || `UNI-${req.user?.id || '01'}`,
    studentName: studentFullName,
    studentEmail: (body.studentEmail || req.user?.email || '').toLowerCase(),
    programme: body.programme || 'B.Sc. / Undergraduate Degree',
    courseCode: String(body.courseCode || '').trim(),
    level: body.level || 'Level 300',
    stream: body.stream || 'Regular Students',
    companyName,
    hostInstitution: companyName,
    companyAddress: companyAddress || 'Registered Host Organization',
    hostAddress: companyAddress || 'Registered Host Organization',
    industrySector: body.industrySector || (isAttachment ? 'Field Practicum / Clinical / Technical Unit' : 'Corporate / Engineering / Enterprise'),
    supervisorName,
    supervisorPhone: body.supervisorPhone || '',
    supervisorEmail: body.supervisorEmail || '',
    academicSupervisor: String(body.academicSupervisor || '').trim(),
    logbookHours: Number(body.logbookHours || 0) || 0,
    startDate,
    endDate,
    objectives: String(body.objectives || '').trim() || `Complete structured university ${label.toLowerCase()} requirements.`,
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
  await ensureUniversityTenant(req);
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
  const graderName = `${req.user?.firstName || ''} ${req.user?.lastName || ''}`.trim() || req.user?.role || 'Lecturer';
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
    throw new AppError(`${label} placement record not found for your university.`, 404);
  }
  return updatedRecord;
}

const listInternships = (req) => listPlacementsByKind(req, 'INTERNSHIP');
const submitInternship = (req) => submitPlacementByKind(req, 'INTERNSHIP');
const gradeInternship = (req, internshipId) => gradePlacementByKind(req, internshipId, 'INTERNSHIP');

const listAttachments = (req) => listPlacementsByKind(req, 'ATTACHMENT');
const submitAttachment = (req) => submitPlacementByKind(req, 'ATTACHMENT');
const gradeAttachment = (req, attachmentId) => gradePlacementByKind(req, attachmentId, 'ATTACHMENT');

/* ==================== 2. UNIVERSITY STREAMS ==================== */

async function listStreams(req) {
  await ensureUniversityTenant(req);
  const tid = resolveTenantKey(req);
  const store = readPersistentStore();
  let streams = (store.universityStreams || []).filter((s) => String(s.tenantId || '1') === tid);
  if (streams.length === 0) {
    streams = getDefaultUniversityStreams(tid);
    writePersistentStore((curr) => ({
      ...curr,
      universityStreams: [...streams, ...(curr.universityStreams || [])]
    }));
  }
  return streams;
}

async function createStream(req) {
  await ensureUniversityTenant(req);
  const body = req.body || {};
  const streamName = String(body.streamName || '').trim();
  if (!streamName) throw new AppError('Stream name is required (e.g. Regular Students, Evening Students).', 400);
  const tid = resolveTenantKey(req);

  const record = {
    id: `stream_${Date.now()}`,
    tenantId: tid,
    streamCode: String(body.streamCode || streamName.split(' ')[0]).toUpperCase().replace(/[^A-Z0-9_]/g, '').slice(0, 16),
    streamName,
    scheduleSummary: String(body.scheduleSummary || 'University Academic Timetable').trim(),
    coordinator: String(body.coordinator || 'Academic Coordinator').trim(),
    feePolicyNote: String(body.feePolicyNote || 'Standard University Stream Billing').trim(),
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

/* ==================== 3. UNIVERSITY STUDENT GOVERNANCE (SRC & POSITIONS) ==================== */

async function listGovernanceRoles(req) {
  await ensureUniversityTenant(req);
  const tid = resolveTenantKey(req);
  const store = readPersistentStore();
  let roles = (store.universityGovernanceRoles || []).filter((g) => String(g.tenantId || '1') === tid);
  if (roles.length === 0) {
    roles = getStarterGovernanceRoles(tid);
    writePersistentStore((curr) => ({
      ...curr,
      universityGovernanceRoles: [...roles, ...(curr.universityGovernanceRoles || [])]
    }));
  }
  return roles;
}

async function createGovernanceRole(req) {
  await ensureUniversityTenant(req);
  const body = req.body || {};
  const positionTitle = String(body.positionTitle || '').trim();
  const holderName = String(body.holderName || '').trim();
  const duties = String(body.duties || '').trim();
  const howToHelpSchool = String(body.howToHelpSchool || body.strategicPlan || '').trim();

  if (!positionTitle || !holderName || !duties) {
    throw new AppError('Position Title, Student Holder Name, and Duties are required.', 400);
  }

  const tid = resolveTenantKey(req);
  const record = {
    id: `src_${Date.now()}`,
    tenantId: tid,
    positionTitle,
    holderName,
    studentId: String(body.studentId || `SRC-${Math.floor(100 + Math.random() * 900)}`).trim(),
    level: String(body.level || 'Level 300').trim(),
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
  await ensureUniversityTenant(req);
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

/* ==================== 4. LECTURER EXAMS, RESULTS PASS -> LEVEL PROGRESSION -> GRADUATION TO ALUMNI ==================== */

async function listUniversityExams(req) {
  await ensureUniversityTenant(req);
  const tid = resolveTenantKey(req);
  const store = readPersistentStore();
  return (store.universityExams || []).filter((e) => String(e.tenantId || '1') === tid);
}

async function createUniversityExam(req) {
  await ensureUniversityTenant(req);
  const body = req.body || {};
  const courseCode = String(body.courseCode || '').trim().toUpperCase();
  const courseTitle = String(body.courseTitle || '').trim();
  if (!courseCode || !courseTitle) {
    throw new AppError('Course Code and Course Title are required for University exam setup.', 400);
  }
  const tid = resolveTenantKey(req);
  const lecturerName = `${req.user?.firstName || ''} ${req.user?.lastName || ''}`.trim() || 'University Lecturer';
  const exam = {
    id: `UEXM-${Date.now()}`,
    tenantId: tid,
    courseCode,
    courseTitle,
    creditHours: Math.max(1, parseInt(body.creditHours || 3, 10)),
    targetLevel: String(body.targetLevel || 'Level 100'),
    semester: String(body.semester || 'Semester 1'),
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
  await ensureUniversityTenant(req);
  const tid = resolveTenantKey(req);
  const store = readPersistentStore();
  const list = (store.universityCourseResults || []).filter((r) => String(r.tenantId || '1') === tid);
  const role = String(req.user?.role || '').toUpperCase();
  const results =
    role === 'STUDENT' && String(req.headers['x-system-mode'] || '').toUpperCase() !== 'DEMO_SANDBOX'
      ? list.filter((r) => String(r.studentEmail || '').toLowerCase() === String(req.user?.email || '').toLowerCase())
      : list;

  // Compute CGPA summary
  let totalPoints = 0;
  let totalCredits = 0;
  results.forEach((r) => {
    const c = Number(r.creditHours || 3);
    totalCredits += c;
    totalPoints += (Number(r.gradePoint) || 0) * c;
  });
  const cgpa = totalCredits > 0 ? Math.round((totalPoints / totalCredits) * 100) / 100 : 0;
  const graduations = (store.universityGraduations || []).filter((g) => String(g.tenantId || '1') === tid);

  return { results, cgpa, totalCredits, graduations };
}

async function recordCourseResult(req) {
  await ensureUniversityTenant(req);
  const body = req.body || {};
  const studentName = String(body.studentName || '').trim();
  const studentEmail = String(body.studentEmail || '').trim().toLowerCase();
  const courseCode = String(body.courseCode || '').trim().toUpperCase();
  const courseTitle = String(body.courseTitle || '').trim();
  const passMark = Number(body.passMark || 50);

  if (!studentName || !courseCode) {
    throw new AppError('Student Name and Course Code are required to publish course exam results.', 400);
  }

  const { score, letterGrade, gradePoint } = computeLetterAndPoint(body.score);
  const passed = score >= passMark;
  const tid = resolveTenantKey(req);
  const lecturerName = `${req.user?.firstName || ''} ${req.user?.lastName || ''}`.trim() || 'University Lecturer';

  const resultRecord = {
    id: `URES-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`,
    tenantId: tid,
    examId: body.examId || null,
    studentId: body.studentId || studentEmail || `UNI-${Date.now().toString().slice(-4)}`,
    studentName,
    studentEmail: studentEmail || null,
    level: String(body.level || 'Level 100'),
    stream: String(body.stream || 'Regular Students'),
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
  await ensureUniversityTenant(req);
  const body = req.body || {};
  const studentEmail = String(body.studentEmail || '').trim().toLowerCase();
  const studentName = String(body.studentName || '').trim() || studentEmail;
  const currentLevel = String(body.currentLevel || 'Level 400');
  const action = String(body.action || (currentLevel.includes('400') ? 'GRADUATE' : 'ADVANCE')).toUpperCase();
  const tid = resolveTenantKey(req);

  const levelSteps = ['Level 100', 'Level 200', 'Level 300', 'Level 400'];
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
      ((studentEmail && String(r.studentEmail || '').toLowerCase() === studentEmail) ||
        (studentName && String(r.studentName || '').toLowerCase() === studentName.toLowerCase()))
  );

  const failedCourses = studentResults.filter((r) => !r.passed);
  if (failedCourses.length > 0 && !body.overrideProgression) {
    throw new AppError(
      `Cannot advance/graduate ${studentName}: ${failedCourses.length} course(s) require pass/resit clearance (${failedCourses.map((f) => f.courseCode).join(', ')}).`,
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

  const lecturerName = `${req.user?.firstName || ''} ${req.user?.lastName || ''}`.trim() || 'University Senate / Lecturer';

  if (nextLevel === 'GRADUATED_ALUMNI') {
    const gradRecord = {
      id: `GRAD-${Date.now()}`,
      certificateNumber: `GBS-DEG-${new Date().getFullYear()}-${Math.floor(10000 + Math.random() * 89999)}`,
      tenantId: tid,
      studentId: body.studentId || studentEmail || `STU-${Date.now()}`,
      studentName,
      studentEmail: studentEmail || null,
      programme: body.programme || 'Bachelor Honours Degree',
      stream: body.stream || 'Regular Students',
      cgpa,
      honoursClass: classifyHonours(cgpa),
      clearedBy: lecturerName,
      status: 'GRADUATED_ALUMNI',
      graduatedAt: new Date().toISOString()
    };

    // Promote user in PostgreSQL to ALUMNI if email matches
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
      message: `${studentName} has passed all requirements (${gradRecord.honoursClass}, CGPA ${cgpa.toFixed(2)}) and has graduated to Alumni status.`,
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
    message: `${studentName} passed course evaluations (CGPA ${cgpa.toFixed(2)}) and advanced from ${currentLevel} to ${nextLevel}.`
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
