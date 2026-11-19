import React, { useState, useEffect } from "react";
import {
  GLOBAL_COUNTRIES,
  GLOBAL_LANGUAGES,
  getPreferredCountryCode,
  getPreferredLanguageCode,
  getCountryProfile,
  getLanguageProfile,
  setGlobalLocalePreferences,
  applyDocumentLocale
} from "../../utils/i18nCountryEngine";

/**
 * Compact Global Country & System Language Switcher
 * Works identically on Login, Onboarding, Developer Mission Control, and all 9 Portal Banners.
 */
export default function GlobalLocaleSelector({ compact = true }) {
  const [countryCode, setCountryCode] = useState(() => getPreferredCountryCode());
  const [languageCode, setLanguageCode] = useState(() => getPreferredLanguageCode());

  useEffect(() => {
    applyDocumentLocale(languageCode, countryCode);
    const onLocaleEvent = (e) => {
      if (e?.detail?.country?.code) setCountryCode(e.detail.country.code);
      if (e?.detail?.language?.code) setLanguageCode(e.detail.language.code);
    };
    window.addEventListener("gbs_locale_changed", onLocaleEvent);
    return () => window.removeEventListener("gbs_locale_changed", onLocaleEvent);
  }, []);

  const country = getCountryProfile(countryCode);
  const lang = getLanguageProfile(languageCode);

  const handleCountryChange = async (e) => {
    const nextCountryCode = e.target.value;
    const nextCountry = getCountryProfile(nextCountryCode);
    setCountryCode(nextCountry.code);
    await setGlobalLocalePreferences({ countryCode: nextCountry.code });
    if (window.showGBSOpenNotice) {
      window.showGBSOpenNotice(
        `${nextCountry.flag} ${nextCountry.name} norms active — Currency: ${nextCountry.currencyCode} (${nextCountry.currencySymbol.trim()}), Dial: ${nextCountry.dialCode}, Academic: ${nextCountry.termSystem}, Grading: ${nextCountry.gradingNorm}.`,
        "success",
        "COUNTRY NORMS UPDATED"
      );
    }
  };

  const handleLanguageChange = async (e) => {
    const nextLangCode = e.target.value;
    const nextLang = getLanguageProfile(nextLangCode);
    setLanguageCode(nextLang.code);
    await setGlobalLocalePreferences({ languageCode: nextLang.code });
    if (window.showGBSOpenNotice) {
      window.showGBSOpenNotice(
        `🌐 System language updated to ${nextLang.label} (${nextLang.rtl ? "RTL layout enabled" : "LTR layout active"}).`,
        "success",
        "SYSTEM LANGUAGE UPDATED"
      );
    }
  };

  const selectStyle = {
    background: "#081833",
    color: "#f5d061",
    border: "1px solid rgba(212, 175, 55, 0.65)",
    borderRadius: "10px",
    padding: compact ? "4px 8px" : "6px 12px",
    fontSize: compact ? "0.73rem" : "0.8rem",
    fontWeight: 800,
    cursor: "pointer",
    maxWidth: compact ? "160px" : "220px"
  };

  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "6px",
        flexWrap: "wrap",
        justifyContent: "center"
      }}
      title={`Active Regional Norms: ${country.flag} ${country.name} | Currency: ${country.currencyCode} | Academic: ${country.termSystem} | Language: ${lang.label}`}
    >
      <select
        aria-label="Select Country and Educational Norms"
        value={countryCode}
        onChange={handleCountryChange}
        style={selectStyle}
      >
        {GLOBAL_COUNTRIES.map((c) => (
          <option key={c.code} value={c.code}>
            {c.flag} {c.name} ({c.currencySymbol.trim()})
          </option>
        ))}
      </select>

      <select
        aria-label="Select Preferred System Language"
        value={languageCode}
        onChange={handleLanguageChange}
        style={selectStyle}
      >
        {GLOBAL_LANGUAGES.map((l) => (
          <option key={l.code} value={l.code}>
            🌐 {l.label}
          </option>
        ))}
      </select>
    </div>
  );
}
