import {
  ArrowRight02Icon,
  CheckmarkCircle02Icon,
  Clock01Icon,
  LockIcon,
  OnlineLearning01Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Fragment } from "react";

import { getModule, isLessonAvailable, lessons } from "../content/learning-content";
import {
  localizeLesson,
  localizeModule,
  localizeTrack,
} from "../content/localized-learning-content";
import { getLessonLockReason, isLessonUnlocked, isModuleUnlocked } from "../progress/lesson-access";
import type { LearningProgress, LearningTrack } from "../types";
import { LearningGridCanvas, LearningSheetExtensions } from "./LearningGridCanvas";
import { LearningHeader } from "./LearningHeader";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogPopup,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { LiquidButton, LiquidLink } from "@/components/ui/liquid-button";
import { useLocalization } from "@/features/localization/localization";

const liquidButtonClassName =
  "inline-flex items-center justify-center gap-3 rounded-none px-5 py-3 text-base font-semibold text-neutral-950 backdrop-blur-xl hover:text-neutral-50 [--liquid-button-background-color:var(--color-neutral-200)]";

const disabledButtonClassName =
  "inline-flex min-h-12 w-fit cursor-not-allowed items-center justify-center gap-3 bg-neutral-200 px-5 py-3 text-base font-semibold text-muted-foreground disabled:opacity-100";

type LearningHomeProps = {
  track: LearningTrack;
  progress: LearningProgress;
  onResetProgress: () => void;
};

