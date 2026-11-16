import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  calculateOnboardingFee,
  getOnboardingRates
} from "../../../utils/pricingEngine";
import { REAL_ACTION_ROLE_VIDEOS } from "../../../components/common/CartoonRoleVideoHubModal";
import WindowControlsBar from "../../../components/common/WindowControlsBar";
import StudentCooperativeConferenceModal from "../../../components/common/StudentCooperativeConferenceModal";
import { ROLE_DASHBOARD_DETAILS } from "../data/roleDashboardDetails";
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
        title: "Step 4: Multi-Format Question Bank (MCQ, Theory, True/False) & Exam Timetable Guide",
        narration:
          "Select any exam format tab in the high-contrast Multi-Format Question Bank (Multiple Choice, Theory Essay, True or False, Short Answer, Fill-in-Blank, or Case Study), add Examination Timetable Guide entries whenever there are exam times for students, and grade typed Theory scripts.",
        actionLabel: "MULTI_FORMAT_QBANK & EXAM_TIMETABLE_GUIDE",
        duration: "0:37 – 0:50"
      },
      {
        title: "Step 5: Mobile AI OMR Exam Scanner & Branded Terminal Gradebook",
        narration:
          "Scan physical OMR bubble sheets via camera for instant grading, verify scores, and publish official terminal report cards stamped with the exact school identity.",
        actionLabel: "AI_OMR_SCAN_&_PUBLISH_TERMINAL_REPORT_CARDS",
        duration: "0:50 – 1:02"
      }
    ],
    actions: [
      {
        title: "Set Multi-Format Exam & Add Timetable Entry",
        desc: "Configure MCQ, Theory & True/False questions + add Exam Timetable Guide slot",
        cmd: "Multi-Format Exam (MCQ + Theory + True/False) scheduled & added to Student Examination Timetable Guide."
      },
      {
        title: "Mark Sample JHS 2B Attendance Register",
        desc: "Record Present / Absent ticks and emit absent guardian alert",
        cmd: "Attendance saved: 34 Present, 1 Absent (Kwame Boateng) -> Guardian notification queued."
      },
      {
        title: "Run Mobile AI OMR Exam Laser Scan",
        desc: "Auto-grade bubble sheet #408 with manual review check",
        cmd: "OMR Scanner matched 38/40 answers (95% A1) in 0.84s. Ready for manual verify."
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
  },
  {
    id: "HR",
    role: "HR & Personnel Directorate",
    badge: "BIOMETRIC & PAYROLL TIERS",
    icon: "👥",
    color: "#f97316",
    videoFile: "/videos/video6_staff_hr_role_guide.mp4",
    downloadName: "GBS_Video7_HR_Action_Guide.mp4",
    photos: [
      "/assets/real_scene6_staff_gate_turnstile.jpg",
      "/assets/real_scene5_accountant_finance.jpg",
      "/assets/real_scene1_headmaster_desk.jpg"
    ],
    targetAudience: "HR Directors, Personnel Officers & Payroll Administrators",
    description:
      "Complete personnel lifecycle: staff recruitment, biometric clock-in audits, leave approvals, salary grade grouping, and automated payroll sync with the Accountant portal.",
    metrics: [
      { label: "Biometric Clock-In", val: "Real-Time Audit" },
      { label: "Leave Workflow", val: "1-Click Approve" },
      { label: "Salary Tiers", val: "Auto-Synced" }
    ],
    closingHook: "Every approved staff member and salary grade syncs directly with the Accountant Payroll and Headmaster Registry.",
    steps: [
      {
        title: "Step 1: Staff Onboarding & Biometric Attendance Audit",
        narration: "Register teaching and non-teaching staff, assign departments, and inspect daily biometric turnstile clock-in timestamps.",
        actionLabel: "HR_ONBOARD_STAFF & BIOMETRIC_AUDIT",
        duration: "0:00 – 0:20"
      },
      {
        title: "Step 2: Leave Adjudication & Salary Tier Grouping",
        narration: "Approve or decline staff leave requests and configure salary grade tiers synced directly to the Accountant Payroll.",
        actionLabel: "HR_LEAVE_APPROVAL & SALARY_TIERS",
        duration: "0:20 – 0:45"
      }
    ],
    actions: [
      {
        title: "Approve Staff Medical Leave & Sync Salary Tier",
        desc: "Authorize leave request and update Senior Faculty salary tier",
        cmd: "HR Leave #LV-209 approved -> Payroll tier synced to Accountant Treasury."
      }
    ],
    demoPortalRoute: "/portal/hr/dashboard",
    demoCreds: "hr@gbs.com / password123"
  },
  {
    id: "ALUMNI",
    role: "Alumni & Convocation Network",
    badge: "TRANSCRIPTS & ENDOWMENT",
    icon: "🎖️",
    color: "#eab308",
    videoFile: "/videos/gbs_complete_system_roles_master_guide.mp4",
    downloadName: "GBS_Video8_Alumni_Action_Guide.mp4",
    photos: [
      "/assets/real_scene3_student_elearning.jpg",
      "/assets/real_scene1_headmaster_desk.jpg",
      "/assets/real_scene5_accountant_finance.jpg"
    ],
    targetAudience: "Graduates, Alumni Associations, Employers & Universities",
    description:
      "Official academic transcript ordering, cryptographic certificate verification for employers, alma mater endowment pledges, and career mentorship.",
    metrics: [
      { label: "Transcript Verify", val: "QR Cryptographic" },
      { label: "Endowment Giving", val: "MoMo & Card" },
      { label: "Mentorship", val: "Cohort Network" }
    ],
    closingHook: "Graduates stay connected for life with instant credential verification and transparent endowment contributions.",
    steps: [
      {
        title: "Step 1: Official Transcript Request & Employer Verification",
        narration: "Request stamped academic transcripts and validate graduation credentials using cryptographic verification codes.",
        actionLabel: "REQUEST_TRANSCRIPT & VERIFY_DEGREE",
        duration: "0:00 – 0:25"
      },
      {
        title: "Step 2: Endowment Pledges & Career Mentorship",
        narration: "Contribute to school infrastructure projects via Mobile Money or Card and mentor current students.",
        actionLabel: "ALUMNI_ENDOWMENT_PLEDGE",
        duration: "0:25 – 0:45"
      }
    ],
    actions: [
      {
        title: "Verify Alumni Credential & Log Endowment Pledge",
        desc: "Validate graduate certificate code and record project donation",
        cmd: "Alumni Credential #ALM-2026 verified -> Endowment pledge synced to Treasury."
      }
    ],
    demoPortalRoute: "/portal/alumni/dashboard",
    demoCreds: "alumni@gbs.com / password123"
  },
  {
    id: "INVENTORY",
    role: "Inventory & Procurement Stores",
    badge: "STOCK LEDGER & REQUISITIONS",
    icon: "📦",
    color: "#84cc16",
    videoFile: "/videos/video6_staff_hr_role_guide.mp4",
    downloadName: "GBS_Video9_Inventory_Action_Guide.mp4",
    photos: [
      "/assets/real_scene5_accountant_finance.jpg",
      "/assets/real_scene6_staff_gate_turnstile.jpg",
      "/assets/real_scene2_teacher_scanner.jpg"
    ],
    targetAudience: "Storekeepers, Procurement Officers, Science Lab Technicians & Matrons",
    description:
      "Real-time campus stock ledger, low-stock reorder alerts, batch quarantine, departmental requisition approvals, and supplier purchase orders.",
    metrics: [
      { label: "Stock Tracking", val: "FEFO & Live Qty" },
      { label: "Requisitions", val: "Dept Approval" },
      { label: "Supplier POs", val: "GRN Verified" }
    ],
    closingHook: "Complete visibility over textbooks, science lab apparatus, uniforms, ICT assets, and kitchen stores.",
    steps: [
      {
        title: "Step 1: Stock Ledger Audit & Low-Stock Alerts",
        narration: "Register campus stock items, monitor low-stock reorder thresholds, and quarantine damaged or expired batches.",
        actionLabel: "AUDIT_STOCK_LEDGER & LOW_STOCK_ALERT",
        duration: "0:00 – 0:25"
      },
      {
        title: "Step 2: Departmental Requisitions & Supplier Purchase Orders",
        narration: "Approve resource requisitions from academic departments and issue Supplier Purchase Orders.",
        actionLabel: "APPROVE_DEPT_REQUISITION & ISSUE_PO",
        duration: "0:25 – 0:45"
      }
    ],
    actions: [
      {
        title: "Issue Science Lab Requisition & Update Stock",
        desc: "Approve microscope & reagent allocation and deduct stock balance",
        cmd: "Requisition #REQ-404 issued -> Science Lab stock ledger updated."
      }
    ],
    demoPortalRoute: "/portal/inventory/dashboard",
    demoCreds: "inventory@gbs.com / password123"
  },
  {
    id: "DEVELOPER",
    role: "Platform Developer Console",
    badge: "GLOBAL SOVEREIGNTY & AUTO-LOCK",
    icon: "🛡️",
    color: "#38bdf8",
    videoFile: "/videos/gbs_complete_system_roles_master_guide.mp4",
    downloadName: "GBS_Video10_Developer_Action_Guide.mp4",
    photos: [
      "/assets/real_scene1_headmaster_desk.jpg",
      "/assets/real_scene2_teacher_scanner.jpg",
      "/assets/real_scene6_staff_gate_turnstile.jpg"
    ],
    targetAudience: "System Founder, Platform Engineers & Global Operations Command",
    description:
      "Multi-tenant school onboarding, per-student subscription billing ($3/$5/$10), 7-day grace auto-lock engine, Live Registered Schools GPS Map, Intrusion Sentinel, and WebRTC Video Support.",
    metrics: [
      { label: "Auto-Lock Policy", val: "14d Notice + 7d Grace" },
      { label: "Live School Map", val: "GPS Turn-by-Turn" },
      { label: "Intrusion Sentinel", val: "24/7 IP Shield" }
    ],
    closingHook: "Total command over every onboarded educational institution, live production/demo switching, and automated subscription enforcement.",
    steps: [
      {
        title: "Step 1: Multi-Tenant Approval & 7-Day Grace Auto-Lock Engine",
        narration: "Approve newly onboarded schools, monitor per-student subscription tiers ($3/$5/$10), and enforce the 7-day grace period auto-lock.",
        actionLabel: "DEV_TENANT_REGISTRY & AUTO_LOCK_ENGINE",
        duration: "0:00 – 0:25"
      },
      {
        title: "Step 2: Live Schools GPS Map, Intrusion Sentinel & Video Support",
        narration: "Locate any registered school on the interactive GPS map, block unauthorized intruder IPs, and launch live WebRTC video support.",
        actionLabel: "LIVE_GPS_MAP & INTRUSION_SENTINEL",
        duration: "0:25 – 0:50"
      }
    ],
    actions: [
      {
        title: "Verify Tenant Subscription & Run Sentinel Scan",
        desc: "Confirm MoMo renewal and audit global tenant security status",
        cmd: "Tenant #1 verified active -> Intrusion Sentinel reports 0 unblocked threats."
      }
    ],
    demoPortalRoute: "/developer",
    demoCreds: "developer@gbs.com / password123"
  }
];

