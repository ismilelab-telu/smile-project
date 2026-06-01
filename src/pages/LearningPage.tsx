import { lazy, Suspense, useEffect, useState } from "react";

import {
  activeLesson,
  getLesson,
  getModule,
  getTrack,
  isLessonAvailable,
} from "@/features/learning/content/learning-content";
import {
  LearningGridCanvas,
  LearningSheetExtensions,
} from "@/features/learning/components/LearningGridCanvas";
import { LearningHome } from "@/features/learning/components/LearningHome";
import { LearningHeader } from "@/features/learning/components/LearningHeader";
import { LearningTrackHub } from "@/features/learning/components/LearningTrackHub";
import { useAuth } from "@/features/auth/auth-context";
import { getLessonLockReason, isLessonUnlocked } from "@/features/learning/progress/lesson-access";
import { useLearningProgress } from "@/features/learning/progress/learning-progress";
import type { Lesson } from "@/features/learning/types";
import { useLocalization } from "@/features/localization/localization";
import { LiquidLink } from "@/components/ui/liquid-button";
import { AuthPage } from "@/pages/AuthPage";

const LessonPage = lazy(() =>
  import("@/features/learning/components/LessonPage").then((module) => ({
    default: module.LessonPage,
  })),
);

const liquidButtonClassName =
  "inline-flex items-center justify-center gap-3 rounded-none px-5 py-3 text-base font-semibold text-neutral-950 backdrop-blur-xl hover:text-neutral-50 [--liquid-button-background-color:var(--color-neutral-200)] [--liquid-button-color:var(--color-emerald-500)]";

const learningFallbackSurfaceClassName = "learning-sheet";

function LearningLessonFallback({ backHref }: { backHref: string }) {
  return (
    <LearningGridCanvas>
      <LearningHeader backHref={backHref} backLabel="Kembali ke Jalur Belajar" />
      <section
        aria-busy="true"
        className={`route-content-transition-target relative isolate mx-auto mt-20 min-h-48 max-w-xl overflow-hidden ${learningFallbackSurfaceClassName}`}
      >
        <LearningSheetExtensions />
        <div className="learning-sheet-cell h-24 animate-pulse bg-neutral-100" />
        <div className="learning-sheet-cell h-24 animate-pulse bg-white" />
      </section>
    </LearningGridCanvas>
  );
}

type LearningPageProps = {
  path?: string;
};

type LearningRoute =
  | { kind: "hub" }
  | { kind: "track"; trackId: string }
  | { kind: "lesson"; lessonId: string; trackId: string }
  | { kind: "not-found"; trackId?: string };

function getTrackLessonIds(trackId: string) {
  const track = getTrack(trackId);

  if (!track) {
    return [];
  }

  return track.moduleIds.flatMap((moduleId) => {
    const module = getModule(moduleId);

    return module?.status === "available"
      ? module.lessonIds.filter((lessonId) => {
          const lesson = getLesson(lessonId);

          return lesson !== undefined && isLessonAvailable(lesson);
        })
      : [];
  });
}

function lessonRequiresAuthenticatedAccess(lesson: Lesson) {
  const exercises = lesson.exercises ?? [lesson.exercise];

  return exercises.some((exercise) => exercise.type === "guided-download");
}

function getLearningRoute(path: string): LearningRoute {
  const parts = path.split("/").filter(Boolean);

  if (parts[0] !== "learn" || parts.length === 1) {
    return { kind: "hub" };
  }

  if (parts.length === 2) {
    return { kind: "track", trackId: parts[1] };
  }

  if (parts.length === 3) {
    return { kind: "lesson", lessonId: parts[2], trackId: parts[1] };
  }

  return { kind: "not-found", trackId: parts[1] };
}

function LearningAuthRequiredAuthPortal({
  backHref,
  successHref,
}: {
  backHref: string;
  successHref: string;
}) {
  const { locale } = useLocalization();
  const [authMode, setAuthMode] = useState<"login" | "register">("login");

  useEffect(() => {
    setAuthMode("login");
  }, [successHref]);

  return (
    <>
      <LearningGridCanvas>
        <LearningHeader backHref={backHref} backLabel="Kembali ke Jalur Belajar" />
      </LearningGridCanvas>
      <AuthPage
        closeHref={backHref}
        mode={authMode}
        onModeChange={setAuthMode}
        successHref={successHref}
        titleOverride={
          authMode === "login"
            ? locale === "en"
              ? "Sign in first"
              : "Masuk terlebih dahulu"
            : undefined
        }
      />
    </>
  );
}

