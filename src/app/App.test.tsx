import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { App } from "./App";
import { clearAuthSession, storeAuthSession } from "@/features/auth/auth-session";
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
const lesson12SourceExerciseId = "exercise-1-2-open-source-data-search";
const lesson13GuidedDownloadExerciseId = "exercise-1-3-kaggle-zip-loading";
type ViewTransitionTestDocument = Document & {
  startViewTransition?: (callback: () => void) => { finished: Promise<void> };
};
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

function seedAuthSession() {
  storeAuthSession({
    accessToken: "access-token",
    expiresAt: Date.now() + 60 * 60 * 1000,
    idToken: "id-token",
    refreshToken: "refresh-token",
    user: {
      email: "student@example.com",
      initials: "ST",
      name: "Student",
      sub: "student-1",
    },
  });
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
    clearAuthSession();
    window.localStorage.clear();
    window.sessionStorage.clear();
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

  it("keeps the learning fade transition when the track page is scrolled", async () => {
    const originalMatchMediaDescriptor = Object.getOwnPropertyDescriptor(window, "matchMedia");
    const originalStartViewTransition = (document as ViewTransitionTestDocument)
      .startViewTransition;
    const originalScrollYDescriptor = Object.getOwnPropertyDescriptor(window, "scrollY");
    const scrollTo = vi.spyOn(window, "scrollTo").mockImplementation(() => {});
    const startViewTransition = vi.fn((callback: () => void) => {
      callback();

      return { finished: Promise.resolve() };
    });

    Object.defineProperty(document, "startViewTransition", {
      configurable: true,
      value: startViewTransition,
    });
    Object.defineProperty(window, "matchMedia", {
      configurable: true,
      value: (query: string): MediaQueryList => ({
        addEventListener: () => undefined,
        addListener: () => undefined,
        dispatchEvent: () => false,
        matches: false,
        media: query,
        onchange: null,
        removeEventListener: () => undefined,
        removeListener: () => undefined,
      }),
    });
    Object.defineProperty(window, "scrollY", {
      configurable: true,
      get: () => 520,
    });

    try {
      seedAuthSession();
      seedCompletedLessons([
        ...module0LessonIds,
        "lesson-1-1-ml-tools-libraries",
        "lesson-1-2-data-collecting",
      ]);
      window.history.pushState(null, "", foundationsTrackPath);
      render(<App />);

      expect(
        await screen.findByRole(
          "heading",
          { name: "Dasar-Dasar Machine Learning" },
          lazyRouteTimeout,
        ),
      ).toBeInTheDocument();

      scrollTo.mockClear();
      startViewTransition.mockClear();

      const lessonLink = document.querySelector<HTMLAnchorElement>(`a[href="${lesson13Path}"]`);

      expect(lessonLink).not.toBeNull();
      fireEvent.click(lessonLink as HTMLAnchorElement);

      expect(startViewTransition).toHaveBeenCalledTimes(1);
      expect(scrollTo).toHaveBeenCalledWith({ top: 0 });
      expect(
        await screen.findByRole("heading", { name: "Memuat Data" }, lazyRouteTimeout),
      ).toBeInTheDocument();
    } finally {
      if (originalStartViewTransition) {
        Object.defineProperty(document, "startViewTransition", {
          configurable: true,
          value: originalStartViewTransition,
        });
      } else {
        Reflect.deleteProperty(document, "startViewTransition");
      }

      if (originalMatchMediaDescriptor) {
        Object.defineProperty(window, "matchMedia", originalMatchMediaDescriptor);
      } else {
        Reflect.deleteProperty(window, "matchMedia");
      }

      if (originalScrollYDescriptor) {
        Object.defineProperty(window, "scrollY", originalScrollYDescriptor);
      } else {
        Reflect.deleteProperty(window, "scrollY");
      }
    }
  });

  it("keeps a lesson scroll position when the webpage is reloaded", async () => {
    const originalScrollYDescriptor = Object.getOwnPropertyDescriptor(window, "scrollY");
    const originalInnerHeightDescriptor = Object.getOwnPropertyDescriptor(window, "innerHeight");
    const originalScrollHeightDescriptor = Object.getOwnPropertyDescriptor(
      document.documentElement,
      "scrollHeight",
    );
    const routeScrollStorageKey = `smile-route-scroll:${lesson13Path}`;
    let currentScrollY = 0;
    const scrollTo = vi.spyOn(window, "scrollTo").mockImplementation((options, y) => {
      currentScrollY = typeof options === "number" ? (y ?? 0) : (options?.top ?? 0);
    });
    const getEntriesByType = vi
      .spyOn(window.performance, "getEntriesByType")
      .mockReturnValue([{ type: "navigate" } as PerformanceNavigationTiming]);

    Object.defineProperty(window, "scrollY", {
      configurable: true,
      get: () => currentScrollY,
    });
    Object.defineProperty(window, "innerHeight", {
      configurable: true,
      value: 800,
    });
    Object.defineProperty(document.documentElement, "scrollHeight", {
      configurable: true,
      value: 3000,
    });

    try {
      seedAuthSession();
      seedCompletedLessons([
        ...module0LessonIds,
        "lesson-1-1-ml-tools-libraries",
        "lesson-1-2-data-collecting",
      ]);
      window.history.pushState(null, "", lesson13Path);
      const { unmount } = render(<App />);

      expect(
        await screen.findByRole("heading", { name: "Memuat Data" }, lazyRouteTimeout),
      ).toBeInTheDocument();

      currentScrollY = 760;
      window.dispatchEvent(new Event("pagehide"));
      expect(window.sessionStorage.getItem(routeScrollStorageKey)).toBe("760");

      unmount();
      currentScrollY = 0;
      scrollTo.mockClear();
      getEntriesByType.mockReturnValue([{ type: "reload" } as PerformanceNavigationTiming]);

      render(<App />);

      await waitFor(() => {
        expect(scrollTo).toHaveBeenCalledWith({ top: 760 });
      });
      expect(scrollTo).not.toHaveBeenCalledWith({ top: 0 });
      expect(
        await screen.findByRole("heading", { name: "Memuat Data" }, lazyRouteTimeout),
      ).toBeInTheDocument();
    } finally {
      if (originalScrollYDescriptor) {
        Object.defineProperty(window, "scrollY", originalScrollYDescriptor);
      } else {
        Reflect.deleteProperty(window, "scrollY");
      }

      if (originalInnerHeightDescriptor) {
        Object.defineProperty(window, "innerHeight", originalInnerHeightDescriptor);
      } else {
        Reflect.deleteProperty(window, "innerHeight");
      }

      if (originalScrollHeightDescriptor) {
        Object.defineProperty(
          document.documentElement,
          "scrollHeight",
          originalScrollHeightDescriptor,
        );
      } else {
        Reflect.deleteProperty(document.documentElement, "scrollHeight");
      }
    }
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

  it("shows the shared auth modal before guests open lesson 1.3 backend tasks", async () => {
    window.localStorage.setItem(localizationStorageKey, "en");
    seedCompletedLessons([
      ...module0LessonIds,
      "lesson-1-1-ml-tools-libraries",
      "lesson-1-2-data-collecting",
    ]);
    window.history.pushState(null, "", foundationsTrackPath);
    render(<App />);

    expect(
      await screen.findByRole(
        "heading",
        { name: "Machine Learning Foundations" },
        lazyRouteTimeout,
      ),
    ).toBeInTheDocument();

    const lessonLink = document.querySelector<HTMLAnchorElement>(`a[href="${lesson13Path}"]`);

    expect(lessonLink).not.toBeNull();
    fireEvent.click(lessonLink as HTMLAnchorElement);

    const dialog = await screen.findByRole("dialog", { name: "Sign in first" }, lazyRouteTimeout);

    expect(window.location.pathname).toBe(foundationsTrackPath);
    expect(
      within(dialog).getByLabelText("Username", { selector: "input:not([disabled])" }),
    ).toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole("button", { name: "Use email instead" }));
    expect(within(dialog).getByLabelText("Email")).toBeInTheDocument();
    expect(within(dialog).getByRole("heading", { name: "Sign in first" })).toBeInTheDocument();
    expect(within(dialog).getByRole("button", { name: "Sign In" })).toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole("button", { name: "Create one" }));
    expect(
      await within(dialog).findByRole("heading", { name: "Create your account" }),
    ).toBeInTheDocument();
    expect(window.location.pathname).toBe(foundationsTrackPath);
    expect(screen.queryByLabelText("Upload ZIP dataset")).not.toBeInTheDocument();
  });

  it("keeps the auth modal open when the backdrop is clicked", async () => {
    window.localStorage.setItem(localizationStorageKey, "en");
    window.history.pushState(null, "", "/login");

    render(<App />);

    const dialog = await screen.findByRole(
      "dialog",
      { name: "Sign in to your account" },
      lazyRouteTimeout,
    );
    const backdrop = document.querySelector<HTMLElement>("[data-auth-backdrop]");

    expect(backdrop).not.toBeNull();
    fireEvent.click(backdrop as HTMLElement);

    expect(dialog).toBeInTheDocument();
    expect(window.location.pathname).toBe("/login");
  });

  it("opens lesson 1.3 after data collecting is complete for signed-in users", async () => {
    const submittedUrl =
      "https://www.kaggle.com/datasets/denkuznetz/food-delivery-time-prediction/data";

    seedAuthSession();
    window.localStorage.setItem(
      learningProgressStorageKey,
      JSON.stringify({
        attempts: {},
        completedLessonIds: [
          ...module0LessonIds,
          "lesson-1-1-ml-tools-libraries",
          "lesson-1-2-data-collecting",
        ],
        submittedExerciseAnswers: {
          "exercise-1-2-open-source-data-search": {
            datasetSourceAnswersByExerciseId: {
              "exercise-1-2-open-source-data-search": {
                "demand-source": {
                  notes: "Dataset berisi konteks pengiriman makanan.",
                  url: submittedUrl,
                },
              },
            },
          },
        },
        version: 1,
      }),
    );
    window.history.pushState(null, "", lesson13Path);
    render(<App />);

    expect(
      await screen.findByRole("heading", { name: "Memuat Data" }, lazyRouteTimeout),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Setelah dataset dipilih, aksi mana yang termasuk tahap memuat data?"),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "Upload ZIP Kaggle, lalu tulis kode Pandas untuk memuat CSV hasil ekstraksi.",
      ),
    ).toBeInTheDocument();
    expect(screen.getByText(submittedUrl)).toBeInTheDocument();
    expect(screen.getByLabelText("Upload ZIP dataset")).toBeInTheDocument();
    expect(screen.getByLabelText("Kode Pandas")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Salin kode" })).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "Kirim jawaban" })).toHaveLength(2);
  });

  it("restores the latest Pandas code output after reloading lesson 1.3", async () => {
    const submittedUrl =
      "https://www.kaggle.com/datasets/denkuznetz/food-delivery-time-prediction/data";
    const extractedFilePath = "food_delivery.csv";
    const pandasCode = `import pandas as pd\n\ndf = pd.read_csv("${extractedFilePath}")\ndf.head()`;

    seedAuthSession();
    window.localStorage.setItem(
      learningProgressStorageKey,
      JSON.stringify({
        attempts: {},
        completedLessonIds: [
          ...module0LessonIds,
          "lesson-1-1-ml-tools-libraries",
          "lesson-1-2-data-collecting",
        ],
        lessonAnswers: {
          "lesson-1-3-data-loading": {
            guidedDownloadCodeByExerciseId: {
              [lesson13GuidedDownloadExerciseId]: pandasCode,
            },
            guidedDownloadExtractedFilePathsByExerciseId: {
              [lesson13GuidedDownloadExerciseId]: extractedFilePath,
            },
            guidedDownloadObjectKeysByExerciseId: {
              [lesson13GuidedDownloadExerciseId]: "guest/demo/dataset.zip",
            },
            guidedDownloadRunResultsByExerciseId: {
              [lesson13GuidedDownloadExerciseId]: {
                code: pandasCode,
                columns: ["order_id", "delivery_time_min"],
                diagnostics: [],
                durationMs: 124.8,
                extractedFilePath,
                message: "",
                rows: [["ORD-001", "32"]],
                status: "correct",
              },
            },
          },
        },
        submittedExerciseAnswers: {
          [lesson12SourceExerciseId]: {
            datasetSourceAnswersByExerciseId: {
              [lesson12SourceExerciseId]: {
                "demand-source": {
                  notes: "Dataset berisi konteks pengiriman makanan.",
                  url: submittedUrl,
                },
              },
            },
          },
        },
        version: 1,
      }),
    );
    window.history.pushState(null, "", lesson13Path);
    render(<App />);

    expect(
      await screen.findByRole("heading", { name: "Memuat Data" }, lazyRouteTimeout),
    ).toBeInTheDocument();
    expect(screen.getByText("Output")).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "order_id" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "delivery_time_min" })).toBeInTheDocument();
    expect(screen.getByRole("cell", { name: "ORD-001" })).toBeInTheDocument();
    expect(screen.getByRole("cell", { name: "32" })).toBeInTheDocument();
    expect(screen.getByText("Took 124,8 ms")).toBeInTheDocument();
  });
});
