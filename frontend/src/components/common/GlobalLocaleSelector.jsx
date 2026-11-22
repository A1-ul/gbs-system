import React, { useState, useEffect } from "react";
import {
  GLOBAL_COUNTRIES,
  GLOBAL_LANGUAGES,
  HEADMASTER_ROLES,
  isDeveloperPortalContext,
  resolveCurrentUserRole,
  getPreferredCountryCode,
  getPreferredLanguageCode,
  getCountryProfile,
  getLanguageProfile,
  setGlobalLocalePreferences,
  applyDocumentLocale
} from "../../utils/i18nCountryEngine";

/**
 * Compact Global Country & System Language Switcher
 * - On Tenant Portals: Headmaster sets the institution-wide language across the entire school (Staff, Teachers, Students, Parents, Bursar, HR, Alumni).
 * - On Developer Dashboard: Strictly locked to Standard English (excluded from institution translation).
 */
export default function GlobalLocaleSelector({ compact = true, lockedDeveloperEnglish = false }) {
  const isDevLocked = lockedDeveloperEnglish || isDeveloperPortalContext();
  const [countryCode, setCountryCode] = useState(() => (isDevLocked ? "GH" : getPreferredCountryCode()));
  const [languageCode, setLanguageCode] = useState(() => (isDevLocked ? "en" : getPreferredLanguageCode()));

  useEffect(() => {
    if (isDevLocked) {
      applyDocumentLocale("en", "GH");
      return;
    }
    const latestLang = getPreferredLanguageCode();
    const latestCountry = getPreferredCountryCode();
    if (latestLang !== languageCode) setLanguageCode(latestLang);
    if (latestCountry !== countryCode) setCountryCode(latestCountry);
    applyDocumentLocale(latestLang, latestCountry);
    const onLocaleEvent = (e) => {
      if (isDeveloperPortalContext()) return;
      if (e?.detail?.country?.code) setCountryCode(e.detail.country.code);
      if (e?.detail?.language?.code) setLanguageCode(e.detail.language.code);
    };
    window.addEventListener("gbs_locale_changed", onLocaleEvent);
    return () => window.removeEventListener("gbs_locale_changed", onLocaleEvent);
  }, [isDevLocked]);

  if (isDevLocked) {
    return (
      <div
        data-gbs-no-translate="true"
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "6px",
          padding: compact ? "4px 10px" : "6px 12px",
          borderRadius: "10px",
          background: "#081833",
          color: "#93c5fd",
          border: "1px solid rgba(56, 189, 248, 0.45)",
          fontSize: compact ? "0.73rem" : "0.8rem",
          fontWeight: 800
        }}
      >
        <span>🌐 English (Developer Standard • Immutable)</span>
      </div>
    );
  }

  const country = getCountryProfile(countryCode);
  const lang = getLanguageProfile(languageCode);
  const role = resolveCurrentUserRole();
  const isHeadmaster = HEADMASTER_ROLES.has(role);

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
    await setGlobalLocalePreferences({
      languageCode: nextLang.code,
      scope: isHeadmaster ? "TENANT" : "USER"
    });
    if (window.showGBSOpenNotice) {
      window.showGBSOpenNotice(
        isHeadmaster
          ? `🌐 Institution-wide system language updated to ${nextLang.label} (${nextLang.rtl ? "RTL layout enabled" : "LTR layout active"}). All staff, teachers, students, parents, accountant & HR dashboards for this school now follow this language (Developer Dashboard unchanged).`
          : `🌐 System language updated to ${nextLang.label} (${nextLang.rtl ? "RTL layout enabled" : "LTR layout active"}).`,
        "success",
        isHeadmaster ? "INSTITUTION LANGUAGE UPDATED" : "SYSTEM LANGUAGE UPDATED"
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
      data-gbs-no-translate="true"
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "6px",
        flexWrap: "wrap",
        justifyContent: "center"
      }}
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
