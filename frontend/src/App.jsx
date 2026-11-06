import React from "react";
import AppRouter from "./router/AppRouter";
import UniversalOpenNoticeHUD from "./components/common/UniversalOpenNoticeHUD";
import MobileExperienceNoticeModal from "./components/common/MobileExperienceNoticeModal";

export default function App() {
  return (
    <>
      <UniversalOpenNoticeHUD />
      <MobileExperienceNoticeModal />
      <AppRouter />
    </>
  );
}
