import { activeLesson, getLesson } from "@/features/learning/content/learning-content";
import {
  LearningGridCanvas,
  LearningSheetExtensions,
} from "@/features/learning/components/LearningGridCanvas";
import { LearningHome } from "@/features/learning/components/LearningHome";
import { LearningHeader } from "@/features/learning/components/LearningHeader";
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

function getLessonIdFromPath(path: string) {
  const parts = path.split("/").filter(Boolean);

  if (parts.length === 3 && parts[0] === "learn" && parts[1] === "track-regression-foundations") {
    return parts[2];
  }

  return undefined;
}

export function LearningPage({ path = "/learn" }: LearningPageProps) {
  const { completeLesson, progress, resetProgress } = useLearningProgress();
  const lessonId = getLessonIdFromPath(path);
  const lesson = lessonId ? getLesson(lessonId) : undefined;

  if (lessonId && !lesson) {
    return (
      <LearningGridCanvas>
        <LearningHeader backHref="/learn" backLabel="Back to Learning Home" />
        <section
          className={`route-content-transition-target relative isolate mx-auto mt-20 max-w-xl overflow-hidden text-center [@media_(min-width:2200px)]:max-w-3xl ${learningFallbackSurfaceClassName}`}
        >
          <LearningSheetExtensions />

          <h1 className="learning-sheet-cell p-8 text-2xl font-semibold text-foreground [@media_(min-width:2200px)]:p-12 [@media_(min-width:2200px)]:text-4xl">
            Lesson not found
          </h1>
          <p className="learning-sheet-cell p-8 text-base leading-7 text-muted-foreground [@media_(min-width:2200px)]:p-12 [@media_(min-width:2200px)]:text-lg [@media_(min-width:2200px)]:leading-8">
            This lesson ID is not available in Learning Mode yet.
          </p>
          <div className="learning-sheet-cell p-8 [@media_(min-width:2200px)]:p-12">
            <LiquidLink className={liquidButtonClassName} data-app-link href="/learn">
              Back to Learning Home
            </LiquidLink>
          </div>
        </section>
      </LearningGridCanvas>
    );
  }

  if (lesson) {
    if (!isLessonUnlocked(lesson, progress)) {
      return (
        <LearningGridCanvas>
          <LearningHeader backHref="/learn" backLabel="Back to Learning Home" />
          <section
            className={`route-content-transition-target relative isolate mx-auto mt-20 max-w-xl overflow-hidden text-center [@media_(min-width:2200px)]:max-w-3xl ${learningFallbackSurfaceClassName}`}
          >
            <LearningSheetExtensions />

            <h1 className="learning-sheet-cell p-8 text-2xl font-semibold text-foreground [@media_(min-width:2200px)]:p-12 [@media_(min-width:2200px)]:text-4xl">
              Lesson locked
            </h1>
            <p className="learning-sheet-cell p-8 text-base leading-7 text-muted-foreground [@media_(min-width:2200px)]:p-12 [@media_(min-width:2200px)]:text-lg [@media_(min-width:2200px)]:leading-8">
              {getLessonLockReason(lesson, progress)}
            </p>
            <div className="learning-sheet-cell p-8 [@media_(min-width:2200px)]:p-12">
              <LiquidLink className={liquidButtonClassName} data-app-link href="/learn">
                Back to Learning Home
              </LiquidLink>
            </div>
          </section>
        </LearningGridCanvas>
      );
    }

    return (
      <LessonPage
        lesson={lesson}
        onSubmitResult={(result) => {
          completeLesson({
            exerciseId: lesson.exerciseId,
            lessonId: lesson.id,
            result,
          });
        }}
      />
    );
  }

  return <LearningHome onResetProgress={resetProgress} progress={progress} />;
}

export const activeLearningLesson = activeLesson;
