import React, { useState, useRef, useEffect } from "react";
import WindowControlsBar from "./WindowControlsBar";

/**
 * GBS COMPLETE 10-ROLE REAL-ACTION VIDEO PRESENTATION & INTERACTIVE CINEMA HUB
 * Covers ALL 10 Institutional & Developer Roles with exact commands, tabs, clicks,
 * actions, and activities performed by each user.
 * Features both an instant 60FPS HTML5 Live Role-Action Walkthrough Cinema Canvas
 * AND the HTML5 MP4 Video Stream so the presentation video ALWAYS displays and plays
 * on 100% of desktop and mobile devices without black screens or autoplay blocks.
 */
export const REAL_ACTION_ROLE_VIDEOS = [
  {
    id: "MASTER",
    roleKey: "MASTER",
    badge: "🎬 COMPLETE ALL-10-ROLES MASTER FILM",
    title: "Complete System Walkthrough (All 10 Roles, Commands & Activities)",
    subtitle: "Headmaster • Teacher • Student • Parent • Accountant • HR • Staff • Alumni • Inventory • Developer",
    videoSrc: "/videos/gbs_complete_system_roles_master_guide.mp4",
    poster: "/assets/real_scene1_headmaster_desk.jpg",
    accent: "#f59e0b",
    route: "/login",
    durationLabel: "Full 10-Role Master Walkthrough",
    exactCommands: [
      "🏛️ Top Bar: '🎬 Presentation Video', '📖 Operating Guide', '🌐 Language Translator', '⛶ Full Display', '🚪 Sign Out'",
      "👔 Headmaster: '📹 Inbuilt CCTV & Mobile', '🎓 Admissions Intake', '🚌 Bus Transport', '💳 Fee Approvals', '🚪 Sign Out'",
      "👩‍🏫 Teacher: '➕ Set Questions & Schedule Timed Exam', 'Multi-Format Question Bank (MCQ / Theory / True-False / Short Answer / Fill-in-Blank / Case Study)', '➕ Add Timetable Entry'",
      "🎓 Student: '🚀 Begin Active Examination Now', 'Multi-Format Question Navigator (MC / TH / TF / SA / FB / CS)', '📅 Official Examination Timetable Guide'",
      "👨‍👩‍👧 Parent & 💳 Accountant: '📲 Pay School Fees via MoMo/Card', '🚌 Track Child School Bus GPS', '📊 GAAP Balance Sheet & Auto-Reconciliation'",
      "👥 HR, 🛠️ Staff, 🎖️ Alumni, 📦 Inventory & 🛡️ Developer: 'Biometric Attendance', 'QR Gate Pass', 'Transcript Request', 'Stock Requisition', 'Tenant Auto-Lock & Live Map'"
    ],
    scenes: [
      {
        step: "SCENE 1 • HEADMASTER & EXECUTIVE GOVERNANCE",
        command: "Click '📹 Inbuilt CCTV & Mobile' → '🎓 Admissions' → '💳 Fee Approvals' → '🚪 Sign Out'",
        action: "Headmaster verifies voice biometrics, inspects drop-list user registration counts, approves student admissions & teacher lesson notes, links campus CCTV to mobile, and signs out cleanly.",
        image: "/assets/real_scene1_headmaster_desk.jpg"
      },
      {
        step: "SCENE 2 • TEACHER MULTI-FORMAT QUESTION BANK & EXAM TIMETABLE",
        command: "Click '➕ Set Questions & Schedule Timed Exam' → Select MCQ / Theory / True-False Tab → Click '➕ Add Timetable Entry'",
        action: "Teacher chooses any exam format from the high-contrast Multi-Format Question Bank, adds Examination Timetable Guide entries when exam times are scheduled, grades typed theory scripts, and runs the AI OMR Scanner.",
        image: "/assets/real_scene2_teacher_scanner.jpg"
      },
      {
        step: "SCENE 3 • STUDENT ONLINE EXAM & E-LEARNING ARENA",
        command: "Click '🚀 Begin Active Examination Now' → Answer MCQ, True/False & Typed Theory → Click '✅ Submit Exam'",
        action: "Student checks the Official Examination Timetable & Revision Procedure Guide, jumps between Multiple Choice, True/False, Fill-in-Blank, and Theory Essay questions, and downloads AI-proctored transcripts.",
        image: "/assets/real_scene3_student_elearning.jpg"
      },
      {
        step: "SCENE 4 • PARENT MOBILE HUB & ACCOUNTANT TREASURY",
        command: "Parent clicks '💳 Pay Tuition (MoMo)' • Accountant clicks '🧾 Issue Invoice' & '⚖️ Run GAAP Audit'",
        action: "Parent pays school fees via Mobile Money/Bank Card and tracks the school bus live on GPS; Accountant reconciles ledger payments in real time and authorizes payroll.",
        image: "/assets/real_scene4_parent_mobile.jpg"
      },
      {
        step: "SCENE 5 • HR, STAFF, ALUMNI, INVENTORY & DEVELOPER CONTROL",
        command: "HR '📋 Biometric Roster' • Staff '🛡️ Gate QR' • Alumni '📜 Transcript' • Inventory '📦 Stock' • Dev '🛡️ Sentinel'",
        action: "HR processes staff leave & salary tiers; Staff logs facility maintenance & gate security; Alumni verifies digital degrees; Inventory tracks lab stock; Developer oversees all tenants, live GPS map, and 7-day grace billing lock.",
        image: "/assets/real_scene6_staff_gate_turnstile.jpg"
      }
    ],
    highlights: [
      "Covers all 10 system portals end-to-end with zero skipped roles, commands, or activities",
      "Shows exact button labels, tab switches, modal workflows, and real-time cross-portal synchronization",
      "Works identically in Live Production Mode and Interactive Demo Sandbox Mode across desktop & mobile"
    ]
  },
  {
    id: "ADMIN",
    roleKey: "ADMIN",
    badge: "ROLE 1 • HEADMASTER / PRINCIPAL",
    title: "Headmaster Command Center — Exact Commands, Controls & Sign Out",
    subtitle: "Voice Biometric Gate • User Registration Counts • Admissions • CCTV Mobile Link • Timetable & Lesson Approval • Sign Out",
    videoSrc: "/videos/video1_headmaster_role_guide.mp4",
    poster: "/assets/real_scene1_headmaster_desk.jpg",
    accent: "#38bdf8",
    route: "/portal/admin/dashboard",
    durationLabel: "Headmaster Role Guide",
    exactCommands: [
      "🚪 Top Header & Universal Bar: Click '🚪 Sign Out' (Red Button) to securely end session, or '📖 Operating Guide' / '🎬 Presentation Video'",
      "✏️ Branding Banner: Click '✏️ Change School Name & Upload Logo' to upload school crest and set official institution name across all portals",
      "📊 User Registration Drop-List: Inspect live counts of Teachers, Students, Parents, Accountants, HR, Staff, Alumni & Inventory officers",
      "🎓 Admissions & Bus Transport KPIs: Click 'Students Admitted ↗' or 'Students Boarding Bus ↗' to approve applicants and assign bus routes/drivers",
      "📹 Exclusive Inbuilt CCTV & Mobile: Click '📹 Inbuilt CCTV & Mobile' to view 24/7 quad-cam feeds and pair with Headmaster's smartphone",
      "📝 Academic & Fee Governance: Approve Teacher Lesson Notes, Weekly Attendance Archives, Academic Timetables, Fee Structures & Emergency Parent GPS"
    ],
    scenes: [
      {
        step: "STEP 1 • VOICE BIOMETRIC LOGIN & SCHOOL BRANDING",
        command: "Speak passphrase or click ' Verify Voice Biometrics' → Click '✏️ Change School Name & Upload Logo'",
        action: "Headmaster authenticates into /portal/admin/dashboard, confirms the exact institution name and logo crest, and reviews live KPI counters.",
        image: "/assets/real_scene1_headmaster_desk.jpg"
      },
      {
        step: "STEP 2 • ADMISSIONS, TIMETABLE & TEACHER CHECKUP DESK",
        command: "Click '📂 Admissions' → '✅ Approve Admission' → Click '📚 Lesson & Attendance Checkup'",
        action: "Headmaster approves new student admissions, inspects teacher weekly attendance registers and lesson notes, and publishes official academic calendars.",
        image: "/assets/real_scene2_teacher_scanner.jpg"
      },
      {
        step: "STEP 3 • EXCLUSIVE CCTV MOBILE LINK, BUS ROUTES & SIGN OUT",
        command: "Click '📹 Inbuilt CCTV & Mobile' → Click '🚌 Bus Transport' → Click '🚪 Sign Out'",
        action: "Headmaster monitors live campus CCTV cameras, assigns bus fares and drivers, locates parents via Emergency GPS, and clicks the red '🚪 Sign Out' button when finished.",
        image: "/assets/real_scene6_staff_gate_turnstile.jpg"
      }
    ],
    highlights: [
      "Prominent red '🚪 Sign Out' button always visible in both the Top Window Bar and Headmaster Header",
      "Real-time oversight of Admissions, Bus Boarding, Fee Approvals, Teacher Checkup, and Inbuilt CCTV",
      "Instant synchronization of School Name & Crest Logo to every dashboard and printable report"
    ]
  },
  {
    id: "TEACHER",
    roleKey: "TEACHER",
    badge: "ROLE 2 • TEACHER & ACADEMIC FACULTY",
    title: "Teacher Portal — Question Bank, Exam Timetable & Script Scanner",
    subtitle: "MCQ / Theory / True-False / Short Answer / Fill-in-Blank / Case Study • Exam Timetable Guide • Theory Grading • Script Scanner",
    videoSrc: "/videos/video2_teacher_role_guide.mp4",
    poster: "/assets/real_scene2_teacher_scanner.jpg",
    accent: "#10b981",
    route: "/portal/teacher/dashboard",
    durationLabel: "Teacher Role Guide",
    exactCommands: [
      "➕ Set Questions & Schedule Timed Exam: Click '➕ Set Questions & Schedule Timed Exam' or any format pill on Card 1",
      "📚 Multi-Format Question Bank Tabs: Click '📘 Multiple Choice (MCQ)', '✍️ Theory / Essay', '☑️ True or False', '📝 Short Answer', '🔤 Fill in Blank', or '🧪 Case Study / Practical'",
      "🎯 Configure Chosen Question Bank: Click '➕ Add [Format] Question' or '🎯 Set Entire Exam to [Format] Only', set marks/options/marking rubric, and click '📢 Schedule & Publish Exam'",
      "📅 Official Examination Timetable Guide: Click '➕ Add Timetable Entry' or '📅 Create / Edit Timetable Guide' anytime exam times are scheduled for students, or click '🔄 Sync Exam Times'",
      "✍️ Grade Submitted Student Theory Scripts: Click '👁️ Open & Grade Script' on Card 3 to mark typed essays and publish scores to Student & Parent portals",
      "🖨️ AI OMR Scanner & Weekly Attendance: Scan paper answer sheets with custom A/B/C/D keys, mark M-F roll-call attendance, archive approved registers, and submit Lesson Notes"
    ],
    scenes: [
      {
        step: "STEP 1 • SELECT FORMAT IN MULTI-FORMAT QUESTION BANK",
        command: "Click '➕ Set Questions & Schedule Timed Exam' → Click '📘 Multiple Choice', '✍️ Theory / Essay', or '☑️ True or False'",
        action: "Teacher sees high-contrast dark/colored Question Bank tabs with clear white & gold inscriptions, selects any question format (or mixed formats), and configures questions, options, or marking rubrics.",
        image: "/assets/real_scene2_teacher_scanner.jpg"
      },
      {
        step: "STEP 2 • ADD TIMETABLE ENTRY ON EXAMINATION TIMETABLE GUIDE",
        command: "Click '➕ Add Timetable Entry' or '📅 Create / Edit Timetable Guide' → Enter Date, Start/End Time, Format & Hall → Click '📢 Publish Examination Timetable to Students'",
        action: "Teacher adds examination timetable entries whenever there are exam times for students, syncs scheduled timed exams with one click, and publishes the guide to all Student Dashboards.",
        image: "/assets/real_scene3_student_elearning.jpg"
      },
      {
        step: "STEP 3 • GRADE TYPED THEORY SCRIPTS, SCAN OMR & ARCHIVE ATTENDANCE",
        command: "Click '👁️ Open & Grade Script' → Award Marks & Save → Click '🖨️ AI Exam Scanner' → Click '📋 Attendance & Lesson Notes'",
        action: "Teacher grades students' typed Theory/Essay/Short-Answer responses, scans physical OMR sheets, submits weekly attendance to the Headmaster, and archives approved registers.",
        image: "/assets/real_scene1_headmaster_desk.jpg"
      }
    ],
    highlights: [
      "All 6 Multi-Format Question Bank tabs have crisp white/gold inscriptions on dark colored backgrounds",
      "Teachers can add Examination Timetable Guide entries at any time and sync scheduled timed exams",
      "Full support for Multiple Choice, True/False, Fill-in-Blank, Short Answer, Theory Essay, and Case Study exams"
    ]
  },
  {
    id: "STUDENT",
    roleKey: "STUDENT",
    badge: "ROLE 3 • STUDENT E-LEARNING & CBT PORTAL",
    title: "Student Portal — Multi-Format Online Exams, Timetable Guide & E-Learning",
    subtitle: "Official Examination Timetable Guide • Answer MCQ, True/False, Fill-in-Blank & Theory • AI Tutor • Transcripts",
    videoSrc: "/videos/video3_student_role_guide.mp4",
    poster: "/assets/real_scene3_student_elearning.jpg",
    accent: "#8b5cf6",
    route: "/portal/student/dashboard",
    durationLabel: "Student Role Guide",
    exactCommands: [
      "📚 Official Examination Timetable & Revision Procedure Guide: View Course Code, Paper Format (MCQ / Theory / Mixed), Date, Start–End Time, Hall, Invigilator & Permitted Tools",
      "🚀 Begin Active Examination Now: Click '🚀 Begin Active Examination Now' inside the Examination & Testing Center tab",
      "🧭 Multi-Format Question Navigator: Click '📘 Multiple Choice', '✍️ Theory / Essay', '☑️ True / False', '📝 Short Answer', '🔤 Fill in Blank', or '🧪 Case Study' to jump directly to each section",
      "✍️ Answer According to Teacher's Format: Click radio options A/B/C/D for MCQ, True/False for T/F, type exact terms for Fill-in-Blank, or type full essays for Theory/Case Study",
      "✅ Submit Examination & View Results: Click '✅ Submit Final Examination' for instant objective grading and automatic delivery of Theory scripts to the Teacher Grading Desk",
      "🎥 Video Classroom, Assignments & Transcripts: Watch topic videos, submit homework files, and download official watermarked Terminal Report Cards"
    ],
    scenes: [
      {
        step: "STEP 1 • REVIEW OFFICIAL EXAMINATION TIMETABLE GUIDE",
        command: "Open '📝 Examination & Testing Center' → Review 'OFFICIAL EXAMINATION TIMETABLE & REVISION PROCEDURE GUIDE'",
        action: "Student inspects every scheduled paper, its question format badge, date, start/end time window, examination hall, invigilator, permitted tools, and syllabus scope.",
        image: "/assets/real_scene3_student_elearning.jpg"
      },
      {
        step: "STEP 2 • ANSWER MULTI-FORMAT QUESTIONS (MCQ, TRUE/FALSE, THEORY)",
        command: "Click '🚀 Begin Active Examination Now' → Use Format Navigator ('📘 Multiple Choice', '✍️ Theory / Essay', '☑️ True / False') → Click '✅ Submit'",
        action: "Student easily answers every question according to the exact format set by the teacher—clicking options for MCQ/True-False or typing structured answers for Theory, Short Answer, Fill-in-Blank, and Case Study.",
        image: "/assets/real_scene2_teacher_scanner.jpg"
      }
    ],
    highlights: [
      "Students see the exact Teacher-authored Examination Timetable Guide with paper format badges",
      "Section navigator lets students jump between MCQ, Theory, True/False, Short Answer, Fill-in-Blank & Case Study",
      "Auto-saves typed essays and grades objective questions immediately upon submission"
    ]
  },
  {
    id: "PARENT",
    roleKey: "PARENT",
    badge: "ROLE 4 • PARENT & GUARDIAN MOBILE HUB",
    title: "Parent & Guardian Portal — MoMo Tuition Payment, Live Bus GPS & Reports",
    subtitle: "Multi-Child Selector • Instant Mobile Money / Card Fee Payment • Live School Bus GPS • Teacher Voice Notes & Academic Reports",
    videoSrc: "/videos/video4_parent_role_guide.mp4",
    poster: "/assets/real_scene4_parent_mobile.jpg",
    accent: "#ec4899",
    route: "/portal/parent/dashboard",
    durationLabel: "Parent Role Guide",
    exactCommands: [
      "👶 Switch Ward / Child Selector: Select any enrolled child to inspect their real-time attendance, exam scores, and fee balance",
      "💳 Pay School Fees (MoMo / Bank Card): Click '💳 Pay Tuition / Invoice Now', select MTN MoMo, Telecel Cash, AirtelTigo, or Visa/Mastercard, and download instant receipt",
      "🚌 Live School Bus GPS Tracker: Click '🚌 Track School Bus GPS' to see the assigned bus route, driver contact, and live boarding/alighting alerts",
      "🎙️ Teacher Voice Notes & WhatsApp Alert Center: Listen to recorded voice notes from teachers or send a direct message to faculty/administration",
      "📜 Download Official Terminal Report Card: View verified subject grades, Headmaster remarks, and attendance summary"
    ],
    scenes: [
      {
        step: "STEP 1 • PAY TUITION VIA MOBILE MONEY & DOWNLOAD RECEIPT",
        command: "Click '💳 Fee Invoices & MoMo Payment' → Enter Amount & MoMo Number → Click '✅ Authorize Payment'",
        action: "Parent settles ward tuition fees from any mobile phone or computer, automatically updating the Accountant's ledger and generating a verifiable digital receipt.",
        image: "/assets/real_scene4_parent_mobile.jpg"
      },
      {
        step: "STEP 2 • TRACK SCHOOL BUS GPS & REVIEW WARD EXAM RESULTS",
        command: "Click '🚌 Bus GPS & Safety' → Click '📊 Academic Reports & Voice Notes'",
        action: "Parent monitors the child's school bus location in real time, checks daily gate check-in timestamps, and reviews published exam scores.",
        image: "/assets/real_scene5_accountant_finance.jpg"
      }
    ],
    highlights: [
      "Instant Mobile Money & Card tuition settlement with automatic receipt generation",
      "Live GPS bus tracking, gate turnstile SMS notifications, and teacher voice note playback",
      "Full mobile responsiveness across Android, iPhone, tablet, and desktop browsers"
    ]
  },
  {
    id: "ACCOUNTANT",
    roleKey: "ACCOUNTANT",
    badge: "ROLE 5 • ACCOUNTANT & BURSAR TREASURY",
    title: "Accountant Dashboard — Multi-Gateway Receipts, Reports & Payroll",
    subtitle: "Invoices • Debtors • Fee Structures • Class Matrix • Payment Gateways (Paystack/Hubtel) • Financial Reports • Payroll",
    videoSrc: "/videos/video5_accountant_role_guide.mp4",
    poster: "/assets/real_scene5_accountant_finance.jpg",
    accent: "#14b8a6",
    route: "/portal/accountant/dashboard",
    durationLabel: "Accountant Role Guide",
    exactCommands: [
      "🧾 Create & Dispatch Term Invoices: Click 'Invoices' -> 'Generate Term Fee Invoice' to bill classes or students from the database",
      "🌐 Multi-Gateway Verification & Reconciliation: Open 'Payment Gateways' tab, inspect Paystack/Hubtel/Bank settlements, click 'Verify with Provider' or 'Sync Pending Transactions'",
      "📊 Daily, Weekly, Monthly & Termly Reports: Open 'Statements & Audits' tab to view real-time period collections, unpaid balances, failed/cancelled attempts, and refunds",
      "📢 Defaulter Arrears Reminder: Open 'Debtors' tab and send overdue reminders to parents/guardians",
      "💵 Procurement & Alumni Gifts: Track Headmaster procurement approvals and Alumni endowment disbursements in one linked ledger"
    ],
    scenes: [
      {
        step: "STEP 1 • VERIFY GATEWAY TRANSACTIONS & RECONCILE PENDING RECORDS",
        command: "Click 'Payment Gateways' → Enter Reference (GBS-FEE-...) → Click 'Verify with Provider' or 'Sync Pending Transactions'",
        action: "Accountant verifies incoming MTN MoMo, Telecel Cash, AT Money, Visa, Mastercard, and Bank Direct transactions server-to-server, confirms bank slips, or processes refunds cleanly.",
        image: "/assets/real_scene5_accountant_finance.jpg"
      },
      {
        step: "STEP 2 • REVIEW DAILY/MONTHLY/TERMLY REPORTS & AUDIT YEAR-END LEDGER",
        command: "Click 'Statements & Audits' → Switch 'DAILY / WEEKLY / MONTHLY / TERMLY' → Click 'Run Full GAAP / IFRS Audit'",
        action: "Accountant reviews live database collection totals per gateway and outstanding student balances, and closes/archives completed financial years.",
        image: "/assets/real_scene1_headmaster_desk.jpg"
      }
    ],
    highlights: [
      "Zero-discrepancy daily cash and Mobile Money reconciliation engine",
      "Automated synchronization with HR salary tiers and Headmaster fee approvals",
      "One-click export of audit-ready Trial Balance, Income Statement, and Balance Sheet"
    ]
  },
  {
    id: "HR",
    roleKey: "HR",
    badge: "ROLE 6 • HUMAN RESOURCES (HR) & PERSONNEL",
    title: "HR Management Portal — Staff Recruitment, Biometric Clock-In & Salary Tiers",
    subtitle: "Staff Directory • Biometric Attendance • Leave Approvals • Salary Grouping • Performance Appraisals",
    videoSrc: "/videos/video6_staff_hr_role_guide.mp4",
    poster: "/assets/real_scene6_staff_gate_turnstile.jpg",
    accent: "#f97316",
    route: "/portal/hr/dashboard",
    durationLabel: "HR Role Guide",
    exactCommands: [
      "👥 Onboard & Manage Staff Directory: Click '➕ Register New Staff / Faculty' to issue staff IDs, roles, and department assignments",
      "⏱️ Biometric Attendance & Punctuality Audit: Click '⏱️ Biometric Clock-In Log' to inspect daily staff arrival/departure times",
      "🏖️ Leave Request Adjudication: Click '✅ Approve Leave' or '❌ Decline Leave' on pending medical, casual, or maternity leave applications",
      "💰 Salary Grouping & Grade Tiers: Click '💰 Configure Salary Structure' to set base pay and allowances synced to the Accountant Payroll",
      "📈 Staff Appraisal & Welfare: Record termly KPI evaluations and issue official HR letters"
    ],
    scenes: [
      {
        step: "STEP 1 • STAFF ONBOARDING & BIOMETRIC ATTENDANCE AUDIT",
        command: "Click '👥 Staff Directory' → '➕ Add Staff' → Click '⏱️ Biometric Attendance'",
        action: "HR Officer registers teaching and non-teaching personnel, assigns departments, and audits daily biometric turnstile clock-in logs.",
        image: "/assets/real_scene6_staff_gate_turnstile.jpg"
      },
      {
        step: "STEP 2 • LEAVE APPROVALS & SALARY TIER CONFIGURATION",
        command: "Click '🏖️ Leave Desk' → '✅ Approve' → Click '💰 Salary Grouping'",
        action: "HR Officer approves staff leave requests, updates salary grade structures, and syncs approved payroll rosters to the Accountant Treasury.",
        image: "/assets/real_scene5_accountant_finance.jpg"
      }
    ],
    highlights: [
      "Complete personnel lifecycle from recruitment and biometric attendance to appraisal",
      "Direct leave approval workflow and automated payroll tier sync with the Accountant Portal",
      "Dedicated coral-amber blended dashboard theme with clear tab navigation"
    ]
  },
  {
    id: "STAFF",
    roleKey: "STAFF",
    badge: "ROLE 7 • NON-TEACHING & OPERATIONS STAFF",
    title: "Staff Operations Portal — Gate QR Security, Transport Fleet & Facility Logs",
    subtitle: "Campus Gate QR Turnstile • Bus Fleet Dispatch • Sickbay & Hostel Logs • Facility Maintenance Tickets",
    videoSrc: "/videos/video6_staff_hr_role_guide.mp4",
    poster: "/assets/real_scene6_staff_gate_turnstile.jpg",
    accent: "#06b6d4",
    route: "/portal/staff/dashboard",
    durationLabel: "Staff Role Guide",
    exactCommands: [
      "🛡️ Gate QR & Visitor Turnstile Check-In: Click '🛡️ Scan Gate QR Pass' to verify student/staff IDs and log campus visitors",
      "🚌 Transport Fleet & Route Dispatch: Click '🚌 Log Bus Departure / Arrival' to update live school bus status for Parents and Headmaster",
      "🛠️ Facility Maintenance & Repair Tickets: Click '➕ Log Maintenance Ticket' to report electrical, plumbing, or classroom repairs",
      "🏥 Sickbay, Hostel & Duty Roster: Record student clinic visits, hostel roll-calls, and daily operational shift handovers"
    ],
    scenes: [
      {
        step: "STEP 1 • CAMPUS GATE QR SCANNING & VISITOR SECURITY",
        command: "Click '🛡️ Gate Security & QR Scanner' → Scan Student/Visitor Pass → Log Entry",
        action: "Security and operations staff verify digital ID badges at the turnstile, triggering instant parent attendance notifications.",
        image: "/assets/real_scene6_staff_gate_turnstile.jpg"
      },
      {
        step: "STEP 2 • FACILITY MAINTENANCE TICKETS & FLEET DISPATCH",
        command: "Click '🛠️ Facility Tickets' → '➕ Submit Repair Log' → Click '🚌 Bus Dispatch'",
        action: "Operations staff log campus maintenance work orders and update daily school bus dispatch telemetry.",
        image: "/assets/real_scene1_headmaster_desk.jpg"
      }
    ],
    highlights: [
      "Real-time campus gate security QR verification and visitor badge logging",
      "Integrated transport dispatch, sickbay logbook, and facility maintenance tracker",
      "Instant escalation of urgent campus safety alerts to the Headmaster Command Center"
    ]
  },
  {
    id: "ALUMNI",
    roleKey: "ALUMNI",
    badge: "ROLE 8 • ALUMNI & CONVOCATION NETWORK",
    title: "Alumni Portal — Official Transcripts, Degree Verification & Endowment Pledges",
    subtitle: "Digital Transcript Requests • Employer Certificate Verification • Endowment Donations • Mentorship & Job Board",
    videoSrc: "/videos/gbs_complete_system_roles_master_guide.mp4",
    poster: "/assets/real_scene3_student_elearning.jpg",
    accent: "#eab308",
    route: "/portal/alumni/dashboard",
    durationLabel: "Alumni Role Guide",
    exactCommands: [
      "📜 Request Official Academic Transcript: Click '📜 Request Official Transcript / Attestation' and track processing status",
      "🔍 Instant Certificate & Degree Verification: Click '🔍 Verify Graduate Credential' using the cryptographic Alumni Verification Code",
      "🤝 Endowment Fund & Project Pledge: Click '💝 Contribute to Alma Mater Endowment' via Mobile Money or Card",
      "💼 Career Mentorship & Convocation Directory: Post internship/job openings and connect with graduating cohorts"
    ],
    scenes: [
      {
        step: "STEP 1 • OFFICIAL TRANSCRIPT REQUEST & CREDENTIAL VERIFICATION",
        command: "Click '📜 Transcripts & Certificates' → '➕ Request Transcript' → Download Verified PDF",
        action: "Alumni graduate requests an official watermarked academic transcript or shares a cryptographic verification code with employers and universities.",
        image: "/assets/real_scene3_student_elearning.jpg"
      },
      {
        step: "STEP 2 • ALMA MATER ENDOWMENT PLEDGES & MENTORSHIP",
        command: "Click '💝 Endowment & Donations' → '🤝 Career Mentorship Board'",
        action: "Alumni contribute to school infrastructure projects and mentor current students.",
        image: "/assets/real_scene1_headmaster_desk.jpg"
      }
    ],
    highlights: [
      "Tamper-proof QR and cryptographic graduate credential verification",
      "Online academic transcript ordering and endowment project contribution tracking",
      "Dedicated royal gold-violet blended dashboard aesthetic"
    ]
  },
  {
    id: "INVENTORY",
    roleKey: "INVENTORY",
    badge: "ROLE 9 • INVENTORY, STORES & PROCUREMENT",
    title: "Inventory Portal — Stock Ledger, Low-Stock Alerts & Department Requisitions",
    subtitle: "Real-Time Stock Quantities • FEFO Batch & Expiry Tracking • Department Requisition Approval • Supplier Purchase Orders",
    videoSrc: "/videos/video6_staff_hr_role_guide.mp4",
    poster: "/assets/real_scene5_accountant_finance.jpg",
    accent: "#84cc16",
    route: "/portal/inventory/dashboard",
    durationLabel: "Inventory Role Guide",
    exactCommands: [
      "📦 Add & Audit Campus Stock Items: Click '➕ Register New Stock Item' to record textbooks, lab chemicals, uniforms, ICT gear, or stationery",
      "⚠️ Low-Stock & Expiry Quarantine Alerts: Inspect items flagged below reorder threshold and quarantine damaged/expired batches",
      "📋 Approve Departmental Requisitions: Click '✅ Issue Stock' on requisition requests from Science Labs, Kitchen, Admin, or Faculty",
      "🚚 Supplier Purchase Orders & Goods Received (GRN): Click '➕ Create Purchase Order' and verify supplier deliveries"
    ],
    scenes: [
      {
        step: "STEP 1 • STOCK LEDGER AUDIT & LOW-STOCK REORDER ALERTS",
        command: "Click '📦 Stock Inventory Ledger' → '➕ Add Stock Item' → Check '⚠️ Low Stock Alerts'",
        action: "Inventory Officer tracks real-time quantities across textbooks, laboratory equipment, ICT assets, and infirmary supplies.",
        image: "/assets/real_scene5_accountant_finance.jpg"
      },
      {
        step: "STEP 2 • DEPARTMENT REQUISITION ISSUANCE & SUPPLIER GRN",
        command: "Click '📋 Department Requisitions' → '✅ Approve & Issue' → Click '🚚 Suppliers & POs'",
        action: "Inventory Officer fulfills faculty resource requests and logs supplier Goods Received Notes synced with the Accountant.",
        image: "/assets/real_scene6_staff_gate_turnstile.jpg"
      }
    ],
    highlights: [
      "Real-time stock deduction, low-stock threshold alerts, and batch quarantine controls",
      "End-to-end departmental requisition approval and supplier purchase order workflow",
      "Synchronized asset valuation with Headmaster and Accountant portals"
    ]
  },
  {
    id: "DEVELOPER",
    roleKey: "DEVELOPER",
    badge: "ROLE 10 • PLATFORM DEVELOPER CONTROL CENTER",
    title: "Developer Console — School Approvals, Subscriptions, Gateways & Security",
    subtitle: "School Signups • Headmaster Photo Checks • Security Alerts • Subscriptions & Auto-Lock • Payment Gateways • Backups • Maps",
    videoSrc: "/videos/video7_developer_role_guide.mp4",
    poster: "/assets/real_scene1_headmaster_desk.jpg",
    accent: "#38bdf8",
    route: "/developer",
    durationLabel: "Developer Role Guide",
    exactCommands: [
      "🏫 School Signups & Photo Checks: Open 'School Signups & Approvals' -> Inspect registration, verify Headmaster photo & OTP, click 'Approve Institution'",
      "💳 Payment Gateways & Subscriptions: Open 'Payment Gateways' tab to configure Paystack/Hubtel subaccounts, TEST vs LIVE mode, retry webhooks, and verify 0554594193 platform renewals",
      "📊 Server Health & Auto-Lock Controls: Open 'Server Health & Subscriptions' -> Monitor 14-day notices, 7-day grace countdowns, Lock/Unlock tenants, or run 'Auto-Lock Delinquent Tenants'",
      "🛡️ Security, Backups & Activity Log: Inspect 'Login & Security Alerts', download 'Database Backups', check 'School Locations' GPS map, and review full 'Activity History'",
      "⚡ System Navigation & Multi-DB: Switch cleanly between all 16 Developer tabs with plain-English controls, Demo/Live mode toggle, and WebRTC Headmaster calls"
    ],
    scenes: [
      {
        step: "STEP 1 • APPROVE ONBOARDED SCHOOLS & MANAGE SUBSCRIPTIONS",
        command: "Login '/developer-control-center/login' → Click 'School Signups & Approvals' → Approve School → Check 'Server Health & Subscriptions' (MoMo 0554594193)",
        action: "Developer reviews newly registered schools, activates school portals with exact branding, checks GH₵ 3/5/10 per-student subscription countdowns, and locks/restores access safely.",
        image: "/assets/real_scene1_headmaster_desk.jpg"
      },
      {
        step: "STEP 2 • CONFIGURE PAYMENT GATEWAYS, WEBHOOKS & MONITOR INFRASTRUCTURE",
        command: "Click 'Payment Gateways' → Configure Paystack/Hubtel Subaccounts → Click 'Sync Pending Transactions' / 'Retry Failed Webhooks' → Inspect 'Database Backups' & 'Login Alerts'",
        action: "Developer configures multi-school gateway routing (with server-masked keys), reconciles missing webhooks, checks intrusion alerts, and opens school GPS locations.",
        image: "/assets/real_scene2_teacher_scanner.jpg"
      }
    ],
    highlights: [
      "Complete 16-tab Developer Console written in clear everyday English",
      "Central Payment Gateways & Webhook Monitor with school subaccount routing and masked secrets",
      "School signup approval, GH₵ 3/5/10 billing, auto-lock restoration, encrypted backups, and GPS map"
    ]
  }
];

