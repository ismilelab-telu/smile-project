import type { ChoiceExerciseOption, LearningModule, LearningTrack, Lesson } from "../types";

const moduleIds = [
  "module-0-workflow-foundations",
  "module-1-data-understanding",
  "module-2-eda-regression",
  "module-3-data-cleaning",
  "module-4-feature-preparation-leakage",
  "module-5-split-baseline",
  "module-6-linear-regression-evaluation",
] as const;

const moduleLessonIds = {
  "module-0-workflow-foundations": [
    "lesson-0-1-feature-target",
    "lesson-0-2-regression-classification",
    "lesson-0-3-ml-workflow-order",
  ],
  "module-1-data-understanding": [
    "lesson-1-1-column-types",
    "lesson-1-2-target-context",
    "lesson-1-3-data-quality-first-look",
  ],
  "module-2-eda-regression": [
    "lesson-2-1-choose-chart",
    "lesson-2-2-read-target-distribution",
    "lesson-2-3-feature-target-relationship",
    "lesson-2-4-mark-outlier-candidate",
    "lesson-2-5-eda-conclusion",
  ],
  "module-3-data-cleaning": [
    "lesson-3-1-missing-values",
    "lesson-3-2-duplicate-rows",
    "lesson-3-3-invalid-values",
    "lesson-3-4-outlier-valid-or-error",
    "lesson-3-5-cleaning-summary",
  ],
  "module-4-feature-preparation-leakage": [
    "lesson-4-1-safe-features",
    "lesson-4-2-data-leakage",
    "lesson-4-3-weak-feature-representation",
    "lesson-4-4-safe-feature-engineering",
    "lesson-4-5-avoid-irrelevant-features",
  ],
  "module-5-split-baseline": [
    "lesson-5-1-why-train-test-split",
    "lesson-5-2-split-before-distribution-transform",
    "lesson-5-3-mean-baseline",
    "lesson-5-4-representative-split",
  ],
  "module-6-linear-regression-evaluation": [
    "lesson-6-1-fit-a-line",
    "lesson-6-2-linear-prediction",
    "lesson-6-3-residual",
    "lesson-6-4-error-metrics",
    "lesson-6-5-diagnose-underfitting",
    "lesson-6-6-retrain-with-feature-engineering",
    "lesson-6-7-model-conclusion",
  ],
} satisfies Record<(typeof moduleIds)[number], string[]>;

export const machineLearningFoundationsTrack: LearningTrack = {
  id: "track-machine-learning-foundations",
  moduleIds: [...moduleIds],
  status: "available",
  title: "Machine Learning Foundations",
};

export const regressionTrack: LearningTrack = {
  id: "track-regression",
  moduleIds: [],
  status: "coming-soon",
  title: "Regression",
};

export const classificationTrack: LearningTrack = {
  id: "track-classification",
  moduleIds: [],
  status: "coming-soon",
  title: "Classification",
};

export const learningTracks: LearningTrack[] = [
  machineLearningFoundationsTrack,
  regressionTrack,
  classificationTrack,
];

export const learningModules: LearningModule[] = [
  {
    id: "module-0-workflow-foundations",
    lessonIds: moduleLessonIds["module-0-workflow-foundations"],
    status: "available",
    summary: "Start with table structure, features, targets, and the ML workflow.",
    title: "ML Workflow Foundations",
  },
  {
    id: "module-1-data-understanding",
    lessonIds: moduleLessonIds["module-1-data-understanding"],
    status: "available",
    summary: "Recognize column types, target context, and first-look data quality issues.",
    title: "Data Understanding",
  },
  {
    id: "module-2-eda-regression",
    lessonIds: moduleLessonIds["module-2-eda-regression"],
    status: "available",
    summary:
      "Choose charts, read distributions, inspect feature-target relationships, and spot outliers.",
    title: "EDA for Regression",
  },
  {
    id: "module-3-data-cleaning",
    lessonIds: moduleLessonIds["module-3-data-cleaning"],
    status: "available",
    summary: "Make cleaning decisions for missing values, duplicates, and invalid values.",
    title: "Data Cleaning",
  },
  {
    id: "module-4-feature-preparation-leakage",
    lessonIds: moduleLessonIds["module-4-feature-preparation-leakage"],
    status: "available",
    summary: "Choose safe features, avoid leakage, and introduce feature engineering.",
    title: "Feature Preparation and Leakage",
  },
  {
    id: "module-5-split-baseline",
    lessonIds: moduleLessonIds["module-5-split-baseline"],
    status: "available",
    summary: "Understand train/test split, mean baseline, and representative splits.",
    title: "Train/Test Split and Baseline",
  },
  {
    id: "module-6-linear-regression-evaluation",
    lessonIds: moduleLessonIds["module-6-linear-regression-evaluation"],
    status: "available",
    summary: "Read predictions, residuals, metrics, underfitting signals, and model conclusions.",
    title: "Linear Regression Modeling and Evaluation",
  },
];

type MultipleChoiceLessonInput = {
  correctOptionIds: string[];
  estimatedMinutes: number;
  exerciseId: string;
  hints: string[];
  id: string;
  moduleId: LearningModule["id"];
  numberLabel: string;
  objective: string;
  options: ChoiceExerciseOption[];
  prompt: string;
  summary: string[];
  title: string;
};

function multipleChoiceLesson(input: MultipleChoiceLessonInput): Lesson {
  return {
    estimatedMinutes: input.estimatedMinutes,
    exercise: {
      correctOptionIds: input.correctOptionIds,
      hints: input.hints,
      id: input.exerciseId,
      options: input.options,
      prompt: input.prompt,
      type: "multiple-choice",
    },
    exerciseId: input.exerciseId,
    id: input.id,
    moduleId: input.moduleId,
    numberLabel: input.numberLabel,
    objective: input.objective,
    summary: input.summary,
    title: input.title,
  };
}

