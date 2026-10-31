import React, { useState, useEffect } from "react";

/**
 * UniversalHeadingTooltipHUD
 * Attaches intelligent hover tooltips to all headings (h1, h2, h3, h4, h5)
 * across every dashboard and portal in GBS School Management System.
 */
export default function UniversalHeadingTooltipHUD() {
  const [tooltip, setTooltip] = useState({
    visible: false,
    text: "",
    subText: "",
    x: 0,
    y: 0
  });

  useEffect(() => {
    const handleMouseOver = (e) => {
      const heading = e.target.closest("h1, h2, h3, h4, h5, .role-brand-title, .section-title, .mod-card-title");
      if (!heading) return;

      const titleAttr = heading.getAttribute("title") || heading.getAttribute("data-tooltip");
      const headingText = heading.innerText?.trim() || "";
      if (!headingText) return;

      const rect = heading.getBoundingClientRect();
      const x = rect.left + rect.width / 2;
      const y = rect.top - 8;

      setTooltip({
        visible: true,
        text: titleAttr || headingText,
        subText: titleAttr ? headingText : "Official System Module • Interactive Heading",
        x,
        y
      });
    };

    const handleMouseOut = (e) => {
      const heading = e.target.closest("h1, h2, h3, h4, h5, .role-brand-title, .section-title, .mod-card-title");
      if (heading) {
        setTooltip((prev) => ({ ...prev, visible: false }));
      }
    };

    document.addEventListener("mouseover", handleMouseOver, { passive: true });
    document.addEventListener("mouseout", handleMouseOut, { passive: true });

    return () => {
      document.removeEventListener("mouseover", handleMouseOver);
      document.removeEventListener("mouseout", handleMouseOut);
    };
  }, []);

  if (!tooltip.visible) return null;

  return (
    <div
      style={{
        position: "fixed",
        left: `${tooltip.x}px`,
        top: `${tooltip.y}px`,
        transform: "translate(-50%, -100%)",
        background: "rgba(15, 23, 42, 0.96)",
        border: "1.5px solid rgba(56, 189, 248, 0.6)",
        borderRadius: "10px",
        padding: "6px 14px",
        color: "#f8fafc",
        fontSize: "0.78rem",
        fontWeight: "700",
        boxShadow: "0 8px 24px rgba(0, 0, 0, 0.7), 0 0 16px rgba(56, 189, 248, 0.3)",
        pointerEvents: "none",
        zIndex: 999999,
        maxWidth: "380px",
        textAlign: "center",
        backdropFilter: "blur(10px)",
        transition: "opacity 0.15s ease",
        animation: "gbsTooltipFadeIn 0.2s ease forwards"
      }}
    >
      <div style={{ color: "#38bdf8", fontSize: "0.82rem", fontWeight: "800", textTransform: "uppercase", letterSpacing: "0.6px" }}>
        🔍 {tooltip.text}
      </div>
      {tooltip.subText && (
        <div style={{ color: "#94a3b8", fontSize: "0.7rem", marginTop: "2px", fontWeight: "500" }}>
          {tooltip.subText}
        </div>
      )}
      {/* Downward pointing triangle */}
      <div
        style={{
          position: "absolute",
          bottom: "-6px",
          left: "50%",
          transform: "translateX(-50%)",
          width: 0,
          height: 0,
          borderLeft: "6px solid transparent",
          borderRight: "6px solid transparent",
          borderTop: "6px solid rgba(56, 189, 248, 0.6)"
        }}
      />
    </div>
  );
}
