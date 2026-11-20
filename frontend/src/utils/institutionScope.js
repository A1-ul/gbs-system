/**
 * GBS ENTERPRISE INSTITUTIONAL SCOPE & TENANT DATA ISOLATION ENGINE
 * 
 * Enforces strict registration tier boundaries:
 * - NURSERY_TO_JHS: Creche, Nursery 1-2, KG 1-2, Primary 1-6, JHS 1-3
 * - SENIOR_HIGH_SCHOOL: SHS Form 1-3 (Science, Arts, Business, Visual Arts, etc.)
 * - UNIVERSITY: Faculties, Departments, Semesters 1-2, Levels 100-400+
 * 
 * Strict Tenant Data Isolation:
 * - Each tenant operates inside an isolated data enclave (scoped keys & queries).
 * - No tenant can view or manage other tenants' records.
 */

export const INSTITUTION_TIERS = {
  NURSERY_TO_JHS: {
    id: "NURSERY_TO_JHS",
    code: "BASIC_JHS",
    title: "Basic School (Nursery to JHS Institution)",
    shortLabel: "Nursery - JHS",
    badgeColor: "#10b981",
    description: "Creche, Nursery, Kindergarten, Primary Class 1-6, and Junior High School (JHS 1-3). Senior High School and University curricula are strictly restricted.",
    classes: [
      { id: "CRECHE", name: "Creche / Daycare", tier: "EARLY_CHILDHOOD" },
      { id: "NURSERY_1", name: "Nursery 1", tier: "EARLY_CHILDHOOD" },
      { id: "NURSERY_2", name: "Nursery 2", tier: "EARLY_CHILDHOOD" },
      { id: "KG_1", name: "Kindergarten 1 (KG 1)", tier: "KINDERGARTEN" },
      { id: "KG_2", name: "Kindergarten 2 (KG 2)", tier: "KINDERGARTEN" },
      { id: "PRIMARY_1", name: "Primary Class 1 (Basic 1)", tier: "LOWER_PRIMARY" },
      { id: "PRIMARY_2", name: "Primary Class 2 (Basic 2)", tier: "LOWER_PRIMARY" },
      { id: "PRIMARY_3", name: "Primary Class 3 (Basic 3)", tier: "LOWER_PRIMARY" },
      { id: "PRIMARY_4", name: "Primary Class 4 (Basic 4)", tier: "UPPER_PRIMARY" },
      { id: "PRIMARY_5", name: "Primary Class 5 (Basic 5)", tier: "UPPER_PRIMARY" },
      { id: "PRIMARY_6", name: "Primary Class 6 (Basic 6)", tier: "UPPER_PRIMARY" },
      { id: "JHS_1", name: "JHS 1 (Basic 7)", tier: "JUNIOR_HIGH" },
      { id: "JHS_2", name: "JHS 2 (Basic 8)", tier: "JUNIOR_HIGH" },
      { id: "JHS_3", name: "JHS 3 (Basic 9 - BECE Prep)", tier: "JUNIOR_HIGH" }
    ],
    subjects: [
      "English Language",
      "Mathematics",
      "Integrated Science",
      "Social Studies",
      "Information & Communication Technology (ICT)",
      "Ghanaian Language & Culture",
      "Religious & Moral Education (RME)",
      "Basic Design & Technology (BDT / Creative Arts)",
      "French Language",
      "Physical & Health Education"
    ]
  },

  SENIOR_HIGH_SCHOOL: {
    id: "SENIOR_HIGH_SCHOOL",
    code: "SHS",
    title: "Senior High School (SHS Institution)",
    shortLabel: "Senior High (SHS)",
    badgeColor: "#38bdf8",
    description: "SHS Form 1, Form 2, and Form 3 (WASSCE). Basic nursery/primary and tertiary university curricula are strictly restricted.",
    classes: [
      { id: "SHS_1_SCI", name: "SHS Form 1 - General Science", programme: "General Science" },
      { id: "SHS_1_ARTS", name: "SHS Form 1 - General Arts", programme: "General Arts" },
      { id: "SHS_1_BUS", name: "SHS Form 1 - Business", programme: "Business" },
      { id: "SHS_1_VIS", name: "SHS Form 1 - Visual Arts", programme: "Visual Arts" },
      { id: "SHS_1_HECON", name: "SHS Form 1 - Home Economics", programme: "Home Economics" },
      { id: "SHS_2_SCI", name: "SHS Form 2 - General Science", programme: "General Science" },
      { id: "SHS_2_ARTS", name: "SHS Form 2 - General Arts", programme: "General Arts" },
      { id: "SHS_2_BUS", name: "SHS Form 2 - Business", programme: "Business" },
      { id: "SHS_2_VIS", name: "SHS Form 2 - Visual Arts", programme: "Visual Arts" },
      { id: "SHS_2_HECON", name: "SHS Form 2 - Home Economics", programme: "Home Economics" },
      { id: "SHS_3_SCI", name: "SHS Form 3 - General Science (WASSCE)", programme: "General Science" },
      { id: "SHS_3_ARTS", name: "SHS Form 3 - General Arts (WASSCE)", programme: "General Arts" },
      { id: "SHS_3_BUS", name: "SHS Form 3 - Business (WASSCE)", programme: "Business" },
      { id: "SHS_3_VIS", name: "SHS Form 3 - Visual Arts (WASSCE)", programme: "Visual Arts" },
      { id: "SHS_3_HECON", name: "SHS Form 3 - Home Economics (WASSCE)", programme: "Home Economics" }
    ],
    subjects: [
      "Core Mathematics",
      "English Language",
      "Integrated Science",
      "Social Studies",
      "Elective Mathematics",
      "Physics",
      "Chemistry",
      "Biology",
      "Economics",
      "Financial Accounting",
      "Cost Accounting",
      "Business Management",
      "Government",
      "Literature in English",
      "Geography",
      "History",
      "Graphic Design",
      "Food & Nutrition"
    ]
  },

  UNIVERSITY: {
    id: "UNIVERSITY",
    code: "TERTIARY",
    title: "University / Tertiary Institution",
    shortLabel: "University / College",
    badgeColor: "#2563eb",
    leadershipRoleTitle: "Vice Chancellor / Registrar / Provost",
    facultyRoleTitle: "University Lecturer / Professor",
    studentRoleTitle: "Undergraduate / Postgraduate Student",
    academicTermLabel: "Semester • Credits • Level 100 – 400+",
    studentGovernanceTitle: "SRC Representatives & Manifestos",
    features: {
      universityOnlyFeatures: true,
      internshipsPortal: true,
      universityStreams: true,
      universitySRC: true,
      lecturerGraduationToAlumni: true,
      technicalPracticals: false,
      prefectsSystem: false
    },
    description: "Undergraduate & Postgraduate Degree / Diploma programmes. Levels 100, 200, 300, 400+, Regular/Evening/Sandwich/Weekend streams, SRC governance, Internships & Graduation to Alumni.",
    classes: [
      { id: "LEVEL_100_SEM_1", name: "Level 100 - First Year (Semester 1)", level: 100 },
      { id: "LEVEL_100_SEM_2", name: "Level 100 - First Year (Semester 2)", level: 100 },
      { id: "LEVEL_200_SEM_1", name: "Level 200 - Second Year (Semester 1)", level: 200 },
      { id: "LEVEL_200_SEM_2", name: "Level 200 - Second Year (Semester 2)", level: 200 },
      { id: "LEVEL_300_SEM_1", name: "Level 300 - Third Year (Semester 1)", level: 300 },
      { id: "LEVEL_300_SEM_2", name: "Level 300 - Third Year (Semester 2)", level: 300 },
      { id: "LEVEL_400_SEM_1", name: "Level 400 - Final Year Honours (Semester 1)", level: 400 },
      { id: "LEVEL_400_SEM_2", name: "Level 400 - Final Year Honours (Semester 2)", level: 400 },
      { id: "POSTGRAD_SEM_1", name: "Postgraduate / Masters (Semester 1)", level: 500 },
      { id: "POSTGRAD_SEM_2", name: "Postgraduate / Masters (Semester 2)", level: 500 }
    ],
    faculties: [
      "Faculty of Science & Computing",
      "Faculty of Engineering & Technology",
      "School of Business & Administration",
      "Faculty of Humanities & Social Sciences",
      "School of Law & Governance",
      "College of Health & Allied Medical Sciences"
    ],
    streams: [
      "Regular Students",
      "Evening Students",
      "Sandwich Students",
      "Weekend Students"
    ],
    subjects: [
      "CSC 101 - Introduction to Computer Science & Algorithms",
      "MAT 105 - Calculus & Analytical Geometry",
      "ENG 102 - Academic Writing & Communication Skills",
      "ECO 103 - Microeconomic Theory",
      "BUS 201 - Principles of Management & Leadership",
      "CSC 204 - Data Structures & Object-Oriented Programming",
      "LAW 301 - Constitutional & Administrative Law",
      "MED 202 - Human Anatomy & Physiology",
      "RES 401 - Undergraduate Thesis & Research Methodology"
    ]
  },

  TECHNICAL: {
    id: "TECHNICAL",
    code: "TECHNICAL_TVET",
    title: "Technical & Vocational Institute (TVET)",
    shortLabel: "Technical / TVET",
    badgeColor: "#d97706",
    leadershipRoleTitle: "Principal / TVET Rector",
    facultyRoleTitle: "Workshop Instructor / Trade Lecturer",
    studentRoleTitle: "Technical Trainee / Apprentice",
    academicTermLabel: "Trade Module / CBT Level 1 – 3",
    studentGovernanceTitle: "Workshop Captains & Trainee Representatives",
    features: {
      universityOnlyFeatures: false,
      internshipsPortal: false,
      universityStreams: false,
      universitySRC: false,
      lecturerGraduationToAlumni: false,
      technicalPracticals: true,
      prefectsSystem: true
    },
    description: "CBT Competency & Technical/Vocational Trade programmes (Electrical, Mechanical, ICT, Building & Construction, Welding, Catering & Fashion). University-only SRC and Degree features are restricted.",
    classes: [
      { id: "TVET_LVL_1_ELEC", name: "Technical Level 1 - Electrical & Electronics", programme: "Electrical Engineering" },
      { id: "TVET_LVL_2_ELEC", name: "Technical Level 2 - Electrical Installation & Power", programme: "Electrical Engineering" },
      { id: "TVET_LVL_1_MECH", name: "Technical Level 1 - Mechanical & Auto Technology", programme: "Mechanical Engineering" },
      { id: "TVET_LVL_2_MECH", name: "Technical Level 2 - Automotive Diagnostics", programme: "Mechanical Engineering" },
      { id: "TVET_LVL_1_ICT", name: "Technical Level 1 - Computer Hardware & Networking", programme: "ICT & Networking" },
      { id: "TVET_LVL_2_BUILD", name: "Technical Level 2 - Building, Masonry & Carpentry", programme: "Construction" },
      { id: "TVET_LVL_3_WELD", name: "Technical Level 3 - Welding & Metal Fabrication", programme: "Welding & Fabrication" },
      { id: "TVET_LVL_2_HOSP", name: "Vocational Level 2 - Catering, Hospitality & Fashion", programme: "Hospitality & Fashion" }
    ],
    subjects: [
      "Technical Drawing & CAD Fundamentals",
      "Workshop Safety & Industrial Standards",
      "Applied Engineering Mathematics",
      "Electrical Circuit Installation & Testing",
      "Motor Vehicle & Mechanical Systems",
      "Computer Hardware Diagnostics & Networking",
      "Welding, Metalwork & Fabrication Practice",
      "Entrepreneurship & Trade Management"
    ]
  }
};

