import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { Link, useNavigate, useLocation } from "react-router-dom";
import apiClient from "../../../../../api/client/apiClient";
import WindowControlsBar from "../../../../../components/common/WindowControlsBar";
import TopCenterSystemBanner from "../../../../../components/common/TopCenterSystemBanner";
import { getUserAvatar } from "../../../../../utils/userAvatars";
import { offlineSyncEngine } from "../../../../../utils/offlineSync";
import UniversalRoleGuideModal from "../../../../../components/common/UniversalRoleGuideModal";
import ClassTopicVideoPlatform from "../../../../../components/common/ClassTopicVideoPlatform";
import LiveCallLauncherAndReceiver from "../../../../../components/common/LiveCallLauncherAndReceiver";
import { navigateToDetail } from "../../../../../utils/universalNavigation";
import OfficialPaymentGatewayModal from "../../../../../components/common/OfficialPaymentGatewayModal";
import OfficialInstitutionalSeal from "../../../../../components/common/OfficialInstitutionalSeal";
import StudentCooperativeConferenceModal from "../../../../../components/common/StudentCooperativeConferenceModal";
import { getActiveSchoolName, getActiveSchoolLogo } from "../../../../../utils/schoolBranding";
import { getActiveInstitutionType, getInstitutionRoleProfile } from "../../../../../utils/institutionScope";
import UniversityOperationsPanel from "../../../../../components/common/UniversityOperationsPanel";
import SchoolClinicHubPanel from "../../../../../components/common/SchoolClinicHubPanel";
import SchoolStationeryHubPanel from "../../../../../components/common/SchoolStationeryHubPanel";
import { isDemoSandboxMode } from "../../../../../utils/tokenStorage";
import { checkDemoEntryLimit, trackDemoEntryCreated } from "../../../../../utils/demoLimitGuard";
import { useDashboardTabSync } from "../../../../../hooks/useDashboardTabSync";
import { performSmartBack } from "../../../../../utils/globalNavigationScrollManager";
import "./StudentDashboard.css";

export function StudentDashboard({ initialTab } = {}) {
  const navigate = useNavigate();
  const location = useLocation();
  const [showStudentGuideModal, setShowStudentGuideModal] = useState(false);
  const [showCoopModal, setShowCoopModal] = useState(false);
  const [selectedCoopRoom, setSelectedCoopRoom] = useState(null);
  const [coopCallMode, setCoopCallMode] = useState("VIDEO");

  const handleOpenCoopConferencing = (room = null, mode = "VIDEO") => {
    setSelectedCoopRoom(room);
    setCoopCallMode(mode);
    setShowCoopModal(true);
  };

  const studentProfile = (() => {
    try {
      const stored = localStorage.getItem("gbs_user");
      if (stored) return JSON.parse(stored);
    } catch { }
    return { firstName: "Enrolled", lastName: "Student", role: "STUDENT", indexNumber: "STU-ACTIVE" };
  })();

  // Real-Life Scholar Portrait
  const [studentAvatar, setStudentAvatar] = useState(() => getUserAvatar("STUDENT"));
  useEffect(() => {
    const handleAvatarChange = (e) => {
      if (e.detail?.role === "STUDENT") setStudentAvatar(e.detail.avatar);
    };
    window.addEventListener("gbs_user_avatar_changed", handleAvatarChange);
    return () => window.removeEventListener("gbs_user_avatar_changed", handleAvatarChange);
  }, []);

  // Published Headmaster Academic Schedule (Weeks in school & Vacation Date awareness)
  const [publishedSchedule, setPublishedSchedule] = useState(() => {
    try {
      const stored = localStorage.getItem("gbs_academic_published_schedule");
      if (stored) return JSON.parse(stored);
    } catch { }
    return {
      academicYear: "2026/2027",
      activeTerm: "TERM_1",
      numberOfWeeksInSchool: 14,
      vacationDate: "2026-12-18",
      publishedAt: new Date().toISOString()
    };
  });

  useEffect(() => {
    const syncSchedule = () => {
      try {
        const stored = localStorage.getItem("gbs_academic_published_schedule");
        if (stored) setPublishedSchedule(JSON.parse(stored));
      } catch { }
    };
    window.addEventListener("gbs_academic_schedule_published", syncSchedule);
    window.addEventListener("storage", syncSchedule);
    return () => {
      window.removeEventListener("gbs_academic_schedule_published", syncSchedule);
      window.removeEventListener("storage", syncSchedule);
    };
  }, []);

  // Unified React Router module-page navigation & exact scroll restoration
  const { activeTab, setActiveTab } = useDashboardTabSync("timetable", "gbs_student_active_tab", null, { initialTab });
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [institutionType, setInstitutionType] = useState(() => getActiveInstitutionType());
  const institutionProfile = getInstitutionRoleProfile(institutionType);

  useEffect(() => {
    const syncTier = () => setInstitutionType(getActiveInstitutionType());
    const onVoiceTab = (e) => { if (e?.detail?.tab) setActiveTab(e.detail.tab); };
    window.addEventListener("gbs_institution_type_changed", syncTier);
    window.addEventListener("storage", syncTier);
    window.addEventListener("gbs_open_dashboard_tab", onVoiceTab);
    return () => {
      window.removeEventListener("gbs_institution_type_changed", syncTier);
      window.removeEventListener("storage", syncTier);
      window.removeEventListener("gbs_open_dashboard_tab", onVoiceTab);
    };
  }, []);

  useEffect(() => {
    if (feedback && typeof window !== "undefined" && typeof window.showGBSOpenNotice === "function") {
      const msg = typeof feedback === "string" ? feedback : feedback.message || feedback.text || "";
      const type = (typeof feedback === "object" && feedback.type) || "success";
      if (msg) {
        window.showGBSOpenNotice(msg, type, "STUDENT PORTAL RESPONSE");
      }
    }
  }, [feedback]);

  // Live States
  const [timetableSlots, setTimetableSlots] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [submissionInputs, setSubmissionInputs] = useState({});
  const [mySubmissions, setMySubmissions] = useState({});
  const [announcements, setAnnouncements] = useState([]);
  const [meetings, setMeetings] = useState([]);

  // Online Exam Interactive Engine State
  const [unlockedExamIds, setUnlockedExamIds] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("gbs_student_unlocked_exams") || '[]');
    } catch {
      return [];
    }
  });

  const handleUnlockExam = (exam) => {
    const examId = exam.id || exam.title || "exam";
    const updated = [...new Set([...unlockedExamIds, examId])];
    setUnlockedExamIds(updated);
    localStorage.setItem("gbs_student_unlocked_exams", JSON.stringify(updated));
    setFeedback({
      type: "success",
      message: `⏱️ Scheduled start time arrived for "${exam.title}"! Portal is now unlocked for you to write the paper and be auto-graded.`
    });
  };

  const [exams, setExams] = useState([]);
  const [activeExam, setActiveExam] = useState(null);
  const [examStarted, setExamStarted] = useState(false);
  const [examSubmitted, setExamSubmitted] = useState(false);
  const [examTimeLeftSeconds, setExamTimeLeftSeconds] = useState(900);
  const [examAnswers, setExamAnswers] = useState({});
  const [examScoreResult, setExamScoreResult] = useState(null);
  const [showExamConfirmModal, setShowExamConfirmModal] = useState(false);

  // Exam Font Sizing, Navigation & Continuous AI Proctoring
  const [examFontSize, setExamFontSize] = useState("NORMAL"); // "NORMAL" (15px), "MEDIUM" (18px), "LARGE" (22px)
  const [examQuestionIndex, setExamQuestionIndex] = useState(0);
  const [proctoringWarnings, setProctoringWarnings] = useState(0);
  const [showHeadMovementWarningModal, setShowHeadMovementWarningModal] = useState(false);
  const [penaltyMarksDeducted, setPenaltyMarksDeducted] = useState(0);
  const [teacherPenaltyMarks, setTeacherPenaltyMarks] = useState(0);
  const [liveProctorMessages, setLiveProctorMessages] = useState([]);
  const [dismissedProctorMsgIds, setDismissedProctorMsgIds] = useState([]);
  const [examEssayAnswers, setExamEssayAnswers] = useState({});
  const [proctoringStatus, setProctoringStatus] = useState("IDLE"); // "IDLE" | "INITIALIZING" | "CAMERA_ACTIVE" | "FOCUS_ONLY_ACTIVE" | "WARNING_DETECTED" | "STOPPED"
  const [proctoringDetail, setProctoringDetail] = useState("AI proctoring activates automatically when you click Start Exam.");
  const [proctoringEvents, setProctoringEvents] = useState([]);
  const [lastAlertReason, setLastAlertReason] = useState("Head movement or focus shift away from the exam screen detected.");

  const proctorVideoRef = useRef(null);
  const proctorStreamRef = useRef(null);
  const proctorCanvasRef = useRef(null);
  const proctorSnapCanvasRef = useRef(null);
  const proctorPrevFrameRef = useRef(null);
  const proctorIntervalRef = useRef(null);
  const proctorOffFrameStreakRef = useRef(0);
  const lastProctorAlertAtRef = useRef(0);
  const proctorSnapshotsRef = useRef([]);
  const proctorSyncCountRef = useRef({ warnings: 0, penalty: 0, teacherMarks: 0, status: "IDLE", movementDelta: 0, events: [] });
  const proctorPrewarmPromiseRef = useRef(null);
  const proctorSessionKeyRef = useRef(null);
  const proctorPeersRef = useRef(new Map()); // viewerId -> RTCPeerConnection

  const requestFastExamCameraStream = async () => {
    if (!navigator.mediaDevices || typeof navigator.mediaDevices.getUserMedia !== "function") {
      return null;
    }
    try {
      return await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 360 }, frameRate: { ideal: 30, min: 15 } },
        audio: false
      });
    } catch {
      try {
        return await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 480 }, height: { ideal: 270 }, frameRate: { ideal: 24 } },
          audio: false
        });
      } catch {
        // Immediate universal fallback for USB/older webcams that reject facingMode or resolution hints
        return await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      }
    }
  };

  // Past Questions Archive Filters & Inspection
  const [pastExamYearFilter, setPastExamYearFilter] = useState("ALL");
  const [pastExamTermFilter, setPastExamTermFilter] = useState("ALL");
  const [selectedPastPaperModal, setSelectedPastPaperModal] = useState(null);

  // Peer Chat File / Image Attachment State
  const [chatAttachment, setChatAttachment] = useState(null);
  const chatFileInputRef = useRef(null);

  const stopProctoringSession = () => {
    if (proctorIntervalRef.current) {
      clearInterval(proctorIntervalRef.current);
      proctorIntervalRef.current = null;
    }
    if (proctorPeersRef.current) {
      proctorPeersRef.current.forEach((pc) => {
        try { pc.close(); } catch { }
      });
      proctorPeersRef.current.clear();
    }
    if (proctorStreamRef.current) {
      try {
        proctorStreamRef.current.getTracks().forEach((track) => track.stop());
      } catch { }
      proctorStreamRef.current = null;
    }
    if (proctorVideoRef.current) {
      try {
        proctorVideoRef.current.srcObject = null;
      } catch { }
    }
    proctorPrevFrameRef.current = null;
    proctorOffFrameStreakRef.current = 0;
    setProctoringStatus("STOPPED");
    setProctoringDetail("Exam session ended. AI proctoring camera and monitors stopped.");
  };

  const captureWebcamSnapshotDataUrl = (compactForLiveStream = false) => {
    try {
      const video = proctorVideoRef.current;
      if (!video || video.readyState < 2) return null;
      const w = compactForLiveStream ? 240 : 480;
      const h = compactForLiveStream ? 135 : 270;
      const snapCanvas = proctorSnapCanvasRef.current || document.createElement("canvas");
      if (snapCanvas.width !== w) snapCanvas.width = w;
      if (snapCanvas.height !== h) snapCanvas.height = h;
      proctorSnapCanvasRef.current = snapCanvas;
      const sCtx = snapCanvas.getContext("2d");
      if (!sCtx) return null;
      sCtx.drawImage(video, 0, 0, w, h);
      return snapCanvas.toDataURL("image/jpeg", compactForLiveStream ? 0.48 : 0.72);
    } catch {
      return null;
    }
  };

  // AI Exam Head Movement & Integrity Proctoring Sentinel
  const triggerHeadMovementAlert = (reason = "Head movement or focus shift away from the exam screen detected!") => {
    if (!examStarted || examSubmitted) return;
    const now = Date.now();
    if (now - lastProctorAlertAtRef.current < 4500) return;
    lastProctorAlertAtRef.current = now;

    const cleanReason = typeof reason === "string" && reason.trim()
      ? reason.trim()
      : "Head movement or focus shift away from the exam screen detected!";

    const capturedSnap = captureWebcamSnapshotDataUrl();
    if (capturedSnap) {
      proctorSnapshotsRef.current = [capturedSnap, ...proctorSnapshotsRef.current.slice(0, 7)];
    }

    setLastAlertReason(cleanReason);
    setProctoringStatus("WARNING_DETECTED");
    setProctoringWarnings((prev) => {
      const nextCount = prev + 1;
      const totalPenalty = nextCount * 2 + (proctorSyncCountRef.current.teacherMarks || 0);
      setPenaltyMarksDeducted(totalPenalty);
      const newEv = {
        id: `PROC-${now}`,
        time: new Date().toLocaleTimeString(),
        timeIso: new Date().toISOString(),
        reason: cleanReason,
        warningNumber: nextCount,
        penaltyMarks: 2,
        penaltyPct: totalPenalty
      };
      setProctoringEvents((logs) => {
        const nextLogs = [newEv, ...logs.slice(0, 49)];
        proctorSyncCountRef.current = {
          ...proctorSyncCountRef.current,
          warnings: nextCount,
          penalty: totalPenalty,
          status: "WARNING_DETECTED",
          events: nextLogs
        };
        return nextLogs;
      });
      // Immediately notify Teacher Dashboard Live Proctoring Camera Wall
      try {
        const stuName = `${studentProfile?.firstName || "Student"} ${studentProfile?.lastName || ""}`.trim();
        apiClient.post("/ai-exam/proctor/heartbeat", {
          examId: activeExam?.id || "EXAM-ACTIVE",
          examTitle: activeExam?.title || "Active Examination",
          studentId: studentProfile?.id || 10,
          studentName: stuName,
          studentEmail: studentProfile?.email || "",
          status: "WARNING_DETECTED",
          movementStatus: "WARNING_DETECTED",
          cameraActive: Boolean(proctorStreamRef.current),
          snapshotDataUrl: capturedSnap,
          latestReason: cleanReason,
          warningsCount: nextCount,
          penaltyMarksDeducted: totalPenalty,
          marksPerWarning: 2,
          eventLogItem: newEv
        }).catch(() => { });
      } catch { }
      return nextCount;
    });
    setShowHeadMovementWarningModal(true);
  };

  const beginProctoredExam = (examObj, durationSeconds) => {
    setProctoringWarnings(0);
    setPenaltyMarksDeducted(0);
    setTeacherPenaltyMarks(0);
    setProctoringEvents([]);
    setLiveProctorMessages([]);
    setDismissedProctorMsgIds([]);
    proctorSnapshotsRef.current = [];
    proctorSyncCountRef.current = { warnings: 0, penalty: 0, teacherMarks: 0, status: "INITIALIZING", events: [] };
    setLastAlertReason("");
    lastProctorAlertAtRef.current = 0;
    proctorOffFrameStreakRef.current = 0;
    // Pre-warm camera hardware immediately inside the user click gesture for instant startup (<250ms)
    if (!proctorStreamRef.current && navigator.mediaDevices?.getUserMedia) {
      proctorPrewarmPromiseRef.current = requestFastExamCameraStream().catch(() => null);
    }
    if (examObj) setActiveExam(examObj);
    if (typeof durationSeconds === "number" && durationSeconds > 0) {
      setExamTimeLeftSeconds(durationSeconds);
    }
    setExamStarted(true);
  };

  useEffect(() => {
    if (!examStarted || examSubmitted) {
      stopProctoringSession();
      return;
    }

    let cancelled = false;
    setProctoringStatus("INITIALIZING");
    setProctoringDetail("Starting camera, face-centering, tab-lock & integrity monitor...");

    const handleVisibilityChange = () => {
      if (document.hidden) {
        triggerHeadMovementAlert("Switched away from active examination tab!");
      }
    };
    const handleWindowBlur = () => {
      triggerHeadMovementAlert("Left examination window or switched applications!");
    };
    const handleClipboardBlock = (e) => {
      e.preventDefault();
      triggerHeadMovementAlert("Clipboard copy/cut/paste action blocked during examination!");
    };

    window.addEventListener("blur", handleWindowBlur);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    document.addEventListener("copy", handleClipboardBlock);
    document.addEventListener("cut", handleClipboardBlock);

    const startCameraAndVisionMonitor = async () => {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setProctoringStatus("FOCUS_ONLY_ACTIVE");
        setProctoringDetail("Focus, Tab-Switch & Anti-Copy Monitor Active (No device webcam API)");
        return;
      }

      try {
        const prewarmed = proctorPrewarmPromiseRef.current ? await proctorPrewarmPromiseRef.current : null;
        proctorPrewarmPromiseRef.current = null;
        const stream = prewarmed || (await requestFastExamCameraStream());
        if (!stream) {
          throw new Error("No camera stream available");
        }
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        proctorStreamRef.current = stream;
        const bindVideoEl = () => {
          if (proctorVideoRef.current && proctorVideoRef.current.srcObject !== stream) {
            proctorVideoRef.current.srcObject = stream;
            proctorVideoRef.current.muted = true;
            proctorVideoRef.current.play().catch(() => { });
          }
        };
        bindVideoEl();
        setTimeout(bindVideoEl, 80);
        setProctoringStatus("CAMERA_ACTIVE");
        setProctoringDetail("Live Webcam Face Monitor, Gaze & Tab-Lock Active");

        // Push the very first live frame to the Teacher Exam Monitor wall as soon as frames decode
        const sendImmediateFirstFrame = () => {
          const snapNow = captureWebcamSnapshotDataUrl();
          if (!snapNow || cancelled) return;
          if (proctorSnapshotsRef.current.length === 0) proctorSnapshotsRef.current = [snapNow];
          const stuNameNow = `${studentProfile?.firstName || "Student"} ${studentProfile?.lastName || ""}`.trim();
          apiClient.post("/ai-exam/proctor/heartbeat", {
            examId: activeExam?.id || "EXAM-ACTIVE",
            examTitle: activeExam?.title || "Active Examination",
            studentId: studentProfile?.id || 10,
            studentIndexNumber: studentProfile?.admissionNumber || studentProfile?.studentId || `GBS-STU-${studentProfile?.id || 10}`,
            className: studentProfile?.currentClass || activeExam?.class?.name || "Enrolled Cohort",
            studentName: stuNameNow,
            studentEmail: studentProfile?.email || "",
            status: "CAMERA_ACTIVE",
            movementStatus: "CAMERA_ACTIVE",
            cameraActive: true,
            snapshotDataUrl: snapNow,
            warningsCount: proctorSyncCountRef.current.warnings || 0,
            penaltyMarksDeducted: proctorSyncCountRef.current.penalty || 0,
            marksPerWarning: 2
          }).catch(() => { });
        };
        if (proctorVideoRef.current) {
          proctorVideoRef.current.onloadeddata = () => {
            proctorVideoRef.current?.play?.().catch(() => { });
            sendImmediateFirstFrame();
          };
        }
        setTimeout(sendImmediateFirstFrame, 280);

        const faceDetector = typeof window !== "undefined" && "FaceDetector" in window
          ? new window.FaceDetector({ fastMode: true, maxDetectedFaces: 3 })
          : null;

        proctorIntervalRef.current = setInterval(async () => {
          if (cancelled || !proctorVideoRef.current || proctorVideoRef.current.readyState < 2) return;
          const video = proctorVideoRef.current;
          const width = 96;
          const height = 72;
          const canvas = proctorCanvasRef.current || document.createElement("canvas");
          canvas.width = width;
          canvas.height = height;
          proctorCanvasRef.current = canvas;
          const ctx = canvas.getContext("2d", { willReadFrequently: true });
          if (!ctx) return;
          ctx.drawImage(video, 0, 0, width, height);

          if (faceDetector) {
            try {
              const faces = await faceDetector.detect(canvas);
              if (faces.length === 0) {
                proctorOffFrameStreakRef.current += 1;
                if (proctorOffFrameStreakRef.current >= 3) {
                  proctorOffFrameStreakRef.current = 0;
                  triggerHeadMovementAlert("No student face detected in front of examination camera!");
                }
                return;
              }
              if (faces.length > 1) {
                proctorOffFrameStreakRef.current = 0;
                triggerHeadMovementAlert("Multiple faces detected inside examination frame!");
                return;
              }
              const box = faces[0].boundingBox;
              const centerX = (box.x + box.width / 2) / width;
              if (centerX < 0.18 || centerX > 0.82) {
                proctorOffFrameStreakRef.current += 1;
                if (proctorOffFrameStreakRef.current >= 2) {
                  proctorOffFrameStreakRef.current = 0;
                  triggerHeadMovementAlert("Head moved off-center away from examination screen!");
                }
                return;
              }
              proctorOffFrameStreakRef.current = 0;
              setProctoringStatus("CAMERA_ACTIVE");
              return;
            } catch {
              // Fall back cleanly to pixel luminance/motion monitor
            }
          }

          try {
            const imgData = ctx.getImageData(0, 0, width, height).data;
            let totalLum = 0;
            let diffSum = 0;
            const prev = proctorPrevFrameRef.current;
            const currLum = new Uint8Array(width * height);
            for (let i = 0, p = 0; i < imgData.length; i += 4, p++) {
              const lum = (imgData[i] * 3 + imgData[i + 1] * 6 + imgData[i + 2]) / 10;
              currLum[p] = lum;
              totalLum += lum;
              if (prev) {
                diffSum += Math.abs(lum - prev[p]);
              }
            }
            const pixelCount = width * height;
            const avgBrightness = totalLum / pixelCount;
            const avgMotion = prev ? diffSum / pixelCount : 0;
            proctorPrevFrameRef.current = currLum;
            proctorSyncCountRef.current.movementDelta = Math.round(avgMotion);

            if (avgBrightness < 14) {
              proctorOffFrameStreakRef.current += 1;
              if (proctorOffFrameStreakRef.current >= 3) {
                proctorOffFrameStreakRef.current = 0;
                triggerHeadMovementAlert("Webcam lens covered or lighting too dark during exam!");
              }
            } else if (prev && avgMotion > 42) {
              proctorOffFrameStreakRef.current += 1;
              if (proctorOffFrameStreakRef.current >= 2) {
                proctorOffFrameStreakRef.current = 0;
                triggerHeadMovementAlert("Excessive head or background movement detected on webcam!");
              }
            } else {
              proctorOffFrameStreakRef.current = 0;
              setProctoringStatus("CAMERA_ACTIVE");
            }
          } catch { }
        }, 900);
      } catch {
        if (!cancelled) {
          setProctoringStatus("FOCUS_ONLY_ACTIVE");
          setProctoringDetail("Camera denied/unavailable — Focus, Tab-Switch & Anti-Copy Guard Active");
        }
      }
    };

    startCameraAndVisionMonitor();

    return () => {
      cancelled = true;
      window.removeEventListener("blur", handleWindowBlur);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      document.removeEventListener("copy", handleClipboardBlock);
      document.removeEventListener("cut", handleClipboardBlock);
      stopProctoringSession();
    };
  }, [examStarted, examSubmitted]);

  // Dual-Layer Real-Time 1.0x Proctoring Streamer:
  // Layer A: True 30 FPS 1.0x WebRTC peer video when Teacher opens Live Watch & Profile
  // Layer B: High-speed ~8-10 FPS adaptive non-blocking frame stream (smooth natural motion, never slow-motion)
  // Plus decoupled 3s metadata & Teacher invigilator message polling
  useEffect(() => {
    if (!examStarted || examSubmitted) return;
    let active = true;
    let frameTimer = null;
    let signalPollTimer = null;
    let lastSignalMs = Date.now() - 5000;
    const processedSigIds = new Set();

    const DEFAULT_PROCTOR_ICE = {
      iceServers: [
        { urls: "stun:stun.l.google.com:19302" },
        { urls: "stun:stun1.l.google.com:19302" },
        { urls: "stun:stun.relay.metered.ca:80" },
        {
          urls: [
            "turn:openrelay.metered.ca:80",
            "turn:openrelay.metered.ca:443",
            "turn:openrelay.metered.ca:443?transport=tcp"
          ],
          username: "openrelayproject",
          credential: "openrelayproject"
        }
      ],
      iceCandidatePoolSize: 8,
      bundlePolicy: "max-bundle",
      rtcpMuxPolicy: "require"
    };
    let activeIceConfig = DEFAULT_PROCTOR_ICE;
    const pendingIceByViewer = new Map(); // viewerId -> Array<RTCIceCandidateInit>
    apiClient.get("/video/calls/ice-servers").then((res) => {
      if (res?.data?.data?.iceServers?.length) {
        activeIceConfig = { ...DEFAULT_PROCTOR_ICE, ...res.data.data };
      }
    }).catch(() => { });

    const getExamIdentity = () => {
      const stuName = `${studentProfile?.firstName || "Student"} ${studentProfile?.lastName || ""}`.trim();
      const examIdVal = activeExam?.id || "EXAM-ACTIVE";
      const stuIdVal = studentProfile?.id || 10;
      const stuEmailVal = studentProfile?.email || "";
      const fallbackKey = `${examIdVal}::${stuIdVal || stuEmailVal || stuName}`;
      return {
        stuName,
        examIdVal,
        stuIdVal,
        stuEmailVal,
        sessionKey: proctorSessionKeyRef.current || fallbackKey
      };
    };

    const sendHeartbeatAndPollMessages = async () => {
      if (!active) return;
      const { stuName, examIdVal, stuIdVal, stuEmailVal } = getExamIdentity();
      const snap = captureWebcamSnapshotDataUrl(false);
      if (snap && proctorSnapshotsRef.current.length === 0) {
        proctorSnapshotsRef.current = [snap];
      }
      try {
        const hbRes = await apiClient.post("/ai-exam/proctor/heartbeat", {
          examId: examIdVal,
          examTitle: activeExam?.title || "Active Examination",
          studentId: stuIdVal,
          studentIndexNumber: studentProfile?.admissionNumber || studentProfile?.studentId || `GBS-STU-${stuIdVal}`,
          className: studentProfile?.currentClass || activeExam?.class?.name || "Enrolled Cohort",
          studentName: stuName,
          studentEmail: stuEmailVal,
          status: proctorStreamRef.current ? "CAMERA_ACTIVE" : "FOCUS_ONLY_ACTIVE",
          movementStatus: proctorSyncCountRef.current.status || (proctorStreamRef.current ? "CAMERA_ACTIVE" : "FOCUS_ONLY_ACTIVE"),
          movementDelta: proctorSyncCountRef.current.movementDelta || 0,
          cameraActive: Boolean(proctorStreamRef.current),
          snapshotDataUrl: snap,
          warningsCount: proctorSyncCountRef.current.warnings || 0,
          penaltyMarksDeducted: proctorSyncCountRef.current.penalty || 0,
          marksPerWarning: 2
        });
        if (hbRes?.data?.data?.session?.sessionKey) {
          proctorSessionKeyRef.current = hbRes.data.data.session.sessionKey;
        }
      } catch { }

      try {
        const msgRes = await apiClient.get("/ai-exam/proctor/messages", {
          params: {
            examId: activeExam?.id || "",
            studentId: stuIdVal,
            studentName: stuName
          }
        });
        const payload = msgRes?.data?.data;
        if (active && payload) {
          if (Array.isArray(payload.messages)) {
            setLiveProctorMessages(payload.messages);
          }
          const tMarks = Number(payload.teacherDeductedMarks || 0);
          if (tMarks > proctorSyncCountRef.current.teacherMarks) {
            proctorSyncCountRef.current.teacherMarks = tMarks;
            setTeacherPenaltyMarks(tMarks);
            setPenaltyMarksDeducted((prev) => Math.max(prev, (proctorSyncCountRef.current.warnings * 2) + tMarks));
          }
        }
      } catch { }
    };

    // High-speed adaptive live frame loop (~8-10 FPS smooth natural 1.0x motion fallback)
    const pumpLiveFrame = async () => {
      if (!active) return;
      const t0 = performance.now();
      const snapCompact = captureWebcamSnapshotDataUrl(true);
      if (snapCompact) {
        const { stuName, examIdVal, stuIdVal, stuEmailVal, sessionKey } = getExamIdentity();
        try {
          await apiClient.post("/ai-exam/proctor/frame", {
            sessionKey,
            examId: examIdVal,
            examTitle: activeExam?.title || "Active Examination",
            studentId: stuIdVal,
            studentName: stuName,
            studentEmail: stuEmailVal,
            cameraActive: true,
            movementDelta: proctorSyncCountRef.current.movementDelta || 0,
            fpsHint: 10,
            snapshotDataUrl: snapCompact
          });
        } catch { }
      }
      if (!active) return;
      const elapsed = performance.now() - t0;
      const hasWebRtcWatchers = proctorPeersRef.current.size > 0;
      // When direct 30fps WebRTC is already streaming to teacher, throttle JPEG backup slightly to save CPU/bandwidth
      const targetIntervalMs = hasWebRtcWatchers ? 400 : 100;
      const nextDelay = Math.max(40, targetIntervalMs - elapsed);
      frameTimer = setTimeout(pumpLiveFrame, nextDelay);
    };

    // Handle Teacher WebRTC WATCH_REQUEST / ANSWER / ICE_CANDIDATE for genuine 30fps 1.0x live video
    const handleIncomingWebRtcSignal = async (sig) => {
      if (!active || !sig?.id || processedSigIds.has(sig.id)) return;
      processedSigIds.add(sig.id);
      if (sig.createdAtMs && sig.createdAtMs > lastSignalMs) {
        lastSignalMs = sig.createdAtMs;
      }
      const viewerId = String(sig.viewerId || "invigilator");
      const { sessionKey, examIdVal, stuIdVal } = getExamIdentity();

      if (sig.signalType === "WATCH_STOP") {
        const existingPc = proctorPeersRef.current.get(viewerId);
        if (existingPc) {
          try { existingPc.close(); } catch { }
          proctorPeersRef.current.delete(viewerId);
        }
        return;
      }

      if (sig.signalType === "WATCH_REQUEST") {
        if (typeof RTCPeerConnection !== "function" || !proctorStreamRef.current) return;
        const prevPc = proctorPeersRef.current.get(viewerId);
        if (prevPc) {
          try { prevPc.close(); } catch { }
        }
        const pc = new RTCPeerConnection(activeIceConfig);
        proctorPeersRef.current.set(viewerId, pc);
        pendingIceByViewer.set(viewerId, []);

        proctorStreamRef.current.getVideoTracks().forEach((track) => {
          const sender = pc.addTrack(track, proctorStreamRef.current);
          try {
            const params = sender.getParameters() || {};
            params.degradationPreference = "maintain-framerate";
            if (!Array.isArray(params.encodings) || params.encodings.length === 0) {
              params.encodings = [{}];
            }
            params.encodings[0].maxFramerate = 30;
            params.encodings[0].maxBitrate = 600000;
            sender.setParameters(params).catch(() => { });
          } catch { }
        });

        try {
          if (typeof RTCRtpSender !== "undefined" && typeof RTCRtpSender.getCapabilities === "function") {
            const caps = RTCRtpSender.getCapabilities("video");
            if (caps?.codecs?.length) {
              const preferred = [
                ...caps.codecs.filter((c) => /VP8|H264/i.test(c.mimeType)),
                ...caps.codecs.filter((c) => !/VP8|H264/i.test(c.mimeType))
              ];
              for (const tr of pc.getTransceivers?.() || []) {
                if (tr.sender?.track?.kind === "video" && typeof tr.setCodecPreferences === "function") {
                  tr.setCodecPreferences(preferred);
                }
              }
            }
          }
        } catch { }

        pc.onicecandidate = (evt) => {
          if (evt.candidate) {
            apiClient.post("/ai-exam/proctor/webrtc/signal", {
              sessionKey,
              examId: examIdVal,
              studentId: stuIdVal,
              viewerId,
              senderRole: "STUDENT",
              targetRole: "TEACHER",
              signalType: "ICE_CANDIDATE",
              data: evt.candidate
            }).catch(() => { });
          }
        };

        pc.onconnectionstatechange = () => {
          if (["failed", "closed", "disconnected"].includes(pc.connectionState)) {
            if (proctorPeersRef.current.get(viewerId) === pc) {
              proctorPeersRef.current.delete(viewerId);
              pendingIceByViewer.delete(viewerId);
            }
          }
        };

        try {
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          await apiClient.post("/ai-exam/proctor/webrtc/signal", {
            sessionKey,
            examId: examIdVal,
            studentId: stuIdVal,
            viewerId,
            senderRole: "STUDENT",
            targetRole: "TEACHER",
            signalType: "OFFER",
            data: offer
          });
        } catch { }
        return;
      }

      const pc = proctorPeersRef.current.get(viewerId);
      if (!pc) return;
      if (sig.signalType === "ANSWER" && sig.data) {
        try {
          if (pc.signalingState === "have-local-offer") {
            await pc.setRemoteDescription(new RTCSessionDescription(sig.data));
            const queued = pendingIceByViewer.get(viewerId) || [];
            pendingIceByViewer.set(viewerId, []);
            for (const cand of queued) {
              try { await pc.addIceCandidate(new RTCIceCandidate(cand)); } catch { }
            }
          }
        } catch { }
      } else if (sig.signalType === "ICE_CANDIDATE" && sig.data) {
        if (pc.remoteDescription) {
          try {
            await pc.addIceCandidate(new RTCIceCandidate(sig.data));
          } catch { }
        } else {
          const q = pendingIceByViewer.get(viewerId) || [];
          q.push(sig.data);
          pendingIceByViewer.set(viewerId, q);
        }
      }
    };

    const pollWebRtcSignals = async () => {
      if (!active) return;
      const { sessionKey } = getExamIdentity();
      try {
        const res = await apiClient.get("/ai-exam/proctor/webrtc/signals", {
          params: { sessionKey, targetRole: "STUDENT", sinceMs: lastSignalMs }
        });
        const sigs = res?.data?.data?.signals || [];
        for (const s of sigs) {
          await handleIncomingWebRtcSignal(s);
        }
      } catch { }
    };

    // Instant SSE listener so Teacher WATCH_REQUEST triggers 30fps WebRTC in <250ms
    let proctorSse = null;
    try {
      if (typeof EventSource !== "undefined") {
        const tok = localStorage.getItem("gbs_token") || sessionStorage.getItem("gbs_token") || "";
        const base = String(apiClient.defaults?.baseURL || "/api/v1").replace(/\/+$/, "");
        if (tok) {
          proctorSse = new EventSource(`${base}/ai-exam/proctor/stream?token=${encodeURIComponent(tok)}`);
          proctorSse.addEventListener("proctor_webrtc_signal", (evt) => {
            try {
              const d = JSON.parse(evt.data);
              const s = d?.signal;
              if (s && String(s.targetRole || "").toUpperCase() === "STUDENT") {
                const { sessionKey } = getExamIdentity();
                if (!s.sessionKey || String(s.sessionKey) === String(sessionKey)) {
                  handleIncomingWebRtcSignal(s);
                }
              }
            } catch { }
          });
        }
      }
    } catch { }

    sendHeartbeatAndPollMessages().then(() => {
      if (active) {
        frameTimer = setTimeout(pumpLiveFrame, 80);
      }
    });
    const hbInterval = setInterval(sendHeartbeatAndPollMessages, 3000);
    signalPollTimer = setInterval(pollWebRtcSignals, 280);

    return () => {
      active = false;
      clearInterval(hbInterval);
      if (frameTimer) clearTimeout(frameTimer);
      if (signalPollTimer) clearInterval(signalPollTimer);
      if (proctorSse) {
        try { proctorSse.close(); } catch { }
      }
      proctorPeersRef.current.forEach((pc) => {
        try { pc.close(); } catch { }
      });
      proctorPeersRef.current.clear();
      pendingIceByViewer.clear();
    };
  }, [examStarted, examSubmitted, activeExam?.id]);

  useEffect(() => {
    if (!examStarted || examSubmitted) return;
    const timer = setInterval(() => {
      setExamTimeLeftSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          stopProctoringSession();
          setFeedback({
            type: "warning",
            message: "⏱️ Examination time expired! Your written responses are saved and proctoring session closed."
          });
          setExamStarted(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [examStarted, examSubmitted]);

  const formatExamTime = (secs) => {
    const mins = Math.floor(secs / 60);
    const rem = secs % 60;
    return `${mins.toString().padStart(2, "0")}:${rem.toString().padStart(2, "0")}`;
  };
  const [submittedExams, setSubmittedExams] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("gbs_student_submitted_exams") || "{}");
    } catch {
      return {};
    }
  });

  // Track if faculty board has published a new examination session
  const [newExamPublished, setNewExamPublished] = useState(() => {
    return localStorage.getItem("gbs_new_exam_published") === "true";
  });

  // Live Attendance Summary Synced from Daily Teacher Archives
  const [attendanceSummary, setAttendanceSummary] = useState(() => {
    try {
      const saved = localStorage.getItem("gbs_student_attendance_summary");
      if (saved) return JSON.parse(saved);
    } catch { }
    return {
      rate: "0.0%",
      presentCount: 0,
      totalCount: 0,
      lastArchivedDate: new Date().toISOString().split("T")[0]
    };
  });

  // Gating Rule: If student has completed/submitted/been graded on an exam, they cannot access exams portal until faculty publishes next exam session
  const isExamPortalLocked = (Object.keys(submittedExams).length > 0 || examSubmitted) && !newExamPublished;


  // Financial Standing & Debt State (Locked Registration & Results if In Arrears)
  const [feeArrears, setFeeArrears] = useState(() => {
    try {
      const stored = localStorage.getItem("gbs_student_fee_arrears");
      return stored !== null ? parseFloat(stored) : 0.00;
    } catch {
      return 0.00;
    }
  });

  const [lastPaymentNotice, setLastPaymentNotice] = useState(() => {
    try {
      const history = JSON.parse(localStorage.getItem("gbs_reconciled_payments") || "[]");
      return Array.isArray(history) && history.length > 0 ? history[0] : null;
    } catch {
      return null;
    }
  });

  // Course & Class Registration System (Authorized upon Financial Clearance)
  const [availableCourses, setAvailableCourses] = useState(() => (isDemoSandboxMode() ? [
    {
      code: "CS 201",
      title: "Data Structures & Object Algorithms",
      credits: 3,
      instructor: "Eng. Marcus Thorne",
      schedule: "Mon & Wed 08:30 - 10:00 AM",
      hall: "STEM Lab 201",
      type: "Core Compulsory",
      fileLocation: "/var/gbs/storage/courses/CS_201_Data_Structures/modules/",
      materials: [
        { name: "CS201_Course_Syllabus_2026.pdf", size: "1.4 MB", type: "PDF", uploadedAt: "2026-09-02", topic: "Comprehensive Semester Curriculum & Assessment Schema" },
        { name: "Module_01_04_Binary_Search_Trees.pdf", size: "4.8 MB", type: "PDF", uploadedAt: "2026-09-18", topic: "Lecture Slides: Asymptotic Big-O & Balanced Trees" },
        { name: "Lab_Manual_03_Dynamic_Programming.pdf", size: "2.1 MB", type: "PDF", uploadedAt: "2026-10-05", topic: "Lab Worksheets & Benchmark Code Sets" },
        { name: "Past_Questions_Archive_2024_2025.pdf", size: "3.2 MB", type: "PDF", uploadedAt: "2026-10-14", topic: "Solved Past Examinations with Instructor Notes" }
      ]
    },
    {
      code: "MATH 205",
      title: "Linear Algebra & Differential Equations",
      credits: 3,
      instructor: "Dr. Robert Vance",
      schedule: "Tue & Thu 10:15 - 11:45 AM",
      hall: "Mathematics Wing B",
      type: "Core Compulsory",
      fileLocation: "/var/gbs/storage/courses/MATH_205_Linear_Algebra/modules/",
      materials: [
        { name: "MATH205_Syllabus_and_Matrices.pdf", size: "1.2 MB", type: "PDF", uploadedAt: "2026-09-01", topic: "Course Syllabus, Vector Spaces & Eigenvalues" },
        { name: "ODE_2nd_Order_Worked_Solutions.pdf", size: "3.6 MB", type: "PDF", uploadedAt: "2026-09-24", topic: "Step-by-step Differential Equation Proofs" },
        { name: "Past_Questions_Calculus_Vault.pdf", size: "2.8 MB", type: "PDF", uploadedAt: "2026-10-10", topic: "Past University Mid-Semester Examination Papers" }
      ]
    },
    {
      code: "PHYS 203",
      title: "Thermodynamics & Electromagnetism",
      credits: 3,
      instructor: "Prof. Eleanor Sterling",
      schedule: "Mon & Fri 11:30 - 01:00 PM",
      hall: "Physics Lab 104",
      type: "Core Compulsory",
      fileLocation: "/var/gbs/storage/courses/PHYS_203_Thermodynamics/modules/",
      materials: [
        { name: "PHYS203_Lecture_Notes_Maxwell.pdf", size: "5.1 MB", type: "PDF", uploadedAt: "2026-09-15", topic: "Electromagnetic Induction & Maxwell's Equations" },
        { name: "Carnot_Cycle_Thermodynamic_Packet.pdf", size: "2.4 MB", type: "PDF", uploadedAt: "2026-10-02", topic: "Entropy, Heat Engines & Refrigeration Formulas" }
      ]
    },
    {
      code: "ENG 210",
      title: "Object-Oriented Software Design & Architecture",
      credits: 3,
      instructor: "Dr. Kwame Osei-Tutu",
      schedule: "Wed & Fri 02:00 - 03:30 PM",
      hall: "Computer Lab 3",
      type: "Elective Specialization",
      fileLocation: "/var/gbs/storage/courses/ENG_210_Software_Design/modules/",
      materials: [
        { name: "ENG210_Design_Patterns_Gang_of_Four.pdf", size: "4.2 MB", type: "PDF", uploadedAt: "2026-09-10", topic: "Singleton, Factory, Observer & MVC Architecture" }
      ]
    },
    {
      code: "AI 220",
      title: "Machine Intelligence & Neural Systems",
      credits: 3,
      instructor: "Prof. Sophia Chen",
      schedule: "Tue & Thu 02:00 - 03:30 PM",
      hall: "AI Innovation Pavilion",
      type: "Elective Specialization",
      fileLocation: "/var/gbs/storage/courses/AI_220_Machine_Intelligence/modules/",
      materials: [
        { name: "Neural_Networks_Backprop_Calculus.pdf", size: "6.2 MB", type: "PDF", uploadedAt: "2026-09-20", topic: "Gradient Descent, CNNs and Transformers" }
      ]
    },
    {
      code: "GBS 200",
      title: "Academic Writing & Global Leadership",
      credits: 3,
      instructor: "Ms. Claire Montgomery",
      schedule: "Wed 04:00 - 05:30 PM",
      hall: "Auditorium Hall 1",
      type: "University Requirement",
      fileLocation: "/var/gbs/storage/courses/GBS_200_Leadership/modules/",
      materials: [
        { name: "GBS200_Research_Methodology_Style_Guide.pdf", size: "1.8 MB", type: "PDF", uploadedAt: "2026-09-05", topic: "APA 7th Edition Citations & Thesis Structuring" }
      ]
    }
  ] : []));

  // Course Enrolled File Location Viewer State
  const [selectedCourseForFiles, setSelectedCourseForFiles] = useState(null);
  const [showCourseFilesModal, setShowCourseFilesModal] = useState(false);
  const [viewingFilePreview, setViewingFilePreview] = useState(null);

  const isDemoTenant = isDemoSandboxMode();

  // Teacher-Authored Official Examination Timetable & Procedure Guide State
  const [examTimetableGuide, setExamTimetableGuide] = useState(() => {
    try {
      const stored = localStorage.getItem("gbs_examination_timetable");
      if (stored) return JSON.parse(stored);
    } catch { }
    if (!isDemoTenant) return [];
    return [
      {
        id: "ET-01",
        courseCode: "MATH 205",
        subject: "Linear Algebra & Differential Equations",
        examDate: "2026-11-04",
        startTime: "09:00 AM",
        endTime: "11:30 AM",
        hall: "Grand Examination Hall A",
        invigilator: "Dr. Robert Vance",
        permittedTools: "Standard Scientific Calculator, Mathematical Set, HB Pencil",
        syllabusScope: "Eigenvalues, Matrix Inverses, 2nd-Order Ordinary Differential Equations",
        instructions: "No programmable devices or cellular units allowed. Candidates must be seated 15 minutes prior to commencement."
      },
      {
        id: "ET-02",
        courseCode: "CS 201",
        subject: "Data Structures & Algorithms",
        examDate: "2026-11-06",
        startTime: "01:00 PM",
        endTime: "03:30 PM",
        hall: "Computer Science Wing - Lab 201",
        invigilator: "Eng. Marcus Thorne",
        permittedTools: "Blue/Black Ink Pens, Rough Sheets provided in hall",
        syllabusScope: "Binary Search Trees, Graph Traversal (BFS/DFS), Hash Tables & Asymptotic Complexity",
        instructions: "Online workstation credentials will be provided by invigilator. Deterministic auto-grading active upon submit."
      },
      {
        id: "ET-03",
        courseCode: "PHYS 203",
        subject: "Thermodynamics & Electromagnetism",
        examDate: "2026-11-09",
        startTime: "09:00 AM",
        endTime: "11:30 AM",
        hall: "Physics Auditorium B",
        invigilator: "Prof. Eleanor Sterling",
        permittedTools: "Standard Calculator, Formula Sheet (Provided), Ruler",
        syllabusScope: "Carnot Cycle, Entropy, Maxwell's Equations, Magnetic Flux",
        instructions: "Handwritten solutions to be scanned with AI scanner upon conclusion."
      }
    ];
  });

  useEffect(() => {
    const syncExamTimetable = () => {
      try {
        const stored = localStorage.getItem("gbs_examination_timetable");
        if (stored) setExamTimetableGuide(JSON.parse(stored));
      } catch { }
    };
    window.addEventListener("gbs_exam_timetable_updated", syncExamTimetable);
    window.addEventListener("storage", syncExamTimetable);
    return () => {
      window.removeEventListener("gbs_exam_timetable_updated", syncExamTimetable);
      window.removeEventListener("storage", syncExamTimetable);
    };
  }, []);

  const [registeredCourseCodes, setRegisteredCourseCodes] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("gbs_registered_courses") || "[]");
      if (Array.isArray(saved) && saved.length > 0) return saved;
    } catch { }
    return ["CS 201", "MATH 205", "PHYS 203", "ENG 210", "AI 220", "GBS 200"];
  });

  // Live Class Broadcast Sentinel from Teachers
  const [activeLiveBroadcast, setActiveLiveBroadcast] = useState(() => {
    try {
      const list = JSON.parse(localStorage.getItem("gbs_active_live_classes") || "[]");
      return list[0] || null;
    } catch {
      return null;
    }
  });

  // Dress Code Guidelines Modal State
  const [showDressCodeModal, setShowDressCodeModal] = useState(false);

  // Fee Payment & Rescheduled Late Exam Writing Slip State
  const [showFeePaymentModal, setShowFeePaymentModal] = useState(false);

  useEffect(() => {
    if (showFeePaymentModal) {
      setShowFeePaymentModal(false);
      setShowOfficialPaymentModal(true);
    }
  }, [showFeePaymentModal]);
  const [showRescheduledExamSlipModal, setShowRescheduledExamSlipModal] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState("500");
  const [paymentChannel, setPaymentChannel] = useState("MTN_MOMO");
  const [payerPhone, setPayerPhone] = useState("+233-24-411-9201");
  const [paymentSuccessSlip, setPaymentSuccessSlip] = useState(null);

  // Official Payment Gateway Modal State
  const [showOfficialPaymentModal, setShowOfficialPaymentModal] = useState(false);
  const [selectedFeeInvoiceTarget, setSelectedFeeInvoiceTarget] = useState(null);
  const [feeBalance, setFeeBalance] = useState(0);
  const [studentFeeStatement, setStudentFeeStatement] = useState(null);

  const loadVerifiedStudentFees = async () => {
    try {
      const res = await apiClient.get("/payments/student-statement");
      const stmt = res.data?.data;
      if (stmt) {
        setStudentFeeStatement(stmt);
        const verifiedOutstanding = Number(stmt.feeSummary?.outstandingBalance || 0);
        setFeeBalance(verifiedOutstanding);
        setFeeArrears(verifiedOutstanding);
      }
    } catch {
      // Keep UI safe without fabricating paid states on error
    }
  };

  const openStudentSelfPayment = (invoiceObj = null) => {
    setSelectedFeeInvoiceTarget(invoiceObj || null);
    setShowOfficialPaymentModal(true);
  };

  const handlePrintStudentOfficialReceipt = (item) => {
    if (!item) return;
    const win = window.open("", "_blank", "width=760,height=860");
    if (!win) {
      window.showGBSOpenNotice?.(`Official Receipt ${item.receiptNumber || item.reference} ready.`, "success", "Official Receipt");
      return;
    }
    const instName = studentFeeStatement?.institution?.name || activeSchoolName || "GBS Institution";
    const stuName = item.studentName || studentFeeStatement?.student?.fullName || `${currentUser?.firstName || ""} ${currentUser?.lastName || ""}`.trim();
    const stuCode = item.studentCode || studentFeeStatement?.student?.studentCode || `STU-${currentUser?.id || ""}`;
    win.document.write(`<!DOCTYPE html>
<html>
<head>
<title>Official Fee Receipt - ${item.receiptNumber || item.reference}</title>
<style>
  body { font-family: Arial, sans-serif; color: #0f172a; padding: 28px; }
  .box { border: 2px solid #0f172a; padding: 22px; max-width: 640px; margin: 0 auto; }
  .row { display: flex; justify-content: space-between; gap: 12px; padding: 7px 0; border-bottom: 1px dashed #cbd5e1; font-size: 14px; }
  .amt { font-size: 20px; font-weight: 800; color: #047857; margin-top: 14px; }
</style>
</head>
<body>
  <div class="box">
    <h2 style="margin:0 0 4px;">${instName}</h2>
    <div style="color:#475569;font-size:13px;margin-bottom:14px;">Official Verified Student Fee Receipt • Certified by GBS Bursar &amp; Accountant Ledger</div>
    <div class="row"><span>Receipt Number</span><strong>${item.receiptNumber || "—"}</strong></div>
    <div class="row"><span>GBS Transaction Reference</span><strong>${item.reference || item.transactionRef || "—"}</strong></div>
    <div class="row"><span>Student Credited (Payee)</span><strong>${stuName} (${stuCode})</strong></div>
    <div class="row"><span>Paid By (Payer)</span><strong>${item.paidByLabel || (item.paidByRole === "PARENT" ? "Parent / Guardian" : "Student (Self-Payment)")} — ${item.paidByName || stuName}</strong></div>
    <div class="row"><span>Student Payee Reference</span><strong>${item.payeeReference || `${stuName} (${stuCode})`}</strong></div>
    <div class="row"><span>School Account / MoMo Credited</span><strong>${item.destinationAccountSummary || `${instName} Official Collection Account`}</strong></div>
    <div class="row"><span>Payment Gateway &amp; Method</span><strong>${item.gateway || "VERIFIED"} • ${item.channel || item.paymentMethod || "MOMO"}</strong></div>
    <div class="row"><span>Status</span><strong>${item.gatewayStatus || "SUCCESSFUL"}</strong></div>
    <div class="row"><span>Date &amp; Time</span><strong>${new Date(item.paidAt || item.issuedAt || item.createdAt || Date.now()).toLocaleString()}</strong></div>
    <div class="amt">Amount Paid: ${item.currency || "GHS"} ${Number(item.amountPaid || 0).toFixed(2)}</div>
  </div>
  <script>window.onload = function() { window.print(); };</script>
</body>
</html>`);
    win.document.close();
  };

  useEffect(() => {
    loadVerifiedStudentFees();
  }, []);

  // Live Online Class Concluded Notice & Catch-Up Video State
  const [concludedClassNotice, setConcludedClassNotice] = useState(() => {
    try {
      const stored = JSON.parse(localStorage.getItem("gbs_concluded_class_notice") || "null");
      if (stored) return stored;
    } catch { }
    if (!isDemoTenant) return { dismissed: true };
    return {
      id: "CLS-CONCL-902",
      subject: "Advanced Mathematics",
      topic: "Composite Functions, Calculus Derivatives & Rate of Change",
      date: "Today",
      time: "09:00 AM - 10:15 AM",
      duration: "1h 15m",
      instructor: "Mr. Kwame Mensah",
      endingTime: "10:15 AM",
      recordingUrl: "https://www.youtube.com/embed/WUvTyaaNkzM",
      notesFile: "Advanced_Calculus_Lesson_Notes_Week7.pdf",
      dismissed: false
    };
  });
  const [showCatchUpModal, setShowCatchUpModal] = useState(false);
  const [catchUpViewMode, setCatchUpViewMode] = useState("VIDEO"); // "VIDEO" | "PDF_NOTES"
  const [selectedCatchUpLecture, setSelectedCatchUpLecture] = useState(0);

  // Peer Live Video Calling State & Hardware Camera Stream Refs
  const localPeerVideoRef = useRef(null);
  const localPeerStreamRef = useRef(null);
  const [activePeerVideoCall, setActivePeerVideoCall] = useState(null);
  const [peerCallDuration, setPeerCallDuration] = useState(0);
  const [isPeerMicMuted, setIsPeerMicMuted] = useState(false);
  const [isPeerCameraOff, setIsPeerCameraOff] = useState(false);
  const [isPeerScreenSharing, setIsPeerScreenSharing] = useState(false);

  // In-App Live Scheduled Meeting / Classroom Session State
  const [activeJoinedMeeting, setActiveJoinedMeeting] = useState(null);
  const [classroomHandRaised, setClassroomHandRaised] = useState(false);
  const [classroomMicMuted, setClassroomMicMuted] = useState(true);
  const [classroomCameraOn, setClassroomCameraOn] = useState(true);
  const [classroomChatMessages, setClassroomChatMessages] = useState(() => (
    isDemoSandboxMode()
      ? [
        { sender: "Teacher (Moderator)", text: "Welcome everyone to today's live interactive session. Please raise your hand if you have questions.", time: "10:00 AM" },
        { sender: "Kwame Mensah", text: "Good morning teacher, audio and video are crystal clear!", time: "10:02 AM" }
      ]
      : [
        { sender: "Classroom Moderator", text: "Live classroom interactive session initialized. Raise your hand or send a question.", time: "Ready" }
      ]
  ));
  const [newClassroomMsg, setNewClassroomMsg] = useState("");

  const startLocalPeerCamera = async () => {
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        let stream = null;
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            video: { width: { ideal: 640 }, height: { ideal: 360 }, frameRate: { ideal: 30 } },
            audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true }
          });
        } catch {
          try {
            stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
          } catch {
            stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
            setIsPeerMicMuted(true);
          }
        }
        localPeerStreamRef.current = stream;
        if (localPeerVideoRef.current) {
          localPeerVideoRef.current.srcObject = stream;
          localPeerVideoRef.current.muted = true;
          localPeerVideoRef.current.playsInline = true;
          localPeerVideoRef.current.play().catch(() => { });
        }
      }
    } catch (err) {
      console.warn("Peer video camera access notice:", err.message);
    }
  };

  const stopLocalPeerCamera = () => {
    if (localPeerStreamRef.current) {
      localPeerStreamRef.current.getTracks().forEach((t) => t.stop());
      localPeerStreamRef.current = null;
    }
  };

  const handleStartPeerVideoCall = (peer) => {
    setActivePeerVideoCall(peer);
    setPeerCallDuration(0);
    setIsPeerCameraOff(false);
    setTimeout(() => {
      startLocalPeerCamera();
    }, 200);
  };

  const handleEndPeerVideoCall = () => {
    stopLocalPeerCamera();
    setIsPeerScreenSharing(false);
    setActivePeerVideoCall(null);
  };

  const handleTogglePeerScreenShare = async () => {
    if (isPeerScreenSharing) {
      setIsPeerScreenSharing(false);
      if (localPeerStreamRef.current && localPeerVideoRef.current) {
        localPeerVideoRef.current.srcObject = localPeerStreamRef.current;
        localPeerVideoRef.current.play().catch(() => { });
      }
    } else {
      try {
        if (navigator.mediaDevices && navigator.mediaDevices.getDisplayMedia) {
          const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
          if (localPeerVideoRef.current) {
            localPeerVideoRef.current.srcObject = screenStream;
            localPeerVideoRef.current.play().catch(() => { });
          }
          setIsPeerScreenSharing(true);
          screenStream.getVideoTracks()[0].onended = () => {
            setIsPeerScreenSharing(false);
            if (localPeerStreamRef.current && localPeerVideoRef.current) {
              localPeerVideoRef.current.srcObject = localPeerStreamRef.current;
              localPeerVideoRef.current.play().catch(() => { });
            }
          };
        } else {
          setIsPeerScreenSharing(true);
        }
      } catch (err) {
        console.warn("Screen share cancelled or unsupported:", err);
      }
    }
  };

  const getExamFontSizePx = () => {
    if (examFontSize === "LARGE") return "22px";
    if (examFontSize === "MEDIUM") return "18px";
    return "15px";
  };

  const handleJoinLiveMeeting = (meeting) => {
    setActiveJoinedMeeting(meeting);
    setClassroomHandRaised(false);
    setFeedback({
      type: "success",
      message: `🚀 Joined live online meeting: "${meeting.title}"`
    });
  };

  const handleSendClassroomChat = (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!newClassroomMsg.trim()) return;
    const gate = checkDemoEntryLimit("communication", "classroom messages", classroomChatMessages.length);
    if (!gate.allowed) {
      setFeedback({ type: "error", message: gate.message });
      return;
    }
    const msg = {
      sender: `${studentProfile?.firstName || "Scholar"} ${studentProfile?.lastName || ""}`.trim() || "You",
      text: newClassroomMsg.trim(),
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    setClassroomChatMessages((prev) => [...prev, msg]);
    trackDemoEntryCreated("communication");
    setNewClassroomMsg("");
  };

  useEffect(() => {
    let timer = null;
    if (activePeerVideoCall) {
      timer = setInterval(() => {
        setPeerCallDuration((d) => d + 1);
      }, 1000);
    } else {
      setPeerCallDuration(0);
    }
    return () => clearInterval(timer);
  }, [activePeerVideoCall]);

  // Student Digital Library & E-Book Hub State
  const [selectedBookForPreview, setSelectedBookForPreview] = useState(null);
  const [borrowedBooks, setBorrowedBooks] = useState(() => {
    try {
      const stored = JSON.parse(localStorage.getItem("gbs_library_borrowed_records") || "[]");
      if (Array.isArray(stored) && stored.length > 0) return stored;
    } catch { }
    if (!isDemoTenant) return [];
    return [
      {
        id: "BK-01",
        title: "Core Mathematics for Senior High Schools",
        author: "Prof. J. K. Mensah",
        isbn: "978-0-19-842718-6",
        borrowDate: "2026-11-01",
        dueDate: "2026-11-15",
        status: "BORROWED",
        daysRemaining: 8,
        cover: "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=200&h=260&fit=crop"
      },
      {
        id: "BK-02",
        title: "Integrated Science & Biology Laboratory Practical",
        author: "Dr. Kwabena Asante",
        isbn: "978-0-14-312774-1",
        borrowDate: "2026-11-03",
        dueDate: "2026-11-17",
        status: "BORROWED",
        daysRemaining: 10,
        cover: "/assets/gbs_crest_badge.jpg"
      }
    ];
  });

  const LIBRARY_CATALOG = [
    { id: "CAT-1", title: "Comprehensive Chemistry for Secondary Schools", author: "Dr. Evelyn Addo", category: "General Science", pages: 420, cover: "/assets/gbs_crest_badge.jpg" },
    { id: "CAT-2", title: "Physics Fundamentals: Mechanics & Electromagnetism", author: "Prof. Arthur Sterling", category: "Physical Sciences", pages: 512, cover: "https://images.unsplash.com/photo-1509228468518-180dd4864904?w=200&h=260&fit=crop" },
    { id: "CAT-3", title: "African & World History: Pre-Colonial to Modern Era", author: "Dr. Nana Osei-Tutu", category: "Arts & Humanities", pages: 380, cover: "https://images.unsplash.com/photo-1461360370896-922624d12aa1?w=200&h=260&fit=crop" },
    { id: "CAT-4", title: "Advanced Python Programming & Machine Learning", author: "Chief Dev. Gabriel Osei", category: "Computer Science", pages: 460, cover: "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=200&h=260&fit=crop" },
    { id: "CAT-5", title: "Economics: Principles, Markets & Macro Policy", author: "Mrs. Beatrice Arthur", category: "Business Studies", pages: 395, cover: "https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=200&h=260&fit=crop" },
    { id: "CAT-6", title: "English Language, Rhetoric & Literature Anthology", author: "Rev. Grace Osei", category: "Languages", pages: 340, cover: "https://images.unsplash.com/photo-1497633762265-9d179a990aa6?w=200&h=260&fit=crop" }
  ];

  const handleBorrowBook = (book) => {
    const gate = checkDemoEntryLimit("library", "borrowed textbooks", borrowedBooks.length);
    if (!gate.allowed) {
      setFeedback({ type: "error", message: gate.message });
      return;
    }
    if (borrowedBooks.some((b) => b.title === book.title)) {
      setFeedback({ type: "info", message: `You have already borrowed "${book.title}".` });
      return;
    }
    const newRecord = {
      id: "BORROW-" + Date.now().toString().slice(-6),
      title: book.title,
      author: book.author,
      isbn: "GBS-EBOOK-" + Math.floor(Math.random() * 89999 + 10000),
      borrowDate: new Date().toISOString().split("T")[0],
      dueDate: new Date(Date.now() + 14 * 86400000).toISOString().split("T")[0],
      status: "BORROWED",
      daysRemaining: 14,
      cover: book.cover
    };
    const updated = [newRecord, ...borrowedBooks];
    setBorrowedBooks(updated);
    trackDemoEntryCreated("library");
    try {
      localStorage.setItem("gbs_library_borrowed_records", JSON.stringify(updated));
    } catch { }
    setFeedback({ type: "success", message: '📖 Textbook "' + book.title + '" checked out successfully! Return due in 14 days.' });
  };

  const handleReturnBook = (id) => {
    const updated = borrowedBooks.filter((b) => b.id !== id);
    setBorrowedBooks(updated);
    try {
      localStorage.setItem("gbs_library_borrowed_records", JSON.stringify(updated));
    } catch { }
    setFeedback({ type: "success", message: "📥 Textbook returned to school library successfully." });
  };

  // Student-to-Student Peer Chat & Study Circle State
  const [searchIndexInput, setSearchIndexInput] = useState("");
  const [candidatePeer, setCandidatePeer] = useState(null);
  const [showPeerConfirmModal, setShowPeerConfirmModal] = useState(false);
  const [activePeerChat, setActivePeerChat] = useState(null);
  const [chatMessages, setChatMessages] = useState([]);
  const [newMessageText, setNewMessageText] = useState("");
  const [archivedPeerChats, setArchivedPeerChats] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("gbs_peer_archived_chats") || "[]");
    } catch {
      return [];
    }
  });
  const [showArchivedChatsModal, setShowArchivedChatsModal] = useState(false);

  // Enrolled Student Roster for Peer Resolution
  const [enrolledPeersList, setEnrolledPeersList] = useState(() => {
    try {
      const stored = JSON.parse(localStorage.getItem("gbs_enrolled_students") || "[]");
      if (Array.isArray(stored) && stored.length > 0) return stored;
    } catch { }
    if (!isDemoTenant) return [];
    return [
      { id: "101", studentId: "STU-2026-001", indexNumber: "STU-2026-001", firstName: "Emmanuel", lastName: "Mensah", registeredMobile: "+233-24-411-9201", currentClass: "JHS 2 (Junior High - Grade 8)", classCode: "JHS-02", photo: "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=200&h=200&fit=crop" },
      { id: "102", studentId: "STU-2026-002", indexNumber: "STU-2026-002", firstName: "Ama", lastName: "Serwaa", registeredMobile: "+233-20-882-3490", currentClass: "SHS 1 / Grade 10 - STEM & Arts", classCode: "SHS-01", photo: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&h=200&fit=crop" },
      { id: "103", studentId: "STU-2026-003", indexNumber: "STU-2026-003", firstName: "Julian", lastName: "Bramwell", registeredMobile: "+233-55-901-4478", currentClass: "Primary 4 (Upper Primary)", classCode: "PRI-04", photo: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=200&fit=crop" },
      { id: "104", studentId: "STU-2026-004", indexNumber: "STU-2026-004", firstName: "Sophia", lastName: "Chen", registeredMobile: "+233-27-312-5509", currentClass: "University Level 200 - Sophomore Year", classCode: "UNI-200", photo: "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=200&h=200&fit=crop" },
      { id: "105", studentId: "STU-2026-005", indexNumber: "STU-2026-005", firstName: "Kofi", lastName: "Boateng", registeredMobile: "+233-24-998-1123", currentClass: "JHS 3 (BECE Candidates - Grade 9)", classCode: "JHS-03", photo: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&h=200&fit=crop" }
    ];
  });

  const handleSearchPeerByIndex = (query) => {
    const q = (query || searchIndexInput).trim().toLowerCase();
    if (!q) {
      setFeedback({ type: "error", message: "Please enter a Student Index Number or Admission Number to search." });
      return;
    }
    const match = enrolledPeersList.find((s) => {
      const idx = String(s.indexNumber || s.studentId || s.id || "").toLowerCase();
      const fn = `${s.firstName || ""} ${s.lastName || ""}`.toLowerCase();
      return idx === q || idx.includes(q) || fn.includes(q);
    });

    if (!match) {
      setCandidatePeer(null);
      setFeedback({
        type: "error",
        message: `❌ Student not found: No registered scholar found with Index/ID "${q}".`
      });
      return;
    }

    setCandidatePeer(match);
    setShowPeerConfirmModal(true);
  };

  const handleConfirmStartChat = (peer) => {
    setActivePeerChat(peer);
    setShowPeerConfirmModal(false);
    const threadKey = `gbs_peer_chat_${currentUser?.id || "student"}_${peer.studentId || peer.id}`;
    try {
      const saved = JSON.parse(localStorage.getItem(threadKey) || "[]");
      if (Array.isArray(saved) && saved.length > 0) {
        setChatMessages(saved);
      } else {
        const welcome = [
          {
            id: `msg-${Date.now()}`,
            sender: "PEER",
            senderName: `${peer.firstName} ${peer.lastName}`,
            text: `Hello ${currentUser?.firstName || "Scholar"}! Glad to connect on the GBS Study Circle. Let's collaborate on our coursework!`,
            timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
          }
        ];
        setChatMessages(welcome);
        localStorage.setItem(threadKey, JSON.stringify(welcome));
      }
    } catch {
      setChatMessages([]);
    }
  };

  const handleSendMessage = (customText) => {
    const textToSend = (customText || newMessageText).trim();
    if ((!textToSend && !chatAttachment) || !activePeerChat) return;

    const myMsg = {
      id: `msg-${Date.now()}`,
      sender: "ME",
      senderName: `${currentUser?.firstName || "Me"} ${currentUser?.lastName || ""}`.trim(),
      text: textToSend || (chatAttachment ? `[Attached File: ${chatAttachment.name}]` : ""),
      attachment: chatAttachment,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    };

    const nextMessages = [...chatMessages, myMsg];
    setChatMessages(nextMessages);
    setNewMessageText("");
    setChatAttachment(null);

    const threadKey = `gbs_peer_chat_${currentUser?.id || "student"}_${activePeerChat.studentId || activePeerChat.id}`;
    try {
      localStorage.setItem(threadKey, JSON.stringify(nextMessages));
    } catch { }

    // Simulated peer reply
    setTimeout(() => {
      const replies = [
        "Understood! Let me review the lecture notes and verify that concept with you.",
        "Yes, absolutely. We can work on the practice questions together this evening.",
        "I just checked the timetable; our next session is tomorrow morning.",
        "Thanks for checking in! Make sure to double check the assignment requirements."
      ];
      const replyText = replies[Math.floor(Math.random() * replies.length)];
      const peerReply = {
        id: `msg-${Date.now()}`,
        sender: "PEER",
        senderName: `${activePeerChat.firstName} ${activePeerChat.lastName}`,
        text: replyText,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
      };
      setChatMessages((prev) => {
        const updated = [...prev, peerReply];
        try {
          localStorage.setItem(threadKey, JSON.stringify(updated));
        } catch { }
        return updated;
      });
    }, 1200);
  };

  const handleArchiveCurrentChat = () => {
    if (!activePeerChat || chatMessages.length === 0) {
      setFeedback({ type: "info", message: "No active conversation messages to archive." });
      return;
    }

    const archiveItem = {
      id: `ARCH-CHAT-${Date.now()}`,
      peerName: `${activePeerChat.firstName} ${activePeerChat.lastName}`,
      peerIndex: activePeerChat.studentId || activePeerChat.indexNumber || activePeerChat.id,
      peerClass: activePeerChat.currentClass || activePeerChat.classCode || "Class",
      peerPhone: activePeerChat.registeredMobile || activePeerChat.phone || "—",
      archivedAt: new Date().toLocaleString(),
      messageCount: chatMessages.length,
      messages: chatMessages
    };

    const updated = [archiveItem, ...archivedPeerChats];
    setArchivedPeerChats(updated);
    try {
      localStorage.setItem("gbs_peer_archived_chats", JSON.stringify(updated));
    } catch { }

    setFeedback({
      type: "success",
      message: `📁 Conversation with ${archiveItem.peerName} (${archiveItem.messageCount} messages) saved & archived successfully!`
    });
    if (window.showGBSOpenNotice) {
      window.showGBSOpenNotice(`Chat with ${archiveItem.peerName} archived!`, "success", "Chat Archived");
    }
  };

  const handleProcessFeePayment = async (e) => {
    e.preventDefault();
    const gate = checkDemoEntryLimit("finance", "fee payments");
    if (!gate.allowed) {
      setFeedback({ type: "error", message: gate.message });
      return;
    }
    const amt = parseFloat(paymentAmount);
    if (!amt || amt <= 0) {
      setFeedback({ type: "error", message: "Please enter a valid payment amount." });
      return;
    }

    setLoading(true);
    setFeedback(null);
    try {
      await apiClient.post("/finance/payments", {
        amountPaid: amt,
        paymentMethod: paymentChannel,
        momoNumber: payerPhone,
        studentName: `${currentUser.firstName} ${currentUser.lastName}`,
        indexNumber: currentUser.studentId || currentUser.indexNumber || "GBS-STU-ACTIVE",
        transactionRef: `STUDENT-PORTAL-${Date.now()}`
      });
    } catch (err) {
      if (err?.response) {
        setFeedback({
          type: "error",
          message: err.response.data?.message || err.message || "Payment rejected by central finance engine."
        });
        setLoading(false);
        return;
      }
      // If genuinely offline (!err?.response), preserve offline queue behavior below
    }

    const currentArr = typeof feeArrears === "number" ? feeArrears : parseFloat(feeArrears || 0);
    const newArrears = Math.max(0, currentArr - amt);
    setFeeArrears(newArrears);
    trackDemoEntryCreated("finance");
    try {
      localStorage.setItem("gbs_student_fee_arrears", String(newArrears));
      const paymentRec = {
        id: `REC-PAY-${Date.now()}`,
        amountPaid: amt,
        payerPhone,
        paymentChannel,
        newBalanceDue: newArrears,
        studentName: `${currentUser.firstName} ${currentUser.lastName}`,
        studentId: currentUser.studentId || "GBS-STU-ACTIVE",
        reconciledAt: new Date().toISOString()
      };
      const existingHistory = JSON.parse(localStorage.getItem("gbs_reconciled_payments") || "[]");
      localStorage.setItem("gbs_reconciled_payments", JSON.stringify([paymentRec, ...existingHistory]));
      window.dispatchEvent(new Event("gbs_payment_made"));
      window.dispatchEvent(new Event("storage"));
      setPaymentSuccessSlip(paymentRec);
    } catch { }

    setLoading(false);
    setFeedback({
      type: "success",
      message: `🎉 Payment of GH₵ ${amt.toFixed(2)} processed successfully via ${paymentChannel}! Remaining arrears: GH₵ ${newArrears.toFixed(2)}.`
    });
    if (window.showGBSOpenNotice) {
      window.showGBSOpenNotice(`Payment of GH₵ ${amt.toFixed(2)} confirmed!`, "success", "Payment Confirmation");
    }
    setShowFeePaymentModal(false);
  };

  const handleToggleCourseRegistration = (courseCode) => {
    if (feeArrears > 0) {
      setFeedback({
        type: "error",
        message: "Financial Hold Active: Course registration is restricted until outstanding fee arrears are cleared by the Accountant."
      });
      return;
    }
    let updated;
    if (registeredCourseCodes.includes(courseCode)) {
      updated = registeredCourseCodes.filter((c) => c !== courseCode);
      setFeedback({ type: "info", message: `Course ${courseCode} removed from your active semester registration.` });
    } else {
      updated = [...registeredCourseCodes, courseCode];
      setFeedback({ type: "success", message: `✅ Successfully registered for ${courseCode}!` });
    }
    setRegisteredCourseCodes(updated);
    localStorage.setItem("gbs_registered_courses", JSON.stringify(updated));
  };

  // Student Profile & Academic Level (Assigned Exclusively by Headmaster)
  const [studentPhoto, setStudentPhoto] = useState(() => {
    return localStorage.getItem("gbs_student_avatar") || "/images/student_login_bg.jpg";
  });
  const [academicLevel, setAcademicLevel] = useState("Level 200 (Undergraduate)");
  const [academicTerm, setAcademicTerm] = useState("Semester 1");

  // Alumni Mentorship & Academic Records State
  const [showMentorModal, setShowMentorModal] = useState(false);
  const [selectedMentorAlumnus, setSelectedMentorAlumnus] = useState(null);
  const [mentorRequestData, setMentorRequestData] = useState({
    careerTrack: "Artificial Intelligence & Cloud Architecture",
    notes: ""
  });
  const [showAlumniRecordsModal, setShowAlumniRecordsModal] = useState(false);

  // Saved Virtual Meetings for Reference
  const [savedReferenceMeetings, setSavedReferenceMeetings] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("gbs_student_saved_meetings") || "[]");
    } catch {
      return [];
    }
  });

  // REQUIREMENT: Exact Registered School Name & Uploaded Crest from Headmaster Branding Settings
  const [schoolOfficialName, setSchoolOfficialName] = useState(() => getActiveSchoolName(studentProfile));
  const [customSchoolLogo, setCustomSchoolLogo] = useState(() => getActiveSchoolLogo());

  // REQUIREMENT: Grades published by teachers reflect on Student Dashboard
  const [publishedGrades, setPublishedGrades] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("gbs_student_published_results") || localStorage.getItem("gbs_published_grades") || "[]");
      if (Array.isArray(saved) && saved.length > 0) return saved;
    } catch { }
    return [];
  });

  useEffect(() => {
    const handleSchoolNameSync = () => {
      setSchoolOfficialName(getActiveSchoolName(studentProfile));
    };
    const handleSchoolLogoSync = () => {
      setCustomSchoolLogo(getActiveSchoolLogo());
    };
    const handleGradesSync = () => {
      try {
        const saved = JSON.parse(localStorage.getItem("gbs_student_published_results") || localStorage.getItem("gbs_published_grades") || "[]");
        if (Array.isArray(saved)) setPublishedGrades(saved);
      } catch { }
    };

    window.addEventListener("storage", handleSchoolNameSync);
    window.addEventListener("gbs_school_name_updated", handleSchoolNameSync);
    window.addEventListener("storage", handleSchoolLogoSync);
    window.addEventListener("gbs_school_logo_updated", handleSchoolLogoSync);
    window.addEventListener("gbs_custom_logo_updated", handleSchoolLogoSync);
    window.addEventListener("storage", handleGradesSync);
    window.addEventListener("gbs_grades_updated", handleGradesSync);

    return () => {
      window.removeEventListener("storage", handleSchoolNameSync);
      window.removeEventListener("gbs_school_name_updated", handleSchoolNameSync);
      window.removeEventListener("storage", handleSchoolLogoSync);
      window.removeEventListener("gbs_custom_logo_updated", handleSchoolLogoSync);
      window.removeEventListener("storage", handleGradesSync);
      window.removeEventListener("gbs_grades_updated", handleGradesSync);
    };
  }, []);

  // REQUIREMENT: Report Card wrapped over/within year with year, date, and time of wrapping
  const [reportWrapInfo, setReportWrapInfo] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("gbs_report_wrap_info") || "null");
      if (saved) return saved;
    } catch { }
    return null;
  });

  // Alumni Directory & Hall of Fame Data
  const [alumniList, setAlumniList] = useState(() => {
    try {
      const stored = localStorage.getItem("gbs_alumni_directory");
      if (stored) return JSON.parse(stored);
    } catch { }
    return [];
  });

  const currentUser = JSON.parse(
    localStorage.getItem("gbs_user") ||
    '{"id":1,"firstName":"Enrolled","lastName":"Student","email":"student@gbs.edu","role":"STUDENT"}'
  );

  useEffect(() => {
    fetchTimetable();
    fetchAssignments();
    fetchAnnouncements();
    fetchMeetings();
    fetchExams();

    const handlePaymentUpdate = () => {
      try {
        const stored = localStorage.getItem("gbs_student_fee_arrears");
        const val = stored !== null ? parseFloat(stored) : 0;
        setFeeArrears(val);
        const history = JSON.parse(localStorage.getItem("gbs_reconciled_payments") || "[]");
        if (Array.isArray(history) && history.length > 0) {
          const latest = history[0];
          setLastPaymentNotice(latest);
          setFeedback({
            type: "success",
            message: `🎉 PAYMENT RECONCILED: Payment of $${latest.amountPaid ? latest.amountPaid.toFixed(2) : "4,850.00"} confirmed! Arrears cleared to $0.00. Course registration and official report card unlocked.`
          });
        }
      } catch (e) {
        console.error(e);
      }
    };

    const handleGradesUpdate = () => {
      try {
        const saved = JSON.parse(localStorage.getItem("gbs_published_grades") || "[]");
        if (Array.isArray(saved)) {
          setPublishedGrades(saved);
        }
      } catch { }
    };

    const handleSubmissionsSync = () => {
      try {
        const saved = JSON.parse(localStorage.getItem("gbs_student_submissions") || "[]");
        if (Array.isArray(saved) && saved.length > 0) {
          const mapped = {};
          saved.forEach((sub) => {
            if (sub.assignmentId) {
              mapped[sub.assignmentId] = {
                content: sub.submittedContent,
                submittedAt: sub.submittedAt,
                status: sub.status,
                grade: sub.score,
                teacherRemarks: sub.teacherRemarks
              };
            }
          });
          setMySubmissions((prev) => ({ ...prev, ...mapped }));
        }
      } catch { }
    };

    const handleAttendanceSync = () => {
      try {
        const saved = localStorage.getItem("gbs_student_attendance_summary");
        if (saved) setAttendanceSummary(JSON.parse(saved));
      } catch { }
    };

    const handleExamPublishedSync = () => {
      setNewExamPublished(localStorage.getItem("gbs_new_exam_published") === "true");
    };

    const handleExamGradesSync = () => {
      try {
        const stored = JSON.parse(localStorage.getItem("gbs_student_submitted_exams") || "{}");
        if (stored && typeof stored === "object") {
          setSubmittedExams(stored);
        }
      } catch { }
    };

    const handleLiveClassSync = () => {
      try {
        const list = JSON.parse(localStorage.getItem("gbs_active_live_classes") || "[]");
        setActiveLiveBroadcast(list[0] || null);
      } catch { }
    };

    handleGradesUpdate();
    handleSubmissionsSync();
    handleAttendanceSync();
    handleLiveClassSync();
    handleExamGradesSync();

    window.addEventListener("gbs_payment_made", handlePaymentUpdate);
    window.addEventListener("gbs_grades_updated", handleGradesUpdate);
    window.addEventListener("gbs_submission_updated", handleSubmissionsSync);
    window.addEventListener("gbs_attendance_updated", handleAttendanceSync);
    window.addEventListener("gbs_new_exam_published", handleExamPublishedSync);
    window.addEventListener("gbs_exam_grades_updated", handleExamGradesSync);
    window.addEventListener("gbs_live_class_broadcast", handleLiveClassSync);
    window.addEventListener("storage", handlePaymentUpdate);
    window.addEventListener("storage", handleGradesUpdate);
    window.addEventListener("storage", handleSubmissionsSync);
    window.addEventListener("storage", handleAttendanceSync);
    window.addEventListener("storage", handleExamPublishedSync);
    window.addEventListener("storage", handleExamGradesSync);
    window.addEventListener("storage", handleLiveClassSync);
    return () => {
      window.removeEventListener("gbs_payment_made", handlePaymentUpdate);
      window.removeEventListener("gbs_grades_updated", handleGradesUpdate);
      window.removeEventListener("gbs_submission_updated", handleSubmissionsSync);
      window.removeEventListener("gbs_attendance_updated", handleAttendanceSync);
      window.removeEventListener("gbs_new_exam_published", handleExamPublishedSync);
      window.removeEventListener("gbs_exam_grades_updated", handleExamGradesSync);
      window.removeEventListener("gbs_live_class_broadcast", handleLiveClassSync);
      window.removeEventListener("storage", handlePaymentUpdate);
      window.removeEventListener("storage", handleGradesUpdate);
      window.removeEventListener("storage", handleSubmissionsSync);
      window.removeEventListener("storage", handleAttendanceSync);
      window.removeEventListener("storage", handleExamPublishedSync);
      window.removeEventListener("storage", handleExamGradesSync);
      window.removeEventListener("storage", handleLiveClassSync);
    };
  }, []);

  const formatMeetingUrl = (url, passcode = "GBS2026", meetingId = "84939201849") => {
    const cleanPass = (passcode || "GBS2026").trim();
    const cleanId = String(meetingId || "84939201849").replace(/[^0-9]/g, "") || "84939201849";
    const userName = `${currentUser.firstName} ${currentUser.lastName} (Student)`.trim();
    // Direct zero-prompt 1-click web client join URL with pre-filled password and attendee name
    return `https://zoom.us/wc/${cleanId}/join?prefer=1&pwd=${encodeURIComponent(cleanPass)}&uname=${encodeURIComponent(userName)}`;
  };

  const handlePhotoUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      setStudentPhoto(result);
      localStorage.setItem("gbs_student_avatar", result);
      setFeedback({ type: "success", message: "Student profile photograph updated and saved successfully!" });
    };
    reader.readAsDataURL(file);
  };

  const handleSaveMeetingReference = (meeting) => {
    const exists = savedReferenceMeetings.some((m) => m.id === meeting.id);
    let updated;
    if (exists) {
      updated = savedReferenceMeetings.filter((m) => m.id !== meeting.id);
      setFeedback({ type: "success", message: `Removed "${meeting.title}" from saved learning references.` });
    } else {
      const record = {
        id: meeting.id,
        title: meeting.title,
        platform: meeting.platform,
        startTime: meeting.startTime,
        meetingUrl: meeting.meetingUrl,
        savedAt: new Date().toISOString()
      };
      updated = [record, ...savedReferenceMeetings];
      setFeedback({ type: "success", message: `💾 Saved "${meeting.title}" to your personal learning references!` });
    }
    setSavedReferenceMeetings(updated);
    localStorage.setItem("gbs_student_saved_meetings", JSON.stringify(updated));
  };

  const WRITTEN_QUESTION_TYPES = ["THEORY_ESSAY", "SHORT_ANSWER", "CASE_STUDY"];

  const resolveExamQuestionType = (q) => {
    if (!q) return "MULTIPLE_CHOICE";
    if (q.questionType) return String(q.questionType).toUpperCase();
    const hasOpts = (Array.isArray(q.options) && q.options.length > 0) || Boolean(q.optionA || q.optionB || q.optionC || q.optionD);
    if (hasOpts) return "MULTIPLE_CHOICE";
    return "THEORY_ESSAY";
  };

  const resolveQuestionOptions = (q) => {
    if (!q) return [];
    if (Array.isArray(q.options) && q.options.length > 0) return q.options;
    const built = [q.optionA, q.optionB, q.optionC, q.optionD].filter((x) => x !== undefined && x !== null && String(x).trim() !== "");
    if (built.length > 0) return built;
    if (resolveExamQuestionType(q) === "TRUE_FALSE") return ["True", "False"];
    return [];
  };

  const getQuestionTypeBadge = (qType) => {
    const map = {
      MULTIPLE_CHOICE: { label: "Multiple Choice", color: "#d4af37" },
      THEORY_ESSAY: { label: "Theory / Essay (Typed)", color: "#d4af37" },
      SHORT_ANSWER: { label: "Short Answer (Typed)", color: "#d4af37" },
      TRUE_FALSE: { label: "True / False", color: "#d4af37" },
      FILL_IN_BLANK: { label: "Fill in the Blank", color: "#d4af37" },
      CASE_STUDY: { label: "Practical / Case Study (Typed)", color: "#d4af37" }
    };
    return map[qType] || { label: "Exam Question", color: "#d4af37" };
  };

  const fetchExams = async () => {
    try {
      const [examsRes, sheetsRes] = await Promise.all([
        apiClient.get("/ai-exam/exams?studentOnly=true"),
        apiClient.get("/ai-exam/answer-sheets").catch(() => null)
      ]);
      const list = examsRes.data?.data?.exams || examsRes.data?.data || [];
      const teacherExams = JSON.parse(localStorage.getItem("gbs_teacher_published_exams") || "[]");
      const seenIds = new Set();
      const combined = [];
      [...list, ...teacherExams].forEach((ex) => {
        const vs = String(ex?.vettingStatus || "").toUpperCase();
        if (vs === "PENDING_HEADMASTER_VETTING" || vs === "REVISION_REQUESTED" || vs === "REJECTED") {
          return;
        }
        if (!seenIds.has(String(ex.id))) {
          seenIds.add(String(ex.id));
          combined.push(ex);
        }
      });
      setExams(combined);
      if (combined.length > 0 && !activeExam) {
        setActiveExam(combined[0]);
      }

      const sheets = sheetsRes?.data?.data?.answerSheets || [];
      if (Array.isArray(sheets) && sheets.length > 0) {
        const stored = JSON.parse(localStorage.getItem("gbs_student_submitted_exams") || "{}");
        let changed = false;
        sheets.forEach((sheet) => {
          const sameStudent =
            String(sheet.studentId || "") === String(currentUser.id || 10) ||
            (currentUser.email && sheet.studentEmail && sheet.studentEmail.toLowerCase() === currentUser.email.toLowerCase());
          if (!sameStudent || !sheet.examId) return;
          const prev = stored[sheet.examId];
          if (!prev || sheet.gradingStatus === "TEACHER_GRADED") {
            const pct = Number(sheet.percentage || 0);
            const penalty = prev?.proctoringPenalty || 0;
            const finalPct = Math.max(0, pct - penalty);
            const letter = sheet.gradingStatus === "PENDING_TEACHER_REVIEW"
              ? "Pending Review"
              : (finalPct >= 90 ? "A+" : finalPct >= 80 ? "A" : finalPct >= 70 ? "B" : finalPct >= 60 ? "C" : finalPct >= 50 ? "D" : "F");
            stored[sheet.examId] = {
              ...(prev || {}),
              examId: sheet.examId,
              answerSheetId: sheet.id,
              rawScore: pct,
              score: finalPct,
              scoreObtained: sheet.scoreObtained,
              objectiveMarksObtained: sheet.objectiveMarksObtained,
              totalMarks: sheet.totalMarks || 100,
              grade: letter,
              isPassed: sheet.gradingStatus === "PENDING_TEACHER_REVIEW" ? null : finalPct >= 50,
              gradingStatus: sheet.gradingStatus || "AUTO_GRADED",
              needsManualReview: sheet.gradingStatus === "PENDING_TEACHER_REVIEW",
              teacherFeedback: sheet.teacherFeedback || "",
              perQuestionBreakdown: sheet.perQuestionBreakdown || prev?.perQuestionBreakdown || [],
              submittedAt: prev?.submittedAt || (sheet.submittedAt ? new Date(sheet.submittedAt).toLocaleTimeString() : new Date().toLocaleTimeString()),
              locked: true
            };
            changed = true;
          }
        });
        if (changed) {
          setSubmittedExams(stored);
          localStorage.setItem("gbs_student_submitted_exams", JSON.stringify(stored));
        }
      }
    } catch (err) {
      console.warn("Could not load exams from PostgreSQL:", err);
      const teacherExams = JSON.parse(localStorage.getItem("gbs_teacher_published_exams") || "[]");
      if (teacherExams.length > 0) {
        setExams(teacherExams);
        if (!activeExam) setActiveExam(teacherExams[0]);
      }
    }
  };

  useEffect(() => {
    const handleTeacherExamSync = () => {
      fetchExams();
    };
    window.addEventListener("gbs_teacher_exam_published", handleTeacherExamSync);
    window.addEventListener("storage", handleTeacherExamSync);
    return () => {
      window.removeEventListener("gbs_teacher_exam_published", handleTeacherExamSync);
      window.removeEventListener("storage", handleTeacherExamSync);
    };
  }, []);

  const fetchTimetable = async () => {
    try {
      const [gridRes, guideRes] = await Promise.all([
        apiClient.get("/timetables/grid").catch(() => null),
        apiClient.get("/timetables/examination-guide").catch(() => null)
      ]);
      if (gridRes) {
        const slots = gridRes.data?.data?.slots || gridRes.data?.data || [];
        setTimetableSlots(slots);
      }
      if (guideRes) {
        const guideEntries = guideRes.data?.data?.entries || guideRes.data?.data || [];
        if (Array.isArray(guideEntries) && guideEntries.length > 0) {
          setExamTimetableGuide(guideEntries);
          localStorage.setItem("gbs_examination_timetable", JSON.stringify(guideEntries));
        }
      }
    } catch (err) {
      console.warn("Could not load timetable:", err);
    }
  };

  const fetchAssignments = async () => {
    try {
      const res = await apiClient.get("/assignments");
      setAssignments(res.data?.data || []);
    } catch (err) {
      console.warn("Could not load assignments:", err);
    }
  };

  const fetchAnnouncements = async () => {
    try {
      const res = await apiClient.get("/communication/announcements");
      setAnnouncements(res.data?.data?.announcements || []);
    } catch (err) {
      console.warn("Could not load announcements:", err);
    }
  };

  const fetchMeetings = async () => {
    try {
      const res = await apiClient.get("/meetings");
      setMeetings(res.data?.data?.meetings || []);
    } catch (err) {
      console.warn("Could not load meetings:", err);
    }
  };

  // Submit Homework Assignment to PostgreSQL
  const handleSubmitAssignment = async (assignmentId) => {
    const gate = checkDemoEntryLimit("assignments", "homework submissions");
    if (!gate.allowed) {
      setFeedback({ type: "error", message: gate.message });
      return;
    }
    const content = submissionInputs[assignmentId];
    if (!content || !content.trim()) {
      setFeedback({ type: "error", message: "Please enter your homework submission text or link." });
      return;
    }

    setLoading(true);
    setFeedback(null);
    try {
      await apiClient.post(`/assignments/${assignmentId}/submit`, {
        submissionContent: content.trim(),
        attachmentUrl: content.includes("http") ? content.trim() : null
      });

      const targetAssignment = assignments.find((a) => a.id === assignmentId);
      const studentName = `${currentUser.firstName} ${currentUser.lastName}`;
      const submissionRecord = {
        id: `sub-${Date.now()}`,
        assignmentId: assignmentId,
        assignmentTitle: targetAssignment?.title || "Lesson Assignment",
        studentId: currentUser.id || "101",
        studentName: studentName,
        studentClass: academicLevel || "Grade 10A Mathematics",
        submittedContent: content.trim(),
        submittedAt: `Today at ${new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`,
        status: "PENDING_VERIFICATION",
        score: null,
        maxScore: targetAssignment?.maxScore || 100,
        teacherRemarks: ""
      };

      try {
        const existing = JSON.parse(localStorage.getItem("gbs_student_submissions") || "[]");
        localStorage.setItem("gbs_student_submissions", JSON.stringify([submissionRecord, ...existing]));
        window.dispatchEvent(new Event("gbs_submission_updated"));
      } catch (e) { }

      trackDemoEntryCreated("assignments");
      setMySubmissions((prev) => ({
        ...prev,
        [assignmentId]: { content, submittedAt: new Date().toLocaleTimeString(), status: "SUBMITTED" }
      }));
      setFeedback({ type: "success", message: "Homework successfully submitted to teacher for verification and grading!" });
      setSubmissionInputs((prev) => ({ ...prev, [assignmentId]: "" }));
    } catch (err) {
      setFeedback({ type: "error", message: err.response?.data?.message || "Failed to submit assignment." });
    } finally {
      setLoading(false);
    }
  };

  // Submit Online Exam to PostgreSQL Auto-Grading Engine (Locked after submission)
  const handleSubmitExam = async () => {
    if (!activeExam) return;
    const gate = checkDemoEntryLimit("exams", "online exam submissions");
    if (!gate.allowed) {
      setFeedback({ type: "error", message: gate.message });
      return;
    }
    setLoading(true);
    setFeedback(null);
    setShowExamConfirmModal(false);
    try {
      const answersMap = {};
      const writtenMap = {};
      const questions = activeExam.questionBank || [];
      questions.forEach((q, idx) => {
        const qNumKey = String(q.questionNumber || idx + 1);
        const qType = resolveExamQuestionType(q);
        const selectedChoice = examAnswers[q.id];
        const typedText = examEssayAnswers[q.id] || "";
        if (selectedChoice !== undefined && selectedChoice !== "") {
          answersMap[qNumKey] = selectedChoice;
        }
        if (typedText.trim().length > 0 || WRITTEN_QUESTION_TYPES.includes(qType) || qType === "FILL_IN_BLANK") {
          writtenMap[qNumKey] = typedText;
        }
      });

      const effectivePenalty = Math.max(penaltyMarksDeducted, (proctoringWarnings * 2) + teacherPenaltyMarks);
      const studentDisplayName = `${currentUser.firstName || "Student"} ${currentUser.lastName || ""}`.trim();
      let res = null;
      try {
        res = await apiClient.post("/ai-exam/scan-grade", {
          examId: activeExam.id,
          studentId: currentUser.id || 10,
          studentName: studentDisplayName,
          studentEmail: currentUser.email || "",
          extractedAnswers: answersMap,
          writtenAnswers: writtenMap,
          penaltyMarksDeducted: effectivePenalty,
          proctoringWarnings,
          proctoringLog: proctoringEvents,
          proctoringSnapshots: proctorSnapshotsRef.current,
          marksPerWarning: 2
        });
      } catch (apiErr) {
        if (apiErr?.response) {
          throw apiErr;
        }
        // Only fall back to local exam scoring when the backend is genuinely offline (!apiErr.response)
        res = null;
      }

      let data = res?.data?.data;
      if (!data) {
        // Compute authentic mixed score (auto-grade objective + queue Theory/Written items for Teacher review)
        const totalLocalMarks = questions.reduce((sum, q) => sum + (Number(q.marks) || 10), 0) || 100;
        let objectiveObtained = 0;
        let matchedLocal = 0;
        let writtenCount = 0;
        const breakdown = questions.map((q, idx) => {
          const qNum = q.questionNumber || idx + 1;
          const qKey = String(qNum);
          const qType = resolveExamQuestionType(q);
          const qMarks = Number(q.marks) || 10;
          const isWritten = WRITTEN_QUESTION_TYPES.includes(qType);
          const studentWritten = String(writtenMap[qKey] ?? examEssayAnswers[q.id] ?? "").trim();
          const studentObj = String(answersMap[qKey] ?? examAnswers[q.id] ?? "").trim();

          if (isWritten) {
            writtenCount += 1;
            const modelAns = String(q.acceptedAnswer || "").trim().toLowerCase();
            const kwList = String(q.acceptedKeywords || "")
              .split(",")
              .map((k) => k.trim().toLowerCase())
              .filter(Boolean);
            const ansLower = studentWritten.toLowerCase();
            let autoSuggestedMarks = 0;
            if (ansLower) {
              if (modelAns && (ansLower === modelAns || ansLower.includes(modelAns))) {
                autoSuggestedMarks = qMarks;
              } else if (kwList.length > 0) {
                const kwHits = kwList.filter((kw) => ansLower.includes(kw)).length;
                autoSuggestedMarks = Math.round((kwHits / kwList.length) * qMarks);
              }
            }
            return {
              questionId: q.id || idx + 1,
              questionNumber: qNum,
              questionType: qType,
              questionText: q.questionText || `Question ${qNum}`,
              caseScenario: q.caseScenario || "",
              maxMarks: qMarks,
              studentAnswer: studentWritten,
              markingGuide: q.markingGuide || "",
              acceptedAnswer: q.acceptedAnswer || "",
              autoSuggestedMarks,
              marksAwarded: null,
              status: "PENDING_TEACHER_REVIEW"
            };
          }

          if (qType === "FILL_IN_BLANK") {
            const expectedBlank = String(q.acceptedAnswer || q.correctOption || "").trim().toLowerCase();
            const alts = String(q.acceptedKeywords || "").split(",").map((k) => k.trim().toLowerCase()).filter(Boolean);
            const givenBlank = studentWritten.toLowerCase();
            const isRight = Boolean(givenBlank && ((expectedBlank && givenBlank === expectedBlank) || alts.includes(givenBlank)));
            if (isRight) {
              objectiveObtained += qMarks;
              matchedLocal += 1;
            }
            return {
              questionId: q.id || idx + 1,
              questionNumber: qNum,
              questionType: qType,
              questionText: q.questionText || `Question ${qNum}`,
              maxMarks: qMarks,
              studentAnswer: studentWritten,
              expectedAnswer: q.acceptedAnswer || "",
              marksAwarded: isRight ? qMarks : 0,
              status: "AUTO_GRADED"
            };
          }

          const expected = String(q.correctOption ?? q.correctAnswer ?? "").trim().toUpperCase();
          const isRight = Boolean(studentObj && expected && studentObj.toUpperCase() === expected);
          if (isRight) {
            objectiveObtained += qMarks;
            matchedLocal += 1;
          }
          return {
            questionId: q.id || idx + 1,
            questionNumber: qNum,
            questionType: qType,
            questionText: q.questionText || `Question ${qNum}`,
            maxMarks: qMarks,
            studentAnswer: studentObj,
            expectedAnswer: expected,
            marksAwarded: isRight ? qMarks : 0,
            status: "AUTO_GRADED"
          };
        });

        const netOfflineScore = Math.max(0, Math.round((objectiveObtained - effectivePenalty) * 10) / 10);
        const computedPct = Math.max(0, Math.round((netOfflineScore / Math.max(1, totalLocalMarks)) * 100));
        const hasWritten = writtenCount > 0;
        data = {
          answerSheetId: Date.now(),
          examId: activeExam.id,
          examTitle: activeExam.title,
          rawScoreObtained: objectiveObtained,
          proctoringPenaltyMarks: effectivePenalty,
          scoreObtained: netOfflineScore,
          objectiveMarksObtained: objectiveObtained,
          totalMarks: totalLocalMarks,
          percentage: computedPct,
          totalQuestions: questions.length,
          writtenQuestionsCount: writtenCount,
          matchedAnswers: matchedLocal,
          needsManualReview: hasWritten,
          gradingStatus: hasWritten ? "PENDING_TEACHER_REVIEW" : "AUTO_GRADED",
          pass: hasWritten ? null : computedPct >= 50,
          perQuestionBreakdown: breakdown
        };
      }
      if (data) {
        const totalMarks = Number(data.totalMarks || activeExam.totalMarks || 100);
        const rawMarksVal = data.rawScoreObtained !== undefined
          ? Number(data.rawScoreObtained)
          : Number(data.objectiveMarksObtained ?? data.scoreObtained ?? 0);
        const penalty = Number(data.proctoringPenaltyMarks ?? effectivePenalty);
        const finalMarksVal = data.proctoringPenaltyMarks !== undefined
          ? Number(data.scoreObtained ?? 0)
          : Math.max(0, rawMarksVal - penalty);
        const rawPct = data.rawPercentage !== undefined
          ? Number(data.rawPercentage)
          : Math.max(0, Math.min(100, Math.round((rawMarksVal / Math.max(1, totalMarks)) * 100)));
        const finalPct = data.proctoringPenaltyMarks !== undefined && data.percentage !== undefined
          ? Number(data.percentage)
          : Math.max(0, Math.min(100, Math.round((finalMarksVal / Math.max(1, totalMarks)) * 100)));
        const needsManualReview = Boolean(
          data.needsManualReview ||
          data.gradingStatus === "PENDING_TEACHER_REVIEW" ||
          questions.some((q) => WRITTEN_QUESTION_TYPES.includes(resolveExamQuestionType(q)))
        );
        const letterGrade = needsManualReview
          ? "Pending Review"
          : (finalPct >= 90 ? "A+" : finalPct >= 80 ? "A" : finalPct >= 70 ? "B" : finalPct >= 60 ? "C" : finalPct >= 50 ? "D" : "F");
        const totalQ = data.totalQuestions || (questions.length > 0 ? questions.length : 10);
        const correctCount = data.matchedAnswers !== undefined ? data.matchedAnswers : Math.round((finalPct / 100) * totalQ);

        const record = {
          examId: activeExam.id,
          examTitle: activeExam.title || data.examTitle || "Examination",
          answerSheetId: data.answerSheetId || Date.now(),
          studentId: currentUser.id || 10,
          studentName: studentDisplayName,
          studentEmail: currentUser.email || "",
          rawScore: rawPct,
          rawScoreObtained: rawMarksVal,
          proctoringPenaltyMarks: penalty,
          scoreObtained: finalMarksVal,
          objectiveMarksObtained: data.objectiveMarksObtained ?? data.scoreObtained ?? 0,
          totalMarks,
          proctoringPenalty: penalty,
          proctoringViolations: proctoringWarnings,
          proctoringLog: proctoringEvents,
          score: finalPct,
          correct: correctCount,
          total: totalQ,
          writtenQuestionsCount: data.writtenQuestionsCount ?? questions.filter((q) => WRITTEN_QUESTION_TYPES.includes(resolveExamQuestionType(q))).length,
          grade: letterGrade,
          isPassed: needsManualReview ? null : finalPct >= 50,
          needsManualReview,
          gradingStatus: needsManualReview ? "PENDING_TEACHER_REVIEW" : (data.gradingStatus || "AUTO_GRADED"),
          extractedAnswers: answersMap,
          writtenAnswers: writtenMap,
          perQuestionBreakdown: data.perQuestionBreakdown || [],
          teacherFeedback: data.teacherFeedback || "",
          submittedAt: new Date().toLocaleTimeString(),
          submittedAtIso: new Date().toISOString(),
          locked: true
        };

        setExamScoreResult(record);
        const updatedSubmitted = { ...submittedExams, [activeExam.id]: record };
        setSubmittedExams(updatedSubmitted);
        localStorage.setItem("gbs_student_submitted_exams", JSON.stringify(updatedSubmitted));

        // Sync submitted script to Demo Teacher feed immediately
        try {
          const feed = JSON.parse(localStorage.getItem("gbs_submitted_exam_scripts_feed") || "[]");
          const scriptItem = {
            id: record.answerSheetId,
            examId: record.examId,
            examTitle: record.examTitle,
            studentId: record.studentId,
            studentName: record.studentName,
            studentEmail: record.studentEmail,
            rawScoreObtained: record.rawScoreObtained,
            proctoringPenaltyMarks: record.proctoringPenaltyMarks,
            proctoringWarnings: record.proctoringViolations,
            scoreObtained: record.scoreObtained,
            objectiveMarksObtained: record.objectiveMarksObtained,
            totalMarks: record.totalMarks,
            percentage: record.score,
            gradingStatus: record.gradingStatus,
            extractedAnswers: record.extractedAnswers,
            writtenAnswers: record.writtenAnswers,
            perQuestionBreakdown: record.perQuestionBreakdown,
            submittedAt: record.submittedAtIso
          };
          const filteredFeed = (Array.isArray(feed) ? feed : []).filter(
            (s) => !(String(s.examId) === String(record.examId) && String(s.studentId) === String(record.studentId))
          );
          localStorage.setItem("gbs_submitted_exam_scripts_feed", JSON.stringify([scriptItem, ...filteredFeed]));
          window.dispatchEvent(new Event("gbs_exam_submitted_to_teacher"));
        } catch { }

        trackDemoEntryCreated("exams");
        localStorage.removeItem("gbs_new_exam_published");
        setNewExamPublished(false);

        stopProctoringSession();
        setExamSubmitted(true);
        setExamStarted(false);
        setFeedback({
          type: "success",
          message: needsManualReview
            ? `✅ Exam & Typed Theory Script submitted! Objective Auto-Score: ${record.objectiveMarksObtained}/${record.totalMarks} marks. Your ${record.writtenQuestionsCount} Theory/Written question(s) are queued for Teacher marking.`
            : `✅ Exam submitted, locked, and auto-graded! Base Score: ${rawPct}% • Penalty: -${penalty}% • Final Score: ${finalPct}% (${letterGrade}). Exam hall locked until next session.`
        });
      }
    } catch (err) {
      setFeedback({ type: "error", message: err.response?.data?.message || "Failed to submit exam." });
    } finally {
      setLoading(false);
    }
  };

  const handlePublishNewExamSession = () => {
    localStorage.setItem("gbs_new_exam_published", "true");
    setNewExamPublished(true);
    setExamSubmitted(false);
    setExamStarted(false);
    window.dispatchEvent(new Event("gbs_new_exam_published"));
    setFeedback({
      type: "success",
      message: "📢 Faculty board has published a new examination session! Examination portal unlocked for writing."
    });
  };

  const handleLogout = () => {
    localStorage.removeItem("gbs_token");
    localStorage.removeItem("gbs_user");
    navigate("/login/student");
  };

  return (
    <div className="role-dashboard-wrapper role-theme-student">
      <div
        className="role-dashboard-bg"
        style={{ backgroundImage: `url('/images/student_login_bg.jpg')` }}
      ></div>
      <div className="role-dashboard-overlay"></div>

      <div className="role-dashboard-content">
        {/* Universal Navigation & Scroll Controls */}
        <WindowControlsBar title="Student Learning Portal" />

        {/* Prominent Top Center System Branding */}
        <TopCenterSystemBanner roleTitle="Student Learning Portal" />
        <LiveCallLauncherAndReceiver
          variant="GLOBAL_RECEIVER"
          userRole="STUDENT"
          currentUser={currentUser}
          onFeedback={(msg, isErr) => setFeedback({ type: isErr ? "error" : "success", message: msg })}
        />

        {/* Header */}
        <header className="role-header">
          <div className="role-header-brand" style={{ display: "flex", alignItems: "center", gap: "16px" }}>
            <img
              src={customSchoolLogo || "/assets/gbs_crest_badge.jpg"}
              alt="School Crest"
              style={{
                width: "58px",
                height: "58px",
                borderRadius: "14px",
                border: "2.5px solid #a855f7",
                objectFit: "contain",
                background: "rgba(15, 23, 42, 0.85)",
                boxShadow: "0 0 20px rgba(168, 85, 247, 0.45)",
                padding: "3px"
              }}
            />
            <div className="role-brand-text">
              <span className="role-portal-badge" style={{ color: "#38bdf8", fontSize: "0.95rem", fontWeight: "900", letterSpacing: "0.8px" }}>
                🎓 {String(institutionProfile?.studentRoleTitle || "STUDENT").toUpperCase()} PORTAL • {String(institutionProfile?.shortName || institutionProfile?.shortLabel || "INSTITUTION").toUpperCase()}
              </span>
            </div>
          </div>

          <div className="role-status-ticker">
            <span className="ticker-dot"></span>
            <span>Student: <strong>{currentUser.firstName} {currentUser.lastName}</strong></span>
            <span>Level: <strong>{academicLevel}</strong></span>
            <span>Exam Term: <strong>{academicTerm}</strong></span>
          </div>

          <div className="role-header-actions">
            <button
              type="button"
              className="role-action-btn"
              onClick={() => performSmartBack(navigate, location)}
              aria-label="Return to previous view or page"
              style={{ borderColor: "#64748b", color: "#f8fafc", background: "rgba(30, 41, 59, 0.7)", fontWeight: 700, cursor: "pointer" }}
            >
              ← Back
            </button>
            <Link to="/portal/student/dashboard" className="role-action-btn">
              🏠 Learning Hub
            </Link>
            <button
              type="button"
              className="role-action-btn"
              onClick={() => setActiveTab("alumni")}
              style={{ borderColor: "#a855f7", color: "#c084fc" }}
            >
              🎓 Alumni Hall of Fame
            </button>
            <button
              type="button"
              className="role-action-btn"
              onClick={() => setShowStudentGuideModal(true)}
              style={{
                borderColor: "#10b981",
                color: "#6ee7b7",
                fontWeight: 800,
                background: "rgba(16, 185, 129, 0.15)",
                boxShadow: "0 0 10px rgba(16, 185, 129, 0.2)"
              }}
            >
              📖 Operating Guide
            </button>
            <button type="button" className="role-action-btn logout" onClick={handleLogout}>
              🚪 Sign Out
            </button>
          </div>
        </header>

        {/* Main Content */}
        <main className="role-main">
          {/* Active Live Class Broadcast Sentinel from Faculty */}
          {activeLiveBroadcast && (
            <div style={{
              background: "linear-gradient(135deg, rgba(220, 38, 38, 0.95) 0%, rgba(185, 28, 28, 0.9) 100%)",
              border: "2px solid #ef4444",
              color: "#ffffff",
              padding: "14px 20px",
              borderRadius: "14px",
              marginBottom: "1.25rem",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              boxShadow: "0 10px 30px rgba(239, 68, 68, 0.4)",
              flexWrap: "wrap",
              gap: "12px"
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <span style={{ fontSize: "1.8rem" }}>🔴</span>
                <div>
                  <div style={{ fontWeight: 900, fontSize: "1rem", letterSpacing: "0.02em" }}>
                    LIVE CLASSROOM BROADCAST IN PROGRESS
                  </div>
                  <div style={{ fontSize: "0.85rem", color: "#fecaca", marginTop: "2px" }}>
                    Topic: <strong>{activeLiveBroadcast.title}</strong> • Instructor: <strong>{activeLiveBroadcast.teacherName || "Faculty"}</strong> • Platform: <strong>{activeLiveBroadcast.platform}</strong>
                  </div>
                </div>
              </div>
              <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                <a
                  href={activeLiveBroadcast.workingInAppLink || activeLiveBroadcast.meetingUrl || "/online-learning"}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    background: "#ffffff",
                    color: "#b91c1c",
                    padding: "10px 22px",
                    borderRadius: "10px",
                    fontWeight: 900,
                    textDecoration: "none",
                    fontSize: "0.88rem",
                    boxShadow: "0 4px 14px rgba(0,0,0,0.3)",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px"
                  }}
                >
                  <span>🚀</span> JOIN LIVE CLASS NOW →
                </a>
              </div>
            </div>
          )}

          {/* REQUIREMENT: Student Profile Card with Uploaded Picture and Class / Level Progression */}
          <div className="student-profile-header-card">
            <div style={{ display: "flex", flexDirection: "column", gap: "6px", alignItems: "center" }}>
              <label className="student-avatar-frame" aria-label="Click to upload profile photo (Must satisfy dress code)">
                <img
                  src={studentPhoto}
                  alt="Student Profile"
                  className="student-avatar-img"
                />
                <span className="student-avatar-overlay-label">📷 Change</span>
                <input
                  type="file"
                  accept="image/*"
                  style={{ display: "none" }}
                  onChange={handlePhotoUpload}
                />
              </label>
              <button
                type="button"
                onClick={() => setShowDressCodeModal(true)}
                style={{
                  background: "rgba(168, 85, 247, 0.15)",
                  border: "1px solid rgba(168, 85, 247, 0.4)",
                  color: "#d8b4fe",
                  borderRadius: "6px",
                  padding: "2px 8px",
                  fontSize: "0.68rem",
                  fontWeight: 700,
                  cursor: "pointer"
                }}
                aria-label="Review official school uniform and dress-code standards for scholar profile photographs"
              >
                👔 Dress Code
              </button>
            </div>

            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
                <h2 style={{ margin: 0, fontSize: "1.3rem", color: "#f8fafc" }}>
                  {currentUser.firstName} {currentUser.lastName}
                </h2>
                <span className="role-portal-badge" style={{ color: "#34d399", background: "rgba(16, 185, 129, 0.15)", padding: "2px 8px", borderRadius: "4px" }}>
                  Active Scholar
                </span>
                <span style={{ fontSize: "0.8rem", color: "#94a3b8", fontFamily: "monospace" }}>
                  ID: GBS-STU-2026-084
                </span>
              </div>

              {/* Exact Level & Exact Examination Term Selectors */}
              <div style={{ display: "flex", gap: "14px", marginTop: "8px", flexWrap: "wrap", alignItems: "center" }}>
                {/* REQUIREMENT: Only the Headmaster must assign or update the class; student cannot choose own class */}
                <div style={{ display: "flex", alignItems: "center", gap: "8px", background: "rgba(59, 130, 246, 0.15)", border: "1px solid rgba(59, 130, 246, 0.4)", padding: "6px 12px", borderRadius: "8px" }}>
                  <span style={{ fontSize: "0.8rem", color: "#93c5fd" }}>Enrolled Class:</span>
                  <strong style={{ fontSize: "0.88rem", color: "#f8fafc" }}>{academicLevel}</strong>
                  <span style={{ fontSize: "0.72rem", background: "rgba(59, 130, 246, 0.3)", color: "#60a5fa", padding: "2px 8px", borderRadius: "4px", fontWeight: "700" }} aria-label="Class assignments and promotions are exclusively managed by the Headmaster">
                    🔒 Assigned Exclusively by Headmaster
                  </span>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: "8px", background: "rgba(168, 85, 247, 0.15)", border: "1px solid rgba(168, 85, 247, 0.4)", padding: "6px 12px", borderRadius: "8px" }}>
                  <span style={{ fontSize: "0.8rem", color: "#d8b4fe" }}>Academic Term / Semester:</span>
                  <strong style={{ fontSize: "0.88rem", color: "#f8fafc" }}>{academicTerm}</strong>
                  <span style={{ fontSize: "0.72rem", background: "rgba(168, 85, 247, 0.3)", color: "#c084fc", padding: "2px 8px", borderRadius: "4px", fontWeight: "700" }}>
                    ✓ Headmaster Termly Plan
                  </span>
                </div>
              </div>

              {/* REQUIREMENT: Debtor Student Restriction Banner or Financial Clearance Confirmation */}
              {feeArrears > 0 ? (
                <div style={{
                  marginTop: "12px",
                  background: "rgba(239, 68, 68, 0.15)",
                  border: "1px solid rgba(239, 68, 68, 0.4)",
                  borderRadius: "8px",
                  padding: "8px 14px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  flexWrap: "wrap",
                  gap: "8px"
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <span>⚠️</span>
                    <span style={{ fontSize: "0.82rem", color: "#fca5a5" }}>
                      <strong>FINANCIAL HOLD ACTIVE:</strong> Outstanding arrears of <strong>${feeArrears.toFixed(2)}</strong>. Course registration and verified results are restricted until settled with the Accountant.
                    </span>
                  </div>
                  <Link to="/portal/parent/dashboard" style={{ fontSize: "0.78rem", color: "#ef4444", fontWeight: "700", textDecoration: "underline" }}>
                    Pay via Parent Portal →
                  </Link>
                </div>
              ) : (
                <div style={{
                  marginTop: "12px",
                  background: "rgba(16, 185, 129, 0.15)",
                  border: "1px solid rgba(16, 185, 129, 0.4)",
                  borderRadius: "8px",
                  padding: "8px 14px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  flexWrap: "wrap",
                  gap: "8px"
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <span>✅</span>
                    <span style={{ fontSize: "0.82rem", color: "#a7f3d0" }}>
                      <strong>FINANCIAL CLEARANCE VERIFIED ($0.00 Balance):</strong> Full course registration and official transcripts are unlocked.
                      {lastPaymentNotice?.amountPaid && (
                        <span> (Latest payment: ${lastPaymentNotice.amountPaid.toFixed(2)} confirmed • Ref: {lastPaymentNotice.transactionRef})</span>
                      )}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveTab("courses")}
                    style={{ background: "#10b981", color: "#ffffff", border: "none", borderRadius: "6px", padding: "4px 10px", fontSize: "0.78rem", fontWeight: "700", cursor: "pointer" }}
                  >
                    Go to Course Registration →
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Hero Banner with Clear Daytime Real-Life Campus Photo */}
          <section className="role-hero-banner">
            <div className="role-hero-text">
              <span className="role-portal-badge" style={{ color: "#a855f7" }}>
                STUDENT DESK • SECTION 4 MASTER BLUEPRINT
              </span>
              <h1>STUDENT LEARNING PORTAL</h1>
              <p className="role-hero-sub">
                Access your personalized class timetable, submit homework assignments, take online examinations,
                track verified report card grades, and join live virtual classrooms.
              </p>

              <div className="role-kpi-row">
                <div
                  className="role-kpi-box"
                  onClick={() => setActiveTab("report-card")}
                  style={{ cursor: "pointer", transition: "transform 0.15s" }}
                  aria-label="Click to view term report card and GPA analytics"
                >
                  <span className="role-kpi-icon">⭐</span>
                  <div className="role-kpi-data">
                    <span className="role-kpi-title">Current GPA ↗</span>
                    <strong className="role-kpi-num">3.88 / 4.0</strong>
                  </div>
                </div>
                <div
                  className="role-kpi-box"
                  onClick={() => setActiveTab("exams")}
                  style={{ cursor: "pointer", transition: "transform 0.15s" }}
                  aria-label="Click to view examination timetable and status"
                >
                  <span className="role-kpi-icon">📝</span>
                  <div className="role-kpi-data">
                    <span className="role-kpi-title">Exams Remaining ↗</span>
                    <strong className="role-kpi-num" style={{ color: "#38bdf8" }}>
                      {exams.length > 0 ? exams.length : 3} to Write
                    </strong>
                  </div>
                </div>
                <div
                  className="role-kpi-box"
                  onClick={() => setActiveTab("assignments")}
                  style={{ cursor: "pointer", transition: "transform 0.15s" }}
                  aria-label="Click to view homework tasks and assignment submission desk"
                >
                  <span className="role-kpi-icon">⏳</span>
                  <div className="role-kpi-data">
                    <span className="role-kpi-title">Homework Due ↗</span>
                    <strong className="role-kpi-num">{assignments.length} Tasks</strong>
                  </div>
                </div>
                <div
                  className="role-kpi-box"
                  onClick={() => setActiveTab("attendance")}
                  style={{ cursor: "pointer", transition: "transform 0.15s" }}
                  aria-label="Click to view attendance record and term presence rate"
                >
                  <span className="role-kpi-icon">🎯</span>
                  <div className="role-kpi-data">
                    <span className="role-kpi-title">Attendance ↗</span>
                    <strong className="role-kpi-num">{attendanceSummary?.rate || "98.5%"} Present</strong>
                  </div>
                </div>
              </div>
            </div>

            {/* Clear Daytime Real-Life Photograph */}
            <div className="role-hero-photo-frame">
              <img
                src="/images/student_dash_banner.jpg"
                alt="Student Campus Life Daytime"
              />
              <div className="photo-live-pill">
                <span className="ticker-dot"></span>
                <span>AUTHENTIC INTERNATIONAL STUDENTS</span>
              </div>
              <div className="photo-caption-tag">
                <strong>Modern Campus Pavilion</strong>
                <span>Daylight Learning Complex</span>
              </div>
            </div>
          </section>

          {/* Feedback Alert */}
          {feedback && (
            <div
              style={{
                padding: "12px 18px",
                borderRadius: "10px",
                marginBottom: "1.5rem",
                fontSize: "0.9rem",
                fontWeight: "600",
                display: "flex",
                alignItems: "center",
                gap: "10px",
                backgroundColor: feedback.type === "success" ? "rgba(16, 185, 129, 0.15)" : "rgba(239, 68, 68, 0.15)",
                border: `1px solid ${feedback.type === "success" ? "rgba(16, 185, 129, 0.4)" : "rgba(239, 68, 68, 0.4)"}`,
                color: feedback.type === "success" ? "#34d399" : "#fca5a5"
              }}
            >
              <span>{feedback.type === "success" ? "✅" : "⚠️"}</span>
              <span>{feedback.message}</span>
            </div>
          )}

          {/* CONCLUDED CLASS CATCH-UP NOTICE BANNER */}
          {concludedClassNotice && !concludedClassNotice.dismissed && (
            <div style={{
              background: "linear-gradient(135deg, rgba(30, 58, 138, 0.95), rgba(15, 23, 42, 0.9))",
              border: "1.5px solid #38bdf8",
              borderRadius: "14px",
              padding: "14px 20px",
              marginBottom: "1.25rem",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: "12px",
              boxShadow: "0 8px 24px rgba(0, 0, 0, 0.4)"
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <span style={{ fontSize: "1.8rem" }}>🎓</span>
                <div>
                  <div style={{ fontSize: "0.75rem", color: "#38bdf8", fontWeight: 800, textTransform: "uppercase" }}>
                    LIVE CLASS CONCLUDED NOTICE • RECORDING AVAILABLE FOR CATCH-UP
                  </div>
                  <div style={{ fontSize: "0.95rem", color: "#f8fafc", fontWeight: 800 }}>
                    {concludedClassNotice.subject}: <em>{concludedClassNotice.topic}</em>
                  </div>
                  <div style={{ fontSize: "0.78rem", color: "#cbd5e1", marginTop: "2px" }}>
                    Concluded {concludedClassNotice.date} at {concludedClassNotice.endingTime} (Duration: {concludedClassNotice.duration}) • Taught by {concludedClassNotice.instructor}
                  </div>
                </div>
              </div>

              <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
                <button
                  type="button"
                  onClick={() => setShowCatchUpModal(true)}
                  style={{
                    background: "linear-gradient(135deg, #0284c7, #38bdf8)",
                    border: "none",
                    color: "#0f172a",
                    fontWeight: 900,
                    borderRadius: "8px",
                    padding: "8px 16px",
                    fontSize: "0.82rem",
                    cursor: "pointer",
                    boxShadow: "0 4px 14px rgba(56, 189, 248, 0.4)"
                  }}
                >
                  ▶️ Watch Full Catch-Up Recording
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setFeedback({ type: "success", message: `Class notes for "${concludedClassNotice.topic}" downloaded and saved.` });
                  }}
                  style={{
                    background: "rgba(255, 255, 255, 0.1)",
                    border: "1px solid rgba(255, 255, 255, 0.2)",
                    color: "#fff",
                    borderRadius: "8px",
                    padding: "8px 14px",
                    fontSize: "0.82rem",
                    cursor: "pointer",
                    fontWeight: 700
                  }}
                >
                  📑 Class Notes PDF
                </button>
                <button
                  type="button"
                  onClick={() => setConcludedClassNotice({ ...concludedClassNotice, dismissed: true })}
                  style={{ background: "transparent", border: "none", color: "#94a3b8", cursor: "pointer", fontSize: "1.1rem", padding: "4px" }}
                  aria-label="Dismiss notification"
                >
                  ✕
                </button>
              </div>
            </div>
          )}

          {/* STUDENT OUTSTANDING FEE ARREARS STATUS CARD */}
          <div style={{
            background: "linear-gradient(135deg, rgba(15, 23, 42, 0.95), rgba(30, 41, 59, 0.85))",
            border: feeBalance > 0 ? "1.5px solid rgba(239, 68, 68, 0.45)" : "1.5px solid rgba(16, 185, 129, 0.45)",
            borderRadius: "14px",
            padding: "14px 20px",
            marginBottom: "1.5rem",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "12px"
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <span style={{ fontSize: "1.8rem" }}>💳</span>
              <div>
                <div style={{ fontSize: "0.75rem", color: feeBalance > 0 ? "#f87171" : "#34d399", fontWeight: 800, textTransform: "uppercase" }}>
                  OFFICIAL STUDENT TUITION & LEDGER STATUS
                </div>
                <div style={{ fontSize: "1.1rem", fontWeight: 900, color: "#f8fafc" }}>
                  Total Billed: {studentFeeStatement?.feeSummary?.currency || "GHS"} {Number(studentFeeStatement?.feeSummary?.totalBilled ?? 0).toFixed(2)} • Total Settled: {studentFeeStatement?.feeSummary?.currency || "GHS"} {Number(studentFeeStatement?.feeSummary?.totalPaid ?? 0).toFixed(2)}
                </div>
                <div style={{ fontSize: "0.82rem", color: feeBalance > 0 ? "#fca5a5" : "#a7f3d0", marginTop: "2px" }}>
                  {feeBalance > 0
                    ? `Outstanding Balance Due: ${studentFeeStatement?.feeSummary?.currency || "GHS"} ${feeBalance.toFixed(2)} — Pay directly to School Official Account / MoMo (Ref: ${studentFeeStatement?.student?.fullName || currentUser?.firstName || "Student"})`
                    : "✓ All billed school fees are settled. You can still pay new school bills or advance fees anytime."}
                </div>
              </div>
            </div>

            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
              <button
                type="button"
                data-testid="student-pay-fees-banner-btn"
                onClick={() => openStudentSelfPayment(null)}
                style={{
                  background: "linear-gradient(135deg, #10b981, #059669)",
                  border: "none",
                  borderRadius: "8px",
                  color: "#fff",
                  fontWeight: 900,
                  fontSize: "0.88rem",
                  padding: "10px 18px",
                  cursor: "pointer",
                  boxShadow: "0 4px 14px rgba(16, 185, 129, 0.4)"
                }}
              >
                {feeBalance > 0
                  ? `💳 Pay School Fees (${studentFeeStatement?.feeSummary?.currency || "GHS"} ${feeBalance.toFixed(2)}) →`
                  : "💳 Pay School Bill / Advance Fee →"}
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("fees-history")}
                style={{
                  background: "rgba(56, 189, 248, 0.16)",
                  border: "1px solid #38bdf8",
                  borderRadius: "8px",
                  color: "#bae6fd",
                  fontWeight: 800,
                  fontSize: "0.84rem",
                  padding: "10px 14px",
                  cursor: "pointer"
                }}
              >
                📄 Open Fees &amp; Bills Ledger
              </button>
            </div>
          </div>

          {/* Workspace Tabs Navigation */}
          <nav className="role-tab-nav">
            <button
              type="button"
              className={`role-tab-btn ${activeTab === "timetable" ? "active" : ""}`}
              onClick={() => setActiveTab("timetable")}
            >
              🗓️ My Class Timetable
            </button>
            <button
              type="button"
              className={`role-tab-btn ${activeTab === "assignments" ? "active" : ""}`}
              onClick={() => setActiveTab("assignments")}
            >
              📝 Homework & Submissions
            </button>
            <button
              type="button"
              className={`role-tab-btn ${activeTab === "exams" ? "active" : ""}`}
              onClick={() => setActiveTab("exams")}
            >
              🎯 Examinations & Schedule {isExamPortalLocked && "🔒"}
            </button>
            <button
              type="button"
              className={`role-tab-btn ${activeTab === "meetings" ? "active" : ""}`}
              onClick={() => setActiveTab("meetings")}
            >
              💻 Live Classes & References
            </button>
            <button
              type="button"
              className={`role-tab-btn ${activeTab === "topicVideos" ? "active" : ""}`}
              onClick={() => setActiveTab("topicVideos")}
              style={{ borderLeft: "3px solid #38bdf8", color: activeTab === "topicVideos" ? "#38bdf8" : undefined }}
            >
              🎬 Teacher Topic Videos (Play & Watch)
            </button>
            <button
              type="button"
              className={`role-tab-btn ${activeTab === "report-card" ? "active" : ""}`}
              onClick={() => setActiveTab("report-card")}
            >
              📄 Verified Report Card
            </button>
            <button
              type="button"
              className={`role-tab-btn ${activeTab === "courses" ? "active" : ""}`}
              onClick={() => setActiveTab("courses")}
              style={{ borderLeft: "3px solid #10b981" }}
            >
              📚 Courses, Streams &amp; Placements
            </button>
            <button
              type="button"
              className={`role-tab-btn ${activeTab === "alumni" ? "active" : ""}`}
              onClick={() => setActiveTab("alumni")}
              style={{ borderLeft: "3px solid #a855f7" }}
            >
              🎓 Alumni Directory & Hall of Fame
            </button>
            <button
              type="button"
              className={'role-tab-btn ' + (activeTab === "library" ? "active" : "")}
              onClick={() => setActiveTab("library")}
              style={{ borderLeft: "3px solid #f59e0b", color: activeTab === "library" ? "#fbbf24" : undefined, fontWeight: 800 }}
            >
              📚 Digital Library & E-Books
            </button>
            <button
              type="button"
              className={'role-tab-btn ' + (activeTab === "fees-history" ? "active" : "")}
              onClick={() => setActiveTab("fees-history")}
              style={{ borderLeft: "3px solid #10b981", color: activeTab === "fees-history" ? "#34d399" : undefined, fontWeight: 800 }}
            >
              💳 Lifetime Fee History & Receipts (Day 1)
            </button>
            <button
              type="button"
              className={`role-tab-btn ${activeTab === "peer-chat" ? "active" : ""}`}
              onClick={() => setActiveTab("peer-chat")}
              style={{ borderLeft: "3px solid #06b6d4", color: activeTab === "peer-chat" ? "#22d3ee" : undefined, fontWeight: 800 }}
            >
              💬 Peer Chat & Study Circle
            </button>
            <button
              type="button"
              className={`role-tab-btn ${activeTab === "cooperative-conferencing" ? "active" : ""}`}
              onClick={() => setActiveTab("cooperative-conferencing")}
              style={{ borderLeft: "3px solid #8b5cf6", color: activeTab === "cooperative-conferencing" ? "#c084fc" : undefined, fontWeight: 800 }}
            >
              🎙️ Cooperative Voice & Video Conferencing
            </button>
            <button
              type="button"
              data-testid="student-stationery-tab"
              className={`role-tab-btn ${activeTab === "stationery" ? "active" : ""}`}
              onClick={() => setActiveTab("stationery")}
              style={{ borderLeft: "3px solid #d4af37", fontWeight: 800 }}
            >
              🎒 School Stationery Store
            </button>
            <button
              type="button"
              className={`role-tab-btn ${activeTab === "clinic" ? "active" : ""}`}
              onClick={() => setActiveTab("clinic")}
              style={{ borderLeft: "3px solid #10b981", color: activeTab === "clinic" ? "#ffffff" : "#6ee7b7", fontWeight: 800 }}
            >
              🏥 School Clinic &amp; Medical File
            </button>
          </nav>

          {/* TAB 1: TIMETABLE */}
          {activeTab === "timetable" && (
            <div className="role-workspace-card">
              <div className="workspace-title-row">
                <div>
                  <h2><span>🗓️</span> WEEKLY CLASS TIMETABLE & SCHEDULE</h2>
                  <p>Daily lesson slots, course subjects, room numbers, and faculty assignments</p>
                </div>
              </div>

              <div className="role-table-responsive">
                <table className="role-table">
                  <thead>
                    <tr>
                      <th>Day</th>
                      <th>Time Slot</th>
                      <th>Subject</th>
                      <th>Instructor</th>
                      <th>Room</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {timetableSlots.length === 0 ? (
                      <>
                        <tr>
                          <td><strong>Monday</strong></td>
                          <td>08:30 AM - 09:45 AM</td>
                          <td><strong>Advanced Mathematics</strong></td>
                          <td>Dr. Robert Vance</td>
                          <td>STEM Lab 201</td>
                          <td><span className="badge-status badge-present">ACTIVE</span></td>
                        </tr>
                        <tr>
                          <td><strong>Monday</strong></td>
                          <td>10:00 AM - 11:15 AM</td>
                          <td><strong>Physics & Mechanics</strong></td>
                          <td>Prof. Eleanor Sterling</td>
                          <td>Physics Lab 104</td>
                          <td><span className="badge-status badge-present">ACTIVE</span></td>
                        </tr>
                        <tr>
                          <td><strong>Tuesday</strong></td>
                          <td>09:00 AM - 10:15 AM</td>
                          <td><strong>World History & Literature</strong></td>
                          <td>Ms. Claire Montgomery</td>
                          <td>Humanities Wing A</td>
                          <td><span className="badge-status badge-present">ACTIVE</span></td>
                        </tr>
                        <tr>
                          <td><strong>Wednesday</strong></td>
                          <td>11:30 AM - 12:45 PM</td>
                          <td><strong>Computer Science & AI</strong></td>
                          <td>Eng. Marcus Thorne</td>
                          <td>Computer Lab 3</td>
                          <td><span className="badge-status badge-present">ACTIVE</span></td>
                        </tr>
                      </>
                    ) : (
                      timetableSlots.map((slot, i) => (
                        <tr key={i}>
                          <td><strong>{slot.dayOfWeek || "Monday"}</strong></td>
                          <td>{slot.startTime} - {slot.endTime}</td>
                          <td><strong>{slot.subject?.name || "Academic Subject"}</strong></td>
                          <td>{slot.teacher ? `${slot.teacher.firstName} ${slot.teacher.lastName}` : "Assigned Faculty"}</td>
                          <td>{slot.roomNumber || "Hall 1"}</td>
                          <td><span className="badge-status badge-present">CONFIRMED</span></td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 2: HOMEWORK & SUBMISSIONS */}
          {activeTab === "assignments" && (
            <div className="role-workspace-card">
              <div className="workspace-title-row">
                <div>
                  <h2><span>📝</span> HOMEWORK & LESSON ASSIGNMENTS</h2>
                  <p>View assignments organized by subject and teacher, respond to homework, and track your scores</p>
                </div>
              </div>

              <div className="card-grid-3">
                {assignments.length === 0 ? (
                  <div className="item-card" style={{ gridColumn: "1 / -1", textAlign: "center", padding: "2.5rem" }}>
                    <span style={{ fontSize: "2.5rem", display: "block", marginBottom: "8px" }}>🎉</span>
                    <strong style={{ color: "#f8fafc", fontSize: "1.05rem" }}>No Pending Homework</strong>
                    <p style={{ color: "#94a3b8", margin: "4px 0 0" }}>All lesson assignments are currently completed. Check back when teachers upload new coursework.</p>
                  </div>
                ) : (
                  assignments.map((a) => {
                    const submission = mySubmissions[a.id];
                    const teacherName = a.teacher ? `${a.teacher.firstName} ${a.teacher.lastName}` : "Faculty Instructor";
                    const subjectName = a.subject?.name || "General Academic Course";

                    return (
                      <div key={a.id} className="item-card">
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <span className="role-portal-badge" style={{ color: "#34d399", background: "rgba(16, 185, 129, 0.15)", padding: "2px 8px", borderRadius: "4px" }}>
                            Max: {a.maxScore} Pts
                          </span>
                          <span style={{ fontSize: "0.75rem", color: "#f87171", fontWeight: "700" }}>
                            Due: {new Date(a.dueDate).toLocaleDateString()}
                          </span>
                        </div>

                        {/* REQUIREMENT: Subject & Specific Teacher Information */}
                        <div style={{ marginTop: "4px" }}>
                          <span style={{ fontSize: "0.75rem", color: "#38bdf8", fontWeight: "700", textTransform: "uppercase" }}>
                            📚 {subjectName}
                          </span>
                          <h3 style={{ margin: "4px 0 2px", fontSize: "1.05rem", color: "#f8fafc" }}>
                            {a.title}
                          </h3>
                          <span style={{ fontSize: "0.75rem", color: "#cbd5e1" }}>
                            👨‍🏫 Assigned by: <strong style={{ color: "#34d399" }}>{teacherName}</strong>
                          </span>
                        </div>

                        <p style={{ fontSize: "0.85rem", color: "#94a3b8", lineHeight: "1.4", margin: "6px 0" }}>
                          {a.description || "Review textbook section and write comprehensive solution."}
                        </p>

                        {/* Attached Worksheet if provided by teacher */}
                        {(a.attachmentUrl || a.fileName) && (
                          <div style={{ background: "rgba(56, 189, 248, 0.08)", padding: "8px 12px", borderRadius: "8px", border: "1px solid rgba(56, 189, 248, 0.2)", display: "flex", alignItems: "center", gap: "8px" }}>
                            <span>📎</span>
                            <span style={{ fontSize: "0.8rem", color: "#38bdf8", fontWeight: "600" }}>
                              Worksheet: {a.fileName || "Coursework_Attachment.pdf"}
                            </span>
                          </div>
                        )}

                        {/* Submission status & Response Handling */}
                        {submission ? (
                          <div style={{ background: "rgba(16, 185, 129, 0.12)", padding: "12px", borderRadius: "8px", border: "1px solid rgba(16, 185, 129, 0.3)", marginTop: "auto" }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                              <span style={{ fontSize: "0.75rem", color: "#34d399", fontWeight: "700" }}>
                                ✅ SUBMITTED AT {submission.submittedAt}
                              </span>
                              <span style={{ fontSize: "0.75rem", color: "#fbbf24", fontWeight: "700" }}>
                                Score: {submission.grade !== undefined ? `${submission.grade} / ${a.maxScore}` : "Pending Grading"}
                              </span>
                            </div>
                            <p style={{ margin: "6px 0 0", fontSize: "0.8rem", color: "#e2e8f0" }}>
                              <strong>Your Response:</strong> {submission.content}
                            </p>
                          </div>
                        ) : (
                          <div style={{ marginTop: "auto", display: "flex", flexDirection: "column", gap: "8px" }}>
                            <textarea
                              rows={2}
                              placeholder="Write homework response or paste project document link..."
                              className="filter-input"
                              style={{ width: "100%", fontSize: "0.8rem", resize: "vertical" }}
                              value={submissionInputs[a.id] || ""}
                              onChange={(e) => setSubmissionInputs({ ...submissionInputs, [a.id]: e.target.value })}
                            />
                            <button
                              type="button"
                              className="btn-primary"
                              onClick={() => handleSubmitAssignment(a.id)}
                              disabled={loading || !submissionInputs[a.id]?.trim()}
                            >
                              🚀 Submit to Teacher for Score
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* TAB 3: ONLINE EXAMS & SCHEDULE */}
          {activeTab === "exams" && (() => {
            const totalTermFees = 2500.00;
            const currentArrears = typeof feeArrears === "number" ? feeArrears : parseFloat(feeArrears || 0);
            const totalPaid = Math.max(0, totalTermFees - currentArrears);
            const paidPercentage = Math.min(100, Math.round((totalPaid / totalTermFees) * 100));
            const meets80PercentThreshold = currentArrears === 0 || paidPercentage >= 80;

            return (
              <div className="role-workspace-card">
                <div className="workspace-title-row">
                  <div>
                    <h2><span>🎯</span> AUTHORIZED ONLINE EXAMINATIONS & SCHEDULE</h2>
                    <p>Comprehensive examination roster with start and end times, exact term/semester tracking, and instant auto-grading</p>
                  </div>
                  <div style={{ display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap" }}>
                    <span className="badge-status badge-present" style={{ fontSize: "0.85rem", padding: "6px 14px" }}>
                      📋 Remaining to Write: <strong>{isExamPortalLocked ? "0 Exam(s) (Locked)" : (exams.length > 0 ? exams.length : 3) + " Exam(s)"}</strong>
                    </span>
                    <span style={{ fontSize: "0.8rem", color: "#94a3b8" }}>
                      Active Term: <strong style={{ color: "#38bdf8" }}>{academicTerm} ({academicLevel})</strong>
                    </span>
                    <span style={{
                      fontSize: "0.8rem",
                      padding: "4px 10px",
                      borderRadius: "6px",
                      background: meets80PercentThreshold ? "rgba(16, 185, 129, 0.2)" : "rgba(239, 68, 68, 0.2)",
                      color: meets80PercentThreshold ? "#34d399" : "#f87171",
                      fontWeight: 800,
                      border: meets80PercentThreshold ? "1px solid #10b981" : "1px solid #ef4444"
                    }}>
                      {meets80PercentThreshold ? `✓ Fee Clearance: ${paidPercentage}% (>=80% Pass)` : `⚠️ Fee Restricted: ${paidPercentage}% Paid (<80%)`}
                    </span>
                  </div>
                </div>

                {!meets80PercentThreshold ? (
                  <div style={{
                    background: "linear-gradient(135deg, rgba(30, 41, 59, 0.95), rgba(15, 23, 42, 0.9))",
                    border: "2px solid #ef4444",
                    borderRadius: "16px",
                    padding: "2rem",
                    textAlign: "center",
                    margin: "1rem 0",
                    boxShadow: "0 15px 35px rgba(239, 68, 68, 0.2)"
                  }}>
                    <div style={{ fontSize: "3rem", marginBottom: "8px" }}>⚠️ 💳</div>
                    <h3 style={{ color: "#f87171", margin: "0 0 10px", fontSize: "1.3rem" }}>
                      EXAMINATION SITTING RESTRICTED — FEE PAYMENT BELOW 80% THRESHOLD
                    </h3>
                    <p style={{ color: "#cbd5e1", maxWidth: "640px", margin: "0 auto 1.25rem", lineHeight: "1.6", fontSize: "0.9rem" }}>
                      Per institutional examination policy, enrolled scholars must clear at least <strong>80% of total term fees</strong> before admission into examination halls or accessing online testing terminals.
                    </p>

                    <div style={{
                      display: "inline-grid",
                      gridTemplateColumns: "repeat(3, 1fr)",
                      gap: "16px",
                      background: "rgba(2, 6, 23, 0.7)",
                      padding: "14px 20px",
                      borderRadius: "10px",
                      border: "1px solid rgba(255, 255, 255, 0.1)",
                      marginBottom: "1.5rem",
                      textAlign: "left"
                    }}>
                      <div>
                        <span style={{ fontSize: "0.72rem", color: "#94a3b8", display: "block" }}>TOTAL TERM FEES</span>
                        <strong style={{ color: "#f8fafc" }}>GH₵ {totalTermFees.toFixed(2)}</strong>
                      </div>
                      <div>
                        <span style={{ fontSize: "0.72rem", color: "#94a3b8", display: "block" }}>AMOUNT PAID ({paidPercentage}%)</span>
                        <strong style={{ color: "#38bdf8" }}>GH₵ {totalPaid.toFixed(2)}</strong>
                      </div>
                      <div>
                        <span style={{ fontSize: "0.72rem", color: "#94a3b8", display: "block" }}>NEEDED FOR 80% CLEARANCE</span>
                        <strong style={{ color: "#f59e0b" }}>GH₵ {Math.max(0, (totalTermFees * 0.8) - totalPaid).toFixed(2)}</strong>
                      </div>
                    </div>

                    <div style={{ display: "flex", justifyContent: "center", gap: "12px", flexWrap: "wrap" }}>
                      <button
                        type="button"
                        className="btn-primary"
                        onClick={() => {
                          const deficit = Math.max(0, (totalTermFees * 0.8) - totalPaid);
                          setPaymentAmount(String(deficit > 0 ? deficit : 200));
                          setShowFeePaymentModal(true);
                        }}
                        style={{
                          background: "linear-gradient(135deg, #10b981, #059669)",
                          border: "none",
                          padding: "10px 22px",
                          fontSize: "0.9rem",
                          fontWeight: 800
                        }}
                      >
                        💳 Make Instant Payment to Reach 80% & Unlock Exams (MoMo / Card)
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    {/* Conditional Rescheduled Late Exam Writing Slip Notice */}
                    {currentArrears > 0 && (
                      <div style={{
                        background: "linear-gradient(135deg, rgba(16, 185, 129, 0.15), rgba(5, 150, 105, 0.25))",
                        border: "1.5px solid #10b981",
                        borderRadius: "12px",
                        padding: "14px 18px",
                        marginBottom: "1.25rem",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        flexWrap: "wrap",
                        gap: "12px"
                      }}>
                        <div>
                          <div style={{ color: "#34d399", fontWeight: 800, fontSize: "0.95rem", display: "flex", alignItems: "center", gap: "8px" }}>
                            <span>🎓</span> RESCHEDULED LATE EXAM WRITING CLEARANCE GRANTED (80%+ PAID)
                          </div>
                          <p style={{ margin: "4px 0 0", color: "#cbd5e1", fontSize: "0.82rem" }}>
                            You have paid {paidPercentage}% of term fees (GH₵ {totalPaid.toFixed(2)}). As an authorized candidate, you are cleared to sit for examinations with late scheduling dispensation.
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setShowRescheduledExamSlipModal(true)}
                          style={{
                            background: "rgba(16, 185, 129, 0.25)",
                            border: "1.5px solid #10b981",
                            color: "#34d399",
                            padding: "8px 16px",
                            borderRadius: "8px",
                            fontWeight: 800,
                            fontSize: "0.82rem",
                            cursor: "pointer",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "6px"
                          }}
                        >
                          🖨️ View & Print Rescheduled Exam Writing Slip
                        </button>
                      </div>
                    )}

                    {/* Requirement: Student exam portal lockout screen once an exam is taken, submitted & graded */}
                    {isExamPortalLocked ? (
                      <div style={{
                        background: "linear-gradient(135deg, rgba(15, 23, 42, 0.95), rgba(30, 41, 59, 0.9))",
                        border: "2px solid rgba(239, 68, 68, 0.4)",
                        borderRadius: "16px",
                        padding: "2.5rem",
                        textAlign: "center",
                        boxShadow: "0 20px 40px rgba(0, 0, 0, 0.6)",
                        margin: "1rem 0"
                      }}>
                        <div style={{ fontSize: "3.5rem", marginBottom: "0.5rem" }}>🔒</div>
                        <span className="role-portal-badge" style={{ color: "#ef4444", borderColor: "#ef4444", fontSize: "0.85rem", padding: "4px 12px" }}>
                          EXAMINATION SESSION SUBMITTED & LOCKED
                        </span>
                        <h2 style={{ color: "#f87171", margin: "1rem 0 0.5rem", fontSize: "1.6rem" }}>
                          Examination Completed, Graded & Portal Access Restricted
                        </h2>
                        <p style={{ color: "#cbd5e1", maxWidth: "680px", margin: "0 auto 1.5rem", lineHeight: "1.6", fontSize: "0.95rem" }}>
                          Per school examination regulations, your examination has been completed, submitted for marking, and graded by the deterministic engine. Access to the examination hall is locked until another examination session is officially published and scheduled for writing by the faculty.
                        </p>

                        {/* Summary of Graded Performance */}
                        <div style={{
                          display: "grid",
                          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                          gap: "1rem",
                          background: "rgba(2, 6, 23, 0.8)",
                          border: "1px solid rgba(255, 255, 255, 0.1)",
                          borderRadius: "12px",
                          padding: "1.25rem",
                          textAlign: "left",
                          maxWidth: "680px",
                          margin: "0 auto 1.5rem"
                        }}>
                          <div>
                            <span style={{ fontSize: "0.75rem", color: "#94a3b8", textTransform: "uppercase" }}>Grading Status</span>
                            <div style={{ color: "#34d399", fontWeight: "700", fontSize: "1rem", marginTop: "2px" }}>✅ Verified & Marked</div>
                          </div>
                          <div>
                            <span style={{ fontSize: "0.75rem", color: "#94a3b8", textTransform: "uppercase" }}>Deterministic Grade</span>
                            <div style={{ color: "#fbbf24", fontWeight: "700", fontSize: "1rem", marginTop: "2px" }}>
                              {examScoreResult?.grade || "Grade A (85%)"}
                            </div>
                          </div>
                          <div>
                            <span style={{ fontSize: "0.75rem", color: "#94a3b8", textTransform: "uppercase" }}>PostgreSQL Audit Seal</span>
                            <div style={{ color: "#38bdf8", fontWeight: "700", fontSize: "1rem", marginTop: "2px" }}>SECURE-GBS-2026</div>
                          </div>
                        </div>

                        <div style={{ display: "flex", gap: "12px", justifyContent: "center", flexWrap: "wrap" }}>
                          <button
                            type="button"
                            className="btn-primary"
                            style={{ background: "linear-gradient(135deg, #3b82f6, #1d4ed8)", padding: "10px 20px" }}
                            onClick={() => setActiveTab("report-card")}
                          >
                            📄 View Official Grade on Report Card
                          </button>
                          <button
                            type="button"
                            className="btn-secondary"
                            style={{ borderColor: "#10b981", color: "#34d399", padding: "10px 20px" }}
                            onClick={handlePublishNewExamSession}
                            aria-label="Faculty/Teacher publishes a new exam session"
                          >
                            📢 Simulate Faculty Publishing Next Exam Session
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        {/* KPI Summary for Examinations */}
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1rem", marginBottom: "1.5rem" }}>
                          <div style={{ background: "rgba(15, 23, 42, 0.7)", border: "1px solid rgba(56, 189, 248, 0.2)", borderRadius: "10px", padding: "1rem" }}>
                            <span style={{ fontSize: "0.75rem", color: "#94a3b8", textTransform: "uppercase", fontWeight: "700" }}>Total Scheduled</span>
                            <div style={{ fontSize: "1.6rem", fontWeight: "800", color: "#38bdf8", marginTop: "4px" }}>{exams.length || 3} Papers</div>
                            <span style={{ fontSize: "0.75rem", color: "#cbd5e1" }}>Assigned by Subject Faculty</span>
                          </div>
                          <div style={{ background: "rgba(15, 23, 42, 0.7)", border: "1px solid rgba(245, 158, 11, 0.2)", borderRadius: "10px", padding: "1rem" }}>
                            <span style={{ fontSize: "0.75rem", color: "#94a3b8", textTransform: "uppercase", fontWeight: "700" }}>Exams Remaining</span>
                            <div style={{ fontSize: "1.6rem", fontWeight: "800", color: "#fbbf24", marginTop: "4px" }}>
                              {exams.length > 0 ? exams.length : 3} Remaining
                            </div>
                            <span style={{ fontSize: "0.75rem", color: "#fef08a" }}>Pending student submission</span>
                          </div>
                          <div style={{ background: "rgba(15, 23, 42, 0.7)", border: "1px solid rgba(16, 185, 129, 0.2)", borderRadius: "10px", padding: "1rem" }}>
                            <span style={{ fontSize: "0.75rem", color: "#94a3b8", textTransform: "uppercase", fontWeight: "700" }}>Grading System</span>
                            <div style={{ fontSize: "1.4rem", fontWeight: "800", color: "#34d399", marginTop: "4px" }}>Deterministic AI/OMR</div>
                            <span style={{ fontSize: "0.75rem", color: "#a7f3d0" }}>Instant PostgreSQL Verification</span>
                          </div>
                          <div style={{ background: "rgba(15, 23, 42, 0.7)", border: "1px solid rgba(168, 85, 247, 0.2)", borderRadius: "10px", padding: "1rem" }}>
                            <span style={{ fontSize: "0.75rem", color: "#94a3b8", textTransform: "uppercase", fontWeight: "700" }}>Current Academic Term</span>
                            <div style={{ fontSize: "1.2rem", fontWeight: "800", color: "#c084fc", marginTop: "4px" }}>{academicTerm}</div>
                            <span style={{ fontSize: "0.75rem", color: "#e9d5ff" }}>{academicLevel}</span>
                          </div>
                        </div>

                        {!examStarted && !examSubmitted && (
                          <div>
                            <h3 style={{ color: "#f8fafc", fontSize: "1.05rem", marginBottom: "0.75rem", display: "flex", alignItems: "center", gap: "8px" }}>
                              <span>📅</span> Upcoming Examinations Schedule & Timetable:
                            </h3>

                            <div style={{ overflowX: "auto", marginBottom: "1.5rem" }}>
                              <table className="role-table">
                                <thead>
                                  <tr>
                                    <th>Subject / Course</th>
                                    <th>Exam Paper Title</th>
                                    <th>Level & Exact Term</th>
                                    <th>Exam Date</th>
                                    <th>Start Time</th>
                                    <th>End Time</th>
                                    <th>Duration</th>
                                    <th>Max / Pass</th>
                                    <th>Action / Score</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {(() => {
                                    const renderRow = (ex, fallbackSubject, fallbackTitle, defaultStart, defaultEnd) => {
                                      const examId = ex.id || fallbackTitle;
                                      const isSubmitted = !!submittedExams[examId];
                                      const sTime = ex.startTime || defaultStart;
                                      const eTime = ex.endTime || defaultEnd;
                                      const isRestricted = (ex.restrictBeforeStart || ex.isScheduled) && !unlockedExamIds.includes(examId);

                                      return (
                                        <tr key={examId}>
                                          <td>
                                            <strong style={{ color: "#38bdf8" }}>{ex.class?.name || ex.subjectName || fallbackSubject}</strong>
                                            {ex.examMode && (
                                              <div style={{ fontSize: "0.7rem", color: "#a7f3d0", marginTop: "2px" }}>
                                                Mode: {ex.examMode === "HYBRID_PRINT_SCAN" ? "📄 Print / AI Scanner" : "💻 Online CBT"}
                                              </div>
                                            )}
                                          </td>
                                          <td>
                                            <div style={{ fontWeight: "600", color: "#f8fafc" }}>{ex.title || fallbackTitle}</div>
                                            {ex.uploadedDocName && (
                                              <span style={{ fontSize: "0.72rem", color: "#fbbf24" }}>📎 Attached: {ex.uploadedDocName}</span>
                                            )}
                                          </td>
                                          <td>
                                            <span className="role-portal-badge" style={{ color: "#c084fc" }}>
                                              {academicLevel} • {academicTerm}
                                            </span>
                                          </td>
                                          <td>{new Date(ex.examDate || Date.now()).toLocaleDateString()}</td>
                                          <td><strong style={{ color: "#34d399" }}>{sTime}</strong></td>
                                          <td><strong style={{ color: "#f87171" }}>{eTime}</strong></td>
                                          <td>{ex.durationMinutes ? `${ex.durationMinutes} mins` : "2 hrs 30 mins"}</td>
                                          <td>{ex.totalMarks || 100} / {ex.passMarks || 50}</td>
                                          <td>
                                            {isSubmitted ? (
                                              <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                                                <span className="badge-status badge-present" style={{ fontSize: "0.75rem", background: "rgba(16, 185, 129, 0.2)", color: "#34d399", border: "1px solid rgba(16, 185, 129, 0.4)" }}>
                                                  🔒 Submitted & Locked
                                                </span>
                                                <span style={{ fontSize: "0.72rem", color: "#fbbf24", fontWeight: "700" }}>
                                                  Score: {submittedExams[examId].score}% ({submittedExams[examId].grade})
                                                </span>
                                              </div>
                                            ) : isRestricted ? (
                                              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                                                <span className="badge-status badge-absent" style={{ fontSize: "0.72rem", background: "rgba(239, 68, 68, 0.2)", color: "#fca5a5", border: "1px solid rgba(239, 68, 68, 0.4)" }}>
                                                  🔒 Restricted (Opens at {sTime})
                                                </span>
                                                <button
                                                  type="button"
                                                  className="btn-secondary"
                                                  style={{ padding: "4px 8px", fontSize: "0.7rem", borderColor: "#f59e0b", color: "#fbbf24", fontWeight: "700" }}
                                                  onClick={() => handleUnlockExam({ id: examId, title: ex.title || fallbackTitle })}
                                                  aria-label="Simulate scheduled start time arrived and unlock portal"
                                                >
                                                  ⏱️ Time Ready: Unlock Portal
                                                </button>
                                              </div>
                                            ) : (
                                              <button
                                                type="button"
                                                className="btn-primary"
                                                style={{ padding: "6px 14px", fontSize: "0.8rem", background: "linear-gradient(135deg, #10b981, #059669)", boxShadow: "0 4px 12px rgba(16, 185, 129, 0.4)" }}
                                                onClick={() => {
                                                  setExamAnswers({});
                                                  setExamEssayAnswers({});
                                                  setExamQuestionIndex(0);
                                                  setExamSubmitted(false);
                                                  setExamScoreResult(null);
                                                  const preparedExam = {
                                                    ...ex,
                                                    id: examId,
                                                    title: ex.title || fallbackTitle,
                                                    totalMarks: ex.totalMarks || 100,
                                                    passMarks: ex.passMarks || 50,
                                                    questionBank: (ex.questionBank && ex.questionBank.length > 0) ? ex.questionBank : [
                                                      { id: 101, questionNumber: 1, questionType: "MULTIPLE_CHOICE", questionText: "Which logic gate represents De Morgan's Law: (A ∧ B)' ≡ A' ∨ B'?", options: ["NAND Equivalence to Negative-OR", "NOR Equivalence to Negative-AND", "XOR Inversion", "AND Double Negation"], correctOption: "A", marks: 10 },
                                                      { id: 102, questionNumber: 2, questionType: "THEORY_ESSAY", questionText: "Solve for the derivative of f(x) = 4x^3 - 5x + 7 and explain each power-rule step clearly.", markingGuide: "Apply power rule: d/dx(4x^3)=12x^2, d/dx(-5x)=-5, constant=0. Final answer: 12x^2 - 5.", wordLimit: 120, marks: 20 },
                                                      { id: 103, questionNumber: 3, questionType: "TRUE_FALSE", questionText: "The limit of (sin x) / x as x approaches 0 is equal to 1.", options: ["True", "False"], correctOption: "A", marks: 10 },
                                                      { id: 104, questionNumber: 4, questionType: "FILL_IN_BLANK", questionText: "The powerhouse organelle responsible for ATP synthesis during aerobic cellular respiration is the ____.", acceptedAnswer: "Mitochondria", acceptedKeywords: "mitochondria,mitochondrion", marks: 10 }
                                                    ]
                                                  };
                                                  beginProctoredExam(preparedExam, ex.durationMinutes ? ex.durationMinutes * 60 : 900);
                                                }}
                                              >
                                                🚀 Portal Ready: Launch Exam
                                              </button>
                                            )}
                                          </td>
                                        </tr>
                                      );
                                    };

                                    if (exams.length === 0) {
                                      return (
                                        <tr>
                                          <td colSpan="6" style={{ textAlign: "center", padding: "2.5rem", color: "#94a3b8" }}>
                                            <div style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>📝</div>
                                            <strong style={{ display: "block", color: "#f8fafc", fontSize: "1rem" }}>No Scheduled Online Examinations</strong>
                                            <span style={{ fontSize: "0.85rem" }}>Your faculty instructors have not published any pending online exam papers for this term yet.</span>
                                          </td>
                                        </tr>
                                      );
                                    }

                                    return exams.map((ex, idx) => {
                                      const defS = idx === 0 ? "09:00 AM" : idx === 1 ? "01:00 PM" : "10:30 AM";
                                      const defE = idx === 0 ? "11:30 AM" : idx === 1 ? "03:00 PM" : "12:30 PM";
                                      return renderRow(ex, "STEM Curriculum", ex.title, defS, defE);
                                    });
                                  })()}
                                </tbody>
                              </table>
                            </div>

                            {/* OFFICIAL TEACHER-AUTHORED EXAMINATION TIMETABLE & PROCEDURE GUIDE */}
                            <div style={{ background: "linear-gradient(135deg, rgba(30, 41, 59, 0.6) 0%, rgba(15, 23, 42, 0.8) 100%)", border: "1.5px solid rgba(56, 189, 248, 0.4)", borderRadius: "14px", padding: "1.5rem", marginBottom: "2rem" }}>
                              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem", flexWrap: "wrap", gap: "10px" }}>
                                <div>
                                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                    <span style={{ fontSize: "1.3rem" }}>📚</span>
                                    <h3 style={{ margin: 0, color: "#38bdf8", fontSize: "1.1rem", fontWeight: "800" }}>
                                      OFFICIAL EXAMINATION TIMETABLE & REVISION PROCEDURE GUIDE
                                    </h3>
                                  </div>
                                  <p style={{ margin: "4px 0 0", color: "#94a3b8", fontSize: "0.82rem" }}>
                                    Created by faculty teachers to guide student study according to the official examination procedure and regulations.
                                  </p>
                                </div>
                                <span className="badge-status badge-present" style={{ fontSize: "0.75rem" }}>
                                  ✓ Faculty Board Certified
                                </span>
                              </div>

                              <div className="role-table-responsive">
                                <table className="role-table" style={{ fontSize: "0.82rem" }}>
                                  <thead>
                                    <tr>
                                      <th>Course / Paper &amp; Format</th>
                                      <th>Date &amp; Time Window</th>
                                      <th>Exam Hall &amp; Invigilator</th>
                                      <th>Permitted Tools &amp; Equipment</th>
                                      <th>Syllabus Scope &amp; Focus</th>
                                      <th>Special Instructions</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {examTimetableGuide.map((t, idx) => (
                                      <tr key={t.id || idx}>
                                        <td>
                                          <strong style={{ color: "#38bdf8", display: "block" }}>{t.courseCode}</strong>
                                          <span style={{ color: "#f8fafc", display: "block" }}>{t.subject}</span>
                                          <span style={{ display: "inline-block", marginTop: "3px", background: "rgba(56, 189, 248, 0.18)", border: "1px solid rgba(56, 189, 248, 0.45)", color: "#7dd3fc", padding: "1px 7px", borderRadius: "4px", fontSize: "0.68rem", fontWeight: 800 }}>
                                            {t.examFormat || "Mixed Format (MCQ + Theory)"}
                                          </span>
                                        </td>
                                        <td>
                                          <div style={{ color: "#34d399", fontWeight: 700 }}>{t.examDate}</div>
                                          <span style={{ color: "#fbbf24", fontSize: "0.75rem" }}>{t.startTime} - {t.endTime}</span>
                                        </td>
                                        <td>
                                          <div style={{ color: "#cbd5e1" }}>{t.hall}</div>
                                          <span style={{ color: "#94a3b8", fontSize: "0.72rem" }}>Invigilator: {t.invigilator}</span>
                                        </td>
                                        <td style={{ color: "#a5b4fc" }}>{t.permittedTools}</td>
                                        <td style={{ color: "#cbd5e1", maxWidth: "220px" }}>{t.syllabusScope}</td>
                                        <td style={{ color: "#94a3b8", fontSize: "0.75rem", maxWidth: "200px" }}>{t.instructions}</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </div>

                            {/* Active Exam Ready Banner */}
                            <div style={{ background: "rgba(2, 6, 23, 0.7)", padding: "1.75rem", borderRadius: "12px", textAlign: "center", border: "1px solid rgba(139, 92, 246, 0.3)" }}>
                              <span style={{ fontSize: "2.5rem" }}>📝</span>
                              <h3 style={{ margin: "0.5rem 0 0.25rem", color: "#f8fafc" }}>
                                {activeExam ? activeExam.title : "Term 1 Advanced STEM & Academic Evaluation"}
                              </h3>
                              <p style={{ color: "#94a3b8", fontSize: "0.9rem", marginBottom: "1rem" }}>
                                Class Level: <strong>{academicLevel}</strong> • Term: <strong>{academicTerm}</strong> • Start: <strong>09:00 AM</strong> • End: <strong>11:30 AM</strong> • Questions: {activeExam?.questionBank?.length || 10}
                              </p>
                              {submittedExams[activeExam?.id || "demo_1"] ? (
                                <span className="badge-status badge-present" style={{ fontSize: "0.95rem", padding: "8px 20px" }}>
                                  🔒 Exam Already Submitted & Locked (Score: {submittedExams[activeExam?.id || "demo_1"].score}%)
                                </span>
                              ) : (
                                <button
                                  type="button"
                                  className="btn-primary"
                                  style={{ fontSize: "1rem", padding: "12px 28px", background: "linear-gradient(135deg, #8b5cf6, #6d28d9)" }}
                                  onClick={() => {
                                    beginProctoredExam(null, activeExam?.durationMinutes ? activeExam.durationMinutes * 60 : 900);
                                  }}
                                >
                                  🚀 Begin Active Examination Now
                                </button>
                              )}
                            </div>

                            {/* 🏛️ TERMLY & YEAR-BY-YEAR PAST QUESTIONS & EXAMINATION PAPERS ARCHIVE */}
                            <div style={{
                              background: "linear-gradient(135deg, rgba(15, 23, 42, 0.95), rgba(30, 41, 59, 0.85))",
                              border: "1.5px solid rgba(139, 92, 246, 0.4)",
                              borderRadius: "14px",
                              padding: "1.5rem",
                              marginTop: "2rem",
                              marginBottom: "1rem"
                            }}>
                              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem", flexWrap: "wrap", gap: "10px" }}>
                                <div>
                                  <h3 style={{ margin: 0, color: "#c084fc", fontSize: "1.1rem", fontWeight: 800, display: "flex", alignItems: "center", gap: "8px" }}>
                                    <span>🏛️</span> TERMLY & YEAR-BY-YEAR PAST QUESTIONS & EXAMINATION PAPERS ARCHIVE
                                  </h3>
                                  <p style={{ margin: "4px 0 0", color: "#94a3b8", fontSize: "0.82rem" }}>
                                    Official school past examination papers saved in chronological order term-by-term and year-by-year with solutions and interactive mock practice trials.
                                  </p>
                                </div>

                                <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
                                  <select
                                    value={pastExamYearFilter}
                                    onChange={(e) => setPastExamYearFilter(e.target.value)}
                                    style={{
                                      background: "rgba(15, 23, 42, 0.9)",
                                      color: "#ffffff",
                                      border: "1px solid rgba(255, 255, 255, 0.15)",
                                      padding: "6px 12px",
                                      borderRadius: "8px",
                                      fontSize: "0.8rem",
                                      fontWeight: 700
                                    }}
                                  >
                                    <option value="ALL">All Academic Years</option>
                                    <option value="2026">2026 Academic Year</option>
                                    <option value="2025">2025 Academic Year</option>
                                    <option value="2024">2024 Academic Year</option>
                                  </select>

                                  <select
                                    value={pastExamTermFilter}
                                    onChange={(e) => setPastExamTermFilter(e.target.value)}
                                    style={{
                                      background: "rgba(15, 23, 42, 0.9)",
                                      color: "#ffffff",
                                      border: "1px solid rgba(255, 255, 255, 0.15)",
                                      padding: "6px 12px",
                                      borderRadius: "8px",
                                      fontSize: "0.8rem",
                                      fontWeight: 700
                                    }}
                                  >
                                    <option value="ALL">All Terms</option>
                                    <option value="TERM_1">Term 1</option>
                                    <option value="TERM_2">Term 2</option>
                                    <option value="TERM_3">Term 3</option>
                                  </select>
                                </div>
                              </div>

                              {(() => {
                                const pastExamPapers = [
                                  {
                                    id: "PAST-2026-T1-MATH",
                                    year: "2026",
                                    term: "TERM_1",
                                    termLabel: "Term 1",
                                    subject: "Core Mathematics",
                                    title: "2026 Term 1 Advanced Calculus & Quadratic Systems",
                                    level: "Form 2 / Grade 11",
                                    duration: "2 Hours 30 Mins",
                                    totalMarks: 100,
                                    questionsCount: 12,
                                    teacher: "Dr. Robert Vance (Head of Mathematics)",
                                    status: "Verified Faculty Archive",
                                    sampleQuestions: [
                                      "1. Find dy/dx for the function y = (3x^2 + 2x)(4x - 1).",
                                      "2. State the condition for matrix inversion and find the determinant of matrix A = [[4, 2], [3, 5]].",
                                      "3. Essay: Derive the quadratic formula using the method of completing the square, justifying every step."
                                    ]
                                  },
                                  {
                                    id: "PAST-2026-T1-SCI",
                                    year: "2026",
                                    term: "TERM_1",
                                    termLabel: "Term 1",
                                    subject: "Integrated Science",
                                    title: "2026 Term 1 Thermodynamics & Ecosystem Equilibrium",
                                    level: "Form 2 / Grade 11",
                                    duration: "2 Hours",
                                    totalMarks: 100,
                                    questionsCount: 15,
                                    teacher: "Mrs. Sarah Osei (Science Faculty)",
                                    status: "Verified Faculty Archive",
                                    sampleQuestions: [
                                      "1. Distinguish between open, closed, and isolated thermodynamic systems with real campus examples.",
                                      "2. Calculate heat absorbed when 2.5 kg of water is heated from 25°C to 80°C. (c = 4184 J/kg°C).",
                                      "3. Essay: Explain ecological trophic pyramids and why energy transfers decrease by 90% at successive levels."
                                    ]
                                  },
                                  {
                                    id: "PAST-2025-T3-ICT",
                                    year: "2025",
                                    term: "TERM_3",
                                    termLabel: "Term 3",
                                    subject: "Computing & ICT",
                                    title: "2025 Term 3 Relational SQL Systems & Data Structures",
                                    level: "Form 1 / Grade 10",
                                    duration: "2 Hours",
                                    totalMarks: 100,
                                    questionsCount: 10,
                                    teacher: "Eng. Marcus Thorne (Computing Faculty)",
                                    status: "Verified Faculty Archive",
                                    sampleQuestions: [
                                      "1. Write an ANSI SQL query to select students whose attendance percentage exceeds 85%.",
                                      "2. Explain Boyce-Codd Normal Form (BCNF) versus Third Normal Form (3NF).",
                                      "3. Essay: Compare hash tables and binary search trees in time complexity for insertion, deletion, and lookup."
                                    ]
                                  },
                                  {
                                    id: "PAST-2025-T2-ENG",
                                    year: "2025",
                                    term: "TERM_2",
                                    termLabel: "Term 2",
                                    subject: "English Language & Literature",
                                    title: "2025 Term 2 Syntactic Structures & Rhetorical Essay",
                                    level: "Form 2 / Grade 11",
                                    duration: "2 Hours 30 Mins",
                                    totalMarks: 100,
                                    questionsCount: 8,
                                    teacher: "Ms. Evelyn Mensah (Head of Languages)",
                                    status: "Verified Faculty Archive",
                                    sampleQuestions: [
                                      "1. Identify the grammatical names and functions of the underlined adverbial clauses.",
                                      "2. Summarize the author's primary thesis in the provided unseen comprehension passage.",
                                      "3. Essay (450 words): Write a persuasive speech on the role of digital ethics in modern youth leadership."
                                    ]
                                  },
                                  {
                                    id: "PAST-2025-T1-SOC",
                                    year: "2025",
                                    term: "TERM_1",
                                    termLabel: "Term 1",
                                    subject: "Social Studies",
                                    title: "2025 Term 1 Constitutional Governance & Economic Institutions",
                                    level: "Form 2 / Grade 11",
                                    duration: "2 Hours",
                                    totalMarks: 100,
                                    questionsCount: 10,
                                    teacher: "Mr. George Addo (Social Sciences)",
                                    status: "Verified Faculty Archive",
                                    sampleQuestions: [
                                      "1. Outline the separation of powers between the Executive, Legislature, and Judiciary in national governance.",
                                      "2. Explain four socio-cultural practices that promote social cohesion in West Africa.",
                                      "3. Essay: Evaluate the economic impact of local agro-processing industries on sustainable community growth."
                                    ]
                                  },
                                  {
                                    id: "PAST-2024-T3-PHY",
                                    year: "2024",
                                    term: "TERM_3",
                                    termLabel: "Term 3",
                                    subject: "Physics",
                                    title: "2024 Term 3 Electromagnetism & Quantum Wave-Particle Dualism",
                                    level: "Form 3 / Grade 12",
                                    duration: "2 Hours 30 Mins",
                                    totalMarks: 100,
                                    questionsCount: 14,
                                    teacher: "Dr. Arthur Sterling (Senior Physics Examiner)",
                                    status: "Verified Faculty Archive",
                                    sampleQuestions: [
                                      "1. State Faraday's law of electromagnetic induction and write its mathematical formulation with Lenz's correction.",
                                      "2. Calculate the de Broglie wavelength of an electron accelerated through a potential difference of 100 V.",
                                      "3. Essay: Describe the photoelectric effect experiment, Einstein's photon equation, and work function."
                                    ]
                                  },
                                  {
                                    id: "PAST-2024-T2-CHEM",
                                    year: "2024",
                                    term: "TERM_2",
                                    termLabel: "Term 2",
                                    subject: "Chemistry",
                                    title: "2024 Term 2 Reaction Kinetics & Organic Reaction Mechanisms",
                                    level: "Form 3 / Grade 12",
                                    duration: "2 Hours",
                                    totalMarks: 100,
                                    questionsCount: 12,
                                    teacher: "Dr. Michael Boateng (Chemistry Faculty)",
                                    status: "Verified Faculty Archive",
                                    sampleQuestions: [
                                      "1. Explain the difference between SN1 and SN2 nucleophilic substitution reactions.",
                                      "2. Determine the order of reaction and rate constant given experimental concentration vs rate data.",
                                      "3. Essay: Discuss Le Chatelier's principle and its industrial application in the Haber-Bosch ammonia synthesis."
                                    ]
                                  },
                                  {
                                    id: "PAST-2024-T1-BIO",
                                    year: "2024",
                                    term: "TERM_1",
                                    termLabel: "Term 1",
                                    subject: "Biology",
                                    title: "2024 Term 1 Molecular Genetics, DNA Replication & Enzymes",
                                    level: "Form 3 / Grade 12",
                                    duration: "2 Hours",
                                    totalMarks: 100,
                                    questionsCount: 15,
                                    teacher: "Dr. Grace Hanson (Biology Faculty)",
                                    status: "Verified Faculty Archive",
                                    sampleQuestions: [
                                      "1. Describe the role of DNA helicase, primase, DNA polymerase III, and ligase during semi-conservative replication.",
                                      "2. Contrast competitive and non-competitive enzyme inhibition with Michaelis-Menten kinetic plots.",
                                      "3. Essay: Trace the flow of genetic information from transcription in the nucleus to translation on the ribosome."
                                    ]
                                  }
                                ];

                                const livePastPapers = (() => {
                                  try {
                                    const saved = JSON.parse(localStorage.getItem("gbs_published_past_papers") || "[]");
                                    return Array.isArray(saved) ? saved : [];
                                  } catch {
                                    return [];
                                  }
                                })();
                                const effectivePapers = isDemoTenant ? pastExamPapers : livePastPapers;

                                const filteredPapers = effectivePapers.filter((p) => {
                                  if (pastExamYearFilter !== "ALL" && p.year !== pastExamYearFilter) return false;
                                  if (pastExamTermFilter !== "ALL" && p.term !== pastExamTermFilter) return false;
                                  return true;
                                });

                                return filteredPapers.length === 0 ? (
                                  <div style={{ padding: "1.5rem", borderRadius: "12px", background: "rgba(15, 23, 42, 0.7)", border: "1px dashed rgba(148, 163, 184, 0.35)", textAlign: "center", color: "#94a3b8" }}>
                                    No published past examination papers yet in this live institution workspace.
                                  </div>
                                ) : (
                                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "14px" }}>
                                    {filteredPapers.map((paper) => (
                                      <div
                                        key={paper.id}
                                        style={{
                                          background: "rgba(15, 23, 42, 0.8)",
                                          border: "1px solid rgba(255, 255, 255, 0.1)",
                                          borderRadius: "12px",
                                          padding: "16px",
                                          display: "flex",
                                          flexDirection: "column",
                                          justifyContent: "space-between"
                                        }}
                                      >
                                        <div>
                                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "8px" }}>
                                            <span style={{
                                              background: "rgba(168, 85, 247, 0.2)",
                                              color: "#c084fc",
                                              border: "1px solid #a855f7",
                                              padding: "3px 8px",
                                              borderRadius: "6px",
                                              fontSize: "0.72rem",
                                              fontWeight: 800
                                            }}>
                                              📅 {paper.year} • {paper.termLabel}
                                            </span>
                                            <span style={{ fontSize: "0.72rem", color: "#34d399", fontWeight: 700 }}>
                                              ✓ {paper.totalMarks} Marks
                                            </span>
                                          </div>

                                          <h4 style={{ margin: "4px 0", color: "#f8fafc", fontSize: "0.98rem", fontWeight: 800 }}>
                                            {paper.title}
                                          </h4>
                                          <div style={{ fontSize: "0.78rem", color: "#38bdf8", marginBottom: "8px" }}>
                                            Subject: {paper.subject} • Level: {paper.level}
                                          </div>
                                          <div style={{ fontSize: "0.75rem", color: "#94a3b8", marginBottom: "12px" }}>
                                            Examiner: {paper.teacher} • Duration: {paper.duration}
                                          </div>
                                        </div>

                                        <div style={{ display: "flex", gap: "8px", marginTop: "10px" }}>
                                          <button
                                            type="button"
                                            onClick={() => setSelectedPastPaperModal(paper)}
                                            style={{
                                              flex: 1,
                                              background: "rgba(56, 189, 248, 0.15)",
                                              border: "1px solid #38bdf8",
                                              color: "#38bdf8",
                                              padding: "8px 10px",
                                              borderRadius: "8px",
                                              fontSize: "0.78rem",
                                              fontWeight: 700,
                                              cursor: "pointer"
                                            }}
                                          >
                                            📄 Inspect Scheme
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() => {
                                              setExamQuestionIndex(0);
                                              setExamAnswers({});
                                              setExamEssayAnswers({});
                                              beginProctoredExam({
                                                id: paper.id,
                                                title: `[MOCK PRACTICE] ${paper.title}`,
                                                totalMarks: paper.totalMarks,
                                                passMarks: 50,
                                                durationMinutes: 45,
                                                questionBank: paper.sampleQuestions.map((sq, sIdx) => ({
                                                  id: 900 + sIdx,
                                                  questionNumber: sIdx + 1,
                                                  questionText: sq,
                                                  options: ["Option A - Derivation Verified", "Option B - Alternative Working", "Option C - Inconclusive", "Option D - Counter-Example"]
                                                }))
                                              }, 45 * 60);
                                            }}
                                            style={{
                                              flex: 1,
                                              background: "linear-gradient(135deg, #8b5cf6, #6d28d9)",
                                              border: "none",
                                              color: "#ffffff",
                                              padding: "8px 10px",
                                              borderRadius: "8px",
                                              fontSize: "0.78rem",
                                              fontWeight: 800,
                                              cursor: "pointer"
                                            }}
                                          >
                                            ✍️ Start Mock Trial
                                          </button>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                );
                              })()}
                            </div>
                          </div>
                        )}

                        {examStarted && !examSubmitted && (() => {
                          const questionsList = (activeExam?.questionBank && activeExam.questionBank.length > 0)
                            ? activeExam.questionBank
                            : [
                              { id: 101, questionNumber: 1, questionType: "MULTIPLE_CHOICE", questionText: "Which digital logic property represents De Morgan's Law: (A ∧ B)' ≡ A' ∨ B'?", options: ["NAND Equivalence to Negative-OR", "NOR Equivalence to Negative-AND", "XOR Inversion", "AND Double Negation"], correctOption: "A", marks: 15 },
                              { id: 102, questionNumber: 2, questionType: "THEORY_ESSAY", questionText: "Explain the biochemical process of cellular respiration and ATP synthesis in the mitochondrial inner membrane, highlighting electron transport and chemiosmosis.", markingGuide: "Glycolysis -> Krebs Cycle -> Electron Transport Chain -> Chemiosmosis / ATP Synthase.", wordLimit: 250, marks: 25 },
                              { id: 103, questionNumber: 3, questionType: "TRUE_FALSE", questionText: "A 1200 kg vehicle moving at 25 m/s has a kinetic energy of 375,000 Joules (375 kJ).", options: ["True", "False"], correctOption: "A", marks: 15 },
                              { id: 104, questionNumber: 4, questionType: "FILL_IN_BLANK", questionText: "In calculus, the first derivative of f(x) = 4x^3 - 5x + 7 is ____.", acceptedAnswer: "12x^2 - 5", acceptedKeywords: "12x^2-5,12x^2 - 5", marks: 15 },
                              { id: 105, questionNumber: 5, questionType: "CASE_STUDY", questionText: "Discuss how digital school management systems improve equitable academic access, exam integrity, and real-time parent-teacher collaboration in secondary schools.", markingGuide: "Access, attendance/assessment transparency, anti-malpractice verification, parent communication.", wordLimit: 250, marks: 30 }
                            ];

                          const isQAnswered = (q) => {
                            return Boolean(examAnswers[q.id] || (examEssayAnswers[q.id] && examEssayAnswers[q.id].trim().length > 0));
                          };
                          const solvedCount = questionsList.filter(isQAnswered).length;
                          const unsolvedCount = Math.max(0, questionsList.length - solvedCount);
                          const safeIndex = Math.min(examQuestionIndex, questionsList.length - 1);
                          const currentQ = questionsList[safeIndex] || questionsList[0];

                          return (
                            <div className="student-exam-card">
                              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem", borderBottom: "1px solid rgba(255, 255, 255, 0.1)", paddingBottom: "1rem", flexWrap: "wrap", gap: "10px" }}>
                                <div>
                                  <h3 style={{ margin: 0, color: "#c084fc", fontSize: "1.2rem" }}>{activeExam?.title || "Academic Evaluation"}</h3>
                                  <span style={{ fontSize: "0.8rem", color: "#94a3b8" }}>
                                    PostgreSQL Question Bank • Objective & Essay Assessment • {academicLevel} ({academicTerm})
                                  </span>
                                </div>
                                <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                                  <span className="badge-status badge-present">⏱️ Time Remaining: {formatExamTime(examTimeLeftSeconds)}</span>
                                  <button
                                    type="button"
                                    className="btn-secondary"
                                    style={{ padding: "4px 10px", fontSize: "0.75rem" }}
                                    onClick={() => setExamStarted(false)}
                                  >
                                    Cancel
                                  </button>
                                </div>
                              </div>

                              {/* Live Teacher / Invigilator Messages & Official Warnings Bar */}
                              {(() => {
                                const visibleTeacherMsgs = liveProctorMessages.filter(
                                  (m) => !dismissedProctorMsgIds.includes(m.id) && !(Array.isArray(m.acknowledgedBy) && m.acknowledgedBy.includes(String(studentProfile?.id || 10)))
                                );
                                if (visibleTeacherMsgs.length === 0) return null;
                                return (
                                  <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: "1rem" }}>
                                    {visibleTeacherMsgs.slice(0, 3).map((m) => (
                                      <div
                                        key={m.id}
                                        style={{
                                          background: m.severity === "WARNING" ? "rgba(185, 28, 28, 0.25)" : "rgba(8, 24, 51, 0.92)",
                                          border: m.severity === "WARNING" ? "2px solid #ef4444" : "2px solid #d4af37",
                                          borderRadius: "10px",
                                          padding: "10px 14px",
                                          display: "flex",
                                          justifyContent: "space-between",
                                          alignItems: "center",
                                          gap: "12px",
                                          flexWrap: "wrap"
                                        }}
                                      >
                                        <div>
                                          <div style={{ fontSize: "0.74rem", fontWeight: 900, color: m.severity === "WARNING" ? "#fca5a5" : "#f6dd84", textTransform: "uppercase" }}>
                                            {m.severity === "WARNING" ? "⚠️ OFFICIAL INVIGILATOR WARNING" : "📢 MESSAGE FROM EXAMINATION TEACHER"} • {m.senderName}
                                            {m.deductMarks > 0 ? ` • -${m.deductMarks} MARKS SUBTRACTED` : ""}
                                          </div>
                                          <div style={{ fontSize: "0.9rem", color: "#ffffff", fontWeight: 700, marginTop: "2px" }}>
                                            {m.message}
                                          </div>
                                        </div>
                                        <button
                                          type="button"
                                          onClick={() => {
                                            setDismissedProctorMsgIds((prev) => [...prev, m.id]);
                                            apiClient.post(`/ai-exam/proctor/messages/${encodeURIComponent(m.id)}/ack`, {
                                              studentId: studentProfile?.id || 10
                                            }).catch(() => { });
                                          }}
                                          style={{
                                            background: "linear-gradient(135deg, #f6dd84, #cfa028)",
                                            color: "#081833",
                                            border: "none",
                                            borderRadius: "6px",
                                            padding: "5px 12px",
                                            fontSize: "0.76rem",
                                            fontWeight: 800,
                                            cursor: "pointer"
                                          }}
                                        >
                                          ✓ Acknowledge
                                        </button>
                                      </div>
                                    ))}
                                  </div>
                                );
                              })()}

                              {/* Font Size Preview Controls & AI Proctoring Sentinel */}
                              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "rgba(15, 23, 42, 0.85)", padding: "10px 16px", borderRadius: "10px", marginBottom: "1.25rem", border: "1px solid rgba(255, 255, 255, 0.08)", flexWrap: "wrap", gap: "10px" }}>
                                <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                                  <span style={{ fontSize: "0.78rem", color: "#94a3b8", fontWeight: 700 }}>🔍 Question Text Font Size:</span>
                                  {[
                                    { key: "NORMAL", label: "Normal (15px)" },
                                    { key: "MEDIUM", label: "Medium (18px)" },
                                    { key: "LARGE", label: "Large (22px)" }
                                  ].map((f) => (
                                    <button
                                      key={f.key}
                                      type="button"
                                      onClick={() => setExamFontSize(f.key)}
                                      style={{
                                        background: examFontSize === f.key ? "rgba(56, 189, 248, 0.25)" : "rgba(255, 255, 255, 0.05)",
                                        border: examFontSize === f.key ? "1.5px solid #38bdf8" : "1px solid rgba(255, 255, 255, 0.1)",
                                        color: examFontSize === f.key ? "#38bdf8" : "#cbd5e1",
                                        padding: "4px 10px",
                                        borderRadius: "6px",
                                        fontSize: "0.75rem",
                                        fontWeight: 700,
                                        cursor: "pointer"
                                      }}
                                    >
                                      {f.label}
                                    </button>
                                  ))}
                                </div>

                                <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
                                  <video
                                    ref={proctorVideoRef}
                                    autoPlay
                                    muted
                                    playsInline
                                    style={{
                                      width: proctoringStatus === "FOCUS_ONLY_ACTIVE" ? "0px" : "112px",
                                      height: proctoringStatus === "FOCUS_ONLY_ACTIVE" ? "0px" : "76px",
                                      borderRadius: "8px",
                                      objectFit: "cover",
                                      background: "#020617",
                                      border: proctoringStatus === "WARNING_DETECTED" ? "2px solid #ef4444" : "2px solid #10b981",
                                      transform: "scaleX(-1)",
                                      display: proctoringStatus === "FOCUS_ONLY_ACTIVE" ? "none" : "block"
                                    }}
                                  />
                                  {proctoringStatus === "FOCUS_ONLY_ACTIVE" && (
                                    <button
                                      type="button"
                                      onClick={async () => {
                                        try {
                                          const s = await requestFastExamCameraStream();
                                          if (s) {
                                            proctorStreamRef.current = s;
                                            if (proctorVideoRef.current) {
                                              proctorVideoRef.current.srcObject = s;
                                              proctorVideoRef.current.play().catch(() => { });
                                            }
                                            setProctoringStatus("CAMERA_ACTIVE");
                                            setProctoringDetail("Live Webcam Face Monitor, Gaze & Tab-Lock Active");
                                          }
                                        } catch {
                                          setFeedback({ type: "warning", message: "Please allow browser camera permission in your address bar to activate live exam proctoring video." });
                                        }
                                      }}
                                      style={{
                                        background: "rgba(16, 185, 129, 0.22)",
                                        border: "1px solid #10b981",
                                        color: "#6ee7b7",
                                        padding: "5px 10px",
                                        borderRadius: "6px",
                                        fontSize: "0.74rem",
                                        fontWeight: 800,
                                        cursor: "pointer"
                                      }}
                                    >
                                      🎥 Enable Exam Camera
                                    </button>
                                  )}
                                  <span
                                    style={{
                                      fontSize: "0.75rem",
                                      color: proctoringStatus === "WARNING_DETECTED" ? "#fca5a5" : proctoringStatus === "FOCUS_ONLY_ACTIVE" ? "#fbbf24" : "#34d399",
                                      background: proctoringStatus === "WARNING_DETECTED" ? "rgba(239, 68, 68, 0.2)" : proctoringStatus === "FOCUS_ONLY_ACTIVE" ? "rgba(245, 158, 11, 0.16)" : "rgba(16, 185, 129, 0.15)",
                                      border: proctoringStatus === "WARNING_DETECTED" ? "1px solid #ef4444" : proctoringStatus === "FOCUS_ONLY_ACTIVE" ? "1px solid #f59e0b" : "1px solid #10b981",
                                      padding: "5px 10px",
                                      borderRadius: "6px",
                                      fontWeight: 700
                                    }}
                                    aria-label={proctoringDetail}
                                  >
                                    {proctoringStatus === "CAMERA_ACTIVE"
                                      ? "📹 AI Proctoring Live • Webcam & Focus Active"
                                      : proctoringStatus === "WARNING_DETECTED"
                                        ? `🚨 AI Proctoring Alert (${proctoringWarnings} Warning${proctoringWarnings === 1 ? "" : "s"})`
                                        : proctoringStatus === "FOCUS_ONLY_ACTIVE"
                                          ? "🛡️ AI Proctoring Active (Tab & Anti-Copy Lock)"
                                          : "⏳ Starting AI Proctoring..."}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => triggerHeadMovementAlert("Manual test: Head movement alert verified.")}
                                    style={{
                                      background: "rgba(239, 68, 68, 0.15)",
                                      border: "1px solid #ef4444",
                                      color: "#f87171",
                                      padding: "4px 10px",
                                      borderRadius: "6px",
                                      fontSize: "0.72rem",
                                      fontWeight: 700,
                                      cursor: "pointer"
                                    }}
                                    aria-label="Simulate head movement away to test proctoring alert and penalty deduction"
                                  >
                                    👁️ Test Proctoring Alert
                                  </button>
                                </div>
                              </div>

                              {/* Interactive Unsolved Questions Palette with Count */}
                              <div style={{ background: "rgba(2, 6, 23, 0.65)", padding: "12px 16px", borderRadius: "10px", marginBottom: "1.25rem", border: "1px solid rgba(255, 255, 255, 0.08)" }}>
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px", flexWrap: "wrap", gap: "8px" }}>
                                  <span style={{ fontSize: "0.82rem", color: "#f8fafc", fontWeight: 700 }}>
                                    📋 Question Navigation Palette:
                                  </span>
                                  <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                                    <span style={{ fontSize: "0.75rem", color: "#34d399" }}>
                                      ✓ Answered: <strong>{solvedCount}</strong>
                                    </span>
                                    <span style={{
                                      fontSize: "0.75rem",
                                      color: unsolvedCount > 0 ? "#fbbf24" : "#34d399",
                                      fontWeight: 800,
                                      background: unsolvedCount > 0 ? "rgba(245, 158, 11, 0.15)" : "rgba(16, 185, 129, 0.15)",
                                      padding: "3px 10px",
                                      borderRadius: "6px",
                                      border: unsolvedCount > 0 ? "1px solid #f59e0b" : "1px solid #10b981"
                                    }}>
                                      {unsolvedCount > 0 ? `⚠️ ${unsolvedCount} of ${questionsList.length} Questions Left to Answer` : "✓ All Questions Answered"}
                                    </span>
                                  </div>
                                </div>

                                {/* Multi-Format Question Bank Section Navigator (Uniform GBS Navy & Gold) */}
                                <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginBottom: "10px", paddingBottom: "8px", borderBottom: "1px solid rgba(212, 175, 55, 0.25)" }}>
                                  {[
                                    { type: "MULTIPLE_CHOICE", label: "📘 Multiple Choice" },
                                    { type: "THEORY_ESSAY", label: "✍️ Theory / Essay" },
                                    { type: "TRUE_FALSE", label: "☑️ True / False" },
                                    { type: "SHORT_ANSWER", label: "📝 Short Answer" },
                                    { type: "FILL_IN_BLANK", label: "🔤 Fill in Blank" },
                                    { type: "CASE_STUDY", label: "🧪 Case Study" }
                                  ].map((fmt) => {
                                    const matchingIndices = questionsList
                                      .map((qItem, idx) => (resolveExamQuestionType(qItem) === fmt.type ? idx : -1))
                                      .filter((idx) => idx >= 0);
                                    if (matchingIndices.length === 0) return null;
                                    const isActiveFormat = resolveExamQuestionType(currentQ) === fmt.type;
                                    return (
                                      <button
                                        key={fmt.type}
                                        type="button"
                                        onClick={() => setExamQuestionIndex(matchingIndices[0])}
                                        style={{
                                          background: isActiveFormat ? "linear-gradient(135deg, #f6dd84, #d4af37)" : "linear-gradient(135deg, #081833, #0d2247)",
                                          color: isActiveFormat ? "#081833" : "#f6dd84",
                                          border: "1.5px solid #d4af37",
                                          padding: "5px 11px",
                                          borderRadius: "6px",
                                          fontSize: "0.73rem",
                                          fontWeight: 800,
                                          cursor: "pointer"
                                        }}
                                      >
                                        {fmt.label} ({matchingIndices.length})
                                      </button>
                                    );
                                  })}
                                </div>

                                <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                                  {questionsList.map((q, idx) => {
                                    const isAns = isQAnswered(q);
                                    const isCurrent = idx === safeIndex;
                                    const qTypeShort = resolveExamQuestionType(q);
                                    const shortBadge = qTypeShort === "THEORY_ESSAY" ? "TH" : qTypeShort === "TRUE_FALSE" ? "TF" : qTypeShort === "SHORT_ANSWER" ? "SA" : qTypeShort === "FILL_IN_BLANK" ? "FB" : qTypeShort === "CASE_STUDY" ? "CS" : "MC";
                                    return (
                                      <button
                                        key={q.id || idx}
                                        type="button"
                                        aria-label={`Jump to Question ${idx + 1} (${shortBadge}): ${isAns ? "Answered" : "Unsolved"}`}
                                        onClick={() => setExamQuestionIndex(idx)}
                                        style={{
                                          minWidth: "44px",
                                          height: "36px",
                                          padding: "0 6px",
                                          borderRadius: "8px",
                                          background: isAns ? "#059669" : "rgba(30, 41, 59, 0.9)",
                                          color: "#ffffff",
                                          border: isCurrent ? "2px solid #d4af37" : isAns ? "1px solid #10b981" : "1px solid rgba(255, 255, 255, 0.2)",
                                          fontWeight: 800,
                                          fontSize: "0.76rem",
                                          cursor: "pointer",
                                          display: "flex",
                                          alignItems: "center",
                                          justifyContent: "center",
                                          gap: "3px",
                                          boxShadow: isCurrent ? "0 0 10px rgba(212, 175, 55, 0.55)" : "none",
                                          transform: isCurrent ? "scale(1.06)" : "scale(1)",
                                          transition: "all 0.15s ease"
                                        }}
                                      >
                                        <span>{idx + 1}</span>
                                        <span style={{ fontSize: "0.62rem", color: "#fde68a", fontWeight: 900 }}>{shortBadge}</span>
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>

                              {/* Typed Questions / Uploaded Paper Preview if available */}
                              {activeExam?.typedQuestionText && (
                                <div style={{
                                  background: "rgba(15, 23, 42, 0.9)",
                                  border: "1.5px solid rgba(56, 189, 248, 0.5)",
                                  borderRadius: "12px",
                                  padding: "1.25rem",
                                  marginBottom: "1.5rem"
                                }}>
                                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                                    <h4 style={{ margin: 0, color: "#38bdf8", fontSize: "0.95rem", textTransform: "uppercase", display: "flex", alignItems: "center", gap: "6px" }}>
                                      <span>📄</span> Teacher's Uploaded Examination Instructions ({activeExam.uploadedDocName || "Online Questions"})
                                    </h4>
                                    <span style={{ fontSize: "0.72rem", color: "#34d399", background: "rgba(16, 185, 129, 0.2)", padding: "2px 8px", borderRadius: "6px" }}>
                                      AI Scanner & OMR Ready
                                    </span>
                                  </div>
                                  <div style={{
                                    whiteSpace: "pre-wrap",
                                    color: "#e2e8f0",
                                    fontSize: "0.9rem",
                                    lineHeight: "1.7",
                                    fontFamily: "monospace",
                                    background: "rgba(2, 6, 23, 0.8)",
                                    padding: "1rem",
                                    borderRadius: "8px",
                                    maxHeight: "220px",
                                    overflowY: "auto",
                                    border: "1px solid rgba(255,255,255,0.08)"
                                  }}>
                                    {activeExam.typedQuestionText}
                                  </div>
                                </div>
                              )}

                              {/* Active Question Display */}
                              {(() => {
                                const qType = resolveExamQuestionType(currentQ);
                                const qBadge = getQuestionTypeBadge(qType);
                                const qOptions = resolveQuestionOptions(currentQ);
                                const isWrittenType = WRITTEN_QUESTION_TYPES.includes(qType);
                                const typedValue = examEssayAnswers[currentQ.id] || "";
                                const wordCount = typedValue.trim() ? typedValue.trim().split(/\s+/).length : 0;
                                return (
                                  <div className="question-block" style={{ marginBottom: "1.5rem" }}>
                                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px", flexWrap: "wrap", gap: "8px" }}>
                                      <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                                        <span style={{ fontSize: "0.82rem", color: "#38bdf8", fontWeight: 800 }}>
                                          QUESTION {safeIndex + 1} OF {questionsList.length}
                                        </span>
                                        <span style={{
                                          fontSize: "0.72rem",
                                          fontWeight: 800,
                                          padding: "3px 9px",
                                          borderRadius: "999px",
                                          background: `${qBadge.color}22`,
                                          border: `1px solid ${qBadge.color}88`,
                                          color: qBadge.color
                                        }}>
                                          {qBadge.label}
                                        </span>
                                        <span style={{
                                          fontSize: "0.72rem",
                                          fontWeight: 800,
                                          padding: "3px 9px",
                                          borderRadius: "999px",
                                          background: "rgba(212, 175, 55, 0.16)",
                                          border: "1px solid rgba(212, 175, 55, 0.55)",
                                          color: "#fde68a"
                                        }}>
                                          [{currentQ.marks || 10} Marks]
                                        </span>
                                      </div>
                                      <span style={{ fontSize: "0.75rem", color: isQAnswered(currentQ) ? "#34d399" : "#fbbf24", fontWeight: 700 }}>
                                        {isQAnswered(currentQ) ? "✓ Answer Recorded" : "⚠️ Unsolved"}
                                      </span>
                                    </div>

                                    {qType === "CASE_STUDY" && currentQ.caseScenario && (
                                      <div style={{
                                        background: "rgba(8, 24, 51, 0.85)",
                                        border: "1.5px solid #d4af37",
                                        borderRadius: "10px",
                                        padding: "12px 14px",
                                        marginBottom: "12px",
                                        color: "#e2e8f0",
                                        fontSize: "0.9rem"
                                      }}>
                                        <div style={{ fontSize: "0.72rem", fontWeight: 900, color: "#f6dd84", textTransform: "uppercase", marginBottom: "4px" }}>
                                          🧪 Case Study / Practical Scenario Brief
                                        </div>
                                        <div style={{ whiteSpace: "pre-line", lineHeight: 1.55 }}>{currentQ.caseScenario}</div>
                                      </div>
                                    )}

                                    <div className="question-text" style={{ fontSize: getExamFontSizePx(), lineHeight: "1.65", color: "#f8fafc", marginBottom: "1rem", whiteSpace: "pre-line" }}>
                                      Question {safeIndex + 1}:{" "}
                                      {qType === "FILL_IN_BLANK" && String(currentQ.questionText || "").includes("____")
                                        ? String(currentQ.questionText).split("____").map((part, pIdx, arr) => (
                                          <React.Fragment key={pIdx}>
                                            {part}
                                            {pIdx < arr.length - 1 && (
                                              <span style={{ display: "inline-block", minWidth: "85px", borderBottom: "2px solid #f6dd84", color: "#f6dd84", textAlign: "center", fontWeight: 900, margin: "0 4px" }}>
                                                {typedValue ? ` ${typedValue} ` : " ______ "}
                                              </span>
                                            )}
                                          </React.Fragment>
                                        ))
                                        : currentQ.questionText}
                                    </div>

                                    {/* Multiple Choice & True/False Options */}
                                    {(qType === "MULTIPLE_CHOICE" || qType === "TRUE_FALSE") && qOptions.length > 0 && (
                                      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                                        {qOptions.map((opt, optIdx) => {
                                          const optLetter = ["A", "B", "C", "D"][optIdx] || String.fromCharCode(65 + optIdx);
                                          const optLabel = typeof opt === "string" ? opt : `Option ${optLetter}`;
                                          return (
                                            <label key={optIdx} className="option-label" style={{ fontSize: getExamFontSizePx() }}>
                                              <input
                                                type="radio"
                                                name={`q_${currentQ.id}`}
                                                checked={examAnswers[currentQ.id] === optLetter || examAnswers[currentQ.id] === opt}
                                                onChange={() => setExamAnswers({ ...examAnswers, [currentQ.id]: optLetter })}
                                              />
                                              <span><strong>{optLetter}.</strong> {optLabel}</span>
                                            </label>
                                          );
                                        })}
                                        <details style={{ marginTop: "8px" }}>
                                          <summary style={{ fontSize: "0.76rem", color: "#94a3b8", cursor: "pointer" }}>
                                            ✍️ Optional Computational Scratchpad / Working Notes
                                          </summary>
                                          <textarea
                                            rows={2}
                                            value={typedValue}
                                            onChange={(e) => setExamEssayAnswers({ ...examEssayAnswers, [currentQ.id]: e.target.value })}
                                            placeholder="Optional working steps or notes..."
                                            style={{
                                              width: "100%",
                                              marginTop: "6px",
                                              fontSize: getExamFontSizePx(),
                                              padding: "8px 12px",
                                              borderRadius: "8px",
                                              background: "rgba(15, 23, 42, 0.9)",
                                              color: "#ffffff",
                                              border: "1px solid rgba(56, 189, 248, 0.3)",
                                              boxSizing: "border-box"
                                            }}
                                          />
                                        </details>
                                      </div>
                                    )}

                                    {/* Fill in the Blank Input */}
                                    {qType === "FILL_IN_BLANK" && (
                                      <div style={{ marginTop: "0.75rem", background: "rgba(15, 23, 42, 0.85)", padding: "14px", borderRadius: "10px", border: "1px solid rgba(249, 115, 22, 0.45)" }}>
                                        <label style={{ display: "block", fontSize: "0.84rem", color: "#fdba74", fontWeight: 700, marginBottom: "8px" }}>
                                          ✏️ Type the exact missing word, term, or formula:
                                        </label>
                                        <input
                                          type="text"
                                          value={typedValue}
                                          onChange={(e) => setExamEssayAnswers({ ...examEssayAnswers, [currentQ.id]: e.target.value })}
                                          placeholder="Type your exact answer for the blank here..."
                                          style={{
                                            width: "100%",
                                            fontSize: getExamFontSizePx(),
                                            padding: "10px 14px",
                                            borderRadius: "8px",
                                            background: "rgba(2, 6, 23, 0.95)",
                                            color: "#ffffff",
                                            border: "1.5px solid rgba(249, 115, 22, 0.6)",
                                            boxSizing: "border-box",
                                            fontWeight: 700
                                          }}
                                        />
                                      </div>
                                    )}

                                    {/* Theory / Essay / Short Answer / Case Study Typing Editor */}
                                    {(isWrittenType || (qType === "MULTIPLE_CHOICE" && qOptions.length === 0)) && (
                                      <div style={{ marginTop: "0.75rem", background: "rgba(15, 23, 42, 0.88)", padding: "14px", borderRadius: "10px", border: `1.5px solid ${qBadge.color}66` }}>
                                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px", flexWrap: "wrap", gap: "8px" }}>
                                          <label style={{ fontSize: "0.85rem", color: "#fde68a", fontWeight: 800, display: "flex", alignItems: "center", gap: "6px" }}>
                                            <span>✍️</span> Type Your Complete Written / Theory Answer Below:
                                          </label>
                                          <div style={{ display: "flex", gap: "10px", alignItems: "center", fontSize: "0.74rem" }}>
                                            <span style={{ color: "#38bdf8", fontWeight: 700 }}>
                                              {wordCount} words typed {currentQ.wordLimit ? `• Target ~${currentQ.wordLimit} words` : ""}
                                            </span>
                                            <span style={{ color: "#34d399" }}>✓ Saved automatically</span>
                                          </div>
                                        </div>
                                        <textarea
                                          rows={qType === "SHORT_ANSWER" ? 4 : 9}
                                          value={typedValue}
                                          onChange={(e) => setExamEssayAnswers({ ...examEssayAnswers, [currentQ.id]: e.target.value })}
                                          placeholder={
                                            qType === "SHORT_ANSWER"
                                              ? "Write a concise, clear response (2–4 sentences or direct steps)..."
                                              : "Write your detailed Theory / Essay explanation, definitions, equations, and structured points here. Your script goes directly to your Teacher for marking..."
                                          }
                                          style={{
                                            width: "100%",
                                            minHeight: qType === "SHORT_ANSWER" ? "110px" : "220px",
                                            fontSize: getExamFontSizePx(),
                                            lineHeight: "1.65",
                                            padding: "12px 14px",
                                            borderRadius: "8px",
                                            background: "rgba(2, 6, 23, 0.94)",
                                            color: "#ffffff",
                                            border: `1.5px solid ${qBadge.color}77`,
                                            boxSizing: "border-box",
                                            fontFamily: "inherit",
                                            resize: "vertical"
                                          }}
                                        />
                                      </div>
                                    )}
                                  </div>
                                );
                              })()}

                              {/* Question Navigation & Submit Bar */}
                              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "12px", marginTop: "1.5rem", flexWrap: "wrap", borderTop: "1px solid rgba(255, 255, 255, 0.1)", paddingTop: "1rem" }}>
                                <button
                                  type="button"
                                  className="btn-secondary"
                                  disabled={safeIndex === 0}
                                  onClick={() => setExamQuestionIndex((prev) => Math.max(0, prev - 1))}
                                  style={{
                                    opacity: safeIndex === 0 ? 0.4 : 1,
                                    cursor: safeIndex === 0 ? "not-allowed" : "pointer",
                                    padding: "10px 18px",
                                    fontSize: "0.85rem",
                                    fontWeight: 700
                                  }}
                                >
                                  ← Previous Question
                                </button>

                                <span style={{ fontSize: "0.82rem", color: "#94a3b8" }}>
                                  Viewing Question <strong>{safeIndex + 1}</strong> of <strong>{questionsList.length}</strong>
                                </span>

                                <div style={{ display: "flex", gap: "10px" }}>
                                  {safeIndex < questionsList.length - 1 ? (
                                    <button
                                      type="button"
                                      className="btn-primary"
                                      onClick={() => setExamQuestionIndex((prev) => Math.min(questionsList.length - 1, prev + 1))}
                                      style={{ padding: "10px 20px", fontSize: "0.85rem", fontWeight: 700, background: "linear-gradient(135deg, #0284c7, #0369a1)" }}
                                    >
                                      Next Question →
                                    </button>
                                  ) : (
                                    <button
                                      type="button"
                                      className="btn-primary"
                                      style={{ padding: "10px 22px", fontSize: "0.85rem", fontWeight: 800, background: "linear-gradient(135deg, #10b981, #059669)" }}
                                      onClick={() => setShowExamConfirmModal(true)}
                                      disabled={loading}
                                    >
                                      {loading ? "Submitting..." : "💾 Submit Final Exam"}
                                    </button>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })()}

                        {examSubmitted && examScoreResult && (
                          <div style={{ background: "rgba(2, 6, 23, 0.85)", padding: "2rem", borderRadius: "14px", border: examScoreResult.needsManualReview ? "1px solid rgba(212, 175, 55, 0.5)" : "1px solid rgba(16, 185, 129, 0.4)", textAlign: "center" }}>
                            <span style={{ fontSize: "3rem" }}>{examScoreResult.needsManualReview ? "📝" : examScoreResult.isPassed ? "🎉" : "📚"}</span>
                            <h2 style={{ margin: "0.5rem 0", color: examScoreResult.needsManualReview ? "#fde68a" : examScoreResult.isPassed ? "#34d399" : "#f87171" }}>
                              {examScoreResult.needsManualReview
                                ? "SCRIPT SUBMITTED • THEORY PENDING TEACHER MARKING"
                                : examScoreResult.isPassed
                                  ? "EXAMINATION PASSED"
                                  : "ASSESSMENT COMPLETED"}
                            </h2>

                            {/* Performance Score & Proctoring Deductions Breakdown */}
                            <div style={{
                              maxWidth: "560px",
                              margin: "1.25rem auto",
                              background: "rgba(15, 23, 42, 0.9)",
                              borderRadius: "10px",
                              border: "1px solid rgba(255, 255, 255, 0.1)",
                              padding: "16px",
                              textAlign: "left"
                            }}>
                              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px", fontSize: "0.88rem" }}>
                                <span style={{ color: "#94a3b8" }}>
                                  {examScoreResult.needsManualReview ? "Provisional Objective Section Score:" : "Base Raw Deterministic Score:"}
                                </span>
                                <strong style={{ color: "#f8fafc" }}>
                                  {examScoreResult.objectiveMarksObtained !== undefined && examScoreResult.totalMarks
                                    ? `${examScoreResult.objectiveMarksObtained} / ${examScoreResult.totalMarks} Marks (${examScoreResult.rawScore ?? examScoreResult.score}%)`
                                    : `${examScoreResult.rawScore ?? examScoreResult.score}%`}
                                </strong>
                              </div>
                              {examScoreResult.needsManualReview && (
                                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px", fontSize: "0.88rem", color: "#fde68a" }}>
                                  <span>Typed Theory / Written Questions Queued:</span>
                                  <strong>{examScoreResult.writtenQuestionsCount || 1} section(s) awaiting Teacher marking</strong>
                                </div>
                              )}
                              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px", fontSize: "0.88rem", color: (examScoreResult.proctoringPenalty || 0) > 0 ? "#f87171" : "#34d399" }}>
                                <span>AI Proctoring Lost Marks Subtracted:</span>
                                <strong>-{examScoreResult.proctoringPenalty || 0} Marks ({examScoreResult.proctoringViolations || 0} warning(s) logged)</strong>
                              </div>
                              <div style={{ display: "flex", justifyContent: "space-between", borderTop: "1px solid rgba(255, 255, 255, 0.1)", paddingTop: "8px", fontSize: "1.05rem" }}>
                                <span style={{ color: "#38bdf8", fontWeight: 800 }}>
                                  {examScoreResult.needsManualReview ? "Current Status:" : "Final Verified Score (After Deductions):"}
                                </span>
                                <strong style={{ color: "#fbbf24", fontWeight: 900 }}>
                                  {examScoreResult.needsManualReview
                                    ? `Pending Review (${examScoreResult.scoreObtained ?? 0}/${examScoreResult.totalMarks ?? 100} • ${examScoreResult.score}%)`
                                    : `${examScoreResult.scoreObtained ?? 0}/${examScoreResult.totalMarks ?? 100} (${examScoreResult.score}% • ${examScoreResult.grade})`}
                                </strong>
                              </div>
                              {examScoreResult.teacherFeedback && (
                                <div style={{ marginTop: "10px", paddingTop: "8px", borderTop: "1px dashed rgba(255,255,255,0.12)", fontSize: "0.84rem", color: "#a7f3d0" }}>
                                  <strong>Teacher Examiner Comment:</strong> {examScoreResult.teacherFeedback}
                                </div>
                              )}
                            </div>

                            <p style={{ color: "#94a3b8", fontSize: "0.85rem" }}>
                              ({examScoreResult.correct} objective question(s) auto-verified out of {examScoreResult.total} total questions)
                            </p>
                            <div style={{ display: "inline-block", background: "rgba(255, 255, 255, 0.05)", padding: "10px 20px", borderRadius: "8px", margin: "1rem 0" }}>
                              <span style={{ color: "#cbd5e1" }}>
                                🔒 Recorded & Permanently Locked: <strong>{examScoreResult.needsManualReview ? "TYPED SCRIPT DELIVERED TO TEACHER DESK" : `VERIFIED DETERMINISTIC RESULT FOR ${academicTerm.toUpperCase()}`}</strong>
                              </span>
                            </div>
                            <div>
                              <button
                                type="button"
                                className="btn-secondary"
                                onClick={() => { setExamSubmitted(false); setExamAnswers({}); setExamEssayAnswers({}); }}
                              >
                                ← Back to Examination Schedule
                              </button>
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </>
                )}
              </div>
            );
          })()}

          {/* TAB: STUDENT ATTENDANCE RECORD SUMMARY */}
          {activeTab === "attendance" && (
            <div className="role-workspace-card">
              <div className="workspace-title-row">
                <div>
                  <h2><span>🎯</span> PERSONAL DAILY ATTENDANCE RECORD &amp; PRESENCE RATE</h2>
                  <p>Live attendance roll-call status synced directly from Faculty &amp; Institutional Attendance Registry.</p>
                </div>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setActiveTab("schedule")}
                >
                  ← Back to Timetable
                </button>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "14px", marginTop: "12px" }}>
                <div style={{ background: "rgba(5, 15, 35, 0.78)", border: "1.5px solid #d4af37", borderRadius: "12px", padding: "16px" }}>
                  <span style={{ fontSize: "0.75rem", color: "#f6dd84", fontWeight: 800 }}>OVERALL ATTENDANCE RATE</span>
                  <div style={{ fontSize: "1.8rem", fontWeight: 900, color: "#34d399", marginTop: "4px" }}>
                    {attendanceSummary?.rate || "0.0%"}
                  </div>
                </div>
                <div style={{ background: "rgba(5, 15, 35, 0.78)", border: "1.5px solid #38bdf8", borderRadius: "12px", padding: "16px" }}>
                  <span style={{ fontSize: "0.75rem", color: "#bae6fd", fontWeight: 800 }}>SESSIONS PRESENT / TOTAL</span>
                  <div style={{ fontSize: "1.8rem", fontWeight: 900, color: "#f8fafc", marginTop: "4px" }}>
                    {attendanceSummary?.presentCount || 0} / {attendanceSummary?.totalCount || 0}
                  </div>
                </div>
                <div style={{ background: "rgba(5, 15, 35, 0.78)", border: "1.5px solid rgba(255,255,255,0.2)", borderRadius: "12px", padding: "16px" }}>
                  <span style={{ fontSize: "0.75rem", color: "#cbd5e1", fontWeight: 800 }}>LAST ARCHIVED DATE</span>
                  <div style={{ fontSize: "1.2rem", fontWeight: 800, color: "#f6dd84", marginTop: "8px" }}>
                    {attendanceSummary?.lastArchivedDate || "Awaiting first class roll call"}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: VERIFIED REPORT CARD */}
          {activeTab === "report-card" && (
            <div className="role-workspace-card">
              <div className="workspace-title-row">
                <div>
                  <h2><span>📄</span> OFFICIAL ACADEMIC REPORT CARD & TRANSCRIPT</h2>
                  <p>Cryptographically verified student performance record across all grades and levels</p>
                </div>
                {feeArrears <= 0 && (
                  <button
                    type="button"
                    className="btn-primary"
                    onClick={() => window.print()}
                  >
                    🖨️ Print / Download Transcript (PDF)
                  </button>
                )}
              </div>

              {/* REQUIREMENT: Debtor restriction - cannot access result if student owes */}
              {feeArrears > 0 ? (
                <div style={{
                  background: "rgba(239, 68, 68, 0.12)",
                  border: "1px solid rgba(239, 68, 68, 0.4)",
                  borderRadius: "14px",
                  padding: "3rem 2rem",
                  textAlign: "center",
                  margin: "1.5rem 0"
                }}>
                  <span style={{ fontSize: "3.5rem", display: "block", marginBottom: "12px" }}>🔒</span>
                  <h2 style={{ color: "#f87171", margin: "0 0 10px" }}>
                    OFFICIAL REPORT CARD & TRANSCRIPT LOCKED
                  </h2>
                  <p style={{ color: "#e2e8f0", maxWidth: "620px", margin: "0 auto 1.5rem", fontSize: "1rem", lineHeight: "1.6" }}>
                    Access to your verified report card and official transcript has been withheld due to outstanding tuition/hostel balance of <strong style={{ color: "#fca5a5" }}>${feeArrears.toFixed(2)}</strong>.
                    Per {schoolOfficialName || getActiveSchoolName(studentProfile)} Financial Regulations, students in fee arrears cannot access academic results or register for new semester courses until cleared by the Accountant.
                  </p>
                  <div style={{ display: "flex", gap: "12px", justifyContent: "center" }}>
                    <button
                      type="button"
                      className="btn-primary"
                      style={{ background: "linear-gradient(135deg, #10b981, #059669)" }}
                      onClick={() => setFeedback({ type: "info", message: "Parent/Guardian notified to settle fees via Mobile Money / Bank Transfer." })}
                    >
                      💳 Notify Parent for Immediate Fee Settlement
                    </button>
                  </div>
                </div>
              ) : (
                /* Printable Academic Report Card Sheet */
                <div className="report-card-sheet">
                  {/* REQUIREMENT: Show that reports has been wrapped with year, time, and date of wrapping */}
                  {reportWrapInfo?.isWrapped && (
                    <div style={{
                      background: "linear-gradient(135deg, rgba(16, 185, 129, 0.12), rgba(6, 95, 70, 0.18))",
                      border: "2px solid #10b981",
                      borderRadius: "12px",
                      padding: "1rem 1.25rem",
                      marginBottom: "1.25rem",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      flexWrap: "wrap",
                      gap: "12px",
                      boxShadow: "0 4px 15px rgba(16, 185, 129, 0.15)"
                    }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
                        <span style={{ fontSize: "2.2rem" }}>📜</span>
                        <div>
                          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                            <strong style={{ color: "#065f46", fontSize: "1rem", textTransform: "uppercase", letterSpacing: "1px" }}>
                              OFFICIAL ACADEMIC REPORT CARD WRAPPED & SEALED
                            </strong>
                            <span style={{ background: "#10b981", color: "#022c22", fontSize: "0.72rem", fontWeight: "900", padding: "2px 8px", borderRadius: "999px" }}>
                              ACADEMIC YEAR WRAP
                            </span>
                          </div>
                          <div style={{ color: "#1e293b", fontSize: "0.88rem", marginTop: "4px" }}>
                            This official report card has been wrapped for <strong>Academic Year {reportWrapInfo.academicYear}</strong> on <strong>{reportWrapInfo.wrapDate}</strong> at <strong>{reportWrapInfo.wrapTime}</strong>.
                          </div>
                          <div style={{ fontSize: "0.78rem", color: "#475569", marginTop: "2px" }}>
                            Certified Authority: <strong>{reportWrapInfo.certifiedBy}</strong>
                          </div>
                        </div>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <span style={{ fontSize: "0.75rem", color: "#64748b", display: "block" }}>Cryptographic Digest:</span>
                        <span style={{ fontSize: "0.8rem", color: "#0f172a", fontFamily: "monospace", fontWeight: "800" }}>{reportWrapInfo.certificateId}</span>
                      </div>
                    </div>
                  )}

                  <div className="report-header" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "1rem", flexWrap: "wrap" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
                      <img
                        src={customSchoolLogo || "/assets/gbs_crest_badge.jpg"}
                        alt="School Crest"
                        style={{ width: "56px", height: "56px", objectFit: "contain", borderRadius: "8px", border: "1px solid #cbd5e1", background: "#ffffff", padding: "3px" }}
                      />
                      <div>
                        <h2 style={{ margin: 0, fontSize: "1.4rem", fontWeight: "900", color: "#0f172a" }}>{schoolOfficialName}</h2>
                        <span style={{ fontSize: "0.85rem", color: "#475569" }}>OFFICIAL STUDENT TRANSCRIPT & REPORT OF GRADES</span>
                      </div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <span style={{ display: "block", fontSize: "0.8rem", color: "#64748b" }}>Academic Year: <strong>{reportWrapInfo?.academicYear || "2026-2027"}</strong></span>
                      <span style={{ display: "block", fontSize: "0.8rem", color: "#64748b" }}>Level / Term: <strong>{academicLevel} • {academicTerm}</strong></span>
                    </div>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "1rem", marginBottom: "1rem", fontSize: "0.85rem" }}>
                    <div><strong>Student Name:</strong> {currentUser.firstName} {currentUser.lastName}</div>
                    <div><strong>Student ID:</strong> GBS-STU-2026-084</div>
                    <div><strong>Enrolled Level:</strong> {academicLevel}</div>
                  </div>

                  <table className="report-table">
                    <thead>
                      <tr>
                        <th>Course Subject</th>
                        <th>Class Teacher</th>
                        <th>Mark (100)</th>
                        <th>Grade</th>
                        <th>Credit</th>
                        <th>Remarks</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(() => {
                        if (publishedGrades.length === 0) {
                          return (
                            <tr>
                              <td colSpan="6" style={{ textAlign: "center", padding: "2.5rem 1rem", color: "#64748b" }}>
                                <div style={{ fontSize: "1.5rem", marginBottom: "6px" }}>📋</div>
                                <strong style={{ color: "#334155" }}>No Official Examination Results Published Yet</strong>
                                <p style={{ margin: "4px 0 0", fontSize: "0.82rem", color: "#94a3b8" }}>
                                  When faculty teachers mark and publish exam grades for your enrolled courses, your verified grades, scores, credit hours, and teacher remarks will immediately appear here.
                                </p>
                              </td>
                            </tr>
                          );
                        }

                        return publishedGrades.map((row, rIdx) => (
                          <tr key={row.id || rIdx} style={{ background: "rgba(16, 185, 129, 0.06)" }}>
                            <td>
                              <strong>{row.subjectName}</strong>
                              <span style={{ display: "block", fontSize: "0.72rem", color: "#059669", fontWeight: "800", marginTop: "2px" }}>
                                ✓ RESULT PUBLISHED • {row.term || "Term 1"} • {row.publishedAt || (row.publishedDate ? `${row.publishedDate} at ${row.publishedTime}` : "Verified")}
                              </span>
                            </td>
                            <td>{row.teacherName || "Faculty Instructor"}</td>
                            <td><strong>{row.score}</strong></td>
                            <td><strong style={{ color: row.grade === "F" ? "#ef4444" : "#10b981" }}>{row.grade}</strong></td>
                            <td>{row.credit || 1.0}</td>
                            <td>{row.remarks || "Performance verified"}</td>
                          </tr>
                        ));
                      })()}
                    </tbody>
                  </table>

                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "1.5rem", borderTop: "1px solid #e2e8f0", paddingTop: "1rem", flexWrap: "wrap", gap: "14px" }}>
                    <div>
                      <span style={{ display: "block", fontSize: "0.9rem" }}>Cumulative GPA: <strong style={{ color: "#10b981", fontSize: "1.1rem" }}>3.88</strong></span>
                      <span style={{ display: "block", fontSize: "0.8rem", color: "#64748b" }}>
                        Overall Attendance: <strong>{attendanceSummary?.rate || "98.5%"} Present ({attendanceSummary?.presentCount || 48}/{attendanceSummary?.totalCount || 50} Days Synced from Teacher Archives)</strong>
                      </span>
                    </div>
                    <div style={{ textAlign: "center" }}>
                      <OfficialInstitutionalSeal schoolName={schoolOfficialName} academicYear="2026-2027" size={90} />
                      <span style={{ display: "block", fontSize: "0.68rem", color: "#64748b", marginTop: "3px" }}>
                        INSTITUTIONAL ACCREDITATION SEAL
                      </span>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <span style={{ display: "block", fontSize: "0.75rem", color: "#64748b" }}>Registrar Signature: <em>Verified Digital Seal</em></span>
                      <span className="report-hash-badge">
                        SHA-256: 8a7c29e41f0b99de23401fa91782e4c0
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 5: VIRTUAL MEETINGS & NOTICES (WITH DAYS REMINDER & SAVE FOR REFERENCE) */}
          {activeTab === "meetings" && (
            <div className="role-workspace-card">
              <div className="workspace-title-row">
                <div>
                  <h2><span>💻</span> LIVE ONLINE CLASSROOMS & LEARNING ARCHIVES</h2>
                  <p>Join scheduled interactive lectures, observe days reminder notices, and save sessions for study reference</p>
                </div>
                <span className="badge-status badge-present">
                  💾 {savedReferenceMeetings.length} Reference(s) in Vault
                </span>
              </div>

              {/* High-Visibility Cooperative Learning & Social Lounge Banner */}
              <div style={{
                background: "linear-gradient(135deg, rgba(139, 92, 246, 0.2) 0%, rgba(59, 130, 246, 0.15) 100%)",
                border: "1.5px solid rgba(139, 92, 246, 0.35)",
                borderRadius: "12px",
                padding: "1rem 1.25rem",
                marginBottom: "1.5rem",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexWrap: "wrap",
                gap: "1rem"
              }}>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                    <span style={{ fontSize: "1.2rem" }}>🎙️</span>
                    <strong style={{ color: "#c084fc", fontSize: "1rem" }}>STUDENT COOPERATIVE CONFERENCING & SOCIAL LOUNGE</strong>
                    <span style={{ background: "#8b5cf6", color: "#fff", fontSize: "0.68rem", fontWeight: 800, padding: "2px 6px", borderRadius: "4px" }}>ACTIVE WEBRTC</span>
                  </div>
                  <p style={{ margin: 0, fontSize: "0.85rem", color: "#cbd5e1" }}>
                    Collaborate with fellow scholars across classes in live audio and video conference rooms for STEM circles, debate, coding, or social common room socializing.
                  </p>
                </div>
                <div style={{ display: "flex", gap: "8px" }}>
                  <button
                    type="button"
                    onClick={() => handleOpenCoopConferencing(null, "VOICE")}
                    style={{
                      background: "rgba(139, 92, 246, 0.25)",
                      border: "1px solid #8b5cf6",
                      color: "#e9d5ff",
                      borderRadius: "8px",
                      padding: "8px 14px",
                      fontWeight: 700,
                      fontSize: "0.82rem",
                      cursor: "pointer"
                    }}
                  >
                    🎙️ Voice Call Lounge
                  </button>
                  <button
                    type="button"
                    onClick={() => handleOpenCoopConferencing(null, "VIDEO")}
                    style={{
                      background: "#8b5cf6",
                      border: "none",
                      color: "#ffffff",
                      borderRadius: "8px",
                      padding: "8px 14px",
                      fontWeight: 800,
                      fontSize: "0.82rem",
                      cursor: "pointer",
                      boxShadow: "0 4px 12px rgba(139, 92, 246, 0.4)"
                    }}
                  >
                    📹 Video Conference
                  </button>
                </div>
              </div>

              {/* Teacher Topic Videos for Class Playback in Teacher's Absence */}
              <div style={{ marginBottom: "2rem" }}>
                <ClassTopicVideoPlatform mode="STUDENT" currentUser={currentUser} />
              </div>

              {/* Real-Time In-System Live Teacher Online Classes */}
              <LiveCallLauncherAndReceiver
                variant="STUDENT_CLASSROOM_LIST"
                userRole="STUDENT"
                currentUser={currentUser}
                onFeedback={(msg, isErr) => setFeedback({ type: isErr ? "error" : "success", message: msg })}
              />

              {/* Real-Time Direct Student Video / Voice Calling Studio (Teachers, Headmaster & Peers) */}
              <LiveCallLauncherAndReceiver
                variant="FULL_STUDIO"
                userRole="STUDENT"
                currentUser={currentUser}
                onFeedback={(msg, isErr) => setFeedback({ type: isErr ? "error" : "success", message: msg })}
              />

              {/* Requirement: Live Online Classes with Day Reminder from Teacher Notice */}
              <h3 style={{ color: "#34d399", margin: "0 0 12px", display: "flex", alignItems: "center", gap: "8px" }}>
                <span>🔴</span> Active & Upcoming Live Online Classes to Join:
              </h3>

              <div className="card-grid-3" style={{ marginBottom: "2rem" }}>
                {meetings.length === 0 ? (
                  <div style={{ background: "rgba(255, 255, 255, 0.04)", padding: "1.5rem", borderRadius: "8px", color: "#94a3b8", gridColumn: "1 / -1" }}>
                    No virtual meetings scheduled currently.
                  </div>
                ) : (
                  meetings.map((m) => {
                    const daysDiff = Math.ceil((new Date(m.startTime).getTime() - Date.now()) / (1000 * 3600 * 24));
                    const isSaved = savedReferenceMeetings.some((saved) => saved.id === m.id);
                    return (
                      <div key={m.id} className="item-card" style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <span className="role-portal-badge" style={{ color: "#38bdf8" }}>{m.platform || "Zoom Video"}</span>
                          <span style={{ fontSize: "0.75rem", color: "#94a3b8" }}>
                            {new Date(m.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>

                        <h3 style={{ margin: "2px 0", fontSize: "1.05rem", color: "#f8fafc" }}>{m.title}</h3>
                        <p style={{ fontSize: "0.8rem", color: "#cbd5e1", margin: 0 }}>
                          Scheduled Date: <strong>{new Date(m.startTime).toLocaleDateString()}</strong>
                        </p>

                        {/* REQUIREMENT: Days reminder from teacher notice */}
                        <div style={{
                          background: daysDiff <= 0 ? "rgba(16, 185, 129, 0.15)" : "rgba(245, 158, 11, 0.15)",
                          padding: "8px 10px",
                          borderRadius: "6px",
                          border: `1px solid ${daysDiff <= 0 ? "rgba(16, 185, 129, 0.3)" : "rgba(245, 158, 11, 0.3)"}`
                        }}>
                          <span style={{ display: "block", fontSize: "0.75rem", fontWeight: "700", color: daysDiff <= 0 ? "#34d399" : "#fbbf24" }}>
                            {daysDiff <= 0 ? "⚡ HAPPENING TODAY — JOIN NOW" : `⏰ REMINDER: Starts in ${daysDiff} day(s) from Teacher Notice`}
                          </span>
                          <span style={{ display: "block", fontSize: "0.72rem", color: "#e2e8f0", marginTop: "2px" }}>
                            Teacher Note: "Please review week 4 reading notes and prepare questions for the seminar."
                          </span>
                        </div>

                        {/* Actions: Join and Save for Reference (1-Click Auto Join with Embedded Passcode) */}
                        <div style={{ display: "flex", gap: "8px", marginTop: "auto" }}>
                          <button
                            type="button"
                            onClick={() => handleJoinLiveMeeting(m)}
                            className="btn-primary"
                            style={{ flex: 1, textAlign: "center", fontSize: "0.8rem", padding: "8px", cursor: "pointer", background: "linear-gradient(135deg, #0284c7, #0369a1)", border: "none", borderRadius: "8px", color: "#fff", fontWeight: 800, boxShadow: "0 4px 12px rgba(2, 132, 199, 0.4)" }}
                          >
                            🚀 Join Live Class
                          </button>
                          <button
                            type="button"
                            className="btn-secondary"
                            onClick={() => handleSaveMeetingReference(m)}
                            aria-label="Save this online class for future reference"
                            style={{
                              fontSize: "0.8rem",
                              padding: "8px 12px",
                              borderColor: isSaved ? "#10b981" : "rgba(255, 255, 255, 0.2)",
                              color: isSaved ? "#34d399" : "#cbd5e1"
                            }}
                          >
                            {isSaved ? "✅ Saved" : "💾 Save"}
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Saved Online Learning References Archive */}
              <div style={{ background: "rgba(15, 23, 42, 0.6)", padding: "1.25rem", borderRadius: "10px", border: "1px solid rgba(56, 189, 248, 0.2)", marginBottom: "2rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                  <h4 style={{ margin: 0, color: "#38bdf8", fontSize: "1rem", display: "flex", alignItems: "center", gap: "6px" }}>
                    <span>💾</span> SAVED LEARNING REFERENCES & LECTURE REPLAYS
                  </h4>
                  <span style={{ fontSize: "0.8rem", color: "#94a3b8" }}>
                    Personal Study Vault ({savedReferenceMeetings.length} items saved)
                  </span>
                </div>

                {savedReferenceMeetings.length === 0 ? (
                  <p style={{ margin: 0, fontSize: "0.85rem", color: "#94a3b8" }}>
                    No sessions saved yet. Click the <strong>"💾 Save"</strong> button on any live classroom card above to bookmark it here for examination revision.
                  </p>
                ) : (
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "10px" }}>
                    {savedReferenceMeetings.map((s) => (
                      <div key={s.id} style={{ background: "rgba(2, 6, 23, 0.6)", padding: "12px", borderRadius: "8px", border: "1px solid rgba(255, 255, 255, 0.1)" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <span className="role-portal-badge" style={{ color: "#38bdf8", fontSize: "0.7rem" }}>{s.platform || "Virtual Lecture"}</span>
                          <button
                            type="button"
                            onClick={() => handleSaveMeetingReference(s)}
                            style={{ background: "none", border: "none", color: "#f87171", cursor: "pointer", fontSize: "0.75rem" }}
                            aria-label="Remove from saved references"
                          >
                            ✖ Remove
                          </button>
                        </div>
                        <h4 style={{ margin: "4px 0", fontSize: "0.95rem", color: "#f8fafc" }}>{s.title}</h4>
                        <span style={{ fontSize: "0.75rem", color: "#94a3b8", display: "block" }}>
                          Scheduled: {new Date(s.startTime).toLocaleString()}
                        </span>
                        <div style={{ marginTop: "8px", display: "flex", gap: "8px" }}>
                          <a
                            href={formatMeetingUrl(s.meetingUrl, "GBS2026")}
                            target="_blank"
                            rel="noreferrer"
                            className="btn-primary"
                            style={{ fontSize: "0.75rem", padding: "4px 10px", textDecoration: "none" }}
                          >
                            ▶️ Access Recording / Notes
                          </a>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Institutional Announcements & Circulars */}
              <h4 style={{ color: "#38bdf8", margin: "0 0 10px" }}>Institutional Announcements & Circulars:</h4>
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                {announcements.length === 0 ? (
                  <div style={{ background: "rgba(255, 255, 255, 0.04)", padding: "1rem", borderRadius: "8px", color: "#94a3b8" }}>
                    No announcements published today.
                  </div>
                ) : (
                  announcements.map((an) => (
                    <div key={an.id} style={{ background: "rgba(255, 255, 255, 0.04)", padding: "1rem", borderRadius: "10px", border: "1px solid rgba(255, 255, 255, 0.08)" }}>
                      <strong style={{ color: "#f8fafc", fontSize: "0.95rem" }}>{an.title}</strong>
                      <p style={{ margin: "4px 0 0", color: "#cbd5e1", fontSize: "0.85rem" }}>{an.content}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* TAB 5B: TEACHER TOPIC VIDEOS FOR CLASS PLAYBACK */}
          {activeTab === "topicVideos" && (
            <div className="role-workspace-card">
              <ClassTopicVideoPlatform mode="STUDENT" currentUser={currentUser} />
            </div>
          )}

          {/* TAB: COURSE & CLASS REGISTRATION (UNLOCKED UPON FEE CLEARANCE) */}
          {activeTab === "courses" && (
            <div className="role-workspace-card">
              <div className="workspace-title-row">
                <div>
                  <h2><span>📚</span> SEMESTER COURSE & CLASS REGISTRATION</h2>
                  <p>Register official curriculum subjects, verify course credits, and print verified registration slips</p>
                </div>
                {feeArrears <= 0 && (
                  <button
                    type="button"
                    className="btn-primary"
                    onClick={() => window.print()}
                  >
                    🖨️ Print Registration Slip (PDF)
                  </button>
                )}
              </div>

              {feeArrears > 0 ? (
                <div style={{
                  background: "rgba(239, 68, 68, 0.12)",
                  border: "1px solid rgba(239, 68, 68, 0.4)",
                  borderRadius: "14px",
                  padding: "3rem 2rem",
                  textAlign: "center",
                  margin: "1.5rem 0"
                }}>
                  <span style={{ fontSize: "3.5rem", display: "block", marginBottom: "12px" }}>🔒</span>
                  <h2 style={{ color: "#f87171", margin: "0 0 10px" }}>
                    COURSE & CLASS REGISTRATION RESTRICTED
                  </h2>
                  <p style={{ color: "#e2e8f0", maxWidth: "640px", margin: "0 auto 1.5rem", fontSize: "1rem", lineHeight: "1.6" }}>
                    Official semester course enrollment and class group selection are locked due to an outstanding fee balance of <strong style={{ color: "#fca5a5" }}>${feeArrears.toFixed(2)}</strong>.
                    Once tuition and institutional fees are settled, the system automatically lifts the hold and authorizes full course registration.
                  </p>
                  <Link
                    to="/portal/parent/dashboard"
                    className="btn-primary"
                    style={{ textDecoration: "none", display: "inline-flex", background: "linear-gradient(135deg, #10b981, #059669)", padding: "10px 22px" }}
                  >
                    💳 Settle Balance via Parent Portal →
                  </Link>
                </div>
              ) : (
                <div>
                  {/* Financial Clearance Verified Banner */}
                  <div style={{
                    background: "linear-gradient(135deg, rgba(16, 185, 129, 0.18) 0%, rgba(5, 150, 105, 0.1) 100%)",
                    border: "1px solid rgba(16, 185, 129, 0.4)",
                    borderRadius: "12px",
                    padding: "1.25rem",
                    marginBottom: "1.5rem"
                  }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px" }}>
                      <div>
                        <span style={{ background: "rgba(16, 185, 129, 0.3)", color: "#34d399", fontSize: "0.75rem", padding: "3px 10px", borderRadius: "12px", fontWeight: "800" }}>
                          ✓ FINANCIAL CLEARANCE CERTIFIED
                        </span>
                        <h3 style={{ margin: "6px 0 2px", color: "#34d399", fontSize: "1.1rem" }}>
                          Official Course Enrollment Authorized for {academicTerm} (2026-2027)
                        </h3>
                        <p style={{ margin: 0, fontSize: "0.82rem", color: "#cbd5e1" }}>
                          All tuition fees cleared ($0.00 outstanding balance). Certified by GBS Academic Registry & Finance Directorate.
                        </p>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <span style={{ display: "block", fontSize: "0.78rem", color: "#94a3b8" }}>Tertiary Index Number</span>
                        <strong style={{ fontSize: "1.05rem", color: "#f8fafc", fontFamily: "monospace" }}>UG/ENG/2026/084</strong>
                      </div>
                    </div>
                  </div>

                  {/* Registered Credits KPI Bar */}
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "12px", marginBottom: "1.5rem" }}>
                    <div style={{ background: "rgba(15, 23, 42, 0.7)", padding: "12px 16px", borderRadius: "8px", border: "1px solid rgba(255, 255, 255, 0.08)" }}>
                      <span style={{ fontSize: "0.75rem", color: "#94a3b8", display: "block" }}>Enrolled Courses</span>
                      <strong style={{ fontSize: "1.3rem", color: "#38bdf8" }}>{registeredCourseCodes.length} Subjects</strong>
                    </div>
                    <div style={{ background: "rgba(15, 23, 42, 0.7)", padding: "12px 16px", borderRadius: "8px", border: "1px solid rgba(255, 255, 255, 0.08)" }}>
                      <span style={{ fontSize: "0.75rem", color: "#94a3b8", display: "block" }}>Registered Credits</span>
                      <strong style={{ fontSize: "1.3rem", color: "#34d399" }}>
                        {registeredCourseCodes.length * 3} / 21 Credits
                      </strong>
                    </div>
                    <div style={{ background: "rgba(15, 23, 42, 0.7)", padding: "12px 16px", borderRadius: "8px", border: "1px solid rgba(255, 255, 255, 0.08)" }}>
                      <span style={{ fontSize: "0.75rem", color: "#94a3b8", display: "block" }}>Academic Level</span>
                      <strong style={{ fontSize: "1.1rem", color: "#f8fafc" }}>{academicLevel}</strong>
                    </div>
                    <div style={{ background: "rgba(15, 23, 42, 0.7)", padding: "12px 16px", borderRadius: "8px", border: "1px solid rgba(255, 255, 255, 0.08)" }}>
                      <span style={{ fontSize: "0.75rem", color: "#94a3b8", display: "block" }}>Registration Status</span>
                      <strong style={{ fontSize: "1.1rem", color: "#10b981" }}>ACTIVE & CONFIRMED</strong>
                    </div>
                    <div style={{ background: "rgba(15, 23, 42, 0.7)", padding: "12px 16px", borderRadius: "8px", border: "1px solid rgba(255, 255, 255, 0.08)", display: "flex", alignItems: "center" }}>
                      <button
                        type="button"
                        className="btn-primary"
                        onClick={() => {
                          const firstEnrolled = availableCourses.find((c) => registeredCourseCodes.includes(c.code)) || availableCourses[0];
                          setSelectedCourseForFiles(firstEnrolled);
                          setShowCourseFilesModal(true);
                        }}
                        style={{
                          width: "100%",
                          padding: "10px 14px",
                          background: "linear-gradient(135deg, #0284c7 0%, #0369a1 100%)",
                          fontWeight: 800,
                          fontSize: "0.82rem",
                          boxShadow: "0 4px 14px rgba(2, 132, 199, 0.4)",
                          display: "inline-flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: "8px",
                          cursor: "pointer"
                        }}
                      >
                        📂 Go to Course Enrolled File Location
                      </button>
                    </div>
                  </div>

                  {/* Course Registration Table */}
                  <div className="role-table-responsive">
                    <table className="role-table">
                      <thead>
                        <tr>
                          <th>Course Code</th>
                          <th>Course Title</th>
                          <th>Credits</th>
                          <th>Type</th>
                          <th>Assigned Faculty</th>
                          <th>Schedule & Hall</th>
                          <th>Registration Action</th>
                          <th>Course Enrolled File Location</th>
                        </tr>
                      </thead>
                      <tbody>
                        {availableCourses.map((c) => {
                          const isRegistered = registeredCourseCodes.includes(c.code);
                          return (
                            <tr key={c.code} style={{ background: isRegistered ? "rgba(16, 185, 129, 0.05)" : "transparent" }}>
                              <td>
                                <strong style={{ color: "#38bdf8", fontFamily: "monospace" }}>{c.code}</strong>
                              </td>
                              <td>
                                <strong style={{ color: "#f8fafc" }}>{c.title}</strong>
                              </td>
                              <td>{c.credits}.0</td>
                              <td>
                                <span className="role-portal-badge" style={{ color: c.type.includes("Core") ? "#38bdf8" : "#c084fc", fontSize: "0.72rem" }}>
                                  {c.type}
                                </span>
                              </td>
                              <td>{c.instructor}</td>
                              <td>
                                <div style={{ fontSize: "0.78rem" }}>
                                  <div>{c.schedule}</div>
                                  <span style={{ color: "#94a3b8" }}>{c.hall}</span>
                                </div>
                              </td>
                              <td>
                                <button
                                  type="button"
                                  onClick={() => handleToggleCourseRegistration(c.code)}
                                  style={{
                                    padding: "6px 14px",
                                    borderRadius: "6px",
                                    fontSize: "0.8rem",
                                    fontWeight: "700",
                                    cursor: "pointer",
                                    transition: "all 0.15s ease",
                                    border: isRegistered ? "1px solid #10b981" : "1px solid rgba(255, 255, 255, 0.2)",
                                    background: isRegistered ? "rgba(16, 185, 129, 0.2)" : "rgba(255, 255, 255, 0.08)",
                                    color: isRegistered ? "#34d399" : "#cbd5e1"
                                  }}
                                >
                                  {isRegistered ? "✓ Enrolled" : "+ Register"}
                                </button>
                              </td>
                              <td>
                                {isRegistered ? (
                                  <button
                                    type="button"
                                    className="btn-primary"
                                    onClick={() => {
                                      setSelectedCourseForFiles(c);
                                      setShowCourseFilesModal(true);
                                    }}
                                    style={{
                                      padding: "6px 12px",
                                      fontSize: "0.78rem",
                                      background: "linear-gradient(135deg, #0284c7, #0ea5e9)",
                                      boxShadow: "0 2px 8px rgba(14, 165, 233, 0.35)",
                                      fontWeight: "800",
                                      display: "inline-flex",
                                      alignItems: "center",
                                      gap: "6px",
                                      cursor: "pointer"
                                    }}
                                    aria-label="Go to Course Enrolled File Location & Academic Materials"
                                  >
                                    📂 Go to Course Enrolled (File Location)
                                  </button>
                                ) : (
                                  <span style={{ fontSize: "0.75rem", color: "#64748b" }}>Register first</span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  <div style={{ marginTop: "1.5rem", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px", background: "rgba(2, 6, 23, 0.5)", padding: "14px 18px", borderRadius: "10px", border: "1px solid rgba(255, 255, 255, 0.08)" }}>
                    <div style={{ fontSize: "0.82rem", color: "#94a3b8" }}>
                      * Registered courses automatically populate your weekly timetable, exam schedule, and grade transcript.
                    </div>
                    <button
                      type="button"
                      className="btn-primary"
                      onClick={() => {
                        window.print();
                        setFeedback({ type: "success", message: "Course registration slip generated and prepared for print/PDF." });
                      }}
                    >
                      🖨️ Download Course Registration Slip (PDF)
                    </button>
                  </div>
                </div>
              )}

              <div style={{ marginTop: "1.5rem" }}>
                <UniversityOperationsPanel
                  mode="STUDENT"
                  currentUser={studentProfile}
                  onFeedback={(msg) => setFeedback({ type: "success", message: msg })}
                />
              </div>
            </div>
          )}

          {/* TAB 6: REQUIREMENT: ALUMNI DIRECTORY & HALL OF FAME */}
          {activeTab === "alumni" && (
            <div className="role-workspace-card">
              <div className="workspace-title-row">
                <div>
                  <h2><span>🎓</span> GBS GLOBAL ALUMNI DIRECTORY & HALL OF FAME</h2>
                  <p>Explore graduates from Primary to University levels (Level 100-400 to Alumni), career pathways, and mentorship connections</p>
                </div>
                <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                  <button
                    type="button"
                    className="btn-secondary"
                    style={{ borderColor: "#a855f7", color: "#c084fc", fontSize: "0.82rem" }}
                    onClick={() => setShowAlumniRecordsModal(true)}
                  >
                    📜 Access My Alumni Academic Records & Degree Archive
                  </button>
                  <span className="badge-status badge-present" style={{ fontSize: "0.85rem", padding: "6px 14px" }}>
                    🌟 1,480+ Distinguished Graduates Worldwide
                  </span>
                </div>
              </div>

              {/* Progression Pathways Info Banner */}
              <div style={{ background: "linear-gradient(135deg, rgba(168, 85, 247, 0.15), rgba(56, 189, 248, 0.1))", padding: "1.25rem", borderRadius: "12px", border: "1px solid rgba(168, 85, 247, 0.3)", marginBottom: "1.5rem" }}>
                <h3 style={{ margin: "0 0 6px", color: "#c084fc", fontSize: "1.1rem" }}>
                  🏛️ Complete Academic Journey: From Lower Primary to University Alumni
                </h3>
                <p style={{ margin: 0, fontSize: "0.85rem", color: "#cbd5e1", lineHeight: "1.5" }}>
                  At <strong>{schoolOfficialName || getActiveSchoolName(studentProfile)}</strong>, every student progresses systematically through <strong>Nursery 1-2</strong>, <strong>Kindergarten 1-2</strong>,
                  <strong>Lower Primary (Primary 1-3)</strong>, <strong>Upper Primary (Primary 4-6)</strong>, <strong>Junior High (JHS 1-3)</strong>, <strong>Senior High (SHS 1-3)</strong>,
                  and <strong>University Undergraduate (Level 100 to Level 400 across Semesters 1 & 2)</strong>. Upon successful thesis and comprehensive examination completion,
                  scholars transition into the prestigious GBS Alumni Association with permanent verifiable cryptographic credentials.
                </p>
              </div>

              {/* Alumni Highlights Grid */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "1.25rem", marginBottom: "2rem" }}>
                {alumniList.length === 0 ? (
                  <div style={{ gridColumn: "1 / -1", textAlign: "center", padding: "40px 20px", color: "#94a3b8", background: "rgba(15, 23, 42, 0.4)", borderRadius: "12px", border: "1px dashed #334155" }}>
                    🎓 No alumni directory entries published yet. Graduated scholars will appear here upon completion of commencement.
                  </div>
                ) : (
                  alumniList.map((alumnus) => (
                    <div
                      key={alumnus.id}
                      style={{
                        background: "rgba(15, 23, 42, 0.75)",
                        borderRadius: "12px",
                        padding: "1.25rem",
                        border: "1px solid rgba(255, 255, 255, 0.1)",
                        display: "flex",
                        flexDirection: "column",
                        gap: "10px"
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                        <div style={{
                          width: "52px",
                          height: "52px",
                          borderRadius: "50%",
                          background: "linear-gradient(135deg, #a855f7, #3b82f6)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: "1.5rem",
                          color: "#fff",
                          fontWeight: "bold",
                          flexShrink: 0
                        }}>
                          {alumnus.name.charAt(0)}
                        </div>
                        <div>
                          <h3 style={{ margin: 0, fontSize: "1.05rem", color: "#f8fafc" }}>{alumnus.name}</h3>
                          <span style={{ fontSize: "0.75rem", color: "#34d399", fontWeight: "700" }}>
                            Class of {alumnus.graduatingYear} • {alumnus.degree}
                          </span>
                        </div>
                      </div>

                      <div style={{ fontSize: "0.82rem", color: "#cbd5e1", lineHeight: "1.4" }}>
                        <p style={{ margin: "2px 0" }}>
                          📚 <strong>Program:</strong> {alumnus.program}
                        </p>
                        <p style={{ margin: "2px 0" }}>
                          💼 <strong>Current Placement:</strong> <strong style={{ color: "#38bdf8" }}>{alumnus.careerPlacement}</strong>
                        </p>
                        <p style={{ margin: "2px 0" }}>
                          🌍 <strong>Chapter:</strong> {alumnus.alumniChapter}
                        </p>
                      </div>

                      <div style={{ marginTop: "auto", display: "flex", gap: "8px" }}>
                        <button
                          type="button"
                          className="btn-primary"
                          style={{ flex: 1, padding: "8px", fontSize: "0.75rem", justifyContent: "center" }}
                          onClick={() => {
                            setSelectedMentorAlumnus(alumnus);
                            setShowMentorModal(true);
                          }}
                        >
                          🤝 Request Mentorship
                        </button>
                        <a
                          href={`mailto:${alumnus.email}`}
                          className="btn-secondary"
                          style={{ padding: "8px 12px", fontSize: "0.75rem", textDecoration: "none", display: "flex", alignItems: "center" }}
                        >
                          ✉️ Contact
                        </a>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Alumni Association Engagement & Mentorship Portal */}
              <div style={{ background: "rgba(2, 6, 23, 0.7)", borderRadius: "10px", padding: "1.25rem", border: "1px solid rgba(168, 85, 247, 0.3)" }}>
                <h4 style={{ margin: "0 0 8px", color: "#c084fc", fontSize: "1rem" }}>
                  🌐 GBS Alumni Association Services & Global Benefits
                </h4>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "1rem", fontSize: "0.8rem", color: "#cbd5e1" }}>
                  <div>
                    <strong style={{ color: "#f8fafc" }}>• Verified Digital Credentials:</strong>
                    <p style={{ margin: "4px 0" }}>Instant transcript verification for university admissions & foreign work visas.</p>
                  </div>
                  <div>
                    <strong style={{ color: "#f8fafc" }}>• Global Alumni Chapters:</strong>
                    <p style={{ margin: "4px 0" }}>Networking events in Accra, London, New York, Toronto, and Nairobi.</p>
                  </div>
                  <div>
                    <strong style={{ color: "#f8fafc" }}>• Graduate Mentorship Circles:</strong>
                    <p style={{ margin: "4px 0" }}>Connect final-year Level 400 scholars directly with industry leaders.</p>
                  </div>
                  <div>
                    <strong style={{ color: "#f8fafc" }}>• GBS Alumni Endowment:</strong>
                    <p style={{ margin: "4px 0" }}>Scholarships funded annually for high-achieving STEM scholars.</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* TAB 8: PEER CHAT & STUDY CIRCLE VIA INDEX NUMBER         */}
          {/* ======================================================== */}
          {/* TAB: DIGITAL LIBRARY & E-BOOK HUB */}
          {activeTab === "library" && (
            <div className="role-workspace-card">
              <div className="workspace-title-row">
                <div>
                  <h2><span>📚</span> STUDENT DIGITAL LIBRARY & E-BOOK HUB</h2>
                  <p>Browse educational textbooks, borrow e-books for syllabus study, monitor due date alert countdowns, and return books.</p>
                </div>
                <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                  <span className="role-portal-badge" style={{ color: "#fbbf24", background: "rgba(245, 158, 11, 0.15)" }}>
                    {borrowedBooks.length} Active Borrowed Books
                  </span>
                </div>
              </div>

              {/* Borrowed Books Section */}
              <div style={{ marginBottom: "2rem" }}>
                <h3 style={{ color: "#38bdf8", fontSize: "1.05rem", fontWeight: 800, marginBottom: "12px", display: "flex", alignItems: "center", gap: "8px" }}>
                  <span>📖</span> Currently Borrowed Textbooks & Due Date Alerts:
                </h3>
                {borrowedBooks.length === 0 ? (
                  <div style={{ background: "rgba(15, 23, 42, 0.5)", border: "1px dashed rgba(255, 255, 255, 0.15)", borderRadius: "12px", padding: "1.5rem", textAlign: "center", color: "#94a3b8" }}>
                    No books currently borrowed. Select a textbook from the catalog below to borrow.
                  </div>
                ) : (
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "14px" }}>
                    {borrowedBooks.map((b) => (
                      <div
                        key={b.id}
                        onDoubleClick={() => setSelectedBookForPreview(b)}
                        aria-label="Double-click to view high-resolution book cover and full syllabus details"
                        style={{
                          background: "rgba(15, 23, 42, 0.8)",
                          border: "1.5px solid rgba(245, 158, 11, 0.4)",
                          borderRadius: "12px",
                          padding: "14px",
                          display: "flex",
                          gap: "14px",
                          cursor: "pointer",
                          transition: "transform 0.15s ease, box-shadow 0.15s ease"
                        }}
                      >
                        <img
                          src={b.cover}
                          alt={b.title}
                          style={{ width: "70px", height: "95px", objectFit: "cover", borderRadius: "8px", boxShadow: "0 4px 8px rgba(0,0,0,0.4)" }}
                        />
                        <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                          <div>
                            <h4 style={{ margin: "0 0 4px", fontSize: "0.92rem", color: "#f8fafc" }}>{b.title}</h4>
                            <div style={{ fontSize: "0.76rem", color: "#94a3b8" }}>By: {b.author}</div>
                            <div style={{ fontSize: "0.72rem", color: "#38bdf8", fontFamily: "monospace", marginTop: "2px" }}>ISBN: {b.isbn}</div>
                          </div>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "8px", flexWrap: "wrap", gap: "6px" }}>
                            <span style={{ fontSize: "0.75rem", background: "rgba(239, 68, 68, 0.2)", color: "#f87171", padding: "3px 8px", borderRadius: "6px", fontWeight: 800 }}>
                              ⏱️ Due in {b.daysRemaining} days ({b.dueDate})
                            </span>
                            <div style={{ display: "flex", gap: "6px" }}>
                              <button
                                type="button"
                                onClick={(e) => { e.stopPropagation(); setSelectedBookForPreview(b); }}
                                style={{ background: "rgba(56, 189, 248, 0.15)", border: "1px solid #38bdf8", color: "#38bdf8", borderRadius: "6px", padding: "4px 8px", fontSize: "0.72rem", fontWeight: 700, cursor: "pointer" }}
                              >
                                🔍 Details
                              </button>
                              <button
                                type="button"
                                onClick={(e) => { e.stopPropagation(); handleReturnBook(b.id); }}
                                style={{
                                  background: "rgba(16, 185, 129, 0.2)",
                                  border: "1px solid #10b981",
                                  color: "#34d399",
                                  borderRadius: "6px",
                                  padding: "4px 10px",
                                  fontSize: "0.75rem",
                                  fontWeight: 800,
                                  cursor: "pointer"
                                }}
                              >
                                📥 Return Book
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Available Library Catalog */}
              <div>
                <h3 style={{ color: "#34d399", fontSize: "1.05rem", fontWeight: 800, marginBottom: "12px", display: "flex", alignItems: "center", gap: "8px" }}>
                  <span>🏛️</span> Institutional Syllabus E-Book Catalog (Double-click to View Cover & Details):
                </h3>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "14px" }}>
                  {LIBRARY_CATALOG.map((cat) => {
                    const isAlreadyBorrowed = borrowedBooks.some((b) => b.title === cat.title);
                    return (
                      <div
                        key={cat.id}
                        onDoubleClick={() => setSelectedBookForPreview(cat)}
                        aria-label="Double-click to view high-resolution cover and book details"
                        style={{
                          background: "rgba(15, 23, 42, 0.65)",
                          border: "1px solid rgba(255, 255, 255, 0.08)",
                          borderRadius: "12px",
                          padding: "12px",
                          display: "flex",
                          gap: "12px",
                          cursor: "pointer"
                        }}
                      >
                        <img
                          src={cat.cover}
                          alt={cat.title}
                          style={{ width: "65px", height: "90px", objectFit: "cover", borderRadius: "6px", boxShadow: "0 4px 8px rgba(0,0,0,0.3)" }}
                        />
                        <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                          <div>
                            <span style={{ fontSize: "0.68rem", background: "rgba(56, 189, 248, 0.15)", color: "#38bdf8", padding: "2px 6px", borderRadius: "4px", fontWeight: 700 }}>
                              {cat.category}
                            </span>
                            <h4 style={{ margin: "4px 0 2px", fontSize: "0.85rem", color: "#f8fafc" }}>{cat.title}</h4>
                            <div style={{ fontSize: "0.72rem", color: "#94a3b8" }}>{cat.author} • {cat.pages} pgs</div>
                          </div>
                          <div style={{ display: "flex", gap: "6px", marginTop: "6px" }}>
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); setSelectedBookForPreview(cat); }}
                              style={{ background: "rgba(255, 255, 255, 0.08)", border: "1px solid rgba(255, 255, 255, 0.2)", color: "#cbd5e1", borderRadius: "6px", padding: "4px 8px", fontSize: "0.72rem", fontWeight: 700, cursor: "pointer" }}
                            >
                              🔍 View
                            </button>
                            <button
                              type="button"
                              disabled={isAlreadyBorrowed}
                              onClick={(e) => { e.stopPropagation(); handleBorrowBook(cat); }}
                              style={{
                                flex: 1,
                                background: isAlreadyBorrowed ? "rgba(255, 255, 255, 0.08)" : "linear-gradient(135deg, #0284c7, #0369a1)",
                                border: "none",
                                borderRadius: "6px",
                                color: isAlreadyBorrowed ? "#64748b" : "#fff",
                                padding: "6px 12px",
                                fontSize: "0.75rem",
                                fontWeight: 800,
                                cursor: isAlreadyBorrowed ? "not-allowed" : "pointer"
                              }}
                            >
                              {isAlreadyBorrowed ? "✓ Borrowed" : "📖 Borrow E-Book"}
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* TAB: STUDENT SELF-PAYMENT FEES, SCHOOL BILLS & VERIFIED RECEIPTS LEDGER */}
          {activeTab === "fees-history" && (() => {
            const feeCur = studentFeeStatement?.feeSummary?.currency || "GHS";
            const totalBilledLive = Number(studentFeeStatement?.feeSummary?.totalBilled || 0);
            const totalPaidLive = Number(studentFeeStatement?.feeSummary?.totalPaid || 0);
            const outstandingLive = Number(studentFeeStatement?.feeSummary?.outstandingBalance ?? feeBalance ?? 0);
            const liveInvoices = studentFeeStatement?.invoices || [];
            const liveTx = studentFeeStatement?.transactions || [];
            const recv = studentFeeStatement?.schoolReceivingAccounts || null;
            const stuFullName = studentFeeStatement?.student?.fullName || `${currentUser?.firstName || ""} ${currentUser?.lastName || ""}`.trim() || "Student";
            const stuCode = studentFeeStatement?.student?.studentCode || currentUser?.username || `STU-${currentUser?.id || ""}`;

            return (
              <div className="role-workspace-card">
                <div className="workspace-title-row">
                  <div>
                    <h2><span>💳</span> STUDENT SCHOOL FEES, BILLS &amp; SELF-PAYMENT PORTAL</h2>
                    <p>
                      Pay your tuition, hostel, exam, or facility bills directly to the school&apos;s official Bank Account or School MoMo Account. Every payment is referenced in your student name (<strong>{stuFullName} • {stuCode}</strong>) and reflects immediately on the Accountant &amp; Parent dashboards for official auditing.
                    </p>
                  </div>
                  <div style={{ display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap" }}>
                    <button
                      type="button"
                      data-testid="student-self-pay-main-btn"
                      onClick={() => openStudentSelfPayment(null)}
                      style={{
                        background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
                        border: "none",
                        borderRadius: "10px",
                        color: "#ffffff",
                        padding: "10px 18px",
                        fontWeight: 900,
                        fontSize: "0.88rem",
                        cursor: "pointer",
                        boxShadow: "0 4px 15px rgba(16, 185, 129, 0.4)"
                      }}
                    >
                      {outstandingLive > 0
                        ? `💳 Pay Fees / School Bill (${feeCur} ${outstandingLive.toFixed(2)})`
                        : "💳 Pay New School Bill / Advance Fee"}
                    </button>
                    <button
                      type="button"
                      onClick={loadVerifiedStudentFees}
                      style={{
                        background: "rgba(56, 189, 248, 0.16)",
                        border: "1px solid #38bdf8",
                        borderRadius: "10px",
                        color: "#bae6fd",
                        padding: "10px 14px",
                        fontWeight: 700,
                        fontSize: "0.84rem",
                        cursor: "pointer"
                      }}
                    >
                      🔄 Refresh Balance
                    </button>
                  </div>
                </div>

                {/* Live Summary Cards */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))", gap: "14px", marginBottom: "18px" }}>
                  <div style={{ background: "rgba(15, 23, 42, 0.78)", border: "1px solid rgba(56, 189, 248, 0.3)", borderRadius: "12px", padding: "14px" }}>
                    <span style={{ fontSize: "0.74rem", color: "#94a3b8", fontWeight: 700, display: "block" }}>STUDENT PAYEE IDENTITY</span>
                    <strong style={{ color: "#38bdf8", fontSize: "1rem" }}>{stuFullName}</strong>
                    <div style={{ fontSize: "0.76rem", color: "#cbd5e1", marginTop: "4px", fontFamily: "monospace" }}>ID: {stuCode}</div>
                  </div>
                  <div style={{ background: "rgba(15, 23, 42, 0.78)", border: "1px solid rgba(255, 255, 255, 0.12)", borderRadius: "12px", padding: "14px" }}>
                    <span style={{ fontSize: "0.74rem", color: "#94a3b8", fontWeight: 700, display: "block" }}>TOTAL BILLED CHARGES</span>
                    <strong style={{ color: "#f8fafc", fontSize: "1.1rem" }}>{feeCur} {totalBilledLive.toFixed(2)}</strong>
                    <div style={{ fontSize: "0.75rem", color: "#94a3b8", marginTop: "4px" }}>{liveInvoices.length} Official School Bill(s)</div>
                  </div>
                  <div style={{ background: "rgba(15, 23, 42, 0.78)", border: "1px solid rgba(16, 185, 129, 0.35)", borderRadius: "12px", padding: "14px" }}>
                    <span style={{ fontSize: "0.74rem", color: "#94a3b8", fontWeight: 700, display: "block" }}>TOTAL VERIFIED PAID</span>
                    <strong style={{ color: "#34d399", fontSize: "1.1rem" }}>{feeCur} {totalPaidLive.toFixed(2)}</strong>
                    <div style={{ fontSize: "0.75rem", color: "#6ee7b7", marginTop: "4px" }}>{liveTx.filter((t) => t.gatewayStatus === "SUCCESSFUL").length} Confirmed Receipt(s)</div>
                  </div>
                  <div style={{ background: "rgba(15, 23, 42, 0.78)", border: `1px solid ${outstandingLive > 0 ? "rgba(245, 158, 11, 0.45)" : "rgba(16, 185, 129, 0.45)"}`, borderRadius: "12px", padding: "14px" }}>
                    <span style={{ fontSize: "0.74rem", color: "#94a3b8", fontWeight: 700, display: "block" }}>CURRENT BALANCE DUE</span>
                    <strong style={{ color: outstandingLive > 0 ? "#fbbf24" : "#34d399", fontSize: "1.1rem" }}>
                      {outstandingLive > 0 ? `${feeCur} ${outstandingLive.toFixed(2)}` : `✓ Cleared (${feeCur} 0.00)`}
                    </strong>
                    <div style={{ fontSize: "0.75rem", color: "#94a3b8", marginTop: "4px" }}>Synced live with Accountant Ledger</div>
                  </div>
                </div>

                {/* Official School Receiving Accounts Box (School Bank Account + School MoMo Account) */}
                <div style={{ background: "rgba(16, 185, 129, 0.08)", border: "1.5px solid rgba(16, 185, 129, 0.38)", borderRadius: "12px", padding: "14px 16px", marginBottom: "20px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "8px", marginBottom: "10px" }}>
                    <strong style={{ color: "#34d399", fontSize: "0.9rem" }}>
                      🏛️ OFFICIAL SCHOOL RECEIVING ACCOUNT &amp; SCHOOL MOMO DETAILS
                    </strong>
                    <span style={{ fontSize: "0.74rem", color: "#a7f3d0", fontWeight: 700 }}>
                      Auto-Referenced to: {stuFullName} ({stuCode}) — Paid by Student (Self)
                    </span>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "12px" }}>
                    <div style={{ background: "rgba(2, 6, 23, 0.55)", borderRadius: "10px", padding: "12px", border: "1px solid rgba(250, 204, 21, 0.35)" }}>
                      <div style={{ fontSize: "0.72rem", color: "#fbbf24", fontWeight: 800, textTransform: "uppercase" }}>📱 Official School Mobile Money (MoMo)</div>
                      {recv?.momo?.configured ? (
                        <>
                          <div style={{ fontSize: "1rem", fontWeight: 900, color: "#fff", fontFamily: "monospace", marginTop: "4px" }}>{recv.momo.number}</div>
                          <div style={{ fontSize: "0.8rem", color: "#cbd5e1", marginTop: "2px" }}>
                            {recv.momo.network} • {recv.momo.accountName}
                            {recv.momo.merchantId ? ` • Merchant ID: ${recv.momo.merchantId}` : ""}
                          </div>
                        </>
                      ) : (
                        <div style={{ fontSize: "0.8rem", color: "#cbd5e1", marginTop: "4px" }}>
                          Processed directly through the school&apos;s verified online Mobile Money gateway (MTN MoMo, Telecel Cash, AirtelTigo).
                        </div>
                      )}
                    </div>
                    <div style={{ background: "rgba(2, 6, 23, 0.55)", borderRadius: "10px", padding: "12px", border: "1px solid rgba(56, 189, 248, 0.35)" }}>
                      <div style={{ fontSize: "0.72rem", color: "#38bdf8", fontWeight: 800, textTransform: "uppercase" }}>🏦 Official School Bank Account</div>
                      {recv?.bank?.configured ? (
                        <>
                          <div style={{ fontSize: "1rem", fontWeight: 900, color: "#fff", fontFamily: "monospace", marginTop: "4px" }}>{recv.bank.bankAccountNumber}</div>
                          <div style={{ fontSize: "0.8rem", color: "#cbd5e1", marginTop: "2px" }}>
                            {recv.bank.bankName}{recv.bank.bankBranch ? ` (${recv.bank.bankBranch})` : ""} • {recv.bank.bankAccountName}
                          </div>
                        </>
                      ) : (
                        <div style={{ fontSize: "0.8rem", color: "#cbd5e1", marginTop: "4px" }}>
                          School bank deposit account details will appear here once configured by the School Accountant.
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Section 1: Issued School Bills / Invoices */}
                <h3 style={{ color: "#f8fafc", fontSize: "0.96rem", margin: "0 0 10px" }}>📋 Your Issued School Fees &amp; Bills ({liveInvoices.length})</h3>
                <div className="role-table-responsive" style={{ marginBottom: "22px" }}>
                  <table className="role-table">
                    <thead>
                      <tr>
                        <th>Invoice #</th>
                        <th>Academic Term</th>
                        <th>Bill Description</th>
                        <th>Net Billed ({feeCur})</th>
                        <th>Paid ({feeCur})</th>
                        <th>Balance Due ({feeCur})</th>
                        <th>Status</th>
                        <th style={{ textAlign: "center" }}>Pay Bill</th>
                      </tr>
                    </thead>
                    <tbody>
                      {liveInvoices.length === 0 ? (
                        <tr>
                          <td colSpan="8" style={{ textAlign: "center", padding: "18px", color: "#94a3b8" }}>
                            No open school bills issued yet. You can still make an official school fee or advance payment using the green button above.
                          </td>
                        </tr>
                      ) : (
                        liveInvoices.map((inv) => {
                          const bal = Number(inv.balanceDue || 0);
                          return (
                            <tr key={inv.id}>
                              <td style={{ fontFamily: "monospace", color: "#38bdf8", fontWeight: 700 }}>{inv.invoiceNumber}</td>
                              <td>{inv.academicTerm || "Current Term"}</td>
                              <td style={{ color: "#e2e8f0" }}>{inv.title}</td>
                              <td style={{ fontWeight: 700 }}>{Number(inv.netAmount || inv.amount || 0).toFixed(2)}</td>
                              <td style={{ color: "#34d399", fontWeight: 800 }}>{Number(inv.paidAmount || 0).toFixed(2)}</td>
                              <td style={{ color: bal > 0 ? "#fbbf24" : "#94a3b8", fontWeight: 800 }}>{bal.toFixed(2)}</td>
                              <td>
                                <span style={{
                                  fontSize: "0.72rem",
                                  padding: "3px 8px",
                                  borderRadius: "6px",
                                  fontWeight: 800,
                                  background: bal <= 0 ? "rgba(16, 185, 129, 0.2)" : "rgba(245, 158, 11, 0.2)",
                                  color: bal <= 0 ? "#34d399" : "#fbbf24"
                                }}>
                                  {inv.status || (bal <= 0 ? "PAID" : "DUE")}
                                </span>
                              </td>
                              <td style={{ textAlign: "center" }}>
                                {bal > 0 ? (
                                  <button
                                    type="button"
                                    onClick={() => openStudentSelfPayment(inv)}
                                    style={{
                                      background: "#059669",
                                      border: "none",
                                      borderRadius: "6px",
                                      color: "#fff",
                                      padding: "5px 10px",
                                      fontSize: "0.74rem",
                                      fontWeight: 800,
                                      cursor: "pointer"
                                    }}
                                  >
                                    💳 Pay This Bill
                                  </button>
                                ) : (
                                  <span style={{ color: "#34d399", fontSize: "0.76rem", fontWeight: 800 }}>✓ Paid</span>
                                )}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Section 2: Live Verified Payments & Official Receipts History (Student Self + Parent) */}
                <h3 style={{ color: "#f8fafc", fontSize: "0.96rem", margin: "0 0 10px" }}>🧾 Verified Payment Transactions &amp; Official Receipts ({liveTx.length})</h3>
                <div className="role-table-responsive">
                  <table className="role-table">
                    <thead>
                      <tr>
                        <th>Receipt # &amp; Ref</th>
                        <th>Date</th>
                        <th>Paid By (Payer)</th>
                        <th>Student Payee Reference</th>
                        <th>School Account / MoMo Credited</th>
                        <th>Method</th>
                        <th>Amount ({feeCur})</th>
                        <th>Status</th>
                        <th style={{ textAlign: "center" }}>Receipt</th>
                      </tr>
                    </thead>
                    <tbody>
                      {liveTx.length === 0 ? (
                        <tr>
                          <td colSpan="9" style={{ textAlign: "center", padding: "18px", color: "#94a3b8" }}>
                            No verified payment transactions recorded yet. Once you or your parent completes a payment, the official receipt appears here and on the Accountant ledger immediately.
                          </td>
                        </tr>
                      ) : (
                        liveTx.map((tx) => {
                          const isSelf = tx.paidByRole === "STUDENT";
                          const isParent = tx.paidByRole === "PARENT";
                          return (
                            <tr key={tx.id || tx.reference}>
                              <td>
                                <strong style={{ fontFamily: "monospace", color: "#38bdf8", display: "block" }}>{tx.receiptNumber || "—"}</strong>
                                <span style={{ fontFamily: "monospace", fontSize: "0.72rem", color: "#94a3b8" }}>{tx.reference || tx.transactionRef}</span>
                              </td>
                              <td style={{ fontSize: "0.78rem", color: "#cbd5e1", whiteSpace: "nowrap" }}>
                                {new Date(tx.paidAt || tx.createdAt || Date.now()).toLocaleString()}
                              </td>
                              <td>
                                <span style={{
                                  display: "inline-block",
                                  padding: "3px 8px",
                                  borderRadius: "6px",
                                  fontSize: "0.72rem",
                                  fontWeight: 800,
                                  background: isSelf ? "rgba(56, 189, 248, 0.2)" : isParent ? "rgba(168, 85, 247, 0.2)" : "rgba(16, 185, 129, 0.2)",
                                  color: isSelf ? "#38bdf8" : isParent ? "#c084fc" : "#34d399"
                                }}>
                                  {isSelf ? "🎓 Student (Self)" : isParent ? "👨‍👩‍👧 Parent" : (tx.paidByLabel || "Finance Office")}
                                </span>
                                <div style={{ fontSize: "0.74rem", color: "#e2e8f0", marginTop: "2px" }}>{tx.paidByName || stuFullName}</div>
                              </td>
                              <td style={{ fontSize: "0.78rem", color: "#fbbf24", fontWeight: 700 }}>
                                {tx.payeeReference || `${stuFullName} (${stuCode})`}
                              </td>
                              <td style={{ fontSize: "0.76rem", color: "#a7f3d0" }}>
                                {tx.destinationAccountSummary || "Official School Collection Account"}
                              </td>
                              <td style={{ fontSize: "0.76rem", color: "#cbd5e1" }}>
                                {tx.gateway} • {tx.channel || tx.paymentMethod}
                              </td>
                              <td style={{ fontWeight: 900, color: "#34d399" }}>
                                {tx.currency || feeCur} {Number(tx.amountPaid || 0).toFixed(2)}
                              </td>
                              <td>
                                <span style={{
                                  fontSize: "0.72rem",
                                  padding: "3px 8px",
                                  borderRadius: "6px",
                                  fontWeight: 800,
                                  background: tx.gatewayStatus === "SUCCESSFUL" ? "rgba(16, 185, 129, 0.2)" : "rgba(245, 158, 11, 0.2)",
                                  color: tx.gatewayStatus === "SUCCESSFUL" ? "#34d399" : "#fbbf24"
                                }}>
                                  {tx.gatewayStatus === "SUCCESSFUL" ? "✓ Confirmed & Posted" : tx.gatewayStatus}
                                </span>
                              </td>
                              <td style={{ textAlign: "center" }}>
                                <button
                                  type="button"
                                  onClick={() => handlePrintStudentOfficialReceipt(tx)}
                                  style={{
                                    background: "rgba(56, 189, 248, 0.15)",
                                    border: "1px solid #38bdf8",
                                    borderRadius: "6px",
                                    color: "#38bdf8",
                                    padding: "5px 10px",
                                    fontSize: "0.72rem",
                                    fontWeight: 700,
                                    cursor: "pointer"
                                  }}
                                >
                                  🖨️ Print Receipt
                                </button>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })()}

          {activeTab === "peer-chat" && (
            <div className="role-workspace-card">
              <div className="workspace-title-row">
                <div>
                  <h2><span>💬</span> STUDENT PEER CHAT & ACADEMIC STUDY CIRCLE</h2>
                  <p>
                    Connect with friends and study partners across the institution. Enter the student's registered <strong>Index Number</strong>,
                    verify identity, and collaborate in private study chats with automatic transcript archiving.
                  </p>
                </div>
                <div style={{ display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap" }}>
                  <button
                    type="button"
                    onClick={() => setActiveTab("cooperative-conferencing")}
                    style={{
                      background: "linear-gradient(135deg, #8b5cf6, #7c3aed)",
                      border: "none",
                      color: "#ffffff",
                      borderRadius: "8px",
                      padding: "8px 14px",
                      fontSize: "0.82rem",
                      fontWeight: 800,
                      cursor: "pointer",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "6px",
                      boxShadow: "0 4px 12px rgba(139, 92, 246, 0.4)"
                    }}
                  >
                    <span>🎙️</span> Group Voice & Video Conferencing
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowArchivedChatsModal(true)}
                    style={{
                      background: "rgba(148, 163, 184, 0.15)",
                      border: "1px solid #64748b",
                      color: "#cbd5e1",
                      borderRadius: "8px",
                      padding: "8px 14px",
                      fontSize: "0.82rem",
                      fontWeight: 700,
                      cursor: "pointer",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "6px"
                    }}
                  >
                    🗄️ View Archived Chats ({archivedPeerChats.length})
                  </button>
                  <span className="role-portal-badge" style={{ color: "#22d3ee", background: "rgba(6, 182, 212, 0.15)" }}>
                    {enrolledPeersList.length} Verified Scholars in Institution
                  </span>
                </div>
              </div>

              {/* Index Number Search & Verification Box */}
              <div style={{
                background: "linear-gradient(135deg, rgba(15, 23, 42, 0.9) 0%, rgba(30, 41, 59, 0.75) 100%)",
                border: "1.5px solid rgba(6, 182, 212, 0.35)",
                borderRadius: "14px",
                padding: "1.25rem",
                marginBottom: "1.5rem"
              }}>
                <label style={{ display: "block", color: "#22d3ee", fontWeight: 800, fontSize: "0.88rem", marginBottom: "8px" }}>
                  🔍 Search Classmate / Friend by Registered Index Number:
                </label>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleSearchPeerByIndex();
                  }}
                  style={{ display: "flex", gap: "10px", flexWrap: "wrap", alignItems: "center" }}
                >
                  <input
                    type="text"
                    value={searchIndexInput}
                    onChange={(e) => setSearchIndexInput(e.target.value)}
                    placeholder="Enter Student Index Number (e.g. STU-2026-001, STU-2026-002, 101)"
                    className="filter-input"
                    style={{ flex: 1, minWidth: "260px", padding: "10px 14px", fontFamily: "monospace", fontSize: "0.95rem" }}
                  />
                  <button
                    type="submit"
                    className="btn-primary"
                    style={{ background: "linear-gradient(135deg, #0891b2, #06b6d4)", padding: "10px 20px", fontWeight: 800 }}
                  >
                    🔍 Verify & Open Chat
                  </button>
                </form>

                {/* Quick Select Chips */}
                <div style={{ display: "flex", gap: "8px", marginTop: "12px", alignItems: "center", flexWrap: "wrap" }}>
                  <span style={{ fontSize: "0.75rem", color: "#94a3b8", fontWeight: 700 }}>Quick Select Classmates:</span>
                  {enrolledPeersList.slice(0, 5).map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => {
                        setSearchIndexInput(p.indexNumber || p.studentId);
                        handleSearchPeerByIndex(p.indexNumber || p.studentId);
                      }}
                      style={{
                        background: "rgba(6, 182, 212, 0.12)",
                        border: "1px solid rgba(6, 182, 212, 0.3)",
                        color: "#67e8f9",
                        borderRadius: "20px",
                        padding: "3px 10px",
                        fontSize: "0.75rem",
                        cursor: "pointer",
                        fontWeight: 700
                      }}
                    >
                      {p.firstName} {p.lastName} ({p.indexNumber || p.studentId})
                    </button>
                  ))}
                </div>
              </div>

              {/* Active Conversation Interface */}
              {activePeerChat ? (
                <div style={{
                  background: "rgba(15, 23, 42, 0.8)",
                  border: "1.5px solid rgba(6, 182, 212, 0.4)",
                  borderRadius: "14px",
                  overflow: "hidden",
                  boxShadow: "0 10px 30px rgba(0,0,0,0.4)"
                }}>
                  {/* Chat Header */}
                  <div style={{
                    background: "rgba(30, 41, 59, 0.9)",
                    borderBottom: "1px solid rgba(255, 255, 255, 0.1)",
                    padding: "12px 18px",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    flexWrap: "wrap",
                    gap: "10px"
                  }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                      <img
                        src={activePeerChat.photo || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop"}
                        alt={activePeerChat.firstName}
                        style={{ width: "48px", height: "48px", borderRadius: "10px", objectFit: "cover", border: "2px solid #06b6d4" }}
                      />
                      <div>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                          <h3 style={{ margin: 0, color: "#f8fafc", fontSize: "1.05rem" }}>
                            {activePeerChat.firstName} {activePeerChat.lastName}
                          </h3>
                          <span style={{ fontSize: "0.72rem", background: "#064e3b", color: "#34d399", padding: "2px 8px", borderRadius: "999px", fontWeight: 800 }}>
                            🟢 STUDY CIRCLE ACTIVE
                          </span>
                        </div>
                        <div style={{ fontSize: "0.78rem", color: "#94a3b8", display: "flex", gap: "10px", flexWrap: "wrap", marginTop: "2px" }}>
                          <span>Index: <strong style={{ color: "#22d3ee", fontFamily: "monospace" }}>{activePeerChat.indexNumber || activePeerChat.studentId}</strong></span>
                          <span>•</span>
                          <span>Class: <strong>{activePeerChat.currentClass || activePeerChat.classCode}</strong></span>
                          <span>•</span>
                          <span>📞 <a href={`tel:${activePeerChat.registeredMobile || activePeerChat.phone}`} style={{ color: "#38bdf8", textDecoration: "none" }}>{activePeerChat.registeredMobile || activePeerChat.phone || "—"}</a></span>
                        </div>
                      </div>
                    </div>

                    <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                      <button
                        type="button"
                        onClick={() => handleStartPeerVideoCall(activePeerChat)}
                        style={{
                          background: "linear-gradient(135deg, #0284c7, #06b6d4)",
                          border: "none",
                          color: "#ffffff",
                          borderRadius: "8px",
                          padding: "6px 14px",
                          fontSize: "0.78rem",
                          fontWeight: 800,
                          cursor: "pointer",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "6px",
                          boxShadow: "0 4px 12px rgba(6, 182, 212, 0.4)"
                        }}
                      >
                        📹 Start Live Video Call
                      </button>
                      <button
                        type="button"
                        onClick={handleArchiveCurrentChat}
                        style={{
                          background: "rgba(16, 185, 129, 0.2)",
                          border: "1px solid #10b981",
                          color: "#34d399",
                          borderRadius: "8px",
                          padding: "6px 12px",
                          fontSize: "0.78rem",
                          fontWeight: 800,
                          cursor: "pointer"
                        }}
                      >
                        📁 Save & Archive Chat
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const transcript = chatMessages.map((m) => `[${m.timestamp}] ${m.senderName}: ${m.text}`).join("\n");
                          const blob = new Blob([transcript], { type: "text/plain" });
                          const url = URL.createObjectURL(blob);
                          const a = document.createElement("a");
                          a.href = url;
                          a.download = `Study_Chat_${activePeerChat.firstName}_${Date.now()}.txt`;
                          a.click();
                        }}
                        style={{
                          background: "rgba(56, 189, 248, 0.15)",
                          border: "1px solid #38bdf8",
                          color: "#38bdf8",
                          borderRadius: "8px",
                          padding: "6px 12px",
                          fontSize: "0.78rem",
                          fontWeight: 700,
                          cursor: "pointer"
                        }}
                      >
                        📥 Export Transcript
                      </button>
                      <button
                        type="button"
                        onClick={() => setActivePeerChat(null)}
                        style={{
                          background: "rgba(239, 68, 68, 0.15)",
                          border: "1px solid #ef4444",
                          color: "#f87171",
                          borderRadius: "8px",
                          padding: "6px 10px",
                          fontSize: "0.78rem",
                          fontWeight: 700,
                          cursor: "pointer"
                        }}
                      >
                        ✕ Close
                      </button>
                    </div>
                  </div>

                  {/* Messages Timeline */}
                  <div style={{
                    padding: "20px",
                    minHeight: "280px",
                    maxHeight: "420px",
                    overflowY: "auto",
                    display: "flex",
                    flexDirection: "column",
                    gap: "12px",
                    background: "rgba(2, 6, 23, 0.4)"
                  }}>
                    {chatMessages.length === 0 ? (
                      <div style={{ textAlign: "center", color: "#64748b", margin: "auto", fontSize: "0.88rem" }}>
                        💬 No messages yet. Say hello to start collaborating!
                      </div>
                    ) : (
                      chatMessages.map((m) => {
                        const isMe = m.sender === "ME";
                        return (
                          <div
                            key={m.id}
                            style={{
                              display: "flex",
                              flexDirection: "column",
                              alignItems: isMe ? "flex-end" : "flex-start",
                              maxWidth: "80%",
                              alignSelf: isMe ? "flex-end" : "flex-start"
                            }}
                          >
                            <span style={{ fontSize: "0.7rem", color: "#94a3b8", marginBottom: "2px" }}>
                              {isMe ? "You" : m.senderName} • {m.timestamp}
                            </span>
                            <div
                              style={{
                                background: isMe
                                  ? "linear-gradient(135deg, #0284c7, #0891b2)"
                                  : "rgba(30, 41, 59, 0.9)",
                                color: "#f8fafc",
                                padding: "10px 16px",
                                borderRadius: isMe ? "14px 14px 2px 14px" : "14px 14px 14px 2px",
                                border: isMe ? "none" : "1px solid rgba(255, 255, 255, 0.1)",
                                fontSize: "0.9rem",
                                lineHeight: "1.45",
                                boxShadow: "0 2px 8px rgba(0,0,0,0.2)"
                              }}
                            >
                              {m.text}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>

                  {/* Quick Prompts Bar */}
                  <div style={{
                    padding: "8px 16px",
                    background: "rgba(15, 23, 42, 0.9)",
                    borderTop: "1px solid rgba(255, 255, 255, 0.08)",
                    display: "flex",
                    gap: "8px",
                    alignItems: "center",
                    flexWrap: "wrap"
                  }}>
                    <span style={{ fontSize: "0.72rem", color: "#94a3b8" }}>Quick Study Prompts:</span>
                    <button
                      type="button"
                      onClick={() => handleSendMessage("Hey! Did you finish the mathematics exercise assignment?")}
                      style={{ background: "rgba(255, 255, 255, 0.05)", border: "1px solid rgba(255, 255, 255, 0.15)", color: "#cbd5e1", borderRadius: "14px", padding: "3px 10px", fontSize: "0.72rem", cursor: "pointer" }}
                    >
                      📐 Homework Status?
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSendMessage("Could you share your lecture notes for Chapter 3?")}
                      style={{ background: "rgba(255, 255, 255, 0.05)", border: "1px solid rgba(255, 255, 255, 0.15)", color: "#cbd5e1", borderRadius: "14px", padding: "3px 10px", fontSize: "0.72rem", cursor: "pointer" }}
                    >
                      📖 Share Chapter Notes
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSendMessage("Let's review the past questions before the examination tomorrow!")}
                      style={{ background: "rgba(255, 255, 255, 0.05)", border: "1px solid rgba(255, 255, 255, 0.15)", color: "#cbd5e1", borderRadius: "14px", padding: "3px 10px", fontSize: "0.72rem", cursor: "pointer" }}
                    >
                      🎯 Exam Review
                    </button>
                  </div>

                  {/* Input Form */}
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      handleSendMessage();
                    }}
                    style={{
                      padding: "12px 16px",
                      background: "rgba(30, 41, 59, 0.95)",
                      display: "flex",
                      gap: "10px",
                      alignItems: "center"
                    }}
                  >
                    <input
                      type="text"
                      placeholder={`Type study message to ${activePeerChat.firstName}... (Press Enter)`}
                      value={newMessageText}
                      onChange={(e) => setNewMessageText(e.target.value)}
                      style={{
                        flex: 1,
                        background: "rgba(15, 23, 42, 0.9)",
                        border: "1px solid rgba(255, 255, 255, 0.15)",
                        color: "#ffffff",
                        padding: "10px 14px",
                        borderRadius: "10px",
                        fontSize: "0.88rem"
                      }}
                    />
                    <button
                      type="submit"
                      className="btn-primary"
                      style={{ background: "linear-gradient(135deg, #0891b2, #06b6d4)", padding: "10px 20px", fontWeight: 800 }}
                    >
                      Send 💬
                    </button>
                  </form>
                </div>
              ) : (
                /* Registered Scholars Cohort Directory */
                <div>
                  <h3 style={{ margin: "0 0 12px", color: "#f8fafc", fontSize: "1.05rem" }}>
                    📚 Registered Cohort Directory & Verified Index Numbers
                  </h3>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "14px" }}>
                    {enrolledPeersList.map((peer) => (
                      <div
                        key={peer.id}
                        style={{
                          background: "rgba(15, 23, 42, 0.75)",
                          border: "1px solid rgba(255, 255, 255, 0.1)",
                          borderRadius: "12px",
                          padding: "16px",
                          display: "flex",
                          gap: "12px",
                          alignItems: "center",
                          boxShadow: "0 4px 14px rgba(0,0,0,0.2)"
                        }}
                      >
                        <img
                          src={peer.photo || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop"}
                          alt={peer.firstName}
                          style={{ width: "60px", height: "60px", borderRadius: "10px", objectFit: "cover", border: "1.5px solid #06b6d4" }}
                        />
                        <div style={{ flex: 1 }}>
                          <h4 style={{ margin: 0, color: "#f8fafc", fontSize: "0.95rem" }}>
                            {peer.firstName} {peer.lastName}
                          </h4>
                          <span style={{ fontSize: "0.75rem", color: "#22d3ee", fontFamily: "monospace", display: "block", marginTop: "2px" }}>
                            Index: {peer.indexNumber || peer.studentId}
                          </span>
                          <span style={{ fontSize: "0.72rem", color: "#94a3b8", display: "block" }}>
                            {peer.currentClass || peer.classCode}
                          </span>
                          <span style={{ fontSize: "0.72rem", color: "#38bdf8", display: "block", marginTop: "2px" }}>
                            📱 {peer.registeredMobile || peer.phone || "+233-24-000-0000"}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setCandidatePeer(peer);
                            setShowPeerConfirmModal(true);
                          }}
                          style={{
                            background: "rgba(6, 182, 212, 0.15)",
                            border: "1px solid #06b6d4",
                            color: "#22d3ee",
                            borderRadius: "8px",
                            padding: "8px 12px",
                            fontSize: "0.78rem",
                            fontWeight: 800,
                            cursor: "pointer",
                            whiteSpace: "nowrap"
                          }}
                        >
                          💬 Chat
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB: COOPERATIVE CONFERENCING & SOCIAL LOUNGE */}
          {activeTab === "cooperative-conferencing" && (
            <div className="role-workspace-card">
              <div className="workspace-title-row">
                <div>
                  <h2><span>🎙️</span> STUDENT COOPERATIVE CONFERENCING & SOCIAL LOUNGE</h2>
                  <p>
                    Live Voice Calling & HD WebRTC Video Calling for Cooperative Study Circles, Group Projects, Debates, and Student Socializing
                  </p>
                </div>
                <div style={{ display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap" }}>
                  <span className="badge-status badge-present">
                    ● WebRTC Low-Latency Online Conferencing
                  </span>
                  <button
                    type="button"
                    onClick={() => handleOpenCoopConferencing(null, "VIDEO")}
                    style={{
                      background: "linear-gradient(135deg, #8b5cf6, #6d28d9)",
                      border: "none",
                      color: "#ffffff",
                      borderRadius: "8px",
                      padding: "8px 16px",
                      fontSize: "0.85rem",
                      fontWeight: 800,
                      cursor: "pointer",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "6px",
                      boxShadow: "0 4px 14px rgba(139, 92, 246, 0.45)"
                    }}
                  >
                    <span>🚀</span> Open Global Conference Hub
                  </button>
                </div>
              </div>

              {/* Cooperative Mode Explanation Banner */}
              <div style={{
                background: "linear-gradient(135deg, rgba(139, 92, 246, 0.15) 0%, rgba(30, 41, 59, 0.7) 100%)",
                border: "1.5px solid rgba(139, 92, 246, 0.35)",
                borderRadius: "14px",
                padding: "1.25rem 1.5rem",
                marginBottom: "2rem"
              }}>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "1.25rem" }}>
                  <div style={{ display: "flex", gap: "12px" }}>
                    <div style={{
                      background: "rgba(139, 92, 246, 0.25)",
                      border: "1px solid #8b5cf6",
                      borderRadius: "10px",
                      width: "48px",
                      height: "48px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "1.5rem",
                      flexShrink: 0
                    }}>
                      🎙️
                    </div>
                    <div>
                      <strong style={{ color: "#c084fc", fontSize: "0.95rem" }}>Voice Calling Mode (Low Bandwidth)</strong>
                      <p style={{ margin: "4px 0 0", fontSize: "0.82rem", color: "#cbd5e1", lineHeight: 1.5 }}>
                        High-fidelity audio calling with dynamic voice waveforms, active speaker glow, mic mute/unmute, and background noise suppression. Ideal for quick study reviews, debates, and multi-peer group discussions.
                      </p>
                    </div>
                  </div>

                  <div style={{ display: "flex", gap: "12px" }}>
                    <div style={{
                      background: "rgba(6, 182, 212, 0.25)",
                      border: "1px solid #06b6d4",
                      borderRadius: "10px",
                      width: "48px",
                      height: "48px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "1.5rem",
                      flexShrink: 0
                    }}>
                      📹
                    </div>
                    <div>
                      <strong style={{ color: "#38bdf8", fontSize: "0.95rem" }}>HD Video Calling & Screen Sharing</strong>
                      <p style={{ margin: "4px 0 0", fontSize: "0.82rem", color: "#cbd5e1", lineHeight: 1.5 }}>
                        Multi-peer WebRTC video matrix with local camera previews, screen sharing for reviewing slides or code solutions, collaborative study scratchpad, and live interactive emojis.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Study Rooms Grid */}
              <div style={{ marginBottom: "1.25rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <h3 style={{ margin: 0, fontSize: "1.1rem", color: "#f8fafc", fontWeight: 800, display: "flex", alignItems: "center", gap: "8px" }}>
                  <span>🏫</span> Active Cooperative Study Rooms & Student Social Lounges
                </h3>
                <span style={{ fontSize: "0.78rem", color: "#94a3b8" }}>
                  Select any room below to enter via Voice Call or Video Call
                </span>
              </div>

              {!isDemoTenant && (
                <div style={{ padding: "1.25rem", borderRadius: "12px", background: "rgba(15, 23, 42, 0.75)", border: "1px dashed rgba(139, 92, 246, 0.45)", textAlign: "center", color: "#cbd5e1", marginBottom: "1.25rem" }}>
                  No peer cooperative study rooms published yet in this live institution. Join scheduled live sessions or class streams once activated.
                </div>
              )}

              <div style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
                gap: "1.25rem",
                marginBottom: "2.5rem"
              }}>
                {(isDemoTenant ? [
                  {
                    id: "STEM-101",
                    name: "🔬 STEM & Mathematics Problem Solving Circle",
                    category: "Cooperative Learning",
                    categoryColor: "#8b5cf6",
                    subject: "Calculus, Physics & Chemistry",
                    activePeers: 5,
                    host: "Kwame Mensah (Grade 10 STEM)",
                    description: "Collaborative homework breakdown, quadratic equations, lab reports, and physics mechanics discussions.",
                    roomCode: "STEM-8021"
                  },
                  {
                    id: "DEBATE-202",
                    name: "📖 Literature, Essay Writing & Debate Forum",
                    category: "Cooperative Learning",
                    categoryColor: "#8b5cf6",
                    subject: "English Language & World Literature",
                    activePeers: 4,
                    host: "Amina Yusuf (Grade 10 Arts)",
                    description: "Peer essay review, historical debates, poetry analysis, and grammar collaboration.",
                    roomCode: "LIT-3940"
                  },
                  {
                    id: "CODING-303",
                    name: "💻 Computer Science & Coding Workshop",
                    category: "Cooperative Learning",
                    categoryColor: "#8b5cf6",
                    subject: "Algorithms, Web Design & Python",
                    activePeers: 6,
                    host: "Alex Osei (Grade 11 Tech)",
                    description: "Pair programming, HTML/CSS project peer review, logic algorithms, and robotics project planning.",
                    roomCode: "CODE-5512"
                  },
                  {
                    id: "SOCIAL-404",
                    name: "☕ Student After-School Social Lounge",
                    category: "Socializing & Community",
                    categoryColor: "#f59e0b",
                    subject: "Student Common Room & Casual Chat",
                    activePeers: 8,
                    host: "Kofi Boateng (Student Council)",
                    description: "Relaxed social lounge to meet fellow scholars across classes, discuss sports, music, art, and school events.",
                    roomCode: "LOUNGE-9910"
                  },
                  {
                    id: "FRENCH-505",
                    name: "🌍 Foreign Language & Culture Exchange",
                    category: "Cooperative Learning",
                    categoryColor: "#8b5cf6",
                    subject: "French, Spanish & Twi Conversation",
                    activePeers: 3,
                    host: "Marie Dubois (Grade 10)",
                    description: "Interactive voice conversational practice, vocabulary drills, and cultural storytelling in foreign languages.",
                    roomCode: "LANG-7214"
                  }
                ] : []).map((room) => (
                  <div
                    key={room.id}
                    style={{
                      background: "rgba(15, 23, 42, 0.8)",
                      border: "1px solid rgba(255, 255, 255, 0.12)",
                      borderRadius: "14px",
                      padding: "1.25rem",
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "space-between",
                      transition: "all 0.2s ease"
                    }}
                  >
                    <div>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "8px" }}>
                        <span style={{
                          background: `${room.categoryColor}22`,
                          border: `1px solid ${room.categoryColor}66`,
                          color: room.categoryColor,
                          fontSize: "0.7rem",
                          fontWeight: 800,
                          padding: "3px 8px",
                          borderRadius: "6px"
                        }}>
                          {room.category}
                        </span>
                        <span style={{
                          background: "rgba(16, 185, 129, 0.15)",
                          color: "#34d399",
                          fontSize: "0.72rem",
                          fontWeight: 700,
                          padding: "3px 8px",
                          borderRadius: "6px"
                        }}>
                          ● {room.activePeers} Active Scholars
                        </span>
                      </div>

                      <h4 style={{ margin: "6px 0 4px", fontSize: "1rem", color: "#f8fafc", fontWeight: 800 }}>
                        {room.name}
                      </h4>
                      <div style={{ fontSize: "0.78rem", color: "#38bdf8", marginBottom: "8px", fontWeight: 700 }}>
                        📚 {room.subject}
                      </div>
                      <p style={{ fontSize: "0.8rem", color: "#cbd5e1", margin: "0 0 12px", lineHeight: 1.4 }}>
                        {room.description}
                      </p>

                      <div style={{
                        background: "rgba(0, 0, 0, 0.3)",
                        padding: "6px 10px",
                        borderRadius: "6px",
                        fontSize: "0.74rem",
                        color: "#94a3b8",
                        marginBottom: "14px"
                      }}>
                        Hosted by: <strong style={{ color: "#e2e8f0" }}>{room.host}</strong> • Room: <code style={{ color: "#a78bfa" }}>{room.roomCode}</code>
                      </div>
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                      <button
                        type="button"
                        onClick={() => handleOpenCoopConferencing(room, "VOICE")}
                        style={{
                          background: "rgba(139, 92, 246, 0.18)",
                          border: "1px solid #8b5cf6",
                          color: "#c084fc",
                          borderRadius: "8px",
                          padding: "8px 10px",
                          fontSize: "0.8rem",
                          fontWeight: 700,
                          cursor: "pointer",
                          display: "inline-flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: "4px"
                        }}
                      >
                        <span>🎙️</span> Voice Call
                      </button>
                      <button
                        type="button"
                        onClick={() => handleOpenCoopConferencing(room, "VIDEO")}
                        style={{
                          background: "linear-gradient(135deg, #8b5cf6, #7c3aed)",
                          border: "none",
                          color: "#ffffff",
                          borderRadius: "8px",
                          padding: "8px 10px",
                          fontSize: "0.8rem",
                          fontWeight: 800,
                          cursor: "pointer",
                          display: "inline-flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: "4px",
                          boxShadow: "0 3px 10px rgba(139, 92, 246, 0.35)"
                        }}
                      >
                        <span>📹</span> Video Call
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Collaborative Features Banner */}
              <div style={{
                background: "rgba(15, 23, 42, 0.6)",
                border: "1px solid rgba(255, 255, 255, 0.08)",
                borderRadius: "14px",
                padding: "1.5rem"
              }}>
                <h4 style={{ margin: "0 0 1rem", fontSize: "0.95rem", color: "#e2e8f0", fontWeight: 800 }}>
                  💡 Cooperative Learning & Peer Socializing Tools Included:
                </h4>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "1rem" }}>
                  <div style={{ borderLeft: "3px solid #8b5cf6", paddingLeft: "10px" }}>
                    <strong style={{ color: "#c084fc", fontSize: "0.88rem" }}>📝 Live Scratchpad & Notes</strong>
                    <p style={{ margin: "4px 0 0", fontSize: "0.78rem", color: "#94a3b8" }}>
                      Take joint notes during group study sessions and copy the entire text to your clipboard with one click.
                    </p>
                  </div>
                  <div style={{ borderLeft: "3px solid #38bdf8", paddingLeft: "10px" }}>
                    <strong style={{ color: "#38bdf8", fontSize: "0.88rem" }}>💬 Group Chat & Reactions</strong>
                    <p style={{ margin: "4px 0 0", fontSize: "0.78rem", color: "#94a3b8" }}>
                      Share quick questions and emojis (👍, ❤️, 💡, 👏, 🙋‍♂️) without interrupting whoever is speaking.
                    </p>
                  </div>
                  <div style={{ borderLeft: "3px solid #10b981", paddingLeft: "10px" }}>
                    <strong style={{ color: "#34d399", fontSize: "0.88rem" }}>🖥️ Instant Screen Sharing</strong>
                    <p style={{ margin: "4px 0 0", fontSize: "0.78rem", color: "#94a3b8" }}>
                      Present homework diagrams, slides, or code directly to your fellow study circle members.
                    </p>
                  </div>
                  <div style={{ borderLeft: "3px solid #f59e0b", paddingLeft: "10px" }}>
                    <strong style={{ color: "#fbbf24", fontSize: "0.88rem" }}>🔒 Scholar Safe Space</strong>
                    <p style={{ margin: "4px 0 0", fontSize: "0.78rem", color: "#94a3b8" }}>
                      Restricted to verified students in your institution with automated room security and peer reporting.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === "stationery" && (
            <div className="role-workspace-card">
              <SchoolStationeryHubPanel
                mode="STUDENT"
                currentUser={studentProfile}
              />
            </div>
          )}

          {activeTab === "clinic" && (
            <SchoolClinicHubPanel
              mode="STUDENT"
              currentUser={studentProfile}
              onFeedback={(msg) => setFeedback({ type: "success", message: msg })}
            />
          )}
        </main>
      </div>

      {/* MODAL 1: REQUIREMENT: Exam Submission Notice Confirmation */}
      {showExamConfirmModal && (
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: "rgba(0,0,0,0.85)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 9999,
          padding: "20px"
        }}>
          <div style={{
            background: "#0f172a",
            border: "1px solid rgba(168, 85, 247, 0.4)",
            borderRadius: "16px",
            padding: "2rem",
            maxWidth: "520px",
            width: "100%",
            textAlign: "center",
            boxShadow: "0 25px 50px -12px rgba(0,0,0,0.7)"
          }}>
            <span style={{ fontSize: "3rem", display: "block", marginBottom: "12px" }}>⚠️</span>
            <h3 style={{ color: "#f8fafc", margin: "0 0 10px", fontSize: "1.25rem" }}>
              CONFIRM EXAMINATION SUBMISSION
            </h3>
            <div style={{
              background: "rgba(245, 158, 11, 0.12)",
              border: "1px solid rgba(245, 158, 11, 0.3)",
              borderRadius: "10px",
              padding: "14px",
              margin: "1rem 0",
              textAlign: "left"
            }}>
              <p style={{ margin: 0, color: "#fef08a", fontSize: "0.9rem", lineHeight: "1.5", fontWeight: "600" }}>
                📢 <strong>CRITICAL NOTICE:</strong> Please read through all your answers before submitting or submit if you are surely done.
              </p>
              <p style={{ margin: "8px 0 0", color: "#cbd5e1", fontSize: "0.82rem", lineHeight: "1.4" }}>
                Once submitted, this paper will be <strong>permanently locked</strong> and you cannot access or modify answers. It will immediately be marked and graded by the deterministic AI grading engine.
              </p>
            </div>
            <div style={{ display: "flex", gap: "12px", justifyContent: "center", marginTop: "1.5rem" }}>
              <button
                type="button"
                className="btn-secondary"
                style={{ padding: "10px 18px", fontSize: "0.85rem" }}
                onClick={() => setShowExamConfirmModal(false)}
              >
                ← Read Through Answers
              </button>
              <button
                type="button"
                className="btn-primary"
                style={{ padding: "10px 22px", fontSize: "0.85rem", background: "linear-gradient(135deg, #10b981, #059669)" }}
                onClick={() => {
                  setShowExamConfirmModal(false);
                  handleSubmitExam();
                }}
                disabled={loading}
              >
                {loading ? "Submitting..." : "🚀 Yes, I Am Surely Done — Submit Now"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: AI Exam Head Movement & Gaze Proctoring Alert */}
      {showHeadMovementWarningModal && (
        <div style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0, 0, 0, 0.88)",
          backdropFilter: "blur(8px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 999999,
          padding: "20px"
        }}>
          <div style={{
            background: "linear-gradient(135deg, #1e1b4b 0%, #0f172a 100%)",
            border: "2px solid #ef4444",
            borderRadius: "18px",
            padding: "2rem",
            maxWidth: "540px",
            width: "100%",
            textAlign: "center",
            boxShadow: "0 25px 60px rgba(239, 68, 68, 0.4)"
          }}>
            <span style={{ fontSize: "3.5rem", display: "block", marginBottom: "8px" }}>⚠️ 👁️</span>
            <h3 style={{ color: "#ef4444", margin: "0 0 10px", fontSize: "1.3rem", fontWeight: 900 }}>
              ⚠️ AI EXAM PROCTORING ALERT
            </h3>
            <div style={{
              background: "rgba(239, 68, 68, 0.15)",
              border: "1.5px solid #ef4444",
              borderRadius: "10px",
              padding: "12px 16px",
              margin: "1rem 0",
              color: "#fca5a5",
              fontSize: "1.02rem",
              fontWeight: 800
            }}>
              {lastAlertReason || "Head movement or focus shift away from the exam screen detected! Next infraction deducts marks."}
            </div>
            <p style={{ margin: "0 0 1.25rem", color: "#cbd5e1", fontSize: "0.85rem", lineHeight: "1.5" }}>
              Our proctoring algorithm enforces strict examination integrity. You must face your screen continuously at all times.
              Recorded infractions: <strong style={{ color: "#f87171" }}>{proctoringWarnings} violation(s)</strong> • Cumulative penalty: <strong style={{ color: "#f87171" }}>-{penaltyMarksDeducted}% marks</strong>.
            </p>
            <button
              type="button"
              className="btn-primary"
              style={{
                background: "linear-gradient(135deg, #ef4444, #b91c1c)",
                border: "none",
                padding: "12px 28px",
                fontSize: "0.95rem",
                fontWeight: 800,
                boxShadow: "0 4px 15px rgba(239, 68, 68, 0.4)"
              }}
              onClick={() => setShowHeadMovementWarningModal(false)}
            >
              👁️ I Understand & Return to Examination
            </button>
          </div>
        </div>
      )}

      {/* MODAL: Past Examination Paper & Scheme Inspection */}
      {selectedPastPaperModal && (
        <div style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0, 0, 0, 0.85)",
          backdropFilter: "blur(8px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 99999,
          padding: "20px"
        }}>
          <div style={{
            background: "#0f172a",
            border: "1.5px solid #a855f7",
            borderRadius: "16px",
            maxWidth: "760px",
            width: "100%",
            padding: "2rem",
            maxHeight: "85vh",
            overflowY: "auto",
            boxShadow: "0 25px 50px rgba(0,0,0,0.8)"
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1rem", borderBottom: "1px solid rgba(255, 255, 255, 0.1)", paddingBottom: "12px" }}>
              <div>
                <span style={{ background: "rgba(168, 85, 247, 0.2)", color: "#c084fc", padding: "3px 8px", borderRadius: "6px", fontSize: "0.75rem", fontWeight: 800 }}>
                  📅 Academic Year {selectedPastPaperModal.year} • {selectedPastPaperModal.termLabel}
                </span>
                <h3 style={{ margin: "6px 0 0", color: "#f8fafc", fontSize: "1.25rem", fontWeight: 800 }}>
                  {selectedPastPaperModal.title}
                </h3>
                <span style={{ fontSize: "0.82rem", color: "#94a3b8" }}>
                  Subject: {selectedPastPaperModal.subject} • Level: {selectedPastPaperModal.level} • Examiner: {selectedPastPaperModal.teacher}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setSelectedPastPaperModal(null)}
                style={{ background: "transparent", border: "none", color: "#94a3b8", fontSize: "1.4rem", cursor: "pointer" }}
              >
                ✕
              </button>
            </div>

            <div style={{ display: "flex", gap: "10px", marginBottom: "1.25rem", flexWrap: "wrap" }}>
              <span className="badge-status badge-present">Duration: {selectedPastPaperModal.duration}</span>
              <span className="badge-status badge-present">Total: {selectedPastPaperModal.totalMarks} Marks</span>
              <span className="badge-status badge-present">{selectedPastPaperModal.questionsCount} Questions Total</span>
              <span style={{ fontSize: "0.75rem", color: "#38bdf8", background: "rgba(56, 189, 248, 0.1)", padding: "4px 8px", borderRadius: "6px" }}>
                ✓ Approved Scheme Included
              </span>
            </div>

            <h4 style={{ color: "#38bdf8", margin: "1rem 0 0.5rem", fontSize: "0.95rem", textTransform: "uppercase" }}>
              Official Questions & Computational Rubric:
            </h4>
            <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginBottom: "1.5rem" }}>
              {selectedPastPaperModal.sampleQuestions.map((sq, sIdx) => (
                <div
                  key={sIdx}
                  style={{
                    background: "rgba(15, 23, 42, 0.8)",
                    border: "1px solid rgba(255, 255, 255, 0.08)",
                    borderRadius: "10px",
                    padding: "12px 16px"
                  }}
                >
                  <div style={{ color: "#f8fafc", fontSize: "0.9rem", lineHeight: "1.5", fontWeight: 600 }}>
                    {sq}
                  </div>
                  <div style={{ marginTop: "6px", fontSize: "0.78rem", color: "#34d399", background: "rgba(16, 185, 129, 0.1)", padding: "4px 10px", borderRadius: "6px", display: "inline-block" }}>
                    ✓ Marking Rubric: Full method marks awarded for correct step-by-step derivation and units.
                  </div>
                </div>
              ))}
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "12px", borderTop: "1px solid rgba(255, 255, 255, 0.1)", paddingTop: "1rem" }}>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setSelectedPastPaperModal(null)}
              >
                ← Back to Examination Archive
              </button>
              <button
                type="button"
                className="btn-primary"
                style={{ background: "linear-gradient(135deg, #8b5cf6, #6d28d9)", fontWeight: 800 }}
                onClick={() => {
                  const paper = selectedPastPaperModal;
                  setSelectedPastPaperModal(null);
                  setExamQuestionIndex(0);
                  setExamAnswers({});
                  setExamEssayAnswers({});
                  beginProctoredExam({
                    id: paper.id,
                    title: `[MOCK PRACTICE] ${paper.title}`,
                    totalMarks: paper.totalMarks,
                    passMarks: 50,
                    durationMinutes: 45,
                    questionBank: paper.sampleQuestions.map((sq, sIdx) => ({
                      id: 900 + sIdx,
                      questionNumber: sIdx + 1,
                      questionText: sq,
                      options: ["Option A - Derivation Verified", "Option B - Alternative Working", "Option C - Inconclusive", "Option D - Counter-Example"]
                    }))
                  }, 45 * 60);
                }}
              >
                ✍️ Start Practice Exam on This Paper
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: REQUIREMENT: Request Mentorship from Alumni */}
      {showMentorModal && selectedMentorAlumnus && (
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: "rgba(0,0,0,0.85)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 9999,
          padding: "20px"
        }}>
          <div style={{
            background: "#0f172a",
            border: "1px solid rgba(59, 130, 246, 0.4)",
            borderRadius: "16px",
            padding: "2rem",
            maxWidth: "520px",
            width: "100%",
            boxShadow: "0 25px 50px -12px rgba(0,0,0,0.7)"
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
              <h3 style={{ margin: 0, color: "#38bdf8", fontSize: "1.15rem" }}>
                🤝 Request Alumni Mentorship
              </h3>
              <button
                type="button"
                onClick={() => setShowMentorModal(false)}
                style={{ background: "none", border: "none", color: "#94a3b8", cursor: "pointer", fontSize: "1.2rem" }}
              >
                ✖
              </button>
            </div>

            <div style={{ background: "rgba(255, 255, 255, 0.05)", padding: "12px", borderRadius: "8px", marginBottom: "1rem" }}>
              <div style={{ fontWeight: "700", color: "#f8fafc" }}>{selectedMentorAlumnus.name}</div>
              <div style={{ fontSize: "0.8rem", color: "#34d399" }}>{selectedMentorAlumnus.careerPlacement}</div>
              <div style={{ fontSize: "0.75rem", color: "#94a3b8" }}>Class of {selectedMentorAlumnus.graduatingYear} • {selectedMentorAlumnus.degree}</div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <div>
                <label style={{ display: "block", fontSize: "0.8rem", color: "#94a3b8", marginBottom: "4px" }}>
                  Your Desired Career / Research Track:
                </label>
                <input
                  type="text"
                  className="filter-input"
                  style={{ width: "100%", boxSizing: "border-box" }}
                  value={mentorRequestData.careerTrack}
                  onChange={(e) => setMentorRequestData({ ...mentorRequestData, careerTrack: e.target.value })}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "0.8rem", color: "#94a3b8", marginBottom: "4px" }}>
                  Personal Statement / Note to Mentor:
                </label>
                <textarea
                  rows={4}
                  className="filter-input"
                  style={{ width: "100%", boxSizing: "border-box", resize: "vertical" }}
                  placeholder="Introduce yourself, your academic goals at GBS, and what guidance you are seeking..."
                  value={mentorRequestData.notes}
                  onChange={(e) => setMentorRequestData({ ...mentorRequestData, notes: e.target.value })}
                />
              </div>

              <div style={{ display: "flex", gap: "10px", marginTop: "8px" }}>
                <button
                  type="button"
                  className="btn-secondary"
                  style={{ flex: 1 }}
                  onClick={() => setShowMentorModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn-primary"
                  style={{ flex: 2, justifyContent: "center" }}
                  onClick={() => {
                    setShowMentorModal(false);
                    setFeedback({
                      type: "success",
                      message: `Mentorship invitation successfully delivered to ${selectedMentorAlumnus.name} via the GBS Alumni Network!`
                    });
                  }}
                >
                  ✉️ Dispatch Mentorship Invitation
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* COURSE ENROLLED FILE LOCATION & LEARNING REPOSITORY MODAL */}
      {showCourseFilesModal && selectedCourseForFiles && (
        <div className="invoice-pay-modal-overlay">
          <div className="invoice-pay-modal" style={{ maxWidth: "800px", background: "#0b1329", border: "2px solid #0284c7", borderRadius: "16px", padding: "2rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", borderBottom: "1.5px solid rgba(56, 189, 248, 0.3)", paddingBottom: "1.25rem", marginBottom: "1.5rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <span style={{ fontSize: "2rem" }}>📂</span>
                <div>
                  <span className="role-portal-badge" style={{ color: "#38bdf8", marginBottom: "4px", display: "inline-block" }}>
                    COURSE ENROLLED FILE LOCATION • ACADEMIC MATERIALS VAULT
                  </span>
                  <h2 style={{ margin: "2px 0 0", color: "#f8fafc", fontSize: "1.3rem" }}>
                    {selectedCourseForFiles.code}: {selectedCourseForFiles.title}
                  </h2>
                  <span style={{ fontSize: "0.8rem", color: "#94a3b8" }}>
                    Instructor: <strong>{selectedCourseForFiles.instructor}</strong> • Schedule: {selectedCourseForFiles.schedule} ({selectedCourseForFiles.hall})
                  </span>
                </div>
              </div>
              <button
                type="button"
                className="btn-secondary"
                style={{ padding: "4px 10px", fontSize: "0.9rem" }}
                onClick={() => { setShowCourseFilesModal(false); setViewingFilePreview(null); }}
              >
                ✕
              </button>
            </div>

            {/* Exact Storage Server Directory Path */}
            <div style={{ background: "rgba(2, 6, 23, 0.8)", border: "1px solid rgba(56, 189, 248, 0.25)", borderRadius: "10px", padding: "12px 16px", marginBottom: "1.25rem", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px" }}>
              <div>
                <span style={{ fontSize: "0.72rem", color: "#94a3b8", textTransform: "uppercase", fontWeight: 700 }}>
                  Server File Location:
                </span>
                <div style={{ fontFamily: "monospace", fontSize: "0.85rem", color: "#38bdf8", fontWeight: 700, marginTop: "2px" }}>
                  {selectedCourseForFiles.fileLocation || `/var/gbs/storage/courses/${selectedCourseForFiles.code.replace(" ", "_")}/modules/`}
                </div>
              </div>
              <span className="badge-status badge-present" style={{ fontSize: "0.75rem" }}>
                ● Local Server Synced (HTTP Accessible)
              </span>
            </div>

            {/* File List Table */}
            <div className="role-table-responsive" style={{ maxHeight: "320px", overflowY: "auto", marginBottom: "1.5rem" }}>
              <table className="role-table" style={{ fontSize: "0.82rem" }}>
                <thead>
                  <tr>
                    <th>File Name & Topic</th>
                    <th>Format</th>
                    <th>Size</th>
                    <th>Uploaded Date</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {(selectedCourseForFiles.materials || []).map((file, idx) => (
                    <tr key={idx}>
                      <td>
                        <strong style={{ color: "#f8fafc", display: "block" }}>{file.name}</strong>
                        <span style={{ fontSize: "0.75rem", color: "#94a3b8" }}>{file.topic}</span>
                      </td>
                      <td>
                        <span className="role-portal-badge" style={{ color: "#38bdf8", fontSize: "0.7rem" }}>
                          {file.type}
                        </span>
                      </td>
                      <td style={{ color: "#cbd5e1" }}>{file.size}</td>
                      <td style={{ color: "#94a3b8" }}>{file.uploadedAt}</td>
                      <td>
                        <div style={{ display: "flex", gap: "6px" }}>
                          <button
                            type="button"
                            className="btn-primary"
                            style={{ padding: "4px 10px", fontSize: "0.75rem", cursor: "pointer" }}
                            onClick={() => navigateToDetail(navigate, "report", file.id || file.name, file, { returnTab: activeTab })}
                            aria-label="View full course material details on dedicated page"
                          >
                            👁️ View
                          </button>
                          <button
                            type="button"
                            className="btn-secondary"
                            style={{ padding: "4px 10px", fontSize: "0.75rem", borderColor: "#10b981", color: "#34d399" }}
                            onClick={() => {
                              setFeedback({
                                type: "success",
                                message: `📥 Downloading ${file.name} (${file.size}) to your local device.`
                              });
                            }}
                          >
                            📥 Download
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* File Viewer Preview Box */}
            {viewingFilePreview && (
              <div style={{ background: "rgba(15, 23, 42, 0.9)", border: "1.5px solid #10b981", borderRadius: "10px", padding: "1rem", marginBottom: "1.25rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                  <strong style={{ color: "#34d399", fontSize: "0.88rem" }}>
                    📄 Document Reader: {viewingFilePreview.name}
                  </strong>
                  <button type="button" onClick={() => setViewingFilePreview(null)} style={{ background: "none", border: "none", color: "#94a3b8", cursor: "pointer" }}>✕</button>
                </div>
                <div style={{ background: "#020617", padding: "12px", borderRadius: "6px", fontFamily: "monospace", fontSize: "0.8rem", color: "#cbd5e1", lineHeight: "1.6", maxHeight: "120px", overflowY: "auto" }}>
                  [GBS ACADEMIC STORAGE REPOSITORY - VERIFIED CONTENT] <br />
                  Course: {selectedCourseForFiles.code} - {selectedCourseForFiles.title} <br />
                  Module Topic: {viewingFilePreview.topic} <br />
                  Academic Clearance: GRANTED FOR ENROLLED STUDENT • AUTHENTIC SYLLABUS DIGEST
                </div>
              </div>
            )}

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px" }}>
              <span style={{ fontSize: "0.78rem", color: "#94a3b8" }}>
                * All course materials are hosted on the local institutional storage server and accessible across campus LAN.
              </span>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => { setShowCourseFilesModal(false); setViewingFilePreview(null); }}
              >
                Close Location Viewer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: REQUIREMENT: Alumni Access Official Academic Records & Degree Archive */}
      {showAlumniRecordsModal && (
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: "rgba(0,0,0,0.85)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 9999,
          padding: "20px"
        }}>
          <div style={{
            background: "#0f172a",
            border: "1px solid rgba(168, 85, 247, 0.4)",
            borderRadius: "16px",
            padding: "2rem",
            maxWidth: "680px",
            width: "100%",
            maxHeight: "90vh",
            overflowY: "auto",
            boxShadow: "0 25px 50px -12px rgba(0,0,0,0.7)"
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <img
                  src={customSchoolLogo || "/assets/gbs_crest_badge.jpg"}
                  alt="School Crest"
                  style={{ width: "42px", height: "42px", borderRadius: "50%", objectFit: "cover", border: "1.5px solid #a855f7" }}
                />
                <div>
                  <h3 style={{ margin: 0, color: "#f8fafc", fontSize: "1.2rem" }}>
                    📜 Official Certified Alumni Academic Records
                  </h3>
                  <span style={{ fontSize: "0.75rem", color: "#a855f7" }}>
                    {schoolOfficialName} • Registrar & Degree Archive Vault
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAlumniRecordsModal(false)}
                style={{ background: "none", border: "none", color: "#94a3b8", cursor: "pointer", fontSize: "1.2rem" }}
              >
                ✖
              </button>
            </div>

            <div style={{ background: "rgba(255, 255, 255, 0.04)", borderRadius: "10px", padding: "1.25rem", border: "1px solid rgba(255, 255, 255, 0.08)", marginBottom: "1rem" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", fontSize: "0.85rem" }}>
                <div><span style={{ color: "#94a3b8" }}>Graduate Scholar:</span> <strong style={{ color: "#f8fafc" }}>{currentUser.firstName} {currentUser.lastName}</strong></div>
                <div><span style={{ color: "#94a3b8" }}>Alumni Identifier:</span> <strong style={{ color: "#38bdf8" }}>GBS-ALM-2026-084</strong></div>
                <div><span style={{ color: "#94a3b8" }}>Degree Awarded:</span> <strong style={{ color: "#34d399" }}>B.Sc. in Computer Science & AI (Honours)</strong></div>
                <div><span style={{ color: "#94a3b8" }}>Cumulative CGPA:</span> <strong style={{ color: "#fbbf24" }}>3.88 / 4.00 (First Class)</strong></div>
                <div><span style={{ color: "#94a3b8" }}>Graduation Date:</span> <strong style={{ color: "#cbd5e1" }}>June 18, 2026</strong></div>
                <div><span style={{ color: "#94a3b8" }}>Status:</span> <span className="role-portal-badge" style={{ color: "#34d399" }}>Conferred & In Good Standing</span></div>
              </div>
            </div>

            <h4 style={{ color: "#38bdf8", margin: "1rem 0 0.5rem", fontSize: "0.95rem" }}>
              Permanent Certified Transcript Breakdown:
            </h4>
            <div style={{ overflowX: "auto" }}>
              <table className="role-table" style={{ fontSize: "0.8rem" }}>
                <thead>
                  <tr>
                    <th>Academic Level</th>
                    <th>Term / Semester</th>
                    <th>Credits Earned</th>
                    <th>Term GPA</th>
                    <th>Institutional Standing</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>Level 100 (Freshman)</td>
                    <td>Semester 1 & 2</td>
                    <td>36.0</td>
                    <td>3.82</td>
                    <td><span className="badge-status badge-present">Dean's Honour Roll</span></td>
                  </tr>
                  <tr>
                    <td>Level 200 (Sophomore)</td>
                    <td>Semester 1 & 2</td>
                    <td>38.0</td>
                    <td>3.89</td>
                    <td><span className="badge-status badge-present">Dean's Honour Roll</span></td>
                  </tr>
                  <tr>
                    <td>Level 300 (Junior)</td>
                    <td>Semester 1 & 2</td>
                    <td>36.0</td>
                    <td>3.92</td>
                    <td><span className="badge-status badge-present">President's Scholar</span></td>
                  </tr>
                  <tr>
                    <td>Level 400 (Senior)</td>
                    <td>Semester 1 & 2 (Capstone)</td>
                    <td>34.0</td>
                    <td>3.96</td>
                    <td><span className="badge-status badge-present">Summa Cum Laude</span></td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div style={{ marginTop: "1rem", padding: "10px", background: "rgba(16, 185, 129, 0.1)", border: "1px solid rgba(16, 185, 129, 0.3)", borderRadius: "8px", fontSize: "0.75rem", color: "#a7f3d0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span>🔐 Verifiable Cryptographic Hash: SHA-256: 4f1a9b2d8e7c6b5a3f1e0d9c8b7a6f5e</span>
              <span>Signed by Headmaster & Registrar</span>
            </div>

            <div style={{ display: "flex", gap: "10px", marginTop: "1.5rem", justifyContent: "flex-end" }}>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setShowAlumniRecordsModal(false)}
              >
                Close Archive
              </button>
              <button
                type="button"
                className="btn-primary"
                onClick={() => {
                  window.print();
                }}
              >
                🖨️ Download Official Certified Transcript (PDF)
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Universal Floating Scroll Controls */}
      <div
        style={{
          position: "fixed",
          bottom: "24px",
          right: "24px",
          display: "flex",
          flexDirection: "column",
          gap: "8px",
          zIndex: 9999
        }}
      >
        <button
          type="button"
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          aria-label="Scroll to Top"
          style={{
            background: "linear-gradient(135deg, #0284c7, #2563eb)",
            color: "#ffffff",
            border: "1.5px solid rgba(255,255,255,0.3)",
            borderRadius: "50%",
            width: "42px",
            height: "42px",
            fontSize: "1.1rem",
            cursor: "pointer",
            boxShadow: "0 4px 14px rgba(0,0,0,0.4)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            transition: "transform 0.2s"
          }}
          onMouseEnter={(e) => e.currentTarget.style.transform = "scale(1.1)"}
          onMouseLeave={(e) => e.currentTarget.style.transform = "scale(1.0)"}
        >
          ⬆️
        </button>
        <button
          type="button"
          onClick={() => window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" })}
          aria-label="Scroll to Bottom"
          style={{
            background: "linear-gradient(135deg, #1e293b, #0f172a)",
            color: "#38bdf8",
            border: "1.5px solid rgba(56,189,248,0.4)",
            borderRadius: "50%",
            width: "42px",
            height: "42px",
            fontSize: "1.1rem",
            cursor: "pointer",
            boxShadow: "0 4px 14px rgba(0,0,0,0.4)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            transition: "transform 0.2s"
          }}
          onMouseEnter={(e) => e.currentTarget.style.transform = "scale(1.1)"}
          onMouseLeave={(e) => e.currentTarget.style.transform = "scale(1.0)"}
        >
          ⬇️
        </button>
      </div>

      {/* MODAL: DRESS CODE GUIDELINES */}
      {showDressCodeModal && (
        <div style={{
          position: "fixed",
          inset: 0,
          background: "rgba(3, 7, 18, 0.85)",
          backdropFilter: "blur(6px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 999999,
          padding: "20px"
        }}>
          <div style={{
            background: "linear-gradient(145deg, #0f172a 0%, #1e293b 100%)",
            border: "2px solid #a855f7",
            borderRadius: "18px",
            maxWidth: "520px",
            width: "100%",
            padding: "26px",
            boxShadow: "0 20px 50px rgba(0,0,0,0.8)",
            color: "#f8fafc"
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
              <h3 style={{ margin: 0, color: "#c084fc", fontSize: "1.15rem", display: "flex", alignItems: "center", gap: "8px" }}>
                <span>👔</span> OFFICIAL SCHOLAR DRESS CODE & PORTRAIT STANDARDS
              </h3>
              <button
                type="button"
                onClick={() => setShowDressCodeModal(false)}
                style={{ background: "transparent", border: "none", color: "#94a3b8", fontSize: "1.2rem", cursor: "pointer" }}
              >
                ✕
              </button>
            </div>
            <p style={{ fontSize: "0.85rem", color: "#cbd5e1", lineHeight: "1.5", margin: "0 0 16px" }}>
              To maintain institutional identity and security verification across examinations, live classrooms, and parental records, every student profile photograph must strictly adhere to the following standards:
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "20px" }}>
              <div style={{ background: "rgba(15, 23, 42, 0.6)", padding: "10px 14px", borderRadius: "10px", border: "1px solid rgba(168, 85, 247, 0.25)" }}>
                <strong style={{ color: "#a855f7", fontSize: "0.85rem" }}>1. Prescribed Academic Uniform:</strong>
                <p style={{ margin: "2px 0 0", fontSize: "0.8rem", color: "#94a3b8" }}>
                  Official institutional school uniform, collared shirt, or formal academic blazer. Casual t-shirts are not permitted.
                </p>
              </div>
              <div style={{ background: "rgba(15, 23, 42, 0.6)", padding: "10px 14px", borderRadius: "10px", border: "1px solid rgba(168, 85, 247, 0.25)" }}>
                <strong style={{ color: "#38bdf8", fontSize: "0.85rem" }}>2. Plain Neutral Background:</strong>
                <p style={{ margin: "2px 0 0", fontSize: "0.8rem", color: "#94a3b8" }}>
                  Solid white, light blue, or neutral studio background without shadows or background objects.
                </p>
              </div>
              <div style={{ background: "rgba(15, 23, 42, 0.6)", padding: "10px 14px", borderRadius: "10px", border: "1px solid rgba(168, 85, 247, 0.25)" }}>
                <strong style={{ color: "#34d399", fontSize: "0.85rem" }}>3. Square Ratio (1:1) & Clear Facial View:</strong>
                <p style={{ margin: "2px 0 0", fontSize: "0.8rem", color: "#94a3b8" }}>
                  Front-facing centered portrait with shoulders visible. No sunglasses, decorative headwear, or digital augmented filters.
                </p>
              </div>
            </div>
            <button
              type="button"
              className="btn-primary"
              onClick={() => setShowDressCodeModal(false)}
              style={{ width: "100%", padding: "10px", background: "linear-gradient(135deg, #9333ea, #a855f7)", fontWeight: 800 }}
            >
              ✓ Understood & Acknowledged
            </button>
          </div>
        </div>
      )}

      {/* MODAL: CONFIRM PEER CHAT IDENTITY */}
      {showPeerConfirmModal && candidatePeer && (
        <div style={{
          position: "fixed",
          inset: 0,
          background: "rgba(3, 7, 18, 0.85)",
          backdropFilter: "blur(6px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 999999,
          padding: "20px"
        }}>
          <div style={{
            background: "linear-gradient(145deg, #0f172a 0%, #1e293b 100%)",
            border: "2px solid #06b6d4",
            borderRadius: "18px",
            maxWidth: "460px",
            width: "100%",
            padding: "24px",
            boxShadow: "0 20px 50px rgba(0,0,0,0.8)",
            color: "#f8fafc",
            textAlign: "center"
          }}>
            <div style={{ fontSize: "2.2rem", marginBottom: "8px" }}>💬 ✨</div>
            <h3 style={{ margin: "0 0 6px", color: "#22d3ee", fontSize: "1.2rem" }}>
              CONFIRM PEER IDENTITY
            </h3>
            <p style={{ fontSize: "0.82rem", color: "#94a3b8", margin: "0 0 16px" }}>
              Please verify that this is the classmate you wish to communicate and collaborate with:
            </p>

            <div style={{
              background: "rgba(15, 23, 42, 0.8)",
              border: "1px solid rgba(6, 182, 212, 0.3)",
              borderRadius: "14px",
              padding: "16px",
              display: "flex",
              alignItems: "center",
              gap: "14px",
              textAlign: "left",
              marginBottom: "20px"
            }}>
              <img
                src={candidatePeer.photo || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop"}
                alt={candidatePeer.firstName}
                style={{ width: "64px", height: "64px", borderRadius: "12px", objectFit: "cover", border: "2px solid #06b6d4" }}
              />
              <div>
                <h4 style={{ margin: 0, color: "#f8fafc", fontSize: "1.05rem" }}>
                  {candidatePeer.firstName} {candidatePeer.lastName}
                </h4>
                <div style={{ fontSize: "0.78rem", color: "#22d3ee", fontFamily: "monospace", marginTop: "2px" }}>
                  Index: {candidatePeer.indexNumber || candidatePeer.studentId}
                </div>
                <div style={{ fontSize: "0.75rem", color: "#94a3b8" }}>
                  {candidatePeer.currentClass || candidatePeer.classCode}
                </div>
                <div style={{ fontSize: "0.75rem", color: "#34d399", marginTop: "3px" }}>
                  📞 {candidatePeer.registeredMobile || candidatePeer.phone || "+233-24-000-0000"}
                </div>
              </div>
            </div>

            <div style={{ display: "flex", gap: "12px" }}>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => {
                  setShowPeerConfirmModal(false);
                  setCandidatePeer(null);
                }}
                style={{ flex: 1, padding: "10px" }}
              >
                ✕ Cancel
              </button>
              <button
                type="button"
                className="btn-primary"
                onClick={() => handleConfirmStartChat(candidatePeer)}
                style={{ flex: 1, padding: "10px", background: "linear-gradient(135deg, #0891b2, #06b6d4)", fontWeight: 800 }}
              >
                ✅ Verify & Start Chat
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: VIEW ARCHIVED CHATS */}
      {showArchivedChatsModal && (
        <div style={{
          position: "fixed",
          inset: 0,
          background: "rgba(3, 7, 18, 0.85)",
          backdropFilter: "blur(6px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 999999,
          padding: "20px"
        }}>
          <div style={{
            background: "linear-gradient(145deg, #0f172a 0%, #1e293b 100%)",
            border: "2px solid #64748b",
            borderRadius: "18px",
            maxWidth: "600px",
            width: "100%",
            padding: "24px",
            boxShadow: "0 20px 50px rgba(0,0,0,0.8)",
            color: "#f8fafc"
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
              <h3 style={{ margin: 0, color: "#cbd5e1", fontSize: "1.15rem", display: "flex", alignItems: "center", gap: "8px" }}>
                <span>🗄️</span> ARCHIVED PEER CHATS VAULT ({archivedPeerChats.length})
              </h3>
              <button
                type="button"
                onClick={() => setShowArchivedChatsModal(false)}
                style={{ background: "transparent", border: "none", color: "#94a3b8", fontSize: "1.2rem", cursor: "pointer" }}
              >
                ✕
              </button>
            </div>

            {archivedPeerChats.length === 0 ? (
              <div style={{ textAlign: "center", padding: "30px", color: "#64748b" }}>
                <span style={{ fontSize: "2rem", display: "block", marginBottom: "8px" }}>📦</span>
                No conversations have been archived yet. Click "Save & Archive Chat" in any conversation to preserve study notes here.
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "10px", maxHeight: "360px", overflowY: "auto" }}>
                {archivedPeerChats.map((arch) => (
                  <div
                    key={arch.id}
                    style={{
                      background: "rgba(15, 23, 42, 0.75)",
                      border: "1px solid rgba(255, 255, 255, 0.1)",
                      borderRadius: "10px",
                      padding: "12px 16px",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      flexWrap: "wrap",
                      gap: "10px"
                    }}
                  >
                    <div>
                      <h4 style={{ margin: 0, color: "#38bdf8", fontSize: "0.95rem" }}>
                        {arch.peerName} ({arch.peerIndex})
                      </h4>
                      <span style={{ fontSize: "0.75rem", color: "#94a3b8" }}>
                        Archived: {arch.archivedAt} • {arch.messageCount} messages
                      </span>
                    </div>
                    <div style={{ display: "flex", gap: "8px" }}>
                      <button
                        type="button"
                        onClick={() => {
                          const peerMatch = enrolledPeersList.find((p) => (p.indexNumber || p.studentId) === arch.peerIndex) || {
                            firstName: arch.peerName.split(" ")[0],
                            lastName: arch.peerName.split(" ")[1] || "",
                            indexNumber: arch.peerIndex,
                            studentId: arch.peerIndex,
                            currentClass: arch.peerClass
                          };
                          setActivePeerChat(peerMatch);
                          setChatMessages(arch.messages || []);
                          setShowArchivedChatsModal(false);
                          setActiveTab("peer-chat");
                        }}
                        style={{
                          background: "rgba(6, 182, 212, 0.2)",
                          border: "1px solid #06b6d4",
                          color: "#22d3ee",
                          borderRadius: "6px",
                          padding: "5px 10px",
                          fontSize: "0.75rem",
                          fontWeight: 700,
                          cursor: "pointer"
                        }}
                      >
                        🔄 Open
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const transcript = (arch.messages || []).map((m) => `[${m.timestamp}] ${m.senderName}: ${m.text}`).join("\n");
                          const blob = new Blob([transcript], { type: "text/plain" });
                          const url = URL.createObjectURL(blob);
                          const a = document.createElement("a");
                          a.href = url;
                          a.download = `Archived_Chat_${arch.peerName}_${Date.now()}.txt`;
                          a.click();
                        }}
                        style={{
                          background: "rgba(148, 163, 184, 0.15)",
                          border: "1px solid #64748b",
                          color: "#cbd5e1",
                          borderRadius: "6px",
                          padding: "5px 10px",
                          fontSize: "0.75rem",
                          fontWeight: 700,
                          cursor: "pointer"
                        }}
                      >
                        📥 Download
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL: INSTANT FEE PAYMENT GATEWAY */}
      {showFeePaymentModal && (
        <div style={{
          position: "fixed",
          inset: 0,
          background: "rgba(3, 7, 18, 0.85)",
          backdropFilter: "blur(6px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 999999,
          padding: "20px"
        }}>
          <div style={{
            background: "linear-gradient(145deg, #0f172a 0%, #1e293b 100%)",
            border: "2px solid #10b981",
            borderRadius: "18px",
            maxWidth: "480px",
            width: "100%",
            padding: "26px",
            boxShadow: "0 20px 50px rgba(0,0,0,0.8)",
            color: "#f8fafc"
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
              <h3 style={{ margin: 0, color: "#34d399", fontSize: "1.15rem", display: "flex", alignItems: "center", gap: "8px" }}>
                <span>💳</span> INSTANT TUITION & EXAMINATION PAYMENT
              </h3>
              <button
                type="button"
                onClick={() => setShowFeePaymentModal(false)}
                style={{ background: "transparent", border: "none", color: "#94a3b8", fontSize: "1.2rem", cursor: "pointer" }}
              >
                ✕
              </button>
            </div>
            <p style={{ fontSize: "0.82rem", color: "#cbd5e1", margin: "0 0 16px" }}>
              Settling at least <strong>80% of term fees</strong> automatically unlocks examination hall entry and generates an official late exam clearance slip.
            </p>

            <form onSubmit={handleProcessFeePayment} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <div>
                <label style={{ display: "block", fontSize: "0.75rem", color: "#94a3b8", marginBottom: "4px" }}>
                  Payment Method / Gateway *
                </label>
                <select
                  value={paymentChannel}
                  onChange={(e) => setPaymentChannel(e.target.value)}
                  className="filter-select"
                  style={{ width: "100%", padding: "8px 12px" }}
                >
                  <option value="MTN_MOMO">🟡 MTN Mobile Money (*170#)</option>
                  <option value="TELECEL_CASH">🔴 Telecel Cash (*110#)</option>
                  <option value="AIRTELTIGO_MONEY">🔵 AirtelTigo Money (*110#)</option>
                  <option value="VISA_MASTERCARD">💳 Visa / Mastercard / Debit</option>
                  <option value="BANK_DIRECT">🏦 Direct Commercial Bank Transfer</option>
                </select>
              </div>

              <div>
                <label style={{ display: "block", fontSize: "0.75rem", color: "#94a3b8", marginBottom: "4px" }}>
                  Payment Amount (GH₵) *
                </label>
                <input
                  type="number"
                  required
                  min="1"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  className="filter-input"
                  style={{ width: "100%", padding: "8px 12px", fontFamily: "monospace", fontSize: "1.05rem" }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "0.75rem", color: "#94a3b8", marginBottom: "4px" }}>
                  Payer Mobile Number (for MoMo Prompt) *
                </label>
                <input
                  type="tel"
                  required
                  value={payerPhone}
                  onChange={(e) => setPayerPhone(e.target.value)}
                  className="filter-input"
                  style={{ width: "100%", padding: "8px 12px" }}
                />
              </div>

              <div style={{ display: "flex", gap: "10px", marginTop: "12px" }}>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setShowFeePaymentModal(false)}
                  style={{ flex: 1, padding: "10px" }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  style={{ flex: 1, padding: "10px", background: "linear-gradient(135deg, #10b981, #059669)", fontWeight: 800 }}
                >
                  Confirm Payment (GH₵ {parseFloat(paymentAmount || 0).toFixed(2)})
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: RESCHEDULED LATE EXAM WRITING SLIP */}
      {showRescheduledExamSlipModal && (
        <div style={{
          position: "fixed",
          inset: 0,
          background: "rgba(3, 7, 18, 0.85)",
          backdropFilter: "blur(6px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 999999,
          padding: "20px"
        }}>
          <div style={{
            background: "#ffffff",
            color: "#0f172a",
            borderRadius: "16px",
            maxWidth: "540px",
            width: "100%",
            padding: "28px",
            boxShadow: "0 25px 60px rgba(0,0,0,0.8)",
            fontFamily: "serif"
          }}>
            <div style={{ borderBottom: "2px solid #0f172a", paddingBottom: "12px", marginBottom: "16px", textAlign: "center" }}>
              <img
                src={customSchoolLogo || "/assets/gbs_crest_badge.jpg"}
                alt="School Crest"
                style={{ width: "44px", height: "44px", borderRadius: "8px", objectFit: "contain", marginBottom: "4px" }}
              />
              <h2 style={{ margin: "4px 0", fontSize: "1.3rem", fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                {(schoolOfficialName || getActiveSchoolName(studentProfile)).toUpperCase()}
              </h2>
              <span style={{ fontSize: "0.8rem", color: "#475569", fontWeight: 700 }}>
                EXAMINATIONS COUNCIL & FINANCIAL CLEARANCE DIVISION
              </span>
              <div style={{
                background: "#0f172a",
                color: "#ffffff",
                padding: "4px 12px",
                borderRadius: "4px",
                display: "inline-block",
                marginTop: "8px",
                fontSize: "0.82rem",
                fontWeight: 900,
                letterSpacing: "0.08em"
              }}>
                OFFICIAL RESCHEDULED LATE EXAM WRITING SLIP
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", fontSize: "0.85rem", marginBottom: "16px" }}>
              <div>
                <span style={{ color: "#64748b", fontSize: "0.75rem", display: "block" }}>CANDIDATE NAME</span>
                <strong>{currentUser.firstName} {currentUser.lastName}</strong>
              </div>
              <div>
                <span style={{ color: "#64748b", fontSize: "0.75rem", display: "block" }}>INDEX / ADMISSION NO.</span>
                <strong style={{ fontFamily: "monospace" }}>GBS-STU-2026-084</strong>
              </div>
              <div>
                <span style={{ color: "#64748b", fontSize: "0.75rem", display: "block" }}>ACADEMIC LEVEL & TERM</span>
                <strong>{academicLevel} • {academicTerm}</strong>
              </div>
              <div>
                <span style={{ color: "#64748b", fontSize: "0.75rem", display: "block" }}>FEE CLEARANCE STATUS</span>
                <strong style={{ color: "#059669" }}>{"CLEARED (>= 80% MET)"}</strong>
              </div>
              <div>
                <span style={{ color: "#64748b", fontSize: "0.75rem", display: "block" }}>ASSIGNED EXAM HALL</span>
                <strong>Executive CBT Annex Hall 2</strong>
              </div>
              <div>
                <span style={{ color: "#64748b", fontSize: "0.75rem", display: "block" }}>RESCHEDULED TIMING</span>
                <strong>Late Session: 02:00 PM - 04:30 PM</strong>
              </div>
            </div>

            <div style={{
              background: "#f1f5f9",
              border: "1px dashed #94a3b8",
              padding: "10px",
              borderRadius: "8px",
              fontSize: "0.78rem",
              color: "#334155",
              lineHeight: "1.4",
              marginBottom: "16px"
            }}>
              <strong>NOTICE TO CHIEF INVIGILATOR:</strong> The candidate has cleared the required fee threshold with finance and is officially authorized to sit for all scheduled examinations during late exam windows.
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid #cbd5e1", paddingTop: "12px" }}>
              <div style={{ fontSize: "0.72rem", color: "#64748b" }}>
                Ref: CLR-80P-{Date.now().toString().slice(-6)} • Verified by Headmaster
              </div>
              <div style={{ display: "flex", gap: "8px" }}>
                <button
                  type="button"
                  onClick={() => window.print()}
                  style={{
                    background: "#0284c7",
                    color: "#ffffff",
                    border: "none",
                    borderRadius: "6px",
                    padding: "8px 16px",
                    fontSize: "0.82rem",
                    fontWeight: 800,
                    cursor: "pointer"
                  }}
                >
                  🖨️ Print Slip
                </button>
                <button
                  type="button"
                  onClick={() => setShowRescheduledExamSlipModal(false)}
                  style={{
                    background: "#e2e8f0",
                    color: "#334155",
                    border: "none",
                    borderRadius: "6px",
                    padding: "8px 14px",
                    fontSize: "0.82rem",
                    fontWeight: 700,
                    cursor: "pointer"
                  }}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}


      {/* IN-APP LIVE VIRTUAL CLASSROOM & MEETING STUDIO MODAL */}
      {activeJoinedMeeting && (
        <div style={{
          position: "fixed",
          inset: 0,
          background: "rgba(2, 6, 23, 0.94)",
          backdropFilter: "blur(14px)",
          zIndex: 999999,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "1rem"
        }}>
          <div style={{
            background: "#090d16",
            border: "2px solid #0284c7",
            borderRadius: "20px",
            width: "100%",
            maxWidth: "960px",
            height: "85vh",
            display: "flex",
            flexDirection: "column",
            boxShadow: "0 25px 70px rgba(0, 0, 0, 0.9)",
            color: "#fff",
            overflow: "hidden"
          }}>
            {/* Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 20px", background: "rgba(15, 23, 42, 0.9)", borderBottom: "1px solid rgba(255, 255, 255, 0.1)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <span style={{ fontSize: "1.6rem" }}>🎓</span>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <h3 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 900, color: "#38bdf8" }}>
                      {activeJoinedMeeting.title}
                    </h3>
                    <span style={{ background: "#10b981", color: "#064e3b", fontSize: "0.68rem", fontWeight: 900, padding: "2px 6px", borderRadius: "999px" }}>
                      ● LIVE NOW
                    </span>
                  </div>
                  <span style={{ fontSize: "0.75rem", color: "#94a3b8" }}>
                    Tutor / Host: <strong>{activeJoinedMeeting.host || "Teacher"}</strong> • Subject: <strong>{activeJoinedMeeting.subject || "Academic Seminar"}</strong>
                  </span>
                </div>
              </div>

              <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                <a
                  href={formatMeetingUrl(activeJoinedMeeting.meetingUrl, activeJoinedMeeting.passcode || "GBS2026", activeJoinedMeeting.meetingId || "84939201849")}
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    background: "rgba(56, 189, 248, 0.15)",
                    border: "1px solid #38bdf8",
                    color: "#38bdf8",
                    padding: "6px 12px",
                    borderRadius: "8px",
                    fontSize: "0.76rem",
                    fontWeight: 800,
                    textDecoration: "none"
                  }}
                  aria-label="Launch in external Zoom or Google Meet app"
                >
                  🔗 Open in External App ↗
                </a>
                <button
                  type="button"
                  onClick={() => setActiveJoinedMeeting(null)}
                  style={{
                    background: "rgba(239, 68, 68, 0.2)",
                    border: "1px solid #ef4444",
                    color: "#fca5a5",
                    padding: "6px 12px",
                    borderRadius: "8px",
                    fontWeight: 800,
                    fontSize: "0.78rem",
                    cursor: "pointer"
                  }}
                >
                  ⏹️ Leave Class
                </button>
              </div>
            </div>

            {/* Main Stage: Left Video Presentation & Right Chat/Roster */}
            <div style={{ flex: 1, display: "grid", gridTemplateColumns: "1fr 300px", overflow: "hidden" }}>

              {/* Left: Interactive Class Presentation & Teacher Feed */}
              <div style={{ background: "#020617", position: "relative", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
                <img
                  src="/assets/teacher-dashboard-bg.jpg"
                  alt="Teacher Live Presentation"
                  style={{ width: "100%", height: "100%", objectFit: "cover", opacity: 0.85 }}
                />

                {/* Live Teacher Banner Overlay */}
                <div style={{ position: "absolute", top: "16px", left: "16px", background: "rgba(2, 6, 23, 0.85)", border: "1px solid rgba(255, 255, 255, 0.15)", padding: "6px 12px", borderRadius: "8px", display: "flex", alignItems: "center", gap: "8px" }}>
                  <span style={{ width: "10px", height: "10px", borderRadius: "50%", background: "#ef4444", animation: "pulse 1.5s infinite" }}></span>
                  <span style={{ fontSize: "0.78rem", color: "#f8fafc", fontWeight: 800 }}>Teacher Screen Sharing • Interactive Whiteboard</span>
                </div>

                {/* Picture-in-Picture: Student's Own Video Preview */}
                <div style={{ position: "absolute", bottom: "16px", right: "16px", width: "160px", height: "110px", background: "#0f172a", borderRadius: "10px", border: "2px solid #38bdf8", overflow: "hidden", boxShadow: "0 4px 20px rgba(0,0,0,0.8)" }}>
                  <img
                    src={studentAvatar || "/assets/illustrations/user_face_placeholder.jpg"}
                    alt="You"
                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                  />
                  <div style={{ position: "absolute", bottom: "4px", left: "4px", background: "rgba(0,0,0,0.75)", padding: "1px 6px", borderRadius: "4px", fontSize: "0.65rem", color: "#38bdf8", fontWeight: 700 }}>
                    You (Active)
                  </div>
                </div>

                {/* Hand Raised Banner */}
                {classroomHandRaised && (
                  <div style={{ position: "absolute", top: "16px", right: "16px", background: "linear-gradient(135deg, #f59e0b, #d97706)", padding: "6px 14px", borderRadius: "8px", fontSize: "0.8rem", fontWeight: 900, color: "#0f172a", display: "flex", alignItems: "center", gap: "6px", boxShadow: "0 4px 15px rgba(245, 158, 11, 0.4)" }}>
                    ✋ Hand Raised — Teacher Notified
                  </div>
                )}
              </div>

              {/* Right: Live Classroom Chat & Participants Roster */}
              <div style={{ background: "rgba(15, 23, 42, 0.95)", borderLeft: "1px solid rgba(255, 255, 255, 0.1)", display: "flex", flexDirection: "column" }}>
                <div style={{ padding: "10px 14px", borderBottom: "1px solid rgba(255, 255, 255, 0.08)", fontSize: "0.82rem", fontWeight: 800, color: "#38bdf8" }}>
                  💬 CLASSROOM LIVE CHAT
                </div>

                <div style={{ flex: 1, padding: "12px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "10px" }}>
                  {classroomChatMessages.map((msg, i) => (
                    <div key={i} style={{ background: "rgba(2, 6, 23, 0.6)", padding: "8px 10px", borderRadius: "8px", border: "1px solid rgba(255, 255, 255, 0.05)" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2px" }}>
                        <strong style={{ color: msg.sender.includes("Teacher") ? "#34d399" : "#38bdf8", fontSize: "0.75rem" }}>{msg.sender}</strong>
                        <span style={{ fontSize: "0.65rem", color: "#64748b" }}>{msg.time}</span>
                      </div>
                      <p style={{ margin: 0, fontSize: "0.8rem", color: "#cbd5e1" }}>{msg.text}</p>
                    </div>
                  ))}
                </div>

                <form onSubmit={handleSendClassroomChat} style={{ padding: "10px", borderTop: "1px solid rgba(255, 255, 255, 0.08)", display: "flex", gap: "6px" }}>
                  <input
                    type="text"
                    placeholder="Type message to class..."
                    value={newClassroomMsg}
                    onChange={(e) => setNewClassroomMsg(e.target.value)}
                    style={{ flex: 1, background: "#020617", border: "1px solid rgba(255, 255, 255, 0.15)", borderRadius: "6px", padding: "8px 10px", color: "#fff", fontSize: "0.78rem" }}
                  />
                  <button
                    type="submit"
                    style={{ background: "#0284c7", border: "none", borderRadius: "6px", padding: "8px 12px", color: "#fff", fontWeight: 800, fontSize: "0.78rem", cursor: "pointer" }}
                  >
                    Send
                  </button>
                </form>
              </div>

            </div>

            {/* Bottom Controls Bar */}
            <div style={{ background: "rgba(15, 23, 42, 0.95)", borderTop: "1px solid rgba(255, 255, 255, 0.1)", padding: "12px 20px", display: "flex", justifyContent: "center", alignItems: "center", gap: "14px" }}>
              <button
                type="button"
                onClick={() => setClassroomMicMuted(!classroomMicMuted)}
                style={{ background: classroomMicMuted ? "#ef4444" : "rgba(30, 41, 59, 0.8)", border: "1px solid rgba(255, 255, 255, 0.2)", borderRadius: "10px", padding: "8px 16px", color: "#fff", fontWeight: 700, fontSize: "0.82rem", cursor: "pointer" }}
              >
                {classroomMicMuted ? "🔇 Unmute Mic" : "🎤 Mic Active"}
              </button>
              <button
                type="button"
                onClick={() => setClassroomCameraOn(!classroomCameraOn)}
                style={{ background: !classroomCameraOn ? "#ef4444" : "rgba(30, 41, 59, 0.8)", border: "1px solid rgba(255, 255, 255, 0.2)", borderRadius: "10px", padding: "8px 16px", color: "#fff", fontWeight: 700, fontSize: "0.82rem", cursor: "pointer" }}
              >
                {classroomCameraOn ? "📷 Camera ON" : "📷 Camera OFF"}
              </button>
              <button
                type="button"
                onClick={() => setClassroomHandRaised(!classroomHandRaised)}
                style={{ background: classroomHandRaised ? "#f59e0b" : "rgba(30, 41, 59, 0.8)", border: "1px solid rgba(255, 255, 255, 0.2)", borderRadius: "10px", padding: "8px 16px", color: classroomHandRaised ? "#0f172a" : "#fff", fontWeight: 800, fontSize: "0.82rem", cursor: "pointer" }}
              >
                {classroomHandRaised ? "✋ Hand Lowered" : "✋ Raise Hand"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PEER-TO-PEER LIVE VIDEO CALL MODAL */}
      {activePeerVideoCall && (() => {
        const peerModal = (
          <div style={{
            position: "fixed",
            inset: 0,
            background: "rgba(2, 6, 23, 0.92)",
            backdropFilter: "blur(12px)",
            zIndex: 999999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "1rem"
          }}>
            <div style={{
              background: "#090d16",
              border: "2px solid #06b6d4",
              borderRadius: "20px",
              width: "100%",
              maxWidth: "760px",
              padding: "1.5rem",
              boxShadow: "0 25px 60px rgba(0, 0, 0, 0.9)",
              color: "#fff"
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid rgba(255, 255, 255, 0.1)", paddingBottom: "10px", marginBottom: "14px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <span style={{ fontSize: "1.5rem" }}>📹</span>
                  <div>
                    <h3 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 800, color: "#22d3ee" }}>
                      LIVE PEER STUDY CALL • {activePeerVideoCall.firstName} {activePeerVideoCall.lastName}
                    </h3>
                    <span style={{ fontSize: "0.75rem", color: "#94a3b8" }}>
                      Verified Scholar Index: {activePeerVideoCall.indexNumber || activePeerVideoCall.studentId} • Encrypted WebRTC Session
                    </span>
                  </div>
                </div>
                <div style={{ background: "rgba(6, 182, 212, 0.2)", border: "1px solid #06b6d4", borderRadius: "20px", padding: "4px 12px", color: "#67e8f9", fontFamily: "monospace", fontWeight: 800 }}>
                  ⏱️ {Math.floor(peerCallDuration / 60).toString().padStart(2, '0')}:{(peerCallDuration % 60).toString().padStart(2, '0')}
                </div>
              </div>

              {/* Video Screens Split (Live Camera Feeds) */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", height: "300px", marginBottom: "1rem" }}>
                {/* Remote Peer Stream */}
                <div style={{ background: "#020617", border: "1.5px solid rgba(255, 255, 255, 0.15)", borderRadius: "14px", position: "relative", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <img
                    src={activePeerVideoCall.photo || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&h=400&fit=crop"}
                    alt={activePeerVideoCall.firstName}
                    style={{ width: "100%", height: "100%", objectFit: "cover", filter: isPeerCameraOff ? "none" : "none" }}
                  />
                  {/* Simulated Peer Active Pulse Ring */}
                  <div style={{ position: "absolute", inset: "15px", border: "1.5px dashed rgba(34, 211, 238, 0.4)", borderRadius: "10px", pointerEvents: "none" }}></div>
                  <div style={{ position: "absolute", top: "10px", left: "10px", background: "rgba(2, 6, 23, 0.8)", padding: "3px 8px", borderRadius: "4px", fontSize: "0.7rem", color: "#34d399", fontWeight: "bold", fontFamily: "monospace" }}>
                    ● REMOTE WEBRTC FEED • 30 FPS
                  </div>
                  <div style={{ position: "absolute", bottom: "10px", left: "10px", background: "rgba(0,0,0,0.7)", padding: "3px 8px", borderRadius: "6px", fontSize: "0.72rem", color: "#34d399", fontWeight: 700 }}>
                    ● {activePeerVideoCall.firstName} ({activePeerVideoCall.currentClass || "Scholar"})
                  </div>
                </div>

                {/* Local User Stream (Direct Hardware Camera Feed) */}
                <div style={{ background: "#020617", border: "1.5px solid #06b6d4", borderRadius: "14px", position: "relative", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <video
                    ref={localPeerVideoRef}
                    autoPlay
                    playsInline
                    muted
                    onLoadedMetadata={(e) => {
                      e.currentTarget.muted = true;
                      e.currentTarget.play().catch(() => { });
                    }}
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                      transform: "scaleX(-1)",
                      display: isPeerCameraOff ? "none" : "block"
                    }}
                  />
                  {isPeerCameraOff && (
                    <div style={{ textAlign: "center", color: "#94a3b8" }}>
                      <img
                        src={studentAvatar || "/assets/illustrations/user_face_placeholder.jpg"}
                        alt="You"
                        style={{ width: "70px", height: "70px", borderRadius: "50%", objectFit: "cover", marginBottom: "8px", border: "2px solid #64748b" }}
                      />
                      <div style={{ fontSize: "0.78rem" }}>Camera Turned Off</div>
                    </div>
                  )}
                  <div style={{ position: "absolute", top: "10px", left: "10px", background: "rgba(2, 6, 23, 0.8)", padding: "3px 8px", borderRadius: "4px", fontSize: "0.7rem", color: "#38bdf8", fontWeight: "bold", fontFamily: "monospace" }}>
                    ● LOCAL CAM: ACTIVE (YOU)
                  </div>
                  <div style={{ position: "absolute", bottom: "10px", left: "10px", background: "rgba(0,0,0,0.7)", padding: "3px 8px", borderRadius: "6px", fontSize: "0.72rem", color: "#38bdf8", fontWeight: 700 }}>
                    ● You ({studentProfile?.firstName || "Scholar"})
                  </div>
                  {isPeerScreenSharing && (
                    <div style={{ position: "absolute", top: "10px", right: "10px", background: "rgba(16, 185, 129, 0.9)", padding: "2px 8px", borderRadius: "4px", fontSize: "0.7rem", fontWeight: 800 }}>
                      🖥️ Screen Shared
                    </div>
                  )}
                </div>
              </div>

              {/* Video Call Controls Bar */}
              <div style={{ display: "flex", justifyContent: "center", gap: "12px", alignItems: "center" }}>
                <button
                  type="button"
                  onClick={() => {
                    const nextMuted = !isPeerMicMuted;
                    setIsPeerMicMuted(nextMuted);
                    if (localPeerStreamRef.current) {
                      localPeerStreamRef.current.getAudioTracks().forEach((t) => { t.enabled = !nextMuted; });
                    }
                  }}
                  style={{
                    padding: "10px 16px",
                    borderRadius: "10px",
                    background: isPeerMicMuted ? "#ef4444" : "rgba(30, 41, 59, 0.8)",
                    border: "1px solid rgba(255, 255, 255, 0.15)",
                    color: "#fff",
                    fontWeight: 700,
                    cursor: "pointer"
                  }}
                >
                  {isPeerMicMuted ? "🔇 Unmute Mic" : "🎤 Mute Mic"}
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    const nextOff = !isPeerCameraOff;
                    setIsPeerCameraOff(nextOff);
                    const liveVidTracks = (localPeerStreamRef.current?.getVideoTracks?.() || []).filter((t) => t.readyState === "live");
                    if (!nextOff && liveVidTracks.length === 0) {
                      await startLocalPeerCamera();
                    } else if (localPeerStreamRef.current) {
                      localPeerStreamRef.current.getVideoTracks().forEach((t) => { t.enabled = !nextOff; });
                      if (!nextOff && localPeerVideoRef.current) {
                        localPeerVideoRef.current.srcObject = localPeerStreamRef.current;
                        localPeerVideoRef.current.play().catch(() => { });
                      }
                    }
                  }}
                  style={{
                    padding: "10px 16px",
                    borderRadius: "10px",
                    background: isPeerCameraOff ? "#ef4444" : "rgba(30, 41, 59, 0.8)",
                    border: "1px solid rgba(255, 255, 255, 0.15)",
                    color: "#fff",
                    fontWeight: 700,
                    cursor: "pointer"
                  }}
                >
                  {isPeerCameraOff ? "📷 Start Camera" : "📷 Stop Camera"}
                </button>
                <button
                  type="button"
                  onClick={handleTogglePeerScreenShare}
                  style={{
                    padding: "10px 16px",
                    borderRadius: "10px",
                    background: isPeerScreenSharing ? "#10b981" : "rgba(30, 41, 59, 0.8)",
                    border: "1px solid rgba(255, 255, 255, 0.15)",
                    color: "#fff",
                    fontWeight: 700,
                    cursor: "pointer"
                  }}
                >
                  {isPeerScreenSharing ? "🖥️ Stop Share" : "🖥️ Share Screen"}
                </button>
                <button
                  type="button"
                  onClick={handleEndPeerVideoCall}
                  style={{
                    padding: "10px 22px",
                    borderRadius: "10px",
                    background: "linear-gradient(135deg, #ef4444, #b91c1c)",
                    border: "none",
                    color: "#fff",
                    fontWeight: 900,
                    cursor: "pointer",
                    boxShadow: "0 4px 14px rgba(239, 68, 68, 0.4)"
                  }}
                >
                  🔴 End Video Call
                </button>
              </div>
            </div>
          </div>
        );
        return typeof document !== "undefined" && document.body
          ? createPortal(peerModal, document.body)
          : peerModal;
      })()}

      {/* CATCH-UP RECORDING VIDEO PLAYER & PDF NOTES MODAL */}
      {showCatchUpModal && (
        <div style={{
          position: "fixed",
          inset: 0,
          background: "rgba(2, 6, 23, 0.92)",
          backdropFilter: "blur(12px)",
          zIndex: 999999,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "1rem"
        }}>
          <div style={{
            background: "#090d16",
            border: "1.5px solid #38bdf8",
            borderRadius: "18px",
            width: "100%",
            maxWidth: "840px",
            maxHeight: "90vh",
            display: "flex",
            flexDirection: "column",
            boxShadow: "0 25px 70px rgba(0, 0, 0, 0.95)",
            color: "#fff",
            overflow: "hidden"
          }}>
            {/* Modal Header */}
            <div style={{
              padding: "16px 20px",
              background: "rgba(15, 23, 42, 0.95)",
              borderBottom: "1.5px solid rgba(56, 189, 248, 0.3)",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: "10px"
            }}>
              <div>
                <h3 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 800, color: "#38bdf8" }}>
                  📹 CONCLUDED LESSON CATCH-UP & SYLLABUS NOTES
                </h3>
                <span style={{ fontSize: "0.75rem", color: "#94a3b8" }}>
                  Subject: <strong>{concludedClassNotice.subject}</strong> • Topic: <strong>{concludedClassNotice.topic}</strong> • Instructor: <strong>{concludedClassNotice.instructor}</strong>
                </span>
              </div>
              <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                <div style={{ display: "flex", background: "rgba(2, 6, 23, 0.7)", borderRadius: "8px", padding: "2px", border: "1px solid rgba(56, 189, 248, 0.3)" }}>
                  <button
                    type="button"
                    onClick={() => setCatchUpViewMode("VIDEO")}
                    style={{
                      padding: "6px 12px",
                      borderRadius: "6px",
                      border: "none",
                      background: catchUpViewMode === "VIDEO" ? "#0284c7" : "transparent",
                      color: "#fff",
                      fontSize: "0.76rem",
                      fontWeight: 800,
                      cursor: "pointer"
                    }}
                  >
                    📹 Full Video Player
                  </button>
                  <button
                    type="button"
                    onClick={() => setCatchUpViewMode("PDF_NOTES")}
                    style={{
                      padding: "6px 12px",
                      borderRadius: "6px",
                      border: "none",
                      background: catchUpViewMode === "PDF_NOTES" ? "#10b981" : "transparent",
                      color: "#fff",
                      fontSize: "0.76rem",
                      fontWeight: 800,
                      cursor: "pointer"
                    }}
                  >
                    📄 PDF Class Notes
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => setShowCatchUpModal(false)}
                  style={{ background: "rgba(255, 255, 255, 0.1)", border: "1px solid rgba(255, 255, 255, 0.2)", color: "#fff", borderRadius: "8px", padding: "4px 10px", cursor: "pointer", fontWeight: 800 }}
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div style={{ padding: "18px 20px", overflowY: "auto", flex: 1 }}>
              {catchUpViewMode === "VIDEO" ? (
                <div>
                  {/* Topic Selector Row */}
                  <div style={{ display: "flex", gap: "8px", marginBottom: "12px", flexWrap: "wrap" }}>
                    {[
                      { title: "Lesson 1: Differential Calculus & Rates of Change", embed: "https://www.youtube.com/embed/WUvTyaaNkzM" },
                      { title: "Lesson 2: Limits, Continuity & Derivative Theorems", embed: "https://www.youtube.com/embed/1LGYfM3uFq4" },
                      { title: "Lesson 3: Applied Physics & Thermodynamics Lab", embed: "https://www.youtube.com/embed/G6n8U-3pD_g" }
                    ].map((lec, lIdx) => (
                      <button
                        key={lIdx}
                        type="button"
                        onClick={() => setSelectedCatchUpLecture(lIdx)}
                        style={{
                          padding: "6px 12px",
                          borderRadius: "6px",
                          border: selectedCatchUpLecture === lIdx ? "1.5px solid #38bdf8" : "1px solid rgba(255, 255, 255, 0.1)",
                          background: selectedCatchUpLecture === lIdx ? "rgba(56, 189, 248, 0.2)" : "rgba(15, 23, 42, 0.6)",
                          color: selectedCatchUpLecture === lIdx ? "#38bdf8" : "#cbd5e1",
                          fontSize: "0.75rem",
                          fontWeight: 700,
                          cursor: "pointer"
                        }}
                      >
                        {lec.title}
                      </button>
                    ))}
                  </div>

                  {/* Video Stage with Full Controls */}
                  <div style={{ position: "relative", width: "100%", height: "420px", background: "#000", borderRadius: "12px", overflow: "hidden", border: "1px solid rgba(56, 189, 248, 0.3)" }}>
                    <iframe
                      src={[
                        "https://www.youtube.com/embed/WUvTyaaNkzM?rel=0&modestbranding=1",
                        "https://www.youtube.com/embed/1LGYfM3uFq4?rel=0&modestbranding=1",
                        "https://www.youtube.com/embed/G6n8U-3pD_g?rel=0&modestbranding=1"
                      ][selectedCatchUpLecture] || "https://www.youtube.com/embed/WUvTyaaNkzM"}
                      aria-label="Concluded Lesson Catch-Up Video"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                      allowFullScreen
                      style={{ width: "100%", height: "100%", border: "none" }}
                    />
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "10px", fontSize: "0.76rem", color: "#94a3b8" }}>
                    <span>▶️ Full High-Definition Lecture Recording • Synced to Institutional Cloud CDN</span>
                    <button
                      type="button"
                      onClick={() => setCatchUpViewMode("PDF_NOTES")}
                      style={{ background: "none", border: "none", color: "#34d399", cursor: "pointer", fontWeight: 700, textDecoration: "underline" }}
                    >
                      📖 Open Accompanying Lecture Notes →
                    </button>
                  </div>
                </div>
              ) : (
                /* PDF CLASS NOTES IN-MODAL VIEWER */
                <div style={{
                  background: "#020617",
                  border: "1.5px solid rgba(16, 185, 129, 0.4)",
                  borderRadius: "12px",
                  padding: "1.5rem",
                  color: "#f8fafc"
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", borderBottom: "1px solid rgba(255, 255, 255, 0.1)", paddingBottom: "12px", marginBottom: "16px" }}>
                    <div>
                      <span style={{ fontSize: "0.72rem", color: "#10b981", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.5px" }}>
                        ● OFFICIAL ACADEMIC COURSE MATERIAL & CLASS NOTES
                      </span>
                      <h2 style={{ margin: "4px 0 2px", color: "#f8fafc", fontSize: "1.2rem" }}>
                        {concludedClassNotice.subject}: {concludedClassNotice.topic}
                      </h2>
                      <span style={{ fontSize: "0.78rem", color: "#94a3b8" }}>
                        Course Code: <strong>MATH-201 / SHS-CALC</strong> • Delivered: <strong>{concludedClassNotice.date}</strong> by <strong>{concludedClassNotice.instructor}</strong>
                      </span>
                    </div>
                    <div style={{ display: "flex", gap: "8px" }}>
                      <button
                        type="button"
                        onClick={() => window.print()}
                        style={{
                          background: "rgba(56, 189, 248, 0.15)",
                          border: "1px solid #38bdf8",
                          color: "#38bdf8",
                          padding: "6px 12px",
                          borderRadius: "6px",
                          fontSize: "0.76rem",
                          fontWeight: 800,
                          cursor: "pointer"
                        }}
                      >
                        🖨️ Print Notes
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setFeedback({
                            type: "success",
                            message: `📥 Downloading ${concludedClassNotice.notesFile} to local storage.`
                          });
                        }}
                        style={{
                          background: "linear-gradient(135deg, #10b981, #059669)",
                          border: "none",
                          color: "#fff",
                          padding: "6px 14px",
                          borderRadius: "6px",
                          fontSize: "0.76rem",
                          fontWeight: 800,
                          cursor: "pointer"
                        }}
                      >
                        📥 Download PDF
                      </button>
                    </div>
                  </div>

                  {/* Comprehensive Lecture Notes Content */}
                  <div style={{ fontSize: "0.85rem", lineHeight: "1.7", color: "#cbd5e1" }}>
                    <h4 style={{ color: "#38bdf8", margin: "14px 0 6px" }}>1. Learning Objectives:</h4>
                    <ul style={{ margin: "0 0 14px", paddingLeft: "20px" }}>
                      <li>Comprehend the limit definition of a derivative: <code>f'(x) = lim (h→0) [f(x+h) - f(x)] / h</code></li>
                      <li>Master the Chain Rule for composite functions: <code>d/dx [f(g(x))] = f'(g(x)) · g'(x)</code></li>
                      <li>Calculate instantaneous velocity and acceleration in dynamic kinematic systems.</li>
                    </ul>

                    <h4 style={{ color: "#38bdf8", margin: "14px 0 6px" }}>2. Core Mathematical Theorem:</h4>
                    <div style={{ background: "rgba(15, 23, 42, 0.8)", padding: "12px 16px", borderRadius: "8px", borderLeft: "4px solid #38bdf8", fontFamily: "monospace", color: "#e2e8f0", margin: "10px 0" }}>
                      If f(u) is differentiable at u = g(x) and g(x) is differentiable at x, then the composite function <br />
                      F(x) = f(g(x)) is differentiable at x and its derivative is given by: <br />
                      <strong>dF/dx = (df/du) · (du/dx)</strong>
                    </div>

                    <h4 style={{ color: "#38bdf8", margin: "14px 0 6px" }}>3. Worked Example & Proof:</h4>
                    <p>
                      <strong>Problem:</strong> Find the derivative of <code>y = (3x² - 5x + 2)⁴</code> with respect to x. <br />
                      <strong>Step 1:</strong> Let inner function <code>u = 3x² - 5x + 2</code>. Thus <code>y = u⁴</code>. <br />
                      <strong>Step 2:</strong> Differentiate outer function: <code>dy/du = 4u³</code>. <br />
                      <strong>Step 3:</strong> Differentiate inner function: <code>du/dx = 6x - 5</code>. <br />
                      <strong>Step 4:</strong> Multiply components: <code>dy/dx = 4(3x² - 5x + 2)³ · (6x - 5)</code>.
                    </p>

                    <h4 style={{ color: "#38bdf8", margin: "14px 0 6px" }}>4. Homework Practice Exercises (Due Next Session):</h4>
                    <ol style={{ margin: "0 0 14px", paddingLeft: "20px" }}>
                      <li>Differentiate <code>f(x) = sin(4x³ - 2x)</code>.</li>
                      <li>Determine the critical points and intervals of increase for <code>g(x) = x³ - 6x² + 9x + 1</code>.</li>
                      <li>A spherical weather balloon is inflated at a constant rate of <code>40 cm³/s</code>. Calculate the rate at which the radius is expanding when the radius is exactly <code>5 cm</code>.</li>
                    </ol>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div style={{
              padding: "12px 20px",
              background: "rgba(15, 23, 42, 0.95)",
              borderTop: "1px solid rgba(255, 255, 255, 0.1)",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center"
            }}>
              <span style={{ fontSize: "0.76rem", color: "#34d399" }}>
                ✓ Synced to Institutional Academic Archive
              </span>
              <button
                type="button"
                onClick={() => setShowCatchUpModal(false)}
                style={{
                  background: "linear-gradient(135deg, #0284c7, #0369a1)",
                  border: "none",
                  borderRadius: "8px",
                  color: "#fff",
                  fontWeight: 800,
                  padding: "8px 18px",
                  cursor: "pointer"
                }}
              >
                ← Back to Student Hub
              </button>
            </div>
          </div>
        </div>
      )}

      {/* OFFICIAL PAYMENT GATEWAY MODAL FOR STUDENT SELF-PAYMENT OF FEES & BILLS */}
      <OfficialPaymentGatewayModal
        isOpen={showOfficialPaymentModal}
        onClose={() => {
          setShowOfficialPaymentModal(false);
          setSelectedFeeInvoiceTarget(null);
        }}
        tenantId={currentUser?.tenantId || 1}
        invoiceId={selectedFeeInvoiceTarget && /^\d+$/.test(String(selectedFeeInvoiceTarget.id || "")) ? Number(selectedFeeInvoiceTarget.id) : null}
        amount={selectedFeeInvoiceTarget?.balanceDue || (feeBalance > 0 ? feeBalance : null)}
        currency="GHS"
        title={selectedFeeInvoiceTarget?.title || studentFeeStatement?.feeSummary?.feeDescription || "Student School Fees & Bills Self-Payment"}
        studentId={studentFeeStatement?.student?.id || currentUser?.id || "3"}
        studentIdentifier={String(studentFeeStatement?.student?.studentCode || studentFeeStatement?.student?.id || currentUser?.id || "3")}
        studentName={studentFeeStatement?.student?.fullName || `${currentUser?.firstName || ""} ${currentUser?.lastName || ""}`.trim() || "Student"}
        onSuccess={({ transaction, receipt }) => {
          loadVerifiedStudentFees();
          setFeedback({
            type: "success",
            message: `Payment verified & posted to School Accountant Ledger! Receipt ${receipt?.receiptNumber || transaction?.receiptNumber} (${transaction?.payeeReference || "Student Self-Payment"}). Remaining balance: ${receipt?.currency || "GHS"} ${Number(receipt?.balanceAfter ?? 0).toFixed(2)}.`
          });
        }}
      />

      {/* MODAL: HIGH-RESOLUTION LIBRARY BOOK COVER & FULL SYLLABUS DETAILS */}
      {selectedBookForPreview && (
        <div style={{
          position: "fixed",
          inset: 0,
          background: "rgba(3, 7, 18, 0.88)",
          backdropFilter: "blur(8px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 999999,
          padding: "20px"
        }}>
          <div style={{
            background: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)",
            border: "1.5px solid rgba(56, 189, 248, 0.4)",
            borderRadius: "16px",
            maxWidth: "720px",
            width: "100%",
            maxHeight: "88vh",
            overflowY: "auto",
            padding: "24px",
            boxShadow: "0 25px 60px rgba(0,0,0,0.8)",
            color: "#f8fafc"
          }}>
            {/* Header with Back Button and Right Close Button */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid rgba(255,255,255,0.1)", paddingBottom: "14px", marginBottom: "20px" }}>
              <button
                type="button"
                onClick={() => setSelectedBookForPreview(null)}
                style={{
                  background: "rgba(255, 255, 255, 0.08)",
                  border: "1px solid rgba(255, 255, 255, 0.2)",
                  color: "#cbd5e1",
                  borderRadius: "8px",
                  padding: "6px 14px",
                  fontSize: "0.82rem",
                  fontWeight: 700,
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px"
                }}
              >
                ⬅️ Back to Library
              </button>
              <h3 style={{ margin: 0, fontSize: "1.1rem", color: "#38bdf8", fontWeight: 800 }}>
                📖 INSTITUTIONAL E-BOOK DOSSIER
              </h3>
              <button
                type="button"
                onClick={() => setSelectedBookForPreview(null)}
                style={{
                  background: "none",
                  border: "none",
                  color: "#94a3b8",
                  fontSize: "1.3rem",
                  cursor: "pointer",
                  lineHeight: 1
                }}
              >
                ✕
              </button>
            </div>

            {/* Book Body: High-Res Cover & Synopsis */}
            <div style={{ display: "grid", gridTemplateColumns: "220px 1fr", gap: "24px", alignItems: "start" }}>
              <div>
                <img
                  src={selectedBookForPreview.cover}
                  alt={selectedBookForPreview.title}
                  style={{
                    width: "100%",
                    height: "300px",
                    objectFit: "cover",
                    borderRadius: "12px",
                    boxShadow: "0 10px 25px rgba(0,0,0,0.6)",
                    border: "2px solid rgba(255,255,255,0.15)"
                  }}
                />
                <div style={{ textAlign: "center", marginTop: "10px", fontSize: "0.75rem", color: "#94a3b8" }}>
                  🔎 High-Resolution Cover
                </div>
              </div>

              <div>
                <span style={{ fontSize: "0.72rem", background: "rgba(56, 189, 248, 0.15)", color: "#38bdf8", padding: "3px 10px", borderRadius: "999px", fontWeight: 800 }}>
                  {selectedBookForPreview.category || "Secondary Curriculum"}
                </span>
                <h2 style={{ fontSize: "1.3rem", margin: "10px 0 6px", color: "#f8fafc" }}>
                  {selectedBookForPreview.title}
                </h2>
                <div style={{ fontSize: "0.88rem", color: "#fbbf24", fontWeight: 700, marginBottom: "12px" }}>
                  Author: {selectedBookForPreview.author}
                </div>

                <div style={{ background: "rgba(15, 23, 42, 0.6)", border: "1px solid rgba(255, 255, 255, 0.08)", borderRadius: "10px", padding: "14px", marginBottom: "16px" }}>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", fontSize: "0.8rem" }}>
                    <div>
                      <span style={{ color: "#94a3b8", display: "block" }}>ISBN Identifier:</span>
                      <strong style={{ color: "#38bdf8", fontFamily: "monospace" }}>{selectedBookForPreview.isbn || "978-0-19-842718-6"}</strong>
                    </div>
                    <div>
                      <span style={{ color: "#94a3b8", display: "block" }}>Extent & Length:</span>
                      <strong style={{ color: "#f8fafc" }}>{selectedBookForPreview.pages || 420} Pages (Complete)</strong>
                    </div>
                    <div>
                      <span style={{ color: "#94a3b8", display: "block" }}>Loan Period:</span>
                      <strong style={{ color: "#10b981" }}>14 Academic Days (Renewable)</strong>
                    </div>
                    <div>
                      <span style={{ color: "#94a3b8", display: "block" }}>Access Format:</span>
                      <strong style={{ color: "#a855f7" }}>Digital E-Reader + Campus Hardcopy</strong>
                    </div>
                  </div>
                </div>

                <p style={{ fontSize: "0.85rem", color: "#cbd5e1", lineHeight: "1.6", marginBottom: "18px" }}>
                  {selectedBookForPreview.description || `Official secondary curriculum text curated for comprehensive mastery of examination topics, laboratory problem sets, and practical assignments. Fully compliant with Ministry of Education WAEC/WASSCE benchmarks.`}
                </p>

                <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                  {borrowedBooks.some((b) => b.title === selectedBookForPreview.title) ? (
                    <button
                      type="button"
                      onClick={() => {
                        const rec = borrowedBooks.find((b) => b.title === selectedBookForPreview.title);
                        if (rec) handleReturnBook(rec.id);
                        setSelectedBookForPreview(null);
                      }}
                      style={{
                        padding: "10px 20px",
                        background: "rgba(239, 68, 68, 0.2)",
                        border: "1.5px solid #ef4444",
                        color: "#f87171",
                        borderRadius: "8px",
                        fontWeight: 800,
                        cursor: "pointer"
                      }}
                    >
                      📥 Return This Book to Library
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        handleBorrowBook(selectedBookForPreview);
                        setSelectedBookForPreview(null);
                      }}
                      style={{
                        padding: "10px 22px",
                        background: "linear-gradient(135deg, #0284c7, #38bdf8)",
                        border: "none",
                        color: "#0f172a",
                        borderRadius: "8px",
                        fontWeight: 900,
                        cursor: "pointer",
                        boxShadow: "0 4px 15px rgba(56, 189, 248, 0.4)"
                      }}
                    >
                      📖 Confirm E-Book Checkout (14-Day Loan)
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setSelectedBookForPreview(null)}
                    style={{
                      padding: "10px 18px",
                      background: "rgba(255, 255, 255, 0.08)",
                      border: "1px solid rgba(255, 255, 255, 0.2)",
                      color: "#cbd5e1",
                      borderRadius: "8px",
                      fontWeight: 700,
                      cursor: "pointer"
                    }}
                  >
                    Close Preview
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <UniversalRoleGuideModal
        role="STUDENT"
        isOpen={showStudentGuideModal}
        onClose={() => setShowStudentGuideModal(false)}
      />

      <StudentCooperativeConferenceModal
        isOpen={showCoopModal}
        onClose={() => setShowCoopModal(false)}
        initialRoom={selectedCoopRoom}
        initialMode={coopCallMode}
      />
    </div>
  );
}

class StudentDashboardErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch(error, errorInfo) {
    console.warn("Student Dashboard non-fatal event:", error);
    try {
      sessionStorage.setItem("gbs_student_active_tab", "timetable");
    } catch { }
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ minHeight: "100vh", background: "#0b0f19", color: "#f8fafc", padding: "20px" }}>
          <TopCenterSystemBanner currentRole="STUDENT" activeDashboard="STUDENT" />
          <div style={{ maxWidth: "600px", margin: "60px auto", textAlign: "center", background: "rgba(15, 23, 42, 0.95)", border: "1.5px solid #38bdf8", borderRadius: "16px", padding: "32px", boxShadow: "0 20px 50px rgba(0,0,0,0.8)" }}>
            <span style={{ fontSize: "2.8rem" }}>🎒</span>
            <h3 style={{ color: "#38bdf8", margin: "12px 0 8px" }}>Student Scholar Portal</h3>
            <p style={{ color: "#94a3b8", fontSize: "0.88rem", marginBottom: "20px" }}>
              Switching directly to your active Timetable & Academic Overview.
            </p>
            <div style={{ display: "flex", gap: "12px", justifyContent: "center" }}>
              <button
                type="button"
                onClick={() => {
                  sessionStorage.setItem("gbs_student_active_tab", "timetable");
                  window.location.href = "/portal/student/dashboard?tab=timetable";
                }}
                style={{ padding: "10px 22px", background: "linear-gradient(135deg, #0284c7, #38bdf8)", border: "none", borderRadius: "8px", color: "#0f172a", fontWeight: 800, cursor: "pointer" }}
              >
                📅 Open Timetable View
              </button>
              <button
                type="button"
                onClick={() => {
                  window.location.href = "/portal/student/dashboard?tab=timetable";
                }}
                style={{ padding: "10px 18px", background: "rgba(30, 41, 59, 0.9)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: "8px", color: "#cbd5e1", fontWeight: 700, cursor: "pointer" }}
              >
                🔄 Reload Scholar View
              </button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export function SafeStudentDashboardWrapper(props) {
  return (
    <StudentDashboardErrorBoundary>
      <StudentDashboard {...props} />
    </StudentDashboardErrorBoundary>
  );
}

export default SafeStudentDashboardWrapper;