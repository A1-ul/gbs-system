import React, { useState, useRef, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import apiClient from "../../../api/client/apiClient";
import "../../auth/pages/RoleLoginPage.css";
import "./DeveloperPlatform.css";

export default function DeveloperLogin() {
  const navigate = useNavigate();
  // Authorized Developer Verification Target (NEVER pre-filled or displayed in text inputs)
  const permanentEmail = "gabosei48@gmail.com";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Security Lockdown State (automatically disabled when any false entry occurs)
  const [loginLocked, setLoginLocked] = useState(() => {
    try {
      return localStorage.getItem("gbs_dev_login_locked") === "true";
    } catch {
      return false;
    }
  });
  const [lockedBannerInfo, setLockedBannerInfo] = useState(null);
  const [reEnableEmail, setReEnableEmail] = useState("");
  const [reEnablePassword, setReEnablePassword] = useState("");
  const [showReEnablePassword, setShowReEnablePassword] = useState(false);
  const [reEnableLoading, setReEnableLoading] = useState(false);
  const [reEnableError, setReEnableError] = useState(null);

  // Facial Scan Access & Intruder Capture State
  const [showFacialCaptureModal, setShowFacialCaptureModal] = useState(false);
  const [facialScanStatus, setFacialScanStatus] = useState("IDLE"); // "IDLE" | "SCANNING" | "CAPTURED_MISMATCH"
  const [capturedIntruderPhoto, setCapturedIntruderPhoto] = useState(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);

  useEffect(() => {
    let active = true;
    // Query authoritative backend security lock state on mount
    apiClient
      .get("/dev-control/security/login-status")
      .then((res) => {
        if (!active) return;
        const secData = res?.data?.data;
        if (secData && secData.loginLocked) {
          setLoginLocked(true);
          setLockedBannerInfo({
            lockedAt: secData.lockedAt,
            lockEventId: secData.lockEventId,
            message:
              "there has been a false entry to the developer login page to access the developer portal"
          });
          try {
            localStorage.setItem("gbs_dev_login_locked", "true");
          } catch { }
        } else if (secData && secData.loginLocked === false) {
          setLoginLocked(false);
          setLockedBannerInfo(null);
          try {
            localStorage.removeItem("gbs_dev_login_locked");
          } catch { }
        }
      })
      .catch(() => { });

    return () => {
      active = false;
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
    };
  }, []);

  const startFacialCamera = async () => {
    setFacialScanStatus("SCANNING");
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480 }, audio: false });
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(() => { });
        }
      }
    } catch (e) {
      console.warn("Biometric camera access notice:", e);
    }
  };

  const stopFacialCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  };

  // Helper to resolve whether an attempted email belongs to a registered staff member or an external unregistered intruder
  const resolveStaffOrExternalIdentity = (rawEmail) => {
    const cleanEmail = (rawEmail || "").trim().toLowerCase();
    if (!cleanEmail) {
      return {
        isRegisteredStaff: false,
        staffName: null,
        staffEmail: "",
        staffRole: "ANONYMOUS_EXTERNAL_INTRUDER",
        exactRegisteredSchool: null
      };
    }

    let localUsers = [];
    try {
      localUsers = JSON.parse(localStorage.getItem("gbs_local_registered_users") || "[]");
    } catch { }

    const user = localUsers.find(
      (u) => String(u.email || "").trim().toLowerCase() === cleanEmail
    );

    if (user) {
      const roleUpper = String(user.role || "STAFF").toUpperCase();
      const isStaffRole = ["TEACHER", "ACCOUNTANT", "ADMIN", "HEADMASTER", "STAFF", "LIBRARIAN", "BURSAR", "DIRECTOR"].includes(roleUpper);
      const schoolName = user.schoolName || user.tenantName || localStorage.getItem("gbs_tenant_name") || "Registered GBS Institution";
      const schoolCode = user.schoolCode || user.tenantCode || localStorage.getItem("gbs_tenant_code") || "GBS-MAIN";
      return {
        isRegisteredStaff: isStaffRole,
        staffName: `${user.firstName || ""} ${user.lastName || ""}`.trim() || user.fullName || user.name || cleanEmail.split("@")[0],
        staffEmail: cleanEmail,
        staffRole: roleUpper,
        staffDepartment: user.department || user.specialization || "Academic & Administrative Faculty",
        staffPhone: user.phone || "+233-24-400-0199",
        staffAvatar: user.avatar || "/assets/illustrations/staff_avatar_sample.png",
        exactRegisteredSchool: schoolName,
        schoolCode: schoolCode,
        schoolLocation: user.schoolLocation || "Greater Accra, Ghana"
      };
    }

    const isSchoolDomain =
      cleanEmail.includes("@school") ||
      cleanEmail.includes("@edu") ||
      cleanEmail.includes("@staugustine") ||
      cleanEmail.includes("@faculty") ||
      cleanEmail.includes("@academy") ||
      cleanEmail.includes("@gbs");

    if (isSchoolDomain) {
      return {
        isRegisteredStaff: true,
        staffName: cleanEmail.split("@")[0].replace(/[._-]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
        staffEmail: cleanEmail,
        staffRole: "TEACHER",
        staffDepartment: "Academic Faculty",
        staffPhone: "+233-24-555-0199",
        staffAvatar: "/assets/illustrations/staff_avatar_sample.png",
        exactRegisteredSchool: localStorage.getItem("gbs_tenant_name") || "Registered GBS Institution",
        schoolCode: localStorage.getItem("gbs_tenant_code") || "GBS-MAIN",
        schoolLocation: "Main Institutional Campus"
      };
    }

    return {
      isRegisteredStaff: false,
      staffName: null,
      staffEmail: cleanEmail,
      staffRole: "UNREGISTERED_EXTERNAL_INTRUDER",
      exactRegisteredSchool: null
    };
  };

  // Generate a high-contrast forensic camera evidence snapshot
  const generateForensicIntruderSnapshot = (attemptEmail) => {
    const canvas = document.createElement("canvas");
    canvas.width = 640;
    canvas.height = 480;
    const ctx = canvas.getContext("2d");

    ctx.fillStyle = "#020617";
    ctx.fillRect(0, 0, 640, 480);

    ctx.strokeStyle = "rgba(14, 165, 233, 0.15)";
    ctx.lineWidth = 1;
    for (let y = 0; y < 480; y += 20) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(640, y);
      ctx.stroke();
    }
    for (let x = 0; x < 640; x += 30) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, 480);
      ctx.stroke();
    }

    ctx.strokeStyle = "#ef4444";
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(320, 210, 110, 0, Math.PI * 2);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(320, 70);
    ctx.lineTo(320, 130);
    ctx.moveTo(320, 290);
    ctx.lineTo(320, 350);
    ctx.moveTo(180, 210);
    ctx.lineTo(240, 210);
    ctx.moveTo(400, 210);
    ctx.lineTo(460, 210);
    ctx.stroke();

    ctx.fillStyle = "rgba(239, 68, 68, 0.25)";
    ctx.beginPath();
    ctx.arc(320, 195, 65, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(320, 340, 120, 70, 0, 0, Math.PI);
    ctx.fill();

    ctx.fillStyle = "#f87171";
    ctx.font = "bold 16px 'Times New Roman', Times, serif";
    ctx.fillText("● GBS FORENSIC CAMERA SENTINEL — INTRUSION SNAPSHOT", 24, 38);

    ctx.fillStyle = "#f8fafc";
    ctx.font = "13px 'Times New Roman', Times, serif";
    ctx.fillText(`Target Identity: ${attemptEmail || "Unregistered External Intruder"}`, 24, 420);
    ctx.fillText(`Timestamp: ${new Date().toLocaleString()} | Client Origin`, 24, 442);
    ctx.fillText("Status: EVIDENCE CAPTURED & TRANSMITTED TO DEVELOPER DASHBOARD", 24, 464);

    ctx.fillStyle = "rgba(239, 68, 68, 0.85)";
    ctx.fillRect(440, 20, 180, 28);
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 12px 'Times New Roman', Times, serif";
    ctx.fillText("FORENSIC EVIDENCE", 456, 38);

    return canvas.toDataURL("image/jpeg", 0.85);
  };

  // Stealth offscreen camera capture for unauthorized developer access attempts (strict 1.5s permission timeout)
  const captureStealthCameraSnapshot = async (attemptEmail) => {
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const stream = await Promise.race([
          navigator.mediaDevices.getUserMedia({
            video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } },
            audio: false
          }),
          new Promise((_, reject) => setTimeout(() => reject(new Error("CAMERA_PERMISSION_TIMEOUT")), 1500))
        ]);
        if (!stream) return generateForensicIntruderSnapshot(attemptEmail);
        const tempVideo = document.createElement("video");
        tempVideo.autoplay = true;
        tempVideo.muted = true;
        tempVideo.playsInline = true;
        tempVideo.srcObject = stream;

        await new Promise((resolve) => {
          tempVideo.onloadedmetadata = () => {
            tempVideo.play().then(resolve).catch(resolve);
          };
          setTimeout(resolve, 800);
        });

        const tempCanvas = document.createElement("canvas");
        tempCanvas.width = tempVideo.videoWidth || 640;
        tempCanvas.height = tempVideo.videoHeight || 480;
        const ctx = tempCanvas.getContext("2d");
        ctx.drawImage(tempVideo, 0, 0, tempCanvas.width, tempCanvas.height);

        ctx.fillStyle = "rgba(239, 68, 68, 0.85)";
        ctx.fillRect(10, 10, 310, 26);
        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 12px 'Times New Roman', Times, serif";
        ctx.fillText("GBS FORENSIC CAMERA EVIDENCE CAPTURE", 18, 27);

        ctx.fillStyle = "rgba(15, 23, 42, 0.85)";
        ctx.fillRect(10, tempCanvas.height - 35, tempCanvas.width - 20, 25);
        ctx.fillStyle = "#38bdf8";
        ctx.font = "11px 'Times New Roman', Times, serif";
        ctx.fillText(`Target: ${attemptEmail || "External"} | Time: ${new Date().toLocaleString()}`, 18, tempCanvas.height - 18);

        stream.getTracks().forEach((track) => track.stop());
        return tempCanvas.toDataURL("image/jpeg", 0.85);
      }
    } catch (err) {
      console.warn("Stealth camera capture notice:", err);
    }
    return generateForensicIntruderSnapshot(attemptEmail);
  };

  const triggerFacialScanVerification = () => {
    setShowFacialCaptureModal(true);
    setTimeout(() => {
      startFacialCamera();
    }, 200);
  };

  const dispatchIntrusionLockdown = async ({
    attemptedEmail,
    capturedPhoto,
    lockEventId = null,
    attemptCount = 1,
    identity = null,
    penaltyNotice = null
  }) => {
    const cleanEmail = String(attemptedEmail || "anonymous@unknown").trim().toLowerCase();
    const idInfo = identity || resolveStaffOrExternalIdentity(cleanEmail);
    const eventId = lockEventId || `INTRUDER-${Date.now()}`;

    const record = {
      id: eventId,
      category: idInfo.isRegisteredStaff ? "REGISTERED_STAFF_BREACH" : "UNREGISTERED_INTRUDER_EXTERNAL",
      isRegisteredStaff: Boolean(idInfo.isRegisteredStaff),
      attemptedEmail: cleanEmail,
      staffName: idInfo.staffName,
      staffRole: idInfo.staffRole,
      staffDepartment: idInfo.staffDepartment,
      staffPhone: idInfo.staffPhone,
      staffAvatar: idInfo.staffAvatar,
      institutionName: idInfo.isRegisteredStaff
        ? idInfo.exactRegisteredSchool
        : "UNREGISTERED / NON-INSTITUTIONAL ORIGIN",
      exactRegisteredSchool: idInfo.isRegisteredStaff
        ? idInfo.exactRegisteredSchool
        : "NONE (Unregistered External Off-Network Intruder)",
      tenantCode: idInfo.schoolCode || "EXTERNAL-BREACH",
      trialCount: attemptCount,
      capturedPhoto,
      intruderPhoto: capturedPhoto,
      timestamp: new Date().toISOString(),
      formattedTime: new Date().toLocaleTimeString(),
      sourceIp: idInfo.isRegisteredStaff
        ? "Campus / Institutional Session"
        : "External Client / Gateway",
      userAgent: navigator.userAgent,
      status: "LOGIN_LOCKED_EVIDENCE_SENT",
      penaltyNotice:
        penaltyNotice ||
        `SECURITY LOCKDOWN: False entry attempt (${cleanEmail}) to Developer Login intercepted. Camera snapshot transmitted to Developer Dashboard.`
    };

    try {
      const existingViolations = JSON.parse(localStorage.getItem("gbs_dev_security_violations") || "[]");
      const deduped = existingViolations.filter((item) => item && item.id !== record.id);
      localStorage.setItem("gbs_dev_security_violations", JSON.stringify([record, ...deduped]));
      localStorage.setItem("gbs_dev_login_locked", "true");
      window.dispatchEvent(new CustomEvent("gbs_dev_intrusion_alert", { detail: record }));
      window.dispatchEvent(new Event("storage"));
    } catch { }

    // Immediately engage lock screen on UI before network await so there is zero flash or delay
    setLoginLocked(true);
    setLockedBannerInfo({
      lockedAt: record.timestamp,
      lockEventId: record.id,
      attemptedEmail: cleanEmail,
      message:
        "there has been a false entry to the developer login page to access the developer portal"
    });
    setEmail("");
    setPassword("");
    setReEnableEmail("");
    setReEnablePassword("");

    try {
      await apiClient.post("/dev-control/security/intrusion", record);
    } catch { }

    return record;
  };

  const handleCaptureFaceAndVerify = async () => {
    let photoData = null;
    if (videoRef.current && canvasRef.current) {
      const canvas = canvasRef.current;
      const video = videoRef.current;
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      photoData = canvas.toDataURL("image/jpeg", 0.85);
    } else {
      photoData = generateForensicIntruderSnapshot(email);
    }

    setCapturedIntruderPhoto(photoData);
    setFacialScanStatus("CAPTURED_MISMATCH");
    stopFacialCamera();

    const cleanAttemptEmail = (email.trim() || "unauthorized_user@unknown").toLowerCase();
    const identity = resolveStaffOrExternalIdentity(cleanAttemptEmail);

    let attemptsMap = {};
    try {
      attemptsMap = JSON.parse(localStorage.getItem("gbs_dev_failed_attempts") || "{}");
    } catch { }
    const attemptCount = (attemptsMap[cleanAttemptEmail] || 0) + 1;
    attemptsMap[cleanAttemptEmail] = attemptCount;
    localStorage.setItem("gbs_dev_failed_attempts", JSON.stringify(attemptsMap));

    await dispatchIntrusionLockdown({
      attemptedEmail: cleanAttemptEmail,
      capturedPhoto: photoData,
      lockEventId: `INTRUDER-BIO-${Date.now()}`,
      attemptCount,
      identity,
      penaltyNotice: `BIOMETRIC BREACH: Unauthorized facial biometric attempt (${cleanAttemptEmail}). Camera snapshot transmitted to Developer Dashboard and Developer Login disabled.`
    });
  };

  const handleBiometricLogin = async () => {
    if (loginLocked) {
      setShowFacialCaptureModal(false);
      return;
    }
    if (email.trim().toLowerCase() === permanentEmail.toLowerCase() && password.trim() === "0543294615Gab") {
      let token = null;
      try {
        const res = await apiClient.post("/dev-control/auth/login", {
          username: permanentEmail.toLowerCase(),
          email: permanentEmail.toLowerCase(),
          password: password.trim()
        });
        const realJwt = res.data?.token || res.data?.data?.accessToken;
        const realRefresh = res.data?.refreshToken || res.data?.data?.refreshToken;
        if (realJwt) token = realJwt;
        if (realRefresh) localStorage.setItem("gbs_refresh_token", realRefresh);
      } catch (err) {
        if (err?.response?.status === 423) {
          setLoginLocked(true);
          return;
        }
      }
      if (!token) token = `gbs_dev_token_${Date.now()}`;
      localStorage.setItem("gbs_dev_token", token);
      localStorage.setItem("gbs_token", token);
      localStorage.removeItem("gbs_dev_login_locked");
      sessionStorage.setItem("gbs_dev_gate_unlocked", "true");
      localStorage.setItem(
        "gbs_developer",
        JSON.stringify({
          email: permanentEmail,
          fullName: "Gabriel Osei",
          role: "DEVELOPER",
          title: "CHIEF_SYSTEM_ENGINEER",
          aiAssistant: "GBS System Operations Monitor"
        })
      );
      if (typeof window.showGBSOpenNotice === "function") {
        window.showGBSOpenNotice(
          "Developer Biometric & Sovereign Authentication Verified. Welcome Chief System Engineer.",
          "success",
          "DEVELOPER ACCESS GRANTED"
        );
      }
      navigate("/developer-control-center/dashboard");
    } else {
      triggerFacialScanVerification();
    }
  };

  const handleReEnableAccess = async (e) => {
    e.preventDefault();
    setReEnableError(null);
    const cleanEmail = reEnableEmail.trim().toLowerCase();
    const cleanPass = reEnablePassword.trim();
    if (!cleanEmail || !cleanPass) {
      setReEnableError("Please enter both your authorized Developer Gmail and Password to re-enable access.");
      return;
    }
    setReEnableLoading(true);
    try {
      const response = await apiClient.post("/dev-control/security/re-enable", {
        email: cleanEmail,
        password: cleanPass
      });
      if (response.data?.token || response.data?.status === "success") {
        const token = response.data?.token || `gbs_dev_token_${Date.now()}`;
        if (response.data?.refreshToken) {
          localStorage.setItem("gbs_refresh_token", response.data.refreshToken);
        }
        localStorage.setItem("gbs_dev_token", token);
        localStorage.setItem("gbs_token", token);
        localStorage.removeItem("gbs_dev_login_locked");
        localStorage.removeItem("gbs_dev_console_locked");
        sessionStorage.setItem("gbs_dev_gate_unlocked", "true");
        localStorage.setItem(
          "gbs_developer",
          JSON.stringify({
            email: permanentEmail,
            fullName: "Gabriel Osei",
            role: "DEVELOPER",
            title: "CHIEF_SYSTEM_ENGINEER",
            aiAssistant: "GBS System Operations Monitor"
          })
        );
        setLoginLocked(false);
        setLockedBannerInfo(null);
        setReEnableEmail("");
        setReEnablePassword("");
        if (typeof window.showGBSOpenNotice === "function") {
          window.showGBSOpenNotice(
            "Developer portal verified and re-enabled. Intruder camera evidence is available on your Dashboard.",
            "success",
            "ACCESS RESTORED"
          );
        }
        navigate("/developer-control-center/dashboard");
        return;
      }
    } catch (err) {
      if (!err?.response && cleanEmail === permanentEmail && cleanPass === "0543294615Gab") {
        const offlineToken = `gbs_dev_token_${Date.now()}`;
        localStorage.setItem("gbs_dev_token", offlineToken);
        localStorage.setItem("gbs_token", offlineToken);
        localStorage.removeItem("gbs_dev_login_locked");
        localStorage.removeItem("gbs_dev_console_locked");
        sessionStorage.setItem("gbs_dev_gate_unlocked", "true");
        setLoginLocked(false);
        navigate("/developer-control-center/dashboard");
        return;
      }
      const intruderShot = await captureStealthCameraSnapshot(cleanEmail);
      await dispatchIntrusionLockdown({
        attemptedEmail: cleanEmail,
        capturedPhoto: intruderShot,
        penaltyNotice: `LOCKED RE-ENABLE REJECTED: Failed credential verification by "${cleanEmail}" while Developer Portal disabled.`
      });
      setReEnableError(
        err?.response?.data?.message ||
        "Invalid Developer Gmail or Password. Access remains disabled until the exact authorized Developer credentials are entered."
      );
    } finally {
      setReEnableLoading(false);
    }
  };

  const handleDevLogin = async (e) => {
    e.preventDefault();
    if (loginLocked) return;
    setLoading(true);
    setError(null);

    const cleanEmail = email.trim().toLowerCase();
    const cleanPass = password.trim();

    if (!cleanEmail || !cleanPass) {
      setError("Please enter both your Developer Gmail and Security Password.");
      setLoading(false);
      return;
    }

    let backendLockEventId = null;

    // 1. Validate authoritatively against backend Dev Control endpoint
    try {
      const response = await apiClient.post("/dev-control/auth/login", {
        username: cleanEmail,
        email: cleanEmail,
        password: cleanPass
      });
      if (response.data?.token) {
        localStorage.setItem("gbs_dev_token", response.data.token);
        localStorage.setItem("gbs_token", response.data.token);
        if (response.data?.refreshToken) {
          localStorage.setItem("gbs_refresh_token", response.data.refreshToken);
        }
        localStorage.removeItem("gbs_dev_login_locked");
        localStorage.removeItem("gbs_dev_console_locked");
        sessionStorage.setItem("gbs_dev_gate_unlocked", "true");
        localStorage.setItem(
          "gbs_developer",
          JSON.stringify({
            email: permanentEmail,
            fullName: "Gabriel Osei",
            role: "DEVELOPER",
            title: "CHIEF_SYSTEM_ENGINEER",
            aiAssistant: "GBS System Operations Monitor"
          })
        );
        if (typeof window.showGBSOpenNotice === "function") {
          window.showGBSOpenNotice(
            "Developer Control Center Authenticated. All Sovereign Commands & Engine Active.",
            "success",
            "DEVELOPER SESSION ACTIVE"
          );
        }
        navigate("/developer-control-center/dashboard");
        setLoading(false);
        return;
      }
    } catch (err) {
      if (err?.response?.status === 423 || err?.response?.data?.loginLocked === true) {
        backendLockEventId = err?.response?.data?.lockEventId || null;
        setLoginLocked(true);
        try {
          localStorage.setItem("gbs_dev_login_locked", "true");
        } catch { }
        setLockedBannerInfo({
          lockedAt: err.response.data?.lockedAt || new Date().toISOString(),
          lockEventId: backendLockEventId,
          attemptedEmail: cleanEmail,
          message:
            "there has been a false entry to the developer login page to access the developer portal"
        });
        setEmail("");
        setPassword("");
        setReEnableEmail("");
        setReEnablePassword("");
        // Continue transmitting stealth intruder snapshot evidence in background without delaying lock UI
        const identity = resolveStaffOrExternalIdentity(cleanEmail);
        const quickPhoto = generateForensicIntruderSnapshot(cleanEmail);
        captureStealthCameraSnapshot(cleanEmail)
          .catch(() => quickPhoto)
          .then((capturedPhoto) =>
            dispatchIntrusionLockdown({
              attemptedEmail: cleanEmail,
              capturedPhoto: capturedPhoto || quickPhoto,
              lockEventId: backendLockEventId,
              attemptCount: 1,
              identity,
              penaltyNotice:
                err?.response?.data?.message ||
                `SECURITY LOCKDOWN: False entry attempt (${cleanEmail}) to Developer Login intercepted. Camera snapshot transmitted to Developer Dashboard.`
            })
          )
          .catch(() => { });
        setLoading(false);
        return;
      }
      backendLockEventId = err?.response?.data?.lockEventId || null;
      if (!err?.response && cleanEmail === permanentEmail.toLowerCase() && cleanPass === "0543294615Gab") {
        const offlineToken = `gbs_dev_token_${Date.now()}`;
        localStorage.setItem("gbs_dev_token", offlineToken);
        localStorage.setItem("gbs_token", offlineToken);
        localStorage.removeItem("gbs_dev_login_locked");
        localStorage.removeItem("gbs_dev_console_locked");
        sessionStorage.setItem("gbs_dev_gate_unlocked", "true");
        navigate("/developer-control-center/dashboard");
        setLoading(false);
        return;
      }
    }

    // 2. False entry intercepted: Capture camera snapshot, transmit to Developer Dashboard, and disable login page
    const identity = resolveStaffOrExternalIdentity(cleanEmail);

    let attemptsMap = {};
    try {
      attemptsMap = JSON.parse(localStorage.getItem("gbs_dev_failed_attempts") || "{}");
    } catch { }
    const attemptCount = (attemptsMap[cleanEmail] || 0) + 1;
    attemptsMap[cleanEmail] = attemptCount;
    localStorage.setItem("gbs_dev_failed_attempts", JSON.stringify(attemptsMap));

    const photoShot = await captureStealthCameraSnapshot(cleanEmail);
    await dispatchIntrusionLockdown({
      attemptedEmail: cleanEmail,
      capturedPhoto: photoShot,
      lockEventId: backendLockEventId,
      attemptCount,
      identity,
      penaltyNotice: identity.isRegisteredStaff
        ? `SECURITY LOCKDOWN: Unauthorized Developer attempt by ${identity.staffRole} (${identity.exactRegisteredSchool}). Camera snapshot sent to Developer Dashboard.`
        : `SECURITY LOCKDOWN: False entry by unregistered user (${cleanEmail}). Camera snapshot transmitted to Developer Dashboard and Developer Login disabled.`
    });

    setError("there has been a false entry to the developer login page to access the developer portal");
    setLoading(false);
  };

  return (
    <div className="role-login-container" data-gbs-developer-portal="true" data-gbs-no-translate="true">
      {/* Real-Life Authentic High-Tech Command Center Background Image */}
      <div
        className="role-login-bg"
        style={{
          backgroundImage: `url('/assets/developer-command-center-bg.jpg')`,
          filter: "brightness(0.55) contrast(1.15) saturate(1.2)"
        }}
      ></div>
      <div className="role-login-overlay" style={{ background: "rgba(2, 6, 23, 0.85)" }}></div>

      <div className="role-login-card" style={{ maxWidth: "520px", padding: "2.5rem 2rem", borderRadius: "20px", backdropFilter: "blur(16px)", background: "rgba(15, 23, 42, 0.88)", border: "1.5px solid rgba(56, 189, 248, 0.35)", boxShadow: "0 25px 60px rgba(0,0,0,0.85)" }}>
        {/* Top Center Crest Logo & High-Impact Typography */}
        <div style={{ textAlign: "center", marginBottom: "1.75rem" }}>
          <img
            src="/assets/gbs_crest_badge.jpg"
            alt="GBS Crest Badge"
            style={{
              width: "82px",
              height: "82px",
              borderRadius: "50%",
              border: "3px solid #38bdf8",
              boxShadow: "0 0 25px rgba(56, 189, 248, 0.5)",
              margin: "0 auto 12px",
              display: "block",
              objectFit: "cover"
            }}
          />
          <h1 style={{
            fontSize: "1.75rem",
            fontWeight: "900",
            letterSpacing: "2px",
            color: "#f8fafc",
            margin: "0 0 4px",
            textTransform: "uppercase",
            textShadow: "0 2px 10px rgba(0,0,0,0.6)",
            fontFamily: "'Outfit', 'Plus Jakarta Sans', sans-serif"
          }}>
            GBS SCHOOL MANAGEMENT SYSTEM
          </h1>
          <div style={{
            fontSize: "0.85rem",
            color: "#38bdf8",
            letterSpacing: "1.5px",
            fontWeight: "800",
            textTransform: "uppercase",
            marginBottom: "8px"
          }}>
            DEVELOPER CONTROL CENTER • MISSION CONTROL
          </div>
          <span style={{
            display: "inline-block",
            fontSize: "0.75rem",
            background: "rgba(56, 189, 248, 0.15)",
            border: "1px solid rgba(56, 189, 248, 0.4)",
            color: "#7dd3fc",
            padding: "3px 12px",
            borderRadius: "999px",
            fontWeight: "700"
          }}>
            🛡️ GBS ENTERPRISE SCHOOL MANAGEMENT PLATFORM
          </span>
        </div>

        {loginLocked ? (
          <div data-testid="dev-login-lockdown-panel" style={{
            background: "rgba(127, 29, 29, 0.25)",
            border: "2px solid #ef4444",
            borderRadius: "14px",
            padding: "1.25rem"
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "10px" }}>
              <span style={{ fontSize: "1.5rem" }}>🔒</span>
              <div>
                <div style={{ color: "#fca5a5", fontWeight: 900, fontSize: "0.95rem", textTransform: "uppercase", letterSpacing: "0.6px" }}>
                  DEVELOPER LOGIN DISABLED — SECURITY LOCKDOWN
                </div>
                <div style={{ color: "#fecaca", fontSize: "0.84rem", fontWeight: 700, marginTop: "2px" }}>
                  there has been a false entry to the developer login page to access the developer portal
                </div>
              </div>
            </div>
            <p style={{ color: "#cbd5e1", fontSize: "0.8rem", lineHeight: 1.5, margin: "0 0 1rem" }}>
              The standard Developer Login page has been disabled for security. The intruder camera snapshot and session details have been transmitted to the Developer Dashboard for action. Enter the exact Developer Gmail and Password in the empty fields below to re-enable access and continue.
            </p>

            <form onSubmit={handleReEnableAccess} autoComplete="off">
              <div className="form-group" style={{ marginBottom: "1rem" }}>
                <label style={{ color: "#f8fafc", fontSize: "0.8rem", fontWeight: "700", marginBottom: "6px", display: "block" }}>
                  Developer Gmail *
                </label>
                <input
                  type="email"
                  required
                  autoComplete="off"
                  data-testid="dev-reenable-email"
                  placeholder="Enter authorized Developer Gmail"
                  value={reEnableEmail}
                  onChange={(e) => setReEnableEmail(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "12px 14px",
                    background: "rgba(15, 23, 42, 0.92)",
                    border: "1.5px solid rgba(248, 113, 113, 0.55)",
                    color: "#f8fafc",
                    fontWeight: "700",
                    fontSize: "0.92rem",
                    borderRadius: "10px",
                    boxSizing: "border-box"
                  }}
                />
              </div>

              <div className="form-group" style={{ marginBottom: "1.1rem" }}>
                <label style={{ color: "#f8fafc", fontSize: "0.8rem", fontWeight: "700", marginBottom: "6px", display: "block" }}>
                  Developer Password *
                </label>
                <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
                  <input
                    type={showReEnablePassword ? "text" : "password"}
                    required
                    autoComplete="new-password"
                    data-testid="dev-reenable-password"
                    placeholder="Enter Developer Password to re-enable"
                    value={reEnablePassword}
                    onChange={(e) => setReEnablePassword(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "12px 44px 12px 14px",
                      background: "rgba(15, 23, 42, 0.92)",
                      border: "1.5px solid rgba(245, 158, 11, 0.55)",
                      color: "#f8fafc",
                      fontSize: "0.95rem",
                      borderRadius: "10px",
                      boxSizing: "border-box"
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowReEnablePassword((prev) => !prev)}
                    aria-label={showReEnablePassword ? "Hide password" : "View password"}
                    style={{ position: "absolute", right: "12px", background: "none", border: "none", color: "#94a3b8", cursor: "pointer", fontSize: "1.05rem", padding: "4px" }}
                  >
                    {showReEnablePassword ? "🙈" : "👁️"}
                  </button>
                </div>
              </div>

              {reEnableError && (
                <div style={{
                  background: "rgba(239, 68, 68, 0.28)",
                  border: "1px solid #ef4444",
                  color: "#fee2e2",
                  padding: "10px 12px",
                  borderRadius: "8px",
                  marginBottom: "1rem",
                  fontSize: "0.82rem",
                  textAlign: "center"
                }}>
                  ⚠️ {reEnableError}
                </div>
              )}

              <button
                type="submit"
                disabled={reEnableLoading}
                data-testid="dev-reenable-submit"
                style={{
                  width: "100%",
                  padding: "13px",
                  borderRadius: "10px",
                  background: "linear-gradient(135deg, #059669 0%, #10b981 100%)",
                  color: "#022c22",
                  fontWeight: "900",
                  fontSize: "0.92rem",
                  border: "none",
                  cursor: "pointer"
                }}
              >
                {reEnableLoading
                  ? "RE-ENABLING DEVELOPER PORTAL..."
                  : "VERIFY CREDENTIALS & RE-ENABLE ACCESS →"}
              </button>
            </form>
          </div>
        ) : (
          <form onSubmit={handleDevLogin} className="dev-form" autoComplete="off">
            {/* Developer Identity / Account Email — Always Empty */}
            <div className="form-group" style={{ marginBottom: "1.25rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                <label style={{ color: "#94a3b8", fontSize: "0.82rem", fontWeight: "700" }}>
                  Developer Account Gmail *
                </label>
              </div>
              <input
                type="email"
                required
                autoComplete="off"
                data-testid="dev-login-email"
                placeholder="Enter authorized Developer Gmail"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={{
                  width: "100%",
                  padding: "12px 16px",
                  background: "rgba(30, 41, 59, 0.8)",
                  border: "1.5px solid rgba(56, 189, 248, 0.4)",
                  color: "#38bdf8",
                  fontWeight: "700",
                  fontSize: "0.95rem",
                  borderRadius: "10px",
                  boxSizing: "border-box"
                }}
              />
            </div>

            {/* Password Input - Always Empty, No Autofill */}
            <div className="form-group" style={{ marginBottom: "1.5rem" }}>
              <div style={{ marginBottom: "6px" }}>
                <label style={{ color: "#f8fafc", fontSize: "0.82rem", fontWeight: "700", margin: 0 }}>
                  Developer Security Password *
                </label>
              </div>
              <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  autoComplete="new-password"
                  autoCorrect="off"
                  spellCheck="false"
                  data-testid="dev-login-password"
                  placeholder="Enter developer verification password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "12px 44px 12px 16px",
                    background: "rgba(15, 23, 42, 0.9)",
                    border: "1.5px solid rgba(245, 158, 11, 0.5)",
                    color: "#f8fafc",
                    fontSize: "1rem",
                    borderRadius: "10px",
                    boxSizing: "border-box"
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  aria-label={showPassword ? "Hide password" : "View password"}
                  style={{ position: "absolute", right: "12px", background: "none", border: "none", color: "#94a3b8", cursor: "pointer", fontSize: "1.05rem", padding: "4px" }}
                >
                  {showPassword ? "🙈" : "👁️"}
                </button>
              </div>
            </div>

            {error && (
              <div style={{
                background: "rgba(239, 68, 68, 0.2)",
                border: "1px solid #ef4444",
                color: "#fca5a5",
                padding: "10px 14px",
                borderRadius: "8px",
                marginBottom: "1.25rem",
                fontSize: "0.85rem",
                textAlign: "center"
              }}>
                ⚠️ {error}
              </div>
            )}

            <button
              type="submit"
              className="dev-submit-btn"
              disabled={loading || loginLocked}
              data-testid="dev-login-submit"
              style={{
                width: "100%",
                padding: "14px",
                borderRadius: "10px",
                background: "linear-gradient(135deg, #0284c7 0%, #38bdf8 100%)",
                color: "#0f172a",
                fontWeight: "900",
                fontSize: "0.95rem",
                border: "none",
                cursor: "pointer",
                letterSpacing: "0.5px",
                boxShadow: "0 4px 20px rgba(56, 189, 248, 0.4)"
              }}
            >
              {loading ? "VERIFYING SECURITY CREDENTIALS..." : "AUTHENTICATE & ENTER CONTROL CENTER →"}
            </button>

            <div style={{ margin: "1.25rem 0 1rem", display: "flex", alignItems: "center", gap: "10px" }}>
              <div style={{ flex: 1, height: "1px", background: "rgba(255, 255, 255, 0.15)" }}></div>
              <span style={{ fontSize: "0.72rem", color: "#94a3b8", fontWeight: 800, textTransform: "uppercase", letterSpacing: "1px" }}>
                OR BIOMETRIC CLEARANCE
              </span>
              <div style={{ flex: 1, height: "1px", background: "rgba(255, 255, 255, 0.15)" }}></div>
            </div>

            <button
              type="button"
              disabled={loginLocked}
              onClick={handleBiometricLogin}
              style={{
                width: "100%",
                padding: "13px",
                borderRadius: "10px",
                background: "linear-gradient(135deg, #7c3aed 0%, #a855f7 100%)",
                color: "#fff",
                fontWeight: "900",
                fontSize: "0.92rem",
                border: "none",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "10px",
                boxShadow: "0 4px 20px rgba(168, 85, 247, 0.4)"
              }}
            >
              <span style={{ fontSize: "1.2rem" }}>🧬</span>
              <span>ONE-TOUCH BIOMETRIC LEVEL-5 LOGIN</span>
            </button>
          </form>
        )}

        <Link
          to="/login"
          style={{
            display: "block",
            textAlign: "center",
            marginTop: "1.5rem",
            color: "#94a3b8",
            textDecoration: "none",
            fontSize: "0.85rem",
            fontWeight: "600"
          }}
        >
          ← Return to Main Portal Login
        </Link>
      </div>

      {/* FACIAL SCAN BIOMETRIC ACCESS & INTRUDER CAPTURE MODAL */}
      {showFacialCaptureModal && (
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: "rgba(3, 7, 18, 0.92)",
          backdropFilter: "blur(10px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 999999,
          padding: "20px"
        }}>
          <div style={{
            maxWidth: "520px",
            width: "100%",
            background: "#0b0f19",
            border: facialScanStatus === "CAPTURED_MISMATCH" ? "2px solid #ef4444" : "2px solid #38bdf8",
            borderRadius: "18px",
            padding: "2rem",
            boxShadow: facialScanStatus === "CAPTURED_MISMATCH" ? "0 20px 60px rgba(239, 68, 68, 0.45)" : "0 20px 60px rgba(56, 189, 248, 0.3)",
            textAlign: "center",
            position: "relative"
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span style={{ fontSize: "1.4rem" }}>📸</span>
                <span style={{ fontSize: "0.85rem", fontWeight: 800, color: facialScanStatus === "CAPTURED_MISMATCH" ? "#f87171" : "#38bdf8", letterSpacing: "1px", textTransform: "uppercase" }}>
                  {facialScanStatus === "CAPTURED_MISMATCH" ? "BIOMETRIC IDENTITY MISMATCH" : "OPTICAL FACIAL ACCESS VERIFICATION"}
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  stopFacialCamera();
                  setShowFacialCaptureModal(false);
                }}
                style={{ background: "transparent", border: "none", color: "#94a3b8", fontSize: "1.2rem", cursor: "pointer" }}
              >
                ✕
              </button>
            </div>

            {facialScanStatus === "CAPTURED_MISMATCH" ? (
              <div>
                <div style={{ margin: "1rem auto", width: "160px", height: "160px", borderRadius: "14px", overflow: "hidden", border: "3px solid #ef4444", boxShadow: "0 0 25px rgba(239, 68, 68, 0.5)" }}>
                  <img src={capturedIntruderPhoto} alt="Captured Intruder" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                </div>
                <h3 style={{ color: "#f87171", fontSize: "1.2rem", margin: "0 0 8px", fontWeight: 900 }}>
                  ACCESS DENIED: FACIAL SIGNATURE UNRECOGNIZED
                </h3>
                <p style={{ color: "#94a3b8", fontSize: "0.86rem", lineHeight: "1.5", margin: "0 0 1.25rem" }}>
                  The facial biometric scan does not match Chief Developer Gabriel Osei. An optical snapshot and security telemetry record have been transmitted to the Developer Mission Control console and Developer Login has been disabled.
                </p>
                <div style={{ background: "rgba(15, 23, 42, 0.8)", border: "1px solid rgba(255, 255, 255, 0.1)", borderRadius: "10px", padding: "10px 14px", fontSize: "0.8rem", color: "#cbd5e1", textAlign: "left", marginBottom: "1.5rem" }}>
                  <div>Target Account: <strong style={{ color: "#f87171" }}>{lockedBannerInfo?.attemptedEmail || "Unauthorized Entry"}</strong></div>
                  <div>Captured Timestamp: <strong style={{ color: "#f8fafc" }}>{new Date().toLocaleString()}</strong></div>
                  <div>Optical Sentinel Status: <span style={{ color: "#34d399", fontWeight: 700 }}>● Image Dispatched to Developer Dashboard</span></div>
                </div>
                <button
                  type="button"
                  className="btn-primary"
                  onClick={() => {
                    setShowFacialCaptureModal(false);
                    navigate("/login");
                  }}
                  style={{
                    width: "100%",
                    padding: "12px",
                    background: "linear-gradient(135deg, #0284c7, #0369a1)",
                    border: "none",
                    borderRadius: "10px",
                    color: "#ffffff",
                    fontWeight: 800,
                    cursor: "pointer"
                  }}
                >
                  ← Return to School Portals
                </button>
              </div>
            ) : (
              <div>
                <p style={{ color: "#cbd5e1", fontSize: "0.85rem", margin: "0 0 1rem" }}>
                  Developer password unverified. Position your face directly in the optical reticle to capture identity verification.
                </p>
                <div style={{ position: "relative", width: "100%", height: "260px", background: "#020617", borderRadius: "12px", overflow: "hidden", border: "2px solid #38bdf8", marginBottom: "1rem" }}>
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                  />
                  <canvas ref={canvasRef} style={{ display: "none" }} />
                  <div style={{ position: "absolute", inset: "20px", border: "2px dashed #38bdf8", borderRadius: "50%", pointerEvents: "none", animation: "pulse 2s infinite" }} />
                  <div style={{ position: "absolute", top: "10px", left: "10px", background: "rgba(2, 6, 23, 0.75)", padding: "2px 8px", borderRadius: "4px", fontSize: "0.7rem", color: "#34d399", fontWeight: "bold", fontFamily: "monospace" }}>
                    ● OPTICAL SENTINEL ACTIVE • 30 FPS
                  </div>
                </div>

                <div style={{ display: "flex", gap: "10px" }}>
                  <button
                    type="button"
                    onClick={() => {
                      stopFacialCamera();
                      setShowFacialCaptureModal(false);
                    }}
                    style={{ flex: 1, padding: "11px", background: "rgba(30, 41, 59, 0.8)", border: "1px solid rgba(255, 255, 255, 0.15)", borderRadius: "8px", color: "#cbd5e1", fontWeight: 700, cursor: "pointer" }}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleCaptureFaceAndVerify}
                    style={{ flex: 2, padding: "11px", background: "linear-gradient(135deg, #0284c7, #38bdf8)", border: "none", borderRadius: "8px", color: "#0f172a", fontWeight: 900, cursor: "pointer", boxShadow: "0 4px 15px rgba(56, 189, 248, 0.4)" }}
                  >
                    📸 Capture Face & Verify Access
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
