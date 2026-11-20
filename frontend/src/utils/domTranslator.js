import { resolveApiUrl } from "../api/client/apiConfig";

const CACHE_STORAGE_PREFIX = "gbs_ui_tr_cache_v1_";
const MAX_LOCAL_CACHE_ENTRIES = 800;

// Curated instant dictionary (aligned case-insensitively) for immediate 0ms translation even before batch API resolves or offline
const INSTANT_PHRASES = {
  fr: {
    "headmaster command center": "Centre de Commandement du Directeur",
    "teacher portal": "Portail Enseignant",
    "student learning portal": "Portail d'Apprentissage Étudiant",
    "student hub": "Espace Étudiant",
    "parent portal": "Portail des Parents",
    "finance & bursar portal": "Portail Finances et Économat",
    "accountant desk": "Bureau du Comptable",
    "staff operations portal": "Portail des Opérations du Personnel",
    "staff ops": "Opérations Personnel",
    "hr portal": "Portail RH",
    "alumni hub": "Espace Anciens Élèves",
    "dashboard": "Tableau de bord",
    "overview": "Aperçu",
    "students": "Étudiants",
    "teachers": "Enseignants",
    "parents": "Parents",
    "attendance": "Présence",
    "examinations": "Examens",
    "examinations & schedule": "Examens et Calendrier",
    "school clinic": "Clinique Scolaire",
    "school clinic & medical registry": "Clinique Scolaire et Registre Médical",
    "school clinic & medical file": "Clinique Scolaire et Dossier Médical",
    "school clinic & health billing ledger": "Clinique Scolaire et Facturation Santé",
    "university operations": "Opérations Universitaires",
    "university hub": "Pôle Universitaire",
    "academic classes & curriculum": "Classes Académiques et Programme",
    "admissions pipeline & intake": "Pipeline des Admissions",
    "financial statements & audit engine": "États Financiers et Moteur d'Audit",
    "student invoicing & arrears": "Facturation Étudiants et Arriérés",
    "debtor registry & arrears holds": "Registre des Débiteurs",
    "fee schedules & hostel tiers": "Barèmes des Frais et Internat",
    "payment verification & reconciliations": "Vérification des Paiements",
    "operating expense ledger & archive": "Registre des Dépenses",
    "my class timetable": "Mon Emploi du Temps",
    "homework & submissions": "Devoirs et Soumissions",
    "verified report card": "Bulletin de Notes Vérifié",
    "course & class registration": "Inscription aux Cours et Classes",
    "digital library & e-books": "Bibliothèque Numérique et E-Books",
    "lifetime fee history & receipts (day 1)": "Historique Complet des Frais et Reçus",
    "peer chat & study circle": "Discussion et Cercle d'Étude",
    "live classes & references": "Cours en Direct et Références",
    "teacher topic videos (play & watch)": "Vidéos Thématiques des Enseignants",
    "sign out": "Déconnexion",
    "sign in": "Connexion",
    "back": "Retour",
    "blueprint light": "Mode Clair",
    "navy mode": "Mode Bleu Marine",
    "full view": "Plein Écran",
    "open tab full page": "Ouvrir en Pleine Page",
    "full display": "Affichage Complet",
    "open new tab": "Nouvel Onglet",
    "sync to cloud & backup": "Synchroniser Cloud et Sauvegarde",
    "language translator & inbox": "Traducteur et Boîte de Réception",
    "direct mobile sms": "SMS Mobile Direct",
    "global educational news": "Actualités Éducatives Mondiales",
    "mobile app & push": "Application Mobile et Notifications",
    "install gbs app now": "Installer l'App GBS Maintenant",
    "clear test data": "Effacer les Données de Test",
    "reset demo data": "Réinitialiser la Démo",
    "onboard your educational institution / school": "Enregistrer Votre Établissement Scolaire",
    "onboard school": "Inscrire École",
    "presentation video": "Vidéo de Présentation",
    "operating guide": "Guide d'Utilisation",
    "quick actions": "Actions Rapides",
    "recent activities": "Activités Récentes",
    "academic performance": "Performance Académique",
    "settings": "Paramètres",
    "reports": "Rapports",
    "save": "Enregistrer",
    "cancel": "Annuler",
    "submit": "Soumettre",
    "search": "Rechercher",
    "send message": "Envoyer le Message",
    "online (cloud ready)": "En ligne (Cloud Prêt)",
    "demo sandbox mode": "MODE DÉMO ÉDUCATIF",
    "live production workspace": "ESPACE DE PRODUCTION RÉEL",
    "official tenant institution": "ÉTABLISSEMENT OFFICIEL",
    "intelligence talks to wisdom": "L'INTELLIGENCE PARLE À LA SAGESSE",
    "enterprise management system — master blueprint": "SYSTÈME DE GESTION D'ENTREPRISE — PLAN DIRECTEUR",
    "welcome back": "Bon retour",
    "live cameras": "Caméras en Direct",
    "saved evidence vault": "Coffre des Preuves Enregistrées",
    "send to student": "Envoyer à l'Étudiant",
    "personal daily attendance record": "Relevé Quotidien de Présence Personnel",
    "integrated school clinic": "Clinique Scolaire Intégrée",
    "need help?": "Besoin d'Aide ?",
    "contact support": "Contacter le Support",
    "industrial internships": "Stages Industriels",
    "academic & field attachments": "Stages Académiques et de Terrain",
    "my personal health & medical dossier": "Mon Dossier Médical et de Santé Personnel",
    "all staff & student health profiles": "Profils de Santé de Tout le Personnel et des Étudiants"
  },
  es: {
    "headmaster command center": "Centro de Mando del Director",
    "teacher portal": "Portal del Docente",
    "student learning portal": "Portal de Aprendizaje Estudiantil",
    "student hub": "Centro Estudiantil",
    "parent portal": "Portal de Padres",
    "finance & bursar portal": "Portal de Finanzas y Tesorería",
    "accountant desk": "Oficina Contable",
    "staff operations portal": "Portal de Operaciones del Personal",
    "staff ops": "Operaciones Personal",
    "hr portal": "Portal de Recursos Humanos",
    "alumni hub": "Comunidad de Egresados",
    "dashboard": "Panel Principal",
    "overview": "Resumen",
    "students": "Estudiantes",
    "teachers": "Docentes",
    "parents": "Padres",
    "attendance": "Asistencia",
    "examinations": "Exámenes",
    "examinations & schedule": "Exámenes y Horarios",
    "school clinic": "Clínica Escolar",
    "school clinic & medical registry": "Clínica Escolar y Registro Médico",
    "my class timetable": "Mi Horario de Clases",
    "homework & submissions": "Tareas y Entregas",
    "verified report card": "Boleta de Calificaciones Verificada",
    "sign out": "Cerrar Sesión",
    "sign in": "Iniciar Sesión",
    "back": "Volver",
    "blueprint light": "Modo Claro",
    "navy mode": "Modo Azul Marino",
    "full view": "Vista Completa",
    "open new tab": "Abrir Nueva Pestaña",
    "sync to cloud & backup": "Sincronizar Nube y Respaldo",
    "language translator & inbox": "Traductor y Bandeja",
    "direct mobile sms": "SMS Móvil Directo",
    "global educational news": "Noticias Educativas Mundiales",
    "mobile app & push": "App Móvil y Notificaciones",
    "install gbs app now": "Instalar App GBS Ahora",
    "quick actions": "Acciones Rápidas",
    "recent activities": "Actividades Recientes",
    "settings": "Configuración",
    "reports": "Informes",
    "save": "Guardar",
    "cancel": "Cancelar",
    "submit": "Enviar",
    "search": "Buscar",
    "online (cloud ready)": "En línea (Nube Lista)",
    "demo sandbox mode": "MODO DEMO PRÁCTICO",
    "live production workspace": "ESPACIO DE PRODUCCIÓN REAL",
    "personal daily attendance record": "Registro Diario de Asistencia Personal",
    "integrated school clinic": "Clínica Escolar Integrada",
    "industrial internships": "Pasantías Industriales",
    "academic & field attachments": "Prácticas Académicas y de Campo",
    "my personal health & medical dossier": "Mi Historial Personal de Salud y Médico",
    "all staff & student health profiles": "Perfiles de Salud de Todo el Personal y Estudiantes"
  },
  ar: {
    "headmaster command center": "مركز قيادة مدير المدرسة",
    "teacher portal": "بوابة المعلم",
    "student learning portal": "بوابة تعلم الطالب",
    "student hub": "مركز الطلاب",
    "parent portal": "بوابة أولياء الأمور",
    "finance & bursar portal": "بوابة المالية والمحاسبة",
    "accountant desk": "مكتب المحاسب",
    "staff operations portal": "بوابة عمليات الموظفين",
    "staff ops": "عمليات الموظفين",
    "hr portal": "بوابة الموارد البشرية",
    "alumni hub": "بوابة الخريجين",
    "dashboard": "لوحة التحكم",
    "overview": "نظرة عامة",
    "students": "الطلاب",
    "teachers": "المعلمون",
    "parents": "أولياء الأمور",
    "attendance": "الحضور والغياب",
    "examinations": "الاختبارات",
    "examinations & schedule": "الاختبارات والجدول",
    "school clinic": "العيادة المدرسية",
    "school clinic & medical registry": "العيادة المدرسية والسجل الطبي",
    "my class timetable": "جدول حصصي",
    "homework & submissions": "الواجبات والتسليمات",
    "verified report card": "كشف الدرجات المعتمد",
    "sign out": "تسجيل الخروج",
    "sign in": "تسجيل الدخول",
    "back": "رجوع",
    "blueprint light": "الوضع المضيء",
    "navy mode": "الوضع الليلي",
    "full view": "عرض كامل",
    "open new tab": "فتح علامة تبويب جديدة",
    "sync to cloud & backup": "مزامنة السحابة والنسخ الاحتياطي",
    "language translator & inbox": "المترجم وصندوق الوارد",
    "direct mobile sms": "رسائل الجوال المباشرة",
    "global educational news": "الأخبار التعليمية العالمية",
    "mobile app & push": "تطبيق الجوال والإشعارات",
    "install gbs app now": "تثبيت تطبيق GBS الآن",
    "quick actions": "إجراءات سريعة",
    "recent activities": "الأنشطة الأخيرة",
    "settings": "الإعدادات",
    "reports": "التقارير",
    "save": "حفظ",
    "cancel": "إلغاء",
    "submit": "إرسال",
    "search": "بحث",
    "online (cloud ready)": "متصل (جاهز للسحابة)",
    "demo sandbox mode": "وضع التدريب التجريبي",
    "live production workspace": "بيئة الإنتاج الحقيقية",
    "personal daily attendance record": "سجل الحضور اليومي الشخصي",
    "integrated school clinic": "العيادة المدرسية المتكاملة",
    "industrial internships": "التدريب الصناعي",
    "academic & field attachments": "التطبيق الأكاديمي والميداني",
    "my personal health & medical dossier": "ملفي الصحي والطبي الشخصي",
    "all staff & student health profiles": "الملفات الصحية لجميع الموظفين والطلاب"
  },
  pt: {
    "headmaster command center": "Centro de Comando do Diretor",
    "teacher portal": "Portal do Professor",
    "student learning portal": "Portal de Aprendizagem do Aluno",
    "parent portal": "Portal dos Pais",
    "finance & bursar portal": "Portal Financeiro e Tesouraria",
    "accountant desk": "Mesa do Contador",
    "hr portal": "Portal de RH",
    "alumni hub": "Rede de Ex-Alunos",
    "dashboard": "Painel",
    "students": "Estudantes",
    "teachers": "Professores",
    "attendance": "Frequência",
    "examinations": "Exames",
    "school clinic": "Clínica Escolar",
    "sign out": "Sair",
    "sign in": "Entrar"
  },
  de: {
    "headmaster command center": "Schulleitung-Kommandozentrale",
    "teacher portal": "Lehrerportal",
    "student learning portal": "Schüler-Lernportal",
    "parent portal": "Elternportal",
    "finance & bursar portal": "Finanz- und Kassenportal",
    "accountant desk": "Buchhaltung",
    "hr portal": "Personalportal",
    "alumni hub": "Alumni-Netzwerk",
    "dashboard": "Übersicht",
    "students": "Schüler",
    "teachers": "Lehrkräfte",
    "attendance": "Anwesenheit",
    "examinations": "Prüfungen",
    "school clinic": "Schulklinik",
    "sign out": "Abmelden",
    "sign in": "Anmelden"
  },
  sw: {
    "headmaster command center": "Kituo cha Uongozi cha Mkuu wa Shule",
    "teacher portal": "Lango la Mwalimu",
    "student learning portal": "Lango la Kujifunza la Mwanafunzi",
    "parent portal": "Lango la Mzazi",
    "finance & bursar portal": "Lango la Fedha na Mhasibu",
    "accountant desk": "Dawati la Mhasibu",
    "hr portal": "Lango la Rasilimali Watu",
    "dashboard": "Dashibodi",
    "students": "Wanafunzi",
    "teachers": "Walimu",
    "attendance": "Mahudhurio",
    "examinations": "Mitihani",
    "school clinic": "Kliniki ya Shule",
    "sign out": "Ondoka",
    "sign in": "Ingia"
  },
  tw: {
    "headmaster command center": "Sukuu Panin Adwumayɛbea",
    "teacher portal": "Ɔkyerɛkyerɛni Adwumayɛbea",
    "student learning portal": "Osuani Adesua Beae",
    "parent portal": "Ɔwofoɔ Nkitahodi Beae",
    "finance & bursar portal": "Sikasɛm ne Ka Adwumayɛbea",
    "accountant desk": "Sikasɛm Adwumayɛbea",
    "hr portal": "Adwumayɛfoɔ Nhyehyɛeɛ",
    "dashboard": "Adwumayɛbea",
    "students": "Asuafoɔ",
    "teachers": "Akyerɛkyerɛfoɔ",
    "attendance": "Sukuu Ba ne Kɔ",
    "examinations": "Sɔhwɛ",
    "school clinic": "Sukuu Ayaresabea",
    "sign out": "Pue",
    "sign in": "Bra Mu"
  },
  zh: {
    "headmaster command center": "校长指挥中心",
    "teacher portal": "教师门户",
    "student learning portal": "学生学习门户",
    "parent portal": "家长门户",
    "finance & bursar portal": "财务与会计门户",
    "accountant desk": "财务处",
    "hr portal": "人事门户",
    "alumni hub": "校友中心",
    "dashboard": "仪表板",
    "students": "学生",
    "teachers": "教师",
    "attendance": "考勤记录",
    "examinations": "考试管理",
    "school clinic": "校医务室",
    "sign out": "退出登录",
    "sign in": "登录"
  },
  hi: {
    "headmaster command center": "प्रधानाचार्य कमान केंद्र",
    "teacher portal": "शिक्षक पोर्टल",
    "student learning portal": "छात्र शिक्षण पोर्टल",
    "parent portal": "अभिभावक पोर्टल",
    "dashboard": "डैशबोर्ड",
    "students": "छात्र",
    "teachers": "शिक्षक",
    "attendance": "उपस्थिति",
    "examinations": "परीक्षाएं",
    "school clinic": "स्कूल क्लिनिक",
    "sign out": "लॉग आउट",
    "sign in": "लॉग इन करें"
  },
  ja: {
    "headmaster command center": "校長管理センター",
    "teacher portal": "教員ポータル",
    "student learning portal": "生徒学習ポータル",
    "parent portal": "保護者ポータル",
    "dashboard": "ダッシュボード",
    "students": "生徒",
    "teachers": "教員",
    "attendance": "出欠記録",
    "examinations": "試験管理",
    "school clinic": "学校保健室",
    "sign out": "ログアウト",
    "sign in": "ログイン"
  }
};

