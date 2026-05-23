export type ColumnRole = "target" | "safe-feature" | "metadata" | "ignore";

export type LearningLessonStatus = "not_started" | "in_progress" | "completed";

export type EvaluationStatus = "correct" | "partial" | "incorrect";

export type DatasetColumn = {
  id: string;
  label: string;
  role: ColumnRole;
  type: "numeric" | "categorical" | "boolean" | "text";
  unit?: string;
};

export type DatasetRow = {
  id: string;
  values: Record<string, string | number | boolean | null>;
};

export type DatasetView = {
  id: string;
  title: string;
  columnIds: string[];
  rowIds: string[];
};

export type GeneratedDataset = {
  id: string;
  version: string;
  title: string;
  description: string;
  columns: DatasetColumn[];
  rows: DatasetRow[];
  views: DatasetView[];
};

export type Lesson = {
  id: string;
  moduleId: string;
  title: string;
  estimatedMinutes: number;
  objective: string;
  summary: string[];
  datasetId: string;
  viewId: string;
  exerciseId: string;
};

export type LearningModule = {
  id: string;
  title: string;
  summary: string;
  lessonIds: string[];
  status: "available" | "locked";
};

export type LearningTrack = {
  id: string;
  title: string;
  summary: string;
  moduleIds: string[];
};

export type ExerciseAttempt = {
  exerciseId: string;
  status: EvaluationStatus;
  score: number;
  submittedAt: string;
};

export type LearningProgress = {
  version: 1;
  completedLessonIds: string[];
  attempts: Record<string, ExerciseAttempt>;
  currentLessonId?: string;
};

export type EvaluationResult = {
  status: EvaluationStatus;
  score: number;
  title: string;
  message: string;
  nextStep: string;
  missedColumnIds: string[];
  extraColumnIds: string[];
};
