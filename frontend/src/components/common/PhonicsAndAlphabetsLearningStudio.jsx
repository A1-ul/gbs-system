import React, { useState, useRef, useEffect, useMemo } from "react";
import {
  JOLLY_PHONICS_GROUPS,
  JOLLY_PHONICS_42_SOUNDS,
  COUNTRY_ALPHABETS_CATALOG,
  speakPhonicsOrLetter
} from "../../utils/phonicsAndAlphabetsData";
import {
  playJollyPhonicsExactSound,
  playCountryAlphabetExactSound,
  getLetterStrokeDiagram
} from "../../utils/phonicsAudioEngine";

/**
 * Interactive 4-Line Handwriting Guide, Step-by-Step Visual Stroke Diagram & Trace Canvas
 * Shows EXACTLY how each country writes its letters (numbered start dots + directional arrows)
 * and lets students trace & practice writing live.
 */
function LetterWritingPracticePad({ displayGlyph, direction = "ltr", label = "Letter", howToWrite = "" }) {
  const canvasRef = useRef(null);
  const drawingRef = useRef(false);
  const [strokeCount, setStrokeCount] = useState(0);
  const [animStep, setAnimStep] = useState(-1);

  const strokeInfo = useMemo(
    () => getLetterStrokeDiagram(displayGlyph, howToWrite, direction),
    [displayGlyph, howToWrite, direction]
  );

  const playStrokeAnimation = () => {
    const total = strokeInfo.paths ? strokeInfo.paths.length : strokeInfo.steps.length;
    if (!total) return;
    setAnimStep(0);
    for (let i = 1; i <= total; i++) {
      setTimeout(() => {
        setAnimStep(i < total ? i : -1);
      }, i * 850);
    }
  };

  const drawGuideCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);

    // Paper background
    ctx.fillStyle = "#fffdf5";
    ctx.fillRect(0, 0, w, h);

    // 4-Line Handwriting Ruling (Ascender, Dashed Midline, Baseline, Descender)
    const lines = [
      { y: 26, color: "#93c5fd", dash: [] },
      { y: 74, color: "#f59e0b", dash: [6, 5] },
      { y: 122, color: "#1d4ed8", dash: [] },
      { y: 152, color: "#cbd5e1", dash: [4, 4] }
    ];
    for (const ln of lines) {
      ctx.save();
      ctx.beginPath();
      ctx.strokeStyle = ln.color;
      ctx.lineWidth = ln.y === 122 ? 1.8 : 1.1;
      ctx.setLineDash(ln.dash);
      ctx.moveTo(10, ln.y);
      ctx.lineTo(w - 10, ln.y);
      ctx.stroke();
      ctx.restore();
    }

    // Faint ghost letter for guided tracing
    ctx.save();
    ctx.fillStyle = "rgba(15, 35, 71, 0.14)";
    ctx.font = "700 84px 'Segoe UI', 'Noto Sans', Arial, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "alphabetic";
    ctx.direction = direction;
    ctx.fillText(String(displayGlyph || "").slice(0, 5), w / 2, 120);
    ctx.restore();
  };

  useEffect(() => {
    drawGuideCanvas();
    setStrokeCount(0);
  }, [displayGlyph, direction]);

  const getCoords = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY
    };
  };

  const handlePointerDown = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.setPointerCapture?.(e.pointerId);
    drawingRef.current = true;
    const ctx = canvas.getContext("2d");
    const { x, y } = getCoords(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.strokeStyle = "#081833";
    ctx.lineWidth = 4.5;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    setStrokeCount((c) => c + 1);
  };

  const handlePointerMove = (e) => {
    if (!drawingRef.current || !canvasRef.current) return;
    const ctx = canvasRef.current.getContext("2d");
    const { x, y } = getCoords(e);
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const handlePointerUp = () => {
    drawingRef.current = false;
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
      {/* Visual Numbered Stroke-Order Writing Guide */}
      <div
        data-testid="letter-stroke-order-guide"
        style={{
          display: "grid",
          gridTemplateColumns: "92px 1fr",
          gap: "10px",
          alignItems: "center",
          background: "rgba(8, 24, 51, 0.85)",
          border: "1px solid rgba(56, 189, 248, 0.42)",
          borderRadius: "10px",
          padding: "8px 10px"
        }}
      >
        <div
          style={{
            width: "88px",
            height: "88px",
            borderRadius: "8px",
            background: "#fffdf5",
            border: "1.5px solid #d4af37",
            position: "relative",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            overflow: "hidden"
          }}
        >
          <svg viewBox="0 0 100 100" width="84" height="84" aria-label={`How to write ${label}`}>
            <defs>
              <marker id="gbsStrokeArrow" markerWidth="6" markerHeight="6" refX="4.5" refY="3" orient="auto">
                <path d="M0,0 L6,3 L0,6 Z" fill="#0284c7" />
              </marker>
            </defs>
            <line x1="6" y1="20" x2="94" y2="20" stroke="#bfdbfe" strokeWidth="1" />
            <line x1="6" y1="50" x2="94" y2="50" stroke="#fcd34d" strokeDasharray="3 3" strokeWidth="1" />
            <line x1="6" y1="80" x2="94" y2="80" stroke="#2563eb" strokeWidth="1.2" />
            <text
              x="50"
              y="74"
              textAnchor="middle"
              fontSize="58"
              fontWeight="700"
              fill="rgba(15, 35, 71, 0.14)"
              direction={direction}
            >
              {String(displayGlyph || "").slice(0, 3)}
            </text>
            {Array.isArray(strokeInfo.paths) && strokeInfo.paths.map((st, idx) => {
              const isHighlighted = animStep === -1 || animStep === idx;
              return (
                <g key={idx} opacity={isHighlighted ? 1 : 0.25}>
                  <path
                    d={st.d}
                    fill="none"
                    stroke={animStep === idx ? "#dc2626" : "#0284c7"}
                    strokeWidth={animStep === idx ? "3.6" : "2.6"}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    markerEnd="url(#gbsStrokeArrow)"
                  />
                  <circle cx={st.start[0]} cy={st.start[1]} r="6.8" fill="#059669" />
                  <text
                    x={st.start[0]}
                    y={st.start[1] + 2.7}
                    textAnchor="middle"
                    fontSize="8.5"
                    fontWeight="900"
                    fill="#ffffff"
                  >
                    {idx + 1}
                  </text>
                </g>
              );
            })}
            {!strokeInfo.paths && (
              <g>
                <path
                  d={direction === "rtl" ? "M 82 14 L 22 14" : "M 18 14 L 78 14"}
                  fill="none"
                  stroke="#059669"
                  strokeWidth="2.5"
                  markerEnd="url(#gbsStrokeArrow)"
                />
                <text x="50" y="94" textAnchor="middle" fontSize="9" fontWeight="800" fill="#0369a1">
                  {direction === "rtl" ? "← Right to Left" : "Left to Right →"}
                </text>
              </g>
            )}
          </svg>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
            <span style={{ fontSize: "10.5px", fontWeight: 900, color: "#7dd3fc" }}>
              ✏️ Exact Writing Stroke Order ({direction === "rtl" ? "Right → Left" : "Left → Right"})
            </span>
            <button
              type="button"
              data-no-hud-notice="true"
              onClick={playStrokeAnimation}
              style={{
                padding: "2px 8px",
                borderRadius: "999px",
                background: "rgba(16, 185, 129, 0.22)",
                border: "1px solid #10b981",
                color: "#6ee7b7",
                fontSize: "10px",
                fontWeight: 800,
                cursor: "pointer"
              }}
            >
              ▶ Replay Strokes
            </button>
          </div>
          <ol style={{ margin: 0, paddingLeft: "16px", fontSize: "11px", color: "#e2e8f0", lineHeight: 1.4 }}>
            {strokeInfo.steps.map((stepText, sIdx) => (
              <li
                key={sIdx}
                style={{
                  color: animStep === sIdx ? "#fde68a" : "#e2e8f0",
                  fontWeight: animStep === sIdx ? 800 : 500
                }}
              >
                {stepText}
              </li>
            ))}
          </ol>
        </div>
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
        <span style={{ fontSize: "11px", fontWeight: 800, color: "#fde68a" }}>
          ✍️ Practice Writing &amp; Trace ({label}) — {direction === "rtl" ? "Right → Left" : "Left → Right"}:
        </span>
        <button
          type="button"
          data-no-hud-notice="true"
          onClick={() => { drawGuideCanvas(); setStrokeCount(0); }}
          style={{
            padding: "4px 10px",
            borderRadius: "6px",
            background: "rgba(212, 175, 55, 0.2)",
            border: "1px solid rgba(212, 175, 55, 0.55)",
            color: "#fef3c7",
            fontSize: "11px",
            fontWeight: 800,
            cursor: "pointer"
          }}
        >
          🧹 Clear Trace {strokeCount > 0 ? `(${strokeCount})` : ""}
        </button>
      </div>
      <canvas
        ref={canvasRef}
        width={340}
        height={172}
        data-testid="letter-writing-canvas"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
        style={{
          width: "100%",
          maxWidth: "360px",
          height: "152px",
          borderRadius: "10px",
          border: "2px solid rgba(212, 175, 55, 0.65)",
          touchAction: "none",
          cursor: "crosshair",
          display: "block"
        }}
      />
    </div>
  );
}

