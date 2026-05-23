import { lazy, Suspense, useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";

import LiquidEther from "@/components/ui/liquid-ether";
import { ExplorePage } from "@/pages/ExplorePage";
import { LearningPage } from "@/pages/LearningPage";

const liquidEtherColors = ["#059669", "#10B981", "#38BDF8"];

const FuzzyTextPage = lazy(() =>
  import("../pages/FuzzyTextPage").then((module) => ({ default: module.FuzzyTextPage })),
);
const LandingPage = lazy(() =>
  import("../pages/LandingPage").then((module) => ({ default: module.LandingPage })),
);

type RouteTheme = "dark" | "light";
type RouteTransition = "back" | "content-back" | "content-forward" | "forward";
type ViewTransitionDocument = Document & {
  startViewTransition?: (callback: () => void) => { finished: Promise<void> };
};

function getRouteTheme(pathname: string): RouteTheme {
  return pathname === "/" ? "light" : "dark";
}

function getRouteOrder(pathname: string) {
  if (pathname === "/") {
    return 0;
  }

  if (pathname === "/explore") {
    return 1;
  }

  return 2;
}

function isLearningRoute(pathname: string) {
  return (
    pathname === "/learn" ||
    pathname === "/learn/track-regression-foundations" ||
    pathname.startsWith("/learn/track-regression-foundations/")
  );
}

function shouldShowSharedExploreBackground(pathname: string) {
  return pathname === "/explore" || pathname === "/learn";
}

function getRouteDirection(
  fromPath: string,
  toPath: string,
): Exclude<RouteTransition, "content-back" | "content-forward"> {
  return getRouteOrder(toPath) >= getRouteOrder(fromPath) ? "forward" : "back";
}

function getRouteTransition(fromPath: string, toPath: string): RouteTransition {
  if (fromPath === "/explore" && toPath === "/learn") {
    return "content-forward";
  }

  if (fromPath === "/learn" && toPath === "/explore") {
    return "content-back";
  }

  return getRouteDirection(fromPath, toPath);
}

function getCurrentPath() {
  return typeof window === "undefined" ? "/" : window.location.pathname;
}

function isLocalAppLink(element: HTMLAnchorElement) {
  const url = new URL(element.href);

  return url.origin === window.location.origin && element.dataset.appLink !== undefined;
}

export function App() {
  const [path, setPath] = useState(getCurrentPath);
  const hasRenderedLandingRef = useRef(false);
  const shouldSkipLandingIntro = path === "/" && hasRenderedLandingRef.current;
  const pathRef = useRef(path);

  useEffect(() => {
    pathRef.current = path;
  }, [path]);

  const handleLandingRendered = useCallback(() => {
    hasRenderedLandingRef.current = true;
  }, []);

  useLayoutEffect(() => {
    document.documentElement.dataset.routeTheme = getRouteTheme(path);
  }, [path]);

  useEffect(() => {
    if ("scrollRestoration" in window.history) {
      window.history.scrollRestoration = "manual";
    }

    const navigateTo = (pathname: string) => {
      window.history.pushState(null, "", pathname);
      setPath(pathname);
      window.scrollTo({ top: 0 });
    };
    const shouldReduceRouteTransition =
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

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

      const currentPath = pathRef.current;
      const isRouteTransition = currentPath !== url.pathname;

      if (!isRouteTransition) {
        window.scrollTo({ top: 0 });
        return;
      }

      const viewTransitionDocument = document as ViewTransitionDocument;
      const startViewTransition = viewTransitionDocument.startViewTransition?.bind(document);

      if (!shouldReduceRouteTransition && startViewTransition) {
        document.documentElement.dataset.routeTransition = getRouteTransition(
          currentPath,
          url.pathname,
        );

        try {
          const transition = startViewTransition(() => {
            flushSync(() => {
              navigateTo(url.pathname);
            });
          });

          void transition.finished.finally(() => {
            delete document.documentElement.dataset.routeTransition;
          });
        } catch {
          delete document.documentElement.dataset.routeTransition;
          navigateTo(url.pathname);
        }
        return;
      }

      navigateTo(url.pathname);
    };

    window.addEventListener("popstate", handlePopState);
    document.addEventListener("click", handleDocumentClick);

    return () => {
      window.clearTimeout(restoreGuard);
      delete document.documentElement.dataset.routeTransition;
      window.removeEventListener("popstate", handlePopState);
      document.removeEventListener("click", handleDocumentClick);
    };
  }, []);

  return (
    <>
      {shouldShowSharedExploreBackground(path) ? <SharedExploreBackground /> : null}
      <Suspense
        fallback={
          <main
            className={`min-h-screen ${
              getRouteTheme(path) === "dark" ? "bg-neutral-950" : "bg-background"
            }`}
          />
        }
      >
        {path === "/" ? (
          <LandingPage
            onRendered={handleLandingRendered}
            skipIntroAnimation={shouldSkipLandingIntro}
          />
        ) : path === "/explore" ? (
          <ExplorePage />
        ) : isLearningRoute(path) ? (
          <LearningPage path={path} />
        ) : (
          <FuzzyTextPage path={path} />
        )}
      </Suspense>
    </>
  );
}

function SharedExploreBackground() {
  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-0 bg-neutral-950">
      <LiquidEther
        autoDemo
        autoIntensity={2.2}
        autoRampDuration={0.6}
        autoResumeDelay={3000}
        autoSpeed={0.5}
        colors={liquidEtherColors}
        cursorSize={100}
        isBounce={false}
        isViscous={false}
        iterationsPoisson={32}
        iterationsViscous={32}
        mouseForce={20}
        resolution={0.5}
        takeoverDuration={0.25}
        viscous={30}
      />
    </div>
  );
}
