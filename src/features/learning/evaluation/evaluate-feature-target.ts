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
  day_part: "Day Part",
  drinks_sold: "Drinks Sold",
  end_shift_revenue: "End Shift Revenue",
  promo_active: "Promo Active",
  shift_id: "Shift ID",
  temperature_c: "Temperature",
  weather: "Weather",
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

function getExpectedRoleColumnIds(role: ColumnRole) {
  return Object.entries(expectedRoles).flatMap(([columnId, expectedRole]) =>
    expectedRole === role ? [columnId] : [],
  );
}

function getColumnListVerb(columnIds: string[]) {
  return columnIds.length === 1 ? "is" : "are";
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
                "The demand outcome is being treated like an input feature. A target is the value the model is trying to forecast.",
              nextStep:
                "First choose exactly one output column as Target, then check which shift details can safely be used as inputs.",
            }
          : targetRole === "metadata"
            ? {
                message:
                  "The demand outcome is being treated like metadata. Metadata helps read the shift sheet, but it is not the model output.",
                nextStep:
                  "Move the demand outcome into the Target role before deciding which fields are metadata or features.",
              }
            : {
                message:
                  featureColumnIdsMarkedMetadata.length > 0
                    ? `${formatColumnList(featureColumnIdsMarkedMetadata)} ${getColumnListVerb(featureColumnIdsMarkedMetadata)} marked as metadata, but metadata is for fields that identify or organize rows.`
                    : assignments.shift_id === "metadata" && featureColumnIdsMarkedSafe.length > 0
                      ? "The shift identifier and some input columns are separated, but no target is selected yet."
                      : assignments.shift_id === "metadata"
                        ? "The shift identifier is separated as metadata, but no target is selected yet."
                        : featureColumnIdsMarkedSafe.length > 0
                          ? `${formatColumnList(featureColumnIdsMarkedSafe)} ${getColumnListVerb(featureColumnIdsMarkedSafe)} selected as input features, but supervised regression still needs one target.`
                          : "No target is selected yet. A supervised regression setup needs one value that the model will predict.",
                nextStep:
                  featureColumnIdsMarkedMetadata.length > 0
                    ? "First choose the prediction output as Target, then keep metadata for row-reference fields only."
                    : "Use the hints to identify the output column, then mark exactly one column as Target.",
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

    if (targetColumnIds.includes("shift_id")) {
      return {
        extraColumnIds,
        missedColumnIds,
        message:
          "A shift identifier is marked as the target. Identifiers name records; they are not the demand this forecast should predict.",
        nextStep:
          "Look for the column that represents the predicted outcome, and keep identifiers out of the target role.",
        score: 20,
        status: "incorrect",
        title: "Not quite",
      };
    }

    if (targetColumnIds.includes("end_shift_revenue")) {
      return {
        extraColumnIds,
        missedColumnIds,
        message:
          "End-shift revenue is known after the shift is finished. It is not the demand outcome this forecast should predict before the shift starts.",
        nextStep:
          "Choose the demand count as the Target and keep after-shift information out of the model inputs.",
        score: 20,
        status: "incorrect",
        title: "Not quite",
      };
    }

    return {
      extraColumnIds,
      missedColumnIds,
      message:
        targetRole === "safe-feature"
          ? `${formatColumnList(targetColumnIds)} ${getColumnListVerb(targetColumnIds)} marked as the target while the demand outcome is still treated like an input feature.`
          : targetRole === "metadata"
            ? `${formatColumnList(targetColumnIds)} ${getColumnListVerb(targetColumnIds)} marked as the target while the demand outcome is still treated like metadata.`
            : `${formatColumnList(targetColumnIds)} ${getColumnListVerb(targetColumnIds)} marked as the target, but it describes the shift context rather than the demand to forecast.`,
      nextStep:
        "Keep shift context as candidate features and choose the demand outcome as the target.",
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
        "drinks_sold is the demand value we want to forecast. Day part, weather, temperature, and promos can help the model make that forecast.",
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
        "Keep only one target column. Shift context should be features, while identifiers should stay metadata.",
      score: 55,
      status: "partial",
      title: "Partially correct",
    };
  }

  if (assignments.shift_id === "safe-feature") {
    return {
      extraColumnIds,
      missedColumnIds,
      message: "The target is selected, but a shift identifier is being used as a feature.",
      nextStep:
        "Identifiers help reference rows. Use shift context as features and keep identifier fields as metadata.",
      score: 50,
      status: "partial",
      title: "Partially correct",
    };
  }

  if (assignments.shift_id !== "metadata") {
    return {
      extraColumnIds,
      missedColumnIds,
      message: "The target is selected, but the shift identifier still needs a metadata role.",
      nextStep:
        "Metadata describes how to read or reference rows; it should not be used as model input.",
      score: 65,
      status: "partial",
      title: "Partially correct",
    };
  }

  if (assignments.end_shift_revenue === "safe-feature") {
    return {
      extraColumnIds,
      missedColumnIds,
      message:
        "The target and metadata are set, but end-shift revenue is after-shift information. Using it as a feature would leak the answer.",
      nextStep:
        "Mark after-shift information as not used yet, then keep only pre-shift details as features.",
      score: 55,
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
      missingFeatureColumnIds.length === 1 ? "one shift detail is" : "some shift details are";

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
