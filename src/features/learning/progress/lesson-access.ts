import { getModule, lessons } from "../content/learning-content";
import type { LearningProgress, Lesson } from "../types";

export function isLessonUnlocked(lesson: Lesson, progress: LearningProgress) {
  const module = getModule(lesson.moduleId);

  if (!module || module.status !== "available") {
    return false;
  }

  const lessonIndex = module.lessonIds.indexOf(lesson.id);

  if (lessonIndex === -1) {
    return false;
  }

  if (lessonIndex === 0) {
    return true;
  }

  const previousLessonId = module.lessonIds[lessonIndex - 1];

  return progress.completedLessonIds.includes(previousLessonId);
}

export function getLessonLockReason(lesson: Lesson, progress: LearningProgress) {
  const module = getModule(lesson.moduleId);

  if (!module || module.status !== "available") {
    return "This module is locked.";
  }

  const lessonIndex = module.lessonIds.indexOf(lesson.id);

  if (lessonIndex <= 0) {
    return undefined;
  }

  const previousLessonId = module.lessonIds[lessonIndex - 1];

  if (progress.completedLessonIds.includes(previousLessonId)) {
    return undefined;
  }

  const previousLesson = lessons.find((candidate) => candidate.id === previousLessonId);

  return `Complete ${previousLesson?.numberLabel ?? "the previous lesson"} first.`;
}
