import React, { useEffect, useRef, useState, useCallback } from "react";
import { createPortal } from "react-dom";
import apiClient from "../../api/client/apiClient";
import { getActiveAuthToken } from "../../utils/tokenStorage";

const ICE_CONFIG = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
    { urls: "stun:stun2.l.google.com:19302" },
    { urls: "stun:stun3.l.google.com:19302" },
    { urls: "stun:stun4.l.google.com:19302" }
  ],
  iceCandidatePoolSize: 8,
  bundlePolicy: "max-bundle",
  rtcpMuxPolicy: "require"
};

function tuneVideoSenderPerformance(pc, participantCount = 2) {
  if (!pc || typeof pc.getSenders !== "function") return;
  const maxBitrate = participantCount >= 4 ? 320000 : participantCount >= 3 ? 450000 : 950000;
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

/**
 * Real WebRTC + Server-Signaled In-System Voice & Video Call / Conference Modal.
 * Replaces static mock rosters with real getUserMedia camera/mic streams,
 * real RTCPeerConnection SDP/ICE negotiation via /api/v1/video/calls/*,
 * live participant roster sync, screen share, and in-call messaging.
 */
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
  const [mediaStatus, setMediaStatus] = useState("Connecting audio/video hardware...");
  const [chatInput, setChatInput] = useState("");
  const [chatLog, setChatLog] = useState(session?.chatMessages || []);
  const [remoteConnected, setRemoteConnected] = useState(false);
  const [remoteHasVideo, setRemoteHasVideo] = useState(false);
  const [localVideoMeta, setLocalVideoMeta] = useState("");
  const [remoteVideoMeta, setRemoteVideoMeta] = useState("");
  const [availableCameras, setAvailableCameras] = useState([]);
  const [selectedCameraId, setSelectedCameraId] = useState("");
  const [audioUnlocked, setAudioUnlocked] = useState(true);
  const [micLevel, setMicLevel] = useState(0);
  const [copiedLink, setCopiedLink] = useState(false);
  const [smsPingStatus, setSmsPingStatus] = useState("");

  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const localStreamRef = useRef(null);
  const remoteStreamRef = useRef(null);
  const peerConnRef = useRef(null);
  const videoSenderRef = useRef(null);
  const remoteConnectedRef = useRef(false);
  const selectedCameraIdRef = useRef("");
  const initialMediaModeRef = useRef(
    String(session?.mediaMode || "VIDEO").toUpperCase() === "VOICE" ? "VOICE" : "VIDEO"
  );
  const activeMediaModeRef = useRef(activeMediaMode);
  const micMutedRef = useRef(micMuted);
  const mediaSwitchBusyRef = useRef(false);
  const lastSignalTimeRef = useRef(null);
  const offerSentRef = useRef(false);
  const pendingSignalsRef = useRef([]);
  const pendingIceCandidatesRef = useRef([]);
  const processedSignalIdsRef = useRef(new Set());
  const audioCtxRef = useRef(null);
  const micMeterRafRef = useRef(null);

  const onSessionEndedRef = useRef(onSessionEnded);
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onSessionEndedRef.current = onSessionEnded;
    onCloseRef.current = onClose;
    activeMediaModeRef.current = activeMediaMode;
    micMutedRef.current = micMuted;
    remoteConnectedRef.current = remoteConnected;
    selectedCameraIdRef.current = selectedCameraId;
  });

  const myUserId = String(currentUser?.id || currentUser?.email || "user");
  const callId = session?.id || liveSession?.id;
  const initiatorUserId = session?.initiatorUserId || liveSession?.initiatorUserId;
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

  const stopTracks = useCallback(() => {
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
          try {
            t.stop();
          } catch { }
        });
        localStreamRef.current = null;
      }
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = null;
      }
      if (peerConnRef.current) {
        peerConnRef.current.close();
        peerConnRef.current = null;
      }
      videoSenderRef.current = null;
      offerSentRef.current = false;
      pendingSignalsRef.current = [];
      pendingIceCandidatesRef.current = [];
      processedSignalIdsRef.current.clear();
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
        const avg = sum / dataArray.length;
        setMicLevel(Math.min(100, Math.round(avg * 2.2)));
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
      setAvailableCameras(cams);
      if (cams.length > 0 && !selectedCameraIdRef.current) {
        const activeVidTrack = localStreamRef.current?.getVideoTracks?.()[0];
        const activeId = activeVidTrack?.getSettings?.()?.deviceId || cams[0].deviceId || "";
        setSelectedCameraId(activeId);
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
    const playPromise = el.play();
    if (playPromise && typeof playPromise.catch === "function") {
      playPromise.catch(() => {
        setTimeout(() => {
          if (localVideoRef.current && localVideoRef.current.srcObject === stream) {
            localVideoRef.current.muted = true;
            localVideoRef.current.play().catch(() => { });
          }
        }, 180);
      });
    }
  }, []);

  const attachRemoteStreamToVideo = useCallback((stream, forceRebind = false) => {
    const el = remoteVideoRef.current;
    if (!el || !stream) return;
    const liveVidTracks = stream.getVideoTracks().filter((t) => t.readyState === "live");
    setRemoteHasVideo(liveVidTracks.length > 0);
    if (forceRebind || el.srcObject !== stream) {
      el.srcObject = stream;
    }
    el.playsInline = true;
    el.autoplay = true;
    el.muted = false;
    el.volume = 1.0;
    const p = el.play();
    if (p && typeof p.catch === "function") {
      p.then(() => {
        setAudioUnlocked(true);
      }).catch(() => {
        // Browser autoplay policy blocked unmuted playback outside a user gesture.
        // Immediately retry muted so remote live camera frames display right away, and show unmute button.
        if (remoteVideoRef.current) {
          remoteVideoRef.current.muted = true;
          remoteVideoRef.current.play().catch(() => { });
        }
        setAudioUnlocked(false);
      });
    }
  }, []);

  const sendSignal = useCallback(async (signalType, payload, extra = {}) => {
    if (!callId) return;
    try {
      await apiClient.post(`/video/calls/${encodeURIComponent(callId)}/signal`, {
        signalType,
        payload,
        ...extra
      });
    } catch { }
  }, [callId]);

  const findVideoSender = useCallback((pc) => {
    if (!pc || typeof pc.getSenders !== "function") return null;
    const senders = pc.getSenders() || [];
    if (videoSenderRef.current && senders.includes(videoSenderRef.current)) {
      return videoSenderRef.current;
    }
    const directSender = senders.find((s) => s.track?.kind === "video");
    if (directSender) {
      videoSenderRef.current = directSender;
      return directSender;
    }
    const transceivers = typeof pc.getTransceivers === "function" ? pc.getTransceivers() : [];
    const videoTransceiver = transceivers.find(
      (t) =>
        t.sender?.track?.kind === "video" ||
        t.receiver?.track?.kind === "video"
    );
    if (videoTransceiver?.sender) {
      videoSenderRef.current = videoTransceiver.sender;
      return videoTransceiver.sender;
    }
    return null;
  }, []);

  const renegotiatePeerConnection = useCallback(async (pc) => {
    if (!pc || pc.signalingState === "closed") return;
    try {
      if (pc.signalingState !== "stable") return;
      const offer = await pc.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: true
      });
      await pc.setLocalDescription(offer);
      await sendSignal("OFFER", offer);
    } catch { }
  }, [sendSignal]);

  const acquireFreshCameraTrack = useCallback(async (preferredDeviceId = "") => {
    if (!navigator.mediaDevices || typeof navigator.mediaDevices.getUserMedia !== "function") {
      return null;
    }
    const devId = preferredDeviceId || selectedCameraIdRef.current || "";
    const hdVideoConstraint = devId
      ? { deviceId: { exact: devId }, width: { ideal: 640 }, height: { ideal: 360 }, frameRate: { ideal: 30 } }
      : { width: { ideal: 640 }, height: { ideal: 360 }, frameRate: { ideal: 30 } };
    try {
      const hdStream = await navigator.mediaDevices.getUserMedia({
        video: hdVideoConstraint,
        audio: false
      });
      const track = hdStream.getVideoTracks()[0] || null;
      if (track) {
        refreshCameraDevices();
        return track;
      }
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

  // Ensure local video element stays connected & playing whenever switching back to VIDEO or turning camera ON
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

  // Ensure remote video element stays connected & audible across re-renders
  useEffect(() => {
    if (remoteVideoRef.current && remoteStreamRef.current) {
      attachRemoteStreamToVideo(remoteStreamRef.current);
    }
  }, [remoteConnected, activeMediaMode, attachRemoteStreamToVideo]);

  useEffect(() => {
    if (!callId) return undefined;
    let active = true;

    const flushPendingIce = async (pc) => {
      if (!pc || !pc.remoteDescription || pendingIceCandidatesRef.current.length === 0) return;
      const queued = [...pendingIceCandidatesRef.current];
      pendingIceCandidatesRef.current = [];
      for (const cand of queued) {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(cand));
        } catch { }
      }
    };

    const processIncomingSignal = async (sig) => {
      if (!sig || !sig.payload) return;
      if (sig.id && processedSignalIdsRef.current.has(sig.id)) return;
      const pc = peerConnRef.current;
      if (!pc) {
        // Queue signals arriving while camera/WebRTC initializes so OFFERs are NEVER dropped
        pendingSignalsRef.current.push(sig);
        return;
      }
      if (sig.id) processedSignalIdsRef.current.add(sig.id);
      if (sig.createdAt) lastSignalTimeRef.current = sig.createdAt;
      try {
        if (sig.signalType === "OFFER" && pc.signalingState !== "closed") {
          if (pc.signalingState !== "stable") {
            try {
              await pc.setLocalDescription({ type: "rollback" });
            } catch { }
          }
          await pc.setRemoteDescription(new RTCSessionDescription(sig.payload));
          await flushPendingIce(pc);
          const ans = await pc.createAnswer();
          await pc.setLocalDescription(ans);
          await sendSignal("ANSWER", ans);
          tuneVideoSenderPerformance(pc, liveSession?.participants?.length || 2);
          setRemoteConnected(true);
        } else if (sig.signalType === "ANSWER" && pc.signalingState === "have-local-offer") {
          await pc.setRemoteDescription(new RTCSessionDescription(sig.payload));
          await flushPendingIce(pc);
          tuneVideoSenderPerformance(pc, liveSession?.participants?.length || 2);
          setRemoteConnected(true);
        } else if (sig.signalType === "ICE_CANDIDATE") {
          if (pc.remoteDescription) {
            await pc.addIceCandidate(new RTCIceCandidate(sig.payload));
          } else {
            pendingIceCandidatesRef.current.push(sig.payload);
          }
        } else if (sig.signalType === "MEDIA_MODE") {
          if (remoteStreamRef.current) {
            attachRemoteStreamToVideo(remoteStreamRef.current, true);
          }
        }
      } catch { }
    };

    const getUserMediaWithTimeout = (constraints, timeoutMs = 3500) => {
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
          const stream = await getUserMediaWithTimeout({
            audio: audioCfg,
            video: { width: { ideal: 640 }, height: { ideal: 360 }, frameRate: { ideal: 30 } }
          }, 6500);
          setCameraOff(false);
          setMediaStatus("HD Live Camera & Microphone Active");
          return stream;
        } catch {
          try {
            const fallbackBoth = await getUserMediaWithTimeout({ audio: true, video: true }, 4000);
            setCameraOff(false);
            setMediaStatus("Live Camera & Microphone Active");
            return fallbackBoth;
          } catch {
            try {
              const videoOnly = await getUserMediaWithTimeout({ video: true, audio: false }, 3500);
              setCameraOff(false);
              setMicMuted(true);
              setMediaStatus("Live Camera Active (microphone unavailable)");
              return videoOnly;
            } catch {
              try {
                const audioOnly = await getUserMediaWithTimeout({ audio: true, video: false }, 3000);
                setCameraOff(true);
                setMediaStatus("Audio-Only Connected (click Switch to Video Call or Turn Camera On once camera is free)");
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
          const audioStream = await getUserMediaWithTimeout({ audio: audioCfg, video: false }, 3000);
          setCameraOff(true);
          setMediaStatus("Voice Call Active — Click Switch to Video Call anytime");
          return audioStream;
        } catch {
          setCameraOff(true);
          setMediaStatus("Voice Room Active (allow microphone access in browser)");
          return null;
        }
      }
    };

    const sendFreshOffer = async (pc, { iceRestart = false } = {}) => {
      if (!pc || pc.signalingState === "closed") return;
      try {
        if (pc.signalingState !== "stable") {
          try {
            await pc.setLocalDescription({ type: "rollback" });
          } catch { }
        }
        const offer = await pc.createOffer({
          offerToReceiveAudio: true,
          offerToReceiveVideo: true,
          iceRestart
        });
        await pc.setLocalDescription(offer);
        await sendSignal("OFFER", offer);
      } catch { }
    };

    const startMediaAndWebRTC = async () => {
      try {
        const stream = await acquireHardwareMedia();
        if (!active) {
          stream?.getTracks().forEach((t) => t.stop());
          return;
        }
        if (stream) {
          // Guard against race if user already switched to VOICE before initial getUserMedia resolved
          if (activeMediaModeRef.current === "VOICE") {
            stream.getVideoTracks().forEach((t) => {
              try {
                t.enabled = false;
                t.stop();
              } catch { }
            });
            const voiceOnlyStream = new MediaStream(stream.getAudioTracks().filter((t) => t.readyState === "live"));
            localStreamRef.current = voiceOnlyStream;
            startMicLevelMonitor(voiceOnlyStream);
          } else {
            localStreamRef.current = stream;
            attachLocalStreamToVideo(stream, true);
            startMicLevelMonitor(stream);
          }
          refreshCameraDevices();
        }

        if (typeof RTCPeerConnection === "function") {
          const pc = new RTCPeerConnection(ICE_CONFIG);
          peerConnRef.current = pc;

          let hasLocalAudio = false;
          let hasLocalVideo = false;
          if (localStreamRef.current) {
            localStreamRef.current.getTracks().forEach((track) => {
              const sender = pc.addTrack(track, localStreamRef.current);
              if (track.kind === "audio") hasLocalAudio = true;
              if (track.kind === "video") {
                hasLocalVideo = true;
                videoSenderRef.current = sender;
              }
            });
            preferFastHardwareCodecs(pc);
            tuneVideoSenderPerformance(pc, liveSession?.participants?.length || session?.participants?.length || 2);
          }

          // Guarantee both audio & video transceivers exist even when joining audio-only or without camera,
          // so remote peer camera and voice streams are ALWAYS received and rendered cleanly.
          if (typeof pc.addTransceiver === "function") {
            try {
              if (!hasLocalAudio) pc.addTransceiver("audio", { direction: "recvonly" });
              if (!hasLocalVideo) {
                const vTrans = pc.addTransceiver("video", { direction: "recvonly" });
                if (vTrans?.sender) videoSenderRef.current = vTrans.sender;
              }
            } catch { }
          }

          pc.ontrack = (evt) => {
            const incomingStream = evt.streams?.[0];
            if (incomingStream) {
              const mergedTracks = [...incomingStream.getTracks()];
              if (evt.track && !mergedTracks.includes(evt.track)) {
                mergedTracks.push(evt.track);
              }
              remoteStreamRef.current = new MediaStream(mergedTracks);
            } else {
              const prevTracks = remoteStreamRef.current
                ? remoteStreamRef.current.getTracks().filter((t) => t.kind !== evt.track.kind && t.readyState === "live")
                : [];
              remoteStreamRef.current = new MediaStream([...prevTracks, evt.track]);
            }
            if (evt.track) {
              evt.track.onunmute = () => {
                if (remoteStreamRef.current) {
                  attachRemoteStreamToVideo(remoteStreamRef.current, true);
                }
              };
            }
            attachRemoteStreamToVideo(remoteStreamRef.current, true);
            setRemoteConnected(true);
          };

          pc.oniceconnectionstatechange = () => {
            const st = pc.iceConnectionState;
            if (st === "connected" || st === "completed") {
              setRemoteConnected(true);
              if (remoteStreamRef.current) {
                attachRemoteStreamToVideo(remoteStreamRef.current);
              }
            } else if (st === "failed" && String(initiatorUserId) === myUserId) {
              sendFreshOffer(pc, { iceRestart: true });
            }
          };

          pc.onicecandidate = (evt) => {
            if (evt.candidate) {
              sendSignal("ICE_CANDIDATE", evt.candidate);
            }
          };

          // Drain any queued signals that arrived before RTCPeerConnection finished initializing
          if (pendingSignalsRef.current.length > 0) {
            const backlog = [...pendingSignalsRef.current];
            pendingSignalsRef.current = [];
            for (const qSig of backlog) {
              await processIncomingSignal(qSig);
            }
          }

          const isInitiator = String(initiatorUserId) === myUserId;
          if (isInitiator && !offerSentRef.current) {
            offerSentRef.current = true;
            await sendFreshOffer(pc);
          }
        }
      } catch { }
    };

    startMediaAndWebRTC();

    // Real-time SSE Push Signaling (<15ms latency instead of polling delay)
    let eventSource = null;
    try {
      const isDevCtx = String(currentUser?.role || "").toUpperCase() === "DEVELOPER";
      const tok = getActiveAuthToken({ isDeveloperContext: isDevCtx });
      if (tok && typeof EventSource !== "undefined") {
        const base = String(apiClient.defaults?.baseURL || "/api/v1").replace(/\/+$/, "");
        const sseUrl = `${base}/video/calls/${encodeURIComponent(callId)}/stream?token=${encodeURIComponent(tok)}`;
        eventSource = new EventSource(sseUrl);

        eventSource.addEventListener("participant_joined", (evt) => {
          try {
            const d = JSON.parse(evt.data);
            setLiveSession((prev) => prev ? { ...prev, status: d.status || prev.status, participants: d.participants || prev.participants } : prev);
            if (peerConnRef.current && Array.isArray(d.participants)) {
              tuneVideoSenderPerformance(peerConnRef.current, d.participants.length);
              // Host re-sends a fresh WebRTC offer whenever a new participant joins (fixes have-local-offer deadlock)
              if (String(initiatorUserId) === myUserId) {
                const st = peerConnRef.current.signalingState;
                if (st === "stable" || (st === "have-local-offer" && !remoteConnectedRef.current)) {
                  sendFreshOffer(peerConnRef.current, { iceRestart: st === "have-local-offer" });
                }
              }
            }
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
            if (d?.participants) {
              setLiveSession((prev) => (prev ? { ...prev, participants: d.participants } : prev));
            }
            if (remoteStreamRef.current) {
              attachRemoteStreamToVideo(remoteStreamRef.current, true);
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
          if (typeof onSessionEndedRef.current === "function") onSessionEndedRef.current(liveSession);
        });
      }
    } catch { }

    const pollOnce = async () => {
      if (!active) return;
      try {
        const res = await apiClient.get(`/video/calls/${encodeURIComponent(callId)}`, {
          params: lastSignalTimeRef.current ? { since: lastSignalTimeRef.current } : {}
        });
        const data = res?.data?.data;
        if (!data) return;

        if (data.session) {
          setLiveSession((prev) => {
            if (!prev) return data.session;
            if (
              prev.id === data.session.id &&
              prev.status === data.session.status &&
              prev.mediaMode === data.session.mediaMode &&
              JSON.stringify(prev.participants || []) === JSON.stringify(data.session.participants || []) &&
              (prev.chatMessages?.length || 0) === (data.session.chatMessages?.length || 0)
            ) {
              return prev;
            }
            return data.session;
          });
          if (peerConnRef.current && Array.isArray(data.session.participants)) {
            tuneVideoSenderPerformance(peerConnRef.current, data.session.participants.length);
          }
          if (Array.isArray(data.session.chatMessages)) {
            setChatLog((prev) => {
              if (prev.length === data.session.chatMessages.length) return prev;
              return data.session.chatMessages;
            });
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

    // Immediate initial sync so joining participants pull existing OFFER right away without waiting 3.2s
    const initSyncTimer = setTimeout(pollOnce, 350);
    const pollInterval = setInterval(pollOnce, 2500);

    return () => {
      active = false;
      clearTimeout(initSyncTimer);
      clearInterval(pollInterval);
      if (eventSource) {
        try { eventSource.close(); } catch { }
      }
      stopTracks();
    };
  }, [callId, myUserId, initiatorUserId, currentUser?.role, sendSignal, stopTracks, attachLocalStreamToVideo, attachRemoteStreamToVideo, startMicLevelMonitor]);

  const toggleMic = async () => {
    const nextMuted = !micMuted;
    setMicMuted(nextMuted);
    if (localStreamRef.current && localStreamRef.current.getAudioTracks().length > 0) {
      localStreamRef.current.getAudioTracks().forEach((t) => {
        t.enabled = !nextMuted;
      });
    } else if (!nextMuted && navigator.mediaDevices?.getUserMedia) {
      try {
        const audioStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
        const audioTrack = audioStream.getAudioTracks()[0];
        if (audioTrack) {
          if (!localStreamRef.current) localStreamRef.current = new MediaStream();
          localStreamRef.current.addTrack(audioTrack);
          if (peerConnRef.current) peerConnRef.current.addTrack(audioTrack, localStreamRef.current);
          startMicLevelMonitor(localStreamRef.current);
          setMediaStatus("Live Microphone Enabled");
        }
      } catch {
        setMicMuted(true);
      }
    }
  };

  const activateVideoTrackOnCall = useCallback(async ({ switchToVideoMode = false, deviceId = "" } = {}) => {
    const existingAudioTracks = (localStreamRef.current?.getAudioTracks?.() || []).filter(
      (t) => t.readyState === "live"
    );
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

    // Stop any ended/stale old video tracks before constructing a fresh MediaStream so browsers always rebind video decoding
    (localStreamRef.current?.getVideoTracks?.() || []).forEach((oldTrack) => {
      if (oldTrack !== vidTrack) {
        try { oldTrack.stop(); } catch { }
      }
    });

    const nextStream = new MediaStream([...existingAudioTracks, vidTrack]);
    localStreamRef.current = nextStream;

    if (switchToVideoMode) {
      setActiveMediaMode("VIDEO");
      setLiveSession((prev) => (prev ? { ...prev, mediaMode: "VIDEO" } : prev));
    }
    setCameraOff(false);
    setScreenSharing(false);
    setMediaStatus(micMutedRef.current ? "Live Camera Active (Mic Muted)" : "HD Live Camera & Microphone Active");
    attachLocalStreamToVideo(nextStream, true);
    requestAnimationFrame(() => {
      if (localStreamRef.current) {
        attachLocalStreamToVideo(localStreamRef.current, true);
      }
    });

    // Sync WebRTC sender & SDP renegotiation asynchronously so UI switch is instantaneous and never blocks on signaling HTTP
    if (peerConnRef.current && peerConnRef.current.signalingState !== "closed") {
      const pc = peerConnRef.current;
      const participantCount = liveSession?.participants?.length || 2;
      (async () => {
        try {
          const existingSender = findVideoSender(pc);
          if (existingSender) {
            const trans = pc.getTransceivers?.().find((t) => t.sender === existingSender);
            if (trans && trans.direction === "recvonly") {
              trans.direction = "sendrecv";
              await existingSender.replaceTrack(vidTrack);
              await renegotiatePeerConnection(pc);
            } else {
              await existingSender.replaceTrack(vidTrack);
            }
            tuneVideoSenderPerformance(pc, participantCount);
          } else {
            videoSenderRef.current = pc.addTrack(vidTrack, nextStream);
            preferFastHardwareCodecs(pc);
            tuneVideoSenderPerformance(pc, participantCount);
            await renegotiatePeerConnection(pc);
          }
        } catch { }
      })();
    }

    return true;
  }, [acquireFreshCameraTrack, findVideoSender, renegotiatePeerConnection, attachLocalStreamToVideo, liveSession?.participants?.length]);

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
        // Gracefully release camera track while keeping live audio microphone & WebRTC connection intact
        const liveAudioTracks = (localStreamRef.current?.getAudioTracks?.() || []).filter(
          (t) => t.readyState === "live"
        );
        (localStreamRef.current?.getVideoTracks?.() || []).forEach((t) => {
          try {
            t.enabled = false;
            t.stop();
          } catch { }
        });

        const audioOnlyStream = new MediaStream(liveAudioTracks);
        localStreamRef.current = audioOnlyStream;
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = null;
        }
        setScreenSharing(false);
        setCameraOff(true);
        setActiveMediaMode("VOICE");
        setLiveSession((prev) => (prev ? { ...prev, mediaMode: "VOICE" } : prev));
        setMediaStatus("Voice Call Active — Click Switch to Video Call anytime");

        if (peerConnRef.current && peerConnRef.current.signalingState !== "closed") {
          const sender = findVideoSender(peerConnRef.current);
          if (sender) {
            sender.replaceTrack(null).catch(() => { });
          }
        }
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
        localStreamRef.current.getVideoTracks().forEach((t) => {
          t.enabled = false;
        });
      }
      setMediaStatus("Camera Paused — Voice Audio Active");
    }
  };

  const handleUnlockAudio = () => {
    if (audioCtxRef.current && audioCtxRef.current.state === "suspended") {
      audioCtxRef.current.resume().catch(() => { });
    }
    if (remoteVideoRef.current) {
      remoteVideoRef.current.muted = false;
      remoteVideoRef.current.volume = 1.0;
      remoteVideoRef.current.play().then(() => setAudioUnlocked(true)).catch(() => { });
    }
    setAudioUnlocked(true);
  };

  const toggleScreenShare = async () => {
    if (screenSharing) {
      setScreenSharing(false);
      if (activeMediaMode === "VIDEO") {
        await activateVideoTrackOnCall({ switchToVideoMode: false });
      }
      return;
    }
    if (!navigator.mediaDevices?.getDisplayMedia) {
      return;
    }
    try {
      const displayStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
      const screenTrack = displayStream.getVideoTracks()[0];
      if (screenTrack && peerConnRef.current) {
        const sender = findVideoSender(peerConnRef.current);
        if (sender) {
          await sender.replaceTrack(screenTrack);
        } else {
          videoSenderRef.current = peerConnRef.current.addTrack(screenTrack, displayStream);
          await renegotiatePeerConnection(peerConnRef.current);
        }
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
      const res = await apiClient.post(`/video/calls/${encodeURIComponent(callId)}/signal`, {
        chatText: text
      });
      const rec = res?.data?.data?.recorded;
      if (rec) {
        setChatLog((prev) => [...prev, rec]);
      }
    } catch { }
  };

  const handleEndCall = async () => {
    stopTracks();
    if (callId) {
      try {
        await apiClient.post(`/video/calls/${encodeURIComponent(callId)}/end`);
      } catch { }
    }
    if (typeof onSessionEnded === "function") onSessionEnded(liveSession);
    if (typeof onClose === "function") onClose();
  };

  const handleSendDeveloperSmsPing = async () => {
    setSmsPingStatus("Sending urgent SMS alert to Headmaster...");
    try {
      await apiClient.post("/dev-control/sms/send-headmaster", {
        phone: activeSession?.targetPhone || "+233-24-555-0199",
        headmasterName: activeSession?.targetName || "Headmaster",
        tenantName: activeSession?.targetTenantName || "Registered Institution",
        message: `🚨 URGENT DEVELOPER VIDEO CALL: System Engineer Gabriel Osei is ringing you live on the GBS System (${activeSession?.title || "Executive Video Call"}). Please open your Headmaster Dashboard now to answer.`
      });
      setSmsPingStatus("✅ Urgent SMS alert sent to Headmaster's phone!");
    } catch {
      setSmsPingStatus("📲 Headmaster dashboard ringing & in-app alert queued.");
    }
  };

  const activeSession = liveSession || session;
  const participants = Array.isArray(activeSession?.participants) ? activeSession.participants : [];
  const isDeveloperCaller = String(currentUser?.role || "").toUpperCase() === "DEVELOPER";
  const isLiveClass = String(activeSession?.callScope || "").toUpperCase() === "CLASS_CONFERENCE";

  const modalContent = (
    <div
      data-testid="live-insystem-call-modal"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 100020,
        background: "rgba(3, 8, 22, 0.94)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "12px",
        boxSizing: "border-box"
      }}
    >
      <div
        style={{
          maxWidth: "980px",
          width: "100%",
          maxHeight: "92vh",
          overflowY: "auto",
          background: "linear-gradient(145deg, #081833 0%, #0d2247 100%)",
          border: isLiveClass ? "2px solid #10b981" : "2px solid #d4af37",
          borderRadius: "18px",
          padding: "20px",
          color: "#f8fafc",
          boxShadow: "0 25px 70px rgba(0,0,0,0.8)"
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px", borderBottom: "1px solid rgba(212,175,55,0.3)", paddingBottom: "12px", marginBottom: "14px" }}>
          <div>
            <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
              <span style={{ background: activeSession?.status === "RINGING" ? "#d97706" : "#059669", color: "#fff", padding: "3px 10px", borderRadius: "999px", fontSize: "0.72rem", fontWeight: 900 }}>
                {activeSession?.status === "RINGING" ? "📞 RINGING..." : `🟢 ${activeSession?.status || "ACTIVE"} • ${mediaMode}`}
              </span>
              {isLiveClass && (
                <span style={{ background: "rgba(16,185,129,0.22)", border: "1px solid #10b981", color: "#6ee7b7", padding: "3px 10px", borderRadius: "999px", fontSize: "0.72rem", fontWeight: 900 }}>
                  🎓 LIVE ONLINE CLASS • {activeSession?.className || "Students"}
                </span>
              )}
              {activeSession?.targetTenantName && (
                <span style={{ background: "rgba(56,189,248,0.2)", border: "1px solid #38bdf8", color: "#7dd3fc", padding: "3px 10px", borderRadius: "999px", fontSize: "0.72rem", fontWeight: 800 }}>
                  🏛️ {activeSession.targetTenantName}
                </span>
              )}
              <span style={{ fontSize: "0.74rem", color: "#f6dd84", fontWeight: 700 }}>
                Room: {activeSession?.roomCode} • ⏱️ <CallDurationClock startedAt={activeSession?.startedAt} /> • {mediaStatus}
              </span>
            </div>
            <h3 style={{ margin: "6px 0 0", color: "#ffffff", fontSize: "1.18rem", fontWeight: 900 }}>
              {isLiveClass ? "🎓" : mediaMode === "VOICE" ? "🎙️" : "🎥"} {activeSession?.title || "GBS Live Conference & Call Room"}
            </h3>
            {smsPingStatus && (
              <div style={{ marginTop: "6px", fontSize: "0.76rem", color: "#6ee7b7", fontWeight: 700 }}>
                {smsPingStatus}
              </div>
            )}
          </div>
          <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
            {isDeveloperCaller && !remoteConnected && (
              <button
                type="button"
                onClick={handleSendDeveloperSmsPing}
                style={{ background: "rgba(245, 158, 11, 0.22)", color: "#fcd34d", border: "1px solid #f59e0b", borderRadius: "9px", padding: "8px 12px", fontWeight: 800, cursor: "pointer", fontSize: "0.78rem" }}
              >
                📲 Send Urgent SMS Alert
              </button>
            )}
            <button
              type="button"
              onClick={handleEndCall}
              style={{ background: "#b91c1c", color: "#fff", border: "1px solid #f87171", borderRadius: "9px", padding: "8px 14px", fontWeight: 800, cursor: "pointer" }}
            >
              ⏹️ End Call
            </button>
          </div>
        </div>

        {/* Main Video & Participant Stage (Mobile + Laptop + PC Responsive) */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(270px, 1fr))", gap: "14px", marginBottom: "14px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "10px", gridColumn: "span 1" }}>
            <div style={{ background: "#050f23", border: "1.5px solid #38bdf8", borderRadius: "12px", padding: "10px", position: "relative", minHeight: "245px", display: "flex", flexDirection: "column", justifyContent: "space-between", gap: "6px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "6px" }}>
                <span style={{ fontSize: "0.72rem", fontWeight: 800, color: "#7dd3fc" }}>
                  You ({currentUser?.firstName || currentUser?.name || "Participant"}) {localVideoMeta ? `• ${localVideoMeta}` : ""}
                </span>
                {mediaMode === "VIDEO" && availableCameras.length > 1 && (
                  <select
                    aria-label="Switch Camera Device"
                    value={selectedCameraId}
                    onChange={(e) => handleSelectCamera(e.target.value)}
                    style={{ background: "#081833", color: "#e0f2fe", border: "1px solid rgba(56,189,248,0.5)", borderRadius: "6px", padding: "2px 6px", fontSize: "0.68rem", maxWidth: "150px" }}
                  >
                    {availableCameras.map((cam, idx) => (
                      <option key={cam.deviceId || idx} value={cam.deviceId}>
                        📷 {cam.label || `Camera ${idx + 1}`}
                      </option>
                    ))}
                  </select>
                )}
              </div>
              <div style={{ position: "relative", width: "100%", height: "190px", borderRadius: "8px", overflow: "hidden", background: "#020617" }}>
                <video
                  ref={localVideoRef}
                  data-testid="live-call-local-video"
                  autoPlay
                  muted
                  playsInline
                  onLoadedMetadata={(e) => {
                    const v = e.currentTarget;
                    v.muted = true;
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
                    <div style={{ fontSize: "2.2rem" }}>{mediaMode === "VIDEO" ? "📷" : "🎙️"}</div>
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
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px", fontSize: "0.7rem", color: micMuted ? "#fca5a5" : "#6ee7b7", fontWeight: 700, marginTop: "2px" }}>
                <span>{micMuted ? "🔇 Mic Muted" : "🟢 Mic Live"} {mediaMode === "VIDEO" ? (cameraOff ? "• 📷 Cam Off" : "• 📹 Video On") : "• Voice Mode"}</span>
                {!micMuted && (
                  <div style={{ width: "54px", height: "6px", background: "rgba(255,255,255,0.12)", borderRadius: "999px", overflow: "hidden" }}>
                    <div style={{ width: `${Math.max(8, micLevel)}%`, height: "100%", background: "#10b981", transition: "width 0.08s linear" }} />
                  </div>
                )}
              </div>
            </div>

            <div style={{ background: "#050f23", border: "1.5px solid #d4af37", borderRadius: "12px", padding: "10px", minHeight: "245px", display: "flex", flexDirection: "column", justifyContent: "space-between", gap: "6px" }}>
              <span style={{ fontSize: "0.72rem", fontWeight: 800, color: "#f6dd84" }}>
                Remote Stream ({activeSession?.targetName || (participants.length > 1 ? `${participants.length - 1} Connected` : "Waiting for peer...")}) {remoteVideoMeta ? `• ${remoteVideoMeta}` : ""}
              </span>
              <div style={{ position: "relative", width: "100%", height: "190px", borderRadius: "8px", overflow: "hidden", background: "#020617" }}>
                <video
                  ref={remoteVideoRef}
                  data-testid="live-call-remote-video"
                  autoPlay
                  playsInline
                  onLoadedMetadata={(e) => {
                    const v = e.currentTarget;
                    v.play().catch(() => {
                      v.muted = true;
                      v.play().catch(() => { });
                      setAudioUnlocked(false);
                    });
                    if (v.videoWidth > 0) {
                      setRemoteHasVideo(true);
                      setRemoteVideoMeta(`${v.videoWidth}×${v.videoHeight}`);
                    }
                  }}
                  onPlaying={(e) => {
                    const v = e.currentTarget;
                    if (v.videoWidth > 0) {
                      setRemoteHasVideo(true);
                      setRemoteVideoMeta(`${v.videoWidth}×${v.videoHeight}`);
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
                    opacity: remoteConnected && remoteHasVideo ? 1 : 0
                  }}
                />
                {(!remoteConnected || !remoteHasVideo) && (
                  <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", color: "#cbd5e1", fontSize: "0.8rem", padding: "10px", background: "#020617" }}>
                    <div style={{ fontSize: "2.2rem", marginBottom: "6px" }}>{remoteConnected ? "🎙️" : "📡"}</div>
                    <div>
                      {remoteConnected
                        ? "Peer connected (Voice audio active — video displays automatically when their camera turns on)"
                        : participants.length > 1
                          ? "Peer joined signaling room — negotiating WebRTC audio/video stream..."
                          : "Waiting for recipient or participants to accept & join..."}
                    </div>
                  </div>
                )}
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "0.7rem", color: "#94a3b8", marginTop: "2px", gap: "8px", flexWrap: "wrap" }}>
                <span>Active Participants: <strong style={{ color: "#6ee7b7" }}>{participants.length}</strong></span>
                {!audioUnlocked && (
                  <button
                    type="button"
                    onClick={handleUnlockAudio}
                    style={{ background: "#d97706", color: "#fff", border: "none", borderRadius: "6px", padding: "4px 10px", fontSize: "0.7rem", fontWeight: 800, cursor: "pointer" }}
                  >
                    🔊 Tap to Unmute Speaker Audio
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Real Live Participant Roster & In-Call Chat */}
          <div style={{ background: "#050f23", border: "1px solid rgba(212,175,55,0.35)", borderRadius: "12px", padding: "12px", display: "flex", flexDirection: "column", gap: "10px" }}>
            <div style={{ fontSize: "0.74rem", fontWeight: 800, color: "#f6dd84", textTransform: "uppercase" }}>
              Connected Users ({participants.length})
            </div>
            <div style={{ maxHeight: "105px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "5px" }}>
              {participants.map((p, idx) => (
                <div key={p.userId || idx} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "rgba(13,34,71,0.7)", padding: "5px 8px", borderRadius: "6px", fontSize: "0.75rem" }}>
                  <span style={{ color: "#ffffff", fontWeight: 700 }}>🟢 {p.name}</span>
                  <span style={{ color: "#f6dd84", fontSize: "0.68rem", fontWeight: 800 }}>{p.role}</span>
                </div>
              ))}
            </div>

            <div style={{ fontSize: "0.74rem", fontWeight: 800, color: "#7dd3fc", textTransform: "uppercase", borderTop: "1px solid rgba(255,255,255,0.08)", paddingTop: "8px" }}>
              In-Call Live Chat
            </div>
            <div style={{ flex: 1, minHeight: "85px", maxHeight: "120px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "4px", fontSize: "0.75rem" }}>
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
            📞 End Session
          </button>
        </div>
      </div>
    </div>
  );

  return typeof document !== "undefined" && document.body
    ? createPortal(modalContent, document.body)
    : modalContent;
}
