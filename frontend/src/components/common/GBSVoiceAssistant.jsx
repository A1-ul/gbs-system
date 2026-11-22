import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import apiClient from "../../api/client/apiClient";
import { getLanguageProfile } from "../../utils/i18nCountryEngine";

/**
 * GBS AI Voice Assistant (Real-Time System-Memory Linked Continuous Assistant)
 *
 * Linked directly to backend System Memory (/api/v1/ai/system-memory & /assistant-query):
 * - Speaks introduction asking what action, command, activity, or information the user wants on GBS SYSTEM.
 * - Responds immediately (<600ms) when the user finishes speaking a statement.
 * - Explains any GBS module, pricing, Clinic, University Hub, Institution Separation, Defaulters, SMS, Translator, etc.
 * - Keeps continuous listening loop asking whether we are done or there is another until user confirms done/sleep.
 */
const DEVELOPER_NONDISCLOSURE_PATTERN = /\b(developer|dev\s*portal|mission\s*control|motherland|system\s*creator|platform\s*owner|who\s*(built|made|created)\s*gbs|developer\s*(login|dashboard|credentials|passcode|vault|payout|telemetry)|unlock\s*developer)\b/i;

const LOCAL_MEMORY_TOPICS = [
  {
    id: "developer_nondisclosure",
    phrases: ["developer login", "developer dashboard", "who created gbs", "who built gbs", "dev portal", "mission control"],
    keywords: ["developer", "motherland"],
    answer:
      "I do not disclose developer details, internal engineering controls, or developer portal information. I can explain the exact portals and daily activities for institutional users: Headmaster/Admin, Teacher/Lecturer, School Secretary, Student, Parent/Guardian, Accountant/Bursar, Non-Teaching Staff, HR Officer, and Alumni.",
    tab: null
  },
  {
    id: "role_headmaster",
    phrases: ["headmaster portal", "admin portal", "principal portal", "headmaster dashboard", "admin dashboard", "headmaster role"],
    keywords: ["headmaster", "principal", "chancellor", "rector", "provost"],
    answer:
      "The Headmaster / Principal Portal (/portal/admin/dashboard) includes Pending Staff & Admissions Approvals, Staff Duty Attendance Monitor (+2h auto clock-out), School Stationery Price Authority Desk (exclusive control to set official Textbook, Cardigan, Socks, and School Bag prices), Live Faculty & Parent Video/Voice Conferences, Academics/Timetables/Defaulters Compliance, All-Campus School Clinic & Sickbay Registry, Bus Transport, and 4-Month Term Trial / Per-Student Subscription Management.",
    route: "/portal/admin/dashboard"
  },
  {
    id: "role_teacher",
    phrases: ["teacher portal", "lecturer portal", "teacher dashboard", "lecturer dashboard", "teacher role", "lecturer role", "teacher activities", "faculty portal", "know about the teacher", "about the teacher"],
    keywords: ["teacher", "lecturer", "faculty", "instructor", "educator"],
    answer:
      "The Teacher / Lecturer Portal (/portal/teacher/dashboard) connects Faculty directly to Staff Duty Clock-In, Daily Student Attendance Roll Call, Class Topic Video Platform (upload/record lessons), Assignments & Homework Grading, AI-Proctored Exam Creation & Live Camera Wall (issue warnings, save evidence snapshots, deduct lost marks), High-Speed Live Class & Parent Video/Voice Calls, Tier Academics & University/TVET Placements, Defaulters Compliance Monitor, School Stationery Catalog & Requests, Direct SMS Inbox, and Personal Clinic Health Dossier.",
    route: "/portal/teacher/dashboard"
  },
  {
    id: "role_secretary",
    phrases: ["secretary portal", "secretary dashboard", "school secretary", "front desk portal", "secretary role", "secretary activities", "about the secretary"],
    keywords: ["secretary", "visitor log", "circular", "official letter", "appointment", "appointments", "minutes", "reception"],
    answer:
      "The School Secretary Portal (/portal/secretary/dashboard) manages Front-Desk Campus Visitor Check-In/Out Logs, Official Letters, Circulars, Certificates & Meeting Minutes, Headmaster Appointments Scheduling, Staff Duty Clock-In, School Stationery Store Sales & Expenses (auto-synced directly to Accountant Expenses Ledger), Direct SMS & Voice Notes, Live Video/Voice Calls, and Personal Clinic Health Dossier.",
    route: "/portal/secretary/dashboard"
  },
  {
    id: "role_student",
    phrases: ["student portal", "student dashboard", "student role", "student activities", "about the student", "undergraduate portal"],
    keywords: ["student", "pupil", "apprentice", "undergraduate", "learner"],
    answer:
      "The Student Portal (/portal/student/dashboard) gives learners their Live Timetable, Class Topic Video Player, Homework Submissions, Report Cards, AI-Proctored Exam Runner & Live Cooperative Study Rooms, separated Internships & Academic Attachments (for TVET/University), School Stationery Catalog & Requests, Fee Balance & MoMo/Card Checkout, Bus Transport, and Self-Only Clinic Health Record.",
    route: "/portal/student/dashboard"
  },
  {
    id: "role_parent",
    phrases: ["parent portal", "guardian portal", "parent dashboard", "parent role", "guardian role", "parent activities", "about the parent"],
    keywords: ["parent", "guardian", "mother", "father", "ward"],
    answer:
      "The Parent / Guardian Portal (/portal/parent/dashboard) provides Linked Ward Switching, Attendance & Report Card Monitoring, Tuition Payment via Any Phone MoMo/Card, Headmaster-Priced School Stationery Catalog & Orders, Live Video/Voice Calls with Headmaster & Teachers, Direct SMS & Voice Notes, Bus Transit Status, and Linked Ward Clinic Health Info.",
    route: "/portal/parent/dashboard"
  },
  {
    id: "role_accountant",
    phrases: ["accountant portal", "bursar portal", "finance portal", "accountant dashboard", "bursar dashboard", "accountant role", "about the accountant"],
    keywords: ["accountant", "bursar", "treasury", "auditing", "bookkeeping"],
    answer:
      "The Accountant / Bursar Portal (/portal/accountant/dashboard) operates Financial Telemetry, Class Fee Structures & Student Invoices, Multi-Gateway MoMo/Card Payment Reconciliation, School Stationery Revenue & Auto-Synced Expenses Audit (STATIONERY_SUPPLIES), Operating Expenses Ledger, HR Payroll & Loans, GAAP/IFRS Statements, and Personal Clinic Access.",
    route: "/portal/accountant/dashboard"
  },
  {
    id: "role_staff",
    phrases: ["staff portal", "staff dashboard", "non-teaching staff", "staff role", "staff activities", "about the staff"],
    keywords: ["non-teaching", "storekeeper", "logistics"],
    answer:
      "The Non-Teaching Staff Portal (/portal/staff/dashboard) handles Staff Duty Clock-In (+2h auto-clock-out), Campus Inventory & Asset Tracking, School Stationery Sales & Expense Sync to Accountancy, Transport Dispatch, Leave Requests, Live Calls, and Personal Clinic Health Dossier.",
    route: "/portal/staff/dashboard"
  },
  {
    id: "role_hr",
    phrases: ["hr portal", "hr dashboard", "human resource portal", "hr role", "hr activities"],
    keywords: ["hr", "human resource", "personnel", "contracts"],
    answer:
      "The Human Resources (HR) Portal (/portal/hr/dashboard) oversees Personnel Directories, Contracts, Leave Approvals, Staff Attendance Audits with the Headmaster, Payroll Grading, Staff Loans, and Personal Clinic Health Access.",
    route: "/portal/hr/dashboard"
  },
  {
    id: "role_alumni",
    phrases: ["alumni portal", "alumni dashboard", "alumni role", "alumni activities"],
    keywords: ["alumni", "former student", "graduated"],
    answer:
      "The Alumni Portal (/portal/alumni/dashboard) gives graduated cohorts Verified Academic Transcripts, Honours Tracking, Reunions, Mentorship, and Institutional Endowment Pledges.",
    route: "/portal/alumni/dashboard"
  },
  {
    id: "school_stationery",
    phrases: ["school stationery", "stationery store", "stationary store", "school items", "who sets the price", "stationery expense"],
    keywords: ["stationery", "stationary", "textbook", "textbooks", "cardigan", "cardigans", "socks", "school bag", "school bags", "exercise book", "uniforms", "bookshop"],
    answer:
      "School Stationery Store displays Textbooks, Cardigans, School Socks, School Bags, Exercise Books, and Uniforms across every dashboard. Strictly ONLY the Headmaster can set or edit prices. Secretaries, Staff, and Accountants record sales and store expenses, and all stationery expenses sync automatically into the Accountant Expenses Ledger (STATIONERY_SUPPLIES) for auditing.",
    tab: "stationery"
  },
  {
    id: "clinic",
    phrases: ["school clinic", "medical record", "sickbay treatment", "health dossier"],
    keywords: ["clinic", "sickbay", "medical", "health", "doctor", "nurse", "sick", "hospital", "medicine", "blood", "genotype", "allergy"],
    answer:
      "In the GBS School Clinic, privacy is strictly enforced: regular users (Student, Teacher, Secretary, Staff, HR, Accountant) only view their own personal health profile and visit history, and Parents only view their linked ward's health profile — without clinic admin queues or other people's data. Only the Headmaster sees all Staff and Student clinic profiles, Sickbay admissions, treatments, and pharmacy stock on the Headmaster Dashboard.",
    tab: "clinic"
  },
  {
    id: "academics_placements",
    phrases: ["industrial internship", "academic attachment", "topic video", "lesson stream"],
    keywords: ["internship", "attachment", "src", "prefect", "stream", "evening", "weekend", "sandwich", "regular", "degree", "cgpa", "wassce", "bece"],
    answer:
      "Every school operates natively inside its main Academics and Courses portal: Nursery to JHS manages Terms 1–3, BECE prep, Houses, and Prefects; Senior High School manages WASSCE Tracks, Houses, and Prefect Council; TVET manages Trade Practicals, Attachments, Shift Streams, and Workshop Captains; University manages separated Industrial Internships (INT) and Academic & Field Attachments (ATT), GPA/CGPA grading, Regular/Evening/Sandwich/Weekend streams, SRC governance, and Alumni graduation.",
    tab: "academics"
  },
  {
    id: "all_roles_explained",
    phrases: ["each user", "every portal", "all portals", "all roles", "all users", "explain roles"],
    keywords: ["roles", "responsibilities", "dashboards", "duties"],
    answer:
      "GBS links 9 institutional portals: Headmaster/Admin (approvals, stationery pricing, all clinic dossiers, term renewals), Teacher/Lecturer (attendance, topic videos, AI-proctored exams, live class calls, placements), School Secretary (visitor logs, official letters/circulars, appointments, stationery sales & expenses), Student (timetables, proctored exams, homework, stationery orders), Parent (ward progress, MoMo fee checkout, calls), Accountant (invoices, payroll, synced stationery expense audit), Non-Teaching Staff (inventory, stationery, transport), HR (contracts, leave, attendance audits), and Alumni (transcripts & pledges).",
    tab: null
  },
  {
    id: "institutions",
    phrases: ["institution type", "institution tier", "nursery to jhs", "senior high school"],
    keywords: ["jhs", "shs", "technical", "tvet", "separate", "nursery", "difference", "university"],
    answer:
      "GBS automatically adapts to the registered institution across Nursery to JHS, Senior High School, Technical TVET, and University so classes, assessments, terms, placements, and student leadership match how your exact institution operates."
  },
  {
    id: "defaulters",
    phrases: ["defaulters monitor", "missed exam", "did not partake"],
    keywords: ["defaulter", "absent", "not coming", "partake", "unsubmitted", "compliance"],
    answer:
      "The Compliance and Defaulters Monitor calculates exact student counts and clickable rosters for students who did not partake in exams, did not submit assignments, or have not been coming to school, with direct warning alerts.",
    tab: "defaulters"
  },
  {
    id: "pricing",
    phrases: ["free trial", "term free trial", "4 months", "4 month trial", "per student", "subscription plan", "how much"],
    keywords: ["price", "pricing", "cost", "fee rate", "subscription", "discount", "trial", "semester", "termly", "12 cedis", "20 cedis", "40 cedis"],
    answer:
      "All new institutions receive a 4-Month Full Term Free Trial (120 Days) with zero charge. Thereafter, GBS bills per active student per term or semester: Nursery to JHS is 3 Cedis × 4 months = 12 Cedis per student per term; SHS is 5 Cedis × 4 = 20 Cedis per student per term; TVET Technical Institutes and Universities are 10 Cedis × 4 = 40 Cedis per student per semester, with zero fixed tenant fees.",
    route: "/onboarding"
  },
  {
    id: "staff_approval",
    phrases: ["pending staff", "staff approval", "cannot login"],
    keywords: ["approve", "approval", "pending", "new staff", "rejected", "locked"],
    answer:
      "All new Teachers, Secretaries, Accountants, HR, and Staff remain pending until the Headmaster approves them in the Headmaster Pending Staff desk; once approved, their role dashboard unlocks immediately.",
    tab: "roster"
  },
  {
    id: "payments",
    phrases: ["mobile money", "pay fees", "paystack", "hubtel", "mtn momo"],
    keywords: ["pay", "payment", "momo", "telecel", "visa", "card", "receipt"],
    answer:
      "Parents and students pay fees with any phone number via MTN Mobile Money, Telecel Cash, AT Money, Visa, Mastercard, or Bank Transfer through Paystack and Hubtel. Receipts update instantly across Student, Parent, and Accountant ledgers without ever storing MoMo PINs or CVVs.",
    tab: "fees"
  },
  {
    id: "proctoring",
    phrases: ["ai proctoring", "exam monitor", "start exam", "camera wall"],
    keywords: ["proctor", "cheat", "camera", "evidence", "lost marks", "deduct"],
    answer:
      "When a student clicks Start Exam, live AI camera monitoring, focus checks, teacher camera wall snapshots, warnings, saved evidence, and exact lost-mark deductions run continuously until submission.",
    tab: "exams"
  },
  {
    id: "translator",
    phrases: ["system language", "switch language", "language translator"],
    keywords: ["translat", "language", "twi", "ga", "french", "ewe", "hausa", "meaning"],
    answer:
      "The movable Language Translator pill drags anywhere on screen, translates with exact dictionary meaning across Twi, Ga, Ewe, Fante, Hausa, French, Spanish, Arabic, and English, and Headmaster language switching translates the entire institutional workspace.",
    tab: null
  },
  {
    id: "sms",
    phrases: ["direct sms", "sms inbox", "text message"],
    keywords: ["sms", "dispatch", "phone message"],
    answer:
      "Direct Mobile SMS dispatches through Arkesel, Hubtel, mNotify, or Twilio while storing every message and sender metadata in the recipient's live Direct SMS Inbox."
  },
  {
    id: "mobileApp",
    phrases: ["mobile app", "apple device", "iphone", "ipad", "mac safari", "install app", "android app"],
    keywords: ["install", "apk", "pwa", "android", "apple", "ios", "iphone", "ipad", "mobileconfig"],
    answer:
      "Open Mobile App and Push in the top banner or Install App on login to install GBS directly onto BOTH Apple devices (iPhone, iPad, Mac via 1-tap Apple .mobileconfig WebClip or Safari Add to Home Screen) AND Android/Windows devices with automatic OTA upgrades."
  },
  {
    id: "live_conferencing_calls",
    phrases: ["video call", "voice call", "conference call", "teachers meeting", "headmaster parent call"],
    keywords: ["webrtc", "call parent", "parent call", "meeting", "camera speed", "camera feed"],
    answer:
      "GBS delivers high-speed 30fps WebRTC voice & video calls and conferences with instant SSE push signaling across Headmaster, Teacher, Secretary, and Parent portals."
  },
  {
    id: "staff_duty_attendance",
    phrases: ["clock in", "clock out", "staff attendance", "welcome to school", "auto clock out"],
    keywords: ["bypass", "clock", "arrival", "closing time"],
    answer:
      "All staff clock in upon login under Welcome to School for Headmaster term monitoring (or bypass unmarked), supply a mandatory reason when leaving before school closing time, and are automatically clocked out 2 hours after closing time if forgotten."
  },
  {
    id: "transport",
    phrases: ["bus route", "campus transport"],
    keywords: ["bus", "transport", "route", "boarding", "pickup"],
    answer:
      "Administrators assign students to commuter bus routes in Headmaster Command Center or Transport Hub, syncing pickup stops and fares to Student and Parent portals.",
    tab: "busTransport"
  },
  {
    id: "admissions",
    phrases: ["student admission", "admissions inquiry", "apply online"],
    keywords: ["admission", "enroll", "enrol", "prospective", "apply"],
    answer:
      "Admissions tracks student inquiries, documents, interviews, and final approval, automatically creating Student and Parent logins alongside an Admission Medical Registration record in the School Clinic.",
    tab: "admissions"
  },
  {
    id: "demoVsLive",
    phrases: ["demo mode", "sandbox mode", "live mode", "real production"],
    keywords: ["demo", "sandbox", "production"],
    answer:
      "Demo Sandbox lets users walk through every portal (up to 10 trial entries per module) and switch institution types freely, while Live Production enforces strict school isolation, zero demo/placeholder rows, and unlimited institutional records."
  },
  {
    id: "globalLocale",
    phrases: ["country currency", "preferred language", "international school"],
    keywords: ["country", "countries", "currency", "region", "norm", "arabic", "french", "spanish"],
    answer:
      "GBS operates across any country and preferred language worldwide. Use the Country & Language selector in the banner or login page to switch currencies, academic term norms, speech accents, and RTL support instantly."
  },
  {
    id: "autoUpdates",
    phrases: ["automatic update", "mobile app update", "latest version"],
    keywords: ["update", "upgrade", "new version", "automatic", "cache", "refresh"],
    answer:
      "GBS Apple, Android, and desktop apps automatically detect new builds, flush old caches, and upgrade silently whenever improvements ship — no manual reinstall needed."
  },
  {
    id: "attendance",
    phrases: ["daily attendance", "student attendance"],
    keywords: ["attendance", "roll call", "present", "late", "absent", "qr scan"],
    answer:
      "Daily Attendance tracks Present, Absent, Late, and Excused entries across classes, syncing instantly to Parent portals and Defaulters alerts.",
    tab: "attendance"
  },
  {
    id: "overview",
    phrases: ["what is gbs", "about gbs", "how does gbs work"],
    keywords: ["overview", "everything", "explain gbs", "intelligence talks to wisdom"],
    answer:
      "GBS School Management System (motto: Intelligence Talks to Wisdom) unifies Headmaster, Teacher or Lecturer, School Secretary, Student, Parent, Accountant, Staff, HR, and Alumni portals across Nursery to JHS, Senior High School, Technical TVET, and University institutions."
  }
];

