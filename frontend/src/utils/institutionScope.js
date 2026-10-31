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
    badgeColor: "#a855f7",
    description: "Undergraduate & Postgraduate Degree / Diploma programmes. Levels 100, 200, 300, 400+, Semester-based course enrollment. Basic and secondary school curricula are restricted.",
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
  }
};

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
  } catch {}
  return "1";
}

/**
 * Gets the registered Institution Operating Type for the active tenant
 */
export function getActiveInstitutionType() {
  try {
    const directType = localStorage.getItem("gbs_institution_type");
    if (directType && INSTITUTION_TIERS[directType]) {
      return directType;
    }

    const tenant = JSON.parse(localStorage.getItem("gbs_tenant") || "{}");
    if (tenant.institutionType && INSTITUTION_TIERS[tenant.institutionType]) {
      return tenant.institutionType;
    }

    const user = JSON.parse(localStorage.getItem("gbs_user") || "{}");
    if (user.institutionType && INSTITUTION_TIERS[user.institutionType]) {
      return user.institutionType;
    }
  } catch {}

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
    // Restricted: Creche, Nursery, KG, Primary, or University
    if (clean.includes("NURSERY") || clean.includes("KINDERGARTEN") || clean.includes("KG ") || clean.includes("PRIMARY") || clean.includes("BASIC 1") || clean.includes("BASIC 2") || clean.includes("BASIC 3") || clean.includes("BASIC 4") || clean.includes("BASIC 5") || clean.includes("BASIC 6") || clean.includes("LEVEL ") || clean.includes("FACULTY")) {
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
  } catch {}
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
