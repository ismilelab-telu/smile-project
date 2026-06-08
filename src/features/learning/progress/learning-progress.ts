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
export const learningAccountProgressStorageKeyPrefix = "smile-learning-progress-account-v1:";

type ProgressSyncState = "local" | "synced" | "syncing";

const guestProgressOwnerKey = "guest";

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
  return readGuestLearningProgress();
}

function readGuestLearningProgress(): LearningProgress {
  if (readLearningProgressOwner()) {
    return createInitialLearningProgress();
  }

  return (
    readLearningProgressFromStorage(learningProgressStorageKey) ?? createInitialLearningProgress()
  );
}

function readStoredGuestLearningProgress() {
  if (readLearningProgressOwner()) {
    return null;
  }

  return readLearningProgressFromStorage(learningProgressStorageKey);
}

function writeGuestLearningProgress(progress: LearningProgress) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(learningProgressStorageKey, serializeLearningProgress(progress));
  clearLearningProgressOwner();
}

function clearGuestLearningProgressIfUnchanged(expectedProgressJson: string) {
  if (typeof window === "undefined" || expectedProgressJson === "") {
    return;
  }

  if (window.localStorage.getItem(learningProgressStorageKey) === expectedProgressJson) {
    window.localStorage.removeItem(learningProgressStorageKey);
  }
}

function readLocalLearningProgressForUser(userId: string) {
  const accountProgress = readLearningProgressFromStorage(getAccountProgressStorageKey(userId));

  if (accountProgress) {
    return accountProgress;
  }

  if (readLearningProgressOwner() === userId) {
    return (
      readLearningProgressFromStorage(learningProgressStorageKey) ?? createInitialLearningProgress()
    );
  }

  return createInitialLearningProgress();
}

function writeLocalLearningProgressForUser(userId: string, progress: LearningProgress) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(
    getAccountProgressStorageKey(userId),
    serializeLearningProgress(progress),
  );

  if (readLearningProgressOwner() === userId) {
    window.localStorage.removeItem(learningProgressStorageKey);
    clearLearningProgressOwner();
  }
}

function clearLocalLearningProgressForUser(userId: string) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(getAccountProgressStorageKey(userId));

  if (readLearningProgressOwner() === userId) {
    window.localStorage.removeItem(learningProgressStorageKey);
    clearLearningProgressOwner();
  }
}

function readLearningProgressFromStorage(storageKey: string) {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const stored = window.localStorage.getItem(storageKey);

    if (!stored) {
      return null;
    }

    const parsed = JSON.parse(stored) as unknown;

    if (!isProgress(parsed)) {
      window.localStorage.removeItem(storageKey);
      return null;
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
    window.localStorage.removeItem(storageKey);
    return null;
  }
}

function getAccountProgressStorageKey(userId: string) {
  return `${learningAccountProgressStorageKeyPrefix}${encodeURIComponent(userId)}`;
}

function getAccountProgressOwnerKey(userId: string) {
  return `account:${userId}`;
}