export default function VideoPresentationEngine() {
  const navigate = useNavigate();
  const [activeRoleIdx, setActiveRoleIdx] = useState(0);
  const [activeStepIdx, setActiveStepIdx] = useState(0);
  const [isPlayingScript, setIsPlayingScript] = useState(false);
  const [actionLog, setActionLog] = useState([
    { time: "Ready", msg: "Real-Life Action Cinema & Interactive Walkthrough Engine initialized across all 10 roles." }
  ]);

  const [presViewMode, setPresViewMode] = useState("SCENE"); // 'SCENE' | 'ARCHITECTURE' | 'CHECKLIST' | 'RCCE' | 'CONFERENCE'
  const [showLiveConferenceModal, setShowLiveConferenceModal] = useState(false);
  const [selectedLiveRoom, setSelectedLiveRoom] = useState(null);
  const [liveConferenceMode, setLiveConferenceMode] = useState("VIDEO");
  const [activeArchTabIdx, setActiveArchTabIdx] = useState(0);

  // Interactive Per-Student Subscription Calculator
  const [rates] = useState(() => getOnboardingRates());
  const [calcTier, setCalcTier] = useState("SHS");
  const [calcStudents, setCalcStudents] = useState(300);
  const computedFee = calculateOnboardingFee(calcTier, calcStudents, "3_MONTHS");

  const activeModule = ROLE_MODULES[activeRoleIdx] || ROLE_MODULES[0];
  const activeStep = activeModule.steps[activeStepIdx] || activeModule.steps[0];
  const activeRoleDetails = ROLE_DASHBOARD_DETAILS[activeModule.id] || ROLE_DASHBOARD_DETAILS.ADMIN;
  const masterVideo = REAL_ACTION_ROLE_VIDEOS[0];

  const speechRef = useRef(null);
  const videoRef = useRef(null);
  const [isVideoMuted, setIsVideoMuted] = useState(false);
  const [videoSourceMode, setVideoSourceMode] = useState("ROLE"); // 'ROLE' | 'MASTER'

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
    setActiveArchTabIdx(0);
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
      <WindowControlsBar title="GBS 10-Role Video Presentation Engine" />
      {/* Top Executive Header */}
      <header className="gbs-pres-header">
        <div className="gbs-pres-brand">
          <div className="gbs-pres-logo-badge">GBS</div>
          <div>
            <h1>GBS REAL-LIFE ACTION VIDEO PRESENTATION ENGINE</h1>
            <span className="gbs-pres-sub">
              Real School Documentary Photography + Live UI Action Movies Across All 10 Roles
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
            href={masterVideo.videoSrc || "/videos/gbs_complete_system_roles_master_guide.mp4"}
            download="GBS_Complete_10_Role_Master_Guide.mp4"
            className="gbs-btn-pres-primary"
            style={{ textDecoration: "none" }}
          >
            ⬇️ Download Complete 10-Role Movie
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

      {/* Video Source Switcher & Audio Controls Bar */}
      <div style={{ display: "flex", gap: "10px", justifyContent: "space-between", alignItems: "center", margin: "14px 0", flexWrap: "wrap", padding: "0 10px" }}>
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
          <button
            type="button"
            onClick={() => setVideoSourceMode("ROLE")}
            style={{
              background: videoSourceMode === "ROLE" ? (activeModule.color || "#38bdf8") : "#1e293b",
              color: videoSourceMode === "ROLE" ? "#020617" : "#cbd5e1",
              border: "1px solid #334155",
              borderRadius: "8px",
              padding: "8px 14px",
              fontWeight: 700,
              fontSize: "13px",
              cursor: "pointer"
            }}
          >
            🎬 Role {activeRoleIdx + 1}: {activeModule.role} Action Video
          </button>
          <button
            type="button"
            onClick={() => setVideoSourceMode("MASTER")}
            style={{
              background: videoSourceMode === "MASTER" ? "#f59e0b" : "#1e293b",
              color: videoSourceMode === "MASTER" ? "#020617" : "#cbd5e1",
              border: "1px solid #334155",
              borderRadius: "8px",
              padding: "8px 14px",
              fontWeight: 700,
              fontSize: "13px",
              cursor: "pointer"
            }}
          >
            🌟 Complete All-10-Roles Master Film (56 MB)
          </button>
        </div>

        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
          <button
            type="button"
            onClick={() => {
              if (videoRef.current) {
                videoRef.current.muted = !videoRef.current.muted;
                setIsVideoMuted(videoRef.current.muted);
              }
            }}
            style={{
              background: isVideoMuted ? "#ef4444" : "#10b981",
              color: "#ffffff",
              border: "none",
              borderRadius: "8px",
              padding: "8px 14px",
              fontWeight: 700,
              fontSize: "13px",
              cursor: "pointer"
            }}
          >
            {isVideoMuted ? "🔇 Unmute Video Audio" : "🔊 Sound ON (Mute Audio)"}
          </button>

          <button
            type="button"
            onClick={handleSpeakStep}
            style={{
              background: isPlayingScript ? "#dc2626" : "#38bdf8",
              color: isPlayingScript ? "#ffffff" : "#020617",
              border: "none",
              borderRadius: "8px",
              padding: "8px 14px",
              fontWeight: 700,
              fontSize: "13px",
              cursor: "pointer"
            }}
          >
            {isPlayingScript ? "⏹️ Stop Narration" : "🗣️ Listen to Scene Narration Aloud"}
          </button>
        </div>
      </div>

      {/* Embedded Real-Life Action MP4 Cinema Banner */}
      <section className="gbs-pres-cinema-banner">
        <div className="gbs-pres-cinema-player-wrap">
          <video
            ref={videoRef}
            key={videoSourceMode === "MASTER" ? "/videos/gbs_complete_system_roles_master_guide.mp4" : activeModule.videoFile}
            src={videoSourceMode === "MASTER" ? "/videos/gbs_complete_system_roles_master_guide.mp4" : activeModule.videoFile}
            poster={activeModule.photos[0]}
            controls
            autoPlay
            muted={isVideoMuted}
            playsInline
            preload="auto"
          />
        </div>

        <div className="gbs-pres-cinema-info">
          <span
            className="gbs-pres-tag"
            style={{ background: activeModule.color, color: "#020617" }}
          >
            REAL-LIFE ACTION MOVIE • ROLE {activeRoleIdx + 1} OF {ROLE_MODULES.length}
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
              href={masterVideo.videoSrc || "/videos/gbs_complete_system_roles_master_guide.mp4"}
              download="GBS_Complete_10_Role_Master_Guide.mp4"
              className="gbs-btn-mp4-download master"
            >
              🎬 Download Master All-10-Roles MP4
            </a>
          </div>
        </div>
      </section>

      {/* Interactive Presentation Mode / Deep-Dive Navigation */}
      <div style={{
        margin: "0 10px 16px",
        padding: "8px 12px",
        background: "rgba(15, 23, 42, 0.8)",
        border: "1px solid rgba(255, 255, 255, 0.12)",
        borderRadius: "12px",
        display: "flex",
        gap: "8px",
        flexWrap: "wrap",
        alignItems: "center",
        justifyContent: "space-between"
      }}>
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "center" }}>
          <span style={{ fontSize: "0.78rem", color: "#94a3b8", fontWeight: 700, marginRight: "4px" }}>
            PRESENTATION MODE:
          </span>
          {[
            { id: "SCENE", label: "🎬 Action Movie & Script", desc: "Scene-by-scene video and verbatim narration" },
            { id: "ARCHITECTURE", label: "🖥️ Dashboard Architecture & Every Button Guide", desc: "Complete guide to all menus, buttons & actions" },
            { id: "CHECKLIST", label: "📋 SOP & Daily Routine Checklist", desc: "Daily, weekly and termly procedures" },
            { id: "RCCE", label: "⚡ GBS-RCCE Central Linkage", desc: "API, business rules & audit trails" },
            { id: "CONFERENCE", label: "🎙️ Student Cooperative Conferencing Guide", desc: "Voice & video study circles" }
          ].map((mode) => (
            <button
              key={mode.id}
              type="button"
              onClick={() => {
                setPresViewMode(mode.id);
                appendLog(`Switched presentation view to ${mode.label}`);
              }}
              style={{
                background: presViewMode === mode.id ? (activeModule.color || "#38bdf8") : "rgba(30, 41, 59, 0.7)",
                color: presViewMode === mode.id ? "#020617" : "#cbd5e1",
                border: presViewMode === mode.id ? "none" : "1px solid rgba(255, 255, 255, 0.1)",
                borderRadius: "8px",
                padding: "8px 14px",
                fontWeight: 800,
                fontSize: "0.82rem",
                cursor: "pointer",
                transition: "all 0.2s ease"
              }}
              title={mode.desc}
            >
              {mode.label}
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={() => {
            setShowLiveConferenceModal(true);
            setLiveConferenceMode("VIDEO");
            appendLog("Launched Live Student Cooperative Conference Simulator.");
          }}
          style={{
            background: "linear-gradient(135deg, #8b5cf6, #7c3aed)",
            border: "none",
            color: "#ffffff",
            borderRadius: "8px",
            padding: "8px 14px",
            fontWeight: 800,
            fontSize: "0.82rem",
            cursor: "pointer",
            display: "inline-flex",
            alignItems: "center",
            gap: "6px",
            boxShadow: "0 4px 12px rgba(139, 92, 246, 0.4)"
          }}
        >
          <span>🎙️</span> Test Student Conference Hub
        </button>
      </div>

      {/* Main Split Arena */}
      <main className="gbs-pres-arena">
        {/* Left Column: Scene Narration, Dashboard Architecture & SOP Guides */}
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

            {/* VIEW 1: SCENE-BY-SCENE ACTION BREAKDOWN */}
            {presViewMode === "SCENE" && (
              <div>
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
              </div>
            )}

            {/* VIEW 2: COMPLETE DASHBOARD ARCHITECTURE & BUTTON GUIDE */}
            {presViewMode === "ARCHITECTURE" && (
              <div>
                <div className="gbs-pres-section-title" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span>DASHBOARD ARCHITECTURE & MENU / BUTTON BREAKDOWN</span>
                  <span style={{ fontSize: "0.75rem", color: "#38bdf8", textTransform: "none", fontWeight: 700 }}>
                    Portal: <code>{activeRoleDetails.dashboardPath}</code>
                  </span>
                </div>

                <p style={{ fontSize: "0.86rem", color: "#cbd5e1", lineHeight: 1.5, marginBottom: "1rem" }}>
                  {activeRoleDetails.summary}
                </p>

                {/* Tab Selector on Dashboard */}
                <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginBottom: "1.25rem" }}>
                  {activeRoleDetails.keyTabs.map((tab, tIdx) => (
                    <button
                      key={tab.tabId}
                      type="button"
                      onClick={() => setActiveArchTabIdx(tIdx)}
                      style={{
                        background: activeArchTabIdx === tIdx ? "rgba(56, 189, 248, 0.2)" : "rgba(15, 23, 42, 0.6)",
                        border: activeArchTabIdx === tIdx ? "1.5px solid #38bdf8" : "1px solid rgba(255, 255, 255, 0.1)",
                        color: activeArchTabIdx === tIdx ? "#38bdf8" : "#cbd5e1",
                        borderRadius: "8px",
                        padding: "6px 12px",
                        fontSize: "0.8rem",
                        fontWeight: 800,
                        cursor: "pointer"
                      }}
                    >
                      {tab.tabName}
                    </button>
                  ))}
                </div>

                {/* Active Tab Deep Breakdown */}
                {(() => {
                  const curTab = activeRoleDetails.keyTabs[activeArchTabIdx] || activeRoleDetails.keyTabs[0];
                  return (
                    <div style={{
                      background: "rgba(15, 23, 42, 0.8)",
                      border: "1px solid rgba(255, 255, 255, 0.12)",
                      borderRadius: "12px",
                      padding: "1.25rem"
                    }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px", flexWrap: "wrap", gap: "6px" }}>
                        <h4 style={{ margin: 0, fontSize: "1.05rem", color: "#f8fafc", fontWeight: 800 }}>
                          {curTab.tabName}
                        </h4>
                        <span style={{ background: "rgba(56, 189, 248, 0.15)", color: "#38bdf8", padding: "3px 8px", borderRadius: "6px", fontSize: "0.72rem", fontWeight: 800 }}>
                          TAB ID: {curTab.tabId.toUpperCase()}
                        </span>
                      </div>

                      <p style={{ fontSize: "0.84rem", color: "#94a3b8", lineHeight: 1.5, margin: "0 0 1rem" }}>
                        <strong>Operational Purpose:</strong> {curTab.tabPurpose}
                      </p>

                      {/* Action Buttons & Feedback Matrix */}
                      <div style={{ marginBottom: "1rem" }}>
                        <span style={{ fontSize: "0.75rem", color: "#38bdf8", fontWeight: 800, display: "block", marginBottom: "6px", letterSpacing: "0.5px" }}>
                          COMMAND BUTTONS, CLICKS & SYSTEM RESPONSES:
                        </span>
                        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                          {curTab.actionButtons.map((btn, bIdx) => (
                            <div
                              key={bIdx}
                              style={{
                                background: "rgba(30, 41, 59, 0.6)",
                                border: "1px solid rgba(255, 255, 255, 0.08)",
                                borderRadius: "8px",
                                padding: "8px 12px"
                              }}
                            >
                              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "3px" }}>
                                <strong style={{ color: "#f8fafc", fontSize: "0.85rem" }}>
                                  🔘 {btn.name}
                                </strong>
                                <span style={{ fontSize: "0.72rem", color: "#34d399", fontWeight: 700 }}>
                                  ⚡ Immediate Action
                                </span>
                              </div>
                              <div style={{ fontSize: "0.8rem", color: "#cbd5e1", marginBottom: "3px" }}>
                                <strong>Action:</strong> {btn.action}
                              </div>
                              <div style={{ fontSize: "0.78rem", color: "#a5f3fc" }}>
                                <strong>Feedback / Response:</strong> {btn.feedback}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Inputs & Forms */}
                      {curTab.formsAndInputs && curTab.formsAndInputs.length > 0 && (
                        <div style={{ marginBottom: "1rem" }}>
                          <span style={{ fontSize: "0.75rem", color: "#f59e0b", fontWeight: 800, display: "block", marginBottom: "4px" }}>
                            USER INPUTS, SELECTORS & CONTROLS:
                          </span>
                          <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                            {curTab.formsAndInputs.map((formItem, fIdx) => (
                              <span
                                key={fIdx}
                                style={{
                                  background: "rgba(245, 158, 11, 0.12)",
                                  border: "1px solid rgba(245, 158, 11, 0.3)",
                                  color: "#fbbf24",
                                  fontSize: "0.74rem",
                                  fontWeight: 700,
                                  padding: "3px 8px",
                                  borderRadius: "6px"
                                }}
                              >
                                📝 {formItem}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* System Feedback */}
                      <div style={{
                        background: "rgba(16, 185, 129, 0.12)",
                        border: "1px solid rgba(16, 185, 129, 0.3)",
                        borderRadius: "8px",
                        padding: "8px 12px",
                        fontSize: "0.8rem",
                        color: "#6ee7b7"
                      }}>
                        <strong>Central System State Impact:</strong> {curTab.systemFeedback}
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}

            {/* VIEW 3: SOP & DAILY ROUTINE CHECKLIST */}
            {presViewMode === "CHECKLIST" && (
              <div>
                <div className="gbs-pres-section-title">
                  STANDARD OPERATING PROCEDURES (SOP) & DUTIES CHECKLIST
                </div>
                <p style={{ fontSize: "0.86rem", color: "#cbd5e1", lineHeight: 1.5, marginBottom: "1rem" }}>
                  Operational daily routines, weekly closeouts, and termly responsibilities for <strong>{activeRoleDetails.role}</strong>.
                </p>

                <div style={{ marginBottom: "1.5rem" }}>
                  <h4 style={{ margin: "0 0 8px", fontSize: "0.95rem", color: "#38bdf8", fontWeight: 800 }}>
                    ☀️ Morning & Daily Operating Checklist:
                  </h4>
                  <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                    {activeRoleDetails.dailyChecklist.map((task, dIdx) => (
                      <div
                        key={dIdx}
                        style={{
                          background: "rgba(15, 23, 42, 0.7)",
                          border: "1px solid rgba(255, 255, 255, 0.08)",
                          borderRadius: "8px",
                          padding: "10px 14px",
                          display: "flex",
                          alignItems: "center",
                          gap: "10px"
                        }}
                      >
                        <span style={{ fontSize: "1.1rem", color: "#34d399" }}>☑️</span>
                        <span style={{ fontSize: "0.85rem", color: "#f1f5f9" }}>{task}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h4 style={{ margin: "0 0 8px", fontSize: "0.95rem", color: "#f59e0b", fontWeight: 800 }}>
                    🗓️ Weekly & Termly Governance Checklist:
                  </h4>
                  <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                    {activeRoleDetails.weeklyAndTermlyChecklist.map((task, wIdx) => (
                      <div
                        key={wIdx}
                        style={{
                          background: "rgba(15, 23, 42, 0.7)",
                          border: "1px solid rgba(255, 255, 255, 0.08)",
                          borderRadius: "8px",
                          padding: "10px 14px",
                          display: "flex",
                          alignItems: "center",
                          gap: "10px"
                        }}
                      >
                        <span style={{ fontSize: "1.1rem", color: "#fbbf24" }}>📋</span>
                        <span style={{ fontSize: "0.85rem", color: "#f1f5f9" }}>{task}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* VIEW 4: GBS-RCCE CENTRAL LINKAGE */}
            {presViewMode === "RCCE" && (
              <div>
                <div className="gbs-pres-section-title">
                  GBS-RCCE CENTRAL SYSTEM RESPONSE, CONTROL & COMMUNICATION ENGINE LINKAGE
                </div>
                <p style={{ fontSize: "0.86rem", color: "#cbd5e1", lineHeight: 1.5, marginBottom: "1rem" }}>
                  Every button click and action executed on the <strong>{activeRoleDetails.role}</strong> dashboard connects directly through the centralized GBS-RCCE architecture.
                </p>

                <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                  <div style={{ background: "rgba(15, 23, 42, 0.8)", border: "1px solid #38bdf8", borderRadius: "10px", padding: "1rem" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
                      <span style={{ fontSize: "1.2rem" }}>🌐</span>
                      <strong style={{ color: "#38bdf8", fontSize: "0.95rem" }}>Central API Architecture & Endpoints:</strong>
                    </div>
                    <p style={{ margin: "0 0 8px", fontSize: "0.82rem", color: "#94a3b8" }}>
                      All requests route through authorized backend endpoints with JWT/Session bearer validation:
                    </p>
                    <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                      {activeRoleDetails.rcceCentralLinkage.centralEndpoints.map((ep, eIdx) => (
                        <code key={eIdx} style={{ background: "#020617", border: "1px solid #334155", color: "#38bdf8", padding: "3px 8px", borderRadius: "6px", fontSize: "0.78rem" }}>
                          {ep}
                        </code>
                      ))}
                    </div>
                  </div>

                  <div style={{ background: "rgba(15, 23, 42, 0.8)", border: "1px solid #f59e0b", borderRadius: "10px", padding: "1rem" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
                      <span style={{ fontSize: "1.2rem" }}>⚖️</span>
                      <strong style={{ color: "#fbbf24", fontSize: "0.95rem" }}>Business Rules Engine Guardrails:</strong>
                    </div>
                    <p style={{ margin: 0, fontSize: "0.84rem", color: "#cbd5e1", lineHeight: 1.5 }}>
                      {activeRoleDetails.rcceCentralLinkage.businessRules}
                    </p>
                  </div>

                  <div style={{ background: "rgba(15, 23, 42, 0.8)", border: "1px solid #10b981", borderRadius: "10px", padding: "1rem" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
                      <span style={{ fontSize: "1.2rem" }}>📜</span>
                      <strong style={{ color: "#34d399", fontSize: "0.95rem" }}>Audit and Activity Tracking Vault:</strong>
                    </div>
                    <p style={{ margin: 0, fontSize: "0.84rem", color: "#cbd5e1", lineHeight: 1.5 }}>
                      {activeRoleDetails.rcceCentralLinkage.auditTrail}
                    </p>
                  </div>

                  <div style={{ background: "rgba(15, 23, 42, 0.8)", border: "1px solid #8b5cf6", borderRadius: "10px", padding: "1rem" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
                      <span style={{ fontSize: "1.2rem" }}>📡</span>
                      <strong style={{ color: "#c084fc", fontSize: "0.95rem" }}>Event and Notification Dispatches:</strong>
                    </div>
                    <p style={{ margin: 0, fontSize: "0.84rem", color: "#cbd5e1", lineHeight: 1.5 }}>
                      {activeRoleDetails.rcceCentralLinkage.downstreamEvents}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* VIEW 5: STUDENT COOPERATIVE CONFERENCING GUIDE */}
            {presViewMode === "CONFERENCE" && (
              <div>
                <div className="gbs-pres-section-title" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span>STUDENT COOPERATIVE VOICE & VIDEO CONFERENCING & SOCIAL LOUNGE</span>
                  <button
                    type="button"
                    onClick={() => {
                      setShowLiveConferenceModal(true);
                      setLiveConferenceMode("VIDEO");
                    }}
                    style={{
                      background: "linear-gradient(135deg, #8b5cf6, #6d28d9)",
                      border: "none",
                      color: "#fff",
                      borderRadius: "6px",
                      padding: "4px 10px",
                      fontSize: "0.75rem",
                      fontWeight: 800,
                      cursor: "pointer"
                    }}
                  >
                    🚀 Launch Live Hub
                  </button>
                </div>

                <p style={{ fontSize: "0.86rem", color: "#cbd5e1", lineHeight: 1.5, marginBottom: "1rem" }}>
                  The Student Cooperative Conferencing Hub allows scholars to meet in voice and video conference rooms for collaborative study circles, homework review, and student socializing.
                </p>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "1.25rem" }}>
                  <div style={{ background: "rgba(139, 92, 246, 0.15)", border: "1px solid #8b5cf6", borderRadius: "10px", padding: "10px 14px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "4px" }}>
                      <span style={{ fontSize: "1.1rem" }}>🎙️</span>
                      <strong style={{ color: "#c084fc", fontSize: "0.9rem" }}>Voice Calling Mode:</strong>
                    </div>
                    <p style={{ margin: 0, fontSize: "0.78rem", color: "#cbd5e1", lineHeight: 1.4 }}>
                      Lightweight audio calling with voice waveforms, active speaker glowing indicators, and background noise suppression. Perfect for low data usage and quick study questions.
                    </p>
                  </div>

                  <div style={{ background: "rgba(6, 182, 212, 0.15)", border: "1px solid #06b6d4", borderRadius: "10px", padding: "10px 14px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "4px" }}>
                      <span style={{ fontSize: "1.1rem" }}>📹</span>
                      <strong style={{ color: "#38bdf8", fontSize: "0.9rem" }}>HD Video Calling Mode:</strong>
                    </div>
                    <p style={{ margin: 0, fontSize: "0.78rem", color: "#cbd5e1", lineHeight: 1.4 }}>
                      Multi-peer WebRTC video stream, camera toggle, screen sharing for sharing slides/diagrams/code, raise hand indicator, and active duration timer.
                    </p>
                  </div>
                </div>

                <h4 style={{ margin: "0 0 8px", fontSize: "0.95rem", color: "#f8fafc", fontWeight: 800 }}>
                  Active Preset Study Lounges & Social Rooms:
                </h4>

                <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: "1rem" }}>
                  {[
                    { name: "🔬 STEM & Mathematics Circle", cat: "Cooperative Learning", code: "STEM-8021", peers: 5, desc: "Calculus, Physics, quadratic equations & lab report collaboration." },
                    { name: "📖 Literature, Essay & Debate", cat: "Cooperative Learning", code: "LIT-3940", peers: 4, desc: "Essay peer review, grammar drills, philosophy & history debates." },
                    { name: "💻 CS & Coding Workshop", cat: "Cooperative Learning", code: "CODE-5512", peers: 6, desc: "Pair programming, HTML/CSS review, Python logic & robotics." },
                    { name: "☕ Student After-School Social Lounge", cat: "Socializing & Community", code: "LOUNGE-9910", peers: 8, desc: "Meet peers across classes, discuss sports, art, music & school life." },
                    { name: "🌍 Foreign Language Exchange", cat: "Cooperative Learning", code: "LANG-7214", peers: 3, desc: "Voice conversation drills in French, Spanish, Twi & Hausa." }
                  ].map((room, rIdx) => (
                    <div key={rIdx} style={{ background: "rgba(15, 23, 42, 0.7)", border: "1px solid rgba(255, 255, 255, 0.08)", borderRadius: "8px", padding: "8px 12px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "8px" }}>
                      <div>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                          <strong style={{ color: "#f8fafc", fontSize: "0.88rem" }}>{room.name}</strong>
                          <span style={{ background: "rgba(16, 185, 129, 0.15)", color: "#34d399", fontSize: "0.7rem", fontWeight: 700, padding: "2px 6px", borderRadius: "4px" }}>
                            ● {room.peers} Active
                          </span>
                        </div>
                        <p style={{ margin: "2px 0 0", fontSize: "0.76rem", color: "#94a3b8" }}>{room.desc}</p>
                      </div>
                      <div style={{ display: "flex", gap: "6px" }}>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedLiveRoom({ id: room.code, name: room.name, roomCode: room.code, category: room.cat, description: room.desc });
                            setLiveConferenceMode("VOICE");
                            setShowLiveConferenceModal(true);
                          }}
                          style={{ background: "rgba(139, 92, 246, 0.2)", border: "1px solid #8b5cf6", color: "#c084fc", borderRadius: "6px", padding: "5px 10px", fontSize: "0.75rem", fontWeight: 700, cursor: "pointer" }}
                        >
                          🎙️ Voice
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedLiveRoom({ id: room.code, name: room.name, roomCode: room.code, category: room.cat, description: room.desc });
                            setLiveConferenceMode("VIDEO");
                            setShowLiveConferenceModal(true);
                          }}
                          style={{ background: "#8b5cf6", border: "none", color: "#fff", borderRadius: "6px", padding: "5px 10px", fontSize: "0.75rem", fontWeight: 800, cursor: "pointer" }}
                        >
                          📹 Video
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
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

      <StudentCooperativeConferenceModal
        isOpen={showLiveConferenceModal}
        onClose={() => setShowLiveConferenceModal(false)}
        initialRoom={selectedLiveRoom}
        initialMode={liveConferenceMode}
      />
    </div>
  );
}

