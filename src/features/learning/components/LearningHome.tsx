import {
  ArrowRight02Icon,
  Cancel01Icon,
  CheckmarkCircle02Icon,
  Clock01Icon,
  LockIcon,
  OnlineLearning01Icon,
  Search01Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Fragment, useDeferredValue, useId, useMemo, useState, type ReactNode } from "react";

import { getModule, isLessonAvailable, lessons } from "../content/learning-content";
import {
  localizeLesson,
  localizeModule,
  localizeTrack,
} from "../content/localized-learning-content";
import { getLessonLockReason, isLessonUnlocked, isModuleUnlocked } from "../progress/lesson-access";
import {
  createLearningSearchIndex,
  getLearningSearchHighlightParts,
  type LearningSearchResult,
} from "../search/learning-search";
import type { LearningProgress, LearningTrack, Lesson } from "../types";
import { LearningGridCanvas, LearningSheetExtensions } from "./LearningGridCanvas";
import { LearningHeader } from "./LearningHeader";
import { LiquidLink } from "@/components/ui/liquid-button";
import { useLocalization } from "@/features/localization/localization";

const liquidButtonClassName =
  "inline-flex items-center justify-center gap-3 rounded-none px-5 py-3 text-base font-semibold text-neutral-950 backdrop-blur-xl hover:text-neutral-50 [--liquid-button-background-color:var(--color-neutral-200)]";

const disabledButtonClassName =
  "inline-flex min-h-12 w-full cursor-not-allowed items-center justify-center gap-3 bg-neutral-200 px-5 py-3 text-base font-semibold whitespace-nowrap text-muted-foreground disabled:opacity-100";

const learningHomeFullCellGridClassName =
  "col-span-3 sm:col-span-4 [@media_(min-width:1024px)]:col-span-4";

const learningHomeSearchCopy = {
  en: {
    clear: "Clear search",
    label: "Search lessons",
    noResults: (query: string) => `No results for "${query}".`,
    placeholder: "Search lessons, topics, or keywords",
  },
  id: {
    clear: "Hapus pencarian",
    label: "Cari lesson",
    noResults: (query: string) => `Tidak ada hasil untuk "${query}".`,
    placeholder: "Cari lesson, topik, atau keyword",
  },
};

type LearningHomeProps = {
  track: LearningTrack;
  progress: LearningProgress;
};

function LearningHomeLeftGutter({ className = "" }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={`learning-sheet-cell learning-sheet-gutter-cell learning-extend-left hidden [@media_(min-width:1024px)]:block ${className}`}
    />
  );
}

function LearningHomeRightGutter({ className = "" }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={`learning-sheet-cell learning-sheet-gutter-cell learning-extend-right hidden [@media_(min-width:1024px)]:block ${className}`}
    />
  );
}

function LearningHomeSheetPatternPlane() {
  return <span aria-hidden="true" className="learning-sheet-pattern-plane" />;
}

function LearningHomeFullRow({
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
      <LearningHomeLeftGutter className={leftClassName} />
      {children}
      <LearningHomeRightGutter className={rightClassName} />
    </>
  );
}

function LearningHomeSearchResultAction({
  lesson,
  progress,
  trackId,
}: {
  lesson: Lesson | undefined;
  progress: LearningProgress;
  trackId: LearningTrack["id"];
}) {
  const { t } = useLocalization();

  if (!lesson || !isLessonAvailable(lesson)) {
    return (
      <button className={disabledButtonClassName} disabled type="button">
        <HugeiconsIcon aria-hidden="true" className="size-5" icon={Clock01Icon} />
        {t("learning.home.comingSoon")}
      </button>
    );
  }

  const isLessonCompleted = progress.completedLessonIds.includes(lesson.id);
  const isUnlocked = isLessonUnlocked(lesson, progress);
  const lockReason = getLessonLockReason(lesson, progress);

  if (!isUnlocked) {
    return (
      <button aria-label={lockReason} className={disabledButtonClassName} disabled type="button">
        <HugeiconsIcon aria-hidden="true" className="size-5" icon={LockIcon} />
        {t("learning.home.locked")}
      </button>
    );
  }

  return (
    <LiquidLink
      className={`${liquidButtonClassName} min-h-12 w-full [--liquid-button-color:var(--color-neutral-950)]`}
      data-app-link
      href={`/learn/${trackId}/${lesson.id}`}
    >
      {isLessonCompleted ? t("learning.home.review") : t("learning.home.start")}
      <HugeiconsIcon aria-hidden="true" className="size-5" icon={ArrowRight02Icon} />
    </LiquidLink>
  );
}

