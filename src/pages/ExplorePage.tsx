import {
  AiLearningIcon,
  AlgorithmIcon,
  ArrowRight02Icon,
  Clock01Icon,
  TestTubeIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";

import {
  LearningGridCanvas,
  LearningSheetExtensions,
} from "@/features/learning/components/LearningGridCanvas";
import { LearningHeader } from "@/features/learning/components/LearningHeader";
import { LiquidLink } from "@/components/ui/liquid-button";

const liquidButtonClassName =
  "inline-flex min-h-12 w-full items-center justify-center gap-3 rounded-none px-5 py-3 text-base font-semibold text-neutral-950 backdrop-blur-xl hover:text-neutral-50 [--liquid-button-background-color:var(--color-neutral-200)] [--liquid-button-color:var(--color-emerald-500)]";

const disabledButtonClassName =
  "inline-flex min-h-12 w-full cursor-not-allowed items-center justify-center gap-3 bg-neutral-200 px-5 py-3 text-base font-semibold whitespace-nowrap text-muted-foreground disabled:opacity-100";

const modes = [
  {
    actionLabel: "Start path",
    href: "/learn",
    icon: AiLearningIcon,
    status: "available",
    title: "Learning Mode",
  },
  {
    actionLabel: "Coming soon",
    href: "/playground",
    icon: TestTubeIcon,
    status: "coming-soon",
    title: "ML Playground",
  },
  {
    actionLabel: "Coming soon",
    href: "/algorithm-lab",
    icon: AlgorithmIcon,
    status: "coming-soon",
    title: "Algorithm Lab",
  },
] as const;

export function ExplorePage() {
  return (
    <LearningGridCanvas>
      <LearningHeader backHref="/" backLabel="Kembali ke Beranda" />

      <section
        aria-labelledby="explore-mode-list"
        className="learning-sheet route-content-transition-target mx-auto grid w-[min(1080px,calc(100%_-_48px))] grid-cols-[4rem_minmax(0,1fr)] sm:grid-cols-[5rem_minmax(0,1fr)_14rem]"
      >
        <LearningSheetExtensions />

        <div className="learning-sheet-cell learning-extend-left learning-extend-right learning-extend-top col-span-full p-6">
          <h1
            className="text-5xl leading-tight font-semibold tracking-normal text-foreground"
            id="explore-mode-list"
          >
            Choose a mode
          </h1>
        </div>

        <div
          aria-hidden="true"
          className="learning-sheet-cell learning-extend-left learning-extend-right col-span-full h-12"
        />

        {modes.map((mode, index) => (
          <div className="contents" key={mode.title}>
            <div className="learning-sheet-cell learning-extend-left learning-sheet-cell-fill flex items-center justify-center p-3 text-base font-semibold text-foreground">
              {index}
            </div>
            <div className="learning-sheet-cell flex min-h-24 items-center gap-5 p-5">
              <HugeiconsIcon
                aria-hidden="true"
                className={`size-7 shrink-0 ${
                  mode.status === "available" ? "text-emerald-500" : "text-muted-foreground"
                }`}
                icon={mode.icon}
              />
              <h2 className="min-w-0 text-2xl leading-tight font-semibold text-foreground">
                {mode.title}
              </h2>
            </div>
            <div className="learning-sheet-cell learning-extend-right col-span-2 flex items-center p-4 sm:col-span-1">
              {mode.status === "available" ? (
                <LiquidLink className={liquidButtonClassName} data-app-link href={mode.href}>
                  {mode.actionLabel}
                  <HugeiconsIcon aria-hidden="true" className="size-5" icon={ArrowRight02Icon} />
                </LiquidLink>
              ) : (
                <button className={disabledButtonClassName} disabled type="button">
                  <HugeiconsIcon aria-hidden="true" className="size-5" icon={Clock01Icon} />
                  {mode.actionLabel}
                </button>
              )}
            </div>
          </div>
        ))}

        <div
          aria-hidden="true"
          className="learning-sheet-cell learning-extend-left learning-sheet-footer-cell"
        />
        <div aria-hidden="true" className="learning-sheet-cell learning-sheet-footer-cell" />
        <div
          aria-hidden="true"
          className="learning-sheet-cell learning-extend-right learning-sheet-footer-cell hidden sm:block"
        />
      </section>
    </LearningGridCanvas>
  );
}
