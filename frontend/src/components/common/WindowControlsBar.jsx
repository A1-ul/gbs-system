import React, { useState, useEffect } from "react";
import { useNavigate, useLocation, useInRouterContext } from "react-router-dom";
import { getActiveSchoolName, getActiveSchoolLogo } from "../../utils/schoolBranding";
import { performSmartBack, isDeveloperRoute } from "../../utils/globalNavigationScrollManager";
import CartoonRoleVideoHubModal from "./CartoonRoleVideoHubModal";
import UniversalRoleGuideModal from "./UniversalRoleGuideModal";

function RouterSmartBackButton({ onBack, customBackLabel, isDevContext }) {
  const navigate = useNavigate();
  const location = useLocation();

  const handleClick = () => {
    if (onBack) {
      onBack();
      return;
    }
    if (isDevContext || isDeveloperRoute(location.pathname)) {
      window.history.back();
      return;
    }
    performSmartBack(navigate, location);
  };

  return (
    <button
      type="button"
      className="btn-window-control btn-window-back"
      onClick={handleClick}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "6px",
        padding: "6px 14px",
        background: "rgba(30, 41, 59, 0.9)",
        border: "1px solid rgba(56, 189, 248, 0.4)",
        borderRadius: "8px",
        color: "#38bdf8",
        fontWeight: "700",
        cursor: "pointer",
        transition: "all 0.2s"
      }}
    >
      <span>{customBackLabel}</span>
    </button>
  );
}

function OnboardActionButton({ onNavigate }) {
  return (
    <button
      type="button"
      className="btn-window-control btn-onboard-school"
      onClick={() => {
        try {
          localStorage.removeItem("gbs_tenant_already_onboarded");
        } catch { }
        onNavigate("/onboarding?force=true");
      }}
      style={{
        padding: "5px 11px",
        background: "rgba(16, 185, 129, 0.18)",
        border: "1px solid rgba(16, 185, 129, 0.55)",
        borderRadius: "6px",
        color: "#34d399",
        cursor: "pointer",
        fontSize: "0.75rem",
        fontWeight: "800"
      }}
    >
      🏫 Onboard Your Educational Institution / School
    </button>
  );
}

function RouterOnboardActionButton() {
  const navigate = useNavigate();
  return <OnboardActionButton onNavigate={navigate} />;
}

/**
 * Universal Navigation, Scroll & Window Expansion Controls
 * Required on every dashboard and opened window/modal:
 * 1. Back button (returns to exact previous page/view without losing state)
 * 2. Scroll buttons (Scroll to Top & Scroll to Bottom)
 * 3. Expand / Restore window toggle (↔ / ⛶)
 */
