import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { App } from "./App";
import { localizationStorageKey } from "@/features/localization/localization";
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
    submittedExerciseAnswers?: Record<
      string,
      {
        selectedOptionIdsByExerciseId?: Record<string, string[]>;
      }
    >;
  };
}

async function chooseColumnRole(columnLabel: string, roleLabel: string) {
  fireEvent.click(screen.getByRole("button", { name: `Role untuk ${columnLabel}` }));
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
      await screen.findByRole("heading", { name: "Pilih jalur belajar" }, lazyRouteTimeout),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Dasar-Dasar Machine Learning" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Mulai jalur/ })).toHaveAttribute(
      "href",
      foundationsTrackPath,
    );
    expect(screen.getByText("Regresi")).toBeInTheDocument();
    expect(screen.getByText("Clustering")).toBeInTheDocument();
    expect(screen.getByText("Klasifikasi")).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: /Segera hadir/ })).toHaveLength(3);
  });

  it("switches the Learning menu language and persists the preference", async () => {
    window.history.pushState(null, "", "/learn");
    render(<App />);

    expect(
      await screen.findByRole("heading", { name: "Pilih jalur belajar" }, lazyRouteTimeout),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Buka menu" }));

    expect(screen.getByRole("link", { name: "Beranda" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Mode Belajar" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Pilih bahasa" }));
    fireEvent.click(screen.getByRole("button", { name: "Gunakan English" }));

    expect(window.localStorage.getItem(localizationStorageKey)).toBe("en");
    expect(screen.getByRole("heading", { name: "Choose a learning path" })).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Machine Learning Foundations" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Home" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Learning Mode" })).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "Close menu" }).length).toBeGreaterThan(0);
  });

  it("switches lesson content immediately after changing language", async () => {
    window.history.pushState(null, "", lesson01Path);
    render(<App />);

    expect(
      await screen.findByRole("heading", { name: "Apa Itu Machine Learning" }, lazyRouteTimeout),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Buka menu" }));
    fireEvent.click(screen.getByRole("button", { name: "Pilih bahasa" }));
    fireEvent.click(screen.getByRole("button", { name: "Gunakan English" }));

    expect(screen.getByRole("heading", { name: "What Is Machine Learning" })).toBeInTheDocument();
    expect(screen.getByText("Which statement best explains machine learning?")).toBeInTheDocument();
    expect(
      screen.getByLabelText(
        "The computer learns patterns from data so it can make predictions, recommendations, or decisions for new examples.",
      ),
    ).toBeInTheDocument();
  });

  it("shows only the first Machine Learning Foundations lesson as available without progress", async () => {
    window.history.pushState(null, "", foundationsTrackPath);
    render(<App />);

    expect(
      await screen.findByRole(
        "heading",
        { name: "Dasar-Dasar Machine Learning" },
        lazyRouteTimeout,
      ),
    ).toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: /^Mulai$/ })).toHaveLength(1);
    expect(screen.getByRole("link", { name: /^Mulai$/ })).toHaveAttribute("href", lesson01Path);
    expect(document.querySelector(`a[href="${lesson02Path}"]`)).toBeNull();
    expect(document.querySelector(`a[href="${lesson06Path}"]`)).toBeNull();
    expect(screen.getAllByText("Terkunci").length).toBeGreaterThanOrEqual(2);
  });

  it("requires confirmation before resetting learning progress", async () => {
    seedCompletedLessons(module0LessonIds.slice(0, 2));
    window.history.pushState(null, "", foundationsTrackPath);
    render(<App />);

    expect(
      await screen.findByRole(
        "heading",
        { name: "Dasar-Dasar Machine Learning" },
        lazyRouteTimeout,
      ),
    ).toBeInTheDocument();
    expect(screen.getByText("2/13")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Reset progres" }));

    const firstDialog = await screen.findByRole("alertdialog", {
      name: "Reset progres belajar?",
    });
    expect(
      within(firstDialog).getByText(
        "Tindakan ini tidak bisa dibatalkan. Semua progres belajarmu akan dihapus.",
      ),
    ).toBeInTheDocument();
    expect(getStoredCompletedLessonIds()).toEqual(module0LessonIds.slice(0, 2));

    fireEvent.click(within(firstDialog).getByRole("button", { name: "Batal" }));

    await waitFor(() => {
      expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
    });
    expect(screen.getByText("2/13")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Reset progres" }));

    const secondDialog = await screen.findByRole("alertdialog", {
      name: "Reset progres belajar?",
    });
    fireEvent.click(within(secondDialog).getByRole("button", { name: "Reset progres" }));

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

    fireEvent.click(screen.getByRole("button", { name: "Kirim jawaban" }));

    expect(await screen.findAllByRole("heading", { name: "Benar" })).toHaveLength(1);
    expect(screen.queryByRole("button", { name: "Kirim jawaban" })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: /^Lanjut$/ })).toHaveAttribute("href", lesson02Path);
    expect(getStoredCompletedLessonIds()).toContain("lesson-0-1-what-is-machine-learning");

    fireEvent.click(screen.getAllByRole("link", { name: "Kembali ke Jalur Belajar" })[0]);

    expect(
      await screen.findByRole(
        "heading",
        { name: "Dasar-Dasar Machine Learning" },
        lazyRouteTimeout,
      ),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /^Review$/ })).toHaveAttribute("href", lesson01Path);
    expect(screen.getByRole("link", { name: /^Mulai$/ })).toHaveAttribute("href", lesson02Path);
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
    expect(screen.getByRole("heading", { name: "Benar" })).toBeInTheDocument();
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

    fireEvent.click(screen.getAllByRole("link", { name: "Kembali ke Jalur Belajar" })[0]);

    expect(
      await screen.findByRole(
        "heading",
        { name: "Dasar-Dasar Machine Learning" },
        lazyRouteTimeout,
      ),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("link", { name: /^Mulai$/ }));

    expect(
      await screen.findByRole("heading", { name: "Apa Itu Machine Learning" }, lazyRouteTimeout),
    ).toBeInTheDocument();
    expect(
      screen.getByLabelText(
        "Komputer menjalankan daftar aturan tetap yang ditulis manusia untuk semua kondisi.",
      ),
    ).toBeChecked();
    expect(screen.getByRole("button", { name: "Kirim jawaban" })).not.toBeDisabled();
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

    const drinksSoldHeader = screen.getByRole("button", {
      name: "Urutkan berdasarkan Minuman Terjual",
    });

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

    const submitButton = screen.getByRole("button", { name: "Kirim jawaban" });
    expect(submitButton).toBeDisabled();

    fireEvent.click(
      screen.getByLabelText(
        "Komputer menjalankan daftar aturan tetap yang ditulis manusia untuk semua kondisi.",
      ),
    );

    expect(submitButton).not.toBeDisabled();
    fireEvent.click(submitButton);

    expect(await screen.findByRole("heading", { name: "Belum tepat" })).toBeInTheDocument();
    expect(screen.queryByText("Expected role check")).not.toBeInTheDocument();
    expect(screen.queryByText("drinks_sold: target")).not.toBeInTheDocument();
    expect(getStoredCompletedLessonIds()).not.toContain("lesson-0-1-what-is-machine-learning");

    fireEvent.click(screen.getAllByRole("link", { name: "Kembali ke Jalur Belajar" })[0]);

    expect(
      await screen.findByRole(
        "heading",
        { name: "Dasar-Dasar Machine Learning" },
        lazyRouteTimeout,
      ),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /^Mulai$/ })).toHaveAttribute("href", lesson01Path);
    expect(document.querySelector(`a[href="${lesson02Path}"]`)).toBeNull();
  });

  it("keeps submitted option feedback visible while editing a new draft", async () => {
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
    fireEvent.click(screen.getByRole("button", { name: "Kirim jawaban" }));

    expect(await screen.findByRole("heading", { name: "Belum tepat" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Salah" })).toBeInTheDocument();

    fireEvent.click(correctSingleOption);

    expect(correctSingleOption).toBeChecked();
    expect(wrongSingleOption).not.toBeChecked();
    expect(screen.getByRole("heading", { name: "Belum tepat" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Salah" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Benar" })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Kirim jawaban" }));

    expect(await screen.findAllByRole("heading", { name: "Benar" })).toHaveLength(1);
  });

  it("blocks direct access to locked Learning Mode lessons", async () => {
    window.history.pushState(null, "", lesson02Path);
    render(<App />);

    expect(
      await screen.findByRole("heading", { name: "Lesson terkunci" }, lazyRouteTimeout),
    ).toBeInTheDocument();
    expect(screen.getByText("Selesaikan Lesson 0.1 dulu.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Kirim jawaban" })).not.toBeInTheDocument();
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
    expect(screen.getByText("Pilih 5 jawaban")).toBeInTheDocument();

    const firstOption = screen.getByLabelText("Masalah atau tugas yang ingin diselesaikan.");

    fireEvent.click(firstOption);
    fireEvent.click(screen.getByLabelText("Data sebagai contoh untuk belajar."));
    fireEvent.click(screen.getByLabelText("Model yang belajar pola dari data."));
    fireEvent.click(screen.getByLabelText("Pelatihan untuk menyesuaikan model."));
    fireEvent.click(screen.getByLabelText("Evaluasi untuk menilai manfaat model."));
    fireEvent.click(
      screen.getByLabelText("Menebak hasil tanpa data karena model selalu tahu jawabannya."),
    );

    expect(firstOption).not.toBeChecked();
    expect(
      screen.getAllByRole("checkbox").filter((checkbox) => (checkbox as HTMLInputElement).checked),
    ).toHaveLength(5);

    fireEvent.click(screen.getByRole("button", { name: "Kirim jawaban" }));

    expect(await screen.findByRole("heading", { name: "Sebagian benar" })).toBeInTheDocument();
    expect(screen.getAllByRole("heading", { name: "Benar" })).toHaveLength(4);
    expect(screen.getByRole("heading", { name: "Salah" })).toBeInTheDocument();
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
    expect(screen.getByRole("link", { name: /^Sebelumnya$/ })).toHaveAttribute(
      "href",
      lesson03Path,
    );

    fireEvent.click(screen.getByLabelText("Regresi memprediksi nilai numerik."));
    fireEvent.click(screen.getByLabelText("Klasifikasi memprediksi kategori."));
    fireEvent.click(screen.getByLabelText("Clustering mengelompokkan data tanpa label jawaban."));
    fireEvent.click(
      screen.getByLabelText("Reinforcement learning belajar dari reward atas tindakan."),
    );
    fireEvent.click(screen.getByRole("button", { name: "Kirim jawaban" }));

    expect(await screen.findAllByRole("heading", { name: "Benar" })).toHaveLength(4);
    expect(screen.getByRole("link", { name: /^Lanjut$/ })).toHaveAttribute("href", lesson05Path);
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
        "Jenis masalah yang masuk akal adalah regresi karena output berupa angka.",
      ),
    );
    fireEvent.click(
      screen.getByLabelText(
        "Fitur yang aman bisa mencakup hari, jam shift, cuaca yang diprediksi, dan promo yang sudah diketahui sebelum shift.",
      ),
    );
    fireEvent.click(
      screen.getByLabelText(
        "Pernyataan masalah yang jelas: memprediksi jumlah minuman terjual sebelum shift dimulai.",
      ),
    );
    await chooseColumnRole("ID Shift", "Metadata");
    await chooseColumnRole("Waktu Shift", "Fitur");
    await chooseColumnRole("Cuaca", "Fitur");
    await chooseColumnRole("Suhu", "Fitur");
    await chooseColumnRole("Promo Aktif", "Fitur");
    await chooseColumnRole("Minuman Terjual", "Target");

    const submitButtons = screen.getAllByRole("button", { name: "Kirim jawaban" });
    expect(submitButtons).toHaveLength(2);

    fireEvent.click(submitButtons[0]);
    expect(await screen.findByRole("button", { name: "Terkirim" })).toBeDisabled();
    expect(submitButtons[1]).not.toBeDisabled();

    fireEvent.click(submitButtons[1]);

    expect(await screen.findAllByRole("heading", { name: "Benar" })).toHaveLength(4);
    expect(screen.getByRole("link", { name: /^Lanjut$/ })).toBeInTheDocument();
    expect(getStoredCompletedLessonIds()).toContain("lesson-0-6-formulating-ml-problems");
  });

  it("keeps submitted multi-exercise state after leaving an unfinished lesson", async () => {
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
        "Jenis masalah yang masuk akal adalah regresi karena output berupa angka.",
      ),
    );
    fireEvent.click(
      screen.getByLabelText(
        "Fitur yang aman bisa mencakup hari, jam shift, cuaca yang diprediksi, dan promo yang sudah diketahui sebelum shift.",
      ),
    );
    fireEvent.click(
      screen.getByLabelText(
        "Pernyataan masalah yang jelas: memprediksi jumlah minuman terjual sebelum shift dimulai.",
      ),
    );

    fireEvent.click(screen.getAllByRole("button", { name: "Kirim jawaban" })[0]);

    expect(await screen.findByRole("button", { name: "Terkirim" })).toBeDisabled();
    expect(
      getStoredLearningProgress().submittedExerciseAnswers?.["exercise-0-6-formulate-problem"]
        ?.selectedOptionIdsByExerciseId?.["exercise-0-6-formulate-problem"],
    ).toEqual(["target-demand", "regression-task", "safe-features", "clear-statement"]);

    fireEvent.click(screen.getAllByRole("link", { name: "Kembali ke Jalur Belajar" })[0]);

    expect(
      await screen.findByRole(
        "heading",
        { name: "Dasar-Dasar Machine Learning" },
        lazyRouteTimeout,
      ),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("link", { name: /^Mulai$/ }));

    expect(
      await screen.findByRole(
        "heading",
        { name: "Merumuskan Masalah dalam Machine Learning" },
        lazyRouteTimeout,
      ),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Terkirim" })).toBeDisabled();
    expect(screen.getAllByRole("button", { name: "Kirim jawaban" })).toHaveLength(1);
    expect(screen.getAllByRole("heading", { name: "Benar" })).toHaveLength(4);
  });

  it("unlocks the first lesson in the next module after the previous module is complete", async () => {
    seedCompletedLessons(module0LessonIds);
    window.history.pushState(null, "", `${foundationsTrackPath}/lesson-1-1-ml-tools-libraries`);
    render(<App />);

    expect(
      await screen.findByRole("heading", { name: "Tool dan Library ML" }, lazyRouteTimeout),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Kirim jawaban" })).toBeInTheDocument();
  });
});
