import {
  AcademicCapIcon,
  ArrowRightIcon,
  CheckCircleIcon,
  LockClosedIcon,
} from "@heroicons/react/24/outline";

import { learningModules, lessons, regressionFoundationsTrack } from "../content/learning-content";
import { getLessonLockReason, isLessonUnlocked } from "../progress/lesson-access";
import type { LearningProgress } from "../types";
import { LearningHeader } from "./LearningHeader";
import { GlassSurface } from "@/components/ui/glass-surface";
import { LiquidButton, LiquidLink } from "@/components/ui/liquid-button";

const liquidButtonClassName =
  "inline-flex items-center justify-center gap-3 rounded-2xl px-5 py-3 text-base font-semibold backdrop-blur-xl shadow-[inset_0_1px_0_oklch(100%_0_0_/_0.16),0_12px_32px_oklch(0%_0_0_/_0.22)] [--liquid-button-background-color:oklch(100%_0_0_/_0.08)] [@media_(min-width:2200px)]:gap-4 [@media_(min-width:2200px)]:rounded-3xl [@media_(min-width:2200px)]:px-6 [@media_(min-width:2200px)]:py-3.5 [@media_(min-width:2200px)]:text-lg";

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

        <section className="route-content-transition-target mx-auto grid w-[min(1380px,calc(100%_-_48px))] gap-10 pt-0 pb-12 lg:grid-cols-[minmax(0,1fr)_380px] [@media_(min-width:2200px)]:w-[min(1760px,calc(100%_-_112px))] [@media_(min-width:2200px)]:grid-cols-[minmax(0,1fr)_500px] [@media_(min-width:2200px)]:gap-14 [@media_(min-width:2200px)]:pb-[4.5rem]">
          <div className="flex flex-col gap-10 [@media_(min-width:2200px)]:gap-12">
            <div className="flex flex-col gap-5 [@media_(min-width:2200px)]:gap-6">
              <div className="max-w-4xl [@media_(min-width:2200px)]:max-w-6xl">
                <h1 className="text-5xl leading-tight font-semibold tracking-normal text-foreground sm:text-6xl [@media_(min-width:2200px)]:text-8xl">
                  {regressionFoundationsTrack.title}
                </h1>
              </div>
            </div>

            <section
              aria-labelledby="module-list"
              className="flex flex-col gap-5 [@media_(min-width:2200px)]:gap-7"
            >
              <div className="flex items-center justify-between gap-5">
                <h2
                  className="text-3xl font-semibold tracking-normal text-foreground [@media_(min-width:2200px)]:text-4xl"
                  id="module-list"
                >
                  Modules
                </h2>
              </div>

              <div className="grid gap-4 [@media_(min-width:2200px)]:gap-6">
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
                      className="relative isolate overflow-hidden rounded-3xl p-6 [@media_(min-width:2200px)]:p-8"
                      key={module.id}
                    >
                      <GlassSurface
                        aria-hidden="true"
                        backgroundOpacity={0.08}
                        borderRadius={24}
                        brightness={24}
                        height="100%"
                        opacity={0.55}
                        saturation={1.6}
                        style={glassCardStyle}
                        width="100%"
                      />
                      <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between [@media_(min-width:2200px)]:gap-6">
                        <div className="flex items-center gap-5 [@media_(min-width:2200px)]:gap-6">
                          <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-white/5 text-base font-semibold text-foreground backdrop-blur-md [@media_(min-width:2200px)]:size-14 [@media_(min-width:2200px)]:rounded-2xl [@media_(min-width:2200px)]:text-lg">
                            {index}
                          </span>
                          <div className="flex min-h-12 items-center [@media_(min-width:2200px)]:min-h-14">
                            <h3 className="text-lg font-semibold text-foreground [@media_(min-width:2200px)]:text-2xl">
                              {module.title}
                            </h3>
                          </div>
                        </div>
                        <div className="inline-flex w-fit items-center gap-3 rounded-xl bg-white/5 px-4 py-2.5 text-base font-medium text-muted-foreground backdrop-blur-md [@media_(min-width:2200px)]:gap-4 [@media_(min-width:2200px)]:rounded-2xl [@media_(min-width:2200px)]:px-5 [@media_(min-width:2200px)]:py-3 [@media_(min-width:2200px)]:text-lg">
                          {isAvailable ? (
                            <>
                              {isModuleCompleted ? (
                                <CheckCircleIcon
                                  aria-hidden="true"
                                  className="size-5 text-emerald-300 [@media_(min-width:2200px)]:size-6"
                                />
                              ) : (
                                <AcademicCapIcon
                                  aria-hidden="true"
                                  className="size-5 text-sky-300 [@media_(min-width:2200px)]:size-6"
                                />
                              )}
                              {isModuleCompleted ? "Completed" : "Available"}
                            </>
                          ) : (
                            <>
                              <LockClosedIcon
                                aria-hidden="true"
                                className="size-5 [@media_(min-width:2200px)]:size-6"
                              />
                              Locked
                            </>
                          )}
                        </div>
                      </div>
                      {isAvailable && moduleLessons.length > 0 ? (
                        <div className="mt-6 divide-y divide-border border-t border-border [@media_(min-width:2200px)]:mt-8">
                          {moduleLessons.map((lesson) => {
                            const isLessonCompleted = progress.completedLessonIds.includes(
                              lesson.id,
                            );
                            const isUnlocked = isLessonUnlocked(lesson, progress);
                            const lockReason = getLessonLockReason(lesson, progress);

                            return (
                              <div
                                className="flex flex-col gap-5 py-5 sm:flex-row sm:items-center sm:justify-between [@media_(min-width:2200px)]:gap-6 [@media_(min-width:2200px)]:py-6"
                                key={lesson.id}
                              >
                                <div>
                                  <p className="text-sm font-medium text-muted-foreground [@media_(min-width:2200px)]:text-base">
                                    {lesson.numberLabel}
                                  </p>
                                  <h4 className="mt-1.5 text-xl leading-tight font-semibold text-foreground [@media_(min-width:2200px)]:text-3xl">
                                    {lesson.title}
                                  </h4>
                                </div>
                                {isUnlocked ? (
                                  <LiquidLink
                                    className={`${liquidButtonClassName} min-h-12 text-neutral-50 [--liquid-button-color:var(--color-emerald-600)] [@media_(min-width:2200px)]:min-h-16`}
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
                                  <span
                                    aria-label={lockReason}
                                    className="inline-flex min-h-12 w-fit items-center justify-center gap-3 rounded-2xl bg-white/5 px-5 py-3 text-base font-semibold text-muted-foreground backdrop-blur-md [@media_(min-width:2200px)]:min-h-16 [@media_(min-width:2200px)]:gap-4 [@media_(min-width:2200px)]:rounded-3xl [@media_(min-width:2200px)]:px-6 [@media_(min-width:2200px)]:py-3.5 [@media_(min-width:2200px)]:text-lg"
                                  >
                                    <LockClosedIcon
                                      aria-hidden="true"
                                      className="size-5 [@media_(min-width:2200px)]:size-6"
                                    />
                                    Locked
                                  </span>
                                )}
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
            <section className="relative isolate overflow-hidden rounded-3xl p-6 [@media_(min-width:2200px)]:p-8">
              <GlassSurface
                aria-hidden="true"
                backgroundOpacity={0.08}
                borderRadius={24}
                brightness={24}
                height="100%"
                opacity={0.55}
                saturation={1.6}
                style={glassCardStyle}
                width="100%"
              />
              <h2 className="text-xl font-semibold text-foreground [@media_(min-width:2200px)]:text-3xl">
                Progress
              </h2>
              <div className="mt-6 flex flex-col gap-4 [@media_(min-width:2200px)]:mt-7 [@media_(min-width:2200px)]:gap-5">
                <div className="flex items-center justify-between text-base [@media_(min-width:2200px)]:text-lg">
                  <span className="text-muted-foreground">Active lessons</span>
                  <span className="font-semibold text-foreground">
                    {completedLessons}/{totalActiveLessons}
                  </span>
                </div>
                <div
                  aria-label={`Learning progress ${progressPercent}%`}
                  className="h-3 overflow-hidden rounded-xl bg-muted [@media_(min-width:2200px)]:h-4 [@media_(min-width:2200px)]:rounded-2xl"
                  role="progressbar"
                  aria-valuemax={100}
                  aria-valuemin={0}
                  aria-valuenow={progressPercent}
                >
                  <div className="h-full bg-emerald-400" style={{ width: `${progressPercent}%` }} />
                </div>
              </div>
              <LiquidButton
                className={`${liquidButtonClassName} mt-6 w-full cursor-pointer text-neutral-50 [--liquid-button-color:var(--color-rose-600)] [@media_(min-width:2200px)]:mt-7`}
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
