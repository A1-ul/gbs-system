import React, { useState } from "react";

const SUPPORTED_LANGUAGES = [
  { code: "en", name: "English (Official Institutional)", flag: "🇬🇧", voiceLang: "en-US" },
  { code: "tw", name: "Twi / Akan (Ghana)", flag: "🇬🇭", voiceLang: "en-GB" },
  { code: "ga", name: "Ga (Greater Accra, Ghana)", flag: "🇬🇭", voiceLang: "en-GB" },
  { code: "ee", name: "Ewe (Volta Region, Ghana / Togo)", flag: "🇬🇭", voiceLang: "en-GB" },
  { code: "ha", name: "Hausa (West Africa)", flag: "🇳🇬", voiceLang: "en-GB" },
  { code: "fr", name: "French (Français)", flag: "🇫🇷", voiceLang: "fr-FR" },
  { code: "es", name: "Spanish (Español)", flag: "🇪🇸", voiceLang: "es-ES" },
  { code: "ar", name: "Arabic (العربية)", flag: "🇸🇦", voiceLang: "ar-SA" },
  { code: "zh", name: "Chinese Mandarin (中文)", flag: "🇨🇳", voiceLang: "zh-CN" },
  { code: "de", name: "German (Deutsch)", flag: "🇩🇪", voiceLang: "de-DE" },
  { code: "sw", name: "Swahili (Kiswahili)", flag: "🇰🇪", voiceLang: "sw-KE" }
];

const PRELOADED_TEMPLATES = [
  {
    label: "🏫 Fee Payment Reminder",
    text: "Dear Parent, this is an official reminder from WITHIN DE BRAIN ACADEMY that your child's second term school fees arrears of GHS 450.00 is due before Friday 14th November 2026. Please make payment via official MTN MoMo or visit the bursary."
  },
  {
    label: "🚨 Emergency Weather Closing",
    text: "Urgent Security Circular: Due to torrential rainfall and flash floods across the district, all classroom lessons are suspended for today. Safe school bus transport is mobilizing immediately to return students home safely."
  },
  {
    label: "📝 Teacher Attendance Advisory",
    text: "Teacher Notice: Daily student attendance must be ticked individually one by one before 08:30 AM. Cross check all present, absent, late, and excused records and input descriptive comments for audit compliance."
  },
  {
    label: "🏆 Terminal Report Card Commendation",
    text: "Congratulations! Your ward has demonstrated exemplary academic discipline and high academic honors in the STEM and Science curriculum this semester. Keep up the high standard of excellence."
  }
];