const LOCAL_STOP_WORDS = new Set([
  "the", "is", "are", "was", "were", "a", "an", "and", "or", "in", "on", "at", "to", "for", "of",
  "with", "by", "from", "this", "that", "it", "my", "we", "our", "you", "your", "do", "does", "did",
  "can", "could", "would", "should", "will", "please", "tell", "explain", "about", "what", "how",
  "when", "where", "why", "who", "which", "gbs", "system", "school"
]);

function buildLocalQuestionFormation(rawQuery, moduleLabel = "GBS Unified System") {
  const clean = String(rawQuery || "").trim();
  const qLower = clean.toLowerCase();
  let questionStyle = "Direct System Inquiry";
  let cue = "exact module rules and action path";
  if (/^(how)\b/i.test(qLower) || qLower.includes("how does") || qLower.includes("how do")) {
    questionStyle = 'Process & Workflow ("How") Question';
    cue = "step-by-step system workflow";
  } else if (/^(what)\b/i.test(qLower)) {
    questionStyle = 'Definition & Scope ("What") Question';
    cue = "core purpose and supported capabilities";
  } else if (/^(why)\b/i.test(qLower)) {
    questionStyle = 'Policy & Reasoning ("Why") Question';
    cue = "business rules and system validation reasons";
  } else if (/^(where|which|who|when)\b/i.test(qLower)) {
    questionStyle = 'Navigation & Role ("Where / Who / When") Question';
    cue = "exact dashboard location, owner role, or schedule";
  } else if (/^(can|could|is|are|does|do)\b/i.test(qLower)) {
    questionStyle = 'Capability & Status ("Can / Does / Is") Question';
    cue = "verified system capability and conditions";
  } else if (/^(open|show|pull|check|go to|take me|run)\b/i.test(qLower)) {
    questionStyle = "Action Command Request";
    cue = "immediate navigation or live record retrieval";
  }

  const terms = clean
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((w) => w.length >= 2 && !LOCAL_STOP_WORDS.has(w))
    .filter((v, i, a) => a.indexOf(v) === i)
    .slice(0, 5);

  const article = /^[aeiou]/i.test(questionStyle) ? "an" : "a";
  const explanationText = `How your question was formed: You formed ${article} ${questionStyle} focused on ${terms.length > 0 ? `"${terms.join(", ")}"` : "general system operations"}, requesting ${cue} inside ${moduleLabel}.`;
  return { questionStyle, keyTerms: terms, targetModule: moduleLabel, explanationText };
}

