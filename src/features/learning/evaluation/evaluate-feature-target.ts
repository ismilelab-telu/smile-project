import type { ColumnRole, EvaluationResult } from "../types";

const expectedRoles: Record<string, ColumnRole> = {
  day_part: "safe-feature",
  drinks_sold: "target",
  end_shift_revenue: "ignore",
  promo_active: "safe-feature",
  shift_id: "metadata",
  temperature_c: "safe-feature",
  weather: "safe-feature",
};

const columnLabels: Record<string, string> = {
  day_part: "Waktu Shift",
  drinks_sold: "Minuman Terjual",
  end_shift_revenue: "Pendapatan Akhir Shift",
  promo_active: "Promo Aktif",
  shift_id: "ID Shift",
  temperature_c: "Suhu",
  weather: "Cuaca",
};

export function getExpectedColumnRoles() {
  return expectedRoles;
}

function getAssignedColumnIds(assignments: Record<string, ColumnRole>, role: ColumnRole) {
  return Object.keys(expectedRoles).filter((columnId) => assignments[columnId] === role);
}

function formatColumnList(columnIds: string[]) {
  const labels = columnIds.map((columnId) => columnLabels[columnId] ?? columnId);

  if (labels.length <= 1) {
    return labels[0] ?? "Kolom itu";
  }

  return `${labels.slice(0, -1).join(", ")} dan ${labels.at(-1)}`;
}

function getExpectedRoleColumnIds(role: ColumnRole) {
  return Object.entries(expectedRoles).flatMap(([columnId, expectedRole]) =>
    expectedRole === role ? [columnId] : [],
  );
}

function getColumnListVerb(columnIds: string[]) {
  return columnIds.length === 1 ? "ditandai" : "ditandai";
}

