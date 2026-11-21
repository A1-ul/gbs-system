import React, { useEffect, useState, useCallback } from "react";
import apiClient from "../../api/client/apiClient";
import LiveInSystemCallModal from "./LiveInSystemCallModal";

/**
 * Reusable Live Voice & Video Call / Conference / Live Online Classroom Launcher and Global Incoming Receiver.
 * Works seamlessly across:
 *  - Developer Mission Control (DEVELOPER <-> Any Institution's Headmaster + Multi-Headmaster Conference)
 *  - Headmaster Command Center (ADMIN <-> Developer, Teachers, Parents, Staff)
 *  - Teacher Academic Suite (TEACHER -> Live Online Classes with Students + Direct Calls with Headmaster/Parents)
 *  - Student Learning Portal (STUDENT -> Receives & Joins Live Teacher Online Classes with 1-Click)
 *  - Parent Portal (PARENT <-> Headmaster / Teacher calls & conferences)
 *
 * Variants:
 *  - "GLOBAL_RECEIVER": quietly listens for incoming direct calls & live online classes / executive conferences.
 *  - "FULL_STUDIO": renders full dialer + live class / conference launcher + active live rooms.
 *  - "STUDENT_CLASSROOM_LIST": renders active in-system Teacher Live Online Classes inside the Student meetings tab.
 */
