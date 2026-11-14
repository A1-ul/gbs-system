import React, { useState, useEffect, useRef } from "react";
import WindowControlsBar from "./WindowControlsBar";
import {
  SUPPORTED_TRANSLATION_LANGUAGES,
  RECEIVER_ROLES,
  parseTranslationCommand,
  performFullTranslationAndMeaning,
  sendTranslatedMessageToReceiver,
  speakTranslationAloud
} from "../../utils/languageTranslatorEngine";

/**
 * UniversalLanguageTranslator (Root Floating Pill + Full Command-Driven Translator, Dictionary & Receiver Messenger)
 *
 * Features:
 * 1. Explicit User Choice:
 *    - "Do you want to translate a statement or word (with exact meaning)?"
 *    - "Or do you want to send a translated message to a receiver?"
 * 2. Smart Command Execution:
 *    - Understands typed or spoken commands like "Translate Welcome to our school to French",
 *      "What is the meaning of arrears in Ga?", or "Send Please pay school fees to Parent in Twi".
 *    - Supports Enter-to-translate, live debounced translation, clipboard paste, page text selection, and voice input.
 * 3. Server-Backed + Live Neural + Offline Lexicon Translation across all 15 languages.
 * 4. Accurate Dictionary Word Definitions & Statement Meaning Breakdown.
 * 5. Direct Translated Message Dispatch to any Receiver (Parent, Teacher, Student, Headmaster, Accountant, Staff, Developer).
 */
