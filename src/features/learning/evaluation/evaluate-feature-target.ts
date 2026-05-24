import type { ColumnRole, EvaluationResult } from "../types";

const expectedRoles: Record<string, ColumnRole> = {
  bedrooms: "safe-feature",
  building_area_m2: "safe-feature",
  district: "safe-feature",
  listing_id: "metadata",
  price_million_idr: "target",
  property_type: "safe-feature",
};

const columnLabels: Record<string, string> = {
  bedrooms: "Bedrooms",
  building_area_m2: "Building Area",
  district: "District",
  listing_id: "Listing ID",
  price_million_idr: "Price",
  property_type: "Property Type",
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
    return labels[0] ?? "That column";
  }

  return `${labels.slice(0, -1).join(", ")} and ${labels.at(-1)}`;
}

export function evaluateFeatureTargetRoles(
  assignments: Record<string, ColumnRole>,
): EvaluationResult {
  const missedColumnIds: string[] = [];
  const extraColumnIds: string[] = [];
  const targetRole = assignments.price_million_idr;
  const targetColumnIds = getAssignedColumnIds(assignments, "target");

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
                "The prediction output is being treated like an input feature. A target is the value the model is trying to estimate.",
              nextStep:
                "First choose exactly one output column as Target, then check which columns can safely be used as inputs.",
            }
          : targetRole === "metadata"
            ? {
                message:
                  "The prediction output is being treated like metadata. Metadata helps read the dataset, but it is not the model output.",
                nextStep:
                  "Move the output value into the Target role before deciding which fields are metadata or features.",
              }
            : {
                message:
                  "No target is selected yet. A supervised regression setup needs one value that the model will predict.",
                nextStep:
                  "Use the hints to identify the output column, then mark exactly one column as Target.",
              };

      return {
        extraColumnIds,
        missedColumnIds,
        score: 20,
        status: "incorrect",
        title: "Not quite",
        ...targetFeedback,
      };
    }

    if (targetColumnIds.includes("listing_id")) {
      return {
        extraColumnIds,
        missedColumnIds,
        message:
          "A row identifier is marked as the target. Identifiers name records; they are not the outcome this regression task should predict.",
        nextStep:
          "Look for the column that represents the predicted outcome, and keep identifiers out of the target role.",
        score: 20,
        status: "incorrect",
        title: "Not quite",
      };
    }

    return {
      extraColumnIds,
      missedColumnIds,
      message: `${formatColumnList(targetColumnIds)} is marked as the target, but it describes the property rather than the value to predict.`,
      nextStep:
        "Keep descriptive property attributes as candidate features and choose the outcome value as the target.",
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

  if (targetColumnIds.length > 1) {
    return {
      extraColumnIds,
      missedColumnIds,
      message: "The main target is selected, but more than one column is marked as Target.",
      nextStep:
        "Keep only one target column. Descriptive property columns should be features, while identifiers should stay metadata.",
      score: 55,
      status: "partial",
      title: "Partially correct",
    };
  }

  if (assignments.listing_id === "safe-feature") {
    return {
      extraColumnIds,
      missedColumnIds,
      message: "The target is selected, but a row identifier is being used as a feature.",
      nextStep:
        "Identifiers help reference rows. Use property attributes as features and keep identifier fields as metadata.",
      score: 50,
      status: "partial",
      title: "Partially correct",
    };
  }

  if (assignments.listing_id !== "metadata") {
    return {
      extraColumnIds,
      missedColumnIds,
      message: "The target is selected, but the row identifier still needs a metadata role.",
      nextStep:
        "Metadata describes how to read or reference rows; it should not be used as model input.",
      score: 65,
      status: "partial",
      title: "Partially correct",
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
        ? "one property attribute is"
        : "some property attributes are";

    return {
      extraColumnIds,
      missedColumnIds,
      message: `The target and metadata are set, but ${countLabel} not yet marked as safe features.`,
      nextStep:
        "A safe feature is information known before prediction that can help explain the target.",
      score: 70,
      status: "partial",
      title: "Partially correct",
    };
  }

  return {
    extraColumnIds,
    missedColumnIds,
    message: "The target is selected, but some column roles still need adjustment.",
    nextStep: "Use the hints to separate prediction output, usable inputs, and dataset metadata.",
    score: 70,
    status: "partial",
    title: "Partially correct",
  };
}
