import React, { useState, useEffect } from "react";
import { useNavigate, useInRouterContext } from "react-router-dom";
import { getActiveSchoolName, getActiveSchoolLogo } from "../../utils/schoolBranding";

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
      title="Open the Official Onboarding Form to register your Educational Institution / School"
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
    } else {
      window.history.back();
    }
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
    if (!modalTargetId && typeof document !== "undefined") {
      document.body.classList.toggle("gbs-full-display-mode", isExpanded);
    }
    return () => {
      if (!modalTargetId && typeof document !== "undefined") {
        document.body.classList.remove("gbs-full-display-mode");
      }
    };
  }, [isExpanded, modalTargetId]);

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
          window.history.replaceState(window.history.state, "", url.toString());
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
          title="Return to previous view without resetting page"
        >
          <span>{customBackLabel}</span>
        </button>

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
          title="Smooth scroll to top of window"
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
          title="Smooth scroll to bottom of window"
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
            title="Open the current active tab in a brand-new full-page browser tab"
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
            title={isExpanded ? "Restore standard dashboard view" : "Expand workspace to full-page display"}
          >
            {isExpanded ? "↙ Exit Full Display" : "⛶ Full Display"}
          </button>
        )}
      </div>
    </div>
  );
}
