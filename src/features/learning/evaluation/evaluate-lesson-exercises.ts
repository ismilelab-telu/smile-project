import type { EvaluationResult, MultipleChoiceExercise, OrderedStepsExercise } from "../types";

function createResult(input: Omit<EvaluationResult, "extraColumnIds" | "missedColumnIds">) {
  return {
    ...input,
    extraColumnIds: [],
    missedColumnIds: [],
  };
}

function sameOrder(left: string[], right: string[]) {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

export function evaluateMultipleChoice(
  exercise: MultipleChoiceExercise,
  selectedOptionIds: string[],
): EvaluationResult {
  const correct = new Set(exercise.correctOptionIds);
  const selected = new Set(selectedOptionIds);
  const requiredOptionCount = correct.size;
  const selectedOptionCount = selected.size;
  const isMultipleOptionExercise = requiredOptionCount > 1;
  const correctSelectedCount = exercise.correctOptionIds.filter((optionId) =>
    selected.has(optionId),
  ).length;
  const incorrectSelectedCount = selectedOptionIds.filter(
    (optionId) => !correct.has(optionId),
  ).length;

  if (
    correctSelectedCount === exercise.correctOptionIds.length &&
    incorrectSelectedCount === 0 &&
    selected.size === correct.size
  ) {
    return createResult({
      message: "Pilihanmu sudah sesuai dengan konsep yang dicek di lesson ini.",
      nextStep: "Lesson ini selesai. Lanjutkan ke lesson berikutnya yang sudah terbuka.",
      score: 100,
      status: "correct",
      title: "Benar",
    });
  }

  if (isMultipleOptionExercise && selectedOptionCount !== requiredOptionCount) {
    const difference = Math.abs(requiredOptionCount - selectedOptionCount);
    const nextStep =
      selectedOptionCount < requiredOptionCount
        ? `Tambahkan ${difference} pilihan lagi, lalu kirim ulang.`
        : `Kurangi ${difference} pilihan, lalu kirim ulang.`;

    return createResult({
      message: `Pilih ${requiredOptionCount} opsi untuk pertanyaan ini. Saat ini kamu memilih ${selectedOptionCount}.`,
      nextStep,
      score: correctSelectedCount > 0 ? 45 : 20,
      status: correctSelectedCount > 0 ? "partial" : "incorrect",
      title: correctSelectedCount > 0 ? "Sebagian benar" : "Belum tepat",
    });
  }

  if (isMultipleOptionExercise && incorrectSelectedCount > 0) {
    return createResult({
      message: "Jumlah pilihan sudah sesuai, tapi ada pilihan yang belum tepat.",
      nextStep: "Ganti pilihan yang tidak sesuai, lalu kirim ulang.",
      score: correctSelectedCount > 0 ? 55 : 20,
      status: correctSelectedCount > 0 ? "partial" : "incorrect",
      title: correctSelectedCount > 0 ? "Sebagian benar" : "Belum tepat",
    });
  }

  if (correctSelectedCount === 1 && incorrectSelectedCount === 0) {
    return createResult({
      message:
        "Jawabanmu sudah mengarah ke pilihan yang benar, tapi masih ada pilihan lain yang perlu dipilih.",
      nextStep: "Baca lagi pertanyaannya, lalu cari pilihan lain yang masih sesuai.",
      score: 60,
      status: "partial",
      title: "Sebagian benar",
    });
  }

  if (correctSelectedCount === exercise.correctOptionIds.length && incorrectSelectedCount === 1) {
    return createResult({
      message: "Pilihan yang benar sudah ada, tapi ada satu pilihan tambahan yang tidak perlu.",
      nextStep: "Hapus pilihan yang tidak sesuai, lalu submit lagi.",
      score: 40,
      status: "partial",
      title: "Sebagian benar",
    });
  }

  return createResult({
    message: "Jawabanmu belum tepat.",
    nextStep: "Coba baca pertanyaannya lagi dan gunakan petunjuk kalau masih ragu.",
    score: 20,
    status: "incorrect",
    title: "Belum tepat",
  });
}

function hasSingleAdjacentSwap(answer: string[], expected: string[]) {
  const mismatchedIndexes = expected.flatMap((stepId, index) =>
    answer[index] === stepId ? [] : [index],
  );

  if (mismatchedIndexes.length !== 2) {
    return false;
  }

  const [firstIndex, secondIndex] = mismatchedIndexes;

  return (
    secondIndex === firstIndex + 1 &&
    answer[firstIndex] === expected[secondIndex] &&
    answer[secondIndex] === expected[firstIndex]
  );
}

function indexOf(stepIds: string[], stepId: string) {
  const index = stepIds.indexOf(stepId);

  return index === -1 ? Number.POSITIVE_INFINITY : index;
}

export function evaluateOrderedSteps(
  exercise: OrderedStepsExercise,
  orderedStepIds: string[],
): EvaluationResult {
  if (sameOrder(orderedStepIds, exercise.correctStepIds)) {
    return createResult({
      message:
        "Urutan ini membuat pemodelan tetap didasarkan pada pemahaman data, persiapan data, dan evaluasi yang jelas.",
      nextStep:
        "Lesson modul ini selesai. Kamu bisa kembali ke halaman belajar untuk melihat progres.",
      score: 100,
      status: "correct",
      title: "Benar",
    });
  }

  const modelingIndex = indexOf(orderedStepIds, "modeling");
  const dataUnderstandingIndex = indexOf(orderedStepIds, "data-understanding");
  const cleaningIndex = indexOf(orderedStepIds, "cleaning");
  const splitIndex = indexOf(orderedStepIds, "split");

  if (modelingIndex < dataUnderstandingIndex || modelingIndex < cleaningIndex) {
    return createResult({
      message:
        "Pemodelan dilakukan terlalu awal. Ini bisa membuat model terlihat berguna sebelum data dan evaluasinya siap.",
      nextStep:
        "Pindahkan pemodelan setelah pemahaman data, pembersihan, persiapan fitur, dan pembagian data latih/uji.",
      score: 20,
      status: "incorrect",
      title: "Belum tepat",
    });
  }

  if (
    hasSingleAdjacentSwap(orderedStepIds, exercise.correctStepIds) &&
    modelingIndex > splitIndex
  ) {
    return createResult({
      message: "Urutannya hampir benar. Hanya ada satu pasangan langkah yang tertukar.",
      nextStep: "Periksa urutan di sekitar pasangan yang tertukar, lalu kirim lagi.",
      score: 75,
      status: "partial",
      title: "Sebagian benar",
    });
  }

  return createResult({
    message:
      "Alur besarnya sudah terlihat, tetapi urutan pembagian data, baseline, pemodelan, dan evaluasi masih perlu diperbaiki.",
    nextStep:
      "Letakkan pembagian data sebelum baseline, baseline sebelum perbandingan model, dan evaluasi setelah pemodelan.",
    score: 50,
    status: "partial",
    title: "Sebagian benar",
  });
}
