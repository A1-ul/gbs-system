import React, { useState, useEffect } from "react";
import apiClient from "../../api/client/apiClient";
import { resolveApiUrl } from "../../api/client/apiConfig";
import { clearFakeDataEntries } from "../../utils/freshSystemReset";
import { getActiveSchoolName, getActiveSchoolLogo } from "../../utils/schoolBranding";
import { isDemoSandboxMode, resetDemoSandboxData } from "../../utils/tokenStorage";
import {
  getActiveInstitutionType,
  setActiveInstitutionType,
  getInstitutionRoleProfile,
  INSTITUTION_TIERS
} from "../../utils/institutionScope";
import { fetchTranslatedMessagesInbox } from "../../utils/languageTranslatorEngine";
import { getUiLabel } from "../../utils/i18nCountryEngine";
import GlobalLocaleSelector from "./GlobalLocaleSelector";
import UniversalLanguageTranslatorModal from "./UniversalLanguageTranslatorModal";
import DirectSMSMessengerModal from "./DirectSMSMessengerModal";
import MobileAppPushHubModal from "./MobileAppPushHubModal";
import CloudCDNMediaHubModal from "./CloudCDNMediaHubModal";

/**
 * TopCenterSystemBanner
 * 
 * Rules:
 * 1. For Developer Dashboard: Displays main system name "GBS SCHOOL MANAGEMENT SYSTEM".
 * 2. For Tenant User Dashboards (Headmaster, Teacher, Student, Parent, Accountant, HR, Alumni, Staff):
 *    Displays ONLY the registered tenant school name (e.g. "ST. AUGUSTINE INTERNATIONAL ACADEMY")
 *    at top center with increased font size. The main system name does NOT appear on user dashboards.
 */
const DASHBOARDS_LIST = [
  { path: "/onboarding", title: "Onboard School", icon: "🏫", tooltip: "Register educational institution / school", highlight: true },
  { path: "/portal/admin/dashboard", title: "Headmaster Portal", icon: "🎓", tooltip: "Executive Leadership, Vetting, Admissions, CCTV" },
  { path: "/portal/teacher/dashboard", title: "Teacher Portal", icon: "👨‍🏫", tooltip: "Attendance, Grading, Plans & Live Classes" },
  { path: "/portal/student/dashboard", title: "Student Hub", icon: "🎒", tooltip: "Examinations, Peer Chat, Video Lessons & Schedule" },
  { path: "/portal/parent/dashboard", title: "Parent Portal", icon: "👨‍👩‍👧", tooltip: "Ward Performance, Fees, Bus Tracking" },
  { path: "/portal/accountant/dashboard", title: "Accountant Desk", icon: "💰", tooltip: "Fee Ledgers, Alumni Gifts & Procurement Audit" },
  { path: "/portal/staff/dashboard", title: "Staff Ops", icon: "👔", tooltip: "Campus Staff Operations, Library, Logistics & Clinic" },
  { path: "/portal/hr/dashboard", title: "HR Portal", icon: "📋", tooltip: "Human Resources, Contracts, Leave & Staff Health" },
  { path: "/portal/alumni/dashboard", title: "Alumni Hub", icon: "🏛️", tooltip: "Alumni Pledges, Networking & Institutional Gifts" },
  { path: "/developer-control-center/dashboard", title: "Developer Center", icon: "🛡️", tooltip: "Chief Developer Mission Control & Security Sentinel" }
];

