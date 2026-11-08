import React, { useState, useEffect } from "react";

export const SUPPORTED_LANGUAGES = [
  { code: "GH", name: "Ghana (English / Twi / Ga / Ewe)", lang: "en", flag: "🇬🇭", greeting: "Akwaaba! Welcome to GBS School System" },
  { code: "NG", name: "Nigeria (English / Yoruba / Hausa / Igbo)", lang: "en-ng", flag: "🇳🇬", greeting: "E Kaabo / Sannu / Nnoo! Welcome to GBS School System" },
  { code: "FR", name: "France / Côte d'Ivoire / Sénégal (Français)", lang: "fr", flag: "🇫🇷", greeting: "Bienvenue sur le système de gestion scolaire GBS" },
  { code: "ES", name: "España / Latin America (Español)", lang: "es", flag: "🇪🇸", greeting: "Bienvenido al Sistema de Gestión Escolar GBS" },
  { code: "KE", name: "Kenya / East Africa (Kiswahili / English)", lang: "sw", flag: "🇰🇪", greeting: "Karibu kwenye Mfumo wa Usimamizi wa Shule ya GBS" },
  { code: "ZA", name: "South Africa (isiZulu / English / Afrikaans)", lang: "zu", flag: "🇿🇦", greeting: "Wamkelekile / Sawubona! Welcome to GBS School System" },
  { code: "SA", name: "Saudi Arabia / Middle East (العربية)", lang: "ar", flag: "🇸🇦", greeting: "مرحباً بكم في نظام إدارة مدرسة GBS" },
  { code: "DE", name: "Deutschland (Deutsch)", lang: "de", flag: "🇩🇪", greeting: "Willkommen beim GBS Schulverwaltungssystem" },
  { code: "CN", name: "中国 (简体中文 - Mandarin)", lang: "zh", flag: "🇨🇳", greeting: "欢迎使用 GBS 智慧学校综合管理系统" },
  { code: "PT", name: "Portugal / Brasil (Português)", lang: "pt", flag: "🇵🇹", greeting: "Bem-vindo ao Sistema de Gestão Escolar GBS" },
  { code: "IN", name: "India (हिन्दी / English)", lang: "hi", flag: "🇮🇳", greeting: "GBS स्कूल प्रबंधन प्रणाली में आपका स्वागत है" },
  { code: "GB", name: "United Kingdom (English)", lang: "en-gb", flag: "🇬🇧", greeting: "Welcome to GBS Enterprise School System" },
  { code: "US", name: "United States (English)", lang: "en-us", flag: "🇺🇸", greeting: "Welcome to GBS Enterprise School Platform" }
];