const SKIP_TAGS = new Set([
  "SCRIPT", "STYLE", "NOSCRIPT", "TEMPLATE", "SVG", "CODE", "PRE", "KBD", "SAMP", "TEXTAREA", "CANVAS", "VIDEO", "AUDIO"
]);
const TRANSLATABLE_ATTRS = ["placeholder", "aria-label"];

const memoryCachesByLang = new Map(); // lang -> Map<coreString, translatedCore>
const textNodeState = new WeakMap();  // Text -> { source, applied, prefix, core, suffix, lang }
const elementAttrState = new WeakMap(); // Element -> Map<attrName, { source, applied, prefix, core, suffix, lang }>
const trackedTextNodes = new Set();   // Set<Text>
const trackedAttrElements = new Set(); // Set<Element>

let activeLanguageCode = "en";
let observerInstance = null;
let flushTimer = null;
let batchQueueTimer = null;
const pendingStrings = new Set();
const inFlightStrings = new Set();
let isWritingDom = false;

export function isDeveloperRouteOrDomActive() {
  if (typeof window === "undefined") return false;
  const pathname = String(window.location?.pathname || "").toLowerCase();
  if (pathname === "/developer" || pathname.startsWith("/developer/") || pathname.startsWith("/developer-control-center")) {
    return true;
  }
  if (typeof document !== "undefined" && document.querySelector('[data-gbs-developer-portal="true"]')) {
    return true;
  }
  return false;
}

