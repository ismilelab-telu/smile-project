import {
  AcademicCapIcon,
  ArrowRightIcon,
  BeakerIcon,
  ChartBarIcon,
  LockClosedIcon,
} from "@heroicons/react/24/outline";

import {
  getLesson,
  getModule,
  isLessonAvailable,
  learningTracks,
} from "../content/learning-content";
import { localizeTrack } from "../content/localized-learning-content";
import type { LearningProgress, LearningTrack } from "../types";
import { LearningGridCanvas, LearningSheetExtensions } from "./LearningGridCanvas";
import { LearningHeader } from "./LearningHeader";
import { LiquidLink } from "@/components/ui/liquid-button";
import { useLocalization } from "@/features/localization/localization";

const liquidButtonClassName =
  "inline-flex items-center justify-center gap-3 rounded-none px-5 py-3 text-base font-semibold text-neutral-950 backdrop-blur-xl hover:text-neutral-50 [--liquid-button-background-color:var(--color-neutral-200)] [--liquid-button-color:var(--color-emerald-500)]";

type LearningTrackHubProps = {
  progress: LearningProgress;
};

function getTrackIcon(track: LearningTrack) {
  if (track.id === "track-regression") {
    return ChartBarIcon;
  }

  if (track.id === "track-classification") {
    return BeakerIcon;
  }

  return AcademicCapIcon;
}

function getCompletedTrackLessonCount(track: LearningTrack, progress: LearningProgress) {
  const lessonIds = new Set(
    track.moduleIds
      .map((moduleId) => getModule(moduleId))
      .filter((module) => module !== undefined && module.status === "available")
      .flatMap((module) =>
        module.lessonIds
          .map((lessonId) => getLesson(lessonId))
          .filter((lesson) => lesson !== undefined)
          .filter(isLessonAvailable)
          .map((lesson) => lesson.id),
      ),
  );

  return progress.completedLessonIds.filter((lessonId) => lessonIds.has(lessonId)).length;
}

export function LearningTrackHub({ progress }: LearningTrackHubProps) {
  const { locale, t } = useLocalization();

  return (
    <LearningGridCanvas>
      <LearningHeader backHref="/explore" backLabel="Kembali ke Explore" />

      <section
        aria-labelledby="learning-track-list"
        className="learning-sheet route-content-transition-target mx-auto grid w-[min(1440px,calc(100%_-_48px))] grid-cols-[5rem_minmax(0,1fr)_18rem]"
      >
        <LearningSheetExtensions />

        <div className="learning-sheet-cell learning-extend-left learning-extend-right learning-extend-top col-span-full p-6">
          <h1
            className="text-5xl leading-tight font-semibold tracking-normal text-foreground"
            id="learning-track-list"
          >
            {t("learning.trackHub.title")}
          </h1>
        </div>
        <div
          aria-hidden="true"
          className="learning-sheet-cell learning-extend-left learning-extend-right col-span-full h-12"
        />

        {learningTracks.map((track, index) => {
          const localizedTrack = localizeTrack(track, locale);
          const Icon = getTrackIcon(track);
          const completedLessonCount = getCompletedTrackLessonCount(track, progress);
          const isAvailable = track.status === "available";

          return (
            <div className="contents" key={track.id}>
              <div className="learning-sheet-cell learning-extend-left learning-sheet-cell-fill flex items-center justify-center p-3 text-base font-semibold text-foreground">
                {index}
              </div>
              <div className="learning-sheet-cell flex min-h-20 items-center gap-5 p-5">
                <Icon
                  aria-hidden="true"
                  className={`size-7 shrink-0 ${
                    isAvailable ? "text-emerald-500" : "text-muted-foreground"
                  }`}
                />
                <div className="min-w-0">
                  <h2 className="text-2xl leading-tight font-semibold text-foreground">
                    {localizedTrack.title}
                  </h2>
                </div>
              </div>
              <div className="learning-sheet-cell learning-extend-right flex items-center p-4">
                {isAvailable ? (
                  <LiquidLink
                    className={`${liquidButtonClassName} min-h-12`}
                    data-app-link
                    href={`/learn/${track.id}`}
                  >
                    {completedLessonCount > 0
                      ? t("learning.trackHub.continue")
                      : t("learning.trackHub.startPath")}
                    <ArrowRightIcon aria-hidden="true" className="size-5" />
                  </LiquidLink>
                ) : (
                  <button
                    className="inline-flex min-h-12 w-fit cursor-not-allowed items-center justify-center gap-3 bg-neutral-200 px-5 py-3 text-base font-semibold text-muted-foreground disabled:opacity-100"
                    disabled
                    type="button"
                  >
                    <LockClosedIcon aria-hidden="true" className="size-5" />
                    {t("learning.trackHub.comingSoon")}
                  </button>
                )}
              </div>
            </div>
          );
        })}

        <div
          aria-hidden="true"
          className="learning-sheet-cell learning-extend-left learning-sheet-footer-cell"
        />
        <div aria-hidden="true" className="learning-sheet-cell learning-sheet-footer-cell" />
        <div
          aria-hidden="true"
          className="learning-sheet-cell learning-extend-right learning-sheet-footer-cell"
        />
      </section>
    </LearningGridCanvas>
  );
}
