import { lazy, Suspense, useEffect, useRef, useState } from "react";

const ExplorePage = lazy(() =>
  import("../pages/ExplorePage").then((module) => ({ default: module.ExplorePage })),
);
const FuzzyTextPage = lazy(() =>
  import("../pages/FuzzyTextPage").then((module) => ({ default: module.FuzzyTextPage })),
);
const LandingPage = lazy(() =>
  import("../pages/LandingPage").then((module) => ({ default: module.LandingPage })),
);

const routeCoverDelayMs = 260;
const routeRevealDelayMs = 360;

function getCurrentPath() {
  return typeof window === "undefined" ? "/" : window.location.pathname;
}

function isLocalAppLink(element: HTMLAnchorElement) {
  const url = new URL(element.href);

  return url.origin === window.location.origin && element.dataset.appLink !== undefined;
}

export function App() {
  const [path, setPath] = useState(getCurrentPath);
  const [transitionOverlay, setTransitionOverlay] = useState<"hidden" | "covering" | "revealing">(
    "hidden",
  );
  const pathRef = useRef(path);
  const transitionTimersRef = useRef<number[]>([]);

  useEffect(() => {
    pathRef.current = path;
  }, [path]);

  useEffect(() => {
    if ("scrollRestoration" in window.history) {
      window.history.scrollRestoration = "manual";
    }

    const clearTransitionTimers = () => {
      transitionTimersRef.current.forEach((timer) => {
        window.clearTimeout(timer);
      });
      transitionTimersRef.current = [];
    };
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

      if (pathRef.current === "/" && url.pathname === "/explore" && !shouldReduceRouteTransition) {
        clearTransitionTimers();
        setTransitionOverlay("covering");

        const coverTimer = window.setTimeout(() => {
          navigateTo(url.pathname);
          setTransitionOverlay("revealing");
        }, routeCoverDelayMs);
        const revealTimer = window.setTimeout(() => {
          setTransitionOverlay("hidden");
        }, routeCoverDelayMs + routeRevealDelayMs);

        transitionTimersRef.current = [coverTimer, revealTimer];
        return;
      }

      clearTransitionTimers();
      setTransitionOverlay("hidden");
      navigateTo(url.pathname);
    };

    window.addEventListener("popstate", handlePopState);
    document.addEventListener("click", handleDocumentClick);

    return () => {
      window.clearTimeout(restoreGuard);
      clearTransitionTimers();
      window.removeEventListener("popstate", handlePopState);
      document.removeEventListener("click", handleDocumentClick);
    };
  }, []);

  return (
    <>
      <Suspense fallback={<main className="min-h-screen bg-background" />}>
        {path === "/" ? (
          <LandingPage />
        ) : path === "/explore" ? (
          <ExplorePage />
        ) : (
          <FuzzyTextPage path={path} />
        )}
      </Suspense>
      <div
        aria-hidden="true"
        className={`pointer-events-none fixed inset-0 z-[3000] bg-zinc-950 transition-opacity duration-300 ease-out ${
          transitionOverlay === "covering" ? "opacity-100" : "opacity-0"
        }`}
      />
    </>
  );
}
