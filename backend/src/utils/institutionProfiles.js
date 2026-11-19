'use strict';

const prisma = require('../core/database/prisma.client');
const { readPersistentStore } = require('../core/database/persistentStore');

const INSTITUTION_ROLE_PROFILES = {
  NURSERY_TO_JHS: {
    id: 'NURSERY_TO_JHS',
    code: 'BASIC_JHS',
    label: 'Nursery / Primary / JHS Institution',
    shortLabel: 'Nursery – JHS',
    leadershipRoleTitle: 'Headmaster / Headmistress',
    facultyRoleTitle: 'Class & Subject Teacher',
    studentRoleTitle: 'Pupil / JHS Student',
    academicTermLabel: 'Term (Term 1 – 3)',
    gradingSystem: 'Continuous Assessment & BECE Readiness',
    studentGovernanceTitle: 'Class Captains & School Prefects',
    features: {
      universityOnlyFeatures: false,
      internshipsPortal: false,
      universityStreams: false,
      universitySRC: false,
      lecturerGraduationToAlumni: false,
      technicalPracticals: false,
      prefectsSystem: true
    },
    operatingSummary:
      'Operates Creche, Nursery, KG, Primary 1-6, and JHS 1-3 classes across 3 annual terms with BECE preparation.'
  },
  SENIOR_HIGH_SCHOOL: {
    id: 'SENIOR_HIGH_SCHOOL',
    code: 'SHS',
    label: 'Senior High School (SHS)',
    shortLabel: 'Senior High (SHS)',
    leadershipRoleTitle: 'Headmaster / Principal',
    facultyRoleTitle: 'Subject Tutor / Housemaster',
    studentRoleTitle: 'SHS Student',
    academicTermLabel: 'SHS Form / Semester (WASSCE)',
    gradingSystem: 'WASSCE Aggregate & Core/Elective Tracks',
    studentGovernanceTitle: 'Student Prefect Council (Head Boy/Girl & House Captains)',
    features: {
      universityOnlyFeatures: false,
      internshipsPortal: false,
      universityStreams: false,
      universitySRC: false,
      lecturerGraduationToAlumni: false,
      technicalPracticals: false,
      prefectsSystem: true
    },
    operatingSummary:
      'Operates SHS Form 1-3 across Science, Business, General Arts, Visual Arts, and Home Economics tracks.'
  },
  TECHNICAL: {
    id: 'TECHNICAL',
    code: 'TECHNICAL_TVET',
    label: 'Technical & Vocational Institute (TVET)',
    shortLabel: 'Technical / TVET',
    leadershipRoleTitle: 'Principal / TVET Rector',
    facultyRoleTitle: 'Workshop Instructor / Trade Lecturer',
    studentRoleTitle: 'Technical Trainee / Apprentice',
    academicTermLabel: 'Trade Module / CBT Level',
    gradingSystem: 'CBT Competency & Workshop Practicals',
    studentGovernanceTitle: 'Workshop Captains & Trainee Representatives',
    features: {
      universityOnlyFeatures: false,
      internshipsPortal: false,
      universityStreams: false,
      universitySRC: false,
      lecturerGraduationToAlumni: false,
      technicalPracticals: true,
      prefectsSystem: true
    },
    operatingSummary:
      'Operates Trade Programmes (Electrical, Mechanical, ICT, Building, Catering) with Workshop Practicals & CBT assessments.'
  },
  UNIVERSITY: {
    id: 'UNIVERSITY',
    code: 'UNIVERSITY',
    label: 'University / Tertiary Institution',
    shortLabel: 'University / College',
    leadershipRoleTitle: 'Vice Chancellor / Registrar / Provost',
    facultyRoleTitle: 'University Lecturer / Professor',
    studentRoleTitle: 'Undergraduate / Postgraduate Student',
    academicTermLabel: 'Semester • Credits • Level 100 – 400+',
    gradingSystem: 'Credit-Weighted GPA / CGPA & Honours Classification',
    studentGovernanceTitle: 'SRC Representatives & Student Governance Manifestos',
    streams: ['Regular Students', 'Evening Students', 'Sandwich Students', 'Weekend Students'],
    features: {
      universityOnlyFeatures: true,
      internshipsPortal: true,
      universityStreams: true,
      universitySRC: true,
      lecturerGraduationToAlumni: true,
      technicalPracticals: false,
      prefectsSystem: false
    },
    operatingSummary:
      'Operates Faculties & Departments, Regular/Evening/Sandwich/Weekend Streams, SRC Leadership, University Internships & Grading, and Exam-Pass Graduation to Alumni.'
  }
};