export default function PhonicsAndAlphabetsLearningStudio({ mode = "JOLLY_PHONICS" }) {
  // 42 Jolly Phonics state
  const [selectedGroup, setSelectedGroup] = useState(0); // 0 = All 42
  const [phonicsSearch, setPhonicsSearch] = useState("");
  const [selectedPhonicId, setSelectedPhonicId] = useState(1);
  const [selectedPhonicsCountryCode, setSelectedPhonicsCountryCode] = useState("GH");

  // Country & Language Alphabets state
  const [selectedCountryCode, setSelectedCountryCode] = useState("GH");
  const [selectedLangId, setSelectedLangId] = useState("gh_twi");
  const [selectedLetterIdx, setSelectedLetterIdx] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(false);
  const autoPlayTimerRef = useRef(null);

  useEffect(() => {
    return () => {
      if (autoPlayTimerRef.current) clearTimeout(autoPlayTimerRef.current);
      try { window.speechSynthesis?.cancel(); } catch { }
    };
  }, []);

  const filteredPhonics = useMemo(() => {
    const q = phonicsSearch.trim().toLowerCase();
    return JOLLY_PHONICS_42_SOUNDS.filter((item) => {
      if (selectedGroup !== 0 && item.group !== selectedGroup) return false;
      if (!q) return true;
      return `${item.grapheme} ${item.soundCue} ${item.examples.join(" ")}`.toLowerCase().includes(q);
    });
  }, [selectedGroup, phonicsSearch]);

  const activePhonic = useMemo(
    () => JOLLY_PHONICS_42_SOUNDS.find((p) => p.id === selectedPhonicId) || JOLLY_PHONICS_42_SOUNDS[0],
    [selectedPhonicId]
  );

  const activePhonicsCountry = useMemo(
    () => COUNTRY_ALPHABETS_CATALOG.find((c) => c.countryCode === selectedPhonicsCountryCode) || COUNTRY_ALPHABETS_CATALOG[0],
    [selectedPhonicsCountryCode]
  );

  const activeCountry = useMemo(
    () => COUNTRY_ALPHABETS_CATALOG.find((c) => c.countryCode === selectedCountryCode) || COUNTRY_ALPHABETS_CATALOG[0],
    [selectedCountryCode]
  );

  const activeLanguage = useMemo(() => {
    const found = activeCountry.languages.find((l) => l.id === selectedLangId);
    return found || activeCountry.languages[0];
  }, [activeCountry, selectedLangId]);

  const activeLetter = activeLanguage.alphabet[selectedLetterIdx] || activeLanguage.alphabet[0];

  const stopAutoPlay = () => {
    if (autoPlayTimerRef.current) {
      clearTimeout(autoPlayTimerRef.current);
      autoPlayTimerRef.current = null;
    }
    setIsAutoPlaying(false);
    try { window.speechSynthesis?.cancel(); } catch { }
  };

  const handlePlayAllAlphabet = () => {
    if (isAutoPlaying) {
      stopAutoPlay();
      return;
    }
    setIsAutoPlaying(true);
    const letters = activeLanguage.alphabet;
    let idx = 0;
    const step = () => {
      if (idx >= letters.length) {
        setIsAutoPlaying(false);
        return;
      }
      setSelectedLetterIdx(idx);
      playCountryAlphabetExactSound(letters[idx], activeLanguage, { withWord: false });
      idx += 1;
      autoPlayTimerRef.current = setTimeout(step, 1450);
    };
    step();
  };

  if (mode === "JOLLY_PHONICS") {
    return (
      <div
        data-testid="jolly-phonics-42-studio"
        style={{
          background: "rgba(15, 23, 42, 0.85)",
          border: "1.5px solid rgba(56, 189, 248, 0.55)",
          borderRadius: "14px",
          padding: "16px",
          display: "flex",
          flexDirection: "column",
          gap: "14px"
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "10px" }}>
          <div>
            <h3 style={{ margin: 0, fontSize: "15px", fontWeight: 900, color: "#7dd3fc" }}>
              🔊 Complete 42 Jolly Phonics Sounds &amp; Letter Writing Studio (Groups 1–7)
            </h3>
            <p style={{ margin: "3px 0 0", fontSize: "11.5px", color: "#cbd5e1" }}>
              Tap any of the 42 sounds to hear crisp pronunciation, learn the action cue &amp; example words, and practice how each letter is written.
            </p>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
            <label style={{ fontSize: "11px", fontWeight: 800, color: "#fde68a" }}>Country Accent:</label>
            <select
              value={selectedPhonicsCountryCode}
              onChange={(e) => setSelectedPhonicsCountryCode(e.target.value)}
              data-testid="phonics-country-accent-select"
              style={{
                padding: "6px 10px",
                borderRadius: "8px",
                background: "rgba(8, 24, 51, 0.95)",
                border: "1px solid rgba(212, 175, 55, 0.55)",
                color: "#fef3c7",
                fontSize: "12px",
                fontWeight: 700
              }}
            >
              {COUNTRY_ALPHABETS_CATALOG.map((c) => (
                <option key={c.countryCode} value={c.countryCode}>
                  {c.flag} {c.countryName}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Group Filter Pills + Search */}
        <div style={{ display: "flex", justifyContent: "space-between", gap: "8px", flexWrap: "wrap", alignItems: "center" }}>
          <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
            <button
              type="button"
              data-no-hud-notice="true"
              onClick={() => setSelectedGroup(0)}
              style={{
                padding: "5px 10px",
                borderRadius: "999px",
                border: selectedGroup === 0 ? "1.5px solid #fbbf24" : "1px solid rgba(148,163,184,0.35)",
                background: selectedGroup === 0 ? "#d4af37" : "rgba(30,41,59,0.8)",
                color: selectedGroup === 0 ? "#081833" : "#e2e8f0",
                fontSize: "11px",
                fontWeight: 800,
                cursor: "pointer"
              }}
            >
              All 42 Sounds
            </button>
            {JOLLY_PHONICS_GROUPS.map((g) => (
              <button
                key={g.group}
                type="button"
                data-no-hud-notice="true"
                onClick={() => setSelectedGroup(g.group)}
                style={{
                  padding: "5px 10px",
                  borderRadius: "999px",
                  border: selectedGroup === g.group ? `1.5px solid ${g.color}` : "1px solid rgba(148,163,184,0.35)",
                  background: selectedGroup === g.group ? "rgba(56, 189, 248, 0.25)" : "rgba(30,41,59,0.8)",
                  color: selectedGroup === g.group ? "#ffffff" : "#cbd5e1",
                  fontSize: "11px",
                  fontWeight: 800,
                  cursor: "pointer"
                }}
              >
                {g.title}: {g.summary}
              </button>
            ))}
          </div>
          <input
            type="text"
            placeholder="Filter sound or word (e.g. sh, ai, sun)..."
            value={phonicsSearch}
            onChange={(e) => setPhonicsSearch(e.target.value)}
            style={{
              padding: "6px 10px",
              borderRadius: "8px",
              background: "rgba(8, 20, 40, 0.92)",
              border: "1px solid rgba(212, 175, 55, 0.45)",
              color: "#fffbeb",
              fontSize: "12px",
              minWidth: "200px"
            }}
          />
        </div>

        {/* 42 Sounds Tile Grid */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(78px, 1fr))", gap: "7px", maxHeight: "220px", overflowY: "auto", padding: "2px" }}>
          {filteredPhonics.map((sound) => {
            const active = activePhonic.id === sound.id;
            return (
              <button
                key={sound.id}
                type="button"
                data-no-hud-notice="true"
                data-testid={`jolly-phonic-btn-${sound.id}`}
                onClick={() => {
                  setSelectedPhonicId(sound.id);
                  const locale = activePhonicsCountry.languages.find((l) => l.speechLocale.startsWith("en"))?.speechLocale || "en-GB";
                  playJollyPhonicsExactSound(sound, { withWord: false, locale });
                }}
                style={{
                  padding: "8px 6px",
                  borderRadius: "10px",
                  border: active ? "2px solid #fbbf24" : "1px solid rgba(212, 175, 55, 0.3)",
                  background: active
                    ? "linear-gradient(135deg, rgba(212, 175, 55, 0.32), rgba(14, 165, 233, 0.3))"
                    : "rgba(8, 24, 51, 0.85)",
                  color: "#fffbeb",
                  cursor: "pointer",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: "2px"
                }}
              >
                <span style={{ fontSize: "9px", color: "#94a3b8", fontWeight: 700 }}>#{sound.id} • G{sound.group}</span>
                <strong style={{ fontSize: "16px", color: active ? "#fde68a" : "#ffffff" }}>{sound.grapheme}</strong>
                <span style={{ fontSize: "10px", color: "#7dd3fc" }}>{sound.ipa}</span>
              </button>
            );
          })}
        </div>

        {/* Selected Sound Breakdown + Letter Writing & Trace Studio */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
            gap: "14px",
            background: "rgba(6, 15, 30, 0.85)",
            border: "1.5px solid rgba(212, 175, 55, 0.55)",
            borderRadius: "12px",
            padding: "14px"
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px", flexWrap: "wrap" }}>
              <div>
                <span style={{ fontSize: "10px", fontWeight: 900, color: "#fbbf24", letterSpacing: "0.6px" }}>
                  SOUND #{activePhonic.id} OF 42 • GROUP {activePhonic.group} • {activePhonicsCountry.flag} {activePhonicsCountry.countryName.toUpperCase()}
                </span>
                <div style={{ fontSize: "26px", fontWeight: 900, color: "#ffffff", lineHeight: 1.15, marginTop: "2px" }}>
                  {activePhonic.upper} <span style={{ color: "#7dd3fc" }}>{activePhonic.grapheme}</span>{" "}
                  <span style={{ fontSize: "15px", color: "#fde68a" }}>{activePhonic.ipa}</span>
                </div>
              </div>
              <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                <button
                  type="button"
                  data-no-hud-notice="true"
                  data-testid="phonics-exact-sound-btn"
                  onClick={() => {
                    const locale = activePhonicsCountry.languages.find((l) => l.speechLocale.startsWith("en"))?.speechLocale || "en-GB";
                    playJollyPhonicsExactSound(activePhonic, { withWord: false, locale });
                  }}
                  style={{
                    padding: "8px 13px",
                    borderRadius: "8px",
                    background: "linear-gradient(135deg, #059669, #10b981)",
                    border: "1px solid #6ee7b7",
                    color: "#ffffff",
                    fontWeight: 800,
                    fontSize: "12px",
                    cursor: "pointer"
                  }}
                >
                  🔊 Exact Sound ({activePhonic.ipa})
                </button>
                <button
                  type="button"
                  data-no-hud-notice="true"
                  data-testid="phonics-sound-word-btn"
                  onClick={() => {
                    const locale = activePhonicsCountry.languages.find((l) => l.speechLocale.startsWith("en"))?.speechLocale || "en-GB";
                    playJollyPhonicsExactSound(activePhonic, { withWord: true, locale });
                  }}
                  style={{
                    padding: "8px 13px",
                    borderRadius: "8px",
                    background: "linear-gradient(135deg, #0284c7, #0369a1)",
                    border: "1px solid #7dd3fc",
                    color: "#ffffff",
                    fontWeight: 800,
                    fontSize: "12px",
                    cursor: "pointer"
                  }}
                >
                  🗣️ Sound + Words
                </button>
              </div>
            </div>

            <div style={{ fontSize: "12.5px", color: "#e2e8f0", lineHeight: 1.5 }}>
              <div>
                <strong style={{ color: "#fde68a" }}>Exact Phonetic Sound (Not Letter Name):</strong>{" "}
                <span style={{ color: "#6ee7b7", fontWeight: 800 }}>{activePhonic.soundCue}</span>
              </div>
              <div><strong style={{ color: "#6ee7b7" }}>Jolly Phonics Action:</strong> {activePhonic.action}</div>
              <div style={{ marginTop: "4px" }}>
                <strong style={{ color: "#7dd3fc" }}>How to Write:</strong> {activePhonic.howToWrite}
              </div>
            </div>

            <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginTop: "2px" }}>
              {activePhonic.examples.map((word) => (
                <button
                  key={word}
                  type="button"
                  data-no-hud-notice="true"
                  onClick={() => speakPhonicsOrLetter(word, "en-GB", 0.94)}
                  style={{
                    padding: "5px 11px",
                    borderRadius: "999px",
                    background: "rgba(16, 185, 129, 0.18)",
                    border: "1px solid rgba(52, 211, 153, 0.5)",
                    color: "#a7f3d0",
                    fontSize: "12px",
                    fontWeight: 800,
                    cursor: "pointer"
                  }}
                >
                  🔊 {word}
                </button>
              ))}
            </div>
          </div>

          <LetterWritingPracticePad
            displayGlyph={activePhonic.grapheme.replace(/\s*\(.*\)/, "")}
            direction="ltr"
            label={`"${activePhonic.grapheme}"`}
            howToWrite={activePhonic.howToWrite}
          />
        </div>
      </div>
    );
  }

  // MODE: COUNTRY & LANGUAGE ALPHABETS + SOUNDS + WRITING GUIDE
  return (
    <div
      data-testid="country-alphabets-studio"
      style={{
        background: "rgba(15, 23, 42, 0.85)",
        border: "1.5px solid rgba(212, 175, 55, 0.6)",
        borderRadius: "14px",
        padding: "16px",
        display: "flex",
        flexDirection: "column",
        gap: "14px"
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "10px" }}>
        <div>
          <h3 style={{ margin: 0, fontSize: "15px", fontWeight: 900, color: "#fde68a" }}>
            🌍 Country &amp; Language Alphabets, Letter Sounds &amp; Writing Guide ({COUNTRY_ALPHABETS_CATALOG.length} Countries)
          </h3>
          <p style={{ margin: "3px 0 0", fontSize: "11.5px", color: "#cbd5e1" }}>
            Select any country on the system and its language to learn every letter sound and practice how each alphabet is written.
          </p>
        </div>
        <button
          type="button"
          data-no-hud-notice="true"
          onClick={handlePlayAllAlphabet}
          style={{
            padding: "7px 14px",
            borderRadius: "8px",
            background: isAutoPlaying ? "#dc2626" : "linear-gradient(135deg, #10b981, #059669)",
            border: "1px solid rgba(255,255,255,0.3)",
            color: "#ffffff",
            fontWeight: 800,
            fontSize: "12px",
            cursor: "pointer"
          }}
        >
          {isAutoPlaying ? "⏹ Stop Alphabet Audio" : "▶ Play Full Alphabet"}
        </button>
      </div>

      {/* Country Picker Grid */}
      <div>
        <div style={{ fontSize: "11px", fontWeight: 800, color: "#fbbf24", textTransform: "uppercase", marginBottom: "6px" }}>
          1. Select Country from System Registry ({COUNTRY_ALPHABETS_CATALOG.length} Countries):
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
          {COUNTRY_ALPHABETS_CATALOG.map((c) => {
            const active = c.countryCode === activeCountry.countryCode;
            return (
              <button
                key={c.countryCode}
                type="button"
                data-no-hud-notice="true"
                data-testid={`alphabet-country-btn-${c.countryCode}`}
                onClick={() => {
                  stopAutoPlay();
                  setSelectedCountryCode(c.countryCode);
                  setSelectedLangId(c.languages[0].id);
                  setSelectedLetterIdx(0);
                }}
                style={{
                  padding: "6px 10px",
                  borderRadius: "8px",
                  border: active ? "2px solid #fbbf24" : "1px solid rgba(212, 175, 55, 0.3)",
                  background: active ? "linear-gradient(135deg, #d4af37, #92400e)" : "rgba(8, 24, 51, 0.85)",
                  color: active ? "#1c1008" : "#f1f5f9",
                  fontSize: "11.5px",
                  fontWeight: 800,
                  cursor: "pointer"
                }}
              >
                {c.flag} {c.countryName}
              </button>
            );
          })}
        </div>
      </div>

      {/* Language Picker for Selected Country */}
      <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "center" }}>
        <span style={{ fontSize: "11px", fontWeight: 800, color: "#7dd3fc" }}>
          2. {activeCountry.flag} {activeCountry.countryName} Languages:
        </span>
        {activeCountry.languages.map((lang) => {
          const active = lang.id === activeLanguage.id;
          return (
            <button
              key={lang.id}
              type="button"
              data-no-hud-notice="true"
              onClick={() => {
                stopAutoPlay();
                setSelectedLangId(lang.id);
                setSelectedLetterIdx(0);
              }}
              style={{
                padding: "6px 12px",
                borderRadius: "999px",
                border: active ? "1.5px solid #38bdf8" : "1px solid rgba(148, 163, 184, 0.35)",
                background: active ? "rgba(56, 189, 248, 0.25)" : "rgba(30, 41, 59, 0.85)",
                color: active ? "#ffffff" : "#cbd5e1",
                fontSize: "11.5px",
                fontWeight: 800,
                cursor: "pointer"
              }}
            >
              {lang.name} ({lang.alphabet.length})
            </button>
          );
        })}
      </div>

      {/* Script Meta Note */}
      <div style={{ fontSize: "12px", color: "#e2e8f0", background: "rgba(6, 15, 30, 0.72)", border: "1px solid rgba(56, 189, 248, 0.32)", borderRadius: "9px", padding: "8px 12px" }}>
        <strong style={{ color: "#7dd3fc" }}>{activeLanguage.script}</strong> • Direction:{" "}
        <strong style={{ color: "#fde68a" }}>{activeLanguage.direction === "rtl" ? "Right → Left (RTL)" : "Left → Right (LTR)"}</strong>
        <div style={{ marginTop: "3px", color: "#cbd5e1", fontSize: "11.5px" }}>{activeLanguage.note}</div>
      </div>

      {/* Alphabet Letter Tiles */}
      <div
        dir={activeLanguage.direction}
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(74px, 1fr))",
          gap: "7px",
          maxHeight: "200px",
          overflowY: "auto",
          padding: "2px"
        }}
      >
        {activeLanguage.alphabet.map((item, idx) => {
          const active = idx === selectedLetterIdx;
          return (
            <button
              key={`${activeLanguage.id}-${idx}`}
              type="button"
              data-no-hud-notice="true"
              onClick={() => {
                stopAutoPlay();
                setSelectedLetterIdx(idx);
                playCountryAlphabetExactSound(item, activeLanguage, { withWord: false });
              }}
              style={{
                padding: "8px 6px",
                borderRadius: "10px",
                border: active ? "2px solid #fbbf24" : "1px solid rgba(212, 175, 55, 0.28)",
                background: active
                  ? "linear-gradient(135deg, rgba(212, 175, 55, 0.32), rgba(16, 185, 129, 0.25))"
                  : "rgba(8, 24, 51, 0.85)",
                color: "#fffbeb",
                cursor: "pointer",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: "2px"
              }}
            >
              <strong style={{ fontSize: "17px", color: active ? "#fde68a" : "#ffffff" }}>{item.letter}</strong>
              <span style={{ fontSize: "9.5px", color: "#93c5fd", maxWidth: "100%", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {item.name}
              </span>
            </button>
          );
        })}
      </div>

      {/* Selected Letter Sound + Writing Guide + Interactive Practice Canvas */}
      {activeLetter && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
            gap: "14px",
            background: "rgba(6, 15, 30, 0.85)",
            border: "1.5px solid rgba(212, 175, 55, 0.55)",
            borderRadius: "12px",
            padding: "14px"
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
              <div>
                <span style={{ fontSize: "10px", fontWeight: 900, color: "#fbbf24" }}>
                  {activeCountry.flag} {activeLanguage.name.toUpperCase()} • LETTER {selectedLetterIdx + 1} OF {activeLanguage.alphabet.length}
                </span>
                <div style={{ fontSize: "28px", fontWeight: 900, color: "#ffffff", lineHeight: 1.15, marginTop: "2px" }}>
                  {activeLetter.letter} <span style={{ fontSize: "14px", color: "#7dd3fc" }}>({activeLetter.name})</span>
                </div>
              </div>
              <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                <button
                  type="button"
                  data-no-hud-notice="true"
                  data-testid="alphabet-exact-sound-btn"
                  onClick={() => playCountryAlphabetExactSound(activeLetter, activeLanguage, { withWord: false })}
                  style={{
                    padding: "8px 13px",
                    borderRadius: "8px",
                    background: "linear-gradient(135deg, #059669, #10b981)",
                    border: "1px solid #6ee7b7",
                    color: "#ffffff",
                    fontWeight: 800,
                    fontSize: "12px",
                    cursor: "pointer"
                  }}
                >
                  🔊 Exact Sound
                </button>
                <button
                  type="button"
                  data-no-hud-notice="true"
                  data-testid="alphabet-sound-word-btn"
                  onClick={() => playCountryAlphabetExactSound(activeLetter, activeLanguage, { withWord: true })}
                  style={{
                    padding: "8px 13px",
                    borderRadius: "8px",
                    background: "linear-gradient(135deg, #0284c7, #0369a1)",
                    border: "1px solid #7dd3fc",
                    color: "#ffffff",
                    fontWeight: 800,
                    fontSize: "12px",
                    cursor: "pointer"
                  }}
                >
                  🗣️ Sound + Word
                </button>
              </div>
            </div>

            <div style={{ fontSize: "12.5px", color: "#e2e8f0", lineHeight: 1.55 }}>
              <div><strong style={{ color: "#fde68a" }}>Exact Letter Sound (Not English Letter Name):</strong> {activeLetter.sound}</div>
              <div><strong style={{ color: "#6ee7b7" }}>Native Example Word:</strong> {activeLetter.example}</div>
              <div style={{ marginTop: "4px" }}>
                <strong style={{ color: "#7dd3fc" }}>How {activeCountry.countryName} ({activeLanguage.name}) Writes This Letter:</strong> {activeLetter.howToWrite}
              </div>
            </div>
          </div>

          <LetterWritingPracticePad
            displayGlyph={activeLetter.glyph || activeLetter.letter}
            direction={activeLanguage.direction}
            label={`${activeLetter.letter} (${activeLanguage.name})`}
            howToWrite={activeLetter.howToWrite}
          />
        </div>
      )}
    </div>
  );
}
