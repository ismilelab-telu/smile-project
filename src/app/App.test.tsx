import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { App } from "./App";
import { learningProgressStorageKey } from "@/features/learning/progress/learning-progress";

const foundationsTrackPath = "/learn/track-machine-learning-foundations";
const lesson01Path = `${foundationsTrackPath}/lesson-0-1-what-is-machine-learning`;
const lesson02Path = `${foundationsTrackPath}/lesson-0-2-machine-learning-in-ai`;
const lesson03Path = `${foundationsTrackPath}/lesson-0-3-core-components`;
const lesson04Path = `${foundationsTrackPath}/lesson-0-4-learning-types`;
const lesson05Path = `${foundationsTrackPath}/lesson-0-5-machine-learning-use-cases`;
const lesson06Path = `${foundationsTrackPath}/lesson-0-6-formulating-ml-problems`;
const module0LessonIds = [
  "lesson-0-1-what-is-machine-learning",
  "lesson-0-2-machine-learning-in-ai",
  "lesson-0-3-core-components",
  "lesson-0-4-learning-types",
  "lesson-0-5-machine-learning-use-cases",
  "lesson-0-6-formulating-ml-problems",
];

function seedCompletedLessons(completedLessonIds: string[]) {
  window.localStorage.setItem(
    learningProgressStorageKey,
    JSON.stringify({
      attempts: {},
      completedLessonIds,
      version: 1,
    }),
  );
}

function getStoredCompletedLessonIds() {
  return getStoredLearningProgress().completedLessonIds;
}

function getStoredLearningProgress() {
  const stored = window.localStorage.getItem(learningProgressStorageKey);

  if (!stored) {
    throw new Error("Expected learning progress to be stored.");
  }

  return JSON.parse(stored) as {
    completedLessonIds: string[];
    lessonAnswers?: Record<
      string,
      {
        selectedOptionIdsByExerciseId?: Record<string, string[]>;
      }
    >;
  };
}

async function chooseColumnRole(columnLabel: string, roleLabel: string) {
  fireEvent.click(screen.getByRole("button", { name: `Role for ${columnLabel}` }));
  fireEvent.click(await screen.findByRole("option", { name: roleLabel }));
}

function getFirstDatasetRow() {
  const table = screen.getByRole("table");
  const rows = within(table).getAllByRole("row");

  if (!rows[1]) {
    throw new Error("Expected the dataset table to have at least one data row.");
  }

  return rows[1];
}