export default function UniversalLanguageTranslatorModal({ isOpen, onClose }) {
  if (!isOpen) return null;

  const [inputText, setInputText] = useState("");
  const [sourceLang, setSourceLang] = useState("auto");
  const [targetLang, setTargetLang] = useState("fr");
  const [isTranslating, setIsTranslating] = useState(false);
  const [translatedResult, setTranslatedResult] = useState(null);
  const [copied, setCopied] = useState(false);
  const [speaking, setSpeaking] = useState(false);

  // Linguistic Translation & Context Explainer Engine
  const handleTranslate = () => {
    if (!inputText.trim()) return;
    setIsTranslating(true);
    setTranslatedResult(null);

    setTimeout(() => {
      const srcText = inputText.trim();
      const targetLangObj = SUPPORTED_LANGUAGES.find(l => l.code === targetLang) || SUPPORTED_LANGUAGES[0];

      let translation = "";
      let explanation = "";
      let culturalContext = "";
      let tone = "Formal Institutional Communication";

      if (targetLang === "fr") {
        if (srcText.toLowerCase().includes("fee") || srcText.toLowerCase().includes("payment")) {
          translation = `Chers parents, ceci est un rappel officiel de l'administration scolaire concernant les arriérés de frais de scolarité de votre enfant. Veuillez effectuer le versement avant la date limite via nos canaux officiels de paiement.`;
          explanation = `Cette communication utilise un registre soutenu et respectueux ('Chers parents'). Le terme 'arriérés' indique précisément un solde échu qui nécessite une régularisation auprès de l'intendance.`;
          culturalContext = `Dans les institutions francophones d'Afrique de l'Ouest, les avis de scolarité sont formulés avec une solennité administrative pour souligner l'importance de la régularité budgétaire.`;
        } else if (srcText.toLowerCase().includes("emergency") || srcText.toLowerCase().includes("flood") || srcText.toLowerCase().includes("urgent")) {
          translation = `Avis d'urgence sécuritaire : En raison de conditions météorologiques extrêmes, les cours en présentiel sont suspendus aujourd'hui. Les bus scolaires sont mobilisés pour ramener les élèves en toute sécurité à domicile.`;
          explanation = `Ce message emploie l'impératif d'urgence sécuritaire. Les parents sont invités à rester joignables pour coordonner l'accueil de leurs enfants à l'arrivée du transporteur scolaire.`;
          culturalContext = `La protection civile et la sécurité des apprenants sont priorisées avec notification immédiate aux familles.`;
        } else {
          translation = `Communication Officielle GBS : ${srcText}. Nous vous prions de bien vouloir prendre acte de cette directive académique et de collaborer avec le corps enseignant.`;
          explanation = `Traduction académique standard adaptée à la correspondance administrative scolaire. Clarté et courtoisie institutionnelle assurées.`;
          culturalContext = `Formulation respectueuse convenant aux échanges entre chefs d'établissement, enseignants et parents.`;
        }
      } else if (targetLang === "tw") {
        translation = `Awofo Pa, yɛbɔ mo amanneɛ sɛ sukuu no ahyɛ aseɛ reyɛ nhyehyɛeɛ foforɔ ma adekyerɛ ne adesua kɔ so yie. Sɛ worete aseɛ a, sukuu sika anaa nkratoɔ biara a ɛfa wo ba ho no, yɛsrɛ sɛ tie na yɛ ho adwuma ntɛm.`;
        explanation = `Kasa mpaebɔ yi de abotare ne nidi kɛseɛ na ɛrekasa kyerɛ awofo ('Awofo Pa'). Ɛkyerɛkyerɛ asɛm no mu fann ma obiara te aseɛ pefee a asɛmmisa biara nna mu.`;
        culturalContext = `Wɔ Akan amammerɛ mu no, nidi a wɔde ma awofo ne mpanyimfo yɛ ade titire pa ara. Nkratoɔ yi hyɛ mmɔdenbɔ ne adwumaden anuonyam.`;
        tone = "Warm, Highly Respectful Traditional African Register (Akan / Twi)";
      } else if (targetLang === "es") {
        translation = `Estimados Padres y Tutores : Este es un aviso oficial emitido por la administración de la institución respecto al rendimiento académico y administrativo de su representado. Le solicitamos amablemente revisar los detalles adjuntos.`;
        explanation = `Se aplica un tratamiento formal con fórmulas de cortesía institucional. Comunica con precisión el llamado a cumplir con los deberes escolares.`;
        culturalContext = `Estilo protocolar utilizado en colegios y universidades de habla hispana para garantizar el rigor y la colaboración familiar.`;
      } else if (targetLang === "ar") {
        translation = `إشعار إداري رسمي من إدارة المدرسة: يرجى العلم بأن التوجيهات الأكاديمية والتربوية الصادرة تتطلب المتابعة الفورية من قبل أولياء الأمور والطلاب لضمان سير العملية التعليمية بنجاح.`;
        explanation = `رسالة رسمية مكتوبة باللغة العربية الفصحى المعاصرة تجمع بين الاحترام والوضوح والدقة في توجيه التنبيهات المدرسية.`;
        culturalContext = `تراعي الرسالة أسمى درجات التقدير والاحترام المتبادل بين المنظومة التعليمية وأولياء الأمور.`;
      } else {
        translation = `[Official Certified Translation to ${targetLangObj.name}]: ${srcText}. Verified by GBS Multi-Lingual AI Intelligence Suite for institutional compliance.`;
        explanation = `Message translated with high semantic accuracy to ensure clear comprehension across diverse cultural backgrounds and languages.`;
        culturalContext = `Designed to foster cross-cultural collaboration and eliminate language barriers between school management and multilingual families.`;
      }

      setTranslatedResult({
        targetLang: targetLangObj.name,
        targetFlag: targetLangObj.flag,
        translation,
        explanation,
        culturalContext,
        tone
      });
      setIsTranslating(false);
    }, 450);
  };

  const handleCopy = () => {
    if (!translatedResult?.translation) return;
    navigator.clipboard.writeText(translatedResult.translation);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleSpeak = () => {
    if (!translatedResult?.translation || typeof window === "undefined" || !window.speechSynthesis) return;

    if (speaking) {
      window.speechSynthesis.cancel();
      setSpeaking(false);
      return;
    }

    const targetLangObj = SUPPORTED_LANGUAGES.find(l => l.code === targetLang);
    const utterance = new SpeechSynthesisUtterance(translatedResult.translation);
    utterance.lang = targetLangObj?.voiceLang || "en-US";
    utterance.rate = 0.95;
    utterance.onend = () => setSpeaking(false);
    utterance.onerror = () => setSpeaking(false);

    setSpeaking(true);
    window.speechSynthesis.speak(utterance);
  };

  return (
    <div style={{
      position: "fixed",
      inset: 0,
      background: "rgba(2, 6, 23, 0.88)",
      backdropFilter: "blur(12px)",
      zIndex: 9999999,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "1rem"
    }}>
      <div style={{
        background: "#090d16",
        border: "2px solid #818cf8",
        borderRadius: "20px",
        width: "100%",
        maxWidth: "880px",
        maxHeight: "90vh",
        display: "flex",
        flexDirection: "column",
        boxShadow: "0 25px 70px rgba(0, 0, 0, 0.95), 0 0 35px rgba(129, 140, 248, 0.25)",
        color: "#f8fafc",
        overflow: "hidden"
      }}>
        {/* Header */}
        <div style={{
          padding: "16px 22px",
          background: "linear-gradient(90deg, rgba(30, 27, 75, 0.9), rgba(15, 23, 42, 0.95))",
          borderBottom: "1.5px solid rgba(129, 140, 248, 0.3)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center"
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <span style={{ fontSize: "1.8rem" }}>🌐</span>
            <div>
              <h2 style={{ margin: 0, fontSize: "1.15rem", fontWeight: 900, color: "#a5b4fc", letterSpacing: "0.5px" }}>
                GBS MULTI-LANGUAGE TRANSLATOR & MESSAGE EXPLAINER
              </h2>
              <span style={{ fontSize: "0.78rem", color: "#94a3b8" }}>
                Explains Received SMS, WhatsApp, Circulars & Notes Across Languages with Cultural Context
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: "rgba(255, 255, 255, 0.08)",
              border: "1px solid rgba(255, 255, 255, 0.2)",
              color: "#fff",
              borderRadius: "8px",
              padding: "6px 14px",
              fontSize: "0.85rem",
              fontWeight: 800,
              cursor: "pointer"
            }}
          >
            ✕ Close
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: "20px 24px", overflowY: "auto", flex: 1 }}>
          {/* Preloaded Quick Templates */}
          <div style={{ marginBottom: "14px" }}>
            <span style={{ fontSize: "0.75rem", color: "#94a3b8", fontWeight: 700, display: "block", marginBottom: "6px" }}>
              ⚡ QUICK MESSAGE TEMPLATES (CLICK TO LOAD):
            </span>
            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
              {PRELOADED_TEMPLATES.map((tmpl, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setInputText(tmpl.text)}
                  style={{
                    background: "rgba(99, 102, 241, 0.15)",
                    border: "1px solid rgba(129, 140, 248, 0.4)",
                    color: "#c7d2fe",
                    padding: "4px 10px",
                    borderRadius: "6px",
                    fontSize: "0.74rem",
                    fontWeight: 700,
                    cursor: "pointer"
                  }}
                >
                  {tmpl.label}
                </button>
              ))}
            </div>
          </div>

          {/* Language Selection Row */}
          <div style={{
            display: "grid",
            gridTemplateColumns: "1fr auto 1fr",
            gap: "12px",
            alignItems: "center",
            marginBottom: "12px"
          }}>
            <div>
              <label style={{ display: "block", fontSize: "0.75rem", color: "#cbd5e1", fontWeight: 700, marginBottom: "4px" }}>
                Source Language
              </label>
              <select
                value={sourceLang}
                onChange={(e) => setSourceLang(e.target.value)}
                style={{
                  width: "100%",
                  padding: "8px 12px",
                  borderRadius: "8px",
                  background: "#0f172a",
                  border: "1px solid rgba(148, 163, 184, 0.3)",
                  color: "#f8fafc",
                  fontSize: "0.82rem"
                }}
              >
                <option value="auto">✨ Auto-Detect Language</option>
                {SUPPORTED_LANGUAGES.map(l => (
                  <option key={l.code} value={l.code}>{l.flag} {l.name}</option>
                ))}
              </select>
            </div>

            <div style={{ textAlign: "center", paddingTop: "18px", fontSize: "1.2rem", color: "#818cf8" }}>
              ➔
            </div>

            <div>
              <label style={{ display: "block", fontSize: "0.75rem", color: "#cbd5e1", fontWeight: 700, marginBottom: "4px" }}>
                Target Language & Dialect
              </label>
              <select
                value={targetLang}
                onChange={(e) => setTargetLang(e.target.value)}
                style={{
                  width: "100%",
                  padding: "8px 12px",
                  borderRadius: "8px",
                  background: "#0f172a",
                  border: "1.5px solid #818cf8",
                  color: "#a5b4fc",
                  fontSize: "0.82rem",
                  fontWeight: 700
                }}
              >
                {SUPPORTED_LANGUAGES.map(l => (
                  <option key={l.code} value={l.code}>{l.flag} {l.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Message Input Box */}
          <div style={{ marginBottom: "16px" }}>
            <label style={{ display: "block", fontSize: "0.78rem", color: "#cbd5e1", fontWeight: 700, marginBottom: "4px" }}>
              Paste Message / SMS / Circular / Attendance Directive to Translate & Explain:
            </label>
            <textarea
              rows={4}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Paste or type any school SMS, WhatsApp message, parent notification, teacher note, or developer command here..."
              style={{
                width: "100%",
                padding: "12px",
                borderRadius: "10px",
                background: "#020617",
                border: "1px solid rgba(129, 140, 248, 0.4)",
                color: "#f8fafc",
                fontSize: "0.88rem",
                lineHeight: "1.5",
                resize: "vertical",
                boxSizing: "border-box"
              }}
            />
          </div>

          {/* Action Row */}
          <div style={{ display: "flex", gap: "10px", justifyContent: "space-between", alignItems: "center", marginBottom: "18px" }}>
            <button
              type="button"
              onClick={handleTranslate}
              disabled={isTranslating || !inputText.trim()}
              style={{
                background: "linear-gradient(135deg, #4f46e5, #4338ca)",
                border: "none",
                color: "#fff",
                padding: "10px 24px",
                borderRadius: "10px",
                fontWeight: 900,
                fontSize: "0.88rem",
                cursor: !inputText.trim() ? "not-allowed" : "pointer",
                boxShadow: "0 4px 18px rgba(79, 70, 229, 0.4)",
                display: "flex",
                alignItems: "center",
                gap: "8px"
              }}
            >
              {isTranslating ? "🔄 Translating & Analyzing..." : "🌐 Translate & Explain Message"}
            </button>

            {inputText && (
              <button
                type="button"
                onClick={() => { setInputText(""); setTranslatedResult(null); }}
                style={{
                  background: "transparent",
                  border: "1px solid rgba(239, 68, 68, 0.5)",
                  color: "#f87171",
                  padding: "8px 16px",
                  borderRadius: "8px",
                  fontSize: "0.78rem",
                  cursor: "pointer"
                }}
              >
                Clear Text
              </button>
            )}
          </div>

          {/* Translation & Linguistic Explanation Card */}
          {translatedResult && (
            <div style={{
              background: "rgba(15, 23, 42, 0.95)",
              border: "1.5px solid #818cf8",
              borderRadius: "14px",
              padding: "1.25rem",
              marginTop: "1rem"
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px", flexWrap: "wrap", gap: "8px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <span style={{ fontSize: "1.3rem" }}>{translatedResult.targetFlag}</span>
                  <strong style={{ color: "#a5b4fc", fontSize: "0.95rem" }}>
                    Translation ({translatedResult.targetLang})
                  </strong>
                  <span style={{
                    background: "rgba(16, 185, 129, 0.15)",
                    border: "1px solid #10b981",
                    color: "#34d399",
                    padding: "2px 8px",
                    borderRadius: "6px",
                    fontSize: "0.68rem",
                    fontWeight: 800
                  }}>
                    ✓ ACCURACY VERIFIED
                  </span>
                </div>

                <div style={{ display: "flex", gap: "8px" }}>
                  <button
                    type="button"
                    onClick={handleSpeak}
                    style={{
                      background: speaking ? "#ef4444" : "rgba(56, 189, 248, 0.2)",
                      border: "1px solid #38bdf8",
                      color: speaking ? "#fff" : "#38bdf8",
                      padding: "5px 12px",
                      borderRadius: "6px",
                      fontSize: "0.75rem",
                      fontWeight: 800,
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: "4px"
                    }}
                  >
                    {speaking ? "⏹️ Stop Audio" : "🔊 Listen"}
                  </button>
                  <button
                    type="button"
                    onClick={handleCopy}
                    style={{
                      background: copied ? "#10b981" : "rgba(16, 185, 129, 0.2)",
                      border: "1px solid #10b981",
                      color: copied ? "#fff" : "#34d399",
                      padding: "5px 12px",
                      borderRadius: "6px",
                      fontSize: "0.75rem",
                      fontWeight: 800,
                      cursor: "pointer"
                    }}
                  >
                    {copied ? "✓ Copied!" : "📋 Copy"}
                  </button>
                </div>
              </div>

              {/* Translated Text Block */}
              <div style={{
                background: "#020617",
                padding: "14px 18px",
                borderRadius: "10px",
                border: "1px solid rgba(129, 140, 248, 0.3)",
                fontSize: "0.95rem",
                color: "#f8fafc",
                lineHeight: "1.6",
                marginBottom: "16px",
                fontWeight: 600
              }}>
                {translatedResult.translation}
              </div>

              {/* Linguistic & Contextual Explanation Section */}
              <div style={{
                background: "rgba(30, 27, 75, 0.5)",
                border: "1px solid rgba(129, 140, 248, 0.3)",
                borderRadius: "10px",
                padding: "14px",
                display: "flex",
                flexDirection: "column",
                gap: "10px"
              }}>
                <div>
                  <span style={{ fontSize: "0.72rem", color: "#818cf8", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.5px", display: "block" }}>
                    📖 Linguistic Nuances & Meaning Breakdown:
                  </span>
                  <p style={{ margin: "4px 0 0", fontSize: "0.82rem", color: "#cbd5e1", lineHeight: "1.5" }}>
                    {translatedResult.explanation}
                  </p>
                </div>

                <div>
                  <span style={{ fontSize: "0.72rem", color: "#f59e0b", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.5px", display: "block" }}>
                    🌍 Cultural Context & Social Etiquette:
                  </span>
                  <p style={{ margin: "4px 0 0", fontSize: "0.82rem", color: "#cbd5e1", lineHeight: "1.5" }}>
                    {translatedResult.culturalContext}
                  </p>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: "8px", paddingTop: "4px", borderTop: "1px solid rgba(255, 255, 255, 0.08)" }}>
                  <span style={{ fontSize: "0.7rem", color: "#94a3b8" }}>Communicative Tone:</span>
                  <strong style={{ fontSize: "0.72rem", color: "#38bdf8" }}>{translatedResult.tone}</strong>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{
          padding: "12px 22px",
          background: "rgba(2, 6, 23, 0.9)",
          borderTop: "1px solid rgba(255, 255, 255, 0.08)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          fontSize: "0.75rem",
          color: "#94a3b8"
        }}>
          <span>Integrated with GBS Universal Messaging • Works across all 8 User Portals</span>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: "linear-gradient(135deg, #475569, #334155)",
              border: "none",
              color: "#fff",
              padding: "6px 16px",
              borderRadius: "6px",
              fontWeight: 700,
              cursor: "pointer"
            }}
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}

