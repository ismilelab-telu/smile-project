import { describe, expect, it } from "vitest";

import {
  evaluateMultipleChoice,
  evaluateOpenDatasetSourceExercise,
} from "./evaluate-lesson-exercises";
import type { MultipleChoiceExercise, OpenDatasetSourceExercise } from "../types";

const multipleOptionExercise: MultipleChoiceExercise = {
  correctOptionIds: ["problem", "data", "model", "training", "evaluation"],
  hints: [],
  id: "exercise-core-components",
  options: [
    { id: "problem", label: "Masalah" },
    { id: "data", label: "Data" },
    { id: "model", label: "Model" },
    { id: "training", label: "Pelatihan" },
    { id: "evaluation", label: "Evaluasi" },
    { id: "guessing", label: "Menebak" },
  ],
  prompt: "Pilih komponen utama.",
  type: "multiple-choice",
};

const openDatasetSourceExercise: OpenDatasetSourceExercise = {
  hints: [],
  id: "exercise-open-dataset-source",
  introParagraphs: [],
  introTitle: "Mengumpulkan data terbuka",
  minimumCompleteSources: 1,
  minimumDistinctDomains: 1,
  notesLabel: "Catatan",
  prompt: "Cari sumber data.",
  sourceGuidance: [],
  sourceGuidanceTitle: "Sumber",
  sourceInputs: [
    {
      description: "Demand",
      id: "demand-source",
      label: "Demand",
      notesPlaceholder: "Catatan demand",
      urlPlaceholder: "https://...",
    },
  ],
  taskDescription: "Cari satu sumber.",
  taskTitle: "Tugas",
  type: "open-dataset-source",
  urlLabel: "Link",
};

describe("evaluateMultipleChoice", () => {
  it("explains when a multiple-option answer has too few selections", () => {
    const result = evaluateMultipleChoice(multipleOptionExercise, [
      "training",
      "evaluation",
      "guessing",
    ]);

    expect(result.status).toBe("partial");
    expect(result.message).toBe("Pilih 5 opsi untuk pertanyaan ini. Saat ini kamu memilih 3.");
    expect(result.nextStep).toBe("Tambahkan 2 pilihan lagi, lalu kirim ulang.");
  });

  it("explains when the count is right but one selected option is wrong", () => {
    const result = evaluateMultipleChoice(multipleOptionExercise, [
      "data",
      "model",
      "training",
      "evaluation",
      "guessing",
    ]);

    expect(result.status).toBe("partial");
    expect(result.message).toBe("Jumlah pilihan sudah sesuai, tapi ada pilihan yang belum tepat.");
    expect(result.nextStep).toBe("Ganti pilihan yang tidak sesuai, lalu kirim ulang.");
  });

  it("supports English feedback", () => {
    const result = evaluateMultipleChoice(
      multipleOptionExercise,
      ["training", "evaluation", "guessing"],
      "en",
    );

    expect(result.status).toBe("partial");
    expect(result.message).toBe("Select 5 options for this question. You currently selected 3.");
    expect(result.nextStep).toBe("Add 2 more selections, then submit again.");
  });
});

describe("evaluateOpenDatasetSourceExercise", () => {
  it("asks for dataset sources before giving credit", () => {
    const result = evaluateOpenDatasetSourceExercise(openDatasetSourceExercise, {});

    expect(result.status).toBe("incorrect");
    expect(result.message).toBe("Belum ada sumber dataset yang dicatat.");
  });

  it("requires a valid URL", () => {
    const result = evaluateOpenDatasetSourceExercise(openDatasetSourceExercise, {
      "demand-source": {
        notes:
          "Halaman ini punya kolom jumlah order, periode transaksi, lisensi, dan catatan bahwa cakupan shift perlu dicek.",
        url: "kaggle.com/cafe-demand",
      },
    });

    expect(result.status).toBe("partial");
    expect(result.message).toBe("Ada link yang belum berbentuk URL HTTP atau HTTPS yang valid.");
  });

  it("accepts one complete cafe dataset link without requiring notes", () => {
    const result = evaluateOpenDatasetSourceExercise(openDatasetSourceExercise, {
      "demand-source": {
        notes: "",
        url: "https://www.kaggle.com/datasets/example/cafe-demand",
      },
    });

    expect(result.status).toBe("correct");
    expect(result.score).toBe(100);
  });
});
