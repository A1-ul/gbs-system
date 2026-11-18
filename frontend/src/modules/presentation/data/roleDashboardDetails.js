/**
 * GBS CENTRAL SYSTEM RESPONSE, CONTROL AND COMMUNICATION ENGINE (GBS-RCCE)
 * COMPREHENSIVE USER ROLE DASHBOARD OPERATIONAL HANDBOOK & ARCHITECTURE BREAKDOWN
 * Detailed operational reference for all 10 roles across the GBS International School Management System.
 */

export const ROLE_DASHBOARD_DETAILS = {
  ADMIN: {
    id: "ADMIN",
    role: "Headmaster / School Super Admin",
    portalRoute: "/login/admin",
    dashboardPath: "/portal/admin/dashboard",
    badge: "EXECUTIVE GOVERNANCE",
    tagline: "Total Institutional Sovereignty, Approvals, Admissions & Real-Time Security",
    summary: "The Headmaster Executive Dashboard is the primary operational nerve center for the school. Once approved by the GBS Developer Control Center, the entire system brands automatically to the institution's registered legal name. The Headmaster oversees staff credentials, prospective student admissions, academic calendars, multi-language communications, emergency Google Maps telemetry, and official document certification.",
    keyTabs: [
      {
        tabId: "overview",
        tabName: "📊 Executive KPI Overview",
        tabPurpose: "Real-time institutional health monitoring across enrollment, faculty attendance, fee collection velocity, and emergency alerts.",
        actionButtons: [
          { name: "🔄 Refresh Metrics", action: "Forces real-time database pull from PostgreSQL", feedback: "Pulls latest enrollment, faculty headcounts, and revenue figures" },
          { name: "🖨️ Print Executive Report", action: "Generates stamped institutional summary PDF", feedback: "Renders branded report with registered school crest and date" }
        ],
        formsAndInputs: ["Academic Term selector", "Date range filter"],
        systemFeedback: "Updates telemetry cards with 100% accurate database records."
      },
      {
        tabId: "approvals",
        tabName: "👥 Staff & User Approvals",
        tabPurpose: "Adjudicate pending teacher, accountant, staff, and student accounts before they are permitted to log in.",
        actionButtons: [
          { name: "✅ Approve User", action: "Activates account, grants RBAC permissions, and issues credentials", feedback: "Triggers welcome SMS and moves user into active roster" },
          { name: "❌ Reject / Suspend", action: "Revokes portal access immediately", feedback: "Logs security audit event and notifies applicant" }
        ],
        formsAndInputs: ["Department dropdown", "Assigned classes multi-select", "Faculty designation input"],
        systemFeedback: "Writes RBAC authorization entry to PostgreSQL and fires notification engine."
      },
      {
        tabId: "admissions",
        tabName: "📝 Online Student Admissions",
        tabPurpose: "Vet submitted applications from prospective parents, verify documents, and generate student index numbers.",
        actionButtons: [
          { name: "📄 Inspect Documents", action: "Opens uploaded birth certificates and previous transcripts", feedback: "Renders preview modal without leaving page" },
          { name: "🎓 Approve Admission", action: "Generates official admission letter with school crest and provisions student ID", feedback: "Dispatches SMS to parent and creates student profile" }
        ],
        formsAndInputs: ["Class placement selector", "Boarding/Day status", "House/Form assignment"],
        systemFeedback: "Student index number created (e.g. STU-2026-091) and ledger initialized."
      },
      {
        tabId: "calendar",
        tabName: "🗓️ Term Schedule & Calendar Publishing",
        tabPurpose: "Publish official term weeks, examination dates, and vacation periods synchronized across all student and teacher dashboards.",
        actionButtons: [
          { name: "📢 Publish Schedule", action: "Broadcasts calendar dates across all connected portals", feedback: "Synchronizes vacation countdown on all dashboards instantly" }
        ],
        formsAndInputs: ["Academic Year", "Active Term", "Weeks in school", "Official Vacation Date"],
        systemFeedback: "Dispatches 'gbs_academic_schedule_published' event across all client tabs."
      },
      {
        tabId: "translator",
        tabName: "🌍 Real Language 2-Mode Translator",
        tabPurpose: "Translate words, sentences, and school notices across English, Twi, Ga, Ewe, Hausa, French, Spanish, and Arabic with deep cultural meanings and direct messaging.",
        actionButtons: [
          { name: "🔍 Mode 1: Translate + Meaning", action: "Translates copied phrase and displays formal grammatical and cultural definition", feedback: "Renders pronunciation, nuance, and contextual usage" },
          { name: "📤 Mode 2: Translate & Send", action: "Translates message and delivers straight to target parent, teacher, or scholar", feedback: "Dispatches translated message to recipient inbox with delivery audit" }
        ],
        formsAndInputs: ["Source language dropdown", "Target language dropdown", "Message textarea", "Recipient selector"],
        systemFeedback: "Two-way verified multi-language communication logged in communication vault."
      },
      {
        tabId: "emergency-locator",
        tabName: "📍 Live Google Maps Emergency Parent Locator",
        tabPurpose: "Locate any parent or guardian worldwide on Google Maps via their phone number during campus health or safety emergencies.",
        actionButtons: [
          { name: "🔍 Search & Plot Pin", action: "Resolves global carrier prefix and verified coordinates without restriction", feedback: "Pulls satellite/street map with route distance from campus" },
          { name: "🚨 Dispatch Emergency Alert", action: "Triggers priority high-importance SMS and voice call alert", feedback: "Logs emergency incident with GPS coordinates in audit trail" }
        ],
        formsAndInputs: ["Parent Phone Number (any country code: +1, +44, +233, +234, +256, etc.)", "GPS Address"],
        systemFeedback: "Zero 404 blockers: Universal geocoding resolves valid coordinates across the entire world."
      }
    ],
    dailyChecklist: [
      "Review morning Executive KPI Overview for campus attendance and revenue updates.",
      "Check Staff Approvals tab to authorize new faculty or substitute teacher credentials.",
      "Inspect the Emergency Locator desk to ensure telecom and GPS telemetry are active.",
      "Review submitted parent messages through the Real Language Translator."
    ],
    weeklyAndTermlyChecklist: [
      "Verify published academic schedule and update term examination schedules.",
      "Audit terminal report cards before official digital stamp and signature release.",
      "Run financial revenue and fee arrears reconciliations with the Chief Accountant.",
      "Inspect campus gate turnstile biometric logs and school bus fleet telemetry."
    ],
    rcceCentralLinkage: {
      centralEndpoints: ["/api/v1/auth/approve", "/api/v1/admissions", "/api/v1/academics/schedule", "/api/v1/emergency/locate"],
      businessRules: "Strict role hierarchy: Only approved tenants can access; permanent deletions wipe all access instantly.",
      auditTrail: "Every approval, calendar publication, and emergency search writes an immutable audit record to PostgreSQL.",
      downstreamEvents: "Fires WebHook and WebSocket notifications to Teacher, Student, and Parent portals."
    }
  },

  TEACHER: {
    id: "TEACHER",
    role: "Teacher & Academic Faculty",
    portalRoute: "/login/teacher",
    dashboardPath: "/portal/teacher/dashboard",
    badge: "CLASSROOM & AI OMR GRADING",
    tagline: "Timetables, Tick Attendance, Topic Videos & Mobile Camera OMR Scanning",
    summary: "The Teacher Academic Portal equips classroom instructors, subject masters, and lab facilitators with tools to conduct lessons, mark attendance, record continuous assessments, and stream classes. Includes the AI Mobile Camera OMR Exam Scanner that marks paper scripts in 1.2 seconds with manual verification overrides.",
    keyTabs: [
      {
        tabId: "timetable",
        tabName: "🗓️ Today's Lesson Schedule & Timetable",
        tabPurpose: "Displays daily period slots, assigned subject rooms, class forms, and curricular lesson plans.",
        actionButtons: [
          { name: "📚 Start Lesson", action: "Marks class active and loads subject syllabus", feedback: "Notifies students on their dashboard that lesson is underway" }
        ],
        formsAndInputs: ["Class selector", "Subject syllabus dropdown"],
        systemFeedback: "Synchronizes period readiness status with the Headmaster overview."
      },
      {
        tabId: "attendance",
        tabName: "✅ Tick-by-Tick Classroom Attendance Tracker",
        tabPurpose: "Record student attendance per period with one-click toggles (Present, Absent, Late, Excused).",
        actionButtons: [
          { name: "⚡ Mark All Present", action: "Quick-populates entire class roster as Present", feedback: "Saves time on full attendance days" },
          { name: "💾 Commit Attendance", action: "Saves record to PostgreSQL and notifies parents of absentees", feedback: "Dispatches automated absence SMS to parents instantaneously" }
        ],
        formsAndInputs: ["Class list", "Student rows with radio status buttons", "Attendance remarks"],
        systemFeedback: "Attendance percentage updated on student report cards and parent portal live."
      },
      {
        tabId: "omr-scanner",
        tabName: "📷 Mobile Camera AI OMR Exam Scanner",
        tabPurpose: "Scan physical multiple-choice answer sheets using a smartphone camera or webcam with real-time bubble confidence scoring and manual override.",
        actionButtons: [
          { name: "📸 Capture & Scan Sheet", action: "Snaps image, aligns registration anchors, and detects filled bubbles", feedback: "Grades 50 questions in 1.2 seconds with confidence percentages" },
          { name: "✏️ Verify & Override", action: "Allows teacher to inspect low-confidence bubbles and confirm intent", feedback: "Prevents marking errors and ensures transparent grading" },
          { name: "📊 Publish Scores to Gradebook", action: "Commits scores directly to student terminal records", feedback: "Updates continuous assessment ledger and student report cards" }
        ],
        formsAndInputs: ["Exam Key Selector", "Camera input stream", "Confidence threshold slider"],
        systemFeedback: "Eliminates weekend marking bottlenecks; all scans archived in audit logs."
      },
      {
        tabId: "topic-videos",
        tabName: "🎥 Class Topic Videos & Voice Notes",
        tabPurpose: "Upload or record topic videos and synchronized audio notes so students can continue learning when the teacher is absent or for revision.",
        actionButtons: [
          { name: "🎙️ Record Voice Explanation", action: "Captures microphone audio and generates synchronized waveform", feedback: "Attaches audio note to lesson topic card" },
          { name: "📤 Upload Lesson Video", action: "Encodes and stores topic video file in school repository", feedback: "Makes lesson streamable on Student Dashboard instantly" }
        ],
        formsAndInputs: ["Subject", "Class Level", "Topic Title", "Curriculum Reference Number", "Video/Audio File Picker"],
        systemFeedback: "Students receive new lesson alert; study sessions tracked in student engagement analytics."
      },
      {
        tabId: "report-cards",
        tabName: "📝 Terminal Report Card Grading",
        tabPurpose: "Compile continuous assessments, class test scores, exam marks, and teacher remarks for terminal certification.",
        actionButtons: [
          { name: "💾 Save Draft Grades", action: "Persists working grades to database", feedback: "Draft saved with timestamp" },
          { name: "🚀 Submit for Headmaster Approval", action: "Locks grade submission and routes to administration", feedback: "Headmaster receives notification to review and apply school stamp" }
        ],
        formsAndInputs: ["Subject scores (30% Class / 70% Exam)", "Teacher remarks dropdown", "Conduct assessment"],
        systemFeedback: "Calculates class rank, GPA, and subject positions automatically."
      }
    ],
    dailyChecklist: [
      "Open timetable tab to inspect morning period assignments and room numbers.",
      "Mark tick-by-tick attendance within the first 10 minutes of each lesson.",
      "Check student homework submissions and enter continuous assessment marks.",
      "Verify topic videos and voice notes are assigned for upcoming self-study sessions."
    ],
    weeklyAndTermlyChecklist: [
      "Run OMR scans for weekly quizzes and termly mock examinations.",
      "Complete terminal report card entries and submit to Headmaster for authorization.",
      "Respond to parent inquiries sent through the Real Language Translator."
    ],
    rcceCentralLinkage: {
      centralEndpoints: ["/api/v1/academics/attendance", "/api/v1/exams/scan-omr", "/api/v1/courses/materials"],
      businessRules: "Grades cannot be altered after Headmaster final publication without administrative authorization.",
      auditTrail: "Every OMR scan, mark override, and attendance entry is logged with teacher ID and timestamp.",
      downstreamEvents: "Absence SMS sent to parents; grades synchronized to Student Dashboard."
    }
  },

  STUDENT: {
    id: "STUDENT",
    role: "Student / Scholar",
    portalRoute: "/login/student",
    dashboardPath: "/portal/student/dashboard",
    badge: "SCHOLAR LEARNING & CONFERENCING",
    tagline: "Timetables, Topic Videos, Online CBT, Cooperative Conferencing & Social Lounge",
    summary: "The Student Learning Hub provides scholars with clean access to weekly timetables, homework submissions, timed CBT quizzes, topic video archives, and the brand-new Student Cooperative Conferencing & Social Lounge for voice and video study circles.",
    keyTabs: [
      {
        tabId: "timetable",
        tabName: "🗓️ Weekly Timetable & Term Countdown",
        tabPurpose: "Inspect period schedule, subject teachers, room assignments, and live countdown to school vacation.",
        actionButtons: [
          { name: "🔄 Sync Schedule", action: "Pulls published Headmaster calendar updates", feedback: "Displays exact weeks in school and vacation date" }
        ],
        formsAndInputs: ["Day of week selector", "Subject filter"],
        systemFeedback: "Always aligned with official Headmaster calendar publication."
      },
      {
        tabId: "cooperative-conferencing",
        tabName: "🎙️ Cooperative Voice & Video Conferencing & Social Lounge",
        tabPurpose: "Host or join live online study rooms and social lounges via low-data Voice Calling or HD WebRTC Video Calling for group problem-solving, debates, coding workshops, and peer socializing.",
        actionButtons: [
          { name: "🎙️ Join via Voice Calling", action: "Opens lightweight audio room with dynamic speech waveforms and active-speaker glow", feedback: "Instant audio connection with mic mute/unmute and low bandwidth consumption" },
          { name: "📹 Join via Video Calling", action: "Opens HD video conference grid with camera preview, screen sharing, and raise hand", feedback: "Collaborative multi-peer WebRTC video stream" },
          { name: "📝 Copy Shared Study Notes", action: "Copies collaborative group scratchpad to clipboard", feedback: "Copies full session notes ready for revision" },
          { name: "💬 React in Chat", action: "Sends emoji reactions (👍, ❤️, 💡, 👏, 🙋‍♂️) without interrupting speaker", feedback: "Displays floating emoji reactions on peer video feeds" }
        ],
        formsAndInputs: ["Study room selector (STEM, Debate, Coding, Social Lounge, Languages)", "Custom room code input", "Room topic input"],
        systemFeedback: "Encrypted scholar space with peer reporting and active session duration timer."
      },
      {
        tabId: "assignments",
        tabName: "📚 Homework & Project Submissions",
        tabPurpose: "Download assignment briefs, upload homework files, and review teacher feedback.",
        actionButtons: [
          { name: "📤 Submit Homework", action: "Uploads completed document or image", feedback: "Registers submission timestamp and locks draft" }
        ],
        formsAndInputs: ["File uploader", "Student notes textarea"],
        systemFeedback: "Teacher gradebook notified of completed submission."
      },
      {
        tabId: "exams",
        tabName: "🧠 CBT Online Quizzes & Timed Exams",
        tabPurpose: "Take interactive multiple-choice quizzes with countdown timer and instant score analysis.",
        actionButtons: [
          { name: "🏁 Start Timed Quiz", action: "Initiates countdown and presents randomized question bank", feedback: "Full-screen test mode activated" },
          { name: "✅ Submit Exam", action: "Grades answers immediately against master answer key", feedback: "Renders instant score, percentage, and review explanations" }
        ],
        formsAndInputs: ["Radio answer choices", "Next / Previous question buttons", "Question flag marker"],
        systemFeedback: "Score recorded in academic ledger; prevent retakes unless authorized."
      },
      {
        tabId: "library",
        tabName: "📖 Digital E-Library & Textbook Hub",
        tabPurpose: "Borrow electronic textbooks and highlight text for instant translation with meaning.",
        actionButtons: [
          { name: "📖 Read E-Book", action: "Opens in-app reader with page bookmarks", feedback: "Remembers last read page" },
          { name: "🌍 Translate Excerpt", action: "Sends highlighted sentence to Real Language Translator", feedback: "Shows grammatical meaning in student's native tongue" }
        ],
        formsAndInputs: ["Book category filter", "Search keyword input"],
        systemFeedback: "Zero external downloads required; reads directly inside browser."
      },
      {
        tabId: "report-card",
        tabName: "📄 Official Stamped Terminal Report Card",
        tabPurpose: "View and download official termly academic transcripts stamped with the registered school crest.",
        actionButtons: [
          { name: "⬇️ Download PDF Transcript", action: "Renders authenticated PDF with cryptographic validation code", feedback: "Downloads high-resolution printable report card" }
        ],
        formsAndInputs: ["Term selector", "Academic year dropdown"],
        systemFeedback: "Carries authentic school crest, teacher remarks, and Headmaster signature."
      }
    ],
    dailyChecklist: [
      "Check weekly timetable for room assignments and period subjects.",
      "Review homework deadlines in the Assignments tab and upload completed tasks.",
      "Jump into the Cooperative Conferencing Lounge for afternoon study circles or social chat.",
      "Replay teacher Topic Videos and audio notes for subjects requiring revision."
    ],
    weeklyAndTermlyChecklist: [
      "Take weekly CBT timed revision quizzes.",
      "Inspect terminal grades and download official stamped report card.",
      "Verify fee ledger status and receipts with parent."
    ],
    rcceCentralLinkage: {
      centralEndpoints: ["/api/v1/academics/quizzes", "/api/v1/portal/student/report-card", "/api/v1/meetings/student-rooms"],
      businessRules: "Strict identity check: Index number and password must match approved tenant database records.",
      auditTrail: "Logs quiz submissions, homework timestamps, and conference room participation.",
      downstreamEvents: "Notifies parents of grades and attendance in real time."
    }
  },

  PARENT: {
    id: "PARENT",
    role: "Parent & Legal Guardian",
    portalRoute: "/login/parent",
    dashboardPath: "/portal/parent/dashboard",
    badge: "GUARDIAN SAFETY & FINANCE",
    tagline: "Live Attendance, MoMo Fee Payments, Google Maps GPS & Translated Chat",
    summary: "The Parent Portal gives families complete visibility into their ward's academic and campus life. Parents receive real-time gate entry/exit alerts, pay tuition fees via MTN MoMo / Telecel / Card with instant official receipts, share emergency GPS pins on Google Maps, and converse with teachers using two-way automatic translation.",
    keyTabs: [
      {
        tabId: "children",
        tabName: "👨‍👩‍👧 My Children & Live Attendance",
        tabPurpose: "Track daily school arrival and dismissal timestamps, lesson attendance percentages, and behavioral remarks.",
        actionButtons: [
          { name: "🔄 Refresh Attendance", action: "Pulls gate turnstile and classroom check-in logs", feedback: "Displays verified presence status" }
        ],
        formsAndInputs: ["Child switcher (if multiple wards are enrolled)"],
        systemFeedback: "Instant peace of mind with verified clock-in telemetry."
      },
      {
        tabId: "fees",
        tabName: "💳 Official Multi-Gateway School Fees Checkout",
        tabPurpose: "Inspect verified student balance from the school database and settle tuition or hostel fees safely via Paystack or Hubtel (MTN MoMo, Telecel Cash, AT Money, Visa, Mastercard, or Bank Transfer) with hosted-checkout fallback.",
        actionButtons: [
          { name: "💳 Pay Tuition / Hostel Arrears", action: "Loads real student fee balance from database, starts provider checkout without ever asking for your MoMo PIN or CVV inside GBS, and verifies payment server-to-server", feedback: "Issues official printable Receipt #RCP-XXXX only after verified provider confirmation" },
          { name: "🔄 Re-Check / Switch Method", action: "Supports hosted browser checkout if no payment app is installed or switches smoothly between MoMo, Card, and Bank reference", feedback: "Cancels previous open prompt safely before opening alternative channel" }
        ],
        formsAndInputs: ["Amount (Full or policy-allowed Partial)", "Payment method selector", "Ghanaian Mobile Money phone number (10-digit)"],
        systemFeedback: "Balances update atomically across Parent, Student, Accountant, and Headmaster portals only after provider webhook verification."
      },
      {
        tabId: "reports",
        tabName: "📊 Terminal Report Cards & Academic Progress",
        tabPurpose: "Inspect continuous assessment marks, subject exam scores, class rankings, and teacher feedback.",
        actionButtons: [
          { name: "📄 View Terminal Report Card", action: "Loads official grade transcript", feedback: "Displays GPA, rank, and conduct report" }
        ],
        formsAndInputs: ["Term selector", "Academic year selector"],
        systemFeedback: "Accessible 24/7 without needing to visit the school campus."
      },
      {
        tabId: "emergency-gps",
        tabName: "📍 Google Maps Emergency Residence Pin",
        tabPurpose: "Confirm and share home GPS coordinates so school authorities can locate guardians rapidly during student health emergencies.",
        actionButtons: [
          { name: "📌 Lock My GPS Location", action: "Captures device coordinates or address and saves to emergency registry", feedback: "Coordinates synced with Headmaster Emergency Locator" }
        ],
        formsAndInputs: ["Residential digital address input", "Alternate emergency phone numbers"],
        systemFeedback: "Worldwide geocoding ensures parents across any country can register their coordinates."
      },
      {
        tabId: "messaging",
        tabName: "💬 Translated Teacher & Headmaster Chat",
        tabPurpose: "Communicate directly with class teachers in English, Twi, Ga, Ewe, Hausa, French, Spanish, or Arabic with instant two-way translation.",
        actionButtons: [
          { name: "📤 Send Message", action: "Translates and dispatches note to teacher's portal", feedback: "Delivery confirmed with recipient read receipt" }
        ],
        formsAndInputs: ["Recipient selector (Class Teacher / Headmaster)", "Language selector", "Message text"],
        systemFeedback: "Bridges language barriers between parents and educators effortlessly."
      }
    ],
    dailyChecklist: [
      "Check morning gate entry notification to verify child arrived safely.",
      "Review daily attendance and homework completion alerts.",
      "Check messages from teachers in the translated messaging hub."
    ],
    weeklyAndTermlyChecklist: [
      "Review weekly assessment scores and subject progress.",
      "Pay term tuition fees via Mobile Money and download official PDF receipts.",
      "Review terminal report card and schedule parent-teacher meetings."
    ],
    rcceCentralLinkage: {
      centralEndpoints: ["/api/v1/payments/momo", "/api/v1/parent/wards", "/api/v1/emergency/pin"],
      businessRules: "Parents can only access records of their verified biological or legal wards.",
      auditTrail: "Financial transactions generate immutable ledger entries with transaction hashes.",
      downstreamEvents: "Tuition payments instantly update Accountant and Headmaster ledgers."
    }
  },

  ACCOUNTANT: {
    id: "ACCOUNTANT",
    role: "Accountant & Bursar",
    portalRoute: "/login/accountant",
    dashboardPath: "/portal/accountant/dashboard",
    badge: "FINANCE & ZERO-LEAKAGE LEDGER",
    tagline: "Class Fee Templates, MoMo Reconciliations, Arrears SMS & Staff Payroll",
    summary: "The Accountant and Bursar Portal provides complete financial oversight over tuition fee structures, multi-channel payment reconciliation (Cash, Bank, Mobile Money), overdue fee notifications, and staff payroll calculations with SSNIT and tax deductions.",
    keyTabs: [
      {
        tabId: "fee-structures",
        tabName: "💵 Class Fee Schedule & Templates",
        tabPurpose: "Configure tuition, ICT lab, sports, boarding, and meal fees per class level.",
        actionButtons: [
          { name: "➕ Create Fee Template", action: "Defines class fee components and due dates", feedback: "Applies fee schedule across all enrolled scholars in that class" }
        ],
        formsAndInputs: ["Class level dropdown", "Fee item names & amounts", "Due dates"],
        systemFeedback: "Student ledgers initialized with accurate debit balances."
      },
      {
        tabId: "gateways",
        tabName: "🌐 Payment Gateways & Provider Verification",
        tabPurpose: "Verify Paystack, Hubtel, and Bank Transfer transaction references server-to-server, inspect webhook logs, confirm bank deposits, manage refunds/reversals, and configure school merchant subaccounts.",
        actionButtons: [
          { name: "Verify with Provider", action: "Calls official Paystack or Hubtel verification API using transaction reference GBS-FEE-...", feedback: "Confirms true status, posts receipt if missing, or flags amount mismatches UNDER_REVIEW" },
          { name: "Sync Pending Transactions / Confirm Bank Slip", action: "Reconciles open transactions with missing webhook notifications or confirms verified commercial bank deposits", feedback: "Updates StudentInvoice balance and Financial Reports immediately" }
        ],
        formsAndInputs: ["Transaction Reference lookup", "Gateway config (Subaccount, Hubtel Merchant Account, Bank details)"],
        systemFeedback: "Strict double-credit prevention and immutable audit trail on every receipt and refund."
      },
      {
        tabId: "arrears",
        tabName: "📢 Arrears & Bulk SMS Reminders",
        tabPurpose: "Identify overdue balances and dispatch polite SMS fee reminders to parents with one click.",
        actionButtons: [
          { name: "📲 Dispatch Arrears SMS Batch", action: "Broadcasts personalized balance reminders", feedback: "Queues SMS notifications with exact amount due and payment instructions" }
        ],
        formsAndInputs: ["Minimum overdue balance filter", "Class filter"],
        systemFeedback: "Drives timely tuition fee collection."
      },
      {
        tabId: "payroll",
        tabName: "👥 Staff Payroll & Payslip Engine",
        tabPurpose: "Calculate net salaries, SSNIT deductions, income taxes (PAYE), and issue digital payslips.",
        actionButtons: [
          { name: "⚡ Run Monthly Payroll", action: "Calculates salaries based on attendance and grade tiers", feedback: "Generates payroll summary and individual payslip PDFs" }
        ],
        formsAndInputs: ["Month/Year selector", "Bonus/Deduction inputs"],
        systemFeedback: "Synced with HR portal; immutable payroll audit trail logged."
      }
    ],
    dailyChecklist: [
      "Review morning Mobile Money and bank payment feeds.",
      "Issue stamped receipts for walk-in cash and bank draft deposits.",
      "Reconcile daily cash register and verify bank deposit slips."
    ],
    weeklyAndTermlyChecklist: [
      "Review fee collection rates across classes and dispatch arrears SMS batches.",
      "Execute monthly staff payroll and generate digital payslip PDFs.",
      "Generate termly financial audit reports for the Headmaster and Board of Directors."
    ],
    rcceCentralLinkage: {
      centralEndpoints: ["/api/v1/payments/reconcile", "/api/v1/payroll/run", "/api/v1/notifications/bulk-sms"],
      businessRules: "Zero balance alterations without cryptographic audit receipt; all deletions strictly prevented.",
      auditTrail: "Every transaction, reconciliation, and payroll execution logged permanently in PostgreSQL.",
      downstreamEvents: "Payment updates reflected on Parent Dashboard and Student fee history instantly."
    }
  },

  STAFF: {
    id: "STAFF",
    role: "Non-Teaching Staff & Security",
    portalRoute: "/login/staff",
    dashboardPath: "/portal/staff/dashboard",
    badge: "GATE SECURITY & FLEET TELEMETRY",
    tagline: "Biometric Turnstiles, Guardian Pickup QR, Bus GPS & Leave Requests",
    summary: "The Staff Portal connects non-teaching personnel—including campus security officers, bus drivers, caretakers, and laboratory attendants. Features campus gate QR pickup verification to protect students, live school bus fleet manifests, and digital leave applications.",
    keyTabs: [
      {
        tabId: "turnstile",
        tabName: "🛡️ Campus Gate Turnstile & QR Pickup",
        tabPurpose: "Scan authorized parent/guardian QR tokens before allowing students to depart campus at dismissal.",
        actionButtons: [
          { name: "📷 Scan Guardian QR Token", action: "Verifies parent identity and student authorization", feedback: "Shows green 'RELEASE AUTHORIZED' indicator with parent photo" }
        ],
        formsAndInputs: ["Camera QR scanner", "Manual student index lookup"],
        systemFeedback: "Guarantees 100% child protection; exit timestamp recorded."
      },
      {
        tabId: "bus-fleet",
        tabName: "🚌 School Bus Fleet Manifest & GPS",
        tabPurpose: "Record student boarding at each bus stop and transmit live GPS coordinates to parents and administrators.",
        actionButtons: [
          { name: "📍 Start Bus Route", action: "Activates vehicle GPS beacon and loads passenger roster", feedback: "Parents receive notification that bus is on route" },
          { name: "✅ Mark Student Boarded", action: "Checks student into vehicle manifest", feedback: "Parent receives SMS confirmation of boarding" }
        ],
        formsAndInputs: ["Route selector (e.g. Route A - East Legon)", "Student roster checklist"],
        systemFeedback: "Parents track live bus location on Google Maps."
      },
      {
        tabId: "duty-roster",
        tabName: "📋 Daily Duty Roster & Clock-In",
        tabPurpose: "Check shift duty assignments, patrol areas, and clock in via biometric device or mobile portal.",
        actionButtons: [
          { name: "⏰ Clock In Shift", action: "Records shift start with GPS and timestamp", feedback: "Shift registered in HR attendance system" }
        ],
        formsAndInputs: ["Shift notes", "Incident report textarea"],
        systemFeedback: "Provides transparent shift auditing across campus."
      },
      {
        tabId: "leave",
        tabName: "📝 Staff Leave Requests & Payslips",
        tabPurpose: "Submit casual or medical leave requests and download monthly HR-approved payslips.",
        actionButtons: [
          { name: "📄 Submit Leave Request", action: "Routes application to HR and Headmaster", feedback: "Status tracking visible on portal" },
          { name: "⬇️ Download Payslip", action: "Downloads official branded monthly payslip PDF", feedback: "Contains salary, allowances, and tax breakdown" }
        ],
        formsAndInputs: ["Leave type dropdown", "Start date", "End date", "Reason textarea"],
        systemFeedback: "Automated routing through HR approval hierarchy."
      }
    ],
    dailyChecklist: [
      "Clock in at shift start using biometric scanner or mobile portal.",
      "Check morning bus route passenger manifest and broadcast live GPS.",
      "Staff campus gate turnstiles and scan guardian QR pickup tokens at dismissal."
    ],
    weeklyAndTermlyChecklist: [
      "Submit weekly security and maintenance inspection logs.",
      "Review monthly salary payslip and leave balance.",
      "Inspect bus fleet vehicle health and safety equipment."
    ],
    rcceCentralLinkage: {
      centralEndpoints: ["/api/v1/staff/gate-scan", "/api/v1/transport/telemetry", "/api/v1/hr/leave"],
      businessRules: "Unauthorized guardians cannot release students without administrative override.",
      auditTrail: "Every QR scan, bus stop check, and clock-in is timestamped and archived.",
      downstreamEvents: "Parents receive immediate push and SMS alerts when children board buses or exit gate."
    }
  },

  HR: {
    id: "HR",
    role: "HR & Personnel Directorate",
    portalRoute: "/login/staff",
    dashboardPath: "/portal/hr/dashboard",
    badge: "PERSONNEL & ATTENDANCE AUDIT",
    tagline: "Staff Registry, Biometric Turnstile Logs, Leave Adjudication & Salary Tiers",
    summary: "The HR Management Portal coordinates teaching and non-teaching personnel, monitors turnstile punctuality logs, adjudicates leave applications, balances faculty workloads, and synchronizes verified attendance data with the Accountant's payroll.",
    keyTabs: [
      {
        tabId: "directory",
        tabName: "👥 Staff Registry & Profiles",
        tabPurpose: "Maintain comprehensive employee records, academic qualifications, employment contracts, and salary tiers.",
        actionButtons: [
          { name: "➕ Onboard New Employee", action: "Creates employee profile and assigns staff ID", feedback: "Generates onboarding credentials and routes to Headmaster for approval" }
        ],
        formsAndInputs: ["Full Name", "National ID", "Department", "Salary Tier", "Contract Type"],
        systemFeedback: "Staff record synchronized across institutional databases."
      },
      {
        tabId: "biometric-audit",
        tabName: "⏱️ Biometric Turnstile Clock-In Audits",
        tabPurpose: "Audit daily clock-in and clock-out timestamps from hardware turnstiles, detect late arrivals, and track absenteeism.",
        actionButtons: [
          { name: "📊 Export Attendance Audit", action: "Compiles monthly staff punctuality ledger", feedback: "Renders spreadsheet report with work hours and overtime" }
        ],
        formsAndInputs: ["Department filter", "Date range picker"],
        systemFeedback: "Directly drives monthly payroll calculation without manual timesheets."
      },
      {
        tabId: "leave-adjudication",
        tabName: "📅 Leave Adjudication & Approvals",
        tabPurpose: "Review, approve, or reject staff leave applications with automatic balance deduction.",
        actionButtons: [
          { name: "✅ Approve Leave", action: "Authorizes leave and updates staff calendar", feedback: "Notifies employee via SMS and logs coverage arrangements" },
          { name: "❌ Decline", action: "Returns request with mandatory reason for refusal", feedback: "Notifies employee with administrative explanation" }
        ],
        formsAndInputs: ["Approval remarks", "Coverage teacher assignment"],
        systemFeedback: "Syncs leave deductions directly to Accountant payroll."
      }
    ],
    dailyChecklist: [
      "Review morning turnstile clock-in log for staff punctuality.",
      "Review and process pending leave applications.",
      "Ensure substitute coverage for absent teaching faculty."
    ],
    weeklyAndTermlyChecklist: [
      "Compile monthly attendance and overtime report for Accountant payroll.",
      "Review staff appraisal records and contract renewals.",
      "Audit employee certification credentials and regulatory compliance."
    ],
    rcceCentralLinkage: {
      centralEndpoints: ["/api/v1/hr/employees", "/api/v1/hr/biometrics", "/api/v1/hr/leave/adjudicate"],
      businessRules: "Leave cannot be approved without verifying remaining leave balance.",
      auditTrail: "All HR approvals and salary tier modifications logged permanently.",
      downstreamEvents: "Updates staff portal leave status and Accountant payroll engine."
    }
  },

  ALUMNI: {
    id: "ALUMNI",
    role: "Alumni & Convocation Network",
    portalRoute: "/login/student",
    dashboardPath: "/portal/alumni/dashboard",
    badge: "TRANSCRIPTS & ENDOWMENTS",
    tagline: "Cryptographic Transcripts, Degree Verification, Endowments & Mentorship",
    summary: "The Alumni Network keeps graduates connected with their alma mater. Features cryptographic transcript requests for international university admissions, employer degree verification, donation pledges for campus development, and career mentorship circles.",
    keyTabs: [
      {
        tabId: "transcripts",
        tabName: "📜 Official Transcript Ordering",
        tabPurpose: "Order authenticated academic transcripts stamped with cryptographic seals for employers and universities.",
        actionButtons: [
          { name: "📄 Request Official Transcript", action: "Generates certified transcript with digital verification QR", feedback: "Routes order to Headmaster for dispatch" }
        ],
        formsAndInputs: ["Destination university/organization address", "Number of certified copies"],
        systemFeedback: "Tamper-evident document verifiable by any university worldwide."
      },
      {
        tabId: "verify",
        tabName: "🔍 Employer Degree & Credential Verification",
        tabPurpose: "Employers and admissions offices can verify graduation credentials using digital certificate codes.",
        actionButtons: [
          { name: "🔍 Verify Certificate Code", action: "Validates code against graduation registry", feedback: "Displays verified graduate name, honors, and completion year" }
        ],
        formsAndInputs: ["Certificate Serial Number (e.g. CERT-2024-8812)"],
        systemFeedback: "Instant cryptographic credential validation."
      },
      {
        tabId: "endowments",
        tabName: "🤝 Alma Mater Endowments & Pledges",
        tabPurpose: "Contribute donations via Mobile Money or Card to school development projects (STEM lab, sports complex, scholarship funds).",
        actionButtons: [
          { name: "💳 Settle Endowment Contribution", action: "Processes payment directly to school project fund", feedback: "Issues official donor receipt and adds donor to Convocation Hall of Honor" }
        ],
        formsAndInputs: ["Project selector", "Pledge amount", "Payment method"],
        systemFeedback: "Credited transparently to school capital development ledger."
      }
    ],
    dailyChecklist: [
      "Review alumni mentorship circle discussion boards.",
      "Process incoming credential verification requests from employers."
    ],
    weeklyAndTermlyChecklist: [
      "Track endowment pledge fulfillment and project milestones.",
      "Organize annual convocation events and alumni reunions."
    ],
    rcceCentralLinkage: {
      centralEndpoints: ["/api/v1/alumni/transcripts", "/api/v1/alumni/verify", "/api/v1/alumni/endowments"],
      businessRules: "Transcripts cannot be released if graduate has un-cleared library or property holds.",
      auditTrail: "Every verification request and endowment payment logged in the central vault.",
      downstreamEvents: "Endowment funds notify Accountant and Headmaster ledgers."
    }
  },

  INVENTORY: {
    id: "INVENTORY",
    role: "Inventory & Stores Directorate",
    portalRoute: "/login/staff",
    dashboardPath: "/portal/inventory/dashboard",
    badge: "STOCK LEDGER & STORES AUDIT",
    tagline: "Real-Time Stock Quantities, Reorder Alerts, Requisitions & Supplier POs",
    summary: "The Inventory & Stores Portal provides tracking over textbooks, science laboratory chemicals, uniforms, ICT equipment, maintenance tools, and kitchen provisions. Features automated low-stock reorder thresholds and departmental requisition approvals.",
    keyTabs: [
      {
        tabId: "stock-ledger",
        tabName: "📦 Real-Time Stock Ledger & Catalog",
        tabPurpose: "Track item quantities, unit costs, storage bin locations, and expiration dates across campus stores.",
        actionButtons: [
          { name: "➕ Register New Stock Item", action: "Adds catalog entry with reorder threshold", feedback: "Item barcode generated and tracked in store database" }
        ],
        formsAndInputs: ["Item Name", "Category (Textbook, Lab Reagent, Uniform, ICT)", "Initial Qty", "Reorder Level"],
        systemFeedback: "Real-time stock balance updated upon every requisition."
      },
      {
        tabId: "requisitions",
        tabName: "📋 Departmental Requisitions",
        tabPurpose: "Review and fulfill supply requests from academic departments, science teachers, and sports coaches.",
        actionButtons: [
          { name: "✅ Approve & Issue Items", action: "Deducts items from stock and issues dispatch voucher", feedback: "Receiving department notified for item pickup" }
        ],
        formsAndInputs: ["Requisition ID search", "Department selector"],
        systemFeedback: "Prevents duplicate orders and tracks resource consumption per department."
      },
      {
        tabId: "purchase-orders",
        tabName: "📑 Supplier Purchase Orders & Goods Received",
        tabPurpose: "Generate formal purchase orders to vendors and verify incoming delivery quantities against Goods Received Notes (GRN).",
        actionButtons: [
          { name: "📝 Issue Supplier PO", action: "Generates official PO document with tenant letterhead", feedback: "Routes PO to Accountant for budget approval" },
          { name: "📦 Confirm GRN Delivery", action: "Receives shipment and adds stock to ledger", feedback: "Updates inventory quantities and notifies Accountant of invoice" }
        ],
        formsAndInputs: ["Supplier name", "Item lines", "Agreed unit price"],
        systemFeedback: "Enforces transparent procurement and prevents vendor overcharges."
      }
    ],
    dailyChecklist: [
      "Review low-stock alerts and generate supplier purchase orders.",
      "Process daily departmental store requisitions for classroom and lab supplies.",
      "Inspect incoming vendor deliveries and confirm Goods Received Notes (GRN)."
    ],
    weeklyAndTermlyChecklist: [
      "Conduct physical inventory stock counts and reconcile against system ledger.",
      "Quarantine expired science laboratory chemicals or damaged equipment.",
      "Submit quarterly procurement budget utilization reports to Headmaster."
    ],
    rcceCentralLinkage: {
      centralEndpoints: ["/api/v1/inventory/items", "/api/v1/inventory/requisitions", "/api/v1/inventory/purchase-orders"],
      businessRules: "Items cannot be dispatched without approved departmental requisition.",
      auditTrail: "Every stock adjustment, GRN, and issue voucher carries cryptographic storekeeper signatures.",
      downstreamEvents: "Supplier purchase orders route directly to Accountant for payment clearance."
    }
  },

  DEVELOPER: {
    id: "DEVELOPER",
    role: "Platform Chief Developer Command",
    portalRoute: "/developer-control-center/login",
    dashboardPath: "/developer-control-center/dashboard",
    badge: "PLATFORM CONTROL & GOVERNANCE",
    tagline: "School Signups, Photo Checks, Subscriptions & Auto-Lock, Payment Gateways, Backups & GPS Map",
    summary: "The Developer Control Center governs all schools across 16 clear tabs: School Signups & Approvals, Headmaster Photo Checks, Login & Security Alerts, Headmaster Messages, Network & Server Control, Server Health & Subscriptions (GH₵ 3/5/10 tiers + MoMo 0554594193 renewals), Database Backups, System Alerts, App Releases, Activity History, School Licenses, Security & Face Access, School Locations GPS Map, Database & Recovery, Campus Map & Sensors, and Payment Gateways Administration.",
    keyTabs: [
      {
        tabId: "onboarding",
        tabName: "🏫 School Signups & Approvals",
        tabPurpose: "Inspect newly registered schools, verify Headmaster credentials/photo & OTP, approve to brand all dashboards to the exact registered school name, or manage Demo/Live mode.",
        actionButtons: [
          { name: "✅ Approve Institution", action: "Provisions school tenant, activates portals, and brands dashboards to official school name", feedback: "Headmaster alerted with verified tenant code" },
          { name: "🔒 Lock / Suspend Institution", action: "Enforces immediate access lock for unpaid or suspended schools while preserving records", feedback: "Blocks user logins safely without deleting institutional data" },
          { name: "🗑️ Permanent Delete", action: "Removes revoked institution records under strict developer authorization", feedback: "Tenant unlinked and audit logged" }
        ],
        formsAndInputs: ["School Name", "Tenant Code", "Country", "Subscription Tier (Basic/JHS GH₵3 / SHS GH₵5 / Tertiary GH₵10)", "Student Count"],
        systemFeedback: "Approved institutions gain immediate branded access across all portals."
      },
      {
        tabId: "payment_admin",
        tabName: "💳 Payment Gateways & Webhook Administration",
        tabPurpose: "Configure Paystack/Hubtel subaccount routing and TEST/LIVE modes per school (secret keys remain masked in server env), inspect transaction audit logs, retry failed webhooks, and reconcile pending payments.",
        actionButtons: [
          { name: "Sync Pending Transactions / Retry Failed Webhooks", action: "Triggers server-to-server reconciliation for delayed notifications and reprocesses queued webhooks", feedback: "Updates pending transactions atomically without double-crediting" },
          { name: "Verify with Provider", action: "Validates any reference directly against Paystack or Hubtel APIs", feedback: "Displays verified status, receipt number, and masked channel telemetry" }
        ],
        formsAndInputs: ["Gateway Mode (TEST / LIVE)", "Paystack Subaccount / Hubtel Merchant Account / Bank Details", "Enabled Channels"],
        systemFeedback: "Full multi-school payment isolation with zero frontend secret exposure."
      },
      {
        tabId: "auto-lock",
        tabName: "⏱️ Automated 7-Day Grace Lockout Engine",
        tabPurpose: "Monitor subscription expiry dates, trigger 14-day advance notices, grant 7-day grace periods, and execute automated read-only lockout upon final default.",
        actionButtons: [
          { name: "⚡ Run Auto-Lock Policy Audit", action: "Scans all tenant subscription expiration dates against current timestamp", feedback: "Moves expired accounts into 7-day grace and locks past-due tenants" },
          { name: "⏳ Extend Grace Period", action: "Grants administrative temporary extension with reason", feedback: "Logs extension audit and updates lock countdown" }
        ],
        formsAndInputs: ["Grace period duration slider", "Notice lead time input"],
        systemFeedback: "Enforces commercial revenue protection automatically without manual intervention."
      },
      {
        tabId: "live-map",
        tabName: "🗺️ Worldwide Live Registered Schools GPS Map",
        tabPurpose: "Display all registered schools worldwide on Google Maps with real-time health indicators, student populations, and live route telemetry.",
        actionButtons: [
          { name: "🌐 Global Map View", action: "Renders interactive Google Map showing all active schools", feedback: "Plots green/amber/red operational pins worldwide" },
          { name: "📍 Zoom to Tenant Campus", action: "Focuses map on specific school coordinates", feedback: "Pulls street and satellite view of campus location" }
        ],
        formsAndInputs: ["Country filter", "Search school name or tenant ID"],
        systemFeedback: "Worldwide geocoding without geographic restriction."
      },
      {
        tabId: "sentinel",
        tabName: "🛡️ Intrusion Sentinel & Security Shield",
        tabPurpose: "24/7 monitoring of failed login bursts, automated IP banning, cryptographic session validation, and database backup verification.",
        actionButtons: [
          { name: "🚫 Ban Suspicious IP", action: "Blacklists malicious IP address at API gateway", feedback: "IP blocked from all tenant gateways immediately" },
          { name: "💾 Trigger Master DB Backup", action: "Executes full PostgreSQL database snapshot", feedback: "Encrypted snapshot written to disaster recovery vault" }
        ],
        formsAndInputs: ["IP address input", "Failed login threshold slider"],
        systemFeedback: "Maintains 99.99% system availability and zero data breaches."
      },
      {
        tabId: "video-support",
        tabName: "📹 WebRTC Live Video Developer Support",
        tabPurpose: "Launch direct encrypted live video calls with school headmasters and technical administrators for diagnostic troubleshooting.",
        actionButtons: [
          { name: "📞 Initiate Support Call", action: "Opens WebRTC video room with target school administrator", feedback: "Direct high-definition audio and video diagnostic session active" }
        ],
        formsAndInputs: ["Tenant selector", "Support ticket reference"],
        systemFeedback: "Immediate technical problem resolution."
      }
    ],
    dailyChecklist: [
      "Review morning tenant onboarding queue and approve newly registered institutions.",
      "Check the Automated 7-Day Grace Lockout Engine telemetry for overdue subscriptions.",
      "Audit Intrusion Sentinel logs for blocked intrusion attempts and abnormal traffic bursts.",
      "Verify global PostgreSQL database backup completion and replica sync."
    ],
    weeklyAndTermlyChecklist: [
      "Audit per-student subscription revenue across all active tenants ($3 / $5 / $10 tiers).",
      "Inspect the Worldwide Live Registered Schools GPS Map for new international school locations.",
      "Review platform API latency metrics, server CPU/memory loads, and database query health."
    ],
    rcceCentralLinkage: {
      centralEndpoints: ["/api/v1/developer/tenants", "/api/v1/developer/auto-lock", "/api/v1/developer/sentinel", "/api/v1/developer/support-video"],
      businessRules: "Developer commands possess highest sovereignty: Can approve, brand, lock, or wipe any tenant globally.",
      auditTrail: "All Developer actions generate cryptographic, immutable audit logs.",
      downstreamEvents: "Tenant approvals immediately push branding events to all user dashboards worldwide."
    }
  }
};
