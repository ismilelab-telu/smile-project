import type { ColumnRole, EvaluationResult } from "../types";
import type { Locale } from "@/features/localization/localization";

const expectedRoles: Record<string, ColumnRole> = {
  day_part: "safe-feature",
  drinks_sold: "target",
  end_shift_revenue: "ignore",
  promo_active: "safe-feature",
  shift_id: "metadata",
  temperature_c: "safe-feature",
  weather: "safe-feature",
};

const columnLabelsByLocale: Record<Locale, Record<string, string>> = {
  en: {
    day_part: "Day Part",
    drinks_sold: "Drinks Sold",
    end_shift_revenue: "End Shift Revenue",
    promo_active: "Promo Active",
    shift_id: "Shift ID",
    temperature_c: "Temperature",
    weather: "Weather",
  },
  id: {
    day_part: "Waktu Shift",
    drinks_sold: "Minuman Terjual",
    end_shift_revenue: "Pendapatan Akhir Shift",
    promo_active: "Promo Aktif",
    shift_id: "ID Shift",
    temperature_c: "Suhu",
    weather: "Cuaca",
  },
};

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

export function getExpectedColumnRoles() {
  return expectedRoles;
}

function getAssignedColumnIds(assignments: Record<string, ColumnRole>, role: ColumnRole) {
  return Object.keys(expectedRoles).filter((columnId) => assignments[columnId] === role);
}

function formatColumnList(columnIds: string[], locale: Locale) {
  const labels = columnIds.map((columnId) => columnLabelsByLocale[locale][columnId] ?? columnId);

  if (labels.length <= 1) {
    return labels[0] ?? (locale === "en" ? "That column" : "Kolom itu");
  }

  return `${labels.slice(0, -1).join(", ")} ${locale === "en" ? "and" : "dan"} ${labels.at(-1)}`;
}

function getExpectedRoleColumnIds(role: ColumnRole) {
  return Object.entries(expectedRoles).flatMap(([columnId, expectedRole]) =>
    expectedRole === role ? [columnId] : [],
  );
}

function getColumnListVerb(columnIds: string[], locale: Locale) {
  if (locale === "en") {
    return columnIds.length === 1 ? "is marked" : "are marked";
  }

  return columnIds.length === 1 ? "ditandai" : "ditandai";
}

