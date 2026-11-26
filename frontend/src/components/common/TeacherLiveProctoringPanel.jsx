import React, { useState, useEffect, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import apiClient from "../../api/client/apiClient";
import { printHtmlSafely } from "../../utils/safeWindow";
import { getActiveSchoolName } from "../../utils/schoolBranding";
import { getActiveAuthToken, getAccessToken } from "../../utils/tokenStorage";

const DEFAULT_PROCTOR_ICE_CONFIG = {
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

/**
 * Ultra-fast direct 30 FPS 1.0x WebRTC <video> receiver for each live student camera tile
 * on the Teacher Exam Monitor Wall. Connects automatically with STUN+TURN relay & ICE queueing,
 * and shares its MediaStream with the Fullscreen Watch Modal for 0ms instant zoom.
 */
function LiveStudentWallVideo({
  sessionKey,
  studentName,
  snapshotDataUrl,
  cameraActive,
  iceConfig,
  registerSignalListener,
  onStreamReady
}) {
  const videoRef = useRef(null);
  const [webrtcLive, setWebrtcLive] = useState(false);

  useEffect(() => {
    if (!sessionKey || !cameraActive || typeof RTCPeerConnection !== "function") {
      setWebrtcLive(false);
      return undefined;
    }

    let active = true;
    const viewerId = `wall_${Date.now()}_${Math.floor(Math.random() * 9000 + 1000)}`;
    const processedIds = new Set();
    const pendingIce = [];
    let offerReceived = false;
    let lastSigMs = Date.now() - 2500;

    const pc = new RTCPeerConnection(iceConfig || DEFAULT_PROCTOR_ICE_CONFIG);
    try {
      if (typeof pc.addTransceiver === "function") {
        pc.addTransceiver("video", { direction: "recvonly" });
      }
    } catch { }

    pc.ontrack = (evt) => {
      const stream = evt.streams?.[0] || new MediaStream([evt.track]);
      if (typeof onStreamReady === "function") onStreamReady(sessionKey, stream);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.muted = true;
        videoRef.current.playsInline = true;
        videoRef.current.playbackRate = 1.0;
        videoRef.current.play().catch(() => { });
      }
      if (active) setWebrtcLive(true);
    };

    pc.onicecandidate = (evt) => {
      if (evt.candidate && active) {
        apiClient.post("/ai-exam/proctor/webrtc/signal", {
          sessionKey,
          viewerId,
          senderRole: "TEACHER",
          targetRole: "STUDENT",
          signalType: "ICE_CANDIDATE",
          data: evt.candidate
        }).catch(() => { });
      }
    };

    pc.onconnectionstatechange = () => {
      if (!active) return;
      if (pc.connectionState === "connected") {
        setWebrtcLive(true);
      } else if (["failed", "closed"].includes(pc.connectionState)) {
        setWebrtcLive(false);
      }
    };

    const handleSig = async (sig) => {
      if (!active || !sig?.id || processedIds.has(sig.id)) return;
      if (String(sig.sessionKey) !== String(sessionKey)) return;
      if (String(sig.targetRole || "").toUpperCase() !== "TEACHER") return;
      if (sig.viewerId && String(sig.viewerId) !== viewerId) return;
      processedIds.add(sig.id);
      if (sig.createdAtMs && sig.createdAtMs > lastSigMs) lastSigMs = sig.createdAtMs;

      if (sig.signalType === "OFFER" && sig.data) {
        offerReceived = true;
        try {
          await pc.setRemoteDescription(new RTCSessionDescription(sig.data));
          const queued = pendingIce.splice(0, pendingIce.length);
          for (const cand of queued) {
            try { await pc.addIceCandidate(new RTCIceCandidate(cand)); } catch { }
          }
          const ans = await pc.createAnswer();
          await pc.setLocalDescription(ans);
          await apiClient.post("/ai-exam/proctor/webrtc/signal", {
            sessionKey,
            viewerId,
            senderRole: "TEACHER",
            targetRole: "STUDENT",
            signalType: "ANSWER",
            data: ans
          });
        } catch { }
      } else if (sig.signalType === "ICE_CANDIDATE" && sig.data) {
        if (pc.remoteDescription) {
          try { await pc.addIceCandidate(new RTCIceCandidate(sig.data)); } catch { }
        } else {
          pendingIce.push(sig.data);
        }
      }
    };

    const unregister = typeof registerSignalListener === "function" ? registerSignalListener(viewerId, handleSig) : null;

    const requestStream = () => {
      if (!active) return;
      apiClient.post("/ai-exam/proctor/webrtc/signal", {
        sessionKey,
        viewerId,
        senderRole: "TEACHER",
        targetRole: "STUDENT",
        signalType: "WATCH_REQUEST"
      }).catch(() => { });
    };

    requestStream();
    const retryTimer = setTimeout(() => {
      if (active && !offerReceived) requestStream();
    }, 1100);

    const pollTimer = setInterval(async () => {
      if (!active || pc.connectionState === "connected") return;
      try {
        const res = await apiClient.get("/ai-exam/proctor/webrtc/signals", {
          params: { sessionKey, targetRole: "TEACHER", viewerId, sinceMs: lastSigMs }
        });
        const list = res?.data?.data?.signals || [];
        for (const s of list) {
          await handleSig(s);
        }
      } catch { }
    }, 450);

    return () => {
      active = false;
      clearTimeout(retryTimer);
      clearInterval(pollTimer);
      if (typeof unregister === "function") unregister();
      if (typeof onStreamReady === "function") onStreamReady(sessionKey, null);
      apiClient.post("/ai-exam/proctor/webrtc/signal", {
        sessionKey,
        viewerId,
        senderRole: "TEACHER",
        targetRole: "STUDENT",
        signalType: "WATCH_STOP"
      }).catch(() => { });
      try { pc.close(); } catch { }
    };
  }, [sessionKey, cameraActive, iceConfig, registerSignalListener, onStreamReady]);

  return (
    <>
      <video
        ref={videoRef}
        autoPlay
        muted
        playsInline
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          objectFit: "cover",
          opacity: webrtcLive ? 1 : 0,
          transform: "translateZ(0)",
          willChange: "transform",
          pointerEvents: "none"
        }}
      />
      {!webrtcLive && snapshotDataUrl && (
        <img
          src={snapshotDataUrl}
          alt={`Live camera feed - ${studentName}`}
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
        />
      )}
      {!webrtcLive && !snapshotDataUrl && (
        <div style={{ textAlign: "center", padding: "10px", color: "#94a3b8", fontSize: "0.75rem" }}>
          <div style={{ fontSize: "1.6rem", marginBottom: "4px" }}>🛡️</div>
          <strong>Focus &amp; Tab-Lock Active</strong>
          <div>{cameraActive ? "Connecting 30 FPS live webcam..." : "Camera standby on examinee device"}</div>
        </div>
      )}
      {webrtcLive && (
        <div style={{ position: "absolute", top: "6px", left: "6px", background: "rgba(6, 78, 59, 0.9)", border: "1px solid #34d399", color: "#a7f3d0", fontSize: "0.64rem", fontWeight: 900, padding: "2px 7px", borderRadius: "6px" }}>
          ⚡ 30 FPS LIVE
        </div>
      )}
    </>
  );
}

/**
 * TeacherLiveProctoringPanel
 * Real-time AI Exam Proctoring Wall for Teachers:
 * - Displays active/recent student examination camera snapshots, live movement deltas, warnings & lost marks deducted
 * - Lets teachers send instructions or official warnings by student name search, selected camera checkboxes, ALL students, or single camera click
 * - Saves timestamped camera snapshots & violation logs as permanent Reference Evidence for academic integrity audits
 */
