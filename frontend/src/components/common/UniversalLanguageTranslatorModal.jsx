import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import {
  SUPPORTED_TRANSLATION_LANGUAGES,
  RECEIVER_ROLES,
  parseTranslationCommand,
  performFullTranslationAndMeaning,
  sendTranslatedMessageToReceiver,
  speakTranslationAloud,
} from "../../utils/languageTranslatorEngine";

/**
 * UNIVERSAL LANGUAGE TRANSLATOR MODAL
 * Supports:
 * 1. "📖 Translate a Statement or Word" (exact translation + dictionary meaning)
 * 2. "📨 Send a Translated Message to a Receiver"
 * 3. Natural-language command recognition (typed or spoken via 🎤 Voice Command):
 *    - "Translate <word/sentence> to <Language>"
 *    - "What is the meaning of <word> in <Language>?"
 *    - "Send <message> to <Receiver> in <Language>"
 * 4. Copy-paste auto-translation + Enter key execution + Read Aloud (TTS)
 * 5. Rendered via React Portal directly into document.body so parent stacking contexts never clip it.
 */
export default function UniversalLanguageTranslatorModal({
  isOpen,
  onClose,
  initialText = "",
  initialLang = "",
  initialMode = "",
  initialContextTitle = "",
}) {
  const [translatorMode, setTranslatorMode] = useState(
    () => initialMode || "TRANSLATE_WORD_OR_STATEMENT"
  );
  const [selectedLang, setSelectedLang] = useState(() => {
    try {
      return initialLang || localStorage.getItem("gbs_preferred_language") || "TWI";
    } catch {
      return initialLang || "TWI";
    }
  });
  const [sourceText, setSourceText] = useState(
    initialText ||
    "Welcome to our school. Please pay your school fees on time."
  );
  const [result, setResult] = useState(null);
  const [isTranslating, setIsTranslating] = useState(false);
  const [sendingMsg, setSendingMsg] = useState(false);
  const [copiedFlag, setCopiedFlag] = useState(false);
  const [lastCommandAction, setLastCommandAction] = useState("");
  const [isListeningCommand, setIsListeningCommand] = useState(false);

  // Receiver Messaging State
  const [receiverRole, setReceiverRole] = useState("PARENT");
  const [receiverNameOrContact, setReceiverNameOrContact] = useState("");
  const [sentMessagesHistory, setSentMessagesHistory] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("gbs_translated_messages_inbox") || "[]").slice(0, 10);
    } catch {
      return [];
    }
  });
  const [sendSuccessBanner, setSendSuccessBanner] = useState("");
  const recognitionRef = useRef(null);
  const requestSeqRef = useRef(0);
  const textareaRef = useRef(null);

  useEffect(() => {
    if (!isOpen) {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch { }
        setIsListeningCommand(false);
      }
      return;
    }
    if (initialText && initialText.trim()) {
      setSourceText(initialText.trim());
    }
    if (initialLang && initialLang.trim()) {
      setSelectedLang(initialLang.trim());
      try {
        localStorage.setItem("gbs_preferred_language", initialLang.trim());
      } catch { }
    }
    if (initialMode && initialMode.trim()) {
      setTranslatorMode(initialMode.trim());
    }
  }, [isOpen, initialText, initialLang, initialMode]);

  // Keep preferred language and sent message log synced across root screen translator & dashboard instances
  useEffect(() => {
    const syncLang = (e) => {
      const next = e?.detail || (() => {
        try {
          return localStorage.getItem("gbs_preferred_language");
        } catch {
          return null;
        }
      })();
      if (next && next !== selectedLang) {
        setSelectedLang(next);
      }
    };
    const syncInbox = () => {
      try {
        setSentMessagesHistory(
          JSON.parse(localStorage.getItem("gbs_translated_messages_inbox") || "[]").slice(0, 10)
        );
      } catch { }
    };
    window.addEventListener("gbs_preferred_language_changed", syncLang);
    window.addEventListener("gbs_translated_message_sent", syncInbox);
    window.addEventListener("storage", syncLang);
    window.addEventListener("storage", syncInbox);
    return () => {
      window.removeEventListener("gbs_preferred_language_changed", syncLang);
      window.removeEventListener("gbs_translated_message_sent", syncInbox);
      window.removeEventListener("storage", syncLang);
      window.removeEventListener("storage", syncInbox);
    };
  }, [selectedLang]);

  // Escape key closes modal cleanly
  useEffect(() => {
    if (!isOpen) return;
    const onEsc = (e) => {
      if (e.key === "Escape") {
        onClose?.();
      }
    };
    window.addEventListener("keydown", onEsc);
    return () => window.removeEventListener("keydown", onEsc);
  }, [isOpen, onClose]);

  const executeTranslationCommand = async (
    rawText,
    langOverride,
    isExplicitCommand = false,
    options = {}
  ) => {
    const { forceTargetLang = false } = options || {};
    const inputToProcess = rawText !== undefined ? rawText : sourceText;
    const activeLang = langOverride || selectedLang;
    if (!inputToProcess || !inputToProcess.trim()) {
      requestSeqRef.current += 1;
      setResult(null);
      setIsTranslating(false);
      return null;
    }

    const parsed = parseTranslationCommand(inputToProcess, activeLang, translatorMode);
    const effectiveLang = forceTargetLang ? activeLang : (parsed.targetLangCode || activeLang);

    if (parsed.wasCommandParsed && isExplicitCommand) {
      if (!forceTargetLang && parsed.targetLangCode && parsed.targetLangCode !== selectedLang) {
        setSelectedLang(parsed.targetLangCode);
        try {
          localStorage.setItem("gbs_preferred_language", parsed.targetLangCode);
          window.dispatchEvent(
            new CustomEvent("gbs_preferred_language_changed", { detail: parsed.targetLangCode })
          );
        } catch { }
      }
      if (parsed.mode && parsed.mode !== translatorMode) {
        setTranslatorMode(parsed.mode);
      }
      if (parsed.receiverRole) {
        setReceiverRole(parsed.receiverRole);
      }
      setLastCommandAction(`Translated "${parsed.cleanText}" → ${effectiveLang}`);
    } else if (!parsed.wasCommandParsed) {
      setLastCommandAction("");
    }

    const reqId = ++requestSeqRef.current;
    setIsTranslating(true);
    try {
      const res = await performFullTranslationAndMeaning(inputToProcess, effectiveLang, {
        forceTargetLang
      });
      if (reqId !== requestSeqRef.current) return null;
      setResult(res);
      if (isExplicitCommand && typeof window !== "undefined" && typeof window.showGBSOpenNotice === "function") {
        window.showGBSOpenNotice(
          `🌐 Translated into ${res.language.flag} ${res.language.name}: "${res.translatedText.slice(0, 120)}"`,
          "success",
          "LANGUAGE TRANSLATOR COMMAND EXECUTED"
        );
      }
      return res;
    } catch {
      return null;
    } finally {
      if (reqId === requestSeqRef.current) {
        setIsTranslating(false);
      }
    }
  };

  useEffect(() => {
    if (!isOpen) return;
    let isMounted = true;
    const timer = setTimeout(async () => {
      if (!isMounted) return;
      await executeTranslationCommand(sourceText, selectedLang, false);
    }, 220);
    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [isOpen, sourceText, selectedLang]);

  if (!isOpen) return null;

  const handleLanguageChange = (code) => {
    setSelectedLang(code);
    try {
      localStorage.setItem("gbs_preferred_language", code);
      window.dispatchEvent(new CustomEvent("gbs_preferred_language_changed", { detail: code }));
    } catch { }
    executeTranslationCommand(sourceText, code, true, { forceTargetLang: true });
  };

  const handlePasteAndTranslate = async (e) => {
    const pasted = e.clipboardData?.getData("text");
    if (pasted && pasted.trim()) {
      e.preventDefault();
      const cleanPaste = pasted.trim();
      setSourceText(cleanPaste);
      await executeTranslationCommand(cleanPaste, selectedLang, true);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      executeTranslationCommand(sourceText, selectedLang, true);
    }
  };

  const handleVoiceCommand = () => {
    const SpeechRec =
      typeof window !== "undefined" &&
      (window.SpeechRecognition || window.webkitSpeechRecognition);
    if (!SpeechRec) {
      if (typeof window.showGBSOpenNotice === "function") {
        window.showGBSOpenNotice(
          "Voice recognition is not supported in this browser. Please type or paste your command.",
          "warning",
          "VOICE COMMAND NOTICE"
        );
      }
      return;
    }

    if (isListeningCommand && recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListeningCommand(false);
      return;
    }

    try {
      const rec = new SpeechRec();
      recognitionRef.current = rec;
      rec.lang = "en-US";
      rec.interimResults = false;
      rec.maxAlternatives = 1;
      setIsListeningCommand(true);
      rec.onresult = (event) => {
        const transcript = event.results?.[0]?.[0]?.transcript || "";
        if (transcript.trim()) {
          setSourceText(transcript.trim());
          executeTranslationCommand(transcript.trim(), selectedLang, true);
        }
        setIsListeningCommand(false);
      };
      rec.onerror = () => setIsListeningCommand(false);
      rec.onend = () => setIsListeningCommand(false);
      rec.start();
    } catch {
      setIsListeningCommand(false);
    }
  };

  const handleSpeakAloud = () => {
    if (!result?.translatedText) return;
    speakTranslationAloud(result.translatedText, result.language?.code || selectedLang);
  };

  const handleCopyResult = async () => {
    if (!result) return;
    const textToCopy = `[${result.language?.name || selectedLang} Translation]\n${result.translatedText}\n\n[Exact Meaning & Breakdown]\n${result.meaning?.definition || ""}`;
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(textToCopy);
      } else {
        throw new Error("Clipboard API unavailable");
      }
    } catch {
      try {
        const ta = document.createElement("textarea");
        ta.value = textToCopy;
        ta.style.position = "fixed";
        ta.style.opacity = "0";
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
      } catch { }
    }
    setCopiedFlag(true);
    if (typeof window !== "undefined" && typeof window.showGBSOpenNotice === "function") {
      window.showGBSOpenNotice(
        `📋 Copied ${result.language?.name || selectedLang} translation and dictionary meaning to clipboard.`,
        "info",
        "TRANSLATION COPIED"
      );
    }
    setTimeout(() => setCopiedFlag(false), 2500);
  };

  const handleSendTranslatedMessage = async (e) => {
    if (e) e.preventDefault();
    if (sendingMsg || !sourceText.trim()) return;

    setSendingMsg(true);
    setSendSuccessBanner("");
    try {
      let currentUser = {};
      try {
        currentUser = JSON.parse(localStorage.getItem("gbs_user") || "{}");
      } catch { }

      const needsFreshTranslation =
        !result ||
        result.rawInput !== sourceText.trim() ||
        result.language?.code !== selectedLang;
      const currentRes = needsFreshTranslation
        ? await executeTranslationCommand(sourceText, selectedLang, true, { forceTargetLang: true })
        : result;
      if (!currentRes) return;

      const record = await sendTranslatedMessageToReceiver({
        senderName: currentUser.fullName || currentUser.name || currentUser.email || "School Portal User",
        senderRole: currentUser.role || "USER",
        receiverRole,
        receiverName: receiverNameOrContact.trim(),
        receiverContact: receiverNameOrContact.trim(),
        originalMessage: currentRes.originalText || sourceText.trim(),
        translatedMessage: currentRes.translatedText,
        targetLanguageCode: currentRes.language?.code || selectedLang,
        forceTargetLang: true
      });

      setSentMessagesHistory((prev) => [record, ...prev.filter((m) => m.id !== record.id)].slice(0, 10));
      const roleLabel = record.receiverRoleLabel || record.receiverLabel || record.receiverRole;
      const confirmMsg = `✅ Translated message dispatched to ${record.receiverName} (${roleLabel}) in ${record.languageName}!`;
      setSendSuccessBanner(confirmMsg);
      setTimeout(() => setSendSuccessBanner(""), 5000);
    } finally {
      setSendingMsg(false);
    }
  };

  const modalMarkup = (
    <div
      data-gbs-translator-modal="true"
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(10, 16, 29, 0.88)",
        backdropFilter: "blur(12px)",
        zIndex: 999999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "16px",
        fontFamily: "'Inter', 'Plus Jakarta Sans', system-ui, sans-serif",
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "880px",
          maxHeight: "92vh",
          overflowY: "auto",
          background:
            "linear-gradient(155deg, #141D30 0%, #1E2A44 48%, #243352 100%)",
          border: "2px solid rgba(212, 175, 55, 0.65)",
          borderRadius: "20px",
          padding: "24px",
          color: "#fef3c7",
          boxShadow:
            "0 28px 75px rgba(10, 16, 29, 0.88), 0 0 36px rgba(30, 42, 68, 0.55)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            gap: "12px",
            borderBottom: "1px solid rgba(212, 175, 55, 0.3)",
            paddingBottom: "14px",
            marginBottom: "16px",
          }}
        >
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
              <span
                style={{
                  background: "linear-gradient(135deg, #d4af37, #b45309)",
                  color: "#1c1008",
                  padding: "4px 11px",
                  borderRadius: "999px",
                  fontSize: "10px",
                  fontWeight: 900,
                  letterSpacing: "0.7px",
                }}
              >
                UNIVERSAL REAL-TIME TRANSLATOR & DICTIONARY ENGINE
              </span>
              {initialContextTitle && (
                <span style={{ fontSize: "11px", color: "#fde68a", fontWeight: 700 }}>
                  • Context: {initialContextTitle}
                </span>
              )}
            </div>
            <h2
              style={{
                margin: "8px 0 4px",
                fontSize: "20px",
                fontWeight: 900,
                color: "#fffbeb",
              }}
            >
              🌐 Language Translator, Word Meaning & Receiver Message Dispatcher
            </h2>
            <p style={{ margin: 0, fontSize: "12px", color: "#e5e7eb" }}>
              Type or paste any word, sentence, or natural command (e.g.{" "}
              <strong style={{ color: "#fbbf24" }}>"Translate Good morning to French"</strong> or{" "}
              <strong style={{ color: "#fbbf24" }}>"What is the meaning of arrears in Ga?"</strong>) and press{" "}
              <strong style={{ color: "#fbbf24" }}>Enter</strong>.
            </p>
          </div>
          <button
            type="button"
            data-no-hud-notice="true"
            onClick={onClose}
            style={{
              background: "rgba(110, 32, 41, 0.65)",
              border: "1px solid rgba(212, 175, 55, 0.55)",
              color: "#fef3c7",
              borderRadius: "10px",
              padding: "8px 14px",
              cursor: "pointer",
              fontWeight: 800,
              fontSize: "12px",
            }}
          >
            ✕ Close
          </button>
        </div>

        {/* Specification Prompt */}
        <div
          style={{
            background: "rgba(28, 16, 12, 0.72)",
            border: "1px solid rgba(212, 175, 55, 0.45)",
            borderRadius: "14px",
            padding: "14px",
            marginBottom: "16px",
          }}
        >
          <div
            style={{
              fontSize: "12px",
              fontWeight: 800,
              color: "#fbbf24",
              marginBottom: "10px",
              textTransform: "uppercase",
              letterSpacing: "0.5px",
            }}
          >
            🎯 Specify Action: Do you want to translate a statement/word OR send a translated message to a receiver?
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "10px" }}>
            <button
              type="button"
              data-no-hud-notice="true"
              onClick={() => setTranslatorMode("TRANSLATE_WORD_OR_STATEMENT")}
              style={{
                padding: "12px 14px",
                borderRadius: "10px",
                cursor: "pointer",
                textAlign: "left",
                border:
                  translatorMode === "TRANSLATE_WORD_OR_STATEMENT"
                    ? "2px solid #fbbf24"
                    : "1px solid rgba(212,175,55,0.28)",
                background:
                  translatorMode === "TRANSLATE_WORD_OR_STATEMENT"
                    ? "linear-gradient(135deg, rgba(212, 175, 55, 0.28), rgba(110, 32, 41, 0.55))"
                    : "rgba(39, 39, 42, 0.65)",
                color: "#fffbeb",
              }}
            >
              <div style={{ fontWeight: 900, fontSize: "13px", color: "#fef3c7" }}>
                📖 1. Translate a Statement or Word
              </div>
              <div style={{ fontSize: "11px", color: "#d6d3d1", marginTop: "3px" }}>
                Get exact translation, dictionary definitions, grammar breakdown & examples
              </div>
            </button>

            <button
              type="button"
              data-no-hud-notice="true"
              onClick={() => setTranslatorMode("SEND_TRANSLATED_MESSAGE")}
              style={{
                padding: "12px 14px",
                borderRadius: "10px",
                cursor: "pointer",
                textAlign: "left",
                border:
                  translatorMode === "SEND_TRANSLATED_MESSAGE"
                    ? "2px solid #fbbf24"
                    : "1px solid rgba(212,175,55,0.28)",
                background:
                  translatorMode === "SEND_TRANSLATED_MESSAGE"
                    ? "linear-gradient(135deg, rgba(212, 175, 55, 0.28), rgba(110, 32, 41, 0.55))"
                    : "rgba(39, 39, 42, 0.65)",
                color: "#fffbeb",
              }}
            >
              <div style={{ fontWeight: 900, fontSize: "13px", color: "#fef3c7" }}>
                📨 2. Send a Translated Message to a Receiver
              </div>
              <div style={{ fontSize: "11px", color: "#d6d3d1", marginTop: "3px" }}>
                Translate your statement into the receiver's language and dispatch immediately
              </div>
            </button>
          </div>
        </div>

        {/* Receiver Selector when in SEND_TRANSLATED_MESSAGE mode */}
        {translatorMode === "SEND_TRANSLATED_MESSAGE" && (
          <div
            style={{
              background: "rgba(74, 21, 27, 0.45)",
              border: "1px solid rgba(212, 175, 55, 0.45)",
              borderRadius: "12px",
              padding: "14px",
              marginBottom: "16px",
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "12px",
            }}
          >
            <div>
              <label
                style={{
                  fontSize: "11px",
                  fontWeight: 800,
                  color: "#fde68a",
                  display: "block",
                  marginBottom: "6px",
                }}
              >
                👤 Select Message Receiver Role:
              </label>
              <select
                value={receiverRole}
                onChange={(e) => setReceiverRole(e.target.value)}
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  borderRadius: "8px",
                  background: "rgba(28, 16, 12, 0.9)",
                  border: "1px solid rgba(212, 175, 55, 0.55)",
                  color: "#fffbeb",
                  fontSize: "13px",
                  fontWeight: 700,
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
              <label
                style={{
                  fontSize: "11px",
                  fontWeight: 800,
                  color: "#fde68a",
                  display: "block",
                  marginBottom: "6px",
                }}
              >
                📱 Receiver Name / ID / Phone (Optional):
              </label>
              <input
                type="text"
                value={receiverNameOrContact}
                onChange={(e) => setReceiverNameOrContact(e.target.value)}
                placeholder="e.g. Mr. Mensah / +233240000000 / All Parents"
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  borderRadius: "8px",
                  background: "rgba(28, 16, 12, 0.9)",
                  border: "1px solid rgba(212, 175, 55, 0.55)",
                  color: "#fffbeb",
                  fontSize: "13px",
                  boxSizing: "border-box",
                }}
              />
            </div>
          </div>
        )}

        {/* Language Grid */}
        <div style={{ marginBottom: "14px" }}>
          <label
            style={{
              fontSize: "11px",
              fontWeight: 800,
              color: "#fbbf24",
              textTransform: "uppercase",
              display: "block",
              marginBottom: "8px",
            }}
          >
            1. Choose Exact Target Language ({SUPPORTED_TRANSLATION_LANGUAGES.length} Languages Active):
          </label>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "7px" }}>
            {SUPPORTED_TRANSLATION_LANGUAGES.map((lang) => {
              const active = selectedLang === lang.code;
              return (
                <button
                  key={lang.code}
                  type="button"
                  data-no-hud-notice="true"
                  onClick={() => handleLanguageChange(lang.code)}
                  style={{
                    padding: "7px 12px",
                    borderRadius: "10px",
                    border: active
                      ? "2px solid #fbbf24"
                      : "1px solid rgba(212, 175, 55, 0.28)",
                    background: active
                      ? "linear-gradient(135deg, #d4af37, #92400e)"
                      : "rgba(39, 39, 42, 0.72)",
                    color: active ? "#1c1008" : "#f3f4f6",
                    fontSize: "12px",
                    fontWeight: active ? 900 : 700,
                    cursor: "pointer",
                  }}
                >
                  {lang.flag} {lang.name}
                </button>
              );
            })}
          </div>
        </div>

        {/* Input Box */}
        <div style={{ marginBottom: "16px" }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "6px",
              flexWrap: "wrap",
              gap: "8px",
            }}
          >
            <label
              style={{
                fontSize: "11px",
                fontWeight: 800,
                color: "#fbbf24",
                textTransform: "uppercase",
              }}
            >
              2. Type or Paste Word, Sentence, or Command (Press Enter to Translate):
            </label>
            <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
              <button
                type="button"
                data-no-hud-notice="true"
                onClick={handleVoiceCommand}
                style={{
                  background: isListeningCommand
                    ? "linear-gradient(135deg, #dc2626, #991b1b)"
                    : "rgba(212, 175, 55, 0.2)",
                  border: "1px solid rgba(212, 175, 55, 0.6)",
                  color: "#fef3c7",
                  borderRadius: "6px",
                  padding: "4px 10px",
                  fontSize: "11px",
                  fontWeight: 800,
                  cursor: "pointer",
                }}
              >
                {isListeningCommand ? "🛑 Listening..." : "🎤 Voice Command"}
              </button>
              <button
                type="button"
                data-no-hud-notice="true"
                onClick={async () => {
                  try {
                    const clip = await navigator.clipboard.readText();
                    if (clip && clip.trim()) {
                      setSourceText(clip.trim());
                      await executeTranslationCommand(clip.trim(), selectedLang, true);
                      return;
                    }
                  } catch {
                    // user can use Ctrl+V
                  }
                  textareaRef.current?.focus();
                  if (typeof window !== "undefined" && typeof window.showGBSOpenNotice === "function") {
                    window.showGBSOpenNotice(
                      "Press Ctrl+V (or long-press Paste) inside the text box to paste and translate immediately.",
                      "info",
                      "CLIPBOARD PASTE READY"
                    );
                  }
                }}
                style={{
                  background: "rgba(212, 175, 55, 0.18)",
                  border: "1px solid rgba(212, 175, 55, 0.55)",
                  color: "#fde68a",
                  borderRadius: "6px",
                  padding: "4px 10px",
                  fontSize: "11px",
                  fontWeight: 800,
                  cursor: "pointer",
                }}
              >
                📋 Paste & Translate Now
              </button>
              <button
                type="button"
                data-no-hud-notice="true"
                onClick={() => {
                  setSourceText("");
                  setResult(null);
                  setLastCommandAction("");
                  textareaRef.current?.focus();
                }}
                style={{
                  background: "rgba(110, 32, 41, 0.55)",
                  border: "1px solid rgba(212, 175, 55, 0.35)",
                  color: "#fecdd3",
                  borderRadius: "6px",
                  padding: "4px 10px",
                  fontSize: "11px",
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                Clear
              </button>
            </div>
          </div>

          <textarea
            ref={textareaRef}
            rows={3}
            value={sourceText}
            onChange={(e) => setSourceText(e.target.value)}
            onPaste={handlePasteAndTranslate}
            onKeyDown={handleKeyDown}
            placeholder="Type any word (e.g. 'scholarship'), sentence, or command (e.g. 'Translate Please pay school fees to French')..."
            style={{
              width: "100%",
              borderRadius: "12px",
              background: "rgba(20, 12, 10, 0.92)",
              border: "1.5px solid rgba(212, 175, 55, 0.55)",
              color: "#fffbeb",
              padding: "12px",
              fontSize: "14px",
              lineHeight: 1.5,
              boxSizing: "border-box",
            }}
          />

          {/* Quick Command Chips */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginTop: "8px" }}>
            {[
              { label: "🇬🇭 Greeting → Twi", cmd: "Translate Good morning, welcome to our school to Twi" },
              { label: "🇬🇭 Fee Notice → Ga", cmd: "Translate Please pay your school fees receipt to Ga" },
              { label: "🇫🇷 Exam Notice → French", cmd: "Translate Examination results have been published to French" },
              { label: "📖 Define 'scholarship'", cmd: "What is the meaning of scholarship" },
              { label: "📖 Define 'arrears' in Hausa", cmd: "What is the meaning of arrears in Hausa" },
            ].map((sample, idx) => (
              <button
                key={idx}
                type="button"
                data-no-hud-notice="true"
                onClick={() => {
                  setSourceText(sample.cmd);
                  executeTranslationCommand(sample.cmd, selectedLang, true);
                }}
                style={{
                  background: "rgba(62, 31, 20, 0.72)",
                  border: "1px solid rgba(212, 175, 55, 0.38)",
                  color: "#fde68a",
                  borderRadius: "999px",
                  padding: "4px 10px",
                  fontSize: "11px",
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                ⚡ {sample.label}
              </button>
            ))}
          </div>
        </div>

        {/* Command Recognition Banner */}
        {lastCommandAction && (
          <div
            style={{
              background: "rgba(212, 175, 55, 0.16)",
              border: "1px solid rgba(212, 175, 55, 0.55)",
              borderRadius: "10px",
              padding: "8px 12px",
              marginBottom: "12px",
              fontSize: "12px",
              fontWeight: 800,
              color: "#fef08a",
            }}
          >
            ⚡ Command Executed: {lastCommandAction}
          </div>
        )}

        {/* Output Panel */}
        <div
          style={{
            background: "rgba(24, 15, 14, 0.9)",
            border: "1.5px solid rgba(212, 175, 55, 0.55)",
            borderRadius: "14px",
            padding: "16px",
            marginBottom: "16px",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "10px",
              flexWrap: "wrap",
              gap: "8px",
            }}
          >
            <span style={{ fontSize: "12px", fontWeight: 900, color: "#fbbf24" }}>
              {isTranslating
                ? "⏳ Translating & Looking Up Exact Meaning..."
                : `✅ ${result?.language?.flag || "🌐"} ${result?.language?.name || selectedLang} Translation & Meaning:`}
            </span>
          </div>

          <div
            style={{
              fontSize: "16px",
              fontWeight: 800,
              color: "#fffbeb",
              lineHeight: 1.6,
              padding: "12px 14px",
              background: "rgba(74, 21, 27, 0.48)",
              borderRadius: "10px",
              borderLeft: "4px solid #d4af37",
              marginBottom: "12px",
              whiteSpace: "pre-wrap",
            }}
          >
            {result?.translatedText || "Type or paste a word or statement above to translate."}
          </div>

          <div
            style={{
              fontSize: "13px",
              color: "#f3f4f6",
              lineHeight: 1.65,
              padding: "12px 14px",
              background: "rgba(39, 39, 42, 0.78)",
              borderRadius: "10px",
              borderLeft: "4px solid #f59e0b",
              whiteSpace: "pre-wrap",
            }}
          >
            <strong style={{ color: "#fbbf24", display: "block", marginBottom: "4px" }}>
              💡 Exact Word / Statement Meaning & Dictionary Breakdown
              {result?.meaning?.partOfSpeech ? ` (${result.meaning.partOfSpeech})` : ""}:
            </strong>
            <div>{result?.meaning?.definition || "Meaning & word-by-word explanation will appear here."}</div>
            {result?.meaning?.secondaryDefinition && (
              <div style={{ marginTop: "5px", color: "#d6d3d1" }}>
                <strong>Additional Meaning:</strong> {result.meaning.secondaryDefinition}
              </div>
            )}
            {result?.meaning?.translatedDefinition &&
              result.meaning.translatedDefinition !== result.meaning.definition && (
                <div style={{ marginTop: "6px", color: "#fde68a", fontWeight: 700 }}>
                  • In {result?.language?.name}: {result.meaning.translatedDefinition}
                </div>
              )}
            {result?.meaning?.example && (
              <div style={{ marginTop: "5px", color: "#cbd5e1", fontStyle: "italic", fontSize: "12px" }}>
                Example: &ldquo;{result.meaning.example}&rdquo;
              </div>
            )}
            {Array.isArray(result?.meaning?.keyTermsBreakdown) &&
              result.meaning.keyTermsBreakdown.length > 0 && (
                <div style={{ marginTop: "8px", paddingTop: "8px", borderTop: "1px solid rgba(212, 175, 55, 0.25)" }}>
                  <div style={{ fontSize: "11px", fontWeight: 800, color: "#fbbf24", marginBottom: "4px" }}>
                    Key Words Defined in Your Statement:
                  </div>
                  <div style={{ display: "grid", gap: "4px" }}>
                    {result.meaning.keyTermsBreakdown.map((item, idx) => (
                      <div key={idx} style={{ fontSize: "12px", color: "#e5e7eb" }}>
                        • <strong style={{ color: "#fbbf24" }}>{item.term}</strong> <em>({item.partOfSpeech})</em>: {item.meaning}
                      </div>
                    ))}
                  </div>
                </div>
              )}
          </div>
        </div>

        {sendSuccessBanner && (
          <div
            style={{
              background: "rgba(212, 175, 55, 0.22)",
              border: "1px solid #fbbf24",
              color: "#fef3c7",
              padding: "10px 14px",
              borderRadius: "10px",
              marginBottom: "14px",
              fontSize: "12px",
              fontWeight: 800,
            }}
          >
            {sendSuccessBanner}
          </div>
        )}

        {/* Action Buttons */}
        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
          <button
            type="button"
            data-no-hud-notice="true"
            disabled={isTranslating || !sourceText.trim()}
            onClick={() => executeTranslationCommand(sourceText, selectedLang, true)}
            style={{
              background: "linear-gradient(135deg, #d4af37, #b45309)",
              border: "1px solid #fde68a",
              color: "#1c1008",
              borderRadius: "10px",
              padding: "10px 18px",
              fontWeight: 900,
              fontSize: "13px",
              cursor: isTranslating || !sourceText.trim() ? "not-allowed" : "pointer",
            }}
          >
            {isTranslating ? "⏳ Translating..." : "🔄 Translate & Get Exact Meaning"}
          </button>

          <button
            type="button"
            data-no-hud-notice="true"
            disabled={!result?.translatedText}
            onClick={handleSpeakAloud}
            style={{
              background: "linear-gradient(135deg, #6e2029, #4a151b)",
              border: "1px solid rgba(212, 175, 55, 0.6)",
              color: "#fef3c7",
              borderRadius: "10px",
              padding: "10px 16px",
              fontWeight: 800,
              fontSize: "13px",
              cursor: result?.translatedText ? "pointer" : "not-allowed",
            }}
          >
            🔊 Read Aloud ({result?.language?.name || selectedLang})
          </button>

          <button
            type="button"
            data-no-hud-notice="true"
            disabled={!result}
            onClick={handleCopyResult}
            style={{
              background: "rgba(62, 31, 20, 0.85)",
              border: "1px solid rgba(212, 175, 55, 0.5)",
              color: "#fde68a",
              borderRadius: "10px",
              padding: "10px 16px",
              fontWeight: 800,
              fontSize: "13px",
              cursor: result ? "pointer" : "not-allowed",
            }}
          >
            {copiedFlag ? "✅ Copied Translation & Meaning!" : "📋 Copy Translation & Meaning"}
          </button>

          {translatorMode !== "SEND_TRANSLATED_MESSAGE" && (
            <button
              type="button"
              data-no-hud-notice="true"
              onClick={() => setTranslatorMode("SEND_TRANSLATED_MESSAGE")}
              style={{
                background: "rgba(16, 185, 129, 0.2)",
                border: "1px solid #10b981",
                color: "#6ee7b7",
                borderRadius: "10px",
                padding: "10px 16px",
                fontWeight: 800,
                fontSize: "13px",
                cursor: "pointer",
              }}
            >
              📨 Send to a Receiver
            </button>
          )}

          {translatorMode === "SEND_TRANSLATED_MESSAGE" && (
            <button
              type="button"
              data-no-hud-notice="true"
              disabled={sendingMsg || !sourceText.trim()}
              onClick={handleSendTranslatedMessage}
              style={{
                background: "linear-gradient(135deg, #f59e0b, #92400e)",
                border: "1px solid #fef08a",
                color: "#1c1008",
                borderRadius: "10px",
                padding: "10px 18px",
                fontWeight: 900,
                fontSize: "13px",
                cursor: sendingMsg || !sourceText.trim() ? "not-allowed" : "pointer",
              }}
            >
              {sendingMsg ? "📤 Sending..." : "📨 Translate & Send to Receiver Now"}
            </button>
          )}
        </div>

        {/* Sent Translated Messages Log */}
        {translatorMode === "SEND_TRANSLATED_MESSAGE" && sentMessagesHistory.length > 0 && (
          <div
            style={{
              marginTop: "18px",
              borderTop: "1px solid rgba(212, 175, 55, 0.3)",
              paddingTop: "12px",
            }}
          >
            <div
              style={{
                fontSize: "11px",
                fontWeight: 800,
                color: "#fbbf24",
                marginBottom: "8px",
              }}
            >
              📬 Recent Translated Messages Dispatched to Receivers:
            </div>
            <div
              style={{
                maxHeight: "140px",
                overflowY: "auto",
                display: "flex",
                flexDirection: "column",
                gap: "6px",
              }}
            >
              {sentMessagesHistory.slice(0, 5).map((m) => (
                <div
                  key={m.id}
                  style={{
                    background: "rgba(28, 16, 12, 0.82)",
                    border: "1px solid rgba(212, 175, 55, 0.3)",
                    borderRadius: "8px",
                    padding: "8px 10px",
                    fontSize: "11px",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", color: "#fde68a" }}>
                    <strong>
                      To: {m.receiverName} ({m.receiverRoleLabel || m.receiverLabel || m.receiverRole} • {m.languageName})
                    </strong>
                    <span>{new Date(m.sentAt || Date.now()).toLocaleTimeString()}</span>
                  </div>
                  <div style={{ color: "#fffbeb", fontWeight: 700, marginTop: "3px" }}>
                    "{m.translatedMessage}"
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );

  if (typeof document !== "undefined" && document.body) {
    return createPortal(modalMarkup, document.body);
  }
  return modalMarkup;
}
