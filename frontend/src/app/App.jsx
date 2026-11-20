import React, { useEffect } from "react";
import AppRouter from "../router/AppRouter";
import UniversalAIAssistantHUD from "../components/common/UniversalAIAssistantHUD";
import UniversalOpenNoticeHUD from "../components/common/UniversalOpenNoticeHUD";
import AutoAppUpdater from "../components/common/AutoAppUpdater";
import MobileExperienceNoticeModal from "../components/common/MobileExperienceNoticeModal";
import UniversalLanguageTranslator from "../components/common/UniversalLanguageTranslator";

export default function App() {
  useEffect(() => {
    // Strictly NO TOOLTIPS: Remove native titles and hover popups across the entire DOM
    const stripNodeTitle = (node) => {
      if (!node || node.nodeType !== 1) return;
      if (node.hasAttribute("title")) {
        const titleText = node.getAttribute("title");
        if (titleText && !node.getAttribute("aria-label")) {
          node.setAttribute("aria-label", titleText);
        }
        node.removeAttribute("title");
      }
      const childrenWithTitle = node.querySelectorAll?.("[title]");
      if (childrenWithTitle && childrenWithTitle.length > 0) {
        childrenWithTitle.forEach((el) => {
          const t = el.getAttribute("title");
          if (t && !el.getAttribute("aria-label")) {
            el.setAttribute("aria-label", t);
          }
          el.removeAttribute("title");
        });
      }
    };

    // Strip on initial mount
    document.querySelectorAll("[title]").forEach(stripNodeTitle);

    // Strip on mouseover and focusin
    const stripOnEvent = (e) => {
      const target = e.target?.closest?.("[title]");
      if (target) stripNodeTitle(target);
    };

    // Continuous DOM mutation observer to instantly strip titles from newly rendered elements
    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.type === "childList") {
          mutation.addedNodes.forEach(stripNodeTitle);
        } else if (mutation.type === "attributes" && mutation.attributeName === "title") {
          stripNodeTitle(mutation.target);
        }
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["title"]
    });

    document.addEventListener("mouseover", stripOnEvent, true);
    document.addEventListener("focusin", stripOnEvent, true);

    return () => {
      observer.disconnect();
      document.removeEventListener("mouseover", stripOnEvent, true);
      document.removeEventListener("focusin", stripOnEvent, true);
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
