import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";

/**
 * GBS AI Voice Assistant (Siri-style Voice & Accessibility Remote Engine)
 * 
 * Provides complete hands-free and accessibility remote voice control for GBS System:
 * 1. Listens for speech commands via Web Speech API (webkitSpeechRecognition / SpeechRecognition).
 * 2. Hotword / Wake word detection: "Hey GBS", "Hello GBS", "GBS".
 * 3. Speaks responses aloud with natural speech synthesis (SpeechSynthesisUtterance).
 * 4. Customizable sound and tone: Pitch, rate, and voice accents.
 * 5. Explains GBS School Management System to any user who asks questions.
 * 6. Executes remote navigation (Portals, Login, Onboarding, Website, Presentation).
 * 7. Interacts with active forms (enters names, emails, amounts/figures, submits forms, and fills demo logins).
 * 8. Visual Siri-style fluid animated orb with pulsing sound waves.
 */

const GBS_KNOWLEDGE_BASE = {
  overview:
    "GBS School Management System is an enterprise institutional operating platform designed to digitize every aspect of school governance. It connects eight user roles with automated admissions, weekly timetables, attendance tracking, tuition billing, exam grading, and parent emergency GPS tracking. How can I guide you today?",
  motto:
    "Intelligence Talks to Wisdom is the founding motto of GBS Company, symbolizing the union of advanced digital intelligence with deep institutional wisdom and bank-grade data security.",
  onboarding:
    "Educational institutions can onboard 100% remotely through the First Page gateway without requiring any developer travel. Enter your institution name, select your tier, and your isolated multi-tenant database enclave is provisioned immediately with a 30-day trial.",
  admissions:
    "Prospective parents can submit inquiries and applications online. School administrators verify uploaded birth certificates and transcripts, schedule entrance interviews, and approve applications, which automatically provisions student credentials.",
  payments:
    "Parents can pay school fees directly via Mobile Money or Bank Card. Tuition invoices are atomically updated in the finance general ledger, and official stamped receipts are generated instantly.",
  roles:
    "GBS supports eight distinct roles: Super Administrator, Headmaster, Teachers, Students, Parents, Accountants, Staff, and System Developers, each with dedicated workspaces and role-based access control.",
  developer:
    "The Developer Mission Control provides hardware telemetry, encrypted database backups, system-wide maintenance mode toggles, and multi-region disaster recovery drill monitoring with PIN-verified security.",
  developerPrivacyShield:
    "Developer identity, names, and contact details are classified under institutional security protocols and are not disclosed. GBS School Management System is developed, engineered, and maintained by the GBS Global Enterprise Engineering Directorate. For official assistance, please reach out via our institutional support channels or official company website.",
  contact:
    "GBS Company provides institutional enterprise support worldwide through our official school management portal and international service desks. For inquiries, please reach out via our official website."
};

