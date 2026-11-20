import React, { useEffect } from "react";
import AppRouter from "../router/AppRouter";
import UniversalAIAssistantHUD from "../components/common/UniversalAIAssistantHUD";
import UniversalOpenNoticeHUD from "../components/common/UniversalOpenNoticeHUD";
import AutoAppUpdater from "../components/common/AutoAppUpdater";
import MobileExperienceNoticeModal from "../components/common/MobileExperienceNoticeModal";
import UniversalLanguageTranslator from "../components/common/UniversalLanguageTranslator";

export default function App() {
  useEffect(() => {
    const stripNativeTooltips = (e) => {
      const target = e.target?.closest?.("[title]");
      if (target) {
        const titleText = target.getAttribute("title");
        if (titleText && !target.getAttribute("aria-label")) {
          target.setAttribute("aria-label", titleText);
        }
        target.removeAttribute("title");
      }
    };
    document.addEventListener("mouseover", stripNativeTooltips, true);
    document.addEventListener("focusin", stripNativeTooltips, true);
    return () => {
      document.removeEventListener("mouseover", stripNativeTooltips, true);
      document.removeEventListener("focusin", stripNativeTooltips, true);
    };
  }, []);

  return (
    <div className="gbs-app-container gbs-first-page-royal-theme">
      <AutoAppUpdater />
      <MobileExperienceNoticeModal />
      <UniversalOpenNoticeHUD />
      <AppRouter />
      <UniversalLanguageTranslator />
      <UniversalAIAssistantHUD />
    </div>
  );
}
