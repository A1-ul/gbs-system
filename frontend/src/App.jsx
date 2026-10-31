import React from "react";
import AppRouter from "./router/AppRouter";
import UniversalOpenNoticeHUD from "./components/common/UniversalOpenNoticeHUD";

export default function App() {
  return (
    <>
      <UniversalOpenNoticeHUD />
      <AppRouter />
    </>
  );
}
