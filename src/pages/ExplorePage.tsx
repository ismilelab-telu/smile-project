import type { ReactNode } from "react";

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
          <div
            aria-hidden="true"
            className="learning-sheet-cell learning-extend-left aspect-square overflow-hidden"
          >
            <img
              alt=""
              className="h-full w-full object-cover object-left"
              decoding="async"
              loading="lazy"
              src="/learning/explore-learning-mode.gif"
            />
          </div>
          <div aria-hidden="true" className="learning-sheet-cell aspect-square overflow-hidden">
            <img
              alt=""
              className="h-full w-full object-cover object-left"
              decoding="async"
              loading="lazy"
              src="/learning/explore-ml-playground.gif"
            />
          </div>
          <div
            aria-hidden="true"
            className="learning-sheet-cell learning-extend-right hidden aspect-square overflow-hidden sm:block"
          >
            <img
              alt=""
              className="h-full w-full object-cover object-[88%_center]"
              decoding="async"
              loading="lazy"
              src="/learning/explore-algorithm-lab.gif"
            />
          </div>
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
