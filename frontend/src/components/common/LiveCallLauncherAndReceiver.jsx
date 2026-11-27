import React, { useEffect, useState, useCallback, useRef } from "react";
import apiClient from "../../api/client/apiClient";
import { hasActiveAuthSession } from "../../utils/tokenStorage";
import {
  startIncomingRingtone,
  stopIncomingRingtone,
  formatRolePositionLabel,
  buildIncomingCallAnnouncementPhrase
} from "../../utils/callRingtoneEngine";
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
  const isSecretary = roleUpper === "SECRETARY";
  const isAccountant = roleUpper === "ACCOUNTANT";
  const isHR = roleUpper === "HR";
  const isStaff = roleUpper === "STAFF";
  const isAlumni = roleUpper === "ALUMNI";
  const isCampusStaff = isSecretary || isAccountant || isHR || isStaff;

  const [incomingCalls, setIncomingCalls] = useState([]);
  const [missedCalls, setMissedCalls] = useState([]);
  const [activeConferences, setActiveConferences] = useState([]);
  const [recentCalls, setRecentCalls] = useState([]);
  const [directory, setDirectory] = useState({ contacts: [], headmasters: [], teachers: [], parents: [], students: [], staff: [], alumni: [] });
  const [selectedContactId, setSelectedContactId] = useState("");
  const [conferenceTitle, setConferenceTitle] = useState("");
  const [headmasterConfAudience, setHeadmasterConfAudience] = useState("ALL_CAMPUS_CONFERENCE");
  const [liveClassTopic, setLiveClassTopic] = useState("");
  const [liveClassTarget, setLiveClassTarget] = useState("");
  const [activeModalSession, setActiveModalSession] = useState(null);
  const [busy, setBusy] = useState(false);
  const authPausedRef = useRef(false);

  const notify = useCallback((msg, isErr = false) => {
    if (typeof onFeedback === "function") onFeedback(msg, isErr);
  }, [onFeedback]);

  const pollIncomingAndConferences = useCallback(async () => {
    if (authPausedRef.current || !hasActiveAuthSession({ isDeveloperContext: isDeveloper })) {
      return;
    }
    try {
      const res = await apiClient.get("/video/calls/incoming");
      const data = res?.data?.data;
      if (data) {
        setIncomingCalls(Array.isArray(data.incomingCalls) ? data.incomingCalls : []);
        setMissedCalls(Array.isArray(data.missedCalls) ? data.missedCalls : []);
        setActiveConferences(Array.isArray(data.activeConferences) ? data.activeConferences : []);
        setRecentCalls(Array.isArray(data.recentCalls) ? data.recentCalls : []);
      }
    } catch (err) {
      if (err?.response?.status === 401) {
        authPausedRef.current = true;
      }
    }
  }, [isDeveloper]);

  const loadDirectory = useCallback(async () => {
    if (variant !== "FULL_STUDIO") return;
    if (authPausedRef.current || !hasActiveAuthSession({ isDeveloperContext: isDeveloper })) {
      return;
    }
    try {
      const res = await apiClient.get("/video/calls/directory");
      const data = res?.data?.data;
      if (data) {
        setDirectory(data);
      }
    } catch (err) {
      if (err?.response?.status === 401) {
        authPausedRef.current = true;
      }
    }
  }, [variant, isDeveloper]);

  const handleCloseCallModal = useCallback(() => {
    setActiveModalSession(null);
    pollIncomingAndConferences();
  }, [pollIncomingAndConferences]);

  const handleCallSessionEnded = useCallback(() => {
    setActiveModalSession(null);
    pollIncomingAndConferences();
  }, [pollIncomingAndConferences]);

  useEffect(() => {
    authPausedRef.current = false;
    pollIncomingAndConferences();
    loadDirectory();
    const timer = setInterval(pollIncomingAndConferences, 5000);
    const onAuthExpired = () => {
      authPausedRef.current = true;
    };
    const onAuthUpdated = () => {
      authPausedRef.current = false;
      pollIncomingAndConferences();
      loadDirectory();
    };
    window.addEventListener("gbs_auth_session_expired", onAuthExpired);
    window.addEventListener("gbs_auth_session_cleared", onAuthExpired);
    window.addEventListener("gbs_auth_session_updated", onAuthUpdated);
    window.addEventListener("storage", onAuthUpdated);
    return () => {
      clearInterval(timer);
      stopIncomingRingtone();
      window.removeEventListener("gbs_auth_session_expired", onAuthExpired);
      window.removeEventListener("gbs_auth_session_cleared", onAuthExpired);
      window.removeEventListener("gbs_auth_session_updated", onAuthUpdated);
      window.removeEventListener("storage", onAuthUpdated);
    };
  }, [pollIncomingAndConferences, loadDirectory]);

  // Play real incoming telephone ringing tone with caller name & position whenever a call is ringing
  const activeIncomingId = incomingCalls[0]?.id || null;
  useEffect(() => {
    if (activeIncomingId && !activeModalSession) {
      const topCall = incomingCalls[0];
      startIncomingRingtone({
        callId: topCall.id,
        callerName: topCall.initiatorName,
        callerPosition: topCall.initiatorPosition || formatRolePositionLabel(topCall.initiatorRole),
        mediaMode: topCall.mediaMode
      });
    } else {
      stopIncomingRingtone();
    }
    return () => {
      stopIncomingRingtone();
    };
  }, [activeIncomingId, activeModalSession]);

  const handleReturnMissedCall = async (missedCall, mode = "VIDEO") => {
    if (!missedCall) return;
    try {
      await apiClient.patch(`/video/calls/missed/${encodeURIComponent(missedCall.id)}/acknowledge`, {
        action: "RETURNED"
      });
    } catch { }
    setMissedCalls((prev) => prev.filter((m) => m.id !== missedCall.id));
    await handleStartDirectCall(
      {
        userId: missedCall.initiatorUserId || null,
        name: missedCall.initiatorName || "Caller",
        email: missedCall.initiatorEmail || null,
        role: missedCall.initiatorRole || "ADMIN",
        tenantId: missedCall.tenantId || undefined,
        tenantName: missedCall.targetTenantName || undefined
      },
      mode
    );
  };

  const handleDismissMissedCall = async (missedCallId) => {
    try {
      await apiClient.patch(`/video/calls/missed/${encodeURIComponent(missedCallId)}/acknowledge`, {
        action: "DISMISSED"
      });
    } catch { }
    setMissedCalls((prev) => prev.filter((m) => m.id !== missedCallId));
  };

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
    stopIncomingRingtone();
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
    stopIncomingRingtone();
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

  const rawAvailableTargets = isDeveloper
    ? [...(directory.headmasters || [])]
    : isHeadmaster
      ? [
        ...(directory.teachers || []),
        ...(directory.staff || []),
        ...(directory.parents || []),
        ...(directory.students || []),
        ...(directory.alumni || [])
      ]
      : isTeacher
        ? [...(directory.parents || []), ...(directory.headmasters || []), ...(directory.students || []), ...(directory.staff || [])]
        : isCampusStaff
          ? [...(directory.headmasters || []), ...(directory.teachers || []), ...(directory.staff || []), ...(directory.parents || []), ...(directory.students || [])]
          : isStudent
            ? [...(directory.teachers || []), ...(directory.headmasters || []), ...(directory.students || []), ...(directory.staff || [])]
            : isAlumni
              ? [...(directory.headmasters || []), ...(directory.teachers || []), ...(directory.alumni || []), ...(directory.staff || [])]
              : [...(directory.headmasters || []), ...(directory.teachers || []), ...(directory.staff || [])];

  const availableTargets = (() => {
    const seen = new Set();
    const out = [];
    for (const item of rawAvailableTargets) {
      const key = `${item.tenantId || "t"}_${String(item.userId || item.email || item.name).toLowerCase()}`;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(item);
    }
    return out;
  })();

  const chosenContact = availableTargets.find((c) => String(c.userId) === String(selectedContactId)) || null;

  const activeTeacherLiveClasses = activeConferences.filter((c) => c.callScope === "CLASS_CONFERENCE" || c.callScope === "STUDENT_CONFERENCE" || c.callScope === "ALL_CAMPUS_CONFERENCE");
  const activeDevExecConfs = activeConferences.filter((c) => c.callScope === "DEVELOPER_HEADMASTERS_CONFERENCE");
  const activeHeadmasterCampusConfs = activeConferences.filter((c) =>
    ["FACULTY_CONFERENCE", "STAFF_CONFERENCE", "PARENT_CONFERENCE", "STUDENT_CONFERENCE", "ALL_CAMPUS_CONFERENCE", "ALUMNI_CONFERENCE"].includes(String(c.callScope || "").toUpperCase())
  );

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
            <div style={{ fontSize: "0.75rem", fontWeight: 900, color: incomingCalls[0].initiatorRole === "DEVELOPER" ? "#38bdf8" : "#fde68a", textTransform: "uppercase", letterSpacing: "0.5px" }}>
              🔔 RINGING • INCOMING {incomingCalls[0].mediaMode} CALL • {incomingCalls[0].initiatorPosition || formatRolePositionLabel(incomingCalls[0].initiatorRole)}
            </div>
            <strong style={{ fontSize: "1.06rem", display: "block", marginTop: "2px" }}>
              {incomingCalls[0].initiatorName} ({incomingCalls[0].initiatorPosition || formatRolePositionLabel(incomingCalls[0].initiatorRole)}) is calling you
            </strong>
            <div style={{ fontSize: "0.78rem", color: "#a7f3d0", fontWeight: 700, marginTop: "3px" }}>
              🤖 AI Voice Assistant Announcing: "{buildIncomingCallAnnouncementPhrase({
                callerName: incomingCalls[0].initiatorName,
                callerPosition: incomingCalls[0].initiatorPosition || formatRolePositionLabel(incomingCalls[0].initiatorRole),
                mediaMode: incomingCalls[0].mediaMode
              })}"
            </div>
            <span style={{ fontSize: "0.76rem", color: "#cbd5e1" }}>
              {incomingCalls[0].title}
            </span>
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

      {/* Missed Video & Voice Calls Login Alert Prompt (Visible immediately upon login after being offline) */}
      {missedCalls.length > 0 && (
        <div
          data-testid="missed-calls-alert-banner"
          style={{
            background: "linear-gradient(135deg, rgba(127, 29, 29, 0.94) 0%, rgba(15, 23, 42, 0.96) 100%)",
            border: "2px solid #f59e0b",
            borderRadius: "14px",
            padding: "13px 16px",
            marginBottom: "12px",
            color: "#ffffff",
            display: "flex",
            flexDirection: "column",
            gap: "10px",
            boxShadow: "0 12px 32px rgba(0,0,0,0.45)"
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "8px" }}>
            <div style={{ fontSize: "0.78rem", fontWeight: 900, color: "#fde68a", textTransform: "uppercase", letterSpacing: "0.6px" }}>
              📵 YOU HAVE {missedCalls.length} MISSED {missedCalls.length === 1 ? "CALL" : "CALLS"} WHILE OFFLINE — RETURN CALL PROMPT
            </div>
            <span style={{ fontSize: "0.72rem", color: "#fecaca", fontWeight: 700 }}>
              Tap Return Video or Return Voice Call below to call back immediately
            </span>
          </div>
          {missedCalls.slice(0, 5).map((mc) => {
            const posLabel = mc.initiatorPosition || formatRolePositionLabel(mc.initiatorRole);
            const missedTime = new Date(mc.missedAt || mc.endedAt || mc.startedAt || Date.now()).toLocaleString();
            return (
              <div
                key={mc.id}
                data-testid={`missed-call-row-${mc.id}`}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  flexWrap: "wrap",
                  gap: "10px",
                  background: "rgba(2, 6, 23, 0.65)",
                  border: "1px solid rgba(251, 191, 36, 0.4)",
                  borderRadius: "10px",
                  padding: "10px 12px"
                }}
              >
                <div>
                  <strong style={{ color: "#ffffff", fontSize: "0.95rem" }}>
                    {mc.mediaMode === "VOICE" ? "📞 Missed Voice Call" : "📹 Missed Video Call"} from {mc.initiatorName}
                  </strong>
                  <div style={{ fontSize: "0.78rem", color: "#fde68a", fontWeight: 700, marginTop: "2px" }}>
                    Position: {posLabel} • Missed at {missedTime}
                  </div>
                </div>
                <div style={{ display: "flex", gap: "7px", flexWrap: "wrap" }}>
                  <button
                    type="button"
                    disabled={busy}
                    data-testid={`return-video-call-${mc.id}`}
                    onClick={() => handleReturnMissedCall(mc, "VIDEO")}
                    style={{ background: "#10b981", color: "#fff", border: "1px solid #6ee7b7", borderRadius: "8px", padding: "7px 12px", fontWeight: 900, cursor: "pointer", fontSize: "0.78rem" }}
                  >
                    📹 Return Video Call
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    data-testid={`return-voice-call-${mc.id}`}
                    onClick={() => handleReturnMissedCall(mc, "VOICE")}
                    style={{ background: "#0284c7", color: "#fff", border: "1px solid #7dd3fc", borderRadius: "8px", padding: "7px 12px", fontWeight: 800, cursor: "pointer", fontSize: "0.78rem" }}
                  >
                    📞 Return Voice Call
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDismissMissedCall(mc.id)}
                    style={{ background: "rgba(148, 163, 184, 0.18)", color: "#e2e8f0", border: "1px solid rgba(148, 163, 184, 0.4)", borderRadius: "8px", padding: "7px 10px", fontWeight: 700, cursor: "pointer", fontSize: "0.76rem" }}
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            );
          })}
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

      {/* Global Active Headmaster Conference Banner for Staff, Teachers, Parents, Secretary, HR, Accountant */}
      {variant === "GLOBAL_RECEIVER" && !isDeveloper && !isHeadmaster && !isStudent && activeHeadmasterCampusConfs.length > 0 && (
        <div
          data-testid="campus-live-conference-banner"
          style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: "12px" }}
        >
          {activeHeadmasterCampusConfs.slice(0, 2).map((conf) => (
            <div
              key={conf.id}
              style={{
                background: "linear-gradient(135deg, #065f46 0%, #081833 100%)",
                border: "2px solid #d4af37",
                borderRadius: "14px",
                padding: "12px 16px",
                color: "#ffffff",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexWrap: "wrap",
                gap: "12px",
                boxShadow: "0 10px 30px rgba(0,0,0,0.4)"
              }}
            >
              <div>
                <div style={{ fontSize: "0.72rem", fontWeight: 900, color: "#f6dd84", textTransform: "uppercase" }}>
                  🎥 LIVE SCHOOL VIDEO CONFERENCE ACTIVE • {(conf.participants || []).length} IN ROOM
                </div>
                <strong style={{ fontSize: "1rem" }}>
                  {conf.title} — Hosted by {conf.initiatorName}
                </strong>
              </div>
              <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => handleAcceptCall(conf, "VIDEO")}
                  style={{ background: "#10b981", color: "#fff", border: "1px solid #f6dd84", borderRadius: "8px", padding: "8px 14px", fontWeight: 900, cursor: "pointer", fontSize: "0.82rem" }}
                >
                  🎥 Join Video Conference
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => handleAcceptCall(conf, "VOICE")}
                  style={{ background: "#0284c7", color: "#fff", border: "1px solid #7dd3fc", borderRadius: "8px", padding: "8px 14px", fontWeight: 800, cursor: "pointer", fontSize: "0.82rem" }}
                >
                  🎙️ Join Audio
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
                    ? "Headmaster Live Video Conferences (Staff, Teachers, Parents & Students) & Direct Calls"
                    : isTeacher
                      ? "Live Online Classes with Students & Direct Faculty / Parent Calls"
                      : isSecretary
                        ? "Secretary Front Desk — Direct Video / Voice Calling & Campus Conferences"
                        : isAccountant
                          ? "Bursar & Finance Office — Direct Video / Voice Calling & Parent Fee Consultations"
                          : isHR
                            ? "HR Directorate — Staff Interviews, Video Meetings & Direct Faculty Calling"
                            : isStaff
                              ? "Campus Operations & Staff — Direct Video / Voice Calling & Team Rooms"
                              : isStudent
                                ? "Student Live Video / Voice Calling with Teachers, Headmaster & Classmates"
                                : isAlumni
                                  ? "Alumni Live Video Reunions, Mentorship Calls & School Connection Hub"
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
                  -- Select {isDeveloper ? "Registered Institution Headmaster" : isHeadmaster ? "Teacher / Staff / Parent / Student / Alumni" : isTeacher ? "Parent, Headmaster, Student, or Staff" : isCampusStaff ? "Headmaster, Teacher, Staff, Parent, or Student" : isStudent ? "Teacher, Headmaster, Classmate, or Staff" : isAlumni ? "Headmaster, Teacher, Alumni, or Staff" : "Headmaster, Teacher, or Bursar/Staff"} --
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
                  {isHeadmaster && (
                    <div style={{ marginBottom: "8px" }}>
                      <label style={{ display: "block", fontSize: "0.72rem", color: "#f6dd84", fontWeight: 800, marginBottom: "4px" }}>
                        🎯 Select Conference Audience (Staff, Teachers, Parents, or Students)
                      </label>
                      <select
                        data-testid="headmaster-conference-audience-select"
                        value={headmasterConfAudience}
                        onChange={(e) => setHeadmasterConfAudience(e.target.value)}
                        style={{ width: "100%", padding: "8px 10px", borderRadius: "8px", border: "1px solid rgba(212,175,55,0.55)", background: "#081833", color: "#ffffff", fontSize: "0.82rem", fontWeight: 700 }}
                      >
                        <option value="ALL_CAMPUS_CONFERENCE">🏛️ All Campus (Staff, Teachers, Parents &amp; Students)</option>
                        <option value="STAFF_CONFERENCE">👔 All School Staff (Admin, Secretary, HR, Accountant, Non-Teaching)</option>
                        <option value="FACULTY_CONFERENCE">👨‍🏫 Teachers &amp; Academic Faculty</option>
                        <option value="PARENT_CONFERENCE">👨‍👩‍👧 Parents &amp; Guardians (PTA Video Meeting)</option>
                        <option value="STUDENT_CONFERENCE">🎓 Students Live Assembly / Town Hall</option>
                      </select>
                    </div>
                  )}
                  <input
                    type="text"
                    placeholder={
                      isDeveloper
                        ? "Agenda (e.g. National Headmasters Platform Upgrade Briefing)"
                        : isHeadmaster
                          ? "Agenda (e.g. Term Briefing with Staff / Parents / Teachers / Students)"
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
                      onClick={() => {
                        const hmAudienceTitles = {
                          ALL_CAMPUS_CONFERENCE: "Headmaster All-Campus Live Video Conference (Staff, Teachers, Parents & Students)",
                          STAFF_CONFERENCE: "Headmaster & School Staff Live Video Conference",
                          FACULTY_CONFERENCE: "Headmaster & Teachers Faculty Video Conference",
                          PARENT_CONFERENCE: "Headmaster & Parents PTA Live Video Conference",
                          STUDENT_CONFERENCE: "Headmaster & Students Live Video Assembly"
                        };
                        handleLaunchConference(
                          isDeveloper
                            ? "DEVELOPER_HEADMASTERS_CONFERENCE"
                            : isHeadmaster
                              ? headmasterConfAudience
                              : isTeacher
                                ? "CLASS_CONFERENCE"
                                : isCampusStaff
                                  ? "STAFF_CONFERENCE"
                                  : isAlumni
                                    ? "ALUMNI_CONFERENCE"
                                    : "STUDENT_CONFERENCE",
                          isDeveloper
                            ? "Developer & Headmasters Executive Video Conference"
                            : isHeadmaster
                              ? (hmAudienceTitles[headmasterConfAudience] || "Headmaster Live Video Conference")
                              : isTeacher
                                ? "Teacher Live Video Conference"
                                : isCampusStaff
                                  ? `${roleUpper} Live Coordination Video Conference`
                                  : isAlumni
                                    ? "Alumni Live Video Reunion & Mentorship Room"
                                    : "Student Live Study Video Conference",
                          "VIDEO"
                        );
                      }}
                      style={{ flex: 1, background: "linear-gradient(135deg, #2563eb, #1d4ed8)", color: "#fff", border: "1px solid #7dd3fc", borderRadius: "8px", padding: "8px 12px", fontWeight: 800, cursor: "pointer", fontSize: "0.8rem" }}
                    >
                      🎥 Launch Video Conference
                    </button>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() =>
                        handleLaunchConference(
                          isDeveloper
                            ? "DEVELOPER_HEADMASTERS_CONFERENCE"
                            : isHeadmaster
                              ? headmasterConfAudience
                              : isCampusStaff
                                ? "STAFF_CONFERENCE"
                                : isAlumni
                                  ? "ALUMNI_CONFERENCE"
                                  : isStudent
                                    ? "STUDENT_CONFERENCE"
                                    : "PARENT_CONFERENCE",
                          isDeveloper
                            ? "Developer & Headmasters Voice Briefing"
                            : isHeadmaster
                              ? `Headmaster Live Voice Conference (${headmasterConfAudience.replace(/_/g, " ")})`
                              : isCampusStaff
                                ? `${roleUpper} Live Voice Briefing`
                                : isAlumni
                                  ? "Alumni Live Voice Mentorship Circle"
                                  : isStudent
                                    ? "Student Live Audio Study Group"
                                    : "Parent & Guardian Voice Conference",
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
