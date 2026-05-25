import {
  activeLesson,
  getLesson,
  getModule,
  getTrack,
} from "@/features/learning/content/learning-content";
import {
  LearningGridCanvas,
  LearningSheetExtensions,
} from "@/features/learning/components/LearningGridCanvas";
import { LearningHome } from "@/features/learning/components/LearningHome";
import { LearningHeader } from "@/features/learning/components/LearningHeader";
import { LearningTrackHub } from "@/features/learning/components/LearningTrackHub";
import { LessonPage } from "@/features/learning/components/LessonPage";
import { getLessonLockReason, isLessonUnlocked } from "@/features/learning/progress/lesson-access";
import { useLearningProgress } from "@/features/learning/progress/learning-progress";
import { LiquidLink } from "@/components/ui/liquid-button";

const liquidButtonClassName =
  "inline-flex items-center justify-center gap-3 rounded-none px-5 py-3 text-base font-semibold text-neutral-950 backdrop-blur-xl hover:text-neutral-50 [--liquid-button-background-color:var(--color-neutral-200)] [--liquid-button-color:var(--color-emerald-500)] [@media_(min-width:2200px)]:gap-4 [@media_(min-width:2200px)]:px-6 [@media_(min-width:2200px)]:py-3.5 [@media_(min-width:2200px)]:text-lg";

const learningFallbackSurfaceClassName = "learning-sheet";

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

    return module?.status === "available" ? module.lessonIds : [];
  });
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

export function LearningPage({ path = "/learn" }: LearningPageProps) {
  const { completeLesson, progress, resetProgress, saveLessonAnswer } = useLearningProgress();
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
          className={`route-content-transition-target relative isolate mx-auto mt-20 max-w-xl overflow-hidden text-center [@media_(min-width:2200px)]:max-w-3xl ${learningFallbackSurfaceClassName}`}
        >
          <LearningSheetExtensions />

          <h1 className="learning-sheet-cell p-8 text-2xl font-semibold text-foreground [@media_(min-width:2200px)]:p-12 [@media_(min-width:2200px)]:text-4xl">
            Jalur belajar tidak ditemukan
          </h1>
          <p className="learning-sheet-cell p-8 text-base leading-7 text-muted-foreground [@media_(min-width:2200px)]:p-12 [@media_(min-width:2200px)]:text-lg [@media_(min-width:2200px)]:leading-8">
            Jalur ini belum tersedia di Learning Mode.
          </p>
          <div className="learning-sheet-cell p-8 [@media_(min-width:2200px)]:p-12">
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
          className={`route-content-transition-target relative isolate mx-auto mt-20 max-w-xl overflow-hidden text-center [@media_(min-width:2200px)]:max-w-3xl ${learningFallbackSurfaceClassName}`}
        >
          <LearningSheetExtensions />

          <h1 className="learning-sheet-cell p-8 text-2xl font-semibold text-foreground [@media_(min-width:2200px)]:p-12 [@media_(min-width:2200px)]:text-4xl">
            {track.title} segera hadir
          </h1>
          <p className="learning-sheet-cell p-8 text-base leading-7 text-muted-foreground [@media_(min-width:2200px)]:p-12 [@media_(min-width:2200px)]:text-lg [@media_(min-width:2200px)]:leading-8">
            Mulai dari Dasar-Dasar Machine Learning sambil menunggu jalur ini disiapkan.
          </p>
          <div className="learning-sheet-cell p-8 [@media_(min-width:2200px)]:p-12">
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
            className={`route-content-transition-target relative isolate mx-auto mt-20 max-w-xl overflow-hidden text-center [@media_(min-width:2200px)]:max-w-3xl ${learningFallbackSurfaceClassName}`}
          >
            <LearningSheetExtensions />

            <h1 className="learning-sheet-cell p-8 text-2xl font-semibold text-foreground [@media_(min-width:2200px)]:p-12 [@media_(min-width:2200px)]:text-4xl">
              Lesson tidak ditemukan
            </h1>
            <p className="learning-sheet-cell p-8 text-base leading-7 text-muted-foreground [@media_(min-width:2200px)]:p-12 [@media_(min-width:2200px)]:text-lg [@media_(min-width:2200px)]:leading-8">
              ID lesson ini belum tersedia di jalur belajar ini.
            </p>
            <div className="learning-sheet-cell p-8 [@media_(min-width:2200px)]:p-12">
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
            className={`route-content-transition-target relative isolate mx-auto mt-20 max-w-xl overflow-hidden text-center [@media_(min-width:2200px)]:max-w-3xl ${learningFallbackSurfaceClassName}`}
          >
            <LearningSheetExtensions />

            <h1 className="learning-sheet-cell p-8 text-2xl font-semibold text-foreground [@media_(min-width:2200px)]:p-12 [@media_(min-width:2200px)]:text-4xl">
              Lesson terkunci
            </h1>
            <p className="learning-sheet-cell p-8 text-base leading-7 text-muted-foreground [@media_(min-width:2200px)]:p-12 [@media_(min-width:2200px)]:text-lg [@media_(min-width:2200px)]:leading-8">
              {getLessonLockReason(lesson, progress)}
            </p>
            <div className="learning-sheet-cell p-8 [@media_(min-width:2200px)]:p-12">
              <LiquidLink className={liquidButtonClassName} data-app-link href={trackHomeHref}>
                Kembali ke Jalur Belajar
              </LiquidLink>
            </div>
          </section>
        </LearningGridCanvas>
      );
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
      <LessonPage
        backHref={trackHomeHref}
        backLabel="Kembali ke Jalur Belajar"
        initialAnswer={progress.lessonAnswers[lesson.id]}
        isCompleted={progress.completedLessonIds.includes(lesson.id)}
        key={lesson.id}
        lesson={lesson}
        nextLessonHref={nextLessonHref}
        onAnswerChange={saveLessonAnswer}
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
    );
  }

  return <LearningTrackHub progress={progress} />;
}

export const activeLearningLesson = activeLesson;
