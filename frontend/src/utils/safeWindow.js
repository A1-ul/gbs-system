/**
 * safeWindow.js
 * Cross-device (Desktop + iOS Safari + Android Chrome) window, external link, clipboard, and print helpers.
 * Never crashes when mobile popup blockers return null from window.open().
 */

export function openUrlSafely(url, { fallbackSameTab = true, title = "Link" } = {}) {
  if (!url || typeof window === "undefined") return false;
  let win = null;
  try {
    win = window.open(url, "_blank", "noopener,noreferrer");
  } catch {
    win = null;
  }
  if (win) return true;

  // Popup blocked (common on mobile Safari/Chrome after async calls): use anchor click or same-tab navigation
  try {
    const a = document.createElement("a");
    a.href = url;
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    a.style.display = "none";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    return true;
  } catch {
    if (fallbackSameTab) {
      window.location.assign(url);
      return true;
    }
    if (window.showGBSOpenNotice) {
      window.showGBSOpenNotice(`Popup blocked opening ${title}. Please allow popups or open directly.`, "warning", "POPUP BLOCKED");
    }
    return false;
  }
}

export function printHtmlSafely(htmlContent, { title = "GBS Document", windowFeatures = "width=1020,height=800" } = {}) {
  if (typeof window === "undefined" || typeof document === "undefined") return false;
  let win = null;
  try {
    win = window.open("", "_blank", windowFeatures);
  } catch {
    win = null;
  }

  if (win && win.document) {
    try {
      win.document.open();
      win.document.write(htmlContent);
      win.document.close();
      setTimeout(() => {
        try {
          win.focus();
          win.print();
        } catch { }
      }, 280);
      return true;
    } catch { }
  }

  // Hidden iframe fallback for mobile browsers where window.open("", "_blank") is blocked or suppressed
  try {
    const iframe = document.createElement("iframe");
    iframe.style.position = "fixed";
    iframe.style.right = "0";
    iframe.style.bottom = "0";
    iframe.style.width = "0";
    iframe.style.height = "0";
    iframe.style.border = "0";
    iframe.setAttribute("aria-hidden", "true");
    document.body.appendChild(iframe);
    const doc = iframe.contentDocument || iframe.contentWindow?.document;
    if (doc) {
      doc.open();
      doc.write(htmlContent);
      doc.close();
      setTimeout(() => {
        try {
          iframe.contentWindow?.focus();
          iframe.contentWindow?.print();
        } catch {
          window.print();
        } finally {
          setTimeout(() => {
            try {
              document.body.removeChild(iframe);
            } catch { }
          }, 1500);
        }
      }, 300);
      return true;
    }
  } catch { }

  // Final printable HTML download fallback
  try {
    const blob = new Blob([htmlContent], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    return true;
  } catch {
    return false;
  }
}

export async function copyTextSafely(text) {
  const value = String(text ?? "");
  if (typeof navigator !== "undefined" && navigator.clipboard && window.isSecureContext) {
    try {
      await navigator.clipboard.writeText(value);
      return true;
    } catch { }
  }
  try {
    const ta = document.createElement("textarea");
    ta.value = value;
    ta.setAttribute("readonly", "");
    ta.style.position = "fixed";
    ta.style.left = "-9999px";
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
}

