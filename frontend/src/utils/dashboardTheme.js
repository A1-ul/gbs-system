/**
 * Per-Dashboard Blueprint Light Mode Manager
 * Rule: Blueprint Light Mode is ALWAYS OFF (Royal Navy mode active) by default
 * on EVERY dashboard until the user explicitly turns Blueprint Light ON for that dashboard.
 */

const DASHBOARD_THEME_PREFIX = "gbs_blueprint_light_dash_";

export function resolveDashboardThemeKey(pathnameOverride = null) {
  try {
    const rawPath = String(
      pathnameOverride || (typeof window !== "undefined" ? window.location.pathname : "/") || "/"
    )
      .toLowerCase()
      .replace(/\/+$/, "");

    if (rawPath.includes("/developer")) return "developer";
    if (rawPath.includes("/portal/admin") || rawPath.includes("/portal/super_admin")) return "admin";
    if (rawPath.includes("/portal/teacher")) return "teacher";
    if (rawPath.includes("/portal/student")) return "student";
    if (rawPath.includes("/portal/parent")) return "parent";
    if (rawPath.includes("/portal/accountant")) return "accountant";
    if (rawPath.includes("/portal/secretary")) return "secretary";
    if (rawPath.includes("/portal/staff")) return "staff";
    if (rawPath.includes("/portal/hr") || rawPath === "/hr") return "hr";
    if (rawPath.includes("/portal/alumni")) return "alumni";
    const clean = rawPath.replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
    return clean || "home";
  } catch {
    return "home";
  }
}

export function getDashboardTheme(pathnameOverride = null) {
  try {
    const key = resolveDashboardThemeKey(pathnameOverride);
    const saved = localStorage.getItem(`${DASHBOARD_THEME_PREFIX}${key}`);
    return saved === "light" ? "light" : "navy";
  } catch {
    return "navy";
  }
}

export function isBlueprintLightEnabled(pathnameOverride = null) {
  return getDashboardTheme(pathnameOverride) === "light";
}

export function applyDashboardThemeToDocument(theme = null, pathnameOverride = null) {
  try {
    const resolved = theme === "light" || theme === "navy" ? theme : getDashboardTheme(pathnameOverride);
    const isLight = resolved === "light";
    if (typeof document !== "undefined" && document.body) {
      document.body.classList.toggle("gbs-theme-light", isLight);
      document.body.classList.toggle("gbs-theme-navy", !isLight);
    }
    return resolved;
  } catch {
    return "navy";
  }
}

export function setDashboardTheme(theme, pathnameOverride = null) {
  const normalized = theme === "light" ? "light" : "navy";
  const key = resolveDashboardThemeKey(pathnameOverride);
  try {
    localStorage.setItem(`${DASHBOARD_THEME_PREFIX}${key}`, normalized);
    applyDashboardThemeToDocument(normalized, pathnameOverride);
    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("gbs_ui_theme_changed", {
          detail: { theme: normalized, dashboardKey: key, blueprintLight: normalized === "light" }
        })
      );
      window.dispatchEvent(
        new CustomEvent("gbs_theme_changed", {
          detail: { theme: normalized, dashboardKey: key, blueprintLight: normalized === "light" }
        })
      );
    }
  } catch { }
  return normalized;
}
