import React, { useState, useEffect, useRef } from "react";
import "./StudentCooperativeConferenceModal.css";

const PRESET_STUDY_ROOMS = [
  {
    id: "STEM-101",
    name: "🔬 STEM & Mathematics Problem Solving Circle",
    category: "Cooperative Learning",
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
    subject: "French, Spanish & Twi Conversation",
    activePeers: 3,
    host: "Marie Dubois (Grade 10)",
    description: "Interactive voice conversational practice, vocabulary drills, and cultural storytelling in foreign languages.",
    roomCode: "LANG-7214"
  }
];

export default function StudentCooperativeConferenceModal({ isOpen, onClose, initialRoom = null, initialMode = "VIDEO" }) {
  const [activeRoom, setActiveRoom] = useState(initialRoom || PRESET_STUDY_ROOMS[0]);
  const [callMode, setCallMode] = useState(initialMode || "VIDEO"); // "VOICE" | "VIDEO"
  const [inCall, setInCall] = useState(false);
  const [callDuration, setCallDuration] = useState(0);

  useEffect(() => {
    if (initialRoom) setActiveRoom(initialRoom);
    if (initialMode) setCallMode(initialMode);
  }, [initialRoom, initialMode, isOpen]);

  // Hardware Media States
  const [isMicMuted, setIsMicMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isHandRaised, setIsHandRaised] = useState(false);

  // Tabs inside call
  const [activeSideTab, setActiveSideTab] = useState("chat"); // "chat" | "notes" | "peers"

  // Collaborative Notes Pad
  const [studyNotes, setStudyNotes] = useState(
    "📝 COOPERATIVE STUDY NOTES & SCRATCHPAD\n• Room: STEM & Mathematics Problem Solving Circle\n• Topic: Solving Polynomial Equations & Newton's 2nd Law\n• Key Point 1: F = m*a (acceleration is inversely proportional to mass)\n• Key Point 2: Factor theorem: If f(c) = 0, then (x - c) is a factor\n• Questions for Teacher tomorrow: Review Example 4 on Page 142!"
  );
  const [notesCopied, setNotesCopied] = useState(false);

  // Group Social Chat
  const [chatMessages, setChatMessages] = useState([
    { sender: "Kwame Mensah", time: "10:14 AM", text: "Hey everyone! Let's review the calculus problem on page 45.", avatar: "👨‍🎓" },
    { sender: "Amina Yusuf", time: "10:15 AM", text: "I have the solution ready, let me share screen if you need it!", avatar: "👩‍🎓" },
    { sender: "System Sentinel", time: "10:16 AM", text: "Encrypted WebRTC Audio/Video Cooperative Tunnel Connected.", avatar: "🛡️" }
  ]);
  const [newChatText, setNewChatText] = useState("");

  // Custom Room Input
  const [customRoomCode, setCustomRoomCode] = useState("");
  const [customRoomTopic, setCustomRoomTopic] = useState("");

  // Media Stream Refs
  const localVideoRef = useRef(null);
  const localStreamRef = useRef(null);
  const switchingModeRef = useRef(false);

  const attachLocalStreamToPreview = (stream) => {
    if (!localVideoRef.current || !stream) return;
    localVideoRef.current.srcObject = stream;
    localVideoRef.current.muted = true;
    localVideoRef.current.playsInline = true;
    localVideoRef.current.play().catch(() => { });
  };

  const acquireFreshVideoTrack = async () => {
    if (!navigator.mediaDevices || typeof navigator.mediaDevices.getUserMedia !== "function") {
      return null;
    }
    try {
      const hdStream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 360 }, frameRate: { ideal: 30 } },
        audio: false
      });
      const track = hdStream.getVideoTracks()[0] || null;
      if (track) return track;
    } catch { }
    try {
      const basicStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      return basicStream.getVideoTracks()[0] || null;
    } catch {
      return null;
    }
  };

  // Re-attach live MediaStream whenever <video> mounts/re-mounts after switching Voice -> Video or turning Camera ON
  useEffect(() => {
    if (!inCall || callMode !== "VIDEO" || isCameraOff || !localStreamRef.current) return undefined;
    attachLocalStreamToPreview(localStreamRef.current);
    const rafId = requestAnimationFrame(() => {
      if (localStreamRef.current && localVideoRef.current) {
        attachLocalStreamToPreview(localStreamRef.current);
      }
    });
    return () => cancelAnimationFrame(rafId);
  }, [inCall, callMode, isCameraOff]);

  // Timer for active call
  useEffect(() => {
    let timer = null;
    if (inCall) {
      timer = setInterval(() => {
        setCallDuration((prev) => prev + 1);
      }, 1000);
    } else {
      setCallDuration(0);
    }
    return () => clearInterval(timer);
  }, [inCall]);

  // Clean up streams on close
  useEffect(() => {
    if (!isOpen) {
      handleEndCall();
    }
  }, [isOpen]);

  const handleStartCall = async (mode = "VIDEO", room = null) => {
    const targetRoom = room || activeRoom;
    setActiveRoom(targetRoom);
    setCallMode(mode);
    setIsMicMuted(false);
    setIsCameraOff(mode === "VOICE");
    setInCall(true);

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((t) => {
        try { t.stop(); } catch { }
      });
      localStreamRef.current = null;
    }

    if (mode === "VIDEO") {
      try {
        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
          const stream = await navigator.mediaDevices.getUserMedia({
            video: { width: { ideal: 640 }, height: { ideal: 360 }, frameRate: { ideal: 30, min: 24 } },
            audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true }
          });
          localStreamRef.current = stream;
          attachLocalStreamToPreview(stream);
        }
      } catch (err) {
        try {
          const basic = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
          localStreamRef.current = basic;
          attachLocalStreamToPreview(basic);
        } catch {
          console.warn("Hardware camera unavailable, operating in simulated video preview mode:", err.message);
        }
      }
    } else {
      // Voice only mode
      try {
        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
          localStreamRef.current = stream;
        }
      } catch (err) {
        console.warn("Microphone access notice:", err.message);
      }
    }
  };

  const handleSwitchCallMode = async (nextMode) => {
    if (switchingModeRef.current) return;
    switchingModeRef.current = true;
    try {
      if (nextMode === "VOICE") {
        const liveAudioTracks = (localStreamRef.current?.getAudioTracks?.() || []).filter(
          (t) => t.readyState === "live"
        );
        (localStreamRef.current?.getVideoTracks?.() || []).forEach((t) => {
          try {
            t.enabled = false;
            t.stop();
          } catch { }
        });
        localStreamRef.current = new MediaStream(liveAudioTracks);
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = null;
        }
        setIsScreenSharing(false);
        setIsCameraOff(true);
        setCallMode("VOICE");
      } else {
        const liveAudioTracks = (localStreamRef.current?.getAudioTracks?.() || []).filter(
          (t) => t.readyState === "live"
        );
        let vidTrack = (localStreamRef.current?.getVideoTracks?.() || []).find(
          (t) => t.readyState === "live"
        );
        if (vidTrack) {
          vidTrack.enabled = true;
        } else {
          vidTrack = await acquireFreshVideoTrack();
        }
        if (vidTrack) {
          const nextStream = new MediaStream([...liveAudioTracks, vidTrack]);
          localStreamRef.current = nextStream;
          setIsCameraOff(false);
          setCallMode("VIDEO");
          requestAnimationFrame(() => attachLocalStreamToPreview(nextStream));
        } else {
          setIsCameraOff(true);
          setCallMode("VIDEO");
        }
      }
    } finally {
      switchingModeRef.current = false;
    }
  };

  const handleToggleCamera = async () => {
    if (isCameraOff) {
      const liveAudioTracks = (localStreamRef.current?.getAudioTracks?.() || []).filter(
        (t) => t.readyState === "live"
      );
      let vidTrack = (localStreamRef.current?.getVideoTracks?.() || []).find(
        (t) => t.readyState === "live"
      );
      if (vidTrack) {
        vidTrack.enabled = true;
        setIsCameraOff(false);
        requestAnimationFrame(() => attachLocalStreamToPreview(localStreamRef.current));
      } else {
        vidTrack = await acquireFreshVideoTrack();
        if (vidTrack) {
          const nextStream = new MediaStream([...liveAudioTracks, vidTrack]);
          localStreamRef.current = nextStream;
          setIsCameraOff(false);
          requestAnimationFrame(() => attachLocalStreamToPreview(nextStream));
        }
      }
    } else {
      if (localStreamRef.current) {
        localStreamRef.current.getVideoTracks().forEach((t) => {
          t.enabled = false;
        });
      }
      setIsCameraOff(true);
    }
  };

  const handleEndCall = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
      localStreamRef.current = null;
    }
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = null;
    }
    setInCall(false);
    setIsScreenSharing(false);
    setIsHandRaised(false);
  };

  const handleToggleScreenShare = async () => {
    if (!isScreenSharing) {
      try {
        if (navigator.mediaDevices && navigator.mediaDevices.getDisplayMedia) {
          const stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
          if (localVideoRef.current) {
            localVideoRef.current.srcObject = stream;
            localVideoRef.current.play().catch(() => { });
          }
          const track = stream.getVideoTracks()[0];
          if (track) {
            track.onended = () => {
              setIsScreenSharing(false);
              if (localStreamRef.current && localVideoRef.current) {
                localVideoRef.current.srcObject = localStreamRef.current;
              }
            };
          }
          setIsScreenSharing(true);
        }
      } catch (err) {
        console.warn("Screen share cancel or rejected:", err.message);
      }
    } else {
      setIsScreenSharing(false);
      if (localStreamRef.current && localVideoRef.current) {
        localVideoRef.current.srcObject = localStreamRef.current;
      }
    }
  };

  const handleSendChatMessage = (e) => {
    if (e) e.preventDefault();
    if (!newChatText.trim()) return;
    const user = JSON.parse(localStorage.getItem("gbs_user") || "{}");
    const name = `${user.firstName || "Scholar"} ${user.lastName || ""}`.trim() || "You";
    const now = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

    setChatMessages((prev) => [
      ...prev,
      { sender: name, time: now, text: newChatText.trim(), avatar: "🎓" }
    ]);
    setNewChatText("");
  };

  const handleSendEmojiReaction = (emoji) => {
    const user = JSON.parse(localStorage.getItem("gbs_user") || "{}");
    const name = `${user.firstName || "Scholar"}`.trim();
    const now = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    setChatMessages((prev) => [
      ...prev,
      { sender: name, time: now, text: `Reacted with ${emoji}`, avatar: emoji }
    ]);
  };

  const handleCopyNotes = () => {
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(studyNotes);
      setNotesCopied(true);
      setTimeout(() => setNotesCopied(false), 2000);
    }
  };

  const handleCreateCustomRoom = (e) => {
    if (e) e.preventDefault();
    if (!customRoomTopic.trim()) return;
    const newCode = customRoomCode.trim().toUpperCase() || `STU-${Math.floor(1000 + Math.random() * 9000)}`;
    const newRoom = {
      id: "CUSTOM-" + Date.now(),
      name: `✨ ${customRoomTopic.trim()}`,
      category: "Cooperative Learning",
      subject: "Custom Scholar Study Group",
      activePeers: 1,
      host: "You (Active Host)",
      description: `Student-initiated cooperative workspace for ${customRoomTopic.trim()}.`,
      roomCode: newCode
    };
    handleStartCall(callMode, newRoom);
    setCustomRoomTopic("");
    setCustomRoomCode("");
  };

  const formatTimer = (sec) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m < 10 ? "0" : ""}${m}:${s < 10 ? "0" : ""}${s}`;
  };

  if (!isOpen) return null;

  return (
    <div className="coop-modal-backdrop">
      <div className="coop-modal-container">
        {/* Header Bar */}
        <div className="coop-modal-header">
          <div className="coop-modal-brand">
            <span className="coop-brand-badge">STUDENT NETWORK</span>
            <h2>STUDENT COOPERATIVE LEARNING & SOCIAL CONFERENCING HUB</h2>
            <p className="coop-brand-sub">
              Obey peer commands: Seamless Voice Calling & HD Video Conferencing for cooperative study, debates & student socializing
            </p>
          </div>
          <button type="button" className="coop-btn-close" onClick={onClose}>
            ✕ Close Hub
          </button>
        </div>

        {!inCall ? (
          /* =========================================================================
             PRE-CALL LOBBY & COOPERATIVE STUDY ROOMS SELECTOR
             ========================================================================= */
          <div className="coop-lobby-body">
            {/* Top Quick Actions Bar */}
            <div className="coop-quick-actions-bar">
              <div className="coop-mode-pill-selector">
                <span className="coop-mode-label">Preferred Calling Mode:</span>
                <button
                  type="button"
                  className={`coop-mode-toggle ${callMode === "VIDEO" ? "active" : ""}`}
                  onClick={() => setCallMode("VIDEO")}
                >
                  📹 Video Calling (HD Camera Grid)
                </button>
                <button
                  type="button"
                  className={`coop-mode-toggle ${callMode === "VOICE" ? "active" : ""}`}
                  onClick={() => setCallMode("VOICE")}
                >
                  🎙️ Voice Calling (Audio Waveform Discussion)
                </button>
              </div>

              <div className="coop-mode-help">
                <span>⚡ Low-Bandwidth Friendly • Obey WebRTC Peer Protocol • Crystal-Clear Audio</span>
              </div>
            </div>

            {/* Main Study Rooms Grid */}
            <div className="coop-rooms-grid">
              {PRESET_STUDY_ROOMS.map((room) => (
                <div key={room.id} className="coop-room-card">
                  <div className="coop-room-card-header">
                    <span className="coop-room-category-pill">{room.category}</span>
                    <span className="coop-room-code-tag">CODE: {room.roomCode}</span>
                  </div>
                  <h3 className="coop-room-title">{room.name}</h3>
                  <div className="coop-room-subject">📚 {room.subject}</div>
                  <p className="coop-room-desc">{room.description}</p>

                  <div className="coop-room-meta">
                    <span className="coop-peers-count">
                      <span className="coop-live-dot"></span> {room.activePeers} Students Active
                    </span>
                    <span className="coop-host-name">Host: {room.host}</span>
                  </div>

                  <div className="coop-room-actions">
                    <button
                      type="button"
                      className="coop-btn-join-video"
                      onClick={() => handleStartCall("VIDEO", room)}
                    >
                      📹 Join Video Call
                    </button>
                    <button
                      type="button"
                      className="coop-btn-join-voice"
                      onClick={() => handleStartCall("VOICE", room)}
                    >
                      🎙️ Join Voice Call
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Create Custom Instant Room Section */}
            <div className="coop-create-room-box">
              <h3>➕ Start an Instant Cooperative Study Room or Student Social Lounge</h3>
              <p>Invite your classmates by entering a study topic or room code to collaborate in real-time.</p>
              <form onSubmit={handleCreateCustomRoom} className="coop-create-form">
                <input
                  type="text"
                  placeholder="Enter Topic (e.g. Grade 10 Math Review, Debate Club, Biology Quiz Prep)"
                  value={customRoomTopic}
                  onChange={(e) => setCustomRoomTopic(e.target.value)}
                  className="coop-input-topic"
                  required
                />
                <input
                  type="text"
                  placeholder="Optional Room Code (e.g. MATH-401)"
                  value={customRoomCode}
                  onChange={(e) => setCustomRoomCode(e.target.value)}
                  className="coop-input-code"
                />
                <button type="submit" className="coop-btn-create-submit">
                  🚀 Launch Cooperative Conference ({callMode === "VIDEO" ? "Video" : "Voice"})
                </button>
              </form>
            </div>
          </div>
        ) : (
          /* =========================================================================
             ACTIVE IN-CALL CONFERENCE (VOICE CALL OR VIDEO CALL)
             ========================================================================= */
          <div className="coop-call-body">
            {/* Call Status Ribbon */}
            <div className="coop-call-ribbon">
              <div className="coop-call-info-left">
                <span className="coop-live-tag">● LIVE {callMode} CONFERENCING</span>
                <span className="coop-room-name-tag">{activeRoom.name}</span>
                <span className="coop-code-tag">Room Code: {activeRoom.roomCode}</span>
              </div>
              <div className="coop-call-info-right">
                <span className="coop-timer-tag">⏱️ {formatTimer(callDuration)}</span>
                <button
                  type="button"
                  data-testid="coop-switch-mode-btn"
                  className="coop-btn-switch-mode"
                  onClick={() => handleSwitchCallMode(callMode === "VIDEO" ? "VOICE" : "VIDEO")}
                >
                  Switch to {callMode === "VIDEO" ? "🎙️ Voice Call" : "📹 Video Call"} Mode
                </button>
              </div>
            </div>

            {/* Split Arena: Left = Stage (Video Grid or Voice Waves), Right = Cooperative Tools */}
            <div className="coop-call-arena">
              {/* Left Column: Stage */}
              <div className="coop-stage-container">
                {callMode === "VIDEO" ? (
                  /* Video Calling Grid */
                  <div className="coop-video-grid">
                    {/* Local Stream Feed */}
                    <div className="coop-video-box local-box">
                      <video
                        ref={localVideoRef}
                        autoPlay
                        playsInline
                        muted
                        className={`coop-video-feed ${isCameraOff ? "hidden" : ""}`}
                      />
                      {isCameraOff && (
                        <div className="coop-camera-off-placeholder">
                          <span className="coop-avatar-circle">🎓</span>
                          <span>You (Camera Muted)</span>
                        </div>
                      )}
                      <div className="coop-video-label">
                        <span>● You (Host Scholar)</span>
                        {isMicMuted && <span className="mic-muted-badge">🔇 Muted</span>}
                        {isHandRaised && <span className="hand-raised-badge">🙋‍♂️ Hand Raised</span>}
                      </div>
                    </div>

                    {/* Remote Peer 1 */}
                    <div className="coop-video-box peer-box">
                      <img
                        src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=500&h=400&fit=crop"
                        alt="Kwame Mensah"
                        className="coop-peer-photo"
                      />
                      <div className="coop-video-label">
                        <span className="pulse-dot"></span> Kwame Mensah (Active Speaker)
                      </div>
                    </div>

                    {/* Remote Peer 2 */}
                    <div className="coop-video-box peer-box">
                      <img
                        src="https://images.unsplash.com/photo-1517841905240-472988babdf9?w=500&h=400&fit=crop"
                        alt="Amina Yusuf"
                        className="coop-peer-photo"
                      />
                      <div className="coop-video-label">
                        <span className="pulse-dot"></span> Amina Yusuf (Cooperative Scholar)
                      </div>
                    </div>

                    {/* Remote Peer 3 */}
                    <div className="coop-video-box peer-box">
                      <img
                        src="https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=500&h=400&fit=crop"
                        alt="Alex Osei"
                        className="coop-peer-photo"
                      />
                      <div className="coop-video-label">
                        <span className="pulse-dot"></span> Alex Osei (STEM Lead)
                      </div>
                    </div>
                  </div>
                ) : (
                  /* Voice Calling Audio Conference Stage */
                  <div className="coop-voice-stage">
                    <div className="coop-voice-header-banner">
                      <div className="coop-voice-soundwave">
                        {[18, 32, 14, 42, 28, 12, 38, 24, 48, 16, 36, 20, 44, 26, 18, 30].map((h, i) => (
                          <div
                            key={i}
                            className="wave-bar"
                            style={{ height: `${h}px`, animationDelay: `${i * 0.08}s` }}
                          />
                        ))}
                      </div>
                      <h3>CRYSTAL-CLEAR VOICE CALL CONFERENCE ACTIVE</h3>
                      <p>Low-bandwidth voice calling optimized for high-school study circles and cooperative discussion.</p>
                    </div>

                    {/* Voice Participant Circles */}
                    <div className="coop-voice-circles-grid">
                      <div className="coop-voice-circle-item active-speaker">
                        <div className="voice-avatar">🎓</div>
                        <span className="voice-name">You (Host)</span>
                        <span className="voice-status">{isMicMuted ? "🔇 Muted" : "🎤 Speaking"}</span>
                      </div>
                      <div className="coop-voice-circle-item active-speaker">
                        <div className="voice-avatar">👨‍🎓</div>
                        <span className="voice-name">Kwame Mensah</span>
                        <span className="voice-status">🎤 Speaking</span>
                      </div>
                      <div className="coop-voice-circle-item">
                        <div className="voice-avatar">👩‍🎓</div>
                        <span className="voice-name">Amina Yusuf</span>
                        <span className="voice-status">🎧 Listening</span>
                      </div>
                      <div className="coop-voice-circle-item">
                        <div className="voice-avatar">🧑‍🎓</div>
                        <span className="voice-name">Alex Osei</span>
                        <span className="voice-status">🎧 Listening</span>
                      </div>
                      <div className="coop-voice-circle-item">
                        <div className="voice-avatar">👧‍🎓</div>
                        <span className="voice-name">Marie Dubois</span>
                        <span className="voice-status">🎧 Listening</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Call Control Center Bar */}
                <div className="coop-controls-bar">
                  <button
                    type="button"
                    className={`coop-control-btn ${isMicMuted ? "danger" : "normal"}`}
                    onClick={() => {
                      if (localStreamRef.current) {
                        const audioTrack = localStreamRef.current.getAudioTracks()[0];
                        if (audioTrack) audioTrack.enabled = !audioTrack.enabled;
                      }
                      setIsMicMuted(!isMicMuted);
                    }}
                  >
                    {isMicMuted ? "🔇 Unmute Mic" : "🎤 Mute Mic"}
                  </button>

                  {callMode === "VIDEO" && (
                    <button
                      type="button"
                      className={`coop-control-btn ${isCameraOff ? "danger" : "normal"}`}
                      onClick={handleToggleCamera}
                    >
                      {isCameraOff ? "📷 Turn Cam ON" : "📷 Turn Cam OFF"}
                    </button>
                  )}

                  <button
                    type="button"
                    className={`coop-control-btn ${isScreenSharing ? "success" : "normal"}`}
                    onClick={handleToggleScreenShare}
                  >
                    {isScreenSharing ? "🖥️ Stop Share" : "🖥️ Share Screen"}
                  </button>

                  <button
                    type="button"
                    className={`coop-control-btn ${isHandRaised ? "warning" : "normal"}`}
                    onClick={() => setIsHandRaised(!isHandRaised)}
                  >
                    {isHandRaised ? "✋ Lower Hand" : "🙋‍♂️ Raise Hand"}
                  </button>

                  <button
                    type="button"
                    className="coop-control-btn end-call"
                    onClick={handleEndCall}
                  >
                    🔴 Leave Conference
                  </button>
                </div>
              </div>

              {/* Right Column: Cooperative Learning & Social Tools (Chat / Notes / Peers) */}
              <div className="coop-tools-sidebar">
                {/* Tabs */}
                <div className="coop-sidebar-tabs">
                  <button
                    type="button"
                    className={`coop-tab-btn ${activeSideTab === "chat" ? "active" : ""}`}
                    onClick={() => setActiveSideTab("chat")}
                  >
                    💬 Live Chat
                  </button>
                  <button
                    type="button"
                    className={`coop-tab-btn ${activeSideTab === "notes" ? "active" : ""}`}
                    onClick={() => setActiveSideTab("notes")}
                  >
                    📝 Shared Notes
                  </button>
                  <button
                    type="button"
                    className={`coop-tab-btn ${activeSideTab === "peers" ? "active" : ""}`}
                    onClick={() => setActiveSideTab("peers")}
                  >
                    👥 Participants ({activeRoom.activePeers + 1})
                  </button>
                </div>

                {/* Tab 1: Live Chat & Social Reactions */}
                {activeSideTab === "chat" && (
                  <div className="coop-tab-content chat-content">
                    {/* Reaction Emojis Row */}
                    <div className="coop-emoji-reactions-bar">
                      <span>Quick React:</span>
                      {["👍", "❤️", "💡", "👏", "🙋‍♂️", "🔥", "💯"].map((em) => (
                        <button
                          key={em}
                          type="button"
                          className="coop-emoji-btn"
                          onClick={() => handleSendEmojiReaction(em)}
                        >
                          {em}
                        </button>
                      ))}
                    </div>

                    <div className="coop-chat-messages-wrap">
                      {chatMessages.map((msg, idx) => (
                        <div key={idx} className="coop-chat-message-item">
                          <span className="msg-avatar">{msg.avatar}</span>
                          <div className="msg-body">
                            <div className="msg-top">
                              <span className="msg-sender">{msg.sender}</span>
                              <span className="msg-time">{msg.time}</span>
                            </div>
                            <div className="msg-text">{msg.text}</div>
                          </div>
                        </div>
                      ))}
                    </div>

                    <form onSubmit={handleSendChatMessage} className="coop-chat-form">
                      <input
                        type="text"
                        placeholder="Type message to study group..."
                        value={newChatText}
                        onChange={(e) => setNewChatText(e.target.value)}
                        className="coop-chat-input"
                      />
                      <button type="submit" className="coop-chat-send-btn">
                        ➤
                      </button>
                    </form>
                  </div>
                )}

                {/* Tab 2: Shared Study Notes & Scratchpad */}
                {activeSideTab === "notes" && (
                  <div className="coop-tab-content notes-content">
                    <div className="coop-notes-header">
                      <span>Live Collaborative Scratchpad:</span>
                      <button
                        type="button"
                        className="coop-btn-copy-notes"
                        onClick={handleCopyNotes}
                      >
                        {notesCopied ? "✅ Copied!" : "📋 Copy Notes"}
                      </button>
                    </div>
                    <textarea
                      value={studyNotes}
                      onChange={(e) => setStudyNotes(e.target.value)}
                      className="coop-notes-textarea"
                      placeholder="Collaborative notes: type formulas, ideas, homework steps..."
                    />
                    <span className="coop-notes-hint">
                      💡 Notes are shared with all students in this room and can be exported cleanly.
                    </span>
                  </div>
                )}

                {/* Tab 3: Participant Roster */}
                {activeSideTab === "peers" && (
                  <div className="coop-tab-content peers-content">
                    <div className="coop-peers-list">
                      <div className="coop-peer-item">
                        <span className="peer-avatar">🎓</span>
                        <div className="peer-details">
                          <span className="peer-name">You (Host Scholar)</span>
                          <span className="peer-role">Active Participant • Grade 10</span>
                        </div>
                        <span className="peer-status-tag">HOST</span>
                      </div>
                      <div className="coop-peer-item">
                        <span className="peer-avatar">👨‍🎓</span>
                        <div className="peer-details">
                          <span className="peer-name">Kwame Mensah</span>
                          <span className="peer-role">Grade 10 STEM • KNUST Enclave</span>
                        </div>
                        <span className="peer-status-tag live">TALKING</span>
                      </div>
                      <div className="coop-peer-item">
                        <span className="peer-avatar">👩‍🎓</span>
                        <div className="peer-details">
                          <span className="peer-name">Amina Yusuf</span>
                          <span className="peer-role">Grade 10 Arts • Lagos Central</span>
                        </div>
                        <span className="peer-status-tag">MUTED</span>
                      </div>
                      <div className="coop-peer-item">
                        <span className="peer-avatar">🧑‍🎓</span>
                        <div className="peer-details">
                          <span className="peer-name">Alex Osei</span>
                          <span className="peer-role">Grade 11 Tech • Silicon Enclave</span>
                        </div>
                        <span className="peer-status-tag">MUTED</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
