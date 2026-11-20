/**
 * GBS Global Country, Currency, Grading Norms & Language Internationalization Engine
 * Lets institutions and users in any country operate in their preferred system language
 * and regional school norms (currency, dial code, term structure, grading scale, RTL/LTR).
 */

import axiosInstance from "../api/client/axios";
import {
  isDeveloperRouteOrDomActive as isDeveloperPortalContext,
  setDomTranslationLanguage,
  stopAndRestoreEnglishForDeveloper
} from "./domTranslator";

export { isDeveloperPortalContext };

export const PREFERRED_COUNTRY_KEY = "gbs_preferred_country";
export const PREFERRED_LANGUAGE_KEY = "gbs_preferred_language";
export const HEADMASTER_ROLES = new Set(["ADMIN", "SUPER_ADMIN", "HEADMASTER"]);

export function resolveActiveTenantId() {
  try {
    const rawUser = JSON.parse(localStorage.getItem("gbs_user") || "{}");
    const uTid = parseInt(rawUser?.tenantId || rawUser?.tenant?.id, 10);
    if (Number.isInteger(uTid) && uTid > 0) return uTid;
    const rawTid = parseInt(localStorage.getItem("gbs_tenant_id") || localStorage.getItem("gbs_active_tenant"), 10);
    if (Number.isInteger(rawTid) && rawTid > 0) return rawTid;
  } catch { }
  return 1;
}

export function resolveCurrentUserRole() {
  try {
    const rawUser = JSON.parse(localStorage.getItem("gbs_user") || "{}");
    return String(rawUser?.role || localStorage.getItem("gbs_auth_role") || "").trim().toUpperCase();
  } catch {
    return "";
  }
}

export function getTenantLanguageStorageKey(tenantId = resolveActiveTenantId()) {
  return `${PREFERRED_LANGUAGE_KEY}_t_${tenantId}`;
}

export function getTenantCountryStorageKey(tenantId = resolveActiveTenantId()) {
  return `${PREFERRED_COUNTRY_KEY}_t_${tenantId}`;
}

