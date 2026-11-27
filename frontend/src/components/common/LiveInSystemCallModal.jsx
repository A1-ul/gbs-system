import React, { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { createPortal } from "react-dom";
import { io } from "socket.io-client";
import apiClient from "../../api/client/apiClient";
import { getServerBaseUrl } from "../../api/client/apiConfig";
import { getActiveAuthToken } from "../../utils/tokenStorage";
import {
  startOutgoingRingbackTone,
  stopOutgoingRingbackTone,
  stopAllCallRingtones,
  formatRolePositionLabel
} from "../../utils/callRingtoneEngine";

const DEFAULT_ICE_CONFIG = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
    { urls: "stun:stun2.l.google.com:19302" },
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
  iceCandidatePoolSize: 10,
  bundlePolicy: "max-bundle",
  rtcpMuxPolicy: "require"
};

function getImmediateIceConfig() {
  if (typeof window !== "undefined" && window.__gbsCachedIceConfig?.iceServers?.length) {
    return { ...DEFAULT_ICE_CONFIG, ...window.__gbsCachedIceConfig };
  }
  return DEFAULT_ICE_CONFIG;
}

function resolveParticipantKey(p = {}) {
  const email = String(p?.peerKey || p?.email || p?.senderEmail || "").trim().toLowerCase();
  if (email) return email;
  const uid = String(p?.userId || p?.id || p?.senderId || "").trim().toLowerCase();
  return uid || "";
}

function tuneVideoSenderPerformance(pc, participantCount = 2) {
  if (!pc || typeof pc.getSenders !== "function") return;
  const maxBitrate = participantCount >= 5 ? 280000 : participantCount >= 3 ? 450000 : 950000;
  for (const sender of pc.getSenders()) {
    if (sender.track?.kind !== "video" || typeof sender.getParameters !== "function") continue;
    try {
      const params = sender.getParameters() || {};
      params.degradationPreference = "maintain-framerate";
      if (!Array.isArray(params.encodings) || params.encodings.length === 0) {
        params.encodings = [{}];
      }
      params.encodings[0].maxFramerate = 30;
      params.encodings[0].maxBitrate = maxBitrate;
      sender.setParameters(params).catch(() => { });
    } catch { }
  }
}

function preferFastHardwareCodecs(pc) {
  try {
    if (typeof RTCRtpSender === "undefined" || typeof RTCRtpSender.getCapabilities !== "function") return;
    const caps = RTCRtpSender.getCapabilities("video");
    if (!caps?.codecs?.length) return;
    const preferred = [
      ...caps.codecs.filter((c) => /VP8|H264/i.test(c.mimeType)),
      ...caps.codecs.filter((c) => !/VP8|H264/i.test(c.mimeType))
    ];
    for (const trans of pc.getTransceivers?.() || []) {
      if (trans.sender?.track?.kind === "video" && typeof trans.setCodecPreferences === "function") {
        trans.setCodecPreferences(preferred);
      }
    }
  } catch { }
}

function findVideoSenderOnPc(pc) {
  if (!pc || typeof pc.getSenders !== "function") return null;
  const senders = pc.getSenders() || [];
  const direct = senders.find((s) => s.track?.kind === "video");
  if (direct) return direct;
  const transceivers = typeof pc.getTransceivers === "function" ? pc.getTransceivers() : [];
  const vTrans = transceivers.find(
    (t) => t.sender?.track?.kind === "video" || t.receiver?.track?.kind === "video"
  );
  return vTrans?.sender || null;
}

function findAudioSenderOnPc(pc) {
  if (!pc || typeof pc.getSenders !== "function") return null;
  const senders = pc.getSenders() || [];
  const direct = senders.find((s) => s.track?.kind === "audio");
  if (direct) return direct;
  const transceivers = typeof pc.getTransceivers === "function" ? pc.getTransceivers() : [];
  const aTrans = transceivers.find(
    (t) => t.sender?.track?.kind === "audio" || t.receiver?.track?.kind === "audio"
  );
  return aTrans?.sender || null;
}

function CallDurationClock({ startedAt }) {
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    const startMs = startedAt ? new Date(startedAt).getTime() : Date.now();
    const tick = () => setElapsed(Math.max(0, Math.floor((Date.now() - startMs) / 1000)));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [startedAt]);
  const mins = Math.floor(elapsed / 60);
  const secs = elapsed % 60;
  return <span>{String(mins).padStart(2, "0")}:{String(secs).padStart(2, "0")}</span>;
}

/**
 * Dedicated Remote Participant Camera Tile for 1-to-1 and Multi-User Conference Calls.
 * Binds each remote peer's MediaStream straight to a GPU-accelerated 30fps <video> + crisp <audio>.
 */
function RemoteParticipantVideoTile({
  participant,
  peerKey,
  stream,
  streamVersion,
  peerState,
  isPrimary,
  isSpotlight,
  onToggleSpotlight,
  onAudioUnlockNeeded,
  audioUnlockTrigger
}) {
  const videoRef = useRef(null);
  const audioRef = useRef(null);
  const [videoMeta, setVideoMeta] = useState("");
  const [hasPlayingVideo, setHasPlayingVideo] = useState(false);

  const bindMedia = useCallback(() => {
    if (!stream) return;
    const liveVidTracks = stream.getVideoTracks().filter((t) => t.readyState === "live" && t.enabled !== false);
    const hasVid = liveVidTracks.length > 0;
    if (hasVid) setHasPlayingVideo(true);

    const aEl = audioRef.current;
    if (aEl) {
      if (aEl.srcObject !== stream) aEl.srcObject = stream;
      aEl.muted = false;
      aEl.volume = 1.0;
      const ap = aEl.play();
      if (ap && typeof ap.catch === "function") {
        ap.catch(() => {
          if (typeof onAudioUnlockNeeded === "function") onAudioUnlockNeeded();
        });
      }
    }

    const vEl = videoRef.current;
    if (vEl) {
      if (vEl.srcObject !== stream) vEl.srcObject = stream;
      vEl.playsInline = true;
      vEl.autoplay = true;
      vEl.playbackRate = 1.0;
      vEl.muted = Boolean(aEl); // Dedicated <audio> prevents echo while letting <video> autoplay instantly at 0ms
      const vp = vEl.play();
      if (vp && typeof vp.catch === "function") {
        vp.catch(() => {
          if (videoRef.current) {
            videoRef.current.muted = true;
            videoRef.current.play().catch(() => { });
          }
        });
      }
    }
  }, [stream, onAudioUnlockNeeded]);

  useEffect(() => {
    bindMedia();
    const raf = requestAnimationFrame(bindMedia);
    return () => cancelAnimationFrame(raf);
  }, [bindMedia, streamVersion, audioUnlockTrigger]);

  const iceState = peerState?.iceState || "connecting";
  const isConnected = Boolean(peerState?.connected || iceState === "connected" || iceState === "completed" || hasPlayingVideo);
  const hasVideoTrack = Boolean(
    stream && stream.getVideoTracks().some((t) => t.readyState === "live" && t.enabled !== false)
  );
  const showVideo = Boolean(hasVideoTrack || hasPlayingVideo) && !participant?.videoOff;
  const roleLabel = participant?.position || formatRolePositionLabel(participant?.role || "");

  return (
    <div
      data-testid={isPrimary ? "live-call-remote-tile-primary" : `conference-peer-tile-${peerKey}`}
      style={{
        background: "#050f23",
        border: isSpotlight ? "2px solid #38bdf8" : "1.5px solid #d4af37",
        borderRadius: "12px",
        padding: "10px",
        minHeight: isSpotlight ? "340px" : "235px",
        gridColumn: isSpotlight ? "1 / -1" : "span 1",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        gap: "6px"
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
        <span style={{ fontSize: "0.73rem", fontWeight: 800, color: "#f6dd84" }}>
          🎥 {participant?.name || "Participant"} ({roleLabel}) {videoMeta ? `• ${videoMeta}` : ""}
        </span>
        <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
          <span
            style={{
              fontSize: "0.66rem",
              fontWeight: 900,
              padding: "2px 7px",
              borderRadius: "999px",
              background: showVideo ? "rgba(16, 185, 129, 0.22)" : "rgba(245, 158, 11, 0.2)",
              color: showVideo ? "#6ee7b7" : "#fde68a",
              border: `1px solid ${showVideo ? "#10b981" : "#f59e0b"}`
            }}
          >
            {showVideo ? "⚡ LIVE CAM" : isConnected ? "🎙️ AUDIO LIVE" : "📡 CONNECTING"}
          </span>
          <button
            type="button"
            onClick={() => onToggleSpotlight(peerKey)}
            style={{
              background: "rgba(56, 189, 248, 0.16)",
              color: "#7dd3fc",
              border: "1px solid rgba(56, 189, 248, 0.45)",
              borderRadius: "6px",
              padding: "2px 7px",
              fontSize: "0.66rem",
              fontWeight: 800,
              cursor: "pointer"
            }}
          >
            {isSpotlight ? "↙ Grid" : "⤢ Expand"}
          </button>
        </div>
      </div>

      <div style={{ position: "relative", width: "100%", height: isSpotlight ? "300px" : "185px", borderRadius: "8px", overflow: "hidden", background: "#020617" }}>
        <audio
          ref={audioRef}
          data-testid={isPrimary ? "live-call-remote-audio" : `conference-peer-audio-${peerKey}`}
          autoPlay
          playsInline
        />
        <video
          ref={videoRef}
          data-testid={isPrimary ? "live-call-remote-video" : `conference-peer-video-${peerKey}`}
          autoPlay
          playsInline
          onLoadedMetadata={(e) => {
            const v = e.currentTarget;
            v.playbackRate = 1.0;
            v.play().catch(() => {
              v.muted = true;
              v.play().catch(() => { });
            });
            if (v.videoWidth > 0) {
              setHasPlayingVideo(true);
              setVideoMeta(`${v.videoWidth}×${v.videoHeight}`);
            }
          }}
          onPlaying={(e) => {
            const v = e.currentTarget;
            v.playbackRate = 1.0;
            if (v.videoWidth > 0) {
              setHasPlayingVideo(true);
              setVideoMeta(`${v.videoWidth}×${v.videoHeight}`);
            }
          }}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            borderRadius: "8px",
            background: "#020617",
            transform: "translateZ(0)",
            willChange: "transform",
            opacity: showVideo ? 1 : 0
          }}
        />
        {!showVideo && (
          <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", color: "#cbd5e1", fontSize: "0.78rem", padding: "10px", background: "#020617" }}>
            <div style={{ fontSize: "2rem", marginBottom: "5px" }}>{isConnected ? "🎙️" : "📡"}</div>
            <strong style={{ color: "#ffffff", marginBottom: "2px" }}>{participant?.name || "Connected User"}</strong>
            <div>
              {participant?.videoOff
                ? "Camera turned off by user (Voice audio active)"
                : isConnected
                  ? "Connected — camera renders automatically when active"
                  : "Connecting instant WebRTC camera stream..."}
            </div>
          </div>
        )}
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "0.68rem", color: "#94a3b8" }}>
        <span>{participant?.role || "MEMBER"}</span>
        <span>
          Link:{" "}
          <strong style={{ color: iceState === "connected" || iceState === "completed" ? "#34d399" : "#fbbf24" }}>
            {iceState}
          </strong>
        </span>
      </div>
    </div>
  );
}

