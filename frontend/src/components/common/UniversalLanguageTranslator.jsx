import React, { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import UniversalLanguageTranslatorModal from "./UniversalLanguageTranslatorModal";

/**
 * UniversalLanguageTranslator (Root Floating Pill + Screen Translator Entry Point)
 *
 * Renders a floating on-screen trigger pill across every page and delegates directly
 * to the canonical portal-based UniversalLanguageTranslatorModal so the on-screen
 * translator works identically to the dashboard translators.
 */
function normalizeOpenArgs(textOrOptions, langArg, modeArg) {
  if (textOrOptions && typeof textOrOptions === "object" && !(textOrOptions instanceof Event)) {
    const src = textOrOptions;
    const rawText =
      typeof src.text === "string"
        ? src.text
        : typeof src.initialText === "string"
          ? src.initialText
          : "";
    return {
      text: rawText.trim(),
      lang: typeof (src.lang || src.targetLang) === "string" ? String(src.lang || src.targetLang).trim() : "",
      mode: typeof src.mode === "string" ? src.mode.trim() : "",
      contextTitle: typeof src.contextTitle === "string" ? src.contextTitle.trim() : "",
    };
  }

  return {
    text: typeof textOrOptions === "string" ? textOrOptions.trim() : "",
    lang: typeof langArg === "string" ? langArg.trim() : "",
    mode: typeof modeArg === "string" ? modeArg.trim() : "",
    contextTitle: "",
  };
}

export default function UniversalLanguageTranslator() {
  const [isOpen, setIsOpen] = useState(false);
  const [launchPayload, setLaunchPayload] = useState({
    text: "",
    lang: "",
    mode: "",
    contextTitle: "",
  });

  const lastSelectedPageTextRef = useRef("");

  // Capture highlighted page text when the modal is closed (never overwriting active modal input)
  useEffect(() => {
    const captureSelection = (event) => {
      if (isOpen) return;
      const target = event?.target;
      if (target && typeof target.closest === "function") {
        if (
          target.closest("[data-gbs-translator-modal]") ||
          target.closest("[data-gbs-translator-pill]") ||
          target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA"
        ) {
          return;
        }
      }

      const sel = window.getSelection()?.toString()?.trim() || "";
      if (!sel) {
        lastSelectedPageTextRef.current = "";
        return;
      }
      if (sel.length > 1 && sel.length < 1200) {
        lastSelectedPageTextRef.current = sel;
      }
    };

    document.addEventListener("mouseup", captureSelection);
    document.addEventListener("keyup", captureSelection);
    return () => {
      document.removeEventListener("mouseup", captureSelection);
      document.removeEventListener("keyup", captureSelection);
    };
  }, [isOpen]);

  const openTranslator = useCallback((argOrDetail, langArg, modeArg) => {
    const parsed = normalizeOpenArgs(argOrDetail, langArg, modeArg);
    const liveSel = window.getSelection()?.toString()?.trim() || "";
    const resolvedText =
      parsed.text ||
      (liveSel.length > 1 && liveSel.length < 1200 ? liveSel : "") ||
      lastSelectedPageTextRef.current ||
      "";

    setLaunchPayload({
      text: resolvedText,
      lang: parsed.lang,
      mode: parsed.mode,
      contextTitle: parsed.contextTitle,
    });
    setIsOpen(true);
  }, []);

  // Register global window helpers and event listeners across all pages & dashboards
  useEffect(() => {
    const handleEventOpen = (e) => {
      openTranslator(e?.detail || {});
    };

    window.addEventListener("gbs_open_translator", handleEventOpen);
    window.addEventListener("gbs_open_language_translator", handleEventOpen);
    window.openGBSScreenTranslator = openTranslator;
    window.openGBSTranslator = openTranslator;

    return () => {
      window.removeEventListener("gbs_open_translator", handleEventOpen);
      window.removeEventListener("gbs_open_language_translator", handleEventOpen);
      if (window.openGBSTranslator === openTranslator) {
        delete window.openGBSTranslator;
      }
      if (window.openGBSScreenTranslator === openTranslator) {
        delete window.openGBSScreenTranslator;
      }
    };
  }, [openTranslator]);

  const handlePillClick = () => {
    if (isOpen) {
      setIsOpen(false);
      return;
    }
    const liveSel = window.getSelection()?.toString()?.trim() || "";
    const resolvedText =
      (liveSel.length > 1 && liveSel.length < 1200 ? liveSel : "") ||
      lastSelectedPageTextRef.current ||
      "";
    setLaunchPayload({
      text: resolvedText,
      lang: "",
      mode: "",
      contextTitle: "",
    });
    setIsOpen(true);
  };

  const floatingPill = (
    <div
      data-gbs-translator-pill="true"
      style={{
        position: "fixed",
        bottom: "16px",
        left: "16px",
        zIndex: 99990,
        maxWidth: "calc(100vw - 32px)",
      }}
    >
      <button
        type="button"
        data-no-hud-notice="true"
        onMouseDown={() => {
          const sel = window.getSelection()?.toString()?.trim() || "";
          lastSelectedPageTextRef.current = sel.length > 1 && sel.length < 1200 ? sel : "";
        }}
        onClick={handlePillClick}
        style={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
          padding: "9px 16px",
          borderRadius: "999px",
          background: "linear-gradient(135deg, #141D30 0%, #1E2A44 52%, #243352 100%)",
          border: "1.5px solid #d4af37",
          color: "#fbbf24",
          fontWeight: "800",
          fontSize: "0.78rem",
          cursor: "pointer",
          boxShadow: "0 8px 24px rgba(10, 16, 29, 0.78), 0 0 18px rgba(30, 42, 68, 0.48)",
        }}
        title="Translate any word or copied statement into your exact chosen language, or send a translated message to a receiver"
      >
        <span style={{ fontSize: "1rem" }}>🌐</span>
        <span>Language Translator &amp; Meaning</span>
      </button>
    </div>
  );

  return (
    <>
      {typeof document !== "undefined" && document.body
        ? createPortal(floatingPill, document.body)
        : floatingPill}

      <UniversalLanguageTranslatorModal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        initialText={launchPayload.text}
        initialLang={launchPayload.lang}
        initialMode={launchPayload.mode}
        initialContextTitle={launchPayload.contextTitle}
      />
    </>
  );
}
