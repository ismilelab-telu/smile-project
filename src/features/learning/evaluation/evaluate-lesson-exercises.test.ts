import { describe, expect, it } from "vitest";

import {
  evaluateMultipleChoice,
  evaluateOpenDatasetSourceExercise,
  evaluateOrderedSteps,
} from "./evaluate-lesson-exercises";
import { learningHintGlossaryByExerciseId } from "../content/learning-hint-glossary";
import { lessons } from "../content/learning-content";
import { localizeLesson } from "../content/localized-learning-content";
import type {
  MultipleChoiceExercise,
  OpenDatasetSourceExercise,
  OrderedStepsExercise,
} from "../types";

const multipleOptionExercise: MultipleChoiceExercise = {
  correctOptionIds: ["problem", "data", "model", "training", "evaluation"],
  hints: [
    "Masalah memberi arah proyek ML.",
    "Data menjadi contoh untuk belajar.",
    "Model menyimpan pola hasil belajar.",
    "Pelatihan menyesuaikan model dari contoh.",
    "Evaluasi mengecek manfaat model.",
  ],
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
  sourceInputs: [
    {
      description: "Waktu pengiriman",
      id: "demand-source",
      label: "Waktu pengiriman",
      notesPlaceholder: "Catatan waktu pengiriman",
      requiredUrlKind: "kaggle-dataset",
      urlPlaceholder: "https://...",
    },
  ],
  taskDescription: "Cari satu sumber.",
  taskTitle: "Tugas",
  type: "open-dataset-source",
  urlLabel: "Link",
};

const orderedStepsExercise: OrderedStepsExercise = {
  correctStepIds: ["data-understanding", "cleaning", "split", "modeling", "evaluation"],
  hints: [],
  id: "exercise-workflow-order",
  prompt: "Urutkan alur kerja ML.",
  steps: [
    { id: "data-understanding", label: "Pahami data" },
    { id: "cleaning", label: "Bersihkan data" },
    { id: "split", label: "Bagi data" },
    { id: "modeling", label: "Latih model" },
    { id: "evaluation", label: "Evaluasi model" },
  ],
  type: "ordered-steps",
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
    expect(result.suggestedHints).toEqual([
      "Masalah memberi arah proyek ML.",
      "Data menjadi contoh untuk belajar.",
      "Model menyimpan pola hasil belajar.",
    ]);
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
    expect(result.suggestedHints).toEqual(["Masalah memberi arah proyek ML."]);
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
    expect(result.suggestedHints).toEqual([
      "Masalah memberi arah proyek ML.",
      "Data menjadi contoh untuk belajar.",
      "Model menyimpan pola hasil belajar.",
    ]);
  });
});

describe("multiple-choice hint content", () => {
  it("keeps the glossary aligned with exercise ids", () => {
    const exerciseIds = new Set(
      lessons.flatMap((lesson) => (lesson.exercises ?? [lesson.exercise]).map(({ id }) => id)),
    );
    const glossaryExerciseIds = Object.keys(learningHintGlossaryByExerciseId);

    expect(glossaryExerciseIds.filter((id) => !exerciseIds.has(id))).toEqual([]);
    expect([...exerciseIds].filter((id) => !(id in learningHintGlossaryByExerciseId))).toEqual([]);
  });

  it("keeps answer hints aligned with correct answers in every locale", () => {
    for (const locale of ["id", "en"] as const) {
      for (const lesson of lessons.map((lesson) => localizeLesson(lesson, locale))) {
        for (const exercise of lesson.exercises ?? [lesson.exercise]) {
          if (exercise.type !== "multiple-choice") {
            continue;
          }

          expect(
            exercise.hints,
            `${locale} ${lesson.id}/${exercise.id} should have one hint per correct answer`,
          ).toHaveLength(exercise.correctOptionIds.length);
          expect(
            exercise.hints.every((hint) => hint.trim() !== ""),
            `${locale} ${lesson.id}/${exercise.id} should not have empty hints`,
          ).toBe(true);
        }
      }
    }
  });
});

describe("evaluateOpenDatasetSourceExercise", () => {
  it("asks for dataset sources before giving credit", () => {
    const result = evaluateOpenDatasetSourceExercise(openDatasetSourceExercise, {});

    expect(result.status).toBe("incorrect");
    expect(result.message).toBe("Belum ada sumber dataset yang dicatat.");
    expect(result.suggestedHints?.[0]).toBe(
      "Isi link halaman dataset dulu; catatan bisa menyusul setelah halaman terbaca.",
    );
  });

  it("requires a valid URL", () => {
    const result = evaluateOpenDatasetSourceExercise(openDatasetSourceExercise, {
      "demand-source": {
        notes:
          "Halaman ini punya kolom jarak, cuaca, trafik, lisensi, dan catatan bahwa cakupan order perlu dicek.",
        url: "kaggle.com/food-delivery-time",
      },
    });

    expect(result.status).toBe("partial");
    expect(result.message).toBe("Ada link yang belum berbentuk URL HTTP atau HTTPS yang valid.");
    expect(result.suggestedHints?.[0]).toBe(
      "URL valid dimulai dengan http:// atau https:// dan menyertakan domain.",
    );
  });

  it("requires the configured Kaggle dataset URL shape", () => {
    const result = evaluateOpenDatasetSourceExercise(openDatasetSourceExercise, {
      "demand-source": {
        notes: "",
        url: "https://www.youtube.com/watch?v=food-delivery-time",
      },
    });

    expect(result.status).toBe("partial");
    expect(result.message).toBe("Link harus mengarah ke halaman dataset Kaggle.");
    expect(result.nextStep).toBe(
      "Gunakan URL dengan format seperti ini: https://www.kaggle.com/datasets/nama-pembuat/nama-dataset.",
    );
  });

  it("rejects Kaggle pages that are not dataset pages", () => {
    const result = evaluateOpenDatasetSourceExercise(openDatasetSourceExercise, {
      "demand-source": {
        notes: "",
        url: "https://www.kaggle.com/datasets",
      },
    });

    expect(result.status).toBe("partial");
    expect(result.message).toBe("Link harus mengarah ke halaman dataset Kaggle.");
  });

  it("accepts one complete food delivery dataset link without requiring notes", () => {
    const result = evaluateOpenDatasetSourceExercise(openDatasetSourceExercise, {
      "demand-source": {
        notes: "",
        url: "https://www.kaggle.com/datasets/denkuznetz/food-delivery-time-prediction/data",
      },
    });

    expect(result.status).toBe("correct");
    expect(result.score).toBe(100);
  });
});

describe("evaluateOrderedSteps", () => {
  it("tailors hints when modeling happens too early", () => {
    const result = evaluateOrderedSteps(orderedStepsExercise, [
      "modeling",
      "data-understanding",
      "cleaning",
      "split",
      "evaluation",
    ]);

    expect(result.status).toBe("incorrect");
    expect(result.suggestedHints?.[0]).toBe(
      "Pindahkan pemodelan setelah langkah yang membuat data dan evaluasi bisa dipercaya.",
    );
  });
});