function normalizeInstitutionType(rawType) {
  const s = String(rawType || '').trim().toUpperCase();
  if (!s) return 'NURSERY_TO_JHS';
  if (s.includes('UNIV') || s.includes('TERTIARY') || s.includes('COLLEGE')) return 'UNIVERSITY';
  if (s.includes('TECH') || s.includes('TVET') || s.includes('VOCAT') || s.includes('POLYTECH')) return 'TECHNICAL';
  if (s.includes('SHS') || s.includes('SENIOR') || s.includes('SECONDARY')) return 'SENIOR_HIGH_SCHOOL';
  return 'NURSERY_TO_JHS';
}

function getInstitutionProfile(rawType) {
  const key = normalizeInstitutionType(rawType);
  return INSTITUTION_ROLE_PROFILES[key] || INSTITUTION_ROLE_PROFILES.NURSERY_TO_JHS;
}

async function resolveTenantInstitutionType({ tenantId = null, tenantCode = null, user = null, req = null } = {}) {
  // 1. Allow explicit Demo Sandbox / Developer override header for interactive walkthrough preview across institution types
  if (req && req.headers) {
    const demoHeader = req.headers['x-demo-institution-type'];
    const modeHeader = String(req.headers['x-system-mode'] || '').toUpperCase();
    const isDevOrDemo =
      String(user?.role || req.user?.role || '').toUpperCase() === 'DEVELOPER' ||
      modeHeader === 'DEMO_SANDBOX' ||
      String(user?.email || req.user?.email || '').toLowerCase().endsWith('@gbs.com');
    if (demoHeader && isDevOrDemo) {
      return normalizeInstitutionType(demoHeader);
    }
  }

  // 2. User / tenant direct metadata
  if (user?.institutionType) return normalizeInstitutionType(user.institutionType);
  if (user?.tenant?.institutionType) return normalizeInstitutionType(user.tenant.institutionType);

  const tidStr = String(tenantId || user?.tenantId || req?.tenantId || '').trim();
  const codeStr = String(tenantCode || user?.tenantCode || user?.tenant?.code || '').trim().toLowerCase();

  // 3. Persistent store institutions lookup
  try {
    const store = readPersistentStore();
    const list = Array.isArray(store.institutions) ? store.institutions : [];
    const matched = list.find(
      (i) =>
        (tidStr && tidStr !== '1' && (String(i.tenantId || '') === tidStr || String(i.id || '') === tidStr)) ||
        (codeStr && codeStr !== 'gbs-main' && String(i.tenantCode || i.code || '').toLowerCase() === codeStr)
    );
    if (matched?.institutionType) {
      return normalizeInstitutionType(matched.institutionType);
    }
  } catch { }

  // 4. PostgreSQL institutionRegistration lookup
  try {
    if (tidStr && /^\d+$/.test(tidStr)) {
      const reg = await prisma.institutionRegistration.findFirst({
        where: { tenantId: Number(tidStr) },
        orderBy: { createdAt: 'desc' }
      });
      if (reg?.institutionType) {
        return normalizeInstitutionType(reg.institutionType);
      }
    }
  } catch { }

  return 'NURSERY_TO_JHS';
}

module.exports = {
  INSTITUTION_ROLE_PROFILES,
  normalizeInstitutionType,
  getInstitutionProfile,
  resolveTenantInstitutionType
};
