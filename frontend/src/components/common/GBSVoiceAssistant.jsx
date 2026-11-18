import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";

/**
 * GBS AI Voice Assistant (Continuous Conversational Siri-Style Remote)
 *
 * Keeps an active continuous voice + chat conversation open when clicked:
 * - Answers questions, performs portal navigation, autofills forms, and handles commands.
 * - After every answer, asks: "Are we done with what you want, or is there another?
 *   If there is another, tell me for the answer."
 * - Re-arms microphone automatically after speaking until the user says they are done
 *   (or clicks Done / Sleep), then politely says goodbye and goes to sleep.
 */
const GBS_KNOWLEDGE_BASE = {
  overview:
    "GBS School Management System connects Headmaster, Teachers, Students, Parents, Accountants, HR, Staff, Alumni, and Developers with admissions, attendance, timetables, exam grading, transport routing, and official mobile-money fee payments.",
  motto:
    "Intelligence Talks to Wisdom is the founding motto of GBS Company, uniting modern digital tools with sound educational leadership.",
  onboarding:
    "Schools can onboard remotely from the First Page by entering institution details, selecting a plan tier, and activating either Demo Sandbox (10 trial entries per module) or Live Production.",
  admissions:
    "Parents and prospective students submit admissions online; school administrators review uploaded documents, approve applications, and issue student login credentials.",
  payments:
    "Parents and students can pay school fees securely using MTN Mobile Money, Telecel Cash, AT Money, Visa, Mastercard, or Bank Transfer through Paystack and Hubtel. GBS never asks for or stores MoMo PINs or raw card CVVs.",
  transport:
    "Administrators assign students to commuter bus routes from the Headmaster Dashboard or Transport Fleet Portal by selecting the student, picking a commuter route, and confirming pickup stops.",
  proctoring:
    "When a student clicks Start Exam, live camera focus monitoring, tab-switch guards, and anti-copy protection run continuously until the exam is submitted or ended.",
  translator:
    "Use the movable Language Translator floating pill anywhere on the screen to drag it out of the way, translate text into multiple languages, or send translated messages.",
  mobileApp:
    "Open the Mobile App Hub from the top bar and click Install App on This Device to install GBS cleanly onto Android, iPhone, iPad, Windows, or Mac.",
  roles:
    "GBS supports Headmaster/Admin, Teacher, Student, Parent, Accountant, HR Manager, General Staff, Alumni, Inventory/Store, and Developer roles.",
  developer:
    "The Developer Control Center tracks real PostgreSQL vs fallback database status, encrypted backups, system locks, tenant approvals, and Demo trial quotas.",
  developerPrivacyShield:
    "Developer identity and personal contact details are protected by institutional security policy. Please use official GBS institutional support channels.",
  contact:
    "For institutional support, reach out through the official GBS portal communication desk."
};

const DONE_INTENT_REGEX = /\b(we are done|i am done|i'm done|yes done|done now|all done|finished|nothing else|no more|no other|that's all|that is all|conversation is over|go to sleep|go off|sleep now|goodbye|bye bye|stop listening|turn off)\b/i;
const ANOTHER_INTENT_REGEX = /\b(there is another|another question|another one|one more|not done|not yet|have another|more help|still here)\b/i;
const FOLLOWUP_PROMPT = "Are we done with what you want, or is there another? If there is another, tell me for the answer.";