describe("App", () => {
  const lazyRouteTimeout = { timeout: 3000 };

  beforeEach(() => {
    vi.restoreAllMocks();
    window.localStorage.clear();
    window.history.pushState(null, "", "/");
  });

  it("routes from landing to the Explore mode selection", async () => {
    render(<App />);

    fireEvent.click(
      await screen.findByRole("link", { name: /Open Explore page/ }, lazyRouteTimeout),
    );

    expect(
      await screen.findByRole("heading", { name: "Choose a mode." }, lazyRouteTimeout),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Learning Mode/ })).toHaveAttribute("href", "/learn");
    expect(screen.getByRole("link", { name: /ML Playground/ })).toHaveAttribute(
      "href",
      "/playground",
    );
    expect(screen.getByRole("link", { name: /Algorithm Lab/ })).toHaveAttribute(
      "href",
      "/algorithm-lab",
    );
    expect(window.location.pathname).toBe("/explore");
  });

  it("shows the Learning Mode track choices before a lesson list", async () => {
    window.history.pushState(null, "", "/learn");
    render(<App />);

    expect(
      await screen.findByRole("heading", { name: "Choose a learning path" }, lazyRouteTimeout),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Machine Learning Foundations" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Start path/ })).toHaveAttribute(
      "href",
      foundationsTrackPath,
    );
    expect(screen.getByText("Regression")).toBeInTheDocument();
    expect(screen.getByText("Clustering")).toBeInTheDocument();
    expect(screen.getByText("Classification")).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: /Coming soon/ })).toHaveLength(3);
  });

  it("shows only the first Machine Learning Foundations lesson as available without progress", async () => {
    window.history.pushState(null, "", foundationsTrackPath);
    render(<App />);

    expect(
      await screen.findByRole(
        "heading",
        { name: "Machine Learning Foundations" },
        lazyRouteTimeout,
      ),
    ).toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: /^Start$/ })).toHaveLength(1);
    expect(screen.getByRole("link", { name: /^Start$/ })).toHaveAttribute("href", lesson01Path);
    expect(document.querySelector(`a[href="${lesson02Path}"]`)).toBeNull();
    expect(document.querySelector(`a[href="${lesson06Path}"]`)).toBeNull();
    expect(screen.getAllByText("Locked").length).toBeGreaterThanOrEqual(2);
  });

  it("requires confirmation before resetting learning progress", async () => {
    seedCompletedLessons(module0LessonIds.slice(0, 2));
    window.history.pushState(null, "", foundationsTrackPath);
    render(<App />);

    expect(
      await screen.findByRole(
        "heading",
        { name: "Machine Learning Foundations" },
        lazyRouteTimeout,
      ),
    ).toBeInTheDocument();
    expect(screen.getByText("2/13")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Reset progress" }));

    const firstDialog = await screen.findByRole("alertdialog", {
      name: "Reset learning progress?",
    });
    expect(
      within(firstDialog).getByText(
        "This action cannot be undone. It will delete your learning progress.",
      ),
    ).toBeInTheDocument();
    expect(getStoredCompletedLessonIds()).toEqual(module0LessonIds.slice(0, 2));

    fireEvent.click(within(firstDialog).getByRole("button", { name: "Cancel" }));

    await waitFor(() => {
      expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
    });
    expect(screen.getByText("2/13")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Reset progress" }));

    const secondDialog = await screen.findByRole("alertdialog", {
      name: "Reset learning progress?",
    });
    fireEvent.click(within(secondDialog).getByRole("button", { name: "Reset progress" }));

    await waitFor(() => {
      expect(screen.getByText("0/13")).toBeInTheDocument();
    });
    expect(getStoredCompletedLessonIds()).toEqual([]);
  });

  it("completes the first lesson, persists progress, and unlocks the next lesson", async () => {
    window.history.pushState(null, "", lesson01Path);
    render(<App />);

    expect(
      await screen.findByRole("heading", { name: "Apa Itu Machine Learning" }, lazyRouteTimeout),
    ).toBeInTheDocument();

    const wrongSingleOption = screen.getByLabelText(
      "Komputer menjalankan daftar aturan tetap yang ditulis manusia untuk semua kondisi.",
    );
    const correctSingleOption = screen.getByLabelText(
      "Komputer belajar pola dari data agar dapat membuat prediksi, rekomendasi, atau keputusan untuk contoh baru.",
    );

    fireEvent.click(wrongSingleOption);
    fireEvent.click(correctSingleOption);

    expect(wrongSingleOption).not.toBeChecked();
    expect(correctSingleOption).toBeChecked();

    fireEvent.click(screen.getByRole("button", { name: "Submit answer" }));

    expect(await screen.findAllByRole("heading", { name: "Correct" })).toHaveLength(1);
    expect(screen.queryByRole("button", { name: "Submit answer" })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: /^Next$/ })).toHaveAttribute("href", lesson02Path);
    expect(getStoredCompletedLessonIds()).toContain("lesson-0-1-what-is-machine-learning");

    fireEvent.click(screen.getAllByRole("link", { name: "Back to Learning Path" })[0]);

    expect(
      await screen.findByRole(
        "heading",
        { name: "Machine Learning Foundations" },
        lazyRouteTimeout,
      ),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /^Review$/ })).toHaveAttribute("href", lesson01Path);
    expect(screen.getByRole("link", { name: /^Start$/ })).toHaveAttribute("href", lesson02Path);
    expect(document.querySelector(`a[href="${lesson03Path}"]`)).toBeNull();

    fireEvent.click(screen.getByRole("link", { name: /^Review$/ }));

    expect(
      await screen.findByRole("heading", { name: "Apa Itu Machine Learning" }, lazyRouteTimeout),
    ).toBeInTheDocument();
    expect(
      screen.getByLabelText(
        "Komputer belajar pola dari data agar dapat membuat prediksi, rekomendasi, atau keputusan untuk contoh baru.",
      ),
    ).toBeChecked();
    expect(screen.getByRole("heading", { name: "Correct" })).toBeInTheDocument();
  });

  it("keeps a draft answer when leaving before submit", async () => {
    window.history.pushState(null, "", lesson01Path);
    render(<App />);

    expect(
      await screen.findByRole("heading", { name: "Apa Itu Machine Learning" }, lazyRouteTimeout),
    ).toBeInTheDocument();

    fireEvent.click(
      screen.getByLabelText(
        "Komputer menjalankan daftar aturan tetap yang ditulis manusia untuk semua kondisi.",
      ),
    );

    await waitFor(() => {
      expect(
        getStoredLearningProgress().lessonAnswers?.["lesson-0-1-what-is-machine-learning"]
          ?.selectedOptionIdsByExerciseId?.["exercise-0-1-what-is-machine-learning"],
      ).toEqual(["manual-rules-only"]);
    });

    fireEvent.click(screen.getAllByRole("link", { name: "Back to Learning Path" })[0]);

    expect(
      await screen.findByRole(
        "heading",
        { name: "Machine Learning Foundations" },
        lazyRouteTimeout,
      ),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("link", { name: /^Start$/ }));

    expect(
      await screen.findByRole("heading", { name: "Apa Itu Machine Learning" }, lazyRouteTimeout),
    ).toBeInTheDocument();
    expect(
      screen.getByLabelText(
        "Komputer menjalankan daftar aturan tetap yang ditulis manusia untuk semua kondisi.",
      ),
    ).toBeChecked();
    expect(screen.getByRole("button", { name: "Submit answer" })).not.toBeDisabled();
  });

  it("sorts the dataset preview when a column header is clicked", async () => {
    seedCompletedLessons(module0LessonIds.slice(0, 5));
    window.history.pushState(null, "", lesson06Path);
    render(<App />);

    expect(
      await screen.findByRole(
        "heading",
        { name: "Merumuskan Masalah dalam Machine Learning" },
        lazyRouteTimeout,
      ),
    ).toBeInTheDocument();

    const drinksSoldHeader = screen.getByRole("button", { name: "Sort by Drinks Sold" });

    fireEvent.click(drinksSoldHeader);
    expect(within(getFirstDatasetRow()).getByText("SHIFT-010")).toBeInTheDocument();
    expect(within(getFirstDatasetRow()).getByText("58")).toBeInTheDocument();

    fireEvent.click(drinksSoldHeader);
    expect(within(getFirstDatasetRow()).getByText("SHIFT-012")).toBeInTheDocument();
    expect(within(getFirstDatasetRow()).getByText("155")).toBeInTheDocument();
  });

  it("keeps the next lesson locked after an incorrect answer", async () => {
    window.history.pushState(null, "", lesson01Path);
    render(<App />);

    expect(
      await screen.findByRole("heading", { name: "Apa Itu Machine Learning" }, lazyRouteTimeout),
    ).toBeInTheDocument();

    const submitButton = screen.getByRole("button", { name: "Submit answer" });
    expect(submitButton).toBeDisabled();

    fireEvent.click(
      screen.getByLabelText(
        "Komputer menjalankan daftar aturan tetap yang ditulis manusia untuk semua kondisi.",
      ),
    );

    expect(submitButton).not.toBeDisabled();
    fireEvent.click(submitButton);

    expect(await screen.findByRole("heading", { name: "Not quite" })).toBeInTheDocument();
    expect(screen.queryByText("Expected role check")).not.toBeInTheDocument();
    expect(screen.queryByText("drinks_sold: target")).not.toBeInTheDocument();
    expect(getStoredCompletedLessonIds()).not.toContain("lesson-0-1-what-is-machine-learning");

    fireEvent.click(screen.getAllByRole("link", { name: "Back to Learning Path" })[0]);

    expect(
      await screen.findByRole(
        "heading",
        { name: "Machine Learning Foundations" },
        lazyRouteTimeout,
      ),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /^Start$/ })).toHaveAttribute("href", lesson01Path);
    expect(document.querySelector(`a[href="${lesson02Path}"]`)).toBeNull();
  });

  it("blocks direct access to locked Learning Mode lessons", async () => {
    window.history.pushState(null, "", lesson02Path);
    render(<App />);

    expect(
      await screen.findByRole("heading", { name: "Lesson locked" }, lazyRouteTimeout),
    ).toBeInTheDocument();
    expect(screen.getByText("Complete Lesson 0.1 first.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Submit answer" })).not.toBeInTheDocument();
  });

  it("keeps multiple-option selections capped at the required count", async () => {
    seedCompletedLessons(module0LessonIds.slice(0, 2));
    window.history.pushState(null, "", lesson03Path);
    render(<App />);

    expect(
      await screen.findByRole(
        "heading",
        { name: "Komponen Utama dalam Machine Learning" },
        lazyRouteTimeout,
      ),
    ).toBeInTheDocument();
    expect(screen.getByText("Multiple options: select 5 options")).toBeInTheDocument();

    const firstOption = screen.getByLabelText("Masalah atau task yang ingin diselesaikan.");

    fireEvent.click(firstOption);
    fireEvent.click(screen.getByLabelText("Data sebagai contoh untuk belajar."));
    fireEvent.click(screen.getByLabelText("Model yang belajar pola dari data."));
    fireEvent.click(screen.getByLabelText("Training untuk menyesuaikan model."));
    fireEvent.click(screen.getByLabelText("Evaluation untuk menilai manfaat model."));
    fireEvent.click(
      screen.getByLabelText("Menebak hasil tanpa data karena model selalu tahu jawabannya."),
    );

    expect(firstOption).not.toBeChecked();
    expect(
      screen.getAllByRole("checkbox").filter((checkbox) => (checkbox as HTMLInputElement).checked),
    ).toHaveLength(5);

    fireEvent.click(screen.getByRole("button", { name: "Submit answer" }));

    expect(await screen.findByRole("heading", { name: "Partially correct" })).toBeInTheDocument();
    expect(screen.getAllByRole("heading", { name: "Correct" })).toHaveLength(4);
    expect(screen.getByRole("heading", { name: "Incorrect" })).toBeInTheDocument();
  });

  it("submits the learning types lesson", async () => {
    seedCompletedLessons(module0LessonIds.slice(0, 3));
    window.history.pushState(null, "", lesson04Path);
    render(<App />);

    expect(
      await screen.findByRole(
        "heading",
        { name: "Jenis-Jenis Machine Learning" },
        lazyRouteTimeout,
      ),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /^Prev$/ })).toHaveAttribute("href", lesson03Path);

    fireEvent.click(screen.getByLabelText("Regression memprediksi nilai numerik."));
    fireEvent.click(screen.getByLabelText("Classification memprediksi kategori."));
    fireEvent.click(screen.getByLabelText("Clustering mengelompokkan data tanpa label jawaban."));
    fireEvent.click(
      screen.getByLabelText("Reinforcement learning belajar dari reward atas tindakan."),
    );
    fireEvent.click(screen.getByRole("button", { name: "Submit answer" }));

    expect(await screen.findAllByRole("heading", { name: "Correct" })).toHaveLength(4);
    expect(screen.getByRole("link", { name: /^Next$/ })).toHaveAttribute("href", lesson05Path);
    expect(getStoredCompletedLessonIds()).toContain("lesson-0-4-learning-types");
  });

  it("submits the problem formulation lesson with both exercises", async () => {
    seedCompletedLessons(module0LessonIds.slice(0, 5));
    window.history.pushState(null, "", lesson06Path);
    render(<App />);

    expect(
      await screen.findByRole(
        "heading",
        { name: "Merumuskan Masalah dalam Machine Learning" },
        lazyRouteTimeout,
      ),
    ).toBeInTheDocument();

    fireEvent.click(
      screen.getByLabelText(
        "Target yang masuk akal adalah jumlah minuman yang terjual pada shift tersebut.",
      ),
    );
    fireEvent.click(
      screen.getByLabelText(
        "Jenis task yang masuk akal adalah regression karena output berupa angka.",
      ),
    );
    fireEvent.click(
      screen.getByLabelText(
        "Fitur yang aman bisa mencakup hari, jam shift, cuaca yang diprediksi, dan promo yang sudah diketahui sebelum shift.",
      ),
    );
    fireEvent.click(
      screen.getByLabelText(
        "Problem statement yang jelas: memprediksi jumlah minuman terjual sebelum shift dimulai.",
      ),
    );
    await chooseColumnRole("Shift ID", "Metadata");
    await chooseColumnRole("Day Part", "Safe feature");
    await chooseColumnRole("Weather", "Safe feature");
    await chooseColumnRole("Temperature", "Safe feature");
    await chooseColumnRole("Promo Active", "Safe feature");
    await chooseColumnRole("Drinks Sold", "Target");

    fireEvent.click(screen.getByRole("button", { name: "Submit answer" }));

    expect(await screen.findAllByRole("heading", { name: "Correct" })).toHaveLength(4);
    expect(getStoredCompletedLessonIds()).toContain("lesson-0-6-formulating-ml-problems");
  });

  it("unlocks the first lesson in the next module after the previous module is complete", async () => {
    seedCompletedLessons(module0LessonIds);
    window.history.pushState(null, "", `${foundationsTrackPath}/lesson-1-1-ml-tools-libraries`);
    render(<App />);

    expect(
      await screen.findByRole("heading", { name: "ML Tools and Libraries" }, lazyRouteTimeout),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Submit answer" })).toBeInTheDocument();
  });
});
