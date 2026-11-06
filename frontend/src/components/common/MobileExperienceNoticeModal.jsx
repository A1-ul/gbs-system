import React, { useState, useEffect } from "react";

/**
 * MobileExperienceNoticeModal
 * Alerts users launching the GBS system on mobile devices or smaller screens:
 * "YOU WOULD ENJOY THE APPEARANCE WHEN LAUNCHED ON A LAPTOP OR PC."
 */
export default function MobileExperienceNoticeModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    // Check if dismissed in this session or permanently
    const sessionDismissed = sessionStorage.getItem("gbs_mobile_notice_dismissed");
    const permDismissed = localStorage.getItem("gbs_mobile_notice_dismissed_permanent");

    if (sessionDismissed || permDismissed) {
      return;
    }

    // Detect mobile by user agent or screen width
    const isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
      navigator.userAgent || ""
    );
    const isSmallScreen = window.innerWidth <= 860;

    if (isMobileDevice || isSmallScreen) {
      // Delay slightly for smooth page entrance
      const timer = setTimeout(() => {
        setIsOpen(true);
      }, 700);
      return () => clearTimeout(timer);
    }
  }, []);

  if (!isOpen) return null;

  const handleDismiss = (permanent = false) => {
    sessionStorage.setItem("gbs_mobile_notice_dismissed", "true");
    if (permanent) {
      localStorage.setItem("gbs_mobile_notice_dismissed_permanent", "true");
    }
    setIsOpen(false);
  };

  const handleCopyLink = async () => {
    try {
      const url = window.location.href;
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(url);
      } else {
        const input = document.createElement("input");
        input.value = url;
        document.body.appendChild(input);
        input.select();
        document.execCommand("copy");
        document.body.removeChild(input);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    } catch {
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 999999,
        background: "rgba(3, 7, 18, 0.88)",
        backdropFilter: "blur(8px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "16px",
        animation: "fadeIn 0.25s ease-out"
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "460px",
          background: "linear-gradient(145deg, #0f172a 0%, #1e293b 100%)",
          border: "2px solid #38bdf8",
          borderRadius: "20px",
          boxShadow: "0 25px 60px rgba(0, 0, 0, 0.9), 0 0 35px rgba(56, 189, 248, 0.25)",
          padding: "24px 20px",
          color: "#f8fafc",
          textAlign: "center",
          position: "relative"
        }}
      >
        {/* Glowing Badge */}
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "8px",
            background: "rgba(56, 189, 248, 0.12)",
            border: "1px solid rgba(56, 189, 248, 0.35)",
            padding: "6px 14px",
            borderRadius: "999px",
            fontSize: "0.75rem",
            fontWeight: 800,
            letterSpacing: "0.08em",
            color: "#38bdf8",
            marginBottom: "14px",
            textTransform: "uppercase"
          }}
        >
          <span>💻</span>
          <span>Desktop Experience Recommended</span>
        </div>

        {/* Big Alert Banner with Requested Exact Text */}
        <div
          style={{
            background: "linear-gradient(135deg, rgba(234, 179, 8, 0.15), rgba(249, 115, 22, 0.15))",
            border: "1.5px solid #f59e0b",
            borderRadius: "14px",
            padding: "16px 14px",
            marginBottom: "16px"
          }}
        >
          <div style={{ fontSize: "1.8rem", marginBottom: "6px" }}>🖥️ ✨</div>
          <h2
            style={{
              fontSize: "1.05rem",
              fontWeight: 900,
              lineHeight: "1.45",
              color: "#fef08a",
              margin: 0,
              textTransform: "uppercase",
              letterSpacing: "0.03em"
            }}
          >
            YOU WOULD ENJOY THE APPEARANCE WHEN LAUNCHED ON A LAPTOP OR PC.
          </h2>
        </div>

        <p
          style={{
            fontSize: "0.85rem",
            color: "#94a3b8",
            lineHeight: "1.55",
            margin: "0 0 20px 0"
          }}
        >
          The GBS Enterprise School System is equipped with multi-column live telemetry,
          interactive biometric sentinels, high-density class registers, and rich analytics
          engineered for widescreen laptops, desktop monitors, and workstations.
        </p>

        {/* Action Buttons */}
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          <button
            type="button"
            onClick={handleCopyLink}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
              padding: "12px 18px",
              background: copied
                ? "linear-gradient(135deg, #10b981, #059669)"
                : "linear-gradient(135deg, #0284c7, #38bdf8)",
              border: "none",
              borderRadius: "10px",
              color: copied ? "#ffffff" : "#0f172a",
              fontWeight: 800,
              fontSize: "0.88rem",
              cursor: "pointer",
              boxShadow: "0 4px 14px rgba(56, 189, 248, 0.3)",
              transition: "all 0.2s ease"
            }}
          >
            {copied ? (
              <>
                <span>✓</span>
                <span>Portal Link Copied! Send to PC</span>
              </>
            ) : (
              <>
                <span>📋</span>
                <span>Copy Portal Link for Laptop / PC</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={() => handleDismiss(false)}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "6px",
              padding: "11px 16px",
              background: "rgba(30, 41, 59, 0.8)",
              border: "1px solid rgba(148, 163, 184, 0.25)",
              borderRadius: "10px",
              color: "#e2e8f0",
              fontWeight: 700,
              fontSize: "0.84rem",
              cursor: "pointer"
            }}
          >
            <span>📱</span>
            <span>Continue on Mobile Device</span>
          </button>

          <button
            type="button"
            onClick={() => handleDismiss(true)}
            style={{
              background: "transparent",
              border: "none",
              color: "#64748b",
              fontSize: "0.72rem",
              cursor: "pointer",
              padding: "4px",
              marginTop: "4px",
              textDecoration: "underline"
            }}
          >
            Don't show this advisory again on this browser
          </button>
        </div>
      </div>
    </div>
  );
}

