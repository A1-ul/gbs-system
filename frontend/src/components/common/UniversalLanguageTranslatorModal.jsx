import React, { useState, useEffect } from "react";
import {
  SUPPORTED_TRANSLATION_LANGUAGES,
  RECEIVER_ROLES,
  performFullTranslationAndMeaning,
  sendTranslatedMessageToReceiver
} from "../../utils/languageTranslatorEngine";

/**
 * UniversalLanguageTranslatorModal
 *
 * Triggered from TopCenterSystemBanner ("🌐 Universal Language & Message Explainer")
 * and anywhere `window.openGBSTranslator()` is called.
 *
 * Capabilities:
 * 1. Explicitly asks the user to choose:
 *    - "📖 Translate a Statement or Word (Get Exact Meaning & Translation)"
 *    - "📨 Send a Translated Message to a Receiver"
 * 2. Real Live + Offline Translation into the exact language chosen when words or sentences are copied/pasted or typed.
 * 3. Accurate Dictionary Definitions & Statement Meaning Breakdown.
 * 4. Direct Translated Message Delivery to any Receiver (Parent, Teacher, Student, Headmaster, Accountant, Staff).
 */
export default function UniversalLanguageTranslatorModal({ isOpen, onClose, initialText = "" }) {
  const [activeMode, setActiveMode] = useState("TRANSLATE_WORD_OR_STATEMENT"); // "TRANSLATE_WORD_OR_STATEMENT" | "SEND_TRANSLATED_MESSAGE"
  const [selectedLang, setSelectedLang] = useState("TWI");
  const [inputText, setInputText] = useState(
    initialText || "Welcome to our school. Please ensure all tuition fees and student attendance records are verified."
  );
  const [isTranslating, setIsTranslating] = useState(false);
  const [translationResult, setTranslationResult] = useState(null);
  const [copiedFeedback, setCopiedFeedback] = useState(false);

  // Receiver Messaging State
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

  useEffect(() => {
    if (initialText && initialText.trim()) {
      setInputText(initialText.trim());
    }
  }, [initialText]);

  useEffect(() => {
    if (isOpen && inputText.trim()) {
      const timer = setTimeout(() => {
        handleTranslateNow(inputText, selectedLang);
      }, 200);
      return () => clearTimeout(timer);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, selectedLang]);

  if (!isOpen) return null;

  const handleTranslateNow = async (textOverride, langOverride) => {
    const textToUse = (textOverride !== undefined ? textOverride : inputText).trim();
    const langToUse = langOverride || selectedLang;
    if (!textToUse) return;

    setIsTranslating(true);
    try {
      const result = await performFullTranslationAndMeaning(textToUse, langToUse);
      setTranslationResult(result);
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
      // Clipboard fallback
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

  const handleSendTranslatedMessage = async () => {
    if (!inputText.trim()) return;
    setSendingMsg(true);
    setSentConfirmation(null);
    try {
      let currentUser = {};
      try {
        currentUser = JSON.parse(localStorage.getItem("gbs_user") || "{}");
      } catch {}

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
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 999999,
        background: "rgba(2, 6, 23, 0.85)",
        backdropFilter: "blur(8px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "20px"
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "850px",
          maxHeight: "92vh",
          overflowY: "auto",
          background: "linear-gradient(145deg, #0f172a, #1e293b)",
          border: "2px solid rgba(56, 189, 248, 0.6)",
          borderRadius: "20px",
          padding: "24px",
          color: "#f8fafc",
          boxShadow: "0 20px 60px rgba(0, 0, 0, 0.85)"
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            borderBottom: "1px solid rgba(255, 255, 255, 0.12)",
            paddingBottom: "14px",
            marginBottom: "16px"
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <span style={{ fontSize: "2rem" }}>🌐</span>
            <div>
              <h2 style={{ margin: 0, fontSize: "1.3rem", fontWeight: 900, color: "#38bdf8" }}>
                Universal Language Translator, Word Meaning & Receiver Messenger
              </h2>
              <p style={{ margin: "2px 0 0 0", fontSize: "0.82rem", color: "#94a3b8" }}>
                Specify whether you want to translate a statement/word (with exact meaning) OR send a translated message to a receiver
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: "rgba(239, 68, 68, 0.2)",
              border: "1px solid rgba(239, 68, 68, 0.5)",
              color: "#fca5a5",
              padding: "6px 14px",
              borderRadius: "10px",
              cursor: "pointer",
              fontWeight: 800
            }}
          >
            ✕ Close
          </button>
        </div>

        {/* STEP 1: EXPLICIT MODE SPECIFICATION */}
        <div
          style={{
            background: "rgba(15, 23, 42, 0.9)",
            border: "1.5px solid rgba(56, 189, 248, 0.4)",
            borderRadius: "12px",
            padding: "12px 14px",
            marginBottom: "14px"
          }}
        >
          <div style={{ fontSize: "0.8rem", fontWeight: 800, color: "#fbbf24", marginBottom: "8px", textTransform: "uppercase" }}>
            1. Do you want to translate a statement/word OR send a translated message to a receiver?
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
              <div style={{ fontWeight: 800, fontSize: "0.9rem", color: activeMode === "TRANSLATE_WORD_OR_STATEMENT" ? "#34d399" : "#e2e8f0" }}>
                📖 Translate a Statement or Word
              </div>
              <div style={{ fontSize: "0.75rem", color: "#94a3b8", marginTop: "3px" }}>
                Translate any copied sentence or word into the exact language chosen + get its dictionary meaning.
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
              <div style={{ fontWeight: 800, fontSize: "0.9rem", color: activeMode === "SEND_TRANSLATED_MESSAGE" ? "#38bdf8" : "#e2e8f0" }}>
                📨 Send a Translated Message to a Receiver
              </div>
              <div style={{ fontSize: "0.75rem", color: "#94a3b8", marginTop: "3px" }}>
                Choose a receiver (Parent, Teacher, Student, Staff, etc.), translate into their language, and send directly.
              </div>
            </button>
          </div>
        </div>

        {/* STEP 2: LANGUAGE SELECTOR */}
        <div style={{ marginBottom: "14px" }}>
          <label style={{ display: "block", fontSize: "0.82rem", fontWeight: 700, color: "#cbd5e1", marginBottom: "6px" }}>
            2. Choose Exact Target Language ({currentLangMeta.flag} {currentLangMeta.name}):
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
                  fontWeight: selectedLang === lang.code ? 800 : 600,
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

        {/* IF MODE 2: RECEIVER SELECTION */}
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
            <div style={{ fontSize: "0.8rem", fontWeight: 800, color: "#38bdf8", marginBottom: "8px" }}>
              📨 Select Receiver to Send Translated Message To:
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
                  Receiver Name
                </label>
                <input
                  type="text"
                  value={receiverName}
                  onChange={(e) => setReceiverName(e.target.value)}
                  placeholder="e.g. Mrs. Boateng / All Parents"
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
                  Receiver Phone / Email
                </label>
                <input
                  type="text"
                  value={receiverContact}
                  onChange={(e) => setReceiverContact(e.target.value)}
                  placeholder="e.g. +233 24 000 0000"
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

        {/* STEP 3: INPUT WORD OR COPIED STATEMENT */}
        <div style={{ marginBottom: "14px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px", flexWrap: "wrap", gap: "6px" }}>
            <label style={{ fontSize: "0.82rem", fontWeight: 700, color: "#cbd5e1" }}>
              {activeMode === "SEND_TRANSLATED_MESSAGE"
                ? "3. Enter or Paste the Message for the Receiver:"
                : "3. Enter or Paste Any Word, Statement, or Copied Sentence:"}
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
                  fontWeight: 700,
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
                    fontWeight: 700,
                    cursor: "pointer"
                  }}
                >
                  ✕ Clear
                </button>
              )}
            </div>
          </div>
          <textarea
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onPaste={(e) => {
              const pasted = e.clipboardData?.getData("text");
              if (pasted && pasted.trim()) {
                setTimeout(() => handleTranslateNow(pasted.trim(), selectedLang), 100);
              }
            }}
            rows={3}
            placeholder="Paste any word, sentence, SMS notification, or statement here..."
            style={{
              width: "100%",
              padding: "12px",
              borderRadius: "10px",
              background: "rgba(15, 23, 42, 0.9)",
              border: "1.5px solid rgba(56, 189, 248, 0.4)",
              color: "#ffffff",
              fontSize: "0.92rem",
              resize: "vertical"
            }}
          />
        </div>

        {/* ACTION BUTTONS */}
        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", marginBottom: "14px" }}>
          <button
            type="button"
            disabled={isTranslating || !inputText.trim()}
            onClick={() => handleTranslateNow(inputText, selectedLang)}
            style={{
              flex: 1,
              minWidth: "220px",
              padding: "11px 16px",
              borderRadius: "10px",
              background: "linear-gradient(135deg, #10b981, #059669)",
              border: "none",
              color: "#ffffff",
              fontWeight: 800,
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
                background: "linear-gradient(135deg, #38bdf8, #2563eb)",
                border: "none",
                color: "#ffffff",
                fontWeight: 800,
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

        {/* SENT CONFIRMATION */}
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
            <div style={{ fontWeight: 800, color: "#34d399", marginBottom: "4px" }}>
              ✓ Translated Message Delivered to {sentConfirmation.receiverName} ({sentConfirmation.receiverRoleLabel})!
            </div>
            <div style={{ color: "#e2e8f0" }}>
              <strong>Translated ({sentConfirmation.languageName}):</strong> &ldquo;{sentConfirmation.translatedMessage}&rdquo;
            </div>
          </div>
        )}

        {/* TRANSLATION & DICTIONARY MEANING RESULT */}
        {translationResult && (
          <div
            style={{
              padding: "16px",
              borderRadius: "14px",
              background: "rgba(16, 185, 129, 0.1)",
              border: "1.5px solid rgba(16, 185, 129, 0.45)",
              marginBottom: "14px"
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "8px", marginBottom: "8px" }}>
              <span style={{ fontSize: "0.8rem", fontWeight: 800, color: "#34d399", textTransform: "uppercase" }}>
                ✓ Exact Translation ({translationResult.language.flag} {translationResult.language.name})
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
                    fontWeight: 700,
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
                    fontWeight: 700,
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
                background: "rgba(15, 23, 42, 0.85)",
                border: "1px solid rgba(16, 185, 129, 0.35)",
                fontSize: "1.02rem",
                fontWeight: 700,
                color: "#f8fafc",
                lineHeight: "1.55",
                marginBottom: "12px"
              }}
            >
              {translationResult.translatedText}
            </div>

            <div
              style={{
                padding: "12px 14px",
                borderRadius: "10px",
                background: "rgba(15, 23, 42, 0.9)",
                border: "1px solid rgba(56, 189, 248, 0.35)"
              }}
            >
              <div style={{ fontSize: "0.78rem", fontWeight: 800, color: "#38bdf8", marginBottom: "4px", textTransform: "uppercase" }}>
                📖 Exact Word / Statement Meaning ({translationResult.meaning.partOfSpeech || "Meaning"}):
              </div>
              <div style={{ fontSize: "0.88rem", color: "#e2e8f0", lineHeight: "1.5" }}>
                {translationResult.meaning.definition}
              </div>

              {translationResult.language.code !== "ENGLISH" &&
                translationResult.meaning.translatedDefinition &&
                translationResult.meaning.translatedDefinition !== translationResult.meaning.definition && (
                  <div style={{ fontSize: "0.84rem", color: "#a7f3d0", lineHeight: "1.45", marginTop: "6px", paddingTop: "6px", borderTop: "1px dashed rgba(255,255,255,0.12)" }}>
                    <strong>Meaning in {translationResult.language.name}:</strong> {translationResult.meaning.translatedDefinition}
                  </div>
                )}

              {Array.isArray(translationResult.meaning.keyTermsBreakdown) &&
                translationResult.meaning.keyTermsBreakdown.length > 0 && (
                  <div style={{ marginTop: "10px", paddingTop: "8px", borderTop: "1px solid rgba(255,255,255,0.1)" }}>
                    <div style={{ fontSize: "0.75rem", fontWeight: 800, color: "#fbbf24", marginBottom: "6px" }}>
                      Key Vocabulary Defined in This Statement:
                    </div>
                    <div style={{ display: "grid", gap: "5px" }}>
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

        {/* SENT HISTORY */}
        {activeMode === "SEND_TRANSLATED_MESSAGE" && sentHistory.length > 0 && (
          <div
            style={{
              background: "rgba(15, 23, 42, 0.75)",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: "10px",
              padding: "10px 12px"
            }}
          >
            <div style={{ fontSize: "0.75rem", fontWeight: 800, color: "#94a3b8", marginBottom: "6px" }}>
              Recent Translated Messages Sent to Receivers:
            </div>
            <div style={{ display: "grid", gap: "6px", maxHeight: "120px", overflowY: "auto" }}>
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
  );
}
