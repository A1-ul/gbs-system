import React from "react";
import AppRouter from "./router/AppRouter";
import UniversalOpenNoticeHUD from "./components/common/UniversalOpenNoticeHUD";
import MobileExperienceNoticeModal from "./components/common/MobileExperienceNoticeModal";
import UniversalLanguageTranslator from "./components/common/UniversalLanguageTranslator";
import GBSVoiceAssistant from "./components/common/GBSVoiceAssistant";

export default function App() {
  return (
    <>
      <UniversalOpenNoticeHUD />
      <MobileExperienceNoticeModal />
      <UniversalLanguageTranslator />
      <GBSVoiceAssistant />
      <AppRouter />
    </>
  );
}
