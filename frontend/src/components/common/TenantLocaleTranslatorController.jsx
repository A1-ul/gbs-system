import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import {
  applyDocumentLocale,
  getPreferredCountryCode,
  getPreferredLanguageCode,
  syncTenantLocaleFromServer
} from "../../utils/i18nCountryEngine";
import { stopAndRestoreEnglishForDeveloper } from "../../utils/domTranslator";

/**
 * Global Route-Aware Institution Language & DOM Translation Coordinator
 * - Translates all written UI text across Tenant School Portals & Public Screens
 *   according to the Headmaster / Institution or User preferred language.
 * - Strictly excludes Developer Control Center / Developer Dashboard routes,
 *   always keeping the Developer Dashboard immutable in Standard English (LTR).
 */
export default function TenantLocaleTranslatorController() {
  const location = useLocation();

  useEffect(() => {
    const pathname = String(location.pathname || "").toLowerCase();
    const isDevRoute =
      pathname === "/developer" ||
      pathname.startsWith("/developer/") ||
      pathname.startsWith("/developer-control-center");

    if (isDevRoute) {
      stopAndRestoreEnglishForDeveloper();
      return undefined;
    }

    // Apply cached/active locale cleanly right away on route change
    applyDocumentLocale(getPreferredLanguageCode(), getPreferredCountryCode());

    const isPublicAuthRoute =
      pathname === "/login" ||
      pathname.startsWith("/login/") ||
      pathname === "/signup" ||
      pathname.startsWith("/signup/");

    let pollTimer = null;
    if (!isPublicAuthRoute) {
      // Sync tenant institution language immediately on route mount and periodically
      syncTenantLocaleFromServer();
      pollTimer = setInterval(() => {
        if (document.visibilityState !== "hidden") {
          syncTenantLocaleFromServer();
        }
      }, 12000);

      const handleFocus = () => syncTenantLocaleFromServer();
      window.addEventListener("focus", handleFocus);

      return () => {
        if (pollTimer) clearInterval(pollTimer);
        window.removeEventListener("focus", handleFocus);
      };
    }

    return undefined;
  }, [location.pathname]);

  useEffect(() => {
    const onLocaleChanged = () => {
      const pathname = String(window.location?.pathname || "").toLowerCase();
      if (
        pathname === "/developer" ||
        pathname.startsWith("/developer/") ||
        pathname.startsWith("/developer-control-center")
      ) {
        stopAndRestoreEnglishForDeveloper();
        return;
      }
      applyDocumentLocale(getPreferredLanguageCode(), getPreferredCountryCode());
    };

    const onStorage = (e) => {
      if (e?.key && e.key.startsWith("gbs_preferred_")) {
        onLocaleChanged();
      }
    };

    window.addEventListener("gbs_locale_changed", onLocaleChanged);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener("gbs_locale_changed", onLocaleChanged);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  return null;
}
