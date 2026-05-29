import {
  getModule,
  isLessonAvailable,
  learningModules,
  lessons,
} from "../content/learning-content";
import type { LearningModule, LearningProgress, Lesson } from "../types";

function getModuleIndex(moduleId: string) {
  return learningModules.findIndex((candidate) => candidate.id === moduleId);
}

function getAvailableModuleLessons(module: LearningModule) {
  return module.lessonIds
    .map((lessonId) => lessons.find((candidate) => candidate.id === lessonId))
    .filter((candidate) => candidate !== undefined)
    .filter(isLessonAvailable);
}

function getPreviousLessonId(lesson: Lesson) {
  const module = getModule(lesson.moduleId);

  if (!module) {
    return undefined;
  }

  const moduleLessons = getAvailableModuleLessons(module);
  const lessonIndex = moduleLessons.findIndex((candidate) => candidate.id === lesson.id);

  if (lessonIndex === -1) {
    return undefined;
  }

  if (lessonIndex > 0) {
    return moduleLessons[lessonIndex - 1]?.id;
  }

  const moduleIndex = getModuleIndex(module.id);

  if (moduleIndex <= 0) {
    return undefined;
  }

  const previousModule = learningModules[moduleIndex - 1];

  if (!previousModule) {
    return undefined;
  }

  return getAvailableModuleLessons(previousModule).at(-1)?.id;
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

  if (!previousModule) {
    return true;
  }

  const previousModuleLessons = getAvailableModuleLessons(previousModule);

  if (previousModuleLessons.length === 0) {
    return true;
  }

  return previousModuleLessons.every((lesson) => progress.completedLessonIds.includes(lesson.id));
}

export function isLessonUnlocked(lesson: Lesson, progress: LearningProgress) {
  if (!isLessonAvailable(lesson)) {
    return false;
  }

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
  if (!isLessonAvailable(lesson)) {
    return "Lesson ini segera hadir.";
  }

  const module = getModule(lesson.moduleId);

  if (!module || module.status !== "available") {
    return "Modul ini masih terkunci.";
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

  return `Selesaikan ${previousLesson?.numberLabel ?? "lesson sebelumnya"} dulu.`;
}