export const GLOBAL_COUNTRIES = [
  { code: "GH", name: "Ghana", flag: "🇬🇭", currencyCode: "GHS", currencySymbol: "GH₵", dialCode: "+233", termSystem: "3-Term Academic Year", gradingNorm: "WAEC / GES (A1–F9)", dateFormat: "DD/MM/YYYY", defaultLanguage: "en" },
  { code: "NG", name: "Nigeria", flag: "🇳🇬", currencyCode: "NGN", currencySymbol: "₦", dialCode: "+234", termSystem: "3-Term Session", gradingNorm: "WAEC / NECO (A1–F9)", dateFormat: "DD/MM/YYYY", defaultLanguage: "en" },
  { code: "KE", name: "Kenya", flag: "🇰🇪", currencyCode: "KES", currencySymbol: "KSh", dialCode: "+254", termSystem: "3-Term CBC Year", gradingNorm: "KCSE (A–E)", dateFormat: "DD/MM/YYYY", defaultLanguage: "en" },
  { code: "ZA", name: "South Africa", flag: "🇿🇦", currencyCode: "ZAR", currencySymbol: "R", dialCode: "+27", termSystem: "4-Term Year", gradingNorm: "NSC Levels 1–7", dateFormat: "YYYY-MM-DD", defaultLanguage: "en" },
  { code: "GB", name: "United Kingdom", flag: "🇬🇧", currencyCode: "GBP", currencySymbol: "£", dialCode: "+44", termSystem: "3-Term UK Calendar", gradingNorm: "GCSE (9–1) / A-Level", dateFormat: "DD/MM/YYYY", defaultLanguage: "en" },
  { code: "US", name: "United States", flag: "🇺🇸", currencyCode: "USD", currencySymbol: "$", dialCode: "+1", termSystem: "2-Semester Year", gradingNorm: "GPA 4.0 (A–F)", dateFormat: "MM/DD/YYYY", defaultLanguage: "en" },
  { code: "CA", name: "Canada", flag: "🇨🇦", currencyCode: "CAD", currencySymbol: "C$", dialCode: "+1", termSystem: "2-Semester Year", gradingNorm: "Percentage / 4.0 GPA", dateFormat: "YYYY-MM-DD", defaultLanguage: "en" },
  { code: "FR", name: "France", flag: "🇫🇷", currencyCode: "EUR", currencySymbol: "€", dialCode: "+33", termSystem: "3-Trimestre Year", gradingNorm: "Baccalauréat (0–20)", dateFormat: "DD/MM/YYYY", defaultLanguage: "fr" },
  { code: "DE", name: "Germany", flag: "🇩🇪", currencyCode: "EUR", currencySymbol: "€", dialCode: "+49", termSystem: "2-Semester Year", gradingNorm: "German 1.0–6.0", dateFormat: "DD.MM.YYYY", defaultLanguage: "de" },
  { code: "ES", name: "Spain", flag: "🇪🇸", currencyCode: "EUR", currencySymbol: "€", dialCode: "+34", termSystem: "3-Trimestre LOMLOE", gradingNorm: "Spanish 0–10 Scale", dateFormat: "DD/MM/YYYY", defaultLanguage: "es" },
  { code: "BR", name: "Brazil", flag: "🇧🇷", currencyCode: "BRL", currencySymbol: "R$", dialCode: "+55", termSystem: "4-Bimestre Year", gradingNorm: "Brazilian 0–10 Scale", dateFormat: "DD/MM/YYYY", defaultLanguage: "pt" },
  { code: "AE", name: "United Arab Emirates", flag: "🇦🇪", currencyCode: "AED", currencySymbol: "AED ", dialCode: "+971", termSystem: "3-Term MoE Year", gradingNorm: "100-Point / IB", dateFormat: "DD/MM/YYYY", defaultLanguage: "ar" },
  { code: "SA", name: "Saudi Arabia", flag: "🇸🇦", currencyCode: "SAR", currencySymbol: "SAR ", dialCode: "+966", termSystem: "3-Semester Saudi", gradingNorm: "Percentage / 5.0 GPA", dateFormat: "DD/MM/YYYY", defaultLanguage: "ar" },
  { code: "IN", name: "India", flag: "🇮🇳", currencyCode: "INR", currencySymbol: "₹", dialCode: "+91", termSystem: "2-Term CBSE/ICSE", gradingNorm: "10-Point CGPA", dateFormat: "DD/MM/YYYY", defaultLanguage: "en" },
  { code: "CN", name: "China", flag: "🇨🇳", currencyCode: "CNY", currencySymbol: "¥", dialCode: "+86", termSystem: "2-Semester Year", gradingNorm: "100-Point / 4.0 GPA", dateFormat: "YYYY-MM-DD", defaultLanguage: "zh" },
  { code: "JP", name: "Japan", flag: "🇯🇵", currencyCode: "JPY", currencySymbol: "¥", dialCode: "+81", termSystem: "3-Term (April Start)", gradingNorm: "5-Point / S–F Scale", dateFormat: "YYYY-MM-DD", defaultLanguage: "ja" },
  { code: "INTL", name: "Global / International", flag: "🌍", currencyCode: "USD", currencySymbol: "$", dialCode: "+", termSystem: "Global Semester/Term", gradingNorm: "IB 1–7 / GPA / %", dateFormat: "YYYY-MM-DD", defaultLanguage: "en" }
];

export const GLOBAL_LANGUAGES = [
  { code: "en", label: "English", speechLocale: "en-US", rtl: false },
  { code: "fr", label: "Français (French)", speechLocale: "fr-FR", rtl: false },
  { code: "es", label: "Español (Spanish)", speechLocale: "es-ES", rtl: false },
  { code: "ar", label: "العربية (Arabic)", speechLocale: "ar-SA", rtl: true },
  { code: "pt", label: "Português (Portuguese)", speechLocale: "pt-BR", rtl: false },
  { code: "de", label: "Deutsch (German)", speechLocale: "de-DE", rtl: false },
  { code: "sw", label: "Kiswahili (Swahili)", speechLocale: "sw-KE", rtl: false },
  { code: "tw", label: "Twi / Akan", speechLocale: "en-GH", rtl: false },
  { code: "gaa", label: "Ga (Gã)", speechLocale: "en-GH", rtl: false },
  { code: "ee", label: "Ewe (Eʋegbe)", speechLocale: "en-GH", rtl: false },
  { code: "ha", label: "Hausa", speechLocale: "en-NG", rtl: false },
  { code: "yo", label: "Yorùbá", speechLocale: "en-NG", rtl: false },
  { code: "hi", label: "हिन्दी (Hindi)", speechLocale: "hi-IN", rtl: false },
  { code: "zh", label: "中文 (Chinese)", speechLocale: "zh-CN", rtl: false },
  { code: "ja", label: "日本語 (Japanese)", speechLocale: "ja-JP", rtl: false }
];