export function LearningPage({ path = "/learn" }: LearningPageProps) {
  const { isAuthenticated, isReady: isAuthReady } = useAuth();
  const { completeLesson, progress, resetProgress, saveExerciseSubmission, saveLessonAnswer } =
    useLearningProgress();
  const route = getLearningRoute(path);

  if (route.kind === "hub") {
    return <LearningTrackHub progress={progress} />;
  }

  const track = route.trackId ? getTrack(route.trackId) : undefined;
  const trackHomeHref = track ? `/learn/${track.id}` : "/learn";

  if (!track || route.kind === "not-found") {
    return (
      <LearningGridCanvas>
        <LearningHeader backHref="/learn" backLabel="Kembali ke Jalur Belajar" />
        <section
          className={`route-content-transition-target relative isolate mx-auto mt-20 max-w-xl overflow-hidden text-center ${learningFallbackSurfaceClassName}`}
        >
          <LearningSheetExtensions />

          <h1 className="learning-sheet-cell p-8 text-2xl font-semibold text-foreground">
            Jalur belajar tidak ditemukan
          </h1>
          <p className="learning-sheet-cell p-8 text-base leading-7 text-muted-foreground">
            Jalur ini belum tersedia di Learning Mode.
          </p>
          <div className="learning-sheet-cell p-8">
            <LiquidLink className={liquidButtonClassName} data-app-link href="/learn">
              Kembali ke Jalur Belajar
            </LiquidLink>
          </div>
        </section>
      </LearningGridCanvas>
    );
  }

  if (track.status !== "available") {
    return (
      <LearningGridCanvas>
        <LearningHeader backHref="/learn" backLabel="Kembali ke Jalur Belajar" />
        <section
          className={`route-content-transition-target relative isolate mx-auto mt-20 max-w-xl overflow-hidden text-center ${learningFallbackSurfaceClassName}`}
        >
          <LearningSheetExtensions />

          <h1 className="learning-sheet-cell p-8 text-2xl font-semibold text-foreground">
            {track.title} segera hadir
          </h1>
          <p className="learning-sheet-cell p-8 text-base leading-7 text-muted-foreground">
            Mulai dari Dasar-Dasar Machine Learning sambil menunggu jalur ini disiapkan.
          </p>
          <div className="learning-sheet-cell p-8">
            <LiquidLink className={liquidButtonClassName} data-app-link href="/learn">
              Kembali ke Jalur Belajar
            </LiquidLink>
          </div>
        </section>
      </LearningGridCanvas>
    );
  }

  if (route.kind === "track") {
    return <LearningHome onResetProgress={resetProgress} progress={progress} track={track} />;
  }

  if (route.kind === "lesson") {
    const lesson = getLesson(route.lessonId);
    const lessonModule = lesson ? getModule(lesson.moduleId) : undefined;
    const isLessonInTrack =
      lesson !== undefined &&
      lessonModule !== undefined &&
      track.moduleIds.includes(lesson.moduleId) &&
      lessonModule.lessonIds.includes(lesson.id);

    if (!lesson || !isLessonInTrack) {
      return (
        <LearningGridCanvas>
          <LearningHeader backHref={trackHomeHref} backLabel="Kembali ke Jalur Belajar" />
          <section
            className={`route-content-transition-target relative isolate mx-auto mt-20 max-w-xl overflow-hidden text-center ${learningFallbackSurfaceClassName}`}
          >
            <LearningSheetExtensions />

            <h1 className="learning-sheet-cell p-8 text-2xl font-semibold text-foreground">
              Lesson tidak ditemukan
            </h1>
            <p className="learning-sheet-cell p-8 text-base leading-7 text-muted-foreground">
              ID lesson ini belum tersedia di jalur belajar ini.
            </p>
            <div className="learning-sheet-cell p-8">
              <LiquidLink className={liquidButtonClassName} data-app-link href={trackHomeHref}>
                Kembali ke Jalur Belajar
              </LiquidLink>
            </div>
          </section>
        </LearningGridCanvas>
      );
    }

    if (!isLessonAvailable(lesson)) {
      return (
        <LearningGridCanvas>
          <LearningHeader backHref={trackHomeHref} backLabel="Kembali ke Jalur Belajar" />
          <section
            className={`route-content-transition-target relative isolate mx-auto mt-20 max-w-xl overflow-hidden text-center ${learningFallbackSurfaceClassName}`}
          >
            <LearningSheetExtensions />

            <h1 className="learning-sheet-cell p-8 text-2xl font-semibold text-foreground">
              {lesson.numberLabel} segera hadir
            </h1>
            <p className="learning-sheet-cell p-8 text-base leading-7 text-muted-foreground">
              Materi ini sedang disiapkan dan belum bisa dibuka.
            </p>
            <div className="learning-sheet-cell p-8">
              <LiquidLink className={liquidButtonClassName} data-app-link href={trackHomeHref}>
                Kembali ke Jalur Belajar
              </LiquidLink>
            </div>
          </section>
        </LearningGridCanvas>
      );
    }

    if (!isLessonUnlocked(lesson, progress)) {
      return (
        <LearningGridCanvas>
          <LearningHeader backHref={trackHomeHref} backLabel="Kembali ke Jalur Belajar" />
          <section
            className={`route-content-transition-target relative isolate mx-auto mt-20 max-w-xl overflow-hidden text-center ${learningFallbackSurfaceClassName}`}
          >
            <LearningSheetExtensions />

            <h1 className="learning-sheet-cell p-8 text-2xl font-semibold text-foreground">
              Lesson terkunci
            </h1>
            <p className="learning-sheet-cell p-8 text-base leading-7 text-muted-foreground">
              {getLessonLockReason(lesson, progress)}
            </p>
            <div className="learning-sheet-cell p-8">
              <LiquidLink className={liquidButtonClassName} data-app-link href={trackHomeHref}>
                Kembali ke Jalur Belajar
              </LiquidLink>
            </div>
          </section>
        </LearningGridCanvas>
      );
    }

    if (lessonRequiresAuthenticatedAccess(lesson)) {
      if (!isAuthReady) {
        return <LearningLessonFallback backHref={trackHomeHref} />;
      }

      if (!isAuthenticated) {
        return <LearningAuthRequiredAuthPortal backHref={trackHomeHref} successHref={path} />;
      }
    }

    const trackLessonIds = getTrackLessonIds(track.id);
    const lessonIndex = trackLessonIds.indexOf(lesson.id);
    const previousLesson = lessonIndex > 0 ? getLesson(trackLessonIds[lessonIndex - 1]) : undefined;
    const nextLesson =
      lessonIndex >= 0 && lessonIndex < trackLessonIds.length - 1
        ? getLesson(trackLessonIds[lessonIndex + 1])
        : undefined;
    const previousLessonHref =
      previousLesson && isLessonUnlocked(previousLesson, progress)
        ? `${trackHomeHref}/${previousLesson.id}`
        : undefined;
    const nextLessonHref =
      nextLesson && isLessonUnlocked(nextLesson, progress)
        ? `${trackHomeHref}/${nextLesson.id}`
        : undefined;

    return (
      <Suspense fallback={<LearningLessonFallback backHref={trackHomeHref} />}>
        <LessonPage
          backHref={trackHomeHref}
          backLabel="Kembali ke Jalur Belajar"
          initialAnswer={progress.lessonAnswers[lesson.id]}
          initialSubmittedAnswersByExerciseId={progress.submittedExerciseAnswers}
          isCompleted={progress.completedLessonIds.includes(lesson.id)}
          key={lesson.id}
          lesson={lesson}
          nextLessonHref={nextLessonHref}
          onAnswerChange={saveLessonAnswer}
          onExerciseSubmitResult={saveExerciseSubmission}
          onSubmitResult={(result, answer) => {
            completeLesson({
              answer,
              exerciseId: lesson.exerciseId,
              lessonId: lesson.id,
              result,
            });
          }}
          previousLessonHref={previousLessonHref}
        />
      </Suspense>
    );
  }

  return <LearningTrackHub progress={progress} />;
}

export const activeLearningLesson = activeLesson;