export function LearningHome({ onResetProgress, progress, track }: LearningHomeProps) {
  const { locale, t } = useLocalization();
  const localizedTrack = localizeTrack(track, locale);
  const trackModules = track.moduleIds
    .map((moduleId) => getModule(moduleId))
    .filter((module) => module !== undefined);
  const activeLessons = trackModules
    .filter((module) => module.status === "available")
    .flatMap((module) =>
      module.lessonIds
        .map((lessonId) => lessons.find((lesson) => lesson.id === lessonId))
        .filter((lesson) => lesson !== undefined)
        .filter(isLessonAvailable),
    );
  const availableLessonIds = new Set(activeLessons.map((lesson) => lesson.id));
  const completedLessons = progress.completedLessonIds.filter((lessonId) =>
    availableLessonIds.has(lessonId),
  ).length;
  const totalActiveLessons = activeLessons.length;
  const progressPercent =
    totalActiveLessons === 0 ? 0 : Math.round((completedLessons / totalActiveLessons) * 100);

  return (
    <LearningGridCanvas>
      <LearningHeader backHref="/learn" backLabel="Kembali ke Jalur Belajar" />

      <section
        aria-labelledby="module-list"
        className="learning-sheet route-content-transition-target mx-auto grid w-[min(1080px,calc(100%_-_48px))] grid-cols-[4rem_5rem_minmax(0,1fr)] sm:grid-cols-[5rem_6rem_minmax(0,1fr)_14rem] lg:grid-cols-[5rem_6rem_minmax(0,1fr)_12rem_16rem]"
      >
        <LearningSheetExtensions />

        <div className="learning-sheet-cell learning-extend-left learning-extend-top col-span-3 p-6 sm:col-span-4 lg:col-span-4">
          <h1 className="text-5xl leading-tight font-semibold tracking-normal text-foreground">
            {localizedTrack.title}
          </h1>
        </div>

        <aside className="learning-sheet-cell learning-extend-right learning-sheet-cell-fill col-span-3 grid gap-5 p-6 sm:col-span-4 lg:col-span-1 lg:col-start-5 lg:row-span-2 lg:row-start-1">
          <h2 className="text-xl font-semibold text-foreground">{t("learning.home.progress")}</h2>
          <div className="flex items-center justify-between text-base">
            <span className="text-muted-foreground">{t("learning.home.activeLessons")}</span>
            <span className="font-semibold text-foreground">
              {completedLessons}/{totalActiveLessons}
            </span>
          </div>
          <div
            aria-label={t("learning.home.progressAria", { percent: progressPercent })}
            className="learning-grid-panel-fill h-3 overflow-hidden rounded-xl"
            role="progressbar"
            aria-valuemax={100}
            aria-valuemin={0}
            aria-valuenow={progressPercent}
          >
            <div className="h-full bg-emerald-500" style={{ width: `${progressPercent}%` }} />
          </div>
          <AlertDialog>
            <AlertDialogTrigger
              render={(triggerProps) => (
                <LiquidButton
                  {...triggerProps}
                  className={`${liquidButtonClassName} w-full cursor-pointer [--liquid-button-color:var(--color-rose-600)]`}
                  type="button"
                >
                  {t("learning.home.reset")}
                </LiquidButton>
              )}
            />
            <AlertDialogPopup>
              <AlertDialogHeader>
                <AlertDialogTitle>{t("learning.home.resetTitle")}</AlertDialogTitle>
                <AlertDialogDescription>
                  {t("learning.home.resetDescription")}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>{t("learning.home.resetCancel")}</AlertDialogCancel>
                <AlertDialogAction onClick={onResetProgress}>
                  {t("learning.home.reset")}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogPopup>
          </AlertDialog>
        </aside>

        <h2
          className="learning-sheet-cell learning-extend-left col-span-3 p-6 text-3xl font-semibold tracking-normal text-foreground sm:col-span-4 lg:col-span-4 lg:col-start-1 lg:row-start-2"
          id="module-list"
        >
          {t("learning.home.module")}
        </h2>

        {trackModules.map((module, index) => {
          const localizedModule = localizeModule(module, locale);
          const isAvailable = module.status === "available";
          const moduleLessons = module.lessonIds
            .map((lessonId) => lessons.find((lesson) => lesson.id === lessonId))
            .filter((lesson) => lesson !== undefined);
          const availableModuleLessons = moduleLessons.filter(isLessonAvailable);
          const isModuleCompleted =
            availableModuleLessons.length > 0 &&
            availableModuleLessons.every((lesson) =>
              progress.completedLessonIds.includes(lesson.id),
            );
          const isModuleOpen = isModuleUnlocked(module, progress);

          return (
            <Fragment key={module.id}>
              <div className="learning-sheet-cell learning-extend-left learning-sheet-cell-fill flex items-center justify-center p-4 text-base font-semibold text-foreground">
                {index}
              </div>
              <div className="learning-sheet-cell col-span-2 flex min-h-24 items-center p-5">
                <h3 className="text-lg font-semibold text-foreground">{localizedModule.title}</h3>
              </div>
              <div className="learning-sheet-cell col-span-3 flex items-center p-5 sm:col-span-1">
                {isModuleOpen ? (
                  <div className="inline-flex w-fit items-center gap-3 text-base font-medium text-muted-foreground">
                    {isModuleCompleted ? (
                      <HugeiconsIcon
                        aria-hidden="true"
                        className="size-5 text-emerald-500"
                        icon={CheckmarkCircle02Icon}
                      />
                    ) : (
                      <HugeiconsIcon
                        aria-hidden="true"
                        className="size-5 text-sky-600"
                        icon={OnlineLearning01Icon}
                      />
                    )}
                    {isModuleCompleted
                      ? t("learning.home.completed")
                      : t("learning.home.available")}
                  </div>
                ) : (
                  <div className="inline-flex w-fit items-center text-base font-medium text-muted-foreground">
                    {t("learning.home.notAvailable")}
                  </div>
                )}
              </div>
              <div
                aria-hidden="true"
                className="learning-sheet-cell learning-extend-right hidden lg:block"
              />

              {isAvailable && moduleLessons.length > 0
                ? moduleLessons.map((lesson) => {
                    const localizedLesson = localizeLesson(lesson, locale);
                    const isLessonCompleted = progress.completedLessonIds.includes(lesson.id);
                    const isLessonComingSoon = !isLessonAvailable(lesson);
                    const isUnlocked = isLessonUnlocked(lesson, progress);
                    const lockReason = getLessonLockReason(lesson, progress);

                    return (
                      <Fragment key={lesson.id}>
                        <div
                          aria-hidden="true"
                          className="learning-sheet-cell learning-extend-left learning-sheet-cell-fill"
                        />
                        <div className="learning-sheet-cell learning-sheet-cell-fill flex items-center justify-center p-4 text-base font-semibold text-neutral-700">
                          {lesson.numberLabel.replace("Lesson ", "")}
                        </div>
                        <div className="learning-sheet-cell flex min-h-24 items-center p-5">
                          <h4 className="text-xl leading-tight font-normal text-foreground">
                            {localizedLesson.title}
                          </h4>
                        </div>
                        <div className="learning-sheet-cell col-span-3 flex items-center p-5 sm:col-span-1">
                          {isLessonComingSoon ? (
                            <button className={disabledButtonClassName} disabled type="button">
                              <HugeiconsIcon
                                aria-hidden="true"
                                className="size-5"
                                icon={Clock01Icon}
                              />
                              {t("learning.home.comingSoon")}
                            </button>
                          ) : isUnlocked ? (
                            <LiquidLink
                              className={`${liquidButtonClassName} min-h-12 [--liquid-button-color:var(--color-emerald-500)]`}
                              data-app-link
                              href={`/learn/${track.id}/${lesson.id}`}
                            >
                              {isLessonCompleted
                                ? t("learning.home.review")
                                : t("learning.home.start")}
                              <HugeiconsIcon
                                aria-hidden="true"
                                className="size-5"
                                icon={ArrowRight02Icon}
                              />
                            </LiquidLink>
                          ) : (
                            <button
                              aria-label={lockReason}
                              className={disabledButtonClassName}
                              disabled
                              type="button"
                            >
                              <HugeiconsIcon
                                aria-hidden="true"
                                className="size-5"
                                icon={LockIcon}
                              />
                              {t("learning.home.locked")}
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