const lesson01: Lesson = {
  datasetId: "dataset-smile-cafe-demand-intro",
  estimatedMinutes: 5,
  exercise: {
    datasetContext:
      "You are helping Smile Cafe prepare shift data for a model that forecasts drink demand.",
    hints: [
      "The target answers the question: what number should the cafe forecast before a shift starts?",
      "A safe feature is information the cafe already knows before the shift begins.",
      "An ID helps the team find a row again, but the ID does not explain demand.",
    ],
    id: "exercise-0-1-select-feature-target",
    instruction: "Choose one target, safe features, and metadata when present.",
    prompt: "Assign a role to each column.",
    type: "table-column-role-assignment",
  },
  exerciseId: "exercise-0-1-select-feature-target",
  id: "lesson-0-1-feature-target",
  moduleId: "module-0-workflow-foundations",
  numberLabel: "Lesson 0.1",
  objective: "You can identify the target, features, and metadata in a small tabular dataset.",
  summary: [
    "A dataframe is a table for analysis. Each row is one example, and each column describes one kind of information about that example.",
    "In this lesson, each row is one Smile Cafe shift. The columns describe the shift: day part, weather, temperature, promo status, and drinks sold.",
    "For supervised learning, one column becomes the target: the value we want to predict. Other useful columns can become features, while ID columns stay as metadata because they identify rows but do not explain the prediction.",
  ],
  title: "Understanding Dataframes for ML",
  viewId: "intro-table-preview",
};

const lesson02: Lesson = multipleChoiceLesson({
  correctOptionIds: ["predict-drinks-sold", "predict-wait-minutes"],
  estimatedMinutes: 4,
  exerciseId: "exercise-0-2-classify-problem-type",
  hints: [
    "Ask what the model output looks like: number or class?",
    "Hot, iced, and blended are categories.",
    "Drink count and waiting time are numeric targets with many possible values.",
  ],
  id: "lesson-0-2-regression-classification",
  moduleId: "module-0-workflow-foundations",
  numberLabel: "Lesson 0.2",
  objective: "You can distinguish regression problems from classification problems.",
  options: [
    {
      id: "predict-drinks-sold",
      label: "Predict how many drinks Smile Cafe will sell in a shift.",
    },
    {
      id: "predict-drink-category",
      label: "Predict whether the top-selling drink will be hot, iced, or blended.",
    },
    {
      id: "predict-wait-minutes",
      label: "Predict the average customer wait time in minutes.",
    },
    {
      id: "predict-stockout-label",
      label: "Predict whether the shift will run out of oat milk.",
    },
  ],
  prompt: "Which scenarios are regression problems?",
  summary: [
    "Regression is used when the target is a number, such as drinks sold, temperature, or waiting time.",
    "Classification is used when the target is a category or label, such as drink type or stockout/not stockout.",
    "The important question is the output shape: what should the model predict?",
  ],
  title: "Regression vs Classification",
});

const lesson03: Lesson = {
  estimatedMinutes: 5,
  exercise: {
    correctStepIds: [
      "data-understanding",
      "eda",
      "cleaning",
      "feature-preparation",
      "split",
      "baseline",
      "modeling",
      "evaluation",
      "conclusion",
    ],
    hints: [
      "Understand the data before choosing a model.",
      "Split data before evaluating model performance.",
      "Build a baseline before deciding whether the model adds value.",
    ],
    id: "exercise-0-3-order-ml-workflow",
    prompt: "Order the workflow steps from first to last.",
    steps: [
      { id: "data-understanding", label: "Data understanding" },
      { id: "eda", label: "EDA" },
      { id: "cleaning", label: "Cleaning" },
      { id: "feature-preparation", label: "Feature preparation" },
      { id: "split", label: "Train/test split" },
      { id: "modeling", label: "Modeling" },
      { id: "baseline", label: "Baseline" },
      { id: "evaluation", label: "Evaluation" },
      { id: "conclusion", label: "Conclusion" },
    ],
    type: "ordered-steps",
  },
  exerciseId: "exercise-0-3-order-ml-workflow",
  id: "lesson-0-3-ml-workflow-order",
  moduleId: "module-0-workflow-foundations",
  numberLabel: "Lesson 0.3",
  objective: "You can place the core supervised regression workflow steps in order.",
  summary: [
    "Machine learning does not start with choosing a model. A model only makes sense after the data, target, quality issues, features, and evaluation approach are clear.",
    "A safe workflow reduces false conclusions: understand data, inspect patterns, clean problems, prepare features, split data, create a baseline, model, evaluate, then conclude.",
  ],
  title: "ML Workflow Order",
};

