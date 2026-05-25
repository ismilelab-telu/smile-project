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
      message: "Your selection matches the concepts this lesson is checking.",
      nextStep: "This lesson is complete. Continue to the next unlocked lesson.",
      score: 100,
      status: "correct",
      title: "Correct",
    });
  }

  if (isMultipleOptionExercise && selectedOptionCount !== requiredOptionCount) {
    const difference = Math.abs(requiredOptionCount - selectedOptionCount);
    const nextStep =
      selectedOptionCount < requiredOptionCount
        ? `Tambahkan ${difference} pilihan lagi, lalu submit ulang.`
        : `Kurangi ${difference} pilihan, lalu submit ulang.`;

    return createResult({
      message: `Pilih ${requiredOptionCount} opsi untuk pertanyaan ini. Saat ini kamu memilih ${selectedOptionCount}.`,
      nextStep,
      score: correctSelectedCount > 0 ? 45 : 20,
      status: correctSelectedCount > 0 ? "partial" : "incorrect",
      title: correctSelectedCount > 0 ? "Partially correct" : "Not quite",
    });
  }

  if (isMultipleOptionExercise && incorrectSelectedCount > 0) {
    return createResult({
      message: "Jumlah pilihan sudah sesuai, tapi ada pilihan yang belum tepat.",
      nextStep: "Ganti pilihan yang tidak sesuai, lalu submit ulang.",
      score: correctSelectedCount > 0 ? 55 : 20,
      status: correctSelectedCount > 0 ? "partial" : "incorrect",
      title: correctSelectedCount > 0 ? "Partially correct" : "Not quite",
    });
  }

  if (correctSelectedCount === 1 && incorrectSelectedCount === 0) {
    return createResult({
      message:
        "Jawabanmu sudah mengarah ke pilihan yang benar, tapi masih ada pilihan lain yang perlu dipilih.",
      nextStep: "Baca lagi pertanyaannya, lalu cari pilihan lain yang masih sesuai.",
      score: 60,
      status: "partial",
      title: "Partially correct",
    });
  }

  if (correctSelectedCount === exercise.correctOptionIds.length && incorrectSelectedCount === 1) {
    return createResult({
      message: "Pilihan yang benar sudah ada, tapi ada satu pilihan tambahan yang tidak perlu.",
      nextStep: "Hapus pilihan yang tidak sesuai, lalu submit lagi.",
      score: 40,
      status: "partial",
      title: "Partially correct",
    });
  }

  return createResult({
    message: "Jawabanmu belum tepat.",
    nextStep: "Coba baca pertanyaannya lagi dan gunakan hint kalau masih ragu.",
    score: 20,
    status: "incorrect",
    title: "Not quite",
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
        "This order keeps modeling grounded in data understanding, preparation, and a clear evaluation setup.",
      nextStep: "Module 0 lessons are complete. Return to Learning Home to review your progress.",
      score: 100,
      status: "correct",
      title: "Correct",
    });
  }

  const modelingIndex = indexOf(orderedStepIds, "modeling");
  const dataUnderstandingIndex = indexOf(orderedStepIds, "data-understanding");
  const cleaningIndex = indexOf(orderedStepIds, "cleaning");
  const splitIndex = indexOf(orderedStepIds, "split");

  if (modelingIndex < dataUnderstandingIndex || modelingIndex < cleaningIndex) {
    return createResult({
      message:
        "Modeling is happening too early. That can make a model look useful before the data and evaluation setup are ready.",
      nextStep:
        "Move modeling after data understanding, cleaning, feature preparation, and train/test split.",
      score: 20,
      status: "incorrect",
      title: "Not quite",
    });
  }

  if (
    hasSingleAdjacentSwap(orderedStepIds, exercise.correctStepIds) &&
    modelingIndex > splitIndex
  ) {
    return createResult({
      message: "The workflow is nearly correct. Only one neighboring pair is out of order.",
      nextStep: "Check the local order around the swapped pair, then submit again.",
      score: 75,
      status: "partial",
      title: "Partially correct",
    });
  }

  return createResult({
    message:
      "The broad workflow is visible, but the order around split, baseline, modeling, and evaluation still needs work.",
    nextStep:
      "Keep split before baseline, baseline before modeling comparison, and evaluation after modeling.",
    score: 50,
    status: "partial",
    title: "Partially correct",
  });
}
