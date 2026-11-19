/**
 * GBS Global Country, Currency, Grading Norms & Language Internationalization Engine
 * Lets institutions and users in any country operate in their preferred system language
 * and regional school norms (currency, dial code, term structure, grading scale, RTL/LTR).
 */

import axiosInstance from "../api/client/axios";

export const PREFERRED_COUNTRY_KEY = "gbs_preferred_country";
export const PREFERRED_LANGUAGE_KEY = "gbs_preferred_language";

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
  try {
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
  try {
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
  const lang = getLanguageProfile(langCode);
  const country = getCountryProfile(countryCode);
  document.documentElement.lang = lang.code;
  document.documentElement.dir = lang.rtl ? "rtl" : "ltr";
  document.documentElement.setAttribute("data-gbs-country", country.code);
  document.documentElement.setAttribute("data-gbs-currency", country.currencyCode);
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

export async function setGlobalLocalePreferences({ countryCode = null, languageCode = null, syncServer = true } = {}) {
  try {
    if (countryCode) {
      const c = getCountryProfile(countryCode);
      localStorage.setItem(PREFERRED_COUNTRY_KEY, c.code);
    }
    if (languageCode) {
      const l = getLanguageProfile(languageCode);
      localStorage.setItem(PREFERRED_LANGUAGE_KEY, l.code);
    }
  } catch { }

  const activeCountry = getCountryProfile();
  const activeLang = getLanguageProfile();
  applyDocumentLocale(activeLang.code, activeCountry.code);

  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("gbs_locale_changed", { detail: { country: activeCountry, language: activeLang } }));
  }

  if (syncServer) {
    try {
      const token = localStorage.getItem("gbs_token");
      if (token) {
        await axiosInstance.patch("/users/locale-preferences", {
          countryCode: activeCountry.code,
          languageCode: activeLang.code
        });
      }
    } catch { }
  }

  return { country: activeCountry, language: activeLang };
}