const UI_TRANSLATIONS = {
  en: {
    signIn: "Sign In",
    dashboard: "Dashboard",
    students: "Students",
    teachers: "Teachers",
    parents: "Parents",
    finance: "Finance & Fees",
    clinic: "School Clinic",
    university: "University Hub",
    defaulters: "Defaulters Monitor",
    reports: "Reports",
    settings: "Settings",
    logout: "Sign Out",
    lightMode: "Blueprint Light",
    navyMode: "Dark Navy",
    fullView: "Full View",
    openNewTab: "Open New Tab",
    syncCloud: "Sync to Cloud & Backup",
    translator: "Language Translator & Inbox",
    directSms: "Direct Mobile SMS",
    mobileApp: "Mobile App & Push",
    liveWorkspace: "LIVE PRODUCTION WORKSPACE",
    demoWorkspace: "DEMO SANDBOX MODE",
    welcome: "Welcome to GBS School Management System",
    countryLabel: "Country & Norms",
    languageLabel: "System Language"
  },
  fr: {
    signIn: "Connexion",
    dashboard: "Tableau de bord",
    students: "Étudiants",
    teachers: "Enseignants",
    parents: "Parents",
    finance: "Finances & Frais",
    clinic: "Clinique Scolaire",
    university: "Pôle Universitaire",
    defaulters: "Suivi des Retards",
    reports: "Rapports",
    settings: "Paramètres",
    logout: "Déconnexion",
    lightMode: "Mode Clair",
    navyMode: "Mode Nuit Bleu",
    fullView: "Plein Écran",
    openNewTab: "Nouvel Onglet",
    syncCloud: "Synchroniser Cloud",
    translator: "Traducteur & Boîte",
    directSms: "SMS Mobile Direct",
    mobileApp: "App Mobile & Push",
    liveWorkspace: "ESPACE PRODUCTION RÉEL",
    demoWorkspace: "MODE DÉMO ÉDUCATIF",
    welcome: "Bienvenue sur GBS School Management System",
    countryLabel: "Pays & Normes",
    languageLabel: "Langue du Système"
  },
  es: {
    signIn: "Iniciar Sesión",
    dashboard: "Panel Principal",
    students: "Estudiantes",
    teachers: "Docentes",
    parents: "Padres",
    finance: "Finanzas y Pagos",
    clinic: "Clínica Escolar",
    university: "Centro Universitario",
    defaulters: "Monitor de Incumplimiento",
    reports: "Informes",
    settings: "Configuración",
    logout: "Cerrar Sesión",
    lightMode: "Modo Claro",
    navyMode: "Modo Azul Marino",
    fullView: "Vista Completa",
    openNewTab: "Abrir Nueva Pestaña",
    syncCloud: "Sincronizar Nube",
    translator: "Traductor y Mensajes",
    directSms: "SMS Móvil Directo",
    mobileApp: "App Móvil y Push",
    liveWorkspace: "ESPACIO DE PRODUCCIÓN REAL",
    demoWorkspace: "MODO DEMO PRÁCTICO",
    welcome: "Bienvenido a GBS School Management System",
    countryLabel: "País y Normas",
    languageLabel: "Idioma del Sistema"
  },
  ar: {
    signIn: "تسجيل الدخول",
    dashboard: "لوحة التحكم",
    students: "الطلاب",
    teachers: "المعلمون",
    parents: "أولياء الأمور",
    finance: "المالية والرسوم",
    clinic: "العيادة المدرسية",
    university: "مركز الجامعة",
    defaulters: "مراقبة المتغيبين",
    reports: "التقارير",
    settings: "الإعدادات",
    logout: "تسجيل الخروج",
    lightMode: "الوضع المضيء",
    navyMode: "الوضع الليلي",
    fullView: "عرض كامل",
    openNewTab: "فتح في علامة تبويب جديدة",
    syncCloud: "مزامنة السحابة",
    translator: "المترجم والرسائل",
    directSms: "رسائل الجوال المباشرة",
    mobileApp: "تطبيق الجوال",
    liveWorkspace: "بيئة الإنتاج الحقيقية",
    demoWorkspace: "وضع التدريب التجريبي",
    welcome: "مرحباً بكم في نظام GBS لإدارة المدارس",
    countryLabel: "الدولة والمعايير",
    languageLabel: "لغة النظام"
  },
  pt: {
    signIn: "Entrar",
    dashboard: "Painel",
    students: "Estudantes",
    teachers: "Professores",
    parents: "Pais",
    finance: "Finanças e Taxas",
    clinic: "Clínica Escolar",
    university: "Portal Universitário",
    defaulters: "Monitor de Pendências",
    reports: "Relatórios",
    settings: "Configurações",
    logout: "Sair",
    lightMode: "Modo Claro",
    navyMode: "Modo Azul",
    fullView: "Tela Cheia",
    openNewTab: "Abrir Nova Aba",
    syncCloud: "Sincronizar Nuvem",
    translator: "Tradutor e Caixa",
    directSms: "SMS Móvel Direto",
    mobileApp: "App Móvel e Push",
    liveWorkspace: "AMBIENTE DE PRODUÇÃO REAL",
    demoWorkspace: "MODO DEMONSTRAÇÃO",
    welcome: "Bem-vindo ao GBS School Management System",
    countryLabel: "País e Normas",
    languageLabel: "Idioma do Sistema"
  },
  de: {
    signIn: "Anmelden",
    dashboard: "Übersicht",
    students: "Schüler",
    teachers: "Lehrkräfte",
    parents: "Eltern",
    finance: "Finanzen & Gebühren",
    clinic: "Schulklinik",
    university: "Universitätsbereich",
    defaulters: "Fehlzeiten & Säumnis",
    reports: "Berichte",
    settings: "Einstellungen",
    logout: "Abmelden",
    lightMode: "Helles Design",
    navyMode: "Dunkelblau",
    fullView: "Vollansicht",
    openNewTab: "Neuer Tab",
    syncCloud: "Cloud-Sync",
    translator: "Übersetzer & Postfach",
    directSms: "Direkt-SMS",
    mobileApp: "Mobile App & Push",
    liveWorkspace: "LIVE-PRODUKTIVSYSTEM",
    demoWorkspace: "DEMO-ÜBUNGSMODUS",
    welcome: "Willkommen im GBS Schulmanagementsystem",
    countryLabel: "Land & Normen",
    languageLabel: "Systemsprache"
  },
  sw: {
    signIn: "Ingia",
    dashboard: "Dashibodi",
    students: "Wanafunzi",
    teachers: "Walimu",
    parents: "Wazazi",
    finance: "Fedha na Ada",
    clinic: "Kliniki ya Shule",
    university: "Kitengo cha Chuo",
    defaulters: "Ufuatiliaji wa Mahudhurio",
    reports: "Ripoti",
    settings: "Mipangilio",
    logout: "Toka",
    lightMode: "Mwanga wa Kawaida",
    navyMode: "Hali ya Usiku",
    fullView: "Mwonekano Kamili",
    openNewTab: "Fungua Kichupo Kipya",
    syncCloud: "Sawazisha Wingu",
    translator: "Mtafsiri na Ujumbe",
    directSms: "SMS ya Moja kwa Moja",
    mobileApp: "Programu ya Simu",
    liveWorkspace: "MFUMO HALISI WA SHULE",
    demoWorkspace: "HALI YA MAJARIBIO",
    welcome: "Karibu kwenye Mfumo wa Usimamizi wa Shule GBS",
    countryLabel: "Nchi na Viwango",
    languageLabel: "Lugha ya Mfumo"
  },
  tw: {
    signIn: "Bra Mu",
    dashboard: "Adwumayɛbea",
    students: "Asuafoɔ",
    teachers: "Akyerɛkyerɛfoɔ",
    parents: "Awofoɔ",
    finance: "Sikasɛm ne Ka",
    clinic: "Sukuu Ayaresabea",
    university: "Suapɔn Dwumadi",
    defaulters: "Sɔhwɛ ne Baabi Nkyerɛmu",
    reports: "Nkrataa",
    settings: "Nhyehyɛeɛ",
    logout: "Pue",
    lightMode: "Hann",
    navyMode: "Anadwo",
    fullView: "Hwɛ Ne Nyinaa",
    openNewTab: "Bue Krataa Foforɔ",
    syncCloud: "Fa Sie Cloud So",
    translator: "Kasa Nkyerɛaseɛ",
    directSms: "SMS Firi Tɛlɛfon So",
    mobileApp: "Mobile App",
    liveWorkspace: "SUKUU DWUMADI PAA",
    demoWorkspace: "NKYERƐKYERƐ DEMO",
    welcome: "Akwaaba ba GBS Sukuu Nhyehyɛeɛ So",
    countryLabel: "Ɔman ne Nhyehyɛeɛ",
    languageLabel: "Ɔkasa a Wopɛ"
  },
  zh: {
    signIn: "登录",
    dashboard: "仪表板",
    students: "学生",
    teachers: "教师",
    parents: "家长",
    finance: "财务与学费",
    clinic: "校医务室",
    university: "大学事务中心",
    defaulters: "缺勤与未交监控",
    reports: "报告",
    settings: "设置",
    logout: "退出登录",
    lightMode: "浅色蓝金主题",
    navyMode: "深海蓝主题",
    fullView: "全屏视图",
    openNewTab: "新标签页打开",
    syncCloud: "同步至云端",
    translator: "多语言翻译箱",
    directSms: "手机直发短信",
    mobileApp: "手机应用与推送",
    liveWorkspace: "真实生产工作区",
    demoWorkspace: "演示教学模式",
    welcome: "欢迎使用 GBS 学校管理系统",
    countryLabel: "国家与教育标准",
    languageLabel: "系统语言"
  },
  hi: {
    signIn: "लॉग इन करें",
    dashboard: "डैशबोर्ड",
    students: "छात्र",
    teachers: "शिक्षक",
    parents: "अभिभावक",
    finance: "वित्त और शुल्क",
    clinic: "स्कूल क्लिनिक",
    university: "विश्वविद्यालय केंद्र",
    defaulters: "अनुपस्थिति निगरानी",
    reports: "रिपोर्ट",
    settings: "सेटिंग्स",
    logout: "लॉग आउट",
    lightMode: "लाइट थीम",
    navyMode: "डार्क नेवी",
    fullView: "पूर्ण दृश्य",
    openNewTab: "नया टैब खोलें",
    syncCloud: "क्लाउड सिंक",
    translator: "भाषा अनुवादक",
    directSms: "सीधा मोबाइल SMS",
    mobileApp: "मोबाइल ऐप",
    liveWorkspace: "लाइव प्रोडक्शन कार्यक्षेत्र",
    demoWorkspace: "डेमो प्रशिक्षण मोड",
    welcome: "GBS स्कूल प्रबंधन प्रणाली में आपका स्वागत है",
    countryLabel: "देश और मानदंड",
    languageLabel: "सिस्टम भाषा"
  },
  ja: {
    signIn: "ログイン",
    dashboard: "ダッシュボード",
    students: "生徒",
    teachers: "教員",
    parents: "保護者",
    finance: "財務・学費",
    clinic: "学校保健室",
    university: "大学管理ハブ",
    defaulters: "未提出・欠席管理",
    reports: "レポート",
    settings: "設定",
    logout: "ログアウト",
    lightMode: "ライト表示",
    navyMode: "ネイビー表示",
    fullView: "全画面表示",
    openNewTab: "新しいタブで開く",
    syncCloud: "クラウド同期",
    translator: "翻訳・受信トレイ",
    directSms: "SMS送信",
    mobileApp: "モバイルアプリ",
    liveWorkspace: "本番運用ワークスペース",
    demoWorkspace: "デモ学習モード",
    welcome: "GBS学校管理システムへようこそ",
    countryLabel: "国と教育基準",
    languageLabel: "システム言語"
  }
};

