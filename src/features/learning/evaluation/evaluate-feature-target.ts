import type { ColumnRole, EvaluationResult } from "../types";

const expectedRoles: Record<string, ColumnRole> = {
  bedrooms: "safe-feature",
  building_area_m2: "safe-feature",
  district: "safe-feature",
  listing_id: "metadata",
  price_million_idr: "target",
  property_type: "safe-feature",
};

const roleLabels: Record<ColumnRole, string> = {
  ignore: "ignore",
  metadata: "metadata",
  "safe-feature": "safe feature",
  target: "target",
};

export function getExpectedColumnRoles() {
  return expectedRoles;
}

export function evaluateFeatureTargetRoles(
  assignments: Record<string, ColumnRole>,
): EvaluationResult {
  const missedColumnIds: string[] = [];
  const extraColumnIds: string[] = [];
  const targetRole = assignments.price_million_idr;

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
    return {
      extraColumnIds,
      missedColumnIds,
      message:
        "Target adalah nilai yang ingin kita tebak, bukan informasi yang kita pakai untuk menebak.",
      nextStep: "Cari kolom yang berisi harga properti dan beri role target.",
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
        "price_million_idr adalah nilai yang ingin diprediksi. District, tipe properti, luas bangunan, dan jumlah kamar bisa membantu prediksi.",
      nextStep: "Lesson ini selesai. Lanjutkan dari Learning Home saat lesson berikutnya tersedia.",
      score: 100,
      status: "correct",
      title: "Benar",
    };
  }

  const selectedMetadataAsFeature = assignments.listing_id === "safe-feature";
  const score = selectedMetadataAsFeature ? 50 : 70;

  return {
    extraColumnIds,
    missedColumnIds,
    message: "Target sudah mengarah ke harga, tetapi masih ada role kolom yang perlu diperbaiki.",
    nextStep: "Pastikan feature menjelaskan properti, sedangkan Listing ID hanya menjadi metadata.",
    score,
    status: "partial",
    title: "Sebagian benar",
  };
}

export function describeExpectedRole(columnId: string) {
  return roleLabels[expectedRoles[columnId] ?? "ignore"];
}
