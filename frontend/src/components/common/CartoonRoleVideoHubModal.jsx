import React, { useState } from "react";

export const CARTOON_ROLE_VIDEOS = [
  {
    id: "MASTER",
    roleBadge: "ALL 6 SCHOOL ROLES (MASTER MOVIE)",
    title: "Complete GBS System Cartoon Master Movie (Roles 1–6)",
    duration: "07:20",
    icon: "🎬",
    color: "#f59e0b",
    file: "/videos/gbs_complete_system_roles_master_guide.mp4",
    downloadName: "GBS_Complete_System_Roles_Master_Guide.mp4",
    summary:
      "Full 30-scene HD 3D cartoon walkthrough with voiceover narration & subtitles covering every school role: Headmaster, Teacher, Student, Parent, Accountant, and Non-Teaching Staff & HR."
  },
  {
    id: "ADMIN",
    roleBadge: "VIDEO 1 • HEADMASTER / SCHOOL ADMIN",
    title: "Role 1: Headmaster / School Admin Portal",
    duration: "01:24",
    icon: "🎓",
    color: "#3b82f6",
    file: "/videos/video1_headmaster_role_guide.mp4",
    downloadName: "GBS_Video1_Headmaster_Role_Guide.mp4",
    summary:
      "Institution onboarding, approving Teachers/Students/Parents/Staff, managing admissions & academics, minimizing statutory directives, Live Google Maps Parent Emergency Locator, and AI Exam/Security supervision."
  },
  {
    id: "TEACHER",
    roleBadge: "VIDEO 2 • TEACHER PORTAL",
    title: "Role 2: Teacher Portal & AI Exam Scanner",
    duration: "01:15",
    icon: "👩‍🏫",
    color: "#10b981",
    file: "/videos/video2_teacher_role_guide.mp4",
    downloadName: "GBS_Video2_Teacher_Role_Guide.mp4",
    summary:
      "Verified Teacher login, individual student tick-by-tick attendance marking, recording Topic Videos when absent, hosting Live Online Classes, Mobile Camera AI Exam Scanner auto-grading, and terminal results."
  },
  {
    id: "STUDENT",
    roleBadge: "VIDEO 3 • STUDENT PORTAL",
    title: "Role 3: Student Portal & Digital E-Library",
    duration: "01:07",
    icon: "🎒",
    color: "#8b5cf6",
    file: "/videos/video3_student_role_guide.mp4",
    downloadName: "GBS_Video3_Student_Role_Guide.mp4",
    summary:
      "Verified Student login, watching Teacher Topic Videos, joining Live Classes, listening to voice notes, submitting homework & quizzes, borrowing E-Library books with the AI Translator, and viewing Terminal Report Cards."
  },
  {
    id: "PARENT",
    roleBadge: "VIDEO 4 • PARENT / GUARDIAN PORTAL",
    title: "Role 4: Parent & Guardian Portal",
    duration: "01:09",
    icon: "👨‍👩‍👧",
    color: "#eab308",
    file: "/videos/video4_parent_role_guide.mp4",
    downloadName: "GBS_Video4_Parent_Role_Guide.mp4",
    summary:
      "Monitoring enrolled children's real-time attendance & report cards, paying school fees via Mobile Money/Card with instant official PDF receipts, sharing live Google Maps GPS coordinates, and chatting with Teachers."
  },
  {
    id: "ACCOUNTANT",
    roleBadge: "VIDEO 5 • ACCOUNTANT / BURSAR PORTAL",
    title: "Role 5: Accountant & Bursar Finance Portal",
    duration: "01:15",
    icon: "📊",
    color: "#ec4899",
    file: "/videos/video5_accountant_role_guide.mp4",
    downloadName: "GBS_Video5_Accountant_Role_Guide.mp4",
    summary:
      "Configuring termly class fee structures, reconciling MoMo/Bank/Cash tuition payments, issuing official digital receipts, tracking arrears with automated SMS reminders, and processing monthly staff payroll."
  },
  {
    id: "STAFF",
    roleBadge: "VIDEO 6 • NON-TEACHING STAFF & HR",
    title: "Role 6: Non-Teaching Staff & HR Operations",
    duration: "01:11",
    icon: "🛡️",
    color: "#06b6d4",
    file: "/videos/video6_staff_hr_role_guide.mp4",
    downloadName: "GBS_Video6_Staff_HR_Role_Guide.mp4",
    summary:
      "Daily staff clock-in, campus gate security & guardian pickup verification, school bus fleet manifest & live GPS telemetry, library book circulation & store inventory, and HR leave/payslip workflows."
  }
];

