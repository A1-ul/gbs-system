import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  calculateOnboardingFee,
  getOnboardingRates
} from "../../../utils/pricingEngine";
import { REAL_ACTION_ROLE_VIDEOS } from "../../../components/common/CartoonRoleVideoHubModal";
import "../styles/VideoPresentationEngine.css";

const ROLE_MODULES = [
  {
    id: "ADMIN",
    role: "Headmaster / School Admin",
    badge: "EXECUTIVE GOVERNANCE",
    icon: "🎓",
    color: "#3b82f6",
    videoFile: "/videos/video1_headmaster_role_guide.mp4",
    downloadName: "GBS_Video1_Headmaster_Action_Guide.mp4",
    photos: [
      "/assets/real/headmaster_desk.jpg",
      "/images/admin_login_bg.jpg",
      "/assets/admissions-office-bg.jpg"
    ],
    targetAudience: "Principals, Headmasters, School Proprietors & Vice Principals",
    description:
      "Full-school governance from Developer approval and exact registered school branding (e.g., BEST KIDS) to user approvals, Real Language Translator messaging, Live Google Maps parent lookup, and official admissions.",
    metrics: [
      { label: "Dashboard Branding", val: "100% Tenant Exact" },
      { label: "Language Engine", val: "2-Mode + Meaning" },
      { label: "Emergency Locator", val: "Live GPS Pin" }
    ],
    closingHook:
      "Once approved by GBS Control Center, every tenant portal and official document displays your school's exact registered name automatically.",
    steps: [
      {
        title: "Step 1: Developer Approval, Exact School Name & Logo Setup Notice",
        narration:
          "Watch how the Developer approves BEST KIDS in GBS SCHOOL MANAGEMENT SYSTEM. Immediately, every Headmaster, Teacher, Student, Parent, Accountant, and Staff dashboard displays BEST KIDS, while notifying the Headmaster to upload the official school crest and confirm the exact school name.",
        actionLabel: "DEV_APPROVE_TENANT & BRAND_PORTALS",
        duration: "0:00 – 0:15"
      },
      {
        title: "Step 2: Strict Lockout Security & Staff / Student Approvals",
        narration:
          "Locked or permanently deleted institutions are blocked at login with full data wipe on permanent deletion. Pending Teachers, Students, Parents, and Accountants wait for Headmaster approval before gaining portal access.",
        actionLabel: "HEADMASTER_APPROVE_STAFF & STRICT_LOCKOUT",
        duration: "0:15 – 0:28"
      },
      {
        title: "Step 3: Real Language Translator & Receiver Messaging",
        narration:
          "Inside BEST KIDS, choose Mode 1 to translate any word or copied sentence with its exact meaning in Twi, French, Ga, Ewe, Hausa, Spanish, or Arabic, or switch to Mode 2 to dispatch a translated message straight to a Teacher, Parent, or Student.",
        actionLabel: "TRANSLATE_SENTENCE_&_SEND_TO_RECEIVER",
        duration: "0:28 – 0:42"
      },
      {
        title: "Step 4: Live Google Maps Parent Emergency Locator",
        narration:
          "In a student health or campus emergency, enter the parent's phone number to pull verified residence telemetry on Google Maps with route distance and one-click emergency contact.",
        actionLabel: "GPS_PARENT_EMERGENCY_LOOKUP",
        duration: "0:42 – 0:54"
      },
      {
        title: "Step 5: Online Admissions & Branded Official Documents",
        narration:
          "Approve submitted prospective student applications with one click to provision student credentials and stamp official admission letters, receipts, and transcripts with the exact BEST KIDS crest.",
        actionLabel: "APPROVE_ADMISSION_&_PRINT_OFFICIAL_DOC",
        duration: "0:54 – 1:05"
      }
    ],
    actions: [
      {
        title: "Simulate Developer Approve ('BEST KIDS')",
        desc: "Verify instant dashboard re-branding & logo notification banner",
        cmd: "Tenant #GBS-BKI-2048 approved -> All dashboards branded 'BEST KIDS' + Logo upload alert triggered."
      },
      {
        title: "Test Locked / Deleted Institution Access Guard",
        desc: "Verify login rejection for locked or permanently wiped schools",
        cmd: "Security Guard active -> Locked/deleted tenant denied access with clear re-registration guidance."
      },
      {
        title: "Run 2-Mode Translator & Receiver Dispatch",
        desc: "Translate copied sentence to Twi + attach grammatical meaning",
        cmd: "Mode 1 Meaning + Mode 2 Dispatch ready across English, Twi, French, Ga, Ewe, Hausa, Spanish & Arabic."
      }
    ],
    demoPortalRoute: "/login/admin",
    demoCreds: "headmaster@bestkids.edu.gh (Use approved tenant credentials)"
  },
  {
    id: "TEACHER",
    role: "Teacher & Academic Faculty",
    badge: "CLASSROOM & AI GRADING",
    icon: "👩‍🏫",
    color: "#10b981",
    videoFile: "/videos/video2_teacher_role_guide.mp4",
    downloadName: "GBS_Video2_Teacher_Action_Guide.mp4",
    photos: [
      "/assets/real/teacher_scanner.jpg",
      "/images/teacher_login_bg.jpg",
      "/assets/communication-hero-bg.jpg"
    ],
    targetAudience: "Class Teachers, Subject Masters, Department Heads & Lab Instructors",
    description:
      "Tick-by-tick classroom attendance, Zoom/Google Meet live lessons, Topic Videos for absent scholars, and the Mobile Camera AI OMR Exam Scanner with instant verification.",
    metrics: [
      { label: "OMR Exam Scan", val: "1.2s / Sheet" },
      { label: "Live & Video Classes", val: "Integrated" },
      { label: "Attendance Sync", val: "Parent SMS Live" }
    ],
    closingHook:
      "Zero weekend paper marking bottlenecks — scan physical scripts via phone camera, override if needed, and publish stamped terminal reports.",
    steps: [
      {
        title: "Step 1: Verified Teacher Login & Subject Timetable",
        narration:
          "After Headmaster approval, teachers sign into their BEST KIDS dashboard showing today's period timetable, assigned classes, and lesson readiness indicators.",
        actionLabel: "TEACHER_PORTAL_LOGIN & TIMETABLE_LOAD",
        duration: "0:00 – 0:12"
      },
      {
        title: "Step 2: Individual Student Tick-by-Tick Attendance",
        narration:
          "Mark each student individually as Present, Late, or Absent in seconds — automatically updating Headmaster analytics and notifying parents on absence.",
        actionLabel: "TICK_STUDENT_ATTENDANCE & PARENT_NOTIFY",
        duration: "0:12 – 0:24"
      },
      {
        title: "Step 3: Live Classes, Topic Videos & Voice Notes",
        narration:
          "Launch HD Zoom or Google Meet sessions or upload Topic Explanation Videos and Voice Notes so absent learners never fall behind.",
        actionLabel: "LAUNCH_LIVE_CLASS & PUBLISH_TOPIC_VIDEO",
        duration: "0:24 – 0:37"
      },
      {
        title: "Step 4: Mobile AI OMR Exam Scanner & Override",
        narration:
          "Point any camera over OMR multiple-choice bubble sheets for instant deterministic AI scoring (e.g., 38/40), with full teacher manual override control.",
        actionLabel: "AI_OMR_SCAN_SHEET & TEACHER_VERIFY",
        duration: "0:37 – 0:50"
      },
      {
        title: "Step 5: Branded Terminal Gradebook Submission",
        narration:
          "Approve continuous assessment scores and publish official terminal report cards stamped automatically with the exact BEST KIDS identity.",
        actionLabel: "PUBLISH_TERMINAL_REPORT_CARDS",
        duration: "0:50 – 1:02"
      }
    ],
    actions: [
      {
        title: "Mark Sample JHS 2B Attendance Register",
        desc: "Record Present / Absent ticks and emit absent guardian alert",
        cmd: "Attendance saved: 34 Present, 1 Absent (Kwame Boateng) -> Guardian notification queued."
      },
      {
        title: "Run Mobile AI OMR Exam Laser Scan",
        desc: "Auto-grade bubble sheet #408 with manual review check",
        cmd: "OMR Scanner matched 38/40 answers (95% A1) in 0.84s. Ready for manual verify."
      },
      {
        title: "Publish Topic Explanation Video",
        desc: "Attach HD lesson video + audio note to Physics Week 4",
        cmd: "Topic Video 'Projectile Motion Lab' published to JHS 2 & SHS Science feed."
      }
    ],
    demoPortalRoute: "/login/teacher",
    demoCreds: "Approved Teacher email / Staff ID + Password"
  },
  {
    id: "STUDENT",
    role: "Student Scholar Portal",
    badge: "ELEARNING & DIGITAL LIBRARY",
    icon: "🎒",
    color: "#8b5cf6",
    videoFile: "/videos/video3_student_role_guide.mp4",
    downloadName: "GBS_Video3_Student_Action_Guide.mp4",
    photos: [
      "/assets/real/student_elearning.jpg",
      "/images/student_login_bg.jpg",
      "/assets/library-bg.jpg"
    ],
    targetAudience: "Nursery–JHS, SHS & Tertiary Enrolled Scholars",
    description:
      "Access verified timetables, HD Topic Videos, teacher voice notes, interactive homework quizzes, Digital E-Library with Real Language Translator, and official report cards.",
    metrics: [
      { label: "E-Library Catalog", val: "24/7 Cloud PDFs" },
      { label: "Quiz Auto-Score", val: "Instant Feedback" },
      { label: "Report Cards", val: "School-Branded" }
    ],
    closingHook:
      "Every lesson, textbook, audio note, and verified grade is accessible cleanly inside your school's exact portal.",
    steps: [
      {
        title: "Step 1: Verified Scholar Sign-In & Weekly Timetable",
        narration:
          "Once approved by school administration, students sign into BEST KIDS to inspect live class timetables, attendance percentage, and exam countdowns.",
        actionLabel: "STUDENT_LOGIN & SCHEDULE_SYNC",
        duration: "0:00 – 0:11"
      },
      {
        title: "Step 2: Topic Videos, Voice Notes & Live Class Join",
        narration:
          "Join live classes in one tap or replay recorded Topic Videos and teacher audio explanations directly inside the module.",
        actionLabel: "STREAM_TOPIC_VIDEO & PLAY_VOICE_NOTE",
        duration: "0:11 – 0:23"
      },
      {
        title: "Step 3: Homework Submissions & Online CBT Quizzes",
        narration:
          "Upload assignments cleanly, submit interactive timed quizzes, and receive instant verified feedback.",
        actionLabel: "SUBMIT_ASSIGNMENT & COMPLETE_QUIZ",
        duration: "0:23 – 0:35"
      },
      {
        title: "Step 4: Digital E-Library + Real Language Translator",
        narration:
          "Borrow STEM and humanities E-Library volumes and highlight copied passages inside the Real Language Translator for instant multi-language meanings.",
        actionLabel: "BORROW_EBOOK & TRANSLATE_PASSAGE",
        duration: "0:35 – 0:46"
      },
      {
        title: "Step 5: Official Stamped Terminal Report Card",
        narration:
          "Download authentic termly academic reports stamped with BEST KIDS letterhead, subject grades, and Headmaster authorization.",
        actionLabel: "DOWNLOAD_OFFICIAL_REPORT_CARD",
        duration: "0:46 – 0:58"
      }
    ],
    actions: [
      {
        title: "Replay Teacher Topic Video",
        desc: "Stream lesson video + synchronized voice note",
        cmd: "Playing 'Algebraic Factorization' + 02:14 teacher audio explanation."
      },
      {
        title: "Borrow E-Library Book + Translate Excerpt",
        desc: "Check out Physics textbook and translate sentence to French",
        cmd: "Borrowed 'Integrated Physics Vol II' -> Translated excerpt ready with definition."
      },
      {
        title: "Preview Official BEST KIDS Report Card",
        desc: "Inspect stamped transcript with GPA & rank",
        cmd: "Rendered PDF report card stamped 'BEST KIDS' with verified Term 2 scores."
      }
    ],
    demoPortalRoute: "/login/student",
    demoCreds: "Approved Student Index / Email + Password"
  },
  {
    id: "PARENT",
    role: "Parent & Guardian Supervision",
    badge: "FEES, GPS SAFETY & REPORTS",
    icon: "👨‍👩‍👧",
    color: "#eab308",
    videoFile: "/videos/video4_parent_role_guide.mp4",
    downloadName: "GBS_Video4_Parent_Action_Guide.mp4",
    photos: [
      "/assets/real/parent_mobile.jpg",
      "/images/parent_login_bg.jpg",
      "/assets/communication-hero-bg.jpg"
    ],
    targetAudience: "Mothers, Fathers & Legal Guardians",
    description:
      "Track real-time attendance & report cards, pay school fees via MTN MoMo / Telecel / Card with instant official receipts, share live Google Maps GPS for emergencies, and apply online.",
    metrics: [
      { label: "Tuition Payment", val: "MoMo / Card Live" },
      { label: "Emergency GPS", val: "Google Maps Pin" },
      { label: "Direct Chat", val: "Auto-Translated" }
    ],
    closingHook:
      "Complete visibility and instant peace of mind across fees, grades, safety alerts, and direct teacher communication.",
    steps: [
      {
        title: "Step 1: Child Attendance & Report Card Tracking",
        narration:
          "Parents log in to BEST KIDS to view real-time daily class attendance alerts, homework completion, and verified termly report cards.",
        actionLabel: "VIEW_CHILD_ATTENDANCE_&_GRADES",
        duration: "0:00 – 0:11"
      },
      {
        title: "Step 2: Instant MoMo / Card Fee Payment & Official Receipt",
        narration:
          "Pay tuition invoices via MTN Mobile Money, Telecel Cash, or Bank Card and download official receipts stamped automatically with BEST KIDS.",
        actionLabel: "MOMO_FEE_PAY & STAMPED_RECEIPT",
        duration: "0:11 – 0:23"
      },
      {
        title: "Step 3: Live Google Maps Emergency GPS Location Sharing",
        narration:
          "Update your verified GPS residential pin so Headmaster emergency teams can locate guardians swiftly during urgent campus situations.",
        actionLabel: "SYNC_GOOGLE_MAPS_EMERGENCY_PIN",
        duration: "0:23 – 0:34"
      },
      {
        title: "Step 4: Direct Teacher Chat with Auto-Translator",
        narration:
          "Message teachers or school leadership in English, Twi, Ewe, Ga, Hausa, French, Spanish, or Arabic with instant accurate two-way translation.",
        actionLabel: "SEND_TRANSLATED_GUARDIAN_MESSAGE",
        duration: "0:34 – 0:45"
      },
      {
        title: "Step 5: Online New-Ward Admission Application",
        narration:
          "Enroll additional children remotely from home and track Headmaster review and acceptance right from the parent portal.",
        actionLabel: "SUBMIT_CHILD_ADMISSION_ONLINE",
        duration: "0:45 – 0:56"
      }
    ],
    actions: [
      {
        title: "Simulate MTN MoMo Tuition Payment",
        desc: "Settle GH₵ 1,250 termly invoice & print BEST KIDS receipt",
        cmd: "MoMo Tx #MM-884122 settled -> Official BEST KIDS receipt #RCP-2026-091 generated."
      },
      {
        title: "Update Guardian Google Maps GPS Pin",
        desc: "Lock verified home coordinates for Headmaster Emergency Locator",
        cmd: "GPS coordinates (5.6351° N, 0.1650° W) synced to Emergency Locator."
      },
      {
        title: "Send Translated Guardian Note to Teacher",
        desc: "Compose in Twi and deliver translated English message",
        cmd: "Message translated & delivered to Class Teacher inbox."
      }
    ],
    demoPortalRoute: "/login/parent",
    demoCreds: "Approved Guardian Email / Phone + Password"
  },
  {
    id: "ACCOUNTANT",
    role: "Accountant & Bursar Finance",
    badge: "LEDGER, RECEIPTS & PAYROLL",
    icon: "📊",
    color: "#ec4899",
    videoFile: "/videos/video5_accountant_role_guide.mp4",
    downloadName: "GBS_Video5_Accountant_Action_Guide.mp4",
    photos: [
      "/assets/real/accountant_finance.jpg",
      "/images/accountant_login_bg.jpg",
      "/assets/finance-hero-bg.jpg"
    ],
    targetAudience: "School Accountants, Bursars, Finance Controllers & Internal Auditors",
    description:
      "Configure class tuition fee templates, auto-reconcile MoMo/Bank/Cash ledgers, issue official school-branded receipts, run arrears SMS reminders, and execute staff payroll.",
    metrics: [
      { label: "Ledger Recon", val: "Zero-Leakage Audit" },
      { label: "Fee Reminders", val: "1-Click Bulk SMS" },
      { label: "Payroll Engine", val: "Payslip PDF Ready" }
    ],
    closingHook:
      "Every cedi reconciled with cryptographic receipts and transparent audit logs tailored strictly to your institution.",
    steps: [
      {
        title: "Step 1: Termly Class Fee Structure Setup",
        narration:
          "Configure tuition, ICT lab, feeding, and boarding fee templates across classes inside the BEST KIDS Finance Portal.",
        actionLabel: "CONFIGURE_TERMLY_FEE_SCHEDULE",
        duration: "0:00 – 0:11"
      },
      {
        title: "Step 2: MoMo, Bank & Cash Payment Reconciliation",
        narration:
          "Record bank deposits, cash payments, and verify incoming MTN MoMo webhooks to clear student ledger balances instantaneously.",
        actionLabel: "RECONCILE_MOMO_BANK_LEDGER",
        duration: "0:11 – 0:23"
      },
      {
        title: "Step 3: Branded Official Receipts & Statements",
        narration:
          "Generate tamper-evident receipts and financial statements carrying the exact registered school name and uploaded crest.",
        actionLabel: "ISSUE_STAMPED_FINANCIAL_RECEIPT",
        duration: "0:23 – 0:34"
      },
      {
        title: "Step 4: Automated Overdue Fee SMS Reminders",
        narration:
          "Identify unpaid balances across grades and broadcast respectful fee balance SMS notices to guardians in one click.",
        actionLabel: "DISPATCH_ARREARS_SMS_ALERTS",
        duration: "0:34 – 0:45"
      },
      {
        title: "Step 5: Monthly Staff Payroll & Audit Trail",
        narration:
          "Compute net salaries, SSNIT deductions, and issue digital payslips backed by immutable audit logs.",
        actionLabel: "EXECUTE_STAFF_PAYROLL_AUDIT",
        duration: "0:45 – 0:56"
      }
    ],
    actions: [
      {
        title: "Reconcile Sample Student MoMo Invoice",
        desc: "Verify TX ref & clear GH₵ 1,250 tuition balance",
        cmd: "Ledger updated: Student balance reduced to GH₵ 0.00; Receipt stamped 'BEST KIDS'."
      },
      {
        title: "Dispatch Overdue Balance SMS Batch",
        desc: "Trigger polite fee reminders to 14 pending guardians",
        cmd: "14 guardian SMS balance reminders queued via notification gateway."
      },
      {
        title: "Process Monthly Staff Payroll Run",
        desc: "Calculate SSNIT/tax deductions & generate payslips",
        cmd: "38 staff payslips approved & audit log committed."
      }
    ],
    demoPortalRoute: "/login/accountant",
    demoCreds: "Approved Bursar / Accountant Email + Password"
  },
  {
    id: "STAFF",
    role: "Non-Teaching Staff, Transport & HR",
    badge: "CAMPUS GATE, BUS & HR",
    icon: "🛡️",
    color: "#06b6d4",
    videoFile: "/videos/video6_staff_hr_role_guide.mp4",
    downloadName: "GBS_Video6_Staff_HR_Action_Guide.mp4",
    photos: [
      "/assets/real/staff_gate_turnstile.jpg",
      "/images/staff_login_bg.jpg",
      "/assets/transport-bg.jpg"
    ],
    targetAudience: "Security Officers, Bus Drivers, Librarians, Storekeepers & HR Managers",
    description:
      "Manage shift clock-ins, campus gate QR/ID pickup verification, school bus fleet GPS manifests, library circulation & inventory ledgers, and HR leave/payslip workflows.",
    metrics: [
      { label: "Gate Security", val: "QR Guardian Verify" },
      { label: "School Bus GPS", val: "Live Route Map" },
      { label: "HR & Inventory", val: "Unified Operations" }
    ],
    closingHook:
      "Keep gates secure, buses tracked in real time, stores audited, and every non-teaching team member coordinated seamlessly.",
    steps: [
      {
        title: "Step 1: Shift Clock-In & Duty Roster Verification",
        narration:
          "Security, kitchen, clinic, transport, and administrative personnel log their shift check-in inside BEST KIDS with live roster visibility.",
        actionLabel: "STAFF_SHIFT_CLOCKIN_ROSTER",
        duration: "0:00 – 0:10"
      },
      {
        title: "Step 2: Campus Gate QR & Guardian Pickup Security",
        narration:
          "Scan visitor passes and authorized guardian QR pickup tokens at the gate before any child exits campus.",
        actionLabel: "VERIFY_GATE_PICKUP_QR_TOKEN",
        duration: "0:10 – 0:21"
      },
      {
        title: "Step 3: School Bus Fleet Manifest & Live GPS Route",
        narration:
          "Check off every student boarding each bus route while live GPS telemetry updates parents and Headmasters.",
        actionLabel: "STREAM_BUS_BOARDING_GPS",
        duration: "0:21 – 0:32"
      },
      {
        title: "Step 4: Library Circulation & Asset Inventory Control",
        narration:
          "Scan library barcodes and monitor campus store inventory levels, laboratory assets, and low-stock alerts.",
        actionLabel: "CHECKOUT_BOOK_&_AUDIT_STORE",
        duration: "0:32 – 0:42"
      },
      {
        title: "Step 5: Staff Leave Requests & Branded Payslips",
        narration:
          "Apply for annual or medical leave and download HR-verified monthly payslips carrying the exact BEST KIDS letterhead.",
        actionLabel: "DOWNLOAD_HR_PAYSLIP & LEAVE_STATUS",
        duration: "0:42 – 0:53"
      }
    ],
    actions: [
      {
        title: "Scan Authorized Guardian Pickup QR",
        desc: "Verify parent identity token at campus gate turnstile",
        cmd: "Pickup Token #GP-902 verified -> Release authorized for Ama Mensah (JHS 1)."
      },
      {
        title: "Confirm East Legon Bus Boarding Manifest",
        desc: "Mark 24/24 scholars boarded & broadcast GPS route",
        cmd: "Route East Legon Express active: 24 boarded, live GPS transmitting."
      },
      {
        title: "Submit Staff Leave Request & View Payslip",
        desc: "Route leave request to Headmaster & download PDF",
        cmd: "Leave request routed to Headmaster + October payslip PDF ready."
      }
    ],
    demoPortalRoute: "/login/staff",
    demoCreds: "Approved Staff / HR Email + Password"
  }
];

