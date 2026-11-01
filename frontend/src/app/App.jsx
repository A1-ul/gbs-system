import React from "react";
import AppRouter from "../router/AppRouter";
import UniversalOpenNoticeHUD from "../components/common/UniversalOpenNoticeHUD";
import UniversalAIAssistantHUD from "../components/common/UniversalAIAssistantHUD";

export default function App() {
  return (
    <>
      <UniversalOpenNoticeHUD />
      <UniversalAIAssistantHUD />
      <AppRouter />
    </>
  );
}