const laterLessons: Lesson[] = [
  multipleChoiceLesson({
    correctOptionIds: [
      "listing-id-text",
      "district-categorical",
      "area-numeric",
      "parking-boolean",
      "price-numeric-target",
    ],
    estimatedMinutes: 6,
    exerciseId: "exercise-1-1-classify-column-types",
    hints: [
      "Numeric columns support arithmetic such as averages and differences.",
      "Categorical columns describe groups.",
      "Boolean columns usually have only true/false or yes/no values.",
    ],
    id: "lesson-1-1-column-types",
    moduleId: "module-1-data-understanding",
    numberLabel: "Lesson 1.1",
    objective: "You can classify common column types in a small cafe shift dataset.",
    options: [
      { id: "listing-id-text", label: "shift_id is a text identifier." },
      { id: "district-categorical", label: "branch_area is categorical." },
      { id: "area-numeric", label: "temperature_c is numeric." },
      { id: "parking-boolean", label: "promo_active is boolean." },
      { id: "price-numeric-target", label: "drinks_sold is a numeric target." },
      { id: "district-numeric", label: "branch_area is numeric." },
      { id: "listing-id-target", label: "shift_id is the target." },
    ],
    prompt: "Which column type statements are correct?",
    summary: [
      "Column type affects how data can be inspected, cleaned, visualized, and modeled.",
      "Numeric columns support arithmetic and distributions. Categorical columns describe groups. Boolean columns represent two-state values.",
    ],
    title: "Column Types",
  }),
  multipleChoiceLesson({
    correctOptionIds: ["district", "property-type", "building-area", "bedrooms"],
    estimatedMinutes: 5,
    exerciseId: "exercise-1-2-prediction-time-availability",
    hints: [
      "The target answers what we want to predict.",
      "A feature must be known before prediction time.",
      "Do not feed the final demand count into a model that predicts final demand.",
    ],
    id: "lesson-1-2-target-context",
    moduleId: "module-1-data-understanding",
    numberLabel: "Lesson 1.2",
    objective: "You can decide which fields are available at prediction time.",
    options: [
      { id: "district", label: "Branch area." },
      { id: "property-type", label: "Day part." },
      { id: "building-area", label: "Weather." },
      { id: "bedrooms", label: "Promo active." },
      { id: "price", label: "Final drinks sold." },
    ],
    prompt: "Which fields are safe features for forecasting drinks sold?",
    summary: [
      "A target must be clearly defined before modeling starts.",
      "Features must be available before the prediction is made. Information only known after the target happens can create leakage.",
    ],
    title: "Target Context",
  }),
  multipleChoiceLesson({
    correctOptionIds: ["missing-value", "negative-area", "category-typo", "missing-target"],
    estimatedMinutes: 7,
    exerciseId: "exercise-1-3-mark-first-look-issues",
    hints: [
      "Look for null or empty values.",
      "Physical measurements should stay plausible.",
      "Category labels should use consistent spelling.",
    ],
    id: "lesson-1-3-data-quality-first-look",
    moduleId: "module-1-data-understanding",
    numberLabel: "Lesson 1.3",
    objective: "You can spot first-look data quality issues before deeper analysis.",
    options: [
      { id: "missing-value", label: "A feature value is missing." },
      { id: "negative-area", label: "Drinks sold is negative." },
      { id: "category-typo", label: "A branch area label uses inconsistent spelling." },
      { id: "missing-target", label: "A target value is empty." },
      { id: "valid-district", label: "A valid branch area value is present." },
    ],
    prompt: "Which items are first-look data quality issues?",
    summary: [
      "A dataset should not be trusted immediately. First-look checks catch missing values, impossible numbers, inconsistent formats, and duplicated records.",
      "The goal is not to fix everything instantly. The goal is to record what needs deeper investigation.",
    ],
    title: "Data Quality First Look",
  }),
  multipleChoiceLesson({
    correctOptionIds: ["price-histogram", "area-price-scatter", "district-bar", "type-box"],
    estimatedMinutes: 6,
    exerciseId: "exercise-2-1-choose-chart-by-question",
    hints: [
      "One numeric column often starts with a histogram.",
      "Two numeric columns fit a scatter plot.",
      "Counts by category fit a bar chart.",
    ],
    id: "lesson-2-1-choose-chart",
    moduleId: "module-2-eda-regression",
    numberLabel: "Lesson 2.1",
    objective: "You can choose charts based on the question and data type.",
    options: [
      { id: "price-histogram", label: "Use a histogram for the drinks-sold distribution." },
      { id: "area-price-scatter", label: "Use a scatter plot for temperature vs drinks sold." },
      { id: "district-bar", label: "Use a bar chart for shift count by branch area." },
      { id: "type-box", label: "Use grouped summaries to compare demand by day part." },
      { id: "id-histogram", label: "Use a histogram of shift IDs to evaluate model quality." },
    ],
    prompt: "Which chart choices match the question?",
    summary: [
      "EDA charts should be chosen from the question and column types.",
      "For regression, numeric feature to numeric target relationships are often inspected with scatter plots.",
    ],
    title: "Choosing Charts by Question",
  }),
  multipleChoiceLesson({
    correctOptionIds: ["right-skew", "wide-range"],
    estimatedMinutes: 6,
    exerciseId: "exercise-2-2-select-histogram-conclusion",
    hints: [
      "Look at whether the right side has a long tail.",
      "Extreme values are not automatically errors.",
      "A conclusion must match the visual evidence.",
    ],
    id: "lesson-2-2-read-target-distribution",
    moduleId: "module-2-eda-regression",
    numberLabel: "Lesson 2.2",
    objective: "You can read a target distribution for range, skew, and extreme values.",
    options: [
      { id: "right-skew", label: "Demand is right-skewed with a few very busy shifts." },
      { id: "wide-range", label: "The demand range is wide enough that error units matter." },
      { id: "all-same", label: "All shifts sell almost identical drink counts." },
      { id: "no-extreme", label: "There are no unusually busy shifts worth checking." },
    ],
    prompt: "Which conclusions are supported by a right-skewed drinks-sold histogram?",
    summary: [
      "A target histogram shows the values the model needs to predict.",
      "Skew and extreme values can make evaluation harder, but they do not automatically mean the data is wrong.",
    ],
    title: "Reading Target Distribution",
  }),
  multipleChoiceLesson({
    correctOptionIds: ["building-area"],
    estimatedMinutes: 7,
    exerciseId: "exercise-2-3-select-promising-feature",
    hints: [
      "A useful numeric feature often has a visible relationship with the target.",
      "Linear Regression works best when the pattern is roughly straight.",
      "IDs are usually not meaningful signals.",
    ],
    id: "lesson-2-3-feature-target-relationship",
    moduleId: "module-2-eda-regression",
    numberLabel: "Lesson 2.3",
    objective: "You can identify a promising feature-target relationship from a scatter plot.",
    options: [
      {
        id: "building-area",
        label: "temperature_c, because demand tends to rise on warmer shifts.",
      },
      { id: "listing-id", label: "shift_id, because it is unique for each row." },
      { id: "random-order", label: "Random row order, because it changes every row." },
      { id: "source-batch", label: "Source batch, because it is a data collection artifact." },
    ],
    prompt: "Which feature is most promising for a first Linear Regression model?",
    summary: [
      "Scatter plots help compare numeric features against numeric targets.",
      "A roughly linear positive or negative pattern is a useful signal for a first Linear Regression model.",
    ],
    title: "Feature-Target Relationships",
  }),
  multipleChoiceLesson({
    correctOptionIds: ["investigate-outlier", "do-not-auto-delete"],
    estimatedMinutes: 6,
    exerciseId: "exercise-2-4-mark-outlier-candidate",
    hints: [
      "Outlier candidates are unusual relative to the rest of the data.",
      "Unusual does not always mean wrong.",
      "Context decides whether a point is valid or an error.",
    ],
    id: "lesson-2-4-mark-outlier-candidate",
    moduleId: "module-2-eda-regression",
    numberLabel: "Lesson 2.4",
    objective: "You can identify outlier candidates without deleting them automatically.",
    options: [
      {
        id: "investigate-outlier",
        label: "Mark unusual temperature-demand points for investigation.",
      },
      { id: "do-not-auto-delete", label: "Keep context before deciding to remove a point." },
      { id: "delete-all-high", label: "Delete every unusually busy shift immediately." },
      {
        id: "ignore-outliers",
        label: "Ignore all outliers because models handle them automatically.",
      },
    ],
    prompt: "Which outlier-handling statements are correct?",
    summary: [
      "Outlier candidates are observations that stand apart from the main pattern.",
      "They should be investigated with context before deciding whether they are valid examples or data errors.",
    ],
    title: "Marking Outlier Candidates",
  }),
  multipleChoiceLesson({
    correctOptionIds: ["supported-pattern", "state-limits", "next-step"],
    estimatedMinutes: 5,
    exerciseId: "exercise-2-5-eda-conclusion",
    hints: [
      "EDA conclusions should cite visible evidence.",
      "Avoid claims that the chart cannot support.",
      "A useful conclusion points to a next decision.",
    ],
    id: "lesson-2-5-eda-conclusion",
    moduleId: "module-2-eda-regression",
    numberLabel: "Lesson 2.5",
    objective: "You can choose EDA conclusions that are supported by evidence.",
    options: [
      { id: "supported-pattern", label: "Temperature appears positively related to drinks sold." },
      { id: "state-limits", label: "The chart does not prove causation." },
      { id: "next-step", label: "Investigate extreme points before cleaning or modeling." },
      { id: "perfect-model", label: "The chart proves the model will be perfect." },
    ],
    prompt: "Which statements are valid EDA conclusions?",
    summary: [
      "EDA should produce decisions or next steps, not just charts.",
      "Strong EDA conclusions are tied to evidence and do not overclaim what the visual can prove.",
    ],
    title: "EDA Conclusion",
  }),
  multipleChoiceLesson({
    correctOptionIds: ["context-action", "missing-pattern", "avoid-auto-drop"],
    estimatedMinutes: 6,
    exerciseId: "exercise-3-1-missing-values",
    hints: [
      "The right action depends on how much is missing and where.",
      "Missingness can have a pattern.",
      "Dropping rows is not always the safest first move.",
    ],
    id: "lesson-3-1-missing-values",
    moduleId: "module-3-data-cleaning",
    numberLabel: "Lesson 3.1",
    objective: "You can choose a missing-value action based on context.",
    options: [
      {
        id: "context-action",
        label: "Choose the action based on column importance and amount missing.",
      },
      { id: "missing-pattern", label: "Check whether missing values follow a pattern." },
      {
        id: "avoid-auto-drop",
        label: "Avoid automatically dropping every row with a missing value.",
      },
      { id: "fill-target", label: "Always fill missing target values with zero." },
    ],
    prompt: "Which missing-value decisions are sound?",
    summary: [
      "Missing values are common, but they do not all require the same fix.",
      "The amount, column meaning, and pattern of missingness should guide the cleaning action.",
    ],
    title: "Missing Values",
  }),
  multipleChoiceLesson({
    correctOptionIds: ["find-duplicate", "avoid-bias"],
    estimatedMinutes: 5,
    exerciseId: "exercise-3-2-duplicate-rows",
    hints: [
      "Duplicates can repeat the same example.",
      "Repeated examples can bias summaries and models.",
      "Not every similar row is a duplicate.",
    ],
    id: "lesson-3-2-duplicate-rows",
    moduleId: "module-3-data-cleaning",
    numberLabel: "Lesson 3.2",
    objective: "You can identify duplicate rows and explain their impact.",
    options: [
      { id: "find-duplicate", label: "Flag rows that repeat the same shift record." },
      { id: "avoid-bias", label: "Duplicates can overweight repeated examples." },
      { id: "same-district", label: "Rows from the same branch area are always duplicates." },
      { id: "keep-all", label: "Duplicate rows never affect model evaluation." },
    ],
    prompt: "Which duplicate-row statements are correct?",
    summary: [
      "Duplicate rows can make some observations count more than they should.",
      "A duplicate decision should compare the full record and business context, not just one matching column.",
    ],
    title: "Duplicate Rows",
  }),
  multipleChoiceLesson({
    correctOptionIds: ["negative-area", "impossible-bedroom", "valid-high-price"],
    estimatedMinutes: 6,
    exerciseId: "exercise-3-3-invalid-values",
    hints: [
      "Impossible physical values should be investigated.",
      "Suspicious is not the same as invalid.",
      "A high value can be valid if context supports it.",
    ],
    id: "lesson-3-3-invalid-values",
    moduleId: "module-3-data-cleaning",
    numberLabel: "Lesson 3.3",
    objective: "You can separate valid, suspicious, and impossible values.",
    options: [
      { id: "negative-area", label: "Negative drinks sold is invalid." },
      { id: "impossible-bedroom", label: "A negative customer count is invalid." },
      {
        id: "valid-high-price",
        label: "A very high drink count can be valid if the shift context supports it.",
      },
      { id: "all-expensive-invalid", label: "Every unusually busy shift is invalid." },
    ],
    prompt: "Which invalid-value statements are correct?",
    summary: [
      "Invalid values violate the meaning of a field, such as negative physical measurements.",
      "Suspicious values need investigation, but they are not automatically wrong.",
    ],
    title: "Invalid Values",
  }),
  multipleChoiceLesson({
    correctOptionIds: ["use-context", "correct-error", "keep-valid"],
    estimatedMinutes: 6,
    exerciseId: "exercise-3-4-outlier-valid-or-error",
    hints: [
      "Ask whether the value is possible in the real world.",
      "Check supporting columns before deleting.",
      "Document the cleaning decision.",
    ],
    id: "lesson-3-4-outlier-valid-or-error",
    moduleId: "module-3-data-cleaning",
    numberLabel: "Lesson 3.4",
    objective: "You can choose whether an outlier is a valid example or a data error.",
    options: [
      { id: "use-context", label: "Use other fields and domain context before deciding." },
      { id: "correct-error", label: "Correct or remove values that are confirmed data errors." },
      { id: "keep-valid", label: "Keep unusual but valid examples." },
      { id: "delete-first", label: "Delete every outlier before checking context." },
    ],
    prompt: "Which outlier decisions are safe?",
    summary: [
      "Outliers can be valid rare cases or data errors.",
      "Cleaning should preserve valid variation while correcting confirmed problems.",
    ],
    title: "Valid Outlier or Data Error",
  }),
  multipleChoiceLesson({
    correctOptionIds: ["record-action", "record-reason", "preserve-target"],
    estimatedMinutes: 5,
    exerciseId: "exercise-3-5-cleaning-summary",
    hints: [
      "A cleaning log should be explainable later.",
      "Record what changed and why.",
      "Do not hide target problems with arbitrary fills.",
    ],
    id: "lesson-3-5-cleaning-summary",
    moduleId: "module-3-data-cleaning",
    numberLabel: "Lesson 3.5",
    objective: "You can summarize cleaning decisions with clear reasons.",
    options: [
      { id: "record-action", label: "Record the cleaning action." },
      { id: "record-reason", label: "Record the reason for the action." },
      {
        id: "preserve-target",
        label: "Treat missing target values carefully instead of filling them blindly.",
      },
      { id: "silent-changes", label: "Make silent cleaning changes so the model trains faster." },
    ],
    prompt: "Which items belong in a cleaning decision summary?",
    summary: [
      "Cleaning decisions should be traceable.",
      "A good summary states the issue, action, and reason so later evaluation can be trusted.",
    ],
    title: "Cleaning Decision Summary",
  }),
  multipleChoiceLesson({
    correctOptionIds: ["known-before", "not-target", "not-id-only"],
    estimatedMinutes: 5,
    exerciseId: "exercise-4-1-safe-features",
    hints: [
      "A safe feature is available before prediction.",
      "The target must not be used as input.",
      "Identifiers rarely explain the outcome by themselves.",
    ],
    id: "lesson-4-1-safe-features",
    moduleId: "module-4-feature-preparation-leakage",
    numberLabel: "Lesson 4.1",
    objective: "You can choose features that are safe for prediction.",
    options: [
      { id: "known-before", label: "Use fields known before prediction time." },
      { id: "not-target", label: "Exclude the target from model inputs." },
      { id: "not-id-only", label: "Avoid treating row identifiers as meaningful signals." },
      {
        id: "use-final-price",
        label: "Use final drinks sold as a feature to predict drinks sold.",
      },
    ],
    prompt: "Which feature choices are safe?",
    summary: [
      "Safe features are available before prediction and do not reveal the answer.",
      "Feature selection should avoid target leakage and meaningless identifiers.",
    ],
    title: "Safe Features",
  }),
  multipleChoiceLesson({
    correctOptionIds: ["future-info", "target-derived", "post-outcome"],
    estimatedMinutes: 6,
    exerciseId: "exercise-4-2-data-leakage",
    hints: [
      "Leakage often looks like a very useful feature.",
      "Ask whether the field exists at prediction time.",
      "Target-derived fields reveal the answer indirectly.",
    ],
    id: "lesson-4-2-data-leakage",
    moduleId: "module-4-feature-preparation-leakage",
    numberLabel: "Lesson 4.2",
    objective: "You can identify features that leak target information.",
    options: [
      { id: "future-info", label: "Information only known after the prediction point." },
      { id: "target-derived", label: "A field calculated from the target." },
      { id: "post-outcome", label: "End-of-shift revenue used to forecast drinks sold." },
      { id: "building-area", label: "Temperature known before the shift starts." },
    ],
    prompt: "Which fields are leakage risks?",
    summary: [
      "Data leakage happens when model inputs contain information that would not be available in real prediction use.",
      "Leakage can make evaluation look impressive while failing in real use.",
    ],
    title: "Data Leakage",
  }),
  multipleChoiceLesson({
    correctOptionIds: ["weak-binned-age", "missing-nonlinear", "needs-better-representation"],
    estimatedMinutes: 6,
    exerciseId: "exercise-4-3-weak-feature-representation",
    hints: [
      "A feature can be available but poorly represented.",
      "Linear models need useful numeric representations.",
      "A weak representation can hide a real pattern.",
    ],
    id: "lesson-4-3-weak-feature-representation",
    moduleId: "module-4-feature-preparation-leakage",
    numberLabel: "Lesson 4.3",
    objective: "You can identify when a feature representation is too weak.",
    options: [
      { id: "weak-binned-age", label: "A coarse bucket can hide useful variation." },
      { id: "missing-nonlinear", label: "A raw feature can miss a curved relationship." },
      {
        id: "needs-better-representation",
        label: "Better representation can help a simple model.",
      },
      { id: "always-drop", label: "Weakly represented features must always be dropped." },
    ],
    prompt: "Which statements about weak feature representation are correct?",
    summary: [
      "A feature can be safe but still not represented in a useful way.",
      "Simple models often benefit when raw fields are transformed into clearer signals.",
    ],
    title: "Weak Feature Representation",
  }),
  multipleChoiceLesson({
    correctOptionIds: ["area-per-bedroom", "is-central", "row-wise-safe"],
    estimatedMinutes: 6,
    exerciseId: "exercise-4-4-safe-feature-engineering",
    hints: [
      "Row-wise transformations use values from the same row.",
      "Do not use target values to create model inputs.",
      "Feature engineering must be followed by retraining.",
    ],
    id: "lesson-4-4-safe-feature-engineering",
    moduleId: "module-4-feature-preparation-leakage",
    numberLabel: "Lesson 4.4",
    objective: "You can identify simple safe feature engineering ideas.",
    options: [
      {
        id: "area-per-bedroom",
        label: "Create a promo-and-event flag from existing shift fields.",
      },
      { id: "is-central", label: "Create a central-branch flag from branch area." },
      { id: "row-wise-safe", label: "Use row-wise transformations that do not use the target." },
      { id: "price-ratio", label: "Create a feature directly from drinks_sold." },
    ],
    prompt: "Which feature engineering ideas are safe?",
    summary: [
      "Feature engineering can create clearer signals from existing safe fields.",
      "Row-wise transformations are safer than transformations that learn from the whole dataset or target.",
    ],
    title: "Simple Feature Engineering",
  }),
  multipleChoiceLesson({
    correctOptionIds: ["use-hypothesis", "avoid-random-id", "compare-evidence"],
    estimatedMinutes: 5,
    exerciseId: "exercise-4-5-avoid-irrelevant-features",
    hints: [
      "More features do not automatically mean better generalization.",
      "A feature should have a plausible relationship with the target.",
      "Model comparison should use held-out data.",
    ],
    id: "lesson-4-5-avoid-irrelevant-features",
    moduleId: "module-4-feature-preparation-leakage",
    numberLabel: "Lesson 4.5",
    objective: "You can avoid adding irrelevant features without evidence.",
    options: [
      { id: "use-hypothesis", label: "Add features based on a plausible hypothesis." },
      { id: "avoid-random-id", label: "Avoid random identifiers as predictive features." },
      { id: "compare-evidence", label: "Compare whether a new feature improves evaluation." },
      { id: "add-everything", label: "Add every available column because more is always better." },
    ],
    prompt: "Which feature-selection habits are sound?",
    summary: [
      "Adding features can help, but irrelevant features add noise and complexity.",
      "A new feature should be motivated and then checked against evaluation evidence.",
    ],
    title: "Avoid Irrelevant Features",
  }),
  multipleChoiceLesson({
    correctOptionIds: ["estimate-generalization", "holdout-data", "avoid-training-only"],
    estimatedMinutes: 5,
    exerciseId: "exercise-5-1-why-train-test-split",
    hints: [
      "Training performance can be too optimistic.",
      "A test set approximates unseen data.",
      "Evaluation must use data not used to fit the model.",
    ],
    id: "lesson-5-1-why-train-test-split",
    moduleId: "module-5-split-baseline",
    numberLabel: "Lesson 5.1",
    objective: "You can explain why train/test split is needed.",
    options: [
      { id: "estimate-generalization", label: "Estimate how the model behaves on unseen data." },
      { id: "holdout-data", label: "Keep a holdout set for evaluation." },
      { id: "avoid-training-only", label: "Avoid judging a model only on training data." },
      { id: "make-data-bigger", label: "Split data to create more rows than before." },
    ],
    prompt: "Why do we use a train/test split?",
    summary: [
      "A model can look good on data it already saw.",
      "Train/test split gives a more honest check of performance on unseen examples.",
    ],
    title: "Why Train/Test Split Matters",
  }),
  multipleChoiceLesson({
    correctOptionIds: ["split-first", "fit-on-train", "apply-to-test"],
    estimatedMinutes: 6,
    exerciseId: "exercise-5-2-split-before-distribution-transform",
    hints: [
      "Any transformation that learns dataset statistics should learn from train only.",
      "Test data should simulate future unseen data.",
      "Apply learned settings to test, do not refit on test.",
    ],
    id: "lesson-5-2-split-before-distribution-transform",
    moduleId: "module-5-split-baseline",
    numberLabel: "Lesson 5.2",
    objective: "You can place train/test split before distribution-based transforms.",
    options: [
      {
        id: "split-first",
        label: "Split data before fitting transformations that learn statistics.",
      },
      { id: "fit-on-train", label: "Fit distribution-based transformations on training data." },
      { id: "apply-to-test", label: "Apply the learned transformation to test data." },
      { id: "fit-on-all", label: "Fit preprocessing on all data before split." },
    ],
    prompt: "Which preprocessing order avoids leakage?",
    summary: [
      "Some transformations learn from data distribution.",
      "To avoid leakage, those transformations should be fitted on train data and then applied to test data.",
    ],
    title: "Split Before Distribution-Based Transformations",
  }),
  multipleChoiceLesson({
    correctOptionIds: ["mean-baseline", "compare-model", "simple-reference"],
    estimatedMinutes: 5,
    exerciseId: "exercise-5-3-mean-baseline",
    hints: [
      "A baseline is a simple reference point.",
      "For regression, a mean target baseline is common.",
      "A model should beat the baseline to be useful.",
    ],
    id: "lesson-5-3-mean-baseline",
    moduleId: "module-5-split-baseline",
    numberLabel: "Lesson 5.3",
    objective: "You can explain and use a simple mean baseline for regression.",
    options: [
      { id: "mean-baseline", label: "Predict the training target mean as a baseline." },
      { id: "compare-model", label: "Compare the model against the baseline." },
      {
        id: "simple-reference",
        label: "Use the baseline as a simple reference, not the final goal.",
      },
      { id: "baseline-test-mean", label: "Use the test target mean as the prediction rule." },
    ],
    prompt: "Which baseline statements are correct?",
    summary: [
      "A baseline is a simple prediction rule used as a reference.",
      "For regression, predicting the training target mean helps judge whether a model adds value.",
    ],
    title: "Mean Baseline",
  }),
  multipleChoiceLesson({
    correctOptionIds: ["similar-distribution", "avoid-sorted-split", "check-target-range"],
    estimatedMinutes: 6,
    exerciseId: "exercise-5-4-representative-split",
    hints: [
      "A split should represent the full problem.",
      "Sorted data can create biased splits.",
      "Check whether train and test target ranges are comparable.",
    ],
    id: "lesson-5-4-representative-split",
    moduleId: "module-5-split-baseline",
    numberLabel: "Lesson 5.4",
    objective: "You can identify whether a split is representative enough for evaluation.",
    options: [
      {
        id: "similar-distribution",
        label: "Train and test should have broadly similar target coverage.",
      },
      { id: "avoid-sorted-split", label: "Avoid splitting after sorting by target." },
      { id: "check-target-range", label: "Check whether both sets cover realistic demand ranges." },
      {
        id: "test-only-cheap",
        label: "Put only quiet shifts in test to make evaluation easier.",
      },
    ],
    prompt: "Which split practices support reliable evaluation?",
    summary: [
      "A test set should represent the kind of data the model will face.",
      "A split that separates data by sorted demand or unusual groups can distort evaluation.",
    ],
    title: "Representative Split",
  }),
  multipleChoiceLesson({
    correctOptionIds: ["line-pattern", "minimize-error", "simple-start"],
    estimatedMinutes: 6,
    exerciseId: "exercise-6-1-fit-a-line",
    hints: [
      "Linear Regression fits a straight-line relationship.",
      "The fitted line is chosen to reduce prediction errors.",
      "It is a useful first model when the visual pattern is roughly linear.",
    ],
    id: "lesson-6-1-fit-a-line",
    moduleId: "module-6-linear-regression-evaluation",
    numberLabel: "Lesson 6.1",
    objective: "You can explain what Linear Regression fits.",
    options: [
      { id: "line-pattern", label: "It fits a straight-line pattern between feature and target." },
      { id: "minimize-error", label: "It chooses a line that reduces prediction errors." },
      { id: "simple-start", label: "It is a simple first model for roughly linear patterns." },
      { id: "perfect-nonlinear", label: "It perfectly captures every non-linear pattern." },
    ],
    prompt: "Which statements describe Linear Regression?",
    summary: [
      "Linear Regression fits a straight-line relationship between input features and a numeric target.",
      "It is a simple first model that is easiest to reason about when the data pattern is roughly linear.",
    ],
    title: "Fit a Line",
  }),
  multipleChoiceLesson({
    correctOptionIds: ["plug-feature", "read-output", "same-unit"],
    estimatedMinutes: 5,
    exerciseId: "exercise-6-2-linear-prediction",
    hints: [
      "A prediction is the model output for one input row.",
      "Regression prediction is numeric.",
      "Read the output in the same unit as the target.",
    ],
    id: "lesson-6-2-linear-prediction",
    moduleId: "module-6-linear-regression-evaluation",
    numberLabel: "Lesson 6.2",
    objective: "You can interpret a numeric prediction from a regression model.",
    options: [
      { id: "plug-feature", label: "Use feature values as inputs to produce a prediction." },
      { id: "read-output", label: "Read the output as the predicted drinks sold." },
      { id: "same-unit", label: "Interpret the prediction in the target unit." },
      { id: "class-label", label: "Interpret the prediction as a drink type class." },
    ],
    prompt: "Which prediction statements are correct?",
    summary: [
      "A regression model prediction is a numeric output for a row.",
      "The prediction should be interpreted in the same unit as the target, such as cups sold.",
    ],
    title: "Prediction",
  }),
  multipleChoiceLesson({
    correctOptionIds: ["actual-minus-predicted", "direction-matters", "large-residual"],
    estimatedMinutes: 5,
    exerciseId: "exercise-6-3-residual",
    hints: [
      "Residual compares actual value with predicted value.",
      "Sign tells the direction of the error.",
      "Large residuals show examples the model handles poorly.",
    ],
    id: "lesson-6-3-residual",
    moduleId: "module-6-linear-regression-evaluation",
    numberLabel: "Lesson 6.3",
    objective: "You can read a residual as prediction error for one example.",
    options: [
      { id: "actual-minus-predicted", label: "Residual is actual value minus predicted value." },
      { id: "direction-matters", label: "Residual sign shows overprediction or underprediction." },
      { id: "large-residual", label: "Large residual magnitude marks a difficult example." },
      { id: "always-positive", label: "Residuals are always positive." },
    ],
    prompt: "Which residual statements are correct?",
    summary: [
      "A residual is the difference between actual target and prediction for one row.",
      "Residuals help identify where the model is overpredicting, underpredicting, or making large errors.",
    ],
    title: "Residual",
  }),
  multipleChoiceLesson({
    correctOptionIds: ["mae-unit", "rmse-penalty", "compare-baseline"],
    estimatedMinutes: 6,
    exerciseId: "exercise-6-4-error-metrics",
    hints: [
      "MAE is easy to read in target units.",
      "RMSE penalizes larger errors more strongly.",
      "Metrics need comparison context.",
    ],
    id: "lesson-6-4-error-metrics",
    moduleId: "module-6-linear-regression-evaluation",
    numberLabel: "Lesson 6.4",
    objective: "You can interpret basic regression error metrics.",
    options: [
      { id: "mae-unit", label: "MAE is read in the same unit as the target." },
      { id: "rmse-penalty", label: "RMSE reacts more strongly to large errors." },
      { id: "compare-baseline", label: "Metrics should be compared with a baseline." },
      { id: "accuracy", label: "Classification accuracy is the main regression metric." },
    ],
    prompt: "Which metric statements are correct?",
    summary: [
      "Regression metrics summarize prediction error across examples.",
      "MAE is easy to interpret in target units, while RMSE gives extra weight to larger errors.",
    ],
    title: "Error Metrics",
  }),
  multipleChoiceLesson({
    correctOptionIds: ["patterned-residuals", "weak-representation", "model-too-simple"],
    estimatedMinutes: 6,
    exerciseId: "exercise-6-5-diagnose-underfitting",
    hints: [
      "Underfitting means the model is too simple for important patterns.",
      "Residual patterns can reveal missed structure.",
      "Better features can sometimes help before changing algorithms.",
    ],
    id: "lesson-6-5-diagnose-underfitting",
    moduleId: "module-6-linear-regression-evaluation",
    numberLabel: "Lesson 6.5",
    objective: "You can diagnose underfitting from model evidence.",
    options: [
      { id: "patterned-residuals", label: "Residuals show a systematic pattern." },
      {
        id: "weak-representation",
        label: "The current feature representation misses useful structure.",
      },
      { id: "model-too-simple", label: "The model may be too simple for the relationship." },
      { id: "perfect-fit", label: "The model has zero error on all examples." },
    ],
    prompt: "Which signals can indicate underfitting?",
    summary: [
      "Underfitting happens when the model is too simple or features are too weak to capture important patterns.",
      "Residual patterns and weak improvement over baseline can reveal the issue.",
    ],
    title: "Diagnose Underfitting",
  }),
  multipleChoiceLesson({
    correctOptionIds: ["add-safe-feature", "retrain-model", "reevaluate-model"],
    estimatedMinutes: 7,
    exerciseId: "exercise-6-6-retrain-with-feature-engineering",
    hints: [
      "Adding a feature does not update the model by itself.",
      "Retraining is required after changing inputs.",
      "Compare the new result against baseline and previous model.",
    ],
    id: "lesson-6-6-retrain-with-feature-engineering",
    moduleId: "module-6-linear-regression-evaluation",
    numberLabel: "Lesson 6.6",
    objective: "You can connect feature engineering with retraining and reevaluation.",
    options: [
      { id: "add-safe-feature", label: "Add a safe engineered feature based on evidence." },
      { id: "retrain-model", label: "Retrain the model with the new feature set." },
      { id: "reevaluate-model", label: "Evaluate again on the held-out test set." },
      {
        id: "no-retrain",
        label: "Keep the old model and expect it to use the new feature automatically.",
      },
    ],
    prompt: "What must happen after adding a useful engineered feature?",
    summary: [
      "Feature engineering changes the model inputs.",
      "After changing inputs, the model must be trained again and evaluated again to know whether the change helped.",
    ],
    title: "Retrain with Feature Engineering",
  }),
  multipleChoiceLesson({
    correctOptionIds: ["compare-baseline-models", "state-evidence", "state-limitations"],
    estimatedMinutes: 6,
    exerciseId: "exercise-6-7-model-conclusion",
    hints: [
      "A conclusion should compare against the baseline.",
      "Mention evidence, not just preference.",
      "State limitations so the result is not oversold.",
    ],
    id: "lesson-6-7-model-conclusion",
    moduleId: "module-6-linear-regression-evaluation",
    numberLabel: "Lesson 6.7",
    objective: "You can choose a model conclusion supported by evaluation evidence.",
    options: [
      {
        id: "compare-baseline-models",
        label: "Compare baseline, first model, and improved model.",
      },
      { id: "state-evidence", label: "Use metric and residual evidence in the conclusion." },
      { id: "state-limitations", label: "State where the model is still limited." },
      {
        id: "claim-perfect",
        label: "Claim the model is production-ready because it beat baseline once.",
      },
    ],
    prompt: "Which statements belong in a responsible model conclusion?",
    summary: [
      "A model conclusion should be tied to evidence from metrics and residuals.",
      "It should compare against baseline, mention improvements, and state remaining limitations.",
    ],
    title: "Model Conclusion",
  }),
];

export const lessons: Lesson[] = [lesson01, lesson02, lesson03, ...laterLessons];

export const activeLesson = lessons[0];

export function getLesson(lessonId: string) {
  return lessons.find((lesson) => lesson.id === lessonId);
}

export function getModule(moduleId: string) {
  return learningModules.find((module) => module.id === moduleId);
}

export function getTrack(trackId: string) {
  return learningTracks.find((track) => track.id === trackId);
}
