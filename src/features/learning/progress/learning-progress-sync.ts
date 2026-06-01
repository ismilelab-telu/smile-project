import type { ExerciseAttempt, LearningProgress, LessonAnswer } from "../types";
import { getLearningBackendUrl, readLearningBackendJson } from "../api/learning-backend";

type RemoteLearningProgressResponse = {
  progress?: LearningProgress | null;
};

export async function fetchRemoteLearningProgress(idToken: string) {
  const response = await fetch(`${getLearningBackendUrl()}/progress`, {
    headers: {
      authorization: `Bearer ${idToken}`,
    },
    method: "GET",
  });

  const body = await readLearningBackendJson<RemoteLearningProgressResponse>(response);

  return body.progress ?? null;
}

export async function saveRemoteLearningProgress(idToken: string, progress: LearningProgress) {
  await readLearningBackendJson(
    await fetch(`${getLearningBackendUrl()}/progress`, {
      body: JSON.stringify({ progress }),
      headers: {
        authorization: `Bearer ${idToken}`,
        "content-type": "application/json",
      },
      method: "PUT",
    }),
  );
}

export function serializeLearningProgress(progress: LearningProgress) {
  return JSON.stringify(progress);
}

export function mergeLearningProgress(
  remoteProgress: LearningProgress,
  localProgress: LearningProgress,
): LearningProgress {
  const attempts = mergeAttempts(remoteProgress.attempts, localProgress.attempts);
  const submittedExerciseAnswers = mergeSubmittedExerciseAnswers({
    attempts,
    localAnswers: localProgress.submittedExerciseAnswers ?? {},
    localAttempts: localProgress.attempts,
    remoteAnswers: remoteProgress.submittedExerciseAnswers ?? {},
    remoteAttempts: remoteProgress.attempts,
  });

  return {
    attempts,
    completedLessonIds: [
      ...new Set([...remoteProgress.completedLessonIds, ...localProgress.completedLessonIds]),
    ],
    currentLessonId: localProgress.currentLessonId ?? remoteProgress.currentLessonId,
    lessonAnswers: {
      ...remoteProgress.lessonAnswers,
      ...localProgress.lessonAnswers,
    },
    submittedExerciseAnswers,
    version: 1,
  };
}

function mergeAttempts(
  remoteAttempts: LearningProgress["attempts"],
  localAttempts: LearningProgress["attempts"],
) {
  const attemptIds = new Set([...Object.keys(remoteAttempts), ...Object.keys(localAttempts)]);
  const attempts: LearningProgress["attempts"] = {};

  for (const attemptId of attemptIds) {
    const remoteAttempt = remoteAttempts[attemptId];
    const localAttempt = localAttempts[attemptId];
    const nextAttempt = chooseAttempt(remoteAttempt, localAttempt);

    if (nextAttempt) {
      attempts[attemptId] = nextAttempt;
    }
  }

  return attempts;
}

function mergeSubmittedExerciseAnswers({
  attempts,
  localAnswers,
  localAttempts,
  remoteAnswers,
  remoteAttempts,
}: {
  attempts: LearningProgress["attempts"];
  localAnswers: Record<string, LessonAnswer>;
  localAttempts: LearningProgress["attempts"];
  remoteAnswers: Record<string, LessonAnswer>;
  remoteAttempts: LearningProgress["attempts"];
}) {
  const exerciseIds = new Set([...Object.keys(remoteAnswers), ...Object.keys(localAnswers)]);
  const answers: Record<string, LessonAnswer> = {};

  for (const exerciseId of exerciseIds) {
    const localAnswer = localAnswers[exerciseId];
    const remoteAnswer = remoteAnswers[exerciseId];
    const winningAttempt = attempts[exerciseId];

    if (!localAnswer) {
      if (remoteAnswer) {
        answers[exerciseId] = remoteAnswer;
      }
      continue;
    }

    if (!remoteAnswer) {
      answers[exerciseId] = localAnswer;
      continue;
    }

    answers[exerciseId] =
      winningAttempt === localAttempts[exerciseId] ||
      isAttemptNewer(localAttempts[exerciseId], remoteAttempts[exerciseId])
        ? localAnswer
        : remoteAnswer;
  }

  return answers;
}

function chooseAttempt(
  remoteAttempt: ExerciseAttempt | undefined,
  localAttempt: ExerciseAttempt | undefined,
) {
  if (!remoteAttempt) {
    return localAttempt;
  }

  if (!localAttempt) {
    return remoteAttempt;
  }

  if (isAttemptNewer(localAttempt, remoteAttempt)) {
    return localAttempt;
  }

  if (isAttemptNewer(remoteAttempt, localAttempt)) {
    return remoteAttempt;
  }

  return localAttempt.score >= remoteAttempt.score ? localAttempt : remoteAttempt;
}

function isAttemptNewer(
  candidate: ExerciseAttempt | undefined,
  comparison: ExerciseAttempt | undefined,
) {
  return getAttemptTime(candidate) > getAttemptTime(comparison);
}

function getAttemptTime(attempt: ExerciseAttempt | undefined) {
  if (!attempt) {
    return 0;
  }

  const time = Date.parse(attempt.submittedAt);

  return Number.isFinite(time) ? time : 0;
}