export const EDUCATIONAL_TERMS_DICTIONARY = {
  "Fee Arrears": {
    category: "Finance & Accounts",
    en: "The remaining unpaid tuition or school fees owed by a student for the current or previous academic terms.",
    fr: "Le solde impayé des frais de scolarité dus par l'élève pour les trimestres en cours ou antérieurs.",
    es: "El saldo pendiente de pago de la matrícula adeudado por el estudiante para el período escolar.",
    sw: "Deni lililobaki la ada ya shule ambalo mwanafunzi anadaiwa kwa muhula wa sasa au uliopita.",
    ar: "الرصيد المتبقي غير المسدد من الرسوم الدراسية المستحقة على الطالب للفصل الدراسي.",
    tw: "Ka a aka a ɛsɛ sɛ ɔba no tua ma sukuu no wɔ berɛ a watwa mu anaa seesei deɛ no mu.",
    actionTip: "Visit the Bursar desk or click 'Pay Outstanding Balance' using Mobile Money or Card."
  },
  "Continuous Assessment": {
    category: "Academic & Grading",
    en: "Periodic classroom quizzes, homework, and midterm tests (usually 30-50% of overall terminal grade) combined with final examinations.",
    fr: "Évaluation continue: devoirs, interrogations et contrôles continus réguliers comptant pour la note finale.",
    es: "Evaluación continua acumulativa que incluye tareas y exámenes parciales antes del examen final.",
    sw: "Tathmini inayoendelea ya majaribio ya darasani na kazi za nyumbani kabla ya mtihani wa mwisho.",
    ar: "التقييم المستمر: الاختبارات الدورية والواجبات المنزلية التي تشكل جزءاً من الدرجة النهائية.",
    tw: "Nnwuma ne nsɔhwɛ nkaketnkakete a ɔkyerɛkyerɛfoɔ de ma asuafoɔ wɔ sukuu berɛ no mu nyinaa.",
    actionTip: "Scores are awarded tick-by-tick and student-by-student in the Teacher Dashboard."
  },
  "Lesson Plan Vetting": {
    category: "Curriculum & Governance",
    en: "Official review and formal executive approval by the Headmaster of weekly schemes of work and teaching methodology before instruction begins.",
    fr: "Validation officielle des fiches pédagogiques et des plans de cours par le Proviseur avant enseignement.",
    es: "Revisión formal y aprobación ejecutiva de los planes de lecciones por el director antes de impartir clase.",
    sw: "Uhakiki na idhini rasmi ya Mwalimu Mkuu kwa maandalizi ya masomo ya walimu kabla ya kufundisha.",
    ar: "تدقيق واعتماد خطط الدروس رسمياً من قبل مدير المدرسة قبل تدريسها للطلاب.",
    tw: "Sukuu Panyin no nhwehwɛmu ne ne nsa a ɔde hyɛ akyerɛkyerɛfoɔ adesua nhyehyɛeɛ mu ansa na wɔakɔkyerɛ adeɛ.",
    actionTip: "Hover on any lesson card and click 'View & Inspect Dossier' to review feedback words."
  },
  "Admission Intake Pipeline": {
    category: "Admissions & Enrollment",
    en: "The progressive stages through which prospective applicants pass: inquiry, form submission, vetting, fee settlement, and instant index number generation.",
    fr: "Le processus complet d'admission: candidature en ligne ou sur place, examen du dossier et attribution du matricule.",
    es: "El flujo de admisión de estudiantes: solicitud, validación, matriculación y generación de matrícula oficial.",
    sw: "Mlolongo rasmi wa udahili wa wanafunzi wapya hadi kupata nambari rasmi ya usajili.",
    ar: "مراحل قبول الطلاب: تقديم الطلب، التدقيق الإداري، والالتحاق الفوري مع إصدار رقم القيد.",
    tw: "Kwan a wɔfa so gye asuafoɔ foforɔ: abisadeɛ, nkrataa nkyerɛwee, panyin apene, ne matriculation kɔd.",
    actionTip: "Headmasters can admit walk-in visiting parents immediately using the '+ Walk-In Admission' desk."
  },
  "USSD Payment Prompt": {
    category: "Finance & Mobile Money",
    en: "An instant interactive alert sent to your registered mobile phone requiring you to enter your 4-digit Mobile Money PIN to approve fee payment.",
    fr: "Message USSD interactif reçu sur votre téléphone demandant votre code secret Mobile Money pour valider le paiement.",
    es: "Aviso emergente interactivo USSD en su teléfono para autorizar el cobro con su PIN de dinero móvil.",
    sw: "Ujumbe wa papo hapo kwenye simu unaokutaka uweke PIN ya huduma ya simu kuidhinisha malipo ya ada.",
    ar: "رسالة USSD التفاعلية على هاتفك لتأكيد الدفع عن طريق إدخال الرقم السري لمحفظة الهاتف المحمول.",
    tw: "Nkrasɛm a ɛba wo fon so ntɛm ara a ɛbisa wo kɔd (PIN) sɛ wopene so ma wɔntwe sika no.",
    actionTip: "Keep your mobile phone awake with screen on during the 60-second transaction countdown."
  },
  "SLA Escalation Timer": {
    category: "Campus Operations",
    en: "Service Level Agreement countdown timer for campus engineering repairs (electrical, HVAC, plumbing) before automated alert escalation to Headmaster.",
    fr: "Compte à rebours du délai d'intervention pour les réparations du campus avant alerte au Proviseur.",
    es: "Contador regresivo de tiempo límite para la resolución de órdenes de mantenimiento en las instalaciones.",
    sw: "Saa ya kuhesabu muda kabla ya agizo la matengenezo kuongezwa ngazi ya juu ya utawala.",
    ar: "مؤقت العد التنازلي لاتفاقية مستوى الخدمة لإصلاحات البنية التحتية والمرافق قبل التصعيد للمدير.",
    tw: "Berɛ a wɔde ahyɛ hɔ sɛ wɔmfa nsi nneɛma a abubu wɔ sukuu no mu ansa na wɔabɔ panyin amanneɛbɔ.",
    actionTip: "Technicians resolving tickets immediately update the live count on the Facility Command Center."
  }
};