export function normalizeInstitutionTierKey(rawType) {
  const s = String(rawType || "").trim().toUpperCase();
  if (!s) return "NURSERY_TO_JHS";
  if (s.includes("UNIV") || s.includes("TERTIARY") || s.includes("COLLEGE")) return "UNIVERSITY";
  if (s.includes("TECH") || s.includes("TVET") || s.includes("VOCAT") || s.includes("POLYTECH")) return "TECHNICAL";
  if (s.includes("SHS") || s.includes("SENIOR") || s.includes("SECONDARY")) return "SENIOR_HIGH_SCHOOL";
  return "NURSERY_TO_JHS";
}

export function getInstitutionRoleProfile(institutionType = getActiveInstitutionType()) {
  const key = normalizeInstitutionTierKey(institutionType);
  const tier = INSTITUTION_TIERS[key] || INSTITUTION_TIERS.NURSERY_TO_JHS;
  const defaultProfiles = {
    NURSERY_TO_JHS: {
      shortName: "Nursery - JHS",
      name: "Basic School (Nursery to JHS Institution)",
      icon: "🏫",
      leadershipRoleTitle: "Headmaster / Headmistress",
      facultyRoleTitle: "Class & Subject Teacher",
      studentRoleTitle: "Pupil / JHS Student",
      academicTermLabel: "Term (Term 1 – 3)",
      studentGovernanceTitle: "Class Captains & School Prefects",
      features: { universityOnlyFeatures: false, internshipsPortal: false, universityStreams: false, universitySRC: false, lecturerGraduationToAlumni: false, technicalPracticals: false, prefectsSystem: true }
    },
    SENIOR_HIGH_SCHOOL: {
      shortName: "Senior High (SHS)",
      name: "Senior High School (SHS Institution)",
      icon: "📚",
      leadershipRoleTitle: "Headmaster / Principal",
      facultyRoleTitle: "Subject Tutor / Housemaster",
      studentRoleTitle: "SHS Student",
      academicTermLabel: "SHS Form / Semester (WASSCE)",
      studentGovernanceTitle: "Student Prefect Council",
      features: { universityOnlyFeatures: false, internshipsPortal: false, universityStreams: false, universitySRC: false, lecturerGraduationToAlumni: false, technicalPracticals: false, prefectsSystem: true }
    },
    TECHNICAL: {
      shortName: "Technical / TVET",
      name: "Technical & Vocational Institute (TVET)",
      icon: "🛠️",
      leadershipRoleTitle: tier.leadershipRoleTitle || "Principal / TVET Rector",
      facultyRoleTitle: tier.facultyRoleTitle || "Workshop Instructor / Trade Lecturer",
      studentRoleTitle: tier.studentRoleTitle || "Technical Trainee / Apprentice",
      academicTermLabel: tier.academicTermLabel || "Trade Module / CBT Level 1 – 3",
      studentGovernanceTitle: tier.studentGovernanceTitle || "Workshop Captains & Trainee Representatives",
      features: tier.features
    },
    UNIVERSITY: {
      shortName: "University / Tertiary",
      name: "University / Tertiary Institution",
      icon: "🎓",
      leadershipRoleTitle: tier.leadershipRoleTitle || "Vice Chancellor / Registrar / Provost",
      facultyRoleTitle: tier.facultyRoleTitle || "University Lecturer / Professor",
      studentRoleTitle: tier.studentRoleTitle || "Undergraduate / Postgraduate Student",
      academicTermLabel: tier.academicTermLabel || "Semester • Credits • Level 100 – 400+",
      studentGovernanceTitle: tier.studentGovernanceTitle || "SRC Representatives & Manifestos",
      features: tier.features
    }
  };
  const resolved = { ...tier, ...defaultProfiles[key], id: key };
  resolved.shortName = resolved.shortName || resolved.shortLabel || "Institution";
  resolved.name = resolved.name || resolved.title || resolved.shortName;
  resolved.icon = resolved.icon || "🏫";
  return resolved;
}