/**
 * Full-Mesh Instant Real-Time WebRTC Voice & Video Call / Multi-User Conference Modal.
 * - Opens local camera at 0ms without blocking on ICE or polling endpoints.
 * - Automatically establishes direct 30fps peer-to-peer camera connections with EVERY user
 *   who answers or joins across ALL dashboards (Admin, Teacher, Student, Parent, Accountant,
 *   Secretary, Staff, HR, Clinic, Alumni, Developer).
 */
export default function LiveInSystemCallModal({
  session,
  currentUser = {},
  onClose,
  onSessionEnded = null
}) {
  const [liveSession, setLiveSession] = useState(session || null);
  const [activeMediaMode, setActiveMediaMode] = useState(() =>
    String(session?.mediaMode || "VIDEO").toUpperCase() === "VOICE" ? "VOICE" : "VIDEO"
  );
  const [micMuted, setMicMuted] = useState(false);
  const [cameraOff, setCameraOff] = useState(
    String(session?.mediaMode || "VIDEO").toUpperCase() === "VOICE"
  );
  const [switchingMediaMode, setSwitchingMediaMode] = useState(false);
  const [screenSharing, setScreenSharing] = useState(false);
  const [mediaStatus, setMediaStatus] = useState("Activating instant live camera & microphone...");
  const [chatInput, setChatInput] = useState("");
  const [chatLog, setChatLog] = useState(session?.chatMessages || []);
  const [localVideoMeta, setLocalVideoMeta] = useState("");
  const [availableCameras, setAvailableCameras] = useState([]);
  const [selectedCameraId, setSelectedCameraId] = useState("");
  const [availableMics, setAvailableMics] = useState([]);
  const [selectedMicId, setSelectedMicId] = useState("");
  const [audioUnlocked, setAudioUnlocked] = useState(true);
  const [audioUnlockTrigger, setAudioUnlockTrigger] = useState(0);
  const [micLevel, setMicLevel] = useState(0);
  const [copiedLink, setCopiedLink] = useState(false);
  const [smsPingStatus, setSmsPingStatus] = useState("");
  const [spotlightPeerKey, setSpotlightPeerKey] = useState(null);
  const [peerStates, setPeerStates] = useState({}); // { [peerKey]: { iceState, connected, hasVideo, streamVersion } }

  const localVideoRef = useRef(null);
  const localStreamRef = useRef(null);
  const iceConfigRef = useRef(getImmediateIceConfig());

  // Multi-peer mesh connection registries
  const peerConnsRef = useRef(new Map());        // peerKey -> RTCPeerConnection
  const remoteStreamsRef = useRef(new Map());    // peerKey -> MediaStream
  const pendingIceByPeerRef = useRef(new Map()); // peerKey -> RTCIceCandidateInit[]
  const makingOfferByPeerRef = useRef(new Map()); // peerKey -> boolean
  const pendingSignalsRef = useRef([]);
  const processedSignalIdsRef = useRef(new Set());
  const localMediaReadyRef = useRef(false);
  const lastSignalTimeRef = useRef(null);
  const liveParticipantsRef = useRef(Array.isArray(session?.participants) ? session.participants : []);
  const socketRef = useRef(null);

  const selectedCameraIdRef = useRef("");
  const selectedMicIdRef = useRef("");
  const initialMediaModeRef = useRef(
    String(session?.mediaMode || "VIDEO").toUpperCase() === "VOICE" ? "VOICE" : "VIDEO"
  );
  const activeMediaModeRef = useRef(activeMediaMode);
  const micMutedRef = useRef(micMuted);
  const mediaSwitchBusyRef = useRef(false);
  const audioCtxRef = useRef(null);
  const micMeterRafRef = useRef(null);

  const onSessionEndedRef = useRef(onSessionEnded);
  const onCloseRef = useRef(onClose);
  const currentUserRef = useRef(currentUser);
  const liveSessionRef = useRef(liveSession);
  const isMultiConferenceRef = useRef(false);
  useEffect(() => {
    onSessionEndedRef.current = onSessionEnded;
    onCloseRef.current = onClose;
    currentUserRef.current = currentUser;
    liveSessionRef.current = liveSession;
    activeMediaModeRef.current = activeMediaMode;
    micMutedRef.current = micMuted;
    selectedCameraIdRef.current = selectedCameraId;
    selectedMicIdRef.current = selectedMicId;
  });

  const myUserId = String(currentUser?.id || currentUser?.email || "user");
  const myEmailLower = String(currentUser?.email || "").trim().toLowerCase();
  const myPeerKey = useMemo(() => (myEmailLower || myUserId.toLowerCase()), [myEmailLower, myUserId]);
  const myRoleUpper = String(currentUser?.role || "").trim().toUpperCase();
  const callId = session?.id || liveSession?.id;
  const roomCode = session?.roomCode || liveSession?.roomCode || callId;
  const callTenantId = session?.tenantId || liveSession?.tenantId || currentUser?.tenantId || 1;
  const initiatorUserId = session?.initiatorUserId || liveSession?.initiatorUserId;
  const initiatorEmailLower = String(session?.initiatorEmail || liveSession?.initiatorEmail || "").trim().toLowerCase();
  const initiatorRoleUpper = String(session?.initiatorRole || liveSession?.initiatorRole || "").trim().toUpperCase();
  const isMeInitiator = Boolean(
    (myUserId && initiatorUserId && String(initiatorUserId) === myUserId) ||
    (myEmailLower && initiatorEmailLower && myEmailLower === initiatorEmailLower) ||
    (myRoleUpper === "DEVELOPER" && initiatorRoleUpper === "DEVELOPER")
  );
  const isMultiConference = String(liveSession?.callScope || session?.callScope || "DIRECT").toUpperCase() !== "DIRECT";
  isMultiConferenceRef.current = isMultiConference;

  const activeSession = liveSession || session;
  const participants = Array.isArray(activeSession?.participants) ? activeSession.participants : [];
  useEffect(() => {
    liveParticipantsRef.current = participants;
  }, [participants]);

  // Deduplicated remote participants excluding self
  const remoteParticipants = useMemo(() => {
    const map = new Map();
    for (const p of participants) {
      const pKey = resolveParticipantKey(p);
      if (!pKey || pKey === myPeerKey) continue;
      if (myEmailLower && p.email && String(p.email).toLowerCase() === myEmailLower) continue;
      if (!map.has(pKey)) {
        map.set(pKey, { ...p, peerKey: pKey });
      }
    }
    // Also surface any peer we already received a WebRTC stream from even before roster poll catches up
    for (const key of remoteStreamsRef.current.keys()) {
      if (key && key !== myPeerKey && !map.has(key)) {
        map.set(key, { peerKey: key, name: key, role: "PARTICIPANT" });
      }
    }
    return Array.from(map.values());
  }, [participants, myPeerKey, myEmailLower, peerStates]);

  const anyRemoteConnected = useMemo(
    () => Object.values(peerStates).some((st) => st?.connected || st?.iceState === "connected" || st?.iceState === "completed"),
    [peerStates]
  );

  const isOutgoingRinging =
    String(liveSession?.status || session?.status || "").toUpperCase() === "RINGING" &&
    !isMultiConference &&
    !anyRemoteConnected &&
    isMeInitiator;

  useEffect(() => {
    if (isOutgoingRinging) {
      startOutgoingRingbackTone();
    } else {
      stopOutgoingRingbackTone();
    }
    return () => {
      stopOutgoingRingbackTone();
    };
  }, [isOutgoingRinging]);

  const mediaMode = activeMediaMode;
  const syncedSessionIdRef = useRef(session?.id || null);

  useEffect(() => {
    if (!session?.id || syncedSessionIdRef.current === session.id) return;
    syncedSessionIdRef.current = session.id;
    const nextMode = String(session?.mediaMode || "VIDEO").toUpperCase() === "VOICE" ? "VOICE" : "VIDEO";
    initialMediaModeRef.current = nextMode;
    setActiveMediaMode(nextMode);
    setCameraOff(nextMode === "VOICE");
    setLiveSession(session);
  }, [session?.id]);

  const updatePeerState = useCallback((peerKey, patch) => {
    setPeerStates((prev) => {
      const current = prev[peerKey] || { iceState: "new", connected: false, hasVideo: false, streamVersion: 0 };
      const next = typeof patch === "function" ? patch(current) : { ...current, ...patch };
      return { ...prev, [peerKey]: next };
    });
  }, []);

  const closeSinglePeer = useCallback((peerKey) => {
    const pc = peerConnsRef.current.get(peerKey);
    if (pc) {
      try { pc.close(); } catch { }
      peerConnsRef.current.delete(peerKey);
    }
    remoteStreamsRef.current.delete(peerKey);
    pendingIceByPeerRef.current.delete(peerKey);
    makingOfferByPeerRef.current.delete(peerKey);
    setPeerStates((prev) => {
      if (!prev[peerKey]) return prev;
      const copy = { ...prev };
      delete copy[peerKey];
      return copy;
    });
  }, []);

  const stopAllMediaAndPeers = useCallback(() => {
    try {
      if (micMeterRafRef.current) {
        cancelAnimationFrame(micMeterRafRef.current);
        micMeterRafRef.current = null;
      }
      if (audioCtxRef.current) {
        audioCtxRef.current.close().catch(() => { });
        audioCtxRef.current = null;
      }
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((t) => {
          try { t.stop(); } catch { }
        });
        localStreamRef.current = null;
      }
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = null;
      }
      for (const pc of peerConnsRef.current.values()) {
        try { pc.close(); } catch { }
      }
      peerConnsRef.current.clear();
      remoteStreamsRef.current.clear();
      pendingIceByPeerRef.current.clear();
      makingOfferByPeerRef.current.clear();
      pendingSignalsRef.current = [];
      processedSignalIdsRef.current.clear();
      localMediaReadyRef.current = false;
    } catch { }
  }, []);

  const startMicLevelMonitor = useCallback((stream) => {
    try {
      if (!stream || stream.getAudioTracks().length === 0) return;
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      if (audioCtxRef.current) {
        audioCtxRef.current.close().catch(() => { });
      }
      const ctx = new AudioCtx();
      audioCtxRef.current = ctx;
      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      const loop = () => {
        if (!audioCtxRef.current) return;
        analyser.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) sum += dataArray[i];
        setMicLevel(Math.min(100, Math.round((sum / dataArray.length) * 2.2)));
        micMeterRafRef.current = requestAnimationFrame(loop);
      };
      micMeterRafRef.current = requestAnimationFrame(loop);
    } catch { }
  }, []);

  const refreshCameraDevices = useCallback(async () => {
    try {
      if (!navigator.mediaDevices || typeof navigator.mediaDevices.enumerateDevices !== "function") return;
      const devices = await navigator.mediaDevices.enumerateDevices();
      const cams = devices.filter((d) => d.kind === "videoinput");
      const mics = devices.filter((d) => d.kind === "audioinput");
      setAvailableCameras(cams);
      setAvailableMics(mics);
      if (cams.length > 0 && !selectedCameraIdRef.current) {
        const activeVidTrack = localStreamRef.current?.getVideoTracks?.()[0];
        setSelectedCameraId(activeVidTrack?.getSettings?.()?.deviceId || cams[0].deviceId || "");
      }
      if (mics.length > 0 && !selectedMicIdRef.current) {
        const activeAudTrack = localStreamRef.current?.getAudioTracks?.()[0];
        setSelectedMicId(activeAudTrack?.getSettings?.()?.deviceId || mics[0].deviceId || "");
      }
    } catch { }
  }, []);

  const attachLocalStreamToVideo = useCallback((stream, forceRebind = false) => {
    const el = localVideoRef.current;
    if (!el || !stream) return;
    if (forceRebind || el.srcObject !== stream) {
      el.srcObject = stream;
    }
    el.muted = true;
    el.defaultMuted = true;
    el.playsInline = true;
    el.autoplay = true;
    el.playbackRate = 1.0;
    const playPromise = el.play();
    if (playPromise && typeof playPromise.catch === "function") {
      playPromise.catch(() => {
        setTimeout(() => {
          if (localVideoRef.current && localVideoRef.current.srcObject === stream) {
            localVideoRef.current.muted = true;
            localVideoRef.current.play().catch(() => { });
          }
        }, 120);
      });
    }
  }, []);

  const sendSignal = useCallback(async (signalType, payload, extra = {}) => {
    if (!callId) return;
    const cu = currentUserRef.current || {};
    const signalBody = {
      signalType,
      payload,
      ...extra
    };
    // Dual ultra-fast transport: emit over Socket.IO room immediately (sub-15ms) AND persist via HTTP/SSE
    try {
      if (socketRef.current?.connected) {
        socketRef.current.emit("webrtc_signal", {
          id: `SOCK-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          callId,
          roomCode,
          tenantId: callTenantId,
          senderKey: myPeerKey,
          senderId: myUserId,
          senderEmail: myEmailLower || null,
          senderName: cu?.fullName || `${cu?.firstName || ""} ${cu?.lastName || ""}`.trim() || cu?.name || "Participant",
          targetPeerKey: extra.targetPeerKey || null,
          targetUserId: extra.targetUserId || null,
          signalType,
          payload,
          createdAt: new Date().toISOString()
        });
      }
    } catch { }
    try {
      await apiClient.post(`/video/calls/${encodeURIComponent(callId)}/signal`, signalBody);
    } catch { }
  }, [callId, roomCode, callTenantId, myPeerKey, myUserId, myEmailLower]);

  const sendOfferToPeer = useCallback(async (remotePeerKey, pc, { iceRestart = false } = {}) => {
    if (!pc || pc.signalingState === "closed" || !remotePeerKey) return;
    if (makingOfferByPeerRef.current.get(remotePeerKey)) return;
    makingOfferByPeerRef.current.set(remotePeerKey, true);
    try {
      if (pc.signalingState !== "stable") {
        try { await pc.setLocalDescription({ type: "rollback" }); } catch { }
      }
      const offer = await pc.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: true,
        iceRestart
      });
      await pc.setLocalDescription(offer);
      await sendSignal("OFFER", offer, { targetPeerKey: remotePeerKey });
    } catch { } finally {
      makingOfferByPeerRef.current.set(remotePeerKey, false);
    }
  }, [sendSignal]);

  const flushPendingIceForPeer = useCallback(async (remotePeerKey, pc) => {
    if (!pc || !pc.remoteDescription) return;
    const queue = pendingIceByPeerRef.current.get(remotePeerKey);
    if (!queue || queue.length === 0) return;
    pendingIceByPeerRef.current.set(remotePeerKey, []);
    for (const cand of queue) {
      try {
        await pc.addIceCandidate(new RTCIceCandidate(cand));
      } catch { }
    }
  }, []);

  /**
   * Creates (or retrieves) an RTCPeerConnection dedicated to `remotePeerKey`,
   * attaches all live local camera/mic tracks immediately, and configures hardware 30fps encoding.
   */
  const ensurePeerConnection = useCallback((remotePeerKey) => {
    if (!remotePeerKey || remotePeerKey === myPeerKey || typeof RTCPeerConnection !== "function") return null;
    const existing = peerConnsRef.current.get(remotePeerKey);
    if (existing && existing.signalingState !== "closed") {
      return existing;
    }

    const pc = new RTCPeerConnection(iceConfigRef.current || DEFAULT_ICE_CONFIG);
    peerConnsRef.current.set(remotePeerKey, pc);
    if (!remoteStreamsRef.current.has(remotePeerKey)) {
      remoteStreamsRef.current.set(remotePeerKey, new MediaStream());
    }
    if (!pendingIceByPeerRef.current.has(remotePeerKey)) {
      pendingIceByPeerRef.current.set(remotePeerKey, []);
    }

    let hasLocalAudio = false;
    let hasLocalVideo = false;
    const localStream = localStreamRef.current;
    if (localStream) {
      localStream.getTracks().forEach((track) => {
        if (track.readyState !== "live") return;
        pc.addTrack(track, localStream);
        if (track.kind === "audio") hasLocalAudio = true;
        if (track.kind === "video") hasLocalVideo = true;
      });
      preferFastHardwareCodecs(pc);
      tuneVideoSenderPerformance(pc, Math.max(2, liveParticipantsRef.current.length));
    }

    if (typeof pc.addTransceiver === "function") {
      try {
        if (!hasLocalAudio) pc.addTransceiver("audio", { direction: "recvonly" });
        if (!hasLocalVideo) pc.addTransceiver("video", { direction: "recvonly" });
      } catch { }
    }

    pc.ontrack = (evt) => {
      let rStream = remoteStreamsRef.current.get(remotePeerKey);
      if (!rStream) {
        rStream = new MediaStream();
        remoteStreamsRef.current.set(remotePeerKey, rStream);
      }
      const incomingTracks = evt.streams?.[0]?.getTracks?.() || (evt.track ? [evt.track] : []);
      for (const track of incomingTracks) {
        if (!track) continue;
        rStream.getTracks().forEach((old) => {
          if (old.kind === track.kind && old.id !== track.id) {
            try { rStream.removeTrack(old); } catch { }
          }
        });
        if (!rStream.getTracks().some((t) => t.id === track.id)) {
          rStream.addTrack(track);
        }
        track.onunmute = () => {
          updatePeerState(remotePeerKey, (cur) => ({
            ...cur,
            connected: true,
            hasVideo: rStream.getVideoTracks().some((t) => t.readyState === "live"),
            streamVersion: (cur.streamVersion || 0) + 1
          }));
        };
        track.onended = () => {
          updatePeerState(remotePeerKey, (cur) => ({
            ...cur,
            hasVideo: rStream.getVideoTracks().some((t) => t.readyState === "live"),
            streamVersion: (cur.streamVersion || 0) + 1
          }));
        };
      }
      updatePeerState(remotePeerKey, (cur) => ({
        ...cur,
        connected: true,
        hasVideo: rStream.getVideoTracks().some((t) => t.readyState === "live"),
        streamVersion: (cur.streamVersion || 0) + 1
      }));
    };

    pc.oniceconnectionstatechange = () => {
      const st = pc.iceConnectionState;
      updatePeerState(remotePeerKey, (cur) => ({
        ...cur,
        iceState: st,
        connected: cur.connected || st === "connected" || st === "completed"
      }));
      if ((st === "failed" || st === "disconnected") && myPeerKey.localeCompare(remotePeerKey) < 0) {
        setTimeout(() => {
          const livePc = peerConnsRef.current.get(remotePeerKey);
          if (livePc === pc && (pc.iceConnectionState === "failed" || pc.iceConnectionState === "disconnected")) {
            sendOfferToPeer(remotePeerKey, pc, { iceRestart: true });
          }
        }, 1200);
      }
    };

    pc.onicecandidate = (evt) => {
      if (evt.candidate) {
        sendSignal("ICE_CANDIDATE", evt.candidate, { targetPeerKey: remotePeerKey });
      }
    };

    updatePeerState(remotePeerKey, (cur) => ({ ...cur, iceState: pc.iceConnectionState || "new" }));
    return pc;
  }, [myPeerKey, sendSignal, sendOfferToPeer, updatePeerState]);

  /**
   * Synchronizes our full-mesh connections against all active participants in the call/conference.
   * Uses deterministic lexicographical peer ordering (myPeerKey < remotePeerKey) to prevent glare
   * and connect every camera automatically the instant any user answers or joins!
   */
  const syncMeshWithParticipants = useCallback((participantList = []) => {
    const activeRemoteKeys = new Set();
    for (const p of participantList) {
      const rKey = resolveParticipantKey(p);
      if (!rKey || rKey === myPeerKey) continue;
      activeRemoteKeys.add(rKey);

      const alreadyHadPc = peerConnsRef.current.has(rKey);
      const pc = ensurePeerConnection(rKey);
      if (!pc) continue;
      tuneVideoSenderPerformance(pc, Math.max(2, participantList.length));

      const shouldInitiateOffer = myPeerKey.localeCompare(rKey) < 0;
      if (shouldInitiateOffer && (!alreadyHadPc || pc.iceConnectionState === "new")) {
        if (pc.signalingState === "stable") {
          sendOfferToPeer(rKey, pc);
        }
      }
    }

    // Prune peers who cleanly left the conference
    for (const existingKey of Array.from(peerConnsRef.current.keys())) {
      if (participantList.length > 0 && !activeRemoteKeys.has(existingKey) && isMultiConferenceRef.current) {
        closeSinglePeer(existingKey);
      }
    }
  }, [myPeerKey, ensurePeerConnection, sendOfferToPeer, closeSinglePeer]);

  const meshHandlersRef = useRef({});
  meshHandlersRef.current = {
    sendSignal,
    sendOfferToPeer,
    ensurePeerConnection,
    flushPendingIceForPeer,
    syncMeshWithParticipants,
    closeSinglePeer,
    stopAllMediaAndPeers,
    attachLocalStreamToVideo,
    startMicLevelMonitor,
    refreshCameraDevices,
    updatePeerState
  };

  const acquireFreshCameraTrack = useCallback(async (preferredDeviceId = "") => {
    if (!navigator.mediaDevices || typeof navigator.mediaDevices.getUserMedia !== "function") {
      return null;
    }
    const devId = preferredDeviceId || selectedCameraIdRef.current || "";
    const hdVideoConstraint = devId
      ? { deviceId: { exact: devId }, width: { ideal: 640 }, height: { ideal: 360 }, frameRate: { ideal: 30 } }
      : { width: { ideal: 640 }, height: { ideal: 360 }, frameRate: { ideal: 30 } };
    try {
      const hdStream = await navigator.mediaDevices.getUserMedia({ video: hdVideoConstraint, audio: false });
      const track = hdStream.getVideoTracks()[0] || null;
      if (track) { refreshCameraDevices(); return track; }
    } catch { }
    try {
      const basicStream = await navigator.mediaDevices.getUserMedia({
        video: devId ? { deviceId: { ideal: devId } } : true,
        audio: false
      });
      const track = basicStream.getVideoTracks()[0] || null;
      if (track) refreshCameraDevices();
      return track;
    } catch {
      return null;
    }
  }, [refreshCameraDevices]);

  // Keep local camera bound & playing whenever switching back to VIDEO or turning camera ON
  useEffect(() => {
    if (activeMediaMode === "VIDEO" && !cameraOff && localStreamRef.current) {
      attachLocalStreamToVideo(localStreamRef.current, true);
      const rafId = requestAnimationFrame(() => {
        if (localVideoRef.current && localStreamRef.current) {
          attachLocalStreamToVideo(localStreamRef.current, true);
        }
      });
      return () => cancelAnimationFrame(rafId);
    }
    return undefined;
  }, [cameraOff, activeMediaMode, attachLocalStreamToVideo]);

  // Auto-unlock remote speaker audio on very next user gesture if browser blocked autoplay
  useEffect(() => {
    if (audioUnlocked) return undefined;
    const unlockOnGesture = () => {
      if (audioCtxRef.current && audioCtxRef.current.state === "suspended") {
        audioCtxRef.current.resume().catch(() => { });
      }
      setAudioUnlocked(true);
      setAudioUnlockTrigger((c) => c + 1);
    };
    window.addEventListener("pointerdown", unlockOnGesture, { once: true });
    window.addEventListener("keydown", unlockOnGesture, { once: true });
    return () => {
      window.removeEventListener("pointerdown", unlockOnGesture);
      window.removeEventListener("keydown", unlockOnGesture);
    };
  }, [audioUnlocked]);

  // Core Call / Conference Lifecycle: Instant Camera + Parallel SSE/Socket.IO/Poll Full-Mesh WebRTC
  useEffect(() => {
    if (!callId) return undefined;
    let active = true;

    const processIncomingSignal = async (sig) => {
      if (!sig) return;
      if (sig.id && processedSignalIdsRef.current.has(sig.id)) return;
      const senderKey = resolveParticipantKey(sig);
      if (!senderKey || senderKey === myPeerKey) return;
      if (sig.targetPeerKey && String(sig.targetPeerKey).toLowerCase() !== myPeerKey) return;

      if (!localMediaReadyRef.current) {
        pendingSignalsRef.current.push(sig);
        return;
      }

      if (sig.id) processedSignalIdsRef.current.add(sig.id);
      if (sig.createdAt) lastSignalTimeRef.current = sig.createdAt;

      try {
        if (sig.signalType === "PEER_READY") {
          const pc = meshHandlersRef.current.ensurePeerConnection(senderKey);
          if (pc && myPeerKey.localeCompare(senderKey) < 0) {
            await meshHandlersRef.current.sendOfferToPeer(senderKey, pc, { iceRestart: pc.iceConnectionState === "failed" || pc.iceConnectionState === "disconnected" });
          }
          return;
        }

        if (sig.signalType === "MEDIA_MODE") {
          meshHandlersRef.current.updatePeerState(senderKey, (cur) => ({ ...cur, streamVersion: (cur.streamVersion || 0) + 1 }));
          return;
        }

        if (!sig.payload) return;
        const pc = meshHandlersRef.current.ensurePeerConnection(senderKey);
        if (!pc || pc.signalingState === "closed") return;

        if (sig.signalType === "OFFER") {
          // Perfect Negotiation glare handling: rollback cleanly when receiving an offer in non-stable state
          if (pc.signalingState !== "stable") {
            try { await pc.setLocalDescription({ type: "rollback" }); } catch { }
          }
          await pc.setRemoteDescription(new RTCSessionDescription(sig.payload));
          await meshHandlersRef.current.flushPendingIceForPeer(senderKey, pc);
          const ans = await pc.createAnswer();
          await pc.setLocalDescription(ans);
          await meshHandlersRef.current.sendSignal("ANSWER", ans, { targetPeerKey: senderKey });
          tuneVideoSenderPerformance(pc, Math.max(2, liveParticipantsRef.current.length));
          meshHandlersRef.current.updatePeerState(senderKey, (cur) => ({ ...cur, connected: true }));
        } else if (sig.signalType === "ANSWER" && pc.signalingState === "have-local-offer") {
          await pc.setRemoteDescription(new RTCSessionDescription(sig.payload));
          await meshHandlersRef.current.flushPendingIceForPeer(senderKey, pc);
          tuneVideoSenderPerformance(pc, Math.max(2, liveParticipantsRef.current.length));
          meshHandlersRef.current.updatePeerState(senderKey, (cur) => ({ ...cur, connected: true }));
        } else if (sig.signalType === "ICE_CANDIDATE") {
          if (pc.remoteDescription) {
            await pc.addIceCandidate(new RTCIceCandidate(sig.payload));
          } else {
            const q = pendingIceByPeerRef.current.get(senderKey) || [];
            q.push(sig.payload);
            pendingIceByPeerRef.current.set(senderKey, q);
          }
        }
      } catch { }
    };

    const getUserMediaFast = (constraints, timeoutMs = 20000) => {
      return new Promise((resolve, reject) => {
        let settled = false;
        const timer = setTimeout(() => {
          if (!settled) {
            settled = true;
            reject(new Error("Media device acquisition timed out"));
          }
        }, timeoutMs);
        navigator.mediaDevices.getUserMedia(constraints).then(
          (stream) => {
            clearTimeout(timer);
            if (settled) {
              stream.getTracks().forEach((t) => { try { t.stop(); } catch { } });
              return;
            }
            settled = true;
            resolve(stream);
          },
          (err) => {
            clearTimeout(timer);
            if (!settled) {
              settled = true;
              reject(err);
            }
          }
        );
      });
    };

    const acquireHardwareMedia = async () => {
      if (!navigator.mediaDevices || typeof navigator.mediaDevices.getUserMedia !== "function") {
        setMediaStatus("Signaling Room Active (Camera/Mic requires HTTPS or localhost permission)");
        return null;
      }
      const audioCfg = { echoCancellation: true, noiseSuppression: true, autoGainControl: true };
      const initialMode = initialMediaModeRef.current;
      if (initialMode === "VIDEO") {
        try {
          const stream = await getUserMediaFast({
            audio: audioCfg,
            video: { width: { ideal: 640 }, height: { ideal: 360 }, frameRate: { ideal: 30 } }
          }, 20000);
          setCameraOff(false);
          setMediaStatus("⚡ HD Live Camera & Microphone Connected");
          return stream;
        } catch {
          try {
            const fallbackBoth = await getUserMediaFast({ audio: true, video: true }, 12000);
            setCameraOff(false);
            setMediaStatus("⚡ Live Camera & Microphone Connected");
            return fallbackBoth;
          } catch {
            try {
              const videoOnly = await getUserMediaFast({ video: true, audio: false }, 10000);
              setCameraOff(false);
              setMicMuted(true);
              setMediaStatus("Live Camera Active (microphone unavailable — click Unmute Mic)");
              return videoOnly;
            } catch {
              try {
                const audioOnly = await getUserMediaFast({ audio: true, video: false }, 10000);
                setCameraOff(true);
                setMediaStatus("Audio-Only Connected (click Switch to Video Call once camera is free)");
                return audioOnly;
              } catch {
                setCameraOff(true);
                setMediaStatus("Signaling Room Active (allow camera & mic access in browser)");
                return null;
              }
            }
          }
        }
      } else {
        try {
          const audioStream = await getUserMediaFast({ audio: audioCfg, video: false }, 15000);
          setCameraOff(true);
          setMicMuted(false);
          setMediaStatus("Voice Call Microphone Live — Click Switch to Video Call anytime");
          return audioStream;
        } catch {
          try {
            const basicAudio = await getUserMediaFast({ audio: true, video: false }, 10000);
            setCameraOff(true);
            setMicMuted(false);
            setMediaStatus("Voice Call Microphone Live — Click Switch to Video Call anytime");
            return basicAudio;
          } catch {
            setCameraOff(true);
            setMicMuted(true);
            setMediaStatus("Voice Room Active (allow microphone access or click Unmute Mic)");
            return null;
          }
        }
      }
    };

    // Refresh ICE/TURN config silently in background (NEVER blocks instant camera start!)
    if (!window.__gbsCachedIceConfig) {
      apiClient.get("/video/calls/ice-servers")
        .then((res) => {
          if (res?.data?.data?.iceServers?.length) {
            const merged = { ...DEFAULT_ICE_CONFIG, ...res.data.data };
            window.__gbsCachedIceConfig = merged;
            iceConfigRef.current = merged;
          }
        })
        .catch(() => { });
    }

    // 1. Open Socket.IO room immediately for sub-15ms conference signaling
    let sock = null;
    try {
      const serverUrl = getServerBaseUrl();
      if (serverUrl) {
        sock = io(serverUrl, {
          transports: ["websocket", "polling"],
          withCredentials: true,
          reconnectionAttempts: 5
        });
        socketRef.current = sock;
        sock.on("connect", () => {
          const cu = currentUserRef.current || {};
          sock.emit("join_call_room", {
            callId,
            roomCode,
            tenantId: callTenantId,
            userId: myUserId,
            userName: cu?.fullName || cu?.firstName || cu?.name || "Participant",
            userRole: myRoleUpper,
            mediaMode: activeMediaModeRef.current
          });
        });
        sock.on("webrtc_signal", (sig) => {
          if (sig && (String(sig.callId || "") === String(callId) || String(sig.roomCode || "") === String(roomCode))) {
            processIncomingSignal(sig);
          }
        });
      }
    } catch { }

    // 2. Open SSE stream immediately at t=0ms
    let eventSource = null;
    try {
      const isDevCtx = myRoleUpper === "DEVELOPER";
      const tok = getActiveAuthToken({ isDeveloperContext: isDevCtx });
      if (tok && typeof EventSource !== "undefined") {
        const base = String(apiClient.defaults?.baseURL || "/api/v1").replace(/\/+$/, "");
        const sseUrl = `${base}/video/calls/${encodeURIComponent(callId)}/stream?token=${encodeURIComponent(tok)}`;
        eventSource = new EventSource(sseUrl);

        eventSource.addEventListener("participant_joined", (evt) => {
          try {
            const d = JSON.parse(evt.data);
            const nextList = Array.isArray(d.participants) ? d.participants : liveParticipantsRef.current;
            liveParticipantsRef.current = nextList;
            setLiveSession((prev) => prev ? { ...prev, status: d.status || prev.status, participants: nextList } : prev);
            if (localMediaReadyRef.current) {
              meshHandlersRef.current.syncMeshWithParticipants(nextList);
            }
          } catch { }
        });
        eventSource.addEventListener("participant_left", (evt) => {
          try {
            const d = JSON.parse(evt.data);
            const nextList = Array.isArray(d.participants) ? d.participants : liveParticipantsRef.current;
            liveParticipantsRef.current = nextList;
            setLiveSession((prev) => prev ? { ...prev, status: d.status || prev.status, participants: nextList } : prev);
            const leftKey = resolveParticipantKey(d.leftBy);
            if (leftKey) meshHandlersRef.current.closeSinglePeer(leftKey);
          } catch { }
        });
        eventSource.addEventListener("webrtc_signal", (evt) => {
          try {
            const d = JSON.parse(evt.data);
            if (d?.item) processIncomingSignal(d.item);
          } catch { }
        });
        eventSource.addEventListener("media_mode_changed", (evt) => {
          try {
            const d = JSON.parse(evt.data);
            if (Array.isArray(d?.participants)) {
              liveParticipantsRef.current = d.participants;
              setLiveSession((prev) => (prev ? { ...prev, participants: d.participants } : prev));
            }
          } catch { }
        });
        eventSource.addEventListener("chat_message", (evt) => {
          try {
            const d = JSON.parse(evt.data);
            if (d?.item) {
              setChatLog((prev) => prev.some((m) => m.id === d.item.id) ? prev : [...prev, d.item]);
            }
          } catch { }
        });
        eventSource.addEventListener("call_ended", () => {
          setMediaStatus("Call ended");
          if (typeof onSessionEndedRef.current === "function") onSessionEndedRef.current(liveSessionRef.current);
        });
      }
    } catch { }

    // 3. Immediate + resilient fallback poll (t=0ms, then every 2.2s)
    const pollOnce = async () => {
      if (!active) return;
      try {
        const res = await apiClient.get(`/video/calls/${encodeURIComponent(callId)}`, {
          params: lastSignalTimeRef.current ? { since: lastSignalTimeRef.current } : {}
        });
        const data = res?.data?.data;
        if (!data) return;

        if (data.session) {
          const nextParticipants = Array.isArray(data.session.participants) ? data.session.participants : [];
          liveParticipantsRef.current = nextParticipants;
          setLiveSession((prev) => {
            if (!prev) return data.session;
            if (
              prev.id === data.session.id &&
              prev.status === data.session.status &&
              prev.mediaMode === data.session.mediaMode &&
              JSON.stringify(prev.participants || []) === JSON.stringify(nextParticipants) &&
              (prev.chatMessages?.length || 0) === (data.session.chatMessages?.length || 0)
            ) {
              return prev;
            }
            return data.session;
          });
          if (localMediaReadyRef.current) {
            meshHandlersRef.current.syncMeshWithParticipants(nextParticipants);
          }
          if (Array.isArray(data.session.chatMessages)) {
            setChatLog((prev) => (prev.length === data.session.chatMessages.length ? prev : data.session.chatMessages));
          }
          if (data.session.status === "ENDED" || data.session.status === "DECLINED") {
            setMediaStatus(`Call ${data.session.status.toLowerCase()}`);
            if (typeof onSessionEndedRef.current === "function") onSessionEndedRef.current(data.session);
          }
        }

        const sigs = Array.isArray(data.signals) ? data.signals : [];
        for (const sig of sigs) {
          await processIncomingSignal(sig);
        }
      } catch { }
    };

    pollOnce();
    const pollInterval = setInterval(pollOnce, 2200);

    // 4. Immediately acquire hardware camera & auto-connect full-mesh WebRTC
    const startCameraAndMesh = async () => {
      const stream = await acquireHardwareMedia();
      if (!active) {
        stream?.getTracks().forEach((t) => t.stop());
        return;
      }

      if (stream) {
        if (activeMediaModeRef.current === "VOICE") {
          stream.getVideoTracks().forEach((t) => {
            try { t.enabled = false; t.stop(); } catch { }
          });
          const voiceOnlyStream = new MediaStream(stream.getAudioTracks().filter((t) => t.readyState === "live"));
          localStreamRef.current = voiceOnlyStream;
          meshHandlersRef.current.startMicLevelMonitor(voiceOnlyStream);
        } else {
          localStreamRef.current = stream;
          meshHandlersRef.current.attachLocalStreamToVideo(stream, true);
          meshHandlersRef.current.startMicLevelMonitor(stream);
        }
        meshHandlersRef.current.refreshCameraDevices();
      }

      localMediaReadyRef.current = true;

      // Connect immediately to everyone already in the room
      meshHandlersRef.current.syncMeshWithParticipants(liveParticipantsRef.current);

      // Drain any OFFERs/ICE that arrived while camera was initializing
      if (pendingSignalsRef.current.length > 0) {
        const backlog = [...pendingSignalsRef.current];
        pendingSignalsRef.current = [];
        for (const qSig of backlog) {
          await processIncomingSignal(qSig);
        }
      }

      // Announce readiness to all peers so any existing offerer sends an instant targeted OFFER
      meshHandlersRef.current.sendSignal("PEER_READY", {
        peerKey: myPeerKey,
        mediaMode: activeMediaModeRef.current,
        hasVideo: Boolean(localStreamRef.current?.getVideoTracks?.().length)
      }).catch(() => { });
    };

    startCameraAndMesh();

    return () => {
      active = false;
      clearInterval(pollInterval);
      if (eventSource) {
        try { eventSource.close(); } catch { }
      }
      if (sock) {
        try {
          sock.emit("leave_call_room", { callId, roomCode, tenantId: callTenantId, userId: myUserId });
          sock.disconnect();
        } catch { }
        socketRef.current = null;
      }
      meshHandlersRef.current.stopAllMediaAndPeers();
    };
  }, [
    callId,
    roomCode,
    callTenantId,
    myUserId,
    myPeerKey,
    myRoleUpper
  ]);

  const propagateTrackToAllPeers = useCallback(async (kind, newTrack, stream) => {
    const participantCount = Math.max(2, liveParticipantsRef.current.length);
    for (const [remotePeerKey, pc] of peerConnsRef.current.entries()) {
      if (!pc || pc.signalingState === "closed") continue;
      try {
        const existingSender = kind === "video" ? findVideoSenderOnPc(pc) : findAudioSenderOnPc(pc);
        if (existingSender) {
          const trans = pc.getTransceivers?.().find((t) => t.sender === existingSender);
          if (newTrack && trans && trans.direction === "recvonly") {
            trans.direction = "sendrecv";
            await existingSender.replaceTrack(newTrack);
            await sendOfferToPeer(remotePeerKey, pc);
          } else {
            await existingSender.replaceTrack(newTrack || null);
          }
          if (kind === "video") tuneVideoSenderPerformance(pc, participantCount);
        } else if (newTrack && stream) {
          pc.addTrack(newTrack, stream);
          if (kind === "video") {
            preferFastHardwareCodecs(pc);
            tuneVideoSenderPerformance(pc, participantCount);
          }
          await sendOfferToPeer(remotePeerKey, pc);
        }
      } catch { }
    }
  }, [sendOfferToPeer]);

  const acquireAndBindMicTrack = async (deviceId = "") => {
    if (!navigator.mediaDevices || typeof navigator.mediaDevices.getUserMedia !== "function") return false;
    const micId = deviceId || selectedMicIdRef.current || "";
    const preferredAudio = micId
      ? { deviceId: { exact: micId }, echoCancellation: true, noiseSuppression: true, autoGainControl: true }
      : { echoCancellation: true, noiseSuppression: true, autoGainControl: true };
    let audioStream = null;
    try {
      audioStream = await navigator.mediaDevices.getUserMedia({ audio: preferredAudio, video: false });
    } catch {
      try {
        audioStream = await navigator.mediaDevices.getUserMedia({ audio: micId ? { deviceId: { ideal: micId } } : true, video: false });
      } catch {
        return false;
      }
    }
    const audioTrack = audioStream?.getAudioTracks?.()[0];
    if (!audioTrack) return false;
    audioTrack.enabled = true;

    const existingVideoTracks = (localStreamRef.current?.getVideoTracks?.() || []).filter((t) => t.readyState === "live");
    (localStreamRef.current?.getAudioTracks?.() || []).forEach((oldT) => {
      if (oldT !== audioTrack) { try { oldT.stop(); } catch { } }
    });

    const nextStream = new MediaStream([audioTrack, ...existingVideoTracks]);
    localStreamRef.current = nextStream;
    startMicLevelMonitor(nextStream);
    refreshCameraDevices();

    propagateTrackToAllPeers("audio", audioTrack, nextStream);
    setMicMuted(false);
    setMediaStatus(activeMediaModeRef.current === "VOICE" ? "Live Microphone Active (Voice Call)" : "⚡ HD Live Camera & Microphone Active");
    return true;
  };

  const handleSelectMic = async (nextMicId) => {
    setSelectedMicId(nextMicId);
    selectedMicIdRef.current = nextMicId;
    await acquireAndBindMicTrack(nextMicId);
  };

  const toggleMic = async () => {
    const nextMuted = !micMuted;
    const liveAudioTracks = (localStreamRef.current?.getAudioTracks?.() || []).filter((t) => t.readyState === "live");
    if (liveAudioTracks.length > 0) {
      setMicMuted(nextMuted);
      liveAudioTracks.forEach((t) => { t.enabled = !nextMuted; });
      setMediaStatus(nextMuted ? "Microphone Muted" : "Live Microphone Active");
    } else if (!nextMuted) {
      const ok = await acquireAndBindMicTrack(selectedMicIdRef.current);
      if (!ok) {
        setMicMuted(true);
        setMediaStatus("Microphone permission needed — allow mic in browser settings");
      }
    } else {
      setMicMuted(true);
    }
  };

  const activateVideoTrackOnCall = useCallback(async ({ switchToVideoMode = false, deviceId = "" } = {}) => {
    const existingAudioTracks = (localStreamRef.current?.getAudioTracks?.() || []).filter((t) => t.readyState === "live");
    const existingLiveVideo = !deviceId
      ? (localStreamRef.current?.getVideoTracks?.() || []).find((t) => t.readyState === "live")
      : null;

    let vidTrack = existingLiveVideo || null;
    if (vidTrack) {
      vidTrack.enabled = true;
    } else {
      vidTrack = await acquireFreshCameraTrack(deviceId);
    }

    if (!vidTrack) {
      setCameraOff(true);
      setLocalVideoMeta("");
      setMediaStatus("Camera permission denied or busy by another app — click Retry Camera");
      return false;
    }

    (localStreamRef.current?.getVideoTracks?.() || []).forEach((oldTrack) => {
      if (oldTrack !== vidTrack) { try { oldTrack.stop(); } catch { } }
    });

    const nextStream = new MediaStream([...existingAudioTracks, vidTrack]);
    localStreamRef.current = nextStream;

    if (switchToVideoMode) {
      setActiveMediaMode("VIDEO");
      setLiveSession((prev) => (prev ? { ...prev, mediaMode: "VIDEO" } : prev));
    }
    setCameraOff(false);
    setScreenSharing(false);
    setMediaStatus(micMutedRef.current ? "Live Camera Active (Mic Muted)" : "⚡ HD Live Camera & Microphone Active");
    attachLocalStreamToVideo(nextStream, true);
    requestAnimationFrame(() => {
      if (localStreamRef.current) attachLocalStreamToVideo(localStreamRef.current, true);
    });

    propagateTrackToAllPeers("video", vidTrack, nextStream);
    return true;
  }, [acquireFreshCameraTrack, attachLocalStreamToVideo, propagateTrackToAllPeers]);

  const handleSelectCamera = async (nextDeviceId) => {
    setSelectedCameraId(nextDeviceId);
    selectedCameraIdRef.current = nextDeviceId;
    if (activeMediaMode === "VIDEO") {
      await activateVideoTrackOnCall({ switchToVideoMode: false, deviceId: nextDeviceId });
    }
  };

  const switchCallMediaMode = async (targetMode) => {
    const normalizedTarget = String(targetMode || "").toUpperCase() === "VOICE" ? "VOICE" : "VIDEO";
    if (mediaSwitchBusyRef.current) return;
    mediaSwitchBusyRef.current = true;
    setSwitchingMediaMode(true);
    try {
      if (normalizedTarget === "VOICE") {
        const liveAudioTracks = (localStreamRef.current?.getAudioTracks?.() || []).filter((t) => t.readyState === "live");
        (localStreamRef.current?.getVideoTracks?.() || []).forEach((t) => {
          try { t.enabled = false; t.stop(); } catch { }
        });
        localStreamRef.current = new MediaStream(liveAudioTracks);
        if (localVideoRef.current) localVideoRef.current.srcObject = null;
        setScreenSharing(false);
        setCameraOff(true);
        setActiveMediaMode("VOICE");
        setLiveSession((prev) => (prev ? { ...prev, mediaMode: "VOICE" } : prev));
        setMediaStatus("Voice Call Active — Click Switch to Video Call anytime");
        propagateTrackToAllPeers("video", null, null);
        sendSignal("MEDIA_MODE", { mediaMode: "VOICE", videoOff: true }, { mediaMode: "VOICE" }).catch(() => { });
      } else {
        setMediaStatus("Re-activating live camera for Video Call...");
        const ok = await activateVideoTrackOnCall({ switchToVideoMode: true });
        if (ok) {
          sendSignal("MEDIA_MODE", { mediaMode: "VIDEO", videoOff: false }, { mediaMode: "VIDEO" }).catch(() => { });
        }
      }
    } finally {
      mediaSwitchBusyRef.current = false;
      setSwitchingMediaMode(false);
    }
  };

  const toggleCamera = async () => {
    if (activeMediaMode === "VOICE") {
      await switchCallMediaMode("VIDEO");
      return;
    }
    const nextOff = !cameraOff;
    if (!nextOff) {
      await activateVideoTrackOnCall({ switchToVideoMode: false });
    } else {
      setCameraOff(true);
      if (localStreamRef.current) {
        localStreamRef.current.getVideoTracks().forEach((t) => { t.enabled = false; });
      }
      setMediaStatus("Camera Paused — Voice Audio Active");
    }
  };

  const handleUnlockAudio = () => {
    if (audioCtxRef.current && audioCtxRef.current.state === "suspended") {
      audioCtxRef.current.resume().catch(() => { });
    }
    setAudioUnlocked(true);
    setAudioUnlockTrigger((c) => c + 1);
  };

  const handleReconnectMedia = async () => {
    handleUnlockAudio();
    if (localStreamRef.current && activeMediaModeRef.current === "VIDEO" && !cameraOff) {
      attachLocalStreamToVideo(localStreamRef.current, true);
    }
    setMediaStatus("Refreshing live multi-peer camera & voice connections...");
    syncMeshWithParticipants(liveParticipantsRef.current);
    for (const [remotePeerKey, pc] of peerConnsRef.current.entries()) {
      if (pc && pc.signalingState !== "closed") {
        await sendOfferToPeer(remotePeerKey, pc, { iceRestart: true });
      }
    }
    setMediaStatus("⚡ Live camera & voice connections refreshed");
  };

  const toggleScreenShare = async () => {
    if (screenSharing) {
      setScreenSharing(false);
      if (activeMediaMode === "VIDEO") await activateVideoTrackOnCall({ switchToVideoMode: false });
      return;
    }
    if (!navigator.mediaDevices?.getDisplayMedia) return;
    try {
      const displayStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
      const screenTrack = displayStream.getVideoTracks()[0];
      if (screenTrack) {
        await propagateTrackToAllPeers("video", screenTrack, displayStream);
        setScreenSharing(true);
        screenTrack.onended = () => {
          setScreenSharing(false);
          if (activeMediaModeRef.current === "VIDEO") {
            activateVideoTrackOnCall({ switchToVideoMode: false });
          }
        };
      }
    } catch { }
  };

  const handleSendChat = async (e) => {
    e.preventDefault();
    if (!chatInput.trim() || !callId) return;
    const text = chatInput.trim();
    setChatInput("");
    try {
      const res = await apiClient.post(`/video/calls/${encodeURIComponent(callId)}/signal`, { chatText: text });
      const rec = res?.data?.data?.recorded;
      if (rec) setChatLog((prev) => prev.some((m) => m.id === rec.id) ? prev : [...prev, rec]);
    } catch { }
  };

  const handleLeaveConference = async () => {
    stopAllCallRingtones();
    stopAllMediaAndPeers();
    if (callId) {
      try { await apiClient.post(`/video/calls/${encodeURIComponent(callId)}/leave`); } catch { }
    }
    if (typeof onClose === "function") onClose();
  };

  const handleEndCall = async () => {
    stopAllCallRingtones();
    stopAllMediaAndPeers();
    if (callId) {
      try { await apiClient.post(`/video/calls/${encodeURIComponent(callId)}/end`); } catch { }
    }
    if (typeof onSessionEnded === "function") onSessionEnded(liveSession);
    if (typeof onClose === "function") onClose();
  };

  const handleSendDeveloperSmsPing = async () => {
    if (!activeSession?.targetPhone) {
      setSmsPingStatus("📲 Headmaster dashboard is ringing live in-system (no SMS phone number registered on institution profile).");
      return;
    }
    setSmsPingStatus("Sending urgent SMS alert to Headmaster...");
    try {
      await apiClient.post("/dev-control/sms/send-headmaster", {
        phone: activeSession.targetPhone,
        headmasterName: activeSession?.targetName || "Headmaster",
        tenantName: activeSession?.targetTenantName || "Registered Institution",
        message: `🚨 URGENT DEVELOPER VIDEO CALL: System Engineer Gabriel Osei is ringing you live on the GBS System (${activeSession?.title || "Executive Video Call"}). Please open your Headmaster Dashboard now to answer.`
      });
      setSmsPingStatus("✅ Urgent SMS alert sent to Headmaster's phone!");
    } catch {
      setSmsPingStatus("📲 Headmaster dashboard ringing & in-app alert queued.");
    }
  };

  const isDeveloperCaller = myRoleUpper === "DEVELOPER";
  const isLiveClass = String(activeSession?.callScope || "").toUpperCase() === "CLASS_CONFERENCE";

  const modalContent = (
    <div
      data-testid="live-insystem-call-modal"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 100020,
        background: "rgba(3, 8, 22, 0.95)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "12px",
        boxSizing: "border-box"
      }}
    >
      <div
        style={{
          maxWidth: "1180px",
          width: "100%",
          maxHeight: "94vh",
          overflowY: "auto",
          background: "linear-gradient(145deg, #081833 0%, #0d2247 100%)",
          border: isLiveClass ? "2px solid #10b981" : "2px solid #d4af37",
          borderRadius: "18px",
          padding: "18px",
          color: "#f8fafc",
          boxShadow: "0 25px 70px rgba(0,0,0,0.8)"
        }}
      >
        {/* Top Call Bar */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px", borderBottom: "1px solid rgba(212,175,55,0.3)", paddingBottom: "12px", marginBottom: "14px" }}>
          <div>
            <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
              <span style={{ background: activeSession?.status === "RINGING" ? "#d97706" : "#059669", color: "#fff", padding: "3px 10px", borderRadius: "999px", fontSize: "0.72rem", fontWeight: 900 }}>
                {activeSession?.status === "RINGING" ? "📞 RINGING..." : `🟢 ${activeSession?.status || "ACTIVE"} • ${mediaMode}`}
              </span>
              {isMultiConference && (
                <span style={{ background: "rgba(56,189,248,0.22)", border: "1px solid #38bdf8", color: "#7dd3fc", padding: "3px 10px", borderRadius: "999px", fontSize: "0.72rem", fontWeight: 900 }}>
                  👥 MULTI-USER CAMERA GRID ({participants.length} IN ROOM)
                </span>
              )}
              {isLiveClass && (
                <span style={{ background: "rgba(16,185,129,0.22)", border: "1px solid #10b981", color: "#6ee7b7", padding: "3px 10px", borderRadius: "999px", fontSize: "0.72rem", fontWeight: 900 }}>
                  🎓 LIVE ONLINE CLASS • {activeSession?.className || "Students"}
                </span>
              )}
              <span style={{ fontSize: "0.74rem", color: "#f6dd84", fontWeight: 700 }}>
                Room: {activeSession?.roomCode} • ⏱️ <CallDurationClock startedAt={activeSession?.startedAt} /> • {mediaStatus}
              </span>
            </div>
            <h3 style={{ margin: "6px 0 0", color: "#ffffff", fontSize: "1.16rem", fontWeight: 900 }}>
              {isLiveClass ? "🎓" : mediaMode === "VOICE" ? "🎙️" : "🎥"} {activeSession?.title || "GBS Live Conference & Call Room"}
            </h3>
            {smsPingStatus && (
              <div style={{ marginTop: "5px", fontSize: "0.76rem", color: "#6ee7b7", fontWeight: 700 }}>{smsPingStatus}</div>
            )}
          </div>
          <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
            {!audioUnlocked && (
              <button
                type="button"
                onClick={handleUnlockAudio}
                style={{ background: "#d97706", color: "#fff", border: "1px solid #fde68a", borderRadius: "9px", padding: "8px 12px", fontWeight: 900, cursor: "pointer", fontSize: "0.78rem" }}
              >
                🔊 Tap to Unmute Speakers
              </button>
            )}
            {isDeveloperCaller && !anyRemoteConnected && (
              <button
                type="button"
                onClick={handleSendDeveloperSmsPing}
                style={{ background: "rgba(245, 158, 11, 0.22)", color: "#fcd34d", border: "1px solid #f59e0b", borderRadius: "9px", padding: "8px 12px", fontWeight: 800, cursor: "pointer", fontSize: "0.78rem" }}
              >
                📲 Send Urgent SMS Alert
              </button>
            )}
            {isMultiConference && !isMeInitiator && (
              <button
                type="button"
                onClick={handleLeaveConference}
                style={{ background: "#475569", color: "#fff", border: "1px solid #94a3b8", borderRadius: "9px", padding: "8px 14px", fontWeight: 800, cursor: "pointer" }}
              >
                🚪 Leave Room
              </button>
            )}
            <button
              type="button"
              onClick={handleEndCall}
              style={{ background: "#b91c1c", color: "#fff", border: "1px solid #f87171", borderRadius: "9px", padding: "8px 14px", fontWeight: 800, cursor: "pointer" }}
            >
              {isMultiConference ? "⏹️ End for All" : "⏹️ End Call"}
            </button>
          </div>
        </div>

        {/* Multi-User Live Conference Camera Wall + Sidebar */}
        <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 2.4fr) minmax(240px, 1fr)", gap: "14px", marginBottom: "14px" }}>
          <div
            data-testid="conference-camera-grid"
            style={{
              display: "grid",
              gridTemplateColumns: remoteParticipants.length >= 3 ? "repeat(auto-fit, minmax(220px, 1fr))" : "repeat(auto-fit, minmax(260px, 1fr))",
              gap: "10px",
              alignContent: "start"
            }}
          >
            {/* Local User Live Camera Tile (Displays Instantly at 0ms) */}
            <div style={{ background: "#050f23", border: "1.5px solid #38bdf8", borderRadius: "12px", padding: "10px", position: "relative", minHeight: "235px", display: "flex", flexDirection: "column", justifyContent: "space-between", gap: "6px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "6px" }}>
                <span style={{ fontSize: "0.72rem", fontWeight: 800, color: "#7dd3fc" }}>
                  You ({currentUser?.firstName || currentUser?.name || "Participant"}) {localVideoMeta ? `• ${localVideoMeta}` : ""}
                </span>
                {mediaMode === "VIDEO" && availableCameras.length > 1 && (
                  <select
                    aria-label="Switch Camera Device"
                    value={selectedCameraId}
                    onChange={(e) => handleSelectCamera(e.target.value)}
                    style={{ background: "#081833", color: "#e0f2fe", border: "1px solid rgba(56,189,248,0.5)", borderRadius: "6px", padding: "2px 6px", fontSize: "0.68rem", maxWidth: "140px" }}
                  >
                    {availableCameras.map((cam, idx) => (
                      <option key={cam.deviceId || idx} value={cam.deviceId}>
                        📷 {cam.label || `Camera ${idx + 1}`}
                      </option>
                    ))}
                  </select>
                )}
                {availableMics.length > 1 && (
                  <select
                    aria-label="Switch Microphone Device"
                    value={selectedMicId}
                    onChange={(e) => handleSelectMic(e.target.value)}
                    style={{ background: "#081833", color: "#a7f3d0", border: "1px solid rgba(16,185,129,0.5)", borderRadius: "6px", padding: "2px 6px", fontSize: "0.68rem", maxWidth: "140px" }}
                  >
                    {availableMics.map((mic, idx) => (
                      <option key={mic.deviceId || idx} value={mic.deviceId}>
                        🎙️ {mic.label || `Microphone ${idx + 1}`}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div style={{ position: "relative", width: "100%", height: "185px", borderRadius: "8px", overflow: "hidden", background: "#020617" }}>
                <video
                  ref={localVideoRef}
                  data-testid="live-call-local-video"
                  autoPlay
                  muted
                  playsInline
                  onLoadedMetadata={(e) => {
                    const v = e.currentTarget;
                    v.muted = true;
                    v.playbackRate = 1.0;
                    v.play().catch(() => { });
                    if (v.videoWidth > 0) setLocalVideoMeta(`${v.videoWidth}×${v.videoHeight}`);
                  }}
                  onPlaying={(e) => {
                    const v = e.currentTarget;
                    if (v.videoWidth > 0) setLocalVideoMeta(`${v.videoWidth}×${v.videoHeight}`);
                  }}
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                    borderRadius: "8px",
                    background: "#020617",
                    transform: screenSharing ? "translateZ(0)" : "scaleX(-1) translateZ(0)",
                    willChange: "transform",
                    opacity: mediaMode === "VIDEO" && !cameraOff ? 1 : 0,
                    pointerEvents: "none"
                  }}
                />
                {(mediaMode === "VOICE" || cameraOff) && (
                  <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "8px", color: "#f6dd84", background: "#020617", padding: "10px", textAlign: "center" }}>
                    <div style={{ fontSize: "2.1rem" }}>{mediaMode === "VIDEO" ? "📷" : "🎙️"}</div>
                    <div style={{ fontSize: "0.74rem", color: "#cbd5e1" }}>
                      {cameraOff && mediaMode === "VIDEO" ? "Camera Paused or Permission Needed" : "Voice Audio Active"}
                    </div>
                    {mediaMode === "VIDEO" && (
                      <button
                        type="button"
                        onClick={() => activateVideoTrackOnCall({ switchToVideoMode: false })}
                        style={{ background: "#0284c7", color: "#fff", border: "1px solid #7dd3fc", borderRadius: "7px", padding: "5px 12px", fontSize: "0.74rem", fontWeight: 800, cursor: "pointer" }}
                      >
                        🔄 Activate / Retry Camera
                      </button>
                    )}
                  </div>
                )}
              </div>

              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px", fontSize: "0.7rem", color: micMuted ? "#fca5a5" : "#6ee7b7", fontWeight: 700 }}>
                <span>{micMuted ? "🔇 Mic Muted" : "🟢 Mic Live"} {mediaMode === "VIDEO" ? (cameraOff ? "• 📷 Cam Off" : "• ⚡ 30 FPS LIVE") : "• Voice Mode"}</span>
                {!micMuted && (
                  <div style={{ width: "54px", height: "6px", background: "rgba(255,255,255,0.12)", borderRadius: "999px", overflow: "hidden" }}>
                    <div style={{ width: `${Math.max(8, micLevel)}%`, height: "100%", background: "#10b981", transition: "width 0.08s linear" }} />
                  </div>
                )}
              </div>
            </div>

            {/* Every Remote Connected Participant's Live Camera Tile */}
            {remoteParticipants.length === 0 ? (
              <div style={{ background: "#050f23", border: "1.5px solid #d4af37", borderRadius: "12px", padding: "10px", minHeight: "235px", display: "flex", flexDirection: "column", justifyContent: "space-between", gap: "6px" }}>
                <span style={{ fontSize: "0.72rem", fontWeight: 800, color: "#f6dd84" }}>
                  Remote Camera ({activeSession?.targetName || "Waiting for participants to join..."})
                </span>
                <div style={{ position: "relative", width: "100%", height: "185px", borderRadius: "8px", overflow: "hidden", background: "#020617", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", padding: "12px", color: "#cbd5e1", fontSize: "0.8rem" }}>
                  <audio data-testid="live-call-remote-audio" autoPlay playsInline />
                  <video data-testid="live-call-remote-video" autoPlay playsInline style={{ display: "none" }} />
                  <div style={{ fontSize: "2.2rem", marginBottom: "6px" }}>📡</div>
                  <div>Waiting for recipient or conference members to answer — their live camera will connect and appear here automatically with zero delay.</div>
                </div>
                <div style={{ fontSize: "0.7rem", color: "#94a3b8" }}>
                  Active Participants: <strong style={{ color: "#6ee7b7" }}>{participants.length}</strong> • Ready for Instant Auto-Connect
                </div>
              </div>
            ) : (
              remoteParticipants.map((rp, idx) => (
                <RemoteParticipantVideoTile
                  key={rp.peerKey}
                  participant={rp}
                  peerKey={rp.peerKey}
                  stream={remoteStreamsRef.current.get(rp.peerKey) || null}
                  streamVersion={peerStates[rp.peerKey]?.streamVersion || 0}
                  peerState={peerStates[rp.peerKey]}
                  isPrimary={idx === 0}
                  isSpotlight={spotlightPeerKey === rp.peerKey}
                  onToggleSpotlight={(k) => setSpotlightPeerKey((prev) => (prev === k ? null : k))}
                  onAudioUnlockNeeded={() => setAudioUnlocked(false)}
                  audioUnlockTrigger={audioUnlockTrigger}
                />
              ))
            )}
          </div>

          {/* Live Participant Roster & In-Call Chat */}
          <div style={{ background: "#050f23", border: "1px solid rgba(212,175,55,0.35)", borderRadius: "12px", padding: "12px", display: "flex", flexDirection: "column", gap: "10px" }}>
            <div style={{ fontSize: "0.74rem", fontWeight: 800, color: "#f6dd84", textTransform: "uppercase" }}>
              Connected Users ({participants.length})
            </div>
            <div style={{ maxHeight: "130px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "5px" }}>
              {participants.map((p, idx) => {
                const pKey = resolveParticipantKey(p);
                const isSelf = pKey === myPeerKey;
                const pState = peerStates[pKey];
                return (
                  <div key={pKey || idx} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "rgba(13,34,71,0.7)", padding: "5px 8px", borderRadius: "6px", fontSize: "0.74rem" }}>
                    <span style={{ color: "#ffffff", fontWeight: 700 }}>
                      {isSelf || pState?.connected ? "🟢" : "🟡"} {p.name}{isSelf ? " (You)" : ""}
                    </span>
                    <span style={{ color: "#f6dd84", fontSize: "0.66rem", fontWeight: 800 }}>{p.role}</span>
                  </div>
                );
              })}
            </div>

            <div style={{ fontSize: "0.74rem", fontWeight: 800, color: "#7dd3fc", textTransform: "uppercase", borderTop: "1px solid rgba(255,255,255,0.08)", paddingTop: "8px" }}>
              In-Call Live Chat
            </div>
            <div style={{ flex: 1, minHeight: "95px", maxHeight: "145px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "4px", fontSize: "0.75rem" }}>
              {chatLog.length === 0 ? (
                <span style={{ color: "#64748b" }}>No messages sent yet in this call.</span>
              ) : (
                chatLog.map((msg) => (
                  <div key={msg.id} style={{ background: "rgba(255,255,255,0.04)", padding: "4px 7px", borderRadius: "6px" }}>
                    <strong style={{ color: "#f6dd84" }}>{msg.senderName}:</strong> {msg.text}
                  </div>
                ))
              )}
            </div>
            <form onSubmit={handleSendChat} style={{ display: "flex", gap: "6px" }}>
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Type message to call..."
                style={{ flex: 1, padding: "6px 8px", borderRadius: "6px", border: "1px solid rgba(212,175,55,0.4)", background: "#081833", color: "#fff", fontSize: "0.76rem" }}
              />
              <button type="submit" style={{ background: "#0284c7", color: "#fff", border: "none", borderRadius: "6px", padding: "6px 10px", fontWeight: 700, cursor: "pointer", fontSize: "0.75rem" }}>
                Send
              </button>
            </form>
          </div>
        </div>

        {/* Bottom Hardware Controls */}
        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid rgba(212,175,55,0.25)", paddingTop: "12px" }}>
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
            <button type="button" onClick={toggleMic} style={{ background: micMuted ? "#991b1b" : "#065f46", color: "#fff", border: "1px solid #d4af37", borderRadius: "8px", padding: "8px 14px", fontWeight: 800, cursor: "pointer", fontSize: "0.8rem" }}>
              {micMuted ? "🔇 Unmute Mic" : "🎙️ Mute Mic"}
            </button>
            <button
              type="button"
              data-testid="call-switch-media-mode-btn"
              disabled={switchingMediaMode}
              onClick={() => switchCallMediaMode(mediaMode === "VIDEO" ? "VOICE" : "VIDEO")}
              style={{
                background: mediaMode === "VIDEO" ? "linear-gradient(135deg, #b45309, #d97706)" : "linear-gradient(135deg, #0284c7, #2563eb)",
                color: "#fff",
                border: "1px solid #f6dd84",
                borderRadius: "8px",
                padding: "8px 14px",
                fontWeight: 900,
                cursor: switchingMediaMode ? "wait" : "pointer",
                fontSize: "0.8rem"
              }}
            >
              {switchingMediaMode
                ? "⏳ Switching..."
                : mediaMode === "VIDEO"
                  ? "📞 Switch to Voice Call"
                  : "📹 Switch to Video Call"}
            </button>
            {mediaMode === "VIDEO" && (
              <button type="button" onClick={toggleCamera} style={{ background: cameraOff ? "#991b1b" : "#1d4ed8", color: "#fff", border: "1px solid #d4af37", borderRadius: "8px", padding: "8px 14px", fontWeight: 800, cursor: "pointer", fontSize: "0.8rem" }}>
                {cameraOff ? "📷 Turn Camera On" : "📹 Turn Camera Off"}
              </button>
            )}
            <button type="button" onClick={handleUnlockAudio} style={{ background: "rgba(16,185,129,0.2)", color: "#6ee7b7", border: "1px solid #10b981", borderRadius: "8px", padding: "8px 14px", fontWeight: 800, cursor: "pointer", fontSize: "0.8rem" }}>
              🔊 Speaker Audio On
            </button>
            <button type="button" onClick={handleReconnectMedia} style={{ background: "rgba(99,102,241,0.22)", color: "#c7d2fe", border: "1px solid #818cf8", borderRadius: "8px", padding: "8px 14px", fontWeight: 800, cursor: "pointer", fontSize: "0.8rem" }}>
              🔄 Reconnect Video/Audio
            </button>
            <button type="button" onClick={toggleScreenShare} style={{ background: screenSharing ? "#059669" : "rgba(56,189,248,0.16)", color: "#7dd3fc", border: "1px solid #38bdf8", borderRadius: "8px", padding: "8px 14px", fontWeight: 800, cursor: "pointer", fontSize: "0.8rem" }}>
              {screenSharing ? "🖥️ Sharing Screen" : "🖥️ Share Screen"}
            </button>
            <button
              type="button"
              onClick={() => {
                const roomUrl = `${window.location.origin}/online-learning?room=${encodeURIComponent(activeSession?.roomCode || "")}`;
                navigator.clipboard?.writeText(roomUrl);
                setCopiedLink(true);
                setTimeout(() => setCopiedLink(false), 2500);
              }}
              style={{ background: "rgba(212,175,55,0.16)", color: "#f6dd84", border: "1px solid #d4af37", borderRadius: "8px", padding: "8px 14px", fontWeight: 800, cursor: "pointer", fontSize: "0.8rem" }}
            >
              {copiedLink ? "✓ Room Code Copied" : "🔗 Copy Room Invite"}
            </button>
          </div>

          <button type="button" onClick={handleEndCall} style={{ background: "#dc2626", color: "#fff", border: "none", borderRadius: "8px", padding: "9px 18px", fontWeight: 900, cursor: "pointer", fontSize: "0.84rem" }}>
            {isMultiConference ? "📞 End Conference" : "📞 End Session"}
          </button>
        </div>
      </div>
    </div>
  );

  return typeof document !== "undefined" && document.body
    ? createPortal(modalContent, document.body)
    : modalContent;
}
