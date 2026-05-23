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
        "The target is the value we want to predict, not the information we use to make the prediction.",
      nextStep: "Find the column that contains the property price and assign it the target role.",
      score: 20,
      status: "incorrect",
      title: "Not quite",
    };
  }

  if (missedColumnIds.length === 0 && extraColumnIds.length === 0) {
    return {
      extraColumnIds,
      missedColumnIds,
      message:
        "price_million_idr is the value we want to predict. District, property type, building area, and bedrooms can help the model make that prediction.",
      nextStep: "This lesson is complete. Continue to the regression vs classification lesson.",
      score: 100,
      status: "correct",
      title: "Correct",
    };
  }

  const selectedMetadataAsFeature = assignments.listing_id === "safe-feature";
  const score = selectedMetadataAsFeature ? 50 : 70;

  return {
    extraColumnIds,
    missedColumnIds,
    message: "The target points to price, but some column roles still need adjustment.",
    nextStep: "Make sure features describe the property, while Listing ID stays as metadata.",
    score,
    status: "partial",
    title: "Partially correct",
  };
}

export function describeExpectedRole(columnId: string) {
  return roleLabels[expectedRoles[columnId] ?? "ignore"];
}