/**
 * Gets the current active tenant identifier
 */
export function getActiveTenantId() {
  try {
    const user = JSON.parse(localStorage.getItem("gbs_user") || "{}");
    if (user.tenantId) return String(user.tenantId);
    if (user.tenantCode) return String(user.tenantCode);
    const tenant = JSON.parse(localStorage.getItem("gbs_tenant") || "{}");
    if (tenant.id) return String(tenant.id);
    if (tenant.code) return String(tenant.code);
  } catch { }
  return "1";
}

/**
 * Gets the registered Institution Operating Type for the active tenant
 */
export function getActiveInstitutionType() {
  try {
    const mode = String(localStorage.getItem("gbs_system_mode") || "LIVE_PRODUCTION").toUpperCase();
    const tenant = JSON.parse(localStorage.getItem("gbs_tenant") || "{}");
    const user = JSON.parse(localStorage.getItem("gbs_user") || "{}");
    const isDemo = mode === "DEMO_SANDBOX" || user?.isDemo === true;
    const directType = localStorage.getItem("gbs_institution_type");
    const registeredRaw = user?.institutionType || tenant?.institutionType;

    // In Live Production, ALWAYS honor the registered institution type before any leftover local selector key
    if (!isDemo && registeredRaw) {
      return normalizeInstitutionTierKey(registeredRaw);
    }

    if (directType && INSTITUTION_TIERS[directType]) {
      return directType;
    }

    if (registeredRaw) {
      return normalizeInstitutionTierKey(registeredRaw);
    }
  } catch { }

  // Default to NURSERY_TO_JHS as required by institutional blueprint
  return "NURSERY_TO_JHS";
}