export default function VideoPresentationEngine() {
  const navigate = useNavigate();
  const [activeRoleIdx, setActiveRoleIdx] = useState(0);
  const [activeStepIdx, setActiveStepIdx] = useState(0);
  const [isPlayingScript, setIsPlayingScript] = useState(false);
  const [actionLog, setActionLog] = useState([
    { time: "Ready", msg: "Real-Life Action Cinema & Interactive Walkthrough Engine initialized." }
  ]);

  // Interactive Per-Student Subscription Calculator
  const [rates] = useState(() => getOnboardingRates());
  const [calcTier, setCalcTier] = useState("SHS");
  const [calcStudents, setCalcStudents] = useState(300);
  const computedFee = calculateOnboardingFee(calcTier, calcStudents, "3_MONTHS");

  const activeModule = ROLE_MODULES[activeRoleIdx] || ROLE_MODULES[0];
  const activeStep = activeModule.steps[activeStepIdx] || activeModule.steps[0];
  const masterVideo = REAL_ACTION_ROLE_VIDEOS[0];

  const speechRef = useRef(null);

  useEffect(() => {
    return () => {
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const appendLog = (msg) => {
    const now = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
    setActionLog((prev) => [{ time: now, msg }, ...prev.slice(0, 7)]);
  };

  const handleSelectRole = (idx) => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    setIsPlayingScript(false);
    setActiveRoleIdx(idx);
    setActiveStepIdx(0);
    appendLog(`Loaded Role ${idx + 1}: ${ROLE_MODULES[idx].role}`);
  };

  const handleSpeakStep = () => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      appendLog("Browser Web Speech API unavailable — use the HD MP4 player above for audio narration.");
      return;
    }
    window.speechSynthesis.cancel();
    if (isPlayingScript) {
      setIsPlayingScript(false);
      return;
    }
    const utter = new SpeechSynthesisUtterance(activeStep.narration);
    utter.rate = 1.02;
    utter.onend = () => setIsPlayingScript(false);
    utter.onerror = () => setIsPlayingScript(false);
    speechRef.current = utter;
    setIsPlayingScript(true);
    window.speechSynthesis.speak(utter);
    appendLog(`Speaking ${activeModule.id} — ${activeStep.title}`);
  };

  const handleTriggerAction = (act) => {
    appendLog(act.cmd);
  };

  const handleCopyNarration = () => {
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(activeStep.narration);
      appendLog("Copied current scene narration to clipboard.");
    }
  };

  return (
    <div className="gbs-presentation-engine-root">
      {/* Top Executive Header */}
      <header className="gbs-pres-header">
        <div className="gbs-pres-brand">
          <div className="gbs-pres-logo-badge">GBS</div>
          <div>
            <h1>GBS REAL-LIFE ACTION VIDEO PRESENTATION ENGINE</h1>
            <span className="gbs-pres-sub">
              Real School Documentary Photography + Live UI Action Movies Across All 6 Roles
            </span>
          </div>
        </div>

        <div className="gbs-pres-actions">
          <button
            type="button"
            className="gbs-btn-pres-outline"
            onClick={() => navigate("/login")}
          >
            🔐 Portal Login Gateway
          </button>
          <button
            type="button"
            className="gbs-btn-pres-outline"
            onClick={() => navigate("/home")}
          >
            🌐 Company Website
          </button>
          <a
            href={masterVideo.file}
            download={masterVideo.downloadName}
            className="gbs-btn-pres-primary"
            style={{ textDecoration: "none" }}
          >
            ⬇️ Download Complete 6-Role Movie (53.99 MB)
          </a>
        </div>
      </header>

      {/* Role Selector Switcher Bar */}
      <nav className="gbs-pres-role-nav">
        {ROLE_MODULES.map((mod, idx) => (
          <button
            key={mod.id}
            type="button"
            className={`gbs-pres-role-btn ${idx === activeRoleIdx ? "active" : ""}`}
            onClick={() => handleSelectRole(idx)}
          >
            <span className="gbs-pres-role-icon">{mod.icon}</span>
            <div className="gbs-pres-role-btn-text">
              <span className="gbs-pres-role-badge-label">{mod.badge}</span>
              <span className="gbs-pres-role-title-text">{mod.role}</span>
            </div>
          </button>
        ))}
      </nav>

      {/* Embedded Real-Life Action MP4 Cinema Banner */}
      <section className="gbs-pres-cinema-banner">
        <div className="gbs-pres-cinema-player-wrap">
          <video
            key={activeModule.videoFile}
            src={activeModule.videoFile}
            poster={activeModule.photos[0]}
            controls
            playsInline
            preload="metadata"
          />
        </div>

        <div className="gbs-pres-cinema-info">
          <span
            className="gbs-pres-tag"
            style={{ background: activeModule.color, color: "#020617" }}
          >
            REAL-LIFE ACTION MOVIE • VIDEO {activeRoleIdx + 1} OF 6
          </span>
          <h3>
            {activeModule.icon} {activeModule.role} — Live Action Walkthrough
          </h3>
          <p>{activeModule.description}</p>

          <div className="gbs-pres-cinema-photos">
            {activeModule.photos.map((src, i) => (
              <img key={src} src={src} alt={`${activeModule.role} scene ${i + 1}`} />
            ))}
          </div>

          <div className="gbs-pres-download-row">
            <a
              href={activeModule.videoFile}
              download={activeModule.downloadName}
              className="gbs-btn-mp4-download role"
            >
              ⬇️ Download Role {activeRoleIdx + 1} Action MP4
            </a>
            <a
              href={masterVideo.file}
              download={masterVideo.downloadName}
              className="gbs-btn-mp4-download master"
            >
              🎬 Download Master All-6-Roles MP4
            </a>
          </div>
        </div>
      </section>

      {/* Main Split Arena */}
      <main className="gbs-pres-arena">
        {/* Left Column: Scene Narration & Verbatim Steps */}
        <div>
          <section className="gbs-pres-card">
            <div className="gbs-pres-role-header">
              <div className="gbs-pres-role-title-box">
                <div className="gbs-pres-role-icon-large">{activeModule.icon}</div>
                <div>
                  <span
                    className="gbs-pres-tag"
                    style={{ background: activeModule.color, color: "#020617" }}
                  >
                    {activeModule.badge}
                  </span>
                  <h2>{activeModule.role}</h2>
                  <p className="gbs-pres-role-desc">{activeModule.description}</p>
                </div>
              </div>

              <div className="gbs-pres-audience-box">
                <span className="gbs-label-small">Target Portal Users</span>
                <strong>{activeModule.targetAudience}</strong>
              </div>
            </div>

            <div className="gbs-pres-metrics-row">
              {activeModule.metrics.map((m) => (
                <div key={m.label} className="gbs-pres-metric-pill">
                  <span className="gbs-km-label">{m.label}</span>
                  <strong className="gbs-km-val">{m.val}</strong>
                </div>
              ))}
            </div>

            <div className="gbs-pres-section-title">SCENE-BY-SCENE ACTION BREAKDOWN</div>

            <div className="gbs-pres-step-tabs">
              {activeModule.steps.map((st, sIdx) => (
                <button
                  key={st.title}
                  type="button"
                  className={`gbs-pres-step-tab-btn ${sIdx === activeStepIdx ? "active" : ""}`}
                  onClick={() => setActiveStepIdx(sIdx)}
                >
                  Scene {sIdx + 1} ({st.duration})
                </button>
              ))}
            </div>

            <div className="gbs-pres-step-content">
              <h4>{activeStep.title}</h4>
              <p className="gbs-pres-narration">{activeStep.narration}</p>
              <div className="gbs-pres-action-indicator">
                <span className="gbs-badge-live">ON-SCREEN ACTION</span>
                <code>{activeStep.actionLabel}</code>
              </div>

              <div style={{ display: "flex", gap: "0.75rem", marginTop: "1rem", flexWrap: "wrap" }}>
                <button
                  type="button"
                  className="gbs-btn-pres-primary"
                  onClick={handleSpeakStep}
                >
                  {isPlayingScript ? "⏹ Stop Voice Readout" : "🔊 Read Scene Narration Aloud"}
                </button>
                <button
                  type="button"
                  className="gbs-btn-pres-outline"
                  onClick={handleCopyNarration}
                >
                  📋 Copy Narration Text
                </button>
              </div>
            </div>

            <div className="gbs-pres-closing-quote" style={{ marginTop: "1.25rem" }}>
              💡 <strong>Key Takeaway:</strong> {activeModule.closingHook}
            </div>
          </section>
        </div>

        {/* Right Column: Live Simulator, Direct Portal Access & Fee Calculator */}
        <div>
          <section className="gbs-pres-card">
            <div className="gbs-pres-section-title">INTERACTIVE FEATURE SIMULATOR</div>
            <div className="gbs-pres-action-list">
              {activeModule.actions.map((act) => (
                <div key={act.title} className="gbs-pres-action-item">
                  <div className="gbs-pres-action-info">
                    <strong>{act.title}</strong>
                    <span className="gbs-text-subtle">{act.desc}</span>
                  </div>
                  <button
                    type="button"
                    className="gbs-btn-action-trigger"
                    onClick={() => handleTriggerAction(act)}
                  >
                    ▶ Run Action
                  </button>
                </div>
              ))}
            </div>

            <div className="gbs-action-log">
              <span className="gbs-log-title">LIVE ACTION EXECUTION TELEMETRY</span>
              {actionLog.map((entry, idx) => (
                <div key={`${entry.time}-${idx}`} className="gbs-log-entry">
                  <span className="gbs-log-time">[{entry.time}]</span>
                  <span className="gbs-log-msg">{entry.msg}</span>
                </div>
              ))}
            </div>

            <div className="gbs-pres-creds-body" style={{ marginTop: "1.25rem" }}>
              <div className="gbs-creds-display">
                <div className="gbs-cred-item">
                  <span>Portal Route:</span>
                  <code>{activeModule.demoPortalRoute}</code>
                </div>
                <div className="gbs-cred-item">
                  <span>Access Policy:</span>
                  <code>{activeModule.demoCreds}</code>
                </div>
              </div>
              <button
                type="button"
                className="gbs-btn-pres-launch"
                onClick={() => navigate(activeModule.demoPortalRoute)}
              >
                🚀 Open {activeModule.role} Login
              </button>
              <p className="gbs-text-muted" style={{ margin: "0.5rem 0 0", fontSize: "0.75rem" }}>
                Security policy: Users only enter dashboards after institution & role approval.
              </p>
            </div>
          </section>

          <section className="gbs-pres-card">
            <div className="gbs-pres-section-title">100% STUDENT-BASED SUBSCRIPTION ESTIMATOR</div>
            <div className="gbs-pres-tier-buttons">
              {[
                { id: "JHS", label: `Nursery-JHS (GH₵${rates.JHS || 3})` },
                { id: "SHS", label: `SHS (GH₵${rates.SHS || 5})` },
                { id: "UNIVERSITY", label: `University (GH₵${rates.UNIVERSITY || 10})` }
              ].map((t) => (
                <button
                  key={t.id}
                  type="button"
                  className={`gbs-tier-btn ${calcTier === t.id ? "active" : ""}`}
                  onClick={() => setCalcTier(t.id)}
                >
                  {t.label}
                </button>
              ))}
            </div>

            <div className="gbs-slider-box">
              <label htmlFor="pres-student-slider">
                Active Enrolled Scholars: <strong>{calcStudents.toLocaleString()} Students</strong>
              </label>
              <input
                id="pres-student-slider"
                type="range"
                min={50}
                max={2000}
                step={25}
                value={calcStudents}
                onChange={(e) => setCalcStudents(parseInt(e.target.value, 10) || 50)}
              />
            </div>

            <div className="gbs-calc-output-box">
              <span>Monthly Subscription ({computedFee.formattedRate} × {calcStudents})</span>
              <h3>{computedFee.formattedMonthlyFee} / month</h3>
              <p className="gbs-calc-caption">
                3-Month Term (3% off): {computedFee.formattedTotalTermFee} • Zero fixed tenant setup fees
              </p>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}

