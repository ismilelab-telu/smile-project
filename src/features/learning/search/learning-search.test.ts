import { describe, expect, it } from "vitest";

import {
  learningModules,
  lessons,
  machineLearningFoundationsTrack,
} from "../content/learning-content";
import { createLearningSearchIndex, getLearningSearchHighlightParts } from "./learning-search";

function createFoundationsSearchIndex(locale: "en" | "id" = "en") {
  return createLearningSearchIndex({
    lessons,
    locale,
    modules: learningModules,
    track: machineLearningFoundationsTrack,
  });
}

describe("learning search", () => {
  it("finds a lesson by a compact alias such as EDA", () => {
    const searchIndex = createFoundationsSearchIndex("en");
    const results = searchIndex.search("EDA");

    expect(results[0]).toMatchObject({
      lessonId: "lesson-1-5-exploratory-explanatory-analysis",
      section: "alias",
    });
    expect(results[0]?.snippet).toContain("EDA");
  });

  it("finds lesson body text from raw MDX content", () => {
    const searchIndex = createFoundationsSearchIndex("en");
    const results = searchIndex.search("statistical visualization faster");

    expect(results[0]).toMatchObject({
      lessonId: "lesson-1-1-ml-tools-libraries",
      section: "content",
    });
    expect(results[0]?.snippet).toContain("statistical visualization faster");
  });

  it("keeps MDX search snippets to the matching sentence", () => {
    const searchIndex = createFoundationsSearchIndex("id");
    const results = searchIndex.search("feature selection");
    const lesson12Result = results.find(
      (result) => result.lessonId === "lesson-1-2-data-collecting" && result.section === "content",
    );

    expect(lesson12Result?.snippet).toBe(
      "Catatan ini membantu tahap data loading, cleaning, EDA, dan feature selection.",
    );
  });

  it("adds nearby context to short MDX bullet snippets", () => {
    const searchIndex = createFoundationsSearchIndex("id");
    const results = searchIndex.search("missing values per kolom");
    const lesson15Result = results.find(
      (result) =>
        result.lessonId === "lesson-1-5-exploratory-explanatory-analysis" &&
        result.section === "content",
    );

    expect(lesson15Result?.snippet).toBe(
      "Pengecekan eksploratif biasanya mencakup: missing values per kolom;",
    );
  });

  it("ranks locked matching lessons above coming-soon matching lessons", () => {
    const searchIndex = createLearningSearchIndex({
      lessonAccessById: {
        "lesson-1-3-data-loading": "locked",
        "lesson-1-5-exploratory-explanatory-analysis": "coming-soon",
      },
      lessons,
      locale: "id",
      modules: learningModules,
      track: machineLearningFoundationsTrack,
    });
    const resultLessonIds = searchIndex.search("missing values").map((result) => result.lessonId);
    const lockedLessonIndex = resultLessonIds.indexOf("lesson-1-3-data-loading");
    const comingSoonLessonIndex = resultLessonIds.indexOf(
      "lesson-1-5-exploratory-explanatory-analysis",
    );

    expect(lockedLessonIndex).toBeGreaterThanOrEqual(0);
    expect(comingSoonLessonIndex).toBeGreaterThanOrEqual(0);
    expect(lockedLessonIndex).toBeLessThan(comingSoonLessonIndex);
  });

  it("prefers exact phrase matches over weaker singular matches", () => {
    const searchIndex = createFoundationsSearchIndex("id");
    const resultLessonIds = searchIndex.search("missing values").map((result) => result.lessonId);

    expect(resultLessonIds.indexOf("lesson-1-3-data-loading")).toBeLessThan(
      resultLessonIds.indexOf("lesson-1-1-ml-tools-libraries"),
    );
  });

  it("returns no results for blank queries", () => {
    const searchIndex = createFoundationsSearchIndex("id");

    expect(searchIndex.search("   ")).toEqual([]);
  });

  it("splits highlight parts around the matched query terms", () => {
    const parts = getLearningSearchHighlightParts(
      "Exploratory and Explanatory Data Analysis (EDA)",
      "EDA",
    );

    expect(parts).toContainEqual({ isMatch: true, text: "EDA" });
  });
});
