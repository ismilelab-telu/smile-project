import { useCallback, useEffect, useState, type ReactNode } from "react";

import {
  LearningGridCanvas,
  LearningSheetExtensions,
} from "@/features/learning/components/LearningGridCanvas";
import { LearningHeader } from "@/features/learning/components/LearningHeader";

const exploreFullCellGridClassName = "col-span-full [@media_(min-width:1024px)]:col-span-3";

const modes = [
  {
    href: "/learn",
    title: "Learning Mode",
  },
  {
    href: "/playground",
    title: "ML Playground",
  },
  {
    href: "/algorithm-lab",
    title: "Algorithm Lab",
  },
] as const;

type IdleWindow = Window & {
  cancelIdleCallback?: (handle: number) => void;
  requestIdleCallback?: (callback: () => void, options?: { timeout: number }) => number;
};

type ExploreModePreviewProps = {
  animatedSrc: string;
  className?: string;
  height: number;
  objectClassName?: string;
  posterSrc: string;
  visibleMediaQuery?: string;
  width: number;
};

function getMediaQueryMatches(query?: string) {
  if (!query || typeof window === "undefined" || typeof window.matchMedia !== "function") {
    return true;
  }

  return window.matchMedia(query).matches;
}

function ExploreModePreview({
  animatedSrc,
  className = "",
  height,
  objectClassName = "object-left",
  posterSrc,
  visibleMediaQuery,
  width,
}: ExploreModePreviewProps) {
  const [isMediaVisible, setIsMediaVisible] = useState(() =>
    getMediaQueryMatches(visibleMediaQuery),
  );
  const [shouldLoadAnimation, setShouldLoadAnimation] = useState(false);
  const [isAnimationLoaded, setIsAnimationLoaded] = useState(false);
  const imageClassName = `h-full w-full object-cover ${objectClassName}`;
  const loadAnimation = useCallback(() => setShouldLoadAnimation(true), []);

  useEffect(() => {
    if (!visibleMediaQuery || typeof window.matchMedia !== "function") {
      return;
    }

    const mediaQueryList = window.matchMedia(visibleMediaQuery);
    const updateMediaVisibility = () => setIsMediaVisible(mediaQueryList.matches);

    updateMediaVisibility();
    mediaQueryList.addEventListener("change", updateMediaVisibility);

    return () => mediaQueryList.removeEventListener("change", updateMediaVisibility);
  }, [visibleMediaQuery]);

  useEffect(() => {
    if (!isMediaVisible) {
      return;
    }

    const shouldReduceMotion =
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (shouldReduceMotion) {
      return;
    }

    const idleWindow = window as IdleWindow;

    if (idleWindow.requestIdleCallback) {
      const idleId = idleWindow.requestIdleCallback(loadAnimation, { timeout: 1800 });

      return () => idleWindow.cancelIdleCallback?.(idleId);
    }

    const fallbackTimerId = window.setTimeout(loadAnimation, 900);

    return () => window.clearTimeout(fallbackTimerId);
  }, [isMediaVisible, loadAnimation]);

  return (
    <div
      aria-hidden="true"
      className={`learning-sheet-cell aspect-square overflow-hidden ${className}`}
      onPointerEnter={loadAnimation}
    >
      {isMediaVisible ? (
        <>
          <img
            alt=""
            className={imageClassName}
            decoding="async"
            height={height}
            loading="eager"
            src={posterSrc}
            width={width}
          />
          {shouldLoadAnimation ? (
            <img
              alt=""
              className={`absolute inset-0 block ${imageClassName} transition-opacity duration-300 ${
                isAnimationLoaded ? "opacity-100" : "opacity-0"
              }`}
              decoding="async"
              height={height}
              onLoad={() => setIsAnimationLoaded(true)}
              src={animatedSrc}
              width={width}
            />
          ) : null}
        </>
      ) : null}
    </div>
  );
}

