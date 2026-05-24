import {
  AcademicCapIcon,
  ArrowRightIcon,
  CheckCircleIcon,
  LockClosedIcon,
} from "@heroicons/react/24/outline";
import { Fragment } from "react";

import { learningModules, lessons, regressionFoundationsTrack } from "../content/learning-content";
import { getLessonLockReason, isLessonUnlocked } from "../progress/lesson-access";
import type { LearningProgress } from "../types";
import { LearningGridCanvas, LearningSheetExtensions } from "./LearningGridCanvas";
import { LearningHeader } from "./LearningHeader";
import { LiquidButton, LiquidLink } from "@/components/ui/liquid-button";

const liquidButtonClassName =
  "inline-flex items-center justify-center gap-3 rounded-none px-5 py-3 text-base font-semibold text-neutral-950 backdrop-blur-xl [--liquid-button-background-color:var(--color-neutral-200)] [--liquid-button-hover-text-color:var(--color-neutral-50)] [@media_(min-width:2200px)]:gap-4 [@media_(min-width:2200px)]:px-6 [@media_(min-width:2200px)]:py-3.5 [@media_(min-width:2200px)]:text-lg";

const disabledButtonClassName =
  "inline-flex min-h-12 w-fit cursor-not-allowed items-center justify-center gap-3 bg-neutral-200 px-5 py-3 text-base font-semibold text-muted-foreground disabled:opacity-100 [@media_(min-width:2200px)]:min-h-16 [@media_(min-width:2200px)]:gap-4 [@media_(min-width:2200px)]:px-6 [@media_(min-width:2200px)]:py-3.5 [@media_(min-width:2200px)]:text-lg";

type LearningHomeProps = {
  progress: LearningProgress;
  onResetProgress: () => void;
};

