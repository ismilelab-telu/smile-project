import { describe, expect, it } from "vitest";

import { evaluateFeatureTargetRoles } from "./evaluate-feature-target";
import type { ColumnRole } from "../types";

const correctAssignments: Record<string, ColumnRole> = {
  bedrooms: "safe-feature",
  building_area_m2: "safe-feature",
  district: "safe-feature",
  listing_id: "metadata",
  price_million_idr: "target",
  property_type: "safe-feature",
};

describe("evaluateFeatureTargetRoles", () => {
  it("explains when no target is selected without revealing the answer key", () => {
    const result = evaluateFeatureTargetRoles({
      bedrooms: "ignore",
      building_area_m2: "ignore",
      district: "ignore",
      listing_id: "ignore",
      price_million_idr: "ignore",
      property_type: "ignore",
    });

    expect(result.status).toBe("incorrect");
    expect(result.message).toContain("No target is selected yet");
    expect(result.message).not.toContain("price_million_idr");
    expect(result.nextStep).not.toContain("price_million_idr");
  });

  it("gives a different explanation when a descriptive column is selected as target", () => {
    const result = evaluateFeatureTargetRoles({
      ...correctAssignments,
      district: "target",
      price_million_idr: "ignore",
    });

    expect(result.status).toBe("incorrect");
    expect(result.message).toContain("District is marked as the target");
    expect(result.message).not.toContain("price_million_idr");
  });

  it("flags identifier-as-feature separately from missing feature work", () => {
    const result = evaluateFeatureTargetRoles({
      ...correctAssignments,
      listing_id: "safe-feature",
    });

    expect(result.status).toBe("partial");
    expect(result.message).toContain("row identifier is being used as a feature");
    expect(result.nextStep).toContain("keep identifier fields as metadata");
  });

  it("recognizes when property attributes are still missing as safe features", () => {
    const result = evaluateFeatureTargetRoles({
      ...correctAssignments,
      bedrooms: "ignore",
      district: "ignore",
    });

    expect(result.status).toBe("partial");
    expect(result.message).toContain("property attributes");
    expect(result.nextStep).toContain("known before prediction");
  });
});
