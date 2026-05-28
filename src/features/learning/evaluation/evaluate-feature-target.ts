import type { ColumnRole, EvaluationResult } from "../types";
import type { Locale } from "@/features/localization/localization";

const expectedRoles: Record<string, ColumnRole> = {
  courier_experience_yrs: "safe-feature",
  delivery_time_min: "target",
  distance_km: "safe-feature",
  order_id: "metadata",
  preparation_time_min: "safe-feature",
  time_of_day: "safe-feature",
  traffic_level: "safe-feature",
  vehicle_type: "safe-feature",
  weather: "safe-feature",
};

const columnLabelsByLocale: Record<Locale, Record<string, string>> = {
  en: {
    courier_experience_yrs: "Courier Experience",
    delivery_time_min: "Delivery Time",
    distance_km: "Distance",
    order_id: "Order ID",
    preparation_time_min: "Preparation Time",
    time_of_day: "Time of Day",
    traffic_level: "Traffic Level",
    vehicle_type: "Vehicle Type",
    weather: "Weather",
  },
  id: {
    courier_experience_yrs: "Pengalaman Kurir",
    delivery_time_min: "Waktu Pengiriman",
    distance_km: "Jarak",
    order_id: "Order ID",
    preparation_time_min: "Waktu Persiapan",
    time_of_day: "Waktu Hari",
    traffic_level: "Level Trafik",
    vehicle_type: "Jenis Kendaraan",
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

function createSuggestedHints(contextualHints: string[]) {
  return contextualHints.filter(
    (hint, index, hints) => hint.trim() !== "" && hints.indexOf(hint) === index,
  );
}

export function evaluateFeatureTargetRoles(
  assignments: Record<string, ColumnRole>,
  locale: Locale = "id",
): EvaluationResult {
  const missedColumnIds: string[] = [];
  const extraColumnIds: string[] = [];
  const title = resultTitleCopy[locale];
  const targetRole = assignments.delivery_time_min;
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
                  ? "The delivery-time outcome is being treated like an input feature. A target is the value the model is trying to predict."
                  : "Waktu pengiriman sedang diperlakukan seperti fitur input. Target adalah nilai yang ingin diprediksi model.",
              nextStep:
                locale === "en"
                  ? "Choose exactly one output column as Target, then check which delivery details can safely be used as inputs."
                  : "Pilih tepat satu kolom output sebagai Target, lalu cek detail pengiriman mana yang boleh dipakai sebagai input.",
              suggestedHints: createSuggestedHints([
                locale === "en"
                  ? "A target is the value the model should predict, so it should not be used as an input feature."
                  : "Target adalah nilai yang akan diprediksi model, jadi tidak dipakai sebagai fitur input.",
                locale === "en"
                  ? "Look for the column that contains the final delivery-duration outcome."
                  : "Cari kolom yang berisi hasil akhir durasi pengiriman.",
              ]),
            }
          : targetRole === "metadata"
            ? {
                message:
                  locale === "en"
                    ? "The delivery-time outcome is being treated like metadata. Metadata helps read the order table, but it is not the model output."
                    : "Waktu pengiriman sedang diperlakukan seperti metadata. Metadata membantu membaca tabel order, tetapi bukan output model.",
                nextStep:
                  locale === "en"
                    ? "Move the delivery-time outcome to the Target role before deciding which columns are metadata and features."
                    : "Pindahkan waktu pengiriman ke role Target sebelum menentukan mana metadata dan mana fitur.",
                suggestedHints: createSuggestedHints([
                  locale === "en"
                    ? "Metadata helps identify or read a row; it is not the value being predicted."
                    : "Metadata membantu mengenali atau membaca baris; metadata bukan nilai yang diprediksi.",
                  locale === "en"
                    ? "The prediction output should be marked Target before input columns are finalized."
                    : "Output prediksi perlu ditandai sebagai Target sebelum kolom input dirapikan.",
                ]),
              }
            : {
                message:
                  featureColumnIdsMarkedMetadata.length > 0
                    ? locale === "en"
                      ? `${formatColumnList(featureColumnIdsMarkedMetadata, locale)} ${getColumnListVerb(featureColumnIdsMarkedMetadata, locale)} as metadata, but metadata is for columns that identify or organize rows.`
                      : `${formatColumnList(featureColumnIdsMarkedMetadata, locale)} ${getColumnListVerb(featureColumnIdsMarkedMetadata, locale)} sebagai metadata, padahal metadata dipakai untuk kolom yang mengidentifikasi atau mengatur baris.`
                    : assignments.order_id === "metadata" && featureColumnIdsMarkedSafe.length > 0
                      ? locale === "en"
                        ? "The order ID and several input columns are separated, but the target has not been selected yet."
                        : "Order ID dan beberapa kolom input sudah dipisahkan, tetapi target belum dipilih."
                      : assignments.order_id === "metadata"
                        ? locale === "en"
                          ? "The order ID is already separated as metadata, but the target has not been selected yet."
                          : "Order ID sudah dipisahkan sebagai metadata, tetapi target belum dipilih."
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
                suggestedHints: createSuggestedHints([
                  featureColumnIdsMarkedMetadata.length > 0
                    ? locale === "en"
                      ? "Metadata is for row reference columns; delivery context usually belongs in features."
                      : "Metadata dipakai untuk kolom referensi baris; konteks pengiriman biasanya masuk fitur."
                    : featureColumnIdsMarkedSafe.length > 0
                      ? locale === "en"
                        ? "Several input features are already separated, but supervised learning still needs one output."
                        : "Beberapa fitur input sudah dipisahkan, tetapi supervised learning tetap membutuhkan satu output."
                      : locale === "en"
                        ? "Start by finding the outcome column before assigning the supporting columns."
                        : "Mulai dari menemukan kolom hasil sebelum mengatur kolom pendukung.",
                  locale === "en"
                    ? "The target answers what the model is trying to predict."
                    : "Target menjawab apa yang sedang dicoba diprediksi oleh model.",
                ]),
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

    if (targetColumnIds.includes("order_id")) {
      return {
        extraColumnIds,
        missedColumnIds,
        message:
          locale === "en"
            ? "Order ID is marked as the target. An ID only names the row; it is not the delivery duration we want to predict."
            : "Order ID ditandai sebagai target. ID hanya menamai baris, bukan durasi pengiriman yang ingin diprediksi.",
        nextStep:
          locale === "en"
            ? "Find the column that represents the prediction outcome, and do not use the ID as the target."
            : "Cari kolom yang mewakili hasil prediksi, dan jangan gunakan ID sebagai target.",
        score: 20,
        status: "incorrect",
        suggestedHints: createSuggestedHints([
          locale === "en"
            ? "An ID distinguishes rows; it usually should not become the prediction target."
            : "ID membedakan baris; biasanya ID tidak menjadi target prediksi.",
          locale === "en"
            ? "Find the column whose value would be useful to forecast for a new order."
            : "Cari kolom yang nilainya berguna untuk diperkirakan pada order baru.",
        ]),
        title: title.incorrect,
      };
    }

    return {
      extraColumnIds,
      missedColumnIds,
      message:
        targetRole === "safe-feature"
          ? locale === "en"
            ? `${formatColumnList(targetColumnIds, locale)} ${getColumnListVerb(targetColumnIds, locale)} as target, while the delivery-time outcome is still being treated like an input feature.`
            : `${formatColumnList(targetColumnIds, locale)} ${getColumnListVerb(targetColumnIds, locale)} sebagai target, sementara waktu pengiriman masih diperlakukan seperti fitur input.`
          : targetRole === "metadata"
            ? locale === "en"
              ? `${formatColumnList(targetColumnIds, locale)} ${getColumnListVerb(targetColumnIds, locale)} as target, while the delivery-time outcome is still being treated like metadata.`
              : `${formatColumnList(targetColumnIds, locale)} ${getColumnListVerb(targetColumnIds, locale)} sebagai target, sementara waktu pengiriman masih diperlakukan seperti metadata.`
            : locale === "en"
              ? `${formatColumnList(targetColumnIds, locale)} ${getColumnListVerb(targetColumnIds, locale)} as target, but that column explains delivery context, not the duration we want to predict.`
              : `${formatColumnList(targetColumnIds, locale)} ${getColumnListVerb(targetColumnIds, locale)} sebagai target, tetapi kolom itu menjelaskan konteks pengiriman, bukan durasi yang ingin diprediksi.`,
      nextStep:
        locale === "en"
          ? "Use delivery context as feature candidates and choose the delivery-time outcome as the target."
          : "Gunakan konteks pengiriman sebagai kandidat fitur dan pilih waktu pengiriman sebagai target.",
      score: 20,
      status: "incorrect",
      suggestedHints: createSuggestedHints([
        locale === "en"
          ? "The selected target should be the final outcome, not a delivery-context detail."
          : "Target yang dipilih seharusnya hasil akhir, bukan detail konteks pengiriman.",
        targetRole === "safe-feature"
          ? locale === "en"
            ? "Move the delivery-time outcome out of features and into Target."
            : "Pindahkan hasil waktu pengiriman dari fitur ke Target."
          : locale === "en"
            ? "Move the delivery-time outcome out of metadata and into Target."
            : "Pindahkan hasil waktu pengiriman dari metadata ke Target.",
      ]),
      title: title.incorrect,
    };
  }

  if (missedColumnIds.length === 0 && extraColumnIds.length === 0) {
    return {
      extraColumnIds,
      missedColumnIds,
      message:
        locale === "en"
          ? "Delivery Time is the numeric outcome we want to predict. Distance, weather, traffic, time of day, vehicle type, preparation time, and courier experience can help the model make a prediction."
          : "Waktu Pengiriman adalah output numerik yang ingin diprediksi. Jarak, cuaca, trafik, waktu hari, jenis kendaraan, waktu persiapan, dan pengalaman kurir bisa membantu model membuat prediksi.",
      nextStep:
        locale === "en"
          ? "This lesson is complete. Continue to the next lesson."
          : "Lesson ini selesai. Lanjutkan ke lesson berikutnya.",
      score: 100,
      status: "correct",
      suggestedHints: [],
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
          ? "Keep only one target column. Delivery context should become features, while ID stays as metadata."
          : "Sisakan satu kolom target saja. Konteks pengiriman sebaiknya menjadi fitur, sedangkan ID tetap menjadi metadata.",
      score: 55,
      status: "partial",
      suggestedHints: createSuggestedHints([
        locale === "en"
          ? "A supervised setup should have exactly one target for this exercise."
          : "Setup supervised di latihan ini perlu tepat satu target.",
        locale === "en"
          ? "Columns that describe the delivery before prediction time should usually be features."
          : "Kolom yang menjelaskan pengiriman sebelum waktu prediksi biasanya menjadi fitur.",
      ]),
      title: title.partial,
    };
  }

  if (assignments.order_id === "safe-feature") {
    return {
      extraColumnIds,
      missedColumnIds,
      message:
        locale === "en"
          ? "The target has been selected, but Order ID is still used as a feature."
          : "Target sudah dipilih, tetapi Order ID masih digunakan sebagai fitur.",
      nextStep:
        locale === "en"
          ? "ID helps reference rows. Use delivery context as features and keep the ID column as metadata."
          : "ID membantu mereferensikan baris. Gunakan konteks pengiriman sebagai fitur dan simpan kolom ID sebagai metadata.",
      score: 50,
      status: "partial",
      suggestedHints: createSuggestedHints([
        locale === "en"
          ? "Ask whether the value helps explain delivery time or only names the row."
          : "Tanyakan apakah nilainya membantu menjelaskan waktu pengiriman atau hanya menamai baris.",
        locale === "en"
          ? "Identifiers are useful for reading the table, not for model input in this beginner setup."
          : "Identifier berguna untuk membaca tabel, bukan sebagai input model di setup awal ini.",
      ]),
      title: title.partial,
    };
  }

  if (assignments.order_id !== "metadata") {
    return {
      extraColumnIds,
      missedColumnIds,
      message:
        locale === "en"
          ? "The target has been selected, but Order ID still needs the metadata role."
          : "Target sudah dipilih, tetapi Order ID masih perlu diberi role metadata.",
      nextStep:
        locale === "en"
          ? "Metadata explains how to read or reference rows; metadata is not used as a model input."
          : "Metadata menjelaskan cara membaca atau mereferensikan baris; metadata tidak dipakai sebagai input model.",
      score: 65,
      status: "partial",
      suggestedHints: createSuggestedHints([
        locale === "en"
          ? "Look for the row identifier column and keep it separate from model inputs."
          : "Cari kolom penanda baris dan pisahkan dari input model.",
        locale === "en"
          ? "Metadata is useful context for humans, but it is not a safe feature here."
          : "Metadata berguna sebagai konteks untuk manusia, tetapi bukan fitur aman di sini.",
      ]),
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
          ? "one delivery detail is not yet marked as a feature"
          : "some delivery details are not yet marked as features"
        : missingFeatureColumnIds.length === 1
          ? "satu detail pengiriman belum"
          : "beberapa detail pengiriman belum";

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
      suggestedHints: createSuggestedHints([
        locale === "en"
          ? "Recheck delivery details that would be known before the order is completed."
          : "Cek ulang detail pengiriman yang sudah diketahui sebelum order selesai.",
        locale === "en"
          ? "Safe features can include route, conditions, timing, vehicle, preparation, or courier context."
          : "Fitur aman bisa berupa rute, kondisi, waktu, kendaraan, persiapan, atau konteks kurir.",
      ]),
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
    suggestedHints: createSuggestedHints([
      locale === "en"
        ? "Separate the columns into three jobs: predict, explain before prediction, and identify rows."
        : "Pisahkan kolom menjadi tiga fungsi: diprediksi, menjelaskan sebelum prediksi, dan mengidentifikasi baris.",
      locale === "en"
        ? "If a column is only known after delivery finishes, it should not be a feature."
        : "Jika kolom baru diketahui setelah pengiriman selesai, kolom itu tidak boleh menjadi fitur.",
    ]),
    title: title.partial,
  };
}