function ExploreLeftGutter({ className = "" }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={`learning-sheet-cell learning-sheet-gutter-cell learning-extend-left hidden [@media_(min-width:1024px)]:block ${className}`}
    />
  );
}

function ExploreRightGutter({ className = "" }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={`learning-sheet-cell learning-sheet-gutter-cell learning-extend-right hidden [@media_(min-width:1024px)]:block ${className}`}
    />
  );
}

function ExploreSheetPatternPlane() {
  return <span aria-hidden="true" className="learning-sheet-pattern-plane" />;
}

function ExploreFullRow({
  children,
  leftClassName = "",
  rightClassName = "",
}: {
  children: ReactNode;
  leftClassName?: string;
  rightClassName?: string;
}) {
  return (
    <>
      <ExploreLeftGutter className={leftClassName} />
      {children}
      <ExploreRightGutter className={rightClassName} />
    </>
  );
}

export function ExplorePage() {
  return (
    <LearningGridCanvas>
      <LearningHeader backHref="/" backLabel="Kembali ke Beranda" />

      <div className="route-content-transition-target">
        <section
          aria-labelledby="explore-mode-list"
          className="explore-mode-sheet learning-sheet mx-auto grid w-[min(1280px,calc(100%_-_48px))] grid-cols-[minmax(0,1fr)] sm:grid-cols-3 [@media_(min-width:1024px)]:grid-cols-[2rem_repeat(3,minmax(0,1fr))_2rem]"
        >
          <LearningSheetExtensions />
          <ExploreSheetPatternPlane />

          <ExploreFullRow>
            <div
              className={`learning-sheet-cell learning-extend-left learning-extend-right learning-extend-top ${exploreFullCellGridClassName} p-6`}
            >
              <h1
                className="text-5xl leading-tight font-semibold tracking-normal text-foreground"
                id="explore-mode-list"
              >
                Choose a mode
              </h1>
            </div>
          </ExploreFullRow>

          <ExploreFullRow>
            <div
              aria-hidden="true"
              className={`learning-sheet-cell learning-extend-left learning-extend-right ${exploreFullCellGridClassName} h-12`}
            />
          </ExploreFullRow>

          <ExploreLeftGutter />
          <ExploreModePreview
            animatedSrc="/learning/explore-learning-mode-optimized.gif"
            className="learning-extend-left"
            height={640}
            posterSrc="/learning/explore-learning-mode-poster.webp"
            width={640}
          />
          <ExploreModePreview
            animatedSrc="/learning/explore-ml-playground-optimized.gif"
            height={640}
            posterSrc="/learning/explore-ml-playground-poster.webp"
            width={640}
          />
          <ExploreModePreview
            animatedSrc="/learning/explore-algorithm-lab-optimized.gif"
            className="learning-extend-right hidden sm:block"
            height={474}
            objectClassName="object-[88%_center]"
            posterSrc="/learning/explore-algorithm-lab-poster.webp"
            visibleMediaQuery="(min-width: 640px)"
            width={640}
          />
          <ExploreRightGutter />

          <ExploreLeftGutter />
          {modes.map((mode) => (
            <a
              className="explore-mode-link learning-sheet-cell flex min-h-16 items-center p-4 text-2xl leading-tight font-semibold text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-emerald-400"
              data-app-link
              href={mode.href}
              key={mode.title}
            >
              <span className="relative z-10 min-w-0">{mode.title}</span>
            </a>
          ))}
          <ExploreRightGutter />

          <ExploreLeftGutter />
          <div
            aria-hidden="true"
            className="learning-sheet-cell learning-extend-left learning-sheet-footer-cell"
          />
          <div aria-hidden="true" className="learning-sheet-cell learning-sheet-footer-cell" />
          <div aria-hidden="true" className="learning-sheet-cell learning-sheet-footer-cell" />
          <div
            aria-hidden="true"
            className="learning-sheet-cell learning-extend-right learning-sheet-footer-cell hidden sm:block"
          />
          <ExploreRightGutter />
        </section>
      </div>
    </LearningGridCanvas>
  );
}