function getLangCache(langCode) {
  const clean = String(langCode || "en").toLowerCase();
  if (memoryCachesByLang.has(clean)) return memoryCachesByLang.get(clean);
  const map = new Map();
  try {
    const raw = JSON.parse(localStorage.getItem(`${CACHE_STORAGE_PREFIX}${clean}`) || "{}");
    if (raw && typeof raw === "object") {
      Object.entries(raw).forEach(([k, v]) => {
        if (k && v) map.set(k, v);
      });
    }
  } catch { }
  memoryCachesByLang.set(clean, map);
  return map;
}

function persistLangCache(langCode, map) {
  const clean = String(langCode || "en").toLowerCase();
  try {
    if (map.size > MAX_LOCAL_CACHE_ENTRIES) {
      const entries = Array.from(map.entries()).slice(-MAX_LOCAL_CACHE_ENTRIES);
      map.clear();
      entries.forEach(([k, v]) => map.set(k, v));
    }
    localStorage.setItem(`${CACHE_STORAGE_PREFIX}${clean}`, JSON.stringify(Object.fromEntries(map.entries())));
  } catch { }
}

function lookupCachedTranslation(core, langCode) {
  const lowerLang = String(langCode || "en").toLowerCase();
  if (lowerLang === "en") return core;

  const mem = getLangCache(lowerLang);
  if (mem.has(core)) return mem.get(core);

  const pack = INSTANT_PHRASES[lowerLang];
  if (pack) {
    const normalized = core.replace(/\s+/g, " ").trim().toLowerCase();
    if (pack[normalized]) {
      mem.set(core, pack[normalized]);
      return pack[normalized];
    }
  }
  return null;
}

