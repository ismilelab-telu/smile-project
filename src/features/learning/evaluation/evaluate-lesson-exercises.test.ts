import { describe, expect, it } from "vitest";

import { evaluateMultipleChoice } from "./evaluate-lesson-exercises";
import type { MultipleChoiceExercise } from "../types";

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
});
