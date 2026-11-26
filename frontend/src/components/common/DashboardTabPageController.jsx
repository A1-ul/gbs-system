import React, { useEffect, useLayoutEffect, useRef, useState, useCallback } from "react";
import { useLocation, useNavigate, useNavigationType } from "react-router-dom";
import { applyDashboardThemeToDocument } from "../../utils/dashboardTheme";
import { getActiveSchoolName, getActiveSchoolLogo } from "../../utils/schoolBranding";
import {
  isDeveloperRoute,
  parsePortalDashboardRoute,
  getInstitutionalPortalLabel,
  resolveModuleTitle,
  saveScrollSnapshotForEntry,
  hasSnapshotForEntry,
  saveActiveScrollSnapshot,
  setActiveNavigationKeys,
  restoreScrollSnapshotAsync,
  resetScrollToTopInstant,
  cancelPendingScrollRestoration,
  registerScrolledContainer,
  recordNavigationEntry,
  performSmartBack,
  isScrollRestorationInProgress
} from "../../utils/globalNavigationScrollManager";

/**
 * Find primary top-level dashboard navigation containers (strictly excluding nested sub-tab bars
 * inside workspace cards or modals).
 */
function getPrimaryDashboardTabNavs() {
  if (typeof document === "undefined") return [];
  return Array.from(document.querySelectorAll("nav.role-tab-nav")).filter(
    (nav) => !nav.closest(".role-workspace-card, .modal-box, [role='dialog']")
  );
}

/**
 * Tag overview-only sibling blocks AND primary overview tab wall inside institutional dashboards
 * ONLY when displaying a dedicated module page route (/portal/:role/dashboard/:moduleId),
 * so the requested module renders immediately at top as a true dedicated application page.
 */
function syncOverviewBlockVisibility(isModulePageView) {
  if (typeof document === "undefined") return;

  // Clear any previously tagged nodes first
  document.querySelectorAll("[data-gbs-overview-section='true']").forEach((el) => {
    el.removeAttribute("data-gbs-overview-section");
  });
  document.querySelectorAll("[data-gbs-primary-tab-nav='true']").forEach((el) => {
    el.removeAttribute("data-gbs-primary-tab-nav");
  });

  if (!isModulePageView) return;

  const navs = getPrimaryDashboardTabNavs();
  navs.forEach((nav) => {
    nav.setAttribute("data-gbs-primary-tab-nav", "true");
    const parent = nav.parentElement;
    if (!parent) return;

    let sibling = nav.previousElementSibling;
    while (sibling) {
      const tag = sibling.tagName;
      const cls = String(sibling.className || "");
      const roleAttr = sibling.getAttribute("role") || "";
      const isModalOrDialog =
        roleAttr === "dialog" ||
        cls.includes("modal") ||
        cls.includes("overlay") ||
        sibling.hasAttribute("data-gbs-keep-in-module");

      // Preserve live inline feedback banners (small alerts right above tabs) & headers & modals
      const isHeader = tag === "HEADER" || cls.includes("role-header");
      const textLen = (sibling.textContent || "").trim().length;
      const isFeedbackAlert =
        !isHeader &&
        !isModalOrDialog &&
        sibling.style?.borderRadius === "10px" &&
        textLen > 0 &&
        textLen < 360 &&
        (sibling.textContent.includes("✅") || sibling.textContent.includes("⚠️"));

      if (!isHeader && !isModalOrDialog && !isFeedbackAlert) {
        sibling.setAttribute("data-gbs-overview-section", "true");
      }
      sibling = sibling.previousElementSibling;
    }
  });
}

function collectDashboardModuleMenuItems() {
  const navs = getPrimaryDashboardTabNavs();
  const primary = navs[0];
  if (!primary) return [];
  const buttons = Array.from(primary.querySelectorAll("button.role-tab-btn"));
  return buttons
    .map((btn, idx) => ({
      index: idx,
      label: (btn.textContent || "").replace(/\s+/g, " ").trim(),
      isActive: btn.classList.contains("active")
    }))
    .filter((item) => item.label.length > 0);
}

/**
 * DashboardTabPageController (Global Navigation & Scroll Restoration Controller)
 *
 * Mounted once inside AppRouter's <BrowserRouter>:
 * - Manages manual scroll restoration across all institutional dashboards & module pages.
 * - Saves outgoing window + nested container scroll positions before every navigation.
 * - Restores exact saved scroll positions on Browser Back, Browser Forward, and App Back (POP).
 * - Displays a clean sticky Module Navigation Bar on /portal/:role/dashboard/:moduleId routes.
 * - STRICTLY EXCLUDES the Developer Dashboard (/developer*, /developer-control-center*).
 */
