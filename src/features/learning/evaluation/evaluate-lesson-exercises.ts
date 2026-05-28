import type {
  DatasetSourceAnswer,
  EvaluationResult,
  MultipleChoiceExercise,
  OpenDatasetSourceExercise,
  OrderedStepsExercise,
} from "../types";
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

function createSuggestedHints(contextualHints: string[], fallbackHints: string[]) {
  return [...contextualHints, ...fallbackHints].filter(
    (hint, index, hints) => hint.trim() !== "" && hints.indexOf(hint) === index,
  );
}

function getMultipleChoiceAnswerHints(exercise: MultipleChoiceExercise, locale: Locale) {
  if (exercise.hints.length >= exercise.correctOptionIds.length) {
    return exercise.hints.slice(0, exercise.correctOptionIds.length);
  }

  const fallbackHint =
    locale === "en"
      ? "Read each option as a claim, then keep only the claims supported by the lesson concept."
      : "Baca setiap opsi sebagai klaim, lalu pertahankan hanya klaim yang didukung konsep lesson.";

  return exercise.correctOptionIds.map((_, index) => exercise.hints[index] ?? fallbackHint);
}

function getMultipleChoiceSuggestedHints(
  exercise: MultipleChoiceExercise,
  selectedOptionIds: string[],
  locale: Locale,
) {
  const selected = new Set(selectedOptionIds);
  const answerHints = getMultipleChoiceAnswerHints(exercise, locale);
  const missedAnswerHints = exercise.correctOptionIds.flatMap((optionId, index) =>
    selected.has(optionId) ? [] : [answerHints[index]],
  );

  return missedAnswerHints.length > 0 ? missedAnswerHints : answerHints;
}

