import { useEffect, useState } from "react";

import { FuzzyTextPage } from "../pages/FuzzyTextPage";
import { LandingPage } from "../pages/LandingPage";

const fuzzyTextRoutes = new Set(["/404", "/about", "/contributing", "/follow-us", "/support"]);

function getCurrentPath() {
  return typeof window === "undefined" ? "/" : window.location.pathname;
}

function isLocalAppLink(element: HTMLAnchorElement) {
  const url = new URL(element.href);

  return url.origin === window.location.origin && element.dataset.appLink !== undefined;
}

export function App() {
  const [path, setPath] = useState(getCurrentPath);

  useEffect(() => {
    if ("scrollRestoration" in window.history) {
      window.history.scrollRestoration = "manual";
    }

    window.scrollTo({ top: 0 });
    const restoreGuard = window.setTimeout(() => {
      window.scrollTo({ top: 0 });
    }, 0);

    const handlePopState = () => {
      setPath(getCurrentPath());
    };

    const handleDocumentClick = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey) {
        return;
      }

      const link = (event.target as Element | null)?.closest<HTMLAnchorElement>("a[href]");

      if (!link || !isLocalAppLink(link)) {
        return;
      }

      const url = new URL(link.href);

      event.preventDefault();
      window.history.pushState(null, "", url.pathname);
      setPath(url.pathname);
      window.scrollTo({ top: 0 });
    };

    window.addEventListener("popstate", handlePopState);
    document.addEventListener("click", handleDocumentClick);

    return () => {
      window.clearTimeout(restoreGuard);
      window.removeEventListener("popstate", handlePopState);
      document.removeEventListener("click", handleDocumentClick);
    };
  }, []);

  if (fuzzyTextRoutes.has(path) || path !== "/") {
    return <FuzzyTextPage />;
  }

  return <LandingPage />;
}
