'use strict';

/**
 * GBS Global Country, Currency, Grading Norms & Language Registry
 * Enables institutions in any country to operate strictly according to local
 * currency symbols, calling codes, term structures, grading scales, and preferred language.
 */

const COUNTRY_NORMS = Object.freeze({
  GH: {
    code: 'GH',
    name: 'Ghana',
    flag: '🇬🇭',
    currencyCode: 'GHS',
    currencySymbol: 'GH₵',
    dialCode: '+233',
    termSystem: '3-Term Academic Year (Trimester)',
    gradingNorm: 'GES / WAEC (A1–F9 / BECE 1–9 / University 4.0 GPA)',
    dateFormat: 'DD/MM/YYYY',
    defaultLanguage: 'en',
    supportedLanguages: ['en', 'tw', 'gaa', 'ee', 'ha', 'fr']
  },
  NG: {
    code: 'NG',
    name: 'Nigeria',
    flag: '🇳🇬',
    currencyCode: 'NGN',
    currencySymbol: '₦',
    dialCode: '+234',
    termSystem: '3-Term Academic Session',
    gradingNorm: 'WAEC / NECO (A1–F9) & NUC 5.0 CGPA',
    dateFormat: 'DD/MM/YYYY',
    defaultLanguage: 'en',
    supportedLanguages: ['en', 'ha', 'yo', 'fr']
  },
  KE: {
    code: 'KE',
    name: 'Kenya',
    flag: '🇰🇪',
    currencyCode: 'KES',
    currencySymbol: 'KSh',
    dialCode: '+254',
    termSystem: '3-Term Academic Calendar (CBC)',
    gradingNorm: 'KNEC KCSE (A–E) & Exceeding/Meeting Expectations',
    dateFormat: 'DD/MM/YYYY',
    defaultLanguage: 'en',
    supportedLanguages: ['en', 'sw']
  },
  ZA: {
    code: 'ZA',
    name: 'South Africa',
    flag: '🇿🇦',
    currencyCode: 'ZAR',
    currencySymbol: 'R',
    dialCode: '+27',
    termSystem: '4-Term School Calendar',
    gradingNorm: 'NSC Achievement Levels (1–7 / 0%–100%)',
    dateFormat: 'YYYY-MM-DD',
    defaultLanguage: 'en',
    supportedLanguages: ['en']
  },
  GB: {
    code: 'GB',
    name: 'United Kingdom',
    flag: '🇬🇧',
    currencyCode: 'GBP',
    currencySymbol: '£',
    dialCode: '+44',
    termSystem: '3-Term Year (Autumn, Spring, Summer)',
    gradingNorm: 'GCSE (9–1) & A-Level (A*–E) / UK Honours',
    dateFormat: 'DD/MM/YYYY',
    defaultLanguage: 'en',
    supportedLanguages: ['en', 'fr', 'es', 'de']
  },
  US: {
    code: 'US',
    name: 'United States',
    flag: '🇺🇸',
    currencyCode: 'USD',
    currencySymbol: '$',
    dialCode: '+1',
    termSystem: '2-Semester / 4-Quarter Year',
    gradingNorm: 'US Standard GPA (4.0 / A+–F)',
    dateFormat: 'MM/DD/YYYY',
    defaultLanguage: 'en',
    supportedLanguages: ['en', 'es', 'fr', 'zh']
  },
  CA: {
    code: 'CA',
    name: 'Canada',
    flag: '🇨🇦',
    currencyCode: 'CAD',
    currencySymbol: 'C$',
    dialCode: '+1',
    termSystem: '2-Semester Academic Year',
    gradingNorm: 'Canadian Percentage & 4.0/4.3 GPA',
    dateFormat: 'YYYY-MM-DD',
    defaultLanguage: 'en',
    supportedLanguages: ['en', 'fr']
  },
  FR: {
    code: 'FR',
    name: 'France',
    flag: '🇫🇷',
    currencyCode: 'EUR',
    currencySymbol: '€',
    dialCode: '+33',
    termSystem: '3-Trimestre Academic Year',
    gradingNorm: 'Baccalauréat Français (0–20 Scale)',
    dateFormat: 'DD/MM/YYYY',
    defaultLanguage: 'fr',
    supportedLanguages: ['fr', 'en', 'es', 'de']
  },
  DE: {
    code: 'DE',
    name: 'Germany',
    flag: '🇩🇪',
    currencyCode: 'EUR',
    currencySymbol: '€',
    dialCode: '+49',
    termSystem: '2-Semester / Halbjahr',
    gradingNorm: 'German 1.0 (Sehr Gut) – 6.0 Scale',
    dateFormat: 'DD.MM.YYYY',
    defaultLanguage: 'de',
    supportedLanguages: ['de', 'en', 'fr']
  },
  ES: {
    code: 'ES',
    name: 'Spain',
    flag: '🇪🇸',
    currencyCode: 'EUR',
    currencySymbol: '€',
    dialCode: '+34',
    termSystem: '3-Trimestre LOMLOE Year',
    gradingNorm: 'Spanish 0–10 Grading Scale',
    dateFormat: 'DD/MM/YYYY',
    defaultLanguage: 'es',
    supportedLanguages: ['es', 'en', 'fr', 'pt']
  },
  BR: {
    code: 'BR',
    name: 'Brazil',
    flag: '🇧🇷',
    currencyCode: 'BRL',
    currencySymbol: 'R$',
    dialCode: '+55',
    termSystem: '4-Bimestre Academic Year',
    gradingNorm: 'Brazilian 0–10 / Concept Scale',
    dateFormat: 'DD/MM/YYYY',
    defaultLanguage: 'pt',
    supportedLanguages: ['pt', 'es', 'en']
  },
  AE: {
    code: 'AE',
    name: 'United Arab Emirates',
    flag: '🇦🇪',
    currencyCode: 'AED',
    currencySymbol: 'AED ',
    dialCode: '+971',
    termSystem: '3-Term Ministry / International Year',
    gradingNorm: 'MoE 100-Point & IB / British / US Scales',
    dateFormat: 'DD/MM/YYYY',
    defaultLanguage: 'ar',
    supportedLanguages: ['ar', 'en', 'fr', 'hi']
  },
  SA: {
    code: 'SA',
    name: 'Saudi Arabia',
    flag: '🇸🇦',
    currencyCode: 'SAR',
    currencySymbol: 'SAR ',
    dialCode: '+966',
    termSystem: '3-Semester Saudi Academic Year',
    gradingNorm: 'MoE Percentage & 5.0/4.0 GPA',
    dateFormat: 'DD/MM/YYYY',
    defaultLanguage: 'ar',
    supportedLanguages: ['ar', 'en']
  },
  IN: {
    code: 'IN',
    name: 'India',
    flag: '🇮🇳',
    currencyCode: 'INR',
    currencySymbol: '₹',
    dialCode: '+91',
    termSystem: '2-Term CBSE / ICSE / Semester Year',
    gradingNorm: '10-Point CGPA (A1–E2) & Percentage',
    dateFormat: 'DD/MM/YYYY',
    defaultLanguage: 'en',
    supportedLanguages: ['en', 'hi']
  },
  CN: {
    code: 'CN',
    name: 'China',
    flag: '🇨🇳',
    currencyCode: 'CNY',
    currencySymbol: '¥',
    dialCode: '+86',
    termSystem: '2-Semester Academic Year',
    gradingNorm: '100-Point & 4.0 University GPA',
    dateFormat: 'YYYY-MM-DD',
    defaultLanguage: 'zh',
    supportedLanguages: ['zh', 'en']
  },
  JP: {
    code: 'JP',
    name: 'Japan',
    flag: '🇯🇵',
    currencyCode: 'JPY',
    currencySymbol: '¥',
    dialCode: '+81',
    termSystem: '3-Term Academic Year (Starts April)',
    gradingNorm: '5-Point School & S/A/B/C University Scale',
    dateFormat: 'YYYY-MM-DD',
    defaultLanguage: 'ja',
    supportedLanguages: ['ja', 'en']
  },
  INTL: {
    code: 'INTL',
    name: 'Global / International',
    flag: '🌍',
    currencyCode: 'USD',
    currencySymbol: '$',
    dialCode: '+',
    termSystem: 'Flexible 2-Semester / 3-Term Global Standard',
    gradingNorm: 'International Baccalaureate (1–7) / GPA / Percentage',
    dateFormat: 'YYYY-MM-DD',
    defaultLanguage: 'en',
    supportedLanguages: ['en', 'fr', 'es', 'ar', 'pt', 'de', 'sw', 'hi', 'zh', 'ja']
  }
});