export function getPreferredCountryCode() {
  if (isDeveloperPortalContext()) return "GH";
  try {
    const tid = resolveActiveTenantId();
    const hasAuthSession = Boolean(localStorage.getItem("gbs_user") && (localStorage.getItem("gbs_token") || localStorage.getItem("gbs_access_token")));
    if (hasAuthSession) {
      const tenantScoped = localStorage.getItem(getTenantCountryStorageKey(tid));
      if (tenantScoped) return tenantScoped;
    }
    return localStorage.getItem(PREFERRED_COUNTRY_KEY) || "GH";
  } catch {
    return "GH";
  }
}

export function getCountryProfile(code = null) {
  const c = String(code || getPreferredCountryCode() || "GH").toUpperCase();
  return GLOBAL_COUNTRIES.find((x) => x.code === c) || GLOBAL_COUNTRIES[0];
}

export function getPreferredLanguageCode() {
  // Developer Dashboard & Control Center are permanently excluded and stay Standard English
  if (isDeveloperPortalContext()) return "en";
  try {
    const tid = resolveActiveTenantId();
    const hasAuthSession = Boolean(localStorage.getItem("gbs_user") && (localStorage.getItem("gbs_token") || localStorage.getItem("gbs_access_token")));
    if (hasAuthSession) {
      const tenantScoped = localStorage.getItem(getTenantLanguageStorageKey(tid));
      if (tenantScoped) return tenantScoped;
    }
    return localStorage.getItem(PREFERRED_LANGUAGE_KEY) || "en";
  } catch {
    return "en";
  }
}

