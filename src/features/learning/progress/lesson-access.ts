import { getModule, learningModules, lessons } from "../content/learning-content";
import type { LearningModule, LearningProgress, Lesson } from "../types";

function getModuleIndex(moduleId: string) {
  return learningModules.findIndex((candidate) => candidate.id === moduleId);
}

function getPreviousLessonId(lesson: Lesson) {
  const module = getModule(lesson.moduleId);

  if (!module) {
    return undefined;
  }

  const lessonIndex = module.lessonIds.indexOf(lesson.id);

  if (lessonIndex === -1) {
    return undefined;
  }

  if (lessonIndex > 0) {
    return module.lessonIds[lessonIndex - 1];
  }

  const moduleIndex = getModuleIndex(module.id);

  if (moduleIndex <= 0) {
    return undefined;
  }

  const previousModule = learningModules[moduleIndex - 1];

  return previousModule?.lessonIds.at(-1);
}

export function isModuleUnlocked(module: LearningModule, progress: LearningProgress) {
  if (module.status !== "available") {
    return false;
  }

  const moduleIndex = getModuleIndex(module.id);

  if (moduleIndex <= 0) {
    return moduleIndex === 0;
  }

  const previousModule = learningModules[moduleIndex - 1];

  if (!previousModule || previousModule.lessonIds.length === 0) {
    return true;
  }

  return previousModule.lessonIds.every((lessonId) =>
    progress.completedLessonIds.includes(lessonId),
  );
}

export function isLessonUnlocked(lesson: Lesson, progress: LearningProgress) {
  const module = getModule(lesson.moduleId);

  if (!module || module.status !== "available") {
    return false;
  }

  const lessonIndex = module.lessonIds.indexOf(lesson.id);

  if (lessonIndex === -1) {
    return false;
  }

  const previousLessonId = getPreviousLessonId(lesson);

  if (!previousLessonId) {
    return true;
  }

  return progress.completedLessonIds.includes(previousLessonId);
}

export function getLessonLockReason(lesson: Lesson, progress: LearningProgress) {
  const module = getModule(lesson.moduleId);

  if (!module || module.status !== "available") {
    return "This module is locked.";
  }

  const lessonIndex = module.lessonIds.indexOf(lesson.id);

  if (lessonIndex === -1) {
    return undefined;
  }

  const previousLessonId = getPreviousLessonId(lesson);

  if (!previousLessonId) {
    return undefined;
  }

  if (progress.completedLessonIds.includes(previousLessonId)) {
    return undefined;
  }

  const previousLesson = lessons.find((candidate) => candidate.id === previousLessonId);

  return `Complete ${previousLesson?.numberLabel ?? "the previous lesson"} first.`;
}