export default function GBSVoiceAssistant() {
  const navigate = useNavigate();

  // Assistant UI & Continuous Conversation State
  const [isOpen, setIsOpen] = useState(false);
  const [isSleeping, setIsSleeping] = useState(true);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [typedInput, setTypedInput] = useState("");
  const [assistantResponse, setAssistantResponse] = useState(
    "Hello! Click me anytime to start a continuous conversation."
  );
  const [conversationMessages, setConversationMessages] = useState([]);
  const [continuousListening, setContinuousListening] = useState(true);

  // Tone & Sound Customization
  const [voiceRate, setVoiceRate] = useState(1.0);
  const [voicePitch, setVoicePitch] = useState(1.0);
  const [selectedVoiceIndex, setSelectedVoiceIndex] = useState(0);
  const [availableVoices, setAvailableVoices] = useState([]);
  const [speechSupported, setSpeechSupported] = useState(true);

  const recognitionRef = useRef(null);
  const synthRef = useRef(typeof window !== "undefined" ? window.speechSynthesis : null);
  const isSpeakingRef = useRef(false);
  const isOpenRef = useRef(false);
  const isSleepingRef = useRef(true);
  const continuousRef = useRef(true);
  const processCommandRef = useRef(null);
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

  // Load available English voices
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

  const appendMessage = (sender, text) => {
    const time = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    setConversationMessages((prev) => [...prev.slice(-24), { sender, text, time }]);
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

  // Initialize continuous Web Speech Recognition once cleanly using refs
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
    recognition.lang = "en-US";

    recognition.onstart = () => {
      setIsListening(true);
    };

    recognition.onresult = (event) => {
      let currentTranscript = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        currentTranscript += event.results[i][0].transcript;
      }
      setTranscript(currentTranscript);

      const lastResult = event.results[event.results.length - 1];
      if (lastResult?.isFinal) {
        const finalClean = currentTranscript.trim();
        if (finalClean && processCommandRef.current) {
          processCommandRef.current(finalClean);
        }
      }
    };

    recognition.onerror = (event) => {
      if (event.error === "not-allowed" || event.error === "service-not-allowed") {
        setIsListening(false);
      }
    };

    recognition.onend = () => {
      if (isOpenRef.current && !isSleepingRef.current && continuousRef.current && !isSpeakingRef.current) {
        setTimeout(() => safelyStartRecognition(), 180);
      } else {
        setIsListening(false);
      }
    };

    recognitionRef.current = recognition;

    return () => {
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

    const utterance = new SpeechSynthesisUtterance(text);
    if (availableVoices.length > 0) {
      utterance.voice = availableVoices[selectedVoiceIndex] || availableVoices[0];
    }
    utterance.rate = voiceRate;
    utterance.pitch = voicePitch;
    utterance.lang = "en-US";

    utterance.onstart = () => {
      setIsSpeaking(true);
      isSpeakingRef.current = true;
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
        setTimeout(() => safelyStartRecognition(), 200);
      }
    };

    utterance.onend = finishSpeech;
    utterance.onerror = finishSpeech;
    synthRef.current.speak(utterance);
  };

  const enterSleepMode = (
    goodbyeText = "Alright, we are done. I am going off to sleep now. Click me anytime you want more help!"
  ) => {
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
      }, 450);
    });

    if (!synthRef.current || !("speechSynthesis" in window)) {
      setTimeout(() => {
        isOpenRef.current = false;
        setIsOpen(false);
      }, 900);
    }
  };

  const wakeAndStartConversation = () => {
    isSleepingRef.current = false;
    isOpenRef.current = true;
    setIsSleeping(false);
    setIsOpen(true);
    setContinuousListening(true);
    continuousRef.current = true;
    const greeting =
      "Hello! I am listening continuously. Tell me what you want to do or ask, and I will stay with you until we are done.";
    setAssistantResponse(greeting);
    appendMessage("assistant", greeting);
    speakAloud(greeting);
  };

  const toggleAssistant = () => {
    if (!isOpen || isSleeping) {
      wakeAndStartConversation();
    } else {
      enterSleepMode("Going off to sleep now. Click me anytime you need help!");
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

  const processVoiceCommand = (rawText) => {
    const raw = String(rawText || "").trim();
    const text = raw.toLowerCase();
    if (!text) return;

    appendMessage("user", raw);
    setTranscript("");

    const cleanCmd = text.replace(/^(hey|hello|hi|ok|okay)?\s*gbs\s*/i, "").trim();

    // Check explicit conversation end -> go off and sleep
    if (DONE_INTENT_REGEX.test(cleanCmd) || cleanCmd === "done" || cleanCmd === "sleep" || cleanCmd === "no") {
      enterSleepMode();
      return;
    }

    // Check explicit "there is another" continuation prompt
    if (ANOTHER_INTENT_REGEX.test(cleanCmd)) {
      const promptMore = "Yes, I am wide awake and listening. Please tell me your next question or command for the answer.";
      setAssistantResponse(promptMore);
      appendMessage("assistant", promptMore);
      speakAloud(promptMore);
      return;
    }

    let responseText = "";
    let actionExecuted = false;

    // Navigation Commands
    if (cleanCmd.includes("login") || cleanCmd.includes("main login") || cleanCmd.includes("sign in")) {
      if (cleanCmd.includes("admin") || cleanCmd.includes("headmaster")) {
        responseText = "Opening the Headmaster Executive Portal now.";
        navigate("/login/admin");
      } else if (cleanCmd.includes("teacher")) {
        responseText = "Opening the Teacher Academic Portal.";
        navigate("/login/teacher");
      } else if (cleanCmd.includes("student")) {
        responseText = "Navigating to the Student Learning Hub.";
        navigate("/login/student");
      } else if (cleanCmd.includes("parent") || cleanCmd.includes("guardian")) {
        responseText = "Opening the Parent and Guardian Portal.";
        navigate("/login/parent");
      } else if (cleanCmd.includes("accountant") || cleanCmd.includes("finance")) {
        responseText = "Opening the Accountant and Finance Desk.";
        navigate("/login/accountant");
      } else if (cleanCmd.includes("staff") || cleanCmd.includes("hr")) {
        responseText = "Opening the Staff and HR Portal.";
        navigate("/login/staff");
      } else {
        responseText = "Navigating to the Main GBS Login Gateway.";
        navigate("/login");
      }
      actionExecuted = true;
    } else if (cleanCmd.includes("open headmaster") || cleanCmd.includes("headmaster portal")) {
      responseText = "Opening the Headmaster Executive Portal.";
      navigate("/login/admin");
      actionExecuted = true;
    } else if (cleanCmd.includes("open student")) {
      responseText = "Opening the Student Hub login.";
      navigate("/login/student");
      actionExecuted = true;
    } else if (cleanCmd.includes("transport") || cleanCmd.includes("bus")) {
      responseText = `${GBS_KNOWLEDGE_BASE.transport}`;
      actionExecuted = true;
    } else if (cleanCmd.includes("proctor") || cleanCmd.includes("exam monitor") || cleanCmd.includes("start exam")) {
      responseText = GBS_KNOWLEDGE_BASE.proctoring;
      actionExecuted = true;
    } else if (cleanCmd.includes("translat")) {
      responseText = GBS_KNOWLEDGE_BASE.translator;
      if (typeof window.openGBSScreenTranslator === "function") {
        window.openGBSScreenTranslator();
      }
      actionExecuted = true;
    } else if (cleanCmd.includes("install") || cleanCmd.includes("mobile app") || cleanCmd.includes("apk")) {
      responseText = GBS_KNOWLEDGE_BASE.mobileApp;
      actionExecuted = true;
    } else if (cleanCmd.includes("onboard") || cleanCmd.includes("register school") || cleanCmd.includes("first page")) {
      responseText = "Opening the School Onboarding First Page.";
      navigate("/onboarding");
      actionExecuted = true;
    } else if (cleanCmd.includes("website") || cleanCmd.includes("company")) {
      responseText = "Opening the GBS Company Website.";
      navigate("/company");
      actionExecuted = true;
    } else if (cleanCmd.includes("video") || cleanCmd.includes("presentation") || cleanCmd.includes("movie")) {
      responseText = "Opening the Role Guide Video Presentation Engine.";
      navigate("/presentation-engine");
      actionExecuted = true;
    } else if (
      cleanCmd.includes("emergency locator") ||
      cleanCmd.includes("locate parent") ||
      cleanCmd.includes("parent location") ||
      cleanCmd.includes("emergency map") ||
      cleanCmd.includes("track parent")
    ) {
      responseText = "Opening the Emergency Parent Locator map.";
      navigate("/emergency-locator");
      actionExecuted = true;
    } else if (
      cleanCmd.includes("live tracking") ||
      cleanCmd.includes("track student") ||
      cleanCmd.includes("tenant tracking") ||
      cleanCmd.includes("gps tracking")
    ) {
      responseText = "Opening Live Campus GPS Tracking.";
      navigate("/location/live-tracking");
      actionExecuted = true;
    } else if (
      cleanCmd.includes("mission control") ||
      cleanCmd.includes("developer login") ||
      cleanCmd.includes("developer control center") ||
      cleanCmd.includes("developer portal") ||
      cleanCmd.includes("open developer")
    ) {
      responseText = "Opening the Developer Control Center login.";
      navigate("/developer-control-center/login");
      actionExecuted = true;
    } else if (
      cleanCmd.includes("conference") ||
      cleanCmd.includes("study group") ||
      cleanCmd.includes("peer call")
    ) {
      responseText = "Opening the Student Cooperative Conferencing Hub.";
      navigate("/student/conference");
      actionExecuted = true;
    } else if (
      cleanCmd.includes("who is the developer") ||
      cleanCmd.includes("developer name") ||
      cleanCmd.includes("developer phone") ||
      cleanCmd.includes("developer contact") ||
      cleanCmd.includes("who developed") ||
      cleanCmd.includes("who built") ||
      cleanCmd.includes("who made") ||
      cleanCmd.includes("who created") ||
      cleanCmd.includes("gabriel") ||
      cleanCmd.includes("osei")
    ) {
      responseText = GBS_KNOWLEDGE_BASE.developerPrivacyShield;
      actionExecuted = true;
    } else if (
      cleanCmd.includes("what is gbs") ||
      cleanCmd.includes("tell me about gbs") ||
      cleanCmd.includes("about the system") ||
      cleanCmd.includes("how does gbs work")
    ) {
      responseText = GBS_KNOWLEDGE_BASE.overview;
      actionExecuted = true;
    } else if (cleanCmd.includes("motto") || cleanCmd.includes("intelligence talks to wisdom")) {
      responseText = GBS_KNOWLEDGE_BASE.motto;
      actionExecuted = true;
    } else if (cleanCmd.includes("how to onboard") || cleanCmd.includes("register an institution") || cleanCmd.includes("trial")) {
      responseText = GBS_KNOWLEDGE_BASE.onboarding;
      actionExecuted = true;
    } else if (cleanCmd.includes("admission") || cleanCmd.includes("apply")) {
      responseText = GBS_KNOWLEDGE_BASE.admissions;
      actionExecuted = true;
    } else if (cleanCmd.includes("pay") || cleanCmd.includes("fee") || cleanCmd.includes("payment") || cleanCmd.includes("momo")) {
      responseText = GBS_KNOWLEDGE_BASE.payments;
      actionExecuted = true;
    } else if (cleanCmd.includes("roles") || cleanCmd.includes("who can use") || cleanCmd.includes("dashboards")) {
      responseText = GBS_KNOWLEDGE_BASE.roles;
      actionExecuted = true;
    } else if (cleanCmd.includes("developer control") || cleanCmd.includes("security") || cleanCmd.includes("backup")) {
      responseText = GBS_KNOWLEDGE_BASE.developer;
      actionExecuted = true;
    } else if (cleanCmd.includes("contact") || cleanCmd.includes("hotline") || cleanCmd.includes("support")) {
      responseText = GBS_KNOWLEDGE_BASE.contact;
      actionExecuted = true;
    } else if (cleanCmd.startsWith("enter my name") || cleanCmd.startsWith("my name is") || cleanCmd.startsWith("enter name")) {
      const nameVal = cleanCmd.replace(/^(enter my name|my name is|enter name)\s*(is|to)?\s*/i, "").trim();
      const inputEl = document.querySelector('input[name*="name" i], input[id*="name" i], input[placeholder*="name" i]');
      if (inputEl && nameVal) {
        inputEl.value = nameVal;
        inputEl.dispatchEvent(new Event("input", { bubbles: true }));
        responseText = `Entered name ${nameVal} into the active form.`;
      } else {
        responseText = `Noted name ${nameVal}. Open a form first if you want me to fill it automatically.`;
      }
      actionExecuted = true;
    } else if (cleanCmd.startsWith("enter email") || cleanCmd.startsWith("my email is")) {
      const emailVal = cleanCmd.replace(/^(enter email|my email is)\s*(is|to)?\s*/i, "").trim().replace(/\sat\s/g, "@").replace(/\sdot\s/g, ".").replace(/\s+/g, "");
      const inputEl = document.querySelector('input[type="email"], input[name*="email" i], input[id*="email" i], input[placeholder*="email" i]');
      if (inputEl && emailVal) {
        inputEl.value = emailVal;
        inputEl.dispatchEvent(new Event("input", { bubbles: true }));
        responseText = `Entered email ${emailVal} into the active form.`;
      } else {
        responseText = `Recognized email ${emailVal}.`;
      }
      actionExecuted = true;
    } else if (cleanCmd.startsWith("enter amount") || cleanCmd.startsWith("enter figure") || cleanCmd.startsWith("figure is")) {
      const match = cleanCmd.match(/\d+([.,]\d+)?/);
      if (match) {
        const figure = match[0];
        const inputEl = document.querySelector('input[type="number"], input[name*="amount" i], input[name*="fee" i], input[id*="figure" i]');
        if (inputEl) {
          inputEl.value = figure;
          inputEl.dispatchEvent(new Event("input", { bubbles: true }));
          responseText = `Entered figure ${figure} into the amount field.`;
        } else {
          responseText = `Noted figure ${figure}.`;
        }
      } else {
        responseText = "I did not hear a numeric amount.";
      }
      actionExecuted = true;
    } else if (cleanCmd.includes("demo admin") || cleanCmd.includes("fill admin")) {
      const emailInput = document.querySelector('input[type="email"], input[name="email"], input[id="email"]');
      const passInput = document.querySelector('input[type="password"]');
      if (emailInput && passInput) {
        emailInput.value = "admin@gbs.com";
        passInput.value = "Admin123!";
        emailInput.dispatchEvent(new Event("input", { bubbles: true }));
        passInput.dispatchEvent(new Event("input", { bubbles: true }));
        responseText = "Filled administrator demo credentials.";
      } else {
        navigate("/login/admin");
        responseText = "Opening the Headmaster login page for demo sign-in.";
      }
      actionExecuted = true;
    } else if (cleanCmd.includes("submit") || cleanCmd.includes("click submit")) {
      const submitBtn = document.querySelector('button[type="submit"], .role-login-submit, .btn-submit, .gbs-btn-primary');
      if (submitBtn) {
        submitBtn.click();
        responseText = "Submitted the active form.";
      } else {
        responseText = "No active submit button was found on this view.";
      }
      actionExecuted = true;
    }

    if (!actionExecuted) {
      responseText = `I heard "${raw}". I can explain fees/payments, bus transport routes, exam proctoring, mobile app install, or open any portal for you.`;
    }

    // Continuous conversational loop: ALWAYS ask whether we are done or there is another question
    const fullTurnReply = `${responseText} ${FOLLOWUP_PROMPT}`;
    setAssistantResponse(fullTurnReply);
    appendMessage("assistant", fullTurnReply);
    speakAloud(fullTurnReply);

    if (typeof window !== "undefined" && typeof window.showGBSOpenNotice === "function") {
      window.showGBSOpenNotice(responseText, "info", "GBS ASSISTANT");
    }
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
      {/* Floating Launcher (Bottom-Right) */}
      <div
        className="gbs-voice-assistant-launcher"
        style={{
          position: "fixed",
          bottom: "20px",
          right: "20px",
          zIndex: 99999,
          display: "flex",
          alignItems: "center",
          gap: "10px",
          userSelect: "none"
        }}
      >
        {(!isOpen || isSleeping) && (
          <div
            onClick={toggleAssistant}
            style={{
              background: "rgba(15, 23, 42, 0.92)",
              color: "#f8fafc",
              border: "1px solid rgba(212, 175, 55, 0.6)",
              borderRadius: "20px",
              padding: "6px 12px",
              fontSize: "12px",
              fontWeight: 700,
              boxShadow: "0 6px 20px rgba(0, 0, 0, 0.5)",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "6px",
              backdropFilter: "blur(10px)"
            }}
          >
            <span style={{ color: "#38bdf8" }}>🎙️</span>
            <span>GBS Assistant</span>
          </div>
        )}

        <button
          type="button"
          onClick={toggleAssistant}
          title={isOpen && !isSleeping ? "Click to put GBS Assistant to sleep" : "Click to wake GBS Assistant"}
          style={{
            width: "56px",
            height: "56px",
            borderRadius: "50%",
            border: isOpen && !isSleeping ? "2.5px solid #d4af37" : "2px solid #38bdf8",
            background: isOpen && !isSleeping
              ? "radial-gradient(circle at 35% 35%, #38bdf8 0%, #d4af37 50%, #991b1b 100%)"
              : "radial-gradient(circle at 35% 35%, #1e293b 0%, #0f172a 70%, #020617 100%)",
            boxShadow: isOpen && !isSleeping
              ? "0 0 30px rgba(56, 189, 248, 0.8), 0 0 50px rgba(212, 175, 55, 0.6)"
              : "0 6px 20px rgba(0, 0, 0, 0.6), 0 0 15px rgba(56, 189, 248, 0.3)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            outline: "none",
            transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
            transform: isOpen && !isSleeping ? "scale(1.08)" : "scale(1)"
          }}
        >
          {isSpeaking ? (
            <span style={{ fontSize: "22px" }}>🔊</span>
          ) : isListening ? (
            <span style={{ fontSize: "22px" }}>🎙️</span>
          ) : (
            <span style={{ fontSize: "20px" }}>{isSleeping ? "😴" : "⚡"}</span>
          )}
        </button>
      </div>

      {/* Continuous Conversation Window */}
      {isOpen && (
        <div
          style={{
            position: "fixed",
            bottom: "86px",
            right: "20px",
            width: "390px",
            maxWidth: "calc(100vw - 32px)",
            maxHeight: "82vh",
            background: "rgba(10, 16, 29, 0.97)",
            border: "1.5px solid #d4af37",
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
          {/* Header */}
          <div
            style={{
              padding: "14px 18px",
              background: "linear-gradient(135deg, rgba(30, 41, 59, 0.9) 0%, rgba(15, 23, 42, 0.98) 100%)",
              borderBottom: "1px solid rgba(212, 175, 55, 0.3)",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center"
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <span style={{ fontSize: "18px" }}>{isSleeping ? "😴" : isListening ? "🎙️" : "🔊"}</span>
              <div>
                <strong style={{ fontSize: "13.5px", color: "#fbbf24", display: "block" }}>
                  GBS CONVERSATIONAL ASSISTANT
                </strong>
                <span style={{ fontSize: "10.5px", color: isSleeping ? "#94a3b8" : "#34d399", fontWeight: 700 }}>
                  {isSleeping
                    ? "Sleeping • Click orb to wake"
                    : isSpeaking
                      ? "Speaking answer & waiting for reply..."
                      : isListening
                        ? "● Continuous Listening Active"
                        : "● Active Session (Ask or say Done)"}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => enterSleepMode()}
              style={{
                background: "rgba(239, 68, 68, 0.16)",
                border: "1px solid rgba(239, 68, 68, 0.45)",
                color: "#fca5a5",
                fontSize: "11px",
                fontWeight: 800,
                cursor: "pointer",
                padding: "4px 10px",
                borderRadius: "999px"
              }}
              title="Finish conversation and put assistant to sleep"
            >
              😴 Done / Sleep
            </button>
          </div>

          {/* Continuous Multi-Turn Thread */}
          <div style={{ padding: "14px 16px", flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: "10px" }}>
            {conversationMessages.map((m, idx) => (
              <div
                key={idx}
                style={{
                  alignSelf: m.sender === "user" ? "flex-end" : "flex-start",
                  maxWidth: "88%",
                  background: m.sender === "user" ? "rgba(2, 132, 199, 0.28)" : "rgba(15, 23, 42, 0.88)",
                  border: m.sender === "user" ? "1px solid rgba(56, 189, 248, 0.5)" : "1px solid rgba(212, 175, 55, 0.35)",
                  borderRadius: "12px",
                  padding: "9px 12px",
                  fontSize: "12.5px",
                  lineHeight: 1.45,
                  color: m.sender === "user" ? "#e0f2fe" : "#f8fafc"
                }}
              >
                <div style={{ fontSize: "10px", color: m.sender === "user" ? "#7dd3fc" : "#fbbf24", fontWeight: 800, marginBottom: "3px" }}>
                  {m.sender === "user" ? "You" : "GBS Assistant"} • {m.time}
                </div>
                <div>{m.text}</div>
              </div>
            ))}

            {transcript && (
              <div style={{ fontSize: "12px", color: "#7dd3fc", fontStyle: "italic", padding: "4px 8px" }}>
                🎙️ Listening: "{transcript}"
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Interactive Continuous Reply Bar + Quick Actions */}
          <div style={{ padding: "10px 14px", borderTop: "1px solid #1e293b", background: "rgba(2, 6, 23, 0.9)" }}>
            <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginBottom: "8px" }}>
              <button
                type="button"
                onClick={() => processVoiceCommand("Yes, there is another question")}
                style={{
                  background: "rgba(16, 185, 129, 0.16)",
                  border: "1px solid #10b981",
                  color: "#6ee7b7",
                  borderRadius: "999px",
                  padding: "4px 10px",
                  fontSize: "11px",
                  fontWeight: 700,
                  cursor: "pointer"
                }}
              >
                ➕ Yes, There Is Another
              </button>
              <button
                type="button"
                onClick={() => processVoiceCommand("We are done")}
                style={{
                  background: "rgba(245, 158, 11, 0.16)",
                  border: "1px solid #f59e0b",
                  color: "#fde68a",
                  borderRadius: "999px",
                  padding: "4px 10px",
                  fontSize: "11px",
                  fontWeight: 700,
                  cursor: "pointer"
                }}
              >
                ✅ Yes, We Are Done (Sleep)
              </button>
            </div>

            <form onSubmit={handleTypedSubmit} style={{ display: "flex", gap: "6px" }}>
              <input
                type="text"
                placeholder="Ask next question or type 'done'..."
                value={typedInput}
                onChange={(e) => setTypedInput(e.target.value)}
                style={{
                  flex: 1,
                  background: "#0f172a",
                  color: "#f8fafc",
                  border: "1px solid #334155",
                  borderRadius: "8px",
                  padding: "8px 10px",
                  fontSize: "12.5px",
                  outline: "none"
                }}
              />
              <button
                type="submit"
                style={{
                  background: "#0284c7",
                  color: "#ffffff",
                  border: "none",
                  borderRadius: "8px",
                  padding: "8px 12px",
                  fontSize: "12px",
                  fontWeight: 800,
                  cursor: "pointer"
                }}
              >
                Ask
              </button>
            </form>

            {/* Footer Controls */}
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
                  background: isListening ? "#dc2626" : "#2563eb",
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
                  background: "#1e293b",
                  color: "#fbbf24",
                  border: "1px solid #334155",
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
        </div>
      )}
    </>
  );
}