export function getLanguageProfile(code = null) {
  const l = String(code || getPreferredLanguageCode() || "en").toLowerCase();
  return GLOBAL_LANGUAGES.find((x) => x.code === l) || GLOBAL_LANGUAGES[0];
}

export function applyDocumentLocale(langCode = getPreferredLanguageCode(), countryCode = getPreferredCountryCode()) {
  if (typeof document === "undefined") return;
  if (isDeveloperPortalContext()) {
    stopAndRestoreEnglishForDeveloper();
    document.documentElement.setAttribute("data-gbs-country", "GH");
    document.documentElement.setAttribute("data-gbs-currency", "GHS");
    return;
  }
  const lang = getLanguageProfile(langCode);
  const country = getCountryProfile(countryCode);
  document.documentElement.lang = lang.code;
  document.documentElement.dir = lang.rtl ? "rtl" : "ltr";
  document.documentElement.setAttribute("data-gbs-country", country.code);
  document.documentElement.setAttribute("data-gbs-currency", country.currencyCode);
  setDomTranslationLanguage(lang.code);
}

export function getActiveCurrencySymbol() {
  return getCountryProfile().currencySymbol || "GH₵";
}

export function formatLocalCurrency(amount) {
  const sym = getActiveCurrencySymbol();
  const num = Number(amount || 0);
  return `${sym}${Number.isFinite(num) ? num.toLocaleString() : "0"}`;
}

