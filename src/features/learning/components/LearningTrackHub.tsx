import { ArrowRight02Icon, LockIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import type { ReactNode } from "react";

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

const trackHubFullCellGridClassName = "col-span-full [@media_(min-width:1024px)]:col-span-3";

const trackImageSources: Partial<Record<LearningTrack["id"], string>> = {
  "track-classification": "/learning/removedbg-classification.webp",
  "track-clustering": "/learning/removedbg-clustering.webp",
  "track-machine-learning-foundations": "/learning/removedbg-ml.webp",
  "track-regression": "/learning/removedbg-linear.webp",
};

const trackImageClassNames: Partial<Record<LearningTrack["id"], string>> = {
  "track-machine-learning-foundations": "object-cover object-center",
};

type LearningTrackHubProps = {
  progress: LearningProgress;
};

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

function TrackHubLeftGutter({ className = "" }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={`learning-sheet-cell learning-sheet-gutter-cell learning-extend-left hidden [@media_(min-width:1024px)]:block ${className}`}
    />
  );
}

function TrackHubRightGutter({ className = "" }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={`learning-sheet-cell learning-sheet-gutter-cell learning-extend-right hidden [@media_(min-width:1024px)]:block ${className}`}
    />
  );
}

function TrackHubSheetPatternPlane() {
  return <span aria-hidden="true" className="learning-sheet-pattern-plane" />;
}

function TrackHubFullRow({
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
      <TrackHubLeftGutter className={leftClassName} />
      {children}
      <TrackHubRightGutter className={rightClassName} />
    </>
  );
}

export function LearningTrackHub({ progress }: LearningTrackHubProps) {
  const { locale, t } = useLocalization();
  const trackImageCount = learningTracks.filter((track) => trackImageSources[track.id]).length;
  const trackImageRowCount = trackImageCount * 2;

  return (
    <LearningGridCanvas>
      <LearningHeader backHref="/explore" backLabel="Kembali ke Explore" />

      <div className="route-content-transition-target">
        <section
          aria-labelledby="learning-track-list"
          className="learning-sheet learning-track-hub-sheet mx-auto grid w-[min(1080px,calc(100%_-_48px))] grid-cols-[5rem_minmax(0,1fr)_15rem] [@media_(min-width:1024px)]:grid-cols-[2rem_5rem_minmax(0,1fr)_15rem_2rem]"
          style={{
            "--learning-track-hub-content-row-count": learningTracks.length + trackImageRowCount,
          }}
        >
          <LearningSheetExtensions />
          <TrackHubSheetPatternPlane />

          <TrackHubFullRow>
            <div
              className={`learning-sheet-cell learning-extend-left learning-extend-right learning-extend-top ${trackHubFullCellGridClassName} p-6`}
            >
              <h1
                className="text-5xl leading-tight font-semibold tracking-normal text-foreground"
                id="learning-track-list"
              >
                {t("learning.trackHub.title")}
              </h1>
            </div>
          </TrackHubFullRow>

          {learningTracks.map((track, index) => {
            const localizedTrack = localizeTrack(track, locale);
            const completedLessonCount = getCompletedTrackLessonCount(track, progress);
            const isAvailable = track.status === "available";
            const trackImageSrc = trackImageSources[track.id];
            const trackImageClassName =
              trackImageClassNames[track.id] ?? "object-contain object-center";

            return (
              <div className="contents" key={track.id}>
                {trackImageSrc ? (
                  <>
                    <TrackHubFullRow>
                      <div
                        aria-hidden="true"
                        className={`learning-sheet-cell learning-extend-left learning-extend-right ${trackHubFullCellGridClassName} h-12`}
                      />
                    </TrackHubFullRow>
                    <TrackHubFullRow>
                      <div
                        aria-hidden="true"
                        className={`learning-sheet-cell learning-extend-left learning-extend-right ${trackHubFullCellGridClassName}`}
                      >
                        <img
                          alt=""
                          className={`aspect-[21/9] h-auto w-full ${trackImageClassName}`}
                          decoding="async"
                          loading="lazy"
                          src={trackImageSrc}
                        />
                      </div>
                    </TrackHubFullRow>
                  </>
                ) : null}
                <TrackHubLeftGutter />
                <div className="learning-sheet-cell learning-sheet-gutter-cell learning-extend-left flex items-center justify-center p-3 text-base font-semibold text-foreground">
                  {index}
                </div>
                <div className="learning-sheet-cell flex min-h-20 items-center p-5">
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
                      <HugeiconsIcon
                        aria-hidden="true"
                        className="size-5"
                        icon={ArrowRight02Icon}
                      />
                    </LiquidLink>
                  ) : (
                    <button
                      className="inline-flex min-h-12 w-fit cursor-not-allowed items-center justify-center gap-3 bg-neutral-200 px-5 py-3 text-base font-semibold text-muted-foreground disabled:opacity-100"
                      disabled
                      type="button"
                    >
                      <HugeiconsIcon aria-hidden="true" className="size-5" icon={LockIcon} />
                      {t("learning.trackHub.comingSoon")}
                    </button>
                  )}
                </div>
                <TrackHubRightGutter />
              </div>
            );
          })}

          <TrackHubLeftGutter />
          <div
            aria-hidden="true"
            className="learning-sheet-cell learning-extend-left learning-sheet-footer-cell"
          />
          <div aria-hidden="true" className="learning-sheet-cell learning-sheet-footer-cell" />
          <div
            aria-hidden="true"
            className="learning-sheet-cell learning-extend-right learning-sheet-footer-cell"
          />
          <TrackHubRightGutter />
        </section>
      </div>
    </LearningGridCanvas>
  );
}
