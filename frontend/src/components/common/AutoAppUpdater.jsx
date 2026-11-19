import { useEffect } from "react";
import { getApiBaseUrl } from "../../api/client/apiConfig";
import { applyDocumentLocale } from "../../utils/i18nCountryEngine";

const BUILD_VERSION_KEY = "gbs_active_bundle_version";
const RELOADED_VERSION_GUARD_KEY = "gbs_auto_reloaded_bundle";

/**
 * AutoAppUpdater
 * Automatically keeps desktop browsers and installed Mobile Apps (Android/iOS PWA)
 * synchronized with the newest live upgrades without requiring manual reinstalls.
 */
export default function AutoAppUpdater() {
  useEffect(() => {
    applyDocumentLocale();
    if (typeof window === "undefined") return;

    let stopped = false;

    const triggerSafeReload = (nextVersion, reasonLabel) => {
      try {
        const alreadyReloaded = sessionStorage.getItem(RELOADED_VERSION_GUARD_KEY);
        if (alreadyReloaded === nextVersion) return;
        sessionStorage.setItem(RELOADED_VERSION_GUARD_KEY, nextVersion);
        localStorage.setItem(BUILD_VERSION_KEY, nextVersion);

        if (typeof window.showGBSOpenNotice === "function") {
          window.showGBSOpenNotice(
            `Upgrading installed GBS App to latest release (${reasonLabel})...`,
            "info",
            "AUTOMATIC MOBILE & WEB UPGRADE"
          );
        }
        setTimeout(() => {
          if (!stopped) window.location.reload();
        }, 1200);
      } catch { }
    };

    const checkLiveUpgradeVersion = async () => {
      try {
        if ("serviceWorker" in navigator) {
          const reg = await navigator.serviceWorker.getRegistration();
          if (reg) {
            reg.update().catch(() => { });
            if (reg.waiting) {
              reg.waiting.postMessage({ type: "SKIP_WAITING" });
            }
          }
        }

        const res = await fetch(`${getApiBaseUrl()}/app-version`, { cache: "no-store" });
        if (!res.ok) return;
        const json = await res.json();
        const serverVer = json?.data?.bundleHash || json?.bundleHash || json?.data?.swVersion;
        if (!serverVer || serverVer === "dev-local") return;

        const currentStored = localStorage.getItem(BUILD_VERSION_KEY);
        if (!currentStored) {
          localStorage.setItem(BUILD_VERSION_KEY, serverVer);
          return;
        }
        if (currentStored !== serverVer) {
          if ("caches" in window) {
            const keys = await caches.keys();
            await Promise.all(keys.map((k) => caches.delete(k))).catch(() => { });
          }
          triggerSafeReload(serverVer, serverVer);
        }
      } catch { }
    };

    const onSwMessage = (evt) => {
      if (evt?.data?.type === "GBS_APP_UPDATED" && evt?.data?.version) {
        try {
          const prevSw = localStorage.getItem("gbs_active_sw_version");
          localStorage.setItem("gbs_active_sw_version", evt.data.version);
          if (prevSw && prevSw !== evt.data.version) {
            triggerSafeReload(evt.data.version, evt.data.version);
          }
        } catch { }
      }
    };

    const onControllerChange = () => {
      checkLiveUpgradeVersion();
    };

    const onResume = () => {
      if (!document.hidden) checkLiveUpgradeVersion();
    };

    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.addEventListener("message", onSwMessage);
      navigator.serviceWorker.addEventListener("controllerchange", onControllerChange);
    }
    window.addEventListener("online", checkLiveUpgradeVersion);
    window.addEventListener("focus", checkLiveUpgradeVersion);
    document.addEventListener("visibilitychange", onResume);

    const startupTimer = setTimeout(checkLiveUpgradeVersion, 3500);
    const pollInterval = setInterval(checkLiveUpgradeVersion, 90000);

    return () => {
      stopped = true;
      clearTimeout(startupTimer);
      clearInterval(pollInterval);
      if ("serviceWorker" in navigator) {
        navigator.serviceWorker.removeEventListener("message", onSwMessage);
        navigator.serviceWorker.removeEventListener("controllerchange", onControllerChange);
      }
      window.removeEventListener("online", checkLiveUpgradeVersion);
      window.removeEventListener("focus", checkLiveUpgradeVersion);
      document.removeEventListener("visibilitychange", onResume);
    };
  }, []);

  return null;
}