export default function GBSVoiceAssistant() {
  const navigate = useNavigate();
  const location = useLocation();

  // Assistant UI State
  const [isOpen, setIsOpen] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [assistantResponse, setAssistantResponse] = useState(
    "Hello! I am your GBS Voice Assistant. You can speak commands to navigate, enter names or figures, make payments, or ask me about the system."
  );
  const [continuousListening, setContinuousListening] = useState(true);

  // Tone & Sound Customization
  const [voiceRate, setVoiceRate] = useState(1.0); // 0.8 to 1.3
  const [voicePitch, setVoicePitch] = useState(1.0); // 0.8 to 1.4
  const [selectedVoiceIndex, setSelectedVoiceIndex] = useState(0);
  const [availableVoices, setAvailableVoices] = useState([]);
  const [speechSupported, setSpeechSupported] = useState(true);

  const recognitionRef = useRef(null);
  const synthRef = useRef(typeof window !== "undefined" ? window.speechSynthesis : null);
  const isSpeakingRef = useRef(false);

  // Load available system voices
  useEffect(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      setSpeechSupported(false);
      return;
    }

    const loadVoices = () => {
      const voices = window.speechSynthesis.getVoices();
      if (voices && voices.length > 0) {
        // Prioritize English natural voices
        const englishVoices = voices.filter((v) => v.lang.startsWith("en"));
        setAvailableVoices(englishVoices.length > 0 ? englishVoices : voices);
      }
    };

    loadVoices();
    if (window.speechSynthesis.onvoiceschanged !== undefined) {
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }
  }, []);

  // Initialize Web Speech Recognition
  useEffect(() => {
    if (typeof window === "undefined") return;
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      console.warn("Web SpeechRecognition is not supported in this browser.");
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

      // If sentence finalized, process command
      const lastResult = event.results[event.results.length - 1];
      if (lastResult.isFinal) {
        const finalClean = currentTranscript.trim();
        if (finalClean) {
          processVoiceCommand(finalClean);
        }
      }
    };

    recognition.onerror = (event) => {
      if (event.error !== "no-speech") {
        console.warn("GBS Voice Assistant recognition error:", event.error);
      }
      if (event.error === "not-allowed") {
        setIsListening(false);
      }
    };

    recognition.onend = () => {
      // If continuous listening is enabled and assistant is open, restart unless speaking
      if (isOpen && continuousListening && !isSpeakingRef.current) {
        try {
          recognition.start();
        } catch { }
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
  }, [isOpen, continuousListening]);

  // Speak text aloud like Siri
  const speakAloud = (text, onComplete = null) => {
    if (!synthRef.current || !("speechSynthesis" in window)) return;

    try {
      synthRef.current.cancel(); // Cancel any ongoing speech
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
      // Temporarily pause recognition while assistant is speaking to avoid feedback echo
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch { }
      }
    };

    utterance.onend = () => {
      setIsSpeaking(false);
      isSpeakingRef.current = false;
      if (onComplete) onComplete();
      // Resume listening if still open
      if (isOpen && continuousListening && recognitionRef.current) {
        try { recognitionRef.current.start(); } catch { }
      }
    };

    utterance.onerror = () => {
      setIsSpeaking(false);
      isSpeakingRef.current = false;
      if (isOpen && continuousListening && recognitionRef.current) {
        try { recognitionRef.current.start(); } catch { }
      }
    };

    synthRef.current.speak(utterance);
  };

  // Toggle Assistant
  const toggleAssistant = () => {
    if (!isOpen) {
      setIsOpen(true);
      speakAloud("I'm listening. How can I help you in GBS System?");
      if (recognitionRef.current) {
        try { recognitionRef.current.start(); } catch { }
      }
    } else {
      setIsOpen(false);
      if (synthRef.current) {
        try { synthRef.current.cancel(); } catch { }
      }
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch { }
      }
    }
  };

  // Listen for global wake hotword or trigger event
  useEffect(() => {
    const handleVoiceTrigger = (e) => {
      setIsOpen(true);
      if (e?.detail?.query) {
        processVoiceCommand(e.detail.query);
      } else {
        speakAloud("GBS Voice Assistant active. Please give your command.");
      }
    };

    window.addEventListener("gbs_open_voice_assistant", handleVoiceTrigger);
    window.gbsVoiceAssistant = {
      open: () => setIsOpen(true),
      close: () => setIsOpen(false),
      speak: (text) => speakAloud(text),
      command: (cmd) => processVoiceCommand(cmd)
    };

    return () => {
      window.removeEventListener("gbs_open_voice_assistant", handleVoiceTrigger);
      delete window.gbsVoiceAssistant;
    };
  }, []);

  // Process and Obey Commands
  const processVoiceCommand = (rawText) => {
    const text = rawText.toLowerCase().trim();
    if (!text) return;

    let responseText = "";
    let actionExecuted = false;

    // 1. Wake word filtering ("Hey GBS", "GBS", etc.)
    const cleanCmd = text.replace(/^(hey|hello|hi|ok|okay)?\s*gbs\s*/i, "").trim();

    // 2. Navigation / Location Commands
    if (
      cleanCmd.includes("login") ||
      cleanCmd.includes("main login") ||
      cleanCmd.includes("sign in")
    ) {
      if (cleanCmd.includes("admin") || cleanCmd.includes("headmaster")) {
        responseText = "Opening the Headmaster Executive Portal now.";
        navigate("/login/admin");
        actionExecuted = true;
      } else if (cleanCmd.includes("teacher")) {
        responseText = "Opening the Teacher Academic Portal.";
        navigate("/login/teacher");
        actionExecuted = true;
      } else if (cleanCmd.includes("student")) {
        responseText = "Navigating to the Student Learning Hub.";
        navigate("/login/student");
        actionExecuted = true;
      } else if (cleanCmd.includes("parent") || cleanCmd.includes("guardian")) {
        responseText = "Opening the Parent and Guardian Portal.";
        navigate("/login/parent");
        actionExecuted = true;
      } else if (cleanCmd.includes("accountant") || cleanCmd.includes("finance")) {
        responseText = "Opening the Accountant and Finance Desk.";
        navigate("/login/accountant");
        actionExecuted = true;
      } else if (cleanCmd.includes("staff") || cleanCmd.includes("hr")) {
        responseText = "Opening the Staff and HR Portal.";
        navigate("/login/staff");
        actionExecuted = true;
      } else {
        responseText = "Navigating to the Main GBS Login Gateway.";
        navigate("/login");
        actionExecuted = true;
      }
    } else if (cleanCmd.includes("onboard") || cleanCmd.includes("register school") || cleanCmd.includes("first page")) {
      responseText = "Opening the Enterprise Tenant Onboarding First Page.";
      navigate("/onboarding");
      actionExecuted = true;
    } else if (cleanCmd.includes("website") || cleanCmd.includes("company")) {
      responseText = "Navigating to the GBS Company Website.";
      navigate("/company");
      actionExecuted = true;
    } else if (cleanCmd.includes("video") || cleanCmd.includes("presentation") || cleanCmd.includes("movie")) {
      responseText = "Opening the GBS Real-Life Video Presentation Engine.";
      navigate("/presentation-engine");
      actionExecuted = true;
    } else if (
      cleanCmd.includes("emergency locator") ||
      cleanCmd.includes("locate parent") ||
      cleanCmd.includes("parent location") ||
      cleanCmd.includes("emergency map") ||
      cleanCmd.includes("track parent")
    ) {
      responseText = "Opening the Admin Emergency Parent and Guardian Locator on Google Maps.";
      navigate("/emergency-locator");
      actionExecuted = true;
    } else if (
      cleanCmd.includes("live tracking") ||
      cleanCmd.includes("track student") ||
      cleanCmd.includes("tenant tracking") ||
      cleanCmd.includes("gps tracking")
    ) {
      responseText = "Opening the Live Tenant and Student GPS Tracking Map.";
      navigate("/location/live-tracking");
      actionExecuted = true;
    } else if (
      cleanCmd.includes("mission control") ||
      cleanCmd.includes("developer login") ||
      cleanCmd.includes("developer control center") ||
      cleanCmd.includes("developer portal") ||
      cleanCmd.includes("open developer")
    ) {
      responseText = "Opening the Chief Developer Control Center login gateway.";
      navigate("/developer-control-center/login");
      actionExecuted = true;
    } else if (
      cleanCmd.includes("conference") ||
      cleanCmd.includes("cooperative learning") ||
      cleanCmd.includes("social lounge") ||
      cleanCmd.includes("student voice call") ||
      cleanCmd.includes("student video call") ||
      cleanCmd.includes("study group") ||
      cleanCmd.includes("study circle") ||
      cleanCmd.includes("peer call") ||
      cleanCmd.includes("group meeting")
    ) {
      responseText = "Opening the Student Cooperative Conferencing Hub and Social Lounge for live voice and video collaboration.";
      navigate("/student/conference");
      actionExecuted = true;
    } else if (
      cleanCmd.includes("role presentation") ||
      cleanCmd.includes("user role") ||
      cleanCmd.includes("role video") ||
      cleanCmd.includes("dashboard video") ||
      cleanCmd.includes("video presentation") ||
      cleanCmd.includes("system presentation") ||
      cleanCmd.includes("how the system works")
    ) {
      responseText = "Opening the Comprehensive GBS User Roles Video Presentation Engine and Dashboard Guides.";
      navigate("/presentation-engine");
      actionExecuted = true;
    }

    // STRICT DEVELOPER PRIVACY SHIELD (Zero developer identity disclosure)
    else if (
      cleanCmd.includes("who is the developer") ||
      cleanCmd.includes("developer name") ||
      cleanCmd.includes("developer phone") ||
      cleanCmd.includes("developer contact") ||
      cleanCmd.includes("developer info") ||
      cleanCmd.includes("about the developer") ||
      cleanCmd.includes("tell me about the developer") ||
      cleanCmd.includes("who developed") ||
      cleanCmd.includes("who built") ||
      cleanCmd.includes("who made") ||
      cleanCmd.includes("who created") ||
      cleanCmd.includes("who programmed") ||
      cleanCmd.includes("who engineered") ||
      cleanCmd.includes("who designed") ||
      cleanCmd.includes("who is gabriel") ||
      cleanCmd.includes("gabriel") ||
      cleanCmd.includes("osei") ||
      cleanCmd.includes("creator") ||
      cleanCmd.includes("author")
    ) {
      responseText = GBS_KNOWLEDGE_BASE.developerPrivacyShield;
      actionExecuted = true;
    }

    // 3. System Inquiries & Explanations (Questions about GBS)
    else if (
      cleanCmd.includes("what is gbs") ||
      cleanCmd.includes("tell me about gbs") ||
      cleanCmd.includes("about the system") ||
      cleanCmd.includes("how does gbs work")
    ) {
      responseText = GBS_KNOWLEDGE_BASE.overview;
      actionExecuted = true;
    } else if (cleanCmd.includes("motto") || cleanCmd.includes("intelligence talks to wisdom") || cleanCmd.includes("sentence")) {
      responseText = GBS_KNOWLEDGE_BASE.motto;
      actionExecuted = true;
    } else if (cleanCmd.includes("how to onboard") || cleanCmd.includes("register an institution") || cleanCmd.includes("trial")) {
      responseText = GBS_KNOWLEDGE_BASE.onboarding;
      actionExecuted = true;
    } else if (cleanCmd.includes("admission") || cleanCmd.includes("apply") || cleanCmd.includes("prospective")) {
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
    } else if (cleanCmd.includes("contact") || cleanCmd.includes("hotline") || cleanCmd.includes("phone") || cleanCmd.includes("support")) {
      responseText = GBS_KNOWLEDGE_BASE.contact;
      actionExecuted = true;
    }

    // 4. Form Autofill & Input Commands (Accessibility Assist)
    else if (cleanCmd.startsWith("enter my name") || cleanCmd.startsWith("my name is") || cleanCmd.startsWith("enter name")) {
      const nameVal = cleanCmd.replace(/^(enter my name|my name is|enter name)\s*(is|to)?\s*/i, "").trim();
      const inputEl = document.querySelector('input[name*="name" i], input[id*="name" i], input[placeholder*="name" i]');
      if (inputEl && nameVal) {
        inputEl.value = nameVal;
        inputEl.dispatchEvent(new Event("input", { bubbles: true }));
        responseText = `Entered name ${nameVal} into the form.`;
      } else {
        responseText = `Noted name ${nameVal}. Please open a form to enter it automatically.`;
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
      const match = cleanCmd.match(/\d+([\.,]\d+)?/);
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
        responseText = "I did not detect a numerical figure. Please specify the amount.";
      }
      actionExecuted = true;
    }

    // 5. Quick Demo Login Shortcuts (Hands-Free Access)
    else if (cleanCmd.includes("demo admin") || cleanCmd.includes("fill admin")) {
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
        responseText = "Opening Headmaster portal with administrator credentials.";
      }
      actionExecuted = true;
    } else if (cleanCmd.includes("submit") || cleanCmd.includes("click submit") || cleanCmd.includes("press enter")) {
      const submitBtn = document.querySelector('button[type="submit"], .role-login-submit, .btn-submit, .gbs-btn-primary');
      if (submitBtn) {
        submitBtn.click();
        responseText = "Submitting the form now.";
      } else {
        responseText = "No active submit button found on this view.";
      }
      actionExecuted = true;
    }

    // 6. Dismiss / Goodbye
    else if (cleanCmd.includes("goodbye") || cleanCmd.includes("stop") || cleanCmd.includes("exit") || cleanCmd.includes("close")) {
      responseText = "Goodbye! I am always here whenever you say Hey GBS.";
      setIsOpen(false);
      speakAloud(responseText);
      return;
    }

    // Fallback response
    if (!actionExecuted) {
      responseText = `I heard: "${rawText}". You can ask me to open a portal like Headmaster or Student, ask what is GBS, enter a name, or say Goodbye.`;
    }

    setAssistantResponse(responseText);
    speakAloud(responseText);

    if (window.showGBSOpenNotice) {
      window.showGBSOpenNotice(responseText, "info", "GBS VOICE ASSISTANT (SIRI REMOTE)");
    }
  };

  return (
    <>
      {/* Floating Siri-Style Animated Orb Button (Persistent Bottom-Right) */}
      <div
        className="gbs-voice-assistant-launcher"
        style={{
          position: "fixed",
          bottom: "24px",
          right: "24px",
          zIndex: 99999,
          display: "flex",
          alignItems: "center",
          gap: "12px",
          userSelect: "none"
        }}
      >
        {/* Floating Label / Prompt */}
        {!isOpen && (
          <div
            onClick={toggleAssistant}
            style={{
              background: "rgba(15, 23, 42, 0.92)",
              color: "#f8fafc",
              border: "1px solid rgba(212, 175, 55, 0.6)",
              borderRadius: "20px",
              padding: "6px 14px",
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
            <span>Say "Hey GBS" or Tap</span>
          </div>
        )}

        {/* Siri Glowing Orb Trigger Button */}
        <button
          type="button"
          onClick={toggleAssistant}
          title="GBS AI Voice Assistant (Siri-Style Remote Accessibility)"
          style={{
            width: "60px",
            height: "60px",
            borderRadius: "50%",
            border: isOpen ? "2.5px solid #d4af37" : "2px solid #38bdf8",
            background: isOpen
              ? "radial-gradient(circle at 35% 35%, #38bdf8 0%, #d4af37 50%, #991b1b 100%)"
              : "radial-gradient(circle at 35% 35%, #1e293b 0%, #0f172a 70%, #020617 100%)",
            boxShadow: isOpen
              ? "0 0 30px rgba(56, 189, 248, 0.8), 0 0 50px rgba(212, 175, 55, 0.6)"
              : "0 6px 20px rgba(0, 0, 0, 0.6), 0 0 15px rgba(56, 189, 248, 0.3)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            outline: "none",
            transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
            transform: isOpen ? "scale(1.08)" : "scale(1)"
          }}
        >
          {isSpeaking ? (
            <span style={{ fontSize: "24px", animation: "pulse 1s infinite" }}>🔊</span>
          ) : isListening ? (
            <span style={{ fontSize: "24px", animation: "pulse 0.8s infinite" }}>🎙️</span>
          ) : (
            <span style={{ fontSize: "22px" }}>⚡</span>
          )}
        </button>
      </div>

      {/* Expanded Siri-Style Interactive Voice Modal */}
      {isOpen && (
        <div
          style={{
            position: "fixed",
            bottom: "95px",
            right: "24px",
            width: "380px",
            maxWidth: "calc(100vw - 36px)",
            maxHeight: "85vh",
            background: "rgba(10, 16, 29, 0.96)",
            border: "1.5px solid #d4af37",
            borderRadius: "24px",
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
              padding: "16px 20px",
              background: "linear-gradient(135deg, rgba(30, 41, 59, 0.8) 0%, rgba(15, 23, 42, 0.95) 100%)",
              borderBottom: "1px solid rgba(212, 175, 55, 0.3)",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center"
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <span style={{ fontSize: "20px" }}>🎙️</span>
              <div>
                <strong style={{ fontSize: "14px", letterSpacing: "0.5px", color: "#fbbf24" }}>
                  GBS AI VOICE ASSISTANT
                </strong>
                <span style={{ fontSize: "10px", display: "block", color: "#94a3b8" }}>
                  INTELLIGENCE TALKS TO WISDOM • SIRI REMOTE
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={toggleAssistant}
              style={{
                background: "transparent",
                border: "none",
                color: "#94a3b8",
                fontSize: "18px",
                cursor: "pointer",
                padding: "4px"
              }}
            >
              ✕
            </button>
          </div>

          {/* Siri Visualizer Orb & Sound Waves */}
          <div
            style={{
              padding: "24px 20px",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              background: "radial-gradient(circle at 50% 50%, rgba(56, 189, 248, 0.08) 0%, transparent 70%)"
            }}
          >
            {/* Animated Siri Multi-Ring Orb */}
            <div
              style={{
                width: "90px",
                height: "90px",
                borderRadius: "50%",
                background: isSpeaking
                  ? "radial-gradient(circle at 35% 35%, #38bdf8 0%, #d4af37 40%, #ef4444 80%, #8b5cf6 100%)"
                  : isListening
                  ? "radial-gradient(circle at 35% 35%, #10b981 0%, #38bdf8 50%, #d4af37 100%)"
                  : "radial-gradient(circle at 35% 35%, #334155 0%, #0f172a 100%)",
                boxShadow: isSpeaking
                  ? "0 0 45px rgba(212, 175, 55, 0.9), 0 0 25px rgba(56, 189, 248, 0.7)"
                  : isListening
                  ? "0 0 35px rgba(16, 185, 129, 0.8), 0 0 20px rgba(56, 189, 248, 0.6)"
                  : "0 0 15px rgba(0, 0, 0, 0.5)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: "16px",
                transition: "all 0.3s ease"
              }}
            >
              <div
                style={{
                  width: "70px",
                  height: "70px",
                  borderRadius: "50%",
                  background: "rgba(2, 6, 23, 0.7)",
                  backdropFilter: "blur(6px)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#ffffff",
                  fontSize: "26px"
                }}
              >
                {isSpeaking ? "🔊" : isListening ? "🎙️" : "⚡"}
              </div>
            </div>

            {/* Status indicator */}
            <div
              style={{
                fontSize: "12px",
                fontWeight: 800,
                letterSpacing: "1px",
                color: isSpeaking ? "#fbbf24" : isListening ? "#34d399" : "#94a3b8",
                textTransform: "uppercase",
                marginBottom: "10px"
              }}
            >
              {isSpeaking ? "Speaking Aloud..." : isListening ? "Listening for your voice..." : "Assistant Ready"}
            </div>

            {/* Sound Wave Bars Animation */}
            {(isListening || isSpeaking) && (
              <div style={{ display: "flex", gap: "4px", alignItems: "center", height: "24px" }}>
                {[16, 22, 12, 24, 18, 10, 20, 14, 24].map((h, i) => (
                  <div
                    key={i}
                    style={{
                      width: "3px",
                      height: `${h}px`,
                      background: isSpeaking ? "#d4af37" : "#38bdf8",
                      borderRadius: "2px",
                      opacity: 0.85
                    }}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Transcript / Spoken Output Display */}
          <div style={{ padding: "0 20px 16px 20px", flex: 1, overflowY: "auto" }}>
            {transcript && (
              <div
                style={{
                  background: "rgba(30, 41, 59, 0.7)",
                  border: "1px solid #334155",
                  borderRadius: "12px",
                  padding: "10px 14px",
                  fontSize: "13px",
                  color: "#7dd3fc",
                  marginBottom: "12px",
                  fontStyle: "italic"
                }}
              >
                🗣️ "{transcript}"
              </div>
            )}

            <div
              style={{
                background: "rgba(15, 23, 42, 0.8)",
                border: "1px solid rgba(212, 175, 55, 0.4)",
                borderRadius: "14px",
                padding: "12px 14px",
                fontSize: "13px",
                color: "#f8fafc",
                lineHeight: "1.5"
              }}
            >
              {assistantResponse}
            </div>

            {/* Tone, Sound & Voice Settings Accordion */}
            <div style={{ marginTop: "14px", borderTop: "1px solid #1e293b", paddingTop: "10px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                <span style={{ fontSize: "11px", color: "#94a3b8", fontWeight: 700 }}>
                  VOICE SOUND & TONE ADJUSTMENT
                </span>
                <span style={{ fontSize: "11px", color: "#d4af37" }}>
                  {voiceRate}x speed • {voicePitch}x pitch
                </span>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                <div>
                  <label style={{ fontSize: "10px", color: "#64748b", display: "block" }}>Speech Speed:</label>
                  <input
                    type="range"
                    min="0.8"
                    max="1.4"
                    step="0.1"
                    value={voiceRate}
                    onChange={(e) => setVoiceRate(parseFloat(e.target.value))}
                    style={{ width: "100%" }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: "10px", color: "#64748b", display: "block" }}>Tone / Pitch:</label>
                  <input
                    type="range"
                    min="0.8"
                    max="1.3"
                    step="0.1"
                    value={voicePitch}
                    onChange={(e) => setVoicePitch(parseFloat(e.target.value))}
                    style={{ width: "100%" }}
                  />
                </div>
              </div>

              {availableVoices.length > 0 && (
                <div style={{ marginTop: "6px" }}>
                  <label style={{ fontSize: "10px", color: "#64748b", display: "block" }}>Assistant Voice Accent:</label>
                  <select
                    value={selectedVoiceIndex}
                    onChange={(e) => setSelectedVoiceIndex(parseInt(e.target.value, 10))}
                    style={{
                      width: "100%",
                      background: "#020617",
                      color: "#f8fafc",
                      border: "1px solid #334155",
                      borderRadius: "6px",
                      padding: "4px 8px",
                      fontSize: "11px"
                    }}
                  >
                    {availableVoices.slice(0, 8).map((v, idx) => (
                      <option key={idx} value={idx}>
                        {v.name} ({v.lang})
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* Suggested Voice Commands for Quick Access */}
            <div style={{ marginTop: "14px" }}>
              <span style={{ fontSize: "11px", color: "#94a3b8", fontWeight: 700, display: "block", marginBottom: "6px" }}>
                ACCESSIBILITY QUICK COMMANDS:
              </span>
              <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                {[
                  "What is GBS?",
                  "Emergency Locator",
                  "Live Tracking Map",
                  "Open Headmaster",
                  "Open Student Hub",
                  "How to pay fees",
                  "Fill Demo Admin",
                  "Open Videos",
                  "Goodbye"
                ].map((cmd) => (
                  <button
                    key={cmd}
                    type="button"
                    onClick={() => processVoiceCommand(cmd)}
                    style={{
                      background: "#1e293b",
                      border: "1px solid #334155",
                      color: "#cbd5e1",
                      borderRadius: "14px",
                      padding: "4px 10px",
                      fontSize: "11px",
                      cursor: "pointer"
                    }}
                  >
                    "{cmd}"
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Footer Controls */}
          <div
            style={{
              padding: "12px 20px",
              background: "#020617",
              borderTop: "1px solid #1e293b",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center"
            }}
          >
            <button
              type="button"
              onClick={() => {
                if (isListening && recognitionRef.current) {
                  recognitionRef.current.stop();
                } else if (recognitionRef.current) {
                  recognitionRef.current.start();
                }
              }}
              style={{
                background: isListening ? "#dc2626" : "#2563eb",
                color: "#ffffff",
                border: "none",
                borderRadius: "8px",
                padding: "8px 14px",
                fontSize: "12px",
                fontWeight: 700,
                cursor: "pointer"
              }}
            >
              {isListening ? "⏹️ Pause Mic" : "🎙️ Start Listening"}
            </button>

            <button
              type="button"
              onClick={() => speakAloud(assistantResponse)}
              style={{
                background: "#1e293b",
                color: "#fbbf24",
                border: "1px solid #334155",
                borderRadius: "8px",
                padding: "8px 12px",
                fontSize: "12px",
                fontWeight: 700,
                cursor: "pointer"
              }}
            >
              🔊 Replay Speech
            </button>
          </div>
        </div>
      )}
    </>
  );
}
