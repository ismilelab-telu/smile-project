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
    "Jalur guided untuk memahami workflow supervised regression dari data sampai evaluasi model.",
  title: "Regression Foundations",
};

export const learningModules: LearningModule[] = [
  {
    id: "module-0-workflow-foundations",
    lessonIds: ["lesson-0-1-feature-target"],
    status: "available",
    summary: "Mulai dari struktur tabel, feature, target, dan alur kerja ML.",
    title: "ML Workflow Foundations",
  },
  {
    id: "module-1-data-understanding",
    lessonIds: [],
    status: "locked",
    summary: "Mengenali tipe kolom, konteks target, dan first look data quality.",
    title: "Data Understanding",
  },
  {
    id: "module-2-eda-regression",
    lessonIds: [],
    status: "locked",
    summary: "Memilih chart, membaca distribusi, hubungan feature-target, dan outlier.",
    title: "EDA for Regression",
  },
  {
    id: "module-3-data-cleaning",
    lessonIds: [],
    status: "locked",
    summary: "Mengambil keputusan cleaning untuk missing value, duplikat, dan invalid value.",
    title: "Data Cleaning",
  },
  {
    id: "module-4-feature-preparation-leakage",
    lessonIds: [],
    status: "locked",
    summary: "Memilih feature aman, menghindari leakage, dan mengenal feature engineering.",
    title: "Feature Preparation and Leakage",
  },
  {
    id: "module-5-split-baseline",
    lessonIds: [],
    status: "locked",
    summary: "Memahami train/test split, baseline mean, dan split yang representatif.",
    title: "Train/Test Split and Baseline",
  },
  {
    id: "module-6-linear-regression-evaluation",
    lessonIds: [],
    status: "locked",
    summary: "Membaca prediksi, residual, metric, underfitting, dan kesimpulan model.",
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
    objective: "User bisa menunjuk target, feature, dan metadata dari dataset tabular kecil.",
    summary: [
      "Dataset tabular tersusun dari row dan column. Satu row mewakili satu contoh data, sedangkan satu column mewakili jenis informasi yang dicatat untuk setiap contoh.",
      "Dalam supervised learning, target adalah nilai yang ingin diprediksi. Feature adalah informasi yang dipakai model untuk membuat prediksi.",
      "Kolom metadata seperti ID berguna untuk membaca data, tetapi biasanya bukan sinyal yang aman untuk model umum.",
    ],
    title: "Mengenal Row, Column, Feature, dan Target",
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
