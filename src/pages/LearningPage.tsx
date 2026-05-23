import { activeLesson, getLesson } from "@/features/learning/content/learning-content";
import { LearningHome } from "@/features/learning/components/LearningHome";
import { LearningHeader } from "@/features/learning/components/LearningHeader";
import { LessonPage } from "@/features/learning/components/LessonPage";
import { getLessonLockReason, isLessonUnlocked } from "@/features/learning/progress/lesson-access";
import { useLearningProgress } from "@/features/learning/progress/learning-progress";
import { GlassSurface } from "@/components/ui/glass-surface";
import { LiquidLink } from "@/components/ui/liquid-button";

const liquidButtonClassName =
  "inline-flex items-center justify-center gap-3 rounded-2xl px-5 py-3 text-base font-semibold text-neutral-50 backdrop-blur-xl shadow-[inset_0_1px_0_oklch(100%_0_0_/_0.16),0_12px_32px_oklch(0%_0_0_/_0.22)] [--liquid-button-background-color:oklch(100%_0_0_/_0.08)] [--liquid-button-color:var(--color-emerald-500)] [@media_(min-width:2200px)]:gap-4 [@media_(min-width:2200px)]:rounded-3xl [@media_(min-width:2200px)]:px-6 [@media_(min-width:2200px)]:py-3.5 [@media_(min-width:2200px)]:text-lg";

const glassCardStyle = {
  inset: 0,
  pointerEvents: "none",
  position: "absolute",
  zIndex: -1,
} as const;

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
      <main className="relative z-10 isolate min-h-screen overflow-x-hidden text-foreground">
        <LearningHeader backHref="/learn" backLabel="Back to Learning Home" />
        <section className="route-content-transition-target relative isolate mx-auto mt-20 max-w-xl overflow-hidden rounded-3xl p-8 text-center [@media_(min-width:2200px)]:max-w-3xl [@media_(min-width:2200px)]:p-10">
          <GlassSurface
            aria-hidden="true"
            backgroundOpacity={0.08}
            borderRadius={24}
            brightness={24}
            height="100%"
            opacity={0.55}
            saturation={1.6}
            style={glassCardStyle}
            width="100%"
          />
          <h1 className="text-2xl font-semibold text-foreground [@media_(min-width:2200px)]:text-4xl">
            Lesson not found
          </h1>
          <p className="mt-4 text-base leading-7 text-muted-foreground [@media_(min-width:2200px)]:mt-5 [@media_(min-width:2200px)]:text-lg [@media_(min-width:2200px)]:leading-8">
            This lesson ID is not available in Learning Mode yet.
          </p>
          <LiquidLink
            className={`${liquidButtonClassName} mt-6 [@media_(min-width:2200px)]:mt-7`}
            data-app-link
            href="/learn"
          >
            Back to Learning Home
          </LiquidLink>
        </section>
      </main>
    );
  }

  if (lesson) {
    if (!isLessonUnlocked(lesson, progress)) {
      return (
        <main className="relative z-10 isolate min-h-screen overflow-x-hidden text-foreground">
          <LearningHeader backHref="/learn" backLabel="Back to Learning Home" />
          <section className="route-content-transition-target relative isolate mx-auto mt-20 max-w-xl overflow-hidden rounded-3xl p-8 text-center [@media_(min-width:2200px)]:max-w-3xl [@media_(min-width:2200px)]:p-10">
            <GlassSurface
              aria-hidden="true"
              backgroundOpacity={0.08}
              borderRadius={24}
              brightness={24}
              height="100%"
              opacity={0.55}
              saturation={1.6}
              style={glassCardStyle}
              width="100%"
            />
            <h1 className="text-2xl font-semibold text-foreground [@media_(min-width:2200px)]:text-4xl">
              Lesson locked
            </h1>
            <p className="mt-4 text-base leading-7 text-muted-foreground [@media_(min-width:2200px)]:mt-5 [@media_(min-width:2200px)]:text-lg [@media_(min-width:2200px)]:leading-8">
              {getLessonLockReason(lesson, progress)}
            </p>
            <LiquidLink
              className={`${liquidButtonClassName} mt-6 [@media_(min-width:2200px)]:mt-7`}
              data-app-link
              href="/learn"
            >
              Back to Learning Home
            </LiquidLink>
          </section>
        </main>
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
