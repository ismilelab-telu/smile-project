import { activeLesson, getLesson } from "@/features/learning/content/learning-content";
import { LearningHome } from "@/features/learning/components/LearningHome";
import { LessonPage } from "@/features/learning/components/LessonPage";
import { useLearningProgress } from "@/features/learning/progress/learning-progress";

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
      <main className="flex min-h-screen items-center justify-center bg-background px-6 text-foreground">
        <section className="max-w-lg rounded-lg border border-border bg-surface p-6 text-center">
          <h1 className="text-xl font-semibold text-neutral-950">Lesson tidak ditemukan</h1>
          <p className="mt-3 text-sm leading-6 text-neutral-600">
            Lesson ID ini belum tersedia di Learning Mode.
          </p>
          <a
            className="mt-5 inline-flex min-h-10 items-center justify-center rounded-lg bg-neutral-950 px-4 py-2 text-sm font-semibold text-white"
            data-app-link
            href="/learn"
          >
            Kembali ke Learning Home
          </a>
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
