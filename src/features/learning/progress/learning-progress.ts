import { useCallback, useEffect, useMemo, useState } from "react";

import type { EvaluationResult, LearningProgress, LessonAnswer } from "../types";

export const learningProgressStorageKey = "smile-learning-progress-v1";

const initialProgress: LearningProgress = {
  attempts: {},
  completedLessonIds: [],
  lessonAnswers: {},
  version: 1,
};

function isProgress(value: unknown): value is LearningProgress {
  if (!value || typeof value !== "object") {
    return false;
  }

  const progress = value as Partial<LearningProgress>;

  return progress.version === 1 && Array.isArray(progress.completedLessonIds);
}

export function readLearningProgress(): LearningProgress {
  if (typeof window === "undefined") {
    return initialProgress;
  }

  try {
    const stored = window.localStorage.getItem(learningProgressStorageKey);

    if (!stored) {
      return initialProgress;
    }

    const parsed = JSON.parse(stored) as unknown;

    if (!isProgress(parsed)) {
      return initialProgress;
    }

    return {
      attempts: parsed.attempts ?? {},
      completedLessonIds: parsed.completedLessonIds,
      currentLessonId: parsed.currentLessonId,
      lessonAnswers: parsed.lessonAnswers ?? {},
      version: 1,
    };
  } catch {
    return initialProgress;
  }
}

function writeLearningProgress(progress: LearningProgress) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(learningProgressStorageKey, JSON.stringify(progress));
}

export function useLearningProgress() {
  const [progress, setProgress] = useState<LearningProgress>(() => readLearningProgress());

  useEffect(() => {
    writeLearningProgress(progress);
  }, [progress]);

  const completeLesson = useCallback(
    (input: {
      answer: LessonAnswer;
      exerciseId: string;
      lessonId: string;
      result: EvaluationResult;
    }) => {
      setProgress((current) => {
        const completedLessonIds =
          input.result.status === "correct" && !current.completedLessonIds.includes(input.lessonId)
            ? [...current.completedLessonIds, input.lessonId]
            : current.completedLessonIds;

        return {
          ...current,
          attempts: {
            ...current.attempts,
            [input.exerciseId]: {
              exerciseId: input.exerciseId,
              score: input.result.score,
              status: input.result.status,
              submittedAt: new Date().toISOString(),
            },
          },
          completedLessonIds,
          currentLessonId: input.lessonId,
          lessonAnswers: {
            ...current.lessonAnswers,
            [input.lessonId]: input.answer,
          },
        };
      });
    },
    [],
  );

  const resetProgress = useCallback(() => {
    setProgress(initialProgress);
  }, []);

  return useMemo(
    () => ({
      completeLesson,
      progress,
      resetProgress,
    }),
    [completeLesson, progress, resetProgress],
  );
}
