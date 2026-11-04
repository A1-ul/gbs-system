/**
 * GBS Universal Navigation Engine
 * Standardized across all dashboards:
 * - Developer / Super Admin Dashboard
 * - School Administrator / Headmaster Dashboard
 * - Teacher Dashboard
 * - Accountant Dashboard
 * - Parent Dashboard
 * - Student Dashboard
 * - Staff & HR Dashboard
 *
 * Ensures every command viewing detailed information opens on a dedicated routed page,
 * preserves scroll position, tab, and search filters, and supports standard browser Back/Forward navigation.
 */

export const RECORD_CATEGORIES = {
  SCHOOL: "school",
  TENANT: "tenant",
  STUDENT: "student",
  TEACHER: "teacher",
  STAFF: "staff",
  USER: "user",
  PAYMENT: "payment",
  INVOICE: "invoice",
  SUBSCRIPTION: "subscription",
  APPLICATION: "application",
  REPORT: "report",
  ACTIVITY: "activity",
  ATTENDANCE: "attendance",
  NOTIFICATION: "notification",
  EXAM: "exam",
  VIDEO: "video"
};

/**
 * Save current dashboard state to sessionStorage for seamless return navigation
 */
export function saveDashboardState(dashboardKey = "current", state = {}) {
  try {
    const payload = {
      ...state,
      scrollX: typeof window !== "undefined" ? window.scrollX : 0,
      scrollY: typeof window !== "undefined" ? window.scrollY : 0,
      timestamp: Date.now()
    };
    sessionStorage.setItem(`gbs_dash_state_${dashboardKey}`, JSON.stringify(payload));
  } catch (_) {}
}

/**
 * Retrieve saved dashboard state
 */
export function getSavedDashboardState(dashboardKey = "current") {
  try {
    const raw = sessionStorage.getItem(`gbs_dash_state_${dashboardKey}`);
    if (raw) return JSON.parse(raw);
  } catch (_) {}
  return null;
}

/**
 * Navigate to a dedicated information page with preserved state & back reference
 * @param {Function} navigate - React Router navigate hook
 * @param {string} category - Entity type (school, student, payment, etc.)
 * @param {string|number} id - Record identifier
 * @param {object} recordData - Full record payload
 * @param {object} options - Optional dashboard context (dashboardKey, activeTab, filters)
 */
export function navigateToDetail(navigate, category, id, recordData = null, options = {}) {
  if (!navigate) return;
  const safeCat = String(category || "generic").toLowerCase().trim();
  const safeId = encodeURIComponent(String(id || recordData?.id || Date.now()));

  // Preserve dashboard state
  if (options.dashboardKey) {
    saveDashboardState(options.dashboardKey, {
      activeTab: options.activeTab || null,
      filters: options.filters || null,
      searchQuery: options.searchQuery || null
    });
  }

  // Backup active record in sessionStorage for refresh resiliency
  if (recordData) {
    try {
      sessionStorage.setItem(`gbs_detail_${safeCat}_${safeId}`, JSON.stringify(recordData));
      sessionStorage.setItem("gbs_last_viewed_detail", JSON.stringify({
        category: safeCat,
        id: safeId,
        record: recordData,
        timestamp: new Date().toISOString()
      }));
    } catch (_) {}
  }

  const targetPath = `/details/${safeCat}/${safeId}`;
  navigate(targetPath, {
    state: {
      category: safeCat,
      id: safeId,
      record: recordData,
      fromPath: typeof window !== "undefined" ? window.location.pathname + window.location.search : "/",
      dashboardKey: options.dashboardKey || null,
      activeTab: options.activeTab || null
    }
  });
}

