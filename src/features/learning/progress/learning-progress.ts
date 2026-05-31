import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { useAuth } from "@/features/auth/auth-context";
import type { EvaluationResult, LearningProgress, LessonAnswer } from "../types";
import {
  fetchRemoteLearningProgress,
  mergeLearningProgress,
  saveRemoteLearningProgress,
  serializeLearningProgress,
} from "./learning-progress-sync";

export const learningProgressStorageKey = "smile-learning-progress-v1";
export const learningProgressOwnerStorageKey = "smile-learning-progress-owner-v1";

type ProgressSyncState = "local" | "synced" | "syncing";

export function createInitialLearningProgress(): LearningProgress {
  return {
    attempts: {},
    completedLessonIds: [],
    lessonAnswers: {},
    submittedExerciseAnswers: {},
    version: 1,
  };
}

function isProgress(value: unknown): value is LearningProgress {
  if (!value || typeof value !== "object") {
    return false;
  }

  const progress = value as Partial<LearningProgress>;

  return progress.version === 1 && Array.isArray(progress.completedLessonIds);
}

export function readLearningProgress(): LearningProgress {
  if (typeof window === "undefined") {
    return createInitialLearningProgress();
  }

  try {
    const stored = window.localStorage.getItem(learningProgressStorageKey);

    if (!stored) {
      return createInitialLearningProgress();
    }

    const parsed = JSON.parse(stored) as unknown;

    if (!isProgress(parsed)) {
      return createInitialLearningProgress();
    }

    return {
      attempts: parsed.attempts ?? {},
      completedLessonIds: parsed.completedLessonIds,
      currentLessonId: parsed.currentLessonId,
      lessonAnswers: parsed.lessonAnswers ?? {},
      submittedExerciseAnswers: parsed.submittedExerciseAnswers ?? {},
      version: 1,
    };
  } catch {
    return createInitialLearningProgress();
  }
}

function writeLearningProgress(progress: LearningProgress) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(learningProgressStorageKey, JSON.stringify(progress));
}

export function useLearningProgress() {
  const { isReady: isAuthReady, session } = useAuth();
  const [progress, setProgress] = useState<LearningProgress>(() => readLearningProgress());
  const [syncState, setSyncState] = useState<ProgressSyncState>("local");
  const lastRemoteProgressJsonRef = useRef("");
  const progressRef = useRef(progress);
  const syncRunRef = useRef(0);
  const syncedUserIdRef = useRef<string | null>(null);

  useEffect(() => {
    progressRef.current = progress;
  }, [progress]);

  useEffect(() => {
    writeLearningProgress(progress);
  }, [progress]);

  useEffect(() => {
    if (!isAuthReady) {
      return;
    }

    const userId = getSessionUserId(session);

    if (!session || !userId) {
      syncedUserIdRef.current = null;
      lastRemoteProgressJsonRef.current = "";
      setSyncState("local");
      return;
    }

    const syncRun = syncRunRef.current + 1;
    syncRunRef.current = syncRun;
    setSyncState("syncing");

    let isActive = true;

    void fetchRemoteLearningProgress(session.idToken)
      .then((remoteProgress) => {
        if (!isActive || syncRunRef.current !== syncRun) {
          return;
        }

        const localOwner = readLearningProgressOwner();
        const localProgressForSync =
          !localOwner || localOwner === userId
            ? progressRef.current
            : createInitialLearningProgress();
        const mergedProgress = remoteProgress
          ? mergeLearningProgress(remoteProgress, localProgressForSync)
          : localProgressForSync;

        writeLearningProgressOwner(userId);
        syncedUserIdRef.current = userId;
        lastRemoteProgressJsonRef.current = remoteProgress
          ? serializeLearningProgress(remoteProgress)
          : "";
        setProgress(mergedProgress);
        setSyncState("synced");
      })
      .catch(() => {
        if (!isActive || syncRunRef.current !== syncRun) {
          return;
        }

        setSyncState("local");
      });

    return () => {
      isActive = false;
    };
  }, [isAuthReady, session]);

  useEffect(() => {
    const userId = getSessionUserId(session);

    if (
      !isAuthReady ||
      !session ||
      !userId ||
      syncState !== "synced" ||
      syncedUserIdRef.current !== userId
    ) {
      return;
    }

    const nextProgressJson = serializeLearningProgress(progress);

    if (nextProgressJson === lastRemoteProgressJsonRef.current) {
      return;
    }

    const saveTimer = window.setTimeout(() => {
      void saveRemoteLearningProgress(session.idToken, progress)
        .then(() => {
          lastRemoteProgressJsonRef.current = nextProgressJson;
        })
        .catch(() => {
          // Keep local progress authoritative if the network save is temporarily unavailable.
        });
    }, 700);

    return () => {
      window.clearTimeout(saveTimer);
    };
  }, [isAuthReady, progress, session, syncState]);

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
          submittedExerciseAnswers: {
            ...current.submittedExerciseAnswers,
            [input.exerciseId]: input.answer,
          },
        };
      });
    },
    [],
  );

  const saveExerciseSubmission = useCallback(
    (input: {
      answer: LessonAnswer;
      exerciseId: string;
      lessonId: string;
      result: EvaluationResult;
    }) => {
      setProgress((current) => ({
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
        currentLessonId: input.lessonId,
        lessonAnswers: {
          ...current.lessonAnswers,
          [input.lessonId]: input.answer,
        },
        submittedExerciseAnswers: {
          ...current.submittedExerciseAnswers,
          [input.exerciseId]: input.answer,
        },
      }));
    },
    [],
  );

  const saveLessonAnswer = useCallback((input: { answer: LessonAnswer; lessonId: string }) => {
    setProgress((current) => ({
      ...current,
      currentLessonId: input.lessonId,
      lessonAnswers: {
        ...current.lessonAnswers,
        [input.lessonId]: input.answer,
      },
    }));
  }, []);

  const resetProgress = useCallback(() => {
    setProgress(createInitialLearningProgress());
  }, []);

  return useMemo(
    () => ({
      completeLesson,
      progress,
      resetProgress,
      saveExerciseSubmission,
      saveLessonAnswer,
    }),
    [completeLesson, progress, resetProgress, saveExerciseSubmission, saveLessonAnswer],
  );
}

function getSessionUserId(session: { user: { email: string; sub: string } } | null) {
  return session?.user.sub || session?.user.email || "";
}

function readLearningProgressOwner() {
  if (typeof window === "undefined") {
    return "";
  }

  return window.localStorage.getItem(learningProgressOwnerStorageKey) ?? "";
}

function writeLearningProgressOwner(userId: string) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(learningProgressOwnerStorageKey, userId);
}
