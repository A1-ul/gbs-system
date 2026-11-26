import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useLocation, useNavigate, useNavigationType, useParams } from "react-router-dom";
import {
  parsePortalDashboardRoute,
  saveActiveScrollSnapshot,
  registerCurrentOverviewTab,
  readSavedOverviewTab,
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
 * page's exact scroll position (window + nested scrollable containers + overview tab context)
 * and navigates via React Router to the dedicated module route without remounting the dashboard.
 * Browser Back/Forward and App Back return to the exact previous page/tab and restore scroll.
 */
export function useDashboardTabSync(defaultTab, storageKey, normalizeTab = null, options = {}) {
  const location = useLocation();
  const navigate = useNavigate();
  const navigationType = useNavigationType();
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

  // Remembered Overview tab when on /portal/:role/dashboard (strictly preserved when opening module pages!)
  const [overviewTab, setOverviewTab] = useState(() => {
    if (initialTabOption) return resolveNormalized(initialTabOption);
    try {
      const savedSnapTab = readSavedOverviewTab(location.key, `${location.pathname}${location.search}`, storageKey);
      if (savedSnapTab) return resolveNormalized(savedSnapTab);
    } catch { }
    return resolveNormalized(defaultTab);
  });

  // Restore exact saved Overview tab when returning via POP (Browser Back/Forward or App Back)
  useEffect(() => {
    if (navigationType === "POP" && !urlModuleId && !queryTab && storageKey) {
      const savedSnapTab = readSavedOverviewTab(location.key, `${location.pathname}${location.search}`, storageKey);
      if (savedSnapTab) {
        const normalized = resolveNormalized(savedSnapTab);
        setOverviewTab((prev) => (prev === normalized ? prev : normalized));
      }
    }
  }, [navigationType, urlModuleId, queryTab, location.key, location.pathname, location.search, storageKey, resolveNormalized]);

  // Active tab is ALWAYS driven deterministically by the React Router URL when on a module page
  const activeTab = useMemo(() => {
    if (urlModuleId) return resolveNormalized(urlModuleId);
    if (queryTab) return resolveNormalized(queryTab);
    return resolveNormalized(overviewTab);
  }, [urlModuleId, queryTab, overviewTab, resolveNormalized]);

  // Keep sessionStorage and scroll manager synced with current overviewTab (NEVER overwrite overviewTab when viewing :moduleId!)
  useEffect(() => {
    try {
      if (storageKey && activeTab) {
        sessionStorage.setItem(storageKey, activeTab);
      }
      if (storageKey && overviewTab && !urlModuleId) {
        registerCurrentOverviewTab(storageKey, overviewTab);
      }
    } catch { }
  }, [activeTab, overviewTab, storageKey, urlModuleId]);

  const latestNavContextRef = useRef({ routeInfo, location, resolveNormalized, storageKey, overviewTab });
  latestNavContextRef.current = { routeInfo, location, resolveNormalized, storageKey, overviewTab };

  /**
   * Open a dashboard module as a dedicated internal application page route:
   *   /portal/:role/dashboard/:moduleId
   * Always snapshots outgoing scroll position + overview context before navigating via React Router.
   * Ref-backed so listeners registered in mount-only effects never suffer stale closures.
   */
  const setActiveTab = useCallback(
    (tab, navOptions = {}) => {
      const {
        routeInfo: curRouteInfo,
        location: curLocation,
        resolveNormalized: curResolve,
        storageKey: curStorageKey,
        overviewTab: curOverviewTab
      } = latestNavContextRef.current;

      const cleanTab = curResolve(tab);

      if (curStorageKey) {
        try {
          // Record the OUTGOING overview tab before snapshotting so Back restores exact previous context
          if (!curRouteInfo.isModulePage && curOverviewTab) {
            registerCurrentOverviewTab(curStorageKey, curOverviewTab);
          }
          sessionStorage.setItem(curStorageKey, cleanTab);
        } catch { }
      }

      // Snapshot outgoing window & container scroll synchronously BEFORE leaving
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
        setOverviewTab(cleanTab);
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
