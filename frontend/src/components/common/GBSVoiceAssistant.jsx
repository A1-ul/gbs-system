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
    keywords: ["developer", "dev portal", "mission control", "motherland", "developer login", "developer dashboard", "who created gbs", "who built gbs"],
    answer:
      "I do not disclose developer details, internal engineering controls, or developer portal information. I can explain the exact portals and daily activities for institutional users: Headmaster/Admin, Teacher/Lecturer, Student, Parent/Guardian, Accountant/Bursar, Non-Teaching Staff, HR Officer, and Alumni.",
    tab: null
  },
  {
    id: "clinic",
    keywords: ["clinic", "sickbay", "medical", "health", "doctor", "nurse", "sick", "hospital", "medicine", "blood", "genotype", "allergy"],
    answer:
      "In the GBS School Clinic, privacy is strictly enforced: regular users (Student, Teacher, Staff, HR, Accountant) only view their own personal health profile and visit history, and Parents only view their linked ward's health profile — without clinic admin queues or other people's data. Only the Headmaster sees all Staff and Student clinic profiles, full individual health dossiers, Sickbay admissions, treatments, and pharmacy stock on the Headmaster Dashboard.",
    tab: "clinic"
  },
  {
    id: "university",
    keywords: ["university", "internship", "attachment", "src", "stream", "evening", "weekend", "sandwich", "regular", "lecturer", "graduate", "alumni", "cgpa"],
    answer:
      "University Hub separates Industrial Internships (INT) from Academic and Field Attachments (ATT) so each course offering runs its exact required placement workflow. Students submit Internship or Attachment placements separately; Lecturers grade coursework, internships, and attachments independently, set exams to promote passing students up to Alumni graduation, manage Regular/Evening/Sandwich/Weekend streams, and oversee SRC governance plans.",
    tab: "university"
  },
  {
    id: "all_roles_explained",
    keywords: ["roles", "user roles", "who does what", "everyone", "all users", "activities", "what each user does", "explain roles"],
    answer:
      "Each institutional user on GBS performs specific daily activities: Headmaster/Admin approves users, runs Admissions, views ALL Staff and Student clinic profiles and sickbay stock, sets fee structures, oversees Academic Promotions and Institution Language; Teachers/Lecturers deliver coursework, grade assignments and separate university internships/attachments, mark attendance, manage exams with AI proctoring, and view ONLY their own personal health profile; Students take courses, write AI-proctored exams, submit separate Internship or Attachment forms, check fees/results, and view ONLY their own health profile; Parents view their linked wards' grades, attendance, fees, and linked ward's clinic profile; Accountants collect fees, verify receipts, and record expenses; Non-Teaching Staff manage campus logistics/assets and view ONLY their own health profile; HR manages staff recruitment, payroll, leave, and appraisals; Alumni access transcripts and alumni networking.",
    tab: null
  },
  {
    id: "institutions",
    keywords: ["jhs", "shs", "technical", "tvet", "separate", "institution type", "nursery", "difference"],
    answer:
      "GBS strictly separates operational logic across Nursery to JHS, Senior High School, Technical TVET, and University tiers. Role titles, classes, and permitted modules adjust per institution type so JHS, SHS, and Technical portals cannot access University-only modules."
  },
  {
    id: "defaulters",
    keywords: ["defaulter", "absent", "not coming", "missed exam", "partake", "assignment", "unsubmitted", "compliance"],
    answer:
      "The Compliance and Defaulters Monitor calculates exact student counts and clickable rosters for students who did not partake in exams, did not submit assignments, or have not been coming to school, with direct warning alerts.",
    tab: "defaulters"
  },
  {
    id: "pricing",
    keywords: ["price", "pricing", "cost", "fee rate", "subscription", "discount", "how much"],
    answer:
      "GBS pricing is 100 percent active-student based with zero fixed tenant fees: 3 Cedis monthly per student for Nursery to JHS, 5 Cedis for SHS and Technical institutes, and 10 Cedis for Universities, with 3, 5, 7, and 12 percent multi-month discounts.",
    route: "/onboarding"
  },
  {
    id: "staff_approval",
    keywords: ["approve", "approval", "pending", "new staff", "register", "rejected", "cannot login"],
    answer:
      "All new Teachers, Accountants, HR, and Staff remain pending until the Headmaster approves them in the Headmaster Pending Staff desk; once approved, their role dashboard unlocks immediately.",
    tab: "roster"
  },
  {
    id: "payments",
    keywords: ["pay", "payment", "momo", "mobile money", "paystack", "hubtel", "telecel", "visa", "card", "receipt"],
    answer:
      "Parents and students pay fees via MTN Mobile Money, Telecel Cash, AT Money, Visa, Mastercard, or Bank Transfer through Paystack and Hubtel. Receipts update instantly across Student, Parent, and Accountant ledgers without ever storing MoMo PINs or CVVs.",
    tab: "fees"
  },
  {
    id: "proctoring",
    keywords: ["proctor", "exam monitor", "cheat", "start exam", "camera"],
    answer:
      "When a student clicks Start Exam, live AI camera focus monitoring, tab-switch guards, and anti-copy protection run continuously until submission or exam completion.",
    tab: "exams"
  },
  {
    id: "translator",
    keywords: ["translat", "language", "twi", "ga", "french", "ewe", "hausa", "meaning"],
    answer:
      "The movable Language Translator pill drags anywhere on screen, translates with exact dictionary meaning across Twi, Ga, Ewe, Fante, Hausa, French, Spanish, Arabic, and English, and sends translated messages directly to recipient inboxes with full sender details."
  },
  {
    id: "sms",
    keywords: ["sms", "text message", "inbox", "dispatch", "phone message"],
    answer:
      "Direct Mobile SMS dispatches through Arkesel, Hubtel, mNotify, or Twilio while storing every message and sender metadata in the recipient's live Direct SMS Inbox."
  },
  {
    id: "mobileApp",
    keywords: ["install", "mobile app", "apk", "pwa", "android", "iphone", "ipad"],
    answer:
      "Open Mobile App and Push in the top system banner and click Install App Now to install GBS cleanly onto Android, iPhone, iPad, Windows, or Mac with offline caching."
  },
  {
    id: "transport",
    keywords: ["bus", "transport", "route", "boarding", "pickup"],
    answer:
      "Administrators assign students to commuter bus routes in Headmaster Command Center or Transport Hub, syncing pickup stops and fares to Student and Parent portals.",
    tab: "busTransport"
  },
  {
    id: "admissions",
    keywords: ["admission", "enroll", "enrol", "prospective", "apply"],
    answer:
      "Admissions tracks student inquiries, documents, interviews, and final approval, automatically creating Student and Parent logins alongside an Admission Medical Registration record in the School Clinic.",
    tab: "admissions"
  },
  {
    id: "demoVsLive",
    keywords: ["demo", "sandbox", "live", "production", "trial"],
    answer:
      "Demo Sandbox lets users practice every workflow (up to 10 trial entries per module) and switch institution types freely, while Live Production enforces strict tenant data isolation and unlimited real institutional records."
  },
  {
    id: "overview",
    keywords: ["what is gbs", "about gbs", "about the system", "how does gbs work", "everything", "explain gbs", "roles", "dashboards", "motto", "intelligence talks to wisdom"],
    answer:
      "GBS School Management System (motto: Intelligence Talks to Wisdom) unifies Headmaster, Teacher or Lecturer, Student, Parent, Accountant, Staff, HR, Alumni, School Clinic, University Hub, Defaulters Monitor, Language Translator, Direct SMS, Payments, Bus Transport, AI Proctoring, and Developer Control into one connected platform."
  },
  {
    id: "globalLocale",
    keywords: ["country", "countries", "language", "currency", "region", "norm", "arabic", "french", "spanish", "international"],
    answer:
      "GBS operates across any country and preferred language worldwide. Use the Country & Language selector in the banner or login page to switch currencies, academic term norms, speech accents, and RTL support instantly."
  },
  {
    id: "autoUpdates",
    keywords: ["update", "upgrade", "mobile app update", "new version", "automatic", "cache", "refresh"],
    answer:
      "GBS Mobile Apps (PWA) and desktop sessions automatically check live build signatures, flush old caches, display an update badge, and upgrade silently whenever improvements ship — no manual reinstall needed."
  },
  {
    id: "attendance",
    keywords: ["attendance", "roll call", "present", "late", "absent", "qr scan"],
    answer:
      "Daily Attendance tracks Present, Absent, Late, and Excused entries across classes, syncing instantly to Parent portals and Defaulters alerts.",
    tab: "attendance"
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
    let best = null;
    let bestScore = 0;
    for (const item of LOCAL_MEMORY_TOPICS) {
      let score = 0;
      for (const kw of item.keywords) {
        if (cleanCmd.includes(kw)) score += kw.includes(" ") ? 3 : 2;
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
    const isExplanationQuery = /\b(explain|how|what|why|tell me|describe|pull clinic|pull medical|can)\b/i.test(cleanCmd);
    if (!isExplanationQuery && (cleanCmd.includes("open clinic") || cleanCmd.includes("go to clinic") || cleanCmd === "school clinic" || cleanCmd.includes("open sickbay"))) {
      triggerDashboardTab("clinic");
      const stats = memoryCatalogRef.current?.liveStats;
      const statLine = stats
        ? ` Active Clinic Ledger shows ${stats.clinicProfilesCount} registered medical profiles, ${stats.clinicVisitsCount} total consultations, and ${stats.activeSickbayCount} active Sickbay admission.`
        : "";
      executeReply(`Opening the School Clinic & Admission Medical Registry now.${statLine}`, { openTab: "clinic" });
      return;
    }

    if (cleanCmd.includes("login") || cleanCmd.includes("sign in") || cleanCmd.includes("open headmaster") || cleanCmd.includes("open student") || cleanCmd.includes("open teacher") || cleanCmd.includes("open parent") || cleanCmd.includes("open accountant") || cleanCmd.includes("open staff")) {
      if (cleanCmd.includes("admin") || cleanCmd.includes("headmaster")) {
        executeReply("Opening the Headmaster Executive Command Portal now.", { navigateTo: "/login/admin" });
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
      `On GBS SYSTEM (v${memorySyncedVersion}), each institutional user has a dedicated portal and set of daily activities: Headmasters manage admissions, approvals, fee structures, language settings, and all Staff & Student clinic dossiers; Teachers/Lecturers deliver coursework, grade assignments and separate university Internships & Attachments, mark attendance, and run AI-proctored exams; Students take exams and submit Internships or Attachments; Parents monitor their linked wards; Accountants reconcile fees & payroll; Non-Teaching Staff manage campus logistics; HR handles recruitment & leave; Alumni access transcripts. Non-Headmaster users only see their own (or ward's) clinic profile.`,
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
      {/* Floating Movable Launcher (Drags anywhere across screen) */}
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
          gap: "10px",
          userSelect: "none",
          cursor: "grab"
        }}
      >
        {(!isOpen || isSleeping) && (
          <div
            onClick={toggleAssistant}
            style={{
              background: "linear-gradient(135deg, #081833, #0d2247)",
              color: "#f5d061",
              border: "1.5px solid #d4af37",
              borderRadius: "20px",
              padding: "7px 14px",
              fontSize: "12px",
              fontWeight: 800,
              boxShadow: "0 6px 20px rgba(0, 0, 0, 0.55)",
              cursor: "grab",
              display: "flex",
              alignItems: "center",
              gap: "6px",
              backdropFilter: "blur(10px)"
            }}
            title="Drag to move anywhere • Click to open GBS AI Assistant"
          >
            <span style={{ opacity: 0.75 }}>⠿</span>
            <span>🎙️</span>
            <span>GBS AI Assistant (Memory Linked)</span>
          </div>
        )}

        <button
          type="button"
          onClick={toggleAssistant}
          title={isOpen && !isSleeping ? "Click to put GBS AI Assistant to sleep" : "Click to wake GBS AI Assistant"}
          style={{
            width: "58px",
            height: "58px",
            borderRadius: "50%",
            border: isOpen && !isSleeping ? "2.5px solid #f5d061" : "2px solid #d4af37",
            background: isOpen && !isSleeping
              ? "radial-gradient(circle at 35% 35%, #d4af37 0%, #0f2347 55%, #060f1e 100%)"
              : "radial-gradient(circle at 35% 35%, #0f2347 0%, #081428 70%, #060f1e 100%)",
            boxShadow: isOpen && !isSleeping
              ? "0 0 30px rgba(212, 175, 55, 0.75), 0 0 50px rgba(56, 189, 248, 0.45)"
              : "0 6px 20px rgba(0, 0, 0, 0.65), 0 0 15px rgba(212, 175, 55, 0.35)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            outline: "none",
            transition: "all 0.25s ease",
            transform: isOpen && !isSleeping ? "scale(1.08)" : "scale(1)"
          }}
        >
          {isSpeaking ? (
            <span style={{ fontSize: "22px" }}>🔊</span>
          ) : isListening ? (
            <span style={{ fontSize: "22px" }}>🎙️</span>
          ) : (
            <span style={{ fontSize: "20px" }}>{isSleeping ? "🧠" : "⚡"}</span>
          )}
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
            title="Drag header to move Voice Assistant anywhere on screen"
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
              <span style={{ fontSize: "17px" }}>{isSleeping ? "😴" : isListening ? "🎙️" : "🧠"}</span>
              <div style={{ minWidth: 0 }}>
                <strong style={{ fontSize: "12px", color: "#f6dd84", display: "block", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  GBS SYSTEM MEMORY AI ASSISTANT
                </strong>
                <span style={{ fontSize: "10px", color: isSleeping ? "#94a3b8" : "#34d399", fontWeight: 700, display: "block" }}>
                  {isMinimized
                    ? "Minimized • Click Expand to view chat"
                    : isSleeping
                      ? "Sleeping • Click orb to wake"
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
                title={isMinimized ? "Expand GBS AI Assistant window" : "Minimize GBS AI Assistant window"}
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
                title="Finish conversation and put assistant to sleep"
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
                { label: "🎓 Internships vs Attachments", cmd: "Explain University Internships vs Attachments" },
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
