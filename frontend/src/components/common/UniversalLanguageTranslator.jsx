import React, { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import UniversalLanguageTranslatorModal from "./UniversalLanguageTranslatorModal";
import { fetchTranslatedMessagesInbox } from "../../utils/languageTranslatorEngine";

const TRANSLATOR_POS_KEY = "gbs_translator_floating_pos";
const TRANSLATOR_MIN_KEY = "gbs_translator_minimized";

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

function clampPositionToViewport(x, y, elWidth = 148, elHeight = 40) {
  if (typeof window === "undefined") return { x: 16, y: 16 };
  const margin = 8;
  const maxX = Math.max(margin, window.innerWidth - elWidth - margin);
  const maxY = Math.max(margin, window.innerHeight - elHeight - margin);
  return {
    x: Math.min(Math.max(margin, Number(x) || margin), maxX),
    y: Math.min(Math.max(margin, Number(y) || margin), maxY),
  };
}

/**
 * UniversalLanguageTranslator (Movable Compact Floating Translator Widget)
 *
 * Compact, freely draggable pill/orb that can be moved smoothly from any side
 * or corner of the screen to any other end via mouse or touch without blocking
 * tables, forms, or reading content.
 */
export default function UniversalLanguageTranslator() {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(() => {
    try {
      return localStorage.getItem(TRANSLATOR_MIN_KEY) === "true";
    } catch {
      return false;
    }
  });
  const [isDragging, setIsDragging] = useState(false);
  const [unreadInboxCount, setUnreadInboxCount] = useState(0);
  const [position, setPosition] = useState(() => {
    const fallbackY = typeof window !== "undefined" ? Math.max(16, window.innerHeight - 64) : 600;
    try {
      const saved = JSON.parse(localStorage.getItem(TRANSLATOR_POS_KEY) || "null");
      if (saved && typeof saved.x === "number" && typeof saved.y === "number") {
        return clampPositionToViewport(saved.x, saved.y);
      }
    } catch { }
    return clampPositionToViewport(16, fallbackY);
  });
  const [launchPayload, setLaunchPayload] = useState({
    text: "",
    lang: "",
    mode: "",
    contextTitle: "",
  });

  const lastSelectedPageTextRef = useRef("");
  const containerRef = useRef(null);
  const dragStateRef = useRef({
    active: false,
    moved: false,
    startX: 0,
    startY: 0,
    origX: 0,
    origY: 0,
  });

  useEffect(() => {
    const syncUnreadCount = async () => {
      try {
        let role = "";
        try {
          const u = JSON.parse(localStorage.getItem("gbs_user") || "{}");
          role = String(u.role || localStorage.getItem("gbs_auth_role") || "").toUpperCase();
        } catch { }
        const list = await fetchTranslatedMessagesInbox({ receiverRole: role, limit: 50 });
        setUnreadInboxCount(list.filter((m) => !m.read).length);
      } catch { }
    };
    syncUnreadCount();
    const onSentOrRead = () => syncUnreadCount();
    window.addEventListener("gbs_translated_message_sent", onSentOrRead);
    window.addEventListener("gbs_translated_message_read", onSentOrRead);
    window.addEventListener("storage", onSentOrRead);
    const poll = setInterval(syncUnreadCount, 20000);
    return () => {
      window.removeEventListener("gbs_translated_message_sent", onSentOrRead);
      window.removeEventListener("gbs_translated_message_read", onSentOrRead);
      window.removeEventListener("storage", onSentOrRead);
      clearInterval(poll);
    };
  }, []);

  // Keep widget inside viewport bounds whenever device orientation or window size changes
  useEffect(() => {
    const handleResize = () => {
      const rect = containerRef.current?.getBoundingClientRect();
      const w = rect?.width || (isMinimized ? 42 : 148);
      const h = rect?.height || 40;
      setPosition((prev) => clampPositionToViewport(prev.x, prev.y, w, h));
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [isMinimized]);

  // Capture highlighted page text when modal is closed
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

  // Smooth universal drag from any side of screen to another (mouse + touch via Pointer Events)
  useEffect(() => {
    const handlePointerMove = (e) => {
      if (!dragStateRef.current.active) return;
      const dx = e.clientX - dragStateRef.current.startX;
      const dy = e.clientY - dragStateRef.current.startY;
      if (Math.hypot(dx, dy) > 5) {
        dragStateRef.current.moved = true;
        setIsDragging(true);
      }
      const rect = containerRef.current?.getBoundingClientRect();
      const w = rect?.width || (isMinimized ? 42 : 148);
      const h = rect?.height || 40;
      const clamped = clampPositionToViewport(
        dragStateRef.current.origX + dx,
        dragStateRef.current.origY + dy,
        w,
        h
      );
      setPosition(clamped);
    };

    const handlePointerUp = () => {
      if (!dragStateRef.current.active) return;
      const wasMoved = dragStateRef.current.moved;
      dragStateRef.current.active = false;
      setIsDragging(false);
      if (wasMoved) {
        setPosition((curr) => {
          try {
            localStorage.setItem(TRANSLATOR_POS_KEY, JSON.stringify(curr));
          } catch { }
          return curr;
        });
      }
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
    window.addEventListener("pointercancel", handlePointerUp);
    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
      window.removeEventListener("pointercancel", handlePointerUp);
    };
  }, [isMinimized]);

  const handlePointerDown = (e) => {
    if (e.button !== undefined && e.button !== 0 && e.pointerType === "mouse") return;
    const sel = window.getSelection()?.toString()?.trim() || "";
    if (sel.length > 1 && sel.length < 1200) {
      lastSelectedPageTextRef.current = sel;
    }
    dragStateRef.current = {
      active: true,
      moved: false,
      startX: e.clientX,
      startY: e.clientY,
      origX: position.x,
      origY: position.y,
    };
  };

  const handleOpenClick = (e) => {
    e.stopPropagation();
    if (dragStateRef.current.moved) {
      dragStateRef.current.moved = false;
      return;
    }
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

  const toggleMinimized = (e) => {
    e.stopPropagation();
    if (dragStateRef.current.moved) return;
    const next = !isMinimized;
    setIsMinimized(next);
    try {
      localStorage.setItem(TRANSLATOR_MIN_KEY, String(next));
    } catch { }
    const nextW = next ? 42 : 148;
    setPosition((prev) => clampPositionToViewport(prev.x, prev.y, nextW, 40));
  };

  const floatingPill = (
    <div
      ref={containerRef}
      data-gbs-translator-pill="true"
      onPointerDown={handlePointerDown}
      style={{
        position: "fixed",
        left: `${position.x}px`,
        top: `${position.y}px`,
        zIndex: 99990,
        touchAction: "none",
        userSelect: "none",
        cursor: isDragging ? "grabbing" : "grab",
        transition: isDragging ? "none" : "box-shadow 0.2s ease, transform 0.15s ease",
        display: "inline-flex",
        alignItems: "center",
        gap: isMinimized ? "0px" : "4px",
        padding: isMinimized ? "4px" : "4px 8px 4px 7px",
        borderRadius: "999px",
        background: "linear-gradient(135deg, rgba(56, 14, 20, 0.94) 0%, rgba(92, 24, 34, 0.94) 55%, rgba(39, 39, 42, 0.94) 100%)",
        border: "1.5px solid #d4af37",
        boxShadow: isDragging
          ? "0 12px 28px rgba(0, 0, 0, 0.7), 0 0 18px rgba(212, 175, 55, 0.65)"
          : "0 4px 14px rgba(15, 23, 42, 0.55), 0 0 10px rgba(212, 175, 55, 0.28)",
        backdropFilter: "blur(8px)",
      }}
      title="Drag to move anywhere on screen • Click to translate highlighted text or messages"
    >
      {isMinimized ? (
        <button
          type="button"
          data-no-hud-notice="true"
          onClick={handleOpenClick}
          onContextMenu={(e) => {
            e.preventDefault();
            toggleMinimized(e);
          }}
          style={{
            width: "30px",
            height: "30px",
            borderRadius: "50%",
            border: "none",
            background: "transparent",
            color: "#fde68a",
            fontSize: "0.95rem",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: isDragging ? "grabbing" : "pointer",
            padding: 0,
          }}
          title="Click to open Language Translator • Drag to move anywhere"
        >
          🌐
        </button>
      ) : (
        <>
          <span
            aria-hidden="true"
            style={{
              color: "rgba(253, 230, 138, 0.7)",
              fontSize: "0.75rem",
              letterSpacing: "-1px",
              paddingRight: "2px",
              cursor: isDragging ? "grabbing" : "grab",
            }}
            title="Drag anywhere on screen"
          >
            ⠿
          </span>
          <button
            type="button"
            data-no-hud-notice="true"
            onClick={handleOpenClick}
            style={{
              background: "transparent",
              border: "none",
              color: "#fde68a",
              fontWeight: 800,
              fontSize: "0.72rem",
              display: "inline-flex",
              alignItems: "center",
              gap: "5px",
              cursor: isDragging ? "grabbing" : "pointer",
              padding: "2px 4px",
              whiteSpace: "nowrap",
            }}
          >
            <span style={{ fontSize: "0.88rem" }}>🌐</span>
            <span>Translate</span>
            {unreadInboxCount > 0 && (
              <span
                style={{
                  background: "#10b981",
                  color: "#022c22",
                  borderRadius: "999px",
                  padding: "0 5px",
                  fontSize: "0.65rem",
                  fontWeight: 900,
                }}
                title={`${unreadInboxCount} unread translated message(s)`}
              >
                {unreadInboxCount}
              </span>
            )}
          </button>
          <button
            type="button"
            data-no-hud-notice="true"
            onClick={toggleMinimized}
            style={{
              background: "rgba(255, 255, 255, 0.1)",
              border: "none",
              color: "#e2e8f0",
              width: "18px",
              height: "18px",
              borderRadius: "50%",
              fontSize: "0.65rem",
              lineHeight: 1,
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              padding: 0,
            }}
            title="Shrink to compact icon"
          >
            –
          </button>
        </>
      )}
      {isMinimized && (
        <button
          type="button"
          data-no-hud-notice="true"
          onClick={toggleMinimized}
          style={{
            background: "rgba(212, 175, 55, 0.25)",
            border: "none",
            color: "#fde68a",
            width: "16px",
            height: "16px",
            borderRadius: "50%",
            fontSize: "0.6rem",
            cursor: "pointer",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 0,
            marginLeft: "-4px",
          }}
          title="Expand pill label"
        >
          ›
        </button>
      )}
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
