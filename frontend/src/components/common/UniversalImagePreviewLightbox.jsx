import React, { useEffect, useState, useCallback } from "react";

/**
 * UniversalImagePreviewLightbox
 * Enables one-click high-resolution evidence preview for EVERY content/evidence image
 * across all GBS dashboards (Headmaster, Teacher, Student, Parent, Accountant, Staff,
 * HR, Secretary, Alumni, and Developer).
 *
 * Strictly zero tooltips (no title attributes).
 */
export default function UniversalImagePreviewLightbox() {
  const [preview, setPreview] = useState(null);
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [naturalDims, setNaturalDims] = useState({ width: 0, height: 0 });

  const openPreview = useCallback((payload = {}) => {
    if (!payload || !payload.src) return;
    setZoom(1);
    setRotation(0);
    setNaturalDims({ width: 0, height: 0 });
    setPreview({
      src: payload.src,
      title: payload.title || "Institutional Evidence Image",
      subtitle: payload.subtitle || "",
      sourceDashboard: payload.sourceDashboard || window.location.pathname || "/",
      capturedAt: payload.capturedAt || new Date().toLocaleString(),
      metadata: payload.metadata || null
    });
  }, []);

  const closePreview = useCallback(() => {
    setPreview(null);
    setZoom(1);
    setRotation(0);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;

    window.openGBSImagePreview = openPreview;
    window.closeGBSImagePreview = closePreview;

    const handleCustomEvent = (e) => {
      if (e?.detail?.src) openPreview(e.detail);
    };

    const handleGlobalImageClick = (e) => {
      if (e.defaultPrevented) return;
      const target = e.target;
      if (!target || target.tagName !== "IMG") return;
      if (target.closest("[data-gbs-image-lightbox='true']")) return;
      if (target.getAttribute("data-no-preview") === "true") return;

      const src = target.currentSrc || target.getAttribute("src") || "";
      if (!src || src === "about:blank") return;

      // Skip tiny UI icons (<= 30px) unless explicitly flagged for evidence preview
      const rect = target.getBoundingClientRect();
      const explicitPreview = target.getAttribute("data-evidence-preview") === "true";
      if (!explicitPreview && (rect.width < 32 || rect.height < 32)) return;

      // Do not hijack buttons/links unless image is explicitly marked previewable or a large evidence photo (>= 72px)
      const interactiveParent = target.closest("button, a");
      if (interactiveParent && !explicitPreview) {
        return;
      }

      const altText = (target.getAttribute("alt") || "").trim();
      const figureCaption = target.closest("figure")?.querySelector("figcaption")?.textContent?.trim() || "";
      const cardHeading =
        target.closest("[data-evidence-card], .evidence-card, .role-card, .modal-card")?.querySelector("h3, h4, strong")?.textContent?.trim() || "";

      openPreview({
        src,
        title: altText || figureCaption || cardHeading || "Evidence Image Preview",
        subtitle: figureCaption && figureCaption !== altText ? figureCaption : "",
        sourceDashboard: window.location.pathname,
        capturedAt: new Date().toLocaleString()
      });
    };

    const handleKeyDown = (e) => {
      if (e.key === "Escape") closePreview();
      if (preview && (e.key === "+" || e.key === "=")) setZoom((z) => Math.min(4, Number((z + 0.25).toFixed(2))));
      if (preview && e.key === "-") setZoom((z) => Math.max(0.5, Number((z - 0.25).toFixed(2))));
    };

    window.addEventListener("gbs_open_image_preview", handleCustomEvent);
    document.addEventListener("click", handleGlobalImageClick, false);
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("gbs_open_image_preview", handleCustomEvent);
      document.removeEventListener("click", handleGlobalImageClick, false);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [openPreview, closePreview, preview]);

  if (!preview) return null;

  const handleDownloadEvidence = () => {
    try {
      const link = document.createElement("a");
      link.href = preview.src;
      const safeName = String(preview.title || "gbs-evidence")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "")
        .slice(0, 48);
      link.download = `${safeName || "gbs-evidence"}-${Date.now()}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch {
      window.open(preview.src, "_blank", "noopener,noreferrer");
    }
  };

  const handlePrintEvidence = () => {
    const win = window.open("", "_blank", "width=920,height=740");
    if (!win) return;
    const esc = (s) =>
      String(s || "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
    win.document.write(`<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>GBS Official Evidence Preview — ${esc(preview.title)}</title>
  <style>
    body { font-family: Arial, Helvetica, sans-serif; padding: 28px; color: #0f172a; }
    .hdr { border-bottom: 3px solid #081833; padding-bottom: 12px; margin-bottom: 18px; display: flex; justify-content: space-between; align-items: center; }
    .badge { background: #081833; color: #f6dd84; padding: 4px 10px; border-radius: 6px; font-size: 12px; font-weight: 800; }
    .meta { background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 8px; padding: 12px; margin-bottom: 16px; font-size: 13px; }
    .img-wrap { text-align: center; border: 1px solid #cbd5e1; border-radius: 10px; padding: 14px; background: #fff; }
    .img-wrap img { max-width: 100%; max-height: 68vh; object-fit: contain; }
  </style>
</head>
<body>
  <div class="hdr">
    <div>
      <h2 style="margin:0;">${esc(preview.title)}</h2>
      <div style="color:#475569;font-size:13px;">${esc(preview.subtitle || "Verified GBS Institutional Evidence Record")}</div>
    </div>
    <span class="badge">GBS EVIDENCE RECORD</span>
  </div>
  <div class="meta">
    <div><strong>Portal Route:</strong> ${esc(preview.sourceDashboard)}</div>
    <div><strong>Inspected At:</strong> ${esc(preview.capturedAt)}</div>
    ${naturalDims.width ? `<div><strong>Image Resolution:</strong> ${naturalDims.width} × ${naturalDims.height} px</div>` : ""}
  </div>
  <div class="img-wrap">
    <img src="${esc(preview.src)}" alt="${esc(preview.title)}" />
  </div>
  <script>window.onload = function () { setTimeout(function () { window.print(); }, 250); };</script>
</body>
</html>`);
    win.document.close();
  };

  return (
    <div
      data-gbs-image-lightbox="true"
      data-testid="universal-image-preview-lightbox"
      onClick={closePreview}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 2147483000,
        background: "rgba(2, 6, 23, 0.92)",
        backdropFilter: "blur(8px)",
        display: "flex",
        flexDirection: "column",
        padding: "16px",
        boxSizing: "border-box"
      }}
    >
      {/* Top Evidence Header & Controls */}
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "10px",
          background: "rgba(15, 23, 42, 0.96)",
          border: "1px solid rgba(56, 189, 248, 0.4)",
          borderRadius: "12px",
          padding: "10px 16px",
          color: "#f8fafc",
          marginBottom: "12px"
        }}
      >
        <div style={{ minWidth: "200px" }}>
          <div style={{ fontSize: "0.7rem", fontWeight: 900, color: "#38bdf8", letterSpacing: "0.7px" }}>
            🔍 GBS EVIDENCE IMAGE INSPECTOR
          </div>
          <div style={{ fontSize: "0.95rem", fontWeight: 800, color: "#f8fafc" }}>
            {preview.title}
          </div>
          <div style={{ fontSize: "0.74rem", color: "#94a3b8" }}>
            {preview.subtitle ? `${preview.subtitle} • ` : ""}
            {naturalDims.width > 0 ? `${naturalDims.width}×${naturalDims.height}px • ` : ""}
            Inspected: {preview.capturedAt}
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
          <button
            type="button"
            onClick={() => setZoom((z) => Math.max(0.5, Number((z - 0.25).toFixed(2))))}
            style={{
              background: "rgba(30, 41, 59, 0.95)",
              border: "1px solid #475569",
              color: "#f8fafc",
              borderRadius: "8px",
              padding: "6px 11px",
              fontWeight: 800,
              fontSize: "0.78rem",
              cursor: "pointer"
            }}
          >
            ➖ Zoom Out
          </button>
          <span style={{ fontSize: "0.78rem", fontWeight: 800, color: "#f6dd84", minWidth: "46px", textAlign: "center" }}>
            {Math.round(zoom * 100)}%
          </span>
          <button
            type="button"
            onClick={() => setZoom((z) => Math.min(4, Number((z + 0.25).toFixed(2))))}
            style={{
              background: "rgba(30, 41, 59, 0.95)",
              border: "1px solid #475569",
              color: "#f8fafc",
              borderRadius: "8px",
              padding: "6px 11px",
              fontWeight: 800,
              fontSize: "0.78rem",
              cursor: "pointer"
            }}
          >
            ➕ Zoom In
          </button>
          <button
            type="button"
            onClick={() => setRotation((r) => (r + 90) % 360)}
            style={{
              background: "rgba(30, 41, 59, 0.95)",
              border: "1px solid #475569",
              color: "#f8fafc",
              borderRadius: "8px",
              padding: "6px 11px",
              fontWeight: 800,
              fontSize: "0.78rem",
              cursor: "pointer"
            }}
          >
            🔄 Rotate
          </button>
          <button
            type="button"
            onClick={() => {
              setZoom(1);
              setRotation(0);
            }}
            style={{
              background: "rgba(30, 41, 59, 0.95)",
              border: "1px solid #475569",
              color: "#cbd5e1",
              borderRadius: "8px",
              padding: "6px 11px",
              fontWeight: 700,
              fontSize: "0.78rem",
              cursor: "pointer"
            }}
          >
            Reset
          </button>
          <button
            type="button"
            onClick={handleDownloadEvidence}
            style={{
              background: "linear-gradient(135deg, #0284c7, #2563eb)",
              border: "none",
              color: "#ffffff",
              borderRadius: "8px",
              padding: "6px 12px",
              fontWeight: 800,
              fontSize: "0.78rem",
              cursor: "pointer"
            }}
          >
            ⬇️ Download Evidence
          </button>
          <button
            type="button"
            onClick={handlePrintEvidence}
            style={{
              background: "linear-gradient(135deg, #059669, #10b981)",
              border: "none",
              color: "#ffffff",
              borderRadius: "8px",
              padding: "6px 12px",
              fontWeight: 800,
              fontSize: "0.78rem",
              cursor: "pointer"
            }}
          >
            🖨️ Print Sheet
          </button>
          <button
            type="button"
            onClick={closePreview}
            aria-label="Close evidence preview"
            style={{
              background: "#dc2626",
              border: "none",
              color: "#ffffff",
              borderRadius: "8px",
              padding: "6px 14px",
              fontWeight: 900,
              fontSize: "0.82rem",
              cursor: "pointer"
            }}
          >
            ✕ Close
          </button>
        </div>
      </div>

      {/* Scrollable High-Resolution Image Viewport */}
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          flex: 1,
          overflow: "auto",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "rgba(9, 15, 32, 0.85)",
          borderRadius: "12px",
          border: "1px solid rgba(148, 163, 184, 0.22)",
          padding: "20px"
        }}
      >
        <img
          src={preview.src}
          alt={preview.title}
          data-no-preview="true"
          onLoad={(e) => {
            setNaturalDims({
              width: e.currentTarget.naturalWidth || 0,
              height: e.currentTarget.naturalHeight || 0
            });
          }}
          style={{
            maxWidth: zoom <= 1 ? "94%" : "none",
            maxHeight: zoom <= 1 ? "78vh" : "none",
            transform: `scale(${zoom}) rotate(${rotation}deg)`,
            transformOrigin: "center center",
            transition: "transform 0.18s ease",
            borderRadius: "10px",
            boxShadow: "0 20px 55px rgba(0, 0, 0, 0.75)",
            background: "#0f172a"
          }}
        />
      </div>
    </div>
  );
}