function splitEdgeDecorators(rawText) {
  const raw = String(rawText || "");
  if (!raw.trim()) return { prefix: raw, core: "", suffix: "" };

  // Match leading whitespace, bullets, pictographic icons, arrows, or variation selectors while keeping words cleanly inside `core`
  const leadRe = /^([\s\p{Extended_Pictographic}\p{Emoji_Presentation}\u200D\uFE0F\u2600-\u27BF•·►▶▸★☆✓✔✕✖→↗←⬇⬆⛶]+)(?=\s*\S)/u;
  const leadMatch = raw.match(leadRe);
  const prefix = leadMatch ? leadMatch[1] : (raw.match(/^\s+/)?.[0] || "");
  let rest = raw.slice(prefix.length);

  const trailRe = /([\s•·►▶▸★☆✓✔✕→↗←⬇⬆\p{Extended_Pictographic}\uFE0F]+)$/u;
  const trailMatch = rest.match(trailRe);
  let suffix = "";
  if (trailMatch && trailMatch[1].length < rest.length) {
    suffix = trailMatch[1];
    rest = rest.slice(0, rest.length - suffix.length);
  }

  return { prefix, core: rest.trim(), suffix };
}

function isSkippableCore(core) {
  if (!core || core.length < 2 || core.length > 420) return true;
  // Require at least two alphabetic letters so numbers, dates, currencies, symbols & abbreviations skip
  const letters = core.match(/[A-Za-z]/g);
  if (!letters || letters.length < 2) return true;
  if (/^\S+@\S+\.\S+$/.test(core)) return true; // emails
  if (/^https?:\/\//i.test(core)) return true; // URLs
  if (/^[A-Z]{2,5}\s*[₹$€£¥₦₵]/i.test(core)) return true;
  if (/^[A-Z0-9_/-]{2,18}$/.test(core) && !/[aeiou]{1,2}[a-z]{1,}/i.test(core)) return true;
  return false;
}

function isNodeExcluded(node) {
  let el = node?.nodeType === 1 ? node : node?.parentElement;
  while (el) {
    if (SKIP_TAGS.has(el.tagName)) return true;
    if (
      el.getAttribute("data-gbs-no-translate") === "true" ||
      el.getAttribute("data-gbs-developer-portal") === "true" ||
      el.getAttribute("translate") === "no"
    ) {
      return true;
    }
    el = el.parentElement;
  }
  return false;
}

function applyTranslatedTextToNode(node, langCode) {
  if (!node || !node.isConnected || isNodeExcluded(node)) return;
  const currentVal = node.nodeValue || "";
  if (!currentVal.trim()) return;

  let rec = textNodeState.get(node);
  if (!rec) {
    const parts = splitEdgeDecorators(currentVal);
    rec = {
      source: currentVal,
      applied: currentVal,
      prefix: parts.prefix,
      core: parts.core,
      suffix: parts.suffix,
      lang: "en"
    };
    textNodeState.set(node, rec);
    trackedTextNodes.add(node);
  } else if (currentVal !== rec.applied) {
    // React updated this node naturally; record the new authoritative English source
    const parts = splitEdgeDecorators(currentVal);
    rec.source = currentVal;
    rec.applied = currentVal;
    rec.prefix = parts.prefix;
    rec.core = parts.core;
    rec.suffix = parts.suffix;
    rec.lang = "en";
  }

  if (langCode === "en") {
    if (node.nodeValue !== rec.source) {
      isWritingDom = true;
      node.nodeValue = rec.source;
      isWritingDom = false;
    }
    rec.applied = rec.source;
    rec.lang = "en";
    return;
  }

  if (isSkippableCore(rec.core)) return;

  const hit = lookupCachedTranslation(rec.core, langCode);
  if (hit) {
    const nextValue = `${rec.prefix}${hit}${rec.suffix}`;
    if (node.nodeValue !== nextValue) {
      isWritingDom = true;
      node.nodeValue = nextValue;
      isWritingDom = false;
    }
    rec.applied = nextValue;
    rec.lang = langCode;
  } else {
    pendingStrings.add(rec.core);
  }
}

function applyTranslatedAttrsToElement(el, langCode) {
  if (!el || !el.isConnected || el.nodeType !== 1 || isNodeExcluded(el)) return;

  let attrMap = elementAttrState.get(el);
  const attrsToCheck = [...TRANSLATABLE_ATTRS];
  if (el.tagName === "INPUT" && (el.type === "button" || el.type === "submit")) {
    attrsToCheck.push("value");
  }

  for (const attr of attrsToCheck) {
    const currentAttrVal = el.getAttribute(attr);
    if (!currentAttrVal || !currentAttrVal.trim()) continue;

    if (!attrMap) {
      attrMap = new Map();
      elementAttrState.set(el, attrMap);
      trackedAttrElements.add(el);
    }

    let rec = attrMap.get(attr);
    if (!rec) {
      const parts = splitEdgeDecorators(currentAttrVal);
      rec = {
        source: currentAttrVal,
        applied: currentAttrVal,
        prefix: parts.prefix,
        core: parts.core,
        suffix: parts.suffix,
        lang: "en"
      };
      attrMap.set(attr, rec);
    } else if (currentAttrVal !== rec.applied) {
      const parts = splitEdgeDecorators(currentAttrVal);
      rec.source = currentAttrVal;
      rec.applied = currentAttrVal;
      rec.prefix = parts.prefix;
      rec.core = parts.core;
      rec.suffix = parts.suffix;
      rec.lang = "en";
    }

    if (langCode === "en") {
      if (el.getAttribute(attr) !== rec.source) {
        isWritingDom = true;
        el.setAttribute(attr, rec.source);
        isWritingDom = false;
      }
      rec.applied = rec.source;
      rec.lang = "en";
      continue;
    }

    if (isSkippableCore(rec.core)) continue;
    const hit = lookupCachedTranslation(rec.core, langCode);
    if (hit) {
      const nextVal = `${rec.prefix}${hit}${rec.suffix}`;
      if (el.getAttribute(attr) !== nextVal) {
        isWritingDom = true;
        el.setAttribute(attr, nextVal);
        isWritingDom = false;
      }
      rec.applied = nextVal;
      rec.lang = langCode;
    } else {
      pendingStrings.add(rec.core);
    }
  }
}

function scanSubtree(root, langCode) {
  if (typeof document === "undefined" || !root) return;
  if (langCode !== "en" && isDeveloperRouteOrDomActive()) {
    restoreAllToEnglish();
    return;
  }

  const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT);
  let cur = walker.currentNode;
  while (cur) {
    if (cur.nodeType === 3) {
      applyTranslatedTextToNode(cur, langCode);
    } else if (cur.nodeType === 1) {
      applyTranslatedAttrsToElement(cur, langCode);
    }
    cur = walker.nextNode();
  }
}

