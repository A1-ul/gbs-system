import { useState, useEffect, useCallback } from "react";

/**
 * Reusable tab + Full-Page Display state manager for role dashboards.
 * Keeps ?tab=<tabId>&full=<0|1> synchronized with URL query params, browser history,
 * sessionStorage, and allows any tab to expand in place or open in a dedicated full-page browser tab.
 */
export function useDashboardTabSync(defaultTab, storageKey, normalizeTab = null) {
  const resolveNormalized = useCallback(
    (rawTab) => {
      const candidate = String(rawTab || defaultTab);
      return typeof normalizeTab === "function" ? normalizeTab(candidate) : candidate;
    },
    [defaultTab, normalizeTab]
  );

  const [activeTab, setActiveTabState] = useState(() => {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const urlTab = urlParams.get("tab");
      if (urlTab) return resolveNormalized(urlTab);
      if (storageKey) {
        const saved = sessionStorage.getItem(storageKey);
        if (saved) return resolveNormalized(saved);
      }
    } catch { }
    return resolveNormalized(defaultTab);
  });

  const [isFullPageMode, setIsFullPageMode] = useState(() => {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      return urlParams.get("full") === "1";
    } catch {
      return false;
    }
  });

  const syncUrlParams = useCallback((nextTab, nextFull) => {
    try {
      const url = new URL(window.location.href);
      let changed = false;
      if (nextTab && url.searchParams.get("tab") !== nextTab) {
        url.searchParams.set("tab", nextTab);
        changed = true;
      }
      if (nextFull && url.searchParams.get("full") !== "1") {
        url.searchParams.set("full", "1");
        changed = true;
      } else if (!nextFull && url.searchParams.has("full")) {
        url.searchParams.delete("full");
        changed = true;
      }
      if (changed) {
        window.history.pushState({ tab: nextTab, full: Boolean(nextFull) }, "", url.toString());
      }
    } catch { }
  }, []);

  const setActiveTab = useCallback(
    (tab, options = {}) => {
      const cleanTab = resolveNormalized(tab);
      setActiveTabState(cleanTab);
      if (storageKey) {
        try { sessionStorage.setItem(storageKey, cleanTab); } catch { }
      }
      const nextFull = typeof options.full === "boolean" ? options.full : isFullPageMode;
      if (typeof options.full === "boolean") setIsFullPageMode(options.full);
      syncUrlParams(cleanTab, nextFull);
      window.dispatchEvent(new CustomEvent("gbs_dashboard_tab_changed", { detail: { tab: cleanTab, full: nextFull } }));
    },
    [resolveNormalized, storageKey, isFullPageMode, syncUrlParams]
  );

  const toggleFullPageMode = useCallback(
    (forceState = null) => {
      setIsFullPageMode((prev) => {
        const next = typeof forceState === "boolean" ? forceState : !prev;
        syncUrlParams(activeTab, next);
        return next;
      });
    },
    [activeTab, syncUrlParams]
  );

  const openTabInNewPage = useCallback(
    (targetTab = activeTab) => {
      try {
        const cleanTab = resolveNormalized(targetTab);
        const url = new URL(window.location.href);
        url.searchParams.set("tab", cleanTab);
        url.searchParams.set("full", "1");
        window.open(url.toString(), "_blank", "noopener");
      } catch { }
    },
    [activeTab, resolveNormalized]
  );

  useEffect(() => {
    try {
      if (storageKey) sessionStorage.setItem(storageKey, activeTab);
    } catch { }
    if (typeof document !== "undefined") {
      document.body.classList.toggle("gbs-full-display-mode", isFullPageMode);
    }
    return () => {
      if (typeof document !== "undefined") {
        document.body.classList.remove("gbs-full-display-mode");
      }
    };
  }, [activeTab, isFullPageMode, storageKey]);

  useEffect(() => {
    const handlePopState = () => {
      try {
        const params = new URLSearchParams(window.location.search);
        const tabParam = params.get("tab") || (storageKey ? sessionStorage.getItem(storageKey) : null) || defaultTab;
        setActiveTabState(resolveNormalized(tabParam));
        setIsFullPageMode(params.get("full") === "1");
      } catch { }
    };
    const handleFullToggle = (e) => {
      if (typeof e?.detail?.full === "boolean") {
        setIsFullPageMode(e.detail.full);
      }
    };
    window.addEventListener("popstate", handlePopState);
    window.addEventListener("gbs_full_display_toggled", handleFullToggle);
    return () => {
      window.removeEventListener("popstate", handlePopState);
      window.removeEventListener("gbs_full_display_toggled", handleFullToggle);
    };
  }, [defaultTab, resolveNormalized, storageKey]);

  return {
    activeTab,
    setActiveTab,
    isFullPageMode,
    setIsFullPageMode: toggleFullPageMode,
    openTabInNewPage
  };
}

export default useDashboardTabSync;