export default function LiveCallLauncherAndReceiver({
  variant = "FULL_STUDIO",
  userRole = "",
  currentUser = null,
  classes = [],
  selectedClassId = "",
  onFeedback = null
}) {
  const resolvedUser = (() => {
    if (currentUser && typeof currentUser === "object" && Object.keys(currentUser).length > 0) return currentUser;
    try {
      const devStored = JSON.parse(localStorage.getItem("gbs_developer") || "null");
      if (String(userRole || "").toUpperCase() === "DEVELOPER" && devStored) {
        return { ...devStored, role: "DEVELOPER" };
      }
      return JSON.parse(localStorage.getItem("gbs_user") || "{}");
    } catch {
      return {};
    }
  })();

  const roleUpper = String(userRole || resolvedUser.role || "").toUpperCase();
  const isDeveloper = roleUpper === "DEVELOPER";
  const isHeadmaster = ["ADMIN", "SUPER_ADMIN", "HEADMASTER", "PRINCIPAL"].includes(roleUpper);
  const isTeacher = roleUpper === "TEACHER";
  const isStudent = roleUpper === "STUDENT";
  const isParent = roleUpper === "PARENT";

  const [incomingCalls, setIncomingCalls] = useState([]);
  const [activeConferences, setActiveConferences] = useState([]);
  const [recentCalls, setRecentCalls] = useState([]);
  const [directory, setDirectory] = useState({ contacts: [], headmasters: [], teachers: [], parents: [], students: [], staff: [] });
  const [selectedContactId, setSelectedContactId] = useState("");
  const [conferenceTitle, setConferenceTitle] = useState("");
  const [liveClassTopic, setLiveClassTopic] = useState("");
  const [liveClassTarget, setLiveClassTarget] = useState("");
  const [activeModalSession, setActiveModalSession] = useState(null);
  const [busy, setBusy] = useState(false);

  const notify = useCallback((msg, isErr = false) => {
    if (typeof onFeedback === "function") onFeedback(msg, isErr);
  }, [onFeedback]);

  const pollIncomingAndConferences = useCallback(async () => {
    try {
      const res = await apiClient.get("/video/calls/incoming");
      const data = res?.data?.data;
      if (data) {
        setIncomingCalls(Array.isArray(data.incomingCalls) ? data.incomingCalls : []);
        setActiveConferences(Array.isArray(data.activeConferences) ? data.activeConferences : []);
        setRecentCalls(Array.isArray(data.recentCalls) ? data.recentCalls : []);
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
      notify(
        isDeveloper
          ? "Select an institution's Headmaster first to place an encrypted video or voice call."
          : "Select a recipient (Parent, Teacher, or Headmaster) first to place a call.",
        true
      );
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
        targetPhone: target.phone || null,
        targetRole: target.role || "ADMIN",
        targetTenantId: target.tenantId || undefined,
        targetTenantName: target.tenantName || undefined,
        title: isDeveloper
          ? `Developer ${mediaMode === "VOICE" ? "Voice" : "Video"} Call with Headmaster ${target.name} (${target.tenantName || "Institution"})`
          : `${mediaMode === "VOICE" ? "Voice" : "Video"} Call with ${target.name} (${target.role})`
      });
      const session = res?.data?.data?.session;
      if (session) {
        setActiveModalSession(session);
        pollIncomingAndConferences();
        notify(`Ringing ${target.name} in-system (${mediaMode})...`);
      }
    } catch (err) {
      notify(err?.response?.data?.message || "Could not start live call right now.", true);
    } finally {
      setBusy(false);
    }
  };

  const handleLaunchConference = async (callScope, defaultTitle, mediaMode = "VIDEO", extra = {}) => {
    setBusy(true);
    try {
      const topicText = extra.customTitle || conferenceTitle.trim() || defaultTitle;
      const res = await apiClient.post("/video/calls/initiate", {
        callScope,
        mediaMode,
        title: topicText,
        className: extra.className || undefined,
        subject: extra.subject || undefined
      });
      const session = res?.data?.data?.session;
      if (session) {
        setConferenceTitle("");
        setLiveClassTopic("");
        setActiveModalSession(session);
        pollIncomingAndConferences();
        notify(`Live session "${session.title}" is now active! Participants can join immediately.`);
      }
    } catch (err) {
      notify(err?.response?.data?.message || "Could not start live room.", true);
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

  const handleEndExistingRoom = async (call) => {
    try {
      await apiClient.post(`/video/calls/${encodeURIComponent(call.id)}/end`);
      pollIncomingAndConferences();
      notify(`Ended live room "${call.title}".`);
    } catch { }
  };

  const availableTargets = isDeveloper
    ? [...(directory.headmasters || [])]
    : isHeadmaster
      ? [...(directory.parents || []), ...(directory.teachers || []), ...(directory.staff || [])]
      : isTeacher
        ? [...(directory.parents || []), ...(directory.headmasters || []), ...(directory.students || [])]
        : [...(directory.headmasters || []), ...(directory.teachers || [])];

  const chosenContact = availableTargets.find((c) => String(c.userId) === String(selectedContactId)) || null;

  const activeTeacherLiveClasses = activeConferences.filter((c) => c.callScope === "CLASS_CONFERENCE");
  const activeDevExecConfs = activeConferences.filter((c) => c.callScope === "DEVELOPER_HEADMASTERS_CONFERENCE");

  const resolvedTeacherClassName = (() => {
    if (liveClassTarget) return liveClassTarget;
    const found = (classes || []).find((c) => String(c.id) === String(selectedClassId));
    return found ? `${found.name}${found.code ? ` (${found.code})` : ""}` : "All Assigned Students";
  })();

  return (
    <>
      {/* Incoming Direct Call Notification Banner (Visible globally across dashboards) */}
      {incomingCalls.length > 0 && (
        <div
          data-testid="incoming-live-call-banner"
          style={{
            background: incomingCalls[0].initiatorRole === "DEVELOPER"
              ? "linear-gradient(135deg, #1e1b4b 0%, #081833 100%)"
              : "linear-gradient(135deg, #064e3b 0%, #081833 100%)",
            border: incomingCalls[0].initiatorRole === "DEVELOPER" ? "2px solid #38bdf8" : "2px solid #d4af37",
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
            <div style={{ fontSize: "0.72rem", fontWeight: 900, color: incomingCalls[0].initiatorRole === "DEVELOPER" ? "#38bdf8" : "#6ee7b7", textTransform: "uppercase" }}>
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
              data-testid="answer-incoming-video-call-btn"
              onClick={() => handleAcceptCall(incomingCalls[0], "VIDEO")}
              style={{ background: "#10b981", color: "#fff", border: "1px solid #f6dd84", borderRadius: "8px", padding: "8px 14px", fontWeight: 900, cursor: "pointer", fontSize: "0.82rem" }}
            >
              🎥 Answer Video
            </button>
            <button
              type="button"
              disabled={busy}
              data-testid="answer-incoming-voice-call-btn"
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

      {/* Global Live Online Class Alert Banner for Students (Displays up to 3 concurrent live classes) */}
      {variant === "GLOBAL_RECEIVER" && isStudent && activeTeacherLiveClasses.length > 0 && (
        <div
          data-testid="student-live-online-class-banner"
          style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: "12px" }}
        >
          {activeTeacherLiveClasses.slice(0, 3).map((liveCls) => (
            <div
              key={liveCls.id}
              style={{
                background: "linear-gradient(135deg, #1d4ed8 0%, #081833 100%)",
                border: "2px solid #38bdf8",
                borderRadius: "14px",
                padding: "12px 16px",
                color: "#ffffff",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexWrap: "wrap",
                gap: "12px",
                boxShadow: "0 10px 30px rgba(37, 99, 235, 0.35)"
              }}
            >
              <div>
                <div style={{ fontSize: "0.72rem", fontWeight: 900, color: "#7dd3fc", textTransform: "uppercase" }}>
                  🔴 LIVE ONLINE CLASS IN PROGRESS • {liveCls.className || "CLASSROOM"}
                </div>
                <strong style={{ fontSize: "1.02rem" }}>
                  {liveCls.title} — Hosted by {liveCls.initiatorName}
                </strong>
              </div>
              <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                <button
                  type="button"
                  disabled={busy}
                  data-testid="student-join-live-class-video-btn"
                  onClick={() => handleAcceptCall(liveCls, "VIDEO")}
                  style={{ background: "#10b981", color: "#fff", border: "1px solid #f6dd84", borderRadius: "8px", padding: "8px 14px", fontWeight: 900, cursor: "pointer", fontSize: "0.82rem" }}
                >
                  🎥 Join Live Class Now
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => handleAcceptCall(liveCls, "VOICE")}
                  style={{ background: "#0284c7", color: "#fff", border: "1px solid #7dd3fc", borderRadius: "8px", padding: "8px 14px", fontWeight: 800, cursor: "pointer", fontSize: "0.82rem" }}
                >
                  🎙️ Join Audio Only
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Global Live Developer Executive Conference Alert for Headmasters */}
      {variant === "GLOBAL_RECEIVER" && isHeadmaster && activeDevExecConfs.length > 0 && (
        <div
          data-testid="headmaster-dev-exec-conf-banner"
          style={{
            background: "linear-gradient(135deg, #312e81 0%, #081833 100%)",
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
            <div style={{ fontSize: "0.72rem", fontWeight: 900, color: "#f6dd84", textTransform: "uppercase" }}>
              🛠️ LIVE DEVELOPER EXECUTIVE CONFERENCE ROOM ACTIVE
            </div>
            <strong style={{ fontSize: "1.02rem" }}>
              {activeDevExecConfs[0].title} — Hosted by {activeDevExecConfs[0].initiatorName}
            </strong>
          </div>
          <button
            type="button"
            disabled={busy}
            onClick={() => handleAcceptCall(activeDevExecConfs[0], "VIDEO")}
            style={{ background: "#10b981", color: "#fff", border: "1px solid #f6dd84", borderRadius: "8px", padding: "8px 16px", fontWeight: 900, cursor: "pointer", fontSize: "0.84rem" }}
          >
            🎥 Join Developer Conference
          </button>
        </div>
      )}

      {/* Student Dedicated In-System Live Online Classroom List (Mounted inside Student's Meetings Tab) */}
      {variant === "STUDENT_CLASSROOM_LIST" && (
        <div
          data-testid="student-live-classrooms-panel"
          style={{
            background: "linear-gradient(145deg, rgba(8, 24, 51, 0.95) 0%, rgba(15, 34, 71, 0.95) 100%)",
            border: "1.5px solid #38bdf8",
            borderRadius: "14px",
            padding: "16px 18px",
            marginBottom: "1.5rem",
            color: "#f8fafc"
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px", marginBottom: "10px" }}>
            <div>
              <span style={{ fontSize: "0.72rem", fontWeight: 800, color: "#7dd3fc", letterSpacing: "0.8px", textTransform: "uppercase" }}>
                🎓 REAL-TIME IN-SYSTEM LIVE ONLINE CLASSES • DIRECT TEACHER WEBRTC BRIDGE
              </span>
              <h3 style={{ margin: "4px 0 0", fontSize: "1.08rem", color: "#ffffff" }}>
                Live Teacher Classrooms Happening Right Now ({activeTeacherLiveClasses.length})
              </h3>
            </div>
            <button
              type="button"
              onClick={pollIncomingAndConferences}
              style={{ background: "rgba(56,189,248,0.16)", color: "#7dd3fc", border: "1px solid #38bdf8", borderRadius: "8px", padding: "6px 12px", fontWeight: 800, cursor: "pointer", fontSize: "0.76rem" }}
            >
              🔄 Check Live Classes
            </button>
          </div>
          {activeTeacherLiveClasses.length === 0 ? (
            <div style={{ fontSize: "0.82rem", color: "#94a3b8", padding: "8px 0" }}>
              No teacher is broadcasting an in-system live online class right now. As soon as your teacher starts a Live Online Class, it appears here automatically for 1-click joining.
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(290px, 1fr))", gap: "10px" }}>
              {activeTeacherLiveClasses.map((cls) => (
                <div key={cls.id} style={{ background: "rgba(5, 15, 35, 0.88)", border: "1.5px solid #10b981", borderRadius: "12px", padding: "12px 14px", display: "flex", flexDirection: "column", gap: "8px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "6px" }}>
                    <span style={{ background: "#ef4444", color: "#fff", padding: "2px 8px", borderRadius: "999px", fontSize: "0.68rem", fontWeight: 900 }}>
                      🔴 LIVE NOW
                    </span>
                    <span style={{ fontSize: "0.72rem", color: "#6ee7b7", fontWeight: 700 }}>
                      {(cls.participants || []).length} in class • Room {cls.roomCode}
                    </span>
                  </div>
                  <strong style={{ fontSize: "0.98rem", color: "#ffffff" }}>{cls.title}</strong>
                  <div style={{ fontSize: "0.78rem", color: "#cbd5e1" }}>
                    👨‍🏫 Teacher: <strong>{cls.initiatorName}</strong> {cls.className ? `• 🏫 ${cls.className}` : ""}
                  </div>
                  <div style={{ display: "flex", gap: "8px", marginTop: "4px" }}>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => handleAcceptCall(cls, "VIDEO")}
                      style={{ flex: 1, background: "linear-gradient(135deg, #059669, #10b981)", color: "#fff", border: "1px solid #f6dd84", borderRadius: "8px", padding: "8px 12px", fontWeight: 900, cursor: "pointer", fontSize: "0.8rem" }}
                    >
                      🎥 Join Video Class
                    </button>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => handleAcceptCall(cls, "VOICE")}
                      style={{ background: "rgba(56,189,248,0.18)", color: "#7dd3fc", border: "1px solid #38bdf8", borderRadius: "8px", padding: "8px 12px", fontWeight: 800, cursor: "pointer", fontSize: "0.78rem" }}
                    >
                      🎙️ Audio Only
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Full Studio Mode (Developer, Headmaster, Teacher, Parent) */}
      {variant === "FULL_STUDIO" && (
        <div
          data-testid="live-call-studio-panel"
          style={{
            background: "linear-gradient(145deg, rgba(8, 24, 51, 0.96) 0%, rgba(13, 34, 71, 0.96) 100%)",
            border: isDeveloper ? "1.5px solid #38bdf8" : "1.5px solid #d4af37",
            borderRadius: "14px",
            padding: "16px 18px",
            marginBottom: "18px",
            color: "#f8fafc"
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px", marginBottom: "12px" }}>
            <div>
              <span style={{ fontSize: "0.72rem", fontWeight: 800, color: "#f6dd84", letterSpacing: "0.9px", textTransform: "uppercase" }}>
                🎥 REAL-TIME IN-SYSTEM VOICE &amp; VIDEO BRIDGE • ENCRYPTED WEBRTC
              </span>
              <h3 style={{ margin: "4px 0 0", fontSize: "1.12rem", color: "#ffffff" }}>
                {isDeveloper
                  ? "Developer ↔ Headmaster Direct Video / Voice Calls & Executive Conferences"
                  : isHeadmaster
                    ? "Headmaster–Teachers Conferences & Direct Headmaster–Parent Video / Voice Calls"
                    : isTeacher
                      ? "Live Online Classes with Students & Direct Faculty / Parent Calls"
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

          {/* Dedicated 1-Click Teacher -> Students Live Online Classroom Studio */}
          {isTeacher && (
            <div
              data-testid="teacher-live-online-class-launcher"
              style={{
                background: "linear-gradient(135deg, rgba(16, 185, 129, 0.16) 0%, rgba(2, 132, 199, 0.18) 100%)",
                border: "1.5px solid #10b981",
                borderRadius: "12px",
                padding: "14px 16px",
                marginBottom: "14px"
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "8px", marginBottom: "10px" }}>
                <div>
                  <span style={{ fontSize: "0.72rem", fontWeight: 900, color: "#6ee7b7", textTransform: "uppercase", letterSpacing: "0.8px" }}>
                    🎓 INSTANT IN-SYSTEM LIVE ONLINE CLASS WITH STUDENTS
                  </span>
                  <div style={{ fontSize: "0.82rem", color: "#e2e8f0", marginTop: "2px" }}>
                    Start a live HD video &amp; screen-share classroom directly inside GBS. Students receive an instant live banner on their Student Dashboard and join with 1 click.
                  </div>
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))", gap: "10px", marginBottom: "10px" }}>
                <input
                  type="text"
                  data-testid="teacher-live-class-topic-input"
                  value={liveClassTopic}
                  onChange={(e) => setLiveClassTopic(e.target.value)}
                  placeholder="Lesson Topic (e.g. Quadratic Equations & Problem Solving)"
                  style={{ padding: "8px 10px", borderRadius: "8px", border: "1px solid rgba(16, 185, 129, 0.55)", background: "#050f23", color: "#ffffff", fontSize: "0.84rem" }}
                />
                {Array.isArray(classes) && classes.length > 0 ? (
                  <select
                    data-testid="teacher-live-class-cohort-select"
                    value={liveClassTarget}
                    onChange={(e) => setLiveClassTarget(e.target.value)}
                    style={{ padding: "8px 10px", borderRadius: "8px", border: "1px solid rgba(16, 185, 129, 0.55)", background: "#050f23", color: "#ffffff", fontSize: "0.84rem" }}
                  >
                    <option value="">All Assigned Classes ({classes.length})</option>
                    {classes.map((c) => (
                      <option key={c.id} value={`${c.name}${c.code ? ` (${c.code})` : ""}`}>
                        {c.name} {c.code ? `(${c.code})` : ""}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    value={liveClassTarget}
                    onChange={(e) => setLiveClassTarget(e.target.value)}
                    placeholder="Class / Grade (e.g. JHS 3 / SHS 1)"
                    style={{ padding: "8px 10px", borderRadius: "8px", border: "1px solid rgba(16, 185, 129, 0.55)", background: "#050f23", color: "#ffffff", fontSize: "0.84rem" }}
                  />
                )}
              </div>
              <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                <button
                  type="button"
                  disabled={busy}
                  data-testid="start-teacher-live-online-class-btn"
                  onClick={() =>
                    handleLaunchConference(
                      "CLASS_CONFERENCE",
                      `Live Online Class: ${resolvedTeacherClassName}`,
                      "VIDEO",
                      {
                        customTitle: liveClassTopic.trim() || `Live Online Class (${resolvedTeacherClassName})`,
                        className: resolvedTeacherClassName
                      }
                    )
                  }
                  style={{ flex: 2, minWidth: "220px", background: "linear-gradient(135deg, #059669, #10b981)", color: "#fff", border: "1px solid #f6dd84", borderRadius: "9px", padding: "10px 16px", fontWeight: 900, cursor: "pointer", fontSize: "0.86rem" }}
                >
                  🎓 Start Live Online Class with Students (HD Video + Screen Share)
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() =>
                    handleLaunchConference(
                      "CLASS_CONFERENCE",
                      `Audio Revision Class: ${resolvedTeacherClassName}`,
                      "VOICE",
                      {
                        customTitle: liveClassTopic.trim() || `Live Audio Class (${resolvedTeacherClassName})`,
                        className: resolvedTeacherClassName
                      }
                    )
                  }
                  style={{ flex: 1, minWidth: "160px", background: "rgba(56, 189, 248, 0.18)", color: "#7dd3fc", border: "1px solid #38bdf8", borderRadius: "9px", padding: "10px 14px", fontWeight: 800, cursor: "pointer", fontSize: "0.82rem" }}
                >
                  🎙️ Start Audio Live Class
                </button>
              </div>
            </div>
          )}

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(290px, 1fr))", gap: "14px" }}>
            {/* Direct 1-to-1 Voice & Video Dialer */}
            <div style={{ background: "rgba(5, 15, 35, 0.85)", border: "1px solid rgba(212,175,55,0.35)", borderRadius: "12px", padding: "14px" }}>
              <div style={{ fontSize: "0.82rem", fontWeight: 800, color: "#f6dd84", marginBottom: "8px" }}>
                {isDeveloper ? "👑 Direct Video / Voice Call to Institution Headmaster" : "📞 Place Direct Voice or Video Call"}
              </div>
              <select
                data-testid="live-call-recipient-select"
                value={selectedContactId}
                onChange={(e) => setSelectedContactId(e.target.value)}
                style={{ width: "100%", padding: "8px 10px", borderRadius: "8px", border: "1px solid rgba(212,175,55,0.5)", background: "#081833", color: "#ffffff", marginBottom: "10px", fontSize: "0.82rem" }}
              >
                <option value="">
                  -- Select {isDeveloper ? "Registered Institution Headmaster" : isHeadmaster ? "Parent / Teacher / Staff" : isTeacher ? "Parent, Headmaster, or Student" : "Headmaster or Teacher"} --
                </option>
                {availableTargets.map((c) => (
                  <option key={`${c.tenantId || "t"}_${c.userId}`} value={c.userId}>
                    {c.isOnline ? "🟢 ONLINE • " : "🟡 STANDBY • "}
                    {c.name} ({isDeveloper ? `${c.tenantName} • ${c.tenantCode}` : c.role})
                    {c.studentName ? ` • Ward: ${c.studentName}` : ""}
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

            {/* Live Multi-Participant Conference Launcher & Active Rooms */}
            <div style={{ background: "rgba(5, 15, 35, 0.85)", border: "1px solid rgba(56,189,248,0.4)", borderRadius: "12px", padding: "14px" }}>
              <div style={{ fontSize: "0.82rem", fontWeight: 800, color: "#7dd3fc", marginBottom: "8px" }}>
                {isDeveloper
                  ? "🏛️ Host Multi-Headmaster Executive Video Conference"
                  : isParent
                    ? "📡 Active School Conferences to Join"
                    : "👥 Host Live Multi-User Conference"}
              </div>
              {!isParent && (
                <>
                  <input
                    type="text"
                    placeholder={
                      isDeveloper
                        ? "Agenda (e.g. National Headmasters Platform Upgrade Briefing)"
                        : isHeadmaster
                          ? "Agenda (e.g. Headmaster & Teachers Staff Briefing)"
                          : "Topic (e.g. PTA Meeting / Revision Conference)"
                    }
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
                          isDeveloper
                            ? "DEVELOPER_HEADMASTERS_CONFERENCE"
                            : isHeadmaster
                              ? "FACULTY_CONFERENCE"
                              : "CLASS_CONFERENCE",
                          isDeveloper
                            ? "Developer & Headmasters Executive Video Conference"
                            : isHeadmaster
                              ? "Headmaster & Teachers Live Conference"
                              : "Teacher Live Video Conference",
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
                          isDeveloper ? "DEVELOPER_HEADMASTERS_CONFERENCE" : "PARENT_CONFERENCE",
                          isDeveloper ? "Developer & Headmasters Voice Briefing" : "Parent & Guardian Voice Conference",
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
                  {activeConferences.slice(0, 5).map((conf) => (
                    <div key={conf.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "rgba(13,34,71,0.75)", padding: "7px 10px", borderRadius: "8px", fontSize: "0.78rem", gap: "8px" }}>
                      <div>
                        <strong style={{ color: "#ffffff", display: "block" }}>{conf.title}</strong>
                        <span style={{ fontSize: "0.7rem", color: "#6ee7b7" }}>
                          Host: {conf.initiatorName} • {(conf.participants || []).length} in room
                        </span>
                      </div>
                      <div style={{ display: "flex", gap: "6px" }}>
                        <button
                          type="button"
                          onClick={() => handleAcceptCall(conf)}
                          style={{ background: "#10b981", color: "#fff", border: "none", borderRadius: "7px", padding: "6px 12px", fontWeight: 800, cursor: "pointer", fontSize: "0.75rem" }}
                        >
                          Join Room
                        </button>
                        {(isDeveloper || isHeadmaster || isTeacher) && (
                          <button
                            type="button"
                            onClick={() => handleEndExistingRoom(conf)}
                            style={{ background: "rgba(239,68,68,0.22)", color: "#fca5a5", border: "1px solid #ef4444", borderRadius: "7px", padding: "6px 9px", fontWeight: 800, cursor: "pointer", fontSize: "0.72rem" }}
                          >
                            End
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Developer Recent Call & Conference Audit Log */}
          {isDeveloper && recentCalls.length > 0 && (
            <div style={{ marginTop: "12px", paddingTop: "10px", borderTop: "1px solid rgba(56, 189, 248, 0.25)" }}>
              <div style={{ fontSize: "0.74rem", fontWeight: 800, color: "#94a3b8", textTransform: "uppercase", marginBottom: "6px" }}>
                📋 Recent Developer ↔ Headmaster Calls ({recentCalls.length})
              </div>
              <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                {recentCalls.slice(0, 6).map((rc) => (
                  <div key={rc.id} style={{ background: "rgba(2, 6, 23, 0.7)", border: "1px solid rgba(148,163,184,0.25)", borderRadius: "8px", padding: "6px 10px", fontSize: "0.74rem", display: "flex", alignItems: "center", gap: "8px" }}>
                    <span style={{ color: rc.status === "ACTIVE" ? "#34d399" : rc.status === "RINGING" ? "#fbbf24" : "#94a3b8", fontWeight: 800 }}>
                      ● {rc.status}
                    </span>
                    <span style={{ color: "#e2e8f0" }}>{rc.title}</span>
                    {["RINGING", "ACTIVE"].includes(rc.status) && (
                      <button
                        type="button"
                        onClick={() => setActiveModalSession(rc)}
                        style={{ background: "#0284c7", color: "#fff", border: "none", borderRadius: "5px", padding: "3px 8px", fontSize: "0.7rem", fontWeight: 800, cursor: "pointer" }}
                      >
                        Re-Open
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
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