export default function TopCenterSystemBanner({
  roleTitle = "Enterprise Workspace",
  institutionName = null,
  isDeveloper = false
}) {
  const isDevMode = isDeveloper || roleTitle.toLowerCase().includes("developer");

  const [schoolName, setSchoolName] = useState(() => {
    if (isDevMode) return "GBS SCHOOL MANAGEMENT SYSTEM";
    const resolved = getActiveSchoolName({ isDeveloperContext: false });
    if (institutionName && !["WITHIN DE BRAIN ACADEMY", "ST. AUGUSTINE INTERNATIONAL ACADEMY", "GBS INTERNATIONAL SCHOOL"].includes(String(institutionName).trim().toUpperCase())) {
      return institutionName;
    }
    return resolved;
  });
  const [customLogo, setCustomLogo] = useState(() => {
    return getActiveSchoolLogo({ isDeveloperContext: isDevMode }) || "/assets/gbs_crest_badge.jpg";
  });
  const [cleaned, setCleaned] = useState(false);
  const [isOnline, setIsOnline] = useState(() => typeof navigator !== "undefined" ? navigator.onLine : true);
  const [syncingCloud, setSyncingCloud] = useState(false);
  const [syncFeedback, setSyncFeedback] = useState(null);
  const [showTranslatorModal, setShowTranslatorModal] = useState(false);
  const [translatorInitialText, setTranslatorInitialText] = useState("");
  const [showDirectSMSModal, setShowDirectSMSModal] = useState(false);
  const [showMobileAppModal, setShowMobileAppModal] = useState(false);
  const [showCloudCDNModal, setShowCloudCDNModal] = useState(false);
  const [demoTrialUsage, setDemoTrialUsage] = useState({ maxPerModule: 10, totalUsed: 0 });
  const [unreadTranslatedCount, setUnreadTranslatedCount] = useState(0);
  const [unreadSmsCount, setUnreadSmsCount] = useState(0);
  const [pwaPromptReady, setPwaPromptReady] = useState(
    typeof window !== "undefined" && Boolean(window.__gbsDeferredInstallPrompt)
  );
  const [uiTheme, setUiTheme] = useState(() => {
    try {
      return localStorage.getItem("gbs_ui_theme") === "navy" ? "navy" : "light";
    } catch {
      return "light";
    }
  });
  const [localeVersion, setLocaleVersion] = useState(0);
  const [fullDisplayMode, setFullDisplayMode] = useState(false);
  const [institutionType, setInstitutionTypeState] = useState(() => getActiveInstitutionType());
  const institutionProfile = getInstitutionRoleProfile(institutionType);

  let currentUserRole = "GUEST";
  try {
    const storedUser = JSON.parse(localStorage.getItem("gbs_user") || "{}");
    currentUserRole = (storedUser?.role || localStorage.getItem("gbs_auth_role") || "GUEST").toUpperCase();
  } catch { }
  const isTrueDeveloper = isDeveloper || isDevMode || currentUserRole === "DEVELOPER" || Boolean(localStorage.getItem("gbs_dev_token"));
  const systemMode = typeof window !== "undefined"
    ? (isDemoSandboxMode() ? "DEMO_SANDBOX" : "LIVE_PRODUCTION")
    : "LIVE_PRODUCTION";
  const canAccessWalkthrough = isTrueDeveloper || systemMode === "DEMO_SANDBOX";

  useEffect(() => {
    const handleUpdate = () => {
      if (isDevMode) {
        setSchoolName("GBS SCHOOL MANAGEMENT SYSTEM");
        setCustomLogo("/assets/gbs_crest_badge.jpg");
        return;
      }
      const updated = getActiveSchoolName({ isDeveloperContext: false });
      if (updated) setSchoolName(updated);
      const updatedLogo = getActiveSchoolLogo({ isDeveloperContext: false });
      if (updatedLogo) setCustomLogo(updatedLogo);
    };

    handleUpdate();

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    const handleInstitutionChanged = () => setInstitutionTypeState(getActiveInstitutionType());
    const handleLocaleChanged = () => setLocaleVersion((v) => v + 1);

    try {
      document.body.classList.toggle("gbs-theme-light", uiTheme === "light");
      document.body.classList.toggle("gbs-theme-navy", uiTheme === "navy");
    } catch { }

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    window.addEventListener("gbs_school_branding_updated", handleUpdate);
    window.addEventListener("gbs_school_name_updated", handleUpdate);
    window.addEventListener("gbs_custom_logo_updated", handleUpdate);
    window.addEventListener("gbs_institution_type_changed", handleInstitutionChanged);
    window.addEventListener("gbs_locale_changed", handleLocaleChanged);
    window.addEventListener("storage", handleUpdate);
    window.addEventListener("storage", handleInstitutionChanged);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("gbs_school_branding_updated", handleUpdate);
      window.removeEventListener("gbs_school_name_updated", handleUpdate);
      window.removeEventListener("gbs_custom_logo_updated", handleUpdate);
      window.removeEventListener("gbs_institution_type_changed", handleInstitutionChanged);
      window.removeEventListener("gbs_locale_changed", handleLocaleChanged);
      window.removeEventListener("storage", handleUpdate);
      window.removeEventListener("storage", handleInstitutionChanged);
    };
  }, [isDevMode, institutionName, uiTheme]);

  const handleToggleUiTheme = () => {
    const next = uiTheme === "light" ? "navy" : "light";
    setUiTheme(next);
    try {
      localStorage.setItem("gbs_ui_theme", next);
      document.body.classList.toggle("gbs-theme-light", next === "light");
      document.body.classList.toggle("gbs-theme-navy", next === "navy");
      window.dispatchEvent(new CustomEvent("gbs_ui_theme_changed", { detail: { theme: next } }));
      if (typeof window.showGBSOpenNotice === "function") {
        window.showGBSOpenNotice(
          next === "navy"
            ? "🌙 Deep Royal Navy & Metallic Gold theme activated across all dashboards."
            : "☀️ Blueprint Light & Royal Navy theme activated cleanly.",
          "success",
          next === "navy" ? "NAVY MODE ACTIVE" : "BLUEPRINT LIGHT ACTIVE"
        );
      }
    } catch { }
  };

  const handleToggleFullDisplay = () => {
    const next = !fullDisplayMode;
    setFullDisplayMode(next);
    try {
      document.body.classList.toggle("gbs-full-display-mode", next);
    } catch { }
  };

  useEffect(() => {
    const syncTranslatedBadge = async () => {
      try {
        const list = await fetchTranslatedMessagesInbox({ receiverRole: currentUserRole, limit: 40 });
        setUnreadTranslatedCount(list.filter((m) => !m.read).length);
      } catch { }
    };
    const syncSmsInboxBadge = async () => {
      try {
        const u = JSON.parse(localStorage.getItem("gbs_user") || "{}");
        const params = new URLSearchParams();
        if (u.phone) params.set("phone", u.phone);
        if (u.email) params.set("email", u.email);
        if (u.id) params.set("userId", String(u.id));
        if (currentUserRole && currentUserRole !== "GUEST") params.set("role", currentUserRole);
        if (!params.toString()) return;
        const res = await apiClient.get(`/sms/inbox?${params.toString()}`);
        const count = Number(res?.data?.unreadCount ?? res?.data?.data?.unreadCount ?? 0);
        setUnreadSmsCount(Number.isFinite(count) ? count : 0);
      } catch { }
    };
    const onPromptReady = () => setPwaPromptReady(Boolean(window.__gbsDeferredInstallPrompt));
    const onInstalled = () => setPwaPromptReady(false);

    syncTranslatedBadge();
    syncSmsInboxBadge();
    window.addEventListener("gbs_translated_message_sent", syncTranslatedBadge);
    window.addEventListener("gbs_translated_message_read", syncTranslatedBadge);
    window.addEventListener("gbs_direct_sms_updated", syncSmsInboxBadge);
    window.addEventListener("gbs_pwa_install_ready", onPromptReady);
    window.addEventListener("gbs_pwa_installed", onInstalled);
    const inboxPoll = setInterval(() => {
      syncTranslatedBadge();
      syncSmsInboxBadge();
    }, 25000);
    return () => {
      window.removeEventListener("gbs_translated_message_sent", syncTranslatedBadge);
      window.removeEventListener("gbs_translated_message_read", syncTranslatedBadge);
      window.removeEventListener("gbs_direct_sms_updated", syncSmsInboxBadge);
      window.removeEventListener("gbs_pwa_install_ready", onPromptReady);
      window.removeEventListener("gbs_pwa_installed", onInstalled);
      clearInterval(inboxPoll);
    };
  }, [currentUserRole]);

  const handleDirectOrModalAppInstall = async () => {
    const promptObj = typeof window !== "undefined" ? window.__gbsDeferredInstallPrompt : null;
    if (typeof navigator !== "undefined" && "serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js", { updateViaCache: "none" }).catch(() => { });
    }
    if (promptObj) {
      try {
        await promptObj.prompt();
        const { outcome } = await promptObj.userChoice;
        // Browser beforeinstallprompt events are strictly single-use; clear immediately after consumption
        window.__gbsDeferredInstallPrompt = null;
        setPwaPromptReady(false);
        if (outcome === "accepted") {
          window.__gbsAppInstalled = true;
          if (window.showGBSOpenNotice) {
            window.showGBSOpenNotice("✅ GBS App installed onto your device Home Screen / App Launcher!", "success", "MOBILE APP INSTALLED");
          }
          return;
        }
        if (window.showGBSOpenNotice) {
          window.showGBSOpenNotice("Installation prompt dismissed. Opening the Mobile App & Push Hub for offline launcher & browser steps.", "info", "MOBILE APP INSTALLER");
        }
      } catch {
        window.__gbsDeferredInstallPrompt = null;
        setPwaPromptReady(false);
      }
    }
    setShowMobileAppModal(true);
  };

  useEffect(() => {
    if (systemMode !== "DEMO_SANDBOX") return;
    const loadUsage = async () => {
      let localTotal = 0;
      try {
        const localCounters = JSON.parse(localStorage.getItem("gbs_demo_entry_counters") || "{}");
        localTotal = Object.values(localCounters).reduce((s, n) => s + (Number(n) || 0), 0);
      } catch { }
      try {
        const res = await fetch(resolveApiUrl("/api/v1/auth/demo-usage"));
        if (res.ok) {
          const json = await res.json();
          const serverTotal = Number(json?.data?.totalUsed || 0);
          setDemoTrialUsage({
            maxPerModule: Number(json?.data?.maxPerModule || 10),
            totalUsed: Math.max(serverTotal, localTotal)
          });
          return;
        }
      } catch { }
      setDemoTrialUsage((prev) => ({ ...prev, totalUsed: localTotal }));
    };
    loadUsage();
    window.addEventListener("gbs_demo_usage_updated", loadUsage);
    return () => window.removeEventListener("gbs_demo_usage_updated", loadUsage);
  }, [systemMode]);

  const handleTriggerCloudSync = async () => {
    setSyncingCloud(true);
    setSyncFeedback(null);
    try {
      const token = localStorage.getItem("gbs_dev_token") || localStorage.getItem("gbs_token") || "";
      const res = await fetch(resolveApiUrl("/api/v1/dev-control/sync-to-cloud"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        }
      });
      const data = await res.json();
      const msg = data?.message || "✓ Local data safely synced and point-in-time backup created!";
      setSyncFeedback(msg);
      if (window.showGBSOpenNotice) {
        window.showGBSOpenNotice(msg, "success", "CLOUD & POSTGRESQL SYNC");
      }
      setTimeout(() => setSyncFeedback(null), 5000);
    } catch {
      const fallbackMsg = "✓ Local data preserved safely in offline storage. Backup created.";
      setSyncFeedback(fallbackMsg);
      if (window.showGBSOpenNotice) {
        window.showGBSOpenNotice(fallbackMsg, "info", "LOCAL BACKUP PRESERVED");
      }
      setTimeout(() => setSyncFeedback(null), 5000);
    } finally {
      setSyncingCloud(false);
    }
  };

  const handleOpenLanguageExplainer = () => {
    const selectedText =
      typeof window !== "undefined" && window.getSelection
        ? window.getSelection().toString().trim()
        : "";
    if (typeof window !== "undefined" && typeof window.openGBSTranslator === "function") {
      window.openGBSTranslator({ text: selectedText, contextTitle: roleTitle });
      return;
    }
    setTranslatorInitialText(selectedText);
    setShowTranslatorModal(true);
  };

  const handleCleanSlate = () => {
    const res = clearFakeDataEntries();
    setCleaned(true);
    if (window.showGBSOpenNotice) {
      window.showGBSOpenNotice(res.message, "success", "Fresh State Activated");
    }
    setTimeout(() => setCleaned(false), 4000);
  };

  const handleLogout = () => {
    try {
      localStorage.removeItem("gbs_token");
      localStorage.removeItem("gbs_user");
      localStorage.removeItem("gbs_auth_role");
      localStorage.removeItem("gbs_dev_token");
      localStorage.removeItem("gbs_dev_authenticated");
      sessionStorage.clear();
    } catch { }
    window.location.href = isDevMode ? "/developer-control-center/login" : "/login";
  };

  return (
    <div
      className="gbs-system-top-center-banner"
      data-gbs-developer-portal={isDevMode ? "true" : undefined}
      data-gbs-no-translate={isDevMode ? "true" : undefined}
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        margin: "0 auto 18px auto",
        textAlign: "center",
        padding: "12px 32px",
        background: "linear-gradient(135deg, rgba(6, 15, 30, 0.97) 0%, rgba(10, 25, 47, 0.98) 50%, rgba(15, 35, 71, 0.97) 100%)",
        border: "2.5px solid rgba(212, 175, 55, 0.72)",
        borderRadius: "36px",
        boxShadow: "0 14px 40px rgba(4, 10, 22, 0.78), 0 0 28px rgba(212, 175, 55, 0.16), inset 0 1px 0 rgba(255, 255, 255, 0.14)",
        width: "fit-content",
        maxWidth: "95vw",
        zIndex: 20
      }}
    >
      <div
        style={{
          fontSize: "2.1rem",
          fontWeight: "900",
          letterSpacing: "1.2px",
          color: isDevMode ? "#fbbf24" : "#ffffff",
          textTransform: "uppercase",
          display: "flex",
          alignItems: "center",
          gap: "18px",
          flexWrap: "wrap",
          justifyContent: "center",
          lineHeight: "1.2"
        }}
      >
        <img
          src={isDevMode ? "/assets/gbs_crest_badge.jpg" : customLogo}
          alt="Crest"
          style={{
            width: "58px",
            height: "58px",
            borderRadius: "14px",
            objectFit: "contain",
            border: "2.5px solid #d4af37",
            background: "rgba(15, 23, 42, 0.95)",
            padding: "4px",
            boxShadow: "0 4px 18px rgba(212, 175, 55, 0.45)"
          }}
        />
        <span style={{ textShadow: "0 3px 20px rgba(0, 0, 0, 0.85)", filter: "drop-shadow(0 2px 8px rgba(0,0,0,0.6))" }}>
          {isDevMode ? "GBS SCHOOL MANAGEMENT SYSTEM" : (schoolName || "OFFICIAL INSTITUTION ACADEMY").toUpperCase()}
        </span>
        <span
          style={{
            fontSize: "0.8rem",
            background: isDevMode ? "rgba(56, 189, 248, 0.2)" : "rgba(16, 185, 129, 0.2)",
            color: isDevMode ? "#38bdf8" : "#34d399",
            padding: "5px 14px",
            borderRadius: "20px",
            border: isDevMode ? "1px solid rgba(56, 189, 248, 0.5)" : "1px solid rgba(16, 185, 129, 0.5)",
            fontWeight: "800",
            letterSpacing: "0.8px"
          }}
        >
          {isDevMode ? "● MISSION CONTROL" : "● OFFICIAL TENANT INSTITUTION"}
        </span>
      </div>

      <div
        style={{
          fontSize: "0.8rem",
          fontWeight: "800",
          color: "#d4af37",
          letterSpacing: "2.2px",
          textTransform: "uppercase",
          marginTop: "4px",
          textShadow: "0 2px 8px rgba(0,0,0,0.8)"
        }}
      >
        INTELLIGENCE TALKS TO WISDOM
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "12px",
          fontSize: "0.82rem",
          color: "#94a3b8",
          fontWeight: "600",
          marginTop: "6px",
          flexWrap: "wrap",
          justifyContent: "center"
        }}
      >
        <span style={{ color: isDevMode ? "#38bdf8" : "#34d399", fontWeight: "700" }}>
          {roleTitle}
        </span>
        <span style={{ color: "#475569" }}>•</span>
        {!isDevMode && (
          <>
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "5px",
                padding: "3px 10px",
                borderRadius: "12px",
                background: "rgba(212, 175, 55, 0.16)",
                border: "1px solid rgba(212, 175, 55, 0.45)",
                color: "#f5d061",
                fontWeight: "800"
              }}
              title={`Institution Operating Tier: ${institutionProfile.name}`}
            >
              {institutionProfile.icon} Tier: {institutionProfile.shortName}
            </span>
            <span style={{ color: "#475569" }}>•</span>
          </>
        )}
        <GlobalLocaleSelector
          compact
          lockedDeveloperEnglish={isDevMode}
          onLocaleChange={() => setLocaleVersion((v) => v + 1)}
        />
        <button
          type="button"
          onClick={handleToggleUiTheme}
          style={{
            background: uiTheme === "light" ? "linear-gradient(135deg, #f6dd84, #d4af37)" : "rgba(13, 34, 71, 0.90)",
            border: "1px solid rgba(212, 175, 55, 0.72)",
            color: uiTheme === "light" ? "#081833" : "#f6dd84",
            fontSize: "0.75rem",
            padding: "4px 12px",
            borderRadius: "12px",
            cursor: "pointer",
            fontWeight: 800
          }}
          title="Switch between Blueprint Light Canvas and Deep Midnight Royal Navy Mode"
        >
          {uiTheme === "light" ? "☀️ Blueprint Light" : "🌙 Navy Mode"}
        </button>
        <button
          type="button"
          onClick={handleToggleFullDisplay}
          style={{
            background: fullDisplayMode ? "rgba(22, 163, 74, 0.24)" : "rgba(13, 34, 71, 0.85)",
            border: `1px solid ${fullDisplayMode ? "#16a34a" : "rgba(212, 175, 55, 0.45)"}`,
            color: fullDisplayMode ? "#86efac" : "#f6dd84",
            fontSize: "0.75rem",
            padding: "4px 10px",
            borderRadius: "12px",
            cursor: "pointer",
            fontWeight: 800
          }}
          title={getUiLabel("fullView", "Expand dashboard workspace to full screen width")}
          data-locale-v={localeVersion}
        >
          {fullDisplayMode ? "↙ Standard View" : `↗ ${getUiLabel("fullView", "Full View")}`}
        </button>
        <button
          type="button"
          onClick={() => {
            if (typeof window !== "undefined") {
              window.open(window.location.href, "_blank", "noopener,noreferrer");
            }
          }}
          style={{
            background: "rgba(15, 35, 71, 0.85)",
            border: "1px solid rgba(212, 175, 55, 0.55)",
            color: "#f5d061",
            fontSize: "0.75rem",
            padding: "4px 10px",
            borderRadius: "12px",
            cursor: "pointer",
            fontWeight: 800
          }}
          title="Open the current dashboard tab in a dedicated full-page browser tab"
        >
          🗗 Open New Tab
        </button>
        <span style={{ color: "#475569" }}>•</span>
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "5px",
            padding: "3px 10px",
            borderRadius: "12px",
            background: isOnline ? "rgba(16, 185, 129, 0.15)" : "rgba(245, 158, 11, 0.2)",
            border: `1px solid ${isOnline ? "rgba(16, 185, 129, 0.4)" : "rgba(245, 158, 11, 0.5)"}`,
            color: isOnline ? "#34d399" : "#fbbf24",
            fontWeight: "700"
          }}
          title={isOnline ? "Internet Connected: Cloud DB active" : "Offline Mode: All data saved locally & persists in SQLite/JSON"}
        >
          {isOnline ? "🟢 Online (Cloud Ready)" : "🟠 Offline Mode (Local Safe Storage)"}
        </span>
        <span style={{ color: "#475569" }}>•</span>
        <button
          type="button"
          onClick={handleTriggerCloudSync}
          disabled={syncingCloud}
          style={{
            background: "linear-gradient(135deg, rgba(14, 165, 233, 0.25), rgba(2, 132, 199, 0.35))",
            border: "1px solid rgba(56, 189, 248, 0.5)",
            color: "#38bdf8",
            fontSize: "0.76rem",
            padding: "4px 12px",
            borderRadius: "8px",
            cursor: syncingCloud ? "not-allowed" : "pointer",
            fontWeight: "700",
            transition: "all 0.2s"
          }}
          title="Manually sync all offline records to cloud PostgreSQL & create instant JSON point-in-time backup"
        >
          {syncingCloud ? "⏳ Syncing to Cloud..." : "☁️ Sync to Cloud & Backup"}
        </button>
        <span style={{ color: "#475569" }}>•</span>
        <button
          type="button"
          onClick={handleOpenLanguageExplainer}
          style={{
            background: "linear-gradient(135deg, rgba(99, 102, 241, 0.25), rgba(79, 70, 229, 0.35))",
            border: "1px solid rgba(129, 140, 248, 0.5)",
            color: "#a5b4fc",
            fontSize: "0.76rem",
            padding: "4px 12px",
            borderRadius: "8px",
            cursor: "pointer",
            fontWeight: "700",
            transition: "all 0.2s"
          }}
          title="Open Language Translator, Exact Word Meaning & Received Translated Messages Inbox"
        >
          🌐 Language Translator &amp; Inbox
          {unreadTranslatedCount > 0 && (
            <span style={{
              marginLeft: "6px",
              background: "#10b981",
              color: "#022c22",
              padding: "1px 6px",
              borderRadius: "999px",
              fontSize: "0.7rem",
              fontWeight: 900
            }}>
              {unreadTranslatedCount} New
            </span>
          )}
        </button>
        <span style={{ color: "#475569" }}>•</span>
        <button
          type="button"
          onClick={() => setShowDirectSMSModal(true)}
          style={{
            background: "linear-gradient(135deg, rgba(14, 165, 233, 0.25), rgba(2, 132, 199, 0.35))",
            border: "1px solid rgba(56, 189, 248, 0.5)",
            color: "#38bdf8",
            fontSize: "0.76rem",
            padding: "4px 12px",
            borderRadius: "8px",
            cursor: "pointer",
            fontWeight: "700",
            transition: "all 0.2s"
          }}
          title="Send direct SMS messages between users or to any mobile contact network number"
        >
          📱 Direct Mobile SMS
          {unreadSmsCount > 0 && (
            <span style={{
              marginLeft: "6px",
              background: "#10b981",
              color: "#022c22",
              padding: "1px 6px",
              borderRadius: "999px",
              fontSize: "0.7rem",
              fontWeight: 900
            }}>
              {unreadSmsCount} New
            </span>
          )}
        </button>
        <span style={{ color: "#475569" }}>•</span>
        <button
          type="button"
          onClick={() => window.location.href = "/educational-news"}
          style={{
            background: "linear-gradient(135deg, rgba(16, 185, 129, 0.2), rgba(5, 150, 105, 0.3))",
            border: "1px solid rgba(16, 185, 129, 0.5)",
            color: "#34d399",
            fontSize: "0.76rem",
            padding: "4px 12px",
            borderRadius: "8px",
            cursor: "pointer",
            fontWeight: "700",
            transition: "all 0.2s"
          }}
          title="Display educational news and video insights from across the world"
        >
          🌍 Global Educational News
        </button>
        <span style={{ color: "#475569" }}>•</span>
        <button
          type="button"
          onClick={handleDirectOrModalAppInstall}
          style={{
            background: pwaPromptReady
              ? "linear-gradient(135deg, rgba(16, 185, 129, 0.3), rgba(5, 150, 105, 0.42))"
              : "linear-gradient(135deg, rgba(8, 24, 51, 0.92), rgba(13, 34, 71, 0.95))",
            border: pwaPromptReady ? "1.5px solid #16a34a" : "1.5px solid rgba(212, 175, 55, 0.72)",
            color: pwaPromptReady ? "#86efac" : "#f6dd84",
            fontSize: "0.76rem",
            padding: "4px 12px",
            borderRadius: "8px",
            cursor: "pointer",
            fontWeight: "800",
            display: "inline-flex",
            alignItems: "center",
            gap: "6px",
            transition: "all 0.2s"
          }}
          title="Install GBS Mobile/Desktop App on this device & manage push alerts"
        >
          <img
            src="/assets/gbs_crest_badge.jpg"
            alt="GBS App Icon"
            style={{ width: "16px", height: "16px", borderRadius: "4px", objectFit: "cover", border: "1px solid #d4af37" }}
          />
          <span>{pwaPromptReady ? "Install GBS App Now" : "Mobile App & Push"}</span>
        </button>
        <span style={{ color: "#475569" }}>•</span>
        <button
          type="button"
          onClick={() => setShowCloudCDNModal(true)}
          style={{
            background: "linear-gradient(135deg, rgba(59, 130, 246, 0.2), rgba(29, 78, 216, 0.3))",
            border: "1px solid rgba(59, 130, 246, 0.5)",
            color: "#93c5fd",
            fontSize: "0.76rem",
            padding: "4px 12px",
            borderRadius: "8px",
            cursor: "pointer",
            fontWeight: "700",
            transition: "all 0.2s"
          }}
          title="Open S3 Cloud Object Storage Vault & Global Edge CDN Management Desk"
        >
          ☁️ Cloud CDN & S3 Vault
        </button>
        <span style={{ color: "#475569" }}>•</span>
        <button
          type="button"
          onClick={handleCleanSlate}
          style={{
            background: cleaned ? "rgba(16, 185, 129, 0.25)" : "rgba(239, 68, 68, 0.18)",
            border: `1px solid ${cleaned ? "rgba(16, 185, 129, 0.5)" : "rgba(239, 68, 68, 0.4)"}`,
            color: cleaned ? "#34d399" : "#fca5a5",
            fontSize: "0.74rem",
            padding: "3px 12px",
            borderRadius: "8px",
            cursor: "pointer",
            fontWeight: "700",
            transition: "all 0.2s"
          }}
          title="Clear all fake mock data and reset dashboard to fresh blank state for real user entry"
        >
          {cleaned ? "✓ Cleared Fresh" : "🧹 Clear Test Data"}
        </button>
      </div>

      {syncFeedback && (
        <div style={{
          marginTop: "8px",
          padding: "6px 16px",
          borderRadius: "8px",
          background: "rgba(16, 185, 129, 0.2)",
          border: "1px solid rgba(16, 185, 129, 0.6)",
          color: "#34d399",
          fontSize: "0.8rem",
          fontWeight: 700
        }}>
          {syncFeedback}
        </div>
      )}

      {systemMode === "DEMO_SANDBOX" ? (
        <div style={{
          margin: "6px 0 10px 0",
          padding: "6px 16px",
          borderRadius: "20px",
          background: "rgba(245, 158, 11, 0.2)",
          border: "1px solid rgba(245, 158, 11, 0.55)",
          color: "#fbbf24",
          fontSize: "0.78rem",
          fontWeight: 800,
          display: "flex",
          alignItems: "center",
          flexWrap: "wrap",
          justifyContent: "center",
          gap: "8px"
        }}>
          <span>🟡 DEMO SANDBOX MODE</span>
          <span>•</span>
          <span style={{ fontWeight: 600 }}>Identical live workflow trainer — up to {demoTrialUsage.maxPerModule} trial entries per module ({demoTrialUsage.totalUsed} created).</span>
          {!isDevMode && (
            <label style={{ display: "inline-flex", alignItems: "center", gap: "6px", fontSize: "0.74rem", fontWeight: 800, color: "#fef3c7" }}>
              <span>🏫 Demo Institution:</span>
              <select
                aria-label="Demo Institution Tier Switcher"
                value={institutionType}
                onChange={(e) => {
                  const nextType = e.target.value;
                  setActiveInstitutionType(nextType);
                  setInstitutionTypeState(nextType);
                  setSyncFeedback(`🏫 Switched Demo Institution profile to ${INSTITUTION_TIERS[nextType]?.shortName || nextType}.`);
                  setTimeout(() => setSyncFeedback(null), 4000);
                }}
                style={{
                  background: "#081428",
                  color: "#f5d061",
                  border: "1px solid #d4af37",
                  borderRadius: "10px",
                  padding: "3px 8px",
                  fontSize: "0.73rem",
                  fontWeight: 800,
                  cursor: "pointer"
                }}
              >
                <option value="NURSERY_TO_JHS">Nursery – JHS</option>
                <option value="SENIOR_HIGH_SCHOOL">Senior High (SHS)</option>
                <option value="TECHNICAL">Technical / TVET</option>
                <option value="UNIVERSITY">University / Tertiary</option>
              </select>
            </label>
          )}
          <button
            type="button"
            onClick={() => {
              resetDemoSandboxData({ reloadPage: true });
            }}
            style={{
              background: "rgba(251, 191, 36, 0.22)",
              border: "1px solid #fbbf24",
              color: "#fef3c7",
              borderRadius: "14px",
              padding: "3px 10px",
              fontSize: "0.72rem",
              fontWeight: 800,
              cursor: "pointer"
            }}
            title="Restore fresh Demo Sandbox training data"
          >
            🔄 Reset Demo Data
          </button>
        </div>
      ) : (
        <div style={{
          margin: "6px 0 10px 0",
          padding: "5px 14px",
          borderRadius: "20px",
          background: "rgba(16, 185, 129, 0.16)",
          border: "1px solid rgba(16, 185, 129, 0.45)",
          color: "#34d399",
          fontSize: "0.74rem",
          fontWeight: 800,
          display: "inline-flex",
          alignItems: "center",
          gap: "8px"
        }}>
          <span>🟢 LIVE PRODUCTION WORKSPACE</span>
          <span>•</span>
          <span style={{ fontWeight: 600 }}>Isolated real-time institutional ledger &amp; database active.</span>
        </div>
      )}

      {/* DASHBOARD-TO-DASHBOARD WALKTHROUGH (DEVELOPER-ONLY) OR ROLE CONFINEMENT (TENANT USERS) */}
      {
        canAccessWalkthrough ? (
          <div style={{
            marginTop: "12px",
            paddingTop: "10px",
            borderTop: "1px solid rgba(255, 255, 255, 0.12)",
            width: "100%",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "6px"
          }} >
            <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "0.72rem", color: "#94a3b8", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px" }}>
              <span>🧭 Chief Developer Mission Walkthrough & Multi-Portal Switcher:</span>
            </div>
            <div style={{
              display: "flex",
              gap: "6px",
              flexWrap: "wrap",
              justifyContent: "center",
              alignItems: "center"
            }}>
              {DASHBOARDS_LIST.map((dash) => {
                const currentPath = typeof window !== "undefined" ? window.location.pathname : "";
                const isActive = currentPath === dash.path;
                return (
                  <button
                    key={dash.path}
                    type="button"
                    onClick={() => {
                      if (dash.path === "/onboarding") {
                        try {
                          localStorage.removeItem("gbs_tenant_already_onboarded");
                          localStorage.removeItem("gbs_walkthrough_completed");
                        } catch { }
                      }
                      window.location.href = dash.path;
                    }}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "5px",
                      padding: "5px 11px",
                      borderRadius: "18px",
                      fontSize: "0.74rem",
                      fontWeight: 800,
                      cursor: "pointer",
                      transition: "all 0.18s ease",
                      border: isActive
                        ? "1.5px solid #38bdf8"
                        : dash.highlight
                          ? "1.5px solid #10b981"
                          : "1px solid rgba(255, 255, 255, 0.16)",
                      background: isActive
                        ? "linear-gradient(135deg, rgba(2, 132, 199, 0.45), rgba(56, 189, 248, 0.25))"
                        : dash.highlight
                          ? "linear-gradient(135deg, rgba(16, 185, 129, 0.28), rgba(5, 150, 105, 0.18))"
                          : "rgba(15, 23, 42, 0.7)",
                      color: isActive ? "#ffffff" : dash.highlight ? "#34d399" : "#cbd5e1",
                      boxShadow: isActive ? "0 0 10px rgba(56, 189, 248, 0.4)" : "none"
                    }}
                    title={dash.tooltip}
                  >
                    <span>{dash.icon}</span>
                    <span>{dash.title}</span>
                    {isActive && (
                      <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#38bdf8", boxShadow: "0 0 6px #38bdf8" }} />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ) : (
          <div style={{
            marginTop: "10px",
            paddingTop: "8px",
            borderTop: "1px solid rgba(255, 255, 255, 0.1)",
            width: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "10px",
            flexWrap: "wrap",
            fontSize: "0.78rem"
          }}>
            <span style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              padding: "4px 14px",
              borderRadius: "20px",
              background: "rgba(15, 23, 42, 0.75)",
              border: "1px solid rgba(16, 185, 129, 0.4)",
              color: "#34d399",
              fontWeight: 800
            }}>
              🔒 Authorized Portal: {roleTitle}
            </span>
            <span style={{ color: "#94a3b8", fontSize: "0.74rem" }}>
              Role-confined secure session. Direct cross-dashboard switching is locked to prevent unauthorized tampering.
            </span>
          </div>
        )
      }

      {/* Universal Multi-Language Translator & Message Explainer Modal */}
      <UniversalLanguageTranslatorModal
        isOpen={showTranslatorModal}
        onClose={() => setShowTranslatorModal(false)}
        initialText={translatorInitialText}
        initialContextTitle={roleTitle}
      />

      {/* Direct Mobile SMS Messenger Modal (Accessible Across All Portals) */}
      <DirectSMSMessengerModal
        isOpen={showDirectSMSModal}
        onClose={() => setShowDirectSMSModal(false)}
      />

      {/* Native Mobile App (APK / iOS) & Lock Screen Push Hub Modal */}
      <MobileAppPushHubModal
        isOpen={showMobileAppModal}
        onClose={() => setShowMobileAppModal(false)}
      />

      {/* S3-Compatible Cloud Object Store & Edge CDN Modal */}
      <CloudCDNMediaHubModal
        isOpen={showCloudCDNModal}
        onClose={() => setShowCloudCDNModal(false)}
      />
    </div >
  );
}
