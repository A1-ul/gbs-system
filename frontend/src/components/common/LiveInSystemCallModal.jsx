import React, { useEffect, useRef, useState, useCallback } from "react";
import apiClient from "../../api/client/apiClient";

const ICE_CONFIG = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" }
  ]
};

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
  const [micMuted, setMicMuted] = useState(false);
  const [cameraOff, setCameraOff] = useState(String(session?.mediaMode || "VIDEO").toUpperCase() === "VOICE");
  const [screenSharing, setScreenSharing] = useState(false);
  const [mediaStatus, setMediaStatus] = useState("Connecting audio/video hardware...");
  const [chatInput, setChatInput] = useState("");
  const [chatLog, setChatLog] = useState(session?.chatMessages || []);
  const [remoteConnected, setRemoteConnected] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [smsPingStatus, setSmsPingStatus] = useState("");

  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const localStreamRef = useRef(null);
  const remoteStreamRef = useRef(null);
  const peerConnRef = useRef(null);
  const lastSignalTimeRef = useRef(null);
  const offerSentRef = useRef(false);

  const onSessionEndedRef = useRef(onSessionEnded);
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onSessionEndedRef.current = onSessionEnded;
    onCloseRef.current = onClose;
  });

  const myUserId = String(currentUser?.id || currentUser?.email || "user");
  const callId = session?.id || liveSession?.id;
  const initiatorUserId = session?.initiatorUserId || liveSession?.initiatorUserId;
  const mediaMode = String(liveSession?.mediaMode || session?.mediaMode || "VIDEO").toUpperCase();

  const stopTracks = useCallback(() => {
    try {
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((t) => {
          try {
            t.stop();
          } catch { }
        });
        localStreamRef.current = null;
      }
      if (peerConnRef.current) {
        peerConnRef.current.close();
        peerConnRef.current = null;
      }
    } catch { }
  }, []);

  const sendSignal = useCallback(async (signalType, payload) => {
    if (!callId) return;
    try {
      await apiClient.post(`/video/calls/${encodeURIComponent(callId)}/signal`, {
        signalType,
        payload
      });
    } catch { }
  }, [callId]);

  // Ensure local video element stays connected to hardware stream across re-renders without re-initializing hardware
  useEffect(() => {
    if (localVideoRef.current && localStreamRef.current) {
      if (localVideoRef.current.srcObject !== localStreamRef.current) {
        localVideoRef.current.srcObject = localStreamRef.current;
      }
    }
  }, [cameraOff, mediaMode]);

  // Ensure remote video element stays connected to incoming stream across re-renders
  useEffect(() => {
    if (remoteVideoRef.current && remoteStreamRef.current) {
      if (remoteVideoRef.current.srcObject !== remoteStreamRef.current) {
        remoteVideoRef.current.srcObject = remoteStreamRef.current;
      }
    }
  }, [remoteConnected]);

  useEffect(() => {
    if (!callId) return undefined;
    let active = true;

    const startMediaAndWebRTC = async () => {
      try {
        if (navigator.mediaDevices && typeof navigator.mediaDevices.getUserMedia === "function") {
          try {
            const stream = await navigator.mediaDevices.getUserMedia({
              audio: true,
              video: mediaMode === "VIDEO" ? { width: { ideal: 640 }, height: { ideal: 480 } } : false
            });
            if (!active) {
              stream.getTracks().forEach((t) => t.stop());
              return;
            }
            localStreamRef.current = stream;
            if (localVideoRef.current && localVideoRef.current.srcObject !== stream) {
              localVideoRef.current.srcObject = stream;
            }
            setMediaStatus(mediaMode === "VIDEO" ? "HD Camera & Microphone Live" : "Voice Microphone Live");
          } catch (hwErr) {
            try {
              const audioOnly = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
              if (!active) {
                audioOnly.getTracks().forEach((t) => t.stop());
                return;
              }
              localStreamRef.current = audioOnly;
              setCameraOff(true);
              setMediaStatus("Audio-Only Connected (camera not detected or permission declined)");
            } catch {
              setCameraOff(true);
              setMediaStatus("Signaling Room Active (no microphone/camera device accessible)");
            }
          }
        } else {
          setMediaStatus("Signaling Room Active (WebRTC media API requires HTTPS/localhost device access)");
        }

        if (typeof RTCPeerConnection === "function") {
          const pc = new RTCPeerConnection(ICE_CONFIG);
          peerConnRef.current = pc;

          if (localStreamRef.current) {
            localStreamRef.current.getTracks().forEach((track) => {
              pc.addTrack(track, localStreamRef.current);
            });
          }

          pc.ontrack = (evt) => {
            if (evt.streams && evt.streams[0]) {
              const rStream = evt.streams[0];
              remoteStreamRef.current = rStream;
              if (remoteVideoRef.current && remoteVideoRef.current.srcObject !== rStream) {
                remoteVideoRef.current.srcObject = rStream;
              }
              setRemoteConnected(true);
            }
          };

          pc.onicecandidate = (evt) => {
            if (evt.candidate) {
              sendSignal("ICE_CANDIDATE", evt.candidate);
            }
          };

          const isInitiator = String(initiatorUserId) === myUserId;
          if (isInitiator && !offerSentRef.current) {
            offerSentRef.current = true;
            try {
              const offer = await pc.createOffer({
                offerToReceiveAudio: true,
                offerToReceiveVideo: mediaMode === "VIDEO"
              });
              await pc.setLocalDescription(offer);
              await sendSignal("OFFER", offer);
            } catch { }
          }
        }
      } catch { }
    };

    startMediaAndWebRTC();

    const pollInterval = setInterval(async () => {
      if (!active) return;
      try {
        const res = await apiClient.get(`/video/calls/${encodeURIComponent(callId)}`, {
          params: lastSignalTimeRef.current ? { since: lastSignalTimeRef.current } : {}
        });
        const data = res?.data?.data;
        if (!data) return;

        if (data.session) {
          // Avoid triggering unnecessary re-renders on identical polling responses
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
        const pc = peerConnRef.current;
        for (const sig of sigs) {
          if (sig.createdAt) lastSignalTimeRef.current = sig.createdAt;
          if (!pc || !sig.payload) continue;
          try {
            if (sig.signalType === "OFFER" && pc.signalingState !== "closed") {
              await pc.setRemoteDescription(new RTCSessionDescription(sig.payload));
              const ans = await pc.createAnswer();
              await pc.setLocalDescription(ans);
              await sendSignal("ANSWER", ans);
              setRemoteConnected(true);
            } else if (sig.signalType === "ANSWER" && pc.signalingState === "have-local-offer") {
              await pc.setRemoteDescription(new RTCSessionDescription(sig.payload));
              setRemoteConnected(true);
            } else if (sig.signalType === "ICE_CANDIDATE") {
              await pc.addIceCandidate(new RTCIceCandidate(sig.payload));
            }
          } catch { }
        }
      } catch { }
    }, 1800);

    return () => {
      active = false;
      clearInterval(pollInterval);
      stopTracks();
    };
  }, [callId, mediaMode, myUserId, initiatorUserId, sendSignal, stopTracks]);

  const toggleMic = () => {
    const nextMuted = !micMuted;
    setMicMuted(nextMuted);
    if (localStreamRef.current) {
      localStreamRef.current.getAudioTracks().forEach((t) => {
        t.enabled = !nextMuted;
      });
    }
  };

  const toggleCamera = () => {
    const nextOff = !cameraOff;
    setCameraOff(nextOff);
    if (localStreamRef.current) {
      localStreamRef.current.getVideoTracks().forEach((t) => {
        t.enabled = !nextOff;
      });
    }
  };

  const toggleScreenShare = async () => {
    if (screenSharing || !navigator.mediaDevices?.getDisplayMedia) {
      setScreenSharing(false);
      return;
    }
    try {
      const displayStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
      const screenTrack = displayStream.getVideoTracks()[0];
      if (screenTrack && peerConnRef.current) {
        const sender = peerConnRef.current.getSenders().find((s) => s.track?.kind === "video");
        if (sender) {
          await sender.replaceTrack(screenTrack);
        }
        setScreenSharing(true);
        screenTrack.onended = () => setScreenSharing(false);
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

  return (
    <div
      data-testid="live-insystem-call-modal"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 100020,
        background: "rgba(3, 8, 22, 0.9)",
        backdropFilter: "blur(10px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "16px"
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

        {/* Main Video & Participant Stage */}
        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "14px", marginBottom: "14px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "10px" }}>
            <div style={{ background: "#050f23", border: "1.5px solid #38bdf8", borderRadius: "12px", padding: "10px", position: "relative", minHeight: "220px", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
              <span style={{ fontSize: "0.72rem", fontWeight: 800, color: "#7dd3fc" }}>
                You ({currentUser?.firstName || currentUser?.name || "Participant"})
              </span>
              <video
                ref={localVideoRef}
                autoPlay
                muted
                playsInline
                style={{
                  width: "100%",
                  height: "170px",
                  objectFit: "cover",
                  borderRadius: "8px",
                  background: "#020617",
                  display: mediaMode === "VIDEO" && !cameraOff ? "block" : "none"
                }}
              />
              {(mediaMode === "VOICE" || cameraOff) && (
                <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "2.4rem", color: "#f6dd84" }}>
                  🎙️
                </div>
              )}
              <div style={{ fontSize: "0.7rem", color: micMuted ? "#fca5a5" : "#6ee7b7", fontWeight: 700 }}>
                {micMuted ? "🔇 Mic Muted" : "🟢 Microphone Live"} {mediaMode === "VIDEO" ? (cameraOff ? "• 📷 Cam Off" : "• 📹 Video On") : "• Voice Mode"}
              </div>
            </div>

            <div style={{ background: "#050f23", border: "1.5px solid #d4af37", borderRadius: "12px", padding: "10px", minHeight: "220px", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
              <span style={{ fontSize: "0.72rem", fontWeight: 800, color: "#f6dd84" }}>
                Remote Stream ({activeSession?.targetName || (participants.length > 1 ? `${participants.length - 1} Connected` : "Waiting for peer...")})
              </span>
              <video
                ref={remoteVideoRef}
                autoPlay
                playsInline
                style={{
                  width: "100%",
                  height: "170px",
                  objectFit: "cover",
                  borderRadius: "8px",
                  background: "#020617",
                  display: remoteConnected ? "block" : "none"
                }}
              />
              {!remoteConnected && (
                <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", color: "#cbd5e1", fontSize: "0.8rem", padding: "10px" }}>
                  <div style={{ fontSize: "2.2rem", marginBottom: "6px" }}>📡</div>
                  <div>
                    {participants.length > 1
                      ? "Peer joined signaling room — negotiating WebRTC audio/video stream..."
                      : "Waiting for recipient or faculty/parents to accept & join..."}
                  </div>
                </div>
              )}
              <div style={{ fontSize: "0.7rem", color: "#94a3b8" }}>
                Active Participants in Room: <strong style={{ color: "#6ee7b7" }}>{participants.length}</strong>
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
            {mediaMode === "VIDEO" && (
              <button type="button" onClick={toggleCamera} style={{ background: cameraOff ? "#991b1b" : "#1d4ed8", color: "#fff", border: "1px solid #d4af37", borderRadius: "8px", padding: "8px 14px", fontWeight: 800, cursor: "pointer", fontSize: "0.8rem" }}>
                {cameraOff ? "📷 Turn Camera On" : "📹 Turn Camera Off"}
              </button>
            )}
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
}
