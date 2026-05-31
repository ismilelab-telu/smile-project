import { describe, expect, it } from "vitest";

import type { LearningProgress } from "../types";
import { mergeLearningProgress } from "./learning-progress-sync";

function createProgress(partial: Partial<LearningProgress>): LearningProgress {
  return {
    attempts: {},
    completedLessonIds: [],
    lessonAnswers: {},
    submittedExerciseAnswers: {},
    version: 1,
    ...partial,
  };
}

describe("mergeLearningProgress", () => {
  it("keeps remote progress while merging newer local browser progress", () => {
    const remote = createProgress({
      attempts: {
        "exercise-1": {
          exerciseId: "exercise-1",
          score: 70,
          status: "partial",
          submittedAt: "2026-05-31T10:00:00.000Z",
        },
      },
      completedLessonIds: ["lesson-1"],
      lessonAnswers: {
        "lesson-1": { selectedOptionIdsByExerciseId: { "exercise-1": ["remote"] } },
      },
      submittedExerciseAnswers: {
        "exercise-1": { selectedOptionIdsByExerciseId: { "exercise-1": ["remote"] } },
      },
    });
    const local = createProgress({
      attempts: {
        "exercise-1": {
          exerciseId: "exercise-1",
          score: 100,
          status: "correct",
          submittedAt: "2026-05-31T11:00:00.000Z",
        },
      },
      completedLessonIds: ["lesson-2"],
      lessonAnswers: {
        "lesson-2": { selectedOptionIdsByExerciseId: { "exercise-2": ["local"] } },
      },
      submittedExerciseAnswers: {
        "exercise-1": { selectedOptionIdsByExerciseId: { "exercise-1": ["local"] } },
      },
    });

    const merged = mergeLearningProgress(remote, local);

    expect(merged.completedLessonIds).toEqual(["lesson-1", "lesson-2"]);
    expect(merged.attempts["exercise-1"]?.status).toBe("correct");
    expect(merged.lessonAnswers["lesson-1"]).toEqual(remote.lessonAnswers["lesson-1"]);
    expect(merged.lessonAnswers["lesson-2"]).toEqual(local.lessonAnswers["lesson-2"]);
    expect(merged.submittedExerciseAnswers?.["exercise-1"]).toEqual(
      local.submittedExerciseAnswers?.["exercise-1"],
    );
  });
});
