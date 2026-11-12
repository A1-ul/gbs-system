import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";

export const REAL_ACTION_ROLE_VIDEOS = [
  {
    id: "MASTER",
    roleBadge: "ALL 6 SCHOOL ROLES (MASTER ACTION MOVIE)",
    title: "Complete GBS System Action Presentation (Roles 1–6)",
    duration: "05:51",
    sizeLabel: "53.99 MB",
    icon: "🎬",
    color: "#f59e0b",
    poster: "/assets/real/headmaster_desk.jpg",
    file: "/videos/gbs_complete_system_roles_master_guide.mp4",
    downloadName: "GBS_Complete_System_Roles_Master_Action_Guide.mp4",
    summary:
      "Full 30-scene HD real-life documentary action presentation combining real school photography with live UI actions across Headmaster, Teacher, Student, Parent, Accountant, and Non-Teaching Staff & HR."
  },
  {
    id: "ADMIN",
    roleBadge: "VIDEO 1 • HEADMASTER / SCHOOL ADMIN",
    title: "Role 1: Headmaster / School Admin Action Tour",
    duration: "01:05",
    sizeLabel: "9.62 MB",
    icon: "🎓",
    color: "#3b82f6",
    poster: "/assets/real/headmaster_desk.jpg",
    file: "/videos/video1_headmaster_role_guide.mp4",
    downloadName: "GBS_Video1_Headmaster_Action_Guide.mp4",
    summary:
      "Developer approval branding every dashboard to the registered school name (e.g. BEST KIDS), logo/name setup notice, strict lock/delete security & user approvals, Real 2-Mode Language Translator, Live Google Maps Emergency Locator, and Official Branded Admissions Documents."
  },
  {
    id: "TEACHER",
    roleBadge: "VIDEO 2 • TEACHER PORTAL",
    title: "Role 2: Teacher Portal & AI Exam Scanner Action Tour",
    duration: "01:02",
    sizeLabel: "9.33 MB",
    icon: "👩‍🏫",
    color: "#10b981",
    poster: "/assets/real/teacher_scanner.jpg",
    file: "/videos/video2_teacher_role_guide.mp4",
    downloadName: "GBS_Video2_Teacher_Action_Guide.mp4",
    summary:
      "Verified Teacher login, tick-by-tick student classroom attendance, Live Zoom/Google Meet online classes, Pre-recorded Topic Videos & Voice Notes, Mobile Camera AI OMR Exam Scanner with manual override, and terminal report card publication."
  },
  {
    id: "STUDENT",
    roleBadge: "VIDEO 3 • STUDENT PORTAL",
    title: "Role 3: Student Portal & Digital E-Library Action Tour",
    duration: "00:58",
    sizeLabel: "8.84 MB",
    icon: "🎒",
    color: "#8b5cf6",
    poster: "/assets/real/student_elearning.jpg",
    file: "/videos/video3_student_role_guide.mp4",
    downloadName: "GBS_Video3_Student_Action_Guide.mp4",
    summary:
      "Strict Student verification & branded login, watching Teacher Topic Videos & Live Classes, submitting online assignments/quizzes, borrowing E-Library PDFs with the Real Language Translator, and downloading stamped Terminal Report Cards."
  },
  {
    id: "PARENT",
    roleBadge: "VIDEO 4 • PARENT / GUARDIAN PORTAL",
    title: "Role 4: Parent & Guardian Portal Action Tour",
    duration: "00:56",
    sizeLabel: "8.24 MB",
    icon: "👨‍👩‍👧",
    color: "#eab308",
    poster: "/assets/real/parent_mobile.jpg",
    file: "/videos/video4_parent_role_guide.mp4",
    downloadName: "GBS_Video4_Parent_Action_Guide.mp4",
    summary:
      "Real-time child attendance & terminal grade tracking, sharing live Google Maps GPS emergency coordinates, instant Mobile Money/Card tuition payment with official stamped receipt PDFs, translated teacher chat, and online child admissions."
  },
  {
    id: "ACCOUNTANT",
    roleBadge: "VIDEO 5 • ACCOUNTANT / BURSAR PORTAL",
    title: "Role 5: Accountant & Bursar Finance Action Tour",
    duration: "00:56",
    sizeLabel: "8.28 MB",
    icon: "📊",
    color: "#ec4899",
    poster: "/assets/real/accountant_finance.jpg",
    file: "/videos/video5_accountant_role_guide.mp4",
    downloadName: "GBS_Video5_Accountant_Action_Guide.mp4",
    summary:
      "Configuring termly class tuition fee schedules, auto-reconciling MoMo/Bank/Cash ledgers, printing stamped institutional receipts, triggering overdue fee SMS alerts, and running Staff Payroll with locked audit trails."
  },
  {
    id: "STAFF",
    roleBadge: "VIDEO 6 • NON-TEACHING STAFF & HR",
    title: "Role 6: Non-Teaching Staff & HR Operations Tour",
    duration: "00:53",
    sizeLabel: "9.69 MB",
    icon: "🛡️",
    color: "#06b6d4",
    poster: "/assets/real/staff_gate_turnstile.jpg",
    file: "/videos/video6_staff_hr_role_guide.mp4",
    downloadName: "GBS_Video6_Staff_HR_Action_Guide.mp4",
    summary:
      "Morning duty roster clock-in, Campus Gate QR/ID student pickup verification, School Bus Fleet boarding manifest & live GPS tracking, Library checkout & Asset inventory ledger, and HR leave approvals & stamped payslips."
  }
];