const INTRO_GREETING =
  "Hello! Welcome to GBS SYSTEM. What action, what command, what activities, or what information do you want to know and learn on GBS SYSTEM? We are ready to answer you!";

const DONE_INTENT_REGEX = /\b(we are done|i am done|i'm done|yes done|done now|all done|finished|nothing else|no more|no other|that's all|that is all|conversation is over|go to sleep|go off|sleep now|goodbye|bye bye|stop listening|turn off)\b/i;
const ANOTHER_INTENT_REGEX = /\b(there is another|another question|another one|one more|not done|not yet|have another|more help|still here)\b/i;
const FOLLOWUP_PROMPT = "Are we done with what you want, or is there another? Tell me if there is another, or say we are done.";

export default function GBSVoiceAssistant() {
  const navigate = useNavigate();

  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [isSleeping, setIsSleeping] = useState(true);
  const [assistantPos, setAssistantPos] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("gbs_voice_assistant_pos") || "null");
      if (saved && typeof saved.right === "number" && typeof saved.bottom === "number") {
        return saved;
      }
    } catch { }
    return { right: 20, bottom: 20 };
  });
  const dragStateRef = useRef({ active: false, startX: 0, startY: 0, startRight: 20, startBottom: 20, moved: false });
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [typedInput, setTypedInput] = useState("");
  const [assistantResponse, setAssistantResponse] = useState(INTRO_GREETING);
  const [conversationMessages, setConversationMessages] = useState([]);
  const [continuousListening, setContinuousListening] = useState(true);
  const [speechSupported, setSpeechSupported] = useState(true);
  const [memorySyncedVersion, setMemorySyncedVersion] = useState("2.7.0");

  const [voiceRate, setVoiceRate] = useState(1.04);
  const [voicePitch, setVoicePitch] = useState(1.0);
  const [selectedVoiceIndex, setSelectedVoiceIndex] = useState(0);
  const [availableVoices, setAvailableVoices] = useState([]);

  const recognitionRef = useRef(null);
  const synthRef = useRef(typeof window !== "undefined" ? window.speechSynthesis : null);
  const isSpeakingRef = useRef(false);
  const isOpenRef = useRef(false);
  const isSleepingRef = useRef(true);
  const continuousRef = useRef(true);
  const processCommandRef = useRef(null);
  const silenceTimerRef = useRef(null);
  const lastTranscriptRef = useRef("");
  const lastRawQueryRef = useRef("");
  const lastProcessedRef = useRef({ text: "", time: 0 });
  const memoryCatalogRef = useRef(null);
  const chatEndRef = useRef(null);

  useEffect(() => {
    isOpenRef.current = isOpen;
  }, [isOpen]);

  useEffect(() => {
    isSleepingRef.current = isSleeping;
  }, [isSleeping]);

  useEffect(() => {
    continuousRef.current = continuousListening;
  }, [continuousListening]);

  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [conversationMessages, isOpen]);

  // Preload System Memory from backend for sub-50ms instant voice answers
  const refreshSystemMemory = async () => {
    try {
      const res = await apiClient.get("/ai/system-memory");
      const data = res?.data?.data;
      if (data) {
        memoryCatalogRef.current = data;
        if (data.version) setMemorySyncedVersion(data.version);
      }
    } catch { }
  };

  useEffect(() => {
    refreshSystemMemory();
  }, []);

  useEffect(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      setSpeechSupported(false);
      return;
    }
    const loadVoices = () => {
      const voices = window.speechSynthesis.getVoices();
      if (voices && voices.length > 0) {
        const englishVoices = voices.filter((v) => v.lang.startsWith("en"));
        setAvailableVoices(englishVoices.length > 0 ? englishVoices : voices);
      }
    };
    loadVoices();
    if (window.speechSynthesis.onvoiceschanged !== undefined) {
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }
  }, []);

  const appendMessage = (sender, text, formation = null, answerOnly = null) => {
    const time = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    setConversationMessages((prev) => [...prev.slice(-28), { sender, text, time, formation, answerOnly }]);
  };

  const safelyStartRecognition = () => {
    if (
      !recognitionRef.current ||
      !isOpenRef.current ||
      isSleepingRef.current ||
      !continuousRef.current ||
      isSpeakingRef.current
    ) {
      return;
    }
    try {
      recognitionRef.current.start();
    } catch {
      // recognition already started
    }
  };

  const clearSilenceTimer = () => {
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
  };

  // Continuous speech recognizer with instant 550ms end-of-statement reaction
  useEffect(() => {
    if (typeof window === "undefined") return;
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setSpeechSupported(false);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = getLanguageProfile().speechLocale || "en-US";

    const syncRecognitionLocale = () => {
      try {
        recognition.lang = getLanguageProfile().speechLocale || "en-US";
      } catch { }
    };
    window.addEventListener("gbs_locale_changed", syncRecognitionLocale);

    recognition.onstart = () => {
      setIsListening(true);
    };

    const dispatchCapturedStatement = (phrase) => {
      const clean = String(phrase || "").trim();
      if (!clean) return;
      const now = Date.now();
      const prev = lastProcessedRef.current;
      if (prev.text === clean.toLowerCase() && now - prev.time < 2600) {
        return; // Deduplicate identical interim+final firing
      }
      lastProcessedRef.current = { text: clean.toLowerCase(), time: now };
      clearSilenceTimer();
      lastTranscriptRef.current = "";
      if (processCommandRef.current) {
        processCommandRef.current(clean);
      }
    };

    recognition.onresult = (event) => {
      let currentTranscript = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        currentTranscript += event.results[i][0].transcript;
      }
      const trimmed = currentTranscript.trim();
      setTranscript(trimmed);
      lastTranscriptRef.current = trimmed;

      const lastResult = event.results[event.results.length - 1];
      if (lastResult?.isFinal && trimmed) {
        dispatchCapturedStatement(trimmed);
      } else if (trimmed.length >= 2) {
        // Fast end-of-statement trigger: fires 550ms after speaker finishes sentence without waiting 2-3s
        clearSilenceTimer();
        silenceTimerRef.current = setTimeout(() => {
          if (lastTranscriptRef.current === trimmed && !isSpeakingRef.current && isOpenRef.current && !isSleepingRef.current) {
            dispatchCapturedStatement(trimmed);
          }
        }, 550);
      }
    };

    recognition.onerror = (event) => {
      if (event.error === "not-allowed" || event.error === "service-not-allowed") {
        setIsListening(false);
      }
    };

    recognition.onend = () => {
      clearSilenceTimer();
      if (isOpenRef.current && !isSleepingRef.current && continuousRef.current && !isSpeakingRef.current) {
        setTimeout(() => safelyStartRecognition(), 140);
      } else {
        setIsListening(false);
      }
    };

    recognitionRef.current = recognition;

    return () => {
      clearSilenceTimer();
      window.removeEventListener("gbs_locale_changed", syncRecognitionLocale);
      try {
        recognition.stop();
      } catch { }
    };
  }, []);

  const speakAloud = (text, onComplete = null) => {
    if (!synthRef.current || !("speechSynthesis" in window)) {
      if (onComplete) onComplete();
      return;
    }

    try {
      synthRef.current.cancel();
    } catch { }

    const activeLangProfile = getLanguageProfile();
    const utterance = new SpeechSynthesisUtterance(text);
    const matchedLangVoice = availableVoices.find((v) =>
      String(v.lang || "").toLowerCase().startsWith(String(activeLangProfile.code || "en").toLowerCase())
    );
    if (matchedLangVoice) {
      utterance.voice = matchedLangVoice;
    } else if (availableVoices.length > 0) {
      utterance.voice = availableVoices[selectedVoiceIndex] || availableVoices[0];
    }
    utterance.rate = voiceRate;
    utterance.pitch = voicePitch;
    utterance.lang = activeLangProfile.speechLocale || "en-US";

    utterance.onstart = () => {
      setIsSpeaking(true);
      isSpeakingRef.current = true;
      clearSilenceTimer();
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch { }
      }
    };

    const finishSpeech = () => {
      setIsSpeaking(false);
      isSpeakingRef.current = false;
      if (onComplete) {
        onComplete();
      } else {
        setTimeout(() => safelyStartRecognition(), 120);
      }
    };

    utterance.onend = finishSpeech;
    utterance.onerror = finishSpeech;
    synthRef.current.speak(utterance);
  };

  const enterSleepMode = (
    goodbyeText = "Alright, we are done. I am going off to sleep now. Click me anytime you need help on GBS SYSTEM!"
  ) => {
    clearSilenceTimer();
    isSleepingRef.current = true;
    setIsSleeping(true);
    setIsListening(false);
    setTranscript("");
    setAssistantResponse(goodbyeText);
    appendMessage("assistant", goodbyeText);

    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch { }
    }

    speakAloud(goodbyeText, () => {
      setTimeout(() => {
        isOpenRef.current = false;
        setIsOpen(false);
      }, 380);
    });

    if (!synthRef.current || !("speechSynthesis" in window)) {
      setTimeout(() => {
        isOpenRef.current = false;
        setIsOpen(false);
      }, 750);
    }
  };

  const wakeAndStartConversation = () => {
    isSleepingRef.current = false;
    isOpenRef.current = true;
    setIsSleeping(false);
    setIsMinimized(false);
    setIsOpen(true);
    setContinuousListening(true);
    continuousRef.current = true;
    refreshSystemMemory();

    setAssistantResponse(INTRO_GREETING);
    appendMessage("assistant", INTRO_GREETING);
    speakAloud(INTRO_GREETING);
  };

  const handleDragStart = (e) => {
    if (e.target.closest("button[data-no-drag='true']")) return;
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    dragStateRef.current = {
      active: true,
      startX: clientX,
      startY: clientY,
      startRight: assistantPos.right,
      startBottom: assistantPos.bottom,
      moved: false
    };
  };

  useEffect(() => {
    const onMove = (e) => {
      if (!dragStateRef.current.active) return;
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;
      const dx = clientX - dragStateRef.current.startX;
      const dy = clientY - dragStateRef.current.startY;
      if (Math.abs(dx) > 4 || Math.abs(dy) > 4) {
        dragStateRef.current.moved = true;
      }
      const maxRight = Math.max(20, (typeof window !== "undefined" ? window.innerWidth : 1200) - 90);
      const maxBottom = Math.max(20, (typeof window !== "undefined" ? window.innerHeight : 800) - 80);
      const nextRight = Math.max(8, Math.min(maxRight, dragStateRef.current.startRight - dx));
      const nextBottom = Math.max(8, Math.min(maxBottom, dragStateRef.current.startBottom - dy));
      const nextPos = { right: nextRight, bottom: nextBottom };
      setAssistantPos(nextPos);
      try {
        localStorage.setItem("gbs_voice_assistant_pos", JSON.stringify(nextPos));
      } catch { }
    };
    const onUp = () => {
      if (dragStateRef.current.active) {
        setTimeout(() => {
          dragStateRef.current.active = false;
          dragStateRef.current.moved = false;
        }, 60);
      }
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    window.addEventListener("touchmove", onMove, { passive: true });
    window.addEventListener("touchend", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      window.removeEventListener("touchmove", onMove);
      window.removeEventListener("touchend", onUp);
    };
  }, []);

  const toggleAssistant = () => {
    if (dragStateRef.current.moved) return;
    if (!isOpen || isSleeping) {
      wakeAndStartConversation();
    } else if (isMinimized) {
      setIsMinimized(false);
    } else {
      enterSleepMode("Going off to sleep now. Click me anytime you need help on GBS SYSTEM!");
    }
  };

  useEffect(() => {
    const handleVoiceTrigger = (e) => {
      isSleepingRef.current = false;
      isOpenRef.current = true;
      setIsSleeping(false);
      setIsOpen(true);
      if (e?.detail?.query && processCommandRef.current) {
        processCommandRef.current(e.detail.query);
      } else {
        wakeAndStartConversation();
      }
    };

    window.addEventListener("gbs_open_voice_assistant", handleVoiceTrigger);
    window.gbsVoiceAssistant = {
      open: wakeAndStartConversation,
      close: () => enterSleepMode(),
      sleep: () => enterSleepMode(),
      speak: (text) => speakAloud(text),
      command: (cmd) => processCommandRef.current && processCommandRef.current(cmd)
    };

    return () => {
      window.removeEventListener("gbs_open_voice_assistant", handleVoiceTrigger);
      delete window.gbsVoiceAssistant;
    };
  }, []);

  const triggerDashboardTab = (tabName) => {
    if (!tabName) return;
    window.dispatchEvent(new CustomEvent("gbs_open_dashboard_tab", { detail: { tab: tabName } }));
  };

  const matchInstantLocalMemory = (cleanCmd) => {
    const qTokens = cleanCmd.split(/[^a-z0-9]+/).filter(Boolean);
    const wantsPortalBreakdown = /\b(portal|dashboard|role|activities|duties|tabs|features|about)\b/i.test(cleanCmd);
    let best = null;
    let bestScore = 0;
    for (const item of LOCAL_MEMORY_TOPICS) {
      let score = 0;
      for (const ph of (item.phrases || [])) {
        if (cleanCmd.includes(ph)) score += 10;
      }
      for (const kw of (item.keywords || [])) {
        if (kw.includes(" ")) {
          if (cleanCmd.includes(kw)) score += 6;
        } else if (qTokens.includes(kw) || cleanCmd.includes(kw)) {
          score += qTokens.includes(kw) ? 4 : 2;
        }
      }
      if (wantsPortalBreakdown && item.id.startsWith("role_") && score > 0) {
        score += 4;
      }
      if (score > bestScore) {
        bestScore = score;
        best = item;
      }
    }
    return bestScore > 0 ? best : null;
  };

  const executeReply = (replyCore, extraAction = null, questionFormation = null) => {
    if (extraAction?.openTab) triggerDashboardTab(extraAction.openTab);
    if (extraAction?.navigateTo) navigate(extraAction.navigateTo);
    if (extraAction?.trigger === "openTranslator" && typeof window.openGBSScreenTranslator === "function") {
      window.openGBSScreenTranslator();
    }

    const resolvedFormation =
      questionFormation ||
      (lastRawQueryRef.current ? buildLocalQuestionFormation(lastRawQueryRef.current, extraAction?.openTab || "GBS System Action") : null);
    const formationLine = resolvedFormation?.explanationText ? ` ${resolvedFormation.explanationText}` : "";
    const combinedCore = replyCore.includes("How your question was formed:")
      ? replyCore
      : `${replyCore}${formationLine}`;
    const fullTurnReply = `${combinedCore} ${FOLLOWUP_PROMPT}`;
    setAssistantResponse(fullTurnReply);
    appendMessage("assistant", fullTurnReply, resolvedFormation, replyCore);
    speakAloud(fullTurnReply);

    if (typeof window !== "undefined" && typeof window.showGBSOpenNotice === "function") {
      window.showGBSOpenNotice(replyCore, "info", "GBS SYSTEM ASSISTANT");
    }
  };

  const processVoiceCommand = async (rawText) => {
    const raw = String(rawText || "").trim();
    const text = raw.toLowerCase();
    if (!text) return;

    lastRawQueryRef.current = raw;
    appendMessage("user", raw);
    setTranscript("");

    const cleanCmd = text.replace(/^(hey|hello|hi|ok|okay)?\s*gbs\s*/i, "").trim();

    if (DONE_INTENT_REGEX.test(cleanCmd) || cleanCmd === "done" || cleanCmd === "sleep" || cleanCmd === "no") {
      enterSleepMode();
      return;
    }

    if (ANOTHER_INTENT_REGEX.test(cleanCmd)) {
      const promptMore = "Yes, I am listening! Tell me your next action, command, activity, or question on GBS SYSTEM.";
      setAssistantResponse(promptMore);
      appendMessage("assistant", promptMore);
      speakAloud(promptMore);
      return;
    }

    // 1. Explicit Pure-Navigation Portal Commands (Explanations fall through to full System Memory AI)
    const isExplanationQuery = /\b(explain|how|what|why|tell me|want to know|know about|describe|pull clinic|pull medical|can)\b/i.test(cleanCmd);
    if (!isExplanationQuery && (cleanCmd.includes("open clinic") || cleanCmd.includes("go to clinic") || cleanCmd === "school clinic" || cleanCmd.includes("open sickbay"))) {
      triggerDashboardTab("clinic");
      const stats = memoryCatalogRef.current?.liveStats;
      const statLine = stats
        ? ` Active Clinic Ledger shows ${stats.clinicProfilesCount} registered medical profiles, ${stats.clinicVisitsCount} total consultations, and ${stats.activeSickbayCount} active Sickbay admission.`
        : "";
      executeReply(`Opening the School Clinic & Admission Medical Registry now.${statLine}`, { openTab: "clinic" });
      return;
    }

    if (!isExplanationQuery && (cleanCmd.includes("login") || cleanCmd.includes("sign in") || cleanCmd.includes("open headmaster") || cleanCmd.includes("open secretary") || cleanCmd.includes("open student") || cleanCmd.includes("open teacher") || cleanCmd.includes("open parent") || cleanCmd.includes("open accountant") || cleanCmd.includes("open staff"))) {
      if (cleanCmd.includes("admin") || cleanCmd.includes("headmaster")) {
        executeReply("Opening the Headmaster Executive Command Portal now.", { navigateTo: "/login/admin" });
        return;
      }
      if (cleanCmd.includes("secretary")) {
        executeReply("Opening the School Secretary Portal now.", { navigateTo: "/login/secretary" });
        return;
      }
      if (cleanCmd.includes("teacher") || cleanCmd.includes("lecturer")) {
        executeReply("Opening the Teacher & Lecturer Portal now.", { navigateTo: "/login/teacher" });
        return;
      }
      if (cleanCmd.includes("student")) {
        executeReply("Navigating to the Student Learning Hub now.", { navigateTo: "/login/student" });
        return;
      }
      if (cleanCmd.includes("parent") || cleanCmd.includes("guardian")) {
        executeReply("Opening the Parent & Guardian Portal now.", { navigateTo: "/login/parent" });
        return;
      }
      if (cleanCmd.includes("accountant") || cleanCmd.includes("finance")) {
        executeReply("Opening the Accountant & Treasury Portal now.", { navigateTo: "/login/accountant" });
        return;
      }
      if (cleanCmd.includes("staff") || cleanCmd.includes("hr")) {
        executeReply("Opening the Staff & HR Portal now.", { navigateTo: "/login/staff" });
        return;
      }
      if (cleanCmd.includes("main login") || cleanCmd.includes("login")) {
        executeReply("Opening the Main GBS Login Gateway.", { navigateTo: "/login" });
        return;
      }
    }

    if (cleanCmd.includes("onboard") || cleanCmd.includes("register school") || cleanCmd.includes("first page")) {
      executeReply("Opening the School Onboarding First Page.", { navigateTo: "/onboarding" });
      return;
    }

    if (DEVELOPER_NONDISCLOSURE_PATTERN.test(cleanCmd)) {
      executeReply(
        "I do not disclose developer details, internal engineering controls, or developer portal information. Ask me instead about the Headmaster, Teacher, Student, Parent, Accountant, Staff, HR, or Alumni portals and activities.",
        null,
        {
          interpretation: "You asked about internal developer controls. Institutional assistants strictly protect non-disclosure boundaries.",
          explanationText: "How your question was formed: You asked about internal platform controls, which are kept strictly non-disclosed so the assistant stays focused on institutional users.",
          actionTaken: "Protected developer non-disclosure boundary and offered institutional role help."
        }
      );
      return;
    }

    if (cleanCmd.startsWith("enter my name") || cleanCmd.startsWith("my name is") || cleanCmd.startsWith("enter name")) {
      const nameVal = cleanCmd.replace(/^(enter my name|my name is|enter name)\s*(is|to)?\s*/i, "").trim();
      const inputEl = document.querySelector('input[name*="name" i], input[id*="name" i], input[placeholder*="name" i]');
      if (inputEl && nameVal) {
        inputEl.value = nameVal;
        inputEl.dispatchEvent(new Event("input", { bubbles: true }));
        executeReply(`Entered name ${nameVal} into the active form.`);
      } else {
        executeReply(`Noted name ${nameVal}. Open a form first if you want me to fill it automatically.`);
      }
      return;
    }

    if (cleanCmd.includes("submit") || cleanCmd.includes("click submit")) {
      const submitBtn = document.querySelector('button[type="submit"], .role-login-submit, .btn-submit, .gbs-btn-primary');
      if (submitBtn) {
        submitBtn.click();
        executeReply("Submitted the active form cleanly.");
      } else {
        executeReply("No active submit button was found on this view.");
      }
      return;
    }

    // 2. Live Backend System Memory Query (generous 4500ms timeout so backend formation + answer resolves reliably)
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 4500);
      const res = await apiClient.post("/ai/assistant-query", { query: raw }, { signal: controller.signal });
      clearTimeout(timer);
      const result = res?.data?.data;
      if (result?.speechText) {
        if (result.liveStats) {
          memoryCatalogRef.current = { ...(memoryCatalogRef.current || {}), liveStats: result.liveStats };
        }
        const formation = result.questionFormation || buildLocalQuestionFormation(raw, result.topicId || "GBS System Memory");
        executeReply(result.answerText || result.speechText, result.action || null, formation);
        return;
      }
    } catch { }

    // 3. Instant Local System Memory Fallback (<5ms offline-capable explanation + question formation breakdown)
    const localHit = matchInstantLocalMemory(cleanCmd);
    if (localHit) {
      const localFormation = buildLocalQuestionFormation(raw, localHit.id);
      executeReply(localHit.answer, { openTab: localHit.tab, navigateTo: localHit.route }, localFormation);
      return;
    }

    const stats = memoryCatalogRef.current?.liveStats;
    const statsNote = stats
      ? ` Live workspace summary: ${stats.clinicProfilesCount} medical registrations, ${stats.clinicVisitsCount} clinic visits (${stats.activeSickbayCount} active in Sickbay), and ${stats.pendingStaffApprovalsCount} pending staff approvals.`
      : "";
    const generalFormation = buildLocalQuestionFormation(raw, "GBS Unified System Overview");
    executeReply(
      `On GBS SYSTEM (v${memorySyncedVersion}), each institutional user operates inside a portal tailored to your registered institution (Nursery–JHS, SHS, TVET, or University): Headmasters approve users, set official School Stationery prices, inspect Staff Clock-In logs, configure language settings, and manage all clinic dossiers; Teachers/Lecturers deliver coursework, Topic Videos, AI-proctored exam cameras, live calls, and Internships/Attachments; School Secretaries handle visitor logs, official letters/circulars, appointments, and stationery sales/expenses; Students take proctored exams and submit assignments or placements; Parents monitor wards and pay fees via MoMo; Accountants reconcile fees & synced stationery expenses; Non-Teaching Staff manage campus logistics; HR handles contracts & leave; Alumni access transcripts.`,
      null,
      generalFormation
    );
  };

  processCommandRef.current = processVoiceCommand;

  const handleTypedSubmit = (e) => {
    e.preventDefault();
    if (!typedInput.trim()) return;
    const msg = typedInput.trim();
    setTypedInput("");
    processVoiceCommand(msg);
  };

  return (
    <>
      {/* Brain-Only Movable Assistant Symbol (Free from dashboard blockages & zero tooltips) */}
      <div
        className="gbs-voice-assistant-launcher"
        onMouseDown={handleDragStart}
        onTouchStart={handleDragStart}
        style={{
          position: "fixed",
          bottom: `${assistantPos.bottom}px`,
          right: `${assistantPos.right}px`,
          zIndex: 99999,
          display: "flex",
          alignItems: "center",
          userSelect: "none",
          cursor: "grab"
        }}
      >
        <button
          type="button"
          aria-label="GBS Brain Assistant"
          data-testid="gbs-brain-assistant-btn"
          onClick={toggleAssistant}
          style={{
            width: "50px",
            height: "50px",
            borderRadius: "50%",
            border: isOpen && !isSleeping ? "2.5px solid #f5d061" : "2px solid #d4af37",
            background: isOpen && !isSleeping
              ? "radial-gradient(circle at 35% 35%, #d4af37 0%, #0d2247 58%, #060f1e 100%)"
              : "radial-gradient(circle at 35% 35%, #0d2247 0%, #081833 75%, #060f1e 100%)",
            boxShadow: isOpen && !isSleeping
              ? "0 0 24px rgba(212, 175, 55, 0.72), 0 0 36px rgba(56, 189, 248, 0.35)"
              : "0 4px 16px rgba(0, 0, 0, 0.55), 0 0 12px rgba(212, 175, 55, 0.35)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            outline: "none",
            transition: "all 0.25s ease",
            transform: isOpen && !isSleeping ? "scale(1.06)" : "scale(1)"
          }}
        >
          <span style={{ fontSize: "23px", lineHeight: 1 }} aria-hidden="true">🧠</span>
        </button>
      </div>

      {/* Continuous Movable & Minimizable Conversation Window */}
      {isOpen && (
        <div
          style={{
            position: "fixed",
            bottom: `${Math.min(
              Math.max(12, (typeof window !== "undefined" ? window.innerHeight : 800) - (isMinimized ? 80 : 520)),
              assistantPos.bottom + 66
            )}px`,
            right: `${Math.min(
              Math.max(12, (typeof window !== "undefined" ? window.innerWidth : 1200) - (isMinimized ? 350 : 420)),
              assistantPos.right
            )}px`,
            width: isMinimized ? "340px" : "410px",
            maxWidth: "calc(100vw - 24px)",
            maxHeight: isMinimized ? "62px" : "80vh",
            background: "linear-gradient(155deg, rgba(8, 24, 51, 0.98) 0%, rgba(13, 34, 71, 0.98) 100%)",
            border: "2px solid #d4af37",
            borderRadius: "20px",
            boxShadow: "0 25px 60px rgba(0, 0, 0, 0.85), 0 0 35px rgba(212, 175, 55, 0.35)",
            backdropFilter: "blur(20px)",
            zIndex: 99998,
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
            color: "#f8fafc",
            fontFamily: "system-ui, -apple-system, sans-serif"
          }}
        >
          {/* Draggable Header with Minimize & Sleep Controls */}
          <div
            onMouseDown={handleDragStart}
            onTouchStart={handleDragStart}
            style={{
              padding: "12px 14px",
              background: "linear-gradient(135deg, #050f23 0%, #0d2247 100%)",
              borderBottom: isMinimized ? "none" : "1px solid rgba(212, 175, 55, 0.45)",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              cursor: "grab",
              gap: "8px"
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "8px", minWidth: 0 }}>
              <span style={{ color: "#d4af37", fontSize: "14px" }}>⠿</span>
              <span style={{ fontSize: "17px" }}>🧠</span>
              <div style={{ minWidth: 0 }}>
                <strong style={{ fontSize: "12px", color: "#f6dd84", display: "block", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  GBS SYSTEM ASSISTANT
                </strong>
                <span style={{ fontSize: "10px", color: isSleeping ? "#94a3b8" : "#34d399", fontWeight: 700, display: "block" }}>
                  {isMinimized
                    ? "Minimized • Click Expand to view chat"
                    : isSleeping
                      ? "Sleeping • Click brain icon to wake"
                      : isSpeaking
                        ? "🔊 Answering live from System Memory..."
                        : isListening
                          ? `● Listening Active • Memory v${memorySyncedVersion}`
                          : `● Ready • Memory v${memorySyncedVersion} Linked`}
                </span>
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "5px", flexShrink: 0 }}>
              <button
                type="button"
                data-no-drag="true"
                onClick={() => setIsMinimized((m) => !m)}
                style={{
                  background: "rgba(212, 175, 55, 0.18)",
                  border: "1px solid rgba(212, 175, 55, 0.6)",
                  color: "#f6dd84",
                  fontSize: "11px",
                  fontWeight: 800,
                  cursor: "pointer",
                  padding: "4px 9px",
                  borderRadius: "999px"
                }}
              >
                {isMinimized ? "🗖 Expand" : "🗕 Minimize"}
              </button>
              <button
                type="button"
                data-no-drag="true"
                onClick={() => enterSleepMode()}
                style={{
                  background: "rgba(239, 68, 68, 0.18)",
                  border: "1px solid rgba(239, 68, 68, 0.5)",
                  color: "#fca5a5",
                  fontSize: "11px",
                  fontWeight: 800,
                  cursor: "pointer",
                  padding: "4px 9px",
                  borderRadius: "999px"
                }}
                aria-label="Finish conversation and put assistant to sleep"
              >
                😴 Done / Sleep
              </button>
            </div>
          </div>

          {!isMinimized && (
            <>

              {/* Multi-Turn Thread */}
              <div style={{ padding: "14px 16px", flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: "10px" }}>
                {conversationMessages.map((m, idx) => (
                  <div
                    key={idx}
                    style={{
                      alignSelf: m.sender === "user" ? "flex-end" : "flex-start",
                      maxWidth: "88%",
                      background: m.sender === "user" ? "rgba(37, 99, 235, 0.35)" : "rgba(8, 20, 40, 0.92)",
                      border: m.sender === "user" ? "1px solid rgba(56, 189, 248, 0.55)" : "1px solid rgba(212, 175, 55, 0.42)",
                      borderRadius: "12px",
                      padding: "9px 12px",
                      fontSize: "12.5px",
                      lineHeight: 1.45,
                      color: m.sender === "user" ? "#e0f2fe" : "#f8fafc"
                    }}
                  >
                    <div style={{ fontSize: "10px", color: m.sender === "user" ? "#7dd3fc" : "#f5d061", fontWeight: 800, marginBottom: "3px" }}>
                      {m.sender === "user" ? "You" : "GBS System Memory AI"} • {m.time}
                    </div>
                    {m.formation ? (
                      <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                        <div>{m.answerOnly || m.text}</div>
                        <div
                          style={{
                            background: "rgba(212, 175, 55, 0.14)",
                            borderLeft: "3px solid #f6dd84",
                            borderRadius: "6px",
                            padding: "6px 8px",
                            fontSize: "11px",
                            color: "#fef08a"
                          }}
                        >
                          <strong style={{ color: "#f6dd84" }}>🧩 Question Formation Explained:</strong>{" "}
                          {(m.formation.explanationText || m.formation.interpretation || "").replace(/^How your question was formed:\s*/i, "")}
                        </div>
                        <div style={{ fontSize: "10.8px", color: "#cbd5e1", fontStyle: "italic" }}>
                          {FOLLOWUP_PROMPT}
                        </div>
                      </div>
                    ) : (
                      <div>{m.text}</div>
                    )}
                  </div>
                ))}

                {transcript && (
                  <div style={{ fontSize: "12px", color: "#7dd3fc", fontStyle: "italic", padding: "4px 8px" }}>
                    🎙️ Hearing live: "{transcript}"
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>

              {/* Quick Memory Queries + Continuous Reply Bar */}
              <div style={{ padding: "10px 14px", borderTop: "1px solid rgba(212, 175, 55, 0.25)", background: "rgba(4, 10, 22, 0.95)" }}>
                <div style={{ display: "flex", gap: "5px", flexWrap: "wrap", marginBottom: "8px" }}>
                  {[
                    { label: "👥 User Roles", cmd: "Explain all institutional user roles and daily activities" },
                    { label: "🏥 School Clinic", cmd: "Explain School Clinic privacy and Headmaster profiles" },
                    { label: "🎓 Placements & Tiers", cmd: "Explain Internships, Attachments, and institution streams" },
                    { label: "✅ Done (Sleep)", cmd: "We are done" }
                  ].map((chip) => (
                    <button
                      key={chip.label}
                      type="button"
                      onClick={() => processVoiceCommand(chip.cmd)}
                      style={{
                        background: chip.label.includes("Done") ? "rgba(245, 158, 11, 0.18)" : "rgba(15, 35, 71, 0.9)",
                        border: chip.label.includes("Done") ? "1px solid #f59e0b" : "1px solid rgba(212, 175, 55, 0.45)",
                        color: chip.label.includes("Done") ? "#fde68a" : "#f5d061",
                        borderRadius: "999px",
                        padding: "4px 9px",
                        fontSize: "10.8px",
                        fontWeight: 700,
                        cursor: "pointer"
                      }}
                    >
                      {chip.label}
                    </button>
                  ))}
                </div>

                <form onSubmit={handleTypedSubmit} style={{ display: "flex", gap: "6px" }}>
                  <input
                    type="text"
                    placeholder="Ask anything about GBS SYSTEM or say command..."
                    value={typedInput}
                    onChange={(e) => setTypedInput(e.target.value)}
                    style={{
                      flex: 1,
                      background: "#081428",
                      color: "#f8fafc",
                      border: "1px solid rgba(212, 175, 55, 0.45)",
                      borderRadius: "8px",
                      padding: "8px 10px",
                      fontSize: "12.5px",
                      outline: "none"
                    }}
                  />
                  <button
                    type="submit"
                    style={{
                      background: "linear-gradient(135deg, #0f2347, #d4af37)",
                      color: "#ffffff",
                      border: "1px solid #f5d061",
                      borderRadius: "8px",
                      padding: "8px 14px",
                      fontSize: "12px",
                      fontWeight: 800,
                      cursor: "pointer"
                    }}
                  >
                    Ask
                  </button>
                </form>

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "8px" }}>
                  <button
                    type="button"
                    onClick={() => {
                      if (!speechSupported) return;
                      if (isListening && recognitionRef.current) {
                        continuousRef.current = false;
                        setContinuousListening(false);
                        try { recognitionRef.current.stop(); } catch { }
                      } else {
                        continuousRef.current = true;
                        setContinuousListening(true);
                        safelyStartRecognition();
                      }
                    }}
                    style={{
                      background: isListening ? "#b91c1c" : "#1d4ed8",
                      color: "#ffffff",
                      border: "none",
                      borderRadius: "8px",
                      padding: "6px 12px",
                      fontSize: "11.5px",
                      fontWeight: 700,
                      cursor: speechSupported ? "pointer" : "not-allowed",
                      opacity: speechSupported ? 1 : 0.6
                    }}
                  >
                    {isListening ? "⏹️ Pause Mic" : "🎙️ Keep Listening"}
                  </button>

                  <button
                    type="button"
                    onClick={() => speakAloud(assistantResponse)}
                    style={{
                      background: "#0f2347",
                      color: "#f5d061",
                      border: "1px solid rgba(212, 175, 55, 0.45)",
                      borderRadius: "8px",
                      padding: "6px 12px",
                      fontSize: "11.5px",
                      fontWeight: 700,
                      cursor: "pointer"
                    }}
                  >
                    🔊 Replay
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </>
  );
}
