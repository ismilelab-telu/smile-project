import { lazy, Suspense, useCallback, useEffect, useRef, useState, type ReactNode } from "react";

const ExplorePage = lazy(() =>
  import("../pages/ExplorePage").then((module) => ({ default: module.ExplorePage })),
);
const FuzzyTextPage = lazy(() =>
  import("../pages/FuzzyTextPage").then((module) => ({ default: module.FuzzyTextPage })),
);
const LandingPage = lazy(() =>
  import("../pages/LandingPage").then((module) => ({ default: module.LandingPage })),
);

const routeSlideDurationMs = 620;
type RouteTheme = "dark" | "light";
type RouteTransition = {
  direction: -1 | 1;
  fromPath: string;
  phase: "preparing" | "running";
  toPath: string;
};

function getRouteTheme(pathname: string): RouteTheme {
  return pathname === "/explore" ? "dark" : "light";
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

function getRouteDirection(fromPath: string, toPath: string): -1 | 1 {
  return getRouteOrder(toPath) >= getRouteOrder(fromPath) ? 1 : -1;
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
  const [routeTransition, setRouteTransition] = useState<RouteTransition | null>(null);
  const hasRenderedLandingRef = useRef(false);
  const pathRef = useRef(path);
  const transitionFrameRef = useRef<number | null>(null);
  const transitionTimersRef = useRef<number[]>([]);
  const shouldSkipLandingIntro = path === "/" && hasRenderedLandingRef.current;

  useEffect(() => {
    pathRef.current = path;
  }, [path]);

  const handleLandingRendered = useCallback(() => {
    hasRenderedLandingRef.current = true;
  }, []);

  useEffect(() => {
    document.documentElement.dataset.routeTheme = getRouteTheme(path);
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

      if (transitionFrameRef.current !== null) {
        window.cancelAnimationFrame(transitionFrameRef.current);
        transitionFrameRef.current = null;
      }
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
      clearTransitionTimers();
      setRouteTransition(null);
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
        clearTransitionTimers();
        setRouteTransition(null);
        window.scrollTo({ top: 0 });
        return;
      }

      if (!shouldReduceRouteTransition) {
        const toPath = url.pathname;

        clearTransitionTimers();
        setRouteTransition({
          direction: getRouteDirection(currentPath, toPath),
          fromPath: currentPath,
          phase: "preparing",
          toPath,
        });
        navigateTo(toPath);

        transitionFrameRef.current = window.requestAnimationFrame(() => {
          transitionFrameRef.current = window.requestAnimationFrame(() => {
            transitionFrameRef.current = null;
            setRouteTransition((currentTransition) =>
              currentTransition?.toPath === toPath
                ? { ...currentTransition, phase: "running" }
                : currentTransition,
            );
          });
        });

        const doneTimer = window.setTimeout(() => {
          setRouteTransition((currentTransition) =>
            currentTransition?.toPath === toPath ? null : currentTransition,
          );
        }, routeSlideDurationMs + 80);

        transitionTimersRef.current = [doneTimer];
        return;
      }

      clearTransitionTimers();
      setRouteTransition(null);
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
    <RouteStage
      onLandingRendered={handleLandingRendered}
      path={path}
      skipLandingIntro={shouldSkipLandingIntro}
      transition={routeTransition}
    />
  );
}

type RouteContentProps = {
  onLandingRendered: () => void;
  path: string;
  skipLandingIntro: boolean;
};

function RouteContent({ onLandingRendered, path, skipLandingIntro }: RouteContentProps) {
  if (path === "/") {
    return <LandingPage onRendered={onLandingRendered} skipIntroAnimation={skipLandingIntro} />;
  }

  if (path === "/explore") {
    return <ExplorePage />;
  }

  return <FuzzyTextPage path={path} />;
}

type RouteSuspenseProps = {
  children: ReactNode;
  path: string;
};

function RouteSuspense({ children, path }: RouteSuspenseProps) {
  return (
    <Suspense
      fallback={
        <main
          className={`min-h-screen ${
            getRouteTheme(path) === "dark" ? "bg-neutral-950" : "bg-background"
          }`}
        />
      }
    >
      {children}
    </Suspense>
  );
}

type RouteStageProps = {
  onLandingRendered: () => void;
  path: string;
  skipLandingIntro: boolean;
  transition: RouteTransition | null;
};

function RouteStage({ onLandingRendered, path, skipLandingIntro, transition }: RouteStageProps) {
  const isRunning = transition?.phase === "running";
  const outgoingX = transition && isRunning ? transition.direction * -100 : 0;
  const incomingX = transition ? (isRunning ? 0 : transition.direction * 100) : 0;
  const transitionLayerClassName =
    "absolute inset-0 overflow-hidden will-change-transform transition-transform duration-[620ms] ease-[cubic-bezier(0.76,0,0.24,1)]";
  const activeTransitionTheme = transition ? getRouteTheme(transition.toPath) : getRouteTheme(path);

  return (
    <div
      className={
        transition
          ? `pointer-events-none fixed inset-0 z-[3000] overflow-hidden ${
              activeTransitionTheme === "dark" ? "bg-neutral-950" : "bg-background"
            }`
          : "min-h-screen overflow-x-hidden"
      }
    >
      <div
        className={transition ? transitionLayerClassName : "min-h-screen overflow-x-hidden"}
        style={transition ? { transform: `translate3d(${incomingX}%, 0, 0)` } : undefined}
      >
        <RouteSuspense path={path}>
          <RouteContent
            onLandingRendered={onLandingRendered}
            path={path}
            skipLandingIntro={skipLandingIntro}
          />
        </RouteSuspense>
      </div>

      {transition ? (
        <div
          aria-hidden="true"
          className={transitionLayerClassName}
          style={{ transform: `translate3d(${outgoingX}%, 0, 0)` }}
        >
          <RouteSuspense path={transition.fromPath}>
            <RouteContent
              onLandingRendered={onLandingRendered}
              path={transition.fromPath}
              skipLandingIntro={transition.fromPath === "/"}
            />
          </RouteSuspense>
        </div>
      ) : null}
    </div>
  );
}