export function evaluateFeatureTargetRoles(
  assignments: Record<string, ColumnRole>,
): EvaluationResult {
  const missedColumnIds: string[] = [];
  const extraColumnIds: string[] = [];
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
                "Hasil permintaan sedang diperlakukan seperti fitur input. Target adalah nilai yang ingin diprediksi model.",
              nextStep:
                "Pilih tepat satu kolom output sebagai Target, lalu cek detail shift mana yang boleh dipakai sebagai input.",
            }
          : targetRole === "metadata"
            ? {
                message:
                  "Hasil permintaan sedang diperlakukan seperti metadata. Metadata membantu membaca tabel shift, tetapi bukan output model.",
                nextStep:
                  "Pindahkan hasil permintaan ke role Target sebelum menentukan mana metadata dan mana fitur.",
              }
            : {
                message:
                  featureColumnIdsMarkedMetadata.length > 0
                    ? `${formatColumnList(featureColumnIdsMarkedMetadata)} ${getColumnListVerb(featureColumnIdsMarkedMetadata)} sebagai metadata, padahal metadata dipakai untuk kolom yang mengidentifikasi atau mengatur baris.`
                    : assignments.shift_id === "metadata" && featureColumnIdsMarkedSafe.length > 0
                      ? "ID shift dan beberapa kolom input sudah dipisahkan, tetapi target belum dipilih."
                      : assignments.shift_id === "metadata"
                        ? "ID shift sudah dipisahkan sebagai metadata, tetapi target belum dipilih."
                        : featureColumnIdsMarkedSafe.length > 0
                          ? `${formatColumnList(featureColumnIdsMarkedSafe)} ${getColumnListVerb(featureColumnIdsMarkedSafe)} sebagai fitur input, tetapi supervised regression tetap membutuhkan satu target.`
                          : "Belum ada target yang dipilih. Setup supervised regression membutuhkan satu nilai yang akan diprediksi model.",
                nextStep:
                  featureColumnIdsMarkedMetadata.length > 0
                    ? "Pilih output prediksi sebagai Target, lalu gunakan metadata hanya untuk kolom referensi baris."
                    : "Gunakan petunjuk untuk menemukan kolom output, lalu tandai tepat satu kolom sebagai Target.",
              };

      return {
        extraColumnIds,
        missedColumnIds,
        score: 20,
        status: "incorrect",
        title: "Belum tepat",
        ...targetFeedback,
      };
    }

    if (targetColumnIds.includes("shift_id")) {
      return {
        extraColumnIds,
        missedColumnIds,
        message:
          "ID shift ditandai sebagai target. ID hanya menamai baris, bukan permintaan yang ingin diprediksi.",
        nextStep: "Cari kolom yang mewakili hasil prediksi, dan jangan gunakan ID sebagai target.",
        score: 20,
        status: "incorrect",
        title: "Belum tepat",
      };
    }

    if (targetColumnIds.includes("end_shift_revenue")) {
      return {
        extraColumnIds,
        missedColumnIds,
        message:
          "Pendapatan akhir shift baru diketahui setelah shift selesai. Kolom ini bukan output permintaan yang ingin diprediksi sebelum shift dimulai.",
        nextStep:
          "Pilih jumlah permintaan sebagai Target dan keluarkan informasi setelah shift dari input model.",
        score: 20,
        status: "incorrect",
        title: "Belum tepat",
      };
    }

    return {
      extraColumnIds,
      missedColumnIds,
      message:
        targetRole === "safe-feature"
          ? `${formatColumnList(targetColumnIds)} ${getColumnListVerb(targetColumnIds)} sebagai target, sementara hasil permintaan masih diperlakukan seperti fitur input.`
          : targetRole === "metadata"
            ? `${formatColumnList(targetColumnIds)} ${getColumnListVerb(targetColumnIds)} sebagai target, sementara hasil permintaan masih diperlakukan seperti metadata.`
            : `${formatColumnList(targetColumnIds)} ${getColumnListVerb(targetColumnIds)} sebagai target, tetapi kolom itu menjelaskan konteks shift, bukan permintaan yang ingin diprediksi.`,
      nextStep:
        "Gunakan konteks shift sebagai kandidat fitur dan pilih hasil permintaan sebagai target.",
      score: 20,
      status: "incorrect",
      title: "Belum tepat",
    };
  }

  if (missedColumnIds.length === 0 && extraColumnIds.length === 0) {
    return {
      extraColumnIds,
      missedColumnIds,
      message:
        "Minuman Terjual adalah nilai permintaan yang ingin diprediksi. Waktu shift, cuaca, suhu, dan promo bisa membantu model membuat prediksi.",
      nextStep: "Lesson ini selesai. Lanjutkan ke lesson berikutnya.",
      score: 100,
      status: "correct",
      title: "Benar",
    };
  }

  if (targetColumnIds.length > 1) {
    return {
      extraColumnIds,
      missedColumnIds,
      message:
        "Target utama sudah dipilih, tetapi ada lebih dari satu kolom yang ditandai sebagai Target.",
      nextStep:
        "Sisakan satu kolom target saja. Konteks shift sebaiknya menjadi fitur, sedangkan ID tetap menjadi metadata.",
      score: 55,
      status: "partial",
      title: "Sebagian benar",
    };
  }

  if (assignments.shift_id === "safe-feature") {
    return {
      extraColumnIds,
      missedColumnIds,
      message: "Target sudah dipilih, tetapi ID shift masih digunakan sebagai fitur.",
      nextStep:
        "ID membantu mereferensikan baris. Gunakan konteks shift sebagai fitur dan simpan kolom ID sebagai metadata.",
      score: 50,
      status: "partial",
      title: "Sebagian benar",
    };
  }

  if (assignments.shift_id !== "metadata") {
    return {
      extraColumnIds,
      missedColumnIds,
      message: "Target sudah dipilih, tetapi ID shift masih perlu diberi role metadata.",
      nextStep:
        "Metadata menjelaskan cara membaca atau mereferensikan baris; metadata tidak dipakai sebagai input model.",
      score: 65,
      status: "partial",
      title: "Sebagian benar",
    };
  }

  if (assignments.end_shift_revenue === "safe-feature") {
    return {
      extraColumnIds,
      missedColumnIds,
      message:
        "Target dan metadata sudah benar, tetapi pendapatan akhir shift adalah informasi setelah shift selesai. Jika dipakai sebagai fitur, kolom ini membocorkan jawaban.",
      nextStep:
        "Tandai informasi setelah shift sebagai belum dipakai, lalu gunakan hanya detail sebelum shift sebagai fitur.",
      score: 55,
      status: "partial",
      title: "Sebagian benar",
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
      missingFeatureColumnIds.length === 1
        ? "satu detail shift belum"
        : "beberapa detail shift belum";

    return {
      extraColumnIds,
      missedColumnIds,
      message: `Target dan metadata sudah benar, tetapi ${countLabel} ditandai sebagai fitur.`,
      nextStep:
        "Fitur adalah informasi yang sudah diketahui sebelum prediksi dan bisa membantu menjelaskan target.",
      score: 70,
      status: "partial",
      title: "Sebagian benar",
    };
  }

  return {
    extraColumnIds,
    missedColumnIds,
    message: "Target sudah dipilih, tetapi beberapa role kolom masih perlu disesuaikan.",
    nextStep:
      "Gunakan petunjuk untuk memisahkan output prediksi, input yang bisa dipakai, dan metadata dataset.",
    score: 70,
    status: "partial",
    title: "Sebagian benar",
  };
}