function sameOrder(left: string[], right: string[]) {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

function parseHttpUrl(value: string) {
  try {
    const url = new URL(value);

    return url.protocol === "http:" || url.protocol === "https:" ? url : null;
  } catch {
    return null;
  }
}

export function evaluateOpenDatasetSourceExercise(
  exercise: OpenDatasetSourceExercise,
  answersBySourceId: Record<string, DatasetSourceAnswer>,
  locale: Locale = "id",
): EvaluationResult {
  const title = resultTitleCopy[locale];
  const sourceAnswers = exercise.sourceInputs.map((sourceInput) => ({
    answer: answersBySourceId[sourceInput.id] ?? { notes: "", url: "" },
    sourceInput,
  }));
  const touchedSources = sourceAnswers.filter(
    ({ answer }) => answer.url.trim() !== "" || answer.notes.trim() !== "",
  );
  const linkedSources = sourceAnswers.filter(({ answer }) => answer.url.trim() !== "");

  if (touchedSources.length === 0) {
    return createResult({
      message:
        locale === "en"
          ? "No dataset source has been recorded yet."
          : "Belum ada sumber dataset yang dicatat.",
      nextStep:
        locale === "en"
          ? "Start with the public Food Delivery Time Prediction dataset page link."
          : "Mulai dari link halaman dataset Food Delivery Time Prediction publik.",
      score: 20,
      status: "incorrect",
      suggestedHints: createSuggestedHints(
        [
          locale === "en"
            ? "Fill in the dataset page link first; notes can come after the page is readable."
            : "Isi link halaman dataset dulu; catatan bisa menyusul setelah halaman terbaca.",
          locale === "en"
            ? "Use a public dataset page, not a search result or a page that depends on a private session."
            : "Gunakan halaman dataset publik, bukan hasil pencarian atau halaman yang bergantung pada sesi pribadi.",
        ],
        exercise.hints,
      ),
      title: title.incorrect,
    });
  }

  if (linkedSources.length < exercise.minimumCompleteSources) {
    const needsUrlAfterNotes = touchedSources.length > linkedSources.length;

    return createResult({
      message:
        locale === "en"
          ? `Record links for at least ${exercise.minimumCompleteSources} sources. You have recorded ${linkedSources.length}.`
          : `Catat link untuk minimal ${exercise.minimumCompleteSources} sumber. Saat ini yang terisi baru ${linkedSources.length}.`,
      nextStep:
        locale === "en"
          ? "Paste the dataset page URL. Context notes are optional."
          : "Tempel URL halaman dataset. Catatan konteks bersifat opsional.",
      score: linkedSources.length > 0 ? 45 : 25,
      status: linkedSources.length > 0 ? "partial" : "incorrect",
      suggestedHints: createSuggestedHints(
        [
          needsUrlAfterNotes
            ? locale === "en"
              ? "Notes do not replace the source URL; the validator still needs the public page link."
              : "Catatan tidak menggantikan URL sumber; validator tetap membutuhkan link halaman publiknya."
            : locale === "en"
              ? "Check which source inputs are still missing a URL."
              : "Cek input sumber mana yang masih belum punya URL.",
          locale === "en"
            ? "Paste the full page address from the browser address bar."
            : "Tempel alamat halaman lengkap dari address bar browser.",
        ],
        exercise.hints,
      ),
      title: linkedSources.length > 0 ? title.partial : title.incorrect,
    });
  }

  const parsedSourceUrls = linkedSources.map(({ answer }) => parseHttpUrl(answer.url.trim()));

  if (parsedSourceUrls.some((url) => url === null)) {
    return createResult({
      message:
        locale === "en"
          ? "One or more links are not valid HTTP or HTTPS URLs."
          : "Ada link yang belum berbentuk URL HTTP atau HTTPS yang valid.",
      nextStep:
        locale === "en"
          ? "Paste the full source page link, including https://, then submit again."
          : "Tempel link halaman sumber secara utuh, termasuk https://, lalu kirim ulang.",
      score: 55,
      status: "partial",
      suggestedHints: createSuggestedHints(
        [
          locale === "en"
            ? "A valid URL starts with http:// or https:// and includes the domain."
            : "URL valid dimulai dengan http:// atau https:// dan menyertakan domain.",
          locale === "en"
            ? "Do not paste only the site name, dataset title, or search keywords."
            : "Jangan hanya menempel nama situs, judul dataset, atau kata kunci pencarian.",
        ],
        exercise.hints,
      ),
      title: title.partial,
    });
  }

  const distinctHosts = new Set(
    parsedSourceUrls
      .filter((url): url is URL => url !== null)
      .map((url) => url.hostname.replace(/^www\./, "")),
  );

  if (distinctHosts.size < exercise.minimumDistinctDomains) {
    return createResult({
      message:
        locale === "en"
          ? "The sources are still concentrated in too few places."
          : "Sumber data masih terlalu terkumpul di tempat yang sama.",
      nextStep:
        locale === "en"
          ? "Use at least one additional source domain if the exercise asks for cross-source context."
          : "Tambahkan minimal satu domain sumber lain jika latihan meminta konteks lintas sumber.",
      score: 65,
      status: "partial",
      suggestedHints: createSuggestedHints(
        [
          locale === "en"
            ? "Compare the main domain of each URL; repeated domains count as one place."
            : "Bandingkan domain utama tiap URL; domain yang berulang dihitung sebagai satu tempat.",
          locale === "en"
            ? "Use another source domain only when the task asks for cross-source context."
            : "Gunakan domain sumber lain hanya saat tugas meminta konteks lintas sumber.",
        ],
        exercise.hints,
      ),
      title: title.partial,
    });
  }

  return createResult({
    message:
      locale === "en"
        ? "The dataset page is readable. Review the About dataset field before continuing."
        : "Halaman dataset berhasil dibaca. Cek kembali bagian Tentang dataset sebelum lanjut.",
    nextStep:
      locale === "en"
        ? "Use that description as context when deciding whether the dataset fits the food delivery time case."
        : "Pakai deskripsi itu sebagai konteks untuk menilai apakah dataset cocok dengan kasus waktu pengiriman makanan.",
    score: 100,
    status: "correct",
    suggestedHints: [],
    title: title.correct,
  });
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
      suggestedHints: [],
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
      suggestedHints: getMultipleChoiceSuggestedHints(exercise, selectedOptionIds, locale),
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
      suggestedHints: getMultipleChoiceSuggestedHints(exercise, selectedOptionIds, locale),
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
      suggestedHints: getMultipleChoiceSuggestedHints(exercise, selectedOptionIds, locale),
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
      suggestedHints: getMultipleChoiceSuggestedHints(exercise, selectedOptionIds, locale),
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
    suggestedHints: getMultipleChoiceSuggestedHints(exercise, selectedOptionIds, locale),
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
      suggestedHints: [],
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
      suggestedHints: createSuggestedHints(
        [
          locale === "en"
            ? "Move modeling after the steps that make the data and evaluation trustworthy."
            : "Pindahkan pemodelan setelah langkah yang membuat data dan evaluasi bisa dipercaya.",
          locale === "en"
            ? "Data understanding and cleaning should happen before the model is trained."
            : "Pemahaman data dan pembersihan perlu terjadi sebelum model dilatih.",
        ],
        exercise.hints,
      ),
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
      suggestedHints: createSuggestedHints(
        [
          locale === "en"
            ? "The overall order is close; focus only on the adjacent pair that feels out of sequence."
            : "Urutan besarnya sudah dekat; fokus hanya pada pasangan langkah bersebelahan yang terasa tertukar.",
          locale === "en"
            ? "Ask which step needs evidence from the previous step before it can happen."
            : "Tanyakan langkah mana yang membutuhkan bukti dari langkah sebelumnya sebelum bisa dilakukan.",
        ],
        exercise.hints,
      ),
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
    suggestedHints: createSuggestedHints(
      [
        locale === "en"
          ? "Build the order from data understanding, preparation, split, baseline, modeling, then evaluation."
          : "Bangun urutan dari pemahaman data, persiapan, split, baseline, pemodelan, lalu evaluasi.",
        locale === "en"
          ? "Steps that judge model performance should come after the model has been trained."
          : "Langkah yang menilai performa model harus muncul setelah model dilatih.",
      ],
      exercise.hints,
    ),
    title: title.partial,
  });
}