export default function CartoonRoleVideoHubModal({ isOpen, onClose, initialRole = "MASTER", initialVideoId = null }) {
  const effectiveInitialRole = initialVideoId || initialRole || "MASTER";
  const resolveInitialId = (roleInput) => {
    const clean = String(roleInput || "MASTER").toUpperCase().trim();
    if (REAL_ACTION_ROLE_VIDEOS.some((v) => v.id === clean)) return clean;
    if (clean.includes("HEADMASTER") || clean.includes("PRINCIPAL") || clean.includes("ADMIN")) return "ADMIN";
    if (clean.includes("TEACH") || clean.includes("FACULTY")) return "TEACHER";
    if (clean.includes("STUD") || clean.includes("PUPIL")) return "STUDENT";
    if (clean.includes("PAREN") || clean.includes("GUARD")) return "PARENT";
    if (clean.includes("ACCOUNT") || clean.includes("BURSAR") || clean.includes("FINANC")) return "ACCOUNTANT";
    if (clean.includes("HR") || clean.includes("HUMAN")) return "HR";
    if (clean.includes("ALUMN") || clean.includes("GRAD")) return "ALUMNI";
    if (clean.includes("INVENT") || clean.includes("STORE") || clean.includes("PROCURE")) return "INVENTORY";
    if (clean.includes("DEV") || clean.includes("FOUNDER") || clean.includes("ENGINEER")) return "DEVELOPER";
    if (clean.includes("STAFF") || clean.includes("SECURITY") || clean.includes("OPERAT")) return "STAFF";
    return "MASTER";
  };

  const [selectedId, setSelectedId] = useState(() => resolveInitialId(effectiveInitialRole));
  const [activeSceneIdx, setActiveSceneIdx] = useState(0);
  const [isPlayingCinema, setIsPlayingCinema] = useState(true);
  const [cinemaProgress, setCinemaProgress] = useState(0);
  const [playerViewMode, setPlayerViewMode] = useState("DUAL"); // "DUAL" | "CINEMA" | "MP4"
  const [mp4Muted, setMp4Muted] = useState(true);
  const [isNarrating, setIsNarrating] = useState(false);

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const loadedImagesRef = useRef({});

  useEffect(() => {
    if (effectiveInitialRole) {
      setSelectedId(resolveInitialId(effectiveInitialRole));
      setActiveSceneIdx(0);
      setCinemaProgress(0);
    }
  }, [effectiveInitialRole]);

  const activeVideo = REAL_ACTION_ROLE_VIDEOS.find((v) => v.id === selectedId) || REAL_ACTION_ROLE_VIDEOS[0];
  const scenes = activeVideo.scenes || [];
  const currentScene = scenes[activeSceneIdx] || scenes[0];

  // Preload scene images for the 60FPS HTML5 Live Action Walkthrough Canvas
  useEffect(() => {
    REAL_ACTION_ROLE_VIDEOS.forEach((v) => {
      (v.scenes || []).forEach((sc) => {
        if (sc.image && !loadedImagesRef.current[sc.image]) {
          const img = new Image();
          img.src = sc.image;
          loadedImagesRef.current[sc.image] = img;
        }
      });
    });
  }, []);

  // Auto-advance scenes in Live Action Cinema
  useEffect(() => {
    if (!isOpen || !isPlayingCinema) return undefined;
    const interval = setInterval(() => {
      setCinemaProgress((prev) => {
        if (prev >= 100) {
          setActiveSceneIdx((sIdx) => (sIdx + 1) % Math.max(1, scenes.length));
          return 0;
        }
        return prev + 1.25;
      });
    }, 100);
    return () => clearInterval(interval);
  }, [isOpen, isPlayingCinema, scenes.length, selectedId]);

  // Render 60FPS HTML5 Live Role-Action Walkthrough Cinema Canvas
  useEffect(() => {
    if (!isOpen) return undefined;
    let animId;
    let tick = 0;

    const renderCanvas = () => {
      tick += 1;
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext("2d");
        const W = canvas.width;
        const H = canvas.height;

        // Background gradient
        const grad = ctx.createLinearGradient(0, 0, W, H);
        grad.addColorStop(0, "#020617");
        grad.addColorStop(0.5, "#0f172a");
        grad.addColorStop(1, "#1e1b4b");
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, W, H);

        // Draw subtle Ken-Burns zoomed real campus scene image if loaded
        const imgObj = currentScene?.image ? loadedImagesRef.current[currentScene.image] : null;
        if (imgObj && imgObj.complete && imgObj.naturalWidth > 0) {
          ctx.save();
          const zoom = 1.03 + Math.sin(tick * 0.015) * 0.025;
          const drawW = W * zoom;
          const drawH = H * zoom;
          const offsetX = (W - drawW) / 2;
          const offsetY = (H - drawH) / 2;
          ctx.globalAlpha = 0.42;
          ctx.drawImage(imgObj, offsetX, offsetY, drawW, drawH);
          ctx.restore();
        }

        // Dark cinema vignette overlay for high-contrast text legibility
        const overlay = ctx.createLinearGradient(0, 0, 0, H);
        overlay.addColorStop(0, "rgba(2, 6, 23, 0.86)");
        overlay.addColorStop(0.45, "rgba(2, 6, 23, 0.68)");
        overlay.addColorStop(1, "rgba(2, 6, 23, 0.95)");
        ctx.fillStyle = overlay;
        ctx.fillRect(0, 0, W, H);

        // Top Role Badge Banner
        ctx.fillStyle = activeVideo.accent || "#f59e0b";
        ctx.fillRect(24, 20, 10, 44);

        ctx.font = "900 13px system-ui, -apple-system, sans-serif";
        ctx.fillStyle = "#fde68a";
        ctx.fillText(`${activeVideo.badge} • LIVE ROLE ACTION WALKTHROUGH`, 44, 36);

        ctx.font = "800 19px system-ui, -apple-system, sans-serif";
        ctx.fillStyle = "#ffffff";
        ctx.fillText(activeVideo.title.slice(0, 68), 44, 58);

        // Scene Step Pill
        ctx.fillStyle = "rgba(15, 23, 42, 0.9)";
        ctx.strokeStyle = activeVideo.accent || "#38bdf8";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.roundRect(24, 78, W - 48, 92, 12);
        ctx.fill();
        ctx.stroke();

        ctx.font = "800 13px system-ui, -apple-system, sans-serif";
        ctx.fillStyle = "#38bdf8";
        ctx.fillText(currentScene?.step || "STEP 1", 40, 102);

        ctx.font = "800 15px monospace";
        ctx.fillStyle = "#34d399";
        const cmdText = `⚡ COMMAND: ${currentScene?.command || ""}`;
        ctx.fillText(cmdText.slice(0, 82), 40, 126);
        if (cmdText.length > 82) {
          ctx.fillText(cmdText.slice(82, 164), 40, 146);
        }

        // Action description box
        ctx.fillStyle = "rgba(2, 6, 23, 0.85)";
        ctx.strokeStyle = "rgba(251, 191, 36, 0.45)";
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.roundRect(24, 182, W - 48, 128, 12);
        ctx.fill();
        ctx.stroke();

        ctx.font = "700 14px system-ui, -apple-system, sans-serif";
        ctx.fillStyle = "#f8fafc";
        const words = String(currentScene?.action || "").split(" ");
        let line = "";
        let yPos = 208;
        for (let i = 0; i < words.length; i += 1) {
          const testLine = `${line}${words[i]} `;
          if (ctx.measureText(testLine).width > W - 84 && line !== "") {
            ctx.fillText(line, 40, yPos);
            line = `${words[i]} `;
            yPos += 22;
          } else {
            line = testLine;
          }
        }
        if (line) ctx.fillText(line, 40, yPos);

        // Live Exact Commands Checklist Strip
        const cmds = activeVideo.exactCommands || [];
        const visibleCmd = cmds[activeSceneIdx % Math.max(1, cmds.length)] || cmds[0] || "";
        ctx.fillStyle = "rgba(16, 185, 129, 0.16)";
        ctx.strokeStyle = "#10b981";
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.roundRect(24, 322, W - 48, 42, 8);
        ctx.fill();
        ctx.stroke();

        ctx.font = "800 13px system-ui, -apple-system, sans-serif";
        ctx.fillStyle = "#a7f3d0";
        ctx.fillText(`✓ ACTIVE DASHBOARD FUNCTION: ${visibleCmd.slice(0, 86)}`, 38, 348);

        // Animated Live Pointer Cursor simulating user action
        const cursorX = 120 + ((tick * 3) % Math.max(120, W - 260));
        const cursorY = 120 + Math.sin(tick * 0.06) * 28;
        ctx.save();
        ctx.beginPath();
        ctx.arc(cursorX, cursorY, 12 + Math.sin(tick * 0.15) * 3, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(251, 191, 36, 0.28)";
        ctx.fill();
        ctx.beginPath();
        ctx.arc(cursorX, cursorY, 5, 0, Math.PI * 2);
        ctx.fillStyle = "#fbbf24";
        ctx.fill();
        ctx.restore();

        // Bottom Progress Bar
        ctx.fillStyle = "rgba(51, 65, 85, 0.7)";
        ctx.fillRect(24, H - 18, W - 48, 6);
        ctx.fillStyle = activeVideo.accent || "#f59e0b";
        ctx.fillRect(24, H - 18, ((W - 48) * cinemaProgress) / 100, 6);
      }
      animId = requestAnimationFrame(renderCanvas);
    };

    animId = requestAnimationFrame(renderCanvas);
    return () => cancelAnimationFrame(animId);
  }, [isOpen, activeVideo, currentScene, activeSceneIdx, cinemaProgress]);

  // Reload HTML5 MP4 video cleanly whenever role changes
  useEffect(() => {
    if (videoRef.current && isOpen) {
      try {
        videoRef.current.load();
        const playPromise = videoRef.current.play();
        if (playPromise && typeof playPromise.catch === "function") {
          playPromise.catch(() => {});
        }
      } catch { }
    }
  }, [selectedId, isOpen]);

  const handleNarrateActiveRole = () => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    if (isNarrating) {
      window.speechSynthesis.cancel();
      setIsNarrating(false);
      return;
    }
    window.speechSynthesis.cancel();
    const scriptText = `${activeVideo.title}. ${ (activeVideo.scenes || []).map((s) => `${s.step}. Command: ${s.command}. ${s.action}`).join(" ") }`;
    const utter = new SpeechSynthesisUtterance(scriptText);
    utter.rate = 0.98;
    utter.onend = () => setIsNarrating(false);
    utter.onerror = () => setIsNarrating(false);
    setIsNarrating(true);
    window.speechSynthesis.speak(utter);
  };

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 999999,
        background: "rgba(2, 6, 23, 0.92)",
        backdropFilter: "blur(14px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "16px",
        overflowY: "auto"
      }}
      onClick={onClose}
    >
      <div
        id="gbs-cartoon-video-hub-modal"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%",
          maxWidth: "1280px",
          maxHeight: "94vh",
          overflowY: "auto",
          background: "linear-gradient(145deg, #090d16 0%, #0f172a 55%, #172036 100%)",
          border: `2px solid ${activeVideo.accent}`,
          borderRadius: "20px",
          boxShadow: "0 25px 80px rgba(0, 0, 0, 0.85)",
          color: "#f8fafc",
          padding: "20px"
        }}
      >
        {/* Universal Navigation, Scroll & Expand Controls */}
        <WindowControlsBar
          isModal={true}
          modalTargetId="gbs-cartoon-video-hub-modal"
          onBack={onClose}
          customBackLabel="← Close Video Theatre"
          title="Complete 10-Role Video Presentation & Action Guide"
        />

        {/* Header */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            gap: "14px",
            flexWrap: "wrap",
            borderBottom: "1px solid rgba(148, 163, 184, 0.22)",
            paddingBottom: "14px",
            marginBottom: "16px"
          }}
        >
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
              <span
                style={{
                  background: "linear-gradient(90deg, #f59e0b, #d97706)",
                  color: "#020617",
                  fontWeight: 900,
                  fontSize: "0.72rem",
                  padding: "4px 10px",
                  borderRadius: "999px",
                  letterSpacing: "0.06em"
                }}
              >
                🎥 OFFICIAL 10-ROLE VIDEO PRESENTATION &amp; EXACT COMMANDS GUIDE
              </span>
              <span style={{ color: "#34d399", fontSize: "0.76rem", fontWeight: 800 }}>
                ● All 10 Roles • Exact Commands, Tabs, Actions &amp; Activities
              </span>
            </div>
            <h2 style={{ margin: "6px 0 3px", fontSize: "1.35rem", fontWeight: 900, color: "#ffffff" }}>
              🏛️ GBS SYSTEM — COMPLETE ROLE VIDEO PRESENTATION THEATRE
            </h2>
            <p style={{ margin: 0, fontSize: "0.82rem", color: "#cbd5e1" }}>
              Select any user role on the left to watch its live step-by-step commands, dashboard tabs, buttons, and real-time workflows.
            </p>
          </div>

          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
            <button
              type="button"
              onClick={handleNarrateActiveRole}
              style={{
                background: isNarrating ? "linear-gradient(135deg, #ef4444, #b91c1c)" : "linear-gradient(135deg, #059669, #047857)",
                border: "1.5px solid #34d399",
                color: "#ffffff",
                borderRadius: "10px",
                padding: "8px 14px",
                fontWeight: 800,
                fontSize: "0.78rem",
                cursor: "pointer"
              }}
            >
              {isNarrating ? "⏹ Stop Voice Narration" : "🔊 Narrate Role Commands Aloud"}
            </button>
            <button
              type="button"
              onClick={onClose}
              style={{
                background: "rgba(239, 68, 68, 0.2)",
                border: "1.5px solid #ef4444",
                color: "#fca5a5",
                borderRadius: "10px",
                padding: "8px 14px",
                fontWeight: 800,
                fontSize: "0.8rem",
                cursor: "pointer"
              }}
            >
              ✕ Close Theatre
            </button>
          </div>
        </div>

        {/* Main Layout: Left 10-Role Playlist + Right Video & Exact Commands Stage */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(310px, 1fr))",
            gap: "18px",
            alignItems: "start"
          }}
        >
          {/* Left Column: All 10 Roles + Master Film Selector */}
          <div style={{ display: "flex", flexDirection: "column", gap: "8px", maxHeight: "74vh", overflowY: "auto", paddingRight: "4px" }}>
            <div style={{ fontSize: "0.75rem", fontWeight: 900, color: "#fde68a", textTransform: "uppercase", letterSpacing: "0.06em" }}>
              📋 Select Role Presentation (All 10 System Roles Included):
            </div>
            {REAL_ACTION_ROLE_VIDEOS.map((item) => {
              const isSelected = item.id === selectedId;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    setSelectedId(item.id);
                    setActiveSceneIdx(0);
                    setCinemaProgress(0);
                  }}
                  style={{
                    textAlign: "left",
                    background: isSelected
                      ? "linear-gradient(135deg, rgba(30, 41, 59, 0.98), rgba(15, 23, 42, 0.98))"
                      : "rgba(15, 23, 42, 0.7)",
                    border: isSelected ? `2px solid ${item.accent}` : "1px solid rgba(148, 163, 184, 0.22)",
                    borderRadius: "12px",
                    padding: "10px 12px",
                    cursor: "pointer",
                    color: "#f8fafc",
                    display: "flex",
                    gap: "10px",
                    alignItems: "center",
                    boxShadow: isSelected ? `0 6px 20px ${item.accent}33` : "none"
                  }}
                >
                  <img
                    src={item.poster}
                    alt={item.title}
                    style={{
                      width: "64px",
                      height: "46px",
                      objectFit: "cover",
                      borderRadius: "8px",
                      border: `1.5px solid ${item.accent}`,
                      flexShrink: 0
                    }}
                  />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: "0.67rem", fontWeight: 900, color: item.accent, letterSpacing: "0.04em" }}>
                      {item.badge}
                    </div>
                    <div style={{ fontSize: "0.82rem", fontWeight: 800, color: "#ffffff", margin: "2px 0", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {item.title}
                    </div>
                    <div style={{ fontSize: "0.7rem", color: "#94a3b8", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      Route: {item.route}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Right Column: Live Role Action Cinema + MP4 Stream + Exact Commands Checklist */}
          <div style={{ gridColumn: "span 2", display: "flex", flexDirection: "column", gap: "12px" }}>
            {/* Mode Switcher Bar */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "8px", background: "rgba(2, 6, 23, 0.8)", padding: "8px 12px", borderRadius: "10px", border: "1px solid rgba(148, 163, 184, 0.25)" }}>
              <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                <button
                  type="button"
                  onClick={() => setPlayerViewMode("DUAL")}
                  style={{
                    background: playerViewMode === "DUAL" ? "linear-gradient(135deg, #0284c7, #0369a1)" : "#1e293b",
                    color: "#ffffff",
                    border: playerViewMode === "DUAL" ? "1.5px solid #fbbf24" : "1px solid #475569",
                    padding: "5px 11px",
                    borderRadius: "6px",
                    fontSize: "0.74rem",
                    fontWeight: 800,
                    cursor: "pointer"
                  }}
                >
                  🎬 Dual View (Live Action Walkthrough + MP4 Video)
                </button>
                <button
                  type="button"
                  onClick={() => setPlayerViewMode("CINEMA")}
                  style={{
                    background: playerViewMode === "CINEMA" ? "linear-gradient(135deg, #059669, #047857)" : "#1e293b",
                    color: "#ffffff",
                    border: playerViewMode === "CINEMA" ? "1.5px solid #fbbf24" : "1px solid #475569",
                    padding: "5px 11px",
                    borderRadius: "6px",
                    fontSize: "0.74rem",
                    fontWeight: 800,
                    cursor: "pointer"
                  }}
                >
                  ⚡ Interactive Command Cinema
                </button>
                <button
                  type="button"
                  onClick={() => setPlayerViewMode("MP4")}
                  style={{
                    background: playerViewMode === "MP4" ? "linear-gradient(135deg, #7c3aed, #6d28d9)" : "#1e293b",
                    color: "#ffffff",
                    border: playerViewMode === "MP4" ? "1.5px solid #fbbf24" : "1px solid #475569",
                    padding: "5px 11px",
                    borderRadius: "6px",
                    fontSize: "0.74rem",
                    fontWeight: 800,
                    cursor: "pointer"
                  }}
                >
                  📹 Full MP4 Video Player
                </button>
              </div>

              <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                <button
                  type="button"
                  onClick={() => setIsPlayingCinema((p) => !p)}
                  style={{
                    background: isPlayingCinema ? "rgba(245, 158, 11, 0.22)" : "rgba(16, 185, 129, 0.22)",
                    border: `1px solid ${isPlayingCinema ? "#f59e0b" : "#10b981"}`,
                    color: "#ffffff",
                    padding: "5px 10px",
                    borderRadius: "6px",
                    fontSize: "0.73rem",
                    fontWeight: 800,
                    cursor: "pointer"
                  }}
                >
                  {isPlayingCinema ? "⏸ Pause Scene Auto-Advance" : "▶ Play Scene Auto-Advance"}
                </button>
              </div>
            </div>

            {/* LIVE INTERACTIVE ROLE-ACTION CINEMA CANVAS (Always renders immediately in 0ms) */}
            {(playerViewMode === "DUAL" || playerViewMode === "CINEMA") && (
              <div
                style={{
                  background: "#020617",
                  borderRadius: "14px",
                  overflow: "hidden",
                  border: `2px solid ${activeVideo.accent}`,
                  boxShadow: "0 12px 32px rgba(0, 0, 0, 0.65)"
                }}
              >
                <canvas
                  ref={canvasRef}
                  width={820}
                  height={385}
                  style={{ width: "100%", height: "auto", display: "block" }}
                />
                {/* Interactive Scene Step Selector Bar */}
                <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", padding: "10px 12px", background: "rgba(15, 23, 42, 0.95)", borderTop: "1px solid rgba(148, 163, 184, 0.2)" }}>
                  {scenes.map((sc, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        setActiveSceneIdx(idx);
                        setCinemaProgress(0);
                      }}
                      style={{
                        flex: 1,
                        minWidth: "160px",
                        textAlign: "left",
                        background: idx === activeSceneIdx ? "rgba(56, 189, 248, 0.22)" : "rgba(2, 6, 23, 0.7)",
                        border: idx === activeSceneIdx ? `1.5px solid ${activeVideo.accent}` : "1px solid rgba(148, 163, 184, 0.25)",
                        color: "#ffffff",
                        padding: "6px 10px",
                        borderRadius: "8px",
                        fontSize: "0.72rem",
                        fontWeight: 800,
                        cursor: "pointer"
                      }}
                    >
                      <div style={{ color: activeVideo.accent, fontSize: "0.68rem" }}>{sc.step}</div>
                      <div style={{ color: "#e2e8f0", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{sc.command}</div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* HTML5 MP4 VIDEO PLAYER (With Muted Autoplay + 1-Click Unmute so Browser Never Blocks Playback) */}
            {(playerViewMode === "DUAL" || playerViewMode === "MP4") && (
              <div
                style={{
                  background: "#000000",
                  borderRadius: "14px",
                  overflow: "hidden",
                  border: `2px solid ${activeVideo.accent}`,
                  position: "relative"
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 12px", background: "rgba(15, 23, 42, 0.95)", borderBottom: "1px solid rgba(148, 163, 184, 0.2)" }}>
                  <span style={{ fontSize: "0.76rem", fontWeight: 800, color: "#fde68a" }}>
                    📹 MP4 Video Stream: {activeVideo.title}
                  </span>
                  <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                    <button
                      type="button"
                      onClick={() => {
                        const nextMute = !mp4Muted;
                        setMp4Muted(nextMute);
                        if (videoRef.current) {
                          videoRef.current.muted = nextMute;
                          videoRef.current.play().catch(() => {});
                        }
                      }}
                      style={{
                        background: mp4Muted ? "linear-gradient(135deg, #f59e0b, #d97706)" : "linear-gradient(135deg, #059669, #047857)",
                        color: "#ffffff",
                        border: "1px solid #fde68a",
                        padding: "4px 10px",
                        borderRadius: "6px",
                        fontSize: "0.72rem",
                        fontWeight: 800,
                        cursor: "pointer"
                      }}
                    >
                      {mp4Muted ? "🔊 Click to Unmute MP4 Audio" : "🔈 Audio Unmuted"}
                    </button>
                    <a
                      href={activeVideo.videoSrc}
                      download
                      style={{
                        background: "rgba(56, 189, 248, 0.2)",
                        border: "1px solid #38bdf8",
                        color: "#7dd3fc",
                        padding: "4px 10px",
                        borderRadius: "6px",
                        fontSize: "0.72rem",
                        fontWeight: 800,
                        textDecoration: "none"
                      }}
                    >
                      ⬇ Download MP4
                    </a>
                  </div>
                </div>
                <video
                  ref={videoRef}
                  key={activeVideo.videoSrc}
                  src={activeVideo.videoSrc}
                  poster={activeVideo.poster}
                  controls
                  autoPlay
                  muted={mp4Muted}
                  playsInline
                  preload="auto"
                  style={{
                    width: "100%",
                    maxHeight: playerViewMode === "MP4" ? "460px" : "260px",
                    display: "block",
                    background: "#000000"
                  }}
                >
                  Your browser does not support HTML5 MP4 video playback.
                </video>
              </div>
            )}

            {/* Exact Role Commands, Buttons, Tabs & Activities Reference Card */}
            <div
              style={{
                background: "rgba(15, 23, 42, 0.85)",
                border: "1px solid rgba(148, 163, 184, 0.28)",
                borderRadius: "14px",
                padding: "14px 16px"
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "8px", marginBottom: "8px" }}>
                <div>
                  <span style={{ fontSize: "0.72rem", fontWeight: 900, color: activeVideo.accent }}>
                    {activeVideo.badge} • EXACT ROLE COMMANDS &amp; ACTIVITIES
                  </span>
                  <h3 style={{ margin: "2px 0 0", fontSize: "1.02rem", color: "#ffffff" }}>
                    {activeVideo.title}
                  </h3>
                </div>
                <span style={{ fontSize: "0.74rem", color: "#34d399", fontWeight: 800, background: "rgba(16, 185, 129, 0.14)", border: "1px solid rgba(16, 185, 129, 0.4)", padding: "4px 10px", borderRadius: "6px" }}>
                  Dashboard Path: {activeVideo.route}
                </span>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "8px", marginTop: "8px" }}>
                {(activeVideo.exactCommands || []).map((cmd, idx) => (
                  <div
                    key={idx}
                    style={{
                      background: "rgba(2, 6, 23, 0.75)",
                      border: "1px solid rgba(56, 189, 248, 0.25)",
                      borderRadius: "8px",
                      padding: "8px 10px",
                      fontSize: "0.76rem",
                      color: "#e2e8f0",
                      lineHeight: 1.45
                    }}
                  >
                    {cmd}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
