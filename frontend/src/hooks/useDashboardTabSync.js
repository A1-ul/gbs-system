import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import {
  parsePortalDashboardRoute,
  saveActiveScrollSnapshot,
  isDeveloperRoute
} from "../utils/globalNavigationScrollManager";

/**
 * Unified React Router-backed Tab & Module Page Navigation Hook for Institutional Dashboards.
 *
 * - Dashboard Overview route:      /portal/:role/dashboard
 * - Dedicated Module Page route:   /portal/:role/dashboard/:moduleId
 * - Backward compatible with:      /portal/:role/dashboard?tab=<id>&full=1
 *
 * Clicking ANY module tab, KPI card, header module action, or quick link saves the outgoing
 * page's exact scroll position (window + nested scrollable containers) and navigates via
 * React Router to the dedicated module route without remounting the dashboard component.
 * Browser Back/Forward and App Back return to the exact previous page and restore scroll.
 */
export function useDashboardTabSync(defaultTab, storageKey, normalizeTab = null, options = {}) {
  const location = useLocation();
  const navigate = useNavigate();
  const params = useParams();

  const initialTabOption = options?.initialTab || null;

  const resolveNormalized = useCallback(
    (rawTab) => {
      const candidate = String(rawTab || defaultTab);
      return typeof normalizeTab === "function" ? normalizeTab(candidate) : candidate;
    },
    [defaultTab, normalizeTab]
  );

  const routeInfo = useMemo(
    () => parsePortalDashboardRoute(location.pathname, location.search),
    [location.pathname, location.search]
  );

  const urlModuleId = params?.moduleId || routeInfo.rawPathModuleId || null;
  const searchParams = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const queryTab = searchParams.get("tab") || null;
  const queryFull = searchParams.get("full") === "1" || searchParams.get("fullpage") === "1";

  const isModulePage = !isDeveloperRoute(location.pathname) && (Boolean(urlModuleId) || queryFull);

  // Remembered tab for Overview preview when on /portal/:role/dashboard without a module slug
  const [overviewTab, setOverviewTab] = useState(() => {
    if (urlModuleId) return resolveNormalized(urlModuleId);
    if (queryTab) return resolveNormalized(queryTab);
    if (initialTabOption) return resolveNormalized(initialTabOption);
    try {
      if (storageKey) {
        const saved = sessionStorage.getItem(storageKey);
        if (saved) return resolveNormalized(saved);
      }
    } catch { }
    return resolveNormalized(defaultTab);
  });

  // Active tab is ALWAYS driven deterministically by the React Router URL when present
  const activeTab = useMemo(() => {
    if (urlModuleId) return resolveNormalized(urlModuleId);
    if (queryTab) return resolveNormalized(queryTab);
    return resolveNormalized(overviewTab);
  }, [urlModuleId, queryTab, overviewTab, resolveNormalized]);

  // Keep sessionStorage synced with activeTab for safe continuity
  useEffect(() => {
    try {
      if (storageKey && activeTab) {
        sessionStorage.setItem(storageKey, activeTab);
      }
    } catch { }
    if (urlModuleId || queryTab) {
      setOverviewTab(activeTab);
    }
  }, [activeTab, storageKey, urlModuleId, queryTab]);

  const latestNavContextRef = useRef({ routeInfo, location, resolveNormalized, storageKey });
  latestNavContextRef.current = { routeInfo, location, resolveNormalized, storageKey };

  /**
   * Open a dashboard module as a dedicated internal application page route:
   *   /portal/:role/dashboard/:moduleId
   * Always snapshots outgoing scroll position before navigating via React Router.
   * Ref-backed so listeners registered in mount-only effects never suffer stale closures.
   */
  const setActiveTab = useCallback(
    (tab, navOptions = {}) => {
      const {
        routeInfo: curRouteInfo,
        location: curLocation,
        resolveNormalized: curResolve,
        storageKey: curStorageKey
      } = latestNavContextRef.current;

      const cleanTab = curResolve(tab);
      setOverviewTab(cleanTab);

      if (curStorageKey) {
        try {
          sessionStorage.setItem(curStorageKey, cleanTab);
        } catch { }
      }

      // Snapshot outgoing window & container scroll synchronously before leaving
      saveActiveScrollSnapshot();

      if (curRouteInfo.isPortalDashboard && curRouteInfo.baseDashboardPath && !curRouteInfo.isDeveloper) {
        const nextSearch = new URLSearchParams(curLocation.search);
        nextSearch.delete("tab");
        nextSearch.delete("full");
        nextSearch.delete("fullpage");
        const queryString = nextSearch.toString();

        const targetPath = `${curRouteInfo.baseDashboardPath}/${encodeURIComponent(cleanTab)}${queryString ? `?${queryString}` : ""}`;
        const currentFull = `${curLocation.pathname}${curLocation.search}`;

        if (currentFull !== targetPath) {
          navigate(targetPath, {
            replace: Boolean(navOptions.replace),
            state: {
              ...(navOptions.state || {}),
              moduleId: cleanTab,
              role: curRouteInfo.role,
              fromPath: currentFull
            }
          });
        }
      } else {
        // Fallback for non-portal routes that may reuse this hook
        const nextSearch = new URLSearchParams(curLocation.search);
        nextSearch.set("tab", cleanTab);
        if (navOptions.full === true) nextSearch.set("full", "1");
        if (navOptions.full === false) nextSearch.delete("full");
        const target = `${curLocation.pathname}?${nextSearch.toString()}`;
        if (target !== `${curLocation.pathname}${curLocation.search}`) {
          navigate(target, { replace: Boolean(navOptions.replace) });
        }
      }

      window.dispatchEvent(
        new CustomEvent("gbs_dashboard_tab_changed", {
          detail: { tab: cleanTab, full: true, modulePage: true }
        })
      );
    },
    [navigate]
  );

  const navigateToOverview = useCallback(() => {
    saveActiveScrollSnapshot();
    if (routeInfo.isPortalDashboard && routeInfo.baseDashboardPath) {
      navigate(routeInfo.baseDashboardPath);
    }
  }, [routeInfo, navigate]);

  const toggleFullPageMode = useCallback(
    (forceState = null) => {
      const next = typeof forceState === "boolean" ? forceState : !isModulePage;
      if (next) {
        setActiveTab(activeTab);
      } else {
        navigateToOverview();
      }
    },
    [isModulePage, setActiveTab, activeTab, navigateToOverview]
  );

  // Kept for backward compatibility if explicitly invoked by an existing button
  const openTabInNewPage = useCallback(
    (targetTab = activeTab) => {
      setActiveTab(targetTab);
    },
    [activeTab, setActiveTab]
  );

  return {
    activeTab,
    setActiveTab,
    isModulePage,
    activeModuleId: urlModuleId,
    navigateToOverview,
    isFullPageMode: isModulePage,
    setIsFullPageMode: toggleFullPageMode,
    openTabInNewPage
  };
}

export default useDashboardTabSync;
