import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

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
  const navigate = useNavigate();
  const [isExpanded, setIsExpanded] = useState(false);

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

  const handleToggleExpand = () => {
    setIsExpanded((prev) => {
      const next = !prev;
      if (modalTargetId) {
        const el = document.getElementById(modalTargetId);
        if (el) {
          if (next) {
            el.style.maxWidth = "98vw";
            el.style.width = "98vw";
            el.style.height = "96vh";
            el.style.maxHeight = "96vh";
          } else {
            el.style.maxWidth = "";
            el.style.width = "";
            el.style.height = "";
            el.style.maxHeight = "";
          }
        }
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
            color: (title?.toLowerCase().includes("developer") || title?.toLowerCase().includes("control center")) ? "#38bdf8" : "#34d399",
            textTransform: "uppercase"
          }}
        >
          {(title?.toLowerCase().includes("developer") || title?.toLowerCase().includes("control center"))
            ? "🏛️ GBS SCHOOL MANAGEMENT SYSTEM"
            : `🏫 ${(localStorage.getItem("gbs_report_school_name") || "St. Augustine International Academy").toUpperCase()}`}
        </span>
        <span style={{ fontSize: "0.68rem", color: "#94a3b8" }}>
          {(title?.toLowerCase().includes("developer") || title?.toLowerCase().includes("control center"))
            ? "OFFICIAL DEVELOPER PLATFORM"
            : "OFFICIAL TENANT INSTITUTION"}
        </span>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
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

        {/* Expand / Restore Window Toggle Button */}
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
            title={isExpanded ? "Restore standard window dimensions" : "Expand window viewport using expansion arrows"}
          >
            {isExpanded ? "↙ Restore Window" : "↔ Expand Window"}
          </button>
        )}
      </div>
    </div>
  );
}
