import type { ComponentType } from "react";

import type { Locale } from "@/features/localization/localization";

type LessonMdxComponent = ComponentType<{
  components?: Record<string, ComponentType<Record<string, unknown>>>;
}>;

const lessonSlugAliases: Record<string, string> = {
  "0-6-formulating-machine-learning-problems": "0-6-formulating-ml-problems",
  "1-1-ml-tools-and-libraries": "1-1-ml-tools-libraries",
  "1-4-cleaning-and-transformation": "1-4-cleaning-transformation",
  "1-5-exploratory-and-explanatory-data-analysis": "1-5-exploratory-explanatory-analysis",
};

const indonesianLessonMdxModules = import.meta.glob<LessonMdxComponent>("./mdx/*.mdx", {
  eager: true,
  import: "default",
});
const englishLessonMdxModules = import.meta.glob<LessonMdxComponent>("./mdx/en/*.mdx", {
  eager: true,
  import: "default",
});

function getLessonIdFromMdxPath(path: string) {
  const fileName = path.split("/").pop() ?? "";
  const stem = fileName.replace(/\.mdx$/, "");
  const lessonSlug = lessonSlugAliases[stem] ?? stem;

  return `lesson-${lessonSlug}`;
}

function createLessonMdxContentById(modules: Record<string, LessonMdxComponent>) {
  return Object.fromEntries(
    Object.entries(modules).map(([path, component]) => [getLessonIdFromMdxPath(path), component]),
  ) as Partial<Record<string, LessonMdxComponent>>;
}

export const lessonMdxContentByLocaleAndId: Record<
  Locale,
  Partial<Record<string, LessonMdxComponent>>
> = {
  en: createLessonMdxContentById(englishLessonMdxModules),
  id: createLessonMdxContentById(indonesianLessonMdxModules),
};