export function getUiLabel(key, langCode = null) {
  const l = String(langCode || getPreferredLanguageCode() || "en").toLowerCase();
  const pack = UI_TRANSLATIONS[l] || UI_TRANSLATIONS.en;
  return pack[key] || UI_TRANSLATIONS.en[key] || key;
}

export async function setGlobalLocalePreferences({ countryCode = null, languageCode = null, syncServer = true, scope = null } = {}) {
  if (isDeveloperPortalContext()) {
    stopAndRestoreEnglishForDeveloper();
    return { country: GLOBAL_COUNTRIES[0], language: GLOBAL_LANGUAGES[0], lockedDeveloperEnglish: true };
  }

  const tid = resolveActiveTenantId();
  const role = resolveCurrentUserRole();
  const isHeadmasterScope = scope === "TENANT" || HEADMASTER_ROLES.has(role);

  try {
    if (countryCode) {
      const c = getCountryProfile(countryCode);
      localStorage.setItem(getTenantCountryStorageKey(tid), c.code);
      localStorage.setItem(PREFERRED_COUNTRY_KEY, c.code);
    }
    if (languageCode) {
      const l = getLanguageProfile(languageCode);
      localStorage.setItem(getTenantLanguageStorageKey(tid), l.code);
      localStorage.setItem(PREFERRED_LANGUAGE_KEY, l.code);
    }
  } catch { }

  const activeCountry = getCountryProfile();
  const activeLang = getLanguageProfile();
  applyDocumentLocale(activeLang.code, activeCountry.code);

  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("gbs_locale_changed", {
      detail: { country: activeCountry, language: activeLang, tenantId: tid, isInstitutionWide: isHeadmasterScope }
    }));
  }

  if (syncServer) {
    try {
      const token = localStorage.getItem("gbs_token") || localStorage.getItem("gbs_access_token");
      if (token && !token.startsWith("gbs_dev_token_") && role !== "DEVELOPER") {
        const endpoint = isHeadmasterScope ? "/locale/tenant-preference" : "/users/locale-preferences";
        await axiosInstance.patch(endpoint, {
          tenantId: tid,
          countryCode: activeCountry.code,
          languageCode: activeLang.code
        });
      }
    } catch { }
  }

  return { country: activeCountry, language: activeLang, tenantId: tid, isInstitutionWide: isHeadmasterScope };
}

