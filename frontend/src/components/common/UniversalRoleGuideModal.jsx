import React, { useState, useEffect } from "react";
import CartoonRoleVideoHubModal, { REAL_ACTION_ROLE_VIDEOS } from "./CartoonRoleVideoHubModal";

const ROLE_GUIDES = {
  ADMIN: {
    title: "Headmaster / Principal Command Center — Exact Operating Guide",
    subtitle: "Voice Biometrics, Branding, Admissions, Bus Transport, Inbuilt CCTV Mobile Link, Teacher Checkup & Sign Out",
    badgeColor: "#38bdf8",
    dashboardRoute: "/portal/admin/dashboard",
    sections: [
      {
        id: "header-signout",
        title: "1. Top Header Controls, School Branding, Video Guide & Sign Out (🚪 Sign Out)",
        steps: [
          "Click the red '🚪 Sign Out' button in the Top Window Control Bar or the Headmaster Header at any time to securely end your session and return to '/login'.",
          "Click '📖 Operating Guide' or '🎬 Presentation Video' in the top header to open this step-by-step manual or the full 10-Role Video Presentation Theatre.",
          "Click '✏️ Change School Name & Upload Logo' on the gold setup banner to upload your official school crest and confirm your exact institution name across all 10 portals and printable reports."
        ]
      },
      {
        id: "cockpit-kpis",
        title: "2. Institutional Governance KPIs & User Registration Drop-List Counts",
        steps: [
          "Inspect the User Registration Drop-List to verify live headcount across Teachers, Students, Parents, Accountants, HR Officers, Non-Teaching Staff, Alumni, and Inventory Managers.",
          "Click '🎓 Students Admitted ↗' or '📂 Admissions Intake ↗' to review applicant biodata and click '✅ Approve Admission' to auto-issue Student IDs and acceptance letters.",
          "Click '🚌 Students Boarding Bus ↗' to create bus destination routes, set termly fares, and assign registered drivers to students."
        ]
      },
      {
        id: "cctv-emergency",
        title: "3. Exclusive Inbuilt Campus CCTV & Mobile Link + Emergency Parent GPS",
        steps: [
          "Click '📹 Inbuilt CCTV & Mobile' in the header to view live encrypted campus camera feeds (Main Gate, Exam Hall, Administration, Science Block) and pair with the Headmaster's smartphone.",
          "Open the '🚨 Emergency Parent Locator' tab to look up any student's guardian phone number and launch live Google Maps GPS directions to their home/workplace.",
          "Monitor security status ('VOICE & RBAC ACTIVE') and review audit logs for any unauthorized deletion attempts."
        ]
      },
      {
        id: "academic-checkup",
        title: "4. Teacher Lesson Notes, Weekly Attendance Checkup, Fee Approvals & Subscription",
        steps: [
          "Open the '📚 Teacher Lesson Notes & Weekly Attendance Checkup Desk' to inspect submitted teacher registers and click '✅ Approve & Sign Off'.",
          "Publish the official Academic Term Schedule (14-week calendar, exam windows, and vacation dates) to Teacher, Student, and Parent portals.",
          "Review Accountant fee structures under '💳 Fee Approvals' and remit platform subscription dues via MoMo (0554594193) for 1-click Developer verification."
        ]
      }
    ]
  },
  TEACHER: {
    title: "Teacher & Academic Faculty Suite — Exact Operating Guide",
    subtitle: "Multi-Format Question Bank (MCQ/Theory/True-False/Short Answer/Fill-in-Blank/Case Study), Exam Timetable Guide, Theory Grading & AI OMR Scanner",
    badgeColor: "#10b981",
    dashboardRoute: "/portal/teacher/dashboard",
    sections: [
      {
        id: "multi-format-qbank",
        title: "1. Multi-Format Question Bank & Scheduled Timed Examinations",
        steps: [
          "In the Examination & Grading Center, click '➕ Set Questions & Schedule Timed Exam' (or click any format pill directly on Card 1: '📘 Multiple Choice (MCQ)', '✍️ Theory / Essay', '☑️ True or False', '📝 Short Answer', '🔤 Fill in Blank', '🧪 Case Study / Practical').",
          "Inside the Multi-Format Question Bank, click any high-contrast format tab ('🌐 All Formats / Mixed Bank', '📘 Multiple Choice (MCQ)', '✍️ Theory / Essay', '☑️ True or False', '📝 Short Answer', '🔤 Fill in Blank', or '🧪 Case Study / Practical') — all inscriptions are displayed in bright white/gold on dark colored buttons.",
          "When you select a format tab, the workspace filters to that format (and automatically adds a starter question if none exists). Click '➕ Add [Format] Question' to add more questions of that format, or click '🎯 Set Entire Exam to [Format] Only' to make the entire paper pure MCQ, pure Theory, or pure True/False.",
          "For Multiple Choice: enter options A, B, C, D and click the A/B/C/D badge (or dropdown) to mark the correct option. For True/False: click 'A. True ✓' or 'B. False ✓'. For Theory/Short Answer/Case Study: enter the prompt, Examiner Marking Guide rubric, keywords, and word limit. For Fill-in-Blank: click '➕ Insert Blank (____)' and enter the Accepted Exact Answer.",
          "Set the Exam Date, Start Time, End Time, and Duration, then click '📢 Schedule & Publish Timed Exam Now' (or verify & publish). The exam immediately syncs to the Student Dashboard and the Official Examination Timetable Guide."
        ]
      },
      {
        id: "exam-timetable-guide",
        title: "2. Official Examination Timetable Guide (Add Timetable Entries Anytime)",
        steps: [
          "On Card 2 ('📅 Official Examination Timetable Guide'), click '➕ Add Timetable Entry' to immediately append a new exam time slot even when there are already existing exam sessions on the guide.",
          "Click '🔄 Sync Exam Times' to automatically import all scheduled timed exams (with their dates, start/end times, and question formats) into the Examination Timetable Guide.",
          "Click '📅 Create / Edit Timetable Guide' to open the full timetable editor modal. Use the '➕ Add Examination Timetable Entry for Students' top form bar to enter Course Code, Subject, Class/Cohort, Exam Date, Start Time, End Time, Exam Format (MCQ, Theory, True/False, Mixed, etc.), and Hall, then click '➕ Add Timetable Entry' or '⚡ + Add Another Timetable Row'.",
          "Click '📢 Publish Examination Timetable to Students' to broadcast the updated timetable guide to all Student and Headmaster dashboards."
        ]
      },
      {
        id: "theory-grading-scanner",
        title: "3. Grading Student Typed Theory Scripts & AI OMR Optical Scanner",
        steps: [
          "On Card 3 ('✍️ Submitted Student Online CBT & Typed Theory Answers'), click '👁️ Open & Grade Script' on any student submission to read their typed Theory/Essay, Short Answer, Case Study, and Fill-in-Blank answers.",
          "Award marks per question against your marking rubric, add teacher feedback comments, and click '💾 Save & Publish Graded Script' to update the student's final score.",
          "For paper-based objective exams, open '🤖 AI Exam Scanner', upload the scanned OMR sheet, set your A/B/C/D Master Answer Key, and click 'Run AI OMR Scan & Grade Sheet'."
        ]
      },
      {
        id: "attendance-curriculum",
        title: "4. Daily/Weekly Attendance Registers, Archives, Lesson Notes & Curriculum",
        steps: [
          "Mark daily student roll-call (Present, Absent, Late/Excused) and submit Weekly Attendance Registers to the Headmaster Checkup Desk.",
          "Once approved by the Headmaster, click '📁 Archive Register' to store it permanently in 'View Archives'.",
          "Upload weekly Lesson Notes, download GES/Cambridge/Tertiary curriculum guides, and host live class topic video sessions."
        ]
      }
    ]
  },
  STUDENT: {
    title: "Student E-Learning & Online CBT Examination Portal Guide",
    subtitle: "Official Examination Timetable Guide, Multi-Format Exam Answering (MCQ/Theory/True-False), Video Classroom & Transcripts",
    badgeColor: "#c084fc",
    dashboardRoute: "/portal/student/dashboard",
    sections: [
      {
        id: "timetable-guide",
        title: "1. Official Examination Timetable & Revision Procedure Guide",
        steps: [
          "Open the '📝 Examination & Testing Center' tab to view the '📚 OFFICIAL EXAMINATION TIMETABLE & REVISION PROCEDURE GUIDE' published by your teachers.",
          "Check each paper's Course Code, Subject Name, Exam Format badge (Multiple Choice, Theory / Essay, True/False, Mixed), Date, Start–End Time Window, Hall, Invigilator, Permitted Tools, and Syllabus Scope."
        ]
      },
      {
        id: "multi-format-exam",
        title: "2. Answering Multi-Format Online Examinations (MCQ, True/False, Fill-in-Blank & Theory)",
        steps: [
          "Click '🚀 Begin Active Examination Now' when your scheduled exam window opens.",
          "Use the Multi-Format Question Bank Section Navigator strip ('📘 Multiple Choice', '✍️ Theory / Essay', '☑️ True / False', '📝 Short Answer', '🔤 Fill in Blank', '🧪 Case Study') or the numbered buttons (tagged MC, TH, TF, SA, FB, CS) to jump directly to any question.",
          "For Multiple Choice and True/False questions: click your chosen radio option (A, B, C, D or True/False).",
          "For Fill-in-the-Blank questions: type the exact missing word, term, or formula in the answer box.",
          "For Theory / Essay, Short Answer, and Case Study questions: type your complete written response in the multi-line essay editor (live word counter and auto-save are enabled).",
          "Click '✅ Submit Final Examination' when finished. Objective questions are auto-graded immediately and typed Theory scripts are delivered to your Teacher's Grading Desk."
        ]
      },
      {
        id: "elearning-reports",
        title: "3. Video Classroom, Homework Submissions & Terminal Report Cards",
        steps: [
          "Watch recorded topic lectures and join live virtual classes in the E-Learning Video Classroom.",
          "Download reading materials, upload completed assignments, and download official QR-verified Terminal Report Cards."
        ]
      }
    ]
  },
  PARENT: {
    title: "Parent & Guardian Mobile Hub Operating Guide",
    subtitle: "Multi-Child Academic Monitoring, Instant MoMo/Card Tuition Payment, Live School Bus GPS & Teacher Voice Notes",
    badgeColor: "#fbbf24",
    dashboardRoute: "/portal/parent/dashboard",
    sections: [
      {
        id: "ward-monitoring",
        title: "1. Multi-Child Selector, Daily Attendance & Terminal Reports",
        steps: [
          "Use the Ward Selector at the top of the Parent Dashboard to switch between your enrolled children.",
          "Check real-time daily gate check-in/check-out attendance timestamps and subject performance trends.",
          "View and print official Terminal Report Cards once published by faculty and approved by the Headmaster."
        ]
      },
      {
        id: "momo-tuition",
        title: "2. Instant Tuition & Bus Fee Payment via Mobile Money / Bank Card",
        steps: [
          "Open the '💳 Fee Invoices & Payments' section to view itemized term bills and outstanding balances.",
          "Click '💳 Pay School Fees via MoMo / Card', choose MTN MoMo, Telecel Cash, AirtelTigo Money, or Visa/Mastercard, and authorize payment.",
          "Download your cryptographic digital receipt immediately — your payment automatically reconciles on the Accountant and Headmaster ledgers."
        ]
      },
      {
        id: "bus-gps-voice",
        title: "3. Live School Bus GPS Tracking & Teacher Voice Notes",
        steps: [
          "Open '🚌 School Bus GPS Tracker' to view your child's assigned bus route, driver phone number, and real-time transit status.",
          "Listen to recorded teacher voice notes and send direct WhatsApp/portal inquiries to teachers or the Headmaster."
        ]
      }
    ]
  },
  ACCOUNTANT: {
    title: "Accountant & Bursar Treasury Operating Guide",
    subtitle: "Term Fee Invoicing, MoMo/Bank Auto-Reconciliation, Payroll Disbursement & GAAP Financial Statements",
    badgeColor: "#f472b6",
    dashboardRoute: "/portal/accountant/dashboard",
    sections: [
      {
        id: "billing-invoices",
        title: "1. Term Fee Billing & Multi-Currency Invoicing",
        steps: [
          "Click '➕ Generate Term Fee Invoice' to bill classes or individual students across Tuition, Boarding, Bus Transport, ICT, and Lab fees.",
          "Switch display and reporting currency (GHS ₵, USD $, EUR €, GBP £, NGN ₦) anytime from the treasury bar.",
          "Submit new fee schedules to the Headmaster for executive approval."
        ]
      },
      {
        id: "reconciliation-arrears",
        title: "2. Mobile Money / Bank Reconciliation & Arrears Reminders",
        steps: [
          "Inspect live incoming MoMo, Bank Deposit, and Cash payments and click '🔄 Reconcile Ledger' to verify daily cash closing.",
          "Issue official numbered receipts and fee clearance certificates for examination eligibility.",
          "Click '📢 Send Arrears Reminder' to notify parents with overdue balances via SMS/WhatsApp."
        ]
      },
      {
        id: "payroll-gaap",
        title: "3. Staff Payroll Disbursement & GAAP / IFRS Financial Statements",
        steps: [
          "Process monthly faculty and staff payroll synced from HR salary tiers (computing basic pay, allowances, SSNIT, and PAYE).",
          "Open '📊 GAAP Financial Reports' to generate and export the Trial Balance, Income Statement, and Balance Sheet."
        ]
      }
    ]
  },
  HR: {
    title: "Human Resources (HR) & Personnel Portal Operating Guide",
    subtitle: "Staff Recruitment, Biometric Clock-In Audit, Leave Approvals, Salary Grouping & Appraisals",
    badgeColor: "#f97316",
    dashboardRoute: "/portal/hr/dashboard",
    sections: [
      {
        id: "staff-onboarding",
        title: "1. Staff Recruitment, Directory & Department Assignment",
        steps: [
          "Click '➕ Register New Staff / Faculty' to onboard teachers, accountants, security, drivers, and administrative staff.",
          "Assign staff IDs, academic departments, employment contracts, and qualification records."
        ]
      },
      {
        id: "biometric-leave",
        title: "2. Biometric Attendance Audit & Leave Adjudication",
        steps: [
          "Monitor daily staff biometric clock-in and clock-out timestamps and lateness flags.",
          "Review pending staff leave applications (Annual, Sick, Maternity, Study) and click '✅ Approve Leave' or '❌ Decline'."
        ]
      },
      {
        id: "salary-appraisal",
        title: "3. Salary Tier Grouping & Performance Appraisals",
        steps: [
          "Configure salary grade tiers, base pay, and allowances under '💰 Salary Grouping' (automatically synced to the Accountant Payroll).",
          "Record termly staff KPI appraisals and print official HR letters."
        ]
      }
    ]
  },
  STAFF: {
    title: "Non-Teaching & Campus Operations Staff Operating Guide",
    subtitle: "Campus Gate QR Turnstile Security, Bus Fleet Dispatch, Sickbay Logs & Facility Maintenance",
    badgeColor: "#38bdf8",
    dashboardRoute: "/portal/staff/dashboard",
    sections: [
      {
        id: "gate-security",
        title: "1. Campus Gate QR Security & Visitor Turnstile Logging",
        steps: [
          "Use '🛡️ Gate QR Scanner' to verify student and staff digital ID cards at campus entry/exit turnstiles.",
          "Register campus visitors, issue temporary visitor passes, and escalate security alerts to the Headmaster."
        ]
      },
      {
        id: "fleet-facility",
        title: "2. School Bus Fleet Dispatch, Sickbay & Facility Work Orders",
        steps: [
          "Log daily school bus departure and arrival status so Parents and the Headmaster see live transit updates.",
          "Submit and update facility maintenance work orders (electrical, plumbing, furniture, generator fuel) and sickbay clinic logs."
        ]
      }
    ]
  },
  ALUMNI: {
    title: "Alumni & Convocation Network Operating Guide",
    subtitle: "Official Academic Transcripts, Employer Credential Verification, Endowment Pledges & Mentorship",
    badgeColor: "#eab308",
    dashboardRoute: "/portal/alumni/dashboard",
    sections: [
      {
        id: "transcripts-verify",
        title: "1. Official Transcript Requests & Cryptographic Degree Verification",
        steps: [
          "Select your graduation cohort year and click '📜 Request Official Transcript' to download or order stamped academic transcripts.",
          "Use '🔍 Verify Graduate Registry' with your Alumni Verification Code so employers and universities can validate credentials instantly."
        ]
      },
      {
        id: "endowment-mentorship",
        title: "2. Alma Mater Endowment Pledges & Career Mentorship",
        steps: [
          "Contribute to campus infrastructure and scholarship endowment funds via Mobile Money or Bank Card (synced to the Accountant Ledger).",
          "Post internship and career opportunities and mentor graduating students."
        ]
      }
    ]
  },
  INVENTORY: {
    title: "Inventory, Stores & Procurement Depot Operating Guide",
    subtitle: "Real-Time Stock Ledger, Low-Stock Alerts, Departmental Requisitions & Supplier Purchase Orders",
    badgeColor: "#84cc16",
    dashboardRoute: "/portal/inventory/dashboard",
    sections: [
      {
        id: "stock-catalog",
        title: "1. Real-Time Depot Catalog, Low-Stock Alerts & Batch Quarantine",
        steps: [
          "Click '➕ Register New Stock Item' to log textbooks, science lab chemicals, ICT equipment, uniforms, and stationery.",
          "Monitor automatic low-stock reorder flags and quarantine damaged or expired stock batches."
        ]
      },
      {
        id: "requisitions-po",
        title: "2. Departmental Requisitions & Supplier Purchase Orders",
        steps: [
          "Review resource requisitions submitted by academic departments and click '✅ Approve & Issue Stock'.",
          "Generate Supplier Purchase Orders and Goods Received Notes (GRN) synced with the Headmaster and Accountant desks."
        ]
      }
    ]
  },
  DEVELOPER: {
    title: "Platform Developer & Global Sovereignty Console Guide",
    subtitle: "Multi-Tenant Onboarding, 7-Day Grace Auto-Lock, Live Schools GPS Map, Intrusion Sentinel & DB Sharding",
    badgeColor: "#38bdf8",
    dashboardRoute: "/developer",
    sections: [
      {
        id: "onboarding-lock",
        title: "1. Tenant Onboarding, Per-Student Subscription Billing & 7-Day Grace Auto-Lock",
        steps: [
          "Inspect onboarded institutions in the Tenant Registry, verify MoMo payments (0554594193), and click '✓ Approve & Provision Enclave'.",
          "Monitor automated per-student subscription rates ($3 Basic / $5 SHS / $10 Tertiary) and the 14-day pre-expiry reminder + 7-day grace period auto-lock engine.",
          "Use the 1-click Padlock toggle to manually Lock or Unlock any school tenant."
        ]
      },
      {
        id: "gps-sentinel-video",
        title: "2. Live Registered Schools GPS Map, Intrusion Sentinel & Remote Video Support",
        steps: [
          "Open '🗺️ Live Tenant Map' to view GPS coordinates of every registered school and launch turn-by-turn Google Maps navigation.",
          "Inspect '🛡️ Intrusion Sentinel' to review and block unauthorized login IPs.",
          "Launch WebRTC Live Video Support calls with Headmasters and manage PostgreSQL database shards."
        ]
      }
    ]
  }
};

