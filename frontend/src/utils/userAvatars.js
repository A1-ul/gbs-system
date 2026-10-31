/**
 * GBS Enterprise Real-Life Production Imagery & Avatar Rotation Engine
 * Strictly Authentic Real-Life Production Photos (Zero Cartoons)
 * Supports dynamic background switching and avatar click-to-rotate across all dashboards
 */

export const REAL_LIFE_AVATARS = {
  ADMIN: [
    "https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=400&q=80", // Distinguished Headmaster in Executive Suit
    "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80", // Female Academic Chancellor
    "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=80", // Senior Academic Administrator
    "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=400&q=80"  // Executive School Director
  ],
  TEACHER: [
    "https://images.unsplash.com/photo-1573496799652-408c2ac9fe98?auto=format&fit=crop&w=400&q=80", // Professional Educator with Tablet
    "https://images.unsplash.com/photo-1524178232363-1fb2b075b655?auto=format&fit=crop&w=400&q=80", // Senior STEM Lecturer
    "https://images.unsplash.com/photo-1580894732444-8ecded7900cd?auto=format&fit=crop&w=400&q=80", // Literature & Languages Teacher
    "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=400&q=80"  // Mathematics Faculty Instructor
  ],
  STUDENT: [
    "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=400&q=80", // Focused Collegiate Student
    "https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=400&q=80", // Academic Honors Student
    "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80", // Senior Baccalaureate Scholar
    "https://images.unsplash.com/photo-1501196354995-cbb51c65aaea?auto=format&fit=crop&w=400&q=80"  // University Undergraduate Student
  ],
  PARENT: [
    "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=400&q=80", // Professional Guardian Mother
    "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=400&q=80", // Executive Guardian Father
    "https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?auto=format&fit=crop&w=400&q=80", // PTA Executive Member
    "https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?auto=format&fit=crop&w=400&q=80"  // Family Guardian
  ],
  ACCOUNTANT: [
    "https://images.unsplash.com/photo-1551836022-d5d88e9218df?auto=format&fit=crop&w=400&q=80", // Corporate Senior Bursar
    "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=400&q=80", // Financial Comptroller
    "https://images.unsplash.com/photo-1573497491208-6b1acb260507?auto=format&fit=crop&w=400&q=80", // Senior Accounts Auditor
    "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=400&q=80"  // Institutional Treasurer
  ],
  STAFF: [
    "https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=400&q=80", // Operations & Logistics Officer
    "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=400&q=80", // Campus Administrative Coordinator
    "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=400&q=80"  // Procurement Manager
  ],
  HR: [
    "https://images.unsplash.com/photo-1573496799652-408c2ac9fe98?auto=format&fit=crop&w=400&q=80", // Human Resources Director
    "https://images.unsplash.com/photo-1580894732444-8ecded7900cd?auto=format&fit=crop&w=400&q=80", // Personnel & Staffing Lead
    "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=80"  // Faculty Compliance Executive
  ],
  DEVELOPER: [
    "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80", // Gabriel Osei - Chief System Engineer
    "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=80", // Enterprise Cloud Architect
    "https://images.unsplash.com/photo-1551836022-d5d88e9218df?auto=format&fit=crop&w=400&q=80"  // Antigravity AI Systems Specialist
  ]
};

export const REAL_USER_AVATARS = REAL_LIFE_AVATARS;

export const ROLE_BACKGROUND_IMAGES = {
  ADMIN: "/assets/admin-dashboard-bg.jpg",
  TEACHER: "/assets/virtual-classroom-bg.jpg",
  STUDENT: "/assets/student-dashboard-bg.jpg",
  PARENT: "/assets/parent-dashboard-bg.jpg",
  ACCOUNTANT: "/assets/finance-hero-bg.jpg",
  STAFF: "/assets/staff-dashboard-bg.jpg",
  HR: "/assets/hr-bg.jpg",
  DEVELOPER: "/assets/developer-command-center-bg.jpg",
  ALUMNI: "/assets/graduation.jpg"
};

/**
 * Get the current active real-life avatar for a given role
 */
export function getUserAvatar(role = "ADMIN") {
  const normRole = (role || "ADMIN").toUpperCase();
  const gallery = REAL_LIFE_AVATARS[normRole] || REAL_LIFE_AVATARS.ADMIN;
  try {
    const savedIndex = parseInt(localStorage.getItem(`gbs_avatar_idx_${normRole}`) || "0", 10);
    const validIndex = isNaN(savedIndex) ? 0 : savedIndex % gallery.length;
    return gallery[validIndex] || gallery[0];
  } catch {
    return gallery[0];
  }
}

/**
 * Rotate to the next real-life photo in the gallery on click
 */
export function rotateUserAvatar(role = "ADMIN") {
  const normRole = (role || "ADMIN").toUpperCase();
  const gallery = REAL_LIFE_AVATARS[normRole] || REAL_LIFE_AVATARS.ADMIN;
  try {
    const currentIndex = parseInt(localStorage.getItem(`gbs_avatar_idx_${normRole}`) || "0", 10);
    const nextIndex = (currentIndex + 1) % gallery.length;
    localStorage.setItem(`gbs_avatar_idx_${normRole}`, String(nextIndex));
    window.dispatchEvent(new CustomEvent("gbs_avatar_rotated", { detail: { role: normRole, newAvatar: gallery[nextIndex] } }));
    window.dispatchEvent(new Event("storage"));
    return gallery[nextIndex];
  } catch {
    return gallery[0];
  }
}

/**
 * Get authentic real-life background image for login role selection
 */
export function getRoleBackgroundImage(role = "ADMIN") {
  const normRole = (role || "ADMIN").toUpperCase();
  return ROLE_BACKGROUND_IMAGES[normRole] || ROLE_BACKGROUND_IMAGES.ADMIN;
}
