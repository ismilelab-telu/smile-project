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

  it("keeps coming-soon matches visible but ranks locked matches above them", async () => {
    renderLearningHome();

    fireEvent.change(screen.getByRole("searchbox", { name: "Cari lesson" }), {
      target: { value: "missing values" },
    });

    const lockedResultLabel = await screen.findByText("Lesson 1.3 / Materi lesson");
    const comingSoonResultLabel = await screen.findByText("Lesson 1.5 / Materi lesson");

    expect(
      lockedResultLabel.compareDocumentPosition(comingSoonResultLabel) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(document.body).toHaveTextContent(
      "Pengecekan eksploratif biasanya mencakup: missing values per kolom;",
    );
  });
});
