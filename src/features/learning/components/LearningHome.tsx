import {
  AcademicCapIcon,
  ArrowRightIcon,
  CheckCircleIcon,
  LockClosedIcon,
} from "@heroicons/react/24/outline";

import { learningModules, lessons, regressionFoundationsTrack } from "../content/learning-content";
import type { LearningProgress } from "../types";
import { LearningHeader } from "./LearningHeader";
import { GlassSurface } from "@/components/ui/glass-surface";
import { LiquidButton, LiquidLink } from "@/components/ui/liquid-button";

const liquidButtonClassName =
  "inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold backdrop-blur-xl shadow-[inset_0_1px_0_oklch(100%_0_0_/_0.16),0_12px_32px_oklch(0%_0_0_/_0.22)] [--liquid-button-background-color:oklch(100%_0_0_/_0.08)]";

const glassCardStyle = {
  inset: 0,
  pointerEvents: "none",
  position: "absolute",
  zIndex: -1,
} as const;

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
    <main className="relative z-10 isolate min-h-screen overflow-x-hidden text-foreground">
      <div className="relative z-10">
        <LearningHeader backHref="/explore" backLabel="Back to Explore" />

        <section className="route-content-transition-target mx-auto grid w-[min(1180px,calc(100%_-_32px))] gap-8 py-10 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="flex flex-col gap-8">
            <div className="flex flex-col gap-4">
              <div className="max-w-3xl">
                <h1 className="text-4xl leading-tight font-semibold tracking-normal text-foreground sm:text-5xl">
                  {regressionFoundationsTrack.title}
                </h1>
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
                  const moduleLessons = module.lessonIds
                    .map((lessonId) => lessons.find((lesson) => lesson.id === lessonId))
                    .filter((lesson) => lesson !== undefined);
                  const isModuleCompleted =
                    moduleLessons.length > 0 &&
                    moduleLessons.every((lesson) =>
                      progress.completedLessonIds.includes(lesson.id),
                    );

                  return (
                    <article
                      className="relative isolate overflow-hidden rounded-lg p-5"
                      key={module.id}
                    >
                      <GlassSurface
                        aria-hidden="true"
                        backgroundOpacity={0.08}
                        borderRadius={8}
                        brightness={24}
                        height="100%"
                        opacity={0.55}
                        saturation={1.6}
                        style={glassCardStyle}
                        width="100%"
                      />
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex items-center gap-4">
                          <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-white/5 text-sm font-semibold text-foreground backdrop-blur-md">
                            {index}
                          </span>
                          <div className="flex min-h-10 items-center">
                            <h3 className="text-base font-semibold text-foreground">
                              {module.title}
                            </h3>
                          </div>
                        </div>
                        <div className="inline-flex w-fit items-center gap-2 rounded-lg bg-white/5 px-3 py-2 text-sm font-medium text-muted-foreground backdrop-blur-md">
                          {isAvailable ? (
                            <>
                              {isModuleCompleted ? (
                                <CheckCircleIcon
                                  aria-hidden="true"
                                  className="size-4 text-emerald-300"
                                />
                              ) : (
                                <AcademicCapIcon
                                  aria-hidden="true"
                                  className="size-4 text-sky-300"
                                />
                              )}
                              {isModuleCompleted ? "Completed" : "Available"}
                            </>
                          ) : (
                            <>
                              <LockClosedIcon aria-hidden="true" className="size-4" />
                              Locked
                            </>
                          )}
                        </div>
                      </div>
                      {isAvailable && moduleLessons.length > 0 ? (
                        <div className="mt-5 divide-y divide-border border-t border-border">
                          {moduleLessons.map((lesson) => {
                            const isLessonCompleted = progress.completedLessonIds.includes(
                              lesson.id,
                            );

                            return (
                              <div
                                className="flex flex-col gap-4 py-4 sm:flex-row sm:items-center sm:justify-between"
                                key={lesson.id}
                              >
                                <div>
                                  <p className="text-xs font-medium text-muted-foreground">
                                    {lesson.numberLabel}
                                  </p>
                                  <h4 className="mt-1 text-lg leading-tight font-semibold text-foreground">
                                    {lesson.title}
                                  </h4>
                                </div>
                                <LiquidLink
                                  className={`${liquidButtonClassName} min-h-11 text-neutral-50 [--liquid-button-color:var(--color-emerald-600)]`}
                                  data-app-link
                                  href={`/learn/${regressionFoundationsTrack.id}/${lesson.id}`}
                                >
                                  {isLessonCompleted ? "Review lesson" : "Start lesson"}
                                  <ArrowRightIcon aria-hidden="true" className="size-4" />
                                </LiquidLink>
                              </div>
                            );
                          })}
                        </div>
                      ) : null}
                    </article>
                  );
                })}
              </div>
            </section>
          </div>

          <aside className="h-fit">
            <section className="relative isolate overflow-hidden rounded-lg p-5">
              <GlassSurface
                aria-hidden="true"
                backgroundOpacity={0.08}
                borderRadius={8}
                brightness={24}
                height="100%"
                opacity={0.55}
                saturation={1.6}
                style={glassCardStyle}
                width="100%"
              />
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
              </div>
              <LiquidButton
                className={`${liquidButtonClassName} mt-5 w-full cursor-pointer text-neutral-50 [--liquid-button-color:var(--color-rose-600)]`}
                onClick={onResetProgress}
                type="button"
              >
                Reset progress
              </LiquidButton>
            </section>
          </aside>
        </section>
      </div>
    </main>
  );
}
