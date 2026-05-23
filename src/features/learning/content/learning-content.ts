import type { LearningModule, LearningTrack, Lesson } from "../types";

export const regressionFoundationsTrack: LearningTrack = {
  id: "track-regression-foundations",
  moduleIds: [
    "module-0-workflow-foundations",
    "module-1-data-understanding",
    "module-2-eda-regression",
    "module-3-data-cleaning",
    "module-4-feature-preparation-leakage",
    "module-5-split-baseline",
    "module-6-linear-regression-evaluation",
  ],
  summary:
    "A guided path for understanding supervised regression workflow from data to model evaluation.",
  title: "Regression Foundations",
};

export const learningModules: LearningModule[] = [
  {
    id: "module-0-workflow-foundations",
    lessonIds: ["lesson-0-1-feature-target"],
    status: "available",
    summary: "Start with table structure, features, targets, and the ML workflow.",
    title: "ML Workflow Foundations",
  },
  {
    id: "module-1-data-understanding",
    lessonIds: [],
    status: "locked",
    summary: "Recognize column types, target context, and first-look data quality issues.",
    title: "Data Understanding",
  },
  {
    id: "module-2-eda-regression",
    lessonIds: [],
    status: "locked",
    summary:
      "Choose charts, read distributions, inspect feature-target relationships, and spot outliers.",
    title: "EDA for Regression",
  },
  {
    id: "module-3-data-cleaning",
    lessonIds: [],
    status: "locked",
    summary: "Make cleaning decisions for missing values, duplicates, and invalid values.",
    title: "Data Cleaning",
  },
  {
    id: "module-4-feature-preparation-leakage",
    lessonIds: [],
    status: "locked",
    summary: "Choose safe features, avoid leakage, and introduce feature engineering.",
    title: "Feature Preparation and Leakage",
  },
  {
    id: "module-5-split-baseline",
    lessonIds: [],
    status: "locked",
    summary: "Understand train/test split, mean baseline, and representative splits.",
    title: "Train/Test Split and Baseline",
  },
  {
    id: "module-6-linear-regression-evaluation",
    lessonIds: [],
    status: "locked",
    summary: "Read predictions, residuals, metrics, underfitting signals, and model conclusions.",
    title: "Linear Regression Modeling and Evaluation",
  },
];

export const lessons: Lesson[] = [
  {
    datasetId: "dataset-house-prices-intro",
    estimatedMinutes: 5,
    exerciseId: "exercise-0-1-select-feature-target",
    id: "lesson-0-1-feature-target",
    moduleId: "module-0-workflow-foundations",
    objective: "You can identify the target, features, and metadata in a small tabular dataset.",
    summary: [
      "A tabular dataset is made of rows and columns. One row represents one data example, while one column represents a type of information recorded for every example.",
      "In supervised learning, the target is the value you want to predict. Features are the information the model uses to make that prediction.",
      "Metadata columns such as IDs are useful for reading the data, but they are usually not safe signals for a general model.",
    ],
    title: "Rows, Columns, Features, and Targets",
    viewId: "intro-table-preview",
  },
];

export const activeLesson = lessons[0];

export function getLesson(lessonId: string) {
  return lessons.find((lesson) => lesson.id === lessonId);
}

export function getModule(moduleId: string) {
  return learningModules.find((module) => module.id === moduleId);
}