export default function UniversalLanguageTranslator() {
  const [isOpen, setIsOpen] = useState(false);
  const [activeMode, setActiveMode] = useState("TRANSLATE_WORD_OR_STATEMENT"); // "TRANSLATE_WORD_OR_STATEMENT" | "SEND_TRANSLATED_MESSAGE"
  const [selectedLang, setSelectedLang] = useState("TWI");
  const [inputText, setInputText] = useState(
    "Welcome to our school. Please pay your school fees on time."
  );
  const [isTranslating, setIsTranslating] = useState(false);
  const [translationResult, setTranslationResult] = useState(null);
  const [copiedFeedback, setCopiedFeedback] = useState(false);
  const [isListeningVoice, setIsListeningVoice] = useState(false);

  // Receiver Message State
  const [receiverRole, setReceiverRole] = useState("PARENT");
  const [receiverName, setReceiverName] = useState("");
  const [receiverContact, setReceiverContact] = useState("");
  const [sendingMsg, setSendingMsg] = useState(false);
  const [sentConfirmation, setSentConfirmation] = useState(null);
  const [sentHistory, setSentHistory] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("gbs_translated_messages_inbox") || "[]").slice(0, 10);
    } catch {
      return [];
    }
  });

  const lastSelectedPageTextRef = useRef("");

  // Track highlighted text on the page so clicking the translator pill automatically translates highlighted text
  useEffect(() => {
    const captureSelection = () => {
      const sel = window.getSelection()?.toString()?.trim();
      if (sel && sel.length > 1 && sel.length < 1200) {
        lastSelectedPageTextRef.current = sel;
        if (isOpen) {
          setInputText(sel);
        }
      }
    };
    document.addEventListener("mouseup", captureSelection);
    document.addEventListener("keyup", captureSelection);
    return () => {
      document.removeEventListener("mouseup", captureSelection);
      document.removeEventListener("keyup", captureSelection);
    };
  }, [isOpen]);

  // Register global window.openGBSTranslator and event listener so any button/command in the system opens this root translator
  useEffect(() => {
    const handleOpenCommand = (e) => {
      const detail = e?.detail || {};
      const customText =
        typeof detail === "string"
          ? detail
          : detail.text || detail.initialText || lastSelectedPageTextRef.current || "";
      const customLang = detail.lang || detail.targetLang || selectedLang;
      const customMode = detail.mode || activeMode;

      if (customLang) setSelectedLang(customLang);
      if (customMode) setActiveMode(customMode);
      if (customText && customText.trim()) {
        setInputText(customText.trim());
      }
      setIsOpen(true);
    };

    window.addEventListener("gbs_open_language_translator", handleOpenCommand);
    window.openGBSTranslator = (textArg, langArg, modeArg) => {
      handleOpenCommand({ detail: { text: textArg, lang: langArg, mode: modeArg } });
    };

    return () => {
      window.removeEventListener("gbs_open_language_translator", handleOpenCommand);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedLang, activeMode]);

  const handleTranslateNow = async (textOverride, langOverride, announceNotice = false) => {
    const rawToUse = (textOverride !== undefined ? textOverride : inputText).trim();
    if (!rawToUse) return;

    const parsed = parseTranslationCommand(rawToUse, langOverride || selectedLang, activeMode);
    const effectiveLang = parsed.targetLangCode || langOverride || selectedLang;

    if (parsed.wasCommandParsed) {
      if (parsed.targetLangCode && parsed.targetLangCode !== selectedLang) {
        setSelectedLang(parsed.targetLangCode);
      }
      if (parsed.mode && parsed.mode !== activeMode) {
        setActiveMode(parsed.mode);
      }
      if (parsed.receiverRole) {
        setReceiverRole(parsed.receiverRole);
      }
    }

    setIsTranslating(true);
    try {
      const result = await performFullTranslationAndMeaning(rawToUse, effectiveLang);
      setTranslationResult(result);
      if (announceNotice && typeof window !== "undefined" && typeof window.showGBSOpenNotice === "function") {
        window.showGBSOpenNotice(
          `${result.language.flag} ${result.language.name}: "${result.translatedText}"`,
          "success",
          "LANGUAGE TRANSLATOR OUTPUT"
        );
      }
    } catch {
      // Fallback handled inside engine
    } finally {
      setIsTranslating(false);
    }
  };

  // Automatically translate when modal opens or when user changes target language or types (debounced)
  useEffect(() => {
    if (!isOpen || !inputText.trim()) return;
    const timer = setTimeout(() => {
      handleTranslateNow(inputText, selectedLang, false);
    }, 320);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, selectedLang, inputText]);

  const handlePasteFromClipboard = async () => {
    try {
      const clip = await navigator.clipboard.readText();
      if (clip && clip.trim()) {
        setInputText(clip.trim());
        await handleTranslateNow(clip.trim(), selectedLang, true);
        return;
      }
    } catch {
      // Fallback to captured page selection if clipboard read permission was denied
    }
    if (lastSelectedPageTextRef.current) {
      setInputText(lastSelectedPageTextRef.current);
      await handleTranslateNow(lastSelectedPageTextRef.current, selectedLang, true);
    } else if (typeof window.showGBSOpenNotice === "function") {
      window.showGBSOpenNotice(
        "Press Ctrl+V (or long-press Paste) inside the text box to paste your copied sentence for instant translation.",
        "info",
        "CLIPBOARD PASTE READY"
      );
    }
  };

  const handleVoiceCommandInput = () => {
    const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRec) {
      if (typeof window.showGBSOpenNotice === "function") {
        window.showGBSOpenNotice(
          "Voice recognition is not supported in this browser. Please type or paste your command directly.",
          "warning",
          "VOICE INPUT NOTICE"
        );
      }
      return;
    }

    try {
      const recognition = new SpeechRec();
      recognition.lang = "en-US";
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;
      setIsListeningVoice(true);

      recognition.onresult = (event) => {
        const transcript = event?.results?.[0]?.[0]?.transcript || "";
        if (transcript.trim()) {
          setInputText(transcript.trim());
          handleTranslateNow(transcript.trim(), selectedLang, true);
        }
        setIsListeningVoice(false);
      };
      recognition.onerror = () => setIsListeningVoice(false);
      recognition.onend = () => setIsListeningVoice(false);
      recognition.start();
    } catch {
      setIsListeningVoice(false);
    }
  };

  const handleCopyTranslation = (textToCopy) => {
    if (!textToCopy) return;
    navigator.clipboard?.writeText(textToCopy);
    setCopiedFeedback(true);
    if (typeof window.showGBSOpenNotice === "function") {
      window.showGBSOpenNotice(
        `Copied translation to clipboard: "${textToCopy.slice(0, 90)}${textToCopy.length > 90 ? "..." : ""}"`,
        "success",
        "TRANSLATION COPIED"
      );
    }
    setTimeout(() => setCopiedFeedback(false), 2500);
  };

  const handleSendTranslatedMessage = async (e) => {
    if (e?.preventDefault) e.preventDefault();
    if (!inputText.trim()) return;

    setSendingMsg(true);
    setSentConfirmation(null);
    try {
      let currentUser = {};
      try {
        currentUser = JSON.parse(localStorage.getItem("gbs_user") || "{}");
      } catch { }

      const result = await performFullTranslationAndMeaning(inputText, selectedLang);
      setTranslationResult(result);

      const sent = await sendTranslatedMessageToReceiver({
        senderName: currentUser.fullName || currentUser.name || currentUser.email || "School Portal User",
        senderRole: currentUser.role || "USER",
        receiverRole: result.detectedReceiverRole || receiverRole,
        receiverName,
        receiverContact,
        originalMessage: result.originalText || inputText,
        translatedMessage: result.translatedText,
        targetLanguageCode: result.language.code
      });

      setSentConfirmation(sent);
      setSentHistory((prev) => [sent, ...prev.filter((m) => m.id !== sent.id)].slice(0, 10));
    } finally {
      setSendingMsg(false);
    }
  };

  const currentLangMeta =
    SUPPORTED_TRANSLATION_LANGUAGES.find((l) => l.code === selectedLang) ||
    SUPPORTED_TRANSLATION_LANGUAGES[0];

  return (
    <>
      {/* Floating Universal Translator Trigger Pill */}
      <div
        style={{
          position: "fixed",
          bottom: "16px",
          left: "16px",
          zIndex: 9998
        }}
      >
        <button
          type="button"
          data-no-hud-notice="true"
          onMouseDown={() => {
            const sel = window.getSelection()?.toString()?.trim();
            if (sel && sel.length > 1) {
              lastSelectedPageTextRef.current = sel;
            }
          }}
          onClick={() => {
            if (!isOpen && lastSelectedPageTextRef.current) {
              setInputText(lastSelectedPageTextRef.current);
            }
            setIsOpen((prev) => !prev);
          }}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            padding: "9px 16px",
            borderRadius: "999px",
            background: "linear-gradient(135deg, #4a151b 0%, #3e1f14 52%, #27272a 100%)",
            border: "1.5px solid #d4af37",
            color: "#fbbf24",
            fontWeight: "800",
            fontSize: "0.78rem",
            cursor: "pointer",
            boxShadow: "0 8px 24px rgba(0, 0, 0, 0.75), 0 0 18px rgba(212, 175, 55, 0.28)"
          }}
          title="Translate any word or copied statement into your exact chosen language, or send a translated message to a receiver"
        >
          <span style={{ fontSize: "1rem" }}>🌐</span>
          <span>Language Translator & Meaning</span>
        </button>
      </div>

      {/* Translator & Receiver Messaging Modal */}
      {isOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(15, 10, 12, 0.85)",
            backdropFilter: "blur(10px)",
            zIndex: 999990,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "16px"
          }}
        >
          <div
            id="universal-translator-modal-window"
            style={{
              width: "100%",
              maxWidth: "850px",
              maxHeight: "92vh",
              overflowY: "auto",
              background: "linear-gradient(145deg, #4a151b 0%, #3e1f14 48%, #27272a 100%)",
              border: "2px solid #d4af37",
              borderRadius: "20px",
              padding: "22px",
              color: "#f8fafc",
              boxShadow: "0 25px 60px rgba(0, 0, 0, 0.88), 0 0 32px rgba(212, 175, 55, 0.3)"
            }}
          >
            <WindowControlsBar
              isModal={true}
              modalTargetId="universal-translator-modal-window"
              onBack={() => setIsOpen(false)}
              customBackLabel="✕ Close Translator"
              title="Universal Language Translator, Dictionary Meaning & Receiver Messenger"
            />

            {/* Header */}
            <div style={{ marginBottom: "14px" }}>
              <h3 style={{ margin: "0 0 4px", color: "#fbbf24", fontSize: "1.25rem", fontWeight: 900 }}>
                🌐 Real Multi-Language Translator, Word Meaning & Receiver Messenger
              </h3>
              <p style={{ margin: 0, fontSize: "0.82rem", color: "#e2e8f0" }}>
                Specify below whether you want to <strong>translate a statement or word (with exact meaning)</strong> OR <strong>send a translated message to a receiver</strong>. You can also type commands like <em>&ldquo;Translate good morning to French&rdquo;</em>.
              </p>
            </div>

            {/* STEP 1: EXPLICIT QUESTION — TRANSLATE STATEMENT/WORD vs. SEND TRANSLATED MESSAGE TO A RECEIVER */}
            <div
              style={{
                background: "rgba(39, 39, 42, 0.85)",
                border: "1.5px solid rgba(212, 175, 55, 0.45)",
                borderRadius: "12px",
                padding: "12px 14px",
                marginBottom: "14px"
              }}
            >
              <div style={{ fontSize: "0.8rem", fontWeight: "800", color: "#fbbf24", marginBottom: "8px", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                1. Specify What You Want To Do:
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "10px" }}>
                <button
                  type="button"
                  data-no-hud-notice="true"
                  onClick={() => {
                    setActiveMode("TRANSLATE_WORD_OR_STATEMENT");
                    setSentConfirmation(null);
                  }}
                  style={{
                    padding: "12px 14px",
                    borderRadius: "10px",
                    textAlign: "left",
                    cursor: "pointer",
                    border:
                      activeMode === "TRANSLATE_WORD_OR_STATEMENT"
                        ? "2px solid #fbbf24"
                        : "1px solid rgba(212, 175, 55, 0.25)",
                    background:
                      activeMode === "TRANSLATE_WORD_OR_STATEMENT"
                        ? "linear-gradient(135deg, rgba(212, 175, 55, 0.28), rgba(110, 32, 41, 0.65))"
                        : "rgba(39, 39, 42, 0.65)",
                    color: "#f8fafc"
                  }}
                >
                  <div style={{ fontWeight: "800", fontSize: "0.9rem", color: activeMode === "TRANSLATE_WORD_OR_STATEMENT" ? "#fbbf24" : "#e2e8f0" }}>
                    📖 Translate a Statement or Word
                  </div>
                  <div style={{ fontSize: "0.75rem", color: "#cbd5e1", marginTop: "3px" }}>
                    Get the exact translation in your chosen language + accurate dictionary meaning of words & copied sentences.
                  </div>
                </button>

                <button
                  type="button"
                  data-no-hud-notice="true"
                  onClick={() => {
                    setActiveMode("SEND_TRANSLATED_MESSAGE");
                    setSentConfirmation(null);
                  }}
                  style={{
                    padding: "12px 14px",
                    borderRadius: "10px",
                    textAlign: "left",
                    cursor: "pointer",
                    border:
                      activeMode === "SEND_TRANSLATED_MESSAGE"
                        ? "2px solid #fbbf24"
                        : "1px solid rgba(212, 175, 55, 0.25)",
                    background:
                      activeMode === "SEND_TRANSLATED_MESSAGE"
                        ? "linear-gradient(135deg, rgba(212, 175, 55, 0.28), rgba(110, 32, 41, 0.65))"
                        : "rgba(39, 39, 42, 0.65)",
                    color: "#f8fafc"
                  }}
                >
                  <div style={{ fontWeight: "800", fontSize: "0.9rem", color: activeMode === "SEND_TRANSLATED_MESSAGE" ? "#fbbf24" : "#e2e8f0" }}>
                    📨 Send a Translated Message to a Receiver
                  </div>
                  <div style={{ fontSize: "0.75rem", color: "#cbd5e1", marginTop: "3px" }}>
                    Translate your message into the receiver&apos;s exact language and deliver it to a Parent, Teacher, Student, or Staff.
                  </div>
                </button>
              </div>
            </div>

            {/* STEP 2: TARGET LANGUAGE SELECTOR */}
            <div style={{ marginBottom: "14px" }}>
              <label style={{ display: "block", fontSize: "0.8rem", color: "#fbbf24", marginBottom: "6px", fontWeight: "800" }}>
                2. Select Exact Target Language ({currentLangMeta.flag} {currentLangMeta.name}):
              </label>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(155px, 1fr))", gap: "6px" }}>
                {SUPPORTED_TRANSLATION_LANGUAGES.map((lang) => (
                  <button
                    key={lang.code}
                    type="button"
                    data-no-hud-notice="true"
                    onClick={() => {
                      setSelectedLang(lang.code);
                      if (inputText.trim()) {
                        handleTranslateNow(inputText, lang.code, true);
                      }
                    }}
                    style={{
                      padding: "7px 10px",
                      borderRadius: "8px",
                      border: selectedLang === lang.code ? "2px solid #fbbf24" : "1px solid rgba(212, 175, 55, 0.25)",
                      background:
                        selectedLang === lang.code
                          ? "linear-gradient(135deg, #d4af37 0%, #b45309 48%, #6e2029 100%)"
                          : "rgba(39, 39, 42, 0.78)",
                      color: selectedLang === lang.code ? "#ffffff" : "#e2e8f0",
                      fontWeight: selectedLang === lang.code ? "800" : "600",
                      fontSize: "0.76rem",
                      cursor: "pointer",
                      textAlign: "left",
                      display: "flex",
                      alignItems: "center",
                      gap: "6px"
                    }}
                  >
                    <span>{lang.flag}</span>
                    <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{lang.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* IF MODE 2: RECEIVER SELECTION FIELDS */}
            {activeMode === "SEND_TRANSLATED_MESSAGE" && (
              <div
                style={{
                  background: "rgba(39, 39, 42, 0.85)",
                  border: "1px solid rgba(212, 175, 55, 0.45)",
                  borderRadius: "12px",
                  padding: "12px 14px",
                  marginBottom: "14px"
                }}
              >
                <div style={{ fontSize: "0.8rem", fontWeight: "800", color: "#fbbf24", marginBottom: "8px" }}>
                  📨 Receiver Details (Who will receive this translated message?):
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "10px" }}>
                  <div>
                    <label style={{ display: "block", fontSize: "0.74rem", color: "#cbd5e1", marginBottom: "4px" }}>
                      Receiver Role
                    </label>
                    <select
                      value={receiverRole}
                      onChange={(e) => setReceiverRole(e.target.value)}
                      style={{
                        width: "100%",
                        padding: "8px 10px",
                        borderRadius: "8px",
                        background: "#27272a",
                        border: "1px solid rgba(212, 175, 55, 0.4)",
                        color: "#f8fafc",
                        fontSize: "0.82rem"
                      }}
                    >
                      {RECEIVER_ROLES.map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.icon} {r.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: "0.74rem", color: "#cbd5e1", marginBottom: "4px" }}>
                      Receiver Name (e.g. Mr. Mensah / All Parents)
                    </label>
                    <input
                      type="text"
                      value={receiverName}
                      onChange={(e) => setReceiverName(e.target.value)}
                      placeholder="Enter receiver's name..."
                      style={{
                        width: "100%",
                        padding: "8px 10px",
                        borderRadius: "8px",
                        background: "#27272a",
                        border: "1px solid rgba(212, 175, 55, 0.4)",
                        color: "#f8fafc",
                        fontSize: "0.82rem"
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: "0.74rem", color: "#cbd5e1", marginBottom: "4px" }}>
                      Receiver Phone / Email (Optional for SMS)
                    </label>
                    <input
                      type="text"
                      value={receiverContact}
                      onChange={(e) => setReceiverContact(e.target.value)}
                      placeholder="e.g. +233 24 000 0000 or email"
                      style={{
                        width: "100%",
                        padding: "8px 10px",
                        borderRadius: "8px",
                        background: "#27272a",
                        border: "1px solid rgba(212, 175, 55, 0.4)",
                        color: "#f8fafc",
                        fontSize: "0.82rem"
                      }}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* STEP 3: INPUT WORD, STATEMENT, COMMAND OR COPIED SENTENCE */}
            <div style={{ marginBottom: "14px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px", flexWrap: "wrap", gap: "6px" }}>
                <label style={{ fontSize: "0.8rem", color: "#fbbf24", fontWeight: "800" }}>
                  {activeMode === "SEND_TRANSLATED_MESSAGE"
                    ? "3. Type, Speak, or Paste the Message to Translate & Send:"
                    : "3. Type, Speak, or Paste Any Word, Statement, Copied Sentence, or Command:"}
                </label>
                <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                  <button
                    type="button"
                    data-no-hud-notice="true"
                    onClick={handleVoiceCommandInput}
                    style={{
                      padding: "4px 10px",
                      borderRadius: "6px",
                      background: isListeningVoice ? "rgba(239, 68, 68, 0.3)" : "rgba(212, 175, 55, 0.2)",
                      border: `1px solid ${isListeningVoice ? "#ef4444" : "#d4af37"}`,
                      color: isListeningVoice ? "#fca5a5" : "#fbbf24",
                      fontSize: "0.74rem",
                      fontWeight: "800",
                      cursor: "pointer"
                    }}
                  >
                    {isListeningVoice ? "🎙️ Listening..." : "🎤 Voice Command"}
                  </button>
                  <button
                    type="button"
                    data-no-hud-notice="true"
                    onClick={handlePasteFromClipboard}
                    style={{
                      padding: "4px 10px",
                      borderRadius: "6px",
                      background: "rgba(212, 175, 55, 0.2)",
                      border: "1px solid rgba(212, 175, 55, 0.5)",
                      color: "#fbbf24",
                      fontSize: "0.74rem",
                      fontWeight: "800",
                      cursor: "pointer"
                    }}
                  >
                    📋 Paste Copied Sentence
                  </button>
                  {inputText && (
                    <button
                      type="button"
                      data-no-hud-notice="true"
                      onClick={() => {
                        setInputText("");
                        setTranslationResult(null);
                        setSentConfirmation(null);
                      }}
                      style={{
                        padding: "4px 10px",
                        borderRadius: "6px",
                        background: "rgba(239, 68, 68, 0.2)",
                        border: "1px solid rgba(239, 68, 68, 0.5)",
                        color: "#fca5a5",
                        fontSize: "0.74rem",
                        fontWeight: "800",
                        cursor: "pointer"
                      }}
                    >
                      ✕ Clear
                    </button>
                  )}
                </div>
              </div>

              <textarea
                rows={3}
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleTranslateNow(inputText, selectedLang, true);
                  }
                }}
                onPaste={(e) => {
                  const pasted = e.clipboardData?.getData("text");
                  if (pasted && pasted.trim()) {
                    setTimeout(() => handleTranslateNow(pasted.trim(), selectedLang, true), 80);
                  }
                }}
                placeholder={
                  activeMode === "SEND_TRANSLATED_MESSAGE"
                    ? "Type or paste the message for the receiver (e.g. 'Please pay your ward's school fees before Friday. Thank you.')..."
                    : "Type or paste any word (e.g. 'tuition', 'scholarship', 'arrears'), copied sentence, or command (e.g. 'Translate good morning to French')..."
                }
                style={{
                  width: "100%",
                  padding: "12px",
                  borderRadius: "10px",
                  background: "rgba(24, 24, 27, 0.92)",
                  border: "1.5px solid rgba(212, 175, 55, 0.5)",
                  color: "#f8fafc",
                  fontSize: "0.92rem",
                  resize: "vertical"
                }}
              />

              {/* Quick Sample Words, Sentences & Commands */}
              <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginTop: "8px", alignItems: "center" }}>
                <span style={{ fontSize: "0.72rem", color: "#fbbf24", fontWeight: 700 }}>Quick Commands:</span>
                {[
                  "Tuition",
                  "Scholarship",
                  "Arrears",
                  "Welcome to our school. Please pay your school fees on time.",
                  "Your child is present in school today and doing very well in examinations.",
                  "Translate good morning to French"
                ].map((sample, idx) => (
                  <button
                    key={idx}
                    type="button"
                    data-no-hud-notice="true"
                    onClick={() => {
                      setInputText(sample);
                      handleTranslateNow(sample, selectedLang, true);
                    }}
                    style={{
                      padding: "4px 9px",
                      borderRadius: "6px",
                      background: "rgba(212, 175, 55, 0.14)",
                      border: "1px solid rgba(212, 175, 55, 0.35)",
                      color: "#f8fafc",
                      fontSize: "0.72rem",
                      fontWeight: 600,
                      cursor: "pointer"
                    }}
                  >
                    {sample.length > 34 ? sample.slice(0, 34) + "…" : sample}
                  </button>
                ))}
              </div>
            </div>

            {/* ACTION BUTTONS */}
            <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", marginBottom: "14px" }}>
              <button
                type="button"
                data-no-hud-notice="true"
                disabled={isTranslating || !inputText.trim()}
                onClick={() => handleTranslateNow(inputText, selectedLang, true)}
                style={{
                  flex: 1,
                  minWidth: "200px",
                  padding: "12px 16px",
                  borderRadius: "10px",
                  background: "linear-gradient(135deg, #d4af37 0%, #b45309 50%, #6e2029 100%)",
                  border: "1.5px solid #fbbf24",
                  color: "#ffffff",
                  fontWeight: "800",
                  fontSize: "0.9rem",
                  cursor: isTranslating || !inputText.trim() ? "not-allowed" : "pointer",
                  boxShadow: "0 8px 20px rgba(212, 175, 55, 0.3)"
                }}
              >
                {isTranslating
                  ? `⏳ Translating into ${currentLangMeta.name}...`
                  : `🔄 Translate & Get Exact Meaning in ${currentLangMeta.flag} ${currentLangMeta.name}`}
              </button>

              {activeMode === "SEND_TRANSLATED_MESSAGE" && (
                <button
                  type="button"
                  data-no-hud-notice="true"
                  disabled={sendingMsg || !inputText.trim()}
                  onClick={handleSendTranslatedMessage}
                  style={{
                    flex: 1,
                    minWidth: "220px",
                    padding: "12px 16px",
                    borderRadius: "10px",
                    background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
                    border: "1.5px solid #34d399",
                    color: "#ffffff",
                    fontWeight: "800",
                    fontSize: "0.9rem",
                    cursor: sendingMsg || !inputText.trim() ? "not-allowed" : "pointer"
                  }}
                >
                  {sendingMsg
                    ? "📤 Sending Translated Message..."
                    : `📨 Translate & Send to ${RECEIVER_ROLES.find((r) => r.id === receiverRole)?.label || "Receiver"}`}
                </button>
              )}
            </div>

            {/* SENT MESSAGE CONFIRMATION BANNER */}
            {sentConfirmation && (
              <div
                style={{
                  background: "rgba(16, 185, 129, 0.18)",
                  border: "1.5px solid #10b981",
                  borderRadius: "12px",
                  padding: "12px 14px",
                  marginBottom: "14px",
                  fontSize: "0.84rem"
                }}
              >
                <div style={{ fontWeight: "800", color: "#34d399", marginBottom: "4px" }}>
                  ✓ Translated Message Delivered to {sentConfirmation.receiverName} ({sentConfirmation.receiverRoleLabel})!
                </div>
                <div style={{ color: "#f8fafc" }}>
                  <strong>Language ({sentConfirmation.languageName}):</strong> &ldquo;{sentConfirmation.translatedMessage}&rdquo;
                </div>
                <div style={{ color: "#cbd5e1", fontSize: "0.76rem", marginTop: "2px" }}>
                  Original: &ldquo;{sentConfirmation.originalMessage}&rdquo; • Channel: {sentConfirmation.receiverContact}
                </div>
              </div>
            )}

            {/* TRANSLATION & EXACT MEANING OUTPUT */}
            {translationResult && (
              <div
                style={{
                  background: "rgba(24, 24, 27, 0.92)",
                  border: "1.5px solid rgba(212, 175, 55, 0.6)",
                  borderRadius: "14px",
                  padding: "16px",
                  marginBottom: "14px"
                }}
              >
                {/* Exact Language Translation Box */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "8px", marginBottom: "8px" }}>
                  <span style={{ fontSize: "0.8rem", color: "#fbbf24", fontWeight: "800", textTransform: "uppercase" }}>
                    ✓ Exact Translation in {translationResult.language.flag} {translationResult.language.name}
                    {translationResult.wasCommandParsed ? ` (Command Recognized: "${translationResult.originalText}")` : ""}
                  </span>
                  <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                    <button
                      type="button"
                      data-no-hud-notice="true"
                      onClick={() => speakTranslationAloud(translationResult.translatedText, translationResult.language.code)}
                      style={{
                        padding: "5px 12px",
                        borderRadius: "8px",
                        background: "rgba(212, 175, 55, 0.22)",
                        border: "1px solid #d4af37",
                        color: "#fbbf24",
                        fontSize: "0.75rem",
                        fontWeight: "800",
                        cursor: "pointer"
                      }}
                    >
                      🔊 Read Aloud
                    </button>
                    <button
                      type="button"
                      data-no-hud-notice="true"
                      onClick={() => handleCopyTranslation(translationResult.translatedText)}
                      style={{
                        padding: "5px 12px",
                        borderRadius: "8px",
                        background: copiedFeedback ? "rgba(16, 185, 129, 0.28)" : "rgba(255,255,255,0.1)",
                        border: "1px solid rgba(212, 175, 55, 0.4)",
                        color: copiedFeedback ? "#34d399" : "#f8fafc",
                        fontSize: "0.75rem",
                        fontWeight: "800",
                        cursor: "pointer"
                      }}
                    >
                      {copiedFeedback ? "✓ Copied!" : "📋 Copy Translation"}
                    </button>
                    {activeMode !== "SEND_TRANSLATED_MESSAGE" && (
                      <button
                        type="button"
                        data-no-hud-notice="true"
                        onClick={() => setActiveMode("SEND_TRANSLATED_MESSAGE")}
                        style={{
                          padding: "5px 12px",
                          borderRadius: "8px",
                          background: "rgba(16, 185, 129, 0.2)",
                          border: "1px solid #10b981",
                          color: "#34d399",
                          fontSize: "0.75rem",
                          fontWeight: "800",
                          cursor: "pointer"
                        }}
                      >
                        📨 Send to a Receiver
                      </button>
                    )}
                  </div>
                </div>

                <div
                  style={{
                    padding: "14px 16px",
                    borderRadius: "10px",
                    background: "linear-gradient(135deg, rgba(74, 21, 27, 0.75), rgba(62, 31, 20, 0.75))",
                    border: "1.5px solid rgba(212, 175, 55, 0.5)",
                    fontSize: "1.08rem",
                    fontWeight: "800",
                    color: "#ffffff",
                    lineHeight: "1.55",
                    marginBottom: "14px"
                  }}
                >
                  {translationResult.translatedText}
                </div>

                {/* Dictionary Word Meaning / Statement Explanation Box */}
                <div
                  style={{
                    padding: "12px 14px",
                    borderRadius: "10px",
                    background: "rgba(39, 39, 42, 0.9)",
                    border: "1px solid rgba(212, 175, 55, 0.38)"
                  }}
                >
                  <div style={{ fontSize: "0.78rem", fontWeight: "800", color: "#fbbf24", marginBottom: "6px", textTransform: "uppercase" }}>
                    📖 Exact Meaning & Definition ({translationResult.meaning.partOfSpeech || "Meaning"}):
                  </div>
                  <div style={{ fontSize: "0.88rem", color: "#f8fafc", lineHeight: "1.5", marginBottom: "6px" }}>
                    {translationResult.meaning.definition}
                  </div>

                  {translationResult.meaning.secondaryDefinition && (
                    <div style={{ fontSize: "0.84rem", color: "#cbd5e1", lineHeight: "1.45", marginBottom: "6px" }}>
                      <strong>Additional Meaning:</strong> {translationResult.meaning.secondaryDefinition}
                    </div>
                  )}

                  {translationResult.language.code !== "ENGLISH" &&
                    translationResult.meaning.translatedDefinition &&
                    translationResult.meaning.translatedDefinition !== translationResult.meaning.definition && (
                      <div style={{ fontSize: "0.84rem", color: "#fde68a", lineHeight: "1.45", marginTop: "6px", paddingTop: "6px", borderTop: "1px dashed rgba(212, 175, 55, 0.3)" }}>
                        <strong>Meaning in {translationResult.language.name}:</strong> {translationResult.meaning.translatedDefinition}
                      </div>
                    )}

                  {translationResult.meaning.example && (
                    <div style={{ fontSize: "0.8rem", color: "#cbd5e1", marginTop: "6px", fontStyle: "italic" }}>
                      Example: &ldquo;{translationResult.meaning.example}&rdquo;
                    </div>
                  )}

                  {Array.isArray(translationResult.meaning.keyTermsBreakdown) &&
                    translationResult.meaning.keyTermsBreakdown.length > 0 && (
                      <div style={{ marginTop: "10px", paddingTop: "8px", borderTop: "1px solid rgba(212, 175, 55, 0.25)" }}>
                        <div style={{ fontSize: "0.75rem", fontWeight: "800", color: "#fbbf24", marginBottom: "6px" }}>
                          Key Words Defined in Your Statement:
                        </div>
                        <div style={{ display: "grid", gap: "6px" }}>
                          {translationResult.meaning.keyTermsBreakdown.map((item, idx) => (
                            <div key={idx} style={{ fontSize: "0.8rem", color: "#e2e8f0" }}>
                              • <strong style={{ color: "#fbbf24" }}>{item.term}</strong> <em>({item.partOfSpeech})</em>: {item.meaning}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                </div>
              </div>
            )}

            {/* RECENTLY SENT TRANSLATED MESSAGES LOG */}
            {activeMode === "SEND_TRANSLATED_MESSAGE" && sentHistory.length > 0 && (
              <div
                style={{
                  background: "rgba(24, 24, 27, 0.85)",
                  border: "1px solid rgba(212, 175, 55, 0.3)",
                  borderRadius: "10px",
                  padding: "10px 12px"
                }}
              >
                <div style={{ fontSize: "0.75rem", fontWeight: "800", color: "#fbbf24", marginBottom: "6px" }}>
                  Recent Translated Messages Sent to Receivers:
                </div>
                <div style={{ display: "grid", gap: "6px", maxHeight: "130px", overflowY: "auto" }}>
                  {sentHistory.slice(0, 4).map((msg) => (
                    <div key={msg.id} style={{ fontSize: "0.76rem", color: "#e2e8f0", padding: "6px 8px", background: "rgba(62, 31, 20, 0.65)", borderRadius: "6px" }}>
                      <strong style={{ color: "#fbbf24" }}>To {msg.receiverName} ({msg.receiverRoleLabel})</strong> in {msg.languageFlag} {msg.languageName}: &ldquo;{msg.translatedMessage}&rdquo;
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
