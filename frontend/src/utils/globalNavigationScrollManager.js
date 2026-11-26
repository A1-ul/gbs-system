/**
 * GBS School Management System — Global Navigation & Scroll Position Restoration Manager
 *
 * Standardizes page-based navigation, browser Back/Forward history, exact scroll restoration
 * (window + independently scrollable nested containers), and per-dashboard navigation history
 * across ALL institutional user dashboards and module pages.
 *
 * STRICT EXCLUSION: Never alters or intercepts the Developer Dashboard (/developer*, /developer-control-center*).
 */

const SNAPSHOT_STORAGE_KEY = "gbs_global_scroll_snapshots_v2";
const NAV_TRAIL_STORAGE_KEY = "gbs_in_app_nav_trail_v2";
const ROLE_HISTORY_STORAGE_KEY = "gbs_role_nav_history_v2";
const MAX_SNAPSHOTS = 120;
const MAX_TRAIL_ENTRIES = 120;
const MAX_ROLE_STACK = 40;

const memorySnapshotsByKey = new Map();
const memorySnapshotsByRoute = new Map();
const trackedScrollElements = new Set();

let activeEntryKey = null;
let activeRouteKey = null;
let isRestoringScroll = false;
let activeRestoreCancel = null;

/**
 * Strictly identify Developer Dashboard routes so they remain 100% excluded.
 */
export function isDeveloperRoute(pathname = "") {
  const p = String(pathname || (typeof window !== "undefined" ? window.location.pathname : "")).toLowerCase();
  return (
    p === "/developer" ||
    p.startsWith("/developer/") ||
    p.startsWith("/developer-control-center") ||
    p.startsWith("/portal/developer")
  );
}

/**
 * Parse institutional portal dashboard route:
 * - /portal/:role/dashboard             -> Dashboard Overview (isModulePage: false)
 * - /portal/:role/dashboard/:moduleId   -> Dedicated Module Page (isModulePage: true)
 * - /portal/:role/dashboard?tab=X&full=1 -> Legacy full-page module link compatibility
 */
export function parsePortalDashboardRoute(pathname = "", search = "") {
  const pathStr = String(pathname || (typeof window !== "undefined" ? window.location.pathname : ""));
  const searchStr = String(search !== undefined ? search : (typeof window !== "undefined" ? window.location.search : ""));

  if (isDeveloperRoute(pathStr)) {
    return {
      isPortalDashboard: false,
      isDeveloper: true,
      role: "developer",
      moduleId: null,
      rawPathModuleId: null,
      isModulePage: false,
      baseDashboardPath: "/developer-control-center/dashboard"
    };
  }

  const normalizedPath = pathStr.replace(/\/+$/, "");
  const match = normalizedPath.match(/^\/portal\/([^/]+)\/dashboard(?:\/(.+))?$/i);
  if (!match) {
    return {
      isPortalDashboard: false,
      isDeveloper: false,
      role: null,
      moduleId: null,
      rawPathModuleId: null,
      isModulePage: false,
      baseDashboardPath: null
    };
  }

  const role = String(match[1] || "").toLowerCase();
  if (role === "developer") {
    return {
      isPortalDashboard: false,
      isDeveloper: true,
      role: "developer",
      moduleId: null,
      rawPathModuleId: null,
      isModulePage: false,
      baseDashboardPath: "/developer-control-center/dashboard"
    };
  }

  let rawPathModuleId = null;
  if (match[2]) {
    try {
      rawPathModuleId = decodeURIComponent(match[2]);
    } catch {
      rawPathModuleId = match[2];
    }
  }

  const params = new URLSearchParams(searchStr);
  const legacyTab = params.get("tab") || null;
  const legacyFull = params.get("full") === "1" || params.get("fullpage") === "1";

  const moduleId = rawPathModuleId || (legacyFull && legacyTab ? legacyTab : null);

  return {
    isPortalDashboard: true,
    isDeveloper: false,
    role,
    moduleId,
    rawPathModuleId,
    legacyTab,
    isModulePage: Boolean(moduleId),
    baseDashboardPath: `/portal/${role}/dashboard`
  };
}

/**
 * Human-readable portal names for institutional dashboards.
 */
export function getInstitutionalPortalLabel(roleOrPath = "") {
  const s = String(roleOrPath || "").toLowerCase();
  if (s.includes("admin") || s.includes("headmaster") || s.includes("owner")) return "Headmaster Command Center";
  if (s.includes("clinic") || s.includes("doctor") || s.includes("nurse")) return "School Clinic & Medical Command";
  if (s.includes("teacher")) return "Teacher Academic Suite";
  if (s.includes("student")) return "Student Learning Portal";
  if (s.includes("parent")) return "Parent & Guardian Portal";
  if (s.includes("accountant") || s.includes("bursar")) return "Finance & Bursar Portal";
  if (s.includes("secretary")) return "School Secretary & Front Office";
  if (s.includes("hr")) return "HR & Faculty Affairs";
  if (s.includes("staff")) return "Campus Operations & Staff";
  if (s.includes("alumni") || s.includes("graduate")) return "Alumni & Convocation Network";
  return "GBS Institutional Portal";
}

