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
 * Tag overview-only sibling blocks that precede <nav className="role-tab-nav">
 * inside institutional dashboards ONLY when displaying a dedicated module page route
 * (/portal/:role/dashboard/:moduleId), so the requested module renders immediately at top
 * without showing accidental sections of the dashboard overview above it.
 */
function syncOverviewBlockVisibility(isModulePageView, shouldCenterActiveTab = false) {
  if (typeof document === "undefined") return;

  // Clear any previously tagged nodes first
  document.querySelectorAll("[data-gbs-overview-section='true']").forEach((el) => {
    el.removeAttribute("data-gbs-overview-section");
  });

  if (!isModulePageView) return;

  const navs = document.querySelectorAll(".role-tab-nav");
  navs.forEach((nav) => {
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

    // Center the active tab horizontally ONLY on fresh PUSH navigation (never overwrite POP scroll restoration!)
    if (shouldCenterActiveTab) {
      const activeBtn = nav.querySelector(".role-tab-btn.active");
      if (activeBtn && nav.scrollWidth > nav.clientWidth) {
        const desiredLeft = activeBtn.offsetLeft - nav.clientWidth / 2 + activeBtn.clientWidth / 2;
        nav.scrollLeft = Math.max(0, desiredLeft);
      }
    }
  });
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
  useEffect(() => {
    if (typeof window === "undefined" || !("scrollRestoration" in window.history)) return;
    if (isDev) {
      // Do not interfere with Developer Dashboard scroll restoration
      try {
        window.history.scrollRestoration = "auto";
      } catch { }
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

    // Snapshot immediately right before any click on links/buttons/cards that might navigate
    const handlePointerDownCapture = (e) => {
      if (isScrollRestorationInProgress()) return;
      const interactive = e.target?.closest?.(
        "a[href], button, .role-kpi-box, .role-kpi-card, .module-card-link, [role='button']"
      );
      if (interactive) {
        saveScrollSnapshotForEntry(currentEntryKey, currentRouteKey);
      }
    };

    const handlePageHide = () => {
      saveScrollSnapshotForEntry(currentEntryKey, currentRouteKey);
    };

    window.addEventListener("scroll", handleWindowScroll, { passive: true });
    document.addEventListener("scroll", handleCaptureScroll, { capture: true, passive: true });
    document.addEventListener("pointerdown", handlePointerDownCapture, { capture: true, passive: true });
    window.addEventListener("pagehide", handlePageHide);
    window.addEventListener("beforeunload", handlePageHide);

    return () => {
      if (scrollSaveTimerRef.current) {
        clearTimeout(scrollSaveTimerRef.current);
        scrollSaveTimerRef.current = null;
      }
      window.removeEventListener("scroll", handleWindowScroll);
      document.removeEventListener("scroll", handleCaptureScroll, true);
      document.removeEventListener("pointerdown", handlePointerDownCapture, true);
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

    // Synchronize overview block visibility immediately + after lazy dashboard renders
    const centerOnPush = navigationType !== "POP";
    syncOverviewBlockVisibility(isModulePage, centerOnPush);
    const domSyncRaf = requestAnimationFrame(() => {
      syncOverviewBlockVisibility(isModulePage, centerOnPush);
      if (routeInfo.moduleId) {
        setResolvedTitle(resolveModuleTitle(routeInfo.moduleId));
      }
    });
    const domSyncDelayed = setTimeout(() => {
      syncOverviewBlockVisibility(isModulePage, false);
      if (routeInfo.moduleId) {
        setResolvedTitle(resolveModuleTitle(routeInfo.moduleId));
      }
    }, 180);

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

  const handleAppBack = useCallback(() => {
    performSmartBack(navigate, location, routeInfo.baseDashboardPath);
  }, [navigate, location, routeInfo.baseDashboardPath]);

  const handleGoToOverview = useCallback(() => {
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

      <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
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
