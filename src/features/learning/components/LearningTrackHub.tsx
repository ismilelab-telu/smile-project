import {
  AcademicCapIcon,
  ArrowRightIcon,
  BeakerIcon,
  ChartBarIcon,
  LockClosedIcon,
} from "@heroicons/react/24/outline";

import { getModule, learningTracks, lessons } from "../content/learning-content";
import type { LearningProgress, LearningTrack } from "../types";
import { LearningGridCanvas, LearningSheetExtensions } from "./LearningGridCanvas";
import { LearningHeader } from "./LearningHeader";
import { LiquidLink } from "@/components/ui/liquid-button";

const liquidButtonClassName =
  "inline-flex items-center justify-center gap-3 rounded-none px-5 py-3 text-base font-semibold text-neutral-950 backdrop-blur-xl hover:text-neutral-50 [--liquid-button-background-color:var(--color-neutral-200)] [--liquid-button-color:var(--color-emerald-500)] [@media_(min-width:2200px)]:gap-4 [@media_(min-width:2200px)]:px-6 [@media_(min-width:2200px)]:py-3.5 [@media_(min-width:2200px)]:text-lg";

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

function getTrackLessonCount(track: LearningTrack) {
  const lessonIds = new Set(
    track.moduleIds
      .map((moduleId) => getModule(moduleId))
      .filter((module) => module !== undefined && module.status === "available")
      .flatMap((module) => module.lessonIds),
  );

  return lessons.filter((lesson) => lessonIds.has(lesson.id)).length;
}

function getCompletedTrackLessonCount(track: LearningTrack, progress: LearningProgress) {
  const lessonIds = new Set(
    track.moduleIds
      .map((moduleId) => getModule(moduleId))
      .filter((module) => module !== undefined && module.status === "available")
      .flatMap((module) => module.lessonIds),
  );

  return progress.completedLessonIds.filter((lessonId) => lessonIds.has(lessonId)).length;
}

export function LearningTrackHub({ progress }: LearningTrackHubProps) {
  return (
    <LearningGridCanvas>
      <LearningHeader backHref="/explore" backLabel="Back to Explore" />

      <section
        aria-labelledby="learning-track-list"
        className="learning-sheet route-content-transition-target mx-auto grid w-[min(1440px,calc(100%_-_48px))] grid-cols-[5rem_minmax(0,1fr)_18rem] [@media_(min-width:2200px)]:w-[min(1776px,calc(100%_-_96px))] [@media_(min-width:2200px)]:grid-cols-[8rem_minmax(0,1fr)_24rem]"
      >
        <LearningSheetExtensions />

        <div className="learning-sheet-cell learning-extend-left learning-extend-top col-span-full p-6 [@media_(min-width:2200px)]:p-12">
          <h1
            className="text-5xl leading-tight font-semibold tracking-normal text-foreground sm:text-6xl [@media_(min-width:2200px)]:text-8xl"
            id="learning-track-list"
          >
            Choose a learning path
          </h1>
        </div>

        {learningTracks.map((track, index) => {
          const Icon = getTrackIcon(track);
          const lessonCount = getTrackLessonCount(track);
          const completedLessonCount = getCompletedTrackLessonCount(track, progress);
          const isAvailable = track.status === "available";

          return (
            <div className="contents" key={track.id}>
              <div className="learning-sheet-cell learning-extend-left learning-sheet-cell-fill flex items-center justify-center p-4 text-base font-semibold text-foreground [@media_(min-width:2200px)]:p-6 [@media_(min-width:2200px)]:text-2xl">
                {index}
              </div>
              <div className="learning-sheet-cell flex min-h-32 items-center gap-5 p-6 [@media_(min-width:2200px)]:min-h-44 [@media_(min-width:2200px)]:gap-7 [@media_(min-width:2200px)]:p-8">
                <Icon
                  aria-hidden="true"
                  className={`size-7 shrink-0 [@media_(min-width:2200px)]:size-9 ${
                    isAvailable ? "text-emerald-500" : "text-muted-foreground"
                  }`}
                />
                <div className="min-w-0">
                  <h2 className="text-2xl leading-tight font-semibold text-foreground [@media_(min-width:2200px)]:text-4xl">
                    {track.title}
                  </h2>
                </div>
              </div>
              <div className="learning-sheet-cell learning-extend-right flex items-center p-6 [@media_(min-width:2200px)]:p-8">
                {isAvailable ? (
                  <LiquidLink
                    className={`${liquidButtonClassName} min-h-12 [@media_(min-width:2200px)]:min-h-16`}
                    data-app-link
                    href={`/learn/${track.id}`}
                  >
                    {completedLessonCount > 0 ? "Continue" : "Start path"}
                    <span className="text-sm font-semibold text-neutral-700 [@media_(min-width:2200px)]:text-base">
                      {completedLessonCount}/{lessonCount}
                    </span>
                    <ArrowRightIcon
                      aria-hidden="true"
                      className="size-5 [@media_(min-width:2200px)]:size-6"
                    />
                  </LiquidLink>
                ) : (
                  <button
                    className="inline-flex min-h-12 w-fit cursor-not-allowed items-center justify-center gap-3 bg-neutral-200 px-5 py-3 text-base font-semibold text-muted-foreground disabled:opacity-100 [@media_(min-width:2200px)]:min-h-16 [@media_(min-width:2200px)]:gap-4 [@media_(min-width:2200px)]:px-6 [@media_(min-width:2200px)]:py-3.5 [@media_(min-width:2200px)]:text-lg"
                    disabled
                    type="button"
                  >
                    <LockClosedIcon
                      aria-hidden="true"
                      className="size-5 [@media_(min-width:2200px)]:size-6"
                    />
                    Coming soon
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