export default function TeacherLiveProctoringPanel({
  exams = [],
  roster = [],
  selectedExamId = "",
  onNotice = null
}) {
  const [liveSessions, setLiveSessions] = useState([]);
  const [evidenceList, setEvidenceList] = useState([]);
  const [sentMessagesLog, setSentMessagesLog] = useState([]);
  const [selectedStudentIds, setSelectedStudentIds] = useState([]);
  const [searchStudentQuery, setSearchStudentQuery] = useState("");
  const [targetMode, setTargetMode] = useState("SEARCH"); // 'SEARCH' | 'SELECTED' | 'ALL'
  const [messageText, setMessageText] = useState("");
  const [messageSeverity, setMessageSeverity] = useState("INFO"); // 'INFO' | 'WARNING'
  const [deductMarksInput, setDeductMarksInput] = useState(0);
  const [sendingMsg, setSendingMsg] = useState(false);
  const [savingEvidenceFor, setSavingEvidenceFor] = useState(null);
  const [evidenceSearch, setEvidenceSearch] = useState("");
  const [inspectEvidenceModal, setInspectEvidenceModal] = useState(null);
  const [subView, setSubView] = useState("CAMERAS"); // 'CAMERAS' | 'EVIDENCE' | 'SENT_MESSAGES'
  const [statusFeedback, setStatusFeedback] = useState(null);
  const [activeWatchStudentKey, setActiveWatchStudentKey] = useState(null);
  const [watchModalMsg, setWatchModalMsg] = useState("");
  const [watchModalSeverity, setWatchModalSeverity] = useState("WARNING");
  const [watchModalDeduct, setWatchModalDeduct] = useState(2);
  const [watchWebRtcLive, setWatchWebRtcLive] = useState(false);
  const [watchMeasuredFps, setWatchMeasuredFps] = useState(0);

  const watchRemoteVideoRef = useRef(null);
  const watchRemoteStreamRef = useRef(null);
  const watchPcRef = useRef(null);
  const watchViewerIdRef = useRef("");
  const watchFrameTimestampsRef = useRef([]);
  const watchSignalHandlerRef = useRef(null);
  const activeWatchStudentKeyRef = useRef(null);
  const wallSignalListenersRef = useRef(new Map());
  const wallStreamsRef = useRef(new Map());
  const [proctorIceConfig, setProctorIceConfig] = useState(DEFAULT_PROCTOR_ICE_CONFIG);

  activeWatchStudentKeyRef.current = activeWatchStudentKey;

  useEffect(() => {
    apiClient.get("/video/calls/ice-servers").then((res) => {
      if (res?.data?.data?.iceServers?.length) {
        setProctorIceConfig({ ...DEFAULT_PROCTOR_ICE_CONFIG, ...res.data.data });
      }
    }).catch(() => { });
  }, []);

  const registerWallSignalListener = useCallback((viewerId, handler) => {
    wallSignalListenersRef.current.set(viewerId, handler);
    return () => {
      wallSignalListenersRef.current.delete(viewerId);
    };
  }, []);

  const handleWallStreamReady = useCallback((sessKey, stream) => {
    if (stream) {
      wallStreamsRef.current.set(String(sessKey), stream);
      if (String(activeWatchStudentKeyRef.current || "") === String(sessKey) && watchRemoteVideoRef.current) {
        watchRemoteStreamRef.current = stream;
        watchRemoteVideoRef.current.srcObject = stream;
        watchRemoteVideoRef.current.muted = true;
        watchRemoteVideoRef.current.playsInline = true;
        watchRemoteVideoRef.current.playbackRate = 1.0;
        watchRemoteVideoRef.current.play().catch(() => { });
        setWatchWebRtcLive(true);
      }
    } else {
      wallStreamsRef.current.delete(String(sessKey));
    }
  }, []);

  const activeWatchSession = activeWatchStudentKey
    ? liveSessions.find((s) => String(s.sessionKey || s.studentId) === String(activeWatchStudentKey)) || null
    : null;

  const notify = (msg, type = "success") => {
    setStatusFeedback({ message: msg, type });
    if (typeof onNotice === "function") onNotice({ type, message: msg });
    if (typeof window !== "undefined" && typeof window.showGBSOpenNotice === "function") {
      window.showGBSOpenNotice(msg, type, "LIVE EXAM PROCTORING DESK");
    }
  };

  const sseConnectedRef = useRef(false);

  const fetchLiveOnly = useCallback(async () => {
    try {
      const liveRes = await apiClient
        .get("/ai-exam/proctor/live", { params: selectedExamId ? { examId: selectedExamId } : {} })
        .catch(() => null);
      if (liveRes?.data?.data?.sessions) {
        setLiveSessions(liveRes.data.data.sessions);
      }
    } catch { }
  }, [selectedExamId]);

  const fetchProctoringData = useCallback(async () => {
    try {
      const [liveRes, evRes, msgRes] = await Promise.all([
        apiClient.get("/ai-exam/proctor/live", { params: selectedExamId ? { examId: selectedExamId } : {} }).catch(() => null),
        apiClient.get("/ai-exam/proctor/evidence").catch(() => null),
        apiClient.get("/ai-exam/proctor/messages", { params: { view: "TEACHER" } }).catch(() => null)
      ]);
      if (liveRes?.data?.data?.sessions) {
        setLiveSessions(liveRes.data.data.sessions);
      }
      if (evRes?.data?.data?.evidenceList) {
        setEvidenceList(evRes.data.data.evidenceList);
      }
      if (msgRes?.data?.data?.messages) {
        setSentMessagesLog(msgRes.data.data.messages);
      }
    } catch { }
  }, [selectedExamId]);

  useEffect(() => {
    fetchProctoringData();

    // Real-time SSE Live Proctoring Stream (<20ms push latency as students stream 1.0x camera frames)
    let eventSource = null;
    try {
      if (typeof EventSource !== "undefined") {
        const tok = getActiveAuthToken() || getAccessToken();
        const base = String(apiClient.defaults?.baseURL || "/api/v1").replace(/\/+$/, "");
        const qs = new URLSearchParams();
        if (tok) qs.set("token", tok);
        if (selectedExamId) qs.set("examId", selectedExamId);
        const sseUrl = `${base}/ai-exam/proctor/stream${qs.toString() ? `?${qs.toString()}` : ""}`;
        eventSource = new EventSource(sseUrl);

        eventSource.addEventListener("proctor_snapshot", (evt) => {
          sseConnectedRef.current = true;
          try {
            const d = JSON.parse(evt.data);
            if (Array.isArray(d.sessions)) setLiveSessions(d.sessions);
          } catch { }
        });

        eventSource.addEventListener("proctor_live_frame", (evt) => {
          sseConnectedRef.current = true;
          try {
            const d = JSON.parse(evt.data);
            const nextSess = d?.session;
            if (!nextSess?.sessionKey) return;
            const nowMs = Date.now();
            if (String(nextSess.sessionKey) === String(activeWatchStudentKeyRef.current || "")) {
              const arr = [...watchFrameTimestampsRef.current.filter((t) => nowMs - t <= 2000), nowMs];
              watchFrameTimestampsRef.current = arr;
              setWatchMeasuredFps(Math.max(1, Math.round(arr.length / 2)));
            }
            setLiveSessions((prev) => {
              const idx = prev.findIndex((s) => String(s.sessionKey) === String(nextSess.sessionKey));
              if (idx >= 0) {
                const copy = [...prev];
                copy[idx] = nextSess;
                return copy;
              }
              return [nextSess, ...prev];
            });
          } catch { }
        });

        eventSource.addEventListener("proctor_webrtc_signal", (evt) => {
          try {
            const d = JSON.parse(evt.data);
            if (d?.signal) {
              if (typeof watchSignalHandlerRef.current === "function") {
                watchSignalHandlerRef.current(d.signal);
              }
              wallSignalListenersRef.current.forEach((fn) => {
                try { fn(d.signal); } catch { }
              });
            }
          } catch { }
        });

        eventSource.addEventListener("proctor_message", (evt) => {
          try {
            const d = JSON.parse(evt.data);
            if (d?.message?.id) {
              setSentMessagesLog((prev) =>
                prev.some((m) => m.id === d.message.id) ? prev : [d.message, ...prev]
              );
            }
          } catch { }
        });

        eventSource.onerror = () => {
          sseConnectedRef.current = false;
        };
      }
    } catch { }

    const fastFallbackTimer = setInterval(() => {
      if (!sseConnectedRef.current) {
        fetchLiveOnly();
      }
    }, 350);
    const fullSyncTimer = setInterval(fetchProctoringData, 8000);

    return () => {
      clearInterval(fastFallbackTimer);
      clearInterval(fullSyncTimer);
      sseConnectedRef.current = false;
      if (eventSource) {
        try { eventSource.close(); } catch { }
      }
    };
  }, [fetchProctoringData, fetchLiveOnly, selectedExamId]);

  // Real-time 1.0x WebRTC 30 FPS Live Video Receiver when Teacher opens Enlarged Watch & Student Profile Modal
  useEffect(() => {
    const sessKey = activeWatchStudentKey;
    setWatchMeasuredFps(0);
    watchFrameTimestampsRef.current = [];

    if (!sessKey || typeof RTCPeerConnection !== "function") {
      setWatchWebRtcLive(false);
      watchRemoteStreamRef.current = null;
      watchSignalHandlerRef.current = null;
      return;
    }

    // 0ms instant zoom: reuse the already-live 30 FPS WebRTC MediaStream from the Teacher Wall card!
    const existingWallStream = wallStreamsRef.current.get(String(sessKey));
    if (existingWallStream && existingWallStream.getVideoTracks().some((t) => t.readyState === "live")) {
      watchRemoteStreamRef.current = existingWallStream;
      if (watchRemoteVideoRef.current) {
        watchRemoteVideoRef.current.srcObject = existingWallStream;
        watchRemoteVideoRef.current.muted = true;
        watchRemoteVideoRef.current.playsInline = true;
        watchRemoteVideoRef.current.playbackRate = 1.0;
        watchRemoteVideoRef.current.play().catch(() => { });
      }
      setWatchWebRtcLive(true);
      return;
    }

    setWatchWebRtcLive(false);
    watchRemoteStreamRef.current = null;

    let active = true;
    const viewerId = `invig_${Date.now()}_${Math.floor(Math.random() * 900 + 100)}`;
    watchViewerIdRef.current = viewerId;
    const processedSigIds = new Set();
    const pendingIce = [];
    let offerReceived = false;
    let lastSigMs = Date.now() - 3000;

    const pc = new RTCPeerConnection(proctorIceConfig || DEFAULT_PROCTOR_ICE_CONFIG);
    watchPcRef.current = pc;

    try {
      if (typeof pc.addTransceiver === "function") {
        pc.addTransceiver("video", { direction: "recvonly" });
      }
    } catch { }

    pc.ontrack = (evt) => {
      const stream = evt.streams?.[0] || new MediaStream([evt.track]);
      watchRemoteStreamRef.current = stream;
      if (watchRemoteVideoRef.current) {
        watchRemoteVideoRef.current.srcObject = stream;
        watchRemoteVideoRef.current.muted = true;
        watchRemoteVideoRef.current.playsInline = true;
        watchRemoteVideoRef.current.playbackRate = 1.0;
        watchRemoteVideoRef.current.play().catch(() => { });
      }
      if (active) setWatchWebRtcLive(true);
    };

    pc.onicecandidate = (evt) => {
      if (evt.candidate && active) {
        apiClient.post("/ai-exam/proctor/webrtc/signal", {
          sessionKey: sessKey,
          viewerId,
          senderRole: "TEACHER",
          targetRole: "STUDENT",
          signalType: "ICE_CANDIDATE",
          data: evt.candidate
        }).catch(() => { });
      }
    };

    pc.onconnectionstatechange = () => {
      if (!active) return;
      if (pc.connectionState === "connected") {
        setWatchWebRtcLive(true);
      } else if (["failed", "disconnected", "closed"].includes(pc.connectionState)) {
        setWatchWebRtcLive(false);
      }
    };

    const handleIncomingSignal = async (sig) => {
      if (!active || !sig?.id || processedSigIds.has(sig.id)) return;
      if (String(sig.sessionKey) !== String(sessKey)) return;
      if (String(sig.targetRole || "").toUpperCase() !== "TEACHER") return;
      if (sig.viewerId && String(sig.viewerId) !== viewerId) return;
      processedSigIds.add(sig.id);
      if (sig.createdAtMs && sig.createdAtMs > lastSigMs) lastSigMs = sig.createdAtMs;

      if (sig.signalType === "OFFER" && sig.data) {
        offerReceived = true;
        try {
          await pc.setRemoteDescription(new RTCSessionDescription(sig.data));
          const queued = pendingIce.splice(0, pendingIce.length);
          for (const cand of queued) {
            try { await pc.addIceCandidate(new RTCIceCandidate(cand)); } catch { }
          }
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          await apiClient.post("/ai-exam/proctor/webrtc/signal", {
            sessionKey: sessKey,
            viewerId,
            senderRole: "TEACHER",
            targetRole: "STUDENT",
            signalType: "ANSWER",
            data: answer
          });
        } catch { }
      } else if (sig.signalType === "ICE_CANDIDATE" && sig.data) {
        if (pc.remoteDescription) {
          try {
            await pc.addIceCandidate(new RTCIceCandidate(sig.data));
          } catch { }
        } else {
          pendingIce.push(sig.data);
        }
      }
    };

    watchSignalHandlerRef.current = handleIncomingSignal;

    const sendWatchRequest = () => {
      if (!active) return;
      apiClient.post("/ai-exam/proctor/webrtc/signal", {
        sessionKey: sessKey,
        viewerId,
        senderRole: "TEACHER",
        targetRole: "STUDENT",
        signalType: "WATCH_REQUEST"
      }).catch(() => { });
    };

    sendWatchRequest();
    const retryWatchTimer = setTimeout(() => {
      if (active && !offerReceived) sendWatchRequest();
    }, 1400);

    const sigPollTimer = setInterval(async () => {
      if (!active) return;
      try {
        const res = await apiClient.get("/ai-exam/proctor/webrtc/signals", {
          params: { sessionKey: sessKey, targetRole: "TEACHER", viewerId, sinceMs: lastSigMs }
        });
        const list = res?.data?.data?.signals || [];
        for (const s of list) {
          await handleIncomingSignal(s);
        }
      } catch { }
    }, 550);

    return () => {
      active = false;
      clearTimeout(retryWatchTimer);
      clearInterval(sigPollTimer);
      watchSignalHandlerRef.current = null;
      apiClient.post("/ai-exam/proctor/webrtc/signal", {
        sessionKey: sessKey,
        viewerId,
        senderRole: "TEACHER",
        targetRole: "STUDENT",
        signalType: "WATCH_STOP"
      }).catch(() => { });
      try { pc.close(); } catch { }
      watchPcRef.current = null;
      watchRemoteStreamRef.current = null;
    };
  }, [activeWatchStudentKey]);

  // Combined search suggestions across live cameras + class roster
  const searchCandidateMatches = (() => {
    const q = searchStudentQuery.trim().toLowerCase();
    if (!q) return [];
    const seen = new Set();
    const hits = [];
    liveSessions.forEach((s) => {
      const hay = `${s.studentName || ""} ${s.studentEmail || ""} ${s.studentId || ""} ${s.studentIndexNumber || ""} ${s.className || ""}`.toLowerCase();
      if (hay.includes(q)) {
        const key = String(s.studentId || s.studentName);
        if (!seen.has(key)) {
          seen.add(key);
          hits.push({
            studentId: String(s.studentId),
            name: s.studentName,
            email: s.studentEmail || "",
            indexNumber: s.studentIndexNumber || "",
            className: s.className || "",
            onCamera: true
          });
        }
      }
    });
    (roster || []).forEach((r) => {
      const fullName = `${r.firstName || ""} ${r.lastName || ""}`.trim();
      const hay = `${fullName} ${r.email || ""} ${r.id || ""} ${r.admissionNumber || ""} ${r.currentClass || ""}`.toLowerCase();
      if (hay.includes(q)) {
        const key = String(r.id || fullName);
        if (!seen.has(key)) {
          seen.add(key);
          hits.push({
            studentId: String(r.id),
            name: fullName || r.email,
            email: r.email || "",
            indexNumber: r.admissionNumber || r.studentId || "",
            className: r.currentClass || "",
            onCamera: false
          });
        }
      }
    });
    return hits.slice(0, 8);
  })();

  const toggleSelectCamera = (studentId) => {
    const sid = String(studentId);
    setSelectedStudentIds((prev) =>
      prev.includes(sid) ? prev.filter((id) => id !== sid) : [...prev, sid]
    );
  };

  const handleSelectAllCameras = () => {
    if (selectedStudentIds.length === liveSessions.length && liveSessions.length > 0) {
      setSelectedStudentIds([]);
    } else {
      setSelectedStudentIds(liveSessions.map((s) => String(s.studentId)));
    }
  };

  const handleDispatchMessage = async ({
    overrideMode = null,
    overrideStudentIds = null,
    overrideQuery = null,
    overrideText = null,
    overrideSeverity = null,
    overrideDeduct = null
  } = {}) => {
    const mode = overrideMode || targetMode;
    const text = (overrideText ?? messageText).trim();
    const sev = overrideSeverity || messageSeverity;
    const deduct = Number(overrideDeduct ?? (sev === "WARNING" ? deductMarksInput : 0)) || 0;

    if (!text) {
      notify("Enter the information or warning message to send to students.", "warning");
      return;
    }
    if (mode === "SELECTED" && !(overrideStudentIds || selectedStudentIds).length) {
      notify("Select one or more student camera cards (or switch to Search Name / ALL).", "warning");
      return;
    }
    if (mode === "SEARCH" && !(overrideQuery ?? searchStudentQuery).trim()) {
      notify("Enter a student name in the search field to locate and message that student.", "warning");
      return;
    }

    setSendingMsg(true);
    try {
      const res = await apiClient.post("/ai-exam/proctor/message", {
        examId: selectedExamId || (exams[0]?.id || ""),
        targetMode: mode,
        recipientStudentIds: overrideStudentIds || selectedStudentIds,
        recipientQuery: overrideQuery ?? searchStudentQuery.trim(),
        message: text,
        severity: sev,
        deductMarks: deduct
      });
      const summary = res?.data?.data?.proctorMessage?.targetSummary || mode;
      notify(
        `✅ Message sent to ${summary}${deduct > 0 ? ` (Warning logged • -${deduct} Marks subtracted)` : ""}`,
        "success"
      );
      if (!overrideText) setMessageText("");
      await fetchProctoringData();
    } catch (err) {
      notify(err?.response?.data?.message || "Failed to send proctoring message.", "error");
    } finally {
      setSendingMsg(false);
    }
  };

  const handleSaveEvidenceSnapshot = async (session, customNote = "") => {
    setSavingEvidenceFor(String(session.studentId));
    try {
      const res = await apiClient.post("/ai-exam/proctor/save-evidence", {
        examId: session.examId,
        examTitle: session.examTitle,
        studentId: session.studentId,
        studentIndexNumber: session.studentIndexNumber || session.studentId,
        className: session.className || "Enrolled Class",
        studentName: session.studentName,
        studentEmail: session.studentEmail,
        snapshotDataUrl: session.snapshotDataUrl,
        movementStatus: session.movementStatus || session.status,
        warningsCount: session.warningsCount || 0,
        penaltyMarksDeducted: session.penaltyMarksDeducted || 0,
        events: session.events || [],
        teacherNote: customNote || `Saved live camera snapshot & movement evidence for ${session.studentName} (${session.warningsCount || 0} warning(s), -${session.penaltyMarksDeducted || 0} Marks).`
      });
      if (res?.data?.data?.evidence) {
        notify(`📸 Reference evidence permanently saved for ${session.studentName}!`, "success");
        await fetchProctoringData();
      }
    } catch {
      notify("Could not save proctoring evidence right now.", "error");
    } finally {
      setSavingEvidenceFor(null);
    }
  };

  const handleDeleteEvidence = async (id) => {
    try {
      await apiClient.delete(`/ai-exam/proctor/evidence/${encodeURIComponent(id)}`);
      notify("Proctoring evidence entry removed from archive.", "info");
      await fetchProctoringData();
    } catch { }
  };

  const handlePrintEvidenceReport = (ev) => {
    const school = getActiveSchoolName() || "GBS School Management System";
    const eventsRows = (ev.events || [])
      .map((item, idx) => `<tr><td>${idx + 1}</td><td>${item.time || item.timeIso || "Recorded"}</td><td>${item.reason || "Violation"}</td></tr>`)
      .join("");
    printHtmlSafely(`
      <html>
        <head><title>Proctoring Evidence Reference - ${ev.studentName}</title>
          <style>
            body { font-family: Georgia, serif; padding: 28px; color: #081833; }
            .hdr { border-bottom: 3px solid #d4af37; padding-bottom: 12px; margin-bottom: 18px; display: flex; justify-content: space-between; align-items: center; }
            .snap { max-width: 340px; border: 2px solid #081833; border-radius: 8px; margin: 12px 0; }
            table { width: 100%; border-collapse: collapse; margin-top: 12px; }
            th, td { border: 1px solid #cbd5e1; padding: 8px; font-size: 13px; text-align: left; }
            th { background: #081833; color: #f6dd84; }
          </style>
        </head>
        <body>
          <div class="hdr">
            <div>
              <h2 style="margin:0;">${school}</h2>
              <div>OFFICIAL AI EXAMINATION PROCTORING EVIDENCE REFERENCE</div>
            </div>
            <div>Evidence ID: <strong>${ev.id}</strong></div>
          </div>
          <p><strong>Student Name:</strong> ${ev.studentName} (${ev.studentEmail || ev.studentId})</p>
          <p><strong>Examination:</strong> ${ev.examTitle}</p>
          <p><strong>Recorded Warnings:</strong> ${ev.warningsCount} &nbsp;|&nbsp; <strong>Exact Lost Marks Subtracted:</strong> -${ev.penaltyMarksDeducted} Marks</p>
          <p><strong>Teacher / Invigilator Note:</strong> ${ev.teacherNote || "Captured during live online exam."}</p>
          ${ev.snapshotDataUrl ? `<div><strong>Captured Webcam Snapshot:</strong><br/><img class="snap" src="${ev.snapshotDataUrl}" /></div>` : "<p><em>No webcam frame attached (focus/tab monitoring mode).</em></p>"}
          <table>
            <thead><tr><th>#</th><th>Timestamp</th><th>Detected Activity / Reason</th></tr></thead>
            <tbody>${eventsRows || '<tr><td colspan="3">Session snapshot archived cleanly.</td></tr>'}</tbody>
          </table>
          <p style="margin-top:20px;font-size:12px;color:#475569;">Archived By: ${ev.savedBy} at ${new Date(ev.savedAt).toLocaleString()}</p>
        </body>
      </html>
    `);
  };

  const filteredEvidence = evidenceList.filter((ev) => {
    const q = evidenceSearch.trim().toLowerCase();
    if (!q) return true;
    return `${ev.studentName || ""} ${ev.studentEmail || ""} ${ev.examTitle || ""}`.toLowerCase().includes(q);
  });

  return (
    <div style={{
      background: "linear-gradient(145deg, rgba(8, 24, 51, 0.96) 0%, rgba(13, 34, 71, 0.96) 100%)",
      border: "1.5px solid rgba(212, 175, 55, 0.65)",
      borderRadius: "14px",
      padding: "16px",
      marginBottom: "1.35rem",
      color: "#f8fafc"
    }}>
      {/* Header Row */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px", borderBottom: "1px solid rgba(212, 175, 55, 0.35)", paddingBottom: "12px", marginBottom: "14px" }}>
        <div>
          <h3 style={{ margin: 0, color: "#f6dd84", fontSize: "1.02rem", fontWeight: 900, display: "flex", alignItems: "center", gap: "8px" }}>
            <span>📹</span> LIVE AI EXAM PROCTORING CAMERAS, STUDENT MESSAGING &amp; EVIDENCE VAULT
          </h3>
          <p style={{ margin: "3px 0 0", fontSize: "0.78rem", color: "#cbd5e1" }}>
            Monitor student head movements live across displayed cameras, message students by name search, selected cameras, or ALL examinees, deduct exact lost marks, and archive timestamped evidence.
          </p>
        </div>
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
          {[
            { id: "CAMERAS", label: `📹 Live Cameras (${liveSessions.length})` },
            { id: "EVIDENCE", label: `🗂️ Saved Evidence Vault (${evidenceList.length})` },
            { id: "SENT_MESSAGES", label: `📨 Sent Messages (${sentMessagesLog.length})` }
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setSubView(tab.id)}
              style={{
                background: subView === tab.id ? "linear-gradient(135deg, #f6dd84, #cfa028)" : "rgba(13, 34, 71, 0.85)",
                color: subView === tab.id ? "#081833" : "#f6dd84",
                border: "1.5px solid #d4af37",
                borderRadius: "8px",
                padding: "6px 12px",
                fontSize: "0.76rem",
                fontWeight: 800,
                cursor: "pointer"
              }}
            >
              {tab.label}
            </button>
          ))}
          <button
            type="button"
            onClick={fetchProctoringData}
            style={{ background: "rgba(16, 185, 129, 0.2)", border: "1px solid #10b981", color: "#6ee7b7", borderRadius: "8px", padding: "6px 12px", fontSize: "0.76rem", fontWeight: 800, cursor: "pointer" }}
          >
            🔄 Refresh Live Feed
          </button>
        </div>
      </div>

      {statusFeedback && (
        <div style={{
          marginBottom: "12px",
          padding: "10px 14px",
          borderRadius: "8px",
          background: statusFeedback.type === "error" ? "rgba(239, 68, 68, 0.2)" : statusFeedback.type === "warning" ? "rgba(245, 158, 11, 0.2)" : "rgba(16, 185, 129, 0.2)",
          border: `1.5px solid ${statusFeedback.type === "error" ? "#ef4444" : statusFeedback.type === "warning" ? "#f59e0b" : "#10b981"}`,
          color: "#f8fafc",
          fontSize: "0.82rem",
          fontWeight: 700
        }}>
          {statusFeedback.message}
        </div>
      )}

      {/* Teacher Broadcast & Student-Search Messaging Control Bar */}
      <div style={{
        background: "rgba(5, 15, 35, 0.72)",
        border: "1px solid rgba(212, 175, 55, 0.42)",
        borderRadius: "10px",
        padding: "12px 14px",
        marginBottom: "14px"
      }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "10px", marginBottom: "10px" }}>
          {/* Target Audience Mode */}
          <div>
            <label style={{ display: "block", fontSize: "0.72rem", color: "#f6dd84", fontWeight: 800, marginBottom: "4px" }}>
              🎯 TARGET RECIPIENTS
            </label>
            <select
              className="filter-select"
              style={{ width: "100%" }}
              value={targetMode}
              onChange={(e) => setTargetMode(e.target.value)}
            >
              <option value="SEARCH">🔍 Specific Student by Name Search</option>
              <option value="SELECTED">☑️ Selected Camera Feeds ({selectedStudentIds.length})</option>
              <option value="ALL">📢 ALL Students Writing Exam ({liveSessions.length} cameras)</option>
            </select>
          </div>

          {/* Search Student Name Input (always visible for quick targeting) */}
          <div style={{ position: "relative" }}>
            <label style={{ display: "block", fontSize: "0.72rem", color: "#f6dd84", fontWeight: 800, marginBottom: "4px" }}>
              🔍 ENTER STUDENT NAME TO SEARCH
            </label>
            <input
              type="text"
              className="filter-input"
              style={{ width: "100%" }}
              placeholder="Type student name (e.g. Kwesi, Abigail)..."
              value={searchStudentQuery}
              onChange={(e) => {
                setSearchStudentQuery(e.target.value);
                if (e.target.value.trim()) setTargetMode("SEARCH");
              }}
            />
            {searchCandidateMatches.length > 0 && targetMode === "SEARCH" && (
              <div style={{
                position: "absolute",
                top: "100%",
                left: 0,
                right: 0,
                zIndex: 50,
                background: "#081833",
                border: "1.5px solid #d4af37",
                borderRadius: "8px",
                marginTop: "4px",
                maxHeight: "160px",
                overflowY: "auto"
              }}>
                {searchCandidateMatches.map((cand) => (
                  <button
                    key={cand.studentId}
                    type="button"
                    onClick={() => {
                      setSearchStudentQuery(cand.name);
                      setSelectedStudentIds((prev) => (prev.includes(cand.studentId) ? prev : [...prev, cand.studentId]));
                    }}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      width: "100%",
                      padding: "7px 10px",
                      background: "transparent",
                      border: "none",
                      borderBottom: "1px solid rgba(255,255,255,0.08)",
                      color: "#f8fafc",
                      fontSize: "0.78rem",
                      cursor: "pointer",
                      textAlign: "left"
                    }}
                  >
                    <span><strong>{cand.name}</strong> {cand.email ? `(${cand.email})` : ""}</span>
                    <span style={{ color: cand.onCamera ? "#34d399" : "#94a3b8", fontSize: "0.7rem", fontWeight: 800 }}>
                      {cand.onCamera ? "📹 On Camera" : "Roster"}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Severity & Exact Marks Deduction */}
          <div style={{ display: "flex", gap: "8px" }}>
            <div style={{ flex: 1 }}>
              <label style={{ display: "block", fontSize: "0.72rem", color: "#f6dd84", fontWeight: 800, marginBottom: "4px" }}>
                ⚡ MESSAGE TYPE
              </label>
              <select
                className="filter-select"
                style={{ width: "100%" }}
                value={messageSeverity}
                onChange={(e) => setMessageSeverity(e.target.value)}
              >
                <option value="INFO">ℹ️ Exam Information / Guidance</option>
                <option value="WARNING">⚠️ Official Proctoring Warning</option>
              </select>
            </div>
            {messageSeverity === "WARNING" && (
              <div style={{ width: "120px" }}>
                <label style={{ display: "block", fontSize: "0.72rem", color: "#fca5a5", fontWeight: 800, marginBottom: "4px" }}>
                  DEDUCT MARKS
                </label>
                <input
                  type="number"
                  min="0"
                  max="50"
                  className="filter-input"
                  style={{ width: "100%" }}
                  value={deductMarksInput}
                  onChange={(e) => setDeductMarksInput(Number(e.target.value) || 0)}
                />
              </div>
            )}
          </div>
        </div>

        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "center" }}>
          <input
            type="text"
            className="filter-input"
            style={{ flex: 1, minWidth: "260px" }}
            placeholder="Write exam instruction, time reminder, or direct movement warning..."
            value={messageText}
            onChange={(e) => setMessageText(e.target.value)}
          />
          <button
            type="button"
            disabled={sendingMsg}
            onClick={() => handleDispatchMessage()}
            className="btn-primary"
            style={{ padding: "8px 16px", fontSize: "0.8rem" }}
          >
            {sendingMsg ? "Sending..." : targetMode === "ALL" ? "📢 Send to ALL Students" : targetMode === "SELECTED" ? `☑️ Send to Selected (${selectedStudentIds.length})` : "🔍 Send to Student"}
          </button>
          <button
            type="button"
            disabled={sendingMsg}
            onClick={() => handleDispatchMessage({ overrideMode: "ALL" })}
            style={{ background: "rgba(13, 34, 71, 0.9)", border: "1.5px solid #d4af37", color: "#f6dd84", borderRadius: "8px", padding: "8px 12px", fontSize: "0.76rem", fontWeight: 800, cursor: "pointer" }}
          >
            📣 Quick Broadcast ALL
          </button>
        </div>
      </div>

      {/* SUBVIEW 1: LIVE DISPLAYED CAMERAS WALL */}
      {subView === "CAMERAS" && (
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px", flexWrap: "wrap", gap: "8px" }}>
            <span style={{ fontSize: "0.82rem", color: "#cbd5e1", fontWeight: 700 }}>
              Active / Recent Examinee Live Feeds (1s Live Sync): <strong style={{ color: "#f6dd84" }}>{liveSessions.length}</strong>
              {selectedStudentIds.length > 0 && ` • Checked for messaging: ${selectedStudentIds.length}`}
            </span>
            {liveSessions.length > 0 && (
              <button
                type="button"
                onClick={handleSelectAllCameras}
                style={{ background: "rgba(212, 175, 55, 0.16)", border: "1px solid #d4af37", color: "#f6dd84", borderRadius: "6px", padding: "4px 10px", fontSize: "0.74rem", fontWeight: 700, cursor: "pointer" }}
              >
                {selectedStudentIds.length === liveSessions.length ? "☐ Deselect All Cameras" : "☑️ Select All Cameras"}
              </button>
            )}
          </div>

          {liveSessions.length === 0 ? (
            <div style={{ padding: "1.5rem", textAlign: "center", borderRadius: "10px", border: "1px dashed rgba(212, 175, 55, 0.45)", background: "rgba(5, 15, 35, 0.55)", color: "#cbd5e1", fontSize: "0.84rem" }}>
              No students are currently live in an online AI-proctored examination. As soon as students click <strong>Start Exam</strong> on their portal, their live video feed, student Index ID, class, warnings, and score deductions appear here continuously.
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(305px, 1fr))", gap: "12px" }}>
              {liveSessions.map((sess) => {
                const isSelected = selectedStudentIds.includes(String(sess.studentId));
                const hasWarn = (sess.warningsCount || 0) > 0 || sess.status === "WARNING_DETECTED";
                const isSaving = savingEvidenceFor === String(sess.studentId);
                const sessKey = String(sess.sessionKey || sess.studentId);
                return (
                  <div
                    key={sessKey}
                    style={{
                      background: "rgba(5, 15, 35, 0.9)",
                      border: isSelected ? "2px solid #f6dd84" : hasWarn ? "1.5px solid #ef4444" : "1.5px solid rgba(212, 175, 55, 0.48)",
                      borderRadius: "12px",
                      padding: "12px",
                      display: "flex",
                      flexDirection: "column",
                      gap: "8px"
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "6px" }}>
                      <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                        <label style={{ display: "flex", alignItems: "center", gap: "6px", cursor: "pointer", fontWeight: 800, fontSize: "0.88rem", color: "#f8fafc" }}>
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleSelectCamera(sess.studentId)}
                          />
                          <span>{sess.studentName}</span>
                        </label>
                        <div style={{ fontSize: "0.7rem", color: "#f6dd84", fontWeight: 700, paddingLeft: "20px" }}>
                          ID: {sess.studentIndexNumber || sess.studentId || "STU"} • Class: {sess.className || "Enrolled Class"}
                        </div>
                      </div>
                      <span style={{
                        fontSize: "0.68rem",
                        fontWeight: 800,
                        padding: "2px 7px",
                        borderRadius: "999px",
                        background: hasWarn ? "rgba(239, 68, 68, 0.25)" : "rgba(16, 185, 129, 0.22)",
                        color: hasWarn ? "#fca5a5" : "#6ee7b7",
                        border: `1px solid ${hasWarn ? "#ef4444" : "#10b981"}`
                      }}>
                        {sess.status === "SUBMITTED" ? "✅ SUBMITTED" : hasWarn ? `⚠️ ${sess.warningsCount} WARN` : "🔴 LIVE VIDEO"}
                      </span>
                    </div>

                    {/* Real Live Video Feed Snapshot (click to open Enlarged Profile & Watch Modal) */}
                    <div
                      role="button"
                      tabIndex={0}
                      onClick={() => setActiveWatchStudentKey(sessKey)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          setActiveWatchStudentKey(sessKey);
                        }
                      }}
                      style={{ position: "relative", width: "100%", height: "175px", borderRadius: "8px", overflow: "hidden", background: "#020617", border: "1px solid rgba(212, 175, 55, 0.32)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}
                    >
                      {sess.cameraActive && sess.status !== "SUBMITTED" ? (
                        <LiveStudentWallVideo
                          sessionKey={sessKey}
                          studentName={sess.studentName}
                          snapshotDataUrl={sess.snapshotDataUrl}
                          cameraActive={Boolean(sess.cameraActive)}
                          iceConfig={proctorIceConfig}
                          registerSignalListener={registerWallSignalListener}
                          onStreamReady={handleWallStreamReady}
                        />
                      ) : sess.snapshotDataUrl ? (
                        <img
                          src={sess.snapshotDataUrl}
                          alt={`Live camera feed - ${sess.studentName}`}
                          style={{ width: "100%", height: "100%", objectFit: "cover" }}
                        />
                      ) : (
                        <div style={{ textAlign: "center", padding: "10px", color: "#94a3b8", fontSize: "0.75rem" }}>
                          <div style={{ fontSize: "1.6rem", marginBottom: "4px" }}>🛡️</div>
                          <strong>Focus &amp; Tab-Lock Active</strong>
                          <div>{sess.cameraActive ? "Streaming live webcam..." : "Camera standby on examinee device"}</div>
                        </div>
                      )}
                      <div style={{ position: "absolute", top: "6px", right: "6px", background: "rgba(8, 24, 51, 0.85)", border: "1px solid #d4af37", color: "#f6dd84", fontSize: "0.66rem", fontWeight: 800, padding: "2px 7px", borderRadius: "6px" }}>
                        👁️ Click to Watch Fullscreen
                      </div>
                      <div style={{ position: "absolute", bottom: "4px", left: "6px", right: "6px", background: "rgba(2,6,23,0.84)", borderRadius: "5px", padding: "3px 6px", fontSize: "0.68rem", display: "flex", justifyContent: "space-between", color: "#e2e8f0" }}>
                        <span>{sess.examTitle || "Active Exam"}</span>
                        <span>{sess.lastHeartbeatAt ? new Date(sess.lastHeartbeatAt).toLocaleTimeString() : ""}</span>
                      </div>
                    </div>

                    {/* Movement & Penalty Readout */}
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem", background: "rgba(13, 34, 71, 0.7)", padding: "6px 8px", borderRadius: "6px" }}>
                      <span style={{ color: "#cbd5e1" }}>
                        Warnings: <strong style={{ color: hasWarn ? "#fca5a5" : "#34d399" }}>{sess.warningsCount || 0}</strong>
                      </span>
                      <span style={{ color: "#fca5a5", fontWeight: 800 }}>
                        Lost Marks: -{sess.penaltyMarksDeducted || 0}
                      </span>
                    </div>

                    {sess.latestReason && (
                      <div style={{ fontSize: "0.72rem", color: hasWarn ? "#fca5a5" : "#94a3b8", lineHeight: 1.35 }}>
                        Latest: {sess.latestReason}
                      </div>
                    )}

                    {/* Per-Camera Actions */}
                    <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginTop: "auto" }}>
                      <button
                        type="button"
                        onClick={() => setActiveWatchStudentKey(sessKey)}
                        style={{ flex: 1, background: "linear-gradient(135deg, #0d2247, #1a3a70)", border: "1.5px solid #d4af37", color: "#f6dd84", borderRadius: "6px", padding: "5px 8px", fontSize: "0.72rem", fontWeight: 800, cursor: "pointer" }}
                      >
                        👁️ Watch &amp; Profile
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const txt = messageText.trim() || "Please keep your eyes strictly on your exam screen.";
                          handleDispatchMessage({
                            overrideMode: "SINGLE",
                            overrideStudentIds: [String(sess.studentId)],
                            overrideText: txt,
                            overrideSeverity: "INFO",
                            overrideDeduct: 0
                          });
                        }}
                        style={{ background: "rgba(13, 34, 71, 0.9)", border: "1px solid #d4af37", color: "#f6dd84", borderRadius: "6px", padding: "5px 8px", fontSize: "0.72rem", fontWeight: 800, cursor: "pointer" }}
                      >
                        💬 Msg
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDispatchMessage({
                          overrideMode: "SINGLE",
                          overrideStudentIds: [String(sess.studentId)],
                          overrideText: messageText.trim() || "Suspicious movement detected by invigilator. 2 marks deducted.",
                          overrideSeverity: "WARNING",
                          overrideDeduct: 2
                        })}
                        style={{ background: "rgba(239, 68, 68, 0.2)", border: "1px solid #ef4444", color: "#fca5a5", borderRadius: "6px", padding: "5px 8px", fontSize: "0.72rem", fontWeight: 800, cursor: "pointer" }}
                      >
                        ⚠️ Warn (-2)
                      </button>
                      <button
                        type="button"
                        disabled={isSaving}
                        onClick={() => handleSaveEvidenceSnapshot(sess)}
                        style={{ background: "linear-gradient(135deg, #f6dd84, #cfa028)", border: "1px solid #d4af37", color: "#081833", borderRadius: "6px", padding: "5px 8px", fontSize: "0.72rem", fontWeight: 800, cursor: "pointer" }}
                      >
                        {isSaving ? "Saving..." : "📸 Evidence"}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* SUBVIEW 2: SAVED EVIDENCE REFERENCE VAULT */}
      {subView === "EVIDENCE" && (
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "10px", marginBottom: "10px", flexWrap: "wrap" }}>
            <input
              type="text"
              className="filter-input"
              style={{ maxWidth: "320px", width: "100%" }}
              placeholder="Filter evidence by student or exam..."
              value={evidenceSearch}
              onChange={(e) => setEvidenceSearch(e.target.value)}
            />
            <span style={{ fontSize: "0.78rem", color: "#cbd5e1" }}>
              Permanent Evidence Records: <strong style={{ color: "#f6dd84" }}>{filteredEvidence.length}</strong>
            </span>
          </div>

          {filteredEvidence.length === 0 ? (
            <div style={{ padding: "1.4rem", textAlign: "center", borderRadius: "10px", border: "1px dashed rgba(212, 175, 55, 0.45)", color: "#cbd5e1", fontSize: "0.84rem" }}>
              No proctoring evidence snapshots archived yet. Click <strong>📸 Save Evidence</strong> on any student&apos;s camera card or wait for flagged exam submissions to archive automatically.
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(290px, 1fr))", gap: "12px" }}>
              {filteredEvidence.map((ev) => (
                <div key={ev.id} style={{ background: "rgba(5, 15, 35, 0.88)", border: "1px solid rgba(212, 175, 55, 0.45)", borderRadius: "10px", padding: "12px", display: "flex", flexDirection: "column", gap: "8px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <strong style={{ color: "#f6dd84", fontSize: "0.86rem" }}>{ev.studentName}</strong>
                    <span style={{ fontSize: "0.7rem", color: "#fca5a5", fontWeight: 800 }}>-{ev.penaltyMarksDeducted} Marks ({ev.warningsCount} Warn)</span>
                  </div>
                  {ev.snapshotDataUrl && (
                    <img
                      src={ev.snapshotDataUrl}
                      alt={`Evidence - ${ev.studentName}`}
                      style={{ width: "100%", height: "120px", objectFit: "cover", borderRadius: "6px", border: "1px solid rgba(255,255,255,0.18)" }}
                    />
                  )}
                  <div style={{ fontSize: "0.74rem", color: "#cbd5e1" }}>{ev.examTitle}</div>
                  <div style={{ fontSize: "0.72rem", color: "#94a3b8" }}>{ev.teacherNote}</div>
                  <div style={{ fontSize: "0.68rem", color: "#64748b" }}>Saved: {new Date(ev.savedAt).toLocaleString()}</div>
                  <div style={{ display: "flex", gap: "6px", marginTop: "auto" }}>
                    <button
                      type="button"
                      onClick={() => setInspectEvidenceModal(ev)}
                      style={{ flex: 1, background: "rgba(56, 189, 248, 0.18)", border: "1px solid #38bdf8", color: "#bae6fd", borderRadius: "6px", padding: "5px 8px", fontSize: "0.72rem", fontWeight: 800, cursor: "pointer" }}
                    >
                      👁️ View Full Log
                    </button>
                    <button
                      type="button"
                      onClick={() => handlePrintEvidenceReport(ev)}
                      style={{ background: "rgba(212, 175, 55, 0.2)", border: "1px solid #d4af37", color: "#f6dd84", borderRadius: "6px", padding: "5px 8px", fontSize: "0.72rem", fontWeight: 800, cursor: "pointer" }}
                    >
                      🖨️ Print
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteEvidence(ev.id)}
                      style={{ background: "rgba(239, 68, 68, 0.18)", border: "1px solid #ef4444", color: "#fca5a5", borderRadius: "6px", padding: "5px 8px", fontSize: "0.72rem", fontWeight: 800, cursor: "pointer" }}
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* SUBVIEW 3: DISPATCHED PROCTOR MESSAGES HISTORY */}
      {subView === "SENT_MESSAGES" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "8px", maxHeight: "280px", overflowY: "auto" }}>
          {sentMessagesLog.length === 0 ? (
            <div style={{ padding: "1.2rem", textAlign: "center", color: "#94a3b8", fontSize: "0.82rem" }}>
              No proctoring instructions or warnings sent yet.
            </div>
          ) : (
            sentMessagesLog.map((m) => (
              <div key={m.id} style={{ background: "rgba(5, 15, 35, 0.85)", border: `1px solid ${m.severity === "WARNING" ? "#ef4444" : "rgba(56, 189, 248, 0.4)"}`, borderRadius: "8px", padding: "10px 12px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.74rem", marginBottom: "4px" }}>
                  <strong style={{ color: m.severity === "WARNING" ? "#fca5a5" : "#f6dd84" }}>
                    [{m.targetMode}] To: {m.targetSummary} {m.deductMarks > 0 ? `• -${m.deductMarks} Marks` : ""}
                  </strong>
                  <span style={{ color: "#94a3b8" }}>{new Date(m.createdAt).toLocaleString()}</span>
                </div>
                <div style={{ fontSize: "0.82rem", color: "#f8fafc" }}>{m.message}</div>
              </div>
            ))
          )}
        </div>
      )}

      {/* EVIDENCE INSPECTION MODAL (PORTALED TO DOCUMENT.BODY) */}
      {inspectEvidenceModal && typeof document !== "undefined" && document.body && createPortal(
        <div className="invoice-pay-modal-overlay" style={{ zIndex: 999990 }} onClick={() => setInspectEvidenceModal(null)}>
          <div style={{ background: "#081833", border: "2px solid #d4af37", borderRadius: "14px", padding: "20px", maxWidth: "600px", width: "95%", color: "#f8fafc" }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
              <h3 style={{ margin: 0, color: "#f6dd84" }}>🗂️ Evidence Reference: {inspectEvidenceModal.studentName}</h3>
              <button type="button" onClick={() => setInspectEvidenceModal(null)} style={{ background: "none", border: "none", color: "#cbd5e1", fontSize: "1.2rem", cursor: "pointer" }}>✕</button>
            </div>
            {inspectEvidenceModal.snapshotDataUrl && (
              <img src={inspectEvidenceModal.snapshotDataUrl} alt="Saved Webcam Frame" style={{ width: "100%", maxHeight: "260px", objectFit: "contain", borderRadius: "8px", border: "1px solid #d4af37", marginBottom: "10px" }} />
            )}
            <div style={{ fontSize: "0.82rem", marginBottom: "8px" }}>
              <strong>Exam:</strong> {inspectEvidenceModal.examTitle} • <strong>Warnings:</strong> {inspectEvidenceModal.warningsCount} • <strong style={{ color: "#fca5a5" }}>Subtracted Marks: -{inspectEvidenceModal.penaltyMarksDeducted}</strong>
            </div>
            <div style={{ maxHeight: "180px", overflowY: "auto", background: "#050f23", padding: "10px", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.12)" }}>
              {(inspectEvidenceModal.events || []).length === 0 ? (
                <div style={{ color: "#94a3b8", fontSize: "0.78rem" }}>Manual camera snapshot preserved for invigilator audit.</div>
              ) : (
                inspectEvidenceModal.events.map((ev, idx) => (
                  <div key={ev.id || idx} style={{ fontSize: "0.76rem", padding: "4px 0", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                    <strong style={{ color: "#f6dd84" }}>[{ev.time || ev.timeIso}]</strong> {ev.reason}
                  </div>
                ))
              )}
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px", marginTop: "12px" }}>
              <button type="button" onClick={() => handlePrintEvidenceReport(inspectEvidenceModal)} className="btn-primary" style={{ padding: "6px 14px", fontSize: "0.78rem" }}>
                🖨️ Print Evidence Sheet
              </button>
              <button type="button" onClick={() => setInspectEvidenceModal(null)} className="btn-secondary" style={{ padding: "6px 14px", fontSize: "0.78rem" }}>
                Close
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ENLARGED LIVE WATCH & STUDENT PROFILE + DIRECT WARNING MODAL (PORTALED TO DOCUMENT.BODY, 1.0x REAL-TIME VIDEO) */}
      {activeWatchSession && typeof document !== "undefined" && document.body && createPortal(
        <div className="invoice-pay-modal-overlay" style={{ zIndex: 999995 }} onClick={() => setActiveWatchStudentKey(null)}>
          <div
            data-testid="proctor-live-watch-modal"
            style={{
              background: "linear-gradient(145deg, #081833 0%, #0d2247 100%)",
              border: "2px solid #d4af37",
              borderRadius: "16px",
              padding: "22px",
              maxWidth: "800px",
              width: "96%",
              color: "#f8fafc",
              maxHeight: "92vh",
              overflowY: "auto"
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "12px", borderBottom: "1px solid rgba(212, 175, 55, 0.35)", paddingBottom: "12px", marginBottom: "14px" }}>
              <div>
                <div style={{ fontSize: "0.74rem", fontWeight: 800, color: "#f6dd84", letterSpacing: "0.8px", textTransform: "uppercase" }}>
                  🔴 LIVE EXAM INVIGILATION &amp; STUDENT PROFILE
                </div>
                <h3 style={{ margin: "4px 0 2px", color: "#ffffff", fontSize: "1.2rem" }}>
                  {activeWatchSession.studentName}
                </h3>
                <div style={{ fontSize: "0.8rem", color: "#cbd5e1" }}>
                  Student ID / Index: <strong style={{ color: "#f6dd84" }}>{activeWatchSession.studentIndexNumber || activeWatchSession.studentId}</strong> • Class: <strong style={{ color: "#f6dd84" }}>{activeWatchSession.className || "Enrolled Class"}</strong> • Email: <strong>{activeWatchSession.studentEmail || "Registered Candidate"}</strong>
                </div>
              </div>
              <button type="button" onClick={() => setActiveWatchStudentKey(null)} style={{ background: "rgba(212, 175, 55, 0.18)", border: "1px solid #d4af37", color: "#f6dd84", borderRadius: "8px", padding: "6px 12px", fontWeight: 800, cursor: "pointer" }}>✕ Close</button>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(290px, 1fr))", gap: "14px", marginBottom: "14px" }}>
              <div style={{ background: "#020617", borderRadius: "12px", border: "1.5px solid #d4af37", overflow: "hidden", minHeight: "260px", display: "flex", alignItems: "center", justifyContent: "center", position: "relative" }}>
                {/* Layer A: True 30 FPS 1.0x Real-Time WebRTC Live Video Stream */}
                <video
                  ref={watchRemoteVideoRef}
                  data-testid="proctor-watch-webrtc-video"
                  autoPlay
                  playsInline
                  muted
                  onLoadedMetadata={(e) => {
                    e.currentTarget.playbackRate = 1.0;
                    e.currentTarget.play().catch(() => { });
                  }}
                  style={{
                    width: "100%",
                    height: "100%",
                    maxHeight: "340px",
                    objectFit: "cover",
                    display: watchWebRtcLive ? "block" : "none"
                  }}
                />
                {/* Layer B: High-Speed 1.0x Smooth Motion SSE Frame Stream (Zero-delay instant display & firewall fallback) */}
                {!watchWebRtcLive && (
                  activeWatchSession.snapshotDataUrl ? (
                    <img
                      data-testid="proctor-watch-fast-frame"
                      src={activeWatchSession.snapshotDataUrl}
                      decoding="async"
                      alt={`Live Stream - ${activeWatchSession.studentName}`}
                      style={{ width: "100%", height: "100%", maxHeight: "340px", objectFit: "cover" }}
                    />
                  ) : (
                    <div style={{ textAlign: "center", padding: "18px", color: "#94a3b8", fontSize: "0.84rem" }}>
                      <div style={{ fontSize: "2rem", marginBottom: "6px" }}>🎥</div>
                      Awaiting Examinee Webcam Stream...
                    </div>
                  )
                )}
                <div style={{ position: "absolute", top: "8px", left: "8px", background: "rgba(8, 24, 51, 0.88)", color: "#f6dd84", fontSize: "0.7rem", fontWeight: 800, padding: "3px 8px", borderRadius: "6px", border: "1px solid rgba(212,175,55,0.5)" }}>
                  {activeWatchSession.examTitle} • Frame #{activeWatchSession.liveFrameSeq || 1}
                </div>
                <div
                  data-testid="proctor-watch-speed-badge"
                  style={{
                    position: "absolute",
                    bottom: "8px",
                    right: "8px",
                    background: watchWebRtcLive ? "rgba(16, 185, 129, 0.9)" : "rgba(2, 132, 199, 0.9)",
                    color: "#ffffff",
                    fontSize: "0.68rem",
                    fontWeight: 900,
                    padding: "3px 9px",
                    borderRadius: "999px"
                  }}
                >
                  {watchWebRtcLive
                    ? "🟢 1.0x REAL-TIME VIDEO (30 FPS)"
                    : `⚡ 1.0x LIVE STREAM (${watchMeasuredFps || activeWatchSession.streamFpsHint || 10} FPS)`}
                </div>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                <div style={{ background: "rgba(5, 15, 35, 0.78)", border: "1px solid rgba(212, 175, 55, 0.4)", borderRadius: "10px", padding: "10px 12px", fontSize: "0.8rem" }}>
                  <div><strong>Exam Status:</strong> <span style={{ color: "#f6dd84" }}>{activeWatchSession.status}</span></div>
                  <div><strong>Stream Speed:</strong> <strong style={{ color: "#34d399" }}>1.0x Real-Time ({watchWebRtcLive ? "WebRTC 30 FPS" : `Fast SSE ${watchMeasuredFps || activeWatchSession.streamFpsHint || 10} FPS`})</strong></div>
                  <div><strong>Movement Delta:</strong> {activeWatchSession.movementDelta || 0}</div>
                  <div><strong>Total Warnings:</strong> <strong style={{ color: (activeWatchSession.warningsCount || 0) > 0 ? "#fca5a5" : "#6ee7b7" }}>{activeWatchSession.warningsCount || 0}</strong></div>
                  <div><strong>Lost Marks Deducted:</strong> <strong style={{ color: "#fca5a5" }}>-{activeWatchSession.penaltyMarksDeducted || 0} Marks</strong></div>
                  <div><strong>Last Feed Update:</strong> {activeWatchSession.lastHeartbeatAt ? new Date(activeWatchSession.lastHeartbeatAt).toLocaleTimeString() : "Active"}</div>
                </div>

                <div style={{ background: "rgba(5, 15, 35, 0.78)", border: "1px solid rgba(212, 175, 55, 0.4)", borderRadius: "10px", padding: "10px 12px" }}>
                  <label style={{ display: "block", fontSize: "0.74rem", fontWeight: 800, color: "#f6dd84", marginBottom: "6px" }}>
                    📣 SEND DIRECT MESSAGE / WARNING TO {activeWatchSession.studentName.toUpperCase()}
                  </label>
                  <textarea
                    rows={2}
                    className="filter-input"
                    style={{ width: "100%", marginBottom: "8px" }}
                    placeholder="Type warning or direct instruction for this examinee..."
                    value={watchModalMsg}
                    onChange={(e) => setWatchModalMsg(e.target.value)}
                  />
                  <div style={{ display: "flex", gap: "6px", alignItems: "center", marginBottom: "8px" }}>
                    <select className="filter-select" style={{ flex: 1 }} value={watchModalSeverity} onChange={(e) => setWatchModalSeverity(e.target.value)}>
                      <option value="WARNING">⚠️ Official Warning</option>
                      <option value="INFO">ℹ️ Exam Notice / Instruction</option>
                    </select>
                    {watchModalSeverity === "WARNING" && (
                      <input
                        type="number"
                        min="0"
                        max="50"
                        className="filter-input"
                        style={{ width: "78px" }}
                        value={watchModalDeduct}
                        onChange={(e) => setWatchModalDeduct(Number(e.target.value) || 0)}
                      />
                    )}
                  </div>
                  <div style={{ display: "flex", gap: "8px" }}>
                    <button
                      type="button"
                      disabled={sendingMsg}
                      onClick={() => {
                        handleDispatchMessage({
                          overrideMode: "SINGLE",
                          overrideStudentIds: [String(activeWatchSession.studentId)],
                          overrideText: watchModalMsg.trim() || "Keep your eyes on the exam screen and stop looking away.",
                          overrideSeverity: watchModalSeverity,
                          overrideDeduct: watchModalSeverity === "WARNING" ? watchModalDeduct : 0
                        });
                        setWatchModalMsg("");
                      }}
                      style={{ flex: 1, background: "linear-gradient(135deg, #f6dd84, #cfa028)", color: "#081833", border: "1px solid #d4af37", borderRadius: "8px", padding: "7px 10px", fontWeight: 900, cursor: "pointer", fontSize: "0.78rem" }}
                    >
                      {watchModalSeverity === "WARNING" ? `⚠️ Send Warning (-${watchModalDeduct} Marks)` : "💬 Send Direct Instruction"}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSaveEvidenceSnapshot(activeWatchSession)}
                      style={{ background: "rgba(13, 34, 71, 0.9)", color: "#f6dd84", border: "1px solid #d4af37", borderRadius: "8px", padding: "7px 10px", fontWeight: 800, cursor: "pointer", fontSize: "0.78rem" }}
                    >
                      📸 Save Evidence
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div style={{ background: "#050f23", border: "1px solid rgba(212, 175, 55, 0.3)", borderRadius: "10px", padding: "10px 12px" }}>
              <div style={{ fontSize: "0.75rem", fontWeight: 800, color: "#f6dd84", marginBottom: "6px" }}>
                📋 Live Movement &amp; Violation Audit Trail ({(activeWatchSession.events || []).length} events)
              </div>
              <div style={{ maxHeight: "150px", overflowY: "auto" }}>
                {(activeWatchSession.events || []).length === 0 ? (
                  <div style={{ fontSize: "0.78rem", color: "#94a3b8" }}>No irregular movement or tab-switch alerts recorded for this student.</div>
                ) : (
                  activeWatchSession.events.map((ev, idx) => (
                    <div key={ev.id || idx} style={{ fontSize: "0.76rem", padding: "4px 0", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
                      <strong style={{ color: "#f6dd84" }}>[{ev.time || ev.timeIso}]</strong> {ev.reason}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
