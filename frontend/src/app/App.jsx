import React from "react";
import AppRouter from "../router/AppRouter";
import UniversalAIAssistantHUD from "../components/common/UniversalAIAssistantHUD";
import UniversalOpenNoticeHUD from "../components/common/UniversalOpenNoticeHUD";
import UniversalHeadingTooltipHUD from "../components/common/UniversalHeadingTooltipHUD";
import AutoAppUpdater from "../components/common/AutoAppUpdater";
import MobileExperienceNoticeModal from "../components/common/MobileExperienceNoticeModal";
import UniversalLanguageTranslator from "../components/common/UniversalLanguageTranslator";

export default function App() {
  return (
    <div className="gbs-app-container gbs-first-page-royal-theme">
      <AutoAppUpdater />
      <MobileExperienceNoticeModal />
      <UniversalOpenNoticeHUD />
      <UniversalHeadingTooltipHUD />
      <AppRouter />
      <UniversalLanguageTranslator />
      <UniversalAIAssistantHUD />
    </div>
  );
}