export async function syncTenantLocaleFromServer() {
  if (typeof window === "undefined") return null;
  if (isDeveloperPortalContext()) {
    stopAndRestoreEnglishForDeveloper();
    return { countryCode: "GH", languageCode: "en", lockedDeveloperEnglish: true };
  }

  const role = resolveCurrentUserRole();
  if (role === "DEVELOPER") {
    return null;
  }

  const token = localStorage.getItem("gbs_token") || localStorage.getItem("gbs_access_token");
  if (!token || token.startsWith("gbs_dev_token_")) return null;

  const tid = resolveActiveTenantId();
  try {
    const res = await axiosInstance.get("/locale/tenant-preference", { params: { tenantId: tid } });
    const data = res?.data?.data;
    if (!data || data.lockedDeveloperEnglish) return null;

    const nextLang = getLanguageProfile(data.languageCode || "en");
    const nextCountry = getCountryProfile(data.countryCode || "GH");

    const prevLang = localStorage.getItem(getTenantLanguageStorageKey(tid));
    const prevCountry = localStorage.getItem(getTenantCountryStorageKey(tid));
    const changed = prevLang !== nextLang.code || prevCountry !== nextCountry.code || document.documentElement.lang !== nextLang.code;

    localStorage.setItem(getTenantLanguageStorageKey(tid), nextLang.code);
    localStorage.setItem(getTenantCountryStorageKey(tid), nextCountry.code);
    localStorage.setItem(PREFERRED_LANGUAGE_KEY, nextLang.code);
    localStorage.setItem(PREFERRED_COUNTRY_KEY, nextCountry.code);

    applyDocumentLocale(nextLang.code, nextCountry.code);

    if (changed) {
      window.dispatchEvent(new CustomEvent("gbs_locale_changed", {
        detail: {
          country: nextCountry,
          language: nextLang,
          tenantId: tid,
          isInstitutionWide: Boolean(data.inheritedFromInstitution)
        }
      }));
    }
    return data;
  } catch {
    return null;
  }
}

export function hydrateLocaleFromLoginUser(user) {
  if (!user || isDeveloperPortalContext()) return;
  const role = String(user.role || "").trim().toUpperCase();
  if (role === "DEVELOPER") {
    stopAndRestoreEnglishForDeveloper();
    return;
  }
  const tid = parseInt(user.tenantId || user.tenant?.id || 1, 10) || 1;
  const pref = user.localePreferences;
  if (!pref) return;

  const nextLang = getLanguageProfile(pref.languageCode || "en");
  const nextCountry = getCountryProfile(pref.countryCode || "GH");
  try {
    localStorage.setItem("gbs_tenant_id", String(tid));
    localStorage.setItem(getTenantLanguageStorageKey(tid), nextLang.code);
    localStorage.setItem(getTenantCountryStorageKey(tid), nextCountry.code);
    localStorage.setItem(PREFERRED_LANGUAGE_KEY, nextLang.code);
    localStorage.setItem(PREFERRED_COUNTRY_KEY, nextCountry.code);
  } catch { }
  applyDocumentLocale(nextLang.code, nextCountry.code);
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("gbs_locale_changed", {
      detail: { country: nextCountry, language: nextLang, tenantId: tid }
    }));
  }
}

// =========================================================================
// Shared Global Country Currency <-> Ghana Cedis (GH₵) Conversion Helpers
// Matches backend countryLanguageNorms.js rates 1:1
// =========================================================================
export const CURRENCY_RATE_TO_GHS = Object.freeze({
  GHS: 1.0,
  NGN: 0.0098,
  KES: 0.122,
  ZAR: 0.87,
  GBP: 20.1,
  USD: 15.8,
  CAD: 11.4,
  EUR: 17.15,
  BRL: 2.75,
  AED: 4.3,
  SAR: 4.21,
  INR: 0.188,
  CNY: 2.18,
  JPY: 0.104,
  UGX: 0.0042,
  RWF: 0.0115,
  TZS: 0.0061,
  XOF: 0.026,
  EGP: 0.32,
  CHF: 17.9,
  AUD: 10.35,
  KRW: 0.0114,
  ZMW: 0.58
});

