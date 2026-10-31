import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import WindowControlsBar from "../../../components/common/WindowControlsBar";
import { formatCedis, getOnboardingRates } from "../../../utils/pricingEngine";
import "../styles/VideoPresentationEngine.css";

const PRESENTATION_ROLES = [
  {
    id: "public_onboarding",
    title: "1. Prospective Institution & 100% Remote Onboarding",
    targetAudience: "Proprietors, School Boards, Vice-Chancellors, Registrars",
    portalRoute: "/signup/institution",
    roleBadge: "Public / Prospective Client",
    badgeColor: "#0284c7",
    icon: "🌐",
    tagline: "How institutions discover GBS, calculate exact onboarding fees, and self-register remotely without developer physical visits.",
    keyMetrics: [
      { label: "Onboarding Visit Time", value: "0 Minutes (100% Remote)" },
      { label: "Pricing Calculation", value: "Instant Automated Formula" },
      { label: "Deployment Turnaround", value: "< 24 Business Hours" }
    ],
    presentationScript: {
      openingHook: "Welcome, ladies and gentlemen. Today, I am proud to introduce GBS System — the premier all-in-one institutional cloud operating system. For the very first time, your institution does not need to wait weeks for IT technicians to travel to your physical premises.",
      featureBreakdown: [
        {
          step: "Step 1: Discovering the 12 Enterprise Systems",
          narration: "Within GBS System, clients can inspect our complete catalog of 12 enterprise systems — from our flagship School ERP and Anti-Cheat CBT Examination Engine to Hospital EMR, Supermarket POS, and Smart CCTV Sentinels.",
          actionText: "Click 'Explore Blueprint & Specs' on any of the 12 system cards."
        },
        {
          step: "Step 2: Transparent Per-Student Pricing Engine",
          narration: "We eliminate hidden consultancy costs. By entering total enrolled students into our interactive calculator, the system multiplies the exact rate — GH₵ 5 for JHS, GH₵ 10 for SHS, and GH₵ 20 for Universities — strictly separating one-time onboarding from monthly cloud hosting.",
          actionText: "Slide student count to 500 on University tier → Calculates GH₵ 10,000.00 instantly."
        },
        {
          step: "Step 3: Autonomous Remote Registration",
          narration: "Clicking 'Apply for Remote Onboarding' pre-fills the registration portal. The school uploads their business certificate and GPS coordinates, immediately receiving an Application Reference Code like GBS-APP-2026-8942.",
          actionText: "Form pre-fills tier, student count, and fee → Submits and renders tracking card."
        },
        {
          step: "Step 4: Live Application Status Tracking",
          narration: "At any hour, the institution's board can enter their reference code into the system tracker to verify developer review, database provisioning, and credential generation.",
          actionText: "Enter tracking code → View instant UNDER_DEVELOPER_REVIEW status."
        }
      ],
      closingPitch: "With GBS System, institutional onboarding is transparent, dignified, and completely digital."
    },
    demoActions: [
      { id: "calc_jhs", label: "Calculate JHS Fee (300 students)", action: "JHS 300 × GH₵ 5 = GH₵ 1,500.00" },
      { id: "calc_shs", label: "Calculate SHS Fee (300 students)", action: "SHS 300 × GH₵ 10 = GH₵ 3,000.00" },
      { id: "calc_uni", label: "Calculate University Fee (500 students)", action: "University 500 × GH₵ 20 = GH₵ 10,000.00" },
      { id: "track_app", label: "Query Application Reference", action: "Query GBS-APP-2026-8942 → Status Review" }
    ],
    videoRecordingName: "video_public_onboarding"
  },
  {
    id: "headmaster_admin",
    title: "2. Headmaster & Executive Administrator Portal",
    targetAudience: "Headmasters, Principals, Rectors, Deans of Academic Affairs",
    portalRoute: "/login",
    defaultCredentials: { email: "admin@gbs.com", password: "Admin123!", role: "SUPER_ADMIN / ADMIN" },
    roleBadge: "Supervisory Authority",
    badgeColor: "#722f37",
    icon: "🏛️",
    tagline: "360-degree command over student enrollment, teacher qualifications vetting, live attendance, and admissions approvals.",
    keyMetrics: [
      { label: "Active Roles Supervised", value: "7 Institutional Portals" },
      { label: "Data Integrity", value: "PostgreSQL Multi-Tenant Isolated" },
      { label: "Audit Ledger", value: "2,360+ Immutable Events Logged" }
    ],
    presentationScript: {
      openingHook: "As Headmaster or Rector, having complete operational visibility is non-negotiable. The GBS Administrator Dashboard gives leadership total command without sifting through paper binders.",
      featureBreakdown: [
        {
          step: "Step 1: Real-Time Institutional Telemetry & Role Counts",
          narration: "Upon login, the Headmaster sees live aggregates of every enrolled student, teacher, accountant, and parent in the school, dynamically cross-referenced from PostgreSQL.",
          actionText: "Inspect top telemetry statistics and live role count drop-list."
        },
        {
          step: "Step 2: HR Qualifications & Degree Vetting",
          narration: "Under the HR Audits tab, the Headmaster inspects uploaded teacher credentials, verifies degrees (such as PhDs and Masters), and formally approves staff into active academic rotation.",
          actionText: "Open 'hr_audits' tab → Review highest qualification → Click 'Approve & Activate'."
        },
        {
          step: "Step 3: Admissions Pipeline & 1-Click Provisioning",
          narration: "The Headmaster monitors every admission application from inquiry to document verification, scheduling entrance interviews, and approving enrollment with automatic student account generation.",
          actionText: "Navigate to 'admissions' tab → Approve vetted applicant → Automatically provisions student account."
        },
        {
          step: "Step 4: Live CCTV & Fleet Transit Supervision",
          narration: "The dashboard integrates directly with campus perimeter security gates and GPS bus tracking for comprehensive student safety.",
          actionText: "Inspect live CCTV telemetry and campus locator map."
        }
      ],
      closingPitch: "This is modern educational governance: instant data, total transparency, and zero administrative friction."
    },
    demoActions: [
      { id: "view_roster", label: "Inspect Student Enrollment Registry", action: "Filter active classrooms by grade" },
      { id: "vet_teacher", label: "Vet Teacher Degree & Certifications", action: "Inspect PhD in Mathematical Sciences credentials" },
      { id: "approve_admissions", label: "Approve Student Admission", action: "Converts applicant to active student ID atomically" }
    ],
    videoRecordingName: "video_admin_portal"
  },
  {
    id: "teacher_portal",
    title: "3. Teacher Academic & Classroom Suite",
    targetAudience: "Subject Teachers, Form Tutors, Faculty Heads, Lecturers",
    portalRoute: "/login",
    defaultCredentials: { email: "teacher@gbs.com", password: "Teacher123!", role: "TEACHER" },
    roleBadge: "Academic Delivery",
    badgeColor: "#10b981",
    icon: "👨‍🏫",
    tagline: "Mark biometric/live attendance registers, publish homework assignments, launch virtual classes, and compile transcripts.",
    keyMetrics: [
      { label: "Attendance Speed", value: "< 30 Seconds per Classroom" },
      { label: "Homework Distribution", value: "Paperless Cloud Dispatch" },
      { label: "Virtual Classroom", value: "HD Video & Screen Share Ready" }
    ],
    presentationScript: {
      openingHook: "Teachers are the heartbeat of any educational institution. GBS System eliminates hours of manual grading and roll-call paperwork so teachers can focus on teaching.",
      featureBreakdown: [
        {
          step: "Step 1: Daily Classroom Attendance Register",
          narration: "In the Attendance tab, the teacher marks each student Present, Absent, or Late with a single tap. The moment the register is saved, parents receive instant notifications.",
          actionText: "Toggle student attendance status → Click 'Submit Attendance Register to Headmaster'."
        },
        {
          step: "Step 2: Paperless Homework & Assignment Publishing",
          narration: "Teachers create assignments with title, submission deadlines, instructions, and file attachments. Students receive the notification instantly on their portal.",
          actionText: "Open 'assignments' tab → Enter homework details → Click 'Publish Assignment to Class'."
        },
        {
          step: "Step 3: Launching Virtual Online Classrooms",
          narration: "With one click, teachers start live video sessions for remote lectures, complete with attendance logging and interactive whiteboards.",
          actionText: "Navigate to 'meetings' tab → Click 'Launch Virtual Classroom Session'."
        },
        {
          step: "Step 4: Continuous Assessment Gradebook",
          narration: "Teachers enter test scores and exam marks, which automatically compile into term report cards with automated GPA calculations.",
          actionText: "Open 'transcripts' tab → Update term assessment marks."
        }
      ],
      closingPitch: "A clean, modern classroom management workflow that saves teachers 10+ hours of administrative work every week."
    },
    demoActions: [
      { id: "mark_attendance", label: "Mark Form 3 Attendance Register", action: "Mark Samuel Doe Present, save register" },
      { id: "publish_homework", label: "Publish Physics Assignment", action: "Dispatches homework with submission deadline" },
      { id: "start_virtual_class", label: "Launch Live Video Classroom", action: "Spawns WebRTC secure virtual lecture hall" }
    ],
    videoRecordingName: "video_teacher_portal"
  },
  {
    id: "student_portal",
    title: "4. Student Learning & Timetable Portal",
    targetAudience: "Enrolled Students, Scholars, Distance Learners",
    portalRoute: "/login",
    defaultCredentials: { email: "student@gbs.com", password: "Student123!", role: "STUDENT" },
    roleBadge: "Learner Experience",
    badgeColor: "#6366f1",
    icon: "🎓",
    tagline: "Interactive weekly timetable grid, online assignment submission, exam CBT locker, and digital report card inspection.",
    keyMetrics: [
      { label: "Schedule Grid", value: "Real-time Conflict-free Timetable" },
      { label: "Homework Submissions", value: "Digital PDF & Essay Upload" },
      { label: "Report Cards", value: "Instant Tamper-proof Access" }
    ],
    presentationScript: {
      openingHook: "For students, GBS provides a clean, organized digital workspace where confusion about classes, schedules, and assignments is completely eliminated.",
      featureBreakdown: [
        {
          step: "Step 1: Interactive Weekly Timetable Grid",
          narration: "Students view their weekly timetable color-coded by subject, showing start times, end times, classroom locations, and instructor names.",
          actionText: "Open 'timetable' tab → Inspect Monday through Friday lesson slots."
        },
        {
          step: "Step 2: Homework Deadlines & Submission",
          narration: "In the Assignments tab, active homework tasks display remaining submission countdowns. Students attach their work and submit directly to the teacher.",
          actionText: "Open 'assignments' tab → Click 'Submit Homework' → Attach document and submit."
        },
        {
          step: "Step 3: Online Examinations & CBT Test Locker",
          narration: "The built-in CBT engine lets students take exams safely online with randomized questions and automated anti-cheat monitoring.",
          actionText: "Navigate to 'exams' tab → Enter scheduled test session."
        },
        {
          step: "Step 4: Academic Progress & Report Cards",
          narration: "Students can view their verified term grades, cumulative GPA, and download official stamped report card PDFs.",
          actionText: "Open 'report-card' tab → View breakdown of subject grades."
        }
      ],
      closingPitch: "Empowering students with structured, modern tools that build academic discipline and excellence."
    },
    demoActions: [
      { id: "view_schedule", label: "Inspect Weekly Timetable", action: "Shows period schedule across 5 school days" },
      { id: "submit_homework", label: "Submit Mathematics Assignment", action: "Marks assignment SUBMITTED with timestamp" },
      { id: "view_grades", label: "Download Term Report Card", action: "Renders GPA analytics and subject standings" }
    ],
    videoRecordingName: "video_student_portal"
  },
  {
    id: "parent_portal",
    title: "5. Parent & Guardian Supervision Portal",
    targetAudience: "Parents, Legal Guardians, Sponsors",
    portalRoute: "/login",
    defaultCredentials: { email: "parent@gbs.com", password: "Parent123!", role: "PARENT" },
    roleBadge: "Guardian Transparency",
    badgeColor: "#f59e0b",
    icon: "👨‍👩‍👧",
    tagline: "Track children's academic grades, real-time daily attendance, school fees billing ledger with Mobile Money, and Emergency GPS Transit Locator.",
    keyMetrics: [
      { label: "Child Linkage", value: "Verified Atomic Parent-Student Link" },
      { label: "Payment Gateways", value: "MTN MoMo, Telecel, Card, Bank" },
      { label: "Safety Sentinel", value: "Live GPS Bus & Transit Map" }
    ],
    presentationScript: {
      openingHook: "Parents no longer have to wonder how their child is performing or whether school fees reached the bursar. GBS gives parents 100% transparency directly on their smartphone or laptop.",
      featureBreakdown: [
        {
          step: "Step 1: Linked Children Profiles",
          narration: "Parents see all their enrolled children in one view, tracking their grades, current class, and form teacher details.",
          actionText: "Open 'children' tab → Inspect linked ward Samuel Doe."
        },
        {
          step: "Step 2: Real-Time Attendance Monitoring",
          narration: "The moment the form teacher takes attendance in the morning, the parent's portal updates. If a student is absent, the parent knows immediately.",
          actionText: "Open 'attendance' tab → View daily attendance compliance rate."
        },
        {
          step: "Step 3: School Fees Ledger & Instant MoMo Payment",
          narration: "Under the Fees tab, parents see itemized billing (tuition, laboratory, books). They can make instant payments via MTN MoMo or Telecel Cash with instant receipts.",
          actionText: "Open 'fees' tab → View outstanding balance → Click 'Pay via Mobile Money'."
        },
        {
          step: "Step 4: Emergency Student GPS Locator",
          narration: "For schools with transportation, the live GPS locator lets parents track their child's school bus location in real-time during morning pickup and afternoon drop-off.",
          actionText: "Navigate to 'locator' tab → View live campus transit coordinates."
        }
      ],
      closingPitch: "GBS builds unshakeable trust between parents and the school."
    },
    demoActions: [
      { id: "check_ward_grades", label: "Inspect Ward Academic Grades", action: "Views continuous assessment and teacher remarks" },
      { id: "pay_fees_momo", label: "Inspect Fee Ledger & MoMo Checkout", action: "Displays itemized fee breakdown and payment options" },
      { id: "track_transit_gps", label: "Open Emergency GPS Transit Locator", action: "Displays live telemetry and transit safety status" }
    ],
    videoRecordingName: "video_parent_portal"
  },
  {
    id: "accountant_portal",
    title: "6. Accountant & Bursar Financial Suite",
    targetAudience: "Bursars, Chief Accountants, Finance Directors, Auditors",
    portalRoute: "/login",
    defaultCredentials: { email: "accountant@gbs.com", password: "Accountant123!", role: "ACCOUNTANT" },
    roleBadge: "Fiscal Stewardship",
    badgeColor: "#8b5cf6",
    icon: "💰",
    tagline: "Generate student billing invoices, configure fee schedules, log campus operating expenses, and inspect live financial ratios and debtor ledgers.",
    keyMetrics: [
      { label: "Cash Flow Tracking", value: "Real-time Payment Reconciliation" },
      { label: "Debtor Management", value: "Automated Aging Ledger & SMS Prompts" },
      { label: "Audit Compliance", value: "Immutable Double-Entry Ledger" }
    ],
    presentationScript: {
      openingHook: "Financial leakages destroy private institutions. The GBS Bursar Suite ensures that every pesewa billed, collected, or disbursed is accounted for with cryptographic audit logs.",
      featureBreakdown: [
        {
          step: "Step 1: Automated Student Invoicing",
          narration: "The Bursar can generate class-wide or individual student invoices in seconds, incorporating tuition, boarding, laboratory, and library levies.",
          actionText: "Open 'invoices' tab → Click 'Generate New Student Billing Invoice'."
        },
        {
          step: "Step 2: Real-Time Debtor Aging Ledger",
          narration: "The system dynamically tracks outstanding fee balances by 30, 60, and 90+ days, allowing the bursar to dispatch bulk SMS fee reminders with a single click.",
          actionText: "Open 'debtors' tab → Filter accounts with overdue balances."
        },
        {
          step: "Step 3: Campus Operating Expense Logging",
          narration: "Operating disbursements — from utility bills and generator diesel to maintenance and staff allowances — are formally logged with invoice receipts.",
          actionText: "Open 'expenses' tab → Log campus operating disbursement."
        },
        {
          step: "Step 4: Financial Telemetry & Key Ratios",
          narration: "The Bursar and Headmaster review live liquidity ratios, collection efficiency percentages, and operating margin telemetries.",
          actionText: "Open 'statements' tab → Review financial summary charts."
        }
      ],
      closingPitch: "Total financial integrity, eliminated fee leakages, and healthy institutional cash flow."
    },
    demoActions: [
      { id: "generate_invoice", label: "Create Student Tuition Invoice", action: "Generates invoice INV-2026-XXXX with payment slip" },
      { id: "view_debtors", label: "Inspect Aged Debtors Ledger", action: "Identifies outstanding balances by class" },
      { id: "log_expense", label: "Log Campus Maintenance Expense", action: "Records operating disbursement with ledger receipt" }
    ],
    videoRecordingName: "video_accountant_portal"
  },
  {
    id: "staff_operations",
    title: "7. Campus Operations & Support Staff Portal",
    targetAudience: "Administrative Officers, Facility Managers, Inventory Custodians",
    portalRoute: "/login",
    defaultCredentials: { email: "staff@gbs.com", password: "Staff123!", role: "STAFF" },
    roleBadge: "Operational Logistics",
    badgeColor: "#ec4899",
    icon: "🛠️",
    tagline: "Submit inventory stock requisitions, request annual/medical leave, and log campus maintenance work orders.",
    keyMetrics: [
      { label: "Task Dispatch", value: "Instant Maintenance Routing" },
      { label: "Inventory Control", value: "Real-time Consumables Tracking" },
      { label: "Incident Escalation", value: "Zero-Latency Campus Alerts" }
    ],
    presentationScript: {
      openingHook: "A smooth campus requires efficient back-office logistics. The GBS Staff Portal coordinates maintenance, supplies, and operational duties without bureaucratic paperwork.",
      featureBreakdown: [
        {
          step: "Step 1: Operational Duties & Shift Tasks",
          narration: "Support staff review assigned daily tasks, mark duties as completed, and track recurring campus protocols.",
          actionText: "Open 'duties' tab → Toggle maintenance task status to COMPLETED."
        },
        {
          step: "Step 2: Admissions Document Verification",
          narration: "Administrative officers inspect physical birth certificates and transcripts brought by prospective students, marking them verified for Headmaster approval.",
          actionText: "Open 'admissions' tab → Inspect uploaded PDF certificate → Click 'Verify Document'."
        },
        {
          step: "Step 3: Facility Maintenance Work Orders",
          narration: "Staff submit tickets for electrical, plumbing, or structural repairs with estimated costs and priority rankings.",
          actionText: "Open 'maintenance' tab → Submit facility ticket (e.g., Auditorium Relay Servicing)."
        },
        {
          step: "Step 4: Emergency Incident & Safety Escalation",
          narration: "In safety situations, staff dispatch urgent priority alerts directly to security and the Headmaster.",
          actionText: "Open 'incidents' tab → View or log safety escalation ticket."
        }
      ],
      closingPitch: "Ensuring high-efficiency campus facilities and seamless daily school operations."
    },
    demoActions: [
      { id: "verify_doc", label: "Verify Student Civil Registry Certificate", action: "Approves document 35 as VERIFIED" },
      { id: "submit_ticket", label: "Submit Facility Maintenance Ticket", action: "Generates collision-proof ticket TKT-2026-XXXX" },
      { id: "request_leave", label: "Submit Staff Annual Leave Application", action: "Dispatches request to HR approval queue" }
    ],
    videoRecordingName: "video_staff_portal"
  },
  {
    id: "developer_control",
    title: "8. Executive Developer Control Center (Gabriel Osei)",
    targetAudience: "Executive Developer (Gabriel Osei), Platform Engineers, Cloud Infrastructure Operators",
    portalRoute: "/developer-control-center/login",
    defaultCredentials: { masterPin: "00000000", password: "Master Developer Auth", role: "DEVELOPER" },
    roleBadge: "Root Infrastructure Authority",
    badgeColor: "#38bdf8",
    icon: "⚡",
    tagline: "Dynamic per-student rate configurator, tenant countdown engines, hardware telemetry, database maintenance, and security intrusion defense.",
    keyMetrics: [
      { label: "Master PIN Guard", value: "8-Digit Strict Sentinel (00000000)" },
      { label: "Dynamic Rate Sync", value: "Instant System Rate Sync" },
      { label: "Tenant Isolation", value: "Multi-DB Regional Sharding & Zero-Loss DR" }
    ],
    presentationScript: {
      openingHook: "Finally, we reveal the master command center: the GBS Developer Platform. This is where the Executive Developer, Gabriel Osei, monitors the entire national ecosystem with complete authority.",
      featureBreakdown: [
        {
          step: "Step 1: Security Gate Sentinel",
          narration: "The Developer Gateway is fortified. The password field mounts completely empty with zero default exposure, and unauthorized attempts from regular tenant accounts trigger severe intrusion warnings.",
          actionText: "Enter Master PIN 00000000 → Verify developer authorization."
        },
        {
          step: "Step 2: Dynamic Per-Student Rate Configurator",
          narration: "Gabriel Osei can adjust onboarding rates for JHS, SHS, and Universities right from the console. When saved, the new rates broadcast live across the GBS System without redeploying code.",
          actionText: "Update JHS / SHS / Uni rates → Click 'Save & Broadcast Live Rates' → Syncs instantly."
        },
        {
          step: "Step 3: Tenant Review Queue & Automated Activation",
          narration: "Incoming remote applications appear in real-time with declared student counts and calculated fees, ready for instant tenant database provisioning.",
          actionText: "Inspect incoming onboarding queue → Review Application Reference GBS-APP-2026-8942."
        },
        {
          step: "Step 4: Infrastructure Telemetry & Database Maintenance",
          narration: "The developer monitors CPU, RAM, PostgreSQL pools, executes database vacuuming, clears cache, and oversees multi-DB sharding with zero-loss disaster recovery failover.",
          actionText: "View live hardware telemetry → Execute CLEAR_CACHE & VACUUM_DATABASE."
        }
      ],
      closingPitch: "Enterprise-grade reliability, total security, and continuous developer oversight."
    },
    demoActions: [
      { id: "test_configurator", label: "Configure Live Onboarding Rates", action: "Broadcasts new rates live to system onboarding engine" },
      { id: "inspect_telemetry", label: "Query Server CPU & PostgreSQL Pools", action: "Shows real-time memory RSS and active connections" },
      { id: "vacuum_db", label: "Execute Database Vacuum & Cache Clear", action: "Optimizes PostgreSQL indexes and flushes cache" }
    ],
    videoRecordingName: "video_developer_control"
  }
];

