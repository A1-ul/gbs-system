import React, { useEffect, useState, useCallback } from "react";
import apiClient from "../../api/client/apiClient";
import LiveInSystemCallModal from "./LiveInSystemCallModal";

/**
 * Reusable Live Voice & Video Call / Conference Launcher and Global Incoming Ringing Receiver.
 * Works across Headmaster (ADMIN), Teacher/Lecturer (TEACHER), and Parent/Guardian (PARENT) dashboards.
 * - variant="GLOBAL_RECEIVER": quietly listens for incoming direct calls / active conferences & shows top call banner.
 * - variant="FULL_STUDIO": renders direct call dialer (Headmaster <-> Parent, Headmaster <-> Teacher, Teacher <-> Parent)
 *   plus 1-click Live Headmaster-Teachers & Parent-Teacher Video/Voice Conference Launcher.
 */
export default function LiveCallLauncherAndReceiver({
  variant = "FULL_STUDIO",
  userRole = "",
  currentUser = null,
  onFeedback = null
}) {
  const resolvedUser = (() => {
    if (currentUser && typeof currentUser === "object") return currentUser;
    try {
      return JSON.parse(localStorage.getItem("gbs_user") || "{}");
    } catch {
      return {};
    }
  })();

  const roleUpper = String(userRole || resolvedUser.role || "").toUpperCase();
  const isHeadmaster = ["ADMIN", "SUPER_ADMIN", "HEADMASTER", "PRINCIPAL"].includes(roleUpper);
  const isTeacher = roleUpper === "TEACHER";
  const isParent = roleUpper === "PARENT";

  const [incomingCalls, setIncomingCalls] = useState([]);
  const [activeConferences, setActiveConferences] = useState([]);
  const [directory, setDirectory] = useState({ contacts: [], headmasters: [], teachers: [], parents: [], staff: [] });
  const [selectedContactId, setSelectedContactId] = useState("");
  const [conferenceTitle, setConferenceTitle] = useState("");
  const [activeModalSession, setActiveModalSession] = useState(null);
  const [busy, setBusy] = useState(false);

  const notify = (msg, isErr = false) => {
    if (typeof onFeedback === "function") onFeedback(msg, isErr);
  };

  const pollIncomingAndConferences = useCallback(async () => {
    try {
      const res = await apiClient.get("/video/calls/incoming");
      const data = res?.data?.data;
      if (data) {
        setIncomingCalls(Array.isArray(data.incomingCalls) ? data.incomingCalls : []);
        setActiveConferences(Array.isArray(data.activeConferences) ? data.activeConferences : []);
      }
    } catch { }
  }, []);

  const loadDirectory = useCallback(async () => {
    if (variant !== "FULL_STUDIO") return;
    try {
      const res = await apiClient.get("/video/calls/directory");
      const data = res?.data?.data;
      if (data) {
        setDirectory(data);
      }
    } catch { }
  }, [variant]);

  const handleCloseCallModal = useCallback(() => {
    setActiveModalSession(null);
    pollIncomingAndConferences();
  }, [pollIncomingAndConferences]);

  const handleCallSessionEnded = useCallback(() => {
    setActiveModalSession(null);
    pollIncomingAndConferences();
  }, [pollIncomingAndConferences]);

  useEffect(() => {
    pollIncomingAndConferences();
    loadDirectory();
    const timer = setInterval(pollIncomingAndConferences, 5000);
    return () => clearInterval(timer);
  }, [pollIncomingAndConferences, loadDirectory]);

  const handleStartDirectCall = async (target, mediaMode = "VIDEO") => {
    if (!target) {
      notify("Select a recipient (Parent, Teacher, or Headmaster) first to place a call.", true);
      return;
    }
    setBusy(true);
    try {
      const res = await apiClient.post("/video/calls/initiate", {
        callScope: "DIRECT",
        mediaMode,
        targetUserId: target.userId || null,
        targetName: target.name,
        targetEmail: target.email || null,
        targetRole: target.role,
        title: `${mediaMode === "VOICE" ? "Voice" : "Video"} Call with ${target.name} (${target.role})`
      });
      const session = res?.data?.data?.session;
      if (session) {
        setActiveModalSession(session);
        notify(`Ringing ${target.name} in-system (${mediaMode})...`);
      }
    } catch (err) {
      notify(err?.response?.data?.message || "Could not start live call right now.", true);
    } finally {
      setBusy(false);
    }
  };

  const handleLaunchConference = async (callScope, defaultTitle, mediaMode = "VIDEO") => {
    setBusy(true);
    try {
      const res = await apiClient.post("/video/calls/initiate", {
        callScope,
        mediaMode,
        title: conferenceTitle.trim() || defaultTitle
      });
      const session = res?.data?.data?.session;
      if (session) {
        setConferenceTitle("");
        setActiveModalSession(session);
        pollIncomingAndConferences();
        notify(`Live conference "${session.title}" started!`);
      }
    } catch (err) {
      notify(err?.response?.data?.message || "Could not start conference room.", true);
    } finally {
      setBusy(false);
    }
  };

  const handleAcceptCall = async (call, overrideMediaMode = null) => {
    setBusy(true);
    try {
      const res = await apiClient.post(`/video/calls/${encodeURIComponent(call.id)}/answer`, {
        videoOff: overrideMediaMode === "VOICE"
      });
      const session = res?.data?.data?.session || call;
      setActiveModalSession(overrideMediaMode ? { ...session, mediaMode: overrideMediaMode } : session);
      pollIncomingAndConferences();
    } catch (err) {
      notify(err?.response?.data?.message || "Could not join call.", true);
    } finally {
      setBusy(false);
    }
  };

  const handleDeclineCall = async (call) => {
    try {
      await apiClient.post(`/video/calls/${encodeURIComponent(call.id)}/decline`, {
        reason: "Recipient declined."
      });
      pollIncomingAndConferences();
    } catch { }
  };

  const availableTargets = isHeadmaster
    ? [...directory.parents, ...directory.teachers, ...directory.staff]
    : isTeacher
      ? [...directory.parents, ...directory.headmasters]
      : [...directory.headmasters, ...directory.teachers];

  const chosenContact = availableTargets.find((c) => String(c.userId) === String(selectedContactId)) || null;

  return (
    <>
      {/* Incoming Call Notification Banner (Visible globally across dashboards) */}
      {incomingCalls.length > 0 && (
        <div
          data-testid="incoming-live-call-banner"
          style={{
            background: "linear-gradient(135deg, #064e3b 0%, #081833 100%)",
            border: "2px solid #d4af37",
            borderRadius: "14px",
            padding: "12px 16px",
            marginBottom: "12px",
            color: "#ffffff",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "12px",
            boxShadow: "0 10px 30px rgba(0,0,0,0.45)"
          }}
        >
          <div>
            <div style={{ fontSize: "0.72rem", fontWeight: 900, color: "#6ee7b7", textTransform: "uppercase" }}>
              📞 INCOMING {incomingCalls[0].mediaMode} CALL • {incomingCalls[0].initiatorRole}
            </div>
            <strong style={{ fontSize: "1.02rem" }}>
              {incomingCalls[0].initiatorName} is calling you ({incomingCalls[0].title})
            </strong>
          </div>
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
            <button
              type="button"
              disabled={busy}
              onClick={() => handleAcceptCall(incomingCalls[0], "VIDEO")}
              style={{ background: "#10b981", color: "#fff", border: "1px solid #f6dd84", borderRadius: "8px", padding: "8px 14px", fontWeight: 900, cursor: "pointer", fontSize: "0.82rem" }}
            >
              🎥 Answer Video
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => handleAcceptCall(incomingCalls[0], "VOICE")}
              style={{ background: "#0284c7", color: "#fff", border: "1px solid #7dd3fc", borderRadius: "8px", padding: "8px 14px", fontWeight: 800, cursor: "pointer", fontSize: "0.82rem" }}
            >
              🎙️ Answer Voice
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => handleDeclineCall(incomingCalls[0])}
              style={{ background: "#991b1b", color: "#fecaca", border: "1px solid #ef4444", borderRadius: "8px", padding: "8px 12px", fontWeight: 800, cursor: "pointer", fontSize: "0.82rem" }}
            >
              ✖ Decline
            </button>
          </div>
        </div>
      )}

      {variant === "FULL_STUDIO" && (
        <div
          data-testid="live-call-studio-panel"
          style={{
            background: "linear-gradient(145deg, rgba(8, 24, 51, 0.96) 0%, rgba(13, 34, 71, 0.96) 100%)",
            border: "1.5px solid #d4af37",
            borderRadius: "14px",
            padding: "16px 18px",
            marginBottom: "18px",
            color: "#f8fafc"
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px", marginBottom: "12px" }}>
            <div>
              <span style={{ fontSize: "0.72rem", fontWeight: 800, color: "#f6dd84", letterSpacing: "0.9px", textTransform: "uppercase" }}>
                🎥 REAL-TIME IN-SYSTEM VOICE &amp; VIDEO CALLS • WEBRTC BRIDGE
              </span>
              <h3 style={{ margin: "4px 0 0", fontSize: "1.1rem", color: "#ffffff" }}>
                {isHeadmaster
                  ? "Headmaster–Teachers Conferences & Direct Headmaster–Parent Video / Voice Calls"
                  : isTeacher
                    ? "Teacher Live Video Conferences & Direct Calls with Headmaster / Parents"
                    : "Direct Parent–Headmaster & Parent–Teacher Video / Voice Calling"}
              </h3>
            </div>
            <button
              type="button"
              onClick={() => {
                pollIncomingAndConferences();
                loadDirectory();
              }}
              style={{ background: "rgba(56,189,248,0.16)", color: "#7dd3fc", border: "1px solid #38bdf8", borderRadius: "8px", padding: "6px 12px", fontWeight: 800, cursor: "pointer", fontSize: "0.76rem" }}
            >
              🔄 Refresh Live Rooms &amp; Contacts
            </button>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(290px, 1fr))", gap: "14px" }}>
            {/* Direct 1-to-1 Voice & Video Dialer */}
            <div style={{ background: "rgba(5, 15, 35, 0.85)", border: "1px solid rgba(212,175,55,0.35)", borderRadius: "12px", padding: "14px" }}>
              <div style={{ fontSize: "0.82rem", fontWeight: 800, color: "#f6dd84", marginBottom: "8px" }}>
                📞 Place Direct Voice or Video Call
              </div>
              <select
                data-testid="live-call-recipient-select"
                value={selectedContactId}
                onChange={(e) => setSelectedContactId(e.target.value)}
                style={{ width: "100%", padding: "8px 10px", borderRadius: "8px", border: "1px solid rgba(212,175,55,0.5)", background: "#081833", color: "#ffffff", marginBottom: "10px", fontSize: "0.82rem" }}
              >
                <option value="">
                  -- Select {isHeadmaster ? "Parent / Teacher / Staff" : isTeacher ? "Parent or Headmaster" : "Headmaster or Teacher"} --
                </option>
                {availableTargets.map((c) => (
                  <option key={c.userId} value={c.userId}>
                    {c.name} ({c.role}){c.studentName ? ` • Ward: ${c.studentName}` : ""}
                  </option>
                ))}
              </select>

              <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                <button
                  type="button"
                  disabled={busy}
                  data-testid="start-direct-video-call-btn"
                  onClick={() => handleStartDirectCall(chosenContact, "VIDEO")}
                  style={{ flex: 1, background: "linear-gradient(135deg, #065f46, #10b981)", color: "#fff", border: "1px solid #f6dd84", borderRadius: "8px", padding: "8px 12px", fontWeight: 800, cursor: "pointer", fontSize: "0.8rem" }}
                >
                  🎥 Start Video Call
                </button>
                <button
                  type="button"
                  disabled={busy}
                  data-testid="start-direct-voice-call-btn"
                  onClick={() => handleStartDirectCall(chosenContact, "VOICE")}
                  style={{ flex: 1, background: "linear-gradient(135deg, #1d4ed8, #0284c7)", color: "#fff", border: "1px solid #7dd3fc", borderRadius: "8px", padding: "8px 12px", fontWeight: 800, cursor: "pointer", fontSize: "0.8rem" }}
                >
                  🎙️ Start Voice Call
                </button>
                {isParent && directory.headmasters.length === 0 && (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => handleStartDirectCall({ name: "Headmaster Office", role: "ADMIN" }, "VIDEO")}
                    style={{ width: "100%", background: "rgba(212,175,55,0.2)", color: "#f6dd84", border: "1px solid #d4af37", borderRadius: "8px", padding: "7px 10px", fontWeight: 800, cursor: "pointer", fontSize: "0.78rem" }}
                  >
                    🏫 Ring School Headmaster Directly
                  </button>
                )}
              </div>
            </div>

            {/* Live Multi-Participant Conference Launcher */}
            <div style={{ background: "rgba(5, 15, 35, 0.85)", border: "1px solid rgba(56,189,248,0.4)", borderRadius: "12px", padding: "14px" }}>
              <div style={{ fontSize: "0.82rem", fontWeight: 800, color: "#7dd3fc", marginBottom: "8px" }}>
                {isParent ? "📡 Active School Conferences to Join" : "👥 Host Live Multi-User Conference"}
              </div>
              {!isParent && (
                <>
                  <input
                    type="text"
                    placeholder={isHeadmaster ? "Agenda (e.g. Headmaster & Teachers Staff Briefing)" : "Topic (e.g. Class Revision / Parent Conference)"}
                    value={conferenceTitle}
                    onChange={(e) => setConferenceTitle(e.target.value)}
                    style={{ width: "100%", boxSizing: "border-box", padding: "8px 10px", borderRadius: "8px", border: "1px solid rgba(56,189,248,0.45)", background: "#081833", color: "#ffffff", marginBottom: "10px", fontSize: "0.82rem" }}
                  />
                  <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "10px" }}>
                    <button
                      type="button"
                      disabled={busy}
                      data-testid="launch-faculty-conference-btn"
                      onClick={() =>
                        handleLaunchConference(
                          isHeadmaster ? "FACULTY_CONFERENCE" : "CLASS_CONFERENCE",
                          isHeadmaster ? "Headmaster & Teachers Live Conference" : "Teacher Live Video Conference",
                          "VIDEO"
                        )
                      }
                      style={{ flex: 1, background: "linear-gradient(135deg, #2563eb, #1d4ed8)", color: "#fff", border: "1px solid #7dd3fc", borderRadius: "8px", padding: "8px 12px", fontWeight: 800, cursor: "pointer", fontSize: "0.8rem" }}
                    >
                      🎥 Launch Video Conference
                    </button>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() =>
                        handleLaunchConference(
                          isHeadmaster ? "PARENT_CONFERENCE" : "PARENT_CONFERENCE",
                          "Parent & Guardian Voice Conference",
                          "VOICE"
                        )
                      }
                      style={{ flex: 1, background: "rgba(212,175,55,0.2)", color: "#f6dd84", border: "1px solid #d4af37", borderRadius: "8px", padding: "8px 12px", fontWeight: 800, cursor: "pointer", fontSize: "0.8rem" }}
                    >
                      🎙️ Launch Voice Conference
                    </button>
                  </div>
                </>
              )}

              {activeConferences.length === 0 ? (
                <div style={{ fontSize: "0.76rem", color: "#94a3b8" }}>
                  No live conferences open right now. {isParent ? "Wait for Headmaster or Teacher to start a conference or place a direct call." : "Click Launch above to start an instant room."}
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  {activeConferences.slice(0, 4).map((conf) => (
                    <div key={conf.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "rgba(13,34,71,0.75)", padding: "7px 10px", borderRadius: "8px", fontSize: "0.78rem", gap: "8px" }}>
                      <div>
                        <strong style={{ color: "#ffffff", display: "block" }}>{conf.title}</strong>
                        <span style={{ fontSize: "0.7rem", color: "#6ee7b7" }}>
                          Host: {conf.initiatorName} • {(conf.participants || []).length} in room
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleAcceptCall(conf)}
                        style={{ background: "#10b981", color: "#fff", border: "none", borderRadius: "7px", padding: "6px 12px", fontWeight: 800, cursor: "pointer", fontSize: "0.75rem" }}
                      >
                        Join Room
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {activeModalSession && (
        <LiveInSystemCallModal
          session={activeModalSession}
          currentUser={resolvedUser}
          onClose={handleCloseCallModal}
          onSessionEnded={handleCallSessionEnded}
        />
      )}
    </>
  );
}
