import {
  AcademicCapIcon,
  ArrowRightIcon,
  CheckCircleIcon,
  LockClosedIcon,
} from "@heroicons/react/24/outline";

import {
  activeLesson,
  learningModules,
  regressionFoundationsTrack,
} from "../content/learning-content";
import type { LearningProgress } from "../types";
import { LearningHeader } from "./LearningHeader";
import { LiquidButton, LiquidLink } from "@/components/ui/liquid-button";

const liquidButtonClassName =
  "inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold backdrop-blur-xl shadow-[inset_0_1px_0_oklch(100%_0_0_/_0.16),0_12px_32px_oklch(0%_0_0_/_0.22)] [--liquid-button-background-color:oklch(100%_0_0_/_0.08)]";

type LearningHomeProps = {
  progress: LearningProgress;
  onResetProgress: () => void;
};

export function LearningHome({ onResetProgress, progress }: LearningHomeProps) {
  const completedLessons = progress.completedLessonIds.length;
  const totalActiveLessons = 1;
  const isIntroCompleted = progress.completedLessonIds.includes(activeLesson.id);
  const progressPercent = Math.round((completedLessons / totalActiveLessons) * 100);

  return (
    <main className="min-h-screen bg-background text-foreground">
      <LearningHeader backHref="/explore" backLabel="Back to Explore" />

      <section className="mx-auto grid w-[min(1180px,calc(100%_-_32px))] gap-8 py-10 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="flex flex-col gap-8">
          <div className="flex flex-col gap-4">
            <div className="max-w-3xl">
              <h1 className="text-4xl leading-tight font-semibold tracking-normal text-foreground sm:text-5xl">
                {regressionFoundationsTrack.title}
              </h1>
              <p className="mt-4 text-base leading-7 text-muted-foreground">
                {regressionFoundationsTrack.summary}
              </p>
            </div>
          </div>

          <section aria-labelledby="module-list" className="flex flex-col gap-4">
            <div className="flex items-center justify-between gap-4">
              <h2
                className="text-2xl font-semibold tracking-normal text-foreground"
                id="module-list"
              >
                Modules
              </h2>
            </div>

            <div className="grid gap-3">
              {learningModules.map((module, index) => {
                const isAvailable = module.status === "available";
                const isActiveModule = module.lessonIds.includes(activeLesson.id);

                return (
                  <article
                    className="rounded-lg border border-border bg-surface p-5"
                    key={module.id}
                  >
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                      <div className="flex gap-4">
                        <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted text-sm font-semibold text-foreground">
                          {index}
                        </span>
                        <div>
                          <h3 className="text-base font-semibold text-foreground">
                            {module.title}
                          </h3>
                          <p className="mt-1 text-sm leading-6 text-muted-foreground">
                            {module.summary}
                          </p>
                        </div>
                      </div>
                      <div className="inline-flex w-fit items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-medium text-muted-foreground">
                        {isAvailable ? (
                          <>
                            {isIntroCompleted ? (
                              <CheckCircleIcon
                                aria-hidden="true"
                                className="size-4 text-emerald-300"
                              />
                            ) : (
                              <AcademicCapIcon aria-hidden="true" className="size-4 text-sky-300" />
                            )}
                            {isIntroCompleted ? "Completed" : "Available"}
                          </>
                        ) : (
                          <>
                            <LockClosedIcon aria-hidden="true" className="size-4" />
                            Locked
                          </>
                        )}
                      </div>
                    </div>
                    {isAvailable && isActiveModule ? (
                      <div className="mt-5 flex flex-col gap-4 border-t border-border pt-5 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <h4 className="text-lg leading-tight font-semibold text-foreground">
                            {activeLesson.title}
                          </h4>
                          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
                            {isIntroCompleted
                              ? "This module content is complete. You can review it before the next module opens."
                              : activeLesson.objective}
                          </p>
                        </div>
                        <LiquidLink
                          className={`${liquidButtonClassName} min-h-11 text-neutral-50 [--liquid-button-color:var(--color-emerald-500)]`}
                          data-app-link
                          href={`/learn/${regressionFoundationsTrack.id}/${activeLesson.id}`}
                        >
                          {isIntroCompleted ? "Review module" : "Start module"}
                          <ArrowRightIcon aria-hidden="true" className="size-4" />
                        </LiquidLink>
                      </div>
                    ) : null}
                  </article>
                );
              })}
            </div>
          </section>
        </div>

        <aside className="h-fit rounded-lg border border-border bg-surface p-5">
          <h2 className="text-lg font-semibold text-foreground">Progress</h2>
          <div className="mt-5 flex flex-col gap-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Active lessons</span>
              <span className="font-semibold text-foreground">
                {completedLessons}/{totalActiveLessons}
              </span>
            </div>
            <div
              aria-label={`Learning progress ${progressPercent}%`}
              className="h-2 overflow-hidden rounded-lg bg-muted"
              role="progressbar"
              aria-valuemax={100}
              aria-valuemin={0}
              aria-valuenow={progressPercent}
            >
              <div className="h-full bg-emerald-400" style={{ width: `${progressPercent}%` }} />
            </div>
            <p className="text-sm leading-6 text-muted-foreground">
              Progress is saved locally in this browser.
            </p>
          </div>
          <LiquidButton
            className={`${liquidButtonClassName} mt-5 w-full cursor-pointer text-neutral-50 [--liquid-button-color:var(--color-rose-600)]`}
            onClick={onResetProgress}
            type="button"
          >
            Reset progress
          </LiquidButton>
        </aside>
      </section>
    </main>
  );
}