/**
 * Sets the registered Institution Operating Type for the active tenant
 */
export function setActiveInstitutionType(type) {
  if (INSTITUTION_TIERS[type]) {
    localStorage.setItem("gbs_institution_type", type);
    window.dispatchEvent(new CustomEvent("gbs_institution_type_changed", { detail: { type } }));
    return true;
  }
  return false;
}

/**
 * Checks if a class / grade / programme belongs to the registered institution tier
 */
export function isLevelPermitted(levelIdentifier, institutionType = getActiveInstitutionType()) {
  const tierConfig = INSTITUTION_TIERS[institutionType];
  if (!tierConfig) return true;

  const clean = String(levelIdentifier || "").toUpperCase();

  if (institutionType === "NURSERY_TO_JHS") {
    // Restricted: SHS forms or University levels
    if (clean.includes("SHS") || clean.includes("FORM ") || clean.includes("LEVEL ") || clean.includes("SEMESTER") || clean.includes("FACULTY")) {
      return false;
    }
    return true;
  }

  if (institutionType === "SENIOR_HIGH_SCHOOL") {
    // Restricted: Creche, Nursery, KG, Primary, TVET trade workshops, or University
    if (clean.includes("NURSERY") || clean.includes("KINDERGARTEN") || clean.includes("KG ") || clean.includes("PRIMARY") || clean.includes("BASIC 1") || clean.includes("BASIC 2") || clean.includes("BASIC 3") || clean.includes("BASIC 4") || clean.includes("BASIC 5") || clean.includes("BASIC 6") || clean.includes("LEVEL ") || clean.includes("FACULTY") || clean.includes("TVET")) {
      return false;
    }
    return true;
  }

  if (institutionType === "TECHNICAL") {
    // Restricted: Basic School (Creche/Nursery/KG/Primary/JHS) or Senior High tracks
    if (clean.includes("NURSERY") || clean.includes("KINDERGARTEN") || clean.includes("KG ") || clean.includes("PRIMARY") || clean.includes("JHS") || clean.includes("SHS")) {
      return false;
    }
    return true;
  }

  if (institutionType === "UNIVERSITY") {
    // Restricted: Basic School and Senior High
    if (clean.includes("NURSERY") || clean.includes("KG") || clean.includes("PRIMARY") || clean.includes("JHS") || clean.includes("SHS") || clean.includes("FORM ")) {
      return false;
    }
    return true;
  }

  return true;
}