const MODULE_TITLE_MAP = {
  // Admin / Headmaster
  roster: "User Registration Roster",
  hr_audits: "HR Audit Directives & Reports",
  attendanceCrossCheck: "Weekly Attendance Cross-Check",
  lessonVetting: "Teacher Plans & Notes Vetting",
  examVetting: "End-of-Term / Semester Exam Vetting",
  planner: "Academic Planner & Promotions",
  academics: "Academic Classes & Curriculum",
  admissions: "Admissions Pipeline & Intake",
  communications: "Multi-Channel Communications",
  locator: "Emergency Guardian Locator",
  circulars: "School Circulars & Announcements",
  inquiries: "Parent Inquiries & Feedback",
  audits: "Audit References & Compliance Ledger",
  feeApprovals: "Fee Increment Approvals",
  leadership: "Leadership & Succession Dossier",
  devDirectives: "Developer Directives & Remediation",
  busTransport: "Student Bus Boarding & Route Fares",
  cctv: "Inbuilt Campus CCTV & Mobile Link",
  defaulters: "Defaulters Compliance Registry",
  clinic: "My Medical Health Status",
  stationery: "School Stationery & Price Desk",
  staffAttendance: "Staff & Clinic Attendance",
  // School Clinic (Doctors & Nurses Only)
  directory: "School Medical Profiles Directory",
  treat: "Consultations & Sickbay Treatment",
  visits: "Clinical Visits & Sickbay Admissions",
  registrations: "Admissions Medical Registration Queue",
  pharmacy: "Clinic Pharmacy & Medication Stock",
  // Teacher
  attendance: "Student Attendance Register",
  classes: "Assigned Classes & Rosters",
  assignments: "Lessons & Assignments",
  exams: "Exams & Result Grading",
  examsMonitor: "Live Exams Monitor & Proctoring",
  examPapers: "End-of-Term Exam Papers & Vetting",
  scanner: "Exam Script Scanner & Marking",
  meetings: "Live Video Conferences & Classrooms",
  topicVideos: "Class Topic Videos",
  lessonPlans: "Lesson Plans & Notes Vetting",
  transcripts: "Academic Transcripts",
  curriculum: "Curriculum, Placements & Progression",
  profile: "Faculty Profile",
  // Student
  timetable: "My Class Timetable",
  "report-card": "Verified Report Card",
  courses: "Courses, Streams & Placements",
  alumni: "Alumni Directory & Hall of Fame",
  library: "Digital Library & E-Books",
  "fees-history": "Lifetime Fee History & Receipts",
  "peer-chat": "Peer Chat & Study Circle",
  "cooperative-conferencing": "Cooperative Voice & Video Conferencing",
  schedule: "Academic Schedule",
  // Parent
  children: "Child Profile & Overview",
  grades: "Academic Grades & Report Cards",
  fees: "School Fees & Billing Portal",
  // Accountant
  invoices: "Student Invoicing & Arrears",
  debtors: "Debtor Registry & Arrears Holds",
  "fee-structures": "Fee Schedules & Hostel Tiers",
  matrix: "Class Fee Matrix & Totals",
  gateways: "Payment Gateways & Channels",
  payments: "Payment Verification & Reconciliations",
  expenses: "Operating Expense Ledger",
  statements: "Financial Statements & Audit Engine",
  "alumni-gifts": "Alumni Pledges & Gifts",
  "headmaster-procurement": "Headmaster Procurement Audit Ledger",
  // Secretary
  visitors: "Visitor Front-Desk Log",
  letters: "Official Letters & Circulars",
  appointments: "Headmaster Appointments",
  calls: "Campus Voice & Video Calls",
  // HR
  staff_roster: "Staff & Faculty Directory",
  leaves: "Leave & Absence Management",
  payroll_structure: "Payroll & Salary Tiers",
  // Staff
  duties: "Operational Duties & Tasks",
  inventory: "Inventory Depot & Supplies",
  maintenance: "Campus Facility & Maintenance",
  incidents: "Incident & Safety Escalation",
  // Alumni
  CUMULATIVE_RECORDS: "Cumulative Academic Records",
  OFFICIAL_TRANSCRIPT: "Official Sealed Transcript",
  CLEARANCE_FORMS: "Graduation Clearance & Sign-Off",
  BATCHES: "Completion Batches",
  ZOOM_REUNIONS: "Zoom Reunions & Mentorship",
  DIRECTORY: "Global Alumni Directory",
  ENDOWMENT: "Giving & Scholarship Fund"
};