export default function WindowControlsBar({
  onBack,
  isModal = false,
  modalTargetId = null,
  title = "Navigation & View Controls",
  showExpand = true,
  customBackLabel = "← Back",
  className = ""
}) {
  const inRouter = useInRouterContext();
  const [isExpanded, setIsExpanded] = useState(() => {
    try {
      return typeof window !== "undefined" && new URLSearchParams(window.location.search).get("full") === "1";
    } catch {
      return false;
    }
  });
  const isDevContext = Boolean(title?.toLowerCase().includes("developer") || title?.toLowerCase().includes("control center"));
  const [brandName, setBrandName] = useState(() => getActiveSchoolName({ isDeveloperContext: isDevContext }));
  const [brandLogo, setBrandLogo] = useState(() => getActiveSchoolLogo({ isDeveloperContext: isDevContext }));
  const [showRoleVideoHub, setShowRoleVideoHub] = useState(false);
  const [showOperatingGuide, setShowOperatingGuide] = useState(false);

  const resolveCurrentRoleKey = () => {
    try {
      const path = (typeof window !== "undefined" ? window.location.pathname : "").toLowerCase();
      if (isDevContext || path.includes("/developer")) return "DEVELOPER";
      if (path.includes("/portal/admin")) return "ADMIN";
      if (path.includes("/portal/teacher")) return "TEACHER";
      if (path.includes("/portal/student")) return "STUDENT";
      if (path.includes("/portal/parent")) return "PARENT";
      if (path.includes("/portal/accountant")) return "ACCOUNTANT";
      if (path.includes("/portal/hr") || path === "/hr") return "HR";
      if (path.includes("/portal/secretary")) return "SECRETARY";
      if (path.includes("/portal/clinic")) return "CLINIC_DOCTOR";
      if (path.includes("/portal/staff")) return "STAFF";
      if (path.includes("/portal/alumni")) return "ALUMNI";
      if (path.includes("/portal/inventory") || path === "/inventory") return "INVENTORY";
      const storedUser = JSON.parse(localStorage.getItem("gbs_user") || "{}");
      if (storedUser?.role) return String(storedUser.role).toUpperCase();
    } catch { }
    return "ADMIN";
  };

  const isSignedInSession = () => {
    try {
      const path = (typeof window !== "undefined" ? window.location.pathname : "").toLowerCase();
      if (path.includes("/portal/") || path.includes("/developer")) return true;
      return Boolean(localStorage.getItem("gbs_token") || localStorage.getItem("gbs_dev_token") || localStorage.getItem("gbs_user"));
    } catch {
      return false;
    }
  };

  const handleUniversalSignOut = () => {
    try {
      localStorage.removeItem("gbs_token");
      localStorage.removeItem("gbs_user");
      localStorage.removeItem("gbs_dev_token");
      localStorage.removeItem("gbs_dev_user");
      sessionStorage.removeItem("gbs_headmaster_voice_verified");
    } catch { }
    window.location.assign("/login");
  };

  useEffect(() => {
    const syncBranding = () => {
      setBrandName(getActiveSchoolName({ isDeveloperContext: isDevContext }));
      setBrandLogo(getActiveSchoolLogo({ isDeveloperContext: isDevContext }));
    };
    syncBranding();
    window.addEventListener("gbs_school_branding_updated", syncBranding);
    window.addEventListener("storage", syncBranding);
    return () => {
      window.removeEventListener("gbs_school_branding_updated", syncBranding);
      window.removeEventListener("storage", syncBranding);
    };
  }, [isDevContext]);

  const handleBack = () => {
    if (onBack) {
      onBack();
      return;
    }
    try {
      const url = new URL(window.location.href);
      const isOpenedFullPage = url.searchParams.get("full") === "1" || url.searchParams.get("fullpage") === "1";
      if (window.history.length > 1) {
        window.history.back();
        return;
      }
      if (isOpenedFullPage) {
        url.searchParams.delete("full");
        url.searchParams.delete("fullpage");
        window.location.assign(url.toString());
        return;
      }
    } catch { }
    window.history.back();
  };

  const handleScrollTop = () => {
    if (modalTargetId) {
      const el = document.getElementById(modalTargetId);
      if (el) el.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const handleScrollBottom = () => {
    if (modalTargetId) {
      const el = document.getElementById(modalTargetId);
      if (el) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
    } else {
      window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });
    }
  };

  useEffect(() => {
    const devPath = typeof window !== "undefined" && isDeveloperRoute(window.location.pathname);
    if (!modalTargetId && typeof document !== "undefined" && (isDevContext || devPath)) {
      document.body.classList.toggle("gbs-full-display-mode", isExpanded);
    }
    return () => {
      if (!modalTargetId && typeof document !== "undefined" && (isDevContext || devPath)) {
        document.body.classList.remove("gbs-full-display-mode");
      }
    };
  }, [isExpanded, modalTargetId, isDevContext]);

  useEffect(() => {
    const syncFullState = (e) => {
      if (modalTargetId) return;
      if (typeof e?.detail?.full === "boolean") {
        setIsExpanded(e.detail.full);
        return;
      }
      try {
        setIsExpanded(new URLSearchParams(window.location.search).get("full") === "1");
      } catch { }
    };
    window.addEventListener("gbs_full_display_toggled", syncFullState);
    window.addEventListener("popstate", syncFullState);
    return () => {
      window.removeEventListener("gbs_full_display_toggled", syncFullState);
      window.removeEventListener("popstate", syncFullState);
    };
  }, [modalTargetId]);

  const handleOpenActiveTabFullPage = () => {
    try {
      const url = new URL(window.location.href);
      url.searchParams.set("full", "1");
      const opened = window.open(url.toString(), "_blank", "noopener");
      if (!opened) {
        window.history.replaceState(window.history.state, "", url.toString());
        window.dispatchEvent(new CustomEvent("gbs_full_display_toggled", { detail: { full: true } }));
        setIsExpanded(true);
      }
    } catch { }
  };

  const handleToggleExpand = () => {
    setIsExpanded((prev) => {
      const next = !prev;
      if (modalTargetId) {
        const el = document.getElementById(modalTargetId);
        if (el) {
          if (next) {
            el.style.maxWidth = "98vw";
            el.style.width = "98vw";
            el.style.height = "94dvh";
            el.style.maxHeight = "94dvh";
          } else {
            el.style.maxWidth = "";
            el.style.width = "";
            el.style.height = "";
            el.style.maxHeight = "";
          }
        }
      } else {
        try {
          const url = new URL(window.location.href);
          if (next) {
            url.searchParams.set("full", "1");
          } else {
            url.searchParams.delete("full");
          }
          window.history.pushState(
            { ...(window.history.state || {}), tab: url.searchParams.get("tab"), full: next },
            "",
            url.toString()
          );
          window.dispatchEvent(new CustomEvent("gbs_full_display_toggled", { detail: { full: next } }));
        } catch { }
      }
      return next;
    });
  };

  return (
    <div
      className={`window-controls-bar ${className}`}
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: "10px",
        padding: "8px 14px",
        background: "rgba(15, 23, 42, 0.85)",
        backdropFilter: "blur(12px)",
        border: "1px solid rgba(56, 189, 248, 0.25)",
        borderRadius: "10px",
        marginBottom: "12px",
        fontSize: "0.82rem",
        zIndex: 10
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
        {inRouter ? (
          <RouterSmartBackButton
            onBack={onBack}
            customBackLabel={customBackLabel}
            isDevContext={isDevContext}
          />
        ) : (
          <button
            type="button"
            className="btn-window-control btn-window-back"
            onClick={handleBack}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              padding: "6px 14px",
              background: "rgba(30, 41, 59, 0.9)",
              border: "1px solid rgba(56, 189, 248, 0.4)",
              borderRadius: "8px",
              color: "#38bdf8",
              fontWeight: "700",
              cursor: "pointer",
              transition: "all 0.2s"
            }}
          >
            <span>{customBackLabel}</span>
          </button>
        )}

        <span style={{ color: "#94a3b8", fontWeight: "600", fontSize: "0.78rem" }}>
          {title}
        </span>
      </div>

      {/* TOP CENTER BRANDING */}
      <div
        className="window-controls-center-brand"
        style={{
          textAlign: "center",
          flex: 1,
          padding: "0 12px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center"
        }}
      >
        <span
          style={{
            fontSize: "0.88rem",
            fontWeight: "900",
            letterSpacing: "1.2px",
            color: isDevContext ? "#38bdf8" : "#34d399",
            textTransform: "uppercase",
            display: "inline-flex",
            alignItems: "center",
            gap: "6px"
          }}
        >
          {brandLogo ? (
            <img
              src={brandLogo}
              alt="Logo"
              style={{ width: "20px", height: "20px", borderRadius: "4px", objectFit: "cover", border: "1px solid rgba(52,211,153,0.5)" }}
              onError={(e) => { e.target.style.display = "none"; }}
            />
          ) : (
            <span>{isDevContext ? "🏛️" : "🏫"}</span>
          )}
          <span>{isDevContext ? "GBS SCHOOL MANAGEMENT SYSTEM" : String(brandName || "").toUpperCase()}</span>
        </span>
        <span style={{ fontSize: "0.68rem", color: "#94a3b8" }}>
          {isDevContext
            ? "OFFICIAL DEVELOPER PLATFORM"
            : "OFFICIAL TENANT INSTITUTION"}
        </span>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
        {!isModal &&
          (inRouter ? (
            <RouterOnboardActionButton />
          ) : (
            <OnboardActionButton onNavigate={(url) => window.location.assign(url)} />
          ))}

        {!isModal && (
          <>
            <button
              type="button"
              className="btn-window-control btn-presentation-video"
              onClick={() => setShowRoleVideoHub(true)}
              style={{
                padding: "5px 11px",
                background: "linear-gradient(135deg, #d97706, #b45309)",
                border: "1px solid #fbbf24",
                borderRadius: "6px",
                color: "#ffffff",
                cursor: "pointer",
                fontSize: "0.75rem",
                fontWeight: "800"
              }}
            >
              🎬 Presentation Video
            </button>

            <button
              type="button"
              className="btn-window-control btn-operating-guide"
              onClick={() => setShowOperatingGuide(true)}
              style={{
                padding: "5px 11px",
                background: "rgba(16, 185, 129, 0.22)",
                border: "1px solid #10b981",
                borderRadius: "6px",
                color: "#34d399",
                cursor: "pointer",
                fontSize: "0.75rem",
                fontWeight: "800"
              }}
            >
              📖 Operating Guide
            </button>
          </>
        )}

        {/* Scroll Buttons */}
        <button
          type="button"
          className="btn-window-control btn-scroll-top"
          onClick={handleScrollTop}
          style={{
            padding: "5px 10px",
            background: "rgba(15, 23, 42, 0.9)",
            border: "1px solid rgba(255, 255, 255, 0.15)",
            borderRadius: "6px",
            color: "#cbd5e1",
            cursor: "pointer",
            fontSize: "0.75rem",
            fontWeight: "600"
          }}
        >
          ⬆ Top
        </button>

        <button
          type="button"
          className="btn-window-control btn-scroll-bottom"
          onClick={handleScrollBottom}
          style={{
            padding: "5px 10px",
            background: "rgba(15, 23, 42, 0.9)",
            border: "1px solid rgba(255, 255, 255, 0.15)",
            borderRadius: "6px",
            color: "#cbd5e1",
            cursor: "pointer",
            fontSize: "0.75rem",
            fontWeight: "600"
          }}
        >
          ⬇ Bottom
        </button>

        {/* Open Current Tab in Full New Browser Tab & Full-Display Expand Toggle */}
        {!isModal && (
          <button
            type="button"
            className="btn-window-control btn-open-full-tab"
            onClick={handleOpenActiveTabFullPage}
            style={{
              padding: "5px 11px",
              background: "rgba(212, 175, 55, 0.16)",
              border: "1px solid rgba(251, 191, 36, 0.55)",
              borderRadius: "6px",
              color: "#fbbf24",
              cursor: "pointer",
              fontSize: "0.75rem",
              fontWeight: "700"
            }}
          >
            ↗ Open Tab Full Page
          </button>
        )}

        {showExpand && (
          <button
            type="button"
            className="btn-window-control btn-window-expand"
            onClick={handleToggleExpand}
            style={{
              padding: "5px 12px",
              background: isExpanded ? "rgba(16, 185, 129, 0.25)" : "rgba(56, 189, 248, 0.15)",
              border: isExpanded ? "1px solid #10b981" : "1px solid rgba(56, 189, 248, 0.4)",
              borderRadius: "6px",
              color: isExpanded ? "#34d399" : "#38bdf8",
              cursor: "pointer",
              fontSize: "0.75rem",
              fontWeight: "700"
            }}
          >
            {isExpanded ? "↙ Exit Full Display" : "⛶ Full Display"}
          </button>
        )}

        {!isModal && isSignedInSession() && (
          <button
            type="button"
            className="btn-window-control btn-universal-signout"
            onClick={handleUniversalSignOut}
            style={{
              padding: "5px 13px",
              background: "linear-gradient(135deg, #ef4444, #b91c1c)",
              border: "1.5px solid #fca5a5",
              borderRadius: "6px",
              color: "#ffffff",
              cursor: "pointer",
              fontSize: "0.75rem",
              fontWeight: "900",
              boxShadow: "0 2px 8px rgba(239, 68, 68, 0.45)"
            }}
          >
            🚪 Sign Out
          </button>
        )}
      </div>

      {!isModal && showRoleVideoHub && (
        <CartoonRoleVideoHubModal
          isOpen={showRoleVideoHub}
          onClose={() => setShowRoleVideoHub(false)}
          initialRole={resolveCurrentRoleKey()}
        />
      )}

      {!isModal && showOperatingGuide && (
        <UniversalRoleGuideModal
          isOpen={showOperatingGuide}
          onClose={() => setShowOperatingGuide(false)}
          role={resolveCurrentRoleKey()}
        />
      )}
    </div>
  );
}
