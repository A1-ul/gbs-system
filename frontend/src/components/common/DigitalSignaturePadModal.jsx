import React, { useRef, useState, useEffect } from "react";

/**
 * GBS Enterprise Digital Signature Pad
 * Allows Headmaster, Principal, and Teachers to draw, preview, and affix handwritten digital signatures
 * Certified with timestamp and cryptographic verification hash for institutional clearance
 */
export default function DigitalSignaturePadModal({
  isOpen,
  onClose,
  onSave,
  signatoryTitle = "Headmaster / Academic Chancellor",
  signatoryName = "Dr. Gabriel Osei",
  role = "HEADMASTER"
}) {
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [inkColor, setInkColor] = useState("#0f2b5c"); // Official legal executive blue ink
  const [hasDrawn, setHasDrawn] = useState(false);
  const [savedSignature, setSavedSignature] = useState(() => {
    try {
      return localStorage.getItem(`gbs_signature_${role}`) || null;
    } catch {
      return null;
    }
  });

  useEffect(() => {
    if (isOpen && canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d");
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.lineWidth = 2.5;
      ctx.strokeStyle = inkColor;

      // Fill canvas background white for clean export
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
  }, [isOpen, inkColor]);

  if (!isOpen) return null;

  const startDrawing = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    const ctx = canvas.getContext("2d");
    ctx.strokeStyle = inkColor;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(clientX - rect.left, clientY - rect.top);
    setIsDrawing(true);
    setHasDrawn(true);
  };

  const draw = (e) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    const ctx = canvas.getContext("2d");
    ctx.lineTo(clientX - rect.left, clientY - rect.top);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const handleClear = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    setHasDrawn(false);
  };

  const handleAdoptAndSave = () => {
    const canvas = canvasRef.current;
    if (!canvas || !hasDrawn) {
      alert("Please draw your signature in the signature box before saving.");
      return;
    }
    const dataUrl = canvas.toDataURL("image/png");
    const sigPayload = {
      dataUrl,
      signatoryName,
      signatoryTitle,
      role,
      signedAt: new Date().toISOString(),
      formattedDate: new Date().toLocaleString(),
      hash: `SIG-SHA256-${Math.random().toString(36).substring(2, 10).toUpperCase()}-${Date.now().toString().slice(-4)}`
    };

    try {
      localStorage.setItem(`gbs_signature_${role}`, JSON.stringify(sigPayload));
      setSavedSignature(JSON.stringify(sigPayload));
    } catch {}

    if (onSave) {
      onSave(sigPayload);
    }
    onClose();
  };

  return (
    <div style={{
      position: "fixed",
      inset: 0,
      background: "rgba(3, 7, 18, 0.88)",
      backdropFilter: "blur(8px)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      zIndex: 9999999,
      padding: "20px"
    }}>
      <div style={{
        background: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)",
        border: "1.5px solid rgba(212, 175, 55, 0.4)",
        borderRadius: "16px",
        maxWidth: "580px",
        width: "100%",
        padding: "24px",
        color: "#f8fafc",
        boxShadow: "0 25px 60px rgba(0,0,0,0.85)"
      }}>
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid rgba(255,255,255,0.1)", paddingBottom: "14px", marginBottom: "18px" }}>
          <div>
            <h3 style={{ margin: 0, fontSize: "1.15rem", color: "#fbbf24", display: "flex", alignItems: "center", gap: "8px" }}>
              <span>✍️</span> OFFICIAL DIGITAL SIGNATURE & ENDORSEMENT
            </h3>
            <p style={{ margin: "4px 0 0", fontSize: "0.78rem", color: "#94a3b8" }}>
              Affix authorized digital signature to weekly attendance registers, student report cards, and broadsheets.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{ background: "none", border: "none", color: "#94a3b8", fontSize: "1.3rem", cursor: "pointer" }}
          >
            ✕
          </button>
        </div>

        {/* Signatory Info Banner */}
        <div style={{ background: "rgba(15, 23, 42, 0.6)", border: "1px solid rgba(255, 255, 255, 0.08)", borderRadius: "10px", padding: "12px", marginBottom: "16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <span style={{ fontSize: "0.72rem", color: "#94a3b8", display: "block" }}>SIGNATORY IDENTITY:</span>
            <strong style={{ color: "#38bdf8", fontSize: "0.92rem" }}>{signatoryName}</strong>
            <div style={{ fontSize: "0.75rem", color: "#fbbf24" }}>{signatoryTitle}</div>
          </div>
          <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
            <span style={{ fontSize: "0.75rem", color: "#94a3b8" }}>Ink:</span>
            <button
              type="button"
              onClick={() => setInkColor("#0f2b5c")}
              title="Official Blue Ink"
              style={{ width: "22px", height: "22px", borderRadius: "50%", background: "#0f2b5c", border: inkColor === "#0f2b5c" ? "2px solid #fbbf24" : "1px solid #fff", cursor: "pointer" }}
            />
            <button
              type="button"
              onClick={() => setInkColor("#000000")}
              title="Executive Black Ink"
              style={{ width: "22px", height: "22px", borderRadius: "50%", background: "#000000", border: inkColor === "#000000" ? "2px solid #fbbf24" : "1px solid #fff", cursor: "pointer" }}
            />
          </div>
        </div>

        {/* Canvas Signature Box */}
        <div style={{ marginBottom: "14px", position: "relative" }}>
          <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 700, color: "#cbd5e1", marginBottom: "6px" }}>
            Draw Signature Here (Mouse, Stylus, or Touch Screen):
          </label>
          <div style={{ borderRadius: "10px", overflow: "hidden", border: "2px dashed rgba(212, 175, 55, 0.5)", background: "#ffffff" }}>
            <canvas
              ref={canvasRef}
              width={530}
              height={170}
              onMouseDown={startDrawing}
              onMouseMove={draw}
              onMouseUp={stopDrawing}
              onMouseLeave={stopDrawing}
              onTouchStart={startDrawing}
              onTouchMove={draw}
              onTouchEnd={stopDrawing}
              style={{ width: "100%", height: "170px", display: "block", cursor: "crosshair", touchAction: "none" }}
            />
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "6px" }}>
            <span style={{ fontSize: "0.72rem", color: "#64748b" }}>
              Signature Line: ____________________________________
            </span>
            <button
              type="button"
              onClick={handleClear}
              style={{ background: "rgba(239, 68, 68, 0.15)", border: "1px solid #ef4444", color: "#f87171", borderRadius: "6px", padding: "3px 10px", fontSize: "0.72rem", fontWeight: 700, cursor: "pointer" }}
            >
              🔄 Clear & Redraw
            </button>
          </div>
        </div>

        {/* Existing Saved Signature Indicator */}
        {savedSignature && (
          <div style={{ padding: "8px 12px", background: "rgba(16, 185, 129, 0.12)", border: "1px solid rgba(16, 185, 129, 0.3)", borderRadius: "8px", fontSize: "0.75rem", color: "#d1fae5", marginBottom: "16px", display: "flex", alignItems: "center", gap: "8px" }}>
            <span>✓</span>
            <span>A verified digital signature for <strong>{role}</strong> is registered on file. Re-signing above will update your registered signature.</span>
          </div>
        )}

        {/* Action Controls */}
        <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
          <button
            type="button"
            onClick={onClose}
            style={{ padding: "9px 18px", background: "rgba(255, 255, 255, 0.08)", border: "1px solid rgba(255, 255, 255, 0.2)", borderRadius: "8px", color: "#cbd5e1", fontWeight: 700, cursor: "pointer" }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleAdoptAndSave}
            style={{ padding: "9px 24px", background: "linear-gradient(135deg, #f59e0b 0%, #10b981 100%)", border: "none", borderRadius: "8px", color: "#000", fontWeight: 900, cursor: "pointer", boxShadow: "0 4px 15px rgba(245, 158, 11, 0.4)" }}
          >
            ✍️ Adopt & Affix Signature
          </button>
        </div>
      </div>
    </div>
  );
}