function LearningHomeSearchResultItem({
  progress,
  query,
  result,
  trackId,
}: {
  progress: LearningProgress;
  query: string;
  result: LearningSearchResult;
  trackId: LearningTrack["id"];
}) {
  const lesson = lessons.find((lessonItem) => lessonItem.id === result.lessonId);
  const highlightParts = getLearningSearchHighlightParts(result.snippet, query);

  return (
    <article className="grid gap-4 border-t border-neutral-200 p-4 first:border-t-0 sm:grid-cols-[minmax(0,1fr)_12rem] sm:items-center">
      <div className="min-w-0">
        <p className="text-sm leading-6 font-semibold text-sky-700">
          {result.numberLabel} / {result.sectionLabel}
        </p>
        <h3 className="mt-1 text-lg leading-tight font-semibold text-foreground">
          {result.lessonTitle}
        </h3>
        <p className="mt-1 text-sm leading-6 text-muted-foreground">{result.moduleTitle}</p>
        <p className="mt-3 text-base leading-7 text-foreground">
          {highlightParts.map((part, index) =>
            part.isMatch ? (
              <mark
                className="bg-sky-100 px-1 py-0.5 font-semibold text-sky-900"
                key={`${part.text}-${index}`}
              >
                {part.text}
              </mark>
            ) : (
              <Fragment key={`${part.text}-${index}`}>{part.text}</Fragment>
            ),
          )}
        </p>
      </div>
      <LearningHomeSearchResultAction lesson={lesson} progress={progress} trackId={trackId} />
    </article>
  );
}

function LearningHomeSearchResults({
  progress,
  query,
  results,
  trackId,
}: {
  progress: LearningProgress;
  query: string;
  results: LearningSearchResult[];
  trackId: LearningTrack["id"];
}) {
  const { locale } = useLocalization();
  const copy = learningHomeSearchCopy[locale];

  return (
    <div aria-live="polite" className="mt-5 border border-neutral-200 bg-white">
      {results.length > 0 ? (
        results.map((result) => (
          <LearningHomeSearchResultItem
            key={result.lessonId}
            progress={progress}
            query={query}
            result={result}
            trackId={trackId}
          />
        ))
      ) : (
        <p className="p-4 text-base leading-7 text-muted-foreground">
          {copy.noResults(query.trim())}
        </p>
      )}
    </div>
  );
}

