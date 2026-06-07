import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { AuthProvider } from "@/features/auth/auth-context";
import { LocalizationProvider } from "@/features/localization/localization";
import { machineLearningFoundationsTrack } from "../content/learning-content";
import type { LearningProgress } from "../types";
import { LearningHome } from "./LearningHome";

function createProgress(completedLessonIds: string[] = []): LearningProgress {
  return {
    attempts: {},
    completedLessonIds,
    lessonAnswers: {},
    submittedExerciseAnswers: {},
    version: 1,
  };
}

function renderLearningHome(progress = createProgress()) {
  return render(
    <AuthProvider>
      <LocalizationProvider>
        <LearningHome progress={progress} track={machineLearningFoundationsTrack} />
      </LocalizationProvider>
    </AuthProvider>,
  );
}

describe("LearningHome search", () => {
  it("shows matching lesson snippets while typing in the track search box", async () => {
    renderLearningHome();

    fireEvent.change(screen.getByRole("searchbox", { name: "Cari lesson" }), {
      target: { value: "EDA" },
    });

    expect(await screen.findByText("Lesson 1.5 / Keyword")).toBeInTheDocument();
    expect(screen.getAllByText("EDA").length).toBeGreaterThan(0);
  });

  it("clears search results from the clear button", async () => {
    renderLearningHome();

    fireEvent.change(screen.getByRole("searchbox", { name: "Cari lesson" }), {
      target: { value: "EDA" },
    });
    expect(await screen.findByText("Lesson 1.5 / Keyword")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Hapus pencarian" }));

    await waitFor(() => {
      expect(screen.queryByText("Lesson 1.5 / Keyword")).not.toBeInTheDocument();
    });
  });
});
