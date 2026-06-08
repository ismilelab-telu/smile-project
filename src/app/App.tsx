import { lazy, Suspense, useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";

import { ExternalLinkGuard } from "@/components/ExternalLinkGuard";
import { LinkPreviewProvider } from "@/components/ui/link-preview";
import { AuthProvider, useAuth } from "@/features/auth/auth-context";
import {
  consumeGoogleOAuthReturnTo,
  consumeMicrosoftOAuthReturnTo,
  getGoogleOAuthRedirectUri,
  getMicrosoftOAuthRedirectUri,
  googleOAuthCallbackPath,
  microsoftOAuthCallbackPath,
} from "@/features/auth/google-oauth-return";
import {
  getLesson,
  getModule,
  getTrack,
  isLessonAvailable,
} from "@/features/learning/content/learning-content";
import { LocalizationProvider, useLocalization } from "@/features/localization/localization";
import { AuthPage } from "@/pages/AuthPage";
import { ExplorePage } from "@/pages/ExplorePage";

const FuzzyTextPage = lazy(() =>
  import("../pages/FuzzyTextPage").then((module) => ({ default: module.FuzzyTextPage })),
);
const LandingPage = lazy(() =>
  import("../pages/LandingPage").then((module) => ({ default: module.LandingPage })),
);
const LearningPage = lazy(() =>
  import("../pages/LearningPage").then((module) => ({ default: module.LearningPage })),
);

type RouteTheme = "dark" | "light";
type RouteTransition = "back" | "forward";
type AuthMode = "login" | "register";
type PendingLearningAuthGate = {
  backgroundPath: string;
  mode: AuthMode;
  successHref: string;
};
type ViewTransitionDocument = Document & {
  startViewTransition?: (callback: () => void) => { finished: Promise<void> };
};
const routeScrollStorageKeyPrefix = "smile-route-scroll:";
const maxRouteScrollRestoreAttempts = 90;
const lightPlaceholderRoutes = new Set(["/playground", "/algorithm-lab"]);

function getRouteTheme(pathname: string): RouteTheme {
  return pathname === "/" ||
    pathname === "/explore" ||
    lightPlaceholderRoutes.has(pathname) ||
    isLearningRoute(pathname) ||
    isAuthRoute(pathname)
    ? "light"
    : "dark";
}

function getRouteOrder(pathname: string) {
  if (pathname === "/") {
    return 0;
  }

  if (pathname === "/explore") {
    return 1;
  }

  if (isLearningRoute(pathname)) {
    return 2 + Math.min(pathname.split("/").filter(Boolean).length, 3);
  }

  if (isAuthRoute(pathname)) {
    return 2;
  }

  return 2;
}

function isLearningRoute(pathname: string) {
  return pathname === "/learn" || pathname.startsWith("/learn/");
}

function isLearningLessonRoute(pathname: string) {
  const parts = pathname.split("/").filter(Boolean);

  return parts[0] === "learn" && parts.length === 3;
}

function isLearningAuthRequiredRoute(pathname: string) {
  const parts = pathname.split("/").filter(Boolean);
  const trackId = parts[1];
  const lessonId = parts[2];

  if (parts[0] !== "learn" || parts.length !== 3 || !trackId || !lessonId) {
    return false;
  }

  const track = getTrack(trackId);
  const lesson = getLesson(lessonId);
  const lessonModule = lesson ? getModule(lesson.moduleId) : undefined;
  const isLessonInTrack =
    track !== undefined &&
    lesson !== undefined &&
    lessonModule !== undefined &&
    track.moduleIds.includes(lesson.moduleId) &&
    lessonModule.lessonIds.includes(lesson.id);

  if (!lesson || !isLessonInTrack || !isLessonAvailable(lesson)) {
    return false;
  }

  return (lesson.exercises ?? [lesson.exercise]).some(
    (exercise) => exercise.type === "guided-download",
  );
}

function isAuthRoute(pathname: string) {
  return (
    pathname === "/login" ||
    pathname === "/register" ||
    pathname === googleOAuthCallbackPath ||
    pathname === microsoftOAuthCallbackPath
  );
}

function getRouteDirection(fromPath: string, toPath: string): RouteTransition {
  return getRouteOrder(toPath) >= getRouteOrder(fromPath) ? "forward" : "back";
}

function getRouteScrollStorageKey(pathname: string) {
  return `${routeScrollStorageKeyPrefix}${pathname}`;
}

function getNavigationType() {
  const [navigationEntry] = window.performance.getEntriesByType(
    "navigation",
  ) as PerformanceNavigationTiming[];

  return navigationEntry?.type;
}

function getSavedRouteScroll(pathname: string) {
  if (!isLearningLessonRoute(pathname) || getNavigationType() !== "reload") {
    return null;
  }

  try {
    const savedScroll = Number(window.sessionStorage.getItem(getRouteScrollStorageKey(pathname)));

    return Number.isFinite(savedScroll) && savedScroll > 0 ? savedScroll : null;
  } catch {
    return null;
  }
}

function saveRouteScroll(pathname: string) {
  if (!isLearningLessonRoute(pathname)) {
    return;
  }

  try {
    const storageKey = getRouteScrollStorageKey(pathname);

    if (window.scrollY > 0) {
      window.sessionStorage.setItem(storageKey, String(Math.round(window.scrollY)));
    } else {
      window.sessionStorage.removeItem(storageKey);
    }
  } catch {
    // Session storage can be unavailable in restricted browser contexts.
  }
}

function restoreRouteScroll(scrollY: number) {
  let animationFrameId = 0;
  let attempts = 0;

  const restore = () => {
    window.scrollTo({ top: scrollY });
    attempts += 1;

    const canReachScrollPosition =
      document.documentElement.scrollHeight >= scrollY + window.innerHeight;
    const isRestored = Math.abs(window.scrollY - scrollY) <= 2;

    if (attempts < maxRouteScrollRestoreAttempts && (!canReachScrollPosition || !isRestored)) {
      animationFrameId = window.requestAnimationFrame(restore);
    }
  };

  animationFrameId = window.requestAnimationFrame(restore);

  return () => {
    window.cancelAnimationFrame(animationFrameId);
  };
}

function getCurrentPath() {
  return typeof window === "undefined" ? "/" : window.location.pathname;
}

function isLocalAppLink(element: HTMLAnchorElement) {
  const url = new URL(element.href);

  return url.origin === window.location.origin && element.dataset.appLink !== undefined;
}

export function App() {
  return (
    <LocalizationProvider>
      <AuthProvider>
        <LinkPreviewProvider>
          <ExternalLinkGuard />
          <AppRoutes />
        </LinkPreviewProvider>
      </AuthProvider>
    </LocalizationProvider>
  );
}

function AppRoutes() {
  const { isAuthenticated } = useAuth();
  const { locale } = useLocalization();
  const [path, setPath] = useState(getCurrentPath);
  const [backgroundPath, setBackgroundPath] = useState(() => {
    const currentPath = getCurrentPath();

    return isAuthRoute(currentPath) ? "/learn" : currentPath;
  });
  const [pendingLearningAuthGate, setPendingLearningAuthGate] =
    useState<PendingLearningAuthGate | null>(null);
  const hasRenderedLandingRef = useRef(false);
  const visiblePath = isAuthRoute(path) ? backgroundPath : path;
  const shouldSkipLandingIntro = visiblePath === "/" && hasRenderedLandingRef.current;
  const pathRef = useRef(path);
  const backgroundPathRef = useRef(backgroundPath);
  const isAuthenticatedRef = useRef(isAuthenticated);

  useEffect(() => {
    pathRef.current = path;
  }, [path]);

  useEffect(() => {
    backgroundPathRef.current = backgroundPath;
  }, [backgroundPath]);

  useEffect(() => {
    isAuthenticatedRef.current = isAuthenticated;
  }, [isAuthenticated]);

  const handleLandingRendered = useCallback(() => {
    hasRenderedLandingRef.current = true;
  }, []);

  useLayoutEffect(() => {
    document.documentElement.dataset.routeTheme = getRouteTheme(visiblePath);
  }, [visiblePath]);

  useEffect(() => {
    if ("scrollRestoration" in window.history) {
      window.history.scrollRestoration = "manual";
    }

    const navigateTo = (pathname: string) => {
      const currentPath = pathRef.current;

      window.history.pushState(null, "", pathname);
      setPath(pathname);

      if (isAuthRoute(pathname)) {
        if (!isAuthRoute(currentPath)) {
          backgroundPathRef.current = currentPath;
          setBackgroundPath(currentPath);
        }
        return;
      }

      backgroundPathRef.current = pathname;
      setBackgroundPath(pathname);
      window.scrollTo({ top: 0 });
    };
    const shouldReduceRouteTransition =
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const savedRouteScroll = getSavedRouteScroll(pathRef.current);
    const cleanupInitialScroll = savedRouteScroll
      ? restoreRouteScroll(savedRouteScroll)
      : (() => {
          window.scrollTo({ top: 0 });
          const restoreGuard = window.setTimeout(() => {
            window.scrollTo({ top: 0 });
          }, 0);

          return () => {
            window.clearTimeout(restoreGuard);
          };
        })();

    const handlePopState = () => {
      const nextPath = getCurrentPath();

      setPath(nextPath);

      if (!isAuthRoute(nextPath)) {
        backgroundPathRef.current = nextPath;
        setBackgroundPath(nextPath);
      }
    };

    const handlePageHide = () => {
      saveRouteScroll(pathRef.current);
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

      if (
        !isAuthenticatedRef.current &&
        !isAuthRoute(currentPath) &&
        isLearningAuthRequiredRoute(url.pathname)
      ) {
        setPendingLearningAuthGate({
          backgroundPath: currentPath,
          mode: "login",
          successHref: url.pathname,
        });
        return;
      }

      const viewTransitionDocument = document as ViewTransitionDocument;
      const startViewTransition = viewTransitionDocument.startViewTransition?.bind(document);
      const involvesAuthRoute = isAuthRoute(currentPath) || isAuthRoute(url.pathname);
      const routeTransition = getRouteDirection(currentPath, url.pathname);

      if (!shouldReduceRouteTransition && startViewTransition && !involvesAuthRoute) {
        document.documentElement.dataset.routeTransition = routeTransition;

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
    window.addEventListener("pagehide", handlePageHide);
    document.addEventListener("click", handleDocumentClick);

    return () => {
      cleanupInitialScroll();
      delete document.documentElement.dataset.routeTransition;
      window.removeEventListener("popstate", handlePopState);
      window.removeEventListener("pagehide", handlePageHide);
      document.removeEventListener("click", handleDocumentClick);
    };
  }, []);

  return (
    <>
      <Suspense
        fallback={
          <main
            className={`min-h-screen ${
              getRouteTheme(visiblePath) === "dark" ? "bg-neutral-950" : "bg-background"
            }`}
          />
        }
      >
        {visiblePath === "/" ? (
          <LandingPage
            onRendered={handleLandingRendered}
            skipIntroAnimation={shouldSkipLandingIntro}
          />
        ) : visiblePath === "/explore" ? (
          <ExplorePage />
        ) : isLearningRoute(visiblePath) ? (
          <LearningPage path={visiblePath} />
        ) : (
          <FuzzyTextPage path={visiblePath} />
        )}
      </Suspense>
      {path === "/login" ? (
        <AuthPage closeHref={backgroundPath} mode="login" />
      ) : path === "/register" ? (
        <AuthPage closeHref={backgroundPath} mode="register" />
      ) : path === googleOAuthCallbackPath ? (
        <OAuthCallbackPage provider="google" />
      ) : path === microsoftOAuthCallbackPath ? (
        <OAuthCallbackPage provider="microsoft" />
      ) : null}
      {pendingLearningAuthGate ? (
        <AuthPage
          closeHref={pendingLearningAuthGate.backgroundPath}
          mode={pendingLearningAuthGate.mode}
          onAuthenticated={() => setPendingLearningAuthGate(null)}
          onClose={() => setPendingLearningAuthGate(null)}
          onModeChange={(mode) =>
            setPendingLearningAuthGate((current) => (current ? { ...current, mode } : current))
          }
          successHref={pendingLearningAuthGate.successHref}
          titleOverride={
            pendingLearningAuthGate.mode === "login"
              ? locale === "en"
                ? "Sign in first"
                : "Masuk terlebih dahulu"
              : undefined
          }
        />
      ) : null}
    </>
  );
}

function OAuthCallbackPage({ provider }: { provider: "google" | "microsoft" }) {
  const auth = useAuth();
  const { locale } = useLocalization();
  const hasStartedRef = useRef(false);
  const [errorMessage, setErrorMessage] = useState("");
  const providerLabel = provider === "google" ? "Google" : "Microsoft";
  const providerLabelId = provider === "google" ? "Google" : "Microsoft";

  useEffect(() => {
    if (hasStartedRef.current) {
      return;
    }

    hasStartedRef.current = true;
    const params = new URLSearchParams(window.location.search);
    const code = params.get("code") ?? "";
    const state = params.get("state") ?? "";
    const oauthError = params.get("error") ?? "";
    const oauthErrorDescription = params.get("error_description") ?? "";

    if (oauthError) {
      setErrorMessage(
        oauthErrorDescription ||
          (locale === "en"
            ? `${providerLabel} sign-in was canceled or rejected.`
            : `Login ${providerLabelId} dibatalkan atau ditolak.`),
      );
      return;
    }

    if (!code || !state) {
      setErrorMessage(
        locale === "en"
          ? `${providerLabel} did not return a complete sign-in response.`
          : `${providerLabelId} tidak mengirim respons login yang lengkap.`,
      );
      return;
    }

    const completeSignIn =
      provider === "google" ? auth.completeGoogleSignIn : auth.completeMicrosoftSignIn;
    const redirectUri =
      provider === "google" ? getGoogleOAuthRedirectUri() : getMicrosoftOAuthRedirectUri();
    const consumeReturnTo =
      provider === "google" ? consumeGoogleOAuthReturnTo : consumeMicrosoftOAuthReturnTo;

    void completeSignIn({
      code,
      redirectUri,
      state,
    })
      .then(() => {
        navigateInApp(consumeReturnTo("/learn"), { replace: true });
      })
      .catch((error) => {
        setErrorMessage(
          error instanceof Error
            ? error.message
            : locale === "en"
              ? `${providerLabel} sign-in could not be completed.`
              : `Login ${providerLabelId} belum berhasil diselesaikan.`,
        );
      });
  }, [auth, locale, provider, providerLabel, providerLabelId]);

  const handleBackToLogin = () => {
    navigateInApp("/login", { replace: true });
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-white/80 px-4 backdrop-blur-md supports-[backdrop-filter]:bg-white/65"
      role="status"
    >
      <main className="w-full max-w-sm border-2 border-neutral-950 bg-white p-7 text-center text-foreground shadow-2xl">
        <h1 className="text-2xl leading-tight font-semibold tracking-normal">
          {errorMessage
            ? locale === "en"
              ? `${providerLabel} sign-in failed`
              : `Login ${providerLabelId} gagal`
            : locale === "en"
              ? `Finishing ${providerLabel} sign-in`
              : `Menyelesaikan login ${providerLabelId}`}
        </h1>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          {errorMessage || (locale === "en" ? "Please wait a moment." : "Tunggu sebentar.")}
        </p>
        {errorMessage ? (
          <button
            className="mt-7 inline-flex h-10 w-full cursor-pointer items-center justify-center rounded-none bg-zinc-900 px-4 text-sm font-medium text-white transition-colors hover:bg-zinc-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-300"
            onClick={handleBackToLogin}
            type="button"
          >
            {locale === "en" ? "Back to sign in" : "Kembali masuk"}
          </button>
        ) : null}
      </main>
    </div>
  );
}

function navigateInApp(pathname: string, { replace = false }: { replace?: boolean } = {}) {
  if (replace) {
    window.history.replaceState(null, "", pathname);
  } else {
    window.history.pushState(null, "", pathname);
  }

  window.dispatchEvent(new PopStateEvent("popstate"));
}