export function evaluateFeatureTargetRoles(
  assignments: Record<string, ColumnRole>,
  locale: Locale = "id",
): EvaluationResult {
  const missedColumnIds: string[] = [];
  const extraColumnIds: string[] = [];
  const title = resultTitleCopy[locale];
  const targetRole = assignments.drinks_sold;
  const targetColumnIds = getAssignedColumnIds(assignments, "target");
  const expectedFeatureColumnIds = getExpectedRoleColumnIds("safe-feature");
  const featureColumnIdsMarkedMetadata = expectedFeatureColumnIds.filter(
    (columnId) => assignments[columnId] === "metadata",
  );
  const featureColumnIdsMarkedSafe = expectedFeatureColumnIds.filter(
    (columnId) => assignments[columnId] === "safe-feature",
  );

  for (const [columnId, expectedRole] of Object.entries(expectedRoles)) {
    const actualRole = assignments[columnId] ?? "ignore";

    if (actualRole !== expectedRole) {
      missedColumnIds.push(columnId);
    }

    if (actualRole === "safe-feature" && expectedRole !== "safe-feature") {
      extraColumnIds.push(columnId);
    }
  }

  if (targetRole !== "target") {
    if (targetColumnIds.length === 0) {
      const targetFeedback =
        targetRole === "safe-feature"
          ? {
              message:
                locale === "en"
                  ? "The demand outcome is being treated like an input feature. A target is the value the model is trying to forecast."
                  : "Hasil permintaan sedang diperlakukan seperti fitur input. Target adalah nilai yang ingin diprediksi model.",
              nextStep:
                locale === "en"
                  ? "Choose exactly one output column as Target, then check which shift details can safely be used as inputs."
                  : "Pilih tepat satu kolom output sebagai Target, lalu cek detail shift mana yang boleh dipakai sebagai input.",
            }
          : targetRole === "metadata"
            ? {
                message:
                  locale === "en"
                    ? "The demand outcome is being treated like metadata. Metadata helps read the shift table, but it is not the model output."
                    : "Hasil permintaan sedang diperlakukan seperti metadata. Metadata membantu membaca tabel shift, tetapi bukan output model.",
                nextStep:
                  locale === "en"
                    ? "Move the demand outcome to the Target role before deciding which columns are metadata and features."
                    : "Pindahkan hasil permintaan ke role Target sebelum menentukan mana metadata dan mana fitur.",
              }
            : {
                message:
                  featureColumnIdsMarkedMetadata.length > 0
                    ? locale === "en"
                      ? `${formatColumnList(featureColumnIdsMarkedMetadata, locale)} ${getColumnListVerb(featureColumnIdsMarkedMetadata, locale)} as metadata, but metadata is for columns that identify or organize rows.`
                      : `${formatColumnList(featureColumnIdsMarkedMetadata, locale)} ${getColumnListVerb(featureColumnIdsMarkedMetadata, locale)} sebagai metadata, padahal metadata dipakai untuk kolom yang mengidentifikasi atau mengatur baris.`
                    : assignments.shift_id === "metadata" && featureColumnIdsMarkedSafe.length > 0
                      ? locale === "en"
                        ? "The shift ID and several input columns are separated, but the target has not been selected yet."
                        : "ID shift dan beberapa kolom input sudah dipisahkan, tetapi target belum dipilih."
                      : assignments.shift_id === "metadata"
                        ? locale === "en"
                          ? "The shift ID is already separated as metadata, but the target has not been selected yet."
                          : "ID shift sudah dipisahkan sebagai metadata, tetapi target belum dipilih."
                        : featureColumnIdsMarkedSafe.length > 0
                          ? locale === "en"
                            ? `${formatColumnList(featureColumnIdsMarkedSafe, locale)} ${getColumnListVerb(featureColumnIdsMarkedSafe, locale)} as input features, but supervised regression still needs one target.`
                            : `${formatColumnList(featureColumnIdsMarkedSafe, locale)} ${getColumnListVerb(featureColumnIdsMarkedSafe, locale)} sebagai fitur input, tetapi supervised regression tetap membutuhkan satu target.`
                          : locale === "en"
                            ? "No target has been selected yet. A supervised regression setup needs one value the model will predict."
                            : "Belum ada target yang dipilih. Setup supervised regression membutuhkan satu nilai yang akan diprediksi model.",
                nextStep:
                  featureColumnIdsMarkedMetadata.length > 0
                    ? locale === "en"
                      ? "Choose the prediction output as Target, then use metadata only for row reference columns."
                      : "Pilih output prediksi sebagai Target, lalu gunakan metadata hanya untuk kolom referensi baris."
                    : locale === "en"
                      ? "Use the hint to find the output column, then mark exactly one column as Target."
                      : "Gunakan petunjuk untuk menemukan kolom output, lalu tandai tepat satu kolom sebagai Target.",
              };

      return {
        extraColumnIds,
        missedColumnIds,
        score: 20,
        status: "incorrect",
        title: title.incorrect,
        ...targetFeedback,
      };
    }

    if (targetColumnIds.includes("shift_id")) {
      return {
        extraColumnIds,
        missedColumnIds,
        message:
          locale === "en"
            ? "Shift ID is marked as the target. An ID only names the row; it is not the demand we want to predict."
            : "ID shift ditandai sebagai target. ID hanya menamai baris, bukan permintaan yang ingin diprediksi.",
        nextStep:
          locale === "en"
            ? "Find the column that represents the prediction outcome, and do not use the ID as the target."
            : "Cari kolom yang mewakili hasil prediksi, dan jangan gunakan ID sebagai target.",
        score: 20,
        status: "incorrect",
        title: title.incorrect,
      };
    }

    if (targetColumnIds.includes("end_shift_revenue")) {
      return {
        extraColumnIds,
        missedColumnIds,
        message:
          locale === "en"
            ? "End Shift Revenue is only known after the shift ends. This column is not the demand output we want to predict before the shift starts."
            : "Pendapatan akhir shift baru diketahui setelah shift selesai. Kolom ini bukan output permintaan yang ingin diprediksi sebelum shift dimulai.",
        nextStep:
          locale === "en"
            ? "Choose the demand count as Target and keep after-shift information out of the model inputs."
            : "Pilih jumlah permintaan sebagai Target dan keluarkan informasi setelah shift dari input model.",
        score: 20,
        status: "incorrect",
        title: title.incorrect,
      };
    }

    return {
      extraColumnIds,
      missedColumnIds,
      message:
        targetRole === "safe-feature"
          ? locale === "en"
            ? `${formatColumnList(targetColumnIds, locale)} ${getColumnListVerb(targetColumnIds, locale)} as target, while the demand outcome is still being treated like an input feature.`
            : `${formatColumnList(targetColumnIds, locale)} ${getColumnListVerb(targetColumnIds, locale)} sebagai target, sementara hasil permintaan masih diperlakukan seperti fitur input.`
          : targetRole === "metadata"
            ? locale === "en"
              ? `${formatColumnList(targetColumnIds, locale)} ${getColumnListVerb(targetColumnIds, locale)} as target, while the demand outcome is still being treated like metadata.`
              : `${formatColumnList(targetColumnIds, locale)} ${getColumnListVerb(targetColumnIds, locale)} sebagai target, sementara hasil permintaan masih diperlakukan seperti metadata.`
            : locale === "en"
              ? `${formatColumnList(targetColumnIds, locale)} ${getColumnListVerb(targetColumnIds, locale)} as target, but that column explains shift context, not the demand we want to predict.`
              : `${formatColumnList(targetColumnIds, locale)} ${getColumnListVerb(targetColumnIds, locale)} sebagai target, tetapi kolom itu menjelaskan konteks shift, bukan permintaan yang ingin diprediksi.`,
      nextStep:
        locale === "en"
          ? "Use shift context as feature candidates and choose the demand outcome as the target."
          : "Gunakan konteks shift sebagai kandidat fitur dan pilih hasil permintaan sebagai target.",
      score: 20,
      status: "incorrect",
      title: title.incorrect,
    };
  }

  if (missedColumnIds.length === 0 && extraColumnIds.length === 0) {
    return {
      extraColumnIds,
      missedColumnIds,
      message:
        locale === "en"
          ? "Drinks Sold is the demand value we want to predict. Day part, weather, temperature, and promotion can help the model make a prediction."
          : "Minuman Terjual adalah nilai permintaan yang ingin diprediksi. Waktu shift, cuaca, suhu, dan promo bisa membantu model membuat prediksi.",
      nextStep:
        locale === "en"
          ? "This lesson is complete. Continue to the next lesson."
          : "Lesson ini selesai. Lanjutkan ke lesson berikutnya.",
      score: 100,
      status: "correct",
      title: title.correct,
    };
  }

  if (targetColumnIds.length > 1) {
    return {
      extraColumnIds,
      missedColumnIds,
      message:
        locale === "en"
          ? "The main target has been selected, but more than one column is marked as Target."
          : "Target utama sudah dipilih, tetapi ada lebih dari satu kolom yang ditandai sebagai Target.",
      nextStep:
        locale === "en"
          ? "Keep only one target column. Shift context should become features, while ID stays as metadata."
          : "Sisakan satu kolom target saja. Konteks shift sebaiknya menjadi fitur, sedangkan ID tetap menjadi metadata.",
      score: 55,
      status: "partial",
      title: title.partial,
    };
  }

  if (assignments.shift_id === "safe-feature") {
    return {
      extraColumnIds,
      missedColumnIds,
      message:
        locale === "en"
          ? "The target has been selected, but Shift ID is still used as a feature."
          : "Target sudah dipilih, tetapi ID shift masih digunakan sebagai fitur.",
      nextStep:
        locale === "en"
          ? "ID helps reference rows. Use shift context as features and keep the ID column as metadata."
          : "ID membantu mereferensikan baris. Gunakan konteks shift sebagai fitur dan simpan kolom ID sebagai metadata.",
      score: 50,
      status: "partial",
      title: title.partial,
    };
  }

  if (assignments.shift_id !== "metadata") {
    return {
      extraColumnIds,
      missedColumnIds,
      message:
        locale === "en"
          ? "The target has been selected, but Shift ID still needs the metadata role."
          : "Target sudah dipilih, tetapi ID shift masih perlu diberi role metadata.",
      nextStep:
        locale === "en"
          ? "Metadata explains how to read or reference rows; metadata is not used as a model input."
          : "Metadata menjelaskan cara membaca atau mereferensikan baris; metadata tidak dipakai sebagai input model.",
      score: 65,
      status: "partial",
      title: title.partial,
    };
  }

  if (assignments.end_shift_revenue === "safe-feature") {
    return {
      extraColumnIds,
      missedColumnIds,
      message:
        locale === "en"
          ? "The target and metadata are correct, but end shift revenue is information from after the shift ends. If used as a feature, this column leaks the answer."
          : "Target dan metadata sudah benar, tetapi pendapatan akhir shift adalah informasi setelah shift selesai. Jika dipakai sebagai fitur, kolom ini membocorkan jawaban.",
      nextStep:
        locale === "en"
          ? "Mark after-shift information as not used yet, then use only pre-shift details as features."
          : "Tandai informasi setelah shift sebagai belum dipakai, lalu gunakan hanya detail sebelum shift sebagai fitur.",
      score: 55,
      status: "partial",
      title: title.partial,
    };
  }

  const missingFeatureColumnIds = Object.entries(expectedRoles).flatMap(([columnId, role]) => {
    if (role !== "safe-feature" || assignments[columnId] === "safe-feature") {
      return [];
    }

    return [columnId];
  });

  if (missingFeatureColumnIds.length > 0) {
    const countLabel =
      locale === "en"
        ? missingFeatureColumnIds.length === 1
          ? "one shift detail is not yet marked as a feature"
          : "some shift details are not yet marked as features"
        : missingFeatureColumnIds.length === 1
          ? "satu detail shift belum"
          : "beberapa detail shift belum";

    return {
      extraColumnIds,
      missedColumnIds,
      message:
        locale === "en"
          ? `The target and metadata are correct, but ${countLabel}.`
          : `Target dan metadata sudah benar, tetapi ${countLabel} ditandai sebagai fitur.`,
      nextStep:
        locale === "en"
          ? "Features are information already known before prediction and can help explain the target."
          : "Fitur adalah informasi yang sudah diketahui sebelum prediksi dan bisa membantu menjelaskan target.",
      score: 70,
      status: "partial",
      title: title.partial,
    };
  }

  return {
    extraColumnIds,
    missedColumnIds,
    message:
      locale === "en"
        ? "The target has been selected, but some column roles still need adjustment."
        : "Target sudah dipilih, tetapi beberapa role kolom masih perlu disesuaikan.",
    nextStep:
      locale === "en"
        ? "Use the hint to separate the prediction output, usable inputs, and dataset metadata."
        : "Gunakan petunjuk untuk memisahkan output prediksi, input yang bisa dipakai, dan metadata dataset.",
    score: 70,
    status: "partial",
    title: title.partial,
  };
}