export function LearningHome({ onResetProgress, progress }: LearningHomeProps) {
  const availableLessonIds = new Set(
    learningModules
      .filter((module) => module.status === "available")
      .flatMap((module) => module.lessonIds),
  );
  const activeLessons = lessons.filter((lesson) => availableLessonIds.has(lesson.id));
  const completedLessons = progress.completedLessonIds.filter((lessonId) =>
    availableLessonIds.has(lessonId),
  ).length;
  const totalActiveLessons = activeLessons.length;
  const progressPercent =
    totalActiveLessons === 0 ? 0 : Math.round((completedLessons / totalActiveLessons) * 100);

  return (
    <LearningGridCanvas>
      <LearningHeader backHref="/explore" backLabel="Back to Explore" />

      <section
        aria-labelledby="module-list"
        className="learning-sheet route-content-transition-target mx-auto grid w-[min(1440px,calc(100%_-_48px))] grid-cols-[4rem_minmax(0,1fr)] sm:grid-cols-[6rem_minmax(0,1fr)_14rem] lg:grid-cols-[6rem_minmax(0,1fr)_14rem_24rem] [@media_(min-width:2200px)]:w-[min(1776px,calc(100%_-_96px))] [@media_(min-width:2200px)]:grid-cols-[8rem_minmax(0,1fr)_18rem_32rem]"
      >
        <LearningSheetExtensions />

        <div className="learning-sheet-cell learning-extend-left learning-extend-top col-span-2 p-6 sm:col-span-3 lg:col-span-3 [@media_(min-width:2200px)]:p-12">
          <h1 className="text-5xl leading-tight font-semibold tracking-normal text-foreground sm:text-6xl [@media_(min-width:2200px)]:text-8xl">
            {regressionFoundationsTrack.title}
          </h1>
        </div>

        <aside className="learning-sheet-cell learning-extend-right learning-sheet-cell-fill col-span-2 grid gap-5 p-6 sm:col-span-3 lg:col-span-1 lg:col-start-4 lg:row-span-2 lg:row-start-1 [@media_(min-width:2200px)]:gap-7 [@media_(min-width:2200px)]:p-12">
          <h2 className="text-xl font-semibold text-foreground [@media_(min-width:2200px)]:text-3xl">
            Progress
          </h2>
          <div className="flex items-center justify-between text-base [@media_(min-width:2200px)]:text-lg">
            <span className="text-muted-foreground">Active lessons</span>
            <span className="font-semibold text-foreground">
              {completedLessons}/{totalActiveLessons}
            </span>
          </div>
          <div
            aria-label={`Learning progress ${progressPercent}%`}
            className="learning-grid-panel-fill h-3 overflow-hidden rounded-xl [@media_(min-width:2200px)]:h-4 [@media_(min-width:2200px)]:rounded-2xl"
            role="progressbar"
            aria-valuemax={100}
            aria-valuemin={0}
            aria-valuenow={progressPercent}
          >
            <div className="h-full bg-emerald-500" style={{ width: `${progressPercent}%` }} />
          </div>
          <LiquidButton
            className={`${liquidButtonClassName} w-full cursor-pointer [--liquid-button-color:var(--color-rose-600)]`}
            onClick={onResetProgress}
            type="button"
          >
            Reset progress
          </LiquidButton>
        </aside>

        <h2
          className="learning-sheet-cell learning-extend-left col-span-2 p-6 text-3xl font-semibold tracking-normal text-foreground sm:col-span-3 lg:col-span-3 lg:col-start-1 lg:row-start-2 [@media_(min-width:2200px)]:p-12 [@media_(min-width:2200px)]:text-4xl"
          id="module-list"
        >
          Modules
        </h2>

        {learningModules.map((module, index) => {
          const isAvailable = module.status === "available";
          const moduleLessons = module.lessonIds
            .map((lessonId) => lessons.find((lesson) => lesson.id === lessonId))
            .filter((lesson) => lesson !== undefined);
          const isModuleCompleted =
            moduleLessons.length > 0 &&
            moduleLessons.every((lesson) => progress.completedLessonIds.includes(lesson.id));

          return (
            <Fragment key={module.id}>
              <div className="learning-sheet-cell learning-extend-left learning-sheet-cell-fill flex items-center justify-center p-4 text-base font-semibold text-foreground [@media_(min-width:2200px)]:p-6 [@media_(min-width:2200px)]:text-2xl">
                {index}
              </div>
              <div className="learning-sheet-cell flex min-h-24 items-center p-5 [@media_(min-width:2200px)]:min-h-32 [@media_(min-width:2200px)]:p-8">
                <h3 className="text-lg font-semibold text-foreground [@media_(min-width:2200px)]:text-2xl">
                  {module.title}
                </h3>
              </div>
              <div className="learning-sheet-cell col-span-2 flex items-center p-5 sm:col-span-1 [@media_(min-width:2200px)]:p-8">
                {isAvailable ? (
                  <div className="inline-flex w-fit items-center gap-3 text-base font-medium text-muted-foreground [@media_(min-width:2200px)]:gap-4 [@media_(min-width:2200px)]:text-lg">
                    {isModuleCompleted ? (
                      <CheckCircleIcon
                        aria-hidden="true"
                        className="size-5 text-emerald-500 [@media_(min-width:2200px)]:size-6"
                      />
                    ) : (
                      <AcademicCapIcon
                        aria-hidden="true"
                        className="size-5 text-sky-600 [@media_(min-width:2200px)]:size-6"
                      />
                    )}
                    {isModuleCompleted ? "Completed" : "Available"}
                  </div>
                ) : (
                  <button
                    aria-label={`${module.title} is locked`}
                    className={disabledButtonClassName}
                    disabled
                    type="button"
                  >
                    <LockClosedIcon
                      aria-hidden="true"
                      className="size-5 [@media_(min-width:2200px)]:size-6"
                    />
                    Locked
                  </button>
                )}
              </div>
              <div
                aria-hidden="true"
                className="learning-sheet-cell learning-extend-right hidden lg:block"
              />

              {isAvailable && moduleLessons.length > 0
                ? moduleLessons.map((lesson) => {
                    const isLessonCompleted = progress.completedLessonIds.includes(lesson.id);
                    const isUnlocked = isLessonUnlocked(lesson, progress);
                    const lockReason = getLessonLockReason(lesson, progress);

                    return (
                      <Fragment key={lesson.id}>
                        <div className="learning-sheet-cell learning-extend-left learning-sheet-cell-fill flex items-center justify-center p-4 text-sm font-medium text-muted-foreground [@media_(min-width:2200px)]:p-6 [@media_(min-width:2200px)]:text-base">
                          {lesson.numberLabel}
                        </div>
                        <div className="learning-sheet-cell flex min-h-24 items-center p-5 [@media_(min-width:2200px)]:min-h-32 [@media_(min-width:2200px)]:p-8">
                          <h4 className="text-xl leading-tight font-normal text-foreground [@media_(min-width:2200px)]:text-3xl">
                            {lesson.title}
                          </h4>
                        </div>
                        <div className="learning-sheet-cell col-span-2 flex items-center p-5 sm:col-span-1 [@media_(min-width:2200px)]:p-8">
                          {isUnlocked ? (
                            <LiquidLink
                              className={`${liquidButtonClassName} min-h-12 [--liquid-button-color:var(--color-emerald-500)] [@media_(min-width:2200px)]:min-h-16`}
                              data-app-link
                              href={`/learn/${regressionFoundationsTrack.id}/${lesson.id}`}
                            >
                              {isLessonCompleted ? "Review lesson" : "Start lesson"}
                              <ArrowRightIcon
                                aria-hidden="true"
                                className="size-5 [@media_(min-width:2200px)]:size-6"
                              />
                            </LiquidLink>
                          ) : (
                            <button
                              aria-label={lockReason}
                              className={disabledButtonClassName}
                              disabled
                              type="button"
                            >
                              <LockClosedIcon
                                aria-hidden="true"
                                className="size-5 [@media_(min-width:2200px)]:size-6"
                              />
                              Locked
                            </button>
                          )}
                        </div>
                        <div
                          aria-hidden="true"
                          className="learning-sheet-cell learning-extend-right hidden lg:block"
                        />
                      </Fragment>
                    );
                  })
                : null}
            </Fragment>
          );
        })}

        <div
          aria-hidden="true"
          className="learning-sheet-cell learning-extend-left learning-sheet-footer-cell"
        />
        <div aria-hidden="true" className="learning-sheet-cell learning-sheet-footer-cell" />
        <div
          aria-hidden="true"
          className="learning-sheet-cell learning-sheet-footer-cell hidden sm:block"
        />
        <div
          aria-hidden="true"
          className="learning-sheet-cell learning-extend-right learning-sheet-footer-cell hidden lg:block"
        />
      </section>
    </LearningGridCanvas>
  );
}