const ROLE_ORDER = [
  { key: "ADMIN", label: "👔 Headmaster" },
  { key: "TEACHER", label: "👩‍🏫 Teacher" },
  { key: "STUDENT", label: "🎓 Student" },
  { key: "PARENT", label: "👨‍👩‍👧 Parent" },
  { key: "ACCOUNTANT", label: "💳 Accountant" },
  { key: "HR", label: "👥 HR Officer" },
  { key: "STAFF", label: "🛠️ Staff" },
  { key: "ALUMNI", label: "🎖️ Alumni" },
  { key: "INVENTORY", label: "📦 Inventory" },
  { key: "DEVELOPER", label: "🛡️ Developer" }
];

export default function UniversalRoleGuideModal({ role = "DEVELOPER", isOpen, onClose }) {
  const normalizeRoleKey = (rInput) => {
    const clean = String(rInput || "DEVELOPER").toUpperCase().trim();
    if (ROLE_GUIDES[clean]) return clean;
    if (clean.includes("HEADMASTER") || clean.includes("PRINCIPAL") || clean.includes("ADMIN")) return "ADMIN";
    if (clean.includes("TEACH")) return "TEACHER";
    if (clean.includes("STUD")) return "STUDENT";
    if (clean.includes("PAREN")) return "PARENT";
    if (clean.includes("ACCOUNT") || clean.includes("BURSAR")) return "ACCOUNTANT";
    if (clean.includes("HR")) return "HR";
    if (clean.includes("ALUMN")) return "ALUMNI";
    if (clean.includes("INVENT")) return "INVENTORY";
    if (clean.includes("STAFF")) return "STAFF";
    return "DEVELOPER";
  };

  const [selectedRoleKey, setSelectedRoleKey] = useState(() => normalizeRoleKey(role));
  const [activeTab, setActiveTab] = useState("SOP"); // "SOP" | "VIDEO" | "NOTES"
  const [searchQuery, setSearchQuery] = useState("");
  const [savedFeedback, setSavedFeedback] = useState(false);
  const [showRoleVideoModal, setShowRoleVideoModal] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);

  useEffect(() => {
    setSelectedRoleKey(normalizeRoleKey(role));
  }, [role]);

  const guideData = ROLE_GUIDES[selectedRoleKey] || ROLE_GUIDES.ADMIN;
  const storageKey = `gbs_user_personal_guide_notes_${selectedRoleKey.toLowerCase()}`;
  const [personalNotes, setPersonalNotes] = useState(() => localStorage.getItem(storageKey) || "");

  useEffect(() => {
    setPersonalNotes(localStorage.getItem(storageKey) || "");
  }, [selectedRoleKey, storageKey]);

  const matchedVideoMeta =
    REAL_ACTION_ROLE_VIDEOS.find((v) => v.id === selectedRoleKey) || REAL_ACTION_ROLE_VIDEOS[0];

  if (!isOpen) return null;

  const handleSaveNotes = () => {
    localStorage.setItem(storageKey, personalNotes);
    setSavedFeedback(true);
    setTimeout(() => setSavedFeedback(false), 3000);
  };

  const handleSpeakGuide = () => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }
    window.speechSynthesis.cancel();
    const fullText = `${guideData.title}. ${guideData.sections.map((s) => `${s.title}. ${s.steps.join(" ")}`).join(" ")}`;
    const utter = new SpeechSynthesisUtterance(fullText);
    utter.rate = 0.98;
    utter.onend = () => setIsSpeaking(false);
    utter.onerror = () => setIsSpeaking(false);
    setIsSpeaking(true);
    window.speechSynthesis.speak(utter);
  };

  const filteredSections = guideData.sections.filter((s) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const titleMatch = s.title.toLowerCase().includes(q);
    const stepsMatch = s.steps.some((step) => step.toLowerCase().includes(q));
    return titleMatch || stepsMatch;
  });

  return (
    <>
      <div
        className="modal-backdrop"
        onClick={onClose}
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(2, 6, 23, 0.88)",
          backdropFilter: "blur(10px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 99999,
          padding: "1rem"
        }}
      >
        <div
          className="modal-window"
          onClick={(e) => e.stopPropagation()}
          style={{
            width: "100%",
            maxWidth: "980px",
            maxHeight: "93dvh",
            background: "linear-gradient(145deg, #0f172a 0%, #020617 100%)",
            border: `2px solid ${guideData.badgeColor}`,
            borderRadius: "16px",
            boxShadow: `0 20px 50px rgba(0, 0, 0, 0.85), 0 0 30px ${guideData.badgeColor}33`,
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
            color: "#f8fafc"
          }}
        >
          {/* Header */}
          <div
            style={{
              padding: "16px 22px",
              borderBottom: "1px solid rgba(255, 255, 255, 0.1)",
              background: "rgba(15, 23, 42, 0.96)",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: "10px"
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <span style={{ fontSize: "1.9rem" }}>📖</span>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                  <h3 style={{ margin: 0, fontSize: "1.12rem", fontWeight: 900, color: "#f8fafc" }}>
                    {guideData.title}
                  </h3>
                  <span
                    style={{
                      background: `${guideData.badgeColor}25`,
                      color: guideData.badgeColor,
                      border: `1px solid ${guideData.badgeColor}`,
                      fontSize: "0.7rem",
                      fontWeight: 800,
                      padding: "2px 8px",
                      borderRadius: "999px"
                    }}
                  >
                    EXACT ROLE SOP • {selectedRoleKey}
                  </span>
                </div>
                <span style={{ fontSize: "0.78rem", color: "#cbd5e1", display: "block", marginTop: "2px" }}>
                  {guideData.subtitle}
                </span>
              </div>
            </div>

            <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
              <button
                type="button"
                onClick={handleSpeakGuide}
                style={{
                  background: isSpeaking ? "linear-gradient(135deg, #ef4444, #b91c1c)" : "linear-gradient(135deg, #059669, #047857)",
                  border: "1px solid #34d399",
                  color: "#ffffff",
                  padding: "7px 12px",
                  borderRadius: "8px",
                  fontSize: "0.76rem",
                  fontWeight: 800,
                  cursor: "pointer"
                }}
              >
                {isSpeaking ? "⏹ Stop Reading" : "🔊 Read Operating Guide Aloud"}
              </button>
              <button
                type="button"
                onClick={() => setShowRoleVideoModal(true)}
                style={{
                  background: "linear-gradient(135deg, #f59e0b, #d97706)",
                  border: "1px solid #fde68a",
                  color: "#020617",
                  padding: "7px 12px",
                  borderRadius: "8px",
                  fontSize: "0.76rem",
                  fontWeight: 900,
                  cursor: "pointer"
                }}
              >
                🎬 Full 10-Role Video Theatre
              </button>
              <button
                type="button"
                onClick={onClose}
                style={{
                  background: "rgba(239, 68, 68, 0.2)",
                  border: "1px solid #ef4444",
                  color: "#fca5a5",
                  borderRadius: "8px",
                  width: "36px",
                  height: "36px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "1.05rem",
                  fontWeight: 800,
                  cursor: "pointer"
                }}
              >
                ✕
              </button>
            </div>
          </div>

          {/* All 10 Roles Switcher Bar */}
          <div
            style={{
              padding: "8px 20px",
              background: "#020617",
              borderBottom: "1px solid rgba(148, 163, 184, 0.2)",
              display: "flex",
              gap: "6px",
              flexWrap: "wrap",
              alignItems: "center"
            }}
          >
            <span style={{ fontSize: "0.7rem", color: "#fde68a", fontWeight: 800, marginRight: "4px" }}>
              SWITCH ROLE GUIDE:
            </span>
            {ROLE_ORDER.map((rItem) => {
              const isAct = selectedRoleKey === rItem.key;
              return (
                <button
                  key={rItem.key}
                  type="button"
                  onClick={() => setSelectedRoleKey(rItem.key)}
                  style={{
                    background: isAct ? "linear-gradient(135deg, #0284c7, #0369a1)" : "rgba(30, 41, 59, 0.85)",
                    color: "#ffffff",
                    border: isAct ? "1.5px solid #fbbf24" : "1px solid rgba(148, 163, 184, 0.3)",
                    padding: "4px 9px",
                    borderRadius: "6px",
                    fontSize: "0.72rem",
                    fontWeight: 800,
                    cursor: "pointer"
                  }}
                >
                  {rItem.label}
                </button>
              );
            })}
          </div>

          {/* Navigation Tabs & Search */}
          <div
            style={{
              padding: "10px 22px",
              background: "rgba(2, 6, 23, 0.65)",
              borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: "10px"
            }}
          >
            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
              <button
                type="button"
                onClick={() => setActiveTab("SOP")}
                style={{
                  padding: "7px 14px",
                  borderRadius: "8px",
                  border: activeTab === "SOP" ? `2px solid ${guideData.badgeColor}` : "1px solid rgba(255, 255, 255, 0.15)",
                  background: activeTab === "SOP" ? "rgba(15, 23, 42, 0.95)" : "rgba(30, 41, 59, 0.6)",
                  color: "#ffffff",
                  fontWeight: 800,
                  fontSize: "0.8rem",
                  cursor: "pointer"
                }}
              >
                📋 Step-by-Step Operating Guide &amp; Exact Commands
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("VIDEO")}
                style={{
                  padding: "7px 14px",
                  borderRadius: "8px",
                  border: activeTab === "VIDEO" ? "2px solid #fbbf24" : "1px solid rgba(251, 191, 36, 0.4)",
                  background: activeTab === "VIDEO" ? "linear-gradient(135deg, #d97706, #b45309)" : "rgba(120, 53, 15, 0.45)",
                  color: "#ffffff",
                  fontWeight: 800,
                  fontSize: "0.8rem",
                  cursor: "pointer"
                }}
              >
                🎬 Watch Role Presentation Video
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("NOTES")}
                style={{
                  padding: "7px 14px",
                  borderRadius: "8px",
                  border: activeTab === "NOTES" ? "2px solid #10b981" : "1px solid rgba(255, 255, 255, 0.15)",
                  background: activeTab === "NOTES" ? "rgba(5, 150, 105, 0.3)" : "rgba(30, 41, 59, 0.6)",
                  color: "#ffffff",
                  fontWeight: 800,
                  fontSize: "0.8rem",
                  cursor: "pointer"
                }}
              >
                ✍️ My Custom Instructions &amp; Notes
              </button>
            </div>

            {activeTab === "SOP" && (
              <input
                type="text"
                placeholder="🔍 Search role commands..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  padding: "7px 12px",
                  background: "rgba(15, 23, 42, 0.9)",
                  border: "1px solid rgba(255, 255, 255, 0.25)",
                  borderRadius: "8px",
                  color: "#ffffff",
                  fontSize: "0.8rem",
                  width: "210px",
                  outline: "none"
                }}
              />
            )}
          </div>

          {/* Modal Body */}
          <div style={{ flex: 1, overflowY: "auto", padding: "18px 22px" }}>
            {activeTab === "SOP" && (
              <div>
                {/* Embedded Quick Video Presentation Banner at top of Operating Guide */}
                <div
                  style={{
                    background: "linear-gradient(135deg, rgba(30, 41, 59, 0.95), rgba(15, 23, 42, 0.95))",
                    border: "1.5px solid rgba(245, 158, 11, 0.55)",
                    borderRadius: "12px",
                    padding: "12px 16px",
                    marginBottom: "16px",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    flexWrap: "wrap",
                    gap: "12px"
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                    <img
                      src={matchedVideoMeta.poster}
                      alt={matchedVideoMeta.title}
                      style={{ width: "72px", height: "48px", borderRadius: "8px", objectFit: "cover", border: "1.5px solid #fbbf24" }}
                    />
                    <div>
                      <strong style={{ color: "#fde68a", fontSize: "0.86rem", display: "block" }}>
                        🎬 {matchedVideoMeta.title}
                      </strong>
                      <span style={{ color: "#cbd5e1", fontSize: "0.76rem" }}>
                        Watch the visual presentation of every command, tab, and action for {selectedRoleKey}.
                      </span>
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: "8px" }}>
                    <button
                      type="button"
                      onClick={() => setActiveTab("VIDEO")}
                      style={{
                        background: "linear-gradient(135deg, #0284c7, #0369a1)",
                        color: "#ffffff",
                        border: "1px solid #38bdf8",
                        padding: "7px 12px",
                        borderRadius: "8px",
                        fontSize: "0.75rem",
                        fontWeight: 800,
                        cursor: "pointer"
                      }}
                    >
                      ▶ Play Embedded Video Here
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowRoleVideoModal(true)}
                      style={{
                        background: "linear-gradient(135deg, #f59e0b, #d97706)",
                        color: "#020617",
                        border: "none",
                        padding: "7px 12px",
                        borderRadius: "8px",
                        fontSize: "0.75rem",
                        fontWeight: 900,
                        cursor: "pointer"
                      }}
                    >
                      ⛶ Open Full Cinema Theatre
                    </button>
                  </div>
                </div>

                {filteredSections.length === 0 ? (
                  <div style={{ textAlign: "center", padding: "2.5rem", color: "#94a3b8" }}>
                    <span style={{ fontSize: "2rem", display: "block", marginBottom: "8px" }}>🔍</span>
                    No instructions matching &ldquo;{searchQuery}&rdquo;. Try searching for another operational term.
                  </div>
                ) : (
                  filteredSections.map((sec, idx) => (
                    <div
                      key={sec.id || idx}
                      style={{
                        background: "rgba(15, 23, 42, 0.78)",
                        border: "1.5px solid rgba(255, 255, 255, 0.12)",
                        borderRadius: "12px",
                        padding: "16px 20px",
                        marginBottom: "14px",
                        boxShadow: "0 4px 14px rgba(0, 0, 0, 0.3)"
                      }}
                    >
                      <h4
                        style={{
                          margin: "0 0 10px 0",
                          color: guideData.badgeColor,
                          fontSize: "0.96rem",
                          fontWeight: 800,
                          display: "flex",
                          alignItems: "center",
                          gap: "8px"
                        }}
                      >
                        <span>⚡</span> {sec.title}
                      </h4>
                      <ol style={{ margin: 0, paddingLeft: "20px", display: "flex", flexDirection: "column", gap: "8px" }}>
                        {sec.steps.map((step, sIdx) => (
                          <li key={sIdx} style={{ fontSize: "0.85rem", color: "#e2e8f0", lineHeight: "1.55" }}>
                            {step}
                          </li>
                        ))}
                      </ol>
                    </div>
                  ))
                )}
              </div>
            )}

            {activeTab === "VIDEO" && (
              <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                <div
                  style={{
                    background: "#000000",
                    borderRadius: "12px",
                    overflow: "hidden",
                    border: `2px solid ${matchedVideoMeta.accent}`
                  }}
                >
                  <video
                    key={matchedVideoMeta.videoSrc}
                    src={matchedVideoMeta.videoSrc}
                    poster={matchedVideoMeta.poster}
                    controls
                    autoPlay
                    muted
                    playsInline
                    preload="auto"
                    style={{ width: "100%", maxHeight: "360px", display: "block", background: "#000" }}
                  />
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: "10px" }}>
                  {(matchedVideoMeta.scenes || []).map((sc, sIdx) => (
                    <div
                      key={sIdx}
                      style={{
                        background: "rgba(15, 23, 42, 0.88)",
                        border: `1px solid ${matchedVideoMeta.accent}66`,
                        borderRadius: "10px",
                        padding: "12px"
                      }}
                    >
                      <div style={{ fontSize: "0.7rem", fontWeight: 900, color: matchedVideoMeta.accent, marginBottom: "4px" }}>
                        {sc.step}
                      </div>
                      <div style={{ fontSize: "0.76rem", fontWeight: 800, color: "#34d399", marginBottom: "6px", fontFamily: "monospace" }}>
                        ⚡ {sc.command}
                      </div>
                      <div style={{ fontSize: "0.78rem", color: "#e2e8f0", lineHeight: 1.45 }}>
                        {sc.action}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === "NOTES" && (
              <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                <div
                  style={{
                    background: "rgba(245, 158, 11, 0.15)",
                    border: "1px solid #f59e0b",
                    borderRadius: "10px",
                    padding: "12px 16px",
                    display: "flex",
                    alignItems: "center",
                    gap: "10px"
                  }}
                >
                  <span style={{ fontSize: "1.4rem" }}>💡</span>
                  <span style={{ fontSize: "0.84rem", color: "#fef3c7", lineHeight: "1.4" }}>
                    <strong>Personalize Your Workflow:</strong> Type custom instructions, departmental reminders, or standard operating notes for {selectedRoleKey}. Saved permanently in your browser.
                  </span>
                </div>

                <textarea
                  rows={10}
                  value={personalNotes}
                  onChange={(e) => setPersonalNotes(e.target.value)}
                  placeholder={`Type your custom ${selectedRoleKey} guidelines, daily checklist, or procedural instructions here...`}
                  style={{
                    width: "100%",
                    padding: "14px",
                    borderRadius: "10px",
                    background: "rgba(2, 6, 23, 0.85)",
                    border: "1.5px solid rgba(56, 189, 248, 0.35)",
                    color: "#f8fafc",
                    fontSize: "0.88rem",
                    lineHeight: "1.6",
                    fontFamily: "inherit",
                    boxSizing: "border-box",
                    outline: "none"
                  }}
                />

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    {savedFeedback && (
                      <span style={{ color: "#34d399", fontWeight: 800, fontSize: "0.84rem" }}>
                        ✓ Your custom guidelines have been saved!
                      </span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={handleSaveNotes}
                    style={{
                      padding: "10px 22px",
                      background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
                      color: "#ffffff",
                      border: "none",
                      borderRadius: "8px",
                      fontWeight: 900,
                      fontSize: "0.86rem",
                      cursor: "pointer"
                    }}
                  >
                    💾 Save My Guide
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div
            style={{
              padding: "12px 22px",
              background: "rgba(15, 23, 42, 0.96)",
              borderTop: "1px solid rgba(255, 255, 255, 0.1)",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: "8px",
              fontSize: "0.76rem",
              color: "#94a3b8"
            }}
          >
            <span>GBS School Management System • Exact 10-Role Operational Guide</span>
            <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
              <button
                type="button"
                onClick={() => setShowRoleVideoModal(true)}
                style={{
                  background: "linear-gradient(135deg, #f59e0b, #d97706)",
                  border: "none",
                  color: "#020617",
                  padding: "6px 12px",
                  borderRadius: "6px",
                  fontSize: "0.75rem",
                  fontWeight: 900,
                  cursor: "pointer"
                }}
              >
                🎬 Watch Real-Life Role Action Video
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                style={{
                  background: "rgba(255, 255, 255, 0.08)",
                  border: "1px solid rgba(255, 255, 255, 0.2)",
                  color: "#cbd5e1",
                  padding: "5px 12px",
                  borderRadius: "6px",
                  fontSize: "0.75rem",
                  fontWeight: 700,
                  cursor: "pointer"
                }}
              >
                🖨️ Print Operating Guide
              </button>
            </div>
          </div>
        </div>
      </div>

      <CartoonRoleVideoHubModal
        isOpen={showRoleVideoModal}
        onClose={() => setShowRoleVideoModal(false)}
        initialRole={selectedRoleKey}
      />
    </>
  );
}
