import React, { createContext, useContext, useState, useEffect, useCallback } from "react";

const PWAContext = createContext({
  isInstallable: false,
  isInstalled: false,
  promptInstall: async () => false
});

export function PWAProvider({ children }) {
  const [deferredPrompt, setDeferredPrompt] = useState(() => {
    return typeof window !== "undefined" ? window.__gbsDeferredInstallPrompt || null : null;
  });
  const [isInstalled, setIsInstalled] = useState(() => {
    if (typeof window === "undefined") return false;
    return Boolean(window.__gbsAppInstalled || window.matchMedia?.("(display-mode: standalone)").matches);
  });

  useEffect(() => {
    if (typeof window === "undefined") return;

    const onInstallReady = () => {
      setDeferredPrompt(window.__gbsDeferredInstallPrompt);
    };

    const onAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
      window.__gbsDeferredInstallPrompt = null;
    };

    window.addEventListener("beforeinstallprompt", (e) => {
      e.preventDefault();
      window.__gbsDeferredInstallPrompt = e;
      setDeferredPrompt(e);
    });

    window.addEventListener("gbs_pwa_install_ready", onInstallReady);
    window.addEventListener("appinstalled", onAppInstalled);
    window.addEventListener("gbs_pwa_installed", onAppInstalled);

    return () => {
      window.removeEventListener("gbs_pwa_install_ready", onInstallReady);
      window.removeEventListener("appinstalled", onAppInstalled);
      window.removeEventListener("gbs_pwa_installed", onAppInstalled);
    };
  }, []);

  const promptInstall = useCallback(async () => {
    const promptObj = deferredPrompt || (typeof window !== "undefined" ? window.__gbsDeferredInstallPrompt : null);
    if (!promptObj) return false;
    try {
      const promptPromise = promptObj.prompt();
      setDeferredPrompt(null);
      window.__gbsDeferredInstallPrompt = null;
      await promptPromise;
      const { outcome } = await promptObj.userChoice;
      if (outcome === "accepted") {
        setIsInstalled(true);
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }, [deferredPrompt]);

  return (
    <PWAContext.Provider
      value={{
        isInstallable: Boolean(deferredPrompt),
        isInstalled,
        promptInstall
      }}
    >
      {children}
    </PWAContext.Provider>
  );
}

export function usePWA() {
  return useContext(PWAContext);
}

export default PWAProvider;
