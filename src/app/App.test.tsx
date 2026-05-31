import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { App } from "./App";
import { localizationStorageKey } from "@/features/localization/localization";
import { learningProgressStorageKey } from "@/features/learning/progress/learning-progress";

const foundationsTrackPath = "/learn/track-machine-learning-foundations";
const lesson01Path = `${foundationsTrackPath}/lesson-0-1-what-is-machine-learning`;
const lesson02Path = `${foundationsTrackPath}/lesson-0-2-machine-learning-in-ai`;
const lesson03Path = `${foundationsTrackPath}/lesson-0-3-core-components`;
const lesson06Path = `${foundationsTrackPath}/lesson-0-6-formulating-ml-problems`;
const lesson11Path = `${foundationsTrackPath}/lesson-1-1-ml-tools-libraries`;
const lesson12Path = `${foundationsTrackPath}/lesson-1-2-data-collecting`;
const lesson13Path = `${foundationsTrackPath}/lesson-1-3-data-loading`;
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
        datasetSourceAnswersByExerciseId?: Record<
          string,
          Record<string, { notes: string; url: string }>
        >;
        selectedOptionIdsByExerciseId?: Record<string, string[]>;
      }
    >;
    submittedExerciseAnswers?: Record<
      string,
      {
        datasetSourceAnswersByExerciseId?: Record<
          string,
          Record<string, { notes: string; url: string }>
        >;
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
    vi.unstubAllGlobals();
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

  it("switches submitted lesson feedback immediately after changing language", async () => {
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
    fireEvent.click(screen.getByRole("button", { name: "Kirim jawaban" }));

    expect(await screen.findByRole("heading", { name: "Belum tepat" })).toBeInTheDocument();
    expect(screen.getByText("Jawabanmu belum tepat.")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Buka menu" }));
    fireEvent.click(screen.getByRole("button", { name: "Pilih bahasa" }));
    fireEvent.click(screen.getByRole("button", { name: "Gunakan English" }));

    expect(screen.getByRole("heading", { name: "Not quite" })).toBeInTheDocument();
    expect(screen.getByText("Your answer is not correct yet.")).toBeInTheDocument();
    expect(screen.queryByText("Jawabanmu belum tepat.")).not.toBeInTheDocument();
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
    expect(screen.getByText("2/9")).toBeInTheDocument();

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
    expect(screen.getByText("2/9")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Reset progres" }));

    const secondDialog = await screen.findByRole("alertdialog", {
      name: "Reset progres belajar?",
    });
    fireEvent.click(within(secondDialog).getByRole("button", { name: "Reset progres" }));

    await waitFor(() => {
      expect(screen.getByText("0/9")).toBeInTheDocument();
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

    expect(await screen.findByRole("img", { name: "Benar" })).toBeInTheDocument();
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
    expect(screen.getByRole("img", { name: "Benar" })).toBeInTheDocument();
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

    const deliveryTimeHeader = screen.getByRole("button", {
      name: "Urutkan berdasarkan Waktu Pengiriman",
    });

    fireEvent.click(deliveryTimeHeader);
    expect(within(getFirstDatasetRow()).getByText("ORD-005")).toBeInTheDocument();
    expect(within(getFirstDatasetRow()).getByText("18")).toBeInTheDocument();

    fireEvent.click(deliveryTimeHeader);
    expect(within(getFirstDatasetRow()).getByText("ORD-011")).toBeInTheDocument();
    expect(within(getFirstDatasetRow()).getByText("65")).toBeInTheDocument();
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
    fireEvent.click(screen.getByRole("button", { name: "Tampilkan petunjuk" }));
    expect(screen.getByText(/sistem belajar pola dari data untuk contoh baru/)).toBeInTheDocument();
    expect(
      screen.queryByText("Cari jawaban yang menyebut belajar dari data."),
    ).not.toBeInTheDocument();
    expect(screen.queryByText("Expected role check")).not.toBeInTheDocument();
    expect(screen.queryByText("delivery_time_min: target")).not.toBeInTheDocument();
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

  it("scrolls feedback into view after an incorrect lesson submission", async () => {
    const scrollIntoView = vi.fn();

    Object.defineProperty(Element.prototype, "scrollIntoView", {
      configurable: true,
      value: scrollIntoView,
    });
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
    fireEvent.click(screen.getByRole("button", { name: "Kirim jawaban" }));

    expect(await screen.findByRole("heading", { name: "Belum tepat" })).toBeInTheDocument();
    await waitFor(() => {
      expect(scrollIntoView).toHaveBeenCalledWith(expect.objectContaining({ block: "start" }));
    });
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
    expect(screen.getByRole("img", { name: "Salah" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Tampilkan petunjuk" }));

    expect(screen.getByText(/sistem belajar pola dari data untuk contoh baru/)).toBeInTheDocument();

    fireEvent.click(correctSingleOption);

    expect(correctSingleOption).toBeChecked();
    expect(wrongSingleOption).not.toBeChecked();
    expect(screen.getByRole("heading", { name: "Belum tepat" })).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "Salah" })).toBeInTheDocument();
    expect(screen.getByText(/sistem belajar pola dari data untuk contoh baru/)).toBeInTheDocument();
    expect(screen.queryByRole("img", { name: "Benar" })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Kirim jawaban" }));

    expect(await screen.findByRole("img", { name: "Benar" })).toBeInTheDocument();
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
    expect(screen.getAllByRole("img", { name: "Benar" })).toHaveLength(4);
    expect(screen.getByRole("img", { name: "Salah" })).toBeInTheDocument();
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
      screen.getByLabelText("Target yang masuk akal adalah waktu pengiriman dalam menit."),
    );
    fireEvent.click(
      screen.getByLabelText(
        "Jenis masalah yang masuk akal adalah regresi karena output berupa angka.",
      ),
    );
    fireEvent.click(
      screen.getByLabelText(
        "Fitur yang aman bisa mencakup jarak, cuaca, level trafik, waktu hari, jenis kendaraan, waktu persiapan, dan pengalaman kurir.",
      ),
    );
    fireEvent.click(
      screen.getByLabelText(
        "Pernyataan masalah yang jelas: memprediksi durasi pengiriman makanan dari konteks order dan pengiriman.",
      ),
    );
    await chooseColumnRole("Order ID", "Metadata");
    await chooseColumnRole("Jarak", "Fitur");
    await chooseColumnRole("Cuaca", "Fitur");
    await chooseColumnRole("Level Trafik", "Fitur");
    await chooseColumnRole("Waktu Hari", "Fitur");
    await chooseColumnRole("Jenis Kendaraan", "Fitur");
    await chooseColumnRole("Waktu Persiapan", "Fitur");
    await chooseColumnRole("Pengalaman Kurir", "Fitur");
    await chooseColumnRole("Waktu Pengiriman", "Target");

    const submitButtons = screen.getAllByRole("button", { name: "Kirim jawaban" });
    expect(submitButtons).toHaveLength(2);

    fireEvent.click(submitButtons[0]);
    expect(await screen.findByRole("button", { name: "Terkirim" })).toBeDisabled();
    const nextSubmitButton = screen.getByRole("button", { name: "Kirim jawaban" });
    expect(nextSubmitButton).not.toBeDisabled();

    fireEvent.click(nextSubmitButton);

    await waitFor(() => {
      expect(screen.getAllByRole("heading", { name: "Benar" })).toHaveLength(9);
      expect(screen.getAllByRole("img", { name: "Benar" })).toHaveLength(4);
    });
    expect(screen.getByRole("link", { name: /^Lanjut$/ })).toBeInTheDocument();
    await waitFor(() => {
      expect(getStoredCompletedLessonIds()).toContain("lesson-0-6-formulating-ml-problems");
    });
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
      screen.getByLabelText("Target yang masuk akal adalah waktu pengiriman dalam menit."),
    );
    fireEvent.click(
      screen.getByLabelText(
        "Jenis masalah yang masuk akal adalah regresi karena output berupa angka.",
      ),
    );
    fireEvent.click(
      screen.getByLabelText(
        "Fitur yang aman bisa mencakup jarak, cuaca, level trafik, waktu hari, jenis kendaraan, waktu persiapan, dan pengalaman kurir.",
      ),
    );
    fireEvent.click(
      screen.getByLabelText(
        "Pernyataan masalah yang jelas: memprediksi durasi pengiriman makanan dari konteks order dan pengiriman.",
      ),
    );

    fireEvent.click(screen.getAllByRole("button", { name: "Kirim jawaban" })[0]);

    expect(await screen.findByRole("button", { name: "Terkirim" })).toBeDisabled();
    await waitFor(() => {
      expect(
        getStoredLearningProgress().submittedExerciseAnswers?.["exercise-0-6-formulate-problem"]
          ?.selectedOptionIdsByExerciseId?.["exercise-0-6-formulate-problem"],
      ).toEqual(["target-demand", "regression-task", "safe-features", "clear-statement"]);
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
      await screen.findByRole(
        "heading",
        { name: "Merumuskan Masalah dalam Machine Learning" },
        lazyRouteTimeout,
      ),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Terkirim" })).toBeDisabled();
    expect(screen.getAllByRole("button", { name: "Kirim jawaban" })).toHaveLength(1);
    expect(screen.getAllByRole("img", { name: "Benar" })).toHaveLength(4);
  });

  it("unlocks the first lesson in the next module after the previous module is complete", async () => {
    seedCompletedLessons(module0LessonIds);
    window.history.pushState(null, "", lesson11Path);
    render(<App />);

    expect(
      await screen.findByRole("heading", { name: "Tool dan Library ML" }, lazyRouteTimeout),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Kirim jawaban" })).toBeInTheDocument();
  });

  it("cancels dataset source edits and restores the submitted answer", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline validation")));
    seedCompletedLessons([...module0LessonIds, "lesson-1-1-ml-tools-libraries"]);
    window.history.pushState(null, "", lesson12Path);
    render(<App />);

    expect(
      await screen.findByRole("heading", { name: "Pengumpulan Data" }, lazyRouteTimeout),
    ).toBeInTheDocument();

    fireEvent.click(
      screen.getByLabelText("Tetapkan output prediksi, unit baris, dan cakupan data."),
    );
    fireEvent.click(
      screen.getByLabelText("Catat asal sumber, periode data, dan cara pengambilannya."),
    );
    fireEvent.click(screen.getByLabelText("Cek izin, privasi, dan batasan pemakaian field."));
    fireEvent.click(
      screen.getByLabelText(
        "Pastikan variasi jarak, cuaca, trafik, waktu hari, kendaraan, dan kurir terwakili.",
      ),
    );
    fireEvent.click(screen.getAllByRole("button", { name: "Kirim jawaban" })[0]);
    expect(await screen.findByRole("button", { name: "Terkirim" })).toBeDisabled();

    const submittedUrl = "https://www.kaggle.com/datasets/nama-pembuat/nama-dataset";
    const submittedNotes = "Dataset berisi konteks pengiriman makanan untuk latihan regresi.";

    fireEvent.change(screen.getByLabelText("Dataset food delivery: Link dataset"), {
      target: { value: submittedUrl },
    });
    fireEvent.change(screen.getByLabelText("Dataset food delivery: Tentang dataset"), {
      target: { value: submittedNotes },
    });
    fireEvent.click(screen.getByRole("button", { name: "Kirim jawaban" }));

    fireEvent.click(await screen.findByRole("button", { name: "Edit" }));

    const editedUrl = "https://www.kaggle.com/datasets/nama-pembuat/dataset-lain";
    const editedNotes = "Catatan sementara yang harus dibatalkan.";

    fireEvent.change(screen.getByLabelText("Dataset food delivery: Link dataset"), {
      target: { value: editedUrl },
    });
    fireEvent.change(screen.getByLabelText("Dataset food delivery: Tentang dataset"), {
      target: { value: editedNotes },
    });

    await waitFor(() => {
      expect(
        getStoredLearningProgress().lessonAnswers?.["lesson-1-2-data-collecting"]
          ?.datasetSourceAnswersByExerciseId?.["exercise-1-2-open-source-data-search"]?.[
          "demand-source"
        ]?.url,
      ).toBe(editedUrl);
    });

    fireEvent.click(screen.getByRole("button", { name: "Batal" }));

    expect(screen.getByLabelText("Dataset food delivery: Link dataset")).toHaveValue(submittedUrl);
    expect(screen.getByText(submittedNotes)).toBeInTheDocument();
    expect(screen.queryByDisplayValue(editedNotes)).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Batal" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Edit" })).toBeInTheDocument();
    await waitFor(() => {
      expect(
        getStoredLearningProgress().lessonAnswers?.["lesson-1-2-data-collecting"]
          ?.datasetSourceAnswersByExerciseId?.["exercise-1-2-open-source-data-search"]?.[
          "demand-source"
        ]?.url,
      ).toBe(submittedUrl);
    });
  });

  it("asks for confirmation before opening external lesson links", async () => {
    seedCompletedLessons([...module0LessonIds, "lesson-1-1-ml-tools-libraries"]);
    window.history.pushState(null, "", lesson12Path);
    const openSpy = vi.spyOn(window, "open").mockImplementation(() => null);

    render(<App />);

    expect(
      await screen.findByRole("heading", { name: "Pengumpulan Data" }, lazyRouteTimeout),
    ).toBeInTheDocument();

    const kaggleLink = (await screen.findAllByRole("link", { name: "Kaggle" }))[0];

    if (!kaggleLink) {
      throw new Error("Expected a Kaggle link in the data collecting lesson.");
    }

    await waitFor(() => {
      expect(kaggleLink).toHaveAttribute("data-link-preview-trigger");
      expect(kaggleLink).toHaveAttribute("target", "_blank");
      expect(kaggleLink).toHaveAttribute("rel", expect.stringContaining("noopener"));
      expect(kaggleLink).toHaveAttribute("rel", expect.stringContaining("noreferrer"));
    });

    fireEvent.mouseEnter(kaggleLink);

    const previewCard = await waitFor(() => {
      const card = document.querySelector("[data-link-preview-card]");

      expect(card).not.toBeNull();

      return card as HTMLElement;
    });
    const kagglePreviewImage = previewCard.querySelector("img");

    expect(decodeURIComponent(kagglePreviewImage?.getAttribute("src") ?? "")).toContain(
      "https://www.kaggle.com/datasets",
    );

    fireEvent.mouseEnter(screen.getByRole("link", { name: "World Bank" }));

    await waitFor(() => {
      const currentPreviewCard = document.querySelector("[data-link-preview-card]");
      const currentPreviewImage = currentPreviewCard?.querySelector("img");

      expect(currentPreviewCard).toBe(previewCard);
      expect(decodeURIComponent(currentPreviewImage?.getAttribute("src") ?? "")).toContain(
        "https://data.worldbank.org/",
      );
    });

    fireEvent.click(kaggleLink);

    const dialog = await screen.findByRole("alertdialog", {
      name: "Buka tautan eksternal",
    });

    expect(
      within(dialog).getByText("Kamu akan meninggalkan Smile untuk membuka tautan eksternal:"),
    ).toBeInTheDocument();
    expect(within(dialog).getByDisplayValue("https://www.kaggle.com/datasets")).toBeInTheDocument();

    fireEvent.click(within(dialog).getByRole("button", { name: "Buka tautan" }));

    expect(openSpy).toHaveBeenCalledWith(
      "https://www.kaggle.com/datasets",
      "_blank",
      "noopener,noreferrer",
    );
  });

  it("opens lesson 1.3 after data collecting is complete", async () => {
    seedCompletedLessons([
      ...module0LessonIds,
      "lesson-1-1-ml-tools-libraries",
      "lesson-1-2-data-collecting",
    ]);
    window.history.pushState(null, "", lesson13Path);
    render(<App />);

    expect(
      await screen.findByRole("heading", { name: "Memuat Data" }, lazyRouteTimeout),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Setelah dataset dipilih, aksi mana yang termasuk tahap memuat data?"),
    ).toBeInTheDocument();
    expect(screen.getByText("Python")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Salin kode" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Kirim jawaban" })).toBeInTheDocument();
  });
});
