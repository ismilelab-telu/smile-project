import { describe, expect, it } from "vitest";

import { evaluateFeatureTargetRoles } from "./evaluate-feature-target";
import type { ColumnRole } from "../types";

const correctAssignments: Record<string, ColumnRole> = {
  day_part: "safe-feature",
  drinks_sold: "target",
  end_shift_revenue: "ignore",
  promo_active: "safe-feature",
  shift_id: "metadata",
  temperature_c: "safe-feature",
  weather: "safe-feature",
};

describe("evaluateFeatureTargetRoles", () => {
  it("explains when no target is selected without revealing the answer key", () => {
    const result = evaluateFeatureTargetRoles({
      day_part: "ignore",
      drinks_sold: "ignore",
      promo_active: "ignore",
      shift_id: "ignore",
      temperature_c: "ignore",
      weather: "ignore",
    });

    expect(result.status).toBe("incorrect");
    expect(result.message).toContain("Belum ada target yang dipilih");
    expect(result.message).not.toContain("drinks_sold");
    expect(result.nextStep).not.toContain("drinks_sold");
  });

  it("responds to role work that is already wrong before a target is selected", () => {
    const result = evaluateFeatureTargetRoles({
      day_part: "metadata",
      drinks_sold: "ignore",
      promo_active: "ignore",
      shift_id: "ignore",
      temperature_c: "ignore",
      weather: "ignore",
    });

    expect(result.status).toBe("incorrect");
    expect(result.message).toContain("Waktu Shift ditandai sebagai metadata");
    expect(result.message).not.toContain("drinks_sold");
    expect(result.nextStep).toContain("metadata hanya untuk kolom referensi baris");
  });

  it("gives a different explanation when a descriptive column is selected as target", () => {
    const result = evaluateFeatureTargetRoles({
      ...correctAssignments,
      weather: "target",
      drinks_sold: "ignore",
    });

    expect(result.status).toBe("incorrect");
    expect(result.message).toContain("Cuaca ditandai sebagai target");
    expect(result.message).not.toContain("drinks_sold");
  });

  it("supports English feedback", () => {
    const result = evaluateFeatureTargetRoles(
      {
        ...correctAssignments,
        day_part: "target",
        drinks_sold: "metadata",
      },
      "en",
    );

    expect(result.status).toBe("incorrect");
    expect(result.message).toContain("Day Part is marked as target");
    expect(result.message).toContain("demand outcome is still being treated like metadata");
    expect(result.nextStep).toContain("Use shift context as feature candidates");
  });

  it("flags identifier-as-feature separately from missing feature work", () => {
    const result = evaluateFeatureTargetRoles({
      ...correctAssignments,
      shift_id: "safe-feature",
    });

    expect(result.status).toBe("partial");
    expect(result.message).toContain("ID shift masih digunakan sebagai fitur");
    expect(result.nextStep).toContain("simpan kolom ID sebagai metadata");
  });

  it("flags after-shift revenue as leakage when selected as a feature", () => {
    const result = evaluateFeatureTargetRoles({
      ...correctAssignments,
      end_shift_revenue: "safe-feature",
    });

    expect(result.status).toBe("partial");
    expect(result.message).toContain("pendapatan akhir shift adalah informasi setelah shift");
    expect(result.nextStep).toContain("informasi setelah shift");
  });

  it("recognizes when shift details are still missing as safe features", () => {
    const result = evaluateFeatureTargetRoles({
      ...correctAssignments,
      weather: "ignore",
      promo_active: "ignore",
    });

    expect(result.status).toBe("partial");
    expect(result.message).toContain("detail shift");
    expect(result.nextStep).toContain("sudah diketahui sebelum prediksi");
  });
});