/**
 * Returns allowed classes for current institution registration
 */
export function getAllowedClassesForCurrentTier(institutionType = getActiveInstitutionType()) {
  const tierConfig = INSTITUTION_TIERS[institutionType];
  return tierConfig ? tierConfig.classes : INSTITUTION_TIERS.NURSERY_TO_JHS.classes;
}

/**
 * Returns allowed subjects for current institution registration
 */
export function getAllowedSubjectsForCurrentTier(institutionType = getActiveInstitutionType()) {
  const tierConfig = INSTITUTION_TIERS[institutionType];
  return tierConfig ? tierConfig.subjects : INSTITUTION_TIERS.NURSERY_TO_JHS.subjects;
}

/**
 * Get tenant-scoped storage key to ensure 100% data separation between tenants
 */
export function getTenantScopedStorageKey(baseKey, customTenantId = null) {
  const tId = customTenantId || getActiveTenantId();
  return `gbs_t${tId}_${baseKey}`;
}

/**
 * Read tenant-scoped record
 */
export function getTenantScopedRecord(baseKey, defaultValue = null) {
  try {
    const key = getTenantScopedStorageKey(baseKey);
    const item = localStorage.getItem(key);
    if (item !== null) return JSON.parse(item);
  } catch { }
  return defaultValue;
}

/**
 * Save tenant-scoped record
 */
export function setTenantScopedRecord(baseKey, value) {
  try {
    const key = getTenantScopedStorageKey(baseKey);
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}