// Keep backwards-compatible export name while presenting real-life action videos
export const CARTOON_ROLE_VIDEOS = REAL_ACTION_ROLE_VIDEOS;

export default function CartoonRoleVideoHubModal({ isOpen, onClose, initialVideoId = "MASTER" }) {
  const [activeId, setActiveId] = useState(initialVideoId || "MASTER");

  useEffect(() => {
    if (isOpen) {
      setActiveId(initialVideoId || "MASTER");
    }
  }, [isOpen, initialVideoId]);

  useEffect(() => {
    if (!isOpen) return undefined;
    const handleEsc = (e) => {
      if (e.key === "Escape") onClose?.();
    };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const activeVideo =
    REAL_ACTION_ROLE_VIDEOS.find((v) => v.id === activeId) || REAL_ACTION_ROLE_VIDEOS[0];

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 99999,
        background: "rgba(2, 6, 23, 0.90)",
        backdropFilter: "blur(10px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "16px",
        overflowY: "auto"
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "1140px",
          maxHeight: "94vh",
          overflowY: "auto",
          background: "linear-gradient(145deg, #0b1120 0%, #172554 55%, #0f172a 100%)",
          border: "2px solid #f59e0b",
          borderRadius: "20px",
          boxShadow: "0 25px 65px rgba(0, 0, 0, 0.8)",
          color: "#f8fafc",
          padding: "22px"
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: "12px",
            borderBottom: "1px solid rgba(255,255,255,0.14)",
            paddingBottom: "14px",
            marginBottom: "16px"
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <span style={{ fontSize: "2.1rem" }}>🎬</span>
            <div>
              <h3 style={{ margin: 0, fontSize: "1.22rem", color: "#fbbf24", fontWeight: 900 }}>
                GBS REAL-LIFE ACTION VIDEO PRESENTATION CENTER
              </h3>
              <p style={{ margin: "3px 0 0", fontSize: "0.82rem", color: "#cbd5e1" }}>
                Watch live UI workflows paired with real-life school footage — understand every portal before or after login
              </p>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
            <Link
              to="/presentation-engine"
              onClick={onClose}
              style={{
                background: "rgba(56, 189, 248, 0.16)",
                border: "1px solid rgba(56, 189, 248, 0.55)",
                color: "#7dd3fc",
                padding: "9px 14px",
                borderRadius: "10px",
                fontWeight: 800,
                fontSize: "0.80rem",
                textDecoration: "none",
                display: "inline-flex",
                alignItems: "center",
                gap: "6px"
              }}
            >
              🖥️ Interactive Presentation Engine
            </Link>
            <a
              href={REAL_ACTION_ROLE_VIDEOS[0].file}
              download={REAL_ACTION_ROLE_VIDEOS[0].downloadName}
              style={{
                background: "linear-gradient(135deg, #f59e0b, #d97706)",
                color: "#0f172a",
                padding: "9px 15px",
                borderRadius: "10px",
                fontWeight: 900,
                fontSize: "0.80rem",
                textDecoration: "none",
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                boxShadow: "0 4px 14px rgba(245, 158, 11, 0.35)"
              }}
            >
              ⬇️ Download Full Master Movie (MP4 • {REAL_ACTION_ROLE_VIDEOS[0].sizeLabel})
            </a>
            <button
              type="button"
              onClick={onClose}
              style={{
                background: "rgba(255,255,255,0.08)",
                border: "1px solid rgba(255,255,255,0.22)",
                color: "#fff",
                padding: "8px 13px",
                borderRadius: "10px",
                fontWeight: 800,
                cursor: "pointer"
              }}
            >
              ✕ Close
            </button>
          </div>
        </div>

        {/* Main Grid: Video Player + Role Tabs */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(0, 1.8fr) minmax(270px, 1fr)",
            gap: "18px",
            alignItems: "start"
          }}
        >
          {/* Left: HD Real-Life Action MP4 Video Player */}
          <div>
            <div
              style={{
                background: "#020617",
                borderRadius: "14px",
                overflow: "hidden",
                border: `2px solid ${activeVideo.color}`,
                boxShadow: "0 14px 34px rgba(0,0,0,0.65)"
              }}
            >
              <video
                key={activeVideo.file}
                src={activeVideo.file}
                poster={activeVideo.poster}
                controls
                autoPlay
                playsInline
                preload="metadata"
                style={{
                  width: "100%",
                  aspectRatio: "16 / 9",
                  display: "block",
                  background: "#000"
                }}
              />
            </div>

            <div
              style={{
                marginTop: "12px",
                background: "rgba(15, 23, 42, 0.85)",
                border: "1px solid rgba(255,255,255,0.12)",
                borderRadius: "12px",
                padding: "14px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexWrap: "wrap",
                gap: "12px"
              }}
            >
              <div style={{ flex: 1, minWidth: "240px" }}>
                <div
                  style={{
                    fontSize: "0.72rem",
                    fontWeight: 900,
                    color: activeVideo.color,
                    letterSpacing: "0.06em"
                  }}
                >
                  {activeVideo.roleBadge} • {activeVideo.duration} • {activeVideo.sizeLabel}
                </div>
                <h4 style={{ margin: "4px 0", fontSize: "1.05rem", color: "#fff" }}>
                  {activeVideo.icon} {activeVideo.title}
                </h4>
                <p style={{ margin: 0, fontSize: "0.80rem", color: "#cbd5e1", lineHeight: 1.48 }}>
                  {activeVideo.summary}
                </p>
              </div>
              <a
                href={activeVideo.file}
                download={activeVideo.downloadName}
                style={{
                  background: activeVideo.color,
                  color: "#020617",
                  padding: "10px 16px",
                  borderRadius: "10px",
                  fontWeight: 900,
                  fontSize: "0.82rem",
                  textDecoration: "none",
                  whiteSpace: "nowrap"
                }}
              >
                ⬇️ Download This Video (MP4)
              </a>
            </div>
          </div>

          {/* Right: 7 Video Selector Playlist with Real Photo Previews */}
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            <div
              style={{
                fontSize: "0.76rem",
                fontWeight: 900,
                color: "#94a3b8",
                letterSpacing: "0.06em",
                marginBottom: "2px"
              }}
            >
              SELECT REAL-LIFE ACTION PRESENTATION:
            </div>
            {REAL_ACTION_ROLE_VIDEOS.map((vid) => {
              const isSelected = vid.id === activeVideo.id;
              return (
                <button
                  key={vid.id}
                  type="button"
                  onClick={() => setActiveId(vid.id)}
                  style={{
                    textAlign: "left",
                    padding: "9px 11px",
                    borderRadius: "12px",
                    border: isSelected
                      ? `2px solid ${vid.color}`
                      : "1px solid rgba(255,255,255,0.12)",
                    background: isSelected
                      ? "rgba(255,255,255,0.11)"
                      : "rgba(15,23,42,0.7)",
                    color: "#f8fafc",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                    transition: "all 0.15s ease"
                  }}
                >
                  <img
                    src={vid.poster}
                    alt={vid.title}
                    style={{
                      width: "56px",
                      height: "36px",
                      objectFit: "cover",
                      borderRadius: "7px",
                      border: `1px solid ${vid.color}`,
                      flexShrink: 0
                    }}
                  />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontSize: "0.66rem",
                        fontWeight: 900,
                        color: vid.color,
                        letterSpacing: "0.04em"
                      }}
                    >
                      {vid.roleBadge}
                    </div>
                    <div
                      style={{
                        fontSize: "0.80rem",
                        fontWeight: 800,
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis"
                      }}
                    >
                      {vid.icon} {vid.title}
                    </div>
                  </div>
                  <span
                    style={{
                      fontSize: "0.70rem",
                      fontWeight: 800,
                      background: "rgba(0,0,0,0.42)",
                      padding: "3px 7px",
                      borderRadius: "6px",
                      color: "#e2e8f0"
                    }}
                  >
                    {vid.duration}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