export function LearningHome({ progress, track }: LearningHomeProps) {
  const { locale, t } = useLocalization();
  const [searchQuery, setSearchQuery] = useState("");
  const deferredSearchQuery = useDeferredValue(searchQuery);
  const searchInputId = useId();
  const searchCopy = learningHomeSearchCopy[locale];
  const localizedTrack = localizeTrack(track, locale);
  const trackModules = useMemo(
    () =>
      track.moduleIds
        .map((moduleId) => getModule(moduleId))
        .filter((module) => module !== undefined),
    [track],
  );
  const learningSearch = useMemo(
    () => createLearningSearchIndex({ lessons, locale, modules: trackModules, track }),
    [locale, track, trackModules],
  );
  const searchResults = useMemo(
    () => learningSearch.search(deferredSearchQuery),
    [deferredSearchQuery, learningSearch],
  );
  const trimmedSearchQuery = searchQuery.trim();
  const hasSearchQuery = trimmedSearchQuery.length > 0;
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

      <div className="route-content-transition-target">
        <section
          aria-labelledby="module-list"
          className="learning-sheet mx-auto grid w-[min(1080px,calc(100%_-_48px))] grid-cols-[4rem_5rem_minmax(0,1fr)] sm:grid-cols-[5rem_6rem_minmax(0,1fr)_14rem] [@media_(min-width:1024px)]:grid-cols-[2rem_5rem_6rem_minmax(0,1fr)_14rem_2rem]"
        >
          <LearningSheetExtensions />
          <LearningHomeSheetPatternPlane />

          <LearningHomeFullRow>
            <div
              className={`learning-sheet-cell learning-extend-left learning-extend-right learning-extend-top ${learningHomeFullCellGridClassName} p-6`}
            >
              <h1 className="text-5xl leading-tight font-semibold tracking-normal text-foreground">
                {localizedTrack.title}
              </h1>
            </div>
          </LearningHomeFullRow>

          <LearningHomeFullRow>
            <div
              aria-hidden="true"
              className={`learning-sheet-cell learning-sheet-gutter-cell learning-extend-left learning-extend-right ${learningHomeFullCellGridClassName} h-8`}
            />
          </LearningHomeFullRow>

          <LearningHomeFullRow>
            <aside
              className={`learning-sheet-cell learning-extend-left learning-extend-right ${learningHomeFullCellGridClassName} grid gap-4 p-6 sm:grid-cols-[max-content_minmax(0,1fr)] sm:items-center`}
            >
              <span className="text-base font-semibold text-foreground">
                {t("learning.home.progress")}
              </span>
              <div className="flex items-center gap-4">
                <div
                  aria-label={t("learning.home.progressAria", { percent: progressPercent })}
                  className="learning-grid-panel-fill h-3 flex-1 overflow-hidden rounded-xl"
                  role="progressbar"
                  aria-valuemax={100}
                  aria-valuemin={0}
                  aria-valuenow={progressPercent}
                >
                  <div className="h-full bg-emerald-500" style={{ width: `${progressPercent}%` }} />
                </div>
                <span className="w-12 text-right text-base font-semibold text-foreground">
                  {progressPercent}%
                </span>
              </div>
            </aside>
          </LearningHomeFullRow>

          <LearningHomeFullRow>
            <div
              className={`learning-sheet-cell learning-extend-left learning-extend-right ${learningHomeFullCellGridClassName} p-6`}
            >
              <div role="search">
                <label className="sr-only" htmlFor={searchInputId}>
                  {searchCopy.label}
                </label>
                <div className="relative">
                  <HugeiconsIcon
                    aria-hidden="true"
                    className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-neutral-500"
                    icon={Search01Icon}
                  />
                  <input
                    className="h-12 w-full border border-neutral-300 bg-white pr-12 pl-12 text-base font-semibold text-foreground outline-none transition-colors placeholder:text-neutral-400 focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
                    id={searchInputId}
                    onChange={(event) => setSearchQuery(event.target.value)}
                    placeholder={searchCopy.placeholder}
                    type="search"
                    value={searchQuery}
                  />
                  {searchQuery ? (
                    <button
                      aria-label={searchCopy.clear}
                      className="absolute top-1/2 right-2 inline-flex size-9 -translate-y-1/2 items-center justify-center text-neutral-500 transition-colors hover:text-foreground focus:text-foreground focus:outline-none focus:ring-2 focus:ring-sky-100"
                      onClick={() => setSearchQuery("")}
                      type="button"
                    >
                      <HugeiconsIcon aria-hidden="true" className="size-5" icon={Cancel01Icon} />
                    </button>
                  ) : null}
                </div>
              </div>

              {hasSearchQuery ? (
                <LearningHomeSearchResults
                  progress={progress}
                  query={trimmedSearchQuery}
                  results={searchResults}
                  trackId={track.id}
                />
              ) : null}
            </div>
          </LearningHomeFullRow>

          <LearningHomeFullRow>
            <div
              aria-hidden="true"
              className={`learning-sheet-cell learning-sheet-gutter-cell learning-extend-left learning-extend-right ${learningHomeFullCellGridClassName} h-8`}
            />
          </LearningHomeFullRow>

          <LearningHomeFullRow>
            <h2
              className={`learning-sheet-cell learning-extend-left learning-extend-right ${learningHomeFullCellGridClassName} p-6 text-3xl font-semibold tracking-normal text-foreground`}
              id="module-list"
            >
              {t("learning.home.module")}
            </h2>
          </LearningHomeFullRow>

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
                <LearningHomeLeftGutter />
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
                <LearningHomeRightGutter />

                {isAvailable && moduleLessons.length > 0
                  ? moduleLessons.map((lesson) => {
                      const localizedLesson = localizeLesson(lesson, locale);
                      const isLessonCompleted = progress.completedLessonIds.includes(lesson.id);
                      const isLessonComingSoon = !isLessonAvailable(lesson);
                      const isUnlocked = isLessonUnlocked(lesson, progress);
                      const lockReason = getLessonLockReason(lesson, progress);

                      return (
                        <Fragment key={lesson.id}>
                          <LearningHomeLeftGutter />
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
                                className={`${liquidButtonClassName} min-h-12 w-full [--liquid-button-color:var(--color-neutral-950)]`}
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
                          <LearningHomeRightGutter />
                        </Fragment>
                      );
                    })
                  : null}
              </Fragment>
            );
          })}

          <LearningHomeLeftGutter />
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
          <LearningHomeRightGutter />
        </section>
      </div>
    </LearningGridCanvas>
  );
}
