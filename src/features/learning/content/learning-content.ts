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
  summary: "Understand supervised regression workflow from data to model evaluation.",
  title: "Regression Foundations",
};

export const learningModules: LearningModule[] = [
  {
    id: "module-0-workflow-foundations",
    lessonIds: [
      "lesson-0-1-feature-target",
      "lesson-0-2-regression-classification",
      "lesson-0-3-ml-workflow-order",
    ],
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
    exercise: {
      datasetContext:
        "You are preparing listing data for a model that predicts residential property prices.",
      hints: [
        "The target usually answers the question: what value do we want to predict?",
        "A feature is information that is already known before the prediction is made.",
        "An ID column helps identify rows, but the ID is not why a property is expensive or cheap.",
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
      "A tabular dataset is made of rows and columns. One row represents one data example, while one column represents a type of information recorded for every example.",
      "In supervised learning, the target is the value you want to predict. Features are the information the model uses to make that prediction.",
      "Metadata columns such as IDs are useful for reading the data, but they are usually not safe signals for a general model.",
    ],
    title: "Rows, Columns, Features, and Targets",
    viewId: "intro-table-preview",
  },
  {
    estimatedMinutes: 4,
    exercise: {
      correctOptionIds: ["predict-house-price", "predict-days-on-market"],
      hints: [
        "Ask what the model output looks like: number or class?",
        "House, apartment, and townhouse are categories.",
        "A property price is a numeric target with many possible values.",
      ],
      id: "exercise-0-2-classify-problem-type",
      options: [
        {
          id: "predict-house-price",
          label: "Predict residential property price in million IDR.",
        },
        {
          id: "predict-property-type",
          label: "Predict whether a listing is a house, apartment, or townhouse.",
        },
        {
          id: "predict-days-on-market",
          label: "Predict how many days it will take for a property to sell.",
        },
        {
          id: "predict-renovated-label",
          label: "Predict whether a property has been renovated.",
        },
      ],
      prompt: "Which scenarios are regression problems?",
      type: "multiple-choice",
    },
    exerciseId: "exercise-0-2-classify-problem-type",
    id: "lesson-0-2-regression-classification",
    moduleId: "module-0-workflow-foundations",
    numberLabel: "Lesson 0.2",
    objective: "You can distinguish regression problems from classification problems.",
    summary: [
      "Regression is used when the target is a continuous number, such as price, temperature, or duration.",
      "Classification is used when the target is a category or label, such as property type or renovated/not renovated.",
      "The important question is the output shape: what should the model predict?",
    ],
    title: "Regression vs Classification",
  },
  {
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
  },
];

export const activeLesson = lessons[0];

export function getLesson(lessonId: string) {
  return lessons.find((lesson) => lesson.id === lessonId);
}

export function getModule(moduleId: string) {
  return learningModules.find((module) => module.id === moduleId);
}