export const EXTENDED_FX_COUNTRIES = [
  ...GLOBAL_COUNTRIES,
  { code: "UG", name: "Uganda", flag: "🇺🇬", currencyCode: "UGX", currencySymbol: "USh", dialCode: "+256" },
  { code: "RW", name: "Rwanda", flag: "🇷🇼", currencyCode: "RWF", currencySymbol: "RF", dialCode: "+250" },
  { code: "TZ", name: "Tanzania", flag: "🇹🇿", currencyCode: "TZS", currencySymbol: "TSh", dialCode: "+255" },
  { code: "CI", name: "Côte d'Ivoire", flag: "🇨🇮", currencyCode: "XOF", currencySymbol: "CFA", dialCode: "+225" },
  { code: "SN", name: "Senegal", flag: "🇸🇳", currencyCode: "XOF", currencySymbol: "CFA", dialCode: "+221" },
  { code: "EG", name: "Egypt", flag: "🇪🇬", currencyCode: "EGP", currencySymbol: "E£", dialCode: "+20" },
  { code: "IT", name: "Italy", flag: "🇮🇹", currencyCode: "EUR", currencySymbol: "€", dialCode: "+39" },
  { code: "NL", name: "Netherlands", flag: "🇳🇱", currencyCode: "EUR", currencySymbol: "€", dialCode: "+31" },
  { code: "CH", name: "Switzerland", flag: "🇨🇭", currencyCode: "CHF", currencySymbol: "CHF", dialCode: "+41" },
  { code: "AU", name: "Australia", flag: "🇦🇺", currencyCode: "AUD", currencySymbol: "A$", dialCode: "+61" },
  { code: "KR", name: "South Korea", flag: "🇰🇷", currencyCode: "KRW", currencySymbol: "₩", dialCode: "+82" },
  { code: "ZM", name: "Zambia", flag: "🇿🇲", currencyCode: "ZMW", currencySymbol: "ZK", dialCode: "+260" },
  { code: "ZW", name: "Zimbabwe", flag: "🇿🇼", currencyCode: "USD", currencySymbol: "$", dialCode: "+263" }
];

export function resolveCountryCurrencyProfile(countryOrQuery = "GH") {
  const raw = String(countryOrQuery || "GH").trim();
  const upper = raw.toUpperCase();
  const low = raw.toLowerCase();
  const hit = EXTENDED_FX_COUNTRIES.find(
    (c) =>
      c.code === upper ||
      c.name.toLowerCase() === low ||
      c.currencyCode === upper ||
      c.dialCode === raw
  );
  return hit || GLOBAL_COUNTRIES[0];
}

export function getCurrencyRateToGhs(currencyOrCountry = "GHS") {
  const upper = String(currencyOrCountry || "GHS").trim().toUpperCase();
  if (CURRENCY_RATE_TO_GHS[upper]) return CURRENCY_RATE_TO_GHS[upper];
  const prof = resolveCountryCurrencyProfile(currencyOrCountry);
  return CURRENCY_RATE_TO_GHS[prof.currencyCode] || 1.0;
}

export function convertGhsToCountryCurrency(amountInGhs = 0, countryOrCurrency = "GH") {
  const prof = resolveCountryCurrencyProfile(countryOrCurrency);
  const fxToGhs = getCurrencyRateToGhs(prof.currencyCode || prof.code);
  const ghsNum = Math.max(0, Number(amountInGhs) || 0);
  const localAmount = fxToGhs > 0 ? Math.round((ghsNum / fxToGhs) * 100) / 100 : ghsNum;
  const convertedGhsAmount = Math.round(ghsNum * 100) / 100;
  return {
    countryCode: prof.code,
    countryName: prof.name,
    countryFlag: prof.flag || "🌍",
    currencyCode: prof.currencyCode,
    currencySymbol: prof.currencySymbol,
    fxRateToGhs: fxToGhs,
    localCurrencyAmount: localAmount,
    convertedGhsAmount,
    formattedLocalAmount: `${String(prof.currencySymbol || prof.currencyCode).trim()} ${localAmount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
    formattedGhsAmount: `GH₵ ${convertedGhsAmount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  };
}

export function convertCountryCurrencyToGhs(localAmount = 0, countryOrCurrency = "GHS") {
  const fxToGhs = getCurrencyRateToGhs(countryOrCurrency);
  const localNum = Math.max(0, Number(localAmount) || 0);
  return Math.round(localNum * fxToGhs * 100) / 100;
}