export function resolveModuleTitle(moduleId = "") {
  const clean = String(moduleId || "").trim();
  if (!clean) return "Workspace Module";

  // Prefer active primary tab button text in DOM for exact context-aware labels (e.g. Stationery Price List vs Headmaster Desk)
  try {
    if (typeof document !== "undefined") {
      const activeBtn = document.querySelector("nav.role-tab-nav .role-tab-btn.active");
      const text = activeBtn?.textContent?.replace(/\s+/g, " ").trim();
      if (text) return text.slice(0, 76);
    }
  } catch { }

  if (MODULE_TITLE_MAP[clean]) return MODULE_TITLE_MAP[clean];

  return clean
    .replace(/[_-]+/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/**
 * Determine safe fallback dashboard path when user opened a page directly with no prior in-app history.
 */
export function resolveSafeFallbackDashboardPath(pathname = "") {
  const parsed = parsePortalDashboardRoute(pathname, "");
  if (parsed.isPortalDashboard && parsed.baseDashboardPath) {
    return parsed.baseDashboardPath;
  }

  try {
    const rawUser = localStorage.getItem("gbs_user");
    const user = rawUser ? JSON.parse(rawUser) : null;
    const role = String(user?.role || localStorage.getItem("gbs_auth_role") || "").toUpperCase();
    if (role === "ADMIN" || role === "SUPER_ADMIN" || role === "HEADMASTER") return "/portal/admin/dashboard";
    if (role === "CLINIC_DOCTOR" || role === "CLINIC_NURSE" || role === "DOCTOR" || role === "NURSE" || role === "CLINIC") return "/portal/clinic/dashboard";
    if (role === "TEACHER") return "/portal/teacher/dashboard";
    if (role === "STUDENT") return "/portal/student/dashboard";
    if (role === "PARENT") return "/portal/parent/dashboard";
    if (role === "ACCOUNTANT" || role === "BURSAR") return "/portal/accountant/dashboard";
    if (role === "SECRETARY") return "/portal/secretary/dashboard";
    if (role === "HR") return "/portal/hr/dashboard";
    if (role === "STAFF") return "/portal/staff/dashboard";
    if (role === "ALUMNI") return "/portal/alumni/dashboard";
  } catch { }

  return "/login";
}

// ============================================================================
// SCROLLABLE CONTAINER IDENTIFICATION & SNAPSHOT STORAGE
// ============================================================================

function loadPersistedSnapshots() {
  try {
    const raw = sessionStorage.getItem(SNAPSHOT_STORAGE_KEY);
    if (!raw) return { byKey: {}, byRoute: {} };
    const parsed = JSON.parse(raw);
    return {
      byKey: parsed && typeof parsed.byKey === "object" ? parsed.byKey : {},
      byRoute: parsed && typeof parsed.byRoute === "object" ? parsed.byRoute : {}
    };
  } catch {
    return { byKey: {}, byRoute: {} };
  }
}

function persistSnapshots(store) {
  try {
    const trimObj = (obj, max) => {
      const keys = Object.keys(obj);
      if (keys.length <= max) return obj;
      const sorted = keys.sort((a, b) => (obj[a]?.savedAt || 0) - (obj[b]?.savedAt || 0));
      const toDelete = sorted.slice(0, keys.length - max);
      for (const k of toDelete) delete obj[k];
      return obj;
    };
    trimObj(store.byKey, MAX_SNAPSHOTS);
    trimObj(store.byRoute, MAX_SNAPSHOTS);
    sessionStorage.setItem(SNAPSHOT_STORAGE_KEY, JSON.stringify(store));
  } catch { }
}

function isScrollableContainerElement(el) {
  if (!el || el.nodeType !== 1) return false;
  if (el === document.documentElement || el === document.body) return false;
  try {
    const style = window.getComputedStyle(el);
    const overflowY = style.overflowY;
    const overflowX = style.overflowX;
    const canScrollY = (overflowY === "auto" || overflowY === "scroll" || overflowY === "overlay") && el.scrollHeight > el.clientHeight + 2;
    const canScrollX = (overflowX === "auto" || overflowX === "scroll" || overflowX === "overlay") && el.scrollWidth > el.clientWidth + 2;
    return canScrollY || canScrollX;
  } catch {
    return false;
  }
}

function computeStableSelector(el) {
  if (!el || el.nodeType !== 1) return null;
  const scrollId = el.getAttribute("data-gbs-scroll-id");
  if (scrollId) return `[data-gbs-scroll-id="${CSS.escape(scrollId)}"]`;
  if (el.id) return `#${CSS.escape(el.id)}`;

  const parts = [];
  let node = el;
  let depth = 0;
  while (node && node.nodeType === 1 && node !== document.body && depth < 7) {
    if (node.id) {
      parts.unshift(`#${CSS.escape(node.id)}`);
      break;
    }
    const tag = node.tagName.toLowerCase();
    let nth = 1;
    let sib = node.previousElementSibling;
    while (sib) {
      if (sib.tagName === node.tagName) nth++;
      sib = sib.previousElementSibling;
    }
    parts.unshift(`${tag}:nth-of-type(${nth})`);
    node = node.parentElement;
    depth++;
  }
  return parts.length > 0 ? parts.join(" > ") : null;
}

export function registerScrolledContainer(el) {
  if (!el || el.nodeType !== 1) return;
  if (el === document.documentElement || el === document.body) return;
  if (isScrollableContainerElement(el)) {
    trackedScrollElements.add(el);
  }
}

function captureContainerScrolls() {
  const results = [];
  const seen = new Set();

  const inspect = (el) => {
    if (!el || seen.has(el) || !document.contains(el)) return;
    seen.add(el);
    if (!isScrollableContainerElement(el)) return;
    const top = Math.round(el.scrollTop || 0);
    const left = Math.round(el.scrollLeft || 0);
    if (top <= 0 && left <= 0) return;
    const selector = computeStableSelector(el);
    if (!selector) return;
    results.push({
      scrollId: el.getAttribute("data-gbs-scroll-id") || el.id || null,
      selector,
      top,
      left
    });
  };

  // 1. Containers explicitly scrolled by the user on this page
  for (const el of Array.from(trackedScrollElements)) {
    if (!document.contains(el)) {
      trackedScrollElements.delete(el);
      continue;
    }
    inspect(el);
  }

  // 2. Known scrollable dashboard containers & tables
  try {
    const candidates = document.querySelectorAll(
      "[data-gbs-scroll-id], [data-scroll-container], .role-table-responsive, .table-responsive, .gbs-table-scroll, .role-tab-nav, .sidebar-content, .gbs-scrollable"
    );
    candidates.forEach(inspect);
  } catch { }

  return results.slice(0, 30);
}

function getWindowScrollCoords() {
  const se = document.scrollingElement || document.documentElement;
  const windowX = Math.max(
    0,
    Math.round(window.scrollX ?? window.pageXOffset ?? se?.scrollLeft ?? document.documentElement.scrollLeft ?? 0)
  );
  const windowY = Math.max(
    0,
    Math.round(window.scrollY ?? window.pageYOffset ?? se?.scrollTop ?? document.documentElement.scrollTop ?? 0)
  );
  return { windowX, windowY };
}

const activeOverviewTabsByStorageKey = new Map();

export function registerCurrentOverviewTab(storageKey, tab) {
  if (!storageKey || !tab) return;
  activeOverviewTabsByStorageKey.set(String(storageKey), String(tab));
}

function captureSafeFilterControls() {
  const filters = [];
  try {
    const root = document.querySelector(".role-main, .role-main-content, .dashboard-main, main") || document.body;
    if (!root) return filters;
    const els = root.querySelectorAll('input[type="search"], input[type="text"], select');
    for (const el of els) {
      if (filters.length >= 16) break;
      if (el.closest("[role='dialog'], .modal-box, [data-gbs-no-restore]")) continue;
      const type = String(el.type || "").toLowerCase();
      const name = String(el.name || el.id || el.getAttribute("aria-label") || el.placeholder || "").toLowerCase();
      // Strictly never capture sensitive credentials, passwords, OTPs, pins, or payment inputs
      if (/pass|pin|otp|token|secret|card|cvv|email|phone|amount|price|salary/.test(name)) continue;
      const isSearchOrFilter =
        el.tagName === "SELECT" ||
        type === "search" ||
        el.hasAttribute("data-gbs-filter-state") ||
        /search|filter|find|class|term|subject|grade|status|category|year|country|lang/.test(name);
      if (!isSearchOrFilter) continue;
      const val = String(el.value ?? "");
      if (!val) continue;
      const selector = computeStableSelector(el);
      if (!selector) continue;
      filters.push({ tag: el.tagName, selector, value: val });
    }
  } catch { }
  return filters;
}

function restoreSafeFilterControls(filters) {
  if (!Array.isArray(filters) || filters.length === 0) return;
  try {
    const inputSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value")?.set;
    const selectSetter = Object.getOwnPropertyDescriptor(window.HTMLSelectElement.prototype, "value")?.set;
    for (const item of filters) {
      let el = null;
      try {
        el = document.querySelector(item.selector);
      } catch { }
      if (!el || el.tagName !== item.tag) continue;
      if (String(el.value ?? "") === String(item.value ?? "")) continue;
      if (el.tagName === "INPUT" && inputSetter) {
        inputSetter.call(el, item.value);
        el.dispatchEvent(new Event("input", { bubbles: true }));
      } else if (el.tagName === "SELECT" && selectSetter) {
        const hasOption = Array.from(el.options || []).some((opt) => opt.value === item.value);
        if (hasOption) {
          selectSetter.call(el, item.value);
          el.dispatchEvent(new Event("change", { bubbles: true }));
        }
      }
    }
  } catch { }
}

/**
 * Capture current window scroll + nested scrollable containers + safe page/filter/overview-tab context.
 */
export function captureCurrentScrollSnapshot(pathname, search) {
  if (typeof window === "undefined") return null;
  const pathStr = pathname || window.location.pathname;
  const searchStr = search !== undefined ? search : window.location.search;
  if (isDeveloperRoute(pathStr)) return null;

  const parsed = parsePortalDashboardRoute(pathStr, searchStr);
  const { windowX, windowY } = getWindowScrollCoords();

  const overviewTabs = {};
  for (const [k, v] of activeOverviewTabsByStorageKey.entries()) {
    overviewTabs[k] = v;
  }

  return {
    windowX,
    windowY,
    containers: captureContainerScrolls(),
    filters: captureSafeFilterControls(),
    overviewTabs,
    pathname: pathStr,
    search: searchStr,
    role: parsed.role,
    moduleId: parsed.moduleId,
    savedAt: Date.now()
  };
}

export function readSavedOverviewTab(entryKey, routeKey, storageKey) {
  if (!storageKey) return null;
  const snap = readScrollSnapshot(entryKey, routeKey);
  if (snap && snap.overviewTabs && snap.overviewTabs[storageKey]) {
    return snap.overviewTabs[storageKey];
  }
  return null;
}

/**
 * Save snapshot for a specific React Router history entry key and route key.
 * Pass persistNow=false for ultra-fast synchronous memory updates during scroll frames.
 */
export function saveScrollSnapshotForEntry(entryKey, routeKey, customSnapshot = null, persistNow = true) {
  if (typeof window === "undefined") return;
  const pathStr = (routeKey || window.location.pathname).split("?")[0];
  if (isDeveloperRoute(pathStr)) return;
  if (isRestoringScroll) return;

  const snap = customSnapshot || captureCurrentScrollSnapshot(
    pathStr,
    routeKey && routeKey.includes("?") ? routeKey.slice(routeKey.indexOf("?")) : window.location.search
  );
  if (!snap) return;

  const safeEntryKey = entryKey || activeEntryKey || "default";
  const safeRouteKey = routeKey || activeRouteKey || (window.location.pathname + window.location.search);

  memorySnapshotsByKey.set(safeEntryKey, snap);
  memorySnapshotsByRoute.set(safeRouteKey, snap);

  if (persistNow) {
    const persisted = loadPersistedSnapshots();
    persisted.byKey[safeEntryKey] = snap;
    persisted.byRoute[safeRouteKey] = snap;
    persistSnapshots(persisted);
  }
}

export function hasSnapshotForEntry(entryKey) {
  if (!entryKey) return false;
  if (memorySnapshotsByKey.has(entryKey)) return true;
  const persisted = loadPersistedSnapshots();
  return Boolean(persisted.byKey[entryKey]);
}

/**
 * Synchronously snapshot the currently active page right before programmatic navigation.
 */
export function saveActiveScrollSnapshot() {
  if (typeof window === "undefined") return;
  if (isDeveloperRoute(window.location.pathname)) return;
  if (isRestoringScroll) return;
  const routeKey = activeRouteKey || (window.location.pathname + window.location.search);
  const entryKey = activeEntryKey || "default";
  saveScrollSnapshotForEntry(entryKey, routeKey);
}

export function setActiveNavigationKeys(entryKey, routeKey) {
  activeEntryKey = entryKey || "default";
  activeRouteKey = routeKey || (typeof window !== "undefined" ? window.location.pathname + window.location.search : "/");
  trackedScrollElements.clear();
}

export function getActiveNavigationKeys() {
  return { entryKey: activeEntryKey, routeKey: activeRouteKey };
}

export function readScrollSnapshot(entryKey, routeKey) {
  const safeEntryKey = entryKey || "default";
  const safeRouteKey = routeKey || (typeof window !== "undefined" ? window.location.pathname + window.location.search : "/");

  if (memorySnapshotsByKey.has(safeEntryKey)) {
    return memorySnapshotsByKey.get(safeEntryKey);
  }

  const persisted = loadPersistedSnapshots();
  if (persisted.byKey[safeEntryKey]) {
    memorySnapshotsByKey.set(safeEntryKey, persisted.byKey[safeEntryKey]);
    return persisted.byKey[safeEntryKey];
  }

  if (memorySnapshotsByRoute.has(safeRouteKey)) {
    return memorySnapshotsByRoute.get(safeRouteKey);
  }

  if (persisted.byRoute[safeRouteKey]) {
    return persisted.byRoute[safeRouteKey];
  }

  return null;
}

// ============================================================================
// INSTANT TOP RESET (FOR PUSH NAVIGATION TO NEW PAGE) & ASYNC-SAFE RESTORE (POP)
// ============================================================================

export function cancelPendingScrollRestoration() {
  if (typeof activeRestoreCancel === "function") {
    activeRestoreCancel();
    activeRestoreCancel = null;
  }
}

function instantWindowScroll(x, y) {
  const html = document.documentElement;
  const se = document.scrollingElement || html;
  const prevBehavior = html.style.scrollBehavior;
  html.style.scrollBehavior = "auto";
  try {
    window.scrollTo({ left: x, top: y, behavior: "instant" });
  } catch {
    window.scrollTo(x, y);
  }
  if (se && (Math.abs((se.scrollTop || 0) - y) > 2 || Math.abs((se.scrollLeft || 0) - x) > 2)) {
    try {
      se.scrollTop = y;
      se.scrollLeft = x;
    } catch { }
  }
  html.style.scrollBehavior = prevBehavior;
}

let pendingTopResetTimer = null;

/**
 * Scroll newly pushed page instantaneously to top (0, 0) without triggering smooth animation
 * or corrupting the outgoing page's saved scroll position.
 */
export function resetScrollToTopInstant() {
  if (typeof window === "undefined") return;
  cancelPendingScrollRestoration();
  if (pendingTopResetTimer) {
    clearTimeout(pendingTopResetTimer);
    pendingTopResetTimer = null;
  }
  isRestoringScroll = true;
  instantWindowScroll(0, 0);
  requestAnimationFrame(() => {
    instantWindowScroll(0, 0);
    requestAnimationFrame(() => {
      instantWindowScroll(0, 0);
      pendingTopResetTimer = setTimeout(() => {
        isRestoringScroll = false;
        pendingTopResetTimer = null;
      }, 80);
    });
  });
}

/**
 * Async-safe restoration for POP navigation (Browser Back / Browser Forward / App Back).
 * Waits for async layout/content rendering using rAF + MutationObserver + ResizeObserver
 * until the document and all tracked nested containers reach their saved scroll coordinates.
 */
export function restoreScrollSnapshotAsync(entryKey, routeKey, options = {}) {
  if (typeof window === "undefined") return false;
  if (isDeveloperRoute(window.location.pathname)) return false;

  cancelPendingScrollRestoration();

  const snapshot = readScrollSnapshot(entryKey, routeKey);
  if (!snapshot) return false;

  const targetX = Math.max(0, Number(snapshot.windowX || 0));
  const targetY = Math.max(0, Number(snapshot.windowY || 0));
  const containers = Array.isArray(snapshot.containers) ? snapshot.containers : [];
  const savedFilters = Array.isArray(snapshot.filters) ? snapshot.filters : [];
  let filtersRestoredOnce = false;

  const maxWaitMs = Number(options.maxWaitMs || 1800);
  const settleGraceMs = Number(options.settleGraceMs || 260);
  const startTime = performance.now();

  let cancelled = false;
  let rafId = null;
  let hardTimerId = null;
  let settleStartAt = null;
  let mutationObserver = null;
  let resizeObserver = null;

  const html = document.documentElement;
  const prevHtmlScrollBehavior = html.style.scrollBehavior;
  html.style.scrollBehavior = "auto";
  isRestoringScroll = true;

  const cleanup = () => {
    if (cancelled) return;
    cancelled = true;
    if (rafId) cancelAnimationFrame(rafId);
    if (hardTimerId) clearTimeout(hardTimerId);
    if (mutationObserver) {
      try { mutationObserver.disconnect(); } catch { }
    }
    if (resizeObserver) {
      try { resizeObserver.disconnect(); } catch { }
    }
    window.removeEventListener("wheel", onUserInterrupt, { capture: true });
    window.removeEventListener("touchstart", onUserInterrupt, { capture: true });
    window.removeEventListener("pointerdown", onUserInterrupt, { capture: true });
    window.removeEventListener("keydown", onUserKeyInterrupt, { capture: true });
    html.style.scrollBehavior = prevHtmlScrollBehavior;
    isRestoringScroll = false;
    if (activeRestoreCancel === cleanup) {
      activeRestoreCancel = null;
    }
  };

  const onUserInterrupt = () => {
    cleanup();
  };

  const onUserKeyInterrupt = (e) => {
    if (["ArrowUp", "ArrowDown", "PageUp", "PageDown", "Home", "End", "Space", " "].includes(e.key)) {
      cleanup();
    }
  };

  activeRestoreCancel = cleanup;

  window.addEventListener("wheel", onUserInterrupt, { capture: true, passive: true });
  window.addEventListener("touchstart", onUserInterrupt, { capture: true, passive: true });
  window.addEventListener("pointerdown", onUserInterrupt, { capture: true, passive: true });
  window.addEventListener("keydown", onUserKeyInterrupt, { capture: true, passive: true });

  const applyContainers = () => {
    let allContainersReady = true;
    for (const item of containers) {
      let el = null;
      if (item.scrollId) {
        el =
          document.querySelector(`[data-gbs-scroll-id="${CSS.escape(item.scrollId)}"]`) ||
          document.getElementById(item.scrollId);
      }
      if (!el && item.selector) {
        try {
          el = document.querySelector(item.selector);
        } catch { }
      }
      if (!el) {
        allContainersReady = false;
        continue;
      }
      const prevElBehavior = el.style.scrollBehavior;
      el.style.scrollBehavior = "auto";
      const maxTop = Math.max(0, el.scrollHeight - el.clientHeight);
      const maxLeft = Math.max(0, el.scrollWidth - el.clientWidth);
      const clampedTop = Math.min(item.top, maxTop);
      const clampedLeft = Math.min(item.left, maxLeft);
      el.scrollTop = clampedTop;
      el.scrollLeft = clampedLeft;
      el.style.scrollBehavior = prevElBehavior;
      trackedScrollElements.add(el);

      if (item.top > 0 && maxTop < item.top - 2) {
        allContainersReady = false;
      }
      if (item.left > 0 && maxLeft < item.left - 2) {
        allContainersReady = false;
      }
    }
    return allContainersReady;
  };

  const applyTick = () => {
    if (cancelled) return;

    if (!filtersRestoredOnce && savedFilters.length > 0) {
      restoreSafeFilterControls(savedFilters);
      filtersRestoredOnce = true;
    }

    const se = document.scrollingElement || document.documentElement;
    const maxScrollY = Math.max(0, (se?.scrollHeight || document.documentElement.scrollHeight) - window.innerHeight);
    const maxScrollX = Math.max(0, (se?.scrollWidth || document.documentElement.scrollWidth) - window.innerWidth);

    instantWindowScroll(targetX, targetY);
    const containersReady = applyContainers();

    const { windowX: actualX, windowY: actualY } = getWindowScrollCoords();

    const canReachY = targetY === 0 || maxScrollY >= targetY - 2;
    const canReachX = targetX === 0 || maxScrollX >= targetX - 2;
    const reachedWindow = Math.abs(actualY - targetY) <= 3 && Math.abs(actualX - targetX) <= 3;

    const elapsed = performance.now() - startTime;
    if (canReachY && canReachX && reachedWindow && containersReady) {
      if (settleStartAt === null) {
        settleStartAt = performance.now();
      }
      if (performance.now() - settleStartAt >= settleGraceMs) {
        cleanup();
        return;
      }
    } else {
      settleStartAt = null;
    }

    if (elapsed >= maxWaitMs) {
      cleanup();
      return;
    }

    rafId = requestAnimationFrame(applyTick);
  };

  try {
    const rootEl = document.getElementById("root") || document.body;
    mutationObserver = new MutationObserver(() => {
      if (!cancelled) {
        instantWindowScroll(targetX, targetY);
        applyContainers();
      }
    });
    mutationObserver.observe(rootEl, { childList: true, subtree: true });

    if (typeof ResizeObserver !== "undefined") {
      resizeObserver = new ResizeObserver(() => {
        if (!cancelled) {
          instantWindowScroll(targetX, targetY);
          applyContainers();
        }
      });
      resizeObserver.observe(document.body);
    }
  } catch { }

  hardTimerId = setTimeout(cleanup, maxWaitMs + 100);

  // Execute immediately + loop through rAF until layout settles
  applyTick();
  return true;
}

export function isScrollRestorationInProgress() {
  return isRestoringScroll;
}

// ============================================================================
// IN-APP HISTORY TRAIL & INDEPENDENT PER-DASHBOARD HISTORY
// ============================================================================

function loadNavTrail() {
  try {
    const raw = sessionStorage.getItem(NAV_TRAIL_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed.entries) && typeof parsed.idx === "number") {
        return parsed;
      }
    }
  } catch { }
  return { idx: -1, entries: [] };
}