async function flushPendingTranslations(langCode) {
  if (!langCode || langCode === "en" || isDeveloperRouteOrDomActive()) {
    pendingStrings.clear();
    return;
  }

  const batch = [];
  for (const s of pendingStrings) {
    if (!inFlightStrings.has(`${langCode}|${s}`)) {
      batch.push(s);
      inFlightStrings.add(`${langCode}|${s}`);
      pendingStrings.delete(s);
      if (batch.length >= 60) break;
    } else {
      pendingStrings.delete(s);
    }
  }
  if (batch.length === 0) return;

  try {
    const res = await fetch(resolveApiUrl("/translate/batch"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ texts: batch, targetLang: langCode })
    });
    if (res.ok) {
      const payload = await res.json();
      const map = payload?.data?.translations || {};
      const mem = getLangCache(langCode);
      let added = 0;
      Object.entries(map).forEach(([orig, tr]) => {
        if (orig && tr && String(tr).trim()) {
          mem.set(orig, String(tr).trim());
          added++;
        }
      });
      if (added > 0) {
        persistLangCache(langCode, mem);
      }
    }
  } catch {
    // Graceful no-op offline; curated instant dictionary remains active
  } finally {
    batch.forEach((s) => inFlightStrings.delete(`${langCode}|${s}`));
  }

  // Re-apply newly received translations ONLY if language and non-developer context still match
  if (activeLanguageCode === langCode && !isDeveloperRouteOrDomActive()) {
    scanSubtree(document.body, langCode);
    if (pendingStrings.size > 0) {
      scheduleBatchFlush(langCode);
    }
  }
}

