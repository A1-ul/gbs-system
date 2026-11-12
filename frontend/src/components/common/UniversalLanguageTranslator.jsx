import React, { useState, useEffect } from "react";
import WindowControlsBar from "./WindowControlsBar";
import {
  SUPPORTED_TRANSLATION_LANGUAGES,
  RECEIVER_ROLES,
  performFullTranslationAndMeaning,
  sendTranslatedMessageToReceiver
} from "../../utils/languageTranslatorEngine";

/**
 * UniversalLanguageTranslator (Floating Bottom-Left Pill + Full Translator & Receiver Messaging Modal)
 *
 * Features:
 * 1. Explicit User Choice:
 *    - "Do you want to translate a statement or word (with exact meaning)?"
 *    - "Or do you want to send a translated message to a receiver?"
 * 2. Real Live + Offline Translation into the exact chosen language when sentences or words are typed or copied/pasted.
 * 3. Real Dictionary Word Definitions & Statement Meaning Breakdown.
 * 4. Direct Translated Message Dispatch to any Receiver (Parent, Teacher, Student, Headmaster, Accountant, Staff).
 */
export default function UniversalLanguageTranslator() {
  const [isOpen, setIsOpen] = useState(false);
  const [activeMode, setActiveMode] = useState("TRANSLATE_WORD_OR_STATEMENT"); // "TRANSLATE_WORD_OR_STATEMENT" | "SEND_TRANSLATED_MESSAGE"
  const [selectedLang, setSelectedLang] = useState("TWI");
  const [inputText, setInputText] = useState("");
  const [isTranslating, setIsTranslating] = useState(false);
  const [translationResult, setTranslationResult] = useState(null);
  const [copiedFeedback, setCopiedFeedback] = useState(false);

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

  // Listen for highlighted/copied text on the page when modal is open
  useEffect(() => {
    const handleSelection = () => {
      if (!isOpen) return;
      const selection = window.getSelection()?.toString()?.trim();
      if (selection && selection.length > 1 && selection.length < 1000) {
        setInputText(selection);
      }
    };
    document.addEventListener("mouseup", handleSelection);
    return () => document.removeEventListener("mouseup", handleSelection);
  }, [isOpen]);

  // Automatically re-translate whenever the user changes the target language and there is already text
  useEffect(() => {
    if (isOpen && inputText.trim()) {
      const timer = setTimeout(() => {
        handleTranslateNow(inputText, selectedLang);
      }, 250);
      return () => clearTimeout(timer);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedLang]);

  const handleTranslateNow = async (textOverride, langOverride) => {
    const textToUse = (textOverride !== undefined ? textOverride : inputText).trim();
    const langToUse = langOverride || selectedLang;
    if (!textToUse) return;

    setIsTranslating(true);
    try {
      const result = await performFullTranslationAndMeaning(textToUse, langToUse);
      setTranslationResult(result);
    } catch {
      // Fallback handled inside engine
    } finally {
      setIsTranslating(false);
    }
  };

  const handlePasteFromClipboard = async () => {
    try {
      const clip = await navigator.clipboard.readText();
      if (clip && clip.trim()) {
        setInputText(clip.trim());
        handleTranslateNow(clip.trim(), selectedLang);
      }
    } catch {
      // Browser clipboard permission fallback
    }
  };

  const handleSpeak = (textToSpeak) => {
    if (!("speechSynthesis" in window) || !textToSpeak) return;
    window.speechSynthesis.cancel();
    const langMeta = SUPPORTED_TRANSLATION_LANGUAGES.find((l) => l.code === selectedLang);
    const utterance = new SpeechSynthesisUtterance(textToSpeak);
    utterance.lang = langMeta?.speechLang || "en-GB";
    utterance.rate = 0.95;
    window.speechSynthesis.speak(utterance);
  };

  const handleCopyTranslation = (textToCopy) => {
    if (!textToCopy) return;
    navigator.clipboard?.writeText(textToCopy);
    setCopiedFeedback(true);
    setTimeout(() => setCopiedFeedback(false), 2500);
  };

  const handleSendTranslatedMessage = async (e) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    setSendingMsg(true);
    setSentConfirmation(null);
    try {
      let currentUser = {};
      try {
        currentUser = JSON.parse(localStorage.getItem("gbs_user") || "{}");
      } catch { }

      // Ensure we have latest translation for the chosen language
      const result = await performFullTranslationAndMeaning(inputText, selectedLang);
      setTranslationResult(result);

      const sent = await sendTranslatedMessageToReceiver({
        senderName: currentUser.fullName || currentUser.name || currentUser.email || "School Portal User",
        senderRole: currentUser.role || "USER",
        receiverRole,
        receiverName,
        receiverContact,
        originalMessage: inputText,
        translatedMessage: result.translatedText,
        targetLanguageCode: selectedLang
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
          onClick={() => setIsOpen((prev) => !prev)}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "6px",
            padding: "8px 14px",
            borderRadius: "999px",
            background: "linear-gradient(135deg, #0f172a 0%, #1e3a8a 100%)",
            border: "1.5px solid #38bdf8",
            color: "#f8fafc",
            fontWeight: "700",
            fontSize: "0.76rem",
            cursor: "pointer",
            boxShadow: "0 6px 18px rgba(15, 23, 42, 0.7)"
          }}
          title="Translate any word or copied statement into your exact chosen language, or send a translated message to a receiver"
        >
          <span style={{ fontSize: "0.95rem" }}>🌐</span>
          <span>Language Translator & Meaning</span>
        </button>
      </div>

      {/* Translator & Receiver Messaging Modal */}
      {isOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(2, 6, 23, 0.82)",
            backdropFilter: "blur(8px)",
            zIndex: 10000,
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
              maxWidth: "820px",
              maxHeight: "92vh",
              overflowY: "auto",
              background: "linear-gradient(160deg, #0f172a 0%, #1e293b 100%)",
              border: "2px solid #38bdf8",
              borderRadius: "18px",
              padding: "20px",
              color: "#f8fafc",
              boxShadow: "0 25px 60px rgba(0, 0, 0, 0.85)"
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
              <h3 style={{ margin: "0 0 4px", color: "#38bdf8", fontSize: "1.2rem" }}>
                🌐 Real Multi-Language Translator, Word Meaning & Receiver Messenger
              </h3>
              <p style={{ margin: 0, fontSize: "0.82rem", color: "#cbd5e1" }}>
                Specify below whether you want to <strong>translate a statement or word (with exact meaning)</strong> OR <strong>send a translated message to a receiver</strong>.
              </p>
            </div>

            {/* STEP 1: EXPLICIT QUESTION — TRANSLATE STATEMENT/WORD vs. SEND TRANSLATED MESSAGE TO A RECEIVER */}
            <div
              style={{
                background: "rgba(15, 23, 42, 0.9)",
                border: "1.5px solid rgba(56, 189, 248, 0.4)",
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
                        ? "2px solid #10b981"
                        : "1px solid rgba(255,255,255,0.15)",
                    background:
                      activeMode === "TRANSLATE_WORD_OR_STATEMENT"
                        ? "linear-gradient(135deg, rgba(16, 185, 129, 0.25), rgba(5, 150, 105, 0.15))"
                        : "rgba(30, 41, 59, 0.6)",
                    color: "#f8fafc"
                  }}
                >
                  <div style={{ fontWeight: "800", fontSize: "0.9rem", color: activeMode === "TRANSLATE_WORD_OR_STATEMENT" ? "#34d399" : "#e2e8f0" }}>
                    📖 Translate a Statement or Word
                  </div>
                  <div style={{ fontSize: "0.75rem", color: "#94a3b8", marginTop: "3px" }}>
                    Get the exact translation in your chosen language + accurate dictionary meaning of words & copied sentences.
                  </div>
                </button>

                <button
                  type="button"
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
                        ? "2px solid #38bdf8"
                        : "1px solid rgba(255,255,255,0.15)",
                    background:
                      activeMode === "SEND_TRANSLATED_MESSAGE"
                        ? "linear-gradient(135deg, rgba(56, 189, 248, 0.25), rgba(37, 99, 235, 0.2))"
                        : "rgba(30, 41, 59, 0.6)",
                    color: "#f8fafc"
                  }}
                >
                  <div style={{ fontWeight: "800", fontSize: "0.9rem", color: activeMode === "SEND_TRANSLATED_MESSAGE" ? "#38bdf8" : "#e2e8f0" }}>
                    📨 Send a Translated Message to a Receiver
                  </div>
                  <div style={{ fontSize: "0.75rem", color: "#94a3b8", marginTop: "3px" }}>
                    Translate your message into the receiver&apos;s exact language and deliver it to a Parent, Teacher, Student, or Staff.
                  </div>
                </button>
              </div>
            </div>

            {/* STEP 2: TARGET LANGUAGE SELECTOR */}
            <div style={{ marginBottom: "14px" }}>
              <label style={{ display: "block", fontSize: "0.8rem", color: "#94a3b8", marginBottom: "6px", fontWeight: "700" }}>
                2. Select Exact Target Language ({currentLangMeta.flag} {currentLangMeta.name}):
              </label>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(155px, 1fr))", gap: "6px" }}>
                {SUPPORTED_TRANSLATION_LANGUAGES.map((lang) => (
                  <button
                    key={lang.code}
                    type="button"
                    onClick={() => setSelectedLang(lang.code)}
                    style={{
                      padding: "7px 10px",
                      borderRadius: "8px",
                      border: selectedLang === lang.code ? "2px solid #38bdf8" : "1px solid rgba(255,255,255,0.12)",
                      background: selectedLang === lang.code ? "rgba(56, 189, 248, 0.22)" : "rgba(15, 23, 42, 0.65)",
                      color: selectedLang === lang.code ? "#38bdf8" : "#cbd5e1",
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
                  background: "rgba(30, 41, 59, 0.75)",
                  border: "1px solid rgba(56, 189, 248, 0.35)",
                  borderRadius: "12px",
                  padding: "12px 14px",
                  marginBottom: "14px"
                }}
              >
                <div style={{ fontSize: "0.8rem", fontWeight: "800", color: "#38bdf8", marginBottom: "8px" }}>
                  📨 Receiver Details (Who will receive this translated message?):
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "10px" }}>
                  <div>
                    <label style={{ display: "block", fontSize: "0.74rem", color: "#94a3b8", marginBottom: "4px" }}>
                      Receiver Role
                    </label>
                    <select
                      value={receiverRole}
                      onChange={(e) => setReceiverRole(e.target.value)}
                      style={{
                        width: "100%",
                        padding: "8px 10px",
                        borderRadius: "8px",
                        background: "#0f172a",
                        border: "1px solid rgba(255,255,255,0.2)",
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
                    <label style={{ display: "block", fontSize: "0.74rem", color: "#94a3b8", marginBottom: "4px" }}>
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
                        background: "#0f172a",
                        border: "1px solid rgba(255,255,255,0.2)",
                        color: "#f8fafc",
                        fontSize: "0.82rem"
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: "0.74rem", color: "#94a3b8", marginBottom: "4px" }}>
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
                        background: "#0f172a",
                        border: "1px solid rgba(255,255,255,0.2)",
                        color: "#f8fafc",
                        fontSize: "0.82rem"
                      }}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* STEP 3: INPUT WORD, STATEMENT OR COPIED SENTENCE */}
            <div style={{ marginBottom: "14px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px", flexWrap: "wrap", gap: "6px" }}>
                <label style={{ fontSize: "0.8rem", color: "#94a3b8", fontWeight: "700" }}>
                  {activeMode === "SEND_TRANSLATED_MESSAGE"
                    ? "3. Type or Paste the Message to Translate & Send:"
                    : "3. Type or Paste Any Word, Statement, or Copied Sentence:"}
                </label>
                <div style={{ display: "flex", gap: "6px" }}>
                  <button
                    type="button"
                    onClick={handlePasteFromClipboard}
                    style={{
                      padding: "4px 10px",
                      borderRadius: "6px",
                      background: "rgba(56, 189, 248, 0.15)",
                      border: "1px solid rgba(56, 189, 248, 0.4)",
                      color: "#38bdf8",
                      fontSize: "0.74rem",
                      fontWeight: "700",
                      cursor: "pointer"
                    }}
                  >
                    📋 Paste Copied Sentence
                  </button>
                  {inputText && (
                    <button
                      type="button"
                      onClick={() => {
                        setInputText("");
                        setTranslationResult(null);
                        setSentConfirmation(null);
                      }}
                      style={{
                        padding: "4px 10px",
                        borderRadius: "6px",
                        background: "rgba(239, 68, 68, 0.15)",
                        border: "1px solid rgba(239, 68, 68, 0.4)",
                        color: "#fca5a5",
                        fontSize: "0.74rem",
                        fontWeight: "700",
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
                onPaste={(e) => {
                  const pasted = e.clipboardData?.getData("text");
                  if (pasted && pasted.trim()) {
                    setTimeout(() => handleTranslateNow(pasted.trim(), selectedLang), 100);
                  }
                }}
                placeholder={
                  activeMode === "SEND_TRANSLATED_MESSAGE"
                    ? "Type or paste the message for the receiver (e.g. 'Please pay your ward's school fees before Friday. Thank you.')..."
                    : "Type or paste any word (e.g. 'tuition', 'scholarship', 'attendance') or full sentence to translate into the exact chosen language..."
                }
                style={{
                  width: "100%",
                  padding: "12px",
                  borderRadius: "10px",
                  background: "rgba(15, 23, 42, 0.9)",
                  border: "1.5px solid rgba(56, 189, 248, 0.4)",
                  color: "#f8fafc",
                  fontSize: "0.9rem",
                  resize: "vertical"
                }}
              />

              {/* Quick Sample Words & Statements */}
              <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginTop: "8px", alignItems: "center" }}>
                <span style={{ fontSize: "0.72rem", color: "#64748b" }}>Quick Test:</span>
                {[
                  "Tuition",
                  "Scholarship",
                  "Welcome to our school. Please pay your school fees on time.",
                  "Your child is present in school today and doing very well in examinations."
                ].map((sample, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setInputText(sample);
                      handleTranslateNow(sample, selectedLang);
                    }}
                    style={{
                      padding: "3px 8px",
                      borderRadius: "6px",
                      background: "rgba(255,255,255,0.06)",
                      border: "1px solid rgba(255,255,255,0.12)",
                      color: "#cbd5e1",
                      fontSize: "0.72rem",
                      cursor: "pointer"
                    }}
                  >
                    {sample.length > 32 ? sample.slice(0, 32) + "…" : sample}
                  </button>
                ))}
              </div>
            </div>

            {/* ACTION BUTTONS */}
            <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", marginBottom: "14px" }}>
              <button
                type="button"
                disabled={isTranslating || !inputText.trim()}
                onClick={() => handleTranslateNow(inputText, selectedLang)}
                style={{
                  flex: 1,
                  minWidth: "200px",
                  padding: "11px 16px",
                  borderRadius: "10px",
                  background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
                  border: "none",
                  color: "#ffffff",
                  fontWeight: "800",
                  fontSize: "0.88rem",
                  cursor: isTranslating || !inputText.trim() ? "not-allowed" : "pointer"
                }}
              >
                {isTranslating
                  ? `⏳ Translating into ${currentLangMeta.name}...`
                  : `🔄 Translate & Get Exact Meaning in ${currentLangMeta.flag} ${currentLangMeta.name}`}
              </button>

              {activeMode === "SEND_TRANSLATED_MESSAGE" && (
                <button
                  type="button"
                  disabled={sendingMsg || !inputText.trim()}
                  onClick={handleSendTranslatedMessage}
                  style={{
                    flex: 1,
                    minWidth: "220px",
                    padding: "11px 16px",
                    borderRadius: "10px",
                    background: "linear-gradient(135deg, #38bdf8 0%, #2563eb 100%)",
                    border: "none",
                    color: "#ffffff",
                    fontWeight: "800",
                    fontSize: "0.88rem",
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
                  background: "rgba(16, 185, 129, 0.16)",
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
                <div style={{ color: "#e2e8f0" }}>
                  <strong>Language ({sentConfirmation.languageName}):</strong> &ldquo;{sentConfirmation.translatedMessage}&rdquo;
                </div>
                <div style={{ color: "#94a3b8", fontSize: "0.76rem", marginTop: "2px" }}>
                  Original: &ldquo;{sentConfirmation.originalMessage}&rdquo; • Channel: {sentConfirmation.receiverContact}
                </div>
              </div>
            )}

            {/* TRANSLATION & EXACT MEANING OUTPUT */}
            {translationResult && (
              <div
                style={{
                  background: "rgba(15, 23, 42, 0.92)",
                  border: "1.5px solid rgba(16, 185, 129, 0.5)",
                  borderRadius: "14px",
                  padding: "16px",
                  marginBottom: "14px"
                }}
              >
                {/* Exact Language Translation Box */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "8px", marginBottom: "8px" }}>
                  <span style={{ fontSize: "0.78rem", color: "#34d399", fontWeight: "800", textTransform: "uppercase" }}>
                    ✓ Exact Translation in {translationResult.language.flag} {translationResult.language.name}
                  </span>
                  <div style={{ display: "flex", gap: "8px" }}>
                    <button
                      type="button"
                      onClick={() => handleSpeak(translationResult.translatedText)}
                      style={{
                        padding: "5px 12px",
                        borderRadius: "8px",
                        background: "rgba(56, 189, 248, 0.2)",
                        border: "1px solid #38bdf8",
                        color: "#38bdf8",
                        fontSize: "0.75rem",
                        fontWeight: "700",
                        cursor: "pointer"
                      }}
                    >
                      🔊 Read Aloud
                    </button>
                    <button
                      type="button"
                      onClick={() => handleCopyTranslation(translationResult.translatedText)}
                      style={{
                        padding: "5px 12px",
                        borderRadius: "8px",
                        background: copiedFeedback ? "rgba(16, 185, 129, 0.25)" : "rgba(255,255,255,0.1)",
                        border: "1px solid rgba(255,255,255,0.2)",
                        color: copiedFeedback ? "#34d399" : "#f8fafc",
                        fontSize: "0.75rem",
                        fontWeight: "700",
                        cursor: "pointer"
                      }}
                    >
                      {copiedFeedback ? "✓ Copied!" : "📋 Copy Translation"}
                    </button>
                  </div>
                </div>

                <div
                  style={{
                    padding: "12px 14px",
                    borderRadius: "10px",
                    background: "rgba(16, 185, 129, 0.12)",
                    border: "1px solid rgba(16, 185, 129, 0.35)",
                    fontSize: "1.05rem",
                    fontWeight: "700",
                    color: "#f8fafc",
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
                    background: "rgba(30, 41, 59, 0.85)",
                    border: "1px solid rgba(56, 189, 248, 0.3)"
                  }}
                >
                  <div style={{ fontSize: "0.78rem", fontWeight: "800", color: "#38bdf8", marginBottom: "6px", textTransform: "uppercase" }}>
                    📖 Exact Meaning & Definition ({translationResult.meaning.partOfSpeech || "Meaning"}):
                  </div>
                  <div style={{ fontSize: "0.88rem", color: "#e2e8f0", lineHeight: "1.5", marginBottom: "6px" }}>
                    {translationResult.meaning.definition}
                  </div>

                  {translationResult.language.code !== "ENGLISH" &&
                    translationResult.meaning.translatedDefinition &&
                    translationResult.meaning.translatedDefinition !== translationResult.meaning.definition && (
                      <div style={{ fontSize: "0.84rem", color: "#a7f3d0", lineHeight: "1.45", marginTop: "6px", paddingTop: "6px", borderTop: "1px dashed rgba(255,255,255,0.12)" }}>
                        <strong>Meaning in {translationResult.language.name}:</strong> {translationResult.meaning.translatedDefinition}
                      </div>
                    )}

                  {translationResult.meaning.example && (
                    <div style={{ fontSize: "0.8rem", color: "#94a3b8", marginTop: "6px", fontStyle: "italic" }}>
                      Example: &ldquo;{translationResult.meaning.example}&rdquo;
                    </div>
                  )}

                  {Array.isArray(translationResult.meaning.keyTermsBreakdown) &&
                    translationResult.meaning.keyTermsBreakdown.length > 0 && (
                      <div style={{ marginTop: "10px", paddingTop: "8px", borderTop: "1px solid rgba(255,255,255,0.1)" }}>
                        <div style={{ fontSize: "0.75rem", fontWeight: "800", color: "#fbbf24", marginBottom: "6px" }}>
                          Key Words Defined in Your Statement:
                        </div>
                        <div style={{ display: "grid", gap: "6px" }}>
                          {translationResult.meaning.keyTermsBreakdown.map((item, idx) => (
                            <div key={idx} style={{ fontSize: "0.8rem", color: "#cbd5e1" }}>
                              • <strong style={{ color: "#38bdf8" }}>{item.term}</strong> <em>({item.partOfSpeech})</em>: {item.meaning}
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
                  background: "rgba(15, 23, 42, 0.75)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: "10px",
                  padding: "10px 12px"
                }}
              >
                <div style={{ fontSize: "0.75rem", fontWeight: "800", color: "#94a3b8", marginBottom: "6px" }}>
                  Recent Translated Messages Sent to Receivers:
                </div>
                <div style={{ display: "grid", gap: "6px", maxHeight: "130px", overflowY: "auto" }}>
                  {sentHistory.slice(0, 4).map((msg) => (
                    <div key={msg.id} style={{ fontSize: "0.76rem", color: "#cbd5e1", padding: "6px 8px", background: "rgba(30,41,59,0.7)", borderRadius: "6px" }}>
                      <strong style={{ color: "#38bdf8" }}>To {msg.receiverName} ({msg.receiverRoleLabel})</strong> in {msg.languageFlag} {msg.languageName}: &ldquo;{msg.translatedMessage}&rdquo;
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