export default function UniversalLanguageTranslator() {
  const [selectedLang, setSelectedLang] = useState(() => {
    return localStorage.getItem("gbs_system_language") || "GH";
  });
  const [showTranslatorModal, setShowTranslatorModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [customTextToTranslate, setCustomTextToTranslate] = useState("");
  const [translatedResult, setTranslatedResult] = useState(null);
  const [isTranslating, setIsTranslating] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);

  const activeCountry = SUPPORTED_LANGUAGES.find((c) => c.code === selectedLang) || SUPPORTED_LANGUAGES[0];

  useEffect(() => {
    const handleLangSync = (e) => {
      if (e.detail?.code) setSelectedLang(e.detail.code);
    };
    const handleOpenTranslator = (e) => {
      if (e.detail?.text) {
        setCustomTextToTranslate(e.detail.text);
      }
      setShowTranslatorModal(true);
    };

    window.openGBSTranslator = (text = "") => {
      window.dispatchEvent(new CustomEvent("gbs_open_translator", { detail: { text } }));
    };

    window.addEventListener("gbs_language_changed", handleLangSync);
    window.addEventListener("gbs_open_translator", handleOpenTranslator);
    return () => {
      window.removeEventListener("gbs_language_changed", handleLangSync);
      window.removeEventListener("gbs_open_translator", handleOpenTranslator);
    };
  }, []);

  const handleSelectLanguage = (countryCode) => {
    setSelectedLang(countryCode);
    try {
      localStorage.setItem("gbs_system_language", countryCode);
      const match = SUPPORTED_LANGUAGES.find((c) => c.code === countryCode);
      window.dispatchEvent(new CustomEvent("gbs_language_changed", { detail: { code: countryCode, lang: match?.lang } }));
    } catch { }
  };

  const handleTranslateCustom = (e) => {
    e?.preventDefault();
    if (!customTextToTranslate.trim()) return;
    setIsTranslating(true);

    setTimeout(() => {
      const text = customTextToTranslate.trim();
      const lower = text.toLowerCase();
      let translation = "";
      let explanation = "";

      // Match against educational & system message knowledge base
      if (lower.includes("attend") || lower.includes("roll call") || lower.includes("absent") || lower.includes("present") || lower.includes("late")) {
        const twText = "Adesua amanneɛbɔ: Wɔatwerɛ sɛ sukuuni no baeɛ anaa wamma sukuu nnɛ. Sɛ wamma a, kyerɛkyerɛ nea enti a wamma no mu kyerɛ sukuu panyin no ntɛm ara.";
        const frText = "Notification d'assiduité : L'appel quotidien indique la présence ou l'absence de l'élève. En cas d'absence, veuillez fournir un justificatif médical.";
        const esText = "Notificación de asistencia escolar: El registro indica si el estudiante asistió hoy. En caso de ausencia, comuníquese con la dirección escolar.";
        const swText = "Taarifa ya mahudhurio: Ripoti ya leo inaonyesha uwepo au kutokuwepo kwa mwanafunzi. Tafadhali thibitisha sababu kwa uongozi wa shule.";
        const arText = "إشعار الحضور والغياب: يسجل النظام الحضور اليومي للطالب. يرجى تقديم مبرر رسمي في حال الغياب.";

        translation = activeCountry.code === "GH" ? twText :
          activeCountry.code === "FR" ? frText :
            activeCountry.code === "ES" ? esText :
              activeCountry.code === "KE" ? swText :
                activeCountry.code === "SA" ? arText :
                  `Attendance Record Notice: Student roll call status evaluated. Teachers tick scholars student-by-student and auto-save each record immediately.`;

        explanation = `Plain Meaning: This is an official classroom attendance update. It records whether a student was Present, Absent, Late, or Excused for the session. Parents and guardians must take note of their child's classroom participation and provide written or medical excuse if absent.`;
      } else if (lower.includes("fee") || lower.includes("arrear") || lower.includes("debt") || lower.includes("money") || lower.includes("pay") || lower.includes("momo")) {
        const item = EDUCATIONAL_TERMS_DICTIONARY["Fee Arrears"];
        translation = activeCountry.code === "FR" || activeCountry.code === "CI" || activeCountry.code === "SN"
          ? item.fr
          : activeCountry.code === "ES"
            ? item.es
            : activeCountry.code === "KE"
              ? item.sw
              : activeCountry.code === "SA"
                ? item.ar
                : activeCountry.code === "GH"
                  ? item.tw
                  : item.en;
        explanation = `Institutional Finance Meaning: '${text}' relates to financial obligations, term tuition, or verified payment settlements. Parents can settle fee arrears directly using Mobile Money (MTN MoMo, Telecel Cash, AT Money) or Card with automated USSD prompt verification and official stamped receipts.`;
      } else if (lower.includes("dev") || lower.includes("breach") || lower.includes("security") || lower.includes("sentinel") || lower.includes("pin")) {
        translation = activeCountry.code === "GH" ? "Ahobammbɔ amanneɛbɔ: Wɔabɔ kɔkɔ sɛ obi repɛ kwan a ɛmmfata afa so akɔ developer nkyɛn. Wɔbɛfrɛ no abisa no asɛm." :
          activeCountry.code === "FR" ? "Alerte de sécurité système : Tentative d'intrusion détectée sur la console développeur. Surveillance active." :
            activeCountry.code === "ES" ? "Alerta de seguridad: Intento de acceso no autorizado detectado en la consola del desarrollador." :
              activeCountry.code === "SA" ? "تنبيه أمني للنظام: تم رصد محاولة دخول غير مصرح بها إلى لوحة المطورين." :
                "Developer Security & Sentinel Alert: High-level access gate monitoring unauthorized intrusion trials.";

        explanation = `Technical Explanation: Developer Mission Control is protected by root master PIN credentials (0543294615Gab). Any non-developer staff attempting breach is logged in the Intrusion Sentinel and flagged for questioning after 3 failed attempts.`;
      } else if (lower.includes("plan") || lower.includes("note") || lower.includes("scheme") || lower.includes("vet")) {
        const item = EDUCATIONAL_TERMS_DICTIONARY["Lesson Plan Vetting"];
        translation = activeCountry.code === "FR" || activeCountry.code === "CI" || activeCountry.code === "SN"
          ? item.fr
          : activeCountry.code === "ES"
            ? item.es
            : activeCountry.code === "KE"
              ? item.sw
              : activeCountry.code === "SA"
                ? item.ar
                : activeCountry.code === "GH"
                  ? item.tw
                  : item.en;
        explanation = `Curriculum & Governance: Official syllabus forecast prepared by teachers, vetted by the Headmaster with constructive pedagogical remarks.`;
      } else if (lower.includes("admit") || lower.includes("admission") || lower.includes("walk-in") || lower.includes("parent")) {
        const item = EDUCATIONAL_TERMS_DICTIONARY["Admission Intake Pipeline"];
        translation = activeCountry.code === "FR" || activeCountry.code === "CI" || activeCountry.code === "SN"
          ? item.fr
          : activeCountry.code === "ES"
            ? item.es
            : activeCountry.code === "KE"
              ? item.sw
              : activeCountry.code === "SA"
                ? item.ar
                : activeCountry.code === "GH"
                  ? item.tw
                  : item.en;
        explanation = `Admissions Desk: Walk-in parent admissions and online applicants enrolled with instant institutional index numbers.`;
      } else if (lower.includes("score") || lower.includes("exam") || lower.includes("grade") || lower.includes("assessment")) {
        const item = EDUCATIONAL_TERMS_DICTIONARY["Continuous Assessment"];
        translation = activeCountry.code === "FR" || activeCountry.code === "CI" || activeCountry.code === "SN"
          ? item.fr
          : activeCountry.code === "ES"
            ? item.es
            : activeCountry.code === "KE"
              ? item.sw
              : activeCountry.code === "SA"
                ? item.ar
                : activeCountry.code === "GH"
                  ? item.tw
                  : item.en;
        explanation = `Examination & Scoring: Direct individual student-by-student scoring records, terminal grade weighting, and rank classification.`;
      } else {
        // Generic multi-lingual translation response
        const prefix = activeCountry.code === "FR" ? "Traduction et explication scolaire :" :
          activeCountry.code === "ES" ? "Traducción y significado institucional :" :
            activeCountry.code === "KE" ? "Tafsiri ya kielimu na maana :" :
              activeCountry.code === "SA" ? "الترجمة والمعنى المؤسسي :" :
                activeCountry.code === "DE" ? "Schulische Übersetzung & Erklärung :" :
                  activeCountry.code === "CN" ? "综合教育语境翻译与解析：" :
                    activeCountry.code === "GH" ? "Adesua asekyerɛ wɔ Twi ne Engiresi mu :" :
                      "Educational Translation & Context:";

        translation = `${prefix} "${text}" — This is an administrative institutional directive within the GBS School Management System.`;
        explanation = `Plain Meaning & Required Action: Under ${activeCountry.name}, this message communicates standard operational instructions. Recipient should review the message details, confirm their records in the portal, or consult their respective department head for clarification.`;
      }

      setTranslatedResult({ original: text, translation, explanation, country: activeCountry });
      setIsTranslating(false);
    }, 400);
  };

  const handleSpeakText = (text) => {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = activeCountry.lang || "en-US";
    utterance.rate = 0.95;
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    window.speechSynthesis.speak(utterance);
  };

  return (
    <>
      {/* Floating Global Language & Meaning Hub Pill */}
      <div
        style={{
          position: "fixed",
          bottom: "16px",
          left: "16px",
          zIndex: 99990,
          display: "flex",
          alignItems: "center",
          gap: "8px",
          background: "rgba(15, 23, 42, 0.92)",
          backdropFilter: "blur(12px)",
          border: "1px solid rgba(56, 189, 248, 0.4)",
          borderRadius: "30px",
          padding: "6px 14px",
          boxShadow: "0 8px 24px rgba(0, 0, 0, 0.45)",
          color: "#f8fafc",
          fontSize: "0.82rem",
          cursor: "pointer",
          transition: "all 0.2s ease"
        }}
        onClick={() => setShowTranslatorModal(true)}
        title="Multilingual Support: Select Country Official Language & Translate Educational Sentences"
      >
        <span style={{ fontSize: "1.2rem" }}>{activeCountry.flag}</span>
        <span style={{ fontWeight: 800, color: "#38bdf8" }}>{activeCountry.code}</span>
        <span style={{ color: "#94a3b8", fontSize: "0.75rem" }}>•</span>
        <span style={{ color: "#cbd5e1", fontWeight: 600 }}>Language & Meaning 🌐</span>
      </div>

      {/* Multilingual Translation & Explainer Studio Modal */}
      {showTranslatorModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(2, 6, 23, 0.85)",
            backdropFilter: "blur(10px)",
            zIndex: 99999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "1rem"
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowTranslatorModal(false);
          }}
        >
          <div
            style={{
              background: "#090d16",
              border: "1.5px solid rgba(56, 189, 248, 0.5)",
              borderRadius: "18px",
              width: "100%",
              maxWidth: "760px",
              maxHeight: "90vh",
              overflowY: "auto",
              boxShadow: "0 25px 60px rgba(0, 0, 0, 0.8)",
              padding: "1.75rem",
              color: "#f8fafc",
              position: "relative"
            }}
          >
            {/* Modal Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1.25rem", borderBottom: "1px solid rgba(255, 255, 255, 0.1)", paddingBottom: "1rem" }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <span style={{ fontSize: "1.8rem" }}>🌐</span>
                  <div>
                    <h2 style={{ margin: 0, fontSize: "1.3rem", fontWeight: 900, color: "#f8fafc", letterSpacing: "0.5px" }}>
                      MULTILINGUAL SELECTION & SENTENCE TRANSLATOR
                    </h2>
                    <p style={{ margin: "2px 0 0", fontSize: "0.82rem", color: "#94a3b8" }}>
                      Choose your country's official language and get instant translations & explanations for educational terms and sentences.
                    </p>
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowTranslatorModal(false)}
                style={{
                  background: "rgba(239, 68, 68, 0.15)",
                  border: "1px solid rgba(239, 68, 68, 0.4)",
                  color: "#f87171",
                  borderRadius: "8px",
                  padding: "6px 12px",
                  cursor: "pointer",
                  fontWeight: 800
                }}
              >
                ✕ Close
              </button>
            </div>

            {/* Country Official Language Selector */}
            <div style={{ marginBottom: "1.5rem" }}>
              <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 800, color: "#38bdf8", marginBottom: "8px" }}>
                1. SELECT PREFERRED COUNTRY & OFFICIAL LANGUAGE:
              </label>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))", gap: "8px", maxHeight: "170px", overflowY: "auto", padding: "6px", background: "rgba(15, 23, 42, 0.6)", borderRadius: "10px", border: "1px solid rgba(255, 255, 255, 0.08)" }}>
                {SUPPORTED_LANGUAGES.map((c) => (
                  <button
                    key={c.code}
                    type="button"
                    onClick={() => handleSelectLanguage(c.code)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      padding: "8px 10px",
                      borderRadius: "8px",
                      background: selectedLang === c.code ? "linear-gradient(135deg, rgba(2, 132, 199, 0.35), rgba(56, 189, 248, 0.2))" : "rgba(30, 41, 59, 0.5)",
                      border: `1.5px solid ${selectedLang === c.code ? "#38bdf8" : "rgba(255, 255, 255, 0.08)"}`,
                      color: selectedLang === c.code ? "#38bdf8" : "#cbd5e1",
                      fontSize: "0.78rem",
                      fontWeight: selectedLang === c.code ? 800 : 500,
                      cursor: "pointer",
                      textAlign: "left"
                    }}
                  >
                    <span style={{ fontSize: "1.2rem" }}>{c.flag}</span>
                    <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      <strong>{c.code}</strong> - {c.name}
                    </div>
                  </button>
                ))}
              </div>
              <div style={{ marginTop: "6px", fontSize: "0.78rem", color: "#34d399", background: "rgba(16, 185, 129, 0.1)", padding: "6px 10px", borderRadius: "6px", border: "1px solid rgba(16, 185, 129, 0.25)" }}>
                Active Locale Greeting: <em>"{activeCountry.greeting}"</em>
              </div>
            </div>

            {/* Educational Sentence & Meaning Translator Tool */}
            <div style={{ background: "rgba(15, 23, 42, 0.8)", border: "1px solid rgba(56, 189, 248, 0.3)", borderRadius: "14px", padding: "1.25rem", marginBottom: "1.5rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                <label style={{ fontSize: "0.85rem", fontWeight: 800, color: "#38bdf8" }}>
                  2. EDUCATIONAL PHRASE & SENTENCE TRANSLATOR:
                </label>
                <span style={{ fontSize: "0.72rem", color: "#94a3b8" }}>Translates into {activeCountry.name}</span>
              </div>
              <form onSubmit={handleTranslateCustom} style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                <textarea
                  rows={3}
                  value={customTextToTranslate}
                  onChange={(e) => setCustomTextToTranslate(e.target.value)}
                  placeholder="Paste or type any non-understanding educational sentence, fee notice, grading statement, or lesson note term here..."
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    background: "#020617",
                    border: "1px solid rgba(255, 255, 255, 0.15)",
                    borderRadius: "8px",
                    color: "#fff",
                    fontSize: "0.85rem",
                    resize: "vertical"
                  }}
                />
                <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
                  <button
                    type="submit"
                    disabled={isTranslating || !customTextToTranslate.trim()}
                    style={{
                      background: "linear-gradient(135deg, #0284c7, #38bdf8)",
                      border: "none",
                      color: "#0f172a",
                      fontWeight: 900,
                      padding: "8px 18px",
                      borderRadius: "8px",
                      cursor: isTranslating || !customTextToTranslate.trim() ? "not-allowed" : "pointer",
                      fontSize: "0.85rem",
                      boxShadow: "0 4px 14px rgba(56, 189, 248, 0.4)"
                    }}
                  >
                    {isTranslating ? "Translating..." : "Translate & Explain Meaning 🌐"}
                  </button>
                </div>
              </form>

              {/* Translation Output Card */}
              {translatedResult && (
                <div style={{ marginTop: "12px", background: "rgba(2, 6, 23, 0.75)", border: "1.5px solid #38bdf8", borderRadius: "10px", padding: "12px 14px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                    <span style={{ fontSize: "0.75rem", color: "#38bdf8", fontWeight: 800 }}>
                      ✓ TRANSLATION & EXPLANATION ({translatedResult.country.code} - {translatedResult.country.name})
                    </span>
                    <button
                      type="button"
                      onClick={() => handleSpeakText(translatedResult.translation)}
                      style={{
                        background: "rgba(56, 189, 248, 0.2)",
                        border: "1px solid #38bdf8",
                        color: "#38bdf8",
                        borderRadius: "6px",
                        padding: "3px 8px",
                        fontSize: "0.72rem",
                        cursor: "pointer",
                        fontWeight: 700
                      }}
                    >
                      {isSpeaking ? "🔊 Speaking..." : "🔊 Pronounce"}
                    </button>
                  </div>
                  <div style={{ fontSize: "0.95rem", color: "#f8fafc", fontWeight: 700, marginBottom: "6px" }}>
                    "{translatedResult.translation}"
                  </div>
                  <div style={{ fontSize: "0.8rem", color: "#cbd5e1", lineHeight: "1.4" }}>
                    {translatedResult.explanation}
                  </div>
                </div>
              )}
            </div>

            {/* Quick Educational Terms Knowledge Base */}
            <div>
              <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 800, color: "#a855f7", marginBottom: "8px" }}>
                3. FREQUENT INSTITUTIONAL TERMS & COMMON SENTENCES:
              </label>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "10px" }}>
                {Object.entries(EDUCATIONAL_TERMS_DICTIONARY).map(([term, data]) => (
                  <div
                    key={term}
                    style={{
                      background: "rgba(15, 23, 42, 0.65)",
                      border: "1px solid rgba(255, 255, 255, 0.08)",
                      borderRadius: "10px",
                      padding: "10px 12px",
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "space-between"
                    }}
                  >
                    <div>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                        <strong style={{ color: "#38bdf8", fontSize: "0.85rem" }}>{term}</strong>
                        <span style={{ fontSize: "0.7rem", background: "rgba(168, 85, 247, 0.15)", color: "#c084fc", padding: "2px 6px", borderRadius: "4px" }}>
                          {data.category}
                        </span>
                      </div>
                      <p style={{ margin: "0 0 6px", fontSize: "0.78rem", color: "#cbd5e1", lineHeight: "1.4" }}>
                        {activeCountry.code === "FR" || activeCountry.code === "CI" || activeCountry.code === "SN"
                          ? data.fr
                          : activeCountry.code === "ES"
                            ? data.es
                            : activeCountry.code === "KE"
                              ? data.sw
                              : activeCountry.code === "SA"
                                ? data.ar
                                : activeCountry.code === "GH"
                                  ? `${data.tw} (${data.en})`
                                  : data.en}
                      </p>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "4px", borderTop: "1px solid rgba(255, 255, 255, 0.05)", paddingTop: "4px" }}>
                      <span style={{ fontSize: "0.7rem", color: "#94a3b8" }}>💡 {data.actionTip}</span>
                      <button
                        type="button"
                        onClick={() => {
                          setCustomTextToTranslate(term);
                          handleTranslateCustom();
                        }}
                        style={{ background: "transparent", border: "none", color: "#38bdf8", fontSize: "0.72rem", cursor: "pointer", fontWeight: 700 }}
                      >
                        Explain ↗
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

