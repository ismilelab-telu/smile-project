import { activeLesson, getLesson } from "@/features/learning/content/learning-content";
import { LearningHome } from "@/features/learning/components/LearningHome";
import { LearningHeader } from "@/features/learning/components/LearningHeader";
import { LessonPage } from "@/features/learning/components/LessonPage";
import { useLearningProgress } from "@/features/learning/progress/learning-progress";
import { LiquidLink } from "@/components/ui/liquid-button";

const liquidButtonClassName =
  "inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold text-neutral-50 backdrop-blur-xl shadow-[inset_0_1px_0_oklch(100%_0_0_/_0.16),0_12px_32px_oklch(0%_0_0_/_0.22)] [--liquid-button-background-color:oklch(100%_0_0_/_0.08)] [--liquid-button-color:var(--color-emerald-500)]";

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
      <main className="min-h-screen bg-background text-foreground">
        <LearningHeader backHref="/learn" backLabel="Back to Learning Home" />
        <section className="mx-auto mt-20 max-w-lg rounded-lg border border-border bg-surface p-6 text-center">
          <h1 className="text-xl font-semibold text-foreground">Lesson not found</h1>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            This lesson ID is not available in Learning Mode yet.
          </p>
          <LiquidLink className={`${liquidButtonClassName} mt-5`} data-app-link href="/learn">
            Back to Learning Home
          </LiquidLink>
        </section>
      </main>
    );
  }

  if (lesson) {
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
