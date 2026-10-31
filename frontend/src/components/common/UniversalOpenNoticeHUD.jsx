import React, { useState, useEffect, useCallback } from "react";

/**
 * UniversalOpenNoticeHUD
 * Displays prominent, open-place floating notifications across every user dashboard
 * whenever an entry, message, feedback, or update is processed by any user.
 */
export default function UniversalOpenNoticeHUD() {
  const [notice, setNotice] = useState(null);

  // Synthesize clean audio confirmation tone using Web Audio API (zero external assets needed)
  const playAudioChime = useCallback((type = "success") => {
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;
      const ctx = new AudioContext();
      if (ctx.state === "suspended") {
        ctx.resume();
      }

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "sine";
      const freq = type === "error" ? 320 : type === "warning" ? 440 : 659.25; // E5 note for success
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      if (type === "success") {
        osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.15); // Ramp to A5
      }

      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.36);
    } catch {
      // Audio autoplay policy fallback - silent fail gracefully
    }
  }, []);

  const triggerNotice = useCallback(({ message, type = "success", title = "Action Confirmed" }) => {
    setNotice({
      id: Date.now(),
      message,
      type,
      title,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })
    });
    playAudioChime(type);
  }, [playAudioChime]);

  useEffect(() => {
    // Global helper exposed to window
    window.showGBSOpenNotice = (message, type = "success", title = "Action Confirmed") => {
      triggerNotice({ message, type, title });
    };

    const handleCustomNotice = (e) => {
      if (e.detail) {
        triggerNotice(e.detail);
      }
    };

    const handleParentFeedback = () => {
      triggerNotice({
        title: "Parent Message & Feedback Dispatched",
        message: "Your message has been delivered to the Headmaster and Teacher portal inbox.",
        type: "success"
      });
    };

    const handleFreshReset = () => {
      triggerNotice({
        title: "Production System Clean Slate",
        message: "All fake test data cleared. System ready for real user entry.",
        type: "info"
      });
    };

    window.addEventListener("gbs_open_notice", handleCustomNotice);
    window.addEventListener("gbs_parent_feedback_updated", handleParentFeedback);
    window.addEventListener("gbs_fresh_state_reset", handleFreshReset);

    return () => {
      window.removeEventListener("gbs_open_notice", handleCustomNotice);
      window.removeEventListener("gbs_parent_feedback_updated", handleParentFeedback);
      window.removeEventListener("gbs_fresh_state_reset", handleFreshReset);
    };
  }, [triggerNotice]);

  // Auto-dismiss after 6 seconds
  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => {
      setNotice(null);
    }, 6000);
    return () => clearTimeout(timer);
  }, [notice]);

  if (!notice) return null;

  const isSuccess = notice.type === "success";
  const isError = notice.type === "error";
  const isWarning = notice.type === "warning";

  const borderColor = isSuccess ? "#10b981" : isError ? "#ef4444" : isWarning ? "#f59e0b" : "#38bdf8";
  const bgGlow = isSuccess ? "rgba(16, 185, 129, 0.2)" : isError ? "rgba(239, 68, 68, 0.2)" : "rgba(56, 189, 248, 0.2)";
  const icon = isSuccess ? "✅" : isError ? "⚠️" : isWarning ? "🔔" : "ℹ️";

  return (
    <aside
      aria-label="Universal System Notification"
      style={{
        position: "fixed",
        top: "20px",
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 9999999,
        maxWidth: "680px",
        width: "92vw",
        background: "linear-gradient(135deg, rgba(15, 23, 42, 0.98), rgba(30, 41, 59, 0.96))",
        border: `2px solid ${borderColor}`,
        borderRadius: "14px",
        boxShadow: `0 16px 40px rgba(0, 0, 0, 0.7), 0 0 24px ${bgGlow}`,
        backdropFilter: "blur(16px)",
        padding: "14px 18px",
        display: "flex",
        alignItems: "flex-start",
        gap: "14px",
        color: "#f8fafc",
        animation: "slideInDown 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
        pointerEvents: "auto"
      }}
    >
      <div
        style={{
          fontSize: "1.6rem",
          background: bgGlow,
          width: "44px",
          height: "44px",
          borderRadius: "10px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
          border: `1px solid ${borderColor}`
        }}
      >
        {icon}
      </div>

      <div style={{ flex: 1 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
            <span
              style={{
                fontSize: "0.72rem",
                fontWeight: "900",
                letterSpacing: "1px",
                textTransform: "uppercase",
                color: borderColor,
                background: bgGlow,
                padding: "2px 8px",
                borderRadius: "6px"
              }}
            >
              OPEN PLACE NOTICE • {notice.title}
            </span>
            <span style={{ fontSize: "0.72rem", color: "#94a3b8" }}>
              ⏱️ {notice.timestamp}
            </span>
          </div>

          <button
            type="button"
            onClick={() => setNotice(null)}
            style={{
              background: "transparent",
              border: "none",
              color: "#94a3b8",
              cursor: "pointer",
              fontSize: "1rem",
              padding: "0 4px",
              lineHeight: 1
            }}
            title="Dismiss notice"
          >
            ✕
          </button>
        </div>

        <p
          style={{
            margin: "6px 0 0",
            fontSize: "0.92rem",
            lineHeight: 1.45,
            color: "#f1f5f9",
            fontWeight: "600"
          }}
        >
          {notice.message}
        </p>
        <div style={{ fontSize: "0.72rem", color: "#64748b", marginTop: "4px" }}>
          📡 Broadcast live to GBS SCHOOL MANAGEMENT SYSTEM active session
        </div>
      </div>
    </aside>
  );
}