function scheduleBatchFlush(langCode) {
  if (batchQueueTimer) clearTimeout(batchQueueTimer);
  batchQueueTimer = setTimeout(() => {
    flushPendingTranslations(langCode);
  }, 18);
}

export function restoreAllToEnglish() {
  if (typeof document === "undefined") return;
  isWritingDom = true;
  try {
    for (const node of trackedTextNodes) {
      if (!node.isConnected) {
        trackedTextNodes.delete(node);
        continue;
      }
      const rec = textNodeState.get(node);
      if (rec && node.nodeValue === rec.applied && node.nodeValue !== rec.source) {
        node.nodeValue = rec.source;
      }
      if (rec) {
        rec.applied = rec.source;
        rec.lang = "en";
      }
    }

    for (const el of trackedAttrElements) {
      if (!el.isConnected) {
        trackedAttrElements.delete(el);
        continue;
      }
      const attrMap = elementAttrState.get(el);
      if (!attrMap) continue;
      for (const [attr, rec] of attrMap.entries()) {
        if (el.getAttribute(attr) === rec.applied && el.getAttribute(attr) !== rec.source) {
          el.setAttribute(attr, rec.source);
        }
        rec.applied = rec.source;
        rec.lang = "en";
      }
    }
  } finally {
    isWritingDom = false;
  }
  pendingStrings.clear();
}

