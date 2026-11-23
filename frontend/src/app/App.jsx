import React, { useEffect } from "react";
import AppRouter from "../router/AppRouter";
import UniversalAIAssistantHUD from "../components/common/UniversalAIAssistantHUD";
import UniversalOpenNoticeHUD from "../components/common/UniversalOpenNoticeHUD";
import AutoAppUpdater from "../components/common/AutoAppUpdater";
import MobileExperienceNoticeModal from "../components/common/MobileExperienceNoticeModal";
import UniversalLanguageTranslator from "../components/common/UniversalLanguageTranslator";
import UniversalImagePreviewLightbox from "../components/common/UniversalImagePreviewLightbox";
import { applyDashboardThemeToDocument } from "../utils/dashboardTheme";

export default function App() {
  useEffect(() => {
    // Keep per-dashboard Blueprint Light state synced (OFF by default until toggled ON per dashboard)
    applyDashboardThemeToDocument();
    const syncDashThemeOnNav = () => applyDashboardThemeToDocument();
    window.addEventListener("popstate", syncDashThemeOnNav);

    // Strictly NO TOOLTIPS: Remove native titles, data-tooltip, and hover popups across the entire DOM
    const stripNodeTitle = (node) => {
      if (!node || node.nodeType !== 1) return;
      if (node.hasAttribute("title")) {
        const titleText = node.getAttribute("title");
        if (titleText && !node.getAttribute("aria-label")) {
          node.setAttribute("aria-label", titleText);
        }
        node.removeAttribute("title");
      }
      if (node.hasAttribute("data-tooltip")) node.removeAttribute("data-tooltip");
      if (node.hasAttribute("data-tip")) node.removeAttribute("data-tip");

      const childrenWithTitle = node.querySelectorAll?.("[title], [data-tooltip], [data-tip]");
      if (childrenWithTitle && childrenWithTitle.length > 0) {
        childrenWithTitle.forEach((el) => {
          if (el.hasAttribute("title")) {
            const t = el.getAttribute("title");
            if (t && !el.getAttribute("aria-label")) {
              el.setAttribute("aria-label", t);
            }
            el.removeAttribute("title");
          }
          if (el.hasAttribute("data-tooltip")) el.removeAttribute("data-tooltip");
          if (el.hasAttribute("data-tip")) el.removeAttribute("data-tip");
        });
      }
    };

    // Strip on initial mount
    document.querySelectorAll("[title], [data-tooltip], [data-tip]").forEach(stripNodeTitle);

    // Strip on mouseover and focusin
    const stripOnEvent = (e) => {
      const target = e.target?.closest?.("[title], [data-tooltip], [data-tip]");
      if (target) stripNodeTitle(target);
    };

    // Continuous DOM mutation observer to instantly strip titles/tooltips from newly rendered elements
    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.type === "childList") {
          mutation.addedNodes.forEach(stripNodeTitle);
        } else if (
          mutation.type === "attributes" &&
          (mutation.attributeName === "title" || mutation.attributeName === "data-tooltip" || mutation.attributeName === "data-tip")
        ) {
          stripNodeTitle(mutation.target);
        }
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["title", "data-tooltip", "data-tip"]
    });

    document.addEventListener("mouseover", stripOnEvent, true);
    document.addEventListener("focusin", stripOnEvent, true);

    return () => {
      observer.disconnect();
      window.removeEventListener("popstate", syncDashThemeOnNav);
      document.removeEventListener("mouseover", stripOnEvent, true);
      document.removeEventListener("focusin", stripOnEvent, true);
    };
  }, []);

  return (
    <div className="gbs-app-container gbs-first-page-royal-theme">
      <AutoAppUpdater />
      <MobileExperienceNoticeModal />
      <UniversalOpenNoticeHUD />
      <UniversalImagePreviewLightbox />
      <AppRouter />
      <UniversalLanguageTranslator />
      <UniversalAIAssistantHUD />
    </div>
  );
}