const LANGUAGE_DEFINITIONS = Object.freeze({
  en: { code: 'en', name: 'English', nativeName: 'English', speechLocale: 'en-US', rtl: false },
  fr: { code: 'fr', name: 'French', nativeName: 'Français', speechLocale: 'fr-FR', rtl: false },
  es: { code: 'es', name: 'Spanish', nativeName: 'Español', speechLocale: 'es-ES', rtl: false },
  ar: { code: 'ar', name: 'Arabic', nativeName: 'العربية', speechLocale: 'ar-SA', rtl: true },
  pt: { code: 'pt', name: 'Portuguese', nativeName: 'Português', speechLocale: 'pt-BR', rtl: false },
  de: { code: 'de', name: 'German', nativeName: 'Deutsch', speechLocale: 'de-DE', rtl: false },
  sw: { code: 'sw', name: 'Swahili', nativeName: 'Kiswahili', speechLocale: 'sw-KE', rtl: false },
  tw: { code: 'tw', name: 'Twi (Akan)', nativeName: 'Twi / Akan', speechLocale: 'en-GH', rtl: false },
  gaa: { code: 'gaa', name: 'Ga', nativeName: 'Gã', speechLocale: 'en-GH', rtl: false },
  ee: { code: 'ee', name: 'Ewe', nativeName: 'Eʋegbe', speechLocale: 'en-GH', rtl: false },
  ha: { code: 'ha', name: 'Hausa', nativeName: 'Hausa', speechLocale: 'en-NG', rtl: false },
  yo: { code: 'yo', name: 'Yoruba', nativeName: 'Yorùbá', speechLocale: 'en-NG', rtl: false },
  hi: { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी', speechLocale: 'hi-IN', rtl: false },
  zh: { code: 'zh', name: 'Chinese', nativeName: '中文', speechLocale: 'zh-CN', rtl: false },
  ja: { code: 'ja', name: 'Japanese', nativeName: '日本語', speechLocale: 'ja-JP', rtl: false }
});

function resolveCountryNorm(countryCode = 'GH') {
  const raw = String(countryCode || 'GH').trim();
  const key = raw.toUpperCase();
  if (COUNTRY_NORMS[key]) return COUNTRY_NORMS[key];

  const low = raw.toLowerCase();
  const byNameOrDial = Object.values(COUNTRY_NORMS).find(
    (c) => c.name.toLowerCase() === low || c.dialCode === raw
  );
  if (byNameOrDial) return byNameOrDial;

  const EXTENDED_FX_COUNTRIES = {
    uganda: { code: 'UG', name: 'Uganda', flag: '🇺🇬', currencyCode: 'UGX', currencySymbol: 'USh ', dialCode: '+256', defaultLanguage: 'en', currencyRateToGhs: 0.0042 },
    rwanda: { code: 'RW', name: 'Rwanda', flag: '🇷🇼', currencyCode: 'RWF', currencySymbol: 'RF ', dialCode: '+250', defaultLanguage: 'en', currencyRateToGhs: 0.0115 },
    tanzania: { code: 'TZ', name: 'Tanzania', flag: '🇹🇿', currencyCode: 'TZS', currencySymbol: 'TSh ', dialCode: '+255', defaultLanguage: 'sw', currencyRateToGhs: 0.0061 },
    "côte d'ivoire": { code: 'CI', name: "Côte d'Ivoire", flag: '🇨🇮', currencyCode: 'XOF', currencySymbol: 'CFA ', dialCode: '+225', defaultLanguage: 'fr', currencyRateToGhs: 0.026 },
    senegal: { code: 'SN', name: 'Senegal', flag: '🇸🇳', currencyCode: 'XOF', currencySymbol: 'CFA ', dialCode: '+221', defaultLanguage: 'fr', currencyRateToGhs: 0.026 },
    egypt: { code: 'EG', name: 'Egypt', flag: '🇪🇬', currencyCode: 'EGP', currencySymbol: 'E£', dialCode: '+20', defaultLanguage: 'ar', currencyRateToGhs: 0.32 },
    italy: { code: 'IT', name: 'Italy', flag: '🇮🇹', currencyCode: 'EUR', currencySymbol: '€', dialCode: '+39', defaultLanguage: 'en', currencyRateToGhs: 17.15 },
    netherlands: { code: 'NL', name: 'Netherlands', flag: '🇳🇱', currencyCode: 'EUR', currencySymbol: '€', dialCode: '+31', defaultLanguage: 'en', currencyRateToGhs: 17.15 },
    switzerland: { code: 'CH', name: 'Switzerland', flag: '🇨🇭', currencyCode: 'CHF', currencySymbol: 'CHF ', dialCode: '+41', defaultLanguage: 'de', currencyRateToGhs: 17.9 },
    australia: { code: 'AU', name: 'Australia', flag: '🇦🇺', currencyCode: 'AUD', currencySymbol: 'A$', dialCode: '+61', defaultLanguage: 'en', currencyRateToGhs: 10.35 },
    'south korea': { code: 'KR', name: 'South Korea', flag: '🇰🇷', currencyCode: 'KRW', currencySymbol: '₩', dialCode: '+82', defaultLanguage: 'en', currencyRateToGhs: 0.0114 },
    zambia: { code: 'ZM', name: 'Zambia', flag: '🇿🇲', currencyCode: 'ZMW', currencySymbol: 'ZK ', dialCode: '+260', defaultLanguage: 'en', currencyRateToGhs: 0.58 },
    zimbabwe: { code: 'ZW', name: 'Zimbabwe', flag: '🇿🇼', currencyCode: 'USD', currencySymbol: '$', dialCode: '+263', defaultLanguage: 'en', currencyRateToGhs: 15.8 }
  };
  return EXTENDED_FX_COUNTRIES[low] || COUNTRY_NORMS.GH;
}

const CURRENCY_RATE_TO_GHS = Object.freeze({
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

function getCurrencyRateToGhs(currencyOrCountry = 'GH') {
  const upper = String(currencyOrCountry || 'GH').trim().toUpperCase();
  if (CURRENCY_RATE_TO_GHS[upper]) return CURRENCY_RATE_TO_GHS[upper];
  const country = resolveCountryNorm(currencyOrCountry);
  if (country.currencyRateToGhs) return Number(country.currencyRateToGhs);
  return CURRENCY_RATE_TO_GHS[country.currencyCode] || 1.0;
}

function convertGhsToCountryCurrency(amountInGhs = 0, countryQuery = 'GH') {
  const country = resolveCountryNorm(countryQuery);
  const fxToGhs = getCurrencyRateToGhs(country.currencyCode || country.code);
  const ghsNum = Math.max(0, Number(amountInGhs) || 0);
  const localAmount = fxToGhs > 0 ? Math.round((ghsNum / fxToGhs) * 100) / 100 : ghsNum;
  return {
    countryCode: country.code,
    countryName: country.name,
    countryFlag: country.flag || '🌍',
    currencyCode: country.currencyCode,
    currencySymbol: country.currencySymbol,
    fxRateToGhs: fxToGhs,
    localCurrencyAmount: localAmount,
    convertedGhsAmount: Math.round(ghsNum * 100) / 100,
    formattedLocalAmount: `${country.currencySymbol.trim()} ${localAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
    formattedGhsAmount: `GH₵ ${(Math.round(ghsNum * 100) / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  };
}

function convertCountryCurrencyToGhs(localAmount = 0, countryOrCurrency = 'GHS') {
  const fxToGhs = getCurrencyRateToGhs(countryOrCurrency);
  const localNum = Math.max(0, Number(localAmount) || 0);
  return Math.round(localNum * fxToGhs * 100) / 100;
}

function resolveLanguageSpec(langCode = 'en') {
  const key = String(langCode || 'en').trim().toLowerCase();
  return LANGUAGE_DEFINITIONS[key] || LANGUAGE_DEFINITIONS.en;
}

module.exports = {
  COUNTRY_NORMS,
  LANGUAGE_DEFINITIONS,
  CURRENCY_RATE_TO_GHS,
  resolveCountryNorm,
  resolveLanguageSpec,
  getCurrencyRateToGhs,
  convertGhsToCountryCurrency,
  convertCountryCurrencyToGhs
};
