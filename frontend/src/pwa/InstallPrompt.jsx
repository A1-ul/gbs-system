import React from "react";
import { usePWA } from "./PWAProvider";

/**
 * Clean PWA Install Prompt Button / Notification Bar
 * Strictly NO TOOLTIPS.
 */
export default function InstallPrompt({ className = "", style = {} }) {
  const { isInstallable, isInstalled, promptInstall } = usePWA();

  if (isInstalled || !isInstallable) return null;

  return (
    <button
      type="button"
      onClick={promptInstall}
      className={className}
      aria-label="Install GBS School System Application"
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "6px",
        padding: "8px 14px",
        background: "linear-gradient(135deg, #d4af37 0%, #b8860b 100%)",
        color: "#081428",
        fontWeight: 800,
        fontSize: "0.82rem",
        borderRadius: "8px",
        border: "1px solid #ffd700",
        cursor: "pointer",
        ...style
      }}
    >
      📱 <span>Install GBS App</span>
    </button>
  );
}
