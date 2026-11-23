import React, { useEffect, useState, useCallback, useRef } from "react";
import { useLocation } from "react-router-dom";
import { applyDashboardThemeToDocument } from "../../utils/dashboardTheme";

const TAB_BUTTON_SELECTOR = [
  ".role-tab-btn",
  ".dev-tab-btn",
  ".role-tab-nav button",
  ".dev-tab-navigation button",
  ".dev-tabs-nav button",
  ".dev-tabs-bar button",
  ".finance-tab-nav button",
  ".tabs-navigation-bar button",
  ".sharding-tab-navigation button",
  ".ai-tab-nav button"
].join(", ");

const SCROLL_STORAGE_KEY = "gbs_tab_page_scroll_map_v1";

function isDashboardPath(pathname = "") {
  const p = String(pathname || "").toLowerCase();
  return (
    p.startsWith("/portal/") ||
    p.startsWith("/developer/dashboard") ||
    p.startsWith("/developer/control") ||
    p === "/admin" ||
    p === "/teacher" ||
    p === "/student" ||
    p === "/parent" ||
    p === "/accountant" ||
    p === "/staff" ||
    p === "/hr" ||
    p === "/secretary" ||
    p === "/alumni"
  );
}

function getPortalLabel(pathname = "") {
  const p = String(pathname || "").toLowerCase();
  if (p.includes("/developer")) return "Developer Mission Control";
  if (p.includes("/admin")) return "Headmaster Command Center";
  if (p.includes("/teacher")) return "Teacher Academic Suite";
  if (p.includes("/student")) return "Student Learning Portal";
  if (p.includes("/parent")) return "Parent & Guardian Portal";
  if (p.includes("/accountant")) return "Finance & Bursar Portal";
  if (p.includes("/secretary")) return "School Secretary & Front Office";
  if (p.includes("/hr")) return "HR & Faculty Affairs";
  if (p.includes("/staff")) return "Campus Operations & Staff";
  if (p.includes("/alumni")) return "Alumni Network Portal";
  return "GBS School Portal";
}

function saveScrollForKey(key, y) {
  try {
    const raw = sessionStorage.getItem(SCROLL_STORAGE_KEY);
    const map = raw ? JSON.parse(raw) : {};
    map[key] = Math.max(0, Math.round(Number(y) || 0));
    const keys = Object.keys(map);
    if (keys.length > 60) {
      delete map[keys[0]];
    }
    sessionStorage.setItem(SCROLL_STORAGE_KEY, JSON.stringify(map));
  } catch { }
}

function readScrollForKey(key) {
  try {
    const raw = sessionStorage.getItem(SCROLL_STORAGE_KEY);
    const map = raw ? JSON.parse(raw) : {};
    return typeof map[key] === "number" ? map[key] : null;
  } catch {
    return null;
  }
}

function readActiveTabLabelFromDom() {
  try {
    const activeEl = document.querySelector(
      ".role-tab-btn.active, .dev-tab-btn.active, .role-tab-nav button.active, .dev-tab-navigation button.active, .dev-tabs-nav button.active"
    );
    const text = activeEl?.textContent?.replace(/\s+/g, " ").trim();
    if (text) return text.slice(0, 72);
  } catch { }
  try {
    const tabParam = new URLSearchParams(window.location.search).get("tab");
    if (tabParam) {
      return tabParam
        .replace(/[_-]+/g, " ")
        .replace(/([a-z])([A-Z])/g, "$1 $2")
        .replace(/\b\w/g, (c) => c.toUpperCase());
    }
  } catch { }
  return "Active Workspace Page";
}

/**
 * DashboardTabPageController
 * Ensures EVERY active tab clicked across ALL dashboards (including Developer Dashboard)
 * opens in a clean, dedicated Full-Page View (?tab=...&full=1) with proper browser history,
 * and clicking Back returns to the exact previous page/tab and restores its scroll position.
 */
