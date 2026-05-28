import { describe, expect, it } from "vitest";

import { evaluateFeatureTargetRoles } from "./evaluate-feature-target";
import type { ColumnRole } from "../types";

const correctAssignments: Record<string, ColumnRole> = {
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

describe("evaluateFeatureTargetRoles", () => {
  it("explains when no target is selected without revealing the answer key", () => {
    const result = evaluateFeatureTargetRoles({
      courier_experience_yrs: "ignore",
      delivery_time_min: "ignore",
      distance_km: "ignore",
      order_id: "ignore",
      preparation_time_min: "ignore",
      time_of_day: "ignore",
      traffic_level: "ignore",
      vehicle_type: "ignore",
      weather: "ignore",
    });

    expect(result.status).toBe("incorrect");
    expect(result.message).toContain("Belum ada target yang dipilih");
    expect(result.message).not.toContain("delivery_time_min");
    expect(result.nextStep).not.toContain("delivery_time_min");
    expect(result.suggestedHints?.[0]).toBe(
      "Mulai dari menemukan kolom hasil sebelum mengatur kolom pendukung.",
    );
  });

  it("responds to role work that is already wrong before a target is selected", () => {
    const result = evaluateFeatureTargetRoles({
      courier_experience_yrs: "ignore",
      delivery_time_min: "ignore",
      distance_km: "metadata",
      order_id: "ignore",
      preparation_time_min: "ignore",
      time_of_day: "ignore",
      traffic_level: "ignore",
      vehicle_type: "ignore",
      weather: "ignore",
    });

    expect(result.status).toBe("incorrect");
    expect(result.message).toContain("Jarak ditandai sebagai metadata");
    expect(result.message).not.toContain("delivery_time_min");
    expect(result.nextStep).toContain("metadata hanya untuk kolom referensi baris");
    expect(result.suggestedHints?.[0]).toBe(
      "Metadata dipakai untuk kolom referensi baris; konteks pengiriman biasanya masuk fitur.",
    );
  });

  it("gives a different explanation when a descriptive column is selected as target", () => {
    const result = evaluateFeatureTargetRoles({
      ...correctAssignments,
      weather: "target",
      delivery_time_min: "ignore",
    });

    expect(result.status).toBe("incorrect");
    expect(result.message).toContain("Cuaca ditandai sebagai target");
    expect(result.message).not.toContain("delivery_time_min");
  });

  it("supports English feedback", () => {
    const result = evaluateFeatureTargetRoles(
      {
        ...correctAssignments,
        distance_km: "target",
        delivery_time_min: "metadata",
      },
      "en",
    );

    expect(result.status).toBe("incorrect");
    expect(result.message).toContain("Distance is marked as target");
    expect(result.message).toContain("delivery-time outcome is still being treated like metadata");
    expect(result.nextStep).toContain("Use delivery context as feature candidates");
  });

  it("flags identifier-as-feature separately from missing feature work", () => {
    const result = evaluateFeatureTargetRoles({
      ...correctAssignments,
      order_id: "safe-feature",
    });

    expect(result.status).toBe("partial");
    expect(result.message).toContain("Order ID masih digunakan sebagai fitur");
    expect(result.nextStep).toContain("simpan kolom ID sebagai metadata");
    expect(result.suggestedHints?.[0]).toBe(
      "Tanyakan apakah nilainya membantu menjelaskan waktu pengiriman atau hanya menamai baris.",
    );
  });

  it("flags the target as an input when no target has been selected", () => {
    const result = evaluateFeatureTargetRoles({
      ...correctAssignments,
      delivery_time_min: "safe-feature",
    });

    expect(result.status).toBe("incorrect");
    expect(result.message).toContain("Waktu pengiriman sedang diperlakukan seperti fitur input");
    expect(result.nextStep).toContain("Pilih tepat satu kolom output sebagai Target");
    expect(result.suggestedHints?.[0]).toBe(
      "Target adalah nilai yang akan diprediksi model, jadi tidak dipakai sebagai fitur input.",
    );
  });

  it("recognizes when delivery details are still missing as safe features", () => {
    const result = evaluateFeatureTargetRoles({
      ...correctAssignments,
      traffic_level: "ignore",
      weather: "ignore",
    });

    expect(result.status).toBe("partial");
    expect(result.message).toContain("detail pengiriman");
    expect(result.nextStep).toContain("sudah diketahui sebelum prediksi");
  });
});