export default function DashboardTabPageController() {
  const location = useLocation();
  const navigate = useNavigate();
  const navigationType = useNavigationType();

  const isDev = isDeveloperRoute(location.pathname);
  const routeInfo = parsePortalDashboardRoute(location.pathname, location.search);
  const isModulePage = !isDev && routeInfo.isPortalDashboard && routeInfo.isModulePage;

  const [schoolName, setSchoolName] = useState(() => getActiveSchoolName({ isDeveloperContext: false }));
  const [schoolLogo, setSchoolLogo] = useState(() => getActiveSchoolLogo({ isDeveloperContext: false }));
  const [resolvedTitle, setResolvedTitle] = useState(() =>
    routeInfo.moduleId ? resolveModuleTitle(routeInfo.moduleId) : ""
  );
  const [moduleMenuOpen, setModuleMenuOpen] = useState(false);
  const [moduleMenuItems, setModuleMenuItems] = useState([]);
  const switcherMenuRef = useRef(null);

  const prevLocationRef = useRef({
    key: location.key,
    routeKey: `${location.pathname}${location.search}`,
    pathname: location.pathname
  });
  const scrollSaveTimerRef = useRef(null);

  // Keep institutional branding fresh in the module page bar
  useEffect(() => {
    const syncBranding = () => {
      setSchoolName(getActiveSchoolName({ isDeveloperContext: false }));
      setSchoolLogo(getActiveSchoolLogo({ isDeveloperContext: false }));
    };
    window.addEventListener("gbs_school_branding_updated", syncBranding);
    window.addEventListener("gbs_school_name_updated", syncBranding);
    window.addEventListener("gbs_school_logo_updated", syncBranding);
    window.addEventListener("gbs_custom_logo_updated", syncBranding);
    window.addEventListener("storage", syncBranding);
    return () => {
      window.removeEventListener("gbs_school_branding_updated", syncBranding);
      window.removeEventListener("gbs_school_name_updated", syncBranding);
      window.removeEventListener("gbs_school_logo_updated", syncBranding);
      window.removeEventListener("gbs_custom_logo_updated", syncBranding);
      window.removeEventListener("storage", syncBranding);
    };
  }, []);

  // Configure browser history.scrollRestoration = "manual" for non-developer routes
  // (DeveloperDashboard manages its own self-contained manual scroll restoration without interference)
  useEffect(() => {
    if (typeof window === "undefined" || !("scrollRestoration" in window.history)) return;
    if (isDev) {
      return;
    }
    try {
      window.history.scrollRestoration = "manual";
    } catch { }
  }, [isDev]);

  // Continuously capture window & nested scrollable container scroll positions (throttled)
  useEffect(() => {
    if (typeof window === "undefined" || isDev) return undefined;

    const currentEntryKey = location.key || "default";
    const currentRouteKey = `${location.pathname}${location.search}`;

    const scheduleSave = () => {
      if (isScrollRestorationInProgress()) return;
      // Synchronously update in-memory snapshot immediately so rapid Browser Back never misses a pixel
      saveScrollSnapshotForEntry(currentEntryKey, currentRouteKey, null, false);
      if (scrollSaveTimerRef.current) clearTimeout(scrollSaveTimerRef.current);
      scrollSaveTimerRef.current = setTimeout(() => {
        if (!isScrollRestorationInProgress()) {
          saveScrollSnapshotForEntry(currentEntryKey, currentRouteKey, null, true);
        }
      }, 60);
    };

    const handleWindowScroll = () => {
      scheduleSave();
    };

    const handleCaptureScroll = (e) => {
      const target = e.target;
      if (target && target !== document && target !== document.documentElement && target !== document.body) {
        registerScrolledContainer(target);
      }
      scheduleSave();
    };

    // Snapshot immediately right before any click/touch/keyboard action that might navigate
    const handlePreNavCapture = (e) => {
      if (isScrollRestorationInProgress()) return;
      const interactive = e.target?.closest?.(
        "a[href], button, .role-kpi-box, .role-kpi-card, .module-card-link, [role='button']"
      );
      if (interactive) {
        saveScrollSnapshotForEntry(currentEntryKey, currentRouteKey);
      }
    };

    const handleKeyDownCapture = (e) => {
      if (e.key !== "Enter" && e.key !== " ") return;
      handlePreNavCapture(e);
    };

    const handlePageHide = () => {
      saveScrollSnapshotForEntry(currentEntryKey, currentRouteKey);
    };

    window.addEventListener("scroll", handleWindowScroll, { passive: true });
    document.addEventListener("scroll", handleCaptureScroll, { capture: true, passive: true });
    document.addEventListener("pointerdown", handlePreNavCapture, { capture: true, passive: true });
    document.addEventListener("touchstart", handlePreNavCapture, { capture: true, passive: true });
    document.addEventListener("keydown", handleKeyDownCapture, { capture: true, passive: true });
    window.addEventListener("pagehide", handlePageHide);
    window.addEventListener("beforeunload", handlePageHide);

    return () => {
      if (scrollSaveTimerRef.current) {
        clearTimeout(scrollSaveTimerRef.current);
        scrollSaveTimerRef.current = null;
      }
      window.removeEventListener("scroll", handleWindowScroll);
      document.removeEventListener("scroll", handleCaptureScroll, true);
      document.removeEventListener("pointerdown", handlePreNavCapture, true);
      document.removeEventListener("touchstart", handlePreNavCapture, true);
      document.removeEventListener("keydown", handleKeyDownCapture, true);
      window.removeEventListener("pagehide", handlePageHide);
      window.removeEventListener("beforeunload", handlePageHide);
    };
  }, [isDev, location.key, location.pathname, location.search]);

  // Core Route Transition Handler: body class, theme sync, history trail, and scroll restore / reset
  useLayoutEffect(() => {
    const currentEntryKey = location.key || "default";
    const currentRouteKey = `${location.pathname}${location.search}`;
    const prev = prevLocationRef.current;

    applyDashboardThemeToDocument(location.pathname);

    if (isDev) {
      // Strictly exclude Developer Dashboard from module-page body classes and global scroll manager
      cancelPendingScrollRestoration();
      document.body.classList.remove("gbs-module-page-view", "gbs-tab-page-view", "gbs-full-display-mode");
      syncOverviewBlockVisibility(false);
      prevLocationRef.current = { key: currentEntryKey, routeKey: currentRouteKey, pathname: location.pathname };
      return;
    }

    // Only initialize an outgoing snapshot if it never captured one yet (never overwrite pre-navigation snapshots after DOM commit!)
    if (prev.key !== currentEntryKey || prev.routeKey !== currentRouteKey) {
      if (!isDeveloperRoute(prev.pathname) && !hasSnapshotForEntry(prev.key)) {
        saveScrollSnapshotForEntry(prev.key, prev.routeKey, {
          windowX: 0,
          windowY: 0,
          containers: [],
          pathname: prev.pathname,
          search: "",
          role: null,
          moduleId: null,
          savedAt: Date.now()
        }, true);
      }
    }

    // Update active navigation keys & record in-app + per-dashboard history
    setActiveNavigationKeys(currentEntryKey, currentRouteKey);
    recordNavigationEntry({
      key: currentEntryKey,
      pathname: location.pathname,
      search: location.search,
      navigationType
    });

    // Apply or remove clean Dedicated Module Page layout class
    document.body.classList.toggle("gbs-module-page-view", isModulePage);
    document.body.classList.remove("gbs-tab-page-view", "gbs-full-display-mode");

    // Close Switch Module dropdown on any route change
    setModuleMenuOpen(false);

    // Synchronize overview block visibility immediately + after lazy dashboard renders
    syncOverviewBlockVisibility(isModulePage);
    const domSyncRaf = requestAnimationFrame(() => {
      syncOverviewBlockVisibility(isModulePage);
      if (routeInfo.moduleId) {
        setResolvedTitle(resolveModuleTitle(routeInfo.moduleId));
        setModuleMenuItems(collectDashboardModuleMenuItems());
      }
    });
    const domSyncDelayed = setTimeout(() => {
      syncOverviewBlockVisibility(isModulePage);
      if (routeInfo.moduleId) {
        setResolvedTitle(resolveModuleTitle(routeInfo.moduleId));
        setModuleMenuItems(collectDashboardModuleMenuItems());
      }
    }, 200);

    // Handle Scroll Position:
    // - POP (Browser Back / Forward or Application Back): restore exact previous window + container scroll!
    // - PUSH (Opening a new page/module): scroll cleanly to top (0, 0) immediately!
    // - REPLACE: preserve current scroll unless pathname changed to a different module/page.
    if (navigationType === "POP") {
      restoreScrollSnapshotAsync(currentEntryKey, currentRouteKey);
    } else if (navigationType === "PUSH") {
      if (prev.routeKey !== currentRouteKey) {
        resetScrollToTopInstant();
      }
    } else if (navigationType === "REPLACE" && prev.pathname !== location.pathname) {
      resetScrollToTopInstant();
    }

    prevLocationRef.current = { key: currentEntryKey, routeKey: currentRouteKey, pathname: location.pathname };

    return () => {
      cancelAnimationFrame(domSyncRaf);
      clearTimeout(domSyncDelayed);
    };
  }, [isDev, isModulePage, location.key, location.pathname, location.search, navigationType, routeInfo.moduleId]);

  // Keep overview blocks tagged even if React lazily mounts dashboard content after navigation
  useEffect(() => {
    if (isDev || !isModulePage) return undefined;
    const rootEl = document.getElementById("root");
    if (!rootEl) return undefined;

    let rafPending = null;
    const observer = new MutationObserver(() => {
      if (rafPending) return;
      rafPending = requestAnimationFrame(() => {
        rafPending = null;
        syncOverviewBlockVisibility(true);
      });
    });
    observer.observe(rootEl, { childList: true, subtree: true });
    return () => {
      if (rafPending) cancelAnimationFrame(rafPending);
      observer.disconnect();
    };
  }, [isDev, isModulePage]);

  // Close module switcher menu on outside click or Escape key
  useEffect(() => {
    if (!moduleMenuOpen) return undefined;
    const onOutsideClick = (e) => {
      if (switcherMenuRef.current && !switcherMenuRef.current.contains(e.target)) {
        setModuleMenuOpen(false);
      }
    };
    const onKeyDown = (e) => {
      if (e.key === "Escape") setModuleMenuOpen(false);
    };
    document.addEventListener("mousedown", onOutsideClick);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onOutsideClick);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [moduleMenuOpen]);

  const handleToggleModuleSwitcher = useCallback(() => {
    setModuleMenuItems(collectDashboardModuleMenuItems());
    setModuleMenuOpen((prev) => !prev);
  }, []);

  const handleSwitchModuleByIndex = useCallback((idx) => {
    setModuleMenuOpen(false);
    const navs = getPrimaryDashboardTabNavs();
    const primary = navs[0];
    if (!primary) return;
    const buttons = primary.querySelectorAll("button.role-tab-btn");
    const targetBtn = buttons[idx];
    if (targetBtn) {
      saveActiveScrollSnapshot();
      targetBtn.click();
    }
  }, []);

  const handleAppBack = useCallback(() => {
    setModuleMenuOpen(false);
    performSmartBack(navigate, location, routeInfo.baseDashboardPath);
  }, [navigate, location, routeInfo.baseDashboardPath]);

  const handleGoToOverview = useCallback(() => {
    setModuleMenuOpen(false);
    saveActiveScrollSnapshot();
    if (routeInfo.baseDashboardPath) {
      navigate(routeInfo.baseDashboardPath);
    }
  }, [navigate, routeInfo.baseDashboardPath]);

  if (isDev || !isModulePage) {
    return null;
  }

  const portalLabel = getInstitutionalPortalLabel(routeInfo.role || location.pathname);
  const displayModuleTitle = resolvedTitle || resolveModuleTitle(routeInfo.moduleId);

  return (
    <div
      data-gbs-module-page-bar="true"
      data-testid="gbs-module-page-bar"
      className="gbs-module-page-bar"
      style={{
        position: "sticky",
        top: 0,
        zIndex: 9995,
        background: "linear-gradient(135deg, rgba(6, 15, 30, 0.98) 0%, rgba(12, 30, 62, 0.98) 100%)",
        borderBottom: "2px solid #d4af37",
        padding: "8px clamp(10px, 2vw, 22px)",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        flexWrap: "wrap",
        gap: "10px",
        boxShadow: "0 8px 24px rgba(2, 6, 23, 0.55)",
        color: "#f8fafc"
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap", minWidth: 0 }}>
        <button
          type="button"
          onClick={handleAppBack}
          data-testid="module-page-back-btn"
          aria-label="Return to previous page"
          style={{
            background: "linear-gradient(135deg, #2563eb, #1d4ed8)",
            color: "#ffffff",
            border: "1px solid rgba(147, 197, 253, 0.55)",
            borderRadius: "8px",
            padding: "7px 14px",
            minHeight: "38px",
            fontSize: "0.82rem",
            fontWeight: 800,
            cursor: "pointer",
            display: "inline-flex",
            alignItems: "center",
            gap: "6px",
            flexShrink: 0
          }}
        >
          ← Back
        </button>

        {schoolLogo && (
          <img
            src={schoolLogo}
            alt="School Crest"
            style={{
              width: "30px",
              height: "30px",
              borderRadius: "7px",
              objectFit: "contain",
              background: "rgba(15, 23, 42, 0.9)",
              border: "1.5px solid #d4af37",
              padding: "2px",
              flexShrink: 0
            }}
            onError={(e) => { e.target.style.display = "none"; }}
          />
        )}

        <div style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
          <span
            style={{
              fontSize: "0.66rem",
              fontWeight: 900,
              color: "#f6dd84",
              letterSpacing: "0.5px",
              textTransform: "uppercase",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis"
            }}
          >
            {String(schoolName || "OFFICIAL INSTITUTION").toUpperCase()} • {portalLabel}
          </span>
          <strong
            data-testid="module-page-title"
            style={{
              fontSize: "0.95rem",
              color: "#ffffff",
              lineHeight: 1.2,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis"
            }}
          >
            {displayModuleTitle}
          </strong>
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap", position: "relative" }} ref={switcherMenuRef}>
        <button
          type="button"
          onClick={handleToggleModuleSwitcher}
          data-testid="module-page-switcher-btn"
          aria-expanded={moduleMenuOpen}
          aria-label="Switch dashboard module"
          style={{
            background: moduleMenuOpen ? "rgba(56, 189, 248, 0.28)" : "rgba(15, 23, 42, 0.82)",
            border: "1px solid rgba(56, 189, 248, 0.6)",
            color: "#bae6fd",
            borderRadius: "8px",
            padding: "7px 12px",
            minHeight: "38px",
            fontSize: "0.78rem",
            fontWeight: 800,
            cursor: "pointer",
            display: "inline-flex",
            alignItems: "center",
            gap: "6px"
          }}
        >
          ☰ Switch Module {moduleMenuOpen ? "▴" : "▾"}
        </button>

        {moduleMenuOpen && moduleMenuItems.length > 0 && (
          <div
            data-testid="module-page-switcher-menu"
            className="gbs-module-switcher-menu"
            style={{
              position: "absolute",
              top: "calc(100% + 8px)",
              right: 0,
              width: "min(340px, 92vw)",
              maxHeight: "min(70dvh, 480px)",
              overflowY: "auto",
              background: "linear-gradient(160deg, #061224 0%, #0d1f3d 100%)",
              border: "1.5px solid #d4af37",
              borderRadius: "12px",
              padding: "8px",
              boxShadow: "0 18px 42px rgba(2, 6, 23, 0.85)",
              zIndex: 10005,
              display: "flex",
              flexDirection: "column",
              gap: "4px"
            }}
          >
            <div style={{ fontSize: "0.68rem", fontWeight: 900, color: "#f6dd84", textTransform: "uppercase", padding: "4px 8px 6px", borderBottom: "1px solid rgba(212, 175, 55, 0.25)" }}>
              {portalLabel} — Portal Modules ({moduleMenuItems.length})
            </div>
            {moduleMenuItems.map((item) => (
              <button
                key={`${item.index}-${item.label}`}
                type="button"
                onClick={() => handleSwitchModuleByIndex(item.index)}
                style={{
                  textAlign: "left",
                  padding: "9px 11px",
                  borderRadius: "8px",
                  border: item.isActive ? "1px solid #d4af37" : "1px solid transparent",
                  background: item.isActive ? "rgba(212, 175, 55, 0.22)" : "rgba(15, 23, 42, 0.55)",
                  color: item.isActive ? "#fef08a" : "#e2e8f0",
                  fontSize: "0.82rem",
                  fontWeight: item.isActive ? 800 : 600,
                  cursor: "pointer"
                }}
              >
                {item.isActive ? "● " : ""}{item.label}
              </button>
            ))}
          </div>
        )}

        <button
          type="button"
          onClick={handleGoToOverview}
          data-testid="module-page-overview-btn"
          aria-label="Return to Dashboard Overview"
          style={{
            background: "rgba(212, 175, 55, 0.16)",
            border: "1px solid #d4af37",
            color: "#f6dd84",
            borderRadius: "8px",
            padding: "7px 13px",
            minHeight: "38px",
            fontSize: "0.78rem",
            fontWeight: 800,
            cursor: "pointer"
          }}
        >
          🏠 Dashboard Overview
        </button>
      </div>
    </div>
  );
}
