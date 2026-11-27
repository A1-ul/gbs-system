import React, { useState, useEffect, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import { io } from "socket.io-client";
import apiClient from "../../api/client/apiClient";
import { getServerBaseUrl } from "../../api/client/apiConfig";

const CLINICAL_ROLES = [
  { value: "CLINIC_DOCTOR", label: "🩺 School Clinic Doctor", department: "School Clinic (Medical)", designation: "Resident School Clinic Doctor" },
  { value: "CLINIC_NURSE", label: "💉 School Clinic Nurse", department: "School Clinic (Medical)", designation: "Senior School Clinic Nurse" }
];

function format12Hour(hhmm = "07:30") {
  const m = String(hhmm || "").trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return hhmm || "07:30 AM";
  const h = parseInt(m[1], 10);
  const min = m[2];
  const suffix = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${String(h12).padStart(2, "0")}:${min} ${suffix}`;
}

export default function StaffAttendanceClockWidget({
  roleOverride = "",
  isClinicDesk = false,
  autoShowWelcomePrompt = true,
  currentUser = null,
  onNotice = null,
  onFeedback = null
}) {
  const storedUser = (() => {
    if (currentUser && typeof currentUser === "object") return currentUser;
    try {
      return JSON.parse(localStorage.getItem("gbs_user") || "{}");
    } catch {
      return {};
    }
  })();

  const defaultName =
    storedUser.fullName ||
    `${storedUser.firstName || ""} ${storedUser.lastName || ""}`.trim() ||
    storedUser.name ||
    storedUser.email ||
    "Institutional Staff";
  const defaultRole = String(roleOverride || storedUser.role || "STAFF").toUpperCase();
  const isAdminSupervisor = ["ADMIN", "SUPER_ADMIN", "HEADMASTER", "PRINCIPAL"].includes(defaultRole);

  const [statusData, setStatusData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [shiftNote, setShiftNote] = useState("");
  const [clockOutReason, setClockOutReason] = useState("");
  const [clinicStaffName, setClinicStaffName] = useState(defaultName);
  const [clinicStaffEmail, setClinicStaffEmail] = useState(storedUser.email || "");
  const [clinicStaffRole, setClinicStaffRole] = useState("CLINIC_DOCTOR");
  const [feedback, setFeedback] = useState(null);
  const [welcomeDismissed, setWelcomeDismissed] = useState(false);

  // Live Clock (Day, Date, Exact Time)
  const [liveNow, setLiveNow] = useState(() => new Date());

  // Workplace Location & Real GPS Capture State
  const [workplaceLocation, setWorkplaceLocation] = useState("");
  const [gpsCoords, setGpsCoords] = useState(null); // { latitude, longitude, accuracyMeters }
  const [gpsStatus, setGpsStatus] = useState("idle"); // idle | locating | locked | denied | unavailable
  const [gpsNotice, setGpsNotice] = useState("");

  // Live Camera Workplace Photo Proof State
  const [cameraOpen, setCameraOpen] = useState(false);
  const [cameraFacing, setCameraFacing] = useState("user"); // "user" | "environment"
  const [cameraError, setCameraError] = useState("");
  const [capturedPhotoDataUrl, setCapturedPhotoDataUrl] = useState("");
  const [photoCapturedAt, setPhotoCapturedAt] = useState(null);
  const [showDeskProofCapture, setShowDeskProofCapture] = useState(false);

  const videoRef = useRef(null);
  const cameraStreamRef = useRef(null);
  const fileFallbackInputRef = useRef(null);

  useEffect(() => {
    const id = setInterval(() => setLiveNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const notify = (text, isError = false) => {
    setFeedback({ text, isError });
    if (typeof onNotice === "function") onNotice({ type: isError ? "error" : "success", message: text });
    if (typeof onFeedback === "function") onFeedback(text, isError);
    if (typeof window !== "undefined" && typeof window.showGBSOpenNotice === "function") {
      window.showGBSOpenNotice(text, isError ? "error" : "success", "STAFF ATTENDANCE CLOCK DESK");
    }
  };

  const stopCameraStream = useCallback(() => {
    if (cameraStreamRef.current) {
      cameraStreamRef.current.getTracks().forEach((t) => {
        try { t.stop(); } catch { }
      });
      cameraStreamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraOpen(false);
  }, []);

  useEffect(() => {
    return () => stopCameraStream();
  }, [stopCameraStream]);

  const fetchMyAttendanceStatus = useCallback(async () => {
    try {
      const params = isClinicDesk
        ? {
            isClinicStaff: "true",
            staffName: clinicStaffName,
            staffEmail: clinicStaffEmail,
            staffRole: clinicStaffRole
          }
        : {};
      const res = await apiClient.get("/staff-attendance/my-status", { params });
      if (res?.data?.data) {
        setStatusData(res.data.data);
        if (!workplaceLocation && res.data.data?.settings?.workplaceLocationName) {
          setWorkplaceLocation(res.data.data.settings.workplaceLocationName);
        }
      }
    } catch { }
  }, [isClinicDesk, clinicStaffName, clinicStaffEmail, clinicStaffRole]);

  useEffect(() => {
    fetchMyAttendanceStatus();
    const onAttendanceSync = () => fetchMyAttendanceStatus();
    window.addEventListener("gbs_staff_attendance_updated", onAttendanceSync);
    window.addEventListener("gbs_staff_policy_updated", onAttendanceSync);

    let sock = null;
    try {
      const serverUrl = getServerBaseUrl();
      if (serverUrl) {
        const tid = parseInt(storedUser?.tenantId || localStorage.getItem("gbs_tenant_id") || "1", 10) || 1;
        sock = io(serverUrl, { transports: ["websocket", "polling"], withCredentials: true, reconnectionAttempts: 4 });
        sock.on("connect", () => {
          sock.emit("join_tenant", { tenantId: tid, userId: storedUser?.id || storedUser?.email });
        });
        sock.on("staff_attendance_policy_updated", () => fetchMyAttendanceStatus());
        sock.on("staff_clock_in_verified", () => fetchMyAttendanceStatus());
      }
    } catch { }

    return () => {
      window.removeEventListener("gbs_staff_attendance_updated", onAttendanceSync);
      window.removeEventListener("gbs_staff_policy_updated", onAttendanceSync);
      if (sock) {
        try { sock.disconnect(); } catch { }
      }
    };
  }, [fetchMyAttendanceStatus]);

  // Capture REAL browser GPS location (never fabricated!) + optional reverse-geocode locality
  const detectWorkplaceGps = useCallback(() => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setGpsStatus("unavailable");
      setGpsNotice("Browser GPS unavailable — type your exact campus/workplace location below.");
      return;
    }
    setGpsStatus("locating");
    setGpsNotice("Detecting your live workplace GPS coordinates...");
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = Number(pos.coords.latitude.toFixed(6));
        const lng = Number(pos.coords.longitude.toFixed(6));
        const acc = Math.round(pos.coords.accuracy || 0);
        setGpsCoords({ latitude: lat, longitude: lng, accuracyMeters: acc });
        setGpsStatus("locked");
        setGpsNotice(`GPS Locked: ${lat}, ${lng} (±${acc}m)`);

        // Optional non-blocking reverse geocode for clear human-readable place name
        try {
          const r = await fetch(
            `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${encodeURIComponent(lat)}&longitude=${encodeURIComponent(lng)}&localityLanguage=en`,
            { signal: AbortSignal.timeout ? AbortSignal.timeout(4500) : undefined }
          );
          if (r.ok) {
            const geo = await r.json();
            const parts = [geo.locality || geo.city, geo.principalSubdivision, geo.countryName].filter(Boolean);
            const campusPrefix = statusData?.settings?.workplaceLocationName;
            if (parts.length > 0) {
              const resolvedPlace = campusPrefix ? `${campusPrefix} — ${parts.join(", ")}` : parts.join(", ");
              setWorkplaceLocation((prev) => (!prev || prev === campusPrefix ? resolvedPlace : prev));
            }
          }
        } catch { }
      },
      (err) => {
        if (err.code === 1) {
          setGpsStatus("denied");
          setGpsNotice("GPS permission denied. Enable browser location or enter your exact campus location below.");
        } else {
          setGpsStatus("unavailable");
          setGpsNotice("GPS signal unavailable right now. Enter your exact campus/workplace location below.");
        }
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 15000 }
    );
  }, [statusData?.settings?.workplaceLocationName]);

  const startLiveProofCamera = useCallback(async (facing = cameraFacing) => {
    setCameraError("");
    stopCameraStream();
    if (!navigator.mediaDevices || typeof navigator.mediaDevices.getUserMedia !== "function") {
      setCameraError("Browser camera API unavailable here. Use 'Upload / Take Device Photo' below.");
      return;
    }
    try {
      let stream = null;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: facing }, width: { ideal: 640 }, height: { ideal: 480 } },
          audio: false
        });
      } catch {
        stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      }
      cameraStreamRef.current = stream;
      setCameraOpen(true);
      requestAnimationFrame(() => {
        if (videoRef.current && cameraStreamRef.current) {
          videoRef.current.srcObject = cameraStreamRef.current;
          videoRef.current.muted = true;
          videoRef.current.playsInline = true;
          videoRef.current.play().catch(() => { });
        }
      });
    } catch (err) {
      setCameraError("Camera permission denied or camera busy. Allow camera access or use 'Take / Upload Device Photo'.");
    }
  }, [cameraFacing, stopCameraStream]);

  const stampAndSavePhoto = useCallback((sourceImgOrVideo, srcWidth, srcHeight) => {
    const canvas = document.createElement("canvas");
    const targetW = 640;
    const ratio = srcWidth && srcHeight ? srcHeight / srcWidth : 0.75;
    const targetH = Math.max(360, Math.min(540, Math.round(targetW * ratio)));
    canvas.width = targetW;
    canvas.height = targetH;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(sourceImgOrVideo, 0, 0, targetW, targetH);

    // Embed unforgeable workplace evidence stamp bar at bottom of photo
    const stampNow = new Date();
    const dayStr = stampNow.toLocaleDateString("en-GB", { weekday: "long", day: "2-digit", month: "short", year: "numeric" });
    const timeStr = stampNow.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
    const locSummary = workplaceLocation.trim() || statusData?.settings?.workplaceLocationName || "School Workplace";
    const gpsSummary = gpsCoords ? `GPS: ${gpsCoords.latitude}, ${gpsCoords.longitude} (±${gpsCoords.accuracyMeters}m)` : "GPS: Location Declared";

    ctx.fillStyle = "rgba(5, 15, 35, 0.84)";
    ctx.fillRect(0, targetH - 66, targetW, 66);
    ctx.fillStyle = "#f6dd84";
    ctx.font = "bold 14px sans-serif";
    ctx.fillText(`GBS WORKPLACE CLOCK-IN PROOF • ${defaultName} (${defaultRole})`, 12, targetH - 44);
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 13px sans-serif";
    ctx.fillText(`${dayStr} • ${timeStr}`, 12, targetH - 25);
    ctx.fillStyle = "#6ee7b7";
    ctx.font = "12px monospace";
    ctx.fillText(`${locSummary.slice(0, 48)} | ${gpsSummary}`, 12, targetH - 8);

    const dataUrl = canvas.toDataURL("image/jpeg", 0.78);
    setCapturedPhotoDataUrl(dataUrl);
    setPhotoCapturedAt(stampNow.toISOString());
    stopCameraStream();
  }, [workplaceLocation, statusData?.settings?.workplaceLocationName, gpsCoords, defaultName, defaultRole, stopCameraStream]);

  const handleCaptureCameraFrame = () => {
    const v = videoRef.current;
    if (!v || v.videoWidth === 0) {
      setCameraError("Waiting for camera video frame — click again in a moment.");
      return;
    }
    stampAndSavePhoto(v, v.videoWidth, v.videoHeight);
  };

  const handleFallbackPhotoFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        stampAndSavePhoto(img, img.naturalWidth || 640, img.naturalHeight || 480);
      };
      img.src = String(reader.result || "");
    };
    reader.readAsDataURL(file);
  };

  const isClockedIn = statusData?.currentStatus === "CLOCKED_IN";
  const isBypassed = !isClockedIn && (statusData?.currentStatus === "BYPASSED_UNMARKED" || statusData?.bypassedToday);
  const isAutoClockedOut = statusData?.currentStatus === "AUTO_CLOCKED_OUT";
  const activeShift = statusData?.activeShift;
  const latestLog = activeShift || statusData?.latestToday || statusData?.recentLogs?.[0] || null;
  const institutionName = statusData?.institutionName || storedUser.institutionName || "GBS Registered Institution";
  const reportingTimeRaw = statusData?.settings?.reportingTime || "07:30";
  const closingTimeRaw = statusData?.settings?.closingTime || "16:00";
  const reportingTimeDisplay = statusData?.settings?.reportingTimeLabel || format12Hour(reportingTimeRaw);
  const closingTimeDisplay = statusData?.settings?.closingTimeLabel || format12Hour(closingTimeRaw);
  const requirePhotoProof = statusData?.settings?.requirePhotoProof !== false;

  const showWelcomeModal =
    Boolean(autoShowWelcomePrompt) &&
    !isAdminSupervisor &&
    !isClinicDesk &&
    !welcomeDismissed &&
    Boolean(statusData?.needsWelcomePrompt);

  // Auto-detect GPS when welcome modal or desk capture opens
  useEffect(() => {
    if ((showWelcomeModal || showDeskProofCapture) && gpsStatus === "idle") {
      detectWorkplaceGps();
    }
  }, [showWelcomeModal, showDeskProofCapture, gpsStatus, detectWorkplaceGps]);

  const handleClockIn = async () => {
    const cleanLoc = workplaceLocation.trim();
    if (!cleanLoc && !gpsCoords) {
      notify("Please add your workplace location or click 'Detect Live GPS' before clocking in.", true);
      setShowDeskProofCapture(true);
      return;
    }
    if (requirePhotoProof && !isAdminSupervisor && !capturedPhotoDataUrl) {
      notify("📸 Workplace picture proof is required! Please open the camera and take a photo at your workplace before clocking in.", true);
      setShowDeskProofCapture(true);
      return;
    }

    setLoading(true);
    try {
      const clinicMeta = CLINICAL_ROLES.find((r) => r.value === clinicStaffRole) || CLINICAL_ROLES[0];
      const proofPayload = {
        workplaceLocation: cleanLoc || (gpsCoords ? `GPS Verified (${gpsCoords.latitude}, ${gpsCoords.longitude})` : statusData?.settings?.workplaceLocationName || "Main School Campus"),
        latitude: gpsCoords?.latitude ?? null,
        longitude: gpsCoords?.longitude ?? null,
        accuracyMeters: gpsCoords?.accuracyMeters ?? null,
        clockInPhotoDataUrl: capturedPhotoDataUrl || null,
        photoCapturedAt: photoCapturedAt || null
      };

      const payload = isClinicDesk
        ? {
            ...proofPayload,
            isClinicStaff: true,
            staffName: clinicStaffName.trim() || defaultName,
            staffEmail: clinicStaffEmail.trim() || storedUser.email || "",
            staffRole: clinicMeta.value,
            department: clinicMeta.department,
            designation: clinicMeta.designation,
            notes: shiftNote.trim() || "Reported to school clinic and submitted workplace proof."
          }
        : {
            ...proofPayload,
            staffRole: defaultRole,
            notes: shiftNote.trim() || "Reported to workplace and submitted live location + photo proof for Headmaster verification."
          };

      const res = await apiClient.post("/staff-attendance/clock-in", payload);
      const entry = res?.data?.data?.record || res?.data?.data;
      if (entry && entry.status === "CLOCKED_IN") {
        setStatusData((prev) => ({
          ...(prev || {}),
          currentStatus: "CLOCKED_IN",
          bypassedToday: false,
          markedPresentToday: true,
          needsWelcomePrompt: false,
          activeShift: entry,
          latestToday: entry
        }));
      }
      notify(res?.data?.message || "✅ Clocked in! Location, date, day, time & workplace photo proof sent to Headmaster for verification.");
      setShiftNote("");
      setCapturedPhotoDataUrl("");
      setShowDeskProofCapture(false);
      stopCameraStream();
      setWelcomeDismissed(true);
      await fetchMyAttendanceStatus();
      window.dispatchEvent(new Event("gbs_staff_attendance_updated"));
    } catch (err) {
      notify(err?.response?.data?.message || err.message || "Could not clock in right now.", true);
    } finally {
      setLoading(false);
    }
  };

  const handleBypassWithoutClockIn = async () => {
    stopCameraStream();
    setLoading(true);
    try {
      const res = await apiClient.post("/staff-attendance/bypass", {
        staffRole: defaultRole,
        notes: "Bypassed welcome clock-in prompt — NOT marked present at work."
      });
      notify(
        res?.data?.message ||
          "Bypassed clock-in prompt. Note: You are NOT marked present at work or on duty until you clock in with workplace proof.",
        false
      );
      setWelcomeDismissed(true);
      await fetchMyAttendanceStatus();
      window.dispatchEvent(new Event("gbs_staff_attendance_updated"));
    } catch (err) {
      notify(err?.response?.data?.message || "Could not bypass clock-in prompt right now.", true);
    } finally {
      setLoading(false);
    }
  };

  const handleClockOut = async () => {
    const isBeforeClose = Boolean(statusData?.isBeforeClosingTime);
    const trimmedReason = clockOutReason.trim();
    if (isBeforeClose && statusData?.settings?.enforceClockOutReasonBeforeClose !== false && trimmedReason.length < 4) {
      notify(
        `Official closing time is ${closingTimeDisplay}. Please enter your Clock-Out Reason before clocking out early.`,
        true
      );
      return;
    }

    setLoading(true);
    try {
      const clinicMeta = CLINICAL_ROLES.find((r) => r.value === clinicStaffRole) || CLINICAL_ROLES[0];
      const payload = isClinicDesk
        ? {
            isClinicStaff: true,
            staffName: clinicStaffName.trim() || defaultName,
            staffEmail: clinicStaffEmail.trim() || storedUser.email || "",
            staffRole: clinicMeta.value,
            shiftId: statusData?.activeShift?.id || null,
            reason: trimmedReason || "End of scheduled school/clinic closing time.",
            notes: shiftNote.trim() || trimmedReason || "Clinic shift closed and clocked out cleanly."
          }
        : {
            shiftId: statusData?.activeShift?.id || null,
            staffRole: defaultRole,
            reason: trimmedReason || "End of school/work closing time.",
            notes: shiftNote.trim() || trimmedReason || "Closing duty clocked out cleanly."
          };

      const res = await apiClient.post("/staff-attendance/clock-out", payload);
      notify(res?.data?.message || "✅ Clocked out cleanly at close of work.");
      setShiftNote("");
      setClockOutReason("");
      await fetchMyAttendanceStatus();
      window.dispatchEvent(new Event("gbs_staff_attendance_updated"));
    } catch (err) {
      notify(err?.response?.data?.message || err.message || "Could not clock out right now.", true);
    } finally {
      setLoading(false);
    }
  };

  const liveDayStr = liveNow.toLocaleDateString("en-GB", { weekday: "long" });
  const liveDateStr = liveNow.toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" });
  const liveTimeStr = liveNow.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });

  // Reusable Location + Live Photo Proof Capture Block (rendered in Welcome Modal & Desk)
  const renderProofCaptureBlock = (inModal = false) => (
    <div
      data-testid={inModal ? "welcome-workplace-proof-box" : "desk-workplace-proof-box"}
      style={{
        background: "rgba(2, 6, 23, 0.78)",
        border: "1.5px solid rgba(56, 189, 248, 0.45)",
        borderRadius: "12px",
        padding: "12px",
        marginBottom: "12px"
      }}
    >
      {/* Live Day, Date, Time & Schedule Strip */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "8px", marginBottom: "10px", fontSize: "0.76rem" }}>
        <div style={{ background: "rgba(15, 23, 42, 0.9)", padding: "7px 10px", borderRadius: "8px", border: "1px solid rgba(212,175,55,0.3)" }}>
          <div style={{ color: "#94a3b8", fontSize: "0.66rem", fontWeight: 800 }}>DAY &amp; DATE</div>
          <strong style={{ color: "#f8fafc" }}>{liveDayStr}, {liveDateStr}</strong>
        </div>
        <div style={{ background: "rgba(15, 23, 42, 0.9)", padding: "7px 10px", borderRadius: "8px", border: "1px solid rgba(56,189,248,0.35)" }}>
          <div style={{ color: "#94a3b8", fontSize: "0.66rem", fontWeight: 800 }}>CURRENT CLOCK-IN TIME</div>
          <strong style={{ color: "#38bdf8", fontFamily: "monospace", fontSize: "0.86rem" }}>{liveTimeStr}</strong>
        </div>
        <div style={{ background: "rgba(15, 23, 42, 0.9)", padding: "7px 10px", borderRadius: "8px", border: "1px solid rgba(16,185,129,0.4)" }}>
          <div style={{ color: "#94a3b8", fontSize: "0.66rem", fontWeight: 800 }}>OFFICIAL REPORTING / CLOSING</div>
          <strong style={{ color: "#6ee7b7" }}>{reportingTimeDisplay} → {closingTimeDisplay}</strong>
        </div>
      </div>

      {/* Step 1: Exact Workplace Location & Real GPS */}
      <div style={{ marginBottom: "10px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "6px", marginBottom: "5px" }}>
          <label style={{ fontSize: "0.76rem", color: "#f6dd84", fontWeight: 800 }}>
            📍 1. Exact Workplace Location (Sent to Headmaster)
          </label>
          <button
            type="button"
            data-testid="clockin-detect-gps-btn"
            onClick={detectWorkplaceGps}
            style={{
              background: "rgba(56, 189, 248, 0.18)",
              color: "#7dd3fc",
              border: "1px solid #38bdf8",
              borderRadius: "7px",
              padding: "4px 10px",
              fontSize: "0.72rem",
              fontWeight: 800,
              cursor: "pointer"
            }}
          >
            {gpsStatus === "locating" ? "⏳ Detecting GPS..." : "🛰️ Detect Live Workplace GPS"}
          </button>
        </div>
        <input
          type="text"
          data-testid="clockin-location-input"
          value={workplaceLocation}
          onChange={(e) => setWorkplaceLocation(e.target.value)}
          placeholder="e.g. Main School Campus — Block A / Staff Room / School Gate"
          style={{
            width: "100%",
            boxSizing: "border-box",
            padding: "8px 10px",
            borderRadius: "8px",
            border: "1px solid rgba(212,175,55,0.5)",
            background: "#081833",
            color: "#ffffff",
            fontSize: "0.82rem"
          }}
        />
        {gpsNotice && (
          <div style={{ marginTop: "4px", fontSize: "0.72rem", fontWeight: 700, color: gpsStatus === "locked" ? "#6ee7b7" : "#fbbf24" }}>
            {gpsStatus === "locked" ? "✅" : "ℹ️"} {gpsNotice}
          </div>
        )}
      </div>

      {/* Step 2: Live Camera Workplace Picture Proof */}
      <div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "6px", marginBottom: "6px" }}>
          <span style={{ fontSize: "0.76rem", color: "#f6dd84", fontWeight: 800 }}>
            📸 2. Live Workplace Picture Proof {requirePhotoProof && !isAdminSupervisor ? "(REQUIRED FOR HEADMASTER VERIFICATION)" : "(Recommended)"}
          </span>
          <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
            {!cameraOpen && (
              <button
                type="button"
                data-testid="clockin-open-camera-btn"
                onClick={() => startLiveProofCamera(cameraFacing)}
                style={{
                  background: "linear-gradient(135deg, #0284c7, #2563eb)",
                  color: "#ffffff",
                  border: "1px solid #7dd3fc",
                  borderRadius: "7px",
                  padding: "5px 11px",
                  fontSize: "0.73rem",
                  fontWeight: 800,
                  cursor: "pointer"
                }}
              >
                📷 {capturedPhotoDataUrl ? "Retake Live Photo" : "Open System Camera"}
              </button>
            )}
            <button
              type="button"
              onClick={() => fileFallbackInputRef.current?.click()}
              style={{
                background: "rgba(212, 175, 55, 0.16)",
                color: "#f6dd84",
                border: "1px solid #d4af37",
                borderRadius: "7px",
                padding: "5px 10px",
                fontSize: "0.72rem",
                fontWeight: 800,
                cursor: "pointer"
              }}
            >
              📱 Device Camera / Photo
            </button>
            <input
              ref={fileFallbackInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleFallbackPhotoFile}
              style={{ display: "none" }}
            />
          </div>
        </div>

        {cameraError && (
          <div style={{ fontSize: "0.73rem", color: "#fca5a5", marginBottom: "6px", fontWeight: 700 }}>
            ⚠️ {cameraError}
          </div>
        )}

        {cameraOpen && (
          <div style={{ background: "#000", borderRadius: "10px", padding: "8px", border: "1.5px solid #38bdf8", marginBottom: "8px" }}>
            <video
              ref={videoRef}
              data-testid="clockin-camera-video"
              autoPlay
              muted
              playsInline
              style={{ width: "100%", maxHeight: "220px", objectFit: "cover", borderRadius: "8px", display: "block" }}
            />
            <div style={{ display: "flex", gap: "8px", marginTop: "8px", flexWrap: "wrap" }}>
              <button
                type="button"
                data-testid="clockin-capture-photo-btn"
                onClick={handleCaptureCameraFrame}
                style={{
                  flex: 1,
                  background: "linear-gradient(135deg, #059669, #10b981)",
                  color: "#ffffff",
                  border: "1px solid #6ee7b7",
                  borderRadius: "8px",
                  padding: "8px 14px",
                  fontWeight: 900,
                  fontSize: "0.82rem",
                  cursor: "pointer"
                }}
              >
                📸 Capture Workplace Proof Photo
              </button>
              <button
                type="button"
                onClick={() => {
                  const next = cameraFacing === "user" ? "environment" : "user";
                  setCameraFacing(next);
                  startLiveProofCamera(next);
                }}
                style={{
                  background: "#1e293b",
                  color: "#e2e8f0",
                  border: "1px solid #475569",
                  borderRadius: "8px",
                  padding: "8px 12px",
                  fontWeight: 800,
                  fontSize: "0.76rem",
                  cursor: "pointer"
                }}
              >
                🔄 Flip Camera
              </button>
              <button
                type="button"
                onClick={stopCameraStream}
                style={{
                  background: "rgba(239, 68, 68, 0.2)",
                  color: "#fca5a5",
                  border: "1px solid #ef4444",
                  borderRadius: "8px",
                  padding: "8px 12px",
                  fontWeight: 800,
                  fontSize: "0.76rem",
                  cursor: "pointer"
                }}
              >
                Close
              </button>
            </div>
          </div>
        )}

        {capturedPhotoDataUrl && (
          <div data-testid="clockin-photo-preview" style={{ display: "flex", alignItems: "center", gap: "12px", background: "rgba(16, 185, 129, 0.14)", border: "1px solid #10b981", borderRadius: "10px", padding: "8px" }}>
            <img
              src={capturedPhotoDataUrl}
              alt="Workplace clock-in photo proof"
              style={{ width: "120px", height: "84px", objectFit: "cover", borderRadius: "7px", border: "1px solid #6ee7b7" }}
            />
            <div style={{ flex: 1, fontSize: "0.75rem", color: "#d1fae5" }}>
              <strong style={{ color: "#6ee7b7", display: "block" }}>✅ Workplace Photo Proof Captured &amp; Stamped</strong>
              <div>Includes live Date, Day, Time &amp; Workplace Location stamp — ready to send to Headmaster for verification.</div>
              <button
                type="button"
                onClick={() => {
                  setCapturedPhotoDataUrl("");
                  setPhotoCapturedAt(null);
                  startLiveProofCamera(cameraFacing);
                }}
                style={{ marginTop: "5px", background: "rgba(2, 132, 199, 0.25)", color: "#7dd3fc", border: "1px solid #38bdf8", borderRadius: "6px", padding: "3px 9px", fontSize: "0.7rem", fontWeight: 800, cursor: "pointer" }}
              >
                🔁 Retake Picture
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  const welcomeModalEl = showWelcomeModal ? (
    <div
      data-testid="staff-welcome-clockin-modal"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 99990,
        background: "rgba(4, 10, 24, 0.88)",
        backdropFilter: "blur(8px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "16px",
        overflowY: "auto"
      }}
    >
      <div
        style={{
          maxWidth: "650px",
          width: "100%",
          maxHeight: "94vh",
          overflowY: "auto",
          background: "linear-gradient(145deg, #081833 0%, #0d2247 100%)",
          border: "2px solid #d4af37",
          borderRadius: "20px",
          padding: "22px",
          color: "#f8fafc",
          boxShadow: "0 24px 60px rgba(0, 0, 0, 0.65)"
        }}
      >
        <div style={{ fontSize: "0.74rem", fontWeight: 900, color: "#f6dd84", letterSpacing: "1px", textTransform: "uppercase", marginBottom: "5px" }}>
          🏫 STAFF REPORTING &amp; WORKPLACE EVIDENCE CLOCK-IN
        </div>
        <h2 style={{ margin: "0 0 6px", fontSize: "1.35rem", color: "#ffffff", fontWeight: 900 }}>
          WELCOME TO WORK — {institutionName.toUpperCase()}
        </h2>
        <p style={{ margin: "0 0 12px", fontSize: "0.84rem", color: "#cbd5e1", lineHeight: 1.5 }}>
          Hello <strong style={{ color: "#f6dd84" }}>{defaultName}</strong> ({defaultRole}). Official reporting time set by the Headmaster is{" "}
          <strong style={{ color: "#6ee7b7" }}>{reportingTimeDisplay}</strong> and closing time is{" "}
          <strong style={{ color: "#f6dd84" }}>{closingTimeDisplay}</strong>. Please confirm your exact workplace location and take a live picture on the system as proof of presence — all details are sent immediately to the Headmaster for verification.
        </p>

        {renderProofCaptureBlock(true)}

        <div style={{ marginBottom: "12px" }}>
          <label style={{ display: "block", fontSize: "0.76rem", color: "#f6dd84", fontWeight: 700, marginBottom: "4px" }}>
            Duty Start Note / Classroom / Department (Optional)
          </label>
          <input
            type="text"
            placeholder="e.g. Reported to campus — JHS 2 Mathematics morning lesson"
            value={shiftNote}
            onChange={(e) => setShiftNote(e.target.value)}
            style={{
              width: "100%",
              boxSizing: "border-box",
              padding: "9px 12px",
              borderRadius: "9px",
              border: "1px solid rgba(212,175,55,0.5)",
              background: "#050f23",
              color: "#ffffff",
              fontSize: "0.84rem"
            }}
          />
        </div>

        <div style={{
          background: "rgba(239, 68, 68, 0.14)",
          border: "1px solid rgba(248, 113, 113, 0.45)",
          borderRadius: "10px",
          padding: "9px 12px",
          fontSize: "0.76rem",
          color: "#fecaca",
          marginBottom: "14px"
        }}>
          <strong>⚠️ Notice on Bypass:</strong> Choosing <em>Bypass Without Clocking In</em> lets you access your dashboard, but <strong>you will NOT be marked present at work</strong> on the Headmaster&apos;s attendance register.
        </div>

        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
          <button
            type="button"
            disabled={loading}
            data-testid="welcome-clockin-confirm-btn"
            onClick={handleClockIn}
            style={{
              flex: 1,
              minWidth: "220px",
              padding: "12px 16px",
              borderRadius: "10px",
              border: "1.5px solid #f6dd84",
              background: "linear-gradient(135deg, #065f46 0%, #10b981 100%)",
              color: "#ffffff",
              fontWeight: 900,
              fontSize: "0.88rem",
              cursor: loading ? "wait" : "pointer"
            }}
          >
            ⏰ Submit Proof &amp; Clock In (Send to Headmaster)
          </button>
          <button
            type="button"
            disabled={loading}
            data-testid="welcome-bypass-btn"
            onClick={handleBypassWithoutClockIn}
            style={{
              padding: "12px 16px",
              borderRadius: "10px",
              border: "1px solid rgba(248, 113, 113, 0.5)",
              background: "rgba(120, 29, 43, 0.45)",
              color: "#fecaca",
              fontWeight: 800,
              fontSize: "0.82rem",
              cursor: loading ? "wait" : "pointer"
            }}
          >
            ⏭️ Bypass (Not Marked Present)
          </button>
        </div>
      </div>
    </div>
  ) : null;

  const verificationStatus = latestLog?.verificationStatus || (isClockedIn ? "PENDING_VERIFICATION" : null);

  return (
    <>
      {welcomeModalEl && (typeof document !== "undefined" && document.body ? createPortal(welcomeModalEl, document.body) : welcomeModalEl)}

      <div
        data-testid={isClinicDesk ? "clinic-staff-clock-widget" : "staff-attendance-clock-widget"}
        style={{
          background: "linear-gradient(135deg, rgba(8, 24, 51, 0.96) 0%, rgba(13, 34, 71, 0.96) 100%)",
          border: "1.5px solid #d4af37",
          borderRadius: "14px",
          padding: "16px 18px",
          marginBottom: "18px",
          color: "#f8fafc"
        }}
      >
        {/* Prominent Official Reporting Time & Closing Time Punctuality Bar */}
        <div
          data-testid="staff-official-schedule-bar"
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "10px",
            background: "rgba(5, 15, 35, 0.85)",
            border: "1px solid rgba(212, 175, 55, 0.45)",
            borderRadius: "10px",
            padding: "9px 12px",
            marginBottom: "12px",
            fontSize: "0.78rem"
          }}
        >
          <div style={{ display: "flex", gap: "14px", flexWrap: "wrap", alignItems: "center" }}>
            <span>
              ⏰ <strong style={{ color: "#94a3b8" }}>Official Reporting Time:</strong>{" "}
              <strong data-testid="staff-reporting-time-display" style={{ color: "#6ee7b7", fontSize: "0.88rem" }}>
                {reportingTimeDisplay}
              </strong>
            </span>
            <span>
              🏁 <strong style={{ color: "#94a3b8" }}>Official Closing Time:</strong>{" "}
              <strong data-testid="staff-closing-time-display" style={{ color: "#f6dd84", fontSize: "0.88rem" }}>
                {closingTimeDisplay}
              </strong>
            </span>
            <span>
              📅 <strong style={{ color: "#e2e8f0" }}>{liveDayStr}, {liveDateStr}</strong> •{" "}
              <strong style={{ color: "#38bdf8", fontFamily: "monospace" }}>{liveTimeStr}</strong>
            </span>
          </div>
          <span style={{ fontSize: "0.72rem", color: "#fde68a", fontWeight: 700 }}>
            ⭐ Be punctual &amp; regular for excellence in institutional service
          </span>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px", marginBottom: "12px" }}>
          <div>
            <span style={{ fontSize: "0.72rem", fontWeight: 800, color: "#f6dd84", letterSpacing: "0.8px", textTransform: "uppercase" }}>
              {isClinicDesk
                ? "🩺 SCHOOL CLINIC DOCTOR & NURSE SHIFT ATTENDANCE"
                : `🏫 ${institutionName.toUpperCase()} • STAFF CLOCK-IN & WORKPLACE PROOF DESK`}
            </span>
            <h4 style={{ margin: "4px 0 0", fontSize: "1.02rem", color: "#ffffff" }}>
              {isClinicDesk ? "Clinic Doctor & Nurse Clock-In / Clock-Out Desk" : `${defaultName} (${defaultRole})`}
            </h4>
            <div style={{ fontSize: "0.72rem", color: "#cbd5e1", marginTop: "2px" }}>
              Term: <strong>{statusData?.settings?.activeTerm || "Current Term"}</strong> • Auto Clock-Out: <strong>+2 Hours After Close</strong> • Live Photo + Location Verified by Headmaster
            </div>
          </div>

          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "center" }}>
            <div
              style={{
                padding: "5px 12px",
                borderRadius: "999px",
                fontSize: "0.76rem",
                fontWeight: 800,
                background: isClockedIn
                  ? "rgba(16, 185, 129, 0.22)"
                  : isBypassed
                    ? "rgba(239, 68, 68, 0.2)"
                    : "rgba(212, 175, 55, 0.16)",
                border: `1.5px solid ${isClockedIn ? "#10b981" : isBypassed ? "#f87171" : "#d4af37"}`,
                color: isClockedIn ? "#6ee7b7" : isBypassed ? "#fecaca" : "#f6dd84"
              }}
            >
              {isClockedIn && activeShift
                ? `🟢 ON DUTY (PRESENT) • In at ${activeShift.clockInTimeLabel || new Date(activeShift.clockInAt).toLocaleTimeString()}`
                : isBypassed
                  ? "⚠️ Bypassed Clock-In — NOT Marked Present"
                  : isAutoClockedOut
                    ? "⏱️ Auto Clocked Out (+2h After Close)"
                    : statusData?.currentStatus === "CLOCKED_OUT"
                      ? "🔵 Shift Closed (Clocked Out Today)"
                      : "⚪ Not Clocked In Yet"}
            </div>

            {verificationStatus && !isBypassed && (
              <div
                data-testid="staff-headmaster-verification-badge"
                style={{
                  padding: "5px 11px",
                  borderRadius: "999px",
                  fontSize: "0.72rem",
                  fontWeight: 800,
                  background: verificationStatus === "VERIFIED"
                    ? "rgba(16, 185, 129, 0.22)"
                    : verificationStatus === "QUERIED" || verificationStatus === "REJECTED"
                      ? "rgba(239, 68, 68, 0.22)"
                      : "rgba(56, 189, 248, 0.18)",
                  border: `1px solid ${
                    verificationStatus === "VERIFIED" ? "#10b981" : verificationStatus === "QUERIED" || verificationStatus === "REJECTED" ? "#ef4444" : "#38bdf8"
                  }`,
                  color: verificationStatus === "VERIFIED" ? "#6ee7b7" : verificationStatus === "QUERIED" || verificationStatus === "REJECTED" ? "#fca5a5" : "#7dd3fc"
                }}
              >
                {verificationStatus === "VERIFIED"
                  ? `✅ Verified by Headmaster${latestLog?.verifiedBy ? ` (${latestLog.verifiedBy})` : ""}`
                  : verificationStatus === "QUERIED"
                    ? "⚠️ Headmaster Queried Proof"
                    : verificationStatus === "REJECTED"
                      ? "❌ Proof Flagged by Headmaster"
                      : "⏳ Sent to Headmaster for Verification"}
              </div>
            )}
          </div>
        </div>

        {feedback && (
          <div
            style={{
              marginBottom: "10px",
              padding: "8px 12px",
              borderRadius: "8px",
              fontSize: "0.8rem",
              fontWeight: 700,
              background: feedback.isError ? "rgba(239, 68, 68, 0.18)" : "rgba(16, 185, 129, 0.18)",
              border: `1px solid ${feedback.isError ? "#ef4444" : "#10b981"}`,
              color: feedback.isError ? "#fecaca" : "#a7f3d0"
            }}
          >
            {feedback.text}
          </div>
        )}

        {/* Expandable Location + Camera Proof Capture when staff is not yet clocked in */}
        {!isClockedIn && (showDeskProofCapture || !isAdminSupervisor) && (
          <div style={{ marginBottom: "10px" }}>
            {!showDeskProofCapture ? (
              <button
                type="button"
                data-testid="open-clockin-proof-capture-btn"
                onClick={() => setShowDeskProofCapture(true)}
                style={{
                  width: "100%",
                  background: "rgba(2, 132, 199, 0.2)",
                  color: "#7dd3fc",
                  border: "1.5px dashed #38bdf8",
                  borderRadius: "10px",
                  padding: "10px 14px",
                  fontWeight: 800,
                  fontSize: "0.82rem",
                  cursor: "pointer"
                }}
              >
                📍📸 Step 1: Capture Workplace Location &amp; Live Camera Picture Proof to Clock In
              </button>
            ) : (
              renderProofCaptureBlock(false)
            )}
          </div>
        )}

        <div style={{ display: "grid", gridTemplateColumns: isClinicDesk ? "repeat(auto-fit, minmax(180px, 1fr))" : isClockedIn ? "1fr 1fr auto" : "1fr auto", gap: "10px", alignItems: "center" }}>
          {isClinicDesk && (
            <>
              <select
                value={clinicStaffRole}
                onChange={(e) => setClinicStaffRole(e.target.value)}
                style={{ background: "#050f23", color: "#f6dd84", border: "1px solid #d4af37", borderRadius: "8px", padding: "8px 10px", fontWeight: 700, fontSize: "0.82rem" }}
              >
                {CLINICAL_ROLES.map((r) => (
                  <option key={r.value} value={r.value}>{r.label}</option>
                ))}
              </select>
              <input
                type="text"
                placeholder="Doctor / Nurse Full Name"
                value={clinicStaffName}
                onChange={(e) => setClinicStaffName(e.target.value)}
                style={{ background: "#050f23", color: "#f8fafc", border: "1px solid rgba(212,175,55,0.45)", borderRadius: "8px", padding: "8px 10px", fontSize: "0.82rem" }}
              />
              <input
                type="email"
                placeholder="Medical Staff Email (optional)"
                value={clinicStaffEmail}
                onChange={(e) => setClinicStaffEmail(e.target.value)}
                style={{ background: "#050f23", color: "#f8fafc", border: "1px solid rgba(212,175,55,0.45)", borderRadius: "8px", padding: "8px 10px", fontSize: "0.82rem" }}
              />
            </>
          )}

          <input
            type="text"
            placeholder={isClockedIn ? "Departure summary note (optional)..." : "Duty notes / classroom assignment (optional)..."}
            value={shiftNote}
            onChange={(e) => setShiftNote(e.target.value)}
            style={{ background: "#050f23", color: "#f8fafc", border: "1px solid rgba(212,175,55,0.45)", borderRadius: "8px", padding: "8px 12px", fontSize: "0.82rem" }}
          />

          {isClockedIn && (
            <input
              type="text"
              data-testid="clockout-reason-input"
              placeholder={
                statusData?.isBeforeClosingTime
                  ? `Clock-Out Reason REQUIRED before ${closingTimeDisplay}...`
                  : "Reason for clocking out (or end of school closing)..."
              }
              value={clockOutReason}
              onChange={(e) => setClockOutReason(e.target.value)}
              style={{
                background: "#050f23",
                color: "#f8fafc",
                border: statusData?.isBeforeClosingTime ? "1.5px solid #f59e0b" : "1px solid rgba(212,175,55,0.45)",
                borderRadius: "8px",
                padding: "8px 12px",
                fontSize: "0.82rem"
              }}
            />
          )}

          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
            <button
              type="button"
              data-testid="desk-clockin-submit-btn"
              disabled={loading || isClockedIn}
              onClick={handleClockIn}
              style={{
                background: isClockedIn ? "rgba(100,116,139,0.28)" : "linear-gradient(135deg, #065f46 0%, #10b981 100%)",
                color: "#ffffff",
                border: "1px solid #d4af37",
                borderRadius: "8px",
                padding: "8px 14px",
                fontSize: "0.8rem",
                fontWeight: 800,
                cursor: loading || isClockedIn ? "not-allowed" : "pointer",
                opacity: isClockedIn ? 0.55 : 1
              }}
            >
              ⏰ Clock In &amp; Send Proof
            </button>

            <button
              type="button"
              disabled={loading || !isClockedIn}
              onClick={handleClockOut}
              style={{
                background: !isClockedIn ? "rgba(100,116,139,0.28)" : "linear-gradient(135deg, #781d2b 0%, #d4af37 100%)",
                color: "#ffffff",
                border: "1px solid #d4af37",
                borderRadius: "8px",
                padding: "8px 14px",
                fontSize: "0.8rem",
                fontWeight: 800,
                cursor: loading || !isClockedIn ? "not-allowed" : "pointer",
                opacity: !isClockedIn ? 0.55 : 1
              }}
            >
              🏁 Clock Out
            </button>
          </div>
        </div>

        {latestLog && (
          <div style={{ marginTop: "10px", fontSize: "0.75rem", color: "#cbd5e1", borderTop: "1px solid rgba(212,175,55,0.25)", paddingTop: "8px", display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap" }}>
            {latestLog.clockInPhotoDataUrl && (
              <img
                src={latestLog.clockInPhotoDataUrl}
                alt="Latest clock-in proof"
                style={{ width: "52px", height: "38px", objectFit: "cover", borderRadius: "6px", border: "1px solid #10b981" }}
              />
            )}
            <div>
              Latest Log: <strong style={{ color: "#f6dd84" }}>{latestLog.staffName}</strong> ({latestLog.designation}) •{" "}
              {latestLog.dayOfWeek ? `${latestLog.dayOfWeek}, ` : ""}{latestLog.shiftDate} •{" "}
              {latestLog.clockInAt
                ? `In: ${latestLog.clockInTimeLabel || new Date(latestLog.clockInAt).toLocaleTimeString()}`
                : "Bypassed (Not Marked Present)"}
              {latestLog.workplaceLocation && ` • 📍 ${latestLog.workplaceLocation}`}
              {latestLog.clockOutAt && ` • Out: ${new Date(latestLog.clockOutAt).toLocaleTimeString()} (${latestLog.hoursWorkedLabel})`}
              {latestLog.verificationNote && ` • Headmaster Note: ${latestLog.verificationNote}`}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
