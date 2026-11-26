import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import PhonicsAndAlphabetsLearningStudio from "./PhonicsAndAlphabetsLearningStudio";
import {
  SUPPORTED_TRANSLATION_LANGUAGES,
  RECEIVER_ROLES,
  parseTranslationCommand,
  performFullTranslationAndMeaning,
  sendTranslatedMessageToReceiver,
  fetchTranslatedMessagesInbox,
  markTranslatedMessageRead,
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

  // Receiver Messaging & Inbox State
  const [receiverRole, setReceiverRole] = useState("PARENT");
  const [receiverNameOrContact, setReceiverNameOrContact] = useState("");
  const [inboxFilterRole, setInboxFilterRole] = useState("ALL");
  const [sentMessagesHistory, setSentMessagesHistory] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("gbs_translated_messages_inbox") || "[]").slice(0, 100);
    } catch {
      return [];
    }
  });
  const [sendSuccessBanner, setSendSuccessBanner] = useState("");
  const recognitionRef = useRef(null);
  const requestSeqRef = useRef(0);
  const textareaRef = useRef(null);

  const loadInboxMessages = async (roleOverride = inboxFilterRole) => {
    try {
      const merged = await fetchTranslatedMessagesInbox({
        receiverRole: roleOverride === "ALL" ? "" : roleOverride,
        limit: 100,
      });
      setSentMessagesHistory(merged);
    } catch { }
  };

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
    loadInboxMessages(inboxFilterRole);
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

  // Keep preferred language and inbox synced across root screen translator & dashboard instances
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
      loadInboxMessages(inboxFilterRole);
    };
    window.addEventListener("gbs_preferred_language_changed", syncLang);
    window.addEventListener("gbs_translated_message_sent", syncInbox);
    window.addEventListener("gbs_translated_message_read", syncInbox);
    window.addEventListener("storage", syncLang);
    window.addEventListener("storage", syncInbox);
    return () => {
      window.removeEventListener("gbs_preferred_language_changed", syncLang);
      window.removeEventListener("gbs_translated_message_sent", syncInbox);
      window.removeEventListener("gbs_translated_message_read", syncInbox);
      window.removeEventListener("storage", syncLang);
      window.removeEventListener("storage", syncInbox);
    };
  }, [selectedLang, inboxFilterRole]);

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
    if (
      !isOpen ||
      translatorMode === "RECEIVED_MESSAGES_INBOX" ||
      translatorMode === "JOLLY_PHONICS_42" ||
      translatorMode === "COUNTRY_ALPHABETS"
    ) {
      return;
    }
    let isMounted = true;
    const timer = setTimeout(async () => {
      if (!isMounted) return;
      await executeTranslationCommand(sourceText, selectedLang, false);
    }, 550);
    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [isOpen, sourceText, selectedLang, translatorMode]);

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

      const fullSenderName =
        currentUser.fullName ||
        currentUser.name ||
        `${currentUser.firstName || ""} ${currentUser.lastName || ""}`.trim() ||
        currentUser.email ||
        "School Portal User";
      const record = await sendTranslatedMessageToReceiver({
        senderId: currentUser.id || null,
        senderName: fullSenderName,
        senderRole: currentUser.role || localStorage.getItem("gbs_auth_role") || "USER",
        senderEmail: currentUser.email || "",
        tenantId: currentUser.tenantId || localStorage.getItem("gbs_tenant_id") || 1,
        receiverRole,
        receiverName: receiverNameOrContact.trim(),
        receiverContact: receiverNameOrContact.trim(),
        originalMessage: currentRes.originalText || sourceText.trim(),
        translatedMessage: currentRes.translatedText,
        meaningSummary: currentRes.meaning?.definition || currentRes.backTranslation || "",
        targetLanguageCode: currentRes.language?.code || selectedLang,
        forceTargetLang: true
      });

      setSentMessagesHistory((prev) => [record, ...prev.filter((m) => m.id !== record.id)].slice(0, 100));
      const roleLabel = record.receiverRoleLabel || record.receiverLabel || record.receiverRole;
      const confirmMsg = `✅ Translated message from ${record.senderName} (${record.senderRole}) delivered to ${record.receiverName} (${roleLabel}) in ${record.languageName}!`;
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
            "linear-gradient(155deg, #060f1e 0%, #081428 45%, #0f2347 80%, #0a192f 100%)",
          border: "2px solid rgba(212, 175, 55, 0.72)",
          borderRadius: "20px",
          padding: "24px",
          color: "#fef3c7",
          boxShadow:
            "0 28px 75px rgba(4, 10, 22, 0.90), 0 0 36px rgba(212, 175, 55, 0.28)",
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
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))", gap: "10px" }}>
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

            <button
              type="button"
              data-no-hud-notice="true"
              onClick={() => {
                setTranslatorMode("RECEIVED_MESSAGES_INBOX");
                loadInboxMessages(inboxFilterRole);
              }}
              style={{
                padding: "12px 14px",
                borderRadius: "10px",
                cursor: "pointer",
                textAlign: "left",
                border:
                  translatorMode === "RECEIVED_MESSAGES_INBOX"
                    ? "2px solid #34d399"
                    : "1px solid rgba(52, 211, 153, 0.35)",
                background:
                  translatorMode === "RECEIVED_MESSAGES_INBOX"
                    ? "linear-gradient(135deg, rgba(16, 185, 129, 0.28), rgba(20, 83, 45, 0.55))"
                    : "rgba(39, 39, 42, 0.65)",
                color: "#fffbeb",
              }}
            >
              <div style={{ fontWeight: 900, fontSize: "13px", color: "#6ee7b7" }}>
                📥 3. Received Messages Inbox ({sentMessagesHistory.filter((m) => !m.read).length} Unread / {sentMessagesHistory.length})
              </div>
              <div style={{ fontSize: "11px", color: "#d6d3d1", marginTop: "3px" }}>
                Read incoming translated messages with full sender details & audio readout
              </div>
            </button>

            <button
              type="button"
              data-no-hud-notice="true"
              data-testid="translator-mode-jolly-phonics"
              onClick={() => setTranslatorMode("JOLLY_PHONICS_42")}
              style={{
                padding: "12px 14px",
                borderRadius: "10px",
                cursor: "pointer",
                textAlign: "left",
                border:
                  translatorMode === "JOLLY_PHONICS_42"
                    ? "2px solid #38bdf8"
                    : "1px solid rgba(56, 189, 248, 0.35)",
                background:
                  translatorMode === "JOLLY_PHONICS_42"
                    ? "linear-gradient(135deg, rgba(14, 165, 233, 0.3), rgba(8, 47, 73, 0.72))"
                    : "rgba(39, 39, 42, 0.65)",
                color: "#fffbeb",
              }}
            >
              <div style={{ fontWeight: 900, fontSize: "13px", color: "#7dd3fc" }}>
                🔊 4. 42 Jolly Phonics Sounds &amp; Writing
              </div>
              <div style={{ fontSize: "11px", color: "#d6d3d1", marginTop: "3px" }}>
                Hear all 42 phonics sounds (Groups 1–7), actions, words &amp; trace how letters are written
              </div>
            </button>

            <button
              type="button"
              data-no-hud-notice="true"
              data-testid="translator-mode-country-alphabets"
              onClick={() => setTranslatorMode("COUNTRY_ALPHABETS")}
              style={{
                padding: "12px 14px",
                borderRadius: "10px",
                cursor: "pointer",
                textAlign: "left",
                border:
                  translatorMode === "COUNTRY_ALPHABETS"
                    ? "2px solid #fbbf24"
                    : "1px solid rgba(212, 175, 55, 0.35)",
                background:
                  translatorMode === "COUNTRY_ALPHABETS"
                    ? "linear-gradient(135deg, rgba(212, 175, 55, 0.3), rgba(120, 53, 15, 0.65))"
                    : "rgba(39, 39, 42, 0.65)",
                color: "#fffbeb",
              }}
            >
              <div style={{ fontWeight: 900, fontSize: "13px", color: "#fde68a" }}>
                🌍 5. Country &amp; Language Alphabets
              </div>
              <div style={{ fontSize: "11px", color: "#d6d3d1", marginTop: "3px" }}>
                Learn letter sounds &amp; how alphabets are written across all 17 countries &amp; languages
              </div>
            </button>
          </div>
        </div>

        {translatorMode === "JOLLY_PHONICS_42" && (
          <PhonicsAndAlphabetsLearningStudio mode="JOLLY_PHONICS" />
        )}

        {translatorMode === "COUNTRY_ALPHABETS" && (
          <PhonicsAndAlphabetsLearningStudio mode="COUNTRY_ALPHABETS" />
        )}

        {/* INBOX VIEW: RECEIVED TRANSLATED MESSAGES WITH SENDER DETAILS */}
        {translatorMode === "RECEIVED_MESSAGES_INBOX" && (
          <div
            style={{
              background: "rgba(24, 15, 14, 0.92)",
              border: "1.5px solid rgba(52, 211, 153, 0.55)",
              borderRadius: "14px",
              padding: "16px",
              marginBottom: "16px",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px", marginBottom: "12px" }}>
              <div>
                <h3 style={{ margin: 0, fontSize: "15px", fontWeight: 900, color: "#6ee7b7" }}>
                  📥 Translated Messages Inbox (With Sender Details)
                </h3>
                <div style={{ fontSize: "11px", color: "#cbd5e1", marginTop: "2px" }}>
                  Messages translated and sent to school portal users appear here with complete sender identity.
                </div>
              </div>
              <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
                <select
                  value={inboxFilterRole}
                  onChange={(e) => {
                    const nextRole = e.target.value;
                    setInboxFilterRole(nextRole);
                    loadInboxMessages(nextRole);
                  }}
                  style={{
                    padding: "6px 10px",
                    borderRadius: "8px",
                    background: "rgba(28, 16, 12, 0.95)",
                    border: "1px solid rgba(212, 175, 55, 0.5)",
                    color: "#fef3c7",
                    fontSize: "12px",
                    fontWeight: 700,
                  }}
                >
                  <option value="ALL">All Portal Roles</option>
                  {RECEIVER_ROLES.map((r) => (
                    <option key={r.id} value={r.id}>{r.icon} {r.label}</option>
                  ))}
                </select>
                <button
                  type="button"
                  data-no-hud-notice="true"
                  onClick={() => loadInboxMessages(inboxFilterRole)}
                  style={{
                    padding: "6px 12px",
                    borderRadius: "8px",
                    background: "rgba(16, 185, 129, 0.2)",
                    border: "1px solid #10b981",
                    color: "#6ee7b7",
                    fontWeight: 800,
                    fontSize: "12px",
                    cursor: "pointer",
                  }}
                >
                  🔄 Refresh Inbox
                </button>
              </div>
            </div>

            {sentMessagesHistory.length === 0 ? (
              <div style={{ padding: "24px", textAlign: "center", color: "#cbd5e1", background: "rgba(39, 39, 42, 0.55)", borderRadius: "10px", fontSize: "13px" }}>
                No translated messages received yet for this filter. Use <strong>Send a Translated Message</strong> to dispatch one now!
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "10px", maxHeight: "380px", overflowY: "auto" }}>
                {sentMessagesHistory.map((m) => (
                  <div
                    key={m.id}
                    style={{
                      background: m.read ? "rgba(39, 39, 42, 0.65)" : "rgba(16, 185, 129, 0.12)",
                      border: m.read ? "1px solid rgba(212, 175, 55, 0.28)" : "1.5px solid #34d399",
                      borderRadius: "12px",
                      padding: "12px 14px",
                    }}
                  >
                    {/* Sender & Recipient Metadata Bar */}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "8px", borderBottom: "1px solid rgba(255,255,255,0.1)", paddingBottom: "8px", marginBottom: "8px" }}>
                      <div style={{ fontSize: "12px", lineHeight: 1.5 }}>
                        <div>
                          <span style={{ background: m.read ? "rgba(148,163,184,0.22)" : "#10b981", color: m.read ? "#cbd5e1" : "#022c22", padding: "2px 7px", borderRadius: "999px", fontSize: "10px", fontWeight: 900, marginRight: "6px" }}>
                            {m.read ? "✓ READ" : "● NEW MESSAGE"}
                          </span>
                          <strong style={{ color: "#fbbf24" }}>From: {m.senderName || "School Portal User"}</strong>
                          {m.senderRole && (
                            <span style={{ marginLeft: "6px", background: "rgba(212,175,55,0.22)", border: "1px solid rgba(212,175,55,0.45)", color: "#fde68a", padding: "1px 7px", borderRadius: "6px", fontSize: "10px", fontWeight: 800 }}>
                              {m.senderRole}
                            </span>
                          )}
                          {m.senderEmail && (
                            <span style={{ marginLeft: "6px", color: "#cbd5e1", fontSize: "11px" }}>({m.senderEmail})</span>
                          )}
                        </div>
                        <div style={{ color: "#d6d3d1", fontSize: "11px", marginTop: "2px" }}>
                          To: <strong style={{ color: "#f8fafc" }}>{m.receiverName || "Recipient"}</strong> ({m.receiverRoleLabel || m.receiverLabel || m.receiverRole}) • {m.languageFlag || "🌐"} {m.languageName}
                        </div>
                      </div>
                      <div style={{ fontSize: "11px", color: "#cbd5e1", textAlign: "right" }}>
                        {m.sentAt ? new Date(m.sentAt).toLocaleString() : ""}
                      </div>
                    </div>

                    {/* Translated Content */}
                    <div style={{ background: "rgba(74, 21, 27, 0.48)", borderLeft: "4px solid #d4af37", borderRadius: "8px", padding: "9px 12px", color: "#fffbeb", fontWeight: 800, fontSize: "14px", marginBottom: "8px" }}>
                      {m.translatedMessage}
                    </div>

                    {/* Original Message & Meaning */}
                    <div style={{ fontSize: "12px", color: "#e5e7eb", lineHeight: 1.5 }}>
                      <div><strong style={{ color: "#fde68a" }}>Original Message:</strong> {m.originalMessage}</div>
                      {m.meaningSummary && (
                        <div style={{ marginTop: "3px", color: "#bae6fd" }}><strong>Meaning:</strong> {m.meaningSummary}</div>
                      )}
                    </div>

                    {/* Inbox Card Actions */}
                    <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginTop: "10px" }}>
                      <button
                        type="button"
                        data-no-hud-notice="true"
                        onClick={() => speakTranslationAloud(m.translatedMessage, m.languageCode || "TWI")}
                        style={{ padding: "5px 11px", borderRadius: "7px", background: "rgba(110, 32, 41, 0.7)", border: "1px solid rgba(212,175,55,0.5)", color: "#fef3c7", fontSize: "11px", fontWeight: 800, cursor: "pointer" }}
                      >
                        🔊 Read Aloud
                      </button>
                      {!m.read && (
                        <button
                          type="button"
                          data-no-hud-notice="true"
                          onClick={async () => {
                            let reader = "Recipient";
                            try {
                              const u = JSON.parse(localStorage.getItem("gbs_user") || "{}");
                              reader = u.fullName || u.name || u.email || u.role || "Recipient";
                            } catch { }
                            await markTranslatedMessageRead(m.id, reader);
                            setSentMessagesHistory((prev) => prev.map((x) => (x.id === m.id ? { ...x, read: true } : x)));
                          }}
                          style={{ padding: "5px 11px", borderRadius: "7px", background: "rgba(16, 185, 129, 0.22)", border: "1px solid #10b981", color: "#6ee7b7", fontSize: "11px", fontWeight: 800, cursor: "pointer" }}
                        >
                          ✓ Mark as Read
                        </button>
                      )}
                      <button
                        type="button"
                        data-no-hud-notice="true"
                        onClick={() => {
                          setTranslatorMode("SEND_TRANSLATED_MESSAGE");
                          setReceiverRole(m.senderRole && RECEIVER_ROLES.some((r) => r.id === m.senderRole) ? m.senderRole : "PARENT");
                          setReceiverNameOrContact(m.senderName || "");
                          if (m.languageCode) setSelectedLang(m.languageCode);
                          setSourceText("");
                        }}
                        style={{ padding: "5px 11px", borderRadius: "7px", background: "rgba(56, 189, 248, 0.18)", border: "1px solid #38bdf8", color: "#bae6fd", fontSize: "11px", fontWeight: 800, cursor: "pointer" }}
                      >
                        ↩️ Reply in {m.languageName || m.languageCode}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

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

        {translatorMode !== "RECEIVED_MESSAGES_INBOX" &&
          translatorMode !== "JOLLY_PHONICS_42" &&
          translatorMode !== "COUNTRY_ALPHABETS" && (
          <>
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
                  💡 Exact Word / Statement Meaning &amp; Dictionary Breakdown
                  {result?.meaning?.partOfSpeech ? ` (${result.meaning.partOfSpeech})` : ""}
                  {result?.meaning?.phonetic ? ` • ${result.meaning.phonetic}` : ""}:
                </strong>
                <div>{result?.meaning?.definition || (result?.backTranslation ? `Verified English meaning: "${result.backTranslation}"` : "Exact dictionary meaning will appear here once translated.")}</div>
                {result?.backTranslation && result?.meaning?.definition && !result.meaning.definition.includes(result.backTranslation) && (
                  <div style={{ marginTop: "5px", color: "#6ee7b7", fontSize: "12px", fontWeight: 700 }}>
                    ✓ Verified Back-Translation Check: &ldquo;{result.backTranslation}&rdquo;
                  </div>
                )}
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
                {Array.isArray(result?.meaning?.synonyms) && result.meaning.synonyms.length > 0 && (
                  <div style={{ marginTop: "6px", fontSize: "12px", color: "#bae6fd" }}>
                    <strong>Synonyms:</strong> {result.meaning.synonyms.join(", ")}
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
          </>
        )}

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
                  <div style={{ display: "flex", justifyContent: "space-between", color: "#fde68a", flexWrap: "wrap", gap: "4px" }}>
                    <strong>
                      From: {m.senderName || "School Portal User"} ({m.senderRole || "USER"}) → To: {m.receiverName} ({m.receiverRoleLabel || m.receiverLabel || m.receiverRole} • {m.languageName})
                    </strong>
                    <span>{new Date(m.sentAt || Date.now()).toLocaleTimeString()}</span>
                  </div>
                  <div style={{ color: "#fffbeb", fontWeight: 700, marginTop: "3px" }}>
                    "{m.translatedMessage}"
                  </div>
                  {m.originalMessage && (
                    <div style={{ color: "#cbd5e1", fontSize: "10px", marginTop: "2px" }}>
                      Original: {m.originalMessage}
                    </div>
                  )}
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