function saveNavTrail(trail) {
  try {
    if (trail.entries.length > MAX_TRAIL_ENTRIES) {
      const excess = trail.entries.length - MAX_TRAIL_ENTRIES;
      trail.entries = trail.entries.slice(excess);
      trail.idx = Math.max(0, trail.idx - excess);
    }
    sessionStorage.setItem(NAV_TRAIL_STORAGE_KEY, JSON.stringify(trail));
  } catch { }
}

function loadRoleHistories() {
  try {
    const raw = sessionStorage.getItem(ROLE_HISTORY_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === "object") return parsed;
    }
  } catch { }
  return {};
}

function saveRoleHistories(map) {
  try {
    sessionStorage.setItem(ROLE_HISTORY_STORAGE_KEY, JSON.stringify(map));
  } catch { }
}

export function recordNavigationEntry({ key, pathname, search, navigationType }) {
  if (typeof window === "undefined") return;
  if (isDeveloperRoute(pathname)) return;

  const fullPath = `${pathname}${search || ""}`;
  const parsed = parsePortalDashboardRoute(pathname, search);
  const entry = {
    key: key || "default",
    path: fullPath,
    pathname,
    search: search || "",
    role: parsed.role,
    moduleId: parsed.moduleId,
    timestamp: Date.now()
  };

  const trail = loadNavTrail();

  if (trail.entries.length === 0) {
    trail.entries = [entry];
    trail.idx = 0;
  } else if (navigationType === "PUSH") {
    const current = trail.entries[trail.idx];
    if (!current || current.key !== entry.key || current.path !== entry.path) {
      trail.entries = trail.entries.slice(0, trail.idx + 1);
      trail.entries.push(entry);
      trail.idx = trail.entries.length - 1;
    }
  } else if (navigationType === "REPLACE") {
    if (trail.idx >= 0 && trail.idx < trail.entries.length) {
      trail.entries[trail.idx] = entry;
    } else {
      trail.entries.push(entry);
      trail.idx = trail.entries.length - 1;
    }
  } else {
    // POP (Browser Back / Forward or App Back)
    let matchedIdx = -1;
    for (let i = trail.entries.length - 1; i >= 0; i--) {
      if (trail.entries[i].key === entry.key) {
        matchedIdx = i;
        break;
      }
    }
    if (matchedIdx !== -1) {
      trail.idx = matchedIdx;
    } else {
      // Fallback match by path (e.g. after hard refresh)
      let pathIdx = -1;
      for (let i = trail.entries.length - 1; i >= 0; i--) {
        if (trail.entries[i].path === entry.path) {
          pathIdx = i;
          break;
        }
      }
      if (pathIdx !== -1) {
        trail.entries[pathIdx].key = entry.key;
        trail.idx = pathIdx;
      } else {
        trail.entries.push(entry);
        trail.idx = trail.entries.length - 1;
      }
    }
  }

  saveNavTrail(trail);

  // Record independent per-dashboard history
  if (parsed.isPortalDashboard && parsed.role) {
    const histories = loadRoleHistories();
    const roleHist = histories[parsed.role] || {
      role: parsed.role,
      lastPath: parsed.baseDashboardPath,
      lastModuleId: null,
      stack: []
    };
    roleHist.lastPath = fullPath;
    if (parsed.moduleId) {
      roleHist.lastModuleId = parsed.moduleId;
    }
    const lastInStack = roleHist.stack[roleHist.stack.length - 1];
    if (!lastInStack || lastInStack.path !== fullPath) {
      roleHist.stack.push({
        key: entry.key,
        path: fullPath,
        moduleId: parsed.moduleId,
        timestamp: entry.timestamp
      });
      if (roleHist.stack.length > MAX_ROLE_STACK) {
        roleHist.stack = roleHist.stack.slice(-MAX_ROLE_STACK);
      }
    }
    histories[parsed.role] = roleHist;
    saveRoleHistories(histories);
  }
}