export default function DashboardTabPageController() {
  const location = useLocation();
  const [isFullTabPage, setIsFullTabPage] = useState(false);
  const [activeTabTitle, setActiveTabTitle] = useState("");
  const [activeTabId, setActiveTabId] = useState("");
  const pendingClickRef = useRef(null);

  const syncFromCurrentUrl = useCallback((shouldRestoreScroll = false) => {
    const onDash = isDashboardPath(window.location.pathname);
    applyDashboardThemeToDocument(window.location.pathname);

    if (!onDash) {
      document.body.classList.remove("gbs-full-display-mode", "gbs-tab-page-view");
      setIsFullTabPage(false);
      return;
    }

    const params = new URLSearchParams(window.location.search);
    const fullActive = params.get("full") === "1" || params.get("fullpage") === "1";
    const tabParam = params.get("tab") || "";

    document.body.classList.toggle("gbs-full-display-mode", fullActive);
    document.body.classList.toggle("gbs-tab-page-view", fullActive);
    setIsFullTabPage(fullActive);
    setActiveTabId(tabParam);

    const stateLabel = window.history.state?.tabLabel;
    setActiveTabTitle(stateLabel || readActiveTabLabelFromDom());

    window.dispatchEvent(new CustomEvent("gbs_full_display_toggled", { detail: { full: fullActive, tab: tabParam } }));

    if (shouldRestoreScroll) {
      const savedFromState = typeof window.history.state?.gbsScrollY === "number" ? window.history.state.gbsScrollY : null;
      const savedFromMap = readScrollForKey(window.location.pathname + window.location.search);
      const targetY = savedFromState !== null ? savedFromState : savedFromMap;
      if (targetY !== null) {
        setTimeout(() => {
          window.scrollTo({ top: targetY, behavior: "auto" });
        }, 70);
      }
    }
  }, []);

  useEffect(() => {
    syncFromCurrentUrl(false);
  }, [location.pathname, location.search, syncFromCurrentUrl]);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;

    const handleTabClickCapture = (e) => {
      if (!isDashboardPath(window.location.pathname)) return;
      const btn = e.target?.closest?.(TAB_BUTTON_SELECTOR);
      if (!btn) return;
      if (btn.closest("[data-gbs-tab-page-bar='true']")) return;

      const prevHref = window.location.href;
      const prevKey = window.location.pathname + window.location.search;
      const prevScrollY = window.scrollY;
      const prevParams = new URLSearchParams(window.location.search);
      const prevWasFull = prevParams.get("full") === "1";
      const clickedLabel = btn.textContent?.replace(/\s+/g, " ").trim().slice(0, 72) || "Active Workspace Page";

      // Snapshot exact scroll position of the previous view before leaving it
      saveScrollForKey(prevKey, prevScrollY);
      try {
        window.history.replaceState(
          { ...(window.history.state || {}), gbsScrollY: prevScrollY },
          "",
          prevHref
        );
      } catch { }

      if (pendingClickRef.current) {
        clearTimeout(pendingClickRef.current);
      }

      // Let the dashboard React onClick + useEffect run first, then enforce full-page tab state cleanly
      pendingClickRef.current = setTimeout(() => {
        if (!isDashboardPath(window.location.pathname)) return;
        const url = new URL(window.location.href);
        const currentTab = url.searchParams.get("tab") || activeTabId || "active";
        url.searchParams.set("tab", currentTab);
        url.searchParams.set("full", "1");
        const nextUrl = url.toString();

        const nextState = {
          ...(window.history.state || {}),
          tab: currentTab,
          full: true,
          tabLabel: clickedLabel,
          gbsTabPage: true,
          gbsScrollY: 0
        };

        try {
          if (window.location.href !== prevHref) {
            // Dashboard already pushed a history entry for the new tab — enrich it in place (no duplicate Back step)
            window.history.replaceState(nextState, "", nextUrl);
          } else if (!prevWasFull) {
            // Clicking the currently active tab from Overview opens it as a new full page entry so Back returns to Overview
            window.history.pushState(nextState, "", nextUrl);
          } else {
            window.history.replaceState(nextState, "", nextUrl);
          }
        } catch { }

        document.body.classList.add("gbs-full-display-mode", "gbs-tab-page-view");
        setIsFullTabPage(true);
        setActiveTabId(currentTab);
        setActiveTabTitle(clickedLabel);
        window.dispatchEvent(new CustomEvent("gbs_full_display_toggled", { detail: { full: true, tab: currentTab } }));
        window.scrollTo({ top: 0, behavior: "smooth" });
      }, 65);
    };

    const handlePopState = () => {
      syncFromCurrentUrl(true);
    };

    const handleScrollSave = () => {
      if (!isDashboardPath(window.location.pathname)) return;
      saveScrollForKey(window.location.pathname + window.location.search, window.scrollY);
    };

    const handleCustomFullToggle = (e) => {
      if (typeof e?.detail?.full === "boolean") {
        setIsFullTabPage(e.detail.full && isDashboardPath(window.location.pathname));
        document.body.classList.toggle("gbs-tab-page-view", e.detail.full && isDashboardPath(window.location.pathname));
      }
    };

    document.addEventListener("click", handleTabClickCapture, true);
    window.addEventListener("popstate", handlePopState);
    window.addEventListener("scroll", handleScrollSave, { passive: true });
    window.addEventListener("gbs_full_display_toggled", handleCustomFullToggle);

    return () => {
      if (pendingClickRef.current) clearTimeout(pendingClickRef.current);
      document.removeEventListener("click", handleTabClickCapture, true);
      window.removeEventListener("popstate", handlePopState);
      window.removeEventListener("scroll", handleScrollSave);
      window.removeEventListener("gbs_full_display_toggled", handleCustomFullToggle);
    };
  }, [activeTabId, syncFromCurrentUrl]);

  if (!isFullTabPage || !isDashboardPath(location.pathname)) {
    return null;
  }

  const portalLabel = getPortalLabel(location.pathname);

  const handleBackToPrevious = () => {
    try {
      if (window.history.length > 1) {
        window.history.back();
        return;
      }
      const url = new URL(window.location.href);
      url.searchParams.delete("full");
      url.searchParams.delete("fullpage");
      window.history.pushState({ tab: activeTabId, full: false }, "", url.toString());
      syncFromCurrentUrl(true);
    } catch {
      window.history.back();
    }
  };

  const handleReturnToOverview = () => {
    try {
      saveScrollForKey(window.location.pathname + window.location.search, window.scrollY);
      const url = new URL(window.location.href);
      url.searchParams.delete("full");
      url.searchParams.delete("fullpage");
      window.history.pushState({ tab: activeTabId, full: false, gbsScrollY: 0 }, "", url.toString());
      syncFromCurrentUrl(false);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch { }
  };

  const handleOpenSeparateBrowserTab = () => {
    try {
      const url = new URL(window.location.href);
      url.searchParams.set("full", "1");
      if (activeTabId) url.searchParams.set("tab", activeTabId);
      window.open(url.toString(), "_blank", "noopener");
    } catch { }
  };

  return (
    <div
      data-gbs-tab-page-bar="true"
      data-testid="gbs-active-tab-page-bar"
      style={{
        position: "sticky",
        top: 0,
        zIndex: 9996,
        background: "linear-gradient(135deg, rgba(8, 24, 51, 0.98) 0%, rgba(15, 36, 74, 0.98) 100%)",
        borderBottom: "2px solid #d4af37",
        padding: "9px clamp(10px, 2vw, 22px)",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        flexWrap: "wrap",
        gap: "10px",
        boxShadow: "0 8px 24px rgba(2, 6, 23, 0.55)",
        color: "#f8fafc"
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
        <button
          type="button"
          onClick={handleBackToPrevious}
          data-testid="tab-page-back-btn"
          style={{
            background: "linear-gradient(135deg, #2563eb, #1d4ed8)",
            color: "#ffffff",
            border: "1px solid rgba(147, 197, 253, 0.5)",
            borderRadius: "8px",
            padding: "7px 14px",
            fontSize: "0.8rem",
            fontWeight: 800,
            cursor: "pointer",
            display: "inline-flex",
            alignItems: "center",
            gap: "6px"
          }}
        >
          ← Back to Previous Page
        </button>

        <div style={{ display: "flex", flexDirection: "column" }}>
          <span style={{ fontSize: "0.66rem", fontWeight: 900, color: "#f6dd84", letterSpacing: "0.6px", textTransform: "uppercase" }}>
            {portalLabel} • FULL-PAGE ACTIVE TAB VIEW
          </span>
          <strong style={{ fontSize: "0.94rem", color: "#ffffff", lineHeight: 1.2 }}>
            {activeTabTitle || readActiveTabLabelFromDom()}
          </strong>
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
        <button
          type="button"
          onClick={handleReturnToOverview}
          style={{
            background: "rgba(212, 175, 55, 0.16)",
            border: "1px solid #d4af37",
            color: "#f6dd84",
            borderRadius: "8px",
            padding: "6px 12px",
            fontSize: "0.76rem",
            fontWeight: 800,
            cursor: "pointer"
          }}
        >
          🏠 Dashboard Overview
        </button>
        <button
          type="button"
          onClick={handleOpenSeparateBrowserTab}
          style={{
            background: "rgba(56, 189, 248, 0.16)",
            border: "1px solid #38bdf8",
            color: "#7dd3fc",
            borderRadius: "8px",
            padding: "6px 12px",
            fontSize: "0.76rem",
            fontWeight: 800,
            cursor: "pointer"
          }}
        >
          ↗ Open in Separate Tab
        </button>
      </div>
    </div>
  );
}