export default function CartoonRoleVideoHubModal({ isOpen, onClose, initialVideoId = "MASTER" }) {
  const [activeId, setActiveId] = useState(initialVideoId || "MASTER");

  if (!isOpen) return null;

  const activeVideo = CARTOON_ROLE_VIDEOS.find((v) => v.id === activeId) || CARTOON_ROLE_VIDEOS[0];

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 99999,
        background: "rgba(2, 6, 23, 0.88)",
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
          maxWidth: "1120px",
          maxHeight: "94vh",
          overflowY: "auto",
          background: "linear-gradient(145deg, #0f172a 0%, #1e293b 100%)",
          border: "2px solid #f59e0b",
          borderRadius: "20px",
          boxShadow: "0 25px 60px rgba(0, 0, 0, 0.75)",
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
            borderBottom: "1px solid rgba(255,255,255,0.12)",
            paddingBottom: "14px",
            marginBottom: "16px"
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <span style={{ fontSize: "2.1rem" }}>🎬</span>
            <div>
              <h3 style={{ margin: 0, fontSize: "1.25rem", color: "#fbbf24", fontWeight: 900 }}>
                GBS ANIMATED CARTOON HOW-IT-WORKS VIDEO CENTER
              </h3>
              <p style={{ margin: "2px 0 0", fontSize: "0.82rem", color: "#cbd5e1" }}>
                Watch or download the Complete 6-Role Master Movie or individual cartoon guides for each school user role
              </p>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <a
              href={CARTOON_ROLE_VIDEOS[0].file}
              download={CARTOON_ROLE_VIDEOS[0].downloadName}
              style={{
                background: "linear-gradient(135deg, #f59e0b, #d97706)",
                color: "#0f172a",
                padding: "9px 16px",
                borderRadius: "10px",
                fontWeight: 900,
                fontSize: "0.82rem",
                textDecoration: "none",
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                boxShadow: "0 4px 14px rgba(245, 158, 11, 0.35)"
              }}
            >
              ⬇️ Download Full Master Movie (All 6 Roles • MP4)
            </a>
            <button
              type="button"
              onClick={onClose}
              style={{
                background: "rgba(239, 68, 68, 0.2)",
                border: "1px solid #ef4444",
                color: "#fca5a5",
                padding: "8px 14px",
                borderRadius: "10px",
                fontWeight: 800,
                cursor: "pointer"
              }}
            >
              ✕ Close
            </button>
          </div>
        </div>

        {/* Role Selector Tabs */}
        <div
          style={{
            display: "flex",
            gap: "8px",
            flexWrap: "wrap",
            marginBottom: "16px"
          }}
        >
          {CARTOON_ROLE_VIDEOS.map((vid) => {
            const isSelected = vid.id === activeVideo.id;
            return (
              <button
                key={vid.id}
                type="button"
                onClick={() => setActiveId(vid.id)}
                style={{
                  padding: "9px 14px",
                  borderRadius: "10px",
                  border: isSelected ? `2px solid ${vid.color}` : "1px solid rgba(255,255,255,0.15)",
                  background: isSelected ? "rgba(30, 58, 138, 0.65)" : "rgba(15, 23, 42, 0.7)",
                  color: isSelected ? "#ffffff" : "#cbd5e1",
                  fontWeight: isSelected ? 800 : 600,
                  fontSize: "0.8rem",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px"
                }}
              >
                <span>{vid.icon}</span>
                <span>{vid.id === "MASTER" ? "🎬 Master Movie (All 6 Roles)" : vid.title.replace(/^Role \d+: /, "")}</span>
                <span
                  style={{
                    fontSize: "0.7rem",
                    background: "rgba(0,0,0,0.35)",
                    padding: "2px 6px",
                    borderRadius: "6px",
                    color: "#fbbf24"
                  }}
                >
                  {vid.duration}
                </span>
              </button>
            );
          })}
        </div>

        {/* Main Video Player + Active Info */}
        <div
          style={{
            background: "#020617",
            borderRadius: "16px",
            border: `2px solid ${activeVideo.color}`,
            overflow: "hidden",
            marginBottom: "18px"
          }}
        >
          <video
            key={activeVideo.file}
            src={activeVideo.file}
            controls
            autoPlay
            style={{
              width: "100%",
              maxHeight: "480px",
              display: "block",
              background: "#000"
            }}
          />
          <div
            style={{
              padding: "14px 18px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: "12px",
              background: "rgba(15, 23, 42, 0.95)"
            }}
          >
            <div style={{ flex: 1, minWidth: "260px" }}>
              <span
                style={{
                  fontSize: "0.72rem",
                  fontWeight: 900,
                  color: activeVideo.color,
                  letterSpacing: "0.6px",
                  display: "block"
                }}
              >
                {activeVideo.roleBadge} ({activeVideo.duration})
              </span>
              <strong style={{ fontSize: "1.05rem", color: "#ffffff", display: "block", marginTop: "2px" }}>
                {activeVideo.title}
              </strong>
              <p style={{ margin: "4px 0 0", fontSize: "0.82rem", color: "#94a3b8" }}>{activeVideo.summary}</p>
            </div>
            <a
              href={activeVideo.file}
              download={activeVideo.downloadName}
              style={{
                background: activeVideo.color,
                color: "#0f172a",
                padding: "10px 18px",
                borderRadius: "10px",
                fontWeight: 900,
                fontSize: "0.84rem",
                textDecoration: "none",
                whiteSpace: "nowrap"
              }}
            >
              ⬇️ Download This Video (MP4)
            </a>
          </div>
        </div>

        {/* Direct Download Grid for All 7 Videos */}
        <div>
          <h4 style={{ margin: "0 0 10px", fontSize: "0.9rem", color: "#fbbf24", textTransform: "uppercase" }}>
            📥 Direct MP4 Downloads (Master Movie + Individual Role Videos)
          </h4>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
              gap: "10px"
            }}
          >
            {CARTOON_ROLE_VIDEOS.map((vid) => (
              <div
                key={vid.id}
                style={{
                  background: "rgba(15, 23, 42, 0.75)",
                  border: "1px solid rgba(255,255,255,0.12)",
                  borderRadius: "12px",
                  padding: "10px 12px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: "8px"
                }}
              >
                <div style={{ overflow: "hidden" }}>
                  <div style={{ fontSize: "0.8rem", fontWeight: 800, color: "#f8fafc", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {vid.icon} {vid.title}
                  </div>
                  <div style={{ fontSize: "0.72rem", color: "#94a3b8" }}>Duration: {vid.duration} • HD MP4</div>
                </div>
                <a
                  href={vid.file}
                  download={vid.downloadName}
                  style={{
                    background: "rgba(56, 189, 248, 0.18)",
                    border: "1px solid #38bdf8",
                    color: "#38bdf8",
                    padding: "6px 10px",
                    borderRadius: "8px",
                    fontSize: "0.74rem",
                    fontWeight: 800,
                    textDecoration: "none",
                    whiteSpace: "nowrap"
                  }}
                >
                  ⬇️ MP4
                </a>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