function ensureObserverRunning() {
  if (typeof document === "undefined" || typeof MutationObserver === "undefined" || observerInstance) return;
  observerInstance = new MutationObserver(() => {
    if (isWritingDom) return;
    if (activeLanguageCode === "en" || isDeveloperRouteOrDomActive()) {
      if (isDeveloperRouteOrDomActive()) restoreAllToEnglish();
      return;
    }
    if (flushTimer) clearTimeout(flushTimer);
    flushTimer = setTimeout(() => {
      if (activeLanguageCode !== "en" && !isDeveloperRouteOrDomActive()) {
        scanSubtree(document.body, activeLanguageCode);
        if (pendingStrings.size > 0) scheduleBatchFlush(activeLanguageCode);
      }
    }, 20);
  });
  observerInstance.observe(document.body, {
    childList: true,
    subtree: true,
    characterData: true
  });
}

export function setDomTranslationLanguage(langCode = "en") {
  if (typeof document === "undefined") return;
  const clean = String(langCode || "en").toLowerCase();

  // Developer portal MUST remain strictly unchanged in English
  if (isDeveloperRouteOrDomActive() || clean === "en") {
    activeLanguageCode = "en";
    if (observerInstance) {
      observerInstance.disconnect();
      observerInstance = null;
    }
    restoreAllToEnglish();
    return;
  }

  activeLanguageCode = clean;
  scanSubtree(document.body, clean);
  if (pendingStrings.size > 0) {
    scheduleBatchFlush(clean);
  }
  ensureObserverRunning();
}

export function stopAndRestoreEnglishForDeveloper() {
  activeLanguageCode = "en";
  if (observerInstance) {
    observerInstance.disconnect();
    observerInstance = null;
  }
  restoreAllToEnglish();
  if (typeof document !== "undefined") {
    document.documentElement.lang = "en";
    document.documentElement.dir = "ltr";
  }
}
