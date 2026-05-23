import {
  AcademicCapIcon,
  ArrowLeftIcon,
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
      <header className="border-b border-border bg-surface">
        <div className="mx-auto flex w-[min(1180px,calc(100%_-_32px))] items-center justify-between py-5">
          <a
            aria-label="Back to Explore"
            className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500"
            data-app-link
            href="/explore"
          >
            <ArrowLeftIcon aria-hidden="true" className="size-4" />
            Explore
          </a>
          <p className="text-sm font-semibold text-neutral-500">Learning Mode</p>
        </div>
      </header>

      <section className="mx-auto grid w-[min(1180px,calc(100%_-_32px))] gap-8 py-10 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="flex flex-col gap-8">
          <div className="flex flex-col gap-4">
            <div className="inline-flex w-fit items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-800">
              <AcademicCapIcon aria-hidden="true" className="size-4" />
              Jalur terarah
            </div>
            <div className="max-w-3xl">
              <h1 className="text-4xl leading-tight font-semibold tracking-normal text-neutral-950 sm:text-5xl">
                {regressionFoundationsTrack.title}
              </h1>
              <p className="mt-4 text-base leading-7 text-neutral-600">
                {regressionFoundationsTrack.summary}
              </p>
            </div>
          </div>

          <section
            aria-labelledby="recommended-lesson"
            className="rounded-lg border border-border bg-surface p-5"
          >
            <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-medium text-sky-700">Rekomendasi lesson</p>
                <h2
                  className="mt-2 text-xl leading-tight font-semibold text-neutral-950"
                  id="recommended-lesson"
                >
                  {activeLesson.title}
                </h2>
                <p className="mt-2 text-sm leading-6 text-neutral-600">
                  {isIntroCompleted
                    ? "Lesson pertama sudah selesai. Kamu bisa review ulang sebelum module berikutnya dibuka."
                    : "Mulai dari role dasar di dataset tabular: target, feature, dan metadata."}
                </p>
              </div>
              <a
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-neutral-950 px-4 py-2 text-sm font-semibold text-white hover:bg-neutral-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500"
                data-app-link
                href={`/learn/${regressionFoundationsTrack.id}/${activeLesson.id}`}
              >
                {isIntroCompleted ? "Review lesson" : "Mulai lesson"}
                <ArrowRightIcon aria-hidden="true" className="size-4" />
              </a>
            </div>
          </section>

          <section aria-labelledby="module-list" className="flex flex-col gap-4">
            <div className="flex items-center justify-between gap-4">
              <h2
                className="text-2xl font-semibold tracking-normal text-neutral-950"
                id="module-list"
              >
                Modules
              </h2>
              <p className="text-sm text-muted-foreground">MVP Alpha membuka lesson pertama.</p>
            </div>

            <div className="grid gap-3">
              {learningModules.map((module, index) => {
                const isAvailable = module.status === "available";

                return (
                  <article
                    className="rounded-lg border border-border bg-surface p-5"
                    key={module.id}
                  >
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                      <div className="flex gap-4">
                        <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-neutral-100 text-sm font-semibold text-neutral-700">
                          {index}
                        </span>
                        <div>
                          <h3 className="text-base font-semibold text-neutral-950">
                            {module.title}
                          </h3>
                          <p className="mt-1 text-sm leading-6 text-neutral-600">
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
                                className="size-4 text-emerald-600"
                              />
                            ) : (
                              <AcademicCapIcon aria-hidden="true" className="size-4 text-sky-600" />
                            )}
                            {isIntroCompleted ? "Berjalan" : "Tersedia"}
                          </>
                        ) : (
                          <>
                            <LockClosedIcon aria-hidden="true" className="size-4" />
                            Terkunci
                          </>
                        )}
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        </div>

        <aside className="h-fit rounded-lg border border-border bg-surface p-5">
          <h2 className="text-lg font-semibold text-neutral-950">Progress</h2>
          <div className="mt-5 flex flex-col gap-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Lesson aktif</span>
              <span className="font-semibold text-neutral-950">
                {completedLessons}/{totalActiveLessons}
              </span>
            </div>
            <div
              aria-label={`Learning progress ${progressPercent}%`}
              className="h-2 overflow-hidden rounded-lg bg-neutral-100"
              role="progressbar"
              aria-valuemax={100}
              aria-valuemin={0}
              aria-valuenow={progressPercent}
            >
              <div className="h-full bg-emerald-500" style={{ width: `${progressPercent}%` }} />
            </div>
            <p className="text-sm leading-6 text-muted-foreground">
              Progress disimpan lokal di browser ini.
            </p>
          </div>
          <button
            className="mt-5 inline-flex min-h-10 w-full items-center justify-center rounded-lg border border-border bg-surface px-3 py-2 text-sm font-semibold text-neutral-700 hover:bg-neutral-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500"
            onClick={onResetProgress}
            type="button"
          >
            Reset progress
          </button>
        </aside>
      </section>
    </main>
  );
}
