import React, { useState, useEffect, useRef } from "react";

/**
 * UniversalHeadingTooltipHUD
 * Non-blocking hover explanation pill & native tooltip enrichment across all headings,
 * portal navigation tabs, and command controls on every GBS dashboard.
 * Uses `pointer-events: none` so hover feedback never intercepts mouse clicks or taps.
 */
export default function UniversalHeadingTooltipHUD() {
  const [tooltip, setTooltip] = useState(null);
  const hideTimerRef = useRef(null);

  useEffect(() => {
    const resolveHoverText = (target) => {
      if (!target || typeof target.closest !== "function") return null;
      const el = target.closest("[data-gbs-tip], button[title], h1, h2, h3, .role-tab-btn, .dev-tab-btn");
      if (!el) return null;

      const explicitTip = el.getAttribute("data-gbs-tip") || el.getAttribute("title") || el.getAttribute("aria-label");
      if (explicitTip && explicitTip.trim().length >= 6) {
        return { text: explicitTip.trim(), rect: el.getBoundingClientRect() };
      }

      const tag = el.tagName?.toUpperCase();
      const labelText = (el.innerText || "").replace(/\s+/g, " ").trim();
      if (!labelText || labelText.length < 3 || labelText.length > 90) return null;

      if (el.classList?.contains("role-tab-btn") || el.classList?.contains("dev-tab-btn")) {
        return {
          text: `Open "${labelText}" module view (or click "Open New Tab" for full-page display).`,
          rect: el.getBoundingClientRect()
        };
      }

      if (tag === "H1" || tag === "H2" || tag === "H3") {
        return {
          text: `Section: ${labelText} — Synchronized with GBS-RCCE live workspace controls.`,
          rect: el.getBoundingClientRect()
        };
      }

      return null;
    };

    const handleMouseOver = (e) => {
      const info = resolveHoverText(e.target);
      if (!info) return;
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
      const x = Math.min(window.innerWidth - 320, Math.max(12, info.rect.left));
      const y = info.rect.bottom + 8 > window.innerHeight - 60
        ? Math.max(12, info.rect.top - 42)
        : info.rect.bottom + 8;
      setTooltip({ text: info.text, x, y });
    };

    const handleMouseOut = () => {
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
      hideTimerRef.current = setTimeout(() => setTooltip(null), 120);
    };

    document.addEventListener("mouseover", handleMouseOver, true);
    document.addEventListener("mouseout", handleMouseOut, true);
    return () => {
      document.removeEventListener("mouseover", handleMouseOver, true);
      document.removeEventListener("mouseout", handleMouseOut, true);
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    };
  }, []);

  if (!tooltip) return null;

  return (
    <div
      role="tooltip"
      style={{
        position: "fixed",
        left: `${tooltip.x}px`,
        top: `${tooltip.y}px`,
        maxWidth: "310px",
        zIndex: 999990,
        pointerEvents: "none",
        background: "linear-gradient(135deg, rgba(8, 20, 40, 0.96), rgba(15, 35, 71, 0.96))",
        border: "1px solid rgba(212, 175, 55, 0.72)",
        borderRadius: "10px",
        padding: "7px 11px",
        color: "#f8fafc",
        fontSize: "0.74rem",
        fontWeight: 600,
        lineHeight: 1.35,
        boxShadow: "0 10px 24px rgba(0, 0, 0, 0.55)"
      }}
    >
      <span style={{ color: "#d4af37", fontWeight: 900, marginRight: "5px" }}>💡</span>
      {tooltip.text}
    </div>
  );
}
