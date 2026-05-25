import type { EvaluationResult, MultipleChoiceExercise, OrderedStepsExercise } from "../types";
import type { Locale } from "@/features/localization/localization";

const resultTitleCopy: Record<Locale, Record<EvaluationResult["status"], string>> = {
  en: {
    correct: "Correct",
    incorrect: "Not quite",
    partial: "Partially correct",
  },
  id: {
    correct: "Benar",
    incorrect: "Belum tepat",
    partial: "Sebagian benar",
  },
};

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
  locale: Locale = "id",
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
  const title = resultTitleCopy[locale];

  if (
    correctSelectedCount === exercise.correctOptionIds.length &&
    incorrectSelectedCount === 0 &&
    selected.size === correct.size
  ) {
    return createResult({
      message:
        locale === "en"
          ? "Your selection matches the concept checked in this lesson."
          : "Pilihanmu sudah sesuai dengan konsep yang dicek di lesson ini.",
      nextStep:
        locale === "en"
          ? "This lesson is complete. Continue to the next unlocked lesson."
          : "Lesson ini selesai. Lanjutkan ke lesson berikutnya yang sudah terbuka.",
      score: 100,
      status: "correct",
      title: title.correct,
    });
  }

  if (isMultipleOptionExercise && selectedOptionCount !== requiredOptionCount) {
    const difference = Math.abs(requiredOptionCount - selectedOptionCount);
    const nextStep =
      selectedOptionCount < requiredOptionCount
        ? locale === "en"
          ? `Add ${difference} more selection${difference === 1 ? "" : "s"}, then submit again.`
          : `Tambahkan ${difference} pilihan lagi, lalu kirim ulang.`
        : locale === "en"
          ? `Remove ${difference} selection${difference === 1 ? "" : "s"}, then submit again.`
          : `Kurangi ${difference} pilihan, lalu kirim ulang.`;
    const status = correctSelectedCount > 0 ? "partial" : "incorrect";

    return createResult({
      message:
        locale === "en"
          ? `Select ${requiredOptionCount} options for this question. You currently selected ${selectedOptionCount}.`
          : `Pilih ${requiredOptionCount} opsi untuk pertanyaan ini. Saat ini kamu memilih ${selectedOptionCount}.`,
      nextStep,
      score: correctSelectedCount > 0 ? 45 : 20,
      status,
      title: title[status],
    });
  }

  if (isMultipleOptionExercise && incorrectSelectedCount > 0) {
    const status = correctSelectedCount > 0 ? "partial" : "incorrect";

    return createResult({
      message:
        locale === "en"
          ? "The number of selections is right, but one or more selected options are not correct."
          : "Jumlah pilihan sudah sesuai, tapi ada pilihan yang belum tepat.",
      nextStep:
        locale === "en"
          ? "Replace the option that does not fit, then submit again."
          : "Ganti pilihan yang tidak sesuai, lalu kirim ulang.",
      score: correctSelectedCount > 0 ? 55 : 20,
      status,
      title: title[status],
    });
  }

  if (correctSelectedCount === 1 && incorrectSelectedCount === 0) {
    return createResult({
      message:
        locale === "en"
          ? "Your answer is moving toward the correct choices, but there are still other options to select."
          : "Jawabanmu sudah mengarah ke pilihan yang benar, tapi masih ada pilihan lain yang perlu dipilih.",
      nextStep:
        locale === "en"
          ? "Read the question again, then find the other option that still fits."
          : "Baca lagi pertanyaannya, lalu cari pilihan lain yang masih sesuai.",
      score: 60,
      status: "partial",
      title: title.partial,
    });
  }

  if (correctSelectedCount === exercise.correctOptionIds.length && incorrectSelectedCount === 1) {
    return createResult({
      message:
        locale === "en"
          ? "The correct choices are selected, but there is one extra option that is not needed."
          : "Pilihan yang benar sudah ada, tapi ada satu pilihan tambahan yang tidak perlu.",
      nextStep:
        locale === "en"
          ? "Remove the option that does not fit, then submit again."
          : "Hapus pilihan yang tidak sesuai, lalu submit lagi.",
      score: 40,
      status: "partial",
      title: title.partial,
    });
  }

  return createResult({
    message: locale === "en" ? "Your answer is not correct yet." : "Jawabanmu belum tepat.",
    nextStep:
      locale === "en"
        ? "Read the question again and use the hint if you are still unsure."
        : "Coba baca pertanyaannya lagi dan gunakan petunjuk kalau masih ragu.",
    score: 20,
    status: "incorrect",
    title: title.incorrect,
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
  locale: Locale = "id",
): EvaluationResult {
  const title = resultTitleCopy[locale];

  if (sameOrder(orderedStepIds, exercise.correctStepIds)) {
    return createResult({
      message:
        locale === "en"
          ? "This order keeps modeling grounded in data understanding, data preparation, and clear evaluation."
          : "Urutan ini membuat pemodelan tetap didasarkan pada pemahaman data, persiapan data, dan evaluasi yang jelas.",
      nextStep:
        locale === "en"
          ? "This module lesson is complete. You can return to the learning page to see progress."
          : "Lesson modul ini selesai. Kamu bisa kembali ke halaman belajar untuk melihat progres.",
      score: 100,
      status: "correct",
      title: title.correct,
    });
  }

  const modelingIndex = indexOf(orderedStepIds, "modeling");
  const dataUnderstandingIndex = indexOf(orderedStepIds, "data-understanding");
  const cleaningIndex = indexOf(orderedStepIds, "cleaning");
  const splitIndex = indexOf(orderedStepIds, "split");

  if (modelingIndex < dataUnderstandingIndex || modelingIndex < cleaningIndex) {
    return createResult({
      message:
        locale === "en"
          ? "Modeling is happening too early. This can make a model look useful before the data and evaluation are ready."
          : "Pemodelan dilakukan terlalu awal. Ini bisa membuat model terlihat berguna sebelum data dan evaluasinya siap.",
      nextStep:
        locale === "en"
          ? "Move modeling after data understanding, cleaning, feature preparation, and train/test splitting."
          : "Pindahkan pemodelan setelah pemahaman data, pembersihan, persiapan fitur, dan pembagian data latih/uji.",
      score: 20,
      status: "incorrect",
      title: title.incorrect,
    });
  }

  if (
    hasSingleAdjacentSwap(orderedStepIds, exercise.correctStepIds) &&
    modelingIndex > splitIndex
  ) {
    return createResult({
      message:
        locale === "en"
          ? "The order is almost correct. Only one pair of steps is swapped."
          : "Urutannya hampir benar. Hanya ada satu pasangan langkah yang tertukar.",
      nextStep:
        locale === "en"
          ? "Check the order around the swapped pair, then submit again."
          : "Periksa urutan di sekitar pasangan yang tertukar, lalu kirim lagi.",
      score: 75,
      status: "partial",
      title: title.partial,
    });
  }

  return createResult({
    message:
      locale === "en"
        ? "The overall workflow is visible, but the order of data splitting, baseline, modeling, and evaluation still needs adjustment."
        : "Alur besarnya sudah terlihat, tetapi urutan pembagian data, baseline, pemodelan, dan evaluasi masih perlu diperbaiki.",
    nextStep:
      locale === "en"
        ? "Place data splitting before the baseline, the baseline before model comparison, and evaluation after modeling."
        : "Letakkan pembagian data sebelum baseline, baseline sebelum perbandingan model, dan evaluasi setelah pemodelan.",
    score: 50,
    status: "partial",
    title: title.partial,
  });
}