export default function VideoPresentationEngine() {
  const navigate = useNavigate();
  const [selectedRoleIndex, setSelectedRoleIndex] = useState(0);
  const [rates, setRates] = useState(() => getOnboardingRates());
  const [liveCalcStudents, setLiveCalcStudents] = useState(300);
  const [liveCalcTier, setLiveCalcTier] = useState("JHS");
  const [copiedScript, setCopiedScript] = useState(false);
  const [activeStepTab, setActiveStepTab] = useState(0);
  const [actionFeedbacks, setActionFeedbacks] = useState({});

  // Live Interactive Video Demonstrator State
  const [isPlayingDemo, setIsPlayingDemo] = useState(false);
  const [demoProgressSec, setDemoProgressSec] = useState(0);
  const [isAudioVoiceEnabled, setIsAudioVoiceEnabled] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);

  const currentRole = PRESENTATION_ROLES[selectedRoleIndex];

  useEffect(() => {
    const handleRatesUpdate = () => setRates(getOnboardingRates());
    window.addEventListener("gbs_rates_updated", handleRatesUpdate);
    return () => window.removeEventListener("gbs_rates_updated", handleRatesUpdate);
  }, []);

  // Auto-play / scrubbing simulation loop
  useEffect(() => {
    let interval = null;
    if (isPlayingDemo) {
      interval = setInterval(() => {
        setDemoProgressSec(prev => {
          const next = prev + 1;
          const totalSteps = currentRole.presentationScript.featureBreakdown.length;
          const stepIndex = Math.floor((next % (totalSteps * 6)) / 6);
          setActiveStepTab(stepIndex);
          return next;
        });
      }, 1000 / playbackSpeed);
    }
    return () => clearInterval(interval);
  }, [isPlayingDemo, playbackSpeed, currentRole]);

  // Web Speech API Voice Narration
  const speakNarration = (text) => {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    if (!text) return;
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = playbackSpeed;
    utterance.pitch = 1.0;
    window.speechSynthesis.speak(utterance);
  };

  useEffect(() => {
    if (isAudioVoiceEnabled) {
      const step = currentRole.presentationScript.featureBreakdown[activeStepTab];
      if (step) {
        speakNarration(step.narration);
      }
    } else {
      if ('speechSynthesis' in window) window.speechSynthesis.cancel();
    }
  }, [activeStepTab, isAudioVoiceEnabled, selectedRoleIndex]);

  const calculatedFee = liveCalcStudents * (rates[liveCalcTier] || 5);

  const handleCopyScript = () => {
    const scriptText = `
=== GBS SYSTEM PRESENTATION SCRIPT: ${currentRole.title} ===
TARGET AUDIENCE: ${currentRole.targetAudience}

[OPENING HOOK]
${currentRole.presentationScript.openingHook}

[FEATURE BREAKDOWN]
${currentRole.presentationScript.featureBreakdown
  .map((fb, idx) => `Step ${idx + 1}: ${fb.step}\nNarration: "${fb.narration}"\nAction on Screen: [${fb.actionText}]`)
  .join("\n\n")}

[CLOSING PITCH]
${currentRole.presentationScript.closingPitch}
    `.trim();

    navigator.clipboard?.writeText(scriptText);
    setCopiedScript(true);
    setTimeout(() => setCopiedScript(false), 3000);
  };

  const executeDemoAction = (actionId, resultMessage) => {
    setActionFeedbacks(prev => ({
      ...prev,
      [actionId]: {
        timestamp: new Date().toLocaleTimeString(),
        message: resultMessage,
        success: true
      }
    }));
  };

  return (
    <div className="gbs-presentation-engine-root">
      <WindowControlsBar title="GBS Video Presentation & Client Demo Showcase Engine" />

      {/* TOP HEADER */}
      <header className="gbs-pres-header">
        <div className="gbs-pres-brand">
          <span className="gbs-pres-logo-badge">GBS</span>
          <div>
            <h1>Executive Video Presentation & Client Demo Showcase</h1>
            <p className="gbs-pres-sub">
              Architected for Gabriel Osei (Lead Developer) & System Presenters • 8 Dedicated Role Presentations
            </p>
          </div>
        </div>
        <div className="gbs-pres-actions">
          <Link to="/login" className="gbs-btn-pres-outline">
            🏛️ GBS System Portal
          </Link>
          <Link to="/developer-control-center/dashboard" className="gbs-btn-pres-outline">
            ⚡ Developer Dashboard
          </Link>
          <button 
            className="gbs-btn-pres-primary"
            onClick={handleCopyScript}
          >
            {copiedScript ? "✅ Presentation Script Copied!" : "📋 Copy Verbatim Speaker Script"}
          </button>
        </div>
      </header>

      {/* ROLE SELECTION STRIP */}
      <nav className="gbs-pres-role-nav">
        {PRESENTATION_ROLES.map((role, idx) => (
          <button
            key={role.id}
            className={`gbs-pres-role-btn ${idx === selectedRoleIndex ? "active" : ""}`}
            onClick={() => {
              setSelectedRoleIndex(idx);
              setActiveStepTab(0);
            }}
          >
            <span className="gbs-pres-role-icon">{role.icon}</span>
            <div className="gbs-pres-role-btn-text">
              <span className="gbs-pres-role-badge-label">{role.roleBadge}</span>
              <span className="gbs-pres-role-title-text">{role.title.split(". ")[1]}</span>
            </div>
          </button>
        ))}
      </nav>

      {/* INTERACTIVE VIDEO WALKTHROUGH SCREEN & CONTROLS */}
      <section className="gbs-pres-video-container" style={{ maxWidth: "1440px", margin: "1.5rem auto 0", padding: "0 2rem" }}>
        <div style={{ background: "#090d16", borderRadius: "18px", border: "1.5px solid rgba(14, 165, 233, 0.35)", overflow: "hidden", boxShadow: "0 25px 60px rgba(0,0,0,0.85)" }}>
          {/* Top Video Bezel Bar */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 18px", background: "rgba(15, 23, 42, 0.95)", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <div style={{ width: "10px", height: "10px", borderRadius: "50%", background: isPlayingDemo ? "#22c55e" : "#eab308", boxShadow: isPlayingDemo ? "0 0 10px #22c55e" : "none" }}></div>
              <strong style={{ fontSize: "0.85rem", color: "#f8fafc", letterSpacing: "0.5px" }}>
                🎥 LIVE VIDEO DEMONSTRATOR: {currentRole.title}
              </strong>
              <span style={{ fontSize: "0.72rem", background: "rgba(56, 189, 248, 0.15)", color: "#38bdf8", padding: "2px 8px", borderRadius: "999px", fontWeight: 700 }}>
                1080p 60FPS AUTONOMOUS WALKTHROUGH
              </span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "12px", fontSize: "0.78rem", color: "#94a3b8" }}>
              <span>⏱️ {Math.floor(demoProgressSec / 60)}:{(demoProgressSec % 60).toString().padStart(2, '0')}</span>
              <button
                type="button"
                onClick={() => setIsAudioVoiceEnabled(!isAudioVoiceEnabled)}
                style={{ background: isAudioVoiceEnabled ? "rgba(16, 185, 129, 0.25)" : "rgba(255,255,255,0.08)", border: `1px solid ${isAudioVoiceEnabled ? "#10b981" : "#475569"}`, color: isAudioVoiceEnabled ? "#34d399" : "#cbd5e1", padding: "4px 10px", borderRadius: "6px", cursor: "pointer", fontWeight: 700, fontSize: "0.75rem" }}
              >
                {isAudioVoiceEnabled ? "🔊 Voice Narration ON" : "🔇 Voice Narration OFF"}
              </button>
            </div>
          </div>

          {/* Video Stage Display Area */}
          <div style={{ position: "relative", minHeight: "340px", background: "radial-gradient(circle at center, #0f172a 0%, #020617 100%)", padding: "1.75rem", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
            {/* Live Interactive UI Showcase Frame */}
            <div style={{ background: "rgba(30, 41, 59, 0.6)", borderRadius: "12px", border: "1px solid rgba(255,255,255,0.1)", padding: "1.25rem", position: "relative", backdropFilter: "blur(10px)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem", flexWrap: "wrap", gap: "8px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <span style={{ fontSize: "1.4rem" }}>{currentRole.icon}</span>
                  <div>
                    <h3 style={{ margin: 0, fontSize: "1.05rem", color: "#f8fafc" }}>
                      {currentRole.presentationScript.featureBreakdown[activeStepTab]?.step || "Feature Overview"}
                    </h3>
                    <span style={{ fontSize: "0.72rem", color: "#38bdf8" }}>
                      Active Role Context: {currentRole.roleBadge} • Route: {currentRole.portalRoute}
                    </span>
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <span style={{ fontSize: "0.72rem", background: "rgba(16, 185, 129, 0.2)", color: "#34d399", padding: "3px 10px", borderRadius: "999px", fontWeight: 800 }}>
                    SIMULATING LIVE USER ACTION
                  </span>
                </div>
              </div>

              {/* Action Banner with Animated Action Box */}
              <div style={{ background: "rgba(15, 23, 42, 0.85)", border: "1.5px solid rgba(56, 189, 248, 0.4)", borderRadius: "10px", padding: "12px 16px", marginBottom: "0.75rem", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "10px" }}>
                <div>
                  <div style={{ fontSize: "0.72rem", color: "#94a3b8", textTransform: "uppercase", letterSpacing: "1px", fontWeight: 700 }}>
                    Command Executing on Screen:
                  </div>
                  <div style={{ fontSize: "0.9rem", color: "#38bdf8", fontFamily: "monospace", fontWeight: 800, marginTop: "2px" }}>
                    👉 {currentRole.presentationScript.featureBreakdown[activeStepTab]?.actionText}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => executeDemoAction(`auto_step_${activeStepTab}`, `Demonstrated: ${currentRole.presentationScript.featureBreakdown[activeStepTab]?.actionText}`)}
                  style={{ background: "linear-gradient(135deg, #0284c7, #0369a1)", border: "none", color: "#fff", padding: "6px 14px", borderRadius: "8px", fontWeight: 800, fontSize: "0.78rem", cursor: "pointer", boxShadow: "0 4px 15px rgba(2, 132, 199, 0.4)" }}
                >
                  ⚡ Trigger Immediate Action
                </button>
              </div>

              {/* Live Narration Subtitle Box */}
              <div style={{ background: "rgba(0, 0, 0, 0.65)", borderRadius: "8px", padding: "10px 14px", borderLeft: "4px solid #38bdf8" }}>
                <span style={{ fontSize: "0.7rem", color: "#64748b", display: "block", marginBottom: "3px", fontWeight: 800 }}>
                  SPEAKER NARRATION SUBTITLE:
                </span>
                <p style={{ margin: 0, fontSize: "0.88rem", color: "#e2e8f0", lineHeight: 1.45, fontStyle: "italic" }}>
                  "{currentRole.presentationScript.featureBreakdown[activeStepTab]?.narration}"
                </p>
              </div>
            </div>

            {/* Video Controls Toolbar */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "1rem", flexWrap: "wrap", gap: "12px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <button
                  type="button"
                  onClick={() => setIsPlayingDemo(!isPlayingDemo)}
                  style={{ background: isPlayingDemo ? "#ef4444" : "#10b981", border: "none", color: "#fff", padding: "8px 16px", borderRadius: "8px", fontWeight: 800, fontSize: "0.82rem", cursor: "pointer", display: "flex", alignItems: "center", gap: "6px" }}
                >
                  {isPlayingDemo ? "⏸ Pause Demo" : "▶ Play Auto-Demonstration"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const totalSteps = currentRole.presentationScript.featureBreakdown.length;
                    setActiveStepTab((activeStepTab - 1 + totalSteps) % totalSteps);
                  }}
                  style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)", color: "#cbd5e1", padding: "6px 12px", borderRadius: "8px", cursor: "pointer", fontSize: "0.78rem", fontWeight: 700 }}
                >
                  ⏮ Prev Step
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const totalSteps = currentRole.presentationScript.featureBreakdown.length;
                    setActiveStepTab((activeStepTab + 1) % totalSteps);
                  }}
                  style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)", color: "#cbd5e1", padding: "6px 12px", borderRadius: "8px", cursor: "pointer", fontSize: "0.78rem", fontWeight: 700 }}
                >
                  ⏭ Next Step
                </button>
              </div>

              {/* Step Indicators */}
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                {currentRole.presentationScript.featureBreakdown.map((_, i) => (
                  <div
                    key={i}
                    onClick={() => setActiveStepTab(i)}
                    style={{
                      width: i === activeStepTab ? "24px" : "10px",
                      height: "8px",
                      borderRadius: "4px",
                      background: i === activeStepTab ? "#38bdf8" : "rgba(255,255,255,0.2)",
                      cursor: "pointer",
                      transition: "all 0.3s ease"
                    }}
                    title={`Jump to Step ${i + 1}`}
                  ></div>
                ))}
              </div>

              {/* Speed Control */}
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span style={{ fontSize: "0.75rem", color: "#94a3b8" }}>Speed:</span>
                {[1, 1.25, 1.5].map(s => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setPlaybackSpeed(s)}
                    style={{ background: playbackSpeed === s ? "rgba(56, 189, 248, 0.3)" : "transparent", border: `1px solid ${playbackSpeed === s ? "#38bdf8" : "rgba(255,255,255,0.1)"}`, color: playbackSpeed === s ? "#fff" : "#94a3b8", padding: "3px 8px", borderRadius: "4px", fontSize: "0.75rem", cursor: "pointer", fontWeight: 700 }}
                  >
                    {s}x
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* MAIN SHOWCASE ARENA */}
      <main className="gbs-pres-arena">
        {/* LEFT COLUMN: PITCH SCRIPT & NARRATION */}
        <section className="gbs-pres-script-col">
          <div className="gbs-pres-card">
            <div className="gbs-pres-role-header">
              <div className="gbs-pres-role-title-box">
                <span className="gbs-pres-role-icon-large">{currentRole.icon}</span>
                <div>
                  <span className="gbs-pres-tag" style={{ background: currentRole.badgeColor }}>
                    {currentRole.roleBadge}
                  </span>
                  <h2>{currentRole.title}</h2>
                  <p className="gbs-pres-role-desc">{currentRole.tagline}</p>
                </div>
              </div>
              <div className="gbs-pres-audience-box">
                <span className="gbs-label-small">Target Audience:</span>
                <strong>{currentRole.targetAudience}</strong>
              </div>
            </div>

            {/* KEY METRICS BAR */}
            <div className="gbs-pres-metrics-row">
              {currentRole.keyMetrics.map((km, i) => (
                <div key={i} className="gbs-pres-metric-pill">
                  <span className="gbs-km-label">{km.label}</span>
                  <span className="gbs-km-val">{km.value}</span>
                </div>
              ))}
            </div>

            {/* SPEAKER VERBATIM SCRIPT */}
            <div className="gbs-pres-script-box">
              <div className="gbs-pres-section-title">
                <span>🎙️ What the Presenter Speaks (Verbatim Script)</span>
              </div>
              <div className="gbs-pres-hook-quote">
                <strong>Opening Hook:</strong> "{currentRole.presentationScript.openingHook}"
              </div>

              {/* STEP TABS */}
              <div className="gbs-pres-step-tabs">
                {currentRole.presentationScript.featureBreakdown.map((fb, idx) => (
                  <button
                    key={idx}
                    className={`gbs-pres-step-tab-btn ${idx === activeStepTab ? "active" : ""}`}
                    onClick={() => setActiveStepTab(idx)}
                  >
                    Step {idx + 1}
                  </button>
                ))}
              </div>

              {/* ACTIVE STEP NARRATION */}
              {currentRole.presentationScript.featureBreakdown[activeStepTab] && (
                <div className="gbs-pres-step-content">
                  <h4>{currentRole.presentationScript.featureBreakdown[activeStepTab].step}</h4>
                  <p className="gbs-pres-narration">
                    "{currentRole.presentationScript.featureBreakdown[activeStepTab].narration}"
                  </p>
                  <div className="gbs-pres-action-indicator">
                    <span className="gbs-badge-live">ACTION ON SCREEN</span>
                    <code>{currentRole.presentationScript.featureBreakdown[activeStepTab].actionText}</code>
                  </div>
                </div>
              )}

              <div className="gbs-pres-closing-quote">
                <strong>Closing Pitch:</strong> "{currentRole.presentationScript.closingPitch}"
              </div>
            </div>
          </div>
        </section>

        {/* RIGHT COLUMN: INTERACTIVE DEMO SANDBOX & ACTIONS */}
        <section className="gbs-pres-sandbox-col">
          {/* QUICK PORTAL ACCESS / CREDENTIAL CARD */}
          <div className="gbs-pres-card gbs-pres-creds-card">
            <div className="gbs-pres-section-title">
              <span>🚀 Live Portal Quick Launch</span>
            </div>
            <div className="gbs-pres-creds-body">
              {currentRole.defaultCredentials ? (
                <div className="gbs-creds-display">
                  <div className="gbs-cred-item">
                    <span>Username / Email:</span>
                    <code>{currentRole.defaultCredentials.email || currentRole.defaultCredentials.masterPin}</code>
                  </div>
                  <div className="gbs-cred-item">
                    <span>Password:</span>
                    <code>{currentRole.defaultCredentials.password}</code>
                  </div>
                  <div className="gbs-cred-item">
                    <span>Authorized Role:</span>
                    <strong>{currentRole.defaultCredentials.role}</strong>
                  </div>
                </div>
              ) : (
                <div className="gbs-creds-display">
                  <div className="gbs-cred-item">
                    <span>Gateway Access:</span>
                    <code>Direct Public Access (No Login Required)</code>
                  </div>
                  <div className="gbs-cred-item">
                    <span>Destination:</span>
                    <strong>GBS Institution Onboarding Portal</strong>
                  </div>
                </div>
              )}

              <div className="gbs-pres-btn-group">
                <button
                  className="gbs-btn-pres-launch"
                  onClick={() => navigate(currentRole.portalRoute)}
                >
                  ▶ Open {currentRole.title.split(". ")[1]} in New View
                </button>
              </div>
            </div>
          </div>

          {/* INTERACTIVE ACTION SIMULATOR */}
          <div className="gbs-pres-card">
            <div className="gbs-pres-section-title">
              <span>⚡ Live Action Demonstration Checklist</span>
            </div>
            <p className="gbs-text-muted">
              Click any of the live presentation triggers below to simulate the exact action and inspect the result:
            </p>

            <div className="gbs-pres-action-list">
              {currentRole.demoActions.map(act => (
                <div key={act.id} className="gbs-pres-action-item">
                  <div className="gbs-pres-action-info">
                    <strong>{act.label}</strong>
                    <span className="gbs-text-subtle">{act.action}</span>
                  </div>
                  <button
                    className="gbs-btn-action-trigger"
                    onClick={() => executeDemoAction(act.id, act.action)}
                  >
                    ▶ Demonstrate
                  </button>
                </div>
              ))}
            </div>

            {/* ACTION EXECUTION TELEMETRY */}
            {Object.keys(actionFeedbacks).length > 0 && (
              <div className="gbs-action-log">
                <span className="gbs-log-title">Live Demonstration Event Stream:</span>
                {Object.entries(actionFeedbacks).map(([key, item]) => (
                  <div key={key} className="gbs-log-entry">
                    <span className="gbs-log-time">[{item.timestamp}]</span>
                    <span className="gbs-log-msg">✅ {item.message}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* DYNAMIC CALCULATOR DEMO (FOR CLIENT PRESENTATIONS) */}
          <div className="gbs-pres-card gbs-pres-calc-card">
            <div className="gbs-pres-section-title">
              <span>🧮 Live Multiplier Pitch Widget (Show Clients)</span>
            </div>
            <div className="gbs-pres-tier-buttons">
              {["JHS", "SHS", "UNIVERSITY"].map(t => (
                <button
                  key={t}
                  className={`gbs-tier-btn ${liveCalcTier === t ? "active" : ""}`}
                  onClick={() => setLiveCalcTier(t)}
                >
                  {t} (GH₵ {rates[t] || 5}.00)
                </button>
              ))}
            </div>
            <div className="gbs-slider-box">
              <label>Student Count: <strong>{liveCalcStudents} Students</strong></label>
              <input
                type="range"
                min="50"
                max="3000"
                step="50"
                value={liveCalcStudents}
                onChange={e => setLiveCalcStudents(parseInt(e.target.value, 10))}
              />
            </div>
            <div className="gbs-calc-output-box">
              <span>Total One-Time Onboarding Fee:</span>
              <h3>{formatCedis(calculatedFee)}</h3>
              <p className="gbs-calc-caption">
                {liveCalcStudents} students × GH₵ {(rates[liveCalcTier] || 5).toFixed(2)} per student
              </p>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
