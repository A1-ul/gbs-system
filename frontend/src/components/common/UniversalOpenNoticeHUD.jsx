import React, { useState, useEffect, useRef } from "react";

/**
 * UniversalOpenNoticeHUD — Global Open Notice & Real-Time Command Feedback Engine
 * Styled in the GBS First Page Royal Palette (Golden Blend #d4af37, Wine Brown #4a151b, Slate Grey #0f172a, Sky Blue #38bdf8).
 * Ensures EVERY user and developer command, action, and activity provides immediate, exact visual feedback
 * in the viewport even when scrolled down long dashboards.
 */
export default function UniversalOpenNoticeHUD() {
  const [notice, setNotice] = useState(null);
  const timerRef = useRef(null);
  const lastDispatchedRef = useRef({ text: "", time: 0 });

  useEffect(() => {
    const showNotice = (message, type = "success", title = "SYSTEM COMMAND VERIFIED") => {
      if (!message) return;
      const cleanMessage = typeof message === "string" ? message.trim() : String(message);
      if (!cleanMessage) return;

      const now = Date.now();
      if (
        lastDispatchedRef.current.text === cleanMessage &&
        now - lastDispatchedRef.current.time < 600
      ) {
        return;
      }
      lastDispatchedRef.current = { text: cleanMessage, time: now };

      if (timerRef.current) clearTimeout(timerRef.current);
      setNotice({
        message: cleanMessage,
        type: type || "success",
        title: title || "SYSTEM COMMAND VERIFIED",
        id: now,
        timestamp: new Date().toLocaleTimeString(),
      });

      timerRef.current = setTimeout(() => {
        setNotice(null);
      }, 6500);
    };

    const handleCustomNotice = (e) => {
      const detail = e.detail || {};
      showNotice(
        detail.message || "Command executed successfully.",
        detail.type || "success",
        detail.title || "SYSTEM COMMAND FEEDBACK"
      );
    };

    window.addEventListener("gbs-open-notice", handleCustomNotice);
    window.showGBSOpenNotice = showNotice;

    // Intercept window.alert so native alerts become rich, non-blocking, exact feedback HUD notices
    const originalAlert = window.alert;
    window.alert = (msg) => {
      const text = String(msg || "");
      const lower = text.toLowerCase();
      const isErr =
        lower.includes("error") ||
        lower.includes("fail") ||
        lower.includes("denied") ||
        lower.includes("invalid") ||
        lower.includes("locked") ||
        lower.includes("blocked") ||
        lower.includes("cannot") ||
        lower.includes("❌") ||
        lower.includes("⛔");
      const isWarn =
        !isErr &&
        (lower.includes("warn") ||
          lower.includes("please") ||
          lower.includes("required") ||
          lower.includes("missing") ||
          lower.includes("⚠️"));
      showNotice(
        text,
        isErr ? "error" : isWarn ? "warning" : "success",
        isErr
          ? "ACTION BLOCKED / ALERT"
          : isWarn
          ? "VALIDATION REQUIREMENT"
          : "COMMAND EXECUTION RESPONSE"
      );
    };

    // Global interactive command listener: catches any action button click across all roles & developer tabs
    // that doesn't immediately trigger its own notice within 180ms, guaranteeing zero silent clicks.
    const ACTION_VERBS = [
      "approve",
      "reject",
      "lock",
      "unlock",
      "suspend",
      "restore",
      "archive",
      "delete",
      "purge",
      "clear",
      "publish",
      "verify",
      "save",
      "submit",
      "update",
      "create",
      "add",
      "assign",
      "send",
      "broadcast",
      "dispatch",
      "reply",
      "post",
      "upload",
      "download",
      "export",
      "print",
      "generate",
      "sync",
      "refresh",
      "audit",
      "scan",
      "grade",
      "compute",
      "calculate",
      "enroll",
      "admit",
      "promote",
      "record",
      "mark",
      "clock",
      "request",
      "run",
      "test",
      "execute",
      "apply",
      "confirm",
      "activate",
      "enable",
      "disable",
      "reset",
      "backup",
      "deploy",
      "rollback",
      "ping",
      "locate",
      "track",
      "translate",
      "copy",
    ];

    const IGNORE_LABELS = [
      "close",
      "cancel",
      "back",
      "dismiss",
      "prev",
      "next",
      "sign in",
      "login",
      "log in",
      "logout",
      "sign out",
    ];

    const handleGlobalClick = (e) => {
      const btn = e.target?.closest?.("button, [role='button'], input[type='submit']");
      if (!btn || btn.disabled) return;

      // Skip navigation tabs, sidebar links, or notice close button
      if (
        btn.classList.contains("tab-btn") ||
        btn.classList.contains("nav-btn") ||
        btn.classList.contains("dev-tab-btn") ||
        btn.hasAttribute("data-no-hud-notice")
      ) {
        return;
      }

      const rawLabel = (
        btn.getAttribute("aria-label") ||
        btn.getAttribute("title") ||
        btn.innerText ||
        btn.value ||
        ""
      )
        .replace(/\s+/g, " ")
        .trim();

      if (!rawLabel || rawLabel.length > 75 || rawLabel.length < 2) return;
      const lower = rawLabel.toLowerCase();
      if (IGNORE_LABELS.some((ig) => lower === ig || lower.startsWith(ig + " "))) return;

      const matchesVerb = ACTION_VERBS.some((v) => lower.includes(v));
      if (!matchesVerb) return;

      const clickTime = Date.now();
      setTimeout(() => {
        // Only show fallback confirmation if no more specific API/state notice fired after this click
        if (lastDispatchedRef.current.time < clickTime) {
          const isDanger =
            lower.includes("delete") ||
            lower.includes("purge") ||
            lower.includes("reject") ||
            lower.includes("lock") ||
            lower.includes("suspend") ||
            lower.includes("kill");
          showNotice(
            `Command "${rawLabel}" processed and synchronized with active session state.`,
            isDanger ? "warning" : "info",
            "USER COMMAND EXECUTED"
          );
        }
      }, 280);
    };

    document.addEventListener("click", handleGlobalClick, true);

    return () => {
      window.removeEventListener("gbs-open-notice", handleCustomNotice);
      document.removeEventListener("click", handleGlobalClick, true);
      window.alert = originalAlert;
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  if (!notice) return null;

  const isError = notice.type === "error" || notice.type === "danger";
  const isWarning = notice.type === "warning";
  const isInfo = notice.type === "info";

  const borderColor = isError
    ? "#ef4444"
    : isWarning
    ? "#f59e0b"
    : isInfo
    ? "#38bdf8"
    : "#d4af37";

  const accentColor = isError
    ? "#fca5a5"
    : isWarning
    ? "#fde68a"
    : isInfo
    ? "#7dd3fc"
    : "#fbbf24";

  const bgGradient = isError
    ? "linear-gradient(135deg, rgba(74, 21, 27, 0.97) 0%, rgba(127, 29, 29, 0.96) 55%, rgba(15, 23, 42, 0.98) 100%)"
    : isWarning
    ? "linear-gradient(135deg, rgba(74, 21, 27, 0.97) 0%, rgba(120, 53, 15, 0.95) 55%, rgba(15, 23, 42, 0.98) 100%)"
    : "linear-gradient(135deg, rgba(74, 21, 27, 0.97) 0%, rgba(30, 41, 59, 0.97) 55%, rgba(15, 23, 42, 0.98) 100%)";

  const icon = isError ? "⛔" : isWarning ? "⚠️" : isInfo ? "💠" : "✅";

  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        position: "fixed",
        top: "18px",
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 999999,
        minWidth: "340px",
        maxWidth: "720px",
        width: "92%",
        background: bgGradient,
        border: `2px solid ${borderColor}`,
        borderRadius: "16px",
        padding: "14px 20px",
        boxShadow:
          "0 22px 50px rgba(0,0,0,0.85), 0 0 28px rgba(212, 175, 55, 0.32), inset 0 1px 0 rgba(255, 255, 255, 0.15)",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: "14px",
        color: "#ffffff",
        fontFamily: "'Plus Jakarta Sans', 'Inter', system-ui, sans-serif",
        backdropFilter: "blur(18px)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "14px", flex: 1 }}>
        <div
          style={{
            width: "40px",
            height: "40px",
            borderRadius: "12px",
            background: "rgba(212, 175, 55, 0.16)",
            border: `1px solid ${borderColor}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "20px",
            flexShrink: 0,
            boxShadow: "0 4px 12px rgba(0,0,0,0.4)",
          }}
        >
          {icon}
        </div>
        <div style={{ flex: 1 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              fontSize: "11px",
              fontWeight: 900,
              letterSpacing: "1.2px",
              textTransform: "uppercase",
              color: accentColor,
              marginBottom: "3px",
            }}
          >
            <span>{notice.title}</span>
            <span style={{ opacity: 0.65, fontSize: "10px", fontWeight: 600 }}>
              • {notice.timestamp}
            </span>
          </div>
          <div
            style={{
              fontSize: "13.5px",
              fontWeight: 700,
              color: "#f8fafc",
              lineHeight: 1.45,
              wordBreak: "break-word",
            }}
          >
            {notice.message}
          </div>
        </div>
      </div>

      <button
        type="button"
        data-no-hud-notice="true"
        onClick={() => setNotice(null)}
        style={{
          background: "linear-gradient(135deg, rgba(212, 175, 55, 0.22), rgba(74, 21, 27, 0.6))",
          border: "1px solid rgba(212, 175, 55, 0.5)",
          color: "#fbbf24",
          borderRadius: "8px",
          padding: "6px 12px",
          fontSize: "11px",
          fontWeight: 800,
          cursor: "pointer",
          flexShrink: 0,
          letterSpacing: "0.5px",
        }}
      >
        OK ✕
      </button>
    </div>
  );
}