export function canGoBackInApp() {
  const trail = loadNavTrail();
  if (trail.idx > 0) return true;
  // Also check React Router's own history state idx when available
  try {
    if (typeof window !== "undefined" && typeof window.history.state?.idx === "number" && window.history.state.idx > 0) {
      return true;
    }
  } catch { }
  return false;
}

export function getInAppNavTrail() {
  return loadNavTrail();
}

export function getRoleNavigationHistory(role) {
  const map = loadRoleHistories();
  return map[String(role || "").toLowerCase()] || null;
}

export function getAllRoleNavigationHistories() {
  return loadRoleHistories();
}

/**
 * Standardized Application Back Navigation:
 * - Saves outgoing scroll snapshot first (so browser Forward returns to exact spot).
 * - Uses React Router navigate(-1) when in-app history exists (identical to Browser Back!).
 * - Falls back safely to the appropriate role dashboard when opened directly with no prior in-app history.
 */
export function performSmartBack(navigate, location = null, explicitFallbackPath = null) {
  const currentPathname = location?.pathname || (typeof window !== "undefined" ? window.location.pathname : "/");
  if (isDeveloperRoute(currentPathname)) {
    if (typeof window !== "undefined") window.history.back();
    return;
  }

  saveActiveScrollSnapshot();

  if (canGoBackInApp()) {
    if (typeof navigate === "function") {
      navigate(-1);
    } else if (typeof window !== "undefined") {
      window.history.back();
    }
    return;
  }

  // Direct URL entry with zero prior in-app history: safe fallback to the appropriate dashboard
  const fallback = explicitFallbackPath || resolveSafeFallbackDashboardPath(currentPathname);
  if (typeof navigate === "function") {
    navigate(fallback);
  } else if (typeof window !== "undefined") {
    window.location.assign(fallback);
  }
}

// Expose read-only inspection API for diagnostics & E2E verification
if (typeof window !== "undefined") {
  window.__GBS_NAV_ENGINE__ = {
    getNavTrail: getInAppNavTrail,
    getRoleHistories: getAllRoleNavigationHistories,
    getActiveKeys: getActiveNavigationKeys,
    readSnapshot: readScrollSnapshot,
    canGoBackInApp,
    isRestoringScroll: isScrollRestorationInProgress
  };
}