export function useLearningProgress() {
  const { getFreshSession, isReady: isAuthReady, session } = useAuth();
  const [progress, setProgress] = useState<LearningProgress>(() => readLearningProgress());
  const [progressOwnerKey, setProgressOwnerKey] = useState(guestProgressOwnerKey);
  const [syncState, setSyncState] = useState<ProgressSyncState>("local");
  const activeProgressOwnerRef = useRef("");
  const lastRemoteProgressJsonRef = useRef("");
  const lastAuthenticatedUserIdRef = useRef<string | null>(getSessionUserId(session) || null);
  const pendingGuestClaimProgressJsonRef = useRef("");
  const progressRef = useRef(progress);
  const syncRunRef = useRef(0);
  const syncedUserIdRef = useRef<string | null>(null);
  const sessionUserId = getSessionUserId(session);
  const expectedProgressOwnerKey = sessionUserId
    ? getAccountProgressOwnerKey(sessionUserId)
    : guestProgressOwnerKey;
  const isProgressReady =
    isAuthReady && progressOwnerKey === expectedProgressOwnerKey && syncState !== "syncing";

  useEffect(() => {
    progressRef.current = progress;
  }, [progress]);

  useEffect(() => {
    const activeOwner = activeProgressOwnerRef.current;

    if (activeOwner) {
      writeLocalLearningProgressForUser(activeOwner, progress);
      return;
    }

    writeGuestLearningProgress(progress);
  }, [progress]);

  useEffect(() => {
    if (!isAuthReady) {
      return;
    }

    const userId = getSessionUserId(session);

    if (!session || !userId) {
      const previousUserId = lastAuthenticatedUserIdRef.current ?? syncedUserIdRef.current;

      if (previousUserId) {
        clearLocalLearningProgressForUser(previousUserId);
      }

      activeProgressOwnerRef.current = "";
      lastAuthenticatedUserIdRef.current = null;
      pendingGuestClaimProgressJsonRef.current = "";
      syncedUserIdRef.current = null;
      lastRemoteProgressJsonRef.current = "";
      setProgressOwnerKey(guestProgressOwnerKey);
      setProgress(readLearningProgress());
      setSyncState("local");
      return;
    }

    lastAuthenticatedUserIdRef.current = userId;
    const syncRun = syncRunRef.current + 1;
    syncRunRef.current = syncRun;
    setSyncState("syncing");

    let isActive = true;
    const guestProgress = readStoredGuestLearningProgress();
    const guestProgressJson = guestProgress ? serializeLearningProgress(guestProgress) : "";
    const accountProgress = readLocalLearningProgressForUser(userId);
    const localProgressForSync = guestProgress
      ? mergeLearningProgress(accountProgress, guestProgress)
      : accountProgress;

    void (async () => {
      const freshSession = await getFreshSession();

      if (!isActive || syncRunRef.current !== syncRun) {
        return;
      }

      if (!freshSession) {
        activeProgressOwnerRef.current = "";
        setProgressOwnerKey(guestProgressOwnerKey);
        setProgress(readLearningProgress());
        setSyncState("local");
        return;
      }

      const remoteProgress = await fetchRemoteLearningProgress(freshSession.accessToken);

      if (!isActive || syncRunRef.current !== syncRun) {
        return;
      }

      const mergedProgress = remoteProgress
        ? mergeLearningProgress(remoteProgress, localProgressForSync)
        : localProgressForSync;
      const mergedProgressJson = serializeLearningProgress(mergedProgress);
      const remoteProgressJson = remoteProgress ? serializeLearningProgress(remoteProgress) : "";
      let didSaveMergedProgress = false;

      if (mergedProgressJson !== remoteProgressJson) {
        try {
          await saveRemoteLearningProgress(freshSession.accessToken, mergedProgress);
          didSaveMergedProgress = true;
        } catch {
          // Keep account progress local and let the debounced save retry while the user remains signed in.
        }
      }

      if (!isActive || syncRunRef.current !== syncRun) {
        return;
      }

      activeProgressOwnerRef.current = userId;
      syncedUserIdRef.current = userId;
      pendingGuestClaimProgressJsonRef.current =
        guestProgressJson && !didSaveMergedProgress ? guestProgressJson : "";
      lastRemoteProgressJsonRef.current = didSaveMergedProgress
        ? mergedProgressJson
        : remoteProgressJson;
      writeLocalLearningProgressForUser(userId, mergedProgress);

      if (guestProgressJson && didSaveMergedProgress) {
        clearGuestLearningProgressIfUnchanged(guestProgressJson);
      }

      progressRef.current = mergedProgress;
      setProgressOwnerKey(getAccountProgressOwnerKey(userId));
      setProgress(mergedProgress);
      setSyncState("synced");
    })().catch(() => {
      if (!isActive || syncRunRef.current !== syncRun) {
        return;
      }

      activeProgressOwnerRef.current = userId;
      progressRef.current = localProgressForSync;
      writeLocalLearningProgressForUser(userId, localProgressForSync);
      setProgressOwnerKey(getAccountProgressOwnerKey(userId));
      setProgress(localProgressForSync);
      setSyncState("local");
    });

    return () => {
      isActive = false;
    };
  }, [getFreshSession, isAuthReady, session]);

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
      void (async () => {
        const freshSession = await getFreshSession();

        if (!freshSession || getSessionUserId(freshSession) !== userId) {
          return false;
        }

        await saveRemoteLearningProgress(freshSession.accessToken, progress);
        return true;
      })()
        .then((didSave) => {
          if (didSave) {
            lastRemoteProgressJsonRef.current = nextProgressJson;

            if (pendingGuestClaimProgressJsonRef.current) {
              clearGuestLearningProgressIfUnchanged(pendingGuestClaimProgressJsonRef.current);
              pendingGuestClaimProgressJsonRef.current = "";
            }
          }
        })
        .catch(() => {
          // Keep local progress authoritative if the network save is temporarily unavailable.
        });
    }, 700);

    return () => {
      window.clearTimeout(saveTimer);
    };
  }, [getFreshSession, isAuthReady, progress, session, syncState]);

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
    if (activeProgressOwnerRef.current) {
      lastRemoteProgressJsonRef.current = "";
    }

    setProgress(createInitialLearningProgress());
  }, []);

  return useMemo(
    () => ({
      completeLesson,
      isProgressReady,
      progress,
      progressOwnerKey,
      resetProgress,
      saveExerciseSubmission,
      saveLessonAnswer,
    }),
    [
      completeLesson,
      isProgressReady,
      progress,
      progressOwnerKey,
      resetProgress,
      saveExerciseSubmission,
      saveLessonAnswer,
    ],
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

function clearLearningProgressOwner() {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(learningProgressOwnerStorageKey);
}